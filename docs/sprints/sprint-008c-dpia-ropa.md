# Sprint 008C — DPIA + RoPA (port DPO-OS pe fundatie 008A/B)

**Status:** DONE
**Faza:** 1 (PORT MASIV DPO-OS)
**Start:** 2026-05-17 13:08
**End:** 2026-05-17 13:46
**Owner:** manual: Claude

---

## Goal (1 propoziție)

Portez DPIA (GDPR Art. 35-36) + RoPA (Art. 30) ca workflow-uri GDPR mature
conectate la findings cockpit, ledger evenimente, org knowledge, discovery
triggers și Audit Pack — fiecare modul emite ScanFinding automat în
`/dashboard/resolve` (Sprint 008B) și fiecare RoPA evaluation propagă
findings + knowledge + triggers în state cu hash-chain audit trail.

---

## Task list

- [x] Port `lib/compliance/dpia-schema.ts` cu rebrand id (compliroai-) + finding emission adapter
- [x] Port `lib/compliance/dpia-schema.test.ts` (7 scenarii: low/AI/critical/automated-only/special+largeScale/markdown)
- [x] Build `lib/server/dpia-store.ts` (CRUD + createDpiaFromScreening + markExported + markdown export builder)
- [x] Test `lib/server/dpia-store.test.ts` (13 teste: CRUD + screening + finding wire + summary + markdown)
- [x] API `app/api/dpia/route.ts` (GET list + POST create)
- [x] API `app/api/dpia/[id]/route.ts` (GET + PATCH + DELETE)
- [x] API `app/api/dpia/screening/route.ts` (GET schema + POST evaluate / save?)
- [x] API `app/api/dpia/[id]/export/route.ts` (markdown export + dpia.exported event)
- [x] Page `app/dashboard/dpia/page.tsx` (wizard 3-pasi + records list + filter tabs + detail expand)
- [x] Port `lib/compliance/ropa-risk-engine.ts` (rebrand schema URI, +linkedAISystemIds field)
- [x] Port `lib/compliance/ropa-risk-engine.test.ts` (7 scenarii)
- [x] Test `lib/compliance/ropa-machine-readable.test.ts` (3 scenarii export schema)
- [x] types.ts: replace `RopaActivityRecord` placeholder cu shape concret
- [x] Wire `discovery-trigger-orchestrator.collectDiscoveryTriggers` cu ROPA source
- [x] Update `discovery-trigger-orchestrator.test.ts` (2 teste noi: ropa-wired + accepted)
- [x] Build `lib/server/ropa-store.ts` (CRUD + propagate findings/knowledge/triggers + machine-readable/markdown export)
- [x] Test `lib/server/ropa-store.test.ts` (12 teste)
- [x] API `app/api/ropa/route.ts` (GET + POST single + PUT bulk upsert)
- [x] API `app/api/ropa/[id]/route.ts` (GET + PATCH + DELETE)
- [x] API `app/api/ropa/export/route.ts` (JSON v1 + Markdown)
- [x] Page `app/dashboard/ropa/page.tsx` (table sortable risk + edit modal + bulk import TSV/CSV + triggers banner)
- [x] Wire sidebar nav (DPIA + RoPA visible all workspace modes)
- [x] `npx tsc --noEmit` clean (după fiecare commit)
- [x] `npm run build` clean (7 rute API noi + 2 dashboard pages registered)
- [x] `npx vitest run` 118/118 pass (era 74; +44 noi distribuite în 4 fișiere)
- [x] Sprint log scris
- [x] INDEX.md actualizat
- [x] Push pe `main` (după fiecare commit)
- [ ] Live verify pe `eu-ai-act-beige.vercel.app` (manual, după push)

---

## Files created

