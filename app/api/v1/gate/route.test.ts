/**
 * Sprint 023 — Tests for POST /api/v1/gate.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/server/api-context", () => ({
  resolveApiAuth: vi.fn(async () => ({
    ok: true,
    ctx: {
      source: "session",
      orgId: "org-test-gate",
      userId: "user-test-1",
      email: "test@example.com",
      orgName: "Test",
    },
  })),
  requireScope: vi.fn((ctx: unknown) => ({ ok: true, ctx })),
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
      readdir: vi.fn(async () => []),
    },
  }
})

vi.mock("@/lib/server/api-rate-limit", async () => {
  const actual = await vi.importActual<typeof import("@/lib/server/api-rate-limit")>(
    "@/lib/server/api-rate-limit",
  )
  return {
    ...actual,
    checkRateLimit: vi.fn(() => ({
      allowed: true,
      remaining: 59,
      limit: 60,
      retryAfterSec: 60,
    })),
  }
})

import { POST } from "./route"

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/v1/gate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  vi.clearAllMocks()
})

describe("POST /api/v1/gate", () => {
  it("returns verdict=blocked for prohibited purpose (biometric-identification)", async () => {
    const res = await POST(
      makeRequest({
        systemName: "Cam ID",
        purpose: "biometric-identification",
      }),
    )
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.verdict).toBe("blocked")
    expect(json.riskClass).toBe("prohibited")
    expect(
      json.reasons.some((r: { articleRef: string }) => r.articleRef.includes("Art. 5")),
    ).toBe(true)
  })

  it("returns verdict=pass for minimal-risk system", async () => {
    const res = await POST(
      makeRequest({
        systemName: "Doc Helper",
        purpose: "document-assistant",
      }),
    )
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.verdict).toBe("pass")
    expect(json.riskClass).toBe("minimal")
  })

  it("returns 400 for invalid input", async () => {
    const res = await POST(makeRequest({ purpose: "hr-screening" }))
    expect(res.status).toBe(400)
  })

  it("returns 401 when auth fails", async () => {
    const { resolveApiAuth } = await import("@/lib/server/api-context")
    vi.mocked(resolveApiAuth).mockResolvedValueOnce({
      ok: false,
      status: 401,
      code: "INVALID_API_KEY",
      message: "Invalid",
    })
    const res = await POST(
      makeRequest({ systemName: "x", purpose: "support-chatbot" }),
    )
    expect(res.status).toBe(401)
  })
})
