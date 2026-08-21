/**
 * Presets normativos — extraídos do projeto autoral TermalLoadCalculator
 * (D:/Projetos/1.Autorais/TermalLoadCalculator/src/data/hvacPresets.ts)
 * Zonas Bioclimáticas ABNT NBR 15220-3 (ZB 1–8) + catálogo de envoltória.
 */
import type { WallMaterial, BioclimaticZone } from '../types/thermal';

export interface BioclimaticZoneData {
  id: BioclimaticZone;
  nome: string;
  cidades: string[];
  deltaT: number; // °C — ΔT de projeto NBR 16401
  umidadeRelativaMedia: number; // %
}

export const ZONAS_BIOCLIMATICAS: BioclimaticZoneData[] = [
  { id: 1, nome: 'Zona 1 (Frio / Sul)', cidades: ['Curitiba/PR', 'Caxias do Sul/RS', 'Lages/SC', 'Ponta Grossa/PR'], deltaT: 8, umidadeRelativaMedia: 78 },
  { id: 2, nome: 'Zona 2 (Subtropical Ameno)', cidades: ['Florianópolis/SC', 'Porto Alegre/RS'], deltaT: 10, umidadeRelativaMedia: 75 },
  { id: 3, nome: 'Zona 3 (Planalto Central Ameno)', cidades: ['São Paulo/SP', 'Belo Horizonte/MG', 'Campinas/SP', 'Juiz de Fora/MG'], deltaT: 9, umidadeRelativaMedia: 70 },
  { id: 4, nome: 'Zona 4 (Cerrado / Planalto)', cidades: ['Brasília/DF', 'Goiânia/GO', 'Montes Claros/MG', 'Anápolis/GO'], deltaT: 10, umidadeRelativaMedia: 60 },
  { id: 5, nome: 'Zona 5 (Quente e Seco / Centro-Oeste)', cidades: ['Cuiabá/MT', 'Campo Grande/MS', 'Corumbá/MS', 'Rondonópolis/MT'], deltaT: 12, umidadeRelativaMedia: 55 },
  { id: 6, nome: 'Zona 6 (Nordeste Semiárido)', cidades: ['Feira de Santana/BA', 'Petrolina/PE', 'Juazeiro do Norte/CE'], deltaT: 9, umidadeRelativaMedia: 65 },
  { id: 7, nome: 'Zona 7 (Norte/Nordeste Quente)', cidades: ['Teresina/PI', 'João Pessoa/PB'], deltaT: 12, umidadeRelativaMedia: 70 },
  { id: 8, nome: 'Zona 8 (Equatorial Úmido)', cidades: ['Manaus/AM', 'Belém/PA', 'Rio de Janeiro/RJ', 'Salvador/BA', 'Fortaleza/CE', 'Recife/PE', 'Natal/RN', 'Maceió/AL'], deltaT: 11, umidadeRelativaMedia: 85 },
];

export const PAREDE_MATERIAIS: Record<string, WallMaterial> = {
  alvenaria_leve: { id: 'alvenaria_leve', name: 'Alvenaria Tijolo Baiano (6 furos - 10cm)', uFactor: 2.9, description: 'Tijolo cerâmico furado sem isolamento adicional' },
  alvenaria_pesada: { id: 'alvenaria_pesada', name: 'Alvenaria Tijolo Maciço / Bloco Concreto (20cm)', uFactor: 1.7, description: 'Alvenaria de alta capacidade térmica' },
  drywall_isolado: { id: 'drywall_isolado', name: 'Drywall com Lã de Rocha / Lã de Vidro (50mm)', uFactor: 0.7, description: 'Gesso acartonado com isolamento térmico e acústico' },
};

export const TELHADO_MATERIAIS: Record<string, WallMaterial> = {
  laje_simples: { id: 'laje_simples', name: 'Laje de Concreto Simples (Sem Forro)', uFactor: 3.5, description: 'Concreto armado sem isolamento adicional' },
  laje_isolada: { id: 'laje_isolada', name: 'Laje de Concreto com EPS / PIR Isolante', uFactor: 0.8, description: 'Laje com camada de EPS de 50mm' },
  telha_fibro: { id: 'telha_fibro', name: 'Telha de Fibrocimento Simples', uFactor: 4.5, description: 'Alta transmitância térmica direta' },
  telha_ceram_forro: { id: 'telha_ceram_forro', name: 'Telha Cerâmica com Forro de Gesso / Madeira', uFactor: 2.5, description: 'Cobertura residencial tradicional' },
  telhado_verde: { id: 'telhado_verde', name: 'Telhado Verde Extensivo (Vegetado)', uFactor: 1.5, description: 'Substrato vegetal com amortecimento de picos solares' },
};

export const VIDRO_MATERIAIS: Record<string, WallMaterial> = {
  simples: { id: 'simples', name: 'Vidro Simples Transparente (4mm a 6mm)', uFactor: 5.7, description: 'Janelas e portas convencionais' },
  duplo: { id: 'duplo', name: 'Vidro Duplo Insulado (6+12+6mm)', uFactor: 2.8, description: 'Vidro insulado com câmara de argônio/ar seco' },
};

export const CARGA_PESSOA_W: Record<string, number> = {
  residencial: 115,
  comercial_baixo: 130,
  comercial_alto: 150,
  cozinha: 130,
};

/** Capacidades comerciais BTU/h (split/VRF mercado BR) */
export const CAPACIDADES_COMERCIAIS_BTU = [7500, 9000, 12000, 18000, 22000, 24000, 30000, 36000, 48000, 60000];
