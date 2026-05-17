/**
 * Sprint 013 — Tests pentru approval-queue-store.
 *
 * Mock-uim org-context + fs ca să rulăm in-memory; restul (state cache, hash
 * chain ledger) trece prin codul real ca să detectăm regresii de integrare.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/server/org-context", () => ({
  getOrgContext: vi.fn(async () => ({
    orgId: "org-approval-test",
    userId: "user-approval-test",
    email: "consultant@example.com",
    orgName: "Test Cabinet",
    workspaceMode: "cabinet",
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
  approveApprovalRequest,
  createApprovalRequest,
  expireOldApprovalRequests,
  getApprovalRequestById,
  listApprovalRequests,
  rejectApprovalRequest,
  requiresApprovalForRequest,
  summarizeApprovals,
  withdrawApprovalRequest,
} from "@/lib/server/approval-queue-store"
import type { ComplianceEventActorInput } from "@/lib/compliance/events"
import { readState, writeState } from "@/lib/server/store"
import type {
  BreachRecord,
  DpiaRecord,
  ScanFinding,
  VendorRecord,
} from "@/lib/compliance/types"
import { initialComplianceState } from "@/lib/compliance/engine"

const ACTOR: ComplianceEventActorInput = {
  id: "user-approval-test",
  label: "consultant@example.com",
  role: "compliance",
  source: "session",
}
const ORG = "org-approval-test"

async function resetState() {
  await writeState(structuredClone(initialComplianceState))
}

beforeEach(async () => {
  await resetState()
})

afterEach(async () => {
  await resetState()
})

function makeFinding(overrides: Partial<ScanFinding> = {}): ScanFinding {
  return {
    id: overrides.id ?? "find-1",
    title: "Lipsa DPA OpenAI",
    detail: "Vendor critic fără DPA semnat.",
    category: "GDPR",
    severity: "high",
    risk: "high",
    principles: ["accountability"],
    createdAtISO: "2026-05-01T00:00:00.000Z",
    sourceDocument: "vendor.json",
    findingStatus: "open",
    ...overrides,
  }
}

describe("approval-queue-store", () => {
  it("creează o cerere de aprobare în coadă cu status pending + event în ledger", async () => {
    const req = await createApprovalRequest(
      ORG,
      {
        entityType: "finding_status_change",
        entityId: "find-1",
        title: "Aprobă marcare finding ca rezolvat",
        description: "Clientul confirmă remediere.",
        proposedChange: { findingStatus: "resolved" },
        requestedByEmail: "client@example.com",
        requestedByRole: "client",
      },
      ACTOR,
    )

    expect(req.id).toMatch(/^apr-/)
    expect(req.status).toBe("pending")
    expect(req.expiresAtISO).toBeTruthy()

    const state = await readState()
    expect(state.approvalRequests?.length).toBe(1)
    expect(state.events?.[0].type).toBe("approval.created")
    expect(state.events?.[0].selfHash).toBeTruthy()
  })

  it("listează request-urile sortate newest-first cu filtre pe status", async () => {
    await createApprovalRequest(
      ORG,
      {
        entityType: "finding_status_change",
        entityId: "f1",
        title: "A",
        description: "",
        proposedChange: { findingStatus: "resolved" },
        requestedByEmail: "client@example.com",
      },
      ACTOR,
    )
    await new Promise((r) => setTimeout(r, 5))
    const second = await createApprovalRequest(
      ORG,
      {
        entityType: "dpia_screening",
        entityId: "d1",
        title: "B",
        description: "",
        proposedChange: { status: "approved" },
        requestedByEmail: "client@example.com",
      },
      ACTOR,
    )

    const all = await listApprovalRequests(ORG)
    expect(all.length).toBe(2)
    expect(all[0].id).toBe(second.id) // newest first

    const filtered = await listApprovalRequests(ORG, { entityType: ["dpia_screening"] })
    expect(filtered.length).toBe(1)
    expect(filtered[0].entityType).toBe("dpia_screening")
  })

  it("aplică finding_status_change pe entitate la approve", async () => {
    const finding = makeFinding({ id: "find-apply" })
    await writeState({
      ...(await readState()),
      findings: [finding],
    })

    const req = await createApprovalRequest(
      ORG,
      {
        entityType: "finding_status_change",
        entityId: "find-apply",
        title: "Aprobă rezolvare",
        description: "",
        proposedChange: { findingStatus: "resolved", operationalEvidenceNote: "DPA semnat" },
        requestedByEmail: "client@example.com",
      },
      ACTOR,
    )

    const result = await approveApprovalRequest(
      ORG,
      req.id,
      { reviewerEmail: "consultant@example.com", reviewComment: "OK" },
      ACTOR,
    )

    expect(result?.applied).toBe(true)
    expect(result?.request.status).toBe("approved")
    expect(result?.request.reviewedByEmail).toBe("consultant@example.com")

    const state = await readState()
    const updatedFinding = state.findings.find((f) => f.id === "find-apply")
    expect(updatedFinding?.findingStatus).toBe("resolved")
    expect(updatedFinding?.operationalEvidenceNote).toBe("DPA semnat")

    // Hash chain: ar trebui să avem approval.created + approval.approved + approval.applied
    const events = state.events ?? []
    expect(events.some((e) => e.type === "approval.approved")).toBe(true)
    expect(events.some((e) => e.type === "approval.applied")).toBe(true)
  })

  it("respinge fără să aplice nicio schimbare la entitate", async () => {
    const finding = makeFinding({ id: "find-reject" })
    await writeState({
      ...(await readState()),
      findings: [finding],
    })

    const req = await createApprovalRequest(
      ORG,
      {
        entityType: "finding_status_change",
        entityId: "find-reject",
        title: "Aprobă rezolvare",
        description: "",
        proposedChange: { findingStatus: "resolved" },
        requestedByEmail: "client@example.com",
      },
      ACTOR,
    )

    const updated = await rejectApprovalRequest(
      ORG,
      req.id,
      { reviewerEmail: "consultant@example.com", reviewComment: "Lipsește dovada." },
      ACTOR,
    )
    expect(updated?.status).toBe("rejected")
    expect(updated?.reviewComment).toBe("Lipsește dovada.")

    const state = await readState()
    expect(state.findings.find((f) => f.id === "find-reject")?.findingStatus).toBe("open")
  })

  it("aplică DPIA status change cu evidenceNote", async () => {
    const dpia: DpiaRecord = {
      id: "dpia-1",
      title: "HR screening",
      processingPurpose: "Selecție CV",
      processingDescription: "",
      dataCategories: ["cv"],
      dataSubjects: ["candidați"],
      legalBasis: "art. 6(1)(b)",
      specialCategories: false,
      automatedDecisionMaking: true,
      largeScaleProcessing: false,
      necessityAssessment: "ok",
      proportionalityAssessment: "ok",
      risks: [],
      mitigationMeasures: [],
      residualRisk: "low",
      status: "in_review",
      owner: "dpo",
      createdAtISO: "2026-05-01T00:00:00.000Z",
      updatedAtISO: "2026-05-01T00:00:00.000Z",
    }
    await writeState({ ...(await readState()), dpiaRecords: [dpia] })

    const req = await createApprovalRequest(
      ORG,
      {
        entityType: "dpia_screening",
        entityId: "dpia-1",
        title: "Aprobă DPIA",
        description: "",
        proposedChange: { status: "approved", evidenceNote: "Decizie comitet" },
        requestedByEmail: "client@example.com",
      },
      ACTOR,
    )
    const result = await approveApprovalRequest(
      ORG,
      req.id,
      { reviewerEmail: "consultant@example.com" },
      ACTOR,
    )
    expect(result?.applied).toBe(true)
    const state = await readState()
    const updated = state.dpiaRecords?.find((d) => d.id === "dpia-1")
    expect(updated?.status).toBe("approved")
    expect(updated?.approvedAtISO).toBeTruthy()
    expect(updated?.evidenceNote).toBe("Decizie comitet")
  })

  it("aplică breach_subject_skip cu skipReason", async () => {
    const breach: BreachRecord = {
      id: "br-1",
      orgId: ORG,
      title: "Lapt parolă",
      description: "",
      cause: "lost_device",
      discoveredAtISO: "2026-05-10T00:00:00.000Z",
      deadlineISO: "2026-05-13T00:00:00.000Z",
      severity: "medium",
      dataCategories: ["credentials"],
      affectedSubjectsCategories: ["angajați"],
      affectedSystems: ["laptop"],
      likelyConsequences: "credentials compromise",
      highRiskToRights: false,
      containmentMeasures: ["lock"],
      preventionMeasures: [],
      anspdcpNotificationRequired: false,
      subjectNotificationRequired: true,
      status: "assessing",
      evidenceVaultIds: [],
      createdAtISO: "2026-05-10T00:00:00.000Z",
      updatedAtISO: "2026-05-10T00:00:00.000Z",
    }
    await writeState({ ...(await readState()), breachRecords: [breach] })

    const req = await createApprovalRequest(
      ORG,
      {
        entityType: "breach_subject_skip",
        entityId: "br-1",
        title: "Aprobă omitere notificare persoane",
        description: "",
        proposedChange: { skipReason: "Date encriptate, risc redus." },
        requestedByEmail: "client@example.com",
      },
      ACTOR,
    )
    const result = await approveApprovalRequest(
      ORG,
      req.id,
      { reviewerEmail: "consultant@example.com" },
      ACTOR,
    )
    expect(result?.applied).toBe(true)
    const state = await readState()
    const updated = state.breachRecords?.find((b) => b.id === "br-1")
    expect(updated?.subjectNotificationRequired).toBe(false)
    expect(updated?.subjectNotification?.skipReason).toBe("Date encriptate, risc redus.")
  })

  it("aplică vendor_approved cu notă", async () => {
    const vendor: VendorRecord = {
      id: "v-1",
      orgId: ORG,
      name: "OpenAI",
      productUsed: "ChatGPT",
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
      },
      aiTerms: {
        trainingDataOptOut: "yes",
        inputDataRetention: "no_retention",
        outputRightsOwnership: "client",
        modelTransparency: "documented",
        reproducibilityGuarantees: false,
      },
      riskLevel: "medium",
      riskReasons: [],
      reviewStatus: "in_review",
      humanReviewRequired: true,
      linkedFindingIds: [],
      createdAtISO: "2026-05-01T00:00:00.000Z",
      updatedAtISO: "2026-05-01T00:00:00.000Z",
    }
    await writeState({ ...(await readState()), vendorRecords: [vendor] })

    const req = await createApprovalRequest(
      ORG,
      {
        entityType: "vendor_approved",
        entityId: "v-1",
        title: "Aprobă vendor",
        description: "",
        proposedChange: { note: "DPA OK, SCC OK" },
        requestedByEmail: "client@example.com",
      },
      ACTOR,
    )
    const result = await approveApprovalRequest(
      ORG,
      req.id,
      { reviewerEmail: "consultant@example.com" },
      ACTOR,
    )
    expect(result?.applied).toBe(true)
    const updated = (await readState()).vendorRecords?.find((v) => v.id === "v-1")
    expect(updated?.reviewStatus).toBe("approved")
    expect(updated?.notes).toBe("DPA OK, SCC OK")
  })

  it("apelul de approve pe request orfan setează applied=false dar marchează status approved", async () => {
    const req = await createApprovalRequest(
      ORG,
      {
        entityType: "finding_status_change",
        entityId: "missing-finding-id",
        title: "Aprobă",
        description: "",
        proposedChange: { findingStatus: "resolved" },
        requestedByEmail: "client@example.com",
      },
      ACTOR,
    )
    const result = await approveApprovalRequest(
      ORG,
      req.id,
      { reviewerEmail: "consultant@example.com" },
      ACTOR,
    )
    expect(result?.applied).toBe(false)
    expect(result?.applySkipReason).toContain("nu există")
    expect(result?.request.status).toBe("approved")
    const events = (await readState()).events ?? []
    expect(events.some((e) => e.type === "approval.applied.skipped")).toBe(true)
  })

  it("withdraw marchează request pending ca withdrawn", async () => {
    const req = await createApprovalRequest(
      ORG,
      {
        entityType: "audit_pack_exported",
        entityId: "ap-1",
        title: "Audit pack lunar",
        description: "",
        proposedChange: {},
        requestedByEmail: "client@example.com",
      },
      ACTOR,
    )
    const updated = await withdrawApprovalRequest(
      ORG,
      req.id,
      { reviewerEmail: "client@example.com", reviewComment: "Anulat de client" },
      ACTOR,
    )
    expect(updated?.status).toBe("withdrawn")
  })

  it("expiră request-urile pending al căror deadline a trecut", async () => {
    const req = await createApprovalRequest(
      ORG,
      {
        entityType: "ai_system_classification",
        entityId: "ai-1",
        title: "Reclasifică",
        description: "",
        proposedChange: { riskLevel: "high" },
        requestedByEmail: "client@example.com",
        expiresInDays: 1,
      },
      ACTOR,
    )

    // Înaintăm clock-ul peste expiresAtISO
    const futureNow = new Date(Date.parse(req.expiresAtISO!) + 10_000).toISOString()
    const count = await expireOldApprovalRequests(ORG, ACTOR, futureNow)
    expect(count).toBe(1)
    const updated = await getApprovalRequestById(ORG, req.id)
    expect(updated?.status).toBe("withdrawn")
  })

  it("summarizeApprovals returnează contoare corecte", async () => {
    await createApprovalRequest(
      ORG,
      {
        entityType: "finding_status_change",
        entityId: "f-summ-1",
        title: "P",
        description: "",
        proposedChange: { findingStatus: "resolved" },
        requestedByEmail: "client@example.com",
      },
      ACTOR,
    )
    const req2 = await createApprovalRequest(
      ORG,
      {
        entityType: "finding_status_change",
        entityId: "f-summ-2",
        title: "Q",
        description: "",
        proposedChange: { findingStatus: "resolved" },
        requestedByEmail: "client@example.com",
      },
      ACTOR,
    )
    await rejectApprovalRequest(ORG, req2.id, { reviewerEmail: "x@y.com" }, ACTOR)

    const all = await listApprovalRequests(ORG)
    const counts = summarizeApprovals(all)
    expect(counts.pending).toBe(1)
    expect(counts.rejected).toBe(1)
    expect(counts.total).toBe(2)
  })

  it("requiresApprovalForRequest este true doar pentru cabinet + client", () => {
    expect(requiresApprovalForRequest("cabinet", "client")).toBe(true)
    expect(requiresApprovalForRequest("cabinet", "consultant")).toBe(false)
    expect(requiresApprovalForRequest("solo", "client")).toBe(false)
    expect(requiresApprovalForRequest("imm-classic", "client")).toBe(false)
  })
})
