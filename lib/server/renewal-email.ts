// Sprint 014 — Monthly digest email (compliance posture summary).
//
// Generat fie ad-hoc din POST /api/emails/send-monthly-digest (admin),
// fie schedulat de un cron job (deferred — Sprint 022). Compută statistics
// din state-ul curent via Trust Center builder + finding store.

import { sendEmail, type SendEmailResult } from "./email-templates"
import type { AIActState } from "./store"

const PUBLIC_BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL?.trim() ||
  process.env.NEXTAUTH_URL?.trim() ||
  "https://app.compliroai.ro"

const MONTHS_RO = [
  "Ianuarie",
  "Februarie",
  "Martie",
  "Aprilie",
  "Mai",
  "Iunie",
  "Iulie",
  "August",
  "Septembrie",
  "Octombrie",
  "Noiembrie",
  "Decembrie",
]

export type MonthlyDigestInput = {
  toEmail: string
  state: AIActState
  /** Override luna afișată (default: luna trecută). */
  monthOverride?: string
}

function computeDigestStats(state: AIActState): {
  compliancePct: number
  openFindingsCount: number
  actionsCompletedCount: number
  upcomingDeadlinesCount: number
} {
  const findings = state.findings ?? []
  const isOpen = (f: { findingStatus?: string }) =>
    f.findingStatus !== "resolved" && f.findingStatus !== "dismissed"
  const openFindingsCount = findings.filter(isOpen).length

  // Compliance % heuristic: 100 - (open critical * 10 + open high * 5 + open med * 2)
  const critical = findings.filter((f) => f.severity === "critical" && isOpen(f)).length
  const high = findings.filter((f) => f.severity === "high" && isOpen(f)).length
  const med = findings.filter((f) => f.severity === "medium" && isOpen(f)).length
  const compliancePct = Math.max(
    0,
    Math.min(100, 100 - (critical * 10 + high * 5 + med * 2))
  )

  // Actions completed last month — best effort from events history
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).getTime()
  const events = state.events ?? []
  const actionsCompletedCount = events.filter((e) => {
    const ts = new Date(e.createdAtISO).getTime()
    return (
      ts >= thirtyDaysAgo &&
      (e.type.endsWith(".resolved") ||
        e.type.endsWith(".completed") ||
        e.type.endsWith(".approved") ||
        e.type.endsWith(".closed"))
    )
  }).length

  // Upcoming deadlines: DSAR + DPIA review-due + Vendor DPA expiry + breach 72h
  const thirtyDaysFromNow = Date.now() + 30 * 24 * 60 * 60 * 1000
  const dsarSoon = (state.dsarRequests ?? []).filter((r) => {
    if (!r.deadlineISO) return false
    const t = new Date(r.deadlineISO).getTime()
    return t > Date.now() && t < thirtyDaysFromNow
  }).length
  const breachSoon = (state.breachRecords ?? []).filter((b) => {
    if (b.status === "closed") return false
    const t = new Date(b.discoveredAtISO).getTime() + 72 * 60 * 60 * 1000
    return t > Date.now() && t < thirtyDaysFromNow
  }).length
  const upcomingDeadlinesCount = dsarSoon + breachSoon

  return {
    compliancePct,
    openFindingsCount,
    actionsCompletedCount,
    upcomingDeadlinesCount,
  }
}

export async function sendMonthlyDigestEmail(
  input: MonthlyDigestInput
): Promise<SendEmailResult> {
  const stats = computeDigestStats(input.state)
  const now = new Date()
  // Show "luna trecută" (previous month) ca etichetă
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const monthLabel =
    input.monthOverride ?? `${MONTHS_RO[prev.getMonth()]} ${prev.getFullYear()}`

  return sendEmail("monthly-digest", input.toEmail, {
    monthLabel,
    compliancePct: String(stats.compliancePct),
    openFindingsCount: String(stats.openFindingsCount),
    actionsCompletedCount: String(stats.actionsCompletedCount),
    upcomingDeadlinesCount: String(stats.upcomingDeadlinesCount),
    dashboardUrl: `${PUBLIC_BASE_URL}/dashboard`,
  })
}

// Exportăm și computeDigestStats pentru reuse/testabilitate.
export { computeDigestStats }
