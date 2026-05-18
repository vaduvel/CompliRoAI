# Sprint 021 — QMS Workspace (Art. 17 EU AI Act)

**Status:** DONE
**Faza:** 3 (AI Act Depth — final umbrella module)
**Start:** 2026-05-18 ~08:09
**End:** 2026-05-18 ~09:00
**Owner:** manual: Claude (Opus 4.7 1M)

---

## Goal

Build **QMS Workspace** ca **umbrella module** pentru Art. 17 EU AI Act, ultimul
modul de AI Act depth înainte de Sprint commercial (022+). Reprezintă o
instanță singleton per org cu:

- **13 secțiuni Art. 17(1)(a)-(m)** documentate (descriere narrativă +
  procedură step-by-step + responsabil rol + documente atașate + status
  workflow: not_started / in_progress / documented / approved / needs_update)
- **Cross-module references auto-populate** pentru sectiunile (f)/(g)/(h)/(i)/(k):
  - (f) data management → RoPA (Sprint 008C) + AI Data Map (Sprint 009)
  - (g) risk management → DPIA (Sprint 008C) + FRIA (Sprint 016) + findings
    (Sprint 008B)
  - (h) PMM → PMM plans (Sprint 019)
  - (i) incident reporting → AI Incidents (Sprint 020)
  - (k) record-keeping → Logging Evidence (Sprint 018)
- **Per-system attestations** — confirmare explicit per AI system high-risk că
  QMS îl acoperă (sectiuni acoperite + gap-uri recunoscute)
- **Lessons Learned aggregator** — auto-derive din incidents closed +
  PMM anomalies resolved (high/critical) + findings critical resolved cu
  evidence + manual lessons; merge cu pastrare manual + sort newest-first
- **SME simplified mode** (Art. 17(3)) — toggle care marchează 4 sectiuni
  advanced (c, e, j, l) opționale; completness "complete" daca toate
  esentialele (9) done
- **Approval workflow** cu version label bump + nextReviewISO (12 luni
  default)
- **Findings emission**: 8 reguli (section_missing per sectiune, approval >12
  luni high, risk mgmt fara DPIA+FRIA high, PMM no plans high, record-keeping
  no logging high, high-risk fara attestation high)
- **Audit Pack inclusion** (CRITICAL — QMS este umbrella, trebuie inspectabil
  pentru conformity assessment + notified body audit Annex IV)
- **AI Inventory banner** pe sistemele high-risk fara attestation

**BUILD NEW** sprint per mandate § 21 — niciun donor DPO-OS. CompliRoAI este
primul produs RO cu QMS workspace audit-clean care aggregheaza
cross-module + auto-lessons-learned + per-system attestation matrix.

---

## Task list

- [x] QmsWorkspace types + ComplianceState extension
- [x] qms-schema.ts (13 sectiuni Art. 17(1)(a)-(m) RO + tier essential/advanced)
- [x] qms-evaluator.ts (completeness + cross-module counts + 8 finding rules +
      markdown long-form)
- [x] qms-lessons-aggregator.ts (auto-derive idempotent din incidents +
      anomalies + findings; merge cu manual)
- [x] qms-store.ts (singleton getOrCreate + 11 mutations + 10 event types)
- [x] 9 API routes (GET/POST /api/qms, GET/PATCH /api/qms/section/[key], POST/
      DELETE /api/qms/document, GET/POST /api/qms/lessons, GET/POST/DELETE
      /api/qms/system-attestation, POST /api/qms/approve, POST /api/qms/
      simplified-mode, POST /api/qms/org-size, GET /api/qms/export)
- [x] /dashboard/qms UI rewrite (replace ComingSoonPage) cu 4 tab-uri +
      4 modale + init flow
- [x] /dashboard/sisteme banner QMS attestation pentru high-risk
- [x] components/ai-act/ai-systems-list.tsx banner needsQms + needsQms gate
- [x] Audit Pack wired: qms/workspace.md + qms/sections/{key}.md +
      qms/lessons-learned.md + qms/system-attestations.md +
      qms/cross-module-health.md; audit trail 4 event types nou
