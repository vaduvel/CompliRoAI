/**
 * Sprint 008D — Tests pentru anspdcp-breach-rescue (GDPR Art. 33 rescue
 * finding builder). Acopera: id deterministic, reverse, dedupe via status,
 * severity expirat/urgent/normal, continut markdown obligatoriu.
 */

import { describe, expect, it } from "vitest"

import {
  ANSPDCP_FINDING_PREFIX,
  anspdcpFindingId,
  buildAnspdcpBreachFinding,
  getIncidentIdFromAnspdcpFindingId,
} from "@/lib/compliance/anspdcp-breach-rescue"

describe("anspdcp-breach-rescue — id helpers", () => {
  it("anspdcpFindingId returneaza id stabil prefixat", () => {
    expect(anspdcpFindingId("breach-abc123")).toBe(`${ANSPDCP_FINDING_PREFIX}breach-abc123`)
  })

  it("getIncidentIdFromAnspdcpFindingId reverseaza prefixul", () => {
    const id = anspdcpFindingId("breach-xyz")
    expect(getIncidentIdFromAnspdcpFindingId(id)).toBe("breach-xyz")
  })

  it("getIncidentIdFromAnspdcpFindingId returneaza null pentru id-uri non-rescue", () => {
    expect(getIncidentIdFromAnspdcpFindingId("finding-other-123")).toBeNull()
    expect(getIncidentIdFromAnspdcpFindingId(ANSPDCP_FINDING_PREFIX)).toBeNull()
  })
})

describe("anspdcp-breach-rescue — buildAnspdcpBreachFinding", () => {
  const now = "2026-05-17T12:00:00.000Z"
  const breachId = "breach-rescue-1"
  const title = "Pierdere laptop cu CRM"

  it("emite finding cu severity=high cand mai sunt > 24h pana la deadline", () => {
    // discoveredAt = now - 12h, deadline = +60h ramase
    const discoveredAt = new Date(new Date(now).getTime() - 12 * 3_600_000).toISOString()
    const finding = buildAnspdcpBreachFinding(breachId, title, discoveredAt, "draft", now)

    expect(finding).not.toBeNull()
    expect(finding?.id).toBe(anspdcpFindingId(breachId))
    expect(finding?.severity).toBe("high")
    expect(finding?.category).toBe("GDPR")
    expect(finding?.title).toContain("Notificare ANSPDCP")
    expect(finding?.detail).toContain("72h")
    expect(finding?.legalReference).toContain("GDPR Art. 33")
    expect(finding?.detail).toContain("Continut obligatoriu")
  })

  it("emite finding cu severity=high cand mai sunt <=24h (urgent)", () => {
    const discoveredAt = new Date(new Date(now).getTime() - 60 * 3_600_000).toISOString()
    const finding = buildAnspdcpBreachFinding(breachId, title, discoveredAt, undefined, now)

    expect(finding?.severity).toBe("high")
    expect(finding?.detail).toMatch(/ramase din 72h/)
  })

  it("emite finding cu severity=critical cand deadline-ul a expirat", () => {
    // discoveredAt = now - 80h → expirat cu 8h
    const discoveredAt = new Date(new Date(now).getTime() - 80 * 3_600_000).toISOString()
    const finding = buildAnspdcpBreachFinding(breachId, title, discoveredAt, "draft", now)

    expect(finding?.severity).toBe("critical")
    expect(finding?.detail).toMatch(/expirat/)
  })

  it("returneaza null daca notificarea ANSPDCP a fost deja submitted", () => {
    const discoveredAt = new Date(new Date(now).getTime() - 12 * 3_600_000).toISOString()
    const finding = buildAnspdcpBreachFinding(breachId, title, discoveredAt, "submitted", now)
    expect(finding).toBeNull()
  })

  it("returneaza null daca notificarea ANSPDCP a fost acknowledged", () => {
    const discoveredAt = new Date(new Date(now).getTime() - 12 * 3_600_000).toISOString()
    const finding = buildAnspdcpBreachFinding(breachId, title, discoveredAt, "acknowledged", now)
    expect(finding).toBeNull()
  })

  it("include continut Art. 33(3) obligatoriu in detail", () => {
    const discoveredAt = new Date(new Date(now).getTime() - 1 * 3_600_000).toISOString()
    const finding = buildAnspdcpBreachFinding(breachId, title, discoveredAt, "draft", now)
    const detail = finding?.detail ?? ""
    expect(detail).toMatch(/Natura incalcarii/)
    expect(detail).toMatch(/Numar aproximativ/)
    expect(detail).toMatch(/DPO/)
    expect(detail).toMatch(/Consecinte probabile/)
    expect(detail).toMatch(/Masuri/)
  })
})
