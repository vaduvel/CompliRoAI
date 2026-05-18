/**
 * Sprint 019 — Post-Market Monitoring store (CRUD + lifecycle + reviews +
 * version changes + anomalies, peste `state.pmmPlans[]` + ledger evenimente +
 * finding emission obligatoriu).
 *
 * Pattern: identic cu logging-evidence-store (Sprint 018) → folosește
 * `mutateFreshStateForOrg` din `lib/server/store.ts` pentru audit-trail
 * hash-chain consistent.
 *
 * Surface API:
 *  - readPmmPlans(orgId)
 *  - getPmmPlanById(orgId, id)
 *  - createPlan(orgId, input, actor)              → creează + evaluator + findings
 *  - updatePlan(orgId, id, patch, actor)          → merge patch + re-evaluează
 *  - deletePlan(orgId, id, actor)
 *  - markPlanApproved(orgId, id, approvedByEmail, actor)
 *  - markPlanRejected(orgId, id, reason, actor)
 *  - recordReview(orgId, planId, reviewInput, actor) → adaugă review + recalc next
 *  - recordVersionChange(orgId, planId, changeInput, actor) → adaugă schimbare +
 *      re-evaluează findings (poate emite CRITICAL Art. 43(4) dacă substantial)
 *  - recordAnomaly(orgId, planId, anomalyInput, actor) → adaugă anomalie +
 *      pentru critical, emite imediat finding via createFinding
 *  - scheduleReviewReminder(orgId, planId, daysBeforeReview)
 *  - buildPmmMarkdown(record, orgName, systemName?)
 *
 * Findings emise sunt persistate prin createFinding() (din findings-store) și
 * ID-urile rezultate sunt scrise în `linkedFindingIds[]` pe record.
 */

import {
  appendComplianceEvents,
  createComplianceEvent,
  type ComplianceEventActorInput,
} from "@/lib/compliance/events"
import { evaluatePmm } from "@/lib/compliance/pmm-evaluator"
import { PMM_REVIEW_CYCLE_MONTHS } from "@/lib/compliance/pmm-schema"
import { createFinding } from "@/lib/server/findings-store"
import { mutateFreshStateForOrg, readState } from "@/lib/server/store"
import type {
  AISystemRecord,
  PmmAnomalyCategory,
  PmmAnomalyRecord,
  PmmAnomalySeverity,
  PmmCompleteness,
  PmmDataCollectionFrequency,
  PmmDataCollectionMethod,
  PmmFreshnessStatus,
  PmmPlan,
  PmmPlanStatus,
  PmmReviewCycle,
  PmmReviewRecord,
  PmmReviewType,
  PmmVersionChangeRecord,
  PmmVersionChangeType,
  ScanFinding,
} from "@/lib/compliance/types"

// ── Types ────────────────────────────────────────────────────────────────────

export type PmmSummary = {
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
  fresh: number
  dueSoon: number
  overdue: number
  noReviews: number
  unresolvedAnomalies: number
  substantialChangesPending: number
}

export type CreatePmmInput = {
  title: string
  linkedAISystemId: string
  dataCollectionMethods: PmmDataCollectionMethod[]
  dataCollectionFrequency: PmmDataCollectionFrequency
  dataCollectionDescription: string
  complianceEvaluationMethods: string[]
  complianceMetricsTracked: string[]
  correctiveActionProcess: string
  preventiveActionProcess: string
  reviewCycle: PmmReviewCycle
  notes?: string
}

export type UpdatePmmPatch = Partial<
  Omit<
    PmmPlan,
    | "id"
    | "orgId"
    | "linkedFindingIds"
    | "createdAtISO"
    | "updatedAtISO"
    | "completeness"
    | "freshnessStatus"
    | "generatedMarkdown"
    | "reviews"
    | "versionChanges"
    | "anomalies"
    | "reviewCycleMonths"
  >
> & {
  // permit ajustarea ciclului via patch — recompute months automat
  reviewCycle?: PmmReviewCycle
}

export type RecordReviewInput = {
  reviewType: PmmReviewType
  reviewedByEmail: string
  performanceMetrics?: Record<string, number | string>
  risksDetected?: string[]
  correctiveActions?: string[]
  preventiveActions?: string[]
  notes?: string
  /** Override manual al următoarei revizii; default = now + reviewCycleMonths * 30 zile. */
  nextReviewISO?: string
  reviewDateISO?: string
}

