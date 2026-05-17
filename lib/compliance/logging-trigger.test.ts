// Sprint 018 — logging-trigger tests (Art. 12 + Art. 26(6)).

import { describe, expect, it } from "vitest"
import {
  evaluateLoggingRequirement,
  findSystemsNeedingLogging,
} from "@/lib/compliance/logging-trigger"
import type { AISystemRecord } from "@/lib/compliance/types"

function baseSystem(over: Partial<AISystemRecord> = {}): AISystemRecord {
  return {
    id: "sys-1",
    name: "Test System",
    purpose: "support-chatbot",
    vendor: "vendor",
    modelType: "llm",
    usesPersonalData: false,
    makesAutomatedDecisions: false,
    impactsRights: false,
    hasHumanReview: false,
    riskLevel: "limited",
    recommendedActions: [],
    createdAtISO: "2026-05-01T00:00:00Z",
    ...over,
  }
}

describe("evaluateLoggingRequirement", () => {
  it("sistem limited risk fără decizii → NU trigger (recomandat minimal)", () => {
    const t = evaluateLoggingRequirement({ system: baseSystem() })
    expect(t.loggingRequired).toBe(false)
    expect(t.recommendedSeverityLevel).toBe("minimal")
    expect(t.minRetentionMonths).toBe(3)
    expect(t.biometricFullRequired).toBe(false)
    expect(t.urgency).toBe("none")
  })

  it("sistem high-risk → trigger standard + 6 luni Art. 26(6)", () => {
    const t = evaluateLoggingRequirement({
      system: baseSystem({ riskLevel: "high", purpose: "credit-scoring" }),
    })
    expect(t.loggingRequired).toBe(true)
    expect(t.recommendedSeverityLevel).toBe("standard")
    expect(t.minRetentionMonths).toBeGreaterThanOrEqual(6)
    expect(t.urgency).toBe("before_use")
    expect(t.legalReferences.join(",")).toMatch(/12\(1\)/)
    expect(t.legalReferences.join(",")).toMatch(/26\(6\)/)
  })

  it("sistem biometric ID → biometric_full + 12 luni Art. 12(3)", () => {
    const t = evaluateLoggingRequirement({
      system: baseSystem({
        purpose: "biometric-identification",
        riskLevel: "high",
      }),
    })
    expect(t.loggingRequired).toBe(true)
    expect(t.biometricFullRequired).toBe(true)
    expect(t.recommendedSeverityLevel).toBe("biometric_full")
    expect(t.minRetentionMonths).toBeGreaterThanOrEqual(12)
    expect(t.legalReferences.join(",")).toMatch(/12\(3\)/)
    expect(t.legalReferences.join(",")).toMatch(/GDPR Art\. 9/)
    expect(t.reason).toMatch(/biometric/)
  })

  it("sistem cu decizii automate + impact drepturi → enhanced + 12 luni", () => {
    const t = evaluateLoggingRequirement({
      system: baseSystem({
        riskLevel: "limited",
        makesAutomatedDecisions: true,
        impactsRights: true,
        purpose: "fraud-detection",
      }),
    })
    expect(t.loggingRequired).toBe(true)
    expect(t.recommendedSeverityLevel).toBe("enhanced")
    expect(t.minRetentionMonths).toBeGreaterThanOrEqual(12)
    expect(t.legalReferences.join(",")).toMatch(/GDPR Art\. 22/)
  })

  it("biometric + decizii → biometric_full prevalează + 12 luni", () => {
    const t = evaluateLoggingRequirement({
      system: baseSystem({
        purpose: "biometric-identification",
        riskLevel: "high",
        makesAutomatedDecisions: true,
        impactsRights: true,
      }),
    })
    expect(t.biometricFullRequired).toBe(true)
    expect(t.recommendedSeverityLevel).toBe("biometric_full")
    expect(t.minRetentionMonths).toBeGreaterThanOrEqual(12)
  })

  it("dacă există config aprobat <90 zile → urgency = none", () => {
    const recent = new Date(Date.now() - 30 * 86_400_000).toISOString()
    const t = evaluateLoggingRequirement({
      system: baseSystem({ riskLevel: "high" }),
      lastApprovedISO: recent,
    })
    expect(t.loggingRequired).toBe(true)
    expect(t.urgency).toBe("none")
  })

  it("dacă config aprobat >90 zile → urgency = periodic_review", () => {
    const old = new Date(Date.now() - 120 * 86_400_000).toISOString()
    const t = evaluateLoggingRequirement({
      system: baseSystem({ riskLevel: "high" }),
      lastApprovedISO: old,
    })
    expect(t.urgency).toBe("periodic_review")
  })

  it("decizii cu impact + high-risk → enhanced (nu doar standard)", () => {
    const t = evaluateLoggingRequirement({
      system: baseSystem({
        riskLevel: "high",
        makesAutomatedDecisions: true,
        impactsRights: true,
      }),
    })
    expect(t.recommendedSeverityLevel).toBe("enhanced")
    expect(t.minRetentionMonths).toBeGreaterThanOrEqual(12)
  })
})

describe("findSystemsNeedingLogging", () => {
  it("returnează doar sistemele care necesită config + nu au unul", () => {
    const highBio = baseSystem({
      id: "s1",
      riskLevel: "high",
      purpose: "biometric-identification",
    })
    const limited = baseSystem({ id: "s2", riskLevel: "limited" })
    const highCovered = baseSystem({ id: "s3", riskLevel: "high" })

    const result = findSystemsNeedingLogging({
      systems: [highBio, limited, highCovered],
      existingConfigSystemIds: ["s3"], // s3 deja are
    })
    expect(result.map((r) => r.system.id)).toEqual(["s1"])
    expect(result[0].trigger.biometricFullRequired).toBe(true)
    expect(result[0].trigger.minRetentionMonths).toBeGreaterThanOrEqual(12)
  })
})
