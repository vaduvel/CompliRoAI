import { describe, expect, it } from "vitest"

import {
  evaluatePmmRequirement,
  findSystemsNeedingPmm,
} from "@/lib/compliance/pmm-trigger"
import type { AISystemRecord } from "@/lib/compliance/types"

function makeSystem(overrides: Partial<AISystemRecord> = {}): AISystemRecord {
  return {
    id: "sys-1",
    name: "Test AI",
    purpose: "support-chatbot",
    vendor: "OpenAI",
    modelType: "gpt-4",
    usesPersonalData: false,
    makesAutomatedDecisions: false,
    impactsRights: false,
    hasHumanReview: true,
    riskLevel: "limited",
    recommendedActions: [],
    createdAtISO: "2026-05-01T00:00:00.000Z",
    ...overrides,
  }
}

describe("PMM trigger detection (Art. 72)", () => {
  it("low-risk sistem → PMM recommendation anual, nu obligatoriu", () => {
    const result = evaluatePmmRequirement({ system: makeSystem() })
    expect(result.pmmRequired).toBe(false)
    expect(result.recommendedReviewCycle).toBe("annual")
    expect(result.reviewCycleMonths).toBe(12)
    expect(result.urgency).toBe("none")
  })

  it("high-risk sistem → PMM REQUIRED + quarterly review", () => {
    const result = evaluatePmmRequirement({
      system: makeSystem({ riskLevel: "high" }),
    })
    expect(result.pmmRequired).toBe(true)
    expect(result.recommendedReviewCycle).toBe("quarterly")
    expect(result.reviewCycleMonths).toBe(3)
    expect(result.reason).toContain("HIGH-RISK")
    expect(result.legalReferences).toContain("EU AI Act Art. 72(2)")
  })

  it("biometric ID → PMM REQUIRED + monthly review (overrides high-risk cadence)", () => {
    const result = evaluatePmmRequirement({
      system: makeSystem({
        purpose: "biometric-identification",
        riskLevel: "high",
      }),
    })
    expect(result.pmmRequired).toBe(true)
    expect(result.recommendedReviewCycle).toBe("monthly")
    expect(result.reviewCycleMonths).toBe(1)
    expect(result.reason).toContain("biometric")
    expect(result.legalReferences).toContain("GDPR Art. 9 — date biometrice categoria specială")
    expect(result.legalReferences).toContain("EU AI Act Annex III pct. 1(a)")
  })

  it("decizii automate + impact rights (fără high-risk) → quarterly review", () => {
    const result = evaluatePmmRequirement({
      system: makeSystem({
        makesAutomatedDecisions: true,
        impactsRights: true,
        riskLevel: "limited",
      }),
    })
    expect(result.pmmRequired).toBe(true)
    expect(result.recommendedReviewCycle).toBe("quarterly")
    expect(result.reviewCycleMonths).toBe(3)
    expect(result.legalReferences).toContain("EU AI Act Art. 72(3)(b)")
    expect(result.legalReferences).toContain("GDPR Art. 22 — decizii automate")
  })

  it("combo biometric + decizii automate impact → monthly câștigă", () => {
    const result = evaluatePmmRequirement({
      system: makeSystem({
        purpose: "biometric-identification",
        riskLevel: "high",
        makesAutomatedDecisions: true,
        impactsRights: true,
      }),
    })
    expect(result.recommendedReviewCycle).toBe("monthly")
    expect(result.reviewCycleMonths).toBe(1)
    // Toate referințele relevante prezente
    expect(result.legalReferences).toContain("EU AI Act Art. 72(1)")
    expect(result.legalReferences).toContain("EU AI Act Art. 72(2)")
    expect(result.legalReferences).toContain("EU AI Act Art. 72(3)(b)")
  })

  it("urgency = before_use când nu există plan aprobat", () => {
    const result = evaluatePmmRequirement({
      system: makeSystem({ riskLevel: "high" }),
    })
    expect(result.urgency).toBe("before_use")
  })

  it("urgency = none când plan aprobat recent (< 90 zile)", () => {
    const recent = new Date(Date.now() - 30 * 86_400_000).toISOString()
    const result = evaluatePmmRequirement({
      system: makeSystem({ riskLevel: "high" }),
      lastApprovedISO: recent,
    })
    expect(result.urgency).toBe("none")
  })

  it("urgency = periodic_review când plan aprobat > 90 zile", () => {
    const stale = new Date(Date.now() - 120 * 86_400_000).toISOString()
    const result = evaluatePmmRequirement({
      system: makeSystem({ riskLevel: "high" }),
      lastApprovedISO: stale,
    })
    expect(result.urgency).toBe("periodic_review")
  })

  it("findSystemsNeedingPmm exclude sisteme cu plan existent", () => {
    const systems: AISystemRecord[] = [
      makeSystem({ id: "s1", riskLevel: "high" }),
      makeSystem({ id: "s2", riskLevel: "high" }),
      makeSystem({ id: "s3", riskLevel: "limited" }),
    ]
    const result = findSystemsNeedingPmm({
      systems,
      existingPlanSystemIds: ["s1"],
    })
    expect(result).toHaveLength(1)
    expect(result[0].system.id).toBe("s2")
  })

  it("findSystemsNeedingPmm semnalează doar sisteme care necesită PMM (nu low-risk)", () => {
    const systems: AISystemRecord[] = [
      makeSystem({ id: "s1", riskLevel: "limited" }),
      makeSystem({ id: "s2", purpose: "biometric-identification", riskLevel: "high" }),
    ]
    const result = findSystemsNeedingPmm({
      systems,
      existingPlanSystemIds: [],
    })
    expect(result).toHaveLength(1)
    expect(result[0].system.id).toBe("s2")
    expect(result[0].trigger.recommendedReviewCycle).toBe("monthly")
  })
})
