# 🏎️ APEX-Twin: Cyber-Physical Automotive Digital Twin & Adaptive Capacity Engine

<p align="center">
  <strong>An Industry 4.0 Cyber-Physical Platform for Electric Vehicle (EV) Manufacturing Lines</strong><br>
  <em>Real-Time 3D Floor Telematics • Authoritative OEE Decomposition • Champion-Challenger LightGBM MLOps • Operational Scenario Simulator</em>
</p>

<p align="center">
  <a href="https://nextjs.org/"><img src="https://img.shields.io/badge/Next.js-16.4_Turbopack-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js" /></a>
  <a href="https://fastapi.tiangolo.com/"><img src="https://img.shields.io/badge/FastAPI-0.115_Async-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI" /></a>
  <a href="https://threejs.org/"><img src="https://img.shields.io/badge/Three.js-WebGL_3D-000000?style=for-the-badge&logo=threedotjs&logoColor=white" alt="Three.js" /></a>
  <a href="https://lightgbm.readthedocs.io/"><img src="https://img.shields.io/badge/LightGBM-Quantile_Regression-brightgreen?style=for-the-badge&logo=scikitlearn&logoColor=white" alt="LightGBM" /></a>
  <a href="https://www.python.org/"><img src="https://img.shields.io/badge/Python-3.11_Typed-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python" /></a>
  <a href="https://pytest.org/"><img src="https://img.shields.io/badge/Pytest-39%2F39_Passed-76FF03?style=for-the-badge&logo=pytest&logoColor=black" alt="Tests" /></a>
</p>

---

## 📌 Executive Summary

Modern automotive assembly lines face high stochastic variance: micro-stoppages on high-tonnage stamping dies, thermal drift during robotic BIW welding, cell-balancing bottlenecks in 800V skateboard battery packs, and operator absenteeism. Classical MES (Manufacturing Execution Systems) report lagging telemetry after bottlenecks have already propagated upstream and starved downstream stations.

**APEX-Twin** (**A**utomotive **P**roduction **E**xecution & e**X**treme Capacity Digital **Twin**) is a high-fidelity cyber-physical simulation and decision intelligence platform. It fuses **authoritative industrial engineering decomposition** ($OEE = Availability \times Performance \times Quality$) with a **Champion-Challenger LightGBM quantile regression pipeline** ($P50, P75, P90$) to detect buffer starvation and line choke hours before physical lines stall.

---

## 🏭 1. The 7-Department Automotive Manufacturing Network

APEX-Twin models the end-to-end takt sequence of an electric passenger vehicle across seven interconnected production cells:

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

| Department | Identifier | Automation & Machinery | Manufacturing Scope & BOM Focus |
|---|:---:|---|---|
| **Materials & Logistics** | `LOGISTICS` | High-density automated staging, AGV tuggers | Raw steel coils, sub-assembly buffers, lithium-ion cell packs |
| **High-Tonnage Stamping** | `STAMPING` | 2,500T hydraulic transfer press, uncoiler | Outer hood panels, quarter panels, structural pillars (A/B/C) |
| **Robotic BIW Welding** | `WELDING` | Dual 6-axis articulating welding robots | Unibody monocoque framing, spot & laser arc seam welding |
| **Paint & Surface** | `PAINT` | Pressurized cleanroom, rotary bell atomizers | Cathodic electrodeposition (e-coat), primer, ceramic clearcoat |
| **Powertrain Integration**| `POWERTRAIN`| High-voltage cell marriage, dual e-axles | 82 kWh structural skateboard pack, inverter, HV orange busbars |
| **Final Assembly** | `ASSEMBLY` | Hydraulic chassis marriage station | Cockpit harness, suspension, front/rear fascia, wheels, glass |
| **Quality & Inspection** | `QUALITY` | 4-wheel chassis dynamometer, laser arch | Wheel alignment, regenerative brake calibration, optical metrology |

---

## 📐 2. Authoritative Capacity Formulation & OEE Decomposition

Unlike simplistic dashboards that estimate throughput via averages, APEX-Twin enforces **strict industrial capacity accounting standards** (aligned with ISO 22400-2):

### Theoretical to Usable Hours Decomposition
$$\text{Gross Available WS Hours} = N_{\text{workstations}} \times T_{\text{shift}} \times S_{\text{shifts/day}}$$

$$\text{Net Workstation Hours} = \text{Gross Hours} - \left( T_{\text{break}} \times N_{\text{workstations}} \times S_{\text{shifts/day}} \right)$$

