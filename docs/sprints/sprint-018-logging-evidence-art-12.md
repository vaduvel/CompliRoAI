# Sprint 018 — Logging Evidence (Art. 12 + Art. 26(6) AI Act)

**Status:** DONE
**Faza:** 3 (AI Act Depth — build new)
**Start:** 2026-05-18 ~00:10
**End:** 2026-05-18 ~01:00
**Owner:** manual: Claude (Opus 4.7 1M)

---

## Goal

Build **Logging Evidence** ca workflow mature per **EU AI Act Art. 12 + Art. 26(6)**:
- Config logging per sistem AI (linkat la `AISystemRecord`)
- 13 categorii evenimente Art. 12(2)/(3) (input, output, override, drift, biometric_match_*)
- Storage backend (9 opțiuni: SIEM + cloud-native + local + Supabase)
- Retenție minimă cerută vs actuală (Art. 26(6) ≥6 luni; 12 pentru biometric/drepturi)
- Mecanism integritate (hash_chain / writeonce / signed_writes / external_audit / none)
- Access role + meta-logging (audit acces la logs)
- Câmpuri Art. 12(3) biometric_full **OBLIGATORII** pentru Annex III pt. 1(a)
- LogEvidenceItem cu file hash SHA-256 + perioadă acoperită + eventCount
- Retention status tracking 4 stări (compliant / approaching_expiry / expired / no_evidence)
- Trigger automat: biometric → biometric_full; high-risk → standard; decizii-impact → enhanced
- Findings emise în /dashboard/resolve (6 reguli: categorii, retenție, integritate, biometric, expired, meta-logging)
- scheduleRetentionAlert(daysBeforeExpiry) ca cron hook pentru Sprint 022
- Inclus în Audit Pack (`logging/registry.md` + `logging/records/{id}.md`)
- Replace `/dashboard/logging-evidence` placeholder cu UI real

**BUILD NEW** sprint — niciun donor DPO-OS. CompliRoAI este primul produs RO
care livrează configurări de logging Art. 12 ca workflow auditabil cu
retention tracking integrat.

---

## Task list

- [x] LoggingConfig types + ComplianceState extension (`loggingEvidence?[]`)
- [x] logging-schema.ts (4-section wizard, 13 categorii Art. 12(2)/(3))
- [x] logging-trigger.ts (biometric_full Art. 12(3) + enhanced decizii-impact + standard high-risk)
- [x] logging-evaluator.ts (completeness 3 niveluri + retention 4 stări + 6 reguli findings + markdown)
- [x] logging-evidence-store.ts adapter (CRUD + approve/reject + attachLogEvidence + scheduleRetentionAlert)
- [x] 6 API routes (list/CRUD + approve + evidence + export + trigger-check)
- [x] /dashboard/logging-evidence UI complet (REWRITE peste ComingSoonPage):
  stats + dual filter (status × retention) + 4-step wizard + per-record detail expand + EvidenceModal
- [x] AI Inventory banner (componenta `ai-systems-list.tsx` + `sisteme/page.tsx`)
- [x] Wire în Audit Pack ZIP (`logging/registry.md` + `logging/records/{id}.md`)
- [x] Audit trail events (LOGGING_CONFIG_CREATED / _ACTIVATED / _EVIDENCE_ATTACHED)
- [x] Remove `coming-soon` badge + section "compliance" + cabinet vizibilitate
- [x] feature-gates: `logging_evidence` pentru cabinet workspace +
  cabinet_pro / cabinet_enterprise tiers
- [x] Test alignment (nav-config.test, feature-gates.test, audit-pack-builder-sprint-011.test)
- [x] `npx tsc --noEmit` clean
- [x] `npx vitest run` 728/728 pass (665 + 63 noi)
- [x] `npm run build` clean — toate rutele logging-evidence registrate
- [x] Sprint log + INDEX update
- [x] 8 code commits + 1 docs commit push la origin/main

---

## Files created

- `lib/compliance/logging-schema.ts` — 4 secțiuni × 10+ întrebări +
  paritate completă pe labels (severity, storage, event categories, integrity)
  + DEFAULT_MIN_RETENTION_MONTHS_BY_SEVERITY mapping (3/6/12/12)
- `lib/compliance/logging-schema.test.ts` — 15 teste structurale
- `lib/compliance/logging-trigger.ts` — `evaluateLoggingRequirement()` +
  `findSystemsNeedingLogging()`; reguli biometric (Art. 12(3)) +
  decizii-impact (enhanced+12mo) + high-risk (standard+6mo); urgency
  before_use / periodic_review (>90 zile) / none
