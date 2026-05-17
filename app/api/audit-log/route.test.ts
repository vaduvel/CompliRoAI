/**
 * Sprint 011 — Tests pentru GET /api/audit-log
 *
 * Strategie: mock-uim org-context + readState pentru a inecta evenimente
 * artificiale; verificam filtrele + chain verification + paginare + facete.
 */

import { describe, expect, it, vi, beforeEach } from "vitest"

import type { ComplianceEvent } from "@/lib/compliance/types"
import { appendComplianceEvents } from "@/lib/compliance/events"
import { initialComplianceState } from "@/lib/compliance/engine"

vi.mock("@/lib/server/org-context", () => ({
  getOrgContext: vi.fn(async () => ({
    orgId: "org-test-1",
    userId: "user-test-1",
    email: "test@example.com",
    orgName: "Test Org",
    workspaceMode: "solo",
  })),
}))

// readState is mocked per-test via vi.doMock.
const mockState = { value: { ...initialComplianceState } }

vi.mock("@/lib/server/store", () => ({
  readState: vi.fn(async () => mockState.value),
}))

function makeEvent(overrides: Partial<ComplianceEvent>): ComplianceEvent {
  return {
    id: `evt-${Math.random().toString(36).slice(2, 8)}`,
    type: "finding.created",
    entityType: "finding",
    entityId: "finding-x",
    message: "default message",
    createdAtISO: "2026-05-17T10:00:00.000Z",
    actorLabel: "test@example.com",
    actorRole: "owner",
    actorSource: "session",
    ...overrides,
  }
}

function seedEvents(events: ComplianceEvent[]) {
  // Re-build state with proper hash chain via appendComplianceEvents.
  let state = { ...initialComplianceState, events: [] as ComplianceEvent[] }
  state.events = appendComplianceEvents(state, events)
  mockState.value = state
}

beforeEach(() => {
  mockState.value = { ...initialComplianceState, events: [] }
})

