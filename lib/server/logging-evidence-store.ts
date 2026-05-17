/**
 * Sprint 018 — Logging Evidence store (CRUD + lifecycle + evidence attach +
 * retention tracking peste `state.loggingEvidence[]` + ledger evenimente +
 * finding emission obligatoriu).
 *
 * Pattern: identic cu oversight-store (Sprint 017) → folosește
 * `mutateFreshStateForOrg` din `lib/server/store.ts` pentru audit-trail
 * hash-chain consistent.
 *
 * Surface API:
 *  - readLoggingConfigs(orgId)
 *  - getLoggingConfigById(orgId, id)
 *  - createConfig(orgId, input, actor)              → creează + evaluator + findings
 *  - updateConfig(orgId, id, patch, actor)          → merge patch + re-evaluează
 *  - deleteConfig(orgId, id, actor)
 *  - markConfigApproved(orgId, id, approvedByEmail, actor)
 *  - markConfigRejected(orgId, id, reason, actor)
 *  - attachLogEvidence(orgId, id, evidenceItem, actor)  → setează lastEvidenceAtISO + recalculează retentionStatus
 *  - scheduleRetentionAlert(orgId, id, daysBeforeExpiry)  → cron hook pentru Sprint 022
 *  - buildLoggingMarkdown(record, orgName, systemName?)
 *
 * Findings emise sunt persistate prin createFinding() (din findings-store) și
 * ID-urile rezultate sunt scrise în `linkedFindingIds[]` pe record.
 */

import {
  appendComplianceEvents,
  createComplianceEvent,
  type ComplianceEventActorInput,
} from "@/lib/compliance/events"
import {
  computeRetentionStatus,
  evaluateLogging,
} from "@/lib/compliance/logging-evaluator"
import { DEFAULT_MIN_RETENTION_MONTHS_BY_SEVERITY } from "@/lib/compliance/logging-schema"
import { createFinding } from "@/lib/server/findings-store"
import { mutateFreshStateForOrg, readState } from "@/lib/server/store"
import type {
  AISystemRecord,
  LogEvidenceItem,
  LoggingBiometricSpecifics,
  LoggingCompleteness,
  LoggingConfig,
  LoggingConfigStatus,
  LoggingEventCategory,
  LoggingRetentionStatus,
  LoggingSeverityLevel,
  LoggingStorageBackend,
} from "@/lib/compliance/types"

// ── Types ────────────────────────────────────────────────────────────────────

export type LoggingSummary = {
  total: number
  draft: number
  inReview: number
  active: number
  expired: number
  obsolete: number
  rejected: number
  complete: number
  partial: number
  incomplete: number
  compliantRetention: number
  approachingExpiry: number
  expiredRetention: number
  noEvidence: number
}

export type CreateLoggingInput = {
  title: string
  linkedAISystemId: string
  severityLevel: LoggingSeverityLevel
  eventCategoriesLogged?: LoggingEventCategory[]
  storageBackend: LoggingStorageBackend
  storageLocation: string
  minRetentionMonths?: number
  actualRetentionMonths: number
  retentionPolicy: string
  integrityMechanism: LoggingConfig["integrityMechanism"]
  integrityMechanismDescription?: string
  accessRoleDescription: string
  accessLogged: boolean
  biometricSpecific?: LoggingBiometricSpecifics
  evidenceChecklist?: string[]
  evidenceItems?: LogEvidenceItem[]
  notes?: string
  nextReviewISO?: string
}

export type UpdateLoggingPatch = Partial<
  Omit<
    LoggingConfig,
    | "id"
    | "orgId"
    | "linkedFindingIds"
    | "createdAtISO"
    | "updatedAtISO"
    | "completeness"
    | "retentionStatus"
    | "generatedMarkdown"
  >
>

const CONFIG_STATUSES: LoggingConfigStatus[] = [
  "draft",
  "in_review",
  "active",
  "expired",
  "obsolete",
  "rejected",
]

const NINETY_DAYS_MS = 90 * 86_400_000

// ── Helpers ──────────────────────────────────────────────────────────────────

function nowISO(): string {
  return new Date().toISOString()
}

function uid(): string {
  return `logging-${Math.random().toString(36).slice(2, 10)}`
}

