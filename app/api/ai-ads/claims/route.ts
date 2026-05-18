/**
 * Sprint 024 — AI Ads claims list + create.
 *
 * GET  /api/ai-ads/claims?campaignId=aac-x&risk=high
 * POST /api/ai-ads/claims  Body: CreateClaimInput
 */
import { NextResponse } from "next/server"

import {
  createClaim,
  isClaimType,
  isEvidenceStatus,
  type CreateClaimInput,
} from "@/lib/server/ai-ads-store"
import { getOrgContext } from "@/lib/server/org-context"
import { readState } from "@/lib/server/store"
import type { ComplianceEventActorInput } from "@/lib/compliance/events"
import type { AIClaimMisleadingRisk } from "@/lib/compliance/types"

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

const VALID_RISKS: AIClaimMisleadingRisk[] = ["low", "medium", "high", "critical"]

export async function GET(request: Request) {
  try {
    await getOrgContext()
    const state = await readState()
    const url = new URL(request.url)
    const campaignId = url.searchParams.get("campaignId")
    const riskParam = url.searchParams.get("risk")

    let claims = state.aiAdsClaims ?? []
    if (campaignId) claims = claims.filter((c) => c.campaignId === campaignId)
    if (riskParam && VALID_RISKS.includes(riskParam as AIClaimMisleadingRisk)) {
      claims = claims.filter((c) => c.misleadingRisk === riskParam)
    }
    return NextResponse.json({
      claims,
      schema: {
        version: "v1",
        claimTypes: [
          "performance_metric",
          "price_promise",
          "guarantee",
          "certification",
          "comparative",
          "endorsement",
          "compliance_claim",
          "outcome_claim",
          "other",
        ],
        evidenceStatuses: [
          "unsubstantiated",
          "internal_data",
          "third_party_audit",
          "public_record",
          "vendor_attestation",
          "needs_review",
          "verified",
        ],
        risks: VALID_RISKS,
      },
    })
  } catch {
    return NextResponse.json(
      { error: "Nu am putut citi claims-urile." },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getOrgContext()
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>

    const claimText = typeof body.claimText === "string" ? body.claimText.trim() : ""
    if (!claimText) {
      return NextResponse.json({ error: "claimText este obligatoriu." }, { status: 400 })
    }
    if (!isClaimType(body.claimType)) {
      return NextResponse.json({ error: "claimType invalid." }, { status: 400 })
    }
    if (!isEvidenceStatus(body.evidenceStatus)) {
      return NextResponse.json({ error: "evidenceStatus invalid." }, { status: 400 })
    }

    const input: CreateClaimInput = {
      campaignId: typeof body.campaignId === "string" ? body.campaignId : undefined,
      claimType: body.claimType,
      claimText,
      contextDescription:
        typeof body.contextDescription === "string" ? body.contextDescription : "",
      evidenceStatus: body.evidenceStatus,
      evidenceSource:
        typeof body.evidenceSource === "string" ? body.evidenceSource : undefined,
      evidenceDocumentId:
        typeof body.evidenceDocumentId === "string" ? body.evidenceDocumentId : undefined,
      approvalComment:
        typeof body.approvalComment === "string" ? body.approvalComment : undefined,
      notes: typeof body.notes === "string" ? body.notes : undefined,
    }

    const claim = await createClaim(ctx.orgId, input, actorFromContext(ctx))
    return NextResponse.json({ claim }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Eroare necunoscută"
    return NextResponse.json(
      { error: `Nu am putut crea claim-ul: ${message}` },
      { status: 500 },
    )
  }
}
