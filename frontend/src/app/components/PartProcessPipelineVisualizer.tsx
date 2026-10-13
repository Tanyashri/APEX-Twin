"use client";

import React, { useState, useEffect } from "react";

interface ProcessStage {
  step: number;
  name: string;
  machine: string;
  time: string;
  status: string;
}

interface PartVisualizerProps {
  partCode: string;
  partName: string;
  dept: string;
  stages: ProcessStage[];
  cycleElapsed: number;
  isLightMode?: boolean;
  activeMachineName?: string;
  activeOperator?: string;
}

export default function PartProcessPipelineVisualizer({
  partCode,
  partName,
  dept,
  stages,
  cycleElapsed,
  isLightMode = false,
  activeMachineName = "Primary CNC Station",
  activeOperator = "Tech Operator",
}: PartVisualizerProps) {
  const [selectedStationIndex, setSelectedStationIndex] = useState<number>(2); // Default to active step (index 2 / step 3)
  const [vibrationVal, setVibrationVal] = useState<number>(0.012);

  // Random micro-vibration telemetry jitter
  useEffect(() => {
    const t = setInterval(() => {
      setVibrationVal(0.010 + Math.random() * 0.005);
    }, 400);
    return () => clearInterval(t);
  }, []);

  const accent = isLightMode ? "#0070f3" : "#00e5ff";
  const accentGreen = isLightMode ? "#16a34a" : "#76ff03";
  const accentWarn = isLightMode ? "#d97706" : "#ff9100";
  const bgCard = isLightMode ? "#ffffff" : "rgba(10, 16, 26, 0.85)";
  const borderCol = isLightMode ? "#cbd5e1" : "rgba(0, 229, 255, 0.25)";
  const textPrimary = isLightMode ? "#0f172a" : "#f1f5f9";
  const textMuted = isLightMode ? "#64748b" : "#94a3b8";

  // Calculate current progress along the 5-station pipeline
  // Stages: 0 (0%), 1 (25%), 2 (50% + cycleElapsed/54 * 25%), 3 (75%), 4 (100%)
  const activeStagePct = 40 + Math.min(25, (cycleElapsed / 54) * 25);

  const selectedStage = stages[selectedStationIndex] || stages[2] || stages[0];

  return (
    <div
      style={{
        background: bgCard,
        border: `1px solid ${borderCol}`,
        borderRadius: 10,
        padding: "16px 20px",
        boxShadow: isLightMode
          ? "0 4px 20px rgba(0,0,0,0.06)"
          : "0 0 25px rgba(0, 229, 255, 0.08), inset 0 0 20px rgba(0, 229, 255, 0.03)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background Cyber Grid */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: isLightMode ? 0.03 : 0.08,
          backgroundImage: `linear-gradient(${accent} 1px, transparent 1px), linear-gradient(90deg, ${accent} 1px, transparent 1px)`,
          backgroundSize: "24px 24px",
          pointerEvents: "none",
        }}
      />

      {/* TOP HEADER: PART IDENTITY & STATUS */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10, position: "relative", zIndex: 2 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              background: accent,
              color: isLightMode ? "#ffffff" : "#000000",
              padding: "4px 10px",
              fontSize: 10,
              fontWeight: "bold",
              borderRadius: 4,
              letterSpacing: 1.5,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: isLightMode ? "#fff" : "#000" }} />
            CYBER-PHYSICAL LINE TRACKER
          </div>
          <div>
            <span style={{ fontSize: 13, fontWeight: "bold", color: textPrimary, fontFamily: "var(--font-mono)" }}>
              {partCode}
            </span>
            <span style={{ color: textMuted, fontSize: 11, marginLeft: 8 }}>
              — {partName}
            </span>
          </div>
        </div>

        {/* Live Status Pill */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              padding: "3px 10px",
              borderRadius: 20,
              fontSize: 9,
              fontWeight: "bold",
              fontFamily: "var(--font-mono)",
              background: "rgba(118, 255, 3, 0.12)",
              color: accentGreen,
              border: `1px solid ${accentGreen}`,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: accentGreen }} />
            CYCLE ACTIVE: {cycleElapsed}s / 54s TAKT
          </div>
          <span style={{ fontSize: 9, color: textMuted, fontFamily: "var(--font-mono)" }}>
            VIN-2026-X80-0042
          </span>
        </div>
      </div>

      {/* VISUAL PIPELINE CONVEYOR & MACHINE STATIONS */}
      <div
        style={{
          position: "relative",
          margin: "18px 0 22px 0",
          padding: "26px 14px 14px 14px",
          background: isLightMode ? "#f8fafc" : "rgba(0, 10, 20, 0.6)",
          border: `1px solid ${isLightMode ? "#e2e8f0" : "rgba(255,255,255,0.06)"}`,
          borderRadius: 8,
          zIndex: 2,
        }}
      >
        {/* Conveyor Track Rail */}
        <div
          style={{
            position: "absolute",
            top: 52,
            left: "6%",
            right: "6%",
            height: 6,
            background: isLightMode ? "#cbd5e1" : "rgba(255,255,255,0.1)",
            borderRadius: 3,
            zIndex: 1,
          }}
        >
          {/* Active Flow Energy Fill */}
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: `${activeStagePct}%`,
              background: `linear-gradient(90deg, ${accentGreen} 0%, ${accent} 85%, #ffffff 100%)`,
              borderRadius: 3,
              boxShadow: `0 0 10px ${accent}`,
              transition: "width 1s linear",
            }}
          />

          {/* Conveyor Carrier Puck Riding the Rail */}
          <div
            style={{
              position: "absolute",
              left: `${activeStagePct}%`,
              top: -9,
              transform: "translateX(-50%)",
              width: 24,
              height: 24,
              borderRadius: "50%",
              background: accent,
              border: "3px solid #ffffff",
              boxShadow: `0 0 14px ${accent}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "left 1s linear",
              zIndex: 3,
            }}
          >
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#000" }} />
          </div>
        </div>

        {/* 5 Physical Machine Station Nodes */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, 1fr)",
            position: "relative",
            zIndex: 2,
            gap: 10,
          }}
        >
          {stages.map((st, idx) => {
            const isCompleted = st.status === "COMPLETED";
            const isInProgress = st.status === "IN PROGRESS";
            const isSelected = selectedStationIndex === idx;

            // Machine Icon / Visual Glyphs per station
            const getStationIcon = (step: number) => {
              if (step === 1) return "🌀"; // Coil / Infeed
              if (step === 2) return "⚙️"; // Heavy Forming
              if (step === 3) return "⚡"; // Active Robotic / Welding / Marriage
              if (step === 4) return "🔬"; // Laser Metrology
              return "📦"; // Staging / Buffer
            };

            return (
              <div
                key={st.step}
                onClick={() => setSelectedStationIndex(idx)}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  transform: isSelected ? "scale(1.03)" : "scale(1)",
                }}
              >
                {/* Machine Pod Graphic */}
                <div
                  style={{
                    width: 58,
                    height: 58,
                    borderRadius: 12,
                    background: isInProgress
                      ? isLightMode
                        ? "#e0f2fe"
                        : "rgba(0, 229, 255, 0.2)"
                      : isCompleted
                      ? isLightMode
                        ? "#dcfce7"
                        : "rgba(118, 255, 3, 0.12)"
                      : isLightMode
                      ? "#f1f5f9"
                      : "rgba(255, 255, 255, 0.03)",
                    border: `2px solid ${
                      isSelected
                        ? accent
                        : isInProgress
                        ? accent
                        : isCompleted
                        ? accentGreen
                        : "rgba(255,255,255,0.1)"
                    }`,
                    boxShadow: isInProgress
                      ? `0 0 16px ${accent}`
                      : isSelected
                      ? `0 0 12px ${accent}`
                      : "none",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    position: "relative",
                    marginBottom: 10,
                  }}
                >
                  <span style={{ fontSize: 22 }}>{getStationIcon(st.step)}</span>

                  {/* Pulsing beacon if currently in progress */}
                  {isInProgress && (
                    <span
                      style={{
                        position: "absolute",
                        top: -4,
                        right: -4,
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        background: accent,
                        boxShadow: `0 0 8px ${accent}`,
                      }}
                    />
                  )}

                  {/* Completion checkmark */}
                  {isCompleted && (
                    <span
                      style={{
                        position: "absolute",
                        top: -4,
                        right: -4,
                        width: 14,
                        height: 14,
                        borderRadius: "50%",
                        background: accentGreen,
                        color: "#000",
                        fontSize: 9,
                        fontWeight: "bold",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      ✓
                    </span>
                  )}
                </div>

                {/* Station Labels */}
                <div style={{ textAlign: "center", width: "100%" }}>
                  <div style={{ fontSize: 8, color: textMuted, fontFamily: "var(--font-mono)", fontWeight: "bold" }}>
                    STATION 0{st.step}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: "bold",
                      color: isInProgress ? accent : textPrimary,
                      marginTop: 2,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      maxWidth: "100%",
                    }}
                    title={st.name}
                  >
                    {st.name}
                  </div>
                  <div
                    style={{
                      fontSize: 8,
                      color: isInProgress ? accent : isCompleted ? accentGreen : textMuted,
                      marginTop: 3,
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {isCompleted ? "DONE (✓)" : isInProgress ? `ACTIVE (${cycleElapsed}s)` : "QUEUED"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* LOWER TELEMETRY HUD & ACTIVE MACHINE INSPECTOR */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.2fr 1fr",
          gap: 12,
          position: "relative",
          zIndex: 2,
        }}
      >
        {/* Left Box: Active Machine Laser & Mechanical Telemetry */}
        <div
          style={{
            background: isLightMode ? "#f8fafc" : "rgba(0, 0, 0, 0.35)",
            border: `1px solid ${isLightMode ? "#e2e8f0" : "rgba(255,255,255,0.06)"}`,
            borderRadius: 6,
            padding: "12px 14px",
            fontSize: 10,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ color: textMuted, fontSize: 9, fontWeight: "bold", letterSpacing: 1 }}>
              ACTIVE STATION TELEMETRY // {selectedStage.machine}
            </span>
            <span style={{ color: accent, fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: "bold" }}>
              STEP 0{selectedStage.step} INSPECTION
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 8 }}>
            <div style={{ background: isLightMode ? "#ffffff" : "rgba(255,255,255,0.02)", padding: "8px 10px", borderRadius: 4 }}>
              <span style={{ color: textMuted, fontSize: 8, display: "block" }}>MACHINE CLAMPING / FORCE:</span>
              <span style={{ color: textPrimary, fontWeight: "bold", fontFamily: "var(--font-mono)" }}>
                {dept === "STAMPING" ? "24,800 kN ± 15" : dept === "WELDING" ? "14.2 kA / 4.2 kN" : "1,240 kPa Nominal"}
              </span>
            </div>
            <div style={{ background: isLightMode ? "#ffffff" : "rgba(255,255,255,0.02)", padding: "8px 10px", borderRadius: 4 }}>
              <span style={{ color: textMuted, fontSize: 8, display: "block" }}>LASER 3D METROLOGY DEVIATION:</span>
              <span style={{ color: accentGreen, fontWeight: "bold", fontFamily: "var(--font-mono)" }}>
                +{vibrationVal.toFixed(3)} mm (Tol: ±0.050mm ✓)
              </span>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 9, color: textMuted }}>
            <span>Operator: <strong style={{ color: textPrimary }}>{activeOperator}</strong></span>
            <span>Est. Step Duration: <strong style={{ color: accent }}>{selectedStage.time}</strong></span>
            <span>Station Status: <strong style={{ color: selectedStage.status === "COMPLETED" ? accentGreen : accent }}>{selectedStage.status}</strong></span>
          </div>
        </div>

        {/* Right Box: Live Laser Signal Waveform & Calibration State */}
        <div
          style={{
            background: isLightMode ? "#f8fafc" : "rgba(0, 0, 0, 0.35)",
            border: `1px solid ${isLightMode ? "#e2e8f0" : "rgba(255,255,255,0.06)"}`,
            borderRadius: 6,
            padding: "12px 14px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 9, color: textMuted, fontWeight: "bold" }}>
            <span>LASER PROFILE SENSOR FREQUENCY</span>
            <span style={{ color: accentGreen }}>● 100 Hz SYNCED</span>
          </div>

          {/* Animated SVG Oscilloscope Waveform */}
          <div style={{ height: 38, width: "100%", margin: "4px 0", overflow: "hidden" }}>
            <svg viewBox="0 0 300 40" style={{ width: "100%", height: "100%" }}>
              <path
                d="M 0 20 Q 25 5, 50 20 T 100 20 T 150 20 T 200 20 T 250 20 T 300 20"
                fill="none"
                stroke={accent}
                strokeWidth="1.5"
                opacity="0.8"
              >
                <animate
                  attributeName="d"
                  dur="1.2s"
                  repeatCount="indefinite"
                  values="
                    M 0 20 Q 25 5, 50 20 T 100 20 T 150 20 T 200 20 T 250 20 T 300 20;
                    M 0 20 Q 25 35, 50 20 T 100 20 T 150 20 T 200 20 T 250 20 T 300 20;
                    M 0 20 Q 25 5, 50 20 T 100 20 T 150 20 T 200 20 T 250 20 T 300 20
                  "
                />
              </path>
            </svg>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 8, color: textMuted, fontFamily: "var(--font-mono)" }}>
            <span>FEEDBACK: REAL-TIME CLOSED LOOP</span>
            <span style={{ color: accent }}>CALIBRATION: 99.8%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
