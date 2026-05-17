/**
 * Sprint 008B — Findings store (CRUD over ComplianceState.findings).
 *
 * Pattern: foloseste `mutateFreshStateForOrg` din `lib/server/store.ts` ca sa
 * citeasca + scrie state-ul org-ului si apeleaza `appendComplianceEvents`
 * pentru hash-chain ledger. Toate scrierile sunt tamper-evident.
 *
 * Surface API:
 *  - readFindings(orgId)
 *  - createFinding(orgId, input, actor)
 *  - updateFinding(orgId, id, patch, actor)
 *  - deleteFinding(orgId, id, actor)
 *  - attachEvidence(orgId, id, input, actor)
 *
 * Actor (`ComplianceEventActorInput`) trebuie sa vina din `getOrgContext()` —
 * vezi route handlers. NU instantia actor manual fara user id real.
 */

import {
  appendComplianceEvents,
  createComplianceEvent,
  type ComplianceEventActorInput,
} from "@/lib/compliance/events"
import { mutateFreshStateForOrg, readState } from "@/lib/server/store"
import {
  inferPrinciplesFromCategory,
  normalizeComplianceSeverity,
  severityToLegacyRisk,
  type ComplianceSeverity,
} from "@/lib/compliance/constitution"
import type {
  ClientPortalDocument,
  ComplianceState,
  FindingCategory,
  ScanFinding,
} from "@/lib/compliance/types"

// ── Types ────────────────────────────────────────────────────────────────────

export type FindingStatus =
  | "open"
  | "confirmed"
  | "dismissed"
  | "resolved"
  | "under_monitoring"

export type FindingReviewState =
  | "unreviewed"
  | "confirmed"
  | "evidence_attached"
  | "closed"
  | "monitoring"

export type FindingAction =
  | "confirm"
  | "dismiss"
  | "resolve"
  | "reopen"
  | "monitor"

export type CreateFindingInput = {
  title: string
  detail: string
  category: FindingCategory
  severity?: ComplianceSeverity
  legalReference?: string
  remediationHint?: string
  impactSummary?: string
  ownerSuggestion?: string
  evidenceRequired?: string
  closeCondition?: string
}

export type UpdateFindingPatch = {
  findingStatus?: FindingStatus
  reviewState?: FindingReviewState
  operationalEvidenceNote?: string
  action?: FindingAction
}

export type AttachEvidenceInput = {
  note: string
  url?: string
  fileName?: string
}

export type FindingStats = {
  total: number
  open: number
  confirmed: number
  resolved: number
  dismissed: number
  under_monitoring: number
  critical: number
  high: number
  medium: number
  low: number
}

const VALID_STATUS: FindingStatus[] = [
  "open",
  "confirmed",
  "dismissed",
  "resolved",
  "under_monitoring",
]

const VALID_REVIEW: FindingReviewState[] = [
  "unreviewed",
  "confirmed",
  "evidence_attached",
  "closed",
  "monitoring",
]

const VALID_ACTION: FindingAction[] = [
  "confirm",
  "dismiss",
  "resolve",
  "reopen",
  "monitor",
]

const VALID_CATEGORY: FindingCategory[] = ["EU_AI_ACT", "GDPR", "E_FACTURA", "NIS2"]

export function isFindingStatus(value: unknown): value is FindingStatus {
  return typeof value === "string" && VALID_STATUS.includes(value as FindingStatus)
}

export function isFindingReviewState(value: unknown): value is FindingReviewState {
  return typeof value === "string" && VALID_REVIEW.includes(value as FindingReviewState)
}

export function isFindingAction(value: unknown): value is FindingAction {
  return typeof value === "string" && VALID_ACTION.includes(value as FindingAction)
}

