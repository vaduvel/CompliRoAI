/**
 * Sprint 008C — DPIA screening endpoint (evaluate-only sau evaluate+save).
 *
 * GET  /api/dpia/screening                    -> { schema }
 * POST /api/dpia/screening                    -> { evaluation } (evaluare pura, fara save)
 * POST /api/dpia/screening?save=1             -> { record, evaluation, linkedFindingId }
 *                                                cand acceptFinding=true,
 *                                                emite ScanFinding GDPR pentru cockpit.
 *
 * Body (POST):
 *   {
 *     processName: string,         // OBLIGATORIU
 *     department?: string,
 *     ownerName?: string,
 *     description?: string,
 *     answers: { [questionId]: boolean | string },
 *     acceptFinding?: boolean,     // doar daca save=1
 *     owner?: string,              // doar daca save=1
 *     dueAtISO?: string,           // doar daca save=1
 *   }
 */
import { NextResponse } from "next/server"

import { getOrgContext } from "@/lib/server/org-context"
import {
  createDpiaFromScreening,
  evaluateScreening,
  getDpiaSchema,
} from "@/lib/server/dpia-store"
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

export async function GET() {
  return NextResponse.json({ schema: getDpiaSchema() })
}

export async function POST(request: Request) {
  try {
    const ctx = await getOrgContext()
    const url = new URL(request.url)
    const save = url.searchParams.get("save") === "1"
    const body = await request.json().catch(() => ({}))

    const processName = typeof body.processName === "string" ? body.processName.trim() : ""
    if (!processName) {
      return NextResponse.json(
        { error: "Numele procesului este obligatoriu." },
        { status: 400 },
      )
    }
    const answers =
      body.answers && typeof body.answers === "object"
        ? (body.answers as Record<string, unknown>)
        : {}

    const screeningInput = {
      processName,
      department: typeof body.department === "string" ? body.department.trim() : undefined,
      ownerName: typeof body.ownerName === "string" ? body.ownerName.trim() : undefined,
      description: typeof body.description === "string" ? body.description.trim() : undefined,
      answers: answers as Record<string, boolean | string | string[] | undefined>,
    }

    if (!save) {
      const evaluation = evaluateScreening(screeningInput)
      return NextResponse.json({ evaluation })
    }

    const result = await createDpiaFromScreening(
      ctx.orgId,
      screeningInput,
      actorFromContext(ctx),
      {
        acceptFinding: Boolean(body.acceptFinding),
        owner: typeof body.owner === "string" ? body.owner.trim() : undefined,
        dueAtISO: typeof body.dueAtISO === "string" ? body.dueAtISO : undefined,
      },
    )

    return NextResponse.json(
      {
        record: result.record,
        evaluation: result.evaluation,
        linkedFindingId: result.linkedFindingId,
      },
      { status: 201 },
    )
  } catch {
    return NextResponse.json(
      { error: "Nu am putut procesa screening-ul DPIA." },
      { status: 500 },
    )
  }
}
