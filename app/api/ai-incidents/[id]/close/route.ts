/**
 * Sprint 020 — POST /api/ai-incidents/:id/close
 *
 * Închide incidentul cu closureNotes obligatorii.
 */
import { NextResponse } from "next/server"

import { getOrgContext } from "@/lib/server/org-context"
import { closeIncident } from "@/lib/server/ai-incident-store"
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
    const body = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >
    const closureNotes =
      typeof body.closureNotes === "string" ? body.closureNotes.trim() : ""
    if (closureNotes.length < 10) {
      return NextResponse.json(
        { error: "closureNotes este obligatoriu (minim 10 caractere)." },
        { status: 400 },
      )
    }

    const closed = await closeIncident(
      ctx.orgId,
      id,
      closureNotes,
      actorFromContext(ctx),
      ctx.orgName ?? "Organizația",
    )
    if (!closed) {
      return NextResponse.json(
        { error: "Incident AI inexistent." },
        { status: 404 },
      )
    }
    return NextResponse.json({ record: closed })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Eroare necunoscută"
    return NextResponse.json(
      { error: `Nu am putut închide incidentul AI: ${message}` },
      { status: 500 },
    )
  }
}
