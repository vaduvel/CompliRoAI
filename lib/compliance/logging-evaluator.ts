// Logging Evidence Evaluator — Sprint 018 (Art. 12 + Art. 26(6) AI Act).
//
// Pure functions pentru:
//   1. Completeness check: incomplete / partial / complete
//   2. Retention status: compliant / approaching_expiry / expired / no_evidence
//   3. Emission de findings candidate (Art. 12(2)/(3) + Art. 26(6))
//   4. Markdown export pentru audit pack
//
// Apelat din:
//   - logging-evidence-store.ts pe createConfig / updateConfig / attachEvidence
//   - API route export pentru a regenera markdown la fiecare descărcare

import type { ComplianceSeverity } from "@/lib/compliance/constitution"
import {
  LOGGING_EVENT_CATEGORIES_ORDERED,
  LOGGING_EVENT_CATEGORY_LABELS,
  LOGGING_SEVERITY_LEVEL_LABELS,
  LOGGING_STORAGE_BACKEND_LABELS,
} from "@/lib/compliance/logging-schema"
import type {
  AISystemRecord,
  LoggingCompleteness,
  LoggingConfig,
  LoggingRetentionStatus,
  ScanFinding,
} from "@/lib/compliance/types"

// ────────────────────────────────────────────────────────────────────────────
//   Constants
// ────────────────────────────────────────────────────────────────────────────

const APPROACHING_EXPIRY_DAYS = 30
const MONTH_MS = 30 * 86_400_000

// ────────────────────────────────────────────────────────────────────────────
//   Completeness check
// ────────────────────────────────────────────────────────────────────────────

export type LoggingCompletenessReport = {
  completeness: LoggingCompleteness
  eventCategoriesCount: number
  hasStorageDefined: boolean
  retentionMeetsMin: boolean
  hasIntegrityMechanism: boolean
  hasAccessRole: boolean
  hasBiometricFullCoverage: boolean
  reasons: string[]
}

export function computeLoggingCompleteness(
  record: LoggingConfig,
): LoggingCompletenessReport {
  const eventCategoriesCount = record.eventCategoriesLogged.length
  const hasStorageDefined =
    record.storageBackend.length > 0 && record.storageLocation.trim().length > 0
  const retentionMeetsMin =
    record.actualRetentionMonths >= record.minRetentionMonths &&
    record.minRetentionMonths > 0
  const hasIntegrityMechanism =
    record.integrityMechanism !== "none" &&
    record.integrityMechanism.length > 0
  const hasAccessRole = record.accessRoleDescription.trim().length > 5

  // Biometric Full Art. 12(3) full coverage check
  const biometricSpecific = record.biometricSpecific
  const hasBiometricFullCoverage =
    record.severityLevel !== "biometric_full"
      ? true
      : Boolean(
          biometricSpecific &&
            biometricSpecific.periodOfUseTracked &&
            biometricSpecific.referenceDatabaseRecorded &&
            biometricSpecific.inputDataRecorded &&
            biometricSpecific.operatorsIdentified,
        )

  const reasons: string[] = []
  if (eventCategoriesCount < 3) {
    reasons.push(`Doar ${eventCategoriesCount} categorii loguite (minim 3 pentru partial, 5 pentru complete).`)
  }
  if (!hasStorageDefined) reasons.push("Storage backend/locație nedefinită.")
  if (!retentionMeetsMin) {
    reasons.push(
      `Retenția actuală (${record.actualRetentionMonths}) < minim cerut (${record.minRetentionMonths}) per Art. 26(6).`,
    )
  }
  if (!hasIntegrityMechanism) reasons.push("Niciun mecanism de integritate setat (Art. 12(1)).")
  if (!hasAccessRole) reasons.push("Roluri de acces la logs nedefinite.")
  if (!hasBiometricFullCoverage) {
    reasons.push("Biometric Full fără toate cele 4 câmpuri Art. 12(3) (perioadă, bază date, input, operatori).")
  }

  let completeness: LoggingCompleteness
  if (
    eventCategoriesCount >= 5 &&
    hasStorageDefined &&
    retentionMeetsMin &&
    hasIntegrityMechanism &&
    hasAccessRole &&
    hasBiometricFullCoverage
  ) {
    completeness = "complete"
  } else if (
    eventCategoriesCount >= 3 &&
    hasStorageDefined &&
    retentionMeetsMin
  ) {
    completeness = "partial"
  } else {
    completeness = "incomplete"
  }

  return {
    completeness,
    eventCategoriesCount,
    hasStorageDefined,
    retentionMeetsMin,
    hasIntegrityMechanism,
    hasAccessRole,
    hasBiometricFullCoverage,
    reasons,
  }
}

