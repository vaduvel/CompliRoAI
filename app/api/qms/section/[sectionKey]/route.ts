/**
 * Sprint 021 — QMS section CRUD.
 *
 * GET   /api/qms/section/[sectionKey]   → { section, schemaSection }
 * PATCH /api/qms/section/[sectionKey]   → updateQmsSection (re-evaluates +
 *                                          emits findings; auto-stamps
 *                                          approvedAtISO la status=approved)
 */
import { NextResponse } from "next/server"

import { getQmsSchemaSection } from "@/lib/compliance/qms-schema"
import { getOrgContext } from "@/lib/server/org-context"
import {
  isQmsSectionKey,
  isQmsSectionStatus,
  readQmsWorkspace,
  updateQmsSection,
  type UpdateQmsSectionPatch,
} from "@/lib/server/qms-store"
import type { ComplianceEventActorInput } from "@/lib/compliance/events"
import type { QmsSectionKey } from "@/lib/compliance/types"

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
  context: { params: Promise<{ sectionKey: string }> },
) {
  try {
    const { sectionKey } = await context.params
    if (!isQmsSectionKey(sectionKey)) {
      return NextResponse.json(
        { error: "Section key invalid (Art. 17(1)(a)-(m))." },
        { status: 400 },
      )
    }
    const ctx = await getOrgContext()
    const { workspace } = await readQmsWorkspace(ctx.orgId)
    if (!workspace) {
      return NextResponse.json(
        { error: "QMS nu a fost inițializat. POST /api/qms întâi." },
        { status: 404 },
      )
    }
    const section = workspace.sections.find((s) => s.key === sectionKey)
    if (!section) {
      return NextResponse.json({ error: "Section not found." }, { status: 404 })
    }
    return NextResponse.json({
      section,
      schemaSection: getQmsSchemaSection(sectionKey),
    })
  } catch {
    return NextResponse.json(
      { error: "Nu am putut citi secțiunea QMS." },
      { status: 500 },
    )
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ sectionKey: string }> },
) {
  try {
    const { sectionKey } = await context.params
    if (!isQmsSectionKey(sectionKey)) {
      return NextResponse.json(
        { error: "Section key invalid (Art. 17(1)(a)-(m))." },
        { status: 400 },
      )
    }
    const body = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >
    const patch: UpdateQmsSectionPatch = {}
    if (body.status !== undefined) {
      if (!isQmsSectionStatus(body.status)) {
        return NextResponse.json(
          {
            error:
              "status invalid (not_started/in_progress/documented/approved/needs_update).",
          },
          { status: 400 },
        )
      }
      patch.status = body.status
    }
    if (typeof body.description === "string") patch.description = body.description
    if (typeof body.procedureSummary === "string")
      patch.procedureSummary = body.procedureSummary
    if (typeof body.responsibleRole === "string")
      patch.responsibleRole = body.responsibleRole
    if (typeof body.responsibleEmail === "string")
      patch.responsibleEmail = body.responsibleEmail
    if (typeof body.notes === "string") patch.notes = body.notes

    const ctx = await getOrgContext()
    const workspace = await updateQmsSection(
      ctx.orgId,
      sectionKey as QmsSectionKey,
      patch,
      actorFromContext(ctx),
      ctx.orgName ?? "Organizația",
    )
    return NextResponse.json({ workspace })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Eroare necunoscută"
    return NextResponse.json(
      { error: `Nu am putut actualiza secțiunea: ${message}` },
      { status: 400 },
    )
  }
}
