# Sprint 017 — Human Oversight Protocols (Art. 14 AI Act)

**Status:** DONE
**Faza:** 3 (AI Act Depth — build new)
**Start:** 2026-05-17 ~23:30
**End:** 2026-05-18 ~00:10
**Owner:** manual: Claude (Opus 4.7 1M)

---

## Goal

Build **Human Oversight Protocols** ca workflow mature per **EU AI Act Art. 14**:
- Protocol per sistem AI (linkat la `AISystemRecord`)
- Cele 5 capacități obligatorii Art. 14(3)(a)-(e)
- Responsabili Art. 26(2) cu competență + autoritate + suport
- Workflow escaladare + procedură contestație (Art. 86 + GDPR Art. 22)
- Procedură stop + fallback (Art. 14(3)(e) + Art. 14(4)(d))
- Two-person rule **OBLIGATORIU** pentru biometric ID (Art. 14(4))
- Checklist evidență per auditor + dovezi atașate
- Trigger automat pentru high-risk / biometric / decizii-impact
- Findings emise în /dashboard/resolve când protocol incomplet
- Inclus în Audit Pack
- Replace `/dashboard/human-oversight` placeholder cu UI real

**BUILD NEW** sprint — niciun donor DPO-OS. CompliRoAI este primul produs RO
care livrează protocoale Art. 14 ca workflow auditabil.

---

## Task list

- [x] HumanOversightProtocol types + ComplianceState extension
- [x] oversight-schema.ts (5-section wizard, Art. 14(3) capabilities)
- [x] oversight-trigger.ts (high-risk + biometric Art. 14(4))
- [x] oversight-evaluator.ts (completeness 3 niveluri + 5 reguli findings + markdown)
- [x] oversight-store.ts adapter (CRUD + approve/reject + attach evidence)
- [x] 6 API routes (list/CRUD + approve + evidence + export + trigger-check)
- [x] /dashboard/human-oversight UI complet (REWRITE peste ComingSoonPage):
  stats + filter + 5-step wizard + per-record detail expand + EvidenceModal
- [x] AI Inventory banner (componenta `ai-systems-list.tsx` + `sisteme/page.tsx`)
- [x] Wire în Audit Pack ZIP (`oversight/registry.md` + `oversight/records/{id}.md`)
- [x] Audit trail events (OVERSIGHT_PROTOCOL_CREATED / _APPROVED /
  OVERSIGHT_EVIDENCE_ATTACHED)
- [x] Remove `coming-soon` badge + section "compliance" + cabinet vizibilitate
- [x] feature-gates: `human_oversight_protocols` pentru cabinet workspace +
  cabinet_pro / cabinet_enterprise tiers
- [x] Test alignment (nav-config.test, feature-gates.test, audit-pack-builder-sprint-011.test)
- [x] `npx tsc --noEmit` clean
- [x] `npx vitest run` 665/665 pass (615 + 50 noi)
- [x] `npm run build` clean — toate rutele oversight registrate
- [x] Sprint log + INDEX update
- [x] 8 code commits + 1 docs commit push la origin/main

---

## Files created

- `lib/compliance/oversight-schema.ts` — 5 secțiuni × 8 întrebări + paritate
  completă pe labels (model, capability, fallback, competence, notification)
- `lib/compliance/oversight-schema.test.ts` — 12 teste structurale
- `lib/compliance/oversight-trigger.ts` — `evaluateOversightRequirement()` +
  `findSystemsNeedingOversight()`; reguli high-risk + biometric (4-eyes) +
  decizii-impact; urgency before_use / periodic_review (>180 zile) / none
- `lib/compliance/oversight-trigger.test.ts` — 8 teste (combo high+biometric)
- `lib/compliance/oversight-evaluator.ts` — `computeOversightCompleteness()` +
  `evaluateOversight()`; 5 reguli findings; markdown export complet cu
  secțiunile A-E + tabele responsibles/escalation/evidence + checklist final
