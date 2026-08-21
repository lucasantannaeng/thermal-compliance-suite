import { describe, it, expect } from 'vitest';
import { calculateZoneLoad, checkEnvelope, hourlyProfile24h, consolidate, CLTD_PAREDE } from '../src/engine/thermalEngine';
import { parseZonesCSV } from '../src/utils/dossier';
import type { ThermalZoneInput } from '../src/types/thermal';

const baseZone: ThermalZoneInput = {
  id: 'z1', name: 'Dormitório 101', area: 12, height: 2.8,
  occupants: 2, activity: 'residencial', zone: 8, lightingWatts: 60,
  hasRoof: true, roofMaterialId: 'laje_simples', roofArea: 12,
  walls: [{ id: 'w1', area: 10, orientation: 'oeste', materialId: 'alvenaria_leve' }],
  windows: [{ id: 'g1', area: 2, orientation: 'oeste', materialId: 'simples', protection: 1.0 }],
  equipment: [{ id: 'e1', name: 'TV', watts: 160, qty: 1 }],
};

describe('Motor NBR 16401 — calculateZoneLoad', () => {
  it('calcula carga positiva e breakdown somado ao total', () => {
    const r = calculateZoneLoad(baseZone);
    expect(r.totalBTU).toBeGreaterThan(0);
    const sum = Object.values(r.breakdown).reduce((a, b) => a + b, 0);
    expect(Math.round(sum)).toBe(r.totalBTU);
  });

  it('aplica margem normativa de 10% na capacidade sugerida', () => {
    const r = calculateZoneLoad(baseZone);
    expect(r.suggestedCapacityBTU).toBeGreaterThanOrEqual(r.totalBTU * 1.1 - 1);
  });

  it('zona fria (ZB1) gera menor ΔT de infiltração que zona quente (ZB8)', () => {
    const cold = calculateZoneLoad({ ...baseZone, zone: 1 });
    const hot = calculateZoneLoad(baseZone);
    expect(cold.breakdown.infiltracao).toBeLessThan(hot.breakdown.infiltracao);
  });

  it('CLTD oeste > sul (radiação solar vespertina)', () => {
    expect(CLTD_PAREDE.oeste).toBeGreaterThan(CLTD_PAREDE.sul);
  });

  it('sem cobertura → telhado = 0', () => {
    const r = calculateZoneLoad({ ...baseZone, hasRoof: false });
    expect(r.breakdown.telhado).toBe(0);
  });
});

describe('Verificação prescritiva NBR 15575-4/-5 — checkEnvelope', () => {
  it('alvenaria leve ZB8 (U=2.9 ≤ 2.2?) → NÃO CONFORME', () => {
    const checks = checkEnvelope(baseZone);
    expect(checks.some(c => c.status === 'NAO_CONFORME')).toBe(true);
  });

  it('drywall isolado ZB3 (U=0.7) → CONFORME em todos os elementos', () => {
    const z: ThermalZoneInput = {
      ...baseZone, zone: 3,
      walls: [{ id: 'w1', area: 10, orientation: 'norte', materialId: 'drywall_isolado' }],
      roofMaterialId: 'laje_isolada',
    };
    const checks = checkEnvelope(z);
    expect(checks.length).toBeGreaterThan(0);
    expect(checks.every(c => c.status === 'CONFORME')).toBe(true);
  });

  it('consolidate reprova quando há elemento não conforme', () => {
    const verdict = consolidate(
      [{ element: 'Parede oeste', parameter: 'U', obtained: 2.9, limit: 2.2, status: 'NAO_CONFORME', reference: 'NBR 15575-4' }],
      'MINIMO',
    );
    expect(verdict.status).toBe('NAO_CONFORME');
    expect(verdict.level).toBeNull();
  });
});

describe('Perfil horário e utilitários', () => {
  it('perfil 24h tem pico entre 12h e 16h', () => {
    const p = hourlyProfile24h(10000);
    expect(p).toHaveLength(24);
    const peak = p.reduce((a, b) => (b.totalBTU > a.totalBTU ? b : a));
    expect(peak.hour).toBeGreaterThanOrEqual(12);
    expect(peak.hour).toBeLessThanOrEqual(16);
  });

  it('parser CSV valida colunas obrigatórias e rejeita CSV inválido', () => {
    const csv = 'name,area,height,zone\nSala 1,20,2.8,3\nSala 2,15,2.8,8';
    const zones = parseZonesCSV(csv);
    expect(zones).toHaveLength(2);
    expect(zones[0].name).toBe('Sala 1');
    expect(() => parseZonesCSV('foo,bar\n1,2')).toThrow(/Coluna obrigatória/);
  });
});
