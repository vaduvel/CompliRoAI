/**
 * Sprint 011 — Audit Pack Builder upgrade verification.
 *
 * Bypass full buildAuditPack (needs request context) and build a sample
 * AIActState in-memory, call buildAuditPack via vi.mock to inject state,
 * then unzip the resulting buffer and assert all new module files exist.
 *
 * Verifică:
 *  - findings/registry.md + findings/audit-trail.md prezente
 *  - dpia/registry.md + dpia/records/{id}.md
 *  - ropa/data-map.md + ropa/data-map.json
 *  - breach/registry.md + breach/records/{id}.md
 *  - ai-discovery/data-map.md + exposure-report.md + 5 policy pack templates
 *  - vendor/registry.md + vendor/briefs/{id}.md
 *  - dsar/registry.md
 *  - audit-log/events.json + events.md + chain-verification.json
 *  - hash chain still verifies end-to-end
 *  - manifest summary contains new counts
 */

import { describe, expect, it, vi, beforeEach } from "vitest"
import JSZip from "jszip"

import { initialComplianceState } from "@/lib/compliance/engine"
import { appendComplianceEvents } from "@/lib/compliance/events"
import type {
  AIDataMapRecord,
  BreachRecord,
  ComplianceEvent,
  DpiaRecord,
  FriaRecord,
  HumanOversightProtocol,
  LoggingConfig,
  PmmPlan,
  RopaActivityRecord,
  ScanFinding,
  VendorRecord,
} from "@/lib/compliance/types"
import type { AIActState } from "@/lib/server/store"

