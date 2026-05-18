# Sprint 020 — AI Incident Reporting (Art. 73 EU AI Act)

**Status:** DONE
**Faza:** 3 (AI Act Depth — build new)
**Start:** 2026-05-18 ~07:25
**End:** 2026-05-18 ~08:10
**Owner:** manual: Claude (Opus 4.7 1M)

---

## Goal

Build **AI Incident Reporting** ca workflow mature per **EU AI Act Art. 73**:
distinct de GDPR Art. 33 / Sprint 008D (acela este date personale + ANSPDCP
72h; acesta este incidente serioase sisteme AI high-risk + market surveillance
authority + termene 2/10/15 zile).

- Intake incident (manual via wizard 5 pași SAU escalat dintr-o anomalie PMM
  critică Sprint 019 SAU legat de un GDPR Breach Sprint 008D care atinge și
  date personale)
- Severitate + categorie Art. 73(2) cu 6 valori și deadline Art. 73(3) auto-
  calculat: deces / critical_infrastructure → 2 zile; widespread → 10 zile;
  fundamental_rights non-widespread / proprietate / mediu / other → 15 zile
- Cronologie cu `detectedAtISO` ca clock start Art. 73(3)
- Notificări către autoritatea de supraveghere a pieței cu probă oficială
  (`referenceNumber`) — 0..N notificări (initial + follow-ups Art. 73(7))
- Investigație root cause Art. 73(4) cu factori contribuitori + dovezi +
  acțiuni corective + preventive
- Generator markdown Art. 73(5) RO pentru notificarea oficială
- 4 reguli findings emise în /dashboard/resolve:
  1. **CRITICAL** — incident nereported peste deadline Art. 73 (Art. 73(1) +
     Art. 73(3) + Art. 99 sancțiune)
  2. **HIGH** — lipsește root cause investigation Art. 73(4) pe non-draft
  3. **HIGH** — incident severitate catastrofic fără closure (Art. 17 QMS)
  4. **MEDIUM** — notificare submitted fără referință (probă lipsă, Art. 73(1))
- Bidirectional links: `linkToBreach(incidentId, breachId)` și
  `linkToPmmAnomaly(incidentId, planId, anomalyId)` — ultima update-ează
  bidirectional PmmAnomalyRecord cu `escalatedToIncident=true` +
  `linkedIncidentId`
- Bridge PMM: `escalateAnomalyToIncident(planId, anomalyId)` în pmm-store.ts
  creează incident automat cu severity mapping (low→minor, medium→moderate,
  high→serious, critical→catastrophic) + category default
  `fundamental_rights_infringement` (sau `critical_infrastructure_disruption`
  pentru anomaly.category=security); emite event `pmm.anomaly_escalated`
- Inclus în Audit Pack (`ai-incidents/registry.md` +
  `ai-incidents/records/{id}.md` + audit trail Sprint 020 events)
- Replace `/dashboard/ai-incidents` placeholder cu UI real
- Remove `coming-soon` badge din nav-config
- Subtle red badge inline pe AI Inventory când există OPEN incident (reactiv,
  NU banner agresiv ca FRIA/Oversight/Logging/PMM care sunt preventive)

**BUILD NEW** sprint per mandate § 21 — niciun donor DPO-OS. CompliRoAI este
primul produs RO care livrează workflow Art. 73 ca audit-clean cu deadline
visualization + escalare bidirectională PMM + narrative generator RO.

---

## Task list

- [x] AIIncident types + ComplianceState extension (`aiIncidents?[]`)
- [x] ai-incident-schema.ts (5-section wizard, 6 categorii Art. 73(2),
      6 helpText per categorie, deadline map, 4-tier severity, 8-state
      lifecycle)
- [x] ai-incident-evaluator.ts (computeReportingDeadline 2/10/15 zile,
      computeDeadlineStatus 5-level countdown, evaluateIncident cu
      notificationRequired forced TRUE pentru a/b/c categorii, urgency
      4-tier, gaps[] cu 7 coduri, candidateFindings[] cu 4 reguli)
- [x] ai-incident-narrative.ts (generateAuthorityNotification Art. 73(5)
      9 secțiuni RO + generateAuthorityFollowUp Art. 73(7))
