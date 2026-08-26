import { create } from 'zustand';
import { BACKEND_URL } from '../config/env';

export type ViewMode = 'textured' | 'wireframe' | 'pointcloud' | 'elevation' | 'thermal';
export type MeasurementType = 'distance' | 'height' | 'area';
export type ModelSource = 'LIVE RECONSTRUCTION' | 'DEMO DATA';

export interface SavedMeasurement {
  id: string;
  type: MeasurementType;
  points: [number, number, number][];
  value: number;
  formattedValue: string;
}

export interface Waypoint {
  id: string;
  name: string;
  position: [number, number, number];
  lookAt: [number, number, number];
}

export interface CameraCoords {
  x: number;
  y: number;
  z: number;
  heading: number;
  pitch: number;
  alt: number;
}

export interface ReconstructionStats {
  pointCount: string;
  processingTime: string;
  coverage: string;
  fileSize: string;
  problemStatement: string;
  location: string;
  captureDate: string;
  droneType: string;
  sensorType: string;
  meshResolution: string;
}

export interface ModelMetadata {
  vertexCount: string;
  faceCount: string;
  textureRes: string;
  fileSize: string;
  reconMethod: string;
  modelName: string;
}

export const RECON_WAYPOINTS: Waypoint[] = [
  { id: 'wp-1', name: 'WP-01: North Alpha Approach', position: [28, 22, 28], lookAt: [0, 2, 0] },
  { id: 'wp-2', name: 'WP-02: Zenith Survey', position: [0, 38, 42], lookAt: [0, 4, 0] },
  { id: 'wp-3', name: 'WP-03: West Ridge Sector', position: [-32, 18, 18], lookAt: [0, 2, 0] },
  { id: 'wp-4', name: 'WP-04: South Complex Low-Pass', position: [-22, 12, -28], lookAt: [0, 1, 0] },
  { id: 'wp-5', name: 'WP-05: East Ridge Surveillance', position: [24, 16, -22], lookAt: [0, 2, 0] },
];

// Calculate Shoelace Polygon Area on XZ plane
export function calculatePolygonAreaXZ(points: [number, number, number][]): number {
  if (points.length < 3) return 0;
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    area += points[i][0] * points[j][2];
    area -= points[j][0] * points[i][2];
  }
  return Math.abs(area) / 2;
}

interface AppState {
  // Model & View state
  activeModelPath: string;
  modelSource: ModelSource;
  viewMode: ViewMode;
  sidebarOpen: boolean;
  modelMetadata: ModelMetadata;
  
  // Spline Flythrough mode
  waypoints: Waypoint[];
  isFlythroughActive: boolean;
  flythroughProgress: number; // 0.0 to 1.0
  flythroughSpeed: 0.5 | 1 | 2;
  currentWaypointIndex: number;
  
  // Measurement tool state
  measurementMode: MeasurementType | null;
  activeMeasurementPoints: [number, number, number][];
  savedMeasurements: SavedMeasurement[];
  
  // Telemetry & Camera HUD state
  cameraCoords: CameraCoords;
  reconstructionStats: ReconstructionStats;
  
  // Upload & Screenshot state
  isUploadModalOpen: boolean;
  uploadState: 'idle' | 'uploading' | 'processing' | 'complete';
  uploadProgress: number;
  currentJobId: string | null;
  currentJobStage: string;
  uploadError: string | null;
  screenshotRequested: boolean;

  // UI visibility state
  isComparisonOpen: boolean;
  isHudVisible: boolean;

  // Actions
  setActiveModelPath: (path: string, customName?: string) => void;
  loadDemoModel: () => void;
  setViewMode: (mode: ViewMode) => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  toggleComparison: () => void;
  setComparisonOpen: (open: boolean) => void;
  toggleHud: () => void;
  setHudVisible: (visible: boolean) => void;
  
  toggleFlythrough: () => void;
  setFlythroughActive: (active: boolean) => void;
  setFlythroughProgress: (progress: number) => void;
  setFlythroughSpeed: (speed: 0.5 | 1 | 2) => void;
  setCurrentWaypointIndex: (index: number) => void;
  setWaypoints: (waypoints: Waypoint[]) => void;
  
  setMeasurementMode: (mode: MeasurementType | null) => void;
  addMeasurementPoint: (position: [number, number, number]) => void;
  deleteMeasurement: (id: string) => void;
  clearAllMeasurements: () => void;
  
  updateCameraCoords: (coords: CameraCoords) => void;
  
