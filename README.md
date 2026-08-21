# Thermal Compliance Suite

**White-Label B2B SaaS for Brazilian thermal performance compliance — ABNT NBR 15575:2021 / NBR 16401 / NBR 15220-3.**

Turns a validated TypeScript thermal engineering engine into a multi-tenant platform where HVAC and building-performance consultancies generate legally-structured calculation dossiers (Memorial de Cálculo) under their own brand.

## Why it exists

Brazilian building code **NBR 15575:2021** requires documented thermal performance for habitable buildings. Non-compliance blocks financing (Caixa / PBQP-H), stalls municipal permits, and exposes developers to latent-defect litigation (CDC arts. 26–27; Civil Code art. 618). Consultants currently burn 20–40 h per project on manual modeling and report drafting in tools that cost USD 2.5k–4.5k/seat/year and still require hours of post-processing.

## Architecture (zero-compute-cost by design)

```
React SPA ──► Web Worker ──► Thermal Engine (pure TS, no runtime deps)
    │                              │
    │                              ├─ NBR 16401 CLTD load calc
    │                              ├─ NBR 15575-4/-5 prescriptive envelope checks
    │                              └─ 24h hourly profile
    ▼
jsPDF Dossier Generator (client-side)
    ├─ White-label header + brand color
    ├─ QR code → SHA-256 audit hash verification
    ├─ Compliance matrix + hourly balance
    └─ ART/CREA responsibility block
```

- **All computation runs client-side** in a Web Worker — infrastructure cost per tenant is zero; gross margin >90%.
- The engine is extracted from the author's field-proven `TermalLoadCalculator` project (no physics rewrite, no numeric drift).
- Multi-tenant isolation is enforced by **Supabase Row-Level Security** (`supabase/schema.sql`); the client holds no secrets.
- Audit trail: every dossier is hashed (SHA-256 via WebCrypto) and stored append-only; QR codes link to public hash verification.

## Getting started

```bash
npm install
npm run dev        # http://localhost:5173
```

### Production build & tests

```bash
npm run build      # tsc --noEmit && vite build
npm test           # Vitest unit suite (engine + CSV parser)
node tests/redteam.mjs   # bundle audit + hostile-input fuzzing (run after build)
```

### Database (optional — persistence layer)

Apply `supabase/schema.sql` to a Supabase project. It creates `tenants`, `users`, `projects`, `zones`, `compliance_reports` with RLS policies scoped to the authenticated tenant, plus a `verify_dossier(hash)` function for public QR-code validation.

## Usage flow (≤3 clicks)

1. **Add environments** manually or import a CSV:
   ```csv
   name,area,height,occupants,activity,zone,lightingWatts,hasRoof,roofMaterialId,roofArea
   Dormitorio 101,12,2.8,2,residencial,8,60,true,laje_simples,12
   ```
2. Click **Analisar Conformidade** — the worker computes loads, envelope checks, and the verdict.
3. In the dossier modal, click **Baixar Laudo PDF** (or export JSON).

## Dossier legal structure

Generated PDFs follow the regulatory checklist required by municipalities, Caixa/PBQP-H reviewers, and CREA/CAU:

1. Header with consultancy branding + SHA-256 verification QR
2. Bioclimatic zone framing (NBR 15220-3, ZB 1–8), method, target level
3. Envelope specification with U-value compliance matrix (NBR 15575-4/-5)
4. Calculation memory: per-zone thermal balance + commercial capacity (+10% margin)
5. Overall compliance verdict
6. Technical responsibility block (ART/RRT, ICP-Brasil signature line, liability clause)

## License

MIT — see [LICENSE](LICENSE).
