/**
 * Web Worker — executa o motor térmico fora da main thread (custo de infra ZERO).
 * Recebe { zones, targetLevel } → devolve ProjectComplianceResult (sem hash; hash é async no client).
 */
import { calculateZoneLoad, checkEnvelope, hourlyProfile24h } from '../engine/thermalEngine';
import type { ThermalZoneInput, PerformanceLevel } from '../types/thermal';

export interface EngineRequest {
  projectId: string;
  projectName: string;
  bioclimaticZone: ThermalZoneInput['zone'];
  targetLevel: PerformanceLevel;
  zones: ThermalZoneInput[];
}

self.onmessage = (e: MessageEvent<EngineRequest>) => {
  const req = e.data;
  const zoneResults = req.zones.map(calculateZoneLoad);
  const envelopeChecks = req.zones.flatMap(checkEnvelope);
  const peak = Math.max(...zoneResults.map(z => z.totalBTU), 0);

  self.postMessage({
    projectId: req.projectId,
    projectName: req.projectName,
    bioclimaticZone: req.bioclimaticZone,
    method: 'PRESCRITIVO',
    targetLevel: req.targetLevel,
    zones: zoneResults,
    envelopeChecks,
    peakHour: 15,
    hourlyProfile: hourlyProfile24h(peak),
    overallStatus: 'CONFORME', // consolidado no client via consolidate()
    generatedAtISO: new Date().toISOString(),
  });
};
