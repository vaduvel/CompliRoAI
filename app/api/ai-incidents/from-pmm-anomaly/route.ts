/**
 * Sprint 020 — POST /api/ai-incidents/from-pmm-anomaly
 *
 * Escalează o anomalie PMM (Sprint 019) către AI Incident Reporting Art. 73.
 * Body: { planId, anomalyId }
 *
 * Răspunde cu incidentul nou creat + planul PMM actualizat (bidirectional).
 */
import { NextResponse } from "next/server"

import { getOrgContext } from "@/lib/server/org-context"
import { escalateAnomalyToIncident } from "@/lib/server/pmm-store"
import { getIncidentById } from "@/lib/server/ai-incident-store"
import type { ComplianceEventActorInput } from "@/lib/compliance/events"

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

export async function POST(request: Request) {
  try {
    const ctx = await getOrgContext()
    const body = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >
    const planId = typeof body.planId === "string" ? body.planId.trim() : ""
    const anomalyId =
      typeof body.anomalyId === "string" ? body.anomalyId.trim() : ""
    if (!planId || !anomalyId) {
      return NextResponse.json(
        { error: "planId + anomalyId obligatorii." },
        { status: 400 },
      )
    }

    const result = await escalateAnomalyToIncident(
      ctx.orgId,
      planId,
      anomalyId,
      actorFromContext(ctx),
      ctx.orgName ?? "Organizația",
    )

    const incident = await getIncidentById(ctx.orgId, result.incidentId)
    return NextResponse.json(
      { incident, plan: result.plan },
      { status: 201 },
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : "Eroare necunoscută"
    return NextResponse.json(
      { error: `Nu am putut escalada anomalia PMM: ${message}` },
      { status: 500 },
    )
  }
}
