/**
 * Sprint 020 — AI Incident store (CRUD + lifecycle + notifications + root
 * cause + closure peste `state.aiIncidents[]` + ledger evenimente + finding
 * emission obligatoriu).
 *
 * Pattern: identic cu pmm-store (Sprint 019) — folosește
 * `mutateFreshStateForOrg` din `lib/server/store.ts` pentru audit-trail
 * hash-chain consistent.
 *
 * Surface API:
 *  - readAIIncidents(orgId) → { records, summary }
 *  - getIncidentById(orgId, id)
 *  - createIncident(orgId, input, actor)   → auto-compute deadline + emit findings
 *  - updateIncident(orgId, id, patch, actor)
 *  - deleteIncident(orgId, id, actor)
 *  - markAuthorityNotified(orgId, id, input, actor)
 *  - recordRootCause(orgId, id, input, actor)
 *  - closeIncident(orgId, id, closureNotes, actor)
 *  - linkToBreach(orgId, incidentId, breachId, actor)   — bidirectional
 *  - linkToPmmAnomaly(orgId, incidentId, planId, anomalyId, actor) — bidirectional
 *  - buildIncidentMarkdown(record, orgName, systemName?) — re-run evaluator
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
  computeReportingDeadline,
  evaluateIncident,
} from "@/lib/compliance/ai-incident-evaluator"
import { createFinding } from "@/lib/server/findings-store"
import { mutateFreshStateForOrg, readState } from "@/lib/server/store"
import type {
  AIIncident,
  AIIncidentCategory,
  AIIncidentNotificationRecord,
  AIIncidentNotificationStatus,
  AIIncidentRootCause,
  AIIncidentSeverity,
  AIIncidentStatus,
  AISystemRecord,
  ScanFinding,
} from "@/lib/compliance/types"

// ── Types ────────────────────────────────────────────────────────────────────

export type AIIncidentSummary = {
  total: number
  draft: number
  assessing: number
  notificationRequired: number
  authorityNotified: number
  rootCauseInvestigation: number
  remediated: number
  closed: number
  notReportable: number
  overdue: number
  urgent: number
  catastrophic: number
  withRootCause: number
}

export type CreateAIIncidentInput = {
  title: string
  description: string
  category: AIIncidentCategory
  severity: AIIncidentSeverity
  linkedAISystemId: string
  affectedSubjectsCategories?: string[]
  affectedSubjectsCount?: number
  occurredAtISO?: string
  /** Default = now. Clock-ul Art. 73(3) începe AICI. */
  detectedAtISO?: string
  notificationRequired?: boolean
  assignedToEmail?: string
  linkedBreachId?: string
  linkedPmmAnomalyId?: string
  notes?: string
}

export type UpdateAIIncidentPatch = Partial<
  Omit<
    AIIncident,
    | "id"
    | "orgId"
    | "linkedFindingIds"
    | "createdAtISO"
    | "updatedAtISO"
    | "reportingDeadlineISO"
    | "reportingDeadlineDays"
    | "notifications"
    | "rootCause"
    | "generatedMarkdown"
    | "closedAtISO"
  >
>

export type MarkAuthorityNotifiedInput = {
  authorityName: string
  status?: AIIncidentNotificationStatus // default "submitted"
  submittedAtISO?: string
  referenceNumber?: string
  acknowledgmentReceivedAtISO?: string
  additionalInfoRequestedAtISO?: string
  contactPersonEmail?: string
  notes?: string
}

export type RecordRootCauseInput = {
  rootCauseDescription: string
  contributingFactors?: string[]
  evidenceCollected?: string[]
  remediationActions?: string[]
  preventionActions?: string[]
  preventiveMeasuresImplementedAtISO?: string
  identifiedAtISO?: string
  identifiedByEmail?: string
}

const VALID_STATUSES: AIIncidentStatus[] = [
  "draft",
  "assessing",
  "notification_required",
  "authority_notified",
  "root_cause_investigation",
  "remediated",
  "closed",
  "not_reportable",
]

const VALID_SEVERITIES: AIIncidentSeverity[] = [
  "minor",
  "moderate",
  "serious",
  "catastrophic",
]

