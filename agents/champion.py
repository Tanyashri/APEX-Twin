"""CHAMPION: picks the *right fix method* per finding type and ships it only through the Challenger.

Playbook
  test_failure / api_error / invariant / fuzz -> code_patch   (LLM search/replace edit in an isolated git worktree)
  model_drift                                 -> retrain_model (calls the repo's own /api/models/retrain; its
                                                 built-in safety gate still decides promotion)
Nothing is ever pushed to main. Approved patches live on branch `agent/fix-<id>` for a human to merge.
"""
from __future__ import annotations

import re
from pathlib import Path

from .challenger import Challenger
from .config import Config
from .llm import LLM, extract_json
from .store import Store
from . import tools

SYSTEM = (
    "You are a careful senior Python/FastAPI engineer fixing ONE bug in a manufacturing digital twin. "
    "Fix the ROOT CAUSE in application code under backend/app/. Never edit tests, never skip/xfail tests, "
    "never swallow exceptions. Keep the change minimal. Reply ONLY with JSON:\n"
    '{"analysis":"one or two sentences","edits":[{"file":"backend/app/...py","search":"EXACT existing text, unique in file","replace":"new text"}]}'
)


class Champion:
    actor = "champion"

    def __init__(self, cfg: Config, llm: LLM, store: Store, challenger: Challenger):
        self.cfg, self.llm, self.store, self.challenger = cfg, llm, store, challenger

    # ------------------------------------------------------------ dispatch
    def handle(self, finding) -> str:
        method = {"model_drift": self._retrain}.get(finding["kind"], self._code_patch)
        self.store.log(self.actor, "picked_up", finding_id=finding["id"], method=method.__name__)
        try:
            return method(finding)
        except Exception as e:
            self.store.log(self.actor, "fix_crashed", finding_id=finding["id"], error=repr(e))
            self.store.set_finding(finding["id"], status="escalated")
            return "escalated"

    # ------------------------------------------------------- method: retrain
    def _retrain(self, finding) -> str:
        base = f"http://127.0.0.1:{self.cfg.api_port}"
        code, body = tools.http(base + "/api/models/retrain", "POST", {"trigger_type": "AGENT_DRIFT"})
        self.store.add_fix(finding["id"], 1, "retrain_model", status="applied", verdict=str(body)[:300])
        self.store.set_finding(finding["id"], status="fixed_pending_merge" if code == 200 else "escalated")
        return "retrain_triggered" if code == 200 else "escalated"

    # ----------------------------------------------------- method: code patch
    def _code_patch(self, finding) -> str:
        fid = finding["id"]
        baseline = {f["test_id"] for f in tools.run_pytest(self.cfg.backend_dir, timeout=self.cfg.test_timeout_s)["failed"]}
        objections: list[str] = []
        for attempt in range(1, self.cfg.max_fix_attempts + 1):
            self.store.set_finding(fid, attempts=attempt)
            branch = f"agent/fix-{fid}"
            with tools.worktree(self.cfg.repo_root, branch) as wt:
                edits, analysis = self._propose(finding, wt, objections)
                self.store.log(self.actor, "proposal", finding_id=fid, attempt=attempt, analysis=analysis, n_edits=len(edits))
                if not edits:
                    objections.append("Your last reply contained no valid edits. Reply with the JSON schema exactly.")
                    self.store.add_fix(fid, attempt, "code_patch", branch, "", "invalid", "no edits")
                    continue
                errs = tools.apply_edits(wt, edits, self.cfg.fixable_prefixes, self.cfg.protected_prefixes)
                if errs:
                    objections += errs
                    self.store.add_fix(fid, attempt, "code_patch", branch, "", "invalid", "; ".join(errs))
                    continue
                diff, files = tools.diff_text(wt), tools.changed_files(wt)
                fix_id = self.store.add_fix(fid, attempt, "code_patch", branch, diff)
                verdict = self.challenger.review_fix(finding, diff, files, wt, baseline)   # <- Challenger can oppose
                if verdict["approved"]:
                    sha = tools.commit_all(wt, f"agent fix for finding #{fid}: {finding['title'][:60]}")
                    self.store.set_fix(fix_id, status="approved", verdict="approved")
                    self.store.set_finding(fid, status="fixed_pending_merge")
                    self.store.log(self.actor, "fix_ready", finding_id=fid, branch=branch, commit=sha)
                    return "fixed"
                self.store.set_fix(fix_id, status="rejected", verdict="; ".join(verdict["reasons"])[:1000])
                objections += verdict["reasons"]
                self.store.log(self.actor, "objection_received", finding_id=fid, attempt=attempt, reasons=verdict["reasons"])
        self.store.set_finding(fid, status="escalated")
        self.store.log(self.actor, "escalated_to_human", finding_id=fid, objections=objections[-5:])
        return "escalated"

    # ------------------------------------------------------------- prompting
    def _propose(self, finding, wt: Path, objections: list[str]) -> tuple[list[dict], str]:
        ctx = self._source_context(finding, wt)
        user = (f"FINDING ({finding['kind']}, {finding['severity']}): {finding['title']}\n\nDETAIL:\n{finding['detail'][:3500]}\n\n"
                f"RELEVANT SOURCE:\n{ctx}\n")
        if objections:
            user += "\nYour previous attempts were REJECTED for these reasons - address all of them:\n- " + "\n- ".join(objections[-6:])
        raw = self.llm.chat(SYSTEM, user)
        j = extract_json(raw)
        if isinstance(j, dict) and isinstance(j.get("edits"), list):
            return [e for e in j["edits"] if isinstance(e, dict)], str(j.get("analysis", ""))[:300]
        return [], ""

    def _source_context(self, finding, wt: Path, budget: int = 9000) -> str:
        """Files named in the traceback (app code only), plus any file named in the finding."""
        paths: list[str] = []
        for m in re.finditer(r"(backend/)?(app/[\w/]+\.py)", finding["detail"] + " " + (finding["file"] or "")):
            p = "backend/" + m.group(2)
            if p not in paths and (wt / p).is_file():
                paths.append(p)
        if not paths and finding["kind"] in ("api_error", "invariant", "fuzz"):
            paths = [p for p in ("backend/app/capacity/engine.py", "backend/app/api/routers/capacity.py") if (wt / p).is_file()]
        out, used = [], 0
        for p in paths[:3]:
            txt = (wt / p).read_text()
            chunk = txt[: max(1500, (budget - used) // max(1, len(paths[:3])))]
            out.append(f"--- {p} ---\n{chunk}")
            used += len(chunk)
        return "\n".join(out) or "(no application source file could be located from the traceback)"
