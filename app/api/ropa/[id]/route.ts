/**
 * Sprint 008C — RoPA single activity: GET / PATCH / DELETE.
 */
import { NextResponse } from "next/server"

import { getOrgContext } from "@/lib/server/org-context"
import {
  deleteRopaActivity,
  getRopaActivityById,
  updateRopaActivity,
} from "@/lib/server/ropa-store"
import type { ComplianceEventActorInput } from "@/lib/compliance/events"
import type { RopaActivityRecord } from "@/lib/compliance/types"

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
    const activity = await getRopaActivityById(ctx.orgId, id)
    if (!activity) {
      return NextResponse.json({ error: "Activitate inexistentă." }, { status: 404 })
    }
    return NextResponse.json({ activity })
  } catch {
    return NextResponse.json(
      { error: "Nu am putut citi activitatea." },
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
    const patch: Partial<RopaActivityRecord> = {}

    function str(v: unknown): string | undefined {
      return typeof v === "string" && v.trim() ? v.trim() : undefined
    }
    function list(v: unknown): string[] | undefined {
      if (v === undefined) return undefined
      if (Array.isArray(v)) return v.filter((x): x is string => typeof x === "string").map((x) => x.trim()).filter(Boolean)
      if (typeof v === "string") return v.split(/[\n,;]+/).map((x) => x.trim()).filter(Boolean)
      return undefined
    }

    const fields = [
      "activityName",
      "department",
      "ownerName",
      "purpose",
      "legalBasis",
      "article9Condition",
      "retentionRule",
    ] as const
    for (const f of fields) {
      const v = str(body[f])
      if (v !== undefined) (patch as Record<string, unknown>)[f] = v
    }
    const listFields = [
      "dataSubjects",
      "dataCategories",
      "specialCategories",
      "recipients",
      "processors",
      "systems",
      "securityMeasures",
      "linkedFindings",
      "linkedEvidence",
      "linkedAISystemIds",
    ] as const
    for (const f of listFields) {
      const v = list(body[f])
      if (v !== undefined) (patch as Record<string, unknown>)[f] = v
    }
    if (Array.isArray(body.thirdCountryTransfers)) {
      patch.thirdCountryTransfers = body.thirdCountryTransfers
        .filter((t: unknown): t is { country?: unknown; mechanism?: unknown } => Boolean(t) && typeof t === "object")
        .map((t: { country?: unknown; mechanism?: unknown }) => ({
          country: str(t.country) ?? "",
          mechanism: str(t.mechanism),
        }))
        .filter((t: { country: string; mechanism?: string }) => t.country || t.mechanism)
    }
    if (typeof body.status === "string") patch.status = body.status as RopaActivityRecord["status"]
    if (typeof body.confidence === "string") patch.confidence = body.confidence as RopaActivityRecord["confidence"]
    if (typeof body.source === "string") patch.source = body.source as RopaActivityRecord["source"]

    const out = await updateRopaActivity(ctx.orgId, id, patch, actorFromContext(ctx))
    if (!out.activity) {
      return NextResponse.json({ error: "Activitate inexistentă." }, { status: 404 })
    }
    return NextResponse.json({
      activity: out.activity,
      emittedFindingIds: out.emittedFindingIds,
      emittedTriggerIds: out.emittedTriggerIds,
    })
  } catch {
    return NextResponse.json(
      { error: "Nu am putut actualiza activitatea." },
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
    const removed = await deleteRopaActivity(ctx.orgId, id, actorFromContext(ctx))
    if (!removed) {
      return NextResponse.json({ error: "Activitate inexistentă." }, { status: 404 })
    }
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json(
      { error: "Nu am putut șterge activitatea." },
      { status: 500 },
    )
  }
}
