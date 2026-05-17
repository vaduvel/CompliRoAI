// Discovery Trigger Orchestrator (port Sprint 008A din DPO-OS v3-unified).
//
// Centralizează trigger-ele emise de modulele DPO (DPIA, RoPA, AI Discovery,
// Vendor, Site Scan, Workshop, Client Intake, DSAR, Breach, Training) și le
// transformă în acțiuni concrete cu SLA, owner, evidence requirement.
//
// În Sprint 008A păstrăm:
//  - mergeDiscoveryTriggers / mergeDiscoveryFindings (logică pură, fără I/O)
//  - normalizeDiscoveryTriggers (defensive parsing pentru state vechi)
//  - orchestrateDiscoveryTriggers (entry point pentru cockpit cu stats)
//  - collectDiscoveryTriggers stub (signature păstrată, body gol — workshop
//    și ropa coexistă cu acest orchestrator când vin în Sprint 008C).
//
// Sursele `dpo-discovery-workshop` și `ropa-risk-engine` NU sunt importate
// aici încă — se vor wire în Sprint 008C odată cu DPIA/RoPA.

import type { ComplianceSeverity } from "@/lib/compliance/constitution"
import type { ScanFinding } from "@/lib/compliance/types"

export type DiscoveryTriggerSource =
  | "workshop"
  | "ropa"
  | "client-intake"
  | "site-scan"
  | "document-scan"
  | "vendor"
  | "ai-data"
  | "dsar"
  | "breach"
  | "training"

export type DiscoveryTriggerOwnerRole =
  | "dpo"
  | "client_contact"
  | "it"
  | "hr"
  | "finance"
  | "marketing"
  | "operations"

export type DiscoveryTriggerStatus = "candidate" | "accepted" | "dismissed" | "completed"
export type DiscoveryTriggerReviewStatus = "needs_dpo_review" | "accepted" | "dismissed"
export type DiscoveryTriggerReportImpact = "monthly_report" | "audit_pack" | "both" | "none"
export type DiscoveryTriggerConfidence = "client_claim" | "dpo_confirmed" | "document_verified"

export type DiscoveryTriggerRecord = {
  id: string
  orgId?: string
  source: DiscoveryTriggerSource
  sourceId: string
  sourceLabel: string
  conditionLabel: string
  actionType: string
  targetModule: string
  severity: ComplianceSeverity
  ownerRole: DiscoveryTriggerOwnerRole
  slaDays?: number
  dueAtISO?: string
  evidenceRequired: string
  reportImpact: DiscoveryTriggerReportImpact
  findingIds: string[]
  status: DiscoveryTriggerStatus
  reviewStatus: DiscoveryTriggerReviewStatus
  confidence: DiscoveryTriggerConfidence
  createdAtISO: string
  updatedAtISO: string
}

export type DiscoveryTriggerRun = {
  triggers: DiscoveryTriggerRecord[]
  newTriggers: DiscoveryTriggerRecord[]
  duplicateTriggerIds: string[]
  stats: {
    total: number
    new: number
    accepted: number
    needsReview: number
    highOrCritical: number
  }
}

/**
 * Stub Sprint 008A — adapter-ele workshop/ropa vor fi adăugate în 008C
 * când portăm dpo-discovery-workshop și ropa-risk-engine.
 *
 * Signature minimal: acceptă `orgId` și `nowISO`, returnează listă goală.
 * Codul caller (cockpit hook) trebuie să tolereze listă vidă fără să crape.
 */
export function collectDiscoveryTriggers(_input: {
  orgId?: string
  nowISO?: string
  accepted?: boolean
}): DiscoveryTriggerRecord[] {
  return []
}

export function orchestrateDiscoveryTriggers(input: {
  existingTriggers?: DiscoveryTriggerRecord[]
  incomingTriggers: DiscoveryTriggerRecord[]
  nowISO?: string
}): DiscoveryTriggerRun {
  const nowISO = input.nowISO ?? new Date().toISOString()
  const existing = normalizeDiscoveryTriggers(input.existingTriggers ?? [])
  const incoming = dedupeTriggers(input.incomingTriggers)
  const existingIds = new Set(existing.map((trigger) => trigger.id))
  const newTriggers = incoming.filter((trigger) => !existingIds.has(trigger.id))
  const duplicateTriggerIds = incoming
    .filter((trigger) => existingIds.has(trigger.id))
    .map((trigger) => trigger.id)
  const merged = mergeDiscoveryTriggers(existing, incoming, nowISO)

  return {
    triggers: merged,
    newTriggers,
    duplicateTriggerIds,
    stats: {
      total: merged.length,
      new: newTriggers.length,
      accepted: merged.filter((trigger) => trigger.reviewStatus === "accepted").length,
      needsReview: merged.filter((trigger) => trigger.reviewStatus === "needs_dpo_review").length,
      highOrCritical: merged.filter((trigger) => trigger.severity === "critical" || trigger.severity === "high").length,
    },
  }
}

