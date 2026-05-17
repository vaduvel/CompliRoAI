/**
 * Sprint 016 — POST /api/fria/:id/approve
 *
 * Body: { approvedByEmail: string }   (default = current user email)
 *
 * Setează status=approved, approvedByEmail, approvedAtISO + emite event fria.approved.
 */
import { NextResponse } from "next/server"

import { getOrgContext } from "@/lib/server/org-context"
import { markFriaApproved } from "@/lib/server/fria-store"
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
    const body = await request.json().catch(() => ({}))

    const approvedByEmail =
      typeof body.approvedByEmail === "string" && body.approvedByEmail.trim()
        ? body.approvedByEmail.trim()
        : ctx.email

    const updated = await markFriaApproved(
      ctx.orgId,
      id,
      approvedByEmail,
      actorFromContext(ctx),
    )
    if (!updated) {
      return NextResponse.json({ error: "FRIA inexistentă." }, { status: 404 })
    }
    return NextResponse.json({ record: updated })
  } catch {
    return NextResponse.json(
      { error: "Nu am putut aproba FRIA." },
      { status: 500 },
    )
  }
}