- `lib/compliance/oversight-evaluator.test.ts` — 11 teste (completeness 3
  niveluri + 4 reguli findings + 2 markdown)
- `lib/server/oversight-store.ts` — adapter CRUD + approve/reject + evidence
  + buildOversightMarkdown; nextReviewISO setat auto la +180 zile la approve
- `lib/server/oversight-store.test.ts` — 15 teste (CRUD + biometric + summary)
- `app/api/oversight/route.ts` — GET list (filters status/completeness/system) + POST
- `app/api/oversight/[id]/route.ts` — GET + PATCH + DELETE
- `app/api/oversight/[id]/export/route.ts` — markdown + PDF via Sprint 014
- `app/api/oversight/[id]/approve/route.ts` — POST approve + auto nextReviewISO
- `app/api/oversight/[id]/evidence/route.ts` — POST attach evidence item
- `app/api/oversight/trigger-check/route.ts` — POST {systemId} → trigger result
- `app/dashboard/human-oversight/page.tsx` — REWRITE complet (~1200 linii):
  stats + filter + banner + 5-step OversightWizard + ProtocolRow expand +
  sub-editors (Responsibles/Escalation/Contestation/Stop) + EvidenceModal
- `docs/sprints/sprint-017-human-oversight-art-14.md` — acest fișier

## Files modified

- `lib/compliance/types.ts` — adăugat: `OversightModel`, `OversightCapability`,
  `OversightProtocolStatus`, `OversightCompleteness`, `OversightResponsibleHuman`,
  `OversightEscalationStep`, `OversightContestationProcedure`,
  `OversightStopProcedure`, `OversightEvidenceItem`, `HumanOversightProtocol`;
  extins `ComplianceState.humanOversightProtocols?`
- `components/ai-act/ai-systems-list.tsx` — adăugat
  `systemsRequiringOversightIds?: Set<string>` prop + render banner Art. 14
  cu link `/dashboard/human-oversight?systemId={id}` (deasupra/sub banner FRIA)
- `app/dashboard/sisteme/page.tsx` — fetch `/api/oversight` + calcul
  `systemsRequiringOversightIds` (high-risk OR biometric OR decizii-impact)
- `lib/server/audit-pack-builder.ts` — import `HumanOversightProtocol` +
  `buildOversightMarkdown`; `summary.oversightProtocolsCount?`;
  `pushOversightFiles()`; audit trail evenimente; SIGNATURE.txt include count
- `components/shell/nav-config.ts` — eliminat `badge: "coming-soon"`; section
  `"compliance"` (era `"builder"`); workspaceModes `["ai-builder", "cabinet"]`
- `lib/server/feature-gates.ts` — `human_oversight_protocols` adăugat în
  cabinet workspace + cabinet_pro/cabinet_enterprise tier sets
