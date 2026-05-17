/**
 * Sprint 009 — Tests pentru AI Policy Pack templates.
 */

import { describe, expect, it } from "vitest"

import {
  buildAIPolicyPack,
  getAIPolicyTemplate,
  listAIPolicyTemplateIds,
} from "@/lib/compliance/ai-policy-pack"

describe("buildAIPolicyPack", () => {
  it("genereaza toate 5 template-uri RO parametrizate cu orgName", () => {
    const pack = buildAIPolicyPack({
      orgName: "Acme SRL",
      generatedAtISO: "2026-05-17T00:00:00.000Z",
      dpoEmail: "dpo@acme.ro",
    })
    expect(pack.templates).toHaveLength(5)
    const ids = pack.templates.map((t) => t.id)
    expect(ids).toEqual(
      expect.arrayContaining([
        "acceptable_use",
        "vendor_onboarding",
        "incident_response",
        "audit_logging",
        "human_oversight",
      ]),
    )
    for (const template of pack.templates) {
      expect(template.markdown).toContain("Acme SRL")
      expect(template.markdown).toContain("dpo@acme.ro")
      expect(template.fileName).toMatch(/\.md$/)
      expect(template.title.length).toBeGreaterThan(0)
    }
  })

  it("foloseste placeholder pentru DPO email lipsa", () => {
    const pack = buildAIPolicyPack({ orgName: "Test SRL" })
    const acceptable = pack.templates.find((t) => t.id === "acceptable_use")
    expect(acceptable?.markdown).toContain("[email DPO]")
  })

  it("foloseste fallback Organizația pentru orgName lipsa", () => {
    const pack = buildAIPolicyPack({ orgName: "" })
    expect(pack.orgName).toBe("Organizația")
    expect(pack.templates[0]?.markdown).toContain("Organizația")
  })

  it("templates conform contin sectiuni legale specifice", () => {
    const pack = buildAIPolicyPack({ orgName: "X", dpoEmail: "d@x.ro" })

    const acceptable = pack.templates.find((t) => t.id === "acceptable_use")
    expect(acceptable?.markdown).toContain("EU AI Act")
    expect(acceptable?.markdown).toContain("Utilizări INTERZISE")

    const vendor = pack.templates.find((t) => t.id === "vendor_onboarding")
    expect(vendor?.markdown).toContain("DPA")
    expect(vendor?.markdown).toContain("SCC")

    const incident = pack.templates.find((t) => t.id === "incident_response")
    expect(incident?.markdown).toContain("72h")
    expect(incident?.markdown).toContain("ANSPDCP")

    const logging = pack.templates.find((t) => t.id === "audit_logging")
    expect(logging?.markdown).toContain("Art. 12")
    expect(logging?.markdown).toContain("high-risk")

    const oversight = pack.templates.find((t) => t.id === "human_oversight")
    expect(oversight?.markdown).toContain("Art. 14")
    expect(oversight?.markdown).toContain("Art. 22")
  })

  it("genereaza generatedAtISO daca lipseste", () => {
    const before = new Date().toISOString()
    const pack = buildAIPolicyPack({ orgName: "X" })
    const after = new Date().toISOString()
    expect(pack.generatedAtISO >= before).toBe(true)
    expect(pack.generatedAtISO <= after).toBe(true)
  })
})

describe("getAIPolicyTemplate", () => {
  it("returneaza un template specific by id", () => {
    const tpl = getAIPolicyTemplate("acceptable_use", { orgName: "Y" })
    expect(tpl).not.toBeNull()
    expect(tpl?.id).toBe("acceptable_use")
    expect(tpl?.markdown).toContain("Y")
  })
})

describe("listAIPolicyTemplateIds", () => {
  it("returneaza toate 5 id-uri", () => {
    expect(listAIPolicyTemplateIds()).toHaveLength(5)
  })
})
