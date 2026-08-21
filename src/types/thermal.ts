/**
 * Thermal Compliance Suite — Domain Contracts (strict typing)
 * Normas de referência: ABNT NBR 15575:2021 (Partes 1, 4, 5), NBR 15220-3, NBR 16401.
 */

export type Orientation = 'norte' | 'sul' | 'leste' | 'oeste';

export type BioclimaticZone = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

/** Níveis de desempenho normativo da NBR 15575-1:2021 */
export type PerformanceLevel = 'MINIMO' | 'INTERMEDIARIO' | 'SUPERIOR';

export type ComplianceStatus = 'CONFORME' | 'NAO_CONFORME' | 'ATENCAO';

export interface WallMaterial {
  id: string;
  name: string;
  /** W/(m²·K) */
  uFactor: number;
  description: string;
}

export interface RoofMaterial extends WallMaterial {}
export interface GlassMaterial extends WallMaterial {
  /** Fator solar do vidro (SHGC), adimensional */
  shgc?: number;
}

export interface Wall {
  id: string | number;
  area: number; // m²
  orientation: Orientation;
  materialId: string;
}

export interface WindowOpening {
  id: string | number;
  area: number; // m²
  orientation: Orientation;
  materialId: string;
  /** 1.0 = sem proteção; <1 com brise/persiana (NBR 15220) */
  protection: number;
}

export interface Equipment {
  id: string | number;
  name: string;
  watts: number;
  qty: number;
}

export type ActivityType =
  | 'residencial'
  | 'comercial_baixo'
  | 'comercial_alto'
  | 'cozinha';

/** Ambiente térmico (zona de cálculo) — entrada do motor */
export interface ThermalZoneInput {
  id: string;
  name: string;
  area: number; // m²
  height: number; // m
  occupants: number;
  activity: ActivityType;
  zone: BioclimaticZone;
  lightingWatts: number;
  hasRoof: boolean;
  roofMaterialId: string;
  roofArea: number; // m²
  walls: Wall[];
  windows: WindowOpening[];
  equipment: Equipment[];
}

export interface ThermalBreakdownBTU {
  infiltracao: number;
  pessoas: number;
  iluminacao: number;
  equipamentos: number;
  telhado: number;
  paredes: number;
  janelas: number;
}

/** Resultado por ambiente */
export interface ZoneResult {
  zoneId: string;
  name: string;
  breakdown: ThermalBreakdownBTU;
  totalBTU: number;
  totalWatts: number;
  /** BTU/h comercial sugerido (+10% margem normativa NBR 16401) */
  suggestedCapacityBTU: number;
  suggestedLabel: string;
  estimatedPowerKW: number;
}

/** Verificação prescritiva NBR 15575-4/5 (SVVIE e Cobertura) */
export interface EnvelopeCheck {
  element: string;
  parameter: 'U' | 'FS';
  obtained: number;
  limit: number;
  status: ComplianceStatus;
  reference: string;
}

export interface ProjectComplianceResult {
  projectId: string;
  projectName: string;
  bioclimaticZone: BioclimaticZone;
  method: 'PRESCRITIVO' | 'SIMULACAO_24H';
  targetLevel: PerformanceLevel;
  zones: ZoneResult[];
  envelopeChecks: EnvelopeCheck[];
  peakHour: number;
  hourlyProfile: { hour: number; totalBTU: number }[];
  overallStatus: ComplianceStatus;
  generatedAtISO: string;
  /** SHA-256 dos inputs+outputs para autenticação via QR Code */
  auditHash: string;
}

/** White-label branding do tenant */
export interface TenantBranding {
  organizationName: string;
  primaryColor: string;
  logoDataUrl?: string;
  responsibleName: string;
  professionalTitle: string;
  creaCauNumber: string;
  artRrtNumber: string;
}

export interface DossierProjectMeta {
  projectName: string;
  enterprise: string;
  address: string;
  typologyUH: string;
}
