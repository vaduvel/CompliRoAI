/**
 * Sprint 016 — FRIA store (CRUD + lifecycle helpers peste
 * `state.friaRecords[]` + ledger evenimente + finding emission obligatoriu).
 *
 * Pattern: foloseste `mutateFreshStateForOrg` din `lib/server/store.ts`
 * pentru audit-trail hash-chain consistent cu DPIA / Breach / Vendor stores.
 *
 * Surface API:
 *  - readFriaRecords(orgId)
 *  - getFriaRecordById(orgId, id)
 *  - createFria(orgId, input, actor)              → creează + rulează evaluator + emite findings
 *  - updateFria(orgId, id, patch, actor)          → merge patch + re-evaluează
 *  - deleteFria(orgId, id, actor)
 *  - markFriaApproved(orgId, id, approvedByEmail, actor)
 *  - markFriaRejected(orgId, id, reason, actor)
 *  - notifyAuthority(orgId, id, authorityName, reference, actor)
 *  - reuseDpia(orgId, friaId, dpiaRecordId, actor)   → Art. 27(4)
 *  - buildFriaMarkdown(record, orgName, systemName?) → re-rulează evaluator pentru export
 *
 * Findings emise sunt salvate prin createFinding() (din findings-store) și
 * ID-urile rezultate sunt scrise în `linkedFindingIds[]` pe record.
 */

import {
  appendComplianceEvents,
  createComplianceEvent,
  type ComplianceEventActorInput,
} from "@/lib/compliance/events"
import { mutateFreshStateForOrg, readState } from "@/lib/server/store"
import { createFinding } from "@/lib/server/findings-store"
import { evaluateFria } from "@/lib/compliance/fria-evaluator"
import type {
  AISystemRecord,
  FriaAffectedGroup,
  FriaDeployerType,
  FriaFrequencyOfUse,
  FriaHumanOversightMeasure,
  FriaRecord,
  FriaRecordStatus,
  FriaRiskAssessment,
  FundamentalRight,
} from "@/lib/compliance/types"

// ── Types ────────────────────────────────────────────────────────────────────

export type FriaSummary = {
  total: number
  draft: number
  inReview: number
  approved: number
  rejected: number
  needsMitigation: number
  highOrCriticalCount: number
  notifiedToAuthorityCount: number
}

export type CreateFriaInput = {
  title: string
  linkedAISystemId: string
  linkedDpiaRecordId?: string
  deployerType: FriaDeployerType
  processDescription: string
  periodOfUseStartISO?: string
  periodOfUseEndISO?: string
  frequencyOfUse: FriaFrequencyOfUse
  expectedVolume?: number
  affectedGroups?: FriaAffectedGroup[]
  rightsAtRisk?: FundamentalRight[]
  riskAssessments?: FriaRiskAssessment[]
  humanOversightMeasures?: FriaHumanOversightMeasure[]
  complaintMechanism?: string
  governanceMeasures?: string[]
  notifyAuthorityRequired?: boolean
  notifyAuthorityName?: string
  notes?: string
}

export type UpdateFriaPatch = Partial<
  Omit<
    FriaRecord,
    | "id"
    | "orgId"
    | "linkedFindingIds"
    | "createdAtISO"
    | "updatedAtISO"
    | "overallRiskScore"
    | "overallRiskLevel"
    | "generatedMarkdown"
  >
>

const STATUSES: FriaRecordStatus[] = [
  "draft",
  "screening_done",
  "in_review",
  "needs_mitigation",
  "approved",
  "rejected",
  "obsolete",
]

// ── Helpers ──────────────────────────────────────────────────────────────────

function nowISO(): string {
  return new Date().toISOString()
}

function uid(): string {
  return `fria-${Math.random().toString(36).slice(2, 10)}`
}

export function isFriaStatus(value: unknown): value is FriaRecordStatus {
  return typeof value === "string" && STATUSES.includes(value as FriaRecordStatus)
}

