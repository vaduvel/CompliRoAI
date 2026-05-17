// Sprint 018 — logging-evidence-store tests.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/server/org-context", () => ({
  getOrgContext: vi.fn(async () => ({
    orgId: "org-logging-test",
    userId: "user-logging-test",
    email: "logging@example.com",
    orgName: "Test Logging Org",
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
  attachLogEvidence,
  buildLoggingMarkdown,
  createConfig,
  deleteConfig,
  getLoggingConfigById,
  markConfigApproved,
  markConfigRejected,
  readLoggingConfigs,
  scheduleRetentionAlert,
  summarizeLoggingConfigs,
  updateConfig,
  type CreateLoggingInput,
} from "@/lib/server/logging-evidence-store"

const ACTOR: ComplianceEventActorInput = {
  id: "user-logging-test",
  label: "logging@example.com",
  role: "compliance",
  source: "session",
}
const ORG = "org-logging-test"

function baseInput(overrides: Partial<CreateLoggingInput> = {}): CreateLoggingInput {
  return {
    title: "Logging test",
    linkedAISystemId: "sys-1",
    severityLevel: "standard",
    eventCategoriesLogged: [
      "input_data_received",
      "output_decision_made",
      "human_override_applied",
      "error_or_anomaly",
      "system_start_stop",
    ],
    storageBackend: "siem_elastic",
    storageLocation: "https://elastic.example.com/index=ai_logs",
    minRetentionMonths: 6,
    actualRetentionMonths: 6,
    retentionPolicy: "ILM rollover; delete la 6 luni; cold tier 3-6.",
    integrityMechanism: "hash_chain",
    integrityMechanismDescription: "SHA-256 chain; daily root hash semnat.",
    accessRoleDescription: "DPO + Security Team (MFA obligatoriu, role-based)",
    accessLogged: true,
    evidenceChecklist: ["Export SIEM lunar"],
    ...overrides,
  }
}

beforeEach(async () => {
  await mutateFreshStateForOrg(ORG, (s) => ({
    ...s,
    loggingEvidence: [],
    findings: [],
    events: [],
    aiSystems: [
      {
        id: "sys-1",
        name: "Credit Scoring AI",
        purpose: "credit-scoring",
        vendor: "TestVendor",
        modelType: "xgboost",
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

describe("logging-evidence-store — CRUD basic", () => {
  it("createConfig salvează + emite event logging.created + setează nextReviewISO 90 zile", async () => {
    const rec = await createConfig(ORG, baseInput(), ACTOR, "Org SRL")
    expect(rec.id).toMatch(/^logging-/)
    expect(rec.completeness).toBe("complete")
    expect(rec.status).toBe("draft")
    expect(rec.retentionStatus).toBe("no_evidence")
    expect(rec.nextReviewISO).toBeTruthy()
    const diffDays =
      (new Date(rec.nextReviewISO!).getTime() - Date.now()) / 86_400_000
    expect(diffDays).toBeGreaterThan(80)
    expect(diffDays).toBeLessThan(100)

    const state = await readState()
    const evt = state.events?.find(
      (e) => e.entityId === rec.id && e.type === "logging.created",
    )
    expect(evt).toBeTruthy()
    expect(evt?.selfHash).toMatch(/^[0-9a-f]{64}$/)
  })

  it("createConfig gol emite findings pentru categorii lipsă + integritate + meta-logging", async () => {
    const rec = await createConfig(
      ORG,
      baseInput({
        eventCategoriesLogged: [],
        integrityMechanism: "none",
        accessLogged: false,
      }),
      ACTOR,
    )
    expect(rec.linkedFindingIds.length).toBeGreaterThanOrEqual(3)
    const state = await readState()
    const findings = state.findings?.filter((f) => rec.linkedFindingIds.includes(f.id)) ?? []
    const titles = findings.map((f) => f.title).join(" | ")
    expect(titles).toMatch(/categorii/i)
    expect(titles).toMatch(/integritate/i)
    expect(titles).toMatch(/meta-logging/i)
    // Every emitted finding should reference AI Act Art. 12 or Art. 26
    const refs = findings.map((f) => f.legalReference ?? "").join(" | ")
    expect(refs).toMatch(/Art\. 12|Art\. 26/)
  })

  it("createConfig pe biometric system fără biometric_full → finding CRITICAL Art. 12(3)", async () => {
    const rec = await createConfig(
      ORG,
      baseInput({
        linkedAISystemId: "sys-bio",
        severityLevel: "biometric_full",
        biometricSpecific: {
          periodOfUseTracked: false,
          referenceDatabaseRecorded: false,
          inputDataRecorded: false,
          operatorsIdentified: false,
        },
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
    expect(biometricFinding?.legalReference).toMatch(/12\(3\)/)
  })

  it("createConfig fără storage backend aruncă", async () => {
    await expect(
      createConfig(
        ORG,
        baseInput({ storageLocation: "" }),
        ACTOR,
      ),
    ).rejects.toThrow()
  })

  it("readLoggingConfigs + summary totalează corect", async () => {
    await createConfig(ORG, baseInput({ title: "C1" }), ACTOR)
    await createConfig(
      ORG,
      baseInput({ title: "C2", eventCategoriesLogged: [] }),
      ACTOR,
    )
    const { records, summary } = await readLoggingConfigs(ORG)
    expect(records.length).toBe(2)
    expect(summary.total).toBe(2)
    expect(summary.complete).toBeGreaterThanOrEqual(1)
    expect(summary.incomplete).toBeGreaterThanOrEqual(1)
    expect(summary.noEvidence).toBe(2)
  })

  it("updateConfig merge patch + re-evaluează completeness + retentionStatus", async () => {
    const created = await createConfig(
      ORG,
      baseInput({ eventCategoriesLogged: ["input_data_received"] }),
      ACTOR,
    )
    expect(created.completeness).toBe("incomplete")
    const updated = await updateConfig(
      ORG,
      created.id,
      {
        eventCategoriesLogged: [
          "input_data_received",
          "output_decision_made",
          "human_override_applied",
          "error_or_anomaly",
          "system_start_stop",
        ],
      },
      ACTOR,
    )
    expect(updated).toBeTruthy()
    expect(updated!.completeness).toBe("complete")
  })

  it("deleteConfig șterge + emite event logging.deleted", async () => {
    const created = await createConfig(ORG, baseInput(), ACTOR)
    const removed = await deleteConfig(ORG, created.id, ACTOR)
    expect(removed).toBe(true)
    const after = await getLoggingConfigById(ORG, created.id)
    expect(after).toBeNull()
  })
})

describe("logging-evidence-store — approve / reject", () => {
  it("markConfigApproved setează status active + approvedByEmail", async () => {
    const created = await createConfig(ORG, baseInput(), ACTOR)
    const approved = await markConfigApproved(
      ORG,
      created.id,
      "dpo@org.ro",
      ACTOR,
    )
    expect(approved!.status).toBe("active")
    expect(approved!.approvedByEmail).toBe("dpo@org.ro")
    expect(approved!.approvedAtISO).toBeTruthy()
  })

  it("markConfigApproved fără email valid aruncă", async () => {
    const created = await createConfig(ORG, baseInput(), ACTOR)
    await expect(markConfigApproved(ORG, created.id, "", ACTOR)).rejects.toThrow()
    await expect(
      markConfigApproved(ORG, created.id, "noemailhere", ACTOR),
    ).rejects.toThrow()
  })

  it("markConfigRejected fără motiv aruncă", async () => {
    const created = await createConfig(ORG, baseInput(), ACTOR)
    await expect(markConfigRejected(ORG, created.id, "", ACTOR)).rejects.toThrow()
  })

  it("markConfigRejected setează rejectionReason + status rejected", async () => {
    const created = await createConfig(ORG, baseInput(), ACTOR)
    const rejected = await markConfigRejected(
      ORG,
      created.id,
      "Retenția insuficientă, trebuie 12 luni",
      ACTOR,
    )
    expect(rejected!.status).toBe("rejected")
    expect(rejected!.rejectionReason).toBe("Retenția insuficientă, trebuie 12 luni")
  })
})

describe("logging-evidence-store — evidence attach + retention", () => {
  it("attachLogEvidence adaugă item + setează lastEvidenceAtISO + recalculează retentionStatus", async () => {
    const created = await createConfig(ORG, baseInput(), ACTOR)
    expect(created.retentionStatus).toBe("no_evidence")

    const updated = await attachLogEvidence(
      ORG,
      created.id,
      {
        type: "log_export",
        description: "Export SIEM mai 2026",
        url: "https://example.com/logs.zip",
        fileHash: "abc123def456",
        coversPeriodStartISO: "2026-05-01T00:00:00Z",
        coversPeriodEndISO: "2026-05-31T23:59:59Z",
        eventCount: 124_567,
      },
      ACTOR,
    )
    expect(updated!.evidenceItems.length).toBe(1)
    expect(updated!.evidenceItems[0].type).toBe("log_export")
    expect(updated!.evidenceItems[0].fileHash).toBe("abc123def456")
    expect(updated!.evidenceItems[0].eventCount).toBe(124_567)
    expect(updated!.lastEvidenceAtISO).toBeTruthy()
    expect(updated!.retentionStatus).toBe("compliant")

    const state = await readState()
    const evt = state.events?.find(
      (e) => e.entityId === created.id && e.type === "logging.evidence_attached",
    )
    expect(evt).toBeTruthy()
  })

  it("attachLogEvidence fără descriere aruncă", async () => {
    const created = await createConfig(ORG, baseInput(), ACTOR)
    await expect(
      attachLogEvidence(
        ORG,
        created.id,
        { type: "log_export", description: "" },
        ACTOR,
      ),
    ).rejects.toThrow()
  })

  it("scheduleRetentionAlert emite event + nu modifică config", async () => {
    const created = await createConfig(ORG, baseInput(), ACTOR)
    await attachLogEvidence(
      ORG,
      created.id,
      { type: "log_export", description: "Test export" },
      ACTOR,
    )
    const result = await scheduleRetentionAlert(ORG, created.id, 14, ACTOR)
    expect(result).toBeTruthy()
    const state = await readState()
    const evt = state.events?.find(
      (e) =>
        e.entityId === created.id && e.type === "logging.retention_alert_scheduled",
    )
    expect(evt).toBeTruthy()
    expect(evt?.metadata?.daysBeforeExpiry).toBe(14)
  })

  it("scheduleRetentionAlert cu days invalid aruncă", async () => {
    const created = await createConfig(ORG, baseInput(), ACTOR)
    await expect(scheduleRetentionAlert(ORG, created.id, -1, ACTOR)).rejects.toThrow()
    await expect(scheduleRetentionAlert(ORG, created.id, 500, ACTOR)).rejects.toThrow()
  })
})

describe("logging-evidence-store — markdown export + summary", () => {
  it("buildLoggingMarkdown generează MD complet", async () => {
    const created = await createConfig(ORG, baseInput({ title: "Export MD" }), ACTOR)
    const md = buildLoggingMarkdown(created, "Org SRL", "Credit Scoring AI")
    expect(md).toContain("# Logging Config — Export MD")
    expect(md).toContain("Org SRL")
    expect(md).toContain("A. Sistem AI")
    expect(md).toContain("C. Storage + retenție")
    expect(md).toContain("D. Integritate")
  })

  it("summarizeLoggingConfigs pe array gol returnează 0-uri", () => {
    const s = summarizeLoggingConfigs([])
    expect(s.total).toBe(0)
    expect(s.compliantRetention).toBe(0)
  })
})
