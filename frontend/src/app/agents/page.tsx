"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import "../globals.css";

// --- Types: Autonomous Agents ---
interface AgentStatus {
  status: string;
  running_cycle: boolean;
  llm_backend: string;
  ollama_model: string;
  hf_model: string;
  total_runs: number;
  open_findings: number;
  total_findings: number;
  approved_fixes: number;
  total_fixes: number;
  last_run: {
    id: number;
    started: number;
    finished?: number;
    actor: string;
    kind: string;
    status: string;
    summary: string;
  } | null;
  last_cycle_result?: any;
  last_cycle_error?: string | null;
}

interface Finding {
  id: number;
  run_id: number;
  ts: number;
  fingerprint: string;
  kind: string;
  severity: string;
  title: string;
  detail: string;
  file?: string;
  test_id?: string;
  status: string;
  attempts: number;
}

interface Fix {
  id: number;
  finding_id: number;
  attempt: number;
  ts: number;
  method: string;
  branch: string;
  diff: string;
  status: string;
  verdict: string;
}

interface ActivityEvent {
  id: number;
  ts: number;
  actor: string;
  event: string;
  payload?: any;
}

// --- Types: MLOps Forecasting & Retraining ---
interface ModelMetrics {
  mae?: number;
  rmse?: number;
  wape?: number;
  p75_coverage?: number;
  p90_coverage?: number;
  beats_baseline?: boolean;
}

interface ChampionInfo {
  version: string;
  role: string;
  status: string;
  trained_at: string;
  dataset_version: string;
  forecast_horizon: string;
  model_type: string;
  config: Record<string, unknown>;
  metrics: ModelMetrics;
}

interface ChallengerInfo {
  version: string;
  role: string;
  ready_for_promotion: boolean;
  metrics: ModelMetrics;
  created_at: string;
  dataset_version?: string;
}

interface RunRecord {
  run_id: string;
  status: string;
  trigger_type: string;
  dataset_version: string;
  num_samples: number;
  duration_s: number | null;
  metrics: ModelMetrics | null;
  created_at: string;
  error?: string | null;
  mlflow_run_id?: string | null;
}

interface DriftInfo {
  coverage_p75?: number;
  coverage_p90?: number;
  drift_detected?: boolean;
  psi_scores?: Record<string, number>;
  recommend_retrain?: boolean;
}