vi.mock("@/lib/server/org-context", () => ({
  getOrgContext: vi.fn(async () => ({
    orgId: "org-test-pack",
    userId: "u1",
    email: "u1@example.com",
    orgName: "ACME SRL",
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

// Replace evidence-pack so we don't hit real reads.
vi.mock("@/lib/server/evidence-pack", () => ({
  buildAIActEvidencePack: vi.fn(async () => ({
    overallCompliance: 75,
    systems: [],
  })),
}))

vi.mock("@/lib/server/share-token-store", () => ({
  listOrgShareTokens: vi.fn(async () => []),
}))

vi.mock("@/lib/server/white-label", () => ({
  getEffectiveBranding: vi.fn(async () => ({
    logoUrl: null,
    primaryColor: "#3b5bdb",
    secondaryColor: "#0ea5e9",
    brandName: "CompliRoAI",
    signerName: null,
    signerTitle: null,
    contactEmail: null,
    address: null,
    website: null,
    updatedAtISO: null,
    isCustom: false,
  })),
}))

// Inject our crafted state via readState mock.
const mockState = { value: {} as AIActState }

vi.mock("@/lib/server/store", async () => {
  const actual = await vi.importActual<typeof import("@/lib/server/store")>(
    "@/lib/server/store",
  )
  return {
    ...actual,
    readState: vi.fn(async () => mockState.value),
    writeState: vi.fn(async () => {}),
  }
})

function buildSampleState(): AIActState {
  let base: AIActState = {
    ...initialComplianceState,
    findings: [],
    events: [],
  } as AIActState

  // Add a finding
  const finding: ScanFinding = {
    id: "finding-sample-1",
    title: "Vendor OpenAI fără DPA",
    detail: "Detected via vendor review",
    category: "GDPR",
    severity: "high",
    risk: "high",
    principles: [],
    createdAtISO: "2026-05-10T10:00:00.000Z",
    sourceDocument: "vendor",
    findingStatus: "open",
  }

  // Add DPIA
  const dpia: DpiaRecord = {
    id: "dpia-sample-1",
    title: "HR Screening AI DPIA",
    processingPurpose: "Recrutare candidati",
    processingDescription: "AI screening CV-uri",
    dataCategories: ["candidate CV", "evaluare"],
    dataSubjects: ["candidati"],
    legalBasis: "Art. 6(1)(b)",
    specialCategories: false,
    automatedDecisionMaking: true,
    largeScaleProcessing: false,
    necessityAssessment: "Necesar pentru selecție rapidă",
    proportionalityAssessment: "Proporțional cu volumul",
    risks: ["bias"],
    mitigationMeasures: ["human-in-the-loop"],
    residualRisk: "medium",
    status: "approved",
    owner: "dpo@acme.ro",
    createdAtISO: "2026-05-01T10:00:00.000Z",
    updatedAtISO: "2026-05-02T10:00:00.000Z",
  }

  // Add RoPA activity
  const ropa: RopaActivityRecord = {
    id: "ropa-sample-1",
    activityName: "Procesare candidati HR",
    purpose: "Recrutare",
    dataSubjects: ["candidati"],
    dataCategories: ["nume", "CV"],
    specialCategories: [],
    legalBasis: "Art. 6(1)(b)",
    recipients: [],
    processors: ["OpenAI"],
    systems: ["HR-AI"],
    thirdCountryTransfers: [],
    securityMeasures: ["encryption"],
    source: "manual",
    confidence: "client_claim",
    status: "validated",
    linkedFindings: [],
    linkedEvidence: [],
    createdAtISO: "2026-05-02T10:00:00.000Z",
    updatedAtISO: "2026-05-02T10:00:00.000Z",
  }

  // Add breach
  const breach: BreachRecord = {
    id: "breach-sample-1",
    orgId: "org-test-pack",
    title: "Ransomware CRM",
    description: "Sistem CRM criptat",
    cause: "cyberattack",
    discoveredAtISO: "2026-05-15T08:00:00.000Z",
    deadlineISO: "2026-05-18T08:00:00.000Z",
    severity: "high",
    dataCategories: ["identification"],
    affectedSubjectsCategories: ["clienti"],
    affectedSystems: ["CRM"],
    likelyConsequences: "Furt identitate",
    highRiskToRights: true,
    containmentMeasures: ["izolare server"],
    preventionMeasures: ["backup off-site"],
    anspdcpNotificationRequired: true,
    subjectNotificationRequired: true,
    status: "assessing",
    evidenceVaultIds: [],
    createdAtISO: "2026-05-15T09:00:00.000Z",
    updatedAtISO: "2026-05-15T09:00:00.000Z",
  }

  // Add AI Data Map
  const dataMap: AIDataMapRecord = {
    id: "aidm-sample-1",
    orgId: "org-test-pack",
    toolName: "ChatGPT",
    vendor: "OpenAI",
    deploymentMode: "saas",
    useCaseCategory: "internal_copilot",
    useCaseDescription: "Asistent intern",
    inputDataCategories: ["chat", "documents"],
    outputDataCategories: ["text"],
    processesPersonalData: false,
    processesSpecialCategories: false,
    childrenData: false,
    vendorRegion: "US",
    trainingDataUsage: "opt_out_available",
    dpaSigned: false,
    subprocessorsDocumented: false,
    riskCandidate: "needs_human_review",
    reasons: ["non-EU vendor"],
    linkedFindingIds: [],
    status: "active",
    createdAtISO: "2026-05-10T10:00:00.000Z",
    updatedAtISO: "2026-05-10T10:00:00.000Z",
  }

  // Add vendor
  const vendor: VendorRecord = {
    id: "vendor-sample-1",
    orgId: "org-test-pack",
    name: "OpenAI",
    productUsed: "ChatGPT Enterprise",
    vendorRegion: "US",
    role: "processor",
    serviceCategory: "AI/LLM",
    linkedAISystemIds: [],
    linkedAIDataMapIds: ["aidm-sample-1"],
    dpaStatus: "missing",
    transferRequired: true,
    transferMechanism: "unknown",
    subprocessorsList: [],
    securityEvidence: {
      iso27001: false,
      soc2: true,
      penTestRecent: false,
      encryptionInTransit: true,
      encryptionAtRest: true,
      mfaEnforced: true,
      auditLogsAvailable: true,
    },
    aiTerms: {
      trainingDataOptOut: "default_opt_out",
      inputDataRetention: "session_only",
      outputRightsOwnership: "client",
      modelTransparency: "partial",
      reproducibilityGuarantees: false,
    },
    riskLevel: "high",
    riskReasons: ["DPA lipsă"],
    reviewStatus: "needs_dpa",
    humanReviewRequired: true,
    linkedFindingIds: [],
    createdAtISO: "2026-05-10T10:00:00.000Z",
    updatedAtISO: "2026-05-10T10:00:00.000Z",
  }

  // Add events
  const event1: ComplianceEvent = {
    id: "evt-sample-1",
    type: "finding.created",
    entityType: "finding",
    entityId: finding.id,
    message: "Risc creat: vendor fără DPA",
    createdAtISO: "2026-05-10T10:00:00.000Z",
    actorLabel: "u1@example.com",
    actorRole: "owner",
    actorSource: "session",
  }
  const event2: ComplianceEvent = {
    id: "evt-sample-2",
    type: "dpia.approved",
    entityType: "system",
    entityId: dpia.id,
    message: "DPIA aprobat",
    createdAtISO: "2026-05-11T10:00:00.000Z",
    actorLabel: "u1@example.com",
    actorRole: "owner",
    actorSource: "session",
  }

  // Sprint 016 — Add a FRIA record + the AI system it links to.
  const aiSystem = {
    id: "sys-hr-1",
    orgId: "org-test-pack",
    name: "HR Screening AI",
    purpose: "hr-screening" as const,
    vendor: "OpenAI",
    modelType: "LLM",
    usesPersonalData: true,
    makesAutomatedDecisions: true,
    impactsRights: true,
    hasHumanReview: false,
    riskLevel: "high" as const,
    rationale: "Used to triage CVs",
    recommendedActions: [],
    createdAtISO: "2026-05-01T08:00:00.000Z",
  }
  const fria: FriaRecord = {
    id: "fria-sample-1",
    orgId: "org-test-pack",
    title: "FRIA HR Screening 2026",
    linkedAISystemId: "sys-hr-1",
    deployerType: "private_public_service",
    processDescription: "Trierea automată a CV-urilor pentru posturile vacante",
    frequencyOfUse: "weekly",
    affectedGroups: [
      {
        category: "Candidați angajare",
        estimatedCount: 500,
        vulnerabilities: ["vârstnici"],
      },
    ],
    rightsAtRisk: ["non_discrimination", "data_protection"],
    riskAssessments: [
      {
        rightAffected: "non_discrimination",
        description: "Posibilă discriminare indirectă pe vârstă",
        likelihood: "possible",
        severity: "moderate",
        riskLevel: "medium",
        mitigationMeasures: ["bias monitoring", "human-in-the-loop"],
        residualRisk: "low",
      },
    ],
    overallRiskScore: 25,
    overallRiskLevel: "low",
    humanOversightMeasures: [
      {
        measureType: "human_in_loop",
        description: "Recrutor revizuiește toate respingerile",
        responsibleRole: "Recrutor HR senior",
        triggerConditions: "decizie negativă",
        documentedAtISO: "2026-05-10T10:00:00.000Z",
      },
    ],
    complaintMechanism:
      "Plângerile se pot trimite la dpo@acme.ro; răspuns în 15 zile.",
    governanceMeasures: ["Audit lunar bias", "Training trimestrial operatori"],
    notifyAuthorityRequired: true,
    notifyAuthorityName: "ADR (Autoritatea pentru Digitalizarea României)",
    notifiedAtISO: "2026-05-12T10:00:00.000Z",
    authorityReference: "ADR/2026/12345",
    status: "approved",
    approvedByEmail: "dpo@acme.ro",
    approvedAtISO: "2026-05-11T10:00:00.000Z",
    linkedFindingIds: [],
    evidenceVaultIds: [],
    createdAtISO: "2026-05-10T10:00:00.000Z",
    updatedAtISO: "2026-05-12T10:00:00.000Z",
  }

  // Sprint 017 — Human Oversight Protocol pentru același sistem HR
  const oversight: HumanOversightProtocol = {
    id: "oversight-sample-1",
    orgId: "org-test-pack",
    title: "Oversight Protocol HR Screening 2026",
    linkedAISystemId: "sys-hr-1",
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
        email: "dpo@acme.ro",
        role: "DPO",
        competenceLevel: "expert",
        hasAuthorityToOverride: true,
        hasSupportTeam: true,
      },
    ],
    escalationSteps: [
      {
        triggerCondition: "Decizie negativă",
        escalateToEmail: "manager@acme.ro",
        escalateToRole: "Manager HR",
        slaHours: 4,
        notificationMethod: "email",
      },
    ],
    contestationProcedure: {
      channelDescription: "Email dpo@acme.ro pentru contestație",
      acknowledgementSlaHours: 24,
      resolutionSlaDays: 30,
      reviewerRole: "DPO",
      evidencePreservation: "Log-uri păstrate 3 ani",
    },
    stopProcedure: {
      stopButtonAvailable: true,
      stopButtonLocation: "Admin dashboard",
      fallbackMode: "manual_processing",
      fallbackDescription: "Recrutori procesează manual",
      testedAtISO: "2026-04-01T00:00:00.000Z",
      testFrequency: "quarterly",
    },
    evidenceChecklist: ["Training operatori"],
    evidenceItems: [],
    status: "approved",
    completeness: "complete",
    approvedByEmail: "dpo@acme.ro",
    approvedAtISO: "2026-05-11T10:00:00.000Z",
    nextReviewISO: "2026-11-08T00:00:00.000Z",
    linkedFindingIds: [],
    createdAtISO: "2026-05-10T10:00:00.000Z",
    updatedAtISO: "2026-05-11T10:00:00.000Z",
  }

  const logging: LoggingConfig = {
    id: "logging-sample-1",
    orgId: "org-test-pack",
    title: "Logging Config HR Screening 2026",
    linkedAISystemId: "sys-hr-1",
    severityLevel: "standard",
    eventCategoriesLogged: [
      "input_data_received",
      "output_decision_made",
      "human_override_applied",
      "error_or_anomaly",
      "system_start_stop",
    ],
    storageBackend: "siem_elastic",
    storageLocation: "https://elastic.acme.ro/index=ai_hr_logs",
    minRetentionMonths: 6,
    actualRetentionMonths: 6,
    retentionPolicy: "ILM rollover + delete la 6 luni; cold tier 3-6 luni.",
    integrityMechanism: "hash_chain",
    integrityMechanismDescription:
      "SHA-256 chain per event; root hash semnat zilnic în S3 Object Lock.",
    accessRoleDescription: "DPO + Security Team (MFA obligatoriu, role-based)",
    accessLogged: true,
    status: "active",
    completeness: "complete",
    retentionStatus: "compliant",
    approvedByEmail: "dpo@acme.ro",
    approvedAtISO: "2026-05-12T10:00:00.000Z",
    lastEvidenceAtISO: "2026-05-15T10:00:00.000Z",
    nextReviewISO: "2026-08-10T00:00:00.000Z",
    evidenceChecklist: ["Export SIEM lunar", "Screenshot retention policy"],
    evidenceItems: [
      {
        id: "logev-sample-1",
        type: "log_export",
        description: "Export SIEM mai 2026",
        uploadedAtISO: "2026-05-15T10:00:00.000Z",
        uploadedByEmail: "dpo@acme.ro",
        coversPeriodStartISO: "2026-05-01T00:00:00.000Z",
        coversPeriodEndISO: "2026-05-31T23:59:59.000Z",
        eventCount: 124567,
      },
    ],
    linkedFindingIds: [],
    createdAtISO: "2026-05-12T09:00:00.000Z",
    updatedAtISO: "2026-05-15T10:00:00.000Z",
  }

  const pmm: PmmPlan = {
    id: "pmm-sample-1",
    orgId: "org-test-pack",
    title: "PMM Plan HR Screening 2026",
    linkedAISystemId: "sys-hr-1",
    dataCollectionMethods: [
      "system_logs",
      "performance_metrics",
      "user_feedback",
      "bias_metrics",
    ],
    dataCollectionFrequency: "daily",
    dataCollectionDescription:
      "SIEM Splunk recepționează evenimente Art. 12 real-time; dashboard zilnic agregă metrici.",
    complianceEvaluationMethods: [
      "comparare AI vs ground truth lunar",
      "bias audit trimestrial",
    ],
    complianceMetricsTracked: ["accuracy", "bias_gap_demographic", "p95_latency_ms"],
    correctiveActionProcess:
      "Pragul accuracy < 0.85 declanșează review; ML lead aprobă roll-back în 4h.",
    preventiveActionProcess:
      "PSI > 0.2 declanșează retrain candidat; bias audit trimestrial.",
    reviewCycle: "quarterly",
    reviewCycleMonths: 3,
    reviews: [
      {
        id: "pmm-rv-sample-1",
        reviewDateISO: "2026-05-01T00:00:00.000Z",
        reviewedByEmail: "dpo@acme.ro",
        reviewType: "scheduled",
        performanceMetrics: { accuracy: 0.92, bias_gap_pct: 3.5 },
        risksDetected: ["bias gap în creștere pe grup A"],
        correctiveActions: ["retrain Q3"],
        preventiveActions: ["bias audit lunar"],
        nextReviewISO: "2026-08-01T00:00:00.000Z",
      },
    ],
    versionChanges: [
      {
        id: "pmm-vc-sample-1",
        changedAtISO: "2026-04-10T00:00:00.000Z",
        changedByEmail: "ml@acme.ro",
        oldVersion: "v1.0",
        newVersion: "v1.1",
        changeType: "config_update",
        substantialModification: false,
        riskReassessmentRequired: false,
        description: "Tweak threshold",
      },
    ],
    anomalies: [
      {
        id: "pmm-ano-sample-1",
        detectedAtISO: "2026-05-05T00:00:00.000Z",
        severity: "medium",
        category: "performance_drop",
        description: "latency p95 crescut 50ms",
        impactDescription: "ușoară degradare UX",
        resolved: true,
        resolvedAtISO: "2026-05-06T00:00:00.000Z",
        escalatedToIncident: false,
      },
    ],
    status: "active",
    completeness: "complete",
    freshnessStatus: "fresh",
    approvedByEmail: "dpo@acme.ro",
    approvedAtISO: "2026-04-20T00:00:00.000Z",
    lastReviewAtISO: "2026-05-01T00:00:00.000Z",
    nextReviewISO: "2026-08-01T00:00:00.000Z",
    linkedFindingIds: [],
    createdAtISO: "2026-04-15T00:00:00.000Z",
    updatedAtISO: "2026-05-01T00:00:00.000Z",
  }

  base = {
    ...base,
    aiSystems: [aiSystem],
    findings: [finding],
    dpiaRecords: [dpia],
    ropaActivities: [ropa],
    breachRecords: [breach],
    aiDataMapRecords: [dataMap],
    vendorRecords: [vendor],
    friaRecords: [fria],
    humanOversightProtocols: [oversight],
    loggingEvidence: [logging],
    pmmPlans: [pmm],
  } as AIActState
  base.events = appendComplianceEvents(base, [event1, event2])
  return base
}

beforeEach(() => {
  mockState.value = buildSampleState()
})

describe("audit-pack-builder Sprint 011 upgrade", () => {
  it("builds a pack containing all new module files", async () => {
    const { buildAuditPack } = await import("@/lib/server/audit-pack-builder")
    const result = await buildAuditPack("org-test-pack", {
      issuedByUserId: "u1",
      issuedByUserEmail: "u1@example.com",
      workspaceMode: "imm-classic",
      currentOrgId: "org-test-pack",
    })

    const zip = await JSZip.loadAsync(result.zipBuffer)
    const paths = Object.keys(zip.files).sort()

    // Spot-check legacy files still there
    expect(paths).toContain("inventory/ai-systems.json")
    expect(paths).toContain("MANIFEST.json")
    expect(paths).toContain("signatures/SIGNATURE.txt")

    // Sprint 011 new sections
    expect(paths).toContain("findings/registry.md")
    expect(paths).toContain("findings/audit-trail.md")
    expect(paths).toContain("dpia/registry.md")
    expect(paths).toContain("dpia/records/dpia-sample-1.md")
    expect(paths).toContain("ropa/data-map.md")
    expect(paths).toContain("ropa/data-map.json")
    expect(paths).toContain("breach/registry.md")
    expect(paths).toContain("breach/records/breach-sample-1.md")
    expect(paths).toContain("ai-discovery/data-map.md")
    expect(paths).toContain("ai-discovery/exposure-report.md")
    expect(paths).toContain("ai-discovery/policy-pack/ai-acceptable-use-policy.md")
    expect(paths).toContain("ai-discovery/policy-pack/ai-vendor-onboarding-checklist.md")
    expect(paths).toContain("ai-discovery/policy-pack/ai-incident-response-runbook.md")
    expect(paths).toContain("ai-discovery/policy-pack/ai-audit-logging-policy.md")
    expect(paths).toContain("ai-discovery/policy-pack/ai-human-oversight-charter.md")
    expect(paths).toContain("vendor/registry.md")
    expect(paths).toContain("vendor/briefs/vendor-sample-1.md")
    expect(paths).toContain("dsar/registry.md")
    expect(paths).toContain("audit-log/events.json")
    expect(paths).toContain("audit-log/events.md")
    expect(paths).toContain("audit-log/chain-verification.json")
  })

  it("manifest summary includes Sprint 011 extended counts", async () => {
    const { buildAuditPack } = await import("@/lib/server/audit-pack-builder")
    const result = await buildAuditPack("org-test-pack", {
      issuedByUserId: "u1",
      issuedByUserEmail: "u1@example.com",
      workspaceMode: "imm-classic",
      currentOrgId: "org-test-pack",
    })
    expect(result.manifest.summary.findingsCount).toBe(1)
    expect(result.manifest.summary.dpiaRecordsCount).toBe(1)
    expect(result.manifest.summary.ropaActivitiesCount).toBe(1)
    expect(result.manifest.summary.breachRecordsCount).toBe(1)
    expect(result.manifest.summary.aiDataMapRecordsCount).toBe(1)
    expect(result.manifest.summary.vendorRecordsCount).toBe(1)
    expect(result.manifest.summary.eventsCount).toBe(2)
    expect(result.manifest.summary.chainOk).toBe(true)
  })

  it("audit-log/events.json contains hash chain fields", async () => {
    const { buildAuditPack } = await import("@/lib/server/audit-pack-builder")
    const result = await buildAuditPack("org-test-pack", {
      issuedByUserId: "u1",
      issuedByUserEmail: "u1@example.com",
      workspaceMode: "imm-classic",
      currentOrgId: "org-test-pack",
    })
    const zip = await JSZip.loadAsync(result.zipBuffer)
    const json = await zip.file("audit-log/events.json")!.async("string")
    const parsed = JSON.parse(json)
    expect(parsed).toHaveLength(2)
    expect(parsed[0]).toHaveProperty("selfHash")
    expect(parsed[0]).toHaveProperty("prevHash")
  })

  it("chain-verification.json reports ok=true for clean ledger", async () => {
    const { buildAuditPack } = await import("@/lib/server/audit-pack-builder")
    const result = await buildAuditPack("org-test-pack", {
      issuedByUserId: "u1",
      issuedByUserEmail: "u1@example.com",
      workspaceMode: "imm-classic",
      currentOrgId: "org-test-pack",
    })
    const zip = await JSZip.loadAsync(result.zipBuffer)
    const json = await zip.file("audit-log/chain-verification.json")!.async("string")
    const parsed = JSON.parse(json)
    expect(parsed.ok).toBe(true)
    expect(parsed.totalEvents).toBe(2)
    expect(parsed.verifiedCount).toBe(2)
  })

  it("verifies its own hash chain end-to-end", async () => {
    const { buildAuditPack, verifyAuditPackZip } = await import(
      "@/lib/server/audit-pack-builder"
    )
    const result = await buildAuditPack("org-test-pack", {
      issuedByUserId: "u1",
      issuedByUserEmail: "u1@example.com",
      workspaceMode: "imm-classic",
      currentOrgId: "org-test-pack",
    })
    const verification = await verifyAuditPackZip(result.zipBuffer)
    expect(verification.valid).toBe(true)
    expect(verification.computedHashRoot).toBe(verification.expectedHashRoot)
    expect(verification.errors).toEqual([])
  })

  it("findings registry markdown contains finding title", async () => {
    const { buildAuditPack } = await import("@/lib/server/audit-pack-builder")
    const result = await buildAuditPack("org-test-pack", {
      issuedByUserId: "u1",
      issuedByUserEmail: "u1@example.com",
      workspaceMode: "imm-classic",
      currentOrgId: "org-test-pack",
    })
    const zip = await JSZip.loadAsync(result.zipBuffer)
    const md = await zip.file("findings/registry.md")!.async("string")
    expect(md).toContain("Vendor OpenAI fără DPA")
  })

  it("vendor brief contains vendor name", async () => {
    const { buildAuditPack } = await import("@/lib/server/audit-pack-builder")
    const result = await buildAuditPack("org-test-pack", {
      issuedByUserId: "u1",
      issuedByUserEmail: "u1@example.com",
      workspaceMode: "imm-classic",
      currentOrgId: "org-test-pack",
    })
    const zip = await JSZip.loadAsync(result.zipBuffer)
    const md = await zip.file("vendor/briefs/vendor-sample-1.md")!.async("string")
    expect(md).toContain("OpenAI")
  })

  it("ropa/data-map.json is parseable JSON with activities", async () => {
    const { buildAuditPack } = await import("@/lib/server/audit-pack-builder")
    const result = await buildAuditPack("org-test-pack", {
      issuedByUserId: "u1",
      issuedByUserEmail: "u1@example.com",
      workspaceMode: "imm-classic",
      currentOrgId: "org-test-pack",
    })
    const zip = await JSZip.loadAsync(result.zipBuffer)
    const json = await zip.file("ropa/data-map.json")!.async("string")
    const parsed = JSON.parse(json)
    expect(parsed.activities).toHaveLength(1)
    expect(parsed.activities[0].name).toBe("Procesare candidati HR")
  })

  // ── Sprint 016 — FRIA inclusion in Audit Pack ─────────────────────────────
  it("includes fria/registry.md + per-record markdown", async () => {
    const { buildAuditPack } = await import("@/lib/server/audit-pack-builder")
    const result = await buildAuditPack("org-test-pack", {
      issuedByUserId: "u1",
      issuedByUserEmail: "u1@example.com",
      workspaceMode: "imm-classic",
      currentOrgId: "org-test-pack",
    })
    const zip = await JSZip.loadAsync(result.zipBuffer)
    const paths = Object.keys(zip.files)
    expect(paths).toContain("fria/registry.md")
    expect(paths).toContain("fria/records/fria-sample-1.md")
  })

  it("fria/registry.md contains FRIA title, deployer label, and authority reference", async () => {
    const { buildAuditPack } = await import("@/lib/server/audit-pack-builder")
    const result = await buildAuditPack("org-test-pack", {
      issuedByUserId: "u1",
      issuedByUserEmail: "u1@example.com",
      workspaceMode: "imm-classic",
      currentOrgId: "org-test-pack",
    })
    const zip = await JSZip.loadAsync(result.zipBuffer)
    const md = await zip.file("fria/registry.md")!.async("string")
    expect(md).toContain("FRIA HR Screening 2026")
    expect(md).toContain("HR Screening AI")
    expect(md).toContain("Entitate privată — servicii publice")
    expect(md).toContain("ADR")
  })

  it("fria/records/<id>.md is a full evaluator-generated markdown", async () => {
    const { buildAuditPack } = await import("@/lib/server/audit-pack-builder")
    const result = await buildAuditPack("org-test-pack", {
      issuedByUserId: "u1",
      issuedByUserEmail: "u1@example.com",
      workspaceMode: "imm-classic",
      currentOrgId: "org-test-pack",
    })
    const zip = await JSZip.loadAsync(result.zipBuffer)
    const md = await zip
      .file("fria/records/fria-sample-1.md")!
      .async("string")
    // Sections produced by buildFriaMarkdown
    expect(md).toContain("# FRIA — FRIA HR Screening 2026")
    expect(md).toContain("## A. Profilul deployer-ului")
    expect(md).toContain("## D. Drepturile fundamentale la risc")
    expect(md).toContain("Nediscriminare")
    // Authority notification documented
    expect(md).toContain("ADR/2026/12345")
  })

  it("manifest summary includes friaRecordsCount", async () => {
    const { buildAuditPack } = await import("@/lib/server/audit-pack-builder")
    const result = await buildAuditPack("org-test-pack", {
      issuedByUserId: "u1",
      issuedByUserEmail: "u1@example.com",
      workspaceMode: "imm-classic",
      currentOrgId: "org-test-pack",
    })
    expect(result.manifest.summary.friaRecordsCount).toBe(1)
  })

  // ── Sprint 017 — Human Oversight in Audit Pack ────────────────────────────
  it("includes oversight/registry.md + per-record markdown", async () => {
    const { buildAuditPack } = await import("@/lib/server/audit-pack-builder")
    const result = await buildAuditPack("org-test-pack", {
      issuedByUserId: "u1",
      issuedByUserEmail: "u1@example.com",
      workspaceMode: "imm-classic",
      currentOrgId: "org-test-pack",
    })
    const zip = await JSZip.loadAsync(result.zipBuffer)
    const paths = Object.keys(zip.files)
    expect(paths).toContain("oversight/registry.md")
    expect(paths).toContain("oversight/records/oversight-sample-1.md")
  })

  it("oversight/registry.md contains title + model + sistem AI", async () => {
    const { buildAuditPack } = await import("@/lib/server/audit-pack-builder")
    const result = await buildAuditPack("org-test-pack", {
      issuedByUserId: "u1",
      issuedByUserEmail: "u1@example.com",
      workspaceMode: "imm-classic",
      currentOrgId: "org-test-pack",
    })
    const zip = await JSZip.loadAsync(result.zipBuffer)
    const md = await zip.file("oversight/registry.md")!.async("string")
    expect(md).toContain("Oversight Protocol HR Screening 2026")
    expect(md).toContain("HR Screening AI")
    expect(md).toContain("human_in_the_loop")
    expect(md).toContain("Art. 14")
  })

  it("oversight/records/<id>.md is full evaluator-generated markdown", async () => {
    const { buildAuditPack } = await import("@/lib/server/audit-pack-builder")
    const result = await buildAuditPack("org-test-pack", {
      issuedByUserId: "u1",
      issuedByUserEmail: "u1@example.com",
      workspaceMode: "imm-classic",
      currentOrgId: "org-test-pack",
    })
    const zip = await JSZip.loadAsync(result.zipBuffer)
    const md = await zip
      .file("oversight/records/oversight-sample-1.md")!
      .async("string")
    expect(md).toContain("# Oversight Protocol — Oversight Protocol HR Screening 2026")
    expect(md).toContain("## B. Capacități Art. 14(3) acoperite")
    expect(md).toContain("## E. Stop + fallback")
  })

  it("manifest summary includes oversightProtocolsCount", async () => {
    const { buildAuditPack } = await import("@/lib/server/audit-pack-builder")
    const result = await buildAuditPack("org-test-pack", {
      issuedByUserId: "u1",
      issuedByUserEmail: "u1@example.com",
      workspaceMode: "imm-classic",
      currentOrgId: "org-test-pack",
    })
    expect(result.manifest.summary.oversightProtocolsCount).toBe(1)
  })

  // ── Sprint 018 — Logging Evidence in Audit Pack ───────────────────────────
  it("includes logging/registry.md + per-record markdown", async () => {
    const { buildAuditPack } = await import("@/lib/server/audit-pack-builder")
    const result = await buildAuditPack("org-test-pack", {
      issuedByUserId: "u1",
      issuedByUserEmail: "u1@example.com",
      workspaceMode: "imm-classic",
      currentOrgId: "org-test-pack",
    })
    const zip = await JSZip.loadAsync(result.zipBuffer)
    const paths = Object.keys(zip.files)
    expect(paths).toContain("logging/registry.md")
    expect(paths).toContain("logging/records/logging-sample-1.md")
  })

  it("logging/registry.md contains title + severity + Art. 12 + Art. 26(6)", async () => {
    const { buildAuditPack } = await import("@/lib/server/audit-pack-builder")
    const result = await buildAuditPack("org-test-pack", {
      issuedByUserId: "u1",
      issuedByUserEmail: "u1@example.com",
      workspaceMode: "imm-classic",
      currentOrgId: "org-test-pack",
    })
    const zip = await JSZip.loadAsync(result.zipBuffer)
    const md = await zip.file("logging/registry.md")!.async("string")
    expect(md).toContain("Logging Config HR Screening 2026")
    expect(md).toContain("HR Screening AI")
    expect(md).toContain("standard")
    expect(md).toContain("Art. 12")
    expect(md).toContain("Art. 26(6)")
  })

  it("logging/records/<id>.md is full evaluator-generated markdown", async () => {
    const { buildAuditPack } = await import("@/lib/server/audit-pack-builder")
    const result = await buildAuditPack("org-test-pack", {
      issuedByUserId: "u1",
      issuedByUserEmail: "u1@example.com",
      workspaceMode: "imm-classic",
      currentOrgId: "org-test-pack",
    })
    const zip = await JSZip.loadAsync(result.zipBuffer)
    const md = await zip
      .file("logging/records/logging-sample-1.md")!
      .async("string")
    expect(md).toContain("# Logging Config — Logging Config HR Screening 2026")
    expect(md).toContain("B. Categorii evenimente loguite")
    expect(md).toContain("C. Storage + retenție")
  })

  it("manifest summary includes loggingConfigsCount", async () => {
    const { buildAuditPack } = await import("@/lib/server/audit-pack-builder")
    const result = await buildAuditPack("org-test-pack", {
      issuedByUserId: "u1",
      issuedByUserEmail: "u1@example.com",
      workspaceMode: "imm-classic",
      currentOrgId: "org-test-pack",
    })
    expect(result.manifest.summary.loggingConfigsCount).toBe(1)
  })

  // ── Sprint 019 — PMM in Audit Pack ────────────────────────────────────────
  it("includes pmm/registry.md + per-record markdown", async () => {
    const { buildAuditPack } = await import("@/lib/server/audit-pack-builder")
    const result = await buildAuditPack("org-test-pack", {
      issuedByUserId: "u1",
      issuedByUserEmail: "u1@example.com",
      workspaceMode: "imm-classic",
      currentOrgId: "org-test-pack",
    })
    const zip = await JSZip.loadAsync(result.zipBuffer)
    const paths = Object.keys(zip.files)
    expect(paths).toContain("pmm/registry.md")
    expect(paths).toContain("pmm/records/pmm-sample-1.md")
  })

  it("pmm/registry.md contains title + ciclu + Art. 72 + Annex IV", async () => {
    const { buildAuditPack } = await import("@/lib/server/audit-pack-builder")
    const result = await buildAuditPack("org-test-pack", {
      issuedByUserId: "u1",
      issuedByUserEmail: "u1@example.com",
      workspaceMode: "imm-classic",
      currentOrgId: "org-test-pack",
    })
    const zip = await JSZip.loadAsync(result.zipBuffer)
    const md = await zip.file("pmm/registry.md")!.async("string")
    expect(md).toContain("PMM Plan HR Screening 2026")
    expect(md).toContain("HR Screening AI")
    expect(md).toContain("quarterly")
    expect(md).toContain("Art. 72")
    expect(md).toContain("Annex IV")
  })

  it("pmm/records/<id>.md is full evaluator-generated markdown with timelines", async () => {
    const { buildAuditPack } = await import("@/lib/server/audit-pack-builder")
    const result = await buildAuditPack("org-test-pack", {
      issuedByUserId: "u1",
      issuedByUserEmail: "u1@example.com",
      workspaceMode: "imm-classic",
      currentOrgId: "org-test-pack",
    })
    const zip = await JSZip.loadAsync(result.zipBuffer)
    const md = await zip.file("pmm/records/pmm-sample-1.md")!.async("string")
    expect(md).toContain("# PMM Plan — PMM Plan HR Screening 2026")
    expect(md).toContain("A. Sistem AI")
    expect(md).toContain("B. Data collection")
    expect(md).toContain("C. Evaluare conformitate")
    expect(md).toContain("D. Acțiune corectivă")
    expect(md).toContain("## Reviews periodice")
    expect(md).toContain("## Version changes")
    expect(md).toContain("## Anomalii detectate")
  })

  it("manifest summary includes pmmPlansCount", async () => {
    const { buildAuditPack } = await import("@/lib/server/audit-pack-builder")
    const result = await buildAuditPack("org-test-pack", {
      issuedByUserId: "u1",
      issuedByUserEmail: "u1@example.com",
      workspaceMode: "imm-classic",
      currentOrgId: "org-test-pack",
    })
    expect(result.manifest.summary.pmmPlansCount).toBe(1)
  })

  it("FRIA inclusion preserves hash chain integrity", async () => {
    const { buildAuditPack, verifyAuditPackZip } = await import(
      "@/lib/server/audit-pack-builder"
    )
    const result = await buildAuditPack("org-test-pack", {
      issuedByUserId: "u1",
      issuedByUserEmail: "u1@example.com",
      workspaceMode: "imm-classic",
      currentOrgId: "org-test-pack",
    })
    const verification = await verifyAuditPackZip(result.zipBuffer)
    expect(verification.valid).toBe(true)
    expect(verification.errors).toEqual([])
  })
})

describe("audit-pack backward compat (Sprint 011)", () => {
  it("handles state with zero records gracefully (no crash, all sections present empty)", async () => {
    mockState.value = { ...initialComplianceState, events: [] } as AIActState
    const { buildAuditPack } = await import("@/lib/server/audit-pack-builder")
    const result = await buildAuditPack("org-test-pack", {
      issuedByUserId: "u1",
      issuedByUserEmail: "u1@example.com",
      workspaceMode: "imm-classic",
      currentOrgId: "org-test-pack",
    })
    const zip = await JSZip.loadAsync(result.zipBuffer)
    const paths = Object.keys(zip.files)
    // All section files present even when no records
    expect(paths).toContain("findings/registry.md")
    expect(paths).toContain("dpia/registry.md")
    expect(paths).toContain("ropa/data-map.md")
    expect(paths).toContain("breach/registry.md")
    expect(paths).toContain("ai-discovery/exposure-report.md")
    expect(paths).toContain("vendor/registry.md")
    expect(paths).toContain("dsar/registry.md")
    expect(paths).toContain("audit-log/events.md")
    expect(paths).toContain("pmm/registry.md")
    // Verify ok
    const { verifyAuditPackZip } = await import("@/lib/server/audit-pack-builder")
    const verification = await verifyAuditPackZip(result.zipBuffer)
    expect(verification.valid).toBe(true)
  })
})
