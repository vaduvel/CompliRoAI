# Sprint 019 — Post-Market Monitoring (Art. 72 + Annex IV AI Act)

**Status:** DONE
**Faza:** 3 (AI Act Depth — build new)
**Start:** 2026-05-17 ~23:50
**End:** 2026-05-18 ~01:25
**Owner:** manual: Claude (Opus 4.7 1M)

---

## Goal

Build **Post-Market Monitoring** ca workflow mature per **EU AI Act Art. 72 +
Annex IV pct. 10**:
- Plan PMM per sistem AI high-risk (5 secțiuni Art. 72(3): data collection
  + compliance evaluation + corrective + preventive + review cycle)
- Reviews periodice cu metrics + risks + acțiuni
- Version changes cu marker `substantialModification` (Art. 43(4) trigger)
- Anomalii detectate cu severity + categorie + hook escaladare Sprint 020
- Trigger automat: high-risk → quarterly, biometric → monthly, decizii-impact
  → quarterly; altfel → annual recommendation
- 5 reguli findings emise în /dashboard/resolve:
  1. Plan incomplete pentru sistem high-risk (high, Art. 72(1)+(3))
  2. Data collection insuficient < 3 metode (medium, Art. 72(3)(a))
  3. Review overdue (high, Art. 72(2))
  4. Substantial change fără re-evaluare risc (**CRITICAL**, Art. 43(4))
  5. Anomalie critică nerezolvată > 7 zile (high, Art. 72(4))
- Anomalie critical emisă cu finding **CRITICAL imediat** (Art. 72(4) + Art. 73)
- `scheduleReviewReminder(daysBeforeReview)` ca cron hook pentru Sprint 022
- Inclus în Audit Pack (`pmm/registry.md` + `pmm/records/{id}.md`)
- Replace `/dashboard/post-market-monitoring` placeholder cu UI real

**BUILD NEW** sprint per mandate § 20 — niciun donor DPO-OS. CompliRoAI este
primul produs RO care livrează plan PMM Art. 72 ca workflow auditabil cu
timeline complet pentru reviews + version changes + anomalii.

---

## Task list

- [x] PmmPlan types + ComplianceState extension (`pmmPlans?[]`)
- [x] pmm-schema.ts (5-section wizard, 9 metode data collection,
  Art. 72(3)(a)+(b)+(c))
- [x] pmm-trigger.ts (biometric monthly + high-risk quarterly +
  decizii-impact quarterly)
- [x] pmm-evaluator.ts (completeness 3 niveluri + freshness 4 stări +
  5 reguli findings + markdown)
- [x] pmm-store.ts adapter (CRUD + approve/reject + recordReview +
  recordVersionChange + recordAnomaly + scheduleReviewReminder)
- [x] 7 API routes (list/CRUD + review + version-change + anomaly + export +
  trigger-check)
- [x] /dashboard/post-market-monitoring UI complet (REWRITE peste
  ComingSoonPage): stats + dual filter (status × freshness) + 5-step wizard
  + per-record detail expand + 3 modale (Review / VersionChange / Anomaly)
- [x] AI Inventory banner (componenta `ai-systems-list.tsx` + `sisteme/page.tsx`)
- [x] Wire în Audit Pack ZIP (`pmm/registry.md` + `pmm/records/{id}.md`)
- [x] Audit trail events (PMM_PLAN_CREATED / _ACTIVATED / _REVIEW_RECORDED /
  _VERSION_CHANGE / _ANOMALY_RECORDED)
- [x] Remove `coming-soon` badge + section "compliance" + cabinet vizibilitate
- [x] feature-gates: `post_market_monitoring` pentru cabinet workspace +
  cabinet_pro / cabinet_enterprise tiers
- [x] Test alignment (nav-config.test, feature-gates.test,
  audit-pack-builder-sprint-011.test)
