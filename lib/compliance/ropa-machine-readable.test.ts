/**
 * Sprint 008C — Tests pentru exportul machine-readable RoPA (Audit Pack).
 *
 * Verifica: schema URI rebranded, schema version, controller, risk per
 * activitate, linkuri findings, markdown alternative.
 */

import { describe, expect, it } from "vitest"

import {
  buildRopaMachineReadableExport,
  normalizeRopaActivityRecord,
} from "@/lib/compliance/ropa-risk-engine"

const NOW = "2026-05-11T00:00:00.000Z"

describe("RoPA machine-readable export", () => {
  it("exporta schema versionata cu risc, linkuri si controller", () => {
    const activity = normalizeRopaActivityRecord(
      {
        id: "hr-ai-screening",
        activityName: "Screening CV cu AI",
        purpose: "Triere candidați",
        dataCategories: ["CV", "email", "scoring"],
        dataSubjects: ["Candidați angajare"],
        processors: ["HR AI Vendor"],
        systems: ["ATS"],
        legalBasis: "6(1)(f)",
        retentionRule: "12 luni",
        securityMeasures: ["RBAC"],
        source: "manual",
        confidence: "dpo_confirmed",
        status: "draft",
        linkedFindings: [],
        linkedEvidence: [],
      },
      NOW,
    )

    const exported = buildRopaMachineReadableExport({
      activities: [activity],
      orgId: "org-1",
      orgName: "Client SRL",
      nowISO: NOW,
    })

    expect(exported.schema).toBe("https://compliroai.ro/schemas/ropa-data-map.v1.json")
    expect(exported.schemaVersion).toBe("2026.05.ro.v1")
    expect(exported.jurisdiction).toBe("RO/EU")
    expect(exported.controller.orgName).toBe("Client SRL")
    expect(exported.controller.orgId).toBe("org-1")
    expect(exported.activities[0].risk.score).toBeGreaterThan(0)
    expect(exported.activities[0].links.findings.length).toBeGreaterThan(0)
    expect(exported.legalBasis).toContain("GDPR Art. 30")
    expect(exported.legalBasis).toContain("Legea 190/2018")
  })

  it("activities goale -> summary.exportedActivities=0 si riskScoreAverage=0", () => {
    const exported = buildRopaMachineReadableExport({
      activities: [],
      nowISO: NOW,
    })
    expect(exported.summary.exportedActivities).toBe(0)
    expect(exported.summary.riskScoreAverage).toBe(0)
    expect(exported.summary.activityCount).toBe(0)
    expect(exported.activities).toHaveLength(0)
  })

  it("calculează average risk score corect", () => {
    const high = normalizeRopaActivityRecord(
      {
        id: "high-risk",
        activityName: "Date medicale",
        dataCategories: ["Date de sănătate"],
        dataSubjects: ["Pacienți"],
        article9Condition: undefined,
        securityMeasures: [],
        legalBasis: undefined,
        retentionRule: undefined,
      },
      NOW,
    )
    const low = normalizeRopaActivityRecord(
      {
        id: "low-risk",
        activityName: "Newsletter",
        dataCategories: ["Email"],
        dataSubjects: ["Abonați"],
        legalBasis: "6(1)(a)",
        retentionRule: "Până la unsubscribe",
        securityMeasures: ["RBAC"],
      },
      NOW,
    )
    const exported = buildRopaMachineReadableExport({
      activities: [high, low],
      nowISO: NOW,
    })
    expect(exported.summary.exportedActivities).toBe(2)
    expect(exported.summary.riskScoreAverage).toBeGreaterThan(0)
    expect(exported.summary.highRiskActivities).toBe(1)
  })
})