export function isFindingCategory(value: unknown): value is FindingCategory {
  return typeof value === "string" && VALID_CATEGORY.includes(value as FindingCategory)
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function uid(): string {
  return `finding-${Math.random().toString(36).slice(2, 10)}`
}

function docUid(): string {
  return `doc-${Math.random().toString(36).slice(2, 10)}`
}

function nowISO(): string {
  return new Date().toISOString()
}

function addDaysISO(iso: string, days: number): string {
  return new Date(new Date(iso).getTime() + days * 86_400_000).toISOString()
}

/**
 * Maps a workflow action shortcut to concrete field updates.
 * Pure — no side effects. Used by both PATCH route and test harness.
 */
export function resolveFindingAction(
  action: FindingAction,
  current: ScanFinding,
): {
  findingStatus: FindingStatus
  reviewState: FindingReviewState
  nextMonitoringDateISO?: string
  reopenedFromISO?: string
} {
  const now = nowISO()
  switch (action) {
    case "confirm":
      return { findingStatus: "confirmed", reviewState: "confirmed" }
    case "dismiss":
      return { findingStatus: "dismissed", reviewState: "closed" }
    case "resolve":
      return { findingStatus: "resolved", reviewState: "closed" }
    case "reopen":
      return {
        findingStatus: "open",
        reviewState: "unreviewed",
        reopenedFromISO: current.findingStatus ?? "open",
      }
    case "monitor":
      return {
        findingStatus: "under_monitoring",
        reviewState: "monitoring",
        nextMonitoringDateISO: addDaysISO(now, 90),
      }
  }
}

// ── Read ─────────────────────────────────────────────────────────────────────

export async function readFindings(_orgId?: string): Promise<{
  findings: ScanFinding[]
  stats: FindingStats
}> {
  const state = await readState()
  const findings = state.findings ?? []
  return { findings, stats: computeStats(findings) }
}

export function computeStats(findings: ScanFinding[]): FindingStats {
  const stats: FindingStats = {
    total: findings.length,
    open: 0,
    confirmed: 0,
    resolved: 0,
    dismissed: 0,
    under_monitoring: 0,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  }
  for (const f of findings) {
    const status = (f.findingStatus ?? "open") as FindingStatus
    if (status in stats) stats[status]++
    const sev = f.severity
    if (sev === "critical") stats.critical++
    else if (sev === "high") stats.high++
    else if (sev === "medium") stats.medium++
    else if (sev === "low") stats.low++
  }
  return stats
}

export async function getFindingById(
  _orgId: string,
  id: string,
): Promise<ScanFinding | null> {
  const state = await readState()
  return (state.findings ?? []).find((f) => f.id === id) ?? null
}

// ── Create ───────────────────────────────────────────────────────────────────

export async function createFinding(
  orgId: string,
  input: CreateFindingInput,
  actor: ComplianceEventActorInput,
): Promise<ScanFinding> {
  let created: ScanFinding | null = null

  await mutateFreshStateForOrg(orgId, (state) => {
    const severity = normalizeComplianceSeverity(input.severity, "medium")
    const principles = inferPrinciplesFromCategory(input.category)
    const now = nowISO()

    const finding: ScanFinding = {
      id: uid(),
      title: input.title,
      detail: input.detail,
      category: input.category,
      severity,
      risk: severityToLegacyRisk(severity),
      principles,
      createdAtISO: now,
      sourceDocument: "manual",
      findingStatus: "open",
      findingStatusUpdatedAtISO: now,
      reviewState: "unreviewed",
      legalReference: input.legalReference,
      remediationHint: input.remediationHint,
      impactSummary: input.impactSummary,
      ownerSuggestion: input.ownerSuggestion,
      evidenceRequired: input.evidenceRequired,
      closeCondition: input.closeCondition,
    }
    created = finding

    const event = createComplianceEvent(
      {
        type: "finding.created",
        entityType: "finding",
        entityId: finding.id,
        message: `Risc nou inregistrat: ${finding.title}`,
        createdAtISO: now,
        metadata: {
          category: finding.category,
          severity: finding.severity,
        },
      },
      actor,
    )

    return {
      ...state,
      findings: [finding, ...(state.findings ?? [])],
      events: appendComplianceEvents(state, [event]),
    }
  })

  if (!created) throw new Error("createFinding: mutator did not produce a finding")
  const finding: ScanFinding = created

  // Sprint 014 — email alert pe finding critical (fire-and-forget).
  if (finding.severity === "critical") {
    const recipient = actor.label
    if (recipient && recipient.includes("@")) {
      import("./email-alerts")
        .then(({ sendFindingCriticalEmailAsync }) =>
          sendFindingCriticalEmailAsync({
            toEmail: recipient,
            finding: {
              id: finding.id,
              title: finding.title,
              category: finding.category,
              createdAtISO: finding.createdAtISO,
            },
          })
        )
        .catch((err) =>
          console.warn("[findings-store] email alert import failed:", err)
        )
    }
  }

  return finding
}

// ── Update ───────────────────────────────────────────────────────────────────

export async function updateFinding(
  orgId: string,
  findingId: string,
  patch: UpdateFindingPatch,
  actor: ComplianceEventActorInput,
): Promise<ScanFinding | null> {
  let updated: ScanFinding | null = null
  let notFound = false

  await mutateFreshStateForOrg(orgId, (state) => {
    const findings = state.findings ?? []
    const idx = findings.findIndex((f) => f.id === findingId)
    if (idx === -1) {
      notFound = true
      return state
    }
    const current = findings[idx]
    const now = nowISO()

    let next: ScanFinding = { ...current }
    let eventType = "finding.patched"
    let actionTaken: FindingAction | null = null

    if (patch.action && isFindingAction(patch.action)) {
      const resolved = resolveFindingAction(patch.action, current)
      next = {
        ...next,
        findingStatus: resolved.findingStatus,
        reviewState: resolved.reviewState,
        findingStatusUpdatedAtISO: now,
        ...(resolved.nextMonitoringDateISO
          ? { nextMonitoringDateISO: resolved.nextMonitoringDateISO }
          : {}),
        ...(patch.action === "reopen"
          ? { reopenedFromISO: now }
          : {}),
      }
      eventType = `finding.${patch.action}`
      actionTaken = patch.action
    }

    if (patch.findingStatus && isFindingStatus(patch.findingStatus)) {
      next.findingStatus = patch.findingStatus
      next.findingStatusUpdatedAtISO = now
    }
    if (patch.reviewState && isFindingReviewState(patch.reviewState)) {
      next.reviewState = patch.reviewState
    }
    if (typeof patch.operationalEvidenceNote === "string") {
      next.operationalEvidenceNote = patch.operationalEvidenceNote
    }

    updated = next

    const event = createComplianceEvent(
      {
        type: eventType,
        entityType: "finding",
        entityId: findingId,
        message: actionTaken
          ? `Risc "${current.title}" -> ${next.findingStatus ?? "?"} (actiune: ${actionTaken})`
          : `Risc "${current.title}" actualizat (status: ${next.findingStatus ?? "?"})`,
        createdAtISO: now,
        metadata: {
          prevStatus: current.findingStatus ?? "open",
          newStatus: next.findingStatus ?? "open",
        },
      },
      actor,
    )

    const newFindings = [...findings]
    newFindings[idx] = next

    return {
      ...state,
      findings: newFindings,
      events: appendComplianceEvents(state, [event]),
    }
  })

  if (notFound) return null
  return updated
}

// ── Delete ───────────────────────────────────────────────────────────────────

export async function deleteFinding(
  orgId: string,
  findingId: string,
  actor: ComplianceEventActorInput,
): Promise<boolean> {
  let removed = false

  await mutateFreshStateForOrg(orgId, (state) => {
    const findings = state.findings ?? []
    const target = findings.find((f) => f.id === findingId)
    if (!target) return state
    removed = true

    const event = createComplianceEvent(
      {
        type: "finding.deleted",
        entityType: "finding",
        entityId: findingId,
        message: `Risc sters: "${target.title}"`,
        createdAtISO: nowISO(),
        metadata: {
          category: target.category,
          severity: target.severity,
        },
      },
      actor,
    )

    return {
      ...state,
      findings: findings.filter((f) => f.id !== findingId),
      events: appendComplianceEvents(state, [event]),
    }
  })

  return removed
}

// ── Attach evidence ──────────────────────────────────────────────────────────

export async function attachEvidence(
  orgId: string,
  findingId: string,
  input: AttachEvidenceInput,
  actor: ComplianceEventActorInput,
): Promise<ScanFinding | null> {
  let updated: ScanFinding | null = null
  let notFound = false

  await mutateFreshStateForOrg(orgId, (state) => {
    const findings = state.findings ?? []
    const idx = findings.findIndex((f) => f.id === findingId)
    if (idx === -1) {
      notFound = true
      return state
    }
    const current = findings[idx]
    const now = nowISO()

    const stampedNote = `[${now}] ${actor.label ?? "system"}: ${input.note}`
    const noteCombined = current.operationalEvidenceNote
      ? `${current.operationalEvidenceNote}\n${stampedNote}`
      : stampedNote

    const next: ScanFinding = {
      ...current,
      operationalEvidenceNote: noteCombined,
      reviewState: current.reviewState === "closed" ? current.reviewState : "evidence_attached",
    }

    const newFindings = [...findings]
    newFindings[idx] = next
    updated = next

    let nextPortal = state.clientPortalDocuments ?? []
    if (input.url || input.fileName) {
      const doc: ClientPortalDocument = {
        id: docUid(),
        findingId,
        fileName: input.fileName || input.url || "evidence",
        contentType: input.url ? "text/uri-list" : "application/octet-stream",
        sizeBytes: 0,
        uploadedByEmail: actor.label,
        uploadedAtISO: now,
        note: input.note,
        storageKey: input.url ?? `local://${findingId}/${input.fileName ?? "evidence"}`,
      }
      nextPortal = [doc, ...nextPortal]
    }

    const event = createComplianceEvent(
      {
        type: "finding.evidence_attached",
        entityType: "finding",
        entityId: findingId,
        message: `Dovada atasata pe "${current.title}"`,
        createdAtISO: now,
        metadata: {
          hasUrl: Boolean(input.url),
          hasFile: Boolean(input.fileName),
        },
      },
      actor,
    )

    return {
      ...state,
      findings: newFindings,
      clientPortalDocuments: nextPortal,
      events: appendComplianceEvents(state, [event]),
    }
  })

  if (notFound) return null
  return updated
}

// ── Convenience: filter for "closed" findings (Dosar tab) ───────────────────

export function isClosedFinding(f: ScanFinding): boolean {
  const status = f.findingStatus ?? "open"
  return status === "resolved" || status === "dismissed"
}

// ── Re-export shape helpers for tests ────────────────────────────────────────

export type { ComplianceState }
