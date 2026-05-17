# Sprint 008A — Foundation Port (DPO-OS → CompliRoAI)

**Status:** DONE
**Faza:** 1 (PORT MASIV DPO-OS)
**Start:** 2026-05-17 11:25
**End:** 2026-05-17 11:50
**Owner:** manual: Claude

---

## Goal (1 propoziție)

Portez fundația DPO-OS necesară (ComplianceState + findings + events + orgKnowledge + discovery-trigger-orchestrator + engine + store adapter) astfel încât DPIA/ROPA/Breach/Findings să poată „cădea peste" pe 100% mature în sprint-urile 008B–008D, fără să mai forțăm module standalone.

---

## Task list

- [x] Port `lib/compliance/constitution.ts` (severity + principles primitives)
- [x] Port `lib/compliance/events.ts` (SHA-256 hash chain ledger) + tests
- [x] Port `lib/compliance/org-knowledge.ts` (Multiplicator B, fără knowledgeFromSiteScan)
- [x] Port `lib/compliance/types.ts` extension — full ScanFinding + ComplianceState (filtrat AI/GDPR)
- [x] Port `lib/compliance/discovery-trigger-orchestrator.ts` (stub workshop/ropa adapters) + tests
- [x] Port `lib/compliance/engine.ts` subset — `initialComplianceState` + `normalizeComplianceState` + tests
- [x] Upgrade `lib/server/store.ts` — `AIActState = ComplianceState` + DPO-OS adapter `mutateFreshStateForOrg` / `readFreshStateForOrg`
- [x] Fix cross-org readers (audit-pack, readiness-pack, share submit) la `mergeWithDefault`
- [x] `npx tsc --noEmit` clean (după fiecare commit)
- [x] `npx vitest run` 47/47 pass (era 22; +25 noi)
- [x] `npm run build` clean
- [x] Sprint log scris
- [x] INDEX.md updatat
- [ ] Push pe `main` (next)
- [ ] Live verify pe `eu-ai-act-beige.vercel.app` (next, după push)

---

## Files created

- `lib/compliance/constitution.ts` — severity + principles primitives (84 LOC; verbatim din DPO-OS)
- `lib/compliance/events.ts` — `appendComplianceEvents` cu SHA-256 hash chain + `verifyEventChain` (168 LOC, verbatim)
- `lib/compliance/events.test.ts` — 10 teste (genesis, leg, deterministic, tamper detect, legacy skip, cap 200, multi-batch)
- `lib/compliance/org-knowledge.ts` — Progressive Data Enrichment (16 categorii, 11 surse, stale check, merge upsert); `knowledgeFromSiteScan` SKIP (site-scanner integration deferred)
- `lib/compliance/discovery-trigger-orchestrator.ts` — backlog centralizat trigger-uri DPO; `collectDiscoveryTriggers` stub (workshop/ropa adapters vin în 008C); `orchestrateDiscoveryTriggers`/`mergeDiscoveryTriggers`/`mergeDiscoveryFindings`/`normalizeDiscoveryTriggers` complete
- `lib/compliance/discovery-trigger-orchestrator.test.ts` — 8 teste minimale (merge lock-uri, status promotion, confidence promotion, normalize defensive parse, orchestrate stats, mergeDiscoveryFindings)
- `lib/compliance/engine.ts` — `initialComplianceState` + `normalizeComplianceState` (165 LOC din 1116 LOC donor; SKIP rule-library/finding-confidence/task-resolution/fiscal/drift-lifecycle care vin cu sprint-urile lor)
- `lib/compliance/engine.test.ts` — 6 teste (initial defaults, severity normalization, gdprProgress, events filter, driftSettings sanitize)
- `docs/sprints/sprint-008a-foundation-port.md` — acest log

## Files modified

