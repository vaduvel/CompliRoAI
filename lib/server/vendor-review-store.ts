/**
 * Sprint 010 — Vendor Review Store (adapter).
 *
 * CRUD pe state.vendorRecords cu:
 * - Auto risk evaluation via evaluateVendorReview (vendor-review-engine)
 * - Finding emission via createFinding (findings-store) cu dedupe pe stable
 *   ID din vendor-risk.buildVendorFindings
 * - Event ledger consistent cu pattern DPIA / RoPA / Breach / AI Discovery
 * - Markdown brief generation pentru audit-pack
 *
 * Surface API:
 *   readVendorRecords(orgId): { records, summary, lifecycle }
 *   getVendorById(orgId, id)
 *   createVendor(orgId, input, actor): emite findings + event
 *   updateVendor(orgId, id, patch, actor): re-evalueaza + sync findings
 *   deleteVendor(orgId, id, actor)
 *   approveVendor(orgId, id, reviewerEmail, actor): mark approved
 *   rejectVendor(orgId, id, reason, actor): mark rejected
 *   buildBrief(orgId, id, orgName?): markdown brief
 *
 * Patterns:
 *   - mutateFreshStateForOrg pentru toate scrierile
 *   - createFinding pentru emission (NU push manual in state.findings)
 *   - appendComplianceEvents + createComplianceEvent pentru ledger
 *   - cap 200 vendori pentru a evita state bloat
 */

import {
  appendComplianceEvents,
  createComplianceEvent,
  type ComplianceEventActorInput,
} from "@/lib/compliance/events"
import { mutateFreshStateForOrg, readState } from "@/lib/server/store"
import { createFinding } from "@/lib/server/findings-store"
import { evaluateVendorReview, buildVendorReviewBrief } from "@/lib/compliance/vendor-review-engine"
import {
  buildVendorLifecycleSummary,
  type VendorLifecycleSummary,
} from "@/lib/compliance/vendor-review-lifecycle"
import type { VendorRiskContext } from "@/lib/compliance/vendor-risk"
import type {
  AIDataMapRecord,
  AISystemRecord,
  DPAStatus,
  VendorAITerms,
  VendorDoraScope,
  VendorRecord,
  VendorRegion,
  VendorReviewStatus,
  VendorRole,
  VendorSecurityEvidence,
  VendorTransferMechanism,
} from "@/lib/compliance/types"
import { evaluateAndMergeDoraFindings } from "@/lib/server/ai-regulatory-scope-store"

// ── Types ────────────────────────────────────────────────────────────────────

export type VendorSummary = {
  total: number
  approved: number
  rejected: number
  inReview: number
  needsDpa: number
  needsTransfer: number
  needsSecurity: number
  expired: number
  highRisk: number
  criticalRisk: number
}

export type CreateVendorInput = {
  name: string
  legalEntity?: string
  contactEmail?: string
  productUsed?: string
  vendorRegion?: VendorRegion
  role?: VendorRole
  serviceCategory?: string
  linkedAISystemIds?: string[]
  linkedAIDataMapIds?: string[]
  dpaStatus?: DPAStatus
  dpaUrl?: string
  dpaSignedAtISO?: string
  dpaExpiresAtISO?: string
  transferRequired?: boolean
  transferMechanism?: VendorTransferMechanism
  transferAssessmentNote?: string
  subprocessorsList?: string[]
  subprocessorsUrl?: string
  securityEvidence?: Partial<VendorSecurityEvidence>
  aiTerms?: Partial<VendorAITerms>
  notes?: string
  /** Sprint 012 — DORA AI slice extension. */
  doraScope?: VendorDoraScope
}

export type UpdateVendorPatch = Partial<CreateVendorInput> & {
  reviewStatus?: VendorReviewStatus
  reviewedByEmail?: string
}

// ── DORA scope helpers ──────────────────────────────────────────────────────