// ────────────────────────────────────────────────────────────────────────────
//   Retention status check
// ────────────────────────────────────────────────────────────────────────────

export function computeRetentionStatus(
  record: LoggingConfig,
  nowMs = Date.now(),
): LoggingRetentionStatus {
  if (!record.lastEvidenceAtISO || record.evidenceItems.length === 0) {
    return "no_evidence"
  }
  const lastMs = new Date(record.lastEvidenceAtISO).getTime()
  if (!Number.isFinite(lastMs)) return "no_evidence"
  const retentionMs = record.actualRetentionMonths * MONTH_MS
  const expiryMs = lastMs + retentionMs
  const approachingThresholdMs = expiryMs - APPROACHING_EXPIRY_DAYS * 86_400_000

  if (nowMs > expiryMs) return "expired"
  if (nowMs > approachingThresholdMs) return "approaching_expiry"
  return "compliant"
}

// ────────────────────────────────────────────────────────────────────────────
//   Aggregate evaluation
// ────────────────────────────────────────────────────────────────────────────

export type LoggingEvaluationResult = {
  completeness: LoggingCompleteness
  completenessReport: LoggingCompletenessReport
  retentionStatus: LoggingRetentionStatus
  candidateFindings: ScanFinding[]
  generatedMarkdown: string
}

export type EvaluateLoggingInput = {
  record: LoggingConfig
  orgName: string
  systemName?: string
  linkedSystem?: AISystemRecord
  /** Folosit pentru stable finding IDs și markdown timestamps. */
  nowISO?: string
}

/**
 * Funcția centrală: ia un LoggingConfig și returnează:
 *  - completeness (calculat)
 *  - retentionStatus (calculat)
 *  - findings candidate (pre-persist)
 *  - markdown export
 */
