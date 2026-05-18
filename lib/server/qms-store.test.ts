// Sprint 021 — qms-store tests.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/server/org-context", () => ({
  getOrgContext: vi.fn(async () => ({
    orgId: "org-qms-test",
    userId: "user-qms-test",
    email: "qms@example.com",
    orgName: "Test QMS Org",
    workspaceMode: "ai-builder",
  })),
}))

vi.mock("@/lib/server/fs-safe", () => ({
  writeFileSafe: vi.fn(async () => {}),
}))

vi.mock("node:fs", async () => {
  const actual = await vi.importActual<typeof import("node:fs")>("node:fs")
  return {
    ...actual,
    promises: {
      ...actual.promises,
      readFile: vi.fn(async () => {
        throw new Error("ENOENT")
      }),
    },
  }
})

import type { ComplianceEventActorInput } from "@/lib/compliance/events"
import { mutateFreshStateForOrg, readState } from "@/lib/server/store"
import {
  approveQms,
  attachQmsDocument,
  attestSystem,
  buildQmsMarkdownForState,
  getOrCreateQms,
  isQmsDocumentType,
  isQmsOrgSize,
  isQmsSectionKey,
  isQmsSectionStatus,
  listSystemAttestations,
  markSimplifiedMode,
  readQmsWorkspace,
  recordLesson,
  refreshAutoLessons,
  removeQmsDocument,
  revokeSystemAttestation,
  setOrganizationSize,
  updateQmsSection,
} from "@/lib/server/qms-store"

const ACTOR: ComplianceEventActorInput = {
  id: "user-qms-test",
  label: "qms@example.com",
  role: "compliance",
  source: "session",
}
const ORG = "org-qms-test"

beforeEach(async () => {
  await mutateFreshStateForOrg(ORG, (s) => ({
    ...s,
    qmsWorkspace: undefined,
    findings: [],
    events: [],
    aiSystems: [
      {
        id: "sys-1",
        name: "Credit Scoring AI",
        purpose: "credit-scoring",
        vendor: "TestVendor",
        modelType: "xgboost",
        usesPersonalData: true,
        makesAutomatedDecisions: true,
        impactsRights: true,
        hasHumanReview: true,
        riskLevel: "high",
        recommendedActions: [],
        createdAtISO: "2026-05-01T00:00:00Z",
      },
    ],
    dpiaRecords: [],
    friaRecords: [],
    pmmPlans: [],
    aiIncidents: [],
    loggingEvidence: [],
    ropaActivities: [],
    aiDataMapRecords: [],
  }))
})

afterEach(() => {
  vi.clearAllMocks()
})

describe("qms-store — type guards", () => {
  it("isQmsSectionKey accepts valid keys", () => {
    expect(isQmsSectionKey("a_regulatory_compliance_strategy")).toBe(true)
    expect(isQmsSectionKey("m_accountability_framework")).toBe(true)
    expect(isQmsSectionKey("x_invalid")).toBe(false)
  })

  it("isQmsSectionStatus accepts 5 statuses", () => {
    expect(isQmsSectionStatus("not_started")).toBe(true)
    expect(isQmsSectionStatus("approved")).toBe(true)
    expect(isQmsSectionStatus("garbage")).toBe(false)
  })

  it("isQmsDocumentType accepts 8 types", () => {
    expect(isQmsDocumentType("policy")).toBe(true)
    expect(isQmsDocumentType("audit_record")).toBe(true)
    expect(isQmsDocumentType("invalid")).toBe(false)
  })

  it("isQmsOrgSize accepts 3 sizes", () => {
    expect(isQmsOrgSize("sme")).toBe(true)
    expect(isQmsOrgSize("midsize")).toBe(true)
    expect(isQmsOrgSize("large")).toBe(true)
    expect(isQmsOrgSize("xl")).toBe(false)
  })
})

