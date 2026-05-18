import { describe, expect, it } from "vitest"

import {
  computeDeadlineStatus,
  computeReportingDeadline,
  evaluateIncident,
} from "./ai-incident-evaluator"
import type { AIIncident } from "@/lib/compliance/types"

const DAY_MS = 86_400_000

function baseIncident(overrides: Partial<AIIncident> = {}): AIIncident {
  const detectedAt = "2026-05-01T10:00:00.000Z"
  return {
    id: "ai-inc-test-1",
    orgId: "org-test",
    title: "Test incident",
    description: "Sistem AI a refuzat acces la serviciu pentru grup demografic.",
    category: "fundamental_rights_infringement",
    severity: "serious",
    linkedAISystemId: "sys-test-1",
    affectedSubjectsCategories: ["solicitanți credit"],
    affectedSubjectsCount: 120,
    detectedAtISO: detectedAt,
    reportingDeadlineISO: new Date(
      new Date(detectedAt).getTime() + 15 * DAY_MS,
    ).toISOString(),
    reportingDeadlineDays: 15,
    notifications: [],
    notificationRequired: true,
    linkedFindingIds: [],
    status: "assessing",
    createdAtISO: detectedAt,
    updatedAtISO: detectedAt,
    ...overrides,
  }
}

describe("computeReportingDeadline — Art. 73(3) deadlines", () => {
  it("death_or_serious_harm_health → 2 days", () => {
    const r = computeReportingDeadline(
      "death_or_serious_harm_health",
      "2026-05-01T00:00:00.000Z",
    )
    expect(r.days).toBe(2)
    expect(r.deadlineISO).toBe("2026-05-03T00:00:00.000Z")
  })

  it("critical_infrastructure_disruption → 2 days", () => {
    const r = computeReportingDeadline(
      "critical_infrastructure_disruption",
      "2026-05-01T00:00:00.000Z",
    )
    expect(r.days).toBe(2)
    expect(r.deadlineISO).toBe("2026-05-03T00:00:00.000Z")
  })

  it("widespread_infringement → 10 days", () => {
    const r = computeReportingDeadline(
      "widespread_infringement",
      "2026-05-01T00:00:00.000Z",
    )
    expect(r.days).toBe(10)
    expect(r.deadlineISO).toBe("2026-05-11T00:00:00.000Z")
  })

  it("fundamental_rights_infringement (non-widespread) → 15 days", () => {
    const r = computeReportingDeadline(
      "fundamental_rights_infringement",
      "2026-05-01T00:00:00.000Z",
    )
    expect(r.days).toBe(15)
    expect(r.deadlineISO).toBe("2026-05-16T00:00:00.000Z")
  })

  it("property_or_environment_harm → 15 days", () => {
    const r = computeReportingDeadline(
      "property_or_environment_harm",
      "2026-05-01T00:00:00.000Z",
    )
    expect(r.days).toBe(15)
  })

  it("other_serious → 15 days (default)", () => {
    const r = computeReportingDeadline("other_serious", "2026-05-01T00:00:00.000Z")
    expect(r.days).toBe(15)
  })

  it("throws on invalid detectedAtISO", () => {
    expect(() =>
      computeReportingDeadline("death_or_serious_harm_health", "not-a-date"),
    ).toThrow(/invalid/)
  })
})

describe("computeDeadlineStatus", () => {
  it("ok level when > 72h left + no submitted notification", () => {
    const ds = computeDeadlineStatus(
      {
        reportingDeadlineISO: "2026-05-20T00:00:00.000Z",
        notifications: [],
      },
      "2026-05-10T00:00:00.000Z",
    )
    expect(ds.expired).toBe(false)
    expect(ds.urgent).toBe(false)
    expect(ds.level).toBe("ok")
    expect(ds.daysLeft).toBe(10)
  })

  it("warn level when between 24h and 72h", () => {
    const ds = computeDeadlineStatus(
      {
        reportingDeadlineISO: "2026-05-10T48:00:00.000Z".replace("48", "00"),
        notifications: [],
      },
      // 48h before deadline
      new Date(new Date("2026-05-10T00:00:00.000Z").getTime() - 48 * 3_600_000).toISOString(),
    )
    expect(ds.level).toBe("warn")
  })

  it("urgent level when ≤ 24h remaining", () => {
    const ds = computeDeadlineStatus(
      {
        reportingDeadlineISO: "2026-05-10T00:00:00.000Z",
        notifications: [],
      },
      // 12h before deadline
      new Date(new Date("2026-05-10T00:00:00.000Z").getTime() - 12 * 3_600_000).toISOString(),
    )
    expect(ds.urgent).toBe(true)
    expect(ds.level).toBe("urgent")
  })

  it("expired level when past deadline + no submitted notification", () => {
    const ds = computeDeadlineStatus(
      {
        reportingDeadlineISO: "2026-05-10T00:00:00.000Z",
        notifications: [],
      },
      "2026-05-12T00:00:00.000Z",
    )
    expect(ds.expired).toBe(true)
    expect(ds.level).toBe("expired")
    expect(ds.daysLeft).toBeLessThan(0)
  })

  it("notified level when at least 1 notification submitted (even past deadline)", () => {
    const ds = computeDeadlineStatus(
      {
        reportingDeadlineISO: "2026-05-10T00:00:00.000Z",
        notifications: [
          {
            id: "n1",
            authorityName: "Market Surveillance",
            status: "submitted",
            submittedAtISO: "2026-05-09T00:00:00.000Z",
            referenceNumber: "AB-2026-001",
          },
        ],
      },
      "2026-05-12T00:00:00.000Z",
    )
    expect(ds.level).toBe("notified")
  })

  it("notified level when status acknowledged (autoritate a primit)", () => {
    const ds = computeDeadlineStatus(
      {
        reportingDeadlineISO: "2026-05-10T00:00:00.000Z",
        notifications: [
          {
            id: "n2",
            authorityName: "Authority X",
            status: "acknowledged",
            referenceNumber: "AB-2026-002",
          },
        ],
      },
      "2026-05-15T00:00:00.000Z",
    )
    expect(ds.level).toBe("notified")
  })
})

