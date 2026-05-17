/**
 * Sprint 010 — Vendor Review by id (GET single, PATCH update, DELETE).
 *
 * GET    /api/vendor-review/[id]  -> { record }
 * PATCH  /api/vendor-review/[id]  -> body: UpdateVendorPatch sau action
 *                                    (approve / reject); re-evalueaza risc
 * DELETE /api/vendor-review/[id]  -> sterge vendorul + event
 */
import { NextResponse } from "next/server"

import { getOrgContext } from "@/lib/server/org-context"
import {
  approveVendor,
  deleteVendor,
  getVendorById,
  isDPAStatus,
  isVendorRegion,
  isVendorReviewStatus,
  isVendorRole,
  isVendorTransferMechanism,
  rejectVendor,
  updateVendor,
  type UpdateVendorPatch,
} from "@/lib/server/vendor-review-store"
import type { ComplianceEventActorInput } from "@/lib/compliance/events"

function actorFromContext(ctx: { userId: string; email: string }): ComplianceEventActorInput {
  return {
    id: ctx.userId,
    label: ctx.email,
    role: "compliance",
    source: "session",
  }
}

function normStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter((s) => s.length > 0)
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params
    const ctx = await getOrgContext()
    const record = await getVendorById(ctx.orgId, id)
    if (!record) {
      return NextResponse.json({ error: "Vendorul nu a fost gasit." }, { status: 404 })
    }
    return NextResponse.json({ record })
  } catch {
    return NextResponse.json(
      { error: "Nu am putut citi vendorul." },
      { status: 500 },
    )
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params
    const ctx = await getOrgContext()
    const actor = actorFromContext(ctx)
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>

    // Workflow actions short-cut: { action: "approve" | "reject", ... }
    const action = typeof body.action === "string" ? body.action : null

    if (action === "approve") {
      const reviewerEmail =
        typeof body.reviewerEmail === "string" ? body.reviewerEmail : ctx.email
      const record = await approveVendor(ctx.orgId, id, reviewerEmail, actor)
      if (!record) {
        return NextResponse.json({ error: "Vendorul nu a fost gasit." }, { status: 404 })
      }
      return NextResponse.json({ record, action: "approved" })
    }
    if (action === "reject") {
      const reason = typeof body.reason === "string" ? body.reason : ""
      const record = await rejectVendor(ctx.orgId, id, reason, actor)
      if (!record) {
        return NextResponse.json({ error: "Vendorul nu a fost gasit." }, { status: 404 })
      }
      return NextResponse.json({ record, action: "rejected" })
    }

    // Generic patch
    const patch: UpdateVendorPatch = {
      name: typeof body.name === "string" ? body.name : undefined,
      legalEntity: typeof body.legalEntity === "string" ? body.legalEntity : undefined,
      contactEmail: typeof body.contactEmail === "string" ? body.contactEmail : undefined,
      productUsed: typeof body.productUsed === "string" ? body.productUsed : undefined,
      vendorRegion: isVendorRegion(body.vendorRegion) ? body.vendorRegion : undefined,
      role: isVendorRole(body.role) ? body.role : undefined,
      serviceCategory: typeof body.serviceCategory === "string" ? body.serviceCategory : undefined,
      linkedAISystemIds: Array.isArray(body.linkedAISystemIds)
        ? normStringArray(body.linkedAISystemIds)
        : undefined,
      linkedAIDataMapIds: Array.isArray(body.linkedAIDataMapIds)
        ? normStringArray(body.linkedAIDataMapIds)
        : undefined,
      dpaStatus: isDPAStatus(body.dpaStatus) ? body.dpaStatus : undefined,
      dpaUrl: typeof body.dpaUrl === "string" ? body.dpaUrl : undefined,
      dpaSignedAtISO: typeof body.dpaSignedAtISO === "string" ? body.dpaSignedAtISO : undefined,
      dpaExpiresAtISO: typeof body.dpaExpiresAtISO === "string" ? body.dpaExpiresAtISO : undefined,
      transferRequired:
        typeof body.transferRequired === "boolean" ? body.transferRequired : undefined,
      transferMechanism: isVendorTransferMechanism(body.transferMechanism)
        ? body.transferMechanism
        : undefined,
      transferAssessmentNote:
        typeof body.transferAssessmentNote === "string" ? body.transferAssessmentNote : undefined,
      subprocessorsList: Array.isArray(body.subprocessorsList)
        ? normStringArray(body.subprocessorsList)
        : undefined,
      subprocessorsUrl: typeof body.subprocessorsUrl === "string" ? body.subprocessorsUrl : undefined,
      securityEvidence:
        typeof body.securityEvidence === "object" && body.securityEvidence !== null
          ? (body.securityEvidence as UpdateVendorPatch["securityEvidence"])
          : undefined,
      aiTerms:
        typeof body.aiTerms === "object" && body.aiTerms !== null
          ? (body.aiTerms as UpdateVendorPatch["aiTerms"])
          : undefined,
      reviewStatus: isVendorReviewStatus(body.reviewStatus) ? body.reviewStatus : undefined,
      reviewedByEmail:
        typeof body.reviewedByEmail === "string" ? body.reviewedByEmail : undefined,
      notes: typeof body.notes === "string" ? body.notes : undefined,
    }

    const record = await updateVendor(ctx.orgId, id, patch, actor)
    if (!record) {
      return NextResponse.json({ error: "Vendorul nu a fost gasit." }, { status: 404 })
    }
    return NextResponse.json({ record })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Nu am putut actualiza vendorul." },
      { status: 500 },
    )
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params
    const ctx = await getOrgContext()
    const removed = await deleteVendor(ctx.orgId, id, actorFromContext(ctx))
    if (!removed) {
      return NextResponse.json({ error: "Vendorul nu a fost gasit." }, { status: 404 })
    }
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json(
      { error: "Nu am putut sterge vendorul." },
      { status: 500 },
    )
  }
}