describe("qms-store — singleton getOrCreate", () => {
  it("first call creates workspace cu 13 sectiuni goale", async () => {
    const { workspace, created } = await getOrCreateQms(ORG, ACTOR)
    expect(created).toBe(true)
    expect(workspace.sections).toHaveLength(13)
    expect(workspace.status).toBe("draft")
    expect(workspace.completeness).toBe("incomplete")
    expect(workspace.simplifiedMode).toBe(true)
    expect(workspace.organizationSize).toBe("sme")
    expect(workspace.id).toMatch(/^qms-/)
  })

  it("second call returns same workspace (created=false)", async () => {
    const first = await getOrCreateQms(ORG, ACTOR)
    const second = await getOrCreateQms(ORG, ACTOR)
    expect(second.created).toBe(false)
    expect(second.workspace.id).toBe(first.workspace.id)
  })

  it("emits qms.initialized event", async () => {
    const { workspace } = await getOrCreateQms(ORG, ACTOR)
    const state = await readState()
    const evt = state.events?.find(
      (e) => e.entityId === workspace.id && e.type === "qms.initialized",
    )
    expect(evt).toBeTruthy()
  })
})

describe("qms-store — updateQmsSection", () => {
  it("updates description + procedure + role + bumps status approved stamps approvedAtISO", async () => {
    const { workspace } = await getOrCreateQms(ORG, ACTOR)
    const updated = await updateQmsSection(
      ORG,
      "a_regulatory_compliance_strategy",
      {
        status: "approved",
        description: "Strategie regulatory compliance documentata complet 30+ caractere.",
        procedureSummary: "Procedura step-by-step pentru conformity assessment 30+ caractere.",
        responsibleRole: "Quality Manager",
        responsibleEmail: "qm@example.com",
      },
      ACTOR,
    )
    const sec = updated.sections.find((s) => s.key === "a_regulatory_compliance_strategy")
    expect(sec?.status).toBe("approved")
    expect(sec?.responsibleRole).toBe("Quality Manager")
    expect(sec?.approvedAtISO).toBeTruthy()
    expect(sec?.approvedByEmail).toBe("qms@example.com")
    void workspace
  })

  it("throws when section key invalid", async () => {
    await getOrCreateQms(ORG, ACTOR)
    await expect(
      updateQmsSection(ORG, "x_invalid" as never, {}, ACTOR),
    ).rejects.toThrow(/section key invalid/i)
  })

  it("emits qms.section_updated event", async () => {
    await getOrCreateQms(ORG, ACTOR)
    await updateQmsSection(
      ORG,
      "g_risk_management_system",
      { status: "documented", description: "Descriere completa 30+", procedureSummary: "Procedura completa 30+", responsibleRole: "DPO" },
      ACTOR,
    )
    const state = await readState()
    const evt = state.events?.find((e) => e.type === "qms.section_updated")
    expect(evt).toBeTruthy()
  })
})

describe("qms-store — attachQmsDocument", () => {
  it("attaches document + auto-bumps not_started → in_progress", async () => {
    await getOrCreateQms(ORG, ACTOR)
    const w = await attachQmsDocument(
      ORG,
      "a_regulatory_compliance_strategy",
      {
        type: "policy",
        title: "Politica QMS",
        versionLabel: "v1.0",
      },
      ACTOR,
    )
    const sec = w.sections.find((s) => s.key === "a_regulatory_compliance_strategy")
    expect(sec?.status).toBe("in_progress")
    expect(sec?.documentReferences).toHaveLength(1)
    expect(sec?.documentReferences[0].type).toBe("policy")
    expect(sec?.documentReferences[0].title).toBe("Politica QMS")
  })

  it("removeQmsDocument deletes document", async () => {
    await getOrCreateQms(ORG, ACTOR)
    const w = await attachQmsDocument(
      ORG,
      "b_design_control_verification",
      { type: "procedure", title: "Doc1" },
      ACTOR,
    )
    const docId = w.sections.find((s) => s.key === "b_design_control_verification")
      ?.documentReferences[0]?.id
    expect(docId).toBeTruthy()
    const w2 = await removeQmsDocument(
      ORG,
      "b_design_control_verification",
      docId!,
      ACTOR,
    )
    expect(
      w2.sections.find((s) => s.key === "b_design_control_verification")?.documentReferences,
    ).toHaveLength(0)
  })
})

