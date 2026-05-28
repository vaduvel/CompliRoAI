import type { GuidanceAction, GuidancePlan } from "@/lib/compliance/guidance-orchestrator"
import type { ComplianceState } from "@/lib/compliance/types"

export type GuidanceComposerContext = {
  nowISO: string
  planFacts: {
    headline: string
    summary: string
    actionIds: string[]
    omittedActionIds: string[]
  }
  stateFacts: {
    aiSystems: string[]
    vendors: string[]
    ropaActivities: string[]
    literacyRecords: string[]
  }
  availableSourceIds: string[]
}

export type GuidanceComposerModelMeta = {
  provider: "mistral"
  modelName: string
  usedAI: boolean
  citedSourceIds: string[]
  tokenUsage?: {
    promptTokens?: number
    completionTokens?: number
    totalTokens?: number
  }
}

export type ComposeGuidancePlanWithAIInput = {
  plan: GuidancePlan
  context: GuidanceComposerContext
  apiKey?: string
  model?: string
  fetchImpl?: typeof fetch
}

export type ComposeGuidancePlanWithAIResult = {
  plan: GuidancePlan
  usedAI: boolean
  modelLabel: GuidancePlan["modelLabel"]
  warnings: string[]
  modelMeta?: GuidanceComposerModelMeta
}

type MistralComposerPayload = {
  summary?: unknown
  actions?: unknown
  omittedActions?: unknown
  citedSourceIds?: unknown
}

type MistralActionPatch = {
  id?: unknown
  why?: unknown
  omittedReason?: unknown
}

export function buildGuidanceComposerContext(input: {
  plan: GuidancePlan
  state: ComplianceState
  nowISO?: string
}): GuidanceComposerContext {
  const availableSourceIds = new Set<string>()
  for (const action of [...input.plan.actions, ...input.plan.omittedActions]) {
    availableSourceIds.add(`action:${action.id}`)
    for (const sourceId of action.sourceIds) availableSourceIds.add(`source:${sourceId}`)
    for (const legalReference of action.legalReferences) availableSourceIds.add(`legal:${legalReference}`)
  }
  for (const system of input.state.aiSystems ?? []) {
    availableSourceIds.add(`ai-system:${system.id}`)
  }
  for (const vendor of input.state.vendorRecords ?? []) {
    availableSourceIds.add(`vendor:${vendor.id}`)
  }
  for (const activity of input.state.ropaActivities ?? []) {
    availableSourceIds.add(`ropa:${activity.id}`)
  }
  for (const record of input.state.literacyRecords ?? []) {
    availableSourceIds.add(`literacy:${record.id}`)
  }

  return {
    nowISO: input.nowISO ?? new Date().toISOString(),
    planFacts: {
      headline: input.plan.headline,
      summary: input.plan.summary,
      actionIds: input.plan.actions.map((action) => action.id),
      omittedActionIds: input.plan.omittedActions.map((action) => action.id),
    },
    stateFacts: {
      aiSystems: (input.state.aiSystems ?? []).map((system) =>
        [system.name, system.vendor, system.riskLevel].filter(Boolean).join(" · ")
      ),
      vendors: (input.state.vendorRecords ?? []).map((vendor) =>
        [
          vendor.name,
          vendor.productUsed,
          `DPA ${vendor.dpaStatus}`,
          vendor.riskLevel,
        ].join(" · ")
      ),
      ropaActivities: (input.state.ropaActivities ?? []).map((activity) =>
        [activity.activityName, activity.status, activity.confidence].join(" · ")
      ),
      literacyRecords: (input.state.literacyRecords ?? []).map((record) =>
        [record.employeeName, record.role, record.trainingDate].join(" · ")
      ),
    },
    availableSourceIds: [...availableSourceIds],
  }
}

