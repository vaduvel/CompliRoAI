/**
 * Sprint 012 — /api/ai-regulatory-scope
 *
 * GET  → returnează summary (profile + scoped vendors + scoped AI systems
 *        + recent findings DORA/NIS2 + stats).
 * POST → org self-declaration: actualizează profile + emite findings de
 *        review când orgul devine in-scope.
 */

import { NextResponse } from "next/server"

import { getOrgContext } from "@/lib/server/org-context"
import {
  getRegulatoryScopeSummary,
  isDoraEntityType,
  isNis2EntityClass,
  isNis2Sector,
  updateRegulatoryProfile,
  type UpdateRegulatoryProfileInput,
} from "@/lib/server/ai-regulatory-scope-store"
import type { ComplianceEventActorInput } from "@/lib/compliance/events"
import type { Nis2Sector } from "@/lib/compliance/types"

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
  try {
    const ctx = await getOrgContext()
    const summary = await getRegulatoryScopeSummary(ctx.orgId)
    return NextResponse.json(summary)
  } catch {
    return NextResponse.json(
      { error: "Nu am putut citi profilul regulator." },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getOrgContext()
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>

    const sectorsRaw = Array.isArray(body.nis2Sectors) ? body.nis2Sectors : []
    const sectors: Nis2Sector[] = sectorsRaw.filter(isNis2Sector)

    const patch: UpdateRegulatoryProfileInput = {
      doraApplies:
        typeof body.doraApplies === "boolean" ? body.doraApplies : undefined,
      doraEntityType: isDoraEntityType(body.doraEntityType)
        ? body.doraEntityType
        : undefined,
      doraEntityRegistrationNumber:
        typeof body.doraEntityRegistrationNumber === "string"
          ? body.doraEntityRegistrationNumber
          : undefined,
      nis2EntityClass: isNis2EntityClass(body.nis2EntityClass)
        ? body.nis2EntityClass
        : undefined,
      nis2Sectors: body.nis2Sectors !== undefined ? sectors : undefined,
      nis2DnscRegistrationNumber:
        typeof body.nis2DnscRegistrationNumber === "string"
          ? body.nis2DnscRegistrationNumber
          : undefined,
      notes: typeof body.notes === "string" ? body.notes : undefined,
    }

    const profile = await updateRegulatoryProfile(
      ctx.orgId,
      patch,
      actorFromContext(ctx),
    )
    const summary = await getRegulatoryScopeSummary(ctx.orgId)
    return NextResponse.json({ profile, summary })
  } catch {
    return NextResponse.json(
      { error: "Nu am putut actualiza profilul regulator." },
      { status: 500 },
    )
  }
}
