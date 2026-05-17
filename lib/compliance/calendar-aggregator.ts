/**
 * Sprint 013 — Calendar Aggregator
 *
 * Pure function: ComplianceState → CalendarEvent[].
 *
 * Surse de deadline-uri:
 *   - DSAR: deadlineISO (30 zile) + extendedDeadlineISO (extensie 60 zile)
 *   - DPIA: dueAtISO (review programat) + lastReviewedAtISO + 90 zile revalidare
 *   - RoPA: lastReviewedAtISO + 365 zile revalidare
 *   - Breach: deadlineISO (72h ANSPDCP) + reminder lunar breach review
 *   - Vendor: nextRevalidationISO + dpaExpiresAtISO
 *   - AI Act fixed dates: Art. 50 transparency, Art. 5 prohibited, Annex III high-risk
 *   - Approval requests: expiresAtISO (când e setat)
 *   - Trust Center tokens: expiresAtISO (când e setat)
 *
 * Strictly NU include:
 *   - fiscal (e-Factura, ANAF, SPV, D406) — per mandate Rule 3
 *   - pay transparency / whistleblowing
 *
 * Output sortat newest→oldest pe dateISO (deadline-uri viitoare apar primele
 * pentru utilizator după filter `upcoming`).
 */

import type {
  ApprovalRequest,
  BreachRecord,
  CalendarEvent,
  CalendarEventModule,
  CalendarEventSeverity,
  CalendarEventStatus,
  ComplianceState,
  DpiaRecord,
  DsarRequest,
  RopaActivityRecord,
  TrustCenterToken,
  VendorRecord,
} from "@/lib/compliance/types"

// ────────────────────────────────────────────────────────────────────────────
//   AI Act regulatory fixed dates
//   Sursa: Regulament (UE) 2024/1689 + Omnibus mai 2026 (Art. 50 amânat).
//   Lista e finită, hardcodată — reflectă datele oficiale aplicabile RO.
// ────────────────────────────────────────────────────────────────────────────

export type AIActFixedDate = {
  id: string
  title: string
  description: string
  dateISO: string
  severity: CalendarEventSeverity
  /** Marker dacă deadline-ul s-a închis deja (informativ în calendar). */
  archived?: boolean
}

export const AI_ACT_FIXED_DATES: AIActFixedDate[] = [
  {
    id: "ai-act-art-5-prohibited",
    title: "Art. 5 — Practici interzise în vigoare",
    description:
      "Sistemele AI cu manipulare cognitivă, scoring social, biometric real-time în spații publice (cu excepții stricte) trebuie eliminate. Aplicabil din 2 februarie 2025.",
    dateISO: "2025-02-02T00:00:00.000Z",
    severity: "critical",
    archived: true,
  },
  {
    id: "ai-act-art-4-literacy",
    title: "Art. 4 — Obligație AI Literacy",
    description:
      "Orice operator AI (provider/deployer) trebuie să asigure un nivel suficient de cunoștințe AI pentru personalul implicat. Aplicabil din 2 februarie 2025.",
    dateISO: "2025-02-02T00:00:00.000Z",
    severity: "warning",
    archived: true,
  },
  {
    id: "ai-act-gp-models",
    title: "Cap. V — Modele AI scop general (GPAI)",
    description:
      "Obligații pentru furnizorii de modele AI cu scop general (GPAI), inclusiv evaluări, riscuri sistemice, documentație tehnică. Aplicabil din 2 august 2025.",
    dateISO: "2025-08-02T00:00:00.000Z",
    severity: "warning",
    archived: true,
  },
  {
    id: "ai-act-art-50-transparency",
    title: "Art. 50 — Notificări de transparență",
    description:
      "Sistemele AI care interacționează cu persoane (chatbot, generare conținut sintetic, deepfake, recunoaștere emoții) trebuie să afișeze notificări clare. Deadline aplicabilitate: 2 decembrie 2026 (Omnibus mai 2026).",
    dateISO: "2026-12-02T00:00:00.000Z",
    severity: "urgent",
  },
  {
    id: "ai-act-high-risk-annex-iii",
    title: "Anexa III — Sisteme AI high-risk",
    description:
      "Sistemele AI high-risk (HR, scoring credit, biometrie, infrastructură critică, educație, justiție etc.) trebuie să respecte Cap. III: registru EU, conformity assessment, FRIA, oversight, logging, PMM. Aplicabil din 2 august 2027.",
    dateISO: "2027-08-02T00:00:00.000Z",
    severity: "critical",
  },
  {
    id: "ai-act-annex-i-products",
    title: "Anexa I — Produse care încorporează AI",
    description:
      "Produse acoperite de Anexa I (mașini, dispozitive medicale, jucării etc.) cu componentă AI: conformity assessment integrat. Aplicabil din 2 august 2027.",
    dateISO: "2027-08-02T00:00:00.000Z",
    severity: "warning",
  },
]

