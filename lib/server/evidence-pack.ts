import {
  buildAIActFindingId,
  classifyAISystem,
  getAIActRequiredActionIds,
  type AIActClassification,
  type AIActObligationId,
  type AIActRiskLevel,
} from "@/lib/compliance/ai-act-classifier"
import type { AISystemRecord } from "@/lib/compliance/types"
import { readState, type GeneratedDocumentRecord } from "@/lib/server/store"

export type AIActEvidencePack = {
  generatedAtISO: string
  systems: {
    systemId: string
    systemName: string
    riskClass: AIActRiskLevel
    classification: AIActClassification
    obligations: {
      id: string
      label: string
      status: "done" | "pending" | "overdue"
      evidenceTitle?: string
    }[]
    annexIvGenerated: boolean
    annexIvApproved: boolean
    euDbSubmitted: boolean
    findingsResolved: number
    findingsOpen: number
  }[]
  overallCompliance: number
  // Deadline per Omnibus Agreement 7 mai 2026 — high-risk Annex III moved to 2027-12-02
  deadline: string | null
}

const OBLIGATION_LABELS: Record<AIActObligationId, string> = {
  "register-eu-database": "Înregistrare EU Database",
  "technical-documentation": "Documentație Annex IV",
  "human-oversight": "Human oversight",
  "conformity-assessment": "Evaluare de conformitate",
  "stop-system": "Oprire sistem interzis",
  "manual-classification": "Validare manuală clasificare",
  disclosure: "Disclosure utilizator",
}

export async function buildAIActEvidencePack(orgId: string): Promise<AIActEvidencePack> {
  // orgId is used for context — state is loaded via getOrgContext in readState
  // We accept orgId as a parameter for compatibility but rely on the middleware-set context
  void orgId
  const state = await readState()
  const generatedAtISO = new Date().toISOString()
  const systems = state.aiSystems.map((system) =>
    buildSystemPack(system, state.generatedDocuments, generatedAtISO)
  )
  const totalObligations = systems.reduce((sum, system) => sum + system.obligations.length, 0)
  const doneObligations = systems.reduce(
    (sum, system) => sum + system.obligations.filter((obligation) => obligation.status === "done").length,
    0
  )
  const upcomingDeadlines = systems
    .flatMap((system) =>
      system.obligations
        .filter((obligation) => obligation.status !== "done" && system.classification.deadline)
        .map(() => system.classification.deadline!)
    )
    .sort((left, right) => left.localeCompare(right))

  return {
    generatedAtISO,
    systems,
    overallCompliance:
      totalObligations === 0 ? 100 : Math.round((doneObligations / totalObligations) * 100),
    deadline: upcomingDeadlines[0] ?? null,
  }
}

function buildSystemPack(
  system: AISystemRecord,
  generatedDocuments: GeneratedDocumentRecord[],
  nowISO: string
): AIActEvidencePack["systems"][number] {
  const classification = classifyAISystem(system.purpose)
  const obligationIds = getAIActRequiredActionIds(classification)
  const annexFindingId = buildAIActFindingId(system.id, "technical-documentation")
  const annexDocs = generatedDocuments.filter((doc) => doc.systemId === system.id && doc.documentType === "annex-iv")
  const annexBestDoc = pickBestDocument(annexDocs)
  const obligations = obligationIds.map((obligationId) =>
    buildObligationStatus({
      obligationId,
      system,
      classification,
      documents: generatedDocuments,
      nowISO,
    })
  )

  // euDbSubmitted: check if register-eu-database obligation is done
  const euDbObligation = obligations.find((o) => o.id === buildAIActFindingId(system.id, "register-eu-database"))

  return {
    systemId: system.id,
    systemName: system.name,
    riskClass: classification.riskLevel,
    classification,
    obligations,
    annexIvGenerated: annexDocs.length > 0,
    annexIvApproved: annexBestDoc?.approvalStatus === "approved_as_evidence",
    euDbSubmitted: euDbObligation?.status === "done",
    findingsResolved: obligations.filter((o) => o.status === "done").length,
    findingsOpen: obligations.filter((o) => o.status !== "done").length,
  }
}

function buildObligationStatus(input: {
  obligationId: AIActObligationId
  system: AISystemRecord
  classification: AIActClassification
  documents: GeneratedDocumentRecord[]
  nowISO: string
}): AIActEvidencePack["systems"][number]["obligations"][number] {
  const findingId = buildAIActFindingId(input.system.id, input.obligationId)
  const linkedDocs = input.documents.filter(
    (doc) => doc.systemId === input.system.id && doc.documentType === "annex-iv"
  )
  const bestDoc = pickBestDocument(linkedDocs)
  const deadlinePassed =
    Boolean(input.classification.deadline) &&
    input.classification.deadline!.localeCompare(input.nowISO.slice(0, 10)) < 0

  let done = false
  if (input.obligationId === "technical-documentation") {
    done = bestDoc?.approvalStatus === "approved_as_evidence"
  }
  if (input.obligationId === "human-oversight") {
    done = input.system.policyAttestationStatus === "attested"
  }
  if (input.obligationId === "manual-classification") {
    done = input.system.approvalStatus === "approved"
  }

  return {
    id: findingId,
    label: OBLIGATION_LABELS[input.obligationId],
    status: done ? "done" : deadlinePassed ? "overdue" : "pending",
    evidenceTitle: bestDoc?.content ? `Annex IV — ${input.system.name}` : undefined,
  }
}

function pickBestDocument(documents: GeneratedDocumentRecord[]): GeneratedDocumentRecord | null {
  if (documents.length === 0) return null
  return [...documents].sort((left, right) => {
    const leftScore = left.approvalStatus === "approved_as_evidence" ? 2 : 1
    const rightScore = right.approvalStatus === "approved_as_evidence" ? 2 : 1
    if (leftScore !== rightScore) return rightScore - leftScore
    return right.createdAtISO.localeCompare(left.createdAtISO)
  })[0] ?? null
}