function evidenceId(): string {
  return `logev-${Math.random().toString(36).slice(2, 10)}`
}

export function isLoggingConfigStatus(value: unknown): value is LoggingConfigStatus {
  return (
    typeof value === "string" &&
    CONFIG_STATUSES.includes(value as LoggingConfigStatus)
  )
}

export function summarizeLoggingConfigs(records: LoggingConfig[]): LoggingSummary {
  let draft = 0
  let inReview = 0
  let active = 0
  let expired = 0
  let obsolete = 0
  let rejected = 0
  let complete = 0
  let partial = 0
  let incomplete = 0
  let compliantRetention = 0
  let approachingExpiry = 0
  let expiredRetention = 0
  let noEvidence = 0
  for (const r of records) {
    if (r.status === "draft") draft++
    else if (r.status === "in_review") inReview++
    else if (r.status === "active") active++
    else if (r.status === "expired") expired++
    else if (r.status === "obsolete") obsolete++
    else if (r.status === "rejected") rejected++
    if (r.completeness === "complete") complete++
    else if (r.completeness === "partial") partial++
    else incomplete++
    if (r.retentionStatus === "compliant") compliantRetention++
    else if (r.retentionStatus === "approaching_expiry") approachingExpiry++
    else if (r.retentionStatus === "expired") expiredRetention++
    else noEvidence++
  }
  return {
    total: records.length,
    draft,
    inReview,
    active,
    expired,
    obsolete,
    rejected,
    complete,
    partial,
    incomplete,
    compliantRetention,
    approachingExpiry,
    expiredRetention,
    noEvidence,
  }
}

function findSystem(
  state: { aiSystems?: AISystemRecord[] },
  systemId: string,
): AISystemRecord | undefined {
  return state.aiSystems?.find((s) => s.id === systemId)
}

// ── Read ─────────────────────────────────────────────────────────────────────

export async function readLoggingConfigs(_orgId?: string): Promise<{
  records: LoggingConfig[]
  summary: LoggingSummary
}> {
  const state = await readState()
  const records = state.loggingEvidence ?? []
  return { records, summary: summarizeLoggingConfigs(records) }
}

export async function getLoggingConfigById(
  _orgId: string,
  id: string,
): Promise<LoggingConfig | null> {
  const state = await readState()
  return state.loggingEvidence?.find((r) => r.id === id) ?? null
}

// ── Internal: rulează evaluator + persistă findings ─────────────────────────

async function runEvaluatorAndPersistFindings(
  orgId: string,
  record: LoggingConfig,
  orgName: string,
  linkedSystem: AISystemRecord | undefined,
  actor: ComplianceEventActorInput,
): Promise<{
  completeness: LoggingCompleteness
  retentionStatus: LoggingRetentionStatus
  generatedMarkdown: string
  linkedFindingIds: string[]
}> {
  const evalResult = evaluateLogging({
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
        ownerSuggestion: "Responsabil logging / DPO",
        closeCondition: candidate.resolution?.closureEvidence,
      },
      actor,
    )
    findingIds.push(created.id)
  }
  return {
    completeness: evalResult.completeness,
    retentionStatus: evalResult.retentionStatus,
    generatedMarkdown: evalResult.generatedMarkdown,
    linkedFindingIds: findingIds,
  }
}

// ── Create ───────────────────────────────────────────────────────────────────

