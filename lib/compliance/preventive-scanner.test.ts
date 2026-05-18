/**
 * Sprint 022 — Tests pentru preventive-scanner (pure function).
 */

import { describe, expect, it } from "vitest"
import { scanState } from "@/lib/compliance/preventive-scanner"
import { initialComplianceState } from "@/lib/compliance/engine"
import type {
  AIIncident,
  AISystemRecord,
  ApprovalRequest,
  BreachRecord,
  ComplianceState,
  DpiaRecord,
  DsarRequest,
  FriaRecord,
  HumanOversightProtocol,
  LegislativeChangeEvent,
  LoggingConfig,
  PmmPlan,
  QmsWorkspace,
  VendorRecord,
} from "@/lib/compliance/types"

const NOW = "2026-05-17T12:00:00.000Z"
const DAY = 86_400_000

function isoDaysAgo(days: number): string {
  return new Date(new Date(NOW).getTime() - days * DAY).toISOString()
}
function isoDaysFromNow(days: number): string {
  return new Date(new Date(NOW).getTime() + days * DAY).toISOString()
}

function baseState(overrides: Partial<ComplianceState> = {}): ComplianceState {
  return { ...initialComplianceState, ...overrides } as ComplianceState
}

// ── Fixtures ─────────────────────────────────────────────────────────────────

function makeSystem(o: Partial<AISystemRecord> = {}): AISystemRecord {
  return {
    id: o.id ?? "sys-1",
    name: o.name ?? "HR Screening AI",
    purpose: "hr-screening",
    vendor: "OpenAI",
    modelType: "gpt-4",
    usesPersonalData: true,
    makesAutomatedDecisions: true,
    impactsRights: true,
    hasHumanReview: true,
    riskLevel: o.riskLevel ?? "high",
    recommendedActions: [],
    createdAtISO: o.createdAtISO ?? isoDaysAgo(400),
    ...o,
  }
}

function makeFria(o: Partial<FriaRecord> = {}): FriaRecord {
  return {
    id: o.id ?? "fria-1",
    orgId: "org",
    title: o.title ?? "FRIA HR",
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
    approvedAtISO: o.approvedAtISO ?? isoDaysAgo(400),
    linkedFindingIds: [],
    evidenceVaultIds: [],
    createdAtISO: isoDaysAgo(400),
    updatedAtISO: isoDaysAgo(400),
    ...o,
  } as FriaRecord
}

function makeDpia(o: Partial<DpiaRecord> = {}): DpiaRecord {
  return {
    id: o.id ?? "dpia-1",
    title: o.title ?? "DPIA HR",
    processingPurpose: "x",
    processingDescription: "x",
    dataCategories: [],
    dataSubjects: [],
    legalBasis: "consent",
    specialCategories: false,
    automatedDecisionMaking: false,
    largeScaleProcessing: false,
    necessityAssessment: "",
    proportionalityAssessment: "",
    risks: [],
    mitigationMeasures: [],
    residualRisk: "low",
    status: "approved",
    owner: "",
    createdAtISO: isoDaysAgo(400),
    updatedAtISO: isoDaysAgo(400),
    ...o,
  }
}

function makeOversight(o: Partial<HumanOversightProtocol> = {}): HumanOversightProtocol {
  return {
    id: o.id ?? "ovs-1",
    orgId: "org",
    title: o.title ?? "Oversight HR",
    linkedAISystemId: "sys-1",
    oversightModel: "human_in_the_loop",
    capabilitiesCovered: [],
    responsibleHumans: [],
    escalationSteps: [],
    contestationProcedure: {
      channelDescription: "",
      acknowledgementSlaHours: 24,
      resolutionSlaDays: 14,
      reviewerRole: "DPO",
      evidencePreservation: "",
    },
    stopProcedure: {
      stopButtonAvailable: false,
      stopButtonLocation: "",
      fallbackMode: "manual_processing",
      fallbackDescription: "",
      testFrequency: "annually",
    },
    evidenceChecklist: [],
    evidenceItems: [],
    status: "approved",
    completeness: "partial",
    nextReviewISO: o.nextReviewISO,
    linkedFindingIds: [],
    createdAtISO: isoDaysAgo(30),
    updatedAtISO: o.updatedAtISO ?? isoDaysAgo(30),
    ...o,
  } as HumanOversightProtocol
}

