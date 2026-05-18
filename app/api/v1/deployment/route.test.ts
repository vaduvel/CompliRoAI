/**
 * Sprint 023 — Tests for POST /api/v1/deployment.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/server/api-context", () => ({
  resolveApiAuth: vi.fn(async () => ({
    ok: true,
    ctx: {
      source: "api_key",
      orgId: "org-test-deploy",
      userId: "apikey:apikey-test",
      email: "test@example.com",
      orgName: "Test",
      apiKey: {
        id: "apikey-test",
        scopes: ["deployment"],
      },
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
  return new Request("http://localhost/api/v1/deployment", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: "Bearer cra_fake",
    },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  vi.clearAllMocks()
})

describe("POST /api/v1/deployment", () => {
  it("requires deploymentRef", async () => {
    const res = await POST(
      makeRequest({ systemName: "Bot", purpose: "support-chatbot" }),
    )
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(
      Array.isArray(json.errors) &&
        json.errors.some((e: { field: string }) => e.field === "deploymentRef"),
    ).toBe(true)
  })

  it("returns deployment response with gate + findingEmitted=false on pass", async () => {
    const res = await POST(
      makeRequest({
        systemName: "Doc",
        purpose: "document-assistant",
        deploymentRef: "sha-pass-1",
      }),
    )
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.deploymentRef).toBe("sha-pass-1")
    expect(json.gate.verdict).toBe("pass")
    expect(json.findingEmitted).toBe(false)
    expect(json.apiVersion).toBe("v1")
  })

  it("emits a finding for non-pass verdict", async () => {
    const res = await POST(
      makeRequest({
        systemName: "Cam",
        purpose: "biometric-identification",
        deploymentRef: "sha-blocked-1",
      }),
    )
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.gate.verdict).toBe("blocked")
    expect(json.findingEmitted).toBe(true)
  })
})
