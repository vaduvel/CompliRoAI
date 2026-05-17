/**
 * Sprint 011 — Tests pentru audit-log-formatters
 *
 * Acoperă: empty list, single event, multiple events cu metadata,
 * special chars escaping (CSV + Markdown), include/exclude chain hashes (JSON).
 */
import { describe, expect, it } from "vitest"

import {
  formatEventsAsCSV,
  formatEventsAsJSON,
  formatEventsAsMarkdown,
} from "@/lib/compliance/audit-log-formatters"
import type { ComplianceEvent } from "@/lib/compliance/types"

function makeEvent(overrides: Partial<ComplianceEvent>): ComplianceEvent {
  return {
    id: "evt-1",
    type: "finding.created",
    entityType: "finding",
    entityId: "finding-abc",
    message: "Risc nou inregistrat",
    createdAtISO: "2026-05-17T10:00:00.000Z",
    actorId: "user-1",
    actorLabel: "user@example.com",
    actorRole: "owner",
    actorSource: "session",
    prevHash: "GENESIS",
    selfHash: "abc123def456abc123def456abc123def456abc123def456abc123def456abcd",
    ...overrides,
  }
}

describe("formatEventsAsMarkdown", () => {
  it("returns empty placeholder when no events", () => {
    const md = formatEventsAsMarkdown([], "ACME SRL", "2026-05-17T12:00:00Z")
    expect(md).toContain("# Audit Log — ACME SRL")
    expect(md).toContain("**Total evenimente:** 0")
    expect(md).toContain("Nu există evenimente")
  })

  it("renders a single event in table", () => {
    const md = formatEventsAsMarkdown(
      [makeEvent({})],
      "ACME SRL",
      "2026-05-17T12:00:00Z",
    )
    expect(md).toContain("| Timestamp | Actor | Rol | Tip eveniment | Entitate | Mesaj | Hash |")
    expect(md).toContain("finding.created")
    expect(md).toContain("user@example.com")
    expect(md).toContain("`abc123def456`")
    expect(md).toContain("**Total evenimente:** 1")
  })

  it("sorts events newest first", () => {
    const older = makeEvent({ id: "evt-old", createdAtISO: "2026-05-15T10:00:00Z", message: "Older event" })
    const newer = makeEvent({ id: "evt-new", createdAtISO: "2026-05-17T10:00:00Z", message: "Newer event" })
    const md = formatEventsAsMarkdown([older, newer], "ACME", "2026-05-17T12:00:00Z")
    const newerIdx = md.indexOf("Newer event")
    const olderIdx = md.indexOf("Older event")
    expect(newerIdx).toBeGreaterThan(-1)
    expect(olderIdx).toBeGreaterThan(newerIdx) // newer appears first
  })

  it("escapes pipe and newline in message", () => {
    const md = formatEventsAsMarkdown(
      [makeEvent({ message: "msg with | pipe\nand newline" })],
      "ACME",
      "2026-05-17T12:00:00Z",
    )
    expect(md).toContain("msg with \\| pipe and newline")
    expect(md).not.toContain("msg with | pipe")
  })

  it("includes metadata block when event has metadata", () => {
    const md = formatEventsAsMarkdown(
      [makeEvent({ metadata: { category: "GDPR", severity: "high", count: 3 } })],
      "ACME",
      "2026-05-17T12:00:00Z",
    )
    expect(md).toContain("## Metadata detaliată")
    expect(md).toContain("**category:** `GDPR`")
    expect(md).toContain("**severity:** `high`")
    expect(md).toContain("**count:** `3`")
  })
})

