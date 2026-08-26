import React from 'react';
import { useAppStore, type MeasurementType } from '../../store/useAppStore';
import { Ruler, ArrowUp, Square, RotateCcw } from 'lucide-react';

export const MeasurementDock: React.FC = () => {
  const { 
    measurementMode, 
    setMeasurementMode, 
    activeMeasurementPoints,
    savedMeasurements,
    clearAllMeasurements 
  } = useAppStore();

  const handleToggle = (type: MeasurementType) => {
    if (measurementMode === type) {
      setMeasurementMode(null);
    } else {
      setMeasurementMode(type);
    }
  };

  return (
    <div className="flex items-center space-x-1 bg-[#060908]/85 backdrop-blur-md border border-[#1A2922] p-1 rounded-lg shadow-xl font-mono text-xs select-none pointer-events-auto">
      {/* Distance Mode */}
      <button
        onClick={() => handleToggle('distance')}
        className={`flex items-center space-x-1.5 px-2.5 py-1 rounded transition-all duration-200 border ${
          measurementMode === 'distance'
            ? 'bg-[#E8A33D]/20 text-[#E8A33D] border-[#E8A33D] shadow-[0_0_10px_rgba(232,163,61,0.3)] font-semibold'
            : 'bg-[#0B100D]/70 text-[#8B948C] border-[#1A2922] hover:text-[#EDEAE2] hover:border-[#E8A33D]/40'
        }`}
        title="Distance Mode (Click 2 points)"
      >
        <Ruler className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">DISTANCE</span>
      </button>

      {/* Height Mode */}
      <button
        onClick={() => handleToggle('height')}
        className={`flex items-center space-x-1.5 px-2.5 py-1 rounded transition-all duration-200 border ${
          measurementMode === 'height'
            ? 'bg-[#4FA9A0]/20 text-[#4FA9A0] border-[#4FA9A0] shadow-[0_0_10px_rgba(79,169,160,0.3)] font-semibold'
            : 'bg-[#0B100D]/70 text-[#8B948C] border-[#1A2922] hover:text-[#EDEAE2] hover:border-[#4FA9A0]/40'
        }`}
        title="Height Mode (Click 2 points for vertical Y delta)"
      >
        <ArrowUp className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">HEIGHT (ΔY)</span>
      </button>

      {/* Area Mode */}
      <button
        onClick={() => handleToggle('area')}
        className={`flex items-center space-x-1.5 px-2.5 py-1 rounded transition-all duration-200 border ${
          measurementMode === 'area'
            ? 'bg-[#E8A33D]/20 text-[#E8A33D] border-[#E8A33D] shadow-[0_0_10px_rgba(232,163,61,0.3)] font-semibold'
            : 'bg-[#0B100D]/70 text-[#8B948C] border-[#1A2922] hover:text-[#EDEAE2] hover:border-[#E8A33D]/40'
        }`}
        title="Area Mode (Click 3+ points for surface polygon)"
      >
        <Square className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">AREA (m²)</span>
      </button>

      {/* Clear All / Active Mode reset */}
      {(measurementMode || savedMeasurements.length > 0 || activeMeasurementPoints.length > 0) && (
        <button
          onClick={() => {
            setMeasurementMode(null);
            clearAllMeasurements();
          }}
          className="p-1 rounded bg-[#0B100D] border border-[#1A2922] text-[#8B948C] hover:text-[#E8A33D] hover:border-[#E8A33D]/50 transition-colors"
          title="Clear all active measurements"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