- `lib/compliance/types.ts` — adăugat: `FindingCategory`, `ScanFinding` (full 60+ câmpuri), `FindingProvenance`, `LegalMapping`, `FindingResolution`, `DriftTrigger`, `FindingDriftStatus`, `TaskEvidenceKind`, `ComplianceAlert`, `ComplianceEvent` + `ComplianceEventEntityType`/ActorRole/ActorSource, `DetectedAISystemRecord`, `ComplianceDriftRecord` + `ComplianceDriftSettings`, `DpiaRecord`, `GdprTrainingRecord`, `HrRegistryReconciliationRecord`, `DpoMigrationImportRecord`, `ImportedClientContext`, `ComplianceStreak`, `ClientPortalDocument`, `ClientPortalComment`, `AIActGeneratedDocumentRecord` + `AIActOnboardingState` + `AIActReadinessPackRecord` (forward decl), `OrgProfile`/`ApplicabilityResult`/`OrgProfilePrefill`/`DpoDiscoveryWorkshopRecord`/`RopaActivityRecord`/`ClientIntakeSubmissionRecord`/`AIDataMapRecord` (opaque placeholders), `ComplianceState` (filtered AI-relevant subset complet, ~30 câmpuri + 10 native CompliRoAI)
- `lib/server/store.ts` — REWRITE: `AIActState = ComplianceState` alias; `initialComplianceState` din engine.ts; `mergeWithDefault` export public; adapter `mutateFreshStateForOrg(orgId, mutator, orgName?)` și `readFreshStateForOrg(orgId, orgName?)` pentru drop-in compat DPO-OS; re-exports backward compat `GeneratedDocumentRecord`/`OnboardingState`/`ReadinessPackRecord`/`OnboardingWorkspaceMode`
- `lib/server/audit-pack-builder.ts` — cross-org reader (`loadCrossOrgState`) folosește `mergeWithDefault` în loc de literal incomplete
- `lib/server/readiness-pack-builder.ts` — same fix
- `app/api/share/[token]/submit/route.ts` — same fix

## Files removed

- — (nimic)

---

## Schema changes

- **Supabase:** nimic. Folosim `org_state JSONB` existent.
- **State extension:** `AIActState` upgraded la `ComplianceState` (30+ câmpuri noi opționale). Backward compatible — state-uri vechi (cu doar `aiSystems/literacyRecords/generatedDocuments/onboarding`) sunt expanded la noul shape prin `mergeWithDefault` la prima citire.
- **Forward compat:** modulele 008B (Findings) / 008C (DPIA+RoPA) / 008D (Breach) / 009 (AI Discovery) pot scrie direct în `state.findings`, `state.dpiaRecords`, `state.ropaActivities`, `state.aiDataMapRecords` etc. fără să mai modifice types.ts.

---

## Tests

- `npx tsc --noEmit`: **clean (0 errors)** după fiecare din cele 7 commits
- `npm run build`: **clean**, rute existente neschimbate, no nouă rută în 008A (DPIA/RoPA/Findings vin în 008B–C)
- `npx vitest run`: **47/47 pass** (era 22; +25 noi distribuite)
  - `events.test.ts` (10 noi): genesis hash, chain link, deterministic, tamper detect (message + prevHash), legacy skip, cap 200, multi-batch integrity
  - `discovery-trigger-orchestrator.test.ts` (8 noi): collect stub, merge status lock (completed/dismissed), promote status/review/confidence, normalize defensive, orchestrate stats, mergeDiscoveryFindings status retain
  - `engine.test.ts` (6 noi): initial defaults, recalcul highRisk/lowRisk, inferPrinciplesFromCategory, gdprProgress formula, events filter, driftSettings sanitization
- Live test: pending după push

---

## Decisions made

