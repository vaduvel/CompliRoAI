// Human Oversight Evaluator — Sprint 017 (Art. 14 AI Act).
//
// Pure functions pentru:
//   1. Completeness check: incomplete / partial / complete per cele 5 capacități
//   2. Emission de findings candidate (Art. 14(3) + Art. 14(4) + Art. 26(2))
//   3. Markdown export pentru audit pack
//
// Apelat din:
//   - oversight-store.ts pe createProtocol / updateProtocol pentru a calcula
//     completeness și a emite findings prin createFinding()
//   - API route export pentru a regenera markdown la fiecare descărcare

import type { ComplianceSeverity } from "@/lib/compliance/constitution"
import {
  COMPETENCE_LEVEL_LABELS,
  FALLBACK_MODE_LABELS,
  NOTIFICATION_METHOD_LABELS,
  OVERSIGHT_CAPABILITIES_ORDERED,
  OVERSIGHT_CAPABILITY_LABELS,
  OVERSIGHT_MODEL_LABELS,
  TEST_FREQUENCY_LABELS,
} from "@/lib/compliance/oversight-schema"
import type {
  AISystemRecord,
  HumanOversightProtocol,
  OversightCapability,
  OversightCompleteness,
  ScanFinding,
} from "@/lib/compliance/types"

// ────────────────────────────────────────────────────────────────────────────
//   Constants
// ────────────────────────────────────────────────────────────────────────────

const REVIEW_OVERDUE_DAYS = 180

// ────────────────────────────────────────────────────────────────────────────
//   Completeness check
// ────────────────────────────────────────────────────────────────────────────

export type OversightCompletenessReport = {
  completeness: OversightCompleteness
  missingCapabilities: OversightCapability[]
  hasResponsibleWithAuthority: boolean
  hasEscalation: boolean
  hasContestation: boolean
  hasStopButton: boolean
  reasons: string[]
}

export function computeOversightCompleteness(
  record: HumanOversightProtocol,
): OversightCompletenessReport {
  const missingCapabilities = OVERSIGHT_CAPABILITIES_ORDERED.filter(
    (c) => !record.capabilitiesCovered.includes(c),
  )
  const covered = OVERSIGHT_CAPABILITIES_ORDERED.length - missingCapabilities.length

  const hasResponsibleWithAuthority = record.responsibleHumans.some(
    (h) => h.hasAuthorityToOverride && h.email.trim().length > 0,
  )
  const hasEscalation = record.escalationSteps.length > 0
  const hasContestation =
    record.contestationProcedure?.channelDescription.trim().length > 5 &&
    record.contestationProcedure.resolutionSlaDays > 0
  const hasStopButton = record.stopProcedure?.stopButtonAvailable === true

  const reasons: string[] = []
  if (missingCapabilities.length > 0) {
    reasons.push(
      `Lipsesc ${missingCapabilities.length} capacități Art. 14(3): ${missingCapabilities.map((c) => OVERSIGHT_CAPABILITY_LABELS[c]).join("; ")}`,
    )
  }
  if (!hasResponsibleWithAuthority) {
    reasons.push("Nicio persoană responsabilă cu autoritate de override.")
  }
  if (!hasEscalation) reasons.push("Niciun pas de escaladare definit.")
  if (!hasContestation) reasons.push("Procedură de contestație incompletă.")
  if (!hasStopButton) reasons.push("Buton stop indisponibil sau nedeclarat.")

  let completeness: OversightCompleteness
  if (
    covered === 5 &&
    hasResponsibleWithAuthority &&
    hasEscalation &&
    hasContestation &&
    hasStopButton
  ) {
    completeness = "complete"
  } else if (covered >= 3 && hasResponsibleWithAuthority) {
    completeness = "partial"
  } else {
    completeness = "incomplete"
  }

  return {
    completeness,
    missingCapabilities,
    hasResponsibleWithAuthority,
    hasEscalation,
    hasContestation,
    hasStopButton,
    reasons,
  }
}

