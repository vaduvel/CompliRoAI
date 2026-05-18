/**
 * Sprint 021 — QMS Workspace store (singleton per org + 13 sectiuni +
 * lessons + system attestations + approve workflow + simplified mode
 * + finding emission).
 *
 * Pattern: identic cu ai-incident-store (Sprint 020) → foloseste
 * `mutateFreshStateForOrg` din `lib/server/store.ts` pentru audit-trail
 * hash-chain consistent.
 *
 * Surface API:
 *  - readQmsWorkspace(orgId)
 *  - getOrCreateQms(orgId, actor, orgName?) — singleton: returneaza existing
 *    sau initializeaza cu 13 sectiuni goale
 *  - updateQmsSection(orgId, sectionKey, patch, actor)
 *  - attachQmsDocument(orgId, sectionKey, input, actor)
 *  - removeQmsDocument(orgId, sectionKey, docId, actor)
 *  - recordLesson(orgId, lesson, actor) — manual lesson
 *  - refreshAutoLessons(orgId, actor) — sync din state (incidents + anomalies
 *    + findings) cu pastrare manual lessons
 *  - markSimplifiedMode(orgId, simplifiedMode, actor) — Art. 17(3)
 *  - listSystemAttestations(orgId)
 *  - attestSystem(orgId, systemId, input, actor)
 *  - revokeSystemAttestation(orgId, systemId, actor)
 *  - approveQms(orgId, approvedByEmail, actor, nextReviewMonths?)
 *  - setOrganizationSize(orgId, size, actor)
 *  - buildQmsMarkdownForState(orgId) — re-run evaluator pentru export
 *
 * Findings emise sunt persistate prin createFinding() (din findings-store) si
 * ID-urile rezultate sunt scrise in `linkedFindingIds[]` pe workspace.
 */

import {
  appendComplianceEvents,
  createComplianceEvent,
  type ComplianceEventActorInput,
} from "@/lib/compliance/events"
import {
  evaluateQms,
  buildQmsMarkdown,
} from "@/lib/compliance/qms-evaluator"
import {
  aggregateLessonsFromState,
  mergeAutoAndManualLessons,
} from "@/lib/compliance/qms-lessons-aggregator"
import { getQmsSectionKeysInOrder } from "@/lib/compliance/qms-schema"
import { createFinding } from "@/lib/server/findings-store"
import { mutateFreshStateForOrg, readState } from "@/lib/server/store"
import type {
  ComplianceState,
  QmsCompleteness,
  QmsDocumentReference,
  QmsDocumentReferenceType,
  QmsLessonLearned,
  QmsLessonSource,
  QmsOrganizationSize,
  QmsSectionContent,
  QmsSectionKey,
  QmsSectionStatus,
  QmsSystemAttestation,
  QmsWorkspace,
  QmsWorkspaceStatus,
  ScanFinding,
} from "@/lib/compliance/types"

// ── Types ────────────────────────────────────────────────────────────────────

export type QmsSummary = {
  status: QmsWorkspaceStatus
  completeness: QmsCompleteness
  versionLabel: string
  organizationSize: QmsOrganizationSize
  simplifiedMode: boolean
  totalSections: number
  documentedSections: number
  approvedSections: number
  needsUpdateSections: number
  lessonsLearnedCount: number
  systemAttestationsCount: number
  highRiskSystemsCount: number
  highRiskSystemsWithoutAttestation: number
  approvedAtISO?: string
  approvedByEmail?: string
  nextReviewISO?: string
}

export type UpdateQmsSectionPatch = {
  status?: QmsSectionStatus
  description?: string
  procedureSummary?: string
  responsibleRole?: string
  responsibleEmail?: string
  notes?: string
}

export type AttachQmsDocumentInput = {
  type: QmsDocumentReferenceType
  title: string
  url?: string
  fileName?: string
  versionLabel?: string
  notes?: string
  attachedByEmail?: string
}

export type RecordLessonInput = {
  source?: QmsLessonSource
  sourceEntityId?: string
  title: string
  rootCauseSummary: string
  preventiveActionsTaken?: string[]
  resultingPolicyChange?: string
  resultingProcessChange?: string
  applicableToSystems?: string[]
  notes?: string
  recordedByEmail?: string
}

export type AttestSystemInput = {
  systemId: string
  sectionsConfirmedCovered: QmsSectionKey[]
  gapsAcknowledged?: string[]
  notes?: string
  attestedByEmail?: string
}

