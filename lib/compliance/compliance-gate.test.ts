import { describe, expect, it } from "vitest"

import { evaluateComplianceGate } from "./compliance-gate"
import type { ClassifyV1Input } from "@/lib/compliance/types"

const FIXED_ISO = "2026-05-18T10:00:00.000Z"

function base(overrides: Partial<ClassifyV1Input> = {}): ClassifyV1Input {
  return {
    systemName: "Test System",
    purpose: "support-chatbot",
    ...overrides,
  }
}

describe("compliance-gate — Art. 5 prohibitions (R1)", () => {
  it("biometric-identification → blocked with Art. 5 reference", () => {
    const result = evaluateComplianceGate({
      input: base({ purpose: "biometric-identification" }),
      nowISO: FIXED_ISO,
    })
    expect(result.verdict).toBe("blocked")
    expect(result.riskClass).toBe("prohibited")
    expect(result.reasons.some((r) => r.articleRef.includes("Art. 5"))).toBe(true)
    expect(result.reasons.some((r) => r.category === "legal_prohibition")).toBe(true)
    expect(result.nextActions.join(" ")).toMatch(/Oprire/i)
  })

  it("image-manipulation-intimate (deepfake/nudifier) → blocked with Omnibus reference", () => {
    const result = evaluateComplianceGate({
      input: base({ purpose: "image-manipulation-intimate" }),
      nowISO: FIXED_ISO,
    })
    expect(result.verdict).toBe("blocked")
    expect(result.riskClass).toBe("prohibited")
    expect(result.reasons[0].articleRef).toContain("Art. 5")
  })
})

describe("compliance-gate — Art. 14 human oversight (R2/R3)", () => {
  it("high-risk fully_autonomous without oversight → blocked Art. 14(1)", () => {
    const result = evaluateComplianceGate({
      input: base({
        purpose: "hr-screening",
        autonomyLevel: "fully_autonomous",
        humanOversightDocumented: false,
      }),
      aiActRole: "provider",
      nowISO: FIXED_ISO,
    })
    expect(result.verdict).toBe("blocked")
    expect(result.reasons.some((r) => r.articleRef.includes("Art. 14"))).toBe(true)
  })

  it("high-risk + oversight documented → no Art. 14 finding", () => {
    const result = evaluateComplianceGate({
      input: base({
        purpose: "hr-screening",
        humanOversightDocumented: true,
        loggingEnabled: true,
      }),
      aiActRole: "provider",
      nowISO: FIXED_ISO,
    })
    expect(result.reasons.every((r) => r.category !== "human_oversight_required")).toBe(true)
    expect(result.obligations.some((o) => o.article === "Art. 14 AI Act" && o.status === "met")).toBe(true)
  })
})

describe("compliance-gate — Art. 27 FRIA for deployer (R5)", () => {
  it("high-risk deployer without FRIA → review_required with Art. 27", () => {
    const result = evaluateComplianceGate({
      input: base({
        purpose: "hr-screening",
        humanOversightDocumented: true,
        loggingEnabled: true,
      }),
      aiActRole: "deployer",
      evidence: { friaCompleted: false },
      nowISO: FIXED_ISO,
    })
    expect(result.verdict).toBe("review_required")
    expect(result.reasons.some((r) => r.articleRef === "Art. 27 AI Act")).toBe(true)
    expect(result.missingEvidence.some((m) => m.includes("FRIA"))).toBe(true)
    expect(result.auditPackHints.some((h) => h.includes("FRIA"))).toBe(true)
  })

  it("high-risk provider (not deployer) does NOT trigger Art. 27", () => {
    const result = evaluateComplianceGate({
      input: base({
        purpose: "hr-screening",
        humanOversightDocumented: true,
        loggingEnabled: true,
      }),
      aiActRole: "provider",
      nowISO: FIXED_ISO,
    })
    expect(result.reasons.every((r) => r.articleRef !== "Art. 27 AI Act")).toBe(true)
    expect(
      result.obligations.find((o) => o.article === "Art. 27 AI Act")?.status,
    ).toBe("not_applicable")
  })

  it("high-risk deployer WITH FRIA evidence → met", () => {
    const result = evaluateComplianceGate({
      input: base({
        purpose: "hr-screening",
        humanOversightDocumented: true,
        loggingEnabled: true,
      }),
      aiActRole: "deployer",
      evidence: { friaCompleted: true },
      nowISO: FIXED_ISO,
    })
    expect(
      result.obligations.find((o) => o.article === "Art. 27 AI Act")?.status,
    ).toBe("met")
  })
})

