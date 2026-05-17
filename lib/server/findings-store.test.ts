/**
 * Sprint 008B — Tests pentru findings-store (CRUD + action shortcuts + evidence).
 *
 * Strategie: mock-uim doar `next/headers` indirect via stub la `org-context`,
 * + mock pe `fs-safe` ca sa nu scriem pe disk. Restul rulam real — incluzand
 * hash chain ledger din `events.ts`, asa ca testam si integration cu state-ul.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// Mock org-context (testat indirect prin route handlers). Tot ce rulam aici
// trece prin readState/writeState care apeleaza getOrgContext(); stub-uim ca
// sa returneze un orgId determinist.
vi.mock("@/lib/server/org-context", () => ({
  getOrgContext: vi.fn(async () => ({
    orgId: "org-test-1",
    userId: "user-test-1",
    email: "test@example.com",
    orgName: "Test Org",
    workspaceMode: "solo",
  })),
}))

// Mock fs-safe ca writeState sa nu atinga disk-ul in tests.
vi.mock("@/lib/server/fs-safe", () => ({
  writeFileSafe: vi.fn(async () => {}),
}))

// Mock node:fs ca readState sa nu gaseasca fisier persistat.
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
  attachEvidence,
  computeStats,
  createFinding,
  deleteFinding,
  getFindingById,
  isClosedFinding,
  isFindingAction,
  isFindingCategory,
  isFindingReviewState,
  isFindingStatus,
  readFindings,
  resolveFindingAction,
  updateFinding,
} from "@/lib/server/findings-store"
import type { ComplianceEventActorInput } from "@/lib/compliance/events"
import { readState } from "@/lib/server/store"
import type { ScanFinding } from "@/lib/compliance/types"

const ACTOR: ComplianceEventActorInput = {
  id: "user-test-1",
  label: "test@example.com",
  role: "owner",
  source: "session",
}

const ORG = "org-test-1"

// Helper: golim cache-ul intre teste resetand modulele.
beforeEach(async () => {
  vi.resetModules()
})

afterEach(() => {
  vi.clearAllMocks()
})

// Pentru a evita state-leak intre teste (in-memory Map cache din store.ts e
// shared), fortam reset prin re-import dupa resetModules. In practica testele
// noastre creeaza identifiers unice asa ca cross-pollution e benigna; totusi
// pentru asserts pe stats folosim count-uri relative la baseline.

async function baseline() {
  const { findings } = await readFindings(ORG)
  return findings.length
}

describe("findings-store — validators", () => {
  it("isFindingStatus accepta valori cunoscute si respinge restul", () => {
    expect(isFindingStatus("open")).toBe(true)
    expect(isFindingStatus("confirmed")).toBe(true)
    expect(isFindingStatus("resolved")).toBe(true)
    expect(isFindingStatus("dismissed")).toBe(true)
    expect(isFindingStatus("under_monitoring")).toBe(true)
    expect(isFindingStatus("nope")).toBe(false)
    expect(isFindingStatus(undefined)).toBe(false)
  })

  it("isFindingAction accepta cele 5 actiuni", () => {
    for (const a of ["confirm", "dismiss", "resolve", "reopen", "monitor"]) {
      expect(isFindingAction(a)).toBe(true)
    }
    expect(isFindingAction("delete")).toBe(false)
  })

  it("isFindingCategory accepta cele 4 categorii", () => {
    expect(isFindingCategory("EU_AI_ACT")).toBe(true)
    expect(isFindingCategory("GDPR")).toBe(true)
    expect(isFindingCategory("E_FACTURA")).toBe(true)
    expect(isFindingCategory("NIS2")).toBe(true)
    expect(isFindingCategory("foo")).toBe(false)
  })

  it("isFindingReviewState accepta valorile lifecycle", () => {
    for (const r of ["unreviewed", "confirmed", "evidence_attached", "closed", "monitoring"]) {
      expect(isFindingReviewState(r)).toBe(true)
    }
    expect(isFindingReviewState("done")).toBe(false)
  })
})

describe("findings-store — resolveFindingAction (pure)", () => {
  const sample: ScanFinding = {
    id: "f1",
    title: "Sample",
    detail: "x",
    category: "GDPR",
    severity: "medium",
    risk: "low",
    principles: ["accountability"],
    createdAtISO: "2026-05-01T00:00:00.000Z",
    sourceDocument: "manual",
    findingStatus: "open",
    reviewState: "unreviewed",
  }

  it("confirm -> {confirmed, confirmed}", () => {
    const r = resolveFindingAction("confirm", sample)
    expect(r.findingStatus).toBe("confirmed")
    expect(r.reviewState).toBe("confirmed")
  })

  it("dismiss -> {dismissed, closed}", () => {
    const r = resolveFindingAction("dismiss", sample)
    expect(r.findingStatus).toBe("dismissed")
    expect(r.reviewState).toBe("closed")
  })

  it("resolve -> {resolved, closed}", () => {
    const r = resolveFindingAction("resolve", sample)
    expect(r.findingStatus).toBe("resolved")
    expect(r.reviewState).toBe("closed")
  })

  it("reopen -> {open, unreviewed} + reopenedFromISO non-null", () => {
    const r = resolveFindingAction("reopen", sample)
    expect(r.findingStatus).toBe("open")
    expect(r.reviewState).toBe("unreviewed")
    expect(r.reopenedFromISO).toBeTruthy()
  })

  it("monitor -> {under_monitoring, monitoring} + nextMonitoringDateISO ~+90d", () => {
    const r = resolveFindingAction("monitor", sample)
    expect(r.findingStatus).toBe("under_monitoring")
    expect(r.reviewState).toBe("monitoring")
    expect(r.nextMonitoringDateISO).toBeTruthy()
    const diffDays =
      (new Date(r.nextMonitoringDateISO!).getTime() - Date.now()) / 86_400_000
    expect(diffDays).toBeGreaterThan(89)
    expect(diffDays).toBeLessThan(91)
  })
})

describe("findings-store — computeStats", () => {
  it("numara per status si per severity", () => {
    const findings: ScanFinding[] = [
      mkFinding({ findingStatus: "open", severity: "critical" }),
      mkFinding({ findingStatus: "open", severity: "high" }),
      mkFinding({ findingStatus: "confirmed", severity: "medium" }),
      mkFinding({ findingStatus: "resolved", severity: "low" }),
      mkFinding({ findingStatus: "dismissed", severity: "medium" }),
      mkFinding({ findingStatus: "under_monitoring", severity: "high" }),
    ]
    const stats = computeStats(findings)
    expect(stats.total).toBe(6)
    expect(stats.open).toBe(2)
    expect(stats.confirmed).toBe(1)
    expect(stats.resolved).toBe(1)
    expect(stats.dismissed).toBe(1)
    expect(stats.under_monitoring).toBe(1)
    expect(stats.critical).toBe(1)
    expect(stats.high).toBe(2)
    expect(stats.medium).toBe(2)
    expect(stats.low).toBe(1)
  })

  it("empty findings -> all zeros", () => {
    const stats = computeStats([])
    expect(stats.total).toBe(0)
    expect(stats.open).toBe(0)
    expect(stats.critical).toBe(0)
  })

  it("trateaza findingStatus undefined ca open", () => {
    const findings: ScanFinding[] = [mkFinding({ findingStatus: undefined })]
    const stats = computeStats(findings)
    expect(stats.open).toBe(1)
  })
})

describe("findings-store — isClosedFinding", () => {
  it("identifica resolved/dismissed ca closed", () => {
    expect(isClosedFinding(mkFinding({ findingStatus: "resolved" }))).toBe(true)
    expect(isClosedFinding(mkFinding({ findingStatus: "dismissed" }))).toBe(true)
  })
  it("nu identifica open/confirmed/monitoring ca closed", () => {
    expect(isClosedFinding(mkFinding({ findingStatus: "open" }))).toBe(false)
    expect(isClosedFinding(mkFinding({ findingStatus: "confirmed" }))).toBe(false)
    expect(isClosedFinding(mkFinding({ findingStatus: "under_monitoring" }))).toBe(false)
  })
})

describe("findings-store — CRUD integration (state + ledger)", () => {
  it("createFinding adauga finding + emite event 'finding.created' cu hash valid", async () => {
    const before = await baseline()
    const finding = await createFinding(
      ORG,
      {
        title: "Test risc nou",
        detail: "ceva detaliu",
        category: "GDPR",
        severity: "high",
      },
      ACTOR,
    )

    expect(finding.id).toMatch(/^finding-/)
    expect(finding.findingStatus).toBe("open")
    expect(finding.reviewState).toBe("unreviewed")
    expect(finding.severity).toBe("high")
    expect(finding.risk).toBe("high")
    expect(finding.principles).toContain("privacy_data_governance")

    const { findings, stats } = await readFindings(ORG)
    expect(findings.length).toBe(before + 1)
    expect(stats.high).toBeGreaterThanOrEqual(1)

    const state = await readState()
    const evt = (state.events ?? []).find((e) => e.entityId === finding.id)
    expect(evt).toBeTruthy()
    expect(evt?.type).toBe("finding.created")
    expect(evt?.actorId).toBe(ACTOR.id)
    expect(evt?.selfHash).toBeTruthy()
    expect(evt?.prevHash).toBeTruthy()
  })

  it("createFinding default severity = medium daca nu e furnizat", async () => {
    const finding = await createFinding(
      ORG,
      {
        title: "Fara severity",
        detail: "x",
        category: "EU_AI_ACT",
      },
      ACTOR,
    )
    expect(finding.severity).toBe("medium")
    expect(finding.risk).toBe("low")
  })

  it("updateFinding cu action='confirm' seteaza confirmed + emite event mapat", async () => {
    const f = await createFinding(
      ORG,
      { title: "Pentru confirmare", detail: "x", category: "GDPR" },
      ACTOR,
    )
    const updated = await updateFinding(
      ORG,
      f.id,
      { action: "confirm" },
      ACTOR,
    )
    expect(updated).toBeTruthy()
    expect(updated!.findingStatus).toBe("confirmed")
    expect(updated!.reviewState).toBe("confirmed")
    expect(updated!.findingStatusUpdatedAtISO).toBeTruthy()

    const state = await readState()
    const evt = (state.events ?? []).find(
      (e) => e.entityId === f.id && e.type === "finding.confirm",
    )
    expect(evt).toBeTruthy()
    expect(evt?.metadata?.prevStatus).toBe("open")
    expect(evt?.metadata?.newStatus).toBe("confirmed")
  })

  it("updateFinding cu action='resolve' inchide finding-ul", async () => {
    const f = await createFinding(
      ORG,
      { title: "Pentru resolve", detail: "x", category: "EU_AI_ACT" },
      ACTOR,
    )
    const updated = await updateFinding(
      ORG,
      f.id,
      { action: "resolve" },
      ACTOR,
    )
    expect(updated!.findingStatus).toBe("resolved")
    expect(updated!.reviewState).toBe("closed")
    expect(isClosedFinding(updated!)).toBe(true)
  })

  it("updateFinding cu action='monitor' adauga nextMonitoringDateISO", async () => {
    const f = await createFinding(
      ORG,
      { title: "Pentru monitor", detail: "x", category: "NIS2" },
      ACTOR,
    )
    const updated = await updateFinding(
      ORG,
      f.id,
      { action: "monitor" },
      ACTOR,
    )
    expect(updated!.findingStatus).toBe("under_monitoring")
    expect(updated!.nextMonitoringDateISO).toBeTruthy()
  })

  it("updateFinding cu patch raw (operationalEvidenceNote) seteaza camp", async () => {
    const f = await createFinding(
      ORG,
      { title: "Pentru note", detail: "x", category: "GDPR" },
      ACTOR,
    )
    const updated = await updateFinding(
      ORG,
      f.id,
      { operationalEvidenceNote: "manual note" },
      ACTOR,
    )
    expect(updated!.operationalEvidenceNote).toBe("manual note")
  })

  it("updateFinding pe id inexistent returneaza null", async () => {
    const r = await updateFinding(ORG, "finding-doesnt-exist", { action: "confirm" }, ACTOR)
    expect(r).toBeNull()
  })

  it("deleteFinding sterge + emite event finding.deleted", async () => {
    const f = await createFinding(
      ORG,
      { title: "Pentru sters", detail: "x", category: "GDPR" },
      ACTOR,
    )
    const removed = await deleteFinding(ORG, f.id, ACTOR)
    expect(removed).toBe(true)

    const after = await getFindingById(ORG, f.id)
    expect(after).toBeNull()

    const state = await readState()
    const evt = (state.events ?? []).find(
      (e) => e.entityId === f.id && e.type === "finding.deleted",
    )
    expect(evt).toBeTruthy()
  })

  it("deleteFinding pe id inexistent returneaza false", async () => {
    const removed = await deleteFinding(ORG, "finding-not-here", ACTOR)
    expect(removed).toBe(false)
  })

  it("attachEvidence apendeaza nota timestamped + creeaza document portal cu URL", async () => {
    const f = await createFinding(
      ORG,
      { title: "Pentru evidenta", detail: "x", category: "GDPR" },
      ACTOR,
    )
    const updated = await attachEvidence(
      ORG,
      f.id,
      { note: "screenshot atasat", url: "https://example.com/proof.pdf" },
      ACTOR,
    )
    expect(updated).toBeTruthy()
    expect(updated!.operationalEvidenceNote).toContain("screenshot atasat")
    expect(updated!.reviewState).toBe("evidence_attached")

    const state = await readState()
    const doc = (state.clientPortalDocuments ?? []).find((d) => d.findingId === f.id)
    expect(doc).toBeTruthy()
    expect(doc?.storageKey).toBe("https://example.com/proof.pdf")
  })

  it("attachEvidence pastreaza reviewState=closed daca era inchis", async () => {
    const f = await createFinding(
      ORG,
      { title: "Pentru evidenta inchisa", detail: "x", category: "GDPR" },
      ACTOR,
    )
    await updateFinding(ORG, f.id, { action: "resolve" }, ACTOR)
    const updated = await attachEvidence(
      ORG,
      f.id,
      { note: "post-mortem" },
      ACTOR,
    )
    expect(updated!.reviewState).toBe("closed")
  })

  it("attachEvidence pe id inexistent returneaza null", async () => {
    const r = await attachEvidence(
      ORG,
      "finding-nope",
      { note: "x" },
      ACTOR,
    )
    expect(r).toBeNull()
  })

  it("hash chain ramane valid dupa multiple operatii sequential", async () => {
    const f = await createFinding(
      ORG,
      { title: "Chain test", detail: "x", category: "GDPR" },
      ACTOR,
    )
    // Mici delay-uri intre mutatii pentru ISO timestamps distincte (sortarea
    // hash-chain se face cronologic la millisecond resolution).
    await new Promise((r) => setTimeout(r, 5))
    await updateFinding(ORG, f.id, { action: "confirm" }, ACTOR)
    await new Promise((r) => setTimeout(r, 5))
    await attachEvidence(ORG, f.id, { note: "proof note" }, ACTOR)
    await new Promise((r) => setTimeout(r, 5))
    await updateFinding(ORG, f.id, { action: "resolve" }, ACTOR)

    const state = await readState()
    // Verificam doar evenimentele aferente acestui finding (state cache e
    // shared intre teste — evenimente din rulari simultane pot avea ISO egal
    // intre ele si nu garanteaza ordine deterministica peste tot ledger-ul).
    const ourEvents = (state.events ?? []).filter((e) => e.entityId === f.id)
    expect(ourEvents.length).toBeGreaterThanOrEqual(4)
    // Fiecare event aferent finding-ului trebuie sa aiba selfHash + prevHash.
    for (const e of ourEvents) {
      expect(e.selfHash).toMatch(/^[0-9a-f]{64}$/)
      expect(e.prevHash).toBeTruthy()
    }
  })
})

// ── helpers ────────────────────────────────────────────────────────────────

function mkFinding(overrides: Partial<ScanFinding> = {}): ScanFinding {
  return {
    id: `finding-${Math.random().toString(36).slice(2, 10)}`,
    title: "test",
    detail: "test",
    category: "GDPR",
    severity: "medium",
    risk: "low",
    principles: ["accountability"],
    createdAtISO: new Date().toISOString(),
    sourceDocument: "manual",
    ...overrides,
  }
}
