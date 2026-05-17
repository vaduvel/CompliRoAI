/**
 * Sprint 009 — Tests pentru pii-discovery-store.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/server/org-context", () => ({
  getOrgContext: vi.fn(async () => ({
    orgId: "org-pii-test",
    userId: "user-pii",
    email: "pii@example.com",
    orgName: "Test PII Org",
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
  analyzePIIWithoutSaving,
  createPIIDetection,
  deletePIIDetection,
  getPIIDetection,
  readPIIDetections,
  summarizePIIDetections,
} from "@/lib/server/pii-discovery-store"
import { readState } from "@/lib/server/store"
import type { ComplianceEventActorInput } from "@/lib/compliance/events"

const ACTOR: ComplianceEventActorInput = {
  id: "user-pii",
  label: "pii@example.com",
  role: "compliance",
  source: "session",
}
const ORG = "org-pii-test"

beforeEach(async () => {
  vi.resetModules()
})

afterEach(() => {
  vi.clearAllMocks()
})

describe("pii-discovery-store — analyze without saving", () => {
  it("analyzePIIWithoutSaving returneaza rezultat fara persist", async () => {
    const result = analyzePIIWithoutSaving({
      sourceLabel: "analyze-test",
      text: "Email: test@example.ro, CNP 1990101123456",
    })
    expect(result.detectionCount).toBeGreaterThan(0)
    // verificare ca state nu a fost modificat
    const state = await readState()
    expect((state.piiDetections ?? []).find((d) => d.sourceLabel === "analyze-test")).toBeUndefined()
  })
})

describe("pii-discovery-store — create + auto-finding", () => {
  it("createPIIDetection cu PII high-confidence emite finding GDPR + appendeaza event", async () => {
    const { detection, linkedFindingId } = await createPIIDetection(
      ORG,
      {
        sourceLabel: "chat-log-test",
        text: "CNP 1990101123456 + email ion@example.ro + IBAN RO49AAAA1B31007593840000",
      },
      ACTOR,
    )
    expect(detection.id).toMatch(/^pii-/)
    expect(detection.detectionCount).toBeGreaterThan(0)
    expect(linkedFindingId).toMatch(/^finding-/)

    const state = await readState()
    const finding = (state.findings ?? []).find((f) => f.id === linkedFindingId)
    expect(finding).toBeTruthy()
    expect(finding?.category).toBe("GDPR")
    expect(finding?.severity).toBe("high")

    const evt = (state.events ?? []).find(
      (e) => e.entityId === detection.id && e.type === "pii-discovery.scan.created",
    )
    expect(evt).toBeTruthy()
    expect(evt?.selfHash).toMatch(/^[0-9a-f]{64}$/)
  })

  it("createPIIDetection fara PII high-confidence nu emite finding", async () => {
    const { detection, linkedFindingId } = await createPIIDetection(
      ORG,
      {
        sourceLabel: "no-pii",
        text: "Aceasta este o procedura interna fara identificatori.",
      },
      ACTOR,
    )
    expect(detection.detectionCount).toBe(0)
    expect(linkedFindingId).toBeUndefined()
    expect(detection.linkedFindingId).toBeUndefined()
  })

  it("createPIIDetection refuza text gol", async () => {
    await expect(
      createPIIDetection(ORG, { sourceLabel: "x", text: "" }, ACTOR),
    ).rejects.toThrow(/text required/)
  })
})

describe("pii-discovery-store — read + summary", () => {
  it("readPIIDetections + summarize numara corect", async () => {
    await createPIIDetection(
      ORG,
      { sourceLabel: "summary-1", text: "CNP 1990101123456" },
      ACTOR,
    )
    await createPIIDetection(ORG, { sourceLabel: "summary-2", text: "fara identificatori" }, ACTOR)

    const { detections, summary } = await readPIIDetections(ORG)
    expect(detections.length).toBeGreaterThanOrEqual(2)
    expect(summary.total).toBeGreaterThanOrEqual(2)
    expect(summary.highConfidence).toBeGreaterThanOrEqual(1)
  })

  it("summarizePIIDetections pe array gol returneaza zero", () => {
    const s = summarizePIIDetections([])
    expect(s.total).toBe(0)
  })
})

describe("pii-discovery-store — delete", () => {
  it("deletePIIDetection sterge + appendeaza event", async () => {
    const { detection } = await createPIIDetection(
      ORG,
      { sourceLabel: "delete-target", text: "test" },
      ACTOR,
    )
    const ok = await deletePIIDetection(ORG, detection.id, ACTOR)
    expect(ok).toBe(true)
    const fetched = await getPIIDetection(ORG, detection.id)
    expect(fetched).toBeNull()
  })

  it("deletePIIDetection cu id invalid returneaza false", async () => {
    const ok = await deletePIIDetection(ORG, "pii-doesnotexist", ACTOR)
    expect(ok).toBe(false)
  })
})
