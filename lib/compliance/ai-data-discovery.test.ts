/**
 * Sprint 009 — Tests pentru AI Data Discovery engine.
 *
 * Acopera:
 *  - risk evaluator (prohibited / high-risk / transparency / needs-review / minimal)
 *  - finding emission per risc + governance gap
 *  - record builder shape correctness
 *
 * Pure tests (no I/O, no mocks).
 */

import { describe, expect, it } from "vitest"

import {
  buildAIDataDiscoveryFindings,
  buildAIDataMapRecord,
  evaluateAIDataDiscovery,
  evaluateAIRiskCandidate,
  USE_CASE_LABELS,
  RISK_CANDIDATE_LABELS,
  type AIDataDiscoveryIntake,
} from "@/lib/compliance/ai-data-discovery"

const BASE_INTAKE: AIDataDiscoveryIntake = {
  toolName: "ChatGPT",
  vendor: "OpenAI",
  deploymentMode: "saas",
  useCaseCategory: "internal_copilot",
  useCaseDescription: "Asistare angajati cu redactare email + brainstorming",
  inputDataCategories: ["text"],
  outputDataCategories: ["text"],
  processesPersonalData: false,
  processesSpecialCategories: false,
  childrenData: false,
  vendorRegion: "US",
  trainingDataUsage: "opt_out_available",
  dpaSigned: true,
  subprocessorsDocumented: true,
}

describe("evaluateAIRiskCandidate", () => {
  it("marcheaza prohibited_candidate cand descrierea include cuvant cheie Art. 5", () => {
    const intake: AIDataDiscoveryIntake = {
      ...BASE_INTAKE,
      useCaseCategory: "public_sector_critical",
      useCaseDescription: "Sistem de recunoastere faciala publica in primarie",
    }
    const result = evaluateAIRiskCandidate(intake)
    expect(result.riskCandidate).toBe("prohibited_candidate")
    expect(result.reasons[0]).toMatch(/Art\. 5/)
  })

  it("marcheaza high_risk_candidate pentru HR screening", () => {
    const intake: AIDataDiscoveryIntake = {
      ...BASE_INTAKE,
      useCaseCategory: "hr_workplace",
      useCaseDescription: "AI screening CV-uri candidati",
      processesPersonalData: true,
    }
    const result = evaluateAIRiskCandidate(intake)
    expect(result.riskCandidate).toBe("high_risk_candidate")
    expect(result.reasons.join(" ")).toMatch(/Annex III/)
  })

  it("marcheaza high_risk_candidate pentru credit scoring", () => {
    const intake: AIDataDiscoveryIntake = {
      ...BASE_INTAKE,
      useCaseCategory: "finance_credit_fraud",
      useCaseDescription: "Scoring credit clienti retail",
      processesPersonalData: true,
    }
    expect(evaluateAIRiskCandidate(intake).riskCandidate).toBe("high_risk_candidate")
  })

  it("marcheaza high_risk_candidate pentru special categories chiar fara categorie high-risk", () => {
    const intake: AIDataDiscoveryIntake = {
      ...BASE_INTAKE,
      useCaseCategory: "internal_copilot",
      processesPersonalData: true,
      processesSpecialCategories: true,
    }
    const result = evaluateAIRiskCandidate(intake)
    expect(result.riskCandidate).toBe("high_risk_candidate")
    expect(result.reasons.join(" ")).toMatch(/Art\. 9/)
  })

  it("marcheaza needs_human_review cand lipseste DPA si exista date personale", () => {
    const intake: AIDataDiscoveryIntake = {
      ...BASE_INTAKE,
      useCaseCategory: "internal_copilot",
      processesPersonalData: true,
      dpaSigned: false,
    }
    const result = evaluateAIRiskCandidate(intake)
    expect(result.riskCandidate).toBe("needs_human_review")
    expect(result.reasons.join(" ")).toMatch(/DPA/)
  })

  it("marcheaza needs_human_review pentru vendor non-EU + no DPA", () => {
    const intake: AIDataDiscoveryIntake = {
      ...BASE_INTAKE,
      processesPersonalData: true,
      vendorRegion: "other",
      dpaSigned: false,
    }
    const result = evaluateAIRiskCandidate(intake)
    expect(result.riskCandidate).toBe("needs_human_review")
    expect(result.reasons.join(" ")).toMatch(/SCC/)
  })

  it("marcheaza needs_human_review cand vendor trains_on_data + personal data", () => {
    const intake: AIDataDiscoveryIntake = {
      ...BASE_INTAKE,
      processesPersonalData: true,
      trainingDataUsage: "trains_on_data",
    }
    expect(evaluateAIRiskCandidate(intake).riskCandidate).toBe("needs_human_review")
  })

  it("marcheaza transparency_limited pentru chatbot customer support", () => {
    const intake: AIDataDiscoveryIntake = {
      ...BASE_INTAKE,
      useCaseCategory: "customer_support",
      processesPersonalData: false,
    }
    const result = evaluateAIRiskCandidate(intake)
    expect(result.riskCandidate).toBe("transparency_limited")
    expect(result.reasons.join(" ")).toMatch(/Art\. 50/)
  })

  it("marcheaza minimal pentru internal copilot fara date personale", () => {
    const result = evaluateAIRiskCandidate(BASE_INTAKE)
    expect(result.riskCandidate).toBe("minimal")
  })
})

