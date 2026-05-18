/**
 * Sprint 023.5 — Production readiness QA.
 *
 * Cron auth regression for /api/cron/renewal-reminders. Same contract ca
 * preventive-scan: fail-closed în production fără CRON_SECRET, valid token
 * required când e setat.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/server/renewal-email-dispatcher", () => ({
  dispatchScheduledReminders: vi.fn(async () => ({
    sent: 0,
    skipped: 0,
    failed: 0,
    remindersProcessed: 0,
  })),
}))

import { GET } from "./route"
import { dispatchScheduledReminders } from "@/lib/server/renewal-email-dispatcher"

const ORIGINAL_NODE_ENV = process.env.NODE_ENV
const ORIGINAL_CRON_SECRET = process.env.CRON_SECRET

function setNodeEnv(value: string) {
  Object.defineProperty(process.env, "NODE_ENV", {
    value,
    configurable: true,
    enumerable: true,
    writable: true,
  })
}

describe("/api/cron/renewal-reminders auth", () => {
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
    const req = new Request("http://test/api/cron/renewal-reminders")
    const res = await GET(req)
    expect(res.status).toBe(503)
    expect(dispatchScheduledReminders).not.toHaveBeenCalled()
  })

  it("returns 401 when CRON_SECRET set but Authorization missing", async () => {
    setNodeEnv("production")
    process.env.CRON_SECRET = "supersecret"
    const req = new Request("http://test/api/cron/renewal-reminders")
    const res = await GET(req)
    expect(res.status).toBe(401)
    expect(dispatchScheduledReminders).not.toHaveBeenCalled()
  })

  it("returns 401 when CRON_SECRET set but bearer wrong", async () => {
    setNodeEnv("production")
    process.env.CRON_SECRET = "supersecret"
    const req = new Request("http://test/api/cron/renewal-reminders", {
      headers: { Authorization: "Bearer wrong" },
    })
    const res = await GET(req)
    expect(res.status).toBe(401)
    expect(dispatchScheduledReminders).not.toHaveBeenCalled()
  })

  it("runs dispatch when bearer matches", async () => {
    setNodeEnv("production")
    process.env.CRON_SECRET = "supersecret"
    const req = new Request("http://test/api/cron/renewal-reminders", {
      headers: { Authorization: "Bearer supersecret" },
    })
    const res = await GET(req)
    expect(res.status).toBe(200)
    expect(dispatchScheduledReminders).toHaveBeenCalledTimes(1)
  })

  it("allows in non-production when CRON_SECRET unset (dev iteration)", async () => {
    setNodeEnv("test")
    delete process.env.CRON_SECRET
    const req = new Request("http://test/api/cron/renewal-reminders")
    const res = await GET(req)
    expect(res.status).toBe(200)
    expect(dispatchScheduledReminders).toHaveBeenCalledTimes(1)
  })
})
