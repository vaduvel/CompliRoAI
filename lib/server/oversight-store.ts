/**
 * Sprint 017 — Human Oversight Protocol store (CRUD + lifecycle helpers peste
 * `state.humanOversightProtocols[]` + ledger evenimente + finding emission
 * obligatoriu).
 *
 * Pattern: identic cu fria-store (Sprint 016) → folosește
 * `mutateFreshStateForOrg` din `lib/server/store.ts` pentru audit-trail
 * hash-chain consistent.
 *
 * Surface API:
 *  - readOversightProtocols(orgId)
 *  - getOversightProtocolById(orgId, id)
 *  - createProtocol(orgId, input, actor)              → creează + evaluator + findings
 *  - updateProtocol(orgId, id, patch, actor)          → merge patch + re-evaluează
 *  - deleteProtocol(orgId, id, actor)
 *  - markProtocolApproved(orgId, id, approvedByEmail, actor)
 *  - markProtocolRejected(orgId, id, reason, actor)
 *  - attachEvidence(orgId, id, evidenceItem, actor)
 *  - buildOversightMarkdown(record, orgName, systemName?) → export
 *
 * Findings emise sunt persistate prin createFinding() (din findings-store) și
 * ID-urile rezultate sunt scrise în `linkedFindingIds[]` pe record.
 */

import {
  appendComplianceEvents,
  createComplianceEvent,
  type ComplianceEventActorInput,
} from "@/lib/compliance/events"
import { evaluateOversight } from "@/lib/compliance/oversight-evaluator"
import { createFinding } from "@/lib/server/findings-store"
import { mutateFreshStateForOrg, readState } from "@/lib/server/store"
import type {
  AISystemRecord,
  HumanOversightProtocol,
  OversightCapability,
  OversightCompleteness,
  OversightContestationProcedure,
  OversightEscalationStep,
  OversightEvidenceItem,
  OversightModel,
  OversightProtocolStatus,
  OversightResponsibleHuman,
  OversightStopProcedure,
} from "@/lib/compliance/types"

// ── Types ────────────────────────────────────────────────────────────────────

export type OversightSummary = {
  total: number
  draft: number
  inReview: number
  approved: number
  active: number
  obsolete: number
  rejected: number
  complete: number
  partial: number
  incomplete: number
}

export type CreateOversightInput = {
  title: string
  linkedAISystemId: string
  oversightModel: OversightModel
  capabilitiesCovered?: OversightCapability[]
  responsibleHumans?: OversightResponsibleHuman[]
  escalationSteps?: OversightEscalationStep[]
  contestationProcedure?: OversightContestationProcedure
  stopProcedure?: OversightStopProcedure
  evidenceChecklist?: string[]
  evidenceItems?: OversightEvidenceItem[]
  notes?: string
  nextReviewISO?: string
}

export type UpdateOversightPatch = Partial<
  Omit<
    HumanOversightProtocol,
    | "id"
    | "orgId"
    | "linkedFindingIds"
    | "createdAtISO"
    | "updatedAtISO"
    | "completeness"
    | "generatedMarkdown"
  >
>

const PROTOCOL_STATUSES: OversightProtocolStatus[] = [
  "draft",
  "in_review",
  "approved",
  "active",
  "obsolete",
  "rejected",
]

const EMPTY_CONTESTATION: OversightContestationProcedure = {
  channelDescription: "",
  acknowledgementSlaHours: 0,
  resolutionSlaDays: 0,
  reviewerRole: "",
  evidencePreservation: "",
}

