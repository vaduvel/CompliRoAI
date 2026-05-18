/**
 * Sprint 024 — AI Ads / LLM Commerce Compliance Pack engine tests.
 *
 * Acoperă cele 4 funcții pure:
 *   - evaluateCampaignGaps
 *   - evaluateClaimRisk + buildClaimRiskReasons + evaluateClaimFindings
 *   - evaluateTrackingGaps
 *   - generateAIAdsMarkdown
 *
 * Legal anchors verificate în output:
 *   - Directive 2005/29/EC Art. 5
 *   - RO Law 363/2007
 *   - GDPR Art. 5/13/14/28/44-49
 *   - ePrivacy Directive 2002/58/EC Art. 5(3)
 *   - Art. 5 + Art. 50 EU AI Act
 */

import { describe, expect, it } from "vitest"
import {
  buildClaimRiskReasons,
  evaluateCampaignGaps,
  evaluateClaimFindings,
  evaluateClaimRisk,
  evaluateTrackingGaps,
  generateAIAdsMarkdown,
  platformLabel,
  platformRequiresDPA,
} from "@/lib/compliance/ai-ads-engine"
import type {
  AIAdsCampaign,
  AIAdsClaim,
  AIAdsCreativeApproval,
  AIClaimType,
  ConversionTrackingReview,
  VendorRecord,
} from "@/lib/compliance/types"

// ────────────────────────────────────────────────────────────────────────────
//   Fixtures
// ────────────────────────────────────────────────────────────────────────────

function makeCampaign(
  o: Partial<AIAdsCampaign> = {},
): AIAdsCampaign {
  return {
    id: o.id ?? "camp-1",
    orgId: o.orgId ?? "org-test",
    title: o.title ?? "Campanie test",
    brandName: o.brandName ?? "Brand X",
    platform: o.platform ?? "meta_ai_ads",
    campaignType: o.campaignType ?? "paid_placement",
    linkedAssetIds: o.linkedAssetIds ?? [],
    linkedClaimIds: o.linkedClaimIds ?? [],
    status: o.status ?? "active",
    targetsVulnerableCategories: o.targetsVulnerableCategories ?? false,
    platformTermsReviewed: o.platformTermsReviewed ?? false,
    approvalIds: o.approvalIds ?? [],
    linkedFindingIds: o.linkedFindingIds ?? [],
    createdByEmail: o.createdByEmail ?? "tester@example.com",
    createdAtISO: o.createdAtISO ?? "2026-05-18T10:00:00.000Z",
    updatedAtISO: o.updatedAtISO ?? "2026-05-18T10:00:00.000Z",
    ...o,
  }
}

function makeClaim(o: Partial<AIAdsClaim> = {}): AIAdsClaim {
  return {
    id: o.id ?? "claim-1",
    orgId: o.orgId ?? "org-test",
    claimType: o.claimType ?? "performance_metric",
    claimText: o.claimText ?? "Cel mai rapid soft din piață",
    contextDescription: o.contextDescription ?? "Landing page hero",
    evidenceStatus: o.evidenceStatus ?? "unsubstantiated",
    misleadingRisk: o.misleadingRisk ?? "low",
    riskReasons: o.riskReasons ?? [],
    linkedFindingIds: o.linkedFindingIds ?? [],
    createdByEmail: o.createdByEmail ?? "tester@example.com",
    createdAtISO: o.createdAtISO ?? "2026-05-18T10:00:00.000Z",
    updatedAtISO: o.updatedAtISO ?? "2026-05-18T10:00:00.000Z",
    ...o,
  }
}