function normDoraScope(
  input: VendorDoraScope | undefined,
  current?: VendorDoraScope,
): VendorDoraScope | undefined {
  if (input === undefined) return current
  return {
    material: !!input.material,
    criticalForService: input.criticalForService?.trim() || undefined,
    assessmentNote: input.assessmentNote?.trim() || undefined,
    evaluatedAtISO: input.evaluatedAtISO ?? current?.evaluatedAtISO,
  }
}

// ── Const ────────────────────────────────────────────────────────────────────

const VALID_REGIONS: VendorRegion[] = ["EU", "US", "UK", "other", "unknown"]
const VALID_ROLES: VendorRole[] = [
  "processor",
  "controller",
  "joint_controller",
  "subprocessor",
]
const VALID_DPA_STATUS: DPAStatus[] = [
  "not_required",
  "missing",
  "draft_received",
  "negotiating",
  "signed",
  "expired",
]
const VALID_TRANSFER: VendorTransferMechanism[] = [
  "none",
  "adequacy_decision",
  "scc_controller_processor",
  "scc_processor_processor",
  "bcr",
  "derogation_art_49",
  "unknown",
]
const VALID_REVIEW_STATUS: VendorReviewStatus[] = [
  "draft",
  "in_review",
  "needs_dpa",
  "needs_transfer_review",
  "needs_security_review",
  "approved",
  "rejected",
  "expired",
]

// ── Type guards ──────────────────────────────────────────────────────────────

export function isVendorRegion(v: unknown): v is VendorRegion {
  return typeof v === "string" && VALID_REGIONS.includes(v as VendorRegion)
}
export function isVendorRole(v: unknown): v is VendorRole {
  return typeof v === "string" && VALID_ROLES.includes(v as VendorRole)
}
export function isDPAStatus(v: unknown): v is DPAStatus {
  return typeof v === "string" && VALID_DPA_STATUS.includes(v as DPAStatus)
}
export function isVendorTransferMechanism(v: unknown): v is VendorTransferMechanism {
  return typeof v === "string" && VALID_TRANSFER.includes(v as VendorTransferMechanism)
}
export function isVendorReviewStatus(v: unknown): v is VendorReviewStatus {
  return typeof v === "string" && VALID_REVIEW_STATUS.includes(v as VendorReviewStatus)
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function nowISO(): string {
  return new Date().toISOString()
}

function uid(): string {
  return `vendor-${Math.random().toString(36).slice(2, 10)}`
}

function normStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  return v
    .map((s) => (typeof s === "string" ? s.trim() : ""))
    .filter((s) => s.length > 0)
}

function safeSecurity(
  input: Partial<VendorSecurityEvidence> | undefined,
): VendorSecurityEvidence {
  return {
    iso27001: input?.iso27001 ?? false,
    soc2: input?.soc2 ?? false,
    penTestRecent: input?.penTestRecent ?? false,
    encryptionInTransit: input?.encryptionInTransit ?? false,
    encryptionAtRest: input?.encryptionAtRest ?? false,
    mfaEnforced: input?.mfaEnforced ?? false,
    auditLogsAvailable: input?.auditLogsAvailable ?? false,
    incidentNotificationCommitmentHours:
      typeof input?.incidentNotificationCommitmentHours === "number" &&
      Number.isFinite(input.incidentNotificationCommitmentHours)
        ? input.incidentNotificationCommitmentHours
        : undefined,
  }
}

function safeAITerms(input: Partial<VendorAITerms> | undefined): VendorAITerms {
  return {
    trainingDataOptOut: input?.trainingDataOptOut ?? "unknown",
    inputDataRetention: input?.inputDataRetention ?? "unknown",
    outputRightsOwnership: input?.outputRightsOwnership ?? "unknown",
    modelTransparency: input?.modelTransparency ?? "unknown",
    reproducibilityGuarantees: input?.reproducibilityGuarantees ?? false,
  }
}

