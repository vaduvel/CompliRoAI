import { describe, expect, it } from "vitest"

import {
  QMS_SCHEMA_V1,
  QMS_SECTION_LABELS,
  QMS_DOCUMENT_TYPE_LABELS,
  QMS_WORKSPACE_STATUS_LABELS,
  QMS_COMPLETENESS_LABELS,
  QMS_LESSON_SOURCE_LABELS,
  QMS_SECTION_STATUS_LABELS,
  QMS_ORGANIZATION_SIZE_LABELS,
  getQmsSectionKeysInOrder,
  getQmsSchemaSection,
  getEssentialQmsSections,
  getAdvancedQmsSections,
  getQmsSectionsForCrossModule,
} from "./qms-schema"

describe("QMS schema V1 — structure", () => {
  it("exposes 13 sections in Art. 17(1)(a)-(m) order", () => {
    expect(QMS_SCHEMA_V1.sections).toHaveLength(13)
    const letters = QMS_SCHEMA_V1.sections.map((s) => s.letter)
    expect(letters).toEqual([
      "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m",
    ])
  })

  it("each section has unique key", () => {
    const keys = QMS_SCHEMA_V1.sections.map((s) => s.key)
    expect(new Set(keys).size).toBe(13)
  })

  it("every section has required article reference starting with EU AI Act Art. 17(1)", () => {
    for (const section of QMS_SCHEMA_V1.sections) {
      expect(section.articleRef).toMatch(/^EU AI Act Art\. 17\(1\)\([a-m]\)/)
    }
  })

  it("every section has description, displayLabel, helpText length and required fields", () => {
    for (const section of QMS_SCHEMA_V1.sections) {
      expect(section.displayLabel.length).toBeGreaterThan(5)
      expect(section.description.length).toBeGreaterThan(100)
      expect(section.requiredFields).toContain("description")
      expect(section.requiredFields).toContain("procedureSummary")
      expect(section.requiredFields).toContain("responsibleRole")
      expect(section.requiredFields).toContain("documentReferences")
      expect(section.suggestedDocuments.length).toBeGreaterThan(0)
    }
  })

  it("tier classification is either essential or advanced", () => {
    for (const section of QMS_SCHEMA_V1.sections) {
      expect(["essential", "advanced"]).toContain(section.tier)
    }
  })

  it("legalBasis mentions Art. 17(1), 17(2), 17(3), Art. 9, Art. 72, Art. 73", () => {
    const joined = QMS_SCHEMA_V1.legalBasis.join("\n")
    expect(joined).toContain("Art. 17(1)")
    expect(joined).toContain("Art. 17(2)")
    expect(joined).toContain("Art. 17(3)")
    expect(joined).toContain("Art. 9")
    expect(joined).toContain("Art. 72")
    expect(joined).toContain("Art. 73")
  })
})

describe("QMS schema V1 — cross-module mapping per mandate", () => {
  it("section (f) data management links to ropa + ai_data_map", () => {
    const f = getQmsSchemaSection("f_data_management_systems")
    expect(f).toBeDefined()
    expect(f?.crossModuleLinks).toContain("ropa")
    expect(f?.crossModuleLinks).toContain("ai_data_map")
  })

  it("section (g) risk management links to dpia + fria + findings", () => {
    const g = getQmsSchemaSection("g_risk_management_system")
    expect(g).toBeDefined()
    expect(g?.crossModuleLinks).toContain("dpia")
    expect(g?.crossModuleLinks).toContain("fria")
    expect(g?.crossModuleLinks).toContain("findings")
  })

  it("section (h) PMM links to pmm", () => {
    const h = getQmsSchemaSection("h_post_market_monitoring")
    expect(h?.crossModuleLinks).toContain("pmm")
  })

  it("section (i) incident reporting links to ai_incidents", () => {
    const i = getQmsSchemaSection("i_serious_incident_reporting")
    expect(i?.crossModuleLinks).toContain("ai_incidents")
  })

  it("section (k) record-keeping links to logging_evidence", () => {
    const k = getQmsSchemaSection("k_record_keeping")
    expect(k?.crossModuleLinks).toContain("logging_evidence")
  })

  it("getQmsSectionsForCrossModule returns matching sections for each module", () => {
    expect(getQmsSectionsForCrossModule("ropa").map((s) => s.key)).toEqual([
      "f_data_management_systems",
    ])
    expect(getQmsSectionsForCrossModule("fria").map((s) => s.key)).toEqual([
      "g_risk_management_system",
    ])
    expect(getQmsSectionsForCrossModule("ai_incidents").map((s) => s.key)).toEqual([
      "i_serious_incident_reporting",
    ])
  })
})

