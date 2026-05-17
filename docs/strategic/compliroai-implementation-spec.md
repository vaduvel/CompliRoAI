# CompliRoAI — Document De Execuție

**Versiune:** 1.0 — 16 mai 2026
**Scop:** Single source of truth pentru ce construim, în ce ordine, pentru ce target.
**Regulă:** Default = PORT din DPO-OS (v3-unified). Build nou doar dacă nu există.

---

## 1. Aplicația Finală — Ce E

**CompliRoAI = compliance OS pentru firmele care folosesc, construiesc sau consultează pe AI.**

3 target-uri. 3 verticale. 1 platformă.

| Target | Vertical | Folosește pentru |
|---|---|---|
| **IMM care folosește AI** | V1 Chatbot / V2 Copilot | "Am ChatGPT/chatbot/Copilot. Sunt legal?" |
| **AI Builder** | V3 Agent | "Construiesc AI. Sunt provider. Trebuie Annex IV + EU DB." |
| **Cabinet AI** | Toate 3 (per client) | "Gestionez 30 clienți cu AI. Vând compliance pack." |

**Frameworks acoperite:** AI Act (core) + GDPR (Art. 22 + DPIA pentru AI) + NIS2 (AI in critical infra) + DORA (AI in fintech) + Vendor AI Assessment.

**NU includem:** Fiscal, Whistleblowing, Pay Transparency, HR, contabilitate. Alt produs, alt cumpărător.

---

## 2. Modulele Aplicației Finale — Per Rol

### IMM (V1 Chatbot + V2 Copilot)
1. Role Assessment (Art. 3) — provider/deployer
2. AI Inventory + risk classification
3. Prohibited Practices Check (Art. 5 + nudifier Omnibus)
4. AI Literacy Tracker (Art. 4)
5. Transparency Notice Generator (Art. 50)
6. GDPR mini (DPIA pentru AI + Art. 22 awareness)
7. Vendor AI Assessment
8. Audit Pack ZIP cripto
9. Readiness Pack PDF
10. Renewal reminders + Change Log

### AI Builder (V3 Agent — provider+deployer dual)
**Toate de mai sus PLUS:**
11. Annex IV Generator (Art. 11 + Annex IV)
12. EU Database Wizard (Art. 49)
13. Conformity Assessment 10Q (Art. 43)
14. FRIA Generator (Art. 27)
15. Human Oversight Protocols (Art. 14)
16. Logging Evidence (Art. 12)
17. Post-Market Monitoring (Art. 72)
18. Incident Reporting (Art. 73)
19. QMS workspace (Art. 17)
20. API public `/api/v1/clasifica` + SDK CI/CD

### Cabinet AI (consultanță)
**Toate de mai sus aplicate per client, PLUS:**
21. Multi-client Portfolio
22. White-label complet (logo + culori + signer + email)
23. Magic Links HMAC (intake + aprobări client)
24. Audit Pack semnat per client (verify public)
25. Approval review queue
26. Trust Center public per client
27. Calendar / Reminders centralizat
28. Findings/Dosar pattern (cockpit issue-driven)

---

## 3. Status Implementat (Live Production)

| Modul | Status |
|---|---|
| 1. Role Assessment | ✅ Sprint 5.5 |
| 2. AI Inventory + classification | ✅ Live |
| 3. Prohibited Practices | ✅ (clasifică + nudifier) |
| 4. AI Literacy | ✅ Live |
| 5. Transparency Notices | ✅ Sprint 6 |
| 8. Audit Pack ZIP cripto | ✅ Sprint 4 |
| 9. Readiness Pack | ✅ Sprint 5 |
| 11. Annex IV Generator | ✅ Live (basic) |
| 12. EU Database Wizard | ✅ Live |
| 13. Conformity Assessment 10Q | ✅ Live |
| 20. API public + docs RO | ✅ Live |
| 21. Multi-client Portfolio | ✅ Sprint 1 |
| 22. White-label cabinet | ✅ Sprint 3 |
| 23. Magic Links HMAC | ✅ Sprint 2 |
| 24. Audit Pack signed cabinet | ✅ Sprint 4 |

**Live commits:** 16+ pe `main`. URL: `eu-ai-act-beige.vercel.app`.

