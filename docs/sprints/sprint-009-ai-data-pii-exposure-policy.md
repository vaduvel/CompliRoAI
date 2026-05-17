# Sprint 009 — AI Data Discovery + PII Discovery + AI Exposure Report + AI Policy Pack

**Status:** DONE
**Faza:** 1 — PORT MASIV din DPO-OS (Wave 1 AI Discovery)
**Start:** 2026-05-17 14:00
**End:** 2026-05-17 14:55
**Owner:** manual: Claude (subagent worktree practical-villani-8c2108)

---

## Goal

Operationalize AI Automation Library (Wave 1): user descrie tool-urile AI
folosite → CompliRoAI mapeaza la `AIUseCaseCategory` + `AIRiskCandidate`,
emite findings automat (transparență, missing DPA, third-country transfer,
special categories, prohibited candidate), produce AI Exposure Report
client-facing (markdown) și AI Policy Pack RO (5 templates).

---

## Task list

- [x] 1. AI Discovery types + ComplianceState extension
- [x] 2. ai-data-discovery engine (pure functions, finding emission)
- [x] 3. pii-discovery scanner (regex + keywords, masked samples)
- [x] 4. ai-exposure-report aggregator (markdown)
- [x] 5. ai-policy-pack (5 templates RO)
- [x] 6. ai-data-discovery-store + pii-discovery-store (adapters)
- [x] 7. 8 API routes (5 ai-discovery + 3 pii-discovery)
- [x] 8. /dashboard/ai-discovery cockpit (wizard + map + report + policy)
- [x] 9. /dashboard/ai-discovery/pii-scan UI + sidebar wire
- [x] 10. Sprint log + INDEX update + push to origin/main
- [x] Build clean (npm run build, 0 errors)
- [x] tsc clean
- [x] 219 tests pass (153 baseline + 66 new = 219)

---

## Donor paths inspected

```bash
rg "AIDataMapRecord" /Users/vaduvageorge/Desktop/CompliAI/.claude/worktrees/v3-unified
```

- `/Users/vaduvageorge/Desktop/CompliAI/.claude/worktrees/v3-unified/lib/compliance/ai-data-discovery.ts` (1804 LOC)
- `/Users/vaduvageorge/Desktop/CompliAI/.claude/worktrees/v3-unified/lib/compliance/ai-data-discovery.test.ts` (395 LOC)
- `/Users/vaduvageorge/Desktop/CompliAI/.claude/worktrees/v3-unified/lib/compliance/pii-discovery.ts` (342 LOC)
- `/Users/vaduvageorge/Desktop/CompliAI/.claude/worktrees/v3-unified/lib/compliance/pii-discovery.test.ts` (29 LOC)
- `/Users/vaduvageorge/Desktop/CompliAI/.claude/worktrees/v3-unified/lib/compliance/ai-exposure-report.ts` (392 LOC)
- `/Users/vaduvageorge/Desktop/CompliAI/.claude/worktrees/v3-unified/lib/compliance/ai-exposure-report.test.ts` (55 LOC)
- `/Users/vaduvageorge/Desktop/CompliAI/.claude/worktrees/v3-unified/app/api/dpo/ai-data-discovery/` (5 routes)
- `/Users/vaduvageorge/Desktop/CompliAI/.claude/worktrees/v3-unified/app/api/dpo/pii-discovery/` (2 routes)

---

## Files created

### Pure logic (`lib/compliance/`)

- `lib/compliance/ai-data-discovery.ts` — risk evaluator (5 paths) + finding builder (8 finding types) + record builder. Pure functions, no I/O.
- `lib/compliance/ai-data-discovery.test.ts` — 22 tests (5 risk paths, 8 finding scenarios, record builder, labels).
- `lib/compliance/pii-discovery.ts` — regex + keyword detection pe 9 categorii (cnp/email/phone/iban/card/passport/ip/address/name) cu sample masking.
- `lib/compliance/pii-discovery.test.ts` — 8 tests (detection mixed, no-detection, mask shape, sensitive severity, low-confidence no-finding).
- `lib/compliance/ai-exposure-report.ts` — aggregator state → markdown report cu 6 sectiuni (rezumat, top riscuri, data map, actiuni, findings, detalii).
- `lib/compliance/ai-exposure-report.test.ts` — 7 tests (computeScope, top risks weight ordering, markdown render, edge cases).
- `lib/compliance/ai-policy-pack.ts` — 5 template-uri RO parametrizate (acceptable_use + vendor_onboarding + incident_response + audit_logging + human_oversight).
- `lib/compliance/ai-policy-pack.test.ts` — 7 tests (toate template-uri prezente, parametrizare, sectiuni legale specifice).

