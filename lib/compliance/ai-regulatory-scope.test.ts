import { describe, expect, it } from "vitest"

import {
  DORA_FINDING_PREFIX,
  NIS2_FINDING_PREFIX,
  buildRegulatoryScopeSummary,
} from "@/lib/compliance/ai-regulatory-scope"
import type {
  AISystemRecord,
  ComplianceState,
  OrgRegulatoryProfile,
  ScanFinding,
  VendorRecord,
} from "@/lib/compliance/types"

const NOW = "2026-05-17T10:00:00.000Z"

function makeProfile(
  overrides: Partial<OrgRegulatoryProfile> = {},
): OrgRegulatoryProfile {
  return {
    orgId: "org-test",
    doraApplies: true,
    doraEntityType: "credit_institution",
    nis2EntityClass: "essential",
    nis2Sectors: ["banking"],
    createdAtISO: NOW,
    updatedAtISO: NOW,
    ...overrides,
  }
}

function makeVendor(id: string, overrides: Partial<VendorRecord> = {}): VendorRecord {
  return {
    id,
    orgId: "org-test",
    name: `Vendor ${id}`,
    productUsed: "P",
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
      reproducibilityGuarantees: true,
    },
    riskLevel: "medium",
    riskReasons: [],
    reviewStatus: "approved",
    humanReviewRequired: false,
    linkedFindingIds: [],
    createdAtISO: NOW,
    updatedAtISO: NOW,
    ...overrides,
  }
}

function makeSystem(id: string, overrides: Partial<AISystemRecord> = {}): AISystemRecord {
  return {
    id,
    name: `System ${id}`,
    purpose: "fraud-detection",
    vendor: "VendorX",
    modelType: "transformer",
    usesPersonalData: true,
    makesAutomatedDecisions: true,
    impactsRights: true,
    hasHumanReview: true,
    riskLevel: "high",
    recommendedActions: [],
    createdAtISO: NOW,
    policyAttestationStatus: "attested",
    ...overrides,
  }
}

function makeFinding(id: string, overrides: Partial<ScanFinding> = {}): ScanFinding {
  return {
    id,
    title: `Finding ${id}`,
    detail: "x",
    category: "EU_AI_ACT",
    severity: "high",
    risk: "high",
    principles: ["robustness"],
    createdAtISO: NOW,
    sourceDocument: "test",
    ...overrides,
  }
}

function makeState(overrides: Partial<ComplianceState> = {}): ComplianceState {
  return {
    highRisk: 0,
    lowRisk: 0,
    gdprProgress: 0,
    alerts: [],
    findings: [],
    events: [],
    generatedDocuments: [],
    aiSystems: [],
    literacyRecords: [],
    ...overrides,
  }
}

