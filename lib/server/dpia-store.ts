/**
 * Sprint 008C — DPIA store (CRUD + screening helpers peste
 * `state.dpiaRecords[]` + ledger evenimente + finding emission optional).
 *
 * Pattern: foloseste `mutateFreshStateForOrg` din `lib/server/store.ts`
 * pentru audit-trail hash-chain consistent cu findings-store.
 *
 * Surface API:
 *  - readDpiaRecords(orgId)
 *  - createDpiaFromScreening(orgId, input, actor, options?)
 *  - createDpiaRecord(orgId, input, actor)
 *  - updateDpiaRecord(orgId, id, patch, actor)
 *  - deleteDpiaRecord(orgId, id, actor)
 *  - markExported(orgId, id, actor)
 *  - buildDpiaMarkdownForRecord(record, orgName)
 *
 * Cand un screening rezulta in `requiresFullDpia=true` si caller-ul transmite
 * `acceptFinding=true`, store-ul apeleaza `createFinding()` din
 * findings-store si salveaza finding-id-ul pe record (linkedFindingId).
 */

import {
  appendComplianceEvents,
  createComplianceEvent,
  type ComplianceEventActorInput,
} from "@/lib/compliance/events"
import { mutateFreshStateForOrg, readState } from "@/lib/server/store"
import { createFinding } from "@/lib/server/findings-store"
import {
  DPIA_SCHEMA_V1,
  evaluateDpiaScreening,
  type DpiaScreeningEvaluation,
  type DpiaScreeningInput,
} from "@/lib/compliance/dpia-schema"
import type {
  DpiaRecord,
  DpiaRecordStatus,
  DpiaRiskLevel,
} from "@/lib/compliance/types"

// ── Types ────────────────────────────────────────────────────────────────────

export type DpiaSummary = {
  total: number
  open: number
  approved: number
  completed: number
  highResidual: number
  withLinkedFinding: number
}

/**
 * Input shape pentru CRUD DPIA. Camp-urile list (dataCategories, risks etc.)
 * accepta string sau string[] — `splitList()` le normalizeaza intern (CSV/newline
 * separated). Camp-urile date acepta `null` ca sentinel de stergere.
 */
export type CreateDpiaRecordInput = {
  title: string
  processingPurpose?: string
  processingDescription?: string
  dataCategories?: string | string[]
  dataSubjects?: string | string[]
  legalBasis?: string
  specialCategories?: boolean
  automatedDecisionMaking?: boolean
  largeScaleProcessing?: boolean
  linkedRopaDocumentId?: string
  linkedRopaEntryLabel?: string
  necessityAssessment?: string
  proportionalityAssessment?: string
  risks?: string | string[]
  mitigationMeasures?: string | string[]
  residualRisk?: DpiaRiskLevel
  status?: DpiaRecordStatus
  owner?: string
  dueAtISO?: string
  evidenceNote?: string
  evidenceFileName?: string
}

export type UpdateDpiaRecordPatch = {
  id?: string
  title?: string
  processingPurpose?: string
  processingDescription?: string
  dataCategories?: string | string[] | null
  dataSubjects?: string | string[] | null
  legalBasis?: string
  specialCategories?: boolean
  automatedDecisionMaking?: boolean
  largeScaleProcessing?: boolean
  linkedRopaDocumentId?: string | null
  linkedRopaEntryLabel?: string | null
  necessityAssessment?: string
  proportionalityAssessment?: string
  risks?: string | string[] | null
  mitigationMeasures?: string | string[] | null
  residualRisk?: DpiaRiskLevel
  status?: DpiaRecordStatus
  owner?: string
  dueAtISO?: string | null
  approvedBy?: string
  evidenceNote?: string | null
  evidenceFileName?: string | null
}

export type DpiaRecordWithLink = DpiaRecord & {
  linkedFindingId?: string
  screeningSchemaVersion?: string
  screeningRiskScore?: number
  screeningRiskLevel?: DpiaRiskLevel
  screeningReasons?: string[]
  screeningMissingEvidence?: string[]
  screeningGeneratedMarkdown?: string
}

const STATUSES: DpiaRecordStatus[] = [
  "draft",
  "in_review",
  "approved",
  "mitigations_in_progress",
  "completed",
  "archived",
]

const RISK_LEVELS: DpiaRiskLevel[] = ["low", "medium", "high", "critical"]

// ── Helpers ──────────────────────────────────────────────────────────────────

function nowISO(): string {
  return new Date().toISOString()
}

