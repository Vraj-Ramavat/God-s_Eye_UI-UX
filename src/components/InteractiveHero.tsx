import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

const STAGES = [
  "Frame Capture",
  "Feature Extraction",
  "Neural Fusion",
  "Mesh Generation",
  "Optimization",
  "Watertight Viewer"
];

// Morphing R3F Model Component
const MorphingModel: React.FC<{ stageIndex: number }> = ({ stageIndex }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const pointsRef = useRef<THREE.Points>(null);

  // Generate procedural heightmap coordinates
  const { positions, colors, indices } = useMemo(() => {
    const size = 18;
    const segments = 22;
    const pos: number[] = [];
    const col: number[] = [];
    const ind: number[] = [];

    // Colormap colors
    const cold = new THREE.Color("#3B82C4"); // Steel blue
    const mid = new THREE.Color("#4FBF8B");  // Muted green
    const hot = new THREE.Color("#E8A33D");  // Amber

    for (let i = 0; i <= segments; i++) {
      const x = (i / segments - 0.5) * size;
      for (let j = 0; j <= segments; j++) {
        const z = (j / segments - 0.5) * size;
        
        // Analytical undulating quarry terrain height
        const dist = Math.sqrt(x * x + z * z);
        const y = Math.sin(dist * 0.5) * 1.5 + Math.cos(x * 0.4) * 0.6;
        pos.push(x, y, z);

        // Map height to depth colormap colors
        let vertexColor = mid;
        if (y < -0.4) {
          vertexColor = cold;
        } else if (y > 0.8) {
          vertexColor = hot;
        }
        col.push(vertexColor.r, vertexColor.g, vertexColor.b);
      }
    }

    const row = segments + 1;
    for (let i = 0; i < segments; i++) {
      for (let j = 0; j < segments; j++) {
        const p1 = i * row + j;
        const p2 = p1 + 1;
        const p3 = (i + 1) * row + j;
        const p4 = p3 + 1;
        ind.push(p1, p3, p2);
        ind.push(p2, p3, p4);
      }
    }

    return {
      positions: new Float32Array(pos),
      colors: new Float32Array(col),
      indices: new Uint32Array(ind),
    };
  }, []);

  // Filter point visibility based on pipeline progress
  const filteredPointsArray = useMemo(() => {
    let visibilityRatio = 0.05; // Stage 0
    if (stageIndex === 1) visibilityRatio = 0.25;
    if (stageIndex >= 2) visibilityRatio = 1.0;

    const totalCount = positions.length / 3;
    const targetCount = Math.floor(totalCount * visibilityRatio);
    const arr = new Float32Array(targetCount * 3);
    const colArr = new Float32Array(targetCount * 3);

    for (let i = 0; i < targetCount; i++) {
      arr[i * 3] = positions[i * 3];
      arr[i * 3 + 1] = positions[i * 3 + 1];
      arr[i * 3 + 2] = positions[i * 3 + 2];

      colArr[i * 3] = colors[i * 3];
      colArr[i * 3 + 1] = colors[i * 3 + 1];
      colArr[i * 3 + 2] = colors[i * 3 + 2];
    }

    return { pos: arr, cols: colArr };
  }, [stageIndex, positions, colors]);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    if (meshRef.current) {
      // Slow background oscillation
      meshRef.current.position.y = Math.sin(time * 0.5) * 0.15;
    }
    if (pointsRef.current) {
      pointsRef.current.position.y = Math.sin(time * 0.5) * 0.15;
    }
  });

  // Render nodes based on stage selection
  const showPoints = stageIndex <= 2;
  const showWireframe = stageIndex === 3;
  const showSolidMesh = stageIndex >= 4;

  return (
    <group position={[0, -0.5, 0]}>
      {showPoints && (
        <points ref={pointsRef}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[filteredPointsArray.pos, 3]}
            />
            <bufferAttribute
              attach="attributes-color"
              args={[filteredPointsArray.cols, 3]}
            />
          </bufferGeometry>
          <pointsMaterial
            size={0.12}
            vertexColors={true}
            transparent={true}
            opacity={0.85}
          />
        </points>
      )}

      {showWireframe && (
        <mesh ref={meshRef}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[positions, 3]}
            />
            <bufferAttribute
              attach="attributes-color"
              args={[colors, 3]}
            />
            <bufferAttribute
              attach="index"
              args={[indices, 1]}
            />
          </bufferGeometry>
          <meshBasicMaterial
            color="#3B82C4"
            wireframe={true}
            transparent={true}
            opacity={0.4}
          />
        </mesh>
      )}

      {showSolidMesh && (
        <mesh ref={meshRef}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[positions, 3]}
            />
            <bufferAttribute
              attach="attributes-color"
              args={[colors, 3]}
            />
            <bufferAttribute
              attach="index"
              args={[indices, 1]}
            />
          </bufferGeometry>
          <meshStandardMaterial
            vertexColors={true}
            roughness={0.7}
            metalness={0.15}
            flatShading={stageIndex === 4}
          />
        </mesh>
      )}
    </group>
  );
};

