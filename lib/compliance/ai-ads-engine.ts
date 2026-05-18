/**
 * Sprint 024 — AI Ads / LLM Commerce Compliance Pack engine.
 *
 * Pure functions for:
 *  - evaluateCampaignGaps  — returns {gaps: string[], findingCandidates: ScanFinding[]}
 *  - evaluateClaimRisk     — heuristic mapping (claimType + evidenceStatus) → misleadingRisk
 *  - evaluateTrackingGaps  — GDPR / ePrivacy gap rules over ConversionTrackingReview
 *  - generateAIAdsMarkdown — full markdown pack per campaign (used by Audit Pack)
 *
 * Stateless / pure: no IO. Store layer (lib/server/ai-ads-store.ts) calls these
 * functions and persists results + emits findings via findings-store.
 *
 * Legal references woven into finding text:
 *  - Directive 2005/29/EC (unfair commercial practices) + RO Law 363/2007
 *  - GDPR Art. 5(1)(a)/13/14 + Art. 44-49 transfers
 *  - Art. 5 + Art. 50(4) EU AI Act
 *  - ePrivacy Directive 2002/58/EC (cookies + pixels)
 *
 * Positioning anchor (mandate § 18.1):
 *   "AI Ads Compliance Pack: ce afirmă AI-ul despre brand, pe ce sursă, cine
 *    a aprobat, ce date au fost folosite și ce risc legal există."
 */

import type { ComplianceSeverity } from "@/lib/compliance/constitution"
import type {
  AIAdsCampaign,
  AIAdsCampaignPlatform,
  AIAdsClaim,
  AIAdsCreativeApproval,
  AIClaimEvidenceStatus,
  AIClaimMisleadingRisk,
  AIClaimType,
  ConversionTrackingReview,
  VendorRecord,
} from "@/lib/compliance/types"

// ────────────────────────────────────────────────────────────────────────────
//   Types — outputs
// ────────────────────────────────────────────────────────────────────────────

export type AIAdsFindingCandidate = {
  /** Stable rule key — used by store to build `ai-ads-campaign-{id}-{rule}` or `ai-ads-claim-{id}-{rule}`. */
  ruleKey: string
  title: string
  detail: string
  severity: ComplianceSeverity
  legalReference: string
  remediationHint: string
  impactSummary: string
  evidenceRequired: string
  /** Either "campaign" or "claim" — used for category mapping (EU_AI_ACT vs GDPR). */
  source: "campaign" | "claim" | "tracking"
  /** Used to route the finding category: GDPR for tracking, EU_AI_ACT for the rest. */
  category: "EU_AI_ACT" | "GDPR"
}

export type CampaignGapEvaluation = {
  gaps: string[]
  findingCandidates: AIAdsFindingCandidate[]
}

// ────────────────────────────────────────────────────────────────────────────
//   Platform DPA requirement registry
//
//   Per mandate Rule 1 we link to existing VendorRecord; this set lists the
//   platforms that always require a vendor/DPA before a campaign goes live.
// ────────────────────────────────────────────────────────────────────────────

const PLATFORMS_REQUIRING_DPA: ReadonlySet<AIAdsCampaignPlatform> = new Set<
  AIAdsCampaignPlatform
>([
  "chatgpt_ads",
  "meta_ai_ads",
  "google_ai_ads",
  "perplexity_sponsored",
  "anthropic_claude",
  "ai_generated_creative_meta",
  "ai_generated_creative_google",
  "ai_generated_creative_linkedin",
])

const PLATFORM_LABELS: Record<AIAdsCampaignPlatform, string> = {
  chatgpt_ads: "ChatGPT Ads",
  meta_ai_ads: "Meta AI Ads",
  google_ai_ads: "Google AI Ads",
  perplexity_sponsored: "Perplexity sponsored",
  anthropic_claude: "Anthropic Claude Ads",
  llm_recommendation_native: "LLM recommendation (native/organic)",
  ai_generated_creative_meta: "Meta + AI creative",
  ai_generated_creative_google: "Google + AI creative",
  ai_generated_creative_linkedin: "LinkedIn + AI creative",
  other: "Other AI platform",
}

const CLAIM_TYPE_LABELS: Record<AIClaimType, string> = {
  performance_metric: "Performanță",
  price_promise: "Preț",
  guarantee: "Garanție",
  certification: "Certificare",
  comparative: "Comparativ",
  endorsement: "Recomandare/endorsement",
  compliance_claim: "Claim de conformitate",
  outcome_claim: "Rezultat promis",
  other: "Altul",
}

