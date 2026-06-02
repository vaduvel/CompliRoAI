"use client"

/**
 * Sprint 007 — DSAR Dashboard
 * GDPR Art. 15-22 — Data Subject Access Requests cu lifecycle complet.
 * Pattern CompliRoAI: inline styles + v3 design tokens (graphite/cobalt).
 */

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  AlertCircle,
  AlertTriangle,
  Archive,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  FileText,
  Loader2,
  Mail,
  Plus,
  Trash2,
  User,
  X,
} from "lucide-react"

import type { DsarRequest, DsarRequestType, DsarStatus } from "@/lib/compliance/types"
import {
  buildDsarLifecycle,
  type DsarLifecycle,
  type DsarLifecycleAction,
} from "@/lib/compliance/dsar-lifecycle"
import type { DsarDraft, DsarProcessPack } from "@/lib/compliance/dsar-drafts"

// ────────────────────────────────────────────────────────────────────────────
//   Labels & constants
// ────────────────────────────────────────────────────────────────────────────

const REQUEST_TYPE_LABELS: Record<DsarRequestType, string> = {
  access: "Acces (Art. 15)",
  rectification: "Rectificare (Art. 16)",
  erasure: "Ștergere (Art. 17)",
  portability: "Portabilitate (Art. 20)",
  objection: "Opoziție (Art. 21)",
  restriction: "Restricționare (Art. 18)",
}

const STATUS_LABELS: Record<DsarStatus, string> = {
  received: "Primită",
  in_progress: "În lucru",
  awaiting_verification: "Așteptăm verificare",
  responded: "Răspuns trimis",
  refused: "Refuzată",
}

const STATUS_COLORS: Record<DsarStatus, { bg: string; fg: string }> = {
  received: { bg: "rgba(96,165,250,0.12)", fg: "#60a5fa" },
  in_progress: { bg: "rgba(251,191,36,0.14)", fg: "#fbbf24" },
  awaiting_verification: { bg: "rgba(168,85,247,0.14)", fg: "#a855f7" },
  responded: { bg: "rgba(52,211,153,0.14)", fg: "#34d399" },
  refused: { bg: "rgba(148,163,184,0.14)", fg: "#94a3b8" },
}

const ALL_TYPES: DsarRequestType[] = [
  "access",
  "rectification",
  "erasure",
  "portability",
  "objection",
  "restriction",
]

type ListResponse = {
  requests: DsarRequest[]
  processPack: DsarProcessPack
}

// ────────────────────────────────────────────────────────────────────────────
//   Page
// ────────────────────────────────────────────────────────────────────────────

