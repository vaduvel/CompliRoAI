/**
 * Sprint 008D — Breach store (CRUD pe state.breachRecords + finding emission
 * automat via anspdcp-breach-rescue + ledger evenimente + workflow Art. 33 +
 * Art. 34 + markdown export pentru Audit Pack).
 *
 * Pattern: foloseste `mutateFreshStateForOrg` din `lib/server/store.ts` pentru
 * audit-trail hash-chain consistent cu findings-store / dpia-store / ropa-store.
 *
 * Surface API:
 *  - readBreachRecords(orgId) -> { records, summary }
 *  - getBreachById(orgId, id)
 *  - createBreach(orgId, input, actor) -> emite ScanFinding rescue ANSPDCP +
 *    breach.created event + auto-compute deadline72h
 *  - updateBreach(orgId, id, patch, actor)
 *  - deleteBreach(orgId, id, actor)
 *  - markAnspdcpNotified(orgId, id, input, actor) -> Art. 33 workflow
 *  - markSubjectsNotified(orgId, id, input, actor) -> Art. 34 workflow
 *  - markSubjectNotificationSkipped(orgId, id, reason, actor)
 *  - buildBreachMarkdown(record, orgName) -> dossier Audit Pack
 *  - computeDeadlineStatus(record, nowISO?) -> { hoursLeft, expired, urgent }
 *
 * Cand finding-ul rescue ANSPDCP exista deja in state (id stabil
 * anspdcp-breach-<id>), createFinding e SKIP (dedupe), dar breach-store
 * leaga linkedFindingId pe record-ul nou.
 */

import {
  appendComplianceEvents,
  createComplianceEvent,
  type ComplianceEventActorInput,
} from "@/lib/compliance/events"
import { mutateFreshStateForOrg, readState } from "@/lib/server/store"
import { createFinding, updateFinding, attachEvidence } from "@/lib/server/findings-store"
import {
  ANSPDCP_FINDING_PREFIX,
  anspdcpFindingId,
  buildAnspdcpBreachFinding,
} from "@/lib/compliance/anspdcp-breach-rescue"
import { generateAnspdcpNotification, generateSubjectNotification } from "@/lib/compliance/breach-narrative"
import type {
  AnspdcpNotificationStatus,
  BreachAnspdcpNotification,
  BreachCause,
  BreachDataCategory,
  BreachEvidence,
  BreachRecord,
  BreachSeverity,
  BreachStatus,
  BreachSubjectNotification,
  BreachSubjectNotificationMethod,
} from "@/lib/compliance/types"

// ── Types ────────────────────────────────────────────────────────────────────

export type BreachSummary = {
  total: number
  open: number              // status != closed / no_notification_required
  closed: number
  overdueAnspdcp: number    // deadline expirat + ANSPDCP not yet notified
  urgentAnspdcp: number     // < 24h ramase + ANSPDCP not yet notified
  awaitingSubjects: number  // subjectNotificationRequired si NU notificat
  highSeverity: number      // severity == high / critical
}

export type CreateBreachInput = {
  title: string
  description: string
  cause: BreachCause
  discoveredAtISO?: string
  occurredAtISO?: string
  severity?: BreachSeverity
  dataCategories?: BreachDataCategory[]
  affectedSubjectsCount?: number
  affectedSubjectsCategories?: string[]
  affectedSystems?: string[]
  likelyConsequences?: string
  highRiskToRights?: boolean
  containmentMeasures?: string[]
  preventionMeasures?: string[]
  anspdcpNotificationRequired?: boolean
  subjectNotificationRequired?: boolean
  assignedToEmail?: string
  linkedAISystemIds?: string[]
  notes?: string
}

export type UpdateBreachPatch = Partial<CreateBreachInput> & {
  status?: BreachStatus
}

export type MarkAnspdcpNotifiedInput = {
  referenceNumber: string
  submittedAtISO?: string
  delayJustification?: string
  status?: AnspdcpNotificationStatus  // default "submitted"
}

export type MarkSubjectsNotifiedInput = {
  sentAtISO?: string
  method: BreachSubjectNotificationMethod
  contentDocumented?: boolean
}

// ── Const ────────────────────────────────────────────────────────────────────

const STATUSES: BreachStatus[] = [
  "draft",
  "assessing",
  "anspdcp_required",
  "anspdcp_notified",
  "subjects_required",
  "subjects_notified",
  "closed",
  "no_notification_required",
]

const SEVERITIES: BreachSeverity[] = ["low", "medium", "high", "critical"]

const CAUSES: BreachCause[] = [
  "cyberattack",
  "insider_malicious",
  "insider_accidental",
  "lost_device",
  "misconfiguration",
  "third_party",
  "physical",
  "ai_system",
  "other",
]