### DPIA
- `lib/compliance/dpia-schema.ts` (338 LOC) — port donor cu rebrand id `compliroai-dpia-screening`, schema versionata `2026.05.ro.v1`, 11 intrebari Art. 35 (specialCategories, largeScale, vulnerableDataSubjects, systematicMonitoring, profilingOrScoring, automatedDecision, newTechnologyOrAI, thirdCountryTransfer, securityMeasures, retentionKnown + 1 implicit boost), `evaluateDpiaScreening()` returneaza risk score 0-100, risk level (low/medium/high/critical), `requiresFullDpia` flag, markdown export + `candidateFinding` ready pentru `createFinding()`.
- `lib/compliance/dpia-schema.test.ts` — 7 scenarii noi.
- `lib/server/dpia-store.ts` (550 LOC) — CRUD complet, `createDpiaFromScreening()` cu optional finding emission (`acceptFinding=true` → apel `createFinding` din findings-store, link via `linkedFindingId`), `markDpiaExported`, `buildDpiaMarkdownForRecord()` cu screening extras.
- `lib/server/dpia-store.test.ts` — 13 teste integration cu state real (mocks org-context + fs).
- `app/api/dpia/route.ts` — GET list + POST create.
- `app/api/dpia/[id]/route.ts` — GET + PATCH + DELETE.
- `app/api/dpia/screening/route.ts` — GET schema + POST evaluate + POST?save=1.
- `app/api/dpia/[id]/export/route.ts` — markdown export + dpia.exported event.
- `app/dashboard/dpia/page.tsx` — wizard 3-pasi (context proces / 11 questions / rezultat + acceptFinding checkbox), records list cu filter tabs, expand inline cu factors + risks + mitigations + screening reasons + finding link card + status transitions + export markdown + delete.

### RoPA
- `lib/compliance/ropa-risk-engine.ts` (715 LOC) — port donor verbatim cu rebrand schema URI (`compliroai.ro/schemas/ropa-data-map.v1.json`) si camp nou `linkedAISystemIds` pentru bidirectional AI-system links. `evaluateRopaDataMap()` returneaza activities enriched + activityRisks + knowledgeItems + candidateFindings + triggers + summary. `buildRopaMachineReadableExport()` JSON v1 pentru Audit Pack.
- `lib/compliance/ropa-risk-engine.test.ts` — 7 scenarii (empty / medical + CNP + DPIA / processors vendor review / transfer no mechanism / missing legal basis + retention dedupe / AI DPIA trigger / inferred special categories).
- `lib/compliance/ropa-machine-readable.test.ts` — 3 teste (schema versioning, empty, avg risk).
- `lib/server/ropa-store.ts` (570 LOC) — CRUD activities + `propagateRopaEvaluation` re-rulează engine după fiecare scriere și: (1) emite ScanFinding GDPR via `createFinding` cu dedupe pe id stabil, (2) merge knowledge items via `mergeKnowledgeItems`, (3) orchestrate discovery triggers via `collectDiscoveryTriggers` wired cu ROPA source, (4) emite event `ropa.evaluated`. Plus `buildMachineReadableForOrg()` JSON + `buildMarkdownForOrg()` pentru Audit Pack.
- `lib/server/ropa-store.test.ts` — 12 teste integration.
- `app/api/ropa/route.ts` — GET + POST single + PUT bulk upsert.
- `app/api/ropa/[id]/route.ts` — GET + PATCH + DELETE.
- `app/api/ropa/export/route.ts` — JSON v1 + Markdown (?format=md).
- `app/dashboard/ropa/page.tsx` — SummaryStats (8 metrici), TriggersBanner cu link cockpit, risk filter pills (all/high/medium/low), export JSON/MD/import buttons, ActivityTable sortable by risk (high→low pe rank, then score) cu badges (risk + status + special-cats + missing-temei/retentie + AI systems count + dept), expand inline cu full detail + finding link card + edit/delete actions, EditModal cu toate fieldurile Art. 30(1) + linkedAISystemIds + multi-row third-country transfers, ImportModal TSV/CSV paste cu header recognition (ro+en), pre-procesare cu count + bulk PUT.

