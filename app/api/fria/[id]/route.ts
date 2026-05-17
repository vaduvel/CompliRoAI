/**
 * Sprint 016 — FRIA single record: GET / PATCH / DELETE.
 */
import { NextResponse } from "next/server"

import { getOrgContext } from "@/lib/server/org-context"
import {
  deleteFria,
  getFriaRecordById,
  isFriaStatus,
  updateFria,
  type UpdateFriaPatch,
} from "@/lib/server/fria-store"
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
    const record = await getFriaRecordById(ctx.orgId, id)
    if (!record) {
      return NextResponse.json({ error: "FRIA inexistentă." }, { status: 404 })
    }
    return NextResponse.json({ record })
  } catch {
    return NextResponse.json(
      { error: "Nu am putut citi FRIA." },
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

    const patch: UpdateFriaPatch = {}
    if (typeof body.title === "string") patch.title = body.title
    if (typeof body.processDescription === "string") {
      patch.processDescription = body.processDescription
    }
    if (typeof body.periodOfUseStartISO === "string") {
      patch.periodOfUseStartISO = body.periodOfUseStartISO
    }
    if (typeof body.periodOfUseEndISO === "string") {
      patch.periodOfUseEndISO = body.periodOfUseEndISO
    }
    if (typeof body.expectedVolume === "number") {
      patch.expectedVolume = body.expectedVolume
    }
    if (Array.isArray(body.affectedGroups)) patch.affectedGroups = body.affectedGroups as never
    if (Array.isArray(body.rightsAtRisk)) patch.rightsAtRisk = body.rightsAtRisk as never
    if (Array.isArray(body.riskAssessments)) {
      patch.riskAssessments = body.riskAssessments as never
    }
    if (Array.isArray(body.humanOversightMeasures)) {
      patch.humanOversightMeasures = body.humanOversightMeasures as never
    }
    if (typeof body.complaintMechanism === "string") {
      patch.complaintMechanism = body.complaintMechanism
    }
    if (Array.isArray(body.governanceMeasures)) {
      patch.governanceMeasures = (body.governanceMeasures as unknown[]).filter(
        (s): s is string => typeof s === "string",
      )
    }
    if (typeof body.notifyAuthorityRequired === "boolean") {
      patch.notifyAuthorityRequired = body.notifyAuthorityRequired
    }
    if (typeof body.notifyAuthorityName === "string") {
      patch.notifyAuthorityName = body.notifyAuthorityName
    }
    if (typeof body.notes === "string") patch.notes = body.notes
    if (typeof body.status === "string" && isFriaStatus(body.status)) {
      patch.status = body.status
    }

    const updated = await updateFria(
      ctx.orgId,
      id,
      patch,
      actorFromContext(ctx),
      ctx.orgName ?? "Organizația",
    )
    if (!updated) {
      return NextResponse.json({ error: "FRIA inexistentă." }, { status: 404 })
    }
    return NextResponse.json({ record: updated })
  } catch {
    return NextResponse.json(
      { error: "Nu am putut actualiza FRIA." },
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
    const removed = await deleteFria(ctx.orgId, id, actorFromContext(ctx))
    if (!removed) {
      return NextResponse.json({ error: "FRIA inexistentă." }, { status: 404 })
    }
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json(
      { error: "Nu am putut șterge FRIA." },
      { status: 500 },
    )
  }
}