function makeApproval(
  o: Partial<AIAdsCreativeApproval> = {},
): AIAdsCreativeApproval {
  return {
    id: o.id ?? "appr-1",
    campaignId: o.campaignId ?? "camp-1",
    creativeDescription: o.creativeDescription ?? "Banner Meta AI 1200x630",
    approvedByEmail: o.approvedByEmail ?? "ceo@example.com",
    approvedAtISO: o.approvedAtISO ?? "2026-05-18T11:00:00.000Z",
    prohibitedContentChecked: o.prohibitedContentChecked ?? true,
    art5Check: o.art5Check ?? true,
    consumerLawCheck: o.consumerLawCheck ?? true,
    ipRightsCheck: o.ipRightsCheck ?? true,
    ...o,
  }
}

function makeVendor(id: string = "vnd-1"): VendorRecord {
  return {
    id,
    orgId: "org-test",
    name: "Meta",
    productUsed: "Meta Ads",
    vendorRegion: "US",
    role: "processor",
    serviceCategory: "Advertising",
    linkedAISystemIds: [],
    linkedAIDataMapIds: [],
    dpaStatus: "signed",
    transferRequired: true,
    transferMechanism: "scc_controller_processor",
    subprocessorsList: [],
    securityEvidence: {
      iso27001: true,
      soc2: true,
      penTestRecent: true,
      encryptionInTransit: true,
      encryptionAtRest: true,
      mfaEnforced: true,
      auditLogsAvailable: true,
    },
    aiTerms: {
      trainingDataOptOut: "yes",
      inputDataRetention: "no_retention",
      outputRightsOwnership: "client",
      modelTransparency: "documented",
      reproducibilityGuarantees: false,
    },
    riskLevel: "medium",
    riskReasons: [],
    reviewStatus: "approved",
    humanReviewRequired: false,
    linkedFindingIds: [],
    createdAtISO: "2026-05-18T10:00:00.000Z",
    updatedAtISO: "2026-05-18T10:00:00.000Z",
  }
}

function makeTracking(
  o: Partial<ConversionTrackingReview> = {},
): ConversionTrackingReview {
  return {
    id: o.id ?? "trk-1",
    orgId: o.orgId ?? "org-test",
    methods: o.methods ?? ["pixel_meta"],
    consentRequired: o.consentRequired ?? true,
    consentRecordedHow: o.consentRecordedHow ?? "Cookiebot granular",
    cookieList: o.cookieList ?? ["_fbp"],
    pixelList: o.pixelList ?? ["fbq"],
    crmUploadUsed: o.crmUploadUsed ?? false,
    crmDataCategoriesUploaded: o.crmDataCategoriesUploaded ?? [],
    thirdCountryTransfer: o.thirdCountryTransfer ?? false,
    gaps: o.gaps ?? [],
    linkedFindingIds: o.linkedFindingIds ?? [],
    createdAtISO: o.createdAtISO ?? "2026-05-18T10:00:00.000Z",
    updatedAtISO: o.updatedAtISO ?? "2026-05-18T10:00:00.000Z",
    ...o,
  }
}

// ────────────────────────────────────────────────────────────────────────────
//   evaluateClaimRisk + buildClaimRiskReasons
// ────────────────────────────────────────────────────────────────────────────