describe("evaluateIncident — notificationRequired logic", () => {
  it("forces notificationRequired=true for death even when record says false", () => {
    const res = evaluateIncident({
      record: baseIncident({
        category: "death_or_serious_harm_health",
        reportingDeadlineDays: 2,
        notificationRequired: false,
      }),
      orgName: "ACME",
    })
    expect(res.notificationRequired).toBe(true)
  })

  it("forces notificationRequired=true for critical_infrastructure_disruption", () => {
    const res = evaluateIncident({
      record: baseIncident({
        category: "critical_infrastructure_disruption",
        reportingDeadlineDays: 2,
        notificationRequired: false,
      }),
      orgName: "ACME",
    })
    expect(res.notificationRequired).toBe(true)
  })

  it("forces notificationRequired=true for widespread_infringement", () => {
    const res = evaluateIncident({
      record: baseIncident({
        category: "widespread_infringement",
        reportingDeadlineDays: 10,
        notificationRequired: false,
      }),
      orgName: "ACME",
    })
    expect(res.notificationRequired).toBe(true)
  })

  it("allows notificationRequired=false for other_serious + property_or_environment", () => {
    const res = evaluateIncident({
      record: baseIncident({
        category: "other_serious",
        notificationRequired: false,
        status: "not_reportable",
      }),
      orgName: "ACME",
    })
    expect(res.notificationRequired).toBe(false)
  })
})

describe("evaluateIncident — urgency calculation", () => {
  it("critical urgency when deadline expired + notification required + no notification submitted", () => {
    const res = evaluateIncident({
      record: baseIncident({
        category: "death_or_serious_harm_health",
        reportingDeadlineDays: 2,
        // detected 5 zile în trecut, deadline trecut cu 3 zile
        detectedAtISO: new Date(Date.now() - 5 * DAY_MS).toISOString(),
        reportingDeadlineISO: new Date(
          Date.now() - 3 * DAY_MS,
        ).toISOString(),
      }),
      orgName: "ACME",
    })
    expect(res.urgency).toBe("critical")
  })

  it("critical urgency when severity=catastrophic", () => {
    const res = evaluateIncident({
      record: baseIncident({
        severity: "catastrophic",
      }),
      orgName: "ACME",
    })
    expect(res.urgency).toBe("critical")
  })

  it("low urgency when notificationRequired=false and severity low", () => {
    const res = evaluateIncident({
      record: baseIncident({
        category: "other_serious",
        severity: "minor",
        notificationRequired: false,
        status: "not_reportable",
      }),
      orgName: "ACME",
    })
    expect(res.urgency).toBe("low")
  })
})

