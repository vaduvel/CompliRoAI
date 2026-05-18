/**
 * Sprint 023 — Tests for GET/POST /api/v1/keys (session auth only).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/server/api-context", () => ({
  resolveApiAuth: vi.fn(async () => ({
    ok: true,
    ctx: {
      source: "session",
      orgId: "org-test-keys",
      userId: "user-1",
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

import { GET, POST } from "./route"

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  vi.clearAllMocks()
})

describe("GET /api/v1/keys", () => {
  it("returns 200 with key list (no hmacHash leaked)", async () => {
    const res = await GET(
      new Request("http://localhost/api/v1/keys", { method: "GET" }),
    )
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(Array.isArray(json.keys)).toBe(true)
    for (const k of json.keys) {
      expect(k.hmacHash).toBeUndefined()
    }
  })

  it("rejects API key auth (must be session)", async () => {
    const { resolveApiAuth } = await import("@/lib/server/api-context")
    vi.mocked(resolveApiAuth).mockResolvedValueOnce({
      ok: true,
      ctx: {
        source: "api_key",
        orgId: "org-x",
        userId: "apikey:x",
        email: "x@example.com",
        orgName: "x",
      },
    })
    const res = await GET(
      new Request("http://localhost/api/v1/keys", { method: "GET" }),
    )
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.code).toBe("SESSION_REQUIRED")
  })
})

describe("POST /api/v1/keys", () => {
  it("creates a key and returns full token + warning", async () => {
    const res = await POST(
      new Request("http://localhost/api/v1/keys", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ label: "CI/CD", scopes: ["classify", "gate"] }),
      }),
    )
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.fullToken).toMatch(/^cra_[a-f0-9]{32}$/)
    expect(json.warning).toBeTruthy()
    expect(json.key.hmacHash).toBeUndefined()
  })

  it("rejects missing label", async () => {
    const res = await POST(
      new Request("http://localhost/api/v1/keys", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ scopes: ["classify"] }),
      }),
    )
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.code).toBe("MISSING_LABEL")
  })

  it("rejects empty scope list", async () => {
    const res = await POST(
      new Request("http://localhost/api/v1/keys", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ label: "x", scopes: [] }),
      }),
    )
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.code).toBe("MISSING_SCOPES")
  })
})