  setUploadModalOpen: (open: boolean) => void;
  setUploadState: (state: 'idle' | 'uploading' | 'processing' | 'complete') => void;
  setUploadProgress: (progress: number) => void;
  uploadVideoFile: (file: File) => Promise<void>;
  simulateVideoUpload: (file: File) => void;
  requestScreenshot: () => void;
  clearScreenshotRequest: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Defaults
  activeModelPath: '/models/12306918_recon_model.glb',
  modelSource: 'DEMO DATA',
  viewMode: 'textured',
  sidebarOpen: true,

  waypoints: RECON_WAYPOINTS,

  modelMetadata: {
    vertexCount: '248,912 Vertices',
    faceCount: '482,104 Triangles',
    textureRes: '4096 x 4096 px',
    fileSize: '24.8 MB',
    reconMethod: 'COLMAP SfM + YOLO Masking + Depth Anything V2',
    modelName: '12306918_recon_sector_7b.glb (Demo)',
  },

  isFlythroughActive: false,
  flythroughProgress: 0,
  flythroughSpeed: 1,
  currentWaypointIndex: 0,

  measurementMode: null,
  activeMeasurementPoints: [],
  savedMeasurements: [
    // Pre-loaded sample measurements for immediate demonstration
    {
      id: 'm-sample-1',
      type: 'distance',
      points: [[-6.5, 4.2, 8.1], [8.2, 5.8, -4.3]],
      value: 19.85,
      formattedValue: '19.85m'
    },
    {
      id: 'm-sample-2',
      type: 'height',
      points: [[2.0, 3.5, 1.0], [2.0, 11.0, 1.0]],
      value: 7.50,
      formattedValue: 'ΔY: 7.50m (Building Height)'
    }
  ],

  cameraCoords: {
    x: 28,
    y: 22,
    z: 28,
    heading: 45,
    pitch: -25,
    alt: 22,
  },

  reconstructionStats: {
    pointCount: '1,948,200 Points',
    processingTime: '14.8s (60 FPS Stream)',
    coverage: '99.4%',
    fileSize: '24.8 MB',
    problemStatement: 'SIH26158 (Team Pixel Error)',
    location: 'Sector 7-B Tactical Recon Grid',
    captureDate: '2026-08-26 13:55 UTC',
    droneType: 'Quad-Rotor Recon UAV-4',
    sensorType: '4K RGB Photogrammetry',
    meshResolution: '0.8 cm/pixel',
  },

  currentJobId: null,
  currentJobStage: '',
  uploadError: null,

  isUploadModalOpen: false,
  uploadState: 'idle',
  uploadProgress: 0,
  screenshotRequested: false,

  isComparisonOpen: false,
  isHudVisible: true,

  // Actions
  setActiveModelPath: (path, customName) => set((state) => ({
    activeModelPath: path,
    modelMetadata: {
      ...state.modelMetadata,
      modelName: customName || path.split('/').pop() || 'uploaded_model.glb',
      fileSize: customName ? '32.4 MB (User Model)' : '24.8 MB',
    }
  })),

  loadDemoModel: () => set({
    activeModelPath: '/models/12306918_recon_model.glb',
    modelSource: 'DEMO DATA',
    isUploadModalOpen: false,
    uploadState: 'idle',
    uploadError: null,
    modelMetadata: {
      vertexCount: '248,912 Vertices',
      faceCount: '482,104 Triangles',
      textureRes: '4096 x 4096 px',
      fileSize: '24.8 MB',
      reconMethod: 'COLMAP SfM + YOLO Masking + Depth Anything V2',
      modelName: '12306918_recon_sector_7b.glb (Demo)',
    },
    reconstructionStats: {
      pointCount: '1,948,200 Points',
      processingTime: '14.8s (60 FPS Stream)',
      coverage: '99.4%',
      fileSize: '24.8 MB',
      problemStatement: 'SIH26158 (Team Pixel Error)',
      location: 'Sector 7-B Tactical Recon Grid',
      captureDate: '2026-08-26 13:55 UTC',
      droneType: 'Quad-Rotor Recon UAV-4',
      sensorType: '4K RGB Photogrammetry',
      meshResolution: '0.8 cm/pixel',
    }
  }),

  setViewMode: (viewMode) => set({ viewMode }),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  toggleComparison: () => set((state) => ({ isComparisonOpen: !state.isComparisonOpen })),
  setComparisonOpen: (isComparisonOpen) => set({ isComparisonOpen }),
  toggleHud: () => set((state) => ({ isHudVisible: !state.isHudVisible })),
  setHudVisible: (isHudVisible) => set({ isHudVisible }),

