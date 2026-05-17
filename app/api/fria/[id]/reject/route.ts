/**
 * Sprint 016 — POST /api/fria/:id/reject
 *
 * Body: { reason: string }  (min 5 chars)
 *
 * Setează status=rejected + rejectionReason + emite event fria.rejected.
 */
import { NextResponse } from "next/server"

import { getOrgContext } from "@/lib/server/org-context"
import { markFriaRejected } from "@/lib/server/fria-store"
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

    const reason = typeof body.reason === "string" ? body.reason.trim() : ""
    if (reason.length < 5) {
      return NextResponse.json(
        { error: "Motivul respingerii este obligatoriu (min 5 caractere)." },
        { status: 400 },
      )
    }

    const updated = await markFriaRejected(ctx.orgId, id, reason, actorFromContext(ctx))
    if (!updated) {
      return NextResponse.json({ error: "FRIA inexistentă." }, { status: 404 })
    }
    return NextResponse.json({ record: updated })
  } catch {
    return NextResponse.json(
      { error: "Nu am putut respinge FRIA." },
      { status: 500 },
    )
  }
}
