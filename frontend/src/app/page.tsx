"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import "./globals.css";
import DepartmentControlPanel from "./components/DepartmentControlPanel";
import CapacityTrendChart from "./components/CapacityTrendChart";

const Factory3D = dynamic(() => import("./components/Factory3D"), { ssr: false });

export interface TestCaseScenario {
  id: string;
  name: string;
  badge: string;
  badgeColor: string;
  description: string;
  rootCause: string;
  solution: string;
  capacity: {
    logistics: number;
    stamping: number;
    welding: number;
    paint: number;
    powertrain: number;
    assembly: number;
    quality: number;
  };
  metrics: {
    carsPerShift: number;
    yieldRate: string;
    scheduleAdherence: string;
    onTimeDelivery: string;
    avgTakt: string;
    taktStatus: "ok" | "warn" | "fault";
    chokePoint: string;
    chokeColor: string;
  };
  shiftWorkers: {
    logistics: number;
    stamping: number;
    welding: number;
    paint: number;
    powertrain: number;
    assembly: number;
    quality: number;
  };
}

export const TEST_CASES: TestCaseScenario[] = [
  {
    id: "TC-01",
    name: "Scenario 1: Baseline Nominal (Balanced Line)",
    badge: "PASS // 100% BALANCED",
    badgeColor: "var(--accent2)",
    description: "All 7 manufacturing lines synchronized at ideal takt time (58s). Zero starved buffers, minimal WIP queue.",
    rootCause: "None. All lines operating within target standard deviation.",
    solution: "Maintain current shift allocation and prevent buffer build-up.",
    capacity: { logistics: 80, stamping: 82, welding: 84, paint: 78, powertrain: 80, assembly: 82, quality: 84 },
    metrics: {
      carsPerShift: 68,
      yieldRate: "98.6%",
      scheduleAdherence: "96%",
      onTimeDelivery: "97%",
      avgTakt: "58 sec",
      taktStatus: "ok",
      chokePoint: "NONE (SYNCHRONIZED)",
      chokeColor: "var(--accent2)",
    },
    shiftWorkers: { logistics: 6, stamping: 8, welding: 10, paint: 7, powertrain: 8, assembly: 18, quality: 8 },
  },
  {
    id: "TC-02",
    name: "Scenario 2: Critical Marriage Choke (Assembly Bottleneck)",
    badge: "FAIL // BOTTLENECK ACTIVE",
    badgeColor: "var(--fault)",
    description: "Final Assembly marriage station choked at 98% utilization while upstream battery integration is starved at 40%.",
    rootCause: "WIP queue exceeds 16 min at marriage station due to starved high-voltage battery delivery.",
    solution: "Loan 2 robotics technicians from Body Welding -> Powertrain/Assembly to balance takt.",
    capacity: { logistics: 78, stamping: 85, welding: 92, paint: 75, powertrain: 40, assembly: 98, quality: 82 },
    metrics: {
      carsPerShift: 59,
      yieldRate: "98.4%",
      scheduleAdherence: "84%",
      onTimeDelivery: "74%",
      avgTakt: "74 sec",
      taktStatus: "fault",
      chokePoint: "MARRIAGE STATION (ASSY)",
      chokeColor: "var(--fault)",
    },
    shiftWorkers: { logistics: 6, stamping: 8, welding: 12, paint: 7, powertrain: 6, assembly: 18, quality: 8 },
  },
  {
    id: "TC-03",
    name: "Scenario 3: Hydraulic Stamping Die Breakdown",
    badge: "CRITICAL // STAMPING DIE CHOKE",
    badgeColor: "var(--warn)",
    description: "Press #2 stamping die worn down. Door skin panel buffer choked at 96% load with high scrap rate.",
    rootCause: "Unscheduled die maintenance required (+1.2h downtime). Downstream Body Welding starved.",
    solution: "Route stamped panels through Die Bed 3 and initiate urgent die maintenance swap.",
    capacity: { logistics: 85, stamping: 97, welding: 48, paint: 55, powertrain: 75, assembly: 60, quality: 70 },
    metrics: {
      carsPerShift: 44,
      yieldRate: "94.1%",
      scheduleAdherence: "68%",
      onTimeDelivery: "62%",
      avgTakt: "88 sec",
      taktStatus: "fault",
      chokePoint: "PRESS #2 DIE BED (STAMP)",
      chokeColor: "var(--fault)",
    },
    shiftWorkers: { logistics: 6, stamping: 10, welding: 8, paint: 7, powertrain: 8, assembly: 16, quality: 8 },
  },
  {
    id: "TC-04",
    name: "Scenario 4: High-Demand EV Overtime Surge (+20% Volume)",
    badge: "SURGE // HIGH THROUGHPUT",
    badgeColor: "var(--accent)",
    description: "High-volume fleet order for EV-SEDAN GT. Plant pushed to maximum rated capacity across all cells.",
    rootCause: "Demand exceeds baseline capacity by 18 hours/day across all lines.",
    solution: "Activate second 8h shift and add 4 overtime operators per department.",
    capacity: { logistics: 92, stamping: 94, welding: 91, paint: 89, powertrain: 92, assembly: 93, quality: 90 },
    metrics: {
      carsPerShift: 82,
      yieldRate: "97.8%",
      scheduleAdherence: "91%",
      onTimeDelivery: "93%",
      avgTakt: "52 sec",
      taktStatus: "ok",
      chokePoint: "LINE RUNNING HOT (SURGE)",
      chokeColor: "var(--warn)",
    },
    shiftWorkers: { logistics: 8, stamping: 10, welding: 14, paint: 9, powertrain: 10, assembly: 22, quality: 10 },
  },
];

