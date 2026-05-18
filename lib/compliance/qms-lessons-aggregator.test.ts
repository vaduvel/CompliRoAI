import { describe, expect, it } from "vitest"

import {
  aggregateLessonsFromState,
  mergeAutoAndManualLessons,
} from "./qms-lessons-aggregator"
import type {
  AIIncident,
  PmmAnomalyRecord,
  PmmPlan,
  QmsLessonLearned,
  ScanFinding,
} from "@/lib/compliance/types"

// ── Test fixtures ────────────────────────────────────────────────────────────

function buildClosedIncident(overrides: Partial<AIIncident> = {}): AIIncident {
  return {
    id: "inc-1",
    orgId: "org-1",
    title: "Bias HR screening",
    description: "Bias detected in HR screening AI.",
    category: "fundamental_rights_infringement",
    severity: "serious",
    linkedAISystemId: "sys-1",
    affectedSubjectsCategories: ["candidati"],
    detectedAtISO: "2026-01-01T00:00:00.000Z",
    reportingDeadlineISO: "2026-01-16T00:00:00.000Z",
    reportingDeadlineDays: 15,
    notifications: [],
    notificationRequired: true,
    linkedFindingIds: [],
    status: "closed",
    closedAtISO: "2026-02-01T00:00:00.000Z",
    closureNotes: "Sistem recalibrat + politica monitorizare lunara introdusa.",
    rootCause: {
      identifiedAtISO: "2026-01-10T00:00:00.000Z",
      identifiedByEmail: "dpo@example.com",
      rootCauseDescription: "Training data biased toward demographic Y.",
      contributingFactors: ["Data quality"],
      evidenceCollected: ["Bias report"],
      remediationActions: ["Re-train model"],
      preventionActions: ["Monthly bias check"],
      preventiveMeasuresImplementedAtISO: "2026-01-20T00:00:00.000Z",
    },
    createdAtISO: "2026-01-01T00:00:00.000Z",
    updatedAtISO: "2026-02-01T00:00:00.000Z",
    ...overrides,
  }
}

function buildPmmPlan(anomalies: PmmAnomalyRecord[]): PmmPlan {
  return {
    id: "plan-1",
    orgId: "org-1",
    title: "PMM Sys-1",
    linkedAISystemId: "sys-1",
    dataCollectionMethods: ["system_logs"],
    dataCollectionFrequency: "monthly",
    dataCollectionDescription: "Logs colectate lunar.",
    complianceEvaluationMethods: ["bias check"],
    complianceMetricsTracked: ["accuracy"],
    correctiveActionProcess: "Doc.",
    preventiveActionProcess: "Doc.",
    reviewCycle: "quarterly",
    reviewCycleMonths: 3,
    reviews: [],
    versionChanges: [],
    anomalies,
    status: "active",
    completeness: "complete",
    freshnessStatus: "fresh",
    linkedFindingIds: [],
    createdAtISO: "2026-01-01T00:00:00.000Z",
    updatedAtISO: "2026-05-01T00:00:00.000Z",
  }
}

function buildAnomaly(
  overrides: Partial<PmmAnomalyRecord> = {},
): PmmAnomalyRecord {
  return {
    id: "anom-1",
    detectedAtISO: "2026-02-01T00:00:00.000Z",
    detectedByEmail: "ops@example.com",
    severity: "critical",
    category: "bias_drift",
    description: "Bias drift detected on demographic Y.",
    impactDescription: "Increased rejection rate for group Y.",
    resolved: true,
    resolvedAtISO: "2026-02-15T00:00:00.000Z",
    escalatedToIncident: false,
    notes: "Calibration applied.",
    ...overrides,
  }
}