describe("qms-store — lessons", () => {
  it("recordLesson stores manual lesson newest-first", async () => {
    await getOrCreateQms(ORG, ACTOR)
    const w = await recordLesson(
      ORG,
      {
        title: "Lectie manuala",
        rootCauseSummary: "Cauza X",
        preventiveActionsTaken: ["Actiune 1", "Actiune 2"],
      },
      ACTOR,
    )
    expect(w.lessonsLearned).toHaveLength(1)
    expect(w.lessonsLearned[0].source).toBe("manual")
    expect(w.lessonsLearned[0].title).toBe("Lectie manuala")
    expect(w.lessonsLearned[0].preventiveActionsTaken).toEqual(["Actiune 1", "Actiune 2"])
  })

  it("refreshAutoLessons pulls from closed incidents + resolved anomalies", async () => {
    await getOrCreateQms(ORG, ACTOR)
    // Inject a closed incident
    await mutateFreshStateForOrg(ORG, (s) => ({
      ...s,
      aiIncidents: [
        {
          id: "inc-X",
          orgId: ORG,
          title: "Incident X",
          description: "X",
          category: "fundamental_rights_infringement",
          severity: "serious",
          linkedAISystemId: "sys-1",
          affectedSubjectsCategories: [],
          detectedAtISO: "2026-01-01T00:00:00Z",
          reportingDeadlineISO: "2026-01-16T00:00:00Z",
          reportingDeadlineDays: 15,
          notifications: [],
          notificationRequired: true,
          linkedFindingIds: [],
          status: "closed",
          closedAtISO: "2026-02-01T00:00:00Z",
          rootCause: {
            identifiedAtISO: "2026-01-10T00:00:00Z",
            identifiedByEmail: "dpo@example.com",
            rootCauseDescription: "Root cause X",
            contributingFactors: [],
            evidenceCollected: [],
            remediationActions: ["Action"],
            preventionActions: ["Prevent"],
          },
          createdAtISO: "2026-01-01T00:00:00Z",
          updatedAtISO: "2026-02-01T00:00:00Z",
        },
      ],
    }))
    const w = await refreshAutoLessons(ORG, ACTOR)
    expect(w.lessonsLearned.length).toBeGreaterThanOrEqual(1)
    expect(w.lessonsLearned.some((l) => l.source === "ai_incident")).toBe(true)
  })
})

describe("qms-store — simplified mode + org size", () => {
  it("markSimplifiedMode toggles + re-runs evaluator", async () => {
    await getOrCreateQms(ORG, ACTOR)
    const w = await markSimplifiedMode(ORG, false, ACTOR)
    expect(w.simplifiedMode).toBe(false)
  })

  it("setOrganizationSize forces simplifiedMode=false when size=large", async () => {
    await getOrCreateQms(ORG, ACTOR)
    const w = await setOrganizationSize(ORG, "large", ACTOR)
    expect(w.organizationSize).toBe("large")
    expect(w.simplifiedMode).toBe(false)
  })

  it("setOrganizationSize rejects invalid", async () => {
    await getOrCreateQms(ORG, ACTOR)
    await expect(setOrganizationSize(ORG, "xl" as never, ACTOR)).rejects.toThrow()
  })
})

describe("qms-store — system attestations", () => {
  it("attestSystem creates per-system attestation cu sections + gaps", async () => {
    await getOrCreateQms(ORG, ACTOR)
    const w = await attestSystem(
      ORG,
      {
        systemId: "sys-1",
        sectionsConfirmedCovered: [
          "a_regulatory_compliance_strategy",
          "g_risk_management_system",
        ],
        gapsAcknowledged: ["FRIA in lucru"],
      },
      ACTOR,
    )
    expect(w.systemAttestations).toHaveLength(1)
    expect(w.systemAttestations[0].systemId).toBe("sys-1")
    expect(w.systemAttestations[0].sectionsConfirmedCovered).toEqual([
      "a_regulatory_compliance_strategy",
      "g_risk_management_system",
    ])
    expect(w.systemAttestations[0].gapsAcknowledged).toEqual(["FRIA in lucru"])
  })

  it("attestSystem rejects unknown systemId", async () => {
    await getOrCreateQms(ORG, ACTOR)
    await expect(
      attestSystem(
        ORG,
        { systemId: "missing", sectionsConfirmedCovered: [] },
        ACTOR,
      ),
    ).rejects.toThrow(/AI system not found/i)
  })

  it("attestSystem replaces existing per-system attestation", async () => {
    await getOrCreateQms(ORG, ACTOR)
    await attestSystem(
      ORG,
      { systemId: "sys-1", sectionsConfirmedCovered: ["a_regulatory_compliance_strategy"] },
      ACTOR,
    )
    const w = await attestSystem(
      ORG,
      {
        systemId: "sys-1",
        sectionsConfirmedCovered: [
          "a_regulatory_compliance_strategy",
          "k_record_keeping",
        ],
      },
      ACTOR,
    )
    expect(w.systemAttestations).toHaveLength(1)
    expect(w.systemAttestations[0].sectionsConfirmedCovered).toHaveLength(2)
  })

  it("revokeSystemAttestation removes by systemId", async () => {
    await getOrCreateQms(ORG, ACTOR)
    await attestSystem(
      ORG,
      { systemId: "sys-1", sectionsConfirmedCovered: ["a_regulatory_compliance_strategy"] },
      ACTOR,
    )
    const w = await revokeSystemAttestation(ORG, "sys-1", ACTOR)
    expect(w.systemAttestations).toHaveLength(0)
  })

  it("listSystemAttestations returns attestations array", async () => {
    await getOrCreateQms(ORG, ACTOR)
    await attestSystem(
      ORG,
      { systemId: "sys-1", sectionsConfirmedCovered: ["a_regulatory_compliance_strategy"] },
      ACTOR,
    )
    const list = await listSystemAttestations(ORG)
    expect(list).toHaveLength(1)
  })
})

