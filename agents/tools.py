"""Sandboxed helpers: subprocess, pytest parsing, git worktrees, search/replace edits."""
from __future__ import annotations

import json
import os
import re
import shutil
import socket
import subprocess
import sys
import tempfile
import time
import urllib.request
import xml.etree.ElementTree as ET
from contextlib import contextmanager
from pathlib import Path


def run(cmd: list[str], cwd: Path, timeout: int = 600, env: dict | None = None) -> tuple[int, str]:
    try:
        p = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, timeout=timeout,
                           env={**os.environ, **(env or {})})
        return p.returncode, (p.stdout + p.stderr)
    except subprocess.TimeoutExpired as e:
        return 124, f"TIMEOUT after {timeout}s\n{(e.stdout or b'')[-2000:]!r}"


# ---------------------------------------------------------------- pytest ----
def run_pytest(backend_dir: Path, args: list[str] | None = None, timeout: int = 900) -> dict:
    """Returns {rc, passed, failed:[{test_id,file,message,traceback}], output_tail}."""
    with tempfile.TemporaryDirectory() as td:
        xml_path = Path(td) / "junit.xml"
        rc, out = run([sys.executable, "-m", "pytest", "-q",
                       f"--junitxml={xml_path}", "-p", "no:cacheprovider", *(args or ["tests"])],
                      backend_dir, timeout,
                      env={"DATABASE_URL": f"sqlite:///{Path(td) / 'agent_test.db'}"})
        failed, passed = [], 0
        if xml_path.exists():
            root = ET.parse(xml_path).getroot()
            for tc in root.iter("testcase"):
                bad = tc.find("failure") if tc.find("failure") is not None else tc.find("error")
                tid = f"{tc.get('classname', '').replace('.', '/')}.py::{tc.get('name')}"
                tid = re.sub(r"\.py\.py", ".py", tid)
                if bad is None:
                    if tc.find("skipped") is None:
                        passed += 1
                    continue
                failed.append({"test_id": tid, "file": tc.get("file") or "",
                               "message": (bad.get("message") or "")[:500],
                               "traceback": (bad.text or "")[-3500:]})
        elif rc != 0:   # collection crash etc.
            failed.append({"test_id": "pytest::collection", "file": "", "message": "pytest crashed",
                           "traceback": out[-3500:]})
        return {"rc": rc, "passed": passed, "failed": failed, "output_tail": out[-1500:]}


# ------------------------------------------------------------------- git ----
def git(repo: Path, *args: str) -> tuple[int, str]:
    return run(["git", *args], repo, 120)


@contextmanager
def worktree(repo: Path, branch: str, keep_branch: bool = True, reset: bool = True):
    """Isolated checkout so the Champion can never touch the live working tree."""
    wt = Path(tempfile.mkdtemp(prefix="apex_agent_wt_"))
    shutil.rmtree(wt)
    if reset:
        rc, out = git(repo, "worktree", "add", "-B", branch, str(wt), "HEAD")
    else:
        rc, out = git(repo, "worktree", "add", str(wt), branch)
    if rc != 0:
        raise RuntimeError(f"git worktree failed: {out}")
    try:
        yield wt
    finally:
        git(repo, "worktree", "remove", "--force", str(wt))
        if not keep_branch:
            git(repo, "branch", "-D", branch)


def changed_files(wt: Path) -> list[str]:
    _, out = git(wt, "diff", "--name-only", "HEAD")
    return [l for l in out.splitlines() if l.strip()]


def diff_text(wt: Path) -> str:
    return git(wt, "diff", "HEAD")[1]


def diff_line_count(diff: str) -> int:
    return sum(1 for l in diff.splitlines()
               if l[:1] in "+-" and not l.startswith(("+++", "---")))


def commit_all(wt: Path, message: str) -> str:
    git(wt, "add", "-A")
    git(wt, "-c", "user.name=apex-champion", "-c", "user.email=agent@apex-twin.local",
        "commit", "-m", message)
    return git(wt, "rev-parse", "--short", "HEAD")[1].strip()


# ------------------------------------------------------- search/replace -----
def apply_edits(wt: Path, edits: list[dict], allowed: tuple[str, ...], protected: tuple[str, ...]) -> list[str]:
    """Apply [{file, search, replace}]. Returns list of error strings (empty = all applied).

    Search/replace is far more reliable than asking a small LLM for a unified diff.
    `search` must match exactly once, so an edit can never silently hit the wrong place.
    """
    errors = []
    for i, e in enumerate(edits):
        rel = str(e.get("file", "")).lstrip("/")
        if ".." in Path(rel).parts or not rel.startswith(allowed) or rel.startswith(protected):
            errors.append(f"edit {i}: path {rel!r} is outside the allowed fix area")
            continue
        path = wt / rel
        if not path.is_file():
            errors.append(f"edit {i}: file {rel!r} does not exist")
            continue
        text, search = path.read_text(), e.get("search", "")
        if not search or text.count(search) != 1:
            errors.append(f"edit {i}: 'search' must match exactly once in {rel} (matched {text.count(search) if search else 0})")
            continue
        path.write_text(text.replace(search, e.get("replace", ""), 1))
    return errors


# ------------------------------------------------------------- API server ---
def _free_port(preferred: int) -> int:
    with socket.socket() as s:
        try:
            s.bind(("127.0.0.1", preferred))
            return preferred
        except OSError:
            s.bind(("127.0.0.1", 0))
            return s.getsockname()[1]


@contextmanager
def api_server(backend_dir: Path, port: int):
    """Boot the FastAPI app against a throwaway SQLite DB so probes never touch real data."""
    port = _free_port(port)
    td = tempfile.mkdtemp(prefix="apex_agent_api_")
    env = {**os.environ, "DATABASE_URL": f"sqlite:///{td}/probe.db"}
    seed = subprocess.run([sys.executable, "-m", "app.db.seed"], cwd=backend_dir, env=env,
                          capture_output=True, text=True, timeout=300)
    proc = subprocess.Popen([sys.executable, "-m", "uvicorn", "app.main:app", "--port", str(port),
                             "--log-level", "warning"], cwd=backend_dir, env=env,
                            stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    base = f"http://127.0.0.1:{port}"
    try:
        for _ in range(60):
            if proc.poll() is not None:
                break
            try:
                http(base + "/health", timeout=2)
                break
            except Exception:
                time.sleep(0.5)
        yield base, proc, seed
    finally:
        proc.terminate()
        try:
            proc.wait(5)
        except subprocess.TimeoutExpired:
            proc.kill()
        shutil.rmtree(td, ignore_errors=True)


def http(url: str, method: str = "GET", body: dict | None = None, timeout: int = 30) -> tuple[int, object]:
    req = urllib.request.Request(url, method=method,
                                 data=json.dumps(body).encode() if body is not None else None,
                                 headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:  # noqa: S310
            raw = r.read()
            return r.status, (json.loads(raw) if raw else None)
    except urllib.error.HTTPError as e:
        raw = e.read()
        try:
            return e.code, json.loads(raw)
        except Exception:
            return e.code, raw.decode(errors="replace")[:500]
