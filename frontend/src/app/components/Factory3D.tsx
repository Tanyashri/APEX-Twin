"use client";

import React, { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text, Grid } from "@react-three/drei";
import * as THREE from "three";
import { useState } from "react";

// Automotive metallic palette
const C = {
  metal:      "#607080",
  metalShiny: "#90a0b0",
  steelDark:  "#1e293b",
  bodyBlue:   "#00e5ff",
  accent:     "#00e5ff",
  accent2:    "#76ff03",
  warn:       "#ff9100",
  fault:      "#ff1744",
};

export const DEPT_DEFS = [
  { name: "LOGISTICS",  pos: [-10, 0, -8] as [number,number,number], color: "#76ff03", title: "STAMPING & LOGISTICS" },
  { name: "STAMPING",   pos: [-4,  0, -8] as [number,number,number], color: "#00e5ff", title: "PRESS & STAMPING" },
  { name: "WELDING",    pos: [ 4,  0, -8] as [number,number,number], color: "#00e5ff", title: "BODY WELDING" },
  { name: "PAINT",      pos: [ 10, 0, -8] as [number,number,number], color: "#00e5ff", title: "PAINT SHOP" },
  { name: "POWERTRAIN", pos: [-8,  0,  4] as [number,number,number], color: "#ff9100", title: "BATTERY & POWERTRAIN" },
  { name: "ASSEMBLY",   pos: [ 0,  0,  0] as [number,number,number], color: "#ff1744", title: "FINAL ASSEMBLY" },
  { name: "QUALITY",    pos: [ 8,  0,  4] as [number,number,number], color: "#76ff03", title: "QUALITY & DYNAMO" },
];

function DepartmentPod({ position, color, name, title, onClick }: {
  position: [number,number,number]; color: string; name: string; title: string; onClick: (n: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const lightRef = useRef<THREE.PointLight>(null!);

  useFrame(({ clock }) => {
    if (lightRef.current) {
      lightRef.current.intensity = hovered
        ? 3.2 + Math.sin(clock.getElapsedTime() * 4) * 0.6
        : 1.1 + Math.sin(clock.getElapsedTime() * 1.5) * 0.3;
    }
  });

  return (
    <group
      position={position}
      onClick={(e) => { e.stopPropagation(); onClick(name); }}
      onPointerOver={() => { setHovered(true); document.body.style.cursor = "pointer"; }}
      onPointerOut={() => { setHovered(false); document.body.style.cursor = "auto"; }}
    >
      {/* Platform */}
      <mesh position={[0, 0.1, 0]} receiveShadow>
        <boxGeometry args={[4.4, 0.2, 4.4]} />
        <meshStandardMaterial color={color} transparent opacity={hovered ? 0.5 : 0.3} roughness={0.4} metalness={0.6} emissive={color} emissiveIntensity={hovered ? 0.4 : 0.12} />
      </mesh>

      {/* Automotive Manufacturing Machines */}
      {name === "LOGISTICS"  && <LogisticsMachines hovered={hovered} />}
      {name === "STAMPING"   && <StampingPressMachine hovered={hovered} />}
      {name === "WELDING"    && <WeldingRoboticsMachine hovered={hovered} />}
      {name === "PAINT"      && <PaintShopMachine hovered={hovered} />}
      {name === "POWERTRAIN" && <PowertrainSkateboardMachine hovered={hovered} />}
      {name === "ASSEMBLY"   && <FinalAssemblyLineMachine hovered={hovered} />}
      {name === "QUALITY"    && <QualityInspectionMachine hovered={hovered} />}

      {/* Label */}
      <Text position={[0, 3.2, 0]} fontSize={0.30} color={color} anchorX="center" anchorY="middle" outlineWidth={0.025} outlineColor="#000000">
        {title}
      </Text>

      {/* Status light pulse */}
      <pointLight ref={lightRef} color={color} intensity={1.0} distance={7} position={[0, 2.2, 0]} />
    </group>
  );
}

// 0. Materials & Automated Logistics Staging (Automated Guided Vehicles / Racks)
function LogisticsMachines({ hovered }: { hovered: boolean }) {
  const agvRef = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    if (agvRef.current) {
      agvRef.current.position.z = Math.sin(clock.getElapsedTime() * 1.5) * 0.6;
    }
  });

  return (
    <group>
      {/* High-Bay Storage Racks */}
      {[-1.2, 1.2].map((x, i) => (
        <group key={i} position={[x, 0.8, 0]}>
          <mesh castShadow><boxGeometry args={[0.6, 1.6, 2.8]} /><meshStandardMaterial color={C.steelDark} roughness={0.7} /></mesh>
          {[-0.8, 0, 0.8].map((z, j) => (
            <mesh key={j} position={[0, 0.2, z]} castShadow><boxGeometry args={[0.5, 0.35, 0.6]} /><meshStandardMaterial color="#3b82f6" metalness={0.4} /></mesh>
          ))}
        </group>
      ))}
      {/* Automated Guided Vehicle (AGV) */}
      <group ref={agvRef} position={[0, 0.25, 0]}>
        <mesh castShadow><boxGeometry args={[0.9, 0.25, 1.3]} /><meshStandardMaterial color="#f59e0b" roughness={0.3} metalness={0.7} /></mesh>
        <mesh position={[0, 0.2, 0]}><boxGeometry args={[0.7, 0.18, 0.9]} /><meshStandardMaterial color="#64748b" metalness={0.8} /></mesh>
        <pointLight color="#76ff03" intensity={0.8} distance={2} position={[0, 0.3, 0]} />
      </group>
    </group>
  );
}