export type RecordVersionChangeInput = {
  oldVersion: string
  newVersion: string
  changeType: PmmVersionChangeType
  description: string
  substantialModification: boolean
  riskReassessmentRequired: boolean
  approvedByEmail?: string
  changedByEmail: string
  notes?: string
  changedAtISO?: string
}

export type RecordAnomalyInput = {
  severity: PmmAnomalySeverity
  category: PmmAnomalyCategory
  description: string
  impactDescription: string
  detectedByEmail?: string
  resolved?: boolean
  resolvedAtISO?: string
  escalatedToIncident?: boolean
  linkedIncidentId?: string
  notes?: string
  detectedAtISO?: string
}

const PLAN_STATUSES: PmmPlanStatus[] = [
  "draft",
  "in_review",
  "approved",
  "active",
  "obsolete",
  "rejected",
]

const DAY_MS = 86_400_000

// ── Helpers ──────────────────────────────────────────────────────────────────

function nowISO(): string {
  return new Date().toISOString()
}

function uid(): string {
  return `pmm-${Math.random().toString(36).slice(2, 10)}`
}

function reviewId(): string {
  return `pmm-rv-${Math.random().toString(36).slice(2, 10)}`
}

function versionChangeId(): string {
  return `pmm-vc-${Math.random().toString(36).slice(2, 10)}`
}

function anomalyId(): string {
  return `pmm-ano-${Math.random().toString(36).slice(2, 10)}`
}

export function isPmmPlanStatus(value: unknown): value is PmmPlanStatus {
  return (
    typeof value === "string" &&
    PLAN_STATUSES.includes(value as PmmPlanStatus)
  )
}

export function summarizePmmPlans(records: PmmPlan[]): PmmSummary {
  let draft = 0
  let inReview = 0
  let approved = 0
  let active = 0
  let obsolete = 0
  let rejected = 0
  let complete = 0
  let partial = 0
  let incomplete = 0
  let fresh = 0
  let dueSoon = 0
  let overdue = 0
  let noReviews = 0
  let unresolvedAnomalies = 0
  let substantialChangesPending = 0
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
    if (r.freshnessStatus === "fresh") fresh++
    else if (r.freshnessStatus === "due_soon") dueSoon++
    else if (r.freshnessStatus === "overdue") overdue++
    else noReviews++
    for (const a of r.anomalies) {
      if (!a.resolved) unresolvedAnomalies++
    }
    for (const ch of r.versionChanges) {
      if (ch.substantialModification && ch.riskReassessmentRequired) {
        substantialChangesPending++
      }
    }
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
    fresh,
    dueSoon,
    overdue,
    noReviews,
    unresolvedAnomalies,
    substantialChangesPending,
  }
}

function findSystem(
  state: { aiSystems?: AISystemRecord[] },
  systemId: string,
): AISystemRecord | undefined {
  return state.aiSystems?.find((s) => s.id === systemId)
}

function computeNextReviewISO(
  fromISO: string,
  monthsAhead: number,
): string {
  const fromMs = new Date(fromISO).getTime()
  return new Date(fromMs + monthsAhead * 30 * DAY_MS).toISOString()
}

// ── Read ─────────────────────────────────────────────────────────────────────

export async function readPmmPlans(_orgId?: string): Promise<{
  records: PmmPlan[]
  summary: PmmSummary
}> {
  const state = await readState()
  const records = state.pmmPlans ?? []
  return { records, summary: summarizePmmPlans(records) }
}

export async function getPmmPlanById(
  _orgId: string,
  id: string,
): Promise<PmmPlan | null> {
  const state = await readState()
  return state.pmmPlans?.find((r) => r.id === id) ?? null
}

// ── Internal: rulează evaluator + persistă findings ─────────────────────────

async function runEvaluatorAndPersistFindings(
  orgId: string,
  record: PmmPlan,
  orgName: string,
  linkedSystem: AISystemRecord | undefined,
  actor: ComplianceEventActorInput,
  /**
   * Dacă true, NU emite findings noi (folosit pentru update pure care doar
   * recalculează completeness/freshness fără a duplica findings).
   */
  skipFindingPersistence = false,
): Promise<{
  completeness: PmmCompleteness
  freshnessStatus: PmmFreshnessStatus
  generatedMarkdown: string
  linkedFindingIds: string[]
  candidateFindings: ScanFinding[]
}> {
  const evalResult = evaluatePmm({
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
          ownerSuggestion: "Responsabil PMM / DPO",
          closeCondition: candidate.resolution?.closureEvidence,
        },
        actor,
      )
      findingIds.push(created.id)
    }
  }
  return {
    completeness: evalResult.completeness,
    freshnessStatus: evalResult.freshnessStatus,
    generatedMarkdown: evalResult.generatedMarkdown,
    linkedFindingIds: findingIds,
    candidateFindings: evalResult.candidateFindings,
  }
}

