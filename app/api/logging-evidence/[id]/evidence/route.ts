/**
 * Sprint 018 — POST /api/logging-evidence/:id/evidence
 *
 * Body: {
 *   type, description, url?, fileName?, fileHash?,
 *   coversPeriodStartISO?, coversPeriodEndISO?, eventCount?
 * }
 *
 * Adaugă un LogEvidenceItem + setează lastEvidenceAtISO + recalculează
 * retentionStatus + emite event logging.evidence_attached.
 */
import { NextResponse } from "next/server"

import { getOrgContext } from "@/lib/server/org-context"
import { attachLogEvidence } from "@/lib/server/logging-evidence-store"
import type { ComplianceEventActorInput } from "@/lib/compliance/events"
import type { LogEvidenceItem } from "@/lib/compliance/types"

const EVIDENCE_TYPES: LogEvidenceItem["type"][] = [
  "log_export",
  "siem_screenshot",
  "audit_report",
  "retention_proof",
  "integrity_proof",
  "access_log",
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
      !EVIDENCE_TYPES.includes(type as LogEvidenceItem["type"])
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

    const updated = await attachLogEvidence(
      ctx.orgId,
      id,
      {
        type: type as LogEvidenceItem["type"],
        description,
        url: typeof body.url === "string" ? body.url : undefined,
        fileName: typeof body.fileName === "string" ? body.fileName : undefined,
        fileHash: typeof body.fileHash === "string" ? body.fileHash : undefined,
        coversPeriodStartISO:
          typeof body.coversPeriodStartISO === "string"
            ? body.coversPeriodStartISO
            : undefined,
        coversPeriodEndISO:
          typeof body.coversPeriodEndISO === "string"
            ? body.coversPeriodEndISO
            : undefined,
        eventCount:
          typeof body.eventCount === "number" && body.eventCount >= 0
            ? body.eventCount
            : undefined,
      },
      actorFromContext(ctx),
    )
    if (!updated) {
      return NextResponse.json(
        { error: "Configurare logging inexistentă." },
        { status: 404 },
      )
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