const DATA_CATS: BreachDataCategory[] = [
  "identification",
  "contact",
  "financial",
  "special_health",
  "special_biometric",
  "special_genetic",
  "special_political",
  "special_religious",
  "special_sexual",
  "special_criminal",
  "children",
  "employee",
  "credentials",
  "behavioral",
  "other",
]

const SUBJECT_METHODS: BreachSubjectNotificationMethod[] = [
  "email",
  "letter",
  "public_communication",
  "other",
  "not_yet",
]

// ── Helpers ──────────────────────────────────────────────────────────────────

function nowISO(): string {
  return new Date().toISOString()
}

function uid(): string {
  return `breach-${Math.random().toString(36).slice(2, 10)}`
}

function evidenceUid(): string {
  return `bevid-${Math.random().toString(36).slice(2, 10)}`
}

function add72h(iso: string): string {
  return new Date(new Date(iso).getTime() + 72 * 3_600_000).toISOString()
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter((v) => v.length > 0)
}

function normalizeDataCategories(value: unknown): BreachDataCategory[] {
  if (!Array.isArray(value)) return []
  return value.filter((v): v is BreachDataCategory =>
    typeof v === "string" && DATA_CATS.includes(v as BreachDataCategory),
  )
}

function isStatus(value: unknown): value is BreachStatus {
  return typeof value === "string" && STATUSES.includes(value as BreachStatus)
}
export function isBreachStatus(value: unknown): value is BreachStatus {
  return isStatus(value)
}
export function isBreachSeverity(value: unknown): value is BreachSeverity {
  return typeof value === "string" && SEVERITIES.includes(value as BreachSeverity)
}
export function isBreachCause(value: unknown): value is BreachCause {
  return typeof value === "string" && CAUSES.includes(value as BreachCause)
}
export function isBreachDataCategory(value: unknown): value is BreachDataCategory {
  return typeof value === "string" && DATA_CATS.includes(value as BreachDataCategory)
}
export function isBreachSubjectMethod(value: unknown): value is BreachSubjectNotificationMethod {
  return typeof value === "string" && SUBJECT_METHODS.includes(value as BreachSubjectNotificationMethod)
}

// ── Deadline + severity helpers ─────────────────────────────────────────────

export type BreachDeadlineStatus = {
  hoursLeft: number       // poate fi negativ daca expirat
  expired: boolean
  urgent: boolean         // 0 < hoursLeft <= 24
  level: "ok" | "warn" | "urgent" | "expired"
}

export function computeDeadlineStatus(
  record: Pick<BreachRecord, "deadlineISO" | "anspdcpNotification">,
  nowISO: string = new Date().toISOString(),
): BreachDeadlineStatus {
  // Daca notificarea ANSPDCP a fost trimisa, considera "ok" indiferent
  const submitted = record.anspdcpNotification?.status === "submitted" ||
    record.anspdcpNotification?.status === "acknowledged"
  const diffMs = new Date(record.deadlineISO).getTime() - new Date(nowISO).getTime()
  const hoursLeft = Math.round(diffMs / 3_600_000)
  const expired = hoursLeft <= 0
  const urgent = !expired && hoursLeft <= 24
  const warn = !expired && !urgent && hoursLeft <= 36
  let level: BreachDeadlineStatus["level"]
  if (submitted) level = "ok"
  else if (expired) level = "expired"
  else if (urgent) level = "urgent"
  else if (warn) level = "warn"
  else level = "ok"
  return { hoursLeft, expired, urgent, level }
}

export function summarizeBreaches(records: BreachRecord[], nowISO: string = new Date().toISOString()): BreachSummary {
  let open = 0
  let closed = 0
  let overdueAnspdcp = 0
  let urgentAnspdcp = 0
  let awaitingSubjects = 0
  let highSeverity = 0
  for (const r of records) {
    if (r.status === "closed" || r.status === "no_notification_required") closed++
    else open++
    if (r.severity === "high" || r.severity === "critical") highSeverity++
    const submitted = r.anspdcpNotification?.status === "submitted" ||
      r.anspdcpNotification?.status === "acknowledged"
    if (r.anspdcpNotificationRequired && !submitted) {
      const ds = computeDeadlineStatus(r, nowISO)
      if (ds.expired) overdueAnspdcp++
      else if (ds.urgent) urgentAnspdcp++
    }
    if (r.subjectNotificationRequired && !r.subjectNotification?.sentAtISO) {
      awaitingSubjects++
    }
  }
  return {
    total: records.length,
    open,
    closed,
    overdueAnspdcp,
    urgentAnspdcp,
    awaitingSubjects,
    highSeverity,
  }
}

// ── Read ─────────────────────────────────────────────────────────────────────