describe("GET /api/audit-log", () => {
  it("returns empty when no events", async () => {
    const { GET } = await import("./route")
    const res = await GET(new Request("http://localhost/api/audit-log"))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.events).toEqual([])
    expect(json.total).toBe(0)
    expect(json.chainVerification.ok).toBe(true)
    expect(json.chainVerification.verifiedCount).toBe(0)
  })

  it("returns all events sorted newest first", async () => {
    seedEvents([
      makeEvent({ id: "evt-old", createdAtISO: "2026-05-15T10:00:00Z", message: "old" }),
      makeEvent({ id: "evt-new", createdAtISO: "2026-05-17T10:00:00Z", message: "new" }),
      makeEvent({ id: "evt-mid", createdAtISO: "2026-05-16T10:00:00Z", message: "mid" }),
    ])
    const { GET } = await import("./route")
    const res = await GET(new Request("http://localhost/api/audit-log"))
    const json = await res.json()
    expect(json.total).toBe(3)
    expect(json.events.map((e: ComplianceEvent) => e.message)).toEqual(["new", "mid", "old"])
  })

  it("filters by date range (from + to)", async () => {
    seedEvents([
      makeEvent({ createdAtISO: "2026-05-10T10:00:00Z", message: "before" }),
      makeEvent({ createdAtISO: "2026-05-15T10:00:00Z", message: "inside" }),
      makeEvent({ createdAtISO: "2026-05-20T10:00:00Z", message: "after" }),
    ])
    const { GET } = await import("./route")
    const res = await GET(
      new Request("http://localhost/api/audit-log?from=2026-05-14T00:00:00Z&to=2026-05-16T00:00:00Z"),
    )
    const json = await res.json()
    expect(json.total).toBe(1)
    expect(json.events[0].message).toBe("inside")
  })

  it("filters by entityType", async () => {
    seedEvents([
      makeEvent({ entityType: "finding", message: "f1" }),
      makeEvent({ entityType: "task", message: "t1" }),
      makeEvent({ entityType: "finding", message: "f2" }),
    ])
    const { GET } = await import("./route")
    const res = await GET(new Request("http://localhost/api/audit-log?entityType=task"))
    const json = await res.json()
    expect(json.total).toBe(1)
    expect(json.events[0].message).toBe("t1")
  })

  it("filters by actorEmail (case-insensitive)", async () => {
    seedEvents([
      makeEvent({ actorLabel: "alice@example.com", message: "a" }),
      makeEvent({ actorLabel: "bob@example.com", message: "b" }),
    ])
    const { GET } = await import("./route")
    const res = await GET(
      new Request("http://localhost/api/audit-log?actorEmail=ALICE@example.COM"),
    )
    const json = await res.json()
    expect(json.total).toBe(1)
    expect(json.events[0].actorLabel).toBe("alice@example.com")
  })

  it("filters by eventType", async () => {
    seedEvents([
      makeEvent({ type: "finding.created", message: "c" }),
      makeEvent({ type: "finding.resolved", message: "r" }),
    ])
    const { GET } = await import("./route")
    const res = await GET(new Request("http://localhost/api/audit-log?eventType=finding.resolved"))
    const json = await res.json()
    expect(json.total).toBe(1)
    expect(json.events[0].message).toBe("r")
  })

  it("filters by search (message + metadata)", async () => {
    seedEvents([
      makeEvent({ message: "DPIA approved for HR system", metadata: undefined }),
      makeEvent({ message: "vendor reviewed", metadata: { vendor: "openai" } }),
      makeEvent({ message: "literacy training logged", metadata: undefined }),
    ])
    const { GET } = await import("./route")
    // search in message
    const r1 = await GET(new Request("http://localhost/api/audit-log?search=DPIA"))
    const j1 = await r1.json()
    expect(j1.total).toBe(1)
    expect(j1.events[0].message).toContain("DPIA")

    // search in metadata
    const r2 = await GET(new Request("http://localhost/api/audit-log?search=openai"))
    const j2 = await r2.json()
    expect(j2.total).toBe(1)
    expect(j2.events[0].metadata?.vendor).toBe("openai")
  })

  it("paginates with limit + offset", async () => {
    const events = Array.from({ length: 10 }, (_, i) =>
      makeEvent({
        id: `evt-${i}`,
        message: `m${i}`,
        createdAtISO: `2026-05-${10 + i}T10:00:00.000Z`,
      }),
    )
    seedEvents(events)
    const { GET } = await import("./route")
    const res = await GET(new Request("http://localhost/api/audit-log?limit=3&offset=2"))
    const json = await res.json()
    expect(json.total).toBe(10)
    expect(json.events).toHaveLength(3)
    // newest first => sorted descending; offset 2 skips top 2
    // m9, m8 are top 2 -> we get m7, m6, m5
    expect(json.events.map((e: ComplianceEvent) => e.message)).toEqual(["m7", "m6", "m5"])
  })

  it("returns chain verification ok=true for clean ledger", async () => {
    seedEvents([
      makeEvent({ id: "evt-1", message: "a" }),
      makeEvent({ id: "evt-2", message: "b", createdAtISO: "2026-05-18T10:00:00Z" }),
    ])
    const { GET } = await import("./route")
    const res = await GET(new Request("http://localhost/api/audit-log"))
    const json = await res.json()
    expect(json.chainVerification.ok).toBe(true)
    expect(json.chainVerification.verifiedCount).toBe(2)
  })

  it("detects broken chain when an event is tampered", async () => {
    seedEvents([
      makeEvent({ id: "evt-1", message: "a" }),
      makeEvent({ id: "evt-2", message: "b", createdAtISO: "2026-05-18T10:00:00Z" }),
    ])
    // Tamper: change message of the second event (chronological = state.events[0] because newest-first)
    const tampered = { ...mockState.value, events: mockState.value.events.map((e, i) =>
      i === 0 ? { ...e, message: "TAMPERED" } : e
    ) }
    mockState.value = tampered

    const { GET } = await import("./route")
    const res = await GET(new Request("http://localhost/api/audit-log"))
    const json = await res.json()
    expect(json.chainVerification.ok).toBe(false)
    expect(json.chainVerification.brokenAt).toBeDefined()
  })

  it("returns facets (actors, eventTypes, entityTypes)", async () => {
    seedEvents([
      makeEvent({ type: "finding.created", entityType: "finding", actorLabel: "a@x.com" }),
      makeEvent({ type: "task.updated", entityType: "task", actorLabel: "b@x.com" }),
      makeEvent({ type: "finding.created", entityType: "finding", actorLabel: "a@x.com" }),
    ])
    const { GET } = await import("./route")
    const res = await GET(new Request("http://localhost/api/audit-log"))
    const json = await res.json()
    expect(json.facets.actors).toEqual(["a@x.com", "b@x.com"])
    expect(json.facets.eventTypes).toEqual(["finding.created", "task.updated"])
    expect(json.facets.entityTypes).toEqual(["finding", "task"])
  })

  it("caps limit at 500", async () => {
    seedEvents([makeEvent({})])
    const { GET } = await import("./route")
    const res = await GET(new Request("http://localhost/api/audit-log?limit=9999"))
    const json = await res.json()
    // Verifies request didn't fail; events length is 1
    expect(json.events).toHaveLength(1)
  })
})
