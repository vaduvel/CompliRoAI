import { describe, expect, it } from "vitest"

import {
  computePmmCompleteness,
  computePmmFreshnessStatus,
  evaluatePmm,
  findCriticalUnresolvedAnomalies,
  findUnreassessedSubstantialChanges,
} from "@/lib/compliance/pmm-evaluator"
import type {
  AISystemRecord,
  PmmAnomalyRecord,
  PmmPlan,
  PmmReviewRecord,
  PmmVersionChangeRecord,
} from "@/lib/compliance/types"

function makePlan(overrides: Partial<PmmPlan> = {}): PmmPlan {
  return {
    id: "pmm-1",
    orgId: "org-1",
    title: "Test PMM Plan",
    linkedAISystemId: "sys-1",
    dataCollectionMethods: ["system_logs", "performance_metrics", "user_feedback"],
    dataCollectionFrequency: "daily",
    dataCollectionDescription:
      "SIEM Splunk recepționează evenimente Art. 12 real-time, dashboard zilnic agregă accuracy/bias/latency.",
    complianceEvaluationMethods: ["comparare rezultate AI vs ground truth lunar"],
    complianceMetricsTracked: ["accuracy", "bias_gap"],
    correctiveActionProcess:
      "Pragul accuracy < 0.85 declanșează review; ML lead aprobă roll-back la versiunea N-1 în 4h.",
    preventiveActionProcess:
      "PSI > 0.2 declanșează retrain candidat; bias audit trimestrial pe 5 grupuri.",
    reviewCycle: "quarterly",
    reviewCycleMonths: 3,
    reviews: [],
    versionChanges: [],
    anomalies: [],
    status: "active",
    completeness: "complete",
    freshnessStatus: "fresh",
    linkedFindingIds: [],
    createdAtISO: "2026-04-01T00:00:00.000Z",
    updatedAtISO: "2026-04-01T00:00:00.000Z",
    ...overrides,
  }
}

function makeSystem(overrides: Partial<AISystemRecord> = {}): AISystemRecord {
  return {
    id: "sys-1",
    name: "Test HR AI",
    purpose: "hr-screening",
    vendor: "InternalML",
    modelType: "xgboost",
    usesPersonalData: true,
    makesAutomatedDecisions: true,
    impactsRights: true,
    hasHumanReview: true,
    riskLevel: "high",
    recommendedActions: [],
    createdAtISO: "2026-04-01T00:00:00.000Z",
    ...overrides,
  }
}

describe("PMM evaluator — completeness", () => {
  it("plan complet → completeness=complete", () => {
    const r = computePmmCompleteness(makePlan())
    expect(r.completeness).toBe("complete")
    expect(r.reasons).toHaveLength(0)
  })

  it("plan cu 2 metode + restul ok → partial", () => {
    const r = computePmmCompleteness(
      makePlan({
        dataCollectionMethods: ["system_logs", "performance_metrics"],
      }),
    )
    expect(r.completeness).toBe("partial")
    expect(r.reasons[0]).toContain("metode")
  })

  it("plan fără proces corectiv + fără preventiv → incomplete", () => {
    const r = computePmmCompleteness(
      makePlan({
        correctiveActionProcess: "",
        preventiveActionProcess: "",
        complianceEvaluationMethods: [],
        complianceMetricsTracked: [],
      }),
    )
    expect(r.completeness).toBe("incomplete")
    expect(r.reasons.length).toBeGreaterThanOrEqual(3)
  })
})

