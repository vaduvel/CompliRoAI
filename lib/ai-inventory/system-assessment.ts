import type { AISystemRecord, AIUseCaseRecord } from "@/lib/compliance/types"

export type AISystemDisplayAssessment = {
  riskLabel: string
  riskTone: "minimal" | "limited" | "high" | "critical"
  purposeLabel: string
  actionCount: number
  linkedUseCaseCount: number
  isHighRiskOrProhibited: boolean
  prohibitedCandidate: boolean
  requiresFria: boolean
  requiresOversight: boolean
  requiresLogging: boolean
  requiresPmm: boolean
  requiresQms: boolean
}

export function buildAISystemDisplayAssessment(
  system: AISystemRecord,
  linkedUseCases: AIUseCaseRecord[],
): AISystemDisplayAssessment {
  if (linkedUseCases.length === 0) {
    return {
      riskLabel:
        system.riskLevel === "high"
          ? "high"
          : system.riskLevel === "limited"
            ? "limited"
            : "minimal",
      riskTone:
        system.riskLevel === "high"
          ? "high"
          : system.riskLevel === "limited"
            ? "limited"
            : "minimal",
      purposeLabel: labelForBusinessProcess(system.purpose),
      actionCount: system.recommendedActions?.length ?? 0,
      linkedUseCaseCount: 0,
      isHighRiskOrProhibited: system.riskLevel === "high",
      prohibitedCandidate: false,
      requiresFria: system.riskLevel === "high",
      requiresOversight:
        system.riskLevel === "high" ||
        system.purpose === "biometric-identification" ||
        (system.makesAutomatedDecisions && system.impactsRights),
      requiresLogging:
        system.riskLevel === "high" ||
        system.purpose === "biometric-identification" ||
        (system.makesAutomatedDecisions && system.impactsRights),
      requiresPmm:
        system.riskLevel === "high" ||
        system.purpose === "biometric-identification" ||
        (system.makesAutomatedDecisions && system.impactsRights),
      requiresQms: system.riskLevel === "high",
    }
  }

  const prohibitedCandidate = linkedUseCases.some((record) => record.prohibitedCandidate)
  const highRiskCandidate = linkedUseCases.some((record) => record.highRiskCandidate)
  const limitedTransparency = linkedUseCases.some(
    (record) => record.draftRiskLevel === "limited_transparency",
  )
  const riskLabel = prohibitedCandidate
    ? "prohibited candidate"
    : highRiskCandidate
      ? "high risk candidate"
      : limitedTransparency
        ? "limited transparency"
        : "minimal"
  const riskTone = prohibitedCandidate
    ? "critical"
    : highRiskCandidate
      ? "high"
      : limitedTransparency
        ? "limited"
        : "minimal"
  const businessLabels = [
    ...new Set(linkedUseCases.map((record) => labelForBusinessProcess(record.businessProcess))),
  ]
  const purposeLabel =
    businessLabels.length <= 1
      ? (businessLabels[0] ?? labelForBusinessProcess(system.purpose))
      : `${businessLabels[0]} +${businessLabels.length - 1}`

  return {
    riskLabel,
    riskTone,
    purposeLabel,
    actionCount: linkedUseCases.reduce(
      (sum, record) => sum + Math.max(record.openFindingsCount ?? 0, 0),
      0,
    ),
    linkedUseCaseCount: linkedUseCases.length,
    isHighRiskOrProhibited: prohibitedCandidate || highRiskCandidate,
    prohibitedCandidate,
    requiresFria: !prohibitedCandidate && linkedUseCases.some((record) => record.highRiskCandidate || record.friaCandidate),
    requiresOversight: !prohibitedCandidate && linkedUseCases.some((record) => record.humanOversightNeeded),
    requiresLogging: !prohibitedCandidate && linkedUseCases.some((record) => record.loggingReviewNeeded),
    requiresPmm: !prohibitedCandidate && linkedUseCases.some((record) => record.pmmReviewNeeded),
    requiresQms: !prohibitedCandidate && linkedUseCases.some((record) => record.qmsReviewNeeded),
  }
}

export function labelForBusinessProcess(value: string | undefined): string {
  switch (value) {
    case "content_creation":
      return "Conținut / marketing"
    case "customer_interaction":
      return "Interacțiune clienți"
    case "support_ticketing":
      return "Ticketing suport"
    case "recruitment_selection":
      return "HR Screening"
    case "employee_management":
      return "Management angajați"
    case "document_review":
      return "Review documente"
    case "contract_review":
      return "Review contracte"
    case "software_development":
      return "Software development"
    case "analytics_reporting":
      return "Analytics / raportare"
    case "risk_scoring":
      return "Scoring / prioritizare"
    case "credit_assessment":
      return "Credit scoring"
    case "insurance_pricing":
      return "Asigurări / pricing"
    case "medical_triage":
      return "Triage medical"
    case "education_assessment":
      return "Evaluare educațională"
    default:
      return "Alt proces"
  }
}
