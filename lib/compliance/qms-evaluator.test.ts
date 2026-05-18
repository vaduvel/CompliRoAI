import { describe, expect, it } from "vitest"

import {
  applyCrossModuleCounts,
  buildQmsMarkdown,
  computeCrossModuleCounts,
  computeOverallCompleteness,
  evaluateQms,
  isSectionCountedAsDone,
  isSectionDocumented,
} from "./qms-evaluator"
import { QMS_SCHEMA_V1, getQmsSectionKeysInOrder } from "./qms-schema"
import type {
  ComplianceState,
  QmsSectionContent,
  QmsSectionKey,
  QmsWorkspace,
} from "@/lib/compliance/types"

// ── Test helpers ─────────────────────────────────────────────────────────────

function emptySection(key: QmsSectionKey): QmsSectionContent {
  return {
    key,
    status: "not_started",
    description: "",
    procedureSummary: "",
    responsibleRole: "",
    documentReferences: [],
  }
}

function documentedSection(key: QmsSectionKey): QmsSectionContent {
  return {
    key,
    status: "documented",
    description: "Descriere completa de minim 30 caractere pentru audit-clean.",
    procedureSummary: "Procedura step-by-step de minim 30 caractere documentata.",
    responsibleRole: "Quality Manager",
    documentReferences: [
      {
        id: "doc-1",
        type: "policy",
        title: "Politica QMS V1",
        attachedAtISO: "2026-01-01T00:00:00.000Z",
        attachedByEmail: "qm@example.com",
        versionLabel: "v1.0",
      },
    ],
  }
}

function buildWorkspace(overrides: Partial<QmsWorkspace> = {}): QmsWorkspace {
  return {
    id: "qms-1",
    orgId: "org-1",
    organizationSize: "midsize",
    simplifiedMode: false,
    sections: getQmsSectionKeysInOrder().map(emptySection),
    lessonsLearned: [],
    systemAttestations: [],
    status: "draft",
    completeness: "incomplete",
    versionLabel: "v0.1 — draft",
    linkedFindingIds: [],
    createdAtISO: "2026-05-01T00:00:00.000Z",
    updatedAtISO: "2026-05-01T00:00:00.000Z",
    ...overrides,
  }
}

function buildEmptyState(): Pick<
  ComplianceState,
  | "aiSystems"
  | "ropaActivities"
  | "aiDataMapRecords"
  | "dpiaRecords"
  | "friaRecords"
  | "findings"
  | "pmmPlans"
  | "aiIncidents"
  | "loggingEvidence"
