import React from 'react';
import { Html, Line } from '@react-three/drei';
import { useAppStore, type SavedMeasurement } from '../../store/useAppStore';
import { Crosshair, ArrowUp, Square, Ruler } from 'lucide-react';


export const MeasurementTool3D: React.FC = () => {
  const { savedMeasurements, activeMeasurementPoints, measurementMode } = useAppStore();

  // Helper to render individual saved measurement in 3D
  const renderMeasurement = (m: SavedMeasurement) => {
    if (m.type === 'distance' && m.points.length >= 2) {
      const p1 = m.points[0];
      const p2 = m.points[1];
      const midPoint: [number, number, number] = [
        (p1[0] + p2[0]) / 2,
        (p1[1] + p2[1]) / 2 + 0.8,
        (p1[2] + p2[2]) / 2,
      ];

      return (
        <group key={m.id}>
          {/* P1 Marker */}
          <mesh position={p1}>
            <sphereGeometry args={[0.35, 16, 16]} />
            <meshBasicMaterial color="#E8A33D" />
          </mesh>

          {/* P2 Marker */}
          <mesh position={p2}>
            <sphereGeometry args={[0.35, 16, 16]} />
            <meshBasicMaterial color="#E8A33D" />
          </mesh>

          {/* Distance Line */}
          <Line
            points={[p1, p2]}
            color="#E8A33D"
            lineWidth={2.5}
            dashed={true}
            dashSize={0.4}
            gapSize={0.2}
          />

          {/* Monospace 3D Distance Label */}
          <Html position={midPoint} center distanceFactor={25}>
            <div className="bg-[#0A0E0C]/90 text-[#EDEAE2] border border-[#E8A33D] px-2 py-0.5 rounded shadow-lg font-mono text-xs flex items-center space-x-1 whitespace-nowrap">
              <Ruler className="w-3 h-3 text-[#E8A33D]" />
              <span className="text-[#E8A33D] font-bold">DIST:</span>
              <span>{m.formattedValue}</span>
            </div>
          </Html>
        </group>
      );
    }

    if (m.type === 'height' && m.points.length >= 2) {
      const p1 = m.points[0];
      const p2 = m.points[1];
      // Vertical line projection at p1's XZ coordinates
      const verticalTop: [number, number, number] = [p1[0], Math.max(p1[1], p2[1]), p1[2]];
      const verticalBottom: [number, number, number] = [p1[0], Math.min(p1[1], p2[1]), p1[2]];

      const midPoint: [number, number, number] = [
        p1[0],
        (p1[1] + p2[1]) / 2,
        p1[2],
      ];

      return (
        <group key={m.id}>
          {/* Top & Bottom Markers */}
          <mesh position={verticalTop}>
            <cylinderGeometry args={[0.4, 0.4, 0.05, 16]} />
            <meshBasicMaterial color="#4FA9A0" />
          </mesh>
          <mesh position={verticalBottom}>
            <cylinderGeometry args={[0.4, 0.4, 0.05, 16]} />
            <meshBasicMaterial color="#4FA9A0" />
          </mesh>

          {/* Vertical Height Line */}
          <Line
            points={[verticalBottom, verticalTop]}
            color="#4FA9A0"
            lineWidth={3}
          />

          {/* Monospace 3D Height Label */}
          <Html position={midPoint} center distanceFactor={25}>
            <div className="bg-[#0A0E0C]/90 text-[#EDEAE2] border border-[#4FA9A0] px-2 py-0.5 rounded shadow-lg font-mono text-xs flex items-center space-x-1 whitespace-nowrap">
              <ArrowUp className="w-3 h-3 text-[#4FA9A0]" />
              <span className="text-[#4FA9A0] font-bold">{m.formattedValue}</span>
            </div>
          </Html>
        </group>
      );
    }

    if (m.type === 'area' && m.points.length >= 3) {
      const loopPoints = [...m.points, m.points[0]]; // Closed loop
      
      // Calculate center point for area badge label
      const sumX = m.points.reduce((acc, p) => acc + p[0], 0);
      const sumY = m.points.reduce((acc, p) => acc + p[1], 0);
      const sumZ = m.points.reduce((acc, p) => acc + p[2], 0);
      const centerPt: [number, number, number] = [
        sumX / m.points.length,
        sumY / m.points.length + 1.0,
        sumZ / m.points.length,
      ];

      return (
        <group key={m.id}>
          {/* Render Corner Spheres */}
          {m.points.map((pt, idx) => (
            <mesh key={idx} position={pt}>
              <sphereGeometry args={[0.3, 16, 16]} />
              <meshBasicMaterial color="#E8A33D" />
            </mesh>
          ))}

          {/* Render Polygon Outline Loop */}
          <Line
            points={loopPoints}
            color="#E8A33D"
            lineWidth={2.5}
          />

          {/* Monospace 3D Area Label */}
          <Html position={centerPt} center distanceFactor={25}>
            <div className="bg-[#0A0E0C]/90 text-[#EDEAE2] border border-[#E8A33D] px-2.5 py-1 rounded shadow-xl font-mono text-xs flex items-center space-x-1.5 whitespace-nowrap animate-pulse">
              <Square className="w-3.5 h-3.5 text-[#E8A33D]" />
              <span className="text-[#E8A33D] font-bold">AREA:</span>
              <span className="font-bold text-white">{m.formattedValue}</span>
            </div>
          </Html>
        </group>
      );
    }

    return null;
  };

  return (
    <group>
      {/* 1. Render all saved measurements on screen simultaneously */}
      {savedMeasurements.map(renderMeasurement)}

      {/* 2. Render active picking points currently being selected */}
      {activeMeasurementPoints.map((pt, idx) => (
        <group key={`active-${idx}`} position={pt}>
          <mesh>
            <sphereGeometry args={[0.35, 16, 16]} />
            <meshBasicMaterial color={measurementMode === 'height' ? '#4FA9A0' : '#E8A33D'} />
          </mesh>
          <Html position={[0, 0.6, 0]} center distanceFactor={25}>
            <div className="bg-[#0A0E0C]/90 text-[#EDEAE2] border border-[#2A3B32] px-1.5 py-0.5 rounded font-mono text-[10px] whitespace-nowrap">
              <Crosshair className="w-3 h-3 text-[#E8A33D] inline mr-1" />
              <span>PT {idx + 1}</span>
            </div>
          </Html>
        </group>
      ))}

      {/* Render line preview for active points */}
      {activeMeasurementPoints.length >= 2 && (
        <Line
          points={activeMeasurementPoints}
          color="#4FA9A0"
          lineWidth={2}
          dashed={true}
        />
      )}
    </group>
  );
};
