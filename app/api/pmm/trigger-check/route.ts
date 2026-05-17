/**
 * Sprint 019 — POST /api/pmm/trigger-check
 *
 * Body: { systemId: string }
 * Returnează rezultatul `evaluatePmmRequirement` pentru sistemul AI vizat,
 * incluzând recomandarea ciclului (monthly/quarterly/biannual/annual) și
 * urgența (before_use / periodic_review / none).
 */
import { NextResponse } from "next/server"

import { evaluatePmmRequirement } from "@/lib/compliance/pmm-trigger"
import { getOrgContext } from "@/lib/server/org-context"
import { readPmmPlans } from "@/lib/server/pmm-store"
import { readState } from "@/lib/server/store"

export async function POST(request: Request) {
  try {
    const ctx = await getOrgContext()
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const systemId = typeof body.systemId === "string" ? body.systemId.trim() : ""
    if (!systemId) {
      return NextResponse.json(
        { error: "systemId este obligatoriu." },
        { status: 400 },
      )
    }
    const state = await readState()
    const system = state.aiSystems?.find((s) => s.id === systemId)
    if (!system) {
      return NextResponse.json(
        { error: "Sistemul AI nu a fost găsit în inventar." },
        { status: 404 },
      )
    }
    // Caută ultima aprobare a unui plan pentru sistem
    const { records } = await readPmmPlans(ctx.orgId)
    const plansForSystem = records.filter(
      (r) => r.linkedAISystemId === systemId && r.approvedAtISO,
    )
    const lastApprovedISO = plansForSystem
      .map((r) => r.approvedAtISO!)
      .sort()
      .pop()

    const trigger = evaluatePmmRequirement({ system, lastApprovedISO })
    return NextResponse.json({
      systemId,
      systemName: system.name,
      trigger,
      hasApprovedPlan: Boolean(lastApprovedISO),
      lastApprovedISO,
    })
  } catch {
    return NextResponse.json(
      { error: "Nu am putut verifica trigger-ul PMM." },
      { status: 500 },
    )
  }
}
