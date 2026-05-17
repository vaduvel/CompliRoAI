/**
 * Sprint 010 — Tests pentru vendor-review-store (CRUD + auto risk
 * evaluation + finding emission + summary + brief).
 *
 * Mock-uim org-context + fs ca sa rulam in-memory; restul lantului (state
 * cache, hash chain ledger, findings-store) trece prin codul real.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/server/org-context", () => ({
  getOrgContext: vi.fn(async () => ({
    orgId: "org-vendor-test",
    userId: "user-vendor-test",
    email: "vendor@example.com",
    orgName: "Test Vendor Org",
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
  approveVendor,
  buildBrief,
  createVendor,
  deleteVendor,
  getVendorById,
  readVendorRecords,
  rejectVendor,
  summarizeVendors,
  updateVendor,
} from "@/lib/server/vendor-review-store"
import { createAIDataMapRecord } from "@/lib/server/ai-data-discovery-store"
import type { ComplianceEventActorInput } from "@/lib/compliance/events"
import { readState } from "@/lib/server/store"
import type { VendorRecord } from "@/lib/compliance/types"

const ACTOR: ComplianceEventActorInput = {
  id: "user-vendor-test",
  label: "vendor@example.com",
  role: "compliance",
  source: "session",
}
const ORG = "org-vendor-test"

beforeEach(async () => {
  // Clear state cache by writing fresh empty state
  const { writeState } = await import("@/lib/server/store")
  const { initialComplianceState } = await import("@/lib/compliance/engine")
  await writeState(structuredClone(initialComplianceState))
})

afterEach(() => {
  vi.clearAllMocks()
})

describe("vendor-review-store — createVendor + auto finding emission", () => {
  it("creeaza vendor cu DPA missing + personal data → emite finding high si setteaza needs_dpa", async () => {
    // Adauga un AI data map cu personal data ca sa propage context
    await createAIDataMapRecord(
      ORG,
      {
        toolName: "ChatGPT",
        vendor: "OpenAI",
        deploymentMode: "saas",
        useCaseCategory: "customer_support",
        useCaseDescription: "Support clienti",
        inputDataCategories: ["chat"],
        outputDataCategories: ["responses"],
        processesPersonalData: true,
        processesSpecialCategories: false,
        childrenData: false,
        vendorRegion: "US",
        trainingDataUsage: "opt_out_available",
        dpaSigned: false,
        subprocessorsDocumented: false,
      },
      ACTOR,
    )

    const state = await readState()
    const aiMap = (state.aiDataMapRecords ?? [])[0]

    const { record, linkedFindingIds } = await createVendor(
      ORG,
      {
        name: "OpenAI",
        productUsed: "ChatGPT Enterprise",
        vendorRegion: "US",
        role: "processor",
        serviceCategory: "AI/LLM",
        linkedAIDataMapIds: aiMap ? [aiMap.id] : [],
        dpaStatus: "missing",
      },
      ACTOR,
    )

    expect(record.id).toMatch(/^vendor-/)
    expect(record.name).toBe("OpenAI")
    expect(record.reviewStatus).toBe("needs_dpa")
    expect(record.riskLevel).toBe("high")
    expect(linkedFindingIds.length).toBeGreaterThan(0)
  })

  it("creeaza vendor EU cu DPA signed + securitate completa → low risk + in_review", async () => {
    const { record } = await createVendor(
      ORG,
      {
        name: "Mistral AI",
        productUsed: "Mistral Large",
        vendorRegion: "EU",
        role: "processor",
        serviceCategory: "AI/LLM",
        dpaStatus: "signed",
        securityEvidence: {
          iso27001: true,
          soc2: true,
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
          reproducibilityGuarantees: true,
        },
      },
      ACTOR,
    )

    expect(record.reviewStatus).toBe("in_review")
    expect(["low", "minimal"]).toContain(record.riskLevel)
  })
})

describe("vendor-review-store — read + summary", () => {
  it("readVendorRecords returneaza summary corect", async () => {
    await createVendor(
      ORG,
      { name: "OpenAI", vendorRegion: "US", dpaStatus: "missing" },
      ACTOR,
    )
    await createVendor(
      ORG,
      { name: "Mistral", vendorRegion: "EU", dpaStatus: "signed" },
      ACTOR,
    )

    const { records, summary } = await readVendorRecords(ORG)
    expect(records.length).toBeGreaterThanOrEqual(2)
    expect(summary.total).toBeGreaterThanOrEqual(2)
  })

  it("getVendorById returneaza vendorul; null pentru id necunoscut", async () => {
    const { record } = await createVendor(
      ORG,
      { name: "TestGet", vendorRegion: "EU", dpaStatus: "signed" },
      ACTOR,
    )
    const found = await getVendorById(ORG, record.id)
    expect(found?.id).toBe(record.id)
    expect(await getVendorById(ORG, "vendor-inexistent")).toBeNull()
  })
})

describe("vendor-review-store — update re-evaluates risk + status", () => {
  it("update dpaStatus de la missing la signed → muta vendorul din needs_dpa", async () => {
    // Setup: vendor cu personal data linkage care declanseaza needs_dpa
    await createAIDataMapRecord(
      ORG,
      {
        toolName: "Claude",
        vendor: "Anthropic",
        deploymentMode: "saas",
        useCaseCategory: "internal_copilot",
        useCaseDescription: "Internal copilot",
        inputDataCategories: ["documents"],
        outputDataCategories: ["analysis"],
        processesPersonalData: true,
        processesSpecialCategories: false,
        childrenData: false,
        vendorRegion: "US",
        trainingDataUsage: "no_training",
        dpaSigned: false,
        subprocessorsDocumented: true,
      },
      ACTOR,
    )
    const state = await readState()
    const aiMap = state.aiDataMapRecords?.find((m) => m.toolName === "Claude")

    const { record } = await createVendor(
      ORG,
      {
        name: "Anthropic",
        vendorRegion: "US",
        dpaStatus: "missing",
        linkedAIDataMapIds: aiMap ? [aiMap.id] : [],
        transferMechanism: "scc_controller_processor",
      },
      ACTOR,
    )
    expect(record.reviewStatus).toBe("needs_dpa")

    const updated = await updateVendor(
      ORG,
      record.id,
      {
        dpaStatus: "signed",
        securityEvidence: {
          iso27001: true,
          soc2: true,
          encryptionInTransit: true,
          encryptionAtRest: true,
          mfaEnforced: true,
          auditLogsAvailable: true,
          incidentNotificationCommitmentHours: 48,
        },
      },
      ACTOR,
    )
    expect(updated?.reviewStatus).not.toBe("needs_dpa")
    expect(updated?.dpaStatus).toBe("signed")
  })

  it("update returneaza null pentru id necunoscut", async () => {
    const result = await updateVendor(ORG, "vendor-fake", { name: "X" }, ACTOR)
    expect(result).toBeNull()
  })
})

describe("vendor-review-store — approve + reject", () => {
  it("approveVendor seteaza reviewedByEmail + reviewStatus approved daca risk acceptabil", async () => {
    const { record } = await createVendor(
      ORG,
      {
        name: "ApprovableVendor",
        vendorRegion: "EU",
        dpaStatus: "signed",
        securityEvidence: {
          iso27001: true,
          soc2: true,
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
      },
      ACTOR,
    )

    const approved = await approveVendor(ORG, record.id, "dpo@firma.ro", ACTOR)
    expect(approved?.reviewedByEmail).toBe("dpo@firma.ro")
    expect(approved?.reviewStatus).toBe("approved")
  })

  it("rejectVendor adauga notes + status rejected", async () => {
    const { record } = await createVendor(
      ORG,
      {
        name: "RejectMe",
        vendorRegion: "US",
        dpaStatus: "signed",
        securityEvidence: {
          iso27001: true,
          soc2: true,
          encryptionInTransit: true,
          encryptionAtRest: true,
          mfaEnforced: true,
          auditLogsAvailable: true,
        },
      },
      ACTOR,
    )

    const rejected = await rejectVendor(ORG, record.id, "Risc neacceptabil pe sovranitate", ACTOR)
    expect(rejected?.reviewStatus).toBe("rejected")
    expect(rejected?.notes).toContain("Risc neacceptabil")
  })

  it("rejectVendor throw pentru motiv gol", async () => {
    const { record } = await createVendor(
      ORG,
      { name: "Test", vendorRegion: "EU", dpaStatus: "signed" },
      ACTOR,
    )
    await expect(rejectVendor(ORG, record.id, "", ACTOR)).rejects.toThrow(/Motiv obligatoriu/)
  })

  it("approveVendor throw pentru email gol", async () => {
    const { record } = await createVendor(
      ORG,
      { name: "Test", vendorRegion: "EU", dpaStatus: "signed" },
      ACTOR,
    )
    await expect(approveVendor(ORG, record.id, "", ACTOR)).rejects.toThrow(/Email reviewer/)
  })
})

describe("vendor-review-store — deleteVendor", () => {
  it("delete returneaza true si elimina vendorul", async () => {
    const { record } = await createVendor(
      ORG,
      { name: "DeleteMe", vendorRegion: "EU", dpaStatus: "signed" },
      ACTOR,
    )
    const removed = await deleteVendor(ORG, record.id, ACTOR)
    expect(removed).toBe(true)
    expect(await getVendorById(ORG, record.id)).toBeNull()
  })

  it("delete returneaza false pentru id necunoscut", async () => {
    expect(await deleteVendor(ORG, "vendor-inexistent", ACTOR)).toBe(false)
  })
})

describe("vendor-review-store — brief generator", () => {
  it("buildBrief returneaza markdown valid", async () => {
    const { record } = await createVendor(
      ORG,
      {
        name: "BriefTest",
        productUsed: "Test API",
        vendorRegion: "US",
        dpaStatus: "missing",
      },
      ACTOR,
    )
    const brief = await buildBrief(ORG, record.id, "Test Org SRL")
    expect(brief).not.toBeNull()
    expect(brief).toContain("# Brief Vendor — BriefTest")
    expect(brief).toContain("**Operator:** Test Org SRL")
    expect(brief).toContain("## 1. DPA")
  })

  it("buildBrief returneaza null pentru id necunoscut", async () => {
    const brief = await buildBrief(ORG, "vendor-fake")
    expect(brief).toBeNull()
  })
})

describe("vendor-review-store — summarizeVendors pure function", () => {
  it("counteaza statusurile corect", () => {
    const vendors: VendorRecord[] = [
      { reviewStatus: "approved" } as VendorRecord,
      { reviewStatus: "approved" } as VendorRecord,
      { reviewStatus: "needs_dpa" } as VendorRecord,
      { reviewStatus: "rejected" } as VendorRecord,
      { reviewStatus: "in_review", riskLevel: "high" } as VendorRecord,
      { reviewStatus: "expired", riskLevel: "critical" } as VendorRecord,
    ]
    const summary = summarizeVendors(vendors)
    expect(summary.total).toBe(6)
    expect(summary.approved).toBe(2)
    expect(summary.needsDpa).toBe(1)
    expect(summary.rejected).toBe(1)
    expect(summary.inReview).toBe(1)
    expect(summary.expired).toBe(1)
    expect(summary.highRisk).toBe(1)
    expect(summary.criticalRisk).toBe(1)
  })
})