- `lib/compliance/logging-trigger.test.ts` — 9 teste (combo biometric+impact)
- `lib/compliance/logging-evaluator.ts` — `computeLoggingCompleteness()` +
  `computeRetentionStatus()` + `evaluateLogging()`; 6 reguli findings;
  markdown export complet cu secțiunile A-D + biometric Art. 12(3) câmpuri
  + checklist final
- `lib/compliance/logging-evaluator.test.ts` — 18 teste (completeness 3 niveluri
  + retention 4 stări + 6 reguli + markdown)
- `lib/server/logging-evidence-store.ts` — adapter CRUD + approve/reject +
  attachLogEvidence + scheduleRetentionAlert + buildLoggingMarkdown;
  nextReviewISO setat auto la +90 zile la create
- `lib/server/logging-evidence-store.test.ts` — 17 teste (CRUD + biometric +
  evidence attach cu recalc retentionStatus + alert scheduling)
- `app/api/logging-evidence/route.ts` — GET list (filters status/completeness/
  retentionStatus/linkedAISystemId) + POST
- `app/api/logging-evidence/[id]/route.ts` — GET + PATCH + DELETE
- `app/api/logging-evidence/[id]/approve/route.ts` — POST approve sau reject
- `app/api/logging-evidence/[id]/evidence/route.ts` — POST attach LogEvidenceItem
- `app/api/logging-evidence/[id]/export/route.ts` — markdown + PDF via Sprint 014
- `app/api/logging-evidence/trigger-check/route.ts` — POST {systemId} → trigger
- `app/dashboard/logging-evidence/page.tsx` — REWRITE complet (~1500 linii):
  stats + dual filter (status × retentionStatus) + banner Inventory +
  4-step LoggingWizard cu biometric_specifics condițional +
  ConfigRow expand cu Section A-D + BiometricChips + evidence table +
  EvidenceModal cu hash + perioadă + eventCount
- `docs/sprints/sprint-018-logging-evidence-art-12.md` — acest fișier

## Files modified

- `lib/compliance/types.ts` — adăugat: `LoggingSeverityLevel`,
  `LoggingStorageBackend`, `LoggingConfigStatus`, `LoggingCompleteness`,
  `LoggingRetentionStatus`, `LoggingEventCategory` (13 values),
  `LogEvidenceItem` (cu fileHash + period + eventCount),
  `LoggingBiometricSpecifics`, `LoggingConfig`; extins
  `ComplianceState.loggingEvidence?`
- `components/ai-act/ai-systems-list.tsx` — adăugat
  `systemsRequiringLoggingIds?: Set<string>` prop + render banner Art. 12
  cu link `/dashboard/logging-evidence?systemId={id}` (după FRIA + Oversight)
- `app/dashboard/sisteme/page.tsx` — fetch `/api/logging-evidence` + calcul
  `systemsRequiringLoggingIds` (high-risk OR biometric OR decizii-impact)
- `lib/server/audit-pack-builder.ts` — import `LoggingConfig` +
  `buildLoggingMarkdown` + logging-schema labels; `summary.loggingConfigsCount?`;
  `pushLoggingFiles()`; audit trail evenimente; SIGNATURE.txt include count
- `components/shell/nav-config.ts` — eliminat `badge: "coming-soon"`; section
  `"compliance"` (era `"builder"`); workspaceModes `["ai-builder", "cabinet"]`;
  iconName `"Database"` (vs Activity placeholder)
- `lib/server/feature-gates.ts` — `logging_evidence` adăugat în
  cabinet workspace + cabinet_pro/cabinet_enterprise tier sets
