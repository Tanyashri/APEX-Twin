"""CHALLENGER: relentless tester + auditor of the Champion.

Probes (each produces Findings):
  UnitTestProbe   - full pytest suite
  ApiProbe        - boots the API on a throwaway DB, hits GET endpoints, flags 5xx / bad JSON
  InvariantProbe  - capacity + prediction sanity rules (OEE in [0,1], P50<=P75<=P90, no NaN ...)
  FuzzProbe       - LLM-invented edge-case payloads (falls back to a built-in set)

Audit duties:
  review_fix()        - gate every Champion patch (deterministic gates first, LLM second)
  reverify_fixes()    - re-check previously approved fixes for regressions
"""
from __future__ import annotations

import json
import math
import re
from pathlib import Path

from .config import Config
from .llm import LLM, extract_json
from .store import Store, fingerprint
from . import tools

SUSPICIOUS_ADDED = re.compile(
    r"pytest\.(skip|xfail)|@pytest\.mark\.(skip|xfail)|except\s*(Exception)?\s*:\s*(pass|return)|"
    r"assert\s+True|#\s*noqa|type:\s*ignore|os\.environ\[.?(TESTING|SKIP)", re.I)

READ_ENDPOINTS = ["/health", "/api/departments", "/api/component-types", "/api/capacity/parameters",
                  "/api/capacity/trends", "/api/capacity/audit", "/api/workforce/roster",
                  "/api/workforce/skills/coverage", "/api/models/champion", "/api/models/challenger",
                  "/api/models/history", "/api/models/drift"]

LEGAL_BINDING = {None, "UNAVAILABLE", "MATERIAL_CONSTRAINED", "LABOUR_BOUND", "DOWNTIME_CONSTRAINED", "MACHINE_BOUND", "HEALTHY"}

BUILTIN_EDGE_CASES = [
    {"num_workstations": 1, "present_workers": 0},
    {"shift_duration_h": 0.01, "break_h": 0.0},
    {"downtime_h": 9999},
    {"material_factor": 0.0},
    {"committed_workload_h": 0.0},
    {"num_workstations": 500, "present_workers": 1, "shifts_per_day": 3},
    {"first_pass_yield": 0.1, "machine_speed_factor": 0.1, "worker_efficiency": 0.1},
    {"shift_duration_h": 8, "break_h": 8},       # must be rejected (400), never 500
]


