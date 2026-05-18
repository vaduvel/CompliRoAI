// Sprint 014 — email templates tests.
//
// Validate că:
//   1. Toate cele 10 template-uri renderează correct cu variabile valide
//   2. Variabilele required sunt validate (throw on missing)
//   3. Interpolation păstrează unknown placeholders (no crash on typos)
//   4. Branding injection funcționează (brandName + brandColor)
//   5. sendEmail în dev mode (fără API key) returnează success "console"

import { describe, expect, it } from "vitest"

import {
  getTemplate,
  interpolate,
  listTemplates,
  renderTemplate,
  sendEmail,
  type TemplateName,
} from "./email-templates"

describe("interpolate", () => {
  it("replaces simple {{var}} placeholders", () => {
    expect(interpolate("Hello {{name}}", { name: "Ana" })).toBe("Hello Ana")
  })

  it("replaces multiple occurrences", () => {
    expect(interpolate("{{x}}-{{x}}-{{x}}", { x: "1" })).toBe("1-1-1")
  })

  it("preserves unknown placeholders (no crash)", () => {
    expect(interpolate("Hi {{foo}} {{bar}}", { foo: "X" })).toBe("Hi X {{bar}}")
  })

  it("handles empty string values", () => {
    expect(interpolate("a={{a}}", { a: "" })).toBe("a=")
  })
})

describe("listTemplates", () => {
  it("returns all 11 expected templates", () => {
    const names = listTemplates()
    expect(names).toHaveLength(11)
    expect(names).toEqual(
      expect.arrayContaining([
        "welcome",
        "breach-72h-alert",
        "dsar-deadline-alert",
        "vendor-dpa-expiring",
        "finding-critical-created",
        "monthly-digest",
        "payment-succeeded",
        "payment-failed",
        "subscription-changed",
        "trial-ending",
        "renewal-reminder",
      ])
    )
  })
})

describe("getTemplate", () => {
  it("returns template def with subject + html + text + requiredVars", () => {
    const t = getTemplate("welcome")
    expect(t.subject).toBeTruthy()
    expect(t.html).toContain("<!DOCTYPE html>")
    expect(t.text).toBeTruthy()
    expect(t.requiredVars.length).toBeGreaterThan(0)
  })

  it("throws on unknown template", () => {
    expect(() => getTemplate("xxx" as TemplateName)).toThrow()
  })
})

describe("renderTemplate", () => {
  it("renders welcome template with required vars", () => {
    const result = renderTemplate("welcome", {
      userName: "Ana",
      dashboardUrl: "https://app.compliroai.ro/dashboard",
    })
    expect(result.subject).toContain("Bun venit")
    expect(result.subject).toContain("CompliRoAI")
    expect(result.html).toContain("Ana")
    expect(result.html).toContain("https://app.compliroai.ro/dashboard")
    expect(result.text).toContain("Ana")
  })

  it("renders breach alert with severity + url + deadline", () => {
    const result = renderTemplate("breach-72h-alert", {
      breachTitle: "Test breach",
      breachUrl: "https://app.compliroai.ro/dashboard/breach/123",
      deadlineDate: "20 mai 2026",
      severityLabel: "Critic",
    })
    expect(result.subject).toContain("URGENT")
    expect(result.subject).toContain("Test breach")
    expect(result.html).toContain("20 mai 2026")
    expect(result.html).toContain("Critic")
  })

  it("throws when required var is missing", () => {
    expect(() => renderTemplate("welcome", { userName: "Ana" })).toThrow(
      /dashboardUrl/
    )
  })

  it("applies branding (brandName + brandColor)", () => {
    const result = renderTemplate(
      "welcome",
      { userName: "X", dashboardUrl: "https://x.com" },
      {
        brandName: "Cabinet Doe",
        primaryColor: "#dc2626",
        secondaryColor: "#7c3aed",
        logoUrl: null,
        signerName: null,
        signerTitle: null,
        contactEmail: null,
        address: null,
        website: null,
        updatedAtISO: null,
        isCustom: true,
      }
    )
    expect(result.subject).toContain("Cabinet Doe")
    expect(result.html).toContain("Cabinet Doe")
    expect(result.html).toContain("#dc2626")
  })

  it("renders all 11 templates without crash (smoke)", () => {
    const minimalVars: Record<TemplateName, Record<string, string>> = {
      welcome: { userName: "X", dashboardUrl: "https://x" },
      "breach-72h-alert": {
        breachTitle: "B",
        breachUrl: "https://x",
        deadlineDate: "21 mai",
        severityLabel: "High",
      },
      "dsar-deadline-alert": {
        dsarType: "access",
        dsarUrl: "https://x",
        deadlineDate: "21 mai",
        daysLeft: "3",
        subjectIdentifier: "ion@x.ro",
      },
      "vendor-dpa-expiring": {
        vendorName: "Vendor X",
        vendorUrl: "https://x",
        expiryDate: "1 iunie",
        daysLeft: "15",
      },
      "finding-critical-created": {
        findingTitle: "F",
        findingUrl: "https://x",
        category: "GDPR",
        createdAtDate: "17 mai",
      },
      "monthly-digest": {
        monthLabel: "Mai 2026",
        compliancePct: "78",
        openFindingsCount: "5",
        actionsCompletedCount: "12",
        upcomingDeadlinesCount: "3",
        dashboardUrl: "https://x",
      },
      "payment-succeeded": {
        tierName: "IMM Solo",
        amountEUR: "99",
        invoiceUrl: "https://x",
        periodEndDate: "17 iunie",
      },
      "payment-failed": {
        tierName: "IMM Solo",
        amountEUR: "99",
        billingPortalUrl: "https://x",
        retryDate: "20 mai",
      },
      "subscription-changed": {
        newTierName: "IMM Mid",
        newPriceEUR: "249",
        effectiveDate: "17 iunie",
        billingPortalUrl: "https://x",
      },
      "trial-ending": {
        daysLeft: "3",
        trialEndDate: "20 mai",
        checkoutUrl: "https://x",
      },
      "renewal-reminder": {
        entityLabel: "FRIA HR",
        entityUrl: "https://x",
        deadlineDate: "1 iunie",
        daysLeft: "15",
        recommendedAction: "Revizuiește FRIA",
        triggerType: "fria_review_overdue",
      },
    }
    for (const name of listTemplates()) {
      const result = renderTemplate(name, minimalVars[name])
      expect(result.subject).toBeTruthy()
      expect(result.html).toContain("<!DOCTYPE html>")
      expect(result.text).toBeTruthy()
      // Footer always interpolated, never bare:
      expect(result.html).not.toContain("{{footer}}")
      expect(result.html).not.toContain("{{brandName}}")
    }
  })

  it("includes footer with unsubscribe link in all templates", () => {
    const result = renderTemplate("welcome", {
      userName: "X",
      dashboardUrl: "https://x",
    })
    expect(result.text).toContain("Dezabonare")
    expect(result.html).toContain("compliroai.ro")
  })
})

describe("sendEmail (no RESEND_API_KEY)", () => {
  it("returns success channel 'console' when API key missing", async () => {
    // Test env doesn't have RESEND_API_KEY → should NOT make network call.
    delete process.env.RESEND_API_KEY
    const result = await sendEmail("welcome", "test@example.com", {
      userName: "Tester",
      dashboardUrl: "https://app.compliroai.ro/dashboard",
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.channel).toBe("console")
    }
  })

  it("returns error when required vars missing (independent of API key)", async () => {
    const result = await sendEmail("welcome", "test@example.com", {
      userName: "Tester",
      // Missing dashboardUrl
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toContain("dashboardUrl")
    }
  })
})
