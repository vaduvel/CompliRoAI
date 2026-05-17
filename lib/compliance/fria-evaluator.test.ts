// FRIA Evaluator — Sprint 016 tests.

import { describe, expect, it } from "vitest"

import {
  computeRightRiskLevel,
  evaluateFria,
} from "@/lib/compliance/fria-evaluator"
import type { FriaRecord } from "@/lib/compliance/types"

function mkRecord(overrides: Partial<FriaRecord> = {}): FriaRecord {
  return {
    id: "fria-test-1",
    orgId: "org-test",
    title: "FRIA Test",
    linkedAISystemId: "sys-test",
    deployerType: "public_body",
    processDescription: "Test process description with enough length to satisfy any checks done by the evaluator.",
    frequencyOfUse: "daily",
    affectedGroups: [],
    rightsAtRisk: [],
    riskAssessments: [],
    overallRiskScore: 0,
    overallRiskLevel: "low",
    humanOversightMeasures: [],
    complaintMechanism: "",
    governanceMeasures: [],
    notifyAuthorityRequired: false,
    status: "draft",
    linkedFindingIds: [],
    evidenceVaultIds: [],
    createdAtISO: "2026-05-01T00:00:00Z",
    updatedAtISO: "2026-05-01T00:00:00Z",
    ...overrides,
  }
}

describe("computeRightRiskLevel — matrice 5×5", () => {
  it("rare × negligible (1) → low", () => {
    expect(computeRightRiskLevel("rare", "negligible")).toBe("low")
  })
  it("possible × moderate (9) → medium", () => {
    expect(computeRightRiskLevel("possible", "moderate")).toBe("medium")
  })
  it("likely × major (16) → critical", () => {
    expect(computeRightRiskLevel("likely", "major")).toBe("critical")
  })
  it("almost_certain × catastrophic (25) → critical", () => {
    expect(computeRightRiskLevel("almost_certain", "catastrophic")).toBe("critical")
  })
  it("likely × moderate (12) → high", () => {
    expect(computeRightRiskLevel("likely", "moderate")).toBe("high")
  })
})

describe("evaluateFria — overall score aggregation", () => {
  it("record fără assessments + complaint mechanism valid → score 0, level low, fără findings", () => {
    const result = evaluateFria({
      record: mkRecord({
        complaintMechanism:
          "Persoanele afectate pot trimite plângere la dpo@org.ro în max 30 zile, conform GDPR Art. 77.",
      }),
      orgName: "Test Org",
    })
    expect(result.overallRiskScore).toBe(0)
    expect(result.overallRiskLevel).toBe("low")
    expect(result.candidateFindings.length).toBe(0)
  })

  it("record cu 1 risc critical → score 100, level critical, finding emis", () => {
    const result = evaluateFria({
      record: mkRecord({
        rightsAtRisk: ["non_discrimination"],
        riskAssessments: [
          {
            rightAffected: "non_discrimination",
            description: "Bias rasial în output",
            likelihood: "likely",
            severity: "major",
            riskLevel: "critical",
            mitigationMeasures: [],
            residualRisk: "critical",
          },
        ],
        complaintMechanism:
          "Persoanele afectate pot trimite plângere la dpo@org.ro în max 30 zile, conform GDPR Art. 77.",
      }),
      orgName: "Test Org",
    })
    expect(result.overallRiskScore).toBe(100)
    expect(result.overallRiskLevel).toBe("critical")
    expect(result.criticalCount).toBe(1)
    expect(result.candidateFindings.length).toBeGreaterThanOrEqual(1)
    const findingTitles = result.candidateFindings.map((f) => f.title).join(" | ")
    expect(findingTitles).toMatch(/Risc critic Art\. 27\(1\)\(d\)/)
  })

  it("record cu risc mixed (high + low) → score mediat, level medium/high", () => {
    const result = evaluateFria({
      record: mkRecord({
        rightsAtRisk: ["non_discrimination", "data_protection"],
        riskAssessments: [
          {
            rightAffected: "non_discrimination",
            description: "Risk A",
            likelihood: "likely",
            severity: "moderate",
            riskLevel: "high",
            mitigationMeasures: ["MFA"],
            residualRisk: "high",
          },
          {
            rightAffected: "data_protection",
            description: "Risk B",
            likelihood: "rare",
            severity: "minor",
            riskLevel: "low",
            mitigationMeasures: ["encryption"],
            residualRisk: "low",
          },
        ],
        complaintMechanism:
          "Persoanele afectate pot trimite plângere la dpo@org.ro în max 30 zile, conform GDPR Art. 77.",
      }),
      orgName: "Test Org",
    })
    expect(result.overallRiskScore).toBeGreaterThan(25)
    expect(result.overallRiskScore).toBeLessThanOrEqual(75)
    expect(result.highCount).toBe(1)
  })
})