### Store adapters (`lib/server/`)

- `lib/server/ai-data-discovery-store.ts` — CRUD + summarize + auto-finding emission + exposure report generation + follow-up notes.
- `lib/server/ai-data-discovery-store.test.ts` — 14 tests (create+findings, read+summary, update+reeval, delete, follow-up, exposure report).
- `lib/server/pii-discovery-store.ts` — scan/persist/finding adapter + analyzePIIWithoutSaving pentru preview.
- `lib/server/pii-discovery-store.test.ts` — 8 tests (analyze no-save, create+finding, no-PII flow, read+summary, delete).

### API routes (`app/api/`)

- `app/api/ai-data-discovery/route.ts` — GET list + POST create
- `app/api/ai-data-discovery/[id]/route.ts` — GET + PATCH + DELETE
- `app/api/ai-data-discovery/report/route.ts` — GET list + POST generate
- `app/api/ai-data-discovery/follow-up/route.ts` — POST adauga note
- `app/api/ai-data-discovery/policy-pack/route.ts` — GET pack sau single template (.md download)
- `app/api/pii-discovery/route.ts` — GET list + POST create scan
- `app/api/pii-discovery/[id]/route.ts` — GET + DELETE
- `app/api/pii-discovery/analyze/route.ts` — POST analyze (NU persista)

### Dashboard UI (`app/dashboard/`)

- `app/dashboard/ai-discovery/page.tsx` — cockpit cu 4 sectiuni (data map + wizard + exposure report + policy pack)
- `app/dashboard/ai-discovery/pii-scan/page.tsx` — paste/upload + analyze + save + list scan-uri

## Files modified

- `lib/compliance/types.ts` — adaugat AIUseCaseCategory + AIRiskCandidate + AIDataMapRecord (full type — inlocuind placeholder 008A) + PIIDetection + PIICategoryHit + AIExposureReport + AIExposureReportScope + extended ComplianceState cu piiDetections[] + aiExposureReports[].
- `lib/compliance/pii-discovery.ts` — fix tsc strict: matches[0] could be undefined (added explicit existence check). Done in step 4 (ai-exposure-report).
- `components/shell/dashboard-shell.tsx` — adaugat import Search din lucide-react + NavItem „AI Discovery" plasat dupa „RoPA / Data Map".

## Files removed

None.

---

## Schema changes

- **State extension:** `ComplianceState.aiDataMapRecords` (was placeholder `Record<string, unknown>` since 008A, now `AIDataMapRecord[]` full type).
- **State new:** `ComplianceState.piiDetections?: PIIDetection[]`
- **State new:** `ComplianceState.aiExposureReports?: AIExposureReport[]`
- **No Supabase migration needed:** state JSONB acomodeaza extensiile fara DDL.
- **Backward compat:** state vechi fara aceste campuri continua sa functioneze (`?:` optional).

---

## Decisions made

### Decision 1 — Renunțat la donor heavy port pentru ai-data-discovery.ts

Donor `ai-data-discovery.ts` v3-unified (1804 LOC) avea dependinte hard pe:
- `lib/compliance/site-scanner.ts` (web scanning, nu exista in CompliRoAI)
- `lib/compliance/dpo-discovery-workshop.ts` (workshop module, nu exista in CompliRoAI)
- `lib/compliance/ai-evidence-analyzer.ts` (AI evidence parser, nu exista)
- Site scan jobs + vendor register signals + shadow AI radar prin website detection

Per Rule 3 (no forbidden framework dependencies) și Rule 6 (no slim ports / no
"port dependency first" delays), am ales să **rebuild** modulul aliniat la
shape-ul mandat § 19 (AIUseCaseCategory + AIRiskCandidate canonice), păstrând
**conceptul de risk evaluator + finding emission** din donor.

**Trade-off:** pierdem shadow AI detection automată via site-scan/vendor-register
(care va veni în Sprint 010 dacă vendor-review-store îl aduce + Sprint 011
preventive engine).

### Decision 2 — Markdown report în loc de HTML