describe("buildAIDataDiscoveryFindings", () => {
  it("emite finding critic pentru prohibited_candidate", () => {
    const intake: AIDataDiscoveryIntake = {
      ...BASE_INTAKE,
      useCaseCategory: "public_sector_critical",
      useCaseDescription: "Social scoring cetateni",
    }
    const evaluation = evaluateAIRiskCandidate(intake)
    const findings = buildAIDataDiscoveryFindings(intake, evaluation)
    const prohibited = findings.find((f) => f.title.startsWith("Posibil sistem AI interzis"))
    expect(prohibited).toBeDefined()
    expect(prohibited?.severity).toBe("critical")
    expect(prohibited?.category).toBe("EU_AI_ACT")
  })

  it("emite finding high pentru missing DPA cand exista date personale", () => {
    const intake: AIDataDiscoveryIntake = {
      ...BASE_INTAKE,
      processesPersonalData: true,
      dpaSigned: false,
    }
    const evaluation = evaluateAIRiskCandidate(intake)
    const findings = buildAIDataDiscoveryFindings(intake, evaluation)
    const dpa = findings.find((f) => f.title.startsWith("Lipsă DPA"))
    expect(dpa).toBeDefined()
    expect(dpa?.severity).toBe("high")
    expect(dpa?.category).toBe("GDPR")
  })

  it("emite finding pentru third-country transfer", () => {
    const intake: AIDataDiscoveryIntake = {
      ...BASE_INTAKE,
      processesPersonalData: true,
      vendorRegion: "US",
    }
    const evaluation = evaluateAIRiskCandidate(intake)
    const findings = buildAIDataDiscoveryFindings(intake, evaluation)
    const transfer = findings.find((f) => f.title.includes("țară terță"))
    expect(transfer).toBeDefined()
  })

  it("emite finding DPIA pentru special categories", () => {
    const intake: AIDataDiscoveryIntake = {
      ...BASE_INTAKE,
      processesPersonalData: true,
      processesSpecialCategories: true,
    }
    const evaluation = evaluateAIRiskCandidate(intake)
    const findings = buildAIDataDiscoveryFindings(intake, evaluation)
    expect(findings.some((f) => f.title.includes("Categorii speciale"))).toBe(true)
  })

  it("emite finding pentru children data", () => {
    const intake: AIDataDiscoveryIntake = {
      ...BASE_INTAKE,
      processesPersonalData: true,
      childrenData: true,
    }
    const evaluation = evaluateAIRiskCandidate(intake)
    const findings = buildAIDataDiscoveryFindings(intake, evaluation)
    expect(findings.some((f) => f.title.includes("Date copii"))).toBe(true)
  })

  it("emite finding pentru trains_on_data", () => {
    const intake: AIDataDiscoveryIntake = {
      ...BASE_INTAKE,
      processesPersonalData: true,
      trainingDataUsage: "trains_on_data",
    }
    const evaluation = evaluateAIRiskCandidate(intake)
    const findings = buildAIDataDiscoveryFindings(intake, evaluation)
    expect(findings.some((f) => f.title.includes("antrenează"))).toBe(true)
  })

  it("emite finding Art. 50 pentru transparency_limited", () => {
    const intake: AIDataDiscoveryIntake = {
      ...BASE_INTAKE,
      useCaseCategory: "customer_support",
    }
    const evaluation = evaluateAIRiskCandidate(intake)
    const findings = buildAIDataDiscoveryFindings(intake, evaluation)
    expect(findings.some((f) => f.title.includes("Art. 50"))).toBe(true)
  })

  it("emite mereu finding policy/literacy", () => {
    const evaluation = evaluateAIRiskCandidate(BASE_INTAKE)
    const findings = buildAIDataDiscoveryFindings(BASE_INTAKE, evaluation)
    expect(findings.some((f) => f.title.includes("AI literacy"))).toBe(true)
  })
})

