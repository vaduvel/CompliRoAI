import { describe, expect, it } from "vitest"

import { buildDsarLifecycle, resolveDsarLifecycleAction } from "./dsar-lifecycle"
import type { DsarRequest } from "@/lib/compliance/types"

const BASE_REQUEST: DsarRequest = {
  id: "dsar-1",
  orgId: "org-1",
  receivedAtISO: "2026-05-01T00:00:00.000Z",
  deadlineISO: "2026-05-31T00:00:00.000Z",
  requesterName: "Ion Popescu",
  requesterEmail: "ion@example.com",
  requestType: "access",
  status: "received",
  identityVerified: false,
  systemsScoped: false,
  dataSearchCompleted: false,
  draftResponseGenerated: false,
  responseReviewedByHuman: false,
  evidenceVaultIds: [],
  createdAtISO: "2026-05-01T00:00:00.000Z",
  updatedAtISO: "2026-05-01T00:00:00.000Z",
}

describe("DSAR lifecycle", () => {
  it("blocheaza raspunsul pana cand toti pasii obligatorii sunt bifati", () => {
    const lifecycle = buildDsarLifecycle(BASE_REQUEST, "2026-05-10T00:00:00.000Z")

    expect(lifecycle.canRespond).toBe(false)
    expect(lifecycle.currentStepId).toBe("identity")
    expect(lifecycle.blockedReasons).toContain("identitatea solicitantului")
  })

  it("permite raspunsul dupa identity, scope, search, draft si review uman", () => {
    const lifecycle = buildDsarLifecycle({
      ...BASE_REQUEST,
      identityVerified: true,
      systemsScoped: true,
      dataSearchCompleted: true,
      draftResponseGenerated: true,
      responseReviewedByHuman: true,
    })

    expect(lifecycle.canRespond).toBe(true)
    expect(lifecycle.blockedReasons).toHaveLength(0)
    expect(lifecycle.progressPercent).toBeGreaterThanOrEqual(85)
  })

  it("rezolva shortcut-uri lifecycle fara campuri moarte", () => {
    expect(resolveDsarLifecycleAction("mark-responded", BASE_REQUEST, new Date("2026-05-10T12:00:00.000Z"))).toEqual({
      status: "responded",
      responseSentAtISO: "2026-05-10T12:00:00.000Z",
    })
    expect(resolveDsarLifecycleAction("scope-systems")).toEqual({
      systemsScoped: true,
      status: "in_progress",
    })
  })
})
