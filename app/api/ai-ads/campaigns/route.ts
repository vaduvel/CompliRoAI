/**
 * Sprint 024 — AI Ads campaign list + create.
 *
 * GET  /api/ai-ads/campaigns?status=active&platform=meta_ai_ads
 *   Response: { campaigns, claims, approvals, trackingReviews, summary, schema }
 *
 * POST /api/ai-ads/campaigns
 *   Body: CreateCampaignInput
 *   Effects: persistă campanie + rulează evaluator + emite findings.
 */
import { NextResponse } from "next/server"

import {
  createCampaign,
  isCampaignPlatform,
  isCampaignStatus,
  isCampaignType,
  listCampaigns,
  type CreateCampaignInput,
} from "@/lib/server/ai-ads-store"
import { getOrgContext } from "@/lib/server/org-context"
import type { ComplianceEventActorInput } from "@/lib/compliance/events"
import type {
  AIAdsCampaignPlatform,
  AIAdsCampaignStatus,
  AIAdsCampaignType,
} from "@/lib/compliance/types"

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
    const statusParam = url.searchParams.get("status")
    const platformParam = url.searchParams.get("platform")

    const filters: { status?: AIAdsCampaignStatus; platform?: AIAdsCampaignPlatform } = {}
    if (statusParam && isCampaignStatus(statusParam)) filters.status = statusParam
    if (platformParam && isCampaignPlatform(platformParam)) filters.platform = platformParam

    const data = await listCampaigns(ctx.orgId, filters)
    return NextResponse.json({
      ...data,
      schema: {
        version: "v1",
        platforms: [
          "chatgpt_ads",
          "meta_ai_ads",
          "google_ai_ads",
          "perplexity_sponsored",
          "anthropic_claude",
          "llm_recommendation_native",
          "ai_generated_creative_meta",
          "ai_generated_creative_google",
          "ai_generated_creative_linkedin",
          "other",
        ],
        statuses: [
          "draft",
          "in_review",
          "approved",
          "active",
          "paused",
          "completed",
          "rejected",
        ],
        campaignTypes: [
          "paid_placement",
          "llm_recommendation",
          "ai_generated_creative",
          "ai_landing_page",
          "hybrid",
        ],
      },
    })
  } catch {
    return NextResponse.json(
      { error: "Nu am putut citi registrul de campanii AI Ads." },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getOrgContext()
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>

    const title = typeof body.title === "string" ? body.title.trim() : ""
    const brandName = typeof body.brandName === "string" ? body.brandName.trim() : ""
    if (!title) {
      return NextResponse.json({ error: "Titlul campaniei este obligatoriu." }, { status: 400 })
    }
    if (!brandName) {
      return NextResponse.json({ error: "Brand name este obligatoriu." }, { status: 400 })
    }
    if (!isCampaignPlatform(body.platform)) {
      return NextResponse.json({ error: "platform invalid." }, { status: 400 })
    }
    if (!isCampaignType(body.campaignType)) {
      return NextResponse.json({ error: "campaignType invalid." }, { status: 400 })
    }

    const input: CreateCampaignInput = {
      title,
      brandName,
      platform: body.platform as AIAdsCampaignPlatform,
      campaignType: body.campaignType as AIAdsCampaignType,
      status:
        typeof body.status === "string" && isCampaignStatus(body.status)
          ? body.status
          : "draft",
      linkedVendorId:
        typeof body.linkedVendorId === "string" ? body.linkedVendorId : undefined,
      linkedAssetIds: Array.isArray(body.linkedAssetIds)
        ? (body.linkedAssetIds as unknown[]).filter(
            (s): s is string => typeof s === "string",
          )
        : [],
      startDateISO:
        typeof body.startDateISO === "string" ? body.startDateISO : undefined,
      endDateISO: typeof body.endDateISO === "string" ? body.endDateISO : undefined,
      budgetEUR:
        typeof body.budgetEUR === "number" && Number.isFinite(body.budgetEUR)
          ? body.budgetEUR
          : undefined,
      targetAudienceDescription:
        typeof body.targetAudienceDescription === "string"
          ? body.targetAudienceDescription
          : undefined,
      targetsVulnerableCategories: Boolean(body.targetsVulnerableCategories),
      platformTermsReviewed: Boolean(body.platformTermsReviewed),
      platformTermsReviewedByEmail:
        typeof body.platformTermsReviewedByEmail === "string"
          ? body.platformTermsReviewedByEmail
          : undefined,
      platformTermsReviewedAtISO:
        typeof body.platformTermsReviewedAtISO === "string"
          ? body.platformTermsReviewedAtISO
          : undefined,
      notes: typeof body.notes === "string" ? body.notes : undefined,
    }

    const campaign = await createCampaign(ctx.orgId, input, actorFromContext(ctx))
    return NextResponse.json({ campaign }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Eroare necunoscută"
    return NextResponse.json(
      { error: `Nu am putut crea campania: ${message}` },
      { status: 500 },
    )
  }
}
