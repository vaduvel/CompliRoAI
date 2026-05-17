/**
 * Sprint 013 — Trust Center per-token API
 * GET /api/trust-center/[token] → PUBLIC profile (no auth)
 *   - verifică signature HMAC
 *   - caută token în orgState al orgId-ului din payload
 *   - validează nu e revocat/expired
 *   - incrementeaza viewCount + lastViewedAtISO
 *   - returnează TrustCenterPublicProfile
 *
 * DELETE /api/trust-center/[token] → revoke (autenticat, owner-only via session)
 */
import { NextResponse } from "next/server"
import { createHmac } from "node:crypto"
import path from "node:path"
import { promises as fs } from "node:fs"

import {
  appendComplianceEvents,
  createComplianceEvent,
  type ComplianceEventActorInput,
} from "@/lib/compliance/events"
import { getOrgContext } from "@/lib/server/org-context"
import { mutateFreshStateForOrg, mergeWithDefault, type AIActState } from "@/lib/server/store"
import {
  loadOrgStateFromSupabase,
  persistOrgStateToSupabase,
  shouldUseSupabaseOrgState,
} from "@/lib/server/supabase-org-state"
import { getEffectiveBranding } from "@/lib/server/white-label"
import { listAuditPackRegistry } from "@/lib/server/audit-pack-builder"
import { buildTrustCenterProfile } from "@/lib/server/trust-center-builder"
import type { TrustCenterToken } from "@/lib/compliance/types"

function getSecret(): string {
  const secret = process.env.AIACT_SESSION_SECRET?.trim()
  if (secret && secret.length >= 16) return secret
  if (process.env.NODE_ENV === "production") {
    throw new Error("AIACT_SESSION_SECRET missing in production")
  }
  return "aiact-trust-dev-fallback-do-not-use-in-prod"
}

function constantTimeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

type DecodedTrustPayload = { id: string; orgId: string; kind: string }

function decodeToken(token: string): DecodedTrustPayload | null {
  try {
    const dot = token.lastIndexOf(".")
    if (dot === -1) return null
    const encoded = token.slice(0, dot)
    const sig = token.slice(dot + 1)
    const expected = createHmac("sha256", getSecret()).update(encoded).digest("base64url")
    if (!constantTimeEquals(expected, sig)) return null
    const payloadStr = Buffer.from(encoded, "base64url").toString("utf-8")
    const payload = JSON.parse(payloadStr) as Partial<DecodedTrustPayload>
    if (
      !payload?.id ||
      !payload.orgId ||
      payload.kind !== "trust-center"
    ) {
      return null
    }
    return { id: payload.id, orgId: payload.orgId, kind: payload.kind }
  } catch {
    return null
  }
}

async function readOrgStateNoSession(orgId: string): Promise<AIActState> {
  // Public surface — nu putem folosi readState() (cere session header).
  // Re-implementare a flow-ului readState dar pe orgId fix.
  if (shouldUseSupabaseOrgState()) {
    try {
      const remote = await loadOrgStateFromSupabase<Partial<AIActState>>(orgId)
      return mergeWithDefault(remote)
    } catch {
      // fall through to local
    }
  }
  try {
    const filePath = path.join(process.cwd(), ".data", `state-${orgId}.json`)
    const raw = await fs.readFile(filePath, "utf-8")
    return mergeWithDefault(JSON.parse(raw) as Partial<AIActState>)
  } catch {
    return mergeWithDefault(null)
  }
}

