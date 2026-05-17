/**
 * Sprint 008C — Tests pentru ropa-store (CRUD + propagation findings/
 * knowledge/triggers + machine-readable export).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/server/org-context", () => ({
  getOrgContext: vi.fn(async () => ({
    orgId: "org-ropa-test",
    userId: "user-ropa-test",
    email: "ropa@example.com",
    orgName: "Test RoPA Org",
    workspaceMode: "solo",
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

import {
  buildMachineReadableForOrg,
  buildMarkdownForOrg,
  createRopaActivity,
  deleteRopaActivity,
  evaluateRopaForOrg,
  getRopaActivityById,
  readRopaActivities,
  summarizeRopa,
  updateRopaActivity,
  upsertRopaActivities,
} from "@/lib/server/ropa-store"
import { evaluateRopaDataMap } from "@/lib/compliance/ropa-risk-engine"
import type { ComplianceEventActorInput } from "@/lib/compliance/events"
import { readState } from "@/lib/server/store"

const ACTOR: ComplianceEventActorInput = {
  id: "user-ropa-test",
  label: "ropa@example.com",
  role: "compliance",
  source: "session",
}
const ORG = "org-ropa-test"

beforeEach(async () => {
  vi.resetModules()
})

afterEach(() => {
  vi.clearAllMocks()
})

describe("ropa-store — CRUD + propagation", () => {
  it("createRopaActivity adauga activitate + evalueaza engine + emite event ropa.activity.created", async () => {
    const out = await createRopaActivity(
      ORG,
      {
        activityName: "CRM leads test",
        purpose: "Gestiune leads B2B",
        dataCategories: ["Email", "Telefon"],
        dataSubjects: ["Prospecți"],
        legalBasis: "6(1)(f)",
        retentionRule: "12 luni",
        securityMeasures: ["RBAC"],
        processors: ["HubSpot"],
      },
      ACTOR,
    )

    expect(out.activity.id).toBeTruthy()
    expect(out.activity.activityName).toBe("CRM leads test")
    expect(out.evaluation.activities.length).toBeGreaterThan(0)
    expect(out.evaluation.summary.vendorReviewTriggers).toBeGreaterThanOrEqual(1)
    // Findings emise: cel putin processor-dpa
    expect(out.emittedFindingIds.length).toBeGreaterThanOrEqual(1)

    const state = await readState()
    const findings = state.findings ?? []
    expect(findings.some((f) => f.category === "GDPR")).toBe(true)
    // Evenimentele includ ropa.activity.created + ropa.evaluated + finding.created
    const events = state.events ?? []
    expect(events.some((e) => e.type === "ropa.activity.created")).toBe(true)
    expect(events.some((e) => e.type === "ropa.evaluated")).toBe(true)
    expect(events.some((e) => e.type === "finding.created")).toBe(true)
  })

  it("createRopaActivity cu activitate fara legalBasis -> emite finding GDPR + trigger", async () => {
    const out = await createRopaActivity(
      ORG,
      {
        activityName: "Newsletter test",
        dataCategories: ["Email"],
        dataSubjects: ["Abonați"],
        legalBasis: undefined,
        retentionRule: undefined,
        securityMeasures: ["RBAC"],
      },
      ACTOR,
    )
    expect(out.evaluation.summary.missingLegalBasis).toBeGreaterThanOrEqual(1)
    expect(out.evaluation.summary.missingRetention).toBeGreaterThanOrEqual(1)
    const state = await readState()
    const findings = state.findings ?? []
    expect(findings.some((f) => f.title.toLowerCase().includes("temei"))).toBe(true)
  })

  it("createRopaActivity cu specialCategories (medical) emite DPIA trigger + finding article-9", async () => {
    const out = await createRopaActivity(
      ORG,
      {
        activityName: "Fișa medicală pacienți",
        purpose: "Tratament medical",
        dataCategories: ["Diagnostic", "Tratament"],
        dataSubjects: ["Pacienți"],
        legalBasis: "6(1)(c)",
        article9Condition: undefined,
        retentionRule: "10 ani",
        securityMeasures: ["RBAC", "Encryption"],
      },
      ACTOR,
    )
    expect(out.evaluation.summary.dpiaTriggers).toBeGreaterThanOrEqual(1)
    // Verifica trigger materializat in state
    const state = await readState()
    const triggers = state.discoveryTriggers ?? []
    expect(triggers.some((t) => t.actionType === "dpia")).toBe(true)
  })

  it("updateRopaActivity merges patch + re-emite ropa.activity.updated event", async () => {
    const created = await createRopaActivity(
      ORG,
      { activityName: "Activitate pentru update" },
      ACTOR,
    )
    const updated = await updateRopaActivity(
      ORG,
      created.activity.id,
      {
        retentionRule: "5 ani",
        legalBasis: "6(1)(a)",
        securityMeasures: ["RBAC", "MFA"],
      },
      ACTOR,
    )
    expect(updated.activity).toBeTruthy()
    expect(updated.activity!.retentionRule).toBe("5 ani")
    expect(updated.activity!.legalBasis).toBe("6(1)(a)")

    const state = await readState()
    const events = state.events ?? []
    expect(events.some((e) => e.type === "ropa.activity.updated" && e.entityId === created.activity.id)).toBe(true)
  })

  it("updateRopaActivity pe id inexistent returneaza activity=null", async () => {
    const out = await updateRopaActivity(ORG, "ropa-does-not-exist", { activityName: "X" }, ACTOR)
    expect(out.activity).toBeNull()
  })

  it("deleteRopaActivity sterge + re-evalueaza", async () => {
    const created = await createRopaActivity(ORG, { activityName: "Pentru delete" }, ACTOR)
    const removed = await deleteRopaActivity(ORG, created.activity.id, ACTOR)
    expect(removed).toBe(true)
    const after = await getRopaActivityById(ORG, created.activity.id)
    expect(after).toBeNull()

    const state = await readState()
    expect((state.events ?? []).some((e) => e.type === "ropa.activity.deleted")).toBe(true)
  })

  it("upsertRopaActivities bulk import 3 activitati + emite eveniment bulk_upsert", async () => {
    const out = await upsertRopaActivities(
      ORG,
      [
        { activityName: "Bulk #1", dataCategories: ["Email"], dataSubjects: ["Clienți"] },
        { activityName: "Bulk #2", dataCategories: ["Adresa"], dataSubjects: ["Furnizori"] },
        { activityName: "Bulk #3", dataCategories: ["Telefon"], dataSubjects: ["Parteneri"] },
      ],
      ACTOR,
    )
    expect(out.count).toBe(3)
    const state = await readState()
    expect((state.events ?? []).some((e) => e.type === "ropa.activities.bulk_upsert")).toBe(true)
    const activities = state.ropaActivities ?? []
    expect(activities.length).toBeGreaterThanOrEqual(3)
  })
})

describe("ropa-store — export + summary", () => {
  it("buildMachineReadableForOrg returneaza schema valida + activitati cu risc", async () => {
    await createRopaActivity(
      ORG,
      {
        activityName: "Export test",
        dataCategories: ["Email"],
        dataSubjects: ["Clienți"],
        legalBasis: "6(1)(a)",
        retentionRule: "12 luni",
        securityMeasures: ["RBAC"],
      },
      ACTOR,
    )
    const exported = await buildMachineReadableForOrg(ORG, "Test Org SRL")
    expect(exported.schema).toContain("compliroai.ro/schemas")
    expect(exported.schemaVersion).toBe("2026.05.ro.v1")
    expect(exported.controller.orgName).toBe("Test Org SRL")
    expect(exported.summary.exportedActivities).toBeGreaterThanOrEqual(1)
  })

  it("buildMarkdownForOrg include header + sumar + activitati", async () => {
    await createRopaActivity(
      ORG,
      { activityName: "Markdown test", purpose: "Test export" },
      ACTOR,
    )
    const md = await buildMarkdownForOrg(ORG, "Test Org SRL")
    expect(md).toContain("# RoPA / Data Map — Test Org SRL")
    expect(md).toContain("## Sumar")
    expect(md).toContain("## Activitati")
    expect(md).toContain("Markdown test")
  })

  it("evaluateRopaForOrg returneaza evaluation + summary fara save", async () => {
    const { evaluation, summary } = await evaluateRopaForOrg(ORG)
    expect(evaluation.summary).toBeTruthy()
    expect(summary.total).toBe(evaluation.summary.activityCount)
  })

  it("summarizeRopa calculează riskScoreAverage", () => {
    const evaluation = evaluateRopaDataMap({
      activities: [],
    })
    const summary = summarizeRopa(evaluation)
    expect(summary.riskScoreAverage).toBe(0)
    expect(summary.total).toBe(0)
  })

  it("readRopaActivities expune evaluation + summary curent", async () => {
    const { activities, summary } = await readRopaActivities(ORG)
    expect(Array.isArray(activities)).toBe(true)
    expect(typeof summary.total).toBe("number")
  })
})
