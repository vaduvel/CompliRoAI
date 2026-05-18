// Sprint 023 — Compliance Gate engine.
//
// Deterministic, explainable, Art.-mapped gate that emits a verdict for any
// AI system metadata payload received via /api/v1/gate or /api/v1/deployment.
//
// CRITICAL DESIGN RULES (per mandate § 18 row 023):
//   1. NO scoring magic — verdict comes from named rule paths only.
//   2. Every reason carries an `articleRef` to the EU AI Act / GDPR.
//   3. Verdicts ladder: pass < review_required < blocked. Worst wins.
//   4. Pure function. No IO, no state access. Caller composes inputs.
//
// Rule set (executed in order):
//   R1  Art. 5 prohibition (purpose == biometric-identification or
//       image-manipulation-intimate) → BLOCKED.
//   R2  High-risk + autonomy=fully_autonomous + no human oversight
//       documented → BLOCKED (Art. 14(1)).
//   R3  Biometric ID system that survives R1 (because of an Art. 5(2)
//       exception): caller flagged, but no human oversight documented →
//       BLOCKED (Art. 14(4) two-person rule).
//   R4  Limited-risk system interacting with humans without a transparency
//       notice flag → REVIEW (Art. 50(1)).
//   R5  High-risk + role=deployer and FRIA missing → REVIEW (Art. 27).
//   R6  High-risk + processesPersonalData + DPIA missing → REVIEW
//       (GDPR Art. 35 + AI Act Art. 26(9)).
//   R7  ProcessesPersonalData + no DPA flag → REVIEW (GDPR Art. 28).
//   R8  Vendor outside EU + no transfer mechanism flagged → REVIEW
//       (GDPR Art. 44-49).
//   R9  High-risk + logging not enabled → REVIEW (Art. 12 + Art. 26(6)).
//   R10 Special categories of data processed + no special-categories
//       justification → REVIEW (GDPR Art. 9).
//
// `evaluateComplianceGate` returns the full ComplianceGateResponse —
// including obligations array (3-state: met/missing/not_applicable),
// missing evidence list, nextActions and auditPackHints.

import { classifyAISystem } from "@/lib/compliance/ai-act-classifier"
import type {
  AIActRole,
  ClassifyV1Input,
  ComplianceGateObligation,
  ComplianceGateReason,
  ComplianceGateResponse,
  ComplianceGateRiskClass,
  ComplianceGateRole,
  ComplianceGateVerdict,
} from "@/lib/compliance/types"

// ─── Inputs ──────────────────────────────────────────────────────────────────

export type GateEvaluationContext = {
  input: ClassifyV1Input
  /**
   * Caller-resolved AI Act role. If absent (e.g. caller did not supply a
   * Role Assessment), we infer "unknown".
   */
  aiActRole?: AIActRole
  /**
   * Caller-resolved evidence flags. Each defaults to false (treated as
   * missing). The route handler fills these from request body if the
   * developer provided them.
   */
  evidence?: {
    friaCompleted?: boolean
    dpiaCompleted?: boolean
    transferMechanism?: boolean
    transparencyNoticePublished?: boolean
    specialCategoriesJustified?: boolean
  }
  nowISO?: string
}

// ─── Verdict ladder helpers ──────────────────────────────────────────────────

const VERDICT_RANK: Record<ComplianceGateVerdict, number> = {
  pass: 0,
  review_required: 1,
  blocked: 2,
}

function worse(a: ComplianceGateVerdict, b: ComplianceGateVerdict): ComplianceGateVerdict {
  return VERDICT_RANK[a] >= VERDICT_RANK[b] ? a : b
}

function severityFromVerdict(v: ComplianceGateVerdict): "info" | "warning" | "error" {
  if (v === "blocked") return "error"
  if (v === "review_required") return "warning"
  return "info"
}

// ─── Risk class mapping (mirrors the classifier's risk levels) ───────────────

function mapRiskClass(
  riskLevel: "prohibited" | "high_risk" | "limited_risk" | "minimal_risk"
): ComplianceGateRiskClass {
  switch (riskLevel) {
    case "prohibited":
      return "prohibited"
    case "high_risk":
      return "high"
    case "limited_risk":
      return "limited"
    case "minimal_risk":
      return "minimal"
  }
}