export function summarizeFriaRecords(records: FriaRecord[]): FriaSummary {
  let draft = 0
  let inReview = 0
  let approved = 0
  let rejected = 0
  let needsMitigation = 0
  let highOrCriticalCount = 0
  let notifiedToAuthorityCount = 0
  for (const r of records) {
    if (r.status === "draft" || r.status === "screening_done") draft++
    else if (r.status === "in_review") inReview++
    else if (r.status === "approved") approved++
    else if (r.status === "rejected") rejected++
    else if (r.status === "needs_mitigation") needsMitigation++
    if (r.overallRiskLevel === "high" || r.overallRiskLevel === "critical") highOrCriticalCount++
    if (r.notifiedAtISO) notifiedToAuthorityCount++
  }
  return {
    total: records.length,
    draft,
    inReview,
    approved,
    rejected,
    needsMitigation,
    highOrCriticalCount,
    notifiedToAuthorityCount,
  }
}

function findSystemName(
  state: { aiSystems?: AISystemRecord[] },
  systemId: string,
): string | undefined {
  return state.aiSystems?.find((s) => s.id === systemId)?.name
}

// ── Read ─────────────────────────────────────────────────────────────────────

export async function readFriaRecords(_orgId?: string): Promise<{
  records: FriaRecord[]
  summary: FriaSummary
}> {
  const state = await readState()
  const records = state.friaRecords ?? []
  return { records, summary: summarizeFriaRecords(records) }
}

export async function getFriaRecordById(
  _orgId: string,
  id: string,
): Promise<FriaRecord | null> {
  const state = await readState()
  return state.friaRecords?.find((r) => r.id === id) ?? null
}

// ── Internal: rulează evaluator + persistă findings, returnează partial fields ──

/**
 * Rulează evaluator pe record. Pentru fiecare candidateFinding emis:
 *  - apelează createFinding() (care emite event finding.created + finding în state)
 *  - colectează findingId rezultat
 * Returnează tuple-ul de campuri care trebuie sumblui pe record:
 *  - overallRiskScore + overallRiskLevel + generatedMarkdown + linkedFindingIds
 */
async function runEvaluatorAndPersistFindings(
  orgId: string,
  record: FriaRecord,
  orgName: string,
  systemName: string | undefined,
  actor: ComplianceEventActorInput,
): Promise<{
  overallRiskScore: number
  overallRiskLevel: FriaRecord["overallRiskLevel"]
  generatedMarkdown: string
  linkedFindingIds: string[]
}> {
  const evalResult = evaluateFria({ record, orgName, systemName })
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
        ownerSuggestion: "Deployer responsible / DPO",
        closeCondition: candidate.resolution?.closureEvidence,
      },
      actor,
    )
    findingIds.push(created.id)
  }
  return {
    overallRiskScore: evalResult.overallRiskScore,
    overallRiskLevel: evalResult.overallRiskLevel,
    generatedMarkdown: evalResult.generatedMarkdown,
    linkedFindingIds: findingIds,
  }
}

// ── Create ───────────────────────────────────────────────────────────────────

