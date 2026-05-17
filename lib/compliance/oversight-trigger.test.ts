// Sprint 017 — oversight-trigger tests (Art. 14).

import { describe, expect, it } from "vitest"
import {
  evaluateOversightRequirement,
  findSystemsNeedingOversight,
} from "@/lib/compliance/oversight-trigger"
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

describe("evaluateOversightRequirement", () => {
  it("sistem limited risk fără decizii → NU trigger", () => {
    const t = evaluateOversightRequirement({ system: baseSystem() })
    expect(t.oversightRequired).toBe(false)
    expect(t.twoPersonRuleRequired).toBe(false)
    expect(t.urgency).toBe("none")
  })

  it("sistem high-risk → trigger before_use + minim HITL", () => {
    const t = evaluateOversightRequirement({
      system: baseSystem({ riskLevel: "high", purpose: "credit-scoring" }),
    })
    expect(t.oversightRequired).toBe(true)
    expect(t.urgency).toBe("before_use")
    // High-risk fără biometric → escaladăm de la HOTL → HITL
    expect(t.recommendedModel).toBe("human_in_the_loop")
    expect(t.legalReferences.join(",")).toMatch(/14\(1\)/)
  })

  it("sistem biometric ID → two_person_rule OBLIGATORIU Art. 14(4)", () => {
    const t = evaluateOversightRequirement({
      system: baseSystem({
        purpose: "biometric-identification",
        riskLevel: "high",
      }),
    })
    expect(t.oversightRequired).toBe(true)
    expect(t.twoPersonRuleRequired).toBe(true)
    expect(t.recommendedModel).toBe("two_person_rule")
    expect(t.legalReferences.join(",")).toMatch(/14\(4\)/)
    expect(t.reason).toMatch(/DOUĂ persoane/)
  })

  it("sistem cu decizii automate + impact drepturi → trigger + HITL recomandat", () => {
    const t = evaluateOversightRequirement({
      system: baseSystem({
        riskLevel: "limited",
        makesAutomatedDecisions: true,
        impactsRights: true,
        purpose: "fraud-detection",
      }),
    })
    expect(t.oversightRequired).toBe(true)
    expect(t.recommendedModel).toBe("human_in_the_loop")
    expect(t.legalReferences.join(",")).toMatch(/GDPR Art\. 22/)
  })

  it("biometric ID + high-risk + decizii → two_person_rule prevalează", () => {
    const t = evaluateOversightRequirement({
      system: baseSystem({
        purpose: "biometric-identification",
        riskLevel: "high",
        makesAutomatedDecisions: true,
        impactsRights: true,
      }),
    })
    expect(t.twoPersonRuleRequired).toBe(true)
    expect(t.recommendedModel).toBe("two_person_rule")
  })

  it("dacă există protocol aprobat <6 luni → urgency = none", () => {
    const recent = new Date(Date.now() - 30 * 86_400_000).toISOString()
    const t = evaluateOversightRequirement({
      system: baseSystem({ riskLevel: "high" }),
      lastApprovedISO: recent,
    })
    expect(t.oversightRequired).toBe(true)
    expect(t.urgency).toBe("none")
  })

  it("dacă protocol aprobat >6 luni → urgency = periodic_review", () => {
    const old = new Date(Date.now() - 200 * 86_400_000).toISOString()
    const t = evaluateOversightRequirement({
      system: baseSystem({ riskLevel: "high" }),
      lastApprovedISO: old,
    })
    expect(t.urgency).toBe("periodic_review")
  })
})

describe("findSystemsNeedingOversight", () => {
  it("returnează doar sistemele care necesită oversight + nu au protocol", () => {
    const highBio = baseSystem({
      id: "s1",
      riskLevel: "high",
      purpose: "biometric-identification",
    })
    const limited = baseSystem({ id: "s2", riskLevel: "limited" })
    const highCovered = baseSystem({ id: "s3", riskLevel: "high" })

    const result = findSystemsNeedingOversight({
      systems: [highBio, limited, highCovered],
      existingProtocolSystemIds: ["s3"], // s3 are deja
    })
    expect(result.map((r) => r.system.id)).toEqual(["s1"])
    expect(result[0].trigger.twoPersonRuleRequired).toBe(true)
  })
})
