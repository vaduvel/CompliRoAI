/**
 * Sprint 009 — Tests pentru ai-data-discovery-store.
 * Mock-uim org-context + fs. Restul (state cache, ledger, findings-store)
 * trece prin codul real.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/server/org-context", () => ({
  getOrgContext: vi.fn(async () => ({
    orgId: "org-ai-disc-test",
    userId: "user-ai-disc",
    email: "ai@example.com",
    orgName: "Test AI Org",
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
  addFollowUpNote,
  createAIDataMapRecord,
  deleteAIDataMapRecord,
  generateAIExposureReport,
  getAIDataMapRecord,
  readAIDataMapRecords,
  readAIExposureReports,
  summarizeAIDataMap,
  updateAIDataMapRecord,
} from "@/lib/server/ai-data-discovery-store"
import { readState } from "@/lib/server/store"
import type { ComplianceEventActorInput } from "@/lib/compliance/events"
import type { AIDataDiscoveryIntake } from "@/lib/compliance/ai-data-discovery"

const ACTOR: ComplianceEventActorInput = {
  id: "user-ai-disc",
  label: "ai@example.com",
  role: "compliance",
  source: "session",
}
const ORG = "org-ai-disc-test"

beforeEach(async () => {
  vi.resetModules()
})

afterEach(() => {
  vi.clearAllMocks()
})

function makeIntake(overrides: Partial<AIDataDiscoveryIntake> = {}): AIDataDiscoveryIntake {
  return {
    toolName: "ChatGPT",
    vendor: "OpenAI",
    deploymentMode: "saas",
    useCaseCategory: "internal_copilot",
    useCaseDescription: "Asistare angajati",
    inputDataCategories: ["text"],
    outputDataCategories: ["text"],
    processesPersonalData: false,
    processesSpecialCategories: false,
    childrenData: false,
    vendorRegion: "US",
    trainingDataUsage: "opt_out_available",
    dpaSigned: true,
    subprocessorsDocumented: true,
    ...overrides,
  }
}

describe("ai-data-discovery-store — create + auto-finding", () => {
  it("createAIDataMapRecord cu HR + personal data + no DPA emite findings cu high severity", async () => {
    const { record, linkedFindingIds } = await createAIDataMapRecord(
      ORG,
      makeIntake({
        toolName: "HireVue AI",
        vendor: "HireVue",
        useCaseCategory: "hr_workplace",
        useCaseDescription: "Screening candidat CV",
        processesPersonalData: true,
        dpaSigned: false,
        vendorRegion: "US",
      }),
      ACTOR,
    )

    expect(record.id).toMatch(/^ai-data-/)
    expect(record.riskCandidate).toBe("high_risk_candidate")
    expect(record.linkedFindingIds.length).toBe(linkedFindingIds.length)
    expect(linkedFindingIds.length).toBeGreaterThanOrEqual(3)

    const state = await readState()
    const findings = (state.findings ?? []).filter((f) => linkedFindingIds.includes(f.id))
    expect(findings.length).toBe(linkedFindingIds.length)
    expect(findings.some((f) => f.title.includes("high-risk"))).toBe(true)
    expect(findings.some((f) => f.title.includes("Lipsă DPA"))).toBe(true)

    const createdEvt = (state.events ?? []).find(
      (e) => e.entityId === record.id && e.type === "ai-discovery.record.created",
    )
    expect(createdEvt).toBeTruthy()
    expect(createdEvt?.selfHash).toMatch(/^[0-9a-f]{64}$/)
  })

  it("createAIDataMapRecord minimal nu emite finding critic dar emite policy/literacy", async () => {
    const { record, linkedFindingIds } = await createAIDataMapRecord(
      ORG,
      makeIntake(),
      ACTOR,
    )
    expect(record.riskCandidate).toBe("minimal")
    expect(linkedFindingIds.length).toBeGreaterThanOrEqual(1)
    const state = await readState()
    const linked = (state.findings ?? []).filter((f) => linkedFindingIds.includes(f.id))
    expect(linked.some((f) => f.title.includes("AI literacy"))).toBe(true)
  })

  it("createAIDataMapRecord rejecteaza toolName lipsa", async () => {
    await expect(
      createAIDataMapRecord(ORG, makeIntake({ toolName: "" }), ACTOR),
    ).rejects.toThrow(/toolName/)
  })
})

describe("ai-data-discovery-store — read + summary", () => {
  it("readAIDataMapRecords + summarizeAIDataMap numara corect", async () => {
    await createAIDataMapRecord(
      ORG,
      makeIntake({
        toolName: "AcmeChat-summary-1",
        useCaseCategory: "hr_workplace",
        processesPersonalData: true,
        dpaSigned: false,
        vendorRegion: "US",
      }),
      ACTOR,
    )
    await createAIDataMapRecord(ORG, makeIntake({ toolName: "AcmeChat-summary-2" }), ACTOR)

    const { records, summary } = await readAIDataMapRecords(ORG)
    expect(records.length).toBeGreaterThanOrEqual(2)
    expect(summary.total).toBeGreaterThanOrEqual(2)
    expect(summary.highRiskCandidate).toBeGreaterThanOrEqual(1)
    expect(summary.noDpa).toBeGreaterThanOrEqual(1)
  })

  it("summarizeAIDataMap pe array gol returneaza zero", () => {
    const s = summarizeAIDataMap([])
    expect(s.total).toBe(0)
    expect(s.active).toBe(0)
    expect(s.highRiskCandidate).toBe(0)
  })
})

describe("ai-data-discovery-store — update + reevaluare risc", () => {
  it("updateAIDataMapRecord cu schimbare processesPersonalData re-evalueaza riscul", async () => {
    const { record } = await createAIDataMapRecord(ORG, makeIntake({ toolName: "ReEvalTool" }), ACTOR)
    expect(record.riskCandidate).toBe("minimal")

    const updated = await updateAIDataMapRecord(
      ORG,
      record.id,
      {
        processesPersonalData: true,
        dpaSigned: false,
      },
      ACTOR,
    )
    expect(updated).not.toBeNull()
    expect(updated?.riskCandidate).toBe("needs_human_review")
  })

  it("updateAIDataMapRecord cu id invalid returneaza null", async () => {
    const result = await updateAIDataMapRecord(ORG, "ai-data-doesnotexist", { notes: "x" }, ACTOR)
    expect(result).toBeNull()
  })

  it("updateAIDataMapRecord poate schimba status la deprecated", async () => {
    const { record } = await createAIDataMapRecord(ORG, makeIntake({ toolName: "DeprecateTool" }), ACTOR)
    const updated = await updateAIDataMapRecord(ORG, record.id, { status: "deprecated" }, ACTOR)
    expect(updated?.status).toBe("deprecated")
  })
})

describe("ai-data-discovery-store — delete", () => {
  it("deleteAIDataMapRecord sterge record + appendeaza event", async () => {
    const { record } = await createAIDataMapRecord(ORG, makeIntake({ toolName: "DeleteTool" }), ACTOR)
    const ok = await deleteAIDataMapRecord(ORG, record.id, ACTOR)
    expect(ok).toBe(true)
    const fetched = await getAIDataMapRecord(ORG, record.id)
    expect(fetched).toBeNull()
  })

  it("deleteAIDataMapRecord cu id invalid returneaza false", async () => {
    const ok = await deleteAIDataMapRecord(ORG, "ai-data-nope", ACTOR)
    expect(ok).toBe(false)
  })
})

describe("ai-data-discovery-store — follow-up notes", () => {
  it("addFollowUpNote concateneaza la notes cu prefix data + actor", async () => {
    const { record } = await createAIDataMapRecord(ORG, makeIntake({ toolName: "FollowUpTool" }), ACTOR)
    const updated = await addFollowUpNote(ORG, record.id, "Solicitat DPA de la vendor", ACTOR)
    expect(updated?.notes).toContain("Solicitat DPA de la vendor")
    expect(updated?.notes).toContain(ACTOR.label)
  })

  it("addFollowUpNote pe id invalid returneaza null", async () => {
    const result = await addFollowUpNote(ORG, "ai-data-x", "note", ACTOR)
    expect(result).toBeNull()
  })

  it("addFollowUpNote refuza note gol", async () => {
    await expect(addFollowUpNote(ORG, "ai-data-x", "   ", ACTOR)).rejects.toThrow()
  })
})

describe("ai-data-discovery-store — exposure report", () => {
  it("generateAIExposureReport agrega record-urile + persista + appendeaza event", async () => {
    await createAIDataMapRecord(
      ORG,
      makeIntake({
        toolName: "ExposureTool-1",
        useCaseCategory: "hr_workplace",
        processesPersonalData: true,
        dpaSigned: false,
      }),
      ACTOR,
    )

    const report = await generateAIExposureReport(ORG, ACTOR)
    expect(report.id).toMatch(/^ai-report-/)
    expect(report.scope.aiToolCount).toBeGreaterThanOrEqual(1)
    expect(report.markdown).toContain("# AI Exposure Report")

    const reports = await readAIExposureReports(ORG)
    expect(reports.some((r) => r.id === report.id)).toBe(true)

    const state = await readState()
    const evt = (state.events ?? []).find(
      (e) => e.entityId === report.id && e.type === "ai-discovery.report.generated",
    )
    expect(evt).toBeTruthy()
  })
})
