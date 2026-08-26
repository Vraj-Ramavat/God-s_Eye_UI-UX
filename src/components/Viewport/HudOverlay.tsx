import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Crosshair, Compass, Navigation, ShieldCheck, Ruler } from 'lucide-react';
import { MeasurementDock } from './MeasurementDock';
import { FlythroughScrubber } from './FlythroughScrubber';

export const HudOverlay: React.FC = () => {
  const { 
    cameraCoords, 
    measurementMode, 
    isFlythroughActive, 
    activeMeasurementPoints,
    isHudVisible 
  } = useAppStore();

  if (!isHudVisible) {
    return (
      <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between p-4 select-none">
        {/* Only show active mode banner when HUD is disabled */}
        <div className="flex-1 flex flex-col items-center justify-center pointer-events-none">
          {measurementMode && (
            <div className="mt-auto mb-6 px-4 py-1.5 rounded-full bg-[#060908]/90 border border-[#4FA9A0] text-[#4FA9A0] font-mono text-xs shadow-[0_0_15px_rgba(79,169,160,0.3)] flex items-center space-x-2 animate-pulse pointer-events-auto">
              <Ruler className="w-4 h-4 text-[#4FA9A0]" />
              <span>
                MODE: <strong className="uppercase">{measurementMode}</strong> — {activeMeasurementPoints.length === 0 ? 'CLICK INITIAL POINT ON SURFACE MESH' : `CLICK NEXT POINT (${activeMeasurementPoints.length} SELECTED)`}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between p-4 sm:p-5 hud-grid-bg select-none">
      {/* Top HUD Row: Toolbar & Live Telemetry */}
      <div className="flex justify-between items-start gap-4">
        {/* Top-Left Stack: Measurement Toolbar + Scanner Info */}
        <div className="flex flex-col space-y-2 items-start max-w-sm">
          <MeasurementDock />
          
          <div className="hidden sm:flex items-center space-x-3 bg-[#060908]/80 backdrop-blur-md border border-[#1A2922] px-3 py-1.5 rounded font-mono text-[10px] text-[#8B948C] shadow-lg pointer-events-auto">
            <div className="flex items-center space-x-1.5 text-[#4FA9A0] font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>NTRO v2.6</span>
            </div>
            <span className="text-[#1A2922]">|</span>
            <span>RGB PHOTOGRAMMETRY</span>
            <span className="text-[#1A2922]">|</span>
            <span className="text-[#4FA9A0]">34.0522°N 118.2437°W</span>
          </div>
        </div>

        {/* Top-Right Telemetry Data Card */}
        <div className="bg-[#060908]/80 backdrop-blur-md border border-[#1A2922] p-2.5 rounded font-mono text-xs text-[#EDEAE2] space-y-1.5 shadow-xl min-w-[210px] pointer-events-auto">
          <div className="flex items-center justify-between border-b border-[#1A2922] pb-1 text-[10px] text-[#8B948C]">
            <span className="flex items-center space-x-1">
              <Navigation className="w-3 h-3 text-[#4FA9A0]" />
              <span>LIVE TELEMETRY</span>
            </span>
            <span className="text-[#4FA9A0] animate-pulse">● RECON</span>
          </div>
          
          <div className="grid grid-cols-3 gap-1 text-center text-[10px]">
            <div className="bg-[#0B100D] py-0.5 rounded border border-[#1A2922]">
              <div className="text-[9px] text-[#8B948C]">X</div>
              <div className="text-[#EDEAE2] font-semibold">{cameraCoords.x > 0 ? `+${cameraCoords.x}` : cameraCoords.x}</div>
            </div>
            <div className="bg-[#0B100D] py-0.5 rounded border border-[#1A2922]">
              <div className="text-[9px] text-[#8B948C]">Y</div>
              <div className="text-[#EDEAE2] font-semibold">{cameraCoords.y > 0 ? `+${cameraCoords.y}` : cameraCoords.y}</div>
            </div>
            <div className="bg-[#0B100D] py-0.5 rounded border border-[#1A2922]">
              <div className="text-[9px] text-[#8B948C]">Z</div>
              <div className="text-[#EDEAE2] font-semibold">{cameraCoords.z > 0 ? `+${cameraCoords.z}` : cameraCoords.z}</div>
            </div>
          </div>

          <div className="flex justify-between items-center text-[10px] pt-0.5">
            <span className="text-[#8B948C]">ALT / HDG:</span>
            <span className="text-[#4FA9A0] font-semibold">{cameraCoords.alt}m AGL / {cameraCoords.heading}°</span>
          </div>
        </div>
      </div>

      {/* Center Target Reticle & Instructional Banners */}
      <div className="flex flex-col items-center justify-center pointer-events-none my-auto">
        <div className="relative flex items-center justify-center w-12 h-12 opacity-60 hover:opacity-100 transition-opacity">
          <div className="absolute inset-0 border border-[#4FA9A0]/30 rounded-full animate-spin [animation-duration:16s]" />
          <Crosshair className={`w-5 h-5 transition-colors duration-300 ${
            measurementMode ? 'text-[#4FA9A0] animate-pulse scale-110' : 'text-[#4FA9A0]/40'
          }`} />
        </div>

        {measurementMode && (
          <div className="mt-3 px-4 py-1.5 rounded-full bg-[#060908]/90 border border-[#4FA9A0] text-[#4FA9A0] font-mono text-xs shadow-[0_0_15px_rgba(79,169,160,0.3)] flex items-center space-x-2 animate-pulse pointer-events-auto">
            <Ruler className="w-4 h-4 text-[#4FA9A0]" />
            <span>
              MODE: <strong className="uppercase">{measurementMode}</strong> — {activeMeasurementPoints.length === 0 ? 'CLICK INITIAL POINT ON SURFACE MESH' : `CLICK NEXT POINT (${activeMeasurementPoints.length} SELECTED)`}
            </span>
          </div>
        )}

        {isFlythroughActive && (
          <div className="mt-3 px-4 py-1.5 rounded-full bg-[#060908]/90 border border-[#E8A33D] text-[#E8A33D] font-mono text-xs shadow-[0_0_15px_rgba(232,163,61,0.3)] flex items-center space-x-2 animate-pulse pointer-events-auto">
            <Navigation className="w-4 h-4 text-[#E8A33D]" />
            <span>SPLINE FLIGHT PATH PLAYBACK ACTIVE</span>
          </div>
        )}
      </div>

      {/* Bottom HUD Row: Grid Coordinate Pill & Scrubber */}
      <div className="flex flex-col space-y-2">
        <div className="flex justify-between items-end">
          <div className="bg-[#060908]/80 backdrop-blur-md border border-[#1A2922] px-2.5 py-1 rounded font-mono text-[10px] text-[#8B948C] flex items-center space-x-2 pointer-events-auto">
            <Compass className="w-3 h-3 text-[#4FA9A0]" />
            <span>GRID: <strong className="text-[#EDEAE2]">44Q ND 8291 0482</strong></span>
          </div>
        </div>

        {/* Bottom Spline Flight Scrubber */}
        <FlythroughScrubber />
      </div>
    </div>
  );
};
