// Art. 50 EU AI Act — Transparency Engine (Sprint 6)
//
// Determină pentru un sistem AI ce notice-uri de transparență sunt obligatorii
// în funcție de scopul declarat, rolul organizației și flag-urile de risc.
//
// Reguli high-level:
//   - support-chatbot / document-assistant interactiv → chatbot-disclosure
//   - sistem generativ (output text/imagine/audio/video) → ai-generated-content
//   - marketing-personalization → personalization-notice
//   - sistem care detectează emoții / categorizare biometrică → emotion-recognition-notice
//   - sistem care produce deepfake → deepfake-disclosure
//   - decizii automatizate fără human review → automated-decision-notice (cross-ref GDPR Art. 22)
//
// Toate aceste obligații devin executorii la 2 decembrie 2026 (Omnibus
// mai 2026, extindere de la 2 august 2026).

import type { AIActRole } from "@/lib/compliance/types"
import type {
  AIContentLabeledAsset,
  AISystemRecord,
  ArtFiftyDutyType,
  TransparencyNoticeRequirement,
  TransparencyNoticeType,
} from "@/lib/compliance/types"

import {
  getTemplatesForNotice,
  type TemplateSubstitutions,
} from "@/lib/compliance/transparency-templates"

// ────────────────────────────────────────────────────────────────────────────
//   Deadline-uri (post-Omnibus mai 2026)
// ────────────────────────────────────────────────────────────────────────────

/** Aplicabilitate generală Art. 50 (extinsă prin Omnibus). */
export const ART_50_DEADLINE_ISO = "2026-12-02"

/** Aplicabilitate Art. 22 GDPR — în vigoare din 2018. */
export const GDPR_22_DEADLINE_ISO = "2018-05-25"

// ────────────────────────────────────────────────────────────────────────────
//   Catalog de cerințe per notice type
// ────────────────────────────────────────────────────────────────────────────

const REQUIREMENT_META: Record<
  TransparencyNoticeType,
  {
    article: string
    deadline: string
    severity: "critical" | "high" | "medium"
    obligation: string
  }
> = {
  "chatbot-disclosure": {
    article: "Art. 50(1)",
    deadline: ART_50_DEADLINE_ISO,
    severity: "high",
    obligation:
      "Informează utilizatorul, la prima interacțiune, că discută cu un sistem AI și nu cu o persoană.",
  },
  "ai-generated-content": {
    article: "Art. 50(2)",
    deadline: ART_50_DEADLINE_ISO,
    severity: "high",
    obligation:
      "Marchează output-ul (text / imagine / audio / video) ca generat sau modificat cu AI, într-un format machine-readable.",
  },
  "deepfake-disclosure": {
    article: "Art. 50(4)",
    deadline: ART_50_DEADLINE_ISO,
    severity: "critical",
    obligation:
      "Dezvăluie clar și vizibil că materialul este un deepfake — conținut artificial generat sau manipulat.",
  },
  "personalization-notice": {
    article: "Art. 50 + GDPR Art. 13/14",
    deadline: ART_50_DEADLINE_ISO,
    severity: "medium",
    obligation:
      "Informează utilizatorul că primește conținut personalizat folosind un sistem AI și oferă opt-out.",
  },
  "emotion-recognition-notice": {
    article: "Art. 50(3)",
    deadline: ART_50_DEADLINE_ISO,
    severity: "high",
    obligation:
      "Informează persoanele expuse că sistemul AI le detectează emoțiile sau le categorizează biometric.",
  },
  "automated-decision-notice": {
    article: "Art. 22 GDPR + Art. 50 EU AI Act",
    deadline: GDPR_22_DEADLINE_ISO,
    severity: "high",
    obligation:
      "Informează persoana că decizia este luată automat și pune la dispoziție un canal pentru intervenție umană.",
  },
}

// ────────────────────────────────────────────────────────────────────────────
//   Logic principal — analyzeTransparencyObligations
// ────────────────────────────────────────────────────────────────────────────

type AnalyzeOptions = {
  /** Email contact afișat în template (din branding cabinet sau setări org). */
  contactEmail?: string
  /** URL pentru preferințe / opt-out (folosit la personalizare). */
  settingsUrl?: string
  /** Nume model — folosit la watermark / etichetă generat AI. */
  modelName?: string
}

/**
 * Pentru un sistem AI dat + (opțional) rolul organizației, returnează lista
 * de notice-uri de transparență obligatorii sub Art. 50, completate cu
 * template-uri RO + EN gata de copy-paste.
 */