describe("PMM evaluator — freshness", () => {
  const nowMs = new Date("2026-05-15T00:00:00.000Z").getTime()

  it("no reviews + no nextReviewISO → no_reviews", () => {
    expect(computePmmFreshnessStatus(makePlan(), nowMs)).toBe("no_reviews")
  })

  it("review în viitor > 30 zile → fresh", () => {
    const plan = makePlan({
      reviews: [
        {
          id: "rv-1",
          reviewDateISO: "2026-05-01T00:00:00.000Z",
          reviewedByEmail: "dpo@x.com",
          reviewType: "scheduled",
          performanceMetrics: {},
          risksDetected: [],
          correctiveActions: [],
          preventiveActions: [],
          nextReviewISO: "2026-08-01T00:00:00.000Z",
        },
      ],
      nextReviewISO: "2026-08-01T00:00:00.000Z",
    })
    expect(computePmmFreshnessStatus(plan, nowMs)).toBe("fresh")
  })

  it("nextReviewISO în < 30 zile → due_soon", () => {
    const plan = makePlan({
      reviews: [
        {
          id: "rv-1",
          reviewDateISO: "2026-02-15T00:00:00.000Z",
          reviewedByEmail: "dpo@x.com",
          reviewType: "scheduled",
          performanceMetrics: {},
          risksDetected: [],
          correctiveActions: [],
          preventiveActions: [],
          nextReviewISO: "2026-05-25T00:00:00.000Z",
        },
      ],
      nextReviewISO: "2026-05-25T00:00:00.000Z",
    })
    expect(computePmmFreshnessStatus(plan, nowMs)).toBe("due_soon")
  })

  it("nextReviewISO în trecut → overdue", () => {
    const plan = makePlan({
      reviews: [
        {
          id: "rv-1",
          reviewDateISO: "2026-01-01T00:00:00.000Z",
          reviewedByEmail: "dpo@x.com",
          reviewType: "scheduled",
          performanceMetrics: {},
          risksDetected: [],
          correctiveActions: [],
          preventiveActions: [],
          nextReviewISO: "2026-04-01T00:00:00.000Z",
        },
      ],
      nextReviewISO: "2026-04-01T00:00:00.000Z",
    })
    expect(computePmmFreshnessStatus(plan, nowMs)).toBe("overdue")
  })
})

describe("PMM evaluator — substantial mod tracking (Art. 43(4))", () => {
  const nowMs = new Date("2026-05-15T00:00:00.000Z").getTime()

  it("schimbare substanțială cu reassessment cerut + fără follow-up + > 30 zile → flagged", () => {
    const change: PmmVersionChangeRecord = {
      id: "vc-1",
      changedAtISO: "2026-04-01T00:00:00.000Z",
      changedByEmail: "ml@x.com",
      oldVersion: "v1.0",
      newVersion: "v2.0",
      changeType: "model_retrain",
      substantialModification: true,
      riskReassessmentRequired: true,
      description: "Retrain pe set nou date",
    }
    const list = findUnreassessedSubstantialChanges(
      makePlan({ versionChanges: [change], reviews: [] }),
      nowMs,
    )
    expect(list).toHaveLength(1)
  })

  it("schimbare substanțială cu review follow-up în 30 zile → NU flagged", () => {
    const change: PmmVersionChangeRecord = {
      id: "vc-1",
      changedAtISO: "2026-04-01T00:00:00.000Z",
      changedByEmail: "ml@x.com",
      oldVersion: "v1.0",
      newVersion: "v2.0",
      changeType: "model_retrain",
      substantialModification: true,
      riskReassessmentRequired: true,
      description: "Retrain",
    }
    const followUp: PmmReviewRecord = {
      id: "rv-1",
      reviewDateISO: "2026-04-15T00:00:00.000Z",
      reviewedByEmail: "dpo@x.com",
      reviewType: "incident_triggered",
      performanceMetrics: {},
      risksDetected: [],
      correctiveActions: [],
      preventiveActions: [],
      nextReviewISO: "2026-07-15T00:00:00.000Z",
    }
    const list = findUnreassessedSubstantialChanges(
      makePlan({ versionChanges: [change], reviews: [followUp] }),
      nowMs,
    )
    expect(list).toHaveLength(0)
  })

  it("schimbare NON-substanțială → ignored", () => {
    const change: PmmVersionChangeRecord = {
      id: "vc-1",
      changedAtISO: "2026-04-01T00:00:00.000Z",
      changedByEmail: "ml@x.com",
      oldVersion: "v1.0",
      newVersion: "v1.1",
      changeType: "config_update",
      substantialModification: false,
      riskReassessmentRequired: false,
      description: "Tweak threshold",
    }
    const list = findUnreassessedSubstantialChanges(
      makePlan({ versionChanges: [change] }),
      nowMs,
    )
    expect(list).toHaveLength(0)
  })
})

