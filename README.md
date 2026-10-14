# 🏎️ APEX-Twin: Cyber-Physical Automotive Digital Twin & Adaptive Capacity Engine

<p align="center">
  <strong>An Industry 4.0 Cyber-Physical Platform for Electric Vehicle (EV) Manufacturing Lines</strong><br>
  <em>Real-Time 3D Floor Telematics • Authoritative OEE Decomposition • Champion-Challenger LightGBM MLOps • Autonomous Self-Healing Agents</em>
</p>

<p align="center">
  <a href="https://nextjs.org/"><img src="https://img.shields.io/badge/Next.js-16.4_Turbopack-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js" /></a>
  <a href="https://fastapi.tiangolo.com/"><img src="https://img.shields.io/badge/FastAPI-0.115_Async-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI" /></a>
  <a href="https://threejs.org/"><img src="https://img.shields.io/badge/Three.js-WebGL_3D-000000?style=for-the-badge&logo=threedotjs&logoColor=white" alt="Three.js" /></a>
  <a href="https://lightgbm.readthedocs.io/"><img src="https://img.shields.io/badge/LightGBM-Quantile_Regression-brightgreen?style=for-the-badge&logo=scikitlearn&logoColor=white" alt="LightGBM" /></a>
  <a href="https://www.python.org/"><img src="https://img.shields.io/badge/Python-3.11_Typed-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python" /></a>
  <a href="https://pytest.org/"><img src="https://img.shields.io/badge/Pytest-All_Passing-76FF03?style=for-the-badge&logo=pytest&logoColor=black" alt="Tests" /></a>
</p>

---

## 📌 Executive Summary

Modern automotive assembly lines face micro-stoppages on high-tonnage stamping dies, thermal drift during robotic welding, and cell-balancing bottlenecks in 800V skateboard battery packs. Classical MES systems only report lagging data after bottlenecks have already starved downstream stations.

**APEX-Twin** (**A**utomotive **P**roduction **E**xecution & e**X**treme Capacity Digital **Twin**) is an end-to-end cyber-physical intelligence platform fusing three production-grade pillars:

1. **Real-Time 3D Factory Floor:** Interactive Three.js/WebGL representation of the 7 automotive manufacturing cells with live machinery telemetry and dynamic conveyor pipeline animations.
2. **Authoritative ISO 22400-2 Capacity Engine:** Exact mathematical OEE decomposition and dual-constraint analysis (`LABOUR_BOUND` vs `MACHINE_BOUND`) paired with LightGBM Quantile Regression ($P50, P75, P90$) for stochastic risk forecasting.
3. **Unified AI & Autonomous Agents (Challenger & Champion):** A closed-loop supervisor powered by **Qwen 2.5 Coder** that audits the codebase, verifies simulation rules against 7 deterministic gates, and drafts automated patches in isolated git worktrees.

---

## 🏭 1. The 7-Department Automotive Network

APEX-Twin models the takt sequence of an electric passenger vehicle across seven production cells:

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  LOGISTICS   │ ──> │   STAMPING   │ ──> │ BIW WELDING  │ ──> │ PAINT & COAT │
│ Automated AGV│     │ 2,500T Press │     │ 6-Axis Fanuc │     │ Cleanroom    │
└──────────────┘     └──────────────┘     └──────────────┘     └──────┬───────┘
                                                                      │
┌──────────────┐     ┌──────────────┐     ┌──────────────┐            │
│ QUALITY & QA │ <── │  ASSEMBLY    │ <── │  POWERTRAIN  │ <──────────┘
│ Chassis Dyno │     │ Marriage Lift│     │ 82kWh Battery│
└──────────────┘     └──────────────┘     └──────────────┘
```

| Department | Identifier | Automation & Scope | Target Output |
|---|:---:|---|---|
| **Materials & Logistics** | `LOGISTICS` | High-density automated staging, AGV tugger fleet | Raw steel coils, sub-assembly buffers |
| **High-Tonnage Stamping** | `STAMPING` | 2,500T hydraulic transfer press, precision decoiler | Outer hood skins, quarter panels, structural pillars |
| **Robotic BIW Welding** | `WELDING` | Dual 6-axis articulating welding robots, laser brazing | Monocoque framing, spot & laser arc seam welds |
| **Paint & Surface** | `PAINT` | Pressurized cleanroom, rotary bell atomizers | Cathodic electrocoat (e-coat), primer, ceramic clearcoat |
| **Powertrain Integration**| `POWERTRAIN`| High-voltage cell marriage, dual e-axle alignment | 82 kWh structural battery pack, HV orange busbars |
| **Final Assembly** | `ASSEMBLY` | Hydraulic skateboard-to-chassis marriage lift | Cockpit harness, suspension, fascia, wheels, glass |
| **Quality & Inspection** | `QUALITY` | 4-wheel chassis dynamometer, laser metrology arch | Wheel alignment, regenerative braking, optical scan |

---

## 📐 2. Authoritative Capacity Formulation & OEE Decomposition

APEX-Twin enforces **strict industrial capacity accounting standards** aligned with ISO 22400-2:

### Core Formulations
$$\text{Gross Hours} = N_{\text{workstations}} \times T_{\text{shift}} \times S_{\text{shifts/day}}$$
$$\text{Net Hours} = \text{Gross Hours} - \left( T_{\text{break}} \times N_{\text{workstations}} \times S_{\text{shifts/day}} \right)$$
$$\text{Available Hours} = \max\left(0, \text{Net Hours} - T_{\text{downtime}}\right)$$

$$\text{Availability} = \frac{\text{Available Hours}}{\text{Net Hours}}, \quad \text{OEE} = \text{Availability} \times \eta_{\text{speed}} \times \text{FPY}$$

### Dual-Constraint Capacity Envelope
$$\text{Labour Potential} = N_{\text{workers}} \times (T_{\text{shift}} - T_{\text{break}}) \times \eta_{\text{efficiency}}$$
$$\text{Usable Capacity} = \min\left(\text{Available Machine Hours}, \text{Labour Potential Hours}\right) \times \text{OEE} \times \gamma_{\text{material}}$$

- If $\text{Labour Potential} < \text{Machine Hours}$, the line is classified as **`LABOUR_BOUND`**; otherwise **`MACHINE_BOUND`**.

---

## 🤖 3. Unified AI & Autonomous Intelligence Center

Accessible via **`🤖 AI & AUTONOMOUS INTELLIGENCE`** (`http://localhost:3000/agents`), APEX-Twin unifies predictive capacity MLOps and self-healing LLM agents into a **single closed-loop supervisor**:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        UNIFIED AI & AUTONOMOUS INTELLIGENCE                            │
├────────────────────────────────────────┬───────────────────────────────────────────────┤
│  LAYER 1: AUTONOMOUS CODING AGENTS     │  LAYER 2: PREDICTIVE CAPACITY MLOps           │
│  Engine: Qwen 2.5 Coder (7B / 32B)     │  Engine: LightGBM Quantile Regressors         │
│  Role: Self-Healing Code & QA Audit    │  Role: Throughput & Bottleneck Forecasting    │
└────────────────────────────────────────┴───────────────────────────────────────────────┘
                                         │
                         AUTOMATED SYNERGY CLOSED LOOP:
                                         │
    1. Sensor drift or variance spike occurs on the physical line
    2. Challenger Agent detects 'model_drift' finding via continuous audit probe
    3. Champion Agent automatically dispatches /api/models/retrain pipeline
    4. Evaluates new Challenger Model against production Champion on out-of-sample data
    5. Zero-downtime hot promotion if metrics improve; instant rollback if degraded
