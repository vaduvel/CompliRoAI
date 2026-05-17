/**
 * Sprint 013 — Approval Queue store
 *
 * Cabinet workflow: client face acțiune high-stakes → consultant aprobă/respinge
 * înainte ca schimbarea să devină definitivă pe entitate. Aplicat pentru:
 *   - finding status change (confirm/dismiss/resolve)
 *   - DPIA screening decisions
 *   - breach ANSPDCP / subject notification skip
 *   - vendor approval / rejection
 *   - AI system classification change
 *   - publicare transparency notice
 *   - export readiness pack / audit pack
 *
 * Pattern: foloseste `mutateFreshStateForOrg` din `store.ts` ca să citească +
 * scrie state-ul org-ului. La approve, motorul `applyProposedChange` aplică
 * `proposedChange` pe entitate (DELEGAT către modulele specifice). Toate
 * scrierile emit ComplianceEvents în hash-chain ledger.
 *
 * NU întoarce niciodată exception când entitatea pe care încercăm să aplicăm
 * patch-ul nu există — log eveniment "approval.applied.skipped" și marchează
 * request-ul cu `notes`. Astfel, request orfan (e.g. finding șters între
 * timp) nu blochează queue-ul.
 */

import {
  appendComplianceEvents,
  createComplianceEvent,
  type ComplianceEventActorInput,
} from "@/lib/compliance/events"
import { mutateFreshStateForOrg, readState } from "@/lib/server/store"
import type {
  ApprovalEntityType,
  ApprovalRequest,
  ApprovalRequesterRole,
  ApprovalStatus,
  ComplianceState,
  ScanFinding,
} from "@/lib/compliance/types"

// ── Types ────────────────────────────────────────────────────────────────────

export type CreateApprovalRequestInput = {
  entityType: ApprovalEntityType
  entityId: string
  title: string
  description: string
  proposedChange: Record<string, unknown>
  requestedByEmail: string
  requestedByRole?: ApprovalRequesterRole
  /** Default 14 zile. */
  expiresInDays?: number
  linkedShareTokenId?: string
  notes?: string
}

export type ApprovalListFilters = {
  status?: ApprovalStatus[]
  entityType?: ApprovalEntityType[]
  limit?: number
}

export type ApprovalDecisionInput = {
  reviewerEmail: string
  reviewComment?: string
}

export type ApprovalDecisionResult = {
  request: ApprovalRequest
  /**
   * True dacă proposedChange a fost aplicat cu succes pe entitate. False
   * pentru request orfan (entitate inexistentă) sau pentru entityType care
   * nu are aplicare automată (e.g. `readiness_pack_exported` — informativ).
   */
  applied: boolean
  /** Dacă applied=false, scurt motiv. */
  applySkipReason?: string
}

// ── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_EXPIRES_IN_DAYS = 14
const MAX_REQUESTS_RETAINED = 500

const APPROVAL_LABELS_RO: Record<ApprovalEntityType, string> = {
  finding_status_change: "Schimbare status finding",
  dpia_screening: "Decizie screening DPIA",
  breach_anspdcp_decision: "Decizie notificare ANSPDCP",
  breach_subject_skip: "Omitere notificare persoane vizate",
  vendor_approved: "Aprobare vendor",
  vendor_rejected: "Respingere vendor",
  ai_system_classification: "Clasificare sistem AI",
  transparency_notice_published: "Publicare notificare transparență",
  readiness_pack_exported: "Export Readiness Pack",
  audit_pack_exported: "Export Audit Pack",
}

