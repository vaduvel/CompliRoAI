import { describe, expect, it } from "vitest"
import {
  buildVendorLifecycleSummary,
  isActiveReview,
  isDPAExpired,
  isVendorOverdue,
} from "@/lib/compliance/vendor-review-lifecycle"
import type { VendorRecord } from "@/lib/compliance/types"

function buildVendor(overrides: Partial<VendorRecord> = {}): VendorRecord {
  const now = "2026-05-17T10:00:00.000Z"
  return {
    id: `vnd-${Math.random().toString(36).slice(2, 8)}`,
    orgId: "org-test",
    name: "Test Vendor",
    productUsed: "Test API",
    vendorRegion: "EU",
    role: "processor",
    serviceCategory: "AI/LLM",
    linkedAISystemIds: [],
    linkedAIDataMapIds: [],
    dpaStatus: "signed",
    transferRequired: false,
    transferMechanism: "none",
    subprocessorsList: [],
    securityEvidence: {
      iso27001: true,
      soc2: false,
      penTestRecent: false,
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
    riskLevel: "low",
    riskReasons: [],
    reviewStatus: "approved",
    humanReviewRequired: false,
    linkedFindingIds: [],
    createdAtISO: now,
    updatedAtISO: now,
    ...overrides,
  }
}

const NOW = "2026-05-17T00:00:00.000Z"

describe("isVendorOverdue", () => {
  it("returns true daca nextRevalidationISO < now", () => {
    const vendor = buildVendor({
      nextRevalidationISO: "2026-01-01T00:00:00.000Z",
    })
    expect(isVendorOverdue(vendor, NOW)).toBe(true)
  })

  it("returns false daca nextRevalidationISO > now", () => {
    const vendor = buildVendor({
      nextRevalidationISO: "2027-01-01T00:00:00.000Z",
    })
    expect(isVendorOverdue(vendor, NOW)).toBe(false)
  })

  it("returns false daca nextRevalidationISO lipseste", () => {
    const vendor = buildVendor({})
    expect(isVendorOverdue(vendor, NOW)).toBe(false)
  })
})

describe("isDPAExpired", () => {
  it("returns true pentru dpaStatus=expired direct", () => {
    const vendor = buildVendor({ dpaStatus: "expired" })
    expect(isDPAExpired(vendor, NOW)).toBe(true)
  })

  it("returns true daca dpaExpiresAtISO < now", () => {
    const vendor = buildVendor({
      dpaExpiresAtISO: "2026-01-01T00:00:00.000Z",
    })
    expect(isDPAExpired(vendor, NOW)).toBe(true)
  })

  it("returns false daca dpaExpiresAtISO > now", () => {
    const vendor = buildVendor({
      dpaExpiresAtISO: "2027-01-01T00:00:00.000Z",
    })
    expect(isDPAExpired(vendor, NOW)).toBe(false)
  })
})

describe("isActiveReview", () => {
  it("draft → active", () => {
    expect(isActiveReview(buildVendor({ reviewStatus: "draft" }))).toBe(true)
  })

  it("in_review → active", () => {
    expect(isActiveReview(buildVendor({ reviewStatus: "in_review" }))).toBe(true)
  })

  it("needs_dpa → active", () => {
    expect(isActiveReview(buildVendor({ reviewStatus: "needs_dpa" }))).toBe(true)
  })

  it("approved → not active", () => {
    expect(isActiveReview(buildVendor({ reviewStatus: "approved" }))).toBe(false)
  })

  it("rejected → not active", () => {
    expect(isActiveReview(buildVendor({ reviewStatus: "rejected" }))).toBe(false)
  })
})

describe("buildVendorLifecycleSummary", () => {
  it("gol → reminder default + arrays goale", () => {
    const summary = buildVendorLifecycleSummary([])
    expect(summary.overdueRevalidation).toEqual([])
    expect(summary.dueSoonRevalidation).toEqual([])
    expect(summary.activeFollowUp).toEqual([])
    expect(summary.dpaExpired).toEqual([])
    expect(summary.reminderNote).toContain("Niciun vendor")
  })

  it("vendor cu revalidation overdue → in overdueRevalidation", () => {
    const vendors = [
      buildVendor({
        name: "OpenAI",
        nextRevalidationISO: new Date(Date.now() - 86_400_000 * 30).toISOString(),
      }),
    ]
    const summary = buildVendorLifecycleSummary(vendors)
    expect(summary.overdueRevalidation.length).toBe(1)
    expect(summary.reminderNote).toContain("revalidare depasita")
  })

  it("vendor cu DPA expirat → in dpaExpired + reminder urgent", () => {
    const vendors = [
      buildVendor({
        name: "Anthropic",
        dpaStatus: "expired",
        dpaExpiresAtISO: "2026-01-01T00:00:00.000Z",
      }),
    ]
    const summary = buildVendorLifecycleSummary(vendors)
    expect(summary.dpaExpired.length).toBe(1)
    expect(summary.reminderNote.toLowerCase()).toContain("dpa expirat")
  })

  it("vendor cu DPA care expira in 30 zile → in dpaExpiringSoon", () => {
    const future = new Date(Date.now() + 86_400_000 * 30).toISOString()
    const vendors = [
      buildVendor({
        name: "Mistral",
        dpaExpiresAtISO: future,
      }),
    ]
    const summary = buildVendorLifecycleSummary(vendors)
    expect(summary.dpaExpiringSoon.length).toBe(1)
    expect(summary.reminderNote).toContain("DPA care expira")
  })

  it("vendor in workflow activ → in activeFollowUp", () => {
    const vendors = [
      buildVendor({ name: "Cohere", reviewStatus: "needs_dpa" }),
      buildVendor({ name: "Pinecone", reviewStatus: "in_review" }),
      buildVendor({ name: "ApprovedOne", reviewStatus: "approved" }),
    ]
    const summary = buildVendorLifecycleSummary(vendors)
    expect(summary.activeFollowUp.length).toBe(2)
    expect(summary.reminderNote).toContain("workflow")
  })

  it("revalidation in 30 zile → in dueSoonRevalidation", () => {
    const future = new Date(Date.now() + 86_400_000 * 20).toISOString()
    const vendors = [
      buildVendor({
        name: "DueSoon",
        nextRevalidationISO: future,
      }),
    ]
    const summary = buildVendorLifecycleSummary(vendors)
    expect(summary.dueSoonRevalidation.length).toBe(1)
  })

  it("reminder note inclide prioritate cand exista probleme", () => {
    const vendors = [
      buildVendor({ name: "ExpiredOne", dpaStatus: "expired" }),
    ]
    const summary = buildVendorLifecycleSummary(vendors)
    expect(summary.reminderNote).toContain("Prioritate")
  })

  it("dueSoonDays parameter override (custom 60 zile)", () => {
    const future = new Date(Date.now() + 86_400_000 * 45).toISOString()
    const vendors = [
      buildVendor({
        name: "Mid",
        nextRevalidationISO: future,
      }),
    ]
    const summaryDefault = buildVendorLifecycleSummary(vendors)
    expect(summaryDefault.dueSoonRevalidation.length).toBe(0)
    const summaryCustom = buildVendorLifecycleSummary(vendors, { dueSoonDays: 60 })
    expect(summaryCustom.dueSoonRevalidation.length).toBe(1)
  })
})