const EVIDENCE_LABELS: Record<AIClaimEvidenceStatus, string> = {
  unsubstantiated: "Nesubstanțiat",
  internal_data: "Date interne",
  third_party_audit: "Audit terț",
  public_record: "Înregistrare publică",
  vendor_attestation: "Declarație vendor",
  needs_review: "Necesită revizie",
  verified: "Verificat",
}

export function platformLabel(p: AIAdsCampaignPlatform): string {
  return PLATFORM_LABELS[p] ?? p
}

export function claimTypeLabel(c: AIClaimType): string {
  return CLAIM_TYPE_LABELS[c] ?? c
}

export function evidenceStatusLabel(e: AIClaimEvidenceStatus): string {
  return EVIDENCE_LABELS[e] ?? e
}

export function platformRequiresDPA(p: AIAdsCampaignPlatform): boolean {
  return PLATFORMS_REQUIRING_DPA.has(p)
}

// ────────────────────────────────────────────────────────────────────────────
//   evaluateClaimRisk — heuristic mapping claim → misleadingRisk
//
//   Rules:
//     - high-stakes claim types + unsubstantiated → "high"
//     - compliance_claim without verified evidence → "high"
//     - vendor_attestation without 3rd party → "medium"
//     - verified / 3rd party audit / public record → "low"
//
//   Critical reserved for explicit overrides (e.g. claim already flagged by
//   regulator). Heuristic never returns "critical" — that flag is set manually
//   by a reviewer.
// ────────────────────────────────────────────────────────────────────────────

const HIGH_STAKES_CLAIMS: ReadonlySet<AIClaimType> = new Set<AIClaimType>([
  "performance_metric",
  "price_promise",
  "guarantee",
  "outcome_claim",
  "comparative",
])

export function evaluateClaimRisk(
  claim: Pick<AIAdsClaim, "claimType" | "evidenceStatus">,
): AIClaimMisleadingRisk {
  const { claimType, evidenceStatus } = claim

  // Verified / third-party / public record → low.
  if (
    evidenceStatus === "verified" ||
    evidenceStatus === "third_party_audit" ||
    evidenceStatus === "public_record"
  ) {
    return "low"
  }

  // Compliance claim is special — even "internal_data" or "vendor_attestation"
  // is not enough; needs 3rd-party / public-record / verified.
  if (claimType === "compliance_claim") {
    return "high"
  }

  // High-stakes claims unsubstantiated → high.
  if (
    HIGH_STAKES_CLAIMS.has(claimType) &&
    (evidenceStatus === "unsubstantiated" || evidenceStatus === "needs_review")
  ) {
    return "high"
  }

  // Vendor attestation alone → medium (needs verification).
  if (evidenceStatus === "vendor_attestation") {
    return "medium"
  }

  // Internal data on a high-stakes claim → medium.
  if (HIGH_STAKES_CLAIMS.has(claimType) && evidenceStatus === "internal_data") {
    return "medium"
  }

  // Anything else (endorsement / certification / other with internal data) → medium.
  if (evidenceStatus === "internal_data") {
    return "medium"
  }

  // Endorsement / certification / other with unsubstantiated → medium.
  if (
    evidenceStatus === "unsubstantiated" ||
    evidenceStatus === "needs_review"
  ) {
    return "medium"
  }

  return "low"
}

export function buildClaimRiskReasons(
  claim: Pick<AIAdsClaim, "claimType" | "evidenceStatus">,
): string[] {
  const reasons: string[] = []
  if (claim.evidenceStatus === "unsubstantiated") {
    reasons.push(
      "Afirmația nu are sursă verificabilă atașată — risc Art. 5 Directiva 2005/29/EC + Law 363/2007 (practică comercială înșelătoare).",
    )
  }
  if (claim.claimType === "compliance_claim" && claim.evidenceStatus !== "verified") {
    reasons.push(
      "Claim de conformitate (ex. „GDPR compliant”) necesită verificare independentă — declarația vendor-ului nu este suficientă.",
    )
  }
  if (
    HIGH_STAKES_CLAIMS.has(claim.claimType) &&
    claim.evidenceStatus === "vendor_attestation"
  ) {
    reasons.push(
      "Afirmația despre performanță/preț/garanție bazată doar pe declarația vendor-ului — necesită verificare independentă (audit terț / înregistrare publică).",
    )
  }
  if (claim.claimType === "comparative" && claim.evidenceStatus !== "third_party_audit") {
    reasons.push(
      "Afirmație comparativă fără audit terț — Directiva 2006/114/CE comparative advertising cere comparare obiectivă verificabilă.",
    )
  }
  return reasons
}

