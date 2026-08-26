import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LandingPage } from './components/LandingPage';
import { TopBar } from './components/TopBar';
import { ViewportCanvas } from './components/Viewport/ViewportCanvas';
import { TelemetrySidebar } from './components/TelemetrySidebar';
import { UploadModal } from './components/UploadModal';
import { ComparisonSlider } from './components/ComparisonSlider';

function CockpitApp() {
  return (
    <div className="flex flex-col h-screen w-screen bg-[#060908] text-[#EDEAE2] overflow-hidden font-body select-none">
      {/* Top Header Navigation Bar */}
      <TopBar />

      {/* Main Content Area: 3D Viewport Canvas + Telemetry Sidebar */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* Main Center 3D Viewport */}
        <main className="flex-1 relative w-full h-full overflow-hidden">
          {/* 3D WebGL Viewport Canvas (Hero Element) */}
          <ViewportCanvas />

          {/* Collapsible / Floating Accuracy Comparison Drawer */}
          <ComparisonSlider />
        </main>

        {/* Right-Hand Telemetry Panel */}
        <TelemetrySidebar />
      </div>

      {/* Upload Footage Modal */}
      <UploadModal />
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/app" element={<CockpitApp />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
