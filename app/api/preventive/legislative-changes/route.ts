/**
 * Sprint 022 — GET /api/preventive/legislative-changes  + POST acknowledge
 *
 * GET: returns LEGISLATIVE_CHANGE_LOG + acknowledgments + per-change status.
 * POST: body `{ changeId, action?: string, notes? }` → marks ack pentru org curent.
 */

import { NextResponse } from "next/server"

import {
  appendComplianceEvents,
  createComplianceEvent,
} from "@/lib/compliance/events"
import { LEGISLATIVE_CHANGE_LOG } from "@/lib/compliance/legislative-change-log"
import { getOrgContext } from "@/lib/server/org-context"
import { mutateFreshStateForOrg, readState } from "@/lib/server/store"
import type { LegislativeChangeAcknowledgment } from "@/lib/compliance/types"

export async function GET() {
  try {
    await getOrgContext()
    const state = await readState()
    const acks = state.legislativeChangeAcknowledgments ?? []
    const ackById = new Map(acks.map((a) => [a.changeId, a]))
    const enriched = LEGISLATIVE_CHANGE_LOG.map((c) => ({
      ...c,
      acknowledged: ackById.has(c.id),
      acknowledgment: ackById.get(c.id) ?? null,
    }))
    return NextResponse.json({
      changes: enriched,
      count: enriched.length,
      baselineISO: state.legislativeBaselineISO ?? null,
    })
  } catch {
    return NextResponse.json(
      { error: "Nu am putut citi legislative changes." },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getOrgContext()
    const body = (await request.json()) as {
      changeId?: string
      actionPlan?: string
      notes?: string
    }
    if (!body.changeId)
      return NextResponse.json(
        { error: "changeId obligatoriu." },
        { status: 400 },
      )
    const change = LEGISLATIVE_CHANGE_LOG.find((c) => c.id === body.changeId)
    if (!change)
      return NextResponse.json(
        { error: "Modificare legislativă necunoscută." },
        { status: 404 },
      )
    const ack: LegislativeChangeAcknowledgment = {
      changeId: body.changeId,
      orgId: ctx.orgId,
      acknowledgedAtISO: new Date().toISOString(),
      acknowledgedByEmail: ctx.email,
      actionPlan: body.actionPlan,
      notes: body.notes,
    }
    await mutateFreshStateForOrg(ctx.orgId, (state) => {
      const existing = state.legislativeChangeAcknowledgments ?? []
      const without = existing.filter((a) => a.changeId !== body.changeId)
      const event = createComplianceEvent(
        {
          type: "preventive.legislative_acknowledged",
          entityType: "system",
          entityId: body.changeId!,
          message: `Acknowledged: ${change.title}`,
          createdAtISO: ack.acknowledgedAtISO,
          metadata: {
            regulation: change.regulation,
            impact: change.impact,
            actionPlan: body.actionPlan ?? "",
          },
        },
        {
          id: ctx.userId,
          role: "compliance",
          source: "session",
          label: ctx.email,
        },
      )
      return {
        ...state,
        legislativeChangeAcknowledgments: [...without, ack],
        events: appendComplianceEvents(state, [event]),
      }
    })
    return NextResponse.json({ acknowledgment: ack })
  } catch {
    return NextResponse.json(
      { error: "Nu am putut acknowledge legislative change." },
      { status: 500 },
    )
  }
}
