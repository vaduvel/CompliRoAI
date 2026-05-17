// FRIA Trigger Detection — Sprint 016 (Art. 27 AI Act).
//
// Pure function: dat un sistem AI + profilul regulator al organizației,
// determină DACĂ FRIA este obligatoriu, DE CE și CU CE URGENȚĂ.
//
// Reguli (per Art. 27(1)):
//   (a) public_body sau private_public_service folosind sistem high-risk
//       → REQUIRED before_use
//   (b) credit_assessment deployer (Annex III pt. 5(b))
//       → REQUIRED before_use (pentru orice scor de credit)
//   (b) life_health_insurance deployer (Annex III pt. 5(c))
//       → REQUIRED before_use (pentru preț + risc asigurare)
//   + sisteme HRAIS biometric-identification (Annex III pt. 1)
//       → REQUIRED before_use când deployer este public/private public service
//   + hr-screening (Annex III pt. 4)
//       → REQUIRED before_use când rolul deployer cere protecție lucrători
//   + DORA AI material la decizii financiare (overlap cu Annex III)
//       → REQUIRED before_use
//
// Urgență:
//   before_use   = trigger Art. 27(1) — completare ÎNAINTE de prima utilizare
//   annual_review = recheck periodic la deployer-i existenți
//   none         = nu se aplică

import type {
  AISystemRecord,
  FriaDeployerType,
  OrgRegulatoryProfile,
} from "@/lib/compliance/types"

export type FriaTriggerUrgency = "before_use" | "annual_review" | "none"

export type FriaTriggerResult = {
  /** True dacă FRIA este obligatoriu pentru combinația system × deployer. */
  friaRequired: boolean
  /** Explicație în română pentru UI. */
  reason: string
  /** Tipul deployer-ului inferat din profilul org. */
  deployerType: FriaDeployerType
  urgency: FriaTriggerUrgency
  /** Referințe legale care fundamentează decizia (pentru audit trail). */
  legalReferences: string[]
}

/**
 * Input opțional cu informații despre profilul deployer-ului. Dacă este omis,
 * inferăm deployerType din `orgRegulatoryProfile`. Caller-ul poate seta
 * explicit `deployerTypeOverride` pentru cazurile de auto-declarare.
 */
export type EvaluateFriaRequirementInput = {
  system: AISystemRecord
  orgRegulatoryProfile?: OrgRegulatoryProfile
  deployerTypeOverride?: FriaDeployerType
  /** Ultima dată la care s-a făcut FRIA pentru acest sistem (ISO). */
  lastFriaDateISO?: string
}

const NO_TRIGGER: FriaTriggerResult = {
  friaRequired: false,
  reason: "Sistemul nu este high-risk sau deployer-ul nu intră în categoria Art. 27(1).",
  deployerType: "not_applicable",
  urgency: "none",
  legalReferences: ["EU AI Act Art. 27(1)"],
}

const ANNUAL_REVIEW_DAYS = 365

/**
 * Inferarea automată a tipului de deployer din `OrgRegulatoryProfile`.
 * Heuristică sigură (pre-FRIA): folosim profilul declarat de org.
 */
export function inferDeployerType(
  profile?: OrgRegulatoryProfile,
): FriaDeployerType {
  if (!profile) return "other_high_risk_deployer"
  // DORA scope acoperă instituții financiare; credit_assessment și
  // life_health_insurance sunt deployer types specifice.
  const doraType = profile.doraEntityType
  if (doraType === "credit_institution") return "credit_assessment"
  if (doraType === "insurance") return "life_health_insurance"
  // NIS2 public sector = public body
  if (profile.nis2Sectors?.includes("public_administration")) return "public_body"
  // Default fallback când DORA/NIS2 nu acoperă
  return "other_high_risk_deployer"
}

/**
 * Verifică dacă sistemul AI este în scope FRIA. Cerinta de baza:
 * `riskLevel === "high"` (HRAIS Annex III). FRIA nu se aplică pentru
 * minimal / limited risk.
 */
function isHighRiskAISystem(system: AISystemRecord): boolean {
  return system.riskLevel === "high"
}

/**
 * Funcția principală: returnează decizia de trigger.
 */
