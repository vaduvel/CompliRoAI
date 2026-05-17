/**
 * Sprint 010 — Vendor risk evaluator.
 *
 * Donor `v3-unified/lib/compliance/vendor-risk.ts` (99 LOC) era tied de
 * `Nis2Vendor` (NIS2 store). Per mandate Rule 3, NU portam NIS2 full
 * surface in CompliRoAI. Rebuild aici aliniat la `VendorRecord` (GDPR
 * Art. 28 + AI Act vendor obligations).
 *
 * Reguli risc (per mandate § 11):
 *   critical — vendor non-EU + no transfer mechanism + special category data
 *              via AI system; sau DPA expired.
 *   high     — missing DPA pe vendor cu personal data; sau non-EU fara SCC;
 *              sau trains on input fara opt-out; sau no security evidence.
 *   medium   — missing security cert (ISO/SOC2) pe processor cu personal data;
 *              sau no incident notification commitment; sau AI transparency
 *              opaca pe vendor LLM.
 *   low      — signed DPA + EU vendor + standard security evidence.
 *   minimal  — no personal data flow + signed DPA SAU role = "controller".
 *
 * Pure functions — fara I/O. Folosite de vendor-review-engine (010-5)
 * pentru a recalcula riscul la fiecare CRUD.
 */

import type {
  VendorAITerms,
  VendorRecord,
  VendorRegion,
  VendorRiskLevel,
  VendorSecurityEvidence,
  VendorTransferMechanism,
} from "@/lib/compliance/types"

// ── Risk evaluation context ──────────────────────────────────────────────────

export type VendorRiskContext = {
  /** Linked AI data map records care indica daca proceseaza date personale. */
  processesPersonalData: boolean
  /** Daca vendor-ul vede date special category (Art. 9 GDPR — sanatate, biometrie etc). */
  processesSpecialCategories: boolean
  /** Daca vendor-ul vede date minorilor. */
  childrenData: boolean
  /** Daca vendor-ul ofera AI/LLM service (din library serviceCategory). */
  isAIVendor: boolean
}

export type VendorRiskResult = {
  riskLevel: VendorRiskLevel
  reasons: string[]
  /**
   * Indica daca review human e obligatoriu — vendor-review-engine il foloseste
   * pentru a marca `humanReviewRequired = true`.
   */
  humanReviewRequired: boolean
}

// ── Const ────────────────────────────────────────────────────────────────────

const EU_REGIONS: VendorRegion[] = ["EU"]

const VALID_TRANSFER_MECHANISMS: VendorTransferMechanism[] = [
  "adequacy_decision",
  "scc_controller_processor",
  "scc_processor_processor",
  "bcr",
  "derogation_art_49",
]

// ── Helpers ──────────────────────────────────────────────────────────────────

function isInsideEU(region: VendorRegion): boolean {
  return EU_REGIONS.includes(region)
}

function hasValidTransferMechanism(mech: VendorTransferMechanism): boolean {
  return VALID_TRANSFER_MECHANISMS.includes(mech)
}

function hasMinimumSecurityCert(sec: VendorSecurityEvidence): boolean {
  return sec.iso27001 || sec.soc2
}

function hasStandardSecurityBaseline(sec: VendorSecurityEvidence): boolean {
  // Minim acceptabil pentru processor: criptare in transit + at rest + audit logs
  return sec.encryptionInTransit && sec.encryptionAtRest && sec.auditLogsAvailable
}

function dpaIsExpired(dpaExpiresAtISO: string | undefined, nowISO: string): boolean {
  if (!dpaExpiresAtISO) return false
  const exp = Date.parse(dpaExpiresAtISO)
  const now = Date.parse(nowISO)
  return !Number.isNaN(exp) && !Number.isNaN(now) && exp <= now
}

function trainsOnDataWithoutOptOut(ai: VendorAITerms): boolean {
  // Daca trainingDataOptOut = "no" => vendor antreneaza fara optiune de opt-out.
  // "default_opt_out" si "yes" sunt OK; "unknown" = need_review medium.
  return ai.trainingDataOptOut === "no"
}

// ── Main evaluator ───────────────────────────────────────────────────────────

/**
 * Evalueaza riscul total pentru un vendor record + context.
 *
 * Strategie: cascadeaza prin reguli, intoarce cel mai HIGH risc detectat
 * (priority: critical > high > medium > low > minimal).
 */
