"""End-to-end proof of the check-and-support loop, with a scripted LLM (no model needed).

Scenario: a bug is injected into the capacity engine and committed.
  1. Challenger's pytest probe must catch it.
  2. Champion's FIRST patch is deliberately bad (hard-codes availability=1.0) -> Challenger must OPPOSE.
  3. Champion's SECOND patch is correct                          -> Challenger approves, branch created.
Run:  python -m pytest agents/tests -q
"""
import json
import shutil
import subprocess
from pathlib import Path

import pytest

from agents.config import Config
from agents.llm import MockLLM
from agents.orchestrator import Orchestrator

REPO = Path(__file__).resolve().parents[2]
ENGINE = "backend/app/capacity/engine.py"
GOOD = "    availability = (available_ws_h / net_h) if net_h > 0 else 0.0"
BUG = "    availability = (net_h / available_ws_h) if available_ws_h > 0 else 0.0"   # inverted ratio


def _git(cwd, *a):
    return subprocess.run(["git", "-c", "user.name=t", "-c", "user.email=t@t", *a], cwd=cwd, check=True,
                          capture_output=True, text=True).stdout


@pytest.fixture()
def sandbox(tmp_path):
    dst = tmp_path / "repo"
    shutil.copytree(REPO, dst, ignore=shutil.ignore_patterns("node_modules", ".next", "__pycache__", "*.db", "data", ".pytest_cache", "venv", ".git"))
    if not (dst / ".git").exists():
        _git(dst, "init", "-q")
    p = dst / ENGINE
    assert GOOD in p.read_text()
    p.write_text(p.read_text().replace(GOOD, BUG))
    _git(dst, "add", "-A")
    _git(dst, "commit", "-qm", "inject bug")
    return dst


def test_challenger_finds_champion_fixes_challenger_opposes_bad_patch(sandbox):
    attempts = {"n": 0}

    def scripted(system: str, user: str) -> str:
        if "skeptical senior reviewer" in system:                 # Challenger's LLM review
            return json.dumps({"verdict": "approve", "reasons": []})
        if "QA engineer" in system:                               # fuzz case generator
            return json.dumps([{"num_workstations": 3, "downtime_h": 2}])
        attempts["n"] += 1                                        # Champion
        if attempts["n"] == 1:   # BAD: hard-codes the symptom away -> other tests/invariants break
            return json.dumps({"analysis": "force availability", "edits": [
                {"file": ENGINE, "search": BUG, "replace": "    availability = 1.0"}]})
        return json.dumps({"analysis": "availability ratio is inverted", "edits": [
            {"file": ENGINE, "search": BUG, "replace": GOOD}]})

    cfg = Config(repo_root=sandbox, work_dir=sandbox / "agents" / "data", llm_backend="mock", max_fix_attempts=3)
    orch = Orchestrator(cfg, llm=MockLLM(scripted))
    report = orch.cycle()

    findings = orch.store.db.execute("SELECT * FROM findings").fetchall()
    assert any(f["kind"] == "test_failure" for f in findings), "Challenger must detect the injected bug"
    fixes = orch.store.db.execute("SELECT * FROM fixes ORDER BY id").fetchall()
    statuses = [x["status"] for x in fixes]
    assert statuses[0] == "rejected", f"Challenger must oppose the bad patch: {statuses}"
    assert "approved" in statuses, f"good patch must be approved: {statuses}"
    assert "agent/fix-" in _git(sandbox, "branch", "--list")
    # main is untouched: Champion never merges
    assert BUG in (sandbox / ENGINE).read_text()
    assert any(s == "fixed_pending_merge" for s in (f["status"] for f in orch.store.db.execute("SELECT status FROM findings")))