export default function UnifiedAIAgentsPage({ defaultTab = "agents" }: { defaultTab?: "agents" | "mlops" }) {
  const [activeTab, setActiveTab] = useState<"agents" | "mlops">(defaultTab);
  const [timeStr, setTimeStr] = useState("--:--:--");
  const [isLightMode, setIsLightMode] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("hal-theme") === "light";
    }
    return false;
  });

  // --- Agents State ---
  const [agentStatus, setAgentStatus] = useState<AgentStatus | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [fixes, setFixes] = useState<Fix[]>([]);
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null);
  const [isTriggeringAgent, setIsTriggeringAgent] = useState(false);
  const [agentActionMsg, setAgentActionMsg] = useState<{ text: string; type: "ok" | "err" } | null>(null);

  // --- MLOps State ---
  const [champion, setChampion] = useState<ChampionInfo | null>(null);
  const [challenger, setChallenger] = useState<ChallengerInfo | null>(null);
  const [history, setHistory] = useState<RunRecord[]>([]);
  const [drift, setDrift] = useState<DriftInfo | null>(null);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<string | null>(null);
  const [jobLogs, setJobLogs] = useState<string>("");
  const [jobDuration, setJobDuration] = useState<number | null>(null);
  const [mlopsError, setMlopsError] = useState<string | null>(null);
  const [mlopsSuccess, setMlopsSuccess] = useState<string | null>(null);
  const [isSubmittingMlops, setIsSubmittingMlops] = useState(false);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const jobPollRef = useRef<NodeJS.Timeout | null>(null);

  // Sync theme and timer
  useEffect(() => {
    const t = setInterval(() => setTimeStr(new Date().toLocaleTimeString()), 1000);
    const saved = localStorage.getItem("hal-theme");
    if (saved === "light") {
      document.body.classList.add("light-mode");
    }
    return () => clearInterval(t);
  }, []);

  const toggleTheme = () => {
    setIsLightMode((prev) => {
      const next = !prev;
      if (next) {
        document.body.classList.add("light-mode");
        localStorage.setItem("hal-theme", "light");
      } else {
        document.body.classList.remove("light-mode");
        localStorage.setItem("hal-theme", "dark");
      }
      return next;
    });
  };

  // Fetch Agents Data
  const fetchAgentsData = async () => {
    try {
      const [resStatus, resFind, resFix, resAct] = await Promise.all([
        fetch("http://127.0.0.1:8000/api/agents/status").then((r) => r.json()).catch(() => null),
        fetch("http://127.0.0.1:8000/api/agents/findings").then((r) => r.json()).catch(() => []),
        fetch("http://127.0.0.1:8000/api/agents/fixes").then((r) => r.json()).catch(() => []),
        fetch("http://127.0.0.1:8000/api/agents/activity").then((r) => r.json()).catch(() => []),
      ]);
      if (resStatus) setAgentStatus(resStatus);
      if (Array.isArray(resFind)) setFindings(resFind);
      if (Array.isArray(resFix)) setFixes(resFix);
      if (Array.isArray(resAct)) setActivities(resAct);
    } catch {
      // offline
    }
  };

  // Fetch MLOps Data
  const fetchMlopsData = React.useCallback(async () => {
    try {
      const [champRes, challRes, histRes, driftRes] = await Promise.all([
        fetch("http://127.0.0.1:8000/api/models/champion"),
        fetch("http://127.0.0.1:8000/api/models/challenger"),
        fetch("http://127.0.0.1:8000/api/models/history"),
        fetch("http://127.0.0.1:8000/api/models/drift"),
      ]);
      if (champRes.ok) setChampion(await champRes.json());
      if (challRes.ok) {
        const chData = await challRes.json();
        setChallenger(chData.challenger !== null && chData.version ? chData : null);
      }
      if (histRes.ok) setHistory(await histRes.json());
      if (driftRes.ok) setDrift(await driftRes.json());
    } catch {
      // offline
    }
  }, []);

  // Poll MLOps Job
  const startPollingJob = React.useCallback(
    (jobId: string) => {
      if (jobPollRef.current) clearInterval(jobPollRef.current);
      jobPollRef.current = setInterval(async () => {
        try {
          const res = await fetch(`http://127.0.0.1:8000/api/models/jobs/${jobId}`);
          if (!res.ok) return;
          const data = await res.json();
          setJobStatus(data.status);
          setJobLogs(data.logs || "");
          if (data.duration_s) setJobDuration(data.duration_s);

          if (data.status === "SUCCEEDED" || data.status === "FAILED") {
            if (jobPollRef.current) clearInterval(jobPollRef.current);
            localStorage.removeItem("hal-retraining-job");
            fetchMlopsData();
            if (data.status === "SUCCEEDED") {
              setMlopsSuccess(`Retraining Job ${jobId} succeeded! Challenger model evaluated.`);
            } else {
              setMlopsError(`Job ${jobId} failed: ${data.error || "Unknown error"}`);
            }
          }
        } catch (e) {
          console.error("Error polling job status:", e);
        }
      }, 1500);
    },
    [fetchMlopsData]
  );

  useEffect(() => {
    fetchAgentsData();
    fetchMlopsData();
    const savedJob = localStorage.getItem("hal-retraining-job");
    if (savedJob) {
      setActiveJobId(savedJob);
      startPollingJob(savedJob);
    }

    pollIntervalRef.current = setInterval(() => {
      fetchAgentsData();
      fetchMlopsData();
    }, 4000);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (jobPollRef.current) clearInterval(jobPollRef.current);
    };
  }, [fetchMlopsData, startPollingJob]);

  // Handlers: Agents
  const handleTriggerAgentCycle = async () => {
    setIsTriggeringAgent(true);
    setAgentActionMsg(null);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/agents/cycle", { method: "POST" });
      const data = await res.json();
      setAgentActionMsg({ text: data.message || "Cycle dispatched", type: "ok" });
      fetchAgentsData();
    } catch (err: any) {
      setAgentActionMsg({ text: "Failed to trigger cycle: " + err.message, type: "err" });
    } finally {
      setIsTriggeringAgent(false);
    }
  };

  // Handlers: MLOps
  const handleTriggerRetrain = async () => {
    setMlopsError(null);
    setMlopsSuccess(null);
    setIsSubmittingMlops(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/models/retrain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trigger_type: "MANUAL" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMlopsError(data.detail || "Retraining request failed");
        return;
      }
      setActiveJobId(data.job_id);
      setJobStatus("QUEUED");
      setJobLogs(`[${new Date().toLocaleTimeString()}] Retraining job queued...`);
      localStorage.setItem("hal-retraining-job", data.job_id);
      startPollingJob(data.job_id);
    } catch (e: any) {
      setMlopsError(e.message || "Network error");
    } finally {
      setIsSubmittingMlops(false);
    }
  };

  const handlePromoteChallenger = async () => {
    if (!challenger) return;
    setMlopsError(null);
    setMlopsSuccess(null);
    setIsSubmittingMlops(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/models/promote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challenger_id: challenger.version,
          actor: "supervisor",
          reason: "Manually promoted following out-of-sample evaluation",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMlopsError(data.detail || "Promotion failed");
      } else {
        setMlopsSuccess(`Challenger ${challenger.version} promoted to production CHAMPION.`);
        await fetchMlopsData();
      }
    } catch (e: any) {
      setMlopsError(e.message || "Network error");
    } finally {
      setIsSubmittingMlops(false);
    }
  };

  const handleRollbackModel = async () => {
    setMlopsError(null);
    setMlopsSuccess(null);
    setIsSubmittingMlops(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/models/rollback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actor: "supervisor",
          reason: "Rolled back to previous verified production champion",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMlopsError(data.detail || "Rollback failed");
      } else {
        setMlopsSuccess(`Rolled back! Active champion is now ${data.active_champion}.`);
        await fetchMlopsData();
      }
    } catch (e: any) {
      setMlopsError(e.message || "Network error");
    } finally {
      setIsSubmittingMlops(false);
    }
  };

  const accent = isLightMode ? "#0070f3" : "#00e5ff";
  const accentGreen = isLightMode ? "#16a34a" : "#76ff03";
  const accentWarn = isLightMode ? "#d97706" : "#ff9100";
  const textMuted = isLightMode ? "#64748b" : "#94a3b8";
  const borderCol = isLightMode ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.08)";

  const fmtPct = (val?: number) => (val !== undefined ? `${(val * 100).toFixed(1)}%` : "--");
  const fmtNum = (val?: number) => (val !== undefined ? val.toFixed(4) : "--");

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)", paddingBottom: 60 }}>
      {/* TOPBAR */}
      <header className="topbar">
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div className="logo">
            APEX <span>//</span> AI &amp; AUTONOMOUS INTELLIGENCE
          </div>
          <span style={{ fontSize: 10, color: textMuted, fontFamily: "var(--font-mono)", letterSpacing: 1 }}>
            UNIFIED DUAL-LAYER CONTROL ROOM
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={toggleTheme}
            className="req-btn"
            style={{ padding: "4px 8px", fontSize: 10 }}
            title="Toggle Light/Dark Theme"
          >
            {isLightMode ? "🌙 DARK" : "☀️ LIGHT"}
          </button>

          <div className="status-pill">
            <div className={`status-dot ${agentStatus?.running_cycle || activeJobId ? "warn" : "healthy"}`} />
            <span>
              {agentStatus?.running_cycle
                ? "AGENT CYCLE RUNNING"
                : activeJobId
                ? "RETRAINING IN PROGRESS"
                : `CHAMPION MODEL ${champion?.version || "v1.0"} // AGENTS ARMED`}
            </span>
          </div>

          <Link href="/" className="req-btn" style={{ padding: "4px 10px", fontSize: 9, textDecoration: "none" }}>
            ← 3D DIGITAL TWIN
          </Link>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main style={{ maxWidth: 1400, margin: "64px auto 0 auto", padding: "0 24px" }}>
        {/* UNIFIED SYNTHESIS ARCHITECTURE BANNER */}
        <div
          className="dept-modal-card"
          style={{
            padding: "14px 20px",
            marginBottom: 20,
            background: isLightMode ? "linear-gradient(90deg, #f0fdf4 0%, #eef2ff 100%)" : "linear-gradient(90deg, rgba(118,255,3,0.06) 0%, rgba(0,229,255,0.06) 100%)",
            border: `1px solid ${borderCol}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div>
            <div style={{ fontSize: 11, fontWeight: "bold", color: accent, letterSpacing: 1 }}>
              ⚡ CYBER-PHYSICAL SYNERGY // CLOSED-LOOP AUTOMATION
            </div>
            <div style={{ fontSize: 10, color: textMuted, marginTop: 4, lineHeight: 1.4 }}>
              <strong>Layer 1 (LLM Coding Agents):</strong> Qwen 2.5 Coder audits code, tests simulation bounds, and gates worktree patches.&nbsp;|&nbsp;
              <strong>Layer 2 (Predictive MLOps):</strong> LightGBM Quantile Regressors estimate capacity ($P50, P75, P90$).<br />
              <strong>Integration Loop:</strong> When telemetry drift occurs, Challenger Agent detects <code>model_drift</code> and signals Champion Agent to dispatch <code>/api/models/retrain</code> automatically.
            </div>
          </div>

          {/* TAB SWITCHER */}
          <div style={{ display: "flex", gap: 6, background: isLightMode ? "#e2e8f0" : "rgba(0,0,0,0.4)", padding: 4, borderRadius: 8 }}>
            <button
              onClick={() => setActiveTab("agents")}
              style={{
                border: "none",
                background: activeTab === "agents" ? accent : "transparent",
                color: activeTab === "agents" ? "#000" : textMuted,
                padding: "8px 14px",
                borderRadius: 6,
                fontSize: 11,
                fontWeight: "bold",
                cursor: "pointer",
                fontFamily: "var(--font-mono)",
                transition: "all 0.2s",
              }}
            >
              🤖 AUTONOMOUS AGENTS ({agentStatus?.open_findings || 0} Findings)
            </button>
            <button
              onClick={() => setActiveTab("mlops")}
              style={{
                border: "none",
                background: activeTab === "mlops" ? accentGreen : "transparent",
                color: activeTab === "mlops" ? "#000" : textMuted,
                padding: "8px 14px",
                borderRadius: 6,
                fontSize: 11,
                fontWeight: "bold",
                cursor: "pointer",
                fontFamily: "var(--font-mono)",
                transition: "all 0.2s",
              }}
            >
              📈 MLOps FORECASTING &amp; RETRAINING ({champion?.version || "v1.0"})
            </button>
          </div>
        </div>

        {/* =========================================================================
            TAB 1: AUTONOMOUS AGENTS (CHALLENGER & CHAMPION)
        ========================================================================= */}
        {activeTab === "agents" && (
          <div>
            {/* STATS STRIP */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
                gap: 12,
                marginBottom: 20,
              }}
            >
              <div className="dept-modal-card" style={{ padding: 14 }}>
                <div style={{ fontSize: 9, color: textMuted, letterSpacing: 1 }}>ACTIVE LLM ENGINE</div>
                <div style={{ fontSize: 16, fontWeight: "bold", color: accent, marginTop: 4, fontFamily: "var(--font-mono)" }}>
                  {agentStatus?.llm_backend === "ollama" ? "Ollama (Local)" : agentStatus?.llm_backend === "hf" ? "Hugging Face" : "Configured"}
                </div>
                <div style={{ fontSize: 10, color: textMuted, marginTop: 2 }}>
                  {agentStatus?.ollama_model || "qwen2.5-coder:7b"}
                </div>
              </div>

              <div className="dept-modal-card" style={{ padding: 14 }}>
                <div style={{ fontSize: 9, color: textMuted, letterSpacing: 1 }}>CHALLENGER TEST RUNS</div>
                <div style={{ fontSize: 16, fontWeight: "bold", color: "var(--text)", marginTop: 4, fontFamily: "var(--font-mono)" }}>
                  {agentStatus?.total_runs || 0} Runs Completed
                </div>
                <div style={{ fontSize: 10, color: accentGreen, marginTop: 2 }}>
                  pytest · API Probes · Invariants · Fuzzing
                </div>
              </div>

              <div className="dept-modal-card" style={{ padding: 14 }}>
                <div style={{ fontSize: 9, color: textMuted, letterSpacing: 1 }}>SYSTEM FINDINGS</div>
                <div style={{ fontSize: 16, fontWeight: "bold", color: agentStatus?.open_findings ? accentWarn : accentGreen, marginTop: 4, fontFamily: "var(--font-mono)" }}>
                  {agentStatus?.open_findings || 0} Open / {agentStatus?.total_findings || 0} Total
                </div>
                <div style={{ fontSize: 10, color: textMuted, marginTop: 2 }}>
                  Deduped &amp; Tracked in SQLite
                </div>
              </div>

              <div className="dept-modal-card" style={{ padding: 14 }}>
                <div style={{ fontSize: 9, color: textMuted, letterSpacing: 1 }}>CHAMPION FIXES GATED</div>
                <div style={{ fontSize: 16, fontWeight: "bold", color: accentGreen, marginTop: 4, fontFamily: "var(--font-mono)" }}>
                  {agentStatus?.approved_fixes || 0} Approved / {agentStatus?.total_fixes || 0} Proposed
                </div>
                <div style={{ fontSize: 10, color: textMuted, marginTop: 2 }}>
                  7-Gate Audit · Isolated Worktrees
                </div>
              </div>

              <div className="dept-modal-card" style={{ padding: 14, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <button
                  onClick={handleTriggerAgentCycle}
                  disabled={isTriggeringAgent || agentStatus?.running_cycle}
                  className="req-btn"
                  style={{
                    background: agentStatus?.running_cycle ? "rgba(255, 145, 0, 0.2)" : "rgba(0, 229, 255, 0.15)",
                    borderColor: agentStatus?.running_cycle ? accentWarn : accent,
                    color: agentStatus?.running_cycle ? accentWarn : accent,
                    padding: "8px 14px",
                    fontSize: 11,
                    fontWeight: "bold",
                    cursor: agentStatus?.running_cycle ? "not-allowed" : "pointer",
                  }}
                >
                  {agentStatus?.running_cycle ? "⚡ CYCLE RUNNING..." : "▶ TRIGGER AGENT CYCLE"}
                </button>
                {agentActionMsg && (
                  <div style={{ fontSize: 9, marginTop: 6, color: agentActionMsg.type === "ok" ? accentGreen : "var(--fault)", textAlign: "center" }}>
                    {agentActionMsg.text}
                  </div>
                )}
              </div>
            </div>

            {/* WORKFLOW ARCHITECTURE PANEL */}
            <div className="dept-modal-card" style={{ padding: 20, marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div style={{ fontSize: 12, fontWeight: "bold", color: accent, letterSpacing: 1 }}>
                  CHECK-AND-SUPPORT ARCHITECTURE // CLOSED-LOOP AUDIT &amp; FIX
                </div>
                <span style={{ fontSize: 10, color: textMuted, fontFamily: "var(--font-mono)" }}>
                  Neither Agent is Trusted Blindly · Main Branch Protected
                </span>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                  gap: 14,
                }}
              >
                <div
                  style={{
                    border: "1px solid #4f46e5",
                    background: isLightMode ? "#eef2ff" : "rgba(79, 70, 229, 0.12)",
                    padding: 14,
                    borderRadius: 8,
                  }}
                >
                  <div style={{ fontSize: 9, color: "#818cf8", fontWeight: "bold", letterSpacing: 1 }}>STEP 01 // AUDITOR</div>
                  <div style={{ fontSize: 13, fontWeight: "bold", color: "var(--text)", marginTop: 4 }}>Challenger tests system</div>
                  <div style={{ fontSize: 10, color: textMuted, marginTop: 4, lineHeight: 1.4 }}>
                    Full pytest suite, FastAPI probe on throwaway SQLite DB, capacity &amp; quantile invariants, and LLM edge-case fuzzing.
                  </div>
                </div>

                <div
                  style={{
                    border: `1px solid ${borderCol}`,
                    background: isLightMode ? "#f8fafc" : "rgba(255, 255, 255, 0.03)",
                    padding: 14,
                    borderRadius: 8,
                  }}
                >
                  <div style={{ fontSize: 9, color: textMuted, fontWeight: "bold", letterSpacing: 1 }}>STEP 02 // DEDUPLICATION</div>
                  <div style={{ fontSize: 13, fontWeight: "bold", color: "var(--text)", marginTop: 4 }}>Finding logged</div>
                  <div style={{ fontSize: 10, color: textMuted, marginTop: 4, lineHeight: 1.4 }}>
                    Deduped by SHA1 fingerprint, saved to SQLite (<code>agents.db</code>) and activity log (<code>activity.jsonl</code>).
                  </div>
                </div>

                <div
                  style={{
                    border: "1px solid #059669",
                    background: isLightMode ? "#ecfdf5" : "rgba(5, 150, 105, 0.12)",
                    padding: 14,
                    borderRadius: 8,
                  }}
                >
                  <div style={{ fontSize: 9, color: "#34d399", fontWeight: "bold", letterSpacing: 1 }}>STEP 03 // FIXER</div>
                  <div style={{ fontSize: 13, fontWeight: "bold", color: "var(--text)", marginTop: 4 }}>Champion proposes patch</div>
                  <div style={{ fontSize: 10, color: textMuted, marginTop: 4, lineHeight: 1.4 }}>
                    Isolated git worktree. Search/replace edits with 60-line cap. Main is NEVER touched.
                  </div>
                </div>

                <div
                  style={{
                    border: "1px solid #4f46e5",
                    background: isLightMode ? "#eef2ff" : "rgba(79, 70, 229, 0.12)",
                    padding: 14,
                    borderRadius: 8,
                  }}
                >
                  <div style={{ fontSize: 9, color: "#818cf8", fontWeight: "bold", letterSpacing: 1 }}>STEP 04 // 7-GATE AUDIT</div>
                  <div style={{ fontSize: 13, fontWeight: "bold", color: "var(--text)", marginTop: 4 }}>Challenger reviews patch</div>
                  <div style={{ fontSize: 10, color: textMuted, marginTop: 4, lineHeight: 1.4 }}>
                    7 deterministic gates (Scope, Size, No Cheating, Target Fixed, No Regressions, Lint, LLM). Challenger CAN oppose!
                  </div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 14 }}>
                <div
                  style={{
                    border: `1px solid ${borderCol}`,
                    background: isLightMode ? "#fff1f2" : "rgba(244, 63, 94, 0.08)",
                    padding: "10px 14px",
                    borderRadius: 6,
                  }}
                >
                  <span style={{ fontSize: 11, fontWeight: "bold", color: "var(--fault)" }}>✕ IF OPPOSED:</span>
                  <span style={{ fontSize: 10, color: textMuted, marginLeft: 8 }}>
                    Objections fed back to Champion · Retry up to 3x · Escalate to human
                  </span>
                </div>

                <div
                  style={{
                    border: `1px solid ${borderCol}`,
                    background: isLightMode ? "#f0fdf4" : "rgba(34, 197, 94, 0.08)",
                    padding: "10px 14px",
                    borderRadius: 6,
                  }}
                >
                  <span style={{ fontSize: 11, fontWeight: "bold", color: accentGreen }}>✓ IF APPROVED:</span>
                  <span style={{ fontSize: 10, color: textMuted, marginLeft: 8 }}>
                    Committed to isolated branch <code style={{ color: accent }}>agent/fix-N</code> · Re-verified next cycle
                  </span>
                </div>
              </div>
            </div>

            {/* TWO-COLUMN LOWER SECTION */}
            <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 20 }}>
              {/* LEFT: FINDINGS & FIXES */}
              <div>
                <div className="dept-modal-card" style={{ padding: 16, marginBottom: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: "bold", color: accent, letterSpacing: 1 }}>
                      SYSTEM FINDINGS &amp; DETECTED REGRESSIONS ({findings.length})
                    </div>
                    <span style={{ fontSize: 9, color: textMuted, fontFamily: "var(--font-mono)" }}>
                      CLICK TO VIEW DETAILS
                    </span>
                  </div>

                  {findings.length === 0 ? (
                    <div style={{ padding: 20, textAlign: "center", color: accentGreen, fontSize: 11 }}>
                      ✓ No open findings. System passed all pytest suites, API probes, and invariant checks.
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 320, overflowY: "auto" }}>
                      {findings.map((f) => (
                        <div
                          key={f.id}
                          onClick={() => setSelectedFinding(f)}
                          style={{
                            border: `1px solid ${selectedFinding?.id === f.id ? accent : borderCol}`,
                            background: isLightMode ? "#f8fafc" : "rgba(255,255,255,0.02)",
                            padding: "8px 12px",
                            borderRadius: 6,
                            cursor: "pointer",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: 10, fontWeight: "bold", color: "var(--text)" }}>
                              #{f.id} [{f.kind}] {f.title}
                            </span>
                            <span
                              style={{
                                fontSize: 9,
                                fontWeight: "bold",
                                color: f.status === "open" ? accentWarn : f.status === "fixed_pending_merge" ? accentGreen : textMuted,
                              }}
                            >
                              {f.status.toUpperCase()}
                            </span>
                          </div>
                          <div style={{ fontSize: 9, color: textMuted, marginTop: 4, fontFamily: "var(--font-mono)" }}>
                            Severity: {f.severity.toUpperCase()} · Attempts: {f.attempts} · Fingerprint: {f.fingerprint}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="dept-modal-card" style={{ padding: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: "bold", color: accentGreen, letterSpacing: 1, marginBottom: 12 }}>
                    APPROVED / GATED FIX BRANCHES ({fixes.length})
                  </div>

                  {fixes.length === 0 ? (
                    <div style={{ padding: 16, textAlign: "center", color: textMuted, fontSize: 11 }}>
                      No fixes recorded yet. Run a cycle to test and fix automatically.
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 280, overflowY: "auto" }}>
                      {fixes.map((x) => (
                        <div
                          key={x.id}
                          style={{
                            border: `1px solid ${borderCol}`,
                            background: isLightMode ? "#f8fafc" : "rgba(255,255,255,0.02)",
                            padding: "8px 12px",
                            borderRadius: 6,
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: 10, fontWeight: "bold", color: accent }}>
                              Fix #{x.id} → Finding #{x.finding_id} (Attempt {x.attempt})
                            </span>
                            <span
                              style={{
                                fontSize: 9,
                                fontWeight: "bold",
                                color: x.status === "approved" ? accentGreen : x.status === "rejected" ? "var(--fault)" : textMuted,
                              }}
                            >
                              {x.status.toUpperCase()}
                            </span>
                          </div>
                          <div style={{ fontSize: 9, color: textMuted, marginTop: 2, fontFamily: "var(--font-mono)" }}>
                            Method: {x.method} {x.branch && `· Branch: ${x.branch}`}
                          </div>
                          {x.verdict && (
                            <div style={{ fontSize: 9, color: textMuted, marginTop: 4 }}>
                              Verdict: {x.verdict}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT: CLI GUIDE & AUDIT TRAIL */}
              <div>
                <div className="dept-modal-card" style={{ padding: 16, marginBottom: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: "bold", color: accent, letterSpacing: 1, marginBottom: 10 }}>
                    CLI USAGE &amp; SETUP PLAYBOOK
                  </div>
                  <div
                    style={{
                      background: isLightMode ? "#f1f5f9" : "rgba(0,0,0,0.5)",
                      padding: 12,
                      borderRadius: 6,
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      lineHeight: 1.6,
                    }}
                  >
                    <div style={{ color: textMuted }}># 1. Setup Environment</div>
                    <div style={{ color: accentGreen }}>pip install -r backend/requirements.txt</div>
                    <div style={{ color: accentGreen }}>ollama pull qwen2.5-coder:7b</div>
                    <div style={{ color: accentGreen }}>export AGENT_LLM_BACKEND=ollama OLLAMA_MODEL=qwen2.5-coder:7b</div>
                    <div style={{ color: textMuted, marginTop: 8 }}># Or use Hugging Face:</div>
                    <div style={{ color: accent }}>export AGENT_LLM_BACKEND=hf HF_TOKEN=... HF_MODEL=Qwen/Qwen2.5-Coder-32B-Instruct</div>
                    <div style={{ color: textMuted, marginTop: 8 }}># 2. Run Autonomous Agents:</div>
                    <div style={{ color: "var(--text)" }}>python -m agents once &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;# 1 full test/fix/audit cycle</div>
                    <div style={{ color: "var(--text)" }}>python -m agents loop &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;# continuous monitor</div>
                    <div style={{ color: "var(--text)" }}>python -m agents report &nbsp;&nbsp;&nbsp;&nbsp;# show runs, findings, fixes</div>
                    <div style={{ color: "var(--text)" }}>python -m agents tail &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;# tail activity stream</div>
                    <div style={{ color: "var(--text)" }}>python -m pytest agents/tests -q &nbsp;# verify end-to-end loop</div>
                  </div>
                </div>

                <div className="dept-modal-card" style={{ padding: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: "bold", color: accent, letterSpacing: 1 }}>
                      ACTIVITY AUDIT TRAIL // REAL-TIME
                    </div>
                    <span style={{ fontSize: 8, color: textMuted, fontFamily: "var(--font-mono)" }}>
                      agents/data/activity.jsonl
                    </span>
                  </div>

                  <div
                    style={{
                      maxHeight: 340,
                      overflowY: "auto",
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                      fontFamily: "var(--font-mono)",
                      fontSize: 9,
                    }}
                  >
                    {activities.length === 0 ? (
                      <div style={{ color: textMuted, padding: 10, textAlign: "center" }}>
                        No events recorded yet.
                      </div>
                    ) : (
                      activities.map((ev) => (
                        <div
                          key={ev.id}
                          style={{
                            padding: "4px 8px",
                            borderLeft: `2px solid ${ev.actor === "challenger" ? "#818cf8" : ev.actor === "champion" ? "#34d399" : accent}`,
                            background: isLightMode ? "#f8fafc" : "rgba(255,255,255,0.02)",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ fontWeight: "bold", color: ev.actor === "challenger" ? "#818cf8" : "#34d399" }}>
                              {ev.actor.toUpperCase()}
                            </span>
                            <span style={{ color: textMuted }}>
                              {new Date(ev.ts * 1000).toLocaleTimeString()}
                            </span>
                          </div>
                          <div style={{ color: "var(--text)", marginTop: 2 }}>
                            {ev.event}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 2: PRODUCTION MLOps & MODEL RETRAINING (FORECASTING & DRIFT)
        ========================================================================= */}
        {activeTab === "mlops" && (
          <div>
            {/* ACTION NOTIFICATIONS */}
            {mlopsError && (
              <div
                style={{
                  padding: "10px 16px",
                  borderRadius: 6,
                  background: "rgba(255, 23, 68, 0.15)",
                  border: "1px solid var(--fault)",
                  color: "var(--fault)",
                  fontSize: 11,
                  marginBottom: 16,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span>⚠️ {mlopsError}</span>
                <button onClick={() => setMlopsError(null)} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer" }}>✕</button>
              </div>
            )}
            {mlopsSuccess && (
              <div
                style={{
                  padding: "10px 16px",
                  borderRadius: 6,
                  background: "rgba(118, 255, 3, 0.15)",
                  border: `1px solid ${accentGreen}`,
                  color: accentGreen,
                  fontSize: 11,
                  marginBottom: 16,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span>✓ {mlopsSuccess}</span>
                <button onClick={() => setMlopsSuccess(null)} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer" }}>✕</button>
              </div>
            )}

            {/* MLOps OVERVIEW CARDS */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
              {/* CHAMPION MODEL CARD */}
              <div className="dept-modal-card" style={{ padding: 18 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div>
                    <span style={{ fontSize: 9, color: accentGreen, fontWeight: "bold", letterSpacing: 1 }}>
                      ACTIVE PRODUCTION MODEL
                    </span>
                    <h2 style={{ fontSize: 18, color: "var(--text)", margin: "4px 0 0 0" }}>
                      Champion: {champion?.version || "Loading..."}
                    </h2>
                  </div>
                  <span
                    style={{
                      background: "rgba(118, 255, 3, 0.15)",
                      border: `1px solid ${accentGreen}`,
                      color: accentGreen,
                      padding: "4px 10px",
                      borderRadius: 12,
                      fontSize: 10,
                      fontWeight: "bold",
                    }}
                  >
                    STATUS: ACTIVE
                  </span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 14 }}>
                  <div style={{ background: isLightMode ? "#f8fafc" : "rgba(255,255,255,0.03)", padding: 8, borderRadius: 4 }}>
                    <div style={{ fontSize: 9, color: textMuted }}>WAPE</div>
                    <div style={{ fontSize: 13, fontWeight: "bold", color: accentGreen }}>{fmtPct(champion?.metrics?.wape)}</div>
                  </div>
                  <div style={{ background: isLightMode ? "#f8fafc" : "rgba(255,255,255,0.03)", padding: 8, borderRadius: 4 }}>
                    <div style={{ fontSize: 9, color: textMuted }}>P75 COVERAGE</div>
                    <div style={{ fontSize: 13, fontWeight: "bold", color: "var(--text)" }}>{fmtPct(champion?.metrics?.p75_coverage)}</div>
                  </div>
                  <div style={{ background: isLightMode ? "#f8fafc" : "rgba(255,255,255,0.03)", padding: 8, borderRadius: 4 }}>
                    <div style={{ fontSize: 9, color: textMuted }}>P90 COVERAGE</div>
                    <div style={{ fontSize: 13, fontWeight: "bold", color: "var(--text)" }}>{fmtPct(champion?.metrics?.p90_coverage)}</div>
                  </div>
                </div>

                <div style={{ fontSize: 10, color: textMuted, display: "flex", flexDirection: "column", gap: 3 }}>
                  <div>Dataset: <strong style={{ color: "var(--text)" }}>{champion?.dataset_version || "sim_prod_v1"}</strong></div>
                  <div>Algorithm: <strong style={{ color: "var(--text)" }}>{champion?.model_type || "LightGBM Quantile Regressor"}</strong></div>
                  <div>Trained At: <strong style={{ color: "var(--text)" }}>{champion?.trained_at ? new Date(champion.trained_at).toLocaleString() : "--"}</strong></div>
                </div>

                <div style={{ marginTop: 14 }}>
                  <button
                    onClick={handleRollbackModel}
                    disabled={isSubmittingMlops}
                    className="req-btn"
                    style={{ fontSize: 10, padding: "6px 12px", width: "100%", borderColor: accentWarn, color: accentWarn }}
                  >
                    ↺ ROLLBACK TO PREVIOUS VERIFIED CHAMPION
                  </button>
                </div>
              </div>

              {/* CHALLENGER MODEL CARD */}
              <div className="dept-modal-card" style={{ padding: 18 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div>
                    <span style={{ fontSize: 9, color: accent, fontWeight: "bold", letterSpacing: 1 }}>
                      EVALUATION CANDIDATE
                    </span>
                    <h2 style={{ fontSize: 18, color: "var(--text)", margin: "4px 0 0 0" }}>
                      Challenger: {challenger?.version || "None Active"}
                    </h2>
                  </div>
                  <span
                    style={{
                      background: challenger?.ready_for_promotion ? "rgba(118,255,3,0.15)" : "rgba(255,255,255,0.05)",
                      border: `1px solid ${challenger?.ready_for_promotion ? accentGreen : borderCol}`,
                      color: challenger?.ready_for_promotion ? accentGreen : textMuted,
                      padding: "4px 10px",
                      borderRadius: 12,
                      fontSize: 10,
                      fontWeight: "bold",
                    }}
                  >
                    {challenger?.ready_for_promotion ? "READY FOR PROMOTION" : "EVALUATION PENDING"}
                  </span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 14 }}>
                  <div style={{ background: isLightMode ? "#f8fafc" : "rgba(255,255,255,0.03)", padding: 8, borderRadius: 4 }}>
                    <div style={{ fontSize: 9, color: textMuted }}>WAPE</div>
                    <div style={{ fontSize: 13, fontWeight: "bold", color: accent }}>{fmtPct(challenger?.metrics?.wape)}</div>
                  </div>
                  <div style={{ background: isLightMode ? "#f8fafc" : "rgba(255,255,255,0.03)", padding: 8, borderRadius: 4 }}>
                    <div style={{ fontSize: 9, color: textMuted }}>P75 COVERAGE</div>
                    <div style={{ fontSize: 13, fontWeight: "bold", color: "var(--text)" }}>{fmtPct(challenger?.metrics?.p75_coverage)}</div>
                  </div>
                  <div style={{ background: isLightMode ? "#f8fafc" : "rgba(255,255,255,0.03)", padding: 8, borderRadius: 4 }}>
                    <div style={{ fontSize: 9, color: textMuted }}>BEATS BASELINE?</div>
                    <div style={{ fontSize: 13, fontWeight: "bold", color: challenger?.metrics?.beats_baseline ? accentGreen : "var(--fault)" }}>
                      {challenger?.metrics?.beats_baseline ? "YES (PASS ✓)" : "NO"}
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: 10, color: textMuted, display: "flex", flexDirection: "column", gap: 3 }}>
                  <div>Dataset: <strong style={{ color: "var(--text)" }}>{challenger?.dataset_version || "sim_prod_v2"}</strong></div>
                  <div>Evaluated At: <strong style={{ color: "var(--text)" }}>{challenger?.created_at ? new Date(challenger.created_at).toLocaleString() : "--"}</strong></div>
                  <div>Safety Gate: <strong style={{ color: accentGreen }}>Zero-Downtime Hot Swap</strong></div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 14 }}>
                  <button
                    onClick={handleTriggerRetrain}
                    disabled={isSubmittingMlops || !!activeJobId}
                    className="req-btn"
                    style={{ fontSize: 10, padding: "6px 12px", background: "rgba(0,229,255,0.1)", borderColor: accent }}
                  >
                    {activeJobId ? "⏳ RETRAINING..." : "▶ TRIGGER RETRAIN"}
                  </button>
                  <button
                    onClick={handlePromoteChallenger}
                    disabled={isSubmittingMlops || !challenger?.ready_for_promotion}
                    className="req-btn"
                    style={{
                      fontSize: 10,
                      padding: "6px 12px",
                      background: challenger?.ready_for_promotion ? "rgba(118,255,3,0.15)" : "transparent",
                      borderColor: challenger?.ready_for_promotion ? accentGreen : borderCol,
                      color: challenger?.ready_for_promotion ? accentGreen : textMuted,
                      cursor: challenger?.ready_for_promotion ? "pointer" : "not-allowed",
                    }}
                  >
                    ★ PROMOTE TO CHAMPION
                  </button>
                </div>
              </div>
            </div>

            {/* DATA DRIFT STATUS & RETRAINING LOG TERMINAL */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1.3fr", gap: 16, marginBottom: 20 }}>
              {/* DRIFT TELEMETRY */}
              <div className="dept-modal-card" style={{ padding: 18 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: "bold", color: accent, letterSpacing: 1 }}>
                    DATA DRIFT MONITOR // SENSOR INPUTS
                  </div>
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: "bold",
                      color: drift?.drift_detected ? accentWarn : accentGreen,
                    }}
                  >
                    {drift?.drift_detected ? "⚠️ DRIFT DETECTED" : "✓ STABLE TELEMETRY"}
                  </span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10 }}>
                    <span style={{ color: textMuted }}>P75 Coverage:</span>
                    <strong style={{ color: "var(--text)" }}>{fmtPct(drift?.coverage_p75)}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10 }}>
                    <span style={{ color: textMuted }}>P90 Coverage:</span>
                    <strong style={{ color: "var(--text)" }}>{fmtPct(drift?.coverage_p90)}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10 }}>
                    <span style={{ color: textMuted }}>Recommend Retraining:</span>
                    <strong style={{ color: drift?.recommend_retrain ? accentWarn : accentGreen }}>
                      {drift?.recommend_retrain ? "YES (CHAMPION AGENT SIGNALED)" : "NO"}
                    </strong>
                  </div>
                </div>

                {drift?.psi_scores && Object.keys(drift.psi_scores).length > 0 && (
                  <div style={{ marginTop: 14 }}>
                    <div style={{ fontSize: 9, color: textMuted, fontWeight: "bold", marginBottom: 6 }}>PSI SCORES BY FEATURE:</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, fontSize: 9, fontFamily: "var(--font-mono)" }}>
                      {Object.entries(drift.psi_scores).map(([feat, score]) => (
                        <div key={feat} style={{ background: isLightMode ? "#f8fafc" : "rgba(255,255,255,0.02)", padding: 4, borderRadius: 3 }}>
                          {feat}: <strong style={{ color: score > 0.25 ? accentWarn : "var(--text)" }}>{score.toFixed(3)}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* RETRAINING JOB EXECUTION LOGS */}
              <div className="dept-modal-card" style={{ padding: 18 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: "bold", color: accentGreen, letterSpacing: 1 }}>
                    JOB TERMINAL // {activeJobId ? `JOB: ${activeJobId} (${jobStatus})` : "READY"}
                  </div>
                  {jobDuration && (
                    <span style={{ fontSize: 9, color: textMuted, fontFamily: "var(--font-mono)" }}>
                      Duration: {jobDuration.toFixed(1)}s
                    </span>
                  )}
                </div>

                <div
                  style={{
                    background: isLightMode ? "#f1f5f9" : "rgba(0,0,0,0.6)",
                    padding: 12,
                    borderRadius: 6,
                    height: 180,
                    overflowY: "auto",
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    color: "var(--text)",
                    whiteSpace: "pre-wrap",
                    lineHeight: 1.5,
                  }}
                >
                  {jobLogs || "No active training job. Click [TRIGGER RETRAIN] above or wait for Champion Agent drift dispatch."}
                </div>
              </div>
            </div>

            {/* HISTORICAL RETRAINING RUNS TABLE */}
            <div className="dept-modal-card" style={{ padding: 18 }}>
              <div style={{ fontSize: 11, fontWeight: "bold", color: accent, letterSpacing: 1, marginBottom: 12 }}>
                CHRONOLOGICAL MODEL REGISTRY RUNS ({history.length})
              </div>

              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10, textAlign: "left" }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${borderCol}`, color: textMuted }}>
                      <th style={{ padding: "6px 8px" }}>RUN ID</th>
                      <th style={{ padding: "6px 8px" }}>STATUS</th>
                      <th style={{ padding: "6px 8px" }}>TRIGGER</th>
                      <th style={{ padding: "6px 8px" }}>SAMPLES</th>
                      <th style={{ padding: "6px 8px" }}>WAPE</th>
                      <th style={{ padding: "6px 8px" }}>P75 COV</th>
                      <th style={{ padding: "6px 8px" }}>P90 COV</th>
                      <th style={{ padding: "6px 8px" }}>TIMESTAMP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.length === 0 ? (
                      <tr>
                        <td colSpan={8} style={{ padding: 12, textAlign: "center", color: textMuted }}>
                          No historical model runs found.
                        </td>
                      </tr>
                    ) : (
                      history.map((r) => (
                        <tr key={r.run_id} style={{ borderBottom: `1px solid ${borderCol}` }}>
                          <td style={{ padding: "6px 8px", fontFamily: "var(--font-mono)", color: accent }}>{r.run_id.slice(0, 8)}...</td>
                          <td style={{ padding: "6px 8px" }}>
                            <span style={{ color: r.status === "SUCCEEDED" ? accentGreen : r.status === "FAILED" ? "var(--fault)" : accentWarn, fontWeight: "bold" }}>
                              {r.status}
                            </span>
                          </td>
                          <td style={{ padding: "6px 8px", color: textMuted }}>{r.trigger_type}</td>
                          <td style={{ padding: "6px 8px" }}>{r.num_samples?.toLocaleString() || "--"}</td>
                          <td style={{ padding: "6px 8px", color: accentGreen }}>{fmtPct(r.metrics?.wape)}</td>
                          <td style={{ padding: "6px 8px" }}>{fmtPct(r.metrics?.p75_coverage)}</td>
                          <td style={{ padding: "6px 8px" }}>{fmtPct(r.metrics?.p90_coverage)}</td>
                          <td style={{ padding: "6px 8px", color: textMuted }}>{new Date(r.created_at).toLocaleString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
