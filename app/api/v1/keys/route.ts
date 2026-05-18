// Sprint 023 — API key management (session-auth only).
//
// GET    /api/v1/keys       → list keys for current org (no full tokens)
// POST   /api/v1/keys       → create a new key (returns full token ONCE)
//
// Session auth is enforced via resolveApiAuth + assertion source==="session".

import { NextResponse } from "next/server"

import { V1_API_VERSION } from "@/lib/compliance/api-v1-schema"
import { resolveApiAuth } from "@/lib/server/api-context"
import { createApiKey, listApiKeys } from "@/lib/server/api-key-store"
import { runWithOrgContext } from "@/lib/server/org-context"
import type { ApiKeyScope } from "@/lib/compliance/types"

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
}

const VALID_SCOPES: ApiKeyScope[] = ["classify", "gate", "deployment", "read_state"]

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

function requireSessionAuth(auth: Awaited<ReturnType<typeof resolveApiAuth>>) {
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.message, code: auth.code, apiVersion: V1_API_VERSION },
      { status: auth.status, headers: CORS_HEADERS },
    )
  }
  if (auth.ctx.source !== "session") {
    return NextResponse.json(
      {
        error:
          "Managementul cheilor API necesită sesiune logată (cookie). Loghează-te în /dashboard/api-sdk.",
        code: "SESSION_REQUIRED",
        apiVersion: V1_API_VERSION,
      },
      { status: 401, headers: CORS_HEADERS },
    )
  }
  return null
}

export async function GET(request: Request) {
  const auth = await resolveApiAuth(request)
  const fail = requireSessionAuth(auth)
  if (fail) return fail
  if (!auth.ok) return fail // narrow for TS
  const ctx = auth.ctx

  const keys = await runWithOrgContext(synthCtx(ctx), () => listApiKeys(ctx.orgId))
  return NextResponse.json(
    {
      keys: keys.map(stripHash),
      apiVersion: V1_API_VERSION,
    },
    { status: 200, headers: CORS_HEADERS },
  )
}

export async function POST(request: Request) {
  const auth = await resolveApiAuth(request)
  const fail = requireSessionAuth(auth)
  if (fail) return fail
  if (!auth.ok) return fail
  const ctx = auth.ctx

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return errorResponse(400, "INVALID_JSON", "Body invalid — nu este JSON.")
  }

  const obj = (body ?? {}) as Record<string, unknown>
  const label = typeof obj.label === "string" ? obj.label.trim() : ""
  const scopes = Array.isArray(obj.scopes)
    ? (obj.scopes.filter(
        (s): s is ApiKeyScope =>
          typeof s === "string" && (VALID_SCOPES as string[]).includes(s),
      ) as ApiKeyScope[])
    : []
  const expiresAtISO = typeof obj.expiresAtISO === "string" ? obj.expiresAtISO : undefined
  const notes = typeof obj.notes === "string" ? obj.notes : undefined

  if (!label) {
    return errorResponse(400, "MISSING_LABEL", "Câmpul 'label' este obligatoriu.")
  }
  if (scopes.length === 0) {
    return errorResponse(
      400,
      "MISSING_SCOPES",
      `Alege cel puțin un scope din: ${VALID_SCOPES.join(", ")}.`,
    )
  }
  if (expiresAtISO && isNaN(new Date(expiresAtISO).getTime())) {
    return errorResponse(
      400,
      "INVALID_EXPIRES_AT",
      "'expiresAtISO' nu este o dată ISO validă.",
    )
  }

  const result = await runWithOrgContext(synthCtx(ctx), () =>
    createApiKey(
      ctx.orgId,
      { label, scopes, expiresAtISO, notes },
      { id: ctx.userId, label: ctx.email, role: "owner", source: "session" },
    ),
  )

  return NextResponse.json(
    {
      key: stripHash(result.key),
      // FULL TOKEN — shown only here, never persisted.
      fullToken: result.fullToken,
      warning:
        "Salvează acest token acum. Nu va fi afișat din nou. La pierdere, generează unul nou și revocă-l pe acesta.",
      apiVersion: V1_API_VERSION,
    },
    { status: 201, headers: CORS_HEADERS },
  )
}

function stripHash(key: Awaited<ReturnType<typeof listApiKeys>>[number]) {
  // Never echo hmacHash back to the UI.
  const { hmacHash: _omit, ...rest } = key
  void _omit
  return rest
}

function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json(
    { error: message, code, apiVersion: V1_API_VERSION },
    { status, headers: CORS_HEADERS },
  )
}

function synthCtx(ctx: { orgId: string; userId: string; email: string; orgName: string }) {
  return {
    orgId: ctx.orgId,
    userId: ctx.userId,
    email: ctx.email,
    orgName: ctx.orgName,
    workspaceMode: "ai-builder" as const,
  }
}