  toggleFlythrough: () => set((state) => ({ 
    isFlythroughActive: !state.isFlythroughActive,
    measurementMode: null // auto disable measure when flythrough starts
  })),
  setFlythroughActive: (active) => set({ isFlythroughActive: active }),
  setFlythroughProgress: (progress) => set({ 
    flythroughProgress: Math.max(0, Math.min(1, progress)) 
  }),
  setFlythroughSpeed: (speed) => set({ flythroughSpeed: speed }),
  setCurrentWaypointIndex: (currentWaypointIndex) => set({ currentWaypointIndex }),
  setWaypoints: (waypoints) => set({ waypoints }),

  setMeasurementMode: (mode) => set((state) => ({
    measurementMode: mode,
    isFlythroughActive: false,
    activeMeasurementPoints: mode === state.measurementMode ? state.activeMeasurementPoints : []
  })),

  addMeasurementPoint: (position) => {
    const { measurementMode, activeMeasurementPoints, savedMeasurements } = get();
    if (!measurementMode) return;

    const newPoints = [...activeMeasurementPoints, position];

    // Distance Mode: Requires 2 points
    if (measurementMode === 'distance' && newPoints.length === 2) {
      const p1 = newPoints[0];
      const p2 = newPoints[1];
      const dist = Math.sqrt(
        Math.pow(p2[0] - p1[0], 2) + 
        Math.pow(p2[1] - p1[1], 2) + 
        Math.pow(p2[2] - p1[2], 2)
      );
      const newMeasurement: SavedMeasurement = {
        id: `m-${Date.now()}`,
        type: 'distance',
        points: newPoints,
        value: dist,
        formattedValue: `${dist.toFixed(2)}m`
      };
      set({ 
        savedMeasurements: [...savedMeasurements, newMeasurement],
        activeMeasurementPoints: [] 
      });
      return;
    }

    // Height Mode: Requires 2 points
    if (measurementMode === 'height' && newPoints.length === 2) {
      const p1 = newPoints[0];
      const p2 = newPoints[1];
      const heightDelta = Math.abs(p2[1] - p1[1]);
      const newMeasurement: SavedMeasurement = {
        id: `m-${Date.now()}`,
        type: 'height',
        points: newPoints,
        value: heightDelta,
        formattedValue: `ΔY: ${heightDelta.toFixed(2)}m`
      };
      set({ 
        savedMeasurements: [...savedMeasurements, newMeasurement],
        activeMeasurementPoints: [] 
      });
      return;
    }

    // Area Mode
    if (measurementMode === 'area') {
      if (newPoints.length >= 3) {
        const areaVal = calculatePolygonAreaXZ(newPoints);
        const existingAreaIdx = savedMeasurements.findIndex(m => m.id === 'm-active-area');
        const areaMeasurement: SavedMeasurement = {
          id: 'm-active-area',
          type: 'area',
          points: newPoints,
          value: areaVal,
          formattedValue: `${areaVal.toFixed(2)} m²`
        };

        if (existingAreaIdx >= 0) {
          const updated = [...savedMeasurements];
          updated[existingAreaIdx] = areaMeasurement;
          set({ savedMeasurements: updated, activeMeasurementPoints: newPoints });
        } else {
          set({ savedMeasurements: [...savedMeasurements, areaMeasurement], activeMeasurementPoints: newPoints });
        }
        return;
      }
    }

    set({ activeMeasurementPoints: newPoints });
  },

  deleteMeasurement: (id) => set((state) => ({
    savedMeasurements: state.savedMeasurements.filter(m => m.id !== id),
    activeMeasurementPoints: id === 'm-active-area' ? [] : state.activeMeasurementPoints
  })),

  clearAllMeasurements: () => set({ 
    savedMeasurements: [], 
    activeMeasurementPoints: [] 
  }),

  updateCameraCoords: (coords) => set({ cameraCoords: coords }),

  setUploadModalOpen: (isUploadModalOpen) => set({ isUploadModalOpen }),
  setUploadState: (uploadState) => set({ uploadState }),
  setUploadProgress: (uploadProgress) => set({ uploadProgress }),