- [x] `npx tsc --noEmit` clean
- [x] `npx vitest run` 795/795 pass (728 + 67 noi)
- [x] `npm run build` clean — toate rutele PMM înregistrate
- [x] Sprint log + INDEX update
- [x] 8 code commits + 1 docs commit push la origin/main (pending push)

---

## Files created

- `lib/compliance/pmm-schema.ts` — 5 secțiuni × întrebări obligatorii +
  PMM_REVIEW_CYCLE_MONTHS map (1/3/6/12) + 9 metode data collection cu help
- `lib/compliance/pmm-schema.test.ts` — 10 teste structurale
- `lib/compliance/pmm-trigger.ts` — `evaluatePmmRequirement()` +
  `findSystemsNeedingPmm()`; reguli biometric (monthly) + high-risk
  (quarterly) + decizii-impact (quarterly); urgency before_use /
  periodic_review (>90 zile) / none
- `lib/compliance/pmm-trigger.test.ts` — 10 teste (combo biometric+impact)
- `lib/compliance/pmm-evaluator.ts` — `computePmmCompleteness()` +
  `computePmmFreshnessStatus()` + `findUnreassessedSubstantialChanges()` +
  `findCriticalUnresolvedAnomalies()` + `evaluatePmm()`; 5 reguli findings;
  markdown export complet cu secțiunile A-D + reviews/version changes/anomalies
  timeline + checklist final cu Art. 72/Art. 43(4) markers
- `lib/compliance/pmm-evaluator.test.ts` — 20 teste (completeness 3 +
  freshness 4 + substantial mod 3 + anomaly 3 + aggregate 7)
- `lib/server/pmm-store.ts` — adapter CRUD + approve/reject + recordReview
  (recalc next + freshness) + recordVersionChange (re-eval cu findings) +
  recordAnomaly (critical → finding imediat) + scheduleReviewReminder +
  buildPmmMarkdown
- `lib/server/pmm-store.test.ts` — 23 teste (CRUD 7 + approve/reject 3 +
  reviews 2 + version-change 3 + anomaly 4 + scheduling/markdown/summary 4)
- `app/api/pmm/route.ts` — GET list (filters status/completeness/
  freshnessStatus/linkedAISystemId) + POST
- `app/api/pmm/[id]/route.ts` — GET + PATCH (cu inline approve/reject via
  body.action) + DELETE
- `app/api/pmm/[id]/review/route.ts` — POST record review
- `app/api/pmm/[id]/version-change/route.ts` — POST record version change
- `app/api/pmm/[id]/anomaly/route.ts` — POST record anomaly
- `app/api/pmm/[id]/export/route.ts` — markdown + PDF via Sprint 014
- `app/api/pmm/trigger-check/route.ts` — POST {systemId} → trigger
- `app/dashboard/post-market-monitoring/page.tsx` — REWRITE complet
  (~1600 linii): stats + dual filter (status × freshnessStatus) + banner
  Inventory + 5-step PmmWizard + PlanRow expand cu Section A-D + reviews
  timeline + version changes timeline + anomalies table + 3 modale
  (ReviewModal cu metrics key=value, VersionChangeModal cu avertisment
  Art. 43(4), AnomalyModal cu avertisment CRITICAL → finding imediat)
- `docs/sprints/sprint-019-post-market-monitoring-art-72.md` — acest fișier

## Files modified

- `lib/compliance/types.ts` — adăugat: `PmmPlanStatus` (6 stări),
  `PmmCompleteness` (3), `PmmFreshnessStatus` (4), `PmmReviewCycle` (4),
  `PmmDataCollectionMethod` (9 metode), `PmmReviewType` (4 tipuri),
  `PmmReviewRecord` (cu performanceMetrics map + nextReviewISO),
  `PmmVersionChangeType` (8 valori), `PmmVersionChangeRecord` (cu
  substantialModification + riskReassessmentRequired markeri Art. 43(4)),
  `PmmAnomalySeverity` (4), `PmmAnomalyCategory` (8),
  `PmmAnomalyRecord` (cu escalatedToIncident + linkedIncidentId hook
  Sprint 020), `PmmDataCollectionFrequency` (5), `PmmPlan` complet
  (5 secțiuni Art. 72(3) + timelines inline); extins
  `ComplianceState.pmmPlans?`
