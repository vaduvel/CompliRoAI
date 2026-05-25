import { describe, expect, it } from "vitest"

import { parseClientImportText } from "./client-import"

describe("client import parser", () => {
  it("maps Romanian headers and creates proactive signals", () => {
    const csv = [
      "nume firmă;cui;email contact;servicii;folosește ai;date personale ai;risc ridicat;trimite intake",
      "Apex Logistic SRL;RO12345678;maria@example.com;ai_act|gdpr|ai_literacy;da;da;nu;da",
    ].join("\n")

    const result = parseClientImportText(csv)
    expect(result.totalRows).toBe(1)
    expect(result.validRows).toBe(1)
    expect(result.rows[0].companyName).toBe("Apex Logistic SRL")
    expect(result.rows[0].cui).toBe("RO12345678")
    expect(result.rows[0].serviceScope).toContain("ai_act")
    expect(result.rows[0].serviceScope).toContain("gdpr")
    expect(result.rows[0].serviceScope).toContain("ai_literacy")
    expect(result.rows[0].signals.map((signal) => signal.type)).toEqual([
      "send_intake",
      "complete_ai_inventory",
      "gdpr_dpia_review",
      "ai_literacy_task",
    ])
  })

  it("rejects invalid CUI, invalid email, and file duplicates", () => {
    const csv = [
      "company_name,cui,contact_email",
      "Apex Logistic SRL,abc,not-an-email",
      "Apex Logistic SRL,,maria@example.com",
    ].join("\n")

    const result = parseClientImportText(csv)
    expect(result.errorRows).toBe(2)
    expect(result.rows[0].errors).toContain("CUI invalid.")
    expect(result.rows[0].errors).toContain("Email contact invalid.")
    expect(result.rows[1].errors[0]).toContain("Duplicat")
  })
})
