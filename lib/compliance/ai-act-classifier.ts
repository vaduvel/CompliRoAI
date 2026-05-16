// EU AI Act risk classification auto-detect
// Clasificare automată pe baza Annex III + Art. 5 + Art. 50

import type { AISystemPurpose, AISystemRecord } from "@/lib/compliance/types"

export type AIActRiskLevel =
  | "prohibited"    // Art. 5 — interzis
  | "high_risk"     // Annex III — obligații complete
  | "limited_risk"  // Art. 50 — obligații transparență
  | "minimal_risk"  // fără obligații specifice

export type AIActClassification = {
  riskLevel: AIActRiskLevel
  article: string
  reason: string
  deadline?: string
  requiredActions: string[]
  autoDetected: boolean
  confirmedByHuman: boolean
}

export type AIActObligationId =
  | "register-eu-database"
  | "technical-documentation"
  | "human-oversight"
  | "conformity-assessment"
  | "stop-system"
  | "manual-classification"
  | "disclosure"

export type ScanFindingLite = {
  id: string
  title: string
  detail: string
  category: "EU_AI_ACT"
  severity: "critical" | "high" | "medium"
  risk: "high" | "low"
  principles: string[]
  createdAtISO: string
  sourceDocument: string
  legalReference?: string
  impactSummary?: string
  remediationHint?: string
  evidenceRequired?: string
  suggestedDocumentType?: string
  findingStatus?: "open" | "confirmed" | "dismissed" | "resolved" | "under_monitoring"
  findingStatusUpdatedAtISO?: string
}

function severityToLegacyRisk(severity: "critical" | "high" | "medium"): "high" | "low" {
  return severity === "critical" || severity === "high" ? "high" : "low"
}

// Clasificare automată pentru tipuri cunoscute (din canon)
const KNOWN_CLASSIFICATIONS: Record<AISystemPurpose, {
  riskLevel: AIActRiskLevel
  article: string
  reason: string
  requiredActions: string[]
  deadlineOverride?: string  // ISO date — for prohibitions with specific enforcement dates
}> = {
  "hr-screening": {
    riskLevel: "high_risk",
    article: "Annex III 4(a)",
    reason: "Sistem AI folosit în recrutare/selecție personal — high-risk conform Annex III.",
    requiredActions: [
      "Documentație tehnică (Annex IV)",
      "Evaluare conformitate",
      "Înregistrare EU Database",
      "Human oversight obligatoriu",
    ],
  },
  "credit-scoring": {
    riskLevel: "high_risk",
    article: "Annex III 5(b)",
    reason: "Sistem AI pentru evaluare creditare — high-risk conform Annex III.",
    requiredActions: [
      "Documentație tehnică (Annex IV)",
      "Evaluare conformitate",
      "Înregistrare EU Database",
    ],
  },
  "biometric-identification": {
    riskLevel: "prohibited",
    article: "Art. 5(1)(e)",
    reason: "Identificare biometrică în spații publice — interzis conform Art. 5 AI Act.",
    requiredActions: [
      "Oprire imediată a sistemului",
      "Evaluare dacă se aplică excepție Art. 5(2)",
    ],
  },
  "fraud-detection": {
    riskLevel: "high_risk",
    article: "Annex III 5(b)",
    reason: "Sistem AI pentru detectare fraudă cu impact asupra persoanelor — high-risk.",
    requiredActions: [
      "Documentație tehnică (Annex IV)",
      "Evaluare conformitate",
      "Înregistrare EU Database",
    ],
  },
  "marketing-personalization": {
    riskLevel: "limited_risk",
    article: "Art. 50",
    reason: "Sistem AI pentru personalizare marketing — limited risk, obligații de transparență.",
    requiredActions: [
      "Informare utilizator că interacționează cu AI",
      "Disclosure pe pagina /trust",
    ],
  },
  "support-chatbot": {
    riskLevel: "limited_risk",
    article: "Art. 50",
    reason: "Chatbot AI — obligații de transparență (utilizatorul trebuie informat).",
    requiredActions: [
      "Informare utilizator că interacționează cu AI",
      "Disclosure pe pagina /trust",
    ],
  },
  "document-assistant": {
    riskLevel: "minimal_risk",
    article: "—",
    reason: "Asistent documente fără impact semnificativ — minimal risk, fără obligații specifice.",
    requiredActions: [],
  },
  "image-manipulation-intimate": {
    riskLevel: "prohibited",
    article: "Art. 5 (Omnibus mai 2026)",
    reason:
      "Generare/manipulare conținut intim neconsimțit (nudifier apps, deepfake sexual, CSAM) — interzis prin pachetul Omnibus 7 mai 2026, executoriu de la 2 decembrie 2026. Furnizorii GPAI au obligația filtrelor tehnice obligatorii.",
    requiredActions: [
      "Oprire imediată dezvoltare/distribuție",
      "Filtre tehnice obligatorii pentru providerii GPAI (Art. 5 + obligații GPAI)",
      "Notificare ANCOM dacă sistemul a fost deja deployat",
    ],
    deadlineOverride: "2026-12-02",
  },
  "other": {
    riskLevel: "limited_risk",
    article: "Art. 50 (implicit)",
    reason: "Tip necunoscut — clasificat implicit ca limited risk. Confirmă manual.",
    requiredActions: [
      "Evaluare manuală a nivelului de risc",
      "Disclosure dacă utilizatorii interacționează cu AI",
    ],
  },
}

