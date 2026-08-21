/**
 * Gerador do Dossiê Técnico White-Label (Memorial de Cálculo NBR 15575:2021).
 * Estrutura conforme checklist regulatório validado no debate adversarial:
 * 1. Cabeçalho + autenticação (QR/hash) 2. Enquadramento climático 3. Envoltória
 * 4. Memória de cálculo + balanço horário 5. Matriz de conformidade 6. ART/CREA.
 */
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import type { ProjectComplianceResult, TenantBranding, DossierProjectMeta } from '../types/thermal';
import { ZONAS_BIOCLIMATICAS } from '../engine/presets';

export async function generateDossierPDF(
  meta: DossierProjectMeta,
  branding: TenantBranding,
  result: ProjectComplianceResult,
  verifyBaseUrl = 'https://verify.thermalcompliance.app',
): Promise<jsPDF> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const M = 15;
  let y = 0;
  const primary = hexToRgb(branding.primaryColor || '#0e7490');

  // ---------- 1. CABEÇALHO & AUTENTICAÇÃO ----------
  doc.setFillColor(primary.r, primary.g, primary.b);
  doc.rect(0, 0, W, 32, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(15);
  doc.text(branding.organizationName || 'Consultoria', M, 13);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
  doc.text('Memorial de Cálculo — Desempenho Térmico ABNT NBR 15575:2021', M, 21);
  doc.text(`Emitido em ${new Date(result.generatedAtISO).toLocaleString('pt-BR')}`, M, 27);

  // QR Code de validação (hash SHA-256)
  try {
    const qrDataUrl = await QRCode.toDataURL(`${verifyBaseUrl}/${result.auditHash}`, { margin: 0, width: 128 });
    doc.addImage(qrDataUrl, 'PNG', W - M - 20, 6, 20, 20);
    doc.setFontSize(6);
    doc.text('Validação: ' + result.auditHash.slice(0, 24) + '…', W - M - 34, 30, { align: 'right' });
  } catch { /* QR opcional em ambientes sem canvas */ }

  y = 42;
  doc.setTextColor(30, 30, 30);

  // Identificação do empreendimento
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
  sectionTitle(doc, '1. IDENTIFICAÇÃO DO EMPREENDIMENTO', M, y, primary); y += 7;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5);
  const idRows: [string, string][] = [
    ['Projeto', meta.projectName],
    ['Empreendimento', meta.enterprise || '—'],
    ['Endereço', meta.address || '—'],
    ['Tipologia da UH', meta.typologyUH || '—'],
  ];
  for (const [k, v] of idRows) { doc.text(`${k}: ${v}`, M, y); y += 5.5; }
  y += 3;

  // ---------- 2. ENQUADRAMENTO CLIMÁTICO E NORMATIVO ----------
  sectionTitle(doc, '2. ENQUADRAMENTO CLIMÁTICO E NORMATIVO', M, y, primary); y += 7;
  const zb = ZONAS_BIOCLIMATICAS.find(z => z.id === result.bioclimaticZone);
  doc.setFont('helvetica', 'normal');
  doc.text(`Zona Bioclimática: ZB ${result.bioclimaticZone} — ${zb?.nome ?? ''} (NBR 15220-3)`, M, y); y += 5.5;
  doc.text(`Método de avaliação: ${result.method === 'PRESCRITIVO' ? 'Simplificado / Prescritivo' : 'Simulação Computacional 24h'}`, M, y); y += 5.5;
  doc.text(`Nível de desempenho almejado: ${result.targetLevel}`, M, y); y += 9;

  // ---------- 3. DADOS DE ENTRADA (ENVOLTÓRIA) ----------
  sectionTitle(doc, '3. ESPECIFICAÇÃO DE ENVOLTÓRIA (DADOS DE ENTRADA)', M, y, primary); y += 7;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Elemento', M, y); doc.text('Parâm.', M + 78, y); doc.text('Obtido', M + 100, y); doc.text('Limite', M + 118, y); doc.text('Referência', M + 136, y);
  y += 2; doc.setDrawColor(200); doc.line(M, y, W - M, y); y += 5;
  doc.setFont('helvetica', 'normal');
  if (result.envelopeChecks.length === 0) {
    doc.text('Sem elementos externos informados (zona interna).', M, y); y += 6;
  }
  for (const c of result.envelopeChecks) {
    if (y > 250) { doc.addPage(); y = 20; }
    doc.text(truncate(c.element, 42), M, y);
    doc.text(c.parameter, M + 78, y);
    doc.text(String(c.obtained), M + 100, y);
    doc.text(String(c.limit), M + 118, y);
    doc.text(truncate(c.reference, 34), M + 136, y);
    doc.setTextColor(c.status === 'CONFORME' ? 16 : 185, c.status === 'CONFORME' ? 140 : 28, c.status === 'CONFORME' ? 28 : 28);
    doc.text(c.status === 'CONFORME' ? 'CONFORME' : 'NÃO CONF.', M + 172, y);
    doc.setTextColor(30, 30, 30);
    y += 5.5;
  }
  y += 4;

  // ---------- 4. MEMÓRIA DE CÁLCULO / BALANÇO TÉRMICO ----------
  sectionTitle(doc, '4. MEMÓRIA DE CÁLCULO — BALANÇO TÉRMICO POR AMBIENTE', M, y, primary); y += 7;
  doc.setFontSize(8.5);
  const cols = ['Ambiente', 'Infil.', 'Pessoas', 'Ilum.', 'Equip.', 'Telhado', 'Paredes', 'Vidros', 'TOTAL BTU/h'];
  const xs = [M, M + 40, M + 62, M + 84, M + 104, M + 126, M + 148, M + 168, M + 186];
  doc.setFont('helvetica', 'bold');
  cols.forEach((c, i) => doc.text(c, xs[i], y));
  y += 2; doc.setDrawColor(200); doc.line(M, y, W - M, y); y += 4.5;
  doc.setFont('helvetica', 'normal');
  for (const z of result.zones) {
    if (y > 255) { doc.addPage(); y = 20; }
    const b = z.breakdown;
    const row = [z.name, b.infiltracao, b.pessoas, b.iluminacao, b.equipamentos, b.telhado, b.paredes, b.janelas, z.totalBTU];
    row.forEach((v, i) => doc.text(typeof v === 'number' ? v.toLocaleString('pt-BR') : truncate(String(v), 22), xs[i], y));
    y += 5;
  }
  y += 2;
  doc.setFont('helvetica', 'bold');
  doc.text('Capacidade comercial sugerida (+10% NBR 16401):', M, y);
  doc.text(result.zones.map(z => `${z.name}: ${z.suggestedLabel}`).join('  |  ').slice(0, 110), M, y + 5);
  y += 14;

  // ---------- 5. MATRIZ DE CONFORMIDADE ----------
  sectionTitle(doc, '5. MATRIZ DE CONFORMIDADE NORMATIVA', M, y, primary); y += 7;
  doc.setFontSize(9.5); doc.setFont('helvetica', 'normal');
  const statusColor: Record<string, [number, number, number]> = {
    CONFORME: [16, 140, 28], NAO_CONFORME: [185, 28, 28], ATENCAO: [202, 138, 4],
  };
  const [r, g, b] = statusColor[result.overallStatus] ?? [30, 30, 30];
  doc.setFillColor(r, g, b);
  doc.rect(M, y - 4, W - 2 * M, 10, 'F');
  doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold');
  doc.text(`PARECER: ${result.overallStatus}${result.overallStatus === 'CONFORME' ? ` — Nível ${result.targetLevel}` : ''}`, M + 3, y + 2.5);
  doc.setTextColor(30, 30, 30); doc.setFont('helvetica', 'normal');
  y += 12;
  doc.text(`Fundamentação: ${result.overallStatus === 'CONFORME'
    ? 'Elementos de envoltória atendem aos limites prescritivos da NBR 15575-4/-5:2021 para a ZB informada.'
    : 'Reprovado nos limites prescritivos da NBR 15575-4/-5:2021. Ver matriz na Seção 3.'}`, M, y, { maxWidth: W - 2 * M });
  y += 16;

  // ---------- 6. RESPONSABILIDADE TÉCNICA (ART/CREA) ----------
  if (y > 230) { doc.addPage(); y = 20; }
  sectionTitle(doc, '6. RESPONSABILIDADE TÉCNICA', M, y, primary); y += 8;
  doc.setFontSize(9.5);
  doc.text(`Responsável Técnico: ${branding.responsibleName}`, M, y); y += 5.5;
  doc.text(`Formação: ${branding.professionalTitle}`, M, y); y += 5.5;
  doc.text(`Registro CREA/CAU: ${branding.creaCauNumber}`, M, y); y += 5.5;
  doc.text(`ART/RRT nº: ${branding.artRrtNumber || '(a vincular)'}`, M, y); y += 5.5;
  y += 6;
  doc.setFontSize(8);
  doc.text('Cláusula de isenção: este memorial reflete os dados de entrada declarados na data de emissão. Alterações em obra', M, y); y += 4;
  doc.text('invalidam o parecer (CDC arts. 26-27; CC art. 618 — vício oculto, responsabilidade quinquenal).', M, y); y += 12;
  doc.setDrawColor(120); doc.line(M, y, M + 70, y);
  doc.setFontSize(8.5);
  doc.text('Assinatura digital ICP-Brasil / Gov.br', M, y + 4);

  return doc;
}

function sectionTitle(doc: jsPDF, title: string, x: number, y: number, c: { r: number; g: number; b: number }) {
  doc.setFillColor(c.r, c.g, c.b);
  doc.rect(x - 2, y - 4.5, 2.2, 6, 'F');
  doc.setTextColor(30, 30, 30);
  doc.text(title, x + 3, y);
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return m ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) } : { r: 14, g: 116, b: 144 };
}
