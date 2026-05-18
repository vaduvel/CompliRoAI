// Sprint 023 — POST /api/v1/deployment
// Body: ClassifyV1Input + deploymentRef (+ optional `evidence`)
// → DeploymentV1Response with full gate + findingEmitted flag.
//
// When verdict != "pass", emits a finding via emitDeploymentFinding so the
// cockpit + /dashboard/de-rezolvat pick it up immediately.

import { NextResponse } from "next/server"

import {
  parseDeploymentInput,
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
import {
  emitDeploymentFinding,
  logApiCall,
  summariseGateResponse,
} from "@/lib/server/api-audit"
import { runWithOrgContext } from "@/lib/server/org-context"
import { readState } from "@/lib/server/store"
import type { DeploymentV1Response } from "@/lib/compliance/types"

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
}

const ENDPOINT = "/api/v1/deployment"

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

export async function POST(request: Request) {
  const startedAt = Date.now()
  const ip = extractClientIp(request.headers)
  const userAgent = request.headers.get("user-agent") ?? undefined

  const auth = await resolveApiAuth(request)
  if (!auth.ok) return jsonErr(auth.status, auth.code, auth.message)
  const scoped = requireScope(auth.ctx, "deployment")
  if (!scoped.ok) return jsonErr(scoped.status, scoped.code, scoped.message)
  const ctx = scoped.ctx

  const rl = checkRateLimit({
    key: buildRateLimitKey({ orgId: ctx.orgId, ip, endpoint: ENDPOINT }),
  })
  if (!rl.allowed) {
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

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return jsonErr(400, "INVALID_JSON", "Body invalid — nu este JSON.")
  }
  const parsed = parseDeploymentInput(body)
  if (!parsed.ok) {
    return jsonErr(
      400,
      parsed.errors[0]?.code ?? "INVALID_INPUT",
      parsed.errors[0]?.message ?? "Input invalid.",
      { errors: parsed.errors },
    )
  }
  const input = parsed.value
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

    const actor = {
      id: ctx.userId,
      label: ctx.email,
      role: "owner" as const,
      source: (ctx.source === "session" ? "session" : "workspace") as
        | "session"
        | "workspace",
    }

    // Emit finding when gate is non-pass.
    const findingId = await emitDeploymentFinding({
      orgId: ctx.orgId,
      systemName: input.systemName,
      deploymentRef: input.deploymentRef,
      gate,
      actor,
    })

    const now = new Date().toISOString()
    await logApiCall({
      orgId: ctx.orgId,
      apiKeyId: ctx.apiKey?.id,
      endpoint: ENDPOINT,
      method: "POST",
      statusCode: 200,
      durationMs: Date.now() - startedAt,
      ip,
      userAgent,
      requestSummary: `${summariseClassifyInput(input)} ref=${input.deploymentRef}`,
      responseSummary: summariseGateResponse(gate),
      actor,
      nowISO: now,
    })

    const response: DeploymentV1Response = {
      deploymentRef: input.deploymentRef,
      systemName: input.systemName,
      gate,
      findingEmitted: Boolean(findingId),
      apiVersion: V1_API_VERSION,
      loggedAtISO: now,
    }

    return NextResponse.json(response, {
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