describe("evaluateIncident — candidate findings", () => {
  it("emits CRITICAL finding when deadline overdue + no notification submitted", () => {
    const res = evaluateIncident({
      record: baseIncident({
        category: "death_or_serious_harm_health",
        reportingDeadlineDays: 2,
        detectedAtISO: new Date(Date.now() - 5 * DAY_MS).toISOString(),
        reportingDeadlineISO: new Date(Date.now() - 3 * DAY_MS).toISOString(),
      }),
      orgName: "ACME",
    })
    const overdueF = res.candidateFindings.find((f) =>
      f.title.includes("deadline Art. 73"),
    )
    expect(overdueF).toBeDefined()
    expect(overdueF!.severity).toBe("critical")
    expect(overdueF!.legalReference).toContain("Art. 73(1)")
    expect(overdueF!.legalReference).toContain("Art. 73(3)")
  })

  it("emits HIGH finding when rootCause is missing on non-draft non-not_reportable", () => {
    const res = evaluateIncident({
      record: baseIncident({
        status: "authority_notified",
        rootCause: undefined,
      }),
      orgName: "ACME",
    })
    const rcF = res.candidateFindings.find((f) =>
      f.title.includes("root cause investigation Art. 73(4)"),
    )
    expect(rcF).toBeDefined()
    expect(rcF!.severity).toBe("high")
    expect(rcF!.legalReference).toContain("Art. 73(4)")
  })

  it("does NOT emit rootCause finding when status=draft", () => {
    const res = evaluateIncident({
      record: baseIncident({
        status: "draft",
        rootCause: undefined,
      }),
      orgName: "ACME",
    })
    const rcF = res.candidateFindings.find((f) =>
      f.title.includes("root cause investigation"),
    )
    expect(rcF).toBeUndefined()
  })

  it("does NOT emit rootCause finding when status=not_reportable", () => {
    const res = evaluateIncident({
      record: baseIncident({
        status: "not_reportable",
        rootCause: undefined,
        notificationRequired: false,
        category: "other_serious",
      }),
      orgName: "ACME",
    })
    const rcF = res.candidateFindings.find((f) =>
      f.title.includes("root cause investigation"),
    )
    expect(rcF).toBeUndefined()
  })

  it("emits HIGH finding when severity=catastrophic and not closed", () => {
    const res = evaluateIncident({
      record: baseIncident({
        severity: "catastrophic",
        status: "remediated",
      }),
      orgName: "ACME",
    })
    const cF = res.candidateFindings.find((f) =>
      f.title.includes("catastrofic fără closure"),
    )
    expect(cF).toBeDefined()
    expect(cF!.severity).toBe("high")
  })

  it("does NOT emit catastrophic finding when status=closed", () => {
    const res = evaluateIncident({
      record: baseIncident({
        severity: "catastrophic",
        status: "closed",
        closedAtISO: new Date().toISOString(),
      }),
      orgName: "ACME",
    })
    const cF = res.candidateFindings.find((f) =>
      f.title.includes("catastrofic fără closure"),
    )
    expect(cF).toBeUndefined()
  })

  it("emits MEDIUM finding when notification submitted but missing referenceNumber", () => {
    const res = evaluateIncident({
      record: baseIncident({
        notifications: [
          {
            id: "n3",
            authorityName: "Market Surveillance RO",
            status: "submitted",
            submittedAtISO: new Date().toISOString(),
            // referenceNumber lipsește
          },
        ],
      }),
      orgName: "ACME",
    })
    const refF = res.candidateFindings.find((f) =>
      f.title.includes("referință notificare autoritate"),
    )
    expect(refF).toBeDefined()
    expect(refF!.severity).toBe("medium")
  })
})

describe("evaluateIncident — gaps", () => {
  it("gap deadline_overdue with code + critical severity", () => {
    const res = evaluateIncident({
      record: baseIncident({
        category: "death_or_serious_harm_health",
        reportingDeadlineDays: 2,
        detectedAtISO: new Date(Date.now() - 5 * DAY_MS).toISOString(),
        reportingDeadlineISO: new Date(Date.now() - 3 * DAY_MS).toISOString(),
      }),
      orgName: "ACME",
    })
    const g = res.gaps.find((x) => x.code === "deadline_overdue")
    expect(g).toBeDefined()
    expect(g!.severity).toBe("critical")
  })

  it("gap missing_root_cause flagged when non-draft", () => {
    const res = evaluateIncident({
      record: baseIncident({ status: "authority_notified" }),
      orgName: "ACME",
    })
    expect(res.gaps.some((g) => g.code === "missing_root_cause")).toBe(true)
  })

  it("gap no_assignee when assignedToEmail is missing", () => {
    const res = evaluateIncident({
      record: baseIncident({ assignedToEmail: undefined }),
      orgName: "ACME",
    })
    expect(res.gaps.some((g) => g.code === "no_assignee")).toBe(true)
  })
})

describe("evaluateIncident — markdown", () => {
  it("markdown contains key sections and Art. 73 refs", () => {
    const res = evaluateIncident({
      record: baseIncident({
        rootCause: {
          identifiedAtISO: "2026-05-05T00:00:00.000Z",
          identifiedByEmail: "dpo@acme.ro",
          rootCauseDescription: "Model bias on protected group X.",
          contributingFactors: ["dataset insuficient"],
          evidenceCollected: ["bias audit report"],
          remediationActions: ["retrain with balanced data"],
          preventionActions: ["bias audit lunar"],
        },
      }),
      orgName: "ACME SRL",
    })
    expect(res.generatedMarkdown).toContain("# Incident AI — Test incident")
    expect(res.generatedMarkdown).toContain("Art. 73(2)")
    expect(res.generatedMarkdown).toContain("Art. 73(3)")
    expect(res.generatedMarkdown).toContain("Art. 73(4)")
    expect(res.generatedMarkdown).toContain("Investigație cauză rădăcină")
    expect(res.generatedMarkdown).toContain("Checklist Art. 73")
    expect(res.generatedMarkdown).toContain("Linkages")
  })
})
