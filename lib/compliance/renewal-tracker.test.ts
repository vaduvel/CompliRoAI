/**
 * Sprint 022 — Tests pentru renewal-tracker.
 */

import { describe, expect, it } from "vitest"
import {
  extractAllRenewals,
  getUpcomingRenewals,
  getReminderSchedule,
} from "@/lib/compliance/renewal-tracker"
import { initialComplianceState } from "@/lib/compliance/engine"
import type { ComplianceState, FriaRecord, VendorRecord } from "@/lib/compliance/types"

const NOW = "2026-05-17T12:00:00.000Z"
const DAY = 86_400_000

function isoFromNow(days: number): string {
  return new Date(new Date(NOW).getTime() + days * DAY).toISOString()
}

function base(over: Partial<ComplianceState> = {}): ComplianceState {
  return { ...initialComplianceState, ...over } as ComplianceState
}

function fria(over: Partial<FriaRecord> = {}): FriaRecord {
  return {
    id: over.id ?? "fria-1",
    orgId: "org",
    title: over.title ?? "FRIA HR",
    linkedAISystemId: "sys-1",
    deployerType: "public_body",
    processDescription: "",
    frequencyOfUse: "frequent",
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
    approvedAtISO: isoFromNow(-300),
    linkedFindingIds: [],
    evidenceVaultIds: [],
    createdAtISO: isoFromNow(-300),
    updatedAtISO: isoFromNow(-300),
    ...over,
  } as FriaRecord
}

function vendor(over: Partial<VendorRecord> = {}): VendorRecord {
  return {
    id: over.id ?? "v-1",
    orgId: "org",
    name: over.name ?? "OpenAI",
    productUsed: "GPT-4",
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
    ...over,
  } as VendorRecord
}