- `components/ai-act/ai-systems-list.tsx` — adăugat
  `systemsRequiringPmmIds?: Set<string>` prop + render banner Art. 72
  cu link `/dashboard/post-market-monitoring?systemId={id}` (după FRIA +
  Oversight + Logging); update border chaining pe Logging block
- `app/dashboard/sisteme/page.tsx` — fetch `/api/pmm` + calcul
  `systemsRequiringPmmIds` (high-risk OR biometric OR decizii-impact)
- `lib/server/audit-pack-builder.ts` — import `PmmPlan` +
  `buildPmmMarkdown` + `PMM_REVIEW_CYCLE_LABELS`;
  `summary.pmmPlansCount?`; `pushPmmFiles()`; audit trail evenimente
  PMM_PLAN_CREATED / _ACTIVATED / _REVIEW_RECORDED / _VERSION_CHANGE /
  _ANOMALY_RECORDED; SIGNATURE.txt include count
- `components/shell/nav-config.ts` — eliminat `badge: "coming-soon"`;
  section `"compliance"` (era `"builder"`); workspaceModes
  `["ai-builder", "cabinet"]` (era doar `["ai-builder"]`); iconName
  `"Activity"` (era `"TrendingUp"`)
- `lib/server/feature-gates.ts` — `post_market_monitoring` adăugat în
  cabinet workspace + cabinet_pro / cabinet_enterprise tier sets
