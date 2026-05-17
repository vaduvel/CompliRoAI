/**
 * Sprint 009 — Tests pentru PII Discovery scanner.
 */

import { describe, expect, it } from "vitest"

import { scanPIIBlob, piiCategoryLabel } from "@/lib/compliance/pii-discovery"

describe("scanPIIBlob", () => {
  it("detecteaza CNP + email + telefon + IBAN intr-un blob mixt", () => {
    const result = scanPIIBlob({
      sourceLabel: "test-blob",
      text: `
        Contact: ion.popescu@example.ro, tel 0722123123.
        CNP 1990101123456.
        IBAN RO49AAAA1B31007593840000.
      `,
    }, "2026-05-17T10:00:00.000Z")

    const types = result.categories.map((c) => c.type)
    expect(types).toEqual(expect.arrayContaining(["cnp", "email", "phone", "iban"]))
    expect(result.detectionCount).toBeGreaterThanOrEqual(4)
    expect(result.riskLevel).toBe("high")
    expect(result.candidateFinding).toBeDefined()
    expect(result.candidateFinding?.severity).toBe("high")
  })

  it("nu emite finding pentru blob fara PII detectabil", () => {
    const result = scanPIIBlob({
      sourceLabel: "procedura interna",
      text: "Aceasta este o procedura interna fara identificatori personali.",
    })
    expect(result.categories).toHaveLength(0)
    expect(result.detectionCount).toBe(0)
    expect(result.riskLevel).toBe("none")
    expect(result.candidateFinding).toBeUndefined()
  })

  it("masheaza sample-urile in output", () => {
    const result = scanPIIBlob({
      sourceLabel: "test",
      text: "Email: john.doe@example.com",
    })
    const email = result.categories.find((c) => c.type === "email")
    expect(email?.sample).toContain("***@")
    expect(email?.sample).not.toContain("john.doe@example.com")
  })

  it("masheaza card bancar la 4 digits primii + 4 ultimii", () => {
    const result = scanPIIBlob({
      sourceLabel: "test",
      text: "Card: 4111 1111 1111 1111",
    })
    const card = result.categories.find((c) => c.type === "card")
    expect(card).toBeDefined()
    expect(card?.sample).toMatch(/^\d{4}\*{4}\d{4}$/)
  })

  it("emite finding cu severity high cand contine sensitive (CNP)", () => {
    const result = scanPIIBlob({
      sourceLabel: "dosar candidat",
      text: "CNP 1990101123456",
    })
    expect(result.candidateFinding).toBeDefined()
    expect(result.candidateFinding?.severity).toBe("high")
    expect(result.candidateFinding?.legalReference).toMatch(/190\/2018/)
  })

  it("nu emite finding daca doar pattern-uri low-confidence (name)", () => {
    const result = scanPIIBlob({
      sourceLabel: "doc fara identificatori",
      text: "Ion Popescu si Maria Ionescu au participat la sedinta.",
    })
    expect(result.detectionCount).toBeGreaterThan(0)
    expect(result.candidateFinding).toBeUndefined()
  })

  it("returneaza scannedAtISO din param", () => {
    const result = scanPIIBlob({
      sourceLabel: "x",
      text: "email: a@b.co",
    }, "2026-05-17T12:00:00.000Z")
    expect(result.scannedAtISO).toBe("2026-05-17T12:00:00.000Z")
  })

  it("piiCategoryLabel returneaza RO label", () => {
    expect(piiCategoryLabel("cnp")).toBe("CNP")
    expect(piiCategoryLabel("iban")).toBe("IBAN")
    expect(piiCategoryLabel("card")).toBe("Card bancar")
  })
})
