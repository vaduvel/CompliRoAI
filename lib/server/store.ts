import { promises as fs } from "node:fs"
import path from "node:path"
import { writeFileSafe } from "./fs-safe"
import { getOrgContext } from "./org-context"
import type { AISystemRecord, LiteracyRecord } from "@/lib/compliance/types"

export type GeneratedDocumentRecord = {
  id: string
  systemId: string
  documentType: "annex-iv"
  content: string
  createdAtISO: string
  approvalStatus?: "pending" | "approved_as_evidence"
}

export type AIActState = {
  aiSystems: AISystemRecord[]
  literacyRecords: LiteracyRecord[]
  generatedDocuments: GeneratedDocumentRecord[]
}

const DEFAULT_STATE: AIActState = {
  aiSystems: [],
  literacyRecords: [],
  generatedDocuments: [],
}

const stateCache = new Map<string, AIActState>()

function getStatePath(orgId: string): string {
  return path.join(process.cwd(), ".data", `state-${orgId}.json`)
}

export async function readState(): Promise<AIActState> {
  const { orgId } = await getOrgContext()
  if (stateCache.has(orgId)) return stateCache.get(orgId)!

  try {
    const raw = await fs.readFile(getStatePath(orgId), "utf-8")
    const state = { ...DEFAULT_STATE, ...JSON.parse(raw) } as AIActState
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
  await writeFileSafe(getStatePath(orgId), JSON.stringify(state, null, 2))
}