// ────────────────────────────────────────────────────────────────────────────
//   Severity + status derivation
// ────────────────────────────────────────────────────────────────────────────

const DAY_MS = 24 * 60 * 60 * 1000

function clampSeverityForDays(daysFromNow: number, baseline: CalendarEventSeverity): CalendarEventSeverity {
  if (daysFromNow < 0) return "critical"
  if (daysFromNow < 1) return "critical"
  if (daysFromNow < 5) return "urgent"
  if (daysFromNow < 14) {
    if (baseline === "critical") return "critical"
    if (baseline === "urgent") return "urgent"
    return "warning"
  }
  return baseline
}

function deriveStatus(dateISO: string, nowMs: number, completed = false): CalendarEventStatus {
  if (completed) return "completed"
  const ts = Date.parse(dateISO)
  if (Number.isNaN(ts)) return "upcoming"
  const diffMs = ts - nowMs
  if (diffMs < -DAY_MS) return "overdue"
  if (diffMs < DAY_MS) return "due_today"
  return "upcoming"
}

function plusDays(iso: string, days: number): string {
  return new Date(Date.parse(iso) + days * DAY_MS).toISOString()
}

// ────────────────────────────────────────────────────────────────────────────
//   Per-module aggregators (each returns an array)
// ────────────────────────────────────────────────────────────────────────────

function dsarEvents(requests: DsarRequest[], nowMs: number): CalendarEvent[] {
  const out: CalendarEvent[] = []
  for (const r of requests) {
    if (!r.deadlineISO) continue
    const completed = r.status === "responded" || r.status === "refused"
    const effectiveDeadline = r.extendedDeadlineISO ?? r.deadlineISO
    const daysFromNow = (Date.parse(effectiveDeadline) - nowMs) / DAY_MS
    const sev = clampSeverityForDays(daysFromNow, "warning")
    out.push({
      id: `dsar-${r.id}-deadline`,
      module: "dsar",
      entityId: r.id,
      entityLinkHref: "/dashboard/dsar",
      title: `DSAR ${labelDsarType(r.requestType)} — răspuns obligatoriu`,
      description: `Cerere de la ${r.requesterName} (${r.requesterEmail}). Deadline legal GDPR Art. 12: ${daysFormat(
        daysFromNow,
      )}.`,
      dateISO: effectiveDeadline,
      allDay: true,
      severity: completed ? "info" : sev,
      status: deriveStatus(effectiveDeadline, nowMs, completed),
    })
  }
  return out
}

function labelDsarType(t: DsarRequest["requestType"]): string {
  switch (t) {
    case "access":
      return "acces (Art. 15)"
    case "rectification":
      return "rectificare (Art. 16)"
    case "erasure":
      return "ștergere (Art. 17)"
    case "portability":
      return "portabilitate (Art. 20)"
    case "objection":
      return "opoziție (Art. 21)"
    case "restriction":
      return "restricționare (Art. 18)"
    default:
      return t
  }
}

function dpiaEvents(records: DpiaRecord[], nowMs: number): CalendarEvent[] {
  const out: CalendarEvent[] = []
  for (const d of records) {
    const completed = d.status === "completed" || d.status === "archived"
    // 1) due deadline explicit
    if (d.dueAtISO) {
      const days = (Date.parse(d.dueAtISO) - nowMs) / DAY_MS
      out.push({
        id: `dpia-${d.id}-due`,
        module: "dpia",
        entityId: d.id,
        entityLinkHref: "/dashboard/dpia",
        title: `DPIA: ${d.title} — finalizare`,
        description: `Status curent: ${d.status}. Termen pentru finalizare evaluare.`,
        dateISO: d.dueAtISO,
        allDay: true,
        severity: completed ? "info" : clampSeverityForDays(days, "warning"),
        status: deriveStatus(d.dueAtISO, nowMs, completed),
      })
    }
    // 2) revalidation reminder 90 zile după last review (sau după approval)
    const referenceISO = d.reviewedAtISO ?? d.approvedAtISO ?? null
    if (referenceISO && completed) {
      const nextISO = plusDays(referenceISO, 90)
      const days = (Date.parse(nextISO) - nowMs) / DAY_MS
      out.push({
        id: `dpia-${d.id}-revalidate`,
        module: "dpia",
        entityId: d.id,
        entityLinkHref: "/dashboard/dpia",
        title: `DPIA: ${d.title} — reverificare 90z`,
        description: "Revalidare programată automat la 90 zile după ultima revizuire.",
        dateISO: nextISO,
        allDay: true,
        severity: clampSeverityForDays(days, "info"),
        status: deriveStatus(nextISO, nowMs),
        recurring: { interval: "quarterly" },
      })
    }
  }
  return out
}

