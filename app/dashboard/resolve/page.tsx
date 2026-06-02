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

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
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
  Sparkles,
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

const SEVERITY_LABELS: Record<ComplianceSeverity, string> = {
  critical: "Critic",
  high: "Înalt",
  medium: "Mediu",
  low: "Scăzut",
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

type AuditPackBlocker = {
  id: string
  code: string
  title: string
  statusLabel: string
  ownerRole: string
  requiredEvidence: string[]
  reviewGate: string
  href: string
}

type AuditPackReadiness = {
  status: "blocked" | "draft_only" | "ready_for_review" | "approved"
  label: string
  blockersCount: number
  evidenceMissingCount: number
  reviewPendingCount: number
}

type ListResponse = {
  findings: ScanFinding[]
  stats: Stats
  auditPackReadiness?: AuditPackReadiness
  auditPackBlockers?: AuditPackBlocker[]
}

type StatusFilter = "all" | StatusKey
type SeverityFilter = "all" | ComplianceSeverity

const GUIDANCE_ACTION_REFRESH_DELAY_MS = 10_000
const GUIDANCE_ACTION_REFRESH_COOLDOWN_MS = 60_000

async function fetchJsonWithTimeout<T>(
  input: string,
  init: RequestInit | undefined,
  timeoutMs: number,
): Promise<T> {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(input, {
      ...init,
      signal: controller.signal,
    })
    if (!response.ok) {
      throw new Error(`HTTP_${response.status}`)
    }
    return (await response.json()) as T
  } finally {
    window.clearTimeout(timer)
  }
}

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
  const [auditPackReadiness, setAuditPackReadiness] = useState<AuditPackReadiness | null>(null)
  const [auditPackBlockers, setAuditPackBlockers] = useState<AuditPackBlocker[]>([])
  const [pendingActionId, setPendingActionId] = useState<string | null>(null)
  const guidanceRefreshRef = useRef<{
    inFlight: boolean
    lastRunAt: number
    timerId: number | null
    pendingReason: string | null
  }>({
    inFlight: false,
    lastRunAt: 0,
    timerId: null,
    pendingReason: null,
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          const data = await fetchJsonWithTimeout<ListResponse>(
            "/api/findings",
            undefined,
            20_000,
          )
          setFindings(data.findings)
          setStats(data.stats)
          setAuditPackReadiness(data.auditPackReadiness ?? null)
          setAuditPackBlockers(data.auditPackBlockers ?? [])
          setEvents([])
          setError(null)
          return
        } catch {
          if (attempt < 1) {
            await new Promise((resolve) => window.setTimeout(resolve, 600))
            continue
          }
          setFindings([])
          setStats(null)
          setAuditPackReadiness(null)
          setAuditPackBlockers([])
          setEvents([])
          setError("Nu am putut incarca risc-urile.")
        }
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  function scheduleGuidanceAfterAction(reason: string) {
    const state = guidanceRefreshRef.current
    state.pendingReason = reason
    if (state.timerId) window.clearTimeout(state.timerId)

    state.timerId = window.setTimeout(() => {
      const next = guidanceRefreshRef.current
      const now = Date.now()
      if (next.inFlight || now - next.lastRunAt < GUIDANCE_ACTION_REFRESH_COOLDOWN_MS) return

      next.inFlight = true
      next.lastRunAt = now
      const refreshReason = next.pendingReason ?? reason
      next.pendingReason = null

      fetch("/api/ai-guidance", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "regenerate", reason: refreshReason }),
      })
        .catch(() => {
          // Guidance este suport decizional, nu blochează lifecycle-ul finding-ului.
        })
        .finally(() => {
          guidanceRefreshRef.current.inFlight = false
        })
    }, GUIDANCE_ACTION_REFRESH_DELAY_MS)
  }

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

  const blockerByFindingId = useMemo(() => {
    return new Map(auditPackBlockers.map((blocker) => [blocker.id, blocker]))
  }, [auditPackBlockers])

  async function handleAction(id: string, action: string) {
    setPendingActionId(`${id}:${action}`)
    const previousFindings = findings
    try {
      const res = await fetch(`/api/findings/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Eroare necunoscuta" }))
        throw new Error(data.error || "Nu am putut actualiza statusul.")
      }
      const data = (await res.json()) as { finding?: ScanFinding }
      if (data.finding) {
        setFindings((current) =>
          current.map((finding) => (finding.id === id ? data.finding! : finding)),
        )
        if (data.finding.findingStatus === "resolved" && expandedId === id) {
          setExpandedId(null)
        }
      }
      scheduleGuidanceAfterAction(`finding_${action}`)
      void load()
    } catch (e) {
      setFindings(previousFindings)
      alert(e instanceof Error ? e.message : "Nu am putut actualiza statusul.")
    } finally {
      setPendingActionId(null)
    }
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
    const data = (await res.json()) as { finding?: ScanFinding }
    if (data.finding) {
      setFindings((current) =>
        current.map((finding) => (finding.id === id ? data.finding! : finding)),
      )
    }
    scheduleGuidanceAfterAction("finding_evidence_attached")
    void load()
  }

  async function handleDelete(id: string) {
    if (!confirm("Stergi acest risc? Actiunea este permanenta si va aparea in audit trail.")) return
    const res = await fetch(`/api/findings/${id}`, { method: "DELETE" })
    if (res.ok) {
      if (expandedId === id) setExpandedId(null)
      await load()
      scheduleGuidanceAfterAction("finding_deleted")
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
    scheduleGuidanceAfterAction("finding_created")
    setShowCreate(false)
  }

  async function handleShare(id: string): Promise<string> {
    const res = await fetch(`/api/findings/${id}/share`, { method: "POST" })
    if (!res.ok) throw new Error("Nu am putut genera link-ul de share.")
    const d = (await res.json()) as { shareUrl: string }
    return d.shareUrl
  }

  return (
    <div className="cr-page cr-page--full cr-stack">
      {/* Header */}
      <div className="cr-hero">
        <div className="cr-hero__copy">
          <span className="cr-eyebrow">Cockpit de execuție</span>
          <h1 className="cr-title">
            De rezolvat
          </h1>
          <p className="cr-subtitle">
            Toate riscurile active aici. Confirmă, atașează dovada, marchează rezolvat.
          </p>
        </div>
        <Link
          href="/dashboard/resolve/support"
          className="cr-btn"
        >
          <HelpCircle size={13} /> Ghid lifecycle
        </Link>
      </div>

      {/* Stats */}
      {stats && <StatsBar stats={stats} />}

      {auditPackReadiness && (
        <ResolveReadinessPanel readiness={auditPackReadiness} blockers={auditPackBlockers} />
      )}

      {/* Error */}
      {error && (
        <div className="cr-alert cr-alert--danger">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Filters + CTA */}
      <div className="cr-stack">
        <div className="cr-inline-between">
          <StatusTabs value={statusFilter} stats={stats} onChange={setStatusFilter} />
          <button onClick={() => setShowCreate(true)} className="cr-btn cr-btn--primary">
            <Plus size={14} /> Adaugă risc manual
          </button>
        </div>
        <div className="cr-filter-row">
          <FilterChips
            label="Severitate"
            items={[
              { key: "all", label: "Toate" },
              { key: "critical", label: SEVERITY_LABELS.critical },
              { key: "high", label: SEVERITY_LABELS.high },
              { key: "medium", label: SEVERITY_LABELS.medium },
              { key: "low", label: SEVERITY_LABELS.low },
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
        <div className="cr-empty">
          Se încarcă riscurile...
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState hasAny={findings.length > 0} onCreate={() => setShowCreate(true)} />
      ) : (
        <div className="cr-finding-list">
          {filtered.map((f) => (
            <FindingRow
              key={f.id}
              finding={f}
              auditPackBlocker={blockerByFindingId.get(f.id) ?? null}
              expanded={expandedId === f.id}
              onToggle={() => setExpandedId((p) => (p === f.id ? null : f.id))}
              onAction={(a) => handleAction(f.id, a)}
              pendingAction={pendingActionId?.startsWith(`${f.id}:`) ? pendingActionId.split(":")[1] : null}
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
    <div className="cr-stat-strip">
      <StatCard label="Total" value={stats.total} />
      <StatCard label="Active" value={stats.open + stats.confirmed + stats.under_monitoring} accent="cobalt" />
      <StatCard label="Critice" value={stats.critical} accent={stats.critical > 0 ? "red" : undefined} />
      <StatCard label="Înalte" value={stats.high} accent={stats.high > 0 ? "amber" : undefined} />
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
  const accentClass =
    accent === "amber"
      ? "cr-stat--warning"
      : accent === "red"
        ? "cr-stat--critical"
        : accent === "cobalt"
          ? "cr-stat--info"
          : ""
  return (
    <div className={`cr-stat ${accentClass}`}>
      <div className="cr-stat__label">
        {label}
      </div>
      <div className="cr-stat__value">
        {value}
      </div>
    </div>
  )
}

function ResolveReadinessPanel({
  readiness,
  blockers,
}: {
  readiness: AuditPackReadiness
  blockers: AuditPackBlocker[]
}) {
  const statusTone =
    readiness.status === "blocked"
      ? "danger"
      : readiness.status === "draft_only"
        ? "warning"
        : "ok"

  return (
    <section className="cr-panel">
      <div className="cr-panel__body cr-detail-stack">
        <div className="cr-inline-between">
          <div>
            <SectionLabel>Audit Pack readiness</SectionLabel>
            <p className="cr-paragraph">
              <strong>{readiness.label}</strong> · {readiness.blockersCount} blocker-e ·{" "}
              {readiness.evidenceMissingCount} dovezi lipsă · {readiness.reviewPendingCount} review pending.
            </p>
          </div>
          <StatusPill tone={statusTone}>{readiness.label}</StatusPill>
        </div>

        {blockers.length > 0 ? (
          <div className="cr-pill-group">
            {blockers.slice(0, 6).map((blocker) => (
              <Link key={blocker.id} href={`#${blocker.id}`} className="cr-link">
                {blocker.code}: {blocker.statusLabel}
              </Link>
            ))}
          </div>
        ) : (
          <div className="cr-inline-note">
            Nu există blocker canonic în lista curentă. Dacă dosarul are date complete, următorul pas este review-ul uman.
          </div>
        )}
      </div>
    </section>
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
    <div className="cr-segment-bar">
      {tabs.map((t) => {
        const active = t.key === value
        return (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            className={`cr-tab${active ? " is-active" : ""}`}
          >
            {t.label}
            <span className="cr-tab__count">
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
  items: Array<{ key: string; label: string }>
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="cr-chip-group">
      <span className="cr-eyebrow">{label}</span>
      {items.map((item) => {
        const active = item.key === value
        return (
          <button
            key={item.key}
            onClick={() => onChange(item.key)}
            className={`cr-filter-chip${active ? " is-active" : ""}`}
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
    <div className="cr-empty">
      <ShieldCheck size={28} className="cr-empty__icon" />
      <div className="cr-empty__title">{hasAny ? "Niciun risc în acest filtru" : "Nu există riscuri active"}</div>
      <div className="cr-empty__copy">
        {hasAny
          ? "Schimba filtrul sau reseteaza la \"Toate\"."
          : "Rulează discovery / DPIA screening sau adaugă manual un risc identificat ca să-l înregistrezi în registru."}
      </div>
      {!hasAny && (
        <button onClick={onCreate} className="cr-btn cr-btn--primary">
          <Plus size={14} /> Adaugă primul risc
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
  auditPackBlocker,
  expanded,
  onToggle,
  onAction,
  onDelete,
  onAttachEvidence,
  onShare,
  relatedEvents,
  pendingAction,
}: {
  finding: ScanFinding
  auditPackBlocker: AuditPackBlocker | null
  expanded: boolean
  onToggle: () => void
  onAction: (action: string) => void
  onDelete: () => void
  onAttachEvidence: (p: { note: string; url?: string; fileName?: string }) => Promise<void>
  onShare: () => Promise<string>
  relatedEvents: ComplianceEvent[]
  pendingAction: string | null
}) {
  const status = (finding.findingStatus ?? "open") as StatusKey
  const sev = finding.severity
  const blocksAuditPack = Boolean(auditPackBlocker)

  return (
    <div id={finding.id} className={`cr-finding-card cr-finding-card--${sev}`}>
      <button
        onClick={onToggle}
        className="cr-finding-row"
      >
        <SeverityIcon severity={sev} />

        <div className="cr-finding-main">
          <div className="cr-finding-heading">
            <span className="cr-finding-title">{finding.title}</span>
            <Badge tone={severityBadgeTone(sev)}>{SEVERITY_LABELS[sev]}</Badge>
            <StatusPill tone={categoryPillTone(finding.category)}>{CATEGORY_LABELS[finding.category]}</StatusPill>
            <StatusPill tone={statusPillTone(status)}>{STATUS_LABELS[status]}</StatusPill>
            {blocksAuditPack ? (
              <StatusPill tone="danger">Blochează Audit Pack</StatusPill>
            ) : null}
          </div>
          <div className="cr-finding-meta">
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
          <ChevronUp size={16} className="cr-finding-chevron" />
        ) : (
          <ChevronDown size={16} className="cr-finding-chevron" />
        )}
      </button>

      {expanded && (
        <ExpandedDetail
          finding={finding}
          auditPackBlocker={auditPackBlocker}
          relatedEvents={relatedEvents}
          onAction={onAction}
          pendingAction={pendingAction}
          onDelete={onDelete}
          onAttachEvidence={onAttachEvidence}
          onShare={onShare}
        />
      )}
    </div>
  )
}

function SeverityIcon({ severity }: { severity: ComplianceSeverity }) {
  if (severity === "critical") return <ShieldAlert size={18} className="cr-finding-icon cr-finding-icon--critical" />
  if (severity === "high") return <AlertTriangle size={18} className="cr-finding-icon cr-finding-icon--high" />
  if (severity === "medium") return <AlertCircle size={18} className="cr-finding-icon cr-finding-icon--medium" />
  return <Shield size={18} className="cr-finding-icon cr-finding-icon--low" />
}

function severityBadgeTone(severity: ComplianceSeverity): "critical" | "high" | "medium" | "info" {
  if (severity === "critical") return "critical"
  if (severity === "high") return "high"
  if (severity === "medium") return "medium"
  return "info"
}

function statusPillTone(status: StatusKey): "ok" | "warning" | "danger" | "info" | "neutral" {
  if (status === "resolved") return "ok"
  if (status === "dismissed") return "neutral"
  if (status === "under_monitoring") return "info"
  if (status === "open") return "danger"
  return "warning"
}

function categoryPillTone(category: FindingCategory): "ok" | "warning" | "danger" | "info" | "neutral" {
  if (category === "EU_AI_ACT") return "info"
  if (category === "GDPR") return "ok"
  if (category === "NIS2") return "warning"
  return "neutral"
}

function Badge({
  tone = "info",
  children,
}: {
  tone?: "critical" | "high" | "medium" | "info" | "ok"
  children: React.ReactNode
}) {
  return <span className={`cr-badge cr-badge--${tone}`}>{children}</span>
}

function StatusPill({
  tone = "neutral",
  children,
}: {
  tone?: "ok" | "warning" | "danger" | "info" | "neutral"
  children: React.ReactNode
}) {
  return <span className={`cr-status-pill cr-status-pill--${tone}`}>{children}</span>
}

// ────────────────────────────────────────────────────────────────────────────
//   Expanded detail
// ────────────────────────────────────────────────────────────────────────────

function ExpandedDetail({
  finding,
  auditPackBlocker,
  relatedEvents,
  onAction,
  onDelete,
  onAttachEvidence,
  onShare,
  pendingAction,
}: {
  finding: ScanFinding
  auditPackBlocker: AuditPackBlocker | null
  relatedEvents: ComplianceEvent[]
  onAction: (a: string) => void
  onDelete: () => void
  onAttachEvidence: (p: { note: string; url?: string; fileName?: string }) => Promise<void>
  onShare: () => Promise<string>
  pendingAction: string | null
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
    <div className="cr-finding-expanded">
      <AuditPackImpactCard finding={finding} blocker={auditPackBlocker} />
      <InlineGuidanceCard finding={finding} auditPackBlocker={auditPackBlocker} />

      <div className="cr-detail-grid">
        <section className="cr-panel">
          <div className="cr-panel__body cr-detail-stack">
            <div>
              <SectionLabel>Problema</SectionLabel>
              <p className="cr-paragraph">{finding.resolution?.problem ?? finding.detail}</p>
            </div>

            {finding.resolution?.impact && (
              <div>
                <SectionLabel>Impact</SectionLabel>
                <p className="cr-paragraph">{finding.resolution.impact}</p>
              </div>
            )}

            {(finding.resolution?.action ?? finding.remediationHint) && (
              <div>
                <SectionLabel>Actiune recomandata</SectionLabel>
                <p className="cr-paragraph">{finding.resolution?.action ?? finding.remediationHint}</p>
              </div>
            )}

            {(finding.legalReference || (finding.legalMappings && finding.legalMappings.length > 0)) && (
              <div className="cr-detail-stack">
                <SectionLabel>Referință legală</SectionLabel>
                {finding.legalReference ? <p className="cr-paragraph">{finding.legalReference}</p> : null}
                {finding.legalMappings?.map((mapping, index) => (
                  <div key={index} className="cr-note-box">
                    <strong>
                      {mapping.regulation} · {mapping.article}
                    </strong>{" "}
                    — {mapping.label}
                    <div className="cr-note-box__sub">{mapping.reason}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="cr-panel">
          <div className="cr-panel__body cr-detail-stack">
            <div>
              <SectionLabel>Semnale de execuție</SectionLabel>
              <div className="cr-pill-group">
                {typeof finding.confidenceScore === "number" ? (
                  <MetaPill label="Confidence" value={`${finding.confidenceScore}%`} />
                ) : null}
                {finding.driftStatus ? <MetaPill label="Drift" value={finding.driftStatus} /> : null}
                {finding.nextMonitoringDateISO ? (
                  <MetaPill
                    label="Următoarea monitorizare"
                    value={new Date(finding.nextMonitoringDateISO).toLocaleDateString("ro-RO")}
                  />
                ) : null}
                {finding.findingStatusUpdatedAtISO ? (
                  <MetaPill label="Ultima actualizare" value={timeAgo(finding.findingStatusUpdatedAtISO)} />
                ) : null}
              </div>
            </div>

            {(finding.closeCondition ||
              (finding.requiredEvidenceKinds && finding.requiredEvidenceKinds.length > 0) ||
              finding.evidenceRequired) && (
              <div className="cr-detail-stack">
                <SectionLabel>Condiții de închidere</SectionLabel>
                {finding.closeCondition ? <p className="cr-paragraph">{finding.closeCondition}</p> : null}
                {finding.evidenceRequired ? <p className="cr-paragraph">{finding.evidenceRequired}</p> : null}
                {finding.requiredEvidenceKinds && finding.requiredEvidenceKinds.length > 0 ? (
                  <div className="cr-pill-group">
                    {finding.requiredEvidenceKinds.map((kind) => (
                      <StatusPill key={kind} tone="neutral">
                        {kind}
                      </StatusPill>
                    ))}
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </section>
      </div>

      <section className="cr-panel">
        <div className="cr-panel__body">
          <SectionLabel>Acțiuni</SectionLabel>
          <div className="cr-action-row">
          <ActionButton
            onClick={() => onAction("confirm")}
            disabled={Boolean(pendingAction) || status === "confirmed" || status === "resolved"}
            variant="primary"
          >
            {pendingAction === "confirm" ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
            Confirma
          </ActionButton>
          <ActionButton
            onClick={() => onAction("dismiss")}
            disabled={Boolean(pendingAction) || status === "dismissed"}
            variant="default"
          >
            {pendingAction === "dismiss" ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
            Respinge
          </ActionButton>
          <ActionButton
            onClick={() => onAction("resolve")}
            disabled={Boolean(pendingAction) || status === "resolved"}
            variant="primary"
          >
            {pendingAction === "resolve" ? <Loader2 size={12} className="animate-spin" /> : <ShieldCheck size={12} />}
            Marcheaza rezolvat
          </ActionButton>
          <ActionButton
            onClick={() => onAction("monitor")}
            disabled={Boolean(pendingAction) || status === "under_monitoring"}
            variant="default"
          >
            {pendingAction === "monitor" ? <Loader2 size={12} className="animate-spin" /> : <Eye size={12} />}
            Pune in monitorizare
          </ActionButton>
          <ActionButton
            onClick={() => onAction("reopen")}
            disabled={Boolean(pendingAction) || status === "open"}
            variant="default"
          >
            {pendingAction === "reopen" ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
            Redeschide
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
      </section>

      <EvidenceSection finding={finding} onAttach={onAttachEvidence} />

      {relatedEvents.length > 0 && (
        <section className="cr-panel">
          <div className="cr-panel__body">
            <SectionLabel>Audit trail (ultimele 5)</SectionLabel>
            <div className="cr-audit-list">
            {relatedEvents.map((e) => (
              <div key={e.id} className="cr-audit-row">
                <span className="cr-audit-row__time">{new Date(e.createdAtISO).toLocaleString("ro-RO")}</span>
                <span className="cr-audit-row__type">{e.type}</span>
                <span>{e.message}</span>
                {e.actorLabel ? <span className="cr-audit-row__actor">{e.actorLabel}</span> : null}
              </div>
            ))}
          </div>
          </div>
        </section>
      )}

      {finding.provenance && (
        <div className="cr-provenance-box">
          ruleId: {finding.provenance.ruleId}
          {finding.provenance.signalSource && ` · src: ${finding.provenance.signalSource}`}
          {finding.provenance.verdictBasis && ` · basis: ${finding.provenance.verdictBasis}`}
          {finding.provenance.signalConfidence && ` · conf: ${finding.provenance.signalConfidence}`}
        </div>
      )}

      <div className="cr-detail-footer">
        <span>Creat {new Date(finding.createdAtISO).toLocaleString("ro-RO")}</span>
        <span>·</span>
        <span>ID: {finding.id}</span>
        <button onClick={onDelete} className="cr-btn cr-btn--danger cr-btn--sm">
          <Trash2 size={11} /> Sterge
        </button>
      </div>
    </div>
  )
}

function AuditPackImpactCard({
  finding,
  blocker,
}: {
  finding: ScanFinding
  blocker: AuditPackBlocker | null
}) {
  const isClosed =
    finding.findingStatus === "resolved" ||
    finding.findingStatus === "dismissed" ||
    finding.reviewState === "closed" ||
    finding.reviewState === "monitoring"

  if (!blocker && isClosed) {
    return (
      <section aria-label="Impact Audit Pack" className="cr-panel">
        <div className="cr-panel__body">
          <SectionLabel>Impact Audit Pack</SectionLabel>
          <div className="cr-inline-note">
            Finding-ul nu mai blochează Audit Pack-ul. Rămâne în audit trail ca dovadă de execuție.
          </div>
        </div>
      </section>
    )
  }

  if (!blocker) {
    return (
      <section aria-label="Impact Audit Pack" className="cr-panel">
        <div className="cr-panel__body">
          <SectionLabel>Impact Audit Pack</SectionLabel>
          <div className="cr-inline-note">
            Acest finding nu este blocker canonic de export în starea curentă, dar poate rămâne relevant pentru review sau monitorizare.
          </div>
        </div>
      </section>
    )
  }

  return (
    <section aria-label="Impact Audit Pack" className="cr-panel">
      <div className="cr-panel__body cr-detail-stack">
        <div className="cr-inline-between">
          <div>
            <SectionLabel>Impact Audit Pack</SectionLabel>
            <p className="cr-paragraph">
              <strong>{blocker.code}</strong> · {blocker.statusLabel}. Acest finding blochează exportul final până când
              dovada cerută este atașată și gate-ul de review este trecut.
            </p>
          </div>
          <StatusPill tone="danger">Blochează export final</StatusPill>
        </div>

        <div className="cr-detail-grid">
          <div className="cr-note-box">
            <strong>Dovadă cerută</strong>
            <div className="cr-note-box__sub">
              {blocker.requiredEvidence.length > 0
                ? blocker.requiredEvidence.join("; ")
                : "Dovadă de execuție + notă de review uman."}
            </div>
          </div>
          <div className="cr-note-box">
            <strong>Owner / review gate</strong>
            <div className="cr-note-box__sub">
              {blocker.ownerRole} · {blocker.reviewGate}
            </div>
          </div>
        </div>

        <div className="cr-inline-note">
          Când atașezi dovada și marchezi finding-ul rezolvat, Dashboard Coherence și Audit Pack readiness se recalculează din state-ul canonic.
        </div>
      </div>
    </section>
  )
}

function InlineGuidanceCard({
  finding,
  auditPackBlocker,
}: {
  finding: ScanFinding
  auditPackBlocker: AuditPackBlocker | null
}) {
  const legalRefs = [
    finding.legalReference,
    ...(finding.legalMappings?.map((mapping) => `${mapping.regulation} ${mapping.article}`) ?? []),
  ].filter((ref): ref is string => Boolean(ref))
  const owner = finding.ownerSuggestion ?? suggestedOwnerFor(finding)
  const firstEvidence =
    auditPackBlocker?.requiredEvidence?.[0] ??
    finding.requiredEvidenceKinds?.[0] ??
    finding.evidenceRequired ??
    finding.closeCondition ??
    "dovadă de decizie și execuție"
  const nextStep =
    auditPackBlocker
      ? "Rezolvă blocker-ul canonic înainte de exportul final al Audit Pack-ului."
      : finding.severity === "critical"
      ? "Închide blocajul critic înainte de următorul raport sau audit pack."
      : "Finalizează dovada lipsă și lasă audit trail-ul să lege acțiunea de finding."

  return (
    <section aria-label="AI Guidance pentru finding" className="cr-panel">
      <div className="cr-panel__body">
        <div className="cr-guidance-card__header">
          <div className="cr-guidance-card__icon">
          <Sparkles size={17} />
        </div>
          <div className="cr-guidance-card__copy">
            <div className="cr-guidance-card__title-row">
              <strong className="cr-guidance-card__title">AI Guidance · pas-cu-pas pentru acest finding</strong>
            <span className="cr-badge cr-badge--info">nu execută</span>
            {typeof finding.confidenceScore === "number" ? (
              <span className="cr-badge">conf. {finding.confidenceScore}%</span>
            ) : null}
            </div>
            <p className="cr-paragraph">
              {nextStep} Owner recomandat: <strong>{owner}</strong>. Prima dovadă cerută:{" "}
              <strong>{firstEvidence}</strong>.
            </p>
            <div className="cr-guidance-card__meta">
            {legalRefs.slice(0, 3).map((ref) => (
                <span key={ref} className="cr-badge">
                  {ref}
                </span>
            ))}
              <Link href="/dashboard#ai-guidance" className="cr-link">
                Vezi planul complet →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function suggestedOwnerFor(finding: ScanFinding): string {
  if (finding.category === "GDPR") return "DPO"
  if (finding.category === "NIS2") return "Security"
  if (finding.category === "EU_AI_ACT") {
    if (finding.title.toLowerCase().includes("vendor") || finding.title.toLowerCase().includes("furnizor")) return "Legal"
    if (finding.title.toLowerCase().includes("logging") || finding.title.toLowerCase().includes("jurnal")) return "IT"
    return "Compliance"
  }
  return "Compliance"
}

function MetaPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="cr-meta-pill">
      <strong>{label}:</strong>
      <span>{value}</span>
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
    <section className="cr-panel">
      <div className="cr-panel__body cr-detail-stack">
        <SectionLabel>Dovezi</SectionLabel>
      {finding.operationalEvidenceNote ? (
          <pre className="cr-pre-box">
          {finding.operationalEvidenceNote}
        </pre>
      ) : (
          <div className="cr-inline-note">Nicio dovadă înregistrată. Adaugă mai jos.</div>
      )}

        <div className="cr-form-grid">
          <Field label="Notă dovadă *" span={2}>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ce ai făcut, link, screenshot, observație..."
              rows={3}
              className="cr-input cr-textarea"
            />
          </Field>
          <Field label="URL document" span={2}>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              className="cr-input"
            />
          </Field>
        {err && (
            <div className="cr-alert cr-alert--danger cr-field--span-2">{err}</div>
        )}
          <div className="cr-field cr-field--span-2 cr-form-actions">
            <button onClick={handleSubmit} disabled={submitting} className="cr-btn cr-btn--secondary">
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
      </div>
    </section>
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
    <div className="cr-modal-backdrop" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="cr-modal cr-modal--lg">
        <div className="cr-modal__header">
          <div>
            <h2 className="cr-modal__title">Risc manual nou</h2>
            <p className="cr-modal__subtitle">
              Înregistrezi un finding manual care intră în același lifecycle de confirmare, dovadă și audit trail.
            </p>
          </div>
          <button onClick={onClose} className="cr-icon-button cr-modal__close" aria-label="Închide">
            <X size={16} />
          </button>
        </div>

        <div className="cr-modal__body">
          <div className="cr-form-grid">
            <Field label="Titlu *" span={2}>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Provider AI fără DPA semnat"
                className="cr-input"
              />
            </Field>

            <Field label="Descriere problemă *" span={2}>
              <textarea
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                rows={4}
                placeholder="Ce ai observat și de ce e o problemă..."
                className="cr-input cr-textarea"
              />
            </Field>

            <Field label="Categorie">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as FindingCategory)}
                className="cr-input"
              >
                <option value="EU_AI_ACT">{CATEGORY_LABELS.EU_AI_ACT}</option>
                <option value="GDPR">{CATEGORY_LABELS.GDPR}</option>
                <option value="NIS2">{CATEGORY_LABELS.NIS2}</option>
              </select>
            </Field>

            <Field label="Severitate">
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value as ComplianceSeverity)}
                className="cr-input"
              >
                <option value="critical">{SEVERITY_LABELS.critical}</option>
                <option value="high">{SEVERITY_LABELS.high}</option>
                <option value="medium">{SEVERITY_LABELS.medium}</option>
                <option value="low">{SEVERITY_LABELS.low}</option>
              </select>
            </Field>

            <Field label="Referință legală" span={2}>
              <input
                value={legalReference}
                onChange={(e) => setLegalReference(e.target.value)}
                placeholder="Ex: GDPR Art. 28 · EU AI Act Art. 26"
                className="cr-input"
              />
            </Field>

            <Field label="Owner sugerat" span={2}>
              <input
                value={ownerSuggestion}
                onChange={(e) => setOwnerSuggestion(e.target.value)}
                placeholder="Ex: DPO, IT, CISO"
                className="cr-input"
              />
            </Field>

            {err ? <div className="cr-alert cr-alert--danger cr-field--span-2">{err}</div> : null}
          </div>
        </div>

        <div className="cr-modal__footer">
          <button onClick={onClose} className="cr-btn cr-btn--secondary" disabled={submitting}>
            Anulează
          </button>
          <button onClick={handleSubmit} disabled={submitting} className="cr-btn cr-btn--primary">
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

function Field({
  label,
  children,
  span = 1,
}: {
  label: string
  children: React.ReactNode
  span?: 1 | 2
}) {
  return (
    <label className={`cr-field${span === 2 ? " cr-field--span-2" : ""}`}>
      <span className="cr-field-label">{label}</span>
      {children}
    </label>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="cr-section-label">{children}</div>
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
  const className =
    variant === "primary"
      ? "cr-btn cr-btn--primary cr-btn--sm"
      : variant === "danger"
        ? "cr-btn cr-btn--danger cr-btn--sm"
        : "cr-btn cr-btn--sm"
  return <button type="button" onClick={onClick} disabled={disabled} className={className}>{children}</button>
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
