// FRIA Store — Sprint 016 tests.
//
// Mock-uim org-context + fs ca sa rulam testele in-memory; restul lantului
// (state cache, hash chain ledger, findings-store) trece prin codul real.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/server/org-context", () => ({
  getOrgContext: vi.fn(async () => ({
    orgId: "org-fria-test",
    userId: "user-fria-test",
    email: "fria@example.com",
    orgName: "Test FRIA Org",
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

import {
  buildFriaMarkdown,
  createFria,
  deleteFria,
  getFriaRecordById,
  markFriaApproved,
  markFriaRejected,
  notifyAuthority,
  readFriaRecords,
  reuseDpia,
  summarizeFriaRecords,
  updateFria,
} from "@/lib/server/fria-store"
import type { ComplianceEventActorInput } from "@/lib/compliance/events"
import { mutateFreshStateForOrg, readState } from "@/lib/server/store"
import type { CreateFriaInput } from "@/lib/server/fria-store"

const ACTOR: ComplianceEventActorInput = {
  id: "user-fria-test",
  label: "fria@example.com",
  role: "compliance",
  source: "session",
}
const ORG = "org-fria-test"

function baseInput(overrides: Partial<CreateFriaInput> = {}): CreateFriaInput {
  return {
    title: "FRIA test",
    linkedAISystemId: "sys-test-1",
    deployerType: "public_body",
    processDescription: "Test FRIA pentru sistem AI trierea CV-urilor.",
    frequencyOfUse: "daily",
    affectedGroups: [{ category: "Candidați", estimatedCount: 100, vulnerabilities: [] }],
    rightsAtRisk: ["non_discrimination"],
    riskAssessments: [
      {
        rightAffected: "non_discrimination",
        description: "Risc bias",
        likelihood: "possible",
        severity: "moderate",
        riskLevel: "medium",
        mitigationMeasures: ["Bias audit"],
        residualRisk: "low",
      },
    ],
    humanOversightMeasures: [
      {
        measureType: "human_in_loop",
        description: "Recrutor validează",
        responsibleRole: "Recrutor HR",
        triggerConditions: "Toate deciziile",
        documentedAtISO: "2026-05-01T00:00:00Z",
      },
    ],
    complaintMechanism:
      "Persoanele afectate pot trimite plângere la dpo@org.ro în max 30 zile, conform GDPR Art. 77.",
    notifyAuthorityRequired: false,
    ...overrides,
  }
}

beforeEach(async () => {
  vi.resetModules()
  // Reset state cache to isolate tests
  await mutateFreshStateForOrg(ORG, (s) => ({
    ...s,
    friaRecords: [],
    findings: [],
    dpiaRecords: [],
    events: [],
  }))
})

afterEach(() => {
  vi.clearAllMocks()
})

describe("fria-store — CRUD basic", () => {
  it("createFria salvează record + emite event fria.created", async () => {
    const record = await createFria(ORG, baseInput(), ACTOR, "Test Org")
    expect(record.id).toMatch(/^fria-/)
    expect(record.title).toBe("FRIA test")
    expect(record.deployerType).toBe("public_body")
    expect(record.overallRiskScore).toBeGreaterThan(0)
    expect(record.status).toBe("screening_done")

    const state = await readState()
    const evt = state.events?.find((e) => e.entityId === record.id && e.type === "fria.created")
    expect(evt).toBeTruthy()
    expect(evt?.selfHash).toMatch(/^[0-9a-f]{64}$/)
  })

  it("createFria emite findings pentru lipsă mecanism plângere", async () => {
    const record = await createFria(
      ORG,
      baseInput({ complaintMechanism: "" }),
      ACTOR,
      "Test Org",
    )
    expect(record.linkedFindingIds.length).toBeGreaterThan(0)
    const state = await readState()
    const finding = state.findings?.find((f) =>
      record.linkedFindingIds.includes(f.id),
    )
    expect(finding?.title).toMatch(/Art\. 27\(1\)\(f\)/)
  })

  it("readFriaRecords + summarize calculează corect totalurile", async () => {
    await createFria(ORG, baseInput({ title: "FRIA 1" }), ACTOR)
    await createFria(ORG, baseInput({ title: "FRIA 2" }), ACTOR)
    const { records, summary } = await readFriaRecords(ORG)
    expect(records.length).toBe(2)
    expect(summary.total).toBe(2)
  })

  it("updateFria merge patch + re-evaluează când risks schimbă", async () => {
    const created = await createFria(ORG, baseInput(), ACTOR)
    const updated = await updateFria(
      ORG,
      created.id,
      {
        riskAssessments: [
          {
            rightAffected: "non_discrimination",
            description: "Risk escalat",
            likelihood: "almost_certain",
            severity: "catastrophic",
            riskLevel: "critical",
            mitigationMeasures: [],
            residualRisk: "critical",
          },
        ],
      },
      ACTOR,
    )
    expect(updated).toBeTruthy()
    expect(updated!.overallRiskLevel).toBe("critical")
    const state = await readState()
    const evt = state.events?.find((e) => e.entityId === created.id && e.type === "fria.updated")
    expect(evt).toBeTruthy()
  })

  it("updateFria pe id inexistent returnează null", async () => {
    const result = await updateFria(ORG, "fria-nonexistent", { notes: "x" }, ACTOR)
    expect(result).toBeNull()
  })

  it("deleteFria șterge + emite event fria.deleted", async () => {
    const created = await createFria(ORG, baseInput(), ACTOR)
    const removed = await deleteFria(ORG, created.id, ACTOR)
    expect(removed).toBe(true)
    const after = await getFriaRecordById(ORG, created.id)
    expect(after).toBeNull()
    const state = await readState()
    const evt = state.events?.find((e) => e.entityId === created.id && e.type === "fria.deleted")
    expect(evt).toBeTruthy()
  })

  it("deleteFria pe id inexistent returnează false", async () => {
    const removed = await deleteFria(ORG, "fria-not-here", ACTOR)
    expect(removed).toBe(false)
  })
})

describe("fria-store — workflow approve/reject", () => {
  it("markFriaApproved setează approvedBy + approvedAt + status approved", async () => {
    const created = await createFria(ORG, baseInput(), ACTOR)
    const approved = await markFriaApproved(ORG, created.id, "dpo@org.ro", ACTOR)
    expect(approved).toBeTruthy()
    expect(approved!.status).toBe("approved")
    expect(approved!.approvedByEmail).toBe("dpo@org.ro")
    expect(approved!.approvedAtISO).toBeTruthy()
    const state = await readState()
    const evt = state.events?.find((e) => e.entityId === created.id && e.type === "fria.approved")
    expect(evt).toBeTruthy()
  })

  it("markFriaRejected setează rejectionReason + status rejected", async () => {
    const created = await createFria(ORG, baseInput(), ACTOR)
    const rejected = await markFriaRejected(
      ORG,
      created.id,
      "Lipsesc dovezi de bias audit",
      ACTOR,
    )
    expect(rejected!.status).toBe("rejected")
    expect(rejected!.rejectionReason).toBe("Lipsesc dovezi de bias audit")
    const state = await readState()
    const evt = state.events?.find((e) => e.entityId === created.id && e.type === "fria.rejected")
    expect(evt).toBeTruthy()
  })

  it("markFriaRejected fără motiv aruncă eroare", async () => {
    const created = await createFria(ORG, baseInput(), ACTOR)
    await expect(markFriaRejected(ORG, created.id, "", ACTOR)).rejects.toThrow()
  })
})

describe("fria-store — authority notification (Art. 27(3))", () => {
  it("notifyAuthority setează notifyAuthorityName + notifiedAtISO + referință", async () => {
    const created = await createFria(
      ORG,
      baseInput({ notifyAuthorityRequired: true }),
      ACTOR,
    )
    const notified = await notifyAuthority(
      ORG,
      created.id,
      "ADR — Autoritatea pentru Digitalizarea României",
      "ADR-FRIA-2026/0042",
      ACTOR,
    )
    expect(notified!.notifyAuthorityName).toMatch(/ADR/)
    expect(notified!.notifiedAtISO).toBeTruthy()
    expect(notified!.authorityReference).toBe("ADR-FRIA-2026/0042")
    const state = await readState()
    const evt = state.events?.find(
      (e) => e.entityId === created.id && e.type === "fria.authority_notified",
    )
    expect(evt).toBeTruthy()
  })

  it("notifyAuthority fără nume / referință aruncă eroare", async () => {
    const created = await createFria(ORG, baseInput(), ACTOR)
    await expect(notifyAuthority(ORG, created.id, "", "ref", ACTOR)).rejects.toThrow()
    await expect(notifyAuthority(ORG, created.id, "ANSPDCP", "", ACTOR)).rejects.toThrow()
  })
})

describe("fria-store — Art. 27(4) DPIA reuse", () => {
  it("reuseDpia setează linkedDpiaRecordId + emite event fria.dpia_reused", async () => {
    // Mai întâi adăugăm un DPIA în state ca să poată fi referențiat
    await mutateFreshStateForOrg(ORG, (s) => ({
      ...s,
      dpiaRecords: [
        ...(s.dpiaRecords ?? []),
        {
          id: "dpia-existing",
          title: "DPIA existent",
          processingPurpose: "Test",
          processingDescription: "Test",
          dataCategories: [],
          dataSubjects: [],
          legalBasis: "GDPR Art. 6",
          specialCategories: false,
          automatedDecisionMaking: true,
          largeScaleProcessing: false,
          necessityAssessment: "Test",
          proportionalityAssessment: "Test",
          risks: [],
          mitigationMeasures: [],
          residualRisk: "medium",
          status: "approved",
          owner: "DPO",
          createdAtISO: "2026-05-01T00:00:00Z",
          updatedAtISO: "2026-05-01T00:00:00Z",
        },
      ],
    }))

    const fria = await createFria(ORG, baseInput(), ACTOR)
    const updated = await reuseDpia(ORG, fria.id, "dpia-existing", ACTOR)
    expect(updated!.linkedDpiaRecordId).toBe("dpia-existing")

    const state = await readState()
    const evt = state.events?.find(
      (e) => e.entityId === fria.id && e.type === "fria.dpia_reused",
    )
    expect(evt).toBeTruthy()
    expect(evt?.message).toMatch(/Art\. 27\(4\)/)
  })

  it("reuseDpia aruncă eroare dacă DPIA nu există", async () => {
    const fria = await createFria(ORG, baseInput(), ACTOR)
    await expect(reuseDpia(ORG, fria.id, "dpia-nonexistent", ACTOR)).rejects.toThrow()
  })
})

describe("fria-store — markdown export + summary", () => {
  it("buildFriaMarkdown regenerează markdown din evaluator", async () => {
    const created = await createFria(ORG, baseInput({ title: "FRIA Export Test" }), ACTOR)
    const md = buildFriaMarkdown(created, "Test Org SRL")
    expect(md).toContain("# FRIA — FRIA Export Test")
    expect(md).toContain("Test Org SRL")
    expect(md).toContain("## A. Profilul deployer-ului")
    expect(md).toContain("## F. Plângere și guvernanță")
  })

  it("summarizeFriaRecords numără draft / inReview / approved / highOrCritical / notified", async () => {
    const r1 = await createFria(ORG, baseInput({ title: "F1" }), ACTOR)
    const r2 = await createFria(
      ORG,
      baseInput({
        title: "F2",
        riskAssessments: [
          {
            rightAffected: "data_protection",
            description: "Risk",
            likelihood: "almost_certain",
            severity: "catastrophic",
            riskLevel: "critical",
            mitigationMeasures: [],
            residualRisk: "critical",
          },
        ],
        notifyAuthorityRequired: true,
      }),
      ACTOR,
    )
    await markFriaApproved(ORG, r1.id, "dpo@org.ro", ACTOR)
    await notifyAuthority(ORG, r2.id, "ADR", "ref-123", ACTOR)
    const { summary } = await readFriaRecords(ORG)
    expect(summary.approved).toBeGreaterThanOrEqual(1)
    expect(summary.notifiedToAuthorityCount).toBeGreaterThanOrEqual(1)
    expect(summary.highOrCriticalCount).toBeGreaterThanOrEqual(1)
  })
})