> {
  return {
    aiSystems: [],
    ropaActivities: [],
    aiDataMapRecords: [],
    dpiaRecords: [],
    friaRecords: [],
    findings: [],
    pmmPlans: [],
    aiIncidents: [],
    loggingEvidence: [],
  }
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("QMS evaluator — isSectionDocumented", () => {
  it("returns false for empty section", () => {
    expect(isSectionDocumented(emptySection("a_regulatory_compliance_strategy"))).toBe(false)
  })

  it("returns true when description + procedure + role + >=1 doc", () => {
    expect(isSectionDocumented(documentedSection("a_regulatory_compliance_strategy"))).toBe(true)
  })

  it("returns false when description < 30 chars", () => {
    const s = documentedSection("a_regulatory_compliance_strategy")
    s.description = "short"
    expect(isSectionDocumented(s)).toBe(false)
  })

  it("returns false when no document attached", () => {
    const s = documentedSection("a_regulatory_compliance_strategy")
    s.documentReferences = []
    expect(isSectionDocumented(s)).toBe(false)
  })
})

describe("QMS evaluator — isSectionCountedAsDone", () => {
  it("status approved counts as done", () => {
    const s = documentedSection("a_regulatory_compliance_strategy")
    s.status = "approved"
    expect(isSectionCountedAsDone(s)).toBe(true)
  })

  it("status needs_update does NOT count as done", () => {
    const s = documentedSection("a_regulatory_compliance_strategy")
    s.status = "needs_update"
    expect(isSectionCountedAsDone(s)).toBe(false)
  })

  it("status in_progress with documented fields counts as done", () => {
    const s = documentedSection("a_regulatory_compliance_strategy")
    s.status = "in_progress"
    expect(isSectionCountedAsDone(s)).toBe(true)
  })
})

describe("QMS evaluator — computeCrossModuleCounts", () => {
  it("populates counts for (f) (g) (h) (i) (k)", () => {
    const state = buildEmptyState()
    state.ropaActivities = [{ id: "r1" } as never, { id: "r2" } as never]
    state.aiDataMapRecords = [{ id: "a1" } as never]
    state.dpiaRecords = [{ id: "d1" } as never]
    state.friaRecords = [{ id: "f1" } as never, { id: "f2" } as never]
    state.findings = [
      { id: "fnd1", findingStatus: "open" } as never,
      { id: "fnd2", findingStatus: "resolved" } as never,
    ]
    state.pmmPlans = [{ id: "p1" } as never, { id: "p2" } as never, { id: "p3" } as never]
    state.aiIncidents = [{ id: "i1" } as never]
    state.loggingEvidence = [{ id: "lg1" } as never]

    const counts = computeCrossModuleCounts(state)
    expect(counts.f_data_management_systems?.linkedRopaActivityCount).toBe(2)
    expect(counts.f_data_management_systems?.linkedAIDataMapCount).toBe(1)
    expect(counts.g_risk_management_system?.linkedDpiaCount).toBe(1)
    expect(counts.g_risk_management_system?.linkedFriaCount).toBe(2)
    // 1 open + 1 resolved = 1 open counted
    expect(counts.g_risk_management_system?.linkedFindingCount).toBe(1)
    expect(counts.h_post_market_monitoring?.linkedPmmPlanCount).toBe(3)
    expect(counts.i_serious_incident_reporting?.linkedAIIncidentCount).toBe(1)
    expect(counts.k_record_keeping?.linkedLoggingConfigCount).toBe(1)
  })

  it("applyCrossModuleCounts merges counts into section content (immutable)", () => {
    const sections = [emptySection("g_risk_management_system")]
    const counts = {
      g_risk_management_system: {
        linkedDpiaCount: 3,
        linkedFriaCount: 1,
        linkedFindingCount: 0,
      },
    }
    const next = applyCrossModuleCounts(sections, counts)
    expect(next[0].linkedDpiaCount).toBe(3)
    expect(next[0].linkedFriaCount).toBe(1)
    // immutability check
    expect(sections[0].linkedDpiaCount).toBeUndefined()
  })
})

describe("QMS evaluator — computeOverallCompleteness", () => {
  it("incomplete when all sections empty", () => {
    const w = buildWorkspace()
    expect(computeOverallCompleteness(w)).toBe("incomplete")
  })

  it("partial when >=8 sections documented", () => {
    const keys = getQmsSectionKeysInOrder()
    const w = buildWorkspace({
      sections: keys.map((k, i) =>
        i < 9 ? documentedSection(k) : emptySection(k),
      ),
    })
    expect(computeOverallCompleteness(w)).toBe("partial")
  })

  it("complete when ALL 13 sections documented (non-simplified)", () => {
    const w = buildWorkspace({
      sections: getQmsSectionKeysInOrder().map(documentedSection),
    })
    expect(computeOverallCompleteness(w)).toBe("complete")
  })

  it("simplified mode: complete when all 9 essentials documented", () => {
    const essentialKeys = QMS_SCHEMA_V1.sections
      .filter((s) => s.tier === "essential")
      .map((s) => s.key)
    const w = buildWorkspace({
      simplifiedMode: true,
      sections: getQmsSectionKeysInOrder().map((k) =>
        essentialKeys.includes(k) ? documentedSection(k) : emptySection(k),
      ),
    })
    expect(computeOverallCompleteness(w)).toBe("complete")
  })

  it("simplified mode: incomplete when no essentials done", () => {
    const w = buildWorkspace({ simplifiedMode: true })
    expect(computeOverallCompleteness(w)).toBe("incomplete")
  })
})

describe("QMS evaluator — evaluateQms gaps + findings", () => {
  it("empty workspace emits 13 section_missing_documentation findings", () => {
    const w = buildWorkspace()
    const state = buildEmptyState()
    const result = evaluateQms({ workspace: w, orgName: "ACME", state })
    expect(result.completeness).toBe("incomplete")
    const sectionGaps = result.gaps.filter(
      (g) => g.code === "section_missing_documentation",
    )
    expect(sectionGaps).toHaveLength(13)
    expect(result.candidateFindings.length).toBeGreaterThanOrEqual(13)
  })

  it("emits approval_overdue when approvedAtISO > 12 months ago", () => {
    const w = buildWorkspace({
      approvedAtISO: "2024-01-01T00:00:00.000Z",
      status: "approved",
    })
    const result = evaluateQms({
      workspace: w,
      orgName: "ACME",
      state: buildEmptyState(),
      nowISO: "2026-05-18T00:00:00.000Z",
    })
    expect(result.gaps.some((g) => g.code === "approval_overdue")).toBe(true)
    expect(
      result.candidateFindings.some((f) => f.id.includes("approval-overdue")),
    ).toBe(true)
  })

  it("emits risk_management_no_dpia_no_fria when sectionG present + 0 DPIA + 0 FRIA", () => {
    const w = buildWorkspace()
    const state = buildEmptyState()
    const result = evaluateQms({ workspace: w, orgName: "ACME", state })
    expect(
      result.gaps.some((g) => g.code === "risk_management_no_dpia_no_fria"),
    ).toBe(true)
  })

  it("does NOT emit risk_management_no_dpia_no_fria when dpiaRecords > 0", () => {
    const w = buildWorkspace()
    const state = buildEmptyState()
    state.dpiaRecords = [{ id: "d1" } as never]
    const result = evaluateQms({ workspace: w, orgName: "ACME", state })
    expect(
      result.gaps.some((g) => g.code === "risk_management_no_dpia_no_fria"),
    ).toBe(false)
  })

  it("emits pmm_no_active_plans when high-risk systems exist + 0 PMM plans", () => {
    const w = buildWorkspace()
    const state = buildEmptyState()
    state.aiSystems = [{ id: "s1", riskLevel: "high", name: "Sys 1" } as never]
    const result = evaluateQms({ workspace: w, orgName: "ACME", state })
    expect(result.gaps.some((g) => g.code === "pmm_no_active_plans")).toBe(true)
  })

  it("emits record_keeping_no_logging when high-risk + 0 logging configs", () => {
    const w = buildWorkspace()
    const state = buildEmptyState()
    state.aiSystems = [{ id: "s1", riskLevel: "high", name: "Sys 1" } as never]
    const result = evaluateQms({ workspace: w, orgName: "ACME", state })
    expect(result.gaps.some((g) => g.code === "record_keeping_no_logging")).toBe(true)
  })

  it("emits high_risk_system_no_attestation when high-risk systems missing attestation", () => {
    const w = buildWorkspace()
    const state = buildEmptyState()
    state.aiSystems = [
      { id: "s1", riskLevel: "high", name: "Sys 1" } as never,
      { id: "s2", riskLevel: "high", name: "Sys 2" } as never,
    ]
    const result = evaluateQms({ workspace: w, orgName: "ACME", state })
    const gap = result.gaps.find((g) => g.code === "high_risk_system_no_attestation")
    expect(gap).toBeDefined()
    expect(gap?.message).toContain("2 sistem")
  })

  it("does NOT emit attestation gap when all high-risk systems are attested", () => {
    const w = buildWorkspace({
      systemAttestations: [
        {
          systemId: "s1",
          attestedAtISO: "2026-01-01T00:00:00.000Z",
          attestedByEmail: "qm@example.com",
          qmsVersionLabel: "v1.0",
          sectionsConfirmedCovered: ["a_regulatory_compliance_strategy"],
          gapsAcknowledged: [],
        },
      ],
    })
    const state = buildEmptyState()
    state.aiSystems = [{ id: "s1", riskLevel: "high", name: "Sys 1" } as never]
    const result = evaluateQms({ workspace: w, orgName: "ACME", state })
    expect(
      result.gaps.some((g) => g.code === "high_risk_system_no_attestation"),
    ).toBe(false)
  })

  it("simplified mode skips advanced section gaps", () => {
    const w = buildWorkspace({ simplifiedMode: true })
    const result = evaluateQms({
      workspace: w,
      orgName: "ACME",
      state: buildEmptyState(),
    })
    const advancedKeys = QMS_SCHEMA_V1.sections
      .filter((s) => s.tier === "advanced")
      .map((s) => s.key)
    for (const advKey of advancedKeys) {
      expect(
        result.gaps.some(
          (g) =>
            g.sectionKey === advKey && g.code === "section_missing_documentation",
        ),
      ).toBe(false)
    }
  })

  it("generates markdown with all 13 sections + lessons + attestations", () => {
    const w = buildWorkspace({
      sections: getQmsSectionKeysInOrder().map(documentedSection),
      lessonsLearned: [
        {
          id: "l1",
          source: "ai_incident",
          sourceEntityId: "inc-1",
          title: "Test lesson",
          rootCauseSummary: "Cause described.",
          preventiveActionsTaken: ["Action 1"],
          recordedAtISO: "2026-05-01T00:00:00.000Z",
          recordedByEmail: "owner@example.com",
          applicableToSystems: ["s1"],
        },
      ],
      systemAttestations: [
        {
          systemId: "s1",
          attestedAtISO: "2026-05-01T00:00:00.000Z",
          attestedByEmail: "qm@example.com",
          qmsVersionLabel: "v1.0",
          sectionsConfirmedCovered: ["a_regulatory_compliance_strategy"],
          gapsAcknowledged: [],
        },
      ],
    })
    const md = buildQmsMarkdown({
      workspace: w,
      orgName: "ACME",
      state: { aiSystems: [{ id: "s1", riskLevel: "high", name: "Sys" } as never] },
    })
    expect(md).toContain("# QMS — Sistem Management Calitate (Art. 17 EU AI Act)")
    expect(md).toContain("ACME")
    expect(md).toContain("a. Strategie")
    expect(md).toContain("m. Accountability")
    expect(md).toContain("## Lessons Learned")
    expect(md).toContain("Test lesson")
    expect(md).toContain("## Per-System Attestations")
    expect(md).toContain("Sys")
  })

  it("evaluator returns identical markdown via internal pipeline", () => {
    const w = buildWorkspace()
    const result = evaluateQms({
      workspace: w,
      orgName: "ACME",
      state: buildEmptyState(),
    })
    expect(result.generatedMarkdown).toContain("ACME")
    expect(result.generatedMarkdown).toContain("Art. 17")
  })
})