---

## 4. Ce Lipsește (De Construit/Port)

### Faza A: PORT MASIV din DPO-OS (4-6 ore subagent, 1 pass)

| Modul | Sursă DPO-OS | Destinație CompliRoAI |
|---|---|---|
| 6. GDPR (DPIA + ROPA + DSAR + Breach) | `lib/server/dsar-store.ts`, `lib/compliance/dsar-*`, `app/dashboard/{dpia,dsar,ropa,breach}` | Same paths |
| AI Data Discovery enhanced | `lib/compliance/ai-data-discovery.ts`, `lib/compliance/discovery-trigger-orchestrator.ts` | `lib/compliance/` |
| PII Discovery | `lib/compliance/pii-discovery.ts` | Same |
| AI Governance Policy Pack | `api/dpo/ai-data-discovery/policy-pack` | `app/api/ai-policy-pack/` |
| AI Exposure Report | `lib/compliance/ai-exposure-report.ts` | Same |
| 7. Vendor AI Assessment | `lib/compliance/vendor-review-engine.ts`, `app/dashboard/vendor-review` | Same |
| 25. Approval review queue | `supabase/approval-review-queue-schema.sql` + logic + UI | Same |
| 26. Trust Center public | `app/trust/[orgId]/page.tsx` | Same |
| 27. Calendar / Reminders | `app/dashboard/calendar` + cron | Same |
| 28. Findings/Dosar pattern | `app/dashboard/{findings,dosar,resolve}` | Same |
| Onboarding emails Resend | `lib/server/onboarding-emails.ts` | Same |
| PDF generator real | `lib/server/pdf-generator.ts` | Same |
| Stripe billing + checkout | `app/api/stripe/*`, `lib/billing` | Same |
| Audit log structured | `app/dashboard/audit-log` | Same |
| DORA AI-fintech (selectiv) | `lib/server/dora-store.ts` doar TPRM + incident | `lib/server/dora-ai-store.ts` |
| NIS2 AI-critical (selectiv) | `lib/server/nis2-store.ts` doar AI-relevant | `lib/server/nis2-ai-store.ts` |

**Adaptări branding obligatorii:**
- `compliscan_session` → `aiact_session`
- `x-compliscan-*` → `x-aiact-*`
- `COMPLISCAN_*` env → `AIACT_*`
- Brand name "CompliScan" → "CompliRoAI" în UI text

### Faza B: BUILD NEW (după port)

| Modul | Durată | Notă |
|---|---|---|
| 6.5 Role-aware UI (3 modes: IMM/Builder/Cabinet) | 3-4 ore | Sidebar adaptive + dynamic unlocks |
| 14. FRIA Generator (Art. 27) | 1-2 zile | Template oficial AI Office încă inexistent |
| 15. Human Oversight Protocols (Art. 14) | 1 zi | Templates + workflow |
| 16. Logging Evidence (Art. 12) | 1 zi | Audit trail structurat |
| 17. Post-Market Monitoring (Art. 72) | 2 zile | Dashboard + cron checks |
| 18. Incident Reporting (Art. 73) | 1-2 zile | Workflow T+15 zile |
| 19. QMS workspace (Art. 17) | 2 zile | Quality Management System tracker |
| Auto-generation engine (preventive core) | 3-4 zile | Cron → re-classifies → emails customer |
| API/SDK pentru AI Builders (CI/CD plugin) | 3-4 zile | npm package + docs |

---

## 5. Faze De Execuție Concrete

### FAZA 0 — Cleanup (acum, 5 min)
- Anulez sprint plan inflated
- Single source of truth = acest document
- Stop debate strategic, start execuție mecanică

### FAZA 1 — PORT MASIV DPO-OS (4-6 ore, 1 subagent)
**Output:** CompliRoAI = paritate funcțională DPO-OS (filtrat la AI-relevant) + features actuale CompliRoAI

