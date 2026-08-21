import { useState } from 'react';
import type { ThermalZoneInput } from '../types/thermal';
import { PAREDE_MATERIAIS, TELHADO_MATERIAIS, VIDRO_MATERIAIS } from '../engine/presets';

interface Props {
  zones: ThermalZoneInput[];
  onChange: (zones: ThermalZoneInput[]) => void;
  onImportCSV: (csv: string) => void;
}

const ORIENTACOES = ['norte', 'sul', 'leste', 'oeste'] as const;

/** ZoneManagerCard — cadastro ágil de zonas + importação CSV/JSON (moat 80/20). */
export default function ZoneManagerCard({ zones, onChange, onImportCSV }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState<ThermalZoneInput>({
    id: '', name: '', area: 12, height: 2.8, occupants: 2, activity: 'residencial',
    zone: 8, lightingWatts: 60, hasRoof: true, roofMaterialId: 'laje_simples',
    roofArea: 12,
    walls: [{ id: 'w1', area: 10, orientation: 'oeste', materialId: 'alvenaria_leve' }],
    windows: [{ id: 'g1', area: 1.5, orientation: 'oeste', materialId: 'simples', protection: 0.8 }],
    equipment: [],
  });

  const addZone = () => {
    if (!draft.name.trim()) return;
    onChange([...zones, { ...draft, id: crypto.randomUUID() }]);
    setShowForm(false);
    setDraft(d => ({ ...d, name: '' }));
  };

  return (
    <section className="lg:col-span-3 bg-industrial-card border border-industrial-edge rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
          Ambientes ({zones.length})
        </h2>
        <div className="flex gap-2">
          <label className="px-3 py-1.5 text-xs rounded-md border border-industrial-edge hover:border-industrial-cyan cursor-pointer transition">
            📄 Importar CSV
            <input
              type="file" accept=".csv" className="hidden"
              onChange={e => {
                const f = e.target.files?.[0];
                if (!f) return;
                const reader = new FileReader();
                reader.onload = () => onImportCSV(String(reader.result));
                reader.readAsText(f);
                e.target.value = '';
              }}
            />
          </label>
          <button
            onClick={() => setShowForm(s => !s)}
            className="px-3 py-1.5 text-xs rounded-md bg-industrial-cyan/15 border border-industrial-cyan/40 text-industrial-cyan hover:bg-industrial-cyan/25 transition"
          >
            + Novo Ambiente
          </button>
        </div>
      </div>

      {/* Lista de zonas */}
      <div className="flex flex-wrap gap-2 mb-2">
        {zones.map((z, i) => (
          <span key={z.id} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-industrial-bg border border-industrial-edge text-xs font-mono">
            {z.name} · {z.area}m²
            <button
              onClick={() => onChange(zones.filter((_, j) => j !== i))}
              className="text-slate-500 hover:text-red-400"
              aria-label={`Remover ${z.name}`}
            >✕</button>
          </span>
        ))}
        {zones.length === 0 && (
          <p className="text-xs text-slate-500 py-2">Nenhum ambiente. Cadastre manualmente ou importe um CSV.</p>
        )}
      </div>

      {/* Formulário de nova zona */}
      {showForm && (
        <div className="mt-3 p-3 rounded-lg bg-industrial-bg border border-industrial-edge grid grid-cols-2 md:grid-cols-4 gap-2.5 text-sm">
          <label className="col-span-2 md:col-span-1">
            <span className="text-xs text-slate-400">Nome</span>
            <input value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
              placeholder="Dormitório 101"
              className="mt-0.5 w-full bg-industrial-card border border-industrial-edge rounded-md px-2 py-1.5 focus:border-industrial-cyan outline-none" />
          </label>
          {([['area', 'Área m²'], ['height', 'Pé-direito m'], ['occupants', 'Ocupantes'], ['lightingWatts', 'Iluminação W'], ['roofArea', 'Cobertura m²']] as const).map(([k, label]) => (
            <label key={k}>
              <span className="text-xs text-slate-400">{label}</span>
              <input type="number" step="any" min="0" value={draft[k]}
                onChange={e => setDraft(d => ({ ...d, [k]: Number(e.target.value) }))}
                className="mt-0.5 w-full bg-industrial-card border border-industrial-edge rounded-md px-2 py-1.5 focus:border-industrial-cyan outline-none" />
            </label>
          ))}
          <label>
            <span className="text-xs text-slate-400">Atividade</span>
            <select value={draft.activity} onChange={e => setDraft(d => ({ ...d, activity: e.target.value as ThermalZoneInput['activity'] }))}
              className="mt-0.5 w-full bg-industrial-card border border-industrial-edge rounded-md px-2 py-1.5">
              <option value="residencial">Residencial</option>
              <option value="comercial_baixo">Comercial (baixa)</option>
              <option value="comercial_alto">Comercial (alta)</option>
              <option value="cozinha">Cozinha</option>
            </select>
          </label>
          <label>
            <span className="text-xs text-slate-400">Telhado (preset)</span>
            <select value={draft.roofMaterialId} onChange={e => setDraft(d => ({ ...d, roofMaterialId: e.target.value }))}
              className="mt-0.5 w-full bg-industrial-card border border-industrial-edge rounded-md px-2 py-1.5">
              {Object.values(TELHADO_MATERIAIS).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </label>

          {/* Paredes */}
          <div className="col-span-2 md:col-span-4">
            <p className="text-xs text-slate-400 mb-1">Paredes externas (U presets NBR)</p>
            <div className="space-y-1.5">
              {draft.walls.map((w, i) => (
                <div key={w.id} className="flex gap-2 items-center">
                  <input type="number" min="0" step="any" value={w.area} aria-label="Área parede"
                    onChange={e => setDraft(d => ({ ...d, walls: d.walls.map((x, j) => j === i ? { ...x, area: Number(e.target.value) } : x) }))}
                    className="w-20 bg-industrial-card border border-industrial-edge rounded-md px-2 py-1" />
                  <select value={w.orientation} aria-label="Orientação parede"
                    onChange={e => setDraft(d => ({ ...d, walls: d.walls.map((x, j) => j === i ? { ...x, orientation: e.target.value as typeof w.orientation } : x) }))}
                    className="bg-industrial-card border border-industrial-edge rounded-md px-2 py-1">
                    {ORIENTACOES.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                  <select value={w.materialId} aria-label="Material parede"
                    onChange={e => setDraft(d => ({ ...d, walls: d.walls.map((x, j) => j === i ? { ...x, materialId: e.target.value } : x) }))}
                    className="flex-1 bg-industrial-card border border-industrial-edge rounded-md px-2 py-1">
                    {Object.values(PAREDE_MATERIAIS).map(m => <option key={m.id} value={m.id}>{m.name} — U={m.uFactor}</option>)}
                  </select>
                  <button onClick={() => setDraft(d => ({ ...d, walls: d.walls.filter((_, j) => j !== i) }))}
                    className="text-slate-500 hover:text-red-400">✕</button>
                </div>
              ))}
              <button onClick={() => setDraft(d => ({ ...d, walls: [...d.walls, { id: `w${Date.now()}`, area: 8, orientation: 'norte', materialId: 'alvenaria_leve' }] }))}
                className="text-xs text-industrial-cyan hover:underline">+ parede</button>
            </div>
          </div>

          {/* Vidros */}
          <div className="col-span-2 md:col-span-4">
            <p className="text-xs text-slate-400 mb-1">Esquadrias envidraçadas</p>
            <div className="space-y-1.5">
              {draft.windows.map((win, i) => (
                <div key={win.id} className="flex gap-2 items-center">
                  <input type="number" min="0" step="any" value={win.area} aria-label="Área vidro"
                    onChange={e => setDraft(d => ({ ...d, windows: d.windows.map((x, j) => j === i ? { ...x, area: Number(e.target.value) } : x) }))}
                    className="w-20 bg-industrial-card border border-industrial-edge rounded-md px-2 py-1" />
                  <select value={win.orientation} aria-label="Orientação vidro"
                    onChange={e => setDraft(d => ({ ...d, windows: d.windows.map((x, j) => j === i ? { ...x, orientation: e.target.value as typeof win.orientation } : x) }))}
                    className="bg-industrial-card border border-industrial-edge rounded-md px-2 py-1">
                    {ORIENTACOES.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                  <select value={win.materialId} aria-label="Tipo vidro"
                    onChange={e => setDraft(d => ({ ...d, windows: d.windows.map((x, j) => j === i ? { ...x, materialId: e.target.value } : x) }))}
                    className="flex-1 bg-industrial-card border border-industrial-edge rounded-md px-2 py-1">
                    {Object.values(VIDRO_MATERIAIS).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                  <input type="number" min="0" max="1" step="0.05" value={win.protection} title="Proteção solar (1=sem proteção)" aria-label="Proteção"
                    onChange={e => setDraft(d => ({ ...d, windows: d.windows.map((x, j) => j === i ? { ...x, protection: Number(e.target.value) } : x) }))}
                    className="w-16 bg-industrial-card border border-industrial-edge rounded-md px-2 py-1" />
                  <button onClick={() => setDraft(d => ({ ...d, windows: d.windows.filter((_, j) => j !== i) }))}
                    className="text-slate-500 hover:text-red-400">✕</button>
                </div>
              ))}
              <button onClick={() => setDraft(d => ({ ...d, windows: [...d.windows, { id: `g${Date.now()}`, area: 1.5, orientation: 'leste', materialId: 'simples', protection: 0.8 }] }))}
                className="text-xs text-industrial-cyan hover:underline">+ esquadria</button>
            </div>
          </div>

          <div className="col-span-2 md:col-span-4 flex gap-2 pt-1">
            <button onClick={addZone}
              className="px-4 py-1.5 rounded-md bg-industrial-cyan text-slate-950 text-sm font-semibold hover:bg-cyan-300 transition">
              Adicionar Ambiente
            </button>
            <button onClick={() => setShowForm(false)}
              className="px-4 py-1.5 rounded-md border border-industrial-edge text-sm hover:border-slate-400 transition">
              Cancelar
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
