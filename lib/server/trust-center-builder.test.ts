/**
 * Sprint 013 — Tests pentru trust-center-builder (pure function).
 *
 * Verificăm:
 *   - counts corecte din ComplianceState
 *   - frameworks scope (AI_ACT / GDPR / DORA / NIS2)
 *   - attestations populated când există artefacte (transparency, role, DPIA)
 *   - audit pack hash root preluat din registry
 *   - branding aplicat (white-label override + default)
 *   - NO PII: nume actori / titlu findings / vendor nu apar în output
 */

import { describe, expect, it } from "vitest"
import { buildTrustCenterProfile } from "@/lib/server/trust-center-builder"
import { DEFAULT_BRANDING, type EffectiveBranding } from "@/lib/server/white-label"
import { initialComplianceState } from "@/lib/compliance/engine"
import type {
  AISystemRecord,
  BreachRecord,
  ComplianceState,
  DpiaRecord,
  RopaActivityRecord,
  ScanFinding,
  TransparencyImplementation,
  VendorRecord,
} from "@/lib/compliance/types"

const NOW = "2026-05-17T12:00:00.000Z"

function makeState(overrides: Partial<ComplianceState> = {}): ComplianceState {
  return {
    ...structuredClone(initialComplianceState),
    ...overrides,
  }
}

function defaultBranding(): EffectiveBranding {
  return { ...DEFAULT_BRANDING, isCustom: false }
}

function customBranding(): EffectiveBranding {
  return {
    logoUrl: "https://cabinet.ro/logo.png",
    primaryColor: "#001f3f",
    secondaryColor: "#7fdbff",
    brandName: "Cabinet X",
    signerName: "Diana Popescu",
    signerTitle: "DPO Manager",
    contactEmail: "contact@cabinet.ro",
    address: "Str. Lege 1",
    website: "https://cabinet.ro",
    updatedAtISO: "2026-05-01T00:00:00.000Z",
    isCustom: true,
  }
}

function ai(p: Partial<AISystemRecord> = {}): AISystemRecord {
  return {
    id: p.id ?? "ai-1",
    name: "Chatbot",
    purpose: "support-chatbot",
    vendor: "OpenAI",
    modelType: "gpt-4",
    usesPersonalData: true,
    makesAutomatedDecisions: false,
    impactsRights: false,
    hasHumanReview: true,
    riskLevel: "limited",
    recommendedActions: [],
    createdAtISO: "2026-05-01T00:00:00.000Z",
    ...p,
  }
}

function dpia(p: Partial<DpiaRecord> = {}): DpiaRecord {
  return {
    id: p.id ?? "d-1",
    title: "Eval",
    processingPurpose: "x",
    processingDescription: "",
    dataCategories: [],
    dataSubjects: [],
    legalBasis: "Art. 6(1)(b)",
    specialCategories: false,
    automatedDecisionMaking: false,
    largeScaleProcessing: false,
    necessityAssessment: "ok",
    proportionalityAssessment: "ok",
    risks: [],
    mitigationMeasures: [],
    residualRisk: "low",
    status: "completed",
    owner: "dpo",
    createdAtISO: "2026-05-01T00:00:00.000Z",
    updatedAtISO: "2026-05-10T00:00:00.000Z",
    ...p,
  }
}

function ropa(p: Partial<RopaActivityRecord> = {}): RopaActivityRecord {
  return {
    id: p.id ?? "r-1",
    activityName: "Process",
    purpose: "B2B",
    dataSubjects: [],
    dataCategories: [],
    specialCategories: [],
    legalBasis: "contract",
    recipients: [],
    processors: [],
    systems: [],
    thirdCountryTransfers: [],
    securityMeasures: [],
    source: "manual",
    confidence: "dpo_confirmed",
    status: "validated",
    linkedFindings: [],
    linkedEvidence: [],
    createdAtISO: "2026-05-01T00:00:00.000Z",
    updatedAtISO: "2026-05-01T00:00:00.000Z",
    ...p,
  }
}

function breach(p: Partial<BreachRecord> = {}): BreachRecord {
  return {
    id: p.id ?? "b-1",
    orgId: "org",
    title: "Incident",
    description: "secret content!",
    cause: "lost_device",
    discoveredAtISO: "2026-05-10T00:00:00.000Z",
    deadlineISO: "2026-05-13T00:00:00.000Z",
    severity: "medium",
    dataCategories: [],
    affectedSubjectsCategories: [],
    affectedSystems: [],
    likelyConsequences: "",
    highRiskToRights: false,
    containmentMeasures: [],
    preventionMeasures: [],
    anspdcpNotificationRequired: false,
    subjectNotificationRequired: false,
    status: "closed",
    evidenceVaultIds: [],
    createdAtISO: "2026-05-10T00:00:00.000Z",
    updatedAtISO: "2026-05-15T00:00:00.000Z",
    ...p,
  }
}