describe("buildRegulatoryScopeSummary", () => {
  it("returns empty surfaces when no orgRegulatoryProfile set", () => {
    const summary = buildRegulatoryScopeSummary(makeState())
    expect(summary.profile).toBeNull()
    expect(summary.doraScopedVendors).toHaveLength(0)
    expect(summary.nis2ScopedSystems).toHaveLength(0)
    expect(summary.recentFindings).toHaveLength(0)
    expect(summary.stats.doraVendorCount).toBe(0)
  })

  it("filters vendors that are DORA-material when org is DORA-scoped", () => {
    const vMat = makeVendor("v1", {
      doraScope: { material: true, criticalForService: "credit" },
    })
    const vNonMat = makeVendor("v2") // no doraScope
    const state = makeState({
      orgRegulatoryProfile: makeProfile(),
      vendorRecords: [vMat, vNonMat],
    })
    const summary = buildRegulatoryScopeSummary(state)
    expect(summary.doraScopedVendors).toHaveLength(1)
    expect(summary.doraScopedVendors[0].vendor.id).toBe("v1")
  })

  it("does NOT list DORA vendors when org has doraApplies=false", () => {
    const vMat = makeVendor("v1", {
      doraScope: { material: true },
    })
    const state = makeState({
      orgRegulatoryProfile: makeProfile({
        doraApplies: false,
        doraEntityType: "not_applicable",
      }),
      vendorRecords: [vMat],
    })
    const summary = buildRegulatoryScopeSummary(state)
    expect(summary.doraScopedVendors).toHaveLength(0)
  })

  it("filters AI systems in NIS2 scope when org is NIS2", () => {
    const sIn = makeSystem("s1", {
      nis2EntityScope: { inScope: true, service: "fraud" },
    })
    const sOut = makeSystem("s2") // no nis2EntityScope
    const state = makeState({
      orgRegulatoryProfile: makeProfile(),
      aiSystems: [sIn, sOut],
    })
    const summary = buildRegulatoryScopeSummary(state)
    expect(summary.nis2ScopedSystems).toHaveLength(1)
    expect(summary.nis2ScopedSystems[0].system.id).toBe("s1")
  })

  it("aggregates gapCount + highestSeverity per vendor from open findings", () => {
    const vendorId = "v1"
    const f1 = makeFinding(`${DORA_FINDING_PREFIX}${vendorId}-ict_contract_missing`, {
      severity: "critical",
    })
    const f2 = makeFinding(`${DORA_FINDING_PREFIX}${vendorId}-incident_sla_missing`, {
      severity: "high",
    })
    const fResolved = makeFinding(
      `${DORA_FINDING_PREFIX}${vendorId}-exit_strategy_undocumented`,
      { severity: "high", findingStatus: "resolved" },
    )
    const state = makeState({
      orgRegulatoryProfile: makeProfile(),
      vendorRecords: [makeVendor(vendorId, { doraScope: { material: true } })],
      findings: [f1, f2, fResolved],
    })
    const summary = buildRegulatoryScopeSummary(state)
    expect(summary.doraScopedVendors[0].gapCount).toBe(2)
    expect(summary.doraScopedVendors[0].highestSeverity).toBe("critical")
    expect(summary.doraScopedVendors[0].linkedFindingIds).toHaveLength(3)
  })

  it("sorts DORA vendors by highest severity then by gapCount", () => {
    const v1 = makeVendor("v1", { doraScope: { material: true } })
    const v2 = makeVendor("v2", { doraScope: { material: true } })
    const state = makeState({
      orgRegulatoryProfile: makeProfile(),
      vendorRecords: [v1, v2],
      findings: [
        makeFinding(`${DORA_FINDING_PREFIX}v1-r`, { severity: "high" }),
        makeFinding(`${DORA_FINDING_PREFIX}v2-r1`, { severity: "critical" }),
        makeFinding(`${DORA_FINDING_PREFIX}v2-r2`, { severity: "high" }),
      ],
    })
    const summary = buildRegulatoryScopeSummary(state)
    expect(summary.doraScopedVendors[0].vendor.id).toBe("v2") // critical wins
  })

  it("returns recentFindings limited to tagged + open + newest 12", () => {
    const findings: ScanFinding[] = []
    for (let i = 0; i < 20; i++) {
      findings.push(
        makeFinding(`${DORA_FINDING_PREFIX}v1-rule${i}`, {
          createdAtISO: new Date(2026, 4, i + 1).toISOString(),
        }),
      )
    }
    // Also one untagged finding (should be excluded)
    findings.push(makeFinding("other-finding-x", { createdAtISO: NOW }))
    const state = makeState({
      orgRegulatoryProfile: makeProfile(),
      findings,
      vendorRecords: [makeVendor("v1", { doraScope: { material: true } })],
    })
    const summary = buildRegulatoryScopeSummary(state)
    expect(summary.recentFindings).toHaveLength(12)
    expect(summary.recentFindings.every((f) => f.id.startsWith(DORA_FINDING_PREFIX))).toBe(true)
  })

  it("computes stats correctly (doraFindingsOpen + nis2FindingsOpen)", () => {
    const state = makeState({
      orgRegulatoryProfile: makeProfile(),
      vendorRecords: [makeVendor("v1", { doraScope: { material: true } })],
      aiSystems: [makeSystem("s1", { nis2EntityScope: { inScope: true } })],
      findings: [
        makeFinding(`${DORA_FINDING_PREFIX}v1-a`, { severity: "high" }),
        makeFinding(`${DORA_FINDING_PREFIX}v1-b`, { severity: "high" }),
        makeFinding(`${NIS2_FINDING_PREFIX}s1-a`, { severity: "critical", category: "NIS2" }),
      ],
    })
    const summary = buildRegulatoryScopeSummary(state)
    expect(summary.stats.doraFindingsOpen).toBe(2)
    expect(summary.stats.nis2FindingsOpen).toBe(1)
    expect(summary.stats.doraVendorCount).toBe(1)
    expect(summary.stats.nis2SystemCount).toBe(1)
    expect(summary.stats.doraVendorOpenGaps).toBe(2)
    expect(summary.stats.nis2SystemOpenGaps).toBe(1)
  })
})
