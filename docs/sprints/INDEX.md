# Sprint Log Index — CompliRoAI

**Folosește:** `_TEMPLATE.md` pentru sprint nou.
**Regulă:** FIECARE subagent ȘI fiecare execuție manuală creează un fișier `sprint-NNN-titlu.md` la final. Fără sprint log = sprint nu există.

---

## Faze (Per Implementation Spec)

- **Faza 0:** Cleanup + setup
- **Faza 1:** PORT MASIV din DPO-OS
- **Faza 2:** Role-aware UI (3 modes)
- **Faza 3:** AI Act depth (FRIA + Oversight + Logging + PMM + Incident + QMS)
- **Faza 4:** Preventive engine + API/SDK
- **Faza 5:** Commercial (Stripe + outreach)

---

## Sprints Backlog & Done

| # | Titlu | Status | Commit | Owner | Log |
|---|---|---|---|---|---|
| 001 | Multi-tenancy + role onboarding + cabinet portfolio | ✅ DONE | de51e38 | subagent | _backfill_ |
| 002 | Magic Links HMAC + share API | ✅ DONE | 56d372d | subagent | _backfill_ |
| 003 | White-label cabinet (logo + culori + signer) | ✅ DONE | c9befcb | subagent | _backfill_ |
| 004 | Audit Pack ZIP + hash chain SHA-256 + verify public | ✅ DONE | d2c060e | subagent | _backfill_ |
| 005 | Readiness Pack Generator | ✅ DONE | e15516b | subagent | _backfill_ |
| 005.5 | Role Classifier (Art. 3) | ✅ DONE | 995c309 | subagent | _backfill_ |
| 006 | Transparency Notice Generator (Art. 50) | ✅ DONE | d132a45 | subagent | _backfill_ |
| QW11-13 | Landing reframe (preventive + 3 verticale + €799 + agencies) | ✅ DONE | e8d0646 | manual: Claude | _backfill_ |
| QW-NUDIF | Nudifier prohibition + autorități RO | ✅ DONE | d452fc6 | manual: Claude | _backfill_ |
| QW-PRICING | Landing pricing 4 tiers | ✅ DONE | 9b9cdf5 | manual: Claude | _backfill_ |
| 006.5 | Role-aware UI (3 modes) | ⏳ PLANNED | — | — | TBD |
| 007 | DSAR full port (GDPR Art. 15-22) | ✅ DONE | e32827e | manual: Claude | [sprint-007-dsar-port.md](sprint-007-dsar-port.md) |
| **008A** | **Foundation Port: ComplianceState + findings + events + orchestrator + store adapter** | ✅ DONE | 089b6c4 | manual: Claude | [sprint-008a-foundation-port.md](sprint-008a-foundation-port.md) |
| **008B** | **Findings + Dosar + Resolve (UI + API peste fundație)** | ✅ DONE | e8a5534 | manual: Claude | [sprint-008b-findings-dosar-resolve.md](sprint-008b-findings-dosar-resolve.md) |
| **008C** | **DPIA + ROPA (drop-in pe fundație 008A/B, finding emission, orchestrator wire)** | ✅ DONE | 2bff11f | manual: Claude | [sprint-008c-dpia-ropa.md](sprint-008c-dpia-ropa.md) |
| **008D** | **Breach GDPR 72h (Art. 33 ANSPDCP + Art. 34 persoane vizate, finding rescue auto)** | ✅ DONE | 31e6f4f | manual: Claude | [sprint-008d-gdpr-breach.md](sprint-008d-gdpr-breach.md) |
| **009** | **AI Data Discovery + PII Discovery + AI Exposure Report + AI Policy Pack (Wave 1 AI Discovery)** | ✅ DONE | 28d33e5+ | manual: Claude | [sprint-009-ai-data-pii-exposure-policy.md](sprint-009-ai-data-pii-exposure-policy.md) |
| **010** | **Vendor AI Assessment + DPA review (17 vendori catalog + risk evaluator + lifecycle + brief)** | ✅ DONE | c5b9c73+ | manual: Claude | [sprint-010-vendor-ai-assessment.md](sprint-010-vendor-ai-assessment.md) |
| **011** | **Structured Audit Log + Audit Pack wire-up (toate modulele în ZIP, ledger UI cu filters + verify + export)** | ✅ DONE | 06c834c+ | manual: Claude | [sprint-011-structured-audit-log.md](sprint-011-structured-audit-log.md) |
| **012** | **DORA AI slice + NIS2 AI slice (org reg profile + 2 rules engines + aggregator + /dashboard/ai-regulatory-scope)** | ✅ DONE | 4b6f567+ | manual: Claude | [sprint-012-dora-nis2-ai-slices.md](sprint-012-dora-nis2-ai-slices.md) |
| **013** | **Approval queue + Calendar + Trust Center (collaboration cabinet + 8-source deadline aggregator + RFC 5545 iCal + public white-labeled trust surface)** | ✅ DONE | 19ac0fa+ | manual: Claude | [sprint-013-approval-calendar-trust.md](sprint-013-approval-calendar-trust.md) |
| **014** | **PDF generator + Onboarding emails + Stripe billing (commercially usable: PDF on all exports, 10 RO email templates with Resend, Stripe checkout/portal/webhook with 7 tiers locked, billing UI + pricing page)** | ✅ DONE | 52437ed+ | manual: Claude | [sprint-014-pdf-emails-stripe.md](sprint-014-pdf-emails-stripe.md) |
| 015 | Role-aware UI (3 modes) build new | ⏳ PLANNED | — | — | TBD |
| 016 | FRIA Generator (Art. 27) | ⏳ PLANNED | — | — | TBD |
| 017 | Human Oversight Protocols (Art. 14) | ⏳ PLANNED | — | — | TBD |
| 018 | Logging Evidence (Art. 12) | ⏳ PLANNED | — | — | TBD |
| 019 | Post-Market Monitoring (Art. 72) | ⏳ PLANNED | — | — | TBD |
| 020 | Incident Reporting AI (Art. 73) | ⏳ PLANNED | — | — | TBD |
| 021 | QMS Workspace (Art. 17) | ⏳ PLANNED | — | — | TBD |
| 022 | Auto-generation engine + Renewal Tracker + Change Log | ⏳ PLANNED | — | — | TBD |
| 023 | API/SDK npm package pentru AI Builders | ⏳ PLANNED | — | — | TBD |