$$\text{Available Machine Hours} = \max\left(0, \text{Net Hours} - T_{\text{downtime}}\right)$$

### ISO Overall Equipment Effectiveness (OEE)
$$\text{Availability} = \frac{\text{Available Machine Hours}}{\text{Net Hours}}$$

$$\text{OEE} = \text{Availability} \times \eta_{\text{machine speed}} \times \text{First Pass Yield (FPY)}$$

### Dual-Constraint Capacity Envelope
Capacity is constrained simultaneously by mechanical availability, operator rosters, and raw material buffer shares:
$$\text{Labour Potential Hours} = N_{\text{workers}} \times (T_{\text{shift}} - T_{\text{break}}) \times \eta_{\text{worker efficiency}}$$

$$\text{Usable Capacity Hours} = \min\left(\text{Available Machine Hours}, \text{Labour Potential Hours}\right) \times \text{OEE} \times \gamma_{\text{material on-hand}}$$

- **Dynamic Binding Constraint Identification**: If $\text{Labour Potential} < \text{Machine Hours}$, the platform automatically classifies the line as **`LABOUR_BOUND`**; otherwise, it flags **`MACHINE_BOUND`**.

---

## 🤖 3. Production MLOps: Quantile Regression & Safety Governance

APEX-Twin rejects naive deterministic point estimates. Automotive manufacturing cycle times exhibit heavy right-skewed tails caused by micro-stops and tool wear.

```
       CHRONOLOGICAL SPLIT (ZERO TIME-TRAVEL LEAKAGE)
┌───────────────────────────┬───────────────┬───────────────┐
│     TRAIN SET (70%)       │   VAL (15%)   │ TEST HOLDOUT  │
│  LightGBM P50, P75, P90   │ Early-Stopping│ Out-of-Sample │
└───────────────────────────┴───────────────┴───────────────┘
                                                    │
                                                    ▼
                                    ┌───────────────────────────────┐
                                    │    AUTOMATED SAFETY GATE      │
                                    │  • Regression on Overload?    │
                                    │  • Choke Station Degradation? │
                                    └───────┬───────────────┬───────┘
                             REJECT         │               │ APPROVED
                       ┌────────────────────┘               └───────────────────┐
                       ▼                                                        ▼
              Retain Old Champion                                       Promote Challenger
              (Flag in Audit Log)                                       (1-Click Rollback)
```

### Quantile Loss Formulation
The model optimizes the pinball loss function across target quantiles $\alpha \in \{0.50, 0.75, 0.90\}$:
$$\mathcal{L}_\alpha(y, \hat{y}) = \max\left(\alpha (y - \hat{y}), (1 - \alpha)(\hat{y} - y)\right)$$
- **$P50$ (Median):** Expected operational takt under standard nominal conditions.
- **$P75$ (Conservative):** Upper threshold accounting for standard tool degradation.
- **$P90$ (High-Confidence Boundary):** Tail-risk forecast used for proactive overtime dispatching before buffer starvation occurs.

### Safety Evaluation & Model Promotion Gates
- **Chronological Split Validation:** Eliminates look-ahead bias by enforcing strict timestamp ordering.
- **Safety Gate Verification:** Challenger models are evaluated against the active Champion on out-of-sample holdout test data. If the Challenger exhibits error regression on **Overload segments** or within critical bottleneck departments (e.g. `ASSEMBLY`), promotion is automatically blocked.
- **Single-Call Rollback:** Active models can be immediately reverted to the prior production Champion with an audit-logged rollback endpoint.

---

## ⚙️ 4. Department Machinery Fleet & Workstation Specifications

Every department features dedicated industrial machinery with real-time operational telemetry, live utilization tracking, predictive health metrics, and automated PLC synchronization:

