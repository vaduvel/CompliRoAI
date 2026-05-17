/**
 * Sprint 009 — AI Data Discovery store (CRUD pe state.aiDataMapRecords +
 * auto-emit findings via ai-data-discovery engine + auto-rebuild exposure
 * report cache + ledger evenimente).
 *
 * Pattern conform 008C/D (DPIA / Breach store):
 *   mutateFreshStateForOrg(orgId, mutator) + createFinding + appendComplianceEvents
 *
 * Surface API:
 *   - readAIDataMapRecords(orgId) -> { records, summary }
 *   - getAIDataMapRecord(orgId, id) -> AIDataMapRecord | null
 *   - createAIDataMapRecord(orgId, intake, actor)
 *     -> evalueaza risc + emite findings + persista record + appends events
 *   - updateAIDataMapRecord(orgId, id, patch, actor)
 *   - deleteAIDataMapRecord(orgId, id, actor)
 *   - addFollowUpNote(orgId, id, note, actor) — append note + event
 *   - generateExposureReport(orgId, actor) — agrega state -> persistă raport +
 *     event "ai-discovery.report.generated"
 */

import {
  appendComplianceEvents,
  createComplianceEvent,
  type ComplianceEventActorInput,
} from "@/lib/compliance/events"
import { mutateFreshStateForOrg, readState } from "@/lib/server/store"
import { createFinding } from "@/lib/server/findings-store"
import {
  evaluateAIDataDiscovery,
  buildAIDataMapRecord,
  type AIDataDiscoveryIntake,
} from "@/lib/compliance/ai-data-discovery"
import { buildAIExposureReport } from "@/lib/compliance/ai-exposure-report"
import { getOrgContext } from "@/lib/server/org-context"
import type {
  AIDataMapRecord,
  AIDataMapStatus,
  AIDeploymentMode,
  AIExposureReport,
  AIRiskCandidate,
  AITrainingDataUsage,
  AIUseCaseCategory,
  AIVendorRegion,
} from "@/lib/compliance/types"

// ────────────────────────────────────────────────────────────────────────────
//   Types
// ────────────────────────────────────────────────────────────────────────────

export type AIDataMapSummary = {
  total: number
  active: number
  draft: number
  deprecated: number
  withPersonalData: number
  prohibitedCandidate: number
  highRiskCandidate: number
  noDpa: number
}

export type UpdateAIDataMapPatch = Partial<AIDataDiscoveryIntake> & {
  status?: AIDataMapStatus
}

// ────────────────────────────────────────────────────────────────────────────
//   Const & guards
// ────────────────────────────────────────────────────────────────────────────

const USE_CASE_CATEGORIES: AIUseCaseCategory[] = [
  "customer_support",
  "internal_copilot",
  "sales_marketing",
  "hr_workplace",
  "finance_credit_fraud",
  "medical_health",
  "education",
  "ecommerce_retail",
  "legal_professional",
  "ai_builder_agent",
  "cybersecurity",
  "public_sector_critical",
  "other",
]

const RISK_CANDIDATES: AIRiskCandidate[] = [
  "prohibited_candidate",
  "high_risk_candidate",
  "transparency_limited",
  "needs_human_review",
  "minimal",
]

const DEPLOYMENT_MODES: AIDeploymentMode[] = ["saas", "self_hosted", "api", "embedded"]

const VENDOR_REGIONS: AIVendorRegion[] = ["EU", "US", "UK", "other", "unknown"]

const TRAINING_USAGE: AITrainingDataUsage[] = [
  "no_training",
  "opt_out_available",
  "trains_on_data",
  "unknown",
]

const STATUSES: AIDataMapStatus[] = ["draft", "active", "deprecated"]

export function isAIUseCaseCategory(value: unknown): value is AIUseCaseCategory {
  return typeof value === "string" && USE_CASE_CATEGORIES.includes(value as AIUseCaseCategory)
}

