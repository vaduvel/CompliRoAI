/**
 * Sprint 008C — Tests pentru ropa-risk-engine.
 *
 * Port + extindere din donor DPO-OS. Acopera: skip empty activities,
 * date medicale + CNP + DPIA trigger, vendor review pentru procesatori,
 * transfer extern fara mecanism, knowledge items unique, missing legal
 * basis si retention summary.
 */

import { describe, expect, it } from "vitest"

import {
  evaluateRopaDataMap,
  normalizeRopaActivityRecord,
  type RopaActivityRecord,
} from "@/lib/compliance/ropa-risk-engine"

const NOW = "2026-05-09T09:00:00.000Z"

function activity(input: Partial<RopaActivityRecord> = {}): RopaActivityRecord {
  return normalizeRopaActivityRecord(
    {
      id: "patient-care",
      activityName: "Servicii medicale pacienți",
      purpose: "Programări, consultații și fișă pacient",
      dataSubjects: ["Pacienți"],
      dataCategories: ["Nume și prenume", "CNP / CNP UE", "Date de sănătate"],
      legalBasis: "6(1)(c)",
      recipients: ["CNAS"],
      processors: [],
      systems: ["Platformă programări"],
      thirdCountryTransfers: [],
      retentionRule: "10 ani",
      securityMeasures: ["Control acces roluri (RBAC)"],
      source: "manual",
      confidence: "dpo_confirmed",
      status: "draft",
      linkedFindings: [],
      linkedEvidence: [],
      createdAtISO: NOW,
      updatedAtISO: NOW,
      ...input,
    },
    NOW,
  )
}

describe("ropa-risk-engine", () => {
  it("nu generează findings pentru activități goale", () => {
    const result = evaluateRopaDataMap({
      nowISO: NOW,
      activities: [
        normalizeRopaActivityRecord({ id: "empty", activityName: "", purpose: "" }, NOW),
      ],
    })
    expect(result.summary.activityCount).toBe(0)
    expect(result.candidateFindings).toHaveLength(0)
    expect(result.triggers).toHaveLength(0)
  })

  it("generează Art. 9 + Legea 190 + DPIA + security pentru date medicale/CNP fără controale", () => {
    const result = evaluateRopaDataMap({
      nowISO: NOW,
      activities: [activity({ article9Condition: undefined, securityMeasures: [] })],
    })

    expect(result.summary.highRiskActivities).toBe(1)
    const ids = result.candidateFindings.map((f) => f.id)
    expect(ids).toEqual(
      expect.arrayContaining([
        "ropa-patient-care-article-9",
        "ropa-patient-care-lege-190",
        "ropa-patient-care-dpia-screening",
        "ropa-patient-care-security-measures",
      ]),
    )
    expect(result.triggers.map((t) => t.type)).toContain("dpia")
    expect(result.activities[0].riskLevel).toBe("high")
    expect(result.activities[0].linkedFindings).toContain("ropa-patient-care-dpia-screening")
  })

  it("generează vendor review trigger pentru procesatori (Art. 28)", () => {
    const result = evaluateRopaDataMap({
      nowISO: NOW,
      activities: [
        activity({
          id: "crm-leads",
          activityName: "CRM leads",
          dataCategories: ["Email", "Telefon"],
          dataSubjects: ["Prospecți"],
          specialCategories: [],
          article9Condition: undefined,
          processors: ["HubSpot"],
        }),
      ],
    })
    expect(result.candidateFindings.map((f) => f.id)).toContain("ropa-crm-leads-processor-dpa")
    expect(result.triggers.map((t) => t.id)).toContain("trigger-ropa-crm-leads-vendor_review")
    expect(result.summary.vendorReviewTriggers).toBe(1)
    expect(result.knowledgeItems.some((i) => i.category === "vendors" && i.value === "HubSpot")).toBe(true)
  })

  it("emite transfer_review trigger pentru transfer fără mecanism", () => {
    const result = evaluateRopaDataMap({
      nowISO: NOW,
      activities: [
        activity({
          id: "support-us",
          activityName: "Suport clienți SUA",
          dataCategories: ["Email"],
          dataSubjects: ["Clienți"],
          specialCategories: [],
          article9Condition: undefined,
          thirdCountryTransfers: [{ country: "SUA" }],
        }),
      ],
    })
    expect(result.candidateFindings.map((f) => f.id)).toContain("ropa-support-us-transfer")
    expect(result.triggers.map((t) => t.type)).toContain("transfer_review")
  })

  it("marchează lipsa temei + retenție și nu dublează knowledge", () => {
    const result = evaluateRopaDataMap({
      nowISO: NOW,
      activities: [
        activity({
          id: "newsletter",
          activityName: "Newsletter",
          dataCategories: ["Email", "Email"],
          dataSubjects: ["Clienți"],
          specialCategories: [],
          legalBasis: "",
          retentionRule: "",
          article9Condition: undefined,
        }),
      ],
    })
    expect(result.summary.missingLegalBasis).toBe(1)
    expect(result.summary.missingRetention).toBe(1)
    expect(result.candidateFindings.map((f) => f.id)).toEqual(
      expect.arrayContaining(["ropa-newsletter-legal-basis", "ropa-newsletter-retention"]),
    )
    const emailKnowledge = result.knowledgeItems.filter(
      (i) => i.category === "data-categories" && i.value === "Email",
    )
    expect(emailKnowledge).toHaveLength(1)
  })

  it("emite DPIA trigger cand activitatea include profilare/scoring (AI signal)", () => {
    const result = evaluateRopaDataMap({
      nowISO: NOW,
      activities: [
        activity({
          id: "credit-scoring-ai",
          activityName: "Credit scoring AI",
          purpose: "Profilare credit + decizie automată",
          dataCategories: ["Salariu", "Cont curent"],
          dataSubjects: ["Solicitanți credit"],
          specialCategories: [],
          article9Condition: undefined,
          legalBasis: "6(1)(b)",
          retentionRule: "5 ani",
          securityMeasures: ["RBAC", "Logging"],
          processors: [],
        }),
      ],
    })
    const dpiaTrigger = result.triggers.find((t) => t.type === "dpia")
    expect(dpiaTrigger).toBeTruthy()
    expect(dpiaTrigger?.id).toContain("ropa-credit-scoring-ai-dpia")
    expect(result.summary.dpiaTriggers).toBe(1)
  })

  it("inferenza date speciale din dataCategories cand specialCategories lista e goala", () => {
    const result = evaluateRopaDataMap({
      nowISO: NOW,
      activities: [
        activity({
          id: "hr-medical-leave",
          activityName: "Concedii medicale",
          dataCategories: ["Adeverinta medicala", "Diagnostic"],
          specialCategories: [],
          article9Condition: undefined,
        }),
      ],
    })
    expect(result.activities[0].specialCategories.length).toBeGreaterThan(0)
    expect(result.candidateFindings.map((f) => f.id)).toContain("ropa-hr-medical-leave-article-9")
  })
})