// ────────────────────────────────────────────────────────────────────────────
//   evaluateTrackingGaps — GDPR / ePrivacy review of conversion tracking
// ────────────────────────────────────────────────────────────────────────────

export function evaluateTrackingGaps(review: ConversionTrackingReview): string[] {
  const gaps: string[] = []

  // CRM upload audience matching → must have GDPR-valid consent or legitimate interest.
  if (review.crmUploadUsed) {
    const consent = (review.consentRecordedHow ?? "").trim().toLowerCase()
    if (!consent || consent.length < 5) {
      gaps.push(
        "CRM upload (audience matching) folosit fără bază legală documentată — GDPR Art. 6 + Art. 9 dacă date sensibile.",
      )
    }
  }

  // Third-country transfer without mechanism → Art. 44-49 breach.
  if (
    review.thirdCountryTransfer &&
    (!review.transferMechanism || review.transferMechanism === "none")
  ) {
    gaps.push(
      "Transfer terță țară fără mecanism Art. 44-49 GDPR (SCC / adequacy / BCR / derogare).",
    )
  }

  // Pixels + cookies without consent → ePrivacy Art. 5(3) + GDPR Art. 6.
  const hasPixels =
    review.pixelList.filter((p) => p.trim().length > 0).length > 0 ||
    review.methods.some((m) =>
      m === "pixel_meta" || m === "pixel_google" || m === "pixel_linkedin",
    )
  if (hasPixels && !review.consentRequired) {
    gaps.push(
      "Pixel-uri publicitare deployate fără cerință de consent activ — ePrivacy Directive 2002/58/EC Art. 5(3) + GDPR Art. 6.",
    )
  }

  // Fingerprinting → strict GDPR + ePrivacy justification.
  if (review.methods.includes("fingerprinting")) {
    gaps.push(
      "Fingerprinting (device/browser) — necesită justificare strictă GDPR + ePrivacy + DPIA prealabil.",
    )
  }

  // Third-party cookies without consent flag.
  if (
    review.methods.includes("third_party_cookie") &&
    !review.consentRequired
  ) {
    gaps.push(
      "Third-party cookie fără consent — ePrivacy Art. 5(3) + GDPR Art. 6.",
    )
  }

  return gaps
}

// ────────────────────────────────────────────────────────────────────────────
//   evaluateCampaignGaps — main rule engine
//
//   Mandate § 18.1 + automation library § 3.8.1 findings:
//     1. Platform terms review lipsă → HIGH
//     2. Vendor/DPA lipsă pentru platforma care necesită DPA → HIGH
//     3. Conversion tracking GDPR review lipsă (campanie activă) → HIGH (GDPR)
//     4. Claim evidence lipsă pentru afirmații AI Ads → MEDIUM (active/in_review)
//     5. Ad transparency evidence lipsă (creative/landing fără asset link) → HIGH
//     6. Targeting categorii vulnerabile fără platform review → CRITICAL (Art. 5 + Law 363)
//     7. GEO/LLM source registry lipsă (platform = llm_recommendation_native) → MEDIUM
//     8. Creative approval trail incomplet (lipsă Art.5/consumerLaw check) → HIGH
// ────────────────────────────────────────────────────────────────────────────

