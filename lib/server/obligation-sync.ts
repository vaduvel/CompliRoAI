import {
  buildAIActFindingId,
  buildAIActObligationFindings,
  classifyAISystem,
  getAIActRequiredActionIds,
} from "@/lib/compliance/ai-act-classifier"
import type { AISystemRecord } from "@/lib/compliance/types"
import { readState, writeState, type AIActState } from "@/lib/server/store"

export async function syncAIActObligationFindings(
  system: AISystemRecord,
  nowISO: string
): Promise<void> {
  const state = await readState()
  const updated = syncAIActObligationFindingsInState(state, system, nowISO)
  if (updated === state) return
  await writeState(updated)
}

export function syncAIActObligationFindingsInState(
  state: AIActState,
  system: AISystemRecord,
  nowISO: string
): AIActState {
  const classification = classifyAISystem(system.purpose)
  const requiredIds = new Set(
    getAIActRequiredActionIds(classification).map((obligationId) =>
      buildAIActFindingId(system.id, obligationId)
    )
  )

  if (requiredIds.size === 0) return state

  // Build obligation findings (lightweight, no state.findings in new store)
  buildAIActObligationFindings(system, classification, nowISO)

  return state
}

export async function removeAIActObligationFindings(systemId: string): Promise<void> {
  const state = await readState()
  // In this store, obligations are derived — no findings array to clean up
  // The state just removes the system; evidencePack recalculates on demand
  const updated: AIActState = {
    ...state,
    aiSystems: state.aiSystems.filter((s) => s.id !== systemId),
    generatedDocuments: state.generatedDocuments.filter((doc) => doc.systemId !== systemId),
  }
  await writeState(updated)
}
