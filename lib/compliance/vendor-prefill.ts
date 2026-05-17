/**
 * Sprint 010 — Vendor prefill from library catalog.
 *
 * Donor `v3-unified/lib/compliance/vendor-prefill.ts` (310 LOC) era tied de
 * ANAF CUI lookup + e-Factura supplier import + Nis2Vendor draft. Per
 * mandate Rule 3, CompliRoAI NU integreaza fiscal/ANAF/e-Factura (sunt
 * forbidden frameworks). Rebuild aici pe directia LIBRARY catalog —
 * user introduce nume vendor → searchVendorLibrary → match → prefill.
 *
 * Bonus: linkage to AI Inventory + AI Data Map records pentru a popula
 * automat linkedAISystemIds + linkedAIDataMapIds atunci cand un AI system
 * deja foloseste vendor-ul (ex. user a adaugat ChatGPT in inventory si
 * adaug acum OpenAI ca vendor).
 *
 * Pure functions — fara I/O. Folosit de API /api/vendor-review/library
 * (Sprint 010-8) + /dashboard/vendor-review modal (Sprint 010-9).
 */

import {
  buildVendorDraftFromLibrary,
  findVendorInLibrary,
  searchVendorLibrary,
  type VendorLibraryEntry,
} from "@/lib/compliance/vendor-library"
import type {
  AIDataMapRecord,
  AISystemRecord,
  VendorRecord,
} from "@/lib/compliance/types"

// ── Types ────────────────────────────────────────────────────────────────────

export type VendorPrefillSource = "library" | "ai-inventory" | "ai-data-map" | "manual"

export type VendorPrefillSuggestion<T> = {
  value: T
  source: VendorPrefillSource
  confidence: "high" | "medium" | "low"
}

export type VendorPrefillContext = {
  /** Vendor search query (name, alias, product). */
  query: string
  /** AI systems din inventory pentru linkage automat. */
  aiSystems?: AISystemRecord[]
  /** AI data map records pentru linkage automat. */
  aiDataMapRecords?: AIDataMapRecord[]
}

