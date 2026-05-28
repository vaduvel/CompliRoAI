import { describe, expect, it } from "vitest"

import type { ComplianceState, AIUseCaseRecord, ScanFinding } from "@/lib/compliance/types"
import { mergeWithDefault } from "@/lib/server/store"
import {
  buildAppStateSnapshot,
  fingerprintSnapshot,
} from "./state-snapshot"

function useCase(overrides: Partial<AIUseCaseRecord>): AIUseCaseRecord {
  return {
    id: "uc-default",
    orgId: "org-1",
    workspaceMode: "cabinet",
    clientId: "client-a",
    useCaseName: "Website chatbot",
    department: "customer_support",
    businessProcess: "customer_interaction",
    lifecycleStatus: "active",
    intendedPurpose: "Răspunde vizitatorilor site-ului.",
    deploymentMode: "embedded_in_product",
    internalUsers: [],
    affectedPersons: ["website_visitors"],
    vulnerableGroups: ["none_known"],
    usesPersonalData: "unknown",
    usesSpecialCategoryData: "unknown",
    usesConfidentialData: "unknown",
    usesTradeSecrets: "unknown",
    usesChildrenData: "unknown",
    dataCategories: ["unknown"],
    inputDataSource: ["website_chat"],
    transferOutsideEea: "unknown",
    outputTypes: ["chatbot_interaction"],
    autonomyLevel: "recommends_human_decides",
    humanReview: "unknown",
    publicOutput: "no",
    directInteractionWithPersons: "yes",
    automatedDecision: "unknown",
    scoringOrRanking: "no",
    impactsPeopleRights: "unknown",
    annexIIIDomain: "none",
    prohibitedPracticeFlags: ["none"],
    draftRole: "deployer",
    draftRiskLevel: "limited_transparency",
    highRiskCandidate: false,
    prohibitedCandidate: false,
    art50TransparencyTrigger: true,
    gdprReviewNeeded: true,
    dpiNeedsReview: true,
    friaCandidate: false,
    vendorReviewNeeded: true,
    humanOversightNeeded: true,
    loggingReviewNeeded: false,
    qmsReviewNeeded: false,
    pmmReviewNeeded: false,
    incidentProcessNeeded: false,
    certaintyStatus: "self_reported",
    reviewStatus: "needs_review",
    evidenceCompletenessPct: 0,
    openFindingsCount: 3,
    source: "manual",
    createdAtISO: "2026-05-27T08:00:00.000Z",
    createdBy: "user-1",
    updatedAtISO: "2026-05-27T08:00:00.000Z",
    auditVersion: 1,
    dedupeKey: "client-a:customer_support:chatbot",
    ...overrides,
  }
}

function finding(overrides: Partial<ScanFinding>): ScanFinding {
  return {
    id: "finding-1",
    title: "Atașează notice Art. 50",
    detail: "Chatbotul interacționează cu persoane.",
    category: "EU_AI_ACT",
    severity: "high",
    risk: "high",
    principles: ["transparency"],
    createdAtISO: "2026-05-27T08:00:00.000Z",
    sourceDocument: "engine",
    legalReference: "AI Act Art. 50(1)",
    evidenceRequired: "Notice text și screenshot.",
    findingStatus: "open",
    reviewState: "unreviewed",
    ...overrides,
  }
}

describe("buildAppStateSnapshot", () => {
  it("captures tenant-scoped AI use cases, findings and certainty counts", () => {
    const state = mergeWithDefault({
      aiUseCases: [
        useCase({ id: "uc-client-a", clientId: "client-a", certaintyStatus: "self_reported" }),
        useCase({ id: "uc-client-b", clientId: "client-b", certaintyStatus: "imported" }),
      ],
      findings: [
        finding({ id: "finding-open" }),
        finding({ id: "finding-resolved", findingStatus: "resolved", reviewState: "closed" }),
      ],
    } satisfies Partial<ComplianceState>)

    const snapshot = buildAppStateSnapshot({
      orgId: "org-1",
      workspaceMode: "cabinet",
      clientId: "client-a",
      user: { id: "user-1", role: "cabinet_consultant" },
      state,
    })

    expect(snapshot.aiUseCases.map((item) => item.id)).toEqual(["uc-client-a"])
    expect(snapshot.findings).toHaveLength(2)
    expect(snapshot.openFindingsCount).toBe(1)
    expect(snapshot.dataCertaintySummary.selfReported).toBe(1)
    expect(snapshot.dataCertaintySummary.imported).toBe(0)
  })

  it("creates a stable fingerprint for the same normalized state", () => {
    const state = mergeWithDefault({
      aiUseCases: [useCase({ id: "uc-client-a", clientId: "client-a" })],
      findings: [finding({ id: "finding-open" })],
    } satisfies Partial<ComplianceState>)

    const snapshot = buildAppStateSnapshot({
      orgId: "org-1",
      workspaceMode: "cabinet",
      clientId: "client-a",
      user: { id: "user-1", role: "cabinet_consultant" },
      state,
    })

    expect(fingerprintSnapshot(snapshot)).toBe(fingerprintSnapshot(structuredClone(snapshot)))
  })
})