| Department | Machine Identifier | Machinery Description & Architecture | Real-Time Operating Parameter |
|---|:---:|---|---|
| **Stamping** | `M-STMP-01` | Schuler 2,500T Hydraulic Tandem Transfer Press | Die Clamping Force: **24,800 kN** (12 strokes/min) |
| **Stamping** | `M-STMP-02` | High-Speed Sheet Decoiler & Precision Roller Leveler | Feed Rate: **42 m/min** (Strip width 1,600mm) |
| **Stamping** | `M-STMP-03` | Trumpf TruLaser 12kW CNC 3D Blanking & Piercing Cell | Fiber Laser Power: **11.8 kW** (Focus: 0.12mm) |
| **Welding** | `M-WELD-01` | Unibody Framing Main Geometrical Fixture (Gate Cell) | Hydraulic Clamping: **±0.035 mm** repeatability |
| **Welding** | `M-WELD-02` | Fanuc R-2000iC/210F 6-Axis Spot-Welding Robot Alpha | Weld Current: **14.2 kA** / Tip Force: **4.2 kN** |
| **Welding** | `M-WELD-04` | Trumpf TruDisk 8001 Fiber Laser Roof-Brazing Cell | Beam Power: **7.8 kW** / Seam Speed: **4.2 m/min** |
| **Paint** | `M-PNT-01` | Cathodic Electrocoat (E-Coat) RoDip Immersion Tank | Bath Temp: **28.5°C** / Voltage: **315 V DC** |
| **Paint** | `M-PNT-02` | Dürr EcoBell3 High-Speed Rotary Atomizer Array | Turbine Speed: **55,000 RPM** / Flow: **420 ml/min** |
| **Paint** | `M-PNT-04` | Convection & Catalytic Infrared Curing Bake Tunnel | Zone Temperature: **142°C** (Zone 3/4) |
| **Powertrain**| `M-PWR-01` | 82 kWh Structural Battery Skateboard Assembly Jig | Insulation Resistance: **780 MΩ** (>500 required) |
| **Powertrain**| `M-PWR-02` | High-Voltage Busbar Multi-Spindle Electric Torquer | Applied Torque: **9.8 Nm ± 0.1** (Angle: 90°) |
| **Powertrain**| `M-PWR-03` | CNC Liquid Thermal Interface Material (TIM) Dispenser | Bead Volume: **1,240 ml** (Pressure: 120 bar) |
| **Assembly** | `M-ASY-01` | Heavy-Duty Skateboard-to-Chassis Marriage Lift | Lift Stroke: **1,850 mm** (Synchronized Dual-Column) |
| **Assembly** | `M-ASY-02` | Atlas Copco 5-Spindle Automated Wheel Lug Nut Torquer | Fastener Torque: **140 Nm ± 1.2** (Simultaneous 5-Spindle) |
| **Assembly** | `M-ASY-03` | Robotic Windshield & Panoramic Glass Polyurethane Applicator | Bead Height: **11.8 mm** / Width: **8.5 mm** |
| **Quality** | `M-QA-01` | 4-Wheel High-Speed Chassis Dynamometer Roller Bench | Max Speed: **135 km/h** / Regen: **48 kW** |
| **Quality** | `M-QA-02` | Laser 3D Optical 4-Wheel Steering & Toe/Camber Rig | Toe-in: **+0.02°** / Camber: **-0.48°** (Pass) |
| **Quality** | `M-QA-04` | High-Pressure Monsoon Water Ingress Chamber (IPX9K) | Water Pressure: **15.2 bar** (Flow: 650 L/min) |
| **Logistics** | `M-LOG-01` | Automated Guided Vehicle (AGV) Heavy Tugger Fleet Alpha | LiDAR Navigation (Battery: **88%**, Speed: **1.8 m/s**) |

---

## ⏱️ 5. Live Part Manufacturing Process Tracker

In addition to static Bill of Materials (BOM) reporting, APEX-Twin provides **real-time component process tracking** for every active part:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│  LIVE COMPONENT TRACKER: STP-HOOD-01 (Aluminum Engine Hood Outer Skin)                 │
│  Target VIN: VIN-2026-X80-0042  •  Lot: LOT-STMP-2026-A  •  Qty: 48 Units             │
├────────────────────────────────────────────────────────────────────────────────────────┤
│  Live Cycle Meter: [████████████████████░░░░░░░░░] 28s / 54s Takt Cycle (52%)         │
│  Active Workstation: Schuler 2,500T Hydraulic Transfer Press (M-STMP-01)               │
│  Station Operator: T. Vance (Master Die Setter)                                        │
│  In-Line Metrology: Clamping 24,800 kN • Temp 64.5°C • Tolerance ±0.02mm (PASS ✓)     │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

- **Sequential 5-Station Process Lineage:**
  Tracks the exact step-by-step station progression for any component:
  1. `STEP 01: Raw Coil Decoiling & Sheet Blanking` ➔ **COMPLETED (12s)**
  2. `STEP 02: 2,500T Deep Draw Forming` ➔ **COMPLETED (24s)**
  3. `STEP 03: CNC Laser Trimming & Flanging` ➔ **ACTIVE IN PROGRESS (⚡ Live Ticking Counter)**
  4. `STEP 04: In-Line Optical Metrology & CMM Laser Scan` ➔ **QUEUED (14s)**
  5. `STEP 05: Automated AGV Staging to BIW Welding Gate` ➔ **QUEUED (20s)**
