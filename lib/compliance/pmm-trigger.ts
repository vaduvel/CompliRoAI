// Post-Market Monitoring Trigger Detection — Sprint 019 (Art. 72 AI Act).
//
// Pure function: dat un sistem AI, determină DACĂ planul de PMM Art. 72 este
// obligatoriu, DE CE și CARE ESTE CICLUL DE REVIZIE recomandat.
//
// Reguli (per Art. 72(1) proporționalitate + practici Annex III):
//   • system.purpose === "biometric-identification"
//       → REQUIRED + reviewCycleMonths=1 (lunar; categorie specială GDPR Art. 9
//         + riscuri specifice biometric)
//   • system.riskLevel === "high"
//       → REQUIRED + reviewCycleMonths=3 (trimestrial minim pentru high-risk)
//   • system.makesAutomatedDecisions && system.impactsRights
//       → REQUIRED + reviewCycleMonths=3 (trimestrial pentru decizii cu impact)
//   • altfel
//       → RECOMENDAT (nu obligatoriu); reviewCycleMonths=12 (anual)
//
// Urgency:
//   before_use       = înainte de prima utilizare (Art. 72(1) — pre-deployment)
//   periodic_review  = recheck periodic (~90 zile) când plan există
//   none             = nu se aplică

import type { AISystemRecord, PmmReviewCycle } from "@/lib/compliance/types"

export type PmmTriggerUrgency = "before_use" | "periodic_review" | "none"

export type PmmTriggerResult = {
  /** True dacă PMM plan Art. 72 este OBLIGATORIU. */
  pmmRequired: boolean
  /** Explicație în română pentru UI. */
  reason: string
  /** Ciclu recomandat / impus de regulă. */
  recommendedReviewCycle: PmmReviewCycle
  /** Luni între reviews (1 / 3 / 6 / 12). */
  reviewCycleMonths: number
  urgency: PmmTriggerUrgency
  /** Referințe legale care fundamentează decizia. */
  legalReferences: string[]
}

export type EvaluatePmmRequirementInput = {
  system: AISystemRecord
  /** Ultima dată la care s-a aprobat un plan PMM (ISO). */
  lastApprovedISO?: string
}

const PERIODIC_REVIEW_DAYS = 90

const NO_TRIGGER: PmmTriggerResult = {
  pmmRequired: false,
  reason:
    "Sistemul nu este high-risk, nu face decizii automate cu impact și nu este biometric ID. PMM plan recomandat ca bună practică pentru monitorizare anuală, nu obligatoriu.",
  recommendedReviewCycle: "annual",
  reviewCycleMonths: 12,
  urgency: "none",
  legalReferences: ["EU AI Act Art. 72(1)"],
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
export function evaluatePmmRequirement(
  input: EvaluatePmmRequirementInput,
): PmmTriggerResult {
  const { system, lastApprovedISO } = input

  const reasons: string[] = []
  const legalReferences: string[] = ["EU AI Act Art. 72(1)"]
  let recommendedReviewCycle: PmmReviewCycle = "annual"
  let reviewCycleMonths = 12

  // Regula 1 — Biometric ID: review lunar (categorie senzitivă + risc ridicat).
  if (isBiometricId(system)) {
    reasons.push(
      "Sistemul utilizează identificare biometrică (Annex III pt. 1(a)) — Art. 72(1) proporționalitate impune review lunar (categorie GDPR Art. 9 + erori biometrice pot afecta libertatea persoanelor).",
    )
    legalReferences.push("EU AI Act Annex III pct. 1(a)")
    legalReferences.push("GDPR Art. 9 — date biometrice categoria specială")
    recommendedReviewCycle = "monthly"
    reviewCycleMonths = 1
  }

  // Regula 2 — High-risk: review trimestrial minim (Art. 72(1)).
  if (isHighRisk(system)) {
    reasons.push(
      "Sistemul este clasificat HIGH-RISK — Art. 72(1) impune sistem PMM proporțional cu riscul; minim trimestrial pentru sistemele Annex III pe durata vieții (Art. 72(2)).",
    )
    legalReferences.push("EU AI Act Art. 72(2)")
    legalReferences.push("EU AI Act Annex III")
    if (recommendedReviewCycle === "annual") {
      recommendedReviewCycle = "quarterly"
      reviewCycleMonths = 3
    }
  }

  // Regula 3 — Decizii automate cu impact: trimestrial minim.
  if (makesImpactfulDecisions(system)) {
    reasons.push(
      "Sistemul ia decizii automate care impactează drepturile persoanelor — necesită review trimestrial pentru a detecta drift de performanță sau bias (Art. 72(3)(b) evaluare continuă Cap III Sec 2).",
    )
    legalReferences.push("EU AI Act Art. 72(3)(b)")
    legalReferences.push("GDPR Art. 22 — decizii automate")
    if (recommendedReviewCycle === "annual") {
      recommendedReviewCycle = "quarterly"
      reviewCycleMonths = 3
    }
  }

  // Decizia finală
  if (reasons.length === 0) {
    return NO_TRIGGER
  }

  // Urgență
  let urgency: PmmTriggerUrgency = "before_use"
  if (lastApprovedISO) {
    const last = new Date(lastApprovedISO).getTime()
    const days = (Date.now() - last) / 86_400_000
    urgency = days < PERIODIC_REVIEW_DAYS ? "none" : "periodic_review"
  }

  return {
    pmmRequired: true,
    reason: reasons.join(" "),
    recommendedReviewCycle,
    reviewCycleMonths,
    urgency,
    legalReferences: Array.from(new Set(legalReferences)),
  }
}

/**
 * Helper pentru AI Inventory: returnează lista sistemelor care necesită
 * PMM plan dar nu au încă unul în state (folosit pentru banner).
 */
export function findSystemsNeedingPmm(input: {
  systems: AISystemRecord[]
  existingPlanSystemIds: string[]
}): Array<{ system: AISystemRecord; trigger: PmmTriggerResult }> {
  const { systems, existingPlanSystemIds } = input
  const result: Array<{ system: AISystemRecord; trigger: PmmTriggerResult }> = []
  for (const system of systems) {
    if (existingPlanSystemIds.includes(system.id)) continue
    const trigger = evaluatePmmRequirement({ system })
    if (trigger.pmmRequired) {
      result.push({ system, trigger })
    }
  }
  return result
}
