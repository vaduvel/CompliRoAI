/**
 * Sprint 009 — PII Discovery scanner (pure deterministic detection on text).
 *
 * Detecteaza categorii de PII in text/json/csv blobs via regex + keywords.
 * Output: PIIDetection (shape mandat § 19) + candidate finding daca high-confidence.
 *
 * Categorii detectate (PIICategoryType): email, phone, cnp, iban, card,
 * passport, ip, address, name, other.
 *
 * Donor inspectat: v3-unified/lib/compliance/pii-discovery.ts (342 LOC).
 * Portat conceptul de detector regex/keyword + risk scoring. Adaptat:
 *  - shape PIIDetection conform mandat (categories + count + confidence + sample)
 *  - categorii consolidate la lista mandat (CNP/IBAN/email/phone/card/passport/ip/address/name)
 *  - sample masking pentru output safe in UI
 */

import type { CreateFindingInput } from "@/lib/server/findings-store"
import type { PIICategoryHit, PIICategoryType, PIIConfidence } from "@/lib/compliance/types"

export type PIIDiscoveryInput = {
  sourceLabel: string                    // ex: "chat-log.json", "manual paste"
  text: string
}

export type PIIDiscoveryResult = {
  sourceLabel: string
  scannedAtISO: string
  detectionCount: number
  categories: PIICategoryHit[]
  riskLevel: "none" | "low" | "medium" | "high"
  candidateFinding?: CreateFindingInput  // emis daca PII high-confidence detectat
}

// ────────────────────────────────────────────────────────────────────────────
//   Detectors — regex + keywords. Numele consolidat la PIICategoryType.
// ────────────────────────────────────────────────────────────────────────────

type Detector = {
  type: PIICategoryType
  confidence: PIIConfidence
  regex?: RegExp
  keywords?: string[]
}

