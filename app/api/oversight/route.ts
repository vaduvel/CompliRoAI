/**
 * Sprint 017 — Oversight Protocol list + create.
 *
 * GET  /api/oversight   → { records, summary, schema }
 *   Filters: ?status=draft&completeness=incomplete&linkedAISystemId=sys-1
 * POST /api/oversight   → creează HumanOversightProtocol nou (rulează evaluator + emite findings)
 */
import { NextResponse } from "next/server"

import { OVERSIGHT_SCHEMA_V1 } from "@/lib/compliance/oversight-schema"
import { getOrgContext } from "@/lib/server/org-context"
import {
  createProtocol,
  readOversightProtocols,
  summarizeOversightProtocols,
  type CreateOversightInput,
} from "@/lib/server/oversight-store"
import type { ComplianceEventActorInput } from "@/lib/compliance/events"
import type {
  OversightCapability,
  OversightCompleteness,
  OversightModel,
  OversightProtocolStatus,
} from "@/lib/compliance/types"

const MODEL_VALUES: OversightModel[] = [
  "human_in_the_loop",
  "human_on_the_loop",
  "human_in_command",
  "two_person_rule",
  "hybrid",
]

const CAPABILITY_VALUES: OversightCapability[] = [
  "understand_capabilities",
  "aware_of_automation_bias",
  "interpret_output_correctly",
  "decide_not_to_use",
  "intervene_or_stop",
]

const STATUS_VALUES: OversightProtocolStatus[] = [
  "draft",
  "in_review",
  "approved",
  "active",
  "obsolete",
  "rejected",
]

const COMPLETENESS_VALUES: OversightCompleteness[] = [
  "incomplete",
  "partial",
  "complete",
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

function isModel(value: unknown): value is OversightModel {
  return typeof value === "string" && MODEL_VALUES.includes(value as OversightModel)
}

export async function GET(request: Request) {
  try {
    const ctx = await getOrgContext()
    const { records } = await readOversightProtocols(ctx.orgId)

    const url = new URL(request.url)
    const filterStatus = url.searchParams.get("status")
    const filterCompleteness = url.searchParams.get("completeness")
    const filterSystem = url.searchParams.get("linkedAISystemId")

    let filtered = records
    if (filterStatus && STATUS_VALUES.includes(filterStatus as OversightProtocolStatus)) {
      filtered = filtered.filter((r) => r.status === filterStatus)
    }
    if (
      filterCompleteness &&
      COMPLETENESS_VALUES.includes(filterCompleteness as OversightCompleteness)
    ) {
      filtered = filtered.filter((r) => r.completeness === filterCompleteness)
    }
    if (filterSystem) {
      filtered = filtered.filter((r) => r.linkedAISystemId === filterSystem)
    }

    return NextResponse.json({
      records: filtered,
      summary: summarizeOversightProtocols(records),
      schema: OVERSIGHT_SCHEMA_V1,
    })
  } catch {
    return NextResponse.json(
      { error: "Nu am putut citi registrul Oversight Protocols." },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getOrgContext()
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>

    const title = typeof body.title === "string" ? body.title.trim() : ""
    if (!title) {
      return NextResponse.json(
        { error: "Titlul protocolului este obligatoriu." },
        { status: 400 },
      )
    }
    const linkedAISystemId =
      typeof body.linkedAISystemId === "string" ? body.linkedAISystemId.trim() : ""
    if (!linkedAISystemId) {
      return NextResponse.json(
        { error: "Sistemul AI legat (linkedAISystemId) este obligatoriu." },
        { status: 400 },
      )
    }
    if (!isModel(body.oversightModel)) {
      return NextResponse.json(
        { error: "oversightModel invalid (Art. 14(2))." },
        { status: 400 },
      )
    }

    const capabilitiesCovered = Array.isArray(body.capabilitiesCovered)
      ? (body.capabilitiesCovered as unknown[]).filter((c): c is OversightCapability =>
          CAPABILITY_VALUES.includes(c as OversightCapability),
        )
      : []

    const input: CreateOversightInput = {
      title,
      linkedAISystemId,
      oversightModel: body.oversightModel,
      capabilitiesCovered,
      responsibleHumans: Array.isArray(body.responsibleHumans)
        ? (body.responsibleHumans as never)
        : [],
      escalationSteps: Array.isArray(body.escalationSteps)
        ? (body.escalationSteps as never)
        : [],
      contestationProcedure:
        body.contestationProcedure && typeof body.contestationProcedure === "object"
          ? (body.contestationProcedure as never)
          : undefined,
      stopProcedure:
        body.stopProcedure && typeof body.stopProcedure === "object"
          ? (body.stopProcedure as never)
          : undefined,
      evidenceChecklist: Array.isArray(body.evidenceChecklist)
        ? (body.evidenceChecklist as unknown[]).filter((s): s is string => typeof s === "string")
        : [],
      notes: typeof body.notes === "string" ? body.notes : undefined,
      nextReviewISO:
        typeof body.nextReviewISO === "string" ? body.nextReviewISO : undefined,
    }

    const record = await createProtocol(
      ctx.orgId,
      input,
      actorFromContext(ctx),
      ctx.orgName ?? "Organizația",
    )
    const { summary } = await readOversightProtocols(ctx.orgId)
    return NextResponse.json({ record, summary }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Eroare necunoscută"
    return NextResponse.json(
      { error: `Nu am putut crea protocolul Oversight: ${message}` },
      { status: 500 },
    )
  }
}
