/**
 * Sprint 013 — Trust Center token API (cabinet management)
 * GET /api/trust-center → listează token-urile org-ului (cu URL public)
 * POST /api/trust-center body { label, expiresInDays? } → creează token nou
 *
 * Token-ul e HMAC self-contained (folosește pattern share-token-store):
 *  - payload: { id, orgId, targetType:"report", targetId:"trust-center" }
 *  - signat cu AIACT_SESSION_SECRET
 *  - stocat în org_state.trustCenterTokens pentru revoke + view tracking
 *
 * Public consumer face GET /api/trust-center/[token] — fără auth.
 */
import { NextResponse } from "next/server"
import { createHmac, randomBytes } from "node:crypto"

import {
  appendComplianceEvents,
  createComplianceEvent,
  type ComplianceEventActorInput,
} from "@/lib/compliance/events"
import { getOrgContext } from "@/lib/server/org-context"
import { mutateFreshStateForOrg, readState } from "@/lib/server/store"
import type { TrustCenterToken } from "@/lib/compliance/types"

const MAX_TOKENS_PER_ORG = 50

function getSecret(): string {
  const secret = process.env.AIACT_SESSION_SECRET?.trim()
  if (secret && secret.length >= 16) return secret
  if (process.env.NODE_ENV === "production") {
    throw new Error("AIACT_SESSION_SECRET missing in production")
  }
  return "aiact-trust-dev-fallback-do-not-use-in-prod"
}

function b64urlEncode(value: string): string {
  return Buffer.from(value, "utf-8").toString("base64url")
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("base64url")
}

function buildToken(payload: { id: string; orgId: string }): string {
  const encoded = b64urlEncode(JSON.stringify({ ...payload, kind: "trust-center" }))
  const sig = sign(encoded)
  return `${encoded}.${sig}`
}

function actorFrom(ctx: Awaited<ReturnType<typeof getOrgContext>>): ComplianceEventActorInput {
  return { id: ctx.userId, label: ctx.email, role: "compliance", source: "session" }
}

function buildPublicUrl(origin: string, token: string): string {
  return new URL(`/trust/${token}`, origin).toString()
}

export async function GET(req: Request) {
  try {
    const ctx = await getOrgContext()
    const state = await readState()
    const tokens = state.trustCenterTokens ?? []
    const origin = new URL(req.url).origin
    const now = Date.now()

    const withUrls = tokens.map((t) => {
      const expired = t.expiresAtISO ? Date.parse(t.expiresAtISO) < now : false
      return {
        ...t,
        publicUrl: buildPublicUrl(origin, t.token),
        derivedStatus: t.revokedAtISO ? "revoked" : expired ? "expired" : "active",
      }
    })
    return NextResponse.json({ tokens: withUrls, orgName: ctx.orgName })
  } catch (err) {
    console.error("[trust-center.GET]", err)
    return NextResponse.json(
      { error: "Nu am putut încărca link-urile Trust Center." },
      { status: 500 },
    )
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await getOrgContext()
    const body = (await req.json().catch(() => ({}))) as {
      label?: string
      expiresInDays?: number
    }

    const label = (body.label ?? "Link public").trim().slice(0, 120)
    const expiresInDays = typeof body.expiresInDays === "number" ? Math.max(1, Math.min(365, body.expiresInDays)) : undefined
    const now = new Date().toISOString()
    const id = `tcen-${randomBytes(6).toString("hex")}`
    const token = buildToken({ id, orgId: ctx.orgId })

    const record: TrustCenterToken = {
      id,
      orgId: ctx.orgId,
      token,
      label,
      createdByEmail: ctx.email,
      createdAtISO: now,
      expiresAtISO: expiresInDays
        ? new Date(Date.now() + expiresInDays * 24 * 3_600_000).toISOString()
        : undefined,
      viewCount: 0,
    }

    await mutateFreshStateForOrg(ctx.orgId, (state) => {
      const existing = state.trustCenterTokens ?? []
      const event = createComplianceEvent(
        {
          type: "trust-center.token.created",
          entityType: "system",
          entityId: id,
          message: `Link Trust Center creat: ${label}`,
          createdAtISO: now,
          metadata: { tokenId: id, label, expiresInDays: expiresInDays ?? 0 },
        },
        actorFrom(ctx),
      )
      return {
        ...state,
        trustCenterTokens: [record, ...existing].slice(0, MAX_TOKENS_PER_ORG),
        events: appendComplianceEvents(state, [event]),
      }
    })

    const origin = new URL(req.url).origin
    return NextResponse.json(
      {
        token: record,
        publicUrl: buildPublicUrl(origin, token),
      },
      { status: 201 },
    )
  } catch (err) {
    console.error("[trust-center.POST]", err)
    return NextResponse.json(
      { error: "Nu am putut crea link-ul." },
      { status: 500 },
    )
  }
}