function uid(): string {
  return `dpia-${Math.random().toString(36).slice(2, 10)}`
}

function splitList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean)
  }
  if (typeof value !== "string") return []
  return value
    .split(/\r?\n|[,;]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function isIsoLike(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value))
}

function normalizeStatus(value: unknown, fallback: DpiaRecordStatus): DpiaRecordStatus {
  return STATUSES.includes(value as DpiaRecordStatus)
    ? (value as DpiaRecordStatus)
    : fallback
}

function normalizeRisk(value: unknown, fallback: DpiaRiskLevel = "medium"): DpiaRiskLevel {
  return RISK_LEVELS.includes(value as DpiaRiskLevel)
    ? (value as DpiaRiskLevel)
    : fallback
}

export function summarizeDpiaRecords(records: DpiaRecordWithLink[]): DpiaSummary {
  const open = records.filter(
    (record) => !["completed", "archived"].includes(record.status),
  ).length
  const approved = records.filter(
    (record) => record.status === "approved" || record.status === "completed",
  ).length
  const completed = records.filter((record) => record.status === "completed").length
  const highResidual = records.filter(
    (record) => record.residualRisk === "high" || record.residualRisk === "critical",
  ).length
  const withLinkedFinding = records.filter(
    (record) => typeof record.linkedFindingId === "string" && record.linkedFindingId.length > 0,
  ).length
  return { total: records.length, open, approved, completed, highResidual, withLinkedFinding }
}

// ── Read ─────────────────────────────────────────────────────────────────────

export async function readDpiaRecords(_orgId?: string): Promise<{
  records: DpiaRecordWithLink[]
  summary: DpiaSummary
}> {
  const state = await readState()
  const records = (state.dpiaRecords ?? []) as DpiaRecordWithLink[]
  return { records, summary: summarizeDpiaRecords(records) }
}

export async function getDpiaRecordById(
  _orgId: string,
  id: string,
): Promise<DpiaRecordWithLink | null> {
  const state = await readState()
  const records = (state.dpiaRecords ?? []) as DpiaRecordWithLink[]
  return records.find((record) => record.id === id) ?? null
}

// ── Screening helpers ────────────────────────────────────────────────────────

export function evaluateScreening(input: DpiaScreeningInput): DpiaScreeningEvaluation {
  return evaluateDpiaScreening(input)
}

export function getDpiaSchema() {
  return DPIA_SCHEMA_V1
}

// ── Create from screening ───────────────────────────────────────────────────

export type CreateDpiaFromScreeningOptions = {
  acceptFinding?: boolean
  owner?: string
  dueAtISO?: string
}