export function isAIRiskCandidate(value: unknown): value is AIRiskCandidate {
  return typeof value === "string" && RISK_CANDIDATES.includes(value as AIRiskCandidate)
}

export function isAIDeploymentMode(value: unknown): value is AIDeploymentMode {
  return typeof value === "string" && DEPLOYMENT_MODES.includes(value as AIDeploymentMode)
}

export function isAIVendorRegion(value: unknown): value is AIVendorRegion {
  return typeof value === "string" && VENDOR_REGIONS.includes(value as AIVendorRegion)
}

export function isAITrainingDataUsage(value: unknown): value is AITrainingDataUsage {
  return typeof value === "string" && TRAINING_USAGE.includes(value as AITrainingDataUsage)
}

export function isAIDataMapStatus(value: unknown): value is AIDataMapStatus {
  return typeof value === "string" && STATUSES.includes(value as AIDataMapStatus)
}

// ────────────────────────────────────────────────────────────────────────────
//   Helpers
// ────────────────────────────────────────────────────────────────────────────

function nowISO(): string {
  return new Date().toISOString()
}

function uid(): string {
  return `ai-data-${Math.random().toString(36).slice(2, 10)}`
}

function reportUid(): string {
  return `ai-report-${Math.random().toString(36).slice(2, 10)}`
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const out: string[] = []
  for (const v of value) {
    if (typeof v === "string") {
      const trimmed = v.trim()
      if (trimmed) out.push(trimmed)
    }
  }
  return Array.from(new Set(out))
}

// ────────────────────────────────────────────────────────────────────────────
//   Summary
// ────────────────────────────────────────────────────────────────────────────

export function summarizeAIDataMap(records: AIDataMapRecord[]): AIDataMapSummary {
  const summary: AIDataMapSummary = {
    total: records.length,
    active: 0,
    draft: 0,
    deprecated: 0,
    withPersonalData: 0,
    prohibitedCandidate: 0,
    highRiskCandidate: 0,
    noDpa: 0,
  }
  for (const record of records) {
    if (record.status === "active") summary.active++
    else if (record.status === "draft") summary.draft++
    else if (record.status === "deprecated") summary.deprecated++
    if (record.processesPersonalData) summary.withPersonalData++
    if (record.riskCandidate === "prohibited_candidate") summary.prohibitedCandidate++
    if (record.riskCandidate === "high_risk_candidate") summary.highRiskCandidate++
    if (record.processesPersonalData && !record.dpaSigned) summary.noDpa++
  }
  return summary
}

// ────────────────────────────────────────────────────────────────────────────
//   Read
// ────────────────────────────────────────────────────────────────────────────

export async function readAIDataMapRecords(_orgId?: string): Promise<{
  records: AIDataMapRecord[]
  summary: AIDataMapSummary
}> {
  const state = await readState()
  const records = (state.aiDataMapRecords ?? []) as AIDataMapRecord[]
  return { records, summary: summarizeAIDataMap(records) }
}

export async function getAIDataMapRecord(
  _orgId: string,
  id: string,
): Promise<AIDataMapRecord | null> {
  const state = await readState()
  const records = (state.aiDataMapRecords ?? []) as AIDataMapRecord[]
  return records.find((r) => r.id === id) ?? null
}

// ────────────────────────────────────────────────────────────────────────────
//   Create — emit findings + persist record + events
// ────────────────────────────────────────────────────────────────────────────

