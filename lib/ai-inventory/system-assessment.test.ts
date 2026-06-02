import { describe, expect, it } from "vitest"

import {
  buildAISystemDisplayAssessment,
  labelForBusinessProcess,
} from "@/lib/ai-inventory/system-assessment"
import type { AISystemRecord, AIUseCaseRecord } from "@/lib/compliance/types"

function makeSystem(overrides: Partial<AISystemRecord> = {}): AISystemRecord {
  return {
    id: "system-1",
    name: "System",
    purpose: "other",
    vendor: "",
    modelType: "",
    usesPersonalData: false,
    makesAutomatedDecisions: false,
    impactsRights: false,
    hasHumanReview: true,
    riskLevel: "minimal",
    recommendedActions: [],
    createdAtISO: "2026-05-27T00:00:00.000Z",
    approvalStatus: "pending",
    policyAttestationStatus: "not-attested",
    ...overrides,
  } as AISystemRecord
}

function makeUseCase(overrides: Partial<AIUseCaseRecord> = {}): AIUseCaseRecord {
  return {
    id: "use-case-1",
    orgId: "org-1",
    workspaceMode: "cabinet",
    useCaseName: "Use case",
    department: "marketing",
    businessProcess: "content_creation",
    lifecycleStatus: "active",
    intendedPurpose: "Draft content",
    deploymentMode: "enterprise_saas",
    internalUsers: [],
    affectedPersons: ["candidates"],
    vulnerableGroups: [],
    usesPersonalData: "unknown",
    usesSpecialCategoryData: "unknown",
    usesConfidentialData: "unknown",
    usesTradeSecrets: "unknown",
    usesChildrenData: "unknown",
    dataCategories: [],
    inputDataSource: [],
    transferOutsideEea: "unknown",
    outputTypes: ["generated_text"],
    autonomyLevel: "unknown",
    humanReview: "unknown",
    publicOutput: "unknown",
    directInteractionWithPersons: "unknown",
    automatedDecision: "unknown",
    scoringOrRanking: "unknown",
    impactsPeopleRights: "unknown",
    annexIIIDomain: "none",
    prohibitedPracticeFlags: ["none"],
    draftRole: "deployer",
    draftRiskLevel: "minimal",
    highRiskCandidate: false,
    prohibitedCandidate: false,
    art50TransparencyTrigger: false,
    gdprReviewNeeded: false,
    dpiNeedsReview: false,
    friaCandidate: false,
    vendorReviewNeeded: false,
    humanOversightNeeded: false,
    loggingReviewNeeded: false,
    qmsReviewNeeded: false,
    pmmReviewNeeded: false,
    incidentProcessNeeded: false,
    certaintyStatus: "imported",
    reviewStatus: "needs_review",
    evidenceCompletenessPct: 0,
    openFindingsCount: 0,
    source: "import",
    createdAtISO: "2026-05-27T00:00:00.000Z",
    createdBy: "tester",
    updatedAtISO: "2026-05-27T00:00:00.000Z",
    auditVersion: 1,
    dedupeKey: "dedupe",
    ...overrides,
  } as AIUseCaseRecord
}

describe("buildAISystemDisplayAssessment", () => {
  it("keeps ChatGPT job-description drafting minimal at system level when linked use case is minimal", () => {
    const assessment = buildAISystemDisplayAssessment(
      makeSystem({
        name: "ChatGPT Team",
        purpose: "hr-screening",
        riskLevel: "high",
      }),
      [
        makeUseCase({
          useCaseName: "Redactare descrieri de job",
          businessProcess: "content_creation",
          draftRiskLevel: "minimal",
          usesPersonalData: "no",
          reviewStatus: "needs_review",
          openFindingsCount: 4,
        }),
      ],
    )

    expect(assessment.riskLabel).toBe("minimal")
    expect(assessment.riskTone).toBe("minimal")
    expect(assessment.purposeLabel).toBe("Conținut / marketing")
    expect(assessment.actionCount).toBe(4)
    expect(assessment.requiresFria).toBe(false)
    expect(assessment.requiresOversight).toBe(false)
    expect(assessment.requiresLogging).toBe(false)
    expect(assessment.requiresPmm).toBe(false)
    expect(assessment.requiresQms).toBe(false)
  })

  it("marks HR screening systems as high-risk candidate from linked use case obligations", () => {
    const assessment = buildAISystemDisplayAssessment(
      makeSystem({
        id: "system-hr",
        name: "HireRank AI ATS",
        purpose: "other",
        riskLevel: "minimal",
      }),
      [
        makeUseCase({
          linkedAiSystemId: "system-hr",
          useCaseName: "Screening CV și ranking candidați",
          businessProcess: "recruitment_selection",
          draftRiskLevel: "high_risk_candidate",
          highRiskCandidate: true,
          friaCandidate: true,
          humanOversightNeeded: true,
          loggingReviewNeeded: true,
          qmsReviewNeeded: true,
          pmmReviewNeeded: true,
          openFindingsCount: 8,
          reviewStatus: "needs_lawyer_review",
        }),
      ],
    )

    expect(assessment.riskLabel).toBe("high risk candidate")
    expect(assessment.riskTone).toBe("high")
    expect(assessment.purposeLabel).toBe("HR Screening")
    expect(assessment.actionCount).toBe(8)
    expect(assessment.requiresFria).toBe(true)
    expect(assessment.requiresOversight).toBe(true)
    expect(assessment.requiresLogging).toBe(true)
    expect(assessment.requiresPmm).toBe(true)
    expect(assessment.requiresQms).toBe(true)
  })

  it("treats prohibited candidate use cases as legal blockers, not FRIA/QMS work", () => {
    const assessment = buildAISystemDisplayAssessment(
      makeSystem({
        id: "system-emotion",
        name: "EmotionHire AI",
        purpose: "other",
        riskLevel: "high",
      }),
      [
        makeUseCase({
          linkedAiSystemId: "system-emotion",
          useCaseName: "Video interview emotion scoring",
          businessProcess: "risk_scoring",
          draftRiskLevel: "prohibited_candidate",
          prohibitedCandidate: true,
          prohibitedPracticeFlags: ["workplace_education_emotion_recognition"],
          humanOversightNeeded: true,
          loggingReviewNeeded: true,
          qmsReviewNeeded: true,
          pmmReviewNeeded: true,
          openFindingsCount: 8,
          reviewStatus: "needs_lawyer_review",
        }),
      ],
    )

    expect(assessment.riskLabel).toBe("prohibited candidate")
    expect(assessment.riskTone).toBe("critical")
    expect(assessment.purposeLabel).toBe("Scoring / prioritizare")
    expect(assessment.requiresFria).toBe(false)
    expect(assessment.requiresOversight).toBe(false)
    expect(assessment.requiresLogging).toBe(false)
    expect(assessment.requiresPmm).toBe(false)
    expect(assessment.requiresQms).toBe(false)
  })
})

describe("labelForBusinessProcess", () => {
  it("maps known business processes to user-facing labels", () => {
    expect(labelForBusinessProcess("contract_review")).toBe("Review contracte")
    expect(labelForBusinessProcess("software_development")).toBe("Software development")
    expect(labelForBusinessProcess("unknown")).toBe("Alt proces")
  })
})
