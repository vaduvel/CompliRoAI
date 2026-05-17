/**
 * Sprint 017 — POST /api/oversight/trigger-check
 *
 * Body: { systemId: string }
 * Returnează rezultatul `evaluateOversightRequirement` pentru sistemul AI vizat,
 * inclusiv două-persoane-rule (Art. 14(4)) dacă biometric ID.
 */
import { NextResponse } from "next/server"

import { evaluateOversightRequirement } from "@/lib/compliance/oversight-trigger"
import { getOrgContext } from "@/lib/server/org-context"
import { readOversightProtocols } from "@/lib/server/oversight-store"
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
    // Caută ultima aprobare a unui protocol pentru sistem
    const { records } = await readOversightProtocols(ctx.orgId)
    const protocolsForSystem = records.filter(
      (r) => r.linkedAISystemId === systemId && r.approvedAtISO,
    )
    const lastApprovedISO = protocolsForSystem
      .map((r) => r.approvedAtISO!)
      .sort()
      .pop()

    const trigger = evaluateOversightRequirement({ system, lastApprovedISO })
    return NextResponse.json({
      systemId,
      systemName: system.name,
      trigger,
      hasApprovedProtocol: Boolean(lastApprovedISO),
      lastApprovedISO,
    })
  } catch {
    return NextResponse.json(
      { error: "Nu am putut verifica trigger-ul Oversight." },
      { status: 500 },
    )
  }
}