/**
 * Determina context risc din linked records (AI inventory + AI data map).
 * Daca vendor link-uieste la AI data map cu processesPersonalData=true,
 * sau special categories, propaga.
 */
function buildRiskContext(
  vendor: VendorRecord,
  aiSystems: AISystemRecord[],
  aiDataMaps: AIDataMapRecord[],
): VendorRiskContext {
  const linkedSystems = aiSystems.filter((s) =>
    vendor.linkedAISystemIds.includes(s.id),
  )
  const linkedMaps = aiDataMaps.filter((m) =>
    vendor.linkedAIDataMapIds.includes(m.id),
  )

  // Personal data: orice linked system cu usesPersonalData sau data map cu it
  const personalDataFromSystems = linkedSystems.some((s) => s.usesPersonalData)
  const personalDataFromMaps = linkedMaps.some((m) => m.processesPersonalData)

  const specialCategoriesFromMaps = linkedMaps.some(
    (m) => m.processesSpecialCategories,
  )
  const childrenDataFromMaps = linkedMaps.some((m) => m.childrenData)

  // AI vendor: heuristic — daca serviceCategory contine "AI" sau vendor are
  // linkedAISystemIds, atunci e AI vendor.
  const isAIVendor =
    vendor.serviceCategory.toLowerCase().includes("ai") ||
    linkedSystems.length > 0 ||
    linkedMaps.length > 0

  return {
    processesPersonalData: personalDataFromSystems || personalDataFromMaps,
    processesSpecialCategories: specialCategoriesFromMaps,
    childrenData: childrenDataFromMaps,
    isAIVendor,
  }
}

// ── Summary builder ──────────────────────────────────────────────────────────

export function summarizeVendors(vendors: VendorRecord[]): VendorSummary {
  let approved = 0
  let rejected = 0
  let inReview = 0
  let needsDpa = 0
  let needsTransfer = 0
  let needsSecurity = 0
  let expired = 0
  let highRisk = 0
  let criticalRisk = 0

  for (const v of vendors) {
    if (v.reviewStatus === "approved") approved++
    else if (v.reviewStatus === "rejected") rejected++
    else if (v.reviewStatus === "in_review" || v.reviewStatus === "draft") inReview++
    else if (v.reviewStatus === "needs_dpa") needsDpa++
    else if (v.reviewStatus === "needs_transfer_review") needsTransfer++
    else if (v.reviewStatus === "needs_security_review") needsSecurity++
    else if (v.reviewStatus === "expired") expired++

    if (v.riskLevel === "high") highRisk++
    else if (v.riskLevel === "critical") criticalRisk++
  }

  return {
    total: vendors.length,
    approved,
    rejected,
    inReview,
    needsDpa,
    needsTransfer,
    needsSecurity,
    expired,
    highRisk,
    criticalRisk,
  }
}

// ── Read ─────────────────────────────────────────────────────────────────────

export async function readVendorRecords(_orgId?: string): Promise<{
  records: VendorRecord[]
  summary: VendorSummary
  lifecycle: VendorLifecycleSummary
}> {
  const state = await readState()
  const records = (state.vendorRecords ?? []) as VendorRecord[]
  return {
    records,
    summary: summarizeVendors(records),
    lifecycle: buildVendorLifecycleSummary(records),
  }
}

export async function getVendorById(
  _orgId: string,
  id: string,
): Promise<VendorRecord | null> {
  const state = await readState()
  const records = (state.vendorRecords ?? []) as VendorRecord[]
  return records.find((r) => r.id === id) ?? null
}

// ── Create ───────────────────────────────────────────────────────────────────