export function mergeDiscoveryTriggers(
  existingTriggers: DiscoveryTriggerRecord[],
  incomingTriggers: DiscoveryTriggerRecord[],
  nowISO = new Date().toISOString(),
): DiscoveryTriggerRecord[] {
  const byId = new Map(normalizeDiscoveryTriggers(existingTriggers).map((trigger) => [trigger.id, trigger]))

  for (const incoming of normalizeDiscoveryTriggers(incomingTriggers)) {
    const previous = byId.get(incoming.id)
    if (!previous) {
      byId.set(incoming.id, incoming)
      continue
    }

    const locked = previous.status === "completed" || previous.status === "dismissed"
    byId.set(incoming.id, {
      ...previous,
      conditionLabel: incoming.conditionLabel,
      actionType: incoming.actionType,
      targetModule: incoming.targetModule,
      severity: incoming.severity,
      ownerRole: incoming.ownerRole,
      slaDays: incoming.slaDays,
      dueAtISO: previous.dueAtISO ?? incoming.dueAtISO,
      evidenceRequired: incoming.evidenceRequired,
      reportImpact: incoming.reportImpact,
      findingIds: Array.from(new Set([...previous.findingIds, ...incoming.findingIds])),
      status: locked ? previous.status : promoteStatus(previous.status, incoming.status),
      reviewStatus: locked ? previous.reviewStatus : promoteReview(previous.reviewStatus, incoming.reviewStatus),
      confidence: promoteConfidence(previous.confidence, incoming.confidence),
      updatedAtISO: nowISO,
    })
  }

  return Array.from(byId.values()).sort(sortTriggers)
}

export function mergeDiscoveryFindings(
  existingFindings: ScanFinding[],
  incomingFindings: ScanFinding[],
): ScanFinding[] {
  const byId = new Map(existingFindings.map((finding) => [finding.id, finding]))
  for (const finding of incomingFindings) {
    const previous = byId.get(finding.id)
    byId.set(finding.id, {
      ...finding,
      ...(previous
        ? {
            findingStatus: previous.findingStatus,
            findingStatusUpdatedAtISO: previous.findingStatusUpdatedAtISO,
            reviewState: previous.reviewState,
            operationalEvidenceNote: previous.operationalEvidenceNote,
          }
        : {
            findingStatus: "confirmed" as const,
            findingStatusUpdatedAtISO: finding.createdAtISO,
            reviewState: "confirmed" as const,
          }),
    })
  }
  return Array.from(byId.values())
}

export function normalizeDiscoveryTriggers(value: unknown): DiscoveryTriggerRecord[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return []
    const candidate = item as Partial<DiscoveryTriggerRecord>
    const id = cleanString(candidate.id)
    const source = normalizeSource(candidate.source)
    const sourceId = cleanString(candidate.sourceId)
    const conditionLabel = cleanString(candidate.conditionLabel)
    const targetModule = cleanString(candidate.targetModule)
    const evidenceRequired = cleanString(candidate.evidenceRequired)
    const createdAtISO = isIso(candidate.createdAtISO) ? candidate.createdAtISO! : new Date().toISOString()
    const updatedAtISO = isIso(candidate.updatedAtISO) ? candidate.updatedAtISO! : createdAtISO
    if (!id || !source || !sourceId || !conditionLabel || !targetModule || !evidenceRequired) return []
    return [{
      id,
      orgId: cleanString(candidate.orgId) || undefined,
      source,
      sourceId,
      sourceLabel: cleanString(candidate.sourceLabel) || sourceLabel(source),
      conditionLabel,
      actionType: cleanString(candidate.actionType) || targetModule,
      targetModule,
      severity: normalizeSeverity(candidate.severity),
      ownerRole: normalizeOwner(candidate.ownerRole),
      slaDays: typeof candidate.slaDays === "number" && candidate.slaDays > 0 ? Math.round(candidate.slaDays) : undefined,
      dueAtISO: isIso(candidate.dueAtISO) ? candidate.dueAtISO : undefined,
      evidenceRequired,
      reportImpact: normalizeReportImpact(candidate.reportImpact),
      findingIds: cleanList(candidate.findingIds),
      status: normalizeStatus(candidate.status),
      reviewStatus: normalizeReview(candidate.reviewStatus),
      confidence: normalizeConfidence(candidate.confidence),
      createdAtISO,
      updatedAtISO,
    }]
  })
}