describe("evaluateClaimRisk", () => {
  it("compliance_claim unsubstantiated → high", () => {
    expect(
      evaluateClaimRisk({
        claimType: "compliance_claim",
        evidenceStatus: "unsubstantiated",
      }),
    ).toBe("high")
  })

  it("compliance_claim cu vendor_attestation → high (nu e suficient)", () => {
    expect(
      evaluateClaimRisk({
        claimType: "compliance_claim",
        evidenceStatus: "vendor_attestation",
      }),
    ).toBe("high")
  })

  it("compliance_claim verified → low", () => {
    expect(
      evaluateClaimRisk({
        claimType: "compliance_claim",
        evidenceStatus: "verified",
      }),
    ).toBe("low")
  })

  it("performance_metric unsubstantiated → high", () => {
    expect(
      evaluateClaimRisk({
        claimType: "performance_metric",
        evidenceStatus: "unsubstantiated",
      }),
    ).toBe("high")
  })

  it("performance_metric third_party_audit → low", () => {
    expect(
      evaluateClaimRisk({
        claimType: "performance_metric",
        evidenceStatus: "third_party_audit",
      }),
    ).toBe("low")
  })

  it("guarantee unsubstantiated → high", () => {
    expect(
      evaluateClaimRisk({
        claimType: "guarantee",
        evidenceStatus: "needs_review",
      }),
    ).toBe("high")
  })

  it("performance_metric vendor_attestation → medium (necesită verificare)", () => {
    expect(
      evaluateClaimRisk({
        claimType: "performance_metric",
        evidenceStatus: "vendor_attestation",
      }),
    ).toBe("medium")
  })

  it("endorsement internal_data → medium", () => {
    expect(
      evaluateClaimRisk({
        claimType: "endorsement",
        evidenceStatus: "internal_data",
      }),
    ).toBe("medium")
  })

  it("certification public_record → low", () => {
    expect(
      evaluateClaimRisk({
        claimType: "certification",
        evidenceStatus: "public_record",
      }),
    ).toBe("low")
  })

  it("comparative cu third_party_audit → low (audit terț pentru claim comparativ)", () => {
    expect(
      evaluateClaimRisk({
        claimType: "comparative",
        evidenceStatus: "third_party_audit",
      }),
    ).toBe("low")
  })
})

describe("buildClaimRiskReasons", () => {
  it("unsubstantiated → menționează Directive 2005/29/EC + Law 363/2007", () => {
    const reasons = buildClaimRiskReasons({
      claimType: "performance_metric",
      evidenceStatus: "unsubstantiated",
    })
    expect(reasons.join(" ")).toMatch(/2005\/29\/EC/)
    expect(reasons.join(" ")).toMatch(/363\/2007/)
  })

  it("compliance_claim cu vendor attestation → cere verificare independentă", () => {
    const reasons = buildClaimRiskReasons({
      claimType: "compliance_claim",
      evidenceStatus: "vendor_attestation",
    })
    expect(reasons.join(" ")).toMatch(/verificare independentă/i)
  })

  it("comparative fără third_party_audit → invocă Directive 2006/114/CE", () => {
    const reasons = buildClaimRiskReasons({
      claimType: "comparative",
      evidenceStatus: "internal_data",
    })
    expect(reasons.join(" ")).toMatch(/2006\/114\/CE/)
  })
})

describe("evaluateClaimFindings", () => {
  it("emite finding HIGH pentru claim cu misleadingRisk=high", () => {
    const findings = evaluateClaimFindings(
      makeClaim({
        claimType: "performance_metric",
        evidenceStatus: "unsubstantiated",
        misleadingRisk: "high",
        riskReasons: ["nesubstanțiat"],
      }),
    )
    expect(findings).toHaveLength(1)
    expect(findings[0].severity).toBe("high")
    expect(findings[0].title).toMatch(/misleading AI claim/i)
    expect(findings[0].legalReference).toMatch(/2005\/29\/EC/)
  })

  it("nu emite finding pentru claim cu misleadingRisk=medium", () => {
    const findings = evaluateClaimFindings(
      makeClaim({ misleadingRisk: "medium" }),
    )
    expect(findings).toHaveLength(0)
  })

  it("emite finding CRITICAL pentru misleadingRisk=critical", () => {
    const findings = evaluateClaimFindings(
      makeClaim({ misleadingRisk: "critical" }),
    )
    expect(findings).toHaveLength(1)
    expect(findings[0].severity).toBe("critical")
  })
})

// ────────────────────────────────────────────────────────────────────────────
//   evaluateTrackingGaps
// ────────────────────────────────────────────────────────────────────────────

