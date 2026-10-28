import { useRef, useState } from 'react';
import { FileUp, FileJson, Layers3, Eye, EyeOff, X, RotateCcw, ShieldCheck, AlertCircle, Download } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

type ReportInfo = {
  phase?: string;
  status?: string;
  dimensions?: Record<string, number>;
  inferredCount?: number;
};

function parseReport(raw: unknown): ReportInfo {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('Expected a reconstruction report JSON object.');
  }
  const data = raw as Record<string, unknown>;
  const dimensionSource = data.dimensions_sfm ?? data.building_dimensions_sfm;
  const dimensions: Record<string, number> = {};
  if (dimensionSource && typeof dimensionSource === 'object' && !Array.isArray(dimensionSource)) {
    Object.entries(dimensionSource).forEach(([key, value]) => {
      if (typeof value === 'number' && Number.isFinite(value)) dimensions[key] = value;
    });
  }
  return {
    phase: typeof data.phase === 'string' ? data.phase : undefined,
    status: typeof data.status === 'string' ? data.status : undefined,
    dimensions,
    inferredCount: Array.isArray(data.inferred_surfaces) ? data.inferred_surfaces.length : undefined,
  };
}

/**
 * Local, browser-only review of real reconstruction outputs.
 * Does not upload the GLB to a server or pretend to run photogrammetry.
 */