**Brief subagent (concret):**
```
Port din /Users/vaduvageorge/Desktop/CompliAI/.claude/worktrees/v3-unified/ 
în /Users/vaduvageorge/Desktop/eu-ai-act/ pe branch main:

INCLUDE (port + adapt branding):
- lib/server/dsar-store.ts
- lib/compliance/dsar-*
- app/dashboard/dpia, dsar, ropa, breach
- lib/compliance/ai-data-discovery.ts
- lib/compliance/pii-discovery.ts
- lib/compliance/discovery-trigger-orchestrator.ts
- lib/compliance/ai-exposure-report.ts
- lib/compliance/vendor-review-engine.ts
- app/dashboard/vendor-review
- app/dashboard/findings, dosar, resolve
- app/dashboard/audit-log
- app/dashboard/calendar
- app/trust/[orgId]
- lib/server/onboarding-emails.ts
- lib/server/pdf-generator.ts
- app/api/stripe/*
- lib/billing/*
- supabase/approval-review-queue-schema.sql
- lib/server/dora-store.ts (doar AI-fintech parts)
- lib/server/nis2-store.ts (doar AI-critical parts)

ADAPTARI OBLIGATORII:
- compliscan_session → aiact_session
- x-compliscan-* → x-aiact-*
- COMPLISCAN_* → AIACT_*
- "CompliScan" → "CompliRoAI" în UI

SKIP COMPLET:
- fiscal*, whistleblowing*, pay-transparency*

OUTPUT:
- npx tsc --noEmit clean
- npm run build clean
- git commit + git push origin main
```

### FAZA 2 — Role-aware UI (3-4 ore, eu sau subagent)
- WorkspaceMode: "imm" | "ai-builder" | "cabinet"
- Sidebar adaptive
- Dynamic unlocks bazate pe state

### FAZA 3 — AI Act Depth (5-7 zile)
- FRIA Generator (Art. 27)
- Human Oversight (Art. 14)
- Logging Evidence (Art. 12)
- Post-Market Monitoring (Art. 72)
- Incident Reporting (Art. 73)
- QMS (Art. 17)

### FAZA 4 — Preventive Engine + API/SDK (5-7 zile)
- Auto-generation cron (motorul "dormi liniștit")
- Renewal Tracker cross-framework
- Change Log legislativ
- API/SDK npm package pentru AI Builders

### FAZA 5 — Commercial (paralel cu Faza 3-4)
- Stripe billing live
- Pricing page real
- Primul contract (5 firme pilot × €799)

---

## 6. Pricing Final (Locked)

| Tier | Preț | Pentru |
|---|---|---|
| Free Trial | 14 zile | Oricare |
| IMM Solo | €99/lună | IMM 10-50 ang, AI cumpărat |
| IMM Mid | €249/lună | IMM 50-250 ang |
| AI Builder | €399/lună | Startup AI native + API/SDK |
| Cabinet Solo | €399/lună | Cabinet 1-10 clienți |
| Cabinet Pro | €799/lună | Cabinet 10-50 clienți + white-label |
| Cabinet Enterprise | €1.499+/lună | Cabinet 50+ clienți |
| One-off Audit | €799 | Dosar complet livrat în 3-7 zile |

---

## 7. Stack Tehnic (Locked)

- Next.js 15 App Router
- Supabase (PostgreSQL + Auth + Storage)
- HMAC SHA-256 session (`aiact_session`)
- Resend pentru email
- v3 design system (graphite/cobalt + Space Grotesk + Inter Tight)
- Vercel auto-deploy pe push main
- GitHub `vaduvel/CompliRoAI` privat

---

## 8. Reguli De Aur

### Regula 1 — Port First
> **"Default = PORT. Build nou doar dacă subagent confirmă că NU există în DPO-OS."**

### Regula 2 — Sprint Log Obligatoriu (Jira Style)
> **"FIECARE sprint (subagent sau manual) creează `docs/sprints/sprint-NNN-titlu.md` folosind `_TEMPLATE.md`. Commit log-ul în același commit cu codul. Fără log = sprint nu există."**

Conține: status, files create/modified, tests, decisions, commits, concerns, dependencies, notes pentru următorul agent.

### Regula 3 — Brief Obligatoriu
Toate sprinturile/sub-agenții primesc:
1. Acest document (implementation spec)
2. `docs/sprints/INDEX.md` (pentru context istoric)
3. `_TEMPLATE.md` (pentru output log)

---

**FINAL DOC.** Singura sursă de adevăr pentru execuție.