export const InteractiveHero: React.FC = () => {
  const [stageIndex, setStageIndex] = useState(2);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);
  }, []);

  return (
    <div className="w-full flex flex-col items-center gap-6 relative select-none">
      <div className="w-full h-[400px] md:h-[480px] bg-void border border-line rounded-lg overflow-hidden relative cursor-grab active:cursor-grabbing shadow-inner">
        <div className="absolute inset-0 gis-grid opacity-30 pointer-events-none z-10"></div>
        <div className="absolute top-4 left-4 font-mono text-[9px] text-scan-mid uppercase z-20 flex items-center gap-1.5 bg-void/80 px-2 py-1 rounded border border-line">
          <span className="h-1.5 w-1.5 bg-scan-mid rounded-full animate-pulse"></span>
          <span>interactive point cloud mesh morpher</span>
        </div>

        <Canvas camera={{ position: [11, 8, 11], fov: 42 }}>
          <color attach="background" args={['#0A0A0C']} />
          <ambientLight intensity={0.25} />
          <directionalLight position={[10, 10, 5]} intensity={1.2} />
          <pointLight position={[-10, -5, -10]} intensity={0.5} color="#3B82C4" />

          <MorphingModel stageIndex={stageIndex} />

          <OrbitControls
            enableZoom={true}
            enablePan={false}
            autoRotate={!prefersReducedMotion}
            autoRotateSpeed={0.4}
            maxPolarAngle={Math.PI / 2.2}
            minPolarAngle={Math.PI / 6}
          />
        </Canvas>
      </div>

      <div className="w-full max-w-2xl px-2.5 py-4 bg-void border border-line rounded-lg flex flex-col gap-4 font-mono">
        <div className="flex justify-between items-center text-[10px]">
          <span className="text-text-muted">STAGE SCRUBBER</span>
          <span className="text-scan-hot font-bold">{STAGES[stageIndex].toUpperCase()}</span>
        </div>

        <div className="relative flex items-center px-1">
          <input
            type="range"
            min="0"
            max="5"
            value={stageIndex}
            onChange={(e) => setStageIndex(parseInt(e.target.value))}
            className="w-full h-1 bg-line rounded-lg appearance-none cursor-pointer accent-scan-hot focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-6 gap-0.5 text-center text-[8.5px] leading-tight">
          {STAGES.map((label, idx) => {
            const isActive = stageIndex === idx;
            return (
              <button
                key={label}
                onClick={() => setStageIndex(idx)}
                className={`py-1 border rounded transition-colors ${
                  isActive
                    ? 'border-scan-hot/40 text-scan-hot bg-scan-hot/5 font-extrabold'
                    : 'border-line text-text-muted hover:text-ink-100'
                }`}
              >
                {label.split(" ")[0]}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
