"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import "../globals.css";
import CapacityTrendChart from "../components/CapacityTrendChart";

interface AuditLog {
  id: string;
  entity_type: string;
  entity_id: string;
  parameter_name: string;
  old_value: string | null;
  new_value: string;
  actor: string;
  reason: string | null;
  created_at: string;
}

interface CapacityResult {
  gross_h: number;
  net_h: number;
  break_h: number;
  downtime_h: number;
  available_ws_h: number;
  availability: number;
  performance: number;
  quality: number;
  oee: number;
  effective_machine_capacity_h: number;
  labour_h: number;
  material_factor: number;
  usable_h: number;
  binding_constraint: string;
  explanation: string;
}

const DEFAULT_CAPACITY_PREVIEW: CapacityResult = {
  gross_h: 64.0,
  net_h: 60.0,
  break_h: 4.0,
  downtime_h: 0.0,
  available_ws_h: 60.0,
  availability: 1.0,
  performance: 0.9,
  quality: 0.98,
  oee: 0.882,
  effective_machine_capacity_h: 52.92,
  labour_h: 60.0,
  material_factor: 1.0,
  usable_h: 52.92,
  binding_constraint: "MACHINE_BOUND",
  explanation: "Line running nominal; workstation calendar (60.0h) sets upper bound.",
};

