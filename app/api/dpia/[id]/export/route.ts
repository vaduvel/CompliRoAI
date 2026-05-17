/**
 * Sprint 008C — DPIA markdown export.
 *
 * GET /api/dpia/:id/export   -> text/markdown
 *
 * Emite event dpia.exported in ledger. Filename: dpia-<slug>-<date>.md.
 */
import { NextResponse } from "next/server"

import { getOrgContext } from "@/lib/server/org-context"
import {
  buildDpiaMarkdownForRecord,
  getDpiaRecordById,
  markDpiaExported,
} from "@/lib/server/dpia-store"
import type { ComplianceEventActorInput } from "@/lib/compliance/events"

export const runtime = "nodejs"

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

function slug(value: string) {
  return (
    value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "dpia"
  )
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await getOrgContext()
    const { id } = await params
    const record = await getDpiaRecordById(ctx.orgId, id)
    if (!record) {
      return NextResponse.json({ error: "DPIA inexistentă." }, { status: 404 })
    }

    const markdown = buildDpiaMarkdownForRecord(record, ctx.orgName ?? "")
    // mark exported (best-effort)
    await markDpiaExported(ctx.orgId, id, actorFromContext(ctx))

    const fileStem = `dpia-${slug(ctx.orgName ?? "org")}-${slug(record.title)}-${new Date()
      .toISOString()
      .slice(0, 10)}`

    return new NextResponse(markdown, {
      status: 200,
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileStem}.md"`,
        "Cache-Control": "no-store",
      },
    })
  } catch {
    return NextResponse.json(
      { error: "Nu am putut exporta DPIA." },
      { status: 500 },
    )
  }
}
