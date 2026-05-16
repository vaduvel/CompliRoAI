import { promises as fs } from "node:fs"
import path from "node:path"

import { writeFileSafe } from "./fs-safe"
import { getOrgContext } from "./org-context"
import {
  loadOrgStateFromSupabase,
  persistOrgStateToSupabase,
  shouldUseSupabaseOrgState,
} from "./supabase-org-state"
import type { AISystemRecord, LiteracyRecord } from "@/lib/compliance/types"

export type GeneratedDocumentRecord = {
  id: string
  systemId: string
  documentType: "annex-iv"
  content: string
  createdAtISO: string
  approvalStatus?: "pending" | "approved_as_evidence"
}

export type OnboardingState = {
  completed: boolean
  completedAtISO?: string
  role?: "solo" | "cabinet"
  companyInfo?: {
    cui?: string
    sector?:
      | "fintech"
      | "saas"
      | "consulting"
      | "ecommerce"
      | "industrial"
      | "healthcare"
      | "education"
      | "altele"
    employeeCount?: "<10" | "10-49" | "50-249" | "250+"
  }
  cabinetInfo?: {
    cabinetName?: string
    clientScale?: string
  }
  currentStep?: 1 | 2 | 3 | 4
}

export type AIActState = {
  aiSystems: AISystemRecord[]
  literacyRecords: LiteracyRecord[]
  generatedDocuments: GeneratedDocumentRecord[]
  onboarding?: OnboardingState
}

const DEFAULT_STATE: AIActState = {
  aiSystems: [],
  literacyRecords: [],
  generatedDocuments: [],
  onboarding: { completed: false, currentStep: 1 },
}

const stateCache = new Map<string, AIActState>()

function getStatePath(orgId: string): string {
  return path.join(process.cwd(), ".data", `state-${orgId}.json`)
}

function mergeWithDefault(partial: Partial<AIActState> | null | undefined): AIActState {
  return {
    aiSystems: partial?.aiSystems ?? [],
    literacyRecords: partial?.literacyRecords ?? [],
    generatedDocuments: partial?.generatedDocuments ?? [],
    onboarding: partial?.onboarding ?? { completed: false, currentStep: 1 },
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
    const state = structuredClone(DEFAULT_STATE)
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
