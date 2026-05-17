// Sprint 017 — oversight-store tests.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/server/org-context", () => ({
  getOrgContext: vi.fn(async () => ({
    orgId: "org-oversight-test",
    userId: "user-oversight-test",
    email: "oversight@example.com",
    orgName: "Test Oversight Org",
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
  attachEvidence,
  buildOversightMarkdown,
  createProtocol,
  deleteProtocol,
  getOversightProtocolById,
  markProtocolApproved,
  markProtocolRejected,
  readOversightProtocols,
  summarizeOversightProtocols,
  updateProtocol,
  type CreateOversightInput,
} from "@/lib/server/oversight-store"

const ACTOR: ComplianceEventActorInput = {
  id: "user-oversight-test",
  label: "oversight@example.com",
  role: "compliance",
  source: "session",
}
const ORG = "org-oversight-test"

function baseInput(overrides: Partial<CreateOversightInput> = {}): CreateOversightInput {
  return {
    title: "Oversight test",
    linkedAISystemId: "sys-1",
    oversightModel: "human_in_the_loop",
    capabilitiesCovered: [
      "understand_capabilities",
      "aware_of_automation_bias",
      "interpret_output_correctly",
      "decide_not_to_use",
      "intervene_or_stop",
    ],
    responsibleHumans: [
      {
        email: "dpo@org.ro",
        role: "DPO",
        competenceLevel: "expert",
        hasAuthorityToOverride: true,
        hasSupportTeam: true,
      },
    ],
    escalationSteps: [
      {
        triggerCondition: "Risc >0.8",
        escalateToEmail: "mgr@org.ro",
        escalateToRole: "Manager",
        slaHours: 4,
        notificationMethod: "email",
      },
    ],
    contestationProcedure: {
      channelDescription: "Email dpo@org.ro pentru contestație",
      acknowledgementSlaHours: 24,
      resolutionSlaDays: 30,
      reviewerRole: "DPO",
      evidencePreservation: "Log-uri 3 ani",
    },
    stopProcedure: {
      stopButtonAvailable: true,
      stopButtonLocation: "Admin panel",
      fallbackMode: "manual_processing",
      fallbackDescription: "Operatori preiau",
      testFrequency: "quarterly",
    },
    evidenceChecklist: ["Training operator"],
    ...overrides,
  }
}

beforeEach(async () => {
  await mutateFreshStateForOrg(ORG, (s) => ({
    ...s,
    humanOversightProtocols: [],
    findings: [],
    events: [],
    aiSystems: [
      {
        id: "sys-1",
        name: "HR Screening AI",
        purpose: "hr-screening",
        vendor: "TestVendor",
        modelType: "ml",
        usesPersonalData: true,
        makesAutomatedDecisions: true,
        impactsRights: true,
        hasHumanReview: true,
        riskLevel: "high",
        recommendedActions: [],
        createdAtISO: "2026-05-01T00:00:00Z",
      },
      {
        id: "sys-bio",
        name: "Face Match",
        purpose: "biometric-identification",
        vendor: "TestVendor",
        modelType: "cnn",
        usesPersonalData: true,
        makesAutomatedDecisions: true,
        impactsRights: true,
        hasHumanReview: true,
        riskLevel: "high",
        recommendedActions: [],
        createdAtISO: "2026-05-01T00:00:00Z",
      },
    ],
  }))
})

afterEach(() => {
  vi.clearAllMocks()
})

describe("oversight-store — CRUD basic", () => {
  it("createProtocol salvează + emite event oversight.created", async () => {
    const rec = await createProtocol(ORG, baseInput(), ACTOR, "Org SRL")
    expect(rec.id).toMatch(/^oversight-/)
    expect(rec.completeness).toBe("complete")
    expect(rec.status).toBe("draft")

    const state = await readState()
    const evt = state.events?.find(
      (e) => e.entityId === rec.id && e.type === "oversight.created",
    )
    expect(evt).toBeTruthy()
    expect(evt?.selfHash).toMatch(/^[0-9a-f]{64}$/)
  })

  it("createProtocol gol emite findings pentru capacități lipsă", async () => {
    const rec = await createProtocol(
      ORG,
      baseInput({
        capabilitiesCovered: [],
        responsibleHumans: [],
        escalationSteps: [],
        contestationProcedure: undefined,
        stopProcedure: undefined,
      }),
      ACTOR,
    )
    expect(rec.linkedFindingIds.length).toBeGreaterThan(0)
    const state = await readState()
    const finding = state.findings?.find((f) => rec.linkedFindingIds.includes(f.id))
    expect(finding?.title).toMatch(/Art\. 14|Art\. 26/)
  })

  it("createProtocol pe biometric system fără two_person_rule emite finding CRITICAL", async () => {
    const rec = await createProtocol(
      ORG,
      baseInput({
        linkedAISystemId: "sys-bio",
        oversightModel: "human_in_the_loop",
      }),
      ACTOR,
    )
    const state = await readState()
    const biometricFinding = state.findings?.find(
      (f) =>
        rec.linkedFindingIds.includes(f.id) && f.title.match(/Biometric/),
    )
    expect(biometricFinding).toBeTruthy()
    expect(biometricFinding?.severity).toBe("critical")
  })

  it("readOversightProtocols + summary totalează corect", async () => {
    await createProtocol(ORG, baseInput({ title: "P1" }), ACTOR)
    await createProtocol(ORG, baseInput({ title: "P2", capabilitiesCovered: [] }), ACTOR)
    const { records, summary } = await readOversightProtocols(ORG)
    expect(records.length).toBe(2)
    expect(summary.total).toBe(2)
    expect(summary.complete).toBeGreaterThanOrEqual(1)
    expect(summary.incomplete).toBeGreaterThanOrEqual(1)
  })

  it("updateProtocol merge patch + re-evaluează completeness", async () => {
    const created = await createProtocol(
      ORG,
      baseInput({ capabilitiesCovered: ["understand_capabilities"] }),
      ACTOR,
    )
    expect(created.completeness).toBe("incomplete")
    const updated = await updateProtocol(
      ORG,
      created.id,
      {
        capabilitiesCovered: [
          "understand_capabilities",
          "aware_of_automation_bias",
          "interpret_output_correctly",
          "decide_not_to_use",
          "intervene_or_stop",
        ],
      },
      ACTOR,
    )
    expect(updated).toBeTruthy()
    expect(updated!.completeness).toBe("complete")
  })

  it("deleteProtocol șterge + emite event oversight.deleted", async () => {
    const created = await createProtocol(ORG, baseInput(), ACTOR)
    const removed = await deleteProtocol(ORG, created.id, ACTOR)
    expect(removed).toBe(true)
    const after = await getOversightProtocolById(ORG, created.id)
    expect(after).toBeNull()
  })
})

describe("oversight-store — approve / reject", () => {
  it("markProtocolApproved setează nextReviewISO + status approved", async () => {
    const created = await createProtocol(ORG, baseInput(), ACTOR)
    const approved = await markProtocolApproved(
      ORG,
      created.id,
      "dpo@org.ro",
      ACTOR,
    )
    expect(approved!.status).toBe("approved")
    expect(approved!.approvedByEmail).toBe("dpo@org.ro")
    expect(approved!.nextReviewISO).toBeTruthy()
    // ~6 luni în viitor
    const diffDays =
      (new Date(approved!.nextReviewISO!).getTime() - Date.now()) / 86_400_000
    expect(diffDays).toBeGreaterThan(170)
    expect(diffDays).toBeLessThan(200)
  })

  it("markProtocolApproved fără email valid aruncă", async () => {
    const created = await createProtocol(ORG, baseInput(), ACTOR)
    await expect(markProtocolApproved(ORG, created.id, "", ACTOR)).rejects.toThrow()
    await expect(
      markProtocolApproved(ORG, created.id, "noemailhere", ACTOR),
    ).rejects.toThrow()
  })

  it("markProtocolRejected fără motiv aruncă", async () => {
    const created = await createProtocol(ORG, baseInput(), ACTOR)
    await expect(markProtocolRejected(ORG, created.id, "", ACTOR)).rejects.toThrow()
  })

  it("markProtocolRejected setează rejectionReason + status rejected", async () => {
    const created = await createProtocol(ORG, baseInput(), ACTOR)
    const rejected = await markProtocolRejected(
      ORG,
      created.id,
      "Lipsește dovada training",
      ACTOR,
    )
    expect(rejected!.status).toBe("rejected")
    expect(rejected!.rejectionReason).toBe("Lipsește dovada training")
  })
})

describe("oversight-store — evidence attach", () => {
  it("attachEvidence adaugă item în evidenceItems + event oversight.evidence_attached", async () => {
    const created = await createProtocol(ORG, baseInput(), ACTOR)
    const updated = await attachEvidence(
      ORG,
      created.id,
      {
        type: "training_record",
        description: "Certificat training operatori",
        url: "https://example.com/cert.pdf",
      },
      ACTOR,
    )
    expect(updated!.evidenceItems.length).toBe(1)
    expect(updated!.evidenceItems[0].type).toBe("training_record")
    expect(updated!.evidenceItems[0].url).toBe("https://example.com/cert.pdf")
    const state = await readState()
    const evt = state.events?.find(
      (e) => e.entityId === created.id && e.type === "oversight.evidence_attached",
    )
    expect(evt).toBeTruthy()
  })

  it("attachEvidence fără descriere aruncă", async () => {
    const created = await createProtocol(ORG, baseInput(), ACTOR)
    await expect(
      attachEvidence(
        ORG,
        created.id,
        { type: "log", description: "" },
        ACTOR,
      ),
    ).rejects.toThrow()
  })
})

describe("oversight-store — markdown export + summary", () => {
  it("buildOversightMarkdown generează MD complet", async () => {
    const created = await createProtocol(ORG, baseInput({ title: "Export MD" }), ACTOR)
    const md = buildOversightMarkdown(created, "Org SRL", "HR Screening AI")
    expect(md).toContain("# Oversight Protocol — Export MD")
    expect(md).toContain("Org SRL")
    expect(md).toContain("## A. Model oversight + sistem AI")
    expect(md).toContain("## E. Stop + fallback")
  })

  it("summarizeOversightProtocols numără status + completeness", async () => {
    const r1 = await createProtocol(ORG, baseInput({ title: "R1" }), ACTOR)
    await createProtocol(
      ORG,
      baseInput({ title: "R2", capabilitiesCovered: [] }),
      ACTOR,
    )
    await markProtocolApproved(ORG, r1.id, "dpo@org.ro", ACTOR)
    const { summary } = await readOversightProtocols(ORG)
    expect(summary.total).toBe(2)
    expect(summary.approved).toBeGreaterThanOrEqual(1)
    expect(summary.complete).toBeGreaterThanOrEqual(1)
    expect(summary.incomplete).toBeGreaterThanOrEqual(1)
  })

  it("summarizeOversightProtocols pe array gol returnează 0-uri", () => {
    const s = summarizeOversightProtocols([])
    expect(s.total).toBe(0)
    expect(s.approved).toBe(0)
  })
})