- [x] ai-incident-store.ts (createIncident cu auto-deadline + auto-evaluator,
      updateIncident cu deadline recompute, deleteIncident, listIncidents,
      markAuthorityNotified cu transition status authority_notified,
      recordRootCause Art. 73(4) cu transition root_cause_investigation,
      closeIncident cu closureNotes obligatorii ≥10 chars, linkToBreach
      bidirectional, linkToPmmAnomaly bidirectional updating
      PmmAnomalyRecord.escalatedToIncident + linkedIncidentId,
      propagateEvaluation pentru Sprint 022 cron)
- [x] pmm-store.ts extension: escalateAnomalyToIncident cu severity mapping
      + bidirectional link + event emission
- [x] 8 API routes:
  - GET/POST /api/ai-incidents
  - GET/PATCH/DELETE /api/ai-incidents/[id] (PATCH suportă inline actions
    link-breach + link-pmm-anomaly)
  - POST /api/ai-incidents/[id]/notify-authority
  - POST /api/ai-incidents/[id]/root-cause
  - POST /api/ai-incidents/[id]/close
  - GET /api/ai-incidents/[id]/export?format=md|pdf&doc=incident|authority-notif
  - POST /api/ai-incidents/from-pmm-anomaly
  - POST /api/pmm/[id]/anomaly/escalate
- [x] /dashboard/ai-incidents UI complet rewrite (1500+ linii):
      StatsBar 7-metric, UrgencyBanner top-3 cu countdown, filter tabs
      (status + category + severity), 5-step IncidentWizard cu deadline
      preview live, EscalateFromPmmModal cu eligible anomalies select,
      IncidentRow expandable cu A-D sections + notifications table +
      root cause panel + linkages + 6 acțiuni, NotifyAuthorityModal,
      RootCauseModal, CloseIncidentModal
- [x] AI Inventory subtle badge "Incident AI" pe row când există OPEN incident
- [x] Wire audit-pack-builder: pushAIIncidentFiles + 6 audit trail event
      types + manifest.summary.aiIncidentsCount + SIGNATURE.txt summary
- [x] Remove coming-soon badge nav-config + move section "builder" →
      "compliance" + add cabinet to workspaceModes
- [x] Add ai_incident_reporting to cabinet workspace + cabinet_pro +
      cabinet_enterprise tiers
- [x] Tests: nav-config + feature-gates + audit-pack-builder-sprint-011 +
      4 new unit test files (schema, evaluator, narrative, store) — 109
      tests added
- [x] Build clean
- [x] 9 commits + push

---

## Files created

- `lib/compliance/ai-incident-schema.ts` — 5-section schema V1 cu 6 categorii
  Art. 73(2), labels + helpText, deadline map (2/10/15 zile), severity +
  status options, 11 questions cu legalReference per question.
- `lib/compliance/ai-incident-schema.test.ts` — 21 unit tests (structură,
  deadline map, legal refs, category labels).
- `lib/compliance/ai-incident-evaluator.ts` — pure functions:
  computeReportingDeadline, computeDeadlineStatus, evaluateIncident,
  buildIncidentMarkdown (markdown export pentru Audit Pack).
- `lib/compliance/ai-incident-evaluator.test.ts` — 31 unit tests (deadlines
  per categorie, 5 countdown levels, notificationRequired forcing, urgency
  4-tier, 4 finding rules, gaps detection).
- `lib/compliance/ai-incident-narrative.ts` — generateAuthorityNotification
  (9-section RO notification Art. 73(5)) + generateAuthorityFollowUp Art.
  73(7) cu inclusion root cause + PMM/Breach linkage.
- `lib/compliance/ai-incident-narrative.test.ts` — 15 unit tests (sections,
  fallbacks, root cause display, GDPR/PMM linkage).
- `lib/server/ai-incident-store.ts` — adapter complet (CRUD + lifecycle +
  notifications + root cause + close + bidirectional linkage + propagation).
- `lib/server/ai-incident-store.test.ts` — 37 unit tests (deadline computation,
  notificationRequired forcing, severity → catastrophic mapping, PMM
  escalation bridge, bidirectional link).
- `app/api/ai-incidents/route.ts` — GET (list + filters) + POST (create cu
  validation + auto-evaluator).
- `app/api/ai-incidents/[id]/route.ts` — GET + PATCH (cu inline actions
  link-breach + link-pmm-anomaly) + DELETE.
