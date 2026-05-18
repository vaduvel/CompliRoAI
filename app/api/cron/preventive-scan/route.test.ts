/**
 * Sprint 023.5 — Production readiness QA.
 *
 * Cron route auth regression: when CRON_SECRET is unset in production we MUST
 * fail-closed (503). When set, only `Authorization: Bearer ${CRON_SECRET}`
 * must pass.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/server/preventive-engine-runner", () => ({
  runPreventiveScan: vi.fn(async () => ({
    runId: "scan-1",
    triggeredAtISO: "2026-05-18T10:00:00Z",
    triggerSource: "cron",
    findingsCreated: 0,
    findingsUpdated: 0,
    rulesEvaluated: 0,
    durationMs: 0,
  })),
}))

import { GET } from "./route"
import { runPreventiveScan } from "@/lib/server/preventive-engine-runner"

const ORIGINAL_NODE_ENV = process.env.NODE_ENV
const ORIGINAL_CRON_SECRET = process.env.CRON_SECRET

function setNodeEnv(value: string) {
  // NODE_ENV is typed as a literal union by Next.js — bypass via defineProperty
  // ca să putem testa fail-closed în "production" și fallback "test".
  Object.defineProperty(process.env, "NODE_ENV", {
    value,
    configurable: true,
    enumerable: true,
    writable: true,
  })
}

describe("/api/cron/preventive-scan auth", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })
  afterEach(() => {
    setNodeEnv(ORIGINAL_NODE_ENV ?? "test")
    if (ORIGINAL_CRON_SECRET === undefined) {
      delete process.env.CRON_SECRET
    } else {
      process.env.CRON_SECRET = ORIGINAL_CRON_SECRET
    }
  })

  it("returns 503 when CRON_SECRET unset in production (fail-closed)", async () => {
    setNodeEnv("production")
    delete process.env.CRON_SECRET
    const req = new Request("http://test/api/cron/preventive-scan")
    const res = await GET(req)
    expect(res.status).toBe(503)
    expect(runPreventiveScan).not.toHaveBeenCalled()
  })

  it("returns 401 when CRON_SECRET set but Authorization missing", async () => {
    setNodeEnv("production")
    process.env.CRON_SECRET = "supersecret"
    const req = new Request("http://test/api/cron/preventive-scan")
    const res = await GET(req)
    expect(res.status).toBe(401)
    expect(runPreventiveScan).not.toHaveBeenCalled()
  })

  it("returns 401 when CRON_SECRET set but bearer wrong", async () => {
    setNodeEnv("production")
    process.env.CRON_SECRET = "supersecret"
    const req = new Request("http://test/api/cron/preventive-scan", {
      headers: { Authorization: "Bearer wrong" },
    })
    const res = await GET(req)
    expect(res.status).toBe(401)
    expect(runPreventiveScan).not.toHaveBeenCalled()
  })

  it("runs scan when bearer matches", async () => {
    setNodeEnv("production")
    process.env.CRON_SECRET = "supersecret"
    const req = new Request("http://test/api/cron/preventive-scan", {
      headers: { Authorization: "Bearer supersecret" },
    })
    const res = await GET(req)
    expect(res.status).toBe(200)
    expect(runPreventiveScan).toHaveBeenCalledTimes(1)
  })

  it("allows scan in non-production when CRON_SECRET unset (dev iteration)", async () => {
    setNodeEnv("test")
    delete process.env.CRON_SECRET
    const req = new Request("http://test/api/cron/preventive-scan")
    const res = await GET(req)
    expect(res.status).toBe(200)
    expect(runPreventiveScan).toHaveBeenCalledTimes(1)
  })
})
