import type { OrchestratorProposal } from "./types"

type FetchLike = typeof fetch

export type MistralOrchestratorRequest = {
  apiKey?: string
  model?: string
  prompt: string
  fetchImpl?: FetchLike
  timeoutMs?: number
  maxTokens?: number
}

export type MistralOrchestratorResult =
  | {
      ok: true
      proposal: OrchestratorProposal
      model?: string
      responseId?: string
    }
  | {
      ok: false
      reason:
        | "missing_api_key"
        | "mistral_http_error"
        | "mistral_invalid_json"
        | "mistral_truncated_json"
        | "mistral_missing_content"
        | "mistral_timeout"
        | "mistral_network_error"
      status?: number
    }

export async function requestMistralOrchestratorProposal(
  input: MistralOrchestratorRequest,
): Promise<MistralOrchestratorResult> {
  const apiKey = input.apiKey ?? process.env.MISTRAL_API_KEY ?? ""
  if (!apiKey.trim()) {
    return { ok: false, reason: "missing_api_key" }
  }

  const fetchImpl = input.fetchImpl ?? fetch
  const model = input.model ?? process.env.MISTRAL_MODEL ?? "mistral-medium-latest"
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), input.timeoutMs ?? 30_000)

  let response: Response
  try {
    response = await fetchImpl("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: input.maxTokens ?? 4_000,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: [
              "You are CompliRoAI's AI compliance workflow orchestrator.",
              "Return only compact valid JSON matching schemaVersion orchestrator.v1.",
              "The root object MUST include finalLegalVerdict:false.",
              "Every proposed finding MUST include legalBasis as an array of objects and finalLegalVerdict:false.",
              "Every legalBasis object MUST include instrument plus at least one of article, annex, or note.",
              "Every EU_AI_ACT or GDPR legalBasis must be grounded in legalContext returned in the same JSON.",
              "Use only enum values and allowed source IDs from the user prompt.",
              "Never reference entities outside the scoped tenant context from the user prompt.",
              "Keep every string field short; prefer exact existing titles and evidence codes over new prose.",
              "Never set final legal verdicts, approvals, resolved findings, or fully compliant claims.",
            ].join(" "),
          },
          {
            role: "user",
            content: input.prompt,
          },
        ],
      }),
    })
  } catch (error) {
    clearTimeout(timeout)
    if (error instanceof DOMException && error.name === "AbortError") {
      return { ok: false, reason: "mistral_timeout" }
    }
    return { ok: false, reason: "mistral_network_error" }
  } finally {
    clearTimeout(timeout)
  }

  if (!response.ok) {
    return {
      ok: false,
      reason: "mistral_http_error",
      status: response.status,
    }
  }

  const payload = await response.json() as {
    id?: string
    model?: string
    choices?: {
      finish_reason?: string
      message?: {
        content?:
          | string
          | { type?: string; text?: string }[]
      }
    }[]
  }
  const choice = payload.choices?.[0]
  const content = extractTextContent(choice?.message?.content)
  if (!content) return { ok: false, reason: "mistral_missing_content" }
  const jsonText = extractJsonObjectText(content)
  if (!jsonText) {
    return {
      ok: false,
      reason: choice?.finish_reason === "length" ? "mistral_truncated_json" : "mistral_invalid_json",
    }
  }

  try {
    return {
      ok: true,
      proposal: JSON.parse(jsonText) as OrchestratorProposal,
      model: payload.model,
      responseId: payload.id,
    }
  } catch {
    return {
      ok: false,
      reason: choice?.finish_reason === "length" ? "mistral_truncated_json" : "mistral_invalid_json",
    }
  }
}

function extractTextContent(
  content: string | { type?: string; text?: string }[] | undefined,
): string | undefined {
  if (typeof content === "string") return content
  if (!Array.isArray(content)) return undefined

  const text = content
    .map((part) => (typeof part?.text === "string" ? part.text : ""))
    .join("")
    .trim()

  return text || undefined
}

function extractJsonObjectText(content: string): string | undefined {
  const trimmed = content.trim()
  if (!trimmed) return undefined

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const candidate = fenced?.[1]?.trim() || trimmed

  if (candidate.startsWith("{") && candidate.endsWith("}")) {
    return candidate
  }

  const firstBrace = candidate.indexOf("{")
  const lastBrace = candidate.lastIndexOf("}")
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return candidate.slice(firstBrace, lastBrace + 1)
  }

  return undefined
}