export function evaluateLogging(input: EvaluateLoggingInput): LoggingEvaluationResult {
  const { record, orgName, systemName, linkedSystem } = input
  const nowISO = input.nowISO ?? new Date().toISOString()
  const nowMs = new Date(nowISO).getTime()

  // 1) Completeness
  const completenessReport = computeLoggingCompleteness(record)
  const completeness = completenessReport.completeness

  // 2) Retention status
  const retentionStatus = computeRetentionStatus(record, nowMs)

  // 3) Findings candidate
  const candidateFindings: ScanFinding[] = []

  // Regula A — categorii lipsă (severity high)
  if (completenessReport.eventCategoriesCount < 3) {
    candidateFindings.push(
      buildFinding({
        stableSuffix: `${record.id}-categories-missing`,
        title: `Lipsesc categorii events Art. 12: ${completenessReport.eventCategoriesCount}/3 minim`,
        detail: `Configurarea de logging "${record.title}" loguiește doar ${completenessReport.eventCategoriesCount} categorii. Art. 12(2) cere identificarea situațiilor de risc Art. 79(1) + modificări substanțiale + Art. 72 + Art. 14 — minim input + output + override + erori.`,
        severity: "high",
        legalReference: "EU AI Act Art. 12(2)",
        remediationHint:
          "Adaugă minim: input_data_received, output_decision_made, human_override_applied, error_or_anomaly, system_start_stop. Configurează backend să emită automat.",
        impactSummary:
          "Fără categorii suficiente, reconstrucția incidentelor + audit Art. 26(6) devine imposibilă.",
        evidenceRequired:
          "Export SIEM cu ≥5 categorii + screenshot config logging + politică logging documentată.",
        sourceDoc: `Logging Config — ${record.title}`,
        nowISO,
      }),
    )
  }

  // Regula B — retenție insuficientă (severity high)
  if (!completenessReport.retentionMeetsMin) {
    candidateFindings.push(
      buildFinding({
        stableSuffix: `${record.id}-retention-insufficient`,
        title: `Retenție insuficientă: ${record.actualRetentionMonths} luni < ${record.minRetentionMonths} luni cerute`,
        detail: `Configurarea "${record.title}" declară retenție actuală de ${record.actualRetentionMonths} luni, sub minimul cerut de ${record.minRetentionMonths} luni. Art. 26(6) impune deployer-ului să păstreze logs cel puțin 6 luni (sau mai mult per drepturile fundamentale / GDPR / dreptul EU/național).`,
        severity: "high",
        legalReference: "EU AI Act Art. 26(6)",
        remediationHint:
          "Configurează TTL / lifecycle rules în backend să păstreze logs cel puțin minRetentionMonths. Pentru cloud: extend retention în CloudWatch/Azure Monitor/GCP. Pentru S3: lifecycle policy.",
        impactSummary:
          "Logs șterse prea devreme = imposibil audit retroactiv + non-conformitate Art. 26(6) sancționabilă Art. 99.",
        evidenceRequired:
          "Screenshot retention policy + screenshot lifecycle rules + raport test ștergere.",
        sourceDoc: `Logging Config — ${record.title}`,
        nowISO,
      }),
    )
  }

  // Regula C — lipsește mecanism integritate (severity medium)
  if (!completenessReport.hasIntegrityMechanism) {
    candidateFindings.push(
      buildFinding({
        stableSuffix: `${record.id}-no-integrity`,
        title: "Lipsește mecanism integritate logs Art. 12",
        detail: `Configurarea "${record.title}" nu declară un mecanism de tamper-evidence. Art. 12(1) impune logging „automat" — implicit cu integritate verificabilă (hash chain, WORM, signed writes sau audit extern).`,
        severity: "medium",
        legalReference: "EU AI Act Art. 12(1)",
        remediationHint:
          "Implementează minim hash_chain (SHA-256 chained per event) sau writeonce (S3 Object Lock, WORM bucket). Documentează în integrityMechanismDescription.",
        impactSummary:
          "Fără tamper-evidence, valoarea probatorie a logs scade — un auditor / autoritate poate respinge dovada.",
        evidenceRequired:
          "Raport audit integritate + sample verificare hash + politică imutabilitate logs.",
        sourceDoc: `Logging Config — ${record.title}`,
        nowISO,
      }),
    )
  }

  // Regula D — biometric ID fără Art. 12(3) full logging (severity critical)
  if (
    linkedSystem?.purpose === "biometric-identification" &&
    !completenessReport.hasBiometricFullCoverage
  ) {
    candidateFindings.push(
      buildFinding({
        stableSuffix: `${record.id}-biometric-not-full`,
        title: "Biometric ID fără Art. 12(3) full logging",
        detail: `Sistemul AI legat de configurarea "${record.title}" este identificare biometrică (Annex III pt. 1(a)). Art. 12(3) impune logging integral: (a) perioadă utilizare (start/end); (b) bază date verificată; (c) input data folosit; (d) identificare operatori naturali implicați.`,
        severity: "critical",
        legalReference: "EU AI Act Art. 12(3)",
        remediationHint:
          "Setează severityLevel='biometric_full' și completează biometricSpecific cu toate cele 4 câmpuri TRUE. Adaugă biometric_match_attempt + biometric_match_result în eventCategoriesLogged.",
        impactSummary:
          "Non-conformitate Art. 12(3) — sancționabilă Art. 99 până la 35M EUR sau 7% turnover; bază pentru autoritate de a interzice utilizarea sistemului.",
        evidenceRequired:
          "Export SIEM cu toate 4 câmpuri Art. 12(3) prezente + politică logging biometric semnată.",
        sourceDoc: `Logging Config — ${record.title}`,
        nowISO,
      }),
    )
  }

  // Regula E — logs expirate per Art. 26(6) (severity high)
  if (retentionStatus === "expired") {
    candidateFindings.push(
      buildFinding({
        stableSuffix: `${record.id}-logs-expired`,
        title: `Logs expirate per Art. 26(6): ${systemName ?? record.linkedAISystemId}`,
        detail: `Ultima dovadă pentru "${record.title}" este la ${record.lastEvidenceAtISO}, iar retenția actuală (${record.actualRetentionMonths} luni) a expirat. Sistemul a depășit fereastra de retenție Art. 26(6); deployer-ul nu mai are dovadă disponibilă pentru audit.`,
        severity: "high",
        legalReference: "EU AI Act Art. 26(6)",
        remediationHint:
          "Atașează un nou export logs din SIEM/backend ACUM. Verifică dacă backend-ul mai păstrează logs sau dacă au fost șterse automat.",
        impactSummary:
          "Logs expirate = imposibil audit Art. 26(6) + risc de incapacitate de a răspunde la cerere autoritate (Art. 73).",
        evidenceRequired:
          "Export nou logs + raport verificare retenție backend + plan recovery.",
        sourceDoc: `Logging Config — ${record.title}`,
        nowISO,
      }),
    )
  }

  // Regula F — lipsește meta-logging access (severity medium)
  if (!record.accessLogged) {
    candidateFindings.push(
      buildFinding({
        stableSuffix: `${record.id}-no-access-logging`,
        title: "Lipsește access logging (meta-logging)",
        detail: `Configurarea "${record.title}" nu logează accesul la logs. Pentru protecție împotriva insider threat și pentru audit complet, fiecare citire/export de logs trebuie loguită (cine, când, ce query).`,
        severity: "medium",
        legalReference: "EU AI Act Art. 12(1) bonne pratique + ISO 27001 A.9.4.4",
        remediationHint:
          "Activează audit logging pe SIEM/backend (Splunk Audit, CloudWatch Logs Insights queries, etc.). Documentează cine are acces + cum se monitorizează.",
        impactSummary:
          "Fără meta-logging, o ștergere/manipulare malicioasă a logs nu poate fi detectată.",
        evidenceRequired:
          "Configurare audit logging activă + sample query log de acces + politică monitoring insider threat.",
        sourceDoc: `Logging Config — ${record.title}`,
        nowISO,
      }),
    )
  }

  // 4) Markdown
  const generatedMarkdown = buildLoggingMarkdown({
    record,
    orgName,
    systemName,
    completenessReport,
    retentionStatus,
    candidateFindingsCount: candidateFindings.length,
    nowISO,
  })

  return {
    completeness,
    completenessReport,
    retentionStatus,
    candidateFindings,
    generatedMarkdown,
  }
}

