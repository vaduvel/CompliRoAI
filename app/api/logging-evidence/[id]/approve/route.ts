/**
 * Sprint 018 — POST /api/logging-evidence/:id/approve
 *
 * Body: { approvedByEmail: string }  → status="active", approvedByEmail, approvedAtISO
 * Body: { reject: true, reason: string } → status="rejected"
 */
import { NextResponse } from "next/server"

import { getOrgContext } from "@/lib/server/org-context"
import {
  markConfigApproved,
  markConfigRejected,
} from "@/lib/server/logging-evidence-store"
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

    if (body.reject === true) {
      const reason = typeof body.reason === "string" ? body.reason.trim() : ""
      if (reason.length < 5) {
        return NextResponse.json(
          { error: "Motivul respingerii este obligatoriu (min 5 caractere)." },
          { status: 400 },
        )
      }
      const rejected = await markConfigRejected(ctx.orgId, id, reason, actorFromContext(ctx))
      if (!rejected) {
        return NextResponse.json(
          { error: "Configurare logging inexistentă." },
          { status: 404 },
        )
      }
      return NextResponse.json({ record: rejected })
    }

    const approvedByEmail =
      typeof body.approvedByEmail === "string"
        ? body.approvedByEmail.trim()
        : ctx.email
    if (!approvedByEmail || !approvedByEmail.includes("@")) {
      return NextResponse.json(
        { error: "Email aprobator invalid." },
        { status: 400 },
      )
    }
    const approved = await markConfigApproved(
      ctx.orgId,
      id,
      approvedByEmail,
      actorFromContext(ctx),
    )
    if (!approved) {
      return NextResponse.json(
        { error: "Configurare logging inexistentă." },
        { status: 404 },
      )
    }
    return NextResponse.json({ record: approved })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Eroare necunoscută"
    return NextResponse.json(
      { error: `Nu am putut aproba/respinge configurarea: ${message}` },
      { status: 500 },
    )
  }
}
