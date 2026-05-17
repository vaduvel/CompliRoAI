// DPIA Schema V1 (port Sprint 008C din DPO-OS v3-unified).
//
// 11 intrebari de screening pentru DPIA conform GDPR Art. 35-36 + ANSPDCP
// Decizia 174/2018 + EDPB Guidelines on DPIA. Outputul: risk score 0-100,
// risk level (low/medium/high/critical), requiresFullDpia flag, recomandari,
// markdown export + candidateFinding pentru cockpit-ul de findings.
//
// Sprint 008C: schema id rebranded `compliroai-dpia-screening`. Cand
// `requiresFullDpia=true` se construieste un `ScanFinding` cu category=GDPR
// si severity inferata din riskLevel — store-ul DPIA (`dpia-store.ts`) il
// foloseste pentru a apela `createFinding()` din findings-store cand
// utilizatorul accepta finding-ul.

import type { ComplianceSeverity } from "@/lib/compliance/constitution"
import type { ScanFinding } from "@/lib/compliance/types"

export type DpiaAnswerValue = boolean | string | string[]

export type DpiaQuestionType = "boolean" | "select" | "textarea"

export type DpiaQuestion = {
  id: string
  label: string
  helpText: string
  type: DpiaQuestionType
  options?: string[]
  riskWeight: number
  positiveRiskValue?: DpiaAnswerValue
  missingEvidence?: string
}

export type DpiaSchema = {
  id: string
  version: "2026.05.ro.v1"
  jurisdiction: "RO/EU"
  legalBasis: string[]
  questions: DpiaQuestion[]
}

export type DpiaScreeningInput = {
  orgId?: string
  orgName?: string
  processName: string
  department?: string
  ownerName?: string
  description?: string
  answers: Record<string, DpiaAnswerValue | undefined>
}

export type DpiaScreeningEvaluation = {
  schemaVersion: DpiaSchema["version"]
  processName: string
  riskScore: number
  riskLevel: "low" | "medium" | "high" | "critical"
  requiresFullDpia: boolean
  reasons: string[]
  missingEvidence: string[]
  recommendedMeasures: string[]
  generatedMarkdown: string
  candidateFinding?: ScanFinding
}

export const DPIA_SCHEMA_V1: DpiaSchema = {
  id: "compliroai-dpia-screening",
  version: "2026.05.ro.v1",
  jurisdiction: "RO/EU",
  legalBasis: [
    "GDPR Art. 35",
    "GDPR Art. 36",
    "ANSPDCP Decizia nr. 174/2018",
    "EDPB Guidelines on DPIA",
  ],
  questions: [
    {
      id: "specialCategories",
      label: "Prelucrați date speciale?",
      helpText: "Ex: sănătate, biometric, genetic, religie, sindicat, date privind condamnări.",
      type: "boolean",
      riskWeight: 28,
      positiveRiskValue: true,
      missingEvidence: "Condiție Art. 9 + măsuri suplimentare pentru date speciale.",
    },
    {
      id: "largeScale",
      label: "Prelucrarea este pe scară largă?",
      helpText: "Număr mare de persoane, volum mare de date sau monitorizare continuă.",
      type: "boolean",
      riskWeight: 18,
      positiveRiskValue: true,
      missingEvidence: "Estimare volum persoane/date + justificarea proporționalității.",
    },
    {
      id: "vulnerableDataSubjects",
      label: "Sunt vizate persoane vulnerabile?",
      helpText: "Copii, pacienți, angajați în raport de subordonare, persoane dependente de servicii.",
      type: "boolean",
      riskWeight: 20,
      positiveRiskValue: true,
      missingEvidence: "Măsuri specifice pentru persoane vulnerabile.",
    },
    {
      id: "systematicMonitoring",
      label: "Există monitorizare sistematică?",
      helpText: "CCTV, GPS, device monitoring, tracking online sau monitorizare comportamentală.",
      type: "boolean",
      riskWeight: 22,
      positiveRiskValue: true,
      missingEvidence: "Evaluare necesitate/proporționalitate + informare persoane vizate.",
    },
    {
      id: "profilingOrScoring",
      label: "Folosiți profilare/scoring?",
      helpText: "Scoring clienți, segmentare comportamentală, lead scoring, fraud scoring.",
      type: "boolean",
      riskWeight: 22,
      positiveRiskValue: true,
      missingEvidence: "Documentare logică scoring + Art. 22/profiling check.",
    },
    {
      id: "automatedDecision",
      label: "Există decizie automată cu efect juridic sau similar semnificativ?",
      helpText: "Ex: respingere credit, triere CV, acces servicii, preț dinamic cu impact major.",
      type: "boolean",
      riskWeight: 30,
      positiveRiskValue: true,
      missingEvidence: "Art. 22 assessment + human review + drept de contestare.",
    },
    {
      id: "newTechnologyOrAI",
      label: "Procesul folosește tehnologie nouă sau AI?",
      helpText: "ChatGPT/Gemini/Copilot, HR screening, chatbot, scoring, recomandări personalizate.",
      type: "boolean",
      riskWeight: 18,
      positiveRiskValue: true,
      missingEvidence: "AI Data Map + vendor DPA + transparență pentru persoanele vizate.",
    },
    {
      id: "thirdCountryTransfer",
      label: "Datele ajung în afara UE/SEE?",
      helpText: "Vendor US/UK/India, suport global, subprocesatori externi sau model AI non-UE.",
      type: "boolean",
      riskWeight: 18,
      positiveRiskValue: true,
      missingEvidence: "Mecanism transfer: SCC/TIA/adequacy/DPF + măsuri suplimentare.",
    },
    {
      id: "securityMeasures",
      label: "Măsurile de securitate sunt documentate?",
      helpText: "MFA, RBAC, logging, criptare, backup, retenție, procedură incident.",
      type: "select",
      options: ["complete", "partial", "missing"],
      riskWeight: 16,
      positiveRiskValue: "missing",
      missingEvidence: "TOMs documentate și dovezi de implementare.",
    },
    {
      id: "retentionKnown",
      label: "Retenția este definită și aprobată?",
      helpText: "Există termen de păstrare, trigger de ștergere și responsabil.",
      type: "select",
      options: ["defined", "unclear", "missing"],
      riskWeight: 12,
      positiveRiskValue: "missing",
      missingEvidence: "Regulă de retenție + dovadă aprobare.",
    },
  ],
}