// ────────────────────────────────────────────────────────────────────────────
//   Aggregate evaluation
// ────────────────────────────────────────────────────────────────────────────

export type OversightEvaluationResult = {
  completeness: OversightCompleteness
  completenessReport: OversightCompletenessReport
  candidateFindings: ScanFinding[]
  generatedMarkdown: string
}

export type EvaluateOversightInput = {
  record: HumanOversightProtocol
  orgName: string
  /** Numele sistemului AI evaluat (context). */
  systemName?: string
  /** Tipul sistemului AI vizat — folosit pentru regula Art. 14(4) biometric. */
  linkedSystem?: AISystemRecord
  /** Folosit pentru stable finding IDs și markdown timestamps. */
  nowISO?: string
}

/**
 * Funcția centrală: ia un HumanOversightProtocol și returnează:
 *  - completeness (calculat)
 *  - findings candidate (pre-persist)
 *  - markdown export
 */
export function evaluateOversight(
  input: EvaluateOversightInput,
): OversightEvaluationResult {
  const { record, orgName, systemName, linkedSystem } = input
  const nowISO = input.nowISO ?? new Date().toISOString()

  // 1) Completeness
  const completenessReport = computeOversightCompleteness(record)
  const completeness = completenessReport.completeness

  // 2) Findings candidate per regulile Art. 14
  const candidateFindings: ScanFinding[] = []

  // Regula A — lipsesc capacități Art. 14(3) (severity high)
  if (completenessReport.missingCapabilities.length > 0) {
    candidateFindings.push(
      buildFinding({
        stableSuffix: `${record.id}-caps-missing`,
        title: `Lipsesc capacități Art. 14(3): ${completenessReport.missingCapabilities.length}/5 neacoperite`,
        detail: `Protocolul oversight "${record.title}" nu acoperă toate cele 5 capacități obligatorii cerute de Art. 14(3): ${completenessReport.missingCapabilities.map((c) => OVERSIGHT_CAPABILITY_LABELS[c]).join("; ")}.`,
        severity: "high",
        legalReference: "EU AI Act Art. 14(3)(a)-(e)",
        remediationHint:
          "Documentați training-uri, manuale operator și UI pentru fiecare capacitate lipsă. Marchează ca acoperită doar când există dovadă (training record, screenshot UI, log).",
        impactSummary:
          "Fără cele 5 capacități, persoana responsabilă nu poate exercita supravegherea umană efectivă cerută de regulament.",
        evidenceRequired:
          "Training records, manual operator, screenshot UI buton stop, log decizii override.",
        sourceDoc: `Oversight Protocol — ${record.title}`,
        nowISO,
      }),
    )
  }

  // Regula B — niciun responsabil cu autoritate (severity critical)
  if (!completenessReport.hasResponsibleWithAuthority) {
    candidateFindings.push(
      buildFinding({
        stableSuffix: `${record.id}-no-authority`,
        title: "Niciun responsabil cu autoritate de override (Art. 26(2))",
        detail: `Protocolul "${record.title}" nu desemnează nicio persoană cu autoritatea formală de a anula/inversa output-ul sistemului AI. Art. 26(2) cere ca deployer-ul să atribuie supravegherea unor persoane cu competență ȘI autoritate.`,
        severity: "critical",
        legalReference: "EU AI Act Art. 26(2) + Art. 14(3)(d)",
        remediationHint:
          "Desemnează minim o persoană cu rol formal + împuternicire scrisă să decidă override pe sistem. Marchează `hasAuthorityToOverride: true` doar după politica internă scrisă.",
        impactSummary:
          "Fără autoritate formală, supravegherea umană devine simbolică. Risc de non-conformitate Art. 26(2) + sancțiuni Art. 99.",
        evidenceRequired:
          "Politică internă semnată + atribuire scrisă rol + log override-uri exercitate.",
        sourceDoc: `Oversight Protocol — ${record.title}`,
        nowISO,
      }),
    )
  }

  // Regula C — buton stop indisponibil (severity high)
  if (!completenessReport.hasStopButton) {
    candidateFindings.push(
      buildFinding({
        stableSuffix: `${record.id}-no-stop`,
        title: "Lipsește buton stop / procedură fallback (Art. 14(3)(e))",
        detail: `Protocolul "${record.title}" nu confirmă disponibilitatea unui buton stop sau procedură de fallback. Art. 14(3)(e) cere intervenție / oprire imediată; Art. 14(4)(d) cere procedură de fallback documentată.`,
        severity: "high",
        legalReference: "EU AI Act Art. 14(3)(e) + Art. 14(4)(d)",
        remediationHint:
          "Implementați UI buton stop accesibil operatorului + documentați procedura de fallback + testați periodic (minim anual).",
        impactSummary:
          "Fără stop + fallback, sistemul AI nu poate fi oprit în caz de risc; deployer-ul rămâne expus la incidente.",
        evidenceRequired:
          "Screenshot UI buton stop + raport test fallback + log activări stop.",
        sourceDoc: `Oversight Protocol — ${record.title}`,
        nowISO,
      }),
    )
  }

  // Regula D — biometric ID fără two_person_rule (severity critical, Art. 14(4))
  if (
    linkedSystem?.purpose === "biometric-identification" &&
    record.oversightModel !== "two_person_rule"
  ) {
    candidateFindings.push(
      buildFinding({
        stableSuffix: `${record.id}-biometric-no-4eyes`,
        title: "Biometric ID fără two_person_rule (Art. 14(4))",
        detail: `Sistemul AI legat de protocolul "${record.title}" este identificare biometrică (Annex III pt. 1). Art. 14(4) impune confirmarea de către DOUĂ persoane înainte de orice acțiune; modelul curent este "${OVERSIGHT_MODEL_LABELS[record.oversightModel]}".`,
        severity: "critical",
        legalReference: "EU AI Act Art. 14(4)",
        remediationHint:
          "Schimbați oversightModel pe `two_person_rule` și implementați UI care impune confirmare independentă de 2 operatori înainte de orice acțiune declanșată de output-ul AI.",
        impactSummary:
          "Non-conformitate Art. 14(4) — sancționabilă Art. 99 până la 35M EUR sau 7% turnover.",
        evidenceRequired:
          "UI cu dual confirmation + log evenimente confirmare-2-persoane + politică internă four-eyes.",
        sourceDoc: `Oversight Protocol — ${record.title}`,
        nowISO,
      }),
    )
  }

  // Regula E — protocol vechi (nereview-uit >180 zile) (severity medium)
  if (record.nextReviewISO) {
    const nextReview = new Date(record.nextReviewISO).getTime()
    if (Number.isFinite(nextReview) && nextReview < Date.now()) {
      candidateFindings.push(
        buildFinding({
          stableSuffix: `${record.id}-overdue-review`,
          title: `Protocol oversight nereview-uit >${REVIEW_OVERDUE_DAYS} zile`,
          detail: `Protocolul "${record.title}" avea data de review setată la ${record.nextReviewISO}. Art. 14 + Art. 26 implică revizuire periodică pentru a menține supravegherea efectivă pe parcursul ciclului de viață al sistemului AI.`,
          severity: "medium",
          legalReference: "EU AI Act Art. 14 + Art. 26",
          remediationHint:
            "Recheck protocol: capacități, persoane responsabile, escaladare, testare fallback. Actualizați nextReviewISO la 6 luni distanță.",
          impactSummary:
            "Protocol învechit poate să nu reflecte schimbările sistemului AI / operatorilor / procedurilor.",
          evidenceRequired:
            "Notă review semnată + nextReviewISO actualizat + comparație cu versiunea anterioară.",
          sourceDoc: `Oversight Protocol — ${record.title}`,
          nowISO,
        }),
      )
    }
  }

  // 3) Markdown
  const generatedMarkdown = buildOversightMarkdown({
    record,
    orgName,
    systemName,
    completenessReport,
    candidateFindingsCount: candidateFindings.length,
    nowISO,
  })

  return {
    completeness,
    completenessReport,
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
    id: `oversight-finding-${args.stableSuffix}`,
    title: args.title,
    detail: args.detail,
    category: "EU_AI_ACT",
    severity: args.severity,
    risk: args.severity === "critical" || args.severity === "high" ? "high" : "low",
    principles: ["accountability", "oversight", "robustness"],
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
        "Responsabilul oversight verifică + decide acțiunea înainte de continuarea utilizării sistemului AI.",
      closureEvidence: args.evidenceRequired,
      revalidation:
        "Recheck la fiecare schimbare materială a sistemului AI sau periodic (≤6 luni).",
    },
  }
}

