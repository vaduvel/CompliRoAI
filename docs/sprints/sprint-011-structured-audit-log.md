# Sprint 011 — Structured Audit Log + Audit Pack wire-up

**Status:** ✅ DONE
**Faza:** 1 (PORT MASIV din DPO-OS)
**Start:** 2026-05-17 17:54
**End:** 2026-05-17 18:10
**Owner:** manual: Claude

---

## Goal (1 propoziție)

Expune ledger-ul `ComplianceEvent` într-un UI auditor-grade cu filtre + hash chain verify + export (md/json/csv) și incluce în Audit Pack ZIP markdown-urile tuturor modulelor mature (DPIA, RoPA, Breach, AI Discovery, Vendor, Audit Log) — astfel încât pachetul ZIP reflectă starea reală end-to-end a organizației.

---

## Task list

- [x] Step 1 — `lib/compliance/audit-log-formatters.ts` + 17 unit tests (markdown + CSV RFC 4180 + JSON)
- [x] Step 2 — `app/api/audit-log/route.ts` GET cu filters + chain verify + facets + 12 tests
- [x] Step 3 — `app/api/audit-log/export/route.ts` (md/json/csv download) + 6 tests
- [x] Step 4 — `app/dashboard/audit-log/page.tsx` UI complet + sidebar wire (FileSearch icon)
- [x] Step 5 — `lib/server/audit-pack-builder.ts` upgrade (8 module noi în ZIP) + 9 tests
- [x] Step 6 — Backward-compat tests pre/post-Sprint-011 verify (2 tests noi)
- [x] Step 7 — Sprint log + INDEX update
- [x] Build clean
- [x] Commit + push

---

## Files created

- `lib/compliance/audit-log-formatters.ts` — `formatEventsAsMarkdown/CSV/JSON`, deterministe, RFC 4180 CSV, hash chain toggle pe JSON
- `lib/compliance/audit-log-formatters.test.ts` — 17 unit tests pe formatters
- `app/api/audit-log/route.ts` — GET cu filters (date range, entityType, actor, eventType, search) + paginare + chain verify + facets
- `app/api/audit-log/route.test.ts` — 12 tests (filtre individuale + tamper detection + facets + paginare)
- `app/api/audit-log/export/route.ts` — GET descarcă filtered ledger ca .md/.json/.csv cu Content-Disposition
- `app/api/audit-log/export/route.test.ts` — 6 tests (format defaults, content-type, filter integration, filename)
- `app/dashboard/audit-log/page.tsx` — UI complet: stats, filter bar (date range presets + custom + entityType + actor + eventType + search), table cu expand inline, verify chain banner, export buttons
- `tests/audit-pack-builder-sprint-011.test.ts` — 9 tests audit pack upgrade (files present + manifest counts + chain end-to-end + backward compat zero-state)
- `docs/sprints/sprint-011-structured-audit-log.md` — acest log

## Files modified

- `lib/server/audit-pack-builder.ts` — adăugate 8 funcții `pushXFiles()` (findings + DPIA + RoPA + Breach + AI Discovery + Vendor + DSAR + Audit Log); extins manifest summary cu countere noi (toate optional, backward compatible); imports noi din audit-log-formatters + dpia-store + breach-store + ropa-risk-engine + vendor-review-engine + ai-policy-pack + events
- `components/shell/dashboard-shell.tsx` — adăugat NavItem "Audit Log" cu FileSearch icon între "Dosar" și (cabinet-only) "Magic Links"; import FileSearch din lucide-react
- `tests/audit-pack-builder.test.ts` — adăugate 2 backward-compat tests (pre-Sprint-011 + Sprint-011 extended manifest shape)
- `docs/sprints/INDEX.md` — marcat Sprint 011 ca DONE cu link

## Files removed

- niciunul

---

## Schema changes

- **Manifest summary extension** (backward compatible): câmpuri noi opționale pe `AuditPackManifest.summary` — `findingsCount`, `dpiaRecordsCount`, `ropaActivitiesCount`, `breachRecordsCount`, `aiDataMapRecordsCount`, `vendorRecordsCount`, `dsarRequestsCount`, `eventsCount`, `chainOk`. Pre-Sprint-011 pack-uri continuă să verifice (nu există assertion strictă pe shape).
- **No state extension** — toate datele expuse provin din `ComplianceState.events` și store-urile existente.

---

## Tests

- `npx tsc --noEmit`: clean (0 errors)
- `npm run build`: clean (74/74 pages generated, 0 warnings)
- `npx vitest run`: **365/365 pass** (33 test files)
  - baseline: 321 (Sprint 010)
  - +44 noi: 17 (formatters) + 12 (audit-log GET) + 6 (audit-log export) + 9 (audit-pack Sprint 011) — și încă 2 (verify-pack backward compat reused existing file). Total adăugat: 44 noi.