```

### The Check-and-Support Dual-Agent Loop

Neither agent is trusted blindly, and the `main` git branch is protected:

```
        ┌──────────────── every AGENT_INTERVAL_S ────────────────┐
        ▼                                                         │
 CHALLENGER: pytest + API Probes + Invariants + LLM Edge-Case Fuzzing
        │ findings (deduped by SHA1 fingerprint, saved to SQLite + JSONL)
        ▼
 CHAMPION: picks fix method -> proposes patch in isolated git worktree
        │ proposed diff (60 lines max)
        ▼
 CHALLENGER 7-GATE AUDIT (can OPPOSE):
        │   1. Scope (backend/app/ only; tests/config protected)
        │   2. Size (<= 60 lines)
        │   3. No Error Suppression / Test Skipping
        │   4. Target Issue Resolved (re-tested in worktree)
        │   5. Zero Regressions (all baseline tests still pass)
        │   6. Syntax & Ruff Lint Clean
        │   7. LLM Skeptical Senior Reviewer
        │
   approve ──> branch agent/fix-<id> (never merged to main)      oppose ──> objections fed back, retry (max 3x) ──> escalate to human
        │
        └── next cycle: Challenger re-verifies old fixes; regression => reopen + objection logged
```

### Dual-Tab Control Room Features (`http://localhost:3000/agents`)
- **Tab 1 — Autonomous Agents:** Live 4-step workflow diagram, findings table, gated fix branches, and real-time audit trail.
- **Tab 2 — Production MLOps:** Champion vs Challenger metrics ($P50, P75, P90$), sensor Data Drift Monitor with PSI scores, and 1-click promotion/rollback.

---

## 🛠️ 4. Quickstart & Local Execution

### Prerequisites
- Python 3.11+
- Node.js 18+ (Node 20+ recommended) & npm
- Git

### 1. Start Backend (FastAPI on Port 8000)
```bash
cd backend
python -m venv venv
source venv/bin/activate       # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Run migrations and start API
python -m app.db.seed
uvicorn app.main:app --port 8000 --host 0.0.0.0
```
*API docs available at `http://localhost:8000/docs`.*

### 2. Start Frontend (Next.js on Port 3000)
```bash
cd ../frontend
npm install
npm run build
npm start
```
*3D Digital Twin Control Room is live at `http://localhost:3000`.*

### 3. Run Autonomous Agents (CLI)
```bash
# Configure LLM (Local Ollama recommended)
ollama pull qwen2.5-coder:7b
export AGENT_LLM_BACKEND=ollama OLLAMA_MODEL=qwen2.5-coder:7b

# Run commands
python -m agents once               # 1 full test -> fix -> audit cycle
python -m agents loop               # Continuous background supervisor
python -m agents report             # Summary of runs, findings, and fixes
python -m agents tail               # Live activity stream
```

---

## 🧪 5. Automated Verification Suite

APEX-Twin is covered by rigorous engineering and multi-agent test suites:

```bash
# 1. Authoritative capacity math, OEE, simulation, and MLOps tests
pytest backend/tests -v

# 2. Multi-agent closed-loop check-and-support verification proof
pytest agents/tests -q
```

---

## 📜 6. Engineering Standards & Compliance

- **ISO 22400-2**: Key Performance Indicators for Manufacturing Operations Management (OEE, Net Productive Time).
- **Lean Manufacturing**: Takt time synchronization, buffer balance, and line starvation prevention.
- **MLOps Production Standards**: Chronological split validation, automated safety gates, and zero-downtime hot promotion.
- **Cybernetic Self-Healing**: Gated dual-agent loop enforcing deterministic constraints and isolated worktree sandboxing.

---

## 📄 7. License
Licensed under the **MIT License**.