// ── Create ───────────────────────────────────────────────────────────────────

export async function createPlan(
  orgId: string,
  input: CreatePmmInput,
  actor: ComplianceEventActorInput,
  orgName = "Organizația",
): Promise<PmmPlan> {
  const title = input.title?.trim()
  if (!title) throw new Error("PMM plan title required")
  if (!input.linkedAISystemId) {
    throw new Error("PMM plan linkedAISystemId required")
  }
  if (!input.reviewCycle) throw new Error("PMM reviewCycle required")
  if (!input.dataCollectionDescription?.trim()) {
    throw new Error("PMM dataCollectionDescription required")
  }

  const now = nowISO()
  const state = await readState()
  const linkedSystem = findSystem(state, input.linkedAISystemId)
  const reviewCycleMonths = PMM_REVIEW_CYCLE_MONTHS[input.reviewCycle]

  const draft: PmmPlan = {
    id: uid(),
    orgId,
    title,
    linkedAISystemId: input.linkedAISystemId,
    dataCollectionMethods: input.dataCollectionMethods,
    dataCollectionFrequency: input.dataCollectionFrequency,
    dataCollectionDescription: input.dataCollectionDescription.trim(),
    complianceEvaluationMethods: (input.complianceEvaluationMethods ?? []).filter(
      (m) => m.trim().length > 0,
    ),
    complianceMetricsTracked: (input.complianceMetricsTracked ?? []).filter(
      (m) => m.trim().length > 0,
    ),
    correctiveActionProcess: input.correctiveActionProcess?.trim() ?? "",
    preventiveActionProcess: input.preventiveActionProcess?.trim() ?? "",
    reviewCycle: input.reviewCycle,
    reviewCycleMonths,
    reviews: [],
    versionChanges: [],
    anomalies: [],
    status: "draft",
    completeness: "incomplete",
    freshnessStatus: "no_reviews",
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

  const enriched: PmmPlan = {
    ...draft,
    completeness: evalUpdate.completeness,
    freshnessStatus: evalUpdate.freshnessStatus,
    generatedMarkdown: evalUpdate.generatedMarkdown,
    linkedFindingIds: evalUpdate.linkedFindingIds,
  }

  await mutateFreshStateForOrg(orgId, (s) => {
    return {
      ...s,
      pmmPlans: [enriched, ...(s.pmmPlans ?? [])].slice(0, 200),
      events: appendComplianceEvents(s, [
        createComplianceEvent(
          {
            type: "pmm.created",
            entityType: "system",
            entityId: enriched.id,
            message: `PMM Plan creat: ${enriched.title} · ${enriched.completeness} · ciclu ${enriched.reviewCycle}`,
            createdAtISO: now,
            metadata: {
              linkedAISystemId: enriched.linkedAISystemId,
              reviewCycle: enriched.reviewCycle,
              reviewCycleMonths: enriched.reviewCycleMonths,
              completeness: enriched.completeness,
              freshnessStatus: enriched.freshnessStatus,
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

export async function updatePlan(
  orgId: string,
  id: string,
  patch: UpdatePmmPatch,
  actor: ComplianceEventActorInput,
  orgName = "Organizația",
): Promise<PmmPlan | null> {
  const existing = await getPmmPlanById(orgId, id)
  if (!existing) return null

  const nextReviewCycle = patch.reviewCycle ?? existing.reviewCycle
  const nextReviewCycleMonths = PMM_REVIEW_CYCLE_MONTHS[nextReviewCycle]

  const merged: PmmPlan = {
    ...existing,
    ...patch,
    id: existing.id,
    orgId: existing.orgId,
    createdAtISO: existing.createdAtISO,
    linkedFindingIds: existing.linkedFindingIds,
    reviews: existing.reviews,
    versionChanges: existing.versionChanges,
    anomalies: existing.anomalies,
    reviewCycle: nextReviewCycle,
    reviewCycleMonths: nextReviewCycleMonths,
    updatedAtISO: nowISO(),
  }
  if (patch.status && !isPmmPlanStatus(patch.status)) {
    merged.status = existing.status
  }

  const state = await readState()
  const linkedSystem = findSystem(state, merged.linkedAISystemId)
  const evalResult = evaluatePmm({
    record: merged,
    orgName,
    systemName: linkedSystem?.name,
    linkedSystem,
  })
  merged.completeness = evalResult.completeness
  merged.freshnessStatus = evalResult.freshnessStatus
  merged.generatedMarkdown = evalResult.generatedMarkdown

  await mutateFreshStateForOrg(orgId, (s) => {
    const records = s.pmmPlans ?? []
    const idx = records.findIndex((r) => r.id === id)
    if (idx === -1) return s
    const next = [...records]
    next[idx] = merged
    return {
      ...s,
      pmmPlans: next,
      events: appendComplianceEvents(s, [
        createComplianceEvent(
          {
            type: "pmm.updated",
            entityType: "system",
            entityId: merged.id,
            message: `PMM Plan actualizat: ${merged.title} · status ${merged.status} · ${merged.completeness} · freshness ${merged.freshnessStatus}`,
            createdAtISO: nowISO(),
            metadata: {
              status: merged.status,
              completeness: merged.completeness,
              freshnessStatus: merged.freshnessStatus,
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

export async function deletePlan(
  orgId: string,
  id: string,
  actor: ComplianceEventActorInput,
): Promise<boolean> {
  let removed = false
  await mutateFreshStateForOrg(orgId, (s) => {
    const records = s.pmmPlans ?? []
    const target = records.find((r) => r.id === id)
    if (!target) return s
    removed = true
    return {
      ...s,
      pmmPlans: records.filter((r) => r.id !== id),
      events: appendComplianceEvents(s, [
        createComplianceEvent(
          {
            type: "pmm.deleted",
            entityType: "system",
            entityId: id,
            message: `PMM Plan șters: ${target.title}`,
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

export async function markPlanApproved(
  orgId: string,
  id: string,
  approvedByEmail: string,
  actor: ComplianceEventActorInput,
): Promise<PmmPlan | null> {
  if (!approvedByEmail || !approvedByEmail.includes("@")) {
    throw new Error("Approver email required")
  }
  const existing = await getPmmPlanById(orgId, id)
  if (!existing) return null
  const now = nowISO()
  const next: PmmPlan = {
    ...existing,
    status: "active",
    approvedByEmail,
    approvedAtISO: now,
    nextReviewISO:
      existing.nextReviewISO ?? computeNextReviewISO(now, existing.reviewCycleMonths),
    rejectionReason: undefined,
    updatedAtISO: now,
  }
  await mutateFreshStateForOrg(orgId, (s) => {
    const records = s.pmmPlans ?? []
    const idx = records.findIndex((r) => r.id === id)
    if (idx === -1) return s
    const arr = [...records]
    arr[idx] = next
    return {
      ...s,
      pmmPlans: arr,
      events: appendComplianceEvents(s, [
        createComplianceEvent(
          {
            type: "pmm.approved",
            entityType: "system",
            entityId: next.id,
            message: `PMM Plan activat: ${next.title} · de ${approvedByEmail}`,
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

export async function markPlanRejected(
  orgId: string,
  id: string,
  reason: string,
  actor: ComplianceEventActorInput,
): Promise<PmmPlan | null> {
  if (!reason || reason.trim().length < 5) {
    throw new Error("PMM rejection reason required (min 5 chars)")
  }
  const existing = await getPmmPlanById(orgId, id)
  if (!existing) return null
  const now = nowISO()
  const next: PmmPlan = {
    ...existing,
    status: "rejected",
    rejectionReason: reason.trim(),
    approvedByEmail: undefined,
    approvedAtISO: undefined,
    updatedAtISO: now,
  }
  await mutateFreshStateForOrg(orgId, (s) => {
    const records = s.pmmPlans ?? []
    const idx = records.findIndex((r) => r.id === id)
    if (idx === -1) return s
    const arr = [...records]
    arr[idx] = next
    return {
      ...s,
      pmmPlans: arr,
      events: appendComplianceEvents(s, [
        createComplianceEvent(
          {
            type: "pmm.rejected",
            entityType: "system",
            entityId: next.id,
            message: `PMM Plan respins: ${next.title} · motiv: ${reason.trim()}`,
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

// ── Record review ───────────────────────────────────────────────────────────

export async function recordReview(
  orgId: string,
  planId: string,
  input: RecordReviewInput,
  actor: ComplianceEventActorInput,
  orgName = "Organizația",
): Promise<PmmPlan | null> {
  if (!input.reviewedByEmail || !input.reviewedByEmail.includes("@")) {
    throw new Error("Reviewer email required")
  }
  const existing = await getPmmPlanById(orgId, planId)
  if (!existing) return null

  const reviewDateISO = input.reviewDateISO ?? nowISO()
  const nextReviewISO =
    input.nextReviewISO ?? computeNextReviewISO(reviewDateISO, existing.reviewCycleMonths)

  const newReview: PmmReviewRecord = {
    id: reviewId(),
    reviewDateISO,
    reviewedByEmail: input.reviewedByEmail,
    reviewType: input.reviewType,
    performanceMetrics: input.performanceMetrics ?? {},
    risksDetected: input.risksDetected ?? [],
    correctiveActions: input.correctiveActions ?? [],
    preventiveActions: input.preventiveActions ?? [],
    notes: input.notes,
    nextReviewISO,
  }

  const merged: PmmPlan = {
    ...existing,
    reviews: [...existing.reviews, newReview].sort((a, b) =>
      a.reviewDateISO.localeCompare(b.reviewDateISO),
    ),
    lastReviewAtISO: reviewDateISO,
    nextReviewISO,
    updatedAtISO: nowISO(),
  }

  // Re-evaluate cu skip findings (review-ul rezolvă review-overdue, NU emite duplicate)
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
  merged.completeness = evalUpdate.completeness
  merged.freshnessStatus = evalUpdate.freshnessStatus
  merged.generatedMarkdown = evalUpdate.generatedMarkdown

  await mutateFreshStateForOrg(orgId, (s) => {
    const records = s.pmmPlans ?? []
    const idx = records.findIndex((r) => r.id === planId)
    if (idx === -1) return s
    const arr = [...records]
    arr[idx] = merged
    return {
      ...s,
      pmmPlans: arr,
      events: appendComplianceEvents(s, [
        createComplianceEvent(
          {
            type: "pmm.review_recorded",
            entityType: "system",
            entityId: merged.id,
            message: `PMM review înregistrat (${input.reviewType}) pentru "${merged.title}" — ${newReview.risksDetected.length} riscuri, ${newReview.correctiveActions.length} acțiuni corective`,
            createdAtISO: nowISO(),
            metadata: {
              reviewId: newReview.id,
              reviewType: input.reviewType,
              risksCount: newReview.risksDetected.length,
              correctiveCount: newReview.correctiveActions.length,
              preventiveCount: newReview.preventiveActions.length,
              nextReviewISO,
            },
          },
          actor,
        ),
      ]),
    }
  })

  return merged
}

// ── Record version change ───────────────────────────────────────────────────

export async function recordVersionChange(
  orgId: string,
  planId: string,
  input: RecordVersionChangeInput,
  actor: ComplianceEventActorInput,
  orgName = "Organizația",
): Promise<PmmPlan | null> {
  if (!input.oldVersion || !input.newVersion) {
    throw new Error("oldVersion + newVersion required")
  }
  if (!input.changedByEmail || !input.changedByEmail.includes("@")) {
    throw new Error("changedByEmail required")
  }
  const existing = await getPmmPlanById(orgId, planId)
  if (!existing) return null

  const newChange: PmmVersionChangeRecord = {
    id: versionChangeId(),
    changedAtISO: input.changedAtISO ?? nowISO(),
    changedByEmail: input.changedByEmail,
    oldVersion: input.oldVersion,
    newVersion: input.newVersion,
    changeType: input.changeType,
    substantialModification: input.substantialModification,
    description: input.description ?? "",
    riskReassessmentRequired: input.riskReassessmentRequired,
    approvedByEmail: input.approvedByEmail,
    notes: input.notes,
  }

  const merged: PmmPlan = {
    ...existing,
    versionChanges: [...existing.versionChanges, newChange],
    updatedAtISO: nowISO(),
  }

  // Re-evaluate WITH findings — substantial change poate emite CRITICAL imediat
  // dacă există vechi changes fără reassessment, sau dacă acesta este vechi
  // (changeAtISO < now - 30 zile) și nu are follow-up.
  const state = await readState()
  const linkedSystem = findSystem(state, merged.linkedAISystemId)
  const evalUpdate = await runEvaluatorAndPersistFindings(
    orgId,
    merged,
    orgName,
    linkedSystem,
    actor,
    /* skipFindingPersistence */ false,
  )
  merged.completeness = evalUpdate.completeness
  merged.freshnessStatus = evalUpdate.freshnessStatus
  merged.generatedMarkdown = evalUpdate.generatedMarkdown
  // Concat noi findings la list (deduplicate prin set)
  merged.linkedFindingIds = Array.from(
    new Set([...existing.linkedFindingIds, ...evalUpdate.linkedFindingIds]),
  )

  await mutateFreshStateForOrg(orgId, (s) => {
    const records = s.pmmPlans ?? []
    const idx = records.findIndex((r) => r.id === planId)
    if (idx === -1) return s
    const arr = [...records]
    arr[idx] = merged
    return {
      ...s,
      pmmPlans: arr,
      events: appendComplianceEvents(s, [
        createComplianceEvent(
          {
            type: "pmm.version_change_recorded",
            entityType: "system",
            entityId: merged.id,
            message: `PMM version change "${merged.title}": ${newChange.oldVersion} → ${newChange.newVersion} (${newChange.changeType}, substantial=${newChange.substantialModification})`,
            createdAtISO: nowISO(),
            metadata: {
              versionChangeId: newChange.id,
              changeType: newChange.changeType,
              substantialModification: newChange.substantialModification,
              riskReassessmentRequired: newChange.riskReassessmentRequired,
              candidateFindingsEmitted: evalUpdate.linkedFindingIds.length,
            },
          },
          actor,
        ),
      ]),
    }
  })

  return merged
}

// ── Record anomaly ──────────────────────────────────────────────────────────

export async function recordAnomaly(
  orgId: string,
  planId: string,
  input: RecordAnomalyInput,
  actor: ComplianceEventActorInput,
  orgName = "Organizația",
): Promise<PmmPlan | null> {
  if (!input.description || input.description.trim().length < 3) {
    throw new Error("Anomaly description required")
  }
  const existing = await getPmmPlanById(orgId, planId)
  if (!existing) return null

  const newAnomaly: PmmAnomalyRecord = {
    id: anomalyId(),
    detectedAtISO: input.detectedAtISO ?? nowISO(),
    detectedByEmail: input.detectedByEmail,
    severity: input.severity,
    category: input.category,
    description: input.description.trim(),
    impactDescription: input.impactDescription?.trim() ?? "",
    resolved: input.resolved ?? false,
    resolvedAtISO: input.resolvedAtISO,
    escalatedToIncident: input.escalatedToIncident ?? false,
    linkedIncidentId: input.linkedIncidentId,
    notes: input.notes,
  }

  const merged: PmmPlan = {
    ...existing,
    anomalies: [...existing.anomalies, newAnomaly],
    updatedAtISO: nowISO(),
  }

  // Pentru CRITICAL nerezolvat, emite finding IMEDIAT (nu așteaptă 7 zile).
  const state = await readState()
  const linkedSystem = findSystem(state, merged.linkedAISystemId)
  const newFindingIds: string[] = []

  if (newAnomaly.severity === "critical" && !newAnomaly.resolved) {
    const sysName = linkedSystem?.name ?? merged.linkedAISystemId
    const created = await createFinding(
      orgId,
      {
        title: `Anomalie CRITICAL detectată pe PMM: ${sysName}`,
        detail: `Anomalia "${newAnomaly.description}" (categorie: ${newAnomaly.category}) a fost detectată pe sistemul "${sysName}" cu severitate CRITICAL. Impact declarat: ${newAnomaly.impactDescription}. Art. 72(4) cere ca rezultatele PMM să informeze update-uri/îmbunătățiri; evaluarea escaladării spre AI Incident (Art. 73, Sprint 020) este obligatorie.`,
        category: "EU_AI_ACT",
        severity: "critical",
        legalReference: "EU AI Act Art. 72(4) + Art. 73",
        remediationHint:
          "Evaluează escaladarea către AI Incident Reporting (Sprint 020, Art. 73). Setează escalatedToIncident=true și linkează incidentul. Decide dacă sistemul trebuie dezactivat temporar până la rezolvare.",
        impactSummary:
          "Anomalie critică în PMM poate transmite spre incident raportabil Art. 73 (15 zile / 2 zile pentru deces sau lezare gravă).",
        evidenceRequired:
          "Raport root cause + acțiune corectivă aplicată + (dacă escalatedToIncident) link AI Incident Record.",
        ownerSuggestion: "Responsabil PMM / DPO / Security",
        closeCondition:
          "PmmAnomalyRecord.resolved=true + (dacă escaladat) link incident închis.",
      },
      actor,
    )
    newFindingIds.push(created.id)
  }

  // Re-evaluate (skip persistence pentru a evita duplicate; finding-ul critical
  // a fost deja creat mai sus).
  const evalUpdate = await runEvaluatorAndPersistFindings(
    orgId,
    merged,
    orgName,
    linkedSystem,
    actor,
    /* skipFindingPersistence */ true,
  )
  merged.completeness = evalUpdate.completeness
  merged.freshnessStatus = evalUpdate.freshnessStatus
  merged.generatedMarkdown = evalUpdate.generatedMarkdown
  merged.linkedFindingIds = Array.from(
    new Set([...existing.linkedFindingIds, ...newFindingIds]),
  )

  await mutateFreshStateForOrg(orgId, (s) => {
    const records = s.pmmPlans ?? []
    const idx = records.findIndex((r) => r.id === planId)
    if (idx === -1) return s
    const arr = [...records]
    arr[idx] = merged
    return {
      ...s,
      pmmPlans: arr,
      events: appendComplianceEvents(s, [
        createComplianceEvent(
          {
            type: "pmm.anomaly_recorded",
            entityType: "system",
            entityId: merged.id,
            message: `PMM anomaly "${merged.title}": ${newAnomaly.severity} ${newAnomaly.category} — ${newAnomaly.description}`,
            createdAtISO: nowISO(),
            metadata: {
              anomalyId: newAnomaly.id,
              severity: newAnomaly.severity,
              category: newAnomaly.category,
              resolved: newAnomaly.resolved,
              escalatedToIncident: newAnomaly.escalatedToIncident,
              criticalFindingEmitted: newFindingIds.length > 0,
            },
          },
          actor,
        ),
      ]),
    }
  })

  return merged
}

// ── Review reminder scheduling (Sprint 022 cron hook) ───────────────────────

/**
 * Emite un eveniment pmm.review_reminder_scheduled care va fi consumat de
 * cron-ul Sprint 022 (Preventive engine) pentru a trimite reminder DPO
 * înainte de termenul reviziei. Operațiune idempotentă.
 */
export async function scheduleReviewReminder(
  orgId: string,
  id: string,
  daysBeforeReview: number,
  actor: ComplianceEventActorInput,
): Promise<PmmPlan | null> {
  if (daysBeforeReview < 0 || daysBeforeReview > 365) {
    throw new Error("daysBeforeReview must be 0..365")
  }
  const existing = await getPmmPlanById(orgId, id)
  if (!existing) return null
  const now = nowISO()
  let alertAtISO: string | undefined
  if (existing.nextReviewISO) {
    const nextMs = new Date(existing.nextReviewISO).getTime()
    alertAtISO = new Date(nextMs - daysBeforeReview * DAY_MS).toISOString()
  }
  await mutateFreshStateForOrg(orgId, (s) => {
    return {
      ...s,
      events: appendComplianceEvents(s, [
        createComplianceEvent(
          {
            type: "pmm.review_reminder_scheduled",
            entityType: "system",
            entityId: existing.id,
            message: `Reminder PMM revizie planificat: ${existing.title} · ${daysBeforeReview} zile înainte de ${existing.nextReviewISO ?? "—"}`,
            createdAtISO: now,
            metadata: {
              daysBeforeReview,
              alertAtISO: alertAtISO ?? "no_review_scheduled",
              reviewCycleMonths: existing.reviewCycleMonths,
            },
          },
          actor,
        ),
      ]),
    }
  })
  return existing
}

// ── Sprint 020 bridge: escalate PMM anomaly → AI Incident (Art. 73) ────────

/**
 * Sprint 020 — escalează o anomalie PMM critică spre AI Incident Reporting
 * (Art. 73 AI Act). Operație bidirectională:
 *   1. Creează un AIIncident nou în registry-ul Sprint 020 cu metadata
 *      pre-populată din anomalie (severitate → catastrophic dacă anomaly
 *      critical, categorie default fundamental_rights_infringement; DPO
 *      poate ajusta ulterior).
 *   2. Actualizează PmmAnomalyRecord cu escalatedToIncident=true +
 *      linkedIncidentId pe planul curent.
 *   3. Emite ai_incident.linked_to_pmm_anomaly + pmm.anomaly_escalated events.
 *
 * Returnează ID-ul incidentului nou creat (sau aruncă dacă planul / anomalia
 * nu există sau dacă anomalia este deja escaladată).
 *
 * NOTĂ: import dinamic pentru a evita ciclul ai-incident-store ↔ pmm-store.
 */
export async function escalateAnomalyToIncident(
  orgId: string,
  planId: string,
  anomalyId: string,
  actor: ComplianceEventActorInput,
  orgName = "Organizația",
): Promise<{
  incidentId: string
  plan: PmmPlan
}> {
  const plan = await getPmmPlanById(orgId, planId)
  if (!plan) throw new Error(`PMM plan ${planId} inexistent`)
  const anomaly = plan.anomalies.find((a) => a.id === anomalyId)
  if (!anomaly) throw new Error(`Anomalia ${anomalyId} inexistentă pe plan ${planId}`)
  if (anomaly.escalatedToIncident && anomaly.linkedIncidentId) {
    throw new Error(
      `Anomalia ${anomalyId} deja escaladată spre incidentul ${anomaly.linkedIncidentId}`,
    )
  }

  // Map anomaly severity → incident severity
  const severityMap = {
    low: "minor",
    medium: "moderate",
    high: "serious",
    critical: "catastrophic",
  } as const
  const incidentSeverity = severityMap[anomaly.severity]

  // Map anomaly category → AI incident category. Default fundamental_rights
  // pentru cele mai multe; bias / data drift indică probabilitate impact
  // drepturi fundamentale. DPO poate ajusta ulterior.
  const category =
    anomaly.category === "security"
      ? "critical_infrastructure_disruption"
      : "fundamental_rights_infringement"

  // Import dynamic ca să evităm circular import
  const { createIncident, linkToPmmAnomaly } = await import(
    "@/lib/server/ai-incident-store"
  )

  const incident = await createIncident(
    orgId,
    {
      title: `Incident escaladat din anomalie PMM: ${plan.title}`,
      description: `Incident escaladat automat din anomalia PMM "${anomaly.description}" (categorie: ${anomaly.category}, severitate: ${anomaly.severity}) detectată pe ${anomaly.detectedAtISO}. Impact declarat: ${anomaly.impactDescription}. Anomalia a fost evaluată ca necesitând notificare Art. 73 conform politicii organizației.`,
      category,
      severity: incidentSeverity,
      linkedAISystemId: plan.linkedAISystemId,
      detectedAtISO: anomaly.detectedAtISO,
      linkedPmmAnomalyId: anomalyId,
      notificationRequired: true,
      assignedToEmail: actor.label,
      notes: `Escalat din PMM Plan: ${plan.id} (${plan.title}). Categorie incident default = fundamental_rights_infringement; DPO trebuie să valideze categoria + severitatea + să decidă autoritatea destinatară.`,
    },
    actor,
    orgName,
  )

  // Update PMM anomaly to mark escalation (bidirectional)
  await linkToPmmAnomaly(orgId, incident.id, planId, anomalyId, actor)

  // Emit dedicated PMM-side event for audit clarity
  await mutateFreshStateForOrg(orgId, (s) => {
    return {
      ...s,
      events: appendComplianceEvents(s, [
        createComplianceEvent(
          {
            type: "pmm.anomaly_escalated",
            entityType: "system",
            entityId: planId,
            message: `Anomalie PMM "${anomaly.description}" escaladată spre AI Incident ${incident.id} (Art. 73)`,
            createdAtISO: nowISO(),
            metadata: {
              anomalyId,
              incidentId: incident.id,
              category: incident.category,
              severity: incident.severity,
              reportingDeadlineDays: incident.reportingDeadlineDays,
            },
          },
          actor,
        ),
      ]),
    }
  })

  const updatedPlan = await getPmmPlanById(orgId, planId)
  return { incidentId: incident.id, plan: updatedPlan ?? plan }
}

// ── Markdown export (regenerat live) ─────────────────────────────────────────

export function buildPmmMarkdown(
  record: PmmPlan,
  orgName: string,
  systemName?: string,
): string {
  const evalResult = evaluatePmm({
    record,
    orgName,
    systemName,
  })
  return evalResult.generatedMarkdown
}