export async function createDpiaFromScreening(
  orgId: string,
  input: DpiaScreeningInput,
  actor: ComplianceEventActorInput,
  options: CreateDpiaFromScreeningOptions = {},
): Promise<{
  record: DpiaRecordWithLink
  evaluation: DpiaScreeningEvaluation
  linkedFindingId?: string
}> {
  const evaluation = evaluateDpiaScreening(input)
  const screeningRiskLevel = evaluation.riskLevel
  const now = nowISO()

  // 1) Daca acceptFinding=true + requiresFullDpia=true, cream finding-ul
  //    inainte de scrierea record-ului ca sa il legam prin linkedFindingId.
  let linkedFindingId: string | undefined
  if (options.acceptFinding && evaluation.requiresFullDpia && evaluation.candidateFinding) {
    const finding = await createFinding(
      orgId,
      {
        title: evaluation.candidateFinding.title,
        detail: evaluation.candidateFinding.detail,
        category: "GDPR",
        severity: evaluation.candidateFinding.severity,
        legalReference: evaluation.candidateFinding.legalReference,
        remediationHint: evaluation.candidateFinding.remediationHint,
        impactSummary: evaluation.candidateFinding.impactSummary,
        evidenceRequired: evaluation.candidateFinding.evidenceRequired,
        ownerSuggestion: "DPO",
        closeCondition: evaluation.candidateFinding.resolution?.closureEvidence,
      },
      actor,
    )
    linkedFindingId = finding.id
  }

  // 2) Scriem record-ul DPIA cu metadata screening completa.
  let created: DpiaRecordWithLink | null = null
  await mutateFreshStateForOrg(orgId, (state) => {
    const record: DpiaRecordWithLink = {
      id: uid(),
      title: input.processName.trim() || "DPIA fără titlu",
      processingPurpose: input.description?.trim() || "Scop de prelucrare de completat.",
      processingDescription:
        input.description?.trim() ||
        `Screening DPIA ${evaluation.schemaVersion} — ${evaluation.processName}`,
      dataCategories: [],
      dataSubjects: [],
      legalBasis: "GDPR Art. 6 / Art. 9 — de validat",
      specialCategories: Boolean(input.answers.specialCategories),
      automatedDecisionMaking: Boolean(input.answers.automatedDecision),
      largeScaleProcessing: Boolean(input.answers.largeScale),
      necessityAssessment: "De completat la DPIA completa.",
      proportionalityAssessment: "De completat la DPIA completa.",
      risks: evaluation.reasons,
      mitigationMeasures: evaluation.recommendedMeasures,
      residualRisk: normalizeRisk(screeningRiskLevel, "medium"),
      status: evaluation.requiresFullDpia ? "in_review" : "draft",
      owner: options.owner?.trim() || actor.label,
      dueAtISO: options.dueAtISO,
      createdAtISO: now,
      updatedAtISO: now,
      linkedFindingId,
      screeningSchemaVersion: evaluation.schemaVersion,
      screeningRiskScore: evaluation.riskScore,
      screeningRiskLevel: screeningRiskLevel,
      screeningReasons: evaluation.reasons,
      screeningMissingEvidence: evaluation.missingEvidence,
      screeningGeneratedMarkdown: evaluation.generatedMarkdown,
    }
    created = record

    const events = [
      createComplianceEvent(
        {
          type: "dpia.screening.completed",
          entityType: "system",
          entityId: record.id,
          message: `Screening DPIA pentru „${record.title}" — risc ${evaluation.riskScore}/100 (${screeningRiskLevel})`,
          createdAtISO: now,
          metadata: {
            riskScore: evaluation.riskScore,
            riskLevel: screeningRiskLevel,
            requiresFullDpia: evaluation.requiresFullDpia,
            schemaVersion: evaluation.schemaVersion,
          },
        },
        actor,
      ),
    ]
    if (linkedFindingId) {
      events.push(
        createComplianceEvent(
          {
            type: "dpia.finding.accepted",
            entityType: "system",
            entityId: record.id,
            message: `Finding GDPR generat din screening DPIA: ${linkedFindingId}`,
            createdAtISO: now,
            metadata: { findingId: linkedFindingId, severity: evaluation.candidateFinding?.severity ?? "high" },
          },
          actor,
        ),
      )
    }

    return {
      ...state,
      dpiaRecords: [record, ...(state.dpiaRecords ?? [])].slice(0, 100) as DpiaRecord[],
      events: appendComplianceEvents(state, events),
    }
  })

  if (!created) throw new Error("createDpiaFromScreening: mutator did not produce a record")
  return { record: created, evaluation, linkedFindingId }
}

// ── Create plain ─────────────────────────────────────────────────────────────

