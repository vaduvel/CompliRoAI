// PMM (Post-Market Monitoring) Evaluator — Sprint 019 (Art. 72 AI Act).
//
// Pure functions pentru:
//   1. Completeness check: incomplete / partial / complete
//   2. Freshness status: fresh / due_soon / overdue / no_reviews
//   3. Emission de findings candidate (Art. 72(2)/(3) + Art. 43(4))
//   4. Markdown export pentru audit pack
//
// Apelat din:
//   - pmm-store.ts pe createPlan / updatePlan / recordReview / recordVersionChange /
//     recordAnomaly
//   - API route export pentru a regenera markdown la fiecare descărcare

import type { ComplianceSeverity } from "@/lib/compliance/constitution"
import {
  PMM_DATA_COLLECTION_FREQUENCY_LABELS,
  PMM_DATA_COLLECTION_METHOD_LABELS,
  PMM_REVIEW_CYCLE_LABELS,
} from "@/lib/compliance/pmm-schema"
import type {
  AISystemRecord,
  PmmAnomalyRecord,
  PmmCompleteness,
  PmmFreshnessStatus,
  PmmPlan,
  PmmVersionChangeRecord,
  ScanFinding,
} from "@/lib/compliance/types"

// ────────────────────────────────────────────────────────────────────────────
//   Constants
// ────────────────────────────────────────────────────────────────────────────

const DUE_SOON_DAYS = 30
const SUBSTANTIAL_MOD_FOLLOWUP_DAYS = 30
const CRITICAL_ANOMALY_UNRESOLVED_DAYS = 7

// ────────────────────────────────────────────────────────────────────────────
//   Completeness check
// ────────────────────────────────────────────────────────────────────────────

export type PmmCompletenessReport = {
  completeness: PmmCompleteness
  dataCollectionMethodsCount: number
  hasComplianceEvaluationMethods: boolean
  hasComplianceMetricsTracked: boolean
  hasCorrectiveActionProcess: boolean
  hasPreventiveActionProcess: boolean
  hasReviewCycle: boolean
  reasons: string[]
}

/**
 * Plan PMM completeness — 5 criterii Art. 72(3):
 *   1. ≥ 3 data collection methods (Art. 72(3)(a))
 *   2. complianceEvaluationMethods non-empty (Art. 72(3)(b))
 *   3. correctiveActionProcess non-empty (Art. 72(3)(c))
 *   4. preventiveActionProcess non-empty (Art. 72(3)(c))
 *   5. reviewCycle set + reviewCycleMonths > 0
 *
 * complete   = toate cele 5
 * partial    = 3-4
 * incomplete = ≤ 2
 */
export function computePmmCompleteness(record: PmmPlan): PmmCompletenessReport {
  const dataCollectionMethodsCount = record.dataCollectionMethods.length
  const hasComplianceEvaluationMethods =
    record.complianceEvaluationMethods.filter((m) => m.trim().length > 0).length > 0
  const hasComplianceMetricsTracked =
    record.complianceMetricsTracked.filter((m) => m.trim().length > 0).length > 0
  const hasCorrectiveActionProcess =
    record.correctiveActionProcess.trim().length > 10
  const hasPreventiveActionProcess =
    record.preventiveActionProcess.trim().length > 10
  const hasReviewCycle =
    Boolean(record.reviewCycle) && record.reviewCycleMonths > 0

  const reasons: string[] = []
  if (dataCollectionMethodsCount < 3) {
    reasons.push(
      `Doar ${dataCollectionMethodsCount} metode de colectare (minim 3 pentru Art. 72(3)(a)).`,
    )
  }
  if (!hasComplianceEvaluationMethods) {
    reasons.push("Niciun metodă de evaluare conformitate (Art. 72(3)(b)).")
  }
  if (!hasComplianceMetricsTracked) {
    reasons.push("Nicio metrică tracked pentru conformitate continuă.")
  }
  if (!hasCorrectiveActionProcess) {
    reasons.push("Proces de acțiune corectivă insuficient (Art. 72(3)(c)).")
  }
  if (!hasPreventiveActionProcess) {
    reasons.push("Proces de acțiune preventivă insuficient (Art. 72(3)(c)).")
  }
  if (!hasReviewCycle) {
    reasons.push("Ciclu de revizie nedefinit.")
  }

  const criteria = [
    dataCollectionMethodsCount >= 3,
    hasComplianceEvaluationMethods && hasComplianceMetricsTracked,
    hasCorrectiveActionProcess,
    hasPreventiveActionProcess,
    hasReviewCycle,
  ]
  const trueCount = criteria.filter(Boolean).length

  let completeness: PmmCompleteness
  if (trueCount === criteria.length) completeness = "complete"
  else if (trueCount >= 3) completeness = "partial"
  else completeness = "incomplete"

  return {
    completeness,
    dataCollectionMethodsCount,
    hasComplianceEvaluationMethods,
    hasComplianceMetricsTracked,
    hasCorrectiveActionProcess,
    hasPreventiveActionProcess,
    hasReviewCycle,
    reasons,
  }
}

