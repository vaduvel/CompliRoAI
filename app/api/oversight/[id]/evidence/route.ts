/**
 * Sprint 017 — POST /api/oversight/:id/evidence
 *
 * Body: { type, description, url?, fileName? }
 *
 * Adaugă un OversightEvidenceItem în lista de evidence + emite event
 * oversight.evidence_attached.
 */
import { NextResponse } from "next/server"

import { getOrgContext } from "@/lib/server/org-context"
import { attachEvidence } from "@/lib/server/oversight-store"
import type { ComplianceEventActorInput } from "@/lib/compliance/events"
import type { OversightEvidenceItem } from "@/lib/compliance/types"

const EVIDENCE_TYPES: OversightEvidenceItem["type"][] = [
  "log",
  "screenshot",
  "video",
  "audit_report",
  "training_record",
  "test_report",
  "other",
]

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

    const type = body.type
    if (
      typeof type !== "string" ||
      !EVIDENCE_TYPES.includes(type as OversightEvidenceItem["type"])
    ) {
      return NextResponse.json(
        { error: "Tipul dovezii este invalid." },
        { status: 400 },
      )
    }
    const description = typeof body.description === "string" ? body.description.trim() : ""
    if (description.length < 3) {
      return NextResponse.json(
        { error: "Descrierea dovezii este obligatorie (min 3 caractere)." },
        { status: 400 },
      )
    }

    const updated = await attachEvidence(
      ctx.orgId,
      id,
      {
        type: type as OversightEvidenceItem["type"],
        description,
        url: typeof body.url === "string" ? body.url : undefined,
        fileName: typeof body.fileName === "string" ? body.fileName : undefined,
      },
      actorFromContext(ctx),
    )
    if (!updated) {
      return NextResponse.json({ error: "Protocol inexistent." }, { status: 404 })
    }
    return NextResponse.json({ record: updated })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Eroare necunoscută"
    return NextResponse.json(
      { error: `Nu am putut atașa dovada: ${message}` },
      { status: 500 },
    )
  }
}
