# Sprint 007 — DSAR Full Port (GDPR Art. 15-22)

**Status:** DONE
**Faza:** 1 (PORT MASIV DPO-OS)
**Start:** 2026-05-17 10:30
**End:** 2026-05-17 11:00
**Owner:** manual: Claude

---

## Goal (1 propoziție)

Portare end-to-end a modulului DSAR (Data Subject Access Requests, GDPR Art. 15-22) din DPO-OS `v3-unified` în CompliRoAI, cu drept de „drop-in" pe API surface dar adaptat la pattern `readState/writeState` + `getOrgContext()` din CompliRoAI.

---

## Task list

- [x] Types DSAR în `lib/compliance/types.ts` (DsarRequestType, DsarStatus, DsarRequest)
- [x] Extensie `AIActState.dsarRequests?` în `lib/server/store.ts` + `mergeWithDefault`
- [x] Port `lib/server/dsar-store.ts` (adaptor către `readState/writeState`)
- [x] Port `lib/compliance/dsar-drafts.ts` (RO templates per request type, 321 LOC)
- [x] Port `lib/compliance/dsar-lifecycle.ts` (8 step lifecycle + 11 acțiuni)
- [x] Port tests (`dsar-drafts.test.ts` + `dsar-lifecycle.test.ts`, 4 teste)
- [x] Rewrite API route `app/api/dsar/route.ts` (GET list + POST create)
- [x] Rewrite API route `app/api/dsar/[id]/route.ts` (PATCH update / DELETE)
- [x] Rewrite API route `app/api/dsar/[id]/draft/route.ts` (GET draft)
- [x] Rewrite UI `app/dashboard/dsar/page.tsx` (inline styles + v3 tokens, full CRUD + lifecycle)
- [x] Wire DSAR în sidebar (`components/shell/dashboard-shell.tsx`)
- [x] Fix pre-existing TS error în `app/dashboard/sisteme/page.tsx` (workspaceMode legacy → 3-mode)
- [x] `npx tsc --noEmit` clean
- [x] `npx vitest run` 22/22 pass
- [x] `npm run build` clean
- [ ] Commit + push (next)
- [ ] Live test pe `eu-ai-act-beige.vercel.app/dashboard/dsar` (next)

---

## Files created

- `lib/server/dsar-store.ts` — adapter store, drop-in API (createDsar, updateDsar, deleteDsar, readDsarState, seedDsarState, getDsarById) peste `readState/writeState` din CompliRoAI
- `lib/compliance/dsar-drafts.ts` — generator template răspuns RO per request type + DSAR process pack reutilizabil
- `lib/compliance/dsar-drafts.test.ts` — 2 teste vitest
- `lib/compliance/dsar-lifecycle.ts` — 8 step lifecycle (intake → identity → scope_systems → data_search → draft_response → human_review → send_response → archive) + 11 acțiuni shortcut + legal clock (30 zile, extensibil 60)
- `lib/compliance/dsar-lifecycle.test.ts` — 2 teste vitest
- `app/api/dsar/route.ts` — GET list (cu processPack) + POST create (cu dedup window 5min + auto-draft)
- `app/api/dsar/[id]/route.ts` — PATCH (cu workflow action resolution) + DELETE
- `app/api/dsar/[id]/draft/route.ts` — GET regenerează draft + marchează `draftResponseGenerated = true`
- `app/dashboard/dsar/page.tsx` — UI complet ~1000 LOC: stats bar, filter tabs, create modal, list cu expand/collapse, lifecycle visualization, quick actions, draft preview cu copy, process pack panel
- `docs/sprints/sprint-007-dsar-port.md` — acest log

## Files modified

- `lib/compliance/types.ts` — adăugat DsarRequestType / DsarStatus / DsarRequest la finalul fișierului (cu comentariu GDPR Art. 15-22)
- `lib/server/store.ts` — adăugat import `DsarRequest`, câmpul `dsarRequests?: DsarRequest[]` în `AIActState`, propagat în `mergeWithDefault`
- `components/shell/dashboard-shell.tsx` — adăugat NavItem "DSAR (GDPR)" cu icon Mail (între Transparency și Role Assessment)
- `app/dashboard/sisteme/page.tsx` — fixat TS error pre-existent: `workspaceMode` state era `"solo" | "cabinet"`, dar `AISystemsList` așteaptă `"imm-classic" | "ai-builder" | "cabinet"`; convertit la 3-mode

## Files removed

- — (nimic)

---

## Schema changes

- **Supabase:** nimic (folosim JSONB existent `org_state.dsarRequests`)
- **State extension:** `AIActState.dsarRequests?: DsarRequest[]` (opțional, default `undefined` → tratat ca `[]` la citire)
- **Backward compat:** state-uri vechi fără `dsarRequests` continuă să funcționeze (mergeWithDefault propagează undefined)

---

## Tests

- `npx tsc --noEmit`: clean (0 errors)
- `npm run build`: clean — DSAR routes registrate:
  - `/api/dsar` 225 B / 103 kB
  - `/api/dsar/[id]` 225 B / 103 kB
  - `/api/dsar/[id]/draft` 225 B / 103 kB
  - `/dashboard/dsar` 8.53 kB / 111 kB
- `npx vitest run`: 22/22 pass (4 noi pentru DSAR + 18 existente)
- Live test: pending după push

---

## Decisions made

