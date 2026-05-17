// Constituția semnalelor de conformitate (port Sprint 008A din DPO-OS v3-unified).
//
// Definește severitatea + principiile de bază folosite de toate modulele care
// emit findings (DPIA, RoPA, Breach, AI Data Discovery, Vendor Review etc.).
// Port verbatim, plus alinierea categoriilor la mapping-ul CompliRoAI
// (`EU_AI_ACT`, `GDPR`, `E_FACTURA`, `NIS2`).

import type { FindingCategory } from "@/lib/compliance/types"

export type ComplianceSeverity = "critical" | "high" | "medium" | "low"

export type CompliancePrinciple =
  | "oversight"
  | "robustness"
  | "privacy_data_governance"
  | "transparency"
  | "fairness"
  | "accountability"

export const COMPLIANCE_PRINCIPLES: CompliancePrinciple[] = [
  "oversight",
  "robustness",
  "privacy_data_governance",
  "transparency",
  "fairness",
  "accountability",
]

export function normalizeComplianceSeverity(
  value: unknown,
  fallback: ComplianceSeverity = "medium"
): ComplianceSeverity {
  return value === "critical" || value === "high" || value === "medium" || value === "low"
    ? value
    : fallback
}

export function isCompliancePrinciple(value: unknown): value is CompliancePrinciple {
  return COMPLIANCE_PRINCIPLES.includes(value as CompliancePrinciple)
}

export function normalizeCompliancePrinciples(
  values: unknown,
  fallback: CompliancePrinciple[]
): CompliancePrinciple[] {
  if (!Array.isArray(values)) return [...fallback]
  const normalized = values.filter(isCompliancePrinciple)
  return normalized.length > 0 ? [...new Set(normalized)] : [...fallback]
}

export function severityToLegacyRisk(severity: ComplianceSeverity): "high" | "low" {
  return severity === "critical" || severity === "high" ? "high" : "low"
}

export function severityToTaskPriority(severity: ComplianceSeverity): "P1" | "P2" | "P3" {
  if (severity === "critical" || severity === "high") return "P1"
  if (severity === "medium") return "P2"
  return "P3"
}

export function severityToTaskConfidence(severity: ComplianceSeverity): "high" | "med" | "low" {
  if (severity === "critical" || severity === "high") return "high"
  if (severity === "medium") return "med"
  return "low"
}

export function severityToAlertBuckets(severity: ComplianceSeverity) {
  return {
    red: severity === "critical" || severity === "high",
    yellow: severity === "medium",
  }
}

export function inferPrinciplesFromCategory(category: FindingCategory): CompliancePrinciple[] {
  if (category === "GDPR") return ["privacy_data_governance", "accountability"]
  if (category === "E_FACTURA") return ["accountability", "robustness"]
  if (category === "NIS2") return ["robustness", "accountability", "oversight"]
  return ["oversight", "transparency", "accountability"]
}

export function summarizePrinciples(principles: CompliancePrinciple[]) {
  return principles.map(formatPrincipleLabel).join(" · ")
}

export function formatPrincipleLabel(principle: CompliancePrinciple) {
  if (principle === "privacy_data_governance") return "Privacy"
  if (principle === "oversight") return "Oversight"
  if (principle === "robustness") return "Robustness"
  if (principle === "transparency") return "Transparency"
  if (principle === "fairness") return "Fairness"
  return "Accountability"
}
