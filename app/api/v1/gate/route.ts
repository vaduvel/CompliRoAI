// Sprint 023 — POST /api/v1/gate
// Body: ClassifyV1Input (+ optional `evidence` block) → ComplianceGateResponse.
//
// Auth:    API key (Bearer cra_...) with scope "gate"
// Limits:  60 req/min per (org + endpoint)
// Audit:   logApiCall on every hit.

import { NextResponse } from "next/server"

import {
  parseClassifyInput,
  summariseClassifyInput,
  V1_API_VERSION,
} from "@/lib/compliance/api-v1-schema"
import {
  evaluateComplianceGate,
  type GateEvaluationContext,
} from "@/lib/compliance/compliance-gate"
import { resolveApiAuth, requireScope } from "@/lib/server/api-context"
import {
  buildRateLimitKey,
  checkRateLimit,
  extractClientIp,
} from "@/lib/server/api-rate-limit"
import { logApiCall, summariseGateResponse } from "@/lib/server/api-audit"
import { runWithOrgContext } from "@/lib/server/org-context"
import { readState } from "@/lib/server/store"

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept-Language",
}

const ENDPOINT = "/api/v1/gate"

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

export async function POST(request: Request) {
  const startedAt = Date.now()
  const ip = extractClientIp(request.headers)
  const userAgent = request.headers.get("user-agent") ?? undefined

  const auth = await resolveApiAuth(request)
  if (!auth.ok) return jsonErr(auth.status, auth.code, auth.message)
  const scoped = requireScope(auth.ctx, "gate")
  if (!scoped.ok) return jsonErr(scoped.status, scoped.code, scoped.message)
  const ctx = scoped.ctx

  const rl = checkRateLimit({
    key: buildRateLimitKey({ orgId: ctx.orgId, ip, endpoint: ENDPOINT }),
  })
  if (!rl.allowed) {
    return rateLimitedResponse(rl)
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return jsonErr(400, "INVALID_JSON", "Body invalid — nu este JSON.")
  }
  const parsed = parseClassifyInput(body)
  if (!parsed.ok) {
    return jsonErr(
      400,
      parsed.errors[0]?.code ?? "INVALID_INPUT",
      parsed.errors[0]?.message ?? "Input invalid.",
      { errors: parsed.errors },
    )
  }
  const input = parsed.value

  // Optional evidence block lives next to the rest of the payload.
  const rawEvidence =
    body && typeof body === "object" && body !== null && "evidence" in body
      ? (body as { evidence?: GateEvaluationContext["evidence"] }).evidence
      : undefined

  return await runWithOrgContext(buildSyntheticOrgContext(ctx), async () => {
    const state = await readState()
    const role = state.roleAssessment?.primaryRole
    const gate = evaluateComplianceGate({
      input,
      aiActRole: role,
      evidence: rawEvidence,
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
      responseSummary: summariseGateResponse(gate),
      actor: {
        id: ctx.userId,
        label: ctx.email,
        role: "owner",
        source: ctx.source === "session" ? "session" : "workspace",
      },
    })

    return NextResponse.json(gate, {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        "X-RateLimit-Limit": String(rl.limit),
        "X-RateLimit-Remaining": String(rl.remaining),
        "Cache-Control": "no-store",
      },
    })
  })
}

function buildSyntheticOrgContext(ctx: { orgId: string; userId: string; email: string; orgName: string }) {
  return {
    orgId: ctx.orgId,
    userId: ctx.userId,
    email: ctx.email,
    orgName: ctx.orgName,
    workspaceMode: "ai-builder" as const,
  }
}

function jsonErr(status: number, code: string, message: string, extra?: Record<string, unknown>) {
  return NextResponse.json(
    { error: message, code, apiVersion: V1_API_VERSION, ...(extra ?? {}) },
    { status, headers: CORS_HEADERS },
  )
}

function rateLimitedResponse(rl: { limit: number; retryAfterSec: number }) {
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
}
