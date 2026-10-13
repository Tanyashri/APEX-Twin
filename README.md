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

## 🧪 4. Interactive Operational Scenario Simulator

The dashboard incorporates a test case switcher allowing plant directors and industrial engineers to stress-test factory resilience against four predefined industrial scenarios:

| Test Case | Scenario Title | Line Conditions & Stress Vectors | Automated Platform Response |
|:---:|---|---|---|
| **`TC-01`** | **Nominal Balanced Takt** | Line running at ideal 54s takt; 88% overall utilization; 38 active operators. | All 7 pods flag `NOMINAL`; zero buffer alarms; standard production schedule. |
| **`TC-02`** | **Critical Marriage Choke** | Chassis marriage station (`DEPT-ASSY`) spikes to 104% load, starving Quality. | Header beacon pulses red `CHOKE`; AI recommends 1-click `+2 Overtime Workers`. |
| **`TC-03`** | **Stamping Die Breakdown** | 2,500T hydraulic press suffers sudden tooling failure; output plummets to 52%. | Pod switches to amber `DEGRADED`; upstream starvation cascade warnings fire. |
| **`TC-04`** | **High-Demand EV Surge** | +35% volume spike in 82 kWh battery integration; line utilization reaches 94%. | Workforce dynamically scales to 45 technicians; triggers 3-shift recommendation. |

---

## 💻 5. Technical Architecture & Data Topology

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

## 🛠️ 6. Quickstart & Local Installation

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

## 🧪 7. Automated Verification Suite

APEX-Twin includes 39 unit, integration, and mathematical boundary tests:

```bash
pytest backend/tests -v
```

```text
backend/tests/test_capacity.py ....                                      [ 10%]
backend/tests/test_main.py .                                             [ 12%]
backend/tests/test_ml.py ....                                            [ 23%]
backend/tests/test_monitoring.py ...                                     [ 30%]
backend/tests/test_phase1.py ...                                         [ 38%]
backend/tests/test_planning_capacity_authoritative.py .....              [ 51%]
backend/tests/test_retraining_flow.py ......                             [ 66%]
backend/tests/test_scheduling.py ...                                     [ 74%]
backend/tests/test_simulation.py ..                                      [ 79%]
backend/tests/test_tracking.py ....                                      [ 89%]
backend/tests/test_workforce.py ....                                     [100%]

======================= 39 passed in 58.76s =======================
```

---

## 📜 8. Engineering Standards & Compliance

- **ISO 22400-2**: Key Performance Indicators for Manufacturing Operations Management (OEE, Availability, Net Productive Time).
- **Lean Manufacturing**: Takt time analysis, line balancing, and buffer starvation minimization.
- **MLOps Production Standards**: Continuous chronological holdout testing, champion-challenger registration, and audited model promotion.

---

## 📄 License
This project is licensed under the **MIT License** — open and accessible for advanced research and enterprise digital twin applications.