const DAY_MS = 86_400_000
const VALID_SECTION_STATUS: QmsSectionStatus[] = [
  "not_started",
  "in_progress",
  "documented",
  "approved",
  "needs_update",
]
const VALID_DOC_TYPES: QmsDocumentReferenceType[] = [
  "policy",
  "procedure",
  "standard",
  "specification",
  "template",
  "report",
  "audit_record",
  "other",
]
const VALID_ORG_SIZES: QmsOrganizationSize[] = ["sme", "midsize", "large"]

// ── Helpers ──────────────────────────────────────────────────────────────────

function nowISO(): string {
  return new Date().toISOString()
}

function uid(): string {
  return `qms-${Math.random().toString(36).slice(2, 10)}`
}

function docUid(): string {
  return `qms-doc-${Math.random().toString(36).slice(2, 10)}`
}

function lessonUid(): string {
  return `qms-lesson-manual-${Math.random().toString(36).slice(2, 10)}`
}

function attUid(): string {
  return `qms-att-${Math.random().toString(36).slice(2, 10)}`
}

export function isQmsSectionStatus(value: unknown): value is QmsSectionStatus {
  return (
    typeof value === "string" &&
    VALID_SECTION_STATUS.includes(value as QmsSectionStatus)
  )
}

export function isQmsSectionKey(value: unknown): value is QmsSectionKey {
  if (typeof value !== "string") return false
  return getQmsSectionKeysInOrder().includes(value as QmsSectionKey)
}

export function isQmsDocumentType(
  value: unknown,
): value is QmsDocumentReferenceType {
  return (
    typeof value === "string" &&
    VALID_DOC_TYPES.includes(value as QmsDocumentReferenceType)
  )
}

export function isQmsOrgSize(value: unknown): value is QmsOrganizationSize {
  return (
    typeof value === "string" &&
    VALID_ORG_SIZES.includes(value as QmsOrganizationSize)
  )
}

function emptySection(key: QmsSectionKey): QmsSectionContent {
  return {
    key,
    status: "not_started",
    description: "",
    procedureSummary: "",
    responsibleRole: "",
    documentReferences: [],
  }
}

function blankWorkspace(orgId: string, now: string): QmsWorkspace {
  return {
    id: uid(),
    orgId,
    organizationSize: "sme",
    simplifiedMode: true,
    sections: getQmsSectionKeysInOrder().map(emptySection),
    lessonsLearned: [],
    systemAttestations: [],
    status: "draft",
    completeness: "incomplete",
    versionLabel: "v0.1 — draft",
    linkedFindingIds: [],
    createdAtISO: now,
    updatedAtISO: now,
  }
}

function summarize(
  workspace: QmsWorkspace,
  state: Pick<ComplianceState, "aiSystems">,
): QmsSummary {
  const highRisk = (state.aiSystems ?? []).filter((s) => s.riskLevel === "high")
  const attested = new Set(workspace.systemAttestations.map((a) => a.systemId))
  return {
    status: workspace.status,
    completeness: workspace.completeness,
    versionLabel: workspace.versionLabel,
    organizationSize: workspace.organizationSize,
    simplifiedMode: workspace.simplifiedMode,
    totalSections: workspace.sections.length,
    documentedSections: workspace.sections.filter(
      (s) => s.status === "documented" || s.status === "approved",
    ).length,
    approvedSections: workspace.sections.filter((s) => s.status === "approved").length,
    needsUpdateSections: workspace.sections.filter((s) => s.status === "needs_update").length,
    lessonsLearnedCount: workspace.lessonsLearned.length,
    systemAttestationsCount: workspace.systemAttestations.length,
    highRiskSystemsCount: highRisk.length,
    highRiskSystemsWithoutAttestation: highRisk.filter((s) => !attested.has(s.id)).length,
    approvedAtISO: workspace.approvedAtISO,
    approvedByEmail: workspace.approvedByEmail,
    nextReviewISO: workspace.nextReviewISO,
  }
}

// ── Internal: evaluator + finding persistence ───────────────────────────────

