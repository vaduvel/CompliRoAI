/**
 * Sprint 016 — POST /api/fria/:id/notify-authority
 *
 * Body: { authorityName: string, reference: string }
 *
 * Marchează FRIA ca notificată autorității competente (ADR / ANSPDCP / ASF)
 * conform Art. 27(3). Setează notifiedAtISO + authorityReference + emite
 * event fria.authority_notified.
 */
import { NextResponse } from "next/server"

import { getOrgContext } from "@/lib/server/org-context"
import { notifyAuthority } from "@/lib/server/fria-store"
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

    const authorityName =
      typeof body.authorityName === "string" ? body.authorityName.trim() : ""
    const reference = typeof body.reference === "string" ? body.reference.trim() : ""
    if (!authorityName) {
      return NextResponse.json(
        { error: "Numele autorității este obligatoriu." },
        { status: 400 },
      )
    }
    if (!reference) {
      return NextResponse.json(
        { error: "Referința/numărul de înregistrare este obligatoriu." },
        { status: 400 },
      )
    }

    const updated = await notifyAuthority(
      ctx.orgId,
      id,
      authorityName,
      reference,
      actorFromContext(ctx),
    )
    if (!updated) {
      return NextResponse.json({ error: "FRIA inexistentă." }, { status: 404 })
    }
    return NextResponse.json({ record: updated })
  } catch {
    return NextResponse.json(
      { error: "Nu am putut marca notificarea autorității." },
      { status: 500 },
    )
  }
}
