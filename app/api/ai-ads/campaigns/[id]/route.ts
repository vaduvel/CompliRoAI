/**
 * Sprint 024 — AI Ads campaign per-id GET / PATCH / DELETE.
 */
import { NextResponse } from "next/server"

import {
  deleteCampaign,
  getCampaignById,
  isCampaignPlatform,
  isCampaignStatus,
  isCampaignType,
  updateCampaign,
  type UpdateCampaignPatch,
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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await getOrgContext()
    const { id } = await params
    const campaign = await getCampaignById(ctx.orgId, id)
    if (!campaign) {
      return NextResponse.json({ error: "Campanie inexistentă." }, { status: 404 })
    }
    return NextResponse.json({ campaign })
  } catch {
    return NextResponse.json(
      { error: "Nu am putut citi campania." },
      { status: 500 },
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await getOrgContext()
    const { id } = await params
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>

    const patch: UpdateCampaignPatch = {}
    if (typeof body.title === "string") patch.title = body.title.trim()
    if (typeof body.brandName === "string") patch.brandName = body.brandName.trim()
    if (typeof body.platform === "string" && isCampaignPlatform(body.platform)) {
      patch.platform = body.platform
    }
    if (typeof body.campaignType === "string" && isCampaignType(body.campaignType)) {
      patch.campaignType = body.campaignType
    }
    if (typeof body.status === "string" && isCampaignStatus(body.status)) {
      patch.status = body.status
    }
    if (typeof body.linkedVendorId === "string") {
      patch.linkedVendorId = body.linkedVendorId.trim() || undefined
    }
    if (Array.isArray(body.linkedAssetIds)) {
      patch.linkedAssetIds = (body.linkedAssetIds as unknown[]).filter(
        (s): s is string => typeof s === "string",
      )
    }
    if (typeof body.startDateISO === "string") patch.startDateISO = body.startDateISO
    if (typeof body.endDateISO === "string") patch.endDateISO = body.endDateISO
    if (typeof body.budgetEUR === "number") patch.budgetEUR = body.budgetEUR
    if (typeof body.targetAudienceDescription === "string") {
      patch.targetAudienceDescription = body.targetAudienceDescription
    }
    if (typeof body.targetsVulnerableCategories === "boolean") {
      patch.targetsVulnerableCategories = body.targetsVulnerableCategories
    }
    if (typeof body.platformTermsReviewed === "boolean") {
      patch.platformTermsReviewed = body.platformTermsReviewed
    }
    if (typeof body.platformTermsReviewedByEmail === "string") {
      patch.platformTermsReviewedByEmail = body.platformTermsReviewedByEmail
    }
    if (typeof body.platformTermsReviewedAtISO === "string") {
      patch.platformTermsReviewedAtISO = body.platformTermsReviewedAtISO
    }
    if (typeof body.notes === "string") patch.notes = body.notes

    const updated = await updateCampaign(ctx.orgId, id, patch, actorFromContext(ctx))
    if (!updated) {
      return NextResponse.json({ error: "Campanie inexistentă." }, { status: 404 })
    }
    return NextResponse.json({ campaign: updated })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Eroare necunoscută"
    return NextResponse.json(
      { error: `Nu am putut actualiza campania: ${message}` },
      { status: 500 },
    )
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await getOrgContext()
    const { id } = await params
    const removed = await deleteCampaign(ctx.orgId, id, actorFromContext(ctx))
    if (!removed) {
      return NextResponse.json({ error: "Campanie inexistentă." }, { status: 404 })
    }
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json(
      { error: "Nu am putut șterge campania." },
      { status: 500 },
    )
  }
}