export async function createDpiaRecord(
  orgId: string,
  input: CreateDpiaRecordInput,
  actor: ComplianceEventActorInput,
): Promise<DpiaRecordWithLink> {
  const title = input.title?.trim()
  if (!title) throw new Error("DPIA title required")

  let created: DpiaRecordWithLink | null = null
  const now = nowISO()

  await mutateFreshStateForOrg(orgId, (state) => {
    const record: DpiaRecordWithLink = {
      id: uid(),
      title,
      processingPurpose:
        typeof input.processingPurpose === "string" && input.processingPurpose.trim()
          ? input.processingPurpose.trim()
          : "Scop de prelucrare de completat.",
      processingDescription:
        typeof input.processingDescription === "string" && input.processingDescription.trim()
          ? input.processingDescription.trim()
          : "Descriere operațiune / sistem / flux de date.",
      dataCategories: splitList(input.dataCategories),
      dataSubjects: splitList(input.dataSubjects),
      legalBasis:
        typeof input.legalBasis === "string" && input.legalBasis.trim()
          ? input.legalBasis.trim()
          : "GDPR Art. 6 / Art. 9 — de validat",
      specialCategories: Boolean(input.specialCategories),
      automatedDecisionMaking: Boolean(input.automatedDecisionMaking),
      largeScaleProcessing: Boolean(input.largeScaleProcessing),
      linkedRopaDocumentId:
        typeof input.linkedRopaDocumentId === "string" && input.linkedRopaDocumentId.trim()
          ? input.linkedRopaDocumentId.trim()
          : undefined,
      linkedRopaEntryLabel:
        typeof input.linkedRopaEntryLabel === "string" && input.linkedRopaEntryLabel.trim()
          ? input.linkedRopaEntryLabel.trim()
          : undefined,
      necessityAssessment:
        typeof input.necessityAssessment === "string" && input.necessityAssessment.trim()
          ? input.necessityAssessment.trim()
          : "De completat: de ce este necesară prelucrarea.",
      proportionalityAssessment:
        typeof input.proportionalityAssessment === "string" && input.proportionalityAssessment.trim()
          ? input.proportionalityAssessment.trim()
          : "De completat: de ce volumul/categoriile de date sunt proporționale cu scopul.",
      risks: splitList(input.risks),
      mitigationMeasures: splitList(input.mitigationMeasures),
      residualRisk: normalizeRisk(input.residualRisk),
      status: normalizeStatus(input.status, "draft"),
      owner: typeof input.owner === "string" && input.owner.trim() ? input.owner.trim() : actor.label,
      dueAtISO: isIsoLike(input.dueAtISO) ? input.dueAtISO : undefined,
      evidenceNote:
        typeof input.evidenceNote === "string" && input.evidenceNote.trim()
          ? input.evidenceNote.trim()
          : undefined,
      evidenceFileName:
        typeof input.evidenceFileName === "string" && input.evidenceFileName.trim()
          ? input.evidenceFileName.trim()
          : undefined,
      createdAtISO: now,
      updatedAtISO: now,
    }
    created = record

    return {
      ...state,
      dpiaRecords: [record, ...(state.dpiaRecords ?? [])].slice(0, 100) as DpiaRecord[],
      events: appendComplianceEvents(state, [
        createComplianceEvent(
          {
            type: "dpia.created",
            entityType: "system",
            entityId: record.id,
            message: `DPIA creată: ${record.title} · risc rezidual ${record.residualRisk}`,
            createdAtISO: now,
            metadata: {
              status: record.status,
              residualRisk: record.residualRisk,
              specialCategories: record.specialCategories,
            },
          },
          actor,
        ),
      ]),
    }
  })

  if (!created) throw new Error("createDpiaRecord: mutator did not produce a record")
  return created
}

// ── Update ───────────────────────────────────────────────────────────────────

