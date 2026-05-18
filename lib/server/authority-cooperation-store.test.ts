/**
 * Sprint 026 — Tests pentru authority-cooperation-store (Art. 21 + Art. 26(11)).
 *
 * Strategie identică cu findings-store.test.ts: mock pe org-context + fs.
 */

import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/server/org-context", () => ({
  getOrgContext: vi.fn(async () => ({
    orgId: "org-test-1",
    userId: "user-test-1",
    email: "test@example.com",
    orgName: "Test Org",
    workspaceMode: "solo",
  })),
}))

vi.mock("@/lib/server/fs-safe", () => ({
  writeFileSafe: vi.fn(async () => {}),
}))

// In-memory shared mutable state across reads/writes inside a test.
const inMemoryState: { current: Record<string, unknown> | null } = { current: null }

vi.mock("node:fs", async () => {
  const actual = await vi.importActual<typeof import("node:fs")>("node:fs")
  return {
    ...actual,
    promises: {
      ...actual.promises,
      readFile: vi.fn(async () => {
        if (!inMemoryState.current) throw new Error("ENOENT")
        return JSON.stringify(inMemoryState.current)
      }),
      writeFile: vi.fn(async (_path: string, content: string) => {
        try {
          inMemoryState.current = JSON.parse(content) as Record<string, unknown>
        } catch {
          // ignore
        }
      }),
      mkdir: vi.fn(async () => {}),
    },
  }
})

import {
  AUTHORITY_LABELS,
  STATUS_LABELS,
  buildAuthorityCooperationMarkdown,
  createAuthorityCooperationRequest,
  deleteAuthorityCooperationRequest,
  isAuthorityCooperationAuthority,
  isAuthorityCooperationStatus,
  listAuthorityCooperationRequests,
  updateAuthorityCooperationRequest,
} from "./authority-cooperation-store"

beforeEach(() => {
  inMemoryState.current = null
})

describe("type guards", () => {
  it("isAuthorityCooperationAuthority validează valorile cunoscute", () => {
    expect(isAuthorityCooperationAuthority("anspdcp")).toBe(true)
    expect(isAuthorityCooperationAuthority("adr")).toBe(true)
    expect(isAuthorityCooperationAuthority("ancom")).toBe(true)
    expect(isAuthorityCooperationAuthority("asf")).toBe(true)
    expect(isAuthorityCooperationAuthority("ai-office")).toBe(true)
    expect(isAuthorityCooperationAuthority("market-surveillance-authority")).toBe(true)
    expect(isAuthorityCooperationAuthority("fundamental-rights-authority")).toBe(true)
    expect(isAuthorityCooperationAuthority("other")).toBe(true)
    expect(isAuthorityCooperationAuthority("bogus")).toBe(false)
    expect(isAuthorityCooperationAuthority(null)).toBe(false)
  })

  it("isAuthorityCooperationStatus validează valorile cunoscute", () => {
    expect(isAuthorityCooperationStatus("received")).toBe(true)
    expect(isAuthorityCooperationStatus("in-progress")).toBe(true)
    expect(isAuthorityCooperationStatus("responded")).toBe(true)
    expect(isAuthorityCooperationStatus("closed")).toBe(true)
    expect(isAuthorityCooperationStatus("other")).toBe(false)
  })
})

describe("labels expune autorități + statuses", () => {
  it("toate cele 8 autorități sunt etichetate RO", () => {
    expect(Object.keys(AUTHORITY_LABELS)).toHaveLength(8)
    expect(AUTHORITY_LABELS.anspdcp).toContain("ANSPDCP")
    expect(AUTHORITY_LABELS["ai-office"]).toContain("AI Office")
  })
  it("4 statuses etichetate RO", () => {
    expect(Object.keys(STATUS_LABELS)).toHaveLength(4)
  })
})

describe("createAuthorityCooperationRequest", () => {
  it("creează un record cu status=received + timestamp + ID", async () => {
    const record = await createAuthorityCooperationRequest({
      authority: "anspdcp",
      subject: "Solicitare documentație tehnică sistem AI HR",
      responsibleEmail: "dpo@example.com",
      createdByEmail: "admin@example.com",
    })
    expect(record.id).toMatch(/^auth-coop-/)
    expect(record.status).toBe("received")
    expect(record.authority).toBe("anspdcp")
    expect(record.subject).toContain("HR")
    expect(record.responsibleEmail).toBe("dpo@example.com")
    expect(record.createdByEmail).toBe("admin@example.com")
    expect(record.receivedAtISO).toBeTruthy()
    expect(record.createdAtISO).toBeTruthy()
    expect(record.updatedAtISO).toBeTruthy()
  })

  it("respinge authority invalid", async () => {
    await expect(
      createAuthorityCooperationRequest({
        // @ts-expect-error — testing invalid input
        authority: "invalid-authority",
        subject: "X",
        responsibleEmail: "x@y.z",
        createdByEmail: "a@b.c",
      }),
    ).rejects.toThrow(/authority invalid/)
  })

  it("respinge subject lipsă", async () => {
    await expect(
      createAuthorityCooperationRequest({
        authority: "anspdcp",
        subject: "   ",
        responsibleEmail: "x@y.z",
        createdByEmail: "a@b.c",
      }),
    ).rejects.toThrow(/subject/)
  })

  it("respinge authority=other fără authorityNameOther", async () => {
    await expect(
      createAuthorityCooperationRequest({
        authority: "other",
        subject: "X",
        responsibleEmail: "x@y.z",
        createdByEmail: "a@b.c",
      }),
    ).rejects.toThrow(/authorityNameOther/)
  })

  it("acceptă authority=other cu authorityNameOther completat", async () => {
    const record = await createAuthorityCooperationRequest({
      authority: "other",
      authorityNameOther: "Autoritate locală XYZ",
      subject: "X",
      responsibleEmail: "x@y.z",
      createdByEmail: "a@b.c",
    })
    expect(record.authority).toBe("other")
    expect(record.authorityNameOther).toBe("Autoritate locală XYZ")
  })
})

