/**
 * Utilitários: hash SHA-256 (WebCrypto), importação CSV/JSON, serialização.
 */
import type { ThermalZoneInput, ProjectComplianceResult, TenantBranding, DossierProjectMeta } from '../types/thermal';

/** SHA-256 hex de um objeto (inputs+outputs) — autenticação do dossiê. */
export async function sha256Of(obj: unknown): Promise<string> {
  const data = new TextEncoder().encode(JSON.stringify(obj));
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/** Importa zonas a partir de CSV: name,area,height,occupants,activity,zone,lightingWatts,hasRoof,roofMaterialId,roofArea */
export function parseZonesCSV(csv: string): ThermalZoneInput[] {
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length < 2) throw new Error('CSV vazio ou sem linhas de dados.');
  const header = lines[0].split(',').map(h => h.trim());
  const required = ['name', 'area', 'height', 'zone'];
  for (const col of required) {
    if (!header.includes(col)) throw new Error(`Coluna obrigatória ausente no CSV: "${col}"`);
  }
  return lines.slice(1).map((line, i) => {
    const cells = line.split(',').map(c => c.trim());
    const row: Record<string, string> = {};
    header.forEach((h, j) => { row[h] = cells[j] ?? ''; });
    const num = (k: string, d = 0) => { const v = parseFloat(row[k]); return Number.isFinite(v) ? v : d; };
    return {
      id: row.id || `csv-${i}`,
      name: row.name || `Zona ${i + 1}`,
      area: num('area'),
      height: num('height', 2.8),
      occupants: num('occupants'),
      activity: (row.activity as ThermalZoneInput['activity']) || 'residencial',
      zone: (Math.min(8, Math.max(1, num('zone', 3))) ) as ThermalZoneInput['zone'],
      lightingWatts: num('lightingWatts'),
      hasRoof: row.hasRoof === 'true' || row.hasRoof === '1' || num('hasRoof') === 1,
      roofMaterialId: row.roofMaterialId || 'laje_simples',
      roofArea: num('roofArea'),
      walls: [],
      windows: [],
      equipment: [],
    };
  });
}

/** Exporta resultado completo como JSON (download). */
export function exportResultJSON(result: ProjectComplianceResult): string {
  return JSON.stringify(result, null, 2);
}

/** Payload canônico para hash — ordem estável de chaves. */
export function canonicalPayload(
  meta: DossierProjectMeta,
  branding: TenantBranding,
  result: Omit<ProjectComplianceResult, 'auditHash' | 'generatedAtISO'>,
): object {
  return {
    project: meta,
    consultant: {
      name: branding.responsibleName,
      title: branding.professionalTitle,
      registry: branding.creaCauNumber,
      art: branding.artRrtNumber,
      org: branding.organizationName,
    },
    result,
  };
}