- `components/shell/nav-config.test.ts` — assertion updates (cabinet vede
  „Oversight uman"; ai-builder placeholder list scoate Oversight)
- `lib/server/feature-gates.test.ts` — adăugat assertion
  `featureBelongsToWorkspace("cabinet", "human_oversight_protocols") === true`
- `tests/audit-pack-builder-sprint-011.test.ts` — sample state include
  `HumanOversightProtocol` complet + 4 teste noi (paths, registry, records, count)

## Files removed

- — (none; placeholder ComingSoonPage înlocuit inline)

---

## Schema changes

- **Supabase:** nimic (folosim `org_state.humanOversightProtocols[]` JSONB)
- **State extension:** `ComplianceState.humanOversightProtocols?: HumanOversightProtocol[]` (optional)
- **Backward compat:** state-uri vechi fără humanOversightProtocols continuă să
  funcționeze (undefined tratat ca [])
- **Audit pack manifest:** `summary.oversightProtocolsCount?: number` (optional;
  zero pe pack-uri vechi)

---

## Tests

- `npx tsc --noEmit`: clean (0 erori)
- `npm run build`: clean — toate rutele înregistrate:
  - `/api/oversight`, `/api/oversight/[id]`, `/api/oversight/[id]/approve`,
    `/api/oversight/[id]/evidence`, `/api/oversight/[id]/export`,
    `/api/oversight/trigger-check`
  - `/dashboard/human-oversight` (12 kB — era ~1 kB placeholder)
- `npx vitest run`: **665/665 pass** (615 baseline + 50 noi:
  schema 12 + trigger 8 + evaluator 11 + store 15 + audit-pack-sprint-011 +4)
- Live test: pending după push (Vercel auto-deploy)

---

## Decisions made

- **OversightModel cu 5 valori** (HITL/HOTL/HIC/two_person_rule/hybrid) per
  taxonomia uzuală AI governance (Lewis, Microsoft RAI, NIST AI RMF). Sursa
  legală Art. 14(2) cere „oversight measures" fără să restrângă modelul;
  alegerea modelului este decizie deployer × proporțional cu risc + autonomie
  + context (Art. 14(5)).
- **5 capacități Art. 14(3) ca multiselect** (nu boolean per protocol) — fiecare
  capacitate este o cerință independentă; deployer-ul poate avea acoperite
  unele și nu altele (ex: training pe automation bias dar fără buton stop).
  Completeness = "complete" doar dacă toate 5 sunt bifate + restul condițiilor.
- **Two-person rule biometric ID** este declanșat de
  `linkedSystem.purpose === "biometric-identification"`. Generăm finding
  CRITICAL dacă modelul nu este `two_person_rule`. Art. 14(4) este unul dintre
  puținele articole AI Act cu cerință procedurală explicită (4-eyes).
- **Completeness 3 niveluri** (incomplete / partial / complete) — pattern
  identic cu DPIA pentru consistency UX. „Partial" lasă spațiu deployer-ilor
  să facă progres iterativ fără să simtă că nu pot salva nimic.
- **5 reguli findings** acoperă:
  - capacități lipsă (high) — operațional
  - lipsă responsibles cu authority (critical) — Art. 26(2) blocker
  - lipsă stop button (high) — Art. 14(3)(e)
  - biometric fără 4-eyes (critical) — Art. 14(4) directă
  - protocol nereview-uit (medium) — preventive
- **nextReviewISO setat auto la approve** la +180 zile (6 luni) — pattern din
  ENISA + ISO 42001 (annual at minimum; 6 luni este recomandat la high-risk).
- **Section "compliance" (nu "builder")** — cabinetele preparează Art. 14
  pentru clienții deployer (B2B service), exact ca FRIA. Mutarea în compliance
  aliniază cu DPIA / FRIA / RoPA pe cabinet sidebar.
- **PDF export** via Sprint 014 generator (`?format=pdf` route).
- **Stable-ID findings** prefixate `oversight-finding-{recordId}-{rule}`
  — pattern din Sprint 016 pentru idempotent re-evaluation.
- **AI Inventory banner** trigger criterii largi (high-risk OR biometric OR
  makesAutomatedDecisions+impactsRights) ca să nu pierdem cazuri edge cum ar
  fi un chatbot „limited" risk dar care face decizii cu impact.

---

## Concerns / Blockers

- ⚠ **Banner Inventar UX** — dacă o organizație are >5 sisteme care necesită
  protocol, banner devine zgomotos. Sprint 022 (preventive engine) ar putea
  agrega într-un singur „N sisteme necesită atenție" + email DPO.
- ⚠ **Evidence vault** este în-state (URL + nume fișier), nu storage real.
  Sprint 018 (Logging Evidence) va adăuga upload real în Supabase Storage cu
  retention policies; oversight-store poate fi extins atunci să refolosească.
- ⚠ **Re-evaluation pe update** NU emite findings noi (pentru a evita
  duplicate) — doar recalculează completeness. Asta înseamnă că dacă deployer
  șterge capacități după create, nu apare un nou finding în cockpit; trebuie
  șters protocolul + recreat. Pattern moștenit de la FRIA.
- 🚫 **Niciun blocker.** Sprint 018 (Logging Evidence — Art. 12) este unlocked.

---

## Commits

- `f6d68cf` — feat(sprint-17-1): HumanOversightProtocol types + ComplianceState
- `6496b2a` — feat(sprint-17-2): oversight schema (5 sections, Art. 14(3) capabilities)
- `49e671e` — feat(sprint-17-3): oversight trigger detection (high-risk + biometric Art. 14(4))
- `f629358` — feat(sprint-17-4): oversight evaluator (completeness + finding emission + markdown)
- `7083b47` — feat(sprint-17-5): oversight store adapter (CRUD + approve + attach evidence)
- `4997d7a` — feat(sprint-17-6): oversight API routes (CRUD + approve + evidence + export + trigger-check)
- `7e64518` — feat(sprint-17-7): /dashboard/human-oversight UI with 5-step wizard + capability matrix + Inventory banner
- `2277b62` — feat(sprint-17-8): wire Oversight into Audit Pack + nav-config coming-soon removed
- (this commit) — docs(sprint-17): sprint log + INDEX update

## Live URL

- Production: `https://eu-ai-act-beige.vercel.app/dashboard/human-oversight`
  (după push + Vercel auto-deploy)

---

## Dependencies

**Requires from previous sprints:**
- Sprint 008A (ComplianceState + findings + events + audit trail foundation)
- Sprint 008B (findings cockpit unde Oversight emit findings)
- Sprint 011 (audit-pack-builder pattern + extended manifest)
- Sprint 014 (PDF generator pentru export Oversight)
- Sprint 015 (nav-config + role-aware UI + feature gates)
- Sprint 016 (pattern BUILD NEW pentru AI Act depth + types `FriaHumanOversightMeasure`
  ca punct de plecare conceptual)

**Unlocks for next sprints:**
- Sprint 018 (Logging Evidence) — `OversightEvidenceItem` poate fi extins cu
  storage real (Supabase Storage) + retention policies cerute de Art. 12
- Sprint 019 (Post-Market Monitoring) — reminder pe `nextReviewISO`
- Sprint 022 (Preventive engine) — auto-detect sisteme high-risk fără protocol
  + email DPO; agregate banner Inventar

---

## Notes pentru următorul agent (Sprint 018 — Logging Evidence Art. 12)

- **Pattern stabilit (FRIA + Oversight):** module BUILD NEW pentru AI Act
  depth folosesc același template:
  types → schema → trigger/evaluator → store adapter → API routes → UI page
  → wire în audit-pack + nav-config. 9 commits incrementale + 1 docs.
- **Reuse OversightEvidenceItem ca starting point** pentru Sprint 018 — Art. 12
  cere log retention + integritate; LoggingEvidence types va extinde cu:
  durată retention (days), checksum, storage bucket path.
- **Storage real:** decide upfront dacă mergi cu Supabase Storage (recomandat
  pentru `evidenceVaultIds` din FRIA + `evidenceItems` din Oversight) sau cu
  o tabelă `evidence_uploads` indexed pe orgId. Mandate § 18 nu specifică.
- **Trigger pattern:** când există protocol Art. 14 aprobat pe sistem, Logging
  Art. 12 devine obligatoriu de demonstrat. Sprint 018 trigger poate să se
  bazeze pe `humanOversightProtocols` aprobate.
- **Test alignment:** dacă schimbi vizibilitatea pe workspaceModes (ex: muți
  Logging din "builder" → "compliance" pentru cabinet), updatează:
  - `components/shell/nav-config.test.ts` (placeholder assertions)
  - `lib/server/feature-gates.test.ts` (workspace assertions)
  - `tests/audit-pack-builder-sprint-011.test.ts` (sample state + asserts)
- **Subagent overload recovery:** dacă rulezi subagent pe 9 commits incrementale,
  pattern de recovery valid: subagent commit-uri 1→N → cleanup manual de la
  ultimul commit semnat. Sprint 017 a fost rulat 100% manual (Claude direct)
  fără probleme.
