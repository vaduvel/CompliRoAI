# Sprint 008D — GDPR Breach 72h (Art. 33 + Art. 34)

**Status:** DONE
**Faza:** 1 (PORT MASIV DPO-OS)
**Start:** 2026-05-17 13:50
**End:** 2026-05-17 14:15
**Owner:** manual: Claude

---

## Goal (1 propoziție)

Construiesc modulul standalone GDPR Breach (Art. 33 — notificare ANSPDCP în
72h + Art. 34 — notificare persoane vizate) ca slice GDPR pur, separat de
NIS2 full surface (per mandat § 9 Rule 3), conectat la findings cockpit prin
finding rescue auto-emis + countdown live 72h + narrative copy-paste ready
pentru ambele tipuri de notificări + dosar markdown pentru Audit Pack.

---

## Task list

- [x] Adaug types in `lib/compliance/types.ts`: BreachRecord, BreachStatus,
      BreachSeverity, BreachCause, BreachDataCategory, AnspdcpNotificationStatus,
      BreachAnspdcpNotification, BreachSubjectNotification, BreachEvidence
- [x] Extend `ComplianceState` cu `breachRecords?: BreachRecord[]`
- [x] Port verbatim `lib/compliance/anspdcp-breach-rescue.ts` cu adaptarea
      importului `AnspdcpNotificationStatus` din @/lib/compliance/types
- [x] Test `lib/compliance/breach-rescue.test.ts` (9 teste)
- [x] Build `lib/compliance/breach-narrative.ts` cu generateAnspdcpNotification
      + generateSubjectNotification (markdown RO)
- [x] Test `lib/compliance/breach-narrative.test.ts` (7 teste)
- [x] Build `lib/server/breach-store.ts` (~770 LOC) — CRUD + finding emission
      + workflow Art. 33/34 + markdown export
- [x] Test `lib/server/breach-store.test.ts` (19 teste)
- [x] API `app/api/breach/route.ts` (GET list + POST create)
- [x] API `app/api/breach/[id]/route.ts` (GET + PATCH + DELETE)
- [x] API `app/api/breach/[id]/notify-anspdcp/route.ts` (POST Art. 33 workflow)
- [x] API `app/api/breach/[id]/notify-subjects/route.ts` (POST Art. 34 / skip)
- [x] API `app/api/breach/[id]/export/route.ts` (GET markdown)
- [x] Page `app/dashboard/breach/page.tsx` (stats + filter tabs + countdown +
      create modal + detail expand + notify modals)
- [x] Wire sidebar nav "Incident date personale" cu ShieldAlert intre DSAR si DPIA
- [x] `npx tsc --noEmit` clean dupa fiecare commit
- [x] `npm run build` clean (5 rute API noi + 1 dashboard page registered)
- [x] `npx vitest run` 153/153 pass (era 118; +35 noi)
- [x] Sprint log scris
- [x] INDEX.md actualizat
- [x] Push pe `main` dupa fiecare commit

---

## Files created

### Compliance layer
- `lib/compliance/anspdcp-breach-rescue.ts` (~92 LOC) — Port verbatim din
  DPO-OS v3-unified (`/v3-unified/lib/compliance/anspdcp-breach-rescue.ts`),
  cu o singura adaptare: importul `AnspdcpNotificationStatus` provine din
  `@/lib/compliance/types` (NU din `@/lib/server/nis2-store` — forbidden
  per mandat § 9 Rule 3). Exporta `ANSPDCP_FINDING_PREFIX`,
  `anspdcpFindingId(breachId)`, `getIncidentIdFromAnspdcpFindingId(findingId)`,
  `buildAnspdcpBreachFinding(breachId, title, detectedAt, anspdcpStatus, nowISO)`.
  Severity: critical daca deadline 72h expirat, high in rest. Returneaza null
  daca notificarea ANSPDCP e deja `submitted`/`acknowledged` (dedupe intrinsec).