- `components/shell/nav-config.test.ts` — assertion updates (cabinet vede
  „Logging"; ai-builder placeholder list scoate Logging)
- `lib/server/feature-gates.test.ts` — adăugat assertion
  `featureBelongsToWorkspace("cabinet", "logging_evidence") === true`
- `tests/audit-pack-builder-sprint-011.test.ts` — sample state include
  `LoggingConfig` complet + 4 teste noi (paths, registry, records, count)

## Files removed

- — (none; placeholder ComingSoonPage înlocuit inline)

---

## Schema changes

- **Supabase:** nimic (folosim `org_state.loggingEvidence[]` JSONB)
- **State extension:** `ComplianceState.loggingEvidence?: LoggingConfig[]` (optional)
- **Backward compat:** state-uri vechi fără loggingEvidence continuă să
  funcționeze (undefined tratat ca [])
- **Audit pack manifest:** `summary.loggingConfigsCount?: number` (optional;
  zero pe pack-uri vechi)

---

## Tests

- `npx tsc --noEmit`: clean (0 erori)
- `npm run build`: clean — toate rutele înregistrate:
  - `/api/logging-evidence`, `/api/logging-evidence/[id]`,
    `/api/logging-evidence/[id]/approve`, `/api/logging-evidence/[id]/evidence`,
    `/api/logging-evidence/[id]/export`, `/api/logging-evidence/trigger-check`
  - `/dashboard/logging-evidence` (12.2 kB — era ~1 kB placeholder)
- `npx vitest run`: **728/728 pass** (665 baseline + 63 noi:
  schema 15 + trigger 9 + evaluator 18 + store 17 + audit-pack-sprint-011 +4)
- Live test: pending după push (Vercel auto-deploy)

---

## Decisions made

- **LoggingSeverityLevel cu 4 valori** (minimal/standard/enhanced/biometric_full)
  în loc de boolean simplu — pentru că Art. 12(1) nu este uniform pentru toate
  sistemele AI; severitatea trebuie proporțională cu Annex III + impactul
  drepturilor (Art. 12(2)) și biometric ID are cerințe distincte (Art. 12(3)).
- **13 LoggingEventCategory** acoperă Art. 12(2) + Art. 12(3) biometric pair +
  evenimente Art. 14 (override, stop) + Art. 72 (drift, model updates) +
  Art. 79(1) (erori). Multiselect (nu boolean per categorie) — deployer poate
  loga unele, nu altele.
- **DEFAULT_MIN_RETENTION_MONTHS_BY_SEVERITY** 3/6/12/12 — Art. 26(6)
  minimum 6 pentru high-risk (standard); 12 pentru enhanced + biometric_full
  (overlay GDPR Art. 9 date sensibile + Convenția 108 + bune practici).
- **Completeness 3 niveluri** (incomplete / partial / complete) — pattern
  identic cu DPIA + Oversight pentru consistency UX.
- **Retention status 4 stări** (compliant / approaching_expiry / expired /
  no_evidence) — separat de completeness pentru că retenția se schimbă în timp
  (un config complete poate avea retention expired peste 6 luni). Calculat din
  `lastEvidenceAtISO + actualRetentionMonths` vs `now`.
- **6 reguli findings** acoperă:
  - categorii < 3 (high) — Art. 12(2)
  - retenție insuficientă (high) — Art. 26(6)
  - lipsă integritate (medium) — Art. 12(1)
  - biometric fără Art. 12(3) full coverage (**critical**) — direct Art. 12(3)
  - logs expirate (high) — Art. 26(6) retentionStatus
  - lipsă meta-logging (medium) — bune practici ISO 27001
- **nextReviewISO setat auto la create** la +90 zile — mai des decât Oversight
  (180) pentru că logs sunt dinamice (retention rules + integrity proofs pot
  drift fără să te aștepți).
- **Section "compliance" (nu "builder")** — cabinetele preparează configurări
  logging Art. 12 pentru clienții deployer (B2B service), exact ca FRIA +
  Oversight. Mutarea în compliance aliniază cu DPIA / FRIA / Oversight pe
  cabinet sidebar.
- **PDF export** via Sprint 014 generator (`?format=pdf` route).
- **Stable-ID findings** prefixate `logging-finding-{recordId}-{rule}` —
  pattern din Sprint 016/017 pentru idempotent re-evaluation.
- **AI Inventory banner** trigger criterii largi (high-risk OR biometric OR
  makesAutomatedDecisions+impactsRights) — paritate cu Oversight banner;
  consistent UX deployer.
- **scheduleRetentionAlert(daysBeforeExpiry)** hook pentru Sprint 022 cron
  Preventive engine — emite event `logging.retention_alert_scheduled` cu
  computed alertAtISO; Sprint 022 va consuma și trimite email DPO.
- **LogEvidenceItem cu fileHash + period + eventCount** — semnal explicit că
  dovada poate fi verificată tamper-evidence + corelată cu retention policy
  (sample audit: „Am acoperit perioada 2026-05-01 → 2026-05-31 cu 124.567
  events din SIEM, hash SHA-256 = abc...").

---

## Concerns / Blockers

- ⚠ **Storage upload real** — la fel ca Oversight, LogEvidenceItem stochează
  doar URL + nume fișier + hash declarat. Upload real în Supabase Storage va
  veni în Sprint 022 (Preventive engine) sau ulterior. Pentru moment, dovada
  este auditabilă prin URL extern (S3, SharePoint, etc.).
- ⚠ **Re-evaluation pe update** NU emite findings noi (pentru a evita
  duplicate) — doar recalculează completeness + retentionStatus. Asta
  înseamnă că dacă deployer scade actualRetentionMonths după create, nu apare
  un nou finding în cockpit; trebuie șters config-ul + recreat. Pattern
  moștenit de la FRIA + Oversight.
- ⚠ **Biometric Full coverage** este self-declared (4 boolean flags). Nu
  facem verificare automată că logs reale conțin aceste câmpuri — auditor-ul
  va deschide manual evidence items + verifică SIEM. Sprint 022 va putea
  parsa log samples automat (parse JSON și verificare schema).
- ⚠ **Retention computation** asumă lună = 30 zile (constantă). Pentru
  precizie audit, ar trebui calcul calendaristic exact, dar 30 zile este
  pragmatic și aliniat cu industry practice (SIEM ILM rules folosesc tot 30).
- 🚫 **Niciun blocker.** Sprint 019 (Post-Market Monitoring — Art. 72) este unlocked.

---

## Commits

- `0bfad18` — feat(sprint-18-1): LoggingConfig types + ComplianceState
- `5507a82` — feat(sprint-18-2): logging schema (4 sections, Art. 12 event categories)
- `a862524` — feat(sprint-18-3): logging trigger detection (Art. 12(3) biometric + Art. 26(6) retention)
- `a79d44b` — feat(sprint-18-4): logging evaluator (completeness + retention status + finding emission)
- `7200f3f` — feat(sprint-18-5): logging-evidence store adapter (CRUD + attach evidence + retention tracking)
- `77ba998` — feat(sprint-18-6): logging-evidence API routes (CRUD + evidence + export + trigger-check)
- `1001a77` — feat(sprint-18-7): /dashboard/logging-evidence UI with 4-step wizard + retention badges + Inventory banner
- `dd1676c` — feat(sprint-18-8): wire Logging into Audit Pack + nav-config coming-soon removed
- (this commit) — docs(sprint-18): sprint log + INDEX update

## Live URL

- Production: `https://eu-ai-act-beige.vercel.app/dashboard/logging-evidence`
  (după push + Vercel auto-deploy)

---

## Dependencies

**Requires from previous sprints:**
- Sprint 008A (ComplianceState + findings + events + audit trail foundation)
- Sprint 008B (findings cockpit unde Logging emit findings)
- Sprint 011 (audit-pack-builder pattern + extended manifest)
- Sprint 014 (PDF generator pentru export Logging)
- Sprint 015 (nav-config + role-aware UI + feature gates)
- Sprint 016 (pattern BUILD NEW pentru AI Act depth)
- Sprint 017 (pattern Oversight: trigger + evaluator + store + UI banner)

**Unlocks for next sprints:**
- Sprint 019 (Post-Market Monitoring) — Art. 72 va consuma event categories
  `model_updated`, `data_drift_detected`, `error_or_anomaly` din logging
- Sprint 020 (AI Incident Reporting) — Art. 73 va corela `error_or_anomaly`
  cu severity escalation; trigger from logs spre incident draft
- Sprint 022 (Preventive engine) — `scheduleRetentionAlert` ready pentru cron;
  va consuma `logging.retention_alert_scheduled` events pentru email DPO

---

## Notes pentru următorul agent (Sprint 019 — Post-Market Monitoring Art. 72)

- **Pattern stabilit (FRIA + Oversight + Logging):** module BUILD NEW pentru
  AI Act depth folosesc același template:
  types → schema → trigger/evaluator → store adapter → API routes → UI page
  → wire în audit-pack + nav-config. 8 commits incrementale + 1 docs.
- **Reuse LogEvidenceItem ca starting point** pentru Sprint 019 — Art. 72
  cere monitoring plan + performance review + version changes + incidents.
  PMM ar putea consuma direct `loggingEvidence[].evidenceItems` ca telemetrie
  baseline pentru drift detection. Modelul PMM = MonitoringPlan record per
  AI system + periodic ReviewCycle records.
- **Reuse pattern de retention status** pentru Sprint 019 — PMM are
  „lastReviewedAtISO" cu next due; același 4-state pattern
  (current/approaching/overdue/no_review) ar funcționa.
- **Trigger pattern:** când există protocol Art. 14 aprobat + config Art. 12
  activ pe sistem, PMM Art. 72 devine obligatoriu de demonstrat. Sprint 019
  trigger se poate baza pe combo `humanOversightProtocols + loggingEvidence`
  ambele aprobate.
- **Test alignment:** dacă schimbi vizibilitatea pe workspaceModes (ex: muți
  PMM din "builder" → "compliance" pentru cabinet), updatează:
  - `components/shell/nav-config.test.ts` (placeholder assertions)
  - `lib/server/feature-gates.test.ts` (workspace assertions)
  - `tests/audit-pack-builder-sprint-011.test.ts` (sample state + asserts)
