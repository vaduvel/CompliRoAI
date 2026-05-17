/**
 * Sprint 019 — POST /api/pmm/:id/anomaly
 *
 * Body: {
 *   severity: "low" | "medium" | "high" | "critical",
 *   category: "performance_drop" | "bias_drift" | "data_drift" | "concept_drift" |
 *             "system_error" | "user_complaint" | "security" | "other",
 *   description: string,
 *   impactDescription: string,
 *   detectedByEmail?: string,
 *   resolved?: boolean,
 *   resolvedAtISO?: string,
 *   escalatedToIncident?: boolean,
 *   linkedIncidentId?: string,
 *   notes?: string,
 *   detectedAtISO?: string
 * }
 *
 * Anomalie critical + resolved=false → emite IMEDIAT finding via createFinding
 * (Art. 72(4) + hook escaladare Sprint 020 Art. 73).
 */
import { NextResponse } from "next/server"

import { getOrgContext } from "@/lib/server/org-context"
import {
  recordAnomaly,
  type RecordAnomalyInput,
} from "@/lib/server/pmm-store"
import type { ComplianceEventActorInput } from "@/lib/compliance/events"
import type {
  PmmAnomalyCategory,
  PmmAnomalySeverity,
} from "@/lib/compliance/types"

const SEVERITIES: PmmAnomalySeverity[] = ["low", "medium", "high", "critical"]
const CATEGORIES: PmmAnomalyCategory[] = [
  "performance_drop",
  "bias_drift",
  "data_drift",
  "concept_drift",
  "system_error",
  "user_complaint",
  "security",
  "other",
]

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
    const { id } = await params
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>

    if (
      typeof body.severity !== "string" ||
      !SEVERITIES.includes(body.severity as PmmAnomalySeverity)
    ) {
      return NextResponse.json(
        { error: "severity invalid (low/medium/high/critical)." },
        { status: 400 },
      )
    }
    if (
      typeof body.category !== "string" ||
      !CATEGORIES.includes(body.category as PmmAnomalyCategory)
    ) {
      return NextResponse.json(
        { error: "category invalid." },
        { status: 400 },
      )
    }
    const description =
      typeof body.description === "string" ? body.description.trim() : ""
    if (description.length < 3) {
      return NextResponse.json(
        { error: "description obligatorie (min 3 caractere)." },
        { status: 400 },
      )
    }
    const impactDescription =
      typeof body.impactDescription === "string"
        ? body.impactDescription.trim()
        : ""
    if (!impactDescription) {
      return NextResponse.json(
        { error: "impactDescription este obligatorie." },
        { status: 400 },
      )
    }

    const input: RecordAnomalyInput = {
      severity: body.severity as PmmAnomalySeverity,
      category: body.category as PmmAnomalyCategory,
      description,
      impactDescription,
      detectedByEmail:
        typeof body.detectedByEmail === "string"
          ? body.detectedByEmail.trim() || undefined
          : ctx.email,
      resolved: body.resolved === true,
      resolvedAtISO:
        typeof body.resolvedAtISO === "string" ? body.resolvedAtISO : undefined,
      escalatedToIncident: body.escalatedToIncident === true,
      linkedIncidentId:
        typeof body.linkedIncidentId === "string"
          ? body.linkedIncidentId.trim() || undefined
          : undefined,
      notes: typeof body.notes === "string" ? body.notes : undefined,
      detectedAtISO:
        typeof body.detectedAtISO === "string" ? body.detectedAtISO : undefined,
    }

    const updated = await recordAnomaly(
      ctx.orgId,
      id,
      input,
      actorFromContext(ctx),
      ctx.orgName ?? "Organizația",
    )
    if (!updated) {
      return NextResponse.json({ error: "Plan PMM inexistent." }, { status: 404 })
    }
    return NextResponse.json({ record: updated })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Eroare necunoscută"
    return NextResponse.json(
      { error: `Nu am putut înregistra anomalia: ${message}` },
      { status: 500 },
    )
  }
}
