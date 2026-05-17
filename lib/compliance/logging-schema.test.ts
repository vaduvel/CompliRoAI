// Sprint 018 — logging-schema tests (V1, Art. 12 + Art. 26(6)).

import { describe, expect, it } from "vitest"
import {
  DEFAULT_MIN_RETENTION_MONTHS_BY_SEVERITY,
  LOGGING_EVENT_CATEGORIES_ORDERED,
  LOGGING_EVENT_CATEGORY_HELP,
  LOGGING_EVENT_CATEGORY_LABELS,
  LOGGING_INTEGRITY_MECHANISM_OPTIONS,
  LOGGING_SCHEMA_V1,
  LOGGING_SEVERITY_LEVEL_LABELS,
  LOGGING_SEVERITY_LEVEL_OPTIONS,
  LOGGING_STORAGE_BACKEND_LABELS,
  LOGGING_STORAGE_BACKEND_OPTIONS,
  getAllLoggingQuestions,
  getLoggingQuestionById,
  getLoggingSectionById,
} from "@/lib/compliance/logging-schema"

describe("logging-schema — structura V1", () => {
  it("expune 4 secțiuni A-D în ordinea cerută", () => {
    expect(LOGGING_SCHEMA_V1.sections.map((s) => s.id)).toEqual(["A", "B", "C", "D"])
  })

  it("are version + jurisdiction + minim 4 referințe legale incluzând Art. 12 + 26(6)", () => {
    expect(LOGGING_SCHEMA_V1.version).toBe("2026.05.ro.v1")
    expect(LOGGING_SCHEMA_V1.jurisdiction).toBe("RO/EU")
    expect(LOGGING_SCHEMA_V1.legalBasis.length).toBeGreaterThanOrEqual(4)
    expect(LOGGING_SCHEMA_V1.legalBasis.join("\n")).toMatch(/Art\. 12/)
    expect(LOGGING_SCHEMA_V1.legalBasis.join("\n")).toMatch(/Art\. 26\(6\)/)
    expect(LOGGING_SCHEMA_V1.legalBasis.join("\n")).toMatch(/Art\. 12\(3\)/)
  })

  it("toate întrebările au id + label + helpText + legalReference + type", () => {
    for (const section of LOGGING_SCHEMA_V1.sections) {
      for (const q of section.questions) {
        expect(q.id).toBeTruthy()
        expect(q.label).toBeTruthy()
        expect(q.helpText.length).toBeGreaterThan(20)
        expect(q.legalReference).toMatch(/AI Act|GDPR|ISO/)
        expect(q.type).toBeTruthy()
      }
    }
  })

  it("secțiunea A leagă title + linkedAISystemId + severityLevel", () => {
    const a = getLoggingSectionById("A")
    expect(a?.questions.map((q) => q.id)).toEqual([
      "title",
      "linkedAISystemId",
      "severityLevel",
    ])
  })

  it("secțiunea B cere multiselect pe 13 categorii Art. 12(2)/(3) + biometric_specifics condițional", () => {
    const b = getLoggingSectionById("B")
    expect(b).toBeTruthy()
    const cats = b!.questions.find((q) => q.id === "eventCategoriesLogged")
    expect(cats?.type).toBe("multiselect")
    expect(cats?.eventCategoryOptions).toEqual(LOGGING_EVENT_CATEGORIES_ORDERED)
    expect(cats?.eventCategoryOptions?.length).toBe(13)
    const bio = b!.questions.find((q) => q.id === "biometricSpecific")
    expect(bio?.type).toBe("biometric_specifics")
    expect(bio?.legalReference).toMatch(/12\(3\)/)
  })

  it("secțiunea C cere min + actual retention + retentionPolicy + storage backend/location", () => {
    const c = getLoggingSectionById("C")
    expect(c?.questions.map((q) => q.id)).toEqual([
      "storageBackend",
      "storageLocation",
      "minRetentionMonths",
      "actualRetentionMonths",
      "retentionPolicy",
    ])
    const min = c!.questions.find((q) => q.id === "minRetentionMonths")
    expect(min?.legalReference).toMatch(/26\(6\)/)
  })

  it("secțiunea D cere mecanism integritate + access role + access logged", () => {
    const d = getLoggingSectionById("D")
    const ids = d!.questions.map((q) => q.id)
    expect(ids).toContain("integrityMechanism")
    expect(ids).toContain("accessRoleDescription")
    expect(ids).toContain("accessLogged")
    const integ = d!.questions.find((q) => q.id === "integrityMechanism")
    expect(integ?.options).toEqual([...LOGGING_INTEGRITY_MECHANISM_OPTIONS])
  })

  it("getLoggingQuestionById regăsește întrebarea corect", () => {
    const q = getLoggingQuestionById("eventCategoriesLogged")
    expect(q?.section).toBe("B")
    expect(getLoggingQuestionById("inexistent")).toBeUndefined()
  })

  it("getAllLoggingQuestions returnează setul plat (minim 10 întrebări)", () => {
    const flat = getAllLoggingQuestions()
    expect(flat.length).toBeGreaterThanOrEqual(10)
    expect(flat.find((q) => q.id === "title")).toBeTruthy()
    expect(flat.find((q) => q.id === "integrityMechanism")).toBeTruthy()
  })
})

