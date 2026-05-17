# Sprint 013 — Approval Queue + Calendar + Trust Center

**Status:** DONE
**Faza:** 1 — Port masiv din DPO-OS (collaboration + customer-facing surface)
**Start:** 2026-05-17 18:48
**End:** 2026-05-17 19:18
**Owner:** manual: Claude (Opus 4.7, 1M context)

---

## Goal

Port colaborarea cabinet ↔ client (approval queue) + agregator deadlines (calendar) + surface publică white-labeled pentru a dovedi postura de compliance (Trust Center) — strict pe stack-ul existent (JSONB org_state, hash-chain events, white-label din Sprint 003, share-token-style HMAC din Sprint 002).

---

## Task list

- [x] Tipuri `ApprovalRequest`, `CalendarEvent`, `TrustCenterToken`, `TrustCenterPublicProfile`
- [x] `approval-queue-store.ts` adapter (CRUD + apply-on-approve) + 12 tests
- [x] API routes `/api/approvals` + `/api/approvals/[id]` (GET, POST, PATCH)
- [x] UI `/dashboard/approvals` (queue + tabs + expand + approve/reject inline)
- [x] `calendar-aggregator.ts` pure function (8 surse) + 15 tests
- [x] API routes `/api/calendar` + `/api/calendar/ical` (RFC 5545)
- [x] UI `/dashboard/calendar` (agenda + month grid + iCal subscribe)
- [x] `trust-center-builder.ts` pure function + 9 tests
- [x] API routes `/api/trust-center` (auth) + `/api/trust-center/[token]` (public GET, auth DELETE)
- [x] UI `/dashboard/trust-center` (manage tokens + preview iframe)
- [x] UI `/trust/[token]` (PUBLIC server component, white-labeled, NO PII)
- [x] Sidebar wire: Aprobări (cabinet) + Calendar (all) + Trust Center (cabinet)
- [x] Middleware bypass GET `/api/trust-center/[token]` + `/trust/*`
- [x] Build clean, tsc clean, 447 tests pass (411 baseline + 36 new)
- [x] Sprint log + INDEX update
- [x] 9 commits incrementale push-uite

---

## Donor evidence (Rule 1)

```bash
rg -l "approval|trust-center|calendar" /Users/vaduvageorge/Desktop/CompliAI/.claude/worktrees/v3-unified/lib
# → lib/server/approval-queue.ts (506 LOC) — pattern Supabase + local fallback
# → lib/server/shared-approval.ts (34 LOC) — types
# → lib/server/vendor-trust-pack.ts (335 LOC) — referință stat agregare
# → app/api/approvals/route.ts + [id]/route.ts
# → app/api/dashboard/calendar/route.ts (221 LOC)
# → app/dashboard/calendar/page.tsx (308 LOC)
# → app/trust/[orgId]/page.tsx (donor surface)
```

**Donor filter rationale:**

Donor `approval-queue.ts` folosește un tabel Supabase dedicat (`pending_actions`). CompliRoAI folosește `org_state.approvalRequests` JSONB — aliniat cu pattern-ul existent (vezi Sprint 002 share-tokens, Sprint 008+ findings/dpia/ropa). Am preluat:
- types `PendingAction` filtrate la enityType-uri AI/GDPR specifice (exclus `submit_anaf`, `vendor_merge`, `repair_efactura` care sunt fiscal-only)
- pattern `decidePendingAction` cu auto-apply pe entitate (extins cu apply-on-approve atomic în CompliRoAI)

Donor `app/dashboard/calendar/page.tsx` agrega evenimente fiscale (ANAF, e-Factura). Am rescris complet ca să respecte Rule 3: zero fiscal, doar GDPR/AI Act/DORA/NIS2 deadlines. Hardcoded `AI_ACT_FIXED_DATES` (6 deadline-uri oficiale).

Donor `vendor-trust-pack.ts` arată pattern-ul de stat agregare. Construit `trust-center-builder.ts` mai strict: counts-only, NO PII, garanție test că `JSON.stringify(profile)` nu conține detalii sensibile.

---

## Files created