- `components/shell/nav-config.test.ts` — assertion updates (cabinet vede
  „PMM"; ai-builder placeholder list scoate PMM)
- `lib/server/feature-gates.test.ts` — adăugat assertion
  `featureBelongsToWorkspace("cabinet", "post_market_monitoring") === true`
- `tests/audit-pack-builder-sprint-011.test.ts` — sample state include
  `PmmPlan` complet cu review + version change + anomalie + 4 teste noi
  (paths, registry, records timeline, count) + empty state include
  `pmm/registry.md`

## Files removed

- — (none; placeholder ComingSoonPage înlocuit inline)

---

## Schema changes

- **Supabase:** nimic (folosim `org_state.pmmPlans[]` JSONB)
- **State extension:** `ComplianceState.pmmPlans?: PmmPlan[]` (optional)
- **Backward compat:** state-uri vechi fără pmmPlans continuă să
  funcționeze (undefined tratat ca [])
- **Audit pack manifest:** `summary.pmmPlansCount?: number` (optional;
  zero pe pack-uri vechi)

---

## Tests

- `npx tsc --noEmit`: clean (0 erori)
- `npm run build`: clean — toate rutele înregistrate:
  - `/api/pmm`, `/api/pmm/[id]`, `/api/pmm/[id]/review`,
    `/api/pmm/[id]/version-change`, `/api/pmm/[id]/anomaly`,
    `/api/pmm/[id]/export`, `/api/pmm/trigger-check`
  - `/dashboard/post-market-monitoring` (12.9 kB — era ~1 kB placeholder)
- `npx vitest run`: **795/795 pass** (728 baseline + 67 noi:
  schema 10 + trigger 10 + evaluator 20 + store 23 + audit-pack-sprint-011 +4)
- Live test: pending după push (Vercel auto-deploy)

---

## Decisions made

- **5 secțiuni A-E** (în loc de 4 ca la Logging) — secțiunea E confirmă
  baseline + acoperire lifetime Art. 72(2) explicit, ca să fie clar pentru
  auditor că planul nu este snapshot. Notele sunt opționale aici (pentru
  context suplimentar).
- **9 PmmDataCollectionMethod** acoperă: telemetrie tehnică (system_logs ↔
  Sprint 018, performance_metrics, drift_detection), feedback uman
  (user_feedback, human_oversight_logs ↔ Sprint 017), evaluare fairness
  (bias_metrics), audit (external_audit), incident-driven (incident_reports
  ↔ Sprint 020), other. Multiselect (nu boolean per metodă) — proporțional
  cu riscul (Art. 72(1)).
- **PmmReviewCycle 4 valori** (monthly/quarterly/biannual/annual) cu
  `PMM_REVIEW_CYCLE_MONTHS` map 1/3/6/12 — monthly pentru biometric ID +
  decizii cu impact critic; quarterly minim pentru high-risk Annex III;
  annual marcat explicit ca „NU îndeplinește Art. 72 pentru high-risk".
- **Completeness 3 niveluri** (incomplete/partial/complete) — pattern
  identic cu Logging + Oversight + DPIA pentru consistency UX. Criterii:
  ≥3 metode + eval methods + metrics + corrective + preventive + cycle
  (complete = toate 5, partial = 3-4, incomplete ≤ 2).
- **FreshnessStatus 4 stări** (fresh / due_soon < 30 zile / overdue /
  no_reviews) — separat de completeness pentru că freshness se schimbă în
  timp (un plan complete poate deveni overdue dacă review-ul lunar e sărit).
  Calculat din `nextReviewISO` vs `now`.
- **5 reguli findings** acoperă:
  - plan incomplete pentru high-risk (high) — Art. 72(1)+(3)
  - data collection insuficient < 3 metode (medium) — Art. 72(3)(a)
  - review overdue (high) — Art. 72(2)
  - substantial mod fără re-evaluare risc (**CRITICAL**) — Art. 43(4) +
    Art. 72(4); declanșat când substantial mod + reassessment cerut + fără
    review follow-up în 30 zile după change
  - anomalie critică nerezolvată > 7 zile (high) — Art. 72(4) + Art. 73
- **Critical anomaly = finding IMEDIAT, nu așteaptă 7 zile.** Când
  `recordAnomaly(severity="critical", resolved=false)`, store-ul creează
  finding direct via `createFinding()` cu legal Art. 72(4) + Art. 73 — pentru
  că Art. 73 are termen scurt (2 zile pentru deces / lezare gravă), nu poți
  aștepta 7 zile să se materializeze regula de evaluator.
- **Art. 43(4) marker explicit pe VersionChangeRecord** —
  `substantialModification: boolean` + `riskReassessmentRequired: boolean`.
  Evaluator-ul tratează combo TRUE+TRUE+fără-follow-up-30d ca **CRITICAL**.
  Decizia de a expune aceste flag-uri ca două câmpuri separate (în loc de
  un singur enum) este pentru flexibilitate: o schimbare poate fi
  „substantial dar nu cere reassessment" (rare, dar legal posibil — ex:
  upgrade infrastructură care nu schimbă output) — deployer nu este forțat
  să rebadge ca non-substantial pentru a evita finding-ul.
- **PMM mutat în section "compliance" (nu "builder")** — cabinetele
  preparează planuri PMM Art. 72 pentru clienții deployer (B2B service),
  exact ca FRIA + Oversight + Logging. Mutarea în compliance aliniază cu
  DPIA / FRIA / Oversight / Logging pe cabinet sidebar.
- **PDF export** via Sprint 014 generator (`?format=pdf` route).
- **Stable-ID findings** prefixate `pmm-finding-{recordId}-{rule}` —
  pattern din Sprint 016/017/018 pentru idempotent re-evaluation.
- **AI Inventory banner** trigger criterii largi (high-risk OR biometric OR
  makesAutomatedDecisions+impactsRights) — paritate cu Oversight + Logging
  banners; consistent UX deployer.