describe("qms-store — approval workflow", () => {
  it("approveQms sets status=approved + versionLabel bumped + nextReviewISO + 12 months", async () => {
    await getOrCreateQms(ORG, ACTOR)
    const w = await approveQms(ORG, "ceo@example.com", ACTOR, 12)
    expect(w.status).toBe("approved")
    expect(w.approvedByEmail).toBe("ceo@example.com")
    expect(w.approvedAtISO).toBeTruthy()
    expect(w.nextReviewISO).toBeTruthy()
    expect(w.versionLabel).toMatch(/v1\.0/)
  })

  it("approveQms rejects empty approvedByEmail", async () => {
    await getOrCreateQms(ORG, ACTOR)
    await expect(approveQms(ORG, "", ACTOR)).rejects.toThrow(/approvedByEmail required/i)
  })

  it("approveQms emits qms.approved event", async () => {
    await getOrCreateQms(ORG, ACTOR)
    await approveQms(ORG, "ceo@example.com", ACTOR)
    const state = await readState()
    expect(state.events?.some((e) => e.type === "qms.approved")).toBe(true)
  })
})

describe("qms-store — read + markdown rebuild", () => {
  it("readQmsWorkspace returns null when not initialized", async () => {
    const { workspace, summary } = await readQmsWorkspace(ORG)
    expect(workspace).toBeNull()
    expect(summary).toBeNull()
  })

  it("readQmsWorkspace returns workspace + summary after getOrCreate", async () => {
    await getOrCreateQms(ORG, ACTOR)
    const { workspace, summary } = await readQmsWorkspace(ORG)
    expect(workspace).toBeTruthy()
    expect(summary?.totalSections).toBe(13)
    expect(summary?.highRiskSystemsCount).toBe(1)
    expect(summary?.highRiskSystemsWithoutAttestation).toBe(1)
  })

  it("buildQmsMarkdownForState returns placeholder when no workspace", async () => {
    const md = await buildQmsMarkdownForState("ACME")
    expect(md).toContain("QMS nu a fost inițializat")
  })

  it("buildQmsMarkdownForState returns full markdown after init", async () => {
    await getOrCreateQms(ORG, ACTOR, "ACME")
    const md = await buildQmsMarkdownForState("ACME")
    expect(md).toContain("ACME")
    expect(md).toContain("Art. 17")
  })
})

describe("qms-store — evaluator integration", () => {
  it("updateQmsSection triggers evaluator + persists findings via createFinding", async () => {
    const { workspace } = await getOrCreateQms(ORG, ACTOR)
    // After init, no findings (skipFindingPersistence on init).
    const before = await readState()
    const beforeQmsFindings = (before.findings ?? []).filter((f) =>
      f.title.startsWith("QMS"),
    )
    expect(beforeQmsFindings.length).toBe(0)
    // Update triggers evaluator + finding persistence (high-risk sys-1 → multiple gaps).
    const updated = await updateQmsSection(
      ORG,
      "a_regulatory_compliance_strategy",
      { status: "in_progress" },
      ACTOR,
    )
    expect(updated.linkedFindingIds.length).toBeGreaterThan(0)
    const after = await readState()
    const afterQmsFindings = (after.findings ?? []).filter((f) =>
      f.title.startsWith("QMS"),
    )
    expect(afterQmsFindings.length).toBeGreaterThan(0)
    void workspace
  })
})
