import { normalizeEvidenceType } from "@/lib/compliance/orchestrator-knowledge-governance"

import type { OrchestratorProposal } from "./types"

export function canonicalizeOrchestratorProposal(proposal: Partial<OrchestratorProposal>): OrchestratorProposal {
  return {
    ...proposal,
    schemaVersion: proposal.schemaVersion ?? "orchestrator.v1",
    finalLegalVerdict: proposal.finalLegalVerdict ?? false,
    legalContext: Array.isArray(proposal.legalContext)
      ? proposal.legalContext
      : proposal.legalContext as unknown as OrchestratorProposal["legalContext"],
    proposedFindings: Array.isArray(proposal.proposedFindings) ? proposal.proposedFindings.map((finding) => ({
      ...finding,
      requiredEvidence: Array.isArray(finding.requiredEvidence)
        ? finding.requiredEvidence.map((evidence) => normalizeEvidenceType(evidence))
        : [],
    })) : proposal.proposedFindings as unknown as OrchestratorProposal["proposedFindings"],
    evidenceRequests: Array.isArray(proposal.evidenceRequests) ? proposal.evidenceRequests.map((request) => ({
      ...request,
      evidenceType: normalizeEvidenceType(request.evidenceType),
    })) : proposal.evidenceRequests as unknown as OrchestratorProposal["evidenceRequests"],
    reviewTasks: Array.isArray(proposal.reviewTasks)
      ? proposal.reviewTasks
      : proposal.reviewTasks as unknown as OrchestratorProposal["reviewTasks"],
    nextActions: Array.isArray(proposal.nextActions)
      ? proposal.nextActions
      : proposal.nextActions as unknown as OrchestratorProposal["nextActions"],
    exportBlockers: Array.isArray(proposal.exportBlockers)
      ? proposal.exportBlockers
      : proposal.exportBlockers as unknown as OrchestratorProposal["exportBlockers"],
    clientQuestions: Array.isArray(proposal.clientQuestions)
      ? proposal.clientQuestions
      : proposal.clientQuestions as unknown as OrchestratorProposal["clientQuestions"],
    obsoleteCandidates: Array.isArray(proposal.obsoleteCandidates)
      ? proposal.obsoleteCandidates
      : proposal.obsoleteCandidates as unknown as OrchestratorProposal["obsoleteCandidates"],
    modelNotes: Array.isArray(proposal.modelNotes)
      ? proposal.modelNotes
      : proposal.modelNotes as unknown as OrchestratorProposal["modelNotes"],
  }
}
