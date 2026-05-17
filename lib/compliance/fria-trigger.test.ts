// FRIA Trigger — Sprint 016 tests.

import { describe, expect, it } from "vitest"

import {
  evaluateFriaRequirement,
  findSystemsNeedingFria,
  inferDeployerType,
} from "@/lib/compliance/fria-trigger"
import type {
  AISystemRecord,
  OrgRegulatoryProfile,
} from "@/lib/compliance/types"

function mkSystem(overrides: Partial<AISystemRecord> = {}): AISystemRecord {
  return {
    id: "sys-test-1",
    name: "Sistem test",
    purpose: "hr-screening",
    vendor: "vendor-test",
    modelType: "llm",
    usesPersonalData: true,
    makesAutomatedDecisions: true,
    impactsRights: true,
    hasHumanReview: false,
    riskLevel: "high",
    recommendedActions: [],
    createdAtISO: "2026-05-01T00:00:00Z",
    ...overrides,
  }
}

function mkProfile(overrides: Partial<OrgRegulatoryProfile> = {}): OrgRegulatoryProfile {
  return {
    orgId: "org-test",
    doraApplies: false,
    doraEntityType: "not_applicable",
    nis2EntityClass: "not_in_scope",
    nis2Sectors: [],
    createdAtISO: "2026-05-01T00:00:00Z",
    updatedAtISO: "2026-05-01T00:00:00Z",
    ...overrides,
  }
}

describe("inferDeployerType", () => {
  it("DORA credit_institution → credit_assessment", () => {
    const profile = mkProfile({ doraApplies: true, doraEntityType: "credit_institution" })
    expect(inferDeployerType(profile)).toBe("credit_assessment")
  })

  it("DORA insurance → life_health_insurance", () => {
    const profile = mkProfile({ doraApplies: true, doraEntityType: "insurance" })
    expect(inferDeployerType(profile)).toBe("life_health_insurance")
  })

  it("NIS2 public_administration → public_body", () => {
    const profile = mkProfile({ nis2Sectors: ["public_administration"] })
    expect(inferDeployerType(profile)).toBe("public_body")
  })

  it("Fără profil → other_high_risk_deployer", () => {
    expect(inferDeployerType()).toBe("other_high_risk_deployer")
  })
})

describe("evaluateFriaRequirement — sistem non-high-risk", () => {
  it("riskLevel = minimal → friaRequired false, urgency none", () => {
    const result = evaluateFriaRequirement({
      system: mkSystem({ riskLevel: "minimal" }),
    })
    expect(result.friaRequired).toBe(false)
    expect(result.urgency).toBe("none")
  })

  it("riskLevel = limited → friaRequired false", () => {
    const result = evaluateFriaRequirement({
      system: mkSystem({ riskLevel: "limited" }),
    })
    expect(result.friaRequired).toBe(false)
  })
})

describe("evaluateFriaRequirement — Art. 27(1)(a) public bodies", () => {
  it("public_body + sistem high-risk → REQUIRED before_use", () => {
    const result = evaluateFriaRequirement({
      system: mkSystem(),
      deployerTypeOverride: "public_body",
    })
    expect(result.friaRequired).toBe(true)
    expect(result.urgency).toBe("before_use")
    expect(result.deployerType).toBe("public_body")
    expect(result.reason).toMatch(/organism public/i)
    expect(result.legalReferences.join(" ")).toMatch(/Art\. 27\(1\)\(a\)/)
  })

  it("private_public_service + sistem high-risk → REQUIRED before_use", () => {
    const result = evaluateFriaRequirement({
      system: mkSystem(),
      deployerTypeOverride: "private_public_service",
    })
    expect(result.friaRequired).toBe(true)
    expect(result.urgency).toBe("before_use")
    expect(result.reason).toMatch(/servicii publice/i)
  })
})