describe("PMM evaluator — critical anomalies", () => {
  const nowMs = new Date("2026-05-15T00:00:00.000Z").getTime()

  it("critical nerezolvată > 7 zile → flagged", () => {
    const a: PmmAnomalyRecord = {
      id: "ano-1",
      detectedAtISO: "2026-05-01T00:00:00.000Z",
      severity: "critical",
      category: "bias_drift",
      description: "bias gap > 15%",
      impactDescription: "afectează deciziile pentru grup protejat",
      resolved: false,
      escalatedToIncident: false,
    }
    expect(findCriticalUnresolvedAnomalies(makePlan({ anomalies: [a] }), nowMs)).toHaveLength(1)
  })

  it("critical rezolvată → ignorată", () => {
    const a: PmmAnomalyRecord = {
      id: "ano-1",
      detectedAtISO: "2026-05-01T00:00:00.000Z",
      severity: "critical",
      category: "system_error",
      description: "crash",
      impactDescription: "downtime",
      resolved: true,
      resolvedAtISO: "2026-05-02T00:00:00.000Z",
      escalatedToIncident: false,
    }
    expect(findCriticalUnresolvedAnomalies(makePlan({ anomalies: [a] }), nowMs)).toHaveLength(0)
  })

  it("high nerezolvată → ignorată (doar critical)", () => {
    const a: PmmAnomalyRecord = {
      id: "ano-1",
      detectedAtISO: "2026-05-01T00:00:00.000Z",
      severity: "high",
      category: "performance_drop",
      description: "accuracy drop",
      impactDescription: "lower SLA",
      resolved: false,
      escalatedToIncident: false,
    }
    expect(findCriticalUnresolvedAnomalies(makePlan({ anomalies: [a] }), nowMs)).toHaveLength(0)
  })
})