export async function createVendor(
  orgId: string,
  input: CreateVendorInput,
  actor: ComplianceEventActorInput,
): Promise<{ record: VendorRecord; linkedFindingIds: string[] }> {
  const name = input.name?.trim()
  if (!name) throw new Error("Numele vendorului este obligatoriu")

  const region: VendorRegion = isVendorRegion(input.vendorRegion)
    ? input.vendorRegion
    : "unknown"
  const role: VendorRole = isVendorRole(input.role) ? input.role : "processor"
  const dpaStatus: DPAStatus = isDPAStatus(input.dpaStatus)
    ? input.dpaStatus
    : "missing"
  const transferMechanism: VendorTransferMechanism = isVendorTransferMechanism(
    input.transferMechanism,
  )
    ? input.transferMechanism
    : "none"

  const now = nowISO()
  const recordId = uid()

  const baseRecord: VendorRecord = {
    id: recordId,
    orgId,
    name,
    legalEntity: input.legalEntity?.trim() || undefined,
    contactEmail: input.contactEmail?.trim() || undefined,
    productUsed: input.productUsed?.trim() ?? "",
    vendorRegion: region,
    role,
    serviceCategory: input.serviceCategory?.trim() || "Other",
    linkedAISystemIds: normStringArray(input.linkedAISystemIds),
    linkedAIDataMapIds: normStringArray(input.linkedAIDataMapIds),
    dpaStatus,
    dpaUrl: input.dpaUrl?.trim() || undefined,
    dpaSignedAtISO:
      input.dpaSignedAtISO && !Number.isNaN(Date.parse(input.dpaSignedAtISO))
        ? new Date(input.dpaSignedAtISO).toISOString()
        : undefined,
    dpaExpiresAtISO:
      input.dpaExpiresAtISO && !Number.isNaN(Date.parse(input.dpaExpiresAtISO))
        ? new Date(input.dpaExpiresAtISO).toISOString()
        : undefined,
    transferRequired:
      typeof input.transferRequired === "boolean"
        ? input.transferRequired
        : region !== "EU",
    transferMechanism,
    transferAssessmentNote: input.transferAssessmentNote?.trim() || undefined,
    subprocessorsList: normStringArray(input.subprocessorsList),
    subprocessorsUrl: input.subprocessorsUrl?.trim() || undefined,
    securityEvidence: safeSecurity(input.securityEvidence),
    aiTerms: safeAITerms(input.aiTerms),
    riskLevel: "low",
    riskReasons: [],
    reviewStatus: "draft",
    humanReviewRequired: false,
    linkedFindingIds: [],
    notes: input.notes?.trim() || undefined,
    createdAtISO: now,
    updatedAtISO: now,
    doraScope: normDoraScope(input.doraScope),
  }

  // Evalueaza riscul + status pe baza state-ului curent (linked AI systems/maps)
  const initialState = await readState()
  const ctx = buildRiskContext(
    baseRecord,
    (initialState.aiSystems ?? []) as AISystemRecord[],
    (initialState.aiDataMapRecords ?? []) as AIDataMapRecord[],
  )
  const evaluation = evaluateVendorReview(baseRecord, ctx, now)
  const finalRecord = evaluation.vendor

  // Emite findings (dedup pe stableId — daca finding cu acelasi stableId
  // exista deja, refolosim findings-store create care va crea unul nou cu
  // id propriu — pentru dedupe perfect ar trebui sa cautam pe stableId in
  // metadata, dar findings-store nu suporta stableId; pentru Sprint 010
  // emitem ne-dup pe creare initiala — re-evaluarea la update nu dubla
  // emit-eaza pentru ca verificam linkedFindingIds).
  const linkedFindingIds: string[] = []
  for (const candidate of evaluation.findingCandidates) {
    try {
      const finding = await createFinding(
        orgId,
        {
          title: candidate.title,
          detail: candidate.detail,
          category: "GDPR",
          severity: candidate.severity,
          legalReference: candidate.legalReference,
          remediationHint: candidate.remediationHint,
          evidenceRequired: candidate.evidenceRequired,
          ownerSuggestion: "DPO",
          closeCondition: `Vendor ${name}: rezolva gap-ul si re-evalueaza review-ul`,
        },
        actor,
      )
      linkedFindingIds.push(finding.id)
    } catch {
      // Ne-fatal: daca finding creation eseuaza, nu blocam vendor creation
    }
  }

  // Persist record cu linkedFindingIds + event ledger
  let createdRecord: VendorRecord | null = null
  await mutateFreshStateForOrg(orgId, (state) => {
    const recordWithLinks: VendorRecord = {
      ...finalRecord,
      linkedFindingIds,
    }
    createdRecord = recordWithLinks

    return {
      ...state,
      vendorRecords: [recordWithLinks, ...((state.vendorRecords ?? []) as VendorRecord[])].slice(
        0,
        200,
      ),
      events: appendComplianceEvents(state, [
        createComplianceEvent(
          {
            type: "vendor-review.created",
            entityType: "system",
            entityId: recordWithLinks.id,
            message: `Vendor adaugat: "${recordWithLinks.name}" · risc ${recordWithLinks.riskLevel} · status ${recordWithLinks.reviewStatus}`,
            createdAtISO: now,
            metadata: {
              vendorName: recordWithLinks.name,
              riskLevel: recordWithLinks.riskLevel,
              reviewStatus: recordWithLinks.reviewStatus,
              region: recordWithLinks.vendorRegion,
              role: recordWithLinks.role,
              dpaStatus: recordWithLinks.dpaStatus,
              findingsEmitted: linkedFindingIds.length,
            },
          },
          actor,
        ),
      ]),
    }
  })

  if (!createdRecord) throw new Error("createVendor: mutator did not produce a record")
  const persistedRecord: VendorRecord = createdRecord

  // Sprint 012 — wire DORA AI rules dacă vendorul e DORA-material.
  // mergeStableFindings e idempotent; nu re-emite findings deja existente.
  if (persistedRecord.doraScope?.material) {
    try {
      const dora = await evaluateAndMergeDoraFindings(orgId, persistedRecord, actor)
      // Stamp evaluatedAtISO on the doraScope so UI shows latest evaluation time.
      if (dora.added + dora.existing > 0 || dora.gaps.length === 0) {
        await mutateFreshStateForOrg(orgId, (state) => {
          const list = (state.vendorRecords ?? []) as VendorRecord[]
          const idx = list.findIndex((v) => v.id === persistedRecord.id)
          if (idx === -1) return state
          const stamped: VendorRecord = {
            ...list[idx],
            doraScope: list[idx].doraScope
              ? { ...list[idx].doraScope, evaluatedAtISO: nowISO() }
              : list[idx].doraScope,
          }
          const next = [...list]
          next[idx] = stamped
          return { ...state, vendorRecords: next }
        })
      }
    } catch {
      // Ne-fatal: dacă DORA evaluation eșuează, nu blocăm vendor creation.
    }
  }

  return { record: persistedRecord, linkedFindingIds }
}