export async function createAIDataMapRecord(
  orgId: string,
  intake: AIDataDiscoveryIntake,
  actor: ComplianceEventActorInput,
): Promise<{ record: AIDataMapRecord; linkedFindingIds: string[] }> {
  const toolName = intake.toolName?.trim()
  if (!toolName) throw new Error("toolName required")
  const useCaseDescription = intake.useCaseDescription?.trim() ?? ""

  const normalized: AIDataDiscoveryIntake = {
    ...intake,
    toolName,
    vendor: intake.vendor?.trim() ?? "",
    useCaseDescription,
    inputDataCategories: normalizeStringArray(intake.inputDataCategories),
    outputDataCategories: normalizeStringArray(intake.outputDataCategories),
    dpaUrl: intake.dpaUrl?.trim() || undefined,
    linkedAISystemId: intake.linkedAISystemId?.trim() || undefined,
    notes: intake.notes?.trim() || undefined,
  }

  const evaluation = evaluateAIDataDiscovery(normalized)
  const now = nowISO()
  const recordId = uid()

  // 1) Emite finding-uri (createFinding genereaza id real + event finding.created)
  const linkedFindingIds: string[] = []
  for (const findingInput of evaluation.findings) {
    const created = await createFinding(orgId, findingInput, actor)
    linkedFindingIds.push(created.id)
  }

  // 2) Persist record + event ai-discovery.created
  let persisted: AIDataMapRecord | null = null
  await mutateFreshStateForOrg(orgId, (state) => {
    const record = buildAIDataMapRecord({
      intake: normalized,
      orgId,
      evaluation: { riskCandidate: evaluation.riskCandidate, reasons: evaluation.reasons },
      recordId,
      linkedFindingIds,
      nowISO: now,
      status: "active",
    })
    persisted = record

    const event = createComplianceEvent(
      {
        type: "ai-discovery.record.created",
        entityType: "system",
        entityId: record.id,
        message: `AI Data Map record creat: "${record.toolName}" (${record.vendor || "vendor neconfirmat"}) · risc ${record.riskCandidate}`,
        createdAtISO: now,
        metadata: {
          toolName: record.toolName,
          vendor: record.vendor,
          useCaseCategory: record.useCaseCategory,
          riskCandidate: record.riskCandidate,
          findingsEmitted: linkedFindingIds.length,
        },
      },
      actor,
    )

    return {
      ...state,
      aiDataMapRecords: [record, ...(state.aiDataMapRecords ?? [])].slice(0, 200),
      events: appendComplianceEvents(state, [event]),
    }
  })

  if (!persisted) throw new Error("createAIDataMapRecord: mutator did not produce a record")
  return { record: persisted, linkedFindingIds }
}

// ────────────────────────────────────────────────────────────────────────────
//   Update — patch + re-evaluate risc daca a schimbat input
// ────────────────────────────────────────────────────────────────────────────