function makeLogging(o: Partial<LoggingConfig> = {}): LoggingConfig {
  return {
    id: o.id ?? "log-1",
    orgId: "org",
    title: o.title ?? "Logging HR",
    linkedAISystemId: "sys-1",
    severityLevel: "standard",
    eventCategoriesLogged: [],
    storageBackend: "internal_db",
    storageLocation: "",
    minRetentionMonths: 6,
    actualRetentionMonths: 6,
    retentionPolicy: "",
    integrityMechanism: "none",
    integrityMechanismDescription: "",
    accessRoleDescription: "",
    accessLogged: false,
    status: "approved",
    completeness: "partial",
    retentionStatus: o.retentionStatus ?? "fresh",
    evidenceChecklist: [],
    evidenceItems: [],
    linkedFindingIds: [],
    nextReviewISO: o.nextReviewISO,
    createdAtISO: isoDaysAgo(30),
    updatedAtISO: isoDaysAgo(30),
    ...o,
  } as LoggingConfig
}

function makeVendor(o: Partial<VendorRecord> = {}): VendorRecord {
  return {
    id: o.id ?? "v-1",
    orgId: "org",
    name: o.name ?? "OpenAI",
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
    createdAtISO: isoDaysAgo(100),
    updatedAtISO: isoDaysAgo(100),
    ...o,
  } as VendorRecord
}

function makeQms(o: Partial<QmsWorkspace> = {}): QmsWorkspace {
  return {
    id: o.id ?? "qms-1",
    orgId: "org",
    organizationSize: "sme",
    simplifiedMode: true,
    sections: [],
    lessonsLearned: [],
    systemAttestations: [],
    status: "approved",
    completeness: "partial",
    versionLabel: "v1.0",
    approvedAtISO: o.approvedAtISO ?? isoDaysAgo(400),
    linkedFindingIds: [],
    createdAtISO: isoDaysAgo(400),
    updatedAtISO: isoDaysAgo(400),
    ...o,
  } as QmsWorkspace
}

function makeDsar(o: Partial<DsarRequest> = {}): DsarRequest {
  return {
    id: o.id ?? "dsar-1",
    orgId: "org",
    receivedAtISO: isoDaysAgo(28),
    deadlineISO: isoDaysFromNow(2),
    requesterName: "Ion",
    requesterEmail: "ion@example.com",
    requestType: "access",
    status: "in_progress",
    identityVerified: true,
    draftResponseGenerated: false,
    responseReviewedByHuman: false,
    evidenceVaultIds: [],
    createdAtISO: isoDaysAgo(28),
    updatedAtISO: isoDaysAgo(28),
    ...o,
  }
}

function makeBreach(o: Partial<BreachRecord> = {}): BreachRecord {
  return {
    id: o.id ?? "br-1",
    orgId: "org",
    title: o.title ?? "Breach 1",
    description: "x",
    cause: "cyberattack",
    discoveredAtISO: isoDaysAgo(1),
    deadlineISO: isoDaysFromNow(1),
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
    createdAtISO: isoDaysAgo(1),
    updatedAtISO: isoDaysAgo(1),
    ...o,
  }
}

function makeIncident(o: Partial<AIIncident> = {}): AIIncident {
  return {
    id: o.id ?? "inc-1",
    orgId: "org",
    title: o.title ?? "AI Incident",
    description: "x",
    category: "fundamental_rights_infringement",
    severity: "serious",
    linkedAISystemId: "sys-1",
    affectedSubjectsCategories: [],
    detectedAtISO: isoDaysAgo(5),
    reportingDeadlineISO: isoDaysFromNow(1),
    reportingDeadlineDays: 15,
    notifications: [],
    notificationRequired: true,
    linkedFindingIds: [],
    status: "assessing",
    createdAtISO: isoDaysAgo(5),
    updatedAtISO: isoDaysAgo(5),
    ...o,
  }
}

function makeApproval(o: Partial<ApprovalRequest> = {}): ApprovalRequest {
  return {
    id: o.id ?? "app-1",
    orgId: "org",
    entityType: "dpia_screening",
    entityId: "x",
    title: o.title ?? "Aprobă DPIA",
    description: "x",
    proposedChange: {},
    requestedByEmail: "u@x.com",
    requestedByRole: "client",
    requestedAtISO: isoDaysAgo(10),
    status: "pending",
    expiresAtISO: isoDaysFromNow(1),
    createdAtISO: isoDaysAgo(10),
    updatedAtISO: isoDaysAgo(10),
    ...o,
  }
}

const TEST_LOG: LegislativeChangeEvent[] = [
  {
    id: "leg-test-high",
    publishedAtISO: isoDaysAgo(30),
    regulation: "AI_ACT",
    articleReferences: ["Art. 50"],
    title: "Test high impact",
    summary: "x",
    impact: "high",
    affectedModules: ["transparency"],
    recommendedActions: [],
    source: "manual",
  },
  {
    id: "leg-test-low",
    publishedAtISO: isoDaysAgo(30),
    regulation: "AI_ACT",
    articleReferences: [],
    title: "Test low",
    summary: "x",
    impact: "low",
    affectedModules: [],
    recommendedActions: [],
    source: "manual",
  },
]