export async function updateDpiaRecord(
  orgId: string,
  id: string,
  patch: UpdateDpiaRecordPatch,
  actor: ComplianceEventActorInput,
): Promise<DpiaRecordWithLink | null> {
  let updated: DpiaRecordWithLink | null = null
  let notFound = false

  await mutateFreshStateForOrg(orgId, (state) => {
    const records = (state.dpiaRecords ?? []) as DpiaRecordWithLink[]
    const idx = records.findIndex((record) => record.id === id)
    if (idx === -1) {
      notFound = true
      return state
    }

    const current = records[idx]
    const now = nowISO()
    const status = normalizeStatus(patch.status, current.status)

    const next: DpiaRecordWithLink = {
      ...current,
      title: typeof patch.title === "string" && patch.title.trim() ? patch.title.trim() : current.title,
      processingPurpose:
        typeof patch.processingPurpose === "string" && patch.processingPurpose.trim()
          ? patch.processingPurpose.trim()
          : current.processingPurpose,
      processingDescription:
        typeof patch.processingDescription === "string" && patch.processingDescription.trim()
          ? patch.processingDescription.trim()
          : current.processingDescription,
      dataCategories: patch.dataCategories === undefined ? current.dataCategories : splitList(patch.dataCategories),
      dataSubjects: patch.dataSubjects === undefined ? current.dataSubjects : splitList(patch.dataSubjects),
      legalBasis:
        typeof patch.legalBasis === "string" && patch.legalBasis.trim()
          ? patch.legalBasis.trim()
          : current.legalBasis,
      specialCategories:
        patch.specialCategories === undefined ? current.specialCategories : Boolean(patch.specialCategories),
      automatedDecisionMaking:
        patch.automatedDecisionMaking === undefined
          ? current.automatedDecisionMaking
          : Boolean(patch.automatedDecisionMaking),
      largeScaleProcessing:
        patch.largeScaleProcessing === undefined
          ? current.largeScaleProcessing
          : Boolean(patch.largeScaleProcessing),
      linkedRopaDocumentId:
        patch.linkedRopaDocumentId === null
          ? undefined
          : typeof patch.linkedRopaDocumentId === "string" && patch.linkedRopaDocumentId.trim()
            ? patch.linkedRopaDocumentId.trim()
            : current.linkedRopaDocumentId,
      linkedRopaEntryLabel:
        patch.linkedRopaEntryLabel === null
          ? undefined
          : typeof patch.linkedRopaEntryLabel === "string" && patch.linkedRopaEntryLabel.trim()
            ? patch.linkedRopaEntryLabel.trim()
            : current.linkedRopaEntryLabel,
      necessityAssessment:
        typeof patch.necessityAssessment === "string" && patch.necessityAssessment.trim()
          ? patch.necessityAssessment.trim()
          : current.necessityAssessment,
      proportionalityAssessment:
        typeof patch.proportionalityAssessment === "string" && patch.proportionalityAssessment.trim()
          ? patch.proportionalityAssessment.trim()
          : current.proportionalityAssessment,
      risks: patch.risks === undefined ? current.risks : splitList(patch.risks),
      mitigationMeasures:
        patch.mitigationMeasures === undefined
          ? current.mitigationMeasures
          : splitList(patch.mitigationMeasures),
      residualRisk: patch.residualRisk === undefined ? current.residualRisk : normalizeRisk(patch.residualRisk),
      status,
      owner: typeof patch.owner === "string" && patch.owner.trim() ? patch.owner.trim() : current.owner,
      dueAtISO:
        patch.dueAtISO === null ? undefined : isIsoLike(patch.dueAtISO) ? patch.dueAtISO : current.dueAtISO,
      reviewedAtISO:
        status === "in_review" || status === "approved" || status === "completed"
          ? current.reviewedAtISO ?? now
          : current.reviewedAtISO,
      approvedAtISO:
        status === "approved" || status === "completed"
          ? current.approvedAtISO ?? now
          : current.approvedAtISO,
      approvedBy:
        status === "approved" || status === "completed"
          ? typeof patch.approvedBy === "string" && patch.approvedBy.trim()
            ? patch.approvedBy.trim()
            : current.approvedBy ?? actor.label
          : current.approvedBy,
      evidenceNote:
        typeof patch.evidenceNote === "string"
          ? patch.evidenceNote.trim() || undefined
          : current.evidenceNote,
      evidenceFileName:
        typeof patch.evidenceFileName === "string"
          ? patch.evidenceFileName.trim() || undefined
          : current.evidenceFileName,
      updatedAtISO: now,
    }
    updated = next

    const nextRecords = [...records]
    nextRecords[idx] = next

    return {
      ...state,
      dpiaRecords: nextRecords as DpiaRecord[],
      events: appendComplianceEvents(state, [
        createComplianceEvent(
          {
            type: "dpia.updated",
            entityType: "system",
            entityId: next.id,
            message: `DPIA actualizată: ${next.title} · ${next.status}`,
            createdAtISO: now,
            metadata: {
              status: next.status,
              residualRisk: next.residualRisk,
              evidenceAttached: Boolean(next.evidenceNote || next.evidenceFileName),
            },
          },
          actor,
        ),
      ]),
    }
  })

  if (notFound) return null
  return updated
}

// ── Delete ───────────────────────────────────────────────────────────────────

export async function deleteDpiaRecord(
  orgId: string,
  id: string,
  actor: ComplianceEventActorInput,
): Promise<boolean> {
  let removed = false
  await mutateFreshStateForOrg(orgId, (state) => {
    const records = (state.dpiaRecords ?? []) as DpiaRecordWithLink[]
    const target = records.find((record) => record.id === id)
    if (!target) return state
    removed = true

    return {
      ...state,
      dpiaRecords: records.filter((record) => record.id !== id) as DpiaRecord[],
      events: appendComplianceEvents(state, [
        createComplianceEvent(
          {
            type: "dpia.deleted",
            entityType: "system",
            entityId: id,
            message: `DPIA ștearsă: ${target.title}`,
            createdAtISO: nowISO(),
            metadata: { status: target.status, residualRisk: target.residualRisk },
          },
          actor,
        ),
      ]),
    }
  })
  return removed
}

// ── Mark exported (for export route) ─────────────────────────────────────────