// ────────────────────────────────────────────────────────────────────────────
//   Markdown export
// ────────────────────────────────────────────────────────────────────────────

function buildOversightMarkdown(args: {
  record: HumanOversightProtocol
  orgName: string
  systemName?: string
  completenessReport: OversightCompletenessReport
  candidateFindingsCount: number
  nowISO: string
}): string {
  const r = args.record
  const c = args.completenessReport
  const lines: (string | null)[] = [
    `# Oversight Protocol — ${r.title}`,
    "",
    `**Organizație:** ${args.orgName || "—"}`,
    `**Sistem AI evaluat:** ${args.systemName ?? r.linkedAISystemId}`,
    `**Model oversight:** ${OVERSIGHT_MODEL_LABELS[r.oversightModel]}`,
    `**Status:** ${r.status}`,
    `**Completeness:** ${c.completeness}`,
    `**Generat la:** ${args.nowISO}`,
    r.approvedByEmail ? `**Aprobat de:** ${r.approvedByEmail} (${r.approvedAtISO ?? "—"})` : null,
    r.nextReviewISO ? `**Următoarea revizie:** ${r.nextReviewISO}` : null,
    r.rejectionReason ? `**Motiv respingere:** ${r.rejectionReason}` : null,
    "",
    "## A. Model oversight + sistem AI",
    `- Sistem AI: ${args.systemName ?? r.linkedAISystemId}`,
    `- Model: ${OVERSIGHT_MODEL_LABELS[r.oversightModel]}`,
    "",
    "## B. Capacități Art. 14(3) acoperite",
  ]

  for (const cap of OVERSIGHT_CAPABILITIES_ORDERED) {
    const covered = r.capabilitiesCovered.includes(cap)
    lines.push(`- [${covered ? "x" : " "}] ${OVERSIGHT_CAPABILITY_LABELS[cap]}`)
  }
  lines.push("")
  if (c.missingCapabilities.length > 0) {
    lines.push(
      `> **Lipsesc:** ${c.missingCapabilities.map((m) => OVERSIGHT_CAPABILITY_LABELS[m]).join("; ")}`,
    )
    lines.push("")
  }

  lines.push("## C. Persoane responsabile (Art. 26(2))")
  if (r.responsibleHumans.length === 0) {
    lines.push("_Nicio persoană desemnată._")
  } else {
    lines.push("| Email | Nume | Rol | Competență | Authority | Suport |")
    lines.push("|---|---|---|---|---|---|")
    for (const h of r.responsibleHumans) {
      lines.push(
        `| ${h.email} | ${h.name ?? "—"} | ${h.role} | ${COMPETENCE_LEVEL_LABELS[h.competenceLevel]} | ${h.hasAuthorityToOverride ? "DA" : "NU"} | ${h.hasSupportTeam ? "DA" : "NU"} |`,
      )
    }
  }
  lines.push("")

  lines.push("## D. Escaladare")
  if (r.escalationSteps.length === 0) {
    lines.push("_Niciun pas definit._")
  } else {
    for (const step of r.escalationSteps) {
      lines.push(`- **Condiție:** ${step.triggerCondition}`)
      lines.push(`  - Escaladează la: ${step.escalateToEmail} (${step.escalateToRole})`)
      lines.push(`  - SLA: ${step.slaHours}h · Notificare: ${NOTIFICATION_METHOD_LABELS[step.notificationMethod]}`)
    }
  }
  lines.push("")

  lines.push("## D2. Contestație decizie automată (Art. 86 + GDPR Art. 22)")
  const cp = r.contestationProcedure
  if (cp && cp.channelDescription) {
    lines.push(`- **Canal:** ${cp.channelDescription}`)
    lines.push(`- **SLA acknowledgement:** ${cp.acknowledgementSlaHours}h`)
    lines.push(`- **SLA rezoluție:** ${cp.resolutionSlaDays} zile`)
    lines.push(`- **Reviewer:** ${cp.reviewerRole}`)
    lines.push(`- **Păstrare dovezi:** ${cp.evidencePreservation}`)
  } else {
    lines.push("_Procedură nedocumentată._")
  }
  lines.push("")

  lines.push("## E. Stop + fallback (Art. 14(3)(e) + 14(4)(d))")
  const sp = r.stopProcedure
  if (sp) {
    lines.push(`- **Buton stop disponibil:** ${sp.stopButtonAvailable ? "DA" : "NU"}`)
    lines.push(`- **Locație buton:** ${sp.stopButtonLocation}`)
    lines.push(`- **Mod fallback:** ${FALLBACK_MODE_LABELS[sp.fallbackMode]}`)
    lines.push(`- **Descriere fallback:** ${sp.fallbackDescription}`)
    lines.push(`- **Ultima testare:** ${sp.testedAtISO ?? "_neefectuat_"}`)
    lines.push(`- **Frecvență testare:** ${TEST_FREQUENCY_LABELS[sp.testFrequency]}`)
  } else {
    lines.push("_Procedură nedocumentată._")
  }
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
    lines.push("| Tip | Descriere | Încărcat | De |")
    lines.push("|---|---|---|---|")
    for (const e of r.evidenceItems) {
      lines.push(
        `| ${e.type} | ${e.description}${e.url ? ` ([link](${e.url}))` : ""} | ${e.uploadedAtISO} | ${e.uploadedByEmail} |`,
      )
    }
  }
  lines.push("")

  lines.push("## Sumar evaluare")
  lines.push(`- Findings candidate emise: ${args.candidateFindingsCount}`)
  lines.push(`- Capacități Art. 14(3) acoperite: ${5 - c.missingCapabilities.length}/5`)
  lines.push(`- Persoană cu autoritate de override: ${c.hasResponsibleWithAuthority ? "DA" : "NU"}`)
  lines.push(`- Buton stop: ${c.hasStopButton ? "DA" : "NU"}`)
  lines.push(`- Escaladare definită: ${c.hasEscalation ? "DA" : "NU"}`)
  lines.push(`- Contestație documentată: ${c.hasContestation ? "DA" : "NU"}`)
  lines.push(`- Completeness: **${c.completeness}**`)
  lines.push("")

  lines.push("## Checklist final")
  lines.push(`- [${c.missingCapabilities.length === 0 ? "x" : " "}] Toate cele 5 capacități Art. 14(3) acoperite`)
  lines.push(`- [${c.hasResponsibleWithAuthority ? "x" : " "}] Persoană responsabilă cu autoritate de override`)
  lines.push(`- [${c.hasEscalation ? "x" : " "}] Pași escaladare definiți`)
  lines.push(`- [${c.hasContestation ? "x" : " "}] Procedură contestație documentată`)
  lines.push(`- [${c.hasStopButton ? "x" : " "}] Buton stop + fallback disponibile`)
  lines.push(`- [${r.status === "approved" || r.status === "active" ? "x" : " "}] Protocol aprobat`)
  lines.push("")
  lines.push(
    "> Protocol oversight pregătit conform Art. 14 Regulament (UE) 2024/1689. Reprezintă măsurile de bună-credință ale deployer-ului; nu înlocuiește opinia juridică finală.",
  )

  return lines.filter((line): line is string => typeof line === "string").join("\n")
}