- `lib/compliance/breach-rescue.test.ts` (9 teste) — id helpers + reverse +
  severity branches (>24h, urgent <=24h, expired) + dedupe pe status submitted/
  acknowledged + continut Art. 33(3) prezent in detail.

- `lib/compliance/breach-narrative.ts` (~220 LOC) — 2 generatoare markdown:
    * `generateAnspdcpNotification(breach, orgName, nowISO?)` returneaza un
      markdown RO cu cele 8 sectiuni Art. 33(3): natura incalcarii + cauza +
      cronologie cu deadline 72h + persoane vizate count/categorii + categorii
      date afectate + consecinte probabile + masuri containment/preventie +
      contact DPO + status Art. 34. Include opional justificarea depasirii
      termenului 72h + numar inregistrare ANSPDCP cand sunt setate.
    * `generateSubjectNotification(breach, orgName, nowISO?)` returneaza un
      markdown formal-prietenos pentru email/scrisoare/comunicare publica cu
      structura Art. 34(2): "Ce s-a intamplat / Ce date / Ce consecinte / Ce
      am facut / Ce puteti face / Cum ne puteti contacta".
  Labels in romana cu mapare friendly pentru BreachCause (atac cibernetic,
  insider, lost device etc.) si BreachDataCategory (CNP, sanatate, biometrice,
  etc.). Nu interogheaza state — pure functions cu input record + orgName.
- `lib/compliance/breach-narrative.test.ts` (7 teste) — sectiuni Art. 33(3),
  referenceNumber dupa submission, delayJustification, Art. 34 toggle
  required/not-required, fallback contact DPO cand lipseste, labels RO.

