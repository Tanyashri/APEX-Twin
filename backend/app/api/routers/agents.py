"""FastAPI Router for APEX-Twin Check-and-Support Agents (Challenger & Champion)."""
from __future__ import annotations

import json
import threading
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel

from agents.config import Config
from agents.store import Store
from agents.orchestrator import Orchestrator

router = APIRouter()
_cycle_lock = threading.Lock()
_last_cycle_status: Dict[str, Any] = {"running": False, "last_result": None, "last_error": None}


def _get_store() -> tuple[Store, Config]:
    cfg = Config()
    store = Store(cfg.db_path, cfg.jsonl_path)
    return store, cfg


def _run_cycle_background(cfg: Config):
    global _last_cycle_status
    with _cycle_lock:
        _last_cycle_status["running"] = True
        _last_cycle_status["last_error"] = None
        try:
            orch = Orchestrator(cfg)
            res = orch.cycle()
            _last_cycle_status["last_result"] = res
        except Exception as e:
            _last_cycle_status["last_error"] = str(e)
        finally:
            _last_cycle_status["running"] = False


@router.get("/status")
def get_agents_status():
    """Summary of active check-and-support agents configuration and status."""
    store, cfg = _get_store()
    total_runs = store.db.execute("SELECT COUNT(*) as c FROM runs").fetchone()["c"]
    open_findings = store.db.execute("SELECT COUNT(*) as c FROM findings WHERE status='open'").fetchone()["c"]
    total_findings = store.db.execute("SELECT COUNT(*) as c FROM findings").fetchone()["c"]
    approved_fixes = store.db.execute("SELECT COUNT(*) as c FROM fixes WHERE status='approved'").fetchone()["c"]
    total_fixes = store.db.execute("SELECT COUNT(*) as c FROM fixes").fetchone()["c"]

    last_run = store.db.execute("SELECT * FROM runs ORDER BY id DESC LIMIT 1").fetchone()

    return {
        "status": "active",
        "running_cycle": _last_cycle_status["running"],
        "llm_backend": cfg.llm_backend,
        "ollama_model": cfg.ollama_model,
        "hf_model": cfg.hf_model,
        "total_runs": total_runs,
        "open_findings": open_findings,
        "total_findings": total_findings,
        "approved_fixes": approved_fixes,
        "total_fixes": total_fixes,
        "last_run": dict(last_run) if last_run else None,
        "last_cycle_result": _last_cycle_status["last_result"],
        "last_cycle_error": _last_cycle_status["last_error"],
    }


@router.get("/runs")
def get_runs(limit: int = 15):
    """Get recent Challenger test runs and probe summaries."""
    store, _ = _get_store()
    rows = store.db.execute("SELECT * FROM runs ORDER BY id DESC LIMIT ?", (limit,)).fetchall()
    return [dict(r) for r in rows]


@router.get("/findings")
def get_findings(status: Optional[str] = None, limit: int = 50):
    """Get system findings detected by the Challenger agent."""
    store, _ = _get_store()
    if status:
        rows = store.db.execute(
            "SELECT * FROM findings WHERE status=? ORDER BY id DESC LIMIT ?", (status, limit)
        ).fetchall()
    else:
        rows = store.db.execute("SELECT * FROM findings ORDER BY id DESC LIMIT ?", (limit,)).fetchall()
    return [dict(r) for r in rows]


@router.get("/fixes")
def get_fixes(limit: int = 30):
    """Get patches proposed and gated by Champion & Challenger agents."""
    store, _ = _get_store()
    rows = store.db.execute("SELECT * FROM fixes ORDER BY id DESC LIMIT ?", (limit,)).fetchall()
    return [dict(r) for r in rows]


@router.get("/activity")
def get_activity(limit: int = 50):
    """Get recent activity audit trail events."""
    store, _ = _get_store()
    rows = store.db.execute("SELECT * FROM events ORDER BY id DESC LIMIT ?", (limit,)).fetchall()
    out = []
    for r in rows:
        d = dict(r)
        if d.get("payload"):
            try:
                d["payload"] = json.loads(d["payload"])
            except Exception:
                pass
        out.append(d)
    return out


@router.post("/cycle")
def trigger_cycle(background_tasks: BackgroundTasks):
    """Trigger an asynchronous check-and-support cycle (Challenger tests -> Champion fixes -> Challenger audits)."""
    if _cycle_lock.locked() or _last_cycle_status["running"]:
        return {"status": "already_running", "message": "An agent cycle is currently executing"}

    _, cfg = _get_store()
    background_tasks.add_task(_run_cycle_background, cfg)
    return {"status": "started", "message": "Check-and-support cycle dispatched in background"}
