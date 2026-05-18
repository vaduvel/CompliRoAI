/**
 * Sprint 008B — Findings CRUD: GET list + POST create
 *
 * GET  /api/findings           -> { findings, stats }
 * POST /api/findings           -> creeaza un finding manual (Adauga risc).
 *
 * Both routes folosesc `mutateFreshStateForOrg` indirect via findings-store.
 */
import { NextResponse } from "next/server"

import { getOrgContext } from "@/lib/server/org-context"
import {
  createFinding,
  isFindingCategory,
  readFindings,
} from "@/lib/server/findings-store"
import type { ComplianceEventActorInput } from "@/lib/compliance/events"

function actorFromContext(ctx: {
  userId: string
  email: string
}): ComplianceEventActorInput {
  return {
    id: ctx.userId,
    label: ctx.email,
    role: "owner",
    source: "session",
  }
}

export async function GET() {
  try {
    const ctx = await getOrgContext()
    const { findings, stats } = await readFindings(ctx.orgId)
    return NextResponse.json({ findings, stats })
  } catch {
    return NextResponse.json(
      { error: "Nu am putut incarca risk-urile." },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getOrgContext()
    const body = await request.json().catch(() => ({}))

    const title = typeof body.title === "string" ? body.title.trim() : ""
    const detail = typeof body.detail === "string" ? body.detail.trim() : ""
    const category = body.category

    if (!title) {
      return NextResponse.json(
        { error: "Titlul este obligatoriu." },
        { status: 400 },
      )
    }
    if (!detail) {
      return NextResponse.json(
        { error: "Descrierea problemei este obligatorie." },
        { status: 400 },
      )
    }
    if (!isFindingCategory(category)) {
      return NextResponse.json(
        { error: "Categorie invalidă (EU_AI_ACT / GDPR / NIS2)." },
        { status: 400 },
      )
    }

    const finding = await createFinding(
      ctx.orgId,
      {
        title,
        detail,
        category,
        severity:
          body.severity === "critical" ||
          body.severity === "high" ||
          body.severity === "medium" ||
          body.severity === "low"
            ? body.severity
            : undefined,
        legalReference:
          typeof body.legalReference === "string"
            ? body.legalReference.trim() || undefined
            : undefined,
        remediationHint:
          typeof body.remediationHint === "string"
            ? body.remediationHint.trim() || undefined
            : undefined,
        impactSummary:
          typeof body.impactSummary === "string"
            ? body.impactSummary.trim() || undefined
            : undefined,
        ownerSuggestion:
          typeof body.ownerSuggestion === "string"
            ? body.ownerSuggestion.trim() || undefined
            : undefined,
        evidenceRequired:
          typeof body.evidenceRequired === "string"
            ? body.evidenceRequired.trim() || undefined
            : undefined,
        closeCondition:
          typeof body.closeCondition === "string"
            ? body.closeCondition.trim() || undefined
            : undefined,
      },
      actorFromContext(ctx),
    )

    return NextResponse.json({ finding }, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: "Nu am putut crea risc-ul." },
      { status: 500 },
    )
  }
}
