// S2B.3 — Tests pentru hash chain end-to-end events ledger (port Sprint 008A).

import { describe, expect, it } from "vitest"

import {
  GENESIS_HASH,
  appendComplianceEvents,
  computeEventSelfHash,
  createComplianceEvent,
  verifyEventChain,
} from "./events"
import type { ComplianceEvent, ComplianceState } from "@/lib/compliance/types"

function emptyState(): ComplianceState {
  // Minimal cast — folosim doar `events` în teste, restul e ignorat.
  return { events: [] } as unknown as ComplianceState
}

function makeEvent(overrides: Partial<ComplianceEvent> = {}): Omit<ComplianceEvent, "id"> {
  return {
    type: "test.event",
    entityType: "system" as const,
    entityId: "ent-1",
    message: "test",
    createdAtISO: "2026-01-01T00:00:00.000Z",
    ...overrides,
  }
}

describe("hash chain events ledger (S2B.3)", () => {
  it("primul eveniment primește prevHash = GENESIS", () => {
    const state = emptyState()
    const event = createComplianceEvent(makeEvent())
    const result = appendComplianceEvents(state, [event])
    expect(result).toHaveLength(1)
    expect(result[0].prevHash).toBe(GENESIS_HASH)
    expect(result[0].selfHash).toBeTruthy()
    expect(result[0].selfHash).toMatch(/^[0-9a-f]{64}$/)
  })

  it("al doilea eveniment leagă prevHash de selfHash al primului", () => {
    const state = emptyState()
    const e1 = createComplianceEvent(makeEvent({ message: "first", createdAtISO: "2026-01-01T00:00:00.000Z" }))
    const e2 = createComplianceEvent(makeEvent({ message: "second", createdAtISO: "2026-01-02T00:00:00.000Z" }))
    const result = appendComplianceEvents(state, [e1, e2])
    expect(result).toHaveLength(2)
    // Newest first în state
    const newest = result[0]
    const oldest = result[1]
    expect(oldest.prevHash).toBe(GENESIS_HASH)
    expect(newest.prevHash).toBe(oldest.selfHash)
    expect(newest.selfHash).not.toBe(oldest.selfHash)
  })

  it("hash-uri sunt deterministe (same event → same hash)", () => {
    const event: ComplianceEvent = {
      id: "evt-fixed",
      type: "test",
      entityType: "system",
      entityId: "x",
      message: "deterministic",
      createdAtISO: "2026-01-01T00:00:00.000Z",
    }
    const h1 = computeEventSelfHash(event, GENESIS_HASH)
    const h2 = computeEventSelfHash(event, GENESIS_HASH)
    expect(h1).toBe(h2)
  })

  it("hash-ul se schimbă dacă conținutul evenimentului se modifică", () => {
    const baseEvent: ComplianceEvent = {
      id: "evt-fixed",
      type: "test",
      entityType: "system",
      entityId: "x",
      message: "original",
      createdAtISO: "2026-01-01T00:00:00.000Z",
    }
    const original = computeEventSelfHash(baseEvent, GENESIS_HASH)
    const tampered = computeEventSelfHash(
      { ...baseEvent, message: "tampered" },
      GENESIS_HASH
    )
    expect(original).not.toBe(tampered)
  })

  it("verifyEventChain returnează ok pentru lanț valid", () => {
    const state = emptyState()
    const events = [
      createComplianceEvent(makeEvent({ message: "1", createdAtISO: "2026-01-01T00:00:00.000Z" })),
      createComplianceEvent(makeEvent({ message: "2", createdAtISO: "2026-01-02T00:00:00.000Z" })),
      createComplianceEvent(makeEvent({ message: "3", createdAtISO: "2026-01-03T00:00:00.000Z" })),
    ]
    const ledger = appendComplianceEvents(state, events)
    const verification = verifyEventChain(ledger)
    expect(verification.ok).toBe(true)
    if (verification.ok) {
      expect(verification.verifiedCount).toBe(3)
      expect(verification.skippedLegacyCount).toBe(0)
    }
  })

  it("verifyEventChain detectează un eveniment modificat (message)", () => {
    const state = emptyState()
    const events = [
      createComplianceEvent(makeEvent({ message: "original", createdAtISO: "2026-01-01T00:00:00.000Z" })),
      createComplianceEvent(makeEvent({ message: "next", createdAtISO: "2026-01-02T00:00:00.000Z" })),
    ]
    const ledger = appendComplianceEvents(state, events)
    // Tamper: schimbăm message-ul evenimentului mai vechi (index 1, oldest in newest-first)
    const tampered = [...ledger]
    tampered[1] = { ...tampered[1], message: "TAMPERED" }
    const verification = verifyEventChain(tampered)
    expect(verification.ok).toBe(false)
    if (!verification.ok) {
      expect(verification.brokenAt.reason).toContain("selfHash")
    }
  })

  it("verifyEventChain detectează un eveniment cu prevHash incorect", () => {
    const state = emptyState()
    const events = [
      createComplianceEvent(makeEvent({ message: "1", createdAtISO: "2026-01-01T00:00:00.000Z" })),
      createComplianceEvent(makeEvent({ message: "2", createdAtISO: "2026-01-02T00:00:00.000Z" })),
    ]
    const ledger = appendComplianceEvents(state, events)
    // Tamper: schimbăm prevHash al celui mai nou
    const tampered = [...ledger]
    tampered[0] = { ...tampered[0], prevHash: "fake-prev-hash" }
    const verification = verifyEventChain(tampered)
    expect(verification.ok).toBe(false)
    if (!verification.ok) {
      expect(verification.brokenAt.reason).toContain("prevHash")
    }
  })

  it("evenimente legacy (fără selfHash) sunt skip-uite, restul verificate", () => {
    const legacy: ComplianceEvent = {
      id: "evt-legacy",
      type: "test",
      entityType: "system",
      entityId: "x",
      message: "old without hash",
      createdAtISO: "2025-01-01T00:00:00.000Z",
      // No selfHash / prevHash
    }
    const state: ComplianceState = { events: [legacy] } as unknown as ComplianceState
    const newEvents = [
      createComplianceEvent(makeEvent({ message: "new", createdAtISO: "2026-01-01T00:00:00.000Z" })),
    ]
    const ledger = appendComplianceEvents(state, newEvents)
    const verification = verifyEventChain(ledger)
    expect(verification.ok).toBe(true)
    if (verification.ok) {
      expect(verification.verifiedCount).toBe(1)
      expect(verification.skippedLegacyCount).toBe(1)
    }
  })

  it("appendComplianceEvents păstrează limita de 200 evenimente", () => {
    let state = emptyState()
    for (let i = 0; i < 5; i++) {
      const events = Array.from({ length: 50 }, (_, j) =>
        createComplianceEvent(
          makeEvent({
            message: `batch-${i}-${j}`,
            createdAtISO: new Date(2026, 0, 1, i, j).toISOString(),
          })
        )
      )
      state = { ...state, events: appendComplianceEvents(state, events) }
    }
    expect((state.events ?? []).length).toBe(200)
  })

  it("hash chain rămâne intact peste multe batch-uri appended", () => {
    let state = emptyState()
    for (let batch = 0; batch < 3; batch++) {
      const events = [
        createComplianceEvent(
          makeEvent({
            message: `batch-${batch}-a`,
            createdAtISO: new Date(2026, 0, batch + 1, 0).toISOString(),
          })
        ),
        createComplianceEvent(
          makeEvent({
            message: `batch-${batch}-b`,
            createdAtISO: new Date(2026, 0, batch + 1, 1).toISOString(),
          })
        ),
      ]
      state = { ...state, events: appendComplianceEvents(state, events) }
    }
    const verification = verifyEventChain(state.events!)
    expect(verification.ok).toBe(true)
    if (verification.ok) {
      expect(verification.verifiedCount).toBe(6)
    }
  })
})
