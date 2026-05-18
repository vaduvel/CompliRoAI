// Sprint 026 — Authority Cooperation Requests by ID.
//
// PATCH  /api/authority-cooperation/[id]   → update status / response summary / etc.
// DELETE /api/authority-cooperation/[id]   → delete record.

import { NextResponse } from "next/server"

import {
  deleteAuthorityCooperationRequest,
  getAuthorityCooperationRequest,
  isAuthorityCooperationAuthority,
  isAuthorityCooperationStatus,
  updateAuthorityCooperationRequest,
  type UpdateAuthorityCooperationRequestPatch,
} from "@/lib/server/authority-cooperation-store"
import { getOrgContext } from "@/lib/server/org-context"

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await getOrgContext()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { id } = await context.params
  const record = await getAuthorityCooperationRequest(id)
  if (!record) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  return NextResponse.json({ record })
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await getOrgContext()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { id } = await context.params

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const patch: UpdateAuthorityCooperationRequestPatch = {}

  if (body.authority !== undefined) {
    if (!isAuthorityCooperationAuthority(body.authority)) {
      return NextResponse.json({ error: "authority invalid" }, { status: 400 })
    }
    patch.authority = body.authority
  }
  if (typeof body.authorityNameOther === "string") {
    patch.authorityNameOther = body.authorityNameOther
  }
  if (typeof body.referenceNumber === "string") {
    patch.referenceNumber = body.referenceNumber
  }
  if (typeof body.deadlineISO === "string") {
    patch.deadlineISO = body.deadlineISO
  }
  if (typeof body.subject === "string") {
    patch.subject = body.subject
  }
  if (typeof body.responseSummary === "string") {
    patch.responseSummary = body.responseSummary
  }
  if (Array.isArray(body.linkedSystemIds)) {
    patch.linkedSystemIds = body.linkedSystemIds.filter(
      (v): v is string => typeof v === "string",
    )
  }
  if (Array.isArray(body.linkedIncidentIds)) {
    patch.linkedIncidentIds = body.linkedIncidentIds.filter(
      (v): v is string => typeof v === "string",
    )
  }
  if (Array.isArray(body.linkedGeneratedDocumentIds)) {
    patch.linkedGeneratedDocumentIds = body.linkedGeneratedDocumentIds.filter(
      (v): v is string => typeof v === "string",
    )
  }
  if (Array.isArray(body.linkedDpiaIds)) {
    patch.linkedDpiaIds = body.linkedDpiaIds.filter(
      (v): v is string => typeof v === "string",
    )
  }
  if (Array.isArray(body.linkedFriaIds)) {
    patch.linkedFriaIds = body.linkedFriaIds.filter(
      (v): v is string => typeof v === "string",
    )
  }
  if (body.status !== undefined) {
    if (!isAuthorityCooperationStatus(body.status)) {
      return NextResponse.json({ error: "status invalid" }, { status: 400 })
    }
    patch.status = body.status
  }
  if (typeof body.respondedAtISO === "string") {
    patch.respondedAtISO = body.respondedAtISO
  }
  if (typeof body.closedAtISO === "string") {
    patch.closedAtISO = body.closedAtISO
  }
  if (typeof body.responsibleEmail === "string") {
    patch.responsibleEmail = body.responsibleEmail
  }

  try {
    const updated = await updateAuthorityCooperationRequest(id, patch)
    if (!updated) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }
    return NextResponse.json({ record: updated })
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message ?? "Eroare la actualizare." },
      { status: 400 },
    )
  }
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await getOrgContext()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { id } = await context.params
  const ok = await deleteAuthorityCooperationRequest(id)
  if (!ok) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  return NextResponse.json({ ok: true })
}
