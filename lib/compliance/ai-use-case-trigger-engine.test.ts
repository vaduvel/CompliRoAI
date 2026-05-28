import { describe, expect, it } from "vitest"

import type { AIUseCaseRecord } from "@/lib/compliance/types"
import {
  buildAIUseCaseDedupeKey,
  deriveAIUseCaseDraftFlags,
  evaluateAIUseCaseTriggers,
  mergeAIUseCaseFindings,
} from "@/lib/compliance/ai-use-case-trigger-engine"

const NOW = "2026-05-27T08:00:00.000Z"

function useCase(overrides: Partial<AIUseCaseRecord>): AIUseCaseRecord {
  return {
    id: "uc-base",
    orgId: "org-apex",
    workspaceMode: "cabinet",
    clientId: "org-apex",
    linkedAiSystemId: null,
    linkedVendorId: null,
    linkedModelId: null,
    linkedDataProcessId: null,
    useCaseName: "Utilizare AI",
    shortDescription: null,
    department: "unknown",
    businessProcess: "unknown",
    lifecycleStatus: "unknown",
    ownerName: null,
    ownerEmail: null,
    ownerRole: null,
    intendedPurpose: "Scop neconfirmat.",
    actualUseDescription: null,
    outOfScopeUse: null,
    toolName: null,
    vendorName: null,
    modelName: null,
    deploymentMode: "unknown",
    internalUsers: [],
    affectedPersons: ["unknown"],
    vulnerableGroups: ["unknown"],
    usesPersonalData: "unknown",
    usesSpecialCategoryData: "unknown",
    usesConfidentialData: "unknown",
    usesTradeSecrets: "unknown",
    usesChildrenData: "unknown",
    dataCategories: ["unknown"],
    inputDataSource: ["unknown"],
    dataRegion: "unknown",
    transferOutsideEea: "unknown",
    outputTypes: ["unknown"],
    autonomyLevel: "unknown",
    humanReview: "unknown",
    publicOutput: "unknown",
    directInteractionWithPersons: "unknown",
    automatedDecision: "unknown",
    scoringOrRanking: "unknown",
    impactsPeopleRights: "unknown",
    annexIIIDomain: "unknown",
    prohibitedPracticeFlags: ["unknown"],
    draftRole: "unknown",
    draftRiskLevel: "unknown",
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
    certaintyStatus: "self_reported",
    reviewStatus: "needs_review",
    evidenceCompletenessPct: 0,
    openFindingsCount: 0,
    source: "manual",
    sourceImportId: null,
    sourceRowNumber: null,
    sourceMagicLinkToken: null,
    sourceConfidencePct: null,
    createdAtISO: NOW,
    createdBy: "user-radu",
    updatedAtISO: NOW,
    updatedBy: null,
    archivedAtISO: null,
    archivedBy: null,
    auditVersion: 1,
    dedupeKey: "org-apex:unknown:utilizare-ai:no_tool",
    consultantNotes: null,
    internalNotes: null,
    ...overrides,
  }
}

function titles(findings: ReturnType<typeof evaluateAIUseCaseTriggers>) {
  return findings.map((finding) => finding.title)
}

