"use client"

/**
 * Sprint 008B — /dashboard/resolve cockpit
 *
 * Central place pentru risc-uri active. Filtre pe status + severitate +
 * categorie. Click pe rand -> expand inline cu detalii, dovezi, actiuni
 * lifecycle, audit trail mini per finding.
 *
 * Style: inline + v3 design tokens, fara shadcn / Tailwind utilities.
 */

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Eye,
  FileText,
  HelpCircle,
  Link2,
  Loader2,
  Plus,
  RotateCcw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react"

import type {
  ComplianceEvent,
  FindingCategory,
  ScanFinding,
} from "@/lib/compliance/types"
import type { ComplianceSeverity } from "@/lib/compliance/constitution"

// ────────────────────────────────────────────────────────────────────────────
//   Labels / colors
// ────────────────────────────────────────────────────────────────────────────

type StatusKey =
  | "open"
  | "confirmed"
  | "dismissed"
  | "resolved"
  | "under_monitoring"

const STATUS_LABELS: Record<StatusKey, string> = {
  open: "Deschis",
  confirmed: "Confirmat",
  dismissed: "Respins",
  resolved: "Rezolvat",
  under_monitoring: "Monitorizare",
}

const STATUS_COLORS: Record<StatusKey, { bg: string; fg: string }> = {
  open: { bg: "rgba(96,165,250,0.12)", fg: "#60a5fa" },
  confirmed: { bg: "rgba(251,191,36,0.14)", fg: "#fbbf24" },
  dismissed: { bg: "rgba(148,163,184,0.16)", fg: "#94a3b8" },
  resolved: { bg: "rgba(52,211,153,0.14)", fg: "#34d399" },
  under_monitoring: { bg: "rgba(168,85,247,0.14)", fg: "#a855f7" },
}

const SEVERITY_LABELS: Record<ComplianceSeverity, string> = {
  critical: "Critic",
  high: "Inalt",
  medium: "Mediu",
  low: "Scazut",
}

const SEVERITY_COLORS: Record<ComplianceSeverity, { bg: string; fg: string }> = {
  critical: { bg: "rgba(248,113,113,0.18)", fg: "#f87171" },
  high: { bg: "rgba(251,146,60,0.16)", fg: "#fb923c" },
  medium: { bg: "rgba(251,191,36,0.14)", fg: "#fbbf24" },
  low: { bg: "rgba(96,165,250,0.10)", fg: "#60a5fa" },
}

// E_FACTURA: legacy union value preserved în types pentru migrare din state-uri
// vechi CompliAI; nu mai apare în UI CompliRoAI (mandate Rule 3 — no fiscal).
const CATEGORY_LABELS: Record<FindingCategory, string> = {
  EU_AI_ACT: "AI Act",
  GDPR: "GDPR",
  NIS2: "NIS2",
  E_FACTURA: "Legacy",
}

type Stats = {
  total: number
  open: number
  confirmed: number
  resolved: number
  dismissed: number
  under_monitoring: number
  critical: number
  high: number
  medium: number
  low: number
}

type ListResponse = { findings: ScanFinding[]; stats: Stats }

type StatusFilter = "all" | StatusKey
type SeverityFilter = "all" | ComplianceSeverity

// ────────────────────────────────────────────────────────────────────────────
//   Page
// ────────────────────────────────────────────────────────────────────────────