export default function TwinDashboard() {
  const [activeDept, setActiveDept] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<"orders" | "shift" | "overview" | "predictions" | "testcases" | null>(null);
  const [selectedTestCase, setSelectedTestCase] = useState<string>("TC-02"); // default is the bottleneck demo
  const [timeStr, setTimeStr] = useState("--:--:--");
  const [isLightMode, setIsLightMode] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("hal-theme") === "light";
    }
    return false;
  });

  const [simulated, setSimulated] = useState(false);

  // Active scenario data
  const currentScenario = TEST_CASES.find((tc) => tc.id === selectedTestCase) || TEST_CASES[1];

  // Dynamic capacity utilization derived from test case and simulation toggle
  const capacity = simulated
    ? {
        logistics: 80,
        stamping: 82,
        welding: 84,
        paint: 78,
        powertrain: 78,
        assembly: 82,
        quality: 84,
      }
    : currentScenario.capacity;

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

  const getStatus = (val: number) => (val < 70 ? "underload" : val > 95 ? "overload" : "healthy");
  const fmtStatus = (val: number) => (val < 70 ? "UNDERLOAD" : val > 95 ? "OVERLOAD" : "HEALTHY");
  const gaugeColor = (val: number) => (val > 95 ? "var(--fault)" : val < 70 ? "var(--warn)" : "var(--accent)");

  const DEPTS = [
    { label: "LOGISTICS",  title: "STAMPING & LOGISTICS", val: capacity.logistics },
    { label: "STAMPING",   title: "PRESS & STAMPING",     val: capacity.stamping },
    { label: "WELDING",    title: "BODY WELDING",         val: capacity.welding },
    { label: "PAINT",      title: "PAINT & SURFACE",      val: capacity.paint },
    { label: "POWERTRAIN", title: "BATTERY & POWERTRAIN", val: capacity.powertrain },
    { label: "QUALITY",    title: "QUALITY & DYNAMO",     val: capacity.quality },
  ];

  return (
    <div className="layout-container">
      {/* TOPBAR */}
      <header className="topbar">
        <div className="logo">
          APEX-Twin <span>{"//"}</span> Digital Twin Plant
        </div>

        {/* TEST CASES & NAVIGATION CONTROLS */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* TEST CASES QUICK SELECTOR BUTTON */}
          <button
            onClick={() => setActiveModal("testcases")}
            className="req-btn"
            style={{
              padding: "4px 12px",
              fontSize: 9,
              background: "rgba(0, 229, 255, 0.15)",
              border: "1px solid var(--accent)",
              color: "var(--accent)",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
            title="Switch between pre-configured operational test cases"
          >
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: currentScenario.badgeColor }} />
            <span>TEST CASES: {currentScenario.id}</span>
            <span style={{ fontSize: 8, opacity: 0.7 }}>[CLICK TO SWITCH]</span>
          </button>

          <div className="status-pill">
            <div className="status-dot healthy" />
            <span>MES TELEMETRY LIVE</span>
          </div>

          <Link
            href="/agents"
            className="req-btn"
            style={{ padding: "4px 12px", fontSize: 9, textDecoration: "none", borderColor: "var(--accent)", color: "var(--accent)", fontWeight: "bold" }}
            title="Unified AI & Autonomous Intelligence (Agents + Predictive MLOps)"
          >
            🤖 AI &amp; AUTONOMOUS INTELLIGENCE
          </Link>

          <Link
            href="/parameters"
            className="req-btn"
            style={{ padding: "4px 10px", fontSize: 9, textDecoration: "none" }}
            title="Manual Line Parameters (Shifts, Robotics, Downtime)"
          >
            ⚙ LINE PARAMETERS
          </Link>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            className="theme-btn"
            id="theme-toggle-btn"
            onClick={toggleTheme}
            title={isLightMode ? "Switch to Dark Mode" : "Switch to Light Mode"}
            aria-label="Toggle theme"
          >
            {isLightMode ? "🌙" : "☀️"}
          </button>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--muted)", letterSpacing: 1 }}>{timeStr}</span>
        </div>
      </header>

      {/* LEFT PANEL */}
      <aside className="side-panel fade-in">
        {/* Plant Overview Card (Clickable) */}
        <div
          className="glass-panel"
          style={{ cursor: "pointer" }}
          onClick={() => setActiveModal("overview")}
          title="Click to inspect Plant Yield & OEE Breakdown"
        >
          <div className="card-title" style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Plant Overview</span>
            <span style={{ fontSize: 8, color: "var(--muted)" }}>EXPAND ↗</span>
          </div>
          <div className="metric-group">
            <div className="big-metric">
              <span className="big-num" style={{ fontSize: 26, color: "var(--accent)" }}>
                {simulated ? "68" : currentScenario.metrics.carsPerShift}
              </span>
              <span className="big-label">Cars / Shift</span>
            </div>
            <div className="big-metric">
              <span className="big-num" style={{ fontSize: 26, color: "var(--accent2)" }}>
                {currentScenario.metrics.yieldRate}
              </span>
              <span className="big-label">First Pass Yield</span>
            </div>
          </div>
          <div className="gauge-container">
            <div className="gauge-header">
              <span>Overall Schedule Adherence</span>
              <span className="gauge-value">{simulated ? "96%" : currentScenario.metrics.scheduleAdherence}</span>
            </div>
            <div className="gauge-track">
              <div
                className="gauge-fill"
                style={{ width: simulated ? "96%" : currentScenario.metrics.scheduleAdherence }}
              />
            </div>
          </div>
        </div>

        {/* 7-Department Production Lines Grid */}
        <div className="glass-panel">
          <div className="card-title">Production Lines (7 Depts)</div>
          <div className="dept-grid">
            {DEPTS.map((d) => (
              <div
                key={d.label}
                className="dept-card"
                onClick={() => setActiveDept(d.label)}
                title={`Click to open ${d.title} line inspector`}
                style={{ cursor: "pointer" }}
              >
                <span className="dept-card-header">{d.label}</span>
                <span className={`dept-status ${getStatus(d.val)}`}>{fmtStatus(d.val)}</span>
                <div className="gauge-track" style={{ marginTop: 2 }}>
                  <div
                    className="gauge-fill"
                    style={{ width: `${d.val}%`, background: gaugeColor(d.val), boxShadow: `0 0 8px ${gaugeColor(d.val)}` }}
                  />
                </div>
              </div>
            ))}
            {/* Final Assembly Marriage Choke Point */}
            <div
              className="dept-card"
              style={{
                gridColumn: "span 2",
                borderColor: simulated ? "rgba(118,255,3,0.35)" : capacity.assembly > 95 ? "rgba(255,23,68,0.35)" : "rgba(0,229,255,0.35)",
                background: simulated ? "rgba(118,255,3,0.04)" : capacity.assembly > 95 ? "rgba(255,23,68,0.04)" : "rgba(0,229,255,0.04)",
                cursor: "pointer",
              }}
              onClick={() => setActiveDept("ASSEMBLY")}
              title="Click to inspect Final Assembly Line & Marriage Station"
            >
              <span className="dept-card-header" style={{ color: simulated ? "var(--accent2)" : capacity.assembly > 95 ? "var(--fault)" : "var(--accent)" }}>
                FINAL ASSEMBLY
              </span>
              <span className={`dept-status ${getStatus(capacity.assembly)}`}>
                {fmtStatus(capacity.assembly)} {simulated ? "— BALANCED" : capacity.assembly > 95 ? "— CHOKE POINT" : "— NOMINAL"}
              </span>
              <div className="gauge-track" style={{ marginTop: 2, height: 8 }}>
                <div
                  className="gauge-fill"
                  style={{
                    width: `${capacity.assembly}%`,
                    background: simulated ? "var(--accent2)" : capacity.assembly > 95 ? "var(--fault)" : "var(--accent)",
                    boxShadow: `0 0 8px ${simulated ? "var(--accent2)" : capacity.assembly > 95 ? "var(--fault)" : "var(--accent)"}`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Active Vehicle Build Orders (Clickable) */}
        <div
          className="glass-panel"
          style={{ cursor: "pointer" }}
          onClick={() => setActiveModal("orders")}
          title="Click to view full Vehicle BOM Manufacturing Table"
        >
          <div className="card-title" style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Active Vehicle Orders</span>
            <span style={{ fontSize: 8, color: "var(--muted)" }}>PARTS TABLE ↗</span>
          </div>
          {[
            { id: "VIN-GT401", model: "EV-SEDAN GT", pct: 78, color: "var(--accent)" },
            { id: "VIN-SUV802", model: "SUV-HYBRID X", pct: 52, color: "var(--accent2)" },
            { id: "VIN-TRK903", model: "TRUCK-EV TITAN", pct: 24, color: "var(--warn)" },
          ].map((o) => (
            <div key={o.id} style={{ marginBottom: 10 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  marginBottom: 4,
                }}
              >
                <span style={{ color: "var(--accent)" }}>{o.id}</span>
                <span style={{ color: "var(--muted)" }}>{o.model}</span>
                <span style={{ color: o.color, fontWeight: "bold" }}>{o.pct}%</span>
              </div>
              <div className="gauge-track">
                <div className="gauge-fill" style={{ width: `${o.pct}%`, background: o.color, boxShadow: `0 0 8px ${o.color}` }} />
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* CENTER VIEWPORT (3D AUTOMOTIVE TWIN WITH 7 DEPARTMENTS) */}
      <main className="viewport" style={{ position: "relative" }}>
        <Factory3D onPodClick={setActiveDept} isLightMode={isLightMode} />
        {activeDept && (
          <DepartmentControlPanel
            dept={activeDept}
            onClose={() => setActiveDept(null)}
            isLightMode={isLightMode}
            onToggleTheme={toggleTheme}
          />
        )}
        <div className="controls-hint">DRAG to rotate · SCROLL to zoom · CLICK [TEST CASES] at top to toggle test modes</div>
      </main>

      {/* RIGHT PANEL */}
      <aside className="side-panel fade-in" style={{ animationDelay: "0.2s" }}>
        {/* Test Case Status & Action Card */}
        <div className="glass-panel" style={{ borderColor: simulated ? "rgba(118,255,3,0.3)" : "rgba(255,23,68,0.25)" }}>
          <div className="card-title" style={{ color: simulated ? "var(--accent2)" : currentScenario.badgeColor, display: "flex", justifyContent: "space-between" }}>
            <span>{simulated ? "Line Choke Cleared" : currentScenario.id}</span>
            <span style={{ fontSize: 8 }}>{currentScenario.badge}</span>
          </div>
          <div
            style={{
              color: simulated ? "var(--accent2)" : currentScenario.badgeColor,
              fontFamily: "var(--font-mono)",
              fontWeight: "bold",
              marginBottom: 6,
              fontSize: 11,
            }}
          >
            {simulated ? "Final Assembly → BALANCED (82% Load)" : currentScenario.name}
          </div>
          <div style={{ color: "var(--muted)", fontSize: 10, marginBottom: 10, lineHeight: 1.6 }}>
            {simulated
              ? "Reallocated operators and adjusted takt time. Line synchronized without starving buffers."
              : currentScenario.description}
          </div>
          <div
            style={{
              background: simulated ? "rgba(118,255,3,0.06)" : "rgba(255,23,68,0.06)",
              border: `1px solid ${simulated ? "rgba(118,255,3,0.2)" : "rgba(255,23,68,0.2)"}`,
              borderRadius: 6,
              padding: "8px 10px",
              fontSize: 10,
              marginBottom: 12,
            }}
          >
            <div style={{ color: "var(--warn)", fontFamily: "var(--font-mono)", marginBottom: 4 }}>
              RECOMMENDED AI ACTION:
            </div>
            <div style={{ color: "var(--text)" }}>
              {simulated
                ? "✓ Optimal solution executed. Throughput restored to target."
                : currentScenario.solution}
            </div>
          </div>
          <button
            className="req-btn solid"
            style={{
              width: "100%",
              padding: 10,
              fontSize: 10,
              background: simulated ? "var(--accent2)" : undefined,
              color: simulated ? "#000" : undefined,
            }}
            onClick={() => setSimulated((prev) => !prev)}
          >
            {simulated ? "✓ SOLUTION ACTIVE — RESET SCENARIO" : "▶ SIMULATE BALANCING SOLUTION"}
          </button>
        </div>

        {/* Predictions & Capacity Trend Graph (Clickable) */}
        <div
          className="glass-panel"
          style={{ cursor: "pointer" }}
          onClick={() => setActiveModal("predictions")}
          title="Click to view extended AI Predictions & Quantile Forecast"
        >
          <div className="card-title" style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Predictions &amp; Trends</span>
            <span style={{ fontSize: 8, color: "var(--muted)" }}>EXPAND ↗</span>
          </div>
          <div style={{ marginBottom: 12 }}>
            <CapacityTrendChart
              title="Plant Horizon"
              subtitle="7-Day Vehicle Takt (h)"
              isLightMode={isLightMode}
              height={115}
              unit="h"
              showActual={true}
              data={[
                { label: "D1", capacity: 86.5, demand: 71.0, actual: 70.2 },
                { label: "D2", capacity: 86.5, demand: 77.2, actual: 74.0 },
                { label: "D3", capacity: 86.5, demand: simulated ? 72.0 : 80.3, actual: 74.2 },
                { label: "D4", capacity: simulated ? 88.0 : 69.5, demand: 62.8, actual: simulated ? 62.8 : 58.0 },
                { label: "D5", capacity: 86.5, demand: simulated ? 74.0 : 79.6, actual: 73.1 },
                { label: "D6", capacity: 86.5, demand: 75.7, actual: 72.7 },
                { label: "D7", capacity: 86.5, demand: 69.1, actual: 67.6 },
              ]}
            />
          </div>
          {[
            { label: "On-Time Delivery", val: simulated ? "96%" : currentScenario.metrics.onTimeDelivery, st: simulated ? "ok" : "warn" },
            { label: "Takt Time (EV-SEDAN)", val: simulated ? "58 sec" : currentScenario.metrics.avgTakt, st: simulated ? "ok" : currentScenario.metrics.taktStatus },
            { label: "Chassis Choke Risk", val: simulated ? "P90: LOW" : currentScenario.id === "TC-01" ? "P90: LOW" : "P90: HIGH", st: simulated || currentScenario.id === "TC-01" ? "ok" : "fault" },
            { label: "Stamping Cap", val: `${capacity.stamping}%`, st: "ok" },
          ].map((p) => (
            <div key={p.label} className="kv-row">
              <span className="kv-key">{p.label}</span>
              <span className={`kv-value ${p.st}`}>{p.val}</span>
            </div>
          ))}
        </div>

        {/* Current Shift Staffing Card (Clickable) */}
        <div
          className="glass-panel"
          style={{ cursor: "pointer" }}
          onClick={() => setActiveModal("shift")}
          title="Click to view Shift Roster & Operator Allocation"
        >
          <div className="card-title" style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Current Shift (S1)</span>
            <span style={{ fontSize: 8, color: "var(--muted)" }}>ROSTER ↗</span>
          </div>
          {[
            { dept: "LOGISTICS", w: currentScenario.shiftWorkers.logistics },
            { dept: "STAMPING", w: currentScenario.shiftWorkers.stamping },
            { dept: "WELDING", w: simulated ? 10 : currentScenario.shiftWorkers.welding },
            { dept: "PAINT", w: currentScenario.shiftWorkers.paint },
            { dept: "POWERTRAIN", w: simulated ? 8 : currentScenario.shiftWorkers.powertrain },
            { dept: "FINAL ASSEMBLY", w: currentScenario.shiftWorkers.assembly },
            { dept: "QUALITY QA", w: currentScenario.shiftWorkers.quality },
          ].map((s) => (
            <div key={s.dept} className="kv-row">
              <span className="kv-key">{s.dept}</span>
              <span className="kv-value ok">{s.w} technicians</span>
            </div>
          ))}
        </div>
      </aside>

      {/* BOTTOM BAR */}
      <div className="bottombar">
        <div className="bstat">
          ACTIVE TEST CASE: <span style={{ color: currentScenario.badgeColor }}>{currentScenario.id} // {currentScenario.name}</span>
        </div>
        <div className="bstat">
          THROUGHPUT <span>{simulated ? "68 cars/shift" : `${currentScenario.metrics.carsPerShift} cars/shift`}</span>
        </div>
        <div className="bstat">
          CHOKE POINT{" "}
          <span style={{ color: simulated ? "var(--accent2)" : currentScenario.metrics.chokeColor }}>
            {simulated ? "NONE (BALANCED)" : currentScenario.metrics.chokePoint}
          </span>
        </div>
        <div className="bstat">
          SHIFT <span>S1 · 06:00 — 14:00 (DAY SHIFT)</span>
        </div>
      </div>

      {/* MODAL: TEST CASE SCENARIO SELECTOR */}
      {activeModal === "testcases" && (
        <div className="dept-modal" style={{ padding: "20px 28px", zIndex: 120 }}>
          <div className="dept-modal-header">
            <div className="dept-modal-title">
              AUTOMOTIVE MANUFACTURING TEST CASE MODES
            </div>
            <button className="req-btn" onClick={() => setActiveModal(null)}>
              ✕ CLOSE
            </button>
          </div>
          <div style={{ color: "var(--muted)", fontSize: 11, marginBottom: 14 }}>
            Select any pre-configured production test case scenario to test the plant response, 3D visualization, bottleneck alerts, and automated capacity calculations:
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
            {TEST_CASES.map((tc) => {
              const isSelected = selectedTestCase === tc.id;
              return (
                <div
                  key={tc.id}
                  className="glass-panel"
                  style={{
                    cursor: "pointer",
                    borderColor: isSelected ? "var(--accent)" : "var(--border)",
                    background: isSelected ? "rgba(0, 229, 255, 0.08)" : undefined,
                    transition: "all 0.2s ease",
                  }}
                  onClick={() => {
                    setSelectedTestCase(tc.id);
                    setSimulated(false);
                    setActiveModal(null);
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <span style={{ color: "var(--accent)", fontWeight: "bold", fontSize: 12 }}>{tc.id}</span>
                    <span style={{ fontSize: 9, color: tc.badgeColor, fontWeight: "bold" }}>{tc.badge}</span>
                  </div>
                  <div style={{ color: "var(--text)", fontWeight: "bold", fontSize: 11, marginBottom: 6 }}>
                    {tc.name}
                  </div>
                  <div style={{ color: "var(--muted)", fontSize: 10, lineHeight: 1.5, marginBottom: 10 }}>
                    {tc.description}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, fontFamily: "var(--font-mono)", borderTop: "1px solid var(--border)", paddingTop: 8 }}>
                    <span>Throughput: {tc.metrics.carsPerShift} cars</span>
                    <span>Takt: {tc.metrics.avgTakt}</span>
                    <span style={{ color: tc.metrics.chokeColor }}>{tc.metrics.chokePoint.split(" ")[0]}</span>
                  </div>
                  <button
                    className="req-btn"
                    style={{
                      width: "100%",
                      marginTop: 10,
                      background: isSelected ? "var(--accent)" : "transparent",
                      color: isSelected ? "#000" : "var(--accent)",
                      fontSize: 9,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedTestCase(tc.id);
                      setSimulated(false);
                      setActiveModal(null);
                    }}
                  >
                    {isSelected ? "✓ CURRENTLY ACTIVE" : "▶ ACTIVATE SCENARIO"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL: ACTIVE ORDERS & COMPLETE BOM PARTS TABLE */}
      {activeModal === "orders" && (
        <div className="dept-modal" style={{ padding: "20px 28px", zIndex: 120 }}>
          <div className="dept-modal-header">
            <div className="dept-modal-title">
              VEHICLE BILL OF MATERIALS (BOM) &amp; ACTIVE ORDERS
            </div>
            <button className="req-btn" onClick={() => setActiveModal(null)}>
              ✕ CLOSE
            </button>
          </div>
          <div style={{ overflowX: "auto", background: "rgba(0,0,0,0.3)", borderRadius: 8, padding: 12, border: "1px solid var(--border)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10, fontFamily: "var(--font-mono)" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", textAlign: "left", color: "var(--muted)" }}>
                  <th style={{ padding: 8 }}>VEHICLE VIN / BATCH</th>
                  <th style={{ padding: 8 }}>MODEL</th>
                  <th style={{ padding: 8 }}>BODY STYLE</th>
                  <th style={{ padding: 8 }}>CURRENT LINE</th>
                  <th style={{ padding: 8 }}>PROGRESS</th>
                  <th style={{ padding: 8 }}>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { vin: "VIN-2026-GT401", model: "EV-SEDAN GT", type: "Fastback Dual-Motor", line: "Final Assembly (Marriage)", pct: 78, status: "IN PROGRESS", ok: true },
                  { vin: "VIN-2026-SUV802", model: "SUV-HYBRID X", type: "Mid-size 7-Seater AWD", line: "Powertrain Integration", pct: 52, status: "IN PROGRESS", ok: true },
                  { vin: "VIN-2026-TRK903", model: "TRUCK-EV TITAN", type: "Quad-Motor Heavy Duty", line: "Body Welding Cell 2", pct: 24, status: "IN PROGRESS", ok: true },
                  { vin: "VIN-2026-GT402", model: "EV-SEDAN GT", type: "Fastback Dual-Motor", line: "Stamping Press Bed 1", pct: 95, status: "IN PROGRESS", ok: true },
                  { vin: "VIN-2026-SUV803", model: "SUV-HYBRID X", type: "Mid-size 7-Seater AWD", line: "Paint Cleanroom Dip", pct: 15, status: "QUEUED", ok: false },
                ].map((row) => (
                  <tr key={row.vin} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <td style={{ padding: 8, color: "var(--accent)", fontWeight: "bold" }}>{row.vin}</td>
                    <td style={{ padding: 8, color: "var(--text)" }}>{row.model}</td>
                    <td style={{ padding: 8, color: "var(--muted)" }}>{row.type}</td>
                    <td style={{ padding: 8, color: "var(--text)" }}>{row.line}</td>
                    <td style={{ padding: 8, minWidth: 140 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ flex: 1, height: 6, background: "rgba(255,255,255,0.08)", borderRadius: 3, overflow: "hidden" }}>
                          <div style={{ width: `${row.pct}%`, height: "100%", background: row.ok ? "var(--accent)" : "var(--warn)" }} />
                        </div>
                        <span style={{ color: row.ok ? "var(--accent)" : "var(--warn)", fontWeight: "bold" }}>{row.pct}%</span>
                      </div>
                    </td>
                    <td style={{ padding: 8 }}>
                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: 4,
                          border: `1px solid ${row.ok ? "var(--accent2)" : "var(--warn)"}`,
                          color: row.ok ? "var(--accent2)" : "var(--warn)",
                          fontSize: 9,
                        }}
                      >
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: PLANT OVERVIEW & OEE INSPECTOR */}
      {activeModal === "overview" && (
        <div className="dept-modal" style={{ padding: "20px 28px", zIndex: 120 }}>
          <div className="dept-modal-header">
            <div className="dept-modal-title">PLANT OEE &amp; EFFICIENCY BREAKDOWN</div>
            <button className="req-btn" onClick={() => setActiveModal(null)}>
              ✕ CLOSE
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 16 }}>
            <div className="glass-panel">
              <div className="card-title">Availability Rate</div>
              <div style={{ fontSize: 28, color: "var(--accent)", fontWeight: "bold", fontFamily: "var(--font-mono)" }}>91.4%</div>
              <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 4 }}>Scheduled downtime: 0.5h/shift (lunch &amp; tool swap)</div>
            </div>
            <div className="glass-panel">
              <div className="card-title">Performance Rate</div>
              <div style={{ fontSize: 28, color: "var(--accent2)", fontWeight: "bold", fontFamily: "var(--font-mono)" }}>94.2%</div>
              <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 4 }}>Operating at 94.2% of ideal 54s takt speed</div>
            </div>
            <div className="glass-panel">
              <div className="card-title">Quality Rate (FPY)</div>
              <div style={{ fontSize: 28, color: "var(--accent)", fontWeight: "bold", fontFamily: "var(--font-mono)" }}>98.4%</div>
              <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 4 }}>1.6% rework rate caught before final glazing</div>
            </div>
          </div>
          <div className="glass-panel">
            <div className="card-title">Decomposed Authoritative OEE</div>
            <div style={{ fontSize: 11, color: "var(--text)", lineHeight: 1.6 }}>
              Total Plant OEE = Availability (91.4%) × Performance (94.2%) × Quality (98.4%) = <strong>84.7% OEE</strong>.
              Benchmark target for World Class Automotive Manufacturing is 85.0%.
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SHIFT ROSTER & OPERATORS */}
      {activeModal === "shift" && (
        <div className="dept-modal" style={{ padding: "20px 28px", zIndex: 120 }}>
          <div className="dept-modal-header">
            <div className="dept-modal-title">SHIFT 1 (DAY SHIFT) ROSTER &amp; SKILL ALLOCATION (7 DEPTS)</div>
            <button className="req-btn" onClick={() => setActiveModal(null)}>
              ✕ CLOSE
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
            {[
              { name: "Materials & Staging", count: currentScenario.shiftWorkers.logistics, lead: "R. Gomez (Logistics Supervisor)", cert: "Automated AGV Logistics IV" },
              { name: "Press & Stamping", count: currentScenario.shiftWorkers.stamping, lead: "T. Vance (Master Die Setter)", cert: "ISO-Stamping Class IV" },
              { name: "Body Welding & Framing", count: simulated ? 10 : currentScenario.shiftWorkers.welding, lead: "M. Chen (Robotics Tech Lead)", cert: "Fanuc Robotics Cert" },
              { name: "Paint & Surface", count: currentScenario.shiftWorkers.paint, lead: "L. Moreau (Finishing Chemist)", cert: "PPG Automotive Spec" },
              { name: "Powertrain & Battery", count: simulated ? 8 : currentScenario.shiftWorkers.powertrain, lead: "A. Patel (High-Voltage Specialist)", cert: "NFPA-70E HV Cert" },
              { name: "Final Assembly & Marriage", count: currentScenario.shiftWorkers.assembly, lead: "K. Becker (Line Superintendent)", cert: "Six Sigma Black Belt" },
              { name: "Quality Assurance & Testing", count: currentScenario.shiftWorkers.quality, lead: "D. Ross (Chief Metrologist)", cert: "ISO-9001 Lead Auditor" },
            ].map((d) => (
              <div key={d.name} className="glass-panel">
                <div style={{ color: "var(--accent)", fontWeight: "bold", fontSize: 12, marginBottom: 4 }}>{d.name}</div>
                <div style={{ fontSize: 11, color: "var(--text)", marginBottom: 4 }}>Headcount: <strong>{d.count} technicians</strong></div>
                <div style={{ fontSize: 10, color: "var(--muted)" }}>Shift Lead: {d.lead}</div>
                <div style={{ fontSize: 9, color: "var(--accent2)", marginTop: 4 }}>Certification: {d.cert}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: EXTENDED AI PREDICTIONS */}
      {activeModal === "predictions" && (
        <div className="dept-modal" style={{ padding: "20px 28px", zIndex: 120 }}>
          <div className="dept-modal-header">
            <div className="dept-modal-title">AI QUANTILE PREDICTIONS &amp; BOTTLENECK FORECAST</div>
            <button className="req-btn" onClick={() => setActiveModal(null)}>
              ✕ CLOSE
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 16 }}>
            <div className="glass-panel">
              <div className="card-title">7-Day Quantile Build-Time Forecast (P50, P75, P90)</div>
              <CapacityTrendChart
                title="Forecast Horizon"
                subtitle="Capacity vs Demand (Hours)"
                isLightMode={isLightMode}
                height={170}
                unit="h"
                showActual={true}
                data={[
                  { label: "Mon", capacity: 86.5, demand: 71.0, actual: 70.2 },
                  { label: "Tue", capacity: 86.5, demand: 77.2, actual: 74.0 },
                  { label: "Wed", capacity: 86.5, demand: simulated ? 72.0 : 80.3, actual: 74.2 },
                  { label: "Thu", capacity: simulated ? 88.0 : 69.5, demand: 62.8, actual: simulated ? 62.8 : 58.0 },
                  { label: "Fri", capacity: 86.5, demand: simulated ? 74.0 : 79.6, actual: 73.1 },
                  { label: "Sat", capacity: 86.5, demand: 75.7, actual: 72.7 },
                  { label: "Sun", capacity: 86.5, demand: 69.1, actual: 67.6 },
                ]}
              />
            </div>
            <div className="glass-panel">
              <div className="card-title">Safety Gate &amp; Risk Metrics</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 10 }}>
                <div className="kv-row"><span className="kv-key">Model Architecture</span><span className="kv-value ok">LightGBM Quantile Monotone</span></div>
                <div className="kv-row"><span className="kv-key">P75 Coverage Accuracy</span><span className="kv-value ok">76.4% (Target &gt;= 75%)</span></div>
                <div className="kv-row"><span className="kv-key">P90 Coverage Accuracy</span><span className="kv-value ok">91.8% (Target &gt;= 90%)</span></div>
                <div className="kv-row"><span className="kv-key">Bottleneck Risk Segment</span><span className="kv-value fault">Chassis Marriage (ASSY)</span></div>
                <div className="kv-row"><span className="kv-key">Simulated Resolution Status</span><span className="kv-value ok">{simulated ? "REBALANCED (98% Confidence)" : "PENDING REALLOCATION"}</span></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
