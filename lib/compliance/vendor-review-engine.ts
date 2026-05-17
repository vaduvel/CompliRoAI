/**
 * Sprint 010 — Vendor Review Engine.
 *
 * Donor v3-unified `vendor-review-engine.ts` (780 LOC) opera pe `VendorReview`
 * cu 6-question context capture + 4 cazuri A/B/C/D + checklist generation
 * (1500+ LOC markdown templates). Aici rebuild aliniat la CompliRoAI
 * `VendorRecord` (mature shape) + AI/GDPR focus.
 *
 * Engine-ul:
 * 1. Recalculeaza riscul cand vendor record-ul se schimba (evaluateVendorRisk
 *    din vendor-risk.ts)
 * 2. Promoveaza reviewStatus automat in baza gap-urilor (needs_dpa /
 *    needs_transfer_review / needs_security_review)
 * 3. Genereaza brief markdown audit-ready (vendor profile, risk, gaps,
 *    actiuni recomandate)
 * 4. Calculeaza nextRevalidationISO baseline +12 luni (mai scurt pe risc
 *    high/critical: +6/+3 luni)
 *
 * Pure functions — fara I/O. Folosite de vendor-review-store (Sprint 010-7).
 */

import {
  buildVendorFindings,
  evaluateVendorRisk,
  type VendorFindingCandidate,
  type VendorRiskContext,
  type VendorRiskResult,
} from "@/lib/compliance/vendor-risk"
import type {
  VendorRecord,
  VendorReviewStatus,
  VendorRiskLevel,
} from "@/lib/compliance/types"

// ── Types ────────────────────────────────────────────────────────────────────

