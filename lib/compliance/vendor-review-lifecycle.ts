/**
 * Sprint 010 — Vendor Review Lifecycle.
 *
 * Donor v3-unified `vendor-review-lifecycle.ts` (99 LOC) lucra cu structura
 * `VendorReview` cu followUpDueISO + nextReviewDueISO. Aici adaptat la
 * `VendorRecord` shape — operam pe `nextRevalidationISO` si `reviewStatus`.
 *
 * Lifecycle:
 *  - Calcul revalidari (overdue + due-soon)
 *  - Grupare active follow-ups (needs_*)
 *  - Generare reminder note (RO) pentru cockpit + cron Sprint 022
 *  - Verificare daca un vendor specific e overdue
 *
 * Pure functions — fara I/O. Folosit de store (Sprint 010-7) si UI
 * (Sprint 010-9) pentru badge-uri urgenta + reminder cards.
 */

import type { VendorRecord, VendorReviewStatus } from "@/lib/compliance/types"

// ── Types ────────────────────────────────────────────────────────────────────

export type VendorLifecycleSummary = {
  /** Vendori cu nextRevalidationISO trecut. */
  overdueRevalidation: VendorRecord[]
  /** Vendori cu revalidation in <30 zile (default). */
  dueSoonRevalidation: VendorRecord[]
  /** Vendori activ in workflow (needs_*, in_review). */
  activeFollowUp: VendorRecord[]
  /** Vendori cu DPA care expira in <60 zile. */
  dpaExpiringSoon: VendorRecord[]
  /** Vendori cu DPA expirat (urgent). */
  dpaExpired: VendorRecord[]
  /** Nota RO consolidata pentru cockpit reminder. */
  reminderNote: string
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const ACTIVE_REVIEW_STATUSES: VendorReviewStatus[] = [
  "draft",
  "in_review",
  "needs_dpa",
  "needs_transfer_review",
  "needs_security_review",
]

function isValidISO(iso: string | undefined): boolean {
  if (!iso) return false
  return !Number.isNaN(Date.parse(iso))
}

function parseSafe(iso: string | undefined): number {
  if (!iso) return Number.NaN
  return Date.parse(iso)
}

function dedupeById<T extends { id: string }>(records: T[]): T[] {
  return Array.from(new Map(records.map((r) => [r.id, r])).values())
}

function formatVendorName(v: VendorRecord, withDate?: string): string {
  const date = withDate
    ? new Date(withDate).toLocaleDateString("ro-RO", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null
  return date ? `${v.name} (${date})` : v.name
}

// ── Main lifecycle summary builder ──────────────────────────────────────────

export function buildVendorLifecycleSummary(
  vendors: VendorRecord[],
  options?: { dueSoonDays?: number; dpaExpiringSoonDays?: number },
): VendorLifecycleSummary {
  const dueSoonDays = options?.dueSoonDays ?? 30
  const dpaExpiringDays = options?.dpaExpiringSoonDays ?? 60
  const now = Date.now()
  const dueSoonThreshold = now + dueSoonDays * 86_400_000
  const dpaExpiringThreshold = now + dpaExpiringDays * 86_400_000

  // 1. Revalidation overdue (nextRevalidationISO <= now)
  const overdueRevalidation = dedupeById(
    vendors.filter((v) => {
      if (!isValidISO(v.nextRevalidationISO)) return false
      const due = parseSafe(v.nextRevalidationISO)
      return due <= now
    }),
  )

  // 2. Revalidation due-soon (now < nextRevalidationISO <= now+dueSoonDays)
  const dueSoonRevalidation = dedupeById(
    vendors.filter((v) => {
      if (!isValidISO(v.nextRevalidationISO)) return false
      const due = parseSafe(v.nextRevalidationISO)
      return due > now && due <= dueSoonThreshold
    }),
  )

  // 3. Active follow-up (status in needs_*/in_review/draft)
  const activeFollowUp = vendors.filter((v) =>
    ACTIVE_REVIEW_STATUSES.includes(v.reviewStatus),
  )

  // 4. DPA expirat
  const dpaExpired = vendors.filter((v) => {
    if (v.dpaStatus === "expired") return true
    if (!isValidISO(v.dpaExpiresAtISO)) return false
    return parseSafe(v.dpaExpiresAtISO) <= now
  })

  // 5. DPA expira soon (>now, <now+dpaExpiringDays)
  const dpaExpiringSoon = vendors.filter((v) => {
    if (!isValidISO(v.dpaExpiresAtISO)) return false
    const exp = parseSafe(v.dpaExpiresAtISO)
    return exp > now && exp <= dpaExpiringThreshold
  })

  // 6. Reminder note RO
  const reminderParts: (string | null)[] = []

  if (dpaExpired.length > 0) {
    const names = dpaExpired.slice(0, 3).map((v) => formatVendorName(v))
    reminderParts.push(
      `${dpaExpired.length} vendori cu DPA expirat (urgent): ${names.join(", ")}.`,
    )
  }
  if (overdueRevalidation.length > 0) {
    const names = overdueRevalidation
      .slice(0, 3)
      .map((v) => formatVendorName(v))
    reminderParts.push(
      `${overdueRevalidation.length} vendori cu revalidare depasita: ${names.join(", ")}.`,
    )
  }
  if (dpaExpiringSoon.length > 0) {
    const names = dpaExpiringSoon
      .slice(0, 3)
      .map((v) => formatVendorName(v, v.dpaExpiresAtISO))
    reminderParts.push(
      `${dpaExpiringSoon.length} vendori cu DPA care expira in ${dpaExpiringDays} zile: ${names.join(", ")}.`,
    )
  }
  if (dueSoonRevalidation.length > 0) {
    const names = dueSoonRevalidation
      .slice(0, 3)
      .map((v) => formatVendorName(v, v.nextRevalidationISO))
    reminderParts.push(
      `${dueSoonRevalidation.length} revalidari in ${dueSoonDays} zile: ${names.join(", ")}.`,
    )
  }
  if (activeFollowUp.length > 0) {
    reminderParts.push(
      `${activeFollowUp.length} vendori activ in workflow (review/needs_*).`,
    )
  }
  if (reminderParts.length === 0) {
    reminderParts.push("Niciun vendor nu cere atentie imediata.")
  } else {
    reminderParts.push(
      "Prioritate: incepe cu DPA expirat → revalidari depasite → DPA care expira → workflow activ.",
    )
  }

  return {
    overdueRevalidation,
    dueSoonRevalidation,
    activeFollowUp,
    dpaExpiringSoon,
    dpaExpired,
    reminderNote: reminderParts.filter((s): s is string => Boolean(s)).join(" "),
  }
}

/**
 * Check if a single vendor is overdue for revalidation.
 */
export function isVendorOverdue(vendor: VendorRecord, nowISO?: string): boolean {
  if (!isValidISO(vendor.nextRevalidationISO)) return false
  const now = nowISO ? Date.parse(nowISO) : Date.now()
  return parseSafe(vendor.nextRevalidationISO) <= now
}

/**
 * Check if a single vendor's DPA is expired (or expiring at provided nowISO).
 */
export function isDPAExpired(vendor: VendorRecord, nowISO?: string): boolean {
  if (vendor.dpaStatus === "expired") return true
  if (!isValidISO(vendor.dpaExpiresAtISO)) return false
  const now = nowISO ? Date.parse(nowISO) : Date.now()
  return parseSafe(vendor.dpaExpiresAtISO) <= now
}

/**
 * Returns true daca vendor-ul are status activ in workflow (NU closed/approved).
 */
export function isActiveReview(vendor: VendorRecord): boolean {
  return ACTIVE_REVIEW_STATUSES.includes(vendor.reviewStatus)
}
