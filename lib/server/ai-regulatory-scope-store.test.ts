/**
 * Sprint 012 — Tests pentru ai-regulatory-scope-store.
 *
 * Strategie identică cu findings-store.test.ts: stub org-context + fs-safe
 * + node:fs ca să rulăm engine-ul real fără să atingem disk-ul.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/server/org-context", () => ({
  getOrgContext: vi.fn(async () => ({
    orgId: "org-test-1",
    userId: "user-test-1",
    email: "test@example.com",
    orgName: "Test Org",
    workspaceMode: "solo",
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

import {
  evaluateAndMergeDoraFindings,
  evaluateAndMergeNis2Findings,
  getRegulatoryScopeSummary,
  isDoraEntityType,
  isNis2EntityClass,
  isNis2Sector,
  readRegulatoryProfile,
  updateRegulatoryProfile,
} from "@/lib/server/ai-regulatory-scope-store"
import type { ComplianceEventActorInput } from "@/lib/compliance/events"
import { mutateFreshStateForOrg, readState } from "@/lib/server/store"
import type {
  AISystemRecord,
  VendorRecord,
} from "@/lib/compliance/types"

const ORG = "org-test-1"
const ACTOR: ComplianceEventActorInput = {
  id: "user-test-1",
  label: "test@example.com",
  role: "owner",
  source: "session",
}

beforeEach(async () => {
  // Hard-reset state by re-importing the module fresh.
  vi.resetModules()
})

afterEach(() => {
  vi.clearAllMocks()
})

// State helper — reset to empty per-test.
async function resetState() {
  await mutateFreshStateForOrg(ORG, () => ({
    highRisk: 0,
    lowRisk: 0,
    gdprProgress: 0,
    alerts: [],
    findings: [],
    events: [],
    generatedDocuments: [],
    aiSystems: [],
    literacyRecords: [],
  }))
}

describe("ai-regulatory-scope-store · type guards", () => {
  it("isDoraEntityType validates", () => {
    expect(isDoraEntityType("credit_institution")).toBe(true)
    expect(isDoraEntityType("not_a_type")).toBe(false)
    expect(isDoraEntityType(undefined)).toBe(false)
  })
  it("isNis2EntityClass validates", () => {
    expect(isNis2EntityClass("essential")).toBe(true)
    expect(isNis2EntityClass("bogus")).toBe(false)
  })
  it("isNis2Sector validates", () => {
    expect(isNis2Sector("digital_infrastructure")).toBe(true)
    expect(isNis2Sector("nope")).toBe(false)
  })
})

describe("ai-regulatory-scope-store · updateRegulatoryProfile", () => {
  beforeEach(async () => {
    await resetState()
  })

  it("creates a profile if none exists", async () => {
    const before = await readRegulatoryProfile(ORG)
    expect(before).toBeNull()
    const profile = await updateRegulatoryProfile(
      ORG,
      {
        doraApplies: true,
        doraEntityType: "credit_institution",
        nis2EntityClass: "essential",
        nis2Sectors: ["banking"],
      },
      ACTOR,
    )
    expect(profile.doraApplies).toBe(true)
    expect(profile.doraEntityType).toBe("credit_institution")
    expect(profile.nis2EntityClass).toBe("essential")
    expect(profile.nis2Sectors).toEqual(["banking"])
    expect(profile.declaredByEmail).toBe(ACTOR.label)
    expect(profile.createdAtISO).toBeDefined()
  })

  it("normalizes coherence: doraApplies=false → entity=not_applicable", async () => {
    const profile = await updateRegulatoryProfile(
      ORG,
      {
        doraApplies: false,
        doraEntityType: "credit_institution",
        nis2EntityClass: "not_in_scope",
        nis2Sectors: ["banking"], // must be reset
      },
      ACTOR,
    )
    expect(profile.doraEntityType).toBe("not_applicable")
    expect(profile.nis2Sectors).toEqual([])
  })

  it("emits stable review-required findings when org becomes in-scope", async () => {
    await updateRegulatoryProfile(
      ORG,
      {
        doraApplies: true,
        doraEntityType: "credit_institution",
        nis2EntityClass: "important",
        nis2Sectors: ["digital_infrastructure"],
      },
      ACTOR,
    )
    const state = await readState()
    const doraReview = state.findings.find(
      (f) => f.id === "dora-ai-vendor-REVIEW_REQUIRED",
    )
    const nis2Review = state.findings.find(
      (f) => f.id === "nis2-ai-system-REVIEW_REQUIRED",
    )
    expect(doraReview).toBeDefined()
    expect(nis2Review).toBeDefined()
    expect(doraReview?.findingStatus).toBe("open")
  })

  it("does not duplicate review findings on a second update", async () => {
    await updateRegulatoryProfile(
      ORG,
      {
        doraApplies: true,
        doraEntityType: "credit_institution",
        nis2EntityClass: "essential",
        nis2Sectors: ["banking"],
      },
      ACTOR,
    )
    await updateRegulatoryProfile(
      ORG,
      { notes: "updated note" },
      ACTOR,
    )
    const state = await readState()
    const doraReviews = state.findings.filter(
      (f) => f.id === "dora-ai-vendor-REVIEW_REQUIRED",
    )
    expect(doraReviews).toHaveLength(1)
  })

  it("appends 'org.regulatory_profile.updated' event with metadata", async () => {
    await updateRegulatoryProfile(
      ORG,
      {
        doraApplies: true,
        doraEntityType: "credit_institution",
        nis2EntityClass: "important",
        nis2Sectors: ["banking", "financial_markets"],
      },
      ACTOR,
    )
    const state = await readState()
    const evt = state.events.find(
      (e) => e.type === "org.regulatory_profile.updated",
    )
    expect(evt).toBeDefined()
    expect(evt?.metadata?.doraApplies).toBe(true)
    expect(evt?.metadata?.sectorCount).toBe(2)
  })
})

describe("ai-regulatory-scope-store · evaluateAndMerge*Findings", () => {
  beforeEach(async () => {
    await resetState()
    await updateRegulatoryProfile(
      ORG,
      {
        doraApplies: true,
        doraEntityType: "credit_institution",
        nis2EntityClass: "essential",
        nis2Sectors: ["banking"],
      },
      ACTOR,
    )
  })

  function baseVendor(): VendorRecord {
    return {
      id: "v-1",
      orgId: ORG,
      name: "Vendor One",
      productUsed: "AI Service",
      vendorRegion: "EU",
      role: "processor",
      serviceCategory: "AI/LLM",
      linkedAISystemIds: [],
      linkedAIDataMapIds: [],
      dpaStatus: "missing", // triggers ict_contract_missing
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
        incidentNotificationCommitmentHours: 24,
      },
      aiTerms: {
        trainingDataOptOut: "yes",
        inputDataRetention: "no_retention",
        outputRightsOwnership: "client",
        modelTransparency: "documented",
        reproducibilityGuarantees: true,
      },
      riskLevel: "high",
      riskReasons: [],
      reviewStatus: "needs_dpa",
      humanReviewRequired: true,
      linkedFindingIds: [],
      createdAtISO: new Date().toISOString(),
      updatedAtISO: new Date().toISOString(),
      doraScope: {
        material: true,
        criticalForService: "credit decisioning",
        assessmentNote: "exit plan documented",
      },
    }
  }

  function baseSystem(): AISystemRecord {
    return {
      id: "s-1",
      name: "Fraud AI",
      purpose: "fraud-detection",
      vendor: "InternalSecCo",
      modelType: "transformer",
      usesPersonalData: true,
      makesAutomatedDecisions: true,
      impactsRights: true,
      hasHumanReview: false, // triggers human_oversight_missing
      riskLevel: "high",
      recommendedActions: ["fallback documented", "incident escalation playbook"],
      createdAtISO: new Date().toISOString(),
      policyAttestationStatus: "attested",
      nis2EntityScope: { inScope: true, service: "fraud monitoring" },
    }
  }

  it("evaluateAndMergeDoraFindings adds gap findings", async () => {
    const result = await evaluateAndMergeDoraFindings(ORG, baseVendor(), ACTOR)
    expect(result.gaps).toContain("ict_contract_missing")
    expect(result.added).toBeGreaterThanOrEqual(1)
    const state = await readState()
    const fids = state.findings.map((f) => f.id)
    expect(fids).toContain("dora-ai-vendor-v-1-ict_contract_missing")
  })

  it("evaluateAndMergeDoraFindings is idempotent", async () => {
    await evaluateAndMergeDoraFindings(ORG, baseVendor(), ACTOR)
    const second = await evaluateAndMergeDoraFindings(ORG, baseVendor(), ACTOR)
    expect(second.added).toBe(0)
    expect(second.existing).toBeGreaterThan(0)
    const state = await readState()
    const dupes = state.findings.filter(
      (f) => f.id === "dora-ai-vendor-v-1-ict_contract_missing",
    )
    expect(dupes).toHaveLength(1)
  })

  it("evaluateAndMergeNis2Findings adds gap findings", async () => {
    const result = await evaluateAndMergeNis2Findings(ORG, baseSystem(), ACTOR)
    expect(result.gaps).toContain("human_oversight_missing")
    expect(result.added).toBeGreaterThanOrEqual(1)
    const state = await readState()
    const fids = state.findings.map((f) => f.id)
    expect(fids).toContain("nis2-ai-system-s-1-human_oversight_missing")
  })

  it("evaluateAndMergeNis2Findings respects no-profile (returns zero adds)", async () => {
    // wipe profile
    await mutateFreshStateForOrg(ORG, (s) => ({
      ...s,
      orgRegulatoryProfile: undefined,
    }))
    const result = await evaluateAndMergeNis2Findings(ORG, baseSystem(), ACTOR)
    expect(result.added).toBe(0)
  })
})

describe("ai-regulatory-scope-store · getRegulatoryScopeSummary", () => {
  beforeEach(async () => {
    await resetState()
  })

  it("returns empty summary when no profile", async () => {
    const sum = await getRegulatoryScopeSummary(ORG)
    expect(sum.profile).toBeNull()
    expect(sum.stats.doraVendorCount).toBe(0)
    expect(sum.stats.nis2SystemCount).toBe(0)
  })

  it("returns profile + counts after setup", async () => {
    await updateRegulatoryProfile(
      ORG,
      {
        doraApplies: true,
        doraEntityType: "credit_institution",
        nis2EntityClass: "essential",
        nis2Sectors: ["banking"],
      },
      ACTOR,
    )
    const sum = await getRegulatoryScopeSummary(ORG)
    expect(sum.profile?.doraApplies).toBe(true)
    expect(sum.profile?.nis2EntityClass).toBe("essential")
  })
})