// 1. Hydraulic Stamping Press with Coil Feed
function StampingPressMachine({ hovered }: { hovered: boolean }) {
  const ramRef = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    if (ramRef.current) {
      ramRef.current.position.y = 0.9 + Math.sin(clock.getElapsedTime() * 3) * 0.22;
    }
  });

  return (
    <group>
      <mesh position={[0, 0.45, 0]} castShadow>
        <boxGeometry args={[2.0, 0.5, 1.8]} />
        <meshStandardMaterial color={C.steelDark} roughness={0.5} metalness={0.7} />
      </mesh>
      {[[-0.8, 0, -0.7], [0.8, 0, -0.7], [-0.8, 0, 0.7], [0.8, 0, 0.7]].map((pos, i) => (
        <mesh key={i} position={[pos[0], 1.25, pos[2]]} castShadow>
          <cylinderGeometry args={[0.09, 0.09, 1.6, 16]} />
          <meshStandardMaterial color={C.metalShiny} roughness={0.2} metalness={0.9} />
        </mesh>
      ))}
      <mesh ref={ramRef} position={[0, 1.1, 0]} castShadow>
        <boxGeometry args={[1.6, 0.45, 1.4]} />
        <meshStandardMaterial color={C.metal} roughness={0.3} metalness={0.8} />
      </mesh>
      <mesh position={[-1.5, 0.7, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.45, 0.45, 0.4, 16]} />
        <meshStandardMaterial color={C.metalShiny} roughness={0.2} metalness={0.9} />
      </mesh>
    </group>
  );
}

// 2. Robotic Body Welding Cell with Unibody Fixture
function WeldingRoboticsMachine({ hovered }: { hovered: boolean }) {
  const sparkRef = useRef<THREE.PointLight>(null!);
  useFrame(({ clock }) => {
    if (sparkRef.current) {
      sparkRef.current.intensity = Math.random() > 0.4 ? 2.5 : 0.2;
    }
  });

  return (
    <group>
      <mesh position={[0, 0.35, 0]} castShadow>
        <boxGeometry args={[2.6, 0.35, 1.5]} />
        <meshStandardMaterial color={C.steelDark} roughness={0.6} metalness={0.7} />
      </mesh>
      {[-0.9, 0.9].map((x, i) => (
        <mesh key={i} position={[x, 1.0, 0]} castShadow>
          <boxGeometry args={[0.08, 0.9, 1.3]} />
          <meshStandardMaterial color={C.metalShiny} roughness={0.3} metalness={0.85} />
        </mesh>
      ))}
      <mesh position={[-1.3, 0.7, 1.0]} castShadow>
        <cylinderGeometry args={[0.18, 0.22, 0.7, 12]} />
        <meshStandardMaterial color={C.warn} roughness={0.4} metalness={0.6} />
      </mesh>
      <mesh position={[1.3, 0.7, -1.0]} castShadow>
        <cylinderGeometry args={[0.18, 0.22, 0.7, 12]} />
        <meshStandardMaterial color={C.warn} roughness={0.4} metalness={0.6} />
      </mesh>
      <pointLight ref={sparkRef} color="#00e5ff" intensity={1.5} distance={5} position={[0, 1.1, 0]} />
    </group>
  );
}