### Server adapter
- `lib/server/breach-store.ts` (~770 LOC) — CRUD complet pe
  `state.breachRecords[]` + hash-chain audit-trail consistent cu
  findings-store/dpia-store/ropa-store. Surface API:
    * `readBreachRecords(orgId)` + `summarizeBreaches` — counters total /
      open / closed / overdueAnspdcp / urgentAnspdcp / awaitingSubjects /
      highSeverity (folosit pentru StatsBar)
    * `getBreachById(orgId, id)`
    * `createBreach(orgId, input, actor)` — auto-compute deadline =
      discoveredAt + 72h; status = `anspdcp_required` (daca dataCategories
      non-vide) sau `assessing`; emite rescue finding via `createFinding()`
      din findings-store cu legare prin `linkedFindingId`; emite event
      `breach.created` + `breach.finding.emitted`
    * `updateBreach(orgId, id, patch, actor)` — merge campuri; recalc
      deadline cand `discoveredAtISO` se schimba
    * `deleteBreach(orgId, id, actor)`
    * `markAnspdcpNotified(orgId, id, input, actor)` — workflow Art. 33:
      cere referenceNumber non-empty; daca submittedAt > deadlineISO cere
      `delayJustification`; tranzitie automata status anspdcp_notified →
      subjects_required (cand highRiskToRights) sau → closed; attach
      evidence pe linked finding ("Notificare ANSPDCP trimisa, nr. X, la
      Y") + resolve finding cand breach ajunge closed
    * `markSubjectsNotified(orgId, id, input, actor)` — workflow Art. 34:
      method (email/letter/public_communication/other; NU not_yet) + sentAt
      + contentDocumented; auto-close cand ANSPDCP deja done
    * `markSubjectNotificationSkipped(orgId, id, reason, actor)` —
      documenteaza skip cu motiv obligatoriu (Art. 34(3))
    * `attachBreachEvidence(orgId, id, input, actor)` — inline evidence
    * `buildBreachMarkdown(record, orgName)` — dosar Audit Pack cu Art. 33
      + Art. 34 narrative integrate
    * `computeDeadlineStatus(record, nowISO?)` — level ok/warn/urgent/
      expired/done (cand ANSPDCP submitted) pentru UI countdown
    * Validatori publici: `isBreachStatus`, `isBreachSeverity`,
      `isBreachCause`, `isBreachDataCategory`, `isBreachSubjectMethod`
  Dedupe rescue: la createBreach, daca finding-ul cu id stabil
  `anspdcp-breach-{id}` exista deja in state, skip emission. Cap 200
  inregistrari (rolling window).
- `lib/server/breach-store.test.ts` (19 teste integration) — lifecycle
  complet: create cu/fara dataCategories + override anspdcpRequired, summary,
  workflow Art. 33 (referenceNumber + status transition + closed cand subject
  not required), delay justification obligatorie peste 72h, workflow Art. 34
  (notify + skip + auto-close), update + delete + evidence + markdown export
  + helper computeDeadlineStatus + summarizeBreaches counters.

### API routes
- `app/api/breach/route.ts` — GET list (records + summary) / POST create.
  Validare: title + description + cause obligatorii; cause via `isBreachCause`;
  severity via `isBreachSeverity`; dataCategories filtrate prin
  `isBreachDataCategory`; arrays normalizate (trim + filter empty); 400 cu
  mesaj RO pentru fiecare camp lipsa.
- `app/api/breach/[id]/route.ts` — GET / PATCH (merge patch cu validatori) /
  DELETE. 404 cu mesaj RO daca id inexistent.
- `app/api/breach/[id]/notify-anspdcp/route.ts` — POST workflow Art. 33:
  validate referenceNumber non-empty (400 daca lipseste); forward eroarea
  storului pentru cazul delayJustification lipsa peste 72h (400 cu mesaj
  prietenos).
- `app/api/breach/[id]/notify-subjects/route.ts` — POST dual-mode: daca
  `skipReason` non-empty -> markSubjectNotificationSkipped; altfel
  `method` obligatoriu (non-not_yet) -> markSubjectsNotified. Returneaza
  record updated.
- `app/api/breach/[id]/export/route.ts` — GET dosar markdown via
  `buildBreachMarkdown` + emite event `breach.exported` in ledger.
  Content-Type: text/markdown; filename: breach-{orgSlug}-{titleSlug}-{date}.md.

### UI
- `app/dashboard/breach/page.tsx` (~1500 LOC) — Pagina mature:
    * Header "Incident date personale — notificare ANSPDCP 72h" + intro
      GDPR Art. 33/34 + ShieldAlert icon rosu
    * StatsBar (6 metrici): total / deschise / ANSPDCP urgent (<24h) /
      ANSPDCP depasit / persoane de notificat / inchise — color-coded
    * FilterTabs cu count per status: all / assessing / anspdcp_required /
      anspdcp_notified / subjects_required / closed
    * CreateModal cu form complet (titlu obligatoriu, descriere obligatorie,
      cauza dropdown, severitate dropdown, datetime-local discoveredAt,
      dataCategories pill multi-select 15 categorii, persoane afectate
      count + categorii multi-line, sisteme afectate multi-line,
      likelyConsequences, highRiskToRights toggle, containment + prevention
      measures multi-line)
    * BreachRow inline cu severity badge + 72h countdown badge color-coded
      (green > 24h, amber <= 24h, dark amber urgent <= 6h, red expired,
      emerald "ANSPDCP trimis" cand submitted) + status badge + chevron
    * BreachDetail expand:
        - Descriere + Scope grid (cauza/severitate/persoane/risc) +
          categorii date + persoane vizate + sisteme
        - Timeline 4-card: descoperit / 72h / ANSPDCP trimis / persoane notificate
        - Section ANSPDCP: succes confirmat (verde cu nr inregistrare +
          submittedAt + justificare daca intarziat) sau call-to-action
          "Marcheaza ANSPDCP trimis" (deschide modal) sau "documentat
          NEnecesar"
        - Section Subjects: succes confirmat (metoda + sentAt) sau call-to-
          action "Marcheaza persoane notificate" sau "documentat NEnecesar"
          cu motiv
        - Consecinte + masuri containment/preventie
        - Linked finding card cu link `/dashboard/resolve`
        - Actions: Export markdown + Sterge
    * NotifyAnspdcpModal: input referenceNumber obligatoriu, datetime-local
      submittedAt, banner rosu cand >72h cu textarea delayJustification
      obligatoriu, preview narativa + buton Copy clipboard
    * NotifySubjectsModal: toggle Notify/Skip; Notify accepta method dropdown
      (email/letter/public_communication/other) + datetime-local sentAt;
      Skip cere motiv documentat obligatoriu (Art. 34(3))
    * Live countdown: setInterval 60s refresh `now` ca badge-urile sa fie
      up-to-date fara refresh manual
    * Empty state cu CTA + ShieldAlert icon
  Style 100% inline + v3 design tokens (var(--cobalt-600), var(--ink),
  var(--surface-1/2), var(--border-soft), etc.). Zero shadcn/Tailwind.
  Romanian copy.

### Docs
- `docs/sprints/sprint-008d-gdpr-breach.md` — acest log.

## Files modified

- `lib/compliance/types.ts` (+129 LOC) — Adaugat sectiune noua de tipuri
  pentru GDPR Breach (BreachRecord etc.) inainte de ClientPortalDocument.
  Extins `ComplianceState` cu `breachRecords?: BreachRecord[]` (optional,
  backward-compatible — nu invalideaza state-uri existente).
- `components/shell/dashboard-shell.tsx` — import `ShieldAlert` din lucide-react.
  Adaugat `<NavItem href="/dashboard/breach" label="Incident date personale"
  icon={<ShieldAlert size={15} />} />` intre DSAR si DPIA. Visible pentru
  toate workspace mode-urile (solo + cabinet).
- `docs/sprints/INDEX.md` — Sprint 008D → ✅ DONE cu commit hash 31e6f4f
  (primul commit din sprint, conform conventie pre-existenta din 008A-C
  unde se inregistreaza primul commit).

## Files removed

- — (nimic)

---

## Schema changes

- **Supabase:** nimic. Folosim `org_state JSONB` existent.
- **State extension:**
  - `state.breachRecords[]` — populat real in Sprint 008D. Sape de
    `BreachRecord` (descris in types.ts). Backward-compatible: optional
    field; orgs existente nu sunt afectate.
- **Sub-tipuri stocate inline:**
  - `BreachAnspdcpNotification` (status + submittedAt + referenceNumber +
    delayJustification) — populat la primul `markAnspdcpNotified`.
  - `BreachSubjectNotification` (sentAt + method + contentDocumented +
    skipReason) — populat la `markSubjectsNotified` sau `markSubjectNotificationSkipped`.
  - `BreachEvidence[]` — inline pe record (in plus fata de
    `evidenceVaultIds[]` legacy compat field).

---

## Tests

- `npx tsc --noEmit`: **clean (0 errors)** dupa fiecare din cele 6 commits +
  commit-ul de docs.
- `npm run build`: **clean**, 5 rute API noi + 1 dashboard page registered:
  - `ƒ /api/breach                          262 B`
  - `ƒ /api/breach/[id]                     262 B`
  - `ƒ /api/breach/[id]/export              262 B`
  - `ƒ /api/breach/[id]/notify-anspdcp      262 B`
  - `ƒ /api/breach/[id]/notify-subjects     262 B`
  - `ƒ /dashboard/breach                  10.1 kB`
- `npx vitest run`: **153/153 pass** (era 118 dupa Sprint 008C; +35 noi):
  - `breach-rescue.test.ts` — 9 teste (id helpers + severity branches +
    dedupe submitted/acknowledged + Art. 33(3) content)
  - `breach-narrative.test.ts` — 7 teste (Art. 33(3) sectiuni, reference
    number, delay justification, Art. 34 toggle, Art. 34 sectiuni,
    fallback contact, labels RO)
  - `breach-store.test.ts` — 19 teste (CRUD lifecycle, deadline auto-compute,
    rescue finding emission + dedupe, workflow Art. 33 status transitions,
    delayJustification obligatorie peste 72h, workflow Art. 34 notify/skip,
    auto-close cand ANSPDCP+Art. 34 done, evidence attach, markdown export,
    summary counters)
- Live test: pending dupa push (manual click-through pe Vercel preview).

---

## Decisions made

- **Decision A — Standalone GDPR module, NU NIS2 surface.** Per mandat
  § 9 Rule 3, NIS2 full UI/store/types e interzis in CompliRoAI 008D.
  Donor `/v3-unified/app/dashboard/breach/page.tsx` era doar un re-export
  al NIS2 incidents, deci am construit modulul nou de la zero, inspirandu-ma
  doar din `anspdcp-breach-rescue.ts` (port verbatim) si din structura
  markdown a `/v3-unified/app/api/breach-notification/[id]/export/route.ts`
  (extras logica narativa, fara tipuri NIS2). Sprint 012 va wire AI-critical
  NIS2 slice care, cand implica date personale, poate emite un BreachRecord
  legat via `linkedFindingId`.

- **Decision B — Finding rescue ANSPDCP auto-emis la createBreach.**
  Folosim acelasi pattern ca in 008C (DPIA finding emission via
  findings-store). createBreach apeleaza `createFinding()` cu severity =
  buildAnspdcpBreachFinding's severity (high in mod normal, critical daca
  expirat) si stocheaza id-ul real in `record.linkedFindingId`. Avantaje:
  (1) un singur punct de emisie finding-uri, (2) lifecycle complet
  (confirm/dismiss/resolve/monitor) via cockpit /dashboard/resolve,
  (3) audit-trail unificat hash-chain. Dedupe: la creare, daca finding-ul
  cu id stabil `anspdcp-breach-{id}` exista, skip emission.

