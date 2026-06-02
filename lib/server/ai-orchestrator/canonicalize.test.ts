import { describe, expect, it } from "vitest"

import { canonicalizeOrchestratorProposal } from "./canonicalize"
import type { OrchestratorProposal } from "./types"

describe("canonicalizeOrchestratorProposal", () => {
  it("normalizes Mistral evidence aliases in findings and evidence requests", () => {
    const proposal: OrchestratorProposal = {
      schemaVersion: "orchestrator.v1",
      finalLegalVerdict: false,
      proposedFindings: [
        {
          code: "gdpr_chatbot_review",
          title: "GDPR review",
          reason: "Chatbot uses personal data.",
          severity: "high",
          ownerRole: "dpo",
          linkedEntityType: "ai_use_case",
          linkedEntityId: "uc-1",
          legalBasis: [{ instrument: "GDPR", article: "Art. 30" }],
          requiredEvidence: ["roipa_entry", "data_processing_agreement"],
          finalLegalVerdict: false,
        },
      ],
      evidenceRequests: [
        {
          code: "collect_roipa",
          linkedFindingCode: "gdpr_chatbot_review",
          evidenceType: "roipa_entry",
          title: "Attach RoPA",
          ownerRole: "dpo",
        },
        {
          code: "collect_escalation",
          linkedFindingCode: "human_escalation_sop",
          evidenceType: "escalation_sop_document",
          title: "Attach SOP",
          ownerRole: "customer_support",
        },
      ],
      reviewTasks: [],
      nextActions: [],
      exportBlockers: [],
      clientQuestions: [],
      obsoleteCandidates: [],
    }

    const canonical = canonicalizeOrchestratorProposal(proposal)

    expect(canonical.proposedFindings[0].requiredEvidence).toEqual(["ropa_record", "vendor_dpa"])
    expect(canonical.evidenceRequests.map((request) => request.evidenceType)).toEqual([
      "ropa_record",
      "human_oversight_sop",
    ])
  })

  it("does not throw when arrays are missing and preserves gaps for validator", () => {
    const canonical = canonicalizeOrchestratorProposal({
      schemaVersion: "orchestrator.v1",
      finalLegalVerdict: false,
    } as Partial<OrchestratorProposal>)

    expect(canonical.schemaVersion).toBe("orchestrator.v1")
    expect(canonical.finalLegalVerdict).toBe(false)
    expect(canonical.proposedFindings).toBeUndefined()
    expect(canonical.evidenceRequests).toBeUndefined()
    expect(canonical.reviewTasks).toBeUndefined()
    expect(canonical.nextActions).toBeUndefined()
    expect(canonical.exportBlockers).toBeUndefined()
    expect(canonical.clientQuestions).toBeUndefined()
    expect(canonical.obsoleteCandidates).toBeUndefined()
  })

  it("maps obsolete candidate aliases to findingCode", () => {
    const canonical = canonicalizeOrchestratorProposal({
      schemaVersion: "orchestrator.v1",
      finalLegalVerdict: false,
      proposedFindings: [],
      evidenceRequests: [],
      reviewTasks: [],
      nextActions: [],
      exportBlockers: [],
      clientQuestions: [],
      obsoleteCandidates: [
        {
          code: "retire_old_finding",
          reason: "Finding-ul nu mai este relevant după importul nou.",
        } as any,
      ],
    })

    expect(canonical.obsoleteCandidates[0]).toMatchObject({
      findingCode: "retire_old_finding",
      reason: "Finding-ul nu mai este relevant după importul nou.",
    })
  })
})
