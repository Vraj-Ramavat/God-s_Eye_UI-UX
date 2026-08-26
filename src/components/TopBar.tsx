import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { GodseyeLogo } from './GodseyeLogo';
import { 
  Eye, 
  EyeOff,
  Play, 
  Pause, 
  Upload, 
  Menu, 
  X, 
  ShieldAlert,
  AlertTriangle,
  Camera,
  Layers
} from 'lucide-react';

export const TopBar: React.FC = () => {
  const navigate = useNavigate();
  const { 
    isFlythroughActive, 
    toggleFlythrough, 
    measurementMode, 
    setUploadModalOpen,
    uploadState,
    sidebarOpen,
    toggleSidebar,
    requestScreenshot,
    isHudVisible,
    toggleHud,
    isComparisonOpen,
    toggleComparison,
    modelSource,
    fallbackStages
  } = useAppStore();

  const getStatusBadge = () => {
    if (uploadState === 'processing' || uploadState === 'uploading') {
      return {
        label: 'PROCESSING TELEMETRY',
        bg: 'bg-[#E8A33D]/20',
        text: 'text-[#E8A33D]',
        border: 'border-[#E8A33D]/50',
        dot: 'bg-[#E8A33D] animate-ping'
      };
    }
    if (isFlythroughActive) {
      return {
        label: 'MISSION PLAYBACK',
        bg: 'bg-[#E8A33D]/20',
        text: 'text-[#E8A33D]',
        border: 'border-[#E8A33D]/50',
        dot: 'bg-[#E8A33D] animate-ping'
      };
    }
    if (measurementMode) {
      return {
        label: `MEASURING (${measurementMode.toUpperCase()})`,
        bg: 'bg-[#4FA9A0]/20',
        text: 'text-[#4FA9A0]',
        border: 'border-[#4FA9A0]/50',
        dot: 'bg-[#4FA9A0] animate-pulse'
      };
    }
    return {
      label: 'TACTICAL RECON ACTIVE',
      bg: 'bg-[#121B17]/60',
      text: 'text-[#EDEAE2]',
      border: 'border-[#2A3B32]',
      dot: 'bg-[#4FA9A0]'
    };
  };

  const status = getStatusBadge();

  return (
    <header className="h-14 bg-[#080C0A]/90 backdrop-blur-lg border-b border-[#1D2B24] px-4 sm:px-6 flex items-center justify-between z-30 relative select-none">
      {/* 1. Left Group: Brand & Identity with Navigation to Landing Page */}
      <div className="flex items-center space-x-3">
        <div 
          onClick={() => navigate('/')} 
          className="flex items-center space-x-2.5 cursor-pointer group"
          title="Return to Landing Vector Page"
        >
          <div className="relative flex items-center justify-center w-8 h-8 rounded border border-[#4FA9A0]/50 bg-[#060908] shadow-[0_0_10px_rgba(79,169,160,0.15)] group-hover:border-[#4FA9A0] transition-colors">
            <GodseyeLogo className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-display font-bold text-sm sm:text-base leading-none tracking-wider text-[#EDEAE2] group-hover:text-[#43E6C5] transition-colors">
              GOD'S EYE
            </h1>
            <p className="text-[9px] font-mono text-[#8B948C] tracking-widest uppercase mt-0.5">
              3D Terrain Reconnaissance
            </p>
          </div>
        </div>
      </div>

      {/* 2. Center Group: Mission Context & Status */}
      <div className="hidden md:flex items-center space-x-3">
        {/* PS ID & Team Badge */}
        <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-[#060908] border border-[#2A3B32] font-mono text-[11px] text-[#8B948C]">
          <ShieldAlert className="w-3.5 h-3.5 text-[#4FA9A0]" />
          <span>PS ID: <strong className="text-[#EDEAE2] font-semibold">SIH26158</strong></span>
          <span className="text-[#8B948C]">|</span>
          <span className="text-[#E8A33D] font-bold">PIXEL ERROR (ID: 51)</span>
        </div>

        {/* Data Source Indicator Badge (LIVE RECONSTRUCTION vs DEMO DATA) */}
        <div className={`flex items-center space-x-1.5 px-2.5 py-1 rounded font-mono text-[11px] border ${
          modelSource === 'LIVE RECONSTRUCTION'
            ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/50'
            : 'bg-amber-950/60 text-amber-400 border-amber-500/50'
        }`}>
          <span className={`w-2 h-2 rounded-full ${modelSource === 'LIVE RECONSTRUCTION' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
          <span className="font-bold">{modelSource}</span>
        </div>

        {/* Partial Synthetic Fallback Warning Badge */}
        {modelSource === 'LIVE RECONSTRUCTION' && fallbackStages && fallbackStages.length > 0 && (
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded font-mono text-[11px] bg-amber-950/90 text-amber-300 border border-amber-500/80 shadow-[0_0_12px_rgba(245,158,11,0.3)] animate-pulse">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
            <span className="font-bold uppercase tracking-tight">
              PARTIAL SYNTHETIC — {fallbackStages.join(' & ').toUpperCase()} FALLBACK USED
            </span>
          </div>
        )}


        {/* Mission Status Pill */}
        <div className={`flex items-center space-x-2 px-3 py-1 rounded-full border text-[11px] font-mono tracking-wider transition-all duration-300 ${status.bg} ${status.text} ${status.border}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
          <span>{status.label}</span>
        </div>
      </div>

      {/* 3. Right Group: Quick Action Cluster */}
      <div className="flex items-center space-x-2">
        {/* HUD Overlay Toggle */}
        <button
          onClick={toggleHud}
          className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded text-xs font-mono transition-all duration-200 border ${
            isHudVisible
              ? 'bg-[#060908] text-[#4FA9A0] border-[#4FA9A0]/50'
              : 'bg-[#060908]/60 text-[#8B948C] border-[#2A3B32] hover:text-[#EDEAE2]'
          }`}
          title={isHudVisible ? 'Hide Viewport HUD Elements' : 'Show Viewport HUD Elements'}
        >
          {isHudVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          <span className="hidden xl:inline">{isHudVisible ? 'HUD ON' : 'HUD OFF'}</span>
        </button>

        {/* Accuracy Comparison Toggle */}
        <button
          onClick={toggleComparison}
          className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded text-xs font-mono transition-all duration-200 border ${
            isComparisonOpen 
              ? 'bg-[#4FA9A0]/20 text-[#4FA9A0] border-[#4FA9A0]' 
              : 'bg-[#060908] text-[#EDEAE2] border-[#2A3B32] hover:border-[#4FA9A0]/60 hover:text-[#4FA9A0]'
          }`}
          title="Toggle Single-Pass vs Multi-Pass Comparison Panel"
        >
          <Layers className="w-3.5 h-3.5 text-[#4FA9A0]" />
          <span className="hidden lg:inline">COMPARE PASSES</span>
        </button>

        {/* Flythrough Toggle */}
        <button
          onClick={toggleFlythrough}
          className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded text-xs font-mono transition-all duration-200 border ${
            isFlythroughActive 
              ? 'bg-[#E8A33D]/20 text-[#E8A33D] border-[#E8A33D]' 
              : 'bg-[#060908] text-[#EDEAE2] border-[#2A3B32] hover:border-[#4FA9A0]/60 hover:text-[#4FA9A0]'
          }`}
          title="Toggle camera flight path animation"
        >
          {isFlythroughActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          <span className="hidden lg:inline">{isFlythroughActive ? 'PAUSE FLIGHT' : 'FLYTHROUGH'}</span>
        </button>

        {/* Screenshot PNG Capture Button */}
        <button
          onClick={requestScreenshot}
          className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded bg-[#060908] border border-[#2A3B32] text-[#EDEAE2] hover:border-[#4FA9A0]/60 hover:text-[#4FA9A0] font-mono text-xs transition-colors"
          title="Capture current 3D viewport as PNG"
        >
          <Camera className="w-3.5 h-3.5 text-[#8B948C]" />
          <span className="hidden lg:inline">CAPTURE PNG</span>
        </button>

        {/* Drone Video Upload CTA */}
        <button
          onClick={() => setUploadModalOpen(true)}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-[#E8A33D] hover:bg-[#d49231] text-[#0A0E0C] font-mono font-semibold text-xs transition-colors duration-200 shadow-sm ml-1"
          title="Upload new drone footage video"
        >
          <Upload className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">INGEST FOOTAGE</span>
        </button>

        {/* Mobile Sidebar Toggle */}
        <button
          onClick={toggleSidebar}
          className="lg:hidden p-2 rounded bg-[#060908] border border-[#2A3B32] text-[#EDEAE2] hover:border-[#4FA9A0]/50"
          title="Toggle Telemetry Sidebar"
        >
          {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
};