export default function PlanningParametersPage() {
  const [timeStr, setTimeStr] = useState("--:--:--");
  const [isLightMode, setIsLightMode] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("hal-theme") === "light";
    }
    return false;
  });

  // Parameter Form State
  const [shiftDuration, setShiftDuration] = useState<number>(8.0);
  const [breakHours, setBreakHours] = useState<number>(0.5);
  const [shiftsPerDay, setShiftsPerDay] = useState<number>(1);
  const [downtimeHours, setDowntimeHours] = useState<number>(0.0);
  const [presentWorkers, setPresentWorkers] = useState<number>(8);
  const [workerEfficiency, setWorkerEfficiency] = useState<number>(1.0);
  const [machineSpeed, setMachineSpeed] = useState<number>(0.90);
  const [firstPassYield, setFirstPassYield] = useState<number>(0.98);
  const [materialFactor, setMaterialFactor] = useState<number>(1.0);
  const [reason, setReason] = useState<string>("Operational adjustment");

  // Audit Logs & Live Capacity Preview
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [capacityPreview, setCapacityPreview] = useState<CapacityResult>(DEFAULT_CAPACITY_PREVIEW);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Sync theme and clock
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

  // Live Authoritative Capacity Preview calculation
  const recalculatePreview = useCallback(async () => {
    try {
      const res = await fetch("/api/capacity/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          num_workstations: 8,
          shift_duration_h: shiftDuration,
          break_h: breakHours,
          shifts_per_day: shiftsPerDay,
          downtime_h: downtimeHours,
          present_workers: presentWorkers,
          worker_efficiency: workerEfficiency,
          machine_speed_factor: machineSpeed,
          first_pass_yield: firstPassYield,
          material_factor: materialFactor,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setCapacityPreview(data);
      } else {
        // Fallback local estimation if server connection is delayed
        const gross = 8 * shiftDuration * shiftsPerDay;
        const net = gross - (breakHours * 8 * shiftsPerDay);
        const avail_ws = Math.max(0, net - downtimeHours);
        const avail = net > 0 ? avail_ws / net : 0;
        const oee = avail * machineSpeed * firstPassYield;
        const labour = presentWorkers * (shiftDuration - breakHours) * workerEfficiency;
        const usable = Math.min(avail_ws, labour) * machineSpeed * firstPassYield * materialFactor;
        setCapacityPreview({
          gross_h: gross,
          net_h: net,
          break_h: breakHours * 8,
          downtime_h: downtimeHours,
          available_ws_h: avail_ws,
          availability: avail,
          performance: machineSpeed,
          quality: firstPassYield,
          oee: oee,
          effective_machine_capacity_h: avail_ws * machineSpeed * firstPassYield,
          labour_h: labour,
          material_factor: materialFactor,
          usable_h: usable,
          binding_constraint: labour < avail_ws ? "LABOUR_BOUND" : "MACHINE_BOUND",
          explanation: labour < avail_ws
            ? `Labour capacity (${labour.toFixed(1)}h) restricts line output below machine potential (${avail_ws.toFixed(1)}h).`
            : `Workstation availability (${avail_ws.toFixed(1)}h) limits usable line throughput.`,
        });
      }
    } catch (e) {
      console.warn("Using local capacity estimation:", e);
    }
  }, [
    shiftDuration,
    breakHours,
    shiftsPerDay,
    downtimeHours,
    presentWorkers,
    workerEfficiency,
    machineSpeed,
    firstPassYield,
    materialFactor,
  ]);

  // Load existing parameters & audit history
  const loadInitialData = useCallback(async () => {
    try {
      const [paramRes, auditRes] = await Promise.all([
        fetch("/api/capacity/parameters"),
        fetch("/api/capacity/audit"),
      ]);

      if (paramRes.ok) {
        const data = await paramRes.json();
        const shift = data.shifts?.find((s: { code: string; break_h?: number; productive_h?: number }) => s.code === "S1" || s.code === "SHIFT-A") || data.shifts?.[0];
        if (shift) {
          const b = shift.break_h ?? 0.5;
          const prod = shift.productive_h ?? 7.5;
          setBreakHours(b);
          setShiftDuration(prod + b);
        }
      }
      if (auditRes.ok) {
        const logs = await auditRes.json();
        if (Array.isArray(logs)) {
          setAuditLogs(logs);
        }
      }
    } catch (e) {
      console.warn("Initial data load warning:", e);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadInitialData();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadInitialData]);

  useEffect(() => {
    const timer = setTimeout(() => {
      recalculatePreview();
    }, 0);
    return () => clearTimeout(timer);
  }, [recalculatePreview]);

  const handleSaveConfirmed = async () => {
    setShowConfirmModal(false);
    setIsSaving(true);
    setStatusMsg(null);
    try {
      const res = await fetch("/api/capacity/parameters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shift_code: "S1",
          shift_duration_h: shiftDuration,
          break_h: breakHours,
          shifts_per_day: shiftsPerDay,
          downtime_h: downtimeHours,
          present_workers: presentWorkers,
          worker_efficiency: workerEfficiency,
          machine_speed_factor: machineSpeed,
          first_pass_yield: firstPassYield,
          material_factor: materialFactor,
          actor: "lead_planner",
          reason: reason || "Manual planning parameters update",
        }),
      });

      if (!res.ok) {
        let errMsg = "Save failed";
        try {
          const errData = await res.json();
          errMsg = errData.detail || errMsg;
        } catch {
          errMsg = `Backend returned HTTP ${res.status}`;
        }
        setStatusMsg({ type: "err", text: errMsg });
      } else {
        const data = await res.json();
        setStatusMsg({
          type: "ok",
          text: `Parameters saved! Productive hours: ${data.updated_parameters?.productive_h ?? (shiftDuration - breakHours)}h. Capacity recalculated & logged to audit trail.`,
        });
        loadInitialData();
        recalculatePreview();
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Network error";
      setStatusMsg({ type: "err", text: msg });
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefaults = () => {
    setShiftDuration(8.0);
    setBreakHours(0.5);
    setShiftsPerDay(1);
    setDowntimeHours(0.0);
    setPresentWorkers(8);
    setWorkerEfficiency(1.0);
    setMachineSpeed(0.90);
    setFirstPassYield(0.98);
    setMaterialFactor(1.0);
    setReason("Reset to baseline factory standards");
    setStatusMsg({ type: "ok", text: "Form reset to factory default standards. Click 'SAVE' to apply." });
  };

  return (
    <div className="layout-container" style={{ overflowY: "auto", height: "100vh" }}>
      {/* TOPBAR */}
      <header className="topbar">
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div className="logo">APEX-Twin <span>{"//"}</span> Digital Twin</div>
          <span style={{ color: "var(--muted)", fontSize: 12 }}>|</span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--accent)" }}>
            PLANNING PARAMETERS &amp; CAPACITY CONTROL
          </span>
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

      {/* MAIN VIEW */}
      <main style={{ padding: "20px 24px 60px 24px", maxWidth: 1400, margin: "0 auto", width: "100%" }}>
        {statusMsg && (
          <div
            className="glass-panel"
            style={{
              marginBottom: 16,
              borderColor: statusMsg.type === "ok" ? "var(--accent2)" : "var(--fault)",
              background: statusMsg.type === "ok" ? "rgba(118,255,3,0.08)" : "rgba(255,23,68,0.08)",
              padding: 12,
            }}
          >
            <span
              style={{
                color: statusMsg.type === "ok" ? "var(--accent2)" : "var(--fault)",
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                fontWeight: "bold",
              }}
            >
              {statusMsg.type === "ok" ? "✓" : "⚠"} {statusMsg.text}
            </span>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(460px, 1fr))", gap: 20, marginBottom: 20 }}>
          
          {/* PARAMETER EDITING FORM */}
          <div className="glass-panel">
            <div className="card-title" style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Manual Operational Planning Parameters</span>
              <span style={{ fontSize: 9, color: "var(--muted)" }}>PERSISTED EDITING</span>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setShowConfirmModal(true);
              }}
              style={{ display: "flex", flexDirection: "column", gap: 14, fontSize: 11 }}
            >
              {/* SHIFT PARAMETERS */}
              <div style={{ background: "rgba(0,0,0,0.2)", padding: 12, borderRadius: 6, border: "1px solid var(--border)" }}>
                <div style={{ color: "var(--accent)", fontWeight: "bold", marginBottom: 8, fontSize: 10, textTransform: "uppercase" }}>
                  1. Shift &amp; Calendar Rules
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ color: "var(--muted)", display: "block", marginBottom: 4 }}>Shift Duration (Hours)</label>
                    <input
                      type="number"
                      step="0.5"
                      min="1"
                      max="24"
                      value={shiftDuration}
                      onChange={(e) => setShiftDuration(parseFloat(e.target.value) || 8.0)}
                      className="dept-chat-input"
                      style={{ width: "100%" }}
                    />
                  </div>
                  <div>
                    <label style={{ color: "var(--muted)", display: "block", marginBottom: 4 }}>Break Time (Hours)</label>
                    <input
                      type="number"
                      step="0.25"
                      min="0"
                      max={shiftDuration - 0.25}
                      value={breakHours}
                      onChange={(e) => setBreakHours(parseFloat(e.target.value) || 0.5)}
                      className="dept-chat-input"
                      style={{ width: "100%" }}
                    />
                  </div>
                </div>
                <div style={{ marginTop: 8, fontSize: 10, color: "var(--accent2)" }}>
                  Net Productive Hours per Worker: {(shiftDuration - breakHours).toFixed(2)}h
                </div>
              </div>

              {/* MACHINE & WORKSTATION PARAMETERS */}
              <div style={{ background: "rgba(0,0,0,0.2)", padding: 12, borderRadius: 6, border: "1px solid var(--border)" }}>
                <div style={{ color: "var(--accent)", fontWeight: "bold", marginBottom: 8, fontSize: 10, textTransform: "uppercase" }}>
                  2. Workstations &amp; Equipment Downtime
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ color: "var(--muted)", display: "block", marginBottom: 4 }}>Downtime / Maintenance (Hours)</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={downtimeHours}
                      onChange={(e) => setDowntimeHours(parseFloat(e.target.value) || 0.0)}
                      className="dept-chat-input"
                      style={{ width: "100%" }}
                    />
                  </div>
                  <div>
                    <label style={{ color: "var(--muted)", display: "block", marginBottom: 4 }}>Machine Speed Factor (OEE Perf)</label>
                    <input
                      type="number"
                      step="0.05"
                      min="0.3"
                      max="1.5"
                      value={machineSpeed}
                      onChange={(e) => setMachineSpeed(parseFloat(e.target.value) || 0.9)}
                      className="dept-chat-input"
                      style={{ width: "100%" }}
                    />
                  </div>
                </div>
              </div>

              {/* LABOUR & HEADCOUNT */}
              <div style={{ background: "rgba(0,0,0,0.2)", padding: 12, borderRadius: 6, border: "1px solid var(--border)" }}>
                <div style={{ color: "var(--accent)", fontWeight: "bold", marginBottom: 8, fontSize: 10, textTransform: "uppercase" }}>
                  3. Workforce &amp; Staffing Availability
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ color: "var(--muted)", display: "block", marginBottom: 4 }}>Present Workers (Headcount)</label>
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={presentWorkers}
                      onChange={(e) => setPresentWorkers(parseInt(e.target.value, 10) || 8)}
                      className="dept-chat-input"
                      style={{ width: "100%" }}
                    />
                  </div>
                  <div>
                    <label style={{ color: "var(--muted)", display: "block", marginBottom: 4 }}>Worker Efficiency Factor</label>
                    <input
                      type="number"
                      step="0.05"
                      min="0.5"
                      max="1.5"
                      value={workerEfficiency}
                      onChange={(e) => setWorkerEfficiency(parseFloat(e.target.value) || 1.0)}
                      className="dept-chat-input"
                      style={{ width: "100%" }}
                    />
                  </div>
                </div>
              </div>

              {/* MATERIALS & QUALITY */}
              <div style={{ background: "rgba(0,0,0,0.2)", padding: 12, borderRadius: 6, border: "1px solid var(--border)" }}>
                <div style={{ color: "var(--accent)", fontWeight: "bold", marginBottom: 8, fontSize: 10, textTransform: "uppercase" }}>
                  4. Materials &amp; First Pass Yield (Quality)
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ color: "var(--muted)", display: "block", marginBottom: 4 }}>Material On-Hand Share (0.0 - 1.0)</label>
                    <input
                      type="number"
                      step="0.05"
                      min="0"
                      max="1"
                      value={materialFactor}
                      onChange={(e) => setMaterialFactor(parseFloat(e.target.value) || 1.0)}
                      className="dept-chat-input"
                      style={{ width: "100%" }}
                    />
                  </div>
                  <div>
                    <label style={{ color: "var(--muted)", display: "block", marginBottom: 4 }}>First Pass Yield (FPY)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.5"
                      max="1"
                      value={firstPassYield}
                      onChange={(e) => setFirstPassYield(parseFloat(e.target.value) || 0.98)}
                      className="dept-chat-input"
                      style={{ width: "100%" }}
                    />
                  </div>
                </div>
              </div>

              {/* REASON / AUDIT NOTE */}
              <div>
                <label style={{ color: "var(--muted)", display: "block", marginBottom: 4 }}>Operational Change Rationale (Audit Record)</label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Added 0.5h shift overtime to clear assembly bottleneck"
                  className="dept-chat-input"
                  style={{ width: "100%" }}
                  required
                />
              </div>

              {/* ACTION BUTTONS */}
              <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                <button type="submit" className="req-btn solid" style={{ flex: 1 }} disabled={isSaving}>
                  {isSaving ? "SAVING..." : "💾 SAVE & APPLY PARAMETERS"}
                </button>
                <button type="button" className="req-btn" onClick={handleResetDefaults}>
                  ↺ RESET DEFAULTS
                </button>
              </div>
            </form>
          </div>

          {/* RIGHT: LIVE RECALCULATED CAPACITY PREVIEW */}
          <div className="glass-panel" style={{ display: "flex", flexDirection: "column" }}>
            <div className="card-title" style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Live Authoritative Capacity Preview</span>
              <span style={{ fontSize: 9, color: "var(--accent)" }}>OEE DECOMPOSITION</span>
            </div>

            {capacityPreview && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div className="metric-group">
                  <div className="big-metric">
                    <span className="big-num" style={{ fontSize: 24, color: "var(--accent)" }}>
                      {capacityPreview.usable_h.toFixed(1)}h
                    </span>
                    <span className="big-label">Usable Capacity</span>
                  </div>
                  <div className="big-metric">
                    <span className="big-num" style={{ fontSize: 24, color: "var(--accent2)" }}>
                      {(capacityPreview.oee * 100).toFixed(1)}%
                    </span>
                    <span className="big-label">Line OEE</span>
                  </div>
                  <div className="big-metric">
                    <span className="big-num" style={{ fontSize: 24, color: "var(--warn)" }}>
                      {(capacityPreview.availability * 100).toFixed(1)}%
                    </span>
                    <span className="big-label">Availability</span>
                  </div>
                </div>

                <div style={{ background: "rgba(0,0,0,0.3)", padding: 12, borderRadius: 6, border: "1px solid var(--border)", fontSize: 10 }}>
                  <div style={{ color: "var(--accent)", fontWeight: "bold", marginBottom: 6 }}>
                    BINDING BOTTLENECK: {capacityPreview.binding_constraint}
                  </div>
                  <div style={{ color: "var(--text)", lineHeight: 1.5 }}>
                    {capacityPreview.explanation}
                  </div>
                </div>

                {/* Simulated 7-day capacity vs demand horizon with adjusted parameters */}
                <div style={{ background: "rgba(0,0,0,0.25)", padding: 12, borderRadius: 6, border: "1px solid var(--border)" }}>
                  <CapacityTrendChart
                    title="Planning Horizon Impact"
                    subtitle="7-Day Shift Simulation"
                    isLightMode={isLightMode}
                    height={130}
                    unit="h"
                    showActual={true}
                    data={[
                      { label: "Mon", capacity: capacityPreview.usable_h, demand: 48.0, actual: Math.min(capacityPreview.usable_h, 48.0) },
                      { label: "Tue", capacity: capacityPreview.usable_h, demand: 52.0, actual: Math.min(capacityPreview.usable_h, 51.5) },
                      { label: "Wed", capacity: capacityPreview.usable_h, demand: 55.0, actual: Math.min(capacityPreview.usable_h, 53.0) },
                      { label: "Thu", capacity: capacityPreview.usable_h, demand: 50.0, actual: Math.min(capacityPreview.usable_h, 49.5) },
                      { label: "Fri", capacity: capacityPreview.usable_h, demand: 58.0, actual: Math.min(capacityPreview.usable_h, 54.0) },
                      { label: "Sat", capacity: capacityPreview.usable_h * 0.75, demand: 38.0, actual: Math.min(capacityPreview.usable_h * 0.75, 37.5) },
                      { label: "Sun", capacity: capacityPreview.usable_h * 0.5, demand: 25.0, actual: Math.min(capacityPreview.usable_h * 0.5, 25.0) },
                    ]}
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 10 }}>
                  <div className="kv-row">
                    <span className="kv-key">Gross Hours (8 Workstations)</span>
                    <span className="kv-value">{capacityPreview.gross_h} h</span>
                  </div>
                  <div className="kv-row">
                    <span className="kv-key">Net Productive Hours (After Breaks)</span>
                    <span className="kv-value ok">{capacityPreview.net_h} h</span>
                  </div>
                  <div className="kv-row">
                    <span className="kv-key">Available Machine Hours (After Downtime)</span>
                    <span className="kv-value">{capacityPreview.available_ws_h} h</span>
                  </div>
                  <div className="kv-row">
                    <span className="kv-key">Total Active Labour Hours</span>
                    <span className="kv-value ok">{capacityPreview.labour_h} h</span>
                  </div>
                  <div className="kv-row">
                    <span className="kv-key">Decomposed OEE</span>
                    <span className="kv-value ok">
                      {(capacityPreview.availability * 100).toFixed(1)}% (Avail) × {(capacityPreview.performance * 100).toFixed(0)}% (Perf) × {(capacityPreview.quality * 100).toFixed(0)}% (Qual)
                    </span>
                  </div>
                  <div className="kv-row">
                    <span className="kv-key">Material Availability Factor</span>
                    <span className={`kv-value ${capacityPreview.material_factor < 1.0 ? "warn" : "ok"}`}>
                      {(capacityPreview.material_factor * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* BOTTOM: AUDIT HISTORY */}
        <div className="glass-panel">
          <div className="card-title">Parameter Modification Audit Trail</div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10, fontFamily: "var(--font-mono)" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", textAlign: "left", color: "var(--muted)" }}>
                  <th style={{ padding: "8px 6px" }}>TIMESTAMP</th>
                  <th style={{ padding: "8px 6px" }}>ENTITY</th>
                  <th style={{ padding: "8px 6px" }}>PARAMETER</th>
                  <th style={{ padding: "8px 6px" }}>OLD VALUE</th>
                  <th style={{ padding: "8px 6px" }}>NEW VALUE</th>
                  <th style={{ padding: "8px 6px" }}>ACTOR</th>
                  <th style={{ padding: "8px 6px" }}>RATIONALE</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.length > 0 ? (
                  auditLogs.map((l) => (
                    <tr key={l.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                      <td style={{ padding: "8px 6px", color: "var(--muted)" }}>
                        {l.created_at ? new Date(l.created_at).toLocaleString() : "--"}
                      </td>
                      <td style={{ padding: "8px 6px", color: "var(--text)" }}>{l.entity_type}</td>
                      <td style={{ padding: "8px 6px", color: "var(--accent)", fontWeight: "bold" }}>{l.parameter_name}</td>
                      <td style={{ padding: "8px 6px", color: "var(--muted)" }}>{l.old_value || "--"}</td>
                      <td style={{ padding: "8px 6px", color: "var(--accent2)", fontWeight: "bold" }}>{l.new_value}</td>
                      <td style={{ padding: "8px 6px", color: "var(--text)" }}>{l.actor}</td>
                      <td style={{ padding: "8px 6px", color: "var(--muted)" }}>{l.reason || "--"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} style={{ padding: 16, textAlign: "center", color: "var(--muted)" }}>
                      No planning adjustments logged yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* CONFIRMATION MODAL */}
        {showConfirmModal && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 100,
              background: "rgba(0,8,18,0.85)",
              backdropFilter: "blur(8px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div className="glass-panel" style={{ maxWidth: 480, width: "90%", borderColor: "var(--warn)" }}>
              <div className="card-title" style={{ color: "var(--warn)" }}>
                ⚠ Confirm Consequential Planning Adjustment
              </div>
              <p style={{ fontSize: 11, lineHeight: 1.6, marginBottom: 16, color: "var(--text)" }}>
                Applying these parameters will update baseline operational calendars, recalculate load distributions, and affect schedule feasibility.
              </p>
              <div style={{ fontSize: 10, fontFamily: "var(--font-mono)", marginBottom: 16, color: "var(--muted)" }}>
                • Shift Productive Time: {(shiftDuration - breakHours).toFixed(1)}h<br />
                • Active Workers: {presentWorkers}<br />
                • Equipment Downtime: {downtimeHours}h<br />
                • Material Availability: {(materialFactor * 100).toFixed(0)}%
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button className="req-btn solid" style={{ flex: 1 }} onClick={handleSaveConfirmed}>
                  ✓ CONFIRM &amp; SAVE
                </button>
                <button className="req-btn" style={{ flex: 1 }} onClick={() => setShowConfirmModal(false)}>
                  CANCEL
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
