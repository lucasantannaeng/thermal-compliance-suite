interface HourPoint { hour: number; totalBTU: number }

/** HourlyLoadChart — curva diária de demanda (SVG puro, zero dependências). */
export default function HourlyLoadChart({ profile }: { profile: HourPoint[] }) {
  const W = 480, H = 160, PAD = 28;
  const max = Math.max(...profile.map(p => p.totalBTU), 1);
  const x = (h: number) => PAD + (h / 23) * (W - 2 * PAD);
  const y = (v: number) => H - PAD - (v / max) * (H - 2 * PAD);
  const path = profile.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.hour).toFixed(1)},${y(p.totalBTU).toFixed(1)}`).join(' ');
  const peak = profile.reduce((a, b) => (b.totalBTU > a.totalBTU ? b : a));

  return (
    <section className="bg-industrial-card border border-industrial-edge rounded-xl p-4">
      <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-2">
        Curva Diária — Pico às {peak.hour}h ({peak.totalBTU.toLocaleString('pt-BR')} BTU/h)
      </h2>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Curva de carga térmica 24 horas">
        {[0.25, 0.5, 0.75].map(f => (
          <line key={f} x1={PAD} x2={W - PAD} y1={y(max * f)} y2={y(max * f)}
            stroke="#1e293b" strokeDasharray="3 3" />
        ))}
        <path d={`${path} L${x(23)},${H - PAD} L${x(0)},${H - PAD} Z`} fill="rgba(34,211,238,0.08)" />
        <path d={path} fill="none" stroke="#22d3ee" strokeWidth="2" />
        {[0, 6, 12, 18, 23].map(h => (
          <g key={h}>
            <text x={x(h)} y={H - 8} fill="#64748b" fontSize="9" textAnchor="middle">{h}h</text>
          </g>
        ))}
        <circle cx={x(peak.hour)} cy={y(peak.totalBTU)} r="4" fill="#22d3ee" />
      </svg>
    </section>
  );
}
