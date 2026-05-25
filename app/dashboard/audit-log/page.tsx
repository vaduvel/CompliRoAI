"use client"

/**
 * Sprint 011 — /dashboard/audit-log
 *
 * Pagina mature pentru ledger-ul ComplianceEvent:
 *  - Header: "Audit Log — ledger criptografic toate acțiunile compliance"
 *  - Stats: total / azi / 7d / chain status
 *  - Filter bar: date range, entityType, actor, eventType, search
 *  - Tabel evenimente: timestamp + actor + tip + entitate + mesaj + hash
 *  - Expand row: metadata JSON + prev/self hash + link entitate
 *  - Top right: verify chain + export md/json/csv
 *
 * Style: inline + v3 design tokens. Romanian copy. Lucide icons.
 */

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Download,
  ExternalLink,
  FileSearch,
  Filter,
  Hash,
  Loader2,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  X,
} from "lucide-react"

import type {
  ComplianceEvent,
  ComplianceEventEntityType,
} from "@/lib/compliance/types"

type ChainVerification =
  | { ok: true; verifiedCount: number; skippedLegacyCount: number }
  | {
      ok: false
      brokenAt: { index: number; eventId: string; reason: string }
      verifiedCount: number
    }

type AuditLogResponse = {
  events: ComplianceEvent[]
  total: number
  chainVerification: ChainVerification
  facets: {
    actors: string[]
    eventTypes: string[]
    entityTypes: string[]
  }
}

type DateRangePreset = "today" | "7d" | "30d" | "90d" | "all" | "custom"

const ENTITY_LABELS: Record<ComplianceEventEntityType, string> = {
  scan: "Scan",
  finding: "Risc",
  alert: "Alertă",
  task: "Task",
  integration: "Integrare",
  system: "Sistem",
  drift: "Drift",
  ai_guidance: "AI Guidance",
}

const ENTITY_COLORS: Record<ComplianceEventEntityType, { bg: string; fg: string }> = {
  scan: { bg: "rgba(148,163,184,0.16)", fg: "#94a3b8" },
  finding: { bg: "rgba(251,146,60,0.16)", fg: "#fb923c" },
  alert: { bg: "rgba(248,113,113,0.18)", fg: "#f87171" },
  task: { bg: "rgba(96,165,250,0.14)", fg: "#60a5fa" },
  integration: { bg: "rgba(168,85,247,0.14)", fg: "#a855f7" },
  system: { bg: "rgba(52,211,153,0.14)", fg: "#34d399" },
  drift: { bg: "rgba(251,191,36,0.16)", fg: "#fbbf24" },
  ai_guidance: { bg: "rgba(59,130,246,0.14)", fg: "#60a5fa" },
}

// Resolve entity link from event (deep-link into the relevant module page).
function entityLink(e: ComplianceEvent): string | null {
  // Findings: link la /dashboard/resolve (cockpit) — id-ul e in entityId
  if (e.entityType === "finding") return `/dashboard/resolve`
  if (e.type.startsWith("dpia.")) return `/dashboard/dpia`
  if (e.type.startsWith("ropa.")) return `/dashboard/ropa`
  if (e.type.startsWith("breach.")) return `/dashboard/breach`
  if (e.type.startsWith("vendor.")) return `/dashboard/vendor-review`
  if (e.type.startsWith("ai-data-map.") || e.type.startsWith("ai-discovery.") || e.type.startsWith("pii.")) {
    return `/dashboard/ai-discovery`
  }
  if (e.type.startsWith("dsar.")) return `/dashboard/dsar`
  if (e.type.startsWith("literacy.")) return `/dashboard/literacy`
  return null
}

function formatRelative(iso: string, nowISO: string): string {
  const diffMs = new Date(nowISO).getTime() - new Date(iso).getTime()
  const sec = Math.floor(diffMs / 1000)
  if (sec < 60) return "acum câteva secunde"
  const min = Math.floor(sec / 60)
  if (min < 60) return `acum ${min} min`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `acum ${hr} ore`
  const days = Math.floor(hr / 24)
  if (days < 30) return `acum ${days} zile`
  const months = Math.floor(days / 30)
  if (months < 12) return `acum ${months} luni`
  return `acum ${Math.floor(months / 12)} ani`
}

function formatAbsolute(iso: string): string {
  try {
    return new Date(iso).toLocaleString("ro-RO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  } catch {
    return iso
  }
}

function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString()
}

function startOfTodayISO(): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

