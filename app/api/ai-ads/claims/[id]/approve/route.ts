/**
 * Sprint 024 — Mark a claim as approved.
 *
 * POST /api/ai-ads/claims/[id]/approve
 *   Body: { approvedByEmail, approvalComment? }
 *   Sets claim.approvedByEmail + approvedAtISO + optional approvalComment.
 */
import { NextResponse } from "next/server"

import { getClaimById, updateClaim } from "@/lib/server/ai-ads-store"
import { getOrgContext } from "@/lib/server/org-context"
import type { ComplianceEventActorInput } from "@/lib/compliance/events"

function actorFromContext(ctx: {
  userId: string
  email: string
}): ComplianceEventActorInput {
  return {
    id: ctx.userId,
    label: ctx.email,
    role: "compliance",
    source: "session",
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await getOrgContext()
    const { id } = await params
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>

    const approvedByEmail =
      typeof body.approvedByEmail === "string" ? body.approvedByEmail.trim() : ""
    if (!approvedByEmail || !approvedByEmail.includes("@")) {
      return NextResponse.json(
        { error: "approvedByEmail valid este obligatoriu." },
        { status: 400 },
      )
    }

    const existing = await getClaimById(ctx.orgId, id)
    if (!existing) {
      return NextResponse.json({ error: "Claim inexistent." }, { status: 404 })
    }

    const updated = await updateClaim(
      ctx.orgId,
      id,
      {
        approvedByEmail,
        approvedAtISO: new Date().toISOString(),
        approvalComment:
          typeof body.approvalComment === "string" ? body.approvalComment : undefined,
      },
      actorFromContext(ctx),
    )
    return NextResponse.json({ claim: updated })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Eroare necunoscută"
    return NextResponse.json(
      { error: `Nu am putut aproba claim-ul: ${message}` },
      { status: 500 },
    )
  }
}
