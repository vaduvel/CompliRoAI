/**
 * Sprint 020 — POST /api/ai-incidents/:id/notify-authority
 *
 * Înregistrează o notificare către autoritatea de supraveghere (Art. 73(1)).
 * Tranziționează status spre "authority_notified" dacă status = submitted /
 * acknowledged.
 */
import { NextResponse } from "next/server"

import { getOrgContext } from "@/lib/server/org-context"
import {
  isNotificationStatus,
  markAuthorityNotified,
  type MarkAuthorityNotifiedInput,
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

    const authorityName =
      typeof body.authorityName === "string" ? body.authorityName.trim() : ""
    if (!authorityName) {
      return NextResponse.json(
        { error: "authorityName este obligatoriu." },
        { status: 400 },
      )
    }

    const input: MarkAuthorityNotifiedInput = {
      authorityName,
      status: isNotificationStatus(body.status) ? body.status : "submitted",
      submittedAtISO:
        typeof body.submittedAtISO === "string"
          ? body.submittedAtISO
          : undefined,
      referenceNumber:
        typeof body.referenceNumber === "string"
          ? body.referenceNumber
          : undefined,
      acknowledgmentReceivedAtISO:
        typeof body.acknowledgmentReceivedAtISO === "string"
          ? body.acknowledgmentReceivedAtISO
          : undefined,
      additionalInfoRequestedAtISO:
        typeof body.additionalInfoRequestedAtISO === "string"
          ? body.additionalInfoRequestedAtISO
          : undefined,
      contactPersonEmail:
        typeof body.contactPersonEmail === "string"
          ? body.contactPersonEmail
          : undefined,
      notes: typeof body.notes === "string" ? body.notes : undefined,
    }

    const updated = await markAuthorityNotified(
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
      { error: `Nu am putut înregistra notificarea: ${message}` },
      { status: 500 },
    )
  }
}