function ropaEvents(records: RopaActivityRecord[], nowMs: number): CalendarEvent[] {
  const out: CalendarEvent[] = []
  for (const r of records) {
    const referenceISO = r.lastReviewedAtISO ?? r.updatedAtISO ?? r.createdAtISO
    if (!referenceISO) continue
    const nextISO = plusDays(referenceISO, 365)
    const days = (Date.parse(nextISO) - nowMs) / DAY_MS
    out.push({
      id: `ropa-${r.id}-revalidate`,
      module: "ropa",
      entityId: r.id,
      entityLinkHref: "/dashboard/ropa",
      title: `RoPA: ${r.activityName} — revalidare anuală`,
      description: `Procesare ${r.purpose ? `«${r.purpose.slice(0, 60)}»` : ""}. GDPR Art. 30 — verificare anuală obligatorie.`,
      dateISO: nextISO,
      allDay: true,
      severity: clampSeverityForDays(days, "warning"),
      status: deriveStatus(nextISO, nowMs),
      recurring: { interval: "yearly" },
    })
  }
  return out
}

function breachEvents(records: BreachRecord[], nowMs: number): CalendarEvent[] {
  const out: CalendarEvent[] = []
  for (const b of records) {
    const closed =
      b.status === "closed" ||
      b.status === "anspdcp_notified" ||
      b.status === "subjects_notified" ||
      b.status === "no_notification_required"
    if (!b.deadlineISO) continue
    const days = (Date.parse(b.deadlineISO) - nowMs) / DAY_MS
    out.push({
      id: `breach-${b.id}-72h`,
      module: "breach",
      entityId: b.id,
      entityLinkHref: "/dashboard/breach",
      title: `Incident date personale — termen ANSPDCP 72h`,
      description: `${b.title}. ${closed ? "Procedură finalizată." : "GDPR Art. 33 — notificare ANSPDCP."}`,
      dateISO: b.deadlineISO,
      allDay: false,
      severity: closed ? "info" : clampSeverityForDays(days, "critical"),
      status: deriveStatus(b.deadlineISO, nowMs, closed),
    })
  }
  return out
}

function vendorEvents(records: VendorRecord[], nowMs: number): CalendarEvent[] {
  const out: CalendarEvent[] = []
  for (const v of records) {
    if (v.nextRevalidationISO) {
      const days = (Date.parse(v.nextRevalidationISO) - nowMs) / DAY_MS
      out.push({
        id: `vendor-${v.id}-revalidate`,
        module: "vendor",
        entityId: v.id,
        entityLinkHref: "/dashboard/vendor-review",
        title: `Vendor: ${v.name} — revalidare`,
        description: `Re-evaluare vendor ${v.serviceCategory ?? "AI"} (DPA + securitate + transferuri).`,
        dateISO: v.nextRevalidationISO,
        allDay: true,
        severity: clampSeverityForDays(days, "warning"),
        status: deriveStatus(v.nextRevalidationISO, nowMs),
        recurring: { interval: "yearly" },
      })
    }
    if (v.dpaExpiresAtISO) {
      const days = (Date.parse(v.dpaExpiresAtISO) - nowMs) / DAY_MS
      out.push({
        id: `vendor-${v.id}-dpa-expire`,
        module: "vendor",
        entityId: v.id,
        entityLinkHref: "/dashboard/vendor-review",
        title: `Vendor: ${v.name} — expirare DPA`,
        description: `Acordul DPA expiră — necesită renegociere/extindere.`,
        dateISO: v.dpaExpiresAtISO,
        allDay: true,
        severity: clampSeverityForDays(days, "warning"),
        status: deriveStatus(v.dpaExpiresAtISO, nowMs),
      })
    }
  }
  return out
}

