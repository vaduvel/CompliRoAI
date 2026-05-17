/**
 * Sprint 019 — POST /api/pmm/:id/version-change
 *
 * Body: {
 *   oldVersion: string,
 *   newVersion: string,
 *   changeType: "model_retrain" | "model_swap" | "fine_tune" | "config_update" |
 *               "prompt_update" | "data_source_change" | "infrastructure" | "other",
 *   substantialModification: boolean,   // Art. 43(4) trigger
 *   riskReassessmentRequired: boolean,
 *   description: string,
 *   changedByEmail: string,
 *   approvedByEmail?: string,
 *   notes?: string,
 *   changedAtISO?: string
 * }
 *
 * Dacă substantialModification + riskReassessmentRequired și NU există review
 * follow-up în 30 zile (sau changedAtISO este vechi > 30 zile fără follow-up),
 * evaluator-ul emite finding CRITICAL Art. 43(4).
 */
import { NextResponse } from "next/server"

import { getOrgContext } from "@/lib/server/org-context"
import {
  recordVersionChange,
  type RecordVersionChangeInput,
} from "@/lib/server/pmm-store"
import type { ComplianceEventActorInput } from "@/lib/compliance/events"
import type { PmmVersionChangeType } from "@/lib/compliance/types"

const CHANGE_TYPES: PmmVersionChangeType[] = [
  "model_retrain",
  "model_swap",
  "fine_tune",
  "config_update",
  "prompt_update",
  "data_source_change",
  "infrastructure",
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

    const oldVersion = typeof body.oldVersion === "string" ? body.oldVersion.trim() : ""
    const newVersion = typeof body.newVersion === "string" ? body.newVersion.trim() : ""
    if (!oldVersion || !newVersion) {
      return NextResponse.json(
        { error: "oldVersion și newVersion sunt obligatorii." },
        { status: 400 },
      )
    }
    if (
      typeof body.changeType !== "string" ||
      !CHANGE_TYPES.includes(body.changeType as PmmVersionChangeType)
    ) {
      return NextResponse.json(
        { error: "changeType invalid." },
        { status: 400 },
      )
    }
    if (typeof body.substantialModification !== "boolean") {
      return NextResponse.json(
        { error: "substantialModification (boolean) este obligatoriu (Art. 43(4) trigger)." },
        { status: 400 },
      )
    }
    if (typeof body.riskReassessmentRequired !== "boolean") {
      return NextResponse.json(
        { error: "riskReassessmentRequired (boolean) este obligatoriu." },
        { status: 400 },
      )
    }
    const description =
      typeof body.description === "string" ? body.description.trim() : ""
    if (!description) {
      return NextResponse.json(
        { error: "description este obligatorie." },
        { status: 400 },
      )
    }
    const changedByEmail =
      typeof body.changedByEmail === "string"
        ? body.changedByEmail.trim()
        : ctx.email
    if (!changedByEmail || !changedByEmail.includes("@")) {
      return NextResponse.json(
        { error: "Email changedBy invalid." },
        { status: 400 },
      )
    }

    const input: RecordVersionChangeInput = {
      oldVersion,
      newVersion,
      changeType: body.changeType as PmmVersionChangeType,
      substantialModification: body.substantialModification,
      riskReassessmentRequired: body.riskReassessmentRequired,
      description,
      changedByEmail,
      approvedByEmail:
        typeof body.approvedByEmail === "string"
          ? body.approvedByEmail.trim() || undefined
          : undefined,
      notes: typeof body.notes === "string" ? body.notes : undefined,
      changedAtISO:
        typeof body.changedAtISO === "string" ? body.changedAtISO : undefined,
    }

    const updated = await recordVersionChange(
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
      { error: `Nu am putut înregistra schimbarea de versiune: ${message}` },
      { status: 500 },
    )
  }
}
