import { describe, expect, it } from "vitest"

import {
  loadAIActMonographyLibrary,
  normalizeMonographyForOrchestrator,
  validateAIActMonographyLibrary,
} from "./monography-library"

describe("AI Act monography library", () => {
  it("loads the imported AI Act monography corpus as candidate orchestrator context", () => {
    const library = loadAIActMonographyLibrary()

    expect(library.sourceKind).toBe("candidate_research")
    expect(library.legalTruth).toBe(false)
    expect(library.monographies).toHaveLength(50)
    expect(library.monographies[0]).toMatchObject({
      id: "ai-act-inventory-missing-001",
      title: "Firma folosește ChatGPT/Copilot/Gemini intern, dar nu are inventar AI",
    })
  })

  it("validates guardrails required before the corpus can be used by the orchestrator", () => {
    const report = validateAIActMonographyLibrary(loadAIActMonographyLibrary())

    expect(report.ok).toBe(true)
    expect(report.count).toBe(50)
    expect(report.errors).toEqual([])
    expect(report.warnings).toEqual([])
  })

  it("rejects fiscal or non AI Act monographies from the orchestrator corpus", () => {
    const library = loadAIActMonographyLibrary()
    const report = validateAIActMonographyLibrary({
      ...library,
      monographies: [
        ...library.monographies,
        {
          ...library.monographies[0],
          id: "fiscabuddy-vat-001",
          category: "TVA",
          title: "Rambursare TVA",
        },
      ],
    })

    expect(report.ok).toBe(false)
    expect(report.errors).toContain("fiscabuddy-vat-001: fiscal/non-AI-Act corpus is not allowed in CompliRoAI orchestrator")
  })

  it("normalizes monographies as internal scenario context, never as legal truth", () => {
    const library = loadAIActMonographyLibrary()
    const chatbot = library.monographies.find((entry) => entry.id === "ai-act-chatbot-disclosure-missing-007")
    const hr = library.monographies.find((entry) => entry.id === "ai-act-hr-cv-screening-high-risk-010")
    const unknownAi = library.monographies.find((entry) => entry.id === "ai-act-inventory-missing-001")

    expect(chatbot).toBeTruthy()
    expect(hr).toBeTruthy()
    expect(unknownAi).toBeTruthy()

    expect(normalizeMonographyForOrchestrator(chatbot!)).toMatchObject({
      sourceType: "internal_monography",
      legalWeight: "internal_context",
      canBeUsedAsLegalBasis: false,
      requiresLegalValidation: true,
      scenarioType: "chatbot",
      obligationCodes: ["AI_ACT_ART_50_CHATBOT_NOTICE", "GDPR_VENDOR_DPA_REVIEW", "GDPR_ROPA_DPIA_REVIEW"],
      requiredEvidence: ["transparency_notice_text", "transparency_screenshot", "vendor_dpa", "ropa_record", "dpia_screening"],
      reviewRoles: ["dpo", "legal", "customer_support"],
      exportSections: ["transparency", "vendor_review", "gdpr_bridge"],
    })
    expect(normalizeMonographyForOrchestrator(hr!)).toMatchObject({
      scenarioType: "hr_screening",
      requiredEvidence: ["role_risk_assessment", "dpia_screening", "human_oversight_sop", "vendor_dpa", "logging_configuration"],
      reviewRoles: ["dpo", "legal", "hr", "it_security"],
    })
    expect(normalizeMonographyForOrchestrator(unknownAi!)).toMatchObject({
      scenarioType: "imm_unknown_ai",
      requiredEvidence: ["ai_use_case_intake", "ai_literacy_training_roster", "owner_assignment", "vendor_contract"],
    })
  })
})
