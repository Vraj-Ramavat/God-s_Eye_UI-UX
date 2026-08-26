import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, ArrowDown, ArrowRight, Cpu } from 'lucide-react';
import Lenis from 'lenis';
import { ScrollDescentScene } from './ScrollDescentScene';

const GodseyeLogo: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M28 22 H72" stroke="#4DA3FF" strokeWidth="2.5" />
    <circle cx="28" cy="22" r="2" fill="#4DA3FF" />
    <circle cx="72" cy="22" r="2" fill="#4DA3FF" />
    <path d="M50 22 V30" stroke="#4DA3FF" />
    <path d="M50 30 C32 38 32 54 50 62 C68 70 68 84 50 92" stroke="#43E6C5" strokeWidth="1.8" />
    <path d="M50 30 C68 38 68 54 50 62 C32 70 32 84 50 92" stroke="#3B82C4" strokeWidth="1.8" strokeDasharray="3 2" />
    <line x1="38" y1="45" x2="62" y2="45" stroke="rgba(232, 230, 225, 0.25)" strokeWidth="0.8" />
    <line x1="38" y1="77" x2="62" y2="77" stroke="rgba(232, 230, 225, 0.25)" strokeWidth="0.8" />
    <line x1="44" y1="62" x2="56" y2="62" stroke="rgba(232, 230, 225, 0.25)" strokeWidth="0.8" />
    <circle cx="50" cy="62" r="2.2" fill="#E8A33D" />
    <circle cx="44" cy="45" r="1.5" fill="#4DA3FF" />
    <circle cx="56" cy="45" r="1.5" fill="#4DA3FF" />
    <path d="M 20 88 Q 50 78 80 88" stroke="#43E6C5" strokeWidth="1.2" />
    <path d="M 20 94 Q 50 84 80 94" stroke="#43E6C5" strokeWidth="1.2" />
    <line x1="50" y1="83" x2="50" y2="94" stroke="#43E6C5" strokeWidth="0.8" />
  </svg>
);

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [scrollProgress, setScrollProgress] = useState(0);
  const [timestamp, setTimestamp] = useState("00:00.00");

  // Track page scroll progress ratio (0..1) with Lenis smooth momentum scroll
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.4,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 1.1,
      touchMultiplier: 1.8,
    });

    let rafId: number;

    function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }

    rafId = requestAnimationFrame(raf);

    lenis.on('scroll', (e: { progress: number }) => {
      setScrollProgress(e.progress);
    });

    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight > 0) {
        setScrollProgress(window.scrollY / totalHeight);
      }
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', handleScroll);
      lenis.destroy();
    };
  }, []);

  // simulated timestamp clock ticks
  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const min = Math.floor(elapsed / 60000).toString().padStart(2, '0');
      const sec = Math.floor((elapsed % 60000) / 1000).toString().padStart(2, '0');
      const ms = Math.floor((elapsed % 1000) / 10).toString().padStart(2, '0');
      setTimestamp(`${min}:${sec}.${ms}`);
    }, 33);
    return () => clearInterval(interval);
  }, []);

  // Math conversions mapping scroll progress to telemetry HUD readouts
  const altitude = Math.max(10, Math.floor(1500 - scrollProgress * 1490));
  const latitude = (23.8124 + scrollProgress * 0.0028).toFixed(6);
  const longitude = (86.4402 - scrollProgress * 0.0014).toFixed(6);
  const compassHeading = Math.floor(180 + Math.sin(scrollProgress * Math.PI) * 15);

  // Helper determining opacity for scroll-triggered text panel triggers
  const getPanelStyle = (min: number, max: number) => {
    const fadeWindow = 0.05; // Scroll window size for fading transitions
    let opacity = 0;
    let pointerEvents: 'auto' | 'none' = 'none';

    if (scrollProgress >= min && scrollProgress <= max) {
      opacity = 1;
      pointerEvents = 'auto';
    } else if (scrollProgress < min && scrollProgress > min - fadeWindow) {
      opacity = (scrollProgress - (min - fadeWindow)) / fadeWindow;
      if (opacity > 0.5) pointerEvents = 'auto';
    } else if (scrollProgress > max && scrollProgress < max + fadeWindow) {
      opacity = 1 - (scrollProgress - max) / fadeWindow;
      if (opacity > 0.5) pointerEvents = 'auto';
    }

    return {
      opacity,
      pointerEvents,
      transform: `translateY(${Math.max(0, 15 - opacity * 15)}px)`,
      transition: 'opacity 0.2s ease-out, transform 0.2s ease-out'
    } as React.CSSProperties;
  };

  const currentStageName = () => {
    if (scrollProgress < 0.2) return "Frame Capture / decimation";
    if (scrollProgress < 0.4) return "Camera pose estimation";
    if (scrollProgress < 0.6) return "Sparse SfM triangulation";
    if (scrollProgress < 0.8) return "AI monocular depth sync";
    return "Mesh Generation / texturing";
  };

  return (
    <div className="relative w-full bg-void text-ink-100 font-sans select-none min-h-[550vh]">
      
      {/* Fixed R3F background canvas driven by scroll progress */}
      <ScrollDescentScene scrollProgress={scrollProgress} />

      {/* FIXED TELEMETRY INSTRUMENT PANEL HUD (Sits on top, static) */}
      <div className="fixed inset-x-0 top-0 z-40 pointer-events-none p-4 flex flex-col gap-3 font-mono text-xs">
        
        {/* Navbar-style header HUD */}
        <header className="w-full flex items-center justify-between border-b border-hud-line/25 pb-2 pointer-events-auto bg-void/45 backdrop-blur-sm px-4 py-2 rounded">
          <div className="flex items-center gap-4 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <GodseyeLogo className="w-12 h-12" />
            <span className="font-display font-extrabold tracking-widest text-ink-100 text-2xl">GODSEYE</span>
            <span className="text-text-muted text-lg">|</span>
            <span className="text-scan-mid uppercase font-bold tracking-wider text-sm">AERIAL HUD</span>
          </div>

          <button
            onClick={() => navigate('/app')}
            className="px-5 py-2 rounded bg-scan-hot hover:bg-scan-hot/90 text-void font-extrabold text-xs tracking-wide transition-colors flex items-center gap-2 cursor-pointer shadow-md"
          >
            <span>LAUNCH COCKPIT</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </header>

        {/* Telemetry metadata bars */}
        <div className="w-full flex justify-between gap-4 mt-2">
          {/* Left instruments stack */}
          <div className="flex flex-col gap-1.5 bg-void/70 border border-hud-line/20 p-2.5 rounded backdrop-blur">
            <div className="flex justify-between w-64 border-b border-line pb-1">
              <span className="text-text-muted">ALTITUDE MSL:</span>
              <span className="text-scan-hot font-bold">{altitude} M</span>
            </div>
            <div className="flex justify-between w-64 border-b border-line pb-1">
              <span className="text-text-muted">GPS POSITION:</span>
              <span className="text-ink-100 font-bold">{latitude}° N</span>
            </div>
            <div className="flex justify-between w-64">
              <span className="text-text-muted">GPS HEADING:</span>
              <span className="text-ink-100 font-bold">{longitude}° E</span>
            </div>
          </div>

          {/* Right GCS status stack */}
          <div className="flex flex-col gap-1.5 bg-void/70 border border-hud-line/20 p-2.5 rounded backdrop-blur text-right">
            <div className="flex justify-between w-64 border-b border-line pb-1">
              <span>ELAPSED CLOCK:</span>
              <span className="text-scan-cold font-bold">{timestamp}</span>
            </div>
            <div className="flex justify-between w-64 border-b border-line pb-1">
              <span>COMPASS DIRECTION:</span>
              <span className="text-ink-100 font-bold">{compassHeading}° S</span>
            </div>
            <div className="flex justify-between w-64">
              <span>RESOLVING STAGE:</span>
              <span className="text-scan-mid font-extrabold uppercase truncate max-w-[150px]" title={currentStageName()}>
                {currentStageName()}
              </span>
            </div>
          </div>
        </div>

        {/* Dynamic scroll warning instructions (fades out as descent progresses) */}
        {scrollProgress < 0.08 && (
          <div className="absolute left-1/2 bottom-[-450px] -translate-x-1/2 flex flex-col items-center gap-1.5 text-text-muted select-none">
            <span className="text-[8px] uppercase tracking-widest font-bold animate-pulse-subtle">SCROLL MOUSE WHEEL TO DESCEND</span>
            <ArrowDown className="w-4 h-4 text-ink-100/40 animate-bounce" />
          </div>
        )}
      </div>

      {/* SCROLL CONTENT OVERLAY PANELS LAYER */}
      <div className="relative z-20 w-full pointer-events-none">
        
        {/* PANEL 1: HERO TITLE (Trigger: 0.01..0.15) */}
        <div 
          style={getPanelStyle(0.01, 0.14)}
          className="fixed top-1/2 left-4 md:left-12 -translate-y-1/2 max-w-xl flex flex-col gap-4 p-5 rounded border border-line bg-void/85 backdrop-blur-sm"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-scan-hot font-mono text-xs font-bold uppercase tracking-wider">
              <Cpu className="w-3.5 h-3.5 text-scan-hot animate-pulse" />
              <span>SIH 2026 PS ID SIH26158</span>
            </div>
            <span className="font-mono text-[10px] bg-scan-hot/15 text-scan-hot px-2 py-0.5 rounded border border-scan-hot/30 font-bold">
              TEAM PIXEL ERROR (ID: 51)
            </span>
          </div>

          <h2 className="text-3xl md:text-5xl font-display font-extrabold tracking-tight text-ink-100 leading-none">
            SINGLE-PASS DRONE VIDEO TO ACCURATE 3D MODEL.<br />
            <span className="text-scan-mid">SCROLLING IS DESCENDING.</span>
          </h2>
          
          <p className="text-xs md:text-sm text-text-muted leading-relaxed font-sans">
            AI-Powered Single-Pass 3D Drone Reconstruction platform (God's Eye). Fusing classical camera pose tracking with zero-shot monocular depth estimation to build metrically accurate 3D digital twins without LiDAR hardware.
          </p>

          <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[10px]">
            <div className="bg-void/60 border border-line p-2 rounded flex items-center gap-1.5 text-scan-mid">
              <span>✓ 70% Flight & Battery Saved</span>
            </div>
            <div className="bg-void/60 border border-line p-2 rounded flex items-center gap-1.5 text-scan-hot">
              <span>✓ Zero LiDAR Hardware</span>
            </div>
          </div>
        </div>

        {/* PANEL 2: THE PROBLEM (Trigger: 0.17..0.35) */}
        <div 
          style={getPanelStyle(0.16, 0.34)}
          className="fixed top-1/2 right-4 md:right-12 -translate-y-1/2 max-w-lg flex flex-col gap-4 p-5 rounded border border-line bg-void/85 backdrop-blur-sm"
        >
          <span className="font-mono text-xs text-danger uppercase tracking-widest font-bold">01 / TRAJECTORY GEOMETRY GAP</span>
          <h3 className="text-2xl font-display font-bold text-ink-100 uppercase">THE CRITICAL BOTTLENECK</h3>
          <p className="text-sm text-text-muted leading-relaxed font-sans">
            Standard photogrammetry fails on linear lawnmower flights because SIFT camera pose estimation becomes mathematically unstable without overlapping perspective loops, leaving empty occlusion holes and requiring 3-5+ drone passes.
          </p>
          <div className="bg-void/70 border border-danger/40 p-2.5 rounded font-mono text-xs text-danger flex items-center justify-between">
            <span>TRADITIONAL MULTI-PASS:</span>
            <span className="font-bold">3 - 8 HOURS | 5 FLIGHTS</span>
          </div>
        </div>

        {/* PANEL 3: THE FLOW APPROACH (Trigger: 0.37..0.57) */}
        <div 
          style={getPanelStyle(0.36, 0.56)}
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-3xl flex flex-col gap-5 p-5 rounded border border-line bg-void/90 backdrop-blur-sm"
        >
          <div className="flex flex-col gap-1 font-mono text-center">
            <span className="text-xs text-scan-mid uppercase font-bold tracking-widest">02 / PIPELINE SOLVER FLOW</span>
            <h3 className="text-lg font-display font-bold uppercase text-ink-100 font-sans">SINGLE-PASS RECONNAISSANCE PIPELINE</h3>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-6 gap-2.5 font-mono text-xs">
            {[
              { num: "01", name: "FRAME EXTRACT", detail: "OpenCV flow keyframe selection" },
              { num: "02", name: "SFM POSES", detail: "PyCOLMAP camera tracking" },
              { num: "03", name: "AI DEPTH FUSE", detail: "Depth Anything v2 monocular sync" },
              { num: "04", name: "SCALE ALIGN", detail: "Neural scale & datum calibration" },
              { num: "05", name: "POISSON MESH", detail: "Open3D watertight surface generation" },
              { num: "06", name: "3D CANVAS", detail: "React Three Fiber WebGL viewer" }
            ].map((stage, idx) => (
              <div key={idx} className="border border-line p-2.5 rounded bg-void/50 flex flex-col justify-between min-h-[110px]">
                <span className="text-text-muted">{stage.num}</span>
                <div className="flex flex-col gap-1 mt-2">
                  <span className="font-bold text-ink-100 uppercase">{stage.name}</span>
                  <span className="text-[9px] text-text-muted leading-tight">{stage.detail}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* PANEL 4: ACCURACY & IMPACT COMPARISON (Trigger: 0.59..0.75) */}
        <div 
          style={getPanelStyle(0.58, 0.74)}
          className="fixed top-1/2 left-4 md:left-12 -translate-y-1/2 max-w-xl flex flex-col gap-4 p-5 rounded border border-line bg-void/90 backdrop-blur-sm"
        >
          <div className="flex flex-col gap-1 font-mono">
            <span className="text-xs text-scan-cold uppercase font-bold tracking-widest">03 / ACCURACY SYNCHRONIZATION</span>
            <h3 className="text-base font-display font-bold text-ink-100 uppercase">GOD'S EYE VS CLASSICAL MULTI-PASS</h3>
          </div>

          <div className="w-full overflow-x-auto rounded border border-line bg-void/50">
            <table className="w-full text-left border-collapse font-mono text-[10px]">
              <thead>
                <tr className="bg-line/20 border-b border-line text-text-muted">
                  <th className="p-2">METRIC CORE</th>
                  <th className="p-2 border-l border-line">CLASSICAL SfM</th>
                  <th className="p-2 border-l border-line text-scan-mid">GOD'S EYE FUSION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/40 text-text-muted">
                <tr>
                  <td className="p-2 font-sans text-ink-100 font-semibold">Flights Required</td>
                  <td className="p-2 border-l border-line">3 - 5+ passes</td>
                  <td className="p-2 border-l border-line text-scan-mid font-bold">1 single pass</td>
                </tr>
                <tr>
                  <td className="p-2 font-sans text-ink-100 font-semibold">Occlusion Voids</td>
                  <td className="p-2 border-l border-line text-danger">Black empty mesh holes</td>
                  <td className="p-2 border-l border-line text-scan-mid font-bold">Watertight AI synthesis</td>
                </tr>
                <tr>
                  <td className="p-2 font-sans text-ink-100 font-semibold">Turnaround Time</td>
                  <td className="p-2 border-l border-line">3 - 8 hours</td>
                  <td className="p-2 border-l border-line text-scan-mid font-bold">~ 12 minutes</td>
                </tr>
                <tr>
                  <td className="p-2 font-sans text-ink-100 font-semibold">LiDAR Hardware</td>
                  <td className="p-2 border-l border-line text-danger">Expensive sensor rig</td>
                  <td className="p-2 border-l border-line text-scan-mid font-bold">Standard RGB Video</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* PANEL 5: RISKS & MITIGATIONS (Trigger: 0.77..0.89) */}
        <div 
          style={getPanelStyle(0.76, 0.88)}
          className="fixed top-1/2 right-4 md:right-12 -translate-y-1/2 max-w-xl flex flex-col gap-3 p-5 rounded border border-line bg-void/90 backdrop-blur-sm"
        >
          <div className="flex items-center justify-between font-mono">
            <span className="text-xs text-scan-hot uppercase tracking-widest font-bold">04 / RISKS & PRE-MITIGATIONS</span>
            <span className="text-[10px] text-scan-mid border border-scan-mid/30 px-2 py-0.5 rounded font-bold">ALL 5 PRE-MITIGATED</span>
          </div>

          <div className="space-y-2 font-mono text-[10px]">
            <div className="p-2 rounded bg-void/60 border border-line">
              <div className="text-danger font-bold">RISK 1: Low feature matches on single-pass video</div>
              <div className="text-text-muted mt-0.5">MITIGATION: Sequential matcher tuned for video frame order; fallback high-texture extraction.</div>
            </div>
            <div className="p-2 rounded bg-void/60 border border-line">
              <div className="text-danger font-bold">RISK 2: AI depth scale mismatch with SfM output</div>
              <div className="text-text-muted mt-0.5">MITIGATION: Scale-alignment fusion calibrated early with robust RANSAC scale optimization.</div>
            </div>
            <div className="p-2 rounded bg-void/60 border border-line">
              <div className="text-danger font-bold">RISK 3: Processing speed for live demonstrations</div>
              <div className="text-text-muted mt-0.5">MITIGATION: Pre-process hero video datasets; live demo running on fast GPU batching.</div>
            </div>
          </div>
        </div>

        {/* PANEL 6: RESEARCH & TEAM (Trigger: 0.90..0.95) */}
        <div 
          style={getPanelStyle(0.89, 0.95)}
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-2xl flex flex-col gap-4 p-5 rounded border border-line bg-void/90 backdrop-blur-sm"
        >
          <div className="flex justify-between items-center font-mono">
            <span className="text-xs text-scan-cold uppercase font-bold tracking-widest">05 / RESEARCH & STACK</span>
            <span className="text-xs text-ink-100 font-bold uppercase">TEAM PIXEL ERROR (ID: 51)</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 font-mono text-[10px]">
            <div className="p-2.5 rounded border border-line bg-void/50">
              <div className="text-scan-mid font-bold">COLMAP / pycolmap</div>
              <div className="text-text-muted">SfM Camera Pose Tracking</div>
            </div>
            <div className="p-2.5 rounded border border-line bg-void/50">
              <div className="text-scan-hot font-bold">Depth Anything V2</div>
              <div className="text-text-muted">Monocular AI Depth Engine</div>
            </div>
            <div className="p-2.5 rounded border border-line bg-void/50">
              <div className="text-scan-cold font-bold">Open3D</div>
              <div className="text-text-muted">Poisson Surface Meshing</div>
            </div>
            <div className="p-2.5 rounded border border-line bg-void/50">
              <div className="text-scan-mid font-bold">FastAPI Async</div>
              <div className="text-text-muted">Job Orchestration & Streaming</div>
            </div>
            <div className="p-2.5 rounded border border-line bg-void/50">
              <div className="text-scan-hot font-bold">React Three Fiber</div>
              <div className="text-text-muted">WebGL 3D Operator Canvas</div>
            </div>
            <div className="p-2.5 rounded border border-line bg-void/50">
              <div className="text-scan-cold font-bold">Docker / Edge Ops</div>
              <div className="text-text-muted">Tactical Edge Containerized</div>
            </div>
          </div>
        </div>

        {/* PANEL 7: CTA TOUCHDOWN (Trigger: 0.96..1.0) */}
        <div 
          style={getPanelStyle(0.96, 1.0)}
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-w-sm w-[90%] flex flex-col items-center text-center gap-5 p-6 rounded border border-scan-hot/40 bg-void/90 backdrop-blur shadow-2xl"
        >
          <div className="w-12 h-12 rounded-full bg-scan-hot/10 border border-scan-hot/20 flex items-center justify-center text-scan-hot">
            <ShieldCheck className="w-6 h-6 animate-pulse" />
          </div>
          <div className="flex flex-col gap-1 font-mono text-xs">
            <span className="text-scan-mid font-extrabold uppercase">touchdown completed</span>
            <h3 className="text-lg font-display font-extrabold uppercase text-ink-100 font-sans tracking-wide">gcs console unlocked</h3>
            <span className="text-[10px] text-scan-hot font-bold">TEAM PIXEL ERROR (ID: 51)</span>
          </div>
          <p className="text-xs text-text-muted leading-relaxed font-sans">
            The terrain mesh has compiled completely. Step into the operator cockpit to upload flight cards, measure elevation coordinates, and slice terrain profiles.
          </p>

          <button
            onClick={() => navigate('/app')}
            className="w-full py-3 rounded bg-scan-hot hover:bg-scan-hot/90 text-void font-mono font-bold text-xs tracking-widest cursor-pointer uppercase flex items-center justify-center gap-2"
          >
            <span>ENTER GROUND STATION</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>

    </div>
  );
};