export function evaluateDpiaScreening(
  input: DpiaScreeningInput,
  nowISO = new Date().toISOString(),
): DpiaScreeningEvaluation {
  const answers = input.answers ?? {}
  const reasons: string[] = []
  const missingEvidence: string[] = []
  let score = 0

  for (const question of DPIA_SCHEMA_V1.questions) {
    const answer = answers[question.id]
    const matchesRisk = answerMatchesRisk(answer, question.positiveRiskValue)
    if (!matchesRisk) continue

    score += question.riskWeight
    reasons.push(question.label)
    if (question.missingEvidence) missingEvidence.push(question.missingEvidence)
  }

  if (answers.securityMeasures === "partial") {
    score += 8
    reasons.push("Măsurile de securitate sunt doar parțial documentate")
    missingEvidence.push("Plan de completare TOMs + owner + termen.")
  }
  if (answers.retentionKnown === "unclear") {
    score += 6
    reasons.push("Retenția este neclară")
    missingEvidence.push("Clarificare termen păstrare și trigger de ștergere.")
  }

  const riskScore = Math.min(score, 100)
  const riskLevel = riskScore >= 85 ? "critical" : riskScore >= 55 ? "high" : riskScore >= 25 ? "medium" : "low"
  const requiresFullDpia =
    riskLevel === "critical" ||
    riskLevel === "high" ||
    Boolean(answers.automatedDecision) ||
    (Boolean(answers.specialCategories) && Boolean(answers.largeScale))
  const recommendedMeasures = buildRecommendedMeasures(input, requiresFullDpia)
  const generatedMarkdown = buildDpiaMarkdown(input, {
    schemaVersion: DPIA_SCHEMA_V1.version,
    processName: clean(input.processName) || "Proces fără nume",
    riskScore,
    riskLevel,
    requiresFullDpia,
    reasons,
    missingEvidence,
    recommendedMeasures,
  })
  const candidateFinding = requiresFullDpia
    ? buildDpiaFinding(input, riskLevel === "critical" ? "critical" : "high", riskScore, reasons, missingEvidence, nowISO)
    : undefined

  return {
    schemaVersion: DPIA_SCHEMA_V1.version,
    processName: clean(input.processName) || "Proces fără nume",
    riskScore,
    riskLevel,
    requiresFullDpia,
    reasons,
    missingEvidence: Array.from(new Set(missingEvidence)),
    recommendedMeasures,
    generatedMarkdown,
    candidateFinding,
  }
}

function buildRecommendedMeasures(input: DpiaScreeningInput, requiresFullDpia: boolean): string[] {
  const measures = [
    "Leagă screening-ul de activitatea RoPA și păstrează decizia DPO în Audit Pack.",
    "Confirmă ownerul procesului și persoanele care pot valida informațiile.",
  ]
  if (requiresFullDpia) {
    measures.push("Rulează DPIA completă Art. 35 înainte de producție sau la următoarea schimbare materială.")
  }
  if (input.answers.newTechnologyOrAI) {
    measures.push("Adaugă procesul în AI Data Map și verifică vendor DPA, training on/off și transparența.")
  }
  if (input.answers.thirdCountryTransfer) {
    measures.push("Documentează mecanismul de transfer și atașează SCC/TIA/adequacy evidence.")
  }
  if (input.answers.automatedDecision || input.answers.profilingOrScoring) {
    measures.push("Documentează logica deciziei/scoringului, human review și dreptul de contestare.")
  }
  return measures
}

