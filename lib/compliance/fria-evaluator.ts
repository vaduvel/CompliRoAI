// FRIA Evaluator — Sprint 016 (Art. 27 AI Act).
//
// Pure functions pentru:
//   1. Risk matrix per drept fundamental: likelihood × severity → FriaRiskLevel
//   2. Aggregate scoring 0-100 + overallRiskLevel
//   3. Emission de findings candidate (Art. 27(1)(d)(f) + Art. 27(3))
//   4. Markdown export pentru audit pack
//
// Apelat din:
//   - fria-store.ts pe createFria / updateFria pentru a recalcula overallRiskScore
//     și a emite findings prin createFinding()
//   - API route export pentru a regenera markdown la fiecare descărcare

import type { ComplianceSeverity } from "@/lib/compliance/constitution"
import {
  DEPLOYER_TYPE_LABELS,
  FREQUENCY_LABELS,
  FUNDAMENTAL_RIGHT_LABELS,
} from "@/lib/compliance/fria-schema"
import type {
  FriaLikelihood,
  FriaRecord,
  FriaRiskAssessment,
  FriaRiskLevel,
  FriaSeverity,
  ScanFinding,
} from "@/lib/compliance/types"

// ────────────────────────────────────────────────────────────────────────────
//   Risk matrix
// ────────────────────────────────────────────────────────────────────────────

const LIKELIHOOD_SCORE: Record<FriaLikelihood, number> = {
  rare: 1,
  unlikely: 2,
  possible: 3,
  likely: 4,
  almost_certain: 5,
}

const SEVERITY_SCORE: Record<FriaSeverity, number> = {
  negligible: 1,
  minor: 2,
  moderate: 3,
  major: 4,
  catastrophic: 5,
}

/**
 * Mapează (likelihood × severity) → FriaRiskLevel folosind matrice 5×5.
 *
 *   score = likelihood × severity (1..25)
 *
 *   1-4    → low
 *   5-9    → medium
 *   10-15  → high
 *   16-25  → critical
 *
 * Sursa: ENISA Risk Management framework + ISO 27005, adaptat pentru
 * Carta UE (impact catastrofic = vătămare gravă, ireversibilă a unui drept
 * fundamental).
 */
export function computeRightRiskLevel(
  likelihood: FriaLikelihood,
  severity: FriaSeverity,
): FriaRiskLevel {
  const score = LIKELIHOOD_SCORE[likelihood] * SEVERITY_SCORE[severity]
  if (score >= 16) return "critical"
  if (score >= 10) return "high"
  if (score >= 5) return "medium"
  return "low"
}

const RISK_LEVEL_NUMERIC: Record<FriaRiskLevel, number> = {
  low: 25,
  medium: 50,
  high: 75,
  critical: 100,
}

const RISK_LEVEL_FROM_SCORE = (score: number): FriaRiskLevel => {
  if (score >= 85) return "critical"
  if (score >= 60) return "high"
  if (score >= 30) return "medium"
  return "low"
}

// ────────────────────────────────────────────────────────────────────────────
//   Aggregate evaluation
// ────────────────────────────────────────────────────────────────────────────

export type FriaEvaluationResult = {
  overallRiskScore: number          // 0-100
  overallRiskLevel: FriaRiskLevel
  /** Numărul de riscuri „critical" identificate. */
  criticalCount: number
  /** Numărul de riscuri „high" identificate. */
  highCount: number
  /** Findings candidate emise (pre-persist). */
  candidateFindings: ScanFinding[]
  /** Markdown agregat al record-ului. */
  generatedMarkdown: string
}

export type EvaluateFriaInput = {
  record: FriaRecord
  orgName: string
  /** Numele sistemului AI evaluat (pentru context). */
  systemName?: string
  /** Folosit pentru stabile finding IDs și markdown timestamps. */
  nowISO?: string
}

/**
 * Funcția centrală: ia un FriaRecord (chiar incomplet) și returnează:
 *  - score agregat + risc agregat
 *  - findings candidate (pe care fria-store le va persista via createFinding)
 *  - markdown export complet
 */
