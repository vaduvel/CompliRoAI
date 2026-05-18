/**
 * Sprint 023.7 — Art. 50 Content Asset per-id GET / PATCH / DELETE.
 */
import { NextResponse } from "next/server"

import { annotateContentAsset } from "@/lib/compliance/transparency-engine"
import { getOrgContext } from "@/lib/server/org-context"
import {
  deleteContentAsset,
  getContentAssetById,
  isContentLabelingStandard,
  updateContentAsset,
  type UpdateContentAssetPatch,
} from "@/lib/server/transparency-content-store"
import type { ComplianceEventActorInput } from "@/lib/compliance/events"
import type {
  AIContentAssetType,
  ContentLabelingStandard,
  TransparencyLanguage,
  TransparencyPlacement,
} from "@/lib/compliance/types"

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

const ASSET_TYPE_VALUES: AIContentAssetType[] = [
  "image",
  "video",
  "audio",
  "text_synthetic",
  "deepfake",
  "public_interest_text",
  "chatbot_interaction",
  "other",
]

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
    const asset = await getContentAssetById(ctx.orgId, id)
    if (!asset) {
      return NextResponse.json({ error: "Asset inexistent." }, { status: 404 })
    }
    return NextResponse.json({ asset: annotateContentAsset(asset) })
  } catch {
    return NextResponse.json(
      { error: "Nu am putut citi asset-ul." },
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

    const patch: UpdateContentAssetPatch = {}
    if (typeof body.title === "string") patch.title = body.title.trim()
    if (
      typeof body.assetType === "string" &&
      ASSET_TYPE_VALUES.includes(body.assetType as AIContentAssetType)
    ) {
      patch.assetType = body.assetType as AIContentAssetType
    }
    if (typeof body.linkedAISystemId === "string") {
      patch.linkedAISystemId = body.linkedAISystemId.trim() || undefined
    }
    if (typeof body.publishedAtISO === "string") {
      patch.publishedAtISO = body.publishedAtISO
    }
    if (Array.isArray(body.distributionContext)) {
      patch.distributionContext = (body.distributionContext as unknown[]).filter(
        (s): s is string => typeof s === "string",
      )
    }
    if (typeof body.audienceSize === "number") {
      patch.audienceSize = body.audienceSize
    }
    if (typeof body.providerMarkingApplied === "boolean") {
      patch.providerMarkingApplied = body.providerMarkingApplied
    }
    if (isContentLabelingStandard(body.providerMarkingStandard)) {
      patch.providerMarkingStandard = body.providerMarkingStandard as ContentLabelingStandard
    }
    if (typeof body.providerMarkingProof === "string") {
      patch.providerMarkingProof = body.providerMarkingProof
    }
    if (typeof body.deployerDisclosureApplied === "boolean") {
      patch.deployerDisclosureApplied = body.deployerDisclosureApplied
    }
    if (
      typeof body.deployerDisclosurePlacement === "string" &&
      PLACEMENT_VALUES.includes(body.deployerDisclosurePlacement as TransparencyPlacement)
    ) {
      patch.deployerDisclosurePlacement =
        body.deployerDisclosurePlacement as TransparencyPlacement
    }
    if (typeof body.deployerDisclosureText === "string") {
      patch.deployerDisclosureText = body.deployerDisclosureText
    }
    if (
      typeof body.deployerDisclosureLanguage === "string" &&
      LANGUAGE_VALUES.includes(body.deployerDisclosureLanguage as TransparencyLanguage)
    ) {
      patch.deployerDisclosureLanguage =
        body.deployerDisclosureLanguage as TransparencyLanguage
    }
    if (typeof body.isPublicInterest === "boolean") {
      patch.isPublicInterest = body.isPublicInterest
    }
    if (typeof body.editorialReviewBy === "string") {
      patch.editorialReviewBy = body.editorialReviewBy
    }
    if (typeof body.editorialReviewAtISO === "string") {
      patch.editorialReviewAtISO = body.editorialReviewAtISO
    }
    if (typeof body.editorialResponsibilityClaim === "boolean") {
      patch.editorialResponsibilityClaim = body.editorialResponsibilityClaim
    }
    if (typeof body.notes === "string") patch.notes = body.notes

    const updated = await updateContentAsset(ctx.orgId, id, patch, actorFromContext(ctx))
    if (!updated) {
      return NextResponse.json({ error: "Asset inexistent." }, { status: 404 })
    }
    return NextResponse.json({ asset: annotateContentAsset(updated) })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Eroare necunoscută"
    return NextResponse.json(
      { error: `Nu am putut actualiza asset-ul: ${message}` },
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
    const removed = await deleteContentAsset(ctx.orgId, id, actorFromContext(ctx))
    if (!removed) {
      return NextResponse.json({ error: "Asset inexistent." }, { status: 404 })
    }
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json(
      { error: "Nu am putut șterge asset-ul." },
      { status: 500 },
    )
  }
}
