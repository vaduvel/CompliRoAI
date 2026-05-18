/**
 * Sprint 022 — Tests pentru preventive-engine-runner.
 *
 * Strategie identică cu findings-store.test.ts: mock org-context + fs-safe.
 * Verificăm că runner-ul emite findings + queue reminders + scrie summary.
 */

import { describe, expect, it, vi, beforeEach } from "vitest"

vi.mock("@/lib/server/org-context", () => ({
  getOrgContext: vi.fn(async () => ({
    orgId: "org-prev-test",
    userId: "user-test",
    email: "test@example.com",
    orgName: "Test",
    workspaceMode: "imm-classic",
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

import { runPreventiveScan } from "@/lib/server/preventive-engine-runner"
import { mutateFreshStateForOrg, readState } from "@/lib/server/store"
import type {
  BreachRecord,
  FriaRecord,
  PreventiveEmailPreferences,
} from "@/lib/compliance/types"

const ORG = "org-prev-test"
const NOW = "2026-05-17T12:00:00.000Z"
const DAY = 86_400_000

function isoFromNow(days: number): string {
  return new Date(new Date(NOW).getTime() + days * DAY).toISOString()
}

async function resetState(seed: (state: import("@/lib/compliance/types").ComplianceState) => import("@/lib/compliance/types").ComplianceState) {
  await mutateFreshStateForOrg(ORG, () => {
    // Fresh state per test
    return seed({
      highRisk: 0,
      lowRisk: 0,
      gdprProgress: 0,
      alerts: [],
      findings: [],
      events: [],
      generatedDocuments: [],
      aiSystems: [],
      literacyRecords: [],
    } as unknown as import("@/lib/compliance/types").ComplianceState)
  })
}

beforeEach(async () => {
  await resetState((s) => s)
})

describe("preventive-engine-runner", () => {
  it("returns valid summary on empty state", async () => {
    const summary = await runPreventiveScan(ORG, {
      triggerSource: "manual",
      nowISO: NOW,
    })
    expect(summary.actionsDetected).toBe(0)
    expect(summary.findingsEmitted).toBe(0)
    expect(summary.emailsQueued).toBe(0)
    expect(summary.errorsCount).toBe(0)
    expect(summary.runId).toMatch(/^prev-run-/)
  })

  it("emits findings for critical breach (overdue 72h)", async () => {
    const breach: BreachRecord = {
      id: "br-overdue",
      orgId: ORG,
      title: "Breach overdue",
      description: "x",
      cause: "cyberattack",
      discoveredAtISO: isoFromNow(-3),
      deadlineISO: isoFromNow(-1), // overdue
      severity: "high",
      dataCategories: [],
      affectedSubjectsCategories: [],
      affectedSystems: [],
      likelyConsequences: "",
      highRiskToRights: true,
      containmentMeasures: [],
      preventionMeasures: [],
      anspdcpNotificationRequired: true,
      subjectNotificationRequired: false,
      status: "assessing",
      evidenceVaultIds: [],
      createdAtISO: isoFromNow(-3),
      updatedAtISO: isoFromNow(-3),
    }
    await resetState((s) => ({ ...s, breachRecords: [breach] }))

    const summary = await runPreventiveScan(ORG, {
      triggerSource: "manual",
      nowISO: NOW,
    })
    expect(summary.findingsEmitted).toBeGreaterThan(0)
    const state = await readState()
    const newFinding = (state.findings ?? []).find((f) =>
      f.id.startsWith("prev-finding-prev-breach_72h_expiring-"),
    )
    expect(newFinding).toBeDefined()
    expect(newFinding!.severity).toBe("critical")
    expect(state.preventiveLastRunAtISO).toBe(NOW)
    expect(state.preventiveLastRunSummary?.runId).toBe(summary.runId)
  })

  it("queues email reminder for vendor DPA expiring in 10 days", async () => {
    const prefs: PreventiveEmailPreferences = {
      enabled: true,
      recipientEmails: ["dpo@x.com"],
      digestFrequency: "immediate",
      perRuleEnabled: {},
    }
    await resetState((s) => ({
      ...s,
      preventiveEmailPreferences: prefs,
      vendorRecords: [
        {
          id: "v-1",
          orgId: ORG,
          name: "OpenAI",
          productUsed: "GPT-4",
          vendorRegion: "US",
          role: "processor",
          serviceCategory: "AI/LLM",
          linkedAISystemIds: [],
          linkedAIDataMapIds: [],
          dpaStatus: "signed",
          dpaExpiresAtISO: isoFromNow(10),
          transferRequired: true,
          transferMechanism: "scc_controller_processor",
          subprocessorsList: [],
          securityEvidence: {
            iso27001: false,
            soc2: false,
            penTestRecent: false,
            encryptionInTransit: true,
            encryptionAtRest: true,
            mfaEnforced: false,
            auditLogsAvailable: false,
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
          reviewStatus: "approved",
          humanReviewRequired: false,
          linkedFindingIds: [],
          createdAtISO: isoFromNow(-100),
          updatedAtISO: isoFromNow(-100),
        },
      ],
    }))
    const summary = await runPreventiveScan(ORG, {
      triggerSource: "manual",
      nowISO: NOW,
    })
    expect(summary.emailsQueued).toBeGreaterThan(0)
    const state = await readState()
    const reminders = state.renewalReminders ?? []
    expect(reminders.length).toBeGreaterThan(0)
    expect(reminders[0].recipientEmail).toBe("dpo@x.com")
    expect(reminders[0].emailTemplate).toBe("vendor-dpa-expiring")
  })

  it("auto-reopens stale resolved findings on re-scan", async () => {
    const fria: FriaRecord = {
      id: "fria-1",
      orgId: ORG,
      title: "FRIA stale",
      linkedAISystemId: "sys-1",
      deployerType: "public_body",
      processDescription: "",
      frequencyOfUse: "weekly",
      affectedGroups: [],
      rightsAtRisk: [],
      riskAssessments: [],
      overallRiskScore: 30,
      overallRiskLevel: "low",
      humanOversightMeasures: [],
      complaintMechanism: "",
      governanceMeasures: [],
      notifyAuthorityRequired: false,
      status: "approved",
      approvedAtISO: isoFromNow(-450),
      linkedFindingIds: [],
      evidenceVaultIds: [],
      createdAtISO: isoFromNow(-450),
      updatedAtISO: isoFromNow(-450),
    }
    await resetState((s) => ({
      ...s,
      friaRecords: [fria],
      findings: [
        {
          id: "prev-finding-prev-fria_review_overdue-fria-1",
          title: "Preventiv — FRIA stale",
          detail: "x",
          category: "EU_AI_ACT",
          severity: "high",
          risk: "high",
          principles: [],
          createdAtISO: isoFromNow(-30),
          sourceDocument: "preventive-engine",
          findingStatus: "resolved",
        },
      ],
    }))
    const summary = await runPreventiveScan(ORG, {
      triggerSource: "manual",
      nowISO: NOW,
    })
    expect(summary.findingsEmitted).toBeGreaterThan(0)
    const state = await readState()
    const reopened = (state.findings ?? []).find(
      (f) => f.id === "prev-finding-prev-fria_review_overdue-fria-1",
    )
    expect(reopened).toBeDefined()
    expect(reopened!.findingStatus).toBe("open")
    expect(reopened!.reopenedFromISO).toBe(NOW)
  })

  it("appends ledger event preventive.scan_run", async () => {
    const summary = await runPreventiveScan(ORG, {
      triggerSource: "manual",
      nowISO: NOW,
    })
    const state = await readState()
    const event = (state.events ?? []).find((e) => e.type === "preventive.scan_run")
    expect(event).toBeDefined()
    expect(event!.entityId).toBe(summary.runId)
  })

  it("byType tracks count per trigger type", async () => {
    await resetState((s) => ({
      ...s,
      breachRecords: [
        {
          id: "br-1",
          orgId: ORG,
          title: "B1",
          description: "x",
          cause: "cyberattack",
          discoveredAtISO: isoFromNow(-1),
          deadlineISO: isoFromNow(1),
          severity: "high",
          dataCategories: [],
          affectedSubjectsCategories: [],
          affectedSystems: [],
          likelyConsequences: "",
          highRiskToRights: true,
          containmentMeasures: [],
          preventionMeasures: [],
          anspdcpNotificationRequired: true,
          subjectNotificationRequired: false,
          status: "assessing",
          evidenceVaultIds: [],
          createdAtISO: isoFromNow(-1),
          updatedAtISO: isoFromNow(-1),
        },
      ],
    }))
    const summary = await runPreventiveScan(ORG, {
      triggerSource: "cron",
      nowISO: NOW,
    })
    expect(summary.byType.breach_72h_expiring).toBeGreaterThan(0)
  })
})