// ────────────────────────────────────────────────────────────────────────────
//   Freshness status check
// ────────────────────────────────────────────────────────────────────────────

export function computePmmFreshnessStatus(
  record: PmmPlan,
  nowMs = Date.now(),
): PmmFreshnessStatus {
  if (!record.reviews || record.reviews.length === 0) {
    return "no_reviews"
  }
  if (!record.nextReviewISO) return "no_reviews"
  const nextMs = new Date(record.nextReviewISO).getTime()
  if (!Number.isFinite(nextMs)) return "no_reviews"

  if (nowMs > nextMs) return "overdue"
  const daysUntil = (nextMs - nowMs) / 86_400_000
  if (daysUntil <= DUE_SOON_DAYS) return "due_soon"
  return "fresh"
}

// ────────────────────────────────────────────────────────────────────────────
//   Helpers per Art. 43(4) — substantial modification awaiting reassessment
// ────────────────────────────────────────────────────────────────────────────

/**
 * Returnează lista version-changes cu modificare substanțială + reassessment
 * cerut care NU au un review follow-up în următoarele 30 zile după schimbare.
 */
export function findUnreassessedSubstantialChanges(
  record: PmmPlan,
  nowMs = Date.now(),
): PmmVersionChangeRecord[] {
  const result: PmmVersionChangeRecord[] = []
  for (const change of record.versionChanges) {
    if (!change.substantialModification || !change.riskReassessmentRequired) continue
    const changeMs = new Date(change.changedAtISO).getTime()
    if (!Number.isFinite(changeMs)) continue
    // Cer un review după changeMs până în SUBSTANTIAL_MOD_FOLLOWUP_DAYS
    const cutoffMs = changeMs + SUBSTANTIAL_MOD_FOLLOWUP_DAYS * 86_400_000
    const hasFollowUp = record.reviews.some((r) => {
      const rMs = new Date(r.reviewDateISO).getTime()
      return rMs >= changeMs && rMs <= cutoffMs
    })
    // Doar dacă suntem deja peste cutoff (a expirat fereastra de follow-up)
    if (!hasFollowUp && nowMs > cutoffMs) {
      result.push(change)
    }
  }
  return result
}

/**
 * Returnează anomaliile critical nerezolvate de mai mult de 7 zile.
 */
export function findCriticalUnresolvedAnomalies(
  record: PmmPlan,
  nowMs = Date.now(),
): PmmAnomalyRecord[] {
  const result: PmmAnomalyRecord[] = []
  for (const anomaly of record.anomalies) {
    if (anomaly.severity !== "critical") continue
    if (anomaly.resolved) continue
    const detectedMs = new Date(anomaly.detectedAtISO).getTime()
    if (!Number.isFinite(detectedMs)) continue
    const daysSince = (nowMs - detectedMs) / 86_400_000
    if (daysSince >= CRITICAL_ANOMALY_UNRESOLVED_DAYS) {
      result.push(anomaly)
    }
  }
  return result
}

// ────────────────────────────────────────────────────────────────────────────
//   Aggregate evaluation
// ────────────────────────────────────────────────────────────────────────────

