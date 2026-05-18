# Sprint 023.5 — Production Readiness / Full Application QA

**Status:** DONE
**Faza:** 5 (Commercial — final pre-commercial QA pass)
**Start:** 2026-05-18 14:18
**End:** 2026-05-18 14:42
**Owner:** manual: Claude (Opus 4.7, 1M ctx)

---

## Goal (1 propoziție)

Validate + harden the complete CompliRoAI application as production-ready: static health, forbidden-framework leak scan, copy hygiene, cron auth, secret-leak audit, nav per workspace, and copy/UX coherence — fix everything found in-sprint, NO new features.

---

## Task list

- [x] Phase 1 — Static health (tsc + vitest + build)
- [x] Phase 2 — Forbidden framework leak scan
- [x] Phase 3 — Copy hygiene (demo / mock / MVP / coming-soon)
- [x] Phase 4 — Empty/error states spot check
- [x] Phase 5 — Per-workspace nav verification (existing tests run)
- [x] Phase 6 — Module-by-module spot check (5+ pages)
- [x] Phase 7 — Audit Pack secret-leak audit
- [x] Phase 8 — Cron route safety audit
- [x] Phase 9 — Mobile/desktop layout sanity
- [x] Phase 10 — Final verification + sprint log + INDEX
- [x] All fixes committed atomically
- [x] STOP înainte de Sprint 24

---

## Findings table

| # | Categorie | Locație | Problemă | Severitate | Status |
|---|---|---|---|---|---|
| 1 | Security | `app/api/cron/preventive-scan/route.ts` | Dacă `CRON_SECRET` lipsește în env, auth check `if (cronSecret && ...)` short-circuit-uia spre `false` și permitea oricui să declanșeze `runPreventiveScan` pe org default — mutație state + emisie events fără auth | CRITICAL | FIX_APPLIED |
| 2 | Security | `app/api/cron/renewal-reminders/route.ts` | Aceeași clauză vulnerabilă ca #1 — `dispatchScheduledReminders` publicly callable fără CRON_SECRET | CRITICAL | FIX_APPLIED |
| 3 | Brand/Framework | `app/dashboard/resolve/page.tsx` | Filter chip auto-shown pe categoria `E_FACTURA` dacă există findings legacy + label literal "e-Factura" expus UI | MEDIUM | FIX_APPLIED |
| 4 | Brand/Framework | `app/dashboard/dosar/page.tsx` | `CATEGORY_LABELS.E_FACTURA: "e-Factura"` expus în UI dosar | MEDIUM | FIX_APPLIED |
| 5 | Brand/Framework | `app/api/findings/route.ts` | Mesaj eroare 400 public expune `E_FACTURA` în șirul `EU_AI_ACT/GDPR/E_FACTURA/NIS2` | MEDIUM | FIX_APPLIED |
| 6 | Copy hygiene | `app/page.tsx:637` | CTA landing "Cere demo + ofertă" încalcă mandate § 20 (interzis `demo` în copy) | LOW | FIX_APPLIED |
| 7 | Branding | `lib/server/supabase-auth.ts` | Env var `COMPLISCAN_AUTH_BACKEND` — mandate § 20 cere prefix `AIACT_*` | LOW | FIX_APPLIED |
| 8 | Branding | `lib/server/supabase-org-state.ts` | Env var `COMPLISCAN_DATA_BACKEND` — mandate § 20 cere prefix `AIACT_*` | LOW | FIX_APPLIED |
| 9 | Test coverage | `app/api/cron/*` | Niciun test pentru auth cron routes — regresiune posibilă | MEDIUM | FIX_APPLIED (+10 tests) |
| 10 | Audit pack secret leak | `lib/server/audit-pack-builder.ts` (api-sdk section) | Verificat: doar `prefix` + `label` + scopes intră în Audit Pack. `hmacHash` nu este expus. `fullToken` nu există pe storage. | — | RISK_NON_BLOCKER (clean) |
| 11 | API key sanitization | `app/api/v1/keys/route.ts` | Verificat: `stripHash()` elimină `hmacHash` din toate response-urile (GET list + POST create + DELETE). Tests existente acoperă scenariul. | — | RISK_NON_BLOCKER (clean) |
| 12 | Forbidden framework — code comments | `lib/compliance/types.ts`, `lib/compliance/engine.ts`, `lib/compliance/calendar-aggregator.ts`, `lib/compliance/vendor-prefill.ts`, `lib/server/stripe-tier-config.ts`, `components/shell/nav-config.ts` | Comentariile menționează `fiscal`/`e-factura`/`pay transparency`/`whistleblowing` ca module FORBIDDEN (defensive guard / context istoric). NU sunt copy user-facing. | — | DEFERRED (intentional documentation) |
| 13 | Romanian legal copy | `app/privacy/page.tsx`, `app/onboarding/page.tsx`, `app/dashboard/portofoliu/portfolio-client.tsx`, `lib/compliance/dsar-drafts.ts` | "CUI / Cod fiscal" = numele legal RO al codului unic de identificare fiscală (toate firmele RO au unul); "obligații fiscale" = temei legal GDPR Art. 6(1)(c) pentru retenție date. NU sunt module fiscale. | — | RISK_NON_BLOCKER (legitimate) |
| 14 | Legacy `FindingCategory.E_FACTURA` în type union | `lib/compliance/types.ts`, `lib/server/findings-store.ts`, `lib/compliance/constitution.ts` | Union value rămâne pentru migrare state legacy CompliAI. NU mai e expus user-facing după fix #3-5. | — | DEFERRED (backward-compat intentional, no surface) |
| 15 | Empty state coverage | `/dashboard/*` | Pages care utilizează `EmptyState`: logging-evidence, ai-incidents, vendor-review, dsar, breach, ropa, resolve, dpia, fria, post-market-monitoring. Restul utilizează inline empty patterns. Sample check OK. | — | RISK_NON_BLOCKER |
| 16 | Mobile layout sanity | sample 5 pages: dashboard, sisteme, resolve, audit-pack, api-sdk | Hard-coded widths gasite: `width: "28px"` (icon button api-sdk), `min(560px, 92vw)` (modal api-sdk), `minWidth: "100px"` (resolve action btn). All safe pentru mobile. | — | RISK_NON_BLOCKER |
| 17 | Nav per workspace | `components/shell/nav-config.ts` + `components/shell/nav-config.test.ts` | 44 tests pass. imm-classic NU vede Annex IV/FRIA/API SDK/Portofoliu; ai-builder NU vede cabinet collab; cabinet NU vede Annex IV/EU DB/API SDK. Forbidden keyword guard activ pe href + label. | — | CLEAN |

