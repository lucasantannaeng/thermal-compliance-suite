import type { ComplianceStatus, EnvelopeCheck, PerformanceLevel } from '../types/thermal';

interface Props {
  status: ComplianceStatus;
  level: PerformanceLevel;
  hash: string;
  checks: EnvelopeCheck[];
}

const STATUS_META: Record<ComplianceStatus, { label: string; ring: string; text: string }> = {
  CONFORME: { label: 'CONFORME', ring: 'border-emerald-500/50 bg-emerald-500/10', text: 'text-emerald-400' },
  NAO_CONFORME: { label: 'NÃO CONFORME', ring: 'border-red-500/50 bg-red-500/10', text: 'text-red-400' },
  ATENCAO: { label: 'ATENÇÃO', ring: 'border-amber-500/50 bg-amber-500/10', text: 'text-amber-400' },
};

/** ComplianceGauge — parecer em tempo real (Mínimo/Intermediário/Superior). */
export default function ComplianceGauge({ status, level, hash, checks }: Props) {
  const meta = STATUS_META[status];
  const pass = checks.filter(c => c.status === 'CONFORME').length;
  const total = checks.length;

  return (
    <section className={`${meta.ring} border rounded-xl p-4 flex flex-col`}>
      <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-2">Parecer Normativo</h2>
      <div className={`text-3xl font-bold ${meta.text}`}>{meta.label}</div>
      <p className="text-xs text-slate-400 mt-1">
        Nível almejado: {level} · Elementos conformes: {pass}/{total || '—'}
      </p>
      <ul className="mt-3 space-y-1.5 max-h-36 overflow-y-auto text-xs">
        {checks.map((c, i) => (
          <li key={i} className="flex items-center justify-between gap-2 font-mono">
            <span className="truncate text-slate-300">{c.element}</span>
            <span className={c.status === 'CONFORME' ? 'text-emerald-400' : 'text-red-400'}>
              U {c.obtained}/{c.limit}
            </span>
          </li>
        ))}
        {checks.length === 0 && <li className="text-slate-500">Sem elementos externos.</li>}
      </ul>
      <p className="mt-auto pt-3 text-[10px] font-mono text-slate-500 break-all">SHA-256: {hash.slice(0, 32)}…</p>
    </section>
  );
}