const VALID_CATEGORIES: AIIncidentCategory[] = [
  "death_or_serious_harm_health",
  "critical_infrastructure_disruption",
  "fundamental_rights_infringement",
  "widespread_infringement",
  "property_or_environment_harm",
  "other_serious",
]

const VALID_NOTIF_STATUSES: AIIncidentNotificationStatus[] = [
  "draft",
  "submitted",
  "acknowledged",
  "additional_info_requested",
]

// ── Helpers ──────────────────────────────────────────────────────────────────

function nowISO(): string {
  return new Date().toISOString()
}

function uid(): string {
  return `ai-inc-${Math.random().toString(36).slice(2, 10)}`
}

function notificationId(): string {
  return `ai-inc-notif-${Math.random().toString(36).slice(2, 10)}`
}

export function isAIIncidentStatus(value: unknown): value is AIIncidentStatus {
  return typeof value === "string" && VALID_STATUSES.includes(value as AIIncidentStatus)
}

export function isAIIncidentSeverity(
  value: unknown,
): value is AIIncidentSeverity {
  return (
    typeof value === "string" &&
    VALID_SEVERITIES.includes(value as AIIncidentSeverity)
  )
}

export function isAIIncidentCategory(
  value: unknown,
): value is AIIncidentCategory {
  return (
    typeof value === "string" &&
    VALID_CATEGORIES.includes(value as AIIncidentCategory)
  )
}

export function isNotificationStatus(
  value: unknown,
): value is AIIncidentNotificationStatus {
  return (
    typeof value === "string" &&
    VALID_NOTIF_STATUSES.includes(value as AIIncidentNotificationStatus)
  )
}

export function summarizeAIIncidents(
  records: AIIncident[],
  nowISOarg: string = new Date().toISOString(),
): AIIncidentSummary {
  let draft = 0
  let assessing = 0
  let notificationRequired = 0
  let authorityNotified = 0
  let rootCauseInvestigation = 0
  let remediated = 0
  let closed = 0
  let notReportable = 0
  let overdue = 0
  let urgent = 0
  let catastrophic = 0
  let withRootCause = 0
  const nowMs = new Date(nowISOarg).getTime()
  for (const r of records) {
    if (r.status === "draft") draft++
    else if (r.status === "assessing") assessing++
    else if (r.status === "notification_required") notificationRequired++
    else if (r.status === "authority_notified") authorityNotified++
    else if (r.status === "root_cause_investigation") rootCauseInvestigation++
    else if (r.status === "remediated") remediated++
    else if (r.status === "closed") closed++
    else if (r.status === "not_reportable") notReportable++
    const submitted = r.notifications.some(
      (n) => n.status === "submitted" || n.status === "acknowledged",
    )
    const deadlineMs = new Date(r.reportingDeadlineISO).getTime()
    if (r.notificationRequired && !submitted) {
      const hoursLeft = (deadlineMs - nowMs) / 3_600_000
      if (hoursLeft <= 0) overdue++
      else if (hoursLeft <= 24) urgent++
    }
    if (r.severity === "catastrophic") catastrophic++
    if (r.rootCause) withRootCause++
  }
  return {
    total: records.length,
    draft,
    assessing,
    notificationRequired,
    authorityNotified,
    rootCauseInvestigation,
    remediated,
    closed,
    notReportable,
    overdue,
    urgent,
    catastrophic,
    withRootCause,
  }
}

function findSystem(
  state: { aiSystems?: AISystemRecord[] },
  systemId: string,
): AISystemRecord | undefined {
  return state.aiSystems?.find((s) => s.id === systemId)
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter((v) => v.length > 0)
}

// ── Internal: evaluator + finding persistence ───────────────────────────────

async function runEvaluatorAndPersistFindings(
  orgId: string,
  record: AIIncident,
  orgName: string,
  linkedSystem: AISystemRecord | undefined,
  actor: ComplianceEventActorInput,
  skipFindingPersistence = false,
): Promise<{
  generatedMarkdown: string
  newFindingIds: string[]
  candidateFindings: ScanFinding[]
}> {
  const evalResult = evaluateIncident({
    record,
    orgName,
    systemName: linkedSystem?.name,
    linkedSystem,
  })
  const findingIds: string[] = []
  if (!skipFindingPersistence) {
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
          ownerSuggestion: "Responsabil incident / DPO",
          closeCondition: candidate.resolution?.closureEvidence,
        },
        actor,
      )
      findingIds.push(created.id)
    }
  }
  return {
    generatedMarkdown: evalResult.generatedMarkdown,
    newFindingIds: findingIds,
    candidateFindings: evalResult.candidateFindings,
  }
}