export type PmmEvaluationResult = {
  completeness: PmmCompleteness
  completenessReport: PmmCompletenessReport
  freshnessStatus: PmmFreshnessStatus
  candidateFindings: ScanFinding[]
  generatedMarkdown: string
  unreassessedSubstantialChanges: PmmVersionChangeRecord[]
  criticalUnresolvedAnomalies: PmmAnomalyRecord[]
}

export type EvaluatePmmInput = {
  record: PmmPlan
  orgName: string
  systemName?: string
  linkedSystem?: AISystemRecord
  /** Folosit pentru stable finding IDs și markdown timestamps. */
  nowISO?: string
}

/**
 * Funcția centrală: ia un PmmPlan și returnează:
 *  - completeness (calculat)
 *  - freshnessStatus (calculat)
 *  - findings candidate (pre-persist)
 *  - markdown export
 *  - listele de version changes + anomalii care necesită atenție
 */
export function evaluatePmm(input: EvaluatePmmInput): PmmEvaluationResult {
  const { record, orgName, systemName, linkedSystem } = input
  const nowISO = input.nowISO ?? new Date().toISOString()
  const nowMs = new Date(nowISO).getTime()

  // 1) Completeness
  const completenessReport = computePmmCompleteness(record)
  const completeness = completenessReport.completeness

  // 2) Freshness
  const freshnessStatus = computePmmFreshnessStatus(record, nowMs)

  // 3) Version changes + anomalies
  const unreassessedSubstantialChanges = findUnreassessedSubstantialChanges(
    record,
    nowMs,
  )
  const criticalUnresolvedAnomalies = findCriticalUnresolvedAnomalies(
    record,
    nowMs,
  )

  // 4) Findings candidate
  const candidateFindings: ScanFinding[] = []
  const sysName = systemName ?? record.linkedAISystemId

  // Regula A — Lipsa PMM pentru sistem high-risk (severity high)
  // Notă: această regulă este aplicabilă când planul EXISTĂ dar este `incomplete`
  // pentru un sistem high-risk. Pentru sistemele FĂRĂ plan deloc, evaluator-ul
  // de inventar (pmm-trigger) emite recomandarea inline.
  if (
    linkedSystem?.riskLevel === "high" &&
    completeness === "incomplete"
  ) {
    candidateFindings.push(
      buildFinding({
        stableSuffix: `${record.id}-plan-incomplete-highrisk`,
        title: `Lipsește PMM plan complet pentru sistem high-risk: ${sysName}`,
        detail: `Sistemul AI "${sysName}" este high-risk și planul PMM curent "${record.title}" este incomplete. Art. 72(1) impune sistem PMM proporțional cu natura + riscul; planul trebuie să acopere toate cele 3 dimensiuni Art. 72(3): (a) colectare date, (b) evaluare conformitate, (c) acțiune corectivă/preventivă.`,
        severity: "high",
        legalReference: "EU AI Act Art. 72(1) + Art. 72(3)",
        remediationHint:
          "Completează minim 3 metode de colectare, descrie metodele de evaluare a conformității și procesele corective + preventive. Setează un ciclu de revizie (recomandat trimestrial pentru high-risk).",
        impactSummary:
          "Fără un plan PMM complet, deployer-ul nu poate demonstra monitorizare continuă; risc de sancțiune Art. 99 și de incapacitate de a răspunde la cerere autoritate.",
        evidenceRequired:
          "Plan PMM aprobat (markdown export) + screenshot dashboard monitoring + politică PMM semnată de DPO.",
        sourceDoc: `PMM Plan — ${record.title}`,
        nowISO,
      }),
    )
  }

  // Regula B — Data collection insuficient (severity medium)
  if (completenessReport.dataCollectionMethodsCount < 3) {
    candidateFindings.push(
      buildFinding({
        stableSuffix: `${record.id}-data-collection-insufficient`,
        title: `PMM data collection insuficient: ${completenessReport.dataCollectionMethodsCount} metode (min 3)`,
        detail: `Planul PMM "${record.title}" declară doar ${completenessReport.dataCollectionMethodsCount} metode de colectare. Art. 72(3)(a) cere metode + protocoale pentru colectarea + documentarea datelor relevante pentru performanța sistemului pe durata vieții — minim 3 surse complementare (ex: logs + metrics + user feedback).`,
        severity: "medium",
        legalReference: "EU AI Act Art. 72(3)(a)",
        remediationHint:
          "Adaugă minim: system_logs (Sprint 018), performance_metrics, user_feedback. Pentru high-risk, adaugă și bias_metrics + drift_detection.",
        impactSummary:
          "Fără surse multiple de date, drift-ul sau bias-ul pot rămâne nedetectate până devine incident raportabil Art. 73.",
        evidenceRequired:
          "Configurare pipeline data collection + dashboard cu metricile + politică PMM care enumeră sursele.",
        sourceDoc: `PMM Plan — ${record.title}`,
        nowISO,
      }),
    )
  }

  // Regula C — Review overdue (severity high)
  if (freshnessStatus === "overdue" && record.nextReviewISO) {
    const dueMs = new Date(record.nextReviewISO).getTime()
    const overdueDays = Math.max(0, Math.round((nowMs - dueMs) / 86_400_000))
    candidateFindings.push(
      buildFinding({
        stableSuffix: `${record.id}-review-overdue`,
        title: `PMM review overdue cu ${overdueDays} zile: ${sysName}`,
        detail: `Planul PMM "${record.title}" pentru sistemul "${sysName}" trebuia revizuit până la ${record.nextReviewISO}, dar ultima revizie efectuată este ${record.lastReviewAtISO ?? "nicio revizie"}. Art. 72(2) cere monitorizare pe DURATA VIEȚII — review-urile periodice nu pot fi sărite.`,
        severity: "high",
        legalReference: "EU AI Act Art. 72(2)",
        remediationHint:
          "Rulează un review imediat: actualizează performance metrics, riscuri detectate, acțiuni corective/preventive aplicate. Reschedule nextReviewISO conform ciclului.",
        impactSummary:
          "Review-uri sărite = sistem PMM nefuncțional în practică; deployer expus la deteriorare sistem nedetectată.",
        evidenceRequired:
          "PmmReviewRecord salvat + dashboard updated + email DPO confirmând execuția.",
        sourceDoc: `PMM Plan — ${record.title}`,
        nowISO,
      }),
    )
  }

  // Regula D — Modificare substanțială fără re-evaluare risc (severity CRITICAL)
  for (const change of unreassessedSubstantialChanges) {
    candidateFindings.push(
      buildFinding({
        stableSuffix: `${record.id}-substantial-change-${change.id}-no-reassessment`,
        title: `Modificare substanțială fără re-evaluare risc (Art. 43(4)): ${sysName}`,
        detail: `Sistemul AI "${sysName}" a suferit o modificare substanțială pe ${change.changedAtISO} (${change.oldVersion} → ${change.newVersion}, tip: ${change.changeType}). Conform Art. 43(4), schimbarea substanțială declanșează re-evaluarea conformity assessment, iar planul PMM cere review follow-up în ${SUBSTANTIAL_MOD_FOLLOWUP_DAYS} zile. Niciun review follow-up nu apare în istoric — sistemul rulează potențial cu non-conformitate.`,
        severity: "critical",
        legalReference: "EU AI Act Art. 43(4) + Art. 72(4)",
        remediationHint:
          "Execută IMEDIAT un PmmReviewRecord cu reviewType=incident_triggered. Actualizează FRIA + DPIA dacă riscurile s-au schimbat. Re-confirmă conformity assessment cu provider (sau organism notificat dacă deployer a devenit provider per Art. 25).",
        impactSummary:
          "Non-conformitate Art. 43(4) — sancționabilă Art. 99 până la 35M EUR sau 7% turnover. Sistem rulând în producție fără conformity assessment valid.",
        evidenceRequired:
          "PmmReviewRecord follow-up + raport re-evaluare risc + dovadă notificare provider + FRIA/DPIA actualizate.",
        sourceDoc: `PMM Plan — ${record.title}`,
        nowISO,
      }),
    )
  }

  // Regula E — Anomalie critică nerezolvată (severity high)
  for (const anomaly of criticalUnresolvedAnomalies) {
    const detectedMs = new Date(anomaly.detectedAtISO).getTime()
    const daysSince = Math.max(0, Math.round((nowMs - detectedMs) / 86_400_000))
    candidateFindings.push(
      buildFinding({
        stableSuffix: `${record.id}-anomaly-${anomaly.id}-unresolved`,
        title: `Anomalie critică nerezolvată ${daysSince} zile: ${sysName}`,
        detail: `Anomalia "${anomaly.description}" (categorie: ${anomaly.category}) detectată pe ${anomaly.detectedAtISO} pe sistemul "${sysName}" este de severitate CRITICAL și nu este rezolvată după ${daysSince} zile. Impact declarat: ${anomaly.impactDescription}. Art. 72(4) cere ca rezultatele PMM să informeze update-uri/îmbunătățiri — o anomalie critică nerezolvată indică breakdown în procesul corectiv.`,
        severity: "high",
        legalReference: "EU AI Act Art. 72(4) + Art. 73",
        remediationHint:
          "Evaluează escaladarea către AI Incident Reporting (Sprint 020, Art. 73 — incidente serioase 15 zile sau 2 zile pentru deces/lezare). Setează escalatedToIncident=true și linkează incidentul. Dezactivează sistemul dacă riscul curent este inacceptabil.",
        impactSummary:
          "Anomalii critice rămase deschise pot transmite spre incident raportabil Art. 73 cu termen scurt (2-15 zile). Inacțiunea = răspundere extinsă.",
        evidenceRequired:
          "PmmAnomalyRecord cu resolved=true + raport root cause + acțiune corectivă efectivă + (dacă escalatedToIncident) AI Incident Record link.",
        sourceDoc: `PMM Plan — ${record.title}`,
        nowISO,
      }),
    )
  }

  // 5) Markdown
  const generatedMarkdown = buildPmmMarkdown({
    record,
    orgName,
    systemName,
    completenessReport,
    freshnessStatus,
    candidateFindingsCount: candidateFindings.length,
    unreassessedSubstantialChanges,
    criticalUnresolvedAnomalies,
    nowISO,
  })

  return {
    completeness,
    completenessReport,
    freshnessStatus,
    candidateFindings,
    generatedMarkdown,
    unreassessedSubstantialChanges,
    criticalUnresolvedAnomalies,
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
    id: `pmm-finding-${args.stableSuffix}`,
    title: args.title,
    detail: args.detail,
    category: "EU_AI_ACT",
    severity: args.severity,
    risk:
      args.severity === "critical" || args.severity === "high" ? "high" : "low",
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
        "Responsabil PMM / DPO verifică + decide acțiunea înainte de continuarea utilizării sistemului AI.",
      closureEvidence: args.evidenceRequired,
      revalidation:
        "Recheck la fiecare review periodic PMM sau la schimbare materială a sistemului (≤ ciclul de revizie configurat).",
    },
  }
}

