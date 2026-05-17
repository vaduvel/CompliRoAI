// Human Oversight Trigger Detection — Sprint 017 (Art. 14 AI Act).
//
// Pure function: dat un sistem AI, determină DACĂ protocolul Art. 14 este
// obligatoriu, DE CE și CU CE URGENȚĂ + dacă cere two_person_rule (4-eyes).
//
// Reguli (per Art. 14):
//   • system.riskLevel === "high"
//       → REQUIRED before_use; modelul recomandat depinde de purpose
//   • system.purpose === "biometric-identification"
//       → REQUIRED before_use + two_person_rule OBLIGATORIU (Art. 14(4))
//   • system.makesAutomatedDecisions && system.impactsRights
//       → REQUIRED before_use; minim human_on_the_loop
//   • altfel
//       → RECOMENDAT (nu obligatoriu); Art. 14 nu impune protocol pentru
//         minimal/limited risk fără impact decizional
//
// Urgență:
//   before_use     = înainte de prima utilizare (Art. 14(1) — design phase)
//   periodic_review = recheck periodic (~6 luni) când protocol există
//   none           = nu se aplică

import type {
  AISystemRecord,
  OversightModel,
} from "@/lib/compliance/types"

export type OversightTriggerUrgency =
  | "before_use"
  | "periodic_review"
  | "none"

export type OversightTriggerResult = {
  /** True dacă protocolul Art. 14 este OBLIGATORIU. */
  oversightRequired: boolean
  /** Explicație în română pentru UI. */
  reason: string
  /** Modelul de oversight recomandat / impus. */
  recommendedModel: OversightModel
  /** Two-person rule (Art. 14(4)) impus pentru biometric ID. */
  twoPersonRuleRequired: boolean
  urgency: OversightTriggerUrgency
  /** Referințe legale care fundamentează decizia. */
  legalReferences: string[]
}

export type EvaluateOversightRequirementInput = {
  system: AISystemRecord
  /** Ultima dată la care s-a aprobat un protocol pentru sistem (ISO). */
  lastApprovedISO?: string
}

const PERIODIC_REVIEW_DAYS = 180

const NO_TRIGGER: OversightTriggerResult = {
  oversightRequired: false,
  reason:
    "Sistemul nu este high-risk și nu face decizii automate cu impact asupra drepturilor. Protocol Art. 14 recomandat ca bună practică, nu obligatoriu.",
  recommendedModel: "human_on_the_loop",
  twoPersonRuleRequired: false,
  urgency: "none",
  legalReferences: ["EU AI Act Art. 14(1)"],
}

/**
 * Verifică dacă sistemul AI cere protocol Art. 14 obligatoriu.
 */
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
export function evaluateOversightRequirement(
  input: EvaluateOversightRequirementInput,
): OversightTriggerResult {
  const { system, lastApprovedISO } = input

  // Acumulatorii pentru explicații + referințe.
  const reasons: string[] = []
  const legalReferences: string[] = ["EU AI Act Art. 14"]
  let recommendedModel: OversightModel = "human_on_the_loop"
  let twoPersonRuleRequired = false

  // Regula 1 — Biometric ID: Art. 14(4) impune obligatoriu two_person_rule.
  if (isBiometricId(system)) {
    reasons.push(
      "Sistemul utilizează identificare biometrică — Art. 14(4) impune confirmarea de către DOUĂ persoane (4-eyes) înainte de orice acțiune.",
    )
    legalReferences.push("EU AI Act Art. 14(4)")
    recommendedModel = "two_person_rule"
    twoPersonRuleRequired = true
  }

  // Regula 2 — High-risk: cere protocol Art. 14 înainte de prima utilizare.
  if (isHighRisk(system)) {
    reasons.push(
      "Sistemul este clasificat HIGH-RISK (Annex III) — protocol Art. 14 obligatoriu înainte de prima utilizare.",
    )
    legalReferences.push("EU AI Act Art. 14(1) + Art. 14(2)")
    if (!twoPersonRuleRequired) {
      recommendedModel =
        recommendedModel === "human_on_the_loop"
          ? "human_in_the_loop"
          : recommendedModel
    }
  }

  // Regula 3 — Decizii automate cu impact asupra drepturilor (Art. 22 GDPR
  // overlap): cere minim oversight pe pipeline + override.
  if (makesImpactfulDecisions(system)) {
    reasons.push(
      "Sistemul ia decizii automate care impactează drepturile persoanelor — necesită mecanism de override + contestație (Art. 14(3)(d) + GDPR Art. 22).",
    )
    legalReferences.push("EU AI Act Art. 14(3)(d) + GDPR Art. 22")
    if (recommendedModel === "human_on_the_loop") {
      // Escaladăm la HITL când decizia chiar lovește drepturi.
      recommendedModel = "human_in_the_loop"
    }
  }

  // Decizia finală
  if (reasons.length === 0) {
    return NO_TRIGGER
  }

  // Urgență: dacă există un protocol aprobat <6 luni → periodic_review
  // (sau urgență scăzută), altfel before_use.
  let urgency: OversightTriggerUrgency = "before_use"
  if (lastApprovedISO) {
    const last = new Date(lastApprovedISO).getTime()
    const days = (Date.now() - last) / 86_400_000
    urgency = days < PERIODIC_REVIEW_DAYS ? "none" : "periodic_review"
  }

  return {
    oversightRequired: true,
    reason: reasons.join(" "),
    recommendedModel,
    twoPersonRuleRequired,
    urgency,
    legalReferences: Array.from(new Set(legalReferences)),
  }
}

/**
 * Helper pentru AI Inventory: returnează lista sistemelor care necesită
 * protocol oversight dar nu au încă unul aprobat (folosit pentru banner).
 */
export function findSystemsNeedingOversight(input: {
  systems: AISystemRecord[]
  existingProtocolSystemIds: string[]
}): Array<{ system: AISystemRecord; trigger: OversightTriggerResult }> {
  const { systems, existingProtocolSystemIds } = input
  const result: Array<{ system: AISystemRecord; trigger: OversightTriggerResult }> = []
  for (const system of systems) {
    if (existingProtocolSystemIds.includes(system.id)) continue
    const trigger = evaluateOversightRequirement({ system })
    if (trigger.oversightRequired) {
      result.push({ system, trigger })
    }
  }
  return result
}
