# Sprint 023.7 — Art. 50 Content Labeling Depth

**Status:** DONE
**Faza:** AI Act depth — extension to Sprint 006 Transparency module
**Start:** 2026-05-18 14:55
**End:** 2026-05-18 15:35
**Owner:** Claude (Opus 4.7 1M)

---

## Goal (1 propoziție)

Transform Transparency Art. 50 module (Sprint 006) from per-system implementation flags into a mature workflow with per-asset Content Register, provider vs deployer duty split, machine-readable evidence tracking (C2PA / IPTC / SynthID / watermark), 3 new placement options (advertisement, social-post, broadcast), 4 new preventive findings rules, UI tab in /dashboard/transparency, and Audit Pack section.

Mandate compliance: extends Sprint 006 (Rule 1 — port/extend first), determined by Art. 50(1)(2)(3)(4)(5) verbatim (Rule 2), no forbidden frameworks (Rule 3), no half-baked code (Rule 6).

---

## Task list

- [x] Step 1 — Types: ArtFiftyDutyType, ContentLabelingStandard, AIContentAssetType, AIContentEvidenceItem, AIContentLabeledAsset; extend TransparencyPlacement (+3), TransparencyImplementation (+dutyType), ComplianceState (+aiContentAssets[]); extend PreventiveTriggerType (+4 rules) + PreventiveEntityType (+content_asset).
- [x] Step 2 — Engine: evaluateContentLabelingGap, inferDutyTypeForAsset, annotateContentAsset; Templates: 18 noi (3 placements × 3 notice types × RO+EN).
- [x] Step 3 — transparency-content-store.ts (CRUD + evidence + markdown export) + 17 tests.
- [x] Step 4 — 5 API routes (/api/transparency/content-assets/* CRUD + evidence).
- [x] Step 5 — Preventive scanner rules 17-20 + 8 tests.
- [x] Step 6 — Dashboard tab Content Register + create modal + evidence modal + inline asset details.
- [x] Step 7 — Audit Pack: transparency/content-register.md + transparency/assets/{id}.md + contentAssetsCount în manifest.
- [x] Step 8 — Sprint log + INDEX update + push.

---

## Files created

- `lib/compliance/transparency-engine.test.ts` (28 tests)
- `lib/server/transparency-content-store.ts` (store adapter)
- `lib/server/transparency-content-store.test.ts` (17 tests)
- `app/api/transparency/content-assets/route.ts` (GET + POST)
- `app/api/transparency/content-assets/[id]/route.ts` (GET + PATCH + DELETE)
- `app/api/transparency/content-assets/[id]/evidence/route.ts` (POST)
- `docs/sprints/sprint-023-7-art-50-content-labeling-depth.md` (sprint log)

## Files modified

- `lib/compliance/types.ts`
  - +3 placements: advertisement, social-post, broadcast
  - +dutyType pe TransparencyImplementation (optional, backward compat)
  - +5 tipuri noi: ArtFiftyDutyType, ContentLabelingStandard, AIContentAssetType, AIContentEvidenceType, AIContentEvidenceItem, AIContentLabeledAsset
  - +4 trigger types: art50_deepfake_no_watermark, art50_synthetic_content_no_metadata, art50_chatbot_no_runtime_disclosure, art50_public_interest_no_editorial_flag
  - +1 entity type: content_asset
  - ComplianceState: +aiContentAssets[]

- `lib/compliance/transparency-engine.ts`
  - +evaluateContentLabelingGap(asset) — pure function returning provider/deployer/editorial gaps
  - +inferDutyTypeForAsset(asset, role) — provider_marking/deployer_disclosure/both
  - +annotateContentAsset(asset, role) — wrapper combining asset + gap + duty
  - +SYNTHETIC_TYPES set

- `lib/compliance/transparency-templates.ts`
  - +18 templates noi (RO+EN × 3 placements × 3 notice types):
    - chatbot-disclosure: advertisement/social-post/broadcast (RO+EN)
    - ai-generated-content: advertisement/social-post/broadcast (RO+EN)
    - deepfake-disclosure: advertisement/social-post/broadcast (RO+EN)
  - PLACEMENT_LABELS extins cu 3 entry-uri noi

- `lib/compliance/preventive-scanner.ts`
  - scanState include scanContentAssets()
  - +scanContentAssets(): 4 reguli (17-20)

- `lib/compliance/preventive-scanner.test.ts`
  - +8 tests (Rules 17-20: critical/empty/edge cases)

- `lib/server/preventive-engine-runner.ts`
  - triggerToCategory: switch exhaustive include 4 reguli noi → EU_AI_ACT

- `lib/server/renewal-email-dispatcher.ts`
  - isEntityStillPending switch include content_asset
  - entityToUrl switch include content_asset → /dashboard/transparency?tab=content-register

- `app/dashboard/transparency/page.tsx`
  - +Tab switcher (Notice-uri | Content Register)
  - +ContentRegisterTab cu stats grid, filtres, asset list collapsible
  - +ContentAssetDetails inline panel cu gap warnings + acțiuni
  - +ContentAssetCreateModal cu 3 secțiuni (Identification, Provider duty, Deployer duty, Editorial review condiționat)
  - +AttachEvidenceModal cu 6 evidence types

- `lib/server/audit-pack-builder.ts`
  - Import buildContentAssetMarkdown + buildContentRegisterMarkdown
  - +pushContentRegisterFiles()
  - Manifest.summary: +contentAssetsCount
  - Audit trail string: +Content assets (Art.50):{count}

- `tests/audit-pack-builder-sprint-011.test.ts`
  - +AIContentLabeledAsset import + sample fixture deepfake
  - +4 tests (paths includ content-register/assets, content + gap warnings, manifest count)

---

## Schema changes

- `ComplianceState.aiContentAssets?: AIContentLabeledAsset[]` (optional, backward compat)
- `TransparencyImplementation.dutyType?: ArtFiftyDutyType` (optional)
- `TransparencyPlacement` union extins cu `advertisement | social-post | broadcast`
- `PreventiveTriggerType` extins cu 4 noi reguli Art. 50
- `PreventiveEntityType` extins cu `content_asset`
- `AuditPackManifest.summary.contentAssetsCount?: number`

Niciun breaking change. Migrare retroactivă pe state vechi — toate field-urile noi sunt optional.

---

## Tests

- `npx tsc --noEmit`: clean (0 errors)
- `npx vitest run`: 1218/1218 pass (90 → 92 files, 1161 → 1218 tests, +57 noi)
  - Sprint 023.7 noi: 28 (engine) + 17 (store) + 8 (scanner) + 4 (audit-pack) = 57
- `npm run build`: clean (0 erori, 3 routes noi enregistrate)

Live verification:
- `POST /api/transparency/content-assets {assetType: "deepfake", deployerDisclosureApplied: false}` → CRITICAL finding emis (Art. 50(4)(a))
- `POST /api/transparency/content-assets {assetType: "image", providerMarkingStandard: "none", deployerDisclosureApplied: true}` → HIGH finding emis (Art. 50(2))
- `POST /api/transparency/content-assets {assetType: "public_interest_text", isPublicInterest: true, editorialResponsibilityClaim: false, deployerDisclosureApplied: false}` → HIGH finding emis (Art. 50(4)(b))
- `PATCH /api/transparency/content-assets/{id} {providerMarkingApplied: true, providerMarkingStandard: "c2pa"}` → finding rezolvat automat

---

## Decisions made

- **C2PA + IPTC ca standarde de referință:** ContentLabelingStandard enum include c2pa, iptc_photo_metadata, watermark_visible, watermark_invisible (SynthID etc.), metadata_only (non-standard), none. C2PA este de-facto standard (Adobe/Microsoft/OpenAI/Google coalition), iar IPTC PhotoMetadata e standard ISO pentru foto. SynthID-ul Google e un caz special de watermark_invisible. Acoperă tot spectrum-ul tehnic cerut de Art. 50(2) "machine-readable format and detectable as artificially generated or manipulated".

- **Public-interest editorial claim este derogarea Art. 50(4)(b):** Asset cu `editorialResponsibilityClaim=true` și `editorialReviewBy + editorialReviewAtISO` populate NU declanșează editorialGap. Asset cu disclosure aplicat (`deployerDisclosureApplied=true`) IS suficient și fără claim. Reflectă verbatim text Art. 50(4)(b): "where the AI-generated content has undergone a process of human review or editorial control and where a natural or legal person holds editorial responsibility for the publication".

- **Stable finding IDs `art50-content-{assetId}-{rule}`:** Permit dedup la re-evaluare. updateContentAsset detectează gap-uri rezolvate prin set difference (previousGap → newGap) și marchează findings ca resolved. Findings noi pentru gap-uri introduse se emit via createFinding. Dedup la create se face prin căutarea în findings existente după `evidenceRequired.includes(stableId)`.

- **dutyType pe TransparencyImplementation rămâne backward compatible:** Câmp optional cu default semantic "deployer_disclosure" (consistent cu modul existent în care era folosit Sprint 006). Codul existent nu este afectat.

- **3 placements noi reflectă canale media reale:**
  - `advertisement` — reclame plătite (TikTok Ads, Meta Ads, Google Ads). Templates includ wording specific (reclamă/ad).
  - `social-post` — post organic social media (LinkedIn, X, IG). Templates includ icon-uri ℹ️ / 🪄 / ⚠️.
  - `broadcast` — email newsletter / push notification. Templates includ wording „acest email/notificare".

- **Sample state pentru audit pack tests folosește deepfake fără disclosure:** Acoperă rendering-ul gap warning ⚠️ și citarea Art. 50(4)(a) verbatim. 4 tests noi validate path-uri ZIP + conținut markdown + manifest count.

- **Audit pack folosește top-level import în loc de require:** Inițial folosit require() pentru a evita potențial cycle, dar import normal funcționează (transparency-content-store nu importă audit-pack-builder). Mai curat, type-safe.

---

## Concerns / Blockers

- ⚠️ **Concern 1 — overlap cu Sprint 024 (AI Ads / LLM Commerce):** Sprint 024 va aduce AI Ads compliance pack (claim evidence registry, creative approval log, GDPR conversion tracking). Există overlap natural pentru content labeling în reclame plătite — am rezolvat prin oferirea placement `advertisement` în templates aici, dar Sprint 024 trebuie să folosească AIContentLabeledAsset register (NU să dupliceze). Recomandare: Sprint 024 leagă creative claim → AIContentLabeledAsset.id existent.

- ⚠️ **Concern 2 — orgName în sample state test:** pickOrgNameFromState fallback la orgId când nu există clientMeta. Test asserts "Content Register Art. 50" (fără SRL) ca atare. Pentru cabinet workflow real, clientMeta.orgName e populat din intake. Comportament corect, doar testul nu testează clientMeta path.

- Niciun blocker.

---

## Commits

- `7cea39a` — feat(sprint-23-7-1): Art. 50 Content Labeling types
- `99310b6` — feat(sprint-23-7-2): transparency engine + templates extended
- `1053965` — feat(sprint-23-7-3): content asset store adapter with finding emission
- `f55ba96` — feat(sprint-23-7-4): /api/transparency/content-assets API routes
- `16f0637` — feat(sprint-23-7-5): preventive rules 17-20 for Art. 50 content labeling gaps
- `f800309` — feat(sprint-23-7-6): /dashboard/transparency Content Register tab + asset CRUD
- `ebced8f` — feat(sprint-23-7-7): wire Content Register into Audit Pack
- (next) — docs(sprint-23-7): sprint log + INDEX update

## Live URL

- Will deploy after push: `https://eu-ai-act-beige.vercel.app/dashboard/transparency`
- Tab "Content Register (per asset)" alături de "Notice-uri per sistem"

---

## Dependencies

**Requires from previous sprints:**
- Sprint 006 (Transparency Art. 50 base — module se extinde, NU se înlocuiește)
- Sprint 008B (Findings cockpit — createFinding pattern reutilizat)
- Sprint 011 (Audit Pack — wire pattern reutilizat)
- Sprint 022 (Preventive Engine — extins cu 4 reguli noi)

**Unlocks for next sprints:**
- Sprint 024 (AI Ads / LLM Commerce) — claim evidence registry trebuie să link-uiască la AIContentLabeledAsset; placement `advertisement` deja disponibil.

---

## Legal sources of truth (mandate § 4)

- EU AI Act Regulation (EU) 2024/1689:
  - Art. 50(1) — chatbot interaction disclosure (provider deployer side)
  - Art. 50(2) — machine-readable marking of synthetic content (provider)
  - Art. 50(3) — emotion recognition / biometric categorization (deployer)
  - Art. 50(4)(a) — deepfake disclosure (deployer)
  - Art. 50(4)(b) — public-interest text disclosure with editorial review derogation (deployer)
  - Art. 50(5) — information clear, distinguishable, at first interaction/exposure
- Deadline: 2 august 2026 (Omnibus mai 2026 → 2 decembrie 2026 — current code refleсtă deja această extension)
- Standardele machine-readable referențiate (industry de-facto):
  - C2PA (Coalition for Content Provenance and Authenticity) — Adobe / Microsoft / OpenAI / Google
  - IPTC PhotoMetadata standard (ISO/IEC)
  - SynthID (Google DeepMind) — invisible watermark
- EUR-Lex: https://eur-lex.europa.eu/eli/reg/2024/1689/oj

---

## Notes pentru următorul agent

- Pattern store adapter este consistent cu oversight-store / logging-evidence-store / pmm-store: mutateFreshStateForOrg + createFinding + appendComplianceEvents. Findings se emit cu stable IDs pentru dedup.

- Engine functions sunt pure (evaluateContentLabelingGap, inferDutyTypeForAsset, annotateContentAsset). Reutilizabile în UI + API + audit pack.

- Templates pentru noile placements (advertisement / social-post / broadcast) au fallback automat la HTML inline (buildHtml `default` ramură).

- UI tab e structurat astfel încât „Notice-uri" (Sprint 006) rămâne intact — pentru consultanți/utilizatori existenți nu se schimbă fluxul. „Content Register" e adițional. Empty state explicit redirectionează către butonul „Adaugă asset".

- Preventive scanner Rule 19 (chatbot fără asset chatbot_interaction) este o cross-check între state.aiSystems + state.aiContentAssets — nu doar iterare pe assets. Acest pattern e util pentru viitor (e.g. high-risk system fără FRIA).

- Sprint 024 (AI Ads / LLM Commerce) trebuie să consume aceste tipuri, NU să dupliceze. Recomandare: claim evidence record (Sprint 024) linkuiește la AIContentLabeledAsset.id ca attribute, similar cum DPIA linkuiește la AISystemRecord.id.
