// Logging Evidence Trigger Detection — Sprint 018 (Art. 12 + Art. 26(6) AI Act).
//
// Pure function: dat un sistem AI, determină DACĂ config-ul de logging Art. 12
// este obligatoriu, DE CE, cu CE SEVERITY nivel și CÂT RETENȚIE minimă cerută.
//
// Reguli (per Art. 12 + Art. 26(6)):
//   • system.purpose === "biometric-identification"
//       → REQUIRED + severityLevel="biometric_full" + minRetentionMonths=12
//         (Art. 12(3) integral + GDPR Art. 9 sensitive data)
//   • system.makesAutomatedDecisions && system.impactsRights
//       → REQUIRED + severityLevel="enhanced" + minRetentionMonths=12
//         (Art. 12(2) + GDPR Art. 22 + drepturile fundamentale)
//   • system.riskLevel === "high"
//       → REQUIRED + severityLevel="standard" (sau enhanced) + minRetentionMonths=6
//         (Art. 12(1))
//   • altfel
//       → RECOMENDAT (nu obligatoriu); severityLevel="minimal"; minRetentionMonths=3
//
// Urgency:
//   before_use       = înainte de prima utilizare (Art. 12(1) — design phase)
//   periodic_review  = recheck periodic (~90 zile) când config există
//   none             = nu se aplică

import type {
  AISystemRecord,
  LoggingSeverityLevel,
} from "@/lib/compliance/types"

export type LoggingTriggerUrgency = "before_use" | "periodic_review" | "none"

export type LoggingTriggerResult = {
  /** True dacă config Art. 12 este OBLIGATORIU. */
  loggingRequired: boolean
  /** Explicație în română pentru UI. */
  reason: string
  /** Severity recomandat / impus. */
  recommendedSeverityLevel: LoggingSeverityLevel
  /** Retenție minimă (luni) cerută per Art. 26(6) + overlay GDPR/sectorial. */
  minRetentionMonths: number
  /** True pentru Annex III 1(a) — Art. 12(3) integral. */
  biometricFullRequired: boolean
  urgency: LoggingTriggerUrgency
  /** Referințe legale care fundamentează decizia. */
  legalReferences: string[]
}

export type EvaluateLoggingRequirementInput = {
  system: AISystemRecord
  /** Ultima dată la care s-a aprobat un config pentru sistem (ISO). */
  lastApprovedISO?: string
}

const PERIODIC_REVIEW_DAYS = 90

const NO_TRIGGER: LoggingTriggerResult = {
  loggingRequired: false,
  reason:
    "Sistemul nu este high-risk, nu face decizii automate cu impact și nu este biometric ID. Config Art. 12 recomandat ca bună practică, nu obligatoriu.",
  recommendedSeverityLevel: "minimal",
  minRetentionMonths: 3,
  biometricFullRequired: false,
  urgency: "none",
  legalReferences: ["EU AI Act Art. 12(1)"],
}

function isHighRisk(system: AISystemRecord): boolean {
  return system.riskLevel === "high"
}

function isBiometricId(system: AISystemRecord): boolean {
  return system.purpose === "biometric-identification"
}

function makesImpactfulDecisions(system: AISystemRecord): boolean {
  return system.makesAutomatedDecisions && system.impactsRights
}

/**
 * Funcția principală — returnează decizia de trigger.
 */
export function evaluateLoggingRequirement(
  input: EvaluateLoggingRequirementInput,
): LoggingTriggerResult {
  const { system, lastApprovedISO } = input

  const reasons: string[] = []
  const legalReferences: string[] = ["EU AI Act Art. 12"]
  let recommendedSeverityLevel: LoggingSeverityLevel = "minimal"
  let minRetentionMonths = 3
  let biometricFullRequired = false

  // Regula 1 — Biometric ID: Art. 12(3) integral OBLIGATORIU.
  if (isBiometricId(system)) {
    reasons.push(
      "Sistemul utilizează identificare biometrică (Annex III pt. 1(a)) — Art. 12(3) impune logging integral: (a) perioadă utilizare; (b) bază date referință; (c) input data; (d) operatori implicați.",
    )
    legalReferences.push("EU AI Act Art. 12(3)")
    legalReferences.push("GDPR Art. 9 — date biometrice categoria specială")
    recommendedSeverityLevel = "biometric_full"
    minRetentionMonths = 12
    biometricFullRequired = true
  }

  // Regula 2 — Decizii automate cu impact: necesită enhanced + 12 luni.
  if (makesImpactfulDecisions(system)) {
    reasons.push(
      "Sistemul ia decizii automate care impactează drepturile persoanelor — Art. 12(2) cere logging extins pentru audit + Art. 26(6) cu overlay GDPR Art. 22 cere retenție de 12 luni.",
    )
    legalReferences.push("EU AI Act Art. 12(2)")
    legalReferences.push("GDPR Art. 22 — decizii automate")
    if (!biometricFullRequired) {
      recommendedSeverityLevel = "enhanced"
      minRetentionMonths = Math.max(minRetentionMonths, 12)
    }
  }

  // Regula 3 — High-risk: cere logging Art. 12 standard + min 6 luni.
  if (isHighRisk(system)) {
    reasons.push(
      "Sistemul este clasificat HIGH-RISK — Art. 12(1) impune logging automat de evenimente pentru identificarea situațiilor de risc Art. 79(1).",
    )
    legalReferences.push("EU AI Act Art. 12(1)")
    legalReferences.push("EU AI Act Art. 26(6)")
    if (recommendedSeverityLevel === "minimal") {
      recommendedSeverityLevel = "standard"
    }
    minRetentionMonths = Math.max(minRetentionMonths, 6)
  }

  // Decizia finală
  if (reasons.length === 0) {
    return NO_TRIGGER
  }

  // Urgență
  let urgency: LoggingTriggerUrgency = "before_use"
  if (lastApprovedISO) {
    const last = new Date(lastApprovedISO).getTime()
    const days = (Date.now() - last) / 86_400_000
    urgency = days < PERIODIC_REVIEW_DAYS ? "none" : "periodic_review"
  }

  return {
    loggingRequired: true,
    reason: reasons.join(" "),
    recommendedSeverityLevel,
    minRetentionMonths,
    biometricFullRequired,
    urgency,
    legalReferences: Array.from(new Set(legalReferences)),
  }
}

/**
 * Helper pentru AI Inventory: returnează lista sistemelor care necesită
 * config logging dar nu au încă unul în state (folosit pentru banner).
 */
export function findSystemsNeedingLogging(input: {
  systems: AISystemRecord[]
  existingConfigSystemIds: string[]
}): Array<{ system: AISystemRecord; trigger: LoggingTriggerResult }> {
  const { systems, existingConfigSystemIds } = input
  const result: Array<{ system: AISystemRecord; trigger: LoggingTriggerResult }> = []
  for (const system of systems) {
    if (existingConfigSystemIds.includes(system.id)) continue
    const trigger = evaluateLoggingRequirement({ system })
    if (trigger.loggingRequired) {
      result.push({ system, trigger })
    }
  }
  return result
}