// 3. Paint Cleanroom Chamber with Dual Robotic Spray Heads
function PaintShopMachine({ hovered }: { hovered: boolean }) {
  return (
    <group>
      <mesh position={[0, 0.3, 0]} castShadow>
        <boxGeometry args={[2.8, 0.25, 2.0]} />
        <meshStandardMaterial color={C.steelDark} roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.75, 0]} castShadow>
        <boxGeometry args={[2.2, 0.6, 1.2]} />
        <meshStandardMaterial color={C.bodyBlue} roughness={0.1} metalness={0.6} />
      </mesh>
      <mesh position={[0, 1.6, 0]}>
        <boxGeometry args={[2.4, 0.1, 0.2]} />
        <meshStandardMaterial color={C.metalShiny} metalness={0.9} />
      </mesh>
      <mesh position={[-0.6, 1.25, 0]}>
        <coneGeometry args={[0.3, 0.5, 16]} />
        <meshStandardMaterial color="#93c5fd" transparent opacity={0.5} emissive="#93c5fd" emissiveIntensity={0.6} />
      </mesh>
      <mesh position={[0.6, 1.25, 0]}>
        <coneGeometry args={[0.3, 0.5, 16]} />
        <meshStandardMaterial color="#93c5fd" transparent opacity={0.5} emissive="#93c5fd" emissiveIntensity={0.6} />
      </mesh>
    </group>
  );
}

// 4. EV Skateboard Powertrain & Battery Carrier
function PowertrainSkateboardMachine({ hovered }: { hovered: boolean }) {
  return (
    <group>
      <mesh position={[0, 0.35, 0]} castShadow>
        <boxGeometry args={[2.8, 0.25, 1.5]} />
        <meshStandardMaterial color={C.steelDark} roughness={0.4} metalness={0.8} />
      </mesh>
      {[-0.7, -0.15, 0.4, 0.85].map((x, i) => (
        <mesh key={i} position={[x, 0.52, 0]}>
          <boxGeometry args={[0.38, 0.15, 1.2]} />
          <meshStandardMaterial color="#1e3a8a" emissive="#2563eb" emissiveIntensity={0.6} />
        </mesh>
      ))}
      <mesh position={[-1.1, 0.4, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.26, 0.26, 1.1, 16]} />
        <meshStandardMaterial color={C.metalShiny} roughness={0.2} metalness={0.9} />
      </mesh>
      <mesh position={[1.1, 0.4, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.26, 0.26, 1.1, 16]} />
        <meshStandardMaterial color={C.metalShiny} roughness={0.2} metalness={0.9} />
      </mesh>
    </group>
  );
}

// 5. Final Assembly Marriage & Rolling Chassis
function FinalAssemblyLineMachine({ hovered }: { hovered: boolean }) {
  return (
    <group>
      <mesh position={[0, 0.35, 0]} receiveShadow castShadow>
        <boxGeometry args={[3.2, 0.25, 1.8]} />
        <meshStandardMaterial color={C.steelDark} roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.95, 0]} castShadow>
        <boxGeometry args={[2.6, 0.65, 1.3]} />
        <meshStandardMaterial color={C.bodyBlue} roughness={0.2} metalness={0.7} />
      </mesh>
      <mesh position={[-0.2, 1.45, 0]} castShadow>
        <boxGeometry args={[1.5, 0.45, 1.15]} />
        <meshStandardMaterial color="#0f172a" roughness={0.1} metalness={0.9} />
      </mesh>
      {[[-0.9, 0.5, -0.72], [0.9, 0.5, -0.72], [-0.9, 0.5, 0.72], [0.9, 0.5, 0.72]].map((pos, i) => (
        <mesh key={i} position={[pos[0], pos[1], pos[2]]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.34, 0.34, 0.2, 16]} />
          <meshStandardMaterial color="#09090b" roughness={0.9} metalness={0.1} />
        </mesh>
      ))}
      <mesh position={[0, 2.0, 0]}>
        <sphereGeometry args={[0.16, 12, 12]} />
        <meshStandardMaterial color="#ff1744" emissive="#ff1744" emissiveIntensity={0.9} />
      </mesh>
    </group>
  );
}