describe("evaluateAIDataDiscovery — combined", () => {
  it("returneaza risk + reasons + findings impreuna", () => {
    const intake: AIDataDiscoveryIntake = {
      ...BASE_INTAKE,
      processesPersonalData: true,
      processesSpecialCategories: true,
      dpaSigned: false,
      vendorRegion: "US",
    }
    const result = evaluateAIDataDiscovery(intake)
    expect(result.riskCandidate).toBe("high_risk_candidate")
    expect(result.reasons.length).toBeGreaterThan(0)
    expect(result.findings.length).toBeGreaterThan(3) // high-risk + dpa + transfer + special + policy
  })
})

describe("buildAIDataMapRecord", () => {
  it("construieste record cu campurile corect mapate", () => {
    const evaluation = evaluateAIRiskCandidate(BASE_INTAKE)
    const record = buildAIDataMapRecord({
      intake: BASE_INTAKE,
      orgId: "org-test",
      evaluation,
      recordId: "ai-data-test-1",
      linkedFindingIds: ["finding-1", "finding-2"],
      nowISO: "2026-05-17T10:00:00.000Z",
    })
    expect(record.id).toBe("ai-data-test-1")
    expect(record.orgId).toBe("org-test")
    expect(record.toolName).toBe("ChatGPT")
    expect(record.riskCandidate).toBe("minimal")
    expect(record.status).toBe("active")
    expect(record.linkedFindingIds).toEqual(["finding-1", "finding-2"])
    expect(record.createdAtISO).toBe("2026-05-17T10:00:00.000Z")
    expect(record.updatedAtISO).toBe("2026-05-17T10:00:00.000Z")
  })

  it("normalizeaza array-uri (dedupe + trim + filter empty)", () => {
    const intake: AIDataDiscoveryIntake = {
      ...BASE_INTAKE,
      inputDataCategories: ["  email  ", "email", "", "phone"],
      outputDataCategories: ["text", "text"],
    }
    const evaluation = evaluateAIRiskCandidate(intake)
    const record = buildAIDataMapRecord({
      intake,
      orgId: "org",
      evaluation,
      recordId: "id",
      linkedFindingIds: [],
      nowISO: "2026-05-17T00:00:00.000Z",
    })
    expect(record.inputDataCategories).toEqual(["email", "phone"])
    expect(record.outputDataCategories).toEqual(["text"])
  })
})

describe("Labels", () => {
  it("are label-uri RO pentru toate use case categories", () => {
    const keys: (keyof typeof USE_CASE_LABELS)[] = [
      "customer_support",
      "internal_copilot",
      "sales_marketing",
      "hr_workplace",
      "finance_credit_fraud",
      "medical_health",
      "education",
      "ecommerce_retail",
      "legal_professional",
      "ai_builder_agent",
      "cybersecurity",
      "public_sector_critical",
      "other",
    ]
    for (const key of keys) {
      expect(USE_CASE_LABELS[key]).toBeTruthy()
    }
  })

  it("are label-uri RO pentru toate risk candidates", () => {
    const keys: (keyof typeof RISK_CANDIDATE_LABELS)[] = [
      "prohibited_candidate",
      "high_risk_candidate",
      "transparency_limited",
      "needs_human_review",
      "minimal",
    ]
    for (const key of keys) {
      expect(RISK_CANDIDATE_LABELS[key]).toBeTruthy()
    }
  })
})