export function classifyAISystem(purpose: AISystemPurpose): AIActClassification {
  const known = KNOWN_CLASSIFICATIONS[purpose]
  // Deadlines per Omnibus Agreement 7 mai 2026:
  //   - High-risk Annex III stand-alone: 2 dec 2027
  //   - Nudifier/CSAM filters (GPAI providers): 2 dec 2026
  //   - Watermarking obligations (Art. 50 generated content): 2 dec 2026
  //   - Other prohibitions: active since 2 feb 2025
  const deadline =
    known.deadlineOverride ??
    (known.riskLevel === "high_risk" ? "2027-12-02" : undefined)

  return {
    riskLevel: known.riskLevel,
    article: known.article,
    reason: known.reason,
    deadline,
    requiredActions: known.requiredActions,
    autoDetected: true,
    confirmedByHuman: false,
  }
}

const OBLIGATION_DEFINITIONS: Record<
  AIActObligationId,
  {
    suffix: string
    label: string
    severity: "critical" | "high" | "medium"
    title: string
    legalReference: string
    principles: string[]
    evidenceRequired: string
    remediationHint: string
  }
> = {
  "register-eu-database": {
    suffix: "eu-db",
    label: "Înregistrare EU Database",
    severity: "high",
    title: "Înregistrare EU AI Database lipsă",
    legalReference: "EU AI Act Art. 49",
    principles: ["accountability", "transparency"],
    evidenceRequired: "JSON-ul de pregătire EU Database sau dovada înregistrării.",
    remediationHint:
      "Pregătește intrarea pentru EU AI Database și salvează dovada trimiterii sau a review-ului intern.",
  },
  "technical-documentation": {
    suffix: "annex-iv",
    label: "Documentație tehnică (Annex IV)",
    severity: "high",
    title: "Documentație Annex IV lipsă",
    legalReference: "EU AI Act Annex IV",
    principles: ["accountability", "robustness", "transparency"],
    evidenceRequired: "Draftul Annex IV generat și aprobat ca dovadă.",
    remediationHint:
      "Generează draftul Annex IV, verifică datele tehnice și aprobă documentul ca dovadă în Dosar.",
  },
  "human-oversight": {
    suffix: "oversight",
    label: "Human oversight",
    severity: "medium",
    title: "Human oversight neconfirmat",
    legalReference: "EU AI Act Art. 14",
    principles: ["oversight", "accountability"],
    evidenceRequired: "Regulile de oversight și persoanele responsabile confirmate.",
    remediationHint:
      "Definește cine aprobă, verifică și poate opri sistemul în scenarii sensibile.",
  },
  "conformity-assessment": {
    suffix: "conformity",
    label: "Evaluare conformitate",
    severity: "high",
    title: "Evaluare de conformitate lipsă",
    legalReference: "EU AI Act Art. 43",
    principles: ["accountability", "robustness"],
    evidenceRequired: "Raportul intern sau referința evaluării de conformitate.",
    remediationHint:
      "Documentează evaluarea de conformitate și lasă nota operațională în cockpit.",
  },
  "stop-system": {
    suffix: "stop-system",
    label: "Oprire imediată a sistemului",
    severity: "critical",
    title: "Sistem AI interzis — măsură de oprire",
    legalReference: "EU AI Act Art. 5",
    principles: ["oversight", "accountability"],
    evidenceRequired: "Dovada opririi sau a blocării utilizării în producție.",
    remediationHint:
      "Oprește utilizarea operațională și notează excepția legală doar dacă există bază validă.",
  },
  "manual-classification": {
    suffix: "manual-classification",
    label: "Evaluare manuală a nivelului de risc",
    severity: "medium",
    title: "Clasificare AI necesită validare manuală",
    legalReference: "EU AI Act Art. 6 și Art. 50",
    principles: ["accountability", "transparency"],
    evidenceRequired: "Nota de clasificare validată intern sau prin expert.",
    remediationHint:
      "Confirmă manual încadrarea și consemnează de ce sistemul rămâne limited sau minimal risk.",
  },
  disclosure: {
    suffix: "disclosure",
    label: "Disclosure utilizator",
    severity: "medium",
    title: "Disclosure AI pentru utilizatori lipsă",
    legalReference: "EU AI Act Art. 50",
    principles: ["transparency", "accountability"],
    evidenceRequired: "Textul de disclosure sau captura din interfață.",
    remediationHint:
      "Adaugă mesajul clar că utilizatorul interacționează cu un sistem AI și salvează dovada.",
  },
}

