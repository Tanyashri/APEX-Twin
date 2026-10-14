"""Persistent activity log: SQLite (queryable) + JSONL (tail -f friendly)."""
from __future__ import annotations

import hashlib
import json
import sqlite3
import time
from pathlib import Path

SCHEMA = """
CREATE TABLE IF NOT EXISTS runs(
  id INTEGER PRIMARY KEY, started REAL, finished REAL, actor TEXT, kind TEXT,
  status TEXT, summary TEXT);
CREATE TABLE IF NOT EXISTS findings(
  id INTEGER PRIMARY KEY, run_id INTEGER, ts REAL, fingerprint TEXT UNIQUE,
  kind TEXT, severity TEXT, title TEXT, detail TEXT, file TEXT, test_id TEXT,
  status TEXT DEFAULT 'open', attempts INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS fixes(
  id INTEGER PRIMARY KEY, finding_id INTEGER, attempt INTEGER, ts REAL,
  method TEXT, branch TEXT, diff TEXT, status TEXT, verdict TEXT);
CREATE TABLE IF NOT EXISTS events(
  id INTEGER PRIMARY KEY, ts REAL, actor TEXT, event TEXT, payload TEXT);
"""


def fingerprint(*parts: str) -> str:
    return hashlib.sha1("|".join(parts).encode()).hexdigest()[:16]


class Store:
    def __init__(self, db_path: Path, jsonl_path: Path):
        self.jsonl_path = jsonl_path
        self.db = sqlite3.connect(db_path)
        self.db.row_factory = sqlite3.Row
        self.db.executescript(SCHEMA)

    # -- generic activity log ------------------------------------------------
    def log(self, actor: str, event: str, **payload) -> None:
        ts = time.time()
        self.db.execute("INSERT INTO events(ts,actor,event,payload) VALUES(?,?,?,?)",
                        (ts, actor, event, json.dumps(payload, default=str)))
        self.db.commit()
        with open(self.jsonl_path, "a") as f:
            f.write(json.dumps({"ts": ts, "actor": actor, "event": event, **payload}, default=str) + "\n")

    # -- runs -----------------------------------------------------------------
    def start_run(self, actor: str, kind: str) -> int:
        cur = self.db.execute("INSERT INTO runs(started,actor,kind,status) VALUES(?,?,?,'running')",
                              (time.time(), actor, kind))
        self.db.commit()
        return cur.lastrowid

    def end_run(self, run_id: int, status: str, summary: str) -> None:
        self.db.execute("UPDATE runs SET finished=?,status=?,summary=? WHERE id=?",
                        (time.time(), status, summary, run_id))
        self.db.commit()
        self.log("system", "run_finished", run_id=run_id, status=status, summary=summary)

    # -- findings -------------------------------------------------------------
    def add_finding(self, run_id: int, kind: str, severity: str, title: str, detail: str,
                    file: str = "", test_id: str = "") -> tuple[int, bool]:
        """Returns (finding_id, is_new). Same problem seen again => reopens/dedupes."""
        fp = fingerprint(kind, test_id or title)
        row = self.db.execute("SELECT id,status FROM findings WHERE fingerprint=?", (fp,)).fetchone()
        if row:
            if row["status"] in ("fixed_verified",):          # regression!
                self.db.execute("UPDATE findings SET status='open',attempts=0,detail=? WHERE id=?",
                                (detail, row["id"]))
                self.db.commit()
                self.log("challenger", "regression_reopened", finding_id=row["id"], title=title)
                return row["id"], True
            return row["id"], False
        cur = self.db.execute(
            "INSERT INTO findings(run_id,ts,fingerprint,kind,severity,title,detail,file,test_id) "
            "VALUES(?,?,?,?,?,?,?,?,?)", (run_id, time.time(), fp, kind, severity, title, detail, file, test_id))
        self.db.commit()
        self.log("challenger", "finding", finding_id=cur.lastrowid, kind=kind, severity=severity, title=title)
        return cur.lastrowid, True

    def open_findings(self) -> list[sqlite3.Row]:
        order = "CASE severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END"
        return self.db.execute(
            f"SELECT * FROM findings WHERE status='open' ORDER BY {order}, id").fetchall()

    def set_finding(self, fid: int, **cols) -> None:
        sets = ",".join(f"{k}=?" for k in cols)
        self.db.execute(f"UPDATE findings SET {sets} WHERE id=?", (*cols.values(), fid))
        self.db.commit()

    def get_finding(self, fid: int):
        return self.db.execute("SELECT * FROM findings WHERE id=?", (fid,)).fetchone()

    def resolve_missing(self, seen_fingerprints: set[str], kinds: tuple[str, ...]) -> list[int]:
        """Findings of these kinds that no longer reproduce on main are closed (fixed externally)."""
        q = ",".join("?" * len(kinds))
        rows = self.db.execute(
            f"SELECT id,fingerprint FROM findings WHERE status='open' AND kind IN ({q})", kinds).fetchall()
        closed = [r["id"] for r in rows if r["fingerprint"] not in seen_fingerprints]
        for fid in closed:
            self.set_finding(fid, status="resolved_externally")
        return closed

    # -- fixes ----------------------------------------------------------------
    def add_fix(self, finding_id: int, attempt: int, method: str, branch: str = "",
                diff: str = "", status: str = "proposed", verdict: str = "") -> int:
        cur = self.db.execute(
            "INSERT INTO fixes(finding_id,attempt,ts,method,branch,diff,status,verdict) VALUES(?,?,?,?,?,?,?,?)",
            (finding_id, attempt, time.time(), method, branch, diff, status, verdict))
        self.db.commit()
        return cur.lastrowid

    def set_fix(self, fix_id: int, **cols) -> None:
        sets = ",".join(f"{k}=?" for k in cols)
        self.db.execute(f"UPDATE fixes SET {sets} WHERE id=?", (*cols.values(), fix_id))
        self.db.commit()

    def fixes_for(self, finding_id: int) -> list[sqlite3.Row]:
        return self.db.execute("SELECT * FROM fixes WHERE finding_id=? ORDER BY id", (finding_id,)).fetchall()

    def pending_verification(self) -> list[sqlite3.Row]:
        return self.db.execute("SELECT * FROM findings WHERE status='fixed_pending_merge'").fetchall()