function aiActRegulatoryEvents(nowMs: number): CalendarEvent[] {
  const out: CalendarEvent[] = []
  for (const d of AI_ACT_FIXED_DATES) {
    out.push({
      id: `ai-act-${d.id}`,
      module: "ai_act_regulatory",
      title: d.title,
      description: d.description,
      dateISO: d.dateISO,
      allDay: true,
      severity: d.archived ? "info" : d.severity,
      status: d.archived ? "completed" : deriveStatus(d.dateISO, nowMs),
    })
  }
  return out
}

function approvalEvents(requests: ApprovalRequest[], nowMs: number): CalendarEvent[] {
  const out: CalendarEvent[] = []
  for (const r of requests) {
    if (!r.expiresAtISO) continue
    if (r.status !== "pending") continue
    const days = (Date.parse(r.expiresAtISO) - nowMs) / DAY_MS
    out.push({
      id: `approval-${r.id}-expires`,
      module: "approval",
      entityId: r.id,
      entityLinkHref: "/dashboard/approvals",
      title: `Aprobare expiră: ${r.title}`,
      description: `Cerere ${r.entityType} de la ${r.requestedByEmail}.`,
      dateISO: r.expiresAtISO,
      allDay: true,
      severity: clampSeverityForDays(days, "warning"),
      status: deriveStatus(r.expiresAtISO, nowMs),
    })
  }
  return out
}

function trustCenterEvents(tokens: TrustCenterToken[], nowMs: number): CalendarEvent[] {
  const out: CalendarEvent[] = []
  for (const t of tokens) {
    if (!t.expiresAtISO) continue
    if (t.revokedAtISO) continue
    const days = (Date.parse(t.expiresAtISO) - nowMs) / DAY_MS
    out.push({
      id: `trust-${t.id}-expires`,
      module: "trust_center",
      entityId: t.id,
      entityLinkHref: "/dashboard/trust-center",
      title: `Trust Center: ${t.label} — expiră`,
      description: "Link-ul public va deveni invalid după această dată.",
      dateISO: t.expiresAtISO,
      allDay: true,
      severity: clampSeverityForDays(days, "info"),
      status: deriveStatus(t.expiresAtISO, nowMs),
    })
  }
  return out
}

function daysFormat(days: number): string {
  if (days < 0) return `întârziere ${Math.abs(Math.floor(days))} zile`
  if (days < 1) return "astăzi"
  if (days < 2) return "mâine"
  return `în ${Math.floor(days)} zile`
}

// ────────────────────────────────────────────────────────────────────────────
//   Public API
// ────────────────────────────────────────────────────────────────────────────

export type AggregateCalendarOptions = {
  fromISO?: string
  toISO?: string
  modules?: CalendarEventModule[]
  /** Pentru testare: clock fix. */
  nowISO?: string
}

export function aggregateCalendarEvents(
  state: Pick<
    ComplianceState,
    | "dsarRequests"
    | "dpiaRecords"
    | "ropaActivities"
    | "breachRecords"
    | "vendorRecords"
    | "approvalRequests"
    | "trustCenterTokens"
  >,
  options: AggregateCalendarOptions = {},
): CalendarEvent[] {
  const nowMs = options.nowISO ? Date.parse(options.nowISO) : Date.now()
  const fromMs = options.fromISO ? Date.parse(options.fromISO) : -Infinity
  const toMs = options.toISO ? Date.parse(options.toISO) : Infinity
  const modulesFilter = options.modules ? new Set(options.modules) : null

  const all: CalendarEvent[] = [
    ...dsarEvents(state.dsarRequests ?? [], nowMs),
    ...dpiaEvents(state.dpiaRecords ?? [], nowMs),
    ...ropaEvents(state.ropaActivities ?? [], nowMs),
    ...breachEvents(state.breachRecords ?? [], nowMs),
    ...vendorEvents(state.vendorRecords ?? [], nowMs),
    ...aiActRegulatoryEvents(nowMs),
    ...approvalEvents(state.approvalRequests ?? [], nowMs),
    ...trustCenterEvents(state.trustCenterTokens ?? [], nowMs),
  ]

  return all
    .filter((e) => {
      if (modulesFilter && !modulesFilter.has(e.module)) return false
      const ts = Date.parse(e.dateISO)
      if (Number.isNaN(ts)) return false
      if (ts < fromMs) return false
      if (ts > toMs) return false
      return true
    })
    .sort((a, b) => Date.parse(a.dateISO) - Date.parse(b.dateISO))
}

