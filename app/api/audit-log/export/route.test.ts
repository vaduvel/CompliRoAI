/**
 * Sprint 011 — Tests pentru GET /api/audit-log/export
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
    orgName: "ACME SRL",
    workspaceMode: "solo",
  })),
}))

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
  let state = { ...initialComplianceState, events: [] as ComplianceEvent[] }
  state.events = appendComplianceEvents(state, events)
  mockState.value = state
}

beforeEach(() => {
  mockState.value = { ...initialComplianceState, events: [] }
})

describe("GET /api/audit-log/export", () => {
  it("defaults to markdown when no format param", async () => {
    seedEvents([makeEvent({ message: "test msg" })])
    const { GET } = await import("./route")
    const res = await GET(new Request("http://localhost/api/audit-log/export"))
    expect(res.status).toBe(200)
    expect(res.headers.get("Content-Type")).toContain("text/markdown")
    expect(res.headers.get("Content-Disposition")).toContain(
      'compliroai-audit-log-acme-srl-',
    )
    expect(res.headers.get("Content-Disposition")).toContain('.md')
    const body = await res.text()
    expect(body).toContain("# Audit Log — ACME SRL")
    expect(body).toContain("test msg")
  })

  it("returns JSON with hash chain fields", async () => {
    seedEvents([makeEvent({ message: "for json" })])
    const { GET } = await import("./route")
    const res = await GET(new Request("http://localhost/api/audit-log/export?format=json"))
    expect(res.headers.get("Content-Type")).toContain("application/json")
    const body = await res.text()
    const parsed = JSON.parse(body)
    expect(parsed).toHaveLength(1)
    expect(parsed[0].message).toBe("for json")
    expect(parsed[0]).toHaveProperty("selfHash")
  })

  it("returns CSV with RFC 4180 line endings", async () => {
    seedEvents([makeEvent({ message: "csv msg" })])
    const { GET } = await import("./route")
    const res = await GET(new Request("http://localhost/api/audit-log/export?format=csv"))
    expect(res.headers.get("Content-Type")).toContain("text/csv")
    const body = await res.text()
    expect(body).toContain("id,createdAtISO,type")
    expect(body).toContain("csv msg")
    expect(body).toContain("\r\n")
  })

  it("applies filters before exporting", async () => {
    seedEvents([
      makeEvent({ message: "keep", type: "finding.created" }),
      makeEvent({ message: "drop", type: "task.updated" }),
    ])
    const { GET } = await import("./route")
    const res = await GET(
      new Request("http://localhost/api/audit-log/export?format=json&eventType=finding.created"),
    )
    const parsed = JSON.parse(await res.text())
    expect(parsed).toHaveLength(1)
    expect(parsed[0].message).toBe("keep")
  })

  it("filename slug uses orgName", async () => {
    seedEvents([makeEvent({})])
    const { GET } = await import("./route")
    const res = await GET(new Request("http://localhost/api/audit-log/export?format=csv"))
    expect(res.headers.get("Content-Disposition")).toMatch(
      /compliroai-audit-log-acme-srl-\d{4}-\d{2}-\d{2}\.csv/,
    )
  })

  it("exports empty list for no matching filter", async () => {
    seedEvents([makeEvent({ type: "finding.created" })])
    const { GET } = await import("./route")
    const res = await GET(
      new Request("http://localhost/api/audit-log/export?format=md&eventType=zzz.none"),
    )
    expect(res.status).toBe(200)
    const body = await res.text()
    expect(body).toContain("Nu există evenimente")
  })
})
