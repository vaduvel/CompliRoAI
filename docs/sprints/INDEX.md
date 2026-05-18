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
| **015** | **Role-aware UI final (3 modes per-role nav with feature gates, 7 placeholder pages, 3 cabinet pages, per-role dashboard landing, onboarding 3-mode, trial banner)** | ✅ DONE | 512fa0d+ | manual: Claude | [sprint-015-role-aware-ui.md](sprint-015-role-aware-ui.md) |
| **016** | **FRIA Generator (Art. 27 — first AI Act depth module; BUILD NEW; 6-section wizard + 24 fundamental rights catalog + risk matrix likelihood×severity + Art. 27(4) DPIA reuse + ANSPDCP/ADR/ASF notification workflow + Audit Pack wired)** | ✅ DONE | 3d99e3f+ | subagent + manual: Claude | [sprint-016-fria-art-27.md](sprint-016-fria-art-27.md) |
| **017** | **Human Oversight Protocols (Art. 14 — BUILD NEW; 5-section wizard cu cele 5 capacități Art. 14(3)(a)-(e) + responsibles Art. 26(2) + escalation + contestation + stop/fallback; two-person rule OBLIGATORIU pentru biometric ID per Art. 14(4); completeness check 3 niveluri + 5 reguli findings; AI Inventory banner; Audit Pack wired)** | ✅ DONE | f6d68cf+ | manual: Claude | [sprint-017-human-oversight-art-14.md](sprint-017-human-oversight-art-14.md) |
| **018** | **Logging Evidence (Art. 12 + Art. 26(6) — BUILD NEW; 4-section wizard cu 13 categorii evenimente Art. 12(2)/(3) + storage backend + retention ≥6 luni + integrity mechanism + access role + meta-logging; biometric_full coverage 4 câmpuri Art. 12(3) OBLIGATORIU pentru Annex III 1(a); completeness check 3 niveluri + retentionStatus 4 stări + 6 reguli findings; LogEvidenceItem cu hash + perioadă + eventCount; scheduleRetentionAlert pentru Sprint 022; AI Inventory banner; Audit Pack wired)** | ✅ DONE | 0bfad18+ | manual: Claude | [sprint-018-logging-evidence-art-12.md](sprint-018-logging-evidence-art-12.md) |
| **019** | **Post-Market Monitoring (Art. 72 + Annex IV pct. 10 — BUILD NEW; 5-section wizard PMM plan: data collection 9 metode + frecvență; compliance eval methods + metrics; corrective + preventive process; review cycle; baseline. Per plan: reviews timeline + version changes (cu marker Art. 43(4) substantial mod) + anomalies (cu escalation hook Sprint 020 Art. 73); completeness 3 niveluri + freshnessStatus 4 stări + 5 reguli findings incl. CRITICAL Art. 43(4) substantial mod fără re-evaluare + CRITICAL anomalie nerezolvată emisă imediat; scheduleReviewReminder pentru Sprint 022; AI Inventory banner; Audit Pack wired)** | ✅ DONE | b03af23+ | manual: Claude | [sprint-019-post-market-monitoring-art-72.md](sprint-019-post-market-monitoring-art-72.md) |
| **020** | **AI Incident Reporting (Art. 73 — BUILD NEW; distinct de GDPR Art. 33 / Sprint 008D; 5-section wizard cu 6 categorii Art. 73(2) + deadline auto 2/10/15 zile Art. 73(3); notifications timeline cu probă referenceNumber; root cause investigation Art. 73(4) cu factori + dovezi + remediation + prevention; 4 reguli findings incl. CRITICAL deadline overdue + HIGH missing root cause + HIGH catastrophic not closed; bridge PMM escalateAnomalyToIncident cu bidirectional link + severity mapping; linkToBreach bidirectional cu Sprint 008D; UI 1500+ linii cu UrgencyBanner top-3 countdown + 5-step wizard + EscalateFromPmmModal + Notify/RootCause/Close modale + 8 API routes; subtle red badge pe AI Inventory; nav coming-soon removed + cabinet visibility; Audit Pack wired cu 6 audit trail event types)** | ✅ DONE | acb31ca+ | manual: Claude | [sprint-020-ai-incident-reporting-art-73.md](sprint-020-ai-incident-reporting-art-73.md) |
| **021** | **QMS Workspace (Art. 17 — BUILD NEW; umbrella module pentru providers of high-risk AI systems; singleton per org cu 13 sectiuni Art. 17(1)(a)-(m) RO + tier essential/advanced pentru Art. 17(3) SME simplified mode; cross-module references AUTO-POPULATE pentru sectiunile (f)/(g)/(h)/(i)/(k) - RoPA + AI Data Map + DPIA + FRIA + findings + PMM + AI Incidents + Logging Evidence; per-system attestation matrix cu sections covered + gaps acknowledged; lessons learned aggregator idempotent din closed incidents + resolved high/critical anomalies + critical resolved findings cu evidence + manual lessons; approve workflow cu versionLabel bump + nextReviewISO 12 luni; completeness 3 niveluri + 8 reguli findings; UI 1500+ linii cu 4 tab-uri - Sections (13 carduri cu inline edit + cross-module refs box + 8 doc types attach) + Lessons + System Attestations + Cross-module Health + 4 modale + 9 API routes; AI Inventory banner pentru high-risk fara attestation; nav coming-soon removed + cabinet visibility + feature renamed qms→qms_workspace; Audit Pack wired cu qms/ folder - workspace.md + sections/{key}.md + lessons-learned.md + system-attestations.md + cross-module-health.md + 4 audit trail event types)** | ✅ DONE | 5ccfb2a+ | manual: Claude | [sprint-021-qms-workspace-art-17.md](sprint-021-qms-workspace-art-17.md) |
| **022** | **Preventive Engine + Renewal Tracker + Change Log Legislativ (16 scanner rules + 20 leg events + cron + email reminders + UI + 1052/1052 tests)** | ✅ DONE | 50369b5+ | subagent + manual: Claude | [sprint-022-preventive-engine-renewal-change-log.md](sprint-022-preventive-engine-renewal-change-log.md) |
| **023** | **API / SDK pentru AI Builders (BUILD NEW — last sprint before commercial phase; full /api/v1 surface with API key auth + 60 req/min rate limit + audit logging + redaction; Compliance Gate engine with 10 deterministic Art.-mapped rules pass\|review\|blocked, NO scoring magic; zero-dep TypeScript SDK CompliRoAIClient; /dashboard/api-sdk full UI cu key mgmt + endpoint reference + recent calls; /docs/api public docs cu curl+Python+Node+CI examples; OpenAPI 3.1 spec at /api/v1/openapi; Audit Pack api-sdk/ section cu keys-registry + recent-calls + gate-results; nav coming-soon removed; ai-builder-only visibility enforced; 1052→1151 tests +99 green)** | ✅ DONE | 79b13c9+ | manual: Claude | [sprint-023-api-sdk-ai-builders.md](sprint-023-api-sdk-ai-builders.md) |
| **023.5** | **Production Readiness / Full Application QA (NO new features; 8 fixes applied in-sprint: 2 CRITICAL cron auth vulnerabilities — fail-closed in production without CRON_SECRET; E_FACTURA UI surface removed from /resolve filter + /dosar label + /api/findings public error message; "demo" copy removed from landing CTA; AIACT_* env-prefix preferred over legacy COMPLISCAN_* with fallback; +10 cron regression tests; verified Audit Pack does NOT leak hmacHash/fullToken; nav per workspace clean. 1151→1161 tests +10 green; tsc clean; build clean; STOP înainte de Sprint 24)** | ✅ DONE | 0bbbcd7+ | manual: Claude | [sprint-023-5-production-readiness-full-qa.md](sprint-023-5-production-readiness-full-qa.md) |
| **023.7** | **Art. 50 Content Labeling Depth (EXTEND Sprint 006 Transparency module — NOT new framework. Per-asset Content Register distinct of per-system implementation. Provider duty (Art. 50(2) machine-readable marking — C2PA/IPTC/SynthID) vs deployer duty (Art. 50(1)/(3)/(4) visible disclosure) split per implementation. AIContentLabeledAsset register cu 8 tipuri asset (image/video/audio/text_synthetic/deepfake/public_interest_text/chatbot_interaction/other) + 6 evidence types + editorial responsibility claim (Art. 50(4)(b) derogation). 3 placements noi RO+EN (advertisement/social-post/broadcast) + 18 templates noi. transparency-content-store cu CRUD + finding emission cu stable IDs `art50-content-{id}-{rule}`. 5 API routes /api/transparency/content-assets/* CRUD+evidence. Preventive scanner rules 17-20: deepfake_no_watermark CRITICAL Art. 50(4)(a), synthetic_content_no_metadata HIGH Art. 50(2), chatbot_no_runtime_disclosure WATCH Art. 50(1), public_interest_no_editorial_flag HIGH Art. 50(4)(b). UI /dashboard/transparency cu tab nou „Content Register (per asset)" alături de „Notice-uri per sistem"; create modal cu 3 secțiuni; AttachEvidenceModal; inline asset details cu gap warnings + acțiuni. Audit Pack: transparency/content-register.md + transparency/assets/{id}.md + contentAssetsCount în manifest. 1161→1218 tests +57 green; tsc clean; build clean; STOP înainte de Sprint 24)** | ✅ DONE | ebced8f+ | manual: Claude | [sprint-023-7-art-50-content-labeling-depth.md](sprint-023-7-art-50-content-labeling-depth.md) |
| **024** | **AI Ads / LLM Commerce Compliance Pack (BUILD NEW — #19 last functional per mandate § 6.1. AIAdsCampaign + AIAdsClaim + AIAdsCreativeApproval + ConversionTrackingReview cross-linked la VendorRecord (Sprint 010) + AIContentLabeledAsset (Sprint 023.7), NO duplicate register. Pure engine cu 8 reguli legal-mapped: platform-terms-review HIGH, vendor-dpa HIGH GDPR Art. 28, conversion-tracking-review HIGH GDPR Art. 5/44-49 + ePrivacy, claim-evidence-missing MEDIUM Directive 2005/29/EC + Law 363/2007, ad-transparency-evidence HIGH Art. 50(4), vulnerable-targeting CRITICAL Art. 5(1)(b) AI Act, geo-llm-source-registry MEDIUM, creative-approval-missing/incomplete HIGH. evaluateClaimRisk heuristic NO magic score (high-stakes × evidence rules). 5 preventive rules 21-25 + dispatcher cu deep-link. Store adapter cu cascade-delete + stable IDs encoded în evidenceRequired pentru dedup. 8 API routes /api/ai-ads/* CRUD + approve + tracking-review upsert + export. UI /dashboard/ai-ads 5 tab-uri (Campanii / Claims / Approvals / Tracking / Export) + 4 modale cu live risk preview. Audit Pack: ai-ads/campaigns.md + claims-registry.md + creative-approval-log.md + tracking-review.md + per-campaign/{id}.md + manifest counts. Nav vizibil în toate 3 workspaces, gated pe ai_ads_pack feature (NU pe imm_solo). Positioning verbatim: „AI Ads Compliance Pack: ce afirmă AI-ul despre brand, pe ce sursă, cine a aprobat, ce date au fost folosite și ce risc legal există". NO Ahauros, NO NAP, NO GEO tool reframing. 1218→1302 tests +84 green; tsc clean; build clean. PLAN MANDATE COMPLETE — STOP după 024)** | ✅ DONE | cc8be8c+ | manual: Claude | [sprint-024-ai-ads-llm-commerce-compliance-pack.md](sprint-024-ai-ads-llm-commerce-compliance-pack.md) |
| **025** | **Full Product E2E QA & Production Hardening (NO new features per mandate; 11-phase audit across 3 workspaces + 8 tiers + 30+ dashboard modules; tsc/vitest/build clean entry-to-exit (1302 tests preserved); forbidden framework scan clean (Rule 3 — all hits are defensive comments / Romanian tax-ID labels / documented backward-compat union); 7 in-sprint fixes: 2 "mock" code comments renamed to "preview", `ComingSoonPage` 202-line orphan deleted, `NavBadge` union narrowed + dead resolver branch removed + dead `dashboard-shell` badge branch removed + unused import dropped. API health probe: 41 routes mounted (0 404/500); 12 public pages OK. Nav per-workspace × per-tier verified: imm_solo correctly omits AI Ads + Audit Pack; imm_mid+ has both; cabinet does NOT see Annex IV / EU Database / API-SDK / Risc AI. Audit Pack 17 sections verified incl. ai-ads/ + transparency/content-register/. Verdict: PRODUCTION_READY. STOP — no Sprint 026 without new mandate)** | ✅ DONE | c8f428e+ | manual: Claude | [sprint-025-full-product-e2e-qa-production-hardening.md](sprint-025-full-product-e2e-qa-production-hardening.md) |
| **026** | **EU AI Act Legal Coverage Matrix & Final Legal Hardening (NEW MANDATE — produce matrice articol-cu-articol pe TOATE titlurile + anexele Regulament (UE) 2024/1689 + închide 3 GAP_BLOCKER prin EXTENSII minime de module existing — NO new pages, NO new top-level nav. Sprint 026 closes: Art. 47 EU Declaration of Conformity (Anexa V — 7 câmpuri obligatorii) cu generator `buildEUDeclarationOfConformity` + `/api/ai-act/eu-declaration` + form în `/dashboard/conformitate` + AR Art. 22 support + notified body (Anexa VII) + retention Art. 18 + cooperation Art. 21 references. Art. 48 CE marking checklist cu `CE_MARKING_CHECKLIST` (7 itemuri context-aware physical / digital / NB-route filtering) + `evaluateCEMarkingChecklist` (verdict ready-for-ce / fixes-needed / blocked-critical) + `buildCEMarkingChecklistDocument` + `/api/ai-act/ce-marking` + form collapsible în `/dashboard/conformitate`. Art. 21 + Art. 26(11) Authority Cooperation Log cu `AuthorityCooperationRequest` schema (8 autorități: ANSPDCP / ADR / ANCOM / ASF / AI Office / market-surveillance / fundamental-rights / other; 4 statuses received → in-progress → responded → closed cu auto-stamping respondedAtISO + closedAtISO) + `lib/server/authority-cooperation-store.ts` full CRUD + `/api/authority-cooperation` GET+POST + `/api/authority-cooperation/[id]` GET+PATCH+DELETE + UI panel collapsible în `/dashboard/ai-incidents` (deasupra listei, distinct vizual de Art. 73). Audit Pack wire: `documents/eu-declaration-art-47/{id}.md` + `_index.json`, `documents/ce-marking-art-48/{id}.md` + `_index.json`, `cooperation/cooperation-log.md` + manifest counts (`authorityCooperationRequestsCount`, `euDocArt47Count`, `ceMarkingChecklistArt48Count`) + audit-trail.log cu `documentType` real + 3 evenimente noi (REQUEST_LOGGED, RESPONSE_SENT, CASE_CLOSED). Documents: `docs/legal/eu-ai-act-coverage-matrix-2026-05-18.md` (56 COVERED / 1 PARTIAL / 0 GAP_BLOCKER / ~25 NOT_TARGET / 1 PROVISIONAL Digital Omnibus / 6 FUTURE_TIER GPAI; surse + precedență OJEU > internal RO; citate articole-cheie Art. 5, 13, 14, 15, 21, 27, 47, 48, 50, 72, 73; auditor guide). 1302→1329 tests +27 green (9 Art.47/48 + 18 Art.21 store); tsc clean; build clean. STOP — no Sprint 027 without new mandate)** | ✅ DONE | 3770a03+dc9e9b6+b1ab3d5+7450d3d | manual: Claude | [sprint-026-eu-ai-act-legal-coverage-matrix.md](sprint-026-eu-ai-act-legal-coverage-matrix.md) |

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