export type VendorPrefillResult = {
  /** Library entry matched (null daca query nu matcheaza nimic). */
  libraryEntry: VendorLibraryEntry | null
  /** Draft VendorRecord prepopulat — caller-ul ataseaza id/orgId/timestamps. */
  draft: Omit<VendorRecord, "id" | "orgId" | "createdAtISO" | "updatedAtISO"> | null
  /** Linkage automata catre AI systems care folosesc deja acest vendor. */
  linkedAISystems: VendorPrefillSuggestion<string[]>
  /** Linkage automata catre AI Data Map records. */
  linkedAIDataMaps: VendorPrefillSuggestion<string[]>
  /** Suggestii alternative din library (top-5 fuzzy match). */
  alternativeMatches: VendorLibraryEntry[]
  /** Notite pentru UI (de ex. "S-au gasit 3 AI systems linked"). */
  notes: string[]
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function vendorAliasesMatch(vendorName: string, entry: VendorLibraryEntry): boolean {
  const n = vendorName.trim().toLowerCase()
  if (!n) return false
  if (n === entry.id || n === entry.canonicalName.toLowerCase()) return true
  if (entry.aliases.includes(n)) return true
  if (entry.canonicalName.toLowerCase().includes(n)) return true
  for (const alias of entry.aliases) {
    if (n.includes(alias) || alias.includes(n)) return true
  }
  return false
}

function findLinkedAISystems(
  entry: VendorLibraryEntry | null,
  aiSystems?: AISystemRecord[],
): string[] {
  if (!entry || !aiSystems || aiSystems.length === 0) return []
  return aiSystems
    .filter((s) => vendorAliasesMatch(s.vendor, entry))
    .map((s) => s.id)
}

function findLinkedAIDataMaps(
  entry: VendorLibraryEntry | null,
  query: string,
  aiDataMapRecords?: AIDataMapRecord[],
): string[] {
  if (!aiDataMapRecords || aiDataMapRecords.length === 0) return []
  const searchTerms: string[] = []
  if (entry) {
    searchTerms.push(entry.canonicalName.toLowerCase(), entry.id, ...entry.aliases)
  }
  const q = query.trim().toLowerCase()
  if (q) searchTerms.push(q)

  return aiDataMapRecords
    .filter((rec) => {
      const vendor = rec.vendor.toLowerCase()
      const tool = rec.toolName.toLowerCase()
      return searchTerms.some(
        (term) => term && (vendor.includes(term) || tool.includes(term)),
      )
    })
    .map((rec) => rec.id)
}

// ── Main prefill function ────────────────────────────────────────────────────

/**
 * Prefill draft pentru un vendor nou pe baza unei query (nume/alias) +
 * context. Returns draft complet + alternative + linkage automata.
 */
export function prefillVendorFromLibrary(
  context: VendorPrefillContext,
): VendorPrefillResult {
  const query = context.query.trim()
  const notes: string[] = []

  // 1) Try exact match
  const libraryEntry = findVendorInLibrary(query)

  // 2) Pregateste alternative (fuzzy top-5) — nu include match exact dublu
  const alternativeMatches = searchVendorLibrary(query, 5).filter(
    (e) => e.id !== libraryEntry?.id,
  )

  // 3) Build draft
  const draft = libraryEntry ? buildVendorDraftFromLibrary(libraryEntry) : null

  // 4) Linkage AI systems + AI Data Map
  const linkedAISystemsIds = findLinkedAISystems(libraryEntry, context.aiSystems)
  const linkedAIDataMapIds = findLinkedAIDataMaps(
    libraryEntry,
    query,
    context.aiDataMapRecords,
  )

  // Apply linkage in draft daca exista match
  if (draft) {
    if (linkedAISystemsIds.length > 0) {
      draft.linkedAISystemIds = linkedAISystemsIds
      notes.push(`Linked automat ${linkedAISystemsIds.length} AI system(s) din inventory`)
    }
    if (linkedAIDataMapIds.length > 0) {
      draft.linkedAIDataMapIds = linkedAIDataMapIds
      notes.push(`Linked automat ${linkedAIDataMapIds.length} AI data map record(s)`)
    }
  }

  if (libraryEntry) {
    notes.unshift(
      `Match library: ${libraryEntry.canonicalName} (${libraryEntry.serviceCategory}, ${libraryEntry.vendorRegion})`,
    )
  } else if (query.length > 0) {
    notes.push(
      `Niciun match exact pentru "${query}". Verifica alternativele sau completeaza manual.`,
    )
  }

  return {
    libraryEntry,
    draft,
    linkedAISystems: {
      value: linkedAISystemsIds,
      source: "ai-inventory",
      confidence: linkedAISystemsIds.length > 0 ? "medium" : "low",
    },
    linkedAIDataMaps: {
      value: linkedAIDataMapIds,
      source: "ai-data-map",
      confidence: linkedAIDataMapIds.length > 0 ? "medium" : "low",
    },
    alternativeMatches,
    notes,
  }
}

/**
 * Pentru UI autocomplete — returneaza suggestii cu metadata UI-friendly.
 */
export function suggestVendorsFromQuery(query: string, limit = 8): {
  id: string
  label: string
  region: string
  category: string
  note: string
}[] {
  return searchVendorLibrary(query, limit).map((e) => ({
    id: e.id,
    label: e.canonicalName,
    region: e.vendorRegion,
    category: e.serviceCategory,
    note:
      e.productCatalog.length > 0
        ? `${e.productCatalog[0]} · ${e.complianceNote.slice(0, 80)}${e.complianceNote.length > 80 ? "…" : ""}`
        : e.complianceNote.slice(0, 80),
  }))
}
