# Sprint 010 — Vendor AI Assessment + DPA Review

**Status:** DONE
**Faza:** 1 — PORT MASIV din DPO-OS (Wave 1 Vendor)
**Start:** 2026-05-17 15:00
**End:** 2026-05-17 15:35
**Owner:** manual: Claude (subagent worktree practical-villani-8c2108)

---

## Goal

Port Vendor AI Assessment + DPA Review ca modul matur GDPR/AI-vendor —
NU full NIS2 vendor management (per mandate Rule 3). Vendor record link la
AI systems / data flows; CompliRoAI tracks DPA status, training data rights,
subprocessor/transfer risk, security evidence, AI terms. Engine emite findings
(missing DPA, missing transfer review, missing AI terms, missing security
evidence, DPA expired, high-risk fara human review). Library prefill cu 17
vendori AI majori (OpenAI, Anthropic, Mistral, Microsoft, etc.) pentru intake
rapid in cabinet flow.

---

## Task list

- [x] 1. VendorRecord types + ComplianceState extension
- [x] 2. vendor-library.ts subset (17 vendori AI majori) + tests
- [x] 3. vendor-risk.ts (rebuild — donor NIS2-tied) + tests
- [x] 4. vendor-prefill.ts (rebuild — donor ANAF/eFactura-tied) + tests
- [x] 5. vendor-review-engine.ts (rebuild on VendorRecord shape) + tests
- [x] 6. vendor-review-lifecycle.ts (adapted la nextRevalidationISO) + tests
- [x] 7. vendor-review-store.ts adapter (CRUD + findings + events) + tests
- [x] 8. 4 API routes (route + [id] + brief + library)
- [x] 9. /dashboard/vendor-review UI cu library prefill + 9 sectiuni detail
- [x] 10. Sprint log + INDEX update + push origin/main
- [x] Build clean (npm run build, 0 errors)
- [x] tsc clean
- [x] 321 tests pass (219 baseline + 102 new = 321)

---

## Donor paths inspected

```bash
ls /Users/vaduvageorge/Desktop/CompliAI/.claude/worktrees/v3-unified/lib/server/vendor-review-store.ts
ls /Users/vaduvageorge/Desktop/CompliAI/.claude/worktrees/v3-unified/lib/compliance/vendor-review-engine.ts
ls /Users/vaduvageorge/Desktop/CompliAI/.claude/worktrees/v3-unified/lib/compliance/vendor-review-lifecycle.ts
ls /Users/vaduvageorge/Desktop/CompliAI/.claude/worktrees/v3-unified/lib/compliance/vendor-library.ts
ls /Users/vaduvageorge/Desktop/CompliAI/.claude/worktrees/v3-unified/lib/compliance/vendor-risk.ts
ls /Users/vaduvageorge/Desktop/CompliAI/.claude/worktrees/v3-unified/lib/compliance/vendor-prefill.ts
ls /Users/vaduvageorge/Desktop/CompliAI/.claude/worktrees/v3-unified/app/api/vendor-review/
ls /Users/vaduvageorge/Desktop/CompliAI/.claude/worktrees/v3-unified/app/dashboard/vendor-review/
```

Donor files inspected:
- `lib/server/vendor-review-store.ts` (86 LOC) — adaptive storage adapter
- `lib/compliance/vendor-review-engine.ts` (780 LOC) — 4-cazuri A/B/C/D engine
- `lib/compliance/vendor-review-lifecycle.ts` (99 LOC) — lifecycle helpers
- `lib/compliance/vendor-library.ts` (1195 LOC) — 70+ vendori SaaS RO general
- `lib/compliance/vendor-risk.ts` (99 LOC) — **NIS2-tied** (Nis2Vendor type)
- `lib/compliance/vendor-prefill.ts` (310 LOC) — **ANAF/eFactura-tied** (forbidden)
- `app/api/vendor-review/route.ts` + `[id]/route.ts` + `[id]/brief/route.ts`
- `app/dashboard/vendor-review/page.tsx` (1536 LOC) — heavy UI

---

## Files created

### Pure logic (`lib/compliance/`)

- `lib/compliance/vendor-library.ts` (660 LOC) — catalog 17 vendori AI cu
  metadata DPO-ready: legalEntity, knownDpaUrl, knownSubprocessors,
  defaultRiskLevel, defaultAITerms, productCatalog, complianceNote.
  Helpers: findVendorInLibrary, searchVendorLibrary, listVendorLibrary,
  listVendorCategories, buildVendorDraftFromLibrary.