describe("logging-schema — etichete + paritate completă", () => {
  it("LOGGING_SEVERITY_LEVEL_LABELS acoperă toate opțiunile", () => {
    for (const lvl of LOGGING_SEVERITY_LEVEL_OPTIONS) {
      expect(LOGGING_SEVERITY_LEVEL_LABELS[lvl]).toBeTruthy()
    }
    expect(LOGGING_SEVERITY_LEVEL_OPTIONS.length).toBe(4)
  })

  it("LOGGING_STORAGE_BACKEND_LABELS acoperă cele 9 backend-uri", () => {
    expect(LOGGING_STORAGE_BACKEND_OPTIONS.length).toBe(9)
    for (const b of LOGGING_STORAGE_BACKEND_OPTIONS) {
      expect(LOGGING_STORAGE_BACKEND_LABELS[b]).toBeTruthy()
    }
  })

  it("LOGGING_EVENT_CATEGORY_LABELS + HELP acoperă toate categoriile", () => {
    for (const c of LOGGING_EVENT_CATEGORIES_ORDERED) {
      expect(LOGGING_EVENT_CATEGORY_LABELS[c]).toBeTruthy()
      expect(LOGGING_EVENT_CATEGORY_HELP[c].length).toBeGreaterThan(40)
    }
  })

  it("severityLevel biometric_full este descris cu Art. 12(3)", () => {
    expect(LOGGING_SEVERITY_LEVEL_LABELS.biometric_full).toMatch(/12\(3\)/)
  })

  it("DEFAULT_MIN_RETENTION_MONTHS_BY_SEVERITY respectă Art. 26(6) (>=6) pentru standard/enhanced/biometric_full", () => {
    expect(DEFAULT_MIN_RETENTION_MONTHS_BY_SEVERITY.standard).toBeGreaterThanOrEqual(6)
    expect(DEFAULT_MIN_RETENTION_MONTHS_BY_SEVERITY.enhanced).toBeGreaterThanOrEqual(6)
    expect(DEFAULT_MIN_RETENTION_MONTHS_BY_SEVERITY.biometric_full).toBeGreaterThanOrEqual(6)
    expect(DEFAULT_MIN_RETENTION_MONTHS_BY_SEVERITY.biometric_full).toBeGreaterThanOrEqual(12)
  })

  it("categoriile biometric_match_* sunt în setul ordonat (Art. 12(3))", () => {
    expect(LOGGING_EVENT_CATEGORIES_ORDERED).toContain("biometric_match_attempt")
    expect(LOGGING_EVENT_CATEGORIES_ORDERED).toContain("biometric_match_result")
    expect(LOGGING_EVENT_CATEGORY_LABELS.biometric_match_attempt).toMatch(/12\(3\)/)
    expect(LOGGING_EVENT_CATEGORY_LABELS.biometric_match_result).toMatch(/12\(3\)/)
  })
})