describe("formatEventsAsCSV", () => {
  it("returns header only when no events", () => {
    const csv = formatEventsAsCSV([])
    expect(csv).toBe(
      "id,createdAtISO,type,entityType,entityId,actorId,actorLabel,actorRole,actorSource,message,metadata,prevHash,selfHash\r\n",
    )
  })

  it("renders single event with no special chars", () => {
    const csv = formatEventsAsCSV([makeEvent({})])
    expect(csv).toContain("evt-1,2026-05-17T10:00:00.000Z,finding.created,finding,finding-abc")
    expect(csv).toContain("user@example.com")
    expect(csv).toContain("owner,session,Risc nou inregistrat")
    expect(csv.endsWith("\r\n")).toBe(true)
  })

  it("escapes commas, quotes, and newlines per RFC 4180", () => {
    const csv = formatEventsAsCSV([
      makeEvent({
        message: 'msg with, comma and "quotes" and\nnewline',
      }),
    ])
    expect(csv).toContain('"msg with, comma and ""quotes"" and\nnewline"')
  })

  it("serializes metadata as JSON one-line, properly quoted", () => {
    const csv = formatEventsAsCSV([
      makeEvent({ metadata: { foo: "bar", n: 42 } }),
    ])
    // metadata field contains commas and quotes → must be wrapped + escaped
    expect(csv).toContain('"{""foo"":""bar"",""n"":42}"')
  })

  it("sorts events newest first", () => {
    const older = makeEvent({ id: "old", createdAtISO: "2026-05-15T10:00:00Z" })
    const newer = makeEvent({ id: "new", createdAtISO: "2026-05-17T10:00:00Z" })
    const csv = formatEventsAsCSV([older, newer])
    const newerIdx = csv.indexOf("new,")
    const olderIdx = csv.indexOf("old,")
    expect(newerIdx).toBeLessThan(olderIdx)
  })

  it("emits empty cells for missing optional fields", () => {
    const csv = formatEventsAsCSV([
      makeEvent({
        actorId: undefined,
        actorLabel: undefined,
        actorRole: undefined,
        actorSource: undefined,
        metadata: undefined,
        prevHash: undefined,
        selfHash: undefined,
      }),
    ])
    // Header + one data row
    const lines = csv.trim().split("\r\n")
    expect(lines).toHaveLength(2)
    // data row should have empty fields where optional values were stripped
    expect(lines[1]).toMatch(/^evt-1,2026-05-17T10:00:00\.000Z,finding\.created,finding,finding-abc,,,,,Risc nou inregistrat,,,$/)
  })
})

describe("formatEventsAsJSON", () => {
  it("returns '[]' for empty list", () => {
    const json = formatEventsAsJSON([], true)
    expect(json.trim()).toBe("[]")
  })

  it("includes hash chain fields when includeChainHashes=true", () => {
    const json = formatEventsAsJSON([makeEvent({})], true)
    const parsed = JSON.parse(json)
    expect(parsed).toHaveLength(1)
    expect(parsed[0]).toHaveProperty("prevHash", "GENESIS")
    expect(parsed[0]).toHaveProperty("selfHash")
    expect(parsed[0].selfHash).toMatch(/^abc123/)
  })

  it("omits hash chain fields when includeChainHashes=false", () => {
    const json = formatEventsAsJSON([makeEvent({})], false)
    const parsed = JSON.parse(json)
    expect(parsed[0]).not.toHaveProperty("prevHash")
    expect(parsed[0]).not.toHaveProperty("selfHash")
    expect(parsed[0]).toHaveProperty("id", "evt-1")
  })

  it("sorts events newest first", () => {
    const older = makeEvent({ id: "old", createdAtISO: "2026-05-15T10:00:00Z" })
    const newer = makeEvent({ id: "new", createdAtISO: "2026-05-17T10:00:00Z" })
    const json = formatEventsAsJSON([older, newer], true)
    const parsed = JSON.parse(json) as { id: string }[]
    expect(parsed[0].id).toBe("new")
    expect(parsed[1].id).toBe("old")
  })

  it("preserves metadata structure", () => {
    const json = formatEventsAsJSON(
      [makeEvent({ metadata: { tag: "test", n: 7 } })],
      true,
    )
    const parsed = JSON.parse(json)
    expect(parsed[0].metadata).toEqual({ tag: "test", n: 7 })
  })

  it("is pretty-printed (2-space indent)", () => {
    const json = formatEventsAsJSON([makeEvent({})], true)
    expect(json).toContain('    "id": "evt-1"')
  })
})