- `lib/compliance/vendor-library.test.ts` (21 tests) — acoperire vendori
  mandate § 11 (OpenAI/Anthropic/Mistral/Microsoft/Google/Meta/Cohere/
  Bedrock/IBM/HF/ElevenLabs/Synthesia/Pinecone/Weaviate/Replicate/
  Stability), lookup case-insensitive, alias matching, draft builder cu
  transferRequired EU vs non-EU + humanReviewRequired auto pe risc high.

- `lib/compliance/vendor-risk.ts` (368 LOC) — risk evaluator pe shape
  VendorRecord (NU NIS2). evaluateVendorRisk(vendor, context) cu cascade
  critical > high > medium > low > minimal. buildVendorFindings produce
  7 candidate types cu stable IDs pentru dedupe.

- `lib/compliance/vendor-risk.test.ts` (18 tests) — DPA expired,
  non-EU+no-transfer+sensitive=critical, trains-no-optout=high, ISO
  missing=medium, fix transparency unknown=medium, finding emission
  cu stable IDs.

- `lib/compliance/vendor-prefill.ts` (180 LOC) — prefill din library +
  linkage automat la AI systems (vendor alias match) + AI data map
  records. suggestVendorsFromQuery pentru UI autocomplete.

- `lib/compliance/vendor-prefill.test.ts` (13 tests) — match exact/alias,
  linkage AI inventory + data map, EU vs non-EU transferRequired,
  alternativeMatches exclud match exact.

- `lib/compliance/vendor-review-engine.ts` (320 LOC) — evaluateVendorReview
  apeleaza vendor-risk + determineReviewStatus cu cascade rejected >
  expired > needs_dpa > needs_transfer_review > needs_security_review >
  approved > in_review. computeRevalidationISO: 3/6/9/12 luni in functie
  de risk. buildVendorReviewBrief genereaza markdown 9-sectiuni audit-ready.

- `lib/compliance/vendor-review-engine.test.ts` (16 tests) — 7 status
  determination, 4 risk+revalidation, 1 determineReviewStatus direct,
  4 brief generator scenarios.

- `lib/compliance/vendor-review-lifecycle.ts` (170 LOC) —
  buildVendorLifecycleSummary cu overdueRevalidation + dueSoonRevalidation
  + activeFollowUp + dpaExpired + dpaExpiringSoon + reminderNote RO.
  isVendorOverdue, isDPAExpired, isActiveReview helpers.

- `lib/compliance/vendor-review-lifecycle.test.ts` (19 tests) — 3 overdue
  scenarios, 3 DPA expired, 5 status active checks, 8 lifecycle summary
  cases inclusiv dueSoonDays override custom.

### Store adapter (`lib/server/`)

- `lib/server/vendor-review-store.ts` (560 LOC) — CRUD adapter consistent
  cu pattern DPIA/RoPA/Breach/AI Discovery. Functions: readVendorRecords,
  getVendorById, createVendor (cu auto risk eval + finding emission via
  createFinding + event ledger), updateVendor (cu re-eval), deleteVendor,
  approveVendor, rejectVendor, buildBrief. Type guards exportate
  (isVendorRegion, isVendorRole, isDPAStatus, isVendorTransferMechanism,
  isVendorReviewStatus) pentru API validation.

- `lib/server/vendor-review-store.test.ts` (15 tests) — create cu DPA
  missing + linked AI map → needs_dpa + findings, create EU + signed →
  low/minimal + in_review, read + summary, getVendorById null, update
  re-evaluates si demoteaza din needs_dpa cand DPA signed, approveVendor
  + rejectVendor + error handling, deleteVendor true/false, buildBrief
  markdown valid + null.

### API routes (`app/api/vendor-review/`)

- `app/api/vendor-review/route.ts` — GET (records + summary + lifecycle)
  + POST (create cu validare type guards)
- `app/api/vendor-review/[id]/route.ts` — GET single, PATCH (cu shortcuts
  action=approve/reject sau generic patch), DELETE
- `app/api/vendor-review/[id]/brief/route.ts` — GET ?format=md (JSON)
  sau ?format=download (Content-Disposition attachment .md)
- `app/api/vendor-review/library/route.ts` — GET catalog + ?q=search +
  ?prefill=<name> pentru draft cu linkage automat

### Dashboard UI

