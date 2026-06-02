// Compliance Engine — initial state + normalizers (port Sprint 008A din
// DPO-OS v3-unified, filtrat la subset AI-relevant).
//
// Sursa: `lib/compliance/engine.ts` (1116 LOC) → portate doar funcțiile
// `initialComplianceState` și `normalizeComplianceState`. Restul (simulator,
// dashboard summary cu fiscal/scan, normalizers pentru taskState/snapshots/
// fiscal protocols/drift lifecycle) sunt SKIP — vor veni odată cu modulele
// dependente în sprint-urile viitoare (008B Findings, 008C DPIA/RoPA).

import {
  inferPrinciplesFromCategory,
  normalizeCompliancePrinciples,
  normalizeComplianceSeverity,
  severityToAlertBuckets,
  severityToLegacyRisk,
} from "@/lib/compliance/constitution"
import { normalizeDiscoveryTriggers } from "@/lib/compliance/discovery-trigger-orchestrator"
import type {
  ComplianceAlert,
  ComplianceDriftRecord,
  ComplianceDriftSettings,
  ComplianceEvent,
  ComplianceState,
  ScanFinding,
} from "@/lib/compliance/types"

// ── Initial state (AI-relevant subset) ───────────────────────────────────────
//
// Field-urile required din ComplianceState (cele non-optional) au valori
// default explicite aici. Restul (optional) lipsesc, deci `mergeWithDefault`
// din store.ts decide când le materializează.

export const initialComplianceState: ComplianceState = {
  highRisk: 0,
  lowRisk: 0,
  gdprProgress: 0,
  alerts: [],
  findings: [],
  events: [],
  generatedDocuments: [],
  aiSystems: [],
  aiUseCases: [],
  detectedAISystems: [],
  driftRecords: [],
  driftSettings: { severityOverrides: {} },
  discoveryTriggers: [],
  literacyRecords: [],
  aiGuidancePlans: [],
  onboarding: { completed: false, currentStep: 1 },
}

// ── normalizeComplianceState ─────────────────────────────────────────────────
//
// Defensive coerce pentru state citit din storage (Supabase JSONB sau disk).
// Recalculează highRisk/lowRisk/gdprProgress din findings + alerts.
//
// IMPORTANT — diferențe față de donor (DPO-OS):
//  - NU folosim `task-resolution` (vine în Sprint 008B Findings)
//  - NU folosim `rule-library` pentru lookup ruleId (vine cu Sprint 009)
//  - NU folosim `finding-confidence` (semantic engine — separat)
//  - NU folosim `hr-registry-reconciliation` / `fiscal-protocol` (skip-uite)
//  - NU folosim `signal-detection` / `drift-lifecycle` (vor veni cu engine v2)
//
// Toate findings sunt considerate „unresolved" pentru risk count în 008A.
// Sprint 008B va wire `applyTaskResolutionToAlerts` și
// `getOperationallyClosedFindingIds` peste această funcție.

export function normalizeComplianceState(state: ComplianceState): ComplianceState {
  const findings = (state.findings ?? []).map(normalizeFinding)
  const alerts = (state.alerts ?? []).map(normalizeAlert)
  const events = normalizeEvents(state.events)
  const aiSystems = Array.isArray(state.aiSystems) ? state.aiSystems : []
  const aiUseCases = Array.isArray(state.aiUseCases) ? state.aiUseCases : []
  const detectedAISystems = Array.isArray(state.detectedAISystems) ? state.detectedAISystems : []
  const driftRecords = normalizeDriftRecords(state.driftRecords)
  const driftSettings = normalizeDriftSettings(state.driftSettings)
  const discoveryTriggers = normalizeDiscoveryTriggers(state.discoveryTriggers)
  const generatedDocuments = Array.isArray(state.generatedDocuments)
    ? state.generatedDocuments
    : []
  const literacyRecords = Array.isArray(state.literacyRecords)
    ? state.literacyRecords
    : []

  const highRisk = findings.filter(
    (finding) => finding.severity === "critical" || finding.severity === "high",
  ).length
  const lowRisk = findings.filter(
    (finding) => finding.severity === "medium" || finding.severity === "low",
  ).length

  const openAlerts = alerts.filter((alert) => alert.open)
  const redAlerts = openAlerts.filter((alert) => severityToAlertBuckets(alert.severity).red).length
  const yellowAlerts = openAlerts.filter((alert) => severityToAlertBuckets(alert.severity).yellow).length

  let gdprProgress = 0
  if (findings.length > 0 || alerts.length > 0) {
    gdprProgress = clamp(100 - redAlerts * 20 - yellowAlerts * 8, 0, 100)
  }

  return {
    ...state,
    alerts,
    findings,
    events,
    generatedDocuments,
    aiSystems,
    aiUseCases,
    detectedAISystems,
    driftRecords,
    driftSettings,
    discoveryTriggers,
    literacyRecords,
    highRisk,
    lowRisk,
    gdprProgress,
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function normalizeFinding(finding: ScanFinding): ScanFinding {
  const severity = normalizeComplianceSeverity(
    finding.severity || (finding.risk === "high" ? "high" : "low"),
    "medium",
  )
  const principles = normalizeCompliancePrinciples(
    finding.principles,
    inferPrinciplesFromCategory(finding.category),
  )

  return {
    ...finding,
    severity,
    risk: severityToLegacyRisk(severity),
    principles,
  }
}

function normalizeAlert(alert: ComplianceAlert): ComplianceAlert {
  const severity = normalizeComplianceSeverity(alert.severity, "medium")
  return { ...alert, severity }
}

function normalizeEvents(value: ComplianceEvent[] | undefined): ComplianceEvent[] {
  if (!Array.isArray(value)) return []
  return value.filter((event): event is ComplianceEvent => {
    if (!event || typeof event !== "object") return false
    return (
      typeof event.id === "string" &&
      typeof event.type === "string" &&
      typeof event.entityId === "string" &&
      typeof event.createdAtISO === "string"
    )
  })
}

function normalizeDriftRecords(
  value: ComplianceDriftRecord[] | undefined,
): ComplianceDriftRecord[] {
  if (!Array.isArray(value)) return []
  return value.filter((record): record is ComplianceDriftRecord => {
    if (!record || typeof record !== "object") return false
    return typeof record.id === "string" && typeof record.snapshotId === "string"
  })
}

function normalizeDriftSettings(
  value: ComplianceDriftSettings | undefined,
): ComplianceDriftSettings {
  if (!value || typeof value !== "object") return { severityOverrides: {} }
  const rawOverrides =
    value.severityOverrides && typeof value.severityOverrides === "object"
      ? value.severityOverrides
      : {}
  return {
    severityOverrides: Object.fromEntries(
      Object.entries(rawOverrides).flatMap(([change, severity]) =>
        severity === "critical" ||
        severity === "high" ||
        severity === "medium" ||
        severity === "low"
          ? [[change, severity]]
          : [],
      ),
    ),
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}
