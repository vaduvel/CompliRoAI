// Sprint 017 — oversight-evaluator tests (Art. 14).

import { describe, expect, it } from "vitest"
import {
  computeOversightCompleteness,
  evaluateOversight,
} from "@/lib/compliance/oversight-evaluator"
import { OVERSIGHT_CAPABILITIES_ORDERED } from "@/lib/compliance/oversight-schema"
import type {
  AISystemRecord,
  HumanOversightProtocol,
  OversightCapability,
} from "@/lib/compliance/types"

function baseProtocol(over: Partial<HumanOversightProtocol> = {}): HumanOversightProtocol {
  return {
    id: "ov-1",
    orgId: "org-1",
    title: "Test Oversight Protocol",
    linkedAISystemId: "sys-1",
    oversightModel: "human_in_the_loop",
    capabilitiesCovered: [],
    responsibleHumans: [],
    escalationSteps: [],
    contestationProcedure: {
      channelDescription: "",
      acknowledgementSlaHours: 0,
      resolutionSlaDays: 0,
      reviewerRole: "",
      evidencePreservation: "",
    },
    stopProcedure: {
      stopButtonAvailable: false,
      stopButtonLocation: "",
      fallbackMode: "manual_processing",
      fallbackDescription: "",
      testFrequency: "annually",
    },
    evidenceChecklist: [],
    evidenceItems: [],
    status: "draft",
    completeness: "incomplete",
    linkedFindingIds: [],
    createdAtISO: "2026-05-01T00:00:00Z",
    updatedAtISO: "2026-05-01T00:00:00Z",
    ...over,
  }
}

function completeProtocol(over: Partial<HumanOversightProtocol> = {}): HumanOversightProtocol {
  return baseProtocol({
    capabilitiesCovered: [...OVERSIGHT_CAPABILITIES_ORDERED],
    responsibleHumans: [
      {
        email: "dpo@org.ro",
        name: "DPO",
        role: "DPO",
        competenceLevel: "expert",
        hasAuthorityToOverride: true,
        hasSupportTeam: true,
      },
    ],
    escalationSteps: [
      {
        triggerCondition: "Risc >0.8",
        escalateToEmail: "manager@org.ro",
        escalateToRole: "Manager",
        slaHours: 4,
        notificationMethod: "email",
      },
    ],
    contestationProcedure: {
      channelDescription: "Email dpo@org.ro cu formular contestație",
      acknowledgementSlaHours: 24,
      resolutionSlaDays: 30,
      reviewerRole: "DPO",
      evidencePreservation: "Toate log-urile sunt păstrate 3 ani",
    },
    stopProcedure: {
      stopButtonAvailable: true,
      stopButtonLocation: "Admin dashboard",
      fallbackMode: "manual_processing",
      fallbackDescription: "Oameni preiau munca",
      testedAtISO: "2026-04-01T00:00:00Z",
      testFrequency: "quarterly",
    },
    ...over,
  })
}

function biometricSystem(): AISystemRecord {
  return {
    id: "sys-bio",
    name: "Face Recognition",
    purpose: "biometric-identification",
    vendor: "v",
    modelType: "cnn",
    usesPersonalData: true,
    makesAutomatedDecisions: true,
    impactsRights: true,
    hasHumanReview: true,
    riskLevel: "high",
    recommendedActions: [],
    createdAtISO: "2026-05-01T00:00:00Z",
  }
}

describe("computeOversightCompleteness", () => {
  it("protocol gol → incomplete + toate motive prezente", () => {
    const c = computeOversightCompleteness(baseProtocol())
    expect(c.completeness).toBe("incomplete")
    expect(c.missingCapabilities.length).toBe(5)
    expect(c.hasResponsibleWithAuthority).toBe(false)
    expect(c.hasEscalation).toBe(false)
    expect(c.hasStopButton).toBe(false)
    expect(c.reasons.length).toBeGreaterThanOrEqual(4)
  })

  it("protocol parțial (3 capacități + 1 responsible) → partial", () => {
    const partial: OversightCapability[] = [
      "understand_capabilities",
      "interpret_output_correctly",
      "intervene_or_stop",
    ]
    const c = computeOversightCompleteness(
      baseProtocol({
        capabilitiesCovered: partial,
        responsibleHumans: [
          {
            email: "x@org.ro",
            role: "Op",
            competenceLevel: "trained",
            hasAuthorityToOverride: true,
            hasSupportTeam: false,
          },
        ],
      }),
    )
    expect(c.completeness).toBe("partial")
    expect(c.missingCapabilities.length).toBe(2)
  })

  it("protocol complet → complete + zero motive", () => {
    const c = computeOversightCompleteness(completeProtocol())
    expect(c.completeness).toBe("complete")
    expect(c.missingCapabilities.length).toBe(0)
    expect(c.reasons.length).toBe(0)
  })
})