// ── Update ───────────────────────────────────────────────────────────────────

export async function updateVendor(
  orgId: string,
  id: string,
  patch: UpdateVendorPatch,
  actor: ComplianceEventActorInput,
): Promise<VendorRecord | null> {
  let updated: VendorRecord | null = null
  let notFound = false

  await mutateFreshStateForOrg(orgId, (state) => {
    const vendors = (state.vendorRecords ?? []) as VendorRecord[]
    const idx = vendors.findIndex((v) => v.id === id)
    if (idx === -1) {
      notFound = true
      return state
    }
    const current = vendors[idx]
    const now = nowISO()

    const newRegion = isVendorRegion(patch.vendorRegion)
      ? patch.vendorRegion
      : current.vendorRegion
    const newRole = isVendorRole(patch.role) ? patch.role : current.role
    const newDpaStatus = isDPAStatus(patch.dpaStatus)
      ? patch.dpaStatus
      : current.dpaStatus
    const newTransferMech = isVendorTransferMechanism(patch.transferMechanism)
      ? patch.transferMechanism
      : current.transferMechanism

    const merged: VendorRecord = {
      ...current,
      name: patch.name?.trim() || current.name,
      legalEntity: patch.legalEntity === undefined ? current.legalEntity : (patch.legalEntity?.trim() || undefined),
      contactEmail: patch.contactEmail === undefined ? current.contactEmail : (patch.contactEmail?.trim() || undefined),
      productUsed: patch.productUsed === undefined ? current.productUsed : (patch.productUsed?.trim() || ""),
      vendorRegion: newRegion,
      role: newRole,
      serviceCategory: patch.serviceCategory === undefined ? current.serviceCategory : (patch.serviceCategory?.trim() || "Other"),
      linkedAISystemIds: patch.linkedAISystemIds === undefined ? current.linkedAISystemIds : normStringArray(patch.linkedAISystemIds),
      linkedAIDataMapIds: patch.linkedAIDataMapIds === undefined ? current.linkedAIDataMapIds : normStringArray(patch.linkedAIDataMapIds),
      dpaStatus: newDpaStatus,
      dpaUrl: patch.dpaUrl === undefined ? current.dpaUrl : (patch.dpaUrl?.trim() || undefined),
      dpaSignedAtISO:
        patch.dpaSignedAtISO === undefined
          ? current.dpaSignedAtISO
          : (patch.dpaSignedAtISO && !Number.isNaN(Date.parse(patch.dpaSignedAtISO))
              ? new Date(patch.dpaSignedAtISO).toISOString()
              : undefined),
      dpaExpiresAtISO:
        patch.dpaExpiresAtISO === undefined
          ? current.dpaExpiresAtISO
          : (patch.dpaExpiresAtISO && !Number.isNaN(Date.parse(patch.dpaExpiresAtISO))
              ? new Date(patch.dpaExpiresAtISO).toISOString()
              : undefined),
      transferRequired:
        typeof patch.transferRequired === "boolean"
          ? patch.transferRequired
          : current.transferRequired,
      transferMechanism: newTransferMech,
      transferAssessmentNote:
        patch.transferAssessmentNote === undefined
          ? current.transferAssessmentNote
          : (patch.transferAssessmentNote?.trim() || undefined),
      subprocessorsList: patch.subprocessorsList === undefined ? current.subprocessorsList : normStringArray(patch.subprocessorsList),
      subprocessorsUrl: patch.subprocessorsUrl === undefined ? current.subprocessorsUrl : (patch.subprocessorsUrl?.trim() || undefined),
      securityEvidence:
        patch.securityEvidence === undefined
          ? current.securityEvidence
          : safeSecurity({ ...current.securityEvidence, ...patch.securityEvidence }),
      aiTerms:
        patch.aiTerms === undefined
          ? current.aiTerms
          : safeAITerms({ ...current.aiTerms, ...patch.aiTerms }),
      reviewStatus: isVendorReviewStatus(patch.reviewStatus)
        ? patch.reviewStatus
        : current.reviewStatus,
      reviewedByEmail:
        patch.reviewedByEmail === undefined
          ? current.reviewedByEmail
          : (patch.reviewedByEmail?.trim() || undefined),
      reviewedAtISO:
        patch.reviewedByEmail && !current.reviewedByEmail ? now : current.reviewedAtISO,
      notes: patch.notes === undefined ? current.notes : (patch.notes?.trim() || undefined),
      updatedAtISO: now,
      doraScope:
        patch.doraScope === undefined
          ? current.doraScope
          : normDoraScope(patch.doraScope, current.doraScope),
    }

    // Re-evalueaza risc + status (using current state pentru linked records)
    const ctx = buildRiskContext(
      merged,
      (state.aiSystems ?? []) as AISystemRecord[],
      (state.aiDataMapRecords ?? []) as AIDataMapRecord[],
    )
    const evaluation = evaluateVendorReview(merged, ctx, now)
    const reEvaluated = evaluation.vendor

    updated = reEvaluated
    const nextVendors = [...vendors]
    nextVendors[idx] = reEvaluated

    return {
      ...state,
      vendorRecords: nextVendors,
      events: appendComplianceEvents(state, [
        createComplianceEvent(
          {
            type: "vendor-review.updated",
            entityType: "system",
            entityId: id,
            message: `Vendor actualizat: "${reEvaluated.name}" · risc ${reEvaluated.riskLevel} · status ${reEvaluated.reviewStatus}`,
            createdAtISO: now,
            metadata: {
              vendorName: reEvaluated.name,
              riskLevel: reEvaluated.riskLevel,
              reviewStatus: reEvaluated.reviewStatus,
              dpaStatus: reEvaluated.dpaStatus,
            },
          },
          actor,
        ),
      ]),
    }
  })

  if (notFound) return null
  if (!updated) return null
  const persistedRecord: VendorRecord = updated

  // Sprint 012 — re-evaluate DORA AI rules dacă vendorul e DORA-material.
  if (persistedRecord.doraScope?.material) {
    try {
      await evaluateAndMergeDoraFindings(orgId, persistedRecord, actor)
    } catch {
      // Ne-fatal.
    }
  }

  return persistedRecord
}