export async function readBreachRecords(_orgId?: string): Promise<{
  records: BreachRecord[]
  summary: BreachSummary
}> {
  const state = await readState()
  const records = (state.breachRecords ?? []) as BreachRecord[]
  return { records, summary: summarizeBreaches(records) }
}

export async function getBreachById(
  _orgId: string,
  id: string,
): Promise<BreachRecord | null> {
  const state = await readState()
  const records = (state.breachRecords ?? []) as BreachRecord[]
  return records.find((r) => r.id === id) ?? null
}

// ── Auto-detect anspdcp requirement ─────────────────────────────────────────

/**
 * Daca dataCategories contine orice categorie de date personale (toate
 * categoriile noastre SUNT date personale), notificarea ANSPDCP e ceruta.
 * Singura cale de a NU fi ceruta = list goala (cazul unde nu sunt date
 * personale — but breach module is GDPR scope, so by design YES).
 */
function determineAnspdcpRequired(dataCategories: BreachDataCategory[], userToggle?: boolean): boolean {
  if (typeof userToggle === "boolean") return userToggle
  return dataCategories.length > 0
}

// ── Create ───────────────────────────────────────────────────────────────────

export async function createBreach(
  orgId: string,
  input: CreateBreachInput,
  actor: ComplianceEventActorInput,
): Promise<{
  record: BreachRecord
  linkedFindingId?: string
}> {
  const title = input.title?.trim()
  if (!title) throw new Error("Breach title required")
  const description = input.description?.trim() ?? ""
  if (!description) throw new Error("Breach description required")
  if (!isBreachCause(input.cause)) throw new Error("Breach cause invalid or missing")

  const now = nowISO()
  const discoveredAt = input.discoveredAtISO && !Number.isNaN(Date.parse(input.discoveredAtISO))
    ? new Date(input.discoveredAtISO).toISOString()
    : now
  const deadline = add72h(discoveredAt)
  const severity: BreachSeverity = isBreachSeverity(input.severity) ? input.severity : "medium"
  const dataCategories = normalizeDataCategories(input.dataCategories ?? [])
  const anspdcpReq = determineAnspdcpRequired(dataCategories, input.anspdcpNotificationRequired)
  const highRiskToRights = Boolean(input.highRiskToRights)
  const subjectReq = typeof input.subjectNotificationRequired === "boolean"
    ? input.subjectNotificationRequired
    : highRiskToRights
  const status: BreachStatus = anspdcpReq ? "anspdcp_required" : "assessing"

  const recordId = uid()

  // 1) Emite rescue finding ANSPDCP (daca required) — dedupe pe id stabil
  let linkedFindingId: string | undefined
  if (anspdcpReq) {
    const existingState = await readState()
    const stableId = anspdcpFindingId(recordId)
    const alreadyExists = (existingState.findings ?? []).some((f) => f.id === stableId)
    if (!alreadyExists) {
      // Note: createFinding genereaza id finding-XXX, NU id-ul stabil rescue.
      // Pastram in linkedFindingId id-ul real returnat de findings-store.
      const candidate = buildAnspdcpBreachFinding(recordId, title, discoveredAt, undefined, now)
      if (candidate) {
        const created = await createFinding(
          orgId,
          {
            title: candidate.title,
            detail: candidate.detail,
            category: "GDPR",
            severity: candidate.severity,
            legalReference: candidate.legalReference,
            remediationHint: candidate.remediationHint,
            impactSummary: candidate.impactSummary,
            evidenceRequired: "Numar inregistrare ANSPDCP + notificare oficiala + masuri",
            ownerSuggestion: "DPO",
            closeCondition: "Notificare ANSPDCP confirmata + (daca cazul) notificare persoane vizate + masuri implementate",
          },
          actor,
        )
        linkedFindingId = created.id
      }
    }
  }

  // 2) Persist record + breach.created event
  let createdRecord: BreachRecord | null = null
  await mutateFreshStateForOrg(orgId, (state) => {
    const record: BreachRecord = {
      id: recordId,
      orgId,
      title,
      description,
      cause: input.cause,
      discoveredAtISO: discoveredAt,
      occurredAtISO: input.occurredAtISO && !Number.isNaN(Date.parse(input.occurredAtISO))
        ? new Date(input.occurredAtISO).toISOString()
        : undefined,
      deadlineISO: deadline,
      severity,
      dataCategories,
      affectedSubjectsCount:
        typeof input.affectedSubjectsCount === "number" && Number.isFinite(input.affectedSubjectsCount)
          ? input.affectedSubjectsCount
          : undefined,
      affectedSubjectsCategories: normalizeStringArray(input.affectedSubjectsCategories ?? []),
      affectedSystems: normalizeStringArray(input.affectedSystems ?? []),
      likelyConsequences: input.likelyConsequences?.trim() ?? "",
      highRiskToRights,
      containmentMeasures: normalizeStringArray(input.containmentMeasures ?? []),
      preventionMeasures: normalizeStringArray(input.preventionMeasures ?? []),
      anspdcpNotificationRequired: anspdcpReq,
      anspdcpNotification: anspdcpReq ? { status: "draft" } : undefined,
      subjectNotificationRequired: subjectReq,
      subjectNotification: subjectReq
        ? { method: "not_yet", contentDocumented: false }
        : undefined,
      status,
      assignedToEmail: input.assignedToEmail?.trim() || actor.label,
      linkedFindingId,
      linkedAISystemIds: normalizeStringArray(input.linkedAISystemIds ?? []),
      evidenceVaultIds: [],
      evidence: [],
      notes: input.notes?.trim() || undefined,
      createdAtISO: now,
      updatedAtISO: now,
    }
    createdRecord = record

    const events = [
      createComplianceEvent(
        {
          type: "breach.created",
          entityType: "system",
          entityId: record.id,
          message: `Breach GDPR creat: "${record.title}" · severitate ${record.severity} · deadline 72h ${record.deadlineISO}`,
          createdAtISO: now,
          metadata: {
            severity: record.severity,
            cause: record.cause,
            dataCategoryCount: record.dataCategories.length,
            anspdcpRequired: record.anspdcpNotificationRequired,
            subjectRequired: record.subjectNotificationRequired,
            linkedFindingId: linkedFindingId ?? "",
          },
        },
        actor,
      ),
    ]
    if (linkedFindingId) {
      events.push(
        createComplianceEvent(
          {
            type: "breach.finding.emitted",
            entityType: "finding",
            entityId: linkedFindingId,
            message: `Finding rescue ANSPDCP emis pentru breach "${record.title}"`,
            createdAtISO: now,
            metadata: { breachId: record.id },
          },
          actor,
        ),
      )
    }

    return {
      ...state,
      breachRecords: [record, ...(state.breachRecords ?? [])].slice(0, 200),
      events: appendComplianceEvents(state, events),
    }
  })

  if (!createdRecord) throw new Error("createBreach: mutator did not produce a record")
  return { record: createdRecord, linkedFindingId }
}

