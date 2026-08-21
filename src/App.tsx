import { useCallback, useEffect, useRef, useState } from 'react';
import type { ThermalZoneInput, ProjectComplianceResult, TenantBranding, PerformanceLevel, ComplianceStatus } from './types/thermal';
import { consolidate } from './engine/thermalEngine';
import { sha256Of, canonicalPayload, parseZonesCSV, exportResultJSON } from './utils/dossier';
import { generateDossierPDF } from './utils/dossierPDF';
import ZoneManagerCard from './components/ZoneManagerCard';
import ComplianceGauge from './components/ComplianceGauge';
import HourlyLoadChart from './components/HourlyLoadChart';
import DossierReportModal from './components/DossierReportModal';

const DEFAULT_BRANDING: TenantBranding = {
  organizationName: 'Sua Consultoria Engenharia',
  primaryColor: '#0e7490',
  responsibleName: '',
  professionalTitle: 'Engenheiro Mecânico',
  creaCauNumber: '',
  artRrtNumber: '',
};

export default function App() {
  const [branding, setBranding] = useState<TenantBranding>(DEFAULT_BRANDING);
  const [meta, setMeta] = useState({ projectName: '', enterprise: '', address: '', typologyUH: '' });
  const [zone, setZone] = useState<ThermalZoneInput['zone']>(8);
  const [targetLevel, setTargetLevel] = useState<PerformanceLevel>('MINIMO');
  const [zones, setZones] = useState<ThermalZoneInput[]>([]);
  const [result, setResult] = useState<ProjectComplianceResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDossier, setShowDossier] = useState(false);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    workerRef.current = new Worker(new URL('./engine/thermal.worker.ts', import.meta.url), { type: 'module' });
    return () => workerRef.current?.terminate();
  }, []);

  const runAnalysis = useCallback(() => {
    if (zones.length === 0) { setError('Cadastre ao menos um ambiente antes de analisar.'); return; }
    setError(null); setBusy(true);
    const w = workerRef.current;
    if (!w) { setError('Worker não inicializado.'); setBusy(false); return; }
    w.onmessage = async (e: MessageEvent) => {
      const partial = e.data as Omit<ProjectComplianceResult, 'auditHash'>;
      const verdict = consolidate(partial.envelopeChecks, targetLevel);
      const full: ProjectComplianceResult = {
        ...partial,
        overallStatus: verdict.status,
        auditHash: await sha256Of(canonicalPayload(meta, branding, { ...partial, overallStatus: verdict.status })),
      };
      setResult(full);
      setBusy(false);
      setShowDossier(true);
    };
    w.onerror = () => { setError('Falha no motor de cálculo.'); setBusy(false); };
    w.postMessage({ projectId: crypto.randomUUID(), projectName: meta.projectName || 'Projeto', bioclimaticZone: zone, targetLevel, zones });
  }, [zones, zone, targetLevel, meta, branding]);

  const downloadPDF = useCallback(async () => {
    if (!result) return;
    const doc = await generateDossierPDF(meta, branding, result);
    doc.save(`dossie-${(meta.projectName || 'projeto').replace(/\s+/g, '-').toLowerCase()}.pdf`);
  }, [result, meta, branding]);

  const handleImportCSV = useCallback((text: string) => {
    try {
      const imported = parseZonesCSV(text);
      setZones(prev => [...prev, ...imported]);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao importar CSV.');
    }
  }, []);

  const statusColor: Record<ComplianceStatus, string> = {
    CONFORME: 'text-emerald-400', NAO_CONFORME: 'text-red-400', ATENCAO: 'text-amber-400',
  };

  return (
    <div className="min-h-screen bg-industrial-bg text-slate-200 p-4 md:p-6">
      {/* Header white-label */}
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-industrial-cyan/20 border border-industrial-cyan/40 flex items-center justify-center">
            <span className="text-industrial-cyan font-bold">T</span>
          </div>
          <div>
            <h1 className="font-semibold tracking-tight">{branding.organizationName}</h1>
            <p className="text-xs text-slate-400">Thermal Compliance Suite — NBR 15575:2021 / NBR 16401</p>
          </div>
        </div>
        <button
          onClick={runAnalysis}
          disabled={busy}
          className="px-5 py-2.5 rounded-lg bg-industrial-cyan text-slate-950 font-semibold text-sm hover:bg-cyan-300 disabled:opacity-50 transition"
        >
          {busy ? 'Analisando…' : '▶ Analisar Conformidade'}
        </button>
      </header>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Branding / Tenant */}
        <section className="lg:col-span-1 bg-industrial-card border border-industrial-edge rounded-xl p-4">
          <h2 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wider">Identidade (White-Label)</h2>
          <div className="space-y-2.5 text-sm">
            {([
              ['organizationName', 'Consultoria'], ['responsibleName', 'Responsável Técnico'],
              ['creaCauNumber', 'CREA/CAU'], ['artRrtNumber', 'ART/RRT'],
            ] as const).map(([key, label]) => (
              <label key={key} className="block">
                <span className="text-xs text-slate-400">{label}</span>
                <input
                  value={branding[key]}
                  onChange={e => setBranding(b => ({ ...b, [key]: e.target.value }))}
                  className="mt-0.5 w-full bg-industrial-bg border border-industrial-edge rounded-md px-2.5 py-1.5 focus:border-industrial-cyan outline-none"
                />
              </label>
            ))}
            <label className="block">
              <span className="text-xs text-slate-400">Cor primária</span>
              <input
                type="color" value={branding.primaryColor}
                onChange={e => setBranding(b => ({ ...b, primaryColor: e.target.value }))}
                className="mt-0.5 w-full h-8 bg-industrial-bg border border-industrial-edge rounded-md cursor-pointer"
              />
            </label>
          </div>
        </section>

        {/* Projeto */}
        <section className="lg:col-span-2 bg-industrial-card border border-industrial-edge rounded-xl p-4">
          <h2 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wider">Empreendimento</h2>
          <div className="grid grid-cols-2 gap-2.5 text-sm">
            {([
              ['projectName', 'Nome do projeto'], ['enterprise', 'Empreendimento'],
              ['address', 'Endereço'], ['typologyUH', 'Tipologia da UH'],
            ] as const).map(([key, label]) => (
              <label key={key} className="block">
                <span className="text-xs text-slate-400">{label}</span>
                <input
                  value={meta[key]}
                  onChange={e => setMeta(m => ({ ...m, [key]: e.target.value }))}
                  className="mt-0.5 w-full bg-industrial-bg border border-industrial-edge rounded-md px-2.5 py-1.5 focus:border-industrial-cyan outline-none"
                />
              </label>
            ))}
            <label className="block">
              <span className="text-xs text-slate-400">Zona Bioclimática (NBR 15220-3)</span>
              <select
                value={zone}
                onChange={e => setZone(Number(e.target.value) as ThermalZoneInput['zone'])}
                className="mt-0.5 w-full bg-industrial-bg border border-industrial-edge rounded-md px-2.5 py-1.5 focus:border-industrial-cyan outline-none"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map(z => <option key={z} value={z}>ZB {z}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-slate-400">Nível almejado</span>
              <select
                value={targetLevel}
                onChange={e => setTargetLevel(e.target.value as PerformanceLevel)}
                className="mt-0.5 w-full bg-industrial-bg border border-industrial-edge rounded-md px-2.5 py-1.5 focus:border-industrial-cyan outline-none"
              >
                <option value="MINIMO">Mínimo</option>
                <option value="INTERMEDIARIO">Intermediário</option>
                <option value="SUPERIOR">Superior</option>
              </select>
            </label>
          </div>
        </section>

        {/* Zone Manager */}
        <ZoneManagerCard zones={zones} onChange={setZones} onImportCSV={handleImportCSV} />

        {/* Compliance Gauge */}
        {result && (
          <ComplianceGauge
            status={result.overallStatus}
            level={result.targetLevel}
            hash={result.auditHash}
            checks={result.envelopeChecks}
          />
        )}

        {/* Hourly Chart */}
        {result && <HourlyLoadChart profile={result.hourlyProfile} />}

        {/* Zones results table */}
        {result && (
          <section className="lg:col-span-3 bg-industrial-card border border-industrial-edge rounded-xl p-4 overflow-x-auto">
            <h2 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wider">
              Balanço Térmico por Ambiente (BTU/h)
            </h2>
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="text-slate-400 border-b border-industrial-edge">
                  {['Ambiente', 'Infil.', 'Pessoas', 'Ilum.', 'Equip.', 'Telhado', 'Paredes', 'Vidros', 'TOTAL', 'Sugerido'].map(h => (
                    <th key={h} className="text-left py-2 pr-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.zones.map(z => (
                  <tr key={z.zoneId} className="border-b border-industrial-edge/50">
                    <td className="py-2 pr-4 text-slate-200">{z.name}</td>
                    <td className="pr-4">{z.breakdown.infiltracao.toLocaleString('pt-BR')}</td>
                    <td className="pr-4">{z.breakdown.pessoas.toLocaleString('pt-BR')}</td>
                    <td className="pr-4">{z.breakdown.iluminacao.toLocaleString('pt-BR')}</td>
                    <td className="pr-4">{z.breakdown.equipamentos.toLocaleString('pt-BR')}</td>
                    <td className="pr-4">{z.breakdown.telhado.toLocaleString('pt-BR')}</td>
                    <td className="pr-4">{z.breakdown.paredes.toLocaleString('pt-BR')}</td>
                    <td className="pr-4">{z.breakdown.janelas.toLocaleString('pt-BR')}</td>
                    <td className="pr-4 text-industrial-cyan font-bold">{z.totalBTU.toLocaleString('pt-BR')}</td>
                    <td className="pr-4">{z.suggestedLabel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className={`mt-3 text-sm ${statusColor[result.overallStatus]}`}>
              PARECER: {result.overallStatus} — Hash de auditoria: <span className="font-mono">{result.auditHash.slice(0, 16)}…</span>
            </p>
          </section>
        )}
      </div>

      {result && showDossier && (
        <DossierReportModal
          result={result}
          onClose={() => setShowDossier(false)}
          onDownloadPDF={downloadPDF}
          onDownloadJSON={() => {
            const blob = new Blob([exportResultJSON(result)], { type: 'application/json' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `dossie-${result.projectId}.json`;
            a.click();
          }}
        />
      )}
    </div>
  );
}