export async function markDpiaExported(
  orgId: string,
  id: string,
  actor: ComplianceEventActorInput,
): Promise<DpiaRecordWithLink | null> {
  let updated: DpiaRecordWithLink | null = null
  let notFound = false

  await mutateFreshStateForOrg(orgId, (state) => {
    const records = (state.dpiaRecords ?? []) as DpiaRecordWithLink[]
    const idx = records.findIndex((record) => record.id === id)
    if (idx === -1) {
      notFound = true
      return state
    }
    const now = nowISO()
    const next: DpiaRecordWithLink = { ...records[idx], exportedAtISO: now, updatedAtISO: now }
    updated = next
    const newRecords = [...records]
    newRecords[idx] = next
    return {
      ...state,
      dpiaRecords: newRecords as DpiaRecord[],
      events: appendComplianceEvents(state, [
        createComplianceEvent(
          {
            type: "dpia.exported",
            entityType: "system",
            entityId: id,
            message: `DPIA exportată: ${next.title}`,
            createdAtISO: now,
            metadata: { status: next.status, residualRisk: next.residualRisk },
          },
          actor,
        ),
      ]),
    }
  })

  if (notFound) return null
  return updated
}

// ── Markdown export ──────────────────────────────────────────────────────────

export function buildDpiaMarkdownForRecord(record: DpiaRecordWithLink, orgName: string): string {
  function list(items: string[], empty: string) {
    return items.length > 0 ? items.map((item) => `- ${item}`).join("\n") : `- ${empty}`
  }
  function bool(value: boolean) {
    return value ? "Da" : "Nu"
  }
  const lines: (string | null)[] = [
    `# DPIA — ${record.title}`,
    "",
    `**Organizație:** ${orgName || "—"}`,
    `**Status:** ${record.status}`,
    `**Risc rezidual:** ${record.residualRisk}`,
    `**Owner:** ${record.owner}`,
    record.dueAtISO ? `**Termen:** ${new Date(record.dueAtISO).toLocaleDateString("ro-RO")}` : null,
    record.approvedAtISO ? `**Aprobat la:** ${new Date(record.approvedAtISO).toLocaleString("ro-RO")}` : null,
    record.approvedBy ? `**Aprobat de:** ${record.approvedBy}` : null,
    record.linkedFindingId ? `**Finding asociat:** ${record.linkedFindingId}` : null,
    "",
    "## 1. Descrierea prelucrării",
    record.processingDescription,
    "",
    "## 2. Scop și temei legal",
    `**Scop:** ${record.processingPurpose}`,
    `**Temei legal:** ${record.legalBasis}`,
    "",
    "## 3. Categorii de date și persoane vizate",
    "**Categorii date:**",
    list(record.dataCategories, "De completat"),
    "",
    "**Persoane vizate:**",
    list(record.dataSubjects, "De completat"),
    "",
    "## 4. Factori DPIA",
    `- Categorii speciale de date: ${bool(record.specialCategories)}`,
    `- Decizie automată / profiling: ${bool(record.automatedDecisionMaking)}`,
    `- Prelucrare la scară largă: ${bool(record.largeScaleProcessing)}`,
    record.linkedRopaEntryLabel
      ? `- Legătură RoPA: ${record.linkedRopaEntryLabel}`
      : "- Legătură RoPA: de completat",
    "",
    "## 5. Necesitate și proporționalitate",
    `**Necesitate:** ${record.necessityAssessment}`,
    "",
    `**Proporționalitate:** ${record.proportionalityAssessment}`,
    "",
    "## 6. Riscuri pentru drepturile persoanelor",
    list(record.risks, "Nu există riscuri documentate încă"),
    "",
    "## 7. Măsuri de mitigare",
    list(record.mitigationMeasures, "Nu există măsuri documentate încă"),
    "",
    "## 8. Dovadă și decizie",
    record.evidenceNote ? record.evidenceNote : "Dovada implementării măsurilor trebuie atașată în Dosar.",
    record.evidenceFileName ? `\n\nFișier dovadă: ${record.evidenceFileName}` : "",
    "",
    record.screeningGeneratedMarkdown ? "## 9. Screening Art. 35 (extras)" : null,
    record.screeningGeneratedMarkdown
      ? record.screeningGeneratedMarkdown.replace(/^# DPIA Screening — .*/, "").trim()
      : null,
    "",
    "## Checklist final",
    `- [${record.linkedRopaEntryLabel || record.linkedRopaDocumentId ? "x" : " "}] RoPA actualizat / legat`,
    `- [${record.mitigationMeasures.length > 0 ? "x" : " "}] Măsuri de mitigare documentate`,
    `- [${record.evidenceNote || record.evidenceFileName ? "x" : " "}] Dovadă atașată`,
    `- [${record.status === "approved" || record.status === "completed" ? "x" : " "}] Revizie DPO aprobată`,
    "",
    "> Document de lucru pregătit pentru revizia consultantului DPO. Nu reprezintă opinie juridică finală fără validare profesională.",
  ]
  return lines.filter((line): line is string => typeof line === "string").join("\n")
}
