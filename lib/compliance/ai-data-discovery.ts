/**
 * Sprint 009 — AI Data Discovery engine (pure functions, no I/O).
 *
 * Operationalizeaza AI Automation Library (Wave 1):
 *  - intake describe un tool AI -> output AIDataMapRecord
 *  - riskCandidate computat din useCase + dataFlow + governance
 *  - candidate findings produse pentru: missing DPA, third-country no DPA,
 *    special categories without DPIA, prohibited candidate, transparency
 *    notice needed, missing AI literacy / human oversight.
 *
 * Donor inspectat (v3-unified/lib/compliance/ai-data-discovery.ts — 1804 LOC):
 *  - portat conceptul de risk scoring + finding emission per record;
 *  - skipat dep site-scanner/dpo-discovery-workshop/ai-evidence-analyzer
 *    (forbidden frameworks Rule 3 — site-scanner nu exista in CompliRoAI);
 *  - rescris la shape mandat § 19 (AIUseCaseCategory + AIRiskCandidate).
 *
 * Risk evaluator logic (per EU AI Act + AI Automation Library):
 *  - prohibited_candidate: biometric ID realtime publice, social scoring
 *    behavioral, manipulare cognitiva exploativa (Art. 5).
 *  - high_risk_candidate: HR screening / credit scoring / medical diagnostic
 *    / educatie evaluare / public sector critical (Art. 6 + Annex III).
 *  - transparency_limited: chatbot / generative AI / deepfake (Art. 50).
 *  - needs_human_review: missing DPA + personal data, special categories,
 *    children data, vendor non-EU + no DPA, trains on data + personal data.
 *  - minimal: rest (low risk).
 */

import type { CreateFindingInput } from "@/lib/server/findings-store"
import type {
  AIDataMapRecord,
  AIRiskCandidate,
  AIUseCaseCategory,
  AIVendorRegion,
  AITrainingDataUsage,
  AIDeploymentMode,
} from "@/lib/compliance/types"

// ────────────────────────────────────────────────────────────────────────────
//   Input shape & evaluator output
// ────────────────────────────────────────────────────────────────────────────

export type AIDataDiscoveryIntake = {
  toolName: string
  vendor: string
  deploymentMode: AIDeploymentMode
  useCaseCategory: AIUseCaseCategory
  useCaseDescription: string
  inputDataCategories: string[]
  outputDataCategories: string[]
  processesPersonalData: boolean
  processesSpecialCategories: boolean
  childrenData: boolean
  vendorRegion: AIVendorRegion
  trainingDataUsage: AITrainingDataUsage
  dpaSigned: boolean
  dpaUrl?: string
  subprocessorsDocumented: boolean
  linkedAISystemId?: string
  notes?: string
}

export type AIRiskEvaluation = {
  riskCandidate: AIRiskCandidate
  reasons: string[]
}

export type AIDataDiscoveryEvaluation = {
  riskCandidate: AIRiskCandidate
  reasons: string[]
  findings: CreateFindingInput[]
}

// ────────────────────────────────────────────────────────────────────────────
//   Labels (RO) — folosite in UI + report
// ────────────────────────────────────────────────────────────────────────────

export const USE_CASE_LABELS: Record<AIUseCaseCategory, string> = {
  customer_support: "Suport clienți / chatbot",
  internal_copilot: "Copilot intern / asistent angajat",
  sales_marketing: "Sales / marketing / lead scoring",
  hr_workplace: "HR / recrutare / management angajați",
  finance_credit_fraud: "Finanțe / credit / fraud",
  medical_health: "Medical / sănătate",
  education: "Educație / evaluare elev/student",
  ecommerce_retail: "eCommerce / retail",
  legal_professional: "Legal / profesional / juridic",
  ai_builder_agent: "AI builder / agent autonom",
  cybersecurity: "Cybersecurity / detecție atac",
  public_sector_critical: "Sector public / infrastructură critică",
  other: "Altă utilizare",
}

export const RISK_CANDIDATE_LABELS: Record<AIRiskCandidate, string> = {
  prohibited_candidate: "Risc interzis (Art. 5)",
  high_risk_candidate: "Risc înalt (Art. 6 + Annex III)",
  transparency_limited: "Transparență obligatorie (Art. 50)",
  needs_human_review: "Necesită review uman / clarificare",
  minimal: "Risc minimal",
}