function buildDpiaFinding(
  input: DpiaScreeningInput,
  severity: ComplianceSeverity,
  riskScore: number,
  reasons: string[],
  missingEvidence: string[],
  nowISO: string,
): ScanFinding {
  const processName = clean(input.processName) || "Proces fără nume"
  return {
    id: `dpia-${stableId(processName)}`,
    title: "DPIA completă necesară",
    detail: `Screening-ul DPIA pentru „${processName}" indică risc ${riskScore}/100. Semnale: ${reasons.join("; ")}.`,
    category: "GDPR",
    severity,
    verdictConfidence: "medium",
    verdictConfidenceReason: "Screening Art. 35 bazat pe răspunsurile consultantului/clientului; decizia finală rămâne la DPO.",
    risk: "high",
    principles: ["privacy_data_governance", "accountability", "transparency"],
    createdAtISO: nowISO,
    sourceDocument: `DPIA Screening (${processName})`,
    legalReference: "GDPR Art. 35; ANSPDCP Decizia nr. 174/2018",
    impactSummary: "Fără DPIA, nu se poate demonstra evaluarea riscurilor înainte de o prelucrare cu risc ridicat.",
    remediationHint: "Rulează DPIA completă, documentează măsurile de reducere a riscului și atașează decizia DPO.",
    evidenceRequired: missingEvidence.length > 0
      ? missingEvidence.join(" · ")
      : "DPIA completă + decizie DPO + RoPA actualizat.",
    findingStatus: "open",
    reviewState: "unreviewed",
    requiresHumanReview: true,
    provenance: {
      ruleId: "DPIA-SCREENING-V1",
      signalSource: "manifest",
      verdictBasis: "direct_signal",
      signalConfidence: "medium",
    },
    resolution: {
      problem: "Proces cu risc ridicat fără DPIA completă documentată.",
      impact: "Risc de neconformitate Art. 35 și dificultate de apărare în fața ANSPDCP.",
      action: "Completează DPIA, definește măsurile de reducere și obține aprobarea clientului.",
      generatedAsset: "DPIA screening markdown",
      humanStep: "Consultantul DPO validează răspunsurile și decide dacă se cere consultare prealabilă Art. 36.",
      closureEvidence: "DPIA completă + decizie DPO + RoPA actualizat.",
      revalidation: "Reverifică la schimbarea scopului, datelor, vendorului, modelului AI sau anual.",
    },
  }
}

function buildDpiaMarkdown(
  input: DpiaScreeningInput,
  evaluation: Omit<DpiaScreeningEvaluation, "candidateFinding" | "generatedMarkdown">,
) {
  return [
    `# DPIA Screening — ${evaluation.processName}`,
    "",
    `Schema: ${evaluation.schemaVersion}`,
    `Departament: ${clean(input.department) || "necompletat"}`,
    `Owner: ${clean(input.ownerName) || "necompletat"}`,
    `Scor risc: ${evaluation.riskScore}/100 (${evaluation.riskLevel})`,
    `DPIA completă necesară: ${evaluation.requiresFullDpia ? "DA" : "NU / monitorizare"}`,
    "",
    "## Semnale de risc",
    ...(evaluation.reasons.length ? evaluation.reasons.map((reason) => `- ${reason}`) : ["- Nu au fost semnale majore în screening."]),
    "",
    "## Dovezi lipsă",
    ...(evaluation.missingEvidence.length ? evaluation.missingEvidence.map((item) => `- ${item}`) : ["- Nu sunt dovezi critice lipsă în screening."]),
    "",
    "## Recomandări",
    ...evaluation.recommendedMeasures.map((item) => `- ${item}`),
  ].join("\n")
}

function answerMatchesRisk(answer: DpiaAnswerValue | undefined, positiveRiskValue: DpiaAnswerValue | undefined) {
  if (answer === undefined || answer === null || answer === "") return false
  if (positiveRiskValue === undefined) return Boolean(answer)
  if (Array.isArray(positiveRiskValue)) {
    return Array.isArray(answer)
      ? answer.some((value) => positiveRiskValue.includes(value))
      : typeof answer === "string" && positiveRiskValue.includes(answer)
  }
  return answer === positiveRiskValue
}

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

function stableId(value: string): string {
  const normalized = clean(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 52)
  return normalized || "process"
}