describe("PMM evaluator — aggregate", () => {
  const nowISO = "2026-05-15T00:00:00.000Z"

  it("plan complet + high-risk → fără finding plan-incomplete-highrisk", () => {
    const res = evaluatePmm({
      record: makePlan(),
      orgName: "ACME",
      systemName: "HR AI",
      linkedSystem: makeSystem(),
      nowISO,
    })
    expect(res.completeness).toBe("complete")
    expect(res.candidateFindings.find((f) => f.id.includes("plan-incomplete-highrisk"))).toBeUndefined()
  })

  it("plan incomplete + high-risk → finding plan-incomplete-highrisk severity high", () => {
    const res = evaluatePmm({
      record: makePlan({
        dataCollectionMethods: [],
        complianceEvaluationMethods: [],
        complianceMetricsTracked: [],
        correctiveActionProcess: "",
        preventiveActionProcess: "",
      }),
      orgName: "ACME",
      systemName: "HR AI",
      linkedSystem: makeSystem(),
      nowISO,
    })
    expect(res.completeness).toBe("incomplete")
    const finding = res.candidateFindings.find((f) => f.id.includes("plan-incomplete-highrisk"))
    expect(finding).toBeDefined()
    expect(finding!.severity).toBe("high")
    expect(finding!.legalReference).toContain("Art. 72(1)")
  })

  it("substantial mod fără follow-up → finding CRITICAL Art. 43(4)", () => {
    const change: PmmVersionChangeRecord = {
      id: "vc-1",
      changedAtISO: "2026-04-01T00:00:00.000Z",
      changedByEmail: "ml@x.com",
      oldVersion: "v1.0",
      newVersion: "v2.0",
      changeType: "model_retrain",
      substantialModification: true,
      riskReassessmentRequired: true,
      description: "Retrain",
    }
    const res = evaluatePmm({
      record: makePlan({ versionChanges: [change], reviews: [] }),
      orgName: "ACME",
      linkedSystem: makeSystem(),
      nowISO,
    })
    const finding = res.candidateFindings.find((f) =>
      f.id.includes("substantial-change") && f.id.includes("no-reassessment"),
    )
    expect(finding).toBeDefined()
    expect(finding!.severity).toBe("critical")
    expect(finding!.legalReference).toContain("Art. 43(4)")
  })

  it("anomalie critică nerezolvată > 7 zile → finding high", () => {
    const a: PmmAnomalyRecord = {
      id: "ano-1",
      detectedAtISO: "2026-05-01T00:00:00.000Z",
      severity: "critical",
      category: "bias_drift",
      description: "bias gap > 15%",
      impactDescription: "afectează deciziile pentru grup protejat",
      resolved: false,
      escalatedToIncident: false,
    }
    const res = evaluatePmm({
      record: makePlan({ anomalies: [a] }),
      orgName: "ACME",
      linkedSystem: makeSystem(),
      nowISO,
    })
    const finding = res.candidateFindings.find((f) => f.id.includes("anomaly") && f.id.includes("unresolved"))
    expect(finding).toBeDefined()
    expect(finding!.severity).toBe("high")
    expect(finding!.legalReference).toContain("Art. 72(4)")
  })

  it("review overdue → finding high cu legal Art. 72(2)", () => {
    const res = evaluatePmm({
      record: makePlan({
        reviews: [
          {
            id: "rv-1",
            reviewDateISO: "2026-01-01T00:00:00.000Z",
            reviewedByEmail: "dpo@x.com",
            reviewType: "scheduled",
            performanceMetrics: {},
            risksDetected: [],
            correctiveActions: [],
            preventiveActions: [],
            nextReviewISO: "2026-04-01T00:00:00.000Z",
          },
        ],
        nextReviewISO: "2026-04-01T00:00:00.000Z",
        lastReviewAtISO: "2026-01-01T00:00:00.000Z",
      }),
      orgName: "ACME",
      linkedSystem: makeSystem(),
      nowISO,
    })
    expect(res.freshnessStatus).toBe("overdue")
    const finding = res.candidateFindings.find((f) => f.id.includes("review-overdue"))
    expect(finding).toBeDefined()
    expect(finding!.severity).toBe("high")
    expect(finding!.legalReference).toContain("Art. 72(2)")
  })

  it("markdown export include toate cele 4 secțiuni A-D + reviews + version changes + anomalies", () => {
    const res = evaluatePmm({
      record: makePlan(),
      orgName: "ACME",
      systemName: "HR AI",
      linkedSystem: makeSystem(),
      nowISO,
    })
    expect(res.generatedMarkdown).toContain("# PMM Plan — Test PMM Plan")
    expect(res.generatedMarkdown).toContain("## A. Sistem AI")
    expect(res.generatedMarkdown).toContain("## B. Data collection")
    expect(res.generatedMarkdown).toContain("## C. Evaluare conformitate")
    expect(res.generatedMarkdown).toContain("## D. Acțiune corectivă + preventivă")
    expect(res.generatedMarkdown).toContain("## Reviews periodice")
    expect(res.generatedMarkdown).toContain("## Version changes")
    expect(res.generatedMarkdown).toContain("## Anomalii detectate")
    expect(res.generatedMarkdown).toContain("## Checklist final")
    expect(res.generatedMarkdown).toContain("Art. 72")
  })

  it("findings primesc stable IDs prefixate cu pmm-finding-", () => {
    const res = evaluatePmm({
      record: makePlan({ dataCollectionMethods: [] }),
      orgName: "ACME",
      linkedSystem: makeSystem(),
      nowISO,
    })
    for (const f of res.candidateFindings) {
      expect(f.id.startsWith("pmm-finding-")).toBe(true)
    }
  })
})
