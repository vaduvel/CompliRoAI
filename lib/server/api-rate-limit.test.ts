import { beforeEach, describe, expect, it } from "vitest"

import {
  __resetRateLimiterForTests,
  buildRateLimitKey,
  checkRateLimit,
  extractClientIp,
} from "./api-rate-limit"

beforeEach(() => {
  __resetRateLimiterForTests()
})

describe("api-rate-limit — checkRateLimit", () => {
  it("allows the first request and reports correct remaining", () => {
    const r = checkRateLimit({ key: "org:abc", nowMs: 1000 })
    expect(r.allowed).toBe(true)
    expect(r.remaining).toBe(59)
    expect(r.limit).toBe(60)
  })

  it("blocks the 61st request inside the same window", () => {
    let result = { allowed: true, remaining: 60, limit: 60, retryAfterSec: 60 }
    for (let i = 0; i < 60; i++) {
      result = checkRateLimit({ key: "org:abc", nowMs: 1000 + i * 10 })
    }
    expect(result.allowed).toBe(true)
    const blocked = checkRateLimit({ key: "org:abc", nowMs: 1500 })
    expect(blocked.allowed).toBe(false)
    expect(blocked.remaining).toBe(0)
    expect(blocked.retryAfterSec).toBeGreaterThan(0)
  })

  it("resets after the 60s window passes", () => {
    for (let i = 0; i < 60; i++) {
      checkRateLimit({ key: "org:abc", nowMs: 1000 })
    }
    const blocked = checkRateLimit({ key: "org:abc", nowMs: 1500 })
    expect(blocked.allowed).toBe(false)
    const afterWindow = checkRateLimit({ key: "org:abc", nowMs: 1000 + 60_000 })
    expect(afterWindow.allowed).toBe(true)
    expect(afterWindow.remaining).toBe(59)
  })

  it("keeps independent counters per key", () => {
    for (let i = 0; i < 60; i++) {
      checkRateLimit({ key: "org:a", nowMs: 1000 })
    }
    const blocked = checkRateLimit({ key: "org:a", nowMs: 1500 })
    expect(blocked.allowed).toBe(false)
    const other = checkRateLimit({ key: "org:b", nowMs: 1500 })
    expect(other.allowed).toBe(true)
  })

  it("respects custom limit per call", () => {
    const r1 = checkRateLimit({ key: "low", limit: 2, nowMs: 1000 })
    expect(r1.allowed).toBe(true)
    expect(r1.limit).toBe(2)
    checkRateLimit({ key: "low", limit: 2, nowMs: 1010 })
    const r3 = checkRateLimit({ key: "low", limit: 2, nowMs: 1020 })
    expect(r3.allowed).toBe(false)
  })
})

describe("api-rate-limit — buildRateLimitKey", () => {
  it("prefers orgId over IP", () => {
    const k = buildRateLimitKey({
      orgId: "org-abc",
      ip: "1.2.3.4",
      endpoint: "/api/v1/classify",
    })
    expect(k).toBe("org:org-abc:/api/v1/classify")
  })

  it("falls back to IP when orgId is absent", () => {
    const k = buildRateLimitKey({
      orgId: null,
      ip: "1.2.3.4",
      endpoint: "/api/v1/health",
    })
    expect(k).toBe("ip:1.2.3.4:/api/v1/health")
  })

  it("falls back to 'anonymous' when neither orgId nor IP is set", () => {
    const k = buildRateLimitKey({ endpoint: "/api/v1/health" })
    expect(k).toBe("ip:anonymous:/api/v1/health")
  })
})

describe("api-rate-limit — extractClientIp", () => {
  it("extracts first hop from x-forwarded-for", () => {
    const headers = new Headers({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" })
    expect(extractClientIp(headers)).toBe("1.2.3.4")
  })

  it("uses x-real-ip when no x-forwarded-for", () => {
    const headers = new Headers({ "x-real-ip": "9.9.9.9" })
    expect(extractClientIp(headers)).toBe("9.9.9.9")
  })

  it("returns 'anonymous' when no IP headers", () => {
    expect(extractClientIp(new Headers())).toBe("anonymous")
  })
})