### Docs
- `docs/sprints/sprint-008c-dpia-ropa.md` — acest log.

## Files modified

- `lib/compliance/types.ts` — replace `RopaActivityRecord = Record<string, unknown>` placeholder cu shape concret (id, activityName, purpose, dataSubjects, dataCategories, specialCategories, legalBasis, article9Condition, recipients, processors, systems, thirdCountryTransfers, retentionRule, securityMeasures, source, confidence, status, linkedFindings, linkedEvidence, **linkedAISystemIds (NOU)**, timestamps, riskLevel/score/reasons). Tot acolo: RopaActivitySource/Confidence/Status/RiskLevel/ThirdCountryTransfer exportate.
- `lib/compliance/discovery-trigger-orchestrator.ts` — `collectDiscoveryTriggers()` rescris: NU mai e stub. Acum acceptă `ropaActivities?: RopaActivityRecord[]`, ruleaza `evaluateRopaDataMap`, transforma `RopaDataMapTriggerCandidate[]` în `DiscoveryTriggerRecord[]` (cu SLA, ownerRole=dpo/it, dueAtISO, severity, evidenceRequired). Workshop source ramane stub pana cand `dpo-discovery-workshop` e portat în sprint ulterior.
- `lib/compliance/discovery-trigger-orchestrator.test.ts` — 2 teste noi (collectDiscoveryTriggers cu ropaActivities materializează trigger-uri + accepted=true promovează status).
- `components/shell/dashboard-shell.tsx` — adăugat 2 NavItem-uri (DPIA cu ClipboardCheck 15, RoPA / Data Map cu Database 15) între "DSAR (GDPR)" și "Role Assessment", visible pentru toate workspace mode-urile.
- `docs/sprints/INDEX.md` — Sprint 008C → DONE cu commit hash 2bff11f.

## Files removed

- — (nimic)

---

## Schema changes

- **Supabase:** nimic. Folosim `org_state JSONB` existent.
- **State extension:**
  - `state.dpiaRecords[]` — populat real în Sprint 008C (types existente din 008A); shape extins cu `linkedFindingId`, `screeningSchemaVersion`, `screeningRiskScore`, `screeningRiskLevel`, `screeningReasons`, `screeningMissingEvidence`, `screeningGeneratedMarkdown` (toate optionale, backward-compatible).
  - `state.ropaActivities[]` — placeholder înlocuit cu type real `RopaActivityRecord` (din types.ts); câmpuri optionale noi `linkedAISystemIds[]` + `riskLevel`/`riskScore`/`riskReasons` (calculate de engine, persistate la save).
  - `state.orgKnowledge.items` — îmbogățit la fiecare scriere RoPA cu data-categories, vendors, retention-rules etc. (Multiplicator B).
  - `state.discoveryTriggers[]` — populat de RoPA orchestrator (înainte era doar stub).

---

## Tests

- `npx tsc --noEmit`: **clean (0 errors)** după fiecare din cele 9 commits.
- `npm run build`: **clean**, 7 rute API noi + 2 dashboard pages registered:
  - `ƒ /api/dpia               250 B`
  - `ƒ /api/dpia/[id]          250 B`
  - `ƒ /api/dpia/[id]/export   250 B`
  - `ƒ /api/dpia/screening     250 B`
  - `ƒ /api/ropa               250 B`
  - `ƒ /api/ropa/[id]          250 B`
  - `ƒ /api/ropa/export        250 B`
  - `ƒ /dashboard/dpia       7.32 kB`
  - `ƒ /dashboard/ropa        8.4 kB`
- `npx vitest run`: **118/118 pass** (era 74; +44 noi).
  - `dpia-schema.test.ts` — 7 noi
  - `dpia-store.test.ts` — 13 noi
  - `ropa-risk-engine.test.ts` — 7 noi
  - `ropa-machine-readable.test.ts` — 3 noi
  - `ropa-store.test.ts` — 12 noi
  - `discovery-trigger-orchestrator.test.ts` — 2 noi (collectDiscoveryTriggers cu ropa wired + accepted flag)
