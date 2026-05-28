import {
  diffGuidancePlans,
  explainOmittedAction,
  type GuidanceAction,
  type GuidancePlan,
} from "@/lib/compliance/guidance-orchestrator"
import {
  appendComplianceEvents,
  createComplianceEvent,
  type ComplianceEventActorInput,
} from "@/lib/compliance/events"
import type {
  AIGuidancePlanRecord,
  AIGuidancePlanRecordStatus,
  ComplianceState,
} from "@/lib/compliance/types"
import type { WorkspaceMode } from "@/lib/server/auth"
import { buildGuidancePlanFromOrchestrator } from "@/lib/server/ai-orchestrator/to-guidance-plan"
import type { MistralOrchestratorRequest } from "@/lib/server/ai-orchestrator/mistral-client"
import { mutateFreshStateForOrg, readFreshStateForOrg } from "@/lib/server/store"

export type GenerateGuidancePlanInput = {
  actor: ComplianceEventActorInput
  orgName: string
  workspaceMode: WorkspaceMode
  nowISO?: string
  reason?: "initial" | "manual_regenerate" | "after_action" | "scheduled" | string
  maxActions?: number
  mistral?: Pick<MistralOrchestratorRequest, "model" | "timeoutMs" | "maxTokens">
}

export type OmittedGuidanceExplanation = {
  planId: string
  actionId: string
  reason: string
  action?: GuidanceAction
}

const MAX_STORED_PLANS = 50

export async function generateGuidancePlanForOrg(
  orgId: string,
  input: GenerateGuidancePlanInput,
): Promise<AIGuidancePlanRecord> {
  const nowISO = input.nowISO ?? new Date().toISOString()
  const state = await readFreshStateForOrg(orgId, input.orgName)
  const previousRecord = state.aiGuidancePlans?.[0]
  const plan = await buildGuidancePlanFromOrchestrator({
    orgId,
    orgName: input.orgName,
    workspaceMode: input.workspaceMode,
    state,
    nowISO,
    maxActions: input.maxActions,
    preferMistral: true,
    mistral: input.mistral,
    user: {
      id: input.actor.id,
    },
  })

  const generated: AIGuidancePlanRecord = {
    id: buildRecordId(plan, nowISO, state.aiGuidancePlans?.length ?? 0),
    planId: plan.id,
    orgId,
    status: "generated",
    plan,
    diffFromPrevious: previousRecord ? diffGuidancePlans(previousRecord.plan, plan) : undefined,
    generatedAtISO: nowISO,
    generatedByEmail: input.actor.label,
    reason: input.reason ?? "initial",
  }

  await mutateFreshStateForOrg(
    orgId,
    (state) => {
      const existing = state.aiGuidancePlans ?? []
      const nextPlans = [
        generated,
        ...existing.map((record) =>
          record.status === "generated" ? markPlanStatus(record, "superseded") : record,
        ),
      ].slice(0, MAX_STORED_PLANS)

      const event = createComplianceEvent(
        {
          type: "ai_guidance.generated",
          entityType: "ai_guidance",
          entityId: generated.id,
          message: `Plan AI Guidance generat: ${plan.actions.length} acțiuni prioritizate, ${plan.omittedActions.length} în planul complet.`,
          createdAtISO: nowISO,
          metadata: {
            reason: generated.reason ?? "initial",
            actions: plan.actions.length,
            omitted: plan.omittedActions.length,
            fingerprint: plan.fingerprint,
          },
        },
        input.actor,
      )

      return {
        ...state,
        aiGuidancePlans: nextPlans,
        events: appendComplianceEvents(state, [event]),
      }
    },
    input.orgName,
  )

  return generated
}

export async function getLatestGuidancePlan(
  orgId: string,
): Promise<AIGuidancePlanRecord | null> {
  const state = await readFreshStateForOrg(orgId)
  return state.aiGuidancePlans?.[0] ?? null
}

export async function acceptGuidancePlan(
  orgId: string,
  recordId: string,
  actor: ComplianceEventActorInput,
): Promise<AIGuidancePlanRecord> {
  return updateGuidancePlanDecision(orgId, recordId, actor, {
    status: "accepted",
    eventType: "ai_guidance.accepted",
    message: "Plan AI Guidance acceptat de om. Nicio acțiune nu a fost executată automat.",
  })
}

export async function rejectGuidancePlan(
  orgId: string,
  recordId: string,
  actor: ComplianceEventActorInput,
  note?: string,
): Promise<AIGuidancePlanRecord> {
  return updateGuidancePlanDecision(orgId, recordId, actor, {
    status: "rejected",
    note,
    eventType: "ai_guidance.rejected",
    message: "Plan AI Guidance respins de om. Recomandările rămân doar în jurnal.",
  })
}

export async function explainOmittedGuidanceAction(
  orgId: string,
  recordId: string,
  actionId: string,
): Promise<OmittedGuidanceExplanation> {
  const state = await readFreshStateForOrg(orgId)
  const record = findRecordOrThrow(state, recordId)
  const action = record.plan.omittedActions.find((item) => item.id === actionId)
  return {
    planId: record.id,
    actionId,
    action,
    reason: explainOmittedAction(record.plan, actionId),
  }
}

