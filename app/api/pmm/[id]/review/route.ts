/**
 * Sprint 019 — POST /api/pmm/:id/review
 *
 * Body: {
 *   reviewType: "scheduled" | "ad_hoc" | "incident_triggered" | "regulatory_request",
 *   reviewedByEmail: string,
 *   performanceMetrics?: Record<string, number | string>,
 *   risksDetected?: string[],
 *   correctiveActions?: string[],
 *   preventiveActions?: string[],
 *   notes?: string,
 *   nextReviewISO?: string (override),
 *   reviewDateISO?: string (default = now)
 * }
 */
import { NextResponse } from "next/server"

import { getOrgContext } from "@/lib/server/org-context"
import {
  recordReview,
  type RecordReviewInput,
} from "@/lib/server/pmm-store"
import type { ComplianceEventActorInput } from "@/lib/compliance/events"
import type { PmmReviewType } from "@/lib/compliance/types"

const REVIEW_TYPES: PmmReviewType[] = [
  "scheduled",
  "ad_hoc",
  "incident_triggered",
  "regulatory_request",
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

function sanitizeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return (value as unknown[])
    .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
    .map((s) => s.trim())
}

function sanitizeMetrics(value: unknown): Record<string, number | string> {
  if (!value || typeof value !== "object") return {}
  const result: Record<string, number | string> = {}
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (typeof k !== "string" || !k.trim()) continue
    if (typeof v === "number" && Number.isFinite(v)) {
      result[k.trim()] = v
    } else if (typeof v === "string" && v.trim().length > 0) {
      result[k.trim()] = v.trim()
    }
  }
  return result
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await getOrgContext()
    const { id } = await params
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>

    const reviewType = body.reviewType
    if (
      typeof reviewType !== "string" ||
      !REVIEW_TYPES.includes(reviewType as PmmReviewType)
    ) {
      return NextResponse.json(
        { error: "reviewType invalid (scheduled/ad_hoc/incident_triggered/regulatory_request)." },
        { status: 400 },
      )
    }

    const reviewedByEmail =
      typeof body.reviewedByEmail === "string"
        ? body.reviewedByEmail.trim()
        : ctx.email
    if (!reviewedByEmail || !reviewedByEmail.includes("@")) {
      return NextResponse.json(
        { error: "Email reviewer invalid." },
        { status: 400 },
      )
    }

    const input: RecordReviewInput = {
      reviewType: reviewType as PmmReviewType,
      reviewedByEmail,
      performanceMetrics: sanitizeMetrics(body.performanceMetrics),
      risksDetected: sanitizeStringList(body.risksDetected),
      correctiveActions: sanitizeStringList(body.correctiveActions),
      preventiveActions: sanitizeStringList(body.preventiveActions),
      notes: typeof body.notes === "string" ? body.notes : undefined,
      nextReviewISO:
        typeof body.nextReviewISO === "string" ? body.nextReviewISO : undefined,
      reviewDateISO:
        typeof body.reviewDateISO === "string" ? body.reviewDateISO : undefined,
    }

    const updated = await recordReview(
      ctx.orgId,
      id,
      input,
      actorFromContext(ctx),
      ctx.orgName ?? "Organizația",
    )
    if (!updated) {
      return NextResponse.json({ error: "Plan PMM inexistent." }, { status: 404 })
    }
    return NextResponse.json({ record: updated })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Eroare necunoscută"
    return NextResponse.json(
      { error: `Nu am putut înregistra review-ul: ${message}` },
      { status: 500 },
    )
  }
}