- Live test: pending după push (manual click-through).

---

## Decisions made

- **Decision A — DPIA finding-emission via findings-store, NU duplicare ledger.** `createDpiaFromScreening(orgId, input, actor, {acceptFinding: true})` apelează `createFinding()` din findings-store înainte de a scrie record-ul DPIA. ID-ul real al finding-ului (cu prefix `finding-`) e legat pe DPIA record prin `linkedFindingId`. Avantaje: (1) un singur punct de emitere finding-uri, (2) lifecycle complet (confirm/dismiss/resolve/monitor) prin cockpit, (3) audit trail unificat hash-chain. Engine donor returna doar un `candidateFinding` cu id stabil (`dpia-{slug}`) ne-persistat; CompliRoAI persistă în state cu id real.

- **Decision B — `RopaActivityRecord` migrat din opaque placeholder în types.ts.** Sprint 008A păstra `Record<string, unknown>` ca placeholder. În 008C înlocuit cu shape concret (în types.ts ca să poată fi referențiat de ComplianceState fără dep ciclică cu engine). Adăugat câmp nou `linkedAISystemIds[]` pentru bidirectional link cu state.aiSystems (vor fi populate manual sau via Sprint 009 AI Data Discovery).

- **Decision C — `propagateRopaEvaluation` re-rulează engine la fiecare write CRUD.** Pentru fiecare create/update/delete/bulk-upsert pe RoPA, after-write hook citește state proaspăt, rulează `evaluateRopaDataMap`, apoi: (1) update `state.ropaActivities` cu enriched (riskLevel/status/linkedFindings), (2) emit findings noi via `createFinding` cu dedupe pe stable id, (3) merge `knowledgeItems` în `state.orgKnowledge`, (4) orchestrate triggers via `collectDiscoveryTriggers` (cu ROPA source wire), (5) emit ledger event `ropa.evaluated` cu metadata sumar. Avantaje: găsim mereu finding-urile relevante fără să trebuiască să rulăm engine separat din UI; UI doar listează state.findings filtrate.

- **Decision D — Dedupe finding emission pe stable id.** Engine donor emite findings cu id stabil deterministic (`ropa-{activityId}-{ruleId}`). Sprint 008C, în `propagateRopaEvaluation`, skip emisia pentru orice candidate al cărui id stabil match-uiește un finding existent în state. Avantaje: nu se acumulează findings duplicate la fiecare write; user-ul rezolvă finding-ul (cu id propriu) și nu reapare. Trade-off: dacă user-ul închide finding-ul ca "dismissed" și apoi REZOLVĂ root cause (e.g. adaugă temei legal), engine-ul nu re-trigger-uiește (idempotent pe id stabil). Sprint future poate adăuga "re-emit after status change" sub flag.

- **Decision E — Discovery trigger orchestrator wire numai pentru ROPA în 008C.** Workshop adapter rămâne stub. `collectDiscoveryTriggers({ropaActivities})` materializează `RopaDataMapTriggerCandidate` în `DiscoveryTriggerRecord` cu ownerRole=dpo/it, slaDays + dueAtISO. `mergeDiscoveryTriggers` existing din 008A handle merge cu state-ul curent (păstrează status completed peste re-emiteri).

- **Decision F — Screening Wizard 3 pași în UI, NU 11 ecrane.** Pasul 1 = context proces (name/dept/owner/description). Pasul 2 = toate 11 întrebări (cu help text inline + Da/Nu/select chip-uri) scroll. Pasul 3 = rezultat evaluation cu banner risc + reasons + missing evidence + recommended measures + checkbox "Creează finding GDPR în cockpit" (default ON când requiresFullDpia=true). Avantaje: faster completion, scrolling natural, single re-evaluation pe demand cu buton.