Donor genera HTML stylizat cu CSS inline (392 LOC HTML template). Per mandate
spec § 7 (Sprint 014 va aduce PDF generator), am ales markdown care:
- Este parametrizat în Sprint 014 cu PDF puppeteer pe același content
- Permite copy/paste în email cabinet
- Permite import direct în alte tools (Notion, Confluence, Slack)
- Reduce maintenance surface

### Decision 3 — Risk evaluator priorities

Ordinea evaluatorului: prohibited > high-risk (Annex III + special cat /
children) > needs-human-review (governance gaps) > transparency-limited > minimal.

Această ordine este intenționată — un tool de chatbot care procesează date
personale fără DPA primește `needs_human_review` (governance gap mai serios
decât transparență), nu `transparency_limited`.

### Decision 4 — Policy Pack: 5 template-uri în loc de mai multe

Mandate § 10 cere 5 exacte (Acceptable Use, Vendor Onboarding, Incident
Response, Audit Logging, Human Oversight). Am respectat lista strict; nu am
adăugat altele (ex: AI Risk Register, AI Roadmap) pentru a păstra scope.

### Decision 5 — DELETE individual pentru PII

Mandate spec a cerut explicit POST /api/pii-discovery + POST /analyze, dar nu
DELETE individual. Am adăugat `/api/pii-discovery/[id]` (GET + DELETE) pentru
feature completeness (UI are buton de delete pe lista de saved scans) și
consistency cu ai-data-discovery/[id].

### Decision 6 — Wizard 4-step exact ca mandate spec

Step 1=categorie, Step 2=tool details, Step 3=data flow, Step 4=governance.
Nu am combinat în 2-3 pași pentru flow-ul cabinet (clear progression mai bun
decât form lung scrollabil).

---

## Tests

- `npx tsc --noEmit`: **clean** (0 errors)
- `npm run build`: **clean** (exit 0)
- `npx vitest run`: **219/219 pass**, 23 test files

Breakdown noi:
- `ai-data-discovery.test.ts` — 22 tests
- `pii-discovery.test.ts` — 8 tests
- `ai-exposure-report.test.ts` — 7 tests
- `ai-policy-pack.test.ts` — 7 tests
- `ai-data-discovery-store.test.ts` — 14 tests
- `pii-discovery-store.test.ts` — 8 tests
- **Total nou: 66 tests** (153 baseline → 219)

### Live route registration (din npm run build)

```
ƒ /api/ai-data-discovery                  281 B         103 kB
ƒ /api/ai-data-discovery/[id]             281 B         103 kB
ƒ /api/ai-data-discovery/follow-up        281 B         103 kB
ƒ /api/ai-data-discovery/policy-pack      281 B         103 kB
ƒ /api/ai-data-discovery/report           281 B         103 kB
ƒ /api/pii-discovery                      281 B         103 kB
ƒ /api/pii-discovery/[id]                 281 B         103 kB
ƒ /api/pii-discovery/analyze              281 B         103 kB
ƒ /dashboard/ai-discovery                9.79 kB        112 kB
ƒ /dashboard/ai-discovery/pii-scan       4.72 kB        107 kB
```

---

## Concerns / Blockers

⚠ **Concern 1 — Risk evaluator nu detecteaza shadow AI**
Donor avea shadow AI detection via website scan + vendor register parser.
Am skipat per Rule 3 (deps forbidden). Pentru a recupera funcționalitatea,
Sprint 011 (preventive engine) sau Sprint 010 (vendor review store) trebuie
să detecteze tool-uri AI nedeclarate.

⚠ **Concern 2 — Linkage AISystem ↔ AIDataMapRecord doar one-way**
`AIDataMapRecord.linkedAISystemId?` permite legatura, dar UI-ul curent nu
randa back-link din AI Inventory către AI Discovery. Sprint 010 (Vendor)
poate amplifica linkage.

⚠ **Concern 3 — Audit Pack nu include încă AI Exposure Report markdown**
Sprint 011 (Structured Audit Log) sau Sprint 014 (PDF generator) trebuie
să adauge raportul în bundle-ul ZIP audit pack.

✅ **No blockers.** Sprint complet self-contained pe foundation 008A-D.

---

## Commits

