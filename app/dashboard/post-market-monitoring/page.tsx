"use client"

/**
 * Sprint 019 — /dashboard/post-market-monitoring
 *
 * UI mature pentru Post-Market Monitoring (Art. 72 + Annex IV AI Act):
 *  - Stats bar (total / active / overdue reviews / unresolved anomalies / pending substantial)
 *  - Banner pentru sistemele AI high-risk fără plan PMM
 *  - Filter tabs pe status + freshnessStatus
 *  - 5-step wizard (A: sistem+ciclu, B: data collection, C: compliance eval,
 *    D: corrective+preventive, E: notes/baseline)
 *  - Per-record expand: secțiuni A-D + reviews timeline + version changes
 *    timeline + anomalies table
 *  - Modale: Record review / Record version change / Record anomaly
 *  - Acțiuni: Approve / Mark obsolete / Export PDF/MD / Delete
 *
 * Style: inline + v3 design tokens (fără shadcn / Tailwind).
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react"
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Archive,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Download,
  FileText,
  GitBranch,
  History,
  Plus,
  Trash2,
  X,
} from "lucide-react"

import {
  PMM_DATA_COLLECTION_FREQUENCY_LABELS,
  PMM_DATA_COLLECTION_FREQUENCY_OPTIONS,
  PMM_DATA_COLLECTION_METHOD_HELP,
  PMM_DATA_COLLECTION_METHOD_LABELS,
  PMM_DATA_COLLECTION_METHOD_OPTIONS,
  PMM_REVIEW_CYCLE_LABELS,
  PMM_REVIEW_CYCLE_MONTHS,
  PMM_REVIEW_CYCLE_OPTIONS,
} from "@/lib/compliance/pmm-schema"
import type {
  AISystemRecord,
  PmmAnomalyCategory,
  PmmAnomalyRecord,
  PmmAnomalySeverity,
  PmmCompleteness,
  PmmDataCollectionFrequency,
  PmmDataCollectionMethod,
  PmmFreshnessStatus,
  PmmPlan,
  PmmPlanStatus,
  PmmReviewCycle,
  PmmReviewType,
  PmmVersionChangeRecord,
  PmmVersionChangeType,
} from "@/lib/compliance/types"
import type { PmmSummary } from "@/lib/server/pmm-store"

// ────────────────────────────────────────────────────────────────────────────
//   Labels / colors
// ────────────────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<PmmPlanStatus, string> = {
  draft: "Schiță",
  in_review: "În revizie",
  approved: "Aprobat",
  active: "Activ",
  obsolete: "Învechit",
  rejected: "Respins",
}

const STATUS_COLORS: Record<PmmPlanStatus, { bg: string; fg: string }> = {
  draft: { bg: "rgba(148,163,184,0.16)", fg: "#94a3b8" },
  in_review: { bg: "rgba(96,165,250,0.14)", fg: "#60a5fa" },
  approved: { bg: "rgba(96,165,250,0.18)", fg: "#60a5fa" },
  active: { bg: "rgba(52,211,153,0.24)", fg: "#10b981" },
  obsolete: { bg: "rgba(148,163,184,0.12)", fg: "#94a3b8" },
  rejected: { bg: "rgba(248,113,113,0.18)", fg: "#f87171" },
}

const COMPLETENESS_LABELS: Record<PmmCompleteness, string> = {
  incomplete: "Incomplet",
  partial: "Parțial",
  complete: "Complet",
}

const COMPLETENESS_COLORS: Record<PmmCompleteness, { bg: string; fg: string }> = {
  incomplete: { bg: "rgba(248,113,113,0.18)", fg: "#f87171" },
  partial: { bg: "rgba(251,191,36,0.16)", fg: "#fbbf24" },
  complete: { bg: "rgba(52,211,153,0.18)", fg: "#10b981" },
}

const FRESHNESS_LABELS: Record<PmmFreshnessStatus, string> = {
  fresh: "Revizie recentă",
  due_soon: "Revizie iminentă",
  overdue: "Review overdue",
  no_reviews: "Fără reviews",
}

const FRESHNESS_COLORS: Record<PmmFreshnessStatus, { bg: string; fg: string }> = {
  fresh: { bg: "rgba(52,211,153,0.18)", fg: "#10b981" },
  due_soon: { bg: "rgba(251,191,36,0.18)", fg: "#fbbf24" },
  overdue: { bg: "rgba(220,38,38,0.20)", fg: "#dc2626" },
  no_reviews: { bg: "rgba(148,163,184,0.14)", fg: "#94a3b8" },
}

const REVIEW_TYPE_OPTIONS: PmmReviewType[] = [
  "scheduled",
  "ad_hoc",
  "incident_triggered",
  "regulatory_request",
]

const REVIEW_TYPE_LABELS: Record<PmmReviewType, string> = {
  scheduled: "Programat (ciclu standard)",
  ad_hoc: "Ad-hoc (DPO request)",
  incident_triggered: "Declanșat de incident",
  regulatory_request: "Cerere autoritate / regulator",
}

const VERSION_CHANGE_TYPE_OPTIONS: PmmVersionChangeType[] = [
  "model_retrain",
  "model_swap",
  "fine_tune",
  "config_update",
  "prompt_update",
  "data_source_change",
  "infrastructure",
  "other",
]

const VERSION_CHANGE_TYPE_LABELS: Record<PmmVersionChangeType, string> = {
  model_retrain: "Re-antrenare model (același algoritm, date noi)",
  model_swap: "Schimbare model (algoritm nou)",
  fine_tune: "Fine-tune (LLM, embeddings)",
  config_update: "Update configurare (threshold, weights)",
  prompt_update: "Update prompt (LLM apps)",
  data_source_change: "Schimbare surse de date upstream",
  infrastructure: "Schimbare infrastructură (cloud, runtime)",
  other: "Altă schimbare (descrisă)",
}

const ANOMALY_SEVERITY_OPTIONS: PmmAnomalySeverity[] = [
  "low",
  "medium",
  "high",
  "critical",
]

const ANOMALY_SEVERITY_LABELS: Record<PmmAnomalySeverity, string> = {
  low: "Scăzut",
  medium: "Mediu",
  high: "Ridicat",
  critical: "Critic",
}

const ANOMALY_SEVERITY_COLORS: Record<PmmAnomalySeverity, { bg: string; fg: string }> = {
  low: { bg: "rgba(148,163,184,0.16)", fg: "#94a3b8" },
  medium: { bg: "rgba(96,165,250,0.16)", fg: "#60a5fa" },
  high: { bg: "rgba(251,191,36,0.18)", fg: "#fbbf24" },
  critical: { bg: "rgba(220,38,38,0.22)", fg: "#dc2626" },
}

const ANOMALY_CATEGORY_OPTIONS: PmmAnomalyCategory[] = [
  "performance_drop",
  "bias_drift",
  "data_drift",
  "concept_drift",
  "system_error",
  "user_complaint",
  "security",
  "other",
]

const ANOMALY_CATEGORY_LABELS: Record<PmmAnomalyCategory, string> = {
  performance_drop: "Scădere performanță",
  bias_drift: "Drift bias",
  data_drift: "Data drift",
  concept_drift: "Concept drift",
  system_error: "Eroare sistem",
  user_complaint: "Reclamație utilizator",
  security: "Incident securitate",
  other: "Altă categorie",
}

type ListResponse = {
  records: PmmPlan[]
  summary: PmmSummary
}
type AISystemsResponse = { systems: AISystemRecord[] }

// ────────────────────────────────────────────────────────────────────────────
//   Page
// ────────────────────────────────────────────────────────────────────────────

export default function PostMarketMonitoringPage() {
  const [records, setRecords] = useState<PmmPlan[]>([])
  const [summary, setSummary] = useState<PmmSummary | null>(null)
  const [aiSystems, setAiSystems] = useState<AISystemRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showWizard, setShowWizard] = useState(false)
  const [prefilledSystemId, setPrefilledSystemId] = useState<string | undefined>()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<"all" | PmmPlanStatus>("all")
  const [freshnessFilter, setFreshnessFilter] = useState<"all" | PmmFreshnessStatus>("all")
  const [reviewModalForId, setReviewModalForId] = useState<string | null>(null)
  const [versionChangeModalForId, setVersionChangeModalForId] = useState<string | null>(null)
  const [anomalyModalForId, setAnomalyModalForId] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const [pmmRes, sysRes] = await Promise.all([
        fetch("/api/pmm"),
        fetch("/api/ai-systems"),
      ])
      if (pmmRes.ok) {
        const data = (await pmmRes.json()) as ListResponse
        setRecords(data.records ?? [])
        setSummary(data.summary)
      } else {
        setError("Nu am putut încărca registrul PMM.")
      }
      if (sysRes.ok) {
        const data = (await sysRes.json()) as AISystemsResponse
        setAiSystems(data.systems ?? [])
      }
      setError(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (typeof window === "undefined") return
    const params = new URLSearchParams(window.location.search)
    const sid = params.get("systemId")
    if (sid) {
      setPrefilledSystemId(sid)
      setShowWizard(true)
    }
  }, [])

  const filtered = useMemo(() => {
    let result = records
    if (statusFilter !== "all") {
      result = result.filter((r) => r.status === statusFilter)
    }
    if (freshnessFilter !== "all") {
      result = result.filter((r) => r.freshnessStatus === freshnessFilter)
    }
    return result
  }, [records, statusFilter, freshnessFilter])

  const systemsWithoutPlan = useMemo(() => {
    const planSystemIds = new Set(records.map((r) => r.linkedAISystemId))
    return aiSystems.filter((s) => {
      if (planSystemIds.has(s.id)) return false
      if (s.riskLevel === "high") return true
      if (s.purpose === "biometric-identification") return true
      if (s.makesAutomatedDecisions && s.impactsRights) return true
      return false
    })
  }, [aiSystems, records])

  async function handleDelete(id: string) {
    if (!confirm("Ștergi acest plan PMM? Acțiunea apare în audit trail.")) return
    const res = await fetch(`/api/pmm/${id}`, { method: "DELETE" })
    if (res.ok) {
      if (expandedId === id) setExpandedId(null)
      await load()
    }
  }

  async function handleApprove(id: string) {
    const res = await fetch(`/api/pmm/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "approve" }),
    })
    if (res.ok) await load()
  }

  async function handleMarkObsolete(id: string) {
    if (!confirm("Marchezi acest plan PMM ca obsolet?")) return
    const res = await fetch(`/api/pmm/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "obsolete" }),
    })
    if (res.ok) await load()
  }

  function handleExport(id: string, format: "md" | "pdf") {
    const url =
      format === "pdf"
        ? `/api/pmm/${id}/export?format=pdf`
        : `/api/pmm/${id}/export`
    window.open(url, "_blank")
  }

  return (
    <div className="cr-page cr-page--full cr-stack">
      <div className="cr-hero">
        <div className="cr-hero__copy">
          <span className="cr-eyebrow">Conformitate</span>
          <h1 className="cr-title">Monitorizare post-market · Art. 72</h1>
          <p className="cr-subtitle">
          Plan PMM per sistem AI · 5 secțiuni Art. 72(3) · reviews periodice ·
          version changes (Art. 43(4)) · anomalii · Inclus în Audit Pack
          </p>
        </div>
      </div>

      <StatsBar summary={summary} />

      {error && (
        <div className="cr-alert cr-alert--danger">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {systemsWithoutPlan.length > 0 && (
        <div
          style={{
            display: "flex",
            gap: "12px",
            padding: "14px 16px",
            background: "var(--amber-soft)",
            border: "1px solid rgba(251,191,36,0.25)",
            borderRadius: "10px",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <AlertTriangle size={18} style={{ color: "#fbbf24", flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: "200px" }}>
            <div
              style={{
                fontSize: "13px",
                fontWeight: 600,
                color: "#fbbf24",
                marginBottom: "2px",
              }}
            >
              {systemsWithoutPlan.length} sistem
              {systemsWithoutPlan.length !== 1 ? "e" : ""} AI fără plan PMM
              Art. 72
            </div>
            <div style={{ fontSize: "12px", color: "var(--ink-muted)" }}>
              Art. 72(1) impune sistem PMM proporțional cu riscul pentru
              high-risk; cu metode de colectare, evaluare conformitate continuă
              și acțiune corectivă/preventivă (Art. 72(3)).
            </div>
          </div>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {systemsWithoutPlan.slice(0, 3).map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  setPrefilledSystemId(s.id)
                  setShowWizard(true)
                }}
                style={{
                  padding: "6px 12px",
                  background: "transparent",
                  color: "#fbbf24",
                  border: "1px solid rgba(251,191,36,0.4)",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                {s.name} →
              </button>
            ))}
            {systemsWithoutPlan.length > 3 && (
              <span
                style={{
                  fontSize: "11px",
                  color: "var(--ink-dim)",
                  alignSelf: "center",
                }}
              >
                +{systemsWithoutPlan.length - 3} altele
              </span>
            )}
          </div>
        </div>
      )}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "12px",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <FilterTabs value={statusFilter} onChange={setStatusFilter} records={records} />
          <FreshnessFilterTabs
            value={freshnessFilter}
            onChange={setFreshnessFilter}
            records={records}
          />
        </div>
        <button
          onClick={() => {
            setPrefilledSystemId(undefined)
            setShowWizard(true)
          }}
          className="cr-btn cr-btn--primary cr-btn--sm"
        >
          <Plus size={14} /> Nou plan PMM
        </button>
      </div>

      {showWizard && (
        <PmmWizard
          aiSystems={aiSystems}
          prefilledSystemId={prefilledSystemId}
          onClose={() => {
            setShowWizard(false)
            setPrefilledSystemId(undefined)
          }}
          onDone={async () => {
            setShowWizard(false)
            setPrefilledSystemId(undefined)
            await load()
          }}
        />
      )}

      {reviewModalForId && (
        <ReviewModal
          recordId={reviewModalForId}
          onClose={() => setReviewModalForId(null)}
          onDone={async () => {
            setReviewModalForId(null)
            await load()
          }}
        />
      )}

      {versionChangeModalForId && (
        <VersionChangeModal
          recordId={versionChangeModalForId}
          onClose={() => setVersionChangeModalForId(null)}
          onDone={async () => {
            setVersionChangeModalForId(null)
            await load()
          }}
        />
      )}

      {anomalyModalForId && (
        <AnomalyModal
          recordId={anomalyModalForId}
          onClose={() => setAnomalyModalForId(null)}
          onDone={async () => {
            setAnomalyModalForId(null)
            await load()
          }}
        />
      )}

      {loading ? (
        <div style={{ fontSize: "13px", color: "var(--ink-dim)", padding: "24px 0" }}>
          Se încarcă registrul PMM...
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          hasAny={records.length > 0}
          onCreate={() => setShowWizard(true)}
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {filtered.map((record) => (
            <PlanRow
              key={record.id}
              record={record}
              aiSystems={aiSystems}
              expanded={expandedId === record.id}
              onToggle={() =>
                setExpandedId((prev) => (prev === record.id ? null : record.id))
              }
              onDelete={() => handleDelete(record.id)}
              onApprove={() => handleApprove(record.id)}
              onObsolete={() => handleMarkObsolete(record.id)}
              onRecordReview={() => setReviewModalForId(record.id)}
              onRecordVersionChange={() => setVersionChangeModalForId(record.id)}
              onRecordAnomaly={() => setAnomalyModalForId(record.id)}
              onExport={(fmt) => handleExport(record.id, fmt)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
//   StatsBar
// ────────────────────────────────────────────────────────────────────────────

function StatsBar({ summary }: { summary: PmmSummary | null }) {
  const items = [
    { label: "Total", value: summary?.total ?? 0, color: "var(--ink)" },
    { label: "Active", value: summary?.active ?? 0, color: "#10b981" },
    { label: "Overdue", value: summary?.overdue ?? 0, color: "#dc2626" },
    {
      label: "Anomalii nerezolvate",
      value: summary?.unresolvedAnomalies ?? 0,
      color: "#fbbf24",
    },
    {
      label: "Substantial pending",
      value: summary?.substantialChangesPending ?? 0,
      color: "#dc2626",
    },
  ]
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
        gap: "10px",
      }}
    >
      {items.map((item) => (
        <div
          key={item.label}
          style={{
            padding: "12px 14px",
            background: "var(--surface-1)",
            border: "1px solid var(--border-soft)",
            borderRadius: "10px",
          }}
        >
          <div
            style={{
              fontSize: "11px",
              color: "var(--ink-dim)",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            {item.label}
          </div>
          <div
            style={{
              fontSize: "22px",
              fontWeight: 700,
              color: item.color,
              marginTop: "2px",
            }}
          >
            {item.value}
          </div>
        </div>
      ))}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
//   Filter tabs
// ────────────────────────────────────────────────────────────────────────────

function FilterTabs({
  value,
  onChange,
  records,
}: {
  value: "all" | PmmPlanStatus
  onChange: (v: "all" | PmmPlanStatus) => void
  records: PmmPlan[]
}) {
  const counts: Record<"all" | PmmPlanStatus, number> = {
    all: records.length,
    draft: records.filter((r) => r.status === "draft").length,
    in_review: records.filter((r) => r.status === "in_review").length,
    approved: records.filter((r) => r.status === "approved").length,
    active: records.filter((r) => r.status === "active").length,
    obsolete: records.filter((r) => r.status === "obsolete").length,
    rejected: records.filter((r) => r.status === "rejected").length,
  }
  const tabs: Array<{ key: "all" | PmmPlanStatus; label: string }> = [
    { key: "all", label: "Toate" },
    { key: "draft", label: STATUS_LABELS.draft },
    { key: "active", label: STATUS_LABELS.active },
    { key: "obsolete", label: STATUS_LABELS.obsolete },
    { key: "rejected", label: STATUS_LABELS.rejected },
  ]
  return (
    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`cr-filter-chip ${value === t.key ? "is-active" : ""}`}
        >
          {t.label} <span className="cr-tab__count">· {counts[t.key]}</span>
        </button>
      ))}
    </div>
  )
}

function FreshnessFilterTabs({
  value,
  onChange,
  records,
}: {
  value: "all" | PmmFreshnessStatus
  onChange: (v: "all" | PmmFreshnessStatus) => void
  records: PmmPlan[]
}) {
  const counts: Record<"all" | PmmFreshnessStatus, number> = {
    all: records.length,
    fresh: records.filter((r) => r.freshnessStatus === "fresh").length,
    due_soon: records.filter((r) => r.freshnessStatus === "due_soon").length,
    overdue: records.filter((r) => r.freshnessStatus === "overdue").length,
    no_reviews: records.filter((r) => r.freshnessStatus === "no_reviews").length,
  }
  const tabs: Array<{ key: "all" | PmmFreshnessStatus; label: string }> = [
    { key: "all", label: "Toate freshness" },
    { key: "fresh", label: FRESHNESS_LABELS.fresh },
    { key: "due_soon", label: FRESHNESS_LABELS.due_soon },
    { key: "overdue", label: FRESHNESS_LABELS.overdue },
    { key: "no_reviews", label: FRESHNESS_LABELS.no_reviews },
  ]
  return (
    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`cr-filter-chip ${value === t.key ? "is-active" : ""}`}
        >
          {t.label} <span className="cr-tab__count">· {counts[t.key]}</span>
        </button>
      ))}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
//   EmptyState
// ────────────────────────────────────────────────────────────────────────────

function EmptyState({ hasAny, onCreate }: { hasAny: boolean; onCreate: () => void }) {
  return (
    <div
      style={{
        padding: "40px 24px",
        textAlign: "center",
        border: "1px dashed var(--border)",
        borderRadius: "10px",
        color: "var(--ink-dim)",
        fontSize: "13px",
      }}
    >
      <Activity size={36} style={{ color: "var(--ink-dim)", marginBottom: 12 }} />
      <div style={{ fontSize: 14, color: "var(--ink)", marginBottom: 4 }}>
        {hasAny ? "Niciun plan pe filtrul curent" : "Niciun plan PMM înregistrat"}
      </div>
      <div style={{ marginBottom: 16 }}>
        Art. 72 cere sistem PMM proporțional cu riscul pentru sistemele AI
        high-risk.
      </div>
      {!hasAny && (
        <button onClick={onCreate} className="cr-btn cr-btn--primary cr-btn--sm">
          <Plus size={14} /> Creează primul plan PMM
        </button>
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
//   PlanRow + detail expand
// ────────────────────────────────────────────────────────────────────────────

function PlanRow({
  record,
  aiSystems,
  expanded,
  onToggle,
  onDelete,
  onApprove,
  onObsolete,
  onRecordReview,
  onRecordVersionChange,
  onRecordAnomaly,
  onExport,
}: {
  record: PmmPlan
  aiSystems: AISystemRecord[]
  expanded: boolean
  onToggle: () => void
  onDelete: () => void
  onApprove: () => void
  onObsolete: () => void
  onRecordReview: () => void
  onRecordVersionChange: () => void
  onRecordAnomaly: () => void
  onExport: (format: "md" | "pdf") => void
}) {
  const system = aiSystems.find((s) => s.id === record.linkedAISystemId)
  const statusStyle = STATUS_COLORS[record.status]
  const completenessStyle = COMPLETENESS_COLORS[record.completeness]
  const freshnessStyle = FRESHNESS_COLORS[record.freshnessStatus]
  const unresolvedAnomalies = record.anomalies.filter((a) => !a.resolved).length
  const pendingSubstantial = record.versionChanges.filter(
    (c) => c.substantialModification && c.riskReassessmentRequired,
  ).length

  return (
    <div
      style={{
        background: "var(--surface-1)",
        border: "1px solid var(--border-soft)",
        borderRadius: "10px",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "12px 14px",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          cursor: "pointer",
        }}
        onClick={onToggle}
      >
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
                fontSize: 13,
                fontWeight: 600,
                color: "var(--ink)",
              }}
            >
              {record.title}
            </span>
            <span style={{ ...badgeStyle, ...statusStyle }}>
              {STATUS_LABELS[record.status]}
            </span>
            <span style={{ ...badgeStyle, ...completenessStyle }}>
              {COMPLETENESS_LABELS[record.completeness]}
            </span>
            <span style={{ ...badgeStyle, ...freshnessStyle }}>
              {FRESHNESS_LABELS[record.freshnessStatus]}
            </span>
            {unresolvedAnomalies > 0 && (
              <span
                style={{
                  ...badgeStyle,
                  background: "rgba(220,38,38,0.18)",
                  color: "#dc2626",
                }}
              >
                {unresolvedAnomalies} anomalii deschise
              </span>
            )}
            {pendingSubstantial > 0 && (
              <span
                style={{
                  ...badgeStyle,
                  background: "rgba(220,38,38,0.18)",
                  color: "#dc2626",
                }}
              >
                {pendingSubstantial} substantial pending
              </span>
            )}
          </div>
          <div
            style={{
              fontSize: 11,
              color: "var(--ink-dim)",
              marginTop: 4,
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <span>{system?.name ?? record.linkedAISystemId}</span>
            <span>·</span>
            <span>
              Ciclu {PMM_REVIEW_CYCLE_LABELS[record.reviewCycle]} ({record.reviewCycleMonths} luni)
            </span>
            {record.lastReviewAtISO && (
              <>
                <span>·</span>
                <span>Ultima revizie: {record.lastReviewAtISO.slice(0, 10)}</span>
              </>
            )}
            {record.nextReviewISO && (
              <>
                <span>·</span>
                <span>Next: {record.nextReviewISO.slice(0, 10)}</span>
              </>
            )}
          </div>
        </div>
        <button type="button" className="cr-btn cr-btn--icon cr-btn--sm" aria-label="toggle">
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {expanded && (
        <div
          style={{
            borderTop: "1px solid var(--border-soft)",
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          {/* Section A */}
          <Section title="A. Sistem AI + ciclu de revizie">
            <Row label="Sistem AI" value={system?.name ?? record.linkedAISystemId} />
            <Row label="Ciclu" value={PMM_REVIEW_CYCLE_LABELS[record.reviewCycle]} />
            <Row label="Luni între reviews" value={String(record.reviewCycleMonths)} />
            {record.approvedByEmail && (
              <Row
                label="Aprobat de"
                value={`${record.approvedByEmail} (${record.approvedAtISO?.slice(0, 10) ?? "—"})`}
              />
            )}
            {record.rejectionReason && (
              <Row label="Motiv respingere" value={record.rejectionReason} />
            )}
          </Section>

          {/* Section B */}
          <Section title="B. Data collection (Art. 72(3)(a))">
            <Row
              label="Frecvența"
              value={PMM_DATA_COLLECTION_FREQUENCY_LABELS[record.dataCollectionFrequency]}
            />
            <Row label={`Metode (${record.dataCollectionMethods.length})`} value="" />
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginLeft: 12 }}>
              {record.dataCollectionMethods.length === 0 ? (
                <span style={{ fontSize: 12, color: "var(--ink-dim)" }}>—</span>
              ) : (
                record.dataCollectionMethods.map((m) => (
                  <span
                    key={m}
                    style={{
                      ...badgeStyle,
                      background: "rgba(96,165,250,0.12)",
                      color: "#60a5fa",
                    }}
                  >
                    {PMM_DATA_COLLECTION_METHOD_LABELS[m]}
                  </span>
                ))
              )}
            </div>
            <Row label="Descriere" value={record.dataCollectionDescription || "_nedefinită_"} />
          </Section>

          {/* Section C */}
          <Section title="C. Evaluare conformitate continuă (Art. 72(3)(b))">
            <div>
              <div style={subLabel}>Metodologii</div>
              <ListBlock items={record.complianceEvaluationMethods} />
            </div>
            <div>
              <div style={subLabel}>Metrici tracked</div>
              <ListBlock items={record.complianceMetricsTracked} />
            </div>
          </Section>

          {/* Section D */}
          <Section title="D. Acțiune corectivă + preventivă (Art. 72(3)(c))">
            <div>
              <div style={subLabel}>Corectiv</div>
              <div style={paragraph}>{record.correctiveActionProcess || "_nedefinit_"}</div>
            </div>
            <div>
              <div style={subLabel}>Preventiv</div>
              <div style={paragraph}>{record.preventiveActionProcess || "_nedefinit_"}</div>
            </div>
          </Section>

          {/* Reviews timeline */}
          <Section
            title={
              <>
                <History size={14} style={{ marginRight: 6, verticalAlign: "-2px" }} />
                Reviews periodice ({record.reviews.length})
              </>
            }
            action={
              <button onClick={onRecordReview} className="cr-btn cr-btn--secondary cr-btn--sm" type="button">
                <Plus size={12} /> Record review
              </button>
            }
          >
            {record.reviews.length === 0 ? (
              <div style={emptyText}>Niciun review înregistrat.</div>
            ) : (
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Data</th>
                    <th style={thStyle}>Tip</th>
                    <th style={thStyle}>Reviewer</th>
                    <th style={thStyle}>Riscuri</th>
                    <th style={thStyle}>Next</th>
                  </tr>
                </thead>
                <tbody>
                  {record.reviews.map((rv) => (
                    <tr key={rv.id}>
                      <td style={tdStyle}>{rv.reviewDateISO.slice(0, 10)}</td>
                      <td style={tdStyle}>{REVIEW_TYPE_LABELS[rv.reviewType]}</td>
                      <td style={tdStyle}>{rv.reviewedByEmail}</td>
                      <td style={tdStyle}>{rv.risksDetected.length}</td>
                      <td style={tdStyle}>{rv.nextReviewISO.slice(0, 10)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Section>

          {/* Version changes */}
          <Section
            title={
              <>
                <GitBranch size={14} style={{ marginRight: 6, verticalAlign: "-2px" }} />
                Version changes ({record.versionChanges.length})
              </>
            }
            action={
              <button onClick={onRecordVersionChange} className="cr-btn cr-btn--secondary cr-btn--sm" type="button">
                <Plus size={12} /> Record schimbare
              </button>
            }
          >
            {record.versionChanges.length === 0 ? (
              <div style={emptyText}>Nicio schimbare de versiune înregistrată.</div>
            ) : (
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Data</th>
                    <th style={thStyle}>Versiuni</th>
                    <th style={thStyle}>Tip</th>
                    <th style={thStyle}>Substanțial</th>
                    <th style={thStyle}>Re-eval risc</th>
                    <th style={thStyle}>De</th>
                  </tr>
                </thead>
                <tbody>
                  {record.versionChanges.map((ch: PmmVersionChangeRecord) => (
                    <tr key={ch.id}>
                      <td style={tdStyle}>{ch.changedAtISO.slice(0, 10)}</td>
                      <td style={tdStyle}>
                        {ch.oldVersion} → {ch.newVersion}
                      </td>
                      <td style={tdStyle}>{VERSION_CHANGE_TYPE_LABELS[ch.changeType]}</td>
                      <td style={tdStyle}>
                        {ch.substantialModification ? (
                          <span style={{ color: "#dc2626", fontWeight: 600 }}>DA</span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td style={tdStyle}>{ch.riskReassessmentRequired ? "DA" : "—"}</td>
                      <td style={tdStyle}>{ch.changedByEmail}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Section>

          {/* Anomalies */}
          <Section
            title={
              <>
                <AlertTriangle size={14} style={{ marginRight: 6, verticalAlign: "-2px" }} />
                Anomalii detectate ({record.anomalies.length})
              </>
            }
            action={
              <button onClick={onRecordAnomaly} className="cr-btn cr-btn--secondary cr-btn--sm" type="button">
                <Plus size={12} /> Record anomalie
              </button>
            }
          >
            {record.anomalies.length === 0 ? (
              <div style={emptyText}>Nicio anomalie înregistrată.</div>
            ) : (
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Data</th>
                    <th style={thStyle}>Severitate</th>
                    <th style={thStyle}>Categorie</th>
                    <th style={thStyle}>Descriere</th>
                    <th style={thStyle}>Rezolvat</th>
                    <th style={thStyle}>Escaladat</th>
                  </tr>
                </thead>
                <tbody>
                  {record.anomalies.map((a: PmmAnomalyRecord) => {
                    const sc = ANOMALY_SEVERITY_COLORS[a.severity]
                    return (
                      <tr key={a.id}>
                        <td style={tdStyle}>{a.detectedAtISO.slice(0, 10)}</td>
                        <td style={tdStyle}>
                          <span style={{ ...badgeStyle, ...sc }}>
                            {ANOMALY_SEVERITY_LABELS[a.severity]}
                          </span>
                        </td>
                        <td style={tdStyle}>{ANOMALY_CATEGORY_LABELS[a.category]}</td>
                        <td style={tdStyle}>{a.description}</td>
                        <td style={tdStyle}>{a.resolved ? "DA" : "NU"}</td>
                        <td style={tdStyle}>{a.escalatedToIncident ? "DA" : "—"}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </Section>

          {/* Actions */}
          <div
            style={{
              display: "flex",
              gap: "8px",
              justifyContent: "flex-end",
              borderTop: "1px solid var(--border-soft)",
              paddingTop: 12,
              flexWrap: "wrap",
            }}
          >
            <button onClick={() => onExport("md")} className="cr-btn cr-btn--secondary cr-btn--sm">
              <FileText size={12} /> Export MD
            </button>
            <button onClick={() => onExport("pdf")} className="cr-btn cr-btn--secondary cr-btn--sm">
              <Download size={12} /> Export PDF
            </button>
            {record.status !== "active" && record.status !== "obsolete" && (
              <button onClick={onApprove} className="cr-btn cr-btn--secondary cr-btn--sm">
                <CheckCircle2 size={12} /> Aprobă
              </button>
            )}
            {record.status === "active" && (
              <button onClick={onObsolete} className="cr-btn cr-btn--secondary cr-btn--sm">
                <Archive size={12} /> Marchează obsolet
              </button>
            )}
            <button
              onClick={onDelete}
              className="cr-btn cr-btn--danger cr-btn--sm"
            >
              <Trash2 size={12} /> Șterge
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
//   Section + Row + ListBlock primitives
// ────────────────────────────────────────────────────────────────────────────

function Section({
  title,
  action,
  children,
}: {
  title: React.ReactNode
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div
      style={{
        background: "var(--surface-2)",
        border: "1px solid var(--border-soft)",
        borderRadius: 8,
        padding: "12px 14px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 10,
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{title}</div>
        {action}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>{children}</div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", gap: 10, fontSize: 12, color: "var(--ink-muted)" }}>
      <span style={{ minWidth: 140, color: "var(--ink-dim)" }}>{label}</span>
      <span style={{ flex: 1, color: "var(--ink)" }}>{value}</span>
    </div>
  )
}

function ListBlock({ items }: { items: string[] }) {
  if (items.length === 0) return <div style={emptyText}>_nicio intrare_</div>
  return (
    <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "var(--ink)" }}>
      {items.map((it, i) => (
        <li key={i} style={{ marginBottom: 2 }}>
          {it}
        </li>
      ))}
    </ul>
  )
}

// ────────────────────────────────────────────────────────────────────────────
//   PmmWizard (5 steps)
// ────────────────────────────────────────────────────────────────────────────

function PmmWizard({
  aiSystems,
  prefilledSystemId,
  onClose,
  onDone,
}: {
  aiSystems: AISystemRecord[]
  prefilledSystemId?: string
  onClose: () => void
  onDone: () => Promise<void>
}) {
  const [step, setStep] = useState(1)
  const [title, setTitle] = useState("")
  const [linkedAISystemId, setLinkedAISystemId] = useState(prefilledSystemId ?? "")
  const [reviewCycle, setReviewCycle] = useState<PmmReviewCycle>("quarterly")
  const [dataCollectionMethods, setDataCollectionMethods] = useState<PmmDataCollectionMethod[]>(
    ["system_logs", "performance_metrics", "user_feedback"],
  )
  const [dataCollectionFrequency, setDataCollectionFrequency] =
    useState<PmmDataCollectionFrequency>("daily")
  const [dataCollectionDescription, setDataCollectionDescription] = useState("")
  const [complianceMethodsText, setComplianceMethodsText] = useState("")
  const [complianceMetricsText, setComplianceMetricsText] = useState("")
  const [correctiveActionProcess, setCorrectiveActionProcess] = useState("")
  const [preventiveActionProcess, setPreventiveActionProcess] = useState("")
  const [notes, setNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggleMethod = (m: PmmDataCollectionMethod) => {
    setDataCollectionMethods((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m],
    )
  }

  async function submit() {
    setError(null)
    if (!title.trim()) {
      setError("Titlul este obligatoriu.")
      setStep(1)
      return
    }
    if (!linkedAISystemId) {
      setError("Selectează sistemul AI.")
      setStep(1)
      return
    }
    if (!dataCollectionDescription.trim()) {
      setError("Descrierea data collection este obligatorie.")
      setStep(2)
      return
    }
    setSubmitting(true)
    try {
      const body = {
        title,
        linkedAISystemId,
        reviewCycle,
        dataCollectionMethods,
        dataCollectionFrequency,
        dataCollectionDescription,
        complianceEvaluationMethods: complianceMethodsText
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
        complianceMetricsTracked: complianceMetricsText
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
        correctiveActionProcess,
        preventiveActionProcess,
        notes: notes.trim() || undefined,
      }
      const res = await fetch("/api/pmm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data?.error ?? "Eroare la creare.")
        return
      }
      await onDone()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={modalOverlay} onClick={onClose}>
      <div style={modalCard} onClick={(e) => e.stopPropagation()}>
        <div style={modalHeader}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <BarChart3 size={16} style={{ color: "var(--cobalt-400)" }} />
            <strong>Nou plan PMM — pas {step}/5</strong>
          </div>
          <button onClick={onClose} className="cr-btn cr-btn--icon cr-btn--sm">
            <X size={18} />
          </button>
        </div>

        {error && (
          <div
            style={{
              padding: "8px 12px",
              background: "var(--red-soft)",
              borderRadius: 6,
              color: "#f87171",
              fontSize: 12,
            }}
          >
            {error}
          </div>
        )}

        {step === 1 && (
          <>
            <p style={wizardHint}>
              A. Selectează sistemul + ciclul de revizie (Art. 72(1) proporțional cu riscul).
            </p>
            <label style={labelStyle}>Titlu plan</label>
            <input
              className="cr-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder='ex: "PMM Plan — HR Screening AI v1"'
            />
            <label style={labelStyle}>Sistem AI</label>
            <select
              className="cr-input"
              value={linkedAISystemId}
              onChange={(e) => setLinkedAISystemId(e.target.value)}
            >
              <option value="">— alege —</option>
              {aiSystems.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.riskLevel})
                </option>
              ))}
            </select>
            <label style={labelStyle}>Ciclu de revizie</label>
            <select
              className="cr-input"
              value={reviewCycle}
              onChange={(e) => setReviewCycle(e.target.value as PmmReviewCycle)}
            >
              {PMM_REVIEW_CYCLE_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {PMM_REVIEW_CYCLE_LABELS[c]}
                </option>
              ))}
            </select>
            <p style={{ ...wizardHint, color: "var(--ink-dim)" }}>
              {PMM_REVIEW_CYCLE_MONTHS[reviewCycle]} luni între reviews. Pentru
              high-risk minim trimestrial (Art. 72(2)).
            </p>
          </>
        )}

        {step === 2 && (
          <>
            <p style={wizardHint}>
              B. Cum colectezi datele despre performanță? Minim 3 metode pentru completeness
              (Art. 72(3)(a)).
            </p>
            <label style={labelStyle}>Metode active</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {PMM_DATA_COLLECTION_METHOD_OPTIONS.map((m) => (
                <label
                  key={m}
                  style={{
                    display: "flex",
                    gap: 8,
                    fontSize: 12,
                    color: "var(--ink-muted)",
                    alignItems: "flex-start",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={dataCollectionMethods.includes(m)}
                    onChange={() => toggleMethod(m)}
                    style={{ marginTop: 3 }}
                  />
                  <span>
                    <strong style={{ color: "var(--ink)" }}>{PMM_DATA_COLLECTION_METHOD_LABELS[m]}</strong>
                    <br />
                    <span style={{ fontSize: 11, color: "var(--ink-dim)" }}>
                      {PMM_DATA_COLLECTION_METHOD_HELP[m]}
                    </span>
                  </span>
                </label>
              ))}
            </div>
            <label style={labelStyle}>Frecvența</label>
            <select
              className="cr-input"
              value={dataCollectionFrequency}
              onChange={(e) =>
                setDataCollectionFrequency(e.target.value as PmmDataCollectionFrequency)
              }
            >
              {PMM_DATA_COLLECTION_FREQUENCY_OPTIONS.map((f) => (
                <option key={f} value={f}>
                  {PMM_DATA_COLLECTION_FREQUENCY_LABELS[f]}
                </option>
              ))}
            </select>
            <label style={labelStyle}>Descriere narativă pipeline</label>
            <textarea
            className="cr-input cr-textarea"
              style={{ ...inputStyle, minHeight: 80 }}
              value={dataCollectionDescription}
              onChange={(e) => setDataCollectionDescription(e.target.value)}
              placeholder='ex: "SIEM Splunk recepționează evenimente Art. 12 real-time; dashboard zilnic agregă accuracy/bias/latency."'
            />
          </>
        )}

        {step === 3 && (
          <>
            <p style={wizardHint}>
              C. Cum evaluezi conformitatea continuă cu Cap. III Sec. 2 (Art. 72(3)(b))?
              O metodă/metrică pe linie.
            </p>
            <label style={labelStyle}>Metodologii evaluare</label>
            <textarea
            className="cr-input cr-textarea"
              style={{ ...inputStyle, minHeight: 80 }}
              value={complianceMethodsText}
              onChange={(e) => setComplianceMethodsText(e.target.value)}
              placeholder={
                "ex (1 per linie):\ncomparare AI vs ground truth lunar\nrecheck DPIA dacă context schimbat\nbias audit trimestrial pe 5 grupuri"
              }
            />
            <label style={labelStyle}>Metrici tracked</label>
            <textarea
            className="cr-input cr-textarea"
              style={{ ...inputStyle, minHeight: 80 }}
              value={complianceMetricsText}
              onChange={(e) => setComplianceMetricsText(e.target.value)}
              placeholder={
                "ex (1 per linie):\nAnnex III risk indicators\nGDPR DPIA recheck score\nbias gap demografic\nincident count Art. 73"
              }
            />
          </>
        )}

        {step === 4 && (
          <>
            <p style={wizardHint}>
              D. Procesele corective (răspuns la incident) + preventive (anticipare) — Art. 72(3)(c).
            </p>
            <label style={labelStyle}>Proces corectiv</label>
            <textarea
            className="cr-input cr-textarea"
              style={{ ...inputStyle, minHeight: 80 }}
              value={correctiveActionProcess}
              onChange={(e) => setCorrectiveActionProcess(e.target.value)}
              placeholder='ex: "SLA accuracy < 0.85 declanșează review; ML lead aprobă roll-back la versiunea N-1 în 4h; notificare utilizatori afectați în 24h."'
            />
            <label style={labelStyle}>Proces preventiv</label>
            <textarea
            className="cr-input cr-textarea"
              style={{ ...inputStyle, minHeight: 80 }}
              value={preventiveActionProcess}
              onChange={(e) => setPreventiveActionProcess(e.target.value)}
              placeholder='ex: "PSI > 0.2 declanșează retrain candidat; bias audit trimestrial pe 5 grupuri demografice; threat modeling anual."'
            />
          </>
        )}

        {step === 5 && (
          <>
            <p style={wizardHint}>
              E. Confirmare baseline + note finale. Art. 72(2) cere ca planul să acopere
              DURATA VIEȚII sistemului — nu doar primele luni.
            </p>
            <label style={labelStyle}>Note suplimentare (opțional)</label>
            <textarea
            className="cr-input cr-textarea"
              style={{ ...inputStyle, minHeight: 80 }}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder='ex: "Dependențe upstream: provider OpenAI; perioade fără monitoring acceptate: weekend (dashboard pause); exception handling: incident manual escalation."'
            />
            <div
              style={{
                padding: 10,
                background: "var(--surface-2)",
                borderRadius: 8,
                fontSize: 11,
                color: "var(--ink-muted)",
              }}
            >
              Plan creat cu status <strong>draft</strong>. Aprobă din lista de planuri
              pentru a-l face <strong>active</strong>; reviews periodice + version changes
              + anomalii se adaugă apoi inline.
            </div>
          </>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 8,
            borderTop: "1px solid var(--border-soft)",
            paddingTop: 12,
          }}
        >
          <button
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            className="cr-btn cr-btn--secondary cr-btn--sm"
            disabled={step === 1}
          >
            ← Înapoi
          </button>
          {step < 5 ? (
            <button onClick={() => setStep((s) => s + 1)} className="cr-btn cr-btn--primary cr-btn--sm">
              Următorul →
            </button>
          ) : (
            <button onClick={submit} className="cr-btn cr-btn--primary cr-btn--sm" disabled={submitting}>
              {submitting ? "Se creează..." : "Creează planul"}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
//   ReviewModal
// ────────────────────────────────────────────────────────────────────────────

function ReviewModal({
  recordId,
  onClose,
  onDone,
}: {
  recordId: string
  onClose: () => void
  onDone: () => Promise<void>
}) {
  const [reviewType, setReviewType] = useState<PmmReviewType>("scheduled")
  const [reviewedByEmail, setReviewedByEmail] = useState("")
  const [metricsText, setMetricsText] = useState("")
  const [risksText, setRisksText] = useState("")
  const [correctiveText, setCorrectiveText] = useState("")
  const [preventiveText, setPreventiveText] = useState("")
  const [notes, setNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    setError(null)
    setSubmitting(true)
    try {
      // parse metrics text: "key=value" per linie
      const performanceMetrics: Record<string, number | string> = {}
      for (const line of metricsText.split("\n")) {
        const parts = line.split("=")
        if (parts.length < 2) continue
        const k = parts[0].trim()
        const v = parts.slice(1).join("=").trim()
        if (!k || !v) continue
        const n = Number(v)
        performanceMetrics[k] = Number.isFinite(n) ? n : v
      }
      const body = {
        reviewType,
        reviewedByEmail: reviewedByEmail.trim() || undefined,
        performanceMetrics,
        risksDetected: risksText.split("\n").map((s) => s.trim()).filter(Boolean),
        correctiveActions: correctiveText.split("\n").map((s) => s.trim()).filter(Boolean),
        preventiveActions: preventiveText.split("\n").map((s) => s.trim()).filter(Boolean),
        notes: notes.trim() || undefined,
      }
      const res = await fetch(`/api/pmm/${recordId}/review`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data?.error ?? "Eroare la înregistrare review.")
        return
      }
      await onDone()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={modalOverlay} onClick={onClose}>
      <div style={modalCard} onClick={(e) => e.stopPropagation()}>
        <div style={modalHeader}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Clock size={16} style={{ color: "var(--cobalt-400)" }} />
            <strong>Record review</strong>
          </div>
          <button onClick={onClose} className="cr-btn cr-btn--icon cr-btn--sm">
            <X size={18} />
          </button>
        </div>

        {error && (
          <div
            style={{
              padding: "8px 12px",
              background: "var(--red-soft)",
              borderRadius: 6,
              color: "#f87171",
              fontSize: 12,
            }}
          >
            {error}
          </div>
        )}

        <label style={labelStyle}>Tip review</label>
        <select
          className="cr-input"
          value={reviewType}
          onChange={(e) => setReviewType(e.target.value as PmmReviewType)}
        >
          {REVIEW_TYPE_OPTIONS.map((t) => (
            <option key={t} value={t}>
              {REVIEW_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
        <label style={labelStyle}>Email reviewer (lasă gol = user curent)</label>
        <input
          className="cr-input"
          value={reviewedByEmail}
          onChange={(e) => setReviewedByEmail(e.target.value)}
          placeholder="dpo@org.ro"
        />
        <label style={labelStyle}>Metrici performanță (key=value per linie)</label>
        <textarea
            className="cr-input cr-textarea"
          style={{ ...inputStyle, minHeight: 70 }}
          value={metricsText}
          onChange={(e) => setMetricsText(e.target.value)}
          placeholder={"accuracy=0.92\nbias_gap_pct=3.5\np95_latency_ms=1200"}
        />
        <label style={labelStyle}>Riscuri detectate (1 per linie)</label>
        <textarea
            className="cr-input cr-textarea"
          style={{ ...inputStyle, minHeight: 60 }}
          value={risksText}
          onChange={(e) => setRisksText(e.target.value)}
          placeholder="bias gap în creștere pe grup A&#10;latency p95 crescut"
        />
        <label style={labelStyle}>Acțiuni corective (1 per linie)</label>
        <textarea
            className="cr-input cr-textarea"
          style={{ ...inputStyle, minHeight: 60 }}
          value={correctiveText}
          onChange={(e) => setCorrectiveText(e.target.value)}
          placeholder="retrain Q3 cu date balanced"
        />
        <label style={labelStyle}>Acțiuni preventive (1 per linie)</label>
        <textarea
            className="cr-input cr-textarea"
          style={{ ...inputStyle, minHeight: 60 }}
          value={preventiveText}
          onChange={(e) => setPreventiveText(e.target.value)}
          placeholder="bias audit lunar"
        />
        <label style={labelStyle}>Note</label>
        <textarea
            className="cr-input cr-textarea"
          style={{ ...inputStyle, minHeight: 50 }}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            borderTop: "1px solid var(--border-soft)",
            paddingTop: 12,
          }}
        >
          <button onClick={onClose} className="cr-btn cr-btn--secondary cr-btn--sm">
            Anulează
          </button>
          <button onClick={submit} className="cr-btn cr-btn--primary cr-btn--sm" disabled={submitting}>
            {submitting ? "Se salvează..." : "Salvează review"}
          </button>
        </div>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
//   VersionChangeModal
// ────────────────────────────────────────────────────────────────────────────

function VersionChangeModal({
  recordId,
  onClose,
  onDone,
}: {
  recordId: string
  onClose: () => void
  onDone: () => Promise<void>
}) {
  const [oldVersion, setOldVersion] = useState("")
  const [newVersion, setNewVersion] = useState("")
  const [changeType, setChangeType] = useState<PmmVersionChangeType>("config_update")
  const [substantial, setSubstantial] = useState(false)
  const [riskReassessment, setRiskReassessment] = useState(false)
  const [description, setDescription] = useState("")
  const [changedByEmail, setChangedByEmail] = useState("")
  const [approvedByEmail, setApprovedByEmail] = useState("")
  const [notes, setNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    setError(null)
    if (!oldVersion.trim() || !newVersion.trim()) {
      setError("oldVersion + newVersion sunt obligatorii.")
      return
    }
    if (!description.trim()) {
      setError("Descriere obligatorie.")
      return
    }
    setSubmitting(true)
    try {
      const body = {
        oldVersion: oldVersion.trim(),
        newVersion: newVersion.trim(),
        changeType,
        substantialModification: substantial,
        riskReassessmentRequired: riskReassessment,
        description,
        changedByEmail: changedByEmail.trim() || undefined,
        approvedByEmail: approvedByEmail.trim() || undefined,
        notes: notes.trim() || undefined,
      }
      const res = await fetch(`/api/pmm/${recordId}/version-change`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data?.error ?? "Eroare la înregistrare schimbare.")
        return
      }
      await onDone()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={modalOverlay} onClick={onClose}>
      <div style={modalCard} onClick={(e) => e.stopPropagation()}>
        <div style={modalHeader}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <GitBranch size={16} style={{ color: "var(--cobalt-400)" }} />
            <strong>Record version change</strong>
          </div>
          <button onClick={onClose} className="cr-btn cr-btn--icon cr-btn--sm">
            <X size={18} />
          </button>
        </div>

        {error && (
          <div
            style={{
              padding: "8px 12px",
              background: "var(--red-soft)",
              borderRadius: 6,
              color: "#f87171",
              fontSize: 12,
            }}
          >
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Versiune veche</label>
            <input
              className="cr-input"
              value={oldVersion}
              onChange={(e) => setOldVersion(e.target.value)}
              placeholder="v1.0"
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Versiune nouă</label>
            <input
              className="cr-input"
              value={newVersion}
              onChange={(e) => setNewVersion(e.target.value)}
              placeholder="v2.0"
            />
          </div>
        </div>

        <label style={labelStyle}>Tip schimbare</label>
        <select
          className="cr-input"
          value={changeType}
          onChange={(e) => setChangeType(e.target.value as PmmVersionChangeType)}
        >
          {VERSION_CHANGE_TYPE_OPTIONS.map((t) => (
            <option key={t} value={t}>
              {VERSION_CHANGE_TYPE_LABELS[t]}
            </option>
          ))}
        </select>

        <label style={{ ...labelStyle, marginTop: 8 }}>
          <input
            type="checkbox"
            checked={substantial}
            onChange={(e) => setSubstantial(e.target.checked)}
            style={{ marginRight: 8 }}
          />
          Modificare substanțială (Art. 43(4) — declanșează re-evaluarea conformity assessment)
        </label>

        <label style={labelStyle}>
          <input
            type="checkbox"
            checked={riskReassessment}
            onChange={(e) => setRiskReassessment(e.target.checked)}
            style={{ marginRight: 8 }}
          />
          Re-evaluare risc cerută (combo cu substantial → finding CRITICAL dacă lipsește review follow-up 30 zile)
        </label>

        <label style={labelStyle}>Descriere</label>
        <textarea
            className="cr-input cr-textarea"
          style={{ ...inputStyle, minHeight: 60 }}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="ex: retrain pe dataset extins (10M → 50M rows), threshold ridicat la 0.85"
        />
        <label style={labelStyle}>Schimbat de (email, lasă gol = user curent)</label>
        <input
          className="cr-input"
          value={changedByEmail}
          onChange={(e) => setChangedByEmail(e.target.value)}
          placeholder="ml@org.ro"
        />
        <label style={labelStyle}>Aprobat de (opțional)</label>
        <input
          className="cr-input"
          value={approvedByEmail}
          onChange={(e) => setApprovedByEmail(e.target.value)}
          placeholder="cto@org.ro"
        />
        <label style={labelStyle}>Note</label>
        <textarea
            className="cr-input cr-textarea"
          style={{ ...inputStyle, minHeight: 50 }}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            borderTop: "1px solid var(--border-soft)",
            paddingTop: 12,
          }}
        >
          <button onClick={onClose} className="cr-btn cr-btn--secondary cr-btn--sm">
            Anulează
          </button>
          <button onClick={submit} className="cr-btn cr-btn--primary cr-btn--sm" disabled={submitting}>
            {submitting ? "Se salvează..." : "Salvează schimbarea"}
          </button>
        </div>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
//   AnomalyModal
// ────────────────────────────────────────────────────────────────────────────

function AnomalyModal({
  recordId,
  onClose,
  onDone,
}: {
  recordId: string
  onClose: () => void
  onDone: () => Promise<void>
}) {
  const [severity, setSeverity] = useState<PmmAnomalySeverity>("medium")
  const [category, setCategory] = useState<PmmAnomalyCategory>("performance_drop")
  const [description, setDescription] = useState("")
  const [impactDescription, setImpactDescription] = useState("")
  const [resolved, setResolved] = useState(false)
  const [escalated, setEscalated] = useState(false)
  const [linkedIncidentId, setLinkedIncidentId] = useState("")
  const [notes, setNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    setError(null)
    if (description.trim().length < 3) {
      setError("Descriere obligatorie (min 3 caractere).")
      return
    }
    if (!impactDescription.trim()) {
      setError("Impact description obligatoriu.")
      return
    }
    setSubmitting(true)
    try {
      const body = {
        severity,
        category,
        description,
        impactDescription,
        resolved,
        escalatedToIncident: escalated,
        linkedIncidentId: linkedIncidentId.trim() || undefined,
        notes: notes.trim() || undefined,
      }
      const res = await fetch(`/api/pmm/${recordId}/anomaly`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data?.error ?? "Eroare la înregistrare anomalie.")
        return
      }
      await onDone()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={modalOverlay} onClick={onClose}>
      <div style={modalCard} onClick={(e) => e.stopPropagation()}>
        <div style={modalHeader}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <AlertTriangle size={16} style={{ color: "#fbbf24" }} />
            <strong>Record anomalie</strong>
          </div>
          <button onClick={onClose} className="cr-btn cr-btn--icon cr-btn--sm">
            <X size={18} />
          </button>
        </div>

        {error && (
          <div
            style={{
              padding: "8px 12px",
              background: "var(--red-soft)",
              borderRadius: 6,
              color: "#f87171",
              fontSize: 12,
            }}
          >
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Severitate</label>
            <select
              className="cr-input"
              value={severity}
              onChange={(e) => setSeverity(e.target.value as PmmAnomalySeverity)}
            >
              {ANOMALY_SEVERITY_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {ANOMALY_SEVERITY_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Categorie</label>
            <select
              className="cr-input"
              value={category}
              onChange={(e) => setCategory(e.target.value as PmmAnomalyCategory)}
            >
              {ANOMALY_CATEGORY_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {ANOMALY_CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {severity === "critical" && !resolved && (
          <div
            style={{
              padding: "8px 12px",
              background: "rgba(220,38,38,0.10)",
              border: "1px solid rgba(220,38,38,0.25)",
              borderRadius: 6,
              color: "#dc2626",
              fontSize: 11,
            }}
          >
            Anomalie CRITICAL nerezolvată → emite IMEDIAT finding (Art. 72(4) + hook
            escaladare Sprint 020 Art. 73).
          </div>
        )}

        <label style={labelStyle}>Descriere</label>
        <textarea
            className="cr-input cr-textarea"
          style={{ ...inputStyle, minHeight: 60 }}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="ex: bias gap demografic > 20% pe ultimele 7 zile"
        />
        <label style={labelStyle}>Impact</label>
        <textarea
            className="cr-input cr-textarea"
          style={{ ...inputStyle, minHeight: 60 }}
          value={impactDescription}
          onChange={(e) => setImpactDescription(e.target.value)}
          placeholder="ex: deciziile sunt sistematic mai negative pentru grupul A"
        />

        <label style={labelStyle}>
          <input
            type="checkbox"
            checked={resolved}
            onChange={(e) => setResolved(e.target.checked)}
            style={{ marginRight: 8 }}
          />
          Anomalia este deja rezolvată
        </label>

        <label style={labelStyle}>
          <input
            type="checkbox"
            checked={escalated}
            onChange={(e) => setEscalated(e.target.checked)}
            style={{ marginRight: 8 }}
          />
          Escaladată spre AI Incident (Art. 73, Sprint 020)
        </label>

        {escalated && (
          <>
            <label style={labelStyle}>Linked Incident ID (Sprint 020)</label>
            <input
              className="cr-input"
              value={linkedIncidentId}
              onChange={(e) => setLinkedIncidentId(e.target.value)}
              placeholder="incident-xxx"
            />
          </>
        )}

        <label style={labelStyle}>Note</label>
        <textarea
            className="cr-input cr-textarea"
          style={{ ...inputStyle, minHeight: 50 }}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            borderTop: "1px solid var(--border-soft)",
            paddingTop: 12,
          }}
        >
          <button onClick={onClose} className="cr-btn cr-btn--secondary cr-btn--sm">
            Anulează
          </button>
          <button onClick={submit} className="cr-btn cr-btn--primary cr-btn--sm" disabled={submitting}>
            {submitting ? "Se salvează..." : "Salvează anomalia"}
          </button>
        </div>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
//   Styles
// ────────────────────────────────────────────────────────────────────────────

const badgeStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "3px 8px",
  borderRadius: 999,
  fontSize: 10.5,
  fontWeight: 500,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
}

const inputStyle: CSSProperties = {
  padding: "8px 10px",
  background: "var(--surface-2)",
  border: "1px solid var(--border-soft)",
  borderRadius: 6,
  fontSize: "13px",
  color: "var(--ink)",
  outline: "none",
  width: "100%",
}

const labelStyle: CSSProperties = {
  fontSize: "12px",
  color: "var(--ink-muted)",
  display: "block",
  marginBottom: 4,
}

const modalOverlay: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.55)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 50,
  padding: 20,
}

const modalCard: CSSProperties = {
  background: "var(--surface-1)",
  border: "1px solid var(--border-soft)",
  borderRadius: 12,
  padding: 20,
  width: "100%",
  maxWidth: 720,
  display: "flex",
  flexDirection: "column",
  gap: 12,
  maxHeight: "92vh",
  overflowY: "auto",
}

const modalHeader: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  borderBottom: "1px solid var(--border-soft)",
  paddingBottom: 12,
}

const tableStyle: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 12,
}

const thStyle: CSSProperties = {
  textAlign: "left",
  padding: "6px 8px",
  borderBottom: "1px solid var(--border-soft)",
  color: "var(--ink-dim)",
  fontSize: 10,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
}

const tdStyle: CSSProperties = {
  padding: "6px 8px",
  borderBottom: "1px solid var(--border-soft)",
  color: "var(--ink-muted)",
}

const wizardHint: CSSProperties = {
  fontSize: 12,
  color: "var(--ink-muted)",
  margin: 0,
  lineHeight: 1.5,
}

const subLabel: CSSProperties = {
  fontSize: 11,
  color: "var(--ink-dim)",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  marginBottom: 4,
}

const paragraph: CSSProperties = {
  fontSize: 12,
  color: "var(--ink)",
  whiteSpace: "pre-wrap",
}

const emptyText: CSSProperties = {
  fontSize: 11,
  color: "var(--ink-dim)",
  fontStyle: "italic",
}
