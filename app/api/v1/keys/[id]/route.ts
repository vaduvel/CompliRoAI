// Sprint 023 — DELETE /api/v1/keys/[id] — revoke an API key. Session auth only.

import { NextResponse } from "next/server"

import { V1_API_VERSION } from "@/lib/compliance/api-v1-schema"
import { resolveApiAuth } from "@/lib/server/api-context"
import { revokeApiKey } from "@/lib/server/api-key-store"
import { runWithOrgContext } from "@/lib/server/org-context"

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await resolveApiAuth(request)
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.message, code: auth.code, apiVersion: V1_API_VERSION },
      { status: auth.status, headers: CORS_HEADERS },
    )
  }
  if (auth.ctx.source !== "session") {
    return NextResponse.json(
      {
        error: "Revocarea cheilor necesită sesiune logată.",
        code: "SESSION_REQUIRED",
        apiVersion: V1_API_VERSION,
      },
      { status: 401, headers: CORS_HEADERS },
    )
  }
  const ctx = auth.ctx

  const { id } = await params
  if (!id || !id.startsWith("apikey-")) {
    return NextResponse.json(
      { error: "ID invalid.", code: "INVALID_ID", apiVersion: V1_API_VERSION },
      { status: 400, headers: CORS_HEADERS },
    )
  }

  const revoked = await runWithOrgContext(
    {
      orgId: ctx.orgId,
      userId: ctx.userId,
      email: ctx.email,
      orgName: ctx.orgName,
      workspaceMode: "ai-builder",
    },
    () =>
      revokeApiKey(ctx.orgId, id, {
        id: ctx.userId,
        label: ctx.email,
        role: "owner",
        source: "session",
      }),
  )

  if (!revoked) {
    return NextResponse.json(
      {
        error: "Cheia nu există sau este deja revocată.",
        code: "NOT_FOUND",
        apiVersion: V1_API_VERSION,
      },
      { status: 404, headers: CORS_HEADERS },
    )
  }

  const { hmacHash: _omit, ...safe } = revoked
  void _omit
  return NextResponse.json(
    { key: safe, apiVersion: V1_API_VERSION },
    { status: 200, headers: CORS_HEADERS },
  )
}