export function approvalEntityLabel(entityType: ApprovalEntityType): string {
  return APPROVAL_LABELS_RO[entityType] ?? entityType
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function uid(): string {
  return `apr-${Math.random().toString(36).slice(2, 10)}-${Math.random().toString(36).slice(2, 6)}`
}

function nowISO(): string {
  return new Date().toISOString()
}

function plusDaysISO(fromISO: string, days: number): string {
  return new Date(new Date(fromISO).getTime() + days * 24 * 3_600_000).toISOString()
}

function ensureArray<T>(value: T[] | undefined | null): T[] {
  return Array.isArray(value) ? value : []
}

// ── Reads ────────────────────────────────────────────────────────────────────

export async function readApprovalRequests(
  _orgId?: string,
): Promise<{ requests: ApprovalRequest[]; updatedAtISO: string }> {
  const state = await readState()
  return {
    requests: ensureArray(state.approvalRequests),
    updatedAtISO: nowISO(),
  }
}

export async function getApprovalRequestById(
  _orgId: string,
  id: string,
): Promise<ApprovalRequest | null> {
  const state = await readState()
  return ensureArray(state.approvalRequests).find((r) => r.id === id) ?? null
}

export async function listApprovalRequests(
  orgId: string,
  filters?: ApprovalListFilters,
): Promise<ApprovalRequest[]> {
  const { requests } = await readApprovalRequests(orgId)
  let out = requests
  if (filters?.status?.length) {
    out = out.filter((r) => filters.status!.includes(r.status))
  }
  if (filters?.entityType?.length) {
    out = out.filter((r) => filters.entityType!.includes(r.entityType))
  }
  // Newest first
  out = [...out].sort((a, b) => b.createdAtISO.localeCompare(a.createdAtISO))
  if (filters?.limit && filters.limit > 0) out = out.slice(0, filters.limit)
  return out
}

export type ApprovalCounts = {
  pending: number
  approved: number
  rejected: number
  withdrawn: number
  total: number
}

export function summarizeApprovals(requests: ApprovalRequest[]): ApprovalCounts {
  let pending = 0
  let approved = 0
  let rejected = 0
  let withdrawn = 0
  for (const r of requests) {
    if (r.status === "pending") pending++
    else if (r.status === "approved") approved++
    else if (r.status === "rejected") rejected++
    else if (r.status === "withdrawn") withdrawn++
  }
  return { pending, approved, rejected, withdrawn, total: requests.length }
}

// ── Create ───────────────────────────────────────────────────────────────────

export async function createApprovalRequest(
  orgId: string,
  input: CreateApprovalRequestInput,
  actor: ComplianceEventActorInput,
): Promise<ApprovalRequest> {
  if (!input.entityType || !input.entityId || !input.title.trim()) {
    throw new Error("entityType + entityId + title sunt obligatorii pentru o cerere de aprobare.")
  }

  const created = nowISO()
  const request: ApprovalRequest = {
    id: uid(),
    orgId,
    entityType: input.entityType,
    entityId: input.entityId,
    title: input.title.trim(),
    description: (input.description ?? "").trim(),
    proposedChange: input.proposedChange ?? {},
    requestedByEmail: input.requestedByEmail.trim().toLowerCase(),
    requestedByRole: input.requestedByRole ?? "client",
    requestedAtISO: created,
    status: "pending",
    expiresAtISO: plusDaysISO(created, input.expiresInDays ?? DEFAULT_EXPIRES_IN_DAYS),
    linkedShareTokenId: input.linkedShareTokenId,
    notes: input.notes,
    createdAtISO: created,
    updatedAtISO: created,
  }

  await mutateFreshStateForOrg(orgId, (state) => {
    const existing = ensureArray(state.approvalRequests)
    const event = createComplianceEvent(
      {
        type: "approval.created",
        entityType: "task",
        entityId: request.id,
        message: `${approvalEntityLabel(request.entityType)} — cerere creată: ${request.title}`,
        createdAtISO: created,
        metadata: {
          approvalId: request.id,
          entityType: request.entityType,
          entityId: request.entityId,
          requestedByRole: request.requestedByRole,
        },
      },
      actor,
    )
    return {
      ...state,
      approvalRequests: [request, ...existing].slice(0, MAX_REQUESTS_RETAINED),
      events: appendComplianceEvents(state, [event]),
    }
  })

  return request
}

// ── Decide (approve / reject / withdraw) ─────────────────────────────────────

async function setStatus(
  orgId: string,
  id: string,
  newStatus: ApprovalStatus,
  decision: ApprovalDecisionInput,
  actor: ComplianceEventActorInput,
): Promise<ApprovalRequest | null> {
  let updated: ApprovalRequest | null = null
  await mutateFreshStateForOrg(orgId, (state) => {
    const existing = ensureArray(state.approvalRequests)
    const idx = existing.findIndex((r) => r.id === id)
    if (idx === -1) return state
    const current = existing[idx]
    if (current.status !== "pending") return state

    const decidedAt = nowISO()
    updated = {
      ...current,
      status: newStatus,
      reviewedByEmail: decision.reviewerEmail.trim().toLowerCase(),
      reviewedAtISO: decidedAt,
      reviewComment: decision.reviewComment?.trim(),
      updatedAtISO: decidedAt,
    }

    const requests = [...existing]
    requests[idx] = updated

    const eventType =
      newStatus === "approved"
        ? "approval.approved"
        : newStatus === "rejected"
          ? "approval.rejected"
          : "approval.withdrawn"

    const event = createComplianceEvent(
      {
        type: eventType,
        entityType: "task",
        entityId: updated.id,
        message: `${approvalEntityLabel(updated.entityType)} — ${
          newStatus === "approved" ? "aprobat" : newStatus === "rejected" ? "respins" : "retras"
        } de ${decision.reviewerEmail}`,
        createdAtISO: decidedAt,
        metadata: {
          approvalId: updated.id,
          entityType: updated.entityType,
          entityId: updated.entityId,
          reviewerEmail: decision.reviewerEmail,
        },
      },
      actor,
    )

    return {
      ...state,
      approvalRequests: requests,
      events: appendComplianceEvents(state, [event]),
    }
  })
  return updated
}

export async function rejectApprovalRequest(
  orgId: string,
  id: string,
  decision: ApprovalDecisionInput,
  actor: ComplianceEventActorInput,
): Promise<ApprovalRequest | null> {
  return setStatus(orgId, id, "rejected", decision, actor)
}

export async function withdrawApprovalRequest(
  orgId: string,
  id: string,
  decision: ApprovalDecisionInput,
  actor: ComplianceEventActorInput,
): Promise<ApprovalRequest | null> {
  return setStatus(orgId, id, "withdrawn", decision, actor)
}

/**
 * Approve a request and apply `proposedChange` on the target entity in the
 * same atomic mutation.
 */
export async function approveApprovalRequest(
  orgId: string,
  id: string,
  decision: ApprovalDecisionInput,
  actor: ComplianceEventActorInput,
): Promise<ApprovalDecisionResult | null> {
  let result: ApprovalDecisionResult | null = null
  await mutateFreshStateForOrg(orgId, (state) => {
    const existing = ensureArray(state.approvalRequests)
    const idx = existing.findIndex((r) => r.id === id)
    if (idx === -1) return state
    const current = existing[idx]
    if (current.status !== "pending") return state

    const decidedAt = nowISO()
    const reviewerEmail = decision.reviewerEmail.trim().toLowerCase()

    // 1) Try to apply the proposed change on the entity.
    const apply = applyProposedChange(state, current)

    // 2) Update request — store reason if skipped.
    const updated: ApprovalRequest = {
      ...current,
      status: "approved",
      reviewedByEmail: reviewerEmail,
      reviewedAtISO: decidedAt,
      reviewComment: decision.reviewComment?.trim(),
      updatedAtISO: decidedAt,
      notes: apply.applied
        ? current.notes
        : [current.notes, `Aplicare neexecutată: ${apply.skipReason ?? "entitate inexistentă"}`]
            .filter(Boolean)
            .join(" · "),
    }

    const requests = [...existing]
    requests[idx] = updated

    const events = [
      createComplianceEvent(
        {
          type: "approval.approved",
          entityType: "task",
          entityId: updated.id,
          message: `${approvalEntityLabel(updated.entityType)} — aprobat de ${reviewerEmail}`,
          createdAtISO: decidedAt,
          metadata: {
            approvalId: updated.id,
            entityType: updated.entityType,
            entityId: updated.entityId,
            reviewerEmail,
            applied: apply.applied,
          },
        },
        actor,
      ),
    ]
    if (apply.applied) {
      events.push(
        createComplianceEvent(
          {
            type: "approval.applied",
            entityType: "task",
            entityId: updated.id,
            message: `Schimbarea propusă a fost aplicată pe ${updated.entityType} ${updated.entityId}`,
            createdAtISO: new Date(Date.parse(decidedAt) + 1).toISOString(),
            metadata: {
              approvalId: updated.id,
              entityType: updated.entityType,
              entityId: updated.entityId,
            },
          },
          actor,
        ),
      )
    } else {
      events.push(
        createComplianceEvent(
          {
            type: "approval.applied.skipped",
            entityType: "task",
            entityId: updated.id,
            message: `Aprobat, dar aplicarea a fost omisă: ${apply.skipReason ?? "necunoscut"}`,
            createdAtISO: new Date(Date.parse(decidedAt) + 1).toISOString(),
            metadata: {
              approvalId: updated.id,
              entityType: updated.entityType,
              entityId: updated.entityId,
              skipReason: apply.skipReason ?? "unknown",
            },
          },
          actor,
        ),
      )
    }

    result = {
      request: updated,
      applied: apply.applied,
      applySkipReason: apply.skipReason,
    }

    return {
      ...apply.nextState,
      approvalRequests: requests,
      events: appendComplianceEvents({ ...apply.nextState, approvalRequests: requests }, events),
    }
  })
  return result
}

// ── Expire ───────────────────────────────────────────────────────────────────

/**
 * Marchează automat ca expirate request-urile pending al căror `expiresAtISO`
 * a trecut. Idempotent — apelat de UI / cron / pre-listing.
 */
export async function expireOldApprovalRequests(
  orgId: string,
  actor: ComplianceEventActorInput,
  nowISOOverride?: string,
): Promise<number> {
  let expiredCount = 0
  const now = nowISOOverride ?? nowISO()
  await mutateFreshStateForOrg(orgId, (state) => {
    const existing = ensureArray(state.approvalRequests)
    if (existing.length === 0) return state

    const events: ReturnType<typeof createComplianceEvent>[] = []
    const next = existing.map((r) => {
      if (r.status !== "pending") return r
      if (!r.expiresAtISO) return r
      if (Date.parse(r.expiresAtISO) > Date.parse(now)) return r
      expiredCount++
      events.push(
        createComplianceEvent(
          {
            type: "approval.expired",
            entityType: "task",
            entityId: r.id,
            message: `${approvalEntityLabel(r.entityType)} — cerere expirată (deadline ${r.expiresAtISO})`,
            createdAtISO: now,
            metadata: { approvalId: r.id, entityType: r.entityType },
          },
          actor,
        ),
      )
      return { ...r, status: "withdrawn" as ApprovalStatus, updatedAtISO: now }
    })

    if (expiredCount === 0) return state

    return {
      ...state,
      approvalRequests: next,
      events: appendComplianceEvents(state, events),
    }
  })
  return expiredCount
}

// ── Apply (delegated by entityType) ──────────────────────────────────────────

type ApplyOutcome =
  | { applied: true; nextState: ComplianceState; skipReason?: undefined }
  | { applied: false; nextState: ComplianceState; skipReason: string }

/**
 * Aplică `proposedChange` pe entitate, în același state snapshot ca decizia
 * de aprobare (atomic). Toate sub-rutinele sunt pure pe state.
 *
 * Convenții payload:
 *   - finding_status_change: `{ findingStatus: "confirmed"|"resolved"|"dismissed", operationalEvidenceNote?: string }`
 *   - dpia_screening: `{ status: "approved"|"in_review"|"completed", evidenceNote?: string }`
 *   - breach_anspdcp_decision: `{ status: "anspdcp_required"|"no_notification_required", note?: string }`
 *   - breach_subject_skip: `{ skipReason: string }`
 *   - vendor_approved / vendor_rejected: `{ note?: string }`
 *   - ai_system_classification: `{ riskLevel: "minimal"|"limited"|"high", note?: string }`
 *   - readiness_pack_exported / audit_pack_exported / transparency_notice_published: informativ (no-op)
 */
function applyProposedChange(
  state: ComplianceState,
  request: ApprovalRequest,
): ApplyOutcome {
  const change = request.proposedChange ?? {}

  switch (request.entityType) {
    case "finding_status_change":
      return applyFindingStatusChange(state, request.entityId, change)
    case "dpia_screening":
      return applyDpiaStatusChange(state, request.entityId, change)
    case "breach_anspdcp_decision":
      return applyBreachAnspdcpDecision(state, request.entityId, change)
    case "breach_subject_skip":
      return applyBreachSubjectSkip(state, request.entityId, change)
    case "vendor_approved":
      return applyVendorReviewStatus(state, request.entityId, "approved", change)
    case "vendor_rejected":
      return applyVendorReviewStatus(state, request.entityId, "rejected", change)
    case "ai_system_classification":
      return applyAISystemClassification(state, request.entityId, change)
    case "transparency_notice_published":
    case "readiness_pack_exported":
    case "audit_pack_exported":
      // Informative: change has already happened operationally; approval is the audit trail.
      return { applied: true, nextState: state }
    default:
      return {
        applied: false,
        nextState: state,
        skipReason: `entityType necunoscut: ${request.entityType}`,
      }
  }
}

function applyFindingStatusChange(
  state: ComplianceState,
  findingId: string,
  change: Record<string, unknown>,
): ApplyOutcome {
  const findings = ensureArray(state.findings)
  const idx = findings.findIndex((f) => f.id === findingId)
  if (idx === -1) {
    return { applied: false, nextState: state, skipReason: `finding ${findingId} nu există` }
  }
  const newStatus = change.findingStatus
  const validStatuses = new Set<ScanFinding["findingStatus"]>([
    "open",
    "confirmed",
    "dismissed",
    "resolved",
    "under_monitoring",
  ])
  if (typeof newStatus !== "string" || !validStatuses.has(newStatus as ScanFinding["findingStatus"])) {
    return { applied: false, nextState: state, skipReason: `findingStatus invalid: ${String(newStatus)}` }
  }
  const next = [...findings]
  const note = typeof change.operationalEvidenceNote === "string" ? change.operationalEvidenceNote : undefined
  next[idx] = {
    ...findings[idx],
    findingStatus: newStatus as ScanFinding["findingStatus"],
    findingStatusUpdatedAtISO: nowISO(),
    ...(note ? { operationalEvidenceNote: note } : {}),
  }
  return { applied: true, nextState: { ...state, findings: next } }
}

function applyDpiaStatusChange(
  state: ComplianceState,
  dpiaId: string,
  change: Record<string, unknown>,
): ApplyOutcome {
  const records = ensureArray(state.dpiaRecords)
  const idx = records.findIndex((d) => d.id === dpiaId)
  if (idx === -1) {
    return { applied: false, nextState: state, skipReason: `DPIA ${dpiaId} nu există` }
  }
  const newStatus = change.status
  const validStatuses = new Set([
    "draft",
    "in_review",
    "approved",
    "mitigations_in_progress",
    "completed",
    "archived",
  ])
  if (typeof newStatus !== "string" || !validStatuses.has(newStatus)) {
    return { applied: false, nextState: state, skipReason: `DPIA status invalid: ${String(newStatus)}` }
  }
  const evidenceNote = typeof change.evidenceNote === "string" ? change.evidenceNote : undefined
  const next = [...records]
  const now = nowISO()
  next[idx] = {
    ...records[idx],
    status: newStatus as (typeof records)[number]["status"],
    ...(evidenceNote ? { evidenceNote } : {}),
    ...(newStatus === "approved" ? { approvedAtISO: now } : {}),
    updatedAtISO: now,
  }
  return { applied: true, nextState: { ...state, dpiaRecords: next } }
}

function applyBreachAnspdcpDecision(
  state: ComplianceState,
  breachId: string,
  change: Record<string, unknown>,
): ApplyOutcome {
  const records = ensureArray(state.breachRecords)
  const idx = records.findIndex((b) => b.id === breachId)
  if (idx === -1) {
    return { applied: false, nextState: state, skipReason: `breach ${breachId} nu există` }
  }
  const newStatus = change.status
  const validStatuses = new Set([
    "anspdcp_required",
    "anspdcp_notified",
    "no_notification_required",
  ])
  if (typeof newStatus !== "string" || !validStatuses.has(newStatus)) {
    return { applied: false, nextState: state, skipReason: `breach status invalid: ${String(newStatus)}` }
  }
  const next = [...records]
  const now = nowISO()
  next[idx] = {
    ...records[idx],
    status: newStatus as (typeof records)[number]["status"],
    anspdcpNotificationRequired: newStatus !== "no_notification_required",
    updatedAtISO: now,
  }
  return { applied: true, nextState: { ...state, breachRecords: next } }
}

function applyBreachSubjectSkip(
  state: ComplianceState,
  breachId: string,
  change: Record<string, unknown>,
): ApplyOutcome {
  const records = ensureArray(state.breachRecords)
  const idx = records.findIndex((b) => b.id === breachId)
  if (idx === -1) {
    return { applied: false, nextState: state, skipReason: `breach ${breachId} nu există` }
  }
  const skipReason = typeof change.skipReason === "string" ? change.skipReason.trim() : ""
  if (!skipReason) {
    return { applied: false, nextState: state, skipReason: "skipReason gol" }
  }
  const next = [...records]
  const now = nowISO()
  const subjectNotification = {
    ...(records[idx].subjectNotification ?? {
      method: "not_yet" as const,
      contentDocumented: false,
    }),
    skipReason,
  }
  next[idx] = {
    ...records[idx],
    subjectNotificationRequired: false,
    subjectNotification,
    updatedAtISO: now,
  }
  return { applied: true, nextState: { ...state, breachRecords: next } }
}

function applyVendorReviewStatus(
  state: ComplianceState,
  vendorId: string,
  reviewStatus: "approved" | "rejected",
  change: Record<string, unknown>,
): ApplyOutcome {
  const records = ensureArray(state.vendorRecords)
  const idx = records.findIndex((v) => v.id === vendorId)
  if (idx === -1) {
    return { applied: false, nextState: state, skipReason: `vendor ${vendorId} nu există` }
  }
  const note = typeof change.note === "string" ? change.note : undefined
  const next = [...records]
  const now = nowISO()
  next[idx] = {
    ...records[idx],
    reviewStatus,
    reviewedAtISO: now,
    notes: note ?? records[idx].notes,
    updatedAtISO: now,
  }
  return { applied: true, nextState: { ...state, vendorRecords: next } }
}

function applyAISystemClassification(
  state: ComplianceState,
  systemId: string,
  change: Record<string, unknown>,
): ApplyOutcome {
  const systems = ensureArray(state.aiSystems)
  const idx = systems.findIndex((s) => s.id === systemId)
  if (idx === -1) {
    return { applied: false, nextState: state, skipReason: `AI system ${systemId} nu există` }
  }
  const newLevel = change.riskLevel
  const validLevels = new Set(["minimal", "limited", "high"])
  if (typeof newLevel !== "string" || !validLevels.has(newLevel)) {
    return { applied: false, nextState: state, skipReason: `risk level invalid: ${String(newLevel)}` }
  }
  const next = [...systems]
  next[idx] = {
    ...systems[idx],
    riskLevel: newLevel as (typeof systems)[number]["riskLevel"],
  }
  return { applied: true, nextState: { ...state, aiSystems: next } }
}

// ── Helper: gate pentru cabinet mode (folosit din alte module) ───────────────

/**
 * Returnează `true` dacă acțiunea trebuie să meargă prin coadă (workspaceMode
 * `cabinet` + requester este `client`). Apelat de modulele de business (DPIA
 * PATCH, breach PATCH, etc.) când vor să route prin queue.
 *
 * NU îi face apelul către `createApprovalRequest` — caller-ul decide ce să
 * facă (route sau apply direct). Funcția e doar predicat.
 */
export function requiresApprovalForRequest(
  workspaceMode: "imm-classic" | "ai-builder" | "cabinet" | "solo",
  requesterRole: ApprovalRequesterRole,
): boolean {
  return workspaceMode === "cabinet" && requesterRole === "client"
}