export async function createConfig(
  orgId: string,
  input: CreateLoggingInput,
  actor: ComplianceEventActorInput,
  orgName = "Organizația",
): Promise<LoggingConfig> {
  const title = input.title?.trim()
  if (!title) throw new Error("Logging config title required")
  if (!input.linkedAISystemId) {
    throw new Error("Logging config linkedAISystemId required")
  }
  if (!input.storageBackend) throw new Error("Logging storageBackend required")
  if (!input.storageLocation?.trim()) {
    throw new Error("Logging storageLocation required")
  }
  if (input.actualRetentionMonths < 0) {
    throw new Error("actualRetentionMonths must be >= 0")
  }

  const minRetention =
    input.minRetentionMonths ??
    DEFAULT_MIN_RETENTION_MONTHS_BY_SEVERITY[input.severityLevel]

  const now = nowISO()
  const state = await readState()
  const linkedSystem = findSystem(state, input.linkedAISystemId)

  const lastEvidenceAtISO =
    input.evidenceItems && input.evidenceItems.length > 0
      ? input.evidenceItems
          .map((e) => e.uploadedAtISO)
          .sort()
          .reverse()[0]
      : undefined

  const draft: LoggingConfig = {
    id: uid(),
    orgId,
    title,
    linkedAISystemId: input.linkedAISystemId,
    severityLevel: input.severityLevel,
    eventCategoriesLogged: input.eventCategoriesLogged ?? [],
    storageBackend: input.storageBackend,
    storageLocation: input.storageLocation.trim(),
    minRetentionMonths: minRetention,
    actualRetentionMonths: input.actualRetentionMonths,
    retentionPolicy: input.retentionPolicy ?? "",
    integrityMechanism: input.integrityMechanism,
    integrityMechanismDescription: input.integrityMechanismDescription ?? "",
    accessRoleDescription: input.accessRoleDescription ?? "",
    accessLogged: input.accessLogged,
    biometricSpecific: input.biometricSpecific,
    status: "draft",
    completeness: "incomplete",
    retentionStatus: "no_evidence",
    lastEvidenceAtISO,
    nextReviewISO:
      input.nextReviewISO ?? new Date(Date.now() + NINETY_DAYS_MS).toISOString(),
    evidenceChecklist: input.evidenceChecklist ?? [],
    evidenceItems: input.evidenceItems ?? [],
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

  const enriched: LoggingConfig = {
    ...draft,
    completeness: evalUpdate.completeness,
    retentionStatus: evalUpdate.retentionStatus,
    generatedMarkdown: evalUpdate.generatedMarkdown,
    linkedFindingIds: evalUpdate.linkedFindingIds,
  }

  await mutateFreshStateForOrg(orgId, (s) => {
    return {
      ...s,
      loggingEvidence: [enriched, ...(s.loggingEvidence ?? [])].slice(0, 200),
      events: appendComplianceEvents(s, [
        createComplianceEvent(
          {
            type: "logging.created",
            entityType: "system",
            entityId: enriched.id,
            message: `Logging Config creat: ${enriched.title} · ${enriched.completeness} · severity ${enriched.severityLevel}`,
            createdAtISO: now,
            metadata: {
              linkedAISystemId: enriched.linkedAISystemId,
              severityLevel: enriched.severityLevel,
              completeness: enriched.completeness,
              retentionStatus: enriched.retentionStatus,
              minRetentionMonths: enriched.minRetentionMonths,
              actualRetentionMonths: enriched.actualRetentionMonths,
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

export async function updateConfig(
  orgId: string,
  id: string,
  patch: UpdateLoggingPatch,
  actor: ComplianceEventActorInput,
  orgName = "Organizația",
): Promise<LoggingConfig | null> {
  const existing = await getLoggingConfigById(orgId, id)
  if (!existing) return null

  const merged: LoggingConfig = {
    ...existing,
    ...patch,
    id: existing.id,
    orgId: existing.orgId,
    createdAtISO: existing.createdAtISO,
    linkedFindingIds: existing.linkedFindingIds,
    updatedAtISO: nowISO(),
  }
  if (patch.status && !isLoggingConfigStatus(patch.status)) {
    merged.status = existing.status
  }

  // Re-rulează evaluator pentru completeness + retention + markdown — nu emite
  // findings noi la update (pentru a evita duplicate).
  const state = await readState()
  const linkedSystem = findSystem(state, merged.linkedAISystemId)
  const evalResult = evaluateLogging({
    record: merged,
    orgName,
    systemName: linkedSystem?.name,
    linkedSystem,
  })
  merged.completeness = evalResult.completeness
  merged.retentionStatus = evalResult.retentionStatus
  merged.generatedMarkdown = evalResult.generatedMarkdown

  await mutateFreshStateForOrg(orgId, (s) => {
    const records = s.loggingEvidence ?? []
    const idx = records.findIndex((r) => r.id === id)
    if (idx === -1) return s
    const next = [...records]
    next[idx] = merged
    return {
      ...s,
      loggingEvidence: next,
      events: appendComplianceEvents(s, [
        createComplianceEvent(
          {
            type: "logging.updated",
            entityType: "system",
            entityId: merged.id,
            message: `Logging Config actualizat: ${merged.title} · status ${merged.status} · ${merged.completeness} · retention ${merged.retentionStatus}`,
            createdAtISO: nowISO(),
            metadata: {
              status: merged.status,
              completeness: merged.completeness,
              retentionStatus: merged.retentionStatus,
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

export async function deleteConfig(
  orgId: string,
  id: string,
  actor: ComplianceEventActorInput,
): Promise<boolean> {
  let removed = false
  await mutateFreshStateForOrg(orgId, (s) => {
    const records = s.loggingEvidence ?? []
    const target = records.find((r) => r.id === id)
    if (!target) return s
    removed = true
    return {
      ...s,
      loggingEvidence: records.filter((r) => r.id !== id),
      events: appendComplianceEvents(s, [
        createComplianceEvent(
          {
            type: "logging.deleted",
            entityType: "system",
            entityId: id,
            message: `Logging Config șters: ${target.title}`,
            createdAtISO: nowISO(),
            metadata: {
              status: target.status,
              completeness: target.completeness,
            },
          },
          actor,
        ),
      ]),
    }
  })
  return removed
}

// ── Lifecycle: approve / reject ─────────────────────────────────────────────

export async function markConfigApproved(
  orgId: string,
  id: string,
  approvedByEmail: string,
  actor: ComplianceEventActorInput,
): Promise<LoggingConfig | null> {
  if (!approvedByEmail || !approvedByEmail.includes("@")) {
    throw new Error("Approver email required")
  }
  const existing = await getLoggingConfigById(orgId, id)
  if (!existing) return null
  const now = nowISO()
  const next: LoggingConfig = {
    ...existing,
    status: "active",
    approvedByEmail,
    approvedAtISO: now,
    nextReviewISO:
      existing.nextReviewISO ?? new Date(Date.now() + NINETY_DAYS_MS).toISOString(),
    rejectionReason: undefined,
    updatedAtISO: now,
  }
  await mutateFreshStateForOrg(orgId, (s) => {
    const records = s.loggingEvidence ?? []
    const idx = records.findIndex((r) => r.id === id)
    if (idx === -1) return s
    const arr = [...records]
    arr[idx] = next
    return {
      ...s,
      loggingEvidence: arr,
      events: appendComplianceEvents(s, [
        createComplianceEvent(
          {
            type: "logging.approved",
            entityType: "system",
            entityId: next.id,
            message: `Logging Config activat: ${next.title} · de ${approvedByEmail}`,
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

export async function markConfigRejected(
  orgId: string,
  id: string,
  reason: string,
  actor: ComplianceEventActorInput,
): Promise<LoggingConfig | null> {
  if (!reason || reason.trim().length < 5) {
    throw new Error("Logging rejection reason required (min 5 chars)")
  }
  const existing = await getLoggingConfigById(orgId, id)
  if (!existing) return null
  const now = nowISO()
  const next: LoggingConfig = {
    ...existing,
    status: "rejected",
    rejectionReason: reason.trim(),
    approvedByEmail: undefined,
    approvedAtISO: undefined,
    updatedAtISO: now,
  }
  await mutateFreshStateForOrg(orgId, (s) => {
    const records = s.loggingEvidence ?? []
    const idx = records.findIndex((r) => r.id === id)
    if (idx === -1) return s
    const arr = [...records]
    arr[idx] = next
    return {
      ...s,
      loggingEvidence: arr,
      events: appendComplianceEvents(s, [
        createComplianceEvent(
          {
            type: "logging.rejected",
            entityType: "system",
            entityId: next.id,
            message: `Logging Config respins: ${next.title} · motiv: ${reason.trim()}`,
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

export type AttachLogEvidenceInput = {
  type: LogEvidenceItem["type"]
  description: string
  url?: string
  fileName?: string
  fileHash?: string
  coversPeriodStartISO?: string
  coversPeriodEndISO?: string
  eventCount?: number
}

export async function attachLogEvidence(
  orgId: string,
  id: string,
  input: AttachLogEvidenceInput,
  actor: ComplianceEventActorInput,
): Promise<LoggingConfig | null> {
  if (!input.description || input.description.trim().length < 3) {
    throw new Error("Log evidence description required")
  }
  const existing = await getLoggingConfigById(orgId, id)
  if (!existing) return null
  const now = nowISO()
  const newItem: LogEvidenceItem = {
    id: evidenceId(),
    type: input.type,
    description: input.description.trim(),
    uploadedAtISO: now,
    uploadedByEmail: actor.label,
    url: input.url?.trim() || undefined,
    fileName: input.fileName?.trim() || undefined,
    fileHash: input.fileHash?.trim() || undefined,
    coversPeriodStartISO: input.coversPeriodStartISO,
    coversPeriodEndISO: input.coversPeriodEndISO,
    eventCount: input.eventCount,
  }
  const next: LoggingConfig = {
    ...existing,
    evidenceItems: [...existing.evidenceItems, newItem],
    lastEvidenceAtISO: now,
    updatedAtISO: now,
  }
  // Recalculate retention status after attaching new evidence.
  next.retentionStatus = computeRetentionStatus(next)

  await mutateFreshStateForOrg(orgId, (s) => {
    const records = s.loggingEvidence ?? []
    const idx = records.findIndex((r) => r.id === id)
    if (idx === -1) return s
    const arr = [...records]
    arr[idx] = next
    return {
      ...s,
      loggingEvidence: arr,
      events: appendComplianceEvents(s, [
        createComplianceEvent(
          {
            type: "logging.evidence_attached",
            entityType: "system",
            entityId: next.id,
            message: `Dovadă logs atașată Logging Config "${next.title}": ${newItem.type} — ${newItem.description}`,
            createdAtISO: now,
            metadata: {
              evidenceId: newItem.id,
              evidenceType: newItem.type,
              retentionStatus: next.retentionStatus,
              hasUrl: Boolean(newItem.url),
              hasHash: Boolean(newItem.fileHash),
            },
          },
          actor,
        ),
      ]),
    }
  })
  return next
}

// ── Retention alert scheduling (Sprint 022 cron hook) ───────────────────────

/**
 * Emite un eveniment logging.retention_alert_scheduled care va fi consumat
 * de cron-ul Sprint 022 (Preventive engine) pentru a trimite reminder DPO
 * înainte de expirarea logs. Operațiune idempotentă — siguranță apel multiplu.
 */
export async function scheduleRetentionAlert(
  orgId: string,
  id: string,
  daysBeforeExpiry: number,
  actor: ComplianceEventActorInput,
): Promise<LoggingConfig | null> {
  if (daysBeforeExpiry < 0 || daysBeforeExpiry > 365) {
    throw new Error("daysBeforeExpiry must be 0..365")
  }
  const existing = await getLoggingConfigById(orgId, id)
  if (!existing) return null
  const now = nowISO()
  let alertAtISO: string | undefined
  if (existing.lastEvidenceAtISO) {
    const lastMs = new Date(existing.lastEvidenceAtISO).getTime()
    const expiryMs = lastMs + existing.actualRetentionMonths * 30 * 86_400_000
    alertAtISO = new Date(expiryMs - daysBeforeExpiry * 86_400_000).toISOString()
  }
  await mutateFreshStateForOrg(orgId, (s) => {
    return {
      ...s,
      events: appendComplianceEvents(s, [
        createComplianceEvent(
          {
            type: "logging.retention_alert_scheduled",
            entityType: "system",
            entityId: existing.id,
            message: `Alert retenție planificat: ${existing.title} · ${daysBeforeExpiry} zile înainte de expirare`,
            createdAtISO: now,
            metadata: {
              daysBeforeExpiry,
              alertAtISO: alertAtISO ?? "no_evidence",
              actualRetentionMonths: existing.actualRetentionMonths,
            },
          },
          actor,
        ),
      ]),
    }
  })
  return existing
}

// ── Markdown export (regenerat live) ─────────────────────────────────────────

export function buildLoggingMarkdown(
  record: LoggingConfig,
  orgName: string,
  systemName?: string,
): string {
  const evalResult = evaluateLogging({
    record,
    orgName,
    systemName,
  })
  return evalResult.generatedMarkdown
}