function buildFinding(overrides: Partial<ScanFinding> = {}): ScanFinding {
  return {
    id: "fnd-1",
    title: "DPIA lipsa pentru sistem high-risk",
    detail: "Detalii finding.",
    category: "EU_AI_ACT",
    severity: "critical",
    risk: "high",
    principles: ["accountability"],
    createdAtISO: "2026-01-01T00:00:00.000Z",
    sourceDocument: "Sistemul Y",
    impactSummary: "Risc Art. 9 incomplet.",
    legalReference: "Art. 9",
    findingStatus: "resolved",
    findingStatusUpdatedAtISO: "2026-02-01T00:00:00.000Z",
    operationalEvidenceNote: "DPIA generat + aprobat de DPO.",
    ...overrides,
  }
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("QMS lessons aggregator — incidents", () => {
  it("aggregates closed incident with root cause as ai_incident lesson", () => {
    const state = {
      aiIncidents: [buildClosedIncident()],
      pmmPlans: [],
      findings: [],
    }
    const lessons = aggregateLessonsFromState(state)
    expect(lessons).toHaveLength(1)
    expect(lessons[0].source).toBe("ai_incident")
    expect(lessons[0].sourceEntityId).toBe("inc-1")
    expect(lessons[0].rootCauseSummary).toContain("biased")
    expect(lessons[0].preventiveActionsTaken).toContain("Monthly bias check")
    expect(lessons[0].applicableToSystems).toEqual(["sys-1"])
  })

  it("does NOT aggregate incident that is not closed", () => {
    const state = {
      aiIncidents: [buildClosedIncident({ status: "assessing", closedAtISO: undefined })],
      pmmPlans: [],
      findings: [],
    }
    expect(aggregateLessonsFromState(state)).toHaveLength(0)
  })

  it("does NOT aggregate closed incident without rootCause", () => {
    const state = {
      aiIncidents: [buildClosedIncident({ rootCause: undefined })],
      pmmPlans: [],
      findings: [],
    }
    expect(aggregateLessonsFromState(state)).toHaveLength(0)
  })

  it("stable IDs across runs (idempotent)", () => {
    const state = {
      aiIncidents: [buildClosedIncident()],
      pmmPlans: [],
      findings: [],
    }
    const l1 = aggregateLessonsFromState(state)
    const l2 = aggregateLessonsFromState(state)
    expect(l1[0].id).toBe(l2[0].id)
    expect(l1[0].id).toBe("qms-lesson-incident-inc-1")
  })
})

describe("QMS lessons aggregator — PMM anomalies", () => {
  it("aggregates resolved high-severity anomaly", () => {
    const anomaly = buildAnomaly({ severity: "high" })
    const state = {
      aiIncidents: [],
      pmmPlans: [buildPmmPlan([anomaly])],
      findings: [],
    }
    const lessons = aggregateLessonsFromState(state)
    expect(lessons).toHaveLength(1)
    expect(lessons[0].source).toBe("pmm_anomaly")
    expect(lessons[0].sourceEntityId).toBe("anom-1")
    expect(lessons[0].applicableToSystems).toEqual(["sys-1"])
  })

  it("does NOT aggregate unresolved anomaly", () => {
    const anomaly = buildAnomaly({ resolved: false })
    const state = {
      aiIncidents: [],
      pmmPlans: [buildPmmPlan([anomaly])],
      findings: [],
    }
    expect(aggregateLessonsFromState(state)).toHaveLength(0)
  })

  it("does NOT aggregate low-severity anomaly", () => {
    const anomaly = buildAnomaly({ severity: "low" })
    const state = {
      aiIncidents: [],
      pmmPlans: [buildPmmPlan([anomaly])],
      findings: [],
    }
    expect(aggregateLessonsFromState(state)).toHaveLength(0)
  })

  it("includes escalation note when escalated to incident", () => {
    const anomaly = buildAnomaly({ escalatedToIncident: true })
    const state = {
      aiIncidents: [],
      pmmPlans: [buildPmmPlan([anomaly])],
      findings: [],
    }
    const lessons = aggregateLessonsFromState(state)
    expect(lessons[0].resultingPolicyChange).toContain("escaladata")
  })

  it("stable IDs include plan + anomaly", () => {
    const anomaly = buildAnomaly({ id: "anom-X" })
    const plan = buildPmmPlan([anomaly])
    const state = { aiIncidents: [], pmmPlans: [plan], findings: [] }
    const lessons = aggregateLessonsFromState(state)
    expect(lessons[0].id).toBe(`qms-lesson-anomaly-${plan.id}-${anomaly.id}`)
  })
})

describe("QMS lessons aggregator — findings", () => {
  it("aggregates critical resolved finding with evidence note", () => {
    const state = {
      aiIncidents: [],
      pmmPlans: [],
      findings: [buildFinding()],
    }
    const lessons = aggregateLessonsFromState(state)
    expect(lessons).toHaveLength(1)
    expect(lessons[0].source).toBe("finding")
    expect(lessons[0].sourceEntityId).toBe("fnd-1")
    expect(lessons[0].preventiveActionsTaken).toContain("DPIA generat + aprobat de DPO.")
  })

  it("does NOT aggregate non-critical finding", () => {
    const state = {
      aiIncidents: [],
      pmmPlans: [],
      findings: [buildFinding({ severity: "medium" })],
    }
    expect(aggregateLessonsFromState(state)).toHaveLength(0)
  })

  it("does NOT aggregate finding without evidence note", () => {
    const state = {
      aiIncidents: [],
      pmmPlans: [],
      findings: [buildFinding({ operationalEvidenceNote: undefined })],
    }
    expect(aggregateLessonsFromState(state)).toHaveLength(0)
  })

  it("does NOT aggregate unresolved finding", () => {
    const state = {
      aiIncidents: [],
      pmmPlans: [],
      findings: [buildFinding({ findingStatus: "open" })],
    }
    expect(aggregateLessonsFromState(state)).toHaveLength(0)
  })
})

describe("QMS lessons aggregator — multi-source", () => {
  it("aggregates from incidents + anomalies + findings simultaneously", () => {
    const state = {
      aiIncidents: [buildClosedIncident()],
      pmmPlans: [buildPmmPlan([buildAnomaly()])],
      findings: [buildFinding()],
    }
    const lessons = aggregateLessonsFromState(state)
    const sources = lessons.map((l) => l.source).sort()
    expect(sources).toEqual(["ai_incident", "finding", "pmm_anomaly"])
  })
})

describe("QMS lessons aggregator — mergeAutoAndManualLessons", () => {
  it("preserves manual lessons", () => {
    const manual: QmsLessonLearned = {
      id: "manual-1",
      source: "manual",
      title: "Lectie manuala",
      rootCauseSummary: "Cauza",
      preventiveActionsTaken: ["A1"],
      recordedAtISO: "2026-05-01T00:00:00.000Z",
      recordedByEmail: "user@example.com",
      applicableToSystems: [],
    }
    const merged = mergeAutoAndManualLessons([manual], [])
    expect(merged).toHaveLength(1)
    expect(merged[0].source).toBe("manual")
  })

  it("merges auto lessons fresh over existing same-id", () => {
    const oldAuto: QmsLessonLearned = {
      id: "qms-lesson-incident-inc-1",
      source: "ai_incident",
      sourceEntityId: "inc-1",
      title: "Old title",
      rootCauseSummary: "Old cause",
      preventiveActionsTaken: [],
      recordedAtISO: "2025-12-01T00:00:00.000Z",
      recordedByEmail: "x@example.com",
      applicableToSystems: ["sys-1"],
    }
    const newAuto: QmsLessonLearned = {
      ...oldAuto,
      title: "New title",
      rootCauseSummary: "New cause",
      recordedAtISO: "2026-05-01T00:00:00.000Z",
    }
    const merged = mergeAutoAndManualLessons([oldAuto], [newAuto])
    expect(merged).toHaveLength(1)
    expect(merged[0].title).toBe("New title")
    expect(merged[0].rootCauseSummary).toBe("New cause")
  })

  it("retains orphan auto lessons (source entity deleted)", () => {
    const orphan: QmsLessonLearned = {
      id: "qms-lesson-incident-deleted",
      source: "ai_incident",
      sourceEntityId: "deleted",
      title: "Orphan",
      rootCauseSummary: "",
      preventiveActionsTaken: [],
      recordedAtISO: "2026-01-01T00:00:00.000Z",
      recordedByEmail: "x@example.com",
      applicableToSystems: [],
    }
    const merged = mergeAutoAndManualLessons([orphan], [])
    expect(merged).toHaveLength(1)
  })

  it("sorts lessons newest-first", () => {
    const a: QmsLessonLearned = {
      id: "a",
      source: "manual",
      title: "A",
      rootCauseSummary: "",
      preventiveActionsTaken: [],
      recordedAtISO: "2026-01-01T00:00:00.000Z",
      recordedByEmail: "x@example.com",
      applicableToSystems: [],
    }
    const b: QmsLessonLearned = {
      ...a,
      id: "b",
      title: "B",
      recordedAtISO: "2026-05-01T00:00:00.000Z",
    }
    const merged = mergeAutoAndManualLessons([a], [b])
    expect(merged[0].id).toBe("b")
    expect(merged[1].id).toBe("a")
  })
})
