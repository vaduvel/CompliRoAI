/**
 * DSAR (Data Subject Access Requests) store — Sprint 007 port
 * Sursa: DPO-OS v3-unified `lib/server/dsar-store.ts` (Apr 2026)
 *
 * Adaptare CompliRoAI:
 * - În loc de `createAdaptiveStorage<DsarOrgState>("dsar", "dsar_state")`,
 *   folosim `org_state.dsarRequests[]` JSONB prin readState/writeState.
 * - API funcțiilor (createDsar, updateDsar, deleteDsar, readDsarState) rămâne
 *   identic ca să fie drop-in pentru API routes + UI portate.
 *
 * GDPR Art. 15-22 — tracking cereri persoane vizate cu deadline legal.
 */

import { readState, writeState } from "@/lib/server/store"
import type { DsarRequest, DsarRequestType, DsarStatus } from "@/lib/compliance/types"

// Re-export pentru compatibilitate cu cod portat care făcea
// `import type { DsarRequest } from "@/lib/server/dsar-store"`
export type { DsarRequest, DsarRequestType, DsarStatus } from "@/lib/compliance/types"

export type DsarOrgState = {
  requests: DsarRequest[]
  updatedAtISO: string
}

function emptyState(): DsarOrgState {
  return { requests: [], updatedAtISO: new Date().toISOString() }
}

// ── Storage (folosim org_state JSONB existent) ────────────────────────────────

export async function readDsarState(_orgId?: string): Promise<DsarOrgState> {
  // CompliRoAI: readState() ia automat orgId din getOrgContext()
  // _orgId rămâne în signature pentru compatibilitate API portată
  const state = await readState()
  return {
    requests: state.dsarRequests ?? [],
    updatedAtISO: new Date().toISOString(),
  }
}

async function writeDsarState(_orgId: string | undefined, dsar: DsarOrgState): Promise<DsarOrgState> {
  const current = await readState()
  await writeState({ ...current, dsarRequests: dsar.requests })
  return { ...dsar, updatedAtISO: new Date().toISOString() }
}

export async function seedDsarState(orgId: string, dsar: DsarOrgState): Promise<DsarOrgState> {
  return writeDsarState(orgId, dsar)
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function uid() {
  return `dsar-${Math.random().toString(36).slice(2, 10)}`
}

function computeDeadline(receivedAtISO: string): string {
  return new Date(new Date(receivedAtISO).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase()
}

function isDuplicateWindow(leftISO: string, rightISO: string) {
  const left = new Date(leftISO).getTime()
  const right = new Date(rightISO).getTime()
  if (!Number.isFinite(left) || !Number.isFinite(right)) return false
  return Math.abs(left - right) <= 5 * 60 * 1000
}

// ── CRUD ─────────────────────────────────────────────────────────────────────

export async function createDsar(
  orgId: string,
  input: Pick<DsarRequest, "requesterName" | "requesterEmail" | "requestType"> & {
    receivedAtISO?: string
    notes?: string
  }
): Promise<DsarRequest> {
  const state = await readDsarState(orgId)
  const now = new Date().toISOString()
  const receivedAt = input.receivedAtISO ?? now

  // Deduplication window: same email + type within 5 minutes
  const duplicate = state.requests.find(
    (request) =>
      normalizeEmail(request.requesterEmail) === normalizeEmail(input.requesterEmail) &&
      request.requestType === input.requestType &&
      isDuplicateWindow(request.receivedAtISO, receivedAt)
  )
  if (duplicate) return duplicate

  const request: DsarRequest = {
    id: uid(),
    orgId,
    receivedAtISO: receivedAt,
    deadlineISO: computeDeadline(receivedAt),
    requesterName: input.requesterName,
    requesterEmail: input.requesterEmail,
    requestType: input.requestType,
    status: "received",
    identityVerified: false,
    systemsScoped: false,
    dataSearchCompleted: false,
    draftResponseGenerated: false,
    responseReviewedByHuman: false,
    evidenceVaultIds: [],
    notes: input.notes,
    createdAtISO: now,
    updatedAtISO: now,
  }
  await writeDsarState(orgId, {
    ...state,
    requests: [request, ...state.requests],
  })
  return request
}

export async function updateDsar(
  orgId: string,
  dsarId: string,
  patch: Partial<Pick<
    DsarRequest,
    | "status" | "identityVerified" | "draftResponseGenerated"
    | "responseReviewedByHuman" | "responseSentAtISO"
    | "systemsScoped" | "dataSearchCompleted" | "archivedAtISO"
    | "evidenceVaultIds" | "notes" | "extendedDeadlineISO"
  >>
): Promise<DsarRequest | null> {
  const state = await readDsarState(orgId)
  const idx = state.requests.findIndex((r) => r.id === dsarId)
  if (idx === -1) return null
  const updated: DsarRequest = {
    ...state.requests[idx],
    ...patch,
    updatedAtISO: new Date().toISOString(),
  }
  const requests = [...state.requests]
  requests[idx] = updated
  await writeDsarState(orgId, { ...state, requests })
  return updated
}

export async function deleteDsar(orgId: string, dsarId: string): Promise<boolean> {
  const state = await readDsarState(orgId)
  const filtered = state.requests.filter((r) => r.id !== dsarId)
  if (filtered.length === state.requests.length) return false
  await writeDsarState(orgId, { ...state, requests: filtered })
  return true
}

export async function getDsarById(orgId: string, dsarId: string): Promise<DsarRequest | null> {
  const state = await readDsarState(orgId)
  return state.requests.find((r) => r.id === dsarId) ?? null
}
