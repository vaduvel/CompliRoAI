import { describe, expect, it } from "vitest"

import { validateOrchestratorProposal } from "./validator"
import type { OrchestratorProposal } from "./types"

function baseProposal(overrides: Record<string, unknown> = {}): OrchestratorProposal {
  return {
    schemaVersion: "orchestrator.v1",
    finalLegalVerdict: false,
    proposedFindings: [],
    evidenceRequests: [],
    reviewTasks: [],
    nextActions: [],
    exportBlockers: [],
    clientQuestions: [],
    obsoleteCandidates: [],
    ...overrides,
  }
}

describe("validateOrchestratorProposal", () => {
  it("accepts a structured compliance-work proposal", () => {
    const result = validateOrchestratorProposal(baseProposal({
      legalContext: [
        {
          sourceId: "eurlex-ai-act-art-50",
          instrument: "EU_AI_ACT",
          reference: "Art. 50(1)",
          whyRelevant: "Chatbot interaction.",
        },
      ],
      proposedFindings: [
        {
          code: "art50_chatbot_notice",
          title: "Adaugă notice Art. 50 pentru chatbot",
          reason: "Use case-ul interacționează direct cu vizitatori ai site-ului.",
          severity: "high",
          ownerRole: "dpo",
          linkedEntityType: "ai_use_case",
          linkedEntityId: "uc-chatbot",
          legalBasis: [
            {
              instrument: "EU_AI_ACT",
              article: "Art. 50(1)",
              note: "Informare pentru interacțiune directă cu sistem AI.",
            },
          ],
          requiredEvidence: ["transparency_notice_text", "transparency_screenshot"],
          finalLegalVerdict: false,
        },
      ],
      evidenceRequests: [
        {
          code: "collect_chatbot_notice_text",
          linkedFindingCode: "art50_chatbot_notice",
          evidenceType: "transparency_notice_text",
          title: "Atașează textul notice-ului AI de pe site",
          ownerRole: "marketing",
          requiredMetadata: ["url"],
        },
        {
          code: "collect_chatbot_screenshot",
          linkedFindingCode: "art50_chatbot_notice",
          evidenceType: "transparency_screenshot",
          title: "Atașează screenshot-ul notice-ului AI de pe site",
          ownerRole: "marketing",
          requiredMetadata: ["url", "capturedAt"],
        },
      ],
      reviewTasks: [
        {
          code: "dpo_review_chatbot",
          title: "DPO verifică datele procesate de chatbot",
          ownerRole: "dpo",
          reviewStatus: "needs_dpo_review",
          linkedFindingCode: "art50_chatbot_notice",
        },
      ],
      nextActions: [
        {
          code: "open_art50_finding",
          title: "Deschide finding-ul Art. 50 și cere dovada",
          priority: "P1",
          targetHref: "/dashboard/resolve?finding=art50_chatbot_notice",
          ownerRole: "dpo",
        },
      ],
      exportBlockers: [
        {
          code: "missing_art50_notice",
          exportType: "audit_pack",
          reason: "Lipsește dovada notice-ului pentru chatbot.",
          severity: "high",
          blockedUntil: "evidence_attached",
        },
      ],
    }), {
      allowedRagSourceIds: ["eurlex-ai-act-art-50"],
    })

    expect(result).toEqual({ ok: true, proposal: expect.any(Object), warnings: [] })
  })

  it("rejects findings whose required evidence is not fully mapped to evidence requests", () => {
    const result = validateOrchestratorProposal(baseProposal({
      proposedFindings: [
        {
          code: "gdpr_chatbot_review",
          title: "Verifică GDPR pentru chatbot",
          reason: "Chatbotul poate procesa date personale și are nevoie de RoPA + vendor DPA.",
          severity: "high",
          ownerRole: "dpo",
          linkedEntityType: "ai_use_case",
          linkedEntityId: "uc-chatbot",
          legalBasis: [{ instrument: "GDPR", article: "Art. 28 / Art. 30 / Art. 35" }],
          requiredEvidence: ["vendor_dpa", "ropa_record"],
          finalLegalVerdict: false,
        },
      ],
      evidenceRequests: [
        {
          code: "collect_vendor_dpa",
          linkedFindingCode: "gdpr_chatbot_review",
          evidenceType: "vendor_dpa",
          title: "Atașează DPA-ul vendorului",
          ownerRole: "procurement",
        },
      ],
    }))

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors).toContain(
        "proposedFindings[0] missing evidenceRequests for requiredEvidence: ropa_record"
      )
    }
  })

  it("rejects final legal verdicts from the model", () => {
    const result = validateOrchestratorProposal(baseProposal({
      finalLegalVerdict: true,
    }))

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors).toContain("proposal.finalLegalVerdict must be false")
    }
  })

  it("rejects findings without legal basis and required evidence", () => {
    const result = validateOrchestratorProposal(baseProposal({
      proposedFindings: [
        {
          code: "hr_high_risk_candidate",
          title: "Review HR AI",
          reason: "ATS-ul rankează candidați.",
          severity: "critical",
          ownerRole: "legal",
          linkedEntityType: "ai_use_case",
          linkedEntityId: "uc-hr",
          legalBasis: [],
          requiredEvidence: [],
          finalLegalVerdict: false,
        },
      ],
    }))

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors).toEqual(expect.arrayContaining([
        "proposedFindings[0].legalBasis must contain at least one source",
        "proposedFindings[0].requiredEvidence must contain at least one item",
      ]))
    }
  })

  it("rejects final high-risk or prohibited claims hidden in risk draft", () => {
    const result = validateOrchestratorProposal(baseProposal({
      proposedFindings: [
        {
          code: "hr_final_high_risk",
          title: "Sistem high-risk final",
          reason: "Modelul a decis singur.",
          severity: "critical",
          ownerRole: "legal",
          linkedEntityType: "ai_use_case",
          linkedEntityId: "uc-hr",
          legalBasis: [{ instrument: "EU_AI_ACT", article: "Art. 6" }],
          requiredEvidence: ["role_risk_assessment"],
          riskDraft: "high_risk_final",
          finalLegalVerdict: false,
        },
      ],
    }))

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors).toContain("proposedFindings[0].riskDraft cannot be high_risk_final")
    }
  })

  it("rejects generic prose-only payloads", () => {
    const result = validateOrchestratorProposal({
      summary: "Pare important să faceți compliance.",
      why: "AI Act contează.",
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors).toContain("proposal.schemaVersion must be orchestrator.v1")
    }
  })

  it("rejects legal context sources that were not retrieved into RAG context", () => {
    const result = validateOrchestratorProposal(
      baseProposal({
        legalContext: [
          {
            sourceId: "unknown-source",
            instrument: "EU_AI_ACT",
            reference: "Art. 50(1)",
            whyRelevant: "Chatbot interaction.",
          },
        ],
      }),
      { allowedRagSourceIds: ["eurlex-ai-act-art-50"] },
    )

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors).toContain("legalContext[0].sourceId was not retrieved in RagContext")
    }
  })

  it("rejects internal context sources used as legal authority", () => {
    const result = validateOrchestratorProposal(
      baseProposal({
        legalContext: [
          {
            sourceId: "src_internal_chatbot_art50_monography",
            instrument: "EU_AI_ACT",
            reference: "Art. 50(1)",
            whyRelevant: "Internal workflow template.",
          },
        ],
        proposedFindings: [
          {
            code: "art50_chatbot_notice",
            title: "Adaugă notice Art. 50 pentru chatbot",
            reason: "Chatbot public.",
            severity: "high",
            ownerRole: "dpo",
            legalBasis: [{ instrument: "EU_AI_ACT", article: "Art. 50(1)" }],
            requiredEvidence: ["transparency_notice_text"],
            finalLegalVerdict: false,
          },
        ],
        evidenceRequests: [
          {
            code: "collect_notice_text",
            linkedFindingCode: "art50_chatbot_notice",
            evidenceType: "transparency_notice_text",
            title: "Atașează textul notice-ului",
            ownerRole: "dpo",
          },
        ],
      }),
      {
        allowedRagSourceIds: ["src_internal_chatbot_art50_monography"],
        legalSourcesById: {
          src_internal_chatbot_art50_monography: {
            canBeCitedAsLaw: false,
            legalWeight: "internal_context",
            sourceType: "internal_monography",
          },
        },
      },
    )

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors).toContain(
        "legalContext[0].sourceId cannot be used as legal authority for EU_AI_ACT"
      )
    }
  })

  it("rejects legal basis that is not grounded in retrieved legal context", () => {
    const result = validateOrchestratorProposal(
      baseProposal({
        legalContext: [
          {
            sourceId: "eurlex-ai-act-art-50",
            instrument: "EU_AI_ACT",
            reference: "Art. 50(1)",
            whyRelevant: "Chatbot interaction.",
          },
        ],
        proposedFindings: [
          {
            code: "hr_high_risk_candidate",
            title: "Review HR AI screening",
            reason: "ATS-ul rankează candidați.",
            severity: "critical",
            ownerRole: "legal",
            linkedEntityType: "ai_use_case",
            linkedEntityId: "uc-hr",
            legalBasis: [{ instrument: "EU_AI_ACT", article: "Art. 6" }],
            requiredEvidence: ["role_risk_assessment"],
            finalLegalVerdict: false,
          },
        ],
        evidenceRequests: [
          {
            code: "collect_hr_risk_assessment",
            linkedFindingCode: "hr_high_risk_candidate",
            evidenceType: "role_risk_assessment",
            title: "Atașează evaluarea rol/risc",
            ownerRole: "legal",
          },
        ],
      }),
      { allowedRagSourceIds: ["eurlex-ai-act-art-50"] },
    )

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors).toContain(
        "proposedFindings[0].legalBasis[0] is not grounded in proposal.legalContext"
      )
    }
  })

  it("rejects linked entities outside the scoped tenant context", () => {
    const result = validateOrchestratorProposal(
      baseProposal({
        proposedFindings: [
          {
            code: "art50_chatbot_notice",
            title: "Adaugă notice Art. 50 pentru chatbot",
            reason: "Chatbot public.",
            severity: "high",
            ownerRole: "dpo",
            linkedEntityType: "ai_use_case",
            linkedEntityId: "uc-other-tenant",
            legalBasis: [{ instrument: "EU_AI_ACT", article: "Art. 50(1)" }],
            requiredEvidence: ["transparency_notice_text"],
            finalLegalVerdict: false,
          },
        ],
        evidenceRequests: [
          {
            code: "collect_notice_text",
            linkedFindingCode: "art50_chatbot_notice",
            linkedEntityType: "ai_use_case",
            linkedEntityId: "uc-other-tenant",
            evidenceType: "transparency_notice_text",
            title: "Atașează textul notice-ului",
            ownerRole: "marketing",
          },
        ],
      }),
      {
        allowedLinkedEntityIdsByType: {
          ai_use_case: ["uc-chatbot"],
        },
      },
    )

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors).toEqual(expect.arrayContaining([
        "proposedFindings[0].linkedEntityId is outside the scoped ai_use_case context",
        "evidenceRequests[0].linkedEntityId is outside the scoped ai_use_case context",
      ]))
    }
  })

  it("rejects links to unknown findings outside the scoped set", () => {
    const result = validateOrchestratorProposal(
      baseProposal({
        reviewTasks: [
          {
            code: "review_unknown_finding",
            title: "Revizuiește un finding inexistent",
            ownerRole: "dpo",
            reviewStatus: "needs_dpo_review",
            linkedFindingCode: "finding-from-other-client",
          },
        ],
        obsoleteCandidates: [
          {
            findingCode: "finding-from-other-client",
            reason: "Nu mai este relevant.",
          },
        ],
      }),
      {
        allowedFindingCodes: ["finding-1", "finding-2"],
      },
    )

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors).toEqual(expect.arrayContaining([
        "reviewTasks[0].linkedFindingCode is outside the scoped finding context",
        "obsoleteCandidates[0].findingCode is outside the scoped finding context",
      ]))
    }
  })

  it("rejects overclaim language anywhere in the model proposal", () => {
    const result = validateOrchestratorProposal(baseProposal({
      modelNotes: ["Clientul este fully compliant după acest upload."],
    }))

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors).toContain("proposal contains forbidden overclaim phrase: fully compliant")
    }
  })

  it("rejects model attempts to auto-resolve or auto-approve workflow state", () => {
    const result = validateOrchestratorProposal(baseProposal({
      proposedFindings: [
        {
          code: "art50_chatbot_notice",
          title: "Adaugă notice Art. 50 pentru chatbot",
          reason: "Chatbot public.",
          severity: "high",
          ownerRole: "dpo",
          legalBasis: [{ instrument: "EU_AI_ACT", article: "Art. 50(1)" }],
          requiredEvidence: ["transparency_notice_text"],
          finalLegalVerdict: false,
          findingStatus: "resolved",
        },
      ],
      evidenceRequests: [
        {
          code: "collect_notice_text",
          linkedFindingCode: "art50_chatbot_notice",
          evidenceType: "transparency_notice_text",
          title: "Atașează textul notice-ului",
          ownerRole: "dpo",
          approvalStatus: "approved",
        },
      ],
      reviewTasks: [
        {
          code: "auto_dpo_review",
          title: "DPO review făcut de AI",
          ownerRole: "dpo",
          reviewStatus: "approved",
          linkedFindingCode: "art50_chatbot_notice",
        },
      ],
      nextActions: [
        {
          code: "resolve_now",
          title: "Închide finding-ul",
          priority: "P1",
          targetHref: "/dashboard/resolve?finding=art50_chatbot_notice",
          ownerRole: "dpo",
          autoResolve: true,
        },
      ],
      autoApprove: true,
    }))

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors).toEqual(expect.arrayContaining([
        "proposedFindings[0].findingStatus cannot be resolved by orchestrator",
        "evidenceRequests[0].approvalStatus cannot be approved by orchestrator",
        "reviewTasks[0].reviewStatus is invalid",
        "nextActions[0].autoResolve is forbidden",
        "proposal.autoApprove is forbidden",
      ]))
    }
  })

  it("rejects model attempts to mark audit pack or export readiness as final", () => {
    const result = validateOrchestratorProposal(baseProposal({
      exportReadinessStatus: "approved",
      packKind: "final",
      canExportFinal: true,
      finalExportApproved: true,
      nextActions: [
        {
          code: "generate_final_audit_pack",
          title: "Generează Audit Pack final",
          priority: "P0",
          targetHref: "/dashboard/audit-pack?final=true",
          ownerRole: "dpo",
        },
      ],
    }))

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors).toEqual(expect.arrayContaining([
        "proposal.exportReadinessStatus cannot be approved by orchestrator",
        "proposal.packKind cannot be final by orchestrator",
        "proposal.canExportFinal is forbidden",
        "proposal.finalExportApproved is forbidden",
      ]))
    }
  })

  it("rejects partial evidence requests that cannot become executable work", () => {
    const result = validateOrchestratorProposal(baseProposal({
      evidenceRequests: [
        {
          findingCode: "art50_chatbot_notice",
          evidenceType: "transparency_screenshot",
          description: "Atașează screenshot.",
        },
      ],
    }))

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors).toEqual(expect.arrayContaining([
        "evidenceRequests[0].code is required",
        "evidenceRequests[0].title is required",
        "evidenceRequests[0].ownerRole is invalid",
      ]))
    }
  })

  it("rejects partial review tasks, next actions, export blockers, and client questions", () => {
    const result = validateOrchestratorProposal(baseProposal({
      reviewTasks: [{ reviewerRole: "dpo", reviewStatus: "needs_dpo_review" }],
      nextActions: [{ action: "Cere dovada.", ownerRole: "dpo" }],
      exportBlockers: [{ blockerType: "audit_pack", impact: "Lipsește dovada." }],
      clientQuestions: ["Ce date colectează chatbotul?"],
    }))

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors).toEqual(expect.arrayContaining([
        "reviewTasks[0].code is required",
        "reviewTasks[0].title is required",
        "reviewTasks[0].ownerRole is invalid",
        "nextActions[0].code is required",
        "nextActions[0].title is required",
        "nextActions[0].priority is invalid",
        "nextActions[0].targetHref is required",
        "exportBlockers[0].code is required",
        "exportBlockers[0].reason is required",
        "exportBlockers[0].severity is invalid",
        "clientQuestions[0] must be an object",
      ]))
    }
  })
})
