/**
 * Sprint 009 — Follow-up note pe AIDataMapRecord.
 *
 * POST /api/ai-data-discovery/follow-up
 *   body: { id: string, note: string }
 *   -> append note timestamped la record.notes + event
 *      ai-discovery.followup.added.
 */
import { NextResponse } from "next/server"

import { getOrgContext } from "@/lib/server/org-context"
import { addFollowUpNote } from "@/lib/server/ai-data-discovery-store"
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

export async function POST(request: Request) {
  try {
    const ctx = await getOrgContext()
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>

    const id = typeof body.id === "string" ? body.id.trim() : ""
    const note = typeof body.note === "string" ? body.note.trim() : ""
    if (!id) {
      return NextResponse.json({ error: "id este obligatoriu." }, { status: 400 })
    }
    if (!note) {
      return NextResponse.json({ error: "note este obligatoriu." }, { status: 400 })
    }

    const updated = await addFollowUpNote(ctx.orgId, id, note, actorFromContext(ctx))
    if (!updated) {
      return NextResponse.json({ error: "Record AI inexistent." }, { status: 404 })
    }
    return NextResponse.json({ record: updated })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Nu am putut adauga follow-up." },
      { status: 500 },
    )
  }
}
