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

  base = {
    ...base,
    findings: [finding],
    dpiaRecords: [dpia],
    ropaActivities: [ropa],
    breachRecords: [breach],
    aiDataMapRecords: [dataMap],
    vendorRecords: [vendor],
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
      workspaceMode: "solo",
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
      workspaceMode: "solo",
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
      workspaceMode: "solo",
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
      workspaceMode: "solo",
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
      workspaceMode: "solo",
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
      workspaceMode: "solo",
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
      workspaceMode: "solo",
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
      workspaceMode: "solo",
      currentOrgId: "org-test-pack",
    })
    const zip = await JSZip.loadAsync(result.zipBuffer)
    const json = await zip.file("ropa/data-map.json")!.async("string")
    const parsed = JSON.parse(json)
    expect(parsed.activities).toHaveLength(1)
    expect(parsed.activities[0].name).toBe("Procesare candidati HR")
  })
})

describe("audit-pack backward compat (Sprint 011)", () => {
  it("handles state with zero records gracefully (no crash, all sections present empty)", async () => {
    mockState.value = { ...initialComplianceState, events: [] } as AIActState
    const { buildAuditPack } = await import("@/lib/server/audit-pack-builder")
    const result = await buildAuditPack("org-test-pack", {
      issuedByUserId: "u1",
      issuedByUserEmail: "u1@example.com",
      workspaceMode: "solo",
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
    // Verify ok
    const { verifyAuditPackZip } = await import("@/lib/server/audit-pack-builder")
    const verification = await verifyAuditPackZip(result.zipBuffer)
    expect(verification.valid).toBe(true)
  })
})
