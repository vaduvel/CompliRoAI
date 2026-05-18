/**
 * Sprint 023.7 — Art. 50 Content Asset list + create.
 *
 * GET  /api/transparency/content-assets
 *   Filters: ?assetType=deepfake&hasGap=true&linkedAISystemId=sys-1
 *   Response: { assets (annotated), summary, schema }
 *
 * POST /api/transparency/content-assets
 *   Body: CreateContentAssetInput
 *   Effects: persistă asset + rulează evaluator + emite findings (CRITICAL
 *   pentru deepfake fără disclosure; HIGH pentru rest).
 */
import { NextResponse } from "next/server"

import { getOrgContext } from "@/lib/server/org-context"
import {
  createContentAsset,
  isAssetType,
  isContentLabelingStandard,
  listContentAssets,
  summarizeContentAssets,
  type CreateContentAssetInput,
} from "@/lib/server/transparency-content-store"
import type { ComplianceEventActorInput } from "@/lib/compliance/events"
import type {
  AIContentAssetType,
  TransparencyLanguage,
  TransparencyPlacement,
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

const PLACEMENT_VALUES: TransparencyPlacement[] = [
  "popup",
  "footer",
  "header",
  "email-signature",
  "video-overlay",
  "inline",
  "advertisement",
  "social-post",
  "broadcast",
]

const LANGUAGE_VALUES: TransparencyLanguage[] = ["ro", "en"]

export async function GET(request: Request) {
  try {
    const ctx = await getOrgContext()
    const { assets, summary } = await listContentAssets(ctx.orgId)

    const url = new URL(request.url)
    const filterType = url.searchParams.get("assetType")
    const filterHasGap = url.searchParams.get("hasGap")
    const filterSystem = url.searchParams.get("linkedAISystemId")

    let filtered = assets
    if (filterType && isAssetType(filterType)) {
      filtered = filtered.filter((a) => a.assetType === filterType)
    }
    if (filterHasGap === "true") {
      filtered = filtered.filter((a) => a.hasAnyGap)
    } else if (filterHasGap === "false") {
      filtered = filtered.filter((a) => !a.hasAnyGap)
    }
    if (filterSystem) {
      filtered = filtered.filter((a) => a.linkedAISystemId === filterSystem)
    }

    return NextResponse.json({
      assets: filtered,
      summary,
      schema: {
        version: "v1",
        assetTypes: [
          "image",
          "video",
          "audio",
          "text_synthetic",
          "deepfake",
          "public_interest_text",
          "chatbot_interaction",
          "other",
        ],
        standards: [
          "c2pa",
          "iptc_photo_metadata",
          "watermark_visible",
          "watermark_invisible",
          "metadata_only",
          "none",
        ],
        placements: PLACEMENT_VALUES,
        languages: LANGUAGE_VALUES,
      },
    })
  } catch {
    return NextResponse.json(
      { error: "Nu am putut citi registrul de content assets." },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getOrgContext()
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>

    const title = typeof body.title === "string" ? body.title.trim() : ""
    if (!title) {
      return NextResponse.json(
        { error: "Titlul asset-ului este obligatoriu." },
        { status: 400 },
      )
    }
    if (!isAssetType(body.assetType)) {
      return NextResponse.json(
        { error: "assetType invalid (image/video/audio/text_synthetic/deepfake/public_interest_text/chatbot_interaction/other)." },
        { status: 400 },
      )
    }

    const input: CreateContentAssetInput = {
      title,
      assetType: body.assetType as AIContentAssetType,
      linkedAISystemId:
        typeof body.linkedAISystemId === "string" ? body.linkedAISystemId.trim() : undefined,
      publishedAtISO:
        typeof body.publishedAtISO === "string" ? body.publishedAtISO : undefined,
      distributionContext: Array.isArray(body.distributionContext)
        ? (body.distributionContext as unknown[]).filter(
            (s): s is string => typeof s === "string",
          )
        : [],
      audienceSize:
        typeof body.audienceSize === "number" && Number.isFinite(body.audienceSize)
          ? body.audienceSize
          : undefined,
      providerMarkingApplied: Boolean(body.providerMarkingApplied),
      providerMarkingStandard: isContentLabelingStandard(body.providerMarkingStandard)
        ? body.providerMarkingStandard
        : "none",
      providerMarkingProof:
        typeof body.providerMarkingProof === "string"
          ? body.providerMarkingProof
          : undefined,
      deployerDisclosureApplied: Boolean(body.deployerDisclosureApplied),
      deployerDisclosurePlacement:
        typeof body.deployerDisclosurePlacement === "string" &&
        PLACEMENT_VALUES.includes(body.deployerDisclosurePlacement as TransparencyPlacement)
          ? (body.deployerDisclosurePlacement as TransparencyPlacement)
          : undefined,
      deployerDisclosureText:
        typeof body.deployerDisclosureText === "string"
          ? body.deployerDisclosureText
          : undefined,
      deployerDisclosureLanguage:
        typeof body.deployerDisclosureLanguage === "string" &&
        LANGUAGE_VALUES.includes(body.deployerDisclosureLanguage as TransparencyLanguage)
          ? (body.deployerDisclosureLanguage as TransparencyLanguage)
          : undefined,
      isPublicInterest: typeof body.isPublicInterest === "boolean" ? body.isPublicInterest : undefined,
      editorialReviewBy:
        typeof body.editorialReviewBy === "string" ? body.editorialReviewBy : undefined,
      editorialReviewAtISO:
        typeof body.editorialReviewAtISO === "string"
          ? body.editorialReviewAtISO
          : undefined,
      editorialResponsibilityClaim:
        typeof body.editorialResponsibilityClaim === "boolean"
          ? body.editorialResponsibilityClaim
          : undefined,
      notes: typeof body.notes === "string" ? body.notes : undefined,
    }

    const asset = await createContentAsset(ctx.orgId, input, actorFromContext(ctx))
    const { assets } = await listContentAssets(ctx.orgId)
    return NextResponse.json(
      { asset, summary: summarizeContentAssets(assets) },
      { status: 201 },
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : "Eroare necunoscută"
    return NextResponse.json(
      { error: `Nu am putut crea asset-ul: ${message}` },
      { status: 500 },
    )
  }
}
