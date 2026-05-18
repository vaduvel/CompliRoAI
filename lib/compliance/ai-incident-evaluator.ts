// AI Incident Reporting Evaluator — Sprint 020 (Art. 73 AI Act).
//
// Pure functions pentru:
//   1. computeReportingDeadline(category, detectedAtISO) → deadline + days
//   2. computeDeadlineStatus(record, nowISO?) → countdown + urgency
//   3. evaluateIncident(input) → notificationRequired + urgency + gaps[] +
//      candidateFindings[]
//   4. Markdown export pentru audit pack
//
// Apelat din:
//   - ai-incident-store.ts pe createIncident / updateIncident /
//     markAuthorityNotified / recordRootCause / closeIncident
//   - API route export pentru a regenera markdown la fiecare descărcare

import type { ComplianceSeverity } from "@/lib/compliance/constitution"
import {
  AI_INCIDENT_CATEGORY_DEADLINE_DAYS,
  AI_INCIDENT_CATEGORY_LABELS,
  AI_INCIDENT_SEVERITY_LABELS,
  AI_INCIDENT_STATUS_LABELS,
} from "@/lib/compliance/ai-incident-schema"
import type {
  AIIncident,
  AIIncidentCategory,
  AISystemRecord,
  ScanFinding,
} from "@/lib/compliance/types"

// ────────────────────────────────────────────────────────────────────────────
//   Constants
// ────────────────────────────────────────────────────────────────────────────

const DAY_MS = 86_400_000
const HOUR_MS = 3_600_000
const URGENT_HOURS_THRESHOLD = 24

// ────────────────────────────────────────────────────────────────────────────
//   Deadline computation (Art. 73(3))
// ────────────────────────────────────────────────────────────────────────────

export function computeReportingDeadline(
  category: AIIncidentCategory,
  detectedAtISO: string,
): { deadlineISO: string; days: 2 | 10 | 15 } {
  const days = AI_INCIDENT_CATEGORY_DEADLINE_DAYS[category]
  const detectedMs = new Date(detectedAtISO).getTime()
  if (!Number.isFinite(detectedMs)) {
    throw new Error(
      `computeReportingDeadline: detectedAtISO invalid (${detectedAtISO})`,
    )
  }
  const deadlineMs = detectedMs + days * DAY_MS
  return { deadlineISO: new Date(deadlineMs).toISOString(), days }
}

// ────────────────────────────────────────────────────────────────────────────
//   Deadline countdown / status
// ────────────────────────────────────────────────────────────────────────────

export type AIIncidentDeadlineStatus = {
  hoursLeft: number // poate fi negativ dacă expirat
  daysLeft: number // round (poate fi negativ)
  expired: boolean
  urgent: boolean // 0 < hoursLeft ≤ 24
  level: "ok" | "warn" | "urgent" | "expired" | "notified"
}

/**
 * Returnează statusul deadline-ului raportării autorității. Dacă a fost deja
 * trimisă cel puțin o notificare cu status submitted/acknowledged, level=notified
 * (raportarea s-a făcut chiar dacă deadline-ul a trecut).
 */
export function computeDeadlineStatus(
  record: Pick<AIIncident, "reportingDeadlineISO" | "notifications">,
  nowISO: string = new Date().toISOString(),
): AIIncidentDeadlineStatus {
  const submitted = (record.notifications ?? []).some(
    (n) => n.status === "submitted" || n.status === "acknowledged",
  )
  const diffMs =
    new Date(record.reportingDeadlineISO).getTime() - new Date(nowISO).getTime()
  const hoursLeft = Math.round(diffMs / HOUR_MS)
  const daysLeft = Math.round(diffMs / DAY_MS)
  const expired = hoursLeft <= 0
  const urgent = !expired && hoursLeft <= URGENT_HOURS_THRESHOLD
  const warn = !expired && !urgent && hoursLeft <= 72
  let level: AIIncidentDeadlineStatus["level"]
  if (submitted) level = "notified"
  else if (expired) level = "expired"
  else if (urgent) level = "urgent"
  else if (warn) level = "warn"
  else level = "ok"
  return { hoursLeft, daysLeft, expired, urgent, level }
}

// ────────────────────────────────────────────────────────────────────────────
//   Evaluation
// ────────────────────────────────────────────────────────────────────────────

