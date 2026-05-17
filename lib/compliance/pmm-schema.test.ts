import { describe, expect, it } from "vitest"

import {
  PMM_DATA_COLLECTION_FREQUENCY_LABELS,
  PMM_DATA_COLLECTION_FREQUENCY_OPTIONS,
  PMM_DATA_COLLECTION_METHOD_HELP,
  PMM_DATA_COLLECTION_METHOD_LABELS,
  PMM_DATA_COLLECTION_METHOD_OPTIONS,
  PMM_REVIEW_CYCLE_LABELS,
  PMM_REVIEW_CYCLE_MONTHS,
  PMM_REVIEW_CYCLE_OPTIONS,
  PMM_SCHEMA_V1,
  getPmmSchemaSectionOrder,
} from "@/lib/compliance/pmm-schema"

describe("PMM schema V1 (Art. 72)", () => {
  it("expune 5 secțiuni A-E în ordinea cerută", () => {
    expect(getPmmSchemaSectionOrder()).toEqual(["A", "B", "C", "D", "E"])
    expect(PMM_SCHEMA_V1.sections).toHaveLength(5)
  })

  it("conține referință explicită la Art. 72(3) în legalBasis", () => {
    const concat = PMM_SCHEMA_V1.legalBasis.join("\n")
    expect(concat).toContain("Art. 72(1)")
    expect(concat).toContain("Art. 72(2)")
    expect(concat).toContain("Art. 72(3)")
    expect(concat).toContain("Art. 72(4)")
    expect(concat).toContain("Art. 26(4)")
    expect(concat).toContain("Art. 43(4)")
    expect(concat).toContain("Annex IV")
  })

  it("secțiunea B (data collection) are întrebări obligatorii cu referință Art. 72(3)(a)", () => {
    const sectionB = PMM_SCHEMA_V1.sections.find((s) => s.id === "B")
    expect(sectionB).toBeDefined()
    const methods = sectionB!.questions.find((q) => q.id === "dataCollectionMethods")
    expect(methods).toBeDefined()
    expect(methods!.required).toBe(true)
    expect(methods!.type).toBe("multiselect")
    expect(methods!.legalReference).toContain("Art. 72(3)(a)")
    const freq = sectionB!.questions.find((q) => q.id === "dataCollectionFrequency")
    expect(freq).toBeDefined()
    expect(freq!.required).toBe(true)
  })

  it("secțiunea C (compliance evaluation) cere methods + metrics ca string_list", () => {
    const sectionC = PMM_SCHEMA_V1.sections.find((s) => s.id === "C")
    expect(sectionC).toBeDefined()
    const methods = sectionC!.questions.find((q) => q.id === "complianceEvaluationMethods")
    const metrics = sectionC!.questions.find((q) => q.id === "complianceMetricsTracked")
    expect(methods?.type).toBe("string_list")
    expect(metrics?.type).toBe("string_list")
    expect(methods?.required).toBe(true)
    expect(metrics?.required).toBe(true)
    expect(methods?.legalReference).toContain("Art. 72(3)(b)")
  })

  it("secțiunea D (corrective + preventive action) cere ambele procese narative", () => {
    const sectionD = PMM_SCHEMA_V1.sections.find((s) => s.id === "D")
    expect(sectionD).toBeDefined()
    const corrective = sectionD!.questions.find((q) => q.id === "correctiveActionProcess")
    const preventive = sectionD!.questions.find((q) => q.id === "preventiveActionProcess")
    expect(corrective?.required).toBe(true)
    expect(preventive?.required).toBe(true)
    expect(corrective?.legalReference).toContain("Art. 72(3)(c)")
    expect(preventive?.legalReference).toContain("Art. 72(3)(c)")
  })

  it("PMM_REVIEW_CYCLE_MONTHS reflectă mapping-ul corect 1/3/6/12", () => {
    expect(PMM_REVIEW_CYCLE_MONTHS.monthly).toBe(1)
    expect(PMM_REVIEW_CYCLE_MONTHS.quarterly).toBe(3)
    expect(PMM_REVIEW_CYCLE_MONTHS.biannual).toBe(6)
    expect(PMM_REVIEW_CYCLE_MONTHS.annual).toBe(12)
  })

  it("toate review cycle options au labels + months", () => {
    for (const cycle of PMM_REVIEW_CYCLE_OPTIONS) {
      expect(PMM_REVIEW_CYCLE_LABELS[cycle]).toBeDefined()
      expect(PMM_REVIEW_CYCLE_MONTHS[cycle]).toBeGreaterThan(0)
    }
  })

  it("toate cele 9 metode data collection au label + help", () => {
    expect(PMM_DATA_COLLECTION_METHOD_OPTIONS).toHaveLength(9)
    for (const method of PMM_DATA_COLLECTION_METHOD_OPTIONS) {
      expect(PMM_DATA_COLLECTION_METHOD_LABELS[method]).toBeDefined()
      expect(PMM_DATA_COLLECTION_METHOD_HELP[method].length).toBeGreaterThan(20)
    }
  })

  it("toate cele 5 frequency options au labels", () => {
    expect(PMM_DATA_COLLECTION_FREQUENCY_OPTIONS).toHaveLength(5)
    for (const freq of PMM_DATA_COLLECTION_FREQUENCY_OPTIONS) {
      expect(PMM_DATA_COLLECTION_FREQUENCY_LABELS[freq]).toBeDefined()
    }
  })

  it("annual cycle labels semnalează că NU îndeplinește Art. 72 pentru high-risk", () => {
    expect(PMM_REVIEW_CYCLE_LABELS.annual.toLowerCase()).toContain("nu")
  })
})