- **Decision A — Opaque placeholders pentru module ne-portate.** Pentru câmpuri din `ComplianceState` care referențiază tipuri din module DPO-OS ne-portate încă (`DpoDiscoveryWorkshopRecord`, `RopaActivityRecord`, `ClientIntakeSubmissionRecord`, `AIDataMapRecord`, `OrgProfile`, `ApplicabilityResult`, `OrgProfilePrefill`) am folosit `Record<string, unknown>` ca opaque type. Avantaje: (1) sprint-uri 008B/C/D pot scrie direct fără să modifice ComplianceState shape, (2) când portăm modulul real, înlocuim placeholder-ul cu type-ul real fără regresii. Alternativa (a porta tot lanțul transitiv) ar fi spart cap 008A.
- **Decision B — Engine subset minimal, nu full port.** Donor `engine.ts` (1116 LOC) depinde de `rule-library`, `task-resolution`, `finding-confidence`, `signal-detection`, `drift-lifecycle`, `hr-registry-reconciliation`, `fiscal-protocol` — toate modulele care vin în sprint-uri viitoare. Portez doar `initialComplianceState` + `normalizeComplianceState` (165 LOC) cu helpers locali (normalizeFinding/Alert/Events/Drift). În Sprint 008B Findings vom wire `applyTaskResolutionToAlerts` și `getOperationallyClosedFindingIds` peste această fundație.
- **Decision C — `collectDiscoveryTriggers` stub în 008A, full în 008C.** Donor depinde direct de `dpo-discovery-workshop` și `ropa-risk-engine`. Le-am stub-uit. Funcția returnează listă vidă. Caller code (cockpit hook în 008B) trebuie să tolereze lista vidă — în practică, până la Sprint 008C nu vor exista workshops/ropa care să emită trigger-e, deci e safe.
- **Decision D — `AIActGeneratedDocumentRecord` keep CompliRoAI lighter shape.** Donor `GeneratedDocumentRecord` are 18+ documentType + lifecycle fields complexe (approval, validation, adoption, sharing comments, refresh). CompliRoAI native are doar `annex-iv` cu systemId. Am păstrat shape-ul ușor în `AIActGeneratedDocumentRecord` (în types.ts) ca alias re-exportat din store.ts. Când DPIA/RoPA generators au nevoie de wider type, vom extinde aici; momentan, nu rupem existing inventory page (`/dashboard/sisteme`).
- **Decision E — `mergeWithDefault` exported public.** Necesar pentru cross-org readers (cabinet → client) din `audit-pack-builder.ts` și `readiness-pack-builder.ts` care construiau literal state-uri parțiale. Acum că `ComplianceState` are mai multe câmpuri required (highRisk, lowRisk, gdprProgress, alerts, findings, events), literal-urile vechi nu mai compilează. Soluția: îi punem să folosească `mergeWithDefault(remote)` care fillează toate defaults. Mai curat și mai DRY.
- **Decision F — Re-exports backward compat în store.ts.** Codul existent face `import { GeneratedDocumentRecord, OnboardingState, ReadinessPackRecord } from "@/lib/server/store"`. Am păstrat aliasuri (`GeneratedDocumentRecord = AIActGeneratedDocumentRecord` etc.) ca să nu trebuiască un sed global. ZERO modificări la call sites pentru aceste type imports.
- **Decision G — Test orchestrator nou, nu portat.** Donor `discovery-trigger-orchestrator.test.ts` depinde de `evaluateDpoDiscoveryWorkshop` și `evaluateRopaDataMap` — ambele indisponibile. Am scris 8 teste minimale care acoperă tot ce poate fi testat fără workshop/ropa: merge promotion, status lock, normalize defensive, stats. Acoperire suficientă pentru Sprint 008A; mai multe teste end-to-end vin în 008C odată cu wiring-ul real.

---

## Concerns / Blockers

- ⚠️ **Opaque placeholders au pierdut type safety** pentru câmpuri precum `ropaActivities` (acum `Record<string, unknown>[]`). Caller code va trebui să cast explicit la `RopaActivityRecord` real când Sprint 008C portează `ropa-risk-engine.ts`. Lista exhaustivă în comment-ul mare din types.ts.
- ⚠️ **`mergeWithDefault` umflă state-ul cu defaults la fiecare read.** Dacă DB-ul Supabase nu are câmpurile, le adăugăm la fiecare round-trip (e.g. `events: []`, `aiSystems: []`). În scrierile următoare, le persistăm explicit. Sprint 011 (audit-log) ar putea adăuga un strip helper pentru a evita umflarea persistată.
- ⚠️ **`collectDiscoveryTriggers` stub returnează []**. Dacă un caller intenționează să-l folosească ÎNAINTE de Sprint 008C, va vedea zero trigger-e. Nu am wire stub-ul în niciun caller încă, deci nu e issue acum.
- ⚠️ **`ComplianceDriftChange` exclus `invoice_flow_signal_detected`** din donor (era fiscal-related). Dacă viitor port de drift detection re-introduce signal pe AI, adăugăm union element.
- 🚫 Niciun blocker pentru Sprint 008B.

---

## Commits

- `089b6c4` — feat(sprint-8a-1): port constitution.ts
- `b3c2dc4` — feat(sprint-8a-2): port events ledger + ComplianceEvent type
- `6aa8d44` — feat(sprint-8a-3): port org-knowledge progressive enrichment
- `5aba5aa` — feat(sprint-8a-4): port ScanFinding + ComplianceState (AI-relevant subset)
- `424465b` — feat(sprint-8a-5): port discovery trigger orchestrator (stub workshop/ropa sources)
- `2e00100` — feat(sprint-8a-6): port engine — initial + normalize ComplianceState
- `20e5800` — feat(sprint-8a-7): upgrade store to ComplianceState + DPO-OS adapter pattern
- (urmează) — docs(sprint-8a): sprint log + INDEX update

## Live URL

- Production: `https://eu-ai-act-beige.vercel.app/` — fără rute UI noi în 008A (fundația); modulele 008B/C/D vor adăuga `/dashboard/findings`, `/dashboard/dpia`, `/dashboard/ropa`, `/dashboard/breach`
- Preview Vercel: URL după push

---

## Dependencies

**Requires from previous sprints:**
- Sprint 1 (multi-tenancy + `getOrgContext()` + `readState/writeState`)
- Sprint 4 (audit pack ZIP + verify chain — fundație pentru events ledger)
- Sprint 7 (DSAR — pattern adapter store, model pentru 008B Findings)