export async function updateAIDataMapRecord(
  orgId: string,
  id: string,
  patch: UpdateAIDataMapPatch,
  actor: ComplianceEventActorInput,
): Promise<AIDataMapRecord | null> {
  let updated: AIDataMapRecord | null = null
  let notFound = false

  await mutateFreshStateForOrg(orgId, (state) => {
    const records = (state.aiDataMapRecords ?? []) as AIDataMapRecord[]
    const idx = records.findIndex((r) => r.id === id)
    if (idx === -1) {
      notFound = true
      return state
    }
    const current = records[idx]
    if (!current) {
      notFound = true
      return state
    }
    const now = nowISO()

    // Build new intake from current + patch
    const newIntake: AIDataDiscoveryIntake = {
      toolName: patch.toolName?.trim() || current.toolName,
      vendor: patch.vendor?.trim() ?? current.vendor,
      deploymentMode: isAIDeploymentMode(patch.deploymentMode)
        ? patch.deploymentMode
        : current.deploymentMode,
      useCaseCategory: isAIUseCaseCategory(patch.useCaseCategory)
        ? patch.useCaseCategory
        : current.useCaseCategory,
      useCaseDescription: patch.useCaseDescription?.trim() ?? current.useCaseDescription,
      inputDataCategories:
        patch.inputDataCategories !== undefined
          ? normalizeStringArray(patch.inputDataCategories)
          : current.inputDataCategories,
      outputDataCategories:
        patch.outputDataCategories !== undefined
          ? normalizeStringArray(patch.outputDataCategories)
          : current.outputDataCategories,
      processesPersonalData:
        typeof patch.processesPersonalData === "boolean"
          ? patch.processesPersonalData
          : current.processesPersonalData,
      processesSpecialCategories:
        typeof patch.processesSpecialCategories === "boolean"
          ? patch.processesSpecialCategories
          : current.processesSpecialCategories,
      childrenData:
        typeof patch.childrenData === "boolean" ? patch.childrenData : current.childrenData,
      vendorRegion: isAIVendorRegion(patch.vendorRegion) ? patch.vendorRegion : current.vendorRegion,
      trainingDataUsage: isAITrainingDataUsage(patch.trainingDataUsage)
        ? patch.trainingDataUsage
        : current.trainingDataUsage,
      dpaSigned:
        typeof patch.dpaSigned === "boolean" ? patch.dpaSigned : current.dpaSigned,
      dpaUrl: patch.dpaUrl?.trim() ?? current.dpaUrl,
      subprocessorsDocumented:
        typeof patch.subprocessorsDocumented === "boolean"
          ? patch.subprocessorsDocumented
          : current.subprocessorsDocumented,
      linkedAISystemId: patch.linkedAISystemId?.trim() ?? current.linkedAISystemId,
      notes: patch.notes?.trim() ?? current.notes,
    }

    // Re-evaluate risc
    const evaluation = evaluateAIDataDiscovery(newIntake)
    const newStatus: AIDataMapStatus = isAIDataMapStatus(patch.status) ? patch.status : current.status

    const next: AIDataMapRecord = {
      ...current,
      toolName: newIntake.toolName,
      vendor: newIntake.vendor,
      deploymentMode: newIntake.deploymentMode,
      useCaseCategory: newIntake.useCaseCategory,
      useCaseDescription: newIntake.useCaseDescription,
      inputDataCategories: newIntake.inputDataCategories,
      outputDataCategories: newIntake.outputDataCategories,
      processesPersonalData: newIntake.processesPersonalData,
      processesSpecialCategories: newIntake.processesSpecialCategories,
      childrenData: newIntake.childrenData,
      vendorRegion: newIntake.vendorRegion,
      trainingDataUsage: newIntake.trainingDataUsage,
      dpaSigned: newIntake.dpaSigned,
      dpaUrl: newIntake.dpaUrl,
      subprocessorsDocumented: newIntake.subprocessorsDocumented,
      linkedAISystemId: newIntake.linkedAISystemId,
      notes: newIntake.notes,
      riskCandidate: evaluation.riskCandidate,
      reasons: evaluation.reasons,
      status: newStatus,
      updatedAtISO: now,
    }
    updated = next
    const nextRecords = [...records]
    nextRecords[idx] = next

    const event = createComplianceEvent(
      {
        type: "ai-discovery.record.updated",
        entityType: "system",
        entityId: id,
        message: `AI Data Map record updated: "${next.toolName}" · risc ${next.riskCandidate}`,
        createdAtISO: now,
        metadata: {
          riskCandidate: next.riskCandidate,
          status: next.status,
        },
      },
      actor,
    )

    return {
      ...state,
      aiDataMapRecords: nextRecords,
      events: appendComplianceEvents(state, [event]),
    }
  })

  if (notFound) return null
  return updated
}

// ────────────────────────────────────────────────────────────────────────────
//   Delete
// ────────────────────────────────────────────────────────────────────────────

export async function deleteAIDataMapRecord(
  orgId: string,
  id: string,
  actor: ComplianceEventActorInput,
): Promise<boolean> {
  let deleted = false
  await mutateFreshStateForOrg(orgId, (state) => {
    const records = (state.aiDataMapRecords ?? []) as AIDataMapRecord[]
    const idx = records.findIndex((r) => r.id === id)
    if (idx === -1) return state
    const current = records[idx]
    if (!current) return state
    const nextRecords = records.filter((r) => r.id !== id)
    deleted = true

    const event = createComplianceEvent(
      {
        type: "ai-discovery.record.deleted",
        entityType: "system",
        entityId: id,
        message: `AI Data Map record sters: "${current.toolName}"`,
        createdAtISO: nowISO(),
      },
      actor,
    )

    return {
      ...state,
      aiDataMapRecords: nextRecords,
      events: appendComplianceEvents(state, [event]),
    }
  })
  return deleted
}