export function evaluateCampaignGaps(
  campaign: AIAdsCampaign,
  claims: AIAdsClaim[],
  approvals: AIAdsCreativeApproval[],
  trackingReviews: ConversionTrackingReview[],
  vendors: VendorRecord[],
): CampaignGapEvaluation {
  const gaps: string[] = []
  const findingCandidates: AIAdsFindingCandidate[] = []
  const platformName = platformLabel(campaign.platform)
  const isLive =
    campaign.status === "active" ||
    campaign.status === "in_review" ||
    campaign.status === "approved"

  // 1. Platform terms review.
  if (!campaign.platformTermsReviewed) {
    gaps.push(
      `Platform terms review lipsește pentru ${platformName}.`,
    )
    findingCandidates.push({
      ruleKey: "platform-terms-review-missing",
      title: `Vendor/platform terms review lipsă — ${campaign.title}`,
      detail: `Campania „${campaign.title}” pe ${platformName} nu are platform terms review documentat. Termenii ad ai platformei impun obligații de transparency, prohibited content și raportare incidente care trebuie validate înainte de live.`,
      severity: "high",
      legalReference: "Directive 2005/29/EC + RO Law 363/2007 + termeni platformă",
      remediationHint:
        "Marchează `platformTermsReviewed=true` după ce echipa juridică a citit termenii ad ai platformei și a confirmat că nu există clauze conflictuale (ex.: prohibited content, content moderation, data sharing).",
      impactSummary:
        "Risc juridic HIGH: încălcarea termenilor platformei → suspendare cont + posibil litigiu. ANSPDCP poate solicita evidence trail (platforma este processor pentru tracking).",
      evidenceRequired:
        "Notiță legală + dată review + email reviewer + link la termenii ad efectivi.",
      source: "campaign",
      category: "EU_AI_ACT",
    })
  }

  // 2. Vendor / DPA dacă platforma necesită.
  if (PLATFORMS_REQUIRING_DPA.has(campaign.platform)) {
    const vendor = campaign.linkedVendorId
      ? vendors.find((v) => v.id === campaign.linkedVendorId)
      : undefined
    if (!vendor) {
      gaps.push(
        `Vendor/DPA lipsă pentru ${platformName} — leagă VendorRecord în /dashboard/vendor-review.`,
      )
      findingCandidates.push({
        ruleKey: "vendor-dpa-missing",
        title: `Vendor/DPA lipsă pentru ${platformName} — ${campaign.title}`,
        detail: `Platforma ${platformName} prelucrează date personale (impresii, click-uri, conversii) — campania „${campaign.title}” nu este legată la un VendorRecord cu DPA Art. 28 GDPR semnat. Cross-link la modulul Vendor AI Assessment (Sprint 010) este obligatoriu.`,
        severity: "high",
        legalReference: "GDPR Art. 28 (DPA processor) + Art. 44-49 (transfers)",
        remediationHint:
          "Creează vendor în /dashboard/vendor-review, semnează DPA cu platforma, apoi setează `linkedVendorId` pe campanie.",
        impactSummary:
          "Risc juridic HIGH: prelucrare date personale fără DPA Art. 28 → încălcare Art. 5(1)(a) + Art. 28 GDPR. Amendă Art. 83.",
        evidenceRequired:
          "DPA semnat cu platforma + URL DPA + scadență + linkat în VendorRecord.",
        source: "campaign",
        category: "EU_AI_ACT",
      })
    }
  }

  // 3. Conversion tracking review lipsă pentru campanie activă.
  if (isLive && !campaign.conversionTrackingReviewId) {
    gaps.push("Conversion tracking GDPR review lipsește.")
    findingCandidates.push({
      ruleKey: "conversion-tracking-review-missing",
      title: `Conversion tracking GDPR review lipsă — ${campaign.title}`,
      detail: `Campania „${campaign.title}” este activă/în review fără un review GDPR pentru conversion tracking. Pixel-urile, cookie-urile, audience matching și transferurile către vendor trebuie documentate înainte ca primele impresii să fie servite.`,
      severity: "high",
      legalReference: "GDPR Art. 5(1)(a)/13/14 + Art. 44-49 + ePrivacy Art. 5(3)",
      remediationHint:
        "Creează un ConversionTrackingReview din tab-ul „Tracking Reviews” și completează metode + consent + cookie list + pixel list + CRM + transferuri. Evaluator-ul va popula automat `gaps[]`.",
      impactSummary:
        "Risc juridic HIGH (GDPR + ePrivacy): pixel/cookie/CRM upload fără consent → amendă ANSPDCP până la 4% cifră de afaceri (Art. 83(5)).",
      evidenceRequired:
        "Screenshot CMP banner + lista pixel + cookie policy + dovadă consent UI + DPA transferuri.",
      source: "campaign",
      category: "GDPR",
    })
  }

  // 4. Claim evidence lipsă (lipsă claims pentru campanie activă/review).
  if (
    (campaign.status === "active" || campaign.status === "in_review") &&
    campaign.linkedClaimIds.length === 0
  ) {
    gaps.push("Niciun claim înregistrat — claim evidence lipsește.")
    findingCandidates.push({
      ruleKey: "claim-evidence-missing",
      title: `Claim evidence lipsă pentru afirmații AI Ads — ${campaign.title}`,
      detail: `Campania „${campaign.title}” nu are nicio afirmație înregistrată în Claims Registry. Conform Directive 2005/29/EC + Law 363/2007, fiecare afirmație despre brand (performanță, preț, garanție, certificare) trebuie să poată fi demonstrată cu o sursă verificabilă.`,
      severity: "medium",
      legalReference: "Directive 2005/29/EC Art. 5 + RO Law 363/2007 Art. 6",
      remediationHint:
        "Adaugă fiecare afirmație folosită în creative în tab-ul „Claims Registry” și atașează sursa (audit terț / înregistrare publică / date interne).",
      impactSummary:
        "Risc juridic MEDIUM: practică comercială înșelătoare = sancțiune ANPC + obligație rectificare publică.",
      evidenceRequired:
        "Lista exhaustivă de afirmații + sursa pentru fiecare (URL / document / referință).",
      source: "campaign",
      category: "EU_AI_ACT",
    })
  }

  // 5. Ad transparency evidence — creative AI / landing fără asset link.
  if (
    campaign.status === "active" &&
    (campaign.campaignType === "ai_generated_creative" ||
      campaign.campaignType === "ai_landing_page" ||
      campaign.campaignType === "hybrid" ||
      campaign.platform === "ai_generated_creative_meta" ||
      campaign.platform === "ai_generated_creative_google" ||
      campaign.platform === "ai_generated_creative_linkedin") &&
    campaign.linkedAssetIds.length === 0
  ) {
    gaps.push(
      "Ad transparency evidence lipsă — creative AI/landing fără legătură la Content Register.",
    )
    findingCandidates.push({
      ruleKey: "ad-transparency-evidence-missing",
      title: `Ad transparency evidence lipsă (link creative la Content Register) — ${campaign.title}`,
      detail: `Campania „${campaign.title}” folosește creative generat AI sau landing AI dar nu este legată la nicio piesă din Content Register (Sprint 023.7). Art. 50(4) EU AI Act cere etichetare deepfake/sintetic + provider marking machine-readable.`,
      severity: "high",
      legalReference: "Art. 50(2) + 50(4) EU AI Act + Recital 134",
      remediationHint:
        "Înregistrează fiecare creative AI ca AIContentLabeledAsset în /dashboard/transparency (Content Register) — marchează provider marking C2PA/IPTC + deployer disclosure, apoi adaugă ID-ul în `linkedAssetIds` pe campanie.",
      impactSummary:
        "Risc juridic HIGH: creative AI fără disclosure + machine-readable marking → amendă Art. 99 EU AI Act.",
      evidenceRequired:
        "Lista AIContentLabeledAsset ID-uri pentru fiecare creative + dovadă provider marking + disclosure vizibil.",
      source: "campaign",
      category: "EU_AI_ACT",
    })
  }

  // 6. Categorii vulnerabile fără platform review → CRITICAL.
  if (campaign.targetsVulnerableCategories && !campaign.platformTermsReviewed) {
    gaps.push(
      "Targeting categorii vulnerabile fără review platform + Art. 5 + Law 363/2007.",
    )
    findingCandidates.push({
      ruleKey: "vulnerable-targeting-no-review",
      title: `Risc Art. 5 AI Act + Law 363/2007 — categorii vulnerabile fără review — ${campaign.title}`,
      detail: `Campania „${campaign.title}” țintește categorii vulnerabile (minori, profiluri sensibile) dar nu are review legal aprobat. Art. 5(1)(b) EU AI Act interzice exploatarea vulnerabilităților categoriilor protejate; Law 363/2007 Art. 6 alin. 2 considere practici agresive.`,
      severity: "critical",
      legalReference:
        "Art. 5(1)(b) EU AI Act + RO Law 363/2007 Art. 6 + Directive 2005/29/EC Art. 9",
      remediationHint:
        "Sistează campania până când: (a) echipa juridică confirmă lipsa exploatării vulnerabilității; (b) platform terms review finalizat; (c) creative approval cu art5Check=true + consumerLawCheck=true.",
      impactSummary:
        "Risc juridic CRITIC: exploatarea categoriilor vulnerabile → amendă până la 35M EUR sau 7% cifră de afaceri (Art. 99 AI Act) + sancțiune ANPC.",
      evidenceRequired:
        "Aviz juridic în scris + platform terms review + creative approval cu cele 3 check-uri.",
      source: "campaign",
      category: "EU_AI_ACT",
    })
  }

  // 7. GEO/LLM native — fără claims substanțiate.
  if (campaign.platform === "llm_recommendation_native") {
    const linkedClaims = claims.filter((c) => c.campaignId === campaign.id)
    const substantiated = linkedClaims.filter(
      (c) => c.evidenceStatus !== "unsubstantiated" && c.evidenceStatus !== "needs_review",
    )
    if (substantiated.length === 0) {
      gaps.push(
        "GEO/LLM source registry lipsește — nicio afirmație substanțiată legată.",
      )
      findingCandidates.push({
        ruleKey: "geo-llm-source-registry-missing",
        title: `GEO/LLM source registry lipsă — ${campaign.title}`,
        detail: `Campania „${campaign.title}” depinde de mențiuni native LLM (organic LLM commerce) dar nu are nicio afirmație cu sursă verificabilă. Pentru ca brandul să fie recomandat corect, sursele de adevăr (site, presă, audit) trebuie documentate.`,
        severity: "medium",
        legalReference:
          "Directive 2005/29/EC Art. 5 + RO Law 363/2007 + EU AI Act Art. 50(1)",
        remediationHint:
          "Adaugă în Claims Registry afirmațiile pe care vrei să le promovezi prin LLM + sursa fiecăreia (audit / public record / date interne).",
        impactSummary:
          "Risc juridic MEDIUM: LLM-ul poate cita afirmații neverificate → expunere ANPC + responsabilitate civilă.",
        evidenceRequired:
          "Registru de afirmații + sursă publică verificabilă pentru fiecare.",
        source: "campaign",
        category: "EU_AI_ACT",
      })
    }
  }

  // 8. Creative approval trail incomplet.
  const campaignApprovals = approvals.filter((a) => a.campaignId === campaign.id)
  if (campaignApprovals.length === 0 && campaign.status === "active") {
    gaps.push("Creative approval log gol — nicio aprobare înregistrată.")
    findingCandidates.push({
      ruleKey: "creative-approval-missing",
      title: `Creative approval trail lipsă — ${campaign.title}`,
      detail: `Campania „${campaign.title}” este activă dar Creative Approval Log este gol. Fiecare creative AI distribuit public trebuie să aibă semnătura unui aprobator uman cu 3 gate-uri confirmate (Art. 5 AI Act / Law 363/2007 / IP rights).`,
      severity: "high",
      legalReference:
        "Art. 5 + Art. 50 EU AI Act + Directive 2005/29/EC + RO Law 363/2007",
      remediationHint:
        "Înregistrează în tab-ul „Creative Approvals” fiecare aprobare cu email aprobator + cele 3 check-uri + comentariu.",
      impactSummary:
        "Risc juridic HIGH: lipsa trail-ului uman expune org-ul la răspundere directă pentru orice claim emis de AI.",
      evidenceRequired:
        "Per creative: email aprobator + checklist 3 puncte + comentariu + data.",
      source: "campaign",
      category: "EU_AI_ACT",
    })
  }

  // 8b. Approvals incomplete (missing Art.5/consumerLaw/IP check).
  for (const a of campaignApprovals) {
    const incomplete =
      !a.art5Check || !a.consumerLawCheck || !a.ipRightsCheck
    if (incomplete) {
      const missing: string[] = []
      if (!a.art5Check) missing.push("Art. 5 AI Act")
      if (!a.consumerLawCheck) missing.push("Law 363/2007")
      if (!a.ipRightsCheck) missing.push("IP rights")
      findingCandidates.push({
        ruleKey: `creative-approval-incomplete-${a.id}`,
        title: `Creative approval incomplet (${missing.join(" + ")}) — ${campaign.title}`,
        detail: `Aprobarea ${a.id} pentru campania „${campaign.title}” are gate-uri lipsă: ${missing.join(", ")}. Aprobarea nu poate fi considerată completă fără toate cele 3 check-uri.`,
        severity: "high",
        legalReference:
          "Art. 5 + Art. 50 EU AI Act + Directive 2005/29/EC + RO Law 363/2007",
        remediationHint:
          "Re-deschide aprobarea, confirmă toate cele 3 gate-uri sau respinge creative-ul.",
        impactSummary:
          "Risc juridic HIGH: aprobare incompletă = aprobare neîncheiată legal.",
        evidenceRequired:
          "Aprobare cu art5Check=true + consumerLawCheck=true + ipRightsCheck=true.",
        source: "campaign",
        category: "EU_AI_ACT",
      })
    }
  }

  return { gaps, findingCandidates }
}