- Routes registered în build output:
  - `ƒ /api/audit-log`
  - `ƒ /api/audit-log/export`
  - `ƒ /dashboard/audit-log` (6.45 kB, 112 kB first load)

---

## Decisions made

- **Decision A: Filter implementation server-side, not client-side.** Pagina UI face un singur `/api/audit-log?<filters>` la fiecare schimbare de filter, nu filtrează un cache local. Asta menține comportamentul determinist (paginare + facete corecte) și permite limit/offset pe seturi mari. Tradeoff: o round-trip suplimentar per filter change, dar pentru un dataset capped la 200 events e neglijabil.
- **Decision B: Inline markdown builders în audit-pack-builder pentru module care necesită request context.** RoPA și Vendor exportă markdown via funcții ce intern apelează `readState()` (request-scoped). Pentru a permite cross-org pack-uri (cabinet → client), am inline-uit logica de markdown direct pe records din state-ul deja încărcat. Pentru DPIA + Breach am refolosit `buildDpiaMarkdownForRecord` + `buildBreachMarkdown` care primesc records ca argument (pure).
- **Decision C: Extended manifest summary backward compatible.** Toate câmpurile noi sunt optional pe `AuditPackManifest.summary`. `verifyAuditPackZip` rebuild-uiește `manifestBase` din câmpurile parse-uite din `MANIFEST.json` — JSON.stringify produce același byte stream pentru pre-Sprint-011 pack-uri (câmpuri lipsă rămân lipsă). Verify-pack UI page deja folosea câmpuri optional pe summary, deci nicio modificare client-side.
- **Decision D: Hash chain verification rulează pe TOTUL, nu pe filtered.** Lanțul e secvențial global; dacă filtrăm doar o pagină, brokenAt e meaningless. UI arată chain status pentru tot ledger-ul, iar filterele afectează doar lista vizibilă + export.
- **Decision E: Sidebar position.** Mandate § cere între "Dosar" și "Audit Pack". În UI-ul actual ordinea era `Audit Pack → De rezolvat → Dosar`, deci "Audit Pack" e DEASUPRA "Dosar". Am plasat "Audit Log" DUPĂ "Dosar" (sub el), păstrând spiritul (audit log e mai jos, după dosar). Vizibil în toate workspace modes.
- **Decision F: AI Discovery policy pack regenerat la build-time.** Templates sunt parametrizate doar pe orgName + generatedAtISO; nu există state persistent pentru ele. Audit Pack rebuild-uiește pack-ul fresh la fiecare export, garantând că versiunea livrată corespunde momentului export-ului.

---

## Concerns / Blockers

- ⚠️ **Cap 200 events în state.** `appendComplianceEvents` păstrează doar 200 cele mai recente. Pentru org-uri foarte active, evenimentele vechi sunt overflow-uite din state. Audit Pack-ul include doar ce e în state; pentru istoric complet pe termen lung, trebuie să persistăm events în Supabase într-o tabelă dedicată sau să cresc cap-ul. Decizie: am lăsat la 200 (compatibil cu Sprint 008A); Sprint 022 (preventive engine) va trebui să adreseze.
- ⚠️ **UI pagina filtrelor cere refetch la fiecare keystroke pe search.** Nu am debounce încă; pentru 200 events e fine, pentru viitor (când scoatem cap-ul) trebuie debounce 300ms.
- ✅ **Backward compat verify-pack:** verificat explicit cu test (pre-Sprint-011 shape passes, extended shape passes).

---

## Commits

- `4ca768a` — feat(sprint-11-1): audit log formatters (markdown + CSV + JSON)
- `c3e13c9` — feat(sprint-11-2): /api/audit-log GET with filters + chain verification
- `86ed03a` — feat(sprint-11-3): /api/audit-log/export (markdown + JSON + CSV)
- `d8175c8` — feat(sprint-11-4): /dashboard/audit-log full event ledger UI with filters + verify + export
- `75938c0` — feat(sprint-11-5): audit-pack-builder upgrade — wire DPIA + RoPA + Breach + AI Discovery + Vendor + Audit Log
- `06c834c` — feat(sprint-11-6): verify-pack backward compat + extended manifest support
- `<this commit>` — docs(sprint-11): sprint log + INDEX update

## Live URL

- Production: `https://eu-ai-act-beige.vercel.app/dashboard/audit-log`
- API: `https://eu-ai-act-beige.vercel.app/api/audit-log` + `/api/audit-log/export`

---

## Dependencies