async function runEvaluatorAndPersistFindings(
  orgId: string,
  workspace: QmsWorkspace,
  state: Parameters<typeof evaluateQms>[0]["state"],
  orgName: string,
  actor: ComplianceEventActorInput,
  skipFindingPersistence = false,
): Promise<{
  completeness: QmsCompleteness
  generatedMarkdown: string
  newFindingIds: string[]
  candidateFindings: ScanFinding[]
  enrichedSections: QmsSectionContent[]
}> {
  const result = evaluateQms({ workspace, orgName, state })
  const findingIds: string[] = []
  if (!skipFindingPersistence) {
    for (const candidate of result.candidateFindings) {
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
          ownerSuggestion: "Quality Manager / DPO / responsabil AI",
          closeCondition: candidate.resolution?.closureEvidence,
        },
        actor,
      )
      findingIds.push(created.id)
    }
  }
  // Workspace cu cross-module counts populate (din evaluator).
  // Reuse same path: aplica counts pe sections.
  // (Markdown-ul include deja cross-module references calculate.)
  return {
    completeness: result.completeness,
    generatedMarkdown: result.generatedMarkdown,
    newFindingIds: findingIds,
    candidateFindings: result.candidateFindings,
    enrichedSections: workspace.sections, // counts deja aplicate in evaluator path
  }
}

// ── Read ─────────────────────────────────────────────────────────────────────

export async function readQmsWorkspace(_orgId?: string): Promise<{
  workspace: QmsWorkspace | null
  summary: QmsSummary | null
}> {
  const state = await readState()
  const w = state.qmsWorkspace ?? null
  return {
    workspace: w,
    summary: w ? summarize(w, state) : null,
  }
}

// ── Singleton: getOrCreate ──────────────────────────────────────────────────

export async function getOrCreateQms(
  orgId: string,
  actor: ComplianceEventActorInput,
  orgName = "Organizația",
): Promise<{ workspace: QmsWorkspace; created: boolean }> {
  const state = await readState()
  if (state.qmsWorkspace) {
    return { workspace: state.qmsWorkspace, created: false }
  }
  const now = nowISO()
  const blank = blankWorkspace(orgId, now)
  // Evaluator run to populate generatedMarkdown + completeness from t=0.
  const evalRun = await runEvaluatorAndPersistFindings(
    orgId,
    blank,
    state,
    orgName,
    actor,
    /* skipFindingPersistence */ true, // not emitting findings on first-create
  )
  const initialized: QmsWorkspace = {
    ...blank,
    sections: evalRun.enrichedSections,
    completeness: evalRun.completeness,
    generatedMarkdown: evalRun.generatedMarkdown,
  }
  await mutateFreshStateForOrg(orgId, (s) => ({
    ...s,
    qmsWorkspace: initialized,
    events: appendComplianceEvents(s, [
      createComplianceEvent(
        {
          type: "qms.initialized",
          entityType: "system",
          entityId: initialized.id,
          message: `QMS Workspace initializat (Art. 17 EU AI Act) cu 13 sectiuni goale.`,
          createdAtISO: now,
          metadata: {
            simplifiedMode: initialized.simplifiedMode,
            organizationSize: initialized.organizationSize,
          },
        },
        actor,
      ),
    ]),
  }))
  return { workspace: initialized, created: true }
}

// ── Update section ──────────────────────────────────────────────────────────