export type AIIncidentEvaluationGap = {
  code:
    | "missing_root_cause"
    | "missing_authority_notification"
    | "deadline_overdue"
    | "no_assignee"
    | "catastrophic_not_closed"
    | "no_affected_categories"
    | "notification_required_no_notification"
  message: string
  severity: ComplianceSeverity
}

export type AIIncidentEvaluationResult = {
  notificationRequired: boolean
  deadlineStatus: AIIncidentDeadlineStatus
  urgency: "low" | "medium" | "high" | "critical"
  gaps: AIIncidentEvaluationGap[]
  candidateFindings: ScanFinding[]
  generatedMarkdown: string
}

export type EvaluateAIIncidentInput = {
  record: AIIncident
  orgName: string
  systemName?: string
  linkedSystem?: AISystemRecord
  /** Folosit pentru stable finding IDs și markdown timestamps. */
  nowISO?: string
}

/**
 * Funcția centrală: ia un AIIncident și returnează:
 *  - notificationRequired (din record sau forced TRUE pentru deces / critical)
 *  - urgency (din deadline + severity + status)
 *  - gaps[] (root cause lipsă, notificare lipsă, deadline overdue, etc.)
 *  - candidateFindings[] (pre-persist, pentru store)
 *  - markdown export
 */
export function evaluateIncident(
  input: EvaluateAIIncidentInput,
): AIIncidentEvaluationResult {
  const { record, orgName, systemName } = input
  const nowISO = input.nowISO ?? new Date().toISOString()
  const nowMs = new Date(nowISO).getTime()

  // 1) Deadline status
  const deadlineStatus = computeDeadlineStatus(record, nowISO)

  // 2) Notification required — forced TRUE pentru categorii (a)/(b)/(c)
  // chiar dacă utilizatorul a marcat false (override de siguranță).
  const isHighRiskCategory =
    record.category === "death_or_serious_harm_health" ||
    record.category === "critical_infrastructure_disruption" ||
    record.category === "widespread_infringement" ||
    record.category === "fundamental_rights_infringement"
  const notificationRequired = record.notificationRequired || isHighRiskCategory

  // 3) Urgency (4 levels)
  let urgency: AIIncidentEvaluationResult["urgency"] = "low"
  if (deadlineStatus.expired && notificationRequired && !hasSubmittedNotification(record)) {
    urgency = "critical"
  } else if (record.severity === "catastrophic") {
    urgency = "critical"
  } else if (deadlineStatus.urgent && notificationRequired) {
    urgency = "high"
  } else if (deadlineStatus.level === "warn" && notificationRequired) {
    urgency = "medium"
  } else if (record.severity === "serious") {
    urgency = "medium"
  }

  // 4) Gaps detection
  const gaps: AIIncidentEvaluationGap[] = []
  const sysName = systemName ?? record.linkedAISystemId

  if (
    notificationRequired &&
    !hasSubmittedNotification(record) &&
    deadlineStatus.expired
  ) {
    const overdueDays = Math.abs(deadlineStatus.daysLeft)
    gaps.push({
      code: "deadline_overdue",
      message: `Deadline Art. 73(3) depășit cu ${overdueDays} zile. Autoritatea NU a fost notificată.`,
      severity: "critical",
    })
  }
  if (
    notificationRequired &&
    !hasSubmittedNotification(record) &&
    !deadlineStatus.expired
  ) {
    gaps.push({
      code: "notification_required_no_notification",
      message: `Notificare Art. 73(1) obligatorie încă netrimisă (${deadlineStatus.daysLeft} zile rămase).`,
      severity: deadlineStatus.urgent ? "high" : "medium",
    })
  }
  if (!record.rootCause && record.status !== "draft" && record.status !== "not_reportable") {
    gaps.push({
      code: "missing_root_cause",
      message:
        "Lipsește investigația root cause obligatorie (Art. 73(4)). Investigația trebuie completată după notificare și înainte de închidere.",
      severity: "high",
    })
  }
  if (record.severity === "catastrophic" && record.status !== "closed") {
    gaps.push({
      code: "catastrophic_not_closed",
      message:
        "Incident severitate CATASTROFIC fără închidere documentată. Necesită closure cu evidență acțiuni corective + preventive aplicate.",
      severity: "high",
    })
  }
  if (!record.assignedToEmail || !record.assignedToEmail.includes("@")) {
    gaps.push({
      code: "no_assignee",
      message:
        "Niciun responsabil asignat. Incidentul nu poate fi escaladat în timp util fără owner.",
      severity: "medium",
    })
  }
  if (
    record.affectedSubjectsCategories.length === 0 &&
    record.category !== "critical_infrastructure_disruption" &&
    record.category !== "property_or_environment_harm"
  ) {
    gaps.push({
      code: "no_affected_categories",
      message:
        "Nu sunt declarate categorii de persoane afectate (necesar pentru raport Art. 73(5)).",
      severity: "low",
    })
  }
  // Verificare specifică: notificare submitted dar fără referință (probă lipsă)
  if (hasSubmittedNotification(record)) {
    const lastSubmitted = (record.notifications ?? []).find(
      (n) =>
        (n.status === "submitted" || n.status === "acknowledged") &&
        !n.referenceNumber,
    )
    if (lastSubmitted) {
      gaps.push({
        code: "missing_authority_notification",
        message:
          "Notificare marcată ca trimisă dar lipsește numărul de înregistrare al autorității (probă oficială).",
        severity: "medium",
      })
    }
  }

  // 5) Candidate findings — emise prin createFinding() de store
  const candidateFindings: ScanFinding[] = []

  if (
    notificationRequired &&
    !hasSubmittedNotification(record) &&
    deadlineStatus.expired
  ) {
    const overdueDays = Math.abs(deadlineStatus.daysLeft)
    candidateFindings.push(
      buildFinding({
        stableSuffix: `${record.id}-deadline-overdue`,
        title: `Incident AI nereported peste deadline Art. 73 (${overdueDays} zile depășite): ${sysName}`,
        detail: `Incidentul "${record.title}" pe sistemul "${sysName}" (categorie: ${AI_INCIDENT_CATEGORY_LABELS[record.category]}) a fost detectat la ${record.detectedAtISO} cu termen Art. 73(3) de ${record.reportingDeadlineDays} zile (deadline ${record.reportingDeadlineISO}). Termenul a fost depășit cu ${overdueDays} zile și NU s-a transmis încă notificarea către autoritatea de supraveghere a pieței.`,
        severity: "critical",
        legalReference: "EU AI Act Art. 73(1) + Art. 73(3) + Art. 99",
        remediationHint:
          "Transmite IMEDIAT notificarea către autoritate prin instrumentele platformei (modal 'Trimite notificare autoritate'). Documentează cauza întârzierii și măsurile pentru a preveni recurența. Verifică dacă incidentul atinge și date personale (BreachRecord Sprint 008D — notificare ANSPDCP separată la 72h Art. 33).",
        impactSummary:
          "Nerespectare termen Art. 73 este sancționabilă Art. 99 până la 35M EUR sau 7% turnover global. Statul român coordonează prin ADR; market surveillance authority specifică va aplica sancțiunea.",
        evidenceRequired:
          "Confirmare notificare autoritate (AIIncidentNotificationRecord submitted + referenceNumber) + raport intern cu justificare întârziere + plan prevenire repetare.",
        sourceDoc: `AI Incident — ${record.title}`,
        nowISO,
      }),
    )
  }

  if (!record.rootCause && record.status !== "draft" && record.status !== "not_reportable") {
    candidateFindings.push(
      buildFinding({
        stableSuffix: `${record.id}-missing-root-cause`,
        title: `Lipsește root cause investigation Art. 73(4): ${sysName}`,
        detail: `Incidentul "${record.title}" pe sistemul "${sysName}" este în status "${AI_INCIDENT_STATUS_LABELS[record.status]}" dar nu există investigație root cause completată. Art. 73(4) cere ca provider-ul (și deployer-ul prin Art. 26(5)) să investigheze cauzele incidentului, să identifice contribuitorii și să implementeze măsuri corective + preventive verificabile.`,
        severity: "high",
        legalReference: "EU AI Act Art. 73(4) + Art. 26(5)",
        remediationHint:
          "Completează AIIncidentRootCause cu: descriere cauză, factori contribuitori, dovezi colectate, acțiuni corective + preventive aplicate. Folosește modalul 'Investigație root cause' din UI.",
        impactSummary:
          "Fără root cause + măsuri corective, incidentul rămâne deschis indefinit, organizația nu poate demonstra învățare și risc de repetiție. Inacceptabil pentru închidere audit.",
        evidenceRequired:
          "AIIncidentRootCause complet + dovezi acțiuni implementate (screenshots, jurnal versiuni model, raport tehnic).",
        sourceDoc: `AI Incident — ${record.title}`,
        nowISO,
      }),
    )
  }

  if (record.severity === "catastrophic" && record.status !== "closed") {
    candidateFindings.push(
      buildFinding({
        stableSuffix: `${record.id}-catastrophic-not-closed`,
        title: `Incident severitate catastrofic fără closure: ${sysName}`,
        detail: `Incidentul "${record.title}" pe sistemul "${sysName}" este de severitate CATASTROFIC dar nu este închis (status: ${AI_INCIDENT_STATUS_LABELS[record.status]}). Incidentele catastrofice impun closure formal cu evidență acțiuni corective + preventive aplicate efectiv, decizie privind continuarea utilizării sistemului AI și lecții documentate pentru QMS (Sprint 021).`,
        severity: "high",
        legalReference: "EU AI Act Art. 73(4) + Art. 17 (QMS)",
        remediationHint:
          "Completează AIIncidentRootCause, aplică acțiuni corective + preventive, decide dacă sistemul AI continuă în producție sau este suspendat. Apasă 'Închide incident' cu notes documentate.",
        impactSummary:
          "Incidentele catastrofice deschise indefinit indică breakdown în governance AI; risc de sancțiune Art. 99 + risc reputațional + risc juridic civil (răspundere extinsă pentru producător/operator).",
        evidenceRequired:
          "Status='closed' + closureNotes + closedAtISO + linkedFindingIds rezolvate + (dacă cazul) decizie suspendare sistem AI.",
        sourceDoc: `AI Incident — ${record.title}`,
        nowISO,
      }),
    )
  }

  if (hasSubmittedNotification(record)) {
    const lastSubmitted = (record.notifications ?? []).find(
      (n) =>
        (n.status === "submitted" || n.status === "acknowledged") &&
        !n.referenceNumber,
    )
    if (lastSubmitted) {
      candidateFindings.push(
        buildFinding({
          stableSuffix: `${record.id}-missing-authority-ref-${lastSubmitted.id}`,
          title: `Lipsește referință notificare autoritate: ${sysName}`,
          detail: `Incidentul "${record.title}" are notificare marcată ca trimisă către "${lastSubmitted.authorityName}" dar lipsește numărul de înregistrare oficial (probă). Fără referință, notificarea nu este verificabilă într-un audit și nu poate fi demonstrată respectarea Art. 73(1).`,
          severity: "medium",
          legalReference: "EU AI Act Art. 73(1) — verifiable submission",
          remediationHint:
            "Adaugă referenceNumber pe AIIncidentNotificationRecord cu numărul oficial primit de la autoritate (email confirmare, formular de înregistrare, ștampilă electronică). Dacă autoritatea nu a confirmat încă, marchează status='draft' până la primirea confirmării.",
          impactSummary:
            "Probă lipsă = imposibilitate audit; riscul sancționabilității Art. 99 rămâne deschis chiar dacă material notificarea a fost expediată.",
          evidenceRequired:
            "AIIncidentNotificationRecord.referenceNumber completat + (dacă cazul) acknowledgmentReceivedAtISO.",
          sourceDoc: `AI Incident — ${record.title}`,
          nowISO,
        }),
      )
    }
  }

  // 6) Markdown
  const generatedMarkdown = buildIncidentMarkdown({
    record,
    orgName,
    systemName,
    deadlineStatus,
    notificationRequired,
    urgency,
    gaps,
    candidateFindingsCount: candidateFindings.length,
    nowISO,
  })

  return {
    notificationRequired,
    deadlineStatus,
    urgency,
    gaps,
    candidateFindings,
    generatedMarkdown,
  }
}