describe("evaluateFria — finding emission Art. 27", () => {
  it("lipsește mecanism plângere → finding Art. 27(1)(f) emis", () => {
    const result = evaluateFria({
      record: mkRecord({ complaintMechanism: "" }),
      orgName: "Test Org",
    })
    const findings = result.candidateFindings.map((f) => f.title)
    expect(findings.some((t) => /Art\. 27\(1\)\(f\)/.test(t))).toBe(true)
  })

  it("notifyAuthorityRequired = true + neefectuat → finding Art. 27(3) emis", () => {
    const result = evaluateFria({
      record: mkRecord({
        notifyAuthorityRequired: true,
        notifiedAtISO: undefined,
        complaintMechanism:
          "Persoanele afectate pot trimite plângere la dpo@org.ro în max 30 zile, conform GDPR Art. 77.",
      }),
      orgName: "Test Org",
    })
    const findings = result.candidateFindings.map((f) => f.title)
    expect(findings.some((t) => /Art\. 27\(3\)/.test(t))).toBe(true)
  })

  it("notifyAuthorityRequired = true + dată notificare prezentă → NU emite finding", () => {
    const result = evaluateFria({
      record: mkRecord({
        notifyAuthorityRequired: true,
        notifiedAtISO: "2026-05-10T00:00:00Z",
        authorityReference: "ADR-2026/123",
        complaintMechanism:
          "Persoanele afectate pot trimite plângere la dpo@org.ro în max 30 zile, conform GDPR Art. 77.",
      }),
      orgName: "Test Org",
    })
    const findings = result.candidateFindings.map((f) => f.title)
    expect(findings.some((t) => /Art\. 27\(3\)/.test(t))).toBe(false)
  })

  it("risc înalt + zero oversight measures → finding Art. 14 emis", () => {
    const result = evaluateFria({
      record: mkRecord({
        rightsAtRisk: ["non_discrimination"],
        riskAssessments: [
          {
            rightAffected: "non_discrimination",
            description: "Risk",
            likelihood: "likely",
            severity: "major",
            riskLevel: "critical",
            mitigationMeasures: [],
            residualRisk: "high",
          },
        ],
        humanOversightMeasures: [],
        complaintMechanism:
          "Persoanele afectate pot trimite plângere la dpo@org.ro în max 30 zile, conform GDPR Art. 77.",
      }),
      orgName: "Test Org",
    })
    const titles = result.candidateFindings.map((f) => f.title)
    expect(titles.some((t) => /Art\. 14/.test(t))).toBe(true)
  })
})

describe("evaluateFria — markdown export", () => {
  it("markdown conține secțiunile A-F + checklist final + sumar", () => {
    const result = evaluateFria({
      record: mkRecord({
        title: "FRIA HR Screening",
        deployerType: "public_body",
        affectedGroups: [{ category: "Candidați", estimatedCount: 100, vulnerabilities: [] }],
        rightsAtRisk: ["non_discrimination"],
        riskAssessments: [
          {
            rightAffected: "non_discrimination",
            description: "Risk",
            likelihood: "possible",
            severity: "moderate",
            riskLevel: "medium",
            mitigationMeasures: ["Bias audit anual"],
            residualRisk: "low",
          },
        ],
        humanOversightMeasures: [
          {
            measureType: "human_in_loop",
            description: "Recrutor validează fiecare decizie",
            responsibleRole: "Recrutor HR",
            triggerConditions: "Toate deciziile",
            documentedAtISO: "2026-05-01T00:00:00Z",
          },
        ],
        complaintMechanism:
          "Persoanele afectate pot trimite plângere la dpo@org.ro în max 30 zile, conform GDPR Art. 77.",
      }),
      orgName: "Test Org SRL",
      systemName: "HR-Triage-AI",
    })
    expect(result.generatedMarkdown).toContain("# FRIA — FRIA HR Screening")
    expect(result.generatedMarkdown).toContain("Test Org SRL")
    expect(result.generatedMarkdown).toContain("HR-Triage-AI")
    expect(result.generatedMarkdown).toContain("## A. Profilul deployer-ului")
    expect(result.generatedMarkdown).toContain("## B. Procesul")
    expect(result.generatedMarkdown).toContain("## C. Categoriile de persoane afectate")
    expect(result.generatedMarkdown).toContain("## D. Drepturile fundamentale la risc")
    expect(result.generatedMarkdown).toContain("## E. Supraveghere umană")
    expect(result.generatedMarkdown).toContain("## F. Plângere și guvernanță")
    expect(result.generatedMarkdown).toContain("## Checklist final")
    expect(result.generatedMarkdown).toMatch(/Nediscriminare/i)
    expect(result.generatedMarkdown).toContain("Recrutor HR")
  })

  it("markdown menționează DPIA reuse dacă linkedDpiaRecordId setat", () => {
    const result = evaluateFria({
      record: mkRecord({
        linkedDpiaRecordId: "dpia-abc123",
        complaintMechanism:
          "Persoanele afectate pot trimite plângere la dpo@org.ro în max 30 zile, conform GDPR Art. 77.",
      }),
      orgName: "Test Org",
    })
    expect(result.generatedMarkdown).toMatch(/dpia-abc123/)
    expect(result.generatedMarkdown).toMatch(/Art\. 27\(4\)/)
  })
})
