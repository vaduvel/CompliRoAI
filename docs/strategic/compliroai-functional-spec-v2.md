# CompliRoAI — Functional Specification v2.0

**Versiune:** 2.0 — 17 mai 2026
**Status:** LOCKED — single source of truth
**Înlocuiește:** `compliroai-implementation-spec.md` v1 (păstrat ca referință istorică)

---

## 0. TL;DR

> **CompliRoAI = AI Compliance OS.**
> Construim full DPO-OS (privacy infrastructure) + AI Act layer peste, ambalat comercial ca „AI Compliance OS".
> **DPO-OS = infrastructura. AI Act = wedge-ul comercial.**

---

## 1. Decizie Strategică

### Ce facem
Vindem **ecosistem complet de compliance pentru AI**, nu doar AI Act checklist.
- AI-ul aproape mereu mănâncă date personale → GDPR e mandatory în pachet.
- DPO-ul / consultantul deja are relația cu clientul pe durerea GDPR.
- AI Act intră natural în mandatul existent al DPO/consultantului.
- Diferențierea majoră: competiția face „AI Act classifier". Noi facem compliance operating system.

### Cum poziționăm
- **NU spunem:** „DPO app" sau „AI Act checklist"
- **SPUNEM:** „AI Compliance OS pentru firme și consultanți care trebuie să dovedească legal ce AI folosesc."

### Frazele locked
> „CompliRoAI îți pune AI-ul în conformitate: AI Act + GDPR + dovezi de audit, într-un singur OS."
>
> „DPO-OS este infrastructura. AI Act este wedge-ul comercial."

---

## 2. Arhitectura Aplicației — 3 Layere

### Layer 1: Core OS (infrastructure)
Foundation pentru orice modul. Nu se vinde separat — vine cu orice tier.