// ────────────────────────────────────────────────────────────────────────────
//   Helpers
// ────────────────────────────────────────────────────────────────────────────

function hasSubmittedNotification(
  record: Pick<AIIncident, "notifications">,
): boolean {
  return (record.notifications ?? []).some(
    (n) => n.status === "submitted" || n.status === "acknowledged",
  )
}

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
    id: `ai-incident-finding-${args.stableSuffix}`,
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
        "Responsabil incident / DPO verifică + acționează înainte de continuarea utilizării sistemului AI.",
      closureEvidence: args.evidenceRequired,
      revalidation:
        "Recheck la fiecare actualizare a incidentului sau la închidere; reopenable dacă incidentul re-apare.",
    },
  }
}

// ────────────────────────────────────────────────────────────────────────────
//   Markdown export — folosit de Audit Pack + API export
// ────────────────────────────────────────────────────────────────────────────

function buildIncidentMarkdown(args: {
  record: AIIncident
  orgName: string
  systemName?: string
  deadlineStatus: AIIncidentDeadlineStatus
  notificationRequired: boolean
  urgency: AIIncidentEvaluationResult["urgency"]
  gaps: AIIncidentEvaluationGap[]
  candidateFindingsCount: number
  nowISO: string
}): string {
  const r = args.record
  const lines: (string | null)[] = [
    `# Incident AI — ${r.title}`,
    "",
    `**Organizație:** ${args.orgName || "—"}`,
    `**Sistem AI implicat:** ${args.systemName ?? r.linkedAISystemId}`,
    `**Categorie Art. 73(2):** ${AI_INCIDENT_CATEGORY_LABELS[r.category]}`,
    `**Severitate (intern):** ${AI_INCIDENT_SEVERITY_LABELS[r.severity]}`,
    `**Status:** ${AI_INCIDENT_STATUS_LABELS[r.status]}`,
    `**Urgență evaluator:** ${args.urgency.toUpperCase()}`,
    `**Generat la:** ${args.nowISO}`,
    r.assignedToEmail ? `**Responsabil:** ${r.assignedToEmail}` : null,
    r.closedAtISO ? `**Închis la:** ${r.closedAtISO}` : null,
    "",
    "## A. Identificare incident",
    `- Titlu: ${r.title}`,
    `- Sistem AI: ${args.systemName ?? r.linkedAISystemId}`,
    `- Descriere:`,
    "",
    r.description || "_de completat_",
    "",
    "## B. Severitate + categorie Art. 73(2)",
    `- Categorie: ${AI_INCIDENT_CATEGORY_LABELS[r.category]}`,
    `- Severitate intern: ${AI_INCIDENT_SEVERITY_LABELS[r.severity]}`,
    `- Notificare autoritate obligatorie: ${args.notificationRequired ? "DA" : "NU"}`,
    "",
    "## C. Cronologie (Art. 73(3))",
    r.occurredAtISO
      ? `- Producere estimată: ${r.occurredAtISO}`
      : "- Producere estimată: necunoscută",
    `- Detectare (clock start Art. 73(3)): ${r.detectedAtISO}`,
    `- Termen raportare: ${r.reportingDeadlineISO} (${r.reportingDeadlineDays} zile)`,
    `- Status deadline: ${args.deadlineStatus.level} (${args.deadlineStatus.hoursLeft}h, ${args.deadlineStatus.daysLeft}z)`,
    "",
    "## D. Părți afectate",
    `- Număr aproximativ persoane afectate: ${
      typeof r.affectedSubjectsCount === "number" ? r.affectedSubjectsCount : "necunoscut"
    }`,
    `- Categorii persoane afectate:`,
  ]
  if (r.affectedSubjectsCategories.length === 0) {
    lines.push("  - _niciuna declarată_")
  } else {
    for (const c of r.affectedSubjectsCategories) lines.push(`  - ${c}`)
  }
  lines.push("")

  // ── Notificări autoritate ──
  lines.push("## Notificări către autoritatea de supraveghere")
  if (!r.notifications || r.notifications.length === 0) {
    lines.push("_Nicio notificare transmisă._")
  } else {
    lines.push("| Data | Autoritate | Status | Referință | Contact |")
    lines.push("|---|---|---|---|---|")
    for (const n of r.notifications) {
      lines.push(
        `| ${n.submittedAtISO ?? "—"} | ${n.authorityName} | ${n.status} | ${n.referenceNumber ?? "—"} | ${n.contactPersonEmail ?? "—"} |`,
      )
    }
  }
  lines.push("")

  // ── Root cause Art. 73(4) ──
  lines.push("## Investigație cauză rădăcină (Art. 73(4))")
  if (!r.rootCause) {
    lines.push("_Investigație necompletată._")
  } else {
    lines.push(
      `- Identificată la: ${r.rootCause.identifiedAtISO} de ${r.rootCause.identifiedByEmail}`,
    )
    lines.push("")
    lines.push("### Descriere cauză")
    lines.push(r.rootCause.rootCauseDescription || "_nedefinită_")
    lines.push("")
    lines.push("### Factori contribuitori")
    if (r.rootCause.contributingFactors.length === 0) {
      lines.push("- _nedefiniți_")
    } else {
      for (const f of r.rootCause.contributingFactors) lines.push(`- ${f}`)
    }
    lines.push("")
    lines.push("### Dovezi colectate")
    if (r.rootCause.evidenceCollected.length === 0) {
      lines.push("- _nedefinite_")
    } else {
      for (const e of r.rootCause.evidenceCollected) lines.push(`- ${e}`)
    }
    lines.push("")
    lines.push("### Acțiuni corective aplicate")
    if (r.rootCause.remediationActions.length === 0) {
      lines.push("- _nedefinite_")
    } else {
      for (const a of r.rootCause.remediationActions) lines.push(`- ${a}`)
    }
    lines.push("")
    lines.push("### Acțiuni preventive (prevenire repetare)")
    if (r.rootCause.preventionActions.length === 0) {
      lines.push("- _nedefinite_")
    } else {
      for (const a of r.rootCause.preventionActions) lines.push(`- ${a}`)
    }
    if (r.rootCause.preventiveMeasuresImplementedAtISO) {
      lines.push("")
      lines.push(
        `**Măsuri implementate efectiv la:** ${r.rootCause.preventiveMeasuresImplementedAtISO}`,
      )
    }
  }
  lines.push("")

  // ── Linkages ──
  lines.push("## Linkages")
  lines.push(
    `- BreachRecord legat (GDPR Art. 33, Sprint 008D): ${r.linkedBreachId ?? "—"}`,
  )
  lines.push(
    `- Anomalie PMM legată (Art. 72, Sprint 019): ${r.linkedPmmAnomalyId ?? "—"}`,
  )
  lines.push(
    `- Findings legate: ${r.linkedFindingIds.length === 0 ? "—" : r.linkedFindingIds.join(", ")}`,
  )
  if (r.closureNotes) {
    lines.push("")
    lines.push("## Note închidere")
    lines.push(r.closureNotes)
  }
  lines.push("")

  // ── Gaps + Sumar ──
  lines.push("## Lacune detectate de evaluator")
  if (args.gaps.length === 0) {
    lines.push("_Nicio lacună._")
  } else {
    lines.push("| Cod | Severitate | Mesaj |")
    lines.push("|---|---|---|")
    for (const g of args.gaps) {
      lines.push(
        `| ${g.code} | ${g.severity} | ${escapeCell(g.message)} |`,
      )
    }
  }
  lines.push("")

  lines.push("## Sumar evaluare")
  lines.push(`- Findings candidate emise: ${args.candidateFindingsCount}`)
  lines.push(`- Urgență: **${args.urgency.toUpperCase()}**`)
  lines.push(`- Status deadline: **${args.deadlineStatus.level}**`)
  lines.push(`- Notificare obligatorie: **${args.notificationRequired ? "DA" : "NU"}**`)
  lines.push(`- Investigație root cause: **${r.rootCause ? "completă" : "lipsă"}**`)
  lines.push("")

  // ── Checklist ──
  lines.push("## Checklist Art. 73")
  lines.push(`- [${r.detectedAtISO ? "x" : " "}] detectedAt setat (clock Art. 73(3))`)
  lines.push(
    `- [${args.notificationRequired ? "x" : " "}] Notificare obligatorie evaluată`,
  )
  lines.push(
    `- [${hasSubmittedNotification(r) ? "x" : " "}] Cel puțin 1 notificare submitted`,
  )
  lines.push(`- [${r.rootCause ? "x" : " "}] Root cause completat (Art. 73(4))`)
  lines.push(
    `- [${r.status === "closed" || r.status === "not_reportable" ? "x" : " "}] Status final (closed sau not_reportable)`,
  )
  lines.push(
    `- [${args.deadlineStatus.level !== "expired" || hasSubmittedNotification(r) ? "x" : " "}] Deadline respectat (sau notificare deja transmisă)`,
  )
  lines.push("")

  lines.push(
    "> Document operațional generat de CompliRoAI conform Art. 73 EU AI Act. Reprezintă măsurile de bună-credință ale organizației; nu înlocuiește opinia juridică finală.",
  )

  if (r.notes) {
    lines.push("")
    lines.push("## Note suplimentare")
    lines.push(r.notes)
  }

  return lines.filter((line): line is string => typeof line === "string").join("\n")
}

function escapeCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\r?\n/g, " ").trim()
}