// ── Update (generic patch) ──────────────────────────────────────────────────

export async function updateBreach(
  orgId: string,
  id: string,
  patch: UpdateBreachPatch,
  actor: ComplianceEventActorInput,
): Promise<BreachRecord | null> {
  let updated: BreachRecord | null = null
  let notFound = false

  await mutateFreshStateForOrg(orgId, (state) => {
    const records = (state.breachRecords ?? []) as BreachRecord[]
    const idx = records.findIndex((r) => r.id === id)
    if (idx === -1) {
      notFound = true
      return state
    }
    const current = records[idx]
    const now = nowISO()
    const newDataCategories = patch.dataCategories === undefined
      ? current.dataCategories
      : normalizeDataCategories(patch.dataCategories)
    const newSeverity = isBreachSeverity(patch.severity) ? patch.severity : current.severity
    const newCause = isBreachCause(patch.cause) ? patch.cause : current.cause
    const newDiscoveredAt = patch.discoveredAtISO && !Number.isNaN(Date.parse(patch.discoveredAtISO))
      ? new Date(patch.discoveredAtISO).toISOString()
      : current.discoveredAtISO
    const newDeadline = newDiscoveredAt !== current.discoveredAtISO
      ? add72h(newDiscoveredAt)
      : current.deadlineISO
    const newHighRiskToRights = typeof patch.highRiskToRights === "boolean"
      ? patch.highRiskToRights
      : current.highRiskToRights
    const newSubjectRequired = typeof patch.subjectNotificationRequired === "boolean"
      ? patch.subjectNotificationRequired
      : current.subjectNotificationRequired
    const newAnspdcpRequired = typeof patch.anspdcpNotificationRequired === "boolean"
      ? patch.anspdcpNotificationRequired
      : current.anspdcpNotificationRequired

    const next: BreachRecord = {
      ...current,
      title: patch.title?.trim() || current.title,
      description: patch.description?.trim() ?? current.description,
      cause: newCause,
      discoveredAtISO: newDiscoveredAt,
      occurredAtISO: patch.occurredAtISO === undefined
        ? current.occurredAtISO
        : (patch.occurredAtISO && !Number.isNaN(Date.parse(patch.occurredAtISO))
          ? new Date(patch.occurredAtISO).toISOString()
          : undefined),
      deadlineISO: newDeadline,
      severity: newSeverity,
      dataCategories: newDataCategories,
      affectedSubjectsCount: patch.affectedSubjectsCount === undefined
        ? current.affectedSubjectsCount
        : (typeof patch.affectedSubjectsCount === "number" && Number.isFinite(patch.affectedSubjectsCount)
          ? patch.affectedSubjectsCount
          : undefined),
      affectedSubjectsCategories: patch.affectedSubjectsCategories === undefined
        ? current.affectedSubjectsCategories
        : normalizeStringArray(patch.affectedSubjectsCategories),
      affectedSystems: patch.affectedSystems === undefined
        ? current.affectedSystems
        : normalizeStringArray(patch.affectedSystems),
      likelyConsequences: patch.likelyConsequences === undefined
        ? current.likelyConsequences
        : patch.likelyConsequences?.trim() ?? "",
      highRiskToRights: newHighRiskToRights,
      containmentMeasures: patch.containmentMeasures === undefined
        ? current.containmentMeasures
        : normalizeStringArray(patch.containmentMeasures),
      preventionMeasures: patch.preventionMeasures === undefined
        ? current.preventionMeasures
        : normalizeStringArray(patch.preventionMeasures),
      anspdcpNotificationRequired: newAnspdcpRequired,
      subjectNotificationRequired: newSubjectRequired,
      assignedToEmail: patch.assignedToEmail === undefined
        ? current.assignedToEmail
        : (patch.assignedToEmail?.trim() || undefined),
      linkedAISystemIds: patch.linkedAISystemIds === undefined
        ? current.linkedAISystemIds
        : normalizeStringArray(patch.linkedAISystemIds),
      notes: patch.notes === undefined ? current.notes : (patch.notes?.trim() || undefined),
      status: isStatus(patch.status) ? patch.status : current.status,
      updatedAtISO: now,
      closedAtISO: isStatus(patch.status) && (patch.status === "closed" || patch.status === "no_notification_required")
        ? current.closedAtISO ?? now
        : current.closedAtISO,
    }
    updated = next

    const nextRecords = [...records]
    nextRecords[idx] = next

    return {
      ...state,
      breachRecords: nextRecords,
      events: appendComplianceEvents(state, [
        createComplianceEvent(
          {
            type: "breach.updated",
            entityType: "system",
            entityId: id,
            message: `Breach actualizat: "${next.title}" · status ${next.status}`,
            createdAtISO: now,
            metadata: {
              status: next.status,
              severity: next.severity,
              anspdcpRequired: next.anspdcpNotificationRequired,
              subjectRequired: next.subjectNotificationRequired,
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

export async function deleteBreach(
  orgId: string,
  id: string,
  actor: ComplianceEventActorInput,
): Promise<boolean> {
  let removed = false
  await mutateFreshStateForOrg(orgId, (state) => {
    const records = (state.breachRecords ?? []) as BreachRecord[]
    const target = records.find((r) => r.id === id)
    if (!target) return state
    removed = true
    return {
      ...state,
      breachRecords: records.filter((r) => r.id !== id),
      events: appendComplianceEvents(state, [
        createComplianceEvent(
          {
            type: "breach.deleted",
            entityType: "system",
            entityId: id,
            message: `Breach sters: "${target.title}"`,
            createdAtISO: nowISO(),
            metadata: { severity: target.severity, status: target.status },
          },
          actor,
        ),
      ]),
    }
  })
  return removed
}

// ── ANSPDCP notification workflow (Art. 33) ─────────────────────────────────

export async function markAnspdcpNotified(
  orgId: string,
  id: string,
  input: MarkAnspdcpNotifiedInput,
  actor: ComplianceEventActorInput,
): Promise<BreachRecord | null> {
  const refNumber = input.referenceNumber?.trim()
  if (!refNumber) throw new Error("Numar inregistrare ANSPDCP obligatoriu")

  const now = nowISO()
  const submittedAt = input.submittedAtISO && !Number.isNaN(Date.parse(input.submittedAtISO))
    ? new Date(input.submittedAtISO).toISOString()
    : now

  let updated: BreachRecord | null = null
  let notFound = false
  let linkedFindingId: string | undefined

  await mutateFreshStateForOrg(orgId, (state) => {
    const records = (state.breachRecords ?? []) as BreachRecord[]
    const idx = records.findIndex((r) => r.id === id)
    if (idx === -1) {
      notFound = true
      return state
    }
    const current = records[idx]
    // Daca submittedAt > deadline72h, justification e obligatorie
    if (new Date(submittedAt).getTime() > new Date(current.deadlineISO).getTime()) {
      if (!input.delayJustification?.trim()) {
        throw new Error(
          "Justificarea depasirii termenului 72h e obligatorie pentru notificari intarziate",
        )
      }
    }

    const status: AnspdcpNotificationStatus = input.status ?? "submitted"
    const anspdcp: BreachAnspdcpNotification = {
      status,
      submittedAtISO: submittedAt,
      referenceNumber: refNumber,
      delayJustification: input.delayJustification?.trim() || undefined,
    }

    // Tranzitie status: anspdcp_notified → (subjects_required daca highRisk) → closed
    let nextStatus: BreachStatus = "anspdcp_notified"
    if (current.subjectNotificationRequired) {
      // Daca subjects sunt deja notificate, marcheaza inchis
      if (current.subjectNotification?.sentAtISO) nextStatus = "closed"
      else nextStatus = "subjects_required"
    } else {
      // Fara subjects necesare si ANSPDCP done → closed
      nextStatus = "closed"
    }

    const next: BreachRecord = {
      ...current,
      anspdcpNotification: anspdcp,
      status: nextStatus,
      updatedAtISO: now,
      closedAtISO: nextStatus === "closed" ? (current.closedAtISO ?? now) : current.closedAtISO,
    }
    updated = next
    linkedFindingId = current.linkedFindingId

    const nextRecords = [...records]
    nextRecords[idx] = next

    return {
      ...state,
      breachRecords: nextRecords,
      events: appendComplianceEvents(state, [
        createComplianceEvent(
          {
            type: "breach.anspdcp_notified",
            entityType: "system",
            entityId: id,
            message: `Notificare ANSPDCP trimisa pentru "${current.title}" · nr. ${refNumber}`,
            createdAtISO: now,
            metadata: {
              referenceNumber: refNumber,
              submittedAtISO: submittedAt,
              status,
              delayed: new Date(submittedAt).getTime() > new Date(current.deadlineISO).getTime(),
              nextStatus,
            },
          },
          actor,
        ),
      ]),
    }
  })

  if (notFound) return null
  const result = updated as BreachRecord | null

  // Update finding rescue: attach evidence + resolve daca closed
  if (linkedFindingId) {
    await attachEvidence(
      orgId,
      linkedFindingId,
      {
        note: `Notificare ANSPDCP trimisa, nr. inregistrare ${refNumber}, la ${submittedAt}.`,
      },
      actor,
    )
    // Daca breach a ajuns la closed (no subject notification needed), inchide finding-ul
    if (result && result.status === "closed") {
      await updateFinding(orgId, linkedFindingId, { action: "resolve" }, actor)
    }
  }

  return result
}

// ── Subject notification workflow (Art. 34) ─────────────────────────────────

export async function markSubjectsNotified(
  orgId: string,
  id: string,
  input: MarkSubjectsNotifiedInput,
  actor: ComplianceEventActorInput,
): Promise<BreachRecord | null> {
  if (!isBreachSubjectMethod(input.method) || input.method === "not_yet") {
    throw new Error("Metoda de notificare e obligatorie (email/scrisoare/comunicare publica/altele)")
  }
  const now = nowISO()
  const sentAt = input.sentAtISO && !Number.isNaN(Date.parse(input.sentAtISO))
    ? new Date(input.sentAtISO).toISOString()
    : now

  let updated: BreachRecord | null = null
  let notFound = false
  let linkedFindingId: string | undefined
  let becameClosed = false

  await mutateFreshStateForOrg(orgId, (state) => {
    const records = (state.breachRecords ?? []) as BreachRecord[]
    const idx = records.findIndex((r) => r.id === id)
    if (idx === -1) {
      notFound = true
      return state
    }
    const current = records[idx]
    const subjectNotif: BreachSubjectNotification = {
      sentAtISO: sentAt,
      method: input.method,
      contentDocumented: input.contentDocumented !== false,
      skipReason: undefined,
    }
    // Auto-close daca ANSPDCP a fost notificat sau nu era cerut
    const anspdcpDone = !current.anspdcpNotificationRequired ||
      current.anspdcpNotification?.status === "submitted" ||
      current.anspdcpNotification?.status === "acknowledged"
    const nextStatus: BreachStatus = anspdcpDone ? "closed" : "subjects_notified"
    if (nextStatus === "closed") becameClosed = true

    const next: BreachRecord = {
      ...current,
      subjectNotification: subjectNotif,
      subjectNotificationRequired: true,
      status: nextStatus,
      updatedAtISO: now,
      closedAtISO: nextStatus === "closed" ? (current.closedAtISO ?? now) : current.closedAtISO,
    }
    updated = next
    linkedFindingId = current.linkedFindingId

    const nextRecords = [...records]
    nextRecords[idx] = next

    return {
      ...state,
      breachRecords: nextRecords,
      events: appendComplianceEvents(state, [
        createComplianceEvent(
          {
            type: "breach.subjects_notified",
            entityType: "system",
            entityId: id,
            message: `Persoanele vizate notificate (Art. 34) pentru "${current.title}" via ${input.method}`,
            createdAtISO: now,
            metadata: { method: input.method, sentAtISO: sentAt, nextStatus },
          },
          actor,
        ),
      ]),
    }
  })

  if (notFound) return null
  if (linkedFindingId) {
    await attachEvidence(
      orgId,
      linkedFindingId,
      {
        note: `Notificare persoane vizate trimisa via ${input.method} la ${sentAt} (Art. 34).`,
      },
      actor,
    )
    if (becameClosed) {
      await updateFinding(orgId, linkedFindingId, { action: "resolve" }, actor)
    }
  }
  return updated
}

export async function markSubjectNotificationSkipped(
  orgId: string,
  id: string,
  reason: string,
  actor: ComplianceEventActorInput,
): Promise<BreachRecord | null> {
  const trimmed = reason?.trim()
  if (!trimmed) throw new Error("Motivul documentat e obligatoriu pentru skip Art. 34")
  const now = nowISO()
  let updated: BreachRecord | null = null
  let notFound = false
  let becameClosed = false
  let linkedFindingId: string | undefined

  await mutateFreshStateForOrg(orgId, (state) => {
    const records = (state.breachRecords ?? []) as BreachRecord[]
    const idx = records.findIndex((r) => r.id === id)
    if (idx === -1) {
      notFound = true
      return state
    }
    const current = records[idx]
    const subjectNotif: BreachSubjectNotification = {
      method: "not_yet",
      contentDocumented: true,
      skipReason: trimmed,
    }
    const anspdcpDone = !current.anspdcpNotificationRequired ||
      current.anspdcpNotification?.status === "submitted" ||
      current.anspdcpNotification?.status === "acknowledged"
    const nextStatus: BreachStatus = anspdcpDone ? "closed" : "anspdcp_required"
    if (nextStatus === "closed") becameClosed = true

    const next: BreachRecord = {
      ...current,
      subjectNotificationRequired: false,
      subjectNotification: subjectNotif,
      status: nextStatus,
      updatedAtISO: now,
      closedAtISO: nextStatus === "closed" ? (current.closedAtISO ?? now) : current.closedAtISO,
    }
    updated = next
    linkedFindingId = current.linkedFindingId

    const nextRecords = [...records]
    nextRecords[idx] = next

    return {
      ...state,
      breachRecords: nextRecords,
      events: appendComplianceEvents(state, [
        createComplianceEvent(
          {
            type: "breach.subjects_skip_documented",
            entityType: "system",
            entityId: id,
            message: `Notificare Art. 34 documentata ca neaplicabila pentru "${current.title}"`,
            createdAtISO: now,
            metadata: { reason: trimmed.slice(0, 200), nextStatus },
          },
          actor,
        ),
      ]),
    }
  })

  if (notFound) return null
  if (linkedFindingId && becameClosed) {
    await updateFinding(orgId, linkedFindingId, { action: "resolve" }, actor)
  }
  return updated
}

// ── Attach evidence (helper for UI inline note attachments) ─────────────────

export async function attachBreachEvidence(
  orgId: string,
  id: string,
  input: { note: string; url?: string; fileName?: string },
  actor: ComplianceEventActorInput,
): Promise<BreachRecord | null> {
  const note = input.note?.trim()
  if (!note) throw new Error("Nota dovezii e obligatorie")
  const now = nowISO()
  let updated: BreachRecord | null = null
  let notFound = false

  await mutateFreshStateForOrg(orgId, (state) => {
    const records = (state.breachRecords ?? []) as BreachRecord[]
    const idx = records.findIndex((r) => r.id === id)
    if (idx === -1) {
      notFound = true
      return state
    }
    const current = records[idx]
    const evid: BreachEvidence = {
      id: evidenceUid(),
      note,
      url: input.url?.trim() || undefined,
      fileName: input.fileName?.trim() || undefined,
      attachedByEmail: actor.label,
      attachedAtISO: now,
    }
    const next: BreachRecord = {
      ...current,
      evidence: [evid, ...(current.evidence ?? [])],
      updatedAtISO: now,
    }
    updated = next
    const nextRecords = [...records]
    nextRecords[idx] = next
    return {
      ...state,
      breachRecords: nextRecords,
      events: appendComplianceEvents(state, [
        createComplianceEvent(
          {
            type: "breach.evidence_attached",
            entityType: "system",
            entityId: id,
            message: `Dovada atasata pe breach "${current.title}"`,
            createdAtISO: now,
            metadata: { hasUrl: Boolean(evid.url), hasFile: Boolean(evid.fileName) },
          },
          actor,
        ),
      ]),
    }
  })

  if (notFound) return null
  return updated
}

// ── Markdown export (Audit Pack) ────────────────────────────────────────────

export function buildBreachMarkdown(record: BreachRecord, orgName: string): string {
  const nowISO_ = new Date().toISOString()
  const anspdcpSection = generateAnspdcpNotification(record, orgName, nowISO_)
  const subjectSection = record.subjectNotificationRequired
    ? generateSubjectNotification(record, orgName, nowISO_)
    : null

  const lines: (string | null)[] = [
    `# Dosar breach GDPR — ${record.title}`,
    "",
    `**Operator:** ${orgName || "—"}`,
    `**ID breach:** ${record.id}`,
    `**Status:** ${record.status}`,
    `**Severitate:** ${record.severity}`,
    `**Cauza:** ${record.cause}`,
    `**Descoperit:** ${record.discoveredAtISO}`,
    `**Termen 72h:** ${record.deadlineISO}`,
    record.assignedToEmail ? `**DPO / responsabil:** ${record.assignedToEmail}` : null,
    record.linkedFindingId ? `**Finding asociat:** ${record.linkedFindingId}` : null,
    "",
    "## 1. Descrierea incidentului",
    "",
    record.description,
    "",
    "## 2. Scope & impact",
    "",
    `- Sisteme afectate: ${record.affectedSystems.length ? record.affectedSystems.join(", ") : "necompletat"}`,
    `- Categorii persoane vizate: ${record.affectedSubjectsCategories.length ? record.affectedSubjectsCategories.join(", ") : "necompletat"}`,
    `- Numar aproximativ persoane: ${typeof record.affectedSubjectsCount === "number" ? record.affectedSubjectsCount : "necunoscut"}`,
    `- Categorii date afectate: ${record.dataCategories.length ? record.dataCategories.join(", ") : "necompletat"}`,
    `- Risc ridicat pt. drepturi: ${record.highRiskToRights ? "Da (Art. 34 aplicabil)" : "Nu"}`,
    "",
    "## 3. Consecinte probabile",
    "",
    record.likelyConsequences || "_de completat_",
    "",
    "## 4. Masuri de limitare (containment)",
    "",
    record.containmentMeasures.length
      ? record.containmentMeasures.map((m) => `- ${m}`).join("\n")
      : "- _de completat_",
    "",
    "## 5. Masuri de preventie",
    "",
    record.preventionMeasures.length
      ? record.preventionMeasures.map((m) => `- ${m}`).join("\n")
      : "- _de completat_",
    "",
    "## 6. Notificare ANSPDCP (Art. 33)",
    "",
    record.anspdcpNotificationRequired ? "**Obligatorie.**" : "**Documentat ca NEnecesara.**",
    record.anspdcpNotification?.status ? `Status: ${record.anspdcpNotification.status}` : null,
    record.anspdcpNotification?.referenceNumber
      ? `Numar inregistrare: ${record.anspdcpNotification.referenceNumber}`
      : null,
    record.anspdcpNotification?.submittedAtISO
      ? `Trimisa la: ${record.anspdcpNotification.submittedAtISO}`
      : null,
    record.anspdcpNotification?.delayJustification
      ? `Justificare intarziere: ${record.anspdcpNotification.delayJustification}`
      : null,
    "",
    "### 6.1 Narativa ANSPDCP (copy-paste ready)",
    "",
    anspdcpSection,
    "",
    "## 7. Notificare persoane vizate (Art. 34)",
    "",
    record.subjectNotificationRequired
      ? "**Obligatorie — risc ridicat pentru drepturile persoanelor.**"
      : "**Documentat ca NEnecesara — risc redus.**",
    record.subjectNotification?.method
      ? `Metoda: ${record.subjectNotification.method}`
      : null,
    record.subjectNotification?.sentAtISO
      ? `Trimisa la: ${record.subjectNotification.sentAtISO}`
      : null,
    record.subjectNotification?.skipReason
      ? `Motiv skip (cand subjectNotificationRequired=false): ${record.subjectNotification.skipReason}`
      : null,
    "",
    subjectSection ? "### 7.1 Narativa pentru persoanele vizate (copy-paste ready)" : null,
    subjectSection ? "" : null,
    subjectSection,
    subjectSection ? "" : null,
    "## 8. Evidente atasate",
    "",
    record.evidence && record.evidence.length > 0
      ? record.evidence
        .map(
          (e) =>
            `- [${e.attachedAtISO}] ${e.attachedByEmail ?? "system"}: ${e.note}${e.url ? ` (URL: ${e.url})` : ""}${e.fileName ? ` (Fisier: ${e.fileName})` : ""}`,
        )
        .join("\n")
      : "- _Nicio dovada atasata inca_",
    "",
    "## 9. Note interne",
    "",
    record.notes ?? "_fara note_",
    "",
    "---",
    "",
    "> Document operational generat de CompliRoAI. Necesita validare DPO inainte de transmiterea/arhivarea oficiala.",
  ]
  return lines.filter((line): line is string => typeof line === "string").join("\n")
}

// ── Re-export helpers pentru API + UI ───────────────────────────────────────

export { ANSPDCP_FINDING_PREFIX, anspdcpFindingId }
