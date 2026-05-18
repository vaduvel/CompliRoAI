/**
 * Sprint 024 — Record creative approval pe campanie.
 *
 * POST /api/ai-ads/campaigns/[id]/approve
 *   Body: { creativeDescription, creativeAssetId?, approvedByEmail,
 *           prohibitedContentChecked?, art5Check?, consumerLawCheck?,
 *           ipRightsCheck?, comment? }
 *   Effects: append în state.aiAdsCreativeApprovals + actualizează
 *   campaign.approvalIds + re-evaluează gap-uri.
 */
import { NextResponse } from "next/server"

import {
  recordCreativeApproval,
  type RecordApprovalInput,
} from "@/lib/server/ai-ads-store"
import { getOrgContext } from "@/lib/server/org-context"
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
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>

    const creativeDescription =
      typeof body.creativeDescription === "string"
        ? body.creativeDescription.trim()
        : ""
    const approvedByEmail =
      typeof body.approvedByEmail === "string" ? body.approvedByEmail.trim() : ""

    if (!creativeDescription) {
      return NextResponse.json(
        { error: "creativeDescription este obligatoriu." },
        { status: 400 },
      )
    }
    if (!approvedByEmail || !approvedByEmail.includes("@")) {
      return NextResponse.json(
        { error: "approvedByEmail valid este obligatoriu." },
        { status: 400 },
      )
    }

    const input: RecordApprovalInput = {
      creativeDescription,
      approvedByEmail,
      creativeAssetId:
        typeof body.creativeAssetId === "string" ? body.creativeAssetId : undefined,
      comment: typeof body.comment === "string" ? body.comment : undefined,
      prohibitedContentChecked: Boolean(body.prohibitedContentChecked),
      prohibitedContentNotes:
        typeof body.prohibitedContentNotes === "string"
          ? body.prohibitedContentNotes
          : undefined,
      art5Check: Boolean(body.art5Check),
      consumerLawCheck: Boolean(body.consumerLawCheck),
      ipRightsCheck: Boolean(body.ipRightsCheck),
    }

    const approval = await recordCreativeApproval(
      ctx.orgId,
      id,
      input,
      actorFromContext(ctx),
    )
    return NextResponse.json({ approval }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Eroare necunoscută"
    const isNotFound = message.toLowerCase().includes("not found")
    return NextResponse.json(
      { error: `Nu am putut înregistra aprobarea: ${message}` },
      { status: isNotFound ? 404 : 500 },
    )
  }
}