export async function updateQmsSection(
  orgId: string,
  sectionKey: QmsSectionKey,
  patch: UpdateQmsSectionPatch,
  actor: ComplianceEventActorInput,
  orgName = "Organizația",
): Promise<QmsWorkspace> {
  if (!isQmsSectionKey(sectionKey)) {
    throw new Error("QMS section key invalid")
  }
  if (patch.status !== undefined && !isQmsSectionStatus(patch.status)) {
    throw new Error("QMS section status invalid")
  }

  const now = nowISO()
  const state = await readState()
  if (!state.qmsWorkspace) {
    throw new Error("QMS workspace nu există — inițializează cu getOrCreateQms.")
  }
  const idx = state.qmsWorkspace.sections.findIndex((s) => s.key === sectionKey)
  if (idx === -1) throw new Error("QMS section not found")

  const oldSection = state.qmsWorkspace.sections[idx]
  const newSection: QmsSectionContent = {
    ...oldSection,
    status: patch.status ?? oldSection.status,
    description:
      typeof patch.description === "string"
        ? patch.description.trim()
        : oldSection.description,
    procedureSummary:
      typeof patch.procedureSummary === "string"
        ? patch.procedureSummary.trim()
        : oldSection.procedureSummary,
    responsibleRole:
      typeof patch.responsibleRole === "string"
        ? patch.responsibleRole.trim()
        : oldSection.responsibleRole,
    responsibleEmail:
      patch.responsibleEmail !== undefined
        ? patch.responsibleEmail.trim() || undefined
        : oldSection.responsibleEmail,
    notes:
      patch.notes !== undefined
        ? patch.notes.trim() || undefined
        : oldSection.notes,
  }
  // Auto-stamp approvedAtISO when status flips to approved
  if (patch.status === "approved" && oldSection.status !== "approved") {
    newSection.approvedAtISO = now
    newSection.approvedByEmail = actor.label
  }
  // Auto-stamp reviewedAtISO when status flips to documented
  if (
    patch.status === "documented" &&
    oldSection.status !== "documented" &&
    oldSection.status !== "approved"
  ) {
    newSection.reviewedAtISO = now
  }

  const updatedSections = [...state.qmsWorkspace.sections]
  updatedSections[idx] = newSection

  const draft: QmsWorkspace = {
    ...state.qmsWorkspace,
    sections: updatedSections,
    updatedAtISO: now,
  }

  const evalRun = await runEvaluatorAndPersistFindings(
    orgId,
    draft,
    state,
    orgName,
    actor,
  )
  const enriched: QmsWorkspace = {
    ...draft,
    completeness: evalRun.completeness,
    generatedMarkdown: evalRun.generatedMarkdown,
    linkedFindingIds: Array.from(
      new Set([...draft.linkedFindingIds, ...evalRun.newFindingIds]),
    ),
  }

  await mutateFreshStateForOrg(orgId, (s) => ({
    ...s,
    qmsWorkspace: enriched,
    events: appendComplianceEvents(s, [
      createComplianceEvent(
        {
          type: "qms.section_updated",
          entityType: "system",
          entityId: enriched.id,
          message: `QMS sectiunea ${sectionKey} actualizata (status: ${newSection.status}).`,
          createdAtISO: now,
          metadata: {
            sectionKey,
            oldStatus: oldSection.status,
            newStatus: newSection.status,
            findingsEmitted: evalRun.newFindingIds.length,
          },
        },
        actor,
      ),
    ]),
  }))
  return enriched
}

// ── Attach document ─────────────────────────────────────────────────────────

export async function attachQmsDocument(
  orgId: string,
  sectionKey: QmsSectionKey,
  input: AttachQmsDocumentInput,
  actor: ComplianceEventActorInput,
  orgName = "Organizația",
): Promise<QmsWorkspace> {
  if (!isQmsSectionKey(sectionKey)) throw new Error("QMS section key invalid")
  if (!isQmsDocumentType(input.type)) throw new Error("QMS document type invalid")
  const title = input.title?.trim()
  if (!title) throw new Error("QMS document title required")

  const now = nowISO()
  const state = await readState()
  if (!state.qmsWorkspace) {
    throw new Error("QMS workspace nu există — inițializează cu getOrCreateQms.")
  }
  const idx = state.qmsWorkspace.sections.findIndex((s) => s.key === sectionKey)
  if (idx === -1) throw new Error("QMS section not found")

  const doc: QmsDocumentReference = {
    id: docUid(),
    type: input.type,
    title,
    url: input.url?.trim() || undefined,
    fileName: input.fileName?.trim() || undefined,
    attachedAtISO: now,
    attachedByEmail: input.attachedByEmail?.trim() || actor.label,
    versionLabel: input.versionLabel?.trim() || undefined,
    notes: input.notes?.trim() || undefined,
  }
  const oldSection = state.qmsWorkspace.sections[idx]
  const newSection: QmsSectionContent = {
    ...oldSection,
    documentReferences: [doc, ...oldSection.documentReferences],
  }
  // Auto-bump status from not_started → in_progress at first attach
  if (oldSection.status === "not_started") {
    newSection.status = "in_progress"
  }
  const updatedSections = [...state.qmsWorkspace.sections]
  updatedSections[idx] = newSection
  const draft: QmsWorkspace = {
    ...state.qmsWorkspace,
    sections: updatedSections,
    updatedAtISO: now,
  }
  const evalRun = await runEvaluatorAndPersistFindings(
    orgId,
    draft,
    state,
    orgName,
    actor,
  )
  const enriched: QmsWorkspace = {
    ...draft,
    completeness: evalRun.completeness,
    generatedMarkdown: evalRun.generatedMarkdown,
    linkedFindingIds: Array.from(
      new Set([...draft.linkedFindingIds, ...evalRun.newFindingIds]),
    ),
  }
  await mutateFreshStateForOrg(orgId, (s) => ({
    ...s,
    qmsWorkspace: enriched,
    events: appendComplianceEvents(s, [
      createComplianceEvent(
        {
          type: "qms.document_attached",
          entityType: "system",
          entityId: enriched.id,
          message: `Document QMS atasat pe sectiunea ${sectionKey}: "${doc.title}" (${doc.type}).`,
          createdAtISO: now,
          metadata: {
            sectionKey,
            documentId: doc.id,
            documentType: doc.type,
          },
        },
        actor,
      ),
    ]),
  }))
  return enriched
}

