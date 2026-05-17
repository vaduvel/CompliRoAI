import { describe, expect, it } from "vitest"
import {
  VENDOR_FINDING_PREFIX,
  buildVendorFindings,
  evaluateVendorRisk,
  type VendorRiskContext,
} from "@/lib/compliance/vendor-risk"
import type { VendorRecord } from "@/lib/compliance/types"

function buildBaseVendor(overrides: Partial<VendorRecord> = {}): VendorRecord {
  const now = "2026-05-17T10:00:00.000Z"
  return {
    id: "vnd-test-001",
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
      soc2: true,
      penTestRecent: false,
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

const ctxWithPersonalData: VendorRiskContext = {
  processesPersonalData: true,
  processesSpecialCategories: false,
  childrenData: false,
  isAIVendor: true,
}

const ctxWithSensitiveData: VendorRiskContext = {
  processesPersonalData: true,
  processesSpecialCategories: true,
  childrenData: false,
  isAIVendor: true,
}

const ctxNoPersonalData: VendorRiskContext = {
  processesPersonalData: false,
  processesSpecialCategories: false,
  childrenData: false,
  isAIVendor: false,
}

describe("evaluateVendorRisk — critical paths", () => {
  it("DPA expirat → critical", () => {
    const vendor = buildBaseVendor({
      dpaStatus: "expired",
      dpaExpiresAtISO: "2026-01-01T00:00:00.000Z",
    })
    const result = evaluateVendorRisk(vendor, ctxWithPersonalData, "2026-05-17T00:00:00.000Z")
    expect(result.riskLevel).toBe("critical")
    expect(result.humanReviewRequired).toBe(true)
    expect(result.reasons.some((r) => r.includes("expirat"))).toBe(true)
  })

  it("vendor non-EU + fara mecanism transfer + date sensibile → critical", () => {
    const vendor = buildBaseVendor({
      vendorRegion: "US",
      transferMechanism: "none",
    })
    const result = evaluateVendorRisk(vendor, ctxWithSensitiveData)
    expect(result.riskLevel).toBe("critical")
    expect(result.humanReviewRequired).toBe(true)
  })
})

describe("evaluateVendorRisk — high paths", () => {
  it("missing DPA cu date personale → high", () => {
    const vendor = buildBaseVendor({ dpaStatus: "missing" })
    const result = evaluateVendorRisk(vendor, ctxWithPersonalData)
    expect(result.riskLevel).toBe("high")
    expect(result.humanReviewRequired).toBe(true)
    expect(result.reasons.some((r) => r.includes("DPA lipsa"))).toBe(true)
  })

  it("non-EU + no transfer mechanism + date personale → high", () => {
    const vendor = buildBaseVendor({
      vendorRegion: "US",
      transferMechanism: "none",
    })
    const result = evaluateVendorRisk(vendor, ctxWithPersonalData)
    expect(result.riskLevel).toBe("high")
  })

  it("trains on input fara opt-out → high", () => {
    const vendor = buildBaseVendor({
      aiTerms: {
        trainingDataOptOut: "no",
        inputDataRetention: "indefinite",
        outputRightsOwnership: "vendor",
        modelTransparency: "opaque",
        reproducibilityGuarantees: false,
      },
    })
    const result = evaluateVendorRisk(vendor, ctxWithPersonalData)
    expect(result.riskLevel).toBe("high")
    expect(result.reasons.some((r) => r.includes("antreneaza pe input fara opt-out"))).toBe(true)
  })
})

describe("evaluateVendorRisk — medium paths", () => {
  it("processor cu date personale fara ISO/SOC2 → medium", () => {
    const vendor = buildBaseVendor({
      securityEvidence: {
        iso27001: false,
        soc2: false,
        penTestRecent: false,
        encryptionInTransit: true,
        encryptionAtRest: true,
        mfaEnforced: true,
        auditLogsAvailable: true,
        incidentNotificationCommitmentHours: 48,
      },
    })
    const result = evaluateVendorRisk(vendor, ctxWithPersonalData)
    expect(result.riskLevel).toBe("medium")
    expect(result.reasons.some((r) => r.includes("ISO 27001"))).toBe(true)
  })

  it("processor fara SLA notificare incident → medium", () => {
    const vendor = buildBaseVendor({
      securityEvidence: {
        iso27001: true,
        soc2: true,
        penTestRecent: false,
        encryptionInTransit: true,
        encryptionAtRest: true,
        mfaEnforced: true,
        auditLogsAvailable: true,
        // incidentNotificationCommitmentHours: undefined
      },
    })
    const result = evaluateVendorRisk(vendor, ctxWithPersonalData)
    expect(result.riskLevel).toBe("medium")
  })

  it("AI vendor cu transparenta opaque → medium", () => {
    const vendor = buildBaseVendor({
      aiTerms: {
        trainingDataOptOut: "yes",
        inputDataRetention: "no_retention",
        outputRightsOwnership: "client",
        modelTransparency: "opaque",
        reproducibilityGuarantees: false,
      },
    })
    const result = evaluateVendorRisk(vendor, ctxWithPersonalData)
    expect(result.riskLevel).toBe("medium")
  })
})

describe("evaluateVendorRisk — low/minimal paths", () => {
  it("fara date personale + DPA signed → minimal", () => {
    const vendor = buildBaseVendor()
    const result = evaluateVendorRisk(vendor, ctxNoPersonalData)
    expect(result.riskLevel).toBe("minimal")
  })

  it("fara date personale + dpaStatus not_required → minimal", () => {
    const vendor = buildBaseVendor({ dpaStatus: "not_required" })
    const result = evaluateVendorRisk(vendor, ctxNoPersonalData)
    expect(result.riskLevel).toBe("minimal")
  })

  it("EU + DPA signed + securitate completa → low", () => {
    const vendor = buildBaseVendor()
    const result = evaluateVendorRisk(vendor, ctxWithPersonalData)
    expect(result.riskLevel).toBe("low")
    expect(result.humanReviewRequired).toBe(false)
  })
})

describe("buildVendorFindings", () => {
  it("emite finding missing-dpa pentru vendor cu DPA lipsa", () => {
    const vendor = buildBaseVendor({ dpaStatus: "missing" })
    const findings = buildVendorFindings(vendor, ctxWithPersonalData)
    const dpaFinding = findings.find((f) => f.stableId.includes("missing-dpa"))
    expect(dpaFinding).toBeDefined()
    expect(dpaFinding!.severity).toBe("high")
    expect(dpaFinding!.legalReference).toContain("Art. 28")
  })

  it("emite finding missing-transfer + critical pentru special categories", () => {
    const vendor = buildBaseVendor({
      vendorRegion: "US",
      transferMechanism: "none",
    })
    const findings = buildVendorFindings(vendor, ctxWithSensitiveData)
    const transferFinding = findings.find((f) => f.stableId.includes("missing-transfer"))
    expect(transferFinding).toBeDefined()
    expect(transferFinding!.severity).toBe("critical")
  })

  it("emite finding trains-no-optout pentru AI vendor", () => {
    const vendor = buildBaseVendor({
      aiTerms: {
        trainingDataOptOut: "no",
        inputDataRetention: "indefinite",
        outputRightsOwnership: "vendor",
        modelTransparency: "opaque",
        reproducibilityGuarantees: false,
      },
    })
    const findings = buildVendorFindings(vendor, ctxWithPersonalData)
    expect(findings.find((f) => f.stableId.includes("trains-no-optout"))).toBeDefined()
  })

  it("emite finding ai-terms-gap pentru transparenta unknown", () => {
    const vendor = buildBaseVendor({
      aiTerms: {
        trainingDataOptOut: "yes",
        inputDataRetention: "no_retention",
        outputRightsOwnership: "client",
        modelTransparency: "unknown",
        reproducibilityGuarantees: false,
      },
    })
    const findings = buildVendorFindings(vendor, ctxWithPersonalData)
    expect(findings.find((f) => f.stableId.includes("ai-terms-gap"))).toBeDefined()
  })

  it("emite finding needs-review pentru vendor high-risk fara reviewer", () => {
    const vendor = buildBaseVendor({
      riskLevel: "high",
      reviewedByEmail: undefined,
    })
    const findings = buildVendorFindings(vendor, ctxWithPersonalData)
    expect(findings.find((f) => f.stableId.includes("needs-review"))).toBeDefined()
  })

  it("nu emite needs-review daca vendor are reviewedByEmail", () => {
    const vendor = buildBaseVendor({
      riskLevel: "high",
      reviewedByEmail: "dpo@firma.ro",
    })
    const findings = buildVendorFindings(vendor, ctxWithPersonalData)
    expect(findings.find((f) => f.stableId.includes("needs-review"))).toBeUndefined()
  })

  it("ID-urile finding sunt stabile (prefix + vendorId)", () => {
    const vendor = buildBaseVendor({ id: "vnd-abc", dpaStatus: "missing" })
    const findings = buildVendorFindings(vendor, ctxWithPersonalData)
    for (const f of findings) {
      expect(f.stableId.startsWith(`${VENDOR_FINDING_PREFIX}vnd-abc-`)).toBe(true)
    }
  })
})