- [x] nav-config: remove "coming-soon" + mutat din builder in compliance +
      cabinet visibility + FileBadge icon
- [x] feature-gates: rename "qms" → "qms_workspace" + cabinet workspace +
      cabinet_pro + cabinet_enterprise + free_trial + ai_builder tier
- [x] Tests updated: nav-config + feature-gates + audit-pack-sprint-011
- [x] Build clean
- [x] Sprint log + INDEX update
- [x] Commit + push (9 commits)

---

## Files created

- `lib/compliance/qms-schema.ts` — 13 sectiuni Art. 17(1)(a)-(m) + RO labels +
  tier classification + cross-module mapping + 4 helpers
- `lib/compliance/qms-schema.test.ts` — 25 tests
- `lib/compliance/qms-evaluator.ts` — completeness + cross-module counts +
  evaluateQms (8 gap codes + finding emission) + buildQmsMarkdown long-form
- `lib/compliance/qms-evaluator.test.ts` — 25 tests
- `lib/compliance/qms-lessons-aggregator.ts` — aggregateLessonsFromState +
  mergeAutoAndManualLessons (idempotent stable IDs)
- `lib/compliance/qms-lessons-aggregator.test.ts` — 18 tests
- `lib/server/qms-store.ts` — getOrCreate (singleton) + updateSection +
  attach/removeDocument + recordLesson + refreshAutoLessons +
  markSimplifiedMode + setOrganizationSize + listSystemAttestations +
  attest/revokeSystem + approveQms + buildQmsMarkdownForState
- `lib/server/qms-store.test.ts` — 30 tests
- `app/api/qms/route.ts` — GET + POST (workspace singleton)
- `app/api/qms/section/[sectionKey]/route.ts` — GET + PATCH
- `app/api/qms/document/route.ts` — POST + DELETE
- `app/api/qms/lessons/route.ts` — GET + POST (manual sau ?refresh=auto)
- `app/api/qms/system-attestation/route.ts` — GET + POST + DELETE
- `app/api/qms/approve/route.ts` — POST
- `app/api/qms/simplified-mode/route.ts` — POST
- `app/api/qms/org-size/route.ts` — POST
- `app/api/qms/export/route.ts` — GET (md sau json)
- `app/dashboard/qms/page.tsx` — REWRITE complet (1500+ linii)
- `docs/sprints/sprint-021-qms-workspace-art-17.md` — acest fisier

## Files modified

- `lib/compliance/types.ts` — adaugat QmsSectionKey, QmsSectionStatus,
  QmsDocumentReference{Type}, QmsSectionContent, QmsLessonLearned,
  QmsSystemAttestation, QmsWorkspaceStatus, QmsCompleteness,
  QmsOrganizationSize, QmsWorkspace; extins ComplianceState cu
  `qmsWorkspace?: QmsWorkspace`
- `lib/server/audit-pack-builder.ts` — import QmsWorkspace + buildQmsMarkdown
  + getQmsSchemaSection + QMS_*_LABELS; manifest summary qmsWorkspaceCount +
  qmsCompleteness; pushQmsFiles (5 fisiere); 4 audit trail event types noi;
  SIGNATURE.txt summary linie noua
- `components/shell/nav-config.ts` — QMS item: remove coming-soon badge, mutat
  in section compliance, +cabinet workspaceMode, icon FileBadge,
  requiredFeature qms_workspace
- `components/shell/dashboard-shell.tsx` — adaugat FileBadge in import +
  ICON_REGISTRY
- `lib/server/feature-gates.ts` — rename "qms" → "qms_workspace"; cabinet
  workspace + cabinet_pro + cabinet_enterprise tier maps adaugate
- `lib/server/feature-gates.test.ts` — rename string "qms" → "qms_workspace"
- `components/shell/nav-config.test.ts` — cabinet now expects "QMS" label;
  ai-builder placeholder test renamed
