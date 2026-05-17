// Sprint 017 — oversight-schema tests (V1, Art. 14).

import { describe, expect, it } from "vitest"
import {
  COMPETENCE_LEVEL_OPTIONS,
  FALLBACK_MODE_OPTIONS,
  NOTIFICATION_METHOD_OPTIONS,
  OVERSIGHT_CAPABILITIES_ORDERED,
  OVERSIGHT_CAPABILITY_HELP,
  OVERSIGHT_CAPABILITY_LABELS,
  OVERSIGHT_MODEL_LABELS,
  OVERSIGHT_MODEL_OPTIONS,
  OVERSIGHT_SCHEMA_V1,
  TEST_FREQUENCY_OPTIONS,
  getAllOversightQuestions,
  getOversightQuestionById,
  getOversightSectionById,
} from "@/lib/compliance/oversight-schema"

describe("oversight-schema — structura V1", () => {
  it("expune 5 secțiuni A-E in ordinea cerută", () => {
    expect(OVERSIGHT_SCHEMA_V1.sections.map((s) => s.id)).toEqual([
      "A",
      "B",
      "C",
      "D",
      "E",
    ])
  })

  it("are version + jurisdiction + minim 4 referințe legale", () => {
    expect(OVERSIGHT_SCHEMA_V1.version).toBe("2026.05.ro.v1")
    expect(OVERSIGHT_SCHEMA_V1.jurisdiction).toBe("RO/EU")
    expect(OVERSIGHT_SCHEMA_V1.legalBasis.length).toBeGreaterThanOrEqual(4)
    expect(OVERSIGHT_SCHEMA_V1.legalBasis.join("\n")).toMatch(/Art\. 14/)
  })

  it("toate întrebările au id + label + helpText + legalReference + type", () => {
    for (const section of OVERSIGHT_SCHEMA_V1.sections) {
      for (const q of section.questions) {
        expect(q.id).toBeTruthy()
        expect(q.label).toBeTruthy()
        expect(q.helpText.length).toBeGreaterThan(20)
        expect(q.legalReference).toMatch(/AI Act|GDPR/)
        expect(q.type).toBeTruthy()
      }
    }
  })

  it("secțiunea B cere multiselect pe cele 5 capacități Art. 14(3)", () => {
    const sectionB = getOversightSectionById("B")
    expect(sectionB).toBeTruthy()
    const q = sectionB!.questions.find((q) => q.id === "capabilitiesCovered")
    expect(q?.type).toBe("multiselect")
    expect(q?.capabilityOptions).toEqual(OVERSIGHT_CAPABILITIES_ORDERED)
    expect(q?.capabilityOptions?.length).toBe(5)
  })

  it("secțiunea A leagă oversightModel + linkedAISystemId + title", () => {
    const sectionA = getOversightSectionById("A")
    expect(sectionA?.questions.map((q) => q.id)).toEqual([
      "title",
      "linkedAISystemId",
      "oversightModel",
    ])
  })

  it("secțiunea E include stopProcedure (Art. 14(3)(e) + 14(4)(d))", () => {
    const sectionE = getOversightSectionById("E")
    const stopQ = sectionE!.questions.find((q) => q.id === "stopProcedure")
    expect(stopQ?.legalReference).toMatch(/14\(3\)\(e\)|14\(4\)\(d\)/)
  })

  it("getOversightQuestionById regăsește întrebarea corect", () => {
    const q = getOversightQuestionById("capabilitiesCovered")
    expect(q?.section).toBe("B")
    expect(getOversightQuestionById("inexistent")).toBeUndefined()
  })

  it("getAllOversightQuestions returnează tot setul plat", () => {
    const flat = getAllOversightQuestions()
    expect(flat.length).toBeGreaterThanOrEqual(8)
    expect(flat.find((q) => q.id === "title")).toBeTruthy()
    expect(flat.find((q) => q.id === "stopProcedure")).toBeTruthy()
  })
})

describe("oversight-schema — etichete cu paritate completă", () => {
  it("OVERSIGHT_MODEL_LABELS acoperă toate optiunile", () => {
    for (const m of OVERSIGHT_MODEL_OPTIONS) {
      expect(OVERSIGHT_MODEL_LABELS[m]).toBeTruthy()
    }
  })

  it("OVERSIGHT_CAPABILITY_LABELS + HELP acoperă cele 5 capacități", () => {
    for (const c of OVERSIGHT_CAPABILITIES_ORDERED) {
      expect(OVERSIGHT_CAPABILITY_LABELS[c]).toMatch(/\([a-e]\)/)
      expect(OVERSIGHT_CAPABILITY_HELP[c].length).toBeGreaterThan(40)
    }
  })

  it("FALLBACK_MODE_OPTIONS + TEST_FREQUENCY + COMPETENCE + NOTIFICATION sunt definite", () => {
    expect(FALLBACK_MODE_OPTIONS.length).toBe(5)
    expect(TEST_FREQUENCY_OPTIONS.length).toBe(4)
    expect(COMPETENCE_LEVEL_OPTIONS.length).toBe(3)
    expect(NOTIFICATION_METHOD_OPTIONS.length).toBe(5)
  })

  it("modelul two_person_rule are descriere care menționează Art. 14(4)", () => {
    expect(OVERSIGHT_MODEL_LABELS.two_person_rule).toMatch(/14\(4\)/)
  })
})
