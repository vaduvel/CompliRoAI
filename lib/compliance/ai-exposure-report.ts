/**
 * Sprint 009 — AI Exposure Report aggregator.
 *
 * Pure function: state.aiDataMapRecords[] + state.findings[] -> AIExposureReport
 * (shape mandat § 19). Output: scope counts + topRisks + recommendedActions +
 * markdown full report (client-facing).
 *
 * Sprint 014 va aduga PDF export pe aceeasi structura markdown.
 *
 * Donor inspectat: v3-unified/lib/compliance/ai-exposure-report.ts (392 LOC).
 * Portat conceptul agregator + sectiuni report. Adaptat la mandate § 19 shape
 * (markdown in loc de HTML — PDF vine Sprint 014).
 */

import type {
  AIDataMapRecord,
  AIExposureReport,
  AIExposureReportScope,
  ScanFinding,
} from "@/lib/compliance/types"
import {
  USE_CASE_LABELS,
  RISK_CANDIDATE_LABELS,
  VENDOR_REGION_LABELS,
  TRAINING_USAGE_LABELS,
} from "@/lib/compliance/ai-data-discovery"

export type AIExposureReportInput = {
  orgId: string
  orgName: string
  records: AIDataMapRecord[]
  findings: ScanFinding[]                // toate findings (engine filtreaza relevante)
  generatedAtISO: string
  reportId: string
}

// ────────────────────────────────────────────────────────────────────────────
//   Main: buildAIExposureReport
// ────────────────────────────────────────────────────────────────────────────

export function buildAIExposureReport(input: AIExposureReportInput): AIExposureReport {
  const activeRecords = input.records.filter((r) => r.status === "active")
  const scope = computeScope(activeRecords)
  const topRisks = buildTopRisks(activeRecords)
  const recommendedActions = buildRecommendedActions(activeRecords, scope)
  const markdown = buildMarkdown({
    orgName: input.orgName,
    records: activeRecords,
    scope,
    topRisks,
    recommendedActions,
    findings: input.findings,
    generatedAtISO: input.generatedAtISO,
  })

  return {
    id: input.reportId,
    orgId: input.orgId,
    generatedAtISO: input.generatedAtISO,
    scope,
    topRisks,
    recommendedActions,
    markdown,
  }
}

// ────────────────────────────────────────────────────────────────────────────
//   Scope counts
// ────────────────────────────────────────────────────────────────────────────

export function computeScope(records: AIDataMapRecord[]): AIExposureReportScope {
  return {
    aiToolCount: records.length,
    personalDataToolCount: records.filter((r) => r.processesPersonalData).length,
    specialCategoryToolCount: records.filter((r) => r.processesSpecialCategories).length,
    noDpaCount: records.filter((r) => r.processesPersonalData && !r.dpaSigned).length,
    nonEuVendorCount: records.filter(
      (r) =>
        r.processesPersonalData &&
        r.vendorRegion !== "EU" &&
        r.vendorRegion !== "UK",
    ).length,
    highRiskCandidateCount: records.filter((r) => r.riskCandidate === "high_risk_candidate").length,
    prohibitedCandidateCount: records.filter((r) => r.riskCandidate === "prohibited_candidate").length,
  }
}

// ────────────────────────────────────────────────────────────────────────────
//   Top risks (sorted summary strings) — max 10
// ────────────────────────────────────────────────────────────────────────────

function buildTopRisks(records: AIDataMapRecord[]): string[] {
  const risks: { weight: number; text: string }[] = []
  for (const record of records) {
    const tool = `${record.toolName} (${record.vendor || "vendor neconfirmat"})`
    if (record.riskCandidate === "prohibited_candidate") {
      risks.push({
        weight: 100,
        text: `INTERZIS posibil: ${tool} — ${record.reasons[0] ?? "review urgent Art. 5"}`,
      })
    }
    if (record.riskCandidate === "high_risk_candidate") {
      risks.push({
        weight: 80,
        text: `High-risk: ${tool} — ${USE_CASE_LABELS[record.useCaseCategory]}`,
      })
    }
    if (record.processesPersonalData && !record.dpaSigned) {
      risks.push({ weight: 60, text: `Lipsă DPA: ${tool}` })
    }
    if (
      record.processesPersonalData &&
      record.vendorRegion !== "EU" &&
      record.vendorRegion !== "UK" &&
      record.vendorRegion !== "unknown"
    ) {
      risks.push({
        weight: 50,
        text: `Transfer ${VENDOR_REGION_LABELS[record.vendorRegion]}: ${tool}`,
      })
    }
    if (record.processesPersonalData && record.trainingDataUsage === "trains_on_data") {
      risks.push({ weight: 55, text: `${tool} antrenează pe date client` })
    }
    if (record.processesSpecialCategories) {
      risks.push({ weight: 70, text: `Categorii speciale GDPR Art. 9: ${tool}` })
    }
    if (record.childrenData) {
      risks.push({ weight: 65, text: `Date copii: ${tool}` })
    }
  }
  return risks
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 10)
    .map((r) => r.text)
}

