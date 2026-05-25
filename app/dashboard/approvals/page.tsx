"use client"

/**
 * Sprint 013 — /dashboard/approvals
 *
 * Cabinet/consultant queue: pending / approved / rejected / all + per-item
 * detail cu approve/reject + comment + JSON pretty pentru proposedChange.
 */

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  AlertCircle,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Clock,
  Filter,
  Loader2,
  RefreshCw,
  ShieldCheck,
  X,
  XCircle,
} from "lucide-react"

import type {
  ApprovalEntityType,
  ApprovalRequest,
  ApprovalStatus,
} from "@/lib/compliance/types"

type FetchResponse = {
  requests: ApprovalRequest[]
  counts: { pending: number; approved: number; rejected: number; withdrawn: number; total: number }
}

const TAB_ORDER: Array<{ key: ApprovalStatus | "all"; label: string }> = [
  { key: "pending", label: "În așteptare" },
  { key: "approved", label: "Aprobate" },
  { key: "rejected", label: "Respinse" },
  { key: "withdrawn", label: "Retrase" },
  { key: "all", label: "Toate" },
]

const ENTITY_LABEL_RO: Record<ApprovalEntityType, string> = {
  finding_status_change: "Schimbare status finding",
  dpia_screening: "Decizie screening DPIA",
  breach_anspdcp_decision: "Decizie notificare ANSPDCP",
  breach_subject_skip: "Omitere notificare persoane",
  vendor_approved: "Aprobare vendor",
  vendor_rejected: "Respingere vendor",
  ai_system_classification: "Reclasificare sistem AI",
  transparency_notice_published: "Publicare notificare transparență",
  readiness_pack_exported: "Export Readiness Pack",
  audit_pack_exported: "Export Audit Pack",
}

const ENTITY_HREF: Partial<Record<ApprovalEntityType, string>> = {
  finding_status_change: "/dashboard/resolve",
  dpia_screening: "/dashboard/dpia",
  breach_anspdcp_decision: "/dashboard/breach",
  breach_subject_skip: "/dashboard/breach",
  vendor_approved: "/dashboard/vendor-review",
  vendor_rejected: "/dashboard/vendor-review",
  ai_system_classification: "/dashboard/sisteme",
  transparency_notice_published: "/dashboard/transparency",
  readiness_pack_exported: "/dashboard/readiness-pack",
  audit_pack_exported: "/dashboard/audit-pack",
}

const STATUS_BADGE: Record<ApprovalStatus, { bg: string; fg: string; label: string }> = {
  pending: { bg: "rgba(251,191,36,0.16)", fg: "#fbbf24", label: "În așteptare" },
  approved: { bg: "rgba(52,211,153,0.16)", fg: "#34d399", label: "Aprobat" },
  rejected: { bg: "rgba(248,113,113,0.16)", fg: "#f87171", label: "Respins" },
  withdrawn: { bg: "rgba(148,163,184,0.16)", fg: "#94a3b8", label: "Retras" },
}

function formatRelative(iso: string, nowMs: number): string {
  const diff = nowMs - Date.parse(iso)
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return "acum"
  const min = Math.floor(sec / 60)
  if (min < 60) return `acum ${min} min`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `acum ${hr} ore`
  const days = Math.floor(hr / 24)
  if (days < 30) return `acum ${days} zile`
  return new Date(iso).toLocaleDateString("ro-RO")
}