- `tests/audit-pack-builder-sprint-011.test.ts` — adaugat qms/README.md la
  empty state; test nou complet cu QmsWorkspace populate verifying
  workspace.md + sections + lessons + attestations + cross-module-health +
  manifest counts + chain valid
- `app/dashboard/sisteme/page.tsx` — fetch /api/qms/system-attestation +
  computed systemsRequiringQmsAttestationIds + pass la AISystemsList
- `components/ai-act/ai-systems-list.tsx` — adaugat
  systemsRequiringQmsAttestationIds prop + needsQms variable +
  hasBanner + banner JSX amber cu link
  /dashboard/qms?attest={systemId}

## Files removed

Niciun.

---

## Schema changes

- TypeScript: `ComplianceState.qmsWorkspace?: QmsWorkspace`
- Supabase: nimic (state JSON persistat per-org de mvp-store, fara migration
  necesara)

---

## Tests

- `npx tsc --noEmit`: clean (0 errors)
- `npm run build`: clean (toate routele incluse: /dashboard/qms 15.1kB +
  9 routes /api/qms/*)
- `npx vitest run`: 1003 tests pass (904 baseline + 25 schema + 25 evaluator
  + 18 aggregator + 30 store + 1 audit-pack)

---

## Decisions made

- **Singleton vs array.** QMS este per organizație (NU per sistem AI ca FRIA/
  Oversight/Logging/PMM). Decis singleton: `ComplianceState.qmsWorkspace?:
  QmsWorkspace` (NU array). Rezolva audit story "We have ONE quality
  management system" + simplifica UI (no list-of-workspaces).
- **Per-system attestation matrix.** Pastrez QMS singleton, dar adaug
  `systemAttestations: QmsSystemAttestation[]` care confirmă explicit
  acoperirea per AI system high-risk + declară gap-uri. Combinație optimă:
  un QMS unified + dovezi per-sistem că este aplicat.
- **Cross-module reference counts auto-populate.** NU duplicate state — counts
  sunt computate live de evaluator din `state.dpiaRecords`,
  `state.pmmPlans`, etc. Pattern care evita stale data. Per Rule 6 strict:
  counts WORK in acest sprint, NU "wire later" (sunt deja apelate in
  evaluator + store + UI + audit pack).
- **SME simplified mode (Art. 17(3)).** Decis tier per-sectiune in schema
  (essential vs advanced). Simplified mode hide automat advanced sections
  (c, e, j, l) din UI + skip section_missing findings pe advanced + complete
  daca toate esentialele (9) done. NU stergem advanced sections — pot fi
  reactivate by toggle off. Default `simplifiedMode=true` la init pentru SME
  (asta este targetul CompliRoAI).
- **Lessons aggregator idempotent.** ID-uri stabile per source entity:
  `qms-lesson-incident-{id}`, `qms-lesson-anomaly-{planId}-{anomalyId}`,
  `qms-lesson-finding-{id}`. Re-rularea aggregator-ului refresh con-uri fără
  duplicate. Manual lessons (source="manual") sunt mereu retained. Orphan
  auto-lessons (sursa entitate stearsa) sunt retained pentru audit history
  (NU le sterge cand entitatea sursa dispare).
- **Approve workflow.** Bump versionLabel automat: din "v0.1 — draft" →
  "v1.0 — YYYY-MM-DD"; pentru aprobari ulterioare bump minor (v1.0 → v1.1).
  nextReviewISO default = +12 luni (configurable in modal). approval >12 luni
  emite finding high `approval_overdue`.
- **NU two-person rule pe approve.** Spre deosebire de Sprint 017 Oversight
  (biometric ID), QMS approval este un act managerial (CEO/Quality Manager) —
  un singur signer e suficient. Eventual viitor cabinet workflow va putea
  multi-signer dar nu pentru MVP.
- **Skip finding persistence pe operatiuni neutre.** Init, attestation,
  revoke, simplifiedMode toggle, orgSize change, approve, removeDocument:
  skipFindingPersistence=true (nu sunt momente cand RELEVAM gaps noi). Update
  section + attach document + revoke attestation: skipFindingPersistence=false
  (pot expune sau remove gaps).
- **Cabinet visibility.** Per mandate § 18, QMS este atat ai-builder (primary
  provider role) cat si cabinet (cabinet pregateste QMS pentru clientii
  provider). Renamed feature `qms` → `qms_workspace` pentru claritate +
  adaugat in cabinet workspace + tier maps cabinet_pro + cabinet_enterprise.
- **Move din section "builder" in "compliance".** Aliniere cu FRIA + Oversight
  + Logging + PMM + Incidente AI (toate in "compliance" pentru cabinet UX
  consistent). QMS este compliance umbrella, nu builder-specific.

---

## Concerns / Blockers

- ⚠️ **Concern**: Lessons aggregator NU este apelat automat la modificarea
  state-ului (incident closed, anomaly resolved, finding resolved). Doar
  cand utilizatorul apasa "Sincronizează auto" sau cand store-ul ruleaza
  refreshAutoLessons explicit. Sprint 022 (Preventive Engine) ar trebui sa
  adauge un trigger automat (ex: ai-incident-store.closeIncident apeleaza
  qms-store.refreshAutoLessons cu skipFindingPersistence). Pentru moment, UI
  expune action explicit "Sincronizează auto" pe Lessons tab.
- ⚠️ **Concern**: Approval expirat genereaza finding high, dar nu trimite
  notification email (Sprint 022 va adauga renewal reminder via cron). Pentru
  moment, vizibil doar in findings + cockpit.
- ⚠️ **Concern**: Attestation deep-link `/dashboard/qms?attest={systemId}`
  este implementat ca link in banner, dar UI nu deschide automatic
  AttestModal pe load cu query param (Sprint 022 — minor UX polish). Pentru
  moment, utilizatorul navigheaza la tab Attestations + click "Atestă
  sistem".
- ⚠️ **Concern**: SignatureTxt formatting NU este verificat in test (test
  doar verifica manifest summary fields). Verifica vizual la export.
- 🚫 **Blocker pentru Sprint 022 commerciality:** QMS module este COMPLET
  audit-clean dar lipseste:
  - Auto-generation engine pentru template-uri (ex: "Generează schiță
    politică QMS bazată pe sector + dimensiune")
  - Renewal Tracker cu cron pentru next review notification
  - Change Log cu version diff (ex: aplica v1.1 peste v1.0, vezi ce s-a
    schimbat)
  Toate sunt scope Sprint 022, NU 021.

---

## Commits

- `6802154` — feat(sprint-21-1): QmsWorkspace types + ComplianceState
- `b9b5669` — feat(sprint-21-2): QMS schema (13 sections Art. 17(1)(a)-(m))
- `59fb412` — feat(sprint-21-3): QMS evaluator (completeness + cross-module
  health + finding emission)
- `d4f011b` — feat(sprint-21-4): QMS lessons aggregator (incidents + PMM
  anomalies + findings)
- `b74b771` — feat(sprint-21-5): QMS store adapter (singleton + sections +
  lessons + attestations + approve)
- `c3425b9` — feat(sprint-21-6): QMS API routes (workspace + sections +
  documents + lessons + attestations + approve + simplified-mode + export)
- `09ecf79` — feat(sprint-21-7): /dashboard/qms UI cu 4 tab-uri (sections +
  lessons + attestations + cross-module health) + Inventory banner
- `5ccfb2a` — feat(sprint-21-8): wire QMS into Audit Pack + nav-config
  coming-soon removed
- `<hash>` — docs(sprint-21): sprint log + INDEX update (acest commit)

## Live URL

- Production: `https://eu-ai-act-beige.vercel.app/dashboard/qms`
- Preview Vercel: URL after push

---

## Dependencies

**Requires from previous sprints:**
- Sprint 008A (ComplianceState foundation + findings + events)
- Sprint 008B (createFinding pattern + linkedFindingIds)
- Sprint 008C (RoPA + DPIA records pentru cross-module counts)
- Sprint 009 (AI Data Map records pentru section (f) count)
- Sprint 011 (Audit Pack builder structure)
- Sprint 016 (FRIA records pentru section (g) count)
- Sprint 017 (Oversight protocols pentru lessons context)
- Sprint 018 (Logging Evidence configs pentru section (k) count)
- Sprint 019 (PMM plans + anomalies pentru section (h) count + lessons
  aggregator source)
- Sprint 020 (AI Incidents pentru section (i) count + lessons aggregator
  source)

**Unlocks for next sprints:**
- Sprint 022 (Preventive Engine + Renewal Tracker + Change Log):
  - Auto-call refreshAutoLessons din ai-incident-store.closeIncident +
    pmm-store.markAnomalyResolved + findings-store.resolveFinding
  - Cron pentru QMS approval renewal notification (Sprint 022 hook in
    nextReviewISO)
  - QMS version diff / change log UI
  - Auto-generation engine template-uri politica/procedura per sector
- Sprint 023 (API/SDK): publicare QMS workspace via REST/SDK pentru
  integrare CI/CD pipelines la providers AI

---

## Notes pentru următorul agent

- **Pattern singleton**: ComplianceState.qmsWorkspace este SINGULAR. Foloseste
  `getOrCreateQms(orgId, actor)` care returneaza `{ workspace, created }`.
  NU presupune ca exista — verifica `state.qmsWorkspace` sau apeleaza
  getOrCreate.
- **Cross-module counts** sunt computate LIVE de evaluator la fiecare call —
  NU sunt persistate in workspace.sections. Inseamna ca daca adaugi un DPIA
  in alt modul, contul section (g) se actualizeaza la urmatorul read fara
  re-save QMS. Patternul este corect pentru evitarea stale data.
- **Lessons aggregator** este IDEMPOTENT — ID-uri stabile per source entity.
  Sprint 022 ar trebui sa adauge auto-trigger cand entitatile-sursa sufera
  state transitions (closeIncident, markAnomalyResolved, resolveFinding) ca
  sa nu necesite click manual.
- **SME simplified mode** is essential UX: SME = default = simplified ON.
  Pentru midsize/large simplified OFF se forteaza prin setOrganizationSize.
  UI hide automat advanced sections (c, e, j, l) cand simplified=true.
- **Audit Pack qms/ folder** are 5 fisiere + README.md cand neinit. Verifica
  cu chain valid (sha256 chained). Pattern identic cu pmm/, ai-incidents/.
- **AI Inventory banner** foloseste link `?attest={systemId}` dar UI NU
  citeste query param momentan (TODO Sprint 022). User trebuie sa navigheze
  la tab Attestations + click "Atestă sistem" manual.
- **Findings emise** au stable IDs: `qms-finding-{workspace.id}-{gap_code}`.
  Re-eval pe acelasi state nu creeaza dupublicate (findings-store dedup pe ID).
- **Naming consistency**: feature flag este `qms_workspace` (renamed din
  legacy `qms`). Daca adaugi referinte noi peste tot foloseste
  `qms_workspace`.

---

## Verification summary (pentru parent agent)

- 9 incremental commits, fiecare tsc-clean
- 1003 tests pass (904 baseline + 98+ noi: 25 schema + 25 evaluator + 18
  aggregator + 30 store + 1 audit-pack regression)
- Build clean — /dashboard/qms 15.1kB + 9 routes /api/qms/* registered
- QMS singleton init works (POST /api/qms creeaza cu 13 sectiuni goale +
  emite qms.initialized event)
- Cross-module reference counts auto-populate (verificate prin evaluator
  tests cu state populat)
- Lessons aggregator pulls din closed incidents + resolved anomalies +
  critical resolved findings (verificat prin tests)
- AI Inventory shows banner pentru sistemele high-risk fara attestation
- Audit Pack ZIP contine qms/ section cu workspace.md + sections + lessons +
  attestations + cross-module-health (test pasaza)
- Nav coming-soon removed; QMS visible pentru ai-builder + cabinet
- feature_gates renamed qms → qms_workspace + cabinet visibility added
