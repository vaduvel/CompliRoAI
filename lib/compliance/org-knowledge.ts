// Progressive Data Enrichment / orgKnowledge (port Sprint 008A din
// DPO-OS v3-unified — Multiplicator B).
//
// Datele confirmate o dată sunt reutilizate în toate documentele viitoare.
// Sursele care alimentează knowledge-ul: onboarding, DSAR, AI Systems,
// vendor review, RoPA, DPO discovery workshop, intake clienți, manual.
//
// Notă port: `knowledgeFromSiteScan` (site-scanner integration) deferred —
// se va adăuga când portăm site-scanner într-un sprint viitor.

import { nanoid } from "nanoid"

import type { ScanFinding } from "@/lib/compliance/types"

export type OrgKnowledgeCategory =
  | "data-categories"
  | "data-subjects"
  | "departments"
  | "processing-activities"
  | "processing-purposes"
  | "legal-bases"
  | "vendors"
  | "tools"
  | "recipients"
  | "international-transfers"
  | "hr-data"
  | "security-measures"
  | "retention-rules"
  | "cookies"
  | "forms"
  | "ai-usage"

export type OrgKnowledgeSource =
  | "onboarding"
  | "site-scan"
  | "vendor-review"
  | "privacy-policy-wizard"
  | "dsar"
  | "ai-systems"
  | "dpo-discovery-workshop"
  | "client-intake-link"
  | "ropa-data-map"
  | "orgProfile"
  | "manual"

export type OrgKnowledgeItem = {
  id: string
  category: OrgKnowledgeCategory
  value: string
  confirmedAtISO: string
  lastReviewedAtISO: string
  source: OrgKnowledgeSource
  sourceLabel: string   // e.g. "Site scan la 24 Mar 2026"
  confidence: "high" | "medium" | "low"
  stale?: boolean       // computed: lastReviewedAt > 6 luni
}

export type OrgKnowledge = {
  items: OrgKnowledgeItem[]
  lastUpdatedAtISO: string
}

export const KNOWLEDGE_CATEGORY_LABELS: Record<OrgKnowledgeCategory, string> = {
  "data-categories":           "Categorii de date",
  "data-subjects":             "Categorii de persoane vizate",
  "departments":               "Departamente / procese",
  "processing-activities":     "Activități de prelucrare",
  "processing-purposes":       "Scopuri de prelucrare",
  "legal-bases":               "Temeiuri juridice",
  "vendors":                   "Furnizori confirmate",
  "tools":                     "Tool-uri utilizate",
  "recipients":                "Destinatari / terți",
  "international-transfers":   "Transferuri internaționale",
  "hr-data":                   "Date HR",
  "security-measures":         "Măsuri tehnice și organizatorice",
  "retention-rules":           "Reguli de retenție",
  "cookies":                   "Cookie-uri / trackere",
  "forms":                     "Formulare de colectare",
  "ai-usage":                  "Utilizare AI",
}

// ── STALE check ───────────────────────────────────────────────────────────────

const STALE_MS = 6 * 30 * 24 * 3_600_000  // ~6 luni

export function isStale(item: OrgKnowledgeItem): boolean {
  return Date.now() - new Date(item.lastReviewedAtISO).getTime() > STALE_MS
}

export function withStaleFlags(items: OrgKnowledgeItem[]): OrgKnowledgeItem[] {
  return items.map((i) => ({ ...i, stale: isStale(i) }))
}

// ── FACTORY ───────────────────────────────────────────────────────────────────

export function makeKnowledgeItem(
  category: OrgKnowledgeCategory,
  value: string,
  source: OrgKnowledgeSource,
  sourceLabel: string,
  confidence: OrgKnowledgeItem["confidence"] = "medium",
): OrgKnowledgeItem {
  const now = new Date().toISOString()
  return {
    id: nanoid(8),
    category,
    value,
    confirmedAtISO: now,
    lastReviewedAtISO: now,
    source,
    sourceLabel,
    confidence,
    stale: false,
  }
}

// ── MERGE helper (upsert by category+value, dedup) ────────────────────────────

export function mergeKnowledgeItems(
  existing: OrgKnowledgeItem[],
  incoming: OrgKnowledgeItem[],
): OrgKnowledgeItem[] {
  const merged = [...existing]
  for (const item of incoming) {
    const idx = merged.findIndex(
      (e) => e.category === item.category && e.value.toLowerCase() === item.value.toLowerCase()
    )
    if (idx >= 0) {
      // Update source + lastReviewedAt on higher confidence
      const confidenceRank = { high: 3, medium: 2, low: 1 }
      if (confidenceRank[item.confidence] >= confidenceRank[merged[idx].confidence]) {
        merged[idx] = {
          ...merged[idx],
          lastReviewedAtISO: item.lastReviewedAtISO,
          source: item.source,
          sourceLabel: item.sourceLabel,
          confidence: item.confidence,
          stale: false,
        }
      }
    } else {
      merged.push(item)
    }
  }
  return merged
}

// ── READ helpers ──────────────────────────────────────────────────────────────

export function getKnowledgeByCategory(
  knowledge: OrgKnowledge | undefined,
  category: OrgKnowledgeCategory,
): OrgKnowledgeItem[] {
  if (!knowledge) return []
  return withStaleFlags(knowledge.items.filter((i) => i.category === category))
}

export function getKnowledgeValues(
  knowledge: OrgKnowledge | undefined,
  category: OrgKnowledgeCategory,
): string[] {
  return getKnowledgeByCategory(knowledge, category).map((i) => i.value)
}

export function hasStaleKnowledge(knowledge: OrgKnowledge | undefined): boolean {
  if (!knowledge) return false
  return knowledge.items.some(isStale)
}

// ── STALE finding ─────────────────────────────────────────────────────────────

export function buildOrgKnowledgeStaleFinding(
  knowledge: OrgKnowledge | undefined,
  nowISO: string,
): ScanFinding | null {
  if (!knowledge || knowledge.items.length === 0) return null
  const staleItems = knowledge.items.filter(isStale)
  if (staleItems.length === 0) return null

  return {
    id: "org-knowledge-stale",
    title: "Datele din profilul operațional nu au fost reconfirmate recent",
    detail: `${staleItems.length} ${staleItems.length === 1 ? "înregistrare" : "înregistrări"} din profilul firmei (${staleItems.slice(0, 3).map((i) => i.value).join(", ")}${staleItems.length > 3 ? " ș.a." : ""}) nu au fost revizuite de peste 6 luni. Datele pot fi inexacte sau depășite, ceea ce afectează corectitudinea documentelor generate.`,
    category: "GDPR",
    severity: "medium",
    risk: "low",
    principles: ["accountability", "privacy_data_governance"],
    createdAtISO: nowISO,
    sourceDocument: "Profil operațional (orgKnowledge)",
    legalReference: "GDPR Art. 5(1)(d) — principiul exactității",
    remediationHint: "Deschide Profil Operațional → revizuiește datele marcate și confirmă sau actualizează-le.",
    findingStatus: "open",
  }
}

// site-scanner integration deferred to future sprint (was: knowledgeFromSiteScan).