describe("evaluateTrackingGaps", () => {
  it("crmUploadUsed fără consentRecordedHow → emite gap GDPR Art. 6", () => {
    const gaps = evaluateTrackingGaps(
      makeTracking({
        crmUploadUsed: true,
        consentRecordedHow: "",
      }),
    )
    expect(gaps.join(" ")).toMatch(/CRM upload/i)
    expect(gaps.join(" ")).toMatch(/Art\. 6/)
  })

  it("thirdCountryTransfer fără mechanism → invocă Art. 44-49", () => {
    const gaps = evaluateTrackingGaps(
      makeTracking({
        thirdCountryTransfer: true,
        transferMechanism: "none",
      }),
    )
    expect(gaps.join(" ")).toMatch(/44-49/)
  })

  it("pixel-uri fără consent → ePrivacy Art. 5(3)", () => {
    const gaps = evaluateTrackingGaps(
      makeTracking({
        consentRequired: false,
        pixelList: ["fbq", "gtag"],
      }),
    )
    expect(gaps.join(" ")).toMatch(/ePrivacy/i)
  })

  it("fingerprinting → necesită justificare strictă", () => {
    const gaps = evaluateTrackingGaps(
      makeTracking({
        methods: ["fingerprinting"],
        consentRequired: true,
      }),
    )
    expect(gaps.join(" ")).toMatch(/Fingerprinting/i)
  })

  it("third_party_cookie fără consent → gap ePrivacy", () => {
    const gaps = evaluateTrackingGaps(
      makeTracking({
        methods: ["third_party_cookie"],
        consentRequired: false,
        pixelList: [],
      }),
    )
    expect(gaps.length).toBeGreaterThan(0)
    expect(gaps.join(" ")).toMatch(/Third-party cookie/i)
  })

  it("setup curat (consent + SCC) → 0 gaps", () => {
    const gaps = evaluateTrackingGaps(
      makeTracking({
        methods: ["pixel_meta"],
        consentRequired: true,
        consentRecordedHow: "Cookiebot granular",
        crmUploadUsed: true,
        thirdCountryTransfer: true,
        transferMechanism: "scc",
      }),
    )
    expect(gaps).toHaveLength(0)
  })
})

// ────────────────────────────────────────────────────────────────────────────
//   evaluateCampaignGaps
// ────────────────────────────────────────────────────────────────────────────