export async function composeGuidancePlanWithAI(
  input: ComposeGuidancePlanWithAIInput
): Promise<ComposeGuidancePlanWithAIResult> {
  const apiKey = input.apiKey?.trim()
  const model = input.model ?? "mistral-medium-latest"
  const warnings: string[] = []
  if (!apiKey) {
    warnings.push("Mistral indisponibil; folosim plan deterministic.")
    return {
      plan: input.plan,
      usedAI: false,
      modelLabel: "deterministic",
      warnings,
    }
  }

  const fetchImpl = input.fetchImpl ?? fetch
  try {
    const res = await fetchImpl("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "Ești composer pentru CompliRoAI. Poți reformula doar summary, action.why și omittedReason. Nu schimba rank, surse, articole, href sau prioritate.",
          },
          {
            role: "user",
            content: JSON.stringify({
              plan: {
                summary: input.plan.summary,
                actions: input.plan.actions.map((action) => ({
                  id: action.id,
                  title: action.title,
                  why: action.why,
                  sourceIds: action.sourceIds,
                  legalReferences: action.legalReferences,
                })),
                omittedActions: input.plan.omittedActions.map((action) => ({
                  id: action.id,
                  title: action.title,
                  omittedReason: action.omittedReason,
                })),
              },
              context: input.context,
            }),
          },
        ],
      }),
    })
    if (!res.ok) {
      warnings.push("Mistral indisponibil; folosim plan deterministic.")
      return {
        plan: input.plan,
        usedAI: false,
        modelLabel: "deterministic",
        warnings,
      }
    }

    const data = await res.json()
    const content = data?.choices?.[0]?.message?.content
    const payload = parseComposerPayload(content)
    const plan = applyComposerPayload(input.plan, payload)
    const citedSourceIds = filterCitedSourceIds(payload.citedSourceIds, input.context.availableSourceIds)
    return {
      plan: {
        ...plan,
        modelLabel: "mistral-assisted",
      },
      usedAI: true,
      modelLabel: "mistral-assisted",
      warnings,
      modelMeta: {
        provider: "mistral",
        modelName: model,
        usedAI: true,
        citedSourceIds,
        tokenUsage: {
          promptTokens: numberOrUndefined(data?.usage?.prompt_tokens),
          completionTokens: numberOrUndefined(data?.usage?.completion_tokens),
          totalTokens: numberOrUndefined(data?.usage?.total_tokens),
        },
      },
    }
  } catch {
    warnings.push("Mistral indisponibil; folosim plan deterministic.")
    return {
      plan: input.plan,
      usedAI: false,
      modelLabel: "deterministic",
      warnings,
    }
  }
}

function parseComposerPayload(content: unknown): MistralComposerPayload {
  if (typeof content !== "string" || !content.trim()) return {}
  try {
    const parsed = JSON.parse(content) as MistralComposerPayload
    return parsed && typeof parsed === "object" ? parsed : {}
  } catch {
    return {}
  }
}

function applyComposerPayload(plan: GuidancePlan, payload: MistralComposerPayload): GuidancePlan {
  const actionPatches = Array.isArray(payload.actions)
    ? new Map(
        payload.actions
          .filter((item): item is MistralActionPatch => item !== null && typeof item === "object")
          .map((item) => [String(item.id ?? ""), item])
      )
    : new Map<string, MistralActionPatch>()

  const omittedPatches = Array.isArray(payload.omittedActions)
    ? new Map(
        payload.omittedActions
          .filter((item): item is MistralActionPatch => item !== null && typeof item === "object")
          .map((item) => [String(item.id ?? ""), item])
      )
    : new Map<string, MistralActionPatch>()

  return {
    ...plan,
    summary: typeof payload.summary === "string" && payload.summary.trim()
      ? payload.summary.trim()
      : plan.summary,
    actions: plan.actions.map((action) => applyActionWhyPatch(action, actionPatches.get(action.id))),
    omittedActions: plan.omittedActions.map((action) => {
      const patch = omittedPatches.get(action.id)
      if (!patch || typeof patch.omittedReason !== "string" || !patch.omittedReason.trim()) return action
      return {
        ...action,
        omittedReason: patch.omittedReason.trim(),
      }
    }),
  }
}

function applyActionWhyPatch(action: GuidanceAction, patch: MistralActionPatch | undefined): GuidanceAction {
  if (!patch || typeof patch.why !== "string" || !patch.why.trim()) return action
  return {
    ...action,
    why: patch.why.trim(),
  }
}

function filterCitedSourceIds(value: unknown, allowed: string[]) {
  if (!Array.isArray(value)) return []
  const allowedSet = new Set(allowed)
  return value.filter((item): item is string => typeof item === "string" && allowedSet.has(item))
}

function numberOrUndefined(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined
}