// ── Delete ───────────────────────────────────────────────────────────────────

export async function deleteVendor(
  orgId: string,
  id: string,
  actor: ComplianceEventActorInput,
): Promise<boolean> {
  let removed = false

  await mutateFreshStateForOrg(orgId, (state) => {
    const vendors = (state.vendorRecords ?? []) as VendorRecord[]
    const target = vendors.find((v) => v.id === id)
    if (!target) return state
    removed = true

    return {
      ...state,
      vendorRecords: vendors.filter((v) => v.id !== id),
      events: appendComplianceEvents(state, [
        createComplianceEvent(
          {
            type: "vendor-review.deleted",
            entityType: "system",
            entityId: id,
            message: `Vendor sters: "${target.name}"`,
            createdAtISO: nowISO(),
            metadata: { vendorName: target.name, riskLevel: target.riskLevel },
          },
          actor,
        ),
      ]),
    }
  })

  return removed
}

// ── Approve / Reject (lifecycle workflow) ────────────────────────────────────

export async function approveVendor(
  orgId: string,
  id: string,
  reviewerEmail: string,
  actor: ComplianceEventActorInput,
): Promise<VendorRecord | null> {
  const email = reviewerEmail?.trim()
  if (!email) throw new Error("Email reviewer obligatoriu pentru aprobare")
  return updateVendor(
    orgId,
    id,
    { reviewedByEmail: email, reviewStatus: "approved" },
    actor,
  )
}