- **Decision G — Bulk import RoPA via paste TSV/CSV, NU file upload.** User lipește din Excel/Sheets; modal pre-procesează cu header recognition bilingv (ro+en), arată count + lista parsed, bulk PUT `/api/ropa`. Trade-off: nu primim direct fișier .xlsx (necesită biblioteca XLSX). Sprint 014 (PDF generator + Stripe) ar putea adăuga `lib/server/xlsx-import.ts` cu xlsx package; momentan paste TSV e suficient pentru cabinet workflow.

- **Decision H — `linkedAISystemIds[]` câmp nou în RopaActivityRecord, populat manual din UI.** Nu am wire-uit auto-linking RoPA ↔ aiSystems în 008C (atestarea sistemelor AI vine în Sprint 009 AI Data Discovery). UI-ul ROPA expune un input CSV pentru ID-urile sistemelor AI; markdown export include "Sisteme AI legate" pentru transparență. Sprint 009 va wire automat: la AI Data Discovery, dacă un AI tool ia date personale, generăm un RoPA placeholder cu `linkedAISystemIds=[aiSystemId]` plus DPIA trigger.

- **Decision I — Markdown export ROPA în store layer, JSON v1 separat.** `buildMarkdownForOrg()` în ropa-store generează markdown text-ready pentru includere în Audit Pack ZIP (Sprint 011 audit log structurat). `buildMachineReadableForOrg()` returnează JSON v1 schema versionat pentru endpoint /export (download separat). Avantaje: Audit Pack builder din Sprint 004 va putea apela direct `buildMarkdownForOrg(orgId, orgName)` fără rerun engine.

- **Decision J — DPIA + ROPA folosesc același pattern de wire-up cu findings.** Atât `createDpiaFromScreening` cât și `propagateRopaEvaluation` apelează `createFinding(orgId, input, actor)` din findings-store. Garantează: (1) toate findings GDPR au același shape (severity/category/legalReference/evidenceRequired/closeCondition), (2) toate apar în `/dashboard/resolve` cu lifecycle complet, (3) toate audited via finding.created event în ledger. Sprint 008D Breach va folosi același pattern.

---

## Concerns / Blockers

- ⚠️ **Workshop discovery source rămâne stub.** `collectDiscoveryTriggers` are doar branch ROPA real. Când `dpo-discovery-workshop` va fi portat (sprint ulterior), trebuie adăugat un al doilea branch cu `workshopRecord` în input. Momentan funcția nu crapă cu undefined input. Documentat în comment-ul funcției.

- ⚠️ **DPIA + ROPA workflow nu sunt încă în Audit Pack ZIP.** `buildDpiaMarkdownForRecord` și `buildMarkdownForOrg` (ROPA) sunt API-uri ready, dar `lib/server/audit-pack-builder.ts` (Sprint 004) nu le apelează încă. Sprint 011 (Audit-log structured) sau o mini-task în 008D poate adăuga: pentru fiecare orgId, snapshot toate `state.dpiaRecords` + `state.ropaActivities`, scrie markdown-ul lor în ZIP la `dpia/{id}.md` și `ropa/data-map.md`.

- ⚠️ **Re-emit finding după resolved.** Dacă user-ul închide manual un finding GDPR generat din RoPA (e.g. "Lipsește temei juridic") și apoi adaugă în activitate `legalBasis`, engine-ul NU va re-emite finding-ul (stable id deduped). Pentru cazul `dismissed` care nu reflectă realitatea curentă, ar trebui un mecanism "stale" + auto-reopen. Sprint 022 (Preventive engine) va adăuga.

- ⚠️ **Cache state in-memory shared între teste.** Acelaș concern din 008B. Teste izolate prin id-uri unice + asserțiuni relative; nu am putut testa "ropa cu state gol exact" repetat fără reset. Sprint 008D ar putea adăuga `lib/server/__tests__/test-utils.ts` cu `createTestStore()` helper.