- **Real-Time Takt Progress Gauge:** Animated gradient progress bar updating live every second to model sub-minute takt execution.
- **One-Click Part Switcher:** Operators can click `[TRACK LIVE ⚡]` on any BOM part or use the component selector dropdown to switch tracking contexts instantaneously.

---

## 🧪 6. Interactive Operational Scenario Simulator

The dashboard incorporates a test case switcher allowing plant directors and industrial engineers to stress-test factory resilience against four predefined industrial scenarios:

| Test Case | Scenario Title | Line Conditions & Stress Vectors | Automated Platform Response |
|:---:|---|---|---|
| **`TC-01`** | **Nominal Balanced Takt** | Line running at ideal 54s takt; 88% overall utilization; 38 active operators. | All 7 pods flag `NOMINAL`; zero buffer alarms; standard production schedule. |
| **`TC-02`** | **Critical Marriage Choke** | Chassis marriage station (`DEPT-ASSY`) spikes to 104% load, starving Quality. | Header beacon pulses red `CHOKE`; AI recommends 1-click `+2 Overtime Workers`. |
| **`TC-03`** | **Stamping Die Breakdown** | 2,500T hydraulic press suffers sudden tooling failure; output plummets to 52%. | Pod switches to amber `DEGRADED`; upstream starvation cascade warnings fire. |
| **`TC-04`** | **High-Demand EV Surge** | +35% volume spike in 82 kWh battery integration; line utilization reaches 94%. | Workforce dynamically scales to 45 technicians; triggers 3-shift recommendation. |

---

## 💻 7. Technical Architecture & Data Topology

```
                                  BROWSER CLIENT
          ┌─────────────────────────────────────────────────────────────┐
          │  Next.js 16.4 (App Router) + React Three Fiber + Three.js   │
          │  • 3D Factory Scene & Particle Physics                      │
          │  • Responsive SVG Time-Series Telemetry Charts              │
          │  • Dark / Light Industrial Control Room Theming             │
          └──────────────────────────────┬──────────────────────────────┘
                                         │ Reverse Proxy (:3000 -> :8000)
                                         ▼
                                  FASTAPI BACKEND
          ┌─────────────────────────────────────────────────────────────┐
          │  Uvicorn Asynchronous Service (Python 3.11)                 │
          │  • Authoritative Capacity Engine (Gross, Net, OEE, Usable)  │
          │  • Real-Time Trend & Telemetry Endpoints                    │
          │  • Parameter Validation & Audit Engine                      │
          └───────────────────┬─────────────────────────┬───────────────┘
                              │                         │
                              ▼                         ▼
                   PERSISTENCE LAYER (SQLITE)    MLOPS WORKER SUBSYSTEM
               ┌──────────────────────────────┐ ┌──────────────────────────────┐
               │ • ConfigThresholds           │ │ • LightGBM Multi-Quantile    │
               │ • ShiftTemplates             │ │ • Chronological Holdouts     │
               │ • PlanningAuditLog           │ │ • Model Artifact Registry    │
               │ • ModelPromotionAudit        │ │ • Automated Safety Gates     │
               └──────────────────────────────┘ └──────────────────────────────┘
```

---

## 🛠️ 8. Quickstart & Local Installation

### Prerequisites
- **Python:** 3.11+
- **Node.js:** 18+ (Node 20+ recommended) & npm
- **Git**

### 1. Clone the Repository
```bash
git clone https://github.com/Tanyashri/APEX-Twin.git
cd APEX-Twin
```

### 2. Backend Initialization
```bash
cd backend
python -m venv venv

# On Linux/macOS:
source venv/bin/activate
# On Windows:
venv\Scripts\activate

pip install -r requirements.txt

# Run migrations and seed baseline automotive catalog
python -m app.db.seed

# Start FastAPI server
uvicorn app.main:app --port 8000 --host 0.0.0.0
```
*Interactive Swagger API documentation is available at `http://localhost:8000/docs`.*

### 3. Frontend Initialization
```bash
cd ../frontend
npm install
npm run build
npm start
# For live hot-reloading development: npm run dev
```
*The digital twin control room is live at `http://localhost:3000`.*

---

---

## 🤖 9. Unified AI & Autonomous Intelligence Center

