import { describe, expect, it } from "vitest"
import {
  buildVendorReviewBrief,
  determineReviewStatus,
  evaluateVendorReview,
} from "@/lib/compliance/vendor-review-engine"
import type { VendorRiskContext } from "@/lib/compliance/vendor-risk"
import type { VendorRecord } from "@/lib/compliance/types"

function buildBaseVendor(overrides: Partial<VendorRecord> = {}): VendorRecord {
  const now = "2026-05-17T10:00:00.000Z"
  return {
    id: "vnd-001",
    orgId: "org-test",
    name: "OpenAI",
    productUsed: "ChatGPT Enterprise",
    vendorRegion: "US",
    role: "processor",
    serviceCategory: "AI/LLM",
    linkedAISystemIds: [],
    linkedAIDataMapIds: [],
    dpaStatus: "signed",
    transferRequired: true,
    transferMechanism: "scc_controller_processor",
    subprocessorsList: ["AWS"],
    securityEvidence: {
      iso27001: true,
      soc2: true,
      penTestRecent: true,
      encryptionInTransit: true,
      encryptionAtRest: true,
      mfaEnforced: true,
      auditLogsAvailable: true,
      incidentNotificationCommitmentHours: 48,
    },
    aiTerms: {
      trainingDataOptOut: "yes",
      inputDataRetention: "no_retention",
      outputRightsOwnership: "client",
      modelTransparency: "documented",
      reproducibilityGuarantees: false,
    },
    riskLevel: "low",
    riskReasons: [],
    reviewStatus: "draft",
    humanReviewRequired: false,
    linkedFindingIds: [],
    createdAtISO: now,
    updatedAtISO: now,
    ...overrides,
  }
}

const ctxPersonal: VendorRiskContext = {
  processesPersonalData: true,
  processesSpecialCategories: false,
  childrenData: false,
  isAIVendor: true,
}

describe("determineReviewStatus", () => {
  it("missing DPA + personal data → needs_dpa", () => {
    const vendor = buildBaseVendor({ dpaStatus: "missing" })
    const result = evaluateVendorReview(vendor, ctxPersonal)
    expect(result.proposedReviewStatus).toBe("needs_dpa")
  })

  it("non-EU + no transfer mech + personal data → needs_transfer_review", () => {
    const vendor = buildBaseVendor({
      vendorRegion: "US",
      transferMechanism: "none",
    })
    const result = evaluateVendorReview(vendor, ctxPersonal)
    // missing-transfer triggers high risk, so review_status may cascade through
    // priorities — but needs_transfer_review is the most specific status.
    expect(result.proposedReviewStatus).toBe("needs_transfer_review")
  })

  it("DPA expired → expired status", () => {
    const vendor = buildBaseVendor({
      dpaStatus: "expired",
      dpaExpiresAtISO: "2026-01-01T00:00:00.000Z",
    })
    const result = evaluateVendorReview(vendor, ctxPersonal, "2026-05-17T00:00:00.000Z")
    expect(result.proposedReviewStatus).toBe("expired")
  })

  it("processor cu personal data fara cert + fara encryption → needs_security_review", () => {
    const vendor = buildBaseVendor({
      securityEvidence: {
        iso27001: false,
        soc2: false,
        penTestRecent: false,
        encryptionInTransit: false,
        encryptionAtRest: false,
        mfaEnforced: false,
        auditLogsAvailable: false,
      },
    })
    const result = evaluateVendorReview(vendor, ctxPersonal)
    expect(result.proposedReviewStatus).toBe("needs_security_review")
  })

  it("reviewedByEmail + risk acceptable → approved", () => {
    const vendor = buildBaseVendor({
      reviewedByEmail: "dpo@firma.ro",
      reviewStatus: "in_review",
    })
    const result = evaluateVendorReview(vendor, ctxPersonal)
    expect(result.proposedReviewStatus).toBe("approved")
  })

  it("rejected status este preserved (manual decision)", () => {
    const vendor = buildBaseVendor({
      reviewStatus: "rejected",
    })
    const result = evaluateVendorReview(vendor, ctxPersonal)
    expect(result.proposedReviewStatus).toBe("rejected")
  })

  it("draft → in_review default cand nu sunt gap-uri majore", () => {
    const vendor = buildBaseVendor({ reviewStatus: "draft" })
    // No reviewer set yet, so cannot be approved
    const result = evaluateVendorReview(vendor, ctxPersonal)
    expect(["in_review", "approved"]).toContain(result.proposedReviewStatus)
  })
})

