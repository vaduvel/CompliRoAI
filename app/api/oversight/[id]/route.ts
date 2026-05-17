/**
 * Sprint 017 — Oversight Protocol single record: GET / PATCH / DELETE.
 */
import { NextResponse } from "next/server"

import { getOrgContext } from "@/lib/server/org-context"
import {
  deleteProtocol,
  getOversightProtocolById,
  isOversightStatus,
  updateProtocol,
  type UpdateOversightPatch,
} from "@/lib/server/oversight-store"
import type { ComplianceEventActorInput } from "@/lib/compliance/events"
import type { OversightCapability, OversightModel } from "@/lib/compliance/types"

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
    const record = await getOversightProtocolById(ctx.orgId, id)
    if (!record) {
      return NextResponse.json({ error: "Protocol inexistent." }, { status: 404 })
    }
    return NextResponse.json({ record })
  } catch {
    return NextResponse.json(
      { error: "Nu am putut citi protocolul Oversight." },
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
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>

    const patch: UpdateOversightPatch = {}
    if (typeof body.title === "string") patch.title = body.title
    if (
      typeof body.oversightModel === "string" &&
      MODEL_VALUES.includes(body.oversightModel as OversightModel)
    ) {
      patch.oversightModel = body.oversightModel as OversightModel
    }
    if (Array.isArray(body.capabilitiesCovered)) {
      patch.capabilitiesCovered = (body.capabilitiesCovered as unknown[]).filter(
        (c): c is OversightCapability =>
          CAPABILITY_VALUES.includes(c as OversightCapability),
      )
    }
    if (Array.isArray(body.responsibleHumans)) {
      patch.responsibleHumans = body.responsibleHumans as never
    }
    if (Array.isArray(body.escalationSteps)) {
      patch.escalationSteps = body.escalationSteps as never
    }
    if (body.contestationProcedure && typeof body.contestationProcedure === "object") {
      patch.contestationProcedure = body.contestationProcedure as never
    }
    if (body.stopProcedure && typeof body.stopProcedure === "object") {
      patch.stopProcedure = body.stopProcedure as never
    }
    if (Array.isArray(body.evidenceChecklist)) {
      patch.evidenceChecklist = (body.evidenceChecklist as unknown[]).filter(
        (s): s is string => typeof s === "string",
      )
    }
    if (typeof body.notes === "string") patch.notes = body.notes
    if (typeof body.nextReviewISO === "string") patch.nextReviewISO = body.nextReviewISO
    if (typeof body.status === "string" && isOversightStatus(body.status)) {
      patch.status = body.status
    }

    const updated = await updateProtocol(
      ctx.orgId,
      id,
      patch,
      actorFromContext(ctx),
      ctx.orgName ?? "Organizația",
    )
    if (!updated) {
      return NextResponse.json({ error: "Protocol inexistent." }, { status: 404 })
    }
    return NextResponse.json({ record: updated })
  } catch {
    return NextResponse.json(
      { error: "Nu am putut actualiza protocolul Oversight." },
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
    const removed = await deleteProtocol(ctx.orgId, id, actorFromContext(ctx))
    if (!removed) {
      return NextResponse.json({ error: "Protocol inexistent." }, { status: 404 })
    }
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json(
      { error: "Nu am putut șterge protocolul Oversight." },
      { status: 500 },
    )
  }
}
