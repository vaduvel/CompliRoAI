/**
 * Sprint 008D — Breach list + create
 *
 * GET  /api/breach     -> { records, summary }
 * POST /api/breach     -> creeaza un breach GDPR; auto-emite finding rescue
 *                         ANSPDCP via createFinding daca dataCategories non-vide.
 */
import { NextResponse } from "next/server"

import { getOrgContext } from "@/lib/server/org-context"
import {
  createBreach,
  isBreachCause,
  isBreachDataCategory,
  isBreachSeverity,
  readBreachRecords,
  type CreateBreachInput,
} from "@/lib/server/breach-store"
import type { ComplianceEventActorInput } from "@/lib/compliance/events"
import type {
  BreachCause,
  BreachDataCategory,
  BreachSeverity,
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

function normalizeDataCategoriesArray(value: unknown): BreachDataCategory[] {
  if (!Array.isArray(value)) return []
  return value.filter((v): v is BreachDataCategory => isBreachDataCategory(v))
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter((v) => v.length > 0)
}

export async function GET() {
  try {
    const ctx = await getOrgContext()
    const { records, summary } = await readBreachRecords(ctx.orgId)
    return NextResponse.json({ records, summary })
  } catch {
    return NextResponse.json(
      { error: "Nu am putut citi registrul de breach-uri." },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getOrgContext()
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>

    const title = typeof body.title === "string" ? body.title.trim() : ""
    const description = typeof body.description === "string" ? body.description.trim() : ""
    const cause = body.cause
    if (!title) {
      return NextResponse.json({ error: "Titlul breach-ului e obligatoriu." }, { status: 400 })
    }
    if (!description) {
      return NextResponse.json({ error: "Descrierea breach-ului e obligatorie." }, { status: 400 })
    }
    if (!isBreachCause(cause)) {
      return NextResponse.json({ error: "Cauza breach-ului e invalida sau lipseste." }, { status: 400 })
    }

    const input: CreateBreachInput = {
      title,
      description,
      cause: cause as BreachCause,
      discoveredAtISO: typeof body.discoveredAtISO === "string" ? body.discoveredAtISO : undefined,
      occurredAtISO: typeof body.occurredAtISO === "string" ? body.occurredAtISO : undefined,
      severity: isBreachSeverity(body.severity) ? (body.severity as BreachSeverity) : undefined,
      dataCategories: normalizeDataCategoriesArray(body.dataCategories),
      affectedSubjectsCount: typeof body.affectedSubjectsCount === "number"
        ? body.affectedSubjectsCount
        : undefined,
      affectedSubjectsCategories: normalizeStringArray(body.affectedSubjectsCategories),
      affectedSystems: normalizeStringArray(body.affectedSystems),
      likelyConsequences:
        typeof body.likelyConsequences === "string" ? body.likelyConsequences : undefined,
      highRiskToRights:
        typeof body.highRiskToRights === "boolean" ? body.highRiskToRights : undefined,
      containmentMeasures: normalizeStringArray(body.containmentMeasures),
      preventionMeasures: normalizeStringArray(body.preventionMeasures),
      anspdcpNotificationRequired:
        typeof body.anspdcpNotificationRequired === "boolean"
          ? body.anspdcpNotificationRequired
          : undefined,
      subjectNotificationRequired:
        typeof body.subjectNotificationRequired === "boolean"
          ? body.subjectNotificationRequired
          : undefined,
      assignedToEmail:
        typeof body.assignedToEmail === "string" ? body.assignedToEmail : undefined,
      linkedAISystemIds: normalizeStringArray(body.linkedAISystemIds),
      notes: typeof body.notes === "string" ? body.notes : undefined,
    }

    const { record, linkedFindingId } = await createBreach(ctx.orgId, input, actorFromContext(ctx))
    const { summary } = await readBreachRecords(ctx.orgId)
    return NextResponse.json({ record, linkedFindingId, summary }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Nu am putut crea breach-ul." },
      { status: 500 },
    )
  }
}