async function writeOrgStateNoSession(orgId: string, state: AIActState): Promise<void> {
  if (shouldUseSupabaseOrgState()) {
    try {
      await persistOrgStateToSupabase<AIActState>(orgId, state)
      return
    } catch {
      // fall through
    }
  }
  const { writeFileSafe } = await import("@/lib/server/fs-safe")
  const filePath = path.join(process.cwd(), ".data", `state-${orgId}.json`)
  await writeFileSafe(filePath, JSON.stringify(state, null, 2))
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await context.params
    const payload = decodeToken(token)
    if (!payload) {
      return NextResponse.json({ error: "Token invalid." }, { status: 404 })
    }

    const state = await readOrgStateNoSession(payload.orgId)
    const tokens = state.trustCenterTokens ?? []
    const record = tokens.find((t) => t.id === payload.id)
    if (!record) {
      return NextResponse.json({ error: "Link revocat sau inexistent." }, { status: 404 })
    }
    if (record.revokedAtISO) {
      return NextResponse.json({ error: "Link revocat." }, { status: 410 })
    }
    if (record.expiresAtISO && Date.parse(record.expiresAtISO) < Date.now()) {
      return NextResponse.json({ error: "Link expirat." }, { status: 410 })
    }

    // Build profile
    const branding = await getEffectiveBranding(payload.orgId)
    let auditPacks: Awaited<ReturnType<typeof listAuditPackRegistry>> = []
    try {
      auditPacks = await listAuditPackRegistry(payload.orgId)
    } catch {
      auditPacks = []
    }
    // Try to extract orgName from state hints (partnerWorkspace.orgName) or use orgId as fallback.
    const orgName =
      state.partnerWorkspace?.orgName ?? branding.brandName ?? `Organizație ${payload.orgId.slice(0, 8)}`
    const profile = buildTrustCenterProfile({
      state,
      orgId: payload.orgId,
      orgName,
      branding,
      auditPackRegistry: auditPacks,
    })

    // Increment view count (best-effort, non-blocking semantics)
    try {
      const nextTokens = tokens.map((t) =>
        t.id === payload.id
          ? { ...t, viewCount: t.viewCount + 1, lastViewedAtISO: new Date().toISOString() }
          : t,
      )
      await writeOrgStateNoSession(payload.orgId, { ...state, trustCenterTokens: nextTokens })
    } catch {
      // Best-effort: profile is already returned to caller.
    }

    return NextResponse.json({ profile, label: record.label })
  } catch (err) {
    console.error("[trust-center.GET token]", err)
    return NextResponse.json(
      { error: "Nu am putut încărca profilul Trust Center." },
      { status: 500 },
    )
  }
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ token: string }> },
) {
  try {
    const ctx = await getOrgContext()
    const { token } = await context.params
    const payload = decodeToken(token)
    if (!payload) {
      return NextResponse.json({ error: "Token invalid." }, { status: 404 })
    }
    if (payload.orgId !== ctx.orgId) {
      return NextResponse.json({ error: "Nu aparține organizației tale." }, { status: 403 })
    }

    let revoked = false
    await mutateFreshStateForOrg(ctx.orgId, (state) => {
      const existing = state.trustCenterTokens ?? []
      const idx = existing.findIndex((t) => t.id === payload.id)
      if (idx === -1) return state
      if (existing[idx].revokedAtISO) return state
      const now = new Date().toISOString()
      const updated: TrustCenterToken = { ...existing[idx], revokedAtISO: now }
      const next = [...existing]
      next[idx] = updated
      revoked = true
      const actor: ComplianceEventActorInput = {
        id: ctx.userId,
        label: ctx.email,
        role: "compliance",
        source: "session",
      }
      const event = createComplianceEvent(
        {
          type: "trust-center.token.revoked",
          entityType: "system",
          entityId: payload.id,
          message: `Link Trust Center revocat: ${updated.label}`,
          createdAtISO: now,
          metadata: { tokenId: payload.id },
        },
        actor,
      )
      return {
        ...state,
        trustCenterTokens: next,
        events: appendComplianceEvents(state, [event]),
      }
    })

    if (!revoked) {
      return NextResponse.json(
        { error: "Token deja revocat sau inexistent." },
        { status: 404 },
      )
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[trust-center.DELETE token]", err)
    return NextResponse.json(
      { error: "Nu am putut revoca link-ul." },
      { status: 500 },
    )
  }
}