// ────────────────────────────────────────────────────────────────────────────
//   evaluateClaimFindings — emit HIGH finding when misleadingRisk ≥ high.
// ────────────────────────────────────────────────────────────────────────────

export function evaluateClaimFindings(
  claim: AIAdsClaim,
): AIAdsFindingCandidate[] {
  const out: AIAdsFindingCandidate[] = []
  if (claim.misleadingRisk === "high" || claim.misleadingRisk === "critical") {
    out.push({
      ruleKey: "claim-misleading-risk",
      title: `Potential misleading AI claim needs review — „${claim.claimText.slice(0, 80)}…”`,
      detail: `Afirmația „${claim.claimText}” are risc ${claim.misleadingRisk} de a fi considerată practică comercială înșelătoare. Motive: ${claim.riskReasons.join(" | ") || "evaluator heuristic"}. Tip claim: ${claimTypeLabel(claim.claimType)}. Status dovadă: ${evidenceStatusLabel(claim.evidenceStatus)}.`,
      severity: claim.misleadingRisk === "critical" ? "critical" : "high",
      legalReference:
        "Directive 2005/29/EC Art. 5 + RO Law 363/2007 Art. 6 + Directive 2006/114/CE (comparative)",
      remediationHint:
        "Atașează sursă verificabilă (audit terț / înregistrare publică / verificare independentă) sau retrage afirmația până la substanțiere.",
      impactSummary:
        "Risc juridic HIGH: ANPC poate impune amendă + rectificare publică + restituire prejudicii.",
      evidenceRequired:
        "URL audit terț / înregistrare publică SAU email retragere a afirmației.",
      source: "claim",
      category: "EU_AI_ACT",
    })
  }
  return out
}

