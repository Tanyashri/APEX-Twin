"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import "../globals.css";

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

export default function AgentsDashboardPage() {
  const [timeStr, setTimeStr] = useState("--:--:--");
  const [isLightMode, setIsLightMode] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("hal-theme") === "light";
    }
    return false;
  });

  const [status, setStatus] = useState<AgentStatus | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [fixes, setFixes] = useState<Fix[]>([]);
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null);
  const [isTriggering, setIsTriggering] = useState(false);
  const [actionMsg, setActionMsg] = useState<{ text: string; type: "ok" | "err" } | null>(null);

  const pollRef = useRef<NodeJS.Timeout | null>(null);

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

  const fetchData = async () => {
    try {
      const [resStatus, resFind, resFix, resAct] = await Promise.all([
        fetch("http://127.0.0.1:8000/api/agents/status").then((r) => r.json()).catch(() => null),
        fetch("http://127.0.0.1:8000/api/agents/findings").then((r) => r.json()).catch(() => []),
        fetch("http://127.0.0.1:8000/api/agents/fixes").then((r) => r.json()).catch(() => []),
        fetch("http://127.0.0.1:8000/api/agents/activity").then((r) => r.json()).catch(() => []),
      ]);
      if (resStatus) setStatus(resStatus);
      if (Array.isArray(resFind)) setFindings(resFind);
      if (Array.isArray(resFix)) setFixes(resFix);
      if (Array.isArray(resAct)) setActivities(resAct);
    } catch {
      // offline fallback
    }
  };

  useEffect(() => {
    fetchData();
    pollRef.current = setInterval(fetchData, 4000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const handleTriggerCycle = async () => {
    setIsTriggering(true);
    setActionMsg(null);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/agents/cycle", { method: "POST" });
      const data = await res.json();
      setActionMsg({ text: data.message || "Cycle dispatched", type: "ok" });
      fetchData();
    } catch (err: any) {
      setActionMsg({ text: "Failed to trigger cycle: " + err.message, type: "err" });
    } finally {
      setIsTriggering(false);
    }
  };

  const accent = isLightMode ? "#0070f3" : "#00e5ff";
  const accentGreen = isLightMode ? "#16a34a" : "#76ff03";
  const accentWarn = isLightMode ? "#d97706" : "#ff9100";
  const textMuted = isLightMode ? "#64748b" : "#94a3b8";
  const borderCol = isLightMode ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.08)";
  const bgCard = isLightMode ? "#ffffff" : "#111418";

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)", paddingBottom: 60 }}>
      {/* TOPBAR */}
      <header className="topbar">
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div className="logo">
            APEX <span>//</span> AGENTS
          </div>
          <span style={{ fontSize: 10, color: textMuted, fontFamily: "var(--font-mono)", letterSpacing: 1 }}>
            AUTONOMOUS CHECK-AND-SUPPORT AGENTS (CHALLENGER &amp; CHAMPION)
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
            <div className={`status-dot ${status?.running_cycle ? "warn" : "healthy"}`} />
            <span>{status?.running_cycle ? "CYCLE IN PROGRESS" : "AGENTS ARMED &amp; STANDBY"}</span>
          </div>

          <Link href="/" className="req-btn" style={{ padding: "4px 10px", fontSize: 9, textDecoration: "none" }}>
            ← 3D DIGITAL TWIN
          </Link>
          <Link
            href="/models/retraining"
            className="req-btn"
            style={{ padding: "4px 10px", fontSize: 9, textDecoration: "none" }}
          >
            ⚙ AI RETRAINING
          </Link>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main style={{ maxWidth: 1400, margin: "64px auto 0 auto", padding: "0 24px" }}>
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
              {status?.llm_backend === "ollama" ? "Ollama (Local)" : status?.llm_backend === "hf" ? "Hugging Face" : "Configured"}
            </div>
            <div style={{ fontSize: 10, color: textMuted, marginTop: 2 }}>
              {status?.ollama_model || "qwen2.5-coder:7b"}
            </div>
          </div>

          <div className="dept-modal-card" style={{ padding: 14 }}>
            <div style={{ fontSize: 9, color: textMuted, letterSpacing: 1 }}>CHALLENGER TEST RUNS</div>
            <div style={{ fontSize: 16, fontWeight: "bold", color: "var(--text)", marginTop: 4, fontFamily: "var(--font-mono)" }}>
              {status?.total_runs || 0} Runs Completed
            </div>
            <div style={{ fontSize: 10, color: accentGreen, marginTop: 2 }}>
              pytest · API Probes · Invariants · Fuzzing
            </div>
          </div>

          <div className="dept-modal-card" style={{ padding: 14 }}>
            <div style={{ fontSize: 9, color: textMuted, letterSpacing: 1 }}>SYSTEM FINDINGS</div>
            <div style={{ fontSize: 16, fontWeight: "bold", color: status?.open_findings ? accentWarn : accentGreen, marginTop: 4, fontFamily: "var(--font-mono)" }}>
              {status?.open_findings || 0} Open / {status?.total_findings || 0} Total
            </div>
            <div style={{ fontSize: 10, color: textMuted, marginTop: 2 }}>
              Deduped &amp; Tracked in SQLite
            </div>
          </div>

          <div className="dept-modal-card" style={{ padding: 14 }}>
            <div style={{ fontSize: 9, color: textMuted, letterSpacing: 1 }}>CHAMPION FIXES GATED</div>
            <div style={{ fontSize: 16, fontWeight: "bold", color: accentGreen, marginTop: 4, fontFamily: "var(--font-mono)" }}>
              {status?.approved_fixes || 0} Approved / {status?.total_fixes || 0} Proposed
            </div>
            <div style={{ fontSize: 10, color: textMuted, marginTop: 2 }}>
              7-Gate Audit · Isolated Worktrees
            </div>
          </div>

          <div className="dept-modal-card" style={{ padding: 14, display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <button
              onClick={handleTriggerCycle}
              disabled={isTriggering || status?.running_cycle}
              className="req-btn"
              style={{
                background: status?.running_cycle ? "rgba(255, 145, 0, 0.2)" : "rgba(0, 229, 255, 0.15)",
                borderColor: status?.running_cycle ? accentWarn : accent,
                color: status?.running_cycle ? accentWarn : accent,
                padding: "8px 14px",
                fontSize: 11,
                fontWeight: "bold",
                cursor: status?.running_cycle ? "not-allowed" : "pointer",
              }}
            >
              {status?.running_cycle ? "⚡ CYCLE RUNNING..." : "▶ TRIGGER AGENT CYCLE"}
            </button>
            {actionMsg && (
              <div style={{ fontSize: 9, marginTop: 6, color: actionMsg.type === "ok" ? accentGreen : "var(--fault)", textAlign: "center" }}>
                {actionMsg.text}
              </div>
            )}
          </div>
        </div>

        {/* WORKFLOW DIAGRAM ARCHITECTURE PANEL */}
        <div className="dept-modal-card" style={{ padding: 20, marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: "bold", color: accent, letterSpacing: 1 }}>
              CHECK-AND-SUPPORT ARCHITECTURE // CLOSED-LOOP AUDIT &amp; FIX
            </div>
            <span style={{ fontSize: 10, color: textMuted, fontFamily: "var(--font-mono)" }}>
              Neither Agent is Trusted Blindly · Main Branch Protected
            </span>
          </div>

          {/* Workflow Interactive Nodes */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 14,
              position: "relative",
            }}
          >
            {/* Box 1: Challenger Tests */}
            <div
              style={{
                border: "1px solid #4f46e5",
                background: isLightMode ? "#eef2ff" : "rgba(79, 70, 229, 0.12)",
                padding: 14,
                borderRadius: 8,
              }}
            >
              <div style={{ fontSize: 9, color: "#818cf8", fontWeight: "bold", letterSpacing: 1 }}>
                STEP 01 // AUDITOR
              </div>
              <div style={{ fontSize: 13, fontWeight: "bold", color: "var(--text)", marginTop: 4 }}>
                Challenger tests the system
              </div>
              <div style={{ fontSize: 10, color: textMuted, marginTop: 4, lineHeight: 1.4 }}>
                Full pytest suite, FastAPI probe on throwaway SQLite DB, capacity &amp; quantile invariants, and LLM edge-case fuzzing.
              </div>
            </div>

            {/* Box 2: Finding Logged */}
            <div
              style={{
                border: `1px solid ${borderCol}`,
                background: isLightMode ? "#f8fafc" : "rgba(255, 255, 255, 0.03)",
                padding: 14,
                borderRadius: 8,
              }}
            >
              <div style={{ fontSize: 9, color: textMuted, fontWeight: "bold", letterSpacing: 1 }}>
                STEP 02 // DEDUPLICATION
              </div>
              <div style={{ fontSize: 13, fontWeight: "bold", color: "var(--text)", marginTop: 4 }}>
                Finding logged
              </div>
              <div style={{ fontSize: 10, color: textMuted, marginTop: 4, lineHeight: 1.4 }}>
                Deduped by SHA1 fingerprint, saved to SQLite (`agents.db`) and tail-friendly activity log (`activity.jsonl`).
              </div>
            </div>

            {/* Box 3: Champion Proposes Patch */}
            <div
              style={{
                border: "1px solid #059669",
                background: isLightMode ? "#ecfdf5" : "rgba(5, 150, 105, 0.12)",
                padding: 14,
                borderRadius: 8,
              }}
            >
              <div style={{ fontSize: 9, color: "#34d399", fontWeight: "bold", letterSpacing: 1 }}>
                STEP 03 // FIXER
              </div>
              <div style={{ fontSize: 13, fontWeight: "bold", color: "var(--text)", marginTop: 4 }}>
                Champion proposes patch
              </div>
              <div style={{ fontSize: 10, color: textMuted, marginTop: 4, lineHeight: 1.4 }}>
                Isolated git worktree (throwaway checkout). Search/replace edits with 60-line cap. Main is NEVER touched.
              </div>
            </div>

            {/* Box 4: Challenger Reviews Patch */}
            <div
              style={{
                border: "1px solid #4f46e5",
                background: isLightMode ? "#eef2ff" : "rgba(79, 70, 229, 0.12)",
                padding: 14,
                borderRadius: 8,
              }}
            >
              <div style={{ fontSize: 9, color: "#818cf8", fontWeight: "bold", letterSpacing: 1 }}>
                STEP 04 // 7-GATE AUDIT
              </div>
              <div style={{ fontSize: 13, fontWeight: "bold", color: "var(--text)", marginTop: 4 }}>
                Challenger reviews patch
              </div>
              <div style={{ fontSize: 10, color: textMuted, marginTop: 4, lineHeight: 1.4 }}>
                7 deterministic gates (Scope, Size, No Cheating, Target Fixed, No Regressions, Lint, LLM). Challenger CAN oppose!
              </div>
            </div>
          </div>

          {/* Opposed / Approved Split Banner */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 14,
              marginTop: 14,
            }}
          >
            <div
              style={{
                border: `1px solid ${borderCol}`,
                background: isLightMode ? "#fff1f2" : "rgba(244, 63, 94, 0.08)",
                padding: "10px 14px",
                borderRadius: 6,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <span style={{ fontSize: 11, fontWeight: "bold", color: "var(--fault)" }}>✕ IF OPPOSED</span>
                <span style={{ fontSize: 10, color: textMuted, marginLeft: 8 }}>
                  Objections fed back to Champion · Retry up to 3x · Escalate to human
                </span>
              </div>
            </div>

            <div
              style={{
                border: `1px solid ${borderCol}`,
                background: isLightMode ? "#f0fdf4" : "rgba(34, 197, 94, 0.08)",
                padding: "10px 14px",
                borderRadius: 6,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <span style={{ fontSize: 11, fontWeight: "bold", color: accentGreen }}>✓ IF APPROVED</span>
                <span style={{ fontSize: 10, color: textMuted, marginLeft: 8 }}>
                  Committed to isolated branch <code style={{ color: accent }}>agent/fix-N</code> · Re-verified next cycle
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* TWO-COLUMN LOWER SECTION: FINDINGS & FIXES + LIVE ACTIVITY STREAM */}
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 20 }}>
          {/* LEFT: FINDINGS & PROPOSED FIXES */}
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

            {/* FIXES & BRANCHES TABLE */}
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

          {/* RIGHT: COMMAND TERMINAL & REAL-TIME AUDIT STREAM */}
          <div>
            {/* TERMINAL QUICK COMMANDS */}
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

            {/* LIVE ACTIVITY AUDIT LOG */}
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
      </main>
    </div>
  );
}