function formatAbsolute(iso: string): string {
  try {
    return new Date(iso).toLocaleString("ro-RO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return iso
  }
}

export default function ApprovalsPage() {
  const [data, setData] = useState<FetchResponse | null>(null)
  const [tab, setTab] = useState<ApprovalStatus | "all">("pending")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [decisionLoading, setDecisionLoading] = useState<string | null>(null)
  const [comments, setComments] = useState<Record<string, string>>({})
  const [nowMs, setNowMs] = useState(() => Date.now())

  const refresh = useCallback(async () => {
    try {
      setError(null)
      const res = await fetch("/api/approvals", { cache: "no-store" })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = (await res.json()) as FetchResponse
      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare la încărcare")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
    const id = setInterval(() => setNowMs(Date.now()), 60_000)
    return () => clearInterval(id)
  }, [refresh])

  const visibleRequests = useMemo(() => {
    if (!data) return []
    if (tab === "all") return data.requests
    return data.requests.filter((r) => r.status === tab)
  }, [data, tab])

  async function decide(id: string, action: "approve" | "reject" | "withdraw") {
    setDecisionLoading(id)
    try {
      const res = await fetch(`/api/approvals/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, comment: comments[id]?.trim() }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(body.error || `HTTP ${res.status}`)
      }
      setExpandedId(null)
      setComments((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare la decizie")
    } finally {
      setDecisionLoading(null)
    }
  }

  if (loading) {
    return (
      <div className="cr-page cr-empty">
        <Loader2 size={24} style={{ animation: "spin 1s linear infinite", marginBottom: 8 }} />
        <div>Se încarcă coada de aprobări…</div>
      </div>
    )
  }

  const counts = data?.counts ?? { pending: 0, approved: 0, rejected: 0, withdrawn: 0, total: 0 }

  return (
    <div className="cr-page cr-page--full cr-stack">
      {/* Header */}
      <header className="cr-hero">
        <div className="cr-hero__copy cr-hero__copy--icon">
          <span className="cr-action-card__icon">
            <CheckSquare size={20} />
          </span>
          <div>
            <div className="cr-eyebrow">Colaborare</div>
            <h1 className="cr-title">Coadă de aprobări</h1>
            <p className="cr-subtitle">
              Cereri inițiate de clienți care cer aprobare consultantă înainte ca schimbarea să devină definitivă.
              Aprobă → aplică automat schimbarea pe entitate și o înregistrează în jurnalul criptografic. Respinge →
              notifică, dar nu modifică nimic.
            </p>
          </div>
        </div>
      </header>

      {/* Stats row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: 10,
          marginBottom: 20,
        }}
      >
        <StatCard label="În așteptare" value={counts.pending} accent="#fbbf24" icon={<Clock size={14} />} />
        <StatCard label="Aprobate" value={counts.approved} accent="#34d399" icon={<CheckCircle2 size={14} />} />
        <StatCard label="Respinse" value={counts.rejected} accent="#f87171" icon={<XCircle size={14} />} />
        <StatCard label="Retrase" value={counts.withdrawn} accent="#94a3b8" icon={<X size={14} />} />
        <StatCard label="Total" value={counts.total} accent="#60a5fa" icon={<ShieldCheck size={14} />} />
      </div>

      {/* Tabs + refresh */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
        {TAB_ORDER.map((t) => {
          const isActive = tab === t.key
          const count = t.key === "all" ? counts.total : (counts as Record<string, number>)[t.key as string] ?? 0
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`cr-tab ${isActive ? "is-active" : ""}`}
            >
              {t.label}
              <span className="cr-tab__count">· {count}</span>
            </button>
          )
        })}
        <div style={{ marginLeft: "auto" }}>
          <button
            onClick={() => void refresh()}
            className="cr-btn cr-btn--secondary cr-btn--sm"
          >
            <RefreshCw size={12} />
            Reîmprospătează
          </button>
        </div>
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

      {/* List */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {visibleRequests.length === 0 && (
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
            <Filter size={20} style={{ marginBottom: 6, opacity: 0.6 }} />
            <div>Nicio cerere în această categorie.</div>
          </div>
        )}
        {visibleRequests.map((r) => {
          const isExpanded = expandedId === r.id
          const badge = STATUS_BADGE[r.status]
          const isDeciding = decisionLoading === r.id
          const href = ENTITY_HREF[r.entityType]
          return (
            <div
              key={r.id}
              style={{
                border: "1px solid var(--border)",
                borderRadius: 8,
                background: "var(--bg-elev)",
              }}
            >
              <button
                type="button"
                onClick={() => setExpandedId(isExpanded ? null : r.id)}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  border: "none",
                  background: "transparent",
                  textAlign: "left",
                  cursor: "pointer",
                  display: "grid",
                  gridTemplateColumns: "auto 1fr auto auto auto",
                  gap: 12,
                  alignItems: "center",
                  color: "var(--ink)",
                }}
              >
                <span
                  style={{
                    fontSize: 10,
                    padding: "2px 8px",
                    borderRadius: 99,
                    background: "rgba(96,165,250,0.12)",
                    color: "#60a5fa",
                    whiteSpace: "nowrap",
                  }}
                >
                  {ENTITY_LABEL_RO[r.entityType] ?? r.entityType}
                </span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: "var(--ink)", marginBottom: 2 }}>
                    {r.title}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--ink-dim)" }}>
                    {r.requestedByEmail} · {formatRelative(r.requestedAtISO, nowMs)}
                  </div>
                </div>
                <span
                  style={{
                    fontSize: 10,
                    padding: "3px 8px",
                    borderRadius: 99,
                    background: badge.bg,
                    color: badge.fg,
                    whiteSpace: "nowrap",
                  }}
                >
                  {badge.label}
                </span>
                {r.expiresAtISO && r.status === "pending" && (
                  <span style={{ fontSize: 10, color: "var(--ink-dim)", whiteSpace: "nowrap" }}>
                    expiră {formatRelative(r.expiresAtISO, nowMs)}
                  </span>
                )}
                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              {isExpanded && (
                <div style={{ borderTop: "1px solid var(--border-soft)", padding: "14px 16px" }}>
                  {r.description && (
                    <div style={{ marginBottom: 12 }}>
                      <Label>Descriere</Label>
                      <div style={{ fontSize: 13, color: "var(--ink)", lineHeight: 1.55 }}>
                        {r.description}
                      </div>
                    </div>
                  )}
                  <div style={{ marginBottom: 12 }}>
                    <Label>Schimbare propusă (JSON)</Label>
                    <pre
                      style={{
                        fontSize: 11,
                        color: "var(--ink)",
                        background: "var(--bg-sidebar)",
                        padding: "10px 12px",
                        borderRadius: 6,
                        border: "1px solid var(--border-soft)",
                        overflowX: "auto",
                        margin: 0,
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                      }}
                    >
                      {JSON.stringify(r.proposedChange ?? {}, null, 2)}
                    </pre>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                    <KeyVal k="Entitate" v={`${ENTITY_LABEL_RO[r.entityType] ?? r.entityType} · ${r.entityId}`} />
                    <KeyVal k="Cerere de la" v={`${r.requestedByEmail} (${r.requestedByRole})`} />
                    <KeyVal k="Creată" v={formatAbsolute(r.requestedAtISO)} />
                    {r.expiresAtISO && <KeyVal k="Expirare" v={formatAbsolute(r.expiresAtISO)} />}
                    {r.reviewedAtISO && (
                      <KeyVal k="Decisă" v={`${r.reviewedByEmail ?? "?"} · ${formatAbsolute(r.reviewedAtISO)}`} />
                    )}
                    {r.reviewComment && <KeyVal k="Comentariu reviewer" v={r.reviewComment} />}
                    {r.notes && <KeyVal k="Note" v={r.notes} />}
                  </div>

                  {r.status === "pending" && (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 10,
                        marginTop: 14,
                        paddingTop: 12,
                        borderTop: "1px dashed var(--border-soft)",
                      }}
                    >
                      <textarea
                        value={comments[r.id] ?? ""}
                        onChange={(e) => setComments((prev) => ({ ...prev, [r.id]: e.target.value }))}
                        placeholder="Comentariu pentru audit trail (opțional)…"
                        rows={2}
                        style={{
                          fontSize: 12,
                          color: "var(--ink)",
                          background: "var(--bg-sidebar)",
                          border: "1px solid var(--border)",
                          borderRadius: 6,
                          padding: "8px 10px",
                          fontFamily: "inherit",
                          resize: "vertical",
                        }}
                      />
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button
                          type="button"
                          onClick={() => void decide(r.id, "approve")}
                          disabled={isDeciding}
                          className="cr-btn cr-btn--success cr-btn--sm"
                          style={{ cursor: isDeciding ? "wait" : "pointer" }}
                        >
                          {isDeciding ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> : <CheckCircle2 size={12} />}
                          Aprobă și aplică
                        </button>
                        <button
                          type="button"
                          onClick={() => void decide(r.id, "reject")}
                          disabled={isDeciding}
                          className="cr-btn cr-btn--danger cr-btn--sm"
                          style={{ cursor: isDeciding ? "wait" : "pointer" }}
                        >
                          <XCircle size={12} />
                          Respinge
                        </button>
                        <button
                          type="button"
                          onClick={() => void decide(r.id, "withdraw")}
                          disabled={isDeciding}
                          className="cr-btn cr-btn--secondary cr-btn--sm"
                          style={{ cursor: isDeciding ? "wait" : "pointer" }}
                        >
                          Retrage
                        </button>
                        {href && (
                          <a
                            href={href}
                            className="cr-btn cr-btn--secondary cr-btn--sm"
                            style={{ marginLeft: "auto", textDecoration: "none" }}
                          >
                            Deschide modul →
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  accent,
  icon,
}: {
  label: string
  value: number
  accent: string
  icon?: React.ReactNode
}) {
  return (
    <div
      style={{
        padding: "12px 14px",
        borderRadius: 8,
        background: "var(--bg-elev)",
        border: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: "var(--ink-dim)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
        <span style={{ color: accent, display: "inline-flex" }}>{icon}</span>
        {label}
      </div>
      <div style={{ fontSize: 22, color: "var(--ink)", fontWeight: 600, fontFamily: "var(--font-display-v3)" }}>{value}</div>
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 10, color: "var(--ink-dim)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
      {children}
    </div>
  )
}

function KeyVal({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: "var(--ink-dim)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>
        {k}
      </div>
      <div style={{ fontSize: 12, color: "var(--ink)" }}>{v}</div>
    </div>
  )
}
