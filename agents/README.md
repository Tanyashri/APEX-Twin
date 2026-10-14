# APEX-Twin Check-and-Support Agents

Two cooperating agents. **Challenger** tests and audits, **Champion** fixes. Neither is trusted blindly.

> Naming note: the repo's MLOps already has a champion/challenger *model* pair (`/api/models/*`).
> These agents are a separate concept: *Challenger agent* = QA/auditor, *Champion agent* = fixer.

```
        ┌──────────────── every AGENT_INTERVAL_S ────────────────┐
        ▼                                                         │
 CHALLENGER: pytest + API GETs + invariants + LLM-invented edge cases
        │ findings (deduped by fingerprint, logged to SQLite + JSONL)
        ▼
 CHAMPION: picks a method per finding -> patch in isolated git worktree
        │ proposed diff
        ▼
 CHALLENGER REVIEW (can OPPOSE):  scope · size · no test-skipping · target fixed
        │                          · no regressions · syntax lint · LLM second opinion
   approve ──> branch agent/fix-<id> (never merged to main)      oppose ──> objections fed back, retry (max 3) ──> escalate to human
        │
        └── next cycle: Challenger re-verifies old fixes; regression => reopen + OBJECTION logged
```

## Setup
```bash
pip install -r backend/requirements.txt          # app deps
# Option A - local Llama
ollama pull llama3.1:8b                          # or qwen2.5-coder:7b (better at code)
export AGENT_LLM_BACKEND=ollama OLLAMA_MODEL=llama3.1:8b
# Option B - llama.cpp / vLLM / LM Studio
export AGENT_LLM_BACKEND=openai_compat OPENAI_COMPAT_URL=http://localhost:8080/v1
# Option C - Hugging Face
pip install huggingface_hub
export AGENT_LLM_BACKEND=hf HF_TOKEN=hf_xxx HF_MODEL=Qwen/Qwen2.5-Coder-32B-Instruct
```
```bash
python -m agents once      # one full cycle
python -m agents loop      # forever
python -m agents report    # runs / findings / fixes
python -m agents tail      # live activity log (agents/data/activity.jsonl)
python -m pytest agents/tests -q   # proves the loop end-to-end with a scripted LLM
```
Review a fix:  `git diff main..agent/fix-3`  then merge yourself.

## Safety design (enforced in code, not by prompts)
- Champion edits only `backend/app/`; `backend/tests/`, `agents/`, `.env`, migrations are protected.
- Fixes happen in a throwaway `git worktree`; the live checkout is never touched; nothing auto-merges.
- Probes run the API against a temporary SQLite DB, so real data is never read or written.
- Patch limit 60 changed lines. Edits are search/replace and must match exactly once.
- The LLM reviewer can only **add** objections; it can never override a failed deterministic gate.
- If the LLM is down, fuzzing falls back to built-in edge cases and review falls back to deterministic gates.

## Fix methods (Champion playbook, `champion.py`)
| finding kind | method |
|---|---|
| `test_failure`, `api_error`, `invariant`, `fuzz` | `code_patch` (LLM edit, Challenger-gated) |
| `model_drift` | `retrain_model` via `/api/models/retrain` (the repo's own safety gate decides promotion) |

Add a method = add one function and one dict entry.

## Known limits
- Small local models (7-8B) often fail multi-file fixes; expect more escalations. Use a stronger HF model for hard bugs.
- `model_drift` findings are not yet produced by a Challenger probe (`/api/models/drift` is only checked for 5xx). Next step.
- Invariants are heuristics tuned to `/api/capacity/calculate`; extend `Challenger._invariants` for new endpoints.
