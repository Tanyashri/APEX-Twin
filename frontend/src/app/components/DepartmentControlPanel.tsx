"use client";

import React, { useState, useEffect, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Box, Cylinder, Sphere } from "@react-three/drei";
import * as THREE from "three";
import CapacityTrendChart from "./CapacityTrendChart";
import PartProcessPipelineVisualizer from "./PartProcessPipelineVisualizer";

// Automobile Department-specific 3D models
function DeptModel({ dept, isLightMode = false }: { dept: string; isLightMode?: boolean }) {
  const spinRef = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    if (spinRef.current) spinRef.current.rotation.y = clock.getElapsedTime() * 0.7;
  });

  const steel = isLightMode ? "#718096" : "#64748b";
  const shinySteel = isLightMode ? "#a0aec0" : "#94a3b8";
  const darkMetal = isLightMode ? "#2d3748" : "#1e293b";
  const bodyPaint = isLightMode ? "#2563eb" : "#00e5ff";
  const safetyOrange = isLightMode ? "#ea580c" : "#ff9100";

  // 0. LOGISTICS & AUTOMATED STAGING
  if (dept === "LOGISTICS" || dept === "STAMPING & LOGISTICS") {
    return (
      <group ref={spinRef}>
        {[-1.3, 1.3].map((x, i) => (
          <group key={i} position={[x, 0, 0]}>
            <Box args={[0.7, 2.0, 3.0]} position={[0, 0, 0]}>
              <meshStandardMaterial color={darkMetal} roughness={0.7} />
            </Box>
            {[-0.9, 0, 0.9].map((z, j) => (
              <Box key={j} args={[0.6, 0.4, 0.7]} position={[0, 0.3, z]}>
                <meshStandardMaterial color="#3b82f6" roughness={0.3} metalness={0.5} />
              </Box>
            ))}
          </group>
        ))}
        {/* AGV Vehicle */}
        <Box args={[1.2, 0.35, 1.6]} position={[0, -0.6, 0]}>
          <meshStandardMaterial color="#f59e0b" roughness={0.3} metalness={0.7} />
        </Box>
        <Box args={[0.9, 0.3, 1.2]} position={[0, -0.25, 0]}>
          <meshStandardMaterial color={shinySteel} metalness={0.8} />
        </Box>
      </group>
    );
  }

  // 1. STAMPING & PRESS
  if (dept === "STAMPING" || dept === "PRESS & STAMPING" || dept === "MECHATRONICS") {
    return (
      <group ref={spinRef}>
        <Box args={[2.2, 0.4, 2.2]} position={[0, -0.8, 0]}>
          <meshStandardMaterial color={darkMetal} roughness={0.6} metalness={0.7} />
        </Box>
        {[[-0.9, 0, -0.9], [0.9, 0, -0.9], [-0.9, 0, 0.9], [0.9, 0, 0.9]].map((pos, i) => (
          <Cylinder key={i} args={[0.1, 0.1, 2.0, 16]} position={[pos[0], 0.2, pos[2]]}>
            <meshStandardMaterial color={shinySteel} roughness={0.2} metalness={0.9} />
          </Cylinder>
        ))}
        <Box args={[1.8, 0.6, 1.8]} position={[0, 0.8, 0]}>
          <meshStandardMaterial color={steel} roughness={0.3} metalness={0.8} />
        </Box>
        <Box args={[1.5, 0.05, 1.4]} position={[0, -0.55, 0]}>
          <meshStandardMaterial color={bodyPaint} roughness={0.2} metalness={0.6} />
        </Box>
        <Cylinder args={[0.3, 0.3, 0.8, 16]} position={[0, 1.4, 0]}>
          <meshStandardMaterial color={shinySteel} roughness={0.15} metalness={0.95} />
        </Cylinder>
      </group>
    );
  }

  // 2. BODY WELDING & FABRICATION
  if (dept === "WELDING" || dept === "BODY WELDING" || dept === "FABRICS") {
    return (
      <group ref={spinRef}>
        <Box args={[2.6, 0.3, 1.6]} position={[0, -0.8, 0]}>
          <meshStandardMaterial color={darkMetal} roughness={0.7} metalness={0.6} />
        </Box>
        {[[-1.0, -0.2, -0.6], [1.0, -0.2, -0.6], [-1.0, -0.2, 0.6], [1.0, -0.2, 0.6]].map((pos, i) => (
          <Box key={i} args={[0.08, 0.9, 0.08]} position={[pos[0], pos[1], pos[2]]}>
            <meshStandardMaterial color={shinySteel} roughness={0.3} metalness={0.85} />
          </Box>
        ))}
        <Box args={[2.0, 0.08, 0.08]} position={[0, 0.25, -0.6]}>
          <meshStandardMaterial color={shinySteel} metalness={0.9} />
        </Box>
        <Box args={[2.0, 0.08, 0.08]} position={[0, 0.25, 0.6]}>
          <meshStandardMaterial color={shinySteel} metalness={0.9} />
        </Box>
        <Cylinder args={[0.35, 0.4, 0.6, 16]} position={[1.4, -0.4, 0]}>
          <meshStandardMaterial color={safetyOrange} roughness={0.4} metalness={0.5} />
        </Cylinder>
        <Sphere args={[0.1, 12, 12]} position={[0.7, 0.0, 0.3]}>
          <meshStandardMaterial color="#00e5ff" emissive="#00e5ff" emissiveIntensity={1.5} />
        </Sphere>
      </group>
    );
  }

  // 3. POWERTRAIN & BATTERY
  if (dept === "POWERTRAIN" || dept === "BATTERY & POWERTRAIN" || dept === "SENSORS") {
    return (
      <group ref={spinRef}>
        <Box args={[2.6, 0.25, 1.6]} position={[0, -0.3, 0]}>
          <meshStandardMaterial color={darkMetal} roughness={0.3} metalness={0.8} />
        </Box>
        {[-0.8, -0.25, 0.3, 0.85].map((x, i) => (
          <Box key={i} args={[0.42, 0.15, 1.3]} position={[x, -0.12, 0]}>
            <meshStandardMaterial color="#1e3a8a" emissive="#3b82f6" emissiveIntensity={0.6} />
          </Box>
        ))}
        <Cylinder args={[0.04, 0.04, 2.2, 8]} position={[0, -0.02, 0.6]} rotation={[0, 0, Math.PI / 2]}>
          <meshStandardMaterial color={safetyOrange} roughness={0.2} emissive={safetyOrange} emissiveIntensity={0.4} />
        </Cylinder>
        <Cylinder args={[0.4, 0.4, 0.8, 16]} position={[-1.1, 0.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <meshStandardMaterial color={shinySteel} roughness={0.2} metalness={0.9} />
        </Cylinder>
        <Cylinder args={[0.4, 0.4, 0.8, 16]} position={[1.1, 0.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <meshStandardMaterial color={shinySteel} roughness={0.2} metalness={0.9} />
        </Cylinder>
      </group>
    );
  }

  // 4. PAINT SHOP
  if (dept === "PAINT" || dept === "PAINT & FINISH" || dept === "POWER") {
    return (
      <group ref={spinRef}>
        <Box args={[2.8, 0.2, 2.0]} position={[0, -0.8, 0]}>
          <meshStandardMaterial color={darkMetal} roughness={0.7} />
        </Box>
        <Box args={[2.2, 0.6, 1.2]} position={[0, -0.2, 0]}>
          <meshStandardMaterial color={bodyPaint} roughness={0.1} metalness={0.6} />
        </Box>
        <Box args={[0.2, 0.8, 0.2]} position={[-0.8, 0.8, 0]}>
          <meshStandardMaterial color={shinySteel} metalness={0.8} />
        </Box>
        <Box args={[0.2, 0.8, 0.2]} position={[0.8, 0.8, 0]}>
          <meshStandardMaterial color={shinySteel} metalness={0.8} />
        </Box>
        <Cylinder args={[0.02, 0.35, 0.5, 12]} position={[-0.8, 0.25, 0]}>
          <meshStandardMaterial color="#60a5fa" transparent opacity={0.6} emissive="#60a5fa" emissiveIntensity={0.8} />
        </Cylinder>
        <Cylinder args={[0.02, 0.35, 0.5, 12]} position={[0.8, 0.25, 0]}>
          <meshStandardMaterial color="#60a5fa" transparent opacity={0.6} emissive="#60a5fa" emissiveIntensity={0.8} />
        </Cylinder>
      </group>
    );
  }

  // 6. QUALITY ASSURANCE & TESTING
  if (dept === "QUALITY" || dept === "QUALITY & DYNAMO") {
    return (
      <group ref={spinRef}>
        <Box args={[3.0, 0.25, 1.8]} position={[0, -0.7, 0]}>
          <meshStandardMaterial color={darkMetal} roughness={0.7} />
        </Box>
        {/* Dyno Rollers */}
        {[-0.8, 0.8].map((x, i) => (
          <Cylinder key={i} args={[0.22, 0.22, 1.5, 16]} position={[x, -0.5, 0]} rotation={[0, 0, Math.PI / 2]}>
            <meshStandardMaterial color={shinySteel} metalness={0.9} />
          </Cylinder>
        ))}
        {/* Tunnel Light Portal */}
        <Box args={[2.6, 1.6, 0.15]} position={[0, 0.4, 0]}>
          <meshStandardMaterial color="#1e293b" />
        </Box>
        <Box args={[2.2, 0.15, 1.8]} position={[0, 1.2, 0]}>
          <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={1.5} />
        </Box>
      </group>
    );
  }

  // 5. FINAL ASSEMBLY (Default)
  return (
    <group ref={spinRef}>
      <Box args={[3.2, 0.2, 1.8]} position={[0, -0.8, 0]}>
        <meshStandardMaterial color={darkMetal} roughness={0.8} />
      </Box>
      <Box args={[2.6, 0.7, 1.3]} position={[0, -0.15, 0]}>
        <meshStandardMaterial color={bodyPaint} roughness={0.2} metalness={0.7} />
      </Box>
      <Box args={[1.5, 0.55, 1.15]} position={[-0.2, 0.45, 0]}>
        <meshStandardMaterial color={isLightMode ? "#334155" : "#0f172a"} roughness={0.1} metalness={0.9} />
      </Box>
      {[[-0.9, -0.45, -0.72], [0.9, -0.45, -0.72], [-0.9, -0.45, 0.72], [0.9, -0.45, 0.72]].map((pos, i) => (
        <Cylinder key={i} args={[0.32, 0.32, 0.22, 16]} position={[pos[0], pos[1], pos[2]]} rotation={[Math.PI / 2, 0, 0]}>
          <meshStandardMaterial color="#09090b" roughness={0.8} metalness={0.2} />
        </Cylinder>
      ))}
      <Sphere args={[0.12, 12, 12]} position={[1.35, -0.15, -0.45]}>
        <meshStandardMaterial color="#00e5ff" emissive="#00e5ff" emissiveIntensity={1.2} />
      </Sphere>
      <Sphere args={[0.12, 12, 12]} position={[1.35, -0.15, 0.45]}>
        <meshStandardMaterial color="#00e5ff" emissive="#00e5ff" emissiveIntensity={1.2} />
      </Sphere>
    </group>
  );
}

// Complete 7-Department Automotive Telemetry Catalog
const DEPT_DATA: Record<string, { load: string; capacity: string; wait: string; workers: number; loadColor: string; code: string; title: string }> = {
  LOGISTICS:  { code: "DEPT-LOG",   title: "Materials & Automated Staging", load: "78%", capacity: "100%", wait: "1 min", workers: 6, loadColor: "#76ff03" },
  STAMPING:   { code: "DEPT-STAMP", title: "Press & Stamping", load: "85%", capacity: "100%", wait: "2 min", workers: 8, loadColor: "#00e5ff" },
  WELDING:    { code: "DEPT-WELD",  title: "Body Welding & Framing", load: "92%", capacity: "100%", wait: "5 min", workers: 12, loadColor: "#00e5ff" },
  PAINT:      { code: "DEPT-PAINT", title: "Paint & Surface Treatment", load: "75%", capacity: "100%", wait: "1 min", workers: 7, loadColor: "#00e5ff" },
  POWERTRAIN: { code: "DEPT-PWR",   title: "Powertrain & Battery Integration", load: "40%", capacity: "100%", wait: "0 min", workers: 6, loadColor: "#ff9100" },
  ASSEMBLY:   { code: "DEPT-ASSY",  title: "Final Assembly & Marriage", load: "98%", capacity: "100%", wait: "16 min", workers: 18, loadColor: "#ff1744" },
  QUALITY:    { code: "DEPT-QA",    title: "End-of-Line Quality & Testing", load: "82%", capacity: "100%", wait: "2 min", workers: 8, loadColor: "#76ff03" },
};

// Complete Automotive Bill of Materials (BOM) Parts Manufacturing Catalog
const DEPT_COMPONENTS: Record<string, Array<{ code: string; name: string; qty: number; stdHours: number; pct: number; status: string; statusType: "ok" | "warn" | "fault" }>> = {
  LOGISTICS: [
    { code: "LOG-STEEL-COIL",name: "High-Strength Steel Sheet Coils (Grade 980)", qty: 64, stdHours: 0.5, pct: 95, status: "IN PROGRESS", statusType: "ok" },
    { code: "LOG-AGV-KITTING",name: "Automated Parts Kitting Cart Assembly",     qty: 32, stdHours: 0.8, pct: 100, status: "COMPLETED",   statusType: "ok" },
    { code: "LOG-BAT-BUFFER", name: "High-Voltage Battery Cell Buffer Rack",      qty: 24, stdHours: 1.2, pct: 85, status: "IN PROGRESS", statusType: "ok" },
    { code: "LOG-SEAT-JIT",   name: "Just-In-Time Ergonomic Leather Seat Pallets",qty: 48, stdHours: 0.6, pct: 70, status: "IN PROGRESS", statusType: "ok" },
    { code: "LOG-TIRE-CONV",  name: "Automated Tire & Alloy Wheel Overhead Feed", qty: 96, stdHours: 0.4, pct: 100, status: "COMPLETED",   statusType: "ok" },
  ],
  STAMPING: [
    { code: "STP-HOOD-01",  name: "Aluminum Engine Hood Outer Skin",       qty: 48, stdHours: 1.2, pct: 95, status: "IN PROGRESS", statusType: "ok" },
    { code: "STP-DOOR-LH",  name: "Front Left Door High-Strength Panel",   qty: 48, stdHours: 1.4, pct: 100, status: "COMPLETED",   statusType: "ok" },
    { code: "STP-DOOR-RH",  name: "Front Right Door High-Strength Panel",  qty: 48, stdHours: 1.4, pct: 88, status: "IN PROGRESS", statusType: "ok" },
    { code: "STP-ROOF-03",  name: "Panoramic Roof Frame Stamping",         qty: 24, stdHours: 1.8, pct: 75, status: "IN PROGRESS", statusType: "ok" },
    { code: "STP-FENDER-01",name: "Aerodynamic Front Fender Pressing",     qty: 48, stdHours: 0.9, pct: 60, status: "IN PROGRESS", statusType: "ok" },
    { code: "STP-BUMPER-R", name: "Rear Impact Crash Box Stamping",        qty: 36, stdHours: 1.1, pct: 30, status: "QUEUED",      statusType: "warn" },
  ],
  WELDING: [
    { code: "WLD-FLOOR-01", name: "Underbody Floorpan Subassembly",        qty: 32, stdHours: 2.2, pct: 92, status: "IN PROGRESS", statusType: "ok" },
    { code: "WLD-SIDE-LH",  name: "B-Pillar Ultra-High-Strength Side Ring", qty: 32, stdHours: 1.9, pct: 100, status: "COMPLETED",   statusType: "ok" },
    { code: "WLD-SIDE-RH",  name: "B-Pillar Right Reinforcement Ring",     qty: 32, stdHours: 1.9, pct: 85, status: "IN PROGRESS", statusType: "ok" },
    { code: "WLD-CAGE-04",  name: "Cabin Safety Roll Cage Weldment",       qty: 32, stdHours: 2.5, pct: 70, status: "IN PROGRESS", statusType: "ok" },
    { code: "WLD-BULKHEAD", name: "Front Firewall Structural Bulkhead",    qty: 32, stdHours: 1.5, pct: 100, status: "COMPLETED",   statusType: "ok" },
    { code: "WLD-TRUNK-02", name: "Rear Trunk Shock-Tower Crossmember",     qty: 28, stdHours: 1.7, pct: 40, status: "IN PROGRESS", statusType: "warn" },
  ],
  PAINT: [
    { code: "PNT-ED-DIP",   name: "Cathodic Electrocoat (E-Coat) Dip",      qty: 40, stdHours: 1.0, pct: 100, status: "COMPLETED",   statusType: "ok" },
    { code: "PNT-SEAL-PVC", name: "Robotic Underbody PVC Seam Sealant",     qty: 40, stdHours: 1.2, pct: 85, status: "IN PROGRESS", statusType: "ok" },
    { code: "PNT-BASE-BLU", name: "Metallic Arctic Blue Waterborne Basecoat",qty: 40, stdHours: 1.8, pct: 75, status: "IN PROGRESS", statusType: "ok" },
    { code: "PNT-CLEAR-2K", name: "High-Gloss Anti-Scratch 2K Clearcoat",   qty: 40, stdHours: 1.5, pct: 70, status: "IN PROGRESS", statusType: "ok" },
    { code: "PNT-OVEN-140", name: "140°C Curing & Infrared Baking Tunnel",  qty: 40, stdHours: 1.1, pct: 90, status: "IN PROGRESS", statusType: "ok" },
    { code: "PNT-INSP-OPT", name: "Optical Surface Defect Laser Inspection",qty: 36, stdHours: 0.6, pct: 60, status: "IN PROGRESS", statusType: "ok" },
  ],
  POWERTRAIN: [
    { code: "PWR-BATT-82K", name: "82 kWh High-Voltage Traction Battery",  qty: 20, stdHours: 3.5, pct: 40, status: "STARVED",     statusType: "warn" },
    { code: "PWR-DRV-DUAL", name: "Dual Permanent Magnet E-Drive Unit",     qty: 20, stdHours: 2.8, pct: 35, status: "UNDERLOAD",   statusType: "warn" },
    { code: "PWR-INV-800V", name: "Silicon Carbide 800V Power Inverter",   qty: 20, stdHours: 1.6, pct: 45, status: "UNDERLOAD",   statusType: "warn" },
    { code: "PWR-THERM-P",  name: "Liquid Battery Thermal Chiller Unit",   qty: 20, stdHours: 1.4, pct: 100, status: "COMPLETED",   statusType: "ok" },
    { code: "PWR-HARN-HV",  name: "High-Voltage Shielded Busbar Harness",   qty: 20, stdHours: 1.2, pct: 30, status: "UNDERLOAD",   statusType: "warn" },
    { code: "PWR-OBC-22KW", name: "22 kW Bi-directional Onboard Charger",   qty: 20, stdHours: 1.5, pct: 100, status: "COMPLETED",   statusType: "ok" },
  ],
  ASSEMBLY: [
    { code: "ASY-CHASS-MAR",name: "Chassis & Skateboard Marriage Station",  qty: 18, stdHours: 4.2, pct: 98, status: "BOTTLENECK",  statusType: "fault" },
    { code: "ASY-COCKPIT",  name: "Digital Dashboard & Cockpit Module",     qty: 18, stdHours: 3.1, pct: 95, status: "BOTTLENECK",  statusType: "fault" },
    { code: "ASY-SUSP-ADJ", name: "Adaptive Air Suspension Assembly",       qty: 18, stdHours: 2.6, pct: 92, status: "BOTTLENECK",  statusType: "fault" },
    { code: "ASY-WHEEL-TOR",name: "Automated Wheel Lug Nut Torque Station", qty: 18, stdHours: 1.0, pct: 88, status: "IN PROGRESS", statusType: "ok" },
    { code: "ASY-GLAZ-GLS", name: "Acoustic Windshield Robotic Glazing",    qty: 18, stdHours: 1.4, pct: 50, status: "WAITING",     statusType: "warn" },
    { code: "ASY-EOL-DYN",  name: "End-of-Line Dynamometer & ADAS Calib",   qty: 18, stdHours: 2.0, pct: 10, status: "QUEUED",      statusType: "warn" },
  ],
  QUALITY: [
    { code: "QA-DYNO-TEST", name: "High-Speed Chassis Dynamometer Run",     qty: 18, stdHours: 0.8, pct: 100, status: "COMPLETED",   statusType: "ok" },
    { code: "QA-ADAS-RADAR",name: "Forward Radar & LiDAR Target Calibration",qty: 18, stdHours: 1.1, pct: 85, status: "IN PROGRESS", statusType: "ok" },
    { code: "QA-RAIN-CHAM", name: "High-Pressure Monsoon Water Ingress Chamber",qty: 18, stdHours: 0.7, pct: 100, status: "COMPLETED",   statusType: "ok" },
    { code: "QA-ALIGN-4W",  name: "Laser 4-Wheel Steering & Toe-in Alignment",qty: 18, stdHours: 0.9, pct: 75, status: "IN PROGRESS", statusType: "ok" },
    { code: "QA-PAINT-SCAN",name: "Micro-Defect High-Intensity Light Tunnel Scan",qty: 18, stdHours: 0.6, pct: 60, status: "IN PROGRESS", statusType: "ok" },
  ],
};

// Complete 7-Department Automotive Machinery & Equipment Catalog
export interface MachineInfo {
  id: string;
  name: string;
  type: string;
  status: "RUNNING" | "NOMINAL" | "HIGH_LOAD" | "MAINTENANCE" | "STANDBY";
  statusType: "ok" | "warn" | "fault";
  currentPart: string;
  partName: string;
  operator: string;
  metricLabel: string;
  metricValue: string;
  health: number;
  cycleTime: string;
}

const DEPT_MACHINES: Record<string, MachineInfo[]> = {
  LOGISTICS: [
    {
      id: "M-LOG-01",
      name: "Automated Guided Vehicle (AGV) Heavy Tugger Fleet Alpha",
      type: "LiDAR Navigation Heavy Tugger",
      status: "RUNNING",
      statusType: "ok",
      currentPart: "LOG-STEEL-COIL",
      partName: "High-Strength Steel Sheet Coils",
      operator: "R. Gomez (Logistics Lead)",
      metricLabel: "Battery / Speed",
      metricValue: "88% / 1.8 m/s",
      health: 98,
      cycleTime: "240s route",
    },
    {
      id: "M-LOG-02",
      name: "High-Bay Automated Coil & Sheet Storage Stacker",
      type: "AS/RS Twin-Mast Crane",
      status: "RUNNING",
      statusType: "ok",
      currentPart: "LOG-STEEL-COIL",
      partName: "Steel Sheet Staging Rack",
      operator: "Automated PLC Unit #4",
      metricLabel: "Hoist Load / Speed",
      metricValue: "4.2T / 90 m/min",
      health: 96,
      cycleTime: "45s retrieval",
    },
    {
      id: "M-LOG-03",
      name: "KUKA Automated Battery Cell Depalletizer Gantry",
      type: "6-Axis Heavy Gantry Robot",
      status: "NOMINAL",
      statusType: "ok",
      currentPart: "LOG-BAT-BUFFER",
      partName: "HV Battery Cell Buffer Rack",
      operator: "E. Morales (Robotics Tech)",
      metricLabel: "Vacuum Pressure",
      metricValue: "-85 kPa (Secure)",
      health: 99,
      cycleTime: "8s / cell pack",
    },
    {
      id: "M-LOG-04",
      name: "High-Speed Overhead Tire & Wheel Monorail Conveyor",
      type: "Overhead Electric Monorail (EMS)",
      status: "RUNNING",
      statusType: "ok",
      currentPart: "LOG-TIRE-CONV",
      partName: "Tire & Wheel Overhead Feed",
      operator: "S. Tanaka (Systems Operator)",
      metricLabel: "Line Speed / Feed",
      metricValue: "35 m/min",
      health: 94,
      cycleTime: "22s / set of 4",
    },
  ],
  STAMPING: [
    {
      id: "M-STMP-01",
      name: "Schuler 2,500T Hydraulic Tandem Transfer Press",
      type: "High-Tonnage Hydraulic Draw Press",
      status: "RUNNING",
      statusType: "ok",
      currentPart: "STP-HOOD-01",
      partName: "Aluminum Hood Outer Skin",
      operator: "T. Vance (Master Die Setter)",
      metricLabel: "Die Clamping Force",
      metricValue: "24,800 kN (Nominal)",
      health: 95,
      cycleTime: "12 strokes/min",
    },
    {
      id: "M-STMP-02",
      name: "High-Speed Sheet Decoiler & Precision Roller Leveler",
      type: "Continuous Coil Feed System",
      status: "RUNNING",
      statusType: "ok",
      currentPart: "STP-DOOR-LH",
      partName: "Door High-Strength Sheet",
      operator: "J. Miller (Coil Technician)",
      metricLabel: "Feed Rate / Strip Width",
      metricValue: "42 m/min / 1,600mm",
      health: 97,
      cycleTime: "Continuous feed",
    },
    {
      id: "M-STMP-03",
      name: "Trumpf TruLaser 12kW CNC 3D Blanking & Piercing Cell",
      type: "Fiber Laser 3D Trimming Rig",
      status: "NOMINAL",
      statusType: "ok",
      currentPart: "STP-FENDER-01",
      partName: "Aerodynamic Fender Blank",
      operator: "A. Kowalski (Laser Specialist)",
      metricLabel: "Laser Power / Focus",
      metricValue: "11.8 kW / 0.12mm",
      health: 92,
      cycleTime: "18s / blank",
    },
    {
      id: "M-STMP-04",
      name: "Automated Vacuum End-Effector Stamped Panel Stacker",
      type: "Robotic Destacking & Racking Unit",
      status: "RUNNING",
      statusType: "ok",
      currentPart: "STP-DOOR-RH",
      partName: "Right Door Inner Panel",
      operator: "Automated Robotic Cell #2",
      metricLabel: "Suction Pressure / Count",
      metricValue: "-92 kPa / 420 pcs",
      health: 98,
      cycleTime: "6s / panel",
    },
  ],
  WELDING: [
    {
      id: "M-WELD-01",
      name: "Main Unibody Framing Geometrical Fixture (Gate Cell)",
      type: "Multi-Point Hydraulic Clamping Tooling",
      status: "RUNNING",
      statusType: "ok",
      currentPart: "WLD-FLOOR-01",
      partName: "Underbody Floorpan Subassembly",
      operator: "M. Chen (Robotics Tech Lead)",
      metricLabel: "Clamp Repeatability",
      metricValue: "±0.035 mm (Tolerance ±0.05)",
      health: 94,
      cycleTime: "52s / unibody",
    },
    {
      id: "M-WELD-02",
      name: "Fanuc R-2000iC/210F 6-Axis Spot-Welding Robot Alpha",
      type: "Medium-Frequency DC Spot Welder",
      status: "RUNNING",
      statusType: "ok",
      currentPart: "WLD-SIDE-LH",
      partName: "B-Pillar Reinforcement Ring",
      operator: "M. Chen (Tech Lead)",
      metricLabel: "Weld Current / Tip Force",
      metricValue: "14.2 kA / 4.2 kN",
      health: 96,
      cycleTime: "1.2s / spot (48 spots)",
    },
    {
      id: "M-WELD-03",
      name: "Fanuc R-2000iC/210F 6-Axis Spot-Welding Robot Beta",
      type: "Medium-Frequency DC Spot Welder",
      status: "RUNNING",
      statusType: "ok",
      currentPart: "WLD-SIDE-RH",
      partName: "B-Pillar Right Reinforcement",
      operator: "K. Lindqvist (Welding Eng)",
      metricLabel: "Weld Current / Tip Force",
      metricValue: "14.4 kA / 4.1 kN",
      health: 95,
      cycleTime: "1.2s / spot (48 spots)",
    },
    {
      id: "M-WELD-04",
      name: "Trumpf TruDisk 8001 Laser Roof-Brazing Clean Cell",
      type: "8kW Fiber Laser Continuous Seam Rig",
      status: "NOMINAL",
      statusType: "ok",
      currentPart: "WLD-CAGE-04",
      partName: "Safety Roll Cage / Roof Seam",
      operator: "D. Novak (Laser Welder)",
      metricLabel: "Beam Power / Seam Speed",
      metricValue: "7.8 kW / 4.2 m/min",
      health: 98,
      cycleTime: "24s / roof seam",
    },
  ],
  PAINT: [
    {
      id: "M-PNT-01",
      name: "Cathodic Electrocoat (E-Coat) Dip Immersion Tank",
      type: "12-Dip RoDip Cathodic Immersion Cell",
      status: "RUNNING",
      statusType: "ok",
      currentPart: "PNT-ED-DIP",
      partName: "Unibody Immersion Primer",
      operator: "L. Moreau (Finishing Chemist)",
      metricLabel: "Bath Temp / Voltage",
      metricValue: "28.5°C / 315 V DC",
      health: 97,
      cycleTime: "180s immersion",
    },
    {
      id: "M-PNT-02",
      name: "Dürr EcoBell3 High-Speed Rotary Atomizer Array",
      type: "Electrostatic Bell Applicators (7-Axis Gantry)",
      status: "RUNNING",
      statusType: "ok",
      currentPart: "PNT-BASE-BLU",
      partName: "Arctic Blue Metallic Basecoat",
      operator: "F. Rossi (Paint Line Sup)",
      metricLabel: "Turbine RPM / Paint Flow",
      metricValue: "55,000 RPM / 420 ml/min",
      health: 93,
      cycleTime: "48s / vehicle coat",
    },
    {
      id: "M-PNT-03",
      name: "Cross-Draft Cleanroom Air Regulation & Humidity Pod",
      type: "ISO Class 5 Air Filtration Chamber",
      status: "NOMINAL",
      statusType: "ok",
      currentPart: "PNT-CLEAR-2K",
      partName: "Anti-Scratch 2K Clearcoat",
      operator: "Automated HVAC Loop",
      metricLabel: "Air Velocity / Rel. Humidity",
      metricValue: "0.45 m/s / 62% RH",
      health: 99,
      cycleTime: "Continuous purge",
    },
    {
      id: "M-PNT-04",
      name: "Convection & Catalytic Infrared Curing Bake Tunnel",
      type: "Zone-Controlled Curing Oven",
      status: "RUNNING",
      statusType: "ok",
      currentPart: "PNT-OVEN-140",
      partName: "140°C Curing & Baking",
      operator: "C. Weber (Thermal Ops)",
      metricLabel: "Tunnel Zone Temp",
      metricValue: "142°C (Zone 3/4)",
      health: 95,
      cycleTime: "22 min continuous",
    },
  ],
  POWERTRAIN: [
    {
      id: "M-PWR-01",
      name: "82 kWh Structural Battery Skateboard Assembly Jig",
      type: "Cell-to-Pack (CTP) Pneumatic Clamping Rig",
      status: "NOMINAL",
      statusType: "ok",
      currentPart: "PWR-BATT-82K",
      partName: "82 kWh High-Voltage Battery",
      operator: "A. Patel (High-Voltage Lead)",
      metricLabel: "Insulation Resistance",
      metricValue: "780 MΩ (>500 required)",
      health: 98,
      cycleTime: "110s / battery pack",
    },
    {
      id: "M-PWR-02",
      name: "Automated High-Voltage Busbar Multi-Spindle Torquer",
      type: "Controlled-Angle Electric Nutrunner Rig",
      status: "RUNNING",
      statusType: "ok",
      currentPart: "PWR-HARN-HV",
      partName: "Shielded Busbar Harness",
      operator: "T. Thorne (Assembly Tech)",
      metricLabel: "Applied Torque / Angle",
      metricValue: "9.8 Nm ± 0.1 / 90°",
      health: 96,
      cycleTime: "3.5s / terminal",
    },
    {
      id: "M-PWR-03",
      name: "Automated Liquid Thermal Interface Material (TIM) Dispenser",
      type: "CNC 2-Component Polyurethane Dispenser",
      status: "RUNNING",
      statusType: "ok",
      currentPart: "PWR-THERM-P",
      partName: "Liquid Battery Thermal Chiller",
      operator: "Automated Dispenser #1",
      metricLabel: "Bead Volume / Dispense P",
      metricValue: "1,240 ml / 120 bar",
      health: 94,
      cycleTime: "28s / cooling plate",
    },
    {
      id: "M-PWR-04",
      name: "Dual Permanent Magnet E-Drive Planetary Gear Integration Rig",
      type: "High-Precision Spline Alignment Cell",
      status: "NOMINAL",
      statusType: "ok",
      currentPart: "PWR-DRV-DUAL",
      partName: "Dual E-Drive Motor Unit",
      operator: "R. Sharma (Drive Specialist)",
      metricLabel: "Backlash / Runout",
      metricValue: "0.07 mm / 0.012 mm",
      health: 97,
      cycleTime: "45s / gearbox",
    },
  ],
  ASSEMBLY: [
    {
      id: "M-ASY-01",
      name: "Heavy-Duty Overhead Skateboard-to-Chassis Marriage Lift",
      type: "Dual-Column Hydraulic Synchronized Lift",
      status: "HIGH_LOAD",
      statusType: "fault",
      currentPart: "ASY-CHASS-MAR",
      partName: "Chassis & Skateboard Marriage",
      operator: "K. Becker (Line Superintendent)",
      metricLabel: "Lift Stroke / Load Index",
      metricValue: "1,850 mm / 104% (Overload)",
      health: 88,
      cycleTime: "68s (Target: 54s)",
    },
    {
      id: "M-ASY-02",
      name: "Atlas Copco 5-Spindle Automated Wheel Lug Nut Multi-Torquer",
      type: "Simultaneous 5-Axis Electric Nutrunner",
      status: "RUNNING",
      statusType: "ok",
      currentPart: "ASY-WHEEL-TOR",
      partName: "Wheel Lug Nut Fasteners",
      operator: "P. Santos (Assembly Operator)",
      metricLabel: "Torque / Angle Target",
      metricValue: "140 Nm ± 1.2 / 90°",
      health: 97,
      cycleTime: "8s / wheel (4 wheels)",
    },
    {
      id: "M-ASY-03",
      name: "Robotic Windshield & Panoramic Glass Polyurethane Applicator",
      type: "KUKA 6-Axis Adhesive Dispensing Cell",
      status: "RUNNING",
      statusType: "ok",
      currentPart: "ASY-GLAZ-GLS",
      partName: "Acoustic Glass Glazing",
      operator: "J. Larsson (Glazing Tech)",
      metricLabel: "Bead Height / Bead Width",
      metricValue: "11.8 mm / 8.5 mm",
      health: 96,
      cycleTime: "32s / windshield",
    },
    {
      id: "M-ASY-04",
      name: "Cockpit Dashboard & Digital Instrument Modular Manipulator",
      type: "Zero-Gravity Pneumatic Assist Arm",
      status: "RUNNING",
      statusType: "ok",
      currentPart: "ASY-COCKPIT",
      partName: "Cockpit Module Assembly",
      operator: "L. Zhang & M. Scott",
      metricLabel: "Payload / Insertion Force",
      metricValue: "65 kg / 45 N (Guided)",
      health: 95,
      cycleTime: "45s / cockpit",
    },
  ],
  QUALITY: [
    {
      id: "M-QA-01",
      name: "4-Wheel High-Speed Chassis Dynamometer Roller Bench",
      type: "Twin-Roller Regenerative Test Dyno",
      status: "RUNNING",
      statusType: "ok",
      currentPart: "QA-DYNO-TEST",
      partName: "Chassis Dynamometer Run",
      operator: "D. Ross (Chief Metrologist)",
      metricLabel: "Max Test Speed / Regen KW",
      metricValue: "135 km/h / 48 kW Regen",
      health: 98,
      cycleTime: "120s / vehicle run",
    },
    {
      id: "M-QA-02",
      name: "Laser 3D Optical 4-Wheel Steering & Camber/Toe Metrology Rig",
      type: "8-Camera High-Resolution Laser Arch",
      status: "RUNNING",
      statusType: "ok",
      currentPart: "QA-ALIGN-4W",
      partName: "Laser 4-Wheel Alignment",
      operator: "E. Fischer (QA Engineer)",
      metricLabel: "Toe-in / Camber Deviation",
      metricValue: "+0.02° / -0.48° (PASS)",
      health: 99,
      cycleTime: "35s / vehicle",
    },
    {
      id: "M-QA-03",
      name: "Forward ADAS Camera, Radar & Solid-State LiDAR Target Calibration",
      type: "Optical Target Array & Frequency Scanner",
      status: "NOMINAL",
      statusType: "ok",
      currentPart: "QA-ADAS-RADAR",
      partName: "ADAS Radar Target Calibration",
      operator: "S. Gupta (Electronics QA)",
      metricLabel: "Radar Beam Azimuth / Elev",
      metricValue: "0.01° / 0.00° (Calibrated)",
      health: 97,
      cycleTime: "42s / vehicle",
    },
    {
      id: "M-QA-04",
      name: "High-Pressure Monsoon Water Ingress Chamber (IPX9K)",
      type: "96-Nozzle 15-Bar Recirculating Water Rig",
      status: "RUNNING",
      statusType: "ok",
      currentPart: "QA-RAIN-CHAM",
      partName: "Monsoon Ingress Testing",
      operator: "Automated QA Cell #4",
      metricLabel: "Water Pressure / Flow",
      metricValue: "15.2 bar / 650 L/min",
      health: 96,
      cycleTime: "180s cycle",
    },
  ],
};

function getPartProcessStages(partCode: string, dept: string) {
  if (dept === "STAMPING") {
    return [
      { step: 1, name: "Coil Uncoiling & Washing", machine: "M-STMP-02 (Decoiler)", time: "12s", status: "COMPLETED" },
      { step: 2, name: "CNC Blanking & Shearing", machine: "M-STMP-03 (Laser Cell)", time: "18s", status: "COMPLETED" },
      { step: 3, name: "2,500T Deep Draw Forming", machine: "M-STMP-01 (Hydraulic Press)", time: "24s", status: "IN PROGRESS" },
      { step: 4, name: "Laser Trimming & Flanging", machine: "M-STMP-03 (Trimming)", time: "14s", status: "QUEUED" },
      { step: 5, name: "Automated Stacking & CMM Scan", machine: "M-STMP-04 (Stacker)", time: "10s", status: "QUEUED" },
    ];
  }
  if (dept === "WELDING") {
    return [
      { step: 1, name: "Sub-assembly Jig Clamping", machine: "M-WELD-01 (Gate Fixture)", time: "16s", status: "COMPLETED" },
      { step: 2, name: "Robotic Spot Welding Pass 1", machine: "M-WELD-02 (Fanuc Alpha)", time: "28s", status: "COMPLETED" },
      { step: 3, name: "Robotic Spot Welding Pass 2", machine: "M-WELD-03 (Fanuc Beta)", time: "24s", status: "IN PROGRESS" },
      { step: 4, name: "Continuous Laser Roof Brazing", machine: "M-WELD-04 (Trumpf Laser)", time: "20s", status: "QUEUED" },
      { step: 5, name: "Ultrasonic Weld QA Scan", machine: "Non-Destructive Rig", time: "12s", status: "QUEUED" },
    ];
  }
  if (dept === "PAINT") {
    return [
      { step: 1, name: "Degrease & Phosphate Dip", machine: "Pre-Treatment Tunnel", time: "45s", status: "COMPLETED" },
      { step: 2, name: "Cathodic E-Coat Immersion", machine: "M-PNT-01 (RoDip Tank)", time: "90s", status: "COMPLETED" },
      { step: 3, name: "PVC Underbody Seam Sealing", machine: "Sealing Robot Cell", time: "35s", status: "COMPLETED" },
      { step: 4, name: "Metallic Basecoat Spraying", machine: "M-PNT-02 (EcoBell3)", time: "48s", status: "IN PROGRESS" },
      { step: 5, name: "2K Anti-Scratch Oven Bake", machine: "M-PNT-04 (140°C IR Oven)", time: "120s", status: "QUEUED" },
    ];
  }
  if (dept === "POWERTRAIN") {
    return [
      { step: 1, name: "Prismatic Cell Module Stacking", machine: "M-LOG-03 (Cell Gantry)", time: "30s", status: "COMPLETED" },
      { step: 2, name: "Liquid Thermal TIM Dispense", machine: "M-PWR-03 (TIM Dispenser)", time: "28s", status: "COMPLETED" },
      { step: 3, name: "High-Voltage Busbar Torquing", machine: "M-PWR-02 (Busbar Rig)", time: "40s", status: "IN PROGRESS" },
      { step: 4, name: "BMS Flash & Dielectric HiPot Test", machine: "M-PWR-01 (Insulation Rig)", time: "22s", status: "QUEUED" },
      { step: 5, name: "Dual E-Axle Planetary Marriage", machine: "M-PWR-04 (Spline Cell)", time: "45s", status: "QUEUED" },
    ];
  }
  if (dept === "ASSEMBLY") {
    return [
      { step: 1, name: "Cockpit Module Harnessing", machine: "M-ASY-04 (Manipulator)", time: "45s", status: "COMPLETED" },
      { step: 2, name: "Windshield Polyurethane Glaze", machine: "M-ASY-03 (Adhesive Cell)", time: "32s", status: "COMPLETED" },
      { step: 3, name: "Skateboard-to-Chassis Marriage", machine: "M-ASY-01 (Marriage Lift)", time: "68s", status: "IN PROGRESS" },
      { step: 4, name: "Automated 5-Lug Wheel Torquing", machine: "M-ASY-02 (Multi-Torquer)", time: "32s", status: "QUEUED" },
      { step: 5, name: "Coolant & Brake Evac & Fill", machine: "Fluid Vacuum Rig", time: "26s", status: "QUEUED" },
    ];
  }
  if (dept === "QUALITY") {
    return [
      { step: 1, name: "Laser 4-Wheel Toe & Camber Align", machine: "M-QA-02 (Laser Arch)", time: "35s", status: "COMPLETED" },
      { step: 2, name: "ADAS Forward Radar / LiDAR Calib", machine: "M-QA-03 (Target Bench)", time: "42s", status: "COMPLETED" },
      { step: 3, name: "Chassis Dyno & 130 km/h Regen Run", machine: "M-QA-01 (Dyno Rollers)", time: "120s", status: "IN PROGRESS" },
      { step: 4, name: "Monsoon 15-Bar Water Ingress Test", machine: "M-QA-04 (Rain Cell)", time: "180s", status: "QUEUED" },
      { step: 5, name: "High-Intensity LED Tunnel Scan", machine: "Micro-Defect Scanner", time: "40s", status: "QUEUED" },
    ];
  }
  // LOGISTICS
  return [
    { step: 1, name: "Supplier ASN Goods Receipt & Scan", machine: "Dock RFID Portal", time: "20s", status: "COMPLETED" },
    { step: 2, name: "High-Bay Automated Crane Staging", machine: "M-LOG-02 (AS/RS Crane)", time: "45s", status: "COMPLETED" },
    { step: 3, name: "Automated AGV Dispatch to Line", machine: "M-LOG-01 (AGV Tugger)", time: "120s", status: "IN PROGRESS" },
    { step: 4, name: "Overhead Monorail Line Feed", machine: "M-LOG-04 (Monorail)", time: "35s", status: "QUEUED" },
    { step: 5, name: "Kanban Buffer Synchronization", machine: "MES / ERP Gateway", time: "15s", status: "QUEUED" },
  ];
}

function normalizeDept(name: string): string {
  const n = name.toUpperCase();
  if (n.includes("LOG")) return "LOGISTICS";
  if (n.includes("STAMP") || n.includes("MECH")) return "STAMPING";
  if (n.includes("WELD") || n.includes("FAB")) return "WELDING";
  if (n.includes("PAINT")) return "PAINT";
  if (n.includes("POWER") || n.includes("BATT") || n.includes("SENS")) return "POWERTRAIN";
  if (n.includes("QUAL") || n.includes("QA")) return "QUALITY";
  return "ASSEMBLY";
}

export default function DepartmentControlPanel({
  dept: rawDept,
  onClose,
  isLightMode: propLightMode = false,
  onToggleTheme,
}: {
  dept: string;
  onClose: () => void;
  isLightMode?: boolean;
  onToggleTheme?: () => void;
}) {
  const dept = normalizeDept(rawDept);
  const [internalLightMode, setInternalLightMode] = useState(() => {
    if (typeof document !== "undefined") {
      return document.body.classList.contains("light-mode") || propLightMode;
    }
    return propLightMode;
  });
  const [isRebalanced, setIsRebalanced] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "machines" | "partsTable">("overview");
  const [searchTerm, setSearchTerm] = useState("");
  const components = DEPT_COMPONENTS[dept] ?? DEPT_COMPONENTS["ASSEMBLY"];
  const deptMachines = DEPT_MACHINES[dept] ?? DEPT_MACHINES["ASSEMBLY"];
  const [selectedPartCode, setSelectedPartCode] = useState<string>(components[0]?.code || "");
  const [cycleElapsed, setCycleElapsed] = useState<number>(28);

  // Live ticking manufacturing cycle timer
  useEffect(() => {
    const t = setInterval(() => {
      setCycleElapsed((prev) => (prev >= 54 ? 1 : prev + 1));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // Update selected part when dept changes
  useEffect(() => {
    if (components.length > 0) {
      setSelectedPartCode(components[0].code);
    }
  }, [dept, components]);

  const [chatInput, setChatInput] = useState("");
  const [chatLog, setChatLog] = useState([
    { role: "system", content: `Automotive line supervisor connected. Monitoring ${rawDept} production units and takt time.` },
  ]);
  const [logs, setLogs] = useState<Array<{ text: string; type: "muted" | "ok" | "fault" | "warn" }>>([
    { text: `${new Date().toLocaleTimeString()} > Initializing ${rawDept} robotics telemetry...`, type: "muted" },
    { text: `${new Date().toLocaleTimeString()} > Automotive MES bus linked with production twin.`, type: "ok" },
    { text: `${new Date().toLocaleTimeString()} > Processing vehicle chassis batch #VIN-2026-X80...`, type: "muted" },
    {
      text: dept === "ASSEMBLY"
        ? `${new Date().toLocaleTimeString()} > CRITICAL: Marriage lift queue threshold exceeded! Line choked.`
        : `${new Date().toLocaleTimeString()} > Takt time within ±1.5% target tolerance.`,
      type: dept === "ASSEMBLY" ? "fault" : "ok",
    },
  ]);

  const [isTyping, setIsTyping] = useState(false);
  const isOverload = dept === "ASSEMBLY" && !isRebalanced;
  const data = DEPT_DATA[dept] ?? DEPT_DATA["ASSEMBLY"];

  const filteredComponents = components.filter(
    (c) => c.code.toLowerCase().includes(searchTerm.toLowerCase()) || c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleToggle = () => {
    const next = !internalLightMode;
    setInternalLightMode(next);
    if (typeof document !== "undefined") {
      if (next) {
        document.body.classList.add("light-mode");
        localStorage.setItem("hal-theme", "light");
      } else {
        document.body.classList.remove("light-mode");
        localStorage.setItem("hal-theme", "dark");
      }
    }
    if (onToggleTheme) onToggleTheme();
  };

  const handleExecuteShift = () => {
    setIsRebalanced(true);
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [
      ...prev,
      { text: `${time} > ACTION EXECUTED: Reallocated 2 robotics operators from WELDING -> POWERTRAIN/ASSEMBLY.`, type: "ok" },
      { text: `${time} > Marriage line bottleneck cleared. Takt time normalized to 58 sec/vehicle.`, type: "ok" },
    ]);
    setChatLog((prev) => [
      ...prev,
      {
        role: "assistant",
        content: `[REBALANCING COMPLETE] Transferred 2 technicians from Welding to Final Assembly marriage station. Queue load normalized from 98% down to 82% (Nominal).`,
      },
    ]);
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const userMsg = chatInput.trim();
    setChatLog((prev) => [...prev, { role: "user", content: userMsg }]);
    setChatInput("");
    setIsTyping(true);
    setTimeout(() => {
      let reply = `[${data.title}] Current load is ${isRebalanced ? "82%" : data.load} with ${data.workers + (isRebalanced ? 2 : 0)} active technicians.`;
      if (isRebalanced) {
        reply += " Workforce rebalanced. All marriage lifts operating smoothly.";
      } else if (isOverload) {
        reply += " Critical marriage backlog identified. Recommend clicking 'EXECUTE OPERATOR LOAN' to transfer 2 technicians from Body Welding.";
      } else {
        reply += " All automotive manufacturing cells operating within nominal takt times.";
      }
      setChatLog((prev) => [...prev, { role: "assistant", content: reply }]);
      setIsTyping(false);
    }, 600);
  };

  const accent = internalLightMode ? "#0077ff" : "var(--accent)";
  const accentGreen = internalLightMode ? "#16a34a" : "var(--accent2)";
  const accentWarn = internalLightMode ? "#f59e0b" : "var(--warn)";
  const accentFault = internalLightMode ? "#ef4444" : "var(--fault)";
  const textMuted = internalLightMode ? "#64748b" : "var(--muted)";
  const textPrimary = internalLightMode ? "#1a202c" : "var(--text)";

  return (
    <div className="dept-modal" style={{ padding: "16px 24px", maxHeight: "100vh", overflowY: "auto" }}>
      {/* HEADER */}
      <div className="dept-modal-header" style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div className="dept-modal-title">
            {data.title}{" "}
            <span style={{ color: textMuted, fontSize: 11, fontWeight: "normal" }}>
              {"//"} AUTOMOTIVE MANUFACTURING INTELLIGENCE
            </span>
          </div>
          <span
            className={isOverload ? "dept-badge-bottleneck" : "dept-badge-nominal"}
            style={{ fontSize: 9, padding: "3px 10px", borderRadius: 12, fontWeight: "bold" }}
          >
            {isOverload ? "CRITICAL LINE CHOKE" : isRebalanced ? "REBALANCED & NOMINAL" : "OPERATIONAL NOMINAL"}
          </span>
        </div>

          {/* TABS & THEME CONTROLS */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ display: "flex", background: internalLightMode ? "#e2e8f0" : "rgba(0,0,0,0.4)", borderRadius: 6, padding: 2 }}>
              <button
                onClick={() => setActiveTab("overview")}
                style={{
                  background: activeTab === "overview" ? accent : "transparent",
                  color: activeTab === "overview" ? (internalLightMode ? "#fff" : "#000") : textMuted,
                  border: "none",
                  padding: "4px 12px",
                  borderRadius: 4,
                  fontSize: 10,
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                OVERVIEW
              </button>
              <button
                onClick={() => setActiveTab("machines")}
                style={{
                  background: activeTab === "machines" ? accent : "transparent",
                  color: activeTab === "machines" ? (internalLightMode ? "#fff" : "#000") : textMuted,
                  border: "none",
                  padding: "4px 12px",
                  borderRadius: 4,
                  fontSize: 10,
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                MACHINES &amp; WORKSTATIONS ({deptMachines.length})
              </button>
              <button
                onClick={() => setActiveTab("partsTable")}
                style={{
                  background: activeTab === "partsTable" ? accent : "transparent",
                  color: activeTab === "partsTable" ? (internalLightMode ? "#fff" : "#000") : textMuted,
                  border: "none",
                  padding: "4px 12px",
                  borderRadius: 4,
                  fontSize: 10,
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                PARTS &amp; LIVE TRACKER ({components.length})
              </button>
            </div>

          <button
            onClick={handleToggle}
            className="theme-btn"
            title={internalLightMode ? "Switch to Dark Mode" : "Switch to Light Mode"}
            aria-label="Toggle theme"
          >
            {internalLightMode ? "🌙" : "☀️"}
          </button>
          <button
            onClick={onClose}
            className="req-btn"
            style={{ padding: "6px 14px", fontSize: 10 }}
          >
            ◀ BACK TO TWIN
          </button>
        </div>
      </div>

      {/* TAB 1: OVERVIEW & INTERACTIVE CARDS */}
      {activeTab === "overview" && (
        <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 16 }}>
          {/* LEFT COLUMN: Telemetry, Capacity Trend Graph, Predictions */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            
            {/* Telemetry Card */}
            <div className="dept-modal-card">
              <div className="dept-card-title">Production Telemetry</div>
              <div style={{ display: "flex", justifyContent: "space-around", textAlign: "center" }}>
                {[
                  { label: "LINE UTILIZATION", val: isRebalanced ? "82%" : data.load, color: isOverload ? accentFault : isRebalanced ? accentGreen : accent },
                  { label: "RATED CAPACITY", val: data.capacity, color: accent },
                  { label: "BUFFER WAIT", val: isRebalanced ? "2 min" : data.wait, color: isOverload ? accentWarn : accentGreen },
                  { label: "TECHNICIANS", val: `${data.workers + (isRebalanced ? 2 : 0)}`, color: textPrimary },
                ].map((s) => (
                  <div key={s.label}>
                    <div style={{ fontSize: 20, color: s.color, fontWeight: "bold", fontFamily: "var(--font-mono)" }}>{s.val}</div>
                    <div style={{ fontSize: 8, color: textMuted, marginTop: 2, letterSpacing: 1 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Time-Series Capacity vs Demand Trend Graph */}
            <div className="dept-modal-card">
              <div className="dept-card-title">Hourly Capacity vs Demand Horizon</div>
              <div style={{ background: internalLightMode ? "rgba(0,0,0,0.02)" : "rgba(0,0,0,0.3)", padding: "10px 12px", borderRadius: 6, border: "1px solid var(--border)" }}>
                <CapacityTrendChart
                  title={`${data.title} Trend`}
                  subtitle="Shift Telemetry (Hours)"
                  isLightMode={internalLightMode}
                  height={135}
                  unit="h"
                  showActual={true}
                  data={
                    dept === "ASSEMBLY"
                      ? [
                          { label: "06:00", capacity: 28.0, demand: 27.5, actual: 27.0 },
                          { label: "08:00", capacity: 28.0, demand: isRebalanced ? 28.0 : 31.0, actual: isRebalanced ? 28.0 : 28.0 },
                          { label: "10:00", capacity: isRebalanced ? 32.0 : 28.0, demand: isRebalanced ? 28.0 : 32.5, actual: isRebalanced ? 31.0 : 28.0 },
                          { label: "12:00", capacity: isRebalanced ? 26.0 : 22.0, demand: 24.0, actual: 22.0 },
                          { label: "14:00", capacity: isRebalanced ? 32.0 : 28.0, demand: isRebalanced ? 27.0 : 33.0, actual: isRebalanced ? 30.5 : 28.0 },
                          { label: "16:00", capacity: isRebalanced ? 32.0 : 28.0, demand: isRebalanced ? 26.0 : 30.5, actual: isRebalanced ? 29.0 : 28.0 },
                          { label: "18:00", capacity: 28.0, demand: 28.0, actual: 27.5 },
                        ]
                      : dept === "POWERTRAIN"
                      ? [
                          { label: "06:00", capacity: 16.0, demand: 8.0, actual: 7.8 },
                          { label: "08:00", capacity: 16.0, demand: 9.0, actual: 8.5 },
                          { label: "10:00", capacity: 16.0, demand: 8.5, actual: 8.0 },
                          { label: "12:00", capacity: 12.0, demand: 6.0, actual: 5.8 },
                          { label: "14:00", capacity: 16.0, demand: 9.5, actual: 9.0 },
                          { label: "16:00", capacity: 16.0, demand: 10.0, actual: 9.5 },
                          { label: "18:00", capacity: 16.0, demand: 8.0, actual: 7.5 },
                        ]
                      : dept === "WELDING"
                      ? [
                          { label: "06:00", capacity: 24.0, demand: 21.0, actual: 21.2 },
                          { label: "08:00", capacity: 24.0, demand: 22.5, actual: 22.0 },
                          { label: "10:00", capacity: 24.0, demand: 23.0, actual: 22.8 },
                          { label: "12:00", capacity: 18.0, demand: 17.0, actual: 16.8 },
                          { label: "14:00", capacity: 24.0, demand: 22.0, actual: 21.5 },
                          { label: "16:00", capacity: 24.0, demand: 20.5, actual: 20.0 },
                          { label: "18:00", capacity: 24.0, demand: 19.5, actual: 19.0 },
                        ]
                      : dept === "PAINT"
                      ? [
                          { label: "06:00", capacity: 15.0, demand: 11.0, actual: 11.2 },
                          { label: "08:00", capacity: 15.0, demand: 12.0, actual: 11.8 },
                          { label: "10:00", capacity: 15.0, demand: 12.5, actual: 12.0 },
                          { label: "12:00", capacity: 12.0, demand: 9.5, actual: 9.2 },
                          { label: "14:00", capacity: 15.0, demand: 12.0, actual: 11.6 },
                          { label: "16:00", capacity: 15.0, demand: 11.5, actual: 11.0 },
                          { label: "18:00", capacity: 15.0, demand: 10.5, actual: 10.0 },
                        ]
                      : dept === "QUALITY"
                      ? [
                          { label: "06:00", capacity: 20.0, demand: 16.0, actual: 16.0 },
                          { label: "08:00", capacity: 20.0, demand: 17.5, actual: 17.2 },
                          { label: "10:00", capacity: 20.0, demand: 18.0, actual: 17.8 },
                          { label: "12:00", capacity: 16.0, demand: 14.0, actual: 13.8 },
                          { label: "14:00", capacity: 20.0, demand: 17.0, actual: 16.8 },
                          { label: "16:00", capacity: 20.0, demand: 16.5, actual: 16.0 },
                          { label: "18:00", capacity: 20.0, demand: 15.0, actual: 14.8 },
                        ]
                      : [
                          { label: "06:00", capacity: 18.0, demand: 14.5, actual: 14.2 },
                          { label: "08:00", capacity: 18.0, demand: 15.5, actual: 15.0 },
                          { label: "10:00", capacity: 18.0, demand: 16.0, actual: 15.5 },
                          { label: "12:00", capacity: 14.0, demand: 12.0, actual: 11.8 },
                          { label: "14:00", capacity: 18.0, demand: 15.0, actual: 14.8 },
                          { label: "16:00", capacity: 18.0, demand: 15.2, actual: 14.9 },
                          { label: "18:00", capacity: 18.0, demand: 13.5, actual: 13.0 },
                        ]
                  }
                />
              </div>
            </div>

            {/* Predictions & Rebalancing Card */}
            <div className="dept-modal-card">
              <div className="dept-card-title">AI Scheduling &amp; Bottleneck Analysis</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div className="dept-row-item" style={{ borderLeft: `3px solid ${isOverload ? accentFault : accentGreen}` }}>
                  <div style={{ fontSize: 9, color: textMuted }}>TAKT TIME PREDICTION (1HR HORIZON)</div>
                  <div style={{ fontSize: 11, marginTop: 3, color: textPrimary }}>
                    {isOverload
                      ? "Chassis marriage station exceeds cycle limit by 18%. Assembly line starved upstream."
                      : "Nominal takt time (58 sec/unit). Workstations operating within optimal bounds."}
                  </div>
                </div>
                {isOverload && (
                  <div className="dept-row-item" style={{ borderLeft: `3px solid ${accentWarn}` }}>
                    <div style={{ fontSize: 9, color: textMuted }}>RECOMMENDED WORKFORCE TRANSFER</div>
                    <div style={{ fontSize: 11, marginTop: 3, color: textPrimary }}>
                      Loan 2 robotics technicians from Body Welding to marriage station to clear backlog.
                    </div>
                    <button
                      onClick={handleExecuteShift}
                      style={{
                        marginTop: 8,
                        background: accentWarn,
                        color: internalLightMode ? "#ffffff" : "#000000",
                        border: "none",
                        padding: "6px 14px",
                        fontSize: 10,
                        fontWeight: "bold",
                        cursor: "pointer",
                        borderRadius: 3,
                        fontFamily: "inherit",
                        letterSpacing: 1,
                      }}
                    >
                      EXECUTE OPERATOR LOAN
                    </button>
                  </div>
                )}
                {isRebalanced && (
                  <div className="dept-row-item" style={{ borderLeft: `3px solid ${accentGreen}` }}>
                    <div style={{ color: accentGreen, fontWeight: "bold", fontSize: 10 }}>
                      ✓ 2 Technicians Loaned from Body Welding. Line Choke Resolved.
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: 3D Twin View, Mini Parts & Assistant Terminal */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* 3D Model Card */}
            <div className="dept-modal-card" style={{ height: 260, padding: 0, position: "relative" }}>
              <div
                style={{
                  position: "absolute",
                  top: 10,
                  left: 10,
                  zIndex: 10,
                  background: internalLightMode ? "#ffffff" : "#111418",
                  border: `1px solid ${accent}`,
                  color: accent,
                  padding: "4px 10px",
                  fontSize: 9,
                  fontWeight: "bold",
                  letterSpacing: 1,
                  borderRadius: 4,
                }}
              >
                LIVE 3D AUTOMOTIVE TWIN // {data.code}
              </div>
              <Canvas camera={{ position: [0, 1.8, 5.0], fov: 45 }} style={{ borderRadius: 8, background: internalLightMode ? "#f8fafc" : "#0a0c0f" }}>
                <ambientLight intensity={internalLightMode ? 1.5 : 0.8} />
                <directionalLight position={[4, 6, 4]} intensity={internalLightMode ? 1.2 : 0.7} />
                <pointLight color={accent} intensity={2.0} position={[3, 3, 3]} />
                <DeptModel dept={dept} isLightMode={internalLightMode} />
                <OrbitControls autoRotate autoRotateSpeed={1.5} enableZoom={false} minPolarAngle={0.2} maxPolarAngle={Math.PI / 2} />
              </Canvas>
            </div>

            {/* Quick BOM Parts Strip */}
            <div className="dept-modal-card">
              <div className="dept-card-title">
                <span>Active Manufacturing Parts</span>
                <button
                  onClick={() => setActiveTab("partsTable")}
                  style={{ background: "transparent", border: "none", color: accent, fontSize: 9, cursor: "pointer", textDecoration: "underline" }}
                >
                  VIEW FULL TABLE ↗
                </button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {components.slice(0, 4).map((c) => (
                  <div key={c.code} className="dept-row-item" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <span style={{ color: accent, fontWeight: "bold", fontSize: 10 }}>{c.code}</span>
                      <span style={{ color: textMuted, fontSize: 9, marginLeft: 8 }}>{c.name}</span>
                    </div>
                    <span style={{ fontSize: 9, color: c.statusType === "fault" ? accentFault : c.statusType === "warn" ? accentWarn : accentGreen, fontWeight: "bold" }}>
                      {c.pct}% · {c.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Assistant Chat Terminal */}
            <div className="dept-modal-card" style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 180 }}>
              <div className="dept-card-title">Line Automation Terminal</div>
              <div style={{ flex: 1, overflowY: "auto", maxHeight: 110, display: "flex", flexDirection: "column", gap: 4, marginBottom: 8 }}>
                {chatLog.map((m, i) => (
                  <div key={i} className={`chat-msg ${m.role}`}>
                    {m.content}
                  </div>
                ))}
                {isTyping && <div className="chat-msg assistant">...</div>}
              </div>
              <form onSubmit={handleChatSubmit} style={{ display: "flex", gap: 6 }}>
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask supervisor about part buffer, takt time or line speed..."
                  className="dept-chat-input"
                  style={{ flex: 1 }}
                />
                <button type="submit" className="req-btn" style={{ padding: "4px 10px", fontSize: 9 }}>
                  SEND
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MACHINES & WORKSTATIONS */}
      {activeTab === "machines" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Machine Fleet Summary Bar */}
          <div className="glass-panel" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, padding: "12px 18px" }}>
            <div>
              <div style={{ fontSize: 9, color: textMuted }}>TOTAL ACTIVE MACHINES</div>
              <div style={{ fontSize: 20, color: accent, fontWeight: "bold", fontFamily: "var(--font-mono)" }}>
                {deptMachines.length} Units
              </div>
              <div style={{ fontSize: 9, color: accentGreen, marginTop: 2 }}>● 100% Online &amp; Synced</div>
            </div>
            <div>
              <div style={{ fontSize: 9, color: textMuted }}>AVERAGE FLEET HEALTH</div>
              <div style={{ fontSize: 20, color: accentGreen, fontWeight: "bold", fontFamily: "var(--font-mono)" }}>
                {(deptMachines.reduce((acc, m) => acc + m.health, 0) / deptMachines.length).toFixed(1)}%
              </div>
              <div style={{ fontSize: 9, color: textMuted, marginTop: 2 }}>Predictive Maintenance OK</div>
            </div>
            <div>
              <div style={{ fontSize: 9, color: textMuted }}>LINE CONTROL MODE</div>
              <div style={{ fontSize: 12, color: textPrimary, fontWeight: "bold", marginTop: 4 }}>
                AUTOMATED PLC SYNCHRONIZED
              </div>
              <div style={{ fontSize: 9, color: textMuted }}>Profinet / OPC-UA Protocol</div>
            </div>
            <div>
              <div style={{ fontSize: 9, color: textMuted }}>TARGET SHIFT TAKT</div>
              <div style={{ fontSize: 20, color: isOverload ? accentFault : accent, fontWeight: "bold", fontFamily: "var(--font-mono)" }}>
                {isOverload ? "68s (Choked)" : "54s / Vehicle"}
              </div>
              <div style={{ fontSize: 9, color: isOverload ? accentFault : accentGreen }}>
                {isOverload ? "▲ +26% over nominal" : "✓ Within takt tolerance"}
              </div>
            </div>
          </div>

          {/* Machine Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 14 }}>
            {deptMachines.map((m) => {
              const statusColor = m.statusType === "fault" ? accentFault : m.statusType === "warn" ? accentWarn : accentGreen;
              return (
                <div
                  key={m.id}
                  className="glass-panel"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                    borderLeft: `4px solid ${statusColor}`,
                  }}
                >
                  {/* Machine Header */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ color: accent, fontWeight: "bold", fontSize: 12, fontFamily: "var(--font-mono)" }}>{m.id}</span>
                        <span style={{ fontSize: 9, color: textMuted }}>{m.type}</span>
                      </div>
                      <div style={{ fontSize: 12, fontWeight: "bold", color: textPrimary, marginTop: 4 }}>
                        {m.name}
                      </div>
                    </div>
                    <span
                      style={{
                        padding: "3px 8px",
                        borderRadius: 4,
                        fontSize: 9,
                        fontWeight: "bold",
                        fontFamily: "var(--font-mono)",
                        border: `1px solid ${statusColor}`,
                        color: statusColor,
                        background: m.statusType === "fault" ? "rgba(239,68,68,0.12)" : "rgba(118,255,3,0.08)",
                      }}
                    >
                      ● {m.status}
                    </span>
                  </div>

                  {/* Telemetry Readout */}
                  <div style={{ background: internalLightMode ? "#f1f5f9" : "rgba(0,0,0,0.3)", padding: "10px 12px", borderRadius: 6, fontSize: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ color: textMuted }}>{m.metricLabel}:</span>
                      <span style={{ color: accent, fontWeight: "bold", fontFamily: "var(--font-mono)" }}>{m.metricValue}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: textMuted }}>Cycle Speed:</span>
                      <span style={{ color: textPrimary, fontFamily: "var(--font-mono)" }}>{m.cycleTime}</span>
                    </div>
                  </div>

                  {/* Active Part in Manufacturing */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 10, borderTop: "1px solid var(--border)", paddingTop: 8 }}>
                    <div>
                      <div style={{ color: textMuted, fontSize: 8 }}>CURRENT PART IN OPERATION:</div>
                      <div style={{ fontWeight: "bold", color: textPrimary }}>
                        <span style={{ color: accent }}>{m.currentPart}</span> · {m.partName}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedPartCode(m.currentPart);
                        setActiveTab("partsTable");
                      }}
                      className="req-btn"
                      style={{ padding: "4px 8px", fontSize: 9, background: "rgba(0, 229, 255, 0.12)", color: accent }}
                      title="Open Live Part Tracker for this component"
                    >
                      TRACK PART ⚡
                    </button>
                  </div>

                  {/* Health Bar & Operator */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 9, color: textMuted, paddingTop: 4 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span>Health:</span>
                      <div style={{ width: 60, height: 4, background: "rgba(255,255,255,0.1)", borderRadius: 2, overflow: "hidden" }}>
                        <div style={{ width: `${m.health}%`, height: "100%", background: m.health > 90 ? accentGreen : accentWarn }} />
                      </div>
                      <span style={{ color: m.health > 90 ? accentGreen : accentWarn, fontWeight: "bold" }}>{m.health}%</span>
                    </div>
                    <div>Operator: <strong style={{ color: textPrimary }}>{m.operator}</strong></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: COMPLETE PARTS MANUFACTURING & LIVE TRACKING */}
      {activeTab === "partsTable" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* LIVE PART PROCESS TRACKER BANNER */}
          {(() => {
            const currentSelectedPart = components.find((c) => c.code === selectedPartCode) || components[0];
            const stages = getPartProcessStages(currentSelectedPart.code, dept);
            const activeMachine = deptMachines.find((m) => m.currentPart === currentSelectedPart.code) || deptMachines[0];

            return (
              <div
                className="glass-panel"
                style={{
                  padding: 16,
                  border: `1px solid ${accent}`,
                  background: internalLightMode ? "#ffffff" : "rgba(0, 229, 255, 0.04)",
                  boxShadow: "0 0 15px rgba(0, 229, 255, 0.08)",
                }}
              >
                {/* Header row with selector and live badge */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span
                      style={{
                        background: accent,
                        color: internalLightMode ? "#ffffff" : "#000000",
                        padding: "3px 8px",
                        fontSize: 9,
                        fontWeight: "bold",
                        borderRadius: 3,
                        letterSpacing: 1,
                      }}
                    >
                      LIVE PART TRACKER
                    </span>
                    <span style={{ fontSize: 13, fontWeight: "bold", color: textPrimary }}>
                      {currentSelectedPart.code} — {currentSelectedPart.name}
                    </span>
                  </div>

                  {/* Dropdown Part Switcher */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 10, color: textMuted }}>SELECT COMPONENT:</span>
                    <select
                      value={currentSelectedPart.code}
                      onChange={(e) => setSelectedPartCode(e.target.value)}
                      className="dept-chat-input"
                      style={{ fontSize: 10, padding: "4px 8px", cursor: "pointer" }}
                    >
                      {components.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.code} - {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Part Meta Strip */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, background: internalLightMode ? "#f8fafc" : "rgba(0,0,0,0.25)", padding: "10px 14px", borderRadius: 6, fontSize: 10, marginBottom: 14 }}>
                  <div>
                    <span style={{ color: textMuted, display: "block", fontSize: 8 }}>ACTIVE VIN / LOT:</span>
                    <strong style={{ color: accent, fontFamily: "var(--font-mono)" }}>VIN-2026-X80-0042</strong>
                  </div>
                  <div>
                    <span style={{ color: textMuted, display: "block", fontSize: 8 }}>BATCH QUANTITY:</span>
                    <strong style={{ color: textPrimary }}>{currentSelectedPart.qty} Units</strong>
                  </div>
                  <div>
                    <span style={{ color: textMuted, display: "block", fontSize: 8 }}>ACTIVE WORKSTATION:</span>
                    <strong style={{ color: textPrimary }}>{activeMachine ? activeMachine.name : "Station Alpha"}</strong>
                  </div>
                  <div>
                    <span style={{ color: textMuted, display: "block", fontSize: 8 }}>STATION OPERATOR:</span>
                    <strong style={{ color: textPrimary }}>{activeMachine ? activeMachine.operator : "Lead Technician"}</strong>
                  </div>
                  <div>
                    <span style={{ color: textMuted, display: "block", fontSize: 8 }}>QUALITY VERIFICATION:</span>
                    <strong style={{ color: accentGreen }}>TOLERANCE ±0.02mm (PASS ✓)</strong>
                  </div>
                </div>

                {/* Animated Cycle Progress Bar */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, fontSize: 10 }}>
                    <span style={{ color: textPrimary, fontWeight: "bold" }}>
                      Live Takt Progress:{" "}
                      <span style={{ color: accent, fontFamily: "var(--font-mono)" }}>
                        {cycleElapsed}s elapsed / 54s takt cycle
                      </span>
                    </span>
                    <span style={{ color: accentGreen, fontWeight: "bold", fontFamily: "var(--font-mono)" }}>
                      {Math.min(100, Math.round((cycleElapsed / 54) * 100))}% OF CURRENT OPERATION
                    </span>
                  </div>
                  <div style={{ height: 8, background: "rgba(255,255,255,0.08)", borderRadius: 4, overflow: "hidden" }}>
                    <div
                      style={{
                        height: "100%",
                        width: `${Math.min(100, Math.round((cycleElapsed / 54) * 100))}%`,
                        background: "linear-gradient(90deg, var(--accent) 0%, var(--accent2) 100%)",
                        transition: "width 1s linear",
                        boxShadow: "0 0 8px var(--accent)",
                      }}
                    />
                  </div>
                </div>

                {/* Cyber-Physical Machine Model & Conveyor Process Pipeline */}
                <PartProcessPipelineVisualizer
                  partCode={currentSelectedPart.code}
                  partName={currentSelectedPart.name}
                  dept={dept}
                  stages={stages}
                  cycleElapsed={cycleElapsed}
                  isLightMode={internalLightMode}
                  activeMachineName={activeMachine ? activeMachine.name : "Station Alpha"}
                  activeOperator={activeMachine ? activeMachine.operator : "Lead Technician"}
                />
              </div>
            );
          })()}

          {/* BOM PARTS TABLE */}
          <div className="dept-modal-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: accent, fontWeight: "bold", letterSpacing: 1 }}>
                BOM PARTS &amp; SUBASSEMBLY STATUS // {data.title}
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search part number or description..."
                className="dept-chat-input"
                style={{ width: 280 }}
              />
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10, fontFamily: "var(--font-mono)" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)", textAlign: "left", color: textMuted }}>
                    <th style={{ padding: "8px 10px" }}>PART NUMBER</th>
                    <th style={{ padding: "8px 10px" }}>DESCRIPTION</th>
                    <th style={{ padding: "8px 10px" }}>BATCH QTY</th>
                    <th style={{ padding: "8px 10px" }}>STD CYCLE TIME</th>
                    <th style={{ padding: "8px 10px" }}>COMPLETION</th>
                    <th style={{ padding: "8px 10px" }}>LINE STATUS</th>
                    <th style={{ padding: "8px 10px", textAlign: "right" }}>LIVE TRACKING</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredComponents.map((c) => {
                    const statusColor = c.statusType === "fault" ? accentFault : c.statusType === "warn" ? accentWarn : accentGreen;
                    const isSelected = c.code === selectedPartCode;
                    return (
                      <tr
                        key={c.code}
                        style={{
                          borderBottom: "1px solid rgba(255,255,255,0.04)",
                          background: isSelected ? "rgba(0, 229, 255, 0.08)" : "transparent",
                          cursor: "pointer",
                        }}
                        onClick={() => setSelectedPartCode(c.code)}
                      >
                        <td style={{ padding: "10px", color: accent, fontWeight: "bold" }}>
                          {c.code} {isSelected && "▶"}
                        </td>
                        <td style={{ padding: "10px", color: textPrimary }}>{c.name}</td>
                        <td style={{ padding: "10px", color: textMuted }}>{c.qty} units</td>
                        <td style={{ padding: "10px", color: textMuted }}>{c.stdHours} hrs/unit</td>
                        <td style={{ padding: "10px", minWidth: 140 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ flex: 1, height: 6, background: "rgba(255,255,255,0.08)", borderRadius: 3, overflow: "hidden" }}>
                              <div style={{ width: `${c.pct}%`, height: "100%", background: statusColor }} />
                            </div>
                            <span style={{ color: statusColor, fontWeight: "bold" }}>{c.pct}%</span>
                          </div>
                        </td>
                        <td style={{ padding: "10px" }}>
                          <span
                            style={{
                              padding: "3px 8px",
                              borderRadius: 4,
                              border: `1px solid ${statusColor}`,
                              color: statusColor,
                              fontWeight: "bold",
                              fontSize: 9,
                            }}
                          >
                            {c.status}
                          </span>
                        </td>
                        <td style={{ padding: "10px", textAlign: "right" }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPartCode(c.code);
                            }}
                            className="req-btn"
                            style={{
                              padding: "3px 8px",
                              fontSize: 9,
                              background: isSelected ? accent : "transparent",
                              color: isSelected ? (internalLightMode ? "#ffffff" : "#000000") : accent,
                              borderColor: accent,
                            }}
                          >
                            {isSelected ? "TRACKING ACTIVE ●" : "TRACK LIVE ⚡"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
