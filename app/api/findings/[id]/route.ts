/**
 * Sprint 008B — Finding per-id: PATCH update / DELETE
 *
 * PATCH /api/findings/[id]
 *   body: { findingStatus?, reviewState?, operationalEvidenceNote?, action? }
 *
 * DELETE /api/findings/[id] — hard delete + ledger entry.
 */
import { NextResponse } from "next/server"

import { getOrgContext } from "@/lib/server/org-context"
import {
  deleteFinding,
  isFindingAction,
  isFindingReviewState,
  isFindingStatus,
  updateFinding,
} from "@/lib/server/findings-store"
import type { ComplianceEventActorInput } from "@/lib/compliance/events"

function actorFromContext(ctx: {
  userId: string
  email: string
}): ComplianceEventActorInput {
  return {
    id: ctx.userId,
    label: ctx.email,
    role: "owner",
    source: "session",
  }
}

async function parseJsonBodySafe(request: Request): Promise<Record<string, unknown>> {
  const raw = await request.text().catch(() => "")
  if (!raw.trim()) return {}
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    return parsed && typeof parsed === "object" ? parsed : {}
  } catch (error) {
    console.warn("PATCH /api/findings/[id] invalid JSON body", {
      error: error instanceof Error ? error.message : String(error),
      snippet: raw.slice(0, 300),
    })
    return {}
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await getOrgContext()
    const { id } = await params
    const body = await parseJsonBodySafe(request)

    if (body.findingStatus !== undefined && !isFindingStatus(body.findingStatus)) {
      return NextResponse.json({ error: "Status invalid." }, { status: 400 })
    }
    if (body.reviewState !== undefined && !isFindingReviewState(body.reviewState)) {
      return NextResponse.json({ error: "Review state invalid." }, { status: 400 })
    }
    if (body.action !== undefined && !isFindingAction(body.action)) {
      return NextResponse.json(
        { error: "Actiune invalida (confirm/dismiss/resolve/reopen/monitor)." },
        { status: 400 },
      )
    }

    const updated = await updateFinding(
      ctx.orgId,
      id,
      {
        findingStatus: body.findingStatus,
        reviewState: body.reviewState,
        operationalEvidenceNote:
          typeof body.operationalEvidenceNote === "string"
            ? body.operationalEvidenceNote
            : undefined,
        action: body.action,
      },
      actorFromContext(ctx),
    )

    if (!updated) {
      return NextResponse.json(
        { error: "Risc-ul nu a fost gasit." },
        { status: 404 },
      )
    }

    return NextResponse.json({ finding: updated })
  } catch (error) {
    console.error("PATCH /api/findings/[id] failed", error)
    return NextResponse.json(
      { error: "Nu am putut actualiza risc-ul." },
      { status: 500 },
    )
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await getOrgContext()
    const { id } = await params
    const removed = await deleteFinding(ctx.orgId, id, actorFromContext(ctx))
    if (!removed) {
      return NextResponse.json(
        { error: "Risc-ul nu a fost gasit." },
        { status: 404 },
      )
    }
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("DELETE /api/findings/[id] failed", error)
    return NextResponse.json(
      { error: "Nu am putut sterge risc-ul." },
      { status: 500 },
    )
  }
}