export const DEPLOYMENT_MODE_LABELS: Record<AIDeploymentMode, string> = {
  saas: "SaaS (cloud vendor)",
  self_hosted: "Self-hosted (on-prem)",
  api: "API integrat",
  embedded: "Embedded în produs",
}

export const VENDOR_REGION_LABELS: Record<AIVendorRegion, string> = {
  EU: "UE / SEE",
  US: "SUA",
  UK: "Regatul Unit",
  other: "Altă țară terță",
  unknown: "Necunoscut",
}

export const TRAINING_USAGE_LABELS: Record<AITrainingDataUsage, string> = {
  no_training: "Nu antrenează pe date client",
  opt_out_available: "Opt-out disponibil (verificat)",
  trains_on_data: "Antrenează pe date client",
  unknown: "Necunoscut",
}

// ────────────────────────────────────────────────────────────────────────────
//   Risk evaluator — combina use case + data flow + governance
// ────────────────────────────────────────────────────────────────────────────

/**
 * Use cases candidate "prohibited" (Art. 5) — necesită review urgent.
 * Lista non-exhaustiva (UI cere clarificari pentru biometric realtime public,
 * social scoring, manipulare cognitiva).
 *
 * Tagged la nivel de useCaseDescription via cuvinte cheie + categorie.
 */
const PROHIBITED_KEYWORDS = [
  "biometric realtime",
  "biometric public",
  "recunoastere faciala publica",
  "social scoring",
  "scoring social",
  "manipulare cognitiva",
  "subliminal",
  "predictive policing",
  "exploatare vulnerabili",
  "categorii sensibile inferred",
  "emotion recognition workplace",
  "recunoastere emotii angajati",
]

/**
 * Categorii high-risk per Annex III + Art. 6 (cazuri tipice IMM/cabinet RO).
 */
const HIGH_RISK_CATEGORIES: AIUseCaseCategory[] = [
  "hr_workplace",
  "finance_credit_fraud",
  "medical_health",
  "education",
  "public_sector_critical",
]

/**
 * Categorii care declanseaza obligatie Art. 50 (transparency_limited) implicit.
 */
const TRANSPARENCY_LIMITED_CATEGORIES: AIUseCaseCategory[] = [
  "customer_support",     // chatbot disclosure
  "sales_marketing",      // ai-generated content / personalizare
  "ai_builder_agent",     // disclosure agent autonom
]

