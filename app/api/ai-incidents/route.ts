/**
 * Sprint 020 — AI Incidents list + create.
 *
 * GET  /api/ai-incidents
 *   ?status=draft&category=widespread_infringement&severity=catastrophic&linkedAISystemId=sys-1
 *   → { records, summary, schema }
 * POST /api/ai-incidents
 *   → creează AIIncident nou (rulează evaluator + emite findings)
 */
import { NextResponse } from "next/server"

import {
  AI_INCIDENT_CATEGORY_OPTIONS,
  AI_INCIDENT_SCHEMA_V1,
  AI_INCIDENT_SEVERITY_OPTIONS,
  AI_INCIDENT_STATUS_OPTIONS,
} from "@/lib/compliance/ai-incident-schema"
import { getOrgContext } from "@/lib/server/org-context"
import {
  createIncident,
  readAIIncidents,
  summarizeAIIncidents,
  type CreateAIIncidentInput,
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

function sanitizeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return (value as unknown[])
    .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
    .map((s) => s.trim())
}

export async function GET(request: Request) {
  try {
    const ctx = await getOrgContext()
    const { records } = await readAIIncidents(ctx.orgId)

    const url = new URL(request.url)
    const filterStatus = url.searchParams.get("status")
    const filterCategory = url.searchParams.get("category")
    const filterSeverity = url.searchParams.get("severity")
    const filterSystem = url.searchParams.get("linkedAISystemId")

    let filtered = records
    if (
      filterStatus &&
      AI_INCIDENT_STATUS_OPTIONS.includes(filterStatus as AIIncidentStatus)
    ) {
      filtered = filtered.filter((r) => r.status === filterStatus)
    }
    if (
      filterCategory &&
      AI_INCIDENT_CATEGORY_OPTIONS.includes(
        filterCategory as AIIncidentCategory,
      )
    ) {
      filtered = filtered.filter((r) => r.category === filterCategory)
    }
    if (
      filterSeverity &&
      AI_INCIDENT_SEVERITY_OPTIONS.includes(
        filterSeverity as AIIncidentSeverity,
      )
    ) {
      filtered = filtered.filter((r) => r.severity === filterSeverity)
    }
    if (filterSystem) {
      filtered = filtered.filter((r) => r.linkedAISystemId === filterSystem)
    }

    return NextResponse.json({
      records: filtered,
      summary: summarizeAIIncidents(records),
      schema: AI_INCIDENT_SCHEMA_V1,
    })
  } catch {
    return NextResponse.json(
      { error: "Nu am putut citi registrul de incidente AI." },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getOrgContext()
    const body = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >

    const title = typeof body.title === "string" ? body.title.trim() : ""
    if (!title) {
      return NextResponse.json(
        { error: "Titlul incidentului este obligatoriu." },
        { status: 400 },
      )
    }
    const description =
      typeof body.description === "string" ? body.description.trim() : ""
    if (!description) {
      return NextResponse.json(
        { error: "Descrierea incidentului este obligatorie." },
        { status: 400 },
      )
    }
    if (
      typeof body.category !== "string" ||
      !AI_INCIDENT_CATEGORY_OPTIONS.includes(body.category as AIIncidentCategory)
    ) {
      return NextResponse.json(
        { error: "category invalid (vezi Art. 73(2) — 6 opțiuni)." },
        { status: 400 },
      )
    }
    if (
      typeof body.severity !== "string" ||
      !AI_INCIDENT_SEVERITY_OPTIONS.includes(body.severity as AIIncidentSeverity)
    ) {
      return NextResponse.json(
        { error: "severity invalid (minor/moderate/serious/catastrophic)." },
        { status: 400 },
      )
    }
    const linkedAISystemId =
      typeof body.linkedAISystemId === "string"
        ? body.linkedAISystemId.trim()
        : ""
    if (!linkedAISystemId) {
      return NextResponse.json(
        { error: "Sistemul AI legat (linkedAISystemId) este obligatoriu." },
        { status: 400 },
      )
    }

    const input: CreateAIIncidentInput = {
      title,
      description,
      category: body.category as AIIncidentCategory,
      severity: body.severity as AIIncidentSeverity,
      linkedAISystemId,
      affectedSubjectsCategories: sanitizeStringList(
        body.affectedSubjectsCategories,
      ),
      affectedSubjectsCount:
        typeof body.affectedSubjectsCount === "number" &&
        Number.isFinite(body.affectedSubjectsCount)
          ? body.affectedSubjectsCount
          : undefined,
      occurredAtISO:
        typeof body.occurredAtISO === "string"
          ? body.occurredAtISO
          : undefined,
      detectedAtISO:
        typeof body.detectedAtISO === "string"
          ? body.detectedAtISO
          : undefined,
      notificationRequired:
        typeof body.notificationRequired === "boolean"
          ? body.notificationRequired
          : undefined,
      assignedToEmail:
        typeof body.assignedToEmail === "string"
          ? body.assignedToEmail
          : undefined,
      linkedBreachId:
        typeof body.linkedBreachId === "string"
          ? body.linkedBreachId
          : undefined,
      linkedPmmAnomalyId:
        typeof body.linkedPmmAnomalyId === "string"
          ? body.linkedPmmAnomalyId
          : undefined,
      notes: typeof body.notes === "string" ? body.notes : undefined,
    }

    const record = await createIncident(
      ctx.orgId,
      input,
      actorFromContext(ctx),
      ctx.orgName ?? "Organizația",
    )
    const { summary } = await readAIIncidents(ctx.orgId)
    return NextResponse.json({ record, summary }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Eroare necunoscută"
    return NextResponse.json(
      { error: `Nu am putut crea incidentul AI: ${message}` },
      { status: 500 },
    )
  }
}
