/**
 * Sprint 024 — Conversion tracking review GET + upsert.
 *
 * GET  /api/ai-ads/tracking-review?campaignId=aac-x
 *   Returns the tracking review for the given campaign (or null).
 *
 * POST /api/ai-ads/tracking-review
 *   Body: { campaignId, methods, consentRequired, ... }
 *   Upsert pattern via attachConversionTrackingReview.
 */
import { NextResponse } from "next/server"

import {
  attachConversionTrackingReview,
  getCampaignById,
  getTrackingReviewById,
  isTrackingMethod,
  isTransferMechanism,
  type AttachTrackingReviewInput,
} from "@/lib/server/ai-ads-store"
import { getOrgContext } from "@/lib/server/org-context"
import { readState } from "@/lib/server/store"
import type { ComplianceEventActorInput } from "@/lib/compliance/events"
import type { ConversionTrackingMethod } from "@/lib/compliance/types"

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

export async function GET(request: Request) {
  try {
    const ctx = await getOrgContext()
    const url = new URL(request.url)
    const campaignId = url.searchParams.get("campaignId")
    const reviewId = url.searchParams.get("reviewId")

    if (reviewId) {
      const review = await getTrackingReviewById(ctx.orgId, reviewId)
      if (!review) {
        return NextResponse.json({ error: "Review inexistent." }, { status: 404 })
      }
      return NextResponse.json({ review })
    }
    if (!campaignId) {
      // Return all reviews
      const state = await readState()
      return NextResponse.json({ reviews: state.conversionTrackingReviews ?? [] })
    }
    const campaign = await getCampaignById(ctx.orgId, campaignId)
    if (!campaign) {
      return NextResponse.json({ error: "Campanie inexistentă." }, { status: 404 })
    }
    let review = null
    if (campaign.conversionTrackingReviewId) {
      review = await getTrackingReviewById(ctx.orgId, campaign.conversionTrackingReviewId)
    }
    return NextResponse.json({ review })
  } catch {
    return NextResponse.json(
      { error: "Nu am putut citi tracking review-ul." },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getOrgContext()
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const campaignId = typeof body.campaignId === "string" ? body.campaignId : ""
    if (!campaignId) {
      return NextResponse.json({ error: "campaignId obligatoriu." }, { status: 400 })
    }
    if (!Array.isArray(body.methods)) {
      return NextResponse.json({ error: "methods (array) obligatoriu." }, { status: 400 })
    }
    const methods = (body.methods as unknown[]).filter(isTrackingMethod) as ConversionTrackingMethod[]
    if (methods.length === 0) {
      return NextResponse.json({ error: "Cel puțin un method valid obligatoriu." }, { status: 400 })
    }

    const input: AttachTrackingReviewInput = {
      methods,
      consentRequired: Boolean(body.consentRequired),
      consentRecordedHow:
        typeof body.consentRecordedHow === "string" ? body.consentRecordedHow : "",
      cookieList: Array.isArray(body.cookieList)
        ? (body.cookieList as unknown[]).filter((s): s is string => typeof s === "string")
        : [],
      pixelList: Array.isArray(body.pixelList)
        ? (body.pixelList as unknown[]).filter((s): s is string => typeof s === "string")
        : [],
      crmUploadUsed: Boolean(body.crmUploadUsed),
      crmDataCategoriesUploaded: Array.isArray(body.crmDataCategoriesUploaded)
        ? (body.crmDataCategoriesUploaded as unknown[]).filter(
            (s): s is string => typeof s === "string",
          )
        : [],
      audienceMatchingPlatform:
        typeof body.audienceMatchingPlatform === "string"
          ? body.audienceMatchingPlatform
          : undefined,
      thirdCountryTransfer: Boolean(body.thirdCountryTransfer),
      transferMechanism:
        typeof body.transferMechanism === "string" && isTransferMechanism(body.transferMechanism)
          ? body.transferMechanism
          : undefined,
      reviewedByEmail:
        typeof body.reviewedByEmail === "string" ? body.reviewedByEmail : undefined,
      reviewNotes: typeof body.reviewNotes === "string" ? body.reviewNotes : undefined,
    }

    const review = await attachConversionTrackingReview(
      ctx.orgId,
      campaignId,
      input,
      actorFromContext(ctx),
    )
    return NextResponse.json({ review }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Eroare necunoscută"
    const isNotFound = message.toLowerCase().includes("not found")
    return NextResponse.json(
      { error: `Nu am putut salva tracking review-ul: ${message}` },
      { status: isNotFound ? 404 : 500 },
    )
  }
}