describe("compliance-gate — DPIA + DPA + Transfer (R6/R7/R8)", () => {
  it("high-risk + personal data + no DPIA → review_required (GDPR 35)", () => {
    const result = evaluateComplianceGate({
      input: base({
        purpose: "credit-scoring",
        processesPersonalData: true,
        humanOversightDocumented: true,
        loggingEnabled: true,
        dpaSigned: true,
        vendorRegion: "EU",
      }),
      aiActRole: "provider",
      evidence: { dpiaCompleted: false },
      nowISO: FIXED_ISO,
    })
    expect(result.verdict).toBe("review_required")
    expect(result.reasons.some((r) => r.category === "dpia_required")).toBe(true)
  })

  it("personal data + no DPA → review_required (GDPR Art. 28)", () => {
    const result = evaluateComplianceGate({
      input: base({
        purpose: "support-chatbot",
        processesPersonalData: true,
        dpaSigned: false,
        modelProvider: "OpenAI",
      }),
      evidence: { transparencyNoticePublished: true },
      nowISO: FIXED_ISO,
    })
    expect(result.verdict).toBe("review_required")
    expect(result.reasons.some((r) => r.category === "dpa_missing")).toBe(true)
    expect(result.missingEvidence.some((m) => m.includes("DPA"))).toBe(true)
  })

  it("non-EU vendor + personal data + no transfer mechanism → review_required (GDPR 44-49)", () => {
    const result = evaluateComplianceGate({
      input: base({
        purpose: "support-chatbot",
        processesPersonalData: true,
        dpaSigned: true,
        vendorRegion: "US",
        modelProvider: "OpenAI",
      }),
      evidence: {
        transparencyNoticePublished: true,
        transferMechanism: false,
      },
      nowISO: FIXED_ISO,
    })
    expect(result.verdict).toBe("review_required")
    expect(result.reasons.some((r) => r.category === "transfer_review")).toBe(true)
  })
})

describe("compliance-gate — Art. 50 transparency (R4)", () => {
  it("chatbot without transparency notice → review_required", () => {
    const result = evaluateComplianceGate({
      input: base({ purpose: "support-chatbot" }),
      evidence: { transparencyNoticePublished: false },
      nowISO: FIXED_ISO,
    })
    expect(result.verdict).toBe("review_required")
    expect(result.reasons.some((r) => r.articleRef.includes("Art. 50"))).toBe(true)
  })

  it("chatbot WITH transparency notice → no transparency_required reason", () => {
    const result = evaluateComplianceGate({
      input: base({ purpose: "support-chatbot" }),
      evidence: { transparencyNoticePublished: true },
      nowISO: FIXED_ISO,
    })
    expect(
      result.reasons.every((r) => r.category !== "transparency_required"),
    ).toBe(true)
    expect(
      result.obligations.find((o) => o.article === "Art. 50 AI Act")?.status,
    ).toBe("met")
  })
})

describe("compliance-gate — Art. 12 logging (R9)", () => {
  it("high-risk + logging not enabled → review_required Art. 12", () => {
    const result = evaluateComplianceGate({
      input: base({
        purpose: "hr-screening",
        humanOversightDocumented: true,
        loggingEnabled: false,
      }),
      aiActRole: "provider",
      nowISO: FIXED_ISO,
    })
    expect(result.verdict).toBe("review_required")
    expect(result.reasons.some((r) => r.category === "logging_required")).toBe(true)
  })
})

describe("compliance-gate — GDPR Art. 9 special categories (R10)", () => {
  it("special categories without justification → review_required", () => {
    const result = evaluateComplianceGate({
      input: base({
        purpose: "document-assistant",
        processesSpecialCategories: true,
      }),
      evidence: { specialCategoriesJustified: false },
      nowISO: FIXED_ISO,
    })
    expect(result.verdict).toBe("review_required")
    expect(result.reasons.some((r) => r.articleRef === "GDPR Art. 9")).toBe(true)
  })
})

describe("compliance-gate — happy path PASS", () => {
  it("minimal-risk system with no risk surface → pass", () => {
    const result = evaluateComplianceGate({
      input: base({ purpose: "document-assistant" }),
      nowISO: FIXED_ISO,
    })
    expect(result.verdict).toBe("pass")
    expect(result.riskClass).toBe("minimal")
    // Pass-path emits one info-level confirmation
    expect(result.reasons.length).toBe(1)
    expect(result.reasons[0].severity).toBe("info")
  })

  it("limited-risk chatbot with transparency + no PII → pass", () => {
    const result = evaluateComplianceGate({
      input: base({
        purpose: "support-chatbot",
        processesPersonalData: false,
      }),
      evidence: { transparencyNoticePublished: true },
      nowISO: FIXED_ISO,
    })
    expect(result.verdict).toBe("pass")
  })

  it("high-risk provider with ALL evidence present → pass", () => {
    const result = evaluateComplianceGate({
      input: base({
        purpose: "credit-scoring",
        humanOversightDocumented: true,
        loggingEnabled: true,
        processesPersonalData: true,
        dpaSigned: true,
        vendorRegion: "EU",
      }),
      aiActRole: "provider",
      evidence: {
        dpiaCompleted: true,
      },
      nowISO: FIXED_ISO,
    })
    expect(result.verdict).toBe("pass")
  })
})

describe("compliance-gate — verdict ladder (worst wins)", () => {
  it("multiple review_required + one blocked → blocked", () => {
    const result = evaluateComplianceGate({
      input: base({
        purpose: "biometric-identification", // prohibited (blocks)
        processesPersonalData: true, // would add review_required for DPA
        dpaSigned: false,
      }),
      nowISO: FIXED_ISO,
    })
    expect(result.verdict).toBe("blocked")
  })

  it("apiVersion is always 'v1' in response", () => {
    const result = evaluateComplianceGate({
      input: base(),
      nowISO: FIXED_ISO,
    })
    expect(result.apiVersion).toBe("v1")
    expect(result.classifiedAtISO).toBe(FIXED_ISO)
  })
})