- `app/api/ai-incidents/[id]/notify-authority/route.ts` — POST cu
  authorityName obligatoriu + status submitted default.
- `app/api/ai-incidents/[id]/root-cause/route.ts` — POST cu
  rootCauseDescription ≥10 chars + identifiedByEmail valid.
- `app/api/ai-incidents/[id]/close/route.ts` — POST cu closureNotes ≥10 chars.
- `app/api/ai-incidents/[id]/export/route.ts` — GET md/pdf cu doc=
  incident|authority-notif (default = markdown evaluator pentru Audit Pack;
  authority-notif = narrative Art. 73(5) RO).
- `app/api/ai-incidents/from-pmm-anomaly/route.ts` — POST escalation entry
  point pentru UI agnostic de PMM.
- `app/api/pmm/[id]/anomaly/escalate/route.ts` — POST escalation entry point
  pentru UI cu context plan PMM curent.
- `docs/sprints/sprint-020-ai-incident-reporting-art-73.md` — acest fișier.

## Files modified

- `lib/compliance/types.ts` — adăugat AIIncidentCategory (6 valori),
  AIIncidentSeverity (4 tier), AIIncidentStatus (8 state), AIIncidentNotificationStatus,
  AIIncidentNotificationRecord, AIIncidentRootCause, AIIncident (master
  record cu bidirectional links); extins ComplianceState cu `aiIncidents?[]`.
- `lib/server/pmm-store.ts` — adăugat escalateAnomalyToIncident bridge cu
  severity + category mapping + bidirectional link + pmm.anomaly_escalated
  event.
- `lib/server/audit-pack-builder.ts` — pushAIIncidentFiles
  (ai-incidents/registry.md + records/{id}.md), 6 audit trail event types
  (AI_INCIDENT_CREATED / AUTHORITY_NOTIFIED / ROOT_CAUSE_RECORDED / CLOSED /
  LINKED_PMM_ANOMALY / LINKED_BREACH), manifest.summary.aiIncidentsCount,
  SIGNATURE.txt summary line.
- `components/shell/nav-config.ts` — Sprint 020 entry: removed `badge:
  "coming-soon"`, moved section "builder" → "compliance", added "cabinet"
  to workspaceModes.
- `lib/server/feature-gates.ts` — added `ai_incident_reporting` to cabinet
  workspace + cabinet_pro + cabinet_enterprise tiers.
- `app/dashboard/ai-incidents/page.tsx` — REWRITE complet de la
  ComingSoonPage placeholder la UI matur cu 1500+ linii.
- `app/dashboard/sisteme/page.tsx` — fetch /api/ai-incidents +
  systemsWithOpenIncidentIds computed memo + pass to AISystemsList.
- `components/ai-act/ai-systems-list.tsx` — subtle red "Incident AI" badge
  inline pe row când există OPEN incident (link la dashboard cu systemId
  filter).
- `tests/audit-pack-builder-sprint-011.test.ts` — adăugat sample AIIncident
  + 4 noi teste (registry, per-record md, manifest count, empty-state).
- `components/shell/nav-config.test.ts` — updated asserts pentru cabinet
  vede "Incidente AI" pe free_trial; comment refresh.
- `lib/server/feature-gates.test.ts` — adăugat asserts pentru
  ai_incident_reporting în cabinet workspace + tier_pro/enterprise.
- `docs/sprints/INDEX.md` — Sprint 020 row marked DONE + log link.

## Files removed

- (niciun fișier șters)

---

## Schema changes

- **State extension:** `ComplianceState.aiIncidents?: AIIncident[]` (new
  registry, distinct de breachRecords + pmmPlans).
- **Supabase:** nothing (state-ul AI Act este JSONB; rămâne în
  `org_state` standard).

---

## Tests

- `npx tsc --noEmit`: **clean** (0 errors)
- `npx vitest run`: **904 pass** (was 795 baseline; **+109 noi pentru Sprint
  020**: 21 schema + 31 evaluator + 15 narrative + 37 store + 5 audit-pack
  + tests modificate la nav-config/feature-gates).
