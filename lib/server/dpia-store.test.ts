/**
 * Sprint 008C — Tests pentru dpia-store (CRUD + screening + finding emission).
 *
 * Mock-uim org-context + fs ca sa rulam testele in-memory; restul lantului
 * (state cache, hash chain ledger, findings-store) trece prin codul real.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/server/org-context", () => ({
  getOrgContext: vi.fn(async () => ({
    orgId: "org-dpia-test",
    userId: "user-dpia-test",
    email: "dpia@example.com",
    orgName: "Test DPIA Org",
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
  buildDpiaMarkdownForRecord,
  createDpiaFromScreening,
  createDpiaRecord,
  deleteDpiaRecord,
  evaluateScreening,
  getDpiaRecordById,
  markDpiaExported,
  readDpiaRecords,
  summarizeDpiaRecords,
  updateDpiaRecord,
} from "@/lib/server/dpia-store"
import type { ComplianceEventActorInput } from "@/lib/compliance/events"
import { readState } from "@/lib/server/store"

const ACTOR: ComplianceEventActorInput = {
  id: "user-dpia-test",
  label: "dpia@example.com",
  role: "compliance",
  source: "session",
}
const ORG = "org-dpia-test"

beforeEach(async () => {
  vi.resetModules()
})

afterEach(() => {
  vi.clearAllMocks()
})

describe("dpia-store — basic CRUD", () => {
  it("createDpiaRecord adauga record + emite event dpia.created", async () => {
    const record = await createDpiaRecord(
      ORG,
      {
        title: "DPIA HR Screening",
        processingPurpose: "Triere CV cu AI",
        dataCategories: "CV, email, telefon",
        dataSubjects: "Candidați angajare",
        specialCategories: false,
        automatedDecisionMaking: true,
        largeScaleProcessing: false,
        residualRisk: "high",
      },
      ACTOR,
    )

    expect(record.id).toMatch(/^dpia-/)
    expect(record.title).toBe("DPIA HR Screening")
    expect(record.residualRisk).toBe("high")
    expect(record.automatedDecisionMaking).toBe(true)
    expect(record.dataCategories).toContain("CV")
    expect(record.status).toBe("draft")

    const state = await readState()
    const evt = (state.events ?? []).find(
      (e) => e.entityId === record.id && e.type === "dpia.created",
    )
    expect(evt).toBeTruthy()
    expect(evt?.actorId).toBe(ACTOR.id)
    expect(evt?.selfHash).toMatch(/^[0-9a-f]{64}$/)
  })

  it("readDpiaRecords returneaza summary corect", async () => {
    await createDpiaRecord(ORG, { title: "DPIA #1", residualRisk: "low" }, ACTOR)
    const high = await createDpiaRecord(ORG, { title: "DPIA #2", residualRisk: "high" }, ACTOR)
    await updateDpiaRecord(ORG, high.id, { status: "approved" }, ACTOR)

    const { records, summary } = await readDpiaRecords(ORG)
    expect(records.length).toBeGreaterThanOrEqual(2)
    expect(summary.total).toBeGreaterThanOrEqual(2)
    expect(summary.highResidual).toBeGreaterThanOrEqual(1)
    expect(summary.approved).toBeGreaterThanOrEqual(1)
  })

  it("updateDpiaRecord merges patch + emite event dpia.updated + stamping approval", async () => {
    const record = await createDpiaRecord(ORG, { title: "DPIA for approval" }, ACTOR)
    const updated = await updateDpiaRecord(
      ORG,
      record.id,
      {
        status: "approved",
        residualRisk: "medium",
        risks: "Risc A\nRisc B",
        mitigationMeasures: ["MFA", "Retenție 30 zile"],
      },
      ACTOR,
    )
    expect(updated).toBeTruthy()
    expect(updated!.status).toBe("approved")
    expect(updated!.residualRisk).toBe("medium")
    expect(updated!.risks).toEqual(["Risc A", "Risc B"])
    expect(updated!.mitigationMeasures).toEqual(["MFA", "Retenție 30 zile"])
    expect(updated!.approvedAtISO).toBeTruthy()
    expect(updated!.approvedBy).toBe(ACTOR.label)

    const state = await readState()
    const evt = (state.events ?? []).find(
      (e) => e.entityId === record.id && e.type === "dpia.updated",
    )
    expect(evt).toBeTruthy()
  })

  it("updateDpiaRecord pe id inexistent returneaza null", async () => {
    const r = await updateDpiaRecord(ORG, "dpia-does-not-exist", { status: "approved" }, ACTOR)
    expect(r).toBeNull()
  })

  it("deleteDpiaRecord sterge + emite event dpia.deleted", async () => {
    const record = await createDpiaRecord(ORG, { title: "DPIA to delete" }, ACTOR)
    const removed = await deleteDpiaRecord(ORG, record.id, ACTOR)
    expect(removed).toBe(true)

    const after = await getDpiaRecordById(ORG, record.id)
    expect(after).toBeNull()

    const state = await readState()
    const evt = (state.events ?? []).find(
      (e) => e.entityId === record.id && e.type === "dpia.deleted",
    )
    expect(evt).toBeTruthy()
  })

  it("deleteDpiaRecord pe id inexistent returneaza false", async () => {
    const removed = await deleteDpiaRecord(ORG, "dpia-not-here", ACTOR)
    expect(removed).toBe(false)
  })

  it("markDpiaExported seteaza exportedAtISO + emite event dpia.exported", async () => {
    const record = await createDpiaRecord(ORG, { title: "DPIA for export" }, ACTOR)
    const exported = await markDpiaExported(ORG, record.id, ACTOR)
    expect(exported).toBeTruthy()
    expect(exported!.exportedAtISO).toBeTruthy()

    const state = await readState()
    const evt = (state.events ?? []).find(
      (e) => e.entityId === record.id && e.type === "dpia.exported",
    )
    expect(evt).toBeTruthy()
  })
})

describe("dpia-store — screening + finding emission", () => {
  it("evaluateScreening returneaza evaluation cu candidateFinding pentru risc mare", () => {
    const ev = evaluateScreening({
      processName: "Profilare clienti",
      answers: {
        specialCategories: true,
        largeScale: true,
        profilingOrScoring: true,
        automatedDecision: true,
        newTechnologyOrAI: true,
        thirdCountryTransfer: true,
        securityMeasures: "missing",
        retentionKnown: "missing",
      },
    })
    expect(ev.requiresFullDpia).toBe(true)
    expect(ev.candidateFinding).toBeTruthy()
    expect(ev.candidateFinding?.category).toBe("GDPR")
  })

  it("createDpiaFromScreening (acceptFinding=false) salveaza record fara finding", async () => {
    const { record, evaluation, linkedFindingId } = await createDpiaFromScreening(
      ORG,
      {
        processName: "Suport AI chatbot",
        answers: { newTechnologyOrAI: true, automatedDecision: false },
      },
      ACTOR,
      { acceptFinding: false },
    )

    expect(record.id).toMatch(/^dpia-/)
    expect(record.title).toBe("Suport AI chatbot")
    expect(record.screeningSchemaVersion).toBe("2026.05.ro.v1")
    expect(record.screeningRiskLevel).toBe(evaluation.riskLevel)
    expect(linkedFindingId).toBeUndefined()
    expect(record.linkedFindingId).toBeUndefined()

    const state = await readState()
    const screeningEvt = (state.events ?? []).find(
      (e) => e.entityId === record.id && e.type === "dpia.screening.completed",
    )
    expect(screeningEvt).toBeTruthy()
    const acceptEvt = (state.events ?? []).find(
      (e) => e.entityId === record.id && e.type === "dpia.finding.accepted",
    )
    expect(acceptEvt).toBeUndefined()
  })

  it("createDpiaFromScreening (acceptFinding=true) emite finding GDPR + lega cu linkedFindingId", async () => {
    const { record, linkedFindingId, evaluation } = await createDpiaFromScreening(
      ORG,
      {
        processName: "AI screening CV",
        answers: {
          specialCategories: false,
          largeScale: true,
          vulnerableDataSubjects: true,
          profilingOrScoring: true,
          automatedDecision: true,
          newTechnologyOrAI: true,
          thirdCountryTransfer: true,
          securityMeasures: "partial",
          retentionKnown: "unclear",
        },
      },
      ACTOR,
      { acceptFinding: true },
    )

    expect(evaluation.requiresFullDpia).toBe(true)
    expect(linkedFindingId).toBeTruthy()
    expect(linkedFindingId).toMatch(/^finding-/)
    expect(record.linkedFindingId).toBe(linkedFindingId)
    expect(record.status).toBe("in_review")
    expect(record.screeningRiskScore).toBeGreaterThan(0)

    const state = await readState()
    // Verifica finding in state.findings
    const finding = (state.findings ?? []).find((f) => f.id === linkedFindingId)
    expect(finding).toBeTruthy()
    expect(finding?.category).toBe("GDPR")
    expect(finding?.severity).toMatch(/high|critical/)
    expect(finding?.findingStatus).toBe("open")

    // Verifica events: screening completed + finding accepted + finding.created
    const events = state.events ?? []
    expect(events.some((e) => e.type === "dpia.screening.completed" && e.entityId === record.id)).toBe(true)
    expect(events.some((e) => e.type === "dpia.finding.accepted" && e.entityId === record.id)).toBe(true)
    expect(events.some((e) => e.type === "finding.created" && e.entityId === linkedFindingId)).toBe(true)
  })

  it("createDpiaFromScreening pe risc scazut nu emite finding chiar daca acceptFinding=true", async () => {
    const { record, linkedFindingId } = await createDpiaFromScreening(
      ORG,
      {
        processName: "Newsletter opt-in",
        answers: { securityMeasures: "complete", retentionKnown: "defined" },
      },
      ACTOR,
      { acceptFinding: true },
    )

    expect(linkedFindingId).toBeUndefined()
    expect(record.linkedFindingId).toBeUndefined()
    expect(record.status).toBe("draft")
  })
})

describe("dpia-store — markdown export + summary", () => {
  it("buildDpiaMarkdownForRecord include toate sectiunile + screening cand exista", async () => {
    const record = await createDpiaRecord(
      ORG,
      {
        title: "DPIA export test",
        processingPurpose: "Test scop",
        risks: "Risc 1\nRisc 2",
        mitigationMeasures: "MFA",
      },
      ACTOR,
    )
    const md = buildDpiaMarkdownForRecord(record, "Test Org SRL")
    expect(md).toContain("# DPIA — DPIA export test")
    expect(md).toContain("**Organizație:** Test Org SRL")
    expect(md).toContain("## 1. Descrierea prelucrării")
    expect(md).toContain("## 6. Riscuri")
    expect(md).toContain("MFA")
    expect(md).toContain("## Checklist final")
  })

  it("summarizeDpiaRecords numara open/approved/highResidual/withLinkedFinding", async () => {
    const r1 = await createDpiaRecord(ORG, { title: "S #1", residualRisk: "critical" }, ACTOR)
    const r2 = await createDpiaRecord(ORG, { title: "S #2", residualRisk: "low" }, ACTOR)
    await updateDpiaRecord(ORG, r1.id, { status: "approved" }, ACTOR)
    await updateDpiaRecord(ORG, r2.id, { status: "completed" }, ACTOR)
    const records = [r1, r2].map((r) => ({ ...r, status: "approved" as const }))
    const summary = summarizeDpiaRecords(records)
    expect(summary.approved).toBe(2)
    expect(summary.highResidual).toBe(1)
  })
})