// ────────────────────────────────────────────────────────────────────────────
//   Recommended actions — ordonate dupa prioritate
// ────────────────────────────────────────────────────────────────────────────

function buildRecommendedActions(
  records: AIDataMapRecord[],
  scope: AIExposureReportScope,
): string[] {
  const actions: string[] = []
  if (scope.prohibitedCandidateCount > 0) {
    actions.push(
      `URGENT: opinie legală pe ${scope.prohibitedCandidateCount} tool(uri) candidate „interzis" (Art. 5). Oprește utilizarea până la clarificare.`,
    )
  }
  if (scope.highRiskCandidateCount > 0) {
    actions.push(
      `Rulează Role Assessment + FRIA + Human Oversight pentru ${scope.highRiskCandidateCount} tool(uri) high-risk candidate.`,
    )
  }
  if (scope.noDpaCount > 0) {
    actions.push(`Solicită DPA semnat pentru ${scope.noDpaCount} tool(uri) care procesează date personale fără contract.`)
  }
  if (scope.nonEuVendorCount > 0) {
    actions.push(
      `Verifică mecanism transfer (SCC + TIA) pentru ${scope.nonEuVendorCount} tool(uri) în țări terțe.`,
    )
  }
  if (scope.specialCategoryToolCount > 0) {
    actions.push(`DPIA obligatoriu pentru ${scope.specialCategoryToolCount} tool(uri) care procesează categorii speciale Art. 9.`)
  }
  const transparencyTools = records.filter((r) => r.riskCandidate === "transparency_limited")
  if (transparencyTools.length > 0) {
    actions.push(
      `Implementează disclosure Art. 50 (chatbot / AI content) pentru ${transparencyTools.length} tool(uri).`,
    )
  }
  if (records.length > 0) {
    actions.push("Generează AI Policy Pack (acceptable use + logging + oversight) și colectează semnături angajați.")
  }
  return actions
}

// ────────────────────────────────────────────────────────────────────────────
//   Markdown builder
// ────────────────────────────────────────────────────────────────────────────

