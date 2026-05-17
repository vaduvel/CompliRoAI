"use client"

/**
 * Sprint 013 — /dashboard/calendar
 *
 * Two views: month grid + agenda list.
 * Filter chips pe modul + iCal subscribe URL.
 */

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  AlertCircle,
  AlertTriangle,
  Calendar as CalIcon,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Download,
  ExternalLink,
  Filter,
  Info,
  List,
  Loader2,
  RefreshCw,
  ShieldAlert,
} from "lucide-react"

import type {
  CalendarEvent,
  CalendarEventModule,
  CalendarEventSeverity,
} from "@/lib/compliance/types"

type FetchResponse = {
  events: CalendarEvent[]
  total: number
  availableModules: CalendarEventModule[]
}

const MODULE_LABEL: Record<CalendarEventModule, string> = {
  dsar: "DSAR",
  dpia: "DPIA",
  ropa: "RoPA",
  breach: "Incident",
  vendor: "Vendor",
  ai_act_regulatory: "AI Act deadline",
  approval: "Aprobări",
  finding: "Findings",
  audit_pack: "Audit Pack",
  trust_center: "Trust Center",
}

const MODULE_COLOR: Record<CalendarEventModule, string> = {
  dsar: "#60a5fa",
  dpia: "#a855f7",
  ropa: "#34d399",
  breach: "#f87171",
  vendor: "#fbbf24",
  ai_act_regulatory: "#fb923c",
  approval: "#0ea5e9",
  finding: "#94a3b8",
  audit_pack: "#34d399",
  trust_center: "#3b5bdb",
}

const SEVERITY_BG: Record<CalendarEventSeverity, string> = {
  info: "rgba(148,163,184,0.14)",
  warning: "rgba(251,191,36,0.16)",
  urgent: "rgba(251,146,60,0.18)",
  critical: "rgba(248,113,113,0.20)",
}
const SEVERITY_FG: Record<CalendarEventSeverity, string> = {
  info: "#94a3b8",
  warning: "#fbbf24",
  urgent: "#fb923c",
  critical: "#f87171",
}

const SEVERITY_ICON: Record<CalendarEventSeverity, React.ReactNode> = {
  info: <Info size={12} />,
  warning: <Clock size={12} />,
  urgent: <AlertTriangle size={12} />,
  critical: <ShieldAlert size={12} />,
}

function formatAbsolute(iso: string, opts: Intl.DateTimeFormatOptions = {}): string {
  try {
    return new Date(iso).toLocaleString("ro-RO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      ...opts,
    })
  } catch {
    return iso
  }
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999)
}