export function evaluateFria(input: EvaluateFriaInput): FriaEvaluationResult {
  const { record, orgName, systemName } = input
  const nowISO = input.nowISO ?? new Date().toISOString()

  // 1) Calculează scor agregat: media ponderată a residualRisk per drept
  let totalWeighted = 0
  let count = 0
  let criticalCount = 0
  let highCount = 0
  for (const assessment of record.riskAssessments) {
    const numeric = RISK_LEVEL_NUMERIC[assessment.residualRisk]
    totalWeighted += numeric
    count += 1
    if (assessment.residualRisk === "critical") criticalCount++
    if (assessment.residualRisk === "high") highCount++
  }
  const overallRiskScore = count === 0 ? 0 : Math.round(totalWeighted / count)
  const overallRiskLevel: FriaRiskLevel =
    record.riskAssessments.length === 0 ? "low" : RISK_LEVEL_FROM_SCORE(overallRiskScore)

  // 2) Emite findings candidate per regulile Art. 27
  const candidateFindings: ScanFinding[] = []

  // Regula A: orice drept cu residualRisk = critical → finding critic
  for (const assessment of record.riskAssessments) {
    if (assessment.residualRisk === "critical") {
      candidateFindings.push(
        buildFinding({
          stableSuffix: `right-critical-${assessment.rightAffected}`,
          title: `Risc critic Art. 27(1)(d): ${FUNDAMENTAL_RIGHT_LABELS[assessment.rightAffected]} fără mitigare suficientă`,
          detail: `FRIA pentru "${record.title}" a identificat risc critic asupra dreptului ${FUNDAMENTAL_RIGHT_LABELS[assessment.rightAffected]} (likelihood ${assessment.likelihood} × severity ${assessment.severity}). Risc rezidual: critical. Descriere: ${assessment.description}`,
          severity: "critical",
          legalReference: "EU AI Act Art. 27(1)(d) + Carta UE",
          remediationHint:
            "Reduceți riscul rezidual prin măsuri suplimentare de mitigare sau suspendați utilizarea sistemului până la implementarea controalelor.",
          impactSummary: "Sistem AI cu risc critic asupra unui drept fundamental neacceptabil în actual format.",
          evidenceRequired: "Plan de mitigare aprobat + dovada implementării controalelor + revizie DPO/responsabil.",
          sourceDoc: `FRIA — ${record.title}`,
          nowISO,
        }),
      )
    }
  }

  // Regula B: lipsește mecanism de plângere
  if (!record.complaintMechanism || record.complaintMechanism.trim().length < 20) {
    candidateFindings.push(
      buildFinding({
        stableSuffix: "complaint-missing",
        title: "Lipsește mecanism de plângere conform Art. 27(1)(f)",
        detail: `FRIA pentru "${record.title}" nu documentează un mecanism accesibil de plângere pentru persoanele afectate. Art. 27(1)(f) impune ca mecanismul să fie public + canal clar + autoritate competentă.`,
        severity: "high",
        legalReference: "EU AI Act Art. 27(1)(f)",
        remediationHint:
          "Documentați canalul de plângere (email/portal/telefon), termenul de răspuns, autoritatea competentă (ADR/ANSPDCP/ASF) + publicați mecanismul.",
        impactSummary: "Fără mecanism de plângere, persoanele afectate nu pot exercita dreptul la cale de atac (Cartă Art. 47).",
        evidenceRequired: "Procedură scrisă de tratare plângere + link public + log primire/răspuns plângeri.",
        sourceDoc: `FRIA — ${record.title}`,
        nowISO,
      }),
    )
  }

  // Regula C: notificare autoritate obligatorie + nesetată
  if (record.notifyAuthorityRequired && !record.notifiedAtISO) {
    candidateFindings.push(
      buildFinding({
        stableSuffix: "authority-not-notified",
        title: "Notificare autoritate de supraveghere obligatorie (Art. 27(3))",
        detail: `FRIA pentru "${record.title}" marchează notifyAuthorityRequired=true, dar nu există dovada că autoritatea a fost notificată. Art. 27(3) impune comunicarea rezultatului FRIA către autoritatea națională competentă (ADR pentru AI Act, ANSPDCP pentru date personale, ASF pentru asigurări).`,
        severity: "high",
        legalReference: "EU AI Act Art. 27(3)",
        remediationHint:
          "Notificați autoritatea competentă conform procedurii oficiale + atașați referința/numărul de înregistrare în FRIA.",
        impactSummary: "Lipsa notificării este o neconformitate procedurală sancționabilă conform Art. 99 AI Act.",
        evidenceRequired: "Număr înregistrare + dată notificare + corespondență cu autoritatea.",
        sourceDoc: `FRIA — ${record.title}`,
        nowISO,
      }),
    )
  }

  // Regula D: oversight insuficient pentru risc înalt
  if (
    (overallRiskLevel === "high" || overallRiskLevel === "critical") &&
    record.humanOversightMeasures.length === 0
  ) {
    candidateFindings.push(
      buildFinding({
        stableSuffix: "oversight-missing",
        title: "Supraveghere umană insuficientă pentru sistem cu risc înalt (Art. 27(1)(e) + Art. 14)",
        detail: `FRIA pentru "${record.title}" indică risc agregat ${overallRiskLevel} (${overallRiskScore}/100), dar nu documentează măsuri de supraveghere umană conform Art. 14.`,
        severity: overallRiskLevel === "critical" ? "critical" : "high",
        legalReference: "EU AI Act Art. 27(1)(e) + Art. 14",
        remediationHint:
          "Implementați + documentați măsurile Art. 14: human-in-loop, override, audit log, explainability, fallback. Definiți rolurile responsabile.",
        impactSummary: "Fără supraveghere umană, riscul rezidual nu poate fi gestionat. Sistemul nu îndeplinește Art. 14.",
        evidenceRequired: "Procedură supraveghere + log decizii umane + training operatori + test fallback.",
        sourceDoc: `FRIA — ${record.title}`,
        nowISO,
      }),
    )
  }

  // Regula E: lipsă DPIA când prelucrarea include date personale + decizii automate
  // (heurestic — verificată prin lipsa linkedDpiaRecordId când are sens reuse Art. 27(4))
  // Skipped pentru moment — DPIA reuse este opțional, nu obligație separată.

  // 3) Generate markdown
  const generatedMarkdown = buildFriaMarkdown({
    record,
    orgName,
    systemName,
    overallRiskScore,
    overallRiskLevel,
    criticalCount,
    highCount,
    candidateFindingsCount: candidateFindings.length,
    nowISO,
  })

  return {
    overallRiskScore,
    overallRiskLevel,
    criticalCount,
    highCount,
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
    id: `fria-finding-${args.stableSuffix}`,
    title: args.title,
    detail: args.detail,
    category: "EU_AI_ACT",
    severity: args.severity,
    risk: args.severity === "critical" || args.severity === "high" ? "high" : "low",
    principles: ["accountability", "transparency", "oversight"],
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
      humanStep: "Responsabilul deployer-ului revizuiește + decide acțiune înainte de continuarea utilizării.",
      closureEvidence: args.evidenceRequired,
      revalidation: "Recheck la fiecare schimbare materială a sistemului AI sau anual.",
    },
  }
}

