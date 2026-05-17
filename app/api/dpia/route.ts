/**
 * Sprint 008C — DPIA list + create
 *
 * GET  /api/dpia          -> { records, summary }
 * POST /api/dpia          -> creeaza un DPIA record manual (non-screening).
 *                            Pentru flow-ul de screening, foloseste
 *                            POST /api/dpia/screening cu acceptFinding=true.
 */
import { NextResponse } from "next/server"

import { getOrgContext } from "@/lib/server/org-context"
import {
  createDpiaRecord,
  readDpiaRecords,
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

function isStatus(value: unknown): value is DpiaRecordStatus {
  return typeof value === "string" && STATUSES.includes(value as DpiaRecordStatus)
}
function isRisk(value: unknown): value is DpiaRiskLevel {
  return typeof value === "string" && RISK_LEVELS.includes(value as DpiaRiskLevel)
}

export async function GET() {
  try {
    const ctx = await getOrgContext()
    const { records, summary } = await readDpiaRecords(ctx.orgId)
    return NextResponse.json({ records, summary })
  } catch {
    return NextResponse.json(
      { error: "Nu am putut citi registrul DPIA." },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getOrgContext()
    const body = await request.json().catch(() => ({}))

    const title = typeof body.title === "string" ? body.title.trim() : ""
    if (!title) {
      return NextResponse.json(
        { error: "Titlul DPIA este obligatoriu." },
        { status: 400 },
      )
    }

    const record = await createDpiaRecord(
      ctx.orgId,
      {
        title,
        processingPurpose:
          typeof body.processingPurpose === "string" ? body.processingPurpose : undefined,
        processingDescription:
          typeof body.processingDescription === "string"
            ? body.processingDescription
            : undefined,
        dataCategories: body.dataCategories,
        dataSubjects: body.dataSubjects,
        legalBasis: typeof body.legalBasis === "string" ? body.legalBasis : undefined,
        specialCategories: Boolean(body.specialCategories),
        automatedDecisionMaking: Boolean(body.automatedDecisionMaking),
        largeScaleProcessing: Boolean(body.largeScaleProcessing),
        linkedRopaDocumentId:
          typeof body.linkedRopaDocumentId === "string" ? body.linkedRopaDocumentId : undefined,
        linkedRopaEntryLabel:
          typeof body.linkedRopaEntryLabel === "string" ? body.linkedRopaEntryLabel : undefined,
        necessityAssessment:
          typeof body.necessityAssessment === "string" ? body.necessityAssessment : undefined,
        proportionalityAssessment:
          typeof body.proportionalityAssessment === "string"
            ? body.proportionalityAssessment
            : undefined,
        risks: body.risks,
        mitigationMeasures: body.mitigationMeasures,
        residualRisk: isRisk(body.residualRisk) ? body.residualRisk : undefined,
        status: isStatus(body.status) ? body.status : undefined,
        owner: typeof body.owner === "string" ? body.owner : undefined,
        dueAtISO: typeof body.dueAtISO === "string" ? body.dueAtISO : undefined,
        evidenceNote: typeof body.evidenceNote === "string" ? body.evidenceNote : undefined,
        evidenceFileName:
          typeof body.evidenceFileName === "string" ? body.evidenceFileName : undefined,
      },
      actorFromContext(ctx),
    )

    const { summary } = await readDpiaRecords(ctx.orgId)
    return NextResponse.json({ record, summary }, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: "Nu am putut crea DPIA." },
      { status: 500 },
    )
  }
}
