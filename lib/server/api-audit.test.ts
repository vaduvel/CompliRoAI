/**
 * Sprint 023 — Tests pentru api-audit (logApiCall + emitDeploymentFinding).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/server/org-context", () => ({
  getOrgContext: vi.fn(async () => ({
    orgId: "org-test-audit",
    userId: "user-test-1",
    email: "test@example.com",
    orgName: "Test Org",
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
      readdir: vi.fn(async () => []),
    },
  }
})

import {
  emitDeploymentFinding,
  logApiCall,
  summariseGateResponse,
} from "@/lib/server/api-audit"
import { readState } from "@/lib/server/store"
import type { ComplianceEventActorInput } from "@/lib/compliance/events"
import type { ComplianceGateResponse } from "@/lib/compliance/types"

const ACTOR: ComplianceEventActorInput = {
  id: "user-test-1",
  label: "test@example.com",
  role: "owner",
  source: "session",
}

const ORG = "org-test-audit"

const PASS_GATE: ComplianceGateResponse = {
  verdict: "pass",
  riskClass: "minimal",
  aiActRole: "provider",
  reasons: [],
  obligations: [],
  missingEvidence: [],
  nextActions: [],
  auditPackHints: [],
  apiVersion: "v1",
  classifiedAtISO: "2026-05-18T00:00:00Z",
}

const BLOCKED_GATE: ComplianceGateResponse = {
  verdict: "blocked",
  riskClass: "prohibited",
  aiActRole: "provider",
  reasons: [
    {
      category: "legal_prohibition",
      articleRef: "Art. 5(1)(a)",
      severity: "error",
      message: "Sistem interzis",
      nextAction: "Stop deployment",
    },
  ],
  obligations: [],
  missingEvidence: ["Memo Art. 5(2)"],
  nextActions: ["Oprire imediată"],
  auditPackHints: [],
  apiVersion: "v1",
  classifiedAtISO: "2026-05-18T00:00:00Z",
}

beforeEach(() => {
  // Each test gets a clean slate.
})

afterEach(() => {
  vi.clearAllMocks()
})

describe("api-audit — logApiCall", () => {
  it("appends an ApiCallLog entry and emits a ComplianceEvent", async () => {
    const log = await logApiCall({
      orgId: ORG,
      endpoint: "/api/v1/classify",
      method: "POST",
      statusCode: 200,
      durationMs: 25,
      requestSummary: "purpose=support-chatbot",
      responseSummary: "risk=limited",
      actor: ACTOR,
    })
    expect(log.id).toMatch(/^apicall-/)
    expect(log.endpoint).toBe("/api/v1/classify")

    const state = await readState()
    expect(state.apiCallLogs?.[0]?.id).toBe(log.id)
    expect(
      state.events.some(
        (e) => e.type === "api.classify_called" && e.entityId === log.id,
      ),
    ).toBe(true)
  })

  it("caps apiCallLogs at 1000 entries (newest-first)", async () => {
    // Seed 1001 entries — last should be evicted.
    for (let i = 0; i < 1001; i++) {
      await logApiCall({
        orgId: ORG,
        endpoint: "/api/v1/classify",
        method: "POST",
        statusCode: 200,
        durationMs: 1,
        requestSummary: `i=${i}`,
        responseSummary: "ok",
        actor: ACTOR,
      })
    }
    const state = await readState()
    expect(state.apiCallLogs?.length).toBe(1000)
  })

  it("never leaks PII into the log (requestSummary passed in already redacted)", async () => {
    await logApiCall({
      orgId: ORG,
      endpoint: "/api/v1/gate",
      method: "POST",
      statusCode: 200,
      durationMs: 12,
      // Caller is responsible for redaction — we just store the string.
      requestSummary: "purpose=hr-screening sector=hr pd=1",
      responseSummary: "verdict=review_required",
      actor: ACTOR,
    })
    const state = await readState()
    const latest = state.apiCallLogs?.[0]
    expect(latest?.requestSummary).not.toMatch(/CV|salariu|email/i)
    expect(latest?.responseSummary).toBe("verdict=review_required")
  })

  it("uses error event type for status >= 400", async () => {
    await logApiCall({
      orgId: ORG,
      endpoint: "/api/v1/classify",
      method: "POST",
      statusCode: 429,
      durationMs: 1,
      requestSummary: "",
      responseSummary: "rate-limited",
      errorCode: "RATE_LIMITED",
      actor: ACTOR,
    })
    const state = await readState()
    const latestEvent = state.events.find((e) => e.entityType === "system")
    expect(latestEvent?.type).toBe("api.call_error")
  })
})

describe("api-audit — summariseGateResponse", () => {
  it("produces a short non-PII summary string", () => {
    const summary = summariseGateResponse(BLOCKED_GATE)
    expect(summary).toContain("verdict=blocked")
    expect(summary).toContain("risk=prohibited")
    expect(summary).toContain("reasons=1")
  })
})

describe("api-audit — emitDeploymentFinding", () => {
  it("returns null for pass verdict (no finding emitted)", async () => {
    const result = await emitDeploymentFinding({
      orgId: ORG,
      systemName: "Doc Helper",
      deploymentRef: "sha-1",
      gate: PASS_GATE,
      actor: ACTOR,
    })
    expect(result).toBeNull()
  })

  it("emits a critical finding for blocked verdict", async () => {
    const findingId = await emitDeploymentFinding({
      orgId: ORG,
      systemName: "Biometric Cam",
      deploymentRef: "sha-2",
      gate: BLOCKED_GATE,
      actor: ACTOR,
    })
    expect(findingId).toBeTruthy()
    const state = await readState()
    const finding = state.findings.find((f) => f.id === findingId)
    expect(finding?.severity).toBe("critical")
    expect(finding?.category).toBe("EU_AI_ACT")
    expect(finding?.title).toMatch(/blocat/i)
  })
})