describe("updateAuthorityCooperationRequest", () => {
  it("auto-stampilează respondedAtISO la status=responded", async () => {
    const created = await createAuthorityCooperationRequest({
      authority: "anspdcp",
      subject: "X",
      responsibleEmail: "x@y.z",
      createdByEmail: "a@b.c",
    })
    const updated = await updateAuthorityCooperationRequest(created.id, {
      status: "responded",
      responseSummary: "Am trimis tech doc + log-uri pe 2026-05-20.",
    })
    expect(updated).not.toBeNull()
    expect(updated!.status).toBe("responded")
    expect(updated!.respondedAtISO).toBeTruthy()
    expect(updated!.responseSummary).toContain("tech doc")
  })

  it("auto-stampilează closedAtISO la status=closed", async () => {
    const created = await createAuthorityCooperationRequest({
      authority: "asf",
      subject: "Y",
      responsibleEmail: "x@y.z",
      createdByEmail: "a@b.c",
    })
    const updated = await updateAuthorityCooperationRequest(created.id, {
      status: "closed",
    })
    expect(updated!.status).toBe("closed")
    expect(updated!.closedAtISO).toBeTruthy()
  })

  it("returnează null pentru id necunoscut", async () => {
    const result = await updateAuthorityCooperationRequest("ghost", {
      status: "responded",
    })
    expect(result).toBeNull()
  })

  it("respinge status invalid", async () => {
    const created = await createAuthorityCooperationRequest({
      authority: "anspdcp",
      subject: "Z",
      responsibleEmail: "x@y.z",
      createdByEmail: "a@b.c",
    })
    await expect(
      updateAuthorityCooperationRequest(created.id, {
        // @ts-expect-error — testing invalid input
        status: "invalid",
      }),
    ).rejects.toThrow(/status/)
  })
})

describe("delete + list", () => {
  it("listAuthorityCooperationRequests returnează cele create", async () => {
    await createAuthorityCooperationRequest({
      authority: "anspdcp",
      subject: "A",
      responsibleEmail: "x@y.z",
      createdByEmail: "a@b.c",
    })
    await createAuthorityCooperationRequest({
      authority: "adr",
      subject: "B",
      responsibleEmail: "x@y.z",
      createdByEmail: "a@b.c",
    })
    const list = await listAuthorityCooperationRequests()
    expect(list.length).toBeGreaterThanOrEqual(2)
    expect(list.some((r) => r.subject === "A")).toBe(true)
    expect(list.some((r) => r.subject === "B")).toBe(true)
  })

  it("deleteAuthorityCooperationRequest scoate record-ul", async () => {
    const created = await createAuthorityCooperationRequest({
      authority: "ancom",
      subject: "Q",
      responsibleEmail: "x@y.z",
      createdByEmail: "a@b.c",
    })
    const ok = await deleteAuthorityCooperationRequest(created.id)
    expect(ok).toBe(true)
    const list = await listAuthorityCooperationRequests()
    expect(list.some((r) => r.id === created.id)).toBe(false)
  })

  it("deleteAuthorityCooperationRequest returnează false pentru id necunoscut", async () => {
    const ok = await deleteAuthorityCooperationRequest("ghost")
    expect(ok).toBe(false)
  })
})

describe("buildAuthorityCooperationMarkdown", () => {
  it("rendează empty placeholder când lista e goală", () => {
    const md = buildAuthorityCooperationMarkdown([])
    expect(md).toContain("Articolul 21")
    expect(md).toContain("Articolul 26(11)")
    expect(md).toContain("Total înregistrări:** 0")
    expect(md).toContain("Niciun request oficial")
  })

  it("rendează tabel + secțiuni per record când există date", () => {
    const md = buildAuthorityCooperationMarkdown([
      {
        id: "auth-coop-1",
        authority: "anspdcp",
        subject: "Test solicitare",
        receivedAtISO: "2026-05-01T10:00:00Z",
        deadlineISO: "2026-05-15T23:59:59Z",
        status: "responded",
        responseSummary: "Am răspuns cu tech doc.",
        respondedAtISO: "2026-05-10T15:00:00Z",
        responsibleEmail: "dpo@example.com",
        createdByEmail: "admin@example.com",
        createdAtISO: "2026-05-01T10:00:00Z",
        updatedAtISO: "2026-05-10T15:00:00Z",
        linkedSystemIds: ["sys-1"],
      },
    ])
    expect(md).toContain("ANSPDCP")
    expect(md).toContain("Test solicitare")
    expect(md).toContain("Răspuns transmis")
    expect(md).toContain("Am răspuns cu tech doc.")
    expect(md).toContain("sys-1")
  })
})
