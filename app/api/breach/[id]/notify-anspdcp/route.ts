/**
 * Sprint 008D — Breach ANSPDCP notification workflow (GDPR Art. 33).
 *
 * POST /api/breach/:id/notify-anspdcp
 *   body: { referenceNumber, submittedAtISO?, delayJustification?, status? }
 *   - cere referenceNumber non-empty
 *   - daca submittedAt > deadline (72h), delayJustification e obligatoriu
 *   - tranzitie status: anspdcp_notified → subjects_required (highRisk) sau closed
 *   - attach evidence pe finding-ul linked + resolve daca breach ajunge closed
 */
import { NextResponse } from "next/server"

import { getOrgContext } from "@/lib/server/org-context"
import { markAnspdcpNotified } from "@/lib/server/breach-store"
import type { ComplianceEventActorInput } from "@/lib/compliance/events"
import type { AnspdcpNotificationStatus } from "@/lib/compliance/types"

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

const VALID_STATUS: AnspdcpNotificationStatus[] = ["draft", "submitted", "acknowledged"]

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await getOrgContext()
    const { id } = await params
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>

    const referenceNumber = typeof body.referenceNumber === "string" ? body.referenceNumber.trim() : ""
    if (!referenceNumber) {
      return NextResponse.json(
        { error: "Numarul de inregistrare ANSPDCP e obligatoriu." },
        { status: 400 },
      )
    }
    const submittedAtISO =
      typeof body.submittedAtISO === "string" ? body.submittedAtISO : undefined
    const delayJustification =
      typeof body.delayJustification === "string" ? body.delayJustification : undefined
    const status =
      typeof body.status === "string" && VALID_STATUS.includes(body.status as AnspdcpNotificationStatus)
        ? (body.status as AnspdcpNotificationStatus)
        : undefined

    const updated = await markAnspdcpNotified(
      ctx.orgId,
      id,
      { referenceNumber, submittedAtISO, delayJustification, status },
      actorFromContext(ctx),
    )
    if (!updated) {
      return NextResponse.json({ error: "Breach inexistent." }, { status: 404 })
    }
    return NextResponse.json({ record: updated })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Nu am putut marca notificarea ANSPDCP." },
      { status: 400 },
    )
  }
}
