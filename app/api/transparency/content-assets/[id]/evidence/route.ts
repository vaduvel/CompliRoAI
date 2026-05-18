/**
 * Sprint 023.7 — POST /api/transparency/content-assets/[id]/evidence
 *
 * Body: { type, description, url?, fileName?, fileHash? }
 *
 * Attach evidence item (screenshot, sample file, metadata proof, editorial
 * log, watermark test) la un asset Art. 50. Emite event
 * content_asset.evidence_attached.
 */
import { NextResponse } from "next/server"

import { getOrgContext } from "@/lib/server/org-context"
import {
  attachContentEvidence,
  isContentEvidenceType,
} from "@/lib/server/transparency-content-store"
import type { ComplianceEventActorInput } from "@/lib/compliance/events"
import type { AIContentEvidenceType } from "@/lib/compliance/types"

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

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await getOrgContext()
    const { id } = await params
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>

    if (!isContentEvidenceType(body.type)) {
      return NextResponse.json(
        { error: "Tipul evidenței este invalid (screenshot/sample_file/metadata_proof/editorial_log/watermark_test/other)." },
        { status: 400 },
      )
    }
    const description = typeof body.description === "string" ? body.description.trim() : ""
    if (description.length < 3) {
      return NextResponse.json(
        { error: "Descrierea evidenței este obligatorie (min 3 caractere)." },
        { status: 400 },
      )
    }

    const updated = await attachContentEvidence(
      ctx.orgId,
      id,
      {
        type: body.type as AIContentEvidenceType,
        description,
        url: typeof body.url === "string" ? body.url : undefined,
        fileName: typeof body.fileName === "string" ? body.fileName : undefined,
        fileHash: typeof body.fileHash === "string" ? body.fileHash : undefined,
      },
      actorFromContext(ctx),
    )
    if (!updated) {
      return NextResponse.json({ error: "Asset inexistent." }, { status: 404 })
    }
    return NextResponse.json({ asset: updated })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Eroare necunoscută"
    return NextResponse.json(
      { error: `Nu am putut atașa evidența: ${message}` },
      { status: 500 },
    )
  }
}
