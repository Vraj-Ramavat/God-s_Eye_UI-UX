import React, { Suspense, useRef, useState, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import { TerrainModel } from './TerrainModel';
import { SplatViewport } from './SplatViewport';
import { FlythroughController } from './FlythroughController';
import { MeasurementTool3D } from './MeasurementTool3D';
import { HudOverlay } from './HudOverlay';
import { useAppStore } from '../../store/useAppStore';
import { Upload } from 'lucide-react';

// Screenshot Helper Component inside R3F Canvas context
const CanvasScreenshotExporter: React.FC = () => {
  const { screenshotRequested, clearScreenshotRequest } = useAppStore();
  const { gl, scene, camera } = useThree();

  useEffect(() => {
    if (screenshotRequested) {
      gl.render(scene, camera);
      const dataUrl = gl.domElement.toDataURL('image/png');
      
      const link = document.createElement('a');
      link.download = `gods_eye_recon_${new Date().toISOString().slice(0, 10)}.png`;
      link.href = dataUrl;
      link.click();

      clearScreenshotRequest();
    }
  }, [screenshotRequested, gl, scene, camera, clearScreenshotRequest]);

  return null;
};

// Minimal Loading Fallback Indicator with Amber Accent
const CanvasLoader: React.FC = () => (
  <Html center>
    <div className="flex flex-col items-center justify-center p-4 bg-[#0A0E0C]/90 border border-[#E8A33D] rounded shadow-2xl space-y-2">
      <div className="w-8 h-8 border-2 border-[#E8A33D] border-t-transparent rounded-full animate-spin" />
      <span className="font-mono text-xs text-[#E8A33D] tracking-wider animate-pulse">
        STREAMING 3D MESH MODEL...
      </span>
    </div>
  </Html>
);

export const ViewportCanvas: React.FC = () => {
  const controlsRef = useRef<any>(null);
  const { 
    pipelineType, 
    setPipelineType, 
    measurementMode, 
    setActiveModelPath, 
    setSplatModelUrl 
  } = useAppStore();
  
  const [dragOverCanvas, setDragOverCanvas] = useState(false);

  // If splat mode is active, render SplatViewport
  if (pipelineType === 'splat') {
    return <SplatViewport />;
  }

  // Drag and Drop Model Handler (GLB / GLTF or SPLAT / PLY)
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverCanvas(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverCanvas(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverCanvas(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const lower = file.name.toLowerCase();
      if (lower.endsWith('.splat') || lower.endsWith('.ply') || lower.endsWith('.ksplat')) {
        const objectUrl = URL.createObjectURL(file);
        setSplatModelUrl(objectUrl, file.name);
        setPipelineType('splat');
      } else if (lower.endsWith('.glb') || lower.endsWith('.gltf')) {
        const objectUrl = URL.createObjectURL(file);
        setActiveModelPath(objectUrl, file.name);
        setPipelineType('mesh');
      }
    }
  };

  return (
    <div 
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="relative w-full h-full bg-[#0A0E0C] overflow-hidden select-none"
    >
      {/* Tactical HUD Overlay DOM Layer */}
      <HudOverlay />

      {/* Drag-and-Drop Visual Canvas Backdrop Overlay */}
      {dragOverCanvas && (
        <div className="absolute inset-0 z-30 bg-[#0A0E0C]/90 border-4 border-dashed border-[#E8A33D] flex flex-col items-center justify-center p-6 backdrop-blur-sm space-y-3">
          <Upload className="w-12 h-12 text-[#E8A33D] animate-bounce" />
          <h3 className="font-display font-bold text-lg text-[#EDEAE2]">DROP 3D MODEL FILE TO SWAP VIEWPORT</h3>
          <p className="font-mono text-xs text-[#8B948C]">Supports .GLB, .SPLAT, .PLY, & .KSPLAT Photogrammetry outputs</p>
        </div>
      )}

      {/* R3F 3D WebGL Canvas */}
      <Canvas
        shadows
        camera={{ position: [28, 22, 28], fov: 45, near: 0.1, far: 500 }}
        style={{ width: '100%', height: '100%', cursor: measurementMode ? 'crosshair' : 'grab' }}
        gl={{ antialias: true, alpha: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' }}
      >
        <color attach="background" args={['#0A0E0C']} />
        
        {/* Soft Studio & Recon Tactical Light Rig */}
        <ambientLight color="#121815" intensity={1.5} />
        <directionalLight
          position={[30, 45, 20]}
          intensity={1.8}
          color="#EDEAE2"
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-bias={-0.0001}
        />
        <hemisphereLight args={['#4FA9A0', '#0A0E0C', 0.6]} />
        <pointLight position={[-20, 30, -20]} color="#E8A33D" intensity={1.2} />

        {/* Orbit Controls */}
        <OrbitControls
          ref={controlsRef}
          enableDamping
          dampingFactor={0.05}
          maxPolarAngle={Math.PI / 2.05}
          minDistance={5}
          maxDistance={120}
        />

        {/* Camera Flythrough Controller */}
        <FlythroughController controlsRef={controlsRef} />

        {/* Canvas Screenshot Capture Helper */}
        <CanvasScreenshotExporter />

        {/* Main 3D Recon Model */}
        <Suspense fallback={<CanvasLoader />}>
          <TerrainModel />
        </Suspense>

        {/* 3D Measurement Overlay */}
        <MeasurementTool3D />
      </Canvas>
    </div>
  );
};

