import { NextResponse } from "next/server"
import { nanoid } from "nanoid"

import { readState, writeState } from "@/lib/server/store"
import { syncAIActObligationFindings } from "@/lib/server/obligation-sync"
import { classifyAISystem, type AIActRiskLevel } from "@/lib/compliance/ai-act-classifier"
import type { AISystemRecord, AISystemRiskLevel } from "@/lib/compliance/types"

function mapRiskLevel(level: AIActRiskLevel): AISystemRiskLevel {
  if (level === "high_risk" || level === "prohibited") return "high"
  if (level === "limited_risk") return "limited"
  return "minimal"
}

export async function GET() {
  try {
    const state = await readState()
    return NextResponse.json({ systems: state.aiSystems })
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      name,
      purpose,
      vendor,
      modelType,
      usesPersonalData,
      makesAutomatedDecisions,
      impactsRights,
      hasHumanReview,
    } = body

    if (!name || !purpose) {
      return NextResponse.json(
        { error: "name și purpose sunt obligatorii" },
        { status: 400 }
      )
    }

    const classification = classifyAISystem(purpose)
    const nowISO = new Date().toISOString()

    const system: AISystemRecord = {
      id: nanoid(),
      name,
      purpose,
      vendor: vendor ?? "",
      modelType: modelType ?? "",
      usesPersonalData: !!usesPersonalData,
      makesAutomatedDecisions: !!makesAutomatedDecisions,
      impactsRights: !!impactsRights,
      hasHumanReview: !!hasHumanReview,
      riskLevel: mapRiskLevel(classification.riskLevel),
      annexIIIHint: classification.article.startsWith("Annex") ? classification.article : undefined,
      recommendedActions: classification.requiredActions,
      createdAtISO: nowISO,
      approvalStatus: "pending",
      policyAttestationStatus: "not-attested",
    }

    const state = await readState()
    state.aiSystems.push(system)
    await writeState(state)

    // Sync obligation findings in background (async, best-effort)
    void syncAIActObligationFindings(system, nowISO).catch(() => {})

    return NextResponse.json({ system })
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    if (!id) return NextResponse.json({ error: "id lipsește" }, { status: 400 })

    const state = await readState()
    state.aiSystems = state.aiSystems.filter((s) => s.id !== id)
    await writeState(state)

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
