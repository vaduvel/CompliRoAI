// State store CompliRoAI — Sprint 008A-7 upgrade.
//
// `AIActState` este acum alias pentru `ComplianceState` (subset AI-relevant
// portat din DPO-OS). Tipurile native CompliRoAI (`GeneratedDocumentRecord`,
// `OnboardingState`, `ReadinessPackRecord`, `OnboardingWorkspaceMode`) sunt
// re-exportate aici pentru backward compat cu modulele care le importau
// direct din `@/lib/server/store`.
//
// Adapter pattern pentru module DPO-OS portate (vezi `lib/server/dsar-store.ts`):
// modulele primesc orgId explicit în signature, dar intern folosim
// readState()/writeState() — care rezolvă orgId din getOrgContext()
// (middleware). Funcțiile `mutateFreshStateForOrg` / `readFreshStateForOrg`
// expun signature DPO-OS (orgId, mutator) ca să fie drop-in pentru cod ported.

import { promises as fs } from "node:fs"
import path from "node:path"

import { writeFileSafe } from "./fs-safe"
import { getOrgContext } from "./org-context"
import {
  loadOrgStateFromSupabase,
  persistOrgStateToSupabase,
  shouldUseSupabaseOrgState,
} from "./supabase-org-state"
import { initialComplianceState } from "@/lib/compliance/engine"
import type {
  AIActGeneratedDocumentRecord,
  AIActOnboardingState,
  AIActReadinessPackRecord,
  ComplianceState,
} from "@/lib/compliance/types"

// ── Re-exports backward compat ───────────────────────────────────────────────
// Codul existent face `import { GeneratedDocumentRecord } from "@/lib/server/store"`.
// Păstrăm aliasurile cu numele istoric, dar shape-ul vine din types.ts.

export type GeneratedDocumentRecord = AIActGeneratedDocumentRecord
export type OnboardingState = AIActOnboardingState
export type ReadinessPackRecord = AIActReadinessPackRecord
export type OnboardingWorkspaceMode = "imm-classic" | "ai-builder" | "cabinet"

/**
 * Stare totală CompliRoAI per organizație. Sprint 008A-7: alias pentru
 * `ComplianceState` (subset AI-relevant portat din DPO-OS). Toate modulele
 * portate ulterior (DPIA, RoPA, Breach, Findings, Vendor) extind acest
 * type prin adăugarea câmpurilor opționale în `lib/compliance/types.ts`.
 */
export type AIActState = ComplianceState

// ── State management ─────────────────────────────────────────────────────────

const stateCache = new Map<string, AIActState>()

function getStatePath(orgId: string): string {
  return path.join(process.cwd(), ".data", `state-${orgId}.json`)
}

/**
 * Construiește o stare completă cu toate câmpurile `ComplianceState` required,
 * pornind opțional de la un partial (e.g. citit din Supabase cross-org).
 *
 * Export public pentru cod care construiește state literal-uri în afara
 * fluxului readState/writeState (e.g. cabinet → client cross-org readers
 * în `audit-pack-builder` / `readiness-pack-builder`).
 */
export function mergeWithDefault(partial: Partial<AIActState> | null | undefined): AIActState {
  const base = structuredClone(initialComplianceState)
  if (!partial || typeof partial !== "object") return base
  return {
    ...base,
    ...partial,
    // Required arrays — merge cu fallback explicit ca să nu rămânem cu undefined.
    alerts: partial.alerts ?? base.alerts,
    findings: partial.findings ?? base.findings,
    events: partial.events ?? base.events,
    generatedDocuments: partial.generatedDocuments ?? base.generatedDocuments,
    aiSystems: partial.aiSystems ?? base.aiSystems,
    literacyRecords: partial.literacyRecords ?? base.literacyRecords,
    // Onboarding: păstrează existing sau cade pe default {completed:false, step:1}.
    onboarding: partial.onboarding ?? base.onboarding,
  }
}

export async function readState(): Promise<AIActState> {
  const { orgId } = await getOrgContext()
  if (stateCache.has(orgId)) return stateCache.get(orgId)!

  // Supabase path
  if (shouldUseSupabaseOrgState()) {
    try {
      const remote = await loadOrgStateFromSupabase<Partial<AIActState>>(orgId)
      const state = mergeWithDefault(remote)
      stateCache.set(orgId, state)
      return state
    } catch {
      // Fall through to local read on transient Supabase failure
    }
  }

  // Local JSON fallback (dev)
  try {
    const raw = await fs.readFile(getStatePath(orgId), "utf-8")
    const state = mergeWithDefault(JSON.parse(raw) as Partial<AIActState>)
    stateCache.set(orgId, state)
    return state
  } catch {
    const state = mergeWithDefault(null)
    stateCache.set(orgId, state)
    return state
  }
}

export async function writeState(state: AIActState): Promise<void> {
  const { orgId } = await getOrgContext()
  stateCache.set(orgId, state)

  if (shouldUseSupabaseOrgState()) {
    try {
      await persistOrgStateToSupabase<AIActState>(orgId, state)
      return
    } catch {
      // Fall through to local write so we don't lose data on transient failures
    }
  }

  await writeFileSafe(getStatePath(orgId), JSON.stringify(state, null, 2))
}

// ── DPO-OS adapter pattern (drop-in compat pentru module portate) ────────────
//
// DPO-OS sources presupun signature `mutateFreshStateForOrg(orgId, mutator)`
// peste `mvp-store`. CompliRoAI rezolvă orgId din request headers, deci
// orgId/orgName params sunt unused, dar păstrate pentru drop-in compat.

/**
 * Wraps readState + mutator + writeState într-un singur call.
 * Modulul caller primește current state, returnează next state.
 *
 * @param _orgId   Ignorat — CompliRoAI rezolvă orgId din getOrgContext().
 *                 Păstrat în signature pentru drop-in compat cu DPO-OS.
 * @param mutator  Funcție pură care primește state curent și returnează next state.
 * @param _orgName Ignorat — același motiv (DPO-OS îl folosea pentru a popula
 *                 contextul org la prima scriere; CompliRoAI îl ia din headers).
 */
export async function mutateFreshStateForOrg(
  _orgId: string,
  mutator: (state: ComplianceState) => ComplianceState,
  _orgName?: string,
): Promise<ComplianceState> {
  const current = await readState()
  const next = mutator(current)
  await writeState(next)
  return next
}

/**
 * Read-only variant a `mutateFreshStateForOrg`. Modulele portate care doar
 * citesc (e.g. cockpit dashboard, audit pack) folosesc această funcție.
 *
 * @param _orgId   Ignorat — vezi `mutateFreshStateForOrg`.
 * @param _orgName Ignorat — vezi `mutateFreshStateForOrg`.
 */
export async function readFreshStateForOrg(
  _orgId: string,
  _orgName?: string,
): Promise<ComplianceState> {
  return readState()
}