describe("evaluateOversight — findings emission", () => {
  it("protocol gol emite findings pentru capacități + autoritate + stop", () => {
    const result = evaluateOversight({
      record: baseProtocol(),
      orgName: "Test Org",
    })
    expect(result.completeness).toBe("incomplete")
    const titles = result.candidateFindings.map((f) => f.title)
    expect(titles.some((t) => t.match(/Lipsesc capacități/))).toBe(true)
    expect(titles.some((t) => t.match(/Niciun responsabil cu autoritate/))).toBe(true)
    expect(titles.some((t) => t.match(/Lipsește buton stop/))).toBe(true)
  })

  it("biometric ID + model != two_person_rule → finding CRITICAL Art. 14(4)", () => {
    const result = evaluateOversight({
      record: completeProtocol({ oversightModel: "human_in_the_loop" }),
      orgName: "Test Org",
      linkedSystem: biometricSystem(),
    })
    const biometricFinding = result.candidateFindings.find((f) =>
      f.title.match(/Biometric ID fără two_person_rule/),
    )
    expect(biometricFinding).toBeTruthy()
    expect(biometricFinding?.severity).toBe("critical")
    expect(biometricFinding?.legalReference).toMatch(/14\(4\)/)
  })

  it("biometric ID + model = two_person_rule → NO biometric finding", () => {
    const result = evaluateOversight({
      record: completeProtocol({ oversightModel: "two_person_rule" }),
      orgName: "Test Org",
      linkedSystem: biometricSystem(),
    })
    expect(
      result.candidateFindings.some((f) => f.title.match(/Biometric ID/)),
    ).toBe(false)
  })

  it("protocol complet → zero findings", () => {
    const result = evaluateOversight({
      record: completeProtocol(),
      orgName: "Test Org",
    })
    expect(result.candidateFindings.length).toBe(0)
    expect(result.completeness).toBe("complete")
  })

  it("nextReviewISO în trecut → finding medium overdue", () => {
    const past = new Date(Date.now() - 10 * 86_400_000).toISOString()
    const result = evaluateOversight({
      record: completeProtocol({ nextReviewISO: past }),
      orgName: "Test Org",
    })
    const overdue = result.candidateFindings.find((f) => f.title.match(/nereview/))
    expect(overdue).toBeTruthy()
    expect(overdue?.severity).toBe("medium")
  })

  it("toate findings au stable id prefixed cu oversight-finding-", () => {
    const result = evaluateOversight({
      record: baseProtocol(),
      orgName: "Test Org",
    })
    for (const f of result.candidateFindings) {
      expect(f.id).toMatch(/^oversight-finding-/)
      expect(f.category).toBe("EU_AI_ACT")
    }
  })
})

describe("evaluateOversight — markdown export", () => {
  it("generează markdown cu secțiuni A-E + checklist", () => {
    const md = evaluateOversight({
      record: completeProtocol(),
      orgName: "Org SRL",
      systemName: "HR Screening AI",
    }).generatedMarkdown
    expect(md).toContain("# Oversight Protocol — Test Oversight Protocol")
    expect(md).toContain("Org SRL")
    expect(md).toContain("HR Screening AI")
    expect(md).toContain("## A. Model oversight + sistem AI")
    expect(md).toContain("## B. Capacități Art. 14(3) acoperite")
    expect(md).toContain("## C. Persoane responsabile (Art. 26(2))")
    expect(md).toContain("## D. Escaladare")
    expect(md).toContain("## E. Stop + fallback")
    expect(md).toContain("## Checklist final")
  })

  it("markdown listează capacitățile lipsă explicit", () => {
    const md = evaluateOversight({
      record: baseProtocol({
        capabilitiesCovered: ["understand_capabilities"],
      }),
      orgName: "Org",
    }).generatedMarkdown
    expect(md).toMatch(/Lipsesc/)
    expect(md).toMatch(/automation bias/i)
  })
})