function normalizeAIActRequiredAction(label: string): AIActObligationId | null {
  const normalized = label.trim().toLowerCase()
  if (normalized.includes("annex iv") || normalized.includes("documentație tehnică") || normalized.includes("documentatie tehnica")) {
    return "technical-documentation"
  }
  if (normalized.includes("conformitate")) return "conformity-assessment"
  if (normalized.includes("eu database")) return "register-eu-database"
  if (normalized.includes("human oversight")) return "human-oversight"
  if (normalized.includes("oprire imediată") || normalized.includes("oprire imediata")) return "stop-system"
  if (normalized.includes("evaluare manuală") || normalized.includes("evaluare manuala")) {
    return "manual-classification"
  }
  if (normalized.includes("disclosure") || normalized.includes("interacționează cu ai") || normalized.includes("interactioneaza cu ai")) {
    return "disclosure"
  }
  return null
}

export function getAIActRequiredActionIds(classification: AIActClassification): AIActObligationId[] {
  const ids = classification.requiredActions
    .map(normalizeAIActRequiredAction)
    .filter((value): value is AIActObligationId => Boolean(value))

  return [...new Set(ids)]
}

export function buildAIActFindingId(systemId: string, obligationId: AIActObligationId) {
  return `ai-act-${systemId}-${OBLIGATION_DEFINITIONS[obligationId].suffix}`
}

export function buildAIActObligationFindings(
  system: AISystemRecord,
  classification: AIActClassification,
  nowISO: string
): ScanFindingLite[] {
  return getAIActRequiredActionIds(classification).map((obligationId) => {
    const obligation = OBLIGATION_DEFINITIONS[obligationId]
    const detailLines = [
      `Sistemul "${system.name}" este clasificat ca ${RISK_LEVEL_LABELS[classification.riskLevel].toLowerCase()} conform ${classification.article}.`,
      classification.reason,
      "",
      `Obligație activă: ${obligation.label}.`,
      classification.deadline ? `Deadline orientativ: ${classification.deadline}.` : null,
    ].filter(Boolean)

    return {
      id: buildAIActFindingId(system.id, obligationId),
      title: `${system.name} — ${obligation.title}`,
      detail: detailLines.join("\n"),
      category: "EU_AI_ACT" as const,
      severity: obligation.severity,
      risk: severityToLegacyRisk(obligation.severity),
      principles: obligation.principles,
      createdAtISO: nowISO,
      sourceDocument: "EU AI Act",
      legalReference: `${obligation.legalReference}${classification.article ? ` · ${classification.article}` : ""}`,
      impactSummary:
        classification.riskLevel === "prohibited"
          ? "Folosirea sistemului fără măsura corectă poate crea expunere legală imediată."
          : "Obligațiile AI Act rămân deschise până când există dovadă clară și urmă în Dosar.",
      remediationHint: obligation.remediationHint,
      evidenceRequired: obligation.evidenceRequired,
      suggestedDocumentType: obligationId === "human-oversight" ? "ai-governance" : undefined,
      findingStatus: "open",
      findingStatusUpdatedAtISO: nowISO,
    }
  })
}

export const RISK_LEVEL_LABELS: Record<AIActRiskLevel, string> = {
  prohibited: "Interzis (Art. 5)",
  high_risk: "High Risk (Annex III)",
  limited_risk: "Limited Risk (Art. 50)",
  minimal_risk: "Minimal Risk",
}

export const RISK_LEVEL_COLORS: Record<AIActRiskLevel, string> = {
  prohibited: "text-red-700 bg-red-50 border-red-300",
  high_risk: "text-amber-700 bg-amber-50 border-amber-300",
  limited_risk: "text-blue-700 bg-blue-50 border-blue-300",
  minimal_risk: "text-green-700 bg-green-50 border-green-300",
}
