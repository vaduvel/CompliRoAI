// Sprint 023 — POST /api/v1/classify
// Body: ClassifyV1Input → returns ClassifyV1Response (AI Act risk + role + obligations).
//
// Auth:    API key (Bearer cra_...) with scope "classify"
// Limits:  60 req/min per (org + endpoint)
// Audit:   logApiCall on every hit (status code, duration, redacted summary).

import { NextResponse } from "next/server"

import {
  parseClassifyInput,
  summariseClassifyInput,
  V1_API_VERSION,
} from "@/lib/compliance/api-v1-schema"
import { classifyAISystem } from "@/lib/compliance/ai-act-classifier"
import { evaluateComplianceGate } from "@/lib/compliance/compliance-gate"
import { resolveApiAuth, requireScope } from "@/lib/server/api-context"
import {
  buildRateLimitKey,
  checkRateLimit,
  extractClientIp,
} from "@/lib/server/api-rate-limit"
import { logApiCall } from "@/lib/server/api-audit"
import { runWithOrgContext } from "@/lib/server/org-context"
import { readState } from "@/lib/server/store"
import type {
  ClassifyV1Response,
  ComplianceGateRiskClass,
} from "@/lib/compliance/types"

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept-Language",
}

const ENDPOINT = "/api/v1/classify"

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

export async function POST(request: Request) {
  const startedAt = Date.now()
  const ip = extractClientIp(request.headers)
  const userAgent = request.headers.get("user-agent") ?? undefined

  // ─── Auth ────────────────────────────────────────────────────────────
  const auth = await resolveApiAuth(request)
  if (!auth.ok) {
    return errorResponse(auth.status, auth.code, auth.message, startedAt)
  }
  const scoped = requireScope(auth.ctx, "classify")
  if (!scoped.ok) {
    return errorResponse(scoped.status, scoped.code, scoped.message, startedAt)
  }
  const ctx = scoped.ctx

  // ─── Rate limit ──────────────────────────────────────────────────────
  const rl = checkRateLimit({
    key: buildRateLimitKey({ orgId: ctx.orgId, ip, endpoint: ENDPOINT }),
  })
  if (!rl.allowed) {
    return runWithOrgContext(
      buildSyntheticOrgContext(ctx),
      async () => {
        await logApiCall({
          orgId: ctx.orgId,
          apiKeyId: ctx.apiKey?.id,
          endpoint: ENDPOINT,
          method: "POST",
          statusCode: 429,
          durationMs: Date.now() - startedAt,
          ip,
          userAgent,
          requestSummary: "",
          responseSummary: "rate-limited",
          errorCode: "RATE_LIMITED",
          actor: {
            id: ctx.userId,
            label: ctx.email,
            role: "owner",
            source: ctx.source === "session" ? "session" : "workspace",
          },
        })
        return NextResponse.json(
          {
            error: "Rate limit depășit. Maxim 60 cereri/minut per organizație.",
            code: "RATE_LIMITED",
            apiVersion: V1_API_VERSION,
          },
          {
            status: 429,
            headers: {
              ...CORS_HEADERS,
              "Retry-After": String(rl.retryAfterSec),
              "X-RateLimit-Limit": String(rl.limit),
              "X-RateLimit-Remaining": "0",
            },
          },
        )
      },
    )
  }

  // ─── Body parse + validate ───────────────────────────────────────────
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return errorResponse(400, "INVALID_JSON", "Body invalid — nu este JSON.", startedAt)
  }
  const parsed = parseClassifyInput(body)
  if (!parsed.ok) {
    return errorResponse(
      400,
      parsed.errors[0]?.code ?? "INVALID_INPUT",
      parsed.errors[0]?.message ?? "Input invalid.",
      startedAt,
      { errors: parsed.errors },
    )
  }
  const input = parsed.value

  // ─── Classification + obligations (within org context) ──────────────
  const result: ClassifyV1Response = await runWithOrgContext(
    buildSyntheticOrgContext(ctx),
    async () => {
      const state = await readState()
      const role = state.roleAssessment?.primaryRole

      const classification = classifyAISystem(input.purpose)
      // Reuse the gate engine to build the obligations array consistently —
      // we just don't expose verdict/missingEvidence on /classify.
      const gate = evaluateComplianceGate({
        input,
        aiActRole: role,
      })

      await logApiCall({
        orgId: ctx.orgId,
        apiKeyId: ctx.apiKey?.id,
        endpoint: ENDPOINT,
        method: "POST",
        statusCode: 200,
        durationMs: Date.now() - startedAt,
        ip,
        userAgent,
        requestSummary: summariseClassifyInput(input),
        responseSummary: `risk=${gate.riskClass} role=${gate.aiActRole}`,
        actor: {
          id: ctx.userId,
          label: ctx.email,
          role: "owner",
          source: ctx.source === "session" ? "session" : "workspace",
        },
      })

      return {
        systemName: input.systemName,
        riskClass: gate.riskClass as ComplianceGateRiskClass,
        aiActArticle: classification.article,
        aiActReason: classification.reason,
        aiActDeadline: classification.deadline,
        aiActRole: gate.aiActRole,
        obligations: gate.obligations.map((o) => ({
          article: o.article,
          description: o.description,
        })),
        nextActions: gate.nextActions,
        apiVersion: V1_API_VERSION,
        classifiedAtISO: gate.classifiedAtISO,
      }
    },
  )

  return NextResponse.json(result, {
    status: 200,
    headers: {
      ...CORS_HEADERS,
      "X-RateLimit-Limit": String(rl.limit),
      "X-RateLimit-Remaining": String(rl.remaining),
      "Cache-Control": "no-store",
    },
  })
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function buildSyntheticOrgContext(ctx: { orgId: string; userId: string; email: string; orgName: string }) {
  return {
    orgId: ctx.orgId,
    userId: ctx.userId,
    email: ctx.email,
    orgName: ctx.orgName,
    workspaceMode: "ai-builder" as const,
  }
}

function errorResponse(
  status: number,
  code: string,
  message: string,
  _startedAt: number,
  extra?: Record<string, unknown>,
): NextResponse {
  return NextResponse.json(
    { error: message, code, apiVersion: V1_API_VERSION, ...(extra ?? {}) },
    { status, headers: CORS_HEADERS },
  )
}