### Types + core
- `lib/compliance/types.ts` — extins cu `ApprovalRequest`, `ApprovalStatus`, `ApprovalEntityType`, `ApprovalRequesterRole`, `CalendarEvent`, `CalendarEventModule`, `CalendarEventSeverity`, `CalendarEventStatus`, `CalendarEventRecurrence`, `TrustCenterToken`, `TrustCenterPublicProfile`. `ComplianceState` primește `approvalRequests?`, `trustCenterTokens?`.

### Approval Queue
- `lib/server/approval-queue-store.ts` (~520 LOC) — readApprovalRequests, getApprovalRequestById, listApprovalRequests, createApprovalRequest, approveApprovalRequest (cu apply atomic), rejectApprovalRequest, withdrawApprovalRequest, expireOldApprovalRequests, summarizeApprovals, requiresApprovalForRequest. Apply-on-approve pentru 7 entity types (finding_status_change, dpia_screening, breach_anspdcp_decision, breach_subject_skip, vendor_approved, vendor_rejected, ai_system_classification) + 3 informative (transparency/readiness/audit pack).
- `lib/server/approval-queue-store.test.ts` (~430 LOC) — 12 teste.
- `app/api/approvals/route.ts` — GET list + POST create.
- `app/api/approvals/[id]/route.ts` — GET + PATCH (approve/reject/withdraw).
- `app/dashboard/approvals/page.tsx` (~480 LOC) — queue UI cu 5 stat cards, 5 tabs, expand inline cu JSON pretty + approve/reject + comment textarea.

### Calendar
- `lib/compliance/calendar-aggregator.ts` (~470 LOC) — pure function `aggregateCalendarEvents` din 8 surse + `buildICal` RFC 5545. `AI_ACT_FIXED_DATES`: 6 deadline-uri (Art. 5 prohibited, Art. 4 literacy, GPAI, Art. 50 — 2 dec 2026, Anexa III high-risk — 2 aug 2027, Anexa I products).
- `lib/compliance/calendar-aggregator.test.ts` (~330 LOC) — 15 teste.
- `app/api/calendar/route.ts` — GET cu filter ?from=&to=&modules=.
- `app/api/calendar/ical/route.ts` — GET text/calendar attachment .ics.
- `app/dashboard/calendar/page.tsx` (~510 LOC) — toolbar (view switch / refresh / copy iCal / download), filter chips pe modul, agenda view (grouped pe zi), month grid view (6×7, monday-first), modal event detail.

### Trust Center
- `lib/server/trust-center-builder.ts` (~150 LOC) — `buildTrustCenterProfile` pure. Stats counts-only, frameworks auto-derivat, latestAuditPack din registry, attestations (transparency, role, literacy, DPIA, breach).
- `lib/server/trust-center-builder.test.ts` (~370 LOC) — 9 teste; un test garantează **NO PII**: serializează profile + verifică că `TOPSECRET` / `confidential` / nume vendor nu apar.
- `app/api/trust-center/route.ts` — GET list tokens (cu publicUrl) + POST create token (HMAC self-contained, payload `{id, orgId, kind:"trust-center"}` signat AIACT_SESSION_SECRET).
- `app/api/trust-center/[token]/route.ts` — GET PUBLIC (no auth) → load state fără session via helper local + build profile + increment viewCount; DELETE (auth) revoke.
- `app/dashboard/trust-center/page.tsx` (~440 LOC) — manage panel cu lista tokens + modal create + preview iframe live.
- `app/trust/[token]/page.tsx` (~250 LOC, Server Component, force-dynamic) — pagina publică cu gradient hero (white-label colors), 5 secțiuni (frameworks, role, stats, audit pack, attestations), footer cu verify link.

### Docs
- `docs/sprints/sprint-013-approval-calendar-trust.md` — această cronică.

## Files modified

- `components/shell/dashboard-shell.tsx` — adăugate import-uri lucide (CheckSquare, Calendar, Eye) + 3 nav items după "Audit Pack": Aprobări (cabinet), Calendar (all), Trust Center (cabinet).
- `middleware.ts` — bypass pentru `/trust/*` (page) și `GET /api/trust-center/[token]` (request.method check). DELETE/POST pe `/api/trust-center/...` rămân session-gated.

## Files removed

(none)

---

## Schema changes

State extension (backward-compat, optional):