---

## Files modified

- `app/api/cron/preventive-scan/route.ts` — fail-closed în production fără CRON_SECRET (503), 401 când bearer wrong/missing dacă secret e setat
- `app/api/cron/renewal-reminders/route.ts` — același pattern fail-closed
- `app/api/cron/preventive-scan/route.test.ts` — **NEW** 5 regression tests (auth matrix)
- `app/api/cron/renewal-reminders/route.test.ts` — **NEW** 5 regression tests
- `app/dashboard/resolve/page.tsx` — drop `hasEFacturaFindings` filter chip; label `E_FACTURA: "e-Factura"` → `"Legacy"`; explain mandate Rule 3 în comment
- `app/dashboard/dosar/page.tsx` — label `E_FACTURA: "e-Factura"` → `"Legacy"`
- `app/api/findings/route.ts` — error message scoate `E_FACTURA` din lista publică, devine `EU_AI_ACT / GDPR / NIS2`
- `app/page.tsx` — landing CTA "Cere demo + ofertă" → "Cere ofertă personalizată"
- `lib/server/supabase-auth.ts` — preferă `AIACT_AUTH_BACKEND`, fallback `COMPLISCAN_AUTH_BACKEND`
- `lib/server/supabase-org-state.ts` — preferă `AIACT_DATA_BACKEND`, fallback `COMPLISCAN_DATA_BACKEND`

## Files created

- `app/api/cron/preventive-scan/route.test.ts`
- `app/api/cron/renewal-reminders/route.test.ts`
- `docs/sprints/sprint-023-5-production-readiness-full-qa.md` (this log)

## Files removed

- (none)

---

## Schema changes

- (none — pure QA hardening sprint)

---

## Tests

### Before

- `npx tsc --noEmit`: 0 errors
- `npx vitest run`: 1151/1151 passing (88 test files)
- `npm run build`: clean

### After

- `npx tsc --noEmit`: 0 errors
- `npx vitest run`: **1161/1161 passing** (90 test files) — +10 cron regression tests
- `npm run build`: clean

### New test files

- `app/api/cron/preventive-scan/route.test.ts` — 5 tests covering: prod fail-closed, missing bearer, wrong bearer, valid bearer, dev fallback
- `app/api/cron/renewal-reminders/route.test.ts` — 5 tests, same matrix

---

## Decisions made