- `app/dashboard/vendor-review/page.tsx` (1530 LOC) — pagina mature cu:
  - Header + stats bar (Total/Aprobat/Necesita DPA/Risc ridicat)
  - Lifecycle reminder (cand exista probleme)
  - Filter tabs dinamic per reviewStatus cu count
  - Add vendor modal 2-step: library search → review draft prefilled
  - Vendor rows cu badge-uri (regiune flag + DPA + risk + status)
  - Expanded detail cu 9 sectiuni inline editable (identification, DPA,
    transfer, subprocesori, securitate 7 checkboxes, AI terms 5 fields,
    risc panel, linkage findings, note)
  - Actions bar: Aproba / Respinge / Descarca brief .md / Sterge

## Files modified

- `lib/compliance/types.ts` — adaugat tipuri Sprint 010:
  VendorRiskLevel, VendorReviewStatus, DPAStatus, VendorTransferMechanism,
  VendorRegion, VendorRole, VendorAITerms (cu sub-types), VendorSecurityEvidence,
  VendorRecord (full type). Extins ComplianceState cu vendorRecords?:
  VendorRecord[].
- `components/shell/dashboard-shell.tsx` — adaugat import Package din
  lucide-react + NavItem "Vendor AI" plasat dupa "AI Discovery" si
  inainte de "Role Assessment".
- `lib/compliance/vendor-review-engine.ts` (bugfix post-test) —
  determineReviewStatus demoteaza la in_review cand needs_* gap anterior
  s-a inchis (anterior, status sticky producea regresie la update).

## Files removed

None.

---

## Schema changes

- **State extension:** `ComplianceState.vendorRecords?: VendorRecord[]` (optional,
  backward compat).
- **No Supabase migration needed:** state JSONB acomodeaza extensiile fara DDL.
- **Backward compat:** state vechi fara campul vendorRecords continua sa
  functioneze (defaults la `[]` in store).

---

## Decisions made

### Decision 1 — Rebuild vendor-risk.ts in loc de port direct

Donor `vendor-risk.ts` (99 LOC) era tied de `Nis2Vendor` (NIS2 store). Per
mandate Rule 3 (no NIS2 full surface in CompliRoAI — Sprint 012 va aduce
AI-critical slice), am rebuild engine pe `VendorRecord` shape matur cu 5-tier
cascade (critical > high > medium > low > minimal) si 7 finding types stabile
pentru dedupe la re-evaluare.

### Decision 2 — Rebuild vendor-prefill.ts in loc de port direct

Donor `vendor-prefill.ts` (310 LOC) integra ANAF CUI lookup +
e-Factura supplier import — forbidden frameworks per Rule 3. Am rebuild
prefill pe directia LIBRARY catalog (search → match → draft) + linkage
automat la AI inventory + AI data map din state-ul org-ului.

### Decision 3 — Library subset 17 vendori (vs. 70+ in donor)

Donor `vendor-library.ts` (1195 LOC) acopera 70+ vendori inclusiv generic
SaaS (Mailchimp, Stripe, Shopify, telecom RO, accounting RO). Pastram doar
17 vendori AI majori (per mandate § 11): OpenAI, Anthropic, Microsoft
(Azure OpenAI + Copilot), Google Vertex/Gemini, Mistral, Meta Llama, Cohere,
AWS Bedrock, IBM watsonx, Hugging Face, Replicate, Stability AI, ElevenLabs,
Synthesia, Pinecone, Weaviate. Restul SaaS-urilor sunt out-of-scope (gestionate
prin AI Inventory pentru AI tools usage, sau in alte module).

### Decision 4 — Skipped vendor-review-engine donor (780 LOC)

Donor opera pe VendorReview wrapper cu 6-question context capture + 4
cazuri A/B/C/D + 1500+ LOC markdown templates. Am ales rebuild pe shape
VendorRecord direct (mature DPO-OS pattern) cu engine mai focusat: risk
+ status determination + brief generator. Cele 4 cazuri ABCD din donor
sunt acoperite implicit prin DPA/transfer/security gaps + risk evaluator
(care produce findings echivalente).

### Decision 5 — Markdown brief vs HTML

Donor genera assets ca HTML stylizate. Per mandate spec § 7 (Sprint 014 va
aduce PDF generator pe markdown), am ales markdown pentru brief generator:
parameterizat pentru PDF puppeteer pe acelasi content, copy/paste in email
cabinet, import Notion/Confluence.

### Decision 6 — Lifecycle adapted la nextRevalidationISO + dpaExpiresAtISO

Donor lifecycle (99 LOC) opera pe followUpDueISO + nextReviewDueISO din
VendorReview shape vechi. Adapted la VendorRecord cu nextRevalidationISO
(calculat din risk: critical=3m, high=6m, medium=9m, low/min=12m) +
dpaExpiresAtISO (separat, cu DPA expiring soon = 60 zile threshold).