// ────────────────────────────────────────────────────────────────────────────
//   Finding builder (pure)
// ────────────────────────────────────────────────────────────────────────────

function buildFinding(args: {
  stableSuffix: string
  title: string
  detail: string
  severity: ComplianceSeverity
  legalReference: string
  remediationHint: string
  impactSummary: string
  evidenceRequired: string
  sourceDoc: string
  nowISO: string
}): ScanFinding {
  return {
    id: `logging-finding-${args.stableSuffix}`,
    title: args.title,
    detail: args.detail,
    category: "EU_AI_ACT",
    severity: args.severity,
    risk: args.severity === "critical" || args.severity === "high" ? "high" : "low",
    principles: ["accountability", "transparency", "robustness"],
    createdAtISO: args.nowISO,
    sourceDocument: args.sourceDoc,
    legalReference: args.legalReference,
    impactSummary: args.impactSummary,
    remediationHint: args.remediationHint,
    evidenceRequired: args.evidenceRequired,
    findingStatus: "open",
    reviewState: "unreviewed",
    requiresHumanReview: true,
    resolution: {
      problem: args.title,
      impact: args.impactSummary,
      action: args.remediationHint,
      humanStep:
        "Responsabil logging / DPO verifică + decide acțiunea înainte de continuarea utilizării sistemului AI.",
      closureEvidence: args.evidenceRequired,
      revalidation:
        "Recheck la fiecare schimbare materială a backend-ului de logging sau periodic (≤90 zile).",
    },
  }
}