// ────────────────────────────────────────────────────────────────────────────
//   Markdown export
// ────────────────────────────────────────────────────────────────────────────

function buildFriaMarkdown(args: {
  record: FriaRecord
  orgName: string
  systemName?: string
  overallRiskScore: number
  overallRiskLevel: FriaRiskLevel
  criticalCount: number
  highCount: number
  candidateFindingsCount: number
  nowISO: string
}): string {
  const r = args.record
  const lines: (string | null)[] = [
    `# FRIA — ${r.title}`,
    "",
    `**Organizație:** ${args.orgName || "—"}`,
    `**Sistem AI evaluat:** ${args.systemName ?? r.linkedAISystemId}`,
    `**Tip deployer:** ${DEPLOYER_TYPE_LABELS[r.deployerType]}`,
    `**Status:** ${r.status}`,
    `**Risc agregat:** ${args.overallRiskScore}/100 (${args.overallRiskLevel})`,
    `**Generat la:** ${args.nowISO}`,
    r.linkedDpiaRecordId ? `**DPIA legat (Art. 27(4)):** ${r.linkedDpiaRecordId}` : null,
    r.approvedByEmail ? `**Aprobat de:** ${r.approvedByEmail} (${r.approvedAtISO ?? "—"})` : null,
    r.rejectionReason ? `**Motiv respingere:** ${r.rejectionReason}` : null,
    "",
    "## A. Profilul deployer-ului",
    `Tip: ${DEPLOYER_TYPE_LABELS[r.deployerType]}`,
    r.linkedDpiaRecordId
      ? `DPIA reused (Art. 27(4)): ${r.linkedDpiaRecordId}`
      : "Fără DPIA reused.",
    "",
    "## B. Procesul și utilizarea sistemului AI",
    r.processDescription || "_De completat._",
    "",
    `**Perioadă utilizare:** ${r.periodOfUseStartISO ?? "—"}${r.periodOfUseEndISO ? ` → ${r.periodOfUseEndISO}` : ""}`,
    `**Frecvență:** ${FREQUENCY_LABELS[r.frequencyOfUse]}`,
    r.expectedVolume ? `**Volum estimat:** ${r.expectedVolume}` : null,
    "",
    "## C. Categoriile de persoane afectate",
  ]

  if (r.affectedGroups.length === 0) {
    lines.push("_Nu sunt declarate grupuri afectate._")
  } else {
    for (const g of r.affectedGroups) {
      lines.push(
        `- **${g.category}**${g.estimatedCount ? ` (~${g.estimatedCount})` : ""}${g.vulnerabilities.length > 0 ? ` · vulnerabilități: ${g.vulnerabilities.join(", ")}` : ""}`,
      )
    }
  }
  lines.push("")

  lines.push("## D. Drepturile fundamentale la risc")
  if (r.rightsAtRisk.length === 0) {
    lines.push("_Nu sunt selectate drepturi la risc._")
  } else {
    lines.push("**Selectate:**")
    for (const right of r.rightsAtRisk) {
      lines.push(`- ${FUNDAMENTAL_RIGHT_LABELS[right]}`)
    }
    lines.push("")
    lines.push("### Matrice risc")
    lines.push("| Drept | Likelihood | Severity | Risk level | Risc rezidual |")
    lines.push("|---|---|---|---|---|")
    for (const assessment of r.riskAssessments) {
      lines.push(
        `| ${FUNDAMENTAL_RIGHT_LABELS[assessment.rightAffected]} | ${assessment.likelihood} | ${assessment.severity} | ${assessment.riskLevel} | ${assessment.residualRisk} |`,
      )
    }
    lines.push("")
    for (const a of r.riskAssessments) {
      lines.push(`#### ${FUNDAMENTAL_RIGHT_LABELS[a.rightAffected]}`)
      lines.push(`- Descriere risc: ${a.description}`)
      lines.push(`- Likelihood: ${a.likelihood} · Severity: ${a.severity}`)
      lines.push(`- Risc inițial: ${a.riskLevel}`)
      if (a.mitigationMeasures.length > 0) {
        lines.push("- Măsuri mitigare:")
        for (const m of a.mitigationMeasures) lines.push(`  - ${m}`)
      } else {
        lines.push("- Măsuri mitigare: _de completat_")
      }
      lines.push(`- Risc rezidual: ${a.residualRisk}`)
      lines.push("")
    }
  }

  lines.push("## E. Supraveghere umană (Art. 14)")
  if (r.humanOversightMeasures.length === 0) {
    lines.push("_Nu sunt documentate măsuri de supraveghere umană._")
  } else {
    for (const m of r.humanOversightMeasures) {
      lines.push(`### ${m.measureType}`)
      lines.push(`- Descriere: ${m.description}`)
      lines.push(`- Rol responsabil: ${m.responsibleRole}`)
      lines.push(`- Condiții declanșare: ${m.triggerConditions}`)
      lines.push(`- Documentat la: ${m.documentedAtISO}`)
      lines.push("")
    }
  }

  lines.push("## F. Plângere și guvernanță")
  lines.push(`**Mecanism plângere:** ${r.complaintMechanism || "_de completat_"}`)
  lines.push("")
  if (r.governanceMeasures.length > 0) {
    lines.push("**Măsuri organizatorice:**")
    for (const g of r.governanceMeasures) lines.push(`- ${g}`)
    lines.push("")
  }
  lines.push(`**Notificare autoritate (Art. 27(3)):** ${r.notifyAuthorityRequired ? "DA" : "NU"}`)
  if (r.notifyAuthorityRequired) {
    lines.push(`- Autoritate: ${r.notifyAuthorityName ?? "_neprecizată_"}`)
    lines.push(`- Notificat la: ${r.notifiedAtISO ?? "_neefectuat_"}`)
    if (r.authorityReference) lines.push(`- Referință: ${r.authorityReference}`)
  }
  lines.push("")

  lines.push("## Sumar evaluare")
  lines.push(`- Findings candidate emise: ${args.candidateFindingsCount}`)
  lines.push(`- Drepturi cu risc critical: ${args.criticalCount}`)
  lines.push(`- Drepturi cu risc high: ${args.highCount}`)
  lines.push(`- Score agregat: ${args.overallRiskScore}/100`)
  lines.push(`- Nivel risc: ${args.overallRiskLevel}`)
  lines.push("")

  lines.push("## Checklist final")
  lines.push(`- [${r.processDescription.length > 0 ? "x" : " "}] Procesul este documentat`)
  lines.push(`- [${r.affectedGroups.length > 0 ? "x" : " "}] Persoanele afectate identificate`)
  lines.push(`- [${r.rightsAtRisk.length > 0 ? "x" : " "}] Drepturile la risc identificate`)
  lines.push(`- [${r.riskAssessments.length > 0 ? "x" : " "}] Matricea de risc completă`)
  lines.push(`- [${r.humanOversightMeasures.length > 0 ? "x" : " "}] Măsuri Art. 14 documentate`)
  lines.push(`- [${r.complaintMechanism.length >= 20 ? "x" : " "}] Mecanism plângere documentat`)
  lines.push(`- [${!r.notifyAuthorityRequired || r.notifiedAtISO ? "x" : " "}] Notificare autoritate Art. 27(3)`)
  lines.push(`- [${r.status === "approved" ? "x" : " "}] FRIA aprobată`)
  lines.push("")
  lines.push(
    "> Document FRIA pregătit conform Art. 27 Regulament (UE) 2024/1689. Reprezintă evaluare de bună-credință a deployer-ului; nu înlocuiește opinia juridică finală.",
  )

  return lines.filter((line): line is string => typeof line === "string").join("\n")
}

// Re-export pentru consumatori extern (store + UI)
export type { FriaRiskAssessment }