export async function removeQmsDocument(
  orgId: string,
  sectionKey: QmsSectionKey,
  docId: string,
  actor: ComplianceEventActorInput,
  orgName = "Organizația",
): Promise<QmsWorkspace> {
  if (!isQmsSectionKey(sectionKey)) throw new Error("QMS section key invalid")
  const now = nowISO()
  const state = await readState()
  if (!state.qmsWorkspace) throw new Error("QMS workspace nu există.")
  const idx = state.qmsWorkspace.sections.findIndex((s) => s.key === sectionKey)
  if (idx === -1) throw new Error("QMS section not found")
  const oldSection = state.qmsWorkspace.sections[idx]
  const newSection: QmsSectionContent = {
    ...oldSection,
    documentReferences: oldSection.documentReferences.filter((d) => d.id !== docId),
  }
  const updatedSections = [...state.qmsWorkspace.sections]
  updatedSections[idx] = newSection
  const draft: QmsWorkspace = {
    ...state.qmsWorkspace,
    sections: updatedSections,
    updatedAtISO: now,
  }
  const evalRun = await runEvaluatorAndPersistFindings(
    orgId,
    draft,
    state,
    orgName,
    actor,
    /* skipFindingPersistence */ true,
  )
  const enriched: QmsWorkspace = {
    ...draft,
    completeness: evalRun.completeness,
    generatedMarkdown: evalRun.generatedMarkdown,
  }
  await mutateFreshStateForOrg(orgId, (s) => ({
    ...s,
    qmsWorkspace: enriched,
    events: appendComplianceEvents(s, [
      createComplianceEvent(
        {
          type: "qms.document_removed",
          entityType: "system",
          entityId: enriched.id,
          message: `Document QMS sters de pe sectiunea ${sectionKey}: ${docId}.`,
          createdAtISO: now,
          metadata: { sectionKey, documentId: docId },
        },
        actor,
      ),
    ]),
  }))
  return enriched
}

// ── Lessons learned ─────────────────────────────────────────────────────────

export async function recordLesson(
  orgId: string,
  input: RecordLessonInput,
  actor: ComplianceEventActorInput,
): Promise<QmsWorkspace> {
  const title = input.title?.trim()
  if (!title) throw new Error("Lesson title required")
  if (!input.rootCauseSummary?.trim()) {
    throw new Error("Lesson rootCauseSummary required")
  }
  const now = nowISO()
  const state = await readState()
  if (!state.qmsWorkspace) {
    throw new Error("QMS workspace nu există.")
  }
  const lesson: QmsLessonLearned = {
    id: lessonUid(),
    source: input.source ?? "manual",
    sourceEntityId: input.sourceEntityId?.trim() || undefined,
    title,
    rootCauseSummary: input.rootCauseSummary.trim(),
    preventiveActionsTaken: (input.preventiveActionsTaken ?? [])
      .map((a) => (typeof a === "string" ? a.trim() : ""))
      .filter((a) => a.length > 0),
    resultingPolicyChange: input.resultingPolicyChange?.trim() || undefined,
    resultingProcessChange: input.resultingProcessChange?.trim() || undefined,
    recordedAtISO: now,
    recordedByEmail: input.recordedByEmail?.trim() || actor.label,
    applicableToSystems: (input.applicableToSystems ?? [])
      .map((s) => (typeof s === "string" ? s.trim() : ""))
      .filter((s) => s.length > 0),
    notes: input.notes?.trim() || undefined,
  }
  const enriched: QmsWorkspace = {
    ...state.qmsWorkspace,
    lessonsLearned: [lesson, ...state.qmsWorkspace.lessonsLearned],
    updatedAtISO: now,
  }
  await mutateFreshStateForOrg(orgId, (s) => ({
    ...s,
    qmsWorkspace: enriched,
    events: appendComplianceEvents(s, [
      createComplianceEvent(
        {
          type: "qms.lesson_recorded",
          entityType: "system",
          entityId: enriched.id,
          message: `Lectie QMS inregistrata: "${lesson.title}" (sursa: ${lesson.source}).`,
          createdAtISO: now,
          metadata: { lessonId: lesson.id, source: lesson.source },
        },
        actor,
      ),
    ]),
  }))
  return enriched
}