export function evaluateAIRiskCandidate(intake: AIDataDiscoveryIntake): AIRiskEvaluation {
  const reasons: string[] = []
  const lowDesc = `${intake.useCaseDescription} ${intake.toolName}`.toLowerCase()

  // ── 1. Prohibited candidate (Art. 5) ───────────────────────────────────────
  const matchedProhibited = PROHIBITED_KEYWORDS.find((keyword) =>
    lowDesc.includes(keyword.toLowerCase()),
  )
  if (matchedProhibited) {
    reasons.push(
      `Descrierea include „${matchedProhibited}" — posibil interzis prin Art. 5 EU AI Act.`,
    )
    return { riskCandidate: "prohibited_candidate", reasons }
  }

  // ── 2. High-risk candidate (Art. 6 + Annex III) ───────────────────────────
  if (HIGH_RISK_CATEGORIES.includes(intake.useCaseCategory)) {
    reasons.push(
      `Categorie „${USE_CASE_LABELS[intake.useCaseCategory]}" intră tipic în Annex III high-risk.`,
    )
    if (intake.processesSpecialCategories) {
      reasons.push("Procesează categorii speciale GDPR Art. 9.")
    }
    if (intake.childrenData) {
      reasons.push("Procesează date copii — protecție sporită Art. 8 GDPR.")
    }
    return { riskCandidate: "high_risk_candidate", reasons }
  }

  // ── 3. Special categories / children fără high-risk category ──────────────
  if (intake.processesSpecialCategories || intake.childrenData) {
    if (intake.processesSpecialCategories) {
      reasons.push("Procesează categorii speciale GDPR Art. 9 — necesită evaluare DPIA.")
    }
    if (intake.childrenData) {
      reasons.push("Procesează date copii — necesită evaluare DPIA + condiție legală solidă.")
    }
    return { riskCandidate: "high_risk_candidate", reasons }
  }

  // ── 4. Needs human review (governance gaps + personal data) ────────────────
  const hasPersonalData = intake.processesPersonalData
  const noDpa = !intake.dpaSigned && hasPersonalData
  const nonEuNoDpa =
    hasPersonalData &&
    intake.vendorRegion !== "EU" &&
    intake.vendorRegion !== "UK" &&
    !intake.dpaSigned
  const trainsOnPersonal = hasPersonalData && intake.trainingDataUsage === "trains_on_data"
  const unknownTraining = hasPersonalData && intake.trainingDataUsage === "unknown"
  const subprocessorsGap = hasPersonalData && !intake.subprocessorsDocumented

  if (noDpa || nonEuNoDpa || trainsOnPersonal || unknownTraining || subprocessorsGap) {
    if (noDpa) reasons.push("Lipsă DPA cu vendor pentru tool care procesează date personale.")
    if (nonEuNoDpa) {
      reasons.push(
        `Vendor în ${VENDOR_REGION_LABELS[intake.vendorRegion]} fără DPA — necesită SCC + TIA.`,
      )
    }
    if (trainsOnPersonal) {
      reasons.push("Vendor antrenează pe datele clientului — necesită opt-out + clauze.")
    }
    if (unknownTraining) {
      reasons.push("Setarea de training pe date este necunoscută — necesită verificare.")
    }
    if (subprocessorsGap) {
      reasons.push("Subprocesori nedocumentați — lipsă transparență lanț Art. 28 GDPR.")
    }
    return { riskCandidate: "needs_human_review", reasons }
  }

  // ── 5. Transparency limited (Art. 50) ──────────────────────────────────────
  if (TRANSPARENCY_LIMITED_CATEGORIES.includes(intake.useCaseCategory)) {
    reasons.push(
      `Categorie „${USE_CASE_LABELS[intake.useCaseCategory]}" necesită informare Art. 50 (chatbot disclosure / conținut AI).`,
    )
    return { riskCandidate: "transparency_limited", reasons }
  }

  // ── 6. Minimal ────────────────────────────────────────────────────────────
  reasons.push("Nu sunt declanșatoare high-risk / transparency / governance gaps detectate.")
  return { riskCandidate: "minimal", reasons }
}

// ────────────────────────────────────────────────────────────────────────────
//   Finding emission — candidate inputs pentru createFinding()
// ────────────────────────────────────────────────────────────────────────────