---

## Backfill Sprints 001-006 (Sumar Scurt)

Lista pe scurt — sprinturile live pe production, dar fără sprint log dedicat la momentul livrării (regulă introdusă post-factum).

### Sprint 001 — Multi-tenancy (commit de51e38)
- Adăugat `workspaceMode: "solo" | "cabinet"` în session token
- Onboarding 4-step + role selection
- Pagina `/dashboard/portofoliu` (cabinet only)
- API `/api/portfolio/clients` CRUD + `/api/workspaces/switch`
- Status: ✅ Live

### Sprint 002 — Magic Links HMAC (commit 56d372d)
- `lib/server/share-token-store.ts` (HMAC SHA-256 tokens)
- `lib/server/share-magic-link-email.ts` (Resend)
- 5 API routes `/api/share/*`
- Pagina publică `/share/[token]`
- UI `/dashboard/magic-links`
- Supabase: tabela `share_tokens` aplicată manual
- Concern: RESEND_API_KEY setat post-factum
- Status: ✅ Live

### Sprint 003 — White-label cabinet (commit c9befcb)
- `lib/server/white-label.ts` (config + defaults)
- API `/api/branding` (GET/PATCH/DELETE)
- UI `/dashboard/setari/branding`
- Aplicare branding în: email magic link, share page, Annex IV docs
- State extension: `org_state.whiteLabel` JSONB
- Status: ✅ Live

### Sprint 004 — Audit Pack ZIP cripto (commit d2c060e)
- `lib/server/audit-pack-builder.ts` (ZIP + hash chain SHA-256)
- API `/api/exports/audit-pack` + `/api/audit-pack/verify` + `/api/audit-pack/registry`
- UI `/dashboard/audit-pack` (cabinet/solo)
- Pagina publică `/verify-pack` (drag&drop, no auth)
- Dependency: `jszip` package
- Status: ✅ Live

### Sprint 005 — Readiness Pack (commit e15516b)
- `lib/server/readiness-pack-builder.ts` (8 components)
- `lib/compliance/readiness-pack-templates.ts`
- API `/api/readiness-pack/generate` + `/registry`
- UI `/dashboard/readiness-pack`
- Format: Markdown + HTML print-ready (NO PDF nativ — decizie pragmatică)
- Status: ✅ Live

### Sprint 005.5 — Role Classifier Art. 3 (commit 995c309)
- `lib/compliance/role-classifier.ts` (pure function, 10 tests)
- Types: `AIActRole`, `RoleAssessment`
- API `/api/role-assessment` GET/POST/DELETE
- UI `/dashboard/role-assessment` (8 questions wizard + result panel)
- Integrare în Readiness Pack ca prima secțiune
- Status: ✅ Live

### Sprint 006 — Transparency Art. 50 (commit d132a45)
- `lib/compliance/transparency-engine.ts`
- `lib/compliance/transparency-templates.ts` (RO+EN)
- API `/api/transparency/{all-required, notices/generate, notices/implement}`
- UI `/dashboard/transparency` (tabel + modal cu tabs + copy-paste)
- State extension: `transparencyImplementations[]`
- Deadline real: 2 dec 2026 (Omnibus extension)
- Status: ✅ Live

### QW (Quick Wins) — Landing + Pricing + Nudifier
- Landing reframed "Nu aștepți amenda" + 3 verticale + €799 audit + agencies section (e8d0646)
- Pricing 4 tiers actualizat (9b9cdf5)
- Nudifier prohibition (Omnibus) + 7 autorități RO complete (d452fc6)
- Status: ✅ Live

---

## Regulă Pentru Sub-agenți

**OBLIGATORIU în briefurile următoare:**

> "La final, scrie sprint log la `docs/sprints/sprint-NNN-titlu.md` folosind `_TEMPLATE.md`. Status, files, tests, decisions, commits, concerns, dependencies. Fără log = sprint nu există. Commit log-ul împreună cu codul în același commit."

---

## Index Actualizat Automatic?

Pe viitor putem face script care updatează `INDEX.md` automat când apare un fișier nou `sprint-*.md`. Pentru moment = manual update.