function promoteStatus(previous: DiscoveryTriggerStatus, incoming: DiscoveryTriggerStatus): DiscoveryTriggerStatus {
  if (previous === "completed" || previous === "dismissed") return previous
  if (incoming === "accepted" || previous === "accepted") return "accepted"
  return incoming
}

function promoteReview(previous: DiscoveryTriggerReviewStatus, incoming: DiscoveryTriggerReviewStatus): DiscoveryTriggerReviewStatus {
  if (previous === "dismissed") return previous
  if (incoming === "accepted" || previous === "accepted") return "accepted"
  return incoming
}

function promoteConfidence(
  previous: DiscoveryTriggerConfidence,
  incoming: DiscoveryTriggerConfidence,
): DiscoveryTriggerConfidence {
  const rank: Record<DiscoveryTriggerConfidence, number> = {
    client_claim: 1,
    dpo_confirmed: 2,
    document_verified: 3,
  }
  return rank[incoming] > rank[previous] ? incoming : previous
}

function dedupeTriggers(triggers: DiscoveryTriggerRecord[]): DiscoveryTriggerRecord[] {
  return mergeDiscoveryTriggers([], triggers)
}

function sortTriggers(left: DiscoveryTriggerRecord, right: DiscoveryTriggerRecord): number {
  const severityRank: Record<ComplianceSeverity, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  }
  return severityRank[left.severity] - severityRank[right.severity] ||
    (left.dueAtISO ?? "9999").localeCompare(right.dueAtISO ?? "9999") ||
    left.createdAtISO.localeCompare(right.createdAtISO)
}

function normalizeSource(value: unknown): DiscoveryTriggerSource | null {
  if (
    value === "workshop" ||
    value === "ropa" ||
    value === "client-intake" ||
    value === "site-scan" ||
    value === "document-scan" ||
    value === "vendor" ||
    value === "ai-data" ||
    value === "dsar" ||
    value === "breach" ||
    value === "training"
  ) {
    return value
  }
  return null
}

function normalizeSeverity(value: unknown): ComplianceSeverity {
  if (value === "critical" || value === "high" || value === "medium" || value === "low") return value
  return "medium"
}

function normalizeOwner(value: unknown): DiscoveryTriggerOwnerRole {
  if (
    value === "dpo" ||
    value === "client_contact" ||
    value === "it" ||
    value === "hr" ||
    value === "finance" ||
    value === "marketing" ||
    value === "operations"
  ) {
    return value
  }
  return "dpo"
}

function normalizeReportImpact(value: unknown): DiscoveryTriggerReportImpact {
  if (value === "monthly_report" || value === "audit_pack" || value === "both" || value === "none") return value
  return "both"
}

function normalizeStatus(value: unknown): DiscoveryTriggerStatus {
  if (value === "accepted" || value === "dismissed" || value === "completed" || value === "candidate") return value
  return "candidate"
}

function normalizeReview(value: unknown): DiscoveryTriggerReviewStatus {
  if (value === "accepted" || value === "dismissed" || value === "needs_dpo_review") return value
  return "needs_dpo_review"
}

function normalizeConfidence(value: unknown): DiscoveryTriggerConfidence {
  if (value === "client_claim" || value === "dpo_confirmed" || value === "document_verified") return value
  return "dpo_confirmed"
}

function sourceLabel(source: DiscoveryTriggerSource): string {
  const labels: Record<DiscoveryTriggerSource, string> = {
    workshop: "DPO Discovery Workshop",
    ropa: "RoPA/Data Map viu",
    "client-intake": "Client Intake Magic Link",
    "site-scan": "Website scan",
    "document-scan": "Document scan",
    vendor: "Vendor review",
    "ai-data": "AI Data Discovery",
    dsar: "DSAR",
    breach: "Breach",
    training: "Training",
  }
  return labels[source]
}

function cleanList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return Array.from(new Set(value.map((item) => cleanString(item)).filter(Boolean))).slice(0, 50)
}

function cleanString(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

function isIso(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value))
}