- ⚠️ **Markdown export DPIA + ROPA nu emite PDF.** Donor avea `pdf-generator.ts` pentru DPIA. CompliRoAI 008C oferă doar markdown text (Content-Type text/markdown). Sprint 014 (PDF generator + emails + Stripe) va adăuga `lib/server/pdf-generator.ts` wrappind un PDF rendering library; routes /export pot detecta `?format=pdf` și genera pe loc.

- ⚠️ **`/dashboard/dpia` & `/dashboard/ropa` nu sunt în mod cabinet portfolio scoping.** UI-urile folosesc `getOrgContext()` care returnează org-ul curent. În mod cabinet (workspace switcher), apare lista per client; cross-client view (toate DPIA-urile clienților din portfolio) cere endpoint nou — Sprint 013 (Approval queue + Calendar + Trust Center) va adăuga.

- 🚫 Niciun blocker pentru Sprint 008D (GDPR Breach 72h).

---

## Commits

- `2bff11f` — feat(sprint-8c-1): port dpia-schema with finding emission adapter
- `9cfbe16` — feat(sprint-8c-2): dpia store adapter (createDpia/updateDpia/deleteDpia + events)
- `8d9a44b` — feat(sprint-8c-3): DPIA API routes (list/CRUD/screening/export)
- `2a66456` — feat(sprint-8c-4): /dashboard/dpia wizard + records list + screening detail
- `d607a9e` — feat(sprint-8c-5): port ropa-risk-engine + wire orchestrator ropa source
- `0f4c0fe` — feat(sprint-8c-6): ropa store adapter + machine-readable export
- `1322acd` — feat(sprint-8c-7): ROPA API routes (CRUD + export)
- `23b0b1b` — feat(sprint-8c-8): /dashboard/ropa table + edit modal + bulk import + sidebar wire
- (urmează) — docs(sprint-8c): sprint log + INDEX update

## Live URL

- Production: `https://eu-ai-act-beige.vercel.app/dashboard/dpia` și `/dashboard/ropa`
- Preview Vercel: URL după push

---

## Dependencies

**Requires from previous sprints:**
- Sprint 008A (ComplianceState + findings + events + orgKnowledge + discovery-trigger-orchestrator + engine + store adapter) — toate fundațiile
- Sprint 008B (findings-store + /dashboard/resolve cockpit) — `createFinding()` apelat din DPIA + ROPA pentru emitere findings GDPR cu lifecycle complet

**Unlocks for next sprints:**
- Sprint 008D (Breach 72h) — va apela `createFinding(orgId, {category:"GDPR", severity:"critical", title:"Breach #X"}, actor)` urmând același pattern + emite `breach.notification.deadline` events; nu necesită schema noi
- Sprint 009 (AI Data Discovery + PII Discovery + AI Exposure Report) — va wire RoPA placeholders auto: dacă un AI tool detectat folosește date personale, generăm `RopaActivityRecord` cu `linkedAISystemIds=[aiSystemId]` + status="draft" + DPIA trigger automat
- Sprint 010 (Vendor AI Assessment + DPA review) — va citi `state.ropaActivities[].processors[]` ca seed list pentru vendor review; vendor finding-uri vor avea `linkedRopaActivityId` (câmp nou de adăugat la vendor)
- Sprint 011 (Audit-log structured) — va include `buildDpiaMarkdownForRecord` + `buildMarkdownForOrg` (ROPA) în Audit Pack ZIP la `dpia/{id}.md` și `ropa/data-map.md`
- Sprint 022 (Preventive engine) — va detecta când RoPA activity își schimbă legalBasis/retention și auto-reopen findings GDPR dismissed/resolved aferente

---

## Notes pentru următorul agent (Sprint 008D — Breach 72h)

### Pattern emitere finding din modul nou