function vendor(p: Partial<VendorRecord> = {}): VendorRecord {
  return {
    id: p.id ?? "v-1",
    orgId: "org",
    name: "OpenAI Inc — confidential",
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
    reviewStatus: "approved",
    humanReviewRequired: false,
    linkedFindingIds: [],
    createdAtISO: "2026-05-01T00:00:00.000Z",
    updatedAtISO: "2026-05-01T00:00:00.000Z",
    ...p,
  }
}

function finding(p: Partial<ScanFinding> = {}): ScanFinding {
  return {
    id: p.id ?? "f-1",
    title: "SECRET title content",
    detail: "SECRET detail",
    category: "EU_AI_ACT",
    severity: "high",
    risk: "high",
    principles: ["accountability"],
    createdAtISO: "2026-05-01T00:00:00.000Z",
    sourceDocument: "x",
    findingStatus: "open",
    ...p,
  }
}

describe("trust-center-builder", () => {
  it("returnează profile gol cu defaults pentru state vid", () => {
    const profile = buildTrustCenterProfile({
      state: makeState(),
      orgId: "org-1",
      orgName: "Test Org",
      branding: defaultBranding(),
      nowISO: NOW,
    })
    expect(profile.orgName).toBe("Test Org")
    expect(profile.stats.aiSystemsCount).toBe(0)
    expect(profile.attestations.length).toBe(0)
    expect(profile.frameworksInScope.length).toBe(0)
    expect(profile.generatedAtISO).toBe(NOW)
  })

  it("calculează counts corecte din ComplianceState", () => {
    const state = makeState({
      aiSystems: [ai({ id: "ai-1", riskLevel: "limited" }), ai({ id: "ai-2", riskLevel: "high" })],
      findings: [
        finding({ id: "f-open", findingStatus: "open", severity: "medium" }),
        finding({ id: "f-crit", findingStatus: "confirmed", severity: "critical" }),
        finding({ id: "f-res", findingStatus: "resolved", severity: "high" }),
      ],
      dpiaRecords: [dpia({ id: "d-1", status: "completed" })],
      ropaActivities: [ropa(), ropa({ id: "r-2" })],
      breachRecords: [breach({ id: "b-1", status: "closed" }), breach({ id: "b-2", status: "anspdcp_required" })],
      vendorRecords: [vendor({ reviewStatus: "approved" }), vendor({ id: "v-2", reviewStatus: "in_review" })],
      literacyRecords: [
        {
          id: "lit-1",
          employeeName: "X",
          role: "ops",
          trainingDate: "2026-05-01",
          trainingType: "intern",
          topicsCovered: [],
          trainerName: "T",
          durationHours: 2,
          attestationSigned: true,
          createdAtISO: "2026-05-01T00:00:00.000Z",
        },
      ],
    })
    const profile = buildTrustCenterProfile({
      state,
      orgId: "org-1",
      orgName: "Test Org",
      branding: defaultBranding(),
      nowISO: NOW,
    })
    expect(profile.stats.aiSystemsCount).toBe(2)
    expect(profile.stats.highRiskSystemsCount).toBe(1)
    expect(profile.stats.findingsOpen).toBe(2) // open + confirmed
    expect(profile.stats.findingsResolved).toBe(1)
    expect(profile.stats.findingsCritical).toBe(1)
    expect(profile.stats.dpiaCompletedCount).toBe(1)
    expect(profile.stats.ropaActivitiesCount).toBe(2)
    expect(profile.stats.breachesClosedCount).toBe(1)
    expect(profile.stats.breachesPendingCount).toBe(1)
    expect(profile.stats.vendorsApprovedCount).toBe(1)
    expect(profile.stats.literacyRecordsCount).toBe(1)
  })

  it("frameworksInScope conține GDPR când există RoPA/DPIA/DSAR", () => {
    const profile = buildTrustCenterProfile({
      state: makeState({ ropaActivities: [ropa()] }),
      orgId: "org-1",
      orgName: "X",
      branding: defaultBranding(),
      nowISO: NOW,
    })
    expect(profile.frameworksInScope).toContain("GDPR")
  })

  it("frameworksInScope conține AI_ACT când role assessment != exempt", () => {
    const profile = buildTrustCenterProfile({
      state: makeState({
        roleAssessment: {
          id: "ra",
          primaryRole: "deployer",
          secondaryRoles: [],
          reasoning: "x",
          applicableArticles: [],
          scopeExceptions: [],
          answeredAtISO: "2026-05-01T00:00:00.000Z",
          answeredByEmail: "x@y.com",
          answers: {
            developsAI: "no",
            sellsToThirdParties: "no",
            usesAIInternally: "yes",
            importsFromNonEU: "no",
            distributesThirdPartyAI: "no",
            embedsAIInPhysicalProducts: "no",
            personalNonCommercialUseOnly: "no",
            militaryOrResearchOnly: "no",
          },
        },
      }),
      orgId: "org-1",
      orgName: "X",
      branding: defaultBranding(),
      nowISO: NOW,
    })
    expect(profile.frameworksInScope).toContain("AI_ACT")
    expect(profile.aiActRole).toBe("deployer")
    expect(profile.attestations.some((a) => a.label.includes("Rol declarat"))).toBe(true)
  })

  it("frameworksInScope include DORA + NIS2 dacă orgRegulatoryProfile le activează", () => {
    const profile = buildTrustCenterProfile({
      state: makeState({
        orgRegulatoryProfile: {
          orgId: "org-1",
          doraApplies: true,
          doraEntityType: "payment_institution",
          nis2EntityClass: "important",
          nis2Sectors: ["digital_infrastructure"],
          createdAtISO: NOW,
          updatedAtISO: NOW,
        },
      }),
      orgId: "org-1",
      orgName: "X",
      branding: defaultBranding(),
      nowISO: NOW,
    })
    expect(profile.frameworksInScope).toContain("DORA")
    expect(profile.frameworksInScope).toContain("NIS2")
    expect(profile.doraEntityType).toBe("payment_institution")
    expect(profile.nis2EntityClass).toBe("important")
  })

  it("attestations populate cu transparency notices Art. 50 + ref legală", () => {
    const impl: TransparencyImplementation = {
      id: "t-1",
      systemId: "ai-1",
      noticeType: "chatbot-disclosure",
      placement: "popup",
      language: "ro",
      implementedAtISO: "2026-05-01T00:00:00.000Z",
      implementedByEmail: "x@y.com",
    }
    const profile = buildTrustCenterProfile({
      state: makeState({ transparencyImplementations: [impl] }),
      orgId: "org-1",
      orgName: "X",
      branding: defaultBranding(),
      nowISO: NOW,
    })
    const t = profile.attestations.find((a) => a.legalReference.includes("Art. 50"))
    expect(t).toBeTruthy()
    expect(t?.label.includes("1 notificare")).toBe(true)
  })

  it("trimite audit pack hash root din registry (cel mai recent)", () => {
    const profile = buildTrustCenterProfile({
      state: makeState(),
      orgId: "org-1",
      orgName: "X",
      branding: defaultBranding(),
      auditPackRegistry: [
        {
          id: "ap-1",
          orgId: "org-1",
          orgName: "X",
          hashRoot: "abcdef0123",
          fileCount: 42,
          sizeBytes: 999,
          createdByUserId: "u-1",
          createdAtISO: "2026-05-15T10:00:00.000Z",
        },
      ],
      nowISO: NOW,
    })
    expect(profile.latestAuditPack?.hashRoot).toBe("abcdef0123")
    expect(profile.latestAuditPack?.contentsCount).toBe(42)
    expect(profile.latestAuditPack?.generatedAtISO).toBe("2026-05-15T10:00:00.000Z")
  })

  it("aplică branding custom (logo + culori + footer)", () => {
    const profile = buildTrustCenterProfile({
      state: makeState(),
      orgId: "org-1",
      orgName: "Test Org",
      branding: customBranding(),
      nowISO: NOW,
    })
    expect(profile.brandingLogoUrl).toBe("https://cabinet.ro/logo.png")
    expect(profile.brandingColor).toBe("#001f3f")
    expect(profile.brandingSecondaryColor).toBe("#7fdbff")
    expect(profile.brandingFooter).toBe("contact@cabinet.ro")
  })

  it("NU expune PII: titluri findings, descrieri breach, nume vendor nu apar în profile", () => {
    const profile = buildTrustCenterProfile({
      state: makeState({
        findings: [finding({ title: "TOPSECRET finding leak", detail: "very confidential" })],
        breachRecords: [breach({ description: "TOPSECRET breach details" })],
        vendorRecords: [vendor({ name: "TOPSECRET-vendor-name-xyz" })],
      }),
      orgId: "org-1",
      orgName: "Public Org",
      branding: defaultBranding(),
      nowISO: NOW,
    })
    const serialized = JSON.stringify(profile)
    expect(serialized.includes("TOPSECRET")).toBe(false)
    expect(serialized.includes("confidential")).toBe(false)
    expect(serialized.includes("xyz")).toBe(false)
  })
})
