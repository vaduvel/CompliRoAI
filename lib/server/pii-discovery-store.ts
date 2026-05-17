/**
 * Sprint 009 — PII Discovery store (persist scan results +
 * auto-emit findings pentru high-confidence + events).
 *
 * Pattern conform 008C/D (DPIA / Breach store).
 *
 * Surface API:
 *   - readPIIDetections(orgId) -> { detections, summary }
 *   - getPIIDetection(orgId, id)
 *   - analyzePIIWithoutSaving(input) -> PIIDiscoveryResult (NU persistă)
 *   - createPIIDetection(orgId, input, actor)
 *     -> scan + persist + auto-finding daca high-confidence + event
 *   - deletePIIDetection(orgId, id, actor)
 */

import {
  appendComplianceEvents,
  createComplianceEvent,
  type ComplianceEventActorInput,
} from "@/lib/compliance/events"
import { mutateFreshStateForOrg, readState } from "@/lib/server/store"
import { createFinding } from "@/lib/server/findings-store"
import {
  scanPIIBlob,
  type PIIDiscoveryInput,
  type PIIDiscoveryResult,
} from "@/lib/compliance/pii-discovery"
import type { PIIDetection } from "@/lib/compliance/types"

// ────────────────────────────────────────────────────────────────────────────
//   Types
// ────────────────────────────────────────────────────────────────────────────

export type PIIDetectionSummary = {
  total: number
  totalCategoriesFound: number
  withFindings: number
  highConfidence: number
}

export type CreatePIIDetectionInput = {
  sourceLabel: string
  text: string
  notes?: string
}

// ────────────────────────────────────────────────────────────────────────────
//   Helpers
// ────────────────────────────────────────────────────────────────────────────

function nowISO(): string {
  return new Date().toISOString()
}

function uid(): string {
  return `pii-${Math.random().toString(36).slice(2, 10)}`
}

// ────────────────────────────────────────────────────────────────────────────
//   Summary
// ────────────────────────────────────────────────────────────────────────────

export function summarizePIIDetections(detections: PIIDetection[]): PIIDetectionSummary {
  let totalCategoriesFound = 0
  let withFindings = 0
  let highConfidence = 0
  for (const detection of detections) {
    totalCategoriesFound += detection.categories.length
    if (detection.linkedFindingId) withFindings++
    if (detection.categories.some((cat) => cat.confidence === "high")) highConfidence++
  }
  return {
    total: detections.length,
    totalCategoriesFound,
    withFindings,
    highConfidence,
  }
}

// ────────────────────────────────────────────────────────────────────────────
//   Read
// ────────────────────────────────────────────────────────────────────────────

export async function readPIIDetections(_orgId?: string): Promise<{
  detections: PIIDetection[]
  summary: PIIDetectionSummary
}> {
  const state = await readState()
  const detections = (state.piiDetections ?? []) as PIIDetection[]
  return { detections, summary: summarizePIIDetections(detections) }
}

export async function getPIIDetection(
  _orgId: string,
  id: string,
): Promise<PIIDetection | null> {
  const state = await readState()
  const detections = (state.piiDetections ?? []) as PIIDetection[]
  return detections.find((d) => d.id === id) ?? null
}

// ────────────────────────────────────────────────────────────────────────────
//   Analyze without saving — pentru endpoint /analyze
// ────────────────────────────────────────────────────────────────────────────

export function analyzePIIWithoutSaving(input: PIIDiscoveryInput): PIIDiscoveryResult {
  return scanPIIBlob(input)
}

// ────────────────────────────────────────────────────────────────────────────
//   Create — scan + persist + auto-finding daca high-confidence
// ────────────────────────────────────────────────────────────────────────────

export async function createPIIDetection(
  orgId: string,
  input: CreatePIIDetectionInput,
  actor: ComplianceEventActorInput,
): Promise<{ detection: PIIDetection; linkedFindingId?: string }> {
  const sourceLabel = input.sourceLabel?.trim() || "Document fara label"
  const text = input.text ?? ""
  if (!text) throw new Error("PII Discovery: text required")

  const now = nowISO()
  const result = scanPIIBlob({ sourceLabel, text }, now)
  const detectionId = uid()

  // 1) Emit finding daca scanner a propus unul
  let linkedFindingId: string | undefined
  if (result.candidateFinding) {
    const created = await createFinding(orgId, result.candidateFinding, actor)
    linkedFindingId = created.id
  }

  // 2) Persist detection + event
  let persisted: PIIDetection | null = null
  await mutateFreshStateForOrg(orgId, (state) => {
    const detection: PIIDetection = {
      id: detectionId,
      orgId,
      sourceLabel,
      scannedAtISO: result.scannedAtISO,
      detectionCount: result.detectionCount,
      categories: result.categories,
      linkedFindingId,
      notes: input.notes?.trim() || undefined,
    }
    persisted = detection

    const event = createComplianceEvent(
      {
        type: "pii-discovery.scan.created",
        entityType: "system",
        entityId: detection.id,
        message: `PII scan: "${sourceLabel}" - ${result.detectionCount} detectari, risc ${result.riskLevel}`,
        createdAtISO: now,
        metadata: {
          sourceLabel,
          detectionCount: result.detectionCount,
          riskLevel: result.riskLevel,
          categoryCount: result.categories.length,
          linkedFindingId: linkedFindingId ?? "",
        },
      },
      actor,
    )

    return {
      ...state,
      piiDetections: [detection, ...(state.piiDetections ?? [])].slice(0, 100),
      events: appendComplianceEvents(state, [event]),
    }
  })

  if (!persisted) throw new Error("createPIIDetection: mutator did not produce a detection")
  return { detection: persisted, linkedFindingId }
}

// ────────────────────────────────────────────────────────────────────────────
//   Delete
// ────────────────────────────────────────────────────────────────────────────

export async function deletePIIDetection(
  orgId: string,
  id: string,
  actor: ComplianceEventActorInput,
): Promise<boolean> {
  let deleted = false
  await mutateFreshStateForOrg(orgId, (state) => {
    const detections = (state.piiDetections ?? []) as PIIDetection[]
    const idx = detections.findIndex((d) => d.id === id)
    if (idx === -1) return state
    const current = detections[idx]
    if (!current) return state
    const next = detections.filter((d) => d.id !== id)
    deleted = true

    const event = createComplianceEvent(
      {
        type: "pii-discovery.scan.deleted",
        entityType: "system",
        entityId: id,
        message: `PII scan sters: "${current.sourceLabel}"`,
        createdAtISO: nowISO(),
      },
      actor,
    )

    return {
      ...state,
      piiDetections: next,
      events: appendComplianceEvents(state, [event]),
    }
  })
  return deleted
}
