/**
 * Sprint 020 — POST /api/ai-incidents/:id/root-cause
 *
 * Înregistrează investigația cauză rădăcină Art. 73(4). Tranziționează status
 * spre "root_cause_investigation" dacă status era draft/assessing/
 * notification_required/authority_notified.
 */
import { NextResponse } from "next/server"

import { getOrgContext } from "@/lib/server/org-context"
import {
  recordRootCause,
  type RecordRootCauseInput,
} from "@/lib/server/ai-incident-store"
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

function sanitizeList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return (value as unknown[])
    .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
    .map((s) => s.trim())
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await getOrgContext()
    const { id } = await params
    const body = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >

    const rootCauseDescription =
      typeof body.rootCauseDescription === "string"
        ? body.rootCauseDescription.trim()
        : ""
    if (rootCauseDescription.length < 10) {
      return NextResponse.json(
        {
          error:
            "rootCauseDescription este obligatorie (minim 10 caractere).",
        },
        { status: 400 },
      )
    }

    const input: RecordRootCauseInput = {
      rootCauseDescription,
      contributingFactors: sanitizeList(body.contributingFactors),
      evidenceCollected: sanitizeList(body.evidenceCollected),
      remediationActions: sanitizeList(body.remediationActions),
      preventionActions: sanitizeList(body.preventionActions),
      preventiveMeasuresImplementedAtISO:
        typeof body.preventiveMeasuresImplementedAtISO === "string"
          ? body.preventiveMeasuresImplementedAtISO
          : undefined,
      identifiedAtISO:
        typeof body.identifiedAtISO === "string"
          ? body.identifiedAtISO
          : undefined,
      identifiedByEmail:
        typeof body.identifiedByEmail === "string"
          ? body.identifiedByEmail
          : undefined,
    }

    const updated = await recordRootCause(
      ctx.orgId,
      id,
      input,
      actorFromContext(ctx),
      ctx.orgName ?? "Organizația",
    )
    if (!updated) {
      return NextResponse.json(
        { error: "Incident AI inexistent." },
        { status: 404 },
      )
    }
    return NextResponse.json({ record: updated })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Eroare necunoscută"
    return NextResponse.json(
      { error: `Nu am putut înregistra root cause: ${message}` },
      { status: 500 },
    )
  }
}