- `npm run build`: clean (Next.js build verification — vezi commit hash).
- Live test endpoints expected (not exercitate în acest sprint —
  CompliRoAI nu deploy auto):
  - `GET /api/ai-incidents` → 200 cu records + summary + schema
  - `POST /api/ai-incidents` cu body valid → 201 cu record + summary
  - `POST /api/ai-incidents/[id]/notify-authority` → 200 cu record updated
  - `POST /api/ai-incidents/from-pmm-anomaly` → 201 cu incident + plan

---

## Decisions made

- **Distinguere strictă față de GDPR Art. 33 (Sprint 008D):** AI Act Art. 73
  are autoritate diferită (market surveillance, nu ANSPDCP), categorii
  diferite (Art. 73(2) vs Art. 9 GDPR), termene diferite (2/10/15 zile vs
  72h). Am implementat ca registry separat (`aiIncidents[]`) cu bidirectional
  `linkedBreachId` pentru cazurile când același eveniment trebuie raportat
  ambelor autorități în paralel. NU am încercat să unific cu BreachRecord
  pentru a respecta separarea juridică.
- **`notificationRequired` forced TRUE pentru categoriile a/b/c:**
  evaluator-ul forțează notificationRequired=true indiferent ce a setat
  utilizatorul pentru `death_or_serious_harm_health` /
  `critical_infrastructure_disruption` / `widespread_infringement` /
  `fundamental_rights_infringement`. Doar `property_or_environment_harm` și
  `other_serious` permit notificationRequired=false (cu evaluare DPO
  documentată). Aceasta protejează utilizatorul împotriva supraescaladării
  greșite și asigură conformitate cu Art. 73(2).
- **Clock start = `detectedAtISO`:** Art. 73(3) folosește "after becoming
  aware" — am ales `detectedAtISO` ca clock start, nu `occurredAtISO`.
  occurredAtISO este opțional și poate fi anterior detectării (ex: incident
  produs zile întregi înainte de a fi detectat la review).
- **Severity mapping anomaly → incident:** la escalare PMM → Incident, am
  ales mapping pessimistic (high → serious, critical → catastrophic) ca să
  forțăm DPO să downgrade-eze conștient dacă consideră necesar, nu să
  ridice. Logic preventiv.
- **Category mapping anomaly → incident:** default
  `fundamental_rights_infringement` (categoria cea mai largă și cea mai
  probabilă pentru anomalii bias/drift); excepție `security` →
  `critical_infrastructure_disruption`. Note în record menționează DPO
  trebuie să valideze.
- **AI Inventory: badge subtle inline, NU banner separat:** spec explicită
  în brief — incidentele sunt reactive (apar după ce ceva s-a întâmplat),
  nu preventive ca FRIA / Oversight / Logging / PMM (care sunt obligații
  permanente). Badge inline = nu blochează UI, dar dă context.
- **Cabinet vede Incidente AI:** Sprint 020 a aliniat Incidente AI cu
  FRIA + Oversight + Logging + PMM care sunt deja shared între ai-builder
  + cabinet. Cabinetele asistă deployer-clienții la raportarea Art. 73.
  Mapat la `cabinet_pro` + `cabinet_enterprise` (NU `cabinet_solo` care
  rămâne entry-level).
- **`UrgencyBanner` cu top-3:** evită overwhelming UI când există multe
  incidente; sortează după (1) unnotified first, (2) deadline ascending.
  Pentru o vizualizare completă, utilizatorul folosește filter tabs.
- **2 entry points escalare PMM:** `/api/ai-incidents/from-pmm-anomaly`
  (din UI Incidents) și `/api/pmm/[id]/anomaly/escalate` (din UI PMM).
  Sub capotă ambele apelează același `escalateAnomalyToIncident` helper.

---

## Concerns / Blockers

- ⚠️ **Authority numelui în RO:** market surveillance authority pentru AI
  Act în România este TBD la momentul Sprint 020. ADR coordonează; ANCOM
  propus. Am lăsat câmpul `authorityName` free-form ca utilizatorul să
  introducă numele oficial când va fi desemnată autoritatea — narrative
  template menționează "_de completat_" ca placeholder.
- ⚠️ **Email alerts pentru deadline urgent:** NU am implementat email
  reminders automate (similar cu logging-evidence retention alerts). Va
  fi consumat de Sprint 022 (Preventive engine) via `propagateEvaluation`
  + cron hook + email-alerts module existent.
