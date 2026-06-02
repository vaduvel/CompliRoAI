// Sprint 023 — TypeScript SDK client for CompliRoAI API v1.
//
// Zero dependencies, works in Node 18+ and browsers (any fetch-compatible
// runtime). Future shape for `@compliroai/client` npm package — for now,
// distributed by copy into AI-builder repos.
//
// Usage:
//   import { CompliRoAIClient } from "@compliroai/client"
//   const client = new CompliRoAIClient({ apiKey: process.env.COMPLIROAI_KEY! })
//   const gate = await client.gate({ systemName: "MyBot", purpose: "support-chatbot" })
//   if (gate.verdict === "blocked") process.exit(1)

import type {
  ClassifyV1Input,
  ClassifyV1Response,
  ComplianceGateResponse,
  DeploymentV1Input,
  DeploymentV1Response,
} from "@/lib/compliance/types"

export type CompliRoAIClientOptions = {
  apiKey: string
  /** Base URL of the CompliRoAI deployment. Defaults to production. */
  baseUrl?: string
  /** Custom fetch implementation. Defaults to global fetch. */
  fetchImpl?: typeof fetch
  /** Request timeout in ms. Defaults to 15s. */
  timeoutMs?: number
  /** Accept-Language header value, ex: "en" for English responses where supported. */
  acceptLanguage?: string
}

export type HealthResponse = {
  ok: boolean
  version: string
  apiVersion: string
  docsUrl: string
  openapiUrl: string
  timestamp: string
}

export type GateEvidenceInput = {
  friaCompleted?: boolean
  dpiaCompleted?: boolean
  transferMechanism?: boolean
  transparencyNoticePublished?: boolean
  specialCategoriesJustified?: boolean
}

export type GateInput = ClassifyV1Input & { evidence?: GateEvidenceInput }
export type DeploymentInput = DeploymentV1Input & { evidence?: GateEvidenceInput }

export class CompliRoAIError extends Error {
  readonly status: number
  readonly code: string
  readonly details?: unknown

  constructor(input: { status: number; code: string; message: string; details?: unknown }) {
    super(input.message)
    this.name = "CompliRoAIError"
    this.status = input.status
    this.code = input.code
    this.details = input.details
  }
}

const DEFAULT_BASE_URL = "https://eu-ai-act-beige.vercel.app"
const DEFAULT_TIMEOUT = 15_000

export class CompliRoAIClient {
  private readonly apiKey: string
  private readonly baseUrl: string
  private readonly fetchImpl: typeof fetch
  private readonly timeoutMs: number
  private readonly acceptLanguage?: string

  constructor(opts: CompliRoAIClientOptions) {
    if (!opts.apiKey || typeof opts.apiKey !== "string") {
      throw new Error("CompliRoAIClient: apiKey is required")
    }
    if (!opts.apiKey.startsWith("cra_")) {
      throw new Error("CompliRoAIClient: apiKey must start with 'cra_'")
    }
    this.apiKey = opts.apiKey
    this.baseUrl = (opts.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "")
    this.fetchImpl =
      opts.fetchImpl ??
      (typeof fetch !== "undefined"
        ? fetch
        : (() => {
            throw new Error(
              "CompliRoAIClient: no global fetch available. Pass `fetchImpl` in options.",
            )
          })())
    this.timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT
    this.acceptLanguage = opts.acceptLanguage
  }

  /** GET /api/v1/health — public, no auth needed (but we send the key anyway for parity). */
  async health(): Promise<HealthResponse> {
    return await this.request<HealthResponse>("GET", "/api/v1/health")
  }

  /** POST /api/v1/classify */
  async classify(input: ClassifyV1Input): Promise<ClassifyV1Response> {
    return await this.request<ClassifyV1Response>("POST", "/api/v1/classify", input)
  }

  /** POST /api/v1/gate */
  async gate(input: GateInput): Promise<ComplianceGateResponse> {
    return await this.request<ComplianceGateResponse>("POST", "/api/v1/gate", input)
  }

  /** POST /api/v1/deployment */
  async registerDeployment(input: DeploymentInput): Promise<DeploymentV1Response> {
    return await this.request<DeploymentV1Response>(
      "POST",
      "/api/v1/deployment",
      input,
    )
  }

  // ─── Internals ────────────────────────────────────────────────────────

  private async request<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
    const url = `${this.baseUrl}${path}`
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs)
    const headers: Record<string, string> = {
      authorization: `Bearer ${this.apiKey}`,
      accept: "application/json",
    }
    if (body !== undefined) {
      headers["content-type"] = "application/json"
    }
    if (this.acceptLanguage) {
      headers["accept-language"] = this.acceptLanguage
    }

    let response: Response
    try {
      response = await this.fetchImpl(url, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      })
    } catch (err) {
      clearTimeout(timeout)
      if ((err as { name?: string }).name === "AbortError") {
        throw new CompliRoAIError({
          status: 408,
          code: "TIMEOUT",
          message: `Request timed out after ${this.timeoutMs}ms`,
        })
      }
      throw new CompliRoAIError({
        status: 0,
        code: "NETWORK_ERROR",
        message: (err as Error).message || "Network error",
        details: err,
      })
    }
    clearTimeout(timeout)

    let parsed: unknown
    try {
      parsed = await response.json()
    } catch {
      throw new CompliRoAIError({
        status: response.status,
        code: "INVALID_RESPONSE",
        message: `Non-JSON response from ${url} (status ${response.status})`,
      })
    }

    if (!response.ok) {
      const errBody = (parsed ?? {}) as {
        code?: string
        error?: string
        message?: string
        errors?: unknown
      }
      throw new CompliRoAIError({
        status: response.status,
        code: errBody.code ?? `HTTP_${response.status}`,
        message: errBody.error ?? errBody.message ?? `Request failed (${response.status})`,
        details: errBody.errors,
      })
    }

    return parsed as T
  }
}