function mapRole(role?: AIActRole): ComplianceGateRole {
  if (!role) return "unknown"
  if (role === "manufacturer") {
    // ComplianceGate is consumed by AI builders shipping pure-AI systems —
    // surface manufacturer as "provider" because the obligations cumulate.
    return "provider"
  }
  return role
}

// ─── Main evaluator ──────────────────────────────────────────────────────────

export function evaluateComplianceGate(ctx: GateEvaluationContext): ComplianceGateResponse {
  const { input } = ctx
  const evidence = ctx.evidence ?? {}
  const classification = classifyAISystem(input.purpose)
  const riskClass = mapRiskClass(classification.riskLevel)
  const role = mapRole(ctx.aiActRole)
  const nowISO = ctx.nowISO ?? new Date().toISOString()

  const reasons: ComplianceGateReason[] = []
  const obligations: ComplianceGateObligation[] = []
  const missingEvidence: string[] = []
  const nextActions: string[] = []
  const auditPackHints: string[] = []
  let verdict: ComplianceGateVerdict = "pass"

  // ── R1: Art. 5 prohibition ──────────────────────────────────────────────
  if (riskClass === "prohibited") {
    verdict = worse(verdict, "blocked")
    reasons.push({
      category: "legal_prohibition",
      articleRef: classification.article,
      severity: "error",
      message: `Sistemul intră sub Art. 5 AI Act (utilizare interzisă) — ${classification.reason}`,
      nextAction:
        "Oprește imediat dezvoltarea/deploymentul. Dacă există excepție (Art. 5(2)), documentează baza legală și consultă DPO + juridic.",
    })
    obligations.push({
      article: classification.article,
      description: "Practică AI interzisă — utilizarea nu poate fi conformă.",
      status: "missing",
    })
    nextActions.push("Oprire imediată sistem + memo juridic excepție Art. 5(2)")
    auditPackHints.push(
      `Include în Audit Pack motivarea opririi / memo Art. 5(2) pentru sistemul '${input.systemName}'.`,
    )
  }

  // ── R2 + R3: human oversight (Art. 14) ──────────────────────────────────
  const needsHumanOversight = riskClass === "high" || riskClass === "prohibited"
  if (needsHumanOversight) {
    const isBiometric = input.purpose === "biometric-identification"
    const oversightOk = input.humanOversightDocumented === true
    if (!oversightOk) {
      const isFullyAutonomous = input.autonomyLevel === "fully_autonomous"
      // For high-risk OR biometric (even if R1 already blocked it), missing
      // oversight is a hard block — Art. 14(1)+(4) cannot be waived for
      // high-risk providers/deployers.
      const subverdict: ComplianceGateVerdict =
        isFullyAutonomous || isBiometric ? "blocked" : "review_required"
      verdict = worse(verdict, subverdict)
      reasons.push({
        category: "human_oversight_required",
        articleRef: isBiometric ? "Art. 14(4) AI Act" : "Art. 14(1) AI Act",
        severity: severityFromVerdict(subverdict),
        message: isBiometric
          ? "Sistem biometric fără regula de două persoane (two-person rule) documentată — Art. 14(4)."
          : `Sistem high-risk fără human oversight documentat (autonomyLevel='${input.autonomyLevel ?? "nedeclarat"}').`,
        nextAction:
          "Documentează rolurile celor care monitorizează / pot opri sistemul, în Human Oversight Protocol.",
      })
      missingEvidence.push("Human Oversight Protocol semnat (Art. 14)")
      nextActions.push("Completează Human Oversight Protocol în /dashboard/oversight")
      auditPackHints.push(
        `Atașează Human Oversight Protocol pentru '${input.systemName}' în secțiunea oversight/ a Audit Pack.`,
      )
    }
    obligations.push({
      article: "Art. 14 AI Act",
      description: "Human oversight obligatoriu pentru sisteme high-risk.",
      status: oversightOk ? "met" : "missing",
    })
  } else {
    obligations.push({
      article: "Art. 14 AI Act",
      description: "Human oversight obligatoriu pentru sisteme high-risk.",
      status: "not_applicable",
    })
  }

  // ── R4: transparency notice (Art. 50) ───────────────────────────────────
  const interactsWithHumans =
    input.purpose === "support-chatbot" ||
    input.purpose === "marketing-personalization" ||
    riskClass === "limited"
  if (interactsWithHumans) {
    const transparencyOk = evidence.transparencyNoticePublished === true
    if (!transparencyOk) {
      verdict = worse(verdict, "review_required")
      reasons.push({
        category: "transparency_required",
        articleRef: "Art. 50(1) AI Act",
        severity: "warning",
        message:
          "Sistem care interacționează cu persoane fizice — necesită notă de transparență (utilizatorul trebuie informat că vorbește cu AI).",
        nextAction:
          "Publică nota de transparență în interfață + dovedește în /dashboard/transparency.",
      })
      missingEvidence.push("Notă de transparență Art. 50 publicată")
      nextActions.push("Generează nota de transparență (/dashboard/transparency)")
    }
    obligations.push({
      article: "Art. 50 AI Act",
      description: "Notă de transparență la interacțiunea om-AI.",
      status: transparencyOk ? "met" : "missing",
    })
  }

  // ── R5: FRIA — Art. 27 deployer of high-risk ────────────────────────────
  if (riskClass === "high" && (role === "deployer" || role === "mixed")) {
    const friaOk = evidence.friaCompleted === true
    if (!friaOk) {
      verdict = worse(verdict, "review_required")
      reasons.push({
        category: "fria_required",
        articleRef: "Art. 27 AI Act",
        severity: "warning",
        message:
          "Deployer al unui sistem high-risk — FRIA (Fundamental Rights Impact Assessment) obligatorie înainte de deployment.",
        nextAction:
          "Rulează FRIA în /dashboard/fria și atașează raportul ca dovadă pentru sistem.",
      })
      missingEvidence.push("FRIA semnată Art. 27")
      nextActions.push("Completează FRIA pentru sistem (/dashboard/fria)")
      auditPackHints.push(
        `Include FRIA în Audit Pack pentru '${input.systemName}' (sistem high-risk deployer).`,
      )
    }
    obligations.push({
      article: "Art. 27 AI Act",
      description: "FRIA pentru deployer al unui sistem high-risk.",
      status: friaOk ? "met" : "missing",
    })
  } else if (riskClass === "high") {
    obligations.push({
      article: "Art. 27 AI Act",
      description: "FRIA aplicabilă doar deployerilor de sisteme high-risk.",
      status: "not_applicable",
    })
  }

  // ── R6: DPIA — Art. 35 GDPR + Art. 26(9) AI Act ─────────────────────────
  if (riskClass === "high" && input.processesPersonalData === true) {
    const dpiaOk = evidence.dpiaCompleted === true
    if (!dpiaOk) {
      verdict = worse(verdict, "review_required")
      reasons.push({
        category: "dpia_required",
        articleRef: "GDPR Art. 35 + Art. 26(9) AI Act",
        severity: "warning",
        message:
          "Sistem high-risk care prelucrează date personale — DPIA obligatorie (GDPR Art. 35).",
        nextAction: "Completează DPIA în /dashboard/dpia + atașează raportul la sistem.",
      })
      missingEvidence.push("DPIA semnată GDPR Art. 35")
      nextActions.push("Completează DPIA (/dashboard/dpia)")
    }
    obligations.push({
      article: "GDPR Art. 35",
      description: "DPIA pentru prelucrare cu risc ridicat.",
      status: dpiaOk ? "met" : "missing",
    })
  }

  // ── R7: DPA — GDPR Art. 28 ──────────────────────────────────────────────
  if (input.processesPersonalData === true) {
    const dpaOk = input.dpaSigned === true
    if (!dpaOk) {
      verdict = worse(verdict, "review_required")
      reasons.push({
        category: "dpa_missing",
        articleRef: "GDPR Art. 28",
        severity: "warning",
        message: `Sistem prelucrează date personale — necesită DPA semnat cu providerul (${input.modelProvider ?? "vendor"}).`,
        nextAction:
          "Solicită DPA Art. 28 de la provider + atașează în /dashboard/vendor.",
      })
      missingEvidence.push("DPA Art. 28 cu provider AI")
      nextActions.push("Atașează DPA în /dashboard/vendor")
    }
    obligations.push({
      article: "GDPR Art. 28",
      description: "Data Processing Agreement cu providerul AI.",
      status: dpaOk ? "met" : "missing",
    })
  }

  // ── R8: International transfers — GDPR Art. 44-49 ───────────────────────
  const isNonEUVendor =
    input.vendorRegion === "US" ||
    input.vendorRegion === "UK" ||
    input.vendorRegion === "other"
  if (input.processesPersonalData === true && isNonEUVendor) {
    const transferOk = evidence.transferMechanism === true
    if (!transferOk) {
      verdict = worse(verdict, "review_required")
      reasons.push({
        category: "transfer_review",
        articleRef: "GDPR Art. 44-49",
        severity: "warning",
        message: `Provider non-UE (${input.vendorRegion}) prelucrează date personale — necesită mecanism de transfer (SCC / adequacy / BCR).`,
        nextAction:
          "Documentează SCC-urile sau alt mecanism de transfer + atașează la vendor record.",
      })
      missingEvidence.push("Mecanism transfer GDPR Art. 44-49 (SCC/adequacy/BCR)")
      nextActions.push("Atașează SCC / adequacy decision pentru provider non-UE")
    }
    obligations.push({
      article: "GDPR Art. 44-49",
      description: "Mecanism legal pentru transfer date către non-UE.",
      status: transferOk ? "met" : "missing",
    })
  }

  // ── R9: Logging — Art. 12 + Art. 26(6) ──────────────────────────────────
  if (riskClass === "high") {
    const loggingOk = input.loggingEnabled === true
    if (!loggingOk) {
      verdict = worse(verdict, "review_required")
      reasons.push({
        category: "logging_required",
        articleRef: "Art. 12 + Art. 26(6) AI Act",
        severity: "warning",
        message:
          "Sistem high-risk fără logging activ — Art. 12 cere logs pentru durata vieții sistemului, min 6 luni retenție.",
        nextAction:
          "Activează logging + documentează config în /dashboard/logging.",
      })
      missingEvidence.push("Logging Evidence Art. 12 (retenție ≥ 6 luni)")
      nextActions.push("Configurează logging în /dashboard/logging")
    }
    obligations.push({
      article: "Art. 12 AI Act",
      description: "Logging events sistem high-risk, min 6 luni retenție.",
      status: loggingOk ? "met" : "missing",
    })
  }

  // ── R10: Special categories — GDPR Art. 9 ───────────────────────────────
  if (input.processesSpecialCategories === true) {
    const justifiedOk = evidence.specialCategoriesJustified === true
    if (!justifiedOk) {
      verdict = worse(verdict, "review_required")
      reasons.push({
        category: "missing_evidence",
        articleRef: "GDPR Art. 9",
        severity: "warning",
        message:
          "Sistemul prelucrează categorii speciale de date (sănătate, etnie, religie, biometrie etc.) — necesită bază legală Art. 9(2).",
        nextAction:
          "Documentează baza legală Art. 9(2) + consimțământul/excepția aplicabilă.",
      })
      missingEvidence.push("Bază legală Art. 9(2) pentru categorii speciale")
      nextActions.push("Documentează baza legală Art. 9(2)")
    }
    obligations.push({
      article: "GDPR Art. 9",
      description: "Bază legală pentru prelucrarea categoriilor speciale.",
      status: justifiedOk ? "met" : "missing",
    })
  }

  // ── If verdict is still pass, surface an info-level confirmation ────────
  if (verdict === "pass" && reasons.length === 0) {
    reasons.push({
      category: "other",
      articleRef: classification.article,
      severity: "info",
      message: `Sistem ${riskClass} (${classification.article}) fără obligații deschise — gate trecut.`,
      nextAction:
        "Re-evaluează după orice schimbare a scopului, providerului sau a categoriilor de date.",
    })
  }

  if (verdict !== "pass") {
    auditPackHints.push(
      "Toate rezultatele Compliance Gate sunt incluse în secțiunea api-sdk/ a Audit Pack-ului.",
    )
  }

  return {
    verdict,
    riskClass,
    aiActRole: role,
    reasons,
    obligations,
    missingEvidence: dedupe(missingEvidence),
    nextActions: dedupe(nextActions),
    auditPackHints: dedupe(auditPackHints),
    apiVersion: "v1",
    classifiedAtISO: nowISO,
  }
}

function dedupe<T>(arr: T[]): T[] {
  return Array.from(new Set(arr))
}
