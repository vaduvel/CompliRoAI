import { describe, expect, it } from "vitest"

import {
  AI_INCIDENT_CATEGORY_DEADLINE_DAYS,
  AI_INCIDENT_CATEGORY_LABELS,
  AI_INCIDENT_CATEGORY_OPTIONS,
  AI_INCIDENT_SCHEMA_V1,
  AI_INCIDENT_SEVERITY_LABELS,
  AI_INCIDENT_SEVERITY_OPTIONS,
  AI_INCIDENT_STATUS_LABELS,
  AI_INCIDENT_STATUS_OPTIONS,
  getAIIncidentSchemaSectionOrder,
} from "./ai-incident-schema"

describe("ai-incident-schema — structure", () => {
  it("schema id + version + jurisdiction stable", () => {
    expect(AI_INCIDENT_SCHEMA_V1.id).toBe("compliroai-ai-incident-art-73")
    expect(AI_INCIDENT_SCHEMA_V1.version).toBe("2026.05.ro.v1")
    expect(AI_INCIDENT_SCHEMA_V1.jurisdiction).toBe("RO/EU")
  })

  it("legalBasis cites Art. 73 + Art. 26(5) + Art. 3(49) + Art. 99", () => {
    const joined = AI_INCIDENT_SCHEMA_V1.legalBasis.join(" | ")
    expect(joined).toContain("Art. 73(1)")
    expect(joined).toContain("Art. 73(2)")
    expect(joined).toContain("Art. 73(3)")
    expect(joined).toContain("Art. 73(4)")
    expect(joined).toContain("Art. 73(5)")
    expect(joined).toContain("Art. 26(5)")
    expect(joined).toContain("Art. 3(49)")
    expect(joined).toContain("Art. 99")
  })

  it("exactly 5 sections A-E in order", () => {
    expect(AI_INCIDENT_SCHEMA_V1.sections).toHaveLength(5)
    expect(getAIIncidentSchemaSectionOrder()).toEqual(["A", "B", "C", "D", "E"])
  })

  it("every section has at least 1 question + non-empty title + description", () => {
    for (const section of AI_INCIDENT_SCHEMA_V1.sections) {
      expect(section.questions.length).toBeGreaterThanOrEqual(1)
      expect(section.title.length).toBeGreaterThan(0)
      expect(section.description.length).toBeGreaterThan(0)
    }
  })

  it("every question has legalReference + helpText", () => {
    for (const section of AI_INCIDENT_SCHEMA_V1.sections) {
      for (const q of section.questions) {
        expect(q.legalReference).toMatch(/Art\.|GDPR/)
        expect(q.helpText.length).toBeGreaterThan(20)
      }
    }
  })

  it("section A has title + linkedAISystemId + description (required)", () => {
    const a = AI_INCIDENT_SCHEMA_V1.sections.find((s) => s.id === "A")!
    const ids = a.questions.map((q) => q.id)
    expect(ids).toContain("title")
    expect(ids).toContain("linkedAISystemId")
    expect(ids).toContain("description")
    const titleQ = a.questions.find((q) => q.id === "title")!
    expect(titleQ.required).toBe(true)
  })

  it("section B has category + severity (both required)", () => {
    const b = AI_INCIDENT_SCHEMA_V1.sections.find((s) => s.id === "B")!
    const ids = b.questions.map((q) => q.id)
    expect(ids).toContain("category")
    expect(ids).toContain("severity")
    for (const q of b.questions) expect(q.required).toBe(true)
  })

  it("section C has detectedAtISO required (clock start Art. 73(3))", () => {
    const c = AI_INCIDENT_SCHEMA_V1.sections.find((s) => s.id === "C")!
    const detected = c.questions.find((q) => q.id === "detectedAtISO")!
    expect(detected).toBeDefined()
    expect(detected.required).toBe(true)
    expect(detected.legalReference).toContain("Art. 73(3)")
  })

  it("section D contains notificationRequired boolean (default decision point)", () => {
    const d = AI_INCIDENT_SCHEMA_V1.sections.find((s) => s.id === "D")!
    const nr = d.questions.find((q) => q.id === "notificationRequired")!
    expect(nr).toBeDefined()
    expect(nr.type).toBe("boolean")
    expect(nr.required).toBe(true)
  })

  it("section E has linkedBreachId + linkedPmmAnomalyId for bidirectional linkage", () => {
    const e = AI_INCIDENT_SCHEMA_V1.sections.find((s) => s.id === "E")!
    const ids = e.questions.map((q) => q.id)
    expect(ids).toContain("linkedBreachId")
    expect(ids).toContain("linkedPmmAnomalyId")
    expect(ids).toContain("assignedToEmail")
  })
})

