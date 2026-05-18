import { describe, expect, it, vi } from "vitest"

import { CompliRoAIClient, CompliRoAIError } from "./client"

function mockFetch(response: {
  status: number
  body: unknown
  /** Optional throw to simulate network failure. */
  throws?: Error
}) {
  return vi.fn(async () => {
    if (response.throws) throw response.throws
    return new Response(JSON.stringify(response.body), {
      status: response.status,
      headers: { "content-type": "application/json" },
    })
  })
}

const VALID_KEY = "cra_" + "a".repeat(32)

describe("CompliRoAIClient — constructor", () => {
  it("requires apiKey", () => {
    expect(() => new CompliRoAIClient({ apiKey: "" })).toThrow(/apiKey/i)
  })

  it("rejects keys missing the cra_ prefix", () => {
    expect(() => new CompliRoAIClient({ apiKey: "abc123" })).toThrow(/cra_/i)
  })

  it("strips trailing slash from baseUrl", () => {
    const fetchImpl = mockFetch({ status: 200, body: { ok: true } })
    const client = new CompliRoAIClient({
      apiKey: VALID_KEY,
      baseUrl: "https://example.com/",
      fetchImpl,
    })
    void client.health()
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://example.com/api/v1/health",
      expect.any(Object),
    )
  })
})

describe("CompliRoAIClient — request flow", () => {
  it("classify() posts to /api/v1/classify with bearer auth", async () => {
    const fetchImpl = mockFetch({
      status: 200,
      body: {
        systemName: "Bot",
        riskClass: "limited",
        aiActArticle: "Art. 50",
        aiActReason: "ok",
        aiActRole: "provider",
        obligations: [],
        nextActions: [],
        apiVersion: "v1",
        classifiedAtISO: "2026-05-18T00:00:00Z",
      },
    })
    const client = new CompliRoAIClient({
      apiKey: VALID_KEY,
      baseUrl: "https://api.example.com",
      fetchImpl,
    })
    const result = await client.classify({
      systemName: "Bot",
      purpose: "support-chatbot",
    })
    expect(result.systemName).toBe("Bot")
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.example.com/api/v1/classify",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          authorization: `Bearer ${VALID_KEY}`,
          "content-type": "application/json",
        }),
      }),
    )
  })

  it("gate() returns typed ComplianceGateResponse", async () => {
    const fetchImpl = mockFetch({
      status: 200,
      body: {
        verdict: "blocked",
        riskClass: "prohibited",
        aiActRole: "provider",
        reasons: [
          {
            category: "legal_prohibition",
            articleRef: "Art. 5",
            severity: "error",
            message: "Blocked",
            nextAction: "Stop",
          },
        ],
        obligations: [],
        missingEvidence: [],
        nextActions: [],
        auditPackHints: [],
        apiVersion: "v1",
        classifiedAtISO: "2026-05-18T00:00:00Z",
      },
    })
    const client = new CompliRoAIClient({
      apiKey: VALID_KEY,
      baseUrl: "https://api.example.com",
      fetchImpl,
    })
    const result = await client.gate({
      systemName: "Cam",
      purpose: "biometric-identification",
    })
    expect(result.verdict).toBe("blocked")
    expect(result.reasons[0].articleRef).toBe("Art. 5")
  })

  it("registerDeployment() sends deploymentRef", async () => {
    const fetchImpl = mockFetch({
      status: 200,
      body: {
        deploymentRef: "sha-1",
        systemName: "x",
        gate: {
          verdict: "pass",
          riskClass: "minimal",
          aiActRole: "provider",
          reasons: [],
          obligations: [],
          missingEvidence: [],
          nextActions: [],
          auditPackHints: [],
          apiVersion: "v1",
          classifiedAtISO: "2026-05-18T00:00:00Z",
        },
        findingEmitted: false,
        apiVersion: "v1",
        loggedAtISO: "2026-05-18T00:00:00Z",
      },
    })
    const client = new CompliRoAIClient({
      apiKey: VALID_KEY,
      baseUrl: "https://api.example.com",
      fetchImpl,
    })
    const result = await client.registerDeployment({
      systemName: "x",
      purpose: "support-chatbot",
      deploymentRef: "sha-1",
    })
    expect(result.deploymentRef).toBe("sha-1")
    const firstCall = fetchImpl.mock.calls[0] as unknown as [string, { body: string }]
    expect(firstCall[1].body).toContain("sha-1")
  })

  it("health() returns version", async () => {
    const fetchImpl = mockFetch({
      status: 200,
      body: {
        ok: true,
        version: "v1",
        apiVersion: "v1",
        docsUrl: "/docs/api",
        openapiUrl: "/api/v1/openapi",
        timestamp: "2026-05-18T00:00:00Z",
      },
    })
    const client = new CompliRoAIClient({
      apiKey: VALID_KEY,
      baseUrl: "https://api.example.com",
      fetchImpl,
    })
    const result = await client.health()
    expect(result.ok).toBe(true)
    expect(result.version).toBe("v1")
  })
})

describe("CompliRoAIClient — error handling", () => {
  it("throws CompliRoAIError on non-2xx", async () => {
    const fetchImpl = mockFetch({
      status: 400,
      body: { error: "Bad input", code: "INVALID_INPUT", apiVersion: "v1" },
    })
    const client = new CompliRoAIClient({
      apiKey: VALID_KEY,
      baseUrl: "https://api.example.com",
      fetchImpl,
    })
    await expect(
      client.classify({ systemName: "x", purpose: "support-chatbot" }),
    ).rejects.toMatchObject({
      name: "CompliRoAIError",
      status: 400,
      code: "INVALID_INPUT",
    })
  })

  it("wraps network errors as CompliRoAIError NETWORK_ERROR", async () => {
    const fetchImpl = mockFetch({
      status: 0,
      body: {},
      throws: new Error("ECONNREFUSED"),
    })
    const client = new CompliRoAIClient({
      apiKey: VALID_KEY,
      baseUrl: "https://api.example.com",
      fetchImpl,
    })
    let err: unknown = null
    try {
      await client.health()
    } catch (e) {
      err = e
    }
    expect(err).toBeInstanceOf(CompliRoAIError)
    expect((err as CompliRoAIError).code).toBe("NETWORK_ERROR")
  })
})