// ────────────────────────────────────────────────────────────────────────────
//   generateAIAdsMarkdown — full per-campaign markdown pack for Audit Pack.
// ────────────────────────────────────────────────────────────────────────────

function fmtDate(iso?: string): string {
  if (!iso) return "—"
  try {
    return new Date(iso).toISOString().slice(0, 10)
  } catch {
    return iso
  }
}

function escapeMd(value: string | undefined | null): string {
  if (!value) return "—"
  return value.replace(/\|/g, "\\|").replace(/\n/g, " ")
}

export function generateAIAdsMarkdown(
  campaign: AIAdsCampaign,
  claims: AIAdsClaim[],
  approvals: AIAdsCreativeApproval[],
  trackingReview: ConversionTrackingReview | null,
): string {
  const platformName = platformLabel(campaign.platform)
  const lines: string[] = []

  lines.push(`# Campanie AI Ads — ${campaign.title}`)
  lines.push(``)
  lines.push(`> AI Ads Compliance Pack: ce afirmă AI-ul despre brand, pe ce sursă, cine a aprobat, ce date au fost folosite și ce risc legal există.`)
  lines.push(``)
  lines.push(`**ID:** ${campaign.id}`)
  lines.push(`**Brand:** ${escapeMd(campaign.brandName)}`)
  lines.push(`**Platformă:** ${platformName}`)
  lines.push(`**Tip campanie:** ${campaign.campaignType}`)
  lines.push(`**Status:** ${campaign.status}`)
  lines.push(`**Perioadă:** ${fmtDate(campaign.startDateISO)} → ${fmtDate(campaign.endDateISO)}`)
  if (campaign.budgetEUR !== undefined) {
    lines.push(`**Buget:** ${campaign.budgetEUR} EUR`)
  }
  lines.push(`**Țintește categorii vulnerabile:** ${campaign.targetsVulnerableCategories ? "DA" : "NU"}`)
  lines.push(`**Platform terms review:** ${campaign.platformTermsReviewed ? `DA (${campaign.platformTermsReviewedByEmail ?? "?"} · ${fmtDate(campaign.platformTermsReviewedAtISO)})` : "NU"}`)
  lines.push(``)
  lines.push(`## A. Cross-module links (Rule 1 — no duplicate registers)`)
  lines.push(``)
  lines.push(`- **Vendor (Sprint 010):** ${campaign.linkedVendorId ?? "—"}`)
  lines.push(`- **Content Assets (Sprint 023.7):** ${campaign.linkedAssetIds.length > 0 ? campaign.linkedAssetIds.join(", ") : "—"}`)
  lines.push(`- **Claims:** ${campaign.linkedClaimIds.length > 0 ? campaign.linkedClaimIds.join(", ") : "—"}`)
  lines.push(`- **Creative approvals:** ${campaign.approvalIds.length > 0 ? campaign.approvalIds.join(", ") : "—"}`)
  lines.push(`- **Conversion tracking review:** ${campaign.conversionTrackingReviewId ?? "—"}`)
  lines.push(``)
  lines.push(`## B. Claims registry`)
  lines.push(``)
  if (claims.length === 0) {
    lines.push(`_Nu există claims înregistrate._`)
  } else {
    lines.push(`| Claim | Tip | Status dovadă | Risc | Aprobat |`)
    lines.push(`|---|---|---|---|---|`)
    for (const c of claims) {
      lines.push(
        `| ${escapeMd(c.claimText)} | ${claimTypeLabel(c.claimType)} | ${evidenceStatusLabel(c.evidenceStatus)} | ${c.misleadingRisk} | ${c.approvedByEmail ?? "—"} |`,
      )
    }
  }
  lines.push(``)
  lines.push(`## C. Creative approval log`)
  lines.push(``)
  if (approvals.length === 0) {
    lines.push(`_Nu există aprobări._`)
  } else {
    lines.push(`| Creative | Aprobator | Data | Art. 5 | Law 363 | IP |`)
    lines.push(`|---|---|---|---|---|---|`)
    for (const a of approvals) {
      lines.push(
        `| ${escapeMd(a.creativeDescription)} | ${a.approvedByEmail} | ${fmtDate(a.approvedAtISO)} | ${a.art5Check ? "DA" : "NU"} | ${a.consumerLawCheck ? "DA" : "NU"} | ${a.ipRightsCheck ? "DA" : "NU"} |`,
      )
    }
  }
  lines.push(``)
  lines.push(`## D. Conversion tracking review (GDPR + ePrivacy)`)
  lines.push(``)
  if (!trackingReview) {
    lines.push(`_Nu există review de conversion tracking._`)
  } else {
    lines.push(`- **Metode:** ${trackingReview.methods.join(", ") || "—"}`)
    lines.push(`- **Consent necesar:** ${trackingReview.consentRequired ? "DA" : "NU"}`)
    lines.push(`- **Cum se înregistrează consent:** ${escapeMd(trackingReview.consentRecordedHow)}`)
    lines.push(`- **Cookies:** ${trackingReview.cookieList.join(", ") || "—"}`)
    lines.push(`- **Pixel-uri:** ${trackingReview.pixelList.join(", ") || "—"}`)
    lines.push(`- **CRM upload:** ${trackingReview.crmUploadUsed ? `DA (${trackingReview.crmDataCategoriesUploaded.join(", ") || "?"})` : "NU"}`)
    lines.push(`- **Transfer terță țară:** ${trackingReview.thirdCountryTransfer ? `DA (${trackingReview.transferMechanism ?? "—"})` : "NU"}`)
    if (trackingReview.gaps.length > 0) {
      lines.push(``)
      lines.push(`**Gap-uri detectate:**`)
      for (const g of trackingReview.gaps) {
        lines.push(`- ${g}`)
      }
    }
  }
  lines.push(``)
  lines.push(`## E. Legal anchors`)
  lines.push(``)
  lines.push(`- Directive 2005/29/EC — unfair commercial practices`)
  lines.push(`- RO Law 363/2007 — practici comerciale neloiale`)
  lines.push(`- GDPR Art. 5(1)(a) / 13 / 14 / 28 / 44-49`)
  lines.push(`- ePrivacy Directive 2002/58/EC Art. 5(3)`)
  lines.push(`- Art. 5 + Art. 50(4) EU AI Act`)
  lines.push(`- Directive 2006/114/CE — comparative advertising`)
  lines.push(``)
  if (campaign.notes) {
    lines.push(`## F. Note`)
    lines.push(``)
    lines.push(campaign.notes)
    lines.push(``)
  }

  return lines.join("\n") + "\n"
}