const DETECTORS: Detector[] = [
  {
    type: "cnp",
    confidence: "high",
    // CNP RO: 13 cifre, prima 1-9, structura YYMMDD valid (1-8 = sec/sex, 9 = strain)
    regex: /\b[1-9]\d{12}\b/g,
  },
  {
    type: "email",
    confidence: "high",
    regex: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
  },
  {
    type: "iban",
    confidence: "high",
    // IBAN RO: RO + 2 cifre check + 4 litere banca + 16 alphanum cont
    regex: /\bRO\d{2}[A-Z]{4}[A-Z0-9]{16}\b/gi,
  },
  {
    type: "card",
    confidence: "high",
    // Visa/MC/Amex 13-19 cifre separate prin spatii/dashes
    regex: /\b(?:\d[ -]?){13,18}\d\b/g,
  },
  {
    type: "phone",
    confidence: "medium",
    // Telefon RO: 07XX XXX XXX cu variante +40, 0040, 0
    regex: /(?:\+40|0040|0)\s?7\d{2}(?:[\s.-]?\d{3}){2}\b/g,
  },
  {
    type: "passport",
    confidence: "medium",
    // Pasaport / CI / serie act identitate RO
    regex: /\b(?:CI|BI|pașaport|pasaport|passport)\s*[:#-]?\s*[A-Z]{2}\d{6,8}\b/gi,
  },
  {
    type: "ip",
    confidence: "high",
    // IPv4
    regex: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
  },
  {
    type: "address",
    confidence: "low",
    keywords: [
      "strada",
      "str.",
      "bd.",
      "bulevard",
      "localitate",
      "județ",
      "judet",
      "cod poștal",
      "cod postal",
      "sector",
    ],
  },
  {
    type: "name",
    confidence: "low",
    // Pattern slab: "Nume Prenume" RO capitalizat. Doar low confidence.
    regex: /\b[A-ZĂÂÎȘȚ][a-zăâîșț]+\s+[A-ZĂÂÎȘȚ][a-zăâîșț]+\b/g,
  },
]

// ────────────────────────────────────────────────────────────────────────────
//   Risk scoring per categorie
// ────────────────────────────────────────────────────────────────────────────

const CATEGORY_WEIGHTS: Record<PIICategoryType, number> = {
  cnp: 32,
  iban: 22,
  card: 28,
  passport: 18,
  email: 6,
  phone: 6,
  ip: 4,
  address: 8,
  name: 2,
  other: 2,
}

// ────────────────────────────────────────────────────────────────────────────
//   Main: scanPIIBlob
// ────────────────────────────────────────────────────────────────────────────

export function scanPIIBlob(
  input: PIIDiscoveryInput,
  nowISO: string = new Date().toISOString(),
): PIIDiscoveryResult {
  const text = input.text ?? ""
  const sourceLabel = input.sourceLabel?.trim() || "Document"
  const categories = DETECTORS.flatMap((detector) => detectCategory(detector, text))
  const detectionCount = categories.reduce((sum, cat) => sum + cat.count, 0)

  const score = categories.reduce(
    (sum, cat) => sum + CATEGORY_WEIGHTS[cat.type] * Math.min(cat.count, 5),
    0,
  )
  const riskLevel: PIIDiscoveryResult["riskLevel"] =
    detectionCount === 0
      ? "none"
      : score >= 60
        ? "high"
        : score >= 25
          ? "medium"
          : "low"

  const candidateFinding = buildPIIFinding({
    sourceLabel,
    categories,
    detectionCount,
    riskLevel,
    nowISO,
  })

  return {
    sourceLabel,
    scannedAtISO: nowISO,
    detectionCount,
    categories,
    riskLevel,
    candidateFinding,
  }
}

function detectCategory(detector: Detector, text: string): PIICategoryHit[] {
  let count = 0
  let sample: string | undefined

  if (detector.regex) {
    const matches = text.match(detector.regex) ?? []
    count += matches.length
    const first = matches[0]
    if (first && !sample) {
      sample = maskSample(first, detector.type)
    }
  }
  if (detector.keywords) {
    const lower = text.toLowerCase()
    for (const keyword of detector.keywords) {
      const escaped = escapeRegExp(keyword.toLowerCase())
      const re = new RegExp(`\\b${escaped}\\b`, "g")
      const matches = lower.match(re) ?? []
      if (matches.length > 0) {
        count += matches.length
        if (!sample) sample = keyword
      }
    }
  }
  if (count === 0) return []
  return [{
    type: detector.type,
    count,
    confidence: detector.confidence,
    sample,
  }]
}

function maskSample(value: string, type: PIICategoryType): string {
  const trimmed = value.trim()
  if (type === "email" && trimmed.includes("@")) {
    const [name, domain] = trimmed.split("@")
    return `${name.slice(0, 2)}***@${domain}`
  }
  if (type === "card") {
    const digits = trimmed.replace(/\D/g, "")
    if (digits.length >= 8) {
      return `${digits.slice(0, 4)}****${digits.slice(-4)}`
    }
  }
  if (type === "ip") {
    const parts = trimmed.split(".")
    if (parts.length === 4) return `${parts[0]}.${parts[1]}.***.***`
  }
  if (trimmed.length <= 6) return "***"
  return `${trimmed.slice(0, 3)}***${trimmed.slice(-2)}`
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

// ────────────────────────────────────────────────────────────────────────────
//   Finding emission — daca PII high-confidence detectat
// ────────────────────────────────────────────────────────────────────────────

function buildPIIFinding(input: {
  sourceLabel: string
  categories: PIICategoryHit[]
  detectionCount: number
  riskLevel: PIIDiscoveryResult["riskLevel"]
  nowISO: string
}): CreateFindingInput | undefined {
  if (input.detectionCount === 0) return undefined

  const hasHighConfidence = input.categories.some((cat) => cat.confidence === "high")
  if (!hasHighConfidence) return undefined

  const categoriesLabel = input.categories
    .map((cat) => `${categoryLabel(cat.type)} (${cat.count})`)
    .join(", ")

  const hasSensitive = input.categories.some(
    (cat) => cat.type === "cnp" || cat.type === "iban" || cat.type === "card" || cat.type === "passport",
  )
  const severity = hasSensitive ? "high" : input.riskLevel === "high" ? "high" : "medium"

  return {
    title: `Date personale detectate în „${input.sourceLabel}"`,
    detail:
      `PII scanner a detectat ${input.detectionCount} categorii de date personale în „${input.sourceLabel}". ` +
      `Categorii: ${categoriesLabel}. ` +
      `${hasSensitive ? "Include identificatori sensibili (CNP/IBAN/card/pașaport) — necesită protecție sporită. " : ""}` +
      `Documentul trebuie mapat în RoPA și protejat conform măsurilor de securitate adecvate (GDPR Art. 32).`,
    category: "GDPR",
    severity,
    legalReference: "GDPR Art. 5, Art. 6, Art. 30, Art. 32" + (hasSensitive ? "; Legea 190/2018" : ""),
    evidenceRequired:
      "Activitate RoPA legată + temei juridic + retenție + măsuri de securitate (criptare, control acces, retenție limitată)",
    remediationHint:
      "Mapează documentul la o activitate RoPA în /dashboard/ropa. " +
      (hasSensitive ? "Pentru identificatori sensibili, limitează accesul și aplică criptare la rest." : "Confirmă temeiul legal pentru prelucrare."),
    ownerSuggestion: "DPO",
    impactSummary:
      "Date personale nemapeate = lipsă vizibilitate proces real + risc breach + lipsă demonstrare conformitate la control ANSPDCP.",
    closeCondition: "RoPA actualizat + măsuri de securitate documentate" + (hasSensitive ? " + DPIA dacă scale mare" : ""),
  }
}

function categoryLabel(type: PIICategoryType): string {
  switch (type) {
    case "cnp": return "CNP"
    case "email": return "Email"
    case "phone": return "Telefon"
    case "iban": return "IBAN"
    case "card": return "Card bancar"
    case "passport": return "Pașaport/CI"
    case "ip": return "Adresă IP"
    case "address": return "Adresă fizică"
    case "name": return "Nume persoană"
    case "other": return "Altă categorie"
  }
}

export { categoryLabel as piiCategoryLabel }