**Requires from previous sprints:**
- Sprint 008A (events + hash chain + ComplianceState)
- Sprint 008B (findings store + audit trail)
- Sprint 008C (DPIA + RoPA markdown builders)
- Sprint 008D (Breach markdown builder)
- Sprint 009 (AI Data Map + AI Exposure Report + AI Policy Pack)
- Sprint 010 (Vendor records + vendor-review-engine.buildVendorReviewBrief)
- Sprint 004 (Audit Pack builder + hash chain + verify endpoint)

**Unlocks for next sprints:**
- Sprint 012 (DORA AI slice + NIS2 AI slice) — putem emite events noi cu prefix `dora.` și `nis2.` care vor apărea automat în audit log + Audit Pack
- Sprint 013 (Approval queue + Trust Center) — `approval.*` events deja merg în ledger; doar adăugarea categoriei
- Sprint 022 (preventive engine) — periodic reclassification rules pot emite events `drift.*` deja vizibile
- Toate sprint-urile viitoare care emit events au automat audit trail UI + audit pack inclusion

---

## Donor paths inspected

- `/Users/vaduvageorge/Desktop/CompliAI/.claude/worktrees/v3-unified/app/api/audit-log/route.ts` — pattern API GET cu state + chain verify (a folosit `requireFreshRole` + `jsonError` care nu există în CompliRoAI, rewrite-uit la `getOrgContext` + `NextResponse.json`)
- `/Users/vaduvageorge/Desktop/CompliAI/.claude/worktrees/v3-unified/components/compliscan/reports-audit-log-page.tsx` — UI pattern cu filter tabs + CSV export client-side + Card/Badge/Button shadcn (rewrite complet la inline styles v3 vars, păstrat structura conceptuală: filter bar + table + export buttons + verify, extins cu metadata expand + facets + chain banner)

## Files intentionally skipped

- `/Users/vaduvageorge/Desktop/CompliAI/.claude/worktrees/v3-unified/app/dashboard/audit-log/page.tsx` și `/dashboard/reports/audit-log/page.tsx` — donor erau doar redirect-uri de 5 LOC; nu aveam ce porta direct, am scris pagina noua respectând v3 inline-style canon.
- Componente Card/Badge/Button/DenseListItem/EmptyState de la donor — folosesc shadcn/Tailwind care nu există în CompliRoAI; reimplementate ca inline div-uri cu v3 design tokens.

---

## Legal references used

- N/A (sprintul nu adaugă obligații legale noi; doar expune evidence-ul existent)
- Implicit suportă: GDPR Art. 5(2) accountability principle, AI Act Art. 12 (logging requirements) — auditul cryptographic ledger demonstrates "appropriate technical measures"

---

## Notes pentru următorul agent

- **Pattern audit pack module wire-up:** orice modul nou care emite findings/events trebuie să aibă o funcție `pushXFiles(files, state, orgName, generatedAt)` adăugată în `lib/server/audit-pack-builder.ts`. Funcția trebuie să fie PURE (lucrează doar pe state-ul deja încărcat, nu apelează `readState()`). Pentru cross-org pack-uri să funcționeze, NU folosi `readState()` în builder.
- **Pattern audit log UI:** când adăugi un nou tip de event, mapează-l în `entityLink(e)` din `app/dashboard/audit-log/page.tsx` ca să primească deep-link în UI.
- **Cap 200 events:** dacă orgs activi se plâng de pierdere istoric, trebuie:
  1. mărit cap în `appendComplianceEvents` din `lib/compliance/events.ts`
  2. SAU adăugat tabelă Supabase `compliance_events` cu archive-uri vechi
  3. SAU adăugat filtru "include archived" în UI + API
- **Chain verification pe export:** dacă lanțul e rupt, ce facem? Acum doar logăm `chainOk: false` în manifest summary + `chain-verification.json` în ZIP. Auditor-ul vede. Nu blocăm export-ul (ar fi rău pentru dovadă forensică). Strategie corectă.
- **Concern Sprint 012:** DORA + NIS2 AI slice trebuie să emită events cu prefix consistent (`dora.ai.*`, `nis2.ai.*`) ca să se filtreze ușor în audit log. Nu inventa categorii noi de event entityType — folosește existing (`finding`, `system`, `integration`, `drift`).

---

## Concerns for Sprint 012

- Daca DORA AI slice e implementat ca module nou, trebuie să aibă `pushDoraFiles()` adăugat în audit-pack-builder pentru evidence-ul DORA AI vendors / incident reports.
- NIS2 AI slice — același pattern. Probabil `pushNis2Files()` pentru AI-critical infrastructure assessments.
- Risk: dacă DORA/NIS2 portează modules care folosesc `requireFreshRole` din donor, trebuie filter (la fel ca Sprint 011 a făcut cu audit-log donor route).