| Modul | Sursă | Status |
|---|---|---|
| Multi-tenancy (org_state JSONB per org) | CompliRoAI Sprint 1 | ✅ Live |
| Auth + session HMAC (`aiact_session`) | CompliRoAI | ✅ Live |
| Onboarding 4-step + workspace mode | CompliRoAI Sprint 1 | ✅ Live (legacy „solo/cabinet") |
| Role-aware UI (3 modes: imm-classic / ai-builder / cabinet) | Build new — Sprint 015 | ⏳ Groundwork done (Sprint 007) |
| Clienți / portofoliu (cabinet only) | CompliRoAI Sprint 1 | ✅ Live |
| Magic Links HMAC (client intake) | CompliRoAI Sprint 2 | ✅ Live |
| White-label (logo + culori + signer + email) | CompliRoAI Sprint 3 | ✅ Live |
| Findings / Dosar / Resolve (cockpit issue-driven) | Port DPO-OS — Sprint 011 | ⏳ |
| Calendar / Reminders / Cron | Port DPO-OS — Sprint 013 | ⏳ |
| Audit Pack ZIP cripto (SHA-256 hash chain) | CompliRoAI Sprint 4 | ✅ Live |
| Audit Pack verify public | CompliRoAI Sprint 4 | ✅ Live |
| Audit log structured | Port DPO-OS — Sprint 011 | ⏳ |
| Approval review queue | Port DPO-OS — Sprint 013 | ⏳ |
| Trust Center public per org | Port DPO-OS — Sprint 013 | ⏳ |
| Onboarding emails (Resend) | Port DPO-OS — Sprint 014 | ⏳ |
| PDF generator real | Port DPO-OS — Sprint 014 | ⏳ |
| Stripe billing + checkout | Port DPO-OS — Sprint 014 | ⏳ |

### Layer 2: Privacy Layer (GDPR engine)
Tot ce vine din DPO-OS, filtrat la AI-relevant. **Toate sunt funcționale și pentru date non-AI** (nu mutilăm modulul), dar copy-ul/wizardul evidențiază unde AI-ul atinge.

| Modul | Sursă | Status |
|---|---|---|
| RoPA (Registru Operațiuni Prelucrare) | Port DPO-OS — Sprint 008 | ⏳ |
| DPIA (Data Protection Impact Assessment) | Port DPO-OS — Sprint 008 | ⏳ |
| **DSAR** (Art. 15-22, 6 tipuri cereri) | Port DPO-OS — **Sprint 007** | ✅ **DONE** |
| Breach / Incident report (72h notification) | Port DPO-OS — Sprint 008 | ⏳ |
| Training GDPR / Awareness | Port DPO-OS (selectiv) | ⏳ |
| DPA / Vendor agreements review | Port DPO-OS — Sprint 010 | ⏳ |
| AI Data Discovery | Port DPO-OS — Sprint 009 | ⏳ |
| PII Discovery | Port DPO-OS — Sprint 009 | ⏳ |
| AI Exposure Report | Port DPO-OS — Sprint 009 | ⏳ |
| AI Governance Policy Pack | Port DPO-OS — Sprint 009 | ⏳ |

### Layer 3: AI Act Layer (comercial wedge)
Aici diferențiem.

| Modul | Articol AI Act | Sursă | Status |
|---|---|---|---|
| Role Assessment (provider/deployer/etc) | Art. 3 | CompliRoAI Sprint 5.5 | ✅ Live |
| AI Inventory + risk classification | Art. 6 + Annex III | CompliRoAI | ✅ Live |
| Prohibited Practices Check | Art. 5 + Omnibus (nudifier) | CompliRoAI | ✅ Live |
| AI Literacy Tracker | Art. 4 | CompliRoAI | ✅ Live |
| Transparency Notice Generator | Art. 50 | CompliRoAI Sprint 6 | ✅ Live |
| Vendor AI Assessment | (governance) | Port DPO-OS — Sprint 010 | ⏳ |
| Annex IV Generator | Art. 11 + Annex IV | CompliRoAI | ✅ Live (basic) |
| EU Database Wizard | Art. 49 | CompliRoAI | ✅ Live |
| Conformity Assessment 10Q | Art. 43 | CompliRoAI | ✅ Live |
| Readiness Pack (export RO + EN) | (aggregation) | CompliRoAI Sprint 5 | ✅ Live |
| FRIA Generator | Art. 27 | Build new — Sprint 016 | ⏳ |
| Human Oversight Protocols | Art. 14 | Build new — Sprint 017 | ⏳ |
| Logging Evidence (audit trail AI) | Art. 12 | Build new — Sprint 018 | ⏳ |
| Post-Market Monitoring | Art. 72 | Build new — Sprint 019 | ⏳ |
| Incident Reporting (AI) | Art. 73 | Build new — Sprint 020 | ⏳ |
| QMS Workspace (Quality Mgmt System) | Art. 17 | Build new — Sprint 021 | ⏳ |
| API public `/api/v1/clasifica` | (developer surface) | CompliRoAI | ✅ Live |
| SDK npm package CI/CD | (developer surface) | Build new — Sprint 022 | ⏳ |

### Slice-uri Adjacent (NU full port, doar AI-relevant)

| Modul | Ce includem | Status |
|---|---|---|
| DORA AI-fintech | TPRM AI vendor + incident reporting AI | Port selectiv — Sprint 012 |
| NIS2 AI-critical | AI în critical infra + incident reporting | Port selectiv — Sprint 012 |

### Ce NU includem
- ❌ Fiscal RO / e-Factura / SPV / ANAF mirror
- ❌ Whistleblowing
- ❌ Pay Transparency
- ❌ HR full (doar literacy pentru AI Act Art. 4)
- ❌ Contabilitate / facturare clienți
- ❌ DORA / NIS2 full (doar slice AI)

---

## 3. Target Audience

3 persona, 1 platformă generalistă. Verticalele (Chatbot / Copilot / Agent) = marketing only.

| Persona | Workspace mode | Modulele care contează |
|---|---|---|
| **IMM care folosește AI** | `imm-classic` | Role Assessment, Inventory, Prohibited, Literacy, Transparency, DSAR, DPIA mini, Vendor, Readiness Pack, Audit Pack |
| **AI Builder** (startup AI native) | `ai-builder` | Toate de mai sus + Annex IV, EU DB, Conformity, FRIA, Oversight, Logging, PMM, Incident, QMS, API/SDK |
| **Cabinet AI** (DPO + avocat tech + agenții AI) | `cabinet` | Toate de mai sus aplicate per client + Portofoliu, White-label, Magic Links, Approval queue, Audit signed, Trust Center |

**Generalisti:** orice client poate folosi orice modul. UI-ul prioritizează relevante prin role-aware sidebar (Sprint 015), dar nimic nu e ascuns.

---

## 4. Sprint Plan Revizuit (Faza 1 → 5)

### Faza 0 — Cleanup ✅ DONE
- Implementation spec v1 + sprint log system + commit hashes backfilled

### Faza 1 — PORT MASIV DPO-OS (în execuție)
Port modul cu modul, fiecare în sprint dedicat, cu test + log.

| Sprint | Conținut | Status | Owner |
|---|---|---|---|
| 007 | DSAR (Art. 15-22) | ✅ DONE | manual: Claude |
| 008 | DPIA + ROPA + Breach | ⏳ next | TBD |
| 009 | AI Data Discovery + PII Discovery + AI Exposure Report + AI Policy Pack | ⏳ | TBD |
| 010 | Vendor AI Assessment + DPA review | ⏳ | TBD |
| 011 | Findings + Dosar + Resolve + Audit-log structured | ⏳ | TBD |
| 012 | DORA AI slice + NIS2 AI slice (selectiv) | ⏳ | TBD |
| 013 | Approval queue + Calendar + Trust Center | ⏳ | TBD |
| 014 | PDF generator + Onboarding emails (Resend) + Stripe billing | ⏳ | TBD |

### Faza 2 — Role-aware UI (build new)
| Sprint | Conținut | Status |
|---|---|---|
| 015 | Role-aware sidebar 3 modes + dynamic unlocks + workspace switcher v2 | ⏳ Groundwork done în Sprint 007 |

### Faza 3 — AI Act Depth (build new)
| Sprint | Conținut | Status |
|---|---|---|
| 016 | FRIA Generator (Art. 27) | ⏳ |
| 017 | Human Oversight Protocols (Art. 14) | ⏳ |
| 018 | Logging Evidence (Art. 12) | ⏳ |
| 019 | Post-Market Monitoring (Art. 72) | ⏳ |
| 020 | Incident Reporting AI (Art. 73) | ⏳ |
| 021 | QMS Workspace (Art. 17) | ⏳ |

### Faza 4 — Preventive Engine + API/SDK (build new)
| Sprint | Conținut | Status |
|---|---|---|
| 022 | Auto-generation engine (cron → reclassify → email customer) | ⏳ |
| 023 | Renewal Tracker + Change Log legislativ | ⏳ |
| 024 | npm package + docs RO/EN pentru AI Builders | ⏳ |

### Faza 5 — Commercial (paralel)
| Sprint | Conținut | Status |
|---|---|---|
| 025 | Stripe billing live + pricing page real | ⏳ |
| 026 | Outreach: 5 pilot × €799 audit | ⏳ |

---

## 5. Pricing (Locked)

| Tier | Preț | Pentru | Layere active |
|---|---|---|---|
| Free Trial | 14 zile | Oricare | Toate read-only |
| IMM Solo | €99/lună | 10-50 ang, AI cumpărat | Core + Privacy + AI Act (basic) |
| IMM Mid | €249/lună | 50-250 ang | + Vendor AI + Audit Pack signed |
| AI Builder | €399/lună | Startup AI native | + Annex IV + EU DB + Conformity + FRIA + API/SDK |
| Cabinet Solo | €399/lună | 1-10 clienți | Multi-client + Magic Links |
| Cabinet Pro | €799/lună | 10-50 clienți | + White-label + Trust Center + Approval queue |
| Cabinet Enterprise | €1.499+/lună | 50+ clienți | + SSO + DPA + SLA |
| One-off Audit | €799 | Dosar livrat 3-7 zile | Toate, cu setup asistat |

---

## 6. Stack Tehnic (Locked)

- Next.js 15 App Router (RSC)
- Supabase (PostgreSQL + Auth + Storage, shared cu CompliAI)
- HMAC SHA-256 session cookie (`aiact_session`)
- Resend pentru email transactional (noreply@compliroai.ro)
- v3 design system: graphite/cobalt + Space Grotesk display + Inter Tight body
- Inline styles cu CSS variables (NU Tailwind utility, NU shadcn)
- JSZip pentru audit pack
- Vitest pentru teste
- Vercel auto-deploy pe push `main`
- GitHub `vaduvel/CompliRoAI` privat

---

## 7. Reguli De Aur

### Regula 1 — Default = PORT
Orice modul → primul reflex: există în DPO-OS `v3-unified`? Da → port. Nu → build new.

### Regula 2 — Sprint Log Obligatoriu
Fiecare sprint (subagent sau manual) creează `docs/sprints/sprint-NNN-titlu.md` din `_TEMPLATE.md`.
Conținut: status, files create/modified, tests, decisions, commits, concerns, dependencies, notes pentru next agent.
**Fără log = sprint nu există.** Commit log-ul în același commit cu codul.

### Regula 3 — Brief Obligatoriu pentru subagenți
Toate sprinturile dispatchete primesc:
1. Acest document (functional spec v2)
2. `docs/sprints/INDEX.md`
3. `_TEMPLATE.md`
4. Path-ul exact al modulului donor din DPO-OS

### Regula 4 — Quality Bar
100% portare. 100% testare (vitest, minim 2 teste per modul). 100% gata. 100% ready for sale.
Nu mai suntem la faza MVP — fiecare modul livrat trebuie să fie production-quality, audit-ready.

### Regula 5 — Adapter Pattern Pentru Store
Module portate din DPO-OS care folosesc `createAdaptiveStorage` → adaptor către `readState/writeState` din CompliRoAI, păstrând signature DPO-OS pentru drop-in compat.
Vezi `lib/server/dsar-store.ts` ca referință.

### Regula 6 — API/UI Rewrite, Nu Sed-Port
Codul DPO-OS care folosește `requireFreshRole`, `WRITE_ROLES`, `mvp-store`, `appendComplianceEvents`, `shadcn/ui` → REWRITE direct în pattern CompliRoAI (getOrgContext + inline NextResponse + inline styles cu v3 tokens). Adapter costă mai mult decât rewrite.

### Regula 7 — Tot UI-ul în Română
Label-uri, error messages, descrieri, copy. Atenție la ghilimele românești „..." în JSX double-quoted strings (sparge parserul TS) — folosește simple quotes sau escape.

---

## 8. Mapping DPO-OS → CompliRoAI

Path donor: `/Users/vaduvageorge/Desktop/CompliAI/.claude/worktrees/v3-unified/`

| DPO-OS path | CompliRoAI path | Sprint |
|---|---|---|
| `lib/server/dsar-store.ts` | `lib/server/dsar-store.ts` | ✅ 007 |
| `lib/compliance/dsar-*` | `lib/compliance/dsar-*` | ✅ 007 |
| `app/api/dsar/*` | `app/api/dsar/*` | ✅ 007 |
| `app/dashboard/dsar` | `app/dashboard/dsar` | ✅ 007 |
| `lib/server/dpia-store.ts` | `lib/server/dpia-store.ts` | 008 |
| `lib/server/ropa-store.ts` | `lib/server/ropa-store.ts` | 008 |
| `lib/server/breach-store.ts` | `lib/server/breach-store.ts` | 008 |
| `app/dashboard/{dpia,ropa,breach}` | same | 008 |
| `lib/compliance/ai-data-discovery.ts` | same | 009 |
| `lib/compliance/pii-discovery.ts` | same | 009 |
| `lib/compliance/discovery-trigger-orchestrator.ts` | same | 009 |
| `lib/compliance/ai-exposure-report.ts` | same | 009 |
| `app/api/dpo/ai-data-discovery/policy-pack` | `app/api/ai-policy-pack` | 009 |
| `lib/compliance/vendor-review-engine.ts` | same | 010 |
| `app/dashboard/vendor-review` | same | 010 |
| `app/dashboard/{findings,dosar,resolve}` | same | 011 |
| `app/dashboard/audit-log` | same | 011 |
| `lib/server/dora-store.ts` (slice) | `lib/server/dora-ai-store.ts` | 012 |
| `lib/server/nis2-store.ts` (slice) | `lib/server/nis2-ai-store.ts` | 012 |
| `supabase/approval-review-queue-schema.sql` | same | 013 |
| `app/dashboard/calendar` + cron | same | 013 |
| `app/trust/[orgId]/page.tsx` | same | 013 |
| `lib/server/onboarding-emails.ts` | same | 014 |
| `lib/server/pdf-generator.ts` | same | 014 |
| `app/api/stripe/*` + `lib/billing/*` | same | 014 |

### Adaptări branding obligatorii (sed în fiecare port)
- `compliscan_session` → `aiact_session`
- `x-compliscan-*` → `x-aiact-*`
- `COMPLISCAN_*` → `AIACT_*`
- "CompliScan" → "CompliRoAI" în UI text

### Skip complet la port
- `fiscal*`, `whistleblowing*`, `pay-transparency*`

---

## 9. Definition of Done (per sprint)

- [ ] Cod portat / scris
- [ ] `npx tsc --noEmit` clean
- [ ] `npm run build` clean
- [ ] `npx vitest run` 100% pass
- [ ] Minim 2 teste pentru fiecare modul nou
- [ ] Wire în sidebar dacă e UI nou
- [ ] Sprint log scris în `docs/sprints/sprint-NNN-titlu.md`
- [ ] INDEX.md updatat cu commit hash
- [ ] Commit semnat de Daniel (`vaduvadaniel10@yahoo.com`) — pentru Vercel deploy
- [ ] Push pe `main`
- [ ] Live verify pe `eu-ai-act-beige.vercel.app`

---

## 10. Status Curent (17 mai 2026)

**Live commits pe `main`:** 18 (incl. Sprint 007)
**Sprinturi DONE:** 1, 2, 3, 4, 5, 5.5, 6, **7** + QW
**Sprinturi planificate:** 8 → 26 (din care 8 sunt port masiv DPO-OS, restul build new)
**Estimare PORT MASIV finalizat:** ~3-4 zile (1 sprint/zi)
**Estimare AI Act Depth finalizat:** ~2 săptămâni
**Estimare ready-for-sale completă:** ~3-4 săptămâni

---

**FINAL DOC.** Cer subagentilor să respecte cu strictețe.