export type VendorEvaluationOutcome = {
  /** Vendor record cu riskLevel + reasons + humanReviewRequired actualizati. */
  vendor: VendorRecord
  /** Status review propus (poate fi acceptat de lifecycle.ts). */
  proposedReviewStatus: VendorReviewStatus
  /** Findings candidates pentru emitere/dedupe in findings-store. */
  findingCandidates: VendorFindingCandidate[]
  /** Risk result complet (pentru audit trail / UI). */
  riskResult: VendorRiskResult
  /** Data ISO pentru next revalidation (calculat din risk level). */
  nextRevalidationISO: string
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function computeRevalidationISO(
  riskLevel: VendorRiskLevel,
  fromISO: string = new Date().toISOString(),
): string {
  // Risk-based revalidation cadence:
  //  critical → +3 luni
  //  high     → +6 luni
  //  medium   → +9 luni
  //  low/min  → +12 luni
  let monthsToAdd = 12
  if (riskLevel === "critical") monthsToAdd = 3
  else if (riskLevel === "high") monthsToAdd = 6
  else if (riskLevel === "medium") monthsToAdd = 9
  const base = new Date(fromISO)
  base.setMonth(base.getMonth() + monthsToAdd)
  return base.toISOString()
}

/**
 * Calculeaza statusul de review propus pe baza gap-urilor.
 *
 * Priority cascade (cea mai severa gap castiga):
 *  rejected (manual decision, NU autocomputed)
 *  expired  (DPA expired sau nextRevalidation pasat)
 *  needs_dpa
 *  needs_transfer_review
 *  needs_security_review
 *  in_review  (default cand sunt risk reasons)
 *  approved   (cand human review + no high/critical gaps)
 *  draft      (initial — fara human reviewer + fara evaluation)
 */
export function determineReviewStatus(
  vendor: VendorRecord,
  context: VendorRiskContext,
  riskResult: VendorRiskResult,
  nowISO: string = new Date().toISOString(),
): VendorReviewStatus {
  // Respecta status manuale (rejected / approved)
  if (vendor.reviewStatus === "rejected") return "rejected"

  // 1. Expired check
  const dpaExpired = vendor.dpaStatus === "expired" ||
    (vendor.dpaExpiresAtISO &&
      !Number.isNaN(Date.parse(vendor.dpaExpiresAtISO)) &&
      Date.parse(vendor.dpaExpiresAtISO) <= Date.parse(nowISO))
  if (dpaExpired) return "expired"

  // 2. DPA gap (highest priority — fara DPA, totul cade)
  if (vendor.dpaStatus === "missing" && context.processesPersonalData) {
    return "needs_dpa"
  }

  // 3. Transfer gap
  const insideEU = vendor.vendorRegion === "EU"
  const hasTransferMech =
    vendor.transferMechanism !== "none" && vendor.transferMechanism !== "unknown"
  if (!insideEU && !hasTransferMech && context.processesPersonalData) {
    return "needs_transfer_review"
  }

  // 4. Security gap
  const hasMinimumCert =
    vendor.securityEvidence.iso27001 || vendor.securityEvidence.soc2
  if (
    context.processesPersonalData &&
    !hasMinimumCert &&
    !vendor.securityEvidence.encryptionAtRest
  ) {
    return "needs_security_review"
  }

  // 5. Approved daca user a marcat reviewer + risk acceptable
  if (
    vendor.reviewedByEmail &&
    riskResult.riskLevel !== "critical" &&
    riskResult.riskLevel !== "high"
  ) {
    return "approved"
  }

  // 6. Daca statusul anterior era un needs_* gap care s-a inchis intre timp,
  //    demoteaza la in_review (gap-ul nu mai e prezent in cascada de mai sus).
  const wasNeedsGap =
    vendor.reviewStatus === "needs_dpa" ||
    vendor.reviewStatus === "needs_transfer_review" ||
    vendor.reviewStatus === "needs_security_review" ||
    vendor.reviewStatus === "expired"
  if (wasNeedsGap) return "in_review"

  // 7. Default: in_review pana cand DPO confirma
  if (vendor.reviewStatus === "draft") return "in_review"
  return vendor.reviewStatus
}

// ── Main engine ──────────────────────────────────────────────────────────────

/**
 * Evalueaza vendor + context, returneaza outcome cu vendor actualizat,
 * status propus, findings candidates, risk + revalidation.
 *
 * NU persista — caller-ul (store) aplica modificarile.
 */
export function evaluateVendorReview(
  vendor: VendorRecord,
  context: VendorRiskContext,
  nowISO: string = new Date().toISOString(),
): VendorEvaluationOutcome {
  const riskResult = evaluateVendorRisk(vendor, context, nowISO)
  // Pune risk in vendor inainte de propunere status (status depinde de risk)
  const vendorWithRisk: VendorRecord = {
    ...vendor,
    riskLevel: riskResult.riskLevel,
    riskReasons: riskResult.reasons,
    humanReviewRequired: riskResult.humanReviewRequired,
    updatedAtISO: nowISO,
  }
  const proposedReviewStatus = determineReviewStatus(
    vendorWithRisk,
    context,
    riskResult,
    nowISO,
  )
  const findingCandidates = buildVendorFindings(vendorWithRisk, context)
  const nextRevalidationISO = computeRevalidationISO(riskResult.riskLevel, nowISO)

  return {
    vendor: {
      ...vendorWithRisk,
      reviewStatus: proposedReviewStatus,
      nextRevalidationISO,
    },
    proposedReviewStatus,
    findingCandidates,
    riskResult,
    nextRevalidationISO,
  }
}

// ── Brief generator (markdown audit-ready) ──────────────────────────────────

function asListMd(items: string[], emptyLabel = "(nimic)"): string {
  if (!items || items.length === 0) return `- _${emptyLabel}_`
  return items.map((s) => `- ${s}`).join("\n")
}

function fmtBool(v: boolean): string {
  return v ? "Da" : "Nu"
}

function fmtDate(iso: string | undefined): string {
  if (!iso) return "—"
  try {
    return new Date(iso).toLocaleDateString("ro-RO", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  } catch {
    return iso
  }
}

const DPA_STATUS_LABEL: Record<string, string> = {
  not_required: "Nu e cerut",
  missing: "Lipsa",
  draft_received: "Draft primit",
  negotiating: "In negociere",
  signed: "Semnat",
  expired: "Expirat",
}

const REVIEW_STATUS_LABEL: Record<VendorReviewStatus, string> = {
  draft: "Draft",
  in_review: "In review",
  needs_dpa: "Necesita DPA",
  needs_transfer_review: "Necesita review transfer",
  needs_security_review: "Necesita review securitate",
  approved: "Aprobat",
  rejected: "Respins",
  expired: "Expirat",
}

const RISK_LABEL: Record<VendorRiskLevel, string> = {
  minimal: "Minim",
  low: "Scazut",
  medium: "Mediu",
  high: "Ridicat",
  critical: "Critic",
}

const TRANSFER_LABEL: Record<string, string> = {
  none: "Niciun mecanism",
  adequacy_decision: "Decizie adecvare",
  scc_controller_processor: "SCC controller-processor",
  scc_processor_processor: "SCC processor-processor",
  bcr: "BCR (Binding Corporate Rules)",
  derogation_art_49: "Derogare Art. 49 GDPR",
  unknown: "Necunoscut",
}

/**
 * Genereaza brief markdown audit-ready pentru vendor — folosit de
 * /api/vendor-review/[id]/brief si in audit pack export.
 */
export function buildVendorReviewBrief(
  vendor: VendorRecord,
  context: VendorRiskContext,
  orgName: string,
  nowISO: string = new Date().toISOString(),
): string {
  const outcome = evaluateVendorReview(vendor, context, nowISO)
  const v = outcome.vendor
  const sec = v.securityEvidence
  const ai = v.aiTerms

  const subprocessorList =
    v.subprocessorsList.length > 0
      ? v.subprocessorsList.map((s) => `- ${s}`).join("\n")
      : "- _Niciun subprocesator documentat_"

  const securityFindings: string[] = [
    `- ISO 27001: ${fmtBool(sec.iso27001)}`,
    `- SOC 2: ${fmtBool(sec.soc2)}`,
    `- Penetration test recent: ${fmtBool(sec.penTestRecent)}`,
    `- Criptare in tranzit: ${fmtBool(sec.encryptionInTransit)}`,
    `- Criptare at rest: ${fmtBool(sec.encryptionAtRest)}`,
    `- MFA aplicat: ${fmtBool(sec.mfaEnforced)}`,
    `- Audit logs disponibili: ${fmtBool(sec.auditLogsAvailable)}`,
    `- SLA notificare incident (ore): ${sec.incidentNotificationCommitmentHours ?? "—"}`,
  ]

  const aiTermsLines: string[] = [
    `- Opt-out training: ${ai.trainingDataOptOut}`,
    `- Retentie input: ${ai.inputDataRetention}`,
    `- Drepturi output: ${ai.outputRightsOwnership}`,
    `- Transparenta model: ${ai.modelTransparency}`,
    `- Garantii reproducibility: ${fmtBool(ai.reproducibilityGuarantees)}`,
  ]

  const lines: string[] = [
    `# Brief Vendor — ${v.name}`,
    "",
    `**Operator:** ${orgName || "—"}  `,
    `**Produs folosit:** ${v.productUsed || "—"}  `,
    `**Persoana juridica:** ${v.legalEntity ?? "—"}  `,
    `**Categorie serviciu:** ${v.serviceCategory}  `,
    `**Regiune:** ${v.vendorRegion}  `,
    `**Rol GDPR:** ${v.role}  `,
    `**Status review:** ${REVIEW_STATUS_LABEL[v.reviewStatus] ?? v.reviewStatus}  `,
    `**Risc evaluat:** ${RISK_LABEL[v.riskLevel] ?? v.riskLevel}  `,
    `**Review uman cerut:** ${fmtBool(v.humanReviewRequired)}  `,
    `**Reviewer:** ${v.reviewedByEmail ?? "_neasignat_"}  `,
    `**Reviewed la:** ${fmtDate(v.reviewedAtISO)}  `,
    `**Urmatoarea revalidare:** ${fmtDate(v.nextRevalidationISO)}  `,
    "",
    "## 1. DPA (Art. 28 GDPR)",
    "",
    `- Status: **${DPA_STATUS_LABEL[v.dpaStatus] ?? v.dpaStatus}**`,
    `- URL: ${v.dpaUrl ? `[${v.dpaUrl}](${v.dpaUrl})` : "—"}`,
    `- Semnat la: ${fmtDate(v.dpaSignedAtISO)}`,
    `- Expira la: ${fmtDate(v.dpaExpiresAtISO)}`,
    "",
    "## 2. Transfer international (Art. 44-49 GDPR)",
    "",
    `- Transfer cerut (date afara EU/SEE): **${fmtBool(v.transferRequired)}**`,
    `- Mecanism: ${TRANSFER_LABEL[v.transferMechanism] ?? v.transferMechanism}`,
    `- Nota TIA: ${v.transferAssessmentNote ?? "_neasignata_"}`,
    "",
    "## 3. Subprocesatori",
    "",
    v.subprocessorsUrl ? `- Lista publica: [${v.subprocessorsUrl}](${v.subprocessorsUrl})` : "- Lista publica: —",
    "",
    "Subprocesatori cunoscuti:",
    subprocessorList,
    "",
    "## 4. Securitate (Art. 32 GDPR)",
    "",
    ...securityFindings,
    "",
    "## 5. Termeni AI specifici",
    "",
    ...aiTermsLines,
    "",
    "## 6. Risc + motivare",
    "",
    `**Nivel:** ${RISK_LABEL[v.riskLevel]}`,
    "",
    "**Motivare:**",
    asListMd(v.riskReasons, "fara riscuri detectate"),
    "",
    "## 7. Gap-uri si actiuni recomandate",
    "",
    outcome.findingCandidates.length > 0
      ? outcome.findingCandidates
          .map((f) => `- [${f.severity.toUpperCase()}] ${f.title}\n  - Hint: ${f.remediationHint}\n  - Dovada: ${f.evidenceRequired}`)
          .join("\n")
      : "- _Niciun gap detectat — vendor in regula la momentul evaluarii._",
    "",
    "## 8. Linkage in CompliRoAI",
    "",
    `- AI systems: ${v.linkedAISystemIds.length > 0 ? v.linkedAISystemIds.join(", ") : "—"}`,
    `- AI data map: ${v.linkedAIDataMapIds.length > 0 ? v.linkedAIDataMapIds.join(", ") : "—"}`,
    `- Findings emise: ${v.linkedFindingIds.length > 0 ? v.linkedFindingIds.join(", ") : "—"}`,
    "",
    "## 9. Note interne",
    "",
    v.notes?.trim() || "_fara note_",
    "",
    "---",
    "",
    `> Brief generat de CompliRoAI la ${fmtDate(nowISO)} pentru audit DPO. Documentul reflecta starea curenta a vendorului; verificare manuala necesara inainte de transmitere oficiala.`,
  ]

  return lines.join("\n")
}

// ── Labels export pentru UI ──────────────────────────────────────────────────

export {
  REVIEW_STATUS_LABEL,
  DPA_STATUS_LABEL,
  RISK_LABEL,
  TRANSFER_LABEL,
}