// ────────────────────────────────────────────────────────────────────────────
//   Follow-up notes — append text + event
// ────────────────────────────────────────────────────────────────────────────

export async function addFollowUpNote(
  orgId: string,
  id: string,
  note: string,
  actor: ComplianceEventActorInput,
): Promise<AIDataMapRecord | null> {
  const trimmed = note?.trim()
  if (!trimmed) throw new Error("Follow-up note required")

  let updated: AIDataMapRecord | null = null
  let notFound = false

  await mutateFreshStateForOrg(orgId, (state) => {
    const records = (state.aiDataMapRecords ?? []) as AIDataMapRecord[]
    const idx = records.findIndex((r) => r.id === id)
    if (idx === -1) {
      notFound = true
      return state
    }
    const current = records[idx]
    if (!current) {
      notFound = true
      return state
    }
    const now = nowISO()
    const dateLabel = now.slice(0, 10)
    const noteLine = `[${dateLabel} · ${actor.label}] ${trimmed}`
    const nextNotes = current.notes ? `${current.notes}\n\n${noteLine}` : noteLine

    const next: AIDataMapRecord = {
      ...current,
      notes: nextNotes,
      updatedAtISO: now,
    }
    updated = next
    const nextRecords = [...records]
    nextRecords[idx] = next

    const event = createComplianceEvent(
      {
        type: "ai-discovery.followup.added",
        entityType: "system",
        entityId: id,
        message: `Follow-up adaugat la "${current.toolName}": ${trimmed.slice(0, 120)}`,
        createdAtISO: now,
      },
      actor,
    )

    return {
      ...state,
      aiDataMapRecords: nextRecords,
      events: appendComplianceEvents(state, [event]),
    }
  })

  if (notFound) return null
  return updated
}

// ────────────────────────────────────────────────────────────────────────────
//   Exposure Report — agregare + persist + event
// ────────────────────────────────────────────────────────────────────────────

export async function generateAIExposureReport(
  orgId: string,
  actor: ComplianceEventActorInput,
): Promise<AIExposureReport> {
  const ctx = await getOrgContext()
  const orgName = ctx.orgName ?? "Organizația"

  let produced: AIExposureReport | null = null
  await mutateFreshStateForOrg(orgId, (state) => {
    const now = nowISO()
    const records = (state.aiDataMapRecords ?? []) as AIDataMapRecord[]
    const report = buildAIExposureReport({
      orgId,
      orgName,
      records,
      findings: state.findings ?? [],
      generatedAtISO: now,
      reportId: reportUid(),
    })
    produced = report

    const event = createComplianceEvent(
      {
        type: "ai-discovery.report.generated",
        entityType: "system",
        entityId: report.id,
        message: `AI Exposure Report generat: ${report.scope.aiToolCount} tool-uri, ${report.scope.personalDataToolCount} cu date personale, ${report.scope.highRiskCandidateCount} high-risk`,
        createdAtISO: now,
        metadata: {
          aiToolCount: report.scope.aiToolCount,
          personalDataToolCount: report.scope.personalDataToolCount,
          highRiskCandidateCount: report.scope.highRiskCandidateCount,
          prohibitedCandidateCount: report.scope.prohibitedCandidateCount,
        },
      },
      actor,
    )

    return {
      ...state,
      aiExposureReports: [report, ...(state.aiExposureReports ?? [])].slice(0, 20),
      events: appendComplianceEvents(state, [event]),
    }
  })

  if (!produced) throw new Error("generateAIExposureReport: mutator did not produce a report")
  return produced
}

export async function readAIExposureReports(_orgId?: string): Promise<AIExposureReport[]> {
  const state = await readState()
  return (state.aiExposureReports ?? []) as AIExposureReport[]
}