- **scheduleReviewReminder(daysBeforeReview)** hook pentru Sprint 022 cron
  Preventive engine — emite event `pmm.review_reminder_scheduled` cu
  computed alertAtISO; Sprint 022 va consuma și trimite email DPO.
- **performanceMetrics ca Record<string, number | string>** (nu doar
  number) — pentru a accepta atât metrici numerice (accuracy=0.92) cât și
  string labels (model_version="v2.1"). UI permite input „key=value" per
  linie + auto-detect numeric.
- **PMM_REVIEW_CYCLE_MONTHS recompute la update** — când deployer schimbă
  ciclul (monthly → quarterly), store-ul recalculează `reviewCycleMonths`
  automat. La următoarea revizie, `nextReviewISO` se calc din noul ciclu.

---

## Concerns / Blockers

- ⚠ **Anomaly escalation către Sprint 020 (AI Incident Art. 73) este
  manuală.** Câmpurile `escalatedToIncident` + `linkedIncidentId` există
  pe `PmmAnomalyRecord`, dar Sprint 020 va construi flow-ul real
  (creează AI Incident Record + link bidirectional + cron escalare după
  threshold severity × days). Pentru moment, deployer-ul setează manual
  flag-ul + ID-ul (după ce Sprint 020 livrează).
- ⚠ **substantialModification self-declared.** Nu există classificator
  automat care detectează „substantial" — Art. 43(4) însuși nu definește
  matematic ce e substantial (Council guidance pending). Pentru moment,
  deployer-ul + DPO decid. Sprint 022 (Preventive engine) ar putea aduce
  un wizard cu întrebări (delta dataset > X%, delta arhitectură DA/NU,
  delta scope deployment DA/NU) care recomandă substantial=true.
- ⚠ **Re-evaluation pe update NU emite findings noi** (pentru a evita
  duplicate) — doar recalculează completeness + freshness. Asta înseamnă
  că dacă deployer scade reviewCycle după create (ex: quarterly →
  annual), nu apare un nou finding în cockpit; trebuie șters planul +
  recreat. Pattern moștenit de la FRIA + Oversight + Logging.
- ⚠ **Performance metrics nu sunt validate semantic.** Un reviewer poate
  pune `accuracy=99999` și store-ul îl acceptă. Validare semantică (ex:
  accuracy ∈ [0, 1], latency_ms > 0) este responsabilitatea utilizatorului
  — UI doar parsează key=value.
- ⚠ **Review cycle calendar = lună × 30 zile (constantă).** Pentru
  precizie audit, ar trebui calcul calendaristic exact, dar 30 zile este
  pragmatic și aliniat cu industry practice (cron jobs folosesc tot 30).
- 🚫 **Niciun blocker.** Sprint 020 (AI Incident Reporting — Art. 73) este unlocked.

---

## Commits

- `b03af23` — feat(sprint-19-1): PmmPlan types + ComplianceState
- `6e4e89c` — feat(sprint-19-2): PMM schema (5 sections, Art. 72(3))
- `dacb67e` — feat(sprint-19-3): PMM trigger detection (high-risk + biometric)
- `1cd4bc7` — feat(sprint-19-4): PMM evaluator (completeness + freshness + finding emission)
- `34a0721` — feat(sprint-19-5): PMM store adapter (CRUD + record review/version/anomaly)
- `e35abbf` — feat(sprint-19-6): PMM API routes (CRUD + review + version-change + anomaly + export)
- `6485494` — feat(sprint-19-7): /dashboard/post-market-monitoring UI with 5-step wizard + reviews/versions/anomalies timeline + Inventory banner
- `b353383` — feat(sprint-19-8): wire PMM into Audit Pack + nav-config coming-soon removed
- (this commit) — docs(sprint-19): sprint log + INDEX update

## Live URL

- Production: `https://eu-ai-act-beige.vercel.app/dashboard/post-market-monitoring`
  (după push + Vercel auto-deploy)