- **Decision A:** Store adapter, NU rewrite. `lib/server/dsar-store.ts` păstrează signature DPO-OS (createDsar/updateDsar/deleteDsar/readDsarState) ca să fie drop-in pentru cod portat ulterior, dar intern folosește `readState/writeState` din CompliRoAI. Avantaj: codul ported (drafts, lifecycle) nu trebuie refactorizat.
- **Decision B:** API routes REWRITE complet, nu sed-port. DPO-OS folosește `requireFreshRole`, `WRITE_ROLES`, `mvp-store`, `appendComplianceEvents` care NU există în CompliRoAI. Pattern CompliRoAI: `getOrgContext()` + inline `NextResponse.json({error, ..., status})`. Mult mai simplu, mai puțin cod.
- **Decision C:** UI REWRITE complet, nu sed-port. Sursa DPO-OS (`app/dashboard/dsar/page.tsx`, 759 LOC) folosește shadcn/ui Card/Button/Badge etc. care nu există în CompliRoAI. Stack CompliRoAI = inline styles + v3 design tokens (`var(--cobalt-600)`, `var(--ink)`, `var(--font-display-v3)`, `var(--surface-1)` etc). Rewrite păstrează feature parity dar adoptă conventia stack.
- **Decision D:** Eliminat `appendComplianceEvents` din POST create. CompliRoAI nu are sistem events. Audit trail va veni separat în Sprint 011 (audit-log port).
- **Decision E:** Eliminat dependency RBAC roles (`requireFreshRole`, `WRITE_ROLES`, `DELETE_ROLES`). CompliRoAI nu are roles per org încă (single-tenant per user din auth.ts). Acces controlat doar prin middleware existent (sesiune validă). Dacă mai târziu vine multi-role, layer-uim peste `getOrgContext()`.
- **Decision F:** Dedup window 5 min e re-implementat în 2 locuri (atât în API route cât și în `createDsar`). Decizia: las dublură pentru că răspunsul API trebuie să returneze flag `deduplicated: true` (UX), iar store-ul protejează independent.

---

## Concerns / Blockers

- ⚠️ Tests sunt thin (4 teste portate, două per modul). DPO-OS avea mai multe — ar trebui extinse în viitor cu edge cases: deadline overdue, transitions invalide, refused workflow, extend-deadline timing.
- ⚠️ UI nu are paginare. Funcționează ok pentru <100 cereri, dar pentru cabinet cu 30+ clienți × ani de DSARs ar putea fi necesară paginare. Nu blocheaz launch.
- ⚠️ Nu am wire DSAR în Readiness Pack încă (ca dovadă "Avem registru DSAR funcțional"). Sprint viitor.
- ⚠️ Lucid icon `Mail` folosit deja altundeva? Verificat: nu, în `dashboard-shell.tsx` import-ul era curat.
- 🚫 Niciun blocker.

---

## Commits

- `e32827e` — feat(sprint-7): DSAR full port from DPO-OS (GDPR Art. 15-22) + Sprint 6.5 groundwork

## Live URL

- Production: `https://eu-ai-act-beige.vercel.app/dashboard/dsar` (după push)
- Preview Vercel: URL after push

---

## Dependencies

**Requires from previous sprints:**
- Sprint 1 (multi-tenancy + `getOrgContext()`)
- Sprint 5.5 (state extension pattern + roleAssessment ca exemplu de adăugare cleană)

**Unlocks for next sprints:**
- Sprint 8 (DPIA + ROPA + Breach) — același adapter pattern store
- Sprint 14 (PDF generator + onboarding emails) — DSAR responses pot fi emailed prin Resend
- Sprint 15 (Role-aware UI) — DSAR e relevant pentru toate 3 mode-uri (IMM/Builder/Cabinet)
- Future Readiness Pack v2 — include DSAR registry summary

---

## Notes pentru următorul agent

- **Pattern store adapter dovedit funcțional.** Pentru Sprint 8 (DPIA/ROPA/Breach), copiază exact pattern-ul din `lib/server/dsar-store.ts`: păstrează signature DPO-OS, intern folosește readState/writeState.
- **API routes rewrite vs port:** dacă sursa folosește `requireFreshRole`/`WRITE_ROLES`/`mvp-store`/`events`, este mai rapid REWRITE direct decât sed-port. Adapt-ul costă mai mult decât scrierea fresh.
- **UI: NU folosi shadcn.** Stack-ul CompliRoAI = inline styles + v3 tokens (`var(--surface-1)`, `var(--cobalt-600)`, `var(--ink)`, `var(--font-display-v3)`). Vezi `app/dashboard/dsar/page.tsx` ca referință pentru: stats bar, filter tabs, modal create, expand/collapse list, copy-to-clipboard buttons.
- **Românește în UI.** Toate label-urile, error message-urile, descrierile sunt în română (țintă piață RO). Atenție la quotation marks: ghilimelele românești „..." în string-uri JSX double-quoted SPARG parserul TypeScript. Workaround: folosește simple quotes sau escape.
- **Romanian text gotcha:** următorul agent care editează UI-ul, fii atent: `"text cu „ghilimele românești"."` în JSX = TS1003 error. Folosește `'text cu "ghilimele simple".'` sau template literal.
- **Workspace mode**: legacy `"solo" | "cabinet"` încă există în `DashboardShell` interface și în sesiunea de auth. Sprint 15 va consolida la 3-mode (`imm-classic | ai-builder | cabinet`). Până atunci, pages care derive din `/api/auth/me` pot fi mixate — vezi `app/dashboard/sisteme/page.tsx` ca exemplu de tranziție validă.
- **Test coverage:** vitest este config'd, rulează cu `npx vitest run`. Pentru watch mode `npx vitest`. Pune teste cot la cot cu modulul: `lib/compliance/foo.ts` + `lib/compliance/foo.test.ts`.