/**
 * Recalculeaza lessons din state (incidents + anomalies + findings).
 * Pastreaza lessons manuale; refresh auto-derived.
 */
export async function refreshAutoLessons(
  orgId: string,
  actor: ComplianceEventActorInput,
): Promise<QmsWorkspace> {
  const now = nowISO()
  const state = await readState()
  if (!state.qmsWorkspace) {
    throw new Error("QMS workspace nu există.")
  }
  const autoLessons = aggregateLessonsFromState(
    {
      aiIncidents: state.aiIncidents,
      pmmPlans: state.pmmPlans,
      findings: state.findings,
    },
    now,
  )
  const merged = mergeAutoAndManualLessons(
    state.qmsWorkspace.lessonsLearned,
    autoLessons,
  )
  const enriched: QmsWorkspace = {
    ...state.qmsWorkspace,
    lessonsLearned: merged,
    updatedAtISO: now,
  }
  await mutateFreshStateForOrg(orgId, (s) => ({
    ...s,
    qmsWorkspace: enriched,
    events: appendComplianceEvents(s, [
      createComplianceEvent(
        {
          type: "qms.lessons_refreshed",
          entityType: "system",
          entityId: enriched.id,
          message: `Lectii auto refresh: ${autoLessons.length} candidati din incidents/anomalies/findings (total: ${merged.length}).`,
          createdAtISO: now,
          metadata: {
            autoCount: autoLessons.length,
            totalCount: merged.length,
          },
        },
        actor,
      ),
    ]),
  }))
  return enriched
}

// ── Simplified mode + org size ──────────────────────────────────────────────

export async function markSimplifiedMode(
  orgId: string,
  simplifiedMode: boolean,
  actor: ComplianceEventActorInput,
  orgName = "Organizația",
): Promise<QmsWorkspace> {
  if (typeof simplifiedMode !== "boolean") {
    throw new Error("simplifiedMode must be boolean")
  }
  const now = nowISO()
  const state = await readState()
  if (!state.qmsWorkspace) {
    throw new Error("QMS workspace nu există.")
  }
  const draft: QmsWorkspace = {
    ...state.qmsWorkspace,
    simplifiedMode,
    updatedAtISO: now,
  }
  const evalRun = await runEvaluatorAndPersistFindings(
    orgId,
    draft,
    state,
    orgName,
    actor,
    /* skipFindingPersistence */ true,
  )
  const enriched: QmsWorkspace = {
    ...draft,
    completeness: evalRun.completeness,
    generatedMarkdown: evalRun.generatedMarkdown,
  }
  await mutateFreshStateForOrg(orgId, (s) => ({
    ...s,
    qmsWorkspace: enriched,
    events: appendComplianceEvents(s, [
      createComplianceEvent(
        {
          type: "qms.simplified_mode_toggled",
          entityType: "system",
          entityId: enriched.id,
          message: `QMS simplified mode (Art. 17(3)) ${simplifiedMode ? "activat" : "dezactivat"}.`,
          createdAtISO: now,
          metadata: { simplifiedMode },
        },
        actor,
      ),
    ]),
  }))
  return enriched
}