export async function rejectVendor(
  orgId: string,
  id: string,
  reason: string,
  actor: ComplianceEventActorInput,
): Promise<VendorRecord | null> {
  const trimmed = reason?.trim()
  if (!trimmed) throw new Error("Motiv obligatoriu pentru respingere")
  const current = await getVendorById(orgId, id)
  if (!current) return null
  const notesAppended = current.notes
    ? `${current.notes}\n\n[Respins ${nowISO()}] ${trimmed}`
    : `[Respins ${nowISO()}] ${trimmed}`
  return updateVendor(
    orgId,
    id,
    {
      reviewStatus: "rejected",
      reviewedByEmail: actor.label,
      notes: notesAppended,
    },
    actor,
  )
}

// ── Brief generator ──────────────────────────────────────────────────────────

export async function buildBrief(
  orgId: string,
  id: string,
  orgName?: string,
): Promise<string | null> {
  const vendor = await getVendorById(orgId, id)
  if (!vendor) return null
  const state = await readState()
  const ctx = buildRiskContext(
    vendor,
    (state.aiSystems ?? []) as AISystemRecord[],
    (state.aiDataMapRecords ?? []) as AIDataMapRecord[],
  )
  return buildVendorReviewBrief(vendor, ctx, orgName ?? "Organizatia ta")
}