describe("evaluateVendorReview — risk + nextRevalidation", () => {
  it("risk critical → revalidare in 3 luni", () => {
    const vendor = buildBaseVendor({
      dpaStatus: "expired",
      dpaExpiresAtISO: "2026-01-01T00:00:00.000Z",
    })
    const result = evaluateVendorReview(vendor, ctxPersonal, "2026-05-17T00:00:00.000Z")
    expect(result.vendor.riskLevel).toBe("critical")
    const months =
      (new Date(result.nextRevalidationISO).getTime() - Date.parse("2026-05-17T00:00:00.000Z")) /
      (30 * 86_400_000)
    expect(months).toBeGreaterThan(2.5)
    expect(months).toBeLessThan(3.5)
  })

  it("risk low → revalidare in 12 luni", () => {
    const vendor = buildBaseVendor()
    const result = evaluateVendorReview(vendor, ctxPersonal, "2026-05-17T00:00:00.000Z")
    expect(result.vendor.riskLevel).toBe("low")
    const months =
      (new Date(result.nextRevalidationISO).getTime() - Date.parse("2026-05-17T00:00:00.000Z")) /
      (30 * 86_400_000)
    expect(months).toBeGreaterThan(11)
    expect(months).toBeLessThan(13)
  })

  it("findingCandidates contine gap-uri detectate", () => {
    const vendor = buildBaseVendor({ dpaStatus: "missing" })
    const result = evaluateVendorReview(vendor, ctxPersonal)
    expect(result.findingCandidates.length).toBeGreaterThan(0)
    expect(result.findingCandidates.some((f) => f.stableId.includes("missing-dpa"))).toBe(true)
  })

  it("vendor actualizat are riskLevel + reasons populate", () => {
    const vendor = buildBaseVendor({ dpaStatus: "missing" })
    const result = evaluateVendorReview(vendor, ctxPersonal)
    expect(result.vendor.riskLevel).toBe("high")
    expect(result.vendor.riskReasons.length).toBeGreaterThan(0)
    expect(result.vendor.humanReviewRequired).toBe(true)
  })
})

describe("determineReviewStatus directly", () => {
  it("doesn't override existing 'rejected' status", () => {
    const vendor = buildBaseVendor({ reviewStatus: "rejected" })
    const riskResult = {
      riskLevel: "low" as const,
      reasons: [],
      humanReviewRequired: false,
    }
    const status = determineReviewStatus(vendor, ctxPersonal, riskResult)
    expect(status).toBe("rejected")
  })
})

describe("buildVendorReviewBrief", () => {
  it("genereaza markdown cu sectiunile cerute", () => {
    const vendor = buildBaseVendor()
    const brief = buildVendorReviewBrief(vendor, ctxPersonal, "Test Org SRL")

    expect(brief).toContain("# Brief Vendor — OpenAI")
    expect(brief).toContain("**Operator:** Test Org SRL")
    expect(brief).toContain("## 1. DPA (Art. 28 GDPR)")
    expect(brief).toContain("## 2. Transfer international")
    expect(brief).toContain("## 3. Subprocesatori")
    expect(brief).toContain("## 4. Securitate (Art. 32 GDPR)")
    expect(brief).toContain("## 5. Termeni AI specifici")
    expect(brief).toContain("## 6. Risc + motivare")
    expect(brief).toContain("## 7. Gap-uri si actiuni recomandate")
    expect(brief).toContain("## 8. Linkage in CompliRoAI")
    expect(brief).toContain("## 9. Note interne")
  })

  it("include subprocesatori cunoscuti", () => {
    const vendor = buildBaseVendor({
      subprocessorsList: ["AWS US-East", "Stripe", "Snowflake"],
    })
    const brief = buildVendorReviewBrief(vendor, ctxPersonal, "Test Org SRL")
    expect(brief).toContain("- AWS US-East")
    expect(brief).toContain("- Stripe")
  })

  it("listeaza gap-urile cu remediation hint", () => {
    const vendor = buildBaseVendor({ dpaStatus: "missing" })
    const brief = buildVendorReviewBrief(vendor, ctxPersonal, "Test Org SRL")
    expect(brief).toContain("DPA lipsa: OpenAI")
    expect(brief).toContain("Hint:")
    expect(brief).toContain("Dovada:")
  })

  it("vendor curat → mesaj 'Niciun gap detectat'", () => {
    const vendor = buildBaseVendor()
    const brief = buildVendorReviewBrief(vendor, ctxPersonal, "Test Org SRL")
    expect(brief).toContain("Niciun gap detectat")
  })
})