export async function setOrganizationSize(
  orgId: string,
  size: QmsOrganizationSize,
  actor: ComplianceEventActorInput,
  orgName = "Organizația",
): Promise<QmsWorkspace> {
  if (!isQmsOrgSize(size)) {
    throw new Error("Organization size invalid")
  }
  const now = nowISO()
  const state = await readState()
  if (!state.qmsWorkspace) {
    throw new Error("QMS workspace nu există.")
  }
  const draft: QmsWorkspace = {
    ...state.qmsWorkspace,
    organizationSize: size,
    updatedAtISO: now,
  }
  // SME organizations may default to simplified; midsize/large default off
  if (size !== "sme" && draft.simplifiedMode) {
    draft.simplifiedMode = false
  }
  const evalRun = await runEvaluatorAndPersistFindings(
    orgId,
    draft,
    state,
    orgName,
    actor,
    /* skipFindingPersistence */ true,
  )
  const enriched: QmsWorkspace = {
    ...draft,
    completeness: evalRun.completeness,
    generatedMarkdown: evalRun.generatedMarkdown,
  }
  await mutateFreshStateForOrg(orgId, (s) => ({
    ...s,
    qmsWorkspace: enriched,
    events: appendComplianceEvents(s, [
      createComplianceEvent(
        {
          type: "qms.org_size_changed",
          entityType: "system",
          entityId: enriched.id,
          message: `QMS organization size: ${size}.`,
          createdAtISO: now,
          metadata: { organizationSize: size },
        },
        actor,
      ),
    ]),
  }))
  return enriched
}

// ── System attestations ─────────────────────────────────────────────────────

export async function listSystemAttestations(
  _orgId: string,
): Promise<QmsSystemAttestation[]> {
  const state = await readState()
  return state.qmsWorkspace?.systemAttestations ?? []
}

export async function attestSystem(
  orgId: string,
  input: AttestSystemInput,
  actor: ComplianceEventActorInput,
  orgName = "Organizația",
): Promise<QmsWorkspace> {
  if (!input.systemId?.trim()) throw new Error("systemId required")
  const now = nowISO()
  const state = await readState()
  if (!state.qmsWorkspace) {
    throw new Error("QMS workspace nu există.")
  }
  const system = (state.aiSystems ?? []).find((s) => s.id === input.systemId)
  if (!system) throw new Error(`AI system not found: ${input.systemId}`)
  // Validate sections
  for (const k of input.sectionsConfirmedCovered) {
    if (!isQmsSectionKey(k)) throw new Error(`Invalid section key: ${k}`)
  }
  // Build new attestation (replace existing for same systemId)
  const attestation: QmsSystemAttestation = {
    systemId: input.systemId,
    attestedAtISO: now,
    attestedByEmail: input.attestedByEmail?.trim() || actor.label,
    qmsVersionLabel: state.qmsWorkspace.versionLabel,
    sectionsConfirmedCovered: input.sectionsConfirmedCovered,
    gapsAcknowledged: (input.gapsAcknowledged ?? [])
      .map((g) => (typeof g === "string" ? g.trim() : ""))
      .filter((g) => g.length > 0),
    notes: input.notes?.trim() || undefined,
  }
  const filtered = state.qmsWorkspace.systemAttestations.filter(
    (a) => a.systemId !== input.systemId,
  )
  // attUid available for future per-record IDs if needed
  void attUid
  const draft: QmsWorkspace = {
    ...state.qmsWorkspace,
    systemAttestations: [attestation, ...filtered],
    updatedAtISO: now,
  }
  const evalRun = await runEvaluatorAndPersistFindings(
    orgId,
    draft,
    state,
    orgName,
    actor,
    /* skipFindingPersistence */ true, // attestation never CREATES findings
  )
  const enriched: QmsWorkspace = {
    ...draft,
    completeness: evalRun.completeness,
    generatedMarkdown: evalRun.generatedMarkdown,
  }
  await mutateFreshStateForOrg(orgId, (s) => ({
    ...s,
    qmsWorkspace: enriched,
    events: appendComplianceEvents(s, [
      createComplianceEvent(
        {
          type: "qms.system_attested",
          entityType: "system",
          entityId: enriched.id,
          message: `Sistem AI atestat in QMS: "${system.name}" (${attestation.sectionsConfirmedCovered.length} sectiuni confirmate, ${attestation.gapsAcknowledged.length} gap-uri).`,
          createdAtISO: now,
          metadata: {
            systemId: attestation.systemId,
            qmsVersionLabel: attestation.qmsVersionLabel,
            sectionsConfirmedCount: attestation.sectionsConfirmedCovered.length,
            gapsAcknowledgedCount: attestation.gapsAcknowledged.length,
          },
        },
        actor,
      ),
    ]),
  }))
  return enriched
}

