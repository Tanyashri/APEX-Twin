"""LLM backends. All expose `chat(system, user) -> str`.

Local Llama (Ollama / llama.cpp) and Hugging Face are interchangeable, so you can
develop on a free local 8B model and switch to a bigger hosted one via one env var.
"""
from __future__ import annotations

import json
import re
import urllib.request
from typing import Callable, Protocol


class LLM(Protocol):
    def chat(self, system: str, user: str, temperature: float = 0.1) -> str: ...


def _post_json(url: str, payload: dict, headers: dict | None = None, timeout: int = 300) -> dict:
    req = urllib.request.Request(
        url, data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json", **(headers or {})},
    )
    with urllib.request.urlopen(req, timeout=timeout) as r:  # noqa: S310
        return json.loads(r.read())


class OllamaLLM:
    """Local Llama via Ollama:  `ollama pull llama3.1:8b`  (or qwen2.5-coder:7b)."""

    def __init__(self, url: str, model: str):
        self.url, self.model = url.rstrip("/"), model

    def chat(self, system: str, user: str, temperature: float = 0.1) -> str:
        out = _post_json(f"{self.url}/api/chat", {
            "model": self.model, "stream": False,
            "options": {"temperature": temperature, "num_ctx": 8192},
            "messages": [{"role": "system", "content": system},
                         {"role": "user", "content": user}],
        })
        return out["message"]["content"]


class OpenAICompatLLM:
    """llama.cpp `llama-server`, vLLM, LM Studio - anything speaking /v1/chat/completions."""

    def __init__(self, url: str, model: str):
        self.url, self.model = url.rstrip("/"), model

    def chat(self, system: str, user: str, temperature: float = 0.1) -> str:
        out = _post_json(f"{self.url}/chat/completions", {
            "model": self.model, "temperature": temperature,
            "messages": [{"role": "system", "content": system},
                         {"role": "user", "content": user}],
        })
        return out["choices"][0]["message"]["content"]


class HFInferenceLLM:
    """Hugging Face Inference API.  pip install huggingface_hub ; export HF_TOKEN=..."""

    def __init__(self, model: str, token: str):
        from huggingface_hub import InferenceClient  # lazy import
        self.client = InferenceClient(model=model, token=token or None)

    def chat(self, system: str, user: str, temperature: float = 0.1) -> str:
        r = self.client.chat_completion(
            messages=[{"role": "system", "content": system},
                      {"role": "user", "content": user}],
            max_tokens=2048, temperature=temperature,
        )
        return r.choices[0].message.content


class MockLLM:
    """Deterministic stand-in for tests / offline dry-runs."""

    def __init__(self, handler: Callable[[str, str], str]):
        self.handler = handler
        self.calls: list[tuple[str, str]] = []

    def chat(self, system: str, user: str, temperature: float = 0.1) -> str:
        self.calls.append((system, user))
        return self.handler(system, user)


def make_llm(cfg) -> LLM:
    b = cfg.llm_backend
    if b == "ollama":
        return OllamaLLM(cfg.ollama_url, cfg.ollama_model)
    if b == "openai_compat":
        return OpenAICompatLLM(cfg.openai_compat_url, cfg.openai_compat_model)
    if b == "hf":
        return HFInferenceLLM(cfg.hf_model, cfg.hf_token)
    raise ValueError(f"Unknown AGENT_LLM_BACKEND={b!r}")


def extract_json(text: str):
    """Small models wrap JSON in prose / ```fences```. Pull out the first valid object/array."""
    text = re.sub(r"```(?:json)?", "", text)
    for opener, closer in (("{", "}"), ("[", "]")):
        start = text.find(opener)
        while start != -1:
            end = text.rfind(closer)
            while end > start:
                try:
                    return json.loads(text[start:end + 1])
                except json.JSONDecodeError:
                    end = text.rfind(closer, start, end)
            start = text.find(opener, start + 1)
    return None
