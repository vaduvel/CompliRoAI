// Sprint 026 — Authority Cooperation Requests (Art. 21 + Art. 26(11)).
//
// GET  /api/authority-cooperation
//   → { records, schema: { authorities, statuses } }
// POST /api/authority-cooperation
//   → creează o solicitare nouă (status=received).

import { NextResponse } from "next/server"

import {
  AUTHORITY_LABELS,
  STATUS_LABELS,
  createAuthorityCooperationRequest,
  isAuthorityCooperationAuthority,
  listAuthorityCooperationRequests,
} from "@/lib/server/authority-cooperation-store"
import { getOrgContext } from "@/lib/server/org-context"

export async function GET() {
  try {
    await getOrgContext()
    const records = await listAuthorityCooperationRequests()
    return NextResponse.json({
      records,
      schema: {
        authorities: Object.entries(AUTHORITY_LABELS).map(([value, label]) => ({
          value,
          label,
        })),
        statuses: Object.entries(STATUS_LABELS).map(([value, label]) => ({
          value,
          label,
        })),
      },
    })
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}

export async function POST(request: Request) {
  let ctx
  try {
    ctx = await getOrgContext()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (!isAuthorityCooperationAuthority(body.authority)) {
    return NextResponse.json(
      { error: "Câmpul `authority` lipsește sau este invalid." },
      { status: 400 },
    )
  }
  if (typeof body.subject !== "string" || !body.subject.trim()) {
    return NextResponse.json(
      { error: "Câmpul `subject` este obligatoriu." },
      { status: 400 },
    )
  }
  if (typeof body.responsibleEmail !== "string" || !body.responsibleEmail.trim()) {
    return NextResponse.json(
      { error: "Câmpul `responsibleEmail` este obligatoriu." },
      { status: 400 },
    )
  }
  if (body.authority === "other") {
    if (
      typeof body.authorityNameOther !== "string" ||
      !body.authorityNameOther.trim()
    ) {
      return NextResponse.json(
        { error: "Pentru `other` câmpul `authorityNameOther` este obligatoriu." },
        { status: 400 },
      )
    }
  }

  try {
    const record = await createAuthorityCooperationRequest({
      authority: body.authority,
      authorityNameOther:
        typeof body.authorityNameOther === "string"
          ? body.authorityNameOther
          : undefined,
      referenceNumber:
        typeof body.referenceNumber === "string" ? body.referenceNumber : undefined,
      receivedAtISO:
        typeof body.receivedAtISO === "string" ? body.receivedAtISO : undefined,
      deadlineISO: typeof body.deadlineISO === "string" ? body.deadlineISO : undefined,
      subject: body.subject,
      linkedSystemIds: Array.isArray(body.linkedSystemIds)
        ? (body.linkedSystemIds.filter((v) => typeof v === "string") as string[])
        : undefined,
      linkedIncidentIds: Array.isArray(body.linkedIncidentIds)
        ? (body.linkedIncidentIds.filter((v) => typeof v === "string") as string[])
        : undefined,
      linkedGeneratedDocumentIds: Array.isArray(body.linkedGeneratedDocumentIds)
        ? (body.linkedGeneratedDocumentIds.filter((v) => typeof v === "string") as string[])
        : undefined,
      linkedDpiaIds: Array.isArray(body.linkedDpiaIds)
        ? (body.linkedDpiaIds.filter((v) => typeof v === "string") as string[])
        : undefined,
      linkedFriaIds: Array.isArray(body.linkedFriaIds)
        ? (body.linkedFriaIds.filter((v) => typeof v === "string") as string[])
        : undefined,
      responsibleEmail: body.responsibleEmail,
      createdByEmail: ctx.email,
    })
    return NextResponse.json({ record })
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message ?? "Eroare la creare." },
      { status: 400 },
    )
  }
}
