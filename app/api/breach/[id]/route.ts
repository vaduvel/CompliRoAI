/**
 * Sprint 008D — Breach single record: GET / PATCH / DELETE.
 *
 * GET     /api/breach/:id   -> { record }
 * PATCH   /api/breach/:id   -> merge patch (title, description, status, etc.)
 * DELETE  /api/breach/:id   -> hard delete
 */
import { NextResponse } from "next/server"

import { getOrgContext } from "@/lib/server/org-context"
import {
  deleteBreach,
  getBreachById,
  isBreachCause,
  isBreachDataCategory,
  isBreachSeverity,
  isBreachStatus,
  updateBreach,
  type UpdateBreachPatch,
} from "@/lib/server/breach-store"
import type { ComplianceEventActorInput } from "@/lib/compliance/events"
import type {
  BreachCause,
  BreachDataCategory,
  BreachSeverity,
  BreachStatus,
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

function normalizeDataCategoriesArray(value: unknown): BreachDataCategory[] | undefined {
  if (value === undefined) return undefined
  if (!Array.isArray(value)) return []
  return value.filter((v): v is BreachDataCategory => isBreachDataCategory(v))
}

function normalizeStringArray(value: unknown): string[] | undefined {
  if (value === undefined) return undefined
  if (!Array.isArray(value)) return []
  return value
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter((v) => v.length > 0)
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await getOrgContext()
    const { id } = await params
    const record = await getBreachById(ctx.orgId, id)
    if (!record) {
      return NextResponse.json({ error: "Breach inexistent." }, { status: 404 })
    }
    return NextResponse.json({ record })
  } catch {
    return NextResponse.json({ error: "Nu am putut citi breach-ul." }, { status: 500 })
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

    const patch: UpdateBreachPatch = {
      title: typeof body.title === "string" ? body.title : undefined,
      description: typeof body.description === "string" ? body.description : undefined,
      cause: isBreachCause(body.cause) ? (body.cause as BreachCause) : undefined,
      discoveredAtISO: typeof body.discoveredAtISO === "string" ? body.discoveredAtISO : undefined,
      occurredAtISO: typeof body.occurredAtISO === "string" ? body.occurredAtISO : undefined,
      severity: isBreachSeverity(body.severity) ? (body.severity as BreachSeverity) : undefined,
      dataCategories: normalizeDataCategoriesArray(body.dataCategories),
      affectedSubjectsCount:
        typeof body.affectedSubjectsCount === "number" ? body.affectedSubjectsCount : undefined,
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
      status: isBreachStatus(body.status) ? (body.status as BreachStatus) : undefined,
    }

    const updated = await updateBreach(ctx.orgId, id, patch, actorFromContext(ctx))
    if (!updated) {
      return NextResponse.json({ error: "Breach inexistent." }, { status: 404 })
    }
    return NextResponse.json({ record: updated })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Nu am putut actualiza breach-ul." },
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
    const removed = await deleteBreach(ctx.orgId, id, actorFromContext(ctx))
    if (!removed) {
      return NextResponse.json({ error: "Breach inexistent." }, { status: 404 })
    }
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Nu am putut sterge breach-ul." }, { status: 500 })
  }
}
