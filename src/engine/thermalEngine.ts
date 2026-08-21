/**
 * Thermal Engine — NBR 16401 (carga térmica CLTD) + verificação prescritiva NBR 15575-4/5.
 * Extraído do motor validado em TypeScript do TermalLoadCalculator (projeto autoral).
 * Executa client-side em Web Worker; sem dependências de runtime.
 */
import type {
  ThermalZoneInput, ZoneResult, ThermalBreakdownBTU,
  EnvelopeCheck, ComplianceStatus, PerformanceLevel,
} from '../types/thermal';
import {
  ZONAS_BIOCLIMATICAS, PAREDE_MATERIAIS, TELHADO_MATERIAIS,
  VIDRO_MATERIAIS, CARGA_PESSOA_W, CAPACIDADES_COMERCIAIS_BTU,
} from './presets';

export const WATT_TO_BTU = 3.41214;

/** CLTD paredes por orientação (NBR 16401 / Carrier) — extraído do original */
export const CLTD_PAREDE: Record<string, number> = { norte: 7, sul: 4, leste: 6, oeste: 14 };
/** SHGF vidro por orientação (W/m²) — extraído do original */
export const SHGF_VIDRO: Record<string, number> = { norte: 100, sul: 40, leste: 250, oeste: 340 };

/** Limites prescritivos de U máximo — NBR 15575-4:2021 (SVVIE) e -5:2021 (Cobertura), verão.
 * Valores conservadores para ZB quentes (7/8); zonas frias admitem U maior. */
const U_MAX_SVVIE: Record<number, number> = { 1: 3.7, 2: 3.4, 3: 3.0, 4: 2.9, 5: 2.5, 6: 2.5, 7: 2.2, 8: 2.2 };

function zoneDeltaT(zone: number): number {
  return ZONAS_BIOCLIMATICAS.find(z => z.id === zone)?.deltaT ?? 9;
}

/** Carga térmica de um ambiente (NBR 16401 — método CLTD simplificado). */
export function calculateZoneLoad(env: ThermalZoneInput): ZoneResult {
  const area = Math.max(0, env.area || 0);
  const volume = area * Math.max(0, env.height || 0);
  const deltaT = zoneDeltaT(env.zone);

  // 1. Infiltração / renovação de ar (0.5 ACH, ρ=1.225 kg/m³, cp=1006 J/kg·K)
  const infiltracaoW = ((volume * 0.5) / 3600) * 1.225 * 1006 * deltaT;

  // 2. Ocupantes
  const pessoasW = (env.occupants || 0) * (CARGA_PESSOA_W[env.activity] ?? 115);

  // 3. Iluminação
  const iluminacaoW = env.lightingWatts || 0;

  // 4. Equipamentos
  const equipW = (env.equipment || []).reduce((acc, eq) => acc + (eq.watts || 0) * (eq.qty || 1), 0);

  // 5. Cobertura (CLTD telhado = 15 K)
  let telhadoW = 0;
  if (env.hasRoof) {
    const mat = TELHADO_MATERIAIS[env.roofMaterialId];
    telhadoW = (mat?.uFactor ?? 2.0) * (env.roofArea || area) * 15;
  }

  // 6. Paredes externas
  const paredesW = (env.walls || []).reduce((acc, w) => {
    const mat = PAREDE_MATERIAIS[w.materialId];
    const cltd = CLTD_PAREDE[w.orientation] ?? 8;
    return acc + (mat?.uFactor ?? 2.9) * (w.area || 0) * cltd;
  }, 0);

  // 7. Vidros: condução + radiação solar
  let vidroCondW = 0, vidroSolarW = 0;
  for (const win of env.windows || []) {
    const mat = VIDRO_MATERIAIS[win.materialId];
    vidroCondW += (mat?.uFactor ?? 5.7) * (win.area || 0) * deltaT;
    vidroSolarW += (win.area || 0) * (SHGF_VIDRO[win.orientation] ?? 150) * (win.protection ?? 1.0);
  }

  const toBTU = (w: number) => Math.round(w * WATT_TO_BTU);
  const breakdown: ThermalBreakdownBTU = {
    infiltracao: toBTU(infiltracaoW),
    pessoas: toBTU(pessoasW),
    iluminacao: toBTU(iluminacaoW),
    equipamentos: toBTU(equipW),
    telhado: toBTU(telhadoW),
    paredes: toBTU(paredesW),
    janelas: toBTU(vidroCondW + vidroSolarW),
  };

  const total = Object.values(breakdown).reduce((a, b) => a + b, 0);
  const needed = total * 1.1; // margem normativa 10% (NBR 16401)
  const suggested = CAPACIDADES_COMERCIAIS_BTU.find(c => c >= needed);

  return {
    zoneId: env.id,
    name: env.name,
    breakdown,
    totalBTU: Math.round(total),
    totalWatts: Math.round(total / WATT_TO_BTU),
    suggestedCapacityBTU: suggested ?? Math.ceil(needed / 1000) * 1000,
    suggestedLabel: suggested
      ? `${suggested.toLocaleString('pt-BR')} BTU/h`
      : 'Superior a 60.000 BTU/h (Sistema VRF / Chiller recomendado)',
    estimatedPowerKW: Number(((total / 12000) * 1.1).toFixed(2)),
  };
}

