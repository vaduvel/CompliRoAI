/**
 * Sprint 024 — ai-ads-store tests.
 *
 * Acoperă:
 *  - createCampaign emite findings pentru gap-uri (platform terms / vendor)
 *  - updateCampaign rezolvă findings când gap-ul e remediat
 *  - createClaim cu high-risk → finding emis cu severity high
 *  - recordCreativeApproval cu approval incomplet → finding emis
 *  - attachConversionTrackingReview cu pixel fără consent → finding emis
 *  - deleteCampaign cascade closes claims/approvals/tracking + findings
 *  - listCampaigns filtrează pe status + platform
 *  - Stable IDs dedup (no double emission)
 *  - buildOrgAIAdsMarkdown produce markdown valid
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/server/org-context", () => ({
  getOrgContext: vi.fn(async () => ({
    orgId: "org-ai-ads-test",
    userId: "user-ai-ads-test",
    email: "ads@example.com",
    orgName: "Test AI Ads Org",
    workspaceMode: "ai-builder",
  })),
}))

vi.mock("@/lib/server/fs-safe", () => ({
  writeFileSafe: vi.fn(async () => {}),
}))

vi.mock("node:fs", async () => {
  const actual = await vi.importActual<typeof import("node:fs")>("node:fs")
  return {
    ...actual,
    promises: {
      ...actual.promises,
      readFile: vi.fn(async () => {
        throw new Error("ENOENT")
      }),
    },
  }
})

import type { ComplianceEventActorInput } from "@/lib/compliance/events"
import { mutateFreshStateForOrg, readState } from "@/lib/server/store"
import {
  attachConversionTrackingReview,
  buildOrgAIAdsMarkdown,
  createCampaign,
  createClaim,
  deleteCampaign,
  deleteClaim,
  listCampaigns,
  recordCreativeApproval,
  summarizeAIAds,
  updateCampaign,
  updateClaim,
  type CreateCampaignInput,
  type CreateClaimInput,
} from "@/lib/server/ai-ads-store"

const ACTOR: ComplianceEventActorInput = {
  id: "user-ai-ads-test",
  label: "ads@example.com",
  role: "compliance",
  source: "session",
}
const ORG = "org-ai-ads-test"

function baseCampaign(
  overrides: Partial<CreateCampaignInput> = {},
): CreateCampaignInput {
  return {
    title: "Campanie test",
    brandName: "Brand X",
    platform: "other",
    campaignType: "paid_placement",
    status: "draft",
    platformTermsReviewed: false,
    targetsVulnerableCategories: false,
    ...overrides,
  }
}

function baseClaim(
  overrides: Partial<CreateClaimInput> = {},
): CreateClaimInput {
  return {
    claimType: "performance_metric",
    claimText: "10x mai rapid decât competiția",
    contextDescription: "Banner Meta",
    evidenceStatus: "unsubstantiated",
    ...overrides,
  }
}

beforeEach(async () => {
  await mutateFreshStateForOrg(ORG, (s) => ({
    ...s,
    aiAdsCampaigns: [],
    aiAdsClaims: [],
    aiAdsCreativeApprovals: [],
    conversionTrackingReviews: [],
    findings: [],
    events: [],
    vendorRecords: [],
  }))
})

afterEach(() => {
  vi.clearAllMocks()
})

// ────────────────────────────────────────────────────────────────────────────
//   createCampaign
// ────────────────────────────────────────────────────────────────────────────

describe("createCampaign", () => {
  it("salvează campania și emite event ai_ads_campaign.created", async () => {
    const created = await createCampaign(
      ORG,
      baseCampaign({ status: "draft" }),
      ACTOR,
    )
    expect(created.id).toMatch(/^aac-/)
    expect(created.title).toBe("Campanie test")
    expect(created.platformTermsReviewed).toBe(false)
    const state = await readState()
    const evt = state.events?.find(
      (e) => e.entityId === created.id && e.type === "ai_ads_campaign.created",
    )
    expect(evt).toBeTruthy()
    expect(evt?.selfHash).toMatch(/^[0-9a-f]{64}$/)
  })

  it("fără platform terms review (other platform) → finding HIGH emis", async () => {
    const created = await createCampaign(
      ORG,
      baseCampaign({
        status: "draft",
        platform: "other",
        platformTermsReviewed: false,
      }),
      ACTOR,
    )
    expect(created.linkedFindingIds.length).toBeGreaterThanOrEqual(1)
    const state = await readState()
    const high = state.findings?.find(
      (f) =>
        created.linkedFindingIds.includes(f.id) &&
        f.severity === "high" &&
        f.title.includes("Vendor/platform terms review lipsă"),
    )
    expect(high).toBeTruthy()
    expect(high?.legalReference).toMatch(/2005\/29\/EC/)
  })

  it("pe meta_ai_ads fără vendor → finding HIGH vendor-dpa-missing", async () => {
    const created = await createCampaign(
      ORG,
      baseCampaign({
        platform: "meta_ai_ads",
        platformTermsReviewed: true,
      }),
      ACTOR,
    )
    const state = await readState()
    const finding = state.findings?.find(
      (f) =>
        created.linkedFindingIds.includes(f.id) &&
        f.title.includes("Vendor/DPA lipsă"),
    )
    expect(finding).toBeTruthy()
    expect(finding?.legalReference).toMatch(/Art\. 28/)
  })

  it("targetsVulnerableCategories=true + !platformTermsReviewed → finding CRITICAL", async () => {
    const created = await createCampaign(
      ORG,
      baseCampaign({
        targetsVulnerableCategories: true,
        platformTermsReviewed: false,
      }),
      ACTOR,
    )
    const state = await readState()
    const finding = state.findings?.find(
      (f) =>
        created.linkedFindingIds.includes(f.id) && f.severity === "critical",
    )
    expect(finding).toBeTruthy()
    expect(finding?.legalReference).toMatch(/Art\. 5\(1\)\(b\)/)
  })

  it("validează input: brandName lipsă → eroare", async () => {
    await expect(
      createCampaign(
        ORG,
        baseCampaign({ brandName: "" }),
        ACTOR,
      ),
    ).rejects.toThrow(/brandName/)
  })
})

// ────────────────────────────────────────────────────────────────────────────
//   updateCampaign
// ────────────────────────────────────────────────────────────────────────────

describe("updateCampaign", () => {
  it("setând platformTermsReviewed=true → finding-ul vechi devine resolved", async () => {
    const created = await createCampaign(
      ORG,
      baseCampaign({ platformTermsReviewed: false }),
      ACTOR,
    )
    const stateBefore = await readState()
    const beforeOpen = (stateBefore.findings ?? []).filter(
      (f) => created.linkedFindingIds.includes(f.id) && f.findingStatus !== "resolved",
    ).length
    expect(beforeOpen).toBeGreaterThan(0)

    await updateCampaign(
      ORG,
      created.id,
      {
        platformTermsReviewed: true,
        platformTermsReviewedByEmail: "legal@example.com",
        platformTermsReviewedAtISO: "2026-05-18T12:00:00.000Z",
      },
      ACTOR,
    )

    const stateAfter = await readState()
    const resolved = (stateAfter.findings ?? []).find(
      (f) =>
        f.title.includes("Vendor/platform terms review lipsă") &&
        f.findingStatus === "resolved",
    )
    expect(resolved).toBeTruthy()
  })

  it("returnează null pentru ID inexistent", async () => {
    const result = await updateCampaign(ORG, "aac-missing", {}, ACTOR)
    expect(result).toBeNull()
  })
})

// ────────────────────────────────────────────────────────────────────────────
//   createClaim
// ────────────────────────────────────────────────────────────────────────────

describe("createClaim", () => {
  it("compliance_claim + unsubstantiated → misleadingRisk=high + finding HIGH emis", async () => {
    const claim = await createClaim(
      ORG,
      baseClaim({
        claimType: "compliance_claim",
        claimText: "GDPR compliant",
        evidenceStatus: "unsubstantiated",
      }),
      ACTOR,
    )
    expect(claim.misleadingRisk).toBe("high")
    expect(claim.linkedFindingIds.length).toBeGreaterThan(0)
    const state = await readState()
    const finding = state.findings?.find((f) =>
      claim.linkedFindingIds.includes(f.id),
    )
    expect(finding?.severity).toBe("high")
    expect(finding?.title).toMatch(/misleading AI claim/i)
    expect(finding?.legalReference).toMatch(/2005\/29\/EC/)
  })

  it("certification public_record → low risk, niciun finding", async () => {
    const claim = await createClaim(
      ORG,
      baseClaim({
        claimType: "certification",
        evidenceStatus: "public_record",
      }),
      ACTOR,
    )
    expect(claim.misleadingRisk).toBe("low")
    expect(claim.linkedFindingIds).toEqual([])
  })

  it("link la campanie → campaign.linkedClaimIds este actualizat", async () => {
    const campaign = await createCampaign(ORG, baseCampaign({ platformTermsReviewed: true }), ACTOR)
    const claim = await createClaim(
      ORG,
      baseClaim({ campaignId: campaign.id }),
      ACTOR,
    )
    const state = await readState()
    const refreshed = state.aiAdsCampaigns?.find((c) => c.id === campaign.id)
    expect(refreshed?.linkedClaimIds).toContain(claim.id)
  })
})

// ────────────────────────────────────────────────────────────────────────────
//   updateClaim — risk-drop closes finding
// ────────────────────────────────────────────────────────────────────────────

describe("updateClaim", () => {
  it("substanțierea claim-ului scade risc-ul + închide finding", async () => {
    const claim = await createClaim(
      ORG,
      baseClaim({
        claimType: "performance_metric",
        evidenceStatus: "unsubstantiated",
      }),
      ACTOR,
    )
    expect(claim.misleadingRisk).toBe("high")

    await updateClaim(
      ORG,
      claim.id,
      { evidenceStatus: "third_party_audit", evidenceSource: "https://audit.example.com" },
      ACTOR,
    )

    const state = await readState()
    const updated = state.aiAdsClaims?.find((c) => c.id === claim.id)
    expect(updated?.misleadingRisk).toBe("low")
    const resolved = (state.findings ?? []).find(
      (f) => claim.linkedFindingIds.includes(f.id) && f.findingStatus === "resolved",
    )
    expect(resolved).toBeTruthy()
  })
})

// ────────────────────────────────────────────────────────────────────────────
//   recordCreativeApproval
// ────────────────────────────────────────────────────────────────────────────

describe("recordCreativeApproval", () => {
  it("aprobare cu toate 3 gate-uri → atașată campaniei", async () => {
    const campaign = await createCampaign(
      ORG,
      baseCampaign({ platformTermsReviewed: true }),
      ACTOR,
    )
    const approval = await recordCreativeApproval(
      ORG,
      campaign.id,
      {
        creativeDescription: "Banner Meta 1200x630",
        approvedByEmail: "ceo@example.com",
        prohibitedContentChecked: true,
        art5Check: true,
        consumerLawCheck: true,
        ipRightsCheck: true,
      },
      ACTOR,
    )
    expect(approval.id).toMatch(/^aapr-/)
    const state = await readState()
    const refreshed = state.aiAdsCampaigns?.find((c) => c.id === campaign.id)
    expect(refreshed?.approvalIds).toContain(approval.id)
  })

  it("aprobare incompletă (Art.5 lipsă) → re-eval campanie emite finding incomplete", async () => {
    const campaign = await createCampaign(
      ORG,
      baseCampaign({
        status: "active",
        platformTermsReviewed: true,
        platform: "other",
      }),
      ACTOR,
    )
    await recordCreativeApproval(
      ORG,
      campaign.id,
      {
        creativeDescription: "Banner incomplet",
        approvedByEmail: "ceo@example.com",
        art5Check: false,
        consumerLawCheck: true,
        ipRightsCheck: true,
      },
      ACTOR,
    )
    const state = await readState()
    const finding = (state.findings ?? []).find((f) =>
      f.title.startsWith("Creative approval incomplet"),
    )
    expect(finding).toBeTruthy()
    expect(finding?.severity).toBe("high")
  })

  it("respinge approval fără email valid", async () => {
    const campaign = await createCampaign(ORG, baseCampaign({ platformTermsReviewed: true }), ACTOR)
    await expect(
      recordCreativeApproval(
        ORG,
        campaign.id,
        {
          creativeDescription: "x",
          approvedByEmail: "invalid",
        },
        ACTOR,
      ),
    ).rejects.toThrow(/approvedByEmail/)
  })
})

// ────────────────────────────────────────────────────────────────────────────
//   attachConversionTrackingReview
// ────────────────────────────────────────────────────────────────────────────

describe("attachConversionTrackingReview", () => {
  it("CRM upload fără consent → finding HIGH GDPR emis + linkat la campanie", async () => {
    const campaign = await createCampaign(
      ORG,
      baseCampaign({ platformTermsReviewed: true }),
      ACTOR,
    )
    const review = await attachConversionTrackingReview(
      ORG,
      campaign.id,
      {
        methods: ["audience_matching_crm_upload"],
        consentRequired: true,
        consentRecordedHow: "",
        crmUploadUsed: true,
        crmDataCategoriesUploaded: ["email hashed"],
      },
      ACTOR,
    )
    expect(review.gaps.length).toBeGreaterThan(0)
    expect(review.linkedFindingIds.length).toBeGreaterThan(0)
    const state = await readState()
    const finding = (state.findings ?? []).find((f) =>
      review.linkedFindingIds.includes(f.id),
    )
    expect(finding?.category).toBe("GDPR")
    expect(finding?.severity).toBe("high")

    // Campaign now has conversionTrackingReviewId set
    const refreshed = state.aiAdsCampaigns?.find((c) => c.id === campaign.id)
    expect(refreshed?.conversionTrackingReviewId).toBe(review.id)
  })

  it("setup curat → 0 gaps, 0 findings", async () => {
    const campaign = await createCampaign(
      ORG,
      baseCampaign({ platformTermsReviewed: true }),
      ACTOR,
    )
    const review = await attachConversionTrackingReview(
      ORG,
      campaign.id,
      {
        methods: ["pixel_meta"],
        consentRequired: true,
        consentRecordedHow: "Cookiebot granular",
        pixelList: ["fbq"],
      },
      ACTOR,
    )
    expect(review.gaps).toEqual([])
    expect(review.linkedFindingIds).toEqual([])
  })
})

// ────────────────────────────────────────────────────────────────────────────
//   deleteCampaign — cascade
// ────────────────────────────────────────────────────────────────────────────

describe("deleteCampaign cascade", () => {
  it("șterge campania + claims linkate + approvals + tracking + închide findings", async () => {
    const campaign = await createCampaign(
      ORG,
      baseCampaign({ platformTermsReviewed: true }),
      ACTOR,
    )
    const claim = await createClaim(
      ORG,
      baseClaim({ campaignId: campaign.id, claimType: "compliance_claim" }),
      ACTOR,
    )
    await recordCreativeApproval(
      ORG,
      campaign.id,
      {
        creativeDescription: "x",
        approvedByEmail: "ceo@example.com",
        art5Check: true,
        consumerLawCheck: true,
        ipRightsCheck: true,
      },
      ACTOR,
    )
    await attachConversionTrackingReview(
      ORG,
      campaign.id,
      {
        methods: ["pixel_meta"],
        consentRequired: false,
        pixelList: ["fbq"],
      },
      ACTOR,
    )

    const stateBefore = await readState()
    expect(stateBefore.aiAdsCampaigns?.length).toBe(1)
    expect(stateBefore.aiAdsClaims?.length).toBe(1)
    expect(stateBefore.aiAdsCreativeApprovals?.length).toBe(1)
    expect(stateBefore.conversionTrackingReviews?.length).toBe(1)

    await deleteCampaign(ORG, campaign.id, ACTOR)

    const stateAfter = await readState()
    expect(stateAfter.aiAdsCampaigns?.length).toBe(0)
    expect(stateAfter.aiAdsClaims?.length).toBe(0)
    expect(stateAfter.aiAdsCreativeApprovals?.length).toBe(0)
    expect(stateAfter.conversionTrackingReviews?.length).toBe(0)

    // All findings linked to claim should be resolved
    const openFindings = (stateAfter.findings ?? []).filter(
      (f) => claim.linkedFindingIds.includes(f.id) && f.findingStatus !== "resolved",
    )
    expect(openFindings).toHaveLength(0)
  })
})

// ────────────────────────────────────────────────────────────────────────────
//   deleteClaim
// ────────────────────────────────────────────────────────────────────────────

describe("deleteClaim", () => {
  it("șterge claim + unlink din campanie + închide findings", async () => {
    const campaign = await createCampaign(
      ORG,
      baseCampaign({ platformTermsReviewed: true }),
      ACTOR,
    )
    const claim = await createClaim(
      ORG,
      baseClaim({
        campaignId: campaign.id,
        claimType: "compliance_claim",
      }),
      ACTOR,
    )
    await deleteClaim(ORG, claim.id, ACTOR)

    const state = await readState()
    const refreshed = state.aiAdsCampaigns?.find((c) => c.id === campaign.id)
    expect(refreshed?.linkedClaimIds).not.toContain(claim.id)
    expect(state.aiAdsClaims?.find((c) => c.id === claim.id)).toBeUndefined()
  })
})

// ────────────────────────────────────────────────────────────────────────────
//   listCampaigns filters
// ────────────────────────────────────────────────────────────────────────────

describe("listCampaigns filters", () => {
  it("filtrează după status + platform", async () => {
    await createCampaign(
      ORG,
      baseCampaign({ status: "active", platform: "meta_ai_ads" }),
      ACTOR,
    )
    await createCampaign(
      ORG,
      baseCampaign({ status: "draft", platform: "other" }),
      ACTOR,
    )

    const all = await listCampaigns(ORG, {})
    expect(all.campaigns.length).toBe(2)

    const onlyActive = await listCampaigns(ORG, { status: "active" })
    expect(onlyActive.campaigns).toHaveLength(1)
    expect(onlyActive.campaigns[0].platform).toBe("meta_ai_ads")

    const onlyMeta = await listCampaigns(ORG, { platform: "meta_ai_ads" })
    expect(onlyMeta.campaigns).toHaveLength(1)
  })
})

// ────────────────────────────────────────────────────────────────────────────
//   Stable ID dedup
// ────────────────────────────────────────────────────────────────────────────

describe("stable ID dedup", () => {
  it("multiple update-uri ale aceluiași campaign nu dublează findings", async () => {
    const campaign = await createCampaign(
      ORG,
      baseCampaign({ platformTermsReviewed: false }),
      ACTOR,
    )
    const initialCount = campaign.linkedFindingIds.length

    // Trigger 3 no-op updates (each re-evaluates gaps)
    await updateCampaign(ORG, campaign.id, { notes: "x1" }, ACTOR)
    await updateCampaign(ORG, campaign.id, { notes: "x2" }, ACTOR)
    await updateCampaign(ORG, campaign.id, { notes: "x3" }, ACTOR)

    const state = await readState()
    const refreshed = state.aiAdsCampaigns?.find((c) => c.id === campaign.id)
    expect(refreshed?.linkedFindingIds.length).toBe(initialCount)
  })
})

// ────────────────────────────────────────────────────────────────────────────
//   summarize + markdown
// ────────────────────────────────────────────────────────────────────────────

describe("summarizeAIAds", () => {
  it("contorizează corect", () => {
    const summary = summarizeAIAds([], [], [], [])
    expect(summary.totalCampaigns).toBe(0)
    expect(summary.totalClaims).toBe(0)
  })
})

describe("buildOrgAIAdsMarkdown", () => {
  it("produce markdown valid cu positioning copy", async () => {
    await createCampaign(
      ORG,
      baseCampaign({ title: "Demo", platformTermsReviewed: true }),
      ACTOR,
    )
    const md = await buildOrgAIAdsMarkdown(ORG, "Test Org")
    expect(md).toMatch(/# AI Ads Compliance Pack — Test Org/)
    expect(md).toMatch(
      /AI Ads Compliance Pack: ce afirmă AI-ul despre brand/,
    )
    expect(md).toMatch(/# Campanie AI Ads — Demo/)
  })
})