describe("evaluateCampaignGaps", () => {
  it("Campanie fără platform terms review → finding HIGH", () => {
    const result = evaluateCampaignGaps(
      makeCampaign({ platformTermsReviewed: false }),
      [],
      [],
      [],
      [],
    )
    const finding = result.findingCandidates.find(
      (f) => f.ruleKey === "platform-terms-review-missing",
    )
    expect(finding).toBeDefined()
    expect(finding?.severity).toBe("high")
    expect(finding?.legalReference).toMatch(/2005\/29\/EC/)
  })

  it("Campanie pe platformă DPA-requiring fără vendor → finding HIGH", () => {
    const result = evaluateCampaignGaps(
      makeCampaign({ platform: "meta_ai_ads", linkedVendorId: undefined }),
      [],
      [],
      [],
      [],
    )
    const finding = result.findingCandidates.find(
      (f) => f.ruleKey === "vendor-dpa-missing",
    )
    expect(finding).toBeDefined()
    expect(finding?.legalReference).toMatch(/Art\. 28/)
  })

  it("Campanie cu vendor existent → nu emite vendor-dpa-missing", () => {
    const result = evaluateCampaignGaps(
      makeCampaign({ linkedVendorId: "vnd-1", platformTermsReviewed: true }),
      [],
      [],
      [],
      [makeVendor()],
    )
    expect(
      result.findingCandidates.find(
        (f) => f.ruleKey === "vendor-dpa-missing",
      ),
    ).toBeUndefined()
  })

  it("Campanie activă fără tracking review → finding HIGH GDPR", () => {
    const result = evaluateCampaignGaps(
      makeCampaign({
        status: "active",
        platformTermsReviewed: true,
        linkedVendorId: undefined,
        platform: "other",
        conversionTrackingReviewId: undefined,
        linkedClaimIds: ["claim-1"],
      }),
      [],
      [],
      [],
      [],
    )
    const finding = result.findingCandidates.find(
      (f) => f.ruleKey === "conversion-tracking-review-missing",
    )
    expect(finding).toBeDefined()
    expect(finding?.category).toBe("GDPR")
  })

  it("Campanie activă cu linkedClaimIds=[] → emite claim-evidence-missing", () => {
    const result = evaluateCampaignGaps(
      makeCampaign({
        status: "active",
        platformTermsReviewed: true,
        platform: "other",
        conversionTrackingReviewId: "trk-1",
        linkedClaimIds: [],
        approvalIds: ["appr-1"],
      }),
      [],
      [makeApproval()],
      [],
      [],
    )
    const finding = result.findingCandidates.find(
      (f) => f.ruleKey === "claim-evidence-missing",
    )
    expect(finding).toBeDefined()
    expect(finding?.title).toMatch(/Claim evidence lipsă/i)
  })

  it("Campanie cu targetsVulnerableCategories + !platformTermsReviewed → CRITICAL", () => {
    const result = evaluateCampaignGaps(
      makeCampaign({
        targetsVulnerableCategories: true,
        platformTermsReviewed: false,
      }),
      [],
      [],
      [],
      [],
    )
    const finding = result.findingCandidates.find(
      (f) => f.ruleKey === "vulnerable-targeting-no-review",
    )
    expect(finding).toBeDefined()
    expect(finding?.severity).toBe("critical")
    expect(finding?.legalReference).toMatch(/Art\. 5\(1\)\(b\)/)
  })

  it("llm_recommendation_native fără claim substanțiat → finding MEDIUM", () => {
    const result = evaluateCampaignGaps(
      makeCampaign({
        platform: "llm_recommendation_native",
        platformTermsReviewed: true,
        conversionTrackingReviewId: "trk-1",
        approvalIds: ["appr-1"],
        linkedClaimIds: ["claim-1"],
      }),
      [
        makeClaim({
          id: "claim-1",
          campaignId: "camp-1",
          evidenceStatus: "unsubstantiated",
        }),
      ],
      [makeApproval()],
      [],
      [],
    )
    const finding = result.findingCandidates.find(
      (f) => f.ruleKey === "geo-llm-source-registry-missing",
    )
    expect(finding).toBeDefined()
    expect(finding?.severity).toBe("medium")
  })

  it("Campanie activă fără approvals → creative-approval-missing HIGH", () => {
    const result = evaluateCampaignGaps(
      makeCampaign({
        status: "active",
        platformTermsReviewed: true,
        conversionTrackingReviewId: "trk-1",
        linkedClaimIds: ["claim-1"],
        approvalIds: [],
        platform: "other",
      }),
      [],
      [],
      [],
      [],
    )
    const finding = result.findingCandidates.find(
      (f) => f.ruleKey === "creative-approval-missing",
    )
    expect(finding).toBeDefined()
    expect(finding?.severity).toBe("high")
  })

  it("Aprobare fără art5Check + consumerLawCheck → finding HIGH per aprobare", () => {
    const incompleteApproval = makeApproval({
      id: "appr-2",
      art5Check: false,
      consumerLawCheck: false,
    })
    const result = evaluateCampaignGaps(
      makeCampaign({
        status: "active",
        platformTermsReviewed: true,
        conversionTrackingReviewId: "trk-1",
        linkedClaimIds: ["claim-1"],
        approvalIds: ["appr-2"],
        platform: "other",
      }),
      [],
      [incompleteApproval],
      [],
      [],
    )
    const finding = result.findingCandidates.find((f) =>
      f.ruleKey.startsWith("creative-approval-incomplete-"),
    )
    expect(finding).toBeDefined()
    expect(finding?.severity).toBe("high")
    expect(finding?.title).toMatch(/Art\. 5 AI Act \+ Law 363\/2007/)
  })

  it("ai_generated_creative fără linkedAssetIds → ad-transparency-evidence-missing HIGH", () => {
    const result = evaluateCampaignGaps(
      makeCampaign({
        status: "active",
        platformTermsReviewed: true,
        conversionTrackingReviewId: "trk-1",
        linkedClaimIds: ["claim-1"],
        approvalIds: ["appr-1"],
        platform: "ai_generated_creative_meta",
        campaignType: "ai_generated_creative",
        linkedAssetIds: [],
      }),
      [],
      [makeApproval()],
      [],
      [],
    )
    const finding = result.findingCandidates.find(
      (f) => f.ruleKey === "ad-transparency-evidence-missing",
    )
    expect(finding).toBeDefined()
    expect(finding?.severity).toBe("high")
    expect(finding?.legalReference).toMatch(/50\(4\)/)
  })

  it("Campanie complet conformă → 0 finding candidates", () => {
    const result = evaluateCampaignGaps(
      makeCampaign({
        status: "active",
        platformTermsReviewed: true,
        linkedVendorId: "vnd-1",
        conversionTrackingReviewId: "trk-1",
        linkedClaimIds: ["claim-1"],
        approvalIds: ["appr-1"],
        platform: "meta_ai_ads",
        campaignType: "paid_placement",
      }),
      [makeClaim({ id: "claim-1", campaignId: "camp-1" })],
      [makeApproval({ id: "appr-1" })],
      [],
      [makeVendor()],
    )
    expect(result.findingCandidates).toHaveLength(0)
  })
})

