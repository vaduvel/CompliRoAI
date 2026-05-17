// Sprint 019 — pmm-store tests.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/server/org-context", () => ({
  getOrgContext: vi.fn(async () => ({
    orgId: "org-pmm-test",
    userId: "user-pmm-test",
    email: "pmm@example.com",
    orgName: "Test PMM Org",
    workspaceMode: "ai-builder",
  })),
}))

vi.mock("@/lib/server/fs-safe", () => ({
  writeFileSafe: vi.fn(async () => {}),
}))

vi.mock("node:fs", async () => {
  const actual = await vi.importActual<typeof import("node:fs")>("node:fs")
  return {
    ...actual,
    promises: {
      ...actual.promises,
      readFile: vi.fn(async () => {
        throw new Error("ENOENT")
      }),
    },
  }
})

import type { ComplianceEventActorInput } from "@/lib/compliance/events"
import { mutateFreshStateForOrg, readState } from "@/lib/server/store"
import {
  buildPmmMarkdown,
  createPlan,
  deletePlan,
  getPmmPlanById,
  markPlanApproved,
  markPlanRejected,
  readPmmPlans,
  recordAnomaly,
  recordReview,
  recordVersionChange,
  scheduleReviewReminder,
  summarizePmmPlans,
  updatePlan,
  type CreatePmmInput,
} from "@/lib/server/pmm-store"

const ACTOR: ComplianceEventActorInput = {
  id: "user-pmm-test",
  label: "pmm@example.com",
  role: "compliance",
  source: "session",
}
const ORG = "org-pmm-test"

function baseInput(overrides: Partial<CreatePmmInput> = {}): CreatePmmInput {
  return {
    title: "PMM HR Screening",
    linkedAISystemId: "sys-1",
    dataCollectionMethods: ["system_logs", "performance_metrics", "user_feedback"],
    dataCollectionFrequency: "daily",
    dataCollectionDescription:
      "SIEM Splunk recepționează evenimente real-time, dashboard zilnic agregă metrici.",
    complianceEvaluationMethods: ["comparare AI vs ground truth lunar"],
    complianceMetricsTracked: ["accuracy", "bias_gap_demographic"],
    correctiveActionProcess:
      "Pragul accuracy < 0.85 declanșează review; ML lead aprobă roll-back în 4h.",
    preventiveActionProcess:
      "PSI > 0.2 declanșează retrain candidat; bias audit trimestrial.",
    reviewCycle: "quarterly",
    ...overrides,
  }
}

beforeEach(async () => {
  await mutateFreshStateForOrg(ORG, (s) => ({
    ...s,
    pmmPlans: [],
    findings: [],
    events: [],
    aiSystems: [
      {
        id: "sys-1",
        name: "Credit Scoring AI",
        purpose: "credit-scoring",
        vendor: "TestVendor",
        modelType: "xgboost",
        usesPersonalData: true,
        makesAutomatedDecisions: true,
        impactsRights: true,
        hasHumanReview: true,
        riskLevel: "high",
        recommendedActions: [],
        createdAtISO: "2026-05-01T00:00:00Z",
      },
    ],
  }))
})

afterEach(() => {
  vi.clearAllMocks()
})

