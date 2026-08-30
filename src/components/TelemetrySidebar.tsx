import React, { useState } from 'react';
import { useAppStore, type ViewMode, RECON_WAYPOINTS } from '../store/useAppStore';
import { 
  Ruler, 
  Layers, 
  Cpu, 
  Navigation,
  Shield,
  Upload,
  X,
  Trash2,
  Info,
  ArrowUp,
  Square,
  Activity,
  AlertTriangle
} from 'lucide-react';

type SidebarTab = 'tools' | 'waypoints' | 'metadata';

export const TelemetrySidebar: React.FC = () => {
  const { 
    pipelineType,
    setPipelineType,
    reconstructionStats,
    modelMetadata,
    modelSource,
    fallbackStages,
    loadDemoModel,
    waypoints,
    viewMode,
    setViewMode,
    measurementMode,
    setMeasurementMode,
    savedMeasurements,
    deleteMeasurement,
    clearAllMeasurements,
    isFlythroughActive,
    toggleFlythrough,
    currentWaypointIndex,
    setCurrentWaypointIndex,
    setUploadModalOpen,
    sidebarOpen,
    toggleSidebar
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<SidebarTab>('tools');

  return (
    <aside className={`
      fixed lg:relative top-14 bottom-0 right-0 z-20
      w-80 sm:w-84 bg-[#080C0A]/95 backdrop-blur-xl border-l border-[#1A2922]
      flex flex-col justify-between
      transition-transform duration-300 ease-in-out select-none shadow-2xl
      ${sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
    `}>
      {/* Mobile Header Close */}
      <div className="lg:hidden flex items-center justify-between p-3 border-b border-[#1A2922] bg-[#060908]">
        <span className="font-mono text-xs text-[#4FA9A0] font-bold">TELEMETRY SIDEBAR</span>
        <button onClick={toggleSidebar} className="text-[#8B948C] hover:text-[#EDEAE2]">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Sidebar Navigation Tabs */}
      <div className="grid grid-cols-3 bg-[#060908] border-b border-[#1A2922] p-1 gap-1 font-mono text-[10px]">
        <button
          onClick={() => setActiveTab('tools')}
          className={`py-2 px-1 rounded flex items-center justify-center space-x-1 font-bold transition-all ${
            activeTab === 'tools'
              ? 'bg-[#1A2922] text-[#4FA9A0] border border-[#4FA9A0]/40 shadow-sm'
              : 'text-[#8B948C] hover:text-[#EDEAE2]'
          }`}
        >
          <Layers className="w-3 h-3" />
          <span>VIEWS & TOOLS</span>
        </button>
        <button
          onClick={() => setActiveTab('waypoints')}
          className={`py-2 px-1 rounded flex items-center justify-center space-x-1 font-bold transition-all ${
            activeTab === 'waypoints'
              ? 'bg-[#1A2922] text-[#4FA9A0] border border-[#4FA9A0]/40 shadow-sm'
              : 'text-[#8B948C] hover:text-[#EDEAE2]'
          }`}
        >
          <Navigation className="w-3 h-3" />
          <span>WAYPOINTS</span>
        </button>
        <button
          onClick={() => setActiveTab('metadata')}
          className={`py-2 px-1 rounded flex items-center justify-center space-x-1 font-bold transition-all ${
            activeTab === 'metadata'
              ? 'bg-[#1A2922] text-[#4FA9A0] border border-[#4FA9A0]/40 shadow-sm'
              : 'text-[#8B948C] hover:text-[#EDEAE2]'
          }`}
        >
          <Info className="w-3 h-3" />
          <span>METADATA</span>
        </button>
      </div>

      {/* Tab Content Container */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-4">
        {/* TAB 1: VIEWS & TOOLS */}
        {activeTab === 'tools' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Pipeline Output Selector */}
            <div className="bg-[#060908] border border-[#1A2922] rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-[#EDEAE2]">
                <span className="font-semibold text-[#4FA9A0]">VIEWPORT PIPELINE ENGINE</span>
                <span className="text-[10px] text-[#8B948C] uppercase font-bold">{pipelineType}</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 font-mono text-[10px]">
                <button
                  onClick={() => setPipelineType('mesh')}
                  className={`py-2 px-2 rounded border text-center font-bold uppercase transition-all ${
                    pipelineType === 'mesh'
                      ? 'bg-[#4FA9A0]/20 text-[#4FA9A0] border-[#4FA9A0] shadow-sm'
                      : 'bg-[#0B100D] text-[#8B948C] border-[#1A2922] hover:text-[#EDEAE2]'
                  }`}
                >
                  3D MESH (GLB)
                </button>
                <button
                  onClick={() => setPipelineType('splat')}
                  className={`py-2 px-2 rounded border text-center font-bold uppercase transition-all ${
                    pipelineType === 'splat'
                      ? 'bg-[#E8A33D]/20 text-[#E8A33D] border-[#E8A33D] shadow-sm'
                      : 'bg-[#0B100D] text-[#8B948C] border-[#1A2922] hover:text-[#EDEAE2]'
                  }`}
                >
                  3D SPLAT (3DGS)
                </button>
              </div>
            </div>

            {/* Render View Modes */}
            <div className="bg-[#060908] border border-[#1A2922] rounded-lg p-3 space-y-2">
              <div className="flex items-center space-x-1.5 text-xs font-mono text-[#EDEAE2]">
                <Layers className="w-3.5 h-3.5 text-[#4FA9A0]" />
                <span className="font-semibold">RENDER SHADING MODES</span>
              </div>

              <div className="grid grid-cols-2 gap-1.5 font-mono text-[10px]">
                {(['textured', 'wireframe', 'pointcloud', 'elevation', 'thermal'] as ViewMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={`py-2 px-2 rounded border text-center font-bold uppercase transition-all ${
                      viewMode === mode
                        ? 'bg-[#4FA9A0]/20 text-[#4FA9A0] border-[#4FA9A0] shadow-[0_0_10px_rgba(79,169,160,0.2)]'
                        : 'bg-[#0B100D] text-[#8B948C] border-[#1A2922] hover:text-[#EDEAE2] hover:border-[#4FA9A0]/40'
                    }`}
                  >
                    {mode === 'textured' && 'TEXTURED'}
                    {mode === 'wireframe' && 'WIREFRAME'}
                    {mode === 'pointcloud' && 'POINT CLOUD'}
                    {mode === 'elevation' && 'ELEVATION'}
                    {mode === 'thermal' && 'THERMAL'}
                  </button>
                ))}
              </div>
            </div>

            {/* Active Measurements Panel */}
            <div className="bg-[#060908] border border-[#1A2922] rounded-lg p-3 space-y-3">
              <div className="flex items-center justify-between border-b border-[#1A2922] pb-2">
                <div className="flex items-center space-x-1.5 text-[#4FA9A0]">
                  <Ruler className="w-3.5 h-3.5" />
                  <span className="font-mono font-semibold text-xs text-[#EDEAE2]">MEASUREMENTS LOG</span>
                </div>
                {savedMeasurements.length > 0 && (
                  <button
                    onClick={clearAllMeasurements}
                    className="text-[10px] font-mono text-[#8B948C] hover:text-[#E8A33D] transition-colors"
                  >
                    CLEAR ALL
                  </button>
                )}
              </div>

              {/* Mode Selectors */}
              <div className="grid grid-cols-3 gap-1.5 font-mono text-[10px]">
                <button
                  onClick={() => setMeasurementMode(measurementMode === 'distance' ? null : 'distance')}
                  className={`p-1.5 rounded border flex items-center justify-center space-x-1 transition-all ${
                    measurementMode === 'distance'
                      ? 'bg-[#E8A33D]/20 text-[#E8A33D] border-[#E8A33D] font-bold'
                      : 'bg-[#0B100D] text-[#8B948C] border-[#1A2922] hover:text-[#EDEAE2]'
                  }`}
                >
                  <Ruler className="w-3 h-3" />
                  <span>DIST</span>
                </button>
                <button
                  onClick={() => setMeasurementMode(measurementMode === 'height' ? null : 'height')}
                  className={`p-1.5 rounded border flex items-center justify-center space-x-1 transition-all ${
                    measurementMode === 'height'
                      ? 'bg-[#4FA9A0]/20 text-[#4FA9A0] border-[#4FA9A0] font-bold'
                      : 'bg-[#0B100D] text-[#8B948C] border-[#1A2922] hover:text-[#EDEAE2]'
                  }`}
                >
                  <ArrowUp className="w-3 h-3" />
                  <span>HEIGHT</span>
                </button>
                <button
                  onClick={() => setMeasurementMode(measurementMode === 'area' ? null : 'area')}
                  className={`p-1.5 rounded border flex items-center justify-center space-x-1 transition-all ${
                    measurementMode === 'area'
                      ? 'bg-[#E8A33D]/20 text-[#E8A33D] border-[#E8A33D] font-bold'
                      : 'bg-[#0B100D] text-[#8B948C] border-[#1A2922] hover:text-[#EDEAE2]'
                  }`}
                >
                  <Square className="w-3 h-3" />
                  <span>AREA</span>
                </button>
              </div>

              {/* Saved Measurements List */}
              {savedMeasurements.length === 0 ? (
                <div className="p-3 bg-[#0B100D] border border-[#1A2922] rounded text-center text-[11px] font-mono text-[#8B948C]">
                  No active measurements. Click Dist, Height, or Area to select points on mesh.
                </div>
              ) : (
                <div className="space-y-1.5 font-mono text-xs max-h-48 overflow-y-auto">
                  {savedMeasurements.map((m) => (
                    <div 
                      key={m.id}
                      className="flex items-center justify-between bg-[#0B100D] border border-[#1A2922] p-2 rounded"
                    >
                      <div className="flex items-center space-x-2 truncate">
                        {m.type === 'distance' && <Ruler className="w-3.5 h-3.5 text-[#E8A33D]" />}
                        {m.type === 'height' && <ArrowUp className="w-3.5 h-3.5 text-[#4FA9A0]" />}
                        {m.type === 'area' && <Square className="w-3.5 h-3.5 text-[#E8A33D]" />}
                        <span className="font-semibold text-[#EDEAE2] truncate">{m.formattedValue}</span>
                      </div>
                      <button
                        onClick={() => deleteMeasurement(m.id)}
                        className="p-1 text-[#8B948C] hover:text-red-400 transition-colors"
                        title="Delete measurement"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: FLIGHT PATH WAYPOINTS */}
        {activeTab === 'waypoints' && (
          <div className="space-y-3 animate-in fade-in duration-200">
            <div className="bg-[#060908] border border-[#1A2922] rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="flex items-center space-x-1.5 text-[#4FA9A0] font-semibold">
                  <Navigation className="w-3.5 h-3.5" />
                  <span className="text-[#EDEAE2]">MISSION WAYPOINTS</span>
                </span>
                <button 
                  onClick={toggleFlythrough} 
                  className="px-2 py-0.5 rounded bg-[#4FA9A0]/20 text-[#4FA9A0] border border-[#4FA9A0]/40 hover:bg-[#4FA9A0]/30 text-[10px] font-bold"
                >
                  {isFlythroughActive ? 'PAUSE FLIGHT' : 'PLAY ALL'}
                </button>
              </div>

              <div className="space-y-1.5 font-mono text-xs pt-1">
                {(waypoints || RECON_WAYPOINTS).map((wp, idx) => {
                  const isActive = currentWaypointIndex === idx && isFlythroughActive;
                  return (
                    <button
                      key={wp.id}
                      onClick={() => {
                        setCurrentWaypointIndex(idx);
                        if (!isFlythroughActive) toggleFlythrough();
                      }}
                      className={`w-full flex items-center justify-between p-2.5 rounded border text-left transition-colors ${
                        isActive
                          ? 'bg-[#4FA9A0]/15 border-[#4FA9A0] text-[#4FA9A0] font-semibold'
                          : 'bg-[#0B100D] border-[#1A2922] text-[#8B948C] hover:text-[#EDEAE2] hover:border-[#4FA9A0]/40'
                      }`}
                    >
                      <div className="flex items-center space-x-2 truncate">
                        <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-[#4FA9A0] animate-ping' : 'bg-[#1A2922]'}`} />
                        <span className="truncate text-[11px]">{wp.name}</span>
                      </div>
                      <span className="text-[10px] text-[#4FA9A0]/80">WP-{String(idx + 1).padStart(2, '0')}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: METADATA */}
        {activeTab === 'metadata' && (
          <div className="space-y-3 animate-in fade-in duration-200 font-mono text-xs">
            {/* DATA SOURCE INDICATOR BADGE */}
            <div className={`p-3 rounded-lg border flex items-center justify-between font-mono text-xs ${
              modelSource === 'LIVE RECONSTRUCTION'
                ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/50'
                : 'bg-amber-950/60 text-amber-400 border-amber-500/50'
            }`}>
              <div className="flex items-center space-x-2">
                <span className={`w-2.5 h-2.5 rounded-full ${modelSource === 'LIVE RECONSTRUCTION' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                <span className="font-bold">{modelSource}</span>
              </div>
              {modelSource === 'LIVE RECONSTRUCTION' ? (
                <span className="text-[10px] bg-emerald-900/80 text-emerald-200 px-2 py-0.5 rounded font-mono">PIPELINE OUTPUT</span>
              ) : (
                <button 
                  onClick={loadDemoModel} 
                  className="text-[10px] bg-amber-900/80 text-amber-200 hover:bg-amber-800 px-2 py-0.5 rounded font-mono transition-colors"
                >
                  RESET DEMO
                </button>
              )}
            </div>

            {/* FALLBACK WARNING CARD */}
            {modelSource === 'LIVE RECONSTRUCTION' && fallbackStages && fallbackStages.length > 0 && (
              <div className="p-3 rounded-lg border bg-amber-950/60 border-amber-500/60 text-amber-300 font-mono text-xs space-y-1 animate-pulse">
                <div className="flex items-center space-x-1.5 font-bold text-amber-400">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>PARTIAL SYNTHETIC — {fallbackStages.join(' & ').toUpperCase()} FALLBACK USED</span>
                </div>
                <p className="text-[10px] text-amber-200/90 leading-normal">
                  Real inference for stage(s) [{fallbackStages.join(', ')}] fell back to synthetic data due to missing dependencies.
                </p>
              </div>
            )}


            {/* NTRO Recon Info */}
            <div className="bg-[#060908] border border-[#1A2922] rounded-lg p-3 space-y-2">
              <div className="flex items-center space-x-1.5 text-[#4FA9A0] font-semibold pb-1 border-b border-[#1A2922]">
                <Shield className="w-3.5 h-3.5" />
                <span className="text-[#EDEAE2]">RECONNAISSANCE SPECS</span>
              </div>
              <div className="space-y-1.5 text-[11px] text-[#8B948C]">
                <div className="flex justify-between">
                  <span>PROBLEM ID:</span>
                  <span className="text-[#EDEAE2] font-semibold">{reconstructionStats.problemStatement}</span>
                </div>
                <div className="flex justify-between">
                  <span>LOCATION:</span>
                  <span className="text-[#4FA9A0]">{reconstructionStats.location}</span>
                </div>
                <div className="flex justify-between">
                  <span>CAPTURE DATE:</span>
                  <span className="text-[#EDEAE2]">{reconstructionStats.captureDate}</span>
                </div>
                <div className="flex justify-between">
                  <span>DRONE MODEL:</span>
                  <span className="text-[#EDEAE2]">{reconstructionStats.droneType}</span>
                </div>
                <div className="flex justify-between">
                  <span>RESOLUTION:</span>
                  <span className="text-[#4FA9A0]">{reconstructionStats.meshResolution}</span>
                </div>
              </div>
            </div>

            {/* Model Topology Specs (Conditional Mesh vs Splat metrics) */}
            <div className="bg-[#060908] border border-[#1A2922] rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between pb-1 border-b border-[#1A2922]">
                <div className="flex items-center space-x-1.5 font-semibold text-[#EDEAE2]">
                  <Activity className={`w-3.5 h-3.5 ${pipelineType === 'splat' ? 'text-[#E8A33D]' : 'text-[#4FA9A0]'}`} />
                  <span>{pipelineType === 'splat' ? 'GAUSSIAN SPLAT METRICS' : 'MODEL MESH METRICS'}</span>
                </div>
                <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold uppercase ${
                  pipelineType === 'splat' ? 'bg-[#E8A33D]/20 text-[#E8A33D]' : 'bg-[#4FA9A0]/20 text-[#4FA9A0]'
                }`}>
                  {pipelineType}
                </span>
              </div>
              <div className="space-y-1.5 text-[11px] text-[#8B948C]">
                <div className="flex justify-between">
                  <span>MODEL NAME:</span>
                  <span className="text-[#EDEAE2] font-semibold truncate max-w-[150px]">{modelMetadata.modelName}</span>
                </div>

                {pipelineType === 'splat' ? (
                  <>
                    <div className="flex justify-between">
                      <span>SPLAT COUNT:</span>
                      <span className="text-[#E8A33D] font-bold">{modelMetadata.splatCount || '1,450,000 Gaussians'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>ITERATIONS:</span>
                      <span className="text-[#EDEAE2]">{modelMetadata.trainingIterations || '30,000 Iterations'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>SH HARMONICS:</span>
                      <span className="text-[#4FA9A0] font-bold">{modelMetadata.shDegree || 'Degree 3 (3rd Order)'}</span>
                    </div>
                    {modelMetadata.psnr && (
                      <div className="flex justify-between">
                        <span>PSNR ACCURACY:</span>
                        <span className="text-[#E8A33D] font-bold">{modelMetadata.psnr}</span>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="flex justify-between">
                      <span>VERTEX COUNT:</span>
                      <span className="text-[#4FA9A0] font-bold">{modelMetadata.vertexCount || '248,912 Vertices'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>FACE COUNT:</span>
                      <span className="text-[#EDEAE2]">{modelMetadata.faceCount || '482,104 Triangles'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>TEXTURE MAP:</span>
                      <span className="text-[#EDEAE2] font-bold">{modelMetadata.textureRes || '4096 x 4096 px'}</span>
                    </div>
                  </>
                )}

                <div className="flex justify-between">
                  <span>FILE SIZE:</span>
                  <span className="text-[#EDEAE2]">{modelMetadata.fileSize}</span>
                </div>

                <div className="pt-2 border-t border-[#1A2922]">
                  <div className="text-[10px] text-[#8B948C] uppercase mb-1">Reconstruction Method</div>
                  <div className="p-2 rounded bg-[#0B100D] border border-[#1A2922] text-[#4FA9A0] font-semibold text-[10px] flex items-center space-x-1.5">
                    <Cpu className="w-3.5 h-3.5 text-[#4FA9A0]" />
                    <span>{modelMetadata.reconMethod}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Demo Model Selector Button in Sidebar */}
            <div className="pt-1 text-center">
              <button
                onClick={loadDemoModel}
                className="w-full py-2 px-3 rounded bg-[#060908] hover:bg-[#121B17] border border-[#2A3B32] hover:border-[#4FA9A0] text-[#4FA9A0] font-mono text-xs font-semibold transition-colors"
              >
                ⚡ LOAD DEMO SAMPLE MODEL
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer Ingest CTA */}
      <div className="p-3 bg-[#060908] border-t border-[#1A2922]">
        <button
          onClick={() => setUploadModalOpen(true)}
          className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded bg-[#E8A33D] hover:bg-[#d49231] text-[#060908] font-mono text-xs font-semibold transition-colors duration-200 shadow-sm"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>INGEST DRONE FOOTAGE</span>
        </button>
      </div>
    </aside>
  );
};
