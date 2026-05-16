// Public verify endpoint — no session required.
// Resolves a magic-link token to its context (without exposing sensitive data).

import { NextResponse } from "next/server"

import {
  hasSupabaseConfig,
  supabaseSelect,
} from "@/lib/server/supabase-rest"
import { verifyShareToken } from "@/lib/server/share-token-store"
import type { AIActState } from "@/lib/server/store"

type OrgRow = {
  id: string
  name: string | null
}

type OrgStateRow = { state: Partial<AIActState> | null }

export const dynamic = "force-dynamic"

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> }
) {
  const { token } = await context.params
  const verified = await verifyShareToken(token)
  if (!verified) {
    return NextResponse.json(
      { ok: false, error: "Link invalid sau expirat." },
      { status: 401 }
    )
  }

  const { payload, record } = verified

  // Best-effort resolution of org name + target (if applicable).
  let orgName: string | undefined
  let cabinetName: string | undefined =
    (record?.metadata?.cabinetName as string | undefined) ?? undefined
  let targetSummary: Record<string, unknown> | null = null

  if (hasSupabaseConfig()) {
    try {
      const orgs = await supabaseSelect<OrgRow>(
        "organizations",
        `select=id,name&id=eq.${encodeURIComponent(payload.orgId)}&limit=1`,
        "public"
      )
      orgName = orgs[0]?.name?.trim() || undefined
    } catch {
      // ignore
    }

    if (payload.targetType === "approval" && payload.targetId) {
      try {
        const rows = await supabaseSelect<OrgStateRow>(
          "org_state",
          `select=state&org_id=eq.${encodeURIComponent(payload.orgId)}&limit=1`,
          "public"
        )
        const state = rows[0]?.state
        const system = state?.aiSystems?.find((s) => s.id === payload.targetId)
        if (system) {
          targetSummary = {
            name: system.name,
            purpose: system.purpose,
            vendor: system.vendor,
            riskLevel: system.riskLevel,
            recommendedActions: system.recommendedActions,
          }
        }
      } catch {
        // ignore
      }
    }
  }

  if (!cabinetName) cabinetName = orgName

  return NextResponse.json({
    ok: true,
    targetType: payload.targetType,
    targetId: payload.targetId ?? null,
    targetLabel: record?.targetLabel ?? null,
    orgName: orgName ?? null,
    cabinetName: cabinetName ?? null,
    expiresAtISO: payload.expiresAtISO,
    createdAtISO: payload.createdAtISO,
    status: record?.status ?? "active",
    metadata: record?.metadata ?? {},
    target: targetSummary,
  })
}
