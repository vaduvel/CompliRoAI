/**
 * Sprint 019 — PMM Plan single record: GET / PATCH / DELETE.
 *
 * PATCH accepts approve / reject inline via body.action = "approve" | "reject".
 */
import { NextResponse } from "next/server"

import {
  PMM_DATA_COLLECTION_FREQUENCY_OPTIONS,
  PMM_DATA_COLLECTION_METHOD_OPTIONS,
  PMM_REVIEW_CYCLE_OPTIONS,
} from "@/lib/compliance/pmm-schema"
import { getOrgContext } from "@/lib/server/org-context"
import {
  deletePlan,
  getPmmPlanById,
  isPmmPlanStatus,
  markPlanApproved,
  markPlanRejected,
  updatePlan,
  type UpdatePmmPatch,
} from "@/lib/server/pmm-store"
import type { ComplianceEventActorInput } from "@/lib/compliance/events"
import type {
  PmmDataCollectionFrequency,
  PmmDataCollectionMethod,
  PmmReviewCycle,
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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await getOrgContext()
    const { id } = await params
    const record = await getPmmPlanById(ctx.orgId, id)
    if (!record) {
      return NextResponse.json({ error: "Plan PMM inexistent." }, { status: 404 })
    }
    return NextResponse.json({ record })
  } catch {
    return NextResponse.json(
      { error: "Nu am putut citi planul PMM." },
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

    // Handle approve/reject actions inline
    if (body.action === "approve") {
      const approvedByEmail =
        typeof body.approvedByEmail === "string"
          ? body.approvedByEmail.trim()
          : ctx.email
      if (!approvedByEmail || !approvedByEmail.includes("@")) {
        return NextResponse.json(
          { error: "Email aprobator invalid." },
          { status: 400 },
        )
      }
      const approved = await markPlanApproved(
        ctx.orgId,
        id,
        approvedByEmail,
        actorFromContext(ctx),
      )
      if (!approved) {
        return NextResponse.json({ error: "Plan PMM inexistent." }, { status: 404 })
      }
      return NextResponse.json({ record: approved })
    }
    if (body.action === "reject") {
      const reason = typeof body.reason === "string" ? body.reason.trim() : ""
      if (reason.length < 5) {
        return NextResponse.json(
          { error: "Motivul respingerii este obligatoriu (min 5 caractere)." },
          { status: 400 },
        )
      }
      const rejected = await markPlanRejected(
        ctx.orgId,
        id,
        reason,
        actorFromContext(ctx),
      )
      if (!rejected) {
        return NextResponse.json({ error: "Plan PMM inexistent." }, { status: 404 })
      }
      return NextResponse.json({ record: rejected })
    }

    const patch: UpdatePmmPatch = {}
    if (typeof body.title === "string") patch.title = body.title
    if (
      typeof body.reviewCycle === "string" &&
      PMM_REVIEW_CYCLE_OPTIONS.includes(body.reviewCycle as PmmReviewCycle)
    ) {
      patch.reviewCycle = body.reviewCycle as PmmReviewCycle
    }
    if (Array.isArray(body.dataCollectionMethods)) {
      patch.dataCollectionMethods = (body.dataCollectionMethods as unknown[]).filter(
        (m): m is PmmDataCollectionMethod =>
          PMM_DATA_COLLECTION_METHOD_OPTIONS.includes(m as PmmDataCollectionMethod),
      )
    }
    if (
      typeof body.dataCollectionFrequency === "string" &&
      PMM_DATA_COLLECTION_FREQUENCY_OPTIONS.includes(
        body.dataCollectionFrequency as PmmDataCollectionFrequency,
      )
    ) {
      patch.dataCollectionFrequency = body.dataCollectionFrequency as PmmDataCollectionFrequency
    }
    if (typeof body.dataCollectionDescription === "string") {
      patch.dataCollectionDescription = body.dataCollectionDescription
    }
    if (Array.isArray(body.complianceEvaluationMethods)) {
      patch.complianceEvaluationMethods = (body.complianceEvaluationMethods as unknown[])
        .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
        .map((s) => s.trim())
    }
    if (Array.isArray(body.complianceMetricsTracked)) {
      patch.complianceMetricsTracked = (body.complianceMetricsTracked as unknown[])
        .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
        .map((s) => s.trim())
    }
    if (typeof body.correctiveActionProcess === "string") {
      patch.correctiveActionProcess = body.correctiveActionProcess
    }
    if (typeof body.preventiveActionProcess === "string") {
      patch.preventiveActionProcess = body.preventiveActionProcess
    }
    if (typeof body.notes === "string") patch.notes = body.notes
    if (typeof body.nextReviewISO === "string") patch.nextReviewISO = body.nextReviewISO
    if (typeof body.status === "string" && isPmmPlanStatus(body.status)) {
      patch.status = body.status
    }

    const updated = await updatePlan(
      ctx.orgId,
      id,
      patch,
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
      { error: `Nu am putut actualiza planul PMM: ${message}` },
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
    const removed = await deletePlan(ctx.orgId, id, actorFromContext(ctx))
    if (!removed) {
      return NextResponse.json({ error: "Plan PMM inexistent." }, { status: 404 })
    }
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json(
      { error: "Nu am putut șterge planul PMM." },
      { status: 500 },
    )
  }
}