export function buildAIDataDiscoveryFindings(
  intake: AIDataDiscoveryIntake,
  evaluation: AIRiskEvaluation,
): CreateFindingInput[] {
  const findings: CreateFindingInput[] = []
  const toolLabel = `${intake.toolName} (${intake.vendor || "vendor neconfirmat"})`

  // ── Prohibited candidate — finding critical ──────────────────────────────
  if (evaluation.riskCandidate === "prohibited_candidate") {
    findings.push({
      title: `Posibil sistem AI interzis: ${toolLabel}`,
      detail:
        `Descrierea utilizării sugerează o practică interzisă prin Art. 5 EU AI Act. ` +
        `Motive detectate: ${evaluation.reasons.join("; ")}. Necesită review legal urgent înainte de orice utilizare.`,
      category: "EU_AI_ACT",
      severity: "critical",
      legalReference: "EU AI Act Art. 5 — practici interzise",
      evidenceRequired:
        "Confirmare legală scrisă că utilizarea NU este în scopul interzis + descriere tehnică detaliată + temei legal",
      remediationHint:
        "Oprește utilizarea, escaladează la consilier juridic. Dacă utilizarea continuă, documentează scope-ul exact și diferențele față de practicile interzise.",
      ownerSuggestion: "DPO + Legal",
      impactSummary:
        "Practicile interzise EU AI Act atrag amendă până la 35M EUR sau 7% cifră afaceri globală.",
      closeCondition:
        "Opinie legală scrisă că utilizarea nu se încadrează în Art. 5 SAU oprire utilizare documentată.",
    })
  }

  // ── High-risk candidate ───────────────────────────────────────────────────
  if (evaluation.riskCandidate === "high_risk_candidate") {
    findings.push({
      title: `Sistem AI high-risk candidate: ${toolLabel}`,
      detail:
        `Utilizarea poate intra în categoria high-risk per Annex III + Art. 6 EU AI Act. ` +
        `Motive: ${evaluation.reasons.join("; ")}. Necesită clasificare formală + obligații conformitate (FRIA, logging, human oversight).`,
      category: "EU_AI_ACT",
      severity: "high",
      legalReference: "EU AI Act Art. 6 + Annex III",
      evidenceRequired:
        "Role assessment (provider/deployer), FRIA dacă deployer, log evidence, human oversight protocol",
      remediationHint:
        "Rulează Role Assessment + clasifică formal sistemul. Dacă deployer, pregătește FRIA și human oversight protocol înainte de utilizare în producție.",
      ownerSuggestion: "DPO + IT lead",
      closeCondition: "FRIA + human oversight + logging evidence + clasificare formală în registru",
    })
  }

  // ── Missing DPA + personal data ───────────────────────────────────────────
  if (intake.processesPersonalData && !intake.dpaSigned) {
    findings.push({
      title: `Lipsă DPA pentru ${toolLabel}`,
      detail:
        `Tool-ul AI procesează date personale, dar nu există DPA semnat cu vendorul. ` +
        `GDPR Art. 28 impune contract de prelucrare scris înainte de a partaja date personale cu procesator.`,
      category: "GDPR",
      severity: "high",
      legalReference: "GDPR Art. 28 + Art. 46 (dacă transfer extern)",
      evidenceRequired: "DPA semnat + listă subprocesori + regiune procesare",
      remediationHint:
        "Solicită DPA-ul vendorului (de obicei în Trust Center sau via support). Verifică includerea subprocessorilor și a clauzelor de transfer extern.",
      ownerSuggestion: "DPO",
      closeCondition: "DPA semnat încărcat în registru + verificat de DPO",
    })
  }

  // ── Third-country no DPA / SCC ────────────────────────────────────────────
  if (
    intake.processesPersonalData &&
    intake.vendorRegion !== "EU" &&
    intake.vendorRegion !== "UK" &&
    intake.vendorRegion !== "unknown"
  ) {
    findings.push({
      title: `Transfer date în țară terță (${VENDOR_REGION_LABELS[intake.vendorRegion]}) — ${toolLabel}`,
      detail:
        `Vendor-ul AI procesează datele într-o țară terță. Necesită mecanism legal de transfer (SCC, BCR sau decizie de adecvare) ` +
        `și, după Schrems II, Transfer Impact Assessment (TIA).`,
      category: "GDPR",
      severity: intake.dpaSigned ? "medium" : "high",
      legalReference: "GDPR Cap. V (Art. 44-50) + Schrems II",
      evidenceRequired: "SCC versiunea 2021 + TIA documentat + măsuri suplimentare dacă necesar",
      remediationHint:
        "Verifică în DPA includerea SCC. Pentru SUA, evaluează aplicabilitatea EU-US Data Privacy Framework (DPF). Dacă vendor nu este pe lista DPF, rulează TIA.",
      ownerSuggestion: "DPO",
      closeCondition: "SCC + TIA documentate + dovedirea măsurilor tehnice/organizatorice suplimentare",
    })
  }

  // ── Special categories without DPIA ────────────────────────────────────────
  if (intake.processesSpecialCategories) {
    findings.push({
      title: `Categorii speciale GDPR Art. 9 procesate de ${toolLabel} — DPIA obligatoriu`,
      detail:
        `Tool-ul AI procesează categorii speciale de date (sănătate, biometrice, etnice, etc.). ` +
        `GDPR Art. 35 + ANSPDCP Decizia 174/2018 impun DPIA pentru asemenea procesări la scară.`,
      category: "GDPR",
      severity: "high",
      legalReference: "GDPR Art. 9 + Art. 35; ANSPDCP Dec. 174/2018",
      evidenceRequired: "DPIA aprobat + condiție Art. 9 documentată + măsuri tehnice suplimentare",
      remediationHint:
        "Creează DPIA în /dashboard/dpia. Documentează condiția Art. 9 (consimțământ explicit, sănătate publică, etc.) și măsurile de protecție.",
      ownerSuggestion: "DPO",
      closeCondition: "DPIA aprobat + condiție Art. 9 + link RoPA",
    })
  }

  // ── Children data ────────────────────────────────────────────────────────
  if (intake.childrenData) {
    findings.push({
      title: `Date copii procesate de ${toolLabel} — protecție sporită`,
      detail:
        `Tool-ul AI procesează date despre copii (sub 16 ani). GDPR Art. 8 + Recital 38 impun ` +
        `temei legal solid + informare adaptată + în multe cazuri consimțământ părinte.`,
      category: "GDPR",
      severity: "high",
      legalReference: "GDPR Art. 8 + Recital 38; Convenția ONU drepturile copilului",
      evidenceRequired: "Temei legal + mecanism verificare vârstă + consimțământ părinte unde se aplică",
      remediationHint:
        "Verifică temeiul legal (de obicei consimțământ părinte sub 16 ani). Adaugă informare adaptată copiilor.",
      ownerSuggestion: "DPO",
      closeCondition: "Temei legal documentat + mecanism verificare vârstă + DPIA",
    })
  }

  // ── Trains on data ───────────────────────────────────────────────────────
  if (intake.processesPersonalData && intake.trainingDataUsage === "trains_on_data") {
    findings.push({
      title: `${toolLabel} antrenează pe datele clientului`,
      detail:
        `Vendor-ul folosește datele introduse pentru antrenare model. Aceasta constituie prelucrare suplimentară ` +
        `care necesită temei legal separat, informare persoane vizate și, în multe cazuri, opt-out.`,
      category: "GDPR",
      severity: "high",
      legalReference: "GDPR Art. 6 + Art. 13-14; EU AI Act Art. 10 (data governance)",
      evidenceRequired:
        "Confirmare opt-out activat + informare persoane vizate actualizată + temei legal pentru training",
      remediationHint:
        "Activează opt-out la training (de obicei în settings cont vendor). Actualizează privacy notice cu mențiunea AI training.",
      ownerSuggestion: "DPO + IT",
      closeCondition: "Opt-out activat + dovadă + privacy notice actualizat",
    })
  }

  // ── Unknown training ───────────────────────────────────────────────────────
  if (intake.processesPersonalData && intake.trainingDataUsage === "unknown") {
    findings.push({
      title: `Setarea de training necunoscută pentru ${toolLabel}`,
      detail:
        `Nu se știe dacă vendor-ul folosește datele pentru antrenare model. Necesită clarificare ` +
        `înainte de utilizare pe date personale reale.`,
      category: "GDPR",
      severity: "medium",
      legalReference: "GDPR Art. 5(1)(a) transparență + Art. 28",
      evidenceRequired: "Confirmare scrisă vendor + screenshot setări training",
      remediationHint:
        "Verifică documentația vendor (FAQ, DPA, Trust Center). Dacă neclar, contactează vendor pentru confirmare scrisă.",
      ownerSuggestion: "DPO",
      closeCondition: "Confirmare scrisă vendor + decizie DPO documentată",
    })
  }

  // ── Subprocessors not documented ──────────────────────────────────────────
  if (intake.processesPersonalData && !intake.subprocessorsDocumented) {
    findings.push({
      title: `Subprocesori nedocumentați pentru ${toolLabel}`,
      detail:
        `Lanțul de subprocesori al vendor-ului AI nu este documentat. GDPR Art. 28(2) impune ` +
        `autorizare prealabilă (generală sau specifică) și informare modificări.`,
      category: "GDPR",
      severity: "medium",
      legalReference: "GDPR Art. 28(2) + Art. 30",
      evidenceRequired: "Lista subprocesori actualizată + mecanism notificare modificări",
      remediationHint:
        "Solicită lista subprocessorilor (de obicei publică pe website-ul vendor). Adaugă în registrul intern + monitorizare modificări.",
      ownerSuggestion: "DPO",
      closeCondition: "Lista subprocesori + clauză notificare modificări",
    })
  }

  // ── Transparency limited (Art. 50) ────────────────────────────────────────
  if (evaluation.riskCandidate === "transparency_limited") {
    findings.push({
      title: `Informare AI Art. 50 necesară pentru ${toolLabel}`,
      detail:
        `Tool-ul AI cade sub obligația de transparență Art. 50 EU AI Act ` +
        `(persoanele trebuie informate clar că interacționează cu AI / că conținutul este generat AI).`,
      category: "EU_AI_ACT",
      severity: "medium",
      legalReference: "EU AI Act Art. 50",
      evidenceRequired: "Disclosure vizibil în UI + privacy notice actualizat",
      remediationHint:
        "Generează template-uri de informare în /dashboard/transparency. Implementează disclosure în UI (popup, footer, badge).",
      ownerSuggestion: "Product + DPO",
      closeCondition: "Disclosure implementat + dovadă (screenshot + privacy notice)",
    })
  }

  // ── AI Literacy + policy (always recommended) ─────────────────────────────
  findings.push({
    title: `AI literacy + policy internă pentru ${toolLabel}`,
    detail:
      `Utilizarea ${toolLabel} trebuie acoperită prin politică internă AI (acceptable use, ` +
      `interdicții, audit logging) și training angajați (Art. 4 EU AI Act).`,
    category: "EU_AI_ACT",
    severity: "low",
    legalReference: "EU AI Act Art. 4",
    evidenceRequired: "Politică AI internă semnată + listă angajați trained + dată training",
    remediationHint:
      "Descarcă Policy Pack-ul AI din /dashboard/ai-discovery (Acceptable Use + Logging). Distribuie + colectează semnături.",
    ownerSuggestion: "HR + DPO",
    closeCondition: "Politică semnată + minim un training documentat",
  })

  return findings
}