```ts
type ComplianceState = {
  // … existing fields
  approvalRequests?: ApprovalRequest[]
  trustCenterTokens?: TrustCenterToken[]
}
```

No Supabase DDL — totul în `org_state` JSONB existent. Audit pack registry deja persistat în `org_state.auditPacks` (Sprint 004) — folosit de trust-center-builder.

---

## Tests

- `npx tsc --noEmit`: clean (0 errors).
- `npm run build`: clean (toate route-urile registrate, vezi output).
- `npx vitest run`: **447 / 447** (411 baseline + 12 approval + 15 calendar + 9 trust-center).
- Apply-on-approve verificat: creat approval → approved → finding updatat (test integrare cu apply finding_status_change + DPIA + vendor + breach + AI system).
- iCal: VCALENDAR/VERSION:2.0/VEVENT structură validate via test (DTSTART/DTEND, RRULE FREQ=YEARLY pentru recurring RoPA, CATEGORIES, escape virgule+;).
- Trust Center NO PII: test garantează `JSON.stringify(profile)` nu conține `TOPSECRET`, `confidential`, `xyz`.

Live route registration (build output):
```
ƒ /api/approvals
ƒ /api/approvals/[id]
ƒ /api/calendar
ƒ /api/calendar/ical
ƒ /api/trust-center
ƒ /api/trust-center/[token]
ƒ /dashboard/approvals       5.07 kB
ƒ /dashboard/calendar        5.58 kB
ƒ /dashboard/trust-center    4.85 kB
ƒ /trust/[token]              168 B
```

---

## Decisions made

- **Trust Center token = HMAC self-contained (NOT share_tokens reuse).** Sprint 002 `share-token-store` are 3 target types (`intake`, `approval`, `report`) și logica Supabase registry. Pentru Trust Center am scris un mini-encoder dedicat (`kind: "trust-center"` în payload) ca tokens să fie scoped clar + storage simplu în `org_state.trustCenterTokens` (revoke + viewCount fără tabel separat). Avantaj: NU depinde de Supabase pentru funcționalitate de bază.
- **Apply-on-approve atomic în același mutator state.** Decizia + aplicarea schimbării rulează în același `mutateFreshStateForOrg`. Dacă entitatea nu există (e.g. finding șters între timp), request-ul ajunge la status `approved` dar cu `applied: false` + eveniment `approval.applied.skipped` în ledger. Audit-trail-ul rămâne complet, queue-ul nu se blochează pe request orfan.
- **NU am wire-uit auto-creare approval în PATCH-urile findings/dpia/breach/vendor.** Plan B din mandate § 22: cabinet POST către `/api/approvals` din UI client-side. Motiv: refactor în 4 module ar fi necesitat un sprint dedicat de plumbing (PATCH route → detect workspaceMode + requesterRole → split flow între direct-apply vs queue). În schimb, am expus helper-ul `requiresApprovalForRequest(workspaceMode, requesterRole)` ca să poată fi wired în Sprint 014 sau direct când e nevoie. **Documentat ca follow-up.** Cabinet poate deja crea approval requests manuale din UI (POST `/api/approvals`).
- **Calendar pure function (NO state writes).** `aggregateCalendarEvents` doar citește din `ComplianceState` + emite evenimente derivate. Iar `buildICal` ia evenimente + emite text. Avantaj: 0 side effects, testabil 100%, idempotent.
- **iCal nu necesită token în URL.** Per matcher curent, `/api/calendar/ical` e session-gated; export-ul curge prin browser cookie când user-ul îl descarcă. Pentru subscribe extern (Google/Outlook), un viitor sprint poate genera un personal access token (similar Sprint 002).
- **AI Act FIXED dates hardcoded în aggregator.** Datele oficiale UE (2 feb 2025, 2 aug 2025, 2 dec 2026 amânat, 2 aug 2027) NU vin din state — sunt static + reflectă Regulament 2024/1689 + Omnibus mai 2026. Schimbarea lor cere edit cod (semantica e "verificat manual împotriva textului oficial").

---

## Concerns / Blockers

