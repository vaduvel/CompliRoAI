/**
 * Sprint 008B — Attach evidence to a finding.
 *
 * POST /api/findings/[id]/evidence
 *   body: { note: string, url?: string, fileName?: string }
 *
 * Adauga in operationalEvidenceNote (timestamped) si, daca exista URL/fileName,
 * creeaza un `ClientPortalDocument` legat de finding. Emite ledger event
 * `finding.evidence_attached`.
 */
import { NextResponse } from "next/server"

import { getOrgContext } from "@/lib/server/org-context"
import { attachEvidence } from "@/lib/server/findings-store"
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

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await getOrgContext()
    const { id } = await params
    const body = await request.json().catch(() => ({}))

    const note = typeof body.note === "string" ? body.note.trim() : ""
    if (!note) {
      return NextResponse.json(
        { error: "Nota dovada este obligatorie." },
        { status: 400 },
      )
    }

    const url =
      typeof body.url === "string" && body.url.trim() ? body.url.trim() : undefined
    const fileName =
      typeof body.fileName === "string" && body.fileName.trim()
        ? body.fileName.trim()
        : undefined

    if (url) {
      try {
        // eslint-disable-next-line no-new
        new URL(url)
      } catch {
        return NextResponse.json(
          { error: "URL invalid." },
          { status: 400 },
        )
      }
    }

    const updated = await attachEvidence(
      ctx.orgId,
      id,
      { note, url, fileName },
      actorFromContext(ctx),
    )
    if (!updated) {
      return NextResponse.json(
        { error: "Risc-ul nu a fost gasit." },
        { status: 404 },
      )
    }
    return NextResponse.json({ finding: updated })
  } catch {
    return NextResponse.json(
      { error: "Nu am putut atasa dovada." },
      { status: 500 },
    )
  }
}
