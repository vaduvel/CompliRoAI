/**
 * Sprint 020 — AI Incident single record: GET / PATCH / DELETE.
 *
 * PATCH primește patch generic + suportă acțiuni inline:
 *   - body.action = "link-breach"      + body.breachId
 *   - body.action = "link-pmm-anomaly" + body.planId + body.anomalyId
 *
 * Pentru notify-authority, root-cause, close — vezi sub-rutele dedicate.
 */
import { NextResponse } from "next/server"

import {
  AI_INCIDENT_CATEGORY_OPTIONS,
  AI_INCIDENT_SEVERITY_OPTIONS,
  AI_INCIDENT_STATUS_OPTIONS,
} from "@/lib/compliance/ai-incident-schema"
import { getOrgContext } from "@/lib/server/org-context"
import {
  deleteIncident,
  getIncidentById,
  linkToBreach,
  linkToPmmAnomaly,
  updateIncident,
  type UpdateAIIncidentPatch,
} from "@/lib/server/ai-incident-store"
import type { ComplianceEventActorInput } from "@/lib/compliance/events"
import type {
  AIIncidentCategory,
  AIIncidentSeverity,
  AIIncidentStatus,
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
    const record = await getIncidentById(ctx.orgId, id)
    if (!record) {
      return NextResponse.json(
        { error: "Incident AI inexistent." },
        { status: 404 },
      )
    }
    return NextResponse.json({ record })
  } catch {
    return NextResponse.json(
      { error: "Nu am putut citi incidentul AI." },
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
    const body = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >

    // Handle inline actions
    if (body.action === "link-breach") {
      const breachId =
        typeof body.breachId === "string" ? body.breachId.trim() : ""
      if (!breachId) {
        return NextResponse.json(
          { error: "breachId obligatoriu pentru link-breach." },
          { status: 400 },
        )
      }
      const linked = await linkToBreach(
        ctx.orgId,
        id,
        breachId,
        actorFromContext(ctx),
      )
      if (!linked) {
        return NextResponse.json(
          { error: "Incident AI inexistent." },
          { status: 404 },
        )
      }
      return NextResponse.json({ record: linked })
    }
    if (body.action === "link-pmm-anomaly") {
      const planId = typeof body.planId === "string" ? body.planId.trim() : ""
      const anomalyId =
        typeof body.anomalyId === "string" ? body.anomalyId.trim() : ""
      if (!planId || !anomalyId) {
        return NextResponse.json(
          { error: "planId + anomalyId obligatorii." },
          { status: 400 },
        )
      }
      const linked = await linkToPmmAnomaly(
        ctx.orgId,
        id,
        planId,
        anomalyId,
        actorFromContext(ctx),
      )
      if (!linked) {
        return NextResponse.json(
          { error: "Incident AI inexistent." },
          { status: 404 },
        )
      }
      return NextResponse.json({ record: linked })
    }

    const patch: UpdateAIIncidentPatch = {}
    if (typeof body.title === "string") patch.title = body.title
    if (typeof body.description === "string") patch.description = body.description
    if (
      typeof body.category === "string" &&
      AI_INCIDENT_CATEGORY_OPTIONS.includes(body.category as AIIncidentCategory)
    ) {
      patch.category = body.category as AIIncidentCategory
    }
    if (
      typeof body.severity === "string" &&
      AI_INCIDENT_SEVERITY_OPTIONS.includes(body.severity as AIIncidentSeverity)
    ) {
      patch.severity = body.severity as AIIncidentSeverity
    }
    if (
      typeof body.status === "string" &&
      AI_INCIDENT_STATUS_OPTIONS.includes(body.status as AIIncidentStatus)
    ) {
      patch.status = body.status as AIIncidentStatus
    }
    if (Array.isArray(body.affectedSubjectsCategories)) {
      patch.affectedSubjectsCategories = (
        body.affectedSubjectsCategories as unknown[]
      )
        .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
        .map((s) => s.trim())
    }
    if (typeof body.affectedSubjectsCount === "number") {
      patch.affectedSubjectsCount = body.affectedSubjectsCount
    }
    if (typeof body.occurredAtISO === "string") {
      patch.occurredAtISO = body.occurredAtISO
    }
    if (typeof body.detectedAtISO === "string") {
      patch.detectedAtISO = body.detectedAtISO
    }
    if (typeof body.assignedToEmail === "string") {
      patch.assignedToEmail = body.assignedToEmail
    }
    if (typeof body.notificationRequired === "boolean") {
      patch.notificationRequired = body.notificationRequired
    }
    if (typeof body.notes === "string") patch.notes = body.notes
    if (typeof body.linkedBreachId === "string") {
      patch.linkedBreachId = body.linkedBreachId
    }
    if (typeof body.linkedPmmAnomalyId === "string") {
      patch.linkedPmmAnomalyId = body.linkedPmmAnomalyId
    }

    const updated = await updateIncident(
      ctx.orgId,
      id,
      patch,
      actorFromContext(ctx),
      ctx.orgName ?? "Organizația",
    )
    if (!updated) {
      return NextResponse.json(
        { error: "Incident AI inexistent." },
        { status: 404 },
      )
    }
    return NextResponse.json({ record: updated })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Eroare necunoscută"
    return NextResponse.json(
      { error: `Nu am putut actualiza incidentul AI: ${message}` },
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
    const removed = await deleteIncident(
      ctx.orgId,
      id,
      actorFromContext(ctx),
    )
    if (!removed) {
      return NextResponse.json(
        { error: "Incident AI inexistent." },
        { status: 404 },
      )
    }
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json(
      { error: "Nu am putut șterge incidentul AI." },
      { status: 500 },
    )
  }
}
