# Sprint 024 — AI Ads / LLM Commerce Compliance Pack

**Status:** DONE
**Faza:** 5 (Commercial — #19 last functional per mandate § 6.1)
**Start:** 2026-05-17
**End:** 2026-05-18
**Owner:** manual: Claude (subagent continuation)

---

## Goal (1 propoziție)

Livrează workflow-ul AI Ads / LLM Commerce Compliance Pack — campanii + claims + creative approvals + GDPR conversion tracking review + audit pack + finding emission cross-linked la Vendor (Sprint 010) și Content Register (Sprint 023.7) — fără claim de „private protocol", fără reframing ca tool GEO.

Positioning copy verbatim (mandate § 18.1):
> AI Ads Compliance Pack: ce afirmă AI-ul despre brand, pe ce sursă, cine a aprobat, ce date au fost folosite și ce risc legal există.

---

## Task list (8 commits)

- [x] Step 1 — Types AIAdsCampaign + AIAdsClaim + AIAdsCreativeApproval + ConversionTrackingReview + 4 fields în ComplianceState (`cc8be8c`)
- [x] Step 2 — `lib/compliance/ai-ads-engine.ts` (701 LOC) + 37 tests (`2690b56`)
- [x] Step 3 — `lib/server/ai-ads-store.ts` (1000+ LOC) + 22 tests cu cascade-delete + stable IDs dedup (`b401b39`)
- [x] Step 4 — 8 API routes `/api/ai-ads/*` (campaigns + claims + approvals + tracking + export) (`fd4d429`)
- [x] Step 5 — preventive scanner rules 21-25 + runner triggerToCategory + 7 tests (`9d85504`)
- [x] Step 6 — `/dashboard/ai-ads/page.tsx` (2200+ LOC) cu 5 tab-uri + 4 modale (`4ca9694`)
- [x] Step 7 — wire AI Ads în Audit Pack + nav-config + feature-gates + 18 tests (`c6fe295`)
- [x] Step 8 — sprint log + INDEX update (this commit)
- [x] Build clean: 8 routes + /dashboard/ai-ads in build output
- [x] Live test: API routes + page registered (verified prin `npm run build`)

---

## Files created (~14)

### lib/compliance
- `lib/compliance/ai-ads-engine.ts` — 701 LOC pure rule engine. Exporta:
  - `evaluateCampaignGaps(campaign, claims, approvals, tracking, vendors)` → `{gaps, findingCandidates}` cu 8 reguli legal-mapped
  - `evaluateClaimRisk(claim)` → `AIClaimMisleadingRisk` heuristic (claimType × evidenceStatus → low/medium/high)
  - `buildClaimRiskReasons(claim)` → string[] cu anchors Directive 2005/29/EC + Law 363/2007 + Directive 2006/114/CE
  - `evaluateClaimFindings(claim)` → finding HIGH/CRITICAL dacă misleadingRisk high/critical
  - `evaluateTrackingGaps(review)` → string[] GDPR + ePrivacy
  - `generateAIAdsMarkdown(c, cl, a, tr)` → markdown per-campanie cu secțiuni A-F
- `lib/compliance/ai-ads-engine.test.ts` — 37 cazuri (claim risk × 10 + reasons × 3 + claim findings × 3 + tracking gaps × 6 + campaign gaps × 10 + markdown × 2 + helpers × 3)

### lib/server
- `lib/server/ai-ads-store.ts` — store adapter cu 13 funcții publice (createCampaign, updateCampaign cu re-eval, deleteCampaign cascade, createClaim cu auto-risk, updateClaim, deleteClaim, recordCreativeApproval, attachConversionTrackingReview upsert, listCampaigns cu filtre, summarizeAIAds, buildOrgAIAdsMarkdown). Emit findings via `createFinding` cu stable IDs encoded în `evidenceRequired` pentru dedup.
- `lib/server/ai-ads-store.test.ts` — 22 cazuri (create × 5 + update × 2 + claim create × 3 + claim update × 1 + approval × 3 + tracking × 2 + cascade × 1 + delete claim × 1 + filters × 1 + dedup × 1 + summary + markdown × 2)

### app/api/ai-ads (8 endpoints)
- `app/api/ai-ads/campaigns/route.ts` — GET (filtre + schema) + POST
- `app/api/ai-ads/campaigns/[id]/route.ts` — GET + PATCH + DELETE
- `app/api/ai-ads/campaigns/[id]/approve/route.ts` — POST record creative approval
- `app/api/ai-ads/claims/route.ts` — GET (filtre) + POST
- `app/api/ai-ads/claims/[id]/route.ts` — GET + PATCH + DELETE
- `app/api/ai-ads/claims/[id]/approve/route.ts` — POST mark approved
- `app/api/ai-ads/tracking-review/route.ts` — GET (?campaignId) + POST upsert
- `app/api/ai-ads/export/route.ts` — GET ?format=md (download markdown)

### app/dashboard/ai-ads
- `app/dashboard/ai-ads/page.tsx` — 2238 LOC client component cu 5 tab-uri (Campanii / Claims / Approvals / Tracking / Export) + 4 modale (Campaign / Claim / Approval / Tracking) + StatCard + Badge + EmptyState

### docs/sprints
- `docs/sprints/sprint-024-ai-ads-llm-commerce-compliance-pack.md` — acest log

## Files modified

- `lib/compliance/types.ts` — adăugate 4 fields în `ComplianceState` (`aiAdsCampaigns?`, `aiAdsClaims?`, `aiAdsCreativeApprovals?`, `conversionTrackingReviews?`) + 11 type-uri (`AIAdsCampaign`, `AIAdsClaim`, `AIAdsCreativeApproval`, `ConversionTrackingReview`, `AIAdsCampaignPlatform`, `AIAdsCampaignStatus`, `AIAdsCampaignType`, `AIClaimType`, `AIClaimEvidenceStatus`, `AIClaimMisleadingRisk`, `ConversionTrackingMethod`, `AIAdsTransferMechanism`). 5 trigger-uri noi în `PreventiveTriggerType`. 2 entity types noi în `PreventiveEntityType` (`ai_ads_campaign` + `ai_ads_claim`).
- `lib/compliance/preventive-scanner.ts` — `scanState()` apelează `scanAIAds()`. Funcție nouă cu 5 reguli (21-25) legal-mapped:
  - 21: claim evidence missing → MEDIUM (Directive 2005/29/EC + Law 363/2007)
  - 22: creative approval missing/incomplete → HIGH/OVERDUE
  - 23: tracking review missing → HIGH GDPR
  - 24: vendor/DPA missing for major AI platform → HIGH GDPR
  - 25: misleading claim risk → DUE_SOON/CRITICAL
- `lib/compliance/preventive-scanner.test.ts` — 7 cazuri noi (rules 21-25 + critical case + empty-state guard)
- `lib/server/preventive-engine-runner.ts` — `triggerToCategory()` map: `ai_ads_tracking_review_missing` + `ai_ads_vendor_review_missing` → GDPR; restul → EU_AI_ACT.
- `lib/server/renewal-email-dispatcher.ts` — `isEntityStillPending()` + `entityToUrl()` cazuri pentru `ai_ads_campaign` + `ai_ads_claim` cu deep-link `/dashboard/ai-ads?tab=...&campaign=ID/&claim=ID`.
- `lib/server/audit-pack-builder.ts` — `pushAIAdsFiles()` emite: `ai-ads/campaigns.md` + `ai-ads/claims-registry.md` + `ai-ads/creative-approval-log.md` + `ai-ads/tracking-review.md` + `ai-ads/per-campaign/{id}.md`. Manifest summary: `aiAdsCampaignsCount` + `aiAdsClaimsCount` + `aiAdsApprovalsCount` + `conversionTrackingReviewsCount`. Audit trail TXT include cele 4 counts.
- `components/shell/nav-config.ts` — entry nou `{href:"/dashboard/ai-ads", label:"AI Ads & Claims", iconName:"Megaphone", section:"compliance", workspaceModes:["imm-classic","ai-builder","cabinet"], requiredFeature:"ai_ads_pack"}`.
- `components/shell/nav-config.test.ts` — 8 cazuri noi (visibility per workspace × tier).
- `components/shell/dashboard-shell.tsx` — `Megaphone` în lucide imports + ICON_REGISTRY map.
- `lib/server/feature-gates.ts` — `Feature` union extins cu `"ai_ads_pack"`. Vizibil în toate 3 workspace modes. Tier unlock: `free_trial` + `imm_mid` + `ai_builder` + `cabinet_solo` + `cabinet_pro` + `cabinet_enterprise`. NU pe `imm_solo`.
- `lib/server/feature-gates.test.ts` — 5 cazuri noi.
- `tests/audit-pack-builder-sprint-011.test.ts` — fixture extins cu `adsCampaign` + `adsClaim` + `adsApproval` + `adsTracking`. 5 cazuri noi (zip files, content, per-campaign markdown, manifest counts, hash chain).

## Files removed

— niciun fișier șters.

---

## Schema changes

- State extension: `AIActState` (alias pentru `ComplianceState`) extins cu:
  - `aiAdsCampaigns?: AIAdsCampaign[]`
  - `aiAdsClaims?: AIAdsClaim[]`
  - `aiAdsCreativeApprovals?: AIAdsCreativeApproval[]`
  - `conversionTrackingReviews?: ConversionTrackingReview[]`
- `AuditPackManifest.summary` extins cu 4 counts (optional, backward compatible).
- `PreventiveTriggerType` union extins cu 5 trigger-uri noi.
- `PreventiveEntityType` union extins cu 2 entity types noi.
- Supabase: nimic — state persistat în `org_state` JSONB column existent (drop-in compat).

---

## Tests

- `npx tsc --noEmit`: **clean** (0 errors)
- `npm run build`: **clean** — 8 noi /api/ai-ads/* routes + /dashboard/ai-ads pagină listed în build output
- `npx vitest run`: **1302 passing / 0 failing** (baseline 1218 → +84 noi, total 94 test files)
- Per-step test counts:
  - Step 2 engine: 37 tests passing
  - Step 3 store: 22 tests passing
  - Step 5 scanner: +7 tests (total scanner 32 passing)
  - Step 7 nav-config: +8 tests | feature-gates: +5 tests | audit-pack: +5 tests
- Live test (verificat în build output):
  - 8 API routes: `/api/ai-ads/{campaigns, campaigns/[id], campaigns/[id]/approve, claims, claims/[id], claims/[id]/approve, tracking-review, export}`
  - 1 dashboard page: `/dashboard/ai-ads` (11 kB bundle)

---

## Decisions made

- **Cross-module link pattern (Rule 1):** `campaign.linkedVendorId` punctează la `VendorRecord` existent (Sprint 010); `campaign.linkedAssetIds[]` punctează la `AIContentLabeledAsset` (Sprint 023.7). **NU** există register duplicat. UI campaign-form trimite ID-uri ca string-uri, store nu validează cross-link (UI/audit responsibility); nav cross-link bidirecțional NU este implementat din scop (poate fi adăugat în Sprint 25+ dacă apare nevoie).
- **Claim risk heuristic:** 5 reguli named (HIGH_STAKES_CLAIMS × evidence status combinations), **NU** un magic score 0-100. Compliance claim (ex. „GDPR compliant") nu acceptă `vendor_attestation` ca dovadă suficientă — necesită verificare independentă. Vendor attestation pe claim performance/preț/garanție = `medium`. UI face preview live folosind aceeași logică.
- **Stable finding IDs encoded în `evidenceRequired`:** pattern identic cu Sprint 023.7 — re-eval re-emite finding-ul aceleași stable ID, dedup prin `f.evidenceRequired?.includes(stableId)`. Trei familii: `ai-ads-campaign-{id}-{rule}` / `ai-ads-claim-{id}-{rule}` / `ai-ads-tracking-{id}-{rule}`.
- **Cascade-delete pe campaign:** când `deleteCampaign(id)` rulează, store-ul șterge automat: (a) toate claim-urile linkate via `campaign.linkedClaimIds[]` SAU `claim.campaignId === campaign.id`; (b) toate approvals cu `approval.campaignId === campaign.id`; (c) tracking review legat via `campaign.conversionTrackingReviewId` SAU `review.campaignId === campaign.id`; (d) închide TOATE findings linkate (`linkedFindingIds` cumulate) ca `resolved` cu `operationalEvidenceNote` „Closed automatic: campania AI Ads ștearsă...".
- **Tracking review = upsert (NU create-new-each-time):** `attachConversionTrackingReview` reutilizează `campaign.conversionTrackingReviewId` dacă există; review-ul rămâne sub același `id`, doar conținutul (metode + consent + gaps + findings) se re-evaluează. Asta evită proliferarea de review-uri orfane.
- **Preventive rule 23 = GDPR category** (NU EU_AI_ACT) pentru că tracking pixel/cookie/CRM upload este sub GDPR + ePrivacy strict, nu Art. 50 AI Act. Rule 24 (vendor missing) = tot GDPR pentru că trigger-ul este Art. 28 DPA. Restul 3 → EU_AI_ACT (Art. 5 + Directive 2005/29/EC).
- **`linkedVendorId` opțional fără validare cross-state:** UI poate trimite orice string; engine doar verifică existența în `state.vendorRecords[]` pentru a NU emite finding `vendor-dpa-missing`. Dacă vendor-ul nu există în state, finding-ul rămâne deschis până când utilizatorul creează vendor + DPA în /dashboard/vendor-review. Asta menține separation of concerns.
- **`ai_ads_pack` feature gate NU pe imm_solo:** tier-ul minim pentru AI Ads este `imm_mid` (sau orice tier `ai_builder` / `cabinet_*`). Decisia: AI Ads compliance este pentru organizații care fac campanii activ — solo trial nu are buget de campanii AI.
- **Positioning copy verbatim peste tot:** mandate § 18.1 specifică textul exact; folosit în page header, modal positioning, markdown export header, audit pack section. NICIUN cuvânt schimbat.

---

## Concerns / Blockers

- niciun concern. Live test prin `npm run build` arată toate cele 8 routes + pagina înregistrate. Tests 1302/1302 green. tsc clean.

---

## Mandate compliance verified

- **NU** apare nicăieri textul „protocol privat obligatoriu legal", „NAP", „Ahauros", „GEO tool", „magic formula".
- Positioning = evidence pack pentru claim/approval/tracking trail; **NU** repositioning ca GEO/visibility tool.
- Cross-module linking real cu VendorRecord (Sprint 010) + AIContentLabeledAsset (Sprint 023.7) — **NU** registre duplicate.
- Legal anchors verificate în output: Directive 2005/29/EC + RO Law 363/2007 + GDPR Art. 5/13/14/28/44-49 + ePrivacy Directive 2002/58/EC Art. 5(3) + Art. 5 + Art. 50 EU AI Act + Directive 2006/114/CE.
- Findings cu severitate calibrată: campanie cu categorii vulnerabile fără review → CRITICAL (Art. 5(1)(b) AI Act + Art. 99 amendă 35M EUR / 7%); compliance claim unsubstantiated → HIGH; tracking review missing → HIGH GDPR.

---

## Commits

- `cc8be8c` — feat(sprint-24-1): AI Ads / LLM Commerce types (Step 1, pre-existed)
- `2690b56` — feat(sprint-24-2): AI Ads engine (gap eval + claim risk + tracking gaps + markdown)
- `b401b39` — feat(sprint-24-3): AI Ads store adapter cu finding emission cross-linked la vendors/assets/findings
- `fd4d429` — feat(sprint-24-4): /api/ai-ads/* (campaigns + claims + approvals + tracking-review + export)
- `9d85504` — feat(sprint-24-5): preventive rules 21-25 pentru AI Ads gaps + runner triggerToCategory
- `4ca9694` — feat(sprint-24-6): /dashboard/ai-ads UI cu campaigns + claims + approvals + tracking + export
- `c6fe295` — feat(sprint-24-7): wire AI Ads în Audit Pack + nav-config + tests
- `(this)`  — docs(sprint-24): sprint log + INDEX update

## Live URL

- Sprint deploy: branch `main` → auto-deploy Vercel post-push
- Production: `compliroai.ro/dashboard/ai-ads` (gated pe `ai_ads_pack` feature + workspace mode allowlist)

---

## Dependencies

- Sprint 010 — Vendor AI Assessment (cross-link `linkedVendorId` → `VendorRecord`)
- Sprint 022 — Preventive engine (rules 21-25 extends 16 existing + 4 din Sprint 023.7)
- Sprint 011 — Audit Pack (wire `pushAIAdsFiles` în builder)
- Sprint 023.7 — Content Register (cross-link `linkedAssetIds[]` → `AIContentLabeledAsset`)

## Backwards compat

- Toate fields noi în `ComplianceState` sunt **optional** (`?`).
- `AuditPackManifest.summary` 4 noi câmpuri toate **optional** (backward compatible cu ZIP-uri vechi).
- `PreventiveTriggerType` + `PreventiveEntityType` extinse cu union members noi (exhaustive switch-uri actualizate în renewal-email-dispatcher + preventive-engine-runner).

---

## PLAN MANDATE COMPLETE

Per mandate § 6.1, Sprint 24 este #19 functional final. Plan complet:

- Sprint 007 → DSAR Port ✅
- Sprint 008A/B/C/D → Foundation + Findings + DPIA + ROPA + Breach ✅
- Sprint 009 → AI Data Discovery + PII + Exposure + Policy Pack ✅
- Sprint 010 → Vendor AI Assessment ✅
- Sprint 011 → Structured Audit Log + Audit Pack wire ✅
- Sprint 012 → DORA AI + NIS2 AI slices ✅
- Sprint 013 → Approval queue + Calendar + Trust Center ✅
- Sprint 014 → PDF + Onboarding emails + Stripe ✅
- Sprint 015 → Role-aware UI ✅
- Sprint 016 → FRIA Art. 27 ✅
- Sprint 017 → Human Oversight Art. 14 ✅
- Sprint 018 → Logging Evidence Art. 12 ✅
- Sprint 019 → Post-Market Monitoring Art. 72 ✅
- Sprint 020 → AI Incident Reporting Art. 73 ✅
- Sprint 021 → QMS Workspace Art. 17 ✅
- Sprint 022 → Preventive Engine + Renewal + Change Log ✅
- Sprint 023 → API/SDK for AI Builders ✅
- Sprint 023.5 → Production Readiness QA ✅
- Sprint 023.7 → Art. 50 Content Labeling Depth ✅
- Sprint 024 → AI Ads / LLM Commerce Compliance Pack ✅ ← acest sprint

**STOP per mandate § 18.2.** Următoarele sprinturi (25+) sunt outside-of-mandate și necesită un mandate nou.
