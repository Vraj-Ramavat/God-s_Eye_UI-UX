import React, { useRef } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Play, Pause, Navigation, FastForward } from 'lucide-react';

export const FlythroughScrubber: React.FC = () => {
  const { 
    isFlythroughActive, 
    toggleFlythrough, 
    flythroughProgress, 
    setFlythroughProgress,
    flythroughSpeed,
    setFlythroughSpeed 
  } = useAppStore();

  const trackRef = useRef<HTMLDivElement>(null);

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    setFlythroughProgress(ratio);
  };

  const formattedSeconds = Math.round(flythroughProgress * 30);
  const totalSeconds = 30;

  return (
    <div className="bg-[#0A0E0C]/90 backdrop-blur border border-[#2A3B32] px-3.5 py-2 rounded-lg shadow-2xl font-mono text-xs select-none pointer-events-auto w-full">
      <div className="flex items-center space-x-3">
        {/* Play/Pause Button */}
        <button
          onClick={toggleFlythrough}
          className={`p-1.5 rounded border transition-colors flex items-center justify-center ${
            isFlythroughActive 
              ? 'bg-[#4FA9A0]/20 text-[#4FA9A0] border-[#4FA9A0]' 
              : 'bg-[#121815] text-[#EDEAE2] border-[#2A3B32] hover:border-[#4FA9A0]/50'
          }`}
          title={isFlythroughActive ? "Pause Spline Flight" : "Play Spline Flight"}
        >
          {isFlythroughActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
        </button>

        {/* Flight Tag & Time Readout */}
        <div className="hidden sm:flex items-center space-x-1.5 text-[#8B948C] font-semibold">
          <Navigation className="w-3.5 h-3.5 text-[#4FA9A0]" />
          <span className="text-[10px] uppercase tracking-wider text-[#EDEAE2]">SPLINE FLIGHT:</span>
        </div>

        {/* Custom Tactical Progress Track */}
        <div 
          ref={trackRef}
          onClick={handleSeek}
          className="flex-1 h-2.5 bg-[#121815] border border-[#2A3B32] rounded relative cursor-pointer group overflow-hidden"
        >
          {/* Progress Fill */}
          <div 
            className="h-full bg-[#4FA9A0] transition-all duration-75 relative"
            style={{ width: `${flythroughProgress * 100}%` }}
          />

          {/* Drag Handle Indicator */}
          <div 
            className="absolute top-0 bottom-0 w-1 bg-white border border-[#4FA9A0] -ml-0.5 transition-all"
            style={{ left: `${flythroughProgress * 100}%` }}
          />
        </div>

        {/* Monospace Timestamp */}
        <div className="text-[10px] text-[#8B948C] whitespace-nowrap">
          <span className="text-[#EDEAE2] font-bold">T+00:{formattedSeconds < 10 ? `0${formattedSeconds}` : formattedSeconds}</span>
          <span> / 00:{totalSeconds}</span>
        </div>

        {/* Speed Controls */}
        <div className="flex items-center space-x-1 border-l border-[#2A3B32] pl-2">
          <FastForward className="w-3 h-3 text-[#8B948C] hidden md:inline" />
          {([0.5, 1, 2] as const).map((spd) => (
            <button
              key={spd}
              onClick={() => setFlythroughSpeed(spd)}
              className={`px-1.5 py-0.5 rounded text-[9px] border transition-colors ${
                flythroughSpeed === spd
                  ? 'bg-[#4FA9A0]/20 text-[#4FA9A0] border-[#4FA9A0] font-bold'
                  : 'bg-[#121815] text-[#8B948C] border-[#2A3B32] hover:text-[#EDEAE2]'
              }`}
            >
              {spd}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
