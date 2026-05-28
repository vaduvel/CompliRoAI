import { describe, expect, it, vi } from "vitest"

import { requestMistralOrchestratorProposal } from "./mistral-client"

describe("requestMistralOrchestratorProposal", () => {
  it("does not call the network when no API key is configured", async () => {
    const fetchMock = vi.fn()

    const result = await requestMistralOrchestratorProposal({
      apiKey: "",
      model: "mistral-medium-latest",
      prompt: "Return JSON.",
      fetchImpl: fetchMock,
    })

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe("missing_api_key")
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("requests JSON-only structured output from Mistral", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: "chatcmpl-test",
        model: "mistral-medium-latest",
        choices: [
          {
            message: {
              content: JSON.stringify({
                schemaVersion: "orchestrator.v1",
                finalLegalVerdict: false,
                proposedFindings: [],
                evidenceRequests: [],
                reviewTasks: [],
                nextActions: [],
                exportBlockers: [],
                clientQuestions: [],
                obsoleteCandidates: [],
              }),
            },
          },
        ],
      }),
    })

    const result = await requestMistralOrchestratorProposal({
      apiKey: "test-key",
      model: "mistral-medium-latest",
      prompt: "Return JSON.",
      fetchImpl: fetchMock,
    })

    expect(result.ok).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.mistral.ai/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-key",
          "Content-Type": "application/json",
        }),
      }),
    )

    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.response_format).toEqual({ type: "json_object" })
    if (result.ok) expect(result.proposal).toMatchObject({ schemaVersion: "orchestrator.v1" })
  })

  it("parses fenced JSON responses returned as text parts", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: "chatcmpl-test",
        model: "mistral-medium-latest",
        choices: [
          {
            message: {
              content: [
                {
                  type: "text",
                  text: "```json\n{\"schemaVersion\":\"orchestrator.v1\",\"finalLegalVerdict\":false,\"proposedFindings\":[],\"evidenceRequests\":[],\"reviewTasks\":[],\"nextActions\":[],\"exportBlockers\":[],\"clientQuestions\":[],\"obsoleteCandidates\":[]}\n```",
                },
              ],
            },
          },
        ],
      }),
    })

    const result = await requestMistralOrchestratorProposal({
      apiKey: "test-key",
      model: "mistral-medium-latest",
      prompt: "Return JSON.",
      fetchImpl: fetchMock,
    })

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.proposal.schemaVersion).toBe("orchestrator.v1")
  })

  it("returns a safe error for non-OK Mistral responses", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      text: async () => "rate limited",
    })

    const result = await requestMistralOrchestratorProposal({
      apiKey: "test-key",
      model: "mistral-medium-latest",
      prompt: "Return JSON.",
      fetchImpl: fetchMock,
    })

    expect(result).toEqual({
      ok: false,
      reason: "mistral_http_error",
      status: 429,
    })
  })

  it("aborts slow Mistral requests with a bounded timeout", async () => {
    const fetchMock = vi.fn((_url: string, init?: RequestInit) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException("The operation was aborted.", "AbortError"))
        })
      })
    })

    const result = await requestMistralOrchestratorProposal({
      apiKey: "test-key",
      model: "mistral-medium-latest",
      prompt: "Return JSON.",
      fetchImpl: fetchMock as typeof fetch,
      timeoutMs: 5,
    })

    expect(result).toEqual({
      ok: false,
      reason: "mistral_timeout",
    })
  })

  it("returns truncated_json when Mistral stops before closing the object", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: "chatcmpl-test",
        model: "mistral-medium-latest",
        choices: [
          {
            finish_reason: "length",
            message: {
              content: "{\"schemaVersion\":\"orchestrator.v1\",\"finalLegalVerdict\":false",
            },
          },
        ],
      }),
    })

    const result = await requestMistralOrchestratorProposal({
      apiKey: "test-key",
      model: "mistral-medium-latest",
      prompt: "Return JSON.",
      fetchImpl: fetchMock,
    })

    expect(result).toEqual({
      ok: false,
      reason: "mistral_truncated_json",
    })
  })
})
