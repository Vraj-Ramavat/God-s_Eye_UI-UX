import React, { useState, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Layers, SlidersHorizontal, ChevronUp, ChevronDown } from 'lucide-react';

export const ComparisonSlider: React.FC = () => {
  const { isComparisonOpen, toggleComparison, setComparisonOpen } = useAppStore();
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const pos = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(pos);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    handleMove(e.touches[0].clientX);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    handleMove(e.clientX);
  };

  if (!isComparisonOpen) {
    return (
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 pointer-events-auto">
        <button
          onClick={toggleComparison}
          className="flex items-center space-x-2.5 px-4 py-2 rounded-full bg-[#0A0E0C]/90 hover:bg-[#121815] border border-[#4FA9A0]/50 hover:border-[#4FA9A0] text-[#EDEAE2] font-mono text-xs shadow-[0_4px_20px_rgba(0,0,0,0.6)] backdrop-blur-md transition-all duration-200 group"
        >
          <Layers className="w-3.5 h-3.5 text-[#4FA9A0] group-hover:scale-110 transition-transform" />
          <span>ACCURACY COMPARISON (SINGLE vs MULTI-PASS)</span>
          <ChevronUp className="w-4 h-4 text-[#4FA9A0] animate-bounce" />
        </button>
      </div>
    );
  }

  return (
    <div className="absolute bottom-0 inset-x-0 z-20 bg-[#0A0E0C]/95 backdrop-blur-xl border-t border-[#2A3B32] p-4 select-none shadow-[0_-10px_30px_rgba(0,0,0,0.8)] transition-all duration-300 pointer-events-auto animate-in slide-in-from-bottom">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2 text-[#4FA9A0]">
          <Layers className="w-4 h-4 text-[#4FA9A0]" />
          <h3 className="font-display font-bold text-xs uppercase tracking-widest text-[#EDEAE2]">
            RECONNAISSANCE ACCURACY COMPARISON
          </h3>
          <span className="hidden sm:inline font-mono text-[10px] text-[#4FA9A0]/70 border border-[#4FA9A0]/30 px-2 py-0.5 rounded">
            SINGLE-PASS vs TRADITIONAL MULTI-PASS
          </span>
        </div>
        <button
          onClick={() => setComparisonOpen(false)}
          className="flex items-center space-x-1 px-2.5 py-1 rounded bg-[#121815] border border-[#2A3B32] hover:border-[#4FA9A0] text-[#8B948C] hover:text-[#EDEAE2] font-mono text-xs transition-colors"
        >
          <span>CLOSE</span>
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Interactive Slider Container */}
      <div 
        ref={containerRef}
        onMouseDown={() => setIsDragging(true)}
        onMouseUp={() => setIsDragging(false)}
        onMouseLeave={() => setIsDragging(false)}
        onMouseMove={handleMouseMove}
        onTouchMove={handleTouchMove}
        className="relative h-36 sm:h-44 w-full bg-[#0A0E0C] border border-[#2A3B32] rounded-lg overflow-hidden cursor-ew-resize shadow-2xl"
      >
        {/* Layer 1: AFTER - God's Eye Single-Pass Reconstruction (Right Side) */}
        <div className="absolute inset-0 bg-[#0A0E0C] flex items-center justify-center hud-grid-dense">
          {/* Stylized God's Eye High-Res Render Graphic */}
          <div className="w-full h-full bg-gradient-to-tr from-[#0A0E0C] via-[#1C2722] to-[#2A3B32] p-3 sm:p-4 flex flex-col justify-between">
            {/* Top Corner Pinned Badge */}
            <div className="flex justify-between items-start">
              <div className="flex space-x-3 font-mono text-[10px] text-[#4FA9A0]">
                <span>DENSE POINT CLOUD (1.42M)</span>
                <span className="hidden sm:inline">COVERAGE: 98.4%</span>
              </div>
              <div className="px-2 py-0.5 rounded bg-[#0A0E0C]/90 border border-[#4FA9A0]/60 text-[#4FA9A0] font-mono text-[10px] font-bold tracking-wider uppercase shadow-lg">
                GOD'S EYE — SINGLE-PASS
              </div>
            </div>

            {/* Bottom Row Information */}
            <div className="flex justify-between font-mono text-[10px] text-[#4FA9A0]">
              <span>SINGLE-PASS CAPTURE</span>
              <span>ZERO DRIFT</span>
            </div>
          </div>
        </div>

        {/* Layer 2: BEFORE - Traditional Multi-Pass Output (Left Side, Clipped) */}
        <div 
          className="absolute inset-0 bg-[#0A0E0C] border-r border-[#E8A33D] overflow-hidden"
          style={{ width: `${sliderPosition}%` }}
        >
          <div 
            className="absolute inset-0 w-full h-full bg-gradient-to-br from-[#121815] via-[#1a211d] to-[#0A0E0C] p-3 sm:p-4 flex flex-col justify-between"
            style={{ width: containerRef.current ? containerRef.current.clientWidth : '100%' }}
          >
            {/* Top Corner Pinned Badge */}
            <div className="flex justify-between items-start">
              <div className="px-2 py-0.5 rounded bg-[#0A0E0C]/90 border border-[#2A3B32] text-[#8B948C] font-mono text-[10px] font-bold tracking-wider uppercase shadow-lg whitespace-nowrap">
                TRADITIONAL MULTI-PASS
              </div>
              <div className="flex space-x-3 font-mono text-[10px] text-[#8B948C]">
                <span className="hidden sm:inline">SPARSE POINTS (180K)</span>
                <span className="text-red-400">GAPS: 14.2%</span>
              </div>
            </div>

            {/* Bottom Row Information */}
            <div className="flex justify-between font-mono text-[10px] text-[#8B948C]">
              <span>MULTI-PASS FLYOVER</span>
              <span>ACCUMULATED DRIFT</span>
            </div>
          </div>
        </div>

        {/* Divider Bar & Solid Circle Handle */}
        <div 
          className="absolute top-0 bottom-0 w-1 bg-[#E8A33D] shadow-[0_0_12px_rgba(232,163,61,0.8)] -ml-0.5 z-20"
          style={{ left: `${sliderPosition}%` }}
        >
          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-[#0A0E0C] border-2 border-[#E8A33D] text-[#E8A33D] flex items-center justify-center shadow-[0_0_15px_rgba(0,0,0,0.9)] z-30">
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>
    </div>
  );
};