// 6. Quality Assurance, Dynamometer & ADAS Calibration Tunnel
function QualityInspectionMachine({ hovered }: { hovered: boolean }) {
  const rollerRef = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    if (rollerRef.current) {
      rollerRef.current.rotation.x = clock.getElapsedTime() * 4;
    }
  });

  return (
    <group>
      <mesh position={[0, 0.3, 0]} castShadow>
        <boxGeometry args={[3.0, 0.2, 1.8]} />
        <meshStandardMaterial color={C.steelDark} roughness={0.6} />
      </mesh>
      {/* Dyno Test Rollers */}
      <group ref={rollerRef} position={[0, 0.45, 0]}>
        {[-0.8, 0.8].map((x, i) => (
          <mesh key={i} position={[x, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.18, 0.18, 1.4, 16]} />
            <meshStandardMaterial color={C.metalShiny} metalness={0.9} />
          </mesh>
        ))}
      </group>
      {/* Light Tunnel Arch */}
      <mesh position={[0, 1.2, 0]}>
        <boxGeometry args={[2.6, 1.4, 0.15]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
      <mesh position={[0, 1.8, 0]}>
        <boxGeometry args={[2.2, 0.1, 1.6]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={1.2} />
      </mesh>
    </group>
  );
}

function FlowParticle({ from, to, color, delay = 0 }: { from: [number,number,number]; to: [number,number,number]; color: string; delay?: number }) {
  const meshRef = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    const t = ((clock.getElapsedTime() * 0.28 + delay) % 1);
    if (meshRef.current) {
      meshRef.current.position.x = THREE.MathUtils.lerp(from[0], to[0], t);
      meshRef.current.position.y = THREE.MathUtils.lerp(from[1] + 0.4, to[1] + 0.4, t) + Math.sin(t * Math.PI) * 0.6;
      meshRef.current.position.z = THREE.MathUtils.lerp(from[2], to[2], t);
      meshRef.current.visible = t < 0.96;
    }
  });
  return (
    <mesh ref={meshRef} castShadow>
      <boxGeometry args={[0.25, 0.25, 0.25]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.7} roughness={0.3} metalness={0.4} />
    </mesh>
  );
}

export default function Factory3D({
  onPodClick,
  isLightMode = false,
}: {
  onPodClick: (name: string) => void;
  isLightMode?: boolean;
}) {
  return (
    <div style={{ width: "100%", height: "100%", position: "absolute", top: 0, left: 0 }}>
      <Canvas
        camera={{ position: [0, 18, 22], fov: 42 }}
        shadows
        style={{ background: isLightMode ? "#eef2f6" : "#080a0d", transition: "background 0.3s ease" }}
      >
        <ambientLight intensity={isLightMode ? 1.6 : 0.8} />
        <directionalLight position={[10, 22, 10]} intensity={isLightMode ? 1.5 : 0.8} castShadow />
        <pointLight position={[0, 12, 0]} intensity={isLightMode ? 1.0 : 0.6} color="#00e5ff" />

        {/* Floor grid */}
        <Grid
          position={[0, 0, 0]}
          args={[42, 42]}
          cellSize={1.2}
          cellThickness={0.6}
          cellColor={isLightMode ? "#cbd5e1" : "#111827"}
          sectionSize={6}
          sectionThickness={1.2}
          sectionColor={isLightMode ? "#94a3b8" : "#00e5ff"}
          fadeDistance={34}
          fadeStrength={1.5}
        />

        {/* Complete 7 Automotive Manufacturing Pods */}
        {DEPT_DEFS.map((d) => (
          <DepartmentPod
            key={d.name}
            position={d.pos}
            color={d.color}
            name={d.name}
            title={d.title}
            onClick={onPodClick}
          />
        ))}

        {/* Flow particles from upstream lines to Assembly, and from Assembly to Quality */}
        <FlowParticle from={[-10, 0, -8]} to={[-4, 0, -8]} color="#76ff03" delay={0.0} />
        <FlowParticle from={[-4,  0, -8]} to={[ 4, 0, -8]} color="#00e5ff" delay={0.2} />
        <FlowParticle from={[ 4,  0, -8]} to={[10, 0, -8]} color="#00e5ff" delay={0.4} />
        <FlowParticle from={[10,  0, -8]} to={[ 0, 0,  0]} color="#00e5ff" delay={0.6} />
        <FlowParticle from={[-8,  0,  4]} to={[ 0, 0,  0]} color="#ff9100" delay={0.3} />
        <FlowParticle from={[ 0,  0,  0]} to={[ 8, 0,  4]} color="#76ff03" delay={0.8} />

        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.05}
          minDistance={8}
          maxDistance={44}
          maxPolarAngle={Math.PI / 2.08}
        />
      </Canvas>
    </div>
  );
}