APEX-Twin features a unified **Cyber-Physical Intelligence Architecture** accessible via **`🤖 AI & AUTONOMOUS INTELLIGENCE`** (`http://localhost:3000/agents`). Rather than treating predictive forecasting and autonomous code repair as isolated silos, the platform unifies them into a **closed-loop cybernetic supervisor**:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        UNIFIED AI & AUTONOMOUS INTELLIGENCE                            │
├────────────────────────────────────────┬───────────────────────────────────────────────┤
│  LAYER 1: AUTONOMOUS CODING AGENTS     │  LAYER 2: PREDICTIVE CAPACITY MLOps           │
│  Engine: Qwen 2.5 Coder (7B / 32B)     │  Engine: LightGBM Quantile Regressors         │
│  Role: Self-Healing Software & QA Audit│  Role: Throughput & Bottleneck Forecasting    │
└────────────────────────────────────────┴───────────────────────────────────────────────┘
                                         │
                         AUTOMATED SYNERGY CLOSED LOOP:
                                         │
    1. Sensor drift or variance spike occurs on the physical assembly line
    2. Challenger Agent detects 'model_drift' finding via continuous audit probe
    3. Champion Agent automatically dispatches /api/models/retrain pipeline
    4. Evaluates new Challenger Model against production Champion on out-of-sample data
    5. Zero-downtime hot promotion if metrics improve; instant rollback if degraded
```

### The Check-and-Support Supervisor Loop (Challenger & Champion)

The dual-agent coding loop ensures neither agent is trusted blindly, and the `main` branch is protected from direct modification:

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

- **Tab 1 — Autonomous Agents (Challenger & Champion):**
  - Interactive 4-step workflow architecture diagram.
  - Live system findings table with test IDs, severity, and fingerprint deduplication.
  - Gated fix branches table tracking isolated worktree diffs.
  - Real-time audit log stream (`activity.jsonl`).
  - Interactive "Trigger Agent Cycle" dispatch button.

- **Tab 2 — Production MLOps Forecasting & Retraining:**
  - Production Champion vs Challenger model card with $P50, P75, P90$ metrics.
  - Real-time sensor Data Drift Monitor with PSI feature scores.
  - Automated retrain job execution terminal, Challenger promotion, and rollback controls.
  - Chronological model registry history table.
  *(Note: Visiting `/models/retraining` automatically opens this view with the MLOps tab pre-selected).*

### Agent Setup & Playbook

#### One-Time Setup
```bash
# Install dependencies
pip install -r backend/requirements.txt

# Option A: Local LLM via Ollama (Recommended)
ollama pull qwen2.5-coder:7b
export AGENT_LLM_BACKEND=ollama
export OLLAMA_MODEL=qwen2.5-coder:7b

# Option B: Hugging Face Inference API
pip install huggingface_hub
export AGENT_LLM_BACKEND=hf
export HF_TOKEN=hf_your_token_here
export HF_MODEL=Qwen/Qwen2.5-Coder-32B-Instruct
```

#### CLI Operations
```bash
# Run one full test -> fix -> audit cycle
python -m agents once

# Run continuous background monitoring loop
python -m agents loop

# View recent runs, detected findings, and gated fixes
python -m agents report

# Tail live activity log stream in real time
python -m agents tail

# Run end-to-end multi-agent verification suite (with scripted mock LLM)
python -m pytest agents/tests -q
```

### Reviewing and Merging an Approved Fix
When the Challenger approves a patch, it commits the fix to an isolated branch `agent/fix-<id>`. To inspect and merge:
```bash
# Inspect patch against main
git diff main..agent/fix-1

# Merge to main when verified
git merge agent/fix-1
```

---

## 🧪 10. Automated Verification Suite

APEX-Twin includes unit, integration, mathematical boundary, and multi-agent test suites:

```bash
# Run backend authoritative engineering & model tests
pytest backend/tests -v

# Run autonomous agent check-and-support loop proof
pytest agents/tests -q
```

---

## 📜 11. Engineering Standards & Compliance

- **ISO 22400-2**: Key Performance Indicators for Manufacturing Operations Management (OEE, Availability, Net Productive Time).
- **Lean Manufacturing**: Takt time analysis, line balancing, and buffer starvation minimization.
- **MLOps Production Standards**: Continuous chronological holdout testing, champion-challenger registration, and audited model promotion.
- **Cybernetic Self-Healing**: Gated dual-agent architecture enforcing deterministic constraints and isolated worktree sandboxing.

---

## 📄 12. License
This project is licensed under the **MIT License** — open and accessible for advanced research and enterprise digital twin applications.

