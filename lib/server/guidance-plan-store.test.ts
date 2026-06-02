// Sprint 027 — AI Guidance Orchestrator store tests.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/server/org-context", () => ({
  getOrgContext: vi.fn(async () => ({
    orgId: "org-guidance-test",
    userId: "user-guidance-test",
    email: "guidance@example.com",
    orgName: "Apex Logistic SRL",
    workspaceMode: "cabinet",
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
import type { ScanFinding } from "@/lib/compliance/types"
import { mutateFreshStateForOrg, readState } from "@/lib/server/store"
import {
  acceptGuidancePlan,
  explainOmittedGuidanceAction,
  generateGuidancePlanForOrg,
  getLatestGuidancePlan,
  rejectGuidancePlan,
} from "@/lib/server/guidance-plan-store"

const ORG = "org-guidance-test"
const NOW = "2026-05-19T09:00:00.000Z"

const ACTOR: ComplianceEventActorInput = {
  id: "user-guidance-test",
  label: "guidance@example.com",
  role: "compliance",
  source: "session",
}

function finding(overrides: Partial<ScanFinding>): ScanFinding {
  return {
    id: "dpia-001",
    title: "Semnează DPIA-001 ChatGPT Team",
    detail: "Sistem AI cu date personale și risc ridicat.",
    category: "GDPR",
    severity: "critical",
    risk: "high",
    principles: ["privacy_data_governance", "accountability"],
    createdAtISO: NOW,
    sourceDocument: "DPIA",
    legalReference: "GDPR Art. 35",
    findingStatus: "open",
    reviewState: "unreviewed",
    ownerSuggestion: "DPO",
    evidenceRequired: "DPIA semnată",
    ...overrides,
  }
}

beforeEach(async () => {
  await mutateFreshStateForOrg(ORG, (state) => ({
    ...state,
    findings: [
      finding({ id: "dpia-001", title: "Semnează DPIA-001 ChatGPT Team" }),
      finding({
        id: "art50-001",
        title: "Generează notificarea Art. 50",
        category: "EU_AI_ACT",
        legalReference: "AI Act Art. 50",
        severity: "high",
      }),
    ],
    events: [],
    aiGuidancePlans: [],
  }))
})

afterEach(() => {
  vi.clearAllMocks()
})

describe("guidance-plan-store", () => {
  it("generează și persistă un plan AI Guidance cu event hash-chained", async () => {
    const record = await generateGuidancePlanForOrg(ORG, {
      actor: ACTOR,
      orgName: "Apex Logistic SRL",
      workspaceMode: "cabinet",
      nowISO: NOW,
      reason: "manual_regenerate",
    })

    expect(record.id).toMatch(/^aigp-/)
    expect(record.status).toBe("generated")
    expect(record.plan.actions[0].id).toBe("guidance-finding-dpia-001")
    expect(record.diffFromPrevious).toBeUndefined()

    const state = await readState()
    expect(state.aiGuidancePlans?.[0]?.id).toBe(record.id)
    const event = state.events.find((e) => e.type === "ai_guidance.generated")
    expect(event).toBeTruthy()
    expect(event?.selfHash).toMatch(/^[0-9a-f]{64}$/)
  })

  it("regenerarea after-action scoate finding-ul rezolvat și păstrează diff față de planul anterior", async () => {
    const before = await generateGuidancePlanForOrg(ORG, {
      actor: ACTOR,
      orgName: "Apex Logistic SRL",
      workspaceMode: "cabinet",
      nowISO: NOW,
      reason: "manual_regenerate",
    })

    await mutateFreshStateForOrg(ORG, (state) => ({
      ...state,
      findings: state.findings.map((item) =>
        item.id === "dpia-001"
          ? { ...item, findingStatus: "resolved", reviewState: "closed" }
          : item,
      ),
    }))

    const after = await generateGuidancePlanForOrg(ORG, {
      actor: ACTOR,
      orgName: "Apex Logistic SRL",
      workspaceMode: "cabinet",
      nowISO: "2026-05-19T10:00:00.000Z",
      reason: "after_action",
    })

    expect(after.id).not.toBe(before.id)
    expect(after.plan.actions.some((item) => item.id === "guidance-finding-dpia-001")).toBe(false)
    expect(after.diffFromPrevious?.removed.some((item) => item.id === "guidance-finding-dpia-001")).toBe(true)
    expect(after.diffFromPrevious?.removed.length).toBeGreaterThan(0)
  })

  it("acceptarea planului nu închide automat findings — doar salvează decizia umană", async () => {
    const record = await generateGuidancePlanForOrg(ORG, {
      actor: ACTOR,
      orgName: "Apex Logistic SRL",
      workspaceMode: "cabinet",
      nowISO: NOW,
    })

    const accepted = await acceptGuidancePlan(ORG, record.id, ACTOR)

    expect(accepted.status).toBe("accepted")
    expect(accepted.acceptedByEmail).toBe("guidance@example.com")

    const state = await readState()
    expect(state.findings.find((item) => item.id === "dpia-001")?.findingStatus).toBe("open")
    expect(state.events.some((event) => event.type === "ai_guidance.accepted")).toBe(true)
  })

  it("poate respinge planul și explica de ce un item nu apare în planul scurt", async () => {
    await mutateFreshStateForOrg(ORG, (state) => ({
      ...state,
      findings: Array.from({ length: 7 }, (_, index) =>
        finding({
          id: `critical-${index + 1}`,
          title: `Finding critic ${index + 1}`,
          severity: "critical",
        }),
      ),
      aiGuidancePlans: [],
      events: [],
    }))
    const record = await generateGuidancePlanForOrg(ORG, {
      actor: ACTOR,
      orgName: "Apex Logistic SRL",
      workspaceMode: "cabinet",
      nowISO: NOW,
      maxActions: 4,
    })
    const omitted = record.plan.omittedActions[0]

    expect(omitted).toBeTruthy()
    const explanation = await explainOmittedGuidanceAction(ORG, record.id, omitted.id)
    expect(explanation.reason).toContain("planul complet")

    const rejected = await rejectGuidancePlan(ORG, record.id, ACTOR, "Vrem să lucrăm manual azi.")
    expect(rejected.status).toBe("rejected")
    expect(rejected.rejectionNote).toBe("Vrem să lucrăm manual azi.")
    expect((await getLatestGuidancePlan(ORG))?.id).toBe(record.id)
  })
})