describe("pmm-store — CRUD basic", () => {
  it("createPlan salvează + emite event pmm.created + computează reviewCycleMonths", async () => {
    const rec = await createPlan(ORG, baseInput(), ACTOR, "Org SRL")
    expect(rec.id).toMatch(/^pmm-/)
    expect(rec.completeness).toBe("complete")
    expect(rec.status).toBe("draft")
    expect(rec.freshnessStatus).toBe("no_reviews")
    expect(rec.reviewCycleMonths).toBe(3)
    expect(rec.reviewCycle).toBe("quarterly")

    const state = await readState()
    const evt = state.events?.find(
      (e) => e.entityId === rec.id && e.type === "pmm.created",
    )
    expect(evt).toBeTruthy()
    expect(evt?.selfHash).toMatch(/^[0-9a-f]{64}$/)
  })

  it("createPlan incomplete pe sistem high-risk emite finding plan-incomplete-highrisk", async () => {
    const rec = await createPlan(
      ORG,
      baseInput({
        dataCollectionMethods: [],
        complianceEvaluationMethods: [],
        complianceMetricsTracked: [],
        correctiveActionProcess: "",
        preventiveActionProcess: "",
      }),
      ACTOR,
    )
    expect(rec.completeness).toBe("incomplete")
    expect(rec.linkedFindingIds.length).toBeGreaterThanOrEqual(1)
    const state = await readState()
    const finding = state.findings?.find((f) =>
      rec.linkedFindingIds.includes(f.id) && f.title.includes("Lipsește PMM"),
    )
    expect(finding).toBeTruthy()
    expect(finding!.severity).toBe("high")
    expect(finding!.legalReference).toContain("Art. 72(1)")
  })

  it("createPlan fără title aruncă", async () => {
    await expect(
      createPlan(ORG, baseInput({ title: "" }), ACTOR),
    ).rejects.toThrow()
  })

  it("createPlan fără dataCollectionDescription aruncă", async () => {
    await expect(
      createPlan(ORG, baseInput({ dataCollectionDescription: "" }), ACTOR),
    ).rejects.toThrow()
  })

  it("readPmmPlans + summary totalează corect", async () => {
    await createPlan(ORG, baseInput({ title: "P1" }), ACTOR)
    await createPlan(
      ORG,
      baseInput({ title: "P2", dataCollectionMethods: [] }),
      ACTOR,
    )
    const { records, summary } = await readPmmPlans(ORG)
    expect(records.length).toBe(2)
    expect(summary.total).toBe(2)
    expect(summary.complete).toBeGreaterThanOrEqual(1)
    expect(summary.noReviews).toBe(2)
  })

  it("updatePlan merge patch + recomputează reviewCycleMonths la schimbarea ciclului", async () => {
    const created = await createPlan(ORG, baseInput(), ACTOR)
    expect(created.reviewCycleMonths).toBe(3)
    const updated = await updatePlan(
      ORG,
      created.id,
      { reviewCycle: "monthly" },
      ACTOR,
    )
    expect(updated).toBeTruthy()
    expect(updated!.reviewCycle).toBe("monthly")
    expect(updated!.reviewCycleMonths).toBe(1)
  })

  it("deletePlan șterge + emite event pmm.deleted", async () => {
    const created = await createPlan(ORG, baseInput(), ACTOR)
    const removed = await deletePlan(ORG, created.id, ACTOR)
    expect(removed).toBe(true)
    const after = await getPmmPlanById(ORG, created.id)
    expect(after).toBeNull()
  })
})

describe("pmm-store — approve / reject", () => {
  it("markPlanApproved setează status active + approvedByEmail + nextReviewISO", async () => {
    const created = await createPlan(ORG, baseInput(), ACTOR)
    const approved = await markPlanApproved(
      ORG,
      created.id,
      "dpo@org.ro",
      ACTOR,
    )
    expect(approved!.status).toBe("active")
    expect(approved!.approvedByEmail).toBe("dpo@org.ro")
    expect(approved!.approvedAtISO).toBeTruthy()
    expect(approved!.nextReviewISO).toBeTruthy()
  })

  it("markPlanApproved fără email valid aruncă", async () => {
    const created = await createPlan(ORG, baseInput(), ACTOR)
    await expect(markPlanApproved(ORG, created.id, "", ACTOR)).rejects.toThrow()
    await expect(
      markPlanApproved(ORG, created.id, "noemailhere", ACTOR),
    ).rejects.toThrow()
  })

  it("markPlanRejected setează status rejected + rejectionReason", async () => {
    const created = await createPlan(ORG, baseInput(), ACTOR)
    const rejected = await markPlanRejected(
      ORG,
      created.id,
      "Proces corectiv insuficient",
      ACTOR,
    )
    expect(rejected!.status).toBe("rejected")
    expect(rejected!.rejectionReason).toBe("Proces corectiv insuficient")
  })
})

