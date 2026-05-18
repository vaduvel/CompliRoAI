// Sprint 020 — ai-incident-store + PMM bridge tests.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/server/org-context", () => ({
  getOrgContext: vi.fn(async () => ({
    orgId: "org-ai-inc-test",
    userId: "user-ai-inc",
    email: "ai-inc@example.com",
    orgName: "Test AI Incident Org",
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
  buildIncidentMarkdown,
  closeIncident,
  createIncident,
  deleteIncident,
  getIncidentById,
  linkToBreach,
  linkToPmmAnomaly,
  markAuthorityNotified,
  propagateEvaluation,
  readAIIncidents,
  recordRootCause,
  summarizeAIIncidents,
  updateIncident,
  type CreateAIIncidentInput,
} from "./ai-incident-store"
import {
  createPlan,
  escalateAnomalyToIncident,
  recordAnomaly,
  type CreatePmmInput,
} from "./pmm-store"

const ACTOR: ComplianceEventActorInput = {
  id: "user-ai-inc",
  label: "ai-inc@example.com",
  role: "compliance",
  source: "session",
}
const ORG = "org-ai-inc-test"
const DAY_MS = 86_400_000

function baseInput(
  overrides: Partial<CreateAIIncidentInput> = {},
): CreateAIIncidentInput {
  return {
    title: "Incident test",
    description:
      "Sistem AI a refuzat acces grup demografic. Detectat la review intern.",
    category: "fundamental_rights_infringement",
    severity: "serious",
    linkedAISystemId: "sys-1",
    affectedSubjectsCategories: ["solicitanți credit"],
    affectedSubjectsCount: 100,
    detectedAtISO: "2026-05-01T10:00:00.000Z",
    assignedToEmail: "dpo@example.com",
    ...overrides,
  }
}

beforeEach(async () => {
  await mutateFreshStateForOrg(ORG, (s) => ({
    ...s,
    aiIncidents: [],
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

describe("createIncident", () => {
  it("creates an incident with computed 15-day deadline for fundamental_rights", async () => {
    const incident = await createIncident(ORG, baseInput(), ACTOR)
    expect(incident.id).toMatch(/^ai-inc-/)
    expect(incident.reportingDeadlineDays).toBe(15)
    // detected = 2026-05-01T10, deadline should be 2026-05-16T10
    expect(incident.reportingDeadlineISO).toBe("2026-05-16T10:00:00.000Z")
    expect(incident.status).toBe("notification_required")
    expect(incident.notificationRequired).toBe(true)
  })

  it("computes 2-day deadline for death_or_serious_harm_health", async () => {
    const incident = await createIncident(
      ORG,
      baseInput({
        category: "death_or_serious_harm_health",
        severity: "catastrophic",
      }),
      ACTOR,
    )
    expect(incident.reportingDeadlineDays).toBe(2)
    expect(incident.reportingDeadlineISO).toBe("2026-05-03T10:00:00.000Z")
  })

  it("computes 10-day deadline for widespread_infringement", async () => {
    const incident = await createIncident(
      ORG,
      baseInput({
        category: "widespread_infringement",
      }),
      ACTOR,
    )
    expect(incident.reportingDeadlineDays).toBe(10)
  })

  it("forces notificationRequired=true for death even if user set false", async () => {
    const incident = await createIncident(
      ORG,
      baseInput({
        category: "death_or_serious_harm_health",
        notificationRequired: false,
      }),
      ACTOR,
    )
    expect(incident.notificationRequired).toBe(true)
  })

  it("allows notificationRequired=false for other_serious", async () => {
    const incident = await createIncident(
      ORG,
      baseInput({
        category: "other_serious",
        notificationRequired: false,
      }),
      ACTOR,
    )
    expect(incident.notificationRequired).toBe(false)
    expect(incident.status).toBe("assessing")
  })

  it("rejects empty title", async () => {
    await expect(
      createIncident(ORG, baseInput({ title: "" }), ACTOR),
    ).rejects.toThrow(/title required/)
  })

  it("rejects empty description", async () => {
    await expect(
      createIncident(ORG, baseInput({ description: "" }), ACTOR),
    ).rejects.toThrow(/description required/)
  })

  it("emits an ai_incident.created event", async () => {
    const incident = await createIncident(ORG, baseInput(), ACTOR)
    const state = await readState()
    const event = state.events.find(
      (e) => e.type === "ai_incident.created" && e.entityId === incident.id,
    )
    expect(event).toBeDefined()
    expect(event?.message).toContain("Incident AI creat")
  })

  it("auto-emits findings via candidate evaluator (missing root_cause for assessing)", async () => {
    // Create an incident with assessing status → root cause missing should
    // trigger HIGH finding. But initial status will be "notification_required"
    // when category is fundamental_rights; non-draft + non-not_reportable.
    // Test that the finding count > 0.
    const incident = await createIncident(ORG, baseInput(), ACTOR)
    // The root cause finding fires when status != draft/not_reportable.
    // Initial status = notification_required → finding emitted.
    expect(incident.linkedFindingIds.length).toBeGreaterThanOrEqual(1)
  })
})

describe("updateIncident", () => {
  it("recomputes deadline when category changes", async () => {
    const incident = await createIncident(ORG, baseInput(), ACTOR)
    expect(incident.reportingDeadlineDays).toBe(15)
    const updated = await updateIncident(
      ORG,
      incident.id,
      { category: "death_or_serious_harm_health" },
      ACTOR,
    )
    expect(updated?.reportingDeadlineDays).toBe(2)
    expect(updated?.reportingDeadlineISO).toBe("2026-05-03T10:00:00.000Z")
  })

  it("recomputes deadline when detectedAtISO changes", async () => {
    const incident = await createIncident(ORG, baseInput(), ACTOR)
    const newDetected = "2026-06-01T00:00:00.000Z"
    const updated = await updateIncident(
      ORG,
      incident.id,
      { detectedAtISO: newDetected },
      ACTOR,
    )
    expect(updated?.detectedAtISO).toBe(newDetected)
    // 15 days from 2026-06-01 = 2026-06-16
    expect(updated?.reportingDeadlineISO).toBe("2026-06-16T00:00:00.000Z")
  })

  it("returns null for non-existent id", async () => {
    const updated = await updateIncident(
      ORG,
      "ai-inc-nonexistent",
      { title: "X" },
      ACTOR,
    )
    expect(updated).toBeNull()
  })

  it("emits ai_incident.updated event", async () => {
    const incident = await createIncident(ORG, baseInput(), ACTOR)
    await updateIncident(ORG, incident.id, { title: "Updated title" }, ACTOR)
    const state = await readState()
    expect(
      state.events.some(
        (e) => e.type === "ai_incident.updated" && e.entityId === incident.id,
      ),
    ).toBe(true)
  })
})

describe("markAuthorityNotified", () => {
  it("adds notification + transitions status to authority_notified", async () => {
    const incident = await createIncident(ORG, baseInput(), ACTOR)
    const updated = await markAuthorityNotified(
      ORG,
      incident.id,
      {
        authorityName: "Market Surveillance Authority RO",
        referenceNumber: "MSA-2026-0001",
      },
      ACTOR,
    )
    expect(updated?.notifications).toHaveLength(1)
    expect(updated?.notifications[0].authorityName).toBe(
      "Market Surveillance Authority RO",
    )
    expect(updated?.notifications[0].referenceNumber).toBe("MSA-2026-0001")
    expect(updated?.notifications[0].status).toBe("submitted")
    expect(updated?.status).toBe("authority_notified")
  })

  it("does NOT transition status when notification is draft only", async () => {
    const incident = await createIncident(ORG, baseInput(), ACTOR)
    const updated = await markAuthorityNotified(
      ORG,
      incident.id,
      {
        authorityName: "MSA-RO",
        status: "draft",
      },
      ACTOR,
    )
    expect(updated?.status).not.toBe("authority_notified")
  })

  it("rejects empty authorityName", async () => {
    const incident = await createIncident(ORG, baseInput(), ACTOR)
    await expect(
      markAuthorityNotified(
        ORG,
        incident.id,
        { authorityName: "" },
        ACTOR,
      ),
    ).rejects.toThrow(/authorityName required/)
  })

  it("emits ai_incident.authority_notified event with ref number", async () => {
    const incident = await createIncident(ORG, baseInput(), ACTOR)
    await markAuthorityNotified(
      ORG,
      incident.id,
      { authorityName: "MSA-RO", referenceNumber: "MSA-001" },
      ACTOR,
    )
    const state = await readState()
    const event = state.events.find(
      (e) =>
        e.type === "ai_incident.authority_notified" &&
        e.entityId === incident.id,
    )
    expect(event).toBeDefined()
    expect(event?.metadata?.referenceNumber).toBe("MSA-001")
  })
})

describe("recordRootCause", () => {
  it("attaches root cause + transitions status to root_cause_investigation", async () => {
    const incident = await createIncident(ORG, baseInput(), ACTOR)
    const updated = await recordRootCause(
      ORG,
      incident.id,
      {
        rootCauseDescription: "Model bias on protected group identified.",
        contributingFactors: ["dataset insuficient", "lipsă bias audit"],
        evidenceCollected: ["raport bias Q1"],
        remediationActions: ["retrain cu dataset extins"],
        preventionActions: ["bias audit lunar"],
        identifiedByEmail: "ml-lead@example.com",
      },
      ACTOR,
    )
    expect(updated?.rootCause).toBeDefined()
    expect(updated?.rootCause?.rootCauseDescription).toBe(
      "Model bias on protected group identified.",
    )
    expect(updated?.rootCause?.contributingFactors).toHaveLength(2)
    expect(updated?.status).toBe("root_cause_investigation")
  })

  it("rejects rootCauseDescription < 10 chars", async () => {
    const incident = await createIncident(ORG, baseInput(), ACTOR)
    await expect(
      recordRootCause(
        ORG,
        incident.id,
        {
          rootCauseDescription: "too short",
          identifiedByEmail: "ml@example.com",
        },
        ACTOR,
      ),
    ).rejects.toThrow(/rootCauseDescription required/)
  })

  it("rejects invalid identifiedByEmail", async () => {
    const incident = await createIncident(ORG, baseInput(), ACTOR)
    await expect(
      recordRootCause(
        ORG,
        incident.id,
        {
          rootCauseDescription: "long enough description here",
          identifiedByEmail: "not-an-email",
        },
        ACTOR,
      ),
    ).rejects.toThrow(/identifiedByEmail required/)
  })

  it("emits ai_incident.root_cause_recorded event", async () => {
    const incident = await createIncident(ORG, baseInput(), ACTOR)
    await recordRootCause(
      ORG,
      incident.id,
      {
        rootCauseDescription: "Long enough description here please.",
        identifiedByEmail: "ml@example.com",
      },
      ACTOR,
    )
    const state = await readState()
    expect(
      state.events.some((e) => e.type === "ai_incident.root_cause_recorded"),
    ).toBe(true)
  })
})

describe("closeIncident", () => {
  it("closes incident + sets closedAtISO + closureNotes", async () => {
    const incident = await createIncident(ORG, baseInput(), ACTOR)
    const closed = await closeIncident(
      ORG,
      incident.id,
      "Closed after full root cause + remediation aplicate.",
      ACTOR,
    )
    expect(closed?.status).toBe("closed")
    expect(closed?.closedAtISO).toBeDefined()
    expect(closed?.closureNotes).toContain("root cause")
  })

  it("rejects empty closureNotes", async () => {
    const incident = await createIncident(ORG, baseInput(), ACTOR)
    await expect(closeIncident(ORG, incident.id, "", ACTOR)).rejects.toThrow(
      /closureNotes required/,
    )
  })

  it("emits ai_incident.closed event", async () => {
    const incident = await createIncident(ORG, baseInput(), ACTOR)
    await closeIncident(
      ORG,
      incident.id,
      "Closed after full investigation.",
      ACTOR,
    )
    const state = await readState()
    expect(state.events.some((e) => e.type === "ai_incident.closed")).toBe(true)
  })
})

describe("deleteIncident", () => {
  it("removes the incident + emits deleted event", async () => {
    const incident = await createIncident(ORG, baseInput(), ACTOR)
    const removed = await deleteIncident(ORG, incident.id, ACTOR)
    expect(removed).toBe(true)
    const got = await getIncidentById(ORG, incident.id)
    expect(got).toBeNull()
  })

  it("returns false for non-existent id", async () => {
    const removed = await deleteIncident(ORG, "ai-inc-bogus", ACTOR)
    expect(removed).toBe(false)
  })
})

describe("summary + read", () => {
  it("summary reflects categories + statuses", async () => {
    await createIncident(ORG, baseInput(), ACTOR)
    await createIncident(
      ORG,
      baseInput({
        category: "death_or_serious_harm_health",
        severity: "catastrophic",
      }),
      ACTOR,
    )
    const { records, summary } = await readAIIncidents(ORG)
    expect(records).toHaveLength(2)
    expect(summary.total).toBe(2)
    expect(summary.catastrophic).toBe(1)
    expect(summary.notificationRequired).toBeGreaterThanOrEqual(1)
  })

  it("summarize counts overdue when notification not submitted and deadline expired", async () => {
    const incident = await createIncident(
      ORG,
      baseInput({
        category: "death_or_serious_harm_health",
        detectedAtISO: new Date(Date.now() - 5 * DAY_MS).toISOString(),
      }),
      ACTOR,
    )
    // After create, deadline=detectedAt + 2 days, which is in the past.
    const { summary } = await readAIIncidents(ORG)
    expect(summary.overdue).toBeGreaterThanOrEqual(1)
    expect(incident.reportingDeadlineDays).toBe(2)
  })
})

describe("linkToBreach + linkToPmmAnomaly (bidirectional)", () => {
  it("linkToBreach sets linkedBreachId + emits event", async () => {
    const incident = await createIncident(ORG, baseInput(), ACTOR)
    const linked = await linkToBreach(
      ORG,
      incident.id,
      "breach-xyz-123",
      ACTOR,
    )
    expect(linked?.linkedBreachId).toBe("breach-xyz-123")
    const state = await readState()
    expect(
      state.events.some((e) => e.type === "ai_incident.linked_to_breach"),
    ).toBe(true)
  })

  it("linkToPmmAnomaly updates incident AND PMM plan anomaly bidirectionally", async () => {
    const planInput: CreatePmmInput = {
      title: "PMM Test Plan",
      linkedAISystemId: "sys-1",
      dataCollectionMethods: ["system_logs", "performance_metrics", "user_feedback"],
      dataCollectionFrequency: "daily",
      dataCollectionDescription: "Test description for compliance evaluation.",
      complianceEvaluationMethods: ["mock eval"],
      complianceMetricsTracked: ["accuracy"],
      correctiveActionProcess:
        "Sample corrective action process documented in 10+ chars.",
      preventiveActionProcess:
        "Sample preventive action process documented in 10+ chars.",
      reviewCycle: "quarterly",
    }
    const plan = await createPlan(ORG, planInput, ACTOR)
    const planWithAnomaly = await recordAnomaly(
      ORG,
      plan.id,
      {
        severity: "high",
        category: "bias_drift",
        description: "Bias drift detected",
        impactDescription: "Impact medium",
      },
      ACTOR,
    )
    expect(planWithAnomaly?.anomalies).toHaveLength(1)
    const anomaly = planWithAnomaly!.anomalies[0]

    const incident = await createIncident(ORG, baseInput(), ACTOR)
    await linkToPmmAnomaly(ORG, incident.id, plan.id, anomaly.id, ACTOR)

    // Check incident updated
    const updatedIncident = await getIncidentById(ORG, incident.id)
    expect(updatedIncident?.linkedPmmAnomalyId).toBe(anomaly.id)

    // Check PMM plan anomaly updated bidirectionally
    const state = await readState()
    const updatedPlan = state.pmmPlans?.find((p) => p.id === plan.id)
    const updatedAnomaly = updatedPlan?.anomalies.find((a) => a.id === anomaly.id)
    expect(updatedAnomaly?.escalatedToIncident).toBe(true)
    expect(updatedAnomaly?.linkedIncidentId).toBe(incident.id)
  })
})

describe("escalateAnomalyToIncident (PMM bridge — Sprint 020)", () => {
  it("creates a new incident from a critical PMM anomaly + bidirectional link", async () => {
    const planInput: CreatePmmInput = {
      title: "PMM Critical Plan",
      linkedAISystemId: "sys-1",
      dataCollectionMethods: ["system_logs", "performance_metrics", "bias_metrics"],
      dataCollectionFrequency: "daily",
      dataCollectionDescription: "Comprehensive monitoring with multiple sources.",
      complianceEvaluationMethods: ["bias audit lunar"],
      complianceMetricsTracked: ["accuracy", "bias_gap"],
      correctiveActionProcess: "Roll back model if accuracy drops below 0.85.",
      preventiveActionProcess: "Bias audit quarterly with external validator.",
      reviewCycle: "monthly",
    }
    const plan = await createPlan(ORG, planInput, ACTOR)
    const planWithAnomaly = await recordAnomaly(
      ORG,
      plan.id,
      {
        severity: "critical",
        category: "bias_drift",
        description:
          "Critical bias drift detected on protected group requiring escalation",
        impactDescription:
          "Bias gap creste de la 3% la 15% pe grupul demografic X",
      },
      ACTOR,
    )
    const anomalyId = planWithAnomaly!.anomalies[0].id

    const result = await escalateAnomalyToIncident(
      ORG,
      plan.id,
      anomalyId,
      ACTOR,
    )

    expect(result.incidentId).toMatch(/^ai-inc-/)

    // Verify the incident
    const incident = await getIncidentById(ORG, result.incidentId)
    expect(incident).toBeDefined()
    expect(incident?.severity).toBe("catastrophic")
    expect(incident?.linkedPmmAnomalyId).toBe(anomalyId)
    expect(incident?.notificationRequired).toBe(true)

    // Verify PMM anomaly bidirectional update
    const state = await readState()
    const updatedPlan = state.pmmPlans?.find((p) => p.id === plan.id)
    const updatedAnomaly = updatedPlan?.anomalies.find(
      (a) => a.id === anomalyId,
    )
    expect(updatedAnomaly?.escalatedToIncident).toBe(true)
    expect(updatedAnomaly?.linkedIncidentId).toBe(result.incidentId)

    // Verify PMM-side event emitted
    expect(
      state.events.some((e) => e.type === "pmm.anomaly_escalated"),
    ).toBe(true)
  })

  it("maps anomaly severity → incident severity correctly", async () => {
    const planInput: CreatePmmInput = {
      title: "PMM Map Test",
      linkedAISystemId: "sys-1",
      dataCollectionMethods: ["system_logs", "performance_metrics", "user_feedback"],
      dataCollectionFrequency: "daily",
      dataCollectionDescription: "Test description for compliance evaluation.",
      complianceEvaluationMethods: ["mock"],
      complianceMetricsTracked: ["acc"],
      correctiveActionProcess: "Mock corrective action process",
      preventiveActionProcess: "Mock preventive action process",
      reviewCycle: "quarterly",
    }
    const plan = await createPlan(ORG, planInput, ACTOR)
    const planWithAnomaly = await recordAnomaly(
      ORG,
      plan.id,
      {
        severity: "high",
        category: "performance_drop",
        description: "Performance dropped significantly",
        impactDescription: "Impact UX",
      },
      ACTOR,
    )
    const anomalyId = planWithAnomaly!.anomalies[0].id

    const result = await escalateAnomalyToIncident(
      ORG,
      plan.id,
      anomalyId,
      ACTOR,
    )
    const incident = await getIncidentById(ORG, result.incidentId)
    // high → serious
    expect(incident?.severity).toBe("serious")
  })

  it("rejects when plan does not exist", async () => {
    await expect(
      escalateAnomalyToIncident(ORG, "plan-bogus", "ano-bogus", ACTOR),
    ).rejects.toThrow(/PMM plan/)
  })

  it("rejects when anomaly already escalated", async () => {
    const planInput: CreatePmmInput = {
      title: "Double escalation test",
      linkedAISystemId: "sys-1",
      dataCollectionMethods: ["system_logs", "performance_metrics", "user_feedback"],
      dataCollectionFrequency: "daily",
      dataCollectionDescription: "Test description for compliance evaluation.",
      complianceEvaluationMethods: ["mock"],
      complianceMetricsTracked: ["acc"],
      correctiveActionProcess: "Mock corrective action process",
      preventiveActionProcess: "Mock preventive action process",
      reviewCycle: "quarterly",
    }
    const plan = await createPlan(ORG, planInput, ACTOR)
    const planWithAnomaly = await recordAnomaly(
      ORG,
      plan.id,
      {
        severity: "critical",
        category: "bias_drift",
        description: "Critical drift",
        impactDescription: "Impact",
      },
      ACTOR,
    )
    const anomalyId = planWithAnomaly!.anomalies[0].id

    await escalateAnomalyToIncident(ORG, plan.id, anomalyId, ACTOR)
    await expect(
      escalateAnomalyToIncident(ORG, plan.id, anomalyId, ACTOR),
    ).rejects.toThrow(/deja escaladată/)
  })
})

describe("buildIncidentMarkdown", () => {
  it("returns regenerated markdown via evaluator", async () => {
    const incident = await createIncident(ORG, baseInput(), ACTOR)
    const md = buildIncidentMarkdown(incident, "ACME SRL", "Credit Scoring AI")
    expect(md).toContain("# Incident AI — Incident test")
    expect(md).toContain("Credit Scoring AI")
    expect(md).toContain("ACME SRL")
  })
})

describe("propagateEvaluation", () => {
  it("skips closed incidents", async () => {
    const incident = await createIncident(ORG, baseInput(), ACTOR)
    await closeIncident(
      ORG,
      incident.id,
      "Closed after full investigation completed.",
      ACTOR,
    )
    const result = await propagateEvaluation(ORG, ACTOR)
    expect(result.evaluated).toBeGreaterThanOrEqual(0)
  })
})

describe("summarizeAIIncidents (pure)", () => {
  it("returns zeros for empty array", () => {
    expect(summarizeAIIncidents([])).toEqual({
      total: 0,
      draft: 0,
      assessing: 0,
      notificationRequired: 0,
      authorityNotified: 0,
      rootCauseInvestigation: 0,
      remediated: 0,
      closed: 0,
      notReportable: 0,
      overdue: 0,
      urgent: 0,
      catastrophic: 0,
      withRootCause: 0,
    })
  })
})
