import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { 
  X, 
  Upload, 
  Video, 
  Cpu, 
  CheckCircle, 
  AlertCircle,
  Sparkles
} from 'lucide-react';


export const UploadModal: React.FC = () => {
  const { 
    isUploadModalOpen, 
    setUploadModalOpen, 
    uploadState, 
    uploadProgress, 
    currentJobStage,
    uploadError,
    uploadVideoFile,
    loadDemoModel,
    setUploadState,
    reconstructionStats
  } = useAppStore();

  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  if (!isUploadModalOpen) return null;

  const getReadableStage = (stage: string) => {
    switch (stage?.toLowerCase()) {
      case 'queued': return 'Queued for GPU Pipeline';
      case 'extracting_frames': return 'Extracting Drone Video Keyframes';
      case 'masking_dynamic_objects': return 'Detecting & Masking Moving Objects (YOLOv8)';
      case 'estimating_poses': return 'Tracking Camera Positions (COLMAP SfM)';
      case 'estimating_depth': return 'Predicting Depth Maps (Depth Anything V2)';
      case 'fusing_depth': return 'Filling Reconstruction Gaps & Point Fusion';
      case 'meshing': return 'Synthesizing 3D Surface Mesh (Open3D Poisson)';
      case 'texturing': return 'Baking Photogrammetric Vertex Colors';
      case 'exporting': return 'Exporting Binary GLB & Metadata';
      case 'complete': return 'Reconstruction Complete';
      default: return stage || 'Executing Pipeline';
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      uploadVideoFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      uploadVideoFile(file);
    }
  };

  const handleClose = () => {
    setUploadModalOpen(false);
    if (uploadState === 'complete') {
      setUploadState('idle');
      setSelectedFile(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0A0E0C]/85 backdrop-blur-md flex items-center justify-center p-4 select-none animate-fadeIn">
      <div className="bg-[#121815] border border-[#2A3B32] w-full max-w-lg rounded-lg shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2A3B32] bg-[#0A0E0C]">
          <div className="flex items-center space-x-2">
            <Video className="w-5 h-5 text-[#E8A33D]" />
            <h2 className="font-display font-bold text-base text-[#EDEAE2]">INGEST DRONE RECON FOOTAGE</h2>
          </div>
          <button 
            onClick={handleClose}
            className="text-[#8B948C] hover:text-[#EDEAE2] p-1 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          {/* Error Message Display */}
          {uploadError && (
            <div className="bg-red-950/60 border border-red-500/50 p-3 rounded text-xs font-mono text-red-200 flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">INGESTION ERROR</p>
                <p className="mt-0.5 text-red-300">{uploadError}</p>
              </div>
            </div>
          )}

          {/* State 1: IDLE - Dropzone */}
          {uploadState === 'idle' && (
            <div className="space-y-4">
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`
                  border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200
                  flex flex-col items-center justify-center space-y-3
                  ${dragActive 
                    ? 'border-[#E8A33D] bg-[#E8A33D]/10' 
                    : 'border-[#2A3B32] bg-[#0A0E0C] hover:border-[#E8A33D]/60 hover:bg-[#0A0E0C]/80'
                  }
                `}
              >
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleFileChange}
                  className="hidden"
                  id="drone-video-input"
                />
                <label htmlFor="drone-video-input" className="cursor-pointer flex flex-col items-center space-y-3">
                  <div className="p-4 rounded-full bg-[#121815] border border-[#2A3B32] text-[#E8A33D]">
                    <Upload className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="font-display font-semibold text-sm text-[#EDEAE2]">
                      Drag & Drop Aerial Video Footage Here
                    </p>
                    <p className="text-xs font-mono text-[#8B948C] mt-1">
                      Supports .MP4, .MOV, .AVI single-pass drone reconnaissance streams
                    </p>
                  </div>
                  <span className="px-4 py-1.5 rounded bg-[#E8A33D] text-[#0A0E0C] font-mono text-xs font-bold hover:bg-[#d49231] transition-colors">
                    BROWSE FILES
                  </span>
                </label>
              </div>

              {/* Explicit Load Demo Model Option */}
              <div className="pt-2 text-center border-t border-[#2A3B32]">
                <button
                  onClick={loadDemoModel}
                  className="text-xs font-mono text-[#4FA9A0] hover:text-[#78C7BE] hover:underline transition-colors py-1 px-3"
                >
                  ⚡ LOAD DEMO SAMPLE MODEL (OFFLINE MODE)
                </button>
              </div>
            </div>
          )}

          {/* State 2: UPLOADING */}
          {uploadState === 'uploading' && (
            <div className="space-y-4 py-4 text-center">
              <div className="flex items-center justify-center space-x-2 text-[#E8A33D]">
                <Upload className="w-6 h-6 animate-bounce" />
                <span className="font-mono font-bold text-sm">UPLOADING DRONE FOOTAGE...</span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-[#0A0E0C] h-3 rounded-full overflow-hidden border border-[#2A3B32]">
                <div 
                  className="bg-[#E8A33D] h-full transition-all duration-300 shadow-[0_0_10px_rgba(232,163,61,0.5)]"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>

              <div className="flex justify-between font-mono text-xs text-[#8B948C]">
                <span>{selectedFile ? selectedFile.name : 'recon_drone_pass.mp4'}</span>
                <span className="text-[#E8A33D]">{uploadProgress}%</span>
              </div>
            </div>
          )}

          {/* State 3: PROCESSING PHOTOGRAMMETRY */}
          {uploadState === 'processing' && (
            <div className="space-y-5 py-4">
              <div className="flex items-center space-x-3 text-[#4FA9A0] bg-[#0A0E0C] p-3 rounded border border-[#2A3B32]">
                <Cpu className="w-6 h-6 animate-spin" />
                <div>
                  <h4 className="font-mono font-bold text-sm text-[#EDEAE2]">EXECUTING 3D RECONSTRUCTION PIPELINE</h4>
                  <p className="text-xs font-mono text-[#8B948C]">COLMAP SfM + YOLO Masking + Depth Anything V2</p>
                </div>
              </div>

              {/* Active Stage & Progress Bar */}
              <div className="space-y-3 font-mono text-xs">
                <div className="flex justify-between items-center bg-[#0A0E0C] p-3 rounded border border-[#2A3B32]">
                  <span className="text-[#EDEAE2] font-semibold">PIPELINE STAGE:</span>
                  <span className="text-[#E8A33D] font-bold animate-pulse">{getReadableStage(currentJobStage)}</span>
                </div>

                <div className="w-full bg-[#0A0E0C] h-3 rounded-full overflow-hidden border border-[#2A3B32]">
                  <div 
                    className="bg-[#4FA9A0] h-full transition-all duration-300 shadow-[0_0_10px_rgba(79,169,160,0.5)]"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                
                <div className="flex justify-between text-[11px] text-[#8B948C]">
                  <span>Single-Pass Video to 3D Twin</span>
                  <span className="text-[#4FA9A0] font-bold">{uploadProgress}%</span>
                </div>
              </div>
            </div>
          )}

          {/* State 4: COMPLETE */}
          {uploadState === 'complete' && (
            <div className="space-y-4 py-4 text-center">
              <div className="p-3 rounded-full bg-[#4FA9A0]/20 border border-[#4FA9A0] w-14 h-14 mx-auto flex items-center justify-center text-[#4FA9A0]">
                <CheckCircle className="w-8 h-8" />
              </div>

              <div>
                <h3 className="font-display font-bold text-lg text-[#EDEAE2]">3D MODEL RECONSTRUCTION READY</h3>
                <p className="text-xs font-mono text-[#8B948C] mt-1">
                  Model ready. {reconstructionStats.pointCount} synthesized with {reconstructionStats.coverage} terrain coverage.
                </p>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleClose}
                  className="w-full py-2.5 px-4 rounded bg-[#E8A33D] hover:bg-[#d49231] text-[#0A0E0C] font-mono font-bold text-xs transition-colors flex items-center justify-center space-x-2 shadow-lg"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>VIEW RECONSTRUCTED MODEL</span>
                </button>
              </div>
            </div>
          )}

          {/* Information Note */}
          <div className="bg-[#0A0E0C] p-3 rounded border border-[#2A3B32] flex items-start space-x-2.5 text-xs text-[#8B948C]">
            <AlertCircle className="w-4 h-4 text-[#E8A33D] flex-shrink-0 mt-0.5" />
            <p className="font-mono text-[11px] leading-relaxed">
              Connected to backend pipeline at <code className="text-[#4FA9A0]">http://localhost:8000</code>. Raw drone MP4 video passes directly to GPU worker nodes for COLMAP + Depth Anything V2 synthesis.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
