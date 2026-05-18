/**
 * Sprint 020 — POST /api/pmm/:id/anomaly/escalate
 *
 * Conveniență per-plan: escalează o anomalie din planul PMM `:id` spre AI
 * Incident Reporting (Art. 73). Echivalentă funcțional cu
 * POST /api/ai-incidents/from-pmm-anomaly { planId, anomalyId }, dar oferă
 * o rută mai naturală din UI-ul PMM unde planul este deja contextul curent.
 *
 * Body: { anomalyId }
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

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await getOrgContext()
    const { id: planId } = await params
    const body = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >
    const anomalyId =
      typeof body.anomalyId === "string" ? body.anomalyId.trim() : ""
    if (!anomalyId) {
      return NextResponse.json(
        { error: "anomalyId obligatoriu." },
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