export default function DsarPage() {
  const [requests, setRequests] = useState<DsarRequest[]>([])
  const [processPack, setProcessPack] = useState<DsarProcessPack | null>(null)
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<"all" | DsarStatus>("all")
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/dsar")
      if (!res.ok) {
        setError("Nu am putut încărca cererile DSAR.")
        return
      }
      const data = (await res.json()) as ListResponse
      setRequests(data.requests)
      setProcessPack(data.processPack)
      setError(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const stats = useMemo(() => {
    const now = Date.now()
    let open = 0
    let urgent = 0
    let overdue = 0
    let closed = 0
    for (const r of requests) {
      const isClosed = r.status === "responded" || r.status === "refused"
      if (isClosed) {
        closed++
        continue
      }
      open++
      const deadline = new Date(r.extendedDeadlineISO ?? r.deadlineISO).getTime()
      const daysLeft = Math.ceil((deadline - now) / 86_400_000)
      if (daysLeft < 0) overdue++
      else if (daysLeft <= 5) urgent++
    }
    return { total: requests.length, open, urgent, overdue, closed }
  }, [requests])

  const filtered = useMemo(() => {
    if (statusFilter === "all") return requests
    return requests.filter((r) => r.status === statusFilter)
  }, [requests, statusFilter])

  async function handleCreate(input: CreateInput) {
    const res = await fetch("/api/dsar", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: "Eroare necunoscută" }))
      throw new Error(data.error || "Nu am putut crea cererea.")
    }
    await load()
    setShowCreate(false)
  }

  async function handleDelete(id: string) {
    if (!confirm("Ștergi această cerere DSAR? Acțiunea este permanentă.")) return
    const res = await fetch(`/api/dsar/${id}`, { method: "DELETE" })
    if (res.ok) {
      if (expandedId === id) setExpandedId(null)
      await load()
    }
  }

  async function handleAction(id: string, action: DsarLifecycleAction) {
    const res = await fetch(`/api/dsar/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action }),
    })
    if (res.ok) await load()
  }

  return (
    <div className="cr-page cr-stack">
      {/* Header */}
      <div className="cr-hero">
        <div className="cr-hero__copy">
          <span className="cr-eyebrow">Conformitate GDPR</span>
          <h1 className="cr-title">Cereri persoane vizate · DSAR</h1>
          <p className="cr-subtitle">
          GDPR Art. 15-22 · Termen legal 30 zile (extensibil 60) · Registru audit-ready
          </p>
        </div>
      </div>

      {/* Stats */}
      <StatsBar stats={stats} />

      {/* Error */}
      {error && (
        <div className="cr-alert cr-alert--danger">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Create CTA */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
        <FilterTabs
          stats={stats}
          value={statusFilter}
          onChange={setStatusFilter}
        />
        <button
          onClick={() => setShowCreate(true)}
          className="cr-btn cr-btn--primary cr-btn--sm"
        >
          <Plus size={14} /> Cerere nouă
        </button>
      </div>

      {/* Create form modal */}
      {showCreate && (
        <CreateModal
          onClose={() => setShowCreate(false)}
          onSubmit={handleCreate}
        />
      )}

      {/* List */}
      {loading ? (
        <div style={{ fontSize: "13px", color: "var(--ink-dim)", padding: "24px 0" }}>
          Se încarcă cererile...
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          hasAny={requests.length > 0}
          onCreate={() => setShowCreate(true)}
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {filtered.map((req) => (
            <RequestRow
              key={req.id}
              request={req}
              expanded={expandedId === req.id}
              onToggle={() =>
                setExpandedId((prev) => (prev === req.id ? null : req.id))
              }
              onDelete={() => handleDelete(req.id)}
              onAction={(action) => handleAction(req.id, action)}
            />
          ))}
        </div>
      )}

      {/* Process pack reference */}
      {processPack && requests.length > 0 && (
        <ProcessPackPanel pack={processPack} />
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
//   Stats bar
// ────────────────────────────────────────────────────────────────────────────

function StatsBar({
  stats,
}: {
  stats: { total: number; open: number; urgent: number; overdue: number; closed: number }
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
        gap: "10px",
      }}
    >
      <StatCard label="Total" value={stats.total} />
      <StatCard label="În lucru" value={stats.open} accent="cobalt" />
      <StatCard
        label="Urgente (≤5 zile)"
        value={stats.urgent}
        accent={stats.urgent > 0 ? "amber" : undefined}
      />
      <StatCard
        label="Depășite"
        value={stats.overdue}
        accent={stats.overdue > 0 ? "red" : undefined}
      />
      <StatCard label="Închise" value={stats.closed} />
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
//   Filter tabs
// ────────────────────────────────────────────────────────────────────────────

function FilterTabs({
  stats,
  value,
  onChange,
}: {
  stats: { total: number; open: number; closed: number }
  value: "all" | DsarStatus
  onChange: (v: "all" | DsarStatus) => void
}) {
  const tabs: Array<{ key: "all" | DsarStatus; label: string; count: number }> = [
    { key: "all", label: "Toate", count: stats.total },
    { key: "received", label: STATUS_LABELS.received, count: 0 },
    { key: "in_progress", label: STATUS_LABELS.in_progress, count: 0 },
    { key: "awaiting_verification", label: STATUS_LABELS.awaiting_verification, count: 0 },
    { key: "responded", label: STATUS_LABELS.responded, count: 0 },
    { key: "refused", label: STATUS_LABELS.refused, count: 0 },
  ]
  return (
    <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
      {tabs.map((t) => {
        const active = t.key === value
        return (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            className={`cr-filter-chip ${active ? "is-active" : ""}`}
          >
            {t.label}
          </button>
        )
      })}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
//   Empty state
// ────────────────────────────────────────────────────────────────────────────

function EmptyState({
  hasAny,
  onCreate,
}: {
  hasAny: boolean
  onCreate: () => void
}) {
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
      <Mail size={28} style={{ color: "var(--ink-dim)", margin: "0 auto 12px" }} />
      <div
        style={{
          fontSize: "14px",
          fontWeight: 500,
          color: "var(--ink)",
          marginBottom: "6px",
        }}
      >
        {hasAny ? "Nicio cerere în acest filtru" : "Niciun DSAR înregistrat încă"}
      </div>
      <div
        style={{
          fontSize: "12px",
          color: "var(--ink-muted)",
          marginBottom: "16px",
          maxWidth: "420px",
          margin: "0 auto 16px",
        }}
      >
        {hasAny
          ? 'Schimbă filtrul sau resetează la "Toate".'
          : "Înregistrează prima cerere primită prin email, formular sau telefon. Aplicația calculează deadline-ul legal (30 zile) și generează draft."}
      </div>
      {!hasAny && (
        <button onClick={onCreate} className="cr-btn cr-btn--primary cr-btn--sm">
          <Plus size={14} /> Înregistrează prima cerere
        </button>
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
//   Request row + expanded detail
// ────────────────────────────────────────────────────────────────────────────

function RequestRow({
  request,
  expanded,
  onToggle,
  onDelete,
  onAction,
}: {
  request: DsarRequest
  expanded: boolean
  onToggle: () => void
  onDelete: () => void
  onAction: (action: DsarLifecycleAction) => void
}) {
  const lifecycle = useMemo(() => buildDsarLifecycle(request), [request])
  const statusColor = STATUS_COLORS[request.status]
  const deadline = lifecycle.legalClock
  const deadlineColor =
    deadline.status === "overdue"
      ? "#f87171"
      : deadline.status === "urgent"
      ? "#fbbf24"
      : deadline.status === "closed"
      ? "var(--ink-dim)"
      : "var(--ink-muted)"

  return (
    <div
      style={{
        background: "var(--surface-1)",
        borderRadius: "10px",
        border: "1px solid var(--border-soft)",
        overflow: "hidden",
      }}
    >
      {/* Header row */}
      <button
        onClick={onToggle}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "16px",
          padding: "14px 16px",
          width: "100%",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
          color: "var(--ink)",
        }}
      >
        {/* Avatar */}
        <div
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            background: "var(--surface-2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <User size={14} style={{ color: "var(--ink-dim)" }} />
        </div>

        {/* Name + type + email */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontSize: "14px",
                fontWeight: 500,
                color: "var(--ink)",
              }}
            >
              {request.requesterName}
            </span>
            <StatusBadge status={request.status} color={statusColor} />
          </div>
          <div
            style={{
              fontSize: "11px",
              color: "var(--ink-dim)",
              marginTop: "2px",
              display: "flex",
              gap: "8px",
              flexWrap: "wrap",
            }}
          >
            <span>{REQUEST_TYPE_LABELS[request.requestType]}</span>
            <span>·</span>
            <span>{request.requesterEmail}</span>
          </div>
        </div>

        {/* Deadline */}
        <div
          style={{
            textAlign: "right",
            fontSize: "11px",
            color: deadlineColor,
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "4px", justifyContent: "flex-end" }}>
            <Clock size={11} />
            {deadline.status === "closed" ? (
              <span>Închisă</span>
            ) : deadline.status === "overdue" ? (
              <span style={{ fontWeight: 600 }}>Depășită {Math.abs(deadline.daysLeft)}z</span>
            ) : (
              <span style={{ fontWeight: deadline.status === "urgent" ? 600 : 500 }}>
                {deadline.daysLeft} zile
              </span>
            )}
          </div>
          <div
            style={{
              fontSize: "10px",
              color: "var(--ink-dim)",
              marginTop: "2px",
            }}
          >
            {new Date(deadline.deadlineISO).toLocaleDateString("ro-RO")}
          </div>
        </div>

        {/* Progress */}
        <div
          style={{
            fontSize: "11px",
            color: "var(--ink-muted)",
            fontVariantNumeric: "tabular-nums",
            flexShrink: 0,
            minWidth: "40px",
            textAlign: "right",
          }}
        >
          {lifecycle.progressPercent}%
        </div>

        {expanded ? (
          <ChevronUp size={16} style={{ color: "var(--ink-dim)", flexShrink: 0 }} />
        ) : (
          <ChevronDown size={16} style={{ color: "var(--ink-dim)", flexShrink: 0 }} />
        )}
      </button>

      {/* Expanded detail */}
      {expanded && (
        <ExpandedDetail
          request={request}
          lifecycle={lifecycle}
          onAction={onAction}
          onDelete={onDelete}
        />
      )}
    </div>
  )
}

function StatusBadge({
  status,
  color,
}: {
  status: DsarStatus
  color: { bg: string; fg: string }
}) {
  return (
    <span
      style={{
        fontSize: "10px",
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        padding: "2px 8px",
        borderRadius: "999px",
        background: color.bg,
        color: color.fg,
      }}
    >
      {STATUS_LABELS[status]}
    </span>
  )
}

// ────────────────────────────────────────────────────────────────────────────
//   Expanded detail
// ────────────────────────────────────────────────────────────────────────────

function ExpandedDetail({
  request,
  lifecycle,
  onAction,
  onDelete,
}: {
  request: DsarRequest
  lifecycle: DsarLifecycle
  onAction: (action: DsarLifecycleAction) => void
  onDelete: () => void
}) {
  const [draft, setDraft] = useState<DsarDraft | null>(null)
  const [draftLoading, setDraftLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  async function loadDraft() {
    setDraftLoading(true)
    try {
      const res = await fetch(`/api/dsar/${request.id}/draft`)
      if (res.ok) {
        const data = (await res.json()) as { draft: DsarDraft }
        setDraft(data.draft)
      }
    } finally {
      setDraftLoading(false)
    }
  }

  async function copyDraft() {
    if (!draft) return
    await navigator.clipboard.writeText(draft.body)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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
      {/* Lifecycle steps */}
      <div>
        <SectionLabel>Lifecycle</SectionLabel>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "6px",
            marginTop: "10px",
          }}
        >
          {lifecycle.steps.map((step) => (
            <div
              key={step.id}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "10px",
                padding: "8px 10px",
                borderRadius: "6px",
                background:
                  step.status === "current"
                    ? "rgba(96,165,250,0.08)"
                    : "transparent",
              }}
            >
              <StepIcon status={step.status} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: "12px",
                    fontWeight: 500,
                    color: step.status === "done" ? "var(--ink-muted)" : "var(--ink)",
                    textDecoration: step.status === "done" ? "line-through" : "none",
                  }}
                >
                  {step.label}
                </div>
                <div
                  style={{
                    fontSize: "11px",
                    color: "var(--ink-dim)",
                    marginTop: "2px",
                  }}
                >
                  {step.description}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Blocked reasons (if any) */}
      {!lifecycle.canRespond && lifecycle.blockedReasons.length > 0 && (
        <div
          style={{
            padding: "10px 12px",
            background: "var(--amber-soft)",
            borderRadius: "8px",
            border: "1px solid rgba(251,191,36,0.2)",
            fontSize: "12px",
            color: "#fbbf24",
            display: "flex",
            gap: "8px",
          }}
        >
          <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: "1px" }} />
          <div>
            <strong style={{ fontWeight: 600 }}>Înainte de a trimite răspunsul</strong>, completează:{" "}
            {lifecycle.blockedReasons.join(", ")}.
          </div>
        </div>
      )}

      {/* Actions */}
      <div>
        <SectionLabel>Acțiuni rapide</SectionLabel>
        <div
          style={{
            display: "flex",
            gap: "6px",
            flexWrap: "wrap",
            marginTop: "10px",
          }}
        >
          <ActionButton
            disabled={request.identityVerified}
            onClick={() => onAction("verify-identity")}
          >
            <CheckCircle2 size={12} /> Verifică identitatea
          </ActionButton>
          <ActionButton
            disabled={Boolean(request.systemsScoped)}
            onClick={() => onAction("scope-systems")}
          >
            <CheckCircle2 size={12} /> Mapează sistemele
          </ActionButton>
          <ActionButton
            disabled={Boolean(request.dataSearchCompleted)}
            onClick={() => onAction("complete-data-search")}
          >
            <CheckCircle2 size={12} /> Căutare date completă
          </ActionButton>
          <ActionButton
            disabled={request.responseReviewedByHuman}
            onClick={() => onAction("review-response")}
          >
            <CheckCircle2 size={12} /> Marchează review DPO
          </ActionButton>
          <ActionButton
            disabled={!lifecycle.canRespond || request.status === "responded"}
            onClick={() => onAction("mark-responded")}
            variant="primary"
          >
            <Mail size={12} /> Trimite răspuns
          </ActionButton>
          <ActionButton
            disabled={request.status === "refused"}
            onClick={() => onAction("refuse")}
            variant="danger"
          >
            <X size={12} /> Refuză motivat
          </ActionButton>
          <ActionButton
            disabled={Boolean(request.extendedDeadlineISO)}
            onClick={() => onAction("extend-deadline")}
          >
            <Clock size={12} /> Extinde la 60 zile
          </ActionButton>
          <ActionButton
            disabled={Boolean(request.archivedAtISO)}
            onClick={() => onAction("archive")}
          >
            <Archive size={12} /> Arhivează
          </ActionButton>
        </div>
      </div>

      {/* Draft */}
      <div>
        <SectionLabel>Draft răspuns (RO)</SectionLabel>
        {!draft ? (
          <div style={{ marginTop: "10px" }}>
            <button
              onClick={loadDraft}
              disabled={draftLoading}
              className="cr-btn cr-btn--secondary cr-btn--sm"
            >
              {draftLoading ? (
                <>
                  <Loader2 size={12} className="animate-spin" /> Se generează...
                </>
              ) : (
                <>
                  <FileText size={12} /> Generează draft
                </>
              )}
            </button>
          </div>
        ) : (
          <div
            style={{
              marginTop: "10px",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "12px",
                color: "var(--ink-muted)",
              }}
            >
              <span style={{ fontWeight: 500, color: "var(--ink)" }}>{draft.subject}</span>
              <button
                onClick={copyDraft}
                className="cr-btn cr-btn--secondary cr-btn--sm"
                style={{ marginLeft: "auto" }}
              >
                <Copy size={11} />
                {copied ? "Copiat" : "Copiază"}
              </button>
            </div>
            <pre
              style={{
                fontSize: "12px",
                lineHeight: 1.55,
                color: "var(--ink)",
                background: "var(--surface-2)",
                padding: "14px 16px",
                borderRadius: "8px",
                border: "1px solid var(--border-soft)",
                fontFamily: "ui-monospace, SFMono-Regular, monospace",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                maxHeight: "320px",
                overflow: "auto",
                margin: 0,
              }}
            >
              {draft.body}
            </pre>
            <div
              style={{
                fontSize: "11px",
                color: "var(--ink-muted)",
                background: "var(--surface-1)",
                padding: "10px 12px",
                borderRadius: "6px",
                border: "1px solid var(--border-soft)",
              }}
            >
              <div style={{ fontWeight: 600, color: "var(--ink)", marginBottom: "4px" }}>
                Bază legală
              </div>
              <div>{draft.legalBasis}</div>
            </div>
            {draft.requiredActions.length > 0 && (
              <div
                style={{
                  fontSize: "11px",
                  color: "var(--ink-muted)",
                  background: "var(--surface-1)",
                  padding: "10px 12px",
                  borderRadius: "6px",
                  border: "1px solid var(--border-soft)",
                }}
              >
                <div style={{ fontWeight: 600, color: "var(--ink)", marginBottom: "4px" }}>
                  Acțiuni necesare înainte de trimitere
                </div>
                <ul style={{ margin: 0, paddingLeft: "18px" }}>
                  {draft.requiredActions.map((item: string, i: number) => (
                    <li key={i} style={{ marginTop: i === 0 ? 0 : "4px" }}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Notes + meta */}
      {request.notes && (
        <div>
          <SectionLabel>Note interne</SectionLabel>
          <div
            style={{
              marginTop: "10px",
              fontSize: "12px",
              color: "var(--ink)",
              padding: "10px 12px",
              background: "var(--surface-1)",
              borderRadius: "6px",
              border: "1px solid var(--border-soft)",
              whiteSpace: "pre-wrap",
            }}
          >
            {request.notes}
          </div>
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
        <span>
          Primită {new Date(request.receivedAtISO).toLocaleString("ro-RO")}
        </span>
        <span>·</span>
        <span>ID: {request.id}</span>
        <button
          onClick={onDelete}
          className="cr-btn cr-btn--danger cr-btn--sm"
          style={{ marginLeft: "auto" }}
        >
          <Trash2 size={11} /> Șterge
        </button>
      </div>
    </div>
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

function StepIcon({ status }: { status: "done" | "current" | "blocked" | "pending" }) {
  if (status === "done") {
    return (
      <CheckCircle2
        size={14}
        style={{ color: "#34d399", flexShrink: 0, marginTop: "1px" }}
      />
    )
  }
  if (status === "current") {
    return (
      <div
        style={{
          width: "14px",
          height: "14px",
          borderRadius: "50%",
          border: "2px solid var(--cobalt-400)",
          flexShrink: 0,
          marginTop: "1px",
        }}
      />
    )
  }
  return (
    <div
      style={{
        width: "14px",
        height: "14px",
        borderRadius: "50%",
        border: "1px solid var(--border-soft)",
        flexShrink: 0,
        marginTop: "1px",
        opacity: status === "blocked" ? 0.4 : 0.7,
      }}
    />
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
//   Create modal
// ────────────────────────────────────────────────────────────────────────────

type CreateInput = {
  requesterName: string
  requesterEmail: string
  requestType: DsarRequestType
  receivedAtISO?: string
  notes?: string
}

function CreateModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void
  onSubmit: (input: CreateInput) => Promise<void>
}) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [type, setType] = useState<DsarRequestType>("access")
  const [receivedAt, setReceivedAt] = useState(
    new Date().toISOString().slice(0, 10)
  )
  const [notes, setNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function handleSubmit() {
    setErr(null)
    if (!name.trim() || !email.trim()) {
      setErr("Numele și email-ul sunt obligatorii.")
      return
    }
    setSubmitting(true)
    try {
      await onSubmit({
        requesterName: name.trim(),
        requesterEmail: email.trim(),
        requestType: type,
        receivedAtISO: new Date(receivedAt).toISOString(),
        notes: notes.trim() || undefined,
      })
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Eroare necunoscută")
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
          maxWidth: "520px",
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
            Cerere nouă DSAR
          </h2>
          <button onClick={onClose} className="cr-btn cr-btn--icon cr-btn--sm">
            <X size={16} />
          </button>
        </div>

        <Field label="Numele solicitantului *">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Ion Popescu"
            className="cr-input"
          />
        </Field>

        <Field label="Email solicitant *">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ion.popescu@example.com"
            className="cr-input"
          />
        </Field>

        <Field label="Tip cerere">
          <select
            value={type}
            onChange={(e) => setType(e.target.value as DsarRequestType)}
            className="cr-input"
          >
            {ALL_TYPES.map((t) => (
              <option key={t} value={t}>
                {REQUEST_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Data primirii">
          <input
            type="date"
            value={receivedAt}
            onChange={(e) => setReceivedAt(e.target.value)}
            className="cr-input"
          />
          <div style={{ fontSize: "11px", color: "var(--ink-dim)", marginTop: "4px" }}>
            Deadline legal: {new Date(
              new Date(receivedAt).getTime() + 30 * 86_400_000
            ).toLocaleDateString("ro-RO")} (30 zile, extensibil la 60)
          </div>
        </Field>

        <Field label="Note interne (opțional)">
          <textarea
            className="cr-input cr-textarea"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Ex: primită prin email, atașat copie CI..."
            style={{ ...inputStyle, fontFamily: "inherit", resize: "vertical" }}
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
          <button onClick={onClose} className="cr-btn cr-btn--secondary cr-btn--sm" disabled={submitting}>
            Anulează
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="cr-btn cr-btn--primary cr-btn--sm"
          >
            {submitting ? (
              <>
                <Loader2 size={12} className="animate-spin" /> Se înregistrează...
              </>
            ) : (
              <>
                <Plus size={14} /> Înregistrează
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

// ────────────────────────────────────────────────────────────────────────────
//   Process pack reference panel
// ────────────────────────────────────────────────────────────────────────────

function ProcessPackPanel({ pack }: { pack: DsarProcessPack }) {
  const [open, setOpen] = useState(false)
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
        onClick={() => setOpen(!open)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          padding: "12px 16px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          color: "var(--ink)",
          textAlign: "left",
        }}
      >
        <FileText size={14} style={{ color: "var(--ink-dim)" }} />
        <span style={{ fontSize: "13px", fontWeight: 500, flex: 1 }}>
          Pachet proces DSAR ({pack.assets.length} active reutilizabile)
        </span>
        {open ? (
          <ChevronUp size={14} style={{ color: "var(--ink-dim)" }} />
        ) : (
          <ChevronDown size={14} style={{ color: "var(--ink-dim)" }} />
        )}
      </button>
      {open && (
        <div
          style={{
            borderTop: "1px solid var(--border-soft)",
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          <div style={{ fontSize: "12px", color: "var(--ink-muted)" }}>
            {pack.summary}
          </div>
          {pack.assets.map((asset) => (
            <ProcessAssetRow key={asset.id} asset={asset} />
          ))}
          {pack.completionChecklist.length > 0 && (
            <div
              style={{
                marginTop: "4px",
                padding: "12px 14px",
                background: "var(--surface-2)",
                border: "1px solid var(--border-soft)",
                borderRadius: "6px",
              }}
            >
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "var(--ink)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: "6px",
                }}
              >
                Checklist completare
              </div>
              <ul
                style={{
                  margin: 0,
                  paddingLeft: "18px",
                  fontSize: "11px",
                  color: "var(--ink-muted)",
                }}
              >
                {pack.completionChecklist.map((item, i) => (
                  <li key={i} style={{ marginTop: i === 0 ? 0 : "4px" }}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ProcessAssetRow({ asset }: { asset: DsarProcessPack["assets"][number] }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  async function copy() {
    await navigator.clipboard.writeText(asset.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <div
      style={{
        background: "var(--surface-2)",
        borderRadius: "6px",
        border: "1px solid var(--border-soft)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "10px 12px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <button
          onClick={() => setOpen(!open)}
          style={{
            background: "transparent",
            border: "none",
            color: "var(--ink)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            flex: 1,
            textAlign: "left",
            padding: 0,
            fontSize: "12px",
            fontWeight: 500,
          }}
        >
          {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          {asset.title}
        </button>
        <button onClick={copy} className="cr-btn cr-btn--secondary cr-btn--sm">
          <Copy size={11} />
          {copied ? "Copiat" : "Copiază"}
        </button>
      </div>
      {open && (
        <pre
          style={{
            fontSize: "11px",
            lineHeight: 1.55,
            color: "var(--ink)",
            background: "var(--surface-0)",
            padding: "12px 14px",
            margin: 0,
            borderTop: "1px solid var(--border-soft)",
            fontFamily: "ui-monospace, SFMono-Regular, monospace",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            maxHeight: "260px",
            overflow: "auto",
          }}
        >
          {asset.content}
        </pre>
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
//   Shared style tokens (inline)
// ────────────────────────────────────────────────────────────────────────────

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
