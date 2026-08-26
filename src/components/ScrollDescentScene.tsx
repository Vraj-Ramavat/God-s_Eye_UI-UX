import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Subcomponent managing camera and terrain properties based on scroll progress
const ScrollCameraController: React.FC<{ scrollPct: number }> = ({ scrollPct }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const pointsRef = useRef<THREE.Points>(null);

  // Procedural landscape geometry with depth colormap colors
  const { positions, colors, indices } = useMemo(() => {
    const size = 18;
    const segments = 26;
    const pos: number[] = [];
    const col: number[] = [];
    const ind: number[] = [];

    // Colormap color specifications
    const cold = new THREE.Color("#3B82C4"); // Steel blue (far/low alt)
    const mid = new THREE.Color("#4FBF8B");  // Muted green (mid alt)
    const hot = new THREE.Color("#E8A33D");  // Amber (close/high alt)

    for (let i = 0; i <= segments; i++) {
      const x = (i / segments - 0.5) * size;
      for (let j = 0; j <= segments; j++) {
        const z = (j / segments - 0.5) * size;
        
        // Complex terrain heightmap representing topological features
        const dist = Math.sqrt(x * x + z * z);
        const y = Math.sin(dist * 0.5) * 1.5 + Math.cos(x * 0.4) * 0.6 - 1.2;
        pos.push(x, y, z);

        // Map height to depth colors
        let vertColor = mid;
        if (y < -1.4) {
          vertColor = cold;
        } else if (y > 0.3) {
          vertColor = hot;
        }
        col.push(vertColor.r, vertColor.g, vertColor.b);
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

  const smoothProgressRef = useRef(scrollPct);

  // Frame tick camera updates driven by scroll progress with framerate-independent damping
  useFrame((state, delta) => {
    const { camera } = state;
    
    // Damp current progress smoothly towards target scrollPct
    smoothProgressRef.current = THREE.MathUtils.damp(smoothProgressRef.current, scrollPct, 12, delta);
    const p = smoothProgressRef.current;

    const targetY = THREE.MathUtils.lerp(18, 3.2, p);
    const targetZ = THREE.MathUtils.lerp(0.01, 8.5, p);
    const targetX = THREE.MathUtils.lerp(0, 8.5, p);

    // Smoothly interpolate current camera position with frame-independent damp
    camera.position.x = THREE.MathUtils.damp(camera.position.x, targetX, 10, delta);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, targetY, 10, delta);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, targetZ, 10, delta);

    // Look at center coordinates
    const lookTarget = new THREE.Vector3(0, -1.0, 0);
    camera.lookAt(lookTarget);
    
    // Slow rotational drift when idle
    const time = state.clock.getElapsedTime();
    if (meshRef.current) {
      meshRef.current.rotation.y = time * 0.03;
    }
    if (pointsRef.current) {
      pointsRef.current.rotation.y = time * 0.03;
    }
  });

  // Dynamic mesh render steps based on scroll progress:
  const isWireframe = scrollPct < 0.35;
  const isPointCloud = scrollPct >= 0.35 && scrollPct < 0.7;
  const isSolidMesh = scrollPct >= 0.7;

  return (
    <group>
      {isWireframe && (
        <mesh ref={meshRef}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[positions, 3]} />
            <bufferAttribute attach="attributes-color" args={[colors, 3]} />
            <bufferAttribute attach="index" args={[indices, 1]} />
          </bufferGeometry>
          <meshBasicMaterial
            color="#3B82C4"
            wireframe={true}
            transparent={true}
            opacity={0.3}
          />
        </mesh>
      )}

      {isPointCloud && (
        <points ref={pointsRef}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[positions, 3]} />
            <bufferAttribute attach="attributes-color" args={[colors, 3]} />
          </bufferGeometry>
          <pointsMaterial
            size={0.1}
            vertexColors={true}
            transparent={true}
            opacity={0.8}
          />
        </points>
      )}

      {isSolidMesh && (
        <mesh ref={meshRef}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[positions, 3]} />
            <bufferAttribute attach="attributes-color" args={[colors, 3]} />
            <bufferAttribute attach="index" args={[indices, 1]} />
          </bufferGeometry>
          <meshStandardMaterial
            vertexColors={true}
            roughness={0.8}
            metalness={0.1}
            flatShading={true}
          />
        </mesh>
      )}
    </group>
  );
};

export const ScrollDescentScene: React.FC<{ scrollProgress: number }> = ({ scrollProgress }) => {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(query.matches);
  }, []);

  const activeProgress = reducedMotion ? 1.0 : scrollProgress;

  return (
    <div className="fixed inset-0 w-full h-full z-0 select-none pointer-events-none">
      <Canvas camera={{ fov: 45 }}>
        <color attach="background" args={['#0A0A0C']} />
        <ambientLight intensity={0.2} />
        <directionalLight position={[10, 15, 5]} intensity={1.1} />
        <pointLight position={[-10, -5, -10]} intensity={0.3} color="#3B82C4" />

        <ScrollCameraController scrollPct={activeProgress} />
      </Canvas>
    </div>
  );
};