class Challenger:
    actor = "challenger"

    def __init__(self, cfg: Config, llm: LLM, store: Store):
        self.cfg, self.llm, self.store = cfg, llm, store

    # ================================================================ testing
    def run_cycle(self, repo: Path | None = None) -> dict:
        repo = repo or self.cfg.repo_root
        backend = repo / "backend"
        run_id = self.store.start_run(self.actor, "test_cycle")
        seen: set[str] = set()
        new = 0
        summary = {}
        for probe in (self._unit_tests, self._api_probe):
            try:
                found, info = probe(backend, run_id)
            except Exception as e:  # a crashing probe is itself a finding
                found, info = [(f"probe:{probe.__name__}", "high", f"Probe {probe.__name__} crashed", repr(e), "", "")], {}
            summary[probe.__name__] = info
            for kind, sev, title, detail, file, test_id in found:
                fid, is_new = self.store.add_finding(run_id, kind, sev, title, detail, file, test_id)
                seen.add(fingerprint(kind, test_id or title))
                new += is_new
        closed = self.store.resolve_missing(seen, ("test_failure", "api_error", "invariant", "fuzz"))
        self.store.end_run(run_id, "ok", f"{new} new findings, {len(closed)} auto-closed, probes={json.dumps(summary)}")
        return {"run_id": run_id, "new_findings": new, "closed": closed, "summary": summary}

    def _unit_tests(self, backend: Path, run_id: int):
        res = tools.run_pytest(backend, timeout=self.cfg.test_timeout_s)
        self.store.log(self.actor, "pytest", run_id=run_id, passed=res["passed"], failed=len(res["failed"]))
        findings = [("test_failure", "high", f"Test failed: {f['test_id']}",
                     f["message"] + "\n" + f["traceback"], f["file"], f["test_id"]) for f in res["failed"]]
        return findings, {"passed": res["passed"], "failed": len(res["failed"])}

    def _api_probe(self, backend: Path, run_id: int):
        findings: list[tuple] = []
        info = {"endpoints": 0, "fuzz_cases": 0}
        with tools.api_server(backend, self.cfg.api_port) as (base, proc, seed):
            if proc.poll() is not None:
                out = proc.stdout.read() if proc.stdout else ""
                return [("api_error", "critical", "API failed to boot", (seed.stderr + out)[-3000:], "", "api_boot")], info
            for ep in READ_ENDPOINTS:
                code, body = tools.http(base + ep)
                info["endpoints"] += 1
                self.store.log(self.actor, "api_get", endpoint=ep, status=code)
                if code >= 500:
                    findings.append(("api_error", "high", f"GET {ep} -> {code}", str(body)[:1500], "", f"GET {ep}"))
                elif code < 400:
                    findings += self._invariants(ep, body)
            # capacity calc: baseline + edge cases (LLM-invented, with built-in fallback)
            cases = self._fuzz_cases() 
            for case in cases:
                code, body = tools.http(base + "/api/capacity/calculate", "POST", case)
                info["fuzz_cases"] += 1
                self.store.log(self.actor, "fuzz_case", case=case, status=code)
                tid = "POST /api/capacity/calculate " + json.dumps(case, sort_keys=True)
                if code >= 500:
                    findings.append(("fuzz", "high", f"calculate crashes (HTTP {code})", f"payload={case}\n{body}", "", tid))
                elif code == 200:
                    findings += [(k, s, t, d + f"\npayload={case}", f, tid) for k, s, t, d, f, _ in
                                 self._invariants("/api/capacity/calculate", body)]
        return findings, info

    # ----------------------------------------------------------- invariants
    def _invariants(self, endpoint: str, body) -> list[tuple]:
        out: list[tuple] = []

        def bad(title: str, detail: str):
            out.append(("invariant", "high", f"{title} @ {endpoint}", detail, "", f"{endpoint}::{title}"))

        def walk(o, path=""):
            if isinstance(o, dict):
                for k, v in o.items():
                    walk(v, f"{path}.{k}")
                # quantile ordering
                q = {k.lower(): v for k, v in o.items() if isinstance(v, (int, float))}
                chain = [q[k] for k in ("p10", "p50", "p75", "p90") if k in q]
                if any(a > b for a, b in zip(chain, chain[1:])):
                    bad("Quantile crossing", f"{path}: {chain}")
                for k, v in o.items():
                    if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
                        bad("NaN/Inf value", f"{path}.{k}={v}")
                    if isinstance(v, (int, float)) and k.lower() in ("oee", "availability", "performance", "quality") and not 0 <= v <= 1.0000001:
                        bad(f"{k} outside [0,1]", f"{path}.{k}={v}")
                    if isinstance(v, (int, float)) and k.endswith("_h") and k != "capacity_balance_h" and v < -1e-9:
                        bad(f"Negative hours ({k})", f"{path}.{k}={v}")
            elif isinstance(o, list):
                for i, v in enumerate(o[:200]):
                    walk(v, f"{path}[{i}]")
        walk(body)
        if endpoint == "/api/capacity/calculate" and isinstance(body, dict) and "usable_h" in body:
            if body["usable_h"] > body.get("net_h", float("inf")) + 1e-6:
                bad("usable_h exceeds net_h", f"usable={body['usable_h']} net={body.get('net_h')}")
            if body.get("binding_constraint") not in LEGAL_BINDING:
                bad("Unknown binding_constraint", str(body.get("binding_constraint")))
        return out

    # ------------------------------------------------------------- fuzzing
    def _fuzz_cases(self) -> list[dict]:
        cases = list(BUILTIN_EDGE_CASES)
        try:
            raw = self.llm.chat(
                "You are a QA engineer. Output ONLY a JSON array of 5 objects.",
                "Invent 5 nasty-but-plausible edge-case JSON bodies for POST /capacity/calculate. Fields: "
                "num_workstations:int>=1, shift_duration_h:float>0, break_h:float>=0, shifts_per_day:int>=1, "
                "downtime_h:float>=0, present_workers:int>=0, worker_efficiency:0.1-2.0, machine_speed_factor:0.1-2.0, "
                "first_pass_yield:0.1-1.0, material_factor:0-1, committed_workload_h:float>=0. "
                "Every object may contain any subset of fields. Target boundaries, zeros, huge numbers, and "
                "combinations (e.g. more downtime than net hours, zero workers with many machines).", temperature=0.7)
            parsed = extract_json(raw)
            if isinstance(parsed, list):
                cases += [c for c in parsed[:5] if isinstance(c, dict)]
        except Exception as e:
            self.store.log(self.actor, "fuzz_llm_unavailable", error=repr(e))
        return cases

    # ============================================================== auditing
    def review_fix(self, finding, diff: str, files: list[str], wt: Path, baseline_failures: set[str]) -> dict:
        """Gate a Champion patch. Returns {approved, reasons, gates}. Deterministic gates can only
        be tightened by the LLM, never overridden."""
        reasons: list[str] = []
        gates: dict[str, bool] = {}

        # Gate 1: scope
        out_of_scope = [f for f in files if not f.startswith(self.cfg.fixable_prefixes) or f.startswith(self.cfg.protected_prefixes)]
        gates["scope"] = not out_of_scope
        if out_of_scope:
            reasons.append(f"Touches files outside the allowed fix area: {out_of_scope}. Tests/config must not be edited to make failures disappear.")
        # Gate 2: size
        n = tools.diff_line_count(diff)
        gates["size"] = 0 < n <= self.cfg.max_patch_lines
        if n == 0:
            reasons.append("Empty patch.")
        elif n > self.cfg.max_patch_lines:
            reasons.append(f"Patch changes {n} lines (limit {self.cfg.max_patch_lines}); too broad for an automated fix.")
        # Gate 3: cheating patterns
        added = [l[1:] for l in diff.splitlines() if l.startswith("+") and not l.startswith("+++")]
        cheats = [l.strip() for l in added if SUSPICIOUS_ADDED.search(l)]
        gates["no_suppression"] = not cheats
        if cheats:
            reasons.append(f"Adds error-suppression / test-skipping patterns: {cheats[:3]}")
        # Gate 4: target now passes + no regressions (independent re-run by the Challenger)
        res = tools.run_pytest(wt / "backend", timeout=self.cfg.test_timeout_s)
        now_failing = {f["test_id"] for f in res["failed"]}
        gates["target_fixed"] = finding["test_id"] not in now_failing if finding["kind"] == "test_failure" else True
        if not gates["target_fixed"]:
            reasons.append(f"Target test still fails: {finding['test_id']}")
        regressions = sorted(now_failing - baseline_failures)
        gates["no_regressions"] = not regressions
        if regressions:
            reasons.append(f"Introduces new failing tests: {regressions[:5]}")
        # Gate 5: lint (best effort)
        rc, lint = tools.run(["python3", "-m", "ruff", "check", "--select", "E9,F63,F7,F82", "app"], wt / "backend", 120)
        gates["syntax_lint"] = rc in (0, 127) or "No module named ruff" in lint
        if not gates["syntax_lint"]:
            reasons.append("ruff syntax/undefined-name errors:\n" + lint[-500:])

        # LLM second opinion: can only add objections
        llm = self._llm_review(finding, diff)
        gates["llm_review"] = llm["verdict"] != "oppose"
        if llm["verdict"] == "oppose":
            reasons += [f"[LLM review] {r}" for r in llm["reasons"]]

        approved = all(gates.values())
        self.store.log(self.actor, "review", finding_id=finding["id"], approved=approved, gates=gates, reasons=reasons)
        return {"approved": approved, "reasons": reasons, "gates": gates}

    def _llm_review(self, finding, diff: str) -> dict:
        try:
            raw = self.llm.chat(
                "You are a skeptical senior reviewer. Reply ONLY with JSON: "
                '{"verdict":"approve"|"oppose","reasons":["..."]}. Oppose if the patch hides the symptom instead of fixing '
                "the root cause, changes business semantics (OEE/capacity maths, quantile ordering), swallows exceptions, "
                "or is unrelated to the failure.",
                f"FAILURE:\n{finding['title']}\n{finding['detail'][:1500]}\n\nPATCH:\n{diff[:4000]}")
            j = extract_json(raw)
            if isinstance(j, dict) and j.get("verdict") in ("approve", "oppose"):
                return {"verdict": j["verdict"], "reasons": [str(r) for r in j.get("reasons", [])][:4]}
        except Exception as e:
            self.store.log(self.actor, "llm_review_unavailable", error=repr(e))
        return {"verdict": "approve", "reasons": []}   # LLM down => rely on deterministic gates

    def reverify_fixes(self) -> list[int]:
        """Re-test branches the Champion previously fixed; reopen + flag if they regressed."""
        reopened = []
        for f in self.store.pending_verification():
            fixes = [x for x in self.store.fixes_for(f["id"]) if x["status"] == "approved"]
            if not fixes:
                continue
            branch = fixes[-1]["branch"]
            try:
                with tools.worktree(self.cfg.repo_root, branch, reset=False) as wt:
                    res = tools.run_pytest(wt / "backend", timeout=self.cfg.test_timeout_s)
            except Exception as e:
                self.store.log(self.actor, "reverify_error", finding_id=f["id"], error=repr(e))
                continue
            failing = {x["test_id"] for x in res["failed"]}
            if f["test_id"] in failing:
                self.store.set_finding(f["id"], status="open")
                self.store.log(self.actor, "OBJECTION_post_fix_regression", finding_id=f["id"], branch=branch, failing=sorted(failing)[:10])
                reopened.append(f["id"])
        return reopened