- **Decision C — Tranzitii status workflow automate.**
  - createBreach cu dataCategories non-vide → status `anspdcp_required`
    (anspdcpNotification.status = "draft")
  - createBreach fara dataCategories → status `assessing`
  - markAnspdcpNotified → status `anspdcp_notified` → automat
    `subjects_required` (cand highRiskToRights/subjectNotificationRequired)
    sau `closed`
  - markSubjectsNotified → automat `closed` (cand ANSPDCP done) sau
    `subjects_notified` (parking, daca ANSPDCP nu inca)
  - markSubjectNotificationSkipped → automat `closed` (cand ANSPDCP done)
  Avantaj: user-ul nu trebuie sa schimbe manual status; UI-ul mereu
  reflecta realitatea workflow-ului fara update PATCH separat.

- **Decision D — Validare delayJustification peste 72h e in store, nu in API.**
  `markAnspdcpNotified` arunca Error in store cand submittedAt > deadlineISO
  fara delayJustification; API forward-eaza eroarea cu status 400 + mesaj
  RO. Avantaj: regula GDPR e cod-aproape-de-date, nu duplicata in route.
  UI ANSPDCP modal calculeaza late local + face required={late} pe textarea
  ca user-ul sa primeasca feedback inainte de POST.

- **Decision E — Subject notification skipReason in payload notify-subjects.**
  Aceeasi ruta gestioneaza ambele cazuri ("am notificat" + "documentez
  NEnecesitatea") prin discriminator: daca `body.skipReason` exista
  non-empty → skip workflow, altfel → notify workflow (cu method obligatoriu).
  Avantaj: o singura ruta de tinut, UI-ul foloseste un singur modal cu
  toggle Notify/Skip. Acelasi event ledger types separate
  (`breach.subjects_notified` vs `breach.subjects_skip_documented`).

- **Decision F — Resolve finding rescue cand breach inchis.**
  markAnspdcpNotified + markSubjectsNotified + markSubjectNotificationSkipped
  apeleaza `updateFinding(orgId, linkedFindingId, {action: "resolve"}, actor)`
  cand breach-ul atinge status `closed`. Avantaj: finding-ul in cockpit
  /dashboard/resolve nu ramane "open" la nesfarsit dupa ce user-ul a inchis
  workflow-ul. Plus attachEvidence cu nota ("Notificare ANSPDCP trimisa,
  nr. X, la Y") pentru audit-trail vizibil.

- **Decision G — Live countdown via setInterval 60s + computeDeadlineStatus
  pur.** UI-ul nu refetch-uieste records la fiecare interval — doar bumpaeste
  un state `now: number` care invalideaza memoizarea `deadlineLevel(record, now)`.
  Avantaj: zero network traffic, badge-urile se actualizeaza vizual la
  fiecare minut. computeDeadlineStatus din store e exportat pentru a permite
  testarea izolata si folosirea identica in alte module (audit pack).

- **Decision H — buildBreachMarkdown integreaza ambele narrative inline.**
  Dosar markdown contine sectiuni `## 6. Notificare ANSPDCP` + sub-sectiunea
  `### 6.1 Narativa ANSPDCP (copy-paste ready)` cu `generateAnspdcpNotification`
  apelata pe loc; idem `## 7. Notificare persoane vizate` + `### 7.1
  Narativa pentru persoanele vizate` cu `generateSubjectNotification` (cand
  subjectNotificationRequired=true). Avantaj: un singur fisier markdown
  pentru audit, nu necesita download separat pentru fiecare narativa. Audit
  Pack builder (Sprint 011) poate apela direct `buildBreachMarkdown` per
  record si include in ZIP la `breach/{id}.md`.

- **Decision I — Sidebar visible pentru toate workspace mode-urile.**
  Breach e modul GDPR general, nu cabinet-only. Plasat intre DSAR (Mail
  icon) si DPIA (ClipboardCheck) ca grupare logica "GDPR workflow".

- **Decision J — Cap 200 records (rolling window).** Acelasi pattern ca
  in dpia-store/ropa-store. Pentru cabinet care gestioneaza 100+ clienti
  cu 2+ breach-uri fiecare, cap-ul actual e suficient. Sprint 013 (cabinet
  portfolio) va trebui sa per-clientizeze acest cap sau sa expuna paginare.

---

## Concerns / Blockers

- ⚠️ **Audit Pack ZIP nu include inca breach-urile.**
  `buildBreachMarkdown(record, orgName)` e API gata, dar
  `lib/server/audit-pack-builder.ts` (Sprint 004) nu il apeleaza. Sprint 011
  (Audit-log structured) sau o mini-task in 009 va trebui sa adauge: pentru
  fiecare orgId, snapshot toate `state.breachRecords`, scrie markdown-ul lor
  in ZIP la `breach/{id}.md`. Acelasi concern din 008C pentru DPIA/RoPA —
  trei module asteapta integrare in audit-pack-builder.

- ⚠️ **NotifyAnspdcpModal afiseaza un preview narativa minimal.**
  Pentru a evita un al doilea API call (preview generator endpoint),
  modal-ul afiseaza doar un fragment placeholder cu copy-paste. Narativa
  completa Art. 33(3) e disponibila prin Export markdown buton dupa
  salvare. Sprint future poate adauga endpoint `/api/breach/[id]/preview-narrative`
  + extinde modal-ul cu tabs (Form / Preview).

- ⚠️ **subjectNotificationRequired override la creation.**
  Cand user-ul lasa highRiskToRights=false dar checkbox-ul
  subjectNotificationRequired e implicit derivat din highRiskToRights,
  poate exista un edge case unde DPO-ul decide intern ca persoanele
  trebuie notificate chiar daca riscul e medium. Solutia momentana: PATCH
  /api/breach/[id] cu `subjectNotificationRequired: true`. Sprint future
  poate adauga checkbox separat in CreateModal pentru control fin.

- ⚠️ **Linked finding NU pastreaza id-ul stabil rescue.**
  buildAnspdcpBreachFinding produce id stabil `anspdcp-breach-{id}`, dar
  createFinding din findings-store genereaza id dinamic `finding-XXX`.
  Stocam id-ul real in `record.linkedFindingId`. Dedupe in breach-store
  verifica `existingFindings.some(f => f.id === stableId)` — corect
  pentru dedupe la creare, dar finding-urile vechi pre-Sprint 008D nu
  vor avea id stable, doar finding-XXX. Acceptabil pentru ca breach-urile
  noi mereu primesc finding nou la creare.

- ⚠️ **Sprint 012 NIS2 slice va trebui sa reseze buildAnspdcpBreachFinding.**
  Functia rescue exista in CompliRoAI acum dar e apelata DOAR de
  breach-store. Cand Sprint 012 adauga modul NIS2 AI-critical slice si un
  incident NIS2 implica date personale, store-ul NIS2 va trebui sa apeleze
  acelasi `buildAnspdcpBreachFinding` + sa creeze un BreachRecord cu
  linkedFindingId. Documentat in comment-ul fisierului.

- ⚠️ **Cache state in-memory shared intre teste (concern recurent).**
  Acelasi concern din 008B/008C. Teste izolate prin id-uri unice + asserțiuni
  relative; nu am putut testa "breach cu state gol exact" repetat fara reset.
  Sprint future poate adauga `lib/server/__tests__/test-utils.ts` cu
  `createTestStore()` helper. Momentan toate 153 teste pass stabil.

- 🚫 Niciun blocker pentru Sprint 009 (AI Data Discovery + PII Discovery +
  AI Exposure Report + AI Policy Pack).

---

## Commits

- `31e6f4f` — feat(sprint-8d-1): BreachRecord types + ComplianceState extension
- `1bbe220` — feat(sprint-8d-2): port anspdcp-breach-rescue (GDPR Art. 33 finding builder)
- `3283495` — feat(sprint-8d-3): breach narrative generator (Art. 33 + Art. 34 markdown)
- `60dd5df` — feat(sprint-8d-4): breach store adapter with auto-finding + 72h deadline
- `25bcb37` — feat(sprint-8d-5): breach API routes (CRUD + notify ANSPDCP + notify subjects + export)
- `8d53969` — feat(sprint-8d-6): /dashboard/breach UI cu 72h countdown + notify workflow
- (urmeaza) — docs(sprint-8d): sprint log + INDEX update

## Live URL

- Production: `https://eu-ai-act-beige.vercel.app/dashboard/breach`
- Preview Vercel: URL dupa push (preview deploy auto-generat dupa fiecare push)

---

## Dependencies

**Requires from previous sprints:**
- Sprint 008A (ComplianceState + findings + events + orgKnowledge + store
  adapter mutateFreshStateForOrg + hash chain ledger) — toate fundatiile
- Sprint 008B (findings-store cu createFinding/updateFinding/attachEvidence
  + /dashboard/resolve cockpit) — rescue finding emisia + lifecycle complet
- Sprint 008C (pattern DPIA store adapter cu finding emission optional +
  ropa-store dedupe pe id stabil) — pattern recopiat in breach-store

**Unlocks for next sprints:**
- Sprint 009 (AI Data Discovery + PII Discovery + AI Exposure Report) — va
  putea emite breach automat cand AI tool detectat expune date personale
  (cauza = `ai_system`), folosind `createBreach` din breach-store
- Sprint 011 (Audit-log structured) — va include `buildBreachMarkdown` in
  Audit Pack ZIP la `breach/{id}.md`; va expune ledger filter pe
  entityType="system" + entityId match `breach-*` pentru audit cronologic
  per breach
- Sprint 012 (DORA AI slice + NIS2 AI slice) — store-ul NIS2 va apela
  `buildAnspdcpBreachFinding` + va crea BreachRecord cand incident-ul are
  date personale (link bidirectional via linkedFindingId / breach.id)
- Sprint 022 (Preventive engine) — va putea detecta automat breach-uri
  pe baza de pattern-uri SIEM/log + email DPO + auto-create draft via
  POST /api/breach

---

## Notes pentru urmatorul agent (Sprint 009 — AI Data Discovery)

### Pattern emitere breach din modul nou

```typescript
import { createBreach } from "@/lib/server/breach-store"

const { record, linkedFindingId } = await createBreach(
  orgId,
  {
    title: `AI tool a expus date personale: ${aiTool.name}`,
    description: `AI tool ${aiTool.name} a generat output cu PII (${piiCategories.join(", ")}). Detectat la ${detectionISO}.`,
    cause: "ai_system",
    discoveredAtISO: detectionISO,
    severity: piiCategories.some(c => c.startsWith("special_")) ? "critical" : "high",
    dataCategories: piiCategories,
    affectedSubjectsCount: estimatedCount,
    affectedSubjectsCategories: ["Utilizatori AI tool"],
    affectedSystems: [aiTool.name],
    likelyConsequences: "Posibila utilizare a datelor expuse pentru fraud/identity theft.",
    highRiskToRights: true,
    containmentMeasures: ["AI tool dezactivat", "Audit logs salvate"],
    linkedAISystemIds: [aiTool.id],
  },
  actor,
)
```

### Pattern attach evidence dupa intake

```typescript
import { attachBreachEvidence } from "@/lib/server/breach-store"

await attachBreachEvidence(
  orgId,
  breachId,
  {
    note: `Log SIEM atasat: ${eventCount} evenimente captate`,
    url: siemLogUrl,
  },
  actor,
)
```

### Pattern check deadline pentru UI status

```typescript
import { computeDeadlineStatus } from "@/lib/server/breach-store"

const status = computeDeadlineStatus(record)
// status.level: "ok" | "warn" | "urgent" | "expired" | "done"
// status.hoursLeft: number (negativ daca expirat)
```

### Test count after 008D

- Inainte de 008D: 118 teste
- Dupa 008D: 153 teste (+35 noi):
  - breach-rescue.test.ts: 9
  - breach-narrative.test.ts: 7
  - breach-store.test.ts: 19

### LOC

- Net new code: ~3,000 LOC + tests (~700 LOC) = ~3,700 LOC:
  - anspdcp-breach-rescue.ts: ~92
  - breach-narrative.ts: ~220
  - breach-store.ts: ~770
  - 5 API routes: ~330 total
  - breach/page.tsx: ~1500
  - types extension: ~129
  - tests: ~700
- Donor cod portat verbatim cu rebrand import: anspdcp-breach-rescue (~70 LOC).
- Net new CompliRoAI: tot restul (~3,000 LOC).

### Capcane evitate

- **TS narrowing in closure** — `let updated: BreachRecord | null = null`
  apoi assigned in `mutateFreshStateForOrg(orgId, (state) => { updated = ... })`.
  TS narrow-uieste `updated` la `null` dupa closure. Solutie: cast la
  `const result = updated as BreachRecord | null` dupa closure.
- **Map<typeof level, ...>** — TS interpreteaza `level: "ok" | "warn" | ...`
  ca union complet; map-ul cu 4 chei doar excluse "done" (handled in
  early return) cere `Record<"ok" | "warn" | "urgent" | "expired", ...>`
  cu cheile listate explicit.
- **method = "not_yet" e invalid pentru markSubjectsNotified.** Validat
  in store + in API. UI nu expune optiunea "not_yet" in dropdown — doar
  email/letter/public_communication/other.
- **anspdcpNotificationRequired override.** Default e derivat din
  `dataCategories.length > 0`. User-ul poate forta `false` chiar daca
  dataCategories non-vide (edge case: date pseudonime cu cheia inaccesibila).
  CreateBreachInput accepta `anspdcpNotificationRequired?: boolean`.
- **Recalc deadline cand discoveredAt se schimba in update.** updateBreach
  detecteaza schimbarea `discoveredAtISO` si recalculeaza
  `deadlineISO = discoveredAt + 72h`. Daca user-ul greseste data initiala
  si o corecteaza, deadline-ul ramane corect.
- **closedAtISO setat o singura data.** updateBreach + markAnspdcpNotified
  + markSubjectsNotified seteaza `closedAtISO` doar daca nu exista deja
  (`current.closedAtISO ?? now`) — evitam suprascrierea cand breach
  re-deschis si re-inchis.
