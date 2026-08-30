import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import * as GaussianSplats3D from '@mkkellogg/gaussian-splats-3d';
import { 
  useAppStore, 
  SAMPLE_SPLAT_URL, 
  SPLAT_PICK_RADIUS_PX 
} from '../store/useAppStore';
import { FlythroughController } from './Viewport/FlythroughController';
import { MeasurementTool3D } from './Viewport/MeasurementTool3D';
import { HudOverlay } from './Viewport/HudOverlay';
import { Upload, AlertCircle } from 'lucide-react';

interface SplatViewportProps {
  splatUrl?: string;
  onPointerClick?: (point: [number, number, number]) => void;
}

// Screenshot Helper inside R3F Canvas
const CanvasScreenshotExporter: React.FC = () => {
  const { screenshotRequested, clearScreenshotRequest } = useAppStore();
  const { gl, scene, camera } = useThree();

  useEffect(() => {
    if (screenshotRequested) {
      gl.render(scene, camera);
      const dataUrl = gl.domElement.toDataURL('image/png');
      
      const link = document.createElement('a');
      link.download = `gods_eye_splat_recon_${new Date().toISOString().slice(0, 10)}.png`;
      link.href = dataUrl;
      link.click();

      clearScreenshotRequest();
    }
  }, [screenshotRequested, gl, scene, camera, clearScreenshotRequest]);

  return null;
};

// Amber Accent Loading Indicator for Gaussian Splat Streaming
const SplatCanvasLoader: React.FC<{ progress?: number }> = ({ progress }) => (
  <Html center>
    <div className="flex flex-col items-center justify-center p-5 bg-[#0A0E0C]/90 border border-[#E8A33D] rounded shadow-2xl space-y-3 backdrop-blur-md min-w-[240px]">
      <div className="relative flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-[#E8A33D] border-t-transparent rounded-full animate-spin" />
        <div className="absolute w-4 h-4 bg-[#E8A33D]/30 rounded-full animate-ping" />
      </div>
      <div className="text-center space-y-1">
        <span className="font-mono text-xs text-[#E8A33D] font-bold tracking-wider animate-pulse block">
          STREAMING 3D GAUSSIAN SPLATS...
        </span>
        <p className="font-mono text-[10px] text-[#8B948C]">
          {progress !== undefined ? `${progress}% Loaded` : 'Ingesting Radiance Field Points'}
        </p>
      </div>
    </div>
  </Html>
);

// Inner R3F Component to manage DropInViewer lifecycle and Splat Raycasting
const SplatMeshContainer: React.FC<{ url: string }> = ({ url }) => {
  const { scene, camera, gl } = useThree();
  const { measurementMode, addMeasurementPoint, setSplatPickHint } = useAppStore();
  const [isLoading, setIsLoading] = useState(true);
  const dropInViewerRef = useRef<any>(null);
  const samplePointsRef = useRef<THREE.Vector3[]>([]);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    // Initialize DropInViewer from gaussian-splats-3d
    let viewer: any = null;
    try {
      viewer = new (GaussianSplats3D as any).DropInViewer({
        gpuAcceleratedSort: true,
        sharedMemoryForWorkers: false,
        selfDrivenMode: true
      });

      dropInViewerRef.current = viewer;
      scene.add(viewer);

      // Load Splat file (supports .splat, .ply, .ksplat)
      viewer.addSplatScene(url, {
        showLoadingUI: false,
        progressiveLoad: true,
        splatAlphaRemovalThreshold: 5,
        position: [0, 0, 0],
        rotation: [0, 0, 0, 1],
        scale: [1, 1, 1]
      })
      .then(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      })
      .catch((err: any) => {
        console.warn("Gaussian Splat load issue, rendering procedural fallback splat field:", err);
        if (isMounted) {
          setIsLoading(false);
        }
      });
    } catch (e: any) {
      console.warn("DropInViewer init warning:", e);
      if (isMounted) setIsLoading(false);
    }

    return () => {
      isMounted = false;
      if (viewer) {
        try {
          scene.remove(viewer);
          if (viewer.dispose) viewer.dispose();
        } catch {
          // cleanup
        }
      }
    };
  }, [url, scene]);

  // Procedural fallback sample splat point cloud if network file is loading/offline
  const fallbackPoints = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const width = 40;
    const depth = 40;
    const count = 4000;
    // Seeded math for stable render purity
    for (let i = 0; i < count; i++) {
      const px = ((i * 17) % 100) / 100 - 0.5;
      const pz = ((i * 31) % 100) / 100 - 0.5;
      const x = px * width;
      const z = pz * depth;
      let y = Math.sin(x * 0.1) * Math.cos(z * 0.1) * 2.5;

      // Add building clusters
      if (Math.abs(x - 4) < 8 && Math.abs(z - 2) < 6) y = ((i * 7) % 60) / 10;
      if (Math.abs(x + 10) < 6 && Math.abs(z + 8) < 5) y = ((i * 13) % 50) / 10;

      pts.push(new THREE.Vector3(x, y, z));
    }
    return pts;
  }, []);

  useEffect(() => {
    samplePointsRef.current = fallbackPoints;
  }, [fallbackPoints]);

  // Frame animation loop
  useFrame(() => {
    if (dropInViewerRef.current && dropInViewerRef.current.update) {
      try {
        dropInViewerRef.current.update();
      } catch {
        // ignore
      }
    }
  });

  // Handle splat point-picking raycasting with screen-space pixel radius search
  const handlePointerDown = (e: THREE.Event | any) => {
    if (!measurementMode) return;
    if (e.stopPropagation) e.stopPropagation();

    const canvasBounds = gl.domElement.getBoundingClientRect();
    const clickX = e.clientX ?? (e.nativeEvent ? e.nativeEvent.clientX : 0);
    const clickY = e.clientY ?? (e.nativeEvent ? e.nativeEvent.clientY : 0);

    // Standard Three.js raycasting against scene / splat mesh objects
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2(
      ((clickX - canvasBounds.left) / canvasBounds.width) * 2 - 1,
      -((clickY - canvasBounds.top) / canvasBounds.height) * 2 + 1
    );
    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(scene.children, true);
    
    let pickedPoint: THREE.Vector3 | null = null;

    if (intersects.length > 0) {
      pickedPoint = intersects[0].point;
    } else {
      // Screen-space radius fallback search over splat centers within SPLAT_PICK_RADIUS_PX
      let minPixelDist = Infinity;
      let closestPt: THREE.Vector3 | null = null;

      const ptsToSearch = samplePointsRef.current.length > 0 ? samplePointsRef.current : fallbackPoints;

      for (const pt of ptsToSearch) {
        const projected = pt.clone().project(camera);
        // Convert normalized device coordinates (-1 to +1) to screen pixels
        const screenX = ((projected.x + 1) * canvasBounds.width) / 2 + canvasBounds.left;
        const screenY = ((-projected.y + 1) * canvasBounds.height) / 2 + canvasBounds.top;

        // Calculate screen-space pixel distance from cursor
        const pixelDist = Math.hypot(screenX - clickX, screenY - clickY);

        if (pixelDist <= SPLAT_PICK_RADIUS_PX && pixelDist < minPixelDist) {
          minPixelDist = pixelDist;
          closestPt = pt;
        }
      }

      if (closestPt) {
        pickedPoint = closestPt;
      }
    }

    if (pickedPoint) {
      setSplatPickHint(null);
      addMeasurementPoint([pickedPoint.x, pickedPoint.y, pickedPoint.z]);
    } else {
      // User clicked too far from any splat point center
      setSplatPickHint("No point detected — try clicking closer to a solid surface");
      setTimeout(() => setSplatPickHint(null), 3000);
    }
  };

  return (
    <group onPointerDown={handlePointerDown}>
      {isLoading && <SplatCanvasLoader />}
      
      {/* Procedural Fallback Gaussian Splat Point Cloud */}
      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[new Float32Array(fallbackPoints.flatMap(p => [p.x, p.y, p.z])), 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.4}
          color="#E8A33D"
          transparent
          opacity={0.7}
          sizeAttenuation
        />
      </points>
    </group>
  );
};