// ────────────────────────────────────────────────────────────────────────────
//   generateAIAdsMarkdown
// ────────────────────────────────────────────────────────────────────────────

describe("generateAIAdsMarkdown", () => {
  it("output conține toate secțiunile A-E + positioning copy", () => {
    const md = generateAIAdsMarkdown(
      makeCampaign({
        title: "Campanie Demo",
        platform: "meta_ai_ads",
        linkedClaimIds: ["claim-1"],
        linkedAssetIds: ["cnt-1"],
      }),
      [makeClaim({ id: "claim-1", misleadingRisk: "low" })],
      [makeApproval()],
      makeTracking(),
    )
    expect(md).toMatch(/# Campanie AI Ads — Campanie Demo/)
    expect(md).toMatch(
      /AI Ads Compliance Pack: ce afirmă AI-ul despre brand, pe ce sursă, cine a aprobat/,
    )
    expect(md).toMatch(/## A\. Cross-module links/)
    expect(md).toMatch(/## B\. Claims registry/)
    expect(md).toMatch(/## C\. Creative approval log/)
    expect(md).toMatch(/## D\. Conversion tracking review/)
    expect(md).toMatch(/## E\. Legal anchors/)
    expect(md).toMatch(/Directive 2005\/29\/EC/)
    expect(md).toMatch(/Art\. 50\(4\) EU AI Act/)
  })

  it("output gestionează state-ul gol corect", () => {
    const md = generateAIAdsMarkdown(
      makeCampaign({ title: "Empty" }),
      [],
      [],
      null,
    )
    expect(md).toMatch(/Nu există claims înregistrate/)
    expect(md).toMatch(/Nu există aprobări/)
    expect(md).toMatch(/Nu există review de conversion tracking/)
  })
})

// ────────────────────────────────────────────────────────────────────────────
//   Helpers
// ────────────────────────────────────────────────────────────────────────────

describe("platform helpers", () => {
  it("platformLabel returnează label uman", () => {
    expect(platformLabel("meta_ai_ads")).toBe("Meta AI Ads")
    expect(platformLabel("llm_recommendation_native")).toMatch(/LLM/i)
  })

  it("platformRequiresDPA întoarce true pentru AI platforms", () => {
    expect(platformRequiresDPA("meta_ai_ads")).toBe(true)
    expect(platformRequiresDPA("chatgpt_ads")).toBe(true)
    expect(platformRequiresDPA("llm_recommendation_native")).toBe(false)
    expect(platformRequiresDPA("other")).toBe(false)
  })
})