export default function ResolvePage() {
  const [findings, setFindings] = useState<ScanFinding[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("open")
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("all")
  const [categoryFilter, setCategoryFilter] = useState<"all" | FindingCategory>(
    "all",
  )
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [events, setEvents] = useState<ComplianceEvent[]>([])

  const load = useCallback(async () => {
    try {
      const [resFindings, resAudit] = await Promise.all([
        fetch("/api/findings"),
        fetch("/api/findings/audit-trail"),
      ])
      if (!resFindings.ok) {
        setError("Nu am putut incarca risc-urile.")
        return
      }
      const data = (await resFindings.json()) as ListResponse
      setFindings(data.findings)
      setStats(data.stats)
      if (resAudit.ok) {
        const audit = (await resAudit.json()) as { events: ComplianceEvent[] }
        setEvents(audit.events ?? [])
      }
      setError(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  // Per mandate Rule 3 — no fiscal/e-Factura surface în UI. Categoria E_FACTURA
  // rămâne în type union pentru migrare state legacy, dar nu se mai expune ca
  // filter chip pentru utilizatori. Findings legacy E_FACTURA, dacă există,
  // pot fi văzute selectând "Toate" și rezolvate normal.
  const filtered = useMemo(() => {
    return findings.filter((f) => {
      const status = (f.findingStatus ?? "open") as StatusKey
      if (statusFilter !== "all" && status !== statusFilter) return false
      if (severityFilter !== "all" && f.severity !== severityFilter) return false
      if (categoryFilter !== "all" && f.category !== categoryFilter) return false
      return true
    })
  }, [findings, statusFilter, severityFilter, categoryFilter])

  async function handleAction(id: string, action: string) {
    const res = await fetch(`/api/findings/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action }),
    })
    if (res.ok) await load()
  }

  async function handleAttachEvidence(
    id: string,
    payload: { note: string; url?: string; fileName?: string },
  ) {
    const res = await fetch(`/api/findings/${id}/evidence`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const d = await res.json().catch(() => ({ error: "Eroare necunoscuta" }))
      throw new Error(d.error || "Nu am putut atasa dovada.")
    }
    await load()
  }

  async function handleDelete(id: string) {
    if (!confirm("Stergi acest risc? Actiunea este permanenta si va aparea in audit trail.")) return
    const res = await fetch(`/api/findings/${id}`, { method: "DELETE" })
    if (res.ok) {
      if (expandedId === id) setExpandedId(null)
      await load()
    }
  }

  async function handleCreate(input: CreateFindingInput) {
    const res = await fetch("/api/findings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: "Eroare necunoscuta" }))
      throw new Error(data.error || "Nu am putut crea risc-ul.")
    }
    await load()
    setShowCreate(false)
  }

  async function handleShare(id: string): Promise<string> {
    const res = await fetch(`/api/findings/${id}/share`, { method: "POST" })
    if (!res.ok) throw new Error("Nu am putut genera link-ul de share.")
    const d = (await res.json()) as { shareUrl: string }
    return d.shareUrl
  }

  return (
    <div
      style={{
        padding: "32px",
        maxWidth: "1100px",
        display: "flex",
        flexDirection: "column",
        gap: "24px",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", flexWrap: "wrap" }}>
        <div>
          <h1
            style={{
              fontFamily: "var(--font-display-v3)",
              fontSize: "22px",
              fontWeight: 600,
              color: "var(--ink)",
              margin: 0,
              letterSpacing: "-0.02em",
            }}
          >
            De rezolvat
          </h1>
          <p style={{ fontSize: "13px", color: "var(--ink-muted)", marginTop: "6px" }}>
            Toate risc-urile active aici. Confirma, atasaza dovada, marcheaza rezolvat.
          </p>
        </div>
        <Link
          href="/dashboard/resolve/support"
          style={{
            ...btnGhost,
            padding: "6px 12px",
            fontSize: "12px",
            color: "var(--ink-muted)",
            textDecoration: "none",
          }}
        >
          <HelpCircle size={13} /> Ghid lifecycle
        </Link>
      </div>

      {/* Stats */}
      {stats && <StatsBar stats={stats} />}

      {/* Error */}
      {error && (
        <div
          style={{
            display: "flex",
            gap: "12px",
            padding: "12px 16px",
            background: "var(--red-soft)",
            borderRadius: "8px",
            border: "1px solid rgba(248,113,113,0.2)",
            color: "#f87171",
            fontSize: "13px",
          }}
        >
          <AlertCircle size={16} style={{ flexShrink: 0, marginTop: "1px" }} />
          {error}
        </div>
      )}

      {/* Filters + CTA */}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <StatusTabs value={statusFilter} stats={stats} onChange={setStatusFilter} />
          <button onClick={() => setShowCreate(true)} style={btnPrimary}>
            <Plus size={14} /> Adauga risc manual
          </button>
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
          <FilterChips
            label="Severitate"
            items={[
              { key: "all", label: "Toate" },
              { key: "critical", label: SEVERITY_LABELS.critical, color: SEVERITY_COLORS.critical.fg },
              { key: "high", label: SEVERITY_LABELS.high, color: SEVERITY_COLORS.high.fg },
              { key: "medium", label: SEVERITY_LABELS.medium, color: SEVERITY_COLORS.medium.fg },
              { key: "low", label: SEVERITY_LABELS.low, color: SEVERITY_COLORS.low.fg },
            ]}
            value={severityFilter}
            onChange={(v) => setSeverityFilter(v as SeverityFilter)}
          />
          <FilterChips
            label="Categorie"
            items={[
              { key: "all", label: "Toate" },
              { key: "EU_AI_ACT", label: CATEGORY_LABELS.EU_AI_ACT },
              { key: "GDPR", label: CATEGORY_LABELS.GDPR },
              { key: "NIS2", label: CATEGORY_LABELS.NIS2 },
            ]}
            value={categoryFilter}
            onChange={(v) => setCategoryFilter(v as "all" | FindingCategory)}
          />
        </div>
      </div>

      {/* Create modal */}
      {showCreate && (
        <CreateModal onClose={() => setShowCreate(false)} onSubmit={handleCreate} />
      )}

      {/* List */}
      {loading ? (
        <div style={{ fontSize: "13px", color: "var(--ink-dim)", padding: "24px 0" }}>
          Se incarca risc-urile...
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState hasAny={findings.length > 0} onCreate={() => setShowCreate(true)} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {filtered.map((f) => (
            <FindingRow
              key={f.id}
              finding={f}
              expanded={expandedId === f.id}
              onToggle={() => setExpandedId((p) => (p === f.id ? null : f.id))}
              onAction={(a) => handleAction(f.id, a)}
              onDelete={() => handleDelete(f.id)}
              onAttachEvidence={(p) => handleAttachEvidence(f.id, p)}
              onShare={() => handleShare(f.id)}
              relatedEvents={events.filter((e) => e.entityId === f.id).slice(0, 5)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
//   Stats bar
// ────────────────────────────────────────────────────────────────────────────

function StatsBar({ stats }: { stats: Stats }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
        gap: "10px",
      }}
    >
      <StatCard label="Total" value={stats.total} />
      <StatCard label="Active" value={stats.open + stats.confirmed + stats.under_monitoring} accent="cobalt" />
      <StatCard label="Critice" value={stats.critical} accent={stats.critical > 0 ? "red" : undefined} />
      <StatCard label="Inalte" value={stats.high} accent={stats.high > 0 ? "amber" : undefined} />
      <StatCard label="Rezolvate" value={stats.resolved} />
    </div>
  )
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string
  value: number
  accent?: "cobalt" | "amber" | "red"
}) {
  const accentColor =
    accent === "amber"
      ? "#fbbf24"
      : accent === "red"
        ? "#f87171"
        : accent === "cobalt"
          ? "var(--cobalt-400)"
          : "var(--ink)"
  return (
    <div
      style={{
        padding: "14px 16px",
        background: "var(--surface-1)",
        borderRadius: "10px",
        border: "1px solid var(--border-soft)",
      }}
    >
      <div
        style={{
          fontSize: "10px",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: "var(--ink-dim)",
          marginBottom: "6px",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: "22px",
          fontWeight: 600,
          color: accentColor,
          fontFamily: "var(--font-display-v3)",
        }}
      >
        {value}
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
//   Status tabs + filter chips
// ────────────────────────────────────────────────────────────────────────────

function StatusTabs({
  value,
  stats,
  onChange,
}: {
  value: StatusFilter
  stats: Stats | null
  onChange: (v: StatusFilter) => void
}) {
  const tabs: Array<{ key: StatusFilter; label: string; count: number }> = [
    { key: "all", label: "Toate", count: stats?.total ?? 0 },
    { key: "open", label: STATUS_LABELS.open, count: stats?.open ?? 0 },
    { key: "confirmed", label: STATUS_LABELS.confirmed, count: stats?.confirmed ?? 0 },
    { key: "under_monitoring", label: STATUS_LABELS.under_monitoring, count: stats?.under_monitoring ?? 0 },
    { key: "resolved", label: STATUS_LABELS.resolved, count: stats?.resolved ?? 0 },
    { key: "dismissed", label: STATUS_LABELS.dismissed, count: stats?.dismissed ?? 0 },
  ]
  return (
    <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
      {tabs.map((t) => {
        const active = t.key === value
        return (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 12px",
              fontSize: "12px",
              fontWeight: active ? 600 : 500,
              color: active ? "var(--cobalt-400)" : "var(--ink-muted)",
              background: active ? "rgba(96,165,250,0.10)" : "transparent",
              border: "1px solid",
              borderColor: active ? "rgba(96,165,250,0.3)" : "var(--border-soft)",
              borderRadius: "999px",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            {t.label}
            <span style={{ fontSize: "11px", color: "var(--ink-dim)", fontVariantNumeric: "tabular-nums" }}>
              {t.count}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function FilterChips({
  label,
  items,
  value,
  onChange,
}: {
  label: string
  items: Array<{ key: string; label: string; color?: string }>
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
      <span
        style={{
          fontSize: "10px",
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: "var(--ink-dim)",
        }}
      >
        {label}
      </span>
      {items.map((item) => {
        const active = item.key === value
        return (
          <button
            key={item.key}
            onClick={() => onChange(item.key)}
            style={{
              padding: "4px 10px",
              fontSize: "11px",
              fontWeight: active ? 600 : 500,
              color: active ? (item.color ?? "var(--ink)") : "var(--ink-muted)",
              background: active ? "var(--surface-2)" : "transparent",
              border: "1px solid var(--border-soft)",
              borderRadius: "999px",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
//   Empty state
// ────────────────────────────────────────────────────────────────────────────

function EmptyState({ hasAny, onCreate }: { hasAny: boolean; onCreate: () => void }) {
  return (
    <div
      style={{
        padding: "40px 24px",
        background: "var(--surface-1)",
        borderRadius: "10px",
        border: "1px dashed var(--border-soft)",
        textAlign: "center",
      }}
    >
      <ShieldCheck size={28} style={{ color: "#34d399", margin: "0 auto 12px" }} />
      <div style={{ fontSize: "14px", fontWeight: 500, color: "var(--ink)", marginBottom: "6px" }}>
        {hasAny ? "Niciun risc in acest filtru" : "Nu exista risc-uri active"}
      </div>
      <div
        style={{
          fontSize: "12px",
          color: "var(--ink-muted)",
          marginBottom: "16px",
          maxWidth: "440px",
          margin: "0 auto 16px",
        }}
      >
        {hasAny
          ? "Schimba filtrul sau reseteaza la \"Toate\"."
          : "Ruleaza discovery / DPIA screening sau adauga manual un risc identificat ca sa-l inregistrezi in registru."}
      </div>
      {!hasAny && (
        <button onClick={onCreate} style={btnPrimary}>
          <Plus size={14} /> Adauga primul risc
        </button>
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
//   Finding row + expanded detail
// ────────────────────────────────────────────────────────────────────────────

function FindingRow({
  finding,
  expanded,
  onToggle,
  onAction,
  onDelete,
  onAttachEvidence,
  onShare,
  relatedEvents,
}: {
  finding: ScanFinding
  expanded: boolean
  onToggle: () => void
  onAction: (action: string) => void
  onDelete: () => void
  onAttachEvidence: (p: { note: string; url?: string; fileName?: string }) => Promise<void>
  onShare: () => Promise<string>
  relatedEvents: ComplianceEvent[]
}) {
  const status = (finding.findingStatus ?? "open") as StatusKey
  const sev = finding.severity
  const statusColor = STATUS_COLORS[status]
  const sevColor = SEVERITY_COLORS[sev]

  return (
    <div
      style={{
        background: "var(--surface-1)",
        borderRadius: "10px",
        border: "1px solid var(--border-soft)",
        overflow: "hidden",
      }}
    >
      <button
        onClick={onToggle}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "14px",
          padding: "14px 16px",
          width: "100%",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
          color: "var(--ink)",
        }}
      >
        {/* Severity icon */}
        <SeverityIcon severity={sev} />

        {/* Title + tags */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <span
              style={{
                fontSize: "14px",
                fontWeight: 500,
                color: "var(--ink)",
              }}
            >
              {finding.title}
            </span>
            <Badge bg={sevColor.bg} fg={sevColor.fg}>{SEVERITY_LABELS[sev]}</Badge>
            <Badge bg="var(--surface-2)" fg="var(--ink-muted)">{CATEGORY_LABELS[finding.category]}</Badge>
            <Badge bg={statusColor.bg} fg={statusColor.fg}>{STATUS_LABELS[status]}</Badge>
          </div>
          <div
            style={{
              fontSize: "11px",
              color: "var(--ink-dim)",
              marginTop: "3px",
              display: "flex",
              gap: "8px",
              flexWrap: "wrap",
            }}
          >
            <span title={new Date(finding.createdAtISO).toLocaleString("ro-RO")}>
              {timeAgo(finding.createdAtISO)}
            </span>
            {finding.ownerSuggestion && (
              <>
                <span>·</span>
                <span>Owner: {finding.ownerSuggestion}</span>
              </>
            )}
            {finding.legalReference && (
              <>
                <span>·</span>
                <span>{finding.legalReference}</span>
              </>
            )}
          </div>
        </div>

        {expanded ? (
          <ChevronUp size={16} style={{ color: "var(--ink-dim)", flexShrink: 0 }} />
        ) : (
          <ChevronDown size={16} style={{ color: "var(--ink-dim)", flexShrink: 0 }} />
        )}
      </button>

      {expanded && (
        <ExpandedDetail
          finding={finding}
          relatedEvents={relatedEvents}
          onAction={onAction}
          onDelete={onDelete}
          onAttachEvidence={onAttachEvidence}
          onShare={onShare}
        />
      )}
    </div>
  )
}

function SeverityIcon({ severity }: { severity: ComplianceSeverity }) {
  const color = SEVERITY_COLORS[severity].fg
  if (severity === "critical") return <ShieldAlert size={18} style={{ color, flexShrink: 0 }} />
  if (severity === "high") return <AlertTriangle size={18} style={{ color, flexShrink: 0 }} />
  if (severity === "medium") return <AlertCircle size={18} style={{ color, flexShrink: 0 }} />
  return <Shield size={18} style={{ color, flexShrink: 0 }} />
}

function Badge({ bg, fg, children }: { bg: string; fg: string; children: React.ReactNode }) {
  return (
    <span
      style={{
        fontSize: "10px",
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        padding: "2px 8px",
        borderRadius: "999px",
        background: bg,
        color: fg,
      }}
    >
      {children}
    </span>
  )
}

// ────────────────────────────────────────────────────────────────────────────
//   Expanded detail
// ────────────────────────────────────────────────────────────────────────────

function ExpandedDetail({
  finding,
  relatedEvents,
  onAction,
  onDelete,
  onAttachEvidence,
  onShare,
}: {
  finding: ScanFinding
  relatedEvents: ComplianceEvent[]
  onAction: (a: string) => void
  onDelete: () => void
  onAttachEvidence: (p: { note: string; url?: string; fileName?: string }) => Promise<void>
  onShare: () => Promise<string>
}) {
  const status = (finding.findingStatus ?? "open") as StatusKey
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [sharing, setSharing] = useState(false)
  const [copied, setCopied] = useState(false)

  async function copyShare() {
    const url = shareUrl ?? (await doShare())
    if (!url) return
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  async function doShare(): Promise<string | null> {
    setSharing(true)
    try {
      const url = await onShare()
      setShareUrl(url)
      return url
    } catch (e) {
      alert(e instanceof Error ? e.message : "Eroare share")
      return null
    } finally {
      setSharing(false)
    }
  }

  return (
    <div
      style={{
        borderTop: "1px solid var(--border-soft)",
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "20px",
        background: "var(--surface-0)",
      }}
    >
      {/* Detail / resolution */}
      <div>
        <SectionLabel>Problema</SectionLabel>
        <p style={paragraphStyle}>{finding.resolution?.problem ?? finding.detail}</p>
        {finding.resolution?.impact && (
          <>
            <SectionLabel>Impact</SectionLabel>
            <p style={paragraphStyle}>{finding.resolution.impact}</p>
          </>
        )}
        {(finding.resolution?.action ?? finding.remediationHint) && (
          <>
            <SectionLabel>Actiune recomandata</SectionLabel>
            <p style={paragraphStyle}>
              {finding.resolution?.action ?? finding.remediationHint}
            </p>
          </>
        )}
      </div>

      {/* Legal reference */}
      {(finding.legalReference || (finding.legalMappings && finding.legalMappings.length > 0)) && (
        <div>
          <SectionLabel>Referinta legala</SectionLabel>
          {finding.legalReference && (
            <p style={paragraphStyle}>{finding.legalReference}</p>
          )}
          {finding.legalMappings?.map((m, i) => (
            <div
              key={i}
              style={{
                fontSize: "11px",
                color: "var(--ink-muted)",
                marginTop: "4px",
                padding: "8px 10px",
                background: "var(--surface-1)",
                borderRadius: "6px",
                border: "1px solid var(--border-soft)",
              }}
            >
              <strong style={{ color: "var(--ink)" }}>
                {m.regulation} · {m.article}
              </strong>{" "}
              — {m.label}
              <div style={{ fontSize: "11px", color: "var(--ink-dim)", marginTop: "3px" }}>
                {m.reason}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lifecycle stats */}
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
        {typeof finding.confidenceScore === "number" && (
          <MetaPill label="Confidence" value={`${finding.confidenceScore}%`} />
        )}
        {finding.driftStatus && (
          <MetaPill label="Drift" value={finding.driftStatus} />
        )}
        {finding.nextMonitoringDateISO && (
          <MetaPill
            label="Urmatoarea monitorizare"
            value={new Date(finding.nextMonitoringDateISO).toLocaleDateString("ro-RO")}
          />
        )}
        {finding.findingStatusUpdatedAtISO && (
          <MetaPill
            label="Ultima actualizare"
            value={timeAgo(finding.findingStatusUpdatedAtISO)}
          />
        )}
      </div>

      {/* Close condition + required evidence */}
      {(finding.closeCondition || (finding.requiredEvidenceKinds && finding.requiredEvidenceKinds.length > 0) || finding.evidenceRequired) && (
        <div>
          <SectionLabel>Conditii de inchidere</SectionLabel>
          {finding.closeCondition && <p style={paragraphStyle}>{finding.closeCondition}</p>}
          {finding.evidenceRequired && <p style={paragraphStyle}>{finding.evidenceRequired}</p>}
          {finding.requiredEvidenceKinds && finding.requiredEvidenceKinds.length > 0 && (
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "6px" }}>
              {finding.requiredEvidenceKinds.map((k) => (
                <Badge key={k} bg="var(--surface-2)" fg="var(--ink-muted)">
                  {k}
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div>
        <SectionLabel>Actiuni</SectionLabel>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "10px" }}>
          <ActionButton
            onClick={() => onAction("confirm")}
            disabled={status === "confirmed" || status === "resolved"}
            variant="primary"
          >
            <CheckCircle2 size={12} /> Confirma
          </ActionButton>
          <ActionButton
            onClick={() => onAction("dismiss")}
            disabled={status === "dismissed"}
            variant="default"
          >
            <X size={12} /> Respinge
          </ActionButton>
          <ActionButton
            onClick={() => onAction("resolve")}
            disabled={status === "resolved"}
            variant="primary"
          >
            <ShieldCheck size={12} /> Marcheaza rezolvat
          </ActionButton>
          <ActionButton
            onClick={() => onAction("monitor")}
            disabled={status === "under_monitoring"}
            variant="default"
          >
            <Eye size={12} /> Pune in monitorizare
          </ActionButton>
          <ActionButton
            onClick={() => onAction("reopen")}
            disabled={status === "open"}
            variant="default"
          >
            <RotateCcw size={12} /> Redeschide
          </ActionButton>
          <ActionButton
            onClick={copyShare}
            disabled={sharing}
            variant="default"
          >
            {sharing ? <Loader2 size={12} className="animate-spin" /> : <Link2 size={12} />}
            {copied ? "Copiat" : shareUrl ? "Copiaza link" : "Genereaza share"}
          </ActionButton>
        </div>
      </div>

      {/* Evidence */}
      <EvidenceSection
        finding={finding}
        onAttach={onAttachEvidence}
      />

      {/* Audit trail mini */}
      {relatedEvents.length > 0 && (
        <div>
          <SectionLabel>Audit trail (ultimele 5)</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "10px" }}>
            {relatedEvents.map((e) => (
              <div
                key={e.id}
                style={{
                  fontSize: "11px",
                  color: "var(--ink-muted)",
                  padding: "8px 10px",
                  background: "var(--surface-1)",
                  borderRadius: "6px",
                  border: "1px solid var(--border-soft)",
                  display: "flex",
                  gap: "10px",
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <span
                  style={{
                    fontSize: "10px",
                    color: "var(--ink-dim)",
                    fontVariantNumeric: "tabular-nums",
                    minWidth: "100px",
                  }}
                >
                  {new Date(e.createdAtISO).toLocaleString("ro-RO")}
                </span>
                <span
                  style={{
                    fontFamily: "ui-monospace, SFMono-Regular, monospace",
                    fontSize: "10px",
                    color: "var(--cobalt-400)",
                    background: "rgba(96,165,250,0.08)",
                    padding: "2px 6px",
                    borderRadius: "4px",
                  }}
                >
                  {e.type}
                </span>
                <span style={{ color: "var(--ink)" }}>{e.message}</span>
                {e.actorLabel && (
                  <span style={{ marginLeft: "auto", fontSize: "10px", color: "var(--ink-dim)" }}>
                    {e.actorLabel}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Provenance + footer */}
      {finding.provenance && (
        <div
          style={{
            fontSize: "11px",
            color: "var(--ink-dim)",
            fontFamily: "ui-monospace, SFMono-Regular, monospace",
            padding: "8px 10px",
            background: "var(--surface-1)",
            borderRadius: "6px",
            border: "1px solid var(--border-soft)",
          }}
        >
          ruleId: {finding.provenance.ruleId}
          {finding.provenance.signalSource && ` · src: ${finding.provenance.signalSource}`}
          {finding.provenance.verdictBasis && ` · basis: ${finding.provenance.verdictBasis}`}
          {finding.provenance.signalConfidence && ` · conf: ${finding.provenance.signalConfidence}`}
        </div>
      )}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          paddingTop: "10px",
          borderTop: "1px solid var(--border-soft)",
          fontSize: "11px",
          color: "var(--ink-dim)",
          flexWrap: "wrap",
        }}
      >
        <span>Creat {new Date(finding.createdAtISO).toLocaleString("ro-RO")}</span>
        <span>·</span>
        <span>ID: {finding.id}</span>
        <button
          onClick={onDelete}
          style={{
            ...btnGhost,
            marginLeft: "auto",
            color: "#f87171",
          }}
        >
          <Trash2 size={11} /> Sterge
        </button>
      </div>
    </div>
  )
}

function MetaPill({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        fontSize: "11px",
        color: "var(--ink-muted)",
        padding: "5px 10px",
        background: "var(--surface-1)",
        borderRadius: "999px",
        border: "1px solid var(--border-soft)",
      }}
    >
      <span style={{ fontWeight: 600, color: "var(--ink-dim)", marginRight: "4px" }}>{label}:</span>
      {value}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
//   Evidence section
// ────────────────────────────────────────────────────────────────────────────

function EvidenceSection({
  finding,
  onAttach,
}: {
  finding: ScanFinding
  onAttach: (p: { note: string; url?: string; fileName?: string }) => Promise<void>
}) {
  const [note, setNote] = useState("")
  const [url, setUrl] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function handleSubmit() {
    setErr(null)
    if (!note.trim()) {
      setErr("Adauga o nota explicativa.")
      return
    }
    setSubmitting(true)
    try {
      await onAttach({
        note: note.trim(),
        url: url.trim() || undefined,
      })
      setNote("")
      setUrl("")
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Eroare necunoscuta")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <SectionLabel>Dovezi</SectionLabel>
      {finding.operationalEvidenceNote ? (
        <pre
          style={{
            fontSize: "11px",
            color: "var(--ink)",
            background: "var(--surface-1)",
            padding: "10px 12px",
            borderRadius: "6px",
            border: "1px solid var(--border-soft)",
            marginTop: "10px",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            fontFamily: "ui-monospace, SFMono-Regular, monospace",
            maxHeight: "160px",
            overflow: "auto",
          }}
        >
          {finding.operationalEvidenceNote}
        </pre>
      ) : (
        <div style={{ fontSize: "11px", color: "var(--ink-dim)", marginTop: "10px" }}>
          Nicio dovada inregistrata. Adauga mai jos.
        </div>
      )}

      <div
        style={{
          marginTop: "12px",
          padding: "12px",
          background: "var(--surface-1)",
          borderRadius: "8px",
          border: "1px solid var(--border-soft)",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        }}
      >
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Nota dovada (obligatoriu): ce ai facut, link, screenshot, observatie..."
          rows={2}
          style={{ ...inputStyle, fontFamily: "inherit", resize: "vertical" }}
        />
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="URL document (optional): https://..."
          style={inputStyle}
        />
        {err && (
          <div style={{ fontSize: "11px", color: "#f87171" }}>{err}</div>
        )}
        <button onClick={handleSubmit} disabled={submitting} style={btnSecondary}>
          {submitting ? (
            <>
              <Loader2 size={12} className="animate-spin" /> Se ataseaza...
            </>
          ) : (
            <>
              <FileText size={12} /> Ataseaza dovada
            </>
          )}
        </button>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
//   Create modal
// ────────────────────────────────────────────────────────────────────────────

type CreateFindingInput = {
  title: string
  detail: string
  category: FindingCategory
  severity: ComplianceSeverity
  legalReference?: string
  ownerSuggestion?: string
}

function CreateModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void
  onSubmit: (input: CreateFindingInput) => Promise<void>
}) {
  const [title, setTitle] = useState("")
  const [detail, setDetail] = useState("")
  const [category, setCategory] = useState<FindingCategory>("GDPR")
  const [severity, setSeverity] = useState<ComplianceSeverity>("medium")
  const [legalReference, setLegalReference] = useState("")
  const [ownerSuggestion, setOwnerSuggestion] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function handleSubmit() {
    setErr(null)
    if (!title.trim() || !detail.trim()) {
      setErr("Titlul si descrierea sunt obligatorii.")
      return
    }
    setSubmitting(true)
    try {
      await onSubmit({
        title: title.trim(),
        detail: detail.trim(),
        category,
        severity,
        legalReference: legalReference.trim() || undefined,
        ownerSuggestion: ownerSuggestion.trim() || undefined,
      })
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Eroare necunoscuta")
      setSubmitting(false)
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        zIndex: 50,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--surface-1)",
          borderRadius: "12px",
          border: "1px solid var(--border-soft)",
          maxWidth: "560px",
          width: "100%",
          maxHeight: "90vh",
          overflow: "auto",
          padding: "24px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2
            style={{
              fontFamily: "var(--font-display-v3)",
              fontSize: "16px",
              fontWeight: 600,
              color: "var(--ink)",
              margin: 0,
            }}
          >
            Risc manual nou
          </h2>
          <button onClick={onClose} style={{ ...btnGhost, padding: "4px" }}>
            <X size={16} />
          </button>
        </div>

        <Field label="Titlu *">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Provider AI fara DPA semnat"
            style={inputStyle}
          />
        </Field>

        <Field label="Descriere problema *">
          <textarea
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            rows={3}
            placeholder="Ce ai observat, de ce e o problema..."
            style={{ ...inputStyle, fontFamily: "inherit", resize: "vertical" }}
          />
        </Field>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <Field label="Categorie">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as FindingCategory)}
              style={inputStyle}
            >
              <option value="EU_AI_ACT">{CATEGORY_LABELS.EU_AI_ACT}</option>
              <option value="GDPR">{CATEGORY_LABELS.GDPR}</option>
              <option value="NIS2">{CATEGORY_LABELS.NIS2}</option>
              {/* Sprint 22 cleanup — e-Factura nu apare în manual create
                  pentru CompliRoAI (Rule 3 mandate § 19: NO fiscal/e-Factura
                  surfaces). FindingCategory.E_FACTURA rămâne în type union
                  pentru backward compat (state-uri legacy migrate din CompliAI)
                  + filter chip auto-shown dacă există finding-uri legacy.
                  Manual category select expune doar categoriile AI Compliance OS. */}
            </select>
          </Field>
          <Field label="Severitate">
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value as ComplianceSeverity)}
              style={inputStyle}
            >
              <option value="critical">{SEVERITY_LABELS.critical}</option>
              <option value="high">{SEVERITY_LABELS.high}</option>
              <option value="medium">{SEVERITY_LABELS.medium}</option>
              <option value="low">{SEVERITY_LABELS.low}</option>
            </select>
          </Field>
        </div>

        <Field label="Referinta legala (optional)">
          <input
            value={legalReference}
            onChange={(e) => setLegalReference(e.target.value)}
            placeholder="Ex: GDPR Art. 28 · EU AI Act Art. 26"
            style={inputStyle}
          />
        </Field>

        <Field label="Owner sugerat (optional)">
          <input
            value={ownerSuggestion}
            onChange={(e) => setOwnerSuggestion(e.target.value)}
            placeholder="Ex: DPO, IT, CISO"
            style={inputStyle}
          />
        </Field>

        {err && (
          <div
            style={{
              padding: "10px 12px",
              background: "var(--red-soft)",
              border: "1px solid rgba(248,113,113,0.2)",
              borderRadius: "6px",
              color: "#f87171",
              fontSize: "12px",
            }}
          >
            {err}
          </div>
        )}

        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
          <button onClick={onClose} style={btnSecondary} disabled={submitting}>
            Anuleaza
          </button>
          <button onClick={handleSubmit} disabled={submitting} style={btnPrimary}>
            {submitting ? (
              <>
                <Loader2 size={12} className="animate-spin" /> Se inregistreaza...
              </>
            ) : (
              <>
                <Plus size={14} /> Inregistreaza
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <span
        style={{
          fontSize: "11px",
          fontWeight: 600,
          color: "var(--ink-muted)",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        {label}
      </span>
      {children}
    </label>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: "10px",
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        color: "var(--ink-dim)",
      }}
    >
      {children}
    </div>
  )
}

function ActionButton({
  children,
  onClick,
  disabled,
  variant = "default",
}: {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
  variant?: "default" | "primary" | "danger"
}) {
  const styles =
    variant === "primary"
      ? {
          background: "var(--cobalt-600)",
          color: "white",
          border: "1px solid var(--cobalt-600)",
        }
      : variant === "danger"
        ? {
            background: "transparent",
            color: "#f87171",
            border: "1px solid rgba(248,113,113,0.3)",
          }
        : {
            background: "var(--surface-2)",
            color: "var(--ink)",
            border: "1px solid var(--border-soft)",
          }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "5px",
        padding: "6px 10px",
        fontSize: "11px",
        fontWeight: 500,
        borderRadius: "6px",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.4 : 1,
        transition: "all 0.15s",
        ...styles,
      }}
    >
      {children}
    </button>
  )
}

// ────────────────────────────────────────────────────────────────────────────
//   Time helpers
// ────────────────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const sec = Math.floor(diffMs / 1000)
  if (sec < 60) return `acum ${sec}s`
  const min = Math.floor(sec / 60)
  if (min < 60) return `acum ${min} min`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `acum ${hr}h`
  const days = Math.floor(hr / 24)
  if (days < 30) return `acum ${days} zile`
  const months = Math.floor(days / 30)
  if (months < 12) return `acum ${months} luni`
  return new Date(iso).toLocaleDateString("ro-RO")
}

// ────────────────────────────────────────────────────────────────────────────
//   Shared style tokens
// ────────────────────────────────────────────────────────────────────────────

const btnPrimary: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  padding: "8px 14px",
  fontSize: "12px",
  fontWeight: 600,
  color: "white",
  background: "var(--cobalt-600)",
  border: "1px solid var(--cobalt-600)",
  borderRadius: "8px",
  cursor: "pointer",
  transition: "all 0.15s",
}

const btnSecondary: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  padding: "8px 14px",
  fontSize: "12px",
  fontWeight: 500,
  color: "var(--ink)",
  background: "var(--surface-2)",
  border: "1px solid var(--border-soft)",
  borderRadius: "8px",
  cursor: "pointer",
  transition: "all 0.15s",
}

const btnGhost: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "4px",
  padding: "3px 8px",
  fontSize: "10px",
  fontWeight: 500,
  color: "var(--ink-muted)",
  background: "transparent",
  border: "1px solid var(--border-soft)",
  borderRadius: "4px",
  cursor: "pointer",
  transition: "all 0.15s",
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  fontSize: "13px",
  color: "var(--ink)",
  background: "var(--surface-0)",
  border: "1px solid var(--border-soft)",
  borderRadius: "6px",
  outline: "none",
  fontFamily: "inherit",
}

const paragraphStyle: React.CSSProperties = {
  fontSize: "13px",
  color: "var(--ink)",
  marginTop: "8px",
  marginBottom: "8px",
  lineHeight: 1.55,
  whiteSpace: "pre-wrap",
}

