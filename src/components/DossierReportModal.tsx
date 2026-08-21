import type { ProjectComplianceResult } from '../types/thermal';

interface Props {
  result: ProjectComplianceResult;
  onClose: () => void;
  onDownloadPDF: () => void;
  onDownloadJSON: () => void;
}

/** DossierReportModal — preview + exportação (Laudo PDF / JSON). */
export default function DossierReportModal({ result, onClose, onDownloadPDF, onDownloadJSON }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="bg-industrial-card border border-industrial-edge rounded-xl max-w-lg w-full p-6"
        onClick={e => e.stopPropagation()}
        role="dialog" aria-modal="true" aria-label="Dossiê gerado"
      >
        <h2 className="text-lg font-semibold mb-1">Dossiê Gerado ✅</h2>
        <p className="text-xs text-slate-400 mb-4">
          Memorial de Cálculo NBR 15575:2021 autenticado por hash SHA-256.
        </p>

        <dl className="text-sm space-y-2 bg-industrial-bg rounded-lg p-3 border border-industrial-edge">
          <div className="flex justify-between"><dt className="text-slate-400">Parecer</dt>
            <dd className={result.overallStatus === 'CONFORME' ? 'text-emerald-400 font-semibold' : 'text-red-400 font-semibold'}>
              {result.overallStatus}
            </dd></div>
          <div className="flex justify-between"><dt className="text-slate-400">Zona Bioclimática</dt><dd>ZB {result.bioclimaticZone}</dd></div>
          <div className="flex justify-between"><dt className="text-slate-400">Método</dt><dd>{result.method}</dd></div>
          <div className="flex justify-between"><dt className="text-slate-400">Ambientes</dt><dd>{result.zones.length}</dd></div>
          <div className="flex justify-between"><dt className="text-slate-400">Hash auditoria</dt>
            <dd className="font-mono text-[10px] break-all max-w-[220px] text-right">{result.auditHash.slice(0, 24)}…</dd></div>
        </dl>

        <div className="mt-5 flex gap-2">
          <button onClick={onDownloadPDF}
            className="flex-1 px-4 py-2.5 rounded-lg bg-industrial-cyan text-slate-950 font-semibold text-sm hover:bg-cyan-300 transition">
            ⬇ Baixar Laudo PDF
          </button>
          <button onClick={onDownloadJSON}
            className="px-4 py-2.5 rounded-lg border border-industrial-edge text-sm hover:border-industrial-cyan transition">
            JSON
          </button>
        </div>
        <button onClick={onClose} className="mt-3 w-full text-xs text-slate-500 hover:text-slate-300">
          Fechar e continuar editando
        </button>
      </div>
    </div>
  );
}
