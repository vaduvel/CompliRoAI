/**
 * Sprint 013 — Approval Queue per-item API
 * GET /api/approvals/[id] → returnează request
 * PATCH /api/approvals/[id] body { action: "approve"|"reject"|"withdraw", comment? }
 */
import { NextResponse } from "next/server"

import { getOrgContext } from "@/lib/server/org-context"
import {
  approveApprovalRequest,
  getApprovalRequestById,
  rejectApprovalRequest,
  withdrawApprovalRequest,
} from "@/lib/server/approval-queue-store"
import type { ComplianceEventActorInput } from "@/lib/compliance/events"

const VALID_ACTIONS = new Set(["approve", "reject", "withdraw"])

function actorFrom(ctx: Awaited<ReturnType<typeof getOrgContext>>): ComplianceEventActorInput {
  return {
    id: ctx.userId,
    label: ctx.email,
    role: "compliance",
    source: "session",
  }
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await getOrgContext()
    const { id } = await context.params
    const request = await getApprovalRequestById(ctx.orgId, id)
    if (!request) {
      return NextResponse.json({ error: "Cererea nu a fost găsită." }, { status: 404 })
    }
    return NextResponse.json({ request })
  } catch (err) {
    console.error("[approvals.GET id]", err)
    return NextResponse.json(
      { error: "Nu am putut încărca cererea." },
      { status: 500 },
    )
  }
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await getOrgContext()
    const { id } = await context.params
    const body = (await req.json()) as {
      action?: string
      comment?: string
    }

    if (!body.action || !VALID_ACTIONS.has(body.action)) {
      return NextResponse.json(
        { error: "action trebuie să fie approve | reject | withdraw." },
        { status: 400 },
      )
    }

    const decision = {
      reviewerEmail: ctx.email,
      reviewComment: typeof body.comment === "string" ? body.comment : undefined,
    }
    const actor = actorFrom(ctx)

    if (body.action === "approve") {
      const result = await approveApprovalRequest(ctx.orgId, id, decision, actor)
      if (!result) {
        return NextResponse.json(
          { error: "Cererea nu există sau nu mai este în stare pending." },
          { status: 404 },
        )
      }
      return NextResponse.json(result)
    }

    if (body.action === "reject") {
      const updated = await rejectApprovalRequest(ctx.orgId, id, decision, actor)
      if (!updated) {
        return NextResponse.json(
          { error: "Cererea nu există sau nu mai este în stare pending." },
          { status: 404 },
        )
      }
      return NextResponse.json({ request: updated })
    }

    const updated = await withdrawApprovalRequest(ctx.orgId, id, decision, actor)
    if (!updated) {
      return NextResponse.json(
        { error: "Cererea nu există sau nu mai este în stare pending." },
        { status: 404 },
      )
    }
    return NextResponse.json({ request: updated })
  } catch (err) {
    console.error("[approvals.PATCH id]", err)
    return NextResponse.json(
      { error: "Nu am putut procesa decizia." },
      { status: 500 },
    )
  }
}
