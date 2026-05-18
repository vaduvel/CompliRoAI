"use client"

/**
 * Sprint 020 — /dashboard/ai-incidents
 *
 * UI mature pentru AI Incident Reporting (Art. 73 EU AI Act):
 *  - Stats bar (total / notification_required / authority_notified / overdue / closed / catastrophic)
 *  - Urgency banner (top 3 most urgent incidents color-coded după countdown)
 *  - Filter tabs pe status + category + severity
 *  - 5-step wizard (A: identificare, B: severitate+categorie, C: cronologie,
 *    D: evaluare inițială, E: dovezi+asignare)
 *  - Escalation modal (creează incident dintr-o anomalie PMM)
 *  - Per-record expand: secțiuni A-D + notifications timeline + root cause +
 *    linkages (breach + PMM) + findings + audit actions
 *  - Modale: Notify authority / Record root cause / Close incident
 *  - Acțiuni: Export MD/PDF / Export notificare Art. 73(5) / Delete
 *
 * Style: inline + v3 design tokens (fără shadcn / Tailwind).
 * DISTINCT de /dashboard/breach (Sprint 008D) — acela este pentru GDPR Art. 33.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react"
import {
  AlertOctagon,
  AlertTriangle,
  ArrowUpRight,
  Bell,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Download,
  FileText,
  Link2,
  Loader2,
  Plus,
  ShieldAlert,
  X,
} from "lucide-react"

import {
  AI_INCIDENT_CATEGORY_DEADLINE_DAYS,
  AI_INCIDENT_CATEGORY_HELP,
  AI_INCIDENT_CATEGORY_LABELS,
  AI_INCIDENT_CATEGORY_OPTIONS,
  AI_INCIDENT_SCHEMA_V1,
  AI_INCIDENT_SEVERITY_LABELS,
  AI_INCIDENT_SEVERITY_OPTIONS,
  AI_INCIDENT_STATUS_LABELS,
  AI_INCIDENT_STATUS_OPTIONS,
} from "@/lib/compliance/ai-incident-schema"
import type {
  AIIncident,
  AIIncidentCategory,
  AIIncidentSeverity,
  AIIncidentStatus,
  AISystemRecord,
  PmmAnomalyRecord,
  PmmPlan,
} from "@/lib/compliance/types"
import type { AIIncidentSummary } from "@/lib/server/ai-incident-store"

// ────────────────────────────────────────────────────────────────────────────
//   Colors
// ────────────────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<AIIncidentStatus, { bg: string; fg: string }> = {
  draft: { bg: "rgba(148,163,184,0.16)", fg: "#94a3b8" },
  assessing: { bg: "rgba(96,165,250,0.14)", fg: "#60a5fa" },
  notification_required: { bg: "rgba(220,38,38,0.18)", fg: "#dc2626" },
  authority_notified: { bg: "rgba(52,211,153,0.18)", fg: "#10b981" },
  root_cause_investigation: { bg: "rgba(251,191,36,0.18)", fg: "#fbbf24" },
  remediated: { bg: "rgba(96,165,250,0.18)", fg: "#60a5fa" },
  closed: { bg: "rgba(148,163,184,0.14)", fg: "#94a3b8" },
  not_reportable: { bg: "rgba(148,163,184,0.10)", fg: "#94a3b8" },
}

const SEVERITY_COLORS: Record<
  AIIncidentSeverity,
  { bg: string; fg: string }
> = {
  minor: { bg: "rgba(148,163,184,0.16)", fg: "#94a3b8" },
  moderate: { bg: "rgba(96,165,250,0.16)", fg: "#60a5fa" },
  serious: { bg: "rgba(251,191,36,0.18)", fg: "#fbbf24" },
  catastrophic: { bg: "rgba(220,38,38,0.22)", fg: "#dc2626" },
}

const CATEGORY_SHORT_LABEL: Record<AIIncidentCategory, string> = {
  death_or_serious_harm_health: "Deces / lezare gravă",
  critical_infrastructure_disruption: "Infrastructură critică",
  fundamental_rights_infringement: "Drepturi fundamentale",
  widespread_infringement: "Încălcare pe scară largă",
  property_or_environment_harm: "Proprietate / mediu",
  other_serious: "Alt incident serios",
}

type ListResponse = {
  records: AIIncident[]
  summary: AIIncidentSummary
}
type AISystemsResponse = { systems: AISystemRecord[] }
type PmmResponse = { records: PmmPlan[] }

// ────────────────────────────────────────────────────────────────────────────
//   Page
// ────────────────────────────────────────────────────────────────────────────

export default function AIIncidentsPage() {
  const [records, setRecords] = useState<AIIncident[]>([])
  const [summary, setSummary] = useState<AIIncidentSummary | null>(null)
  const [aiSystems, setAiSystems] = useState<AISystemRecord[]>([])
  const [pmmPlans, setPmmPlans] = useState<PmmPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showWizard, setShowWizard] = useState(false)
  const [showEscalateModal, setShowEscalateModal] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<"all" | AIIncidentStatus>("all")
  const [categoryFilter, setCategoryFilter] = useState<"all" | AIIncidentCategory>(
    "all",
  )
  const [severityFilter, setSeverityFilter] = useState<
    "all" | AIIncidentSeverity
  >("all")
  const [notifyModalForId, setNotifyModalForId] = useState<string | null>(null)
  const [rootCauseModalForId, setRootCauseModalForId] = useState<string | null>(
    null,
  )
  const [closeModalForId, setCloseModalForId] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const [incRes, sysRes, pmmRes] = await Promise.all([
        fetch("/api/ai-incidents"),
        fetch("/api/ai-systems"),
        fetch("/api/pmm"),
      ])
      if (incRes.ok) {
        const data = (await incRes.json()) as ListResponse
        setRecords(data.records ?? [])
        setSummary(data.summary)
      } else {
        setError("Nu am putut încărca registrul de incidente AI.")
      }
      if (sysRes.ok) {
        const data = (await sysRes.json()) as AISystemsResponse
        setAiSystems(data.systems ?? [])
      }
      if (pmmRes.ok) {
        const data = (await pmmRes.json()) as PmmResponse
        setPmmPlans(data.records ?? [])
      }
      setError(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = useMemo(() => {
    let result = records
    if (statusFilter !== "all") {
      result = result.filter((r) => r.status === statusFilter)
    }
    if (categoryFilter !== "all") {
      result = result.filter((r) => r.category === categoryFilter)
    }
    if (severityFilter !== "all") {
      result = result.filter((r) => r.severity === severityFilter)
    }
    return result
  }, [records, statusFilter, categoryFilter, severityFilter])

  const urgentIncidents = useMemo(() => {
    const open = records.filter(
      (r) => r.status !== "closed" && r.status !== "not_reportable",
    )
    return [...open]
      .sort((a, b) => {
        const aSubmitted = a.notifications.some(
          (n) => n.status === "submitted" || n.status === "acknowledged",
        )
        const bSubmitted = b.notifications.some(
          (n) => n.status === "submitted" || n.status === "acknowledged",
        )
        // Unnotified first
        if (aSubmitted !== bSubmitted) return aSubmitted ? 1 : -1
        // Then by deadline ascending
        return (
          new Date(a.reportingDeadlineISO).getTime() -
          new Date(b.reportingDeadlineISO).getTime()
        )
      })
      .slice(0, 3)
  }, [records])

  async function handleDelete(id: string) {
    if (
      !confirm(
        "Ștergi acest incident AI? Acțiunea apare în audit trail și NU șterge findings deja emise.",
      )
    )
      return
    const res = await fetch(`/api/ai-incidents/${id}`, { method: "DELETE" })
    if (res.ok) {
      if (expandedId === id) setExpandedId(null)
      await load()
    }
  }

  function handleExport(id: string, format: "md" | "pdf", doc?: string) {
    const params = new URLSearchParams()
    if (format === "pdf") params.set("format", "pdf")
    if (doc) params.set("doc", doc)
    const url = `/api/ai-incidents/${id}/export${params.toString() ? `?${params.toString()}` : ""}`
    window.open(url, "_blank")
  }

  return (
    <div
      style={{
        padding: "32px",
        maxWidth: "1200px",
        display: "flex",
        flexDirection: "column",
        gap: "24px",
      }}
    >
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
          Incidente AI (Art. 73)
        </h1>
        <p
          style={{
            fontSize: "13px",
            color: "var(--ink-muted)",
            marginTop: "6px",
          }}
        >
          Raportare incidente serioase per sistem AI high-risk · 6 categorii Art.
          73(2) · termen 2/10/15 zile Art. 73(3) · investigație root cause Art.
          73(4) · escaladare anomalii PMM · distinct de GDPR Art. 33 · inclus în
          Audit Pack
        </p>
      </div>

      <StatsBar summary={summary} />

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
          <AlertOctagon size={16} style={{ flexShrink: 0, marginTop: "1px" }} />
          {error}
        </div>
      )}

      {urgentIncidents.length > 0 && (
        <UrgencyBanner
          incidents={urgentIncidents}
          aiSystems={aiSystems}
          onOpen={(id) => setExpandedId(id)}
          onNotify={(id) => setNotifyModalForId(id)}
        />
      )}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "12px",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <StatusFilterTabs
            value={statusFilter}
            onChange={setStatusFilter}
            records={records}
          />
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <CategoryFilter value={categoryFilter} onChange={setCategoryFilter} />
            <SeverityFilter value={severityFilter} onChange={setSeverityFilter} />
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button onClick={() => setShowEscalateModal(true)} style={btnGhost}>
            <ArrowUpRight size={14} /> Incident din PMM
          </button>
          <button onClick={() => setShowWizard(true)} style={btnPrimary}>
            <Plus size={14} /> Nou incident
          </button>
        </div>
      </div>

      {showWizard && (
        <IncidentWizard
          aiSystems={aiSystems}
          onClose={() => setShowWizard(false)}
          onDone={async () => {
            setShowWizard(false)
            await load()
          }}
        />
      )}

      {showEscalateModal && (
        <EscalateFromPmmModal
          pmmPlans={pmmPlans}
          aiSystems={aiSystems}
          onClose={() => setShowEscalateModal(false)}
          onDone={async (newIncidentId) => {
            setShowEscalateModal(false)
            await load()
            if (newIncidentId) setExpandedId(newIncidentId)
          }}
        />
      )}

      {notifyModalForId && (
        <NotifyAuthorityModal
          recordId={notifyModalForId}
          onClose={() => setNotifyModalForId(null)}
          onDone={async () => {
            setNotifyModalForId(null)
            await load()
          }}
        />
      )}

      {rootCauseModalForId && (
        <RootCauseModal
          recordId={rootCauseModalForId}
          onClose={() => setRootCauseModalForId(null)}
          onDone={async () => {
            setRootCauseModalForId(null)
            await load()
          }}
        />
      )}

      {closeModalForId && (
        <CloseIncidentModal
          recordId={closeModalForId}
          onClose={() => setCloseModalForId(null)}
          onDone={async () => {
            setCloseModalForId(null)
            await load()
          }}
        />
      )}

      {loading ? (
        <div style={{ fontSize: "13px", color: "var(--ink-dim)", padding: "24px 0" }}>
          Se încarcă registrul de incidente AI...
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          hasAny={records.length > 0}
          onCreate={() => setShowWizard(true)}
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {filtered.map((record) => (
            <IncidentRow
              key={record.id}
              record={record}
              aiSystems={aiSystems}
              expanded={expandedId === record.id}
              onToggle={() =>
                setExpandedId((prev) => (prev === record.id ? null : record.id))
              }
              onDelete={() => handleDelete(record.id)}
              onNotify={() => setNotifyModalForId(record.id)}
              onRootCause={() => setRootCauseModalForId(record.id)}
              onClose={() => setCloseModalForId(record.id)}
              onExport={(fmt, doc) => handleExport(record.id, fmt, doc)}
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

function StatsBar({ summary }: { summary: AIIncidentSummary | null }) {
  const items = [
    { label: "Total", value: summary?.total ?? 0, color: "var(--ink)" },
    {
      label: "Trebuie notificate",
      value: summary?.notificationRequired ?? 0,
      color: "#dc2626",
    },
    {
      label: "Autoritate notificată",
      value: summary?.authorityNotified ?? 0,
      color: "#10b981",
    },
    { label: "Overdue Art. 73(3)", value: summary?.overdue ?? 0, color: "#dc2626" },
    { label: "Urgent (≤ 24h)", value: summary?.urgent ?? 0, color: "#fbbf24" },
    { label: "Catastrofice", value: summary?.catastrophic ?? 0, color: "#dc2626" },
    { label: "Închise", value: summary?.closed ?? 0, color: "#94a3b8" },
  ]
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
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
              fontWeight: 600,
              color: item.color,
              marginTop: 4,
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
//   UrgencyBanner
// ────────────────────────────────────────────────────────────────────────────

function UrgencyBanner({
  incidents,
  aiSystems,
  onOpen,
  onNotify,
}: {
  incidents: AIIncident[]
  aiSystems: AISystemRecord[]
  onOpen: (id: string) => void
  onNotify: (id: string) => void
}) {
  const now = Date.now()
  return (
    <div
      style={{
        padding: "14px 16px",
        background: "var(--amber-soft)",
        border: "1px solid rgba(251,191,36,0.25)",
        borderRadius: "10px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <ShieldAlert size={18} style={{ color: "#fbbf24" }} />
        <div style={{ fontSize: 13, fontWeight: 600, color: "#fbbf24" }}>
          Cele mai urgente incidente AI (Art. 73(3) countdown)
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {incidents.map((inc) => {
          const sysName =
            aiSystems.find((s) => s.id === inc.linkedAISystemId)?.name ??
            inc.linkedAISystemId
          const submitted = inc.notifications.some(
            (n) => n.status === "submitted" || n.status === "acknowledged",
          )
          const diffMs =
            new Date(inc.reportingDeadlineISO).getTime() - now
          const days = Math.round(diffMs / 86_400_000)
          const hours = Math.round(diffMs / 3_600_000)
          let countdownColor = "#fbbf24"
          let countdownLabel = ""
          if (submitted) {
            countdownColor = "#10b981"
            countdownLabel = "Notificat"
          } else if (diffMs < 0) {
            countdownColor = "#dc2626"
            countdownLabel = `Overdue ${Math.abs(days)}z`
          } else if (hours <= 24) {
            countdownColor = "#dc2626"
            countdownLabel = `${hours}h rămase`
          } else {
            countdownLabel = `${days}z rămase`
          }
          return (
            <div
              key={inc.id}
              style={{
                display: "flex",
                gap: 10,
                alignItems: "center",
                padding: "8px 10px",
                background: "var(--surface-2)",
                border: "1px solid var(--border-soft)",
                borderRadius: 8,
                flexWrap: "wrap",
              }}
            >
              <Clock size={14} style={{ color: countdownColor, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>
                  {inc.title}
                </div>
                <div style={{ fontSize: 11, color: "var(--ink-dim)" }}>
                  {sysName} · {CATEGORY_SHORT_LABEL[inc.category]} · termen{" "}
                  {inc.reportingDeadlineDays} zile
                </div>
              </div>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: countdownColor,
                  background: "rgba(0,0,0,0.18)",
                  padding: "4px 8px",
                  borderRadius: 6,
                }}
              >
                {countdownLabel}
              </span>
              {!submitted && (
                <button
                  onClick={() => onNotify(inc.id)}
                  style={{
                    padding: "6px 10px",
                    background: "transparent",
                    color: "#dc2626",
                    border: "1px solid rgba(220,38,38,0.4)",
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 500,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <Bell size={12} /> Notifică
                </button>
              )}
              <button
                onClick={() => onOpen(inc.id)}
                style={{
                  padding: "6px 10px",
                  background: "transparent",
                  color: "var(--ink-muted)",
                  border: "1px solid var(--border-soft)",
                  borderRadius: 6,
                  fontSize: 11,
                  cursor: "pointer",
                }}
              >
                Deschide →
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
//   Filters
// ────────────────────────────────────────────────────────────────────────────

function StatusFilterTabs({
  value,
  onChange,
  records,
}: {
  value: "all" | AIIncidentStatus
  onChange: (v: "all" | AIIncidentStatus) => void
  records: AIIncident[]
}) {
  const counts = useMemo(() => {
    const map: Record<string, number> = { all: records.length }
    for (const r of records) {
      map[r.status] = (map[r.status] ?? 0) + 1
    }
    return map
  }, [records])
  const tabs: { id: "all" | AIIncidentStatus; label: string }[] = [
    { id: "all", label: "Toate" },
    ...AI_INCIDENT_STATUS_OPTIONS.map((s) => ({
      id: s,
      label: AI_INCIDENT_STATUS_LABELS[s],
    })),
  ]
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          style={{
            padding: "6px 10px",
            background:
              value === t.id ? "var(--ink)" : "var(--surface-2)",
            color: value === t.id ? "var(--bg)" : "var(--ink-muted)",
            border: "1px solid var(--border-soft)",
            borderRadius: 6,
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          {t.label} ({counts[t.id] ?? 0})
        </button>
      ))}
    </div>
  )
}

function CategoryFilter({
  value,
  onChange,
}: {
  value: "all" | AIIncidentCategory
  onChange: (v: "all" | AIIncidentCategory) => void
}) {
  return (
    <select
      value={value}
      onChange={(e) =>
        onChange(e.target.value as "all" | AIIncidentCategory)
      }
      style={{ ...inputStyle, width: "auto" }}
    >
      <option value="all">Toate categoriile</option>
      {AI_INCIDENT_CATEGORY_OPTIONS.map((c) => (
        <option key={c} value={c}>
          {CATEGORY_SHORT_LABEL[c]} ({AI_INCIDENT_CATEGORY_DEADLINE_DAYS[c]}z)
        </option>
      ))}
    </select>
  )
}

function SeverityFilter({
  value,
  onChange,
}: {
  value: "all" | AIIncidentSeverity
  onChange: (v: "all" | AIIncidentSeverity) => void
}) {
  return (
    <select
      value={value}
      onChange={(e) =>
        onChange(e.target.value as "all" | AIIncidentSeverity)
      }
      style={{ ...inputStyle, width: "auto" }}
    >
      <option value="all">Toate severitățile</option>
      {AI_INCIDENT_SEVERITY_OPTIONS.map((s) => (
        <option key={s} value={s}>
          {AI_INCIDENT_SEVERITY_LABELS[s]}
        </option>
      ))}
    </select>
  )
}

// ────────────────────────────────────────────────────────────────────────────
//   Empty State
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
        textAlign: "center",
        background: "var(--surface-1)",
        border: "1px dashed var(--border-soft)",
        borderRadius: 12,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        alignItems: "center",
      }}
    >
      <Bell size={32} style={{ color: "var(--ink-dim)" }} />
      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>
        {hasAny ? "Niciun incident corespunde filtrelor" : "Niciun incident AI înregistrat"}
      </div>
      <div
        style={{
          fontSize: 12,
          color: "var(--ink-muted)",
          maxWidth: 480,
          lineHeight: 1.5,
        }}
      >
        Art. 73 cere ca provider-ii sistemelor AI high-risk (și deployer-ii prin
        Art. 26(5)) să raporteze incidentele serioase autorității de
        supraveghere a pieței într-un termen de 2/10/15 zile, în funcție de
        categorie.
      </div>
      {!hasAny && (
        <button onClick={onCreate} style={btnPrimary}>
          <Plus size={14} /> Înregistrează primul incident
        </button>
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
//   IncidentRow (row + expanded panel)
// ────────────────────────────────────────────────────────────────────────────

function IncidentRow({
  record,
  aiSystems,
  expanded,
  onToggle,
  onDelete,
  onNotify,
  onRootCause,
  onClose,
  onExport,
}: {
  record: AIIncident
  aiSystems: AISystemRecord[]
  expanded: boolean
  onToggle: () => void
  onDelete: () => void
  onNotify: () => void
  onRootCause: () => void
  onClose: () => void
  onExport: (format: "md" | "pdf", doc?: string) => void
}) {
  const sysName =
    aiSystems.find((s) => s.id === record.linkedAISystemId)?.name ??
    record.linkedAISystemId
  const submitted = record.notifications.some(
    (n) => n.status === "submitted" || n.status === "acknowledged",
  )
  const diffMs = new Date(record.reportingDeadlineISO).getTime() - Date.now()
  const days = Math.round(diffMs / 86_400_000)
  let deadlineLabel = ""
  let deadlineColor = "var(--ink-dim)"
  if (submitted) {
    deadlineLabel = "Notificat"
    deadlineColor = "#10b981"
  } else if (diffMs < 0) {
    deadlineLabel = `Overdue ${Math.abs(days)}z`
    deadlineColor = "#dc2626"
  } else if (diffMs <= 86_400_000) {
    deadlineLabel = `${Math.round(diffMs / 3_600_000)}h`
    deadlineColor = "#dc2626"
  } else {
    deadlineLabel = `${days}z`
    deadlineColor = "var(--ink-muted)"
  }

  const statusColor = STATUS_COLORS[record.status]
  const sevColor = SEVERITY_COLORS[record.severity]

  return (
    <div
      style={{
        background: "var(--surface-1)",
        border: "1px solid var(--border-soft)",
        borderRadius: 10,
        overflow: "hidden",
      }}
    >
      <button
        onClick={onToggle}
        style={{
          display: "flex",
          width: "100%",
          padding: "12px 14px",
          background: "transparent",
          border: "none",
          color: "inherit",
          cursor: "pointer",
          textAlign: "left",
          gap: 12,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>
            {record.title}
          </div>
          <div style={{ fontSize: 11, color: "var(--ink-dim)", marginTop: 2 }}>
            {sysName} · {CATEGORY_SHORT_LABEL[record.category]} · termen{" "}
            {record.reportingDeadlineDays} zile
          </div>
        </div>
        <span
          style={{
            fontSize: 11,
            fontWeight: 500,
            padding: "3px 8px",
            borderRadius: 6,
            background: sevColor.bg,
            color: sevColor.fg,
          }}
        >
          {AI_INCIDENT_SEVERITY_LABELS[record.severity]}
        </span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: deadlineColor,
            padding: "3px 8px",
            borderRadius: 6,
            background: "rgba(0,0,0,0.18)",
          }}
        >
          {deadlineLabel}
        </span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 500,
            padding: "3px 8px",
            borderRadius: 6,
            background: statusColor.bg,
            color: statusColor.fg,
          }}
        >
          {AI_INCIDENT_STATUS_LABELS[record.status]}
        </span>
        {expanded ? (
          <ChevronUp size={16} style={{ color: "var(--ink-dim)" }} />
        ) : (
          <ChevronDown size={16} style={{ color: "var(--ink-dim)" }} />
        )}
      </button>

      {expanded && (
        <div
          style={{
            padding: "14px 16px 16px",
            borderTop: "1px solid var(--border-soft)",
            display: "flex",
            flexDirection: "column",
            gap: 18,
          }}
        >
          {/* Sections */}
          <Section title="A. Identificare incident">
            <div style={subLabel}>Descriere</div>
            <div style={paragraph}>{record.description}</div>
            <div style={{ ...subLabel, marginTop: 8 }}>Sistem AI</div>
            <div style={paragraph}>{sysName}</div>
          </Section>

          <Section title="B. Severitate + categorie Art. 73(2)">
            <div style={paragraph}>
              <strong>Categorie:</strong>{" "}
              {AI_INCIDENT_CATEGORY_LABELS[record.category]}
              <br />
              <strong>Severitate intern:</strong>{" "}
              {AI_INCIDENT_SEVERITY_LABELS[record.severity]}
              <br />
              <strong>Notificare obligatorie:</strong>{" "}
              {record.notificationRequired ? "DA" : "NU"}
            </div>
          </Section>

          <Section title="C. Cronologie (Art. 73(3))">
            <div style={paragraph}>
              <strong>Detectat (clock start):</strong> {record.detectedAtISO}
              <br />
              {record.occurredAtISO && (
                <>
                  <strong>Producere estimată:</strong> {record.occurredAtISO}
                  <br />
                </>
              )}
              <strong>Termen Art. 73(3):</strong> {record.reportingDeadlineISO}{" "}
              ({record.reportingDeadlineDays} zile)
            </div>
          </Section>

          <Section title="D. Părți afectate">
            <div style={paragraph}>
              <strong>Număr aproximativ:</strong>{" "}
              {typeof record.affectedSubjectsCount === "number"
                ? record.affectedSubjectsCount
                : "necunoscut"}
            </div>
            {record.affectedSubjectsCategories.length > 0 ? (
              <ul style={{ marginTop: 6, paddingLeft: 18 }}>
                {record.affectedSubjectsCategories.map((c) => (
                  <li
                    key={c}
                    style={{ fontSize: 12, color: "var(--ink)", marginBottom: 2 }}
                  >
                    {c}
                  </li>
                ))}
              </ul>
            ) : (
              <div style={emptyText}>_niciuna declarată_</div>
            )}
          </Section>

          {/* Notifications timeline */}
          <Section title="Notificări către autoritatea de supraveghere">
            {record.notifications.length === 0 ? (
              <div style={emptyText}>_Nicio notificare transmisă._</div>
            ) : (
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Data</th>
                    <th style={thStyle}>Autoritate</th>
                    <th style={thStyle}>Status</th>
                    <th style={thStyle}>Ref</th>
                    <th style={thStyle}>Contact</th>
                  </tr>
                </thead>
                <tbody>
                  {record.notifications.map((n) => (
                    <tr key={n.id}>
                      <td style={tdStyle}>{n.submittedAtISO ?? "—"}</td>
                      <td style={tdStyle}>{n.authorityName}</td>
                      <td style={tdStyle}>{n.status}</td>
                      <td style={tdStyle}>{n.referenceNumber ?? "—"}</td>
                      <td style={tdStyle}>{n.contactPersonEmail ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <button
              onClick={onNotify}
              style={{ ...btnGhost, marginTop: 10 }}
              type="button"
            >
              <Bell size={12} /> Trimite notificare autoritate
            </button>
          </Section>

          {/* Root cause */}
          <Section title="Investigație cauză rădăcină (Art. 73(4))">
            {record.rootCause ? (
              <div>
                <div style={paragraph}>
                  <strong>Identificată la:</strong>{" "}
                  {record.rootCause.identifiedAtISO} de{" "}
                  {record.rootCause.identifiedByEmail}
                </div>
                <div style={{ ...subLabel, marginTop: 8 }}>Descriere</div>
                <div style={paragraph}>
                  {record.rootCause.rootCauseDescription}
                </div>
                {record.rootCause.contributingFactors.length > 0 && (
                  <>
                    <div style={{ ...subLabel, marginTop: 8 }}>
                      Factori contribuitori
                    </div>
                    <ul style={{ marginTop: 4, paddingLeft: 18 }}>
                      {record.rootCause.contributingFactors.map((f, i) => (
                        <li
                          key={i}
                          style={{ fontSize: 12, color: "var(--ink)" }}
                        >
                          {f}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                {record.rootCause.remediationActions.length > 0 && (
                  <>
                    <div style={{ ...subLabel, marginTop: 8 }}>
                      Acțiuni corective aplicate
                    </div>
                    <ul style={{ marginTop: 4, paddingLeft: 18 }}>
                      {record.rootCause.remediationActions.map((a, i) => (
                        <li
                          key={i}
                          style={{ fontSize: 12, color: "var(--ink)" }}
                        >
                          {a}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                {record.rootCause.preventionActions.length > 0 && (
                  <>
                    <div style={{ ...subLabel, marginTop: 8 }}>
                      Acțiuni preventive
                    </div>
                    <ul style={{ marginTop: 4, paddingLeft: 18 }}>
                      {record.rootCause.preventionActions.map((a, i) => (
                        <li
                          key={i}
                          style={{ fontSize: 12, color: "var(--ink)" }}
                        >
                          {a}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            ) : (
              <div style={emptyText}>
                _Investigație necompletată — apasă „Înregistrează root cause"._
              </div>
            )}
            <button
              onClick={onRootCause}
              style={{ ...btnGhost, marginTop: 10 }}
              type="button"
            >
              <FileText size={12} /> Înregistrează root cause
            </button>
          </Section>

          {/* Linkages */}
          <Section title="Linkages bidirectional">
            <div style={paragraph}>
              <Link2 size={12} style={{ verticalAlign: "middle" }} />{" "}
              <strong>Breach (Sprint 008D / GDPR Art. 33):</strong>{" "}
              {record.linkedBreachId ?? "—"}
              <br />
              <Link2 size={12} style={{ verticalAlign: "middle" }} />{" "}
              <strong>Anomalie PMM (Sprint 019 / Art. 72):</strong>{" "}
              {record.linkedPmmAnomalyId ?? "—"}
              <br />
              <strong>Findings legate:</strong>{" "}
              {record.linkedFindingIds.length === 0
                ? "—"
                : record.linkedFindingIds.join(", ")}
              <br />
              <strong>Asignat:</strong>{" "}
              {record.assignedToEmail ?? "_de completat_"}
            </div>
          </Section>

          {/* Closure notes */}
          {record.closureNotes && (
            <Section title="Note închidere">
              <div style={paragraph}>{record.closureNotes}</div>
              {record.closedAtISO && (
                <div style={{ fontSize: 11, color: "var(--ink-dim)", marginTop: 4 }}>
                  Închis la: {record.closedAtISO}
                </div>
              )}
            </Section>
          )}

          {/* Actions */}
          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              borderTop: "1px solid var(--border-soft)",
              paddingTop: 12,
            }}
          >
            <button onClick={() => onExport("md")} style={btnGhost}>
              <Download size={12} /> Export MD
            </button>
            <button onClick={() => onExport("pdf")} style={btnGhost}>
              <Download size={12} /> Export PDF
            </button>
            <button
              onClick={() => onExport("md", "authority-notif")}
              style={btnGhost}
            >
              <FileText size={12} /> Notificare Art. 73(5) MD
            </button>
            <button
              onClick={() => onExport("pdf", "authority-notif")}
              style={btnGhost}
            >
              <FileText size={12} /> Notificare Art. 73(5) PDF
            </button>
            {record.status !== "closed" && record.status !== "not_reportable" && (
              <button onClick={onClose} style={btnGhost}>
                <CheckCircle2 size={12} /> Închide incident
              </button>
            )}
            <button
              onClick={onDelete}
              style={{
                ...btnGhost,
                color: "#f87171",
                borderColor: "rgba(248,113,113,0.4)",
              }}
            >
              <X size={12} /> Șterge
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div
        style={{
          fontSize: 11,
          color: "var(--ink-dim)",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          marginBottom: 6,
          fontWeight: 600,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
//   IncidentWizard (5 steps A-E)
// ────────────────────────────────────────────────────────────────────────────

function IncidentWizard({
  aiSystems,
  onClose,
  onDone,
}: {
  aiSystems: AISystemRecord[]
  onClose: () => void
  onDone: () => Promise<void>
}) {
  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [linkedAISystemId, setLinkedAISystemId] = useState("")
  const [category, setCategory] = useState<AIIncidentCategory>(
    "fundamental_rights_infringement",
  )
  const [severity, setSeverity] = useState<AIIncidentSeverity>("serious")
  const [occurredAtISO, setOccurredAtISO] = useState("")
  const [detectedAtISO, setDetectedAtISO] = useState(
    () => new Date().toISOString().slice(0, 16),
  )
  const [affectedSubjectsCategoriesText, setAffectedSubjectsCategoriesText] =
    useState("")
  const [affectedSubjectsCount, setAffectedSubjectsCount] = useState<string>("")
  const [notificationRequired, setNotificationRequired] = useState(true)
  const [assignedToEmail, setAssignedToEmail] = useState("")
  const [notes, setNotes] = useState("")
  const [linkedBreachId, setLinkedBreachId] = useState("")
  const [linkedPmmAnomalyId, setLinkedPmmAnomalyId] = useState("")

  const sections = AI_INCIDENT_SCHEMA_V1.sections
  const totalSteps = sections.length

  const canNext = useMemo(() => {
    if (step === 0)
      return Boolean(
        title.trim() && description.trim().length > 5 && linkedAISystemId,
      )
    if (step === 1) return Boolean(category && severity)
    if (step === 2) return Boolean(detectedAtISO)
    return true
  }, [step, title, description, linkedAISystemId, category, severity, detectedAtISO])

  const deadlineDays = AI_INCIDENT_CATEGORY_DEADLINE_DAYS[category]
  const previewDeadline = (() => {
    try {
      const ms =
        new Date(detectedAtISO).getTime() + deadlineDays * 86_400_000
      if (!Number.isFinite(ms)) return null
      return new Date(ms).toISOString()
    } catch {
      return null
    }
  })()

  async function handleSubmit() {
    setSubmitting(true)
    setError(null)
    try {
      const subjectsList = affectedSubjectsCategoriesText
        .split("\n")
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
      const countNum = Number.parseInt(affectedSubjectsCount, 10)
      const detected =
        detectedAtISO.length === 16
          ? new Date(detectedAtISO).toISOString()
          : detectedAtISO
      const occurred = occurredAtISO
        ? occurredAtISO.length === 16
          ? new Date(occurredAtISO).toISOString()
          : occurredAtISO
        : undefined
      const res = await fetch("/api/ai-incidents", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          category,
          severity,
          linkedAISystemId,
          detectedAtISO: detected,
          occurredAtISO: occurred,
          affectedSubjectsCategories: subjectsList,
          affectedSubjectsCount: Number.isFinite(countNum) ? countNum : undefined,
          notificationRequired,
          assignedToEmail: assignedToEmail || undefined,
          notes: notes || undefined,
          linkedBreachId: linkedBreachId || undefined,
          linkedPmmAnomalyId: linkedPmmAnomalyId || undefined,
        }),
      })
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string }
        setError(j.error ?? "Eroare la salvare.")
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
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "var(--ink)",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <AlertTriangle size={16} /> Nou incident AI · Pasul {step + 1} din{" "}
            {totalSteps}
          </div>
          <button onClick={onClose} style={iconBtn} type="button">
            <X size={16} />
          </button>
        </div>

        {error && (
          <div
            style={{
              padding: "8px 12px",
              background: "var(--red-soft)",
              color: "#f87171",
              borderRadius: 6,
              fontSize: 12,
            }}
          >
            {error}
          </div>
        )}

        <p style={wizardHint}>{sections[step].description}</p>

        {step === 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={labelStyle}>Titlul incidentului</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder='ex: „Diagnostic AI eronat — caz pacient X"'
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Sistemul AI implicat</label>
              <select
                value={linkedAISystemId}
                onChange={(e) => setLinkedAISystemId(e.target.value)}
                style={inputStyle}
              >
                <option value="">— alege sistem AI —</option>
                {aiSystems.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.purpose} · {s.riskLevel})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Descriere narativă</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={6}
                placeholder="Cronologie scurtă: ce s-a întâmplat, când, cum a fost detectat, ce sistem AI..."
                style={{ ...inputStyle, fontFamily: "inherit" }}
              />
            </div>
          </div>
        )}

        {step === 1 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={labelStyle}>Categorie Art. 73(2)</label>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {AI_INCIDENT_CATEGORY_OPTIONS.map((c) => (
                  <label
                    key={c}
                    style={{
                      display: "flex",
                      gap: 8,
                      padding: 10,
                      background:
                        category === c ? "var(--surface-2)" : "transparent",
                      border:
                        category === c
                          ? "1px solid var(--ink)"
                          : "1px solid var(--border-soft)",
                      borderRadius: 8,
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="radio"
                      name="category"
                      checked={category === c}
                      onChange={() => setCategory(c)}
                    />
                    <div>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: "var(--ink)",
                        }}
                      >
                        {AI_INCIDENT_CATEGORY_LABELS[c]} ·{" "}
                        <span style={{ color: "#dc2626" }}>
                          {AI_INCIDENT_CATEGORY_DEADLINE_DAYS[c]} zile
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "var(--ink-dim)",
                          marginTop: 2,
                        }}
                      >
                        {AI_INCIDENT_CATEGORY_HELP[c]}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label style={labelStyle}>Severitate intern (triaj)</label>
              <select
                value={severity}
                onChange={(e) =>
                  setSeverity(e.target.value as AIIncidentSeverity)
                }
                style={inputStyle}
              >
                {AI_INCIDENT_SEVERITY_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {AI_INCIDENT_SEVERITY_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {step === 2 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={labelStyle}>
                Detectare (clock start Art. 73(3))
              </label>
              <input
                type="datetime-local"
                value={detectedAtISO}
                onChange={(e) => setDetectedAtISO(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>
                Producere estimată (opțional, dacă diferit)
              </label>
              <input
                type="datetime-local"
                value={occurredAtISO}
                onChange={(e) => setOccurredAtISO(e.target.value)}
                style={inputStyle}
              />
            </div>
            {previewDeadline && (
              <div
                style={{
                  padding: 12,
                  background: "var(--amber-soft)",
                  border: "1px solid rgba(251,191,36,0.25)",
                  borderRadius: 8,
                  fontSize: 12,
                  color: "#fbbf24",
                }}
              >
                <Clock size={12} style={{ verticalAlign: "middle" }} /> Termen
                Art. 73(3) calculat: <strong>{previewDeadline}</strong> (
                {deadlineDays} zile de la detectare)
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={labelStyle}>
                Categorii persoane afectate (1 per linie)
              </label>
              <textarea
                value={affectedSubjectsCategoriesText}
                onChange={(e) =>
                  setAffectedSubjectsCategoriesText(e.target.value)
                }
                rows={3}
                placeholder={'pacienți spital X\ncandidați la angajare\ncetățeni'}
                style={{ ...inputStyle, fontFamily: "inherit" }}
              />
            </div>
            <div>
              <label style={labelStyle}>Număr aproximativ afectați</label>
              <input
                type="number"
                value={affectedSubjectsCount}
                onChange={(e) => setAffectedSubjectsCount(e.target.value)}
                placeholder="ex: 120"
                style={inputStyle}
              />
            </div>
            <div>
              <label
                style={{
                  ...labelStyle,
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                }}
              >
                <input
                  type="checkbox"
                  checked={notificationRequired}
                  onChange={(e) => setNotificationRequired(e.target.checked)}
                />
                Notificare autoritate obligatorie (Art. 73(1)) — default DA
              </label>
              <p style={{ ...wizardHint, marginTop: 4 }}>
                Bifează DA dacă incidentul este serios. Debifează DOAR după
                evaluare DPO documentată (status va trece pe „not_reportable").
                Evaluator-ul forțează DA pentru categoriile a/b/c indiferent.
              </p>
            </div>
          </div>
        )}

        {step === 4 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={labelStyle}>Responsabil incident (email)</label>
              <input
                value={assignedToEmail}
                onChange={(e) => setAssignedToEmail(e.target.value)}
                placeholder="ex: dpo@acme.ro"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>
                Breach GDPR legat (Sprint 008D — opțional)
              </label>
              <input
                value={linkedBreachId}
                onChange={(e) => setLinkedBreachId(e.target.value)}
                placeholder="ID breach (dacă incidentul atinge și date personale)"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>
                Anomalie PMM legată (Sprint 019 — opțional)
              </label>
              <input
                value={linkedPmmAnomalyId}
                onChange={(e) => setLinkedPmmAnomalyId(e.target.value)}
                placeholder="ID anomalie PMM (pentru escalări manuale)"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Note suplimentare</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                style={{ ...inputStyle, fontFamily: "inherit" }}
              />
            </div>
          </div>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            paddingTop: 12,
            borderTop: "1px solid var(--border-soft)",
          }}
        >
          {step > 0 ? (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              style={btnGhost}
            >
              Înapoi
            </button>
          ) : (
            <div />
          )}
          {step < totalSteps - 1 ? (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              disabled={!canNext}
              style={{ ...btnPrimary, opacity: canNext ? 1 : 0.5 }}
            >
              Pasul {step + 2}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              style={btnPrimary}
            >
              {submitting ? (
                <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} />
              ) : (
                <CheckCircle2 size={12} />
              )}{" "}
              Înregistrează incident
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
//   EscalateFromPmmModal
// ────────────────────────────────────────────────────────────────────────────

function EscalateFromPmmModal({
  pmmPlans,
  aiSystems,
  onClose,
  onDone,
}: {
  pmmPlans: PmmPlan[]
  aiSystems: AISystemRecord[]
  onClose: () => void
  onDone: (newIncidentId?: string) => Promise<void>
}) {
  const [planId, setPlanId] = useState("")
  const [anomalyId, setAnomalyId] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedPlan = useMemo(
    () => pmmPlans.find((p) => p.id === planId),
    [pmmPlans, planId],
  )
  const eligibleAnomalies = useMemo<PmmAnomalyRecord[]>(() => {
    if (!selectedPlan) return []
    return selectedPlan.anomalies.filter(
      (a) => !a.escalatedToIncident && (a.severity === "critical" || a.severity === "high"),
    )
  }, [selectedPlan])

  async function handleSubmit() {
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch("/api/ai-incidents/from-pmm-anomaly", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ planId, anomalyId }),
      })
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string }
        setError(j.error ?? "Eroare la escaladare.")
        return
      }
      const data = (await res.json()) as {
        incident: AIIncident | null
      }
      await onDone(data.incident?.id)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={modalOverlay} onClick={onClose}>
      <div style={modalCard} onClick={(e) => e.stopPropagation()}>
        <div style={modalHeader}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "var(--ink)",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <ArrowUpRight size={16} /> Escaladare anomalie PMM → Incident Art. 73
          </div>
          <button onClick={onClose} style={iconBtn} type="button">
            <X size={16} />
          </button>
        </div>

        {error && (
          <div
            style={{
              padding: "8px 12px",
              background: "var(--red-soft)",
              color: "#f87171",
              borderRadius: 6,
              fontSize: 12,
            }}
          >
            {error}
          </div>
        )}

        <p style={wizardHint}>
          Alege un plan PMM (Sprint 019, Art. 72) și o anomalie cu severitate
          high sau critical pentru a o escalada spre AI Incident Reporting (Art.
          73). Severitatea anomaliei se mapează automat în severitatea
          incidentului (critical→catastrophic, high→serious). DPO ar trebui să
          ajusteze ulterior categoria + decizia de notificare.
        </p>

        <div>
          <label style={labelStyle}>Plan PMM</label>
          <select
            value={planId}
            onChange={(e) => {
              setPlanId(e.target.value)
              setAnomalyId("")
            }}
            style={inputStyle}
          >
            <option value="">— alege plan PMM —</option>
            {pmmPlans.map((p) => {
              const sysName =
                aiSystems.find((s) => s.id === p.linkedAISystemId)?.name ??
                p.linkedAISystemId
              return (
                <option key={p.id} value={p.id}>
                  {p.title} ({sysName})
                </option>
              )
            })}
          </select>
        </div>

        {selectedPlan && (
          <div>
            <label style={labelStyle}>Anomalie eligibilă (high / critical)</label>
            {eligibleAnomalies.length === 0 ? (
              <div style={emptyText}>
                _Nicio anomalie eligibilă pe acest plan. Anomaliile escalate
                sau cu severitate low/medium sunt excluse._
              </div>
            ) : (
              <select
                value={anomalyId}
                onChange={(e) => setAnomalyId(e.target.value)}
                style={inputStyle}
              >
                <option value="">— alege anomalie —</option>
                {eligibleAnomalies.map((a) => (
                  <option key={a.id} value={a.id}>
                    [{a.severity}] {a.category}: {a.description.slice(0, 80)}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            paddingTop: 12,
            borderTop: "1px solid var(--border-soft)",
          }}
        >
          <button type="button" onClick={onClose} style={btnGhost}>
            Anulează
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!planId || !anomalyId || submitting}
            style={{
              ...btnPrimary,
              opacity: !planId || !anomalyId || submitting ? 0.5 : 1,
            }}
          >
            {submitting ? (
              <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} />
            ) : (
              <ArrowUpRight size={12} />
            )}{" "}
            Escaladează
          </button>
        </div>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
//   NotifyAuthorityModal
// ────────────────────────────────────────────────────────────────────────────

function NotifyAuthorityModal({
  recordId,
  onClose,
  onDone,
}: {
  recordId: string
  onClose: () => void
  onDone: () => Promise<void>
}) {
  const [authorityName, setAuthorityName] = useState("")
  const [referenceNumber, setReferenceNumber] = useState("")
  const [contactPersonEmail, setContactPersonEmail] = useState("")
  const [submittedAtISO, setSubmittedAtISO] = useState(
    () => new Date().toISOString().slice(0, 16),
  )
  const [notes, setNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    setSubmitting(true)
    setError(null)
    try {
      const submitted =
        submittedAtISO.length === 16
          ? new Date(submittedAtISO).toISOString()
          : submittedAtISO
      const res = await fetch(
        `/api/ai-incidents/${recordId}/notify-authority`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            authorityName,
            referenceNumber: referenceNumber || undefined,
            contactPersonEmail: contactPersonEmail || undefined,
            submittedAtISO: submitted,
            notes: notes || undefined,
            status: "submitted",
          }),
        },
      )
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string }
        setError(j.error ?? "Eroare la notificare.")
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
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "var(--ink)",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Bell size={16} /> Trimite notificare autoritate (Art. 73(1))
          </div>
          <button onClick={onClose} style={iconBtn} type="button">
            <X size={16} />
          </button>
        </div>

        {error && (
          <div
            style={{
              padding: "8px 12px",
              background: "var(--red-soft)",
              color: "#f87171",
              borderRadius: 6,
              fontSize: 12,
            }}
          >
            {error}
          </div>
        )}

        <p style={wizardHint}>
          Înregistrează că ai transmis notificarea către autoritatea de
          supraveghere a pieței. Numărul de înregistrare este probă oficială și
          necesar pentru audit. Statusul va trece pe „authority_notified".
        </p>

        <div>
          <label style={labelStyle}>Numele autorității</label>
          <input
            value={authorityName}
            onChange={(e) => setAuthorityName(e.target.value)}
            placeholder="ex: Market Surveillance Authority — RO (ADR / ANCOM)"
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Număr de înregistrare</label>
          <input
            value={referenceNumber}
            onChange={(e) => setReferenceNumber(e.target.value)}
            placeholder="ex: MSA-RO-2026-0014"
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Email contact din autoritate</label>
          <input
            value={contactPersonEmail}
            onChange={(e) => setContactPersonEmail(e.target.value)}
            placeholder="ex: incidente.ai@autoritate.ro"
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Data transmiterii</label>
          <input
            type="datetime-local"
            value={submittedAtISO}
            onChange={(e) => setSubmittedAtISO(e.target.value)}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Note</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            style={{ ...inputStyle, fontFamily: "inherit" }}
          />
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            paddingTop: 12,
            borderTop: "1px solid var(--border-soft)",
          }}
        >
          <button type="button" onClick={onClose} style={btnGhost}>
            Anulează
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!authorityName.trim() || submitting}
            style={{
              ...btnPrimary,
              opacity: !authorityName.trim() || submitting ? 0.5 : 1,
            }}
          >
            {submitting ? (
              <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} />
            ) : (
              <Bell size={12} />
            )}{" "}
            Înregistrează notificarea
          </button>
        </div>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
//   RootCauseModal (Art. 73(4))
// ────────────────────────────────────────────────────────────────────────────

function RootCauseModal({
  recordId,
  onClose,
  onDone,
}: {
  recordId: string
  onClose: () => void
  onDone: () => Promise<void>
}) {
  const [description, setDescription] = useState("")
  const [factors, setFactors] = useState("")
  const [evidence, setEvidence] = useState("")
  const [remediation, setRemediation] = useState("")
  const [prevention, setPrevention] = useState("")
  const [identifiedByEmail, setIdentifiedByEmail] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function splitLines(s: string): string[] {
    return s
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
  }

  async function handleSubmit() {
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/ai-incidents/${recordId}/root-cause`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          rootCauseDescription: description,
          contributingFactors: splitLines(factors),
          evidenceCollected: splitLines(evidence),
          remediationActions: splitLines(remediation),
          preventionActions: splitLines(prevention),
          identifiedByEmail: identifiedByEmail || undefined,
        }),
      })
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string }
        setError(j.error ?? "Eroare la salvare.")
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
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "var(--ink)",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <FileText size={16} /> Investigație cauză rădăcină (Art. 73(4))
          </div>
          <button onClick={onClose} style={iconBtn} type="button">
            <X size={16} />
          </button>
        </div>

        {error && (
          <div
            style={{
              padding: "8px 12px",
              background: "var(--red-soft)",
              color: "#f87171",
              borderRadius: 6,
              fontSize: 12,
            }}
          >
            {error}
          </div>
        )}

        <p style={wizardHint}>
          Art. 73(4) cere ca provider-ul (și deployer-ul) să investigheze
          incidentul, identifice cauzele și implementeze măsuri corective +
          preventive verificabile.
        </p>

        <div>
          <label style={labelStyle}>
            Descriere cauză rădăcină (min 10 caractere)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="ex: Model retrained pe dataset sintetic fără cazuri edge → bias pe grupul demografic X..."
            style={{ ...inputStyle, fontFamily: "inherit" }}
          />
        </div>
        <div>
          <label style={labelStyle}>Factori contribuitori (1 per linie)</label>
          <textarea
            value={factors}
            onChange={(e) => setFactors(e.target.value)}
            rows={3}
            placeholder={'dataset insuficient\nlipsă bias audit lunar'}
            style={{ ...inputStyle, fontFamily: "inherit" }}
          />
        </div>
        <div>
          <label style={labelStyle}>Dovezi colectate (1 per linie)</label>
          <textarea
            value={evidence}
            onChange={(e) => setEvidence(e.target.value)}
            rows={3}
            placeholder={'raport bias Q1\nlog model versioning\nincident report intern'}
            style={{ ...inputStyle, fontFamily: "inherit" }}
          />
        </div>
        <div>
          <label style={labelStyle}>Acțiuni corective aplicate</label>
          <textarea
            value={remediation}
            onChange={(e) => setRemediation(e.target.value)}
            rows={3}
            placeholder={'rollback model la v1.0\nretrain cu dataset extins'}
            style={{ ...inputStyle, fontFamily: "inherit" }}
          />
        </div>
        <div>
          <label style={labelStyle}>Acțiuni preventive (prevenire repetare)</label>
          <textarea
            value={prevention}
            onChange={(e) => setPrevention(e.target.value)}
            rows={3}
            placeholder={'bias audit lunar\nhuman-in-the-loop critical cases'}
            style={{ ...inputStyle, fontFamily: "inherit" }}
          />
        </div>
        <div>
          <label style={labelStyle}>Identificat de (email)</label>
          <input
            value={identifiedByEmail}
            onChange={(e) => setIdentifiedByEmail(e.target.value)}
            placeholder="ex: ml-lead@acme.ro"
            style={inputStyle}
          />
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            paddingTop: 12,
            borderTop: "1px solid var(--border-soft)",
          }}
        >
          <button type="button" onClick={onClose} style={btnGhost}>
            Anulează
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={description.trim().length < 10 || submitting}
            style={{
              ...btnPrimary,
              opacity: description.trim().length < 10 || submitting ? 0.5 : 1,
            }}
          >
            {submitting ? (
              <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} />
            ) : (
              <FileText size={12} />
            )}{" "}
            Salvează root cause
          </button>
        </div>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
//   CloseIncidentModal
// ────────────────────────────────────────────────────────────────────────────

function CloseIncidentModal({
  recordId,
  onClose,
  onDone,
}: {
  recordId: string
  onClose: () => void
  onDone: () => Promise<void>
}) {
  const [notes, setNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/ai-incidents/${recordId}/close`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ closureNotes: notes }),
      })
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string }
        setError(j.error ?? "Eroare la închidere.")
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
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "var(--ink)",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <CheckCircle2 size={16} /> Închide incident
          </div>
          <button onClick={onClose} style={iconBtn} type="button">
            <X size={16} />
          </button>
        </div>

        {error && (
          <div
            style={{
              padding: "8px 12px",
              background: "var(--red-soft)",
              color: "#f87171",
              borderRadius: 6,
              fontSize: 12,
            }}
          >
            {error}
          </div>
        )}

        <p style={wizardHint}>
          Documentează închiderea: ce acțiuni au fost aplicate efectiv, dacă
          sistemul AI continuă în producție sau este suspendat, ce lecții au
          fost identificate pentru QMS (Sprint 021). Minim 10 caractere.
        </p>

        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={8}
          placeholder="ex: Root cause confirmat + retrain aplicat + bias audit lunar activat. Sistemul AI continuă în producție. Lecția pentru QMS: bias audit lunar obligatoriu pentru sistemele care iau decizii cu impact pe drepturi."
          style={{ ...inputStyle, fontFamily: "inherit" }}
        />

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            paddingTop: 12,
            borderTop: "1px solid var(--border-soft)",
          }}
        >
          <button type="button" onClick={onClose} style={btnGhost}>
            Anulează
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={notes.trim().length < 10 || submitting}
            style={{
              ...btnPrimary,
              opacity: notes.trim().length < 10 || submitting ? 0.5 : 1,
            }}
          >
            {submitting ? (
              <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} />
            ) : (
              <CheckCircle2 size={12} />
            )}{" "}
            Închide incident
          </button>
        </div>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
//   Style helpers
// ────────────────────────────────────────────────────────────────────────────

const btnPrimary: CSSProperties = {
  padding: "8px 14px",
  background: "var(--ink)",
  color: "var(--bg)",
  border: "none",
  borderRadius: 6,
  fontSize: 12,
  fontWeight: 500,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
}

const btnGhost: CSSProperties = {
  padding: "8px 14px",
  background: "transparent",
  color: "var(--ink-muted)",
  border: "1px solid var(--border-soft)",
  borderRadius: 6,
  fontSize: 12,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
}

const iconBtn: CSSProperties = {
  background: "transparent",
  border: "none",
  cursor: "pointer",
  color: "var(--ink-dim)",
  padding: 4,
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
