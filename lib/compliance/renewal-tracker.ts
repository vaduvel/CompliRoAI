/**
 * Sprint 022 — Renewal Tracker (pure function).
 *
 * Extrage TOATE itemii renewable din `ComplianceState` într-o listă plată.
 * Folosit de:
 *   - /api/calendar (extensiv — calendar-aggregator deja procesează modulele
 *     dar renewal-tracker e un API curat doar pe „ce expiră")
 *   - renewal-email-dispatcher input (programare email-uri 30/15/5/1 zile)
 *   - /dashboard/setari/preventive — lista „upcoming reminders"
 *
 * NU emite acțiuni / findings — doar mapează `next renewal` per entitate.
 */

import type {
  ComplianceState,
  PreventiveEntityType,
} from "./types"

export type RenewableItem = {
  entityType: PreventiveEntityType
  entityId: string
  entityLabel: string
  /** Tipul de renewal (DPA / review / retention / acknowledgment). */
  renewalType: string
  nextRenewalISO: string
  daysUntil: number
}

const DAY_MS = 86_400_000

function daysBetween(fromISO: string, toISO: string): number {
  return Math.round((new Date(toISO).getTime() - new Date(fromISO).getTime()) / DAY_MS)
}

/**
 * Returns all renewable items in flat list, sorted by daysUntil ascending
 * (cele mai urgente primele).
 */
