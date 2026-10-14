from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path


def _env(name: str, default: str) -> str:
    return os.environ.get(name, default)


@dataclass
class Config:
    repo_root: Path = Path(__file__).resolve().parent.parent
    # --- LLM -------------------------------------------------------------
    # ollama | openai_compat (llama.cpp server / vLLM / LM Studio) | hf | mock
    llm_backend: str = _env("AGENT_LLM_BACKEND", "ollama")
    ollama_url: str = _env("OLLAMA_URL", "http://localhost:11434")
    ollama_model: str = _env("OLLAMA_MODEL", "qwen2.5-coder:7b")
    openai_compat_url: str = _env("OPENAI_COMPAT_URL", "http://localhost:8080/v1")
    openai_compat_model: str = _env("OPENAI_COMPAT_MODEL", "local")
    hf_model: str = _env("HF_MODEL", "Qwen/Qwen2.5-Coder-32B-Instruct")
    hf_token: str = _env("HF_TOKEN", "")
    # --- Loop ------------------------------------------------------------
    interval_s: int = int(_env("AGENT_INTERVAL_S", "600"))
    max_fix_attempts: int = int(_env("AGENT_MAX_FIX_ATTEMPTS", "3"))
    test_timeout_s: int = int(_env("AGENT_TEST_TIMEOUT_S", "900"))
    # --- Safety rails (enforced in code, not by the LLM) -----------------
    max_patch_lines: int = int(_env("AGENT_MAX_PATCH_LINES", "60"))
    fixable_prefixes: tuple[str, ...] = ("backend/app/",)
    protected_prefixes: tuple[str, ...] = (
        "backend/tests/", "agents/", ".env", "backend/alembic/", ".git",
    )
    # --- System under test ----------------------------------------------
    api_port: int = int(_env("AGENT_API_PORT", "8765"))
    work_dir: Path = field(default=None)  # type: ignore[assignment]

    def __post_init__(self) -> None:
        if self.work_dir is None:
            self.work_dir = self.repo_root / "agents" / "data"
        self.work_dir = Path(self.work_dir)
        self.work_dir.mkdir(parents=True, exist_ok=True)

    @property
    def db_path(self) -> Path:
        return self.work_dir / "agents.db"

    @property
    def jsonl_path(self) -> Path:
        return self.work_dir / "activity.jsonl"

    @property
    def backend_dir(self) -> Path:
        return self.repo_root / "backend"