function buildMarkdown(input: {
  orgName: string
  records: AIDataMapRecord[]
  scope: AIExposureReportScope
  topRisks: string[]
  recommendedActions: string[]
  findings: ScanFinding[]
  generatedAtISO: string
}): string {
  const formattedDate = formatDate(input.generatedAtISO)
  const aiFindings = input.findings.filter(
    (f) =>
      f.findingStatus !== "resolved" &&
      f.findingStatus !== "dismissed" &&
      (f.category === "EU_AI_ACT" ||
        (f.category === "GDPR" && f.sourceDocument === "manual" === false)),
  )

  const lines: string[] = []
  lines.push(`# AI Exposure Report — ${input.orgName}`)
  lines.push("")
  lines.push(`Generat: ${formattedDate}`)
  lines.push("")
  lines.push("---")
  lines.push("")
  lines.push("## Rezumat executiv")
  lines.push("")
  lines.push(`- **${input.scope.aiToolCount}** tool-uri AI urmărite în registru`)
  lines.push(`- **${input.scope.personalDataToolCount}** procesează date personale`)
  lines.push(`- **${input.scope.specialCategoryToolCount}** procesează categorii speciale GDPR Art. 9`)
  lines.push(`- **${input.scope.noDpaCount}** fără DPA semnat`)
  lines.push(`- **${input.scope.nonEuVendorCount}** cu vendor în țări terțe`)
  lines.push(`- **${input.scope.highRiskCandidateCount}** high-risk candidate (Annex III)`)
  if (input.scope.prohibitedCandidateCount > 0) {
    lines.push(`- ⚠ **${input.scope.prohibitedCandidateCount} candidate „interzis" (Art. 5)** — necesită opinie legală`)
  }
  lines.push("")
  lines.push("---")
  lines.push("")
  lines.push("## Top riscuri detectate")
  lines.push("")
  if (input.topRisks.length === 0) {
    lines.push("_Nu sunt riscuri AI prioritare în acest moment._")
  } else {
    for (const risk of input.topRisks) {
      lines.push(`- ${risk}`)
    }
  }
  lines.push("")
  lines.push("---")
  lines.push("")
  lines.push("## AI Data Map")
  lines.push("")
  if (input.records.length === 0) {
    lines.push("_Nu există încă tool-uri AI în registru. Completează intake-ul în /dashboard/ai-discovery._")
  } else {
    lines.push("| Tool | Vendor | Categorie | Risc candidate | Date personale | DPA | Vendor region | Training |")
    lines.push("|---|---|---|---|---|---|---|---|")
    for (const record of input.records) {
      lines.push(
        "| " +
          [
            escapeMd(record.toolName),
            escapeMd(record.vendor || "—"),
            USE_CASE_LABELS[record.useCaseCategory],
            RISK_CANDIDATE_LABELS[record.riskCandidate],
            record.processesPersonalData ? "Da" : "Nu",
            record.dpaSigned ? "Semnat" : "Lipsă",
            VENDOR_REGION_LABELS[record.vendorRegion],
            TRAINING_USAGE_LABELS[record.trainingDataUsage],
          ].join(" | ") +
          " |",
      )
    }
  }
  lines.push("")
  lines.push("---")
  lines.push("")
  lines.push("## Acțiuni recomandate")
  lines.push("")
  if (input.recommendedActions.length === 0) {
    lines.push("_Nu sunt acțiuni AI prioritare în acest moment._")
  } else {
    for (let i = 0; i < input.recommendedActions.length; i++) {
      lines.push(`${i + 1}. ${input.recommendedActions[i]}`)
    }
  }
  lines.push("")
  lines.push("---")
  lines.push("")
  lines.push("## Findings AI active")
  lines.push("")
  if (aiFindings.length === 0) {
    lines.push("_Nu există findings AI active._")
  } else {
    lines.push("| Finding | Severitate | Categorie | Status |")
    lines.push("|---|---|---|---|")
    for (const finding of aiFindings.slice(0, 20)) {
      lines.push(
        "| " +
          [
            escapeMd(finding.title),
            finding.severity,
            finding.category,
            finding.findingStatus ?? "open",
          ].join(" | ") +
          " |",
      )
    }
  }
  lines.push("")
  lines.push("---")
  lines.push("")
  lines.push("## Detalii per tool AI")
  lines.push("")
  if (input.records.length === 0) {
    lines.push("_Niciun tool detaliat încă._")
  } else {
    for (const record of input.records) {
      lines.push(`### ${record.toolName} (${record.vendor || "vendor neconfirmat"})`)
      lines.push("")
      lines.push(`- **Categorie:** ${USE_CASE_LABELS[record.useCaseCategory]}`)
      lines.push(`- **Descriere:** ${record.useCaseDescription || "—"}`)
      lines.push(`- **Risc candidate:** ${RISK_CANDIDATE_LABELS[record.riskCandidate]}`)
      if (record.reasons.length > 0) {
        lines.push(`- **Motive:**`)
        for (const reason of record.reasons) {
          lines.push(`  - ${reason}`)
        }
      }
      lines.push(`- **Input data:** ${record.inputDataCategories.join(", ") || "—"}`)
      lines.push(`- **Output data:** ${record.outputDataCategories.join(", ") || "—"}`)
      lines.push(`- **Date personale:** ${record.processesPersonalData ? "Da" : "Nu"}`)
      if (record.processesSpecialCategories) {
        lines.push(`- **Categorii speciale Art. 9:** Da`)
      }
      if (record.childrenData) {
        lines.push(`- **Date copii:** Da`)
      }
      lines.push(`- **Vendor region:** ${VENDOR_REGION_LABELS[record.vendorRegion]}`)
      lines.push(`- **Training pe date:** ${TRAINING_USAGE_LABELS[record.trainingDataUsage]}`)
      lines.push(`- **DPA:** ${record.dpaSigned ? "Semnat" : "Lipsă"}${record.dpaUrl ? ` ([link](${record.dpaUrl}))` : ""}`)
      lines.push(`- **Subprocesori documentați:** ${record.subprocessorsDocumented ? "Da" : "Nu"}`)
      if (record.linkedFindingIds.length > 0) {
        lines.push(`- **Findings emise:** ${record.linkedFindingIds.length}`)
      }
      if (record.notes) {
        lines.push(`- **Note:** ${record.notes}`)
      }
      lines.push("")
    }
  }
  lines.push("---")
  lines.push("")
  lines.push("_Raport generat automat de CompliRoAI. Nu reprezintă opinie juridică finală. Validează cu DPO/consilier juridic înainte de transmitere către autorități sau parteneri._")

  return lines.join("\n")
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso
    return new Intl.DateTimeFormat("ro-RO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d)
  } catch {
    return iso
  }
}

function escapeMd(value: string): string {
  return String(value ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ")
}