export function extractAllRenewals(
  state: ComplianceState,
  nowISO: string,
): RenewableItem[] {
  const items: RenewableItem[] = []

  // FRIA — approval + 365d
  for (const f of state.friaRecords ?? []) {
    const ref = f.approvedAtISO ?? f.reviewedAtISO ?? f.updatedAtISO
    const next = new Date(new Date(ref).getTime() + 365 * DAY_MS).toISOString()
    items.push({
      entityType: "fria",
      entityId: f.id,
      entityLabel: f.title,
      renewalType: "review_annual",
      nextRenewalISO: next,
      daysUntil: daysBetween(nowISO, next),
    })
  }

  // DPIA — dueAtISO sau (reviewedAt/approvedAt + 365)
  for (const d of state.dpiaRecords ?? []) {
    const ref =
      d.dueAtISO ??
      (() => {
        const r = d.reviewedAtISO ?? d.approvedAtISO ?? d.updatedAtISO
        return new Date(new Date(r).getTime() + 365 * DAY_MS).toISOString()
      })()
    items.push({
      entityType: "dpia",
      entityId: d.id,
      entityLabel: d.title,
      renewalType: "review_annual",
      nextRenewalISO: ref,
      daysUntil: daysBetween(nowISO, ref),
    })
  }

  // Oversight — nextReviewISO sau updatedAt + 180z
  for (const o of state.humanOversightProtocols ?? []) {
    const next =
      o.nextReviewISO ??
      new Date(new Date(o.updatedAtISO).getTime() + 180 * DAY_MS).toISOString()
    items.push({
      entityType: "oversight",
      entityId: o.id,
      entityLabel: o.title,
      renewalType: "review_semestrial",
      nextRenewalISO: next,
      daysUntil: daysBetween(nowISO, next),
    })
  }

  // Logging — nextReviewISO (default 90z)
  for (const l of state.loggingEvidence ?? []) {
    const next =
      l.nextReviewISO ??
      new Date(new Date(l.updatedAtISO).getTime() + 90 * DAY_MS).toISOString()
    items.push({
      entityType: "logging",
      entityId: l.id,
      entityLabel: l.title,
      renewalType: "logging_retention_review",
      nextRenewalISO: next,
      daysUntil: daysBetween(nowISO, next),
    })
  }

  // PMM — nextReviewISO (default reviewCycleMonths)
  for (const p of state.pmmPlans ?? []) {
    const next =
      p.nextReviewISO ??
      new Date(
        new Date(p.updatedAtISO).getTime() + p.reviewCycleMonths * 30 * DAY_MS,
      ).toISOString()
    items.push({
      entityType: "pmm",
      entityId: p.id,
      entityLabel: p.title,
      renewalType: "pmm_review",
      nextRenewalISO: next,
      daysUntil: daysBetween(nowISO, next),
    })
  }

  // Vendor — DPA + revalidation
  for (const v of state.vendorRecords ?? []) {
    if (v.dpaExpiresAtISO) {
      items.push({
        entityType: "vendor",
        entityId: v.id,
        entityLabel: `${v.name} — DPA expiry`,
        renewalType: "dpa_expiry",
        nextRenewalISO: v.dpaExpiresAtISO,
        daysUntil: daysBetween(nowISO, v.dpaExpiresAtISO),
      })
    }
    if (v.nextRevalidationISO) {
      items.push({
        entityType: "vendor",
        entityId: v.id,
        entityLabel: `${v.name} — revalidation`,
        renewalType: "vendor_revalidation",
        nextRenewalISO: v.nextRevalidationISO,
        daysUntil: daysBetween(nowISO, v.nextRevalidationISO),
      })
    }
  }

  // QMS — nextReviewISO sau approvedAt + 365z
  const qms = state.qmsWorkspace
  if (qms?.approvedAtISO) {
    const next =
      qms.nextReviewISO ??
      new Date(new Date(qms.approvedAtISO).getTime() + 365 * DAY_MS).toISOString()
    items.push({
      entityType: "qms",
      entityId: qms.id,
      entityLabel: `QMS — ${qms.versionLabel}`,
      renewalType: "qms_annual_review",
      nextRenewalISO: next,
      daysUntil: daysBetween(nowISO, next),
    })
  }

  // DSAR — deadline (still open)
  for (const d of state.dsarRequests ?? []) {
    if (d.status === "responded" || d.status === "refused") continue
    const next = d.extendedDeadlineISO ?? d.deadlineISO
    items.push({
      entityType: "dsar",
      entityId: d.id,
      entityLabel: `DSAR ${d.requestType} — ${d.requesterName}`,
      renewalType: "dsar_response",
      nextRenewalISO: next,
      daysUntil: daysBetween(nowISO, next),
    })
  }

  // Breach — deadline 72h
  for (const b of state.breachRecords ?? []) {
    if (
      b.status === "closed" ||
      b.status === "anspdcp_notified" ||
      b.status === "subjects_notified" ||
      b.status === "no_notification_required"
    )
      continue
    items.push({
      entityType: "breach",
      entityId: b.id,
      entityLabel: b.title,
      renewalType: "breach_72h",
      nextRenewalISO: b.deadlineISO,
      daysUntil: daysBetween(nowISO, b.deadlineISO),
    })
  }

  // AI Incidents — reportingDeadlineISO
  for (const i of state.aiIncidents ?? []) {
    if (i.status === "closed" || i.status === "not_reportable") continue
    items.push({
      entityType: "ai_incident",
      entityId: i.id,
      entityLabel: i.title,
      renewalType: "ai_incident_reporting",
      nextRenewalISO: i.reportingDeadlineISO,
      daysUntil: daysBetween(nowISO, i.reportingDeadlineISO),
    })
  }

  // Approvals — expiresAtISO (pending only)
  for (const a of state.approvalRequests ?? []) {
    if (a.status !== "pending" || !a.expiresAtISO) continue
    items.push({
      entityType: "approval",
      entityId: a.id,
      entityLabel: a.title,
      renewalType: "approval_expiry",
      nextRenewalISO: a.expiresAtISO,
      daysUntil: daysBetween(nowISO, a.expiresAtISO),
    })
  }

  // Sort ascending by daysUntil (cele mai urgente primele)
  items.sort((a, b) => a.daysUntil - b.daysUntil)
  return items
}

/**
 * Returns items care expiră în următoarele N zile (inclusiv overdue).
 */
export function getUpcomingRenewals(
  state: ComplianceState,
  nowISO: string,
  withinDays: number = 30,
): RenewableItem[] {
  return extractAllRenewals(state, nowISO).filter(
    (i) => i.daysUntil <= withinDays,
  )
}

/**
 * Returns reminders pentru un singur entity at standard intervals 30/15/5/1d.
 */
export function getReminderSchedule(
  item: RenewableItem,
  nowISO: string,
): Array<{ scheduledForISO: string; daysBefore: number }> {
  const INTERVALS = [30, 15, 5, 1]
  const dueTime = new Date(item.nextRenewalISO).getTime()
  const nowTime = new Date(nowISO).getTime()
  const out: Array<{ scheduledForISO: string; daysBefore: number }> = []
  for (const interval of INTERVALS) {
    const scheduledTime = dueTime - interval * DAY_MS
    if (scheduledTime < nowTime) continue
    out.push({
      scheduledForISO: new Date(scheduledTime).toISOString(),
      daysBefore: interval,
    })
  }
  return out
}
