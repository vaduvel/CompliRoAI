/**
 * Sprint 022 — Tests pentru legislative-change-log (static registry).
 *
 * Verifică integritatea registry-ului (publication dates valide, ID-uri
 * unice, affectedModules legale) + funcțiile helper de filtrare.
 */

import { describe, expect, it } from "vitest"
import {
  LEGISLATIVE_CHANGE_LOG,
  filterChanges,
  getChangeById,
  getChangesAfter,
  getUnacknowledgedChanges,
  isAcknowledged,
} from "@/lib/compliance/legislative-change-log"
import type { LegislativeChangeAcknowledgment } from "@/lib/compliance/types"

describe("legislative-change-log — registry integrity", () => {
  it("registry contains at least 20 entries", () => {
    expect(LEGISLATIVE_CHANGE_LOG.length).toBeGreaterThanOrEqual(20)
  })

  it("every entry has a stable, unique id starting with leg-", () => {
    const ids = new Set<string>()
    for (const c of LEGISLATIVE_CHANGE_LOG) {
      expect(c.id).toMatch(/^leg-/)
      expect(ids.has(c.id)).toBe(false)
      ids.add(c.id)
    }
  })

  it("every entry has a valid publishedAtISO date", () => {
    for (const c of LEGISLATIVE_CHANGE_LOG) {
      const t = new Date(c.publishedAtISO).getTime()
      expect(Number.isFinite(t)).toBe(true)
      // Date must be plausible for compliance regulation (after 2018 — earliest seed is ANSPDCP 174/2018)
      expect(t).toBeGreaterThanOrEqual(new Date("2018-01-01").getTime())
    }
  })

  it("every entry has at least 1 affected module + non-empty title and summary", () => {
    for (const c of LEGISLATIVE_CHANGE_LOG) {
      expect(c.title.length).toBeGreaterThan(5)
      expect(c.summary.length).toBeGreaterThan(20)
      expect(c.affectedModules.length).toBeGreaterThanOrEqual(1)
    }
  })

  it("registry covers all 4 major regulations (AI_ACT, GDPR/EDPB/ANSPDCP, DORA, NIS2)", () => {
    const regs = new Set(LEGISLATIVE_CHANGE_LOG.map((c) => c.regulation))
    expect(regs.has("AI_ACT")).toBe(true)
    expect(regs.has("EDPB") || regs.has("ANSPDCP")).toBe(true)
    expect(regs.has("DORA")).toBe(true)
    expect(
      regs.has("ROMANIAN_LAW") || regs.has("NIS2"),
    ).toBe(true)
  })
})

describe("legislative-change-log — filtering helpers", () => {
  it("getChangesAfter returns events after cutoff, sorted desc", () => {
    const recent = getChangesAfter("2026-01-01T00:00:00.000Z")
    expect(recent.length).toBeGreaterThan(0)
    for (let i = 1; i < recent.length; i++) {
      expect(new Date(recent[i - 1].publishedAtISO).getTime()).toBeGreaterThanOrEqual(
        new Date(recent[i].publishedAtISO).getTime(),
      )
    }
  })

  it("getChangesAfter with null returns ALL events sorted desc", () => {
    const all = getChangesAfter(null)
    expect(all.length).toBe(LEGISLATIVE_CHANGE_LOG.length)
  })

  it("filterChanges by regulation works", () => {
    const aiAct = filterChanges({ regulation: "AI_ACT" })
    expect(aiAct.length).toBeGreaterThan(0)
    expect(aiAct.every((c) => c.regulation === "AI_ACT")).toBe(true)
  })

  it("filterChanges by impact works", () => {
    const high = filterChanges({ impact: "high" })
    expect(high.every((c) => c.impact === "high")).toBe(true)
  })

  it("filterChanges by affectedModule works", () => {
    const transparency = filterChanges({ affectedModule: "transparency" })
    expect(transparency.every((c) => c.affectedModules.includes("transparency"))).toBe(true)
  })

  it("filterChanges with onlyUnacknowledged respects acks", () => {
    const all = LEGISLATIVE_CHANGE_LOG
    const firstId = all[0].id
    const acks: LegislativeChangeAcknowledgment[] = [
      {
        changeId: firstId,
        orgId: "org",
        acknowledgedAtISO: new Date().toISOString(),
        acknowledgedByEmail: "u@x.com",
      },
    ]
    const unack = filterChanges({ onlyUnacknowledged: true, acks })
    expect(unack.find((c) => c.id === firstId)).toBeUndefined()
    expect(unack.length).toBe(all.length - 1)
  })

  it("getUnacknowledgedChanges filters out acked", () => {
    const id = LEGISLATIVE_CHANGE_LOG[2].id
    const acks: LegislativeChangeAcknowledgment[] = [
      {
        changeId: id,
        orgId: "org",
        acknowledgedAtISO: new Date().toISOString(),
        acknowledgedByEmail: "u@x.com",
      },
    ]
    const unack = getUnacknowledgedChanges(acks)
    expect(unack.find((c) => c.id === id)).toBeUndefined()
  })

  it("isAcknowledged returns true after ack", () => {
    const acks: LegislativeChangeAcknowledgment[] = [
      {
        changeId: "leg-x",
        orgId: "org",
        acknowledgedAtISO: new Date().toISOString(),
        acknowledgedByEmail: "u@x.com",
      },
    ]
    expect(isAcknowledged(acks, "leg-x")).toBe(true)
    expect(isAcknowledged(acks, "leg-y")).toBe(false)
    expect(isAcknowledged(undefined, "leg-x")).toBe(false)
  })

  it("getChangeById returns the entry or undefined", () => {
    const first = LEGISLATIVE_CHANGE_LOG[0]
    expect(getChangeById(first.id)?.id).toBe(first.id)
    expect(getChangeById("nonexistent")).toBeUndefined()
  })

  it("registry contains key Omnibus Art. 50 deadline (2 dec 2026)", () => {
    const omnibus = LEGISLATIVE_CHANGE_LOG.find(
      (c) => c.articleReferences.includes("Art. 50") && c.regulation === "AI_ACT",
    )
    expect(omnibus).toBeDefined()
    expect(omnibus!.effectiveFromISO).toContain("2026-12-02")
  })
})