export default function AuditLogPage() {
  const [data, setData] = useState<AuditLogResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [verifyBanner, setVerifyBanner] = useState<
    null | { ok: boolean; message: string }
  >(null)

  // Filters
  const [dateRange, setDateRange] = useState<DateRangePreset>("all")
  const [customFrom, setCustomFrom] = useState<string>("")
  const [customTo, setCustomTo] = useState<string>("")
  const [entityType, setEntityType] = useState<string>("")
  const [actorEmail, setActorEmail] = useState<string>("")
  const [eventType, setEventType] = useState<string>("")
  const [search, setSearch] = useState<string>("")

  const nowISO = useMemo(() => new Date().toISOString(), [data])

  const computeRange = useCallback((): { from: string | null; to: string | null } => {
    switch (dateRange) {
      case "today":
        return { from: startOfTodayISO(), to: null }
      case "7d":
        return { from: isoDaysAgo(7), to: null }
      case "30d":
        return { from: isoDaysAgo(30), to: null }
      case "90d":
        return { from: isoDaysAgo(90), to: null }
      case "custom":
        return {
          from: customFrom ? new Date(customFrom).toISOString() : null,
          to: customTo ? new Date(customTo).toISOString() : null,
        }
      case "all":
      default:
        return { from: null, to: null }
    }
  }, [dateRange, customFrom, customTo])

  const buildQueryString = useCallback((): string => {
    const params = new URLSearchParams()
    const { from, to } = computeRange()
    if (from) params.set("from", from)
    if (to) params.set("to", to)
    if (entityType) params.set("entityType", entityType)
    if (actorEmail) params.set("actorEmail", actorEmail)
    if (eventType) params.set("eventType", eventType)
    if (search.trim()) params.set("search", search.trim())
    params.set("limit", "500")
    return params.toString()
  }, [computeRange, entityType, actorEmail, eventType, search])

  const fetchLog = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const qs = buildQueryString()
      const res = await fetch(`/api/audit-log?${qs}`, { cache: "no-store" })
      if (!res.ok) throw new Error("Nu am putut încărca log-ul de audit.")
      const json = (await res.json()) as AuditLogResponse
      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare necunoscută.")
    } finally {
      setLoading(false)
    }
  }, [buildQueryString])

  useEffect(() => {
    void fetchLog()
  }, [fetchLog])

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleVerifyChain() {
    if (!data) return
    if (data.chainVerification.ok) {
      setVerifyBanner({
        ok: true,
        message: `Lanț verificat: ${data.chainVerification.verifiedCount} evenimente integre${data.chainVerification.skippedLegacyCount > 0 ? ` (${data.chainVerification.skippedLegacyCount} legacy sărite)` : ""}.`,
      })
    } else {
      setVerifyBanner({
        ok: false,
        message: `Lanț RUPT la evenimentul ${data.chainVerification.brokenAt.eventId}: ${data.chainVerification.brokenAt.reason}`,
      })
    }
    setTimeout(() => setVerifyBanner(null), 8000)
  }

  function exportFormat(format: "md" | "json" | "csv") {
    const qs = buildQueryString()
    window.open(`/api/audit-log/export?${qs}&format=${format}`, "_blank")
  }

  function clearFilters() {
    setDateRange("all")
    setCustomFrom("")
    setCustomTo("")
    setEntityType("")
    setActorEmail("")
    setEventType("")
    setSearch("")
  }

  // Stats (computed locally din data.events filtrat)
  const stats = useMemo(() => {
    if (!data) {
      return { total: 0, today: 0, last7d: 0 }
    }
    const today = startOfTodayISO()
    const last7 = isoDaysAgo(7)
    let todayCount = 0
    let last7Count = 0
    for (const e of data.events) {
      if (e.createdAtISO >= today) todayCount++
      if (e.createdAtISO >= last7) last7Count++
    }
    return { total: data.total, today: todayCount, last7d: last7Count }
  }, [data])

  return (
    <div className="cr-page cr-page--full cr-stack">
      {/* Header */}
      <div className="cr-hero">
        <div className="cr-hero__copy cr-hero__copy--icon">
          <FileSearch size={28} color="var(--cobalt-700)" />
          <div>
            <span className="cr-eyebrow">Rapoarte & dosar</span>
            <h1 className="cr-title">Jurnal audit</h1>
            <p className="cr-subtitle">
              Ledger criptografic SHA-256 cu toate acțiunile compliance. Imutabil, exportabil,
              verificabil cu hash chain.
            </p>
          </div>
        </div>
      </div>

      {/* Verify banner */}
      {verifyBanner && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: "6px",
            marginBottom: "16px",
            background: verifyBanner.ok ? "rgba(52,211,153,0.12)" : "rgba(248,113,113,0.14)",
            border: `1px solid ${verifyBanner.ok ? "rgba(52,211,153,0.4)" : "rgba(248,113,113,0.4)"}`,
            color: verifyBanner.ok ? "#34d399" : "#f87171",
            fontSize: "13px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          {verifyBanner.ok ? <ShieldCheck size={16} /> : <ShieldAlert size={16} />}
          <span>{verifyBanner.message}</span>
        </div>
      )}

      {/* Stats bar */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "12px",
          marginBottom: "24px",
        }}
      >
        <StatCard label="Total filtrate" value={String(stats.total)} icon={<FileSearch size={14} />} />
        <StatCard label="Azi" value={String(stats.today)} icon={<Calendar size={14} />} />
        <StatCard label="Ultimele 7 zile" value={String(stats.last7d)} icon={<Calendar size={14} />} />
        <ChainStatusCard data={data} />
      </div>

      {/* Filters */}
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "8px",
          padding: "16px",
          marginBottom: "16px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "12px",
          }}
        >
          <Filter size={14} color="var(--ink-dim)" />
          <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--ink-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Filtre
          </span>
          <button
            onClick={clearFilters}
            className="cr-btn cr-btn--secondary cr-btn--sm"
            style={{ marginLeft: "auto" }}
          >
            Resetează
          </button>
        </div>

        {/* Date range presets */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "12px" }}>
          {(["all", "today", "7d", "30d", "90d", "custom"] as DateRangePreset[]).map((p) => (
            <button
              key={p}
              onClick={() => setDateRange(p)}
              className={`cr-filter-chip ${dateRange === p ? "is-active" : ""}`}
            >
              {p === "all" ? "Tot" : p === "today" ? "Azi" : p === "7d" ? "7 zile" : p === "30d" ? "30 zile" : p === "90d" ? "90 zile" : "Custom"}
            </button>
          ))}
        </div>

        {dateRange === "custom" && (
          <div style={{ display: "flex", gap: "8px", marginBottom: "12px", alignItems: "center" }}>
            <label style={{ fontSize: "11px", color: "var(--ink-muted)" }}>De la:</label>
            <input
              className="cr-input"
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
            />
            <label style={{ fontSize: "11px", color: "var(--ink-muted)" }}>Până la:</label>
            <input
              className="cr-input"
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
            />
          </div>
        )}

        {/* Other filters */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px" }}>
          <div>
            <label style={labelStyle}>Tip entitate</label>
            <select
              className="cr-select"
              value={entityType}
              onChange={(e) => setEntityType(e.target.value)}
            >
              <option value="">— Toate —</option>
              {data?.facets.entityTypes.map((t) => (
                <option key={t} value={t}>
                  {ENTITY_LABELS[t as ComplianceEventEntityType] ?? t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Actor</label>
            <select
              className="cr-select"
              value={actorEmail}
              onChange={(e) => setActorEmail(e.target.value)}
            >
              <option value="">— Toți —</option>
              {data?.facets.actors.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Tip eveniment</label>
            <select
              className="cr-select"
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
            >
              <option value="">— Toate —</option>
              {data?.facets.eventTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Căutare</label>
            <div style={{ position: "relative" }}>
              <Search
                size={12}
                style={{
                  position: "absolute",
                  left: "8px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--ink-dim)",
                }}
              />
              <input
                className="cr-input"
                type="text"
                placeholder="mesaj, metadata, tip..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ ...inputStyle, paddingLeft: "26px" }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Action bar */}
      <div className="cr-actions" style={{ marginBottom: "12px" }}>
        <button onClick={() => void fetchLog()} className="cr-btn cr-btn--secondary cr-btn--sm">
          <RefreshCw size={12} />
          <span>Actualizează</span>
        </button>
        <button onClick={handleVerifyChain} className="cr-btn cr-btn--secondary cr-btn--sm" disabled={!data}>
          <Shield size={12} />
          <span>Verifică lanț</span>
        </button>
        <div className="cr-actions" style={{ marginLeft: "auto" }}>
          <button onClick={() => exportFormat("md")} className="cr-btn cr-btn--secondary cr-btn--sm">
            <Download size={12} />
            <span>Markdown</span>
          </button>
          <button onClick={() => exportFormat("json")} className="cr-btn cr-btn--secondary cr-btn--sm">
            <Download size={12} />
            <span>JSON</span>
          </button>
          <button onClick={() => exportFormat("csv")} className="cr-btn cr-btn--secondary cr-btn--sm">
            <Download size={12} />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* Events table */}
      {loading ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "60px", color: "var(--ink-dim)" }}>
          <Loader2 size={20} className="animate-spin" />
          <span style={{ marginLeft: "10px", fontSize: "13px" }}>Se încarcă log-ul...</span>
        </div>
      ) : error ? (
        <div
          style={{
            padding: "16px",
            background: "rgba(248,113,113,0.12)",
            border: "1px solid rgba(248,113,113,0.4)",
            borderRadius: "6px",
            color: "#f87171",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "13px",
          }}
        >
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      ) : data && data.events.length === 0 ? (
        <div
          style={{
            padding: "40px",
            textAlign: "center",
            background: "var(--bg-card)",
            border: "1px dashed var(--border)",
            borderRadius: "8px",
            color: "var(--ink-dim)",
            fontSize: "13px",
          }}
        >
          <X size={20} style={{ margin: "0 auto 8px", display: "block", opacity: 0.5 }} />
          Niciun eveniment în acest filtru.
        </div>
      ) : (
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "32px 160px 180px 200px 130px 1fr 90px",
              gap: "10px",
              padding: "10px 16px",
              borderBottom: "1px solid var(--border)",
              background: "var(--bg-soft)",
              fontSize: "10px",
              fontWeight: 600,
              color: "var(--ink-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            <span />
            <span>Timestamp</span>
            <span>Actor</span>
            <span>Tip eveniment</span>
            <span>Entitate</span>
            <span>Mesaj</span>
            <span style={{ textAlign: "right" }}>Hash</span>
          </div>
          {data?.events.map((e) => {
            const isOpen = expanded.has(e.id)
            const link = entityLink(e)
            const entityColor = ENTITY_COLORS[e.entityType] ?? ENTITY_COLORS.system
            return (
              <div key={e.id}>
                <button
                  type="button"
                  onClick={() => toggleExpand(e.id)}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "32px 160px 180px 200px 130px 1fr 90px",
                    gap: "10px",
                    padding: "10px 16px",
                    width: "100%",
                    background: isOpen ? "var(--bg-soft)" : "transparent",
                    border: "none",
                    borderTop: "1px solid var(--border-soft)",
                    textAlign: "left",
                    cursor: "pointer",
                    fontSize: "12px",
                    color: "var(--ink)",
                    alignItems: "center",
                  }}
                >
                  <span style={{ color: "var(--ink-dim)" }}>
                    {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  </span>
                  <span title={formatAbsolute(e.createdAtISO)} style={{ color: "var(--ink-dim)" }}>
                    {formatRelative(e.createdAtISO, nowISO)}
                  </span>
                  <span style={{ color: "var(--ink-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {e.actorLabel ?? "system"}
                  </span>
                  <span style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "11px", color: "var(--ink-muted)" }}>
                    {e.type}
                  </span>
                  <span>
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: "3px",
                        background: entityColor.bg,
                        color: entityColor.fg,
                        fontSize: "10px",
                        fontWeight: 600,
                        textTransform: "uppercase",
                      }}
                    >
                      {ENTITY_LABELS[e.entityType] ?? e.entityType}
                    </span>
                  </span>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {e.message}
                  </span>
                  <span style={{ textAlign: "right", fontFamily: "var(--font-mono, monospace)", fontSize: "10px", color: "var(--ink-dim)" }}>
                    {e.selfHash ? e.selfHash.slice(0, 8) : "—"}
                  </span>
                </button>
                {isOpen && (
                  <div
                    style={{
                      padding: "16px 24px 16px 56px",
                      background: "var(--bg)",
                      borderTop: "1px solid var(--border-soft)",
                      fontSize: "12px",
                      color: "var(--ink-muted)",
                    }}
                  >
                    <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: "6px 14px" }}>
                      <span style={{ color: "var(--ink-dim)" }}>ID</span>
                      <code style={codeStyle}>{e.id}</code>
                      <span style={{ color: "var(--ink-dim)" }}>Timestamp exact</span>
                      <span>{formatAbsolute(e.createdAtISO)}</span>
                      <span style={{ color: "var(--ink-dim)" }}>Entitate</span>
                      <span>
                        <code style={codeStyle}>{e.entityType}#{e.entityId}</code>
                        {link && (
                          <Link
                            href={link}
                            style={{
                              marginLeft: "10px",
                              color: "var(--accent)",
                              textDecoration: "none",
                              fontSize: "11px",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "3px",
                            }}
                          >
                            Deschide
                            <ExternalLink size={10} />
                          </Link>
                        )}
                      </span>
                      <span style={{ color: "var(--ink-dim)" }}>Actor</span>
                      <span>
                        {e.actorLabel ?? "—"} · {e.actorRole ?? "—"} ({e.actorSource ?? "—"})
                      </span>
                      <span style={{ color: "var(--ink-dim)", display: "flex", alignItems: "center", gap: "4px" }}>
                        <Hash size={10} />
                        Self hash
                      </span>
                      <code style={codeStyle}>{e.selfHash ?? "—"}</code>
                      <span style={{ color: "var(--ink-dim)", display: "flex", alignItems: "center", gap: "4px" }}>
                        <Hash size={10} />
                        Prev hash
                      </span>
                      <code style={codeStyle}>{e.prevHash ?? "—"}</code>
                      {e.metadata && Object.keys(e.metadata).length > 0 && (
                        <>
                          <span style={{ color: "var(--ink-dim)" }}>Metadata</span>
                          <pre
                            style={{
                              ...codeStyle,
                              padding: "8px 10px",
                              borderRadius: "4px",
                              background: "var(--bg-soft)",
                              border: "1px solid var(--border-soft)",
                              overflow: "auto",
                              margin: 0,
                            }}
                          >
                            {JSON.stringify(e.metadata, null, 2)}
                          </pre>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {data && data.total >= 500 && (
        <p style={{ fontSize: "11px", color: "var(--ink-dim)", marginTop: "12px", textAlign: "center" }}>
          Afișate primele 500 evenimente. Folosește filtrele sau exportă pentru a vedea istoricul complet.
        </p>
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
//   Sub-components
// ────────────────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div
      style={{
        padding: "14px 16px",
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: "8px",
        display: "flex",
        flexDirection: "column",
        gap: "4px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--ink-muted)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>
        {icon}
        <span>{label}</span>
      </div>
      <div style={{ fontSize: "20px", fontWeight: 600, color: "var(--ink)", fontFamily: "var(--font-display-v3)" }}>
        {value}
      </div>
    </div>
  )
}

function ChainStatusCard({ data }: { data: AuditLogResponse | null }) {
  if (!data) {
    return <StatCard label="Lanț hash" value="—" icon={<Shield size={14} />} />
  }
  const ok = data.chainVerification.ok
  return (
    <div
      style={{
        padding: "14px 16px",
        background: ok ? "rgba(52,211,153,0.08)" : "rgba(248,113,113,0.08)",
        border: `1px solid ${ok ? "rgba(52,211,153,0.3)" : "rgba(248,113,113,0.3)"}`,
        borderRadius: "8px",
        display: "flex",
        flexDirection: "column",
        gap: "4px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          color: ok ? "#10b981" : "#ef4444",
          fontSize: "11px",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          fontWeight: 600,
        }}
      >
        {ok ? <ShieldCheck size={14} /> : <ShieldAlert size={14} />}
        <span>Lanț hash</span>
      </div>
      <div style={{ fontSize: "13px", fontWeight: 600, color: ok ? "#34d399" : "#f87171" }}>
        {ok ? (
          <>
            <CheckCircle2 size={12} style={{ display: "inline", marginRight: "4px", verticalAlign: "text-bottom" }} />
            {data.chainVerification.verifiedCount} integre
          </>
        ) : (
          <>
            <AlertTriangle size={12} style={{ display: "inline", marginRight: "4px", verticalAlign: "text-bottom" }} />
            Rupt la {data.chainVerification.brokenAt.eventId.slice(0, 12)}
          </>
        )}
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
//   Styles (shared)
// ────────────────────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "5px 8px",
  fontSize: "12px",
  border: "1px solid var(--border)",
  borderRadius: "4px",
  background: "var(--bg)",
  color: "var(--ink)",
  fontFamily: "inherit",
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "10px",
  fontWeight: 600,
  color: "var(--ink-muted)",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  marginBottom: "4px",
}

const codeStyle: React.CSSProperties = {
  fontFamily: "var(--font-mono, monospace)",
  fontSize: "11px",
  color: "var(--ink)",
  background: "transparent",
  wordBreak: "break-all",
}