export async function revokeSystemAttestation(
  orgId: string,
  systemId: string,
  actor: ComplianceEventActorInput,
  orgName = "Organizația",
): Promise<QmsWorkspace> {
  const now = nowISO()
  const state = await readState()
  if (!state.qmsWorkspace) throw new Error("QMS workspace nu există.")
  const filtered = state.qmsWorkspace.systemAttestations.filter(
    (a) => a.systemId !== systemId,
  )
  const draft: QmsWorkspace = {
    ...state.qmsWorkspace,
    systemAttestations: filtered,
    updatedAtISO: now,
  }
  const evalRun = await runEvaluatorAndPersistFindings(
    orgId,
    draft,
    state,
    orgName,
    actor,
  )
  const enriched: QmsWorkspace = {
    ...draft,
    completeness: evalRun.completeness,
    generatedMarkdown: evalRun.generatedMarkdown,
    linkedFindingIds: Array.from(
      new Set([...draft.linkedFindingIds, ...evalRun.newFindingIds]),
    ),
  }
  await mutateFreshStateForOrg(orgId, (s) => ({
    ...s,
    qmsWorkspace: enriched,
    events: appendComplianceEvents(s, [
      createComplianceEvent(
        {
          type: "qms.system_attestation_revoked",
          entityType: "system",
          entityId: enriched.id,
          message: `Atestare sistem revocata in QMS: systemId=${systemId}.`,
          createdAtISO: now,
          metadata: { systemId },
        },
        actor,
      ),
    ]),
  }))
  return enriched
}

// ── Approval workflow ───────────────────────────────────────────────────────

export async function approveQms(
  orgId: string,
  approvedByEmail: string,
  actor: ComplianceEventActorInput,
  nextReviewMonths = 12,
  orgName = "Organizația",
): Promise<QmsWorkspace> {
  if (!approvedByEmail?.trim()) throw new Error("approvedByEmail required")
  const now = nowISO()
  const state = await readState()
  if (!state.qmsWorkspace) throw new Error("QMS workspace nu există.")
  const nextReviewMs = new Date(now).getTime() + nextReviewMonths * 30 * DAY_MS
  // Bump versionLabel
  const versionLabel = `${state.qmsWorkspace.versionLabel.includes("draft") ? "v1.0" : bumpMinor(state.qmsWorkspace.versionLabel)} — ${now.slice(0, 10)}`
  const draft: QmsWorkspace = {
    ...state.qmsWorkspace,
    status: "approved",
    approvedByEmail: approvedByEmail.trim(),
    approvedAtISO: now,
    nextReviewISO: new Date(nextReviewMs).toISOString(),
    versionLabel,
    updatedAtISO: now,
  }
  const evalRun = await runEvaluatorAndPersistFindings(
    orgId,
    draft,
    state,
    orgName,
    actor,
    /* skipFindingPersistence */ true, // approval doesn't add new findings
  )
  const enriched: QmsWorkspace = {
    ...draft,
    completeness: evalRun.completeness,
    generatedMarkdown: evalRun.generatedMarkdown,
  }
  await mutateFreshStateForOrg(orgId, (s) => ({
    ...s,
    qmsWorkspace: enriched,
    events: appendComplianceEvents(s, [
      createComplianceEvent(
        {
          type: "qms.approved",
          entityType: "system",
          entityId: enriched.id,
          message: `QMS aprobat de ${approvedByEmail} — versiune ${versionLabel}. Urmatorul review: ${enriched.nextReviewISO}.`,
          createdAtISO: now,
          metadata: {
            approvedByEmail,
            versionLabel,
            nextReviewISO: enriched.nextReviewISO ?? "",
          },
        },
        actor,
      ),
    ]),
  }))
  return enriched
}

// ── Markdown rebuild ────────────────────────────────────────────────────────

export async function buildQmsMarkdownForState(
  orgName = "Organizația",
): Promise<string> {
  const state = await readState()
  if (!state.qmsWorkspace) return `# QMS — ${orgName}\n\n_QMS nu a fost inițializat._\n`
  return buildQmsMarkdown({
    workspace: state.qmsWorkspace,
    orgName,
    state,
  })
}

// ── Helpers ────────────────────────────────────────────────────────────────

function bumpMinor(versionLabel: string): string {
  // Parse "v1.2 — ..." → bump 1.2 to 1.3
  const match = versionLabel.match(/^v(\d+)\.(\d+)/)
  if (!match) return "v1.0"
  const major = parseInt(match[1], 10)
  const minor = parseInt(match[2], 10) + 1
  return `v${major}.${minor}`
}