export async function createFria(
  orgId: string,
  input: CreateFriaInput,
  actor: ComplianceEventActorInput,
  orgName = "Organizația",
): Promise<FriaRecord> {
  const title = input.title?.trim()
  if (!title) throw new Error("FRIA title required")
  if (!input.linkedAISystemId) throw new Error("FRIA linkedAISystemId required")

  const now = nowISO()
  // 1) Pre-mutate read pentru system name + DPIA verify
  const state = await readState()
  const systemName = findSystemName(state, input.linkedAISystemId)

  // 2) Construim record draft (fără overallRiskScore — va veni de la evaluator)
  const draft: FriaRecord = {
    id: uid(),
    orgId,
    title,
    linkedAISystemId: input.linkedAISystemId,
    linkedDpiaRecordId: input.linkedDpiaRecordId,
    deployerType: input.deployerType,
    processDescription: input.processDescription?.trim() ?? "",
    periodOfUseStartISO: input.periodOfUseStartISO,
    periodOfUseEndISO: input.periodOfUseEndISO,
    frequencyOfUse: input.frequencyOfUse,
    expectedVolume: input.expectedVolume,
    affectedGroups: input.affectedGroups ?? [],
    rightsAtRisk: input.rightsAtRisk ?? [],
    riskAssessments: input.riskAssessments ?? [],
    overallRiskScore: 0,
    overallRiskLevel: "low",
    humanOversightMeasures: input.humanOversightMeasures ?? [],
    complaintMechanism: input.complaintMechanism?.trim() ?? "",
    governanceMeasures: input.governanceMeasures ?? [],
    notifyAuthorityRequired: input.notifyAuthorityRequired ?? false,
    notifyAuthorityName: input.notifyAuthorityName,
    status: "draft",
    linkedFindingIds: [],
    evidenceVaultIds: [],
    notes: input.notes,
    createdAtISO: now,
    updatedAtISO: now,
  }

  // 3) Rulează evaluator + emite findings (in separate calls, înainte de a scrie record)
  const evalUpdate = await runEvaluatorAndPersistFindings(orgId, draft, orgName, systemName, actor)
  const enriched: FriaRecord = {
    ...draft,
    overallRiskScore: evalUpdate.overallRiskScore,
    overallRiskLevel: evalUpdate.overallRiskLevel,
    generatedMarkdown: evalUpdate.generatedMarkdown,
    linkedFindingIds: evalUpdate.linkedFindingIds,
    status: draft.riskAssessments.length > 0 ? "screening_done" : "draft",
  }

  // 4) Persistă record + emite event fria.created
  await mutateFreshStateForOrg(orgId, (s) => {
    return {
      ...s,
      friaRecords: [enriched, ...(s.friaRecords ?? [])].slice(0, 200),
      events: appendComplianceEvents(s, [
        createComplianceEvent(
          {
            type: "fria.created",
            entityType: "system",
            entityId: enriched.id,
            message: `FRIA creată: ${enriched.title} · ${enriched.overallRiskLevel} (${enriched.overallRiskScore}/100)`,
            createdAtISO: now,
            metadata: {
              linkedAISystemId: enriched.linkedAISystemId,
              deployerType: enriched.deployerType,
              overallRiskLevel: enriched.overallRiskLevel,
              overallRiskScore: enriched.overallRiskScore,
              linkedDpiaRecordId: enriched.linkedDpiaRecordId ?? "",
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

export async function updateFria(
  orgId: string,
  id: string,
  patch: UpdateFriaPatch,
  actor: ComplianceEventActorInput,
  orgName = "Organizația",
): Promise<FriaRecord | null> {
  const existing = await getFriaRecordById(orgId, id)
  if (!existing) return null

  const merged: FriaRecord = {
    ...existing,
    ...patch,
    // Garantăm că nu suprascriem ID/orgId/timestamps imuabile prin patch
    id: existing.id,
    orgId: existing.orgId,
    createdAtISO: existing.createdAtISO,
    linkedFindingIds: existing.linkedFindingIds,
    updatedAtISO: nowISO(),
  }
  if (patch.status && !isFriaStatus(patch.status)) {
    merged.status = existing.status
  }

  // Re-rulează evaluator. Nu mai emitem findings noi pentru cele duplicate
  // (createFinding va crea findings noi cu ID unic — pentru moment păstrăm
  // logica simplă: re-evaluation regenerează findings doar dacă patch atinge
  // câmpurile relevante).
  const shouldReevaluate =
    patch.riskAssessments !== undefined ||
    patch.complaintMechanism !== undefined ||
    patch.humanOversightMeasures !== undefined ||
    patch.notifyAuthorityRequired !== undefined ||
    patch.notifiedAtISO !== undefined

  const state = await readState()
  const systemName = findSystemName(state, merged.linkedAISystemId)

  if (shouldReevaluate) {
    const evalResult = evaluateFria({ record: merged, orgName, systemName })
    merged.overallRiskScore = evalResult.overallRiskScore
    merged.overallRiskLevel = evalResult.overallRiskLevel
    merged.generatedMarkdown = evalResult.generatedMarkdown
    // Nu emitem findings re-evaluate la update — pentru a evita duplicate.
    // Findings noi se emit doar la create. Update marchează doar metadata.
  }

  await mutateFreshStateForOrg(orgId, (s) => {
    const records = s.friaRecords ?? []
    const idx = records.findIndex((r) => r.id === id)
    if (idx === -1) return s
    const next = [...records]
    next[idx] = merged
    return {
      ...s,
      friaRecords: next,
      events: appendComplianceEvents(s, [
        createComplianceEvent(
          {
            type: "fria.updated",
            entityType: "system",
            entityId: merged.id,
            message: `FRIA actualizată: ${merged.title} · status ${merged.status} · risc ${merged.overallRiskLevel}`,
            createdAtISO: nowISO(),
            metadata: {
              status: merged.status,
              overallRiskLevel: merged.overallRiskLevel,
              reevaluated: shouldReevaluate,
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

export async function deleteFria(
  orgId: string,
  id: string,
  actor: ComplianceEventActorInput,
): Promise<boolean> {
  let removed = false
  await mutateFreshStateForOrg(orgId, (s) => {
    const records = s.friaRecords ?? []
    const target = records.find((r) => r.id === id)
    if (!target) return s
    removed = true
    return {
      ...s,
      friaRecords: records.filter((r) => r.id !== id),
      events: appendComplianceEvents(s, [
        createComplianceEvent(
          {
            type: "fria.deleted",
            entityType: "system",
            entityId: id,
            message: `FRIA ștearsă: ${target.title}`,
            createdAtISO: nowISO(),
            metadata: { status: target.status, overallRiskLevel: target.overallRiskLevel },
          },
          actor,
        ),
      ]),
    }
  })
  return removed
}

// ── Lifecycle: approve / reject ─────────────────────────────────────────────

export async function markFriaApproved(
  orgId: string,
  id: string,
  approvedByEmail: string,
  actor: ComplianceEventActorInput,
): Promise<FriaRecord | null> {
  const existing = await getFriaRecordById(orgId, id)
  if (!existing) return null
  const now = nowISO()
  const next: FriaRecord = {
    ...existing,
    status: "approved",
    approvedByEmail,
    approvedAtISO: now,
    reviewedByEmail: actor.label,
    reviewedAtISO: now,
    updatedAtISO: now,
    rejectionReason: undefined,
  }
  await mutateFreshStateForOrg(orgId, (s) => {
    const records = s.friaRecords ?? []
    const idx = records.findIndex((r) => r.id === id)
    if (idx === -1) return s
    const arr = [...records]
    arr[idx] = next
    return {
      ...s,
      friaRecords: arr,
      events: appendComplianceEvents(s, [
        createComplianceEvent(
          {
            type: "fria.approved",
            entityType: "system",
            entityId: next.id,
            message: `FRIA aprobată: ${next.title} · de ${approvedByEmail}`,
            createdAtISO: now,
            metadata: { approvedByEmail, overallRiskLevel: next.overallRiskLevel },
          },
          actor,
        ),
      ]),
    }
  })
  return next
}

export async function markFriaRejected(
  orgId: string,
  id: string,
  reason: string,
  actor: ComplianceEventActorInput,
): Promise<FriaRecord | null> {
  if (!reason || reason.trim().length < 5) {
    throw new Error("FRIA rejection reason required (min 5 chars)")
  }
  const existing = await getFriaRecordById(orgId, id)
  if (!existing) return null
  const now = nowISO()
  const next: FriaRecord = {
    ...existing,
    status: "rejected",
    rejectionReason: reason.trim(),
    reviewedByEmail: actor.label,
    reviewedAtISO: now,
    updatedAtISO: now,
    approvedByEmail: undefined,
    approvedAtISO: undefined,
  }
  await mutateFreshStateForOrg(orgId, (s) => {
    const records = s.friaRecords ?? []
    const idx = records.findIndex((r) => r.id === id)
    if (idx === -1) return s
    const arr = [...records]
    arr[idx] = next
    return {
      ...s,
      friaRecords: arr,
      events: appendComplianceEvents(s, [
        createComplianceEvent(
          {
            type: "fria.rejected",
            entityType: "system",
            entityId: next.id,
            message: `FRIA respinsă: ${next.title} · motiv: ${reason.trim()}`,
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

// ── Authority notification (Art. 27(3)) ──────────────────────────────────────

export async function notifyAuthority(
  orgId: string,
  id: string,
  authorityName: string,
  reference: string,
  actor: ComplianceEventActorInput,
): Promise<FriaRecord | null> {
  if (!authorityName?.trim()) throw new Error("Authority name required")
  if (!reference?.trim()) throw new Error("Authority reference required")
  const existing = await getFriaRecordById(orgId, id)
  if (!existing) return null
  const now = nowISO()
  const next: FriaRecord = {
    ...existing,
    notifyAuthorityRequired: true,
    notifyAuthorityName: authorityName.trim(),
    notifiedAtISO: now,
    authorityReference: reference.trim(),
    updatedAtISO: now,
  }
  await mutateFreshStateForOrg(orgId, (s) => {
    const records = s.friaRecords ?? []
    const idx = records.findIndex((r) => r.id === id)
    if (idx === -1) return s
    const arr = [...records]
    arr[idx] = next
    return {
      ...s,
      friaRecords: arr,
      events: appendComplianceEvents(s, [
        createComplianceEvent(
          {
            type: "fria.authority_notified",
            entityType: "system",
            entityId: next.id,
            message: `FRIA notificată autorității ${authorityName.trim()} · ref ${reference.trim()}`,
            createdAtISO: now,
            metadata: { authorityName: authorityName.trim(), authorityReference: reference.trim() },
          },
          actor,
        ),
      ]),
    }
  })
  return next
}

// ── Art. 27(4) — DPIA reuse ─────────────────────────────────────────────────

export async function reuseDpia(
  orgId: string,
  friaId: string,
  dpiaRecordId: string,
  actor: ComplianceEventActorInput,
): Promise<FriaRecord | null> {
  if (!dpiaRecordId) throw new Error("DPIA record id required")
  const existing = await getFriaRecordById(orgId, friaId)
  if (!existing) return null
  // Verify DPIA exists
  const state = await readState()
  const dpia = state.dpiaRecords?.find((d) => d.id === dpiaRecordId)
  if (!dpia) throw new Error("DPIA record not found")
  const now = nowISO()
  const next: FriaRecord = {
    ...existing,
    linkedDpiaRecordId: dpiaRecordId,
    updatedAtISO: now,
  }
  await mutateFreshStateForOrg(orgId, (s) => {
    const records = s.friaRecords ?? []
    const idx = records.findIndex((r) => r.id === friaId)
    if (idx === -1) return s
    const arr = [...records]
    arr[idx] = next
    return {
      ...s,
      friaRecords: arr,
      events: appendComplianceEvents(s, [
        createComplianceEvent(
          {
            type: "fria.dpia_reused",
            entityType: "system",
            entityId: next.id,
            message: `Art. 27(4): FRIA "${next.title}" reutilizează DPIA ${dpiaRecordId}`,
            createdAtISO: now,
            metadata: { linkedDpiaRecordId: dpiaRecordId, dpiaTitle: dpia.title },
          },
          actor,
        ),
      ]),
    }
  })
  return next
}

// ── Markdown export (regenerat live la fiecare export) ──────────────────────

export function buildFriaMarkdown(
  record: FriaRecord,
  orgName: string,
  systemName?: string,
): string {
  const evalResult = evaluateFria({ record, orgName, systemName })
  return evalResult.generatedMarkdown
}