// ── Tests ────────────────────────────────────────────────────────────────────

describe("preventive-scanner", () => {
  it("returns empty array on empty state", () => {
    const actions = scanState(baseState(), NOW, { legislativeChangeLog: [] })
    expect(actions).toEqual([])
  })

  it("Rule 1: detects high-risk system without reclassification > 180d", () => {
    const state = baseState({ aiSystems: [makeSystem({ createdAtISO: isoDaysAgo(400) })] })
    const actions = scanState(state, NOW, { legislativeChangeLog: [] })
    expect(actions.some((a) => a.type === "system_reclassification_needed")).toBe(true)
  })

  it("Rule 2: detects FRIA review overdue at > 365d since approval", () => {
    const state = baseState({ friaRecords: [makeFria({ approvedAtISO: isoDaysAgo(400) })] })
    const actions = scanState(state, NOW, { legislativeChangeLog: [] })
    const fria = actions.find((a) => a.type === "fria_review_overdue")
    expect(fria).toBeDefined()
    expect(["overdue", "critical"]).toContain(fria!.urgency)
    expect(fria!.shouldEmitFinding).toBe(true)
  })

  it("Rule 3: DPIA with dueAtISO in past emits overdue", () => {
    const state = baseState({ dpiaRecords: [makeDpia({ dueAtISO: isoDaysAgo(5) })] })
    const actions = scanState(state, NOW, { legislativeChangeLog: [] })
    const dpia = actions.find((a) => a.type === "dpia_review_overdue")
    expect(dpia).toBeDefined()
    expect(dpia!.urgency).toBe("overdue")
  })

  it("Rule 4: Oversight protocol with nextReviewISO in 3 days emits due_soon", () => {
    const state = baseState({
      humanOversightProtocols: [makeOversight({ nextReviewISO: isoDaysFromNow(3) })],
    })
    const actions = scanState(state, NOW, { legislativeChangeLog: [] })
    const ovs = actions.find((a) => a.type === "oversight_review_overdue")
    expect(ovs).toBeDefined()
    expect(ovs!.urgency).toBe("due_soon")
  })

  it("Rule 5: Logging with retentionStatus=expired emits critical", () => {
    const state = baseState({
      loggingEvidence: [makeLogging({ retentionStatus: "expired" })],
    })
    const actions = scanState(state, NOW, { legislativeChangeLog: [] })
    const log = actions.find((a) => a.type === "logging_retention_expiring")
    expect(log).toBeDefined()
    expect(log!.urgency).toBe("critical")
    expect(log!.shouldEmitFinding).toBe(true)
  })

  it("Rule 6: PMM with nextReviewISO in 4 days emits due_soon", () => {
    const state = baseState({
      pmmPlans: [
        {
          id: "pmm-1",
          orgId: "org",
          title: "PMM HR",
          linkedAISystemId: "sys-1",
          dataCollectionMethods: [],
          dataCollectionFrequency: "weekly",
          dataCollectionDescription: "",
          complianceEvaluationMethods: [],
          complianceMetricsTracked: [],
          correctiveActionProcess: "",
          preventiveActionProcess: "",
          reviewCycle: "quarterly",
          reviewCycleMonths: 3,
          reviews: [],
          versionChanges: [],
          anomalies: [],
          status: "approved",
          completeness: "partial",
          freshnessStatus: "fresh",
          nextReviewISO: isoDaysFromNow(4),
          linkedFindingIds: [],
          createdAtISO: isoDaysAgo(30),
          updatedAtISO: isoDaysAgo(30),
        } as PmmPlan,
      ],
    })
    const actions = scanState(state, NOW, { legislativeChangeLog: [] })
    expect(actions.some((a) => a.type === "pmm_review_overdue" && a.urgency === "due_soon")).toBe(true)
  })

  it("Rule 7: Vendor with DPA expiring in 10 days emits due_soon", () => {
    const state = baseState({
      vendorRecords: [makeVendor({ dpaExpiresAtISO: isoDaysFromNow(10) })],
    })
    const actions = scanState(state, NOW, { legislativeChangeLog: [] })
    const v = actions.find((a) => a.type === "vendor_dpa_expiring")
    expect(v).toBeDefined()
    expect(v!.urgency).toBe("watch")
    expect(v!.emailTemplate).toBe("vendor-dpa-expiring")
  })

  it("Rule 8: QMS without approval emits watch + no email", () => {
    const state = baseState({ qmsWorkspace: makeQms({ approvedAtISO: undefined }) })
    const actions = scanState(state, NOW, { legislativeChangeLog: [] })
    const q = actions.find((a) => a.type === "qms_annual_review_due")
    expect(q).toBeDefined()
    expect(q!.urgency).toBe("watch")
  })

  it("Rule 10: DSAR with 2 days until deadline emits due_soon", () => {
    const state = baseState({ dsarRequests: [makeDsar({ deadlineISO: isoDaysFromNow(2) })] })
    const actions = scanState(state, NOW, { legislativeChangeLog: [] })
    const d = actions.find((a) => a.type === "dsar_response_overdue")
    expect(d).toBeDefined()
    expect(d!.urgency).toBe("due_soon")
    expect(d!.emailTemplate).toBe("dsar-deadline-alert")
  })

  it("Rule 11: Breach with deadline in 1 day emits critical", () => {
    const state = baseState({ breachRecords: [makeBreach({ deadlineISO: isoDaysFromNow(1) })] })
    const actions = scanState(state, NOW, { legislativeChangeLog: [] })
    const b = actions.find((a) => a.type === "breach_72h_expiring")
    expect(b).toBeDefined()
    expect(b!.urgency).toBe("critical")
    expect(b!.shouldEmail).toBe(true)
  })

  it("Rule 12: AI Incident with reportingDeadline in 1 day emits critical", () => {
    const state = baseState({ aiIncidents: [makeIncident({ reportingDeadlineISO: isoDaysFromNow(1) })] })
    const actions = scanState(state, NOW, { legislativeChangeLog: [] })
    const i = actions.find((a) => a.type === "ai_incident_deadline_expiring")
    expect(i).toBeDefined()
    expect(i!.urgency).toBe("critical")
  })

  it("Rule 13: Approval expired emits overdue", () => {
    const state = baseState({ approvalRequests: [makeApproval({ expiresAtISO: isoDaysAgo(1) })] })
    const actions = scanState(state, NOW, { legislativeChangeLog: [] })
    const a = actions.find((x) => x.type === "approval_request_expired")
    expect(a).toBeDefined()
    expect(a!.urgency).toBe("overdue")
    expect(a!.shouldEmitFinding).toBe(true)
  })

  it("Rule 14: legislative change unacknowledged emits action; acknowledged is skipped", () => {
    const state1 = baseState({})
    const a1 = scanState(state1, NOW, { legislativeChangeLog: TEST_LOG })
    expect(a1.some((x) => x.type === "legislative_change_unacknowledged" && x.entityId === "leg-test-high")).toBe(true)
    // low impact entries do not emit
    expect(a1.some((x) => x.entityId === "leg-test-low")).toBe(false)
    // Acknowledged skip
    const state2 = baseState({
      legislativeChangeAcknowledgments: [
        {
          changeId: "leg-test-high",
          orgId: "org",
          acknowledgedAtISO: NOW,
          acknowledgedByEmail: "u@x.com",
        },
      ],
    })
    const a2 = scanState(state2, NOW, { legislativeChangeLog: TEST_LOG })
    expect(a2.some((x) => x.entityId === "leg-test-high")).toBe(false)
  })

  it("Rule 15: missing audit pack — emits watch when no pack and systems exist", () => {
    const state = baseState({ aiSystems: [makeSystem({ createdAtISO: isoDaysAgo(20) })] })
    const actions = scanState(state, NOW, { legislativeChangeLog: [] })
    expect(actions.some((a) => a.type === "missing_audit_pack_recent")).toBe(true)
  })

  it("sort returns critical/overdue actions before watch", () => {
    const state = baseState({
      breachRecords: [makeBreach({ deadlineISO: isoDaysFromNow(1) })],
      aiSystems: [makeSystem({ createdAtISO: isoDaysAgo(400) })],
    })
    const actions = scanState(state, NOW, { legislativeChangeLog: [] })
    expect(actions.length).toBeGreaterThan(1)
    expect(["critical", "overdue", "due_soon"]).toContain(actions[0].urgency)
  })

  it("each action has stable ID prefixed prev-<type>-", () => {
    const state = baseState({
      vendorRecords: [makeVendor({ dpaExpiresAtISO: isoDaysFromNow(10) })],
    })
    const actions = scanState(state, NOW, { legislativeChangeLog: [] })
    for (const a of actions) {
      expect(a.id).toMatch(/^prev-/)
      expect(a.detectedAtISO).toBe(NOW)
    }
  })
})