function startOfGrid(d: Date): Date {
  const first = startOfMonth(d)
  // Monday-first grid (ro locale)
  const dayOfWeek = (first.getDay() + 6) % 7 // 0=Monday, 6=Sunday
  return new Date(first.getFullYear(), first.getMonth(), first.getDate() - dayOfWeek)
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export default function CalendarPage() {
  const [data, setData] = useState<FetchResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedModules, setSelectedModules] = useState<Set<CalendarEventModule>>(new Set())
  const [view, setView] = useState<"month" | "agenda">("agenda")
  const [monthCursor, setMonthCursor] = useState(() => startOfMonth(new Date()))
  const [iCalCopied, setICalCopied] = useState(false)
  const [activeEvent, setActiveEvent] = useState<CalendarEvent | null>(null)

  const refresh = useCallback(async () => {
    try {
      setError(null)
      const url = new URL("/api/calendar", window.location.origin)
      if (selectedModules.size > 0) {
        url.searchParams.set("modules", Array.from(selectedModules).join(","))
      }
      const res = await fetch(url.toString(), { cache: "no-store" })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setData((await res.json()) as FetchResponse)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare la încărcare")
    } finally {
      setLoading(false)
    }
  }, [selectedModules])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const toggleModule = (m: CalendarEventModule) => {
    setSelectedModules((prev) => {
      const next = new Set(prev)
      if (next.has(m)) next.delete(m)
      else next.add(m)
      return next
    })
  }

  const events = data?.events ?? []

  // Group events for agenda view (newest cluster ahead)
  const agendaGroups = useMemo(() => {
    const groups: Array<{ dateKey: string; label: string; events: CalendarEvent[] }> = []
    const map = new Map<string, CalendarEvent[]>()
    for (const e of events) {
      const dateKey = e.dateISO.slice(0, 10)
      if (!map.has(dateKey)) map.set(dateKey, [])
      map.get(dateKey)!.push(e)
    }
    const sortedKeys = Array.from(map.keys()).sort()
    for (const k of sortedKeys) {
      const label = new Date(k + "T00:00:00.000Z").toLocaleDateString("ro-RO", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
      groups.push({ dateKey: k, label, events: map.get(k)! })
    }
    return groups
  }, [events])

  // Build month grid (42 cells)
  const monthGrid = useMemo(() => {
    const start = startOfGrid(monthCursor)
    const cells: { date: Date; events: CalendarEvent[]; inMonth: boolean }[] = []
    for (let i = 0; i < 42; i++) {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)
      const dayEvents = events.filter((e) => isSameDay(new Date(e.dateISO), d))
      cells.push({
        date: d,
        events: dayEvents,
        inMonth: d.getMonth() === monthCursor.getMonth(),
      })
    }
    return cells
  }, [monthCursor, events])

  function copyICalUrl() {
    const url = `${window.location.origin}/api/calendar/ical`
    void navigator.clipboard.writeText(url).then(() => {
      setICalCopied(true)
      setTimeout(() => setICalCopied(false), 2000)
    })
  }

  if (loading) {
    return (
      <div style={{ padding: "60px 40px", textAlign: "center", color: "var(--ink-dim)" }}>
        <Loader2 size={24} style={{ animation: "spin 1s linear infinite", marginBottom: 8 }} />
        <div>Se încarcă calendarul…</div>
      </div>
    )
  }

  return (
    <div style={{ padding: "32px 40px", maxWidth: 1280, margin: "0 auto" }}>
      {/* Header */}
      <header style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
          <CalendarDays size={22} color="var(--ink)" />
          <h1 style={{ fontSize: 22, fontWeight: 600, color: "var(--ink)", margin: 0, letterSpacing: "-0.01em" }}>
            Calendar deadlines
          </h1>
        </div>
        <p style={{ fontSize: 13, color: "var(--ink-dim)", lineHeight: 1.55, maxWidth: 760, margin: 0 }}>
          Vedere agregată a tuturor deadline-urilor: DSAR (30 zile), DPIA, RoPA revalidare anuală, incidente date
          personale 72h, vendor revalidare, plus datele oficiale ale Regulamentului (UE) 2024/1689 (Art. 50 – 2 dec
          2026, Anexa III high-risk – 2 aug 2027). Aboneaza-te via iCal pentru a primi notificările în calendarul tău.
        </p>
      </header>

      {/* Top toolbar */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
        {/* View switch */}
        <div style={{ display: "flex", border: "1px solid var(--border)", borderRadius: 6, overflow: "hidden" }}>
          <button
            onClick={() => setView("agenda")}
            style={{
              padding: "6px 12px",
              fontSize: 12,
              border: "none",
              background: view === "agenda" ? "var(--accent-soft)" : "transparent",
              color: view === "agenda" ? "var(--accent)" : "var(--ink-dim)",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <List size={12} /> Agenda
          </button>
          <button
            onClick={() => setView("month")}
            style={{
              padding: "6px 12px",
              fontSize: 12,
              border: "none",
              borderLeft: "1px solid var(--border)",
              background: view === "month" ? "var(--accent-soft)" : "transparent",
              color: view === "month" ? "var(--accent)" : "var(--ink-dim)",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <CalIcon size={12} /> Lună
          </button>
        </div>

        {/* Refresh */}
        <button
          onClick={() => void refresh()}
          style={{
            padding: "6px 12px",
            borderRadius: 6,
            border: "1px solid var(--border)",
            background: "transparent",
            color: "var(--ink-dim)",
            fontSize: 12,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <RefreshCw size={12} /> Reîmprospătează
        </button>

        {/* iCal */}
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          <button
            onClick={copyICalUrl}
            style={{
              padding: "6px 12px",
              borderRadius: 6,
              border: "1px solid var(--border)",
              background: "transparent",
              color: "var(--ink-dim)",
              fontSize: 12,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Copy size={12} /> {iCalCopied ? "Copiat!" : "Copiază URL iCal"}
          </button>
          <a
            href="/api/calendar/ical"
            download
            style={{
              padding: "6px 12px",
              borderRadius: 6,
              border: "1px solid var(--accent)",
              background: "var(--accent-soft)",
              color: "var(--accent)",
              fontSize: 12,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Download size={12} /> Descarcă .ics
          </a>
        </div>
      </div>

      {/* Module filter chips */}
      <div style={{ display: "flex", gap: 6, marginBottom: 18, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: 11, color: "var(--ink-dim)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          <Filter size={11} style={{ verticalAlign: -1, marginRight: 4 }} />
          Module:
        </span>
        {(data?.availableModules ?? []).map((m) => {
          const isOn = selectedModules.size === 0 || selectedModules.has(m)
          return (
            <button
              key={m}
              onClick={() => toggleModule(m)}
              style={{
                padding: "4px 10px",
                borderRadius: 99,
                border: `1px solid ${isOn ? MODULE_COLOR[m] : "var(--border)"}`,
                background: isOn ? `${MODULE_COLOR[m]}22` : "transparent",
                color: isOn ? MODULE_COLOR[m] : "var(--ink-dim)",
                fontSize: 11,
                cursor: "pointer",
              }}
            >
              {MODULE_LABEL[m]}
            </button>
          )
        })}
        {selectedModules.size > 0 && (
          <button
            onClick={() => setSelectedModules(new Set())}
            style={{ marginLeft: "auto", fontSize: 11, color: "var(--ink-dim)", border: "none", background: "transparent", cursor: "pointer" }}
          >
            Resetează filtrele
          </button>
        )}
      </div>

      {error && (
        <div
          style={{
            padding: "10px 14px",
            borderRadius: 6,
            background: "rgba(248,113,113,0.12)",
            border: "1px solid rgba(248,113,113,0.4)",
            color: "#f87171",
            fontSize: 12,
            marginBottom: 14,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      {view === "agenda" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {agendaGroups.length === 0 && (
            <div
              style={{
                padding: "40px 20px",
                textAlign: "center",
                color: "var(--ink-dim)",
                fontSize: 13,
                border: "1px dashed var(--border)",
                borderRadius: 8,
              }}
            >
              Niciun eveniment în acest interval.
            </div>
          )}
          {agendaGroups.map((g) => (
            <section key={g.dateKey}>
              <h3
                style={{
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "var(--ink-dim)",
                  marginBottom: 8,
                }}
              >
                {g.label}
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {g.events.map((e) => (
                  <EventRow key={e.id} event={e} onClick={() => setActiveEvent(e)} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {view === "month" && (
        <div>
          {/* Month nav */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <button
              onClick={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() - 1, 1))}
              style={{ border: "1px solid var(--border)", background: "transparent", color: "var(--ink-dim)", padding: 6, borderRadius: 6, cursor: "pointer" }}
            >
              <ChevronLeft size={14} />
            </button>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", minWidth: 180, textAlign: "center" }}>
              {monthCursor.toLocaleDateString("ro-RO", { month: "long", year: "numeric" })}
            </div>
            <button
              onClick={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1))}
              style={{ border: "1px solid var(--border)", background: "transparent", color: "var(--ink-dim)", padding: 6, borderRadius: 6, cursor: "pointer" }}
            >
              <ChevronRight size={14} />
            </button>
            <button
              onClick={() => setMonthCursor(startOfMonth(new Date()))}
              style={{ border: "1px solid var(--border)", background: "transparent", color: "var(--ink-dim)", padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontSize: 12 }}
            >
              Astăzi
            </button>
          </div>

          {/* Weekday header */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 4 }}>
            {["Lu", "Ma", "Mi", "Jo", "Vi", "Sâ", "Du"].map((d) => (
              <div key={d} style={{ fontSize: 10, color: "var(--ink-dim)", textTransform: "uppercase", letterSpacing: "0.06em", padding: "4px 6px" }}>
                {d}
              </div>
            ))}
          </div>

          {/* Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
            {monthGrid.map((c, i) => {
              const isToday = isSameDay(c.date, new Date())
              return (
                <div
                  key={i}
                  style={{
                    minHeight: 90,
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                    background: c.inMonth ? "var(--bg-elev)" : "transparent",
                    padding: 6,
                    display: "flex",
                    flexDirection: "column",
                    gap: 3,
                    opacity: c.inMonth ? 1 : 0.5,
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: isToday ? 700 : 400,
                      color: isToday ? "var(--accent)" : "var(--ink)",
                    }}
                  >
                    {c.date.getDate()}
                  </div>
                  {c.events.slice(0, 3).map((e) => (
                    <button
                      key={e.id}
                      onClick={() => setActiveEvent(e)}
                      title={e.title}
                      style={{
                        background: SEVERITY_BG[e.severity],
                        color: SEVERITY_FG[e.severity],
                        border: "none",
                        borderRadius: 4,
                        padding: "2px 4px",
                        fontSize: 10,
                        textAlign: "left",
                        cursor: "pointer",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {e.title}
                    </button>
                  ))}
                  {c.events.length > 3 && (
                    <div style={{ fontSize: 9, color: "var(--ink-dim)" }}>
                      + {c.events.length - 3} altele
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Event detail modal */}
      {activeEvent && (
        <div
          onClick={() => setActiveEvent(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--bg-elev)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: 22,
              width: "100%",
              maxWidth: 540,
              maxHeight: "80vh",
              overflowY: "auto",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span
                style={{
                  padding: "2px 8px",
                  borderRadius: 99,
                  background: `${MODULE_COLOR[activeEvent.module]}22`,
                  color: MODULE_COLOR[activeEvent.module],
                  fontSize: 10,
                }}
              >
                {MODULE_LABEL[activeEvent.module]}
              </span>
              <span
                style={{
                  padding: "2px 8px",
                  borderRadius: 99,
                  background: SEVERITY_BG[activeEvent.severity],
                  color: SEVERITY_FG[activeEvent.severity],
                  fontSize: 10,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                {SEVERITY_ICON[activeEvent.severity]}
                {activeEvent.severity}
              </span>
              {activeEvent.status === "completed" && (
                <span style={{ color: "#34d399", fontSize: 10, display: "inline-flex", alignItems: "center", gap: 3 }}>
                  <CheckCircle2 size={12} /> finalizat
                </span>
              )}
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: "var(--ink)", margin: "0 0 6px" }}>{activeEvent.title}</h2>
            <div style={{ fontSize: 12, color: "var(--ink-dim)", marginBottom: 14 }}>
              {formatAbsolute(activeEvent.dateISO, activeEvent.allDay ? {} : { hour: "2-digit", minute: "2-digit" })}
              {activeEvent.recurring && (
                <span style={{ marginLeft: 8 }}>· recurent {activeEvent.recurring.interval}</span>
              )}
            </div>
            {activeEvent.description && (
              <p style={{ fontSize: 13, color: "var(--ink)", lineHeight: 1.6, margin: "0 0 14px" }}>
                {activeEvent.description}
              </p>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              {activeEvent.entityLinkHref && (
                <a
                  href={activeEvent.entityLinkHref}
                  style={{
                    padding: "8px 14px",
                    borderRadius: 6,
                    border: "1px solid var(--accent)",
                    background: "var(--accent-soft)",
                    color: "var(--accent)",
                    fontSize: 12,
                    textDecoration: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <ExternalLink size={12} /> Deschide modul
                </a>
              )}
              <button
                onClick={() => setActiveEvent(null)}
                style={{
                  padding: "8px 14px",
                  borderRadius: 6,
                  border: "1px solid var(--border)",
                  background: "transparent",
                  color: "var(--ink-dim)",
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                Închide
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function EventRow({ event, onClick }: { event: CalendarEvent; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "grid",
        gridTemplateColumns: "auto 1fr auto",
        gap: 12,
        alignItems: "center",
        padding: "10px 14px",
        background: "var(--bg-elev)",
        border: "1px solid var(--border)",
        borderRadius: 6,
        textAlign: "left",
        cursor: "pointer",
        color: "var(--ink)",
      }}
    >
      <span
        style={{
          padding: "3px 8px",
          borderRadius: 99,
          background: `${MODULE_COLOR[event.module]}22`,
          color: MODULE_COLOR[event.module],
          fontSize: 10,
          whiteSpace: "nowrap",
        }}
      >
        {MODULE_LABEL[event.module]}
      </span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>{event.title}</div>
        {event.description && (
          <div
            style={{
              fontSize: 11,
              color: "var(--ink-dim)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              maxWidth: 720,
            }}
          >
            {event.description}
          </div>
        )}
      </div>
      <span
        style={{
          padding: "3px 8px",
          borderRadius: 99,
          background: SEVERITY_BG[event.severity],
          color: SEVERITY_FG[event.severity],
          fontSize: 10,
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          whiteSpace: "nowrap",
        }}
      >
        {SEVERITY_ICON[event.severity]}
        {event.severity}
      </span>
    </button>
  )
}
