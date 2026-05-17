/**
 * Sprint 008D — Tests pentru breach-store (CRUD + 72h deadline + finding
 * emission rescue + workflow Art. 33 + Art. 34 + markdown export).
 *
 * Mock-uim org-context + fs ca sa rulam in-memory; restul lantului (state
 * cache, hash chain ledger, findings-store) trece prin codul real.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/server/org-context", () => ({
  getOrgContext: vi.fn(async () => ({
    orgId: "org-breach-test",
    userId: "user-breach-test",
    email: "breach@example.com",
    orgName: "Test Breach Org",
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
  attachBreachEvidence,
  buildBreachMarkdown,
  computeDeadlineStatus,
  createBreach,
  deleteBreach,
  getBreachById,
  markAnspdcpNotified,
  markSubjectsNotified,
  markSubjectNotificationSkipped,
  readBreachRecords,
  summarizeBreaches,
  updateBreach,
} from "@/lib/server/breach-store"
import type { ComplianceEventActorInput } from "@/lib/compliance/events"
import { readState } from "@/lib/server/store"
import type { BreachRecord } from "@/lib/compliance/types"

const ACTOR: ComplianceEventActorInput = {
  id: "user-breach-test",
  label: "breach@example.com",
  role: "compliance",
  source: "session",
}
const ORG = "org-breach-test"

beforeEach(async () => {
  vi.resetModules()
})

afterEach(() => {
  vi.clearAllMocks()
})

describe("breach-store — create + auto-finding emission", () => {
  it("createBreach setteaza deadline = discoveredAt + 72h, status anspdcp_required, emit rescue finding", async () => {
    const discoveredAt = "2026-05-17T08:00:00.000Z"
    const { record, linkedFindingId } = await createBreach(
      ORG,
      {
        title: "Acces neautorizat fileserver HR",
        description: "Un fileserver HR a fost accesat de o persoana neautorizata.",
        cause: "cyberattack",
        discoveredAtISO: discoveredAt,
        severity: "high",
        dataCategories: ["identification", "employee", "financial"],
        affectedSubjectsCount: 120,
        affectedSubjectsCategories: ["Angajati activi"],
        affectedSystems: ["fileserver-hr"],
        likelyConsequences: "Posibila utilizare CNP/IBAN.",
        highRiskToRights: true,
        containmentMeasures: ["Resetare parole AD"],
      },
      ACTOR,
    )

    expect(record.id).toMatch(/^breach-/)
    expect(record.deadlineISO).toBe("2026-05-20T08:00:00.000Z")
    expect(record.status).toBe("anspdcp_required")
    expect(record.anspdcpNotificationRequired).toBe(true)
    expect(record.subjectNotificationRequired).toBe(true)
    expect(record.anspdcpNotification?.status).toBe("draft")
    expect(record.assignedToEmail).toBe(ACTOR.label)
    expect(record.linkedFindingId).toBeTruthy()
    expect(linkedFindingId).toMatch(/^finding-/)
    expect(record.linkedFindingId).toBe(linkedFindingId)

    const state = await readState()
    const finding = (state.findings ?? []).find((f) => f.id === linkedFindingId)
    expect(finding).toBeTruthy()
    expect(finding?.category).toBe("GDPR")
    expect(finding?.findingStatus).toBe("open")
    expect(finding?.title).toContain("Notificare ANSPDCP")

    const createdEvt = (state.events ?? []).find(
      (e) => e.entityId === record.id && e.type === "breach.created",
    )
    expect(createdEvt).toBeTruthy()
    expect(createdEvt?.selfHash).toMatch(/^[0-9a-f]{64}$/)
    const emittedEvt = (state.events ?? []).find(
      (e) => e.entityId === linkedFindingId && e.type === "breach.finding.emitted",
    )
    expect(emittedEvt).toBeTruthy()
  })

  it("createBreach fara categorii date marcheaza anspdcpRequired=false + assessing", async () => {
    const { record, linkedFindingId } = await createBreach(
      ORG,
      {
        title: "Suspect access — sub investigatie",
        description: "Posibil incident, inca neclare detaliile.",
        cause: "other",
        dataCategories: [],
      },
      ACTOR,
    )
    expect(record.anspdcpNotificationRequired).toBe(false)
    expect(record.status).toBe("assessing")
    expect(linkedFindingId).toBeUndefined()
    expect(record.linkedFindingId).toBeUndefined()
  })

  it("createBreach respecta override-ul user pe anspdcpNotificationRequired=false chiar daca dataCategories non-vide", async () => {
    const { record } = await createBreach(
      ORG,
      {
        title: "Edge case — data dar fara persoane afectate confirmate",
        description: "Investigatie in curs.",
        cause: "misconfiguration",
        dataCategories: ["behavioral"],
        anspdcpNotificationRequired: false,
      },
      ACTOR,
    )
    expect(record.anspdcpNotificationRequired).toBe(false)
    expect(record.status).toBe("assessing")
  })
})

describe("breach-store — read + summary", () => {
  it("readBreachRecords + summarizeBreaches numara corect", async () => {
    await createBreach(
      ORG,
      {
        title: "B-summary-1",
        description: "d1",
        cause: "cyberattack",
        dataCategories: ["identification"],
        severity: "high",
        highRiskToRights: true,
      },
      ACTOR,
    )
    await createBreach(
      ORG,
      {
        title: "B-summary-2",
        description: "d2",
        cause: "other",
        dataCategories: [],
        severity: "low",
      },
      ACTOR,
    )

    const { records, summary } = await readBreachRecords(ORG)
    expect(records.length).toBeGreaterThanOrEqual(2)
    expect(summary.total).toBeGreaterThanOrEqual(2)
    expect(summary.open).toBeGreaterThanOrEqual(2)
    expect(summary.highSeverity).toBeGreaterThanOrEqual(1)
  })
})

describe("breach-store — markAnspdcpNotified workflow", () => {
  it("markAnspdcpNotified seteaza referenceNumber + tranzitie status subjects_required (highRisk)", async () => {
    const { record } = await createBreach(
      ORG,
      {
        title: "B-notify-1",
        description: "d",
        cause: "cyberattack",
        dataCategories: ["identification"],
        highRiskToRights: true,
      },
      ACTOR,
    )
    const submittedAt = "2026-05-17T20:00:00.000Z" // intra in 72h
    const updated = await markAnspdcpNotified(
      ORG,
      record.id,
      {
        referenceNumber: "ANSPDCP-2026-12345",
        submittedAtISO: submittedAt,
      },
      ACTOR,
    )
    expect(updated).toBeTruthy()
    expect(updated!.anspdcpNotification?.status).toBe("submitted")
    expect(updated!.anspdcpNotification?.referenceNumber).toBe("ANSPDCP-2026-12345")
    expect(updated!.status).toBe("subjects_required")
    const state = await readState()
    const evt = (state.events ?? []).find(
      (e) => e.entityId === record.id && e.type === "breach.anspdcp_notified",
    )
    expect(evt).toBeTruthy()
  })

  it("markAnspdcpNotified inchide direct breach-ul cand subject notification NU e ceruta", async () => {
    const { record } = await createBreach(
      ORG,
      {
        title: "B-notify-no-subj",
        description: "d",
        cause: "lost_device",
        dataCategories: ["contact"],
        highRiskToRights: false,
        subjectNotificationRequired: false,
      },
      ACTOR,
    )
    const updated = await markAnspdcpNotified(
      ORG,
      record.id,
      { referenceNumber: "REF-Q" },
      ACTOR,
    )
    expect(updated?.status).toBe("closed")
    expect(updated?.closedAtISO).toBeTruthy()
  })

  it("markAnspdcpNotified arunca eroare daca submittedAt > deadline + lipseste justificarea", async () => {
    const discoveredAt = "2026-05-10T08:00:00.000Z"
    const { record } = await createBreach(
      ORG,
      {
        title: "B-late",
        description: "d",
        cause: "third_party",
        discoveredAtISO: discoveredAt,
        dataCategories: ["financial"],
      },
      ACTOR,
    )
    // submittedAt > deadline (8h dupa 72h)
    const submittedLate = "2026-05-13T16:00:00.000Z"
    await expect(
      markAnspdcpNotified(ORG, record.id, {
        referenceNumber: "REF-LATE",
        submittedAtISO: submittedLate,
      }, ACTOR),
    ).rejects.toThrow(/justificarea/i)
  })

  it("markAnspdcpNotified accepta intarzierea cand delayJustification e furnizat", async () => {
    const discoveredAt = "2026-05-10T08:00:00.000Z"
    const { record } = await createBreach(
      ORG,
      {
        title: "B-late-ok",
        description: "d",
        cause: "third_party",
        discoveredAtISO: discoveredAt,
        dataCategories: ["financial"],
        highRiskToRights: false,
        subjectNotificationRequired: false,
      },
      ACTOR,
    )
    const submittedLate = "2026-05-13T16:00:00.000Z"
    const updated = await markAnspdcpNotified(
      ORG,
      record.id,
      {
        referenceNumber: "REF-OK",
        submittedAtISO: submittedLate,
        delayJustification: "Confirmare tehnica intarziata 96h.",
      },
      ACTOR,
    )
    expect(updated?.anspdcpNotification?.delayJustification).toMatch(/intarziata/)
    expect(updated?.status).toBe("closed")
  })
})

describe("breach-store — subject notification workflow", () => {
  it("markSubjectsNotified seteaza method + sentAt + auto-close cand ANSPDCP deja done", async () => {
    const { record } = await createBreach(
      ORG,
      {
        title: "B-subj-1",
        description: "d",
        cause: "cyberattack",
        dataCategories: ["identification"],
        highRiskToRights: true,
      },
      ACTOR,
    )
    await markAnspdcpNotified(ORG, record.id, { referenceNumber: "ANS-1" }, ACTOR)
    const updated = await markSubjectsNotified(
      ORG,
      record.id,
      { method: "email" },
      ACTOR,
    )
    expect(updated?.subjectNotification?.method).toBe("email")
    expect(updated?.subjectNotification?.sentAtISO).toBeTruthy()
    expect(updated?.status).toBe("closed")
  })

  it("markSubjectNotificationSkipped seteaza skipReason + reduce required la false", async () => {
    const { record } = await createBreach(
      ORG,
      {
        title: "B-skip-1",
        description: "d",
        cause: "misconfiguration",
        dataCategories: ["contact"],
        highRiskToRights: true,
      },
      ACTOR,
    )
    await markAnspdcpNotified(ORG, record.id, { referenceNumber: "ANS-2" }, ACTOR)
    const updated = await markSubjectNotificationSkipped(
      ORG,
      record.id,
      "Date pseudonime, risc redus, niciun impact direct identificat.",
      ACTOR,
    )
    expect(updated?.subjectNotificationRequired).toBe(false)
    expect(updated?.subjectNotification?.skipReason).toMatch(/pseudonime/)
    expect(updated?.status).toBe("closed")
  })

  it("markSubjectNotificationSkipped arunca eroare daca lipseste motivul", async () => {
    const { record } = await createBreach(
      ORG,
      {
        title: "B-skip-empty",
        description: "d",
        cause: "other",
        dataCategories: ["contact"],
      },
      ACTOR,
    )
    await expect(
      markSubjectNotificationSkipped(ORG, record.id, "  ", ACTOR),
    ).rejects.toThrow(/motivul/i)
  })

  it("markSubjectsNotified arunca eroare daca method == not_yet", async () => {
    const { record } = await createBreach(
      ORG,
      {
        title: "B-subj-bad",
        description: "d",
        cause: "other",
        dataCategories: ["contact"],
        highRiskToRights: true,
      },
      ACTOR,
    )
    await expect(
      markSubjectsNotified(ORG, record.id, { method: "not_yet" }, ACTOR),
    ).rejects.toThrow(/metoda/i)
  })
})

describe("breach-store — update + delete + evidence", () => {
  it("updateBreach merge fields + recalculeaza deadline cand discoveredAt se schimba", async () => {
    const { record } = await createBreach(
      ORG,
      {
        title: "B-upd",
        description: "d",
        cause: "other",
        discoveredAtISO: "2026-05-17T08:00:00.000Z",
        dataCategories: ["contact"],
      },
      ACTOR,
    )
    const updated = await updateBreach(
      ORG,
      record.id,
      {
        title: "B-upd-changed",
        discoveredAtISO: "2026-05-18T10:00:00.000Z",
        severity: "critical",
        containmentMeasures: ["Patched", "Audit"],
      },
      ACTOR,
    )
    expect(updated?.title).toBe("B-upd-changed")
    expect(updated?.severity).toBe("critical")
    expect(updated?.discoveredAtISO).toBe("2026-05-18T10:00:00.000Z")
    expect(updated?.deadlineISO).toBe("2026-05-21T10:00:00.000Z")
    expect(updated?.containmentMeasures).toEqual(["Patched", "Audit"])
  })

  it("deleteBreach scoate record + emite event breach.deleted", async () => {
    const { record } = await createBreach(
      ORG,
      {
        title: "B-del",
        description: "d",
        cause: "other",
        dataCategories: [],
      },
      ACTOR,
    )
    const removed = await deleteBreach(ORG, record.id, ACTOR)
    expect(removed).toBe(true)
    const after = await getBreachById(ORG, record.id)
    expect(after).toBeNull()
    const state = await readState()
    const evt = (state.events ?? []).find(
      (e) => e.entityId === record.id && e.type === "breach.deleted",
    )
    expect(evt).toBeTruthy()
  })

  it("attachBreachEvidence adauga in evidence[] cu metadata", async () => {
    const { record } = await createBreach(
      ORG,
      {
        title: "B-evid",
        description: "d",
        cause: "other",
        dataCategories: ["contact"],
      },
      ACTOR,
    )
    const updated = await attachBreachEvidence(
      ORG,
      record.id,
      { note: "Log SIEM atasat", url: "https://siem.test/log/123" },
      ACTOR,
    )
    expect(updated?.evidence?.length).toBe(1)
    expect(updated?.evidence?.[0].note).toBe("Log SIEM atasat")
    expect(updated?.evidence?.[0].url).toContain("siem.test")
    expect(updated?.evidence?.[0].attachedByEmail).toBe(ACTOR.label)
  })

  it("updateBreach pe id inexistent returneaza null", async () => {
    const r = await updateBreach(ORG, "breach-nope", { title: "x" }, ACTOR)
    expect(r).toBeNull()
  })
})

describe("breach-store — markdown export + helpers", () => {
  it("buildBreachMarkdown contine sectiuni cheie + narativa Art. 33 + Art. 34 cand required", async () => {
    const { record } = await createBreach(
      ORG,
      {
        title: "B-md",
        description: "Descriere ampla",
        cause: "cyberattack",
        dataCategories: ["identification", "financial"],
        affectedSubjectsCount: 50,
        affectedSubjectsCategories: ["Clienti B2C"],
        likelyConsequences: "Posibila frauda financiara",
        containmentMeasures: ["IP block"],
        preventionMeasures: ["MFA all-staff"],
        highRiskToRights: true,
      },
      ACTOR,
    )
    const md = buildBreachMarkdown(record, "Acme SRL")
    expect(md).toContain("Dosar breach GDPR")
    expect(md).toContain("B-md")
    expect(md).toContain("Notificare ANSPDCP")
    expect(md).toContain("Narativa ANSPDCP")
    expect(md).toContain("Narativa pentru persoanele vizate")
    expect(md).toContain("Acme SRL")
    expect(md).toContain("Posibila frauda")
  })

  it("computeDeadlineStatus returneaza level expirat/urgent/ok in functie de timp", () => {
    const future = new Date(Date.now() + 50 * 3_600_000).toISOString()
    const past = new Date(Date.now() - 5 * 3_600_000).toISOString()
    const soon = new Date(Date.now() + 6 * 3_600_000).toISOString()
    expect(computeDeadlineStatus({ deadlineISO: future } as BreachRecord).level).toBe("ok")
    expect(computeDeadlineStatus({ deadlineISO: past } as BreachRecord).level).toBe("expired")
    expect(computeDeadlineStatus({ deadlineISO: soon } as BreachRecord).level).toBe("urgent")
  })

  it("summarizeBreaches numara overdueAnspdcp + urgentAnspdcp", () => {
    const now = "2026-05-17T12:00:00.000Z"
    const records: BreachRecord[] = [
      {
        id: "b1",
        orgId: "o",
        title: "T1",
        description: "",
        cause: "other",
        discoveredAtISO: "2026-05-14T00:00:00.000Z",
        deadlineISO: "2026-05-17T00:00:00.000Z", // expirat
        severity: "high",
        dataCategories: ["identification"],
        affectedSubjectsCategories: [],
        affectedSystems: [],
        likelyConsequences: "",
        highRiskToRights: false,
        containmentMeasures: [],
        preventionMeasures: [],
        anspdcpNotificationRequired: true,
        subjectNotificationRequired: false,
        evidenceVaultIds: [],
        status: "anspdcp_required",
        createdAtISO: now,
        updatedAtISO: now,
      },
      {
        id: "b2",
        orgId: "o",
        title: "T2",
        description: "",
        cause: "other",
        discoveredAtISO: "2026-05-16T20:00:00.000Z",
        deadlineISO: "2026-05-17T20:00:00.000Z", // 8h ramase
        severity: "medium",
        dataCategories: ["contact"],
        affectedSubjectsCategories: [],
        affectedSystems: [],
        likelyConsequences: "",
        highRiskToRights: true,
        containmentMeasures: [],
        preventionMeasures: [],
        anspdcpNotificationRequired: true,
        subjectNotificationRequired: true,
        evidenceVaultIds: [],
        status: "anspdcp_required",
        createdAtISO: now,
        updatedAtISO: now,
      },
    ]
    const summary = summarizeBreaches(records, now)
    expect(summary.overdueAnspdcp).toBe(1)
    expect(summary.urgentAnspdcp).toBe(1)
    expect(summary.awaitingSubjects).toBe(1)
  })
})
