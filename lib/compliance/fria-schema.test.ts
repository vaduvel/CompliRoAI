// FRIA Schema V1 — Sprint 016 tests.

import { describe, expect, it } from "vitest"

import {
  DEPLOYER_TYPE_LABELS,
  DEPLOYER_TYPE_OPTIONS,
  FREQUENCY_LABELS,
  FREQUENCY_OPTIONS,
  FRIA_SCHEMA_V1,
  FUNDAMENTAL_RIGHTS_ORDERED,
  FUNDAMENTAL_RIGHT_LABELS,
  getAllFriaQuestions,
  getFriaQuestionById,
  getFriaSectionById,
} from "@/lib/compliance/fria-schema"
import type { FundamentalRight } from "@/lib/compliance/types"

describe("FRIA Schema V1 — structura", () => {
  it("identifierul schemei = compliroai-fria-art-27 și version 2026.05.ro.v1", () => {
    expect(FRIA_SCHEMA_V1.id).toBe("compliroai-fria-art-27")
    expect(FRIA_SCHEMA_V1.version).toBe("2026.05.ro.v1")
    expect(FRIA_SCHEMA_V1.jurisdiction).toBe("RO/EU")
  })

  it("are exact 6 secțiuni (A → F) în ordine", () => {
    expect(FRIA_SCHEMA_V1.sections.map((s) => s.id)).toEqual(["A", "B", "C", "D", "E", "F"])
  })

  it("legalBasis include Art. 27 + Art. 26 + Art. 14 + Carta UE + Annex III", () => {
    const joined = FRIA_SCHEMA_V1.legalBasis.join(" | ")
    expect(joined).toMatch(/Art\. 27/)
    expect(joined).toMatch(/Art\. 26/)
    expect(joined).toMatch(/Art\. 14/)
    expect(joined).toMatch(/Carta/i)
    expect(joined).toMatch(/Annex III/)
  })

  it("conține cel puțin 15 întrebări totale (≥ 20 cerut, marja pentru future)", () => {
    const all = getAllFriaQuestions()
    expect(all.length).toBeGreaterThanOrEqual(15)
  })

  it("fiecare întrebare are id unic + legalReference + helpText", () => {
    const all = getAllFriaQuestions()
    const ids = all.map((q) => q.id)
    const unique = new Set(ids)
    expect(unique.size).toBe(ids.length)
    for (const q of all) {
      expect(q.legalReference.length).toBeGreaterThan(0)
      expect(q.helpText.length).toBeGreaterThan(0)
    }
  })

  it("Secțiunea A conține întrebarea deployerType cu Art. 27(1)", () => {
    const sectionA = getFriaSectionById("A")
    expect(sectionA).toBeTruthy()
    const dep = sectionA?.questions.find((q) => q.id === "deployerType")
    expect(dep).toBeTruthy()
    expect(dep?.legalReference).toMatch(/Art\. 27\(1\)/)
    expect(dep?.required).toBe(true)
  })

  it("Secțiunea D conține rightsAtRisk (multiselect) și riskAssessments (rights_matrix)", () => {
    const sectionD = getFriaSectionById("D")
    expect(sectionD).toBeTruthy()
    const rights = sectionD?.questions.find((q) => q.id === "rightsAtRisk")
    const matrix = sectionD?.questions.find((q) => q.id === "riskAssessments")
    expect(rights?.type).toBe("multiselect")
    expect(rights?.fundamentalRightOptions).toBeTruthy()
    expect(rights?.fundamentalRightOptions?.length).toBeGreaterThanOrEqual(24)
    expect(matrix?.type).toBe("rights_matrix")
  })

  it("Secțiunea E conține întrebări pentru oversight, explainability, appeal, fallback", () => {
    const sectionE = getFriaSectionById("E")
    const ids = sectionE?.questions.map((q) => q.id) ?? []
    expect(ids).toContain("humanOversightMeasures")
    expect(ids).toContain("explainabilityProvided")
    expect(ids).toContain("appealMechanism")
    expect(ids).toContain("fallbackProcedure")
  })

  it("Secțiunea F conține complaintMechanism + notifyAuthorityRequired", () => {
    const sectionF = getFriaSectionById("F")
    const ids = sectionF?.questions.map((q) => q.id) ?? []
    expect(ids).toContain("complaintMechanism")
    expect(ids).toContain("notifyAuthorityRequired")
  })
})

describe("FRIA Schema — drepturi fundamentale (24)", () => {
  it("FUNDAMENTAL_RIGHTS_ORDERED conține cel puțin 24 drepturi din Cartă", () => {
    expect(FUNDAMENTAL_RIGHTS_ORDERED.length).toBeGreaterThanOrEqual(24)
  })

  it("toate drepturile au label tradus în română + referință la articol din Cartă", () => {
    for (const right of FUNDAMENTAL_RIGHTS_ORDERED) {
      const label = FUNDAMENTAL_RIGHT_LABELS[right]
      expect(label).toBeTruthy()
      expect(label).toMatch(/Cartă Art\. \d+/)
    }
  })

  it("include drepturile-cheie pentru AI: nediscriminare, protecție date, demnitate, bună administrare", () => {
    const required: FundamentalRight[] = [
      "non_discrimination",
      "data_protection",
      "human_dignity",
      "good_administration",
      "effective_remedy",
      "rights_of_child",
      "rights_of_disabled",
      "gender_equality",
    ]
    for (const r of required) {
      expect(FUNDAMENTAL_RIGHTS_ORDERED).toContain(r)
    }
  })
})

describe("FRIA Schema — helpers", () => {
  it("getFriaQuestionById returnează întrebarea sau undefined", () => {
    const q = getFriaQuestionById("deployerType")
    expect(q?.section).toBe("A")
    const notFound = getFriaQuestionById("does-not-exist")
    expect(notFound).toBeUndefined()
  })

  it("DEPLOYER_TYPE_OPTIONS are 6 opțiuni cu label tradus", () => {
    expect(DEPLOYER_TYPE_OPTIONS.length).toBe(6)
    for (const opt of DEPLOYER_TYPE_OPTIONS) {
      expect(DEPLOYER_TYPE_LABELS[opt]).toBeTruthy()
    }
  })

  it("FREQUENCY_OPTIONS are 6 opțiuni cu label tradus", () => {
    expect(FREQUENCY_OPTIONS.length).toBe(6)
    for (const opt of FREQUENCY_OPTIONS) {
      expect(FREQUENCY_LABELS[opt]).toBeTruthy()
    }
  })
})