---

## Dependencies

**Requires from previous sprints:**
- Sprint 008A (ComplianceState + findings + events + audit trail foundation)
- Sprint 008B (findings cockpit unde PMM emit findings)
- Sprint 011 (audit-pack-builder pattern + extended manifest)
- Sprint 014 (PDF generator pentru export PMM)
- Sprint 015 (nav-config + role-aware UI + feature gates)
- Sprint 016 (pattern BUILD NEW pentru AI Act depth)
- Sprint 017 (pattern Oversight: human_oversight_logs ca metodă PMM data collection)
- Sprint 018 (pattern Logging: system_logs ca metodă PMM data collection;
  retentionAlert pattern reused as reviewReminder)

**Unlocks for next sprints:**
- Sprint 020 (AI Incident Reporting) — Art. 73 va consuma
  `escalatedToIncident + linkedIncidentId` din PmmAnomalyRecord pentru
  bi-directional link; trigger from PMM anomalie critică spre incident
  draft (15 zile pentru Art. 73 standard, 2 zile pentru deces/lezare gravă)
- Sprint 021 (QMS Workspace) — Art. 17 va consuma planurile PMM ca
  evidență pentru „documented procedures for monitoring throughout
  lifetime"; PMM Plan devine o entry obligatorie în QMS document register
- Sprint 022 (Preventive engine) — `scheduleReviewReminder` ready pentru cron;
  va consuma `pmm.review_reminder_scheduled` events pentru email DPO

---

## Notes pentru următorul agent (Sprint 020 — AI Incident Reporting Art. 73)

- **Pattern stabilit (FRIA + Oversight + Logging + PMM):** module BUILD NEW
  pentru AI Act depth folosesc același template:
  types → schema → trigger/evaluator → store adapter → API routes → UI page
  → wire în audit-pack + nav-config. 8 commits incrementale + 1 docs.
- **Reuse PmmAnomalyRecord ca starting point** pentru Sprint 020 — Art. 73
  cere incident intake + severity + affected system + timeline + notification
  evidence + report draft. Multe din câmpurile PmmAnomaly (severity,
  category, description, impactDescription, escalatedToIncident,
  linkedIncidentId) sunt direct relevante pentru AiIncidentRecord —
  poți defini un schemă subset compatibil.
- **Reuse pattern de freshness + finding emission** pentru Sprint 020 —
  AI Incident are deadline-uri stricte Art. 73:
  - 15 zile pentru incident serios standard
  - 10 zile pentru widespread infringement
  - 2 zile pentru deces sau lezare gravă a sănătății
  Pattern de freshness 4 stări (fresh / due_soon / overdue / no_reviews)
  ar funcționa adaptat: not_submitted / approaching_deadline / overdue /
  submitted.
- **Hook bidirectional cu PMM:** când Sprint 020 creează un AI Incident
  din escaladare anomalie PMM (`PmmAnomalyRecord.escalatedToIncident=true`),
  setează `linkedIncidentId` pe anomalie + `linkedPmmAnomalyId` pe
  incident. Update bidirectional asigură audit trail complet (anomalie
  → incident → autoritate notificată → corrective action în PMM).
- **Test alignment:** dacă schimbi vizibilitatea pe workspaceModes (ex:
  muți Incidents din "builder" → "compliance" pentru cabinet), updatează:
  - `components/shell/nav-config.test.ts` (placeholder assertions — Incidents
    ar trebui scos din lista placeholders, ca PMM aici)
  - `lib/server/feature-gates.test.ts` (workspace assertions)
  - `tests/audit-pack-builder-sprint-011.test.ts` (sample state +
    incidents/registry + records + count)
- **PMM data collection method "incident_reports"** există deja pe schema
  Sprint 019 — Sprint 020 poate consuma activ această sursă în
  `evaluatePmm()` pentru a marca planuri ca „are sursă incidents" (audit
  preferred).