export function evaluateVendorRisk(
  vendor: VendorRecord,
  context: VendorRiskContext,
  nowISO: string = new Date().toISOString(),
): VendorRiskResult {
  const reasons: string[] = []
  const insideEU = isInsideEU(vendor.vendorRegion)
  const hasTransferMech = hasValidTransferMechanism(vendor.transferMechanism)
  const dpaExpired = dpaIsExpired(vendor.dpaExpiresAtISO, nowISO)
  const dpaSigned = vendor.dpaStatus === "signed"
  const dpaMissing = vendor.dpaStatus === "missing"

  // ── 1. Critical paths ────────────────────────────────────────────────────
  if (dpaExpired) {
    reasons.push(`DPA expirat (${vendor.dpaExpiresAtISO ?? "—"}) — risc critic`)
  }
  if (
    !insideEU &&
    !hasTransferMech &&
    (context.processesSpecialCategories || context.childrenData)
  ) {
    reasons.push(
      "Vendor non-EU fara mecanism transfer + date sensibile (Art. 9) sau minori — risc critic",
    )
  }
  if (reasons.some((r) => r.includes("risc critic"))) {
    return {
      riskLevel: "critical",
      reasons,
      humanReviewRequired: true,
    }
  }

  // ── 2. High paths ────────────────────────────────────────────────────────
  if (dpaMissing && context.processesPersonalData) {
    reasons.push("DPA lipsa pe vendor care proceseaza date personale (Art. 28 GDPR)")
  }
  if (!insideEU && !hasTransferMech && context.processesPersonalData) {
    reasons.push(
      "Vendor non-EU fara SCC/BCR/adequacy + transfer date personale (Art. 46 GDPR)",
    )
  }
  if (context.isAIVendor && trainsOnDataWithoutOptOut(vendor.aiTerms)) {
    reasons.push(
      "Vendor AI antreneaza pe input fara opt-out — risc retentie date neautorizata",
    )
  }
  if (
    context.processesPersonalData &&
    !hasMinimumSecurityCert(vendor.securityEvidence) &&
    !hasStandardSecurityBaseline(vendor.securityEvidence)
  ) {
    reasons.push(
      "Vendor processor cu date personale fara nicio dovada de securitate (ISO/SOC2/encryption)",
    )
  }
  if (context.childrenData && vendor.role === "processor" && !dpaSigned) {
    reasons.push("Date minori la processor fara DPA semnat (UNICEF/EDPB guidance)")
  }
  if (reasons.length > 0) {
    return {
      riskLevel: "high",
      reasons,
      humanReviewRequired: true,
    }
  }

  // ── 3. Medium paths ──────────────────────────────────────────────────────
  if (
    context.processesPersonalData &&
    !hasMinimumSecurityCert(vendor.securityEvidence)
  ) {
    reasons.push(
      "Vendor processor cu date personale fara certificare ISO 27001 sau SOC 2",
    )
  }
  if (
    context.processesPersonalData &&
    vendor.securityEvidence.incidentNotificationCommitmentHours == null
  ) {
    reasons.push(
      "Vendor processor fara SLA notificare incident (Art. 33 GDPR — 72h)",
    )
  }
  if (
    context.isAIVendor &&
    (vendor.aiTerms.modelTransparency === "opaque" ||
      vendor.aiTerms.modelTransparency === "unknown")
  ) {
    reasons.push(
      "Vendor AI cu transparenta model insuficienta (Art. 13 AI Act + Art. 50)",
    )
  }
  if (
    context.isAIVendor &&
    vendor.aiTerms.inputDataRetention === "indefinite"
  ) {
    reasons.push(
      "Vendor AI cu retentie input nedeterminata — limiteaza storage prin contract",
    )
  }
  if (
    context.isAIVendor &&
    vendor.aiTerms.trainingDataOptOut === "unknown"
  ) {
    reasons.push("Vendor AI fara clarificare opt-out training — solicita documentatie")
  }
  if (
    !insideEU &&
    !hasTransferMech &&
    !context.processesPersonalData
  ) {
    reasons.push(
      "Vendor non-EU fara mecanism transfer — verifica daca scapi date confidentiale",
    )
  }
  if (reasons.length > 0) {
    return {
      riskLevel: "medium",
      reasons,
      humanReviewRequired: false,
    }
  }

  // ── 4. Low / minimal ─────────────────────────────────────────────────────
  if (!context.processesPersonalData && (dpaSigned || vendor.dpaStatus === "not_required")) {
    return {
      riskLevel: "minimal",
      reasons: ["Fara fluxuri de date personale + DPA in regula sau nu e cerut"],
      humanReviewRequired: false,
    }
  }

  if (
    insideEU &&
    dpaSigned &&
    hasMinimumSecurityCert(vendor.securityEvidence) &&
    hasStandardSecurityBaseline(vendor.securityEvidence)
  ) {
    return {
      riskLevel: "low",
      reasons: ["Vendor EU cu DPA semnat si securitate completa"],
      humanReviewRequired: false,
    }
  }

  // Fallback safe pentru tot ce nu se incadreaza
  return {
    riskLevel: "low",
    reasons: reasons.length > 0 ? reasons : ["Baseline acceptabil — fara semnale de risc"],
    humanReviewRequired: false,
  }
}

