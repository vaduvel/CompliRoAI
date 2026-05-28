import { describe, expect, it } from "vitest"

import {
  AI_ACT_ART_50_CHATBOT_NOTICE,
  getEvidenceAcceptanceRule,
  getLegalSource,
  getObligation,
  getReviewGatesForObligation,
  normalizeEvidenceType,
  resolveExportReadinessForMissingEvidence,
} from "./orchestrator-knowledge-governance"

describe("orchestrator knowledge governance", () => {
  it("separates primary law from internal monographies", () => {
    expect(getLegalSource("src_eu_ai_act_2024_1689").canBeCitedAsLaw).toBe(true)
    expect(getLegalSource("src_gdpr_2016_679").legalWeight).toBe("primary")

    const monography = getLegalSource("src_internal_chatbot_art50_monography")
    expect(monography.sourceType).toBe("internal_monography")
    expect(monography.legalWeight).toBe("internal_context")
    expect(monography.canBeCitedAsLaw).toBe(false)
  })

  it("defines canonical obligations with required evidence and review gates", () => {
    const obligation = getObligation(AI_ACT_ART_50_CHATBOT_NOTICE)

    expect(obligation.sourceId).toBe("src_eu_ai_act_2024_1689")
    expect(obligation.requiredEvidence).toEqual([
      "transparency_notice_text",
      "transparency_screenshot",
    ])
    expect(getReviewGatesForObligation(obligation.code).map((gate) => gate.gateCode)).toContain("dpo_review")
    expect(obligation.finalVerdictRequiresHuman).toBe(true)
  })

  it("normalizes Mistral evidence aliases into canonical CompliRoAI evidence types", () => {
    expect(normalizeEvidenceType("roipa_entry")).toBe("ropa_record")
    expect(normalizeEvidenceType("vendor_dpa_document")).toBe("vendor_dpa")
    expect(normalizeEvidenceType("data_processing_agreement")).toBe("vendor_dpa")
    expect(normalizeEvidenceType("escalation_sop_document")).toBe("human_oversight_sop")
    expect(normalizeEvidenceType("transparency_screenshot")).toBe("transparency_screenshot")
  })

  it("keeps evidence upload separate from review and approval", () => {
    const rule = getEvidenceAcceptanceRule("vendor_dpa")

    expect(rule.minimumCertaintyAfterUpload).toBe("evidence_attached")
    expect(rule.canResolveFindingAutomatically).toBe(false)
    expect(rule.canApproveAutomatically).toBe(false)
    expect(rule.reviewRequiredBy).toContain("dpo")
  })

  it("blocks final audit pack exports until required evidence and review gates are complete", () => {
    const result = resolveExportReadinessForMissingEvidence({
      obligationCode: AI_ACT_ART_50_CHATBOT_NOTICE,
      attachedEvidence: ["transparency_notice_text"],
      completedReviewGates: [],
    })

    expect(result.readiness).toBe("blocked")
    expect(result.missingEvidence).toEqual(["transparency_screenshot"])
    expect(result.missingReviewGates).toEqual(["dpo_review"])
    expect(result.forbiddenClaims).toContain("Art. 50 fully implemented")
  })
})
