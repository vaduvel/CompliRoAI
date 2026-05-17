/**
 * Sprint 008C — Tests pentru dpia-schema (screening Art. 35).
 *
 * Verifica: versiunea schemei, scoringul pe scenarii diverse, generarea
 * de finding pentru risc mare, markdown-ul exportat.
 */

import { describe, expect, it } from "vitest"

import { DPIA_SCHEMA_V1, evaluateDpiaScreening } from "./dpia-schema"

const NOW = "2026-05-17T00:00:00.000Z"

describe("DPIA schema", () => {
  it("este versionata si are intrebari Art. 35 actionabile", () => {
    expect(DPIA_SCHEMA_V1.id).toBe("compliroai-dpia-screening")
    expect(DPIA_SCHEMA_V1.version).toBe("2026.05.ro.v1")
    expect(DPIA_SCHEMA_V1.questions.length).toBeGreaterThanOrEqual(10)
    expect(DPIA_SCHEMA_V1.legalBasis).toContain("GDPR Art. 35")
    expect(DPIA_SCHEMA_V1.legalBasis).toContain("ANSPDCP Decizia nr. 174/2018")
  })

  it("scenariu de risc scazut: niciun semnal -> riskLevel low, fara finding", () => {
    const ev = evaluateDpiaScreening(
      {
        processName: "Newsletter intern (opt-in)",
        answers: {
          specialCategories: false,
          largeScale: false,
          vulnerableDataSubjects: false,
          systematicMonitoring: false,
          profilingOrScoring: false,
          automatedDecision: false,
          newTechnologyOrAI: false,
          thirdCountryTransfer: false,
          securityMeasures: "complete",
          retentionKnown: "defined",
        },
      },
      NOW,
    )

    expect(ev.riskScore).toBe(0)
    expect(ev.riskLevel).toBe("low")
    expect(ev.requiresFullDpia).toBe(false)
    expect(ev.candidateFinding).toBeUndefined()
    expect(ev.generatedMarkdown).toContain("DPIA Screening")
    expect(ev.generatedMarkdown).toContain("low")
  })

  it("scenariu high risk: AI/HR cu monitorizare + automated decision -> finding GDPR severity high", () => {
    const ev = evaluateDpiaScreening(
      {
        processName: "HR screening AI",
        department: "HR",
        answers: {
          specialCategories: false,
          largeScale: true,
          vulnerableDataSubjects: true,
          profilingOrScoring: true,
          automatedDecision: true,
          newTechnologyOrAI: true,
          thirdCountryTransfer: true,
          securityMeasures: "partial",
          retentionKnown: "unclear",
        },
      },
      NOW,
    )

    expect(ev.requiresFullDpia).toBe(true)
    expect(ev.riskLevel).toMatch(/high|critical/)
    expect(ev.candidateFinding).toBeTruthy()
    expect(ev.candidateFinding?.category).toBe("GDPR")
    expect(ev.candidateFinding?.legalReference).toContain("GDPR Art. 35")
    expect(ev.candidateFinding?.severity).toMatch(/high|critical/)
    expect(ev.candidateFinding?.principles).toContain("privacy_data_governance")
    expect(ev.candidateFinding?.requiresHumanReview).toBe(true)
    expect(ev.generatedMarkdown).toContain("HR screening AI")
  })

  it("scenariu critical: toate semnalele pozitive -> riskLevel critical + finding critic", () => {
    const ev = evaluateDpiaScreening(
      {
        processName: "Profilare medicala completa",
        answers: {
          specialCategories: true,
          largeScale: true,
          vulnerableDataSubjects: true,
          systematicMonitoring: true,
          profilingOrScoring: true,
          automatedDecision: true,
          newTechnologyOrAI: true,
          thirdCountryTransfer: true,
          securityMeasures: "missing",
          retentionKnown: "missing",
        },
      },
      NOW,
    )

    expect(ev.riskScore).toBe(100)
    expect(ev.riskLevel).toBe("critical")
    expect(ev.requiresFullDpia).toBe(true)
    expect(ev.candidateFinding?.severity).toBe("critical")
    expect(ev.missingEvidence.length).toBeGreaterThan(0)
  })

  it("automated decision singura -> requiresFullDpia true chiar daca scor sub 55", () => {
    const ev = evaluateDpiaScreening(
      {
        processName: "Aprobare credit instant",
        answers: {
          specialCategories: false,
          largeScale: false,
          vulnerableDataSubjects: false,
          systematicMonitoring: false,
          profilingOrScoring: false,
          automatedDecision: true,
          newTechnologyOrAI: false,
          thirdCountryTransfer: false,
          securityMeasures: "complete",
          retentionKnown: "defined",
        },
      },
      NOW,
    )

    expect(ev.requiresFullDpia).toBe(true)
    expect(ev.candidateFinding).toBeTruthy()
    expect(ev.candidateFinding?.resolution?.action).toContain("DPIA")
  })

  it("specialCategories + largeScale -> requiresFullDpia true (Art. 35(3)(b))", () => {
    const ev = evaluateDpiaScreening(
      {
        processName: "Registru sanatate pacienti",
        answers: {
          specialCategories: true,
          largeScale: true,
          vulnerableDataSubjects: false,
          systematicMonitoring: false,
          profilingOrScoring: false,
          automatedDecision: false,
          newTechnologyOrAI: false,
          thirdCountryTransfer: false,
          securityMeasures: "complete",
          retentionKnown: "defined",
        },
      },
      NOW,
    )

    expect(ev.requiresFullDpia).toBe(true)
    expect(ev.candidateFinding).toBeTruthy()
  })

  it("genereaza markdown export-ready cu sectiuni semnale/dovezi/recomandari", () => {
    const ev = evaluateDpiaScreening(
      {
        processName: "Chatbot suport",
        ownerName: "Maria DPO",
        department: "Suport",
        answers: { newTechnologyOrAI: true, securityMeasures: "complete", retentionKnown: "defined" },
      },
      NOW,
    )
    expect(ev.generatedMarkdown).toContain("# DPIA Screening")
    expect(ev.generatedMarkdown).toContain("Owner: Maria DPO")
    expect(ev.generatedMarkdown).toContain("Departament: Suport")
    expect(ev.generatedMarkdown).toContain("## Semnale de risc")
    expect(ev.generatedMarkdown).toContain("## Recomandări")
  })
})