export const SplatViewport: React.FC<SplatViewportProps> = ({ splatUrl }) => {
  const controlsRef = useRef<any>(null);
  const { 
    splatModelUrl, 
    measurementMode, 
    setSplatModelUrl,
    splatPickHint 
  } = useAppStore();

  const [dragOverCanvas, setDragOverCanvas] = useState(false);

  // Active URL: Prop or Zustand Store or Placeholder SAMPLE_SPLAT_URL
  const activeUrl = splatUrl || splatModelUrl || SAMPLE_SPLAT_URL;

  // Drag and Drop .splat / .ply / .ksplat File Handler
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

      {/* Point-Picking Hint Toast Notification when clicking outside radius */}
      {splatPickHint && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 bg-amber-950/90 border border-amber-500/80 text-amber-200 px-4 py-2 rounded-lg shadow-2xl backdrop-blur-md font-mono text-xs flex items-center space-x-2 animate-bounce">
          <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <span>{splatPickHint}</span>
        </div>
      )}

      {/* Drag-and-Drop Visual Splat Canvas Backdrop Overlay */}
      {dragOverCanvas && (
        <div className="absolute inset-0 z-30 bg-[#0A0E0C]/90 border-4 border-dashed border-[#E8A33D] flex flex-col items-center justify-center p-6 backdrop-blur-sm space-y-3">
          <Upload className="w-12 h-12 text-[#E8A33D] animate-bounce" />
          <h3 className="font-display font-bold text-lg text-[#EDEAE2]">DROP .SPLAT / .PLY MODEL FILE</h3>
          <p className="font-mono text-xs text-[#8B948C]">Supports standard .splat, .ply, and compressed .ksplat radiance fields</p>
        </div>
      )}

      {/* R3F 3D WebGL Canvas for 3D Gaussian Splatting */}
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
        />
        <hemisphereLight args={['#E8A33D', '#0A0E0C', 0.6]} />
        <pointLight position={[-20, 30, -20]} color="#4FA9A0" intensity={1.2} />

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

        {/* Gaussian Splat Radiance Field Renderer Container */}
        <React.Suspense fallback={<SplatCanvasLoader />}>
          <SplatMeshContainer url={activeUrl} />
        </React.Suspense>

        {/* 3D Measurement Overlay */}
        <MeasurementTool3D />

        {/* Ground Reference Grid */}
        <gridHelper 
          args={[60, 30, '#E8A33D', '#2A3B32']} 
          position={[0, 0, 0]} 
        />
      </Canvas>
    </div>
  );
};

export default SplatViewport;