export function buildGuidancePlanMarkdown(record: AIGuidancePlanRecord): string {
  const lines = [
    `# Plan AI Guidance — ${record.plan.orgName}`,
    "",
    `- Record ID: ${record.id}`,
    `- Plan ID: ${record.planId}`,
    `- Status: ${record.status}`,
    `- Generat: ${record.generatedAtISO}`,
    `- Generat de: ${record.generatedByEmail ?? "sistem"}`,
    `- Motiv: ${record.reason ?? "initial"}`,
    `- Workspace: ${record.plan.workspaceMode}`,
    `- Model: ${record.plan.modelLabel}`,
    `- Prompt: ${record.plan.promptVersion}`,
    `- Încredere: ${record.plan.confidence}`,
    "",
    "## Rezumat",
    "",
    record.plan.summary,
    "",
    "## Guardrails",
    "",
    ...record.plan.guardrails.map((item) => `- ${item}`),
    "",
    "## Acțiuni prioritizate",
    "",
    ...record.plan.actions.flatMap((action) => actionMarkdown(action)),
    "",
    "## Acțiuni în planul complet",
    "",
    ...(record.plan.omittedActions.length > 0
      ? record.plan.omittedActions.flatMap((action) => actionMarkdown(action, true))
      : ["Nu există acțiuni omise."]
    ),
  ]

  if (record.diffFromPrevious) {
    lines.push(
      "",
      "## Diferență față de planul anterior",
      "",
      record.diffFromPrevious.summary,
      "",
      `- Adăugate: ${record.diffFromPrevious.added.map((item) => item.title).join("; ") || "0"}`,
      `- Scoase: ${record.diffFromPrevious.removed.map((item) => item.title).join("; ") || "0"}`,
      `- Reprioritizate: ${record.diffFromPrevious.reprioritized.map((item) => `${item.title} (${item.previousRank} → ${item.currentRank})`).join("; ") || "0"}`,
    )
  }

  return `${lines.join("\n")}\n`
}

async function updateGuidancePlanDecision(
  orgId: string,
  recordId: string,
  actor: ComplianceEventActorInput,
  input: {
    status: Extract<AIGuidancePlanRecordStatus, "accepted" | "rejected">
    eventType: "ai_guidance.accepted" | "ai_guidance.rejected"
    message: string
    note?: string
  },
): Promise<AIGuidancePlanRecord> {
  let updated: AIGuidancePlanRecord | undefined
  const nowISO = new Date().toISOString()

  await mutateFreshStateForOrg(orgId, (state) => {
    const plans = state.aiGuidancePlans ?? []
    const current = plans.find((record) => record.id === recordId)
    if (!current) throw new Error("Planul AI Guidance nu există.")

    updated = {
      ...current,
      status: input.status,
      ...(input.status === "accepted"
        ? { acceptedAtISO: nowISO, acceptedByEmail: actor.label }
        : { rejectedAtISO: nowISO, rejectedByEmail: actor.label, rejectionNote: input.note }),
    }

    const event = createComplianceEvent(
      {
        type: input.eventType,
        entityType: "ai_guidance",
        entityId: recordId,
        message: input.message,
        createdAtISO: nowISO,
        metadata: {
          status: input.status,
          note: input.note ?? "",
        },
      },
      actor,
    )

    return {
      ...state,
      aiGuidancePlans: plans.map((record) => (record.id === recordId ? updated! : record)),
      events: appendComplianceEvents(state, [event]),
    }
  })

  if (!updated) throw new Error("Planul AI Guidance nu a putut fi actualizat.")
  return updated
}

function findRecordOrThrow(state: ComplianceState, recordId: string): AIGuidancePlanRecord {
  const record = state.aiGuidancePlans?.find((item) => item.id === recordId)
  if (!record) throw new Error("Planul AI Guidance nu există.")
  return record
}

function markPlanStatus(
  record: AIGuidancePlanRecord,
  status: AIGuidancePlanRecordStatus,
): AIGuidancePlanRecord {
  return { ...record, status }
}

function buildRecordId(plan: GuidancePlan, nowISO: string, count: number): string {
  const timestamp = nowISO.replace(/[^0-9]/g, "").slice(0, 14)
  return `aigp-${plan.fingerprint}-${timestamp}-${count + 1}`
}

function actionMarkdown(action: GuidanceAction, omitted = false): string[] {
  return [
    `### ${action.rank}. ${action.title}`,
    "",
    `- Status plan: ${omitted ? "în planul complet" : "prioritar"}`,
    `- Prioritate: ${action.priority}`,
    `- Severitate: ${action.severity}`,
    `- Sursă: ${action.source}`,
    `- De ce: ${action.why}`,
    `- Acțiune sugerată: ${action.suggestedAction}`,
    `- Owner: ${action.suggestedOwner}`,
    `- Unde în aplicație: ${action.targetHref}`,
    `- Articole: ${action.legalReferences.join(", ") || "n/a"}`,
    `- Dovezi: ${action.evidenceRequired.join(", ") || "dovadă execuție"}`,
    ...(action.omittedReason ? [`- Motiv omitere: ${action.omittedReason}`] : []),
    "",
  ]
}
