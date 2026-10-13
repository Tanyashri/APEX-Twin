"use client";

import React, { useState } from "react";

export interface DataPoint {
  label: string; // e.g. "06:00", "08:00", "Mon", "Tue"
  capacity: number;
  demand: number;
  actual?: number;
}

interface CapacityTrendChartProps {
  title?: string;
  subtitle?: string;
  data: DataPoint[];
  height?: number;
  unit?: string;
  isLightMode?: boolean;
  showActual?: boolean;
}

export default function CapacityTrendChart({
  title = "Capacity vs Demand Trend",
  subtitle = "Hourly Horizon",
  data,
  height = 140,
  unit = "h",
  isLightMode = false,
  showActual = false,
}: CapacityTrendChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div style={{ height, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)", fontSize: 10 }}>
        No trend telemetry available
      </div>
    );
  }

  // Determine scaling bounds
  const allValues = data.flatMap((d) => [d.capacity, d.demand, ...(d.actual !== undefined && showActual ? [d.actual] : [])]);
  const maxVal = Math.max(...allValues, 10);
  const minVal = 0;

  const paddingLeft = 32;
  const paddingRight = 16;
  const paddingTop = 16;
  const paddingBottom = 24;
  const width = 360; // viewBox width

  const chartW = width - paddingLeft - paddingRight;
  const chartH = height - paddingTop - paddingBottom;

  const getX = (idx: number) => paddingLeft + (idx / (data.length - 1)) * chartW;
  const getY = (val: number) => paddingTop + chartH - ((val - minVal) / (maxVal - minVal)) * chartH;

  // Path generators
  const capacityPoints = data.map((d, i) => `${getX(i)},${getY(d.capacity)}`).join(" ");
  const demandPoints = data.map((d, i) => `${getX(i)},${getY(d.demand)}`).join(" ");
  const actualPoints = data.map((d, i) => `${getX(i)},${getY(d.actual ?? d.capacity)}`).join(" ");

  // Capacity area fill path
  const capAreaPath = `M ${getX(0)},${getY(data[0].capacity)} ` +
    data.slice(1).map((d, i) => `L ${getX(i + 1)},${getY(d.capacity)}`).join(" ") +
    ` L ${getX(data.length - 1)},${paddingTop + chartH} L ${getX(0)},${paddingTop + chartH} Z`;

  // Demand area fill path
  const demandAreaPath = `M ${getX(0)},${getY(data[0].demand)} ` +
    data.slice(1).map((d, i) => `L ${getX(i + 1)},${getY(d.demand)}`).join(" ") +
    ` L ${getX(data.length - 1)},${paddingTop + chartH} L ${getX(0)},${paddingTop + chartH} Z`;

  const capColor = isLightMode ? "#0077ff" : "var(--accent)";
  const demandColor = isLightMode ? "#dc2626" : "var(--warn)";
  const actualColor = isLightMode ? "#16a34a" : "var(--accent2)";
  const gridColor = isLightMode ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.06)";
  const textColor = isLightMode ? "#64748b" : "var(--muted)";

  return (
    <div style={{ width: "100%", userSelect: "none" }}>
      {/* HEADER / LEGEND */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <div>
          <span style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "var(--accent)", letterSpacing: 1, textTransform: "uppercase" }}>
            {title}
          </span>
          {subtitle && (
            <span style={{ fontSize: 9, color: textColor, marginLeft: 6 }}>
              {"//"} {subtitle}
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 10, fontSize: 8, fontFamily: "var(--font-mono)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 8, height: 2, background: capColor, display: "inline-block" }} />
            <span style={{ color: capColor }}>CAP</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 8, height: 2, background: demandColor, display: "inline-block", borderTop: "1px dashed" }} />
            <span style={{ color: demandColor }}>DEMAND</span>
          </div>
          {showActual && (
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 8, height: 2, background: actualColor, display: "inline-block" }} />
              <span style={{ color: actualColor }}>ACTUAL</span>
            </div>
          )}
        </div>
      </div>

      {/* SVG GRAPH */}
      <div style={{ position: "relative", width: "100%" }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={{ width: "100%", height: "auto", display: "block", overflow: "visible" }}
        >
          <defs>
            <linearGradient id={`grad-cap-${title.replace(/[^a-zA-Z0-9]/g, "")}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={capColor} stopOpacity="0.25" />
              <stop offset="100%" stopColor={capColor} stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id={`grad-dem-${title.replace(/[^a-zA-Z0-9]/g, "")}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={demandColor} stopOpacity="0.2" />
              <stop offset="100%" stopColor={demandColor} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines (3 horizontal levels) */}
          {[0, 0.5, 1].map((ratio) => {
            const y = paddingTop + chartH * (1 - ratio);
            const val = Math.round(minVal + ratio * (maxVal - minVal));
            return (
              <g key={ratio}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={width - paddingRight}
                  y2={y}
                  stroke={gridColor}
                  strokeWidth="1"
                  strokeDasharray="2,2"
                />
                <text
                  x={paddingLeft - 4}
                  y={y + 3}
                  textAnchor="end"
                  fill={textColor}
                  fontSize="7"
                  fontFamily="var(--font-mono)"
                >
                  {val}{unit}
                </text>
              </g>
            );
          })}

          {/* Shaded Areas */}
          <path d={capAreaPath} fill={`url(#grad-cap-${title.replace(/[^a-zA-Z0-9]/g, "")})`} />
          <path d={demandAreaPath} fill={`url(#grad-dem-${title.replace(/[^a-zA-Z0-9]/g, "")})`} />

          {/* Polyline: Capacity */}
          <polyline
            fill="none"
            stroke={capColor}
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={capacityPoints}
          />

          {/* Polyline: Demand */}
          <polyline
            fill="none"
            stroke={demandColor}
            strokeWidth="1.75"
            strokeDasharray="4,2"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={demandPoints}
          />

          {/* Polyline: Actual (Optional) */}
          {showActual && (
            <polyline
              fill="none"
              stroke={actualColor}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={actualPoints}
            />
          )}

          {/* Data Nodes & Interactive Hover areas */}
          {data.map((d, i) => {
            const cx = getX(i);
            const cyCap = getY(d.capacity);
            const cyDem = getY(d.demand);
            const isHovered = hoveredIdx === i;

            return (
              <g key={i}>
                {/* Vertical hover guide */}
                {isHovered && (
                  <line
                    x1={cx}
                    y1={paddingTop}
                    x2={cx}
                    y2={paddingTop + chartH}
                    stroke={isLightMode ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.3)"}
                    strokeWidth="1"
                    strokeDasharray="1,2"
                  />
                )}

                {/* Nodes */}
                <circle
                  cx={cx}
                  cy={cyCap}
                  r={isHovered ? 4 : 2}
                  fill={capColor}
                  stroke={isLightMode ? "#ffffff" : "#0a0c0f"}
                  strokeWidth="1"
                />
                <circle
                  cx={cx}
                  cy={cyDem}
                  r={isHovered ? 4 : 2}
                  fill={demandColor}
                  stroke={isLightMode ? "#ffffff" : "#0a0c0f"}
                  strokeWidth="1"
                />

                {/* X Axis label */}
                <text
                  x={cx}
                  y={paddingTop + chartH + 12}
                  textAnchor="middle"
                  fill={isHovered ? "var(--text)" : textColor}
                  fontSize="7"
                  fontFamily="var(--font-mono)"
                >
                  {d.label}
                </text>

                {/* Transparent hover capture rect */}
                <rect
                  x={cx - chartW / (data.length * 2)}
                  y={paddingTop}
                  width={chartW / data.length}
                  height={chartH + 14}
                  fill="transparent"
                  onMouseEnter={() => setHoveredIdx(i)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  style={{ cursor: "crosshair" }}
                />
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredIdx !== null && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: Math.min(Math.max(hoveredIdx * 45, 10), 200),
              background: isLightMode ? "#ffffff" : "#111418",
              border: "1px solid var(--border)",
              boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
              borderRadius: 4,
              padding: "4px 8px",
              fontSize: 9,
              fontFamily: "var(--font-mono)",
              pointerEvents: "none",
              zIndex: 20,
            }}
          >
            <div style={{ color: "var(--muted)", marginBottom: 2 }}>{data[hoveredIdx].label}</div>
            <div style={{ color: capColor }}>Cap: {data[hoveredIdx].capacity}{unit}</div>
            <div style={{ color: demandColor }}>Dem: {data[hoveredIdx].demand}{unit}</div>
            <div style={{ color: data[hoveredIdx].demand > data[hoveredIdx].capacity ? "var(--fault)" : "var(--accent2)" }}>
              {data[hoveredIdx].demand > data[hoveredIdx].capacity ? "⚠ SHORTFALL" : "✓ BALANCED"}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