describe("AIUseCase trigger engine", () => {
  it("creates marketing ChatGPT findings without high-risk noise", () => {
    const record = useCase({
      id: "uc-marketing",
      useCaseName: "Generare texte marketing cu ChatGPT",
      department: "marketing",
      businessProcess: "content_creation",
      intendedPurpose: "Generarea de drafturi pentru postări, reclame și emailuri.",
      toolName: "ChatGPT Team",
      vendorName: "OpenAI",
      usesPersonalData: "unknown",
      usesConfidentialData: "yes",
      usesTradeSecrets: "unknown",
      publicOutput: "yes",
      outputTypes: ["generated_text"],
      humanReview: "required_before_action",
      directInteractionWithPersons: "no",
      automatedDecision: "no",
      scoringOrRanking: "no",
      impactsPeopleRights: "no",
      annexIIIDomain: "none",
      prohibitedPracticeFlags: ["none"],
    })

    const findings = evaluateAIUseCaseTriggers(record, NOW)

    expect(titles(findings)).toEqual(
      expect.arrayContaining([
        "Confirmă dacă utilizarea AI procesează date personale: Generare texte marketing cu ChatGPT",
        "Review vendor/model pentru Generare texte marketing cu ChatGPT",
        "Pornește / confirmă AI Literacy pentru utilizarea AI: Generare texte marketing cu ChatGPT",
        "Verifică politica pentru date confidențiale în AI: Generare texte marketing cu ChatGPT",
      ])
    )
    expect(titles(findings).some((title) => title.includes("high-risk"))).toBe(false)
    expect(findings.every((finding) => finding.requiresHumanReview === true)).toBe(true)
  })

  it("creates chatbot Art. 50 and GDPR findings", () => {
    const record = useCase({
      id: "uc-chatbot",
      useCaseName: "Chatbot suport clienți pe website",
      department: "customer_support",
      businessProcess: "customer_interaction",
      intendedPurpose: "Răspunde la întrebări frecvente și creează drafturi de răspuns.",
      vendorName: "Intercom AI",
      usesPersonalData: "yes",
      outputTypes: ["chatbot_interaction", "generated_text"],
      directInteractionWithPersons: "yes",
      humanReview: "escalation_only",
      publicOutput: "no",
      annexIIIDomain: "none",
      prohibitedPracticeFlags: ["none"],
    })

    expect(titles(evaluateAIUseCaseTriggers(record, NOW))).toEqual(
      expect.arrayContaining([
        "Adaugă notice Art. 50 pentru chatbot: Chatbot suport clienți pe website",
        "Verifică GDPR/RoPA/DPIA pentru utilizarea AI: Chatbot suport clienți pe website",
        "Review vendor/model pentru Chatbot suport clienți pe website",
      ])
    )
  })

  it("creates ATS high-risk candidate findings and never a final legal verdict", () => {
    const record = deriveAIUseCaseDraftFlags(
      useCase({
        id: "uc-ats",
        useCaseName: "ATS AI screening CV",
        department: "hr_recruitment",
        businessProcess: "recruitment_selection",
        intendedPurpose: "Analizează și filtrează aplicații de angajare.",
        vendorName: "VendorX",
        usesPersonalData: "yes",
        usesConfidentialData: "yes",
        outputTypes: ["ranking", "scoring", "classification", "recommendation"],
        autonomyLevel: "ranks_or_scores",
        humanReview: "unknown",
        automatedDecision: "unknown",
        scoringOrRanking: "yes",
        impactsPeopleRights: "yes",
        annexIIIDomain: "employment_worker_management",
        prohibitedPracticeFlags: ["none"],
      })
    )

    const findings = evaluateAIUseCaseTriggers(record, NOW)

    expect(record.highRiskCandidate).toBe(true)
    expect(record.draftRiskLevel).toBe("high_risk_candidate")
    expect(record.reviewStatus).toBe("needs_lawyer_review")
    expect(titles(findings)).toEqual(
      expect.arrayContaining([
        "Review high-risk candidate pentru ATS AI screening CV",
        "Verifică GDPR/RoPA/DPIA pentru utilizarea AI: ATS AI screening CV",
        "Definește human oversight pentru ATS AI screening CV",
        "Review vendor/model pentru ATS AI screening CV",
        "Verifică logging evidence pentru ATS AI screening CV",
      ])
    )
    expect(findings.every((finding) => finding.verdictConfidenceReason?.includes("Nu este verdict legal final"))).toBe(true)
  })

  it("does not mark HR job-description drafting as high-risk when there is no scoring or candidate decision impact", () => {
    const record = deriveAIUseCaseDraftFlags(
      useCase({
        id: "uc-job-description",
        useCaseName: "Redactare descrieri de job",
        department: "hr_recruitment",
        businessProcess: "content_creation",
        intendedPurpose: "Generează drafturi de anunțuri de angajare fără date candidați.",
        toolName: "ChatGPT Team",
        vendorName: "OpenAI",
        usesPersonalData: "no",
        usesConfidentialData: "yes",
        humanReview: "required_before_action",
        automatedDecision: "no",
        scoringOrRanking: "no",
        impactsPeopleRights: "unknown",
        annexIIIDomain: "none",
        prohibitedPracticeFlags: ["none"],
        outputTypes: ["generated_text"],
      })
    )

    const findings = evaluateAIUseCaseTriggers(record, NOW)

    expect(record.highRiskCandidate).toBe(false)
    expect(record.draftRiskLevel).not.toBe("high_risk_candidate")
    expect(titles(findings).some((title) => title.includes("high-risk"))).toBe(false)
    expect(titles(findings)).toEqual(
      expect.arrayContaining([
        "Review vendor/model pentru Redactare descrieri de job",
        "Pornește / confirmă AI Literacy pentru utilizarea AI: Redactare descrieri de job",
        "Verifică politica pentru date confidențiale în AI: Redactare descrieri de job",
      ])
    )
  })

  it("creates Copilot development source-code, vendor training-use, security and literacy findings", () => {
    const record = useCase({
      id: "uc-copilot",
      useCaseName: "GitHub Copilot pentru dezvoltare software",
      department: "it_development",
      businessProcess: "software_development",
      intendedPurpose: "Asistă developerii la scrierea și refactorizarea codului.",
      toolName: "GitHub Copilot Business",
      vendorName: "Microsoft/GitHub",
      usesPersonalData: "unknown",
      usesConfidentialData: "yes",
      usesTradeSecrets: "yes",
      dataCategories: ["source_code", "trade_secrets", "confidential_business_data"],
      inputDataSource: ["code_repository", "manual_user_input"],
      outputTypes: ["code_generation", "recommendation"],
      humanReview: "required_before_action",
      annexIIIDomain: "none",
      prohibitedPracticeFlags: ["none"],
    })

    expect(titles(evaluateAIUseCaseTriggers(record, NOW))).toEqual(
      expect.arrayContaining([
        "Verifică politica pentru cod sursă și secrete comerciale în AI: GitHub Copilot pentru dezvoltare software",
        "Confirmă dacă vendorul folosește datele clientului la training: GitHub Copilot pentru dezvoltare software",
        "Review IT security pentru utilizarea AI: GitHub Copilot pentru dezvoltare software",
        "Pornește / confirmă AI Literacy pentru utilizarea AI: GitHub Copilot pentru dezvoltare software",
      ])
    )
  })

  it("creates contract summarization GDPR, confidentiality, vendor DPA and legal human-review findings", () => {
    const record = useCase({
      id: "uc-contract-summary",
      useCaseName: "Sumarizare contracte cu AI",
      department: "legal_compliance",
      businessProcess: "contract_review",
      intendedPurpose: "Creează rezumate interne pentru contracte comerciale.",
      toolName: "ChatGPT Team / Legal AI",
      vendorName: "OpenAI",
      usesPersonalData: "yes",
      usesSpecialCategoryData: "unknown",
      usesConfidentialData: "yes",
      usesTradeSecrets: "yes",
      dataCategories: ["contracts_legal_docs", "customer_data", "confidential_business_data", "trade_secrets"],
      outputTypes: ["summarization", "generated_text"],
      humanReview: "required_before_action",
      annexIIIDomain: "none",
      prohibitedPracticeFlags: ["none"],
    })

    expect(titles(evaluateAIUseCaseTriggers(record, NOW))).toEqual(
      expect.arrayContaining([
        "Verifică GDPR/RoPA/DPIA pentru utilizarea AI: Sumarizare contracte cu AI",
        "Verifică politica pentru date confidențiale în AI: Sumarizare contracte cu AI",
        "Review vendor/model pentru Sumarizare contracte cu AI",
        "Confirmă review juridic uman pentru Sumarizare contracte cu AI",
      ])
    )
  })

  it("does not duplicate findings on repeated save", () => {
    const record = useCase({
      id: "uc-repeat",
      useCaseName: "Chatbot suport",
      businessProcess: "customer_interaction",
      outputTypes: ["chatbot_interaction"],
      directInteractionWithPersons: "yes",
      usesPersonalData: "yes",
    })
    const first = evaluateAIUseCaseTriggers(record, NOW)
    const second = evaluateAIUseCaseTriggers(record, NOW)

    const merged = mergeAIUseCaseFindings(first, second)

    expect(merged).toHaveLength(first.length)
    expect(new Set(merged.map((finding) => finding.id)).size).toBe(first.length)
  })

  it("builds a stable dedupe key and treats unknown as review-needed, not false", () => {
    const key = buildAIUseCaseDedupeKey({
      orgId: "org-apex",
      clientId: "org-apex",
      department: "Marketing",
      intendedPurpose: " Generare reclame cu AI ",
      toolName: "ChatGPT Team",
    })
    const record = deriveAIUseCaseDraftFlags(
      useCase({
        id: "uc-unknown",
        useCaseName: "Generare reclame cu AI",
        department: "marketing",
        intendedPurpose: "Generare reclame cu AI",
        usesPersonalData: "unknown",
        humanReview: "unknown",
        impactsPeopleRights: "unknown",
        automatedDecision: "unknown",
      })
    )

    expect(key).toBe("org-apex:marketing:generare-reclame-cu-ai:chatgpt-team")
    expect(record.gdprReviewNeeded).toBe(true)
    expect(record.humanOversightNeeded).toBe(true)
    expect(record.reviewStatus).toBe("needs_review")
  })
})
