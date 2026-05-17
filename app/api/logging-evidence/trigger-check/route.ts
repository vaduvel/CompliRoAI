/**
 * Sprint 018 — POST /api/logging-evidence/trigger-check
 *
 * Body: { systemId: string }
 * Returnează rezultatul `evaluateLoggingRequirement` pentru sistemul AI vizat,
 * inclusiv biometric_full (Art. 12(3)) și minRetentionMonths (Art. 26(6)).
 */
import { NextResponse } from "next/server"

import { evaluateLoggingRequirement } from "@/lib/compliance/logging-trigger"
import { getOrgContext } from "@/lib/server/org-context"
import { readLoggingConfigs } from "@/lib/server/logging-evidence-store"
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
    // Caută ultima aprobare a unui config pentru sistem
    const { records } = await readLoggingConfigs(ctx.orgId)
    const configsForSystem = records.filter(
      (r) => r.linkedAISystemId === systemId && r.approvedAtISO,
    )
    const lastApprovedISO = configsForSystem
      .map((r) => r.approvedAtISO!)
      .sort()
      .pop()

    const trigger = evaluateLoggingRequirement({ system, lastApprovedISO })
    return NextResponse.json({
      systemId,
      systemName: system.name,
      trigger,
      hasApprovedConfig: Boolean(lastApprovedISO),
      lastApprovedISO,
    })
  } catch {
    return NextResponse.json(
      { error: "Nu am putut verifica trigger-ul Logging." },
      { status: 500 },
    )
  }
}
