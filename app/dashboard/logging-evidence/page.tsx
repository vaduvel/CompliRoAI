"use client"

/**
 * Sprint 018 — /dashboard/logging-evidence
 *
 * UI mature pentru Logging Evidence (Art. 12 + Art. 26(6) AI Act):
 *  - Stats bar (total / draft / active / approaching_expiry / expired / no_evidence)
 *  - Banner pentru sistemele AI high-risk fără config logging
 *  - Filter tabs pe status + retentionStatus
 *  - 4-step wizard (A: sistem+severity, B: categorii, C: storage+retenție,
 *    D: integritate+acces)
 *  - Per-record expand: secțiuni A-D + biometric specifics + evidence items
 *  - Acțiuni: Approve / Attach log evidence (modal) / Export PDF/MD / Mark obsolete
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
  AlertCircle,
  AlertTriangle,
  Archive,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Database,
  Download,
  FileText,
  History,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react"

import {
  DEFAULT_MIN_RETENTION_MONTHS_BY_SEVERITY,
  LOGGING_EVENT_CATEGORIES_ORDERED,
  LOGGING_EVENT_CATEGORY_HELP,
  LOGGING_EVENT_CATEGORY_LABELS,
  LOGGING_INTEGRITY_MECHANISM_LABELS,
  LOGGING_INTEGRITY_MECHANISM_OPTIONS,
  LOGGING_SEVERITY_LEVEL_DESCRIPTIONS,
  LOGGING_SEVERITY_LEVEL_LABELS,
  LOGGING_SEVERITY_LEVEL_OPTIONS,
  LOGGING_STORAGE_BACKEND_LABELS,
  LOGGING_STORAGE_BACKEND_OPTIONS,
} from "@/lib/compliance/logging-schema"
import type {
  AISystemRecord,
  LogEvidenceItem,
  LoggingBiometricSpecifics,
  LoggingCompleteness,
  LoggingConfig,
  LoggingConfigStatus,
  LoggingEventCategory,
  LoggingRetentionStatus,
  LoggingSeverityLevel,
  LoggingStorageBackend,
} from "@/lib/compliance/types"
import type { LoggingSummary } from "@/lib/server/logging-evidence-store"

// ────────────────────────────────────────────────────────────────────────────
//   Labels / colors
// ────────────────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<LoggingConfigStatus, string> = {
  draft: "Schiță",
  in_review: "În revizie",
  active: "Activ",
  expired: "Expirat",
  obsolete: "Învechit",
  rejected: "Respins",
}

const STATUS_COLORS: Record<LoggingConfigStatus, { bg: string; fg: string }> = {
  draft: { bg: "rgba(148,163,184,0.16)", fg: "#94a3b8" },
  in_review: { bg: "rgba(96,165,250,0.14)", fg: "#60a5fa" },
  active: { bg: "rgba(52,211,153,0.24)", fg: "#10b981" },
  expired: { bg: "rgba(248,113,113,0.18)", fg: "#f87171" },
  obsolete: { bg: "rgba(148,163,184,0.12)", fg: "#94a3b8" },
  rejected: { bg: "rgba(248,113,113,0.18)", fg: "#f87171" },
}

const COMPLETENESS_LABELS: Record<LoggingCompleteness, string> = {
  incomplete: "Incomplet",
  partial: "Parțial",
  complete: "Complet",
}

const COMPLETENESS_COLORS: Record<LoggingCompleteness, { bg: string; fg: string }> = {
  incomplete: { bg: "rgba(248,113,113,0.18)", fg: "#f87171" },
  partial: { bg: "rgba(251,191,36,0.16)", fg: "#fbbf24" },
  complete: { bg: "rgba(52,211,153,0.18)", fg: "#10b981" },
}

const RETENTION_LABELS: Record<LoggingRetentionStatus, string> = {
  compliant: "Retenție OK",
  approaching_expiry: "Aproape expirat",
  expired: "Logs expirate",
  no_evidence: "Fără dovadă",
}

const RETENTION_COLORS: Record<LoggingRetentionStatus, { bg: string; fg: string }> = {
  compliant: { bg: "rgba(52,211,153,0.18)", fg: "#10b981" },
  approaching_expiry: { bg: "rgba(251,191,36,0.18)", fg: "#fbbf24" },
  expired: { bg: "rgba(220,38,38,0.20)", fg: "#dc2626" },
  no_evidence: { bg: "rgba(148,163,184,0.14)", fg: "#94a3b8" },
}

const EVIDENCE_TYPE_OPTIONS: LogEvidenceItem["type"][] = [
  "log_export",
  "siem_screenshot",
  "audit_report",
  "retention_proof",
  "integrity_proof",
  "access_log",
  "other",
]

const EVIDENCE_TYPE_LABELS: Record<LogEvidenceItem["type"], string> = {
  log_export: "Export logs (SIEM/backend)",
  siem_screenshot: "Screenshot SIEM",
  audit_report: "Raport audit",
  retention_proof: "Dovadă politică retenție",
  integrity_proof: "Dovadă integritate (hash/audit)",
  access_log: "Log acces la logs (meta-logging)",
  other: "Altul",
}

type ListResponse = {
  records: LoggingConfig[]
  summary: LoggingSummary
}
type AISystemsResponse = { systems: AISystemRecord[] }

// ────────────────────────────────────────────────────────────────────────────
//   Page
// ────────────────────────────────────────────────────────────────────────────

export default function LoggingEvidencePage() {
  const [records, setRecords] = useState<LoggingConfig[]>([])
  const [summary, setSummary] = useState<LoggingSummary | null>(null)
  const [aiSystems, setAiSystems] = useState<AISystemRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showWizard, setShowWizard] = useState(false)
  const [prefilledSystemId, setPrefilledSystemId] = useState<string | undefined>()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<"all" | LoggingConfigStatus>("all")
  const [retentionFilter, setRetentionFilter] = useState<"all" | LoggingRetentionStatus>("all")
  const [evidenceModalForId, setEvidenceModalForId] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const [lgRes, sysRes] = await Promise.all([
        fetch("/api/logging-evidence"),
        fetch("/api/ai-systems"),
      ])
      if (lgRes.ok) {
        const data = (await lgRes.json()) as ListResponse
        setRecords(data.records ?? [])
        setSummary(data.summary)
      } else {
        setError("Nu am putut încărca registrul Logging Evidence.")
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
    if (retentionFilter !== "all") {
      result = result.filter((r) => r.retentionStatus === retentionFilter)
    }
    return result
  }, [records, statusFilter, retentionFilter])

  const systemsWithoutConfig = useMemo(() => {
    const configSystemIds = new Set(records.map((r) => r.linkedAISystemId))
    return aiSystems.filter((s) => {
      if (configSystemIds.has(s.id)) return false
      if (s.riskLevel === "high") return true
      if (s.purpose === "biometric-identification") return true
      if (s.makesAutomatedDecisions && s.impactsRights) return true
      return false
    })
  }, [aiSystems, records])

  async function handleDelete(id: string) {
    if (!confirm("Ștergi această configurare? Acțiunea apare în audit trail.")) return
    const res = await fetch(`/api/logging-evidence/${id}`, { method: "DELETE" })
    if (res.ok) {
      if (expandedId === id) setExpandedId(null)
      await load()
    }
  }

  async function handleApprove(id: string) {
    const res = await fetch(`/api/logging-evidence/${id}/approve`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    })
    if (res.ok) await load()
  }

  async function handleMarkObsolete(id: string) {
    if (!confirm("Marchezi această configurare ca obsoletă?")) return
    const res = await fetch(`/api/logging-evidence/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "obsolete" }),
    })
    if (res.ok) await load()
  }

  function handleExport(id: string, format: "md" | "pdf") {
    const url =
      format === "pdf"
        ? `/api/logging-evidence/${id}/export?format=pdf`
        : `/api/logging-evidence/${id}/export`
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
          Logging Evidence (Art. 12 + Art. 26(6))
        </h1>
        <p
          style={{
            fontSize: "13px",
            color: "var(--ink-muted)",
            marginTop: "6px",
          }}
        >
          Config logging per sistem AI · Art. 12(3) biometric full · retenție min
          6 luni · meta-logging acces · Inclus în Audit Pack
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
          <AlertCircle size={16} style={{ flexShrink: 0, marginTop: "1px" }} />
          {error}
        </div>
      )}

      {systemsWithoutConfig.length > 0 && (
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
              {systemsWithoutConfig.length} sistem
              {systemsWithoutConfig.length !== 1 ? "e" : ""} AI fără config logging
              Art. 12
            </div>
            <div style={{ fontSize: "12px", color: "var(--ink-muted)" }}>
              Art. 12(1) impune logging automat pentru high-risk; Art. 12(3)
              biometric full obligatoriu (Annex III 1(a)); Art. 26(6) retenție
              min 6 luni.
            </div>
          </div>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {systemsWithoutConfig.slice(0, 3).map((s) => (
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
            {systemsWithoutConfig.length > 3 && (
              <span
                style={{
                  fontSize: "11px",
                  color: "var(--ink-dim)",
                  alignSelf: "center",
                }}
              >
                +{systemsWithoutConfig.length - 3} altele
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
          <RetentionFilterTabs
            value={retentionFilter}
            onChange={setRetentionFilter}
            records={records}
          />
        </div>
        <button
          onClick={() => {
            setPrefilledSystemId(undefined)
            setShowWizard(true)
          }}
          style={btnPrimary}
        >
          <Plus size={14} /> Nou config
        </button>
      </div>

      {showWizard && (
        <LoggingWizard
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

      {evidenceModalForId && (
        <EvidenceModal
          recordId={evidenceModalForId}
          onClose={() => setEvidenceModalForId(null)}
          onDone={async () => {
            setEvidenceModalForId(null)
            await load()
          }}
        />
      )}

      {loading ? (
        <div style={{ fontSize: "13px", color: "var(--ink-dim)", padding: "24px 0" }}>
          Se încarcă registrul Logging Evidence...
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          hasAny={records.length > 0}
          onCreate={() => setShowWizard(true)}
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {filtered.map((record) => (
            <ConfigRow
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
              onAttachEvidence={() => setEvidenceModalForId(record.id)}
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

function StatsBar({ summary }: { summary: LoggingSummary | null }) {
  const items = [
    { label: "Total", value: summary?.total ?? 0, color: "var(--ink)" },
    { label: "Schiță", value: summary?.draft ?? 0, color: "#94a3b8" },
    { label: "Activ", value: summary?.active ?? 0, color: "#10b981" },
    { label: "Aproape expirat", value: summary?.approachingExpiry ?? 0, color: "#fbbf24" },
    { label: "Expirate", value: summary?.expiredRetention ?? 0, color: "#dc2626" },
    { label: "Fără dovadă", value: summary?.noEvidence ?? 0, color: "#94a3b8" },
  ]
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
        gap: "10px",
      }}
    >
      {items.map((it) => (
        <div
          key={it.label}
          style={{
            background: "var(--surface-1)",
            border: "1px solid var(--border-soft)",
            borderRadius: "10px",
            padding: "14px 16px",
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
            {it.label}
          </div>
          <div
            style={{
              fontFamily: "var(--font-display-v3)",
              fontSize: "22px",
              fontWeight: 600,
              marginTop: "4px",
              color: it.color,
            }}
          >
            {it.value}
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
  value: "all" | LoggingConfigStatus
  onChange: (v: "all" | LoggingConfigStatus) => void
  records: LoggingConfig[]
}) {
  const tabs: Array<{ id: "all" | LoggingConfigStatus; label: string }> = [
    { id: "all", label: "Toate" },
    { id: "draft", label: "Schiță" },
    { id: "in_review", label: "În revizie" },
    { id: "active", label: "Active" },
    { id: "expired", label: "Expirate" },
    { id: "rejected", label: "Respinse" },
  ]
  return (
    <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
      {tabs.map((tab) => {
        const count =
          tab.id === "all"
            ? records.length
            : records.filter((r) => r.status === tab.id).length
        const active = value === tab.id
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            style={{
              padding: "6px 12px",
              background: active ? "var(--surface-2)" : "transparent",
              border: "1px solid var(--border-soft)",
              borderRadius: "6px",
              fontSize: "12px",
              color: active ? "var(--ink)" : "var(--ink-muted)",
              fontWeight: active ? 500 : 400,
              cursor: "pointer",
            }}
          >
            {tab.label} ({count})
          </button>
        )
      })}
    </div>
  )
}

function RetentionFilterTabs({
  value,
  onChange,
  records,
}: {
  value: "all" | LoggingRetentionStatus
  onChange: (v: "all" | LoggingRetentionStatus) => void
  records: LoggingConfig[]
}) {
  const tabs: Array<{ id: "all" | LoggingRetentionStatus; label: string }> = [
    { id: "all", label: "Toate retențiile" },
    { id: "compliant", label: "Retenție OK" },
    { id: "approaching_expiry", label: "Aproape expirat" },
    { id: "expired", label: "Expirate" },
    { id: "no_evidence", label: "Fără dovadă" },
  ]
  return (
    <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
      {tabs.map((tab) => {
        const count =
          tab.id === "all"
            ? records.length
            : records.filter((r) => r.retentionStatus === tab.id).length
        const active = value === tab.id
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            style={{
              padding: "5px 10px",
              background: active ? "var(--surface-2)" : "transparent",
              border: "1px solid var(--border-soft)",
              borderRadius: "5px",
              fontSize: "11px",
              color: active ? "var(--ink)" : "var(--ink-dim)",
              fontWeight: active ? 500 : 400,
              cursor: "pointer",
            }}
          >
            {tab.label} ({count})
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
        textAlign: "center",
        background: "var(--surface-1)",
        border: "1px dashed var(--border-soft)",
        borderRadius: "10px",
      }}
    >
      <Database
        size={32}
        style={{ color: "var(--ink-dim)", marginBottom: "12px", opacity: 0.6 }}
      />
      <h3
        style={{
          fontSize: "15px",
          fontWeight: 500,
          color: "var(--ink)",
          margin: 0,
        }}
      >
        {hasAny
          ? "Nicio configurare pentru filtru"
          : "Niciun config Logging încă"}
      </h3>
      <p
        style={{
          fontSize: "13px",
          color: "var(--ink-muted)",
          margin: "8px 0 16px",
        }}
      >
        {hasAny
          ? "Schimbă filtrul de status / retenție sau adaugă un config nou."
          : "Art. 12 cere logging automat per sistem AI high-risk; retenție min 6 luni (Art. 26(6))."}
      </p>
      <button onClick={onCreate} style={btnPrimary}>
        <Plus size={14} /> Nou config
      </button>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
//   Config row (collapsed + expanded)
// ────────────────────────────────────────────────────────────────────────────

function ConfigRow({
  record,
  aiSystems,
  expanded,
  onToggle,
  onDelete,
  onApprove,
  onObsolete,
  onAttachEvidence,
  onExport,
}: {
  record: LoggingConfig
  aiSystems: AISystemRecord[]
  expanded: boolean
  onToggle: () => void
  onDelete: () => void
  onApprove: () => void
  onObsolete: () => void
  onAttachEvidence: () => void
  onExport: (fmt: "md" | "pdf") => void
}) {
  const system = aiSystems.find((s) => s.id === record.linkedAISystemId)
  const statusColor = STATUS_COLORS[record.status]
  const compColor = COMPLETENESS_COLORS[record.completeness]
  const retentionColor = RETENTION_COLORS[record.retentionStatus]
  const canApprove = record.status === "draft" || record.status === "in_review"
  const canMarkObsolete = record.status === "active"

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
        onClick={onToggle}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "14px 16px",
          cursor: "pointer",
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                fontSize: "14px",
                fontWeight: 500,
                color: "var(--ink)",
              }}
            >
              {record.title}
            </div>
            <span style={{ ...badgeStyle, background: statusColor.bg, color: statusColor.fg }}>
              {STATUS_LABELS[record.status]}
            </span>
            <span style={{ ...badgeStyle, background: compColor.bg, color: compColor.fg }}>
              {COMPLETENESS_LABELS[record.completeness]}
            </span>
            <span
              style={{
                ...badgeStyle,
                background: retentionColor.bg,
                color: retentionColor.fg,
              }}
            >
              {RETENTION_LABELS[record.retentionStatus]}
            </span>
            <span
              style={{
                ...badgeStyle,
                background: "rgba(96,165,250,0.10)",
                color: "#60a5fa",
              }}
            >
              {LOGGING_SEVERITY_LEVEL_LABELS[record.severityLevel].split(" — ")[0]}
            </span>
          </div>
          <div
            style={{
              fontSize: "11px",
              color: "var(--ink-dim)",
              marginTop: "4px",
              display: "flex",
              gap: "10px",
              flexWrap: "wrap",
            }}
          >
            <span>Sistem: {system?.name ?? record.linkedAISystemId}</span>
            <span>
              · Retenție: {record.actualRetentionMonths}/{record.minRetentionMonths} luni
            </span>
            {record.lastEvidenceAtISO && (
              <span>· Ultima dovadă: {record.lastEvidenceAtISO.slice(0, 10)}</span>
            )}
            {record.approvedByEmail && (
              <span>· Activat de {record.approvedByEmail}</span>
            )}
          </div>
        </div>
        <button style={iconBtn} aria-label={expanded ? "Colapsează" : "Extinde"}>
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {expanded && (
        <div
          style={{
            padding: "16px",
            borderTop: "1px solid var(--border-soft)",
            display: "flex",
            flexDirection: "column",
            gap: "18px",
            background: "var(--surface-2)",
          }}
        >
          <ExpandedDetail record={record} system={system} />

          <div
            style={{
              display: "flex",
              gap: "8px",
              flexWrap: "wrap",
              borderTop: "1px solid var(--border-soft)",
              paddingTop: "14px",
            }}
          >
            {canApprove && (
              <button onClick={onApprove} style={btnPrimary}>
                <CheckCircle2 size={14} /> Activează
              </button>
            )}
            <button onClick={onAttachEvidence} style={btnGhost}>
              <Upload size={14} /> Atașează logs / dovadă
            </button>
            <button onClick={() => onExport("md")} style={btnGhost}>
              <FileText size={14} /> MD
            </button>
            <button onClick={() => onExport("pdf")} style={btnGhost}>
              <Download size={14} /> PDF
            </button>
            {canMarkObsolete && (
              <button onClick={onObsolete} style={btnGhost}>
                <Archive size={14} /> Marchează obsolet
              </button>
            )}
            <button onClick={onDelete} style={{ ...btnGhost, color: "#f87171" }}>
              <Trash2 size={14} /> Șterge
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function ExpandedDetail({
  record,
  system,
}: {
  record: LoggingConfig
  system?: AISystemRecord
}) {
  return (
    <>
      <Section title="A. Sistem AI + nivel severitate">
        <div style={detailRow}>
          <strong>Severitate:</strong> {LOGGING_SEVERITY_LEVEL_LABELS[record.severityLevel]}
        </div>
        <div style={{ ...detailRow, color: "var(--ink-muted)", fontSize: "12px" }}>
          {LOGGING_SEVERITY_LEVEL_DESCRIPTIONS[record.severityLevel]}
        </div>
        <div style={detailRow}>
          <strong>Sistem AI legat:</strong> {system?.name ?? record.linkedAISystemId}
          {system?.purpose === "biometric-identification" && (
            <span
              style={{
                ...badgeStyle,
                background: "rgba(248,113,113,0.18)",
                color: "#f87171",
                marginLeft: "8px",
              }}
            >
              Biometric ID — Art. 12(3) full obligatoriu
            </span>
          )}
        </div>
      </Section>

      <Section title="B. Categorii evenimente loguite (Art. 12(2)/(3))">
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {LOGGING_EVENT_CATEGORIES_ORDERED.map((cat) => {
            const logged = record.eventCategoriesLogged.includes(cat)
            return (
              <div
                key={cat}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "8px",
                  fontSize: "13px",
                }}
              >
                <span
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 4,
                    border: "1px solid var(--border-soft)",
                    background: logged ? "rgba(52,211,153,0.18)" : "transparent",
                    color: logged ? "#10b981" : "transparent",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    marginTop: "1px",
                  }}
                >
                  {logged ? "✓" : ""}
                </span>
                <div>
                  <div style={{ color: "var(--ink)" }}>{LOGGING_EVENT_CATEGORY_LABELS[cat]}</div>
                  <div style={{ fontSize: "11px", color: "var(--ink-dim)" }}>
                    {LOGGING_EVENT_CATEGORY_HELP[cat]}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        {record.biometricSpecific && (
          <div style={{ marginTop: 12 }}>
            <div
              style={{ fontSize: 12, color: "var(--ink-muted)", marginBottom: 6 }}
            >
              Câmpuri Art. 12(3) biometric ID
            </div>
            <BiometricChips bs={record.biometricSpecific} />
          </div>
        )}
      </Section>

      <Section title="C. Storage + retenție (Art. 26(6))">
        <div style={detailRow}>
          <strong>Backend:</strong> {LOGGING_STORAGE_BACKEND_LABELS[record.storageBackend]}
        </div>
        <div style={detailRow}>
          <strong>Locație:</strong>{" "}
          <code style={{ fontSize: 11, color: "var(--ink-muted)" }}>
            {record.storageLocation}
          </code>
        </div>
        <div style={detailRow}>
          <strong>Retenția:</strong> actuală {record.actualRetentionMonths} luni · minim cerut{" "}
          {record.minRetentionMonths} luni
          {record.actualRetentionMonths < record.minRetentionMonths && (
            <span
              style={{
                ...badgeStyle,
                background: "rgba(248,113,113,0.18)",
                color: "#f87171",
                marginLeft: 6,
              }}
            >
              Sub minim Art. 26(6)
            </span>
          )}
        </div>
        {record.retentionPolicy && (
          <div style={{ ...detailRow, color: "var(--ink-muted)", fontSize: 12 }}>
            {record.retentionPolicy}
          </div>
        )}
      </Section>

      <Section title="D. Integritate + control acces">
        <div style={detailRow}>
          <strong>Mecanism integritate:</strong>{" "}
          {LOGGING_INTEGRITY_MECHANISM_LABELS[record.integrityMechanism]}
        </div>
        {record.integrityMechanismDescription && (
          <div style={{ ...detailRow, color: "var(--ink-muted)", fontSize: 12 }}>
            {record.integrityMechanismDescription}
          </div>
        )}
        <div style={detailRow}>
          <strong>Roluri cu acces:</strong>{" "}
          {record.accessRoleDescription || (
            <em style={{ color: "var(--ink-dim)" }}>nedefinite</em>
          )}
        </div>
        <div style={detailRow}>
          <strong>Meta-logging acces:</strong> {record.accessLogged ? "DA" : "NU"}
        </div>
      </Section>

      <Section title="Checklist evidență">
        {record.evidenceChecklist.length === 0 ? (
          <em style={{ color: "var(--ink-dim)" }}>Niciun item definit.</em>
        ) : (
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "var(--ink-muted)" }}>
            {record.evidenceChecklist.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Dovezi atașate">
        {record.evidenceItems.length === 0 ? (
          <em style={{ color: "var(--ink-dim)" }}>Nicio dovadă încărcată.</em>
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Tip</th>
                <th style={thStyle}>Descriere</th>
                <th style={thStyle}>Perioadă</th>
                <th style={thStyle}>Encărcat</th>
                <th style={thStyle}>De</th>
              </tr>
            </thead>
            <tbody>
              {record.evidenceItems.map((e) => (
                <tr key={e.id}>
                  <td style={tdStyle}>{EVIDENCE_TYPE_LABELS[e.type]}</td>
                  <td style={tdStyle}>
                    {e.description}
                    {e.url && (
                      <>
                        {" · "}
                        <a href={e.url} target="_blank" rel="noreferrer" style={{ color: "#60a5fa" }}>
                          link
                        </a>
                      </>
                    )}
                  </td>
                  <td style={tdStyle}>
                    {e.coversPeriodStartISO && e.coversPeriodEndISO
                      ? `${e.coversPeriodStartISO.slice(0, 10)} → ${e.coversPeriodEndISO.slice(0, 10)}`
                      : "—"}
                  </td>
                  <td style={tdStyle}>{e.uploadedAtISO.slice(0, 10)}</td>
                  <td style={tdStyle}>{e.uploadedByEmail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      {record.linkedFindingIds.length > 0 && (
        <Section title={`Findings legate (${record.linkedFindingIds.length})`}>
          <div style={{ fontSize: 12, color: "var(--ink-muted)" }}>
            {record.linkedFindingIds.join(", ")}
          </div>
        </Section>
      )}

      {record.nextReviewISO && (
        <Section title="Următoarea revizie">
          <div style={detailRow}>
            <Clock size={14} style={{ color: "var(--ink-dim)" }} />{" "}
            {record.nextReviewISO.slice(0, 10)}
          </div>
        </Section>
      )}
    </>
  )
}

function BiometricChips({ bs }: { bs: LoggingBiometricSpecifics }) {
  const items: Array<{ ok: boolean; label: string }> = [
    { ok: bs.periodOfUseTracked, label: "(a) Perioadă utilizare" },
    { ok: bs.referenceDatabaseRecorded, label: "(b) Bază de date referință" },
    { ok: bs.inputDataRecorded, label: "(c) Input data" },
    { ok: bs.operatorsIdentified, label: "(d) Operatori identificați" },
  ]
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {items.map((it) => (
        <span
          key={it.label}
          style={{
            ...badgeStyle,
            background: it.ok ? "rgba(52,211,153,0.18)" : "rgba(248,113,113,0.18)",
            color: it.ok ? "#10b981" : "#f87171",
          }}
        >
          {it.ok ? "✓" : "×"} {it.label}
        </span>
      ))}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={subTitle}>{title}</div>
      <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
        {children}
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
//   Wizard (4 steps)
// ────────────────────────────────────────────────────────────────────────────

function LoggingWizard({
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
  const [step, setStep] = useState(0)
  const [title, setTitle] = useState("")
  const [systemId, setSystemId] = useState<string>(prefilledSystemId ?? "")
  const [severityLevel, setSeverityLevel] = useState<LoggingSeverityLevel>("standard")
  const [eventCategories, setEventCategories] = useState<LoggingEventCategory[]>([
    "input_data_received",
    "output_decision_made",
    "human_override_applied",
    "error_or_anomaly",
    "system_start_stop",
  ])
  const [biometricSpec, setBiometricSpec] = useState<LoggingBiometricSpecifics>({
    periodOfUseTracked: false,
    referenceDatabaseRecorded: false,
    inputDataRecorded: false,
    operatorsIdentified: false,
  })
  const [storageBackend, setStorageBackend] = useState<LoggingStorageBackend>("siem_elastic")
  const [storageLocation, setStorageLocation] = useState("")
  const [minRetentionMonths, setMinRetentionMonths] = useState(6)
  const [actualRetentionMonths, setActualRetentionMonths] = useState(6)
  const [retentionPolicy, setRetentionPolicy] = useState("")
  const [integrityMechanism, setIntegrityMechanism] =
    useState<LoggingConfig["integrityMechanism"]>("hash_chain")
  const [integrityDesc, setIntegrityDesc] = useState("")
  const [accessRoleDescription, setAccessRoleDescription] = useState("")
  const [accessLogged, setAccessLogged] = useState(true)
  const [evidenceChecklistText, setEvidenceChecklistText] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Auto-update minRetention default when severity changes
    setMinRetentionMonths(DEFAULT_MIN_RETENTION_MONTHS_BY_SEVERITY[severityLevel])
    if (actualRetentionMonths < DEFAULT_MIN_RETENTION_MONTHS_BY_SEVERITY[severityLevel]) {
      setActualRetentionMonths(DEFAULT_MIN_RETENTION_MONTHS_BY_SEVERITY[severityLevel])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [severityLevel])

  useEffect(() => {
    if (prefilledSystemId) {
      const sys = aiSystems.find((s) => s.id === prefilledSystemId)
      if (sys && !title) {
        setTitle(`Logging Config — ${sys.name}`)
        if (sys.purpose === "biometric-identification") {
          setSeverityLevel("biometric_full")
        } else if (sys.makesAutomatedDecisions && sys.impactsRights) {
          setSeverityLevel("enhanced")
        } else if (sys.riskLevel === "high") {
          setSeverityLevel("standard")
        }
      }
    }
  }, [prefilledSystemId, aiSystems, title])

  function toggleCategory(c: LoggingEventCategory) {
    setEventCategories((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c],
    )
  }

  async function submit() {
    setSubmitting(true)
    setError(null)
    try {
      const body = {
        title,
        linkedAISystemId: systemId,
        severityLevel,
        eventCategoriesLogged: eventCategories,
        storageBackend,
        storageLocation,
        minRetentionMonths,
        actualRetentionMonths,
        retentionPolicy,
        integrityMechanism,
        integrityMechanismDescription: integrityDesc,
        accessRoleDescription,
        accessLogged,
        biometricSpecific:
          severityLevel === "biometric_full" ? biometricSpec : undefined,
        evidenceChecklist: evidenceChecklistText
          .split("\n")
          .map((s) => s.trim())
          .filter((s) => s.length > 0),
      }
      const res = await fetch("/api/logging-evidence", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? "Eroare la creare config")
      }
      await onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare necunoscută")
    } finally {
      setSubmitting(false)
    }
  }

  const canNext = () => {
    if (step === 0) return title.trim().length > 0 && systemId.length > 0
    if (step === 1) return eventCategories.length > 0
    if (step === 2)
      return (
        storageLocation.trim().length > 0 &&
        actualRetentionMonths > 0 &&
        minRetentionMonths > 0
      )
    if (step === 3) return accessRoleDescription.trim().length > 0
    return true
  }

  return (
    <div style={modalOverlay} onClick={onClose}>
      <div style={modalCard} onClick={(e) => e.stopPropagation()}>
        <div style={modalHeader}>
          <div>
            <h2
              style={{
                fontFamily: "var(--font-display-v3)",
                fontSize: 16,
                margin: 0,
                color: "var(--ink)",
              }}
            >
              Nou config Logging Evidence
            </h2>
            <div style={{ fontSize: 11, color: "var(--ink-dim)", marginTop: 2 }}>
              Pas {step + 1} / 4 · Art. 12 + Art. 26(6) AI Act
            </div>
          </div>
          <button onClick={onClose} style={iconBtn} aria-label="Închide">
            <X size={18} />
          </button>
        </div>

        {step === 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <p style={wizardHint}>
              <strong>A. Sistem AI + nivel severitate logging.</strong> Severitatea
              trebuie proporțională cu riscul Annex III + impactul deciziilor.
            </p>
            <div>
              <label style={labelStyle}>Titlu config</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="ex: Logging Config — Credit Scoring AI"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Sistem AI vizat</label>
              <select
                value={systemId}
                onChange={(e) => setSystemId(e.target.value)}
                style={inputStyle}
              >
                <option value="">— Selectează —</option>
                {aiSystems.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.riskLevel})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Nivel severitate</label>
              <select
                value={severityLevel}
                onChange={(e) =>
                  setSeverityLevel(e.target.value as LoggingSeverityLevel)
                }
                style={inputStyle}
              >
                {LOGGING_SEVERITY_LEVEL_OPTIONS.map((lv) => (
                  <option key={lv} value={lv}>
                    {LOGGING_SEVERITY_LEVEL_LABELS[lv]}
                  </option>
                ))}
              </select>
              <div
                style={{ fontSize: 11, color: "var(--ink-dim)", marginTop: 6 }}
              >
                {LOGGING_SEVERITY_LEVEL_DESCRIPTIONS[severityLevel]}
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <p style={wizardHint}>
              <strong>B. Categorii evenimente loguite.</strong> Bifează doar pe
              cele LOGUITE efectiv. Minim 3 pentru partial; 5 pentru complete.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {LOGGING_EVENT_CATEGORIES_ORDERED.map((cat) => {
                const checked = eventCategories.includes(cat)
                return (
                  <label
                    key={cat}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 8,
                      cursor: "pointer",
                      fontSize: 12,
                      padding: 6,
                      borderRadius: 6,
                      background: checked
                        ? "rgba(52,211,153,0.08)"
                        : "transparent",
                      border: "1px solid var(--border-soft)",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleCategory(cat)}
                      style={{ marginTop: 2 }}
                    />
                    <div>
                      <div style={{ color: "var(--ink)" }}>
                        {LOGGING_EVENT_CATEGORY_LABELS[cat]}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--ink-dim)" }}>
                        {LOGGING_EVENT_CATEGORY_HELP[cat]}
                      </div>
                    </div>
                  </label>
                )
              })}
            </div>

            {severityLevel === "biometric_full" && (
              <div
                style={{
                  marginTop: 10,
                  padding: 10,
                  border: "1px solid rgba(248,113,113,0.3)",
                  borderRadius: 8,
                  background: "rgba(248,113,113,0.06)",
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#f87171",
                    marginBottom: 8,
                  }}
                >
                  Câmpuri Art. 12(3) biometric ID — OBLIGATORII pentru Annex III pt. 1(a)
                </div>
                {(
                  [
                    ["periodOfUseTracked", "(a) Perioada de utilizare urmărită (start/end)"],
                    ["referenceDatabaseRecorded", "(b) Bază de date de referință înregistrată"],
                    ["inputDataRecorded", "(c) Input data înregistrat"],
                    ["operatorsIdentified", "(d) Operatori naturali identificați"],
                  ] as const
                ).map(([key, label]) => (
                  <label
                    key={key}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: 12,
                      padding: 4,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={biometricSpec[key]}
                      onChange={(e) =>
                        setBiometricSpec((p) => ({
                          ...p,
                          [key]: e.target.checked,
                        }))
                      }
                    />
                    {label}
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <p style={wizardHint}>
              <strong>C. Storage + retenție (Art. 26(6)).</strong> Minim 6 luni;
              mai mult pentru drepturi fundamentale / GDPR / lege specifică.
            </p>
            <div>
              <label style={labelStyle}>Backend storage</label>
              <select
                value={storageBackend}
                onChange={(e) =>
                  setStorageBackend(e.target.value as LoggingStorageBackend)
                }
                style={inputStyle}
              >
                {LOGGING_STORAGE_BACKEND_OPTIONS.map((b) => (
                  <option key={b} value={b}>
                    {LOGGING_STORAGE_BACKEND_LABELS[b]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Locație storage (URL / bucket / path)</label>
              <input
                value={storageLocation}
                onChange={(e) => setStorageLocation(e.target.value)}
                placeholder="ex: https://elastic.example.com/index=ai_logs"
                style={inputStyle}
              />
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Retenție minimă cerută (luni)</label>
                <input
                  type="number"
                  value={minRetentionMonths}
                  min={1}
                  onChange={(e) => setMinRetentionMonths(Number(e.target.value))}
                  style={inputStyle}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Retenția actuală (luni)</label>
                <input
                  type="number"
                  value={actualRetentionMonths}
                  min={0}
                  onChange={(e) =>
                    setActualRetentionMonths(Number(e.target.value))
                  }
                  style={inputStyle}
                />
              </div>
            </div>
            {actualRetentionMonths < minRetentionMonths && (
              <div
                style={{
                  fontSize: 11,
                  color: "#f87171",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <AlertTriangle size={12} /> Retenția actuală sub minim Art. 26(6) — finding HIGH va fi emis.
              </div>
            )}
            <div>
              <label style={labelStyle}>Politica retenție (narativ)</label>
              <textarea
                value={retentionPolicy}
                onChange={(e) => setRetentionPolicy(e.target.value)}
                placeholder="ex: ILM rollover + delete la 6 luni; cold tier 3-6; export lunar înainte de delete."
                rows={3}
                style={{ ...inputStyle, fontFamily: "inherit" }}
              />
            </div>
          </div>
        )}

        {step === 3 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <p style={wizardHint}>
              <strong>D. Integritate + control acces.</strong> Mecanism
              tamper-evidence + roluri cu acces + meta-logging (audit acces).
            </p>
            <div>
              <label style={labelStyle}>Mecanism integritate logs</label>
              <select
                value={integrityMechanism}
                onChange={(e) =>
                  setIntegrityMechanism(
                    e.target.value as LoggingConfig["integrityMechanism"],
                  )
                }
                style={inputStyle}
              >
                {LOGGING_INTEGRITY_MECHANISM_OPTIONS.map((m) => (
                  <option key={m} value={m}>
                    {LOGGING_INTEGRITY_MECHANISM_LABELS[m]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Descriere mecanism integritate</label>
              <textarea
                value={integrityDesc}
                onChange={(e) => setIntegrityDesc(e.target.value)}
                placeholder="ex: SHA-256 chain per event line; root hash semnat zilnic + arhivat în S3 Object Lock 7 ani."
                rows={2}
                style={{ ...inputStyle, fontFamily: "inherit" }}
              />
            </div>
            <div>
              <label style={labelStyle}>Roluri cu acces la logs</label>
              <textarea
                value={accessRoleDescription}
                onChange={(e) => setAccessRoleDescription(e.target.value)}
                placeholder="ex: DPO + Security Team + Admin Cloud (read-only, MFA obligatoriu)"
                rows={2}
                style={{ ...inputStyle, fontFamily: "inherit" }}
              />
            </div>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 12,
                color: "var(--ink-muted)",
              }}
            >
              <input
                type="checkbox"
                checked={accessLogged}
                onChange={(e) => setAccessLogged(e.target.checked)}
              />
              Accesul la logs este el însuși logat (meta-logging)
            </label>
            <div>
              <label style={labelStyle}>
                Checklist evidență (un item pe linie, opțional)
              </label>
              <textarea
                value={evidenceChecklistText}
                onChange={(e) => setEvidenceChecklistText(e.target.value)}
                placeholder={"Export SIEM lunar\nScreenshot retention policy\nRaport audit integritate"}
                rows={3}
                style={{ ...inputStyle, fontFamily: "inherit" }}
              />
            </div>
          </div>
        )}

        {error && (
          <div
            style={{
              fontSize: 12,
              color: "#f87171",
              padding: 8,
              background: "rgba(248,113,113,0.08)",
              borderRadius: 6,
            }}
          >
            {error}
          </div>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 8,
          }}
        >
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            style={btnGhost}
          >
            Înapoi
          </button>
          {step < 3 ? (
            <button
              onClick={() => setStep((s) => Math.min(3, s + 1))}
              disabled={!canNext()}
              style={btnPrimary}
            >
              Continuă →
            </button>
          ) : (
            <button
              onClick={() => void submit()}
              disabled={submitting || !canNext()}
              style={btnPrimary}
            >
              {submitting ? "Se creează..." : "Creează config"}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
//   Evidence Modal
// ────────────────────────────────────────────────────────────────────────────

function EvidenceModal({
  recordId,
  onClose,
  onDone,
}: {
  recordId: string
  onClose: () => void
  onDone: () => Promise<void>
}) {
  const [type, setType] = useState<LogEvidenceItem["type"]>("log_export")
  const [description, setDescription] = useState("")
  const [url, setUrl] = useState("")
  const [fileName, setFileName] = useState("")
  const [fileHash, setFileHash] = useState("")
  const [start, setStart] = useState("")
  const [end, setEnd] = useState("")
  const [eventCount, setEventCount] = useState<string>("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    if (description.trim().length < 3) {
      setError("Descrierea este obligatorie (min 3 caractere).")
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const body: Record<string, unknown> = {
        type,
        description,
        url: url || undefined,
        fileName: fileName || undefined,
        fileHash: fileHash || undefined,
        coversPeriodStartISO: start || undefined,
        coversPeriodEndISO: end || undefined,
      }
      const ec = Number(eventCount)
      if (!Number.isNaN(ec) && ec > 0) body.eventCount = ec
      const res = await fetch(`/api/logging-evidence/${recordId}/evidence`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? "Eroare la atașare dovadă")
      }
      await onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare necunoscută")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={modalOverlay} onClick={onClose}>
      <div style={modalCard} onClick={(e) => e.stopPropagation()}>
        <div style={modalHeader}>
          <div>
            <h2
              style={{
                fontFamily: "var(--font-display-v3)",
                fontSize: 16,
                margin: 0,
                color: "var(--ink)",
              }}
            >
              Atașează dovadă logs
            </h2>
            <div style={{ fontSize: 11, color: "var(--ink-dim)", marginTop: 2 }}>
              Export SIEM, screenshot, raport audit etc. · Sprint 022 va adăuga upload real în Supabase Storage.
            </div>
          </div>
          <button onClick={onClose} style={iconBtn} aria-label="Închide">
            <X size={18} />
          </button>
        </div>
        <div>
          <label style={labelStyle}>Tip dovadă</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as LogEvidenceItem["type"])}
            style={inputStyle}
          >
            {EVIDENCE_TYPE_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {EVIDENCE_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Descriere</label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="ex: Export logs SIEM mai 2026 — 124.567 events Art. 12(2)"
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>URL (opțional)</label>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/logs.zip"
            style={inputStyle}
          />
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Nume fișier (opțional)</label>
            <input
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="logs-2026-05.zip"
              style={inputStyle}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Hash SHA-256 (opțional)</label>
            <input
              value={fileHash}
              onChange={(e) => setFileHash(e.target.value)}
              placeholder="abc123def456..."
              style={inputStyle}
            />
          </div>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Perioadă acoperită — start (ISO)</label>
            <input
              type="date"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Perioadă acoperită — end (ISO)</label>
            <input
              type="date"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              style={inputStyle}
            />
          </div>
        </div>
        <div>
          <label style={labelStyle}>Număr evenimente (opțional)</label>
          <input
            type="number"
            value={eventCount}
            onChange={(e) => setEventCount(e.target.value)}
            placeholder="124567"
            style={inputStyle}
          />
        </div>
        {error && (
          <div
            style={{
              fontSize: 12,
              color: "#f87171",
              padding: 8,
              background: "rgba(248,113,113,0.08)",
              borderRadius: 6,
            }}
          >
            {error}
          </div>
        )}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            marginTop: 6,
          }}
        >
          <button onClick={onClose} style={btnGhost}>
            <History size={14} /> Anulează
          </button>
          <button onClick={() => void submit()} disabled={submitting} style={btnPrimary}>
            <Upload size={14} /> {submitting ? "Se atașează..." : "Atașează"}
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

const subTitle: CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: "var(--ink)",
  margin: 0,
}

const detailRow: CSSProperties = {
  fontSize: 13,
  color: "var(--ink)",
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap",
  gap: 6,
}