/** Verificação prescritiva da envoltória (NBR 15575-4 SVVIE + -5 Cobertura). */
export function checkEnvelope(env: ThermalZoneInput): EnvelopeCheck[] {
  const checks: EnvelopeCheck[] = [];
  const uMax = U_MAX_SVVIE[env.zone] ?? 2.9;

  // Paredes: cada parede deve ter U ≤ U_max(ZB)
  for (const w of env.walls || []) {
    const mat = PAREDE_MATERIAIS[w.materialId];
    if (!mat) continue;
    checks.push({
      element: `Parede ${w.orientation} (${mat.name.split('(')[0].trim()})`,
      parameter: 'U',
      obtained: mat.uFactor,
      limit: uMax,
      status: (mat.uFactor <= uMax ? 'CONFORME' : 'NAO_CONFORME') as ComplianceStatus,
      reference: `NBR 15575-4:2021 — U máx. SVVIE ZB ${env.zone}`,
    });
  }

  // Cobertura
  if (env.hasRoof) {
    const mat = TELHADO_MATERIAIS[env.roofMaterialId];
    if (mat) {
      checks.push({
        element: `Cobertura (${mat.name.split('(')[0].trim()})`,
        parameter: 'U',
        obtained: mat.uFactor,
        limit: 2.3, // NBR 15575-5:2021, verão, faixa comum
        status: (mat.uFactor <= 2.3 ? 'CONFORME' : 'NAO_CONFORME') as ComplianceStatus,
        reference: 'NBR 15575-5:2021 — U máx. cobertura',
      });
    }
  }
  return checks;
}

/** Perfil horário 24h — fator de diversificação senoidal sobre carga de projeto. */
export function hourlyProfile24h(baseBTU: number): { hour: number; totalBTU: number }[] {
  return Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    totalBTU: Math.round(baseBTU * (0.55 + 0.45 * Math.sin(Math.max(0, ((h - 6) / 12)) * Math.PI))),
  }));
}

export type OverallVerdict = { status: ComplianceStatus; level: PerformanceLevel | null; reason: string };

/** Consolida conformidade: pior status vence. */
export function consolidate(checks: EnvelopeCheck[], target: PerformanceLevel): OverallVerdict {
  const nonConf = checks.filter(c => c.status === 'NAO_CONFORME');
  if (nonConf.length > 0) {
    return { status: 'NAO_CONFORME', level: null, reason: `${nonConf.length} elemento(s) reprovado(s): ${nonConf.map(c => c.element).join('; ')}` };
  }
  const atencao = checks.filter(c => c.status === 'ATENCAO');
  if (atencao.length > 0) {
    return { status: 'ATENCAO', level: 'MINIMO', reason: `Conforme nível Mínimo com ressalvas.` };
  }
  return { status: 'CONFORME', level: target, reason: `Todos os elementos conformes (nível ${target}).` };
}
