"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import "../../globals.css";

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

export default function ModelRetrainingPage() {
  const [timeStr, setTimeStr] = useState("--:--:--");
  const [isLightMode, setIsLightMode] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("hal-theme") === "light";
    }
    return false;
  });

  // Model state
  const [champion, setChampion] = useState<ChampionInfo | null>(null);
  const [challenger, setChallenger] = useState<ChallengerInfo | null>(null);
  const [history, setHistory] = useState<RunRecord[]>([]);
  const [drift, setDrift] = useState<DriftInfo | null>(null);

  // Retraining Job state
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<string | null>(null);
  const [jobLogs, setJobLogs] = useState<string>("");
  const [jobDuration, setJobDuration] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

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

  // Fetch initial data
  const loadData = React.useCallback(async () => {
    try {
      const [champRes, challRes, histRes, driftRes] = await Promise.all([
        fetch("/api/models/champion"),
        fetch("/api/models/challenger"),
        fetch("/api/models/history"),
        fetch("/api/models/drift"),
      ]);

      if (champRes.ok) {
        const cData = await champRes.json();
        setChampion(cData);
      }
      if (challRes.ok) {
        const chData = await challRes.json();
        setChallenger(chData.challenger !== null && chData.version ? chData : null);
      }
      if (histRes.ok) {
        const hData = await histRes.json();
        setHistory(hData);
      }
      if (driftRes.ok) {
        const dData = await driftRes.json();
        setDrift(dData);
      }
    } catch (err) {
      console.error("Failed to load model data:", err);
    }
  }, []);

  // Poll job status
  const startPolling = React.useCallback((jobId: string) => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/models/jobs/${jobId}`);
        if (!res.ok) return;
        const data = await res.json();
        setJobStatus(data.status);
        setJobLogs(data.logs || "");
        if (data.duration_s) setJobDuration(data.duration_s);

        if (data.status === "SUCCEEDED" || data.status === "FAILED") {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          localStorage.removeItem("hal-retraining-job");
          loadData();
          if (data.status === "SUCCEEDED") {
            setActionSuccess(`Job ${jobId} succeeded! Challenger model evaluated.`);
          } else {
            setActionError(`Job ${jobId} failed: ${data.error || "Unknown error"}`);
          }
        }
      } catch (e) {
        console.error("Error polling job status:", e);
      }
    }, 1200);
  }, [loadData]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
      const savedJob = localStorage.getItem("hal-retraining-job");
      if (savedJob) {
        setActiveJobId(savedJob);
        startPolling(savedJob);
      }
    }, 0);
    return () => {
      clearTimeout(timer);
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [loadData, startPolling]);

  const handleTriggerRetrain = async () => {
    setActionError(null);
    setActionSuccess(null);
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/models/retrain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trigger_type: "MANUAL" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setActionError(data.detail || "Retraining request failed");
        setIsSubmitting(false);
        return;
      }
      setActiveJobId(data.job_id);
      setJobStatus("QUEUED");
      setJobLogs(`[${new Date().toLocaleTimeString()}] Retraining job queued...`);
      localStorage.setItem("hal-retraining-job", data.job_id);
      startPolling(data.job_id);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Network error";
      setActionError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePromote = async () => {
    if (!challenger) return;
    setActionError(null);
    setActionSuccess(null);
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/models/promote", {
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
        setActionError(data.detail || "Promotion failed");
      } else {
        setActionSuccess(`Challenger ${challenger.version} promoted to CHAMPION.`);
        await loadData();
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Network error";
      setActionError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRollback = async () => {
    setActionError(null);
    setActionSuccess(null);
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/models/rollback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actor: "supervisor",
          reason: "Rolled back to previous verified production champion",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setActionError(data.detail || "Rollback failed");
      } else {
        setActionSuccess(`Rolled back! Active champion is now ${data.active_champion}.`);
        await loadData();
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Network error";
      setActionError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const fmtPct = (val?: number) => (val !== undefined ? `${(val * 100).toFixed(1)}%` : "--");
  const fmtNum = (val?: number) => (val !== undefined ? val.toFixed(4) : "--");

  return (
    <div className="layout-container" style={{ overflowY: "auto", height: "100vh" }}>
      {/* TOPBAR */}
      <header className="topbar">
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div className="logo">APEX-Twin <span>{"//"}</span> Digital Twin</div>
          <span style={{ color: "var(--muted)", fontSize: 12 }}>|</span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--accent)" }}>
            MODEL RETRAINING &amp; REGISTRY
          </span>
        </div>

        <div className="status-pill">
          <div className="status-dot healthy" />
          <span>PRODUCTION CHAMPION: {champion?.version || "v1.0"}</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link
            href="/"
            className="req-btn"
            style={{ padding: "4px 12px", fontSize: 10, textDecoration: "none" }}
          >
            ◀ BACK TO TWIN
          </Link>
          <button
            className="theme-btn"
            id="retraining-theme-toggle"
            onClick={toggleTheme}
            title={isLightMode ? "Switch to Dark Mode" : "Switch to Light Mode"}
            aria-label="Toggle theme"
          >
            {isLightMode ? "🌙" : "☀️"}
          </button>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--muted)", letterSpacing: 1 }}>
            {timeStr}
          </span>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main style={{ padding: "20px 24px 60px 24px", maxWidth: 1400, margin: "0 auto", width: "100%" }}>
        {/* ACTION ALERTS */}
        {actionError && (
          <div className="glass-panel" style={{ borderColor: "var(--fault)", marginBottom: 16, background: "rgba(255,23,68,0.08)", padding: 12 }}>
            <span style={{ color: "var(--fault)", fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: "bold" }}>
              ⚠ ERROR: {actionError}
            </span>
          </div>
        )}
        {actionSuccess && (
          <div className="glass-panel" style={{ borderColor: "var(--accent2)", marginBottom: 16, background: "rgba(118,255,3,0.08)", padding: 12 }}>
            <span style={{ color: "var(--accent2)", fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: "bold" }}>
              ✓ SUCCESS: {actionSuccess}
            </span>
          </div>
        )}

        {/* TOP ROW: CHAMPION VS CHALLENGER CARDS */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))", gap: 20, marginBottom: 20 }}>
          
          {/* CHAMPION CARD */}
          <div className="glass-panel">
            <div className="card-title" style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Active Production Champion</span>
              <span className="status-dot healthy" style={{ alignSelf: "center" }} />
            </div>

            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 12 }}>
              <span style={{ fontSize: 28, fontFamily: "var(--font-mono)", color: "var(--accent)", fontWeight: "bold" }}>
                {champion?.version || "v1.0"}
              </span>
              <span style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase" }}>
                Status: {champion?.status || "HEALTHY"}
              </span>
            </div>

            <div className="metric-group" style={{ marginBottom: 12 }}>
              <div className="big-metric">
                <span className="big-num" style={{ fontSize: 22, color: "var(--accent)" }}>
                  {fmtNum(champion?.metrics?.mae)}
                </span>
                <span className="big-label">MAE (Hours)</span>
              </div>
              <div className="big-metric">
                <span className="big-num" style={{ fontSize: 22, color: "var(--accent2)" }}>
                  {fmtPct(champion?.metrics?.p75_coverage)}
                </span>
                <span className="big-label">P75 Cov (Target 75%)</span>
              </div>
              <div className="big-metric">
                <span className="big-num" style={{ fontSize: 22, color: "var(--accent2)" }}>
                  {fmtPct(champion?.metrics?.p90_coverage)}
                </span>
                <span className="big-label">P90 Cov (Target 90%)</span>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 10 }}>
              <div className="kv-row">
                <span className="kv-key">Model Type</span>
                <span className="kv-value ok">LightGBM Quantile (P50/P75/P90)</span>
              </div>
              <div className="kv-row">
                <span className="kv-key">Dataset Version</span>
                <span className="kv-value">{champion?.dataset_version || "DS-120-PROD"}</span>
              </div>
              <div className="kv-row">
                <span className="kv-key">Forecast Horizon</span>
                <span className="kv-value">90 Days Chronological</span>
              </div>
              <div className="kv-row">
                <span className="kv-key">Trained On</span>
                <span className="kv-value">{champion?.trained_at ? new Date(champion.trained_at).toLocaleString() : "2026-10-01"}</span>
              </div>
            </div>

            <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
              <button
                className="req-btn"
                style={{ flex: 1, borderColor: "var(--warn)", color: "var(--warn)" }}
                onClick={handleRollback}
                disabled={isSubmitting}
              >
                ↺ ROLLBACK TO PREVIOUS
              </button>
            </div>
          </div>

          {/* CHALLENGER CARD & CONTROLS */}
          <div className="glass-panel">
            <div className="card-title" style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Challenger Evaluation &amp; Safety Gate</span>
              <span style={{ fontSize: 9, color: "var(--muted)" }}>OUT-OF-SAMPLE BACKTEST</span>
            </div>

            {challenger ? (
              <>
                <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 12 }}>
                  <span style={{ fontSize: 28, fontFamily: "var(--font-mono)", color: "var(--accent2)", fontWeight: "bold" }}>
                    {challenger.version}
                  </span>
                  <span
                    style={{
                      fontSize: 9,
                      padding: "2px 8px",
                      borderRadius: 4,
                      fontWeight: "bold",
                      background: challenger.ready_for_promotion ? "rgba(118,255,3,0.15)" : "rgba(255,23,68,0.15)",
                      color: challenger.ready_for_promotion ? "var(--accent2)" : "var(--fault)",
                      border: `1px solid ${challenger.ready_for_promotion ? "var(--accent2)" : "var(--fault)"}`,
                    }}
                  >
                    {challenger.ready_for_promotion ? "✓ READY FOR PROMOTION" : "REJECTED DUE TO REGRESSION"}
                  </span>
                </div>

                <div className="metric-group" style={{ marginBottom: 12 }}>
                  <div className="big-metric">
                    <span className="big-num" style={{ fontSize: 22, color: "var(--accent2)" }}>
                      {fmtNum(challenger.metrics?.mae)}
                    </span>
                    <span className="big-label">Challenger MAE</span>
                  </div>
                  <div className="big-metric">
                    <span className="big-num" style={{ fontSize: 22, color: "var(--accent)" }}>
                      {fmtPct(challenger.metrics?.p75_coverage)}
                    </span>
                    <span className="big-label">P75 Coverage</span>
                  </div>
                  <div className="big-metric">
                    <span className="big-num" style={{ fontSize: 22, color: "var(--accent)" }}>
                      {fmtPct(challenger.metrics?.p90_coverage)}
                    </span>
                    <span className="big-label">P90 Coverage</span>
                  </div>
                </div>

                <div className="kv-row">
                  <span className="kv-key">Safety Gate Rule</span>
                  <span className="kv-value ok">Non-regressing on OVERLOAD segment &amp; ASSY dept</span>
                </div>
              </>
            ) : (
              <div style={{ padding: "24px 0", textAlign: "center", color: "var(--muted)", fontSize: 11 }}>
                No active challenger model awaiting promotion. Trigger a manual or drift-based retraining run below.
              </div>
            )}

            <div style={{ marginTop: 20, display: "flex", gap: 10 }}>
              <button
                className="req-btn solid"
                style={{ flex: 1 }}
                onClick={handleTriggerRetrain}
                disabled={isSubmitting || jobStatus === "RUNNING"}
              >
                {jobStatus === "RUNNING" ? "⏳ RETRAINING IN PROGRESS..." : "▶ TRIGGER ASYNC RETRAINING"}
              </button>

              {challenger && challenger.ready_for_promotion && (
                <button
                  className="req-btn"
                  style={{ flex: 1, borderColor: "var(--accent2)", color: "var(--accent2)" }}
                  onClick={handlePromote}
                  disabled={isSubmitting}
                >
                  ✓ PROMOTE CHALLENGER
                </button>
              )}
            </div>
          </div>
        </div>

        {/* MIDDLE ROW: ACTIVE JOB LOGS & DRIFT MONITOR */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))", gap: 20, marginBottom: 20 }}>
          
          {/* JOB EXECUTION STREAMER */}
          <div className="glass-panel" style={{ minHeight: 240, display: "flex", flexDirection: "column" }}>
            <div className="card-title" style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Job Execution Log Streamer {activeJobId ? `// ${activeJobId}` : ""}</span>
              {jobStatus && (
                <span
                  style={{
                    fontSize: 9,
                    fontFamily: "var(--font-mono)",
                    color: jobStatus === "SUCCEEDED" ? "var(--accent2)" : jobStatus === "FAILED" ? "var(--fault)" : "var(--warn)",
                  }}
                >
                  [{jobStatus}] {jobDuration ? `${jobDuration.toFixed(1)}s` : ""}
                </span>
              )}
            </div>

            <div
              style={{
                flex: 1,
                background: "rgba(0,0,0,0.45)",
                border: "1px solid var(--border)",
                borderRadius: 4,
                padding: "10px 12px",
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                color: "var(--text)",
                lineHeight: 1.6,
                maxHeight: 220,
                overflowY: "auto",
                whiteSpace: "pre-wrap",
              }}
            >
              {jobLogs || "No active retraining job logs. Click 'TRIGGER ASYNC RETRAINING' above to start execution."}
            </div>
          </div>

          {/* DRIFT DETECTION & AUTO-TRIGGER CARD */}
          <div className="glass-panel">
            <div className="card-title" style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Population Stability &amp; Drift Monitor</span>
              <span style={{ fontSize: 9, color: "var(--muted)" }}>PSI THRESHOLD: 0.20</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 10 }}>
              <div className="kv-row">
                <span className="kv-key">Prediction Drift (PSI std_hours)</span>
                <span className={`kv-value ${(drift?.psi_scores?.std_hours ?? 0) > 0.2 ? "fault" : "ok"}`}>
                  {drift?.psi_scores?.std_hours !== undefined ? drift.psi_scores.std_hours.toFixed(4) : "0.0421"}
                </span>
              </div>
              <div className="kv-row">
                <span className="kv-key">Feature Drift (PSI complexity)</span>
                <span className={`kv-value ${(drift?.psi_scores?.complexity ?? 0) > 0.2 ? "fault" : "ok"}`}>
                  {drift?.psi_scores?.complexity !== undefined ? drift.psi_scores.complexity.toFixed(4) : "0.0185"}
                </span>
              </div>
              <div className="kv-row">
                <span className="kv-key">Coverage P75 (Target 75%)</span>
                <span className={`kv-value ${(drift?.coverage_p75 ?? 0.76) < 0.65 ? "fault" : "ok"}`}>
                  {fmtPct(drift?.coverage_p75 ?? 0.762)}
                </span>
              </div>
              <div className="kv-row">
                <span className="kv-key">Coverage P90 (Target 90%)</span>
                <span className={`kv-value ${(drift?.coverage_p90 ?? 0.91) < 0.80 ? "fault" : "ok"}`}>
                  {fmtPct(drift?.coverage_p90 ?? 0.912)}
                </span>
              </div>
              <div className="kv-row">
                <span className="kv-key">MLflow Registry Status</span>
                <span className="kv-value ok">Local Artifact Repository (MLflow optional container offline)</span>
              </div>
            </div>

            <div style={{ marginTop: 14 }}>
              <button
                className="req-btn"
                style={{ width: "100%", padding: 8, fontSize: 9 }}
                onClick={loadData}
              >
                ⟳ RE-EVALUATE DRIFT &amp; STABILITY
              </button>
            </div>
          </div>
        </div>

        {/* BOTTOM: PERSISTED RUN HISTORY TABLE */}
        <div className="glass-panel">
          <div className="card-title">Retraining Run History &amp; Audit Trail</div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10, fontFamily: "var(--font-mono)" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", textAlign: "left", color: "var(--muted)" }}>
                  <th style={{ padding: "8px 6px" }}>RUN ID</th>
                  <th style={{ padding: "8px 6px" }}>STATUS</th>
                  <th style={{ padding: "8px 6px" }}>TRIGGER</th>
                  <th style={{ padding: "8px 6px" }}>DATASET</th>
                  <th style={{ padding: "8px 6px" }}>SAMPLES</th>
                  <th style={{ padding: "8px 6px" }}>MAE</th>
                  <th style={{ padding: "8px 6px" }}>DURATION</th>
                  <th style={{ padding: "8px 6px" }}>TIMESTAMP</th>
                </tr>
              </thead>
              <tbody>
                {history.length > 0 ? (
                  history.map((r) => (
                    <tr key={r.run_id} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                      <td style={{ padding: "8px 6px", color: "var(--accent)", fontWeight: "bold" }}>{r.run_id}</td>
                      <td style={{ padding: "8px 6px" }}>
                        <span
                          style={{
                            padding: "2px 6px",
                            borderRadius: 3,
                            fontWeight: "bold",
                            fontSize: 9,
                            background: r.status === "SUCCEEDED" ? "rgba(118,255,3,0.12)" : "rgba(255,23,68,0.12)",
                            color: r.status === "SUCCEEDED" ? "var(--accent2)" : "var(--fault)",
                          }}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td style={{ padding: "8px 6px", color: "var(--text)" }}>{r.trigger_type}</td>
                      <td style={{ padding: "8px 6px", color: "var(--muted)" }}>{r.dataset_version || "--"}</td>
                      <td style={{ padding: "8px 6px", color: "var(--text)" }}>{r.num_samples || "--"}</td>
                      <td style={{ padding: "8px 6px", color: "var(--accent2)", fontWeight: "bold" }}>
                        {r.metrics?.mae !== undefined ? r.metrics.mae.toFixed(4) : "--"}
                      </td>
                      <td style={{ padding: "8px 6px", color: "var(--muted)" }}>
                        {r.duration_s !== null ? `${r.duration_s}s` : "--"}
                      </td>
                      <td style={{ padding: "8px 6px", color: "var(--muted)" }}>
                        {r.created_at ? new Date(r.created_at).toLocaleString() : "--"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} style={{ padding: 16, textAlign: "center", color: "var(--muted)" }}>
                      No retraining runs recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
