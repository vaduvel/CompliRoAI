/**
 * Sprint 008C — DPIA single record: GET / PATCH / DELETE.
 *
 * GET     /api/dpia/:id   -> { record }
 * PATCH   /api/dpia/:id   -> merge patch (status, residualRisk, risks, etc.)
 * DELETE  /api/dpia/:id   -> hard delete
 */
import { NextResponse } from "next/server"

import { getOrgContext } from "@/lib/server/org-context"
import {
  deleteDpiaRecord,
  getDpiaRecordById,
  updateDpiaRecord,
  type UpdateDpiaRecordPatch,
} from "@/lib/server/dpia-store"
import type { ComplianceEventActorInput } from "@/lib/compliance/events"
import type { DpiaRecordStatus, DpiaRiskLevel } from "@/lib/compliance/types"

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

const STATUSES: DpiaRecordStatus[] = [
  "draft",
  "in_review",
  "approved",
  "mitigations_in_progress",
  "completed",
  "archived",
]
const RISK_LEVELS: DpiaRiskLevel[] = ["low", "medium", "high", "critical"]

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await getOrgContext()
    const { id } = await params
    const record = await getDpiaRecordById(ctx.orgId, id)
    if (!record) {
      return NextResponse.json({ error: "DPIA inexistentă." }, { status: 404 })
    }
    return NextResponse.json({ record })
  } catch {
    return NextResponse.json(
      { error: "Nu am putut citi DPIA." },
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
    const body = await request.json().catch(() => ({}))

    const patch: UpdateDpiaRecordPatch = {
      title: typeof body.title === "string" ? body.title : undefined,
      processingPurpose:
        typeof body.processingPurpose === "string" ? body.processingPurpose : undefined,
      processingDescription:
        typeof body.processingDescription === "string"
          ? body.processingDescription
          : undefined,
      dataCategories: body.dataCategories,
      dataSubjects: body.dataSubjects,
      legalBasis: typeof body.legalBasis === "string" ? body.legalBasis : undefined,
      specialCategories:
        body.specialCategories === undefined ? undefined : Boolean(body.specialCategories),
      automatedDecisionMaking:
        body.automatedDecisionMaking === undefined
          ? undefined
          : Boolean(body.automatedDecisionMaking),
      largeScaleProcessing:
        body.largeScaleProcessing === undefined
          ? undefined
          : Boolean(body.largeScaleProcessing),
      linkedRopaDocumentId: body.linkedRopaDocumentId,
      linkedRopaEntryLabel: body.linkedRopaEntryLabel,
      necessityAssessment:
        typeof body.necessityAssessment === "string"
          ? body.necessityAssessment
          : undefined,
      proportionalityAssessment:
        typeof body.proportionalityAssessment === "string"
          ? body.proportionalityAssessment
          : undefined,
      risks: body.risks,
      mitigationMeasures: body.mitigationMeasures,
      residualRisk: RISK_LEVELS.includes(body.residualRisk as DpiaRiskLevel)
        ? (body.residualRisk as DpiaRiskLevel)
        : undefined,
      status: STATUSES.includes(body.status as DpiaRecordStatus)
        ? (body.status as DpiaRecordStatus)
        : undefined,
      owner: typeof body.owner === "string" ? body.owner : undefined,
      dueAtISO: body.dueAtISO,
      approvedBy: typeof body.approvedBy === "string" ? body.approvedBy : undefined,
      evidenceNote: body.evidenceNote,
      evidenceFileName: body.evidenceFileName,
    }

    const updated = await updateDpiaRecord(ctx.orgId, id, patch, actorFromContext(ctx))
    if (!updated) {
      return NextResponse.json({ error: "DPIA inexistentă." }, { status: 404 })
    }
    return NextResponse.json({ record: updated })
  } catch {
    return NextResponse.json(
      { error: "Nu am putut actualiza DPIA." },
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
    const removed = await deleteDpiaRecord(ctx.orgId, id, actorFromContext(ctx))
    if (!removed) {
      return NextResponse.json({ error: "DPIA inexistentă." }, { status: 404 })
    }
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json(
      { error: "Nu am putut șterge DPIA." },
      { status: 500 },
    )
  }
}