### Decision 7 — UI 2-step modal: library search + review

Mandate cere library prefill cu OpenAI/Anthropic/etc. Am implementat
modal 2-step: (1) search/grid cu 17 vendori cu region flag + buton
"Adauga manual" pentru vendori out-of-library; (2) review form cu draft
prefilled, user editeaza inainte de save. Inline-editable in expanded
detail dupa save (dropdowns + checkboxes update via PATCH cu re-eval auto).

### Decision 8 — UI inline editing in loc de modal edit

Donor avea wizard separat de edit. Aici expanded detail e direct editable
cu dropdowns + checkboxes care apeleaza PATCH automat. Trade-off: mai
multe API calls pe modificare, dar UX mult mai fluent pentru cabinet
flow (DPO bifeaza ISO 27001 → finding-ul missing-security se inchide
automat la urmatorul read).

### Decision 9 — Status demotion bugfix in engine

Bug descoperit la test 14: dupa update DPA missing→signed, reviewStatus
stick-uia la "needs_dpa". Fixed prin demotion la "in_review" cand un
gap anterior nu mai e justificat in cascada determineReviewStatus.

---

## Tests

- `npx tsc --noEmit`: **clean** (0 errors)
- `npm run build`: **clean** (exit 0)
- `npx vitest run`: **321/321 pass**, 29 test files

Breakdown nou:
- `vendor-library.test.ts` — 21 tests
- `vendor-risk.test.ts` — 18 tests
- `vendor-prefill.test.ts` — 13 tests
- `vendor-review-engine.test.ts` — 16 tests
- `vendor-review-lifecycle.test.ts` — 19 tests
- `vendor-review-store.test.ts` — 15 tests
- **Total nou: 102 tests** (219 baseline → 321)

### Live route registration (din npm run build)

```
ƒ /api/vendor-review                     290 B         103 kB
ƒ /api/vendor-review/[id]                290 B         103 kB
ƒ /api/vendor-review/[id]/brief          290 B         103 kB
ƒ /api/vendor-review/library             290 B         103 kB
ƒ /dashboard/vendor-review                9 kB         111 kB
```

---

## Concerns / Blockers

WARN **Concern 1 — Cron revalidation NU portat (Sprint 022)**
Donor avea cron route pentru revalidari periodice (
app/api/cron/vendor-review-revalidation/route.ts). Per mandate sprint
limits (NU "wire later"), am port-at doar lifecycle logic (overdue
detection); cron actual wiring ramane pentru Sprint 022 (preventive
engine). UI afiseaza reminder note dar nu trimite notificari email.

WARN **Concern 2 — Finding dedupe la re-evaluare**
buildVendorFindings produce stable IDs (vendor-review-{vendorId}-{reason}),
dar findings-store.createFinding genereaza propriul id finding-XXX si NU
verifica stableId in metadata. Re-evaluarea la update poate dubla emit
gaps. Workaround pentru Sprint 010: emit findings doar la create initial;
update update-aza `linkedFindingIds` dar nu re-emite. Solution proper:
Sprint 011 (Structured Audit Log) extinde findings-store cu stableId
field pentru dedupe.

WARN **Concern 3 — Library 17 vendori, NU completa**
Catalog acopera top AI vendors LLM/voice/video/vector DB. Vendori out-of-
catalog (chatbot specialisti, internal LLMs, vendori custom) necesita
intrare manuala via "Adauga manual" button. Sprint 022 sau viitoare poate
extinde catalog cu user-suggested entries.

OK **No blockers.** Sprint complet self-contained pe foundation 008A-D + 009.

---

## Commits

- `6c2ed3d` — feat(sprint-10-1): VendorRecord types + ComplianceState extension
- `ab8aa77` — feat(sprint-10-2): vendor library — top 17 AI vendors catalog
- `8a8f9fc` — feat(sprint-10-3): vendor risk evaluator
- `fbc9dd0` — feat(sprint-10-4): vendor prefill from library catalog
- `614dcae` — feat(sprint-10-5): vendor-review-engine with finding emission adapter
- `95e5833` — feat(sprint-10-6): vendor-review-lifecycle (status workflow)
- `4a8a297` — feat(sprint-10-7): vendor-review-store adapter (CRUD + findings + events)
- `6e54399` — feat(sprint-10-8): vendor-review API routes (CRUD + brief + library)
- `c5b9c73` — feat(sprint-10-9): /dashboard/vendor-review cu library prefill + expand detail + risk panel
- `<TBD>` — docs(sprint-10): sprint log + INDEX update

## Live URL

