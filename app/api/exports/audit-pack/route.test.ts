import { beforeEach, describe, expect, it, vi } from "vitest"

import { initialComplianceState } from "@/lib/compliance/engine"
import type { AIActState } from "@/lib/server/store"

type TestReadinessStatus = "blocked" | "draft_only" | "ready_for_review" | "approved"

const harness = vi.hoisted(() => {
  const state = {
    value: null as unknown,
  }
  const runtime: {
    state: typeof state
    lastWrittenState: unknown
    writeState: ReturnType<typeof vi.fn>
    executionState: {
      snapshot: { exportReadinessStatus: TestReadinessStatus }
      exportBlockers: Array<{ id: string; title: string }>
    }
  } = {
    state,
    lastWrittenState: null,
    writeState: vi.fn(async (nextState: unknown) => {
      runtime.lastWrittenState = nextState
    }),
    executionState: {
      snapshot: { exportReadinessStatus: "draft_only" },
      exportBlockers: [],
    },
  }
  return runtime
})

vi.mock("@/lib/server/org-context", () => ({
  getOrgContext: vi.fn(async () => ({
    orgId: "org-export-gate",
    userId: "user-export-gate",
    email: "tester@example.com",
    orgName: "Flow Audit SRL",
    workspaceMode: "cabinet",
  })),
}))

vi.mock("@/lib/server/tenancy", () => ({
  listUserMemberships: vi.fn(async () => []),
}))

vi.mock("@/lib/compliance/dashboard-coherence", async () => {
  const actual = await vi.importActual<typeof import("@/lib/compliance/dashboard-coherence")>(
    "@/lib/compliance/dashboard-coherence",
  )
  return {
    ...actual,
    buildDashboardExecutionState: vi.fn(() => harness.executionState),
  }
})

vi.mock("@/lib/server/supabase-org-state", () => ({
  shouldUseSupabaseOrgState: vi.fn(() => false),
  loadOrgStateFromSupabase: vi.fn(async () => null),
}))

vi.mock("@/lib/server/evidence-pack", () => ({
  buildAIActEvidencePack: vi.fn(async () => ({
    overallCompliance: 100,
    systems: [],
  })),
}))

vi.mock("@/lib/server/share-token-store", () => ({
  listOrgShareTokens: vi.fn(async () => []),
}))

vi.mock("@/lib/server/white-label", () => ({
  getEffectiveBranding: vi.fn(async () => ({
    logoUrl: null,
    primaryColor: "#3b5bdb",
    secondaryColor: "#0ea5e9",
    brandName: "CompliRoAI",
    signerName: null,
    signerTitle: null,
    contactEmail: null,
    address: null,
    website: null,
    updatedAtISO: null,
    isCustom: false,
  })),
}))

vi.mock("@/lib/server/store", async () => {
  const actual = await vi.importActual<typeof import("@/lib/server/store")>(
    "@/lib/server/store",
  )
  return {
    ...actual,
    readFreshStateForOrg: vi.fn(async () => harness.state.value),
    readState: vi.fn(async () => harness.state.value),
    writeState: harness.writeState,
  }
})

function freshState(): AIActState {
  return {
    ...(JSON.parse(JSON.stringify(initialComplianceState)) as AIActState),
    clientMeta: {
      orgName: "Flow Audit SRL",
      cui: "RO12345678",
    },
  } as AIActState
}

function setReadiness(status: TestReadinessStatus, blockers = 0) {
  harness.executionState = {
    snapshot: { exportReadinessStatus: status },
    exportBlockers: Array.from({ length: blockers }, (_, index) => ({
      id: `blocker-${index + 1}`,
      title: `Blocker ${index + 1}`,
    })),
  }
}

async function exportAuditPack(url: string) {
  const { GET } = await import("./route")
  return GET(new Request(url) as never)
}

beforeEach(() => {
  harness.state.value = freshState()
  harness.lastWrittenState = null
  harness.writeState.mockClear()
  setReadiness("draft_only", 0)
})

describe("GET /api/exports/audit-pack final gate", () => {
  it("refuses final=true unless readiness is approved", async () => {
    setReadiness("ready_for_review", 0)

    const res = await exportAuditPack("http://localhost/api/exports/audit-pack?final=true")
    const json = await res.json()

    expect(res.status).toBe(409)
    expect(json.exportReadinessStatus).toBe("ready_for_review")
    expect(json.error).toContain("nu este aprobat pentru export final")
    expect(harness.writeState).not.toHaveBeenCalled()
  })

  it("allows final export when readiness is approved and records a final pack", async () => {
    setReadiness("approved", 0)

    const res = await exportAuditPack("http://localhost/api/exports/audit-pack?final=true")
    const body = await res.arrayBuffer()
    const written = harness.lastWrittenState as AIActState & {
      auditPacks?: Array<{
        packKind?: string
        exportReadinessStatus?: string
        exportBlockersCount?: number
      }>
    }

    expect(res.status).toBe(200)
    expect(body.byteLength).toBeGreaterThan(0)
    expect(res.headers.get("X-Audit-Pack-Readiness")).toBe("approved")
    expect(res.headers.get("X-Audit-Pack-Blockers")).toBe("0")
    expect(written.auditPacks?.[0]?.packKind).toBe("final")
    expect(written.auditPacks?.[0]?.exportReadinessStatus).toBe("approved")
    expect(written.auditPacks?.[0]?.exportBlockersCount).toBe(0)
  })

  it("still allows non-final blocked exports but records them as blocked drafts", async () => {
    setReadiness("blocked", 2)

    const res = await exportAuditPack("http://localhost/api/exports/audit-pack")
    const body = await res.arrayBuffer()
    const written = harness.lastWrittenState as AIActState & {
      auditPacks?: Array<{
        packKind?: string
        exportReadinessStatus?: string
        exportBlockersCount?: number
      }>
    }

    expect(res.status).toBe(200)
    expect(body.byteLength).toBeGreaterThan(0)
    expect(res.headers.get("X-Audit-Pack-Readiness")).toBe("blocked")
    expect(res.headers.get("X-Audit-Pack-Blockers")).toBe("2")
    expect(written.auditPacks?.[0]?.packKind).toBe("blocked_draft")
    expect(written.auditPacks?.[0]?.exportReadinessStatus).toBe("blocked")
    expect(written.auditPacks?.[0]?.exportBlockersCount).toBe(2)
  })
})
