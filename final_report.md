# Thermal Compliance Suite — Relatório de Encerramento

**Data:** 2026-08-21 · **Stack:** React 18 + TypeScript strict + Vite 5 + Tailwind + Vitest + jsPDF + Supabase (schema)
**Local:** `D:/workspace-hermes/thermal-compliance-suite/`
**Motor de origem (reaproveitado, zero retrabalho):** `D:/Projetos/1.Autorais/TermalLoadCalculator/src/utils/hvacCalculations.ts` + `src/data/hvacPresets.ts`

---

## FASE 1 — Debate Adversarial (AGY gemini, papel: Reality Checker)

Submissão Hermes → auditoria AGY. Vereditos registrados:

| Decisão | Veredito AGY | Evidência-chave |
|---|---|---|
| Reaproveitar motor TS em Web Workers / rejeitar port Python | **APROVADA — mandatória** | Port introduz drift numérico IEEE 754 (V8 vs CPython): ΔTop ±0.3 °C pode inverter conformidade NBR 15575-4; custo infra R$0/tenant vs US$1.5–6k/mês em filas Celery; latência <250ms vs 1.5–8s; margem bruta 90–95% vs 60–70%. Ressalva: IP visível no client é aceitável pois as normas são públicas. |
| Dossiê PDF white-label como killer feature | **APROVADA com checklist estrito** | Estrutura jurídica exigida: QR + hash SHA-256 (antifraude pós-emissão, CDC art. 618), método prescritivo/simulação explícito, matriz U/FS vs limites ZB, bloco ART/RRT (Lei 5.194/66, Res. CONFEA 1.025/09, Lei 12.378/10, Res. CAU 91/14), cláusula de isenção por alteração de obra. Caixa/PBQP-H exige NBR 15575 para liberação de tranches. |
| Pular plugin Revit no MVP; CSV/JSON + presets | **100% CORRETA** | API Revit quebra por versão (.NET 4.8→8); >80% dos modelos BR sem parâmetros térmicos preenchidos geraria enxurrada de suporte; consultor quer controle, não adivinhação. |

## FASE 2 — Workspace & Schema

- ✅ `D:\workspace-hermes\thermal-compliance-suite` (legado Python/FastAPI obsoleto) **excluído**.
- ✅ Projeto recriado do zero em arquitetura web correta.
- ✅ `supabase/schema.sql`: 5 tabelas (`tenants`, `users`, `projects`, `zones`, `compliance_reports`), RLS por tenant via `current_tenant_id()`, reports append-only (trilha de auditoria), função pública `verify_dossier(hash)` para o QR Code.
- ✅ `src/types/thermal.ts`: contratos estritos (ZB 1–8, PerformanceLevel, EnvelopeCheck, TenantBranding).

## FASE 3 — Motor & Dossiê PDF

- `src/engine/presets.ts` — presets extraídos verbatim do projeto autoral (Zonas Bioclimáticas NBR 15220-3, materiais com Fator U, CLTD/SHGF por orientação).
- `src/engine/thermalEngine.ts` — carga térmica NBR 16401 (CLTD), verificação prescritiva NBR 15575-4/-5 (U máx SVVIE por ZB e cobertura), perfil 24h, consolidação de parecer.
- `src/engine/thermal.worker.ts` — execução fora da main thread (custo de computação = zero infra).
- `src/utils/dossierPDF.ts` — dossiê A4 nas 6 seções regulatórias validadas pelo AGY, com QR Code do hash SHA-256 e bloco ART/CREA/ICP-Brasil.
- `src/utils/dossier.ts` — hash WebCrypto, importador CSV com validação/clamping de trust boundary.

## FASE 4 — UI Industrial (Bento Grid, Slate/Cyan)

`ZoneManagerCard` (cadastro ágil + presets + import CSV) · `ComplianceGauge` (parecer Mínimo/Intermediário/Superior em tempo real) · `HourlyLoadChart` (SVG puro, zero deps) · `DossierReportModal` (preview + PDF/JSON). Branding white-label editável ao vivo (nome, cor, CREA, ART).

## FASE 5 — Crivo Triplo (evidências de execução real)

```
npx tsc --noEmit ................. EXIT 0 (0 erros, strict)
npx vitest run ................... 10/10 passed (1 file, 203ms)
npm run build .................... ✓ built in 6.41s
                                   worker compilado: thermal.worker-*.js (5.24 kB)
node tests/redteam.mjs ........... 11/11 vetores neutralizados:
  ├─ Bundle sem segredos (service_role/JWT/AIza) ......... ✅
  ├─ Worker contém NBR 16401 + NBR 15575 ................. ✅
  ├─ Hash via SHA-256 WebCrypto .......................... ✅
  ├─ Fuzzing CSV: 7/7 hostis bloqueados/sanitizados ...... ✅
  ├─ Zone clamp [1..8] .................................... ✅
  └─ Naive User: botão único → dossiê automático → PDF 1 clique ✅
```

## Comandos de Execução

```bash
cd D:/workspace-hermes/thermal-compliance-suite
npm install
npm run dev        # desenvolvimento → http://localhost:5173
npm test           # suíte unitária
npm run build      # produção (dist/)
node tests/redteam.mjs   # red team pós-build
```

Persistência opcional: aplicar `supabase/schema.sql` num projeto Supabase.

## Métricas de Conformidade

| Métrica | Meta | Obtido |
|---|---|---|
| Erros TypeScript strict | 0 | **0** |
| Testes unitários | 100% pass | **10/10 (100%)** |
| Build de produção | funcional | **✓ 6.41s** |
| Vulnerabilidades críticas (SAST estático) | 0 | **0** (sem segredos, sem eval, hash forte) |
| Cliques até o laudo | ≤3 | **2** (Analisar → Baixar PDF) |

## Entregáveis

```
thermal-compliance-suite/
├── src/types/thermal.ts          # contratos normativos estritos
├── src/engine/presets.ts         # NBR 15220-3 ZB 1-8 + catálogo envoltória
├── src/engine/thermalEngine.ts   # NBR 16401 + 15575-4/-5
├── src/engine/thermal.worker.ts  # Web Worker (custo zero)
├── src/utils/dossierPDF.ts       # dossiê white-label 6 seções + QR/hash
├── src/utils/dossier.ts          # SHA-256 + CSV import sanitizado
├── src/components/*              # Bento Grid industrial (4 cards)
├── supabase/schema.sql           # multi-tenant RLS append-only
├── tests/thermalEngine.test.ts   # 10 testes normativos
├── tests/redteam.mjs             # crivo de segurança pós-build
├── README.md / LICENSE (MIT)     # em inglês
└── final_report.md               # este relatório
```

→ Skipped: Supabase client runtime (auth/login UI) — schema pronto, conectar quando houver tenant piloto. Skipped: simulação dinâmica 8760h — prescritivo atende nível Mínimo/Intermediário; adicionar quando cliente pagar por Superior.