// ────────────────────────────────────────────────────────────────────────────
//   iCal (RFC 5545) export
// ────────────────────────────────────────────────────────────────────────────

function escapeICal(value: string): string {
  // Escape per RFC 5545 §3.3.11
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;")
}

function toICalDateTime(iso: string, allDay: boolean): { line: string; isDate: boolean } {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) {
    return { line: `${iso.replace(/[^0-9TZ]/g, "")}`, isDate: false }
  }
  if (allDay) {
    const yyyy = d.getUTCFullYear().toString().padStart(4, "0")
    const mm = (d.getUTCMonth() + 1).toString().padStart(2, "0")
    const dd = d.getUTCDate().toString().padStart(2, "0")
    return { line: `${yyyy}${mm}${dd}`, isDate: true }
  }
  // Floating UTC datetime
  const yyyy = d.getUTCFullYear().toString().padStart(4, "0")
  const mm = (d.getUTCMonth() + 1).toString().padStart(2, "0")
  const dd = d.getUTCDate().toString().padStart(2, "0")
  const hh = d.getUTCHours().toString().padStart(2, "0")
  const mi = d.getUTCMinutes().toString().padStart(2, "0")
  const ss = d.getUTCSeconds().toString().padStart(2, "0")
  return { line: `${yyyy}${mm}${dd}T${hh}${mi}${ss}Z`, isDate: false }
}

/**
 * Build a valid RFC 5545 VCALENDAR string from CalendarEvent[]. Pure function.
 */
export function buildICal(
  events: CalendarEvent[],
  options: { calendarName?: string; orgName?: string; nowISO?: string } = {},
): string {
  const calendarName = options.calendarName ?? "CompliRoAI · Deadlines"
  const nowStamp = toICalDateTime(options.nowISO ?? new Date().toISOString(), false).line

  const lines: string[] = []
  lines.push("BEGIN:VCALENDAR")
  lines.push("VERSION:2.0")
  lines.push("PRODID:-//CompliRoAI//Calendar//RO")
  lines.push("CALSCALE:GREGORIAN")
  lines.push("METHOD:PUBLISH")
  lines.push(`X-WR-CALNAME:${escapeICal(calendarName)}`)
  if (options.orgName) lines.push(`X-WR-CALDESC:${escapeICal(`Deadlines compliance · ${options.orgName}`)}`)

  for (const e of events) {
    const start = toICalDateTime(e.dateISO, e.allDay)
    const end = e.endDateISO
      ? toICalDateTime(e.endDateISO, e.allDay)
      : e.allDay
        ? toICalDateTime(plusDays(e.dateISO, 1), true)
        : toICalDateTime(new Date(Date.parse(e.dateISO) + 60 * 60 * 1000).toISOString(), false)
    lines.push("BEGIN:VEVENT")
    lines.push(`UID:${e.id}@compliroai`)
    lines.push(`DTSTAMP:${nowStamp}`)
    if (start.isDate) {
      lines.push(`DTSTART;VALUE=DATE:${start.line}`)
      lines.push(`DTEND;VALUE=DATE:${end.line}`)
    } else {
      lines.push(`DTSTART:${start.line}`)
      lines.push(`DTEND:${end.line}`)
    }
    lines.push(`SUMMARY:${escapeICal(e.title)}`)
    if (e.description) lines.push(`DESCRIPTION:${escapeICal(e.description)}`)
    lines.push(`CATEGORIES:${escapeICal(`CompliRoAI/${e.module}`)}`)
    if (e.entityLinkHref) lines.push(`URL:${escapeICal(e.entityLinkHref)}`)
    if (e.recurring) {
      const interval = e.recurring.interval
      const freq = interval === "monthly" ? "MONTHLY" : interval === "quarterly" ? "MONTHLY;INTERVAL=3" : "YEARLY"
      const untilSuffix = e.recurring.until
        ? `;UNTIL=${toICalDateTime(e.recurring.until, e.allDay).line}`
        : ""
      lines.push(`RRULE:FREQ=${freq}${untilSuffix}`)
    }
    lines.push("END:VEVENT")
  }

  lines.push("END:VCALENDAR")
  // Per RFC 5545 §3.1: lines end with CRLF.
  return lines.join("\r\n") + "\r\n"
}