// ── Findings prototype builders (used by engine & store) ────────────────────

export type VendorFindingCandidate = {
  /** ID stabil pentru dedupe — engine-ul deruleaza cu acelasi vendorId. */
  stableId: string
  title: string
  detail: string
  severity: "low" | "medium" | "high" | "critical"
  legalReference: string
  remediationHint: string
  evidenceRequired: string
}

const FINDING_PREFIX = "vendor-review-"

/**
 * Produc lista de finding candidates pentru un vendor, pe baza scorului
 * de risc + context. Engine-ul Sprint 010-5 emite sau actualizeaza
 * findings prin createFinding() din findings-store.
 */
export function buildVendorFindings(
  vendor: VendorRecord,
  context: VendorRiskContext,
): VendorFindingCandidate[] {
  const out: VendorFindingCandidate[] = []
  const nowExpiresIso = vendor.dpaExpiresAtISO ?? ""
  const insideEU = isInsideEU(vendor.vendorRegion)
  const hasTransferMech = hasValidTransferMechanism(vendor.transferMechanism)

  // 1) DPA lipsa pe personal data
  if (vendor.dpaStatus === "missing" && context.processesPersonalData) {
    out.push({
      stableId: `${FINDING_PREFIX}${vendor.id}-missing-dpa`,
      title: `DPA lipsa: ${vendor.name}`,
      detail: `Vendor-ul "${vendor.name}" proceseaza date personale (Art. 4 GDPR) dar NU exista Data Processing Agreement (Art. 28). Solicita DPA online sau template-ul vendor-ului si semneaza.`,
      severity: "high",
      legalReference: "Art. 28 GDPR + Recital 81",
      remediationHint: `Acceseaza ${vendor.dpaUrl ?? "pagina DPA a vendor-ului"}, descarca template-ul, completeaza + semneaza prin DPO/legal.`,
      evidenceRequired: "Copia DPA semnat de ambele parti, data + numarul de inregistrare",
    })
  }

  // 1bis) DPA lipsa fara personal data (medium)
  if (vendor.dpaStatus === "missing" && !context.processesPersonalData) {
    out.push({
      stableId: `${FINDING_PREFIX}${vendor.id}-missing-dpa-low`,
      title: `Verifica daca DPA e necesar: ${vendor.name}`,
      detail: `Vendor-ul "${vendor.name}" e marcat fara DPA si fara date personale. Confirma sau marcheaza dpaStatus=not_required cu justificare.`,
      severity: "medium",
      legalReference: "Art. 28 GDPR",
      remediationHint:
        "Verifica daca vendor-ul ar putea procesa date personale incidental (logs, telemetry, accounts). Daca da, solicita DPA. Daca nu, marcheaza explicit not_required.",
      evidenceRequired: "Document scris (nota DPO) care confirma absenta fluxurilor de date",
    })
  }

  // 2) DPA expirat
  if (vendor.dpaStatus === "expired" || (nowExpiresIso && dpaIsExpired(nowExpiresIso, new Date().toISOString()))) {
    out.push({
      stableId: `${FINDING_PREFIX}${vendor.id}-dpa-expired`,
      title: `DPA expirat: ${vendor.name}`,
      detail: `DPA-ul cu vendor-ul "${vendor.name}" a expirat (${vendor.dpaExpiresAtISO ?? "data necunoscuta"}). Procesarea fara DPA valid violeaza Art. 28 GDPR.`,
      severity: "high",
      legalReference: "Art. 28 GDPR",
      remediationHint:
        "Solicita reinnoirea DPA imediat. Pana atunci, opreste fluxurile noi catre vendor sau implementeaza masuri compensatorii documentate.",
      evidenceRequired: "DPA nou semnat sau dovada negocierii in curs",
    })
  }

  // 3) Transfer non-EU fara mecanism
  if (!insideEU && !hasTransferMech && context.processesPersonalData) {
    out.push({
      stableId: `${FINDING_PREFIX}${vendor.id}-missing-transfer`,
      title: `Lipsa mecanism transfer: ${vendor.name}`,
      detail: `Vendor-ul "${vendor.name}" e in afara UE/SEE (${vendor.vendorRegion}) si proceseaza date personale fara SCC/BCR/adequacy/derogation Art. 49.`,
      severity: context.processesSpecialCategories || context.childrenData ? "critical" : "high",
      legalReference: "Art. 44-49 GDPR (Schrems II)",
      remediationHint:
        "Semneaza SCC controller-processor (sau processor-processor daca vendor-ul are subprocesori). Documenteaza TIA (Transfer Impact Assessment).",
      evidenceRequired: "SCC semnate + TIA documentat + lista subprocesatorilor",
    })
  }

  // 4) Trains on input fara opt-out (AI vendor)
  if (context.isAIVendor && trainsOnDataWithoutOptOut(vendor.aiTerms)) {
    out.push({
      stableId: `${FINDING_PREFIX}${vendor.id}-trains-no-optout`,
      title: `Vendor AI antreneaza pe inputs fara opt-out: ${vendor.name}`,
      detail: `${vendor.name} foloseste inputurile pentru antrenarea modelului fara optiune de opt-out documentata. Risc retentie date + leak in modelul public.`,
      severity: "high",
      legalReference: "Art. 5(1)(b) + Art. 25 GDPR (data minimization) + AI Act Art. 10",
      remediationHint:
        "Negociaza opt-out contractual. Pana atunci, NU trimite date personale sau confidentiale. Documenteaza decizia in registrul AI.",
      evidenceRequired: "Confirmare scrisa vendor sau modificare contractuala",
    })
  }

  // 5) Securitate insuficienta
  if (
    context.processesPersonalData &&
    !hasMinimumSecurityCert(vendor.securityEvidence) &&
    !hasStandardSecurityBaseline(vendor.securityEvidence)
  ) {
    out.push({
      stableId: `${FINDING_PREFIX}${vendor.id}-missing-security`,
      title: `Dovezi securitate lipsa: ${vendor.name}`,
      detail: `Vendor-ul "${vendor.name}" proceseaza date personale dar NU prezinta nicio certificare (ISO 27001, SOC 2) sau dovada de baza (encryption, audit logs).`,
      severity: "medium",
      legalReference: "Art. 32 GDPR (security of processing)",
      remediationHint:
        "Solicita raport audit, certificat ISO/SOC2 sau penetration test recent. Daca refuza, escaleaza la DPO si discuta vendor alternative.",
      evidenceRequired: "Certificat ISO 27001 sau raport SOC 2 type II sau echivalent",
    })
  }

  // 6) AI vendor fara terms documentati
  if (
    context.isAIVendor &&
    (vendor.aiTerms.modelTransparency === "opaque" ||
      vendor.aiTerms.modelTransparency === "unknown" ||
      vendor.aiTerms.inputDataRetention === "unknown" ||
      vendor.aiTerms.trainingDataOptOut === "unknown")
  ) {
    out.push({
      stableId: `${FINDING_PREFIX}${vendor.id}-ai-terms-gap`,
      title: `Termeni AI documentati incomplet: ${vendor.name}`,
      detail: `Vendor-ul "${vendor.name}" furnizeaza serviciu AI dar nu am documentat clar: transparenta model, retentie input, opt-out training. Necesita due diligence.`,
      severity: "medium",
      legalReference: "AI Act Art. 13 (transparency) + Art. 50 (disclosure)",
      remediationHint:
        "Trimite chestionar AI vendor (training data sources, retention period, opt-out, model cards). Documenteaza raspunsurile in nota interna.",
      evidenceRequired: "Email cu raspunsuri vendor sau extras din documentatia oficiala",
    })
  }

  // 7) Risc high/critical fara human review
  const riskNeedsReview =
    (vendor.riskLevel === "high" || vendor.riskLevel === "critical") &&
    !vendor.reviewedByEmail
  if (riskNeedsReview) {
    out.push({
      stableId: `${FINDING_PREFIX}${vendor.id}-needs-review`,
      title: `Vendor risc ridicat fara review uman: ${vendor.name}`,
      detail: `Vendor-ul "${vendor.name}" a fost evaluat cu risc ${vendor.riskLevel} dar NU exista review uman documentat. DPO/legal trebuie sa decida explicit aprobare/respingere.`,
      severity: "high",
      legalReference: "GDPR Accountability Principle + AI Act Art. 14 (human oversight)",
      remediationHint:
        "Convoaca review intern (DPO + business owner). Notifica in CompliRoAI cand decizia e finalizata.",
      evidenceRequired: "Nota review + semnatura DPO + decizie aprobare/respingere",
    })
  }

  return out
}

export const VENDOR_FINDING_PREFIX = FINDING_PREFIX
