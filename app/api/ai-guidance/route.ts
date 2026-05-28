import { NextResponse } from "next/server"

import type { ComplianceEventActorInput } from "@/lib/compliance/events"
import {
  acceptGuidancePlan,
  explainOmittedGuidanceAction,
  generateGuidancePlanForOrg,
  getLatestGuidancePlan,
  rejectGuidancePlan,
} from "@/lib/server/guidance-plan-store"
import { buildGuidancePlanFromOrchestrator } from "@/lib/server/ai-orchestrator/to-guidance-plan"
import { getOrgContext } from "@/lib/server/org-context"
import { readFreshStateForOrg } from "@/lib/server/store"

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

export async function GET(request: Request) {
  try {
    const ctx = await getOrgContext()
    const latest = await getLatestGuidancePlan(ctx.orgId)
    const state = await readFreshStateForOrg(ctx.orgId, ctx.orgName)
    const maxActions = readMaxActions(new URL(request.url).searchParams.get("maxActions"))
    const preview = await buildGuidancePlanFromOrchestrator({
      orgId: ctx.orgId,
      orgName: ctx.orgName || "Organizația curentă",
      state,
      workspaceMode: ctx.workspaceMode,
      user: { id: ctx.userId },
      preferMistral: false,
      maxActions,
    })

    return NextResponse.json({ latest, preview })
  } catch {
    return NextResponse.json(
      { error: "Nu am putut încărca planul AI Guidance." },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getOrgContext()
    const actor = actorFromContext(ctx)
    const body = await request.json().catch(() => ({}))
    const action = typeof body.action === "string" ? body.action : "regenerate"

    if (action === "regenerate") {
      const record = await generateGuidancePlanForOrg(ctx.orgId, {
        actor,
        orgName: ctx.orgName || "Organizația curentă",
        workspaceMode: ctx.workspaceMode,
        nowISO: typeof body.nowISO === "string" ? body.nowISO : undefined,
        reason: typeof body.reason === "string" ? body.reason : "manual_regenerate",
        maxActions: readMaxActions(body.maxActions),
        mistral: readMistralOverrides(body),
      })
      return NextResponse.json({ record })
    }

    if (action === "accept") {
      const recordId = readRecordId(body)
      const record = await acceptGuidancePlan(ctx.orgId, recordId, actor)
      return NextResponse.json({ record })
    }

    if (action === "reject") {
      const recordId = readRecordId(body)
      const note = typeof body.note === "string" ? body.note : undefined
      const record = await rejectGuidancePlan(ctx.orgId, recordId, actor, note)
      return NextResponse.json({ record })
    }

    if (action === "explain-omitted") {
      const recordId = readRecordId(body)
      const actionId = typeof body.actionId === "string" ? body.actionId : ""
      if (!actionId) {
        return NextResponse.json(
          { error: "actionId este obligatoriu." },
          { status: 400 },
        )
      }
      const explanation = await explainOmittedGuidanceAction(ctx.orgId, recordId, actionId)
      return NextResponse.json({ explanation })
    }

    return NextResponse.json(
      { error: "Acțiune AI Guidance necunoscută." },
      { status: 400 },
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nu am putut actualiza planul AI Guidance."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

function readRecordId(body: Record<string, unknown>): string {
  const recordId = typeof body.recordId === "string" ? body.recordId : ""
  if (!recordId) throw new Error("recordId este obligatoriu.")
  return recordId
}

function readMaxActions(value: unknown): number | undefined {
  const numeric = typeof value === "number" ? value : Number(value)
  if (!Number.isFinite(numeric)) return undefined
  return Math.max(1, Math.min(12, Math.trunc(numeric)))
}

function readMistralOverrides(body: Record<string, unknown>) {
  const model = typeof body.mistralModel === "string" && body.mistralModel.trim()
    ? body.mistralModel.trim()
    : undefined
  const timeoutMs = readBoundedInteger(body.mistralTimeoutMs, 5_000, 180_000)
  const maxTokens = readBoundedInteger(body.mistralMaxTokens, 400, 4_000)

  if (!model && timeoutMs === undefined && maxTokens === undefined) return undefined
  return { model, timeoutMs, maxTokens }
}

function readBoundedInteger(value: unknown, min: number, max: number): number | undefined {
  const numeric = typeof value === "number" ? value : Number(value)
  if (!Number.isFinite(numeric)) return undefined
  return Math.max(min, Math.min(max, Math.trunc(numeric)))
}
