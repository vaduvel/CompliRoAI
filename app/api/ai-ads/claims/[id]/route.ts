/**
 * Sprint 024 — AI Ads claim per-id GET / PATCH / DELETE.
 */
import { NextResponse } from "next/server"

import {
  deleteClaim,
  getClaimById,
  isClaimType,
  isEvidenceStatus,
  updateClaim,
  type UpdateClaimPatch,
} from "@/lib/server/ai-ads-store"
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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await getOrgContext()
    const { id } = await params
    const claim = await getClaimById(ctx.orgId, id)
    if (!claim) {
      return NextResponse.json({ error: "Claim inexistent." }, { status: 404 })
    }
    return NextResponse.json({ claim })
  } catch {
    return NextResponse.json(
      { error: "Nu am putut citi claim-ul." },
      { status: 500 },
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await getOrgContext()
    const { id } = await params
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>

    const patch: UpdateClaimPatch = {}
    if (typeof body.claimText === "string") patch.claimText = body.claimText.trim()
    if (typeof body.contextDescription === "string") {
      patch.contextDescription = body.contextDescription
    }
    if (typeof body.claimType === "string" && isClaimType(body.claimType)) {
      patch.claimType = body.claimType
    }
    if (typeof body.evidenceStatus === "string" && isEvidenceStatus(body.evidenceStatus)) {
      patch.evidenceStatus = body.evidenceStatus
    }
    if (typeof body.evidenceSource === "string") {
      patch.evidenceSource = body.evidenceSource
    }
    if (typeof body.evidenceDocumentId === "string") {
      patch.evidenceDocumentId = body.evidenceDocumentId
    }
    if (typeof body.approvedByEmail === "string") {
      patch.approvedByEmail = body.approvedByEmail
    }
    if (typeof body.approvedAtISO === "string") {
      patch.approvedAtISO = body.approvedAtISO
    }
    if (typeof body.approvalComment === "string") {
      patch.approvalComment = body.approvalComment
    }
    if (typeof body.notes === "string") patch.notes = body.notes

    const updated = await updateClaim(ctx.orgId, id, patch, actorFromContext(ctx))
    if (!updated) {
      return NextResponse.json({ error: "Claim inexistent." }, { status: 404 })
    }
    return NextResponse.json({ claim: updated })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Eroare necunoscută"
    return NextResponse.json(
      { error: `Nu am putut actualiza claim-ul: ${message}` },
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
    const removed = await deleteClaim(ctx.orgId, id, actorFromContext(ctx))
    if (!removed) {
      return NextResponse.json({ error: "Claim inexistent." }, { status: 404 })
    }
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json(
      { error: "Nu am putut șterge claim-ul." },
      { status: 500 },
    )
  }
}
