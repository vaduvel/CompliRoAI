/**
 * Sprint 008C — RoPA list + create + bulk upsert.
 *
 * GET  /api/ropa                  -> { activities, evaluation, summary }
 * POST /api/ropa                  -> creeaza UNA activitate (cu emit findings/triggers)
 * PUT  /api/ropa                  -> bulk upsert (paste-import) — array de activitati
 */
import { NextResponse } from "next/server"

import { getOrgContext } from "@/lib/server/org-context"
import {
  createRopaActivity,
  readRopaActivities,
  upsertRopaActivities,
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

export async function GET() {
  try {
    const ctx = await getOrgContext()
    const { activities, evaluation, summary } = await readRopaActivities(ctx.orgId)
    return NextResponse.json({
      activities,
      summary,
      triggers: evaluation.triggers,
      activityRisks: evaluation.activityRisks,
    })
  } catch {
    return NextResponse.json(
      { error: "Nu am putut citi RoPA." },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getOrgContext()
    const body = await request.json().catch(() => ({}))

    const activityName =
      typeof body.activityName === "string" ? body.activityName.trim() : ""
    if (!activityName) {
      return NextResponse.json(
        { error: "Numele activității este obligatoriu." },
        { status: 400 },
      )
    }

    const out = await createRopaActivity(
      ctx.orgId,
      sanitizeInput({ ...body, activityName }),
      actorFromContext(ctx),
    )
    return NextResponse.json(
      {
        activity: out.activity,
        summary: undefined,
        emittedFindingIds: out.emittedFindingIds,
        emittedTriggerIds: out.emittedTriggerIds,
      },
      { status: 201 },
    )
  } catch {
    return NextResponse.json(
      { error: "Nu am putut crea activitatea RoPA." },
      { status: 500 },
    )
  }
}

export async function PUT(request: Request) {
  try {
    const ctx = await getOrgContext()
    const body = await request.json().catch(() => ({}))
    const activities = Array.isArray(body.activities) ? body.activities : []
    const sanitized: Array<Partial<RopaActivityRecord> & { activityName: string }> = []
    for (const a of activities) {
      if (!a || typeof a !== "object") continue
      const name = typeof a.activityName === "string" ? a.activityName.trim() : ""
      if (!name) continue
      sanitized.push(sanitizeInput({ ...a, activityName: name }))
    }
    if (sanitized.length === 0) {
      return NextResponse.json(
        { error: "Niciun rând valid pentru import (lipsesc nume activitate)." },
        { status: 400 },
      )
    }
    const out = await upsertRopaActivities(ctx.orgId, sanitized, actorFromContext(ctx))
    return NextResponse.json({
      count: out.count,
      emittedFindingIds: out.emittedFindingIds,
      emittedTriggerIds: out.emittedTriggerIds,
    })
  } catch {
    return NextResponse.json(
      { error: "Nu am putut face import bulk RoPA." },
      { status: 500 },
    )
  }
}

function sanitizeInput(
  input: Record<string, unknown>,
): Partial<RopaActivityRecord> & { activityName: string } {
  function str(v: unknown): string | undefined {
    return typeof v === "string" && v.trim() ? v.trim() : undefined
  }
  function list(v: unknown): string[] {
    if (Array.isArray(v)) return v.filter((x): x is string => typeof x === "string").map((x) => x.trim()).filter(Boolean)
    if (typeof v === "string") {
      return v.split(/[\n,;]+/).map((x) => x.trim()).filter(Boolean)
    }
    return []
  }
  return {
    id: str(input.id),
    department: str(input.department),
    activityName: (str(input.activityName) ?? "").trim(),
    ownerName: str(input.ownerName),
    purpose: str(input.purpose) ?? "",
    dataSubjects: list(input.dataSubjects),
    dataCategories: list(input.dataCategories),
    specialCategories: list(input.specialCategories),
    legalBasis: str(input.legalBasis),
    article9Condition: str(input.article9Condition),
    recipients: list(input.recipients),
    processors: list(input.processors),
    systems: list(input.systems),
    thirdCountryTransfers: Array.isArray(input.thirdCountryTransfers)
      ? input.thirdCountryTransfers
          .filter((t): t is { country?: unknown; mechanism?: unknown } => Boolean(t) && typeof t === "object")
          .map((t) => ({
            country: str((t as { country?: unknown }).country) ?? "",
            mechanism: str((t as { mechanism?: unknown }).mechanism),
          }))
          .filter((t) => t.country || t.mechanism)
      : [],
    retentionRule: str(input.retentionRule),
    securityMeasures: list(input.securityMeasures),
    source: typeof input.source === "string" ? (input.source as RopaActivityRecord["source"]) : "manual",
    confidence:
      typeof input.confidence === "string"
        ? (input.confidence as RopaActivityRecord["confidence"])
        : "dpo_confirmed",
    status:
      typeof input.status === "string"
        ? (input.status as RopaActivityRecord["status"])
        : "draft",
    linkedFindings: list(input.linkedFindings),
    linkedEvidence: list(input.linkedEvidence),
    linkedAISystemIds: list(input.linkedAISystemIds),
  }
}