const EMPTY_STOP: OversightStopProcedure = {
  stopButtonAvailable: false,
  stopButtonLocation: "",
  fallbackMode: "manual_processing",
  fallbackDescription: "",
  testFrequency: "annually",
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function nowISO(): string {
  return new Date().toISOString()
}

function uid(): string {
  return `oversight-${Math.random().toString(36).slice(2, 10)}`
}

function evidenceId(): string {
  return `ev-${Math.random().toString(36).slice(2, 10)}`
}

export function isOversightStatus(value: unknown): value is OversightProtocolStatus {
  return (
    typeof value === "string" &&
    PROTOCOL_STATUSES.includes(value as OversightProtocolStatus)
  )
}

export function summarizeOversightProtocols(
  records: HumanOversightProtocol[],
): OversightSummary {
  let draft = 0
  let inReview = 0
  let approved = 0
  let active = 0
  let obsolete = 0
  let rejected = 0
  let complete = 0
  let partial = 0
  let incomplete = 0
  for (const r of records) {
    if (r.status === "draft") draft++
    else if (r.status === "in_review") inReview++
    else if (r.status === "approved") approved++
    else if (r.status === "active") active++
    else if (r.status === "obsolete") obsolete++
    else if (r.status === "rejected") rejected++
    if (r.completeness === "complete") complete++
    else if (r.completeness === "partial") partial++
    else incomplete++
  }
  return {
    total: records.length,
    draft,
    inReview,
    approved,
    active,
    obsolete,
    rejected,
    complete,
    partial,
    incomplete,
  }
}

function findSystem(
  state: { aiSystems?: AISystemRecord[] },
  systemId: string,
): AISystemRecord | undefined {
  return state.aiSystems?.find((s) => s.id === systemId)
}

// ── Read ─────────────────────────────────────────────────────────────────────

export async function readOversightProtocols(_orgId?: string): Promise<{
  records: HumanOversightProtocol[]
  summary: OversightSummary
}> {
  const state = await readState()
  const records = state.humanOversightProtocols ?? []
  return { records, summary: summarizeOversightProtocols(records) }
}

export async function getOversightProtocolById(
  _orgId: string,
  id: string,
): Promise<HumanOversightProtocol | null> {
  const state = await readState()
  return state.humanOversightProtocols?.find((r) => r.id === id) ?? null
}

// ── Internal: rulează evaluator + persistă findings ─────────────────────────

async function runEvaluatorAndPersistFindings(
  orgId: string,
  record: HumanOversightProtocol,
  orgName: string,
  linkedSystem: AISystemRecord | undefined,
  actor: ComplianceEventActorInput,
): Promise<{
  completeness: OversightCompleteness
  generatedMarkdown: string
  linkedFindingIds: string[]
}> {
  const evalResult = evaluateOversight({
    record,
    orgName,
    systemName: linkedSystem?.name,
    linkedSystem,
  })
  const findingIds: string[] = []
  for (const candidate of evalResult.candidateFindings) {
    const created = await createFinding(
      orgId,
      {
        title: candidate.title,
        detail: candidate.detail,
        category: candidate.category,
        severity: candidate.severity,
        legalReference: candidate.legalReference,
        remediationHint: candidate.remediationHint,
        impactSummary: candidate.impactSummary,
        evidenceRequired: candidate.evidenceRequired,
        ownerSuggestion: "Responsabil oversight / DPO",
        closeCondition: candidate.resolution?.closureEvidence,
      },
      actor,
    )
    findingIds.push(created.id)
  }
  return {
    completeness: evalResult.completeness,
    generatedMarkdown: evalResult.generatedMarkdown,
    linkedFindingIds: findingIds,
  }
}

// ── Create ───────────────────────────────────────────────────────────────────

export async function createProtocol(
  orgId: string,
  input: CreateOversightInput,
  actor: ComplianceEventActorInput,
  orgName = "Organizația",
): Promise<HumanOversightProtocol> {
  const title = input.title?.trim()
  if (!title) throw new Error("Oversight protocol title required")
  if (!input.linkedAISystemId) {
    throw new Error("Oversight protocol linkedAISystemId required")
  }

  const now = nowISO()
  const state = await readState()
  const linkedSystem = findSystem(state, input.linkedAISystemId)

  const draft: HumanOversightProtocol = {
    id: uid(),
    orgId,
    title,
    linkedAISystemId: input.linkedAISystemId,
    oversightModel: input.oversightModel,
    capabilitiesCovered: input.capabilitiesCovered ?? [],
    responsibleHumans: input.responsibleHumans ?? [],
    escalationSteps: input.escalationSteps ?? [],
    contestationProcedure: input.contestationProcedure ?? { ...EMPTY_CONTESTATION },
    stopProcedure: input.stopProcedure ?? { ...EMPTY_STOP },
    evidenceChecklist: input.evidenceChecklist ?? [],
    evidenceItems: input.evidenceItems ?? [],
    status: "draft",
    completeness: "incomplete",
    nextReviewISO: input.nextReviewISO,
    linkedFindingIds: [],
    notes: input.notes,
    createdAtISO: now,
    updatedAtISO: now,
  }

  const evalUpdate = await runEvaluatorAndPersistFindings(
    orgId,
    draft,
    orgName,
    linkedSystem,
    actor,
  )

  const enriched: HumanOversightProtocol = {
    ...draft,
    completeness: evalUpdate.completeness,
    generatedMarkdown: evalUpdate.generatedMarkdown,
    linkedFindingIds: evalUpdate.linkedFindingIds,
  }

  await mutateFreshStateForOrg(orgId, (s) => {
    return {
      ...s,
      humanOversightProtocols: [enriched, ...(s.humanOversightProtocols ?? [])].slice(0, 200),
      events: appendComplianceEvents(s, [
        createComplianceEvent(
          {
            type: "oversight.created",
            entityType: "system",
            entityId: enriched.id,
            message: `Oversight Protocol creat: ${enriched.title} · ${enriched.completeness} · model ${enriched.oversightModel}`,
            createdAtISO: now,
            metadata: {
              linkedAISystemId: enriched.linkedAISystemId,
              oversightModel: enriched.oversightModel,
              completeness: enriched.completeness,
              candidateFindingsEmitted: enriched.linkedFindingIds.length,
            },
          },
          actor,
        ),
      ]),
    }
  })

  return enriched
}

// ── Update ───────────────────────────────────────────────────────────────────

export async function updateProtocol(
  orgId: string,
  id: string,
  patch: UpdateOversightPatch,
  actor: ComplianceEventActorInput,
  orgName = "Organizația",
): Promise<HumanOversightProtocol | null> {
  const existing = await getOversightProtocolById(orgId, id)
  if (!existing) return null

  const merged: HumanOversightProtocol = {
    ...existing,
    ...patch,
    id: existing.id,
    orgId: existing.orgId,
    createdAtISO: existing.createdAtISO,
    linkedFindingIds: existing.linkedFindingIds,
    updatedAtISO: nowISO(),
  }
  if (patch.status && !isOversightStatus(patch.status)) {
    merged.status = existing.status
  }

  // Re-rulează evaluator pentru completeness + markdown — nu emite findings noi
  // la update (pentru a evita duplicate; findings se emit doar la create).
  const state = await readState()
  const linkedSystem = findSystem(state, merged.linkedAISystemId)
  const evalResult = evaluateOversight({
    record: merged,
    orgName,
    systemName: linkedSystem?.name,
    linkedSystem,
  })
  merged.completeness = evalResult.completeness
  merged.generatedMarkdown = evalResult.generatedMarkdown

  await mutateFreshStateForOrg(orgId, (s) => {
    const records = s.humanOversightProtocols ?? []
    const idx = records.findIndex((r) => r.id === id)
    if (idx === -1) return s
    const next = [...records]
    next[idx] = merged
    return {
      ...s,
      humanOversightProtocols: next,
      events: appendComplianceEvents(s, [
        createComplianceEvent(
          {
            type: "oversight.updated",
            entityType: "system",
            entityId: merged.id,
            message: `Oversight Protocol actualizat: ${merged.title} · status ${merged.status} · ${merged.completeness}`,
            createdAtISO: nowISO(),
            metadata: {
              status: merged.status,
              completeness: merged.completeness,
            },
          },
          actor,
        ),
      ]),
    }
  })

  return merged
}

// ── Delete ───────────────────────────────────────────────────────────────────

export async function deleteProtocol(
  orgId: string,
  id: string,
  actor: ComplianceEventActorInput,
): Promise<boolean> {
  let removed = false
  await mutateFreshStateForOrg(orgId, (s) => {
    const records = s.humanOversightProtocols ?? []
    const target = records.find((r) => r.id === id)
    if (!target) return s
    removed = true
    return {
      ...s,
      humanOversightProtocols: records.filter((r) => r.id !== id),
      events: appendComplianceEvents(s, [
        createComplianceEvent(
          {
            type: "oversight.deleted",
            entityType: "system",
            entityId: id,
            message: `Oversight Protocol șters: ${target.title}`,
            createdAtISO: nowISO(),
            metadata: { status: target.status, completeness: target.completeness },
          },
          actor,
        ),
      ]),
    }
  })
  return removed
}

// ── Lifecycle: approve / reject ─────────────────────────────────────────────

export async function markProtocolApproved(
  orgId: string,
  id: string,
  approvedByEmail: string,
  actor: ComplianceEventActorInput,
): Promise<HumanOversightProtocol | null> {
  if (!approvedByEmail || !approvedByEmail.includes("@")) {
    throw new Error("Approver email required")
  }
  const existing = await getOversightProtocolById(orgId, id)
  if (!existing) return null
  const now = nowISO()
  // Setăm nextReviewISO la +6 luni dacă nu este deja setat.
  const sixMonthsMs = 180 * 86_400_000
  const next: HumanOversightProtocol = {
    ...existing,
    status: "approved",
    approvedByEmail,
    approvedAtISO: now,
    nextReviewISO: existing.nextReviewISO ?? new Date(Date.now() + sixMonthsMs).toISOString(),
    rejectionReason: undefined,
    updatedAtISO: now,
  }
  await mutateFreshStateForOrg(orgId, (s) => {
    const records = s.humanOversightProtocols ?? []
    const idx = records.findIndex((r) => r.id === id)
    if (idx === -1) return s
    const arr = [...records]
    arr[idx] = next
    return {
      ...s,
      humanOversightProtocols: arr,
      events: appendComplianceEvents(s, [
        createComplianceEvent(
          {
            type: "oversight.approved",
            entityType: "system",
            entityId: next.id,
            message: `Oversight Protocol aprobat: ${next.title} · de ${approvedByEmail}`,
            createdAtISO: now,
            metadata: { approvedByEmail, completeness: next.completeness },
          },
          actor,
        ),
      ]),
    }
  })
  return next
}

export async function markProtocolRejected(
  orgId: string,
  id: string,
  reason: string,
  actor: ComplianceEventActorInput,
): Promise<HumanOversightProtocol | null> {
  if (!reason || reason.trim().length < 5) {
    throw new Error("Oversight rejection reason required (min 5 chars)")
  }
  const existing = await getOversightProtocolById(orgId, id)
  if (!existing) return null
  const now = nowISO()
  const next: HumanOversightProtocol = {
    ...existing,
    status: "rejected",
    rejectionReason: reason.trim(),
    approvedByEmail: undefined,
    approvedAtISO: undefined,
    updatedAtISO: now,
  }
  await mutateFreshStateForOrg(orgId, (s) => {
    const records = s.humanOversightProtocols ?? []
    const idx = records.findIndex((r) => r.id === id)
    if (idx === -1) return s
    const arr = [...records]
    arr[idx] = next
    return {
      ...s,
      humanOversightProtocols: arr,
      events: appendComplianceEvents(s, [
        createComplianceEvent(
          {
            type: "oversight.rejected",
            entityType: "system",
            entityId: next.id,
            message: `Oversight Protocol respins: ${next.title} · motiv: ${reason.trim()}`,
            createdAtISO: now,
            metadata: { rejectionReason: reason.trim() },
          },
          actor,
        ),
      ]),
    }
  })
  return next
}

// ── Evidence attach ──────────────────────────────────────────────────────────

export type AttachEvidenceInput = {
  type: OversightEvidenceItem["type"]
  description: string
  url?: string
  fileName?: string
}

export async function attachEvidence(
  orgId: string,
  id: string,
  input: AttachEvidenceInput,
  actor: ComplianceEventActorInput,
): Promise<HumanOversightProtocol | null> {
  if (!input.description || input.description.trim().length < 3) {
    throw new Error("Evidence description required")
  }
  const existing = await getOversightProtocolById(orgId, id)
  if (!existing) return null
  const now = nowISO()
  const newItem: OversightEvidenceItem = {
    id: evidenceId(),
    type: input.type,
    description: input.description.trim(),
    uploadedAtISO: now,
    uploadedByEmail: actor.label,
    url: input.url?.trim() || undefined,
    fileName: input.fileName?.trim() || undefined,
  }
  const next: HumanOversightProtocol = {
    ...existing,
    evidenceItems: [...existing.evidenceItems, newItem],
    updatedAtISO: now,
  }
  await mutateFreshStateForOrg(orgId, (s) => {
    const records = s.humanOversightProtocols ?? []
    const idx = records.findIndex((r) => r.id === id)
    if (idx === -1) return s
    const arr = [...records]
    arr[idx] = next
    return {
      ...s,
      humanOversightProtocols: arr,
      events: appendComplianceEvents(s, [
        createComplianceEvent(
          {
            type: "oversight.evidence_attached",
            entityType: "system",
            entityId: next.id,
            message: `Dovadă atașată Oversight Protocol "${next.title}": ${newItem.type} — ${newItem.description}`,
            createdAtISO: now,
            metadata: {
              evidenceId: newItem.id,
              evidenceType: newItem.type,
              hasUrl: Boolean(newItem.url),
            },
          },
          actor,
        ),
      ]),
    }
  })
  return next
}

// ── Markdown export (regenerat live) ─────────────────────────────────────────

export function buildOversightMarkdown(
  record: HumanOversightProtocol,
  orgName: string,
  systemName?: string,
): string {
  const evalResult = evaluateOversight({
    record,
    orgName,
    systemName,
  })
  return evalResult.generatedMarkdown
}