```typescript
import { createFinding } from "@/lib/server/findings-store"

const finding = await createFinding(
  orgId,
  {
    title: `Breach: ${breach.title}`,
    detail: `${breach.description}. Termen ANSPDCP: ${breach.deadlineISO}.`,
    category: "GDPR",
    severity: "critical",            // GDPR breach => always critical
    legalReference: "GDPR Art. 33-34",
    remediationHint: "Notifică ANSPDCP în 72h, apoi persoanele vizate dacă necesar.",
    evidenceRequired: "Notificare ANSPDCP + decizie risc + plan mitigare",
    ownerSuggestion: "DPO",
    closeCondition: "Confirmare receptare ANSPDCP + notificări persoane vizate (dacă necesar) + plan mitigare validat",
  },
  actor,
)
```

### Pattern store + propagate

Vezi `ropa-store.ts:propagateRopaEvaluation` ca model. Breach store ar trebui:
1. `createBreach(orgId, input, actor)` → push record + emit `breach.created` event
2. Apel `createFinding` cu severity=critical
3. Calculează 72h deadline; emit reminder event
4. La update (status=notified_anspdcp / resolved), update finding via `updateFinding(orgId, findingId, {action: "resolve"}, actor)`

### Audit Pack hook

`audit-pack-builder.ts` (Sprint 004) trebuie ulterior actualizat să includă:
- `dpia/{id}.md` din `buildDpiaMarkdownForRecord(record, orgName)` din dpia-store
- `ropa/data-map.md` din `buildMarkdownForOrg(orgId, orgName)` din ropa-store
- `ropa/data-map.json` din `buildMachineReadableForOrg(orgId, orgName)` din ropa-store
- `breach/{id}.md` din breach-store (Sprint 008D)
- `events/ledger.json` cu hash chain verifyEventChain result (deja există din Sprint 004?)

### Test count after 008C

- Înainte de 008C: 74 teste
- După 008C: 118 teste (+44 noi):
  - dpia-schema.test.ts: 7
  - dpia-store.test.ts: 13
  - ropa-risk-engine.test.ts: 7
  - ropa-machine-readable.test.ts: 3
  - ropa-store.test.ts: 12
  - discovery-trigger-orchestrator.test.ts: 2 (noi adăugate; existau 8 din 008A)

### LOC

- Net new code: ~5,500 LOC (dpia-schema 338 + dpia-store 550 + dpia API 452 + dpia page 1165 + ropa-risk-engine 715 + ropa-store 570 + ropa API 375 + ropa page 1119 + types changes ~60 + orchestrator changes ~70 + test files ~600).
- Donor cod portat verbatim cu rebrand: dpia-schema (~340 LOC) + ropa-risk-engine (~715 LOC).
- Net new CompliRoAI: dpia-store + ropa-store + ambele dashboard pages (~3000 LOC).

### Capcane evitate

- **Regex `[̀-ͯ]` în stableId** — donor folosea unicode escape; Write tool îl convertește în chars combinați (funcțional identic, vizual diferit). Nu modifica.
- **RopaActivityRecord shape în types.ts** — necesar export pentru a permite import în ropa-risk-engine fără dep ciclică. NU define ropaActivities ca type concret din engine în ComplianceState (ar crea loop).
- **Dedupe findings pe id stabil** — propagateRopaEvaluation SKIP candidate dacă există în state. Fără dedupe, fiecare write spawn-uiește duplicat.
- **markDpiaExported în store + apel în export route** — donor folosea PDF generator după mark; CompliRoAI mark + markdown response.
- **acceptFinding flag default OFF în API screening?save=1** — dar UI-ul forțează default ON când requiresFullDpia=true. User-ul poate uncheck.
- **Sidebar visible pentru toate workspace mode-urile.** DPIA + ROPA sunt module GDPR generale, NU cabinet-only.
- **Markdown copy în RO cu „..." quotes** — în JSX folosește single-quoted JS strings pentru evitare ambiguity cu RO smart-quotes. Vezi imports.