describe("renewal-tracker", () => {
  it("returns empty array on empty state", () => {
    expect(extractAllRenewals(base(), NOW)).toEqual([])
  })

  it("extracts FRIA renewal at approval + 365d", () => {
    const items = extractAllRenewals(base({ friaRecords: [fria()] }), NOW)
    expect(items).toHaveLength(1)
    expect(items[0].entityType).toBe("fria")
    expect(items[0].renewalType).toBe("review_annual")
    expect(items[0].daysUntil).toBeCloseTo(65, 0) // 365 - 300
  })

  it("extracts vendor DPA expiry + revalidation as 2 items", () => {
    const items = extractAllRenewals(
      base({
        vendorRecords: [
          vendor({
            dpaExpiresAtISO: isoFromNow(30),
            nextRevalidationISO: isoFromNow(60),
          }),
        ],
      }),
      NOW,
    )
    expect(items).toHaveLength(2)
    expect(items[0].renewalType).toBe("dpa_expiry")
    expect(items[1].renewalType).toBe("vendor_revalidation")
  })

  it("DSAR responded is excluded; pending DSAR included", () => {
    const items = extractAllRenewals(
      base({
        dsarRequests: [
          {
            id: "d-open",
            orgId: "org",
            receivedAtISO: isoFromNow(-10),
            deadlineISO: isoFromNow(20),
            requesterName: "Ion",
            requesterEmail: "x@x.com",
            requestType: "access",
            status: "in_progress",
            identityVerified: true,
            draftResponseGenerated: false,
            responseReviewedByHuman: false,
            evidenceVaultIds: [],
            createdAtISO: isoFromNow(-10),
            updatedAtISO: isoFromNow(-10),
          },
          {
            id: "d-done",
            orgId: "org",
            receivedAtISO: isoFromNow(-40),
            deadlineISO: isoFromNow(-10),
            requesterName: "Ana",
            requesterEmail: "y@y.com",
            requestType: "erasure",
            status: "responded",
            identityVerified: true,
            draftResponseGenerated: true,
            responseReviewedByHuman: true,
            evidenceVaultIds: [],
            createdAtISO: isoFromNow(-40),
            updatedAtISO: isoFromNow(-40),
          },
        ],
      }),
      NOW,
    )
    expect(items.map((i) => i.entityId)).toEqual(["d-open"])
  })

  it("sorts ascending by daysUntil (most urgent first)", () => {
    const items = extractAllRenewals(
      base({
        friaRecords: [fria({ approvedAtISO: isoFromNow(-300) })], // dueIn 65d
        vendorRecords: [vendor({ dpaExpiresAtISO: isoFromNow(5) })],
      }),
      NOW,
    )
    expect(items[0].daysUntil).toBeLessThan(items[1].daysUntil)
    expect(items[0].entityType).toBe("vendor")
  })

  it("getUpcomingRenewals limits by withinDays", () => {
    const items = getUpcomingRenewals(
      base({
        friaRecords: [fria({ approvedAtISO: isoFromNow(-300) })], // 65d out
        vendorRecords: [vendor({ dpaExpiresAtISO: isoFromNow(10) })],
      }),
      NOW,
      30,
    )
    expect(items).toHaveLength(1)
    expect(items[0].entityType).toBe("vendor")
  })

  it("getReminderSchedule returns 30/15/5/1 day schedule", () => {
    const item = {
      entityType: "fria" as const,
      entityId: "fria-1",
      entityLabel: "FRIA HR",
      renewalType: "review_annual",
      nextRenewalISO: isoFromNow(40),
      daysUntil: 40,
    }
    const sched = getReminderSchedule(item, NOW)
    expect(sched).toHaveLength(4)
    expect(sched.map((s) => s.daysBefore)).toEqual([30, 15, 5, 1])
  })

  it("getReminderSchedule skips past intervals", () => {
    const item = {
      entityType: "fria" as const,
      entityId: "fria-1",
      entityLabel: "FRIA HR",
      renewalType: "review_annual",
      nextRenewalISO: isoFromNow(3),
      daysUntil: 3,
    }
    const sched = getReminderSchedule(item, NOW)
    // Only "1d before" is future; 5/15/30 are past
    expect(sched.map((s) => s.daysBefore)).toEqual([1])
  })

  it("extracts QMS renewal when approved", () => {
    const items = extractAllRenewals(
      base({
        qmsWorkspace: {
          id: "qms-1",
          orgId: "org",
          organizationSize: "sme",
          simplifiedMode: true,
          sections: [],
          lessonsLearned: [],
          systemAttestations: [],
          status: "approved",
          completeness: "partial",
          versionLabel: "v1.0",
          approvedAtISO: isoFromNow(-100),
          linkedFindingIds: [],
          createdAtISO: isoFromNow(-100),
          updatedAtISO: isoFromNow(-100),
        },
      }),
      NOW,
    )
    expect(items).toHaveLength(1)
    expect(items[0].renewalType).toBe("qms_annual_review")
  })

  it("returns approval expiry only when pending", () => {
    const items = extractAllRenewals(
      base({
        approvalRequests: [
          {
            id: "ap-pending",
            orgId: "org",
            entityType: "dpia_screening",
            entityId: "x",
            title: "Pending",
            description: "",
            proposedChange: {},
            requestedByEmail: "u@x.com",
            requestedByRole: "client",
            requestedAtISO: isoFromNow(-2),
            status: "pending",
            expiresAtISO: isoFromNow(3),
            createdAtISO: isoFromNow(-2),
            updatedAtISO: isoFromNow(-2),
          },
          {
            id: "ap-approved",
            orgId: "org",
            entityType: "dpia_screening",
            entityId: "y",
            title: "Approved",
            description: "",
            proposedChange: {},
            requestedByEmail: "u@x.com",
            requestedByRole: "client",
            requestedAtISO: isoFromNow(-5),
            status: "approved",
            expiresAtISO: isoFromNow(3),
            createdAtISO: isoFromNow(-5),
            updatedAtISO: isoFromNow(-5),
          },
        ],
      }),
      NOW,
    )
    expect(items.map((i) => i.entityId)).toEqual(["ap-pending"])
  })

  it("breach with status anspdcp_notified is excluded", () => {
    const items = extractAllRenewals(
      base({
        breachRecords: [
          {
            id: "b-open",
            orgId: "org",
            title: "Open",
            description: "",
            cause: "cyberattack",
            discoveredAtISO: isoFromNow(-1),
            deadlineISO: isoFromNow(2),
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
          {
            id: "b-notified",
            orgId: "org",
            title: "Notified",
            description: "",
            cause: "cyberattack",
            discoveredAtISO: isoFromNow(-5),
            deadlineISO: isoFromNow(-2),
            severity: "high",
            dataCategories: [],
            affectedSubjectsCategories: [],
            affectedSystems: [],
            likelyConsequences: "",
            highRiskToRights: false,
            containmentMeasures: [],
            preventionMeasures: [],
            anspdcpNotificationRequired: true,
            subjectNotificationRequired: false,
            status: "anspdcp_notified",
            evidenceVaultIds: [],
            createdAtISO: isoFromNow(-5),
            updatedAtISO: isoFromNow(-5),
          },
        ],
      }),
      NOW,
    )
    expect(items.map((i) => i.entityId)).toEqual(["b-open"])
  })
})