describe("ai-incident-schema — categories + deadlines", () => {
  it("exposes 6 categories Art. 73(2)", () => {
    expect(AI_INCIDENT_CATEGORY_OPTIONS).toHaveLength(6)
    expect(AI_INCIDENT_CATEGORY_OPTIONS).toContain("death_or_serious_harm_health")
    expect(AI_INCIDENT_CATEGORY_OPTIONS).toContain(
      "critical_infrastructure_disruption",
    )
    expect(AI_INCIDENT_CATEGORY_OPTIONS).toContain("widespread_infringement")
    expect(AI_INCIDENT_CATEGORY_OPTIONS).toContain(
      "fundamental_rights_infringement",
    )
    expect(AI_INCIDENT_CATEGORY_OPTIONS).toContain("property_or_environment_harm")
    expect(AI_INCIDENT_CATEGORY_OPTIONS).toContain("other_serious")
  })

  it("death + critical infrastructure → 2-day deadline (Art. 73(3) a/b)", () => {
    expect(
      AI_INCIDENT_CATEGORY_DEADLINE_DAYS["death_or_serious_harm_health"],
    ).toBe(2)
    expect(
      AI_INCIDENT_CATEGORY_DEADLINE_DAYS["critical_infrastructure_disruption"],
    ).toBe(2)
  })

  it("widespread infringement → 10-day deadline (Art. 73(3) widespread)", () => {
    expect(AI_INCIDENT_CATEGORY_DEADLINE_DAYS["widespread_infringement"]).toBe(
      10,
    )
  })

  it("fundamental rights non-widespread + property/environment + other → 15 days", () => {
    expect(
      AI_INCIDENT_CATEGORY_DEADLINE_DAYS["fundamental_rights_infringement"],
    ).toBe(15)
    expect(
      AI_INCIDENT_CATEGORY_DEADLINE_DAYS["property_or_environment_harm"],
    ).toBe(15)
    expect(AI_INCIDENT_CATEGORY_DEADLINE_DAYS["other_serious"]).toBe(15)
  })

  it("every category has Romanian label + non-trivial help text", () => {
    for (const cat of AI_INCIDENT_CATEGORY_OPTIONS) {
      expect(AI_INCIDENT_CATEGORY_LABELS[cat].length).toBeGreaterThan(10)
    }
  })

  it("every severity option has Romanian label", () => {
    for (const sev of AI_INCIDENT_SEVERITY_OPTIONS) {
      expect(AI_INCIDENT_SEVERITY_LABELS[sev].length).toBeGreaterThan(5)
    }
  })

  it("8 status states have Romanian labels", () => {
    expect(AI_INCIDENT_STATUS_OPTIONS).toHaveLength(8)
    for (const st of AI_INCIDENT_STATUS_OPTIONS) {
      expect(AI_INCIDENT_STATUS_LABELS[st].length).toBeGreaterThan(5)
    }
  })
})

describe("ai-incident-schema — category labels reference correct article", () => {
  it("(a) death → Art. 73(2)(a)", () => {
    expect(AI_INCIDENT_CATEGORY_LABELS["death_or_serious_harm_health"]).toContain(
      "Art. 73(2)(a)",
    )
  })

  it("(b) critical infra → Art. 73(2)(b)", () => {
    expect(
      AI_INCIDENT_CATEGORY_LABELS["critical_infrastructure_disruption"],
    ).toContain("Art. 73(2)(b)")
  })

  it("(c) fundamental rights → Art. 73(2)(c)", () => {
    expect(
      AI_INCIDENT_CATEGORY_LABELS["fundamental_rights_infringement"],
    ).toContain("Art. 73(2)(c)")
  })

  it("(d) property/environment → Art. 73(2)(d)", () => {
    expect(
      AI_INCIDENT_CATEGORY_LABELS["property_or_environment_harm"],
    ).toContain("Art. 73(2)(d)")
  })
})
