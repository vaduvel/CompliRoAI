// Engine — normalize + initial state tests (Sprint 008A-6).

import { describe, expect, it } from "vitest"

import { initialComplianceState, normalizeComplianceState } from "./engine"
import type { ComplianceAlert, ComplianceState, ScanFinding } from "@/lib/compliance/types"

function makeFinding(overrides: Partial<ScanFinding> = {}): ScanFinding {
  return {
    id: "f-test",
    title: "Test finding",
    detail: "x",
    category: "GDPR",
    severity: "medium",
    risk: "low",
    principles: [],
    createdAtISO: "2026-05-17T08:00:00.000Z",
    sourceDocument: "test",
    ...overrides,
  }
}

function makeAlert(overrides: Partial<ComplianceAlert> = {}): ComplianceAlert {
  return {
    id: "a-test",
    message: "msg",
    severity: "high",
    open: true,
    createdAtISO: "2026-05-17T08:00:00.000Z",
    ...overrides,
  }
}

describe("initialComplianceState", () => {
  it("expune defaults pentru toate câmpurile required din ComplianceState", () => {
    expect(initialComplianceState.highRisk).toBe(0)
    expect(initialComplianceState.lowRisk).toBe(0)
    expect(initialComplianceState.gdprProgress).toBe(0)
    expect(initialComplianceState.alerts).toEqual([])
    expect(initialComplianceState.findings).toEqual([])
    expect(initialComplianceState.events).toEqual([])
    expect(initialComplianceState.generatedDocuments).toEqual([])
    expect(initialComplianceState.aiSystems).toEqual([])
    expect(initialComplianceState.aiUseCases).toEqual([])
    expect(initialComplianceState.literacyRecords).toEqual([])
    expect(initialComplianceState.onboarding).toMatchObject({ completed: false, currentStep: 1 })
  })
})

describe("normalizeComplianceState", () => {
  it("recalculează highRisk/lowRisk din findings normalizate", () => {
    const state: ComplianceState = {
      ...initialComplianceState,
      findings: [
        makeFinding({ id: "f1", severity: "critical" }),
        makeFinding({ id: "f2", severity: "high" }),
        makeFinding({ id: "f3", severity: "medium" }),
        makeFinding({ id: "f4", severity: "low" }),
      ],
    }
    const result = normalizeComplianceState(state)
    expect(result.highRisk).toBe(2) // critical + high
    expect(result.lowRisk).toBe(2)  // medium + low
  })

  it("inferă principii implicite din category când lipsesc", () => {
    const state: ComplianceState = {
      ...initialComplianceState,
      findings: [makeFinding({ category: "GDPR", principles: [] })],
    }
    const result = normalizeComplianceState(state)
    expect(result.findings[0].principles).toEqual(
      expect.arrayContaining(["privacy_data_governance", "accountability"]),
    )
  })

  it("calculează gdprProgress din alerts open red/yellow", () => {
    const state: ComplianceState = {
      ...initialComplianceState,
      alerts: [
        makeAlert({ id: "a1", severity: "high", open: true }),  // -20
        makeAlert({ id: "a2", severity: "medium", open: true }), // -8
        makeAlert({ id: "a3", severity: "low", open: true }),    // ignored
      ],
    }
    const result = normalizeComplianceState(state)
    expect(result.gdprProgress).toBe(100 - 20 - 8) // 72
  })

  it("gdprProgress = 0 când nu există findings sau alerts", () => {
    const result = normalizeComplianceState(initialComplianceState)
    expect(result.gdprProgress).toBe(0)
  })

  it("filtrează events invalide (lipsă id/type/entityId)", () => {
    const state: ComplianceState = {
      ...initialComplianceState,
      events: [
        {
          id: "ok",
          type: "test",
          entityType: "system",
          entityId: "e",
          message: "msg",
          createdAtISO: "2026-01-01T00:00:00Z",
        },
        // @ts-expect-error — intentionally malformed pentru test defensive parse
        { id: "broken" },
      ],
    }
    const result = normalizeComplianceState(state)
    expect(result.events).toHaveLength(1)
    expect(result.events[0].id).toBe("ok")
  })

  it("normalizează driftSettings cu severityOverrides invalide", () => {
    const state: ComplianceState = {
      ...initialComplianceState,
      driftSettings: {
        // @ts-expect-error — testăm defensive
        severityOverrides: { provider_added: "bogus", model_changed: "high" },
      },
    }
    const result = normalizeComplianceState(state)
    expect(result.driftSettings).toEqual({ severityOverrides: { model_changed: "high" } })
  })
})