describe("pmm-store — recordReview", () => {
  it("recordReview adaugă review + setează lastReviewAtISO + recalculează nextReviewISO", async () => {
    const created = await createPlan(ORG, baseInput(), ACTOR)
    const updated = await recordReview(
      ORG,
      created.id,
      {
        reviewType: "scheduled",
        reviewedByEmail: "dpo@org.ro",
        performanceMetrics: { accuracy: 0.92 },
        risksDetected: ["bias gap în creștere"],
        correctiveActions: ["retrain Q3"],
        preventiveActions: ["bias audit lunar"],
      },
      ACTOR,
    )
    expect(updated!.reviews).toHaveLength(1)
    expect(updated!.lastReviewAtISO).toBeTruthy()
    expect(updated!.nextReviewISO).toBeTruthy()
    expect(updated!.freshnessStatus).toBe("fresh")
    expect(updated!.reviews[0].risksDetected).toContain("bias gap în creștere")
    const state = await readState()
    const evt = state.events?.find(
      (e) => e.entityId === created.id && e.type === "pmm.review_recorded",
    )
    expect(evt).toBeTruthy()
  })

  it("recordReview fără email aruncă", async () => {
    const created = await createPlan(ORG, baseInput(), ACTOR)
    await expect(
      recordReview(
        ORG,
        created.id,
        { reviewType: "scheduled", reviewedByEmail: "" },
        ACTOR,
      ),
    ).rejects.toThrow()
  })
})

describe("pmm-store — recordVersionChange", () => {
  it("recordVersionChange adaugă schimbare + emite event pmm.version_change_recorded", async () => {
    const created = await createPlan(ORG, baseInput(), ACTOR)
    const updated = await recordVersionChange(
      ORG,
      created.id,
      {
        oldVersion: "v1.0",
        newVersion: "v1.1",
        changeType: "config_update",
        substantialModification: false,
        riskReassessmentRequired: false,
        description: "Tweak threshold",
        changedByEmail: "ml@org.ro",
      },
      ACTOR,
    )
    expect(updated!.versionChanges).toHaveLength(1)
    const state = await readState()
    const evt = state.events?.find(
      (e) =>
        e.entityId === created.id && e.type === "pmm.version_change_recorded",
    )
    expect(evt).toBeTruthy()
  })

  it("recordVersionChange substantial cu reassessment cerut + change vechi > 30 zile fără follow-up → finding CRITICAL Art. 43(4)", async () => {
    const created = await createPlan(ORG, baseInput(), ACTOR)
    const oldChangedISO = new Date(Date.now() - 60 * 86_400_000).toISOString()
    const updated = await recordVersionChange(
      ORG,
      created.id,
      {
        oldVersion: "v1.0",
        newVersion: "v2.0",
        changeType: "model_retrain",
        substantialModification: true,
        riskReassessmentRequired: true,
        description: "Retrain pe dataset extins",
        changedByEmail: "ml@org.ro",
        changedAtISO: oldChangedISO,
      },
      ACTOR,
    )
    expect(updated!.versionChanges).toHaveLength(1)
    const state = await readState()
    const critical = state.findings?.find(
      (f) =>
        updated!.linkedFindingIds.includes(f.id) &&
        f.title.includes("Modificare substanțială") &&
        f.severity === "critical",
    )
    expect(critical).toBeTruthy()
    expect(critical!.legalReference).toContain("Art. 43(4)")
  })

  it("recordVersionChange fără email aruncă", async () => {
    const created = await createPlan(ORG, baseInput(), ACTOR)
    await expect(
      recordVersionChange(
        ORG,
        created.id,
        {
          oldVersion: "v1",
          newVersion: "v2",
          changeType: "other",
          substantialModification: false,
          riskReassessmentRequired: false,
          description: "x",
          changedByEmail: "",
        },
        ACTOR,
      ),
    ).rejects.toThrow()
  })
})

