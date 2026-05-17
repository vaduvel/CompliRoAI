import { describe, expect, it } from "vitest"

import { evaluateNis2AISystem } from "@/lib/compliance/nis2-ai-rules"
import type {
  AISystemRecord,
  OrgRegulatoryProfile,
} from "@/lib/compliance/types"

const NOW = "2026-05-17T10:00:00.000Z"

function baseOrg(overrides: Partial<OrgRegulatoryProfile> = {}): OrgRegulatoryProfile {
  return {
    orgId: "org-test",
    doraApplies: false,
    doraEntityType: "not_applicable",
    nis2EntityClass: "essential",
    nis2Sectors: ["digital_infrastructure"],
    createdAtISO: NOW,
    updatedAtISO: NOW,
    ...overrides,
  }
}

function baseSystem(overrides: Partial<AISystemRecord> = {}): AISystemRecord {
  return {
    id: "sys-1",
    name: "Cyber Defense Copilot",
    purpose: "fraud-detection",
    vendor: "InternalSecCo",
    modelType: "transformer",
    usesPersonalData: true,
    makesAutomatedDecisions: true,
    impactsRights: true,
    hasHumanReview: true,
    riskLevel: "high",
    recommendedActions: [
      "fallback documented (failover to manual)",
      "incident escalation playbook DNSC",
    ],
    createdAtISO: NOW,
    policyAttestationStatus: "attested",
    nis2EntityScope: {
      inScope: true,
      service: "fraud monitoring",
    },
    ...overrides,
  }
}

describe("evaluateNis2AISystem", () => {
  it("returns no gaps when org is not NIS2-scoped", () => {
    const result = evaluateNis2AISystem(
      baseSystem(),
      baseOrg({ nis2EntityClass: "not_in_scope" }),
      NOW,
    )
    expect(result.inScope).toBe(false)
    expect(result.findings).toHaveLength(0)
  })

  it("returns no gaps when system is not marked in scope", () => {
    const result = evaluateNis2AISystem(
      baseSystem({ nis2EntityScope: { inScope: false } }),
      baseOrg(),
      NOW,
    )
    expect(result.inScope).toBe(false)
    expect(result.findings).toHaveLength(0)
  })

  it("emits critical finding when human oversight missing (essential entity)", () => {
    const result = evaluateNis2AISystem(
      baseSystem({ hasHumanReview: false }),
      baseOrg(),
      NOW,
    )
    expect(result.inScope).toBe(true)
    expect(result.gaps).toContain("human_oversight_missing")
    const f = result.findings.find((x) =>
      x.id.endsWith("-human_oversight_missing"),
    )
    expect(f?.severity).toBe("critical")
    expect(f?.legalReference).toContain("Art. 21(2)(a)")
    expect(f?.category).toBe("NIS2")
  })

  it("emits high finding when human oversight missing (important entity)", () => {
    const result = evaluateNis2AISystem(
      baseSystem({ hasHumanReview: false }),
      baseOrg({ nis2EntityClass: "important" }),
      NOW,
    )
    const f = result.findings.find((x) =>
      x.id.endsWith("-human_oversight_missing"),
    )
    expect(f?.severity).toBe("high")
  })

  it("emits finding when incident escalation procedure not documented", () => {
    const result = evaluateNis2AISystem(
      baseSystem({ recommendedActions: ["update model quarterly"] }),
      baseOrg(),
      NOW,
    )
    expect(result.gaps).toContain("incident_escalation_undocumented")
    const f = result.findings.find((x) =>
      x.id.endsWith("-incident_escalation_undocumented"),
    )
    expect(f?.legalReference).toContain("Art. 23")
  })

  it("emits business continuity finding when AI makes decisions without fallback", () => {
    const result = evaluateNis2AISystem(
      baseSystem({
        makesAutomatedDecisions: true,
        recommendedActions: ["incident escalation documented"],
      }),
      baseOrg(),
      NOW,
    )
    expect(result.gaps).toContain("business_continuity_missing")
  })

  it("emits supply-chain finding for unknown vendor", () => {
    const result = evaluateNis2AISystem(
      baseSystem({ vendor: "" }),
      baseOrg(),
      NOW,
    )
    expect(result.gaps).toContain("supply_chain_unknown_vendor")
    const f = result.findings.find((x) =>
      x.id.endsWith("-supply_chain_unknown_vendor"),
    )
    expect(f?.legalReference).toContain("Art. 21(2)(e)")
  })

  it("emits logging-evidence finding when policy not attested", () => {
    const result = evaluateNis2AISystem(
      baseSystem({ policyAttestationStatus: "not-attested" }),
      baseOrg(),
      NOW,
    )
    expect(result.gaps).toContain("logging_evidence_missing")
    const f = result.findings.find((x) =>
      x.id.endsWith("-logging_evidence_missing"),
    )
    expect(f?.severity).toBe("high")
  })

  it("emits DORA coordination finding when org is banking but DORA not declared", () => {
    const result = evaluateNis2AISystem(
      baseSystem(),
      baseOrg({
        nis2Sectors: ["banking"],
        doraApplies: false,
      }),
      NOW,
    )
    expect(result.gaps).toContain("dora_nis2_coordination_missing")
    const f = result.findings.find((x) =>
      x.id.endsWith("-dora_nis2_coordination_missing"),
    )
    expect(f?.severity).toBe("medium")
  })

  it("does NOT emit DORA coordination finding when DORA already declared", () => {
    const result = evaluateNis2AISystem(
      baseSystem(),
      baseOrg({
        nis2Sectors: ["banking"],
        doraApplies: true,
        doraEntityType: "credit_institution",
      }),
      NOW,
    )
    expect(result.gaps).not.toContain("dora_nis2_coordination_missing")
  })

  it("produces stable finding ids (idempotent re-evaluation)", () => {
    const a = evaluateNis2AISystem(
      baseSystem({ hasHumanReview: false }),
      baseOrg(),
      NOW,
    )
    const b = evaluateNis2AISystem(
      baseSystem({ hasHumanReview: false }),
      baseOrg(),
      "2027-01-01T00:00:00.000Z",
    )
    expect(a.findings.map((f) => f.id).sort()).toEqual(
      b.findings.map((f) => f.id).sort(),
    )
  })

  it("returns empty findings when fully satisfied", () => {
    const result = evaluateNis2AISystem(baseSystem(), baseOrg(), NOW)
    expect(result.inScope).toBe(true)
    expect(result.gaps).toHaveLength(0)
    expect(result.findings).toHaveLength(0)
    expect(result.aggregatedSeverity).toBe("low")
  })
})
