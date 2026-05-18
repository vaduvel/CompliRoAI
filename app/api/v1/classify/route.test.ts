/**
 * Sprint 023 — Tests for POST /api/v1/classify.
 *
 * Mock-strategy: stub resolveApiAuth to inject a session ctx (skips
 * verifyApiKey + cookie work). Stub fs so writeFileSafe is a no-op.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/server/api-context", () => ({
  resolveApiAuth: vi.fn(async () => ({
    ok: true,
    ctx: {
      source: "session",
      orgId: "org-test-classify",
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
  return new Request("http://localhost/api/v1/classify", {
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

describe("POST /api/v1/classify", () => {
  it("returns 400 on missing required fields", async () => {
    const res = await POST(makeRequest({ purpose: "hr-screening" }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.code).toBe("REQUIRED_STRING")
    expect(json.apiVersion).toBe("v1")
  })

  it("returns 200 with classification for valid input", async () => {
    const res = await POST(
      makeRequest({
        systemName: "HR Bot",
        purpose: "hr-screening",
        humanOversightDocumented: true,
        loggingEnabled: true,
      }),
    )
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.systemName).toBe("HR Bot")
    expect(json.riskClass).toBe("high")
    expect(json.aiActArticle).toContain("Annex III")
    expect(json.apiVersion).toBe("v1")
    expect(Array.isArray(json.obligations)).toBe(true)
  })

  it("rejects invalid JSON body", async () => {
    const req = new Request("http://localhost/api/v1/classify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "not-json",
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.code).toBe("INVALID_JSON")
  })
})

describe("POST /api/v1/classify — auth errors", () => {
  it("returns 401 when resolveApiAuth fails", async () => {
    const { resolveApiAuth } = await import("@/lib/server/api-context")
    vi.mocked(resolveApiAuth).mockResolvedValueOnce({
      ok: false,
      status: 401,
      code: "MISSING_AUTH",
      message: "Missing auth",
    })

    const res = await POST(
      makeRequest({ systemName: "x", purpose: "support-chatbot" }),
    )
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.code).toBe("MISSING_AUTH")
  })
})