- ⚠️ **Wire-up auto-approval în PATCH module nu e făcut** — `requiresApprovalForRequest` exists ca predicat, dar nu e apelat din findings/dpia/breach/vendor PATCH routes. Sprint 014 sau ulterior poate adăuga un wrapper `runOrEnqueue` care, în mod cabinet + requester=client, route-uiește prin queue. Status: API + UI complet funcțional pentru creare manuală.
- ⚠️ **Trust Center public — orgName fallback.** Pentru orgId-uri care nu au `partnerWorkspace.orgName`, folosim `branding.brandName` sau prefix `Organizație ${id.slice(0,8)}`. Pentru go-live, ar trebui ca onboarding să garanteze orgName populat (sau Supabase orgs table separat). Trade-off acceptat: e o pagină publică, nu critică.
- ⚠️ **iCal — exporta toate evenimentele (no per-token gate).** Cine are session cookie poate descărca .ics complet. Pentru flow "subscribe public" (Google/Outlook), Sprint 014 poate adăuga token în URL similar Trust Center.

---

## Commits

- `ac704e4` — feat(sprint-13-1): types — ApprovalRequest + CalendarEvent + TrustCenterToken/Profile
- `c0b134e` — feat(sprint-13-2): approval-queue-store adapter (CRUD + apply on approve)
- `7226a0d` — feat(sprint-13-3): approval API routes (CRUD + approve/reject)
- `b9ee8d2` — feat(sprint-13-4): /dashboard/approvals queue UI cu approve/reject
- `3828a4d` — feat(sprint-13-5): calendar-aggregator (DSAR + DPIA + RoPA + Breach + Vendor + AI Act dates + Approval)
- `8dc6aba` — feat(sprint-13-6): calendar API + UI (month + agenda + iCal export)
- `53b8de7` — feat(sprint-13-7): trust-center-builder + token API (HMAC public links)
- `19ac0fa` — feat(sprint-13-8): /dashboard/trust-center + /trust/[token] public white-labeled page
- `(this commit)` — docs(sprint-13): sprint log + INDEX update

## Live URL

- Production target: `https://eu-ai-act-beige.vercel.app/dashboard/approvals` + `/dashboard/calendar` + `/dashboard/trust-center` + `/trust/<token>`
- Preview Vercel: după push

---

## Dependencies

**Requires from previous sprints:**
- Sprint 002 (share-tokens HMAC pattern — reused conceptually pentru Trust Center)
- Sprint 003 (white-label) — Trust Center public page aplică branding
- Sprint 004 (audit pack registry) — Trust Center include hashRoot al ultimului pack
- Sprint 008A (events ledger hash chain) — toate aprobările + revocările trust center se înregistrează în chain

**Unlocks for next sprints:**
- Sprint 014 (PDF + Emails + Stripe): notification email când o cerere e aprobată/respinsă; PDF export Trust Center profile.
- Sprint 015 (Role-aware UI): folosește `requiresApprovalForRequest` pentru a wire route-urile PATCH în mod automat.

---

## Notes pentru următorul agent

- Apply-on-approve este atomic — schimbarea entității și update-ul approval status sunt în același `mutateFreshStateForOrg`. Dacă adăugați un nou `entityType`, extindeți `applyProposedChange` în `approval-queue-store.ts` + adăugați un caz în `applyXyz()` cu pattern-ul existent (`{applied, nextState, skipReason}`).
- Trust Center public URL e `${origin}/trust/${token}`. NU schimbați format-ul payload-ului (`{id, orgId, kind:"trust-center"}`) — invalidează toate token-urile existente. Dacă vreți să schimbați secretul, faceți rotation cu doi secreți (decode acceptă oricare).
- `buildICal` e RFC 5545. Testat în Google Calendar / Apple Calendar manual înainte de Sprint 014; dacă apar issue-uri pe `RRULE`, vezi RFC 5545 §3.8.5.
- `/dashboard/trust-center` are un preview iframe live — orice schimbare în state se reflectă imediat la refresh-ul iframe-ului.
- `AI_ACT_FIXED_DATES` e hardcoded — dacă UE Omnibus din 2027/2028 amână din nou, edit `lib/compliance/calendar-aggregator.ts` + adaugă entry în CHANGELOG ANAF (există deja un pattern similar pentru fiscal).
- Middleware: orice nou route public trebuie adăugat în bypass-list explicit. Patern-ul pentru method-gated public (ca trust-center GET vs DELETE) e folosit prima dată aici.
