import { NextResponse } from "next/server"
import { nanoid } from "nanoid"

import { readState, writeState } from "@/lib/server/store"
import { syncAIActObligationFindings } from "@/lib/server/obligation-sync"
import { classifyAISystem, type AIActRiskLevel } from "@/lib/compliance/ai-act-classifier"
import { getOrgContext } from "@/lib/server/org-context"
import { evaluateAndMergeNis2Findings } from "@/lib/server/ai-regulatory-scope-store"
import type { ComplianceEventActorInput } from "@/lib/compliance/events"
import type {
  AISystemNis2Scope,
  AISystemRecord,
  AISystemRiskLevel,
} from "@/lib/compliance/types"

function mapRiskLevel(level: AIActRiskLevel): AISystemRiskLevel {
  if (level === "high_risk" || level === "prohibited") return "high"
  if (level === "limited_risk") return "limited"
  return "minimal"
}

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

function normNis2Scope(raw: unknown): AISystemNis2Scope | undefined {
  if (!raw || typeof raw !== "object") return undefined
  const r = raw as Record<string, unknown>
  if (typeof r.inScope !== "boolean") return undefined
  return {
    inScope: r.inScope,
    service: typeof r.service === "string" ? r.service.trim() || undefined : undefined,
    assessmentNote:
      typeof r.assessmentNote === "string"
        ? r.assessmentNote.trim() || undefined
        : undefined,
    evaluatedAtISO:
      typeof r.evaluatedAtISO === "string" ? r.evaluatedAtISO : undefined,
  }
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
      nis2EntityScope,
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
      nis2EntityScope: normNis2Scope(nis2EntityScope),
    }

    const state = await readState()
    state.aiSystems.push(system)
    await writeState(state)

    // Sync obligation findings in background (async, best-effort)
    void syncAIActObligationFindings(system, nowISO).catch(() => {})

    // Sprint 012 — wire NIS2 AI rules dacă sistemul e marcat in-scope.
    if (system.nis2EntityScope?.inScope) {
      try {
        const ctx = await getOrgContext()
        await evaluateAndMergeNis2Findings(ctx.orgId, system, actorFromContext(ctx))
      } catch {
        // Ne-fatal.
      }
    }

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