describe("QMS schema V1 — SME simplified mode (Art. 17(3))", () => {
  it("essential sections include the 8 mandatory for any organization", () => {
    const essentialKeys = getEssentialQmsSections().map((s) => s.key)
    // Per mandate: essentials = (a) strategy, (b) design, (d) test, (f) data,
    // (g) risk, (h) PMM, (i) incidents, (k) record-keeping, (m) accountability
    expect(essentialKeys).toContain("a_regulatory_compliance_strategy")
    expect(essentialKeys).toContain("b_design_control_verification")
    expect(essentialKeys).toContain("d_examination_test_validation")
    expect(essentialKeys).toContain("f_data_management_systems")
    expect(essentialKeys).toContain("g_risk_management_system")
    expect(essentialKeys).toContain("h_post_market_monitoring")
    expect(essentialKeys).toContain("i_serious_incident_reporting")
    expect(essentialKeys).toContain("k_record_keeping")
    expect(essentialKeys).toContain("m_accountability_framework")
  })

  it("advanced sections include (c) QA, (e) standards, (j) communication, (l) resources", () => {
    const advancedKeys = getAdvancedQmsSections().map((s) => s.key)
    expect(advancedKeys).toContain("c_development_quality_assurance")
    expect(advancedKeys).toContain("e_technical_specifications_standards")
    expect(advancedKeys).toContain("j_communication_with_authorities")
    expect(advancedKeys).toContain("l_resource_management_security")
  })

  it("essentials + advanced = 13 sections total", () => {
    const total =
      getEssentialQmsSections().length + getAdvancedQmsSections().length
    expect(total).toBe(13)
  })
})

describe("QMS labels — RO complete", () => {
  it("QMS_SECTION_LABELS has all 13 keys", () => {
    const keys = getQmsSectionKeysInOrder()
    for (const k of keys) {
      expect(QMS_SECTION_LABELS[k]).toBeDefined()
      expect(QMS_SECTION_LABELS[k].length).toBeGreaterThan(5)
      // RO: starts cu litera (X)
      expect(QMS_SECTION_LABELS[k]).toMatch(/^\([a-m]\)/)
    }
  })

  it("QMS_SECTION_STATUS_LABELS covers all 5 statuses RO", () => {
    expect(QMS_SECTION_STATUS_LABELS.not_started).toBe("Neînceput")
    expect(QMS_SECTION_STATUS_LABELS.in_progress).toBe("În lucru")
    expect(QMS_SECTION_STATUS_LABELS.documented).toBe("Documentat")
    expect(QMS_SECTION_STATUS_LABELS.approved).toBe("Aprobat")
    expect(QMS_SECTION_STATUS_LABELS.needs_update).toBe("Necesită update")
  })

  it("QMS_DOCUMENT_TYPE_LABELS covers all 8 doc types RO", () => {
    expect(QMS_DOCUMENT_TYPE_LABELS.policy).toBe("Politică")
    expect(QMS_DOCUMENT_TYPE_LABELS.procedure).toBe("Procedură")
    expect(QMS_DOCUMENT_TYPE_LABELS.standard).toBe("Standard")
    expect(QMS_DOCUMENT_TYPE_LABELS.specification).toBe("Specificație tehnică")
    expect(QMS_DOCUMENT_TYPE_LABELS.template).toBe("Șablon")
    expect(QMS_DOCUMENT_TYPE_LABELS.report).toBe("Raport")
    expect(QMS_DOCUMENT_TYPE_LABELS.audit_record).toBe("Înregistrare audit")
    expect(QMS_DOCUMENT_TYPE_LABELS.other).toBe("Altul")
  })

  it("QMS_WORKSPACE_STATUS_LABELS RO", () => {
    expect(QMS_WORKSPACE_STATUS_LABELS.draft).toBe("Schiță")
    expect(QMS_WORKSPACE_STATUS_LABELS.approved).toBe("Aprobat")
  })

  it("QMS_COMPLETENESS_LABELS RO", () => {
    expect(QMS_COMPLETENESS_LABELS.incomplete).toBe("Incomplet")
    expect(QMS_COMPLETENESS_LABELS.complete).toBe("Complet")
  })

  it("QMS_LESSON_SOURCE_LABELS RO mentions Art. 73 + Art. 72", () => {
    expect(QMS_LESSON_SOURCE_LABELS.ai_incident).toContain("Art. 73")
    expect(QMS_LESSON_SOURCE_LABELS.pmm_anomaly).toContain("Art. 72")
  })

  it("QMS_ORGANIZATION_SIZE_LABELS mentions Art. 17(3) for sme", () => {
    expect(QMS_ORGANIZATION_SIZE_LABELS.sme).toContain("Art. 17(3)")
  })
})

describe("QMS schema V1 — helpers", () => {
  it("getQmsSectionKeysInOrder returns 13 keys in (a)-(m) order", () => {
    const keys = getQmsSectionKeysInOrder()
    expect(keys).toHaveLength(13)
    expect(keys[0]).toBe("a_regulatory_compliance_strategy")
    expect(keys[12]).toBe("m_accountability_framework")
  })

  it("getQmsSchemaSection returns undefined for unknown key", () => {
    // @ts-expect-error invalid
    expect(getQmsSchemaSection("x_invalid")).toBeUndefined()
  })

  it("getQmsSchemaSection returns matching section", () => {
    const s = getQmsSchemaSection("a_regulatory_compliance_strategy")
    expect(s?.letter).toBe("a")
    expect(s?.displayLabel).toMatch(/[Ss]trategie/)
  })
})
