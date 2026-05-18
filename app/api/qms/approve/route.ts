/**
 * Sprint 021 — QMS approve workflow.
 *
 * POST /api/qms/approve
 *   body: { approvedByEmail, nextReviewMonths? = 12 }
 */
import { NextResponse } from "next/server"

import { getOrgContext } from "@/lib/server/org-context"
import { approveQms } from "@/lib/server/qms-store"
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

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >
    const approvedByEmail =
      typeof body.approvedByEmail === "string"
        ? body.approvedByEmail.trim()
        : ""
    if (!approvedByEmail) {
      return NextResponse.json(
        { error: "approvedByEmail obligatoriu." },
        { status: 400 },
      )
    }
    const nextReviewMonths =
      typeof body.nextReviewMonths === "number" &&
      Number.isFinite(body.nextReviewMonths) &&
      body.nextReviewMonths > 0
        ? body.nextReviewMonths
        : 12
    const ctx = await getOrgContext()
    const workspace = await approveQms(
      ctx.orgId,
      approvedByEmail,
      actorFromContext(ctx),
      nextReviewMonths,
      ctx.orgName ?? "Organizația",
    )
    return NextResponse.json({ workspace })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Eroare necunoscută"
    return NextResponse.json(
      { error: `Nu am putut aproba QMS: ${message}` },
      { status: 400 },
    )
  }
}