describe("evaluateFriaRequirement — Art. 27(1)(b) credit + insurance", () => {
  it("system.purpose = credit-scoring → REQUIRED before_use", () => {
    const result = evaluateFriaRequirement({
      system: mkSystem({ purpose: "credit-scoring" }),
      deployerTypeOverride: "credit_assessment",
    })
    expect(result.friaRequired).toBe(true)
    expect(result.legalReferences.join(" ")).toMatch(/Annex III pt\. 5\(b\)/)
  })

  it("deployerType life_health_insurance + high-risk → REQUIRED before_use", () => {
    const result = evaluateFriaRequirement({
      system: mkSystem(),
      deployerTypeOverride: "life_health_insurance",
    })
    expect(result.friaRequired).toBe(true)
    expect(result.legalReferences.join(" ")).toMatch(/Annex III pt\. 5\(c\)/)
  })
})

describe("evaluateFriaRequirement — biometric + HR Annex III", () => {
  it("biometric-identification → REQUIRED before_use", () => {
    const result = evaluateFriaRequirement({
      system: mkSystem({ purpose: "biometric-identification" }),
      deployerTypeOverride: "public_body",
    })
    expect(result.friaRequired).toBe(true)
    expect(result.legalReferences.join(" ")).toMatch(/Annex III pt\. 1/)
  })

  it("hr-screening + other_high_risk_deployer → REQUIRED before_use", () => {
    const result = evaluateFriaRequirement({
      system: mkSystem({ purpose: "hr-screening" }),
      deployerTypeOverride: "other_high_risk_deployer",
    })
    expect(result.friaRequired).toBe(true)
    expect(result.legalReferences.join(" ")).toMatch(/Annex III pt\. 4/)
  })
})

describe("evaluateFriaRequirement — fără mandat clar Art. 27(1)", () => {
  it("high-risk + not_applicable deployer + purpose generic → recomandat, nu obligatoriu", () => {
    const result = evaluateFriaRequirement({
      system: mkSystem({ purpose: "fraud-detection" }),
      deployerTypeOverride: "not_applicable",
    })
    expect(result.friaRequired).toBe(false)
    expect(result.reason).toMatch(/recomandat/i)
  })
})

describe("evaluateFriaRequirement — urgency annual_review", () => {
  it("FRIA făcut acum 400 zile + condiție obligatorie → annual_review", () => {
    const oldDate = new Date(Date.now() - 400 * 86_400_000).toISOString()
    const result = evaluateFriaRequirement({
      system: mkSystem(),
      deployerTypeOverride: "public_body",
      lastFriaDateISO: oldDate,
    })
    expect(result.friaRequired).toBe(true)
    expect(result.urgency).toBe("annual_review")
  })

  it("FRIA făcut acum 30 zile → urgency none (recent)", () => {
    const recentDate = new Date(Date.now() - 30 * 86_400_000).toISOString()
    const result = evaluateFriaRequirement({
      system: mkSystem(),
      deployerTypeOverride: "public_body",
      lastFriaDateISO: recentDate,
    })
    expect(result.friaRequired).toBe(true)
    expect(result.urgency).toBe("none")
  })
})

describe("findSystemsNeedingFria", () => {
  it("returnează doar sistemele cu trigger + fără FRIA existent", () => {
    const sys1 = mkSystem({ id: "sys-1", riskLevel: "high", purpose: "hr-screening" })
    const sys2 = mkSystem({ id: "sys-2", riskLevel: "minimal" })
    const sys3 = mkSystem({ id: "sys-3", riskLevel: "high", purpose: "credit-scoring" })
    const profile = mkProfile({ doraApplies: true, doraEntityType: "credit_institution" })
    const result = findSystemsNeedingFria({
      systems: [sys1, sys2, sys3],
      orgRegulatoryProfile: profile,
      existingFriaSystemIds: ["sys-1"], // sys-1 are deja FRIA
    })
    // sys-3 should be included (credit-scoring + credit_institution profile)
    // sys-1 excluded (already has FRIA), sys-2 excluded (not high-risk)
    expect(result.map((r) => r.system.id)).toEqual(["sys-3"])
  })

  it("returnează listă vidă dacă toate sistemele au FRIA sau nu necesită", () => {
    const result = findSystemsNeedingFria({
      systems: [mkSystem({ riskLevel: "minimal" })],
      existingFriaSystemIds: [],
    })
    expect(result).toEqual([])
  })
})
