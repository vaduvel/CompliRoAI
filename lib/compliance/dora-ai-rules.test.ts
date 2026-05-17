import { describe, expect, it } from "vitest"

import { evaluateDoraVendor } from "@/lib/compliance/dora-ai-rules"
import type {
  OrgRegulatoryProfile,
  VendorRecord,
} from "@/lib/compliance/types"

const NOW = "2026-05-17T10:00:00.000Z"

function baseOrg(overrides: Partial<OrgRegulatoryProfile> = {}): OrgRegulatoryProfile {
  return {
    orgId: "org-test",
    doraApplies: true,
    doraEntityType: "credit_institution",
    nis2EntityClass: "not_in_scope",
    nis2Sectors: [],
    createdAtISO: NOW,
    updatedAtISO: NOW,
    ...overrides,
  }
}

function baseVendor(overrides: Partial<VendorRecord> = {}): VendorRecord {
  return {
    id: "vendor-1",
    orgId: "org-test",
    name: "OpenAI Test",
    productUsed: "ChatGPT Enterprise",
    vendorRegion: "US",
    role: "processor",
    serviceCategory: "AI/LLM",
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
      incidentNotificationCommitmentHours: 24,
    },
    aiTerms: {
      trainingDataOptOut: "yes",
      inputDataRetention: "no_retention",
      outputRightsOwnership: "client",
      modelTransparency: "documented",
      reproducibilityGuarantees: true,
    },
    riskLevel: "medium",
    riskReasons: [],
    reviewStatus: "approved",
    humanReviewRequired: false,
    linkedFindingIds: [],
    createdAtISO: NOW,
    updatedAtISO: NOW,
    doraScope: {
      material: true,
      criticalForService: "credit decisioning",
      assessmentNote: "exit plan documented in Notion",
    },
    ...overrides,
  }
}

describe("evaluateDoraVendor", () => {
  it("returns no gaps when org is not DORA-scoped", () => {
    const result = evaluateDoraVendor(
      baseVendor(),
      baseOrg({ doraApplies: false, doraEntityType: "not_applicable" }),
      NOW,
    )
    expect(result.isMaterial).toBe(false)
    expect(result.findings).toHaveLength(0)
    expect(result.gaps).toHaveLength(0)
  })

  it("returns no gaps when vendor is not marked material", () => {
    const result = evaluateDoraVendor(
      baseVendor({ doraScope: { material: false } }),
      baseOrg(),
      NOW,
    )
    expect(result.isMaterial).toBe(false)
    expect(result.findings).toHaveLength(0)
  })

  it("emits critical finding when DPA is not signed (Art. 28-30)", () => {
    const result = evaluateDoraVendor(
      baseVendor({ dpaStatus: "missing" }),
      baseOrg(),
      NOW,
    )
    expect(result.isMaterial).toBe(true)
    expect(result.gaps).toContain("ict_contract_missing")
    const f = result.findings.find((x) =>
      x.id.endsWith("-ict_contract_missing"),
    )
    expect(f).toBeDefined()
    expect(f?.severity).toBe("critical")
    expect(f?.legalReference).toContain("Art. 28-30")
    expect(result.aggregatedSeverity).toBe("critical")
  })

  it("emits high finding when exit strategy is undocumented (Art. 28(8))", () => {
    const result = evaluateDoraVendor(
      baseVendor({
        doraScope: { material: true, criticalForService: "ai-x" },
        dpaExpiresAtISO: undefined,
      }),
      baseOrg(),
      NOW,
    )
    expect(result.gaps).toContain("exit_strategy_undocumented")
    const f = result.findings.find((x) =>
      x.id.endsWith("-exit_strategy_undocumented"),
    )
    expect(f?.severity).toBe("high")
    expect(f?.legalReference).toContain("Art. 28(8)")
  })

  it("emits high finding when incident SLA > 24h or missing (Art. 19)", () => {
    const result = evaluateDoraVendor(
      baseVendor({
        securityEvidence: {
          iso27001: true,
          soc2: true,
          penTestRecent: true,
          encryptionInTransit: true,
          encryptionAtRest: true,
          mfaEnforced: true,
          auditLogsAvailable: true,
          incidentNotificationCommitmentHours: 72,
        },
      }),
      baseOrg(),
      NOW,
    )
    expect(result.gaps).toContain("incident_sla_missing")
    const f = result.findings.find((x) =>
      x.id.endsWith("-incident_sla_missing"),
    )
    expect(f?.severity).toBe("high")
    expect(f?.detail).toContain("72h")
  })

  it("emits resilience finding when pen-test absent for credit decision entity (Art. 25-27)", () => {
    const result = evaluateDoraVendor(
      baseVendor({
        securityEvidence: {
          iso27001: true,
          soc2: true,
          penTestRecent: false,
          encryptionInTransit: true,
          encryptionAtRest: true,
          mfaEnforced: true,
          auditLogsAvailable: true,
          incidentNotificationCommitmentHours: 24,
        },
      }),
      baseOrg({ doraEntityType: "investment_firm" }),
      NOW,
    )
    expect(result.gaps).toContain("resilience_testing_missing")
    const f = result.findings.find((x) =>
      x.id.endsWith("-resilience_testing_missing"),
    )
    expect(f?.severity).toBe("high")
  })

  it("emits non-EU payment-data finding for PSP without transfer mechanism (Art. 28(2)-(5))", () => {
    const result = evaluateDoraVendor(
      baseVendor({
        vendorRegion: "US",
        transferMechanism: "none",
      }),
      baseOrg({ doraEntityType: "payment_institution" }),
      NOW,
    )
    expect(result.gaps).toContain("non_eu_payment_data_review")
    const f = result.findings.find((x) =>
      x.id.endsWith("-non_eu_payment_data_review"),
    )
    expect(f?.severity).toBe("high")
    expect(f?.legalReference).toContain("Art. 28(2)-(5)")
  })

  it("emits critical finding when DPA is expired (Art. 30)", () => {
    const result = evaluateDoraVendor(
      baseVendor({
        dpaStatus: "signed",
        dpaExpiresAtISO: "2024-01-01T00:00:00.000Z",
      }),
      baseOrg(),
      NOW,
    )
    expect(result.gaps).toContain("expired_dpa")
    const f = result.findings.find((x) => x.id.endsWith("-expired_dpa"))
    expect(f?.severity).toBe("critical")
  })

  it("produces stable finding ids (idempotent re-evaluation)", () => {
    const a = evaluateDoraVendor(
      baseVendor({ dpaStatus: "missing" }),
      baseOrg(),
      NOW,
    )
    const b = evaluateDoraVendor(
      baseVendor({ dpaStatus: "missing" }),
      baseOrg(),
      "2026-06-01T00:00:00.000Z",
    )
    expect(a.findings.map((f) => f.id).sort()).toEqual(
      b.findings.map((f) => f.id).sort(),
    )
  })

  it("returns empty findings when all DORA gaps are satisfied", () => {
    const result = evaluateDoraVendor(baseVendor(), baseOrg(), NOW)
    expect(result.isMaterial).toBe(true)
    expect(result.gaps).toHaveLength(0)
    expect(result.findings).toHaveLength(0)
    expect(result.aggregatedSeverity).toBe("low")
  })
})