describe("pmm-store — recordAnomaly", () => {
  it("recordAnomaly low severity → emite event, NU emite finding critical", async () => {
    const created = await createPlan(ORG, baseInput(), ACTOR)
    const baseFindingsCount = created.linkedFindingIds.length
    const updated = await recordAnomaly(
      ORG,
      created.id,
      {
        severity: "low",
        category: "performance_drop",
        description: "latency p95 crescut 50ms",
        impactDescription: "ușoară degradare UX",
      },
      ACTOR,
    )
    expect(updated!.anomalies).toHaveLength(1)
    expect(updated!.linkedFindingIds.length).toBe(baseFindingsCount)
    const state = await readState()
    const evt = state.events?.find(
      (e) => e.entityId === created.id && e.type === "pmm.anomaly_recorded",
    )
    expect(evt).toBeTruthy()
  })

  it("recordAnomaly critical nerezolvat → emite IMEDIAT finding critical", async () => {
    const created = await createPlan(ORG, baseInput(), ACTOR)
    const baseFindingsCount = created.linkedFindingIds.length
    const updated = await recordAnomaly(
      ORG,
      created.id,
      {
        severity: "critical",
        category: "bias_drift",
        description: "bias gap demografic > 20%",
        impactDescription: "decizii inegale pentru femei",
      },
      ACTOR,
    )
    expect(updated!.linkedFindingIds.length).toBeGreaterThan(baseFindingsCount)
    const state = await readState()
    const critical = state.findings?.find(
      (f) =>
        updated!.linkedFindingIds.includes(f.id) && f.severity === "critical",
    )
    expect(critical).toBeTruthy()
    expect(critical!.title).toContain("Anomalie CRITICAL")
    expect(critical!.legalReference).toContain("Art. 72(4)")
  })

  it("recordAnomaly critical REZOLVAT (input.resolved=true) → NU emite finding", async () => {
    const created = await createPlan(ORG, baseInput(), ACTOR)
    const baseFindingsCount = created.linkedFindingIds.length
    const updated = await recordAnomaly(
      ORG,
      created.id,
      {
        severity: "critical",
        category: "system_error",
        description: "crash recurent",
        impactDescription: "downtime 5 minute",
        resolved: true,
        resolvedAtISO: new Date().toISOString(),
      },
      ACTOR,
    )
    expect(updated!.linkedFindingIds.length).toBe(baseFindingsCount)
  })

  it("recordAnomaly fără descriere aruncă", async () => {
    const created = await createPlan(ORG, baseInput(), ACTOR)
    await expect(
      recordAnomaly(
        ORG,
        created.id,
        {
          severity: "medium",
          category: "other",
          description: "",
          impactDescription: "x",
        },
        ACTOR,
      ),
    ).rejects.toThrow()
  })
})

describe("pmm-store — scheduling + markdown + summary", () => {
  it("scheduleReviewReminder emite event pmm.review_reminder_scheduled", async () => {
    const created = await createPlan(ORG, baseInput(), ACTOR)
    await markPlanApproved(ORG, created.id, "dpo@org.ro", ACTOR)
    const result = await scheduleReviewReminder(ORG, created.id, 14, ACTOR)
    expect(result).toBeTruthy()
    const state = await readState()
    const evt = state.events?.find(
      (e) =>
        e.entityId === created.id && e.type === "pmm.review_reminder_scheduled",
    )
    expect(evt).toBeTruthy()
    expect(evt?.metadata?.daysBeforeReview).toBe(14)
  })

  it("scheduleReviewReminder cu days invalid aruncă", async () => {
    const created = await createPlan(ORG, baseInput(), ACTOR)
    await expect(scheduleReviewReminder(ORG, created.id, -1, ACTOR)).rejects.toThrow()
    await expect(scheduleReviewReminder(ORG, created.id, 500, ACTOR)).rejects.toThrow()
  })

  it("buildPmmMarkdown generează MD complet", async () => {
    const created = await createPlan(ORG, baseInput({ title: "MD Export" }), ACTOR)
    const md = buildPmmMarkdown(created, "Org SRL", "Credit Scoring AI")
    expect(md).toContain("# PMM Plan — MD Export")
    expect(md).toContain("Org SRL")
    expect(md).toContain("A. Sistem AI")
    expect(md).toContain("B. Data collection")
    expect(md).toContain("C. Evaluare conformitate")
    expect(md).toContain("D. Acțiune corectivă + preventivă")
  })

  it("summarizePmmPlans pe array gol returnează 0-uri", () => {
    const s = summarizePmmPlans([])
    expect(s.total).toBe(0)
    expect(s.fresh).toBe(0)
    expect(s.unresolvedAnomalies).toBe(0)
    expect(s.substantialChangesPending).toBe(0)
  })
})