// ────────────────────────────────────────────────────────────────────────────
//   Combined evaluator — input -> {risk + reasons + findings}
// ────────────────────────────────────────────────────────────────────────────

export function evaluateAIDataDiscovery(intake: AIDataDiscoveryIntake): AIDataDiscoveryEvaluation {
  const evaluation = evaluateAIRiskCandidate(intake)
  const findings = buildAIDataDiscoveryFindings(intake, evaluation)
  return {
    riskCandidate: evaluation.riskCandidate,
    reasons: evaluation.reasons,
    findings,
  }
}

// ────────────────────────────────────────────────────────────────────────────
//   Record builder helper — input + evaluation -> AIDataMapRecord (unpersisted)
// ────────────────────────────────────────────────────────────────────────────

export function buildAIDataMapRecord(input: {
  intake: AIDataDiscoveryIntake
  orgId: string
  evaluation: AIRiskEvaluation
  recordId: string
  linkedFindingIds: string[]
  nowISO: string
  status?: AIDataMapRecord["status"]
}): AIDataMapRecord {
  return {
    id: input.recordId,
    orgId: input.orgId,
    toolName: input.intake.toolName,
    vendor: input.intake.vendor,
    deploymentMode: input.intake.deploymentMode,
    useCaseCategory: input.intake.useCaseCategory,
    useCaseDescription: input.intake.useCaseDescription,
    inputDataCategories: normalizeStringArray(input.intake.inputDataCategories),
    outputDataCategories: normalizeStringArray(input.intake.outputDataCategories),
    processesPersonalData: input.intake.processesPersonalData,
    processesSpecialCategories: input.intake.processesSpecialCategories,
    childrenData: input.intake.childrenData,
    vendorRegion: input.intake.vendorRegion,
    trainingDataUsage: input.intake.trainingDataUsage,
    dpaSigned: input.intake.dpaSigned,
    dpaUrl: input.intake.dpaUrl?.trim() || undefined,
    subprocessorsDocumented: input.intake.subprocessorsDocumented,
    riskCandidate: input.evaluation.riskCandidate,
    reasons: input.evaluation.reasons,
    linkedFindingIds: input.linkedFindingIds,
    linkedAISystemId: input.intake.linkedAISystemId,
    status: input.status ?? "active",
    notes: input.intake.notes?.trim() || undefined,
    createdAtISO: input.nowISO,
    updatedAtISO: input.nowISO,
  }
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const out: string[] = []
  for (const v of value) {
    if (typeof v === "string") {
      const trimmed = v.trim()
      if (trimmed) out.push(trimmed)
    }
  }
  return Array.from(new Set(out))
}