export function ModelReviewPanel() {
  const {
    modelSource,
    modelMetadata,
    setActiveModelPath,
    setPipelineType,
    setViewMode,
    loadDemoModel,
    showObservedGeometry,
    showInferredGeometry,
    setShowObservedGeometry,
    setShowInferredGeometry,
  } = useAppStore();

  const [open, setOpen] = useState(false);
  const [localFile, setLocalFile] = useState<File | null>(null);
  const [report, setReport] = useState<ReportInfo | null>(null);
  const [reportName, setReportName] = useState('');
  const [error, setError] = useState('');
  const modelInput = useRef<HTMLInputElement>(null);
  const reportInput = useRef<HTMLInputElement>(null);
  const lastObjectUrl = useRef<string | null>(null);

  async function loadGlb(file: File) {
    setError('');
    if (!file.name.toLowerCase().endsWith('.glb')) {
      setError('Choose a binary .glb file. Standalone .gltf files can require separate textures.');
      return;
    }
    const header = await file.slice(0, 12).arrayBuffer();
    const view = new DataView(header);
    if (
      header.byteLength !== 12 ||
      view.getUint32(0, true) !== 0x46546c67 ||
      view.getUint32(4, true) !== 2 ||
      view.getUint32(8, true) !== file.size
    ) {
      setError('This is not a valid glTF 2.0 binary file.');
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setActiveModelPath(objectUrl, file.name, file.size);
    setPipelineType('mesh');
    setViewMode('textured');
    setLocalFile(file);
    setReport(null);
    setReportName('');
    setShowObservedGeometry(true);
    setShowInferredGeometry(true);
    if (lastObjectUrl.current) URL.revokeObjectURL(lastObjectUrl.current);
    lastObjectUrl.current = objectUrl;
    if (modelInput.current) modelInput.current.value = '';
  }

  async function loadReport(file: File) {
    setError('');
    if (!file.name.toLowerCase().endsWith('.json')) {
      setError('Choose a .json report produced by the reconstruction pipeline.');
      return;
    }
    try {
      const parsed = parseReport(JSON.parse(await file.text()));
      setReport(parsed);
      setReportName(file.name);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Invalid JSON report.');
    }
    if (reportInput.current) reportInput.current.value = '';
  }

  function restoreDemo() {
    loadDemoModel();
    setShowObservedGeometry(true);
    setShowInferredGeometry(true);
    setLocalFile(null);
    setReport(null);
    setReportName('');
    setError('');
    if (lastObjectUrl.current) URL.revokeObjectURL(lastObjectUrl.current);
    lastObjectUrl.current = null;
  }

  return (
    <div className="absolute left-4 bottom-5 z-20 max-w-[calc(100%-2rem)] font-mono">
      <input
        ref={modelInput}
        className="hidden"
        type="file"
        accept=".glb,model/gltf-binary"
        aria-label="Select reconstructed GLB"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          if (file) void loadGlb(file);
        }}
      />
      <input
        ref={reportInput}
        className="hidden"
        type="file"
        accept=".json,application/json"
        aria-label="Select reconstruction JSON report"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          if (file) void loadReport(file);
        }}
      />

      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 rounded border border-[#4FA9A0]/60 bg-[#080D0C]/95 px-4 py-3 text-xs font-bold tracking-widest text-[#EDEAE2] shadow-xl backdrop-blur hover:border-[#E8A33D]"
        >
          <Layers3 size={17} className="text-[#4FA9A0]" />
          RECONSTRUCTION REVIEW
          <span className="rounded bg-[#25392F] px-2 py-1 text-[10px] text-[#A8CBBB]">{modelSource}</span>
        </button>
      ) : (
        <section className="w-[365px] max-w-full rounded-lg border border-[#355448] bg-[#080D0C]/95 shadow-2xl backdrop-blur-xl" aria-label="Reconstruction review panel">
          <div className="flex items-center justify-between border-b border-[#203229] px-4 py-3">
            <div className="flex items-center gap-2 text-[#EDEAE2]">
              <Layers3 size={18} className="text-[#4FA9A0]" />
              <span className="text-xs font-bold tracking-widest">3D MODEL REVIEW</span>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close review panel" className="text-[#8B948C] hover:text-white">
              <X size={16} />
            </button>
          </div>
          <div className="space-y-4 p-4">
            <div className="rounded border border-[#2A4437] bg-[#101C17] p-3">
              <div className="flex items-center gap-2 text-[11px] text-[#A5D5BE]">
                <ShieldCheck size={14} />
                {modelSource === 'LOCAL GLB' ? 'LOCAL RECONSTRUCTION FILE' : modelSource}
              </div>
              <div title={modelMetadata.modelName} className="mt-2 truncate text-xs font-bold text-[#EDEAE2]">{modelMetadata.modelName}</div>
              <div className="mt-1 text-[10px] text-[#8B948C]">
                {localFile ? `${(localFile.size / (1024 * 1024)).toFixed(2)} MiB · Loaded in this browser only` : 'Use a real output GLB to replace the demo model'}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => modelInput.current?.click()} className="flex items-center justify-center gap-2 rounded bg-[#4FA9A0] px-2 py-3 text-xs font-bold text-[#081310] hover:bg-[#6CC9B1]">
                <FileUp size={15} /> OPEN .GLB
              </button>
              <button type="button" onClick={() => reportInput.current?.click()} className="flex items-center justify-center gap-2 rounded border border-[#426052] px-2 py-3 text-xs text-[#C6E1D1] hover:bg-[#18291F]">
                <FileJson size={15} /> LOAD REPORT
              </button>
            </div>

            <div className="space-y-2 border-t border-[#203229] pt-3">
              <div className="text-[10px] font-bold uppercase tracking-[.14em] text-[#8B948C]">Geometry visibility · actual GLB layers</div>
              <button type="button" onClick={() => setShowObservedGeometry(!showObservedGeometry)} className="flex w-full items-center justify-between rounded border border-[#2A4437] p-2.5 text-xs text-[#EDEAE2] hover:bg-[#15231C]" aria-pressed={showObservedGeometry}>
                <span>Photographic / observed geometry</span>
                {showObservedGeometry ? <Eye size={16} className="text-[#4FA9A0]" /> : <EyeOff size={16} className="text-[#8B948C]" />}
              </button>
              <button type="button" onClick={() => setShowInferredGeometry(!showInferredGeometry)} className="flex w-full items-center justify-between rounded border border-[#2A4437] p-2.5 text-xs text-[#EDEAE2] hover:bg-[#15231C]" aria-pressed={showInferredGeometry}>
                <span>Inferred geometry (when tagged)</span>
                {showInferredGeometry ? <Eye size={16} className="text-[#E8A33D]" /> : <EyeOff size={16} className="text-[#8B948C]" />}
              </button>
              <p className="text-[10px] leading-relaxed text-[#8B948C]">Inferred layers are identified by mesh or material names containing “Inferred” or “Envelope”. This is a visibility filter, not a confidence estimate.</p>
            </div>

            {report && (
              <div className="rounded border border-[#34443D] bg-[#101915] p-3 text-[11px] text-[#CBD8CF]">
                <div className="mb-2 truncate font-bold text-[#E8A33D]" title={reportName}>{reportName}</div>
                {report.phase && <div>Phase: {report.phase}</div>}
                {report.status && <div className="break-words">Status: {report.status}</div>}
                {report.inferredCount !== undefined && <div>Tagged inferred surfaces: {report.inferredCount}</div>}
                {Object.entries(report.dimensions ?? {}).map(([key, value]) => (
                  <div key={key}>{key}: {value.toFixed(3)} SfM units</div>
                ))}
                <p className="mt-2 text-[#8B948C]">SfM dimensions are not metric unless externally calibrated.</p>
              </div>
            )}

            {error && (
              <div role="alert" className="flex items-start gap-2 rounded border border-red-900/60 bg-red-950/40 p-2 text-[11px] text-red-200">
                <AlertCircle size={15} className="shrink-0" />{error}
              </div>
            )}
            <div className="flex items-center justify-between border-t border-[#203229] pt-3">
              <button type="button" onClick={restoreDemo} className="inline-flex items-center gap-1 text-[11px] text-[#8B948C] hover:text-[#EDEAE2]"><RotateCcw size={13} /> DEMO MODEL</button>
              {localFile && (
                <a href={lastObjectUrl.current ?? undefined} download={localFile.name} className="inline-flex items-center gap-1 text-[11px] text-[#4FA9A0] hover:text-[#A1F2DF]"><Download size={13} /> DOWNLOAD GLB</a>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