// ── Read ─────────────────────────────────────────────────────────────────────

export async function readAIIncidents(_orgId?: string): Promise<{
  records: AIIncident[]
  summary: AIIncidentSummary
}> {
  const state = await readState()
  const records = (state.aiIncidents ?? []) as AIIncident[]
  return { records, summary: summarizeAIIncidents(records) }
}

export async function getIncidentById(
  _orgId: string,
  id: string,
): Promise<AIIncident | null> {
  const state = await readState()
  return (state.aiIncidents ?? []).find((r) => r.id === id) ?? null
}

// ── Create ───────────────────────────────────────────────────────────────────

export async function createIncident(
  orgId: string,
  input: CreateAIIncidentInput,
  actor: ComplianceEventActorInput,
  orgName = "Organizația",
): Promise<AIIncident> {
  const title = input.title?.trim()
  if (!title) throw new Error("Incident title required")
  if (!input.description?.trim()) throw new Error("Incident description required")
  if (!isAIIncidentCategory(input.category)) {
    throw new Error("Incident category invalid")
  }
  if (!isAIIncidentSeverity(input.severity)) {
    throw new Error("Incident severity invalid")
  }
  if (!input.linkedAISystemId?.trim()) {
    throw new Error("Incident linkedAISystemId required")
  }

  const now = nowISO()
  const detectedAt =
    input.detectedAtISO && !Number.isNaN(Date.parse(input.detectedAtISO))
      ? new Date(input.detectedAtISO).toISOString()
      : now
  const { deadlineISO, days } = computeReportingDeadline(
    input.category,
    detectedAt,
  )
  // Force notificationRequired true for categories (a)/(b)/(c)
  const isHighRiskCategory =
    input.category === "death_or_serious_harm_health" ||
    input.category === "critical_infrastructure_disruption" ||
    input.category === "widespread_infringement" ||
    input.category === "fundamental_rights_infringement"
  const notificationRequired =
    typeof input.notificationRequired === "boolean"
      ? input.notificationRequired || isHighRiskCategory
      : true

  const initialStatus: AIIncidentStatus = notificationRequired
    ? "notification_required"
    : "assessing"

  const state = await readState()
  const linkedSystem = findSystem(state, input.linkedAISystemId)

  const draft: AIIncident = {
    id: uid(),
    orgId,
    title,
    description: input.description.trim(),
    category: input.category,
    severity: input.severity,
    linkedAISystemId: input.linkedAISystemId,
    affectedSubjectsCategories: normalizeStringArray(
      input.affectedSubjectsCategories,
    ),
    affectedSubjectsCount:
      typeof input.affectedSubjectsCount === "number" &&
      Number.isFinite(input.affectedSubjectsCount)
        ? input.affectedSubjectsCount
        : undefined,
    occurredAtISO:
      input.occurredAtISO && !Number.isNaN(Date.parse(input.occurredAtISO))
        ? new Date(input.occurredAtISO).toISOString()
        : undefined,
    detectedAtISO: detectedAt,
    reportingDeadlineISO: deadlineISO,
    reportingDeadlineDays: days,
    notifications: [],
    notificationRequired,
    linkedBreachId: input.linkedBreachId?.trim() || undefined,
    linkedPmmAnomalyId: input.linkedPmmAnomalyId?.trim() || undefined,
    linkedFindingIds: [],
    status: initialStatus,
    assignedToEmail: input.assignedToEmail?.trim() || actor.label,
    notes: input.notes?.trim() || undefined,
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

  const enriched: AIIncident = {
    ...draft,
    generatedMarkdown: evalUpdate.generatedMarkdown,
    linkedFindingIds: evalUpdate.newFindingIds,
  }

  await mutateFreshStateForOrg(orgId, (s) => {
    return {
      ...s,
      aiIncidents: [enriched, ...(s.aiIncidents ?? [])].slice(0, 200),
      events: appendComplianceEvents(s, [
        createComplianceEvent(
          {
            type: "ai_incident.created",
            entityType: "system",
            entityId: enriched.id,
            message: `Incident AI creat: "${enriched.title}" · ${enriched.category} · deadline Art. 73(3) ${enriched.reportingDeadlineDays} zile`,
            createdAtISO: now,
            metadata: {
              category: enriched.category,
              severity: enriched.severity,
              linkedAISystemId: enriched.linkedAISystemId,
              reportingDeadlineDays: enriched.reportingDeadlineDays,
              reportingDeadlineISO: enriched.reportingDeadlineISO,
              notificationRequired: enriched.notificationRequired,
              candidateFindingsEmitted: enriched.linkedFindingIds.length,
              linkedBreachId: enriched.linkedBreachId ?? "",
              linkedPmmAnomalyId: enriched.linkedPmmAnomalyId ?? "",
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

export async function updateIncident(
  orgId: string,
  id: string,
  patch: UpdateAIIncidentPatch,
  actor: ComplianceEventActorInput,
  orgName = "Organizația",
): Promise<AIIncident | null> {
  const existing = await getIncidentById(orgId, id)
  if (!existing) return null

  // Recalc deadline if category or detectedAt changed
  let nextCategory = existing.category
  if (patch.category && isAIIncidentCategory(patch.category)) {
    nextCategory = patch.category
  }
  let nextDetectedAt = existing.detectedAtISO
  if (
    typeof patch.detectedAtISO === "string" &&
    !Number.isNaN(Date.parse(patch.detectedAtISO))
  ) {
    nextDetectedAt = new Date(patch.detectedAtISO).toISOString()
  }
  const needsDeadlineRecalc =
    nextCategory !== existing.category ||
    nextDetectedAt !== existing.detectedAtISO
  let nextDeadlineISO = existing.reportingDeadlineISO
  let nextDeadlineDays = existing.reportingDeadlineDays
  if (needsDeadlineRecalc) {
    const calc = computeReportingDeadline(nextCategory, nextDetectedAt)
    nextDeadlineISO = calc.deadlineISO
    nextDeadlineDays = calc.days
  }

  const merged: AIIncident = {
    ...existing,
    ...patch,
    id: existing.id,
    orgId: existing.orgId,
    createdAtISO: existing.createdAtISO,
    linkedFindingIds: existing.linkedFindingIds,
    notifications: existing.notifications,
    rootCause: existing.rootCause,
    category: nextCategory,
    detectedAtISO: nextDetectedAt,
    reportingDeadlineISO: nextDeadlineISO,
    reportingDeadlineDays: nextDeadlineDays,
    affectedSubjectsCategories:
      patch.affectedSubjectsCategories === undefined
        ? existing.affectedSubjectsCategories
        : normalizeStringArray(patch.affectedSubjectsCategories),
    severity: isAIIncidentSeverity(patch.severity)
      ? patch.severity
      : existing.severity,
    status: isAIIncidentStatus(patch.status) ? patch.status : existing.status,
    notificationRequired:
      typeof patch.notificationRequired === "boolean"
        ? patch.notificationRequired
        : existing.notificationRequired,
    title: patch.title?.trim() || existing.title,
    description: patch.description?.trim() ?? existing.description,
    updatedAtISO: nowISO(),
  }

  // Re-evaluate to update markdown — skip finding persistence (avoid duplicate)
  const state = await readState()
  const linkedSystem = findSystem(state, merged.linkedAISystemId)
  const evalUpdate = await runEvaluatorAndPersistFindings(
    orgId,
    merged,
    orgName,
    linkedSystem,
    actor,
    /* skipFindingPersistence */ true,
  )
  merged.generatedMarkdown = evalUpdate.generatedMarkdown

  await mutateFreshStateForOrg(orgId, (s) => {
    const records = s.aiIncidents ?? []
    const idx = records.findIndex((r) => r.id === id)
    if (idx === -1) return s
    const next = [...records]
    next[idx] = merged
    return {
      ...s,
      aiIncidents: next,
      events: appendComplianceEvents(s, [
        createComplianceEvent(
          {
            type: "ai_incident.updated",
            entityType: "system",
            entityId: merged.id,
            message: `Incident AI actualizat: "${merged.title}" · status ${merged.status} · severitate ${merged.severity}`,
            createdAtISO: nowISO(),
            metadata: {
              status: merged.status,
              severity: merged.severity,
              category: merged.category,
              notificationRequired: merged.notificationRequired,
              recalculatedDeadline: needsDeadlineRecalc,
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

export async function deleteIncident(
  orgId: string,
  id: string,
  actor: ComplianceEventActorInput,
): Promise<boolean> {
  let removed = false
  await mutateFreshStateForOrg(orgId, (s) => {
    const records = s.aiIncidents ?? []
    const target = records.find((r) => r.id === id)
    if (!target) return s
    removed = true
    return {
      ...s,
      aiIncidents: records.filter((r) => r.id !== id),
      events: appendComplianceEvents(s, [
        createComplianceEvent(
          {
            type: "ai_incident.deleted",
            entityType: "system",
            entityId: id,
            message: `Incident AI șters: "${target.title}"`,
            createdAtISO: nowISO(),
            metadata: {
              category: target.category,
              severity: target.severity,
              status: target.status,
            },
          },
          actor,
        ),
      ]),
    }
  })
  return removed
}

// ── List incidents ──────────────────────────────────────────────────────────

export async function listIncidents(
  orgId: string,
): Promise<AIIncident[]> {
  const { records } = await readAIIncidents(orgId)
  return records
}

// ── Notify authority workflow (Art. 73(1)) ──────────────────────────────────

export async function markAuthorityNotified(
  orgId: string,
  id: string,
  input: MarkAuthorityNotifiedInput,
  actor: ComplianceEventActorInput,
  orgName = "Organizația",
): Promise<AIIncident | null> {
  const authorityName = input.authorityName?.trim()
  if (!authorityName) throw new Error("authorityName required")
  const existing = await getIncidentById(orgId, id)
  if (!existing) return null

  const status: AIIncidentNotificationStatus = isNotificationStatus(
    input.status,
  )
    ? input.status
    : "submitted"
  const submittedAt =
    input.submittedAtISO && !Number.isNaN(Date.parse(input.submittedAtISO))
      ? new Date(input.submittedAtISO).toISOString()
      : nowISO()

  const newNotif: AIIncidentNotificationRecord = {
    id: notificationId(),
    authorityName,
    status,
    submittedAtISO: submittedAt,
    referenceNumber: input.referenceNumber?.trim() || undefined,
    acknowledgmentReceivedAtISO:
      input.acknowledgmentReceivedAtISO &&
      !Number.isNaN(Date.parse(input.acknowledgmentReceivedAtISO))
        ? new Date(input.acknowledgmentReceivedAtISO).toISOString()
        : undefined,
    additionalInfoRequestedAtISO:
      input.additionalInfoRequestedAtISO &&
      !Number.isNaN(Date.parse(input.additionalInfoRequestedAtISO))
        ? new Date(input.additionalInfoRequestedAtISO).toISOString()
        : undefined,
    contactPersonEmail: input.contactPersonEmail?.trim() || undefined,
    notes: input.notes?.trim() || undefined,
  }

  const isSubmittedLike = status === "submitted" || status === "acknowledged"

  const merged: AIIncident = {
    ...existing,
    notifications: [...existing.notifications, newNotif],
    status: isSubmittedLike ? "authority_notified" : existing.status,
    updatedAtISO: nowISO(),
  }

  // Re-evaluate (skip persistence; deadline finding may now resolve)
  const state = await readState()
  const linkedSystem = findSystem(state, merged.linkedAISystemId)
  const evalUpdate = await runEvaluatorAndPersistFindings(
    orgId,
    merged,
    orgName,
    linkedSystem,
    actor,
    /* skipFindingPersistence */ true,
  )
  merged.generatedMarkdown = evalUpdate.generatedMarkdown

  await mutateFreshStateForOrg(orgId, (s) => {
    const records = s.aiIncidents ?? []
    const idx = records.findIndex((r) => r.id === id)
    if (idx === -1) return s
    const next = [...records]
    next[idx] = merged
    return {
      ...s,
      aiIncidents: next,
      events: appendComplianceEvents(s, [
        createComplianceEvent(
          {
            type: "ai_incident.authority_notified",
            entityType: "system",
            entityId: merged.id,
            message: `Notificare autoritate "${authorityName}" pentru incidentul "${merged.title}" — status ${status}${newNotif.referenceNumber ? ` (ref: ${newNotif.referenceNumber})` : ""}`,
            createdAtISO: nowISO(),
            metadata: {
              notificationId: newNotif.id,
              authorityName,
              status,
              referenceNumber: newNotif.referenceNumber ?? "",
              submittedAtISO: submittedAt,
            },
          },
          actor,
        ),
      ]),
    }
  })

  return merged
}

// ── Record root cause (Art. 73(4)) ──────────────────────────────────────────

export async function recordRootCause(
  orgId: string,
  id: string,
  input: RecordRootCauseInput,
  actor: ComplianceEventActorInput,
  orgName = "Organizația",
): Promise<AIIncident | null> {
  const description = input.rootCauseDescription?.trim()
  if (!description || description.length < 10) {
    throw new Error("rootCauseDescription required (min 10 chars)")
  }
  const identifiedByEmail =
    input.identifiedByEmail?.trim() || actor.label || ""
  if (!identifiedByEmail || !identifiedByEmail.includes("@")) {
    throw new Error("identifiedByEmail required (email valid)")
  }

  const existing = await getIncidentById(orgId, id)
  if (!existing) return null

  const rootCause: AIIncidentRootCause = {
    identifiedAtISO:
      input.identifiedAtISO &&
      !Number.isNaN(Date.parse(input.identifiedAtISO))
        ? new Date(input.identifiedAtISO).toISOString()
        : nowISO(),
    identifiedByEmail,
    rootCauseDescription: description,
    contributingFactors: normalizeStringArray(input.contributingFactors),
    evidenceCollected: normalizeStringArray(input.evidenceCollected),
    remediationActions: normalizeStringArray(input.remediationActions),
    preventionActions: normalizeStringArray(input.preventionActions),
    preventiveMeasuresImplementedAtISO:
      input.preventiveMeasuresImplementedAtISO &&
      !Number.isNaN(Date.parse(input.preventiveMeasuresImplementedAtISO))
        ? new Date(input.preventiveMeasuresImplementedAtISO).toISOString()
        : undefined,
  }

  const merged: AIIncident = {
    ...existing,
    rootCause,
    status:
      existing.status === "draft" ||
      existing.status === "assessing" ||
      existing.status === "notification_required"
        ? "root_cause_investigation"
        : existing.status === "authority_notified"
          ? "root_cause_investigation"
          : existing.status,
    updatedAtISO: nowISO(),
  }

  const state = await readState()
  const linkedSystem = findSystem(state, merged.linkedAISystemId)
  const evalUpdate = await runEvaluatorAndPersistFindings(
    orgId,
    merged,
    orgName,
    linkedSystem,
    actor,
    /* skipFindingPersistence */ true,
  )
  merged.generatedMarkdown = evalUpdate.generatedMarkdown

  await mutateFreshStateForOrg(orgId, (s) => {
    const records = s.aiIncidents ?? []
    const idx = records.findIndex((r) => r.id === id)
    if (idx === -1) return s
    const next = [...records]
    next[idx] = merged
    return {
      ...s,
      aiIncidents: next,
      events: appendComplianceEvents(s, [
        createComplianceEvent(
          {
            type: "ai_incident.root_cause_recorded",
            entityType: "system",
            entityId: merged.id,
            message: `Root cause înregistrat pentru "${merged.title}" — ${rootCause.contributingFactors.length} factori, ${rootCause.remediationActions.length} acțiuni corective`,
            createdAtISO: nowISO(),
            metadata: {
              identifiedByEmail,
              factorsCount: rootCause.contributingFactors.length,
              remediationsCount: rootCause.remediationActions.length,
              preventionsCount: rootCause.preventionActions.length,
              evidenceCount: rootCause.evidenceCollected.length,
            },
          },
          actor,
        ),
      ]),
    }
  })

  return merged
}

// ── Close incident ──────────────────────────────────────────────────────────

export async function closeIncident(
  orgId: string,
  id: string,
  closureNotes: string,
  actor: ComplianceEventActorInput,
  orgName = "Organizația",
): Promise<AIIncident | null> {
  const notes = closureNotes?.trim()
  if (!notes || notes.length < 10) {
    throw new Error("closureNotes required (min 10 chars)")
  }
  const existing = await getIncidentById(orgId, id)
  if (!existing) return null

  const now = nowISO()
  const merged: AIIncident = {
    ...existing,
    status: "closed",
    closedAtISO: now,
    closureNotes: notes,
    updatedAtISO: now,
  }

  const state = await readState()
  const linkedSystem = findSystem(state, merged.linkedAISystemId)
  const evalUpdate = await runEvaluatorAndPersistFindings(
    orgId,
    merged,
    orgName,
    linkedSystem,
    actor,
    /* skipFindingPersistence */ true,
  )
  merged.generatedMarkdown = evalUpdate.generatedMarkdown

  await mutateFreshStateForOrg(orgId, (s) => {
    const records = s.aiIncidents ?? []
    const idx = records.findIndex((r) => r.id === id)
    if (idx === -1) return s
    const next = [...records]
    next[idx] = merged
    return {
      ...s,
      aiIncidents: next,
      events: appendComplianceEvents(s, [
        createComplianceEvent(
          {
            type: "ai_incident.closed",
            entityType: "system",
            entityId: merged.id,
            message: `Incident AI închis: "${merged.title}" — ${notes.slice(0, 80)}...`,
            createdAtISO: now,
            metadata: {
              closedAtISO: now,
              hadRootCause: Boolean(merged.rootCause),
              notificationsCount: merged.notifications.length,
            },
          },
          actor,
        ),
      ]),
    }
  })

  return merged
}

// ── Bidirectional linkage ───────────────────────────────────────────────────

/**
 * Leagă incidentul de un BreachRecord (Sprint 008D). Update bidirectional —
 * incident.linkedBreachId și (dacă breach există) un eveniment de cross-ref
 * pentru audit trail. NU modifică BreachRecord-ul (acela poate fi update
 * separat din breach-store dacă DPO vrea); aici doar consemnăm pe incident.
 */
export async function linkToBreach(
  orgId: string,
  incidentId: string,
  breachId: string,
  actor: ComplianceEventActorInput,
): Promise<AIIncident | null> {
  if (!breachId.trim()) throw new Error("breachId required")
  const existing = await getIncidentById(orgId, incidentId)
  if (!existing) return null

  const merged: AIIncident = {
    ...existing,
    linkedBreachId: breachId.trim(),
    updatedAtISO: nowISO(),
  }

  await mutateFreshStateForOrg(orgId, (s) => {
    const records = s.aiIncidents ?? []
    const idx = records.findIndex((r) => r.id === incidentId)
    if (idx === -1) return s
    const next = [...records]
    next[idx] = merged
    return {
      ...s,
      aiIncidents: next,
      events: appendComplianceEvents(s, [
        createComplianceEvent(
          {
            type: "ai_incident.linked_to_breach",
            entityType: "system",
            entityId: incidentId,
            message: `Incident AI "${merged.title}" legat de BreachRecord ${breachId}`,
            createdAtISO: nowISO(),
            metadata: { breachId },
          },
          actor,
        ),
      ]),
    }
  })

  return merged
}

/**
 * Leagă incidentul de un PmmAnomalyRecord (Sprint 019). Update bidirectional:
 * incident.linkedPmmAnomalyId + pe planul PMM anomalia primește
 * escalatedToIncident=true + linkedIncidentId=incident.id.
 */
export async function linkToPmmAnomaly(
  orgId: string,
  incidentId: string,
  planId: string,
  anomalyId: string,
  actor: ComplianceEventActorInput,
): Promise<AIIncident | null> {
  if (!planId.trim() || !anomalyId.trim()) {
    throw new Error("planId + anomalyId required")
  }
  const existing = await getIncidentById(orgId, incidentId)
  if (!existing) return null

  const merged: AIIncident = {
    ...existing,
    linkedPmmAnomalyId: anomalyId.trim(),
    updatedAtISO: nowISO(),
  }

  await mutateFreshStateForOrg(orgId, (s) => {
    const incidents = s.aiIncidents ?? []
    const iIdx = incidents.findIndex((r) => r.id === incidentId)
    if (iIdx === -1) return s
    const nextIncidents = [...incidents]
    nextIncidents[iIdx] = merged

    // Bidirectional update on PMM plan anomaly
    const plans = s.pmmPlans ?? []
    const pIdx = plans.findIndex((p) => p.id === planId)
    let nextPlans = plans
    if (pIdx !== -1) {
      const plan = plans[pIdx]
      const anomalies = plan.anomalies ?? []
      const aIdx = anomalies.findIndex((a) => a.id === anomalyId)
      if (aIdx !== -1) {
        const newAnomaly = {
          ...anomalies[aIdx],
          escalatedToIncident: true,
          linkedIncidentId: incidentId,
        }
        const newAnomalies = [...anomalies]
        newAnomalies[aIdx] = newAnomaly
        const newPlans = [...plans]
        newPlans[pIdx] = {
          ...plan,
          anomalies: newAnomalies,
          updatedAtISO: nowISO(),
        }
        nextPlans = newPlans
      }
    }

    return {
      ...s,
      aiIncidents: nextIncidents,
      pmmPlans: nextPlans,
      events: appendComplianceEvents(s, [
        createComplianceEvent(
          {
            type: "ai_incident.linked_to_pmm_anomaly",
            entityType: "system",
            entityId: incidentId,
            message: `Incident AI "${merged.title}" legat de anomalie PMM ${anomalyId} (plan ${planId})`,
            createdAtISO: nowISO(),
            metadata: { planId, anomalyId },
          },
          actor,
        ),
      ]),
    }
  })

  return merged
}

// ── Markdown export (live re-evaluator) ─────────────────────────────────────

export function buildIncidentMarkdown(
  record: AIIncident,
  orgName: string,
  systemName?: string,
): string {
  const evalResult = evaluateIncident({
    record,
    orgName,
    systemName,
  })
  return evalResult.generatedMarkdown
}

/**
 * Propagate evaluation for ALL incidents in state — apelat de cron-ul
 * Sprint 022 (Preventive engine). Re-emite findings noi (deadline overdue
 * detectat acum) cu skipFindingPersistence=false. Idempotent prin natura
 * createFinding (titlu cu zile depășite e parte din stableSuffix; findings
 * vechi rămân open dacă nu sunt resolve.)
 */
export async function propagateEvaluation(
  orgId: string,
  actor: ComplianceEventActorInput,
  orgName = "Organizația",
): Promise<{ evaluated: number; newFindingIds: string[] }> {
  const { records } = await readAIIncidents(orgId)
  let allNewIds: string[] = []
  for (const record of records) {
    if (record.status === "closed" || record.status === "not_reportable") {
      continue
    }
    const state = await readState()
    const linkedSystem = findSystem(state, record.linkedAISystemId)
    const evalUpdate = await runEvaluatorAndPersistFindings(
      orgId,
      record,
      orgName,
      linkedSystem,
      actor,
      /* skipFindingPersistence */ false,
    )
    allNewIds = allNewIds.concat(evalUpdate.newFindingIds)

    if (evalUpdate.newFindingIds.length > 0) {
      // Update record.linkedFindingIds
      await mutateFreshStateForOrg(orgId, (s) => {
        const all = s.aiIncidents ?? []
        const idx = all.findIndex((r) => r.id === record.id)
        if (idx === -1) return s
        const next = [...all]
        next[idx] = {
          ...next[idx],
          linkedFindingIds: Array.from(
            new Set([...next[idx].linkedFindingIds, ...evalUpdate.newFindingIds]),
          ),
          generatedMarkdown: evalUpdate.generatedMarkdown,
          updatedAtISO: nowISO(),
        }
        return { ...s, aiIncidents: next }
      })
    }
  }
  return { evaluated: records.length, newFindingIds: allNewIds }
}