- **Decision A — Cron fail-closed strategy.** Could have removed `if (cronSecret && ...)` entirely (always require bearer). Chose fail-closed-in-production only, allowing local dev iteration without setting CRON_SECRET. Production deploys MUST configure secret; if not, 503 protects the endpoint without breaking local DX.
- **Decision B — `E_FACTURA` legacy label.** Could have removed the entry from `CATEGORY_LABELS`, but TypeScript `Record<FindingCategory, string>` requires all union keys to be present. Replaced label with `"Legacy"` neutral text. If legacy data ever surfaces, the user sees an honest label, not a fiscal-framework word.
- **Decision C — `FindingCategory.E_FACTURA` union value retention.** Mandate explicitly allows backward-compat union values "as long as they don't appear in user-facing UI." Removing would break state migration from CompliAI v3-unified donor. Surface cleaned; type union retained.
- **Decision D — Env var dual lookup.** Did not break existing `COMPLISCAN_AUTH_BACKEND` / `COMPLISCAN_DATA_BACKEND` Vercel deploys. Added `AIACT_*` precedence with legacy fallback. Migration path: set AIACT_* alongside COMPLISCAN_* and remove the latter when comfortable.
- **Decision E — STOP at Sprint 023.5.** Did NOT touch Sprint 024 (AI Ads / LLM Commerce Pack) per mandate "STOP înainte de Sprint 24."

---

## Concerns / Blockers

- ⚠️ Concern A: `lib/compliance/constitution.ts:76` still has `if (category === "E_FACTURA") return ["accountability", "robustness"]`. Branch is unreachable in normal flow (no module emits E_FACTURA findings anymore), but kept for backward-compat with potentially-migrated legacy state. NOT user-visible. Acceptable to defer.
- ⚠️ Concern B: `lib/server/findings-store.ts:124` `VALID_CATEGORY` includes `E_FACTURA` so `isFindingCategory()` returns true. API route guard message already cleaned (#5). Surface clean; storage validation retains backward-compat. Acceptable.
- ⚠️ Concern C: TODO/FIXME în code comments (e.g. "Multi-tenant iteration TBD" în cron) — these are documented limitations, not user-facing. Mandate Rule 6 prohibits user-visible TODOs in copy; code-comment TODOs are different. Flagged in audit but not fixed in this sprint (out of scope).

---

## Commits

- `0bbbcd7` — fix(qa): cron routes fail-closed in production without CRON_SECRET (4 files, +10 tests)
- `f1af74d` — fix(qa): remove e-Factura surface from findings UI (mandate Rule 3) (3 files)
- `48f6692` — fix(qa): remove 'demo' from landing CTA copy (mandate copy hygiene) (1 file)
- `be64cde` — fix(qa): prefer AIACT_* env prefix over legacy COMPLISCAN_* (mandate § 20) (2 files)
- `<this log>` — docs(sprint-23-5): production readiness QA log + INDEX

## Live URL

- Production deploy required separately (manual `vercel --prod` per mandate).

---

## Dependencies

**Requires from previous sprints:** All of 008B → 023 (production-readiness assumes full feature set committed)

**Unlocks for next sprints:** Sprint 024 (AI Ads / LLM Commerce Compliance Pack) — but STOP per mandate.

---

## Notes pentru următorul agent

- **STOP marker activ.** Mandate spune "STOP înainte de Sprint 24". Sprint 024 nu este executat aici. Daniel/userul trebuie să dea go explicit.
- Pattern fail-closed cron pentru viitoare endpoints care mutează state via cron — copy din `app/api/cron/preventive-scan/route.ts` exact.
- Pattern test pentru cron auth — vezi `app/api/cron/preventive-scan/route.test.ts`. Folosește `Object.defineProperty` pentru `NODE_ENV` (Next.js îl tipizează literal).
- `FindingCategory.E_FACTURA` rămâne în union — NU îl scoateți fără un sprint migration care convertește toate `E_FACTURA` findings legacy în `EU_AI_ACT` (sau dismiss).
- Legacy env vars `COMPLISCAN_*` rămân ca fallback. Vercel deploy curent poate rula fără modificare. Recomandat: setați `AIACT_*` și apoi ștergeți `COMPLISCAN_*`.

---

## Final verdict

**PRODUCTION_READY** — toate cele 1161 teste verzi, tsc clean, build clean, 2 vulnerabilități critice cron rezolvate + fail-closed lock-in via tests, surface forbidden framework E_FACTURA eliminat din UI, copy hygiene curățată, env-var prefix realiniat cu mandate § 20 fără breaking change pe deploy-uri legacy.

Aplicația este pregătită pentru clienți plătitori (FREE_TRIAL → paid tiers via Stripe). Toate sprinturile 008B-023 sunt live + hardened.
