// EU AI Database JSON exporter
// Generează JSON conform schema EU AI Database pentru submit manual.

import type { AISystemPurpose } from "@/lib/compliance/types"
import { classifyAISystem, type AIActRiskLevel } from "@/lib/compliance/ai-act-classifier"

export type EUDatabaseEntry = {
  systemName: string
  provider: {
    name: string
    registeredAddress?: string
    country: string
    contactEmail?: string
  }
  systemDescription: string
  intendedPurpose: string
  aiActClassification: {
    riskLevel: AIActRiskLevel
    annexIIICategory?: string
    article: string
  }
  deploymentInfo: {
    memberStatesDeployed: string[]
    startDate?: string
    isOperational: boolean
  }
  technicalDocumentation: {
    available: boolean
    annexIVCompliant: boolean
  }
  conformityAssessment: {
    completed: boolean
    body?: string
    date?: string
  }
  humanOversight: {
    measures: string
    contactPerson?: string
  }
  status: "draft" | "ready_for_review" | "submitted"
  generatedAtISO: string
  completenessPercent: number
  missingFields: string[]
}

export function generateEUDatabaseEntry(input: {
  systemName: string
  purpose: AISystemPurpose
  description?: string
  orgName: string
  orgAddress?: string
  orgCountry?: string
  orgEmail?: string
  memberStates?: string[]
  humanOversightMeasures?: string
}): EUDatabaseEntry {
  const classification = classifyAISystem(input.purpose)

  const missingFields: string[] = []
  if (!input.orgAddress) missingFields.push("provider.registeredAddress")
  if (!input.orgEmail) missingFields.push("provider.contactEmail")
  if (!input.description) missingFields.push("systemDescription")
  if (!input.memberStates?.length) missingFields.push("deploymentInfo.memberStatesDeployed")
  if (!input.humanOversightMeasures) missingFields.push("humanOversight.measures")

  // conformity + technical docs always missing on first generation
  missingFields.push("technicalDocumentation (Annex IV)")
  missingFields.push("conformityAssessment")

  const totalFields = 10
  const filledFields = totalFields - missingFields.length
  const completenessPercent = Math.round((filledFields / totalFields) * 100)

  return {
    systemName: input.systemName,
    provider: {
      name: input.orgName,
      registeredAddress: input.orgAddress,
      country: input.orgCountry ?? "RO",
      contactEmail: input.orgEmail,
    },
    systemDescription: input.description ?? "",
    intendedPurpose: classification.reason,
    aiActClassification: {
      riskLevel: classification.riskLevel,
      annexIIICategory: classification.article.startsWith("Annex") ? classification.article : undefined,
      article: classification.article,
    },
    deploymentInfo: {
      memberStatesDeployed: input.memberStates ?? ["RO"],
      isOperational: true,
    },
    technicalDocumentation: {
      available: false,
      annexIVCompliant: false,
    },
    conformityAssessment: {
      completed: false,
    },
    humanOversight: {
      measures: input.humanOversightMeasures ?? "",
    },
    status: "draft",
    generatedAtISO: new Date().toISOString(),
    completenessPercent,
    missingFields,
  }
}