// ────────────────────────────────────────────────────────────────────────────
//   Markdown export
// ────────────────────────────────────────────────────────────────────────────

function buildPmmMarkdown(args: {
  record: PmmPlan
  orgName: string
  systemName?: string
  completenessReport: PmmCompletenessReport
  freshnessStatus: PmmFreshnessStatus
  candidateFindingsCount: number
  unreassessedSubstantialChanges: PmmVersionChangeRecord[]
  criticalUnresolvedAnomalies: PmmAnomalyRecord[]
  nowISO: string
}): string {
  const r = args.record
  const c = args.completenessReport
  const lines: (string | null)[] = [
    `# PMM Plan — ${r.title}`,
    "",
    `**Organizație:** ${args.orgName || "—"}`,
    `**Sistem AI vizat:** ${args.systemName ?? r.linkedAISystemId}`,
    `**Ciclu de revizie:** ${PMM_REVIEW_CYCLE_LABELS[r.reviewCycle]} (${r.reviewCycleMonths} luni)`,
    `**Status:** ${r.status}`,
    `**Completeness:** ${c.completeness}`,
    `**Freshness:** ${args.freshnessStatus}`,
    `**Generat la:** ${args.nowISO}`,
    r.approvedByEmail ? `**Aprobat de:** ${r.approvedByEmail} (${r.approvedAtISO ?? "—"})` : null,
    r.lastReviewAtISO ? `**Ultima revizie:** ${r.lastReviewAtISO}` : null,
    r.nextReviewISO ? `**Următoarea revizie:** ${r.nextReviewISO}` : null,
    r.rejectionReason ? `**Motiv respingere:** ${r.rejectionReason}` : null,
    "",
    "## A. Sistem AI + ciclu de revizie",
    `- Sistem AI: ${args.systemName ?? r.linkedAISystemId}`,
    `- Ciclu: ${PMM_REVIEW_CYCLE_LABELS[r.reviewCycle]}`,
    `- Luni între reviews: ${r.reviewCycleMonths}`,
    "",
    "## B. Data collection (Art. 72(3)(a))",
    `- **Frecvența:** ${PMM_DATA_COLLECTION_FREQUENCY_LABELS[r.dataCollectionFrequency]}`,
    `- **Metode active (${r.dataCollectionMethods.length}):**`,
  ]
  if (r.dataCollectionMethods.length === 0) {
    lines.push("  - _niciuna_")
  } else {
    for (const m of r.dataCollectionMethods) {
      lines.push(`  - ${PMM_DATA_COLLECTION_METHOD_LABELS[m]}`)
    }
  }
  lines.push("")
  lines.push("- **Descriere:**")
  lines.push(`  ${r.dataCollectionDescription || "_nedefinită_"}`)
  lines.push("")

  lines.push("## C. Evaluare conformitate continuă (Art. 72(3)(b))")
  lines.push("### Metodologii")
  if (r.complianceEvaluationMethods.length === 0) {
    lines.push("_nicio metodă declarată_")
  } else {
    for (const m of r.complianceEvaluationMethods) lines.push(`- ${m}`)
  }
  lines.push("")
  lines.push("### Metrici urmărite")
  if (r.complianceMetricsTracked.length === 0) {
    lines.push("_nicio metrică declarată_")
  } else {
    for (const m of r.complianceMetricsTracked) lines.push(`- ${m}`)
  }
  lines.push("")

  lines.push("## D. Acțiune corectivă + preventivă (Art. 72(3)(c))")
  lines.push("### Corectivă")
  lines.push(r.correctiveActionProcess || "_nedefinită_")
  lines.push("")
  lines.push("### Preventivă")
  lines.push(r.preventiveActionProcess || "_nedefinită_")
  lines.push("")

  // ── Reviews timeline ──
  lines.push("## Reviews periodice")
  if (r.reviews.length === 0) {
    lines.push("_Niciun review înregistrat._")
  } else {
    lines.push("| Data | Tip | Reviewer | Riscuri | Următor |")
    lines.push("|---|---|---|---|---|")
    for (const rv of r.reviews) {
      const risks = rv.risksDetected.length
      lines.push(
        `| ${rv.reviewDateISO} | ${rv.reviewType} | ${rv.reviewedByEmail} | ${risks} riscuri | ${rv.nextReviewISO} |`,
      )
    }
  }
  lines.push("")

  // ── Version changes timeline ──
  lines.push("## Version changes")
  if (r.versionChanges.length === 0) {
    lines.push("_Nicio schimbare de versiune înregistrată._")
  } else {
    lines.push("| Data | Versiuni | Tip | Substanțial | Re-eval risc | De |")
    lines.push("|---|---|---|---|---|---|")
    for (const ch of r.versionChanges) {
      lines.push(
        `| ${ch.changedAtISO} | ${ch.oldVersion} → ${ch.newVersion} | ${ch.changeType} | ${ch.substantialModification ? "DA" : "—"} | ${ch.riskReassessmentRequired ? "DA" : "—"} | ${ch.changedByEmail} |`,
      )
    }
  }
  if (args.unreassessedSubstantialChanges.length > 0) {
    lines.push("")
    lines.push("> ⚠ Modificări substanțiale fără re-evaluare risc (Art. 43(4)):")
    for (const ch of args.unreassessedSubstantialChanges) {
      lines.push(`> - ${ch.oldVersion} → ${ch.newVersion} (${ch.changedAtISO}): ${ch.description}`)
    }
  }
  lines.push("")

  // ── Anomalies ──
  lines.push("## Anomalii detectate")
  if (r.anomalies.length === 0) {
    lines.push("_Nicio anomalie înregistrată._")
  } else {
    lines.push("| Data | Severitate | Categorie | Descriere | Rezolvat | Escaladat |")
    lines.push("|---|---|---|---|---|---|")
    for (const a of r.anomalies) {
      lines.push(
        `| ${a.detectedAtISO} | ${a.severity} | ${a.category} | ${a.description} | ${a.resolved ? "DA" : "NU"} | ${a.escalatedToIncident ? "DA" : "—"} |`,
      )
    }
  }
  if (args.criticalUnresolvedAnomalies.length > 0) {
    lines.push("")
    lines.push("> ⚠ Anomalii critice nerezolvate de > 7 zile:")
    for (const a of args.criticalUnresolvedAnomalies) {
      lines.push(`> - [${a.detectedAtISO}] ${a.description} (impact: ${a.impactDescription})`)
    }
  }
  lines.push("")

  lines.push("## Sumar evaluare")
  lines.push(`- Findings candidate emise: ${args.candidateFindingsCount}`)
  lines.push(`- Metode colectare date: ${c.dataCollectionMethodsCount}`)
  lines.push(`- Metode evaluare conformitate: ${c.hasComplianceEvaluationMethods ? "DA" : "NU"}`)
  lines.push(`- Metrici tracked: ${c.hasComplianceMetricsTracked ? "DA" : "NU"}`)
  lines.push(`- Proces corectiv: ${c.hasCorrectiveActionProcess ? "DA" : "NU"}`)
  lines.push(`- Proces preventiv: ${c.hasPreventiveActionProcess ? "DA" : "NU"}`)
  lines.push(`- Ciclu revizie definit: ${c.hasReviewCycle ? "DA" : "NU"}`)
  lines.push(`- Completeness: **${c.completeness}**`)
  lines.push(`- Freshness: **${args.freshnessStatus}**`)
  lines.push("")

  lines.push("## Checklist final")
  lines.push(`- [${c.dataCollectionMethodsCount >= 3 ? "x" : " "}] ≥ 3 metode data collection (Art. 72(3)(a))`)
  lines.push(`- [${c.hasComplianceEvaluationMethods ? "x" : " "}] Metodologie evaluare conformitate definită (Art. 72(3)(b))`)
  lines.push(`- [${c.hasComplianceMetricsTracked ? "x" : " "}] Metrici tracked enumerate`)
  lines.push(`- [${c.hasCorrectiveActionProcess ? "x" : " "}] Proces corectiv documentat (Art. 72(3)(c))`)
  lines.push(`- [${c.hasPreventiveActionProcess ? "x" : " "}] Proces preventiv documentat (Art. 72(3)(c))`)
  lines.push(`- [${c.hasReviewCycle ? "x" : " "}] Ciclu de revizie set`)
  lines.push(`- [${r.status === "active" ? "x" : " "}] Plan activ`)
  lines.push(`- [${args.freshnessStatus !== "overdue" ? "x" : " "}] Review nu este overdue`)
  lines.push(`- [${args.unreassessedSubstantialChanges.length === 0 ? "x" : " "}] Nicio modificare substanțială fără re-evaluare (Art. 43(4))`)
  lines.push(`- [${args.criticalUnresolvedAnomalies.length === 0 ? "x" : " "}] Nicio anomalie critică nerezolvată > 7 zile`)
  lines.push("")
  lines.push(
    "> PMM Plan pregătit conform Art. 72 + Annex IV pct. 10 Regulament (UE) 2024/1689. Reprezintă măsurile de bună-credință ale deployer-ului / provider-ului; nu înlocuiește opinia juridică finală.",
  )

  if (r.notes) {
    lines.push("")
    lines.push("## Note suplimentare")
    lines.push(r.notes)
  }

  return lines.filter((line): line is string => typeof line === "string").join("\n")
}
