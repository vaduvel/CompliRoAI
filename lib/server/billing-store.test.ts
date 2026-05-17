// Sprint 014 — Billing store tests.
//
// calculateUsageMetrics is pure → testable fără mock-uri pentru
// readState/writeState. Restul (createSubscription, updateSubscriptionFromWebhook)
// folosesc store-ul real → testăm cu un state mock direct.

import { describe, expect, it } from "vitest"

import { initialComplianceState } from "@/lib/compliance/engine"
import type { ComplianceState } from "@/lib/compliance/types"
import { calculateUsageMetrics } from "./billing-store"

function makeState(overrides: Partial<ComplianceState>): ComplianceState {
  return {
    ...structuredClone(initialComplianceState),
    ...overrides,
  }
}

describe("calculateUsageMetrics", () => {
  it("counts AI systems", () => {
    const state = makeState({
      aiSystems: [
        // @ts-expect-error — minimal stub
        { id: "1", name: "a", purpose: "support-chatbot" },
        // @ts-expect-error
        { id: "2", name: "b", purpose: "support-chatbot" },
      ],
    })
    const metrics = calculateUsageMetrics(state)
    expect(metrics.aiSystemsCount).toBe(2)
  })

  it("counts active findings (excludes resolved/dismissed)", () => {
    const state = makeState({
      findings: [
        // @ts-expect-error
        { id: "f1", findingStatus: "open" },
        // @ts-expect-error
        { id: "f2", findingStatus: "resolved" },
        // @ts-expect-error
        { id: "f3", findingStatus: "dismissed" },
        // @ts-expect-error
        { id: "f4", findingStatus: "confirmed" },
      ],
    })
    const metrics = calculateUsageMetrics(state)
    expect(metrics.findingsActiveCount).toBe(2)
  })

  it("counts audit packs generated this month", () => {
    const nowISO = new Date().toISOString()
    const oneMonthAgo = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString()
    const state = makeState({
      events: [
        // @ts-expect-error
        { type: "audit_pack.exported", createdAtISO: nowISO },
        // @ts-expect-error
        { type: "audit_pack.generated", createdAtISO: nowISO },
        // @ts-expect-error
        { type: "audit_pack.exported", createdAtISO: oneMonthAgo },
        // @ts-expect-error
        { type: "finding.created", createdAtISO: nowISO },
      ],
    })
    const metrics = calculateUsageMetrics(state)
    expect(metrics.auditPacksGeneratedThisMonth).toBe(2)
  })

  it("activeClients = 1 when partnerWorkspace exists, else 0", () => {
    const withCabinet = makeState({
      partnerWorkspace: {
        orgName: "Cabinet X",
        configuredAtISO: new Date().toISOString(),
      },
    })
    expect(calculateUsageMetrics(withCabinet).activeClients).toBe(1)

    const withoutCabinet = makeState({})
    expect(calculateUsageMetrics(withoutCabinet).activeClients).toBe(0)
  })

  it("returns zeros for empty state", () => {
    const empty = makeState({})
    const metrics = calculateUsageMetrics(empty)
    expect(metrics.aiSystemsCount).toBe(0)
    expect(metrics.findingsActiveCount).toBe(0)
    expect(metrics.auditPacksGeneratedThisMonth).toBe(0)
    expect(metrics.activeClients).toBe(0)
  })
})