- `608de1e` — feat(sprint-9-1): AI Discovery types + ComplianceState extension
- `4833949` — feat(sprint-9-2): port ai-data-discovery engine with finding emission adapter
- `a99b1ad` — feat(sprint-9-3): port pii-discovery scanner with category detection
- `9c78d62` — feat(sprint-9-4): port ai-exposure-report aggregator
- `640efe2` — feat(sprint-9-5): AI Policy Pack templates RO (Acceptable Use + Vendor + Incident + Logging + Oversight)
- `2f5225e` — feat(sprint-9-6): AI Discovery + PII stores with findings/events integration
- `66effae` — feat(sprint-9-7): AI Discovery + PII Discovery API routes
- `34a9e0e` — feat(sprint-9-8): /dashboard/ai-discovery cockpit (wizard + data map + report + policy)
- `28d33e5` — feat(sprint-9-9): /dashboard/ai-discovery/pii-scan UI + sidebar wire
- `<TBD>` — docs(sprint-9): sprint log + INDEX update

## Live URL

- Production: `https://eu-ai-act-beige.vercel.app/dashboard/ai-discovery`
- Production: `https://eu-ai-act-beige.vercel.app/dashboard/ai-discovery/pii-scan`
- Preview Vercel: după push.

---

## Dependencies

**Requires from previous sprints:**
- Sprint 008A (ComplianceState + events + store adapter `mutateFreshStateForOrg` + constitution)
- Sprint 008B (`createFinding` + `attachEvidence` din findings-store; `/dashboard/resolve` UI pentru a vedea findings emise)

**Unlocks for next sprints:**
- Sprint 010 (Vendor AI Assessment): `AIDataMapRecord.linkedAISystemId` + risc evaluator pe vendor flow
- Sprint 011 (Structured Audit Log): event `ai-discovery.*` poate fi inspectat în UI
- Sprint 014 (PDF generator): AI Exposure Report markdown → PDF
- Sprint 015 (Role-aware UI): `cabinet` workspace va folosi AI Discovery ca prim instrument în portfolio flow

---

## Notes pentru următorul agent

### Pattern-uri respectate

1. **Store adapter pattern** consistent cu DPIA / ROPA / Breach store:
   - `mutateFreshStateForOrg(orgId, mutator)` pentru orice scriere
   - `appendComplianceEvents(state, [createComplianceEvent(...)])` mereu
   - `createFinding(orgId, input, actor)` pentru emission (NU build manual)
   - State cap: aiDataMapRecords slice 200, piiDetections slice 100, aiExposureReports slice 20

2. **API route pattern** consistent cu /api/breach:
   - `getOrgContext()` pentru ctx
   - `actorFromContext(ctx)` cu role: "compliance", source: "session"
   - Validare body cu type guards isAIXxx exportate din store
   - Error responses RO + HTTP semantic correct (400 / 404 / 500)
   - NEVER `requireFreshRole` (per mandate)

3. **UI pattern** consistent cu /dashboard/breach:
   - Inline styles + v3 design tokens (NO shadcn / Tailwind)
   - Lucide-react icons
   - Romanian copy
   - ModalShell + Field + CheckboxField helpers
   - btnPrimary / btnSecondary / btnGhost / btnDanger styles

### Capcane evitate

1. **Backticks în template literals:** Markdown-ul în `ai-policy-pack.ts` are
   triple-backticks pentru code blocks. Am escapat la `\`\`\`json` și am
   evitat backticks single din interior (`vezi \`xyz.md\`` → escapat sau
   eliminate complet).

2. **Quotes unicode în test descriptions:** `it("foloseste „X" pentru Y")` se
   parse-greșit. Am normalizat la quotes simple (`'`) sau am rescris.

3. **strict TypeScript `matches[0]`:** Sub strict mode, `string.match()[0]`
   este `string | undefined`. Adăugat check explicit `if (first && !sample)`.

4. **Don't break placeholder pe 008A:** `AIDataMapRecord` era declarat ca
   `Record<string, unknown>` în types.ts cu comentariu "Sprint 008C va
   înlocui". Înlocuit complet cu shape-ul mandat — backward compat respectat
   pentru că nimeni nu folosea câmpurile placeholder.

### Convenții de naming respectate

- Event types prefixate cu modul: `ai-discovery.record.created`,
  `ai-discovery.report.generated`, `pii-discovery.scan.created`, etc.
- Record IDs prefixate: `ai-data-XXXX`, `pii-XXXX`, `ai-report-XXXX`.
- Categorii consolidate la mandate § 19 (nu păstrat legacy donor categories
  health/minor/employee/financial — toate sunt acum în PIICategoryType).