export function analyzeTransparencyObligations(
  system: AISystemRecord,
  role?: AIActRole,
  options: AnalyzeOptions = {}
): TransparencyNoticeRequirement[] {
  const requirements: TransparencyNoticeRequirement[] = []
  const subs: TemplateSubstitutions = {
    systemName: system.name || system.id,
    vendor: system.vendor || undefined,
    contactEmail: options.contactEmail,
    settingsUrl: options.settingsUrl,
    modelName: options.modelName || system.modelType || system.name,
    dateISO: new Date().toISOString(),
  }

  const noticeTypes: { type: TransparencyNoticeType; triggeredBy: string }[] = []

  // 1. Chatbot disclosure (Art. 50(1)) — sisteme care interacționează direct cu persoane.
  if (
    system.purpose === "support-chatbot" ||
    system.purpose === "document-assistant"
  ) {
    noticeTypes.push({
      type: "chatbot-disclosure",
      triggeredBy: `Sistemul „${system.name}” interacționează direct cu utilizatori (scop: ${system.purpose}).`,
    })
  }

  // 2. AI-generated content watermark (Art. 50(2)) — sisteme generative.
  //    Heuristică: document-assistant + image-manipulation + any vendor cu termen „generative”.
  const isGenerative =
    system.purpose === "document-assistant" ||
    system.purpose === "image-manipulation-intimate" ||
    /generative|llm|gpt|diffusion|stable|claude|gemini|mistral|llama/i.test(
      `${system.modelType ?? ""} ${system.vendor ?? ""}`
    )
  if (isGenerative) {
    noticeTypes.push({
      type: "ai-generated-content",
      triggeredBy: `Sistemul „${system.name}” produce output sintetic (text/imagine/audio/video) care trebuie etichetat machine-readable.`,
    })
  }

  // 3. Deepfake disclosure (Art. 50(4)) — image-manipulation-intimate este deja prohibited,
  //    dar tot generăm template-ul în cazul în care există excepție declarată sau ca avertisment.
  if (system.purpose === "image-manipulation-intimate") {
    noticeTypes.push({
      type: "deepfake-disclosure",
      triggeredBy: `Sistemul „${system.name}” poate produce conținut deepfake (atenție: Art. 5 face acest scop INTERZIS — disclosure-ul nu absolvă obligația de oprire).`,
    })
  }

  // 4. Personalization notice (Art. 50 + GDPR) — marketing personalization.
  if (system.purpose === "marketing-personalization") {
    noticeTypes.push({
      type: "personalization-notice",
      triggeredBy: `Sistemul „${system.name}” personalizează conținut/recomandări pentru utilizatori.`,
    })
  }

  // 5. Emotion recognition / biometric categorisation (Art. 50(3)).
  //    Heuristică: biometric-identification cu impactsRights.
  if (
    system.purpose === "biometric-identification" ||
    /emotion|sentiment|biometric|face|voice/i.test(
      `${system.modelType ?? ""} ${system.vendor ?? ""}`
    )
  ) {
    noticeTypes.push({
      type: "emotion-recognition-notice",
      triggeredBy: `Sistemul „${system.name}” poate detecta emoții sau realiza categorizare biometrică.`,
    })
  }

  // 6. Automated decision notice (Art. 22 GDPR + Art. 50).
  if (system.makesAutomatedDecisions && !system.hasHumanReview) {
    noticeTypes.push({
      type: "automated-decision-notice",
      triggeredBy: `Sistemul „${system.name}” ia decizii automate fără review uman documentat — este obligatoriu disclosure-ul (Art. 22 GDPR + Art. 50 AI Act).`,
    })
  }

  // Construiește requirement-urile finale (deduplicare).
  const seen = new Set<TransparencyNoticeType>()
  for (const { type, triggeredBy } of noticeTypes) {
    if (seen.has(type)) continue
    seen.add(type)
    const meta = REQUIREMENT_META[type]
    requirements.push({
      noticeType: type,
      article: meta.article,
      triggeredBy,
      deadline: meta.deadline,
      obligation: meta.obligation,
      severity: meta.severity,
      templates: getTemplatesForNotice(type, subs),
    })
  }

  // Notă: pentru deployerii pur ai unor sisteme cumpărate, anumite obligații
  // (e.g. watermarking Art. 50(2)) revin tehnic providerului. Le marcăm
  // oricum pentru deployer, ca recomandare de verificare contractuală.
  if (role === "deployer" && requirements.length === 0) {
    // niciun notice — sistemul nu pare să intre sub Art. 50
  }

  return requirements
}

/**
 * Pentru tot inventarul de sisteme, returnează lista consolidată de obligații
 * (cu deduplicare pe systemId + noticeType).
 */
export function analyzeAllSystems(
  systems: AISystemRecord[],
  role?: AIActRole,
  options: AnalyzeOptions = {}
): { systemId: string; systemName: string; requirements: TransparencyNoticeRequirement[] }[] {
  return systems.map((sys) => ({
    systemId: sys.id,
    systemName: sys.name,
    requirements: analyzeTransparencyObligations(sys, role, options),
  }))
}

// ────────────────────────────────────────────────────────────────────────────
//   Sprint 023.7 — Art. 50 Content Labeling Depth (per-asset evaluation)
//
//   Reguli:
//     - Art. 50(2): orice asset sintetic (image/video/audio/text_synthetic/
//       deepfake) trebuie marcat machine-readable. Standard `none` → providerGap.
//     - Art. 50(4)(a): deepfake fără disclosure vizibil → deployerGap CRITICAL.
//     - Art. 50(4)(b): text public-interest fără editorial responsibility
//       claim ȘI fără disclosure → editorialGap. Cu claim → derogare ok.
//     - Art. 50(1): chatbot_interaction fără disclosure → deployerGap.
// ────────────────────────────────────────────────────────────────────────────