export function evaluateFriaRequirement(
  input: EvaluateFriaRequirementInput,
): FriaTriggerResult {
  const { system, orgRegulatoryProfile, deployerTypeOverride, lastFriaDateISO } = input

  // 1) Sistemul trebuie să fie high-risk pentru ca FRIA să se aplice.
  if (!isHighRiskAISystem(system)) {
    return NO_TRIGGER
  }

  // 2) Inferăm deployerType
  const deployerType: FriaDeployerType =
    deployerTypeOverride ?? inferDeployerType(orgRegulatoryProfile)

  // 3) Aplicăm regulile Art. 27(1)
  const reasons: string[] = []
  const legalReferences: string[] = ["EU AI Act Art. 27(1)"]

  // Art. 27(1)(a) — organism public sau servicii publice
  if (deployerType === "public_body" || deployerType === "private_public_service") {
    reasons.push(
      deployerType === "public_body"
        ? "Sistemul AI high-risk este folosit de un organism public (Art. 27(1)(a))."
        : "Sistemul AI high-risk este folosit pentru prestarea de servicii publice (Art. 27(1)(a)).",
    )
    legalReferences.push("EU AI Act Art. 27(1)(a)")
  }

  // Art. 27(1)(b) — credit scoring
  if (deployerType === "credit_assessment" || system.purpose === "credit-scoring") {
    reasons.push(
      "Sistemul AI este folosit pentru evaluarea bonității / credit scoring (Annex III pt. 5(b)).",
    )
    legalReferences.push("EU AI Act Art. 27(1)(b) + Annex III pt. 5(b)")
  }

  // Art. 27(1)(b) — life/health insurance pricing
  if (deployerType === "life_health_insurance") {
    reasons.push(
      "Sistemul AI este folosit pentru pricing / risk assessment în asigurări de viață sau sănătate (Annex III pt. 5(c)).",
    )
    legalReferences.push("EU AI Act Art. 27(1)(b) + Annex III pt. 5(c)")
  }

  // Annex III pt. 1 — biometric identification (high-risk by default if remote)
  if (system.purpose === "biometric-identification") {
    reasons.push(
      "Sistemul AI utilizează identificare biometrică (Annex III pt. 1) — FRIA recomandat pentru deployer.",
    )
    legalReferences.push("EU AI Act Annex III pt. 1")
  }

  // Annex III pt. 4 — HR screening (worker rights protection)
  if (
    system.purpose === "hr-screening" &&
    (deployerType === "public_body" ||
      deployerType === "private_public_service" ||
      deployerType === "other_high_risk_deployer")
  ) {
    reasons.push(
      "Sistemul AI este folosit pentru triere CV / decizii angajare (Annex III pt. 4) — protecție drepturi lucrători.",
    )
    legalReferences.push("EU AI Act Annex III pt. 4")
  }

  // DORA AI material la decizii financiare (overlap)
  if (orgRegulatoryProfile?.doraApplies && deployerType === "credit_assessment") {
    reasons.push(
      "Sistemul AI este material pentru decizii financiare în scope DORA (Reg. (UE) 2022/2554).",
    )
    legalReferences.push("Reg. (UE) 2022/2554 Art. 6 — ICT risk management")
  }

  // 4) Decizie finală
  if (reasons.length === 0) {
    // High-risk dar fără mandat Art. 27(1) — FRIA recomandat dar nu obligatoriu
    return {
      friaRequired: false,
      reason:
        "Sistemul este high-risk dar deployer-ul nu intră în categoriile Art. 27(1)(a)(b). FRIA recomandat ca bună practică, nu obligatoriu.",
      deployerType,
      urgency: "none",
      legalReferences,
    }
  }

  // 5) Urgență: dacă FRIA mai vechi de 1 an → annual_review, altfel before_use
  let urgency: FriaTriggerUrgency = "before_use"
  if (lastFriaDateISO) {
    const last = new Date(lastFriaDateISO).getTime()
    const now = Date.now()
    const days = (now - last) / 86_400_000
    if (days < ANNUAL_REVIEW_DAYS) {
      // FRIA recent — nu mai e urgent
      urgency = "none"
    } else {
      urgency = "annual_review"
    }
  }

  return {
    friaRequired: true,
    reason: reasons.join(" "),
    deployerType,
    urgency,
    legalReferences: Array.from(new Set(legalReferences)),
  }
}

/**
 * Helper pentru AI Inventory: returnează lista sistemelor care necesită FRIA
 * dar nu au încă unul (folosit pentru banner-ul „Sisteme high-risk fără FRIA").
 */
export function findSystemsNeedingFria(input: {
  systems: AISystemRecord[]
  orgRegulatoryProfile?: OrgRegulatoryProfile
  existingFriaSystemIds: string[]
}): Array<{ system: AISystemRecord; trigger: FriaTriggerResult }> {
  const { systems, orgRegulatoryProfile, existingFriaSystemIds } = input
  const result: Array<{ system: AISystemRecord; trigger: FriaTriggerResult }> = []
  for (const system of systems) {
    if (existingFriaSystemIds.includes(system.id)) continue
    const trigger = evaluateFriaRequirement({ system, orgRegulatoryProfile })
    if (trigger.friaRequired) {
      result.push({ system, trigger })
    }
  }
  return result
}