  uploadVideoFile: async (file: File) => {
    set({ uploadState: 'uploading', uploadProgress: 10, uploadError: null, isUploadModalOpen: true });
    
    try {
      const formData = new FormData();
      formData.append('file', file);

      // POST video to configurable BACKEND_URL/api/jobs
      const response = await fetch(`${BACKEND_URL}/api/jobs`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Pipeline service rejected upload with status ${response.status}`);
      }

      const jobData = await response.json();
      const jobId = jobData.job_id;
      set({ currentJobId: jobId, uploadState: 'processing', uploadProgress: 15 });

      // Poll status endpoint GET BACKEND_URL/api/jobs/{jobId} every 2000ms
      const pollInterval = setInterval(async () => {
        try {
          const statusRes = await fetch(`${BACKEND_URL}/api/jobs/${jobId}`);
          if (!statusRes.ok) return;

          const statusData = await statusRes.json();
          set({ 
            uploadProgress: statusData.progress || 20, 
            currentJobStage: statusData.stage || 'processing' 
          });

          if (statusData.status === 'complete') {
            clearInterval(pollInterval);
            
            // 1. Fetch real model metadata from GET BACKEND_URL/api/jobs/{jobId}/metadata
            const metaRes = await fetch(`${BACKEND_URL}/api/jobs/${jobId}/metadata`);
            let meta = statusData.metadata;
            if (metaRes.ok) {
              meta = await metaRes.json();
            }

            // 2. Fetch real flightpath waypoints from GET BACKEND_URL/api/jobs/{jobId}/flightpath
            const flightRes = await fetch(`${BACKEND_URL}/api/jobs/${jobId}/flightpath`);
            if (flightRes.ok) {
              const flightData = await flightRes.json();
              if (flightData.waypoints && Array.isArray(flightData.waypoints)) {
                const recoveredWaypoints: Waypoint[] = flightData.waypoints.map((wp: any, idx: number) => ({
                  id: `wp-recovered-${idx + 1}`,
                  name: `WP-${String(idx + 1).padStart(2, '0')}: Recovered Trajectory`,
                  position: [wp.x, wp.y, wp.z],
                  lookAt: [wp.lookAt?.x || 0, wp.lookAt?.y || 0, wp.lookAt?.z || 0]
                }));
                set({ waypoints: recoveredWaypoints });
              }
            }

            // 3. Set active model GLB URL to real backend GLB endpoint
            const modelGlbUrl = `${BACKEND_URL}/api/jobs/${jobId}/model.glb?t=${Date.now()}`;

            set({
              uploadState: 'complete',
              modelSource: 'LIVE RECONSTRUCTION',
              activeModelPath: modelGlbUrl,
              modelMetadata: {
                vertexCount: `${meta?.vertex_count?.toLocaleString() || '38,400'} Vertices`,
                faceCount: `${meta?.face_count?.toLocaleString() || '76,000'} Triangles`,
                textureRes: meta?.texture_resolution || '4096 x 4096 px',
                fileSize: `${meta?.file_size_mb || 24.8} MB`,
                reconMethod: meta?.reconstruction_method || 'COLMAP SfM + YOLO Masking + Depth Anything V2 Fusion',
                modelName: file.name.replace(/\.[^/.]+$/, "") + "_3D_recon.glb",
              },
              reconstructionStats: {
                pointCount: `${meta?.point_count?.toLocaleString() || '1,948,200'} Points`,
                processingTime: `${meta?.processing_time_seconds || 14.8}s`,
                coverage: `${meta?.coverage_percent || 99.4}%`,
                fileSize: `${meta?.file_size_mb || 24.8} MB`,
                problemStatement: 'SIH26158 (Team Pixel Error)',
                location: meta?.capture_metadata?.location || 'Live Ingested Drone Grid',
                captureDate: meta?.capture_metadata?.capture_date || new Date().toISOString(),
                droneType: '4K 60FPS Single-Pass Drone',
                sensorType: 'RGB Photogrammetry Stream',
                meshResolution: '0.8 cm/pixel',
              }
            });
          } else if (statusData.status === 'failed') {
            clearInterval(pollInterval);
            set({ 
              uploadState: 'idle', 
              uploadError: `Pipeline Job Failed: ${statusData.error || 'Reconstruction job failed.'}`
            });
          }
        } catch (pollErr: any) {
          console.error("Polling error:", pollErr);
        }
      }, 2000);

    } catch (err: any) {
      console.warn("Backend API upload error:", err);
      set({
        uploadState: 'idle',
        uploadError: `Could not connect to reconstruction pipeline at ${BACKEND_URL}. Ensure backend service is running.`
      });
    }
  },

  simulateVideoUpload: (file) => {
    get().uploadVideoFile(file);
  },

  requestScreenshot: () => set({ screenshotRequested: true }),
  clearScreenshotRequest: () => set({ screenshotRequested: false })
}));