// ────────────────────────────────────────────────────────────────────────────
//   Markdown export
// ────────────────────────────────────────────────────────────────────────────

function buildLoggingMarkdown(args: {
  record: LoggingConfig
  orgName: string
  systemName?: string
  completenessReport: LoggingCompletenessReport
  retentionStatus: LoggingRetentionStatus
  candidateFindingsCount: number
  nowISO: string
}): string {
  const r = args.record
  const c = args.completenessReport
  const lines: (string | null)[] = [
    `# Logging Config — ${r.title}`,
    "",
    `**Organizație:** ${args.orgName || "—"}`,
    `**Sistem AI vizat:** ${args.systemName ?? r.linkedAISystemId}`,
    `**Nivel severitate:** ${LOGGING_SEVERITY_LEVEL_LABELS[r.severityLevel]}`,
    `**Status:** ${r.status}`,
    `**Completeness:** ${c.completeness}`,
    `**Retention status:** ${args.retentionStatus}`,
    `**Generat la:** ${args.nowISO}`,
    r.approvedByEmail ? `**Aprobat de:** ${r.approvedByEmail} (${r.approvedAtISO ?? "—"})` : null,
    r.lastEvidenceAtISO ? `**Ultima dovadă atașată:** ${r.lastEvidenceAtISO}` : null,
    r.nextReviewISO ? `**Următoarea revizie:** ${r.nextReviewISO}` : null,
    r.rejectionReason ? `**Motiv respingere:** ${r.rejectionReason}` : null,
    "",
    "## A. Sistem AI + nivel severitate",
    `- Sistem AI: ${args.systemName ?? r.linkedAISystemId}`,
    `- Severity: ${LOGGING_SEVERITY_LEVEL_LABELS[r.severityLevel]}`,
    "",
    "## B. Categorii evenimente loguite (Art. 12(2)/(3))",
  ]

  for (const cat of LOGGING_EVENT_CATEGORIES_ORDERED) {
    const logged = r.eventCategoriesLogged.includes(cat)
    lines.push(`- [${logged ? "x" : " "}] ${LOGGING_EVENT_CATEGORY_LABELS[cat]}`)
  }
  lines.push("")

  if (r.biometricSpecific) {
    lines.push("### Câmpuri Art. 12(3) biometric ID")
    const b = r.biometricSpecific
    lines.push(`- [${b.periodOfUseTracked ? "x" : " "}] (a) Perioada de utilizare urmărită`)
    lines.push(`- [${b.referenceDatabaseRecorded ? "x" : " "}] (b) Bază de date de referință înregistrată`)
    lines.push(`- [${b.inputDataRecorded ? "x" : " "}] (c) Input data înregistrat`)
    lines.push(`- [${b.operatorsIdentified ? "x" : " "}] (d) Operatori naturali identificați`)
    lines.push("")
  }

  lines.push("## C. Storage + retenție (Art. 26(6))")
  lines.push(`- **Backend:** ${LOGGING_STORAGE_BACKEND_LABELS[r.storageBackend]}`)
  lines.push(`- **Locație:** ${r.storageLocation}`)
  lines.push(`- **Retenție minimă cerută:** ${r.minRetentionMonths} luni`)
  lines.push(`- **Retenția actuală:** ${r.actualRetentionMonths} luni`)
  lines.push(`- **Politica retenție:** ${r.retentionPolicy || "_nedefinită_"}`)
  lines.push("")

  lines.push("## D. Integritate + control acces")
  lines.push(`- **Mecanism integritate:** ${r.integrityMechanism}`)
  lines.push(`- **Descriere:** ${r.integrityMechanismDescription || "_nedefinită_"}`)
  lines.push(`- **Roluri cu acces:** ${r.accessRoleDescription || "_nedefinite_"}`)
  lines.push(`- **Access logging (meta):** ${r.accessLogged ? "DA" : "NU"}`)
  lines.push("")

  lines.push("## Checklist evidență")
  if (r.evidenceChecklist.length === 0) {
    lines.push("_Niciun item definit._")
  } else {
    for (const item of r.evidenceChecklist) lines.push(`- [ ] ${item}`)
  }
  lines.push("")

  lines.push("## Dovezi atașate")
  if (r.evidenceItems.length === 0) {
    lines.push("_Nicio dovadă încărcată._")
  } else {
    lines.push("| Tip | Descriere | Perioadă | Încărcat | De |")
    lines.push("|---|---|---|---|---|")
    for (const e of r.evidenceItems) {
      const period =
        e.coversPeriodStartISO && e.coversPeriodEndISO
          ? `${e.coversPeriodStartISO} → ${e.coversPeriodEndISO}`
          : "—"
      lines.push(
        `| ${e.type} | ${e.description}${e.url ? ` ([link](${e.url}))` : ""} | ${period} | ${e.uploadedAtISO} | ${e.uploadedByEmail} |`,
      )
    }
  }
  lines.push("")

  lines.push("## Sumar evaluare")
  lines.push(`- Findings candidate emise: ${args.candidateFindingsCount}`)
  lines.push(`- Categorii loguite: ${c.eventCategoriesCount}`)
  lines.push(`- Storage definit: ${c.hasStorageDefined ? "DA" : "NU"}`)
  lines.push(`- Retenția acoperă minimul: ${c.retentionMeetsMin ? "DA" : "NU"}`)
  lines.push(`- Mecanism integritate: ${c.hasIntegrityMechanism ? "DA" : "NU"}`)
  lines.push(`- Roluri acces definite: ${c.hasAccessRole ? "DA" : "NU"}`)
  lines.push(`- Biometric Full coverage Art. 12(3): ${c.hasBiometricFullCoverage ? "DA" : "N/A sau NU"}`)
  lines.push(`- Completeness: **${c.completeness}**`)
  lines.push(`- Retention status: **${args.retentionStatus}**`)
  lines.push("")

  lines.push("## Checklist final")
  lines.push(`- [${c.eventCategoriesCount >= 5 ? "x" : " "}] Minim 5 categorii loguite (Art. 12(2))`)
  lines.push(`- [${c.hasStorageDefined ? "x" : " "}] Backend storage definit`)
  lines.push(`- [${c.retentionMeetsMin ? "x" : " "}] Retenția ≥ ${r.minRetentionMonths} luni (Art. 26(6))`)
  lines.push(`- [${c.hasIntegrityMechanism ? "x" : " "}] Mecanism integritate setat (Art. 12(1))`)
  lines.push(`- [${c.hasAccessRole ? "x" : " "}] Roluri acces documentate`)
  lines.push(`- [${c.hasBiometricFullCoverage ? "x" : " "}] Biometric Full coverage Art. 12(3) (dacă aplicabil)`)
  lines.push(`- [${r.status === "active" ? "x" : " "}] Config activ`)
  lines.push("")
  lines.push(
    "> Config logging pregătit conform Art. 12 + Art. 26(6) Regulament (UE) 2024/1689. Reprezintă măsurile de bună-credință ale deployer-ului; nu înlocuiește opinia juridică finală.",
  )

  return lines.filter((line): line is string => typeof line === "string").join("\n")
}