export type ContentLabelingGap = {
  /** Art. 50(2) — marcaj tehnic machine-readable lipsește. */
  providerGap?: string
  /** Art. 50(1)/(3)/(4) — disclosure vizibil lipsește. */
  deployerGap?: string
  /** Art. 50(4)(b) — text public-interest fără human review claim. */
  editorialGap?: string
}

const SYNTHETIC_TYPES = new Set([
  "image",
  "video",
  "audio",
  "text_synthetic",
  "deepfake",
])

/**
 * Evaluează un AIContentLabeledAsset și returnează ce duty-uri Art. 50 nu
 * sunt acoperite. Pure function (no IO) — folosit de transparency-content-store
 * la create/update pentru emitere findings.
 */
export function evaluateContentLabelingGap(
  asset: AIContentLabeledAsset,
): ContentLabelingGap {
  const gap: ContentLabelingGap = {}

  // Provider duty (Art. 50(2)) — pentru orice asset sintetic.
  if (
    SYNTHETIC_TYPES.has(asset.assetType) &&
    (asset.providerMarkingStandard === "none" || !asset.providerMarkingApplied)
  ) {
    gap.providerGap =
      "Lipsește marcaj tehnic machine-readable (C2PA / IPTC / watermark) — Art. 50(2) EU AI Act."
  }

  // Deployer duty — variază în funcție de tipul asset-ului.
  if (asset.assetType === "deepfake" && !asset.deployerDisclosureApplied) {
    gap.deployerGap =
      "Lipsește etichetă vizibilă deepfake pentru persoanele expuse — Art. 50(4)(a) EU AI Act."
  } else if (
    asset.assetType === "chatbot_interaction" &&
    !asset.deployerDisclosureApplied
  ) {
    gap.deployerGap =
      "Lipsește disclosure runtime că utilizatorul interacționează cu un AI — Art. 50(1) EU AI Act."
  }

  // Public-interest text (Art. 50(4)(b)) — derogare cu editorial review.
  if (
    asset.assetType === "public_interest_text" ||
    asset.isPublicInterest === true
  ) {
    if (!asset.editorialResponsibilityClaim && !asset.deployerDisclosureApplied) {
      gap.editorialGap =
        "Text pe subiecte de interes public fără claim de editorial responsibility ȘI fără disclosure AI — Art. 50(4)(b) EU AI Act."
    }
  }

  return gap
}

/**
 * Determină duty-ul aplicabil pentru un asset, în funcție de rolul org-ului
 * (provider / deployer / both) și tipul asset-ului. Folosit pentru helper UI
 * + routing finding text.
 */
export function inferDutyTypeForAsset(
  asset: AIContentLabeledAsset,
  role?: AIActRole,
): ArtFiftyDutyType {
  // Asset sintetic + chatbot necesită deobicei BOTH duty-uri:
  //   provider marchează tehnic, deployer informează vizibil.
  if (SYNTHETIC_TYPES.has(asset.assetType)) {
    if (role === "provider") return "provider_marking"
    if (role === "deployer") return "deployer_disclosure"
    return "both"
  }
  if (asset.assetType === "chatbot_interaction") {
    return "deployer_disclosure"
  }
  if (
    asset.assetType === "public_interest_text" ||
    asset.isPublicInterest === true
  ) {
    return "deployer_disclosure"
  }
  return "deployer_disclosure"
}

/** Anotated wrapper folosit de UI + audit pack: combinăm asset cu gap. */
export type AnnotatedContentAsset = AIContentLabeledAsset & {
  gap: ContentLabelingGap
  hasAnyGap: boolean
  appliedDutyType: ArtFiftyDutyType
}

export function annotateContentAsset(
  asset: AIContentLabeledAsset,
  role?: AIActRole,
): AnnotatedContentAsset {
  const gap = evaluateContentLabelingGap(asset)
  const hasAnyGap = Boolean(gap.providerGap || gap.deployerGap || gap.editorialGap)
  return {
    ...asset,
    gap,
    hasAnyGap,
    appliedDutyType: inferDutyTypeForAsset(asset, role),
  }
}

/** Numără câte sisteme au cel puțin un notice nimplementat. */
export function countSystemsWithPendingNotices(
  systems: AISystemRecord[],
  implementedKeys: Set<string>,
  role?: AIActRole
): { totalSystems: number; pendingSystems: number; pendingNotices: number } {
  let pendingSystems = 0
  let pendingNotices = 0
  for (const sys of systems) {
    const reqs = analyzeTransparencyObligations(sys, role)
    if (reqs.length === 0) continue
    let hasPending = false
    for (const req of reqs) {
      const key = `${sys.id}:${req.noticeType}`
      if (!implementedKeys.has(key)) {
        pendingNotices += 1
        hasPending = true
      }
    }
    if (hasPending) pendingSystems += 1
  }
  return {
    totalSystems: systems.length,
    pendingSystems,
    pendingNotices,
  }
}