- Production: `https://eu-ai-act-beige.vercel.app/dashboard/vendor-review`
- Preview Vercel: dupa push.

---

## Dependencies

**Requires from previous sprints:**
- Sprint 008A (ComplianceState + events + store adapter `mutateFreshStateForOrg`)
- Sprint 008B (`createFinding` + `attachEvidence` din findings-store)
- Sprint 009 (AIDataMapRecord pentru linkage automat + processesPersonalData
  propagation prin context)

**Unlocks for next sprints:**
- Sprint 011 (Structured Audit Log): event `vendor-review.*` poate fi
  inspectat in UI + finding dedupe via stableId
- Sprint 012 (NIS2 AI slice): vendor-review-engine poate extinde cu
  NIS2-critical flags pentru vendori AI in financial/critical infra
- Sprint 014 (PDF generator): vendor brief markdown → PDF
- Sprint 022 (Preventive engine): cron wiring pentru revalidari +
  email notificari DPO

---

## Notes pentru urmatorul agent

### Pattern-uri respectate

1. **Store adapter pattern** consistent cu DPIA / ROPA / Breach / AI
   Discovery store:
   - `mutateFreshStateForOrg(orgId, mutator)` pentru orice scriere
   - `appendComplianceEvents(state, [createComplianceEvent(...)])` mereu
   - `createFinding(orgId, input, actor)` pentru emission (NU build manual)
   - State cap 200 vendori

2. **API route pattern** consistent cu /api/breach + /api/ai-data-discovery:
   - `getOrgContext()` pentru ctx
   - `actorFromContext(ctx)` cu role: "compliance", source: "session"
   - Validare body cu type guards isVendorXxx exportate din store
   - Error responses RO + HTTP semantic corect (400/404/500)
   - Next.js 15 async params via `{ params: Promise<...> }`
   - NEVER `requireFreshRole` (per mandate)

3. **UI pattern** consistent cu /dashboard/breach + /dashboard/ai-discovery:
   - Inline styles + v3 design tokens (NO shadcn / Tailwind)
   - Lucide-react icons
   - Romanian copy strict
   - ModalShell + Field + Section + Checkbox helpers
   - btnPrimary / btnGhost / btnSuccess / btnDanger styles
   - Modal overlay click-to-close

### Capcane evitate

1. **vi.resetModules() in beforeEach** — interfera cu module state cache
   (test 1 creeaza AI data map prin module instance A, test 2 vendor prin
   module instance B → state cache pierdut). Fix: in loc, scriem fresh
   empty state in beforeEach via writeState(initialComplianceState).

2. **Dynamic imports in tests** — daca testul foloseste `await import(...)`
   dupa `vi.resetModules()`, primeste module instance fresh, dar
   top-level imports raman pe instance veche → state diferit. Fix: toate
   imports la top level.

3. **determineReviewStatus stickiness** — daca vendor anterior era
   needs_dpa si gap-ul se inchide (DPA signed), status sticky la needs_dpa.
   Fix: cascade demotion la in_review cand status anterior era needs_*
   dar nicio cascada activa nu il justifica.

4. **TypeScript strict pe Partial<VendorAITerms> indexing** — folosire
   `keyof VendorAITerms` cu `VendorAITerms[keyof VendorAITerms]` ca tip
   value, NU `unknown` (altfel UI cast-ul nu trece tsc).

### Conventii de naming respectate

- Event types prefixate: `vendor-review.created`, `vendor-review.updated`,
  `vendor-review.deleted`.
- Record IDs prefixate: `vendor-XXXX`.
- Finding stable IDs: `vendor-review-{vendorId}-{reason}` (missing-dpa,
  dpa-expired, missing-transfer, trains-no-optout, missing-security,
  ai-terms-gap, needs-review).

### Posibile imbunatatiri pentru Sprint 011+

- **Finding stable ID dedupe** in findings-store (Sprint 011): adauga
  optional `stableId` la CreateFindingInput; daca exista finding cu
  acelasi stableId, update in loc de create.
- **Linkage bidirectional**: VendorRecord linkat AI systems si AI data
  maps, dar back-link din AI Inventory catre Vendor lipseste in UI.
  Sprint 011 sau 015 poate adauga "Vendor: OpenAI" badge in AI Inventory.
- **Library extensii user-contributed** (Sprint 022): vendori salvati
  cu reviewStatus=approved + flag library_contribution=true pot fi
  oferit ca suggestii pentru alte org-uri (cabinet flow).
- **Brief export in audit pack** (Sprint 014): brief markdown ar trebui
  inclus automat in audit pack ZIP pentru fiecare vendor activ.