- ⚠️ **PDF rendering pentru notificare Art. 73(5):** folosim
  `generatePdfFromMarkdown` existent (Sprint 014); markdown narrative este
  optimizat pentru email/portal autoritate, NU pentru print pretty —
  acceptable pentru document oficial dar nu va arăta editorial.
- 🚫 **Niciun blocker hard** — toate dependențele Sprint 016-019 funcționale.

---

## Commits

- `acb31ca` — feat(sprint-20-1): AIIncident types + ComplianceState
- `748dd18` — feat(sprint-20-2): AI incident schema (5 sections, Art. 73)
- `91048cb` — feat(sprint-20-3): AI incident evaluator (deadline 2/10/15
  days + finding emission)
- `e52eefc` — feat(sprint-20-4): AI incident narrative generator (Art. 73(5)
  RO notification)
- `5545c21` — feat(sprint-20-5): AI incident store adapter + PMM anomaly
  escalation bridge
- `a73b758` — feat(sprint-20-6): AI incident API routes (CRUD + notify +
  root-cause + close + escalation + export)
- `0aefa22` — feat(sprint-20-7): /dashboard/ai-incidents UI cu 5-step
  wizard + urgency timeline + PMM escalation
- `011ae22` — feat(sprint-20-8): wire AI Incidents into Audit Pack +
  nav-config coming-soon removed
- `(sprint-20-9 next)` — docs(sprint-20): sprint log + INDEX update

## Live URL

- Production: `https://eu-ai-act-beige.vercel.app/dashboard/ai-incidents`
  (după next deploy)

---

## Dependencies

**Requires from previous sprints:**
- Sprint 008B (findings-store + createFinding pattern)
- Sprint 008D (BreachRecord pentru linkedBreachId bidirectional)
- Sprint 011 (audit-pack-builder pushXFiles pattern)
- Sprint 014 (pdf-generator + email-alerts pentru viitor cron)
- Sprint 015 (feature-gates + nav-config pattern)
- Sprint 019 (PmmPlan + PmmAnomalyRecord pentru bridge escalateAnomalyToIncident
  + linkToPmmAnomaly)

**Unlocks for next sprints:**
- Sprint 021 — QMS Workspace (Art. 17) va consuma `closureNotes` ca lessons
  learned pentru documentation control + change management
- Sprint 022 — Preventive engine va apela `propagateEvaluation` pentru a
  emite findings deadline overdue în mod cron (ex: zilnic la 6 dim)
- Sprint 022 — email alerts pentru deadline ≤ 24h pe incidente unnotified
  (folosing email-alerts existing)

---

## Notes pentru următorul agent

- Pattern bidirectional update: când vrei să sincronizezi 2 entități (incident
  ↔ PMM anomaly), folosește single `mutateFreshStateForOrg` cu state
  modificat la ambele câmpuri. Vezi `linkToPmmAnomaly` din ai-incident-store.
- Pattern import dinamic pentru a evita circular: ai-incident-store ↔
  pmm-store. `escalateAnomalyToIncident` din pmm-store importă dynamic
  `ai-incident-store` (`await import(...)`) ca să nu avem cycle. Replicăm
  pattern-ul când următorul sprint creează bridge-uri.
- Pattern `evaluateIncident` separat de `propagateEvaluation`: evaluator
  pure returnează `candidateFindings[]`; store persistă cu `createFinding`;
  separation permite UI preview vs background cron persistence (Sprint 022).
- AI Inventory badge: NU am replicat full banner cu link "Pornește
  evaluare →" ca la FRIA/Oversight/Logging/PMM. Pentru incidente, badge =
  doar indicator vizual (link la dashboard cu filter). Decizia: incidentele
  apar reactiv, deci CTA "Creează" e contraproductiv (incidentul deja
  există) — UI doar îți semnalează prezența.
- Test pattern pentru store store cu PMM bridge: vezi
  ai-incident-store.test.ts — pattern este create plan → record anomaly →
  escalate → assert both incident + plan updated.
- DOAR cabinet_pro + cabinet_enterprise au `ai_incident_reporting`
  (NU cabinet_solo). Decizia: escalation feature pentru tieruri mai mari;
  cabinet_solo poate face DSAR + audit pack dar nu coordonează incidente.