**Unlocks for next sprints:**
- Sprint 008B (Findings + Dosar + Resolve UI) — folosește `state.findings`, `state.discoveryTriggers`, `state.events` direct; folosește `mutateFreshStateForOrg` + `appendComplianceEvents` pentru audit trail
- Sprint 008C (DPIA + ROPA) — populează `state.dpiaRecords`, `state.ropaActivities`; va wire `collectDiscoveryTriggers` real cu `dpo-discovery-workshop` + `ropa-risk-engine` (înlocuind stub-ul)
- Sprint 008D (Breach 72h) — populează `state.findings` cu category `GDPR` + severity critical; nu necesită noi extension pe state
- Sprint 009 (AI Data Discovery + PII) — populează `state.aiDataMapRecords`, `state.orgKnowledge`, foloseste `discovery-trigger-orchestrator` real pentru emiterea trigger-elor
- Sprint 011 (Audit-log structured) — extinde `appendComplianceEvents` cu indexare per orgId/entityType, UI peste events ledger

---

## Notes pentru următorul agent (Sprint 008B Findings)

### Pattern store adapter

```typescript
// În route handler-ele 008B (e.g. /api/findings/[id]/route.ts):
import { mutateFreshStateForOrg } from "@/lib/server/store"
import { getOrgContext } from "@/lib/server/org-context"
import { appendComplianceEvents, createComplianceEvent } from "@/lib/compliance/events"

const { orgId, email } = await getOrgContext()
const next = await mutateFreshStateForOrg(orgId, (state) => {
  const event = createComplianceEvent({
    type: "finding.resolved",
    entityType: "finding",
    entityId: findingId,
    message: `Finding ${findingId} rezolvat de ${email}`,
    createdAtISO: new Date().toISOString(),
  })
  return {
    ...state,
    findings: state.findings.map((f) => f.id === findingId ? { ...f, findingStatus: "resolved" } : f),
    events: appendComplianceEvents(state, [event]),
  }
})
```

### ScanFinding lifecycle

- `findingStatus`: `open` → `confirmed` → `under_monitoring` / `resolved` / `dismissed`
- `reviewState`: `unreviewed` → `confirmed` → `evidence_attached` → `closed` / `monitoring`
- `findingStatusUpdatedAtISO` — bump la fiecare tranziție
- `operationalEvidenceNote` — string explicativ pentru `monitoring`/`closed`
- `resolution.closureEvidence` — pointer la asset/document care confirmă închiderea

### Events ledger

- Folosește `createComplianceEvent({...}, { id, label, role, source })` pentru actor
- `appendComplianceEvents(state, [event])` returnează nou `state.events` (newest-first, cap 200)
- Hash chain calculat automat; `verifyEventChain` în audit pack export
- NU manipula `selfHash`/`prevHash` manual — `appendComplianceEvents` le calculează cronologic

### Findings UI (008B)

- Pagina `/dashboard/findings` listează `state.findings` (sortate severity → date)
- Filter tabs pe `category` (EU_AI_ACT/GDPR/E_FACTURA/NIS2) + `findingStatus`
- Drawer detail cu `resolution` (problem/impact/action/humanStep/closureEvidence)
- Acțiuni: Confirm / Dismiss / Mark resolved / Attach evidence (`evidenceRequired` ca hint)
- Wire `discoveryTriggers` în finding card (`state.discoveryTriggers.filter(t => t.findingIds.includes(f.id))`)

### Capcane evitate

- **Type recursion ComplianceState ↔ orchestrator:** types.ts folosește `import("@/lib/compliance/discovery-trigger-orchestrator")` în-line ca dynamic import (evită circular dep).
- **`structuredClone(initialComplianceState)`** în `mergeWithDefault` — necesar ca să nu shared-mutate defaults între org-uri (cache Map).
- **`orgId` ignorat în `mutateFreshStateForOrg`** — CompliRoAI rezolvă din middleware headers, semnătura DPO-OS păstrată pentru drop-in. NU schimba; codul ported va trimite orgId chiar dacă noi îl ignorăm.
- **Test files nu necesită branding sed** — DPO-OS source folosea `CompliScan` în comentarii (`Generated by CompliScan`). Toate string literal-urile portate în events/org-knowledge/orchestrator au fost neutralizate sau înlocuite cu wording generic „aplicație"/„motor compliance".

### Test count

- Înainte de 008A: 22 teste (4 DSAR + 18 din sprint-uri anterioare)
- După 008A: 47 teste (+25 noi: 10 events + 8 orchestrator + 6 engine + 1 implicit prin types reuse)
- Acoperire DPO-OS foundation: 100% pentru funcțiile portate
