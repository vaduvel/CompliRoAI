/**
 * Sprint 021 — QMS document attach/remove.
 *
 * POST   /api/qms/document
 *   body: { sectionKey, type, title, url?, fileName?, versionLabel?, notes? }
 * DELETE /api/qms/document?sectionKey=X&docId=Y
 */
import { NextResponse } from "next/server"

import { getOrgContext } from "@/lib/server/org-context"
import {
  attachQmsDocument,
  isQmsDocumentType,
  isQmsSectionKey,
  removeQmsDocument,
} from "@/lib/server/qms-store"
import type { ComplianceEventActorInput } from "@/lib/compliance/events"
import type {
  QmsDocumentReferenceType,
  QmsSectionKey,
} from "@/lib/compliance/types"

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
    const body = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >
    const sectionKey = body.sectionKey
    if (!isQmsSectionKey(sectionKey)) {
      return NextResponse.json(
        { error: "sectionKey invalid (Art. 17(1)(a)-(m))." },
        { status: 400 },
      )
    }
    const type = body.type
    if (!isQmsDocumentType(type)) {
      return NextResponse.json(
        {
          error:
            "type invalid (policy/procedure/standard/specification/template/report/audit_record/other).",
        },
        { status: 400 },
      )
    }
    const title = typeof body.title === "string" ? body.title.trim() : ""
    if (!title) {
      return NextResponse.json(
        { error: "title obligatoriu." },
        { status: 400 },
      )
    }
    const ctx = await getOrgContext()
    const workspace = await attachQmsDocument(
      ctx.orgId,
      sectionKey as QmsSectionKey,
      {
        type: type as QmsDocumentReferenceType,
        title,
        url: typeof body.url === "string" ? body.url : undefined,
        fileName: typeof body.fileName === "string" ? body.fileName : undefined,
        versionLabel:
          typeof body.versionLabel === "string"
            ? body.versionLabel
            : undefined,
        notes: typeof body.notes === "string" ? body.notes : undefined,
        attachedByEmail:
          typeof body.attachedByEmail === "string"
            ? body.attachedByEmail
            : undefined,
      },
      actorFromContext(ctx),
      ctx.orgName ?? "Organizația",
    )
    return NextResponse.json({ workspace })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Eroare necunoscută"
    return NextResponse.json(
      { error: `Nu am putut atașa documentul: ${message}` },
      { status: 400 },
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url)
    const sectionKey = url.searchParams.get("sectionKey")
    const docId = url.searchParams.get("docId")
    if (!isQmsSectionKey(sectionKey)) {
      return NextResponse.json(
        { error: "sectionKey invalid." },
        { status: 400 },
      )
    }
    if (!docId) {
      return NextResponse.json(
        { error: "docId obligatoriu." },
        { status: 400 },
      )
    }
    const ctx = await getOrgContext()
    const workspace = await removeQmsDocument(
      ctx.orgId,
      sectionKey as QmsSectionKey,
      docId,
      actorFromContext(ctx),
      ctx.orgName ?? "Organizația",
    )
    return NextResponse.json({ workspace })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Eroare necunoscută"
    return NextResponse.json(
      { error: `Nu am putut șterge documentul: ${message}` },
      { status: 400 },
    )
  }
}
