/**
 * Sprint 008D — Breach subject notification workflow (GDPR Art. 34).
 *
 * POST /api/breach/:id/notify-subjects
 *   body: { method, sentAtISO?, contentDocumented? }
 *      sau { skipReason } daca user-ul documenteaza NEnecesitatea
 *   - method: email | letter | public_communication | other (NU not_yet)
 *   - sau skipReason non-empty
 *   - auto-close cand ANSPDCP deja done
 */
import { NextResponse } from "next/server"

import { getOrgContext } from "@/lib/server/org-context"
import {
  isBreachSubjectMethod,
  markSubjectNotificationSkipped,
  markSubjectsNotified,
} from "@/lib/server/breach-store"
import type { ComplianceEventActorInput } from "@/lib/compliance/events"
import type { BreachSubjectNotificationMethod } from "@/lib/compliance/types"

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

    // Skip flow — user-ul documenteaza ca notificarea persoanelor NU e necesara
    if (typeof body.skipReason === "string" && body.skipReason.trim().length > 0) {
      const updated = await markSubjectNotificationSkipped(
        ctx.orgId,
        id,
        body.skipReason,
        actorFromContext(ctx),
      )
      if (!updated) {
        return NextResponse.json({ error: "Breach inexistent." }, { status: 404 })
      }
      return NextResponse.json({ record: updated })
    }

    // Notified flow — method obligatoriu (non-not_yet)
    const method = body.method
    if (!isBreachSubjectMethod(method) || method === "not_yet") {
      return NextResponse.json(
        { error: "Metoda de notificare invalida (email/letter/public_communication/other)." },
        { status: 400 },
      )
    }
    const sentAtISO = typeof body.sentAtISO === "string" ? body.sentAtISO : undefined
    const contentDocumented =
      typeof body.contentDocumented === "boolean" ? body.contentDocumented : true

    const updated = await markSubjectsNotified(
      ctx.orgId,
      id,
      {
        method: method as BreachSubjectNotificationMethod,
        sentAtISO,
        contentDocumented,
      },
      actorFromContext(ctx),
    )
    if (!updated) {
      return NextResponse.json({ error: "Breach inexistent." }, { status: 404 })
    }
    return NextResponse.json({ record: updated })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Nu am putut inregistra notificarea." },
      { status: 400 },
    )
  }
}
