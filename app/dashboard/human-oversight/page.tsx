"use client"

/**
 * Sprint 017 — /dashboard/human-oversight
 *
 * UI mature pentru Human Oversight Protocols (Art. 14 AI Act):
 *  - Stats bar (total / draft / in_review / approved / complete / incomplete)
 *  - Banner pentru sistemele AI high-risk fără protocol
 *  - Filter tabs pe status
 *  - 5-step wizard (A: model+system, B: capabilities, C: responsibles,
 *    D: escalation+contestation, E: stop+fallback)
 *  - Per-record expand: secțiuni A-E + responsables + escalare + contestație +
 *    stop + checklist + dovezi + finding-uri legate + audit trail
 *  - Acțiuni: Approve / Attach evidence (modal) / Export PDF/MD / Mark obsolete
 *
 * Style: inline + v3 design tokens (fără shadcn / Tailwind).
 */

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react"
import {
  AlertCircle,
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  Eye,
  FileText,
  Loader2,
  Plus,
  ShieldCheck,
  StopCircle,
  Trash2,
  Upload,
  X,
} from "lucide-react"

import {
  COMPETENCE_LEVEL_LABELS,
  COMPETENCE_LEVEL_OPTIONS,
  FALLBACK_MODE_LABELS,
  FALLBACK_MODE_OPTIONS,
  NOTIFICATION_METHOD_LABELS,
  NOTIFICATION_METHOD_OPTIONS,
  OVERSIGHT_CAPABILITIES_ORDERED,
  OVERSIGHT_CAPABILITY_HELP,
  OVERSIGHT_CAPABILITY_LABELS,
  OVERSIGHT_MODEL_DESCRIPTIONS,
  OVERSIGHT_MODEL_LABELS,
  OVERSIGHT_MODEL_OPTIONS,
  TEST_FREQUENCY_LABELS,
  TEST_FREQUENCY_OPTIONS,
} from "@/lib/compliance/oversight-schema"
import type {
  AISystemRecord,
  HumanOversightProtocol,
  OversightCapability,
  OversightCompleteness,
  OversightContestationProcedure,
  OversightEscalationStep,
  OversightEvidenceItem,
  OversightModel,
  OversightProtocolStatus,
  OversightResponsibleHuman,
  OversightStopProcedure,
} from "@/lib/compliance/types"
import type { OversightSummary } from "@/lib/server/oversight-store"

// ────────────────────────────────────────────────────────────────────────────
//   Labels / colors
// ────────────────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<OversightProtocolStatus, string> = {
  draft: "Schiță",
  in_review: "În revizie",
  approved: "Aprobat",
  active: "Activ",
  obsolete: "Învechit",
  rejected: "Respins",
}

const STATUS_COLORS: Record<OversightProtocolStatus, { bg: string; fg: string }> = {
  draft: { bg: "rgba(148,163,184,0.16)", fg: "#94a3b8" },
  in_review: { bg: "rgba(96,165,250,0.14)", fg: "#60a5fa" },
  approved: { bg: "rgba(52,211,153,0.18)", fg: "#10b981" },
  active: { bg: "rgba(52,211,153,0.24)", fg: "#10b981" },
  obsolete: { bg: "rgba(148,163,184,0.12)", fg: "#94a3b8" },
  rejected: { bg: "rgba(248,113,113,0.18)", fg: "#f87171" },
}

const COMPLETENESS_LABELS: Record<OversightCompleteness, string> = {
  incomplete: "Incomplet",
  partial: "Parțial",
  complete: "Complet",
}

const COMPLETENESS_COLORS: Record<OversightCompleteness, { bg: string; fg: string }> = {
  incomplete: { bg: "rgba(248,113,113,0.18)", fg: "#f87171" },
  partial: { bg: "rgba(251,191,36,0.16)", fg: "#fbbf24" },
  complete: { bg: "rgba(52,211,153,0.18)", fg: "#10b981" },
}

const EVIDENCE_TYPE_OPTIONS: OversightEvidenceItem["type"][] = [
  "log",
  "screenshot",
  "video",
  "audit_report",
  "training_record",
  "test_report",
  "other",
]

const EVIDENCE_TYPE_LABELS: Record<OversightEvidenceItem["type"], string> = {
  log: "Log sistem",
  screenshot: "Screenshot",
  video: "Înregistrare video",
  audit_report: "Raport audit",
  training_record: "Înregistrare training",
  test_report: "Raport testare",
  other: "Altul",
}

type ListResponse = {
  records: HumanOversightProtocol[]
  summary: OversightSummary
}
type AISystemsResponse = { systems: AISystemRecord[] }

// ────────────────────────────────────────────────────────────────────────────
//   Page
// ────────────────────────────────────────────────────────────────────────────

export default function HumanOversightPage() {
  const [records, setRecords] = useState<HumanOversightProtocol[]>([])
  const [summary, setSummary] = useState<OversightSummary | null>(null)
  const [aiSystems, setAiSystems] = useState<AISystemRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showWizard, setShowWizard] = useState(false)
  const [prefilledSystemId, setPrefilledSystemId] = useState<string | undefined>()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<"all" | OversightProtocolStatus>("all")
  const [evidenceModalForId, setEvidenceModalForId] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const [ovRes, sysRes] = await Promise.all([
        fetch("/api/oversight"),
        fetch("/api/ai-systems"),
      ])
      if (ovRes.ok) {
        const data = (await ovRes.json()) as ListResponse
        setRecords(data.records ?? [])
        setSummary(data.summary)
      } else {
        setError("Nu am putut încărca registrul Oversight Protocols.")
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
    if (statusFilter === "all") return records
    return records.filter((r) => r.status === statusFilter)
  }, [records, statusFilter])

  // High-risk + biometric systems fără protocol
  const systemsWithoutProtocol = useMemo(() => {
    const protocolSystemIds = new Set(records.map((r) => r.linkedAISystemId))
    return aiSystems.filter((s) => {
      if (protocolSystemIds.has(s.id)) return false
      if (s.riskLevel === "high") return true
      if (s.purpose === "biometric-identification") return true
      if (s.makesAutomatedDecisions && s.impactsRights) return true
      return false
    })
  }, [aiSystems, records])

  async function handleDelete(id: string) {
    if (!confirm("Ștergi acest protocol? Acțiunea apare în audit trail.")) return
    const res = await fetch(`/api/oversight/${id}`, { method: "DELETE" })
    if (res.ok) {
      if (expandedId === id) setExpandedId(null)
      await load()
    }
  }

  async function handleApprove(id: string) {
    const res = await fetch(`/api/oversight/${id}/approve`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    })
    if (res.ok) await load()
  }

  async function handleMarkObsolete(id: string) {
    if (!confirm("Marchezi acest protocol ca obsolet? Sistemul AI nu va mai fi acoperit.")) return
    const res = await fetch(`/api/oversight/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "obsolete" }),
    })
    if (res.ok) await load()
  }

  function handleExport(id: string, format: "md" | "pdf") {
    const url =
      format === "pdf"
        ? `/api/oversight/${id}/export?format=pdf`
        : `/api/oversight/${id}/export`
    window.open(url, "_blank")
  }

  return (
    <div className="cr-page cr-page--full cr-stack">
      <div className="cr-hero">
        <div className="cr-hero__copy">
          <span className="cr-eyebrow">Conformitate</span>
          <h1 className="cr-title">Supraveghere umană · Art. 14</h1>
          <p className="cr-subtitle">
          Protocol per sistem AI high-risk · 5 capacități Art. 14(3) + 4-eyes
          biometric · Inclus în Audit Pack
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

      {systemsWithoutProtocol.length > 0 && (
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
              {systemsWithoutProtocol.length} sistem
              {systemsWithoutProtocol.length !== 1 ? "e" : ""} AI fără protocol Art. 14
            </div>
            <div style={{ fontSize: "12px", color: "var(--ink-muted)" }}>
              Art. 14 impune protocol înainte de prima utilizare pentru
              sisteme high-risk; Art. 14(4) cere 4-eyes pentru biometric ID.
            </div>
          </div>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {systemsWithoutProtocol.slice(0, 3).map((s) => (
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
            {systemsWithoutProtocol.length > 3 && (
              <span
                style={{
                  fontSize: "11px",
                  color: "var(--ink-dim)",
                  alignSelf: "center",
                }}
              >
                +{systemsWithoutProtocol.length - 3} altele
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
        <FilterTabs value={statusFilter} onChange={setStatusFilter} records={records} />
        <button
          onClick={() => {
            setPrefilledSystemId(undefined)
            setShowWizard(true)
          }}
          className="cr-btn cr-btn--primary cr-btn--sm"
        >
          <Plus size={14} /> Nou protocol
        </button>
      </div>

      {showWizard && (
        <OversightWizard
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
          Se încarcă registrul Oversight Protocols...
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState hasAny={records.length > 0} onCreate={() => setShowWizard(true)} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {filtered.map((record) => (
            <ProtocolRow
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

function StatsBar({ summary }: { summary: OversightSummary | null }) {
  const items = [
    { label: "Total", value: summary?.total ?? 0, color: "var(--ink)" },
    { label: "Schiță", value: summary?.draft ?? 0, color: "#94a3b8" },
    { label: "În revizie", value: summary?.inReview ?? 0, color: "#60a5fa" },
    { label: "Aprobate", value: summary?.approved ?? 0, color: "#10b981" },
    { label: "Complete", value: summary?.complete ?? 0, color: "#10b981" },
    { label: "Incomplete", value: summary?.incomplete ?? 0, color: "#f87171" },
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
  value: "all" | OversightProtocolStatus
  onChange: (v: "all" | OversightProtocolStatus) => void
  records: HumanOversightProtocol[]
}) {
  const tabs: Array<{ id: "all" | OversightProtocolStatus; label: string }> = [
    { id: "all", label: "Toate" },
    { id: "draft", label: "Schiță" },
    { id: "in_review", label: "În revizie" },
    { id: "approved", label: "Aprobate" },
    { id: "active", label: "Active" },
    { id: "rejected", label: "Respinse" },
  ]
  return (
    <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
      {tabs.map((tab) => {
        const count =
          tab.id === "all" ? records.length : records.filter((r) => r.status === tab.id).length
        const active = value === tab.id
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`cr-tab ${active ? "is-active" : ""}`}
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
      <Eye
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
        {hasAny ? "Nicio înregistrare pentru filtru" : "Niciun protocol Oversight încă"}
      </h3>
      <p
        style={{
          fontSize: "13px",
          color: "var(--ink-muted)",
          margin: "8px 0 16px",
        }}
      >
        {hasAny
          ? "Schimbă filtrul de status sau adaugă un protocol nou."
          : "Art. 14 cere protocol per sistem AI high-risk înainte de prima utilizare."}
      </p>
      <button onClick={onCreate} className="cr-btn cr-btn--primary cr-btn--sm">
        <Plus size={14} /> Nou protocol
      </button>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
//   Protocol row (collapsed + expanded)
// ────────────────────────────────────────────────────────────────────────────

function ProtocolRow({
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
  record: HumanOversightProtocol
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
  const canApprove =
    record.status === "draft" || record.status === "in_review"
  const canMarkObsolete =
    record.status === "approved" || record.status === "active"

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
                background: "rgba(96,165,250,0.10)",
                color: "#60a5fa",
              }}
            >
              {OVERSIGHT_MODEL_LABELS[record.oversightModel].split(" — ")[0]}
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
            {record.nextReviewISO && (
              <span>· Următoarea revizie: {record.nextReviewISO.slice(0, 10)}</span>
            )}
            {record.approvedByEmail && (
              <span>· Aprobat de {record.approvedByEmail}</span>
            )}
          </div>
        </div>
        <button className="cr-btn cr-btn--icon cr-btn--sm" aria-label={expanded ? "Colapsează" : "Extinde"}>
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
              <button onClick={onApprove} className="cr-btn cr-btn--primary cr-btn--sm">
                <CheckCircle2 size={14} /> Aprobă
              </button>
            )}
            <button onClick={onAttachEvidence} className="cr-btn cr-btn--secondary cr-btn--sm">
              <Upload size={14} /> Atașează dovadă
            </button>
            <button onClick={() => onExport("md")} className="cr-btn cr-btn--secondary cr-btn--sm">
              <FileText size={14} /> MD
            </button>
            <button onClick={() => onExport("pdf")} className="cr-btn cr-btn--secondary cr-btn--sm">
              <Download size={14} /> PDF
            </button>
            {canMarkObsolete && (
              <button onClick={onObsolete} className="cr-btn cr-btn--secondary cr-btn--sm">
                Marchează obsolet
              </button>
            )}
            <button onClick={onDelete} className="cr-btn cr-btn--danger cr-btn--sm">
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
  record: HumanOversightProtocol
  system?: AISystemRecord
}) {
  const cp = record.contestationProcedure
  const sp = record.stopProcedure
  return (
    <>
      <Section title="A. Model oversight + sistem AI">
        <div style={detailRow}>
          <strong>Model:</strong> {OVERSIGHT_MODEL_LABELS[record.oversightModel]}
        </div>
        <div style={{ ...detailRow, color: "var(--ink-muted)", fontSize: "12px" }}>
          {OVERSIGHT_MODEL_DESCRIPTIONS[record.oversightModel]}
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
              Biometric ID — Art. 14(4) 4-eyes obligatoriu
            </span>
          )}
        </div>
      </Section>

      <Section title="B. Capacități Art. 14(3) acoperite">
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {OVERSIGHT_CAPABILITIES_ORDERED.map((cap) => {
            const covered = record.capabilitiesCovered.includes(cap)
            return (
              <div
                key={cap}
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
                    background: covered ? "rgba(52,211,153,0.18)" : "transparent",
                    color: covered ? "#10b981" : "transparent",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    marginTop: "1px",
                  }}
                >
                  {covered ? "✓" : ""}
                </span>
                <div>
                  <div style={{ color: "var(--ink)" }}>{OVERSIGHT_CAPABILITY_LABELS[cap]}</div>
                  <div style={{ fontSize: "11px", color: "var(--ink-dim)" }}>
                    {OVERSIGHT_CAPABILITY_HELP[cap]}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </Section>

      <Section title="C. Persoane responsabile (Art. 26(2))">
        {record.responsibleHumans.length === 0 ? (
          <em style={{ color: "var(--ink-dim)" }}>Nicio persoană desemnată.</em>
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Email</th>
                <th style={thStyle}>Rol</th>
                <th style={thStyle}>Competență</th>
                <th style={thStyle}>Authority</th>
                <th style={thStyle}>Suport</th>
              </tr>
            </thead>
            <tbody>
              {record.responsibleHumans.map((h, idx) => (
                <tr key={idx}>
                  <td style={tdStyle}>{h.email}</td>
                  <td style={tdStyle}>{h.role}</td>
                  <td style={tdStyle}>{COMPETENCE_LEVEL_LABELS[h.competenceLevel]}</td>
                  <td style={tdStyle}>{h.hasAuthorityToOverride ? "DA" : "NU"}</td>
                  <td style={tdStyle}>{h.hasSupportTeam ? "DA" : "NU"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      <Section title="D. Escaladare">
        {record.escalationSteps.length === 0 ? (
          <em style={{ color: "var(--ink-dim)" }}>Niciun pas definit.</em>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {record.escalationSteps.map((step, idx) => (
              <div key={idx} style={detailBlock}>
                <div>
                  <strong>Condiție:</strong> {step.triggerCondition}
                </div>
                <div style={{ fontSize: "12px", color: "var(--ink-muted)" }}>
                  → {step.escalateToEmail} ({step.escalateToRole}) · SLA {step.slaHours}h ·{" "}
                  {NOTIFICATION_METHOD_LABELS[step.notificationMethod]}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="D2. Contestație (Art. 86 + GDPR Art. 22)">
        {cp && cp.channelDescription ? (
          <>
            <div style={detailRow}>
              <strong>Canal:</strong> {cp.channelDescription}
            </div>
            <div style={detailRow}>
              <strong>SLA acknowledgement:</strong> {cp.acknowledgementSlaHours}h ·{" "}
              <strong>Rezoluție:</strong> {cp.resolutionSlaDays} zile
            </div>
            <div style={detailRow}>
              <strong>Reviewer:</strong> {cp.reviewerRole}
            </div>
            <div style={detailRow}>
              <strong>Păstrare dovezi:</strong> {cp.evidencePreservation}
            </div>
          </>
        ) : (
          <em style={{ color: "var(--ink-dim)" }}>Procedură nedocumentată.</em>
        )}
      </Section>

      <Section title="E. Stop + fallback (Art. 14(3)(e) + 14(4)(d))">
        {sp ? (
          <>
            <div style={detailRow}>
              <StopCircle size={14} style={{ marginRight: 6 }} />
              Buton stop: {sp.stopButtonAvailable ? "DA" : "NU"} ·{" "}
              {sp.stopButtonLocation || "_locație nedeclarată_"}
            </div>
            <div style={detailRow}>
              <strong>Fallback:</strong> {FALLBACK_MODE_LABELS[sp.fallbackMode]}
            </div>
            <div style={detailRow}>{sp.fallbackDescription || "_descriere nedeclarată_"}</div>
            <div style={detailRow}>
              <strong>Ultima testare:</strong> {sp.testedAtISO ?? "_neefectuat_"} ·{" "}
              <strong>Frecvență:</strong> {TEST_FREQUENCY_LABELS[sp.testFrequency]}
            </div>
          </>
        ) : (
          <em style={{ color: "var(--ink-dim)" }}>Procedură nedocumentată.</em>
        )}
      </Section>

      <Section title="Checklist evidență">
        {record.evidenceChecklist.length === 0 ? (
          <em style={{ color: "var(--ink-dim)" }}>Niciun item definit.</em>
        ) : (
          <ul style={{ margin: 0, paddingLeft: "18px" }}>
            {record.evidenceChecklist.map((it, idx) => (
              <li key={idx} style={{ fontSize: "13px", color: "var(--ink-muted)" }}>
                {it}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title={`Dovezi atașate (${record.evidenceItems.length})`}>
        {record.evidenceItems.length === 0 ? (
          <em style={{ color: "var(--ink-dim)" }}>Nicio dovadă încărcată.</em>
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Tip</th>
                <th style={thStyle}>Descriere</th>
                <th style={thStyle}>De</th>
                <th style={thStyle}>Când</th>
              </tr>
            </thead>
            <tbody>
              {record.evidenceItems.map((e) => (
                <tr key={e.id}>
                  <td style={tdStyle}>{EVIDENCE_TYPE_LABELS[e.type]}</td>
                  <td style={tdStyle}>
                    {e.description}{" "}
                    {e.url && (
                      <a
                        href={e.url}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: "#60a5fa" }}
                      >
                        <ArrowUpRight size={11} style={{ display: "inline" }} /> link
                      </a>
                    )}
                  </td>
                  <td style={tdStyle}>{e.uploadedByEmail}</td>
                  <td style={tdStyle}>{e.uploadedAtISO.slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      {record.linkedFindingIds.length > 0 && (
        <Section title={`Finding-uri legate (${record.linkedFindingIds.length})`}>
          <div style={{ fontSize: "12px", color: "var(--ink-muted)" }}>
            Acest protocol a generat {record.linkedFindingIds.length} finding-uri.{" "}
            <a href="/dashboard/resolve" style={{ color: "#60a5fa" }}>
              Vezi în „De rezolvat" →
            </a>
          </div>
        </Section>
      )}

      {record.rejectionReason && (
        <Section title="Motiv respingere">
          <div style={{ color: "#f87171", fontSize: "13px" }}>{record.rejectionReason}</div>
        </Section>
      )}
    </>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4
        style={{
          fontSize: "12px",
          fontWeight: 600,
          color: "var(--ink-muted)",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          margin: "0 0 8px",
        }}
      >
        {title}
      </h4>
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>{children}</div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
//   5-step wizard
// ────────────────────────────────────────────────────────────────────────────

const STEPS = ["A. Model + sistem", "B. Capacități", "C. Responsabili", "D. Escaladare", "E. Stop"]

function OversightWizard({
  aiSystems,
  prefilledSystemId,
  onClose,
  onDone,
}: {
  aiSystems: AISystemRecord[]
  prefilledSystemId?: string
  onClose: () => void
  onDone: () => void | Promise<void>
}) {
  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const [title, setTitle] = useState("")
  const [linkedAISystemId, setLinkedAISystemId] = useState(prefilledSystemId ?? "")
  const [oversightModel, setOversightModel] = useState<OversightModel>("human_in_the_loop")
  const [capabilities, setCapabilities] = useState<OversightCapability[]>([])
  const [responsibles, setResponsibles] = useState<OversightResponsibleHuman[]>([])
  const [escalation, setEscalation] = useState<OversightEscalationStep[]>([])
  const [contestation, setContestation] = useState<OversightContestationProcedure>({
    channelDescription: "",
    acknowledgementSlaHours: 24,
    resolutionSlaDays: 30,
    reviewerRole: "DPO",
    evidencePreservation: "Toate log-urile sunt păstrate 3 ani.",
  })
  const [stop, setStop] = useState<OversightStopProcedure>({
    stopButtonAvailable: false,
    stopButtonLocation: "",
    fallbackMode: "manual_processing",
    fallbackDescription: "",
    testFrequency: "quarterly",
  })
  const [checklist, setChecklist] = useState<string>("")
  const [notes, setNotes] = useState("")

  // Auto-detectăm biometric pentru warning UI
  const selectedSystem = aiSystems.find((s) => s.id === linkedAISystemId)
  const isBiometric = selectedSystem?.purpose === "biometric-identification"

  function toggleCap(cap: OversightCapability) {
    setCapabilities((prev) =>
      prev.includes(cap) ? prev.filter((c) => c !== cap) : [...prev, cap],
    )
  }

  function canProceed() {
    if (step === 0) {
      return title.trim().length > 0 && linkedAISystemId.length > 0
    }
    return true
  }

  async function submit() {
    setSubmitting(true)
    setServerError(null)
    const checklistArr = checklist
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
    try {
      const res = await fetch("/api/oversight", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          linkedAISystemId,
          oversightModel,
          capabilitiesCovered: capabilities,
          responsibleHumans: responsibles,
          escalationSteps: escalation,
          contestationProcedure: contestation,
          stopProcedure: stop,
          evidenceChecklist: checklistArr,
          notes: notes.trim() || undefined,
        }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        setServerError(data.error ?? `Eroare server (${res.status})`)
        return
      }
      await onDone()
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Eroare necunoscută")
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
                fontSize: "16px",
                fontWeight: 600,
                color: "var(--ink)",
                margin: 0,
              }}
            >
              Nou protocol Oversight — Art. 14
            </h2>
            <div style={{ fontSize: "12px", color: "var(--ink-muted)", marginTop: "4px" }}>
              Pas {step + 1}/5 · {STEPS[step]}
            </div>
          </div>
          <button onClick={onClose} className="cr-btn cr-btn--icon cr-btn--sm" aria-label="Închide">
            <X size={16} />
          </button>
        </div>

        <div style={{ display: "flex", gap: "4px" }}>
          {STEPS.map((_, idx) => (
            <div
              key={idx}
              style={{
                flex: 1,
                height: 4,
                borderRadius: 2,
                background: idx <= step ? "var(--cobalt-600)" : "var(--border-soft)",
              }}
            />
          ))}
        </div>

        {/* Step A */}
        {step === 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div>
              <label style={labelStyle}>Titlul protocolului</label>
              <input
                className="cr-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Oversight Protocol — HR Screening AI"
              />
            </div>
            <div>
              <label style={labelStyle}>Sistem AI legat</label>
              <select
                className="cr-input"
                value={linkedAISystemId}
                onChange={(e) => setLinkedAISystemId(e.target.value)}
              >
                <option value="">— Selectează —</option>
                {aiSystems.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.riskLevel === "high" ? "(high-risk)" : ""}
                  </option>
                ))}
              </select>
              <p style={wizardHint}>
                Doar sistemele clasificate ca high-risk sunt obligate la protocol; pentru
                limited risk este recomandat ca bună practică.
              </p>
            </div>
            <div>
              <label style={labelStyle}>Model oversight</label>
              <select
                className="cr-input"
                value={oversightModel}
                onChange={(e) => setOversightModel(e.target.value as OversightModel)}
              >
                {OVERSIGHT_MODEL_OPTIONS.map((m) => (
                  <option key={m} value={m}>
                    {OVERSIGHT_MODEL_LABELS[m]}
                  </option>
                ))}
              </select>
              <p style={wizardHint}>{OVERSIGHT_MODEL_DESCRIPTIONS[oversightModel]}</p>
              {isBiometric && oversightModel !== "two_person_rule" && (
                <div
                  style={{
                    marginTop: "8px",
                    padding: "8px 10px",
                    background: "rgba(248,113,113,0.12)",
                    color: "#f87171",
                    fontSize: "12px",
                    borderRadius: 6,
                    border: "1px solid rgba(248,113,113,0.25)",
                  }}
                >
                  Art. 14(4) impune two_person_rule pentru identificare biometrică.
                  Selectează „Two-person rule" pentru a evita finding critic la creare.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step B */}
        {step === 1 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <p style={wizardHint}>
              Bifează cele 5 capacități Art. 14(3) doar dacă sunt efectiv implementate +
              documentate (training, manual operator, UI buton stop).
            </p>
            {OVERSIGHT_CAPABILITIES_ORDERED.map((cap) => (
              <label
                key={cap}
                style={{
                  display: "flex",
                  gap: "10px",
                  padding: "10px",
                  border: "1px solid var(--border-soft)",
                  borderRadius: 8,
                  cursor: "pointer",
                  background: capabilities.includes(cap)
                    ? "rgba(52,211,153,0.06)"
                    : "transparent",
                }}
              >
                <input
                  type="checkbox"
                  checked={capabilities.includes(cap)}
                  onChange={() => toggleCap(cap)}
                  style={{ marginTop: "2px" }}
                />
                <div>
                  <div style={{ fontSize: "13px", color: "var(--ink)" }}>
                    {OVERSIGHT_CAPABILITY_LABELS[cap]}
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--ink-dim)", marginTop: "2px" }}>
                    {OVERSIGHT_CAPABILITY_HELP[cap]}
                  </div>
                </div>
              </label>
            ))}
          </div>
        )}

        {/* Step C */}
        {step === 2 && (
          <ResponsiblesEditor
            value={responsibles}
            onChange={setResponsibles}
            twoPersonRequired={oversightModel === "two_person_rule"}
          />
        )}

        {/* Step D */}
        {step === 3 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <EscalationEditor value={escalation} onChange={setEscalation} />
            <ContestationEditor value={contestation} onChange={setContestation} />
          </div>
        )}

        {/* Step E */}
        {step === 4 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <StopEditor value={stop} onChange={setStop} />
            <div>
              <label style={labelStyle}>Checklist evidență (un item / linie)</label>
              <textarea
            className="cr-input cr-textarea"
                style={{ ...inputStyle, minHeight: 80, resize: "vertical" }}
                value={checklist}
                onChange={(e) => setChecklist(e.target.value)}
                placeholder={"Training operatori\nLog override-uri\nRaport test fallback"}
              />
            </div>
            <div>
              <label style={labelStyle}>Note (opțional)</label>
              <textarea
            className="cr-input cr-textarea"
                style={{ ...inputStyle, minHeight: 60, resize: "vertical" }}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
        )}

        {serverError && (
          <div
            style={{
              padding: "8px 10px",
              background: "rgba(248,113,113,0.12)",
              color: "#f87171",
              fontSize: "12px",
              borderRadius: 6,
            }}
          >
            {serverError}
          </div>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            borderTop: "1px solid var(--border-soft)",
            paddingTop: "12px",
          }}
        >
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0 || submitting}
            className="cr-btn cr-btn--secondary cr-btn--sm"
          >
            Înapoi
          </button>
          {step < STEPS.length - 1 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              disabled={!canProceed()}
              className="cr-btn cr-btn--primary cr-btn--sm"
            >
              Continuă →
            </button>
          ) : (
            <button onClick={submit} disabled={submitting} className="cr-btn cr-btn--primary cr-btn--sm">
              {submitting ? <Loader2 size={14} className="spin" /> : <ShieldCheck size={14} />}
              Salvează protocol
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
//   Sub-editors
// ────────────────────────────────────────────────────────────────────────────

function ResponsiblesEditor({
  value,
  onChange,
  twoPersonRequired,
}: {
  value: OversightResponsibleHuman[]
  onChange: (next: OversightResponsibleHuman[]) => void
  twoPersonRequired: boolean
}) {
  function add() {
    onChange([
      ...value,
      {
        email: "",
        name: "",
        role: "",
        competenceLevel: "trained",
        hasAuthorityToOverride: false,
        hasSupportTeam: false,
      },
    ])
  }
  function update(idx: number, patch: Partial<OversightResponsibleHuman>) {
    const next = [...value]
    next[idx] = { ...next[idx], ...patch }
    onChange(next)
  }
  function remove(idx: number) {
    onChange(value.filter((_, i) => i !== idx))
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      <p style={wizardHint}>
        Art. 26(2): persoane cu competență, autoritate și suport. Minim o persoană cu
        autoritate de override este necesară pentru protocol „complete".
        {twoPersonRequired && (
          <strong style={{ color: "#f87171" }}> Two-person rule cere minim 2 persoane.</strong>
        )}
      </p>
      {value.map((h, idx) => (
        <div
          key={idx}
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr auto",
            gap: "8px",
            padding: "10px",
            border: "1px solid var(--border-soft)",
            borderRadius: 8,
            background: "var(--surface-2)",
          }}
        >
          <input
            className="cr-input"
            value={h.email}
            onChange={(e) => update(idx, { email: e.target.value })}
            placeholder="email@org.ro"
          />
          <input
            className="cr-input"
            value={h.role}
            onChange={(e) => update(idx, { role: e.target.value })}
            placeholder="Rol (DPO, Manager HR...)"
          />
          <select
            className="cr-input"
            value={h.competenceLevel}
            onChange={(e) =>
              update(idx, {
                competenceLevel: e.target.value as OversightResponsibleHuman["competenceLevel"],
              })
            }
          >
            {COMPETENCE_LEVEL_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {COMPETENCE_LEVEL_LABELS[c]}
              </option>
            ))}
          </select>
          <button onClick={() => remove(idx)} className="cr-btn cr-btn--icon cr-btn--sm" aria-label="Șterge">
            <Trash2 size={14} />
          </button>
          <label
            style={{
              fontSize: "12px",
              color: "var(--ink-muted)",
              display: "flex",
              gap: "6px",
              alignItems: "center",
              gridColumn: "1 / 3",
            }}
          >
            <input
              type="checkbox"
              checked={h.hasAuthorityToOverride}
              onChange={(e) => update(idx, { hasAuthorityToOverride: e.target.checked })}
            />
            Are autoritate de override (Art. 26(2))
          </label>
          <label
            style={{
              fontSize: "12px",
              color: "var(--ink-muted)",
              display: "flex",
              gap: "6px",
              alignItems: "center",
              gridColumn: "3 / 5",
            }}
          >
            <input
              type="checkbox"
              checked={h.hasSupportTeam}
              onChange={(e) => update(idx, { hasSupportTeam: e.target.checked })}
            />
            Are echipă de suport
          </label>
        </div>
      ))}
      <button onClick={add} className="cr-btn cr-btn--secondary cr-btn--sm">
        <Plus size={12} /> Adaugă persoană
      </button>
    </div>
  )
}

function EscalationEditor({
  value,
  onChange,
}: {
  value: OversightEscalationStep[]
  onChange: (next: OversightEscalationStep[]) => void
}) {
  function add() {
    onChange([
      ...value,
      {
        triggerCondition: "",
        escalateToEmail: "",
        escalateToRole: "",
        slaHours: 4,
        notificationMethod: "email",
      },
    ])
  }
  function update(idx: number, patch: Partial<OversightEscalationStep>) {
    const next = [...value]
    next[idx] = { ...next[idx], ...patch }
    onChange(next)
  }
  function remove(idx: number) {
    onChange(value.filter((_, i) => i !== idx))
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      <h4 style={subTitle}>Pași escaladare</h4>
      <p style={wizardHint}>
        Minim 1 pas pentru protocol „complete". Condiție declanșare → cine primește notificarea →
        SLA → canal.
      </p>
      {value.map((step, idx) => (
        <div
          key={idx}
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 80px 110px auto",
            gap: "8px",
            padding: "10px",
            border: "1px solid var(--border-soft)",
            borderRadius: 8,
            background: "var(--surface-2)",
          }}
        >
          <input
            className="cr-input"
            value={step.triggerCondition}
            onChange={(e) => update(idx, { triggerCondition: e.target.value })}
            placeholder='Condiție (ex: "risc >0.8")'
          />
          <input
            className="cr-input"
            value={step.escalateToEmail}
            onChange={(e) => update(idx, { escalateToEmail: e.target.value })}
            placeholder="Email destinatar"
          />
          <input
            className="cr-input"
            type="number"
            value={step.slaHours}
            onChange={(e) => update(idx, { slaHours: Number(e.target.value) })}
            placeholder="SLA h"
          />
          <select
            className="cr-input"
            value={step.notificationMethod}
            onChange={(e) =>
              update(idx, {
                notificationMethod:
                  e.target.value as OversightEscalationStep["notificationMethod"],
              })
            }
          >
            {NOTIFICATION_METHOD_OPTIONS.map((m) => (
              <option key={m} value={m}>
                {NOTIFICATION_METHOD_LABELS[m]}
              </option>
            ))}
          </select>
          <button onClick={() => remove(idx)} className="cr-btn cr-btn--icon cr-btn--sm" aria-label="Șterge">
            <Trash2 size={14} />
          </button>
          <input
            className="cr-input"
            style={{ ...inputStyle, gridColumn: "1 / 6" }}
            value={step.escalateToRole}
            onChange={(e) => update(idx, { escalateToRole: e.target.value })}
            placeholder="Rol destinatar (ex: Manager Compliance)"
          />
        </div>
      ))}
      <button onClick={add} className="cr-btn cr-btn--secondary cr-btn--sm">
        <Plus size={12} /> Adaugă pas
      </button>
    </div>
  )
}

function ContestationEditor({
  value,
  onChange,
}: {
  value: OversightContestationProcedure
  onChange: (next: OversightContestationProcedure) => void
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      <h4 style={subTitle}>Contestație decizie automată</h4>
      <div>
        <label style={labelStyle}>Canal contestație</label>
        <input
          className="cr-input"
          value={value.channelDescription}
          onChange={(e) => onChange({ ...value, channelDescription: e.target.value })}
          placeholder="Ex: Email dpo@org.ro cu formular contestație"
        />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
        <div>
          <label style={labelStyle}>SLA acknowledgement (ore)</label>
          <input
            className="cr-input"
            type="number"
            value={value.acknowledgementSlaHours}
            onChange={(e) =>
              onChange({ ...value, acknowledgementSlaHours: Number(e.target.value) })
            }
          />
        </div>
        <div>
          <label style={labelStyle}>SLA rezoluție (zile)</label>
          <input
            className="cr-input"
            type="number"
            value={value.resolutionSlaDays}
            onChange={(e) =>
              onChange({ ...value, resolutionSlaDays: Number(e.target.value) })
            }
          />
        </div>
      </div>
      <div>
        <label style={labelStyle}>Rol reviewer</label>
        <input
          className="cr-input"
          value={value.reviewerRole}
          onChange={(e) => onChange({ ...value, reviewerRole: e.target.value })}
          placeholder="DPO / Manager Compliance"
        />
      </div>
      <div>
        <label style={labelStyle}>Păstrare dovezi</label>
        <input
          className="cr-input"
          value={value.evidencePreservation}
          onChange={(e) => onChange({ ...value, evidencePreservation: e.target.value })}
          placeholder="Ex: Toate log-urile sunt păstrate 3 ani conform politicii interne"
        />
      </div>
    </div>
  )
}

function StopEditor({
  value,
  onChange,
}: {
  value: OversightStopProcedure
  onChange: (next: OversightStopProcedure) => void
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      <h4 style={subTitle}>Procedură stop + fallback</h4>
      <label
        style={{
          display: "flex",
          gap: "6px",
          fontSize: "13px",
          color: "var(--ink)",
        }}
      >
        <input
          type="checkbox"
          checked={value.stopButtonAvailable}
          onChange={(e) => onChange({ ...value, stopButtonAvailable: e.target.checked })}
        />
        Buton stop disponibil
      </label>
      <div>
        <label style={labelStyle}>Locație buton</label>
        <input
          className="cr-input"
          value={value.stopButtonLocation}
          onChange={(e) => onChange({ ...value, stopButtonLocation: e.target.value })}
          placeholder="Ex: Admin dashboard / panou operator"
        />
      </div>
      <div>
        <label style={labelStyle}>Mod fallback</label>
        <select
          className="cr-input"
          value={value.fallbackMode}
          onChange={(e) =>
            onChange({
              ...value,
              fallbackMode: e.target.value as OversightStopProcedure["fallbackMode"],
            })
          }
        >
          {FALLBACK_MODE_OPTIONS.map((m) => (
            <option key={m} value={m}>
              {FALLBACK_MODE_LABELS[m]}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label style={labelStyle}>Descriere fallback</label>
        <textarea
            className="cr-input cr-textarea"
          style={{ ...inputStyle, minHeight: 60, resize: "vertical" }}
          value={value.fallbackDescription}
          onChange={(e) => onChange({ ...value, fallbackDescription: e.target.value })}
          placeholder="Ce se întâmplă când sistemul AI este oprit?"
        />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
        <div>
          <label style={labelStyle}>Ultima testare (opțional)</label>
          <input
            className="cr-input"
            type="date"
            value={value.testedAtISO ? value.testedAtISO.slice(0, 10) : ""}
            onChange={(e) =>
              onChange({
                ...value,
                testedAtISO: e.target.value ? `${e.target.value}T00:00:00.000Z` : undefined,
              })
            }
          />
        </div>
        <div>
          <label style={labelStyle}>Frecvență testare</label>
          <select
            className="cr-input"
            value={value.testFrequency}
            onChange={(e) =>
              onChange({
                ...value,
                testFrequency: e.target.value as OversightStopProcedure["testFrequency"],
              })
            }
          >
            {TEST_FREQUENCY_OPTIONS.map((f) => (
              <option key={f} value={f}>
                {TEST_FREQUENCY_LABELS[f]}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
//   Evidence modal
// ────────────────────────────────────────────────────────────────────────────

function EvidenceModal({
  recordId,
  onClose,
  onDone,
}: {
  recordId: string
  onClose: () => void
  onDone: () => void | Promise<void>
}) {
  const [type, setType] = useState<OversightEvidenceItem["type"]>("training_record")
  const [description, setDescription] = useState("")
  const [url, setUrl] = useState("")
  const [fileName, setFileName] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  async function submit() {
    if (description.trim().length < 3) {
      setServerError("Descriere obligatorie (min 3 caractere).")
      return
    }
    setSubmitting(true)
    setServerError(null)
    try {
      const res = await fetch(`/api/oversight/${recordId}/evidence`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          type,
          description: description.trim(),
          url: url.trim() || undefined,
          fileName: fileName.trim() || undefined,
        }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        setServerError(data.error ?? `Eroare server (${res.status})`)
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
          <h2 style={{ fontSize: "15px", fontWeight: 600, color: "var(--ink)", margin: 0 }}>
            Atașează dovadă
          </h2>
          <button onClick={onClose} className="cr-btn cr-btn--icon cr-btn--sm" aria-label="Închide">
            <X size={16} />
          </button>
        </div>
        <div>
          <label style={labelStyle}>Tip dovadă</label>
          <select
            className="cr-input"
            value={type}
            onChange={(e) => setType(e.target.value as OversightEvidenceItem["type"])}
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
            className="cr-input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ce demonstrează această dovadă?"
          />
        </div>
        <div>
          <label style={labelStyle}>URL (opțional)</label>
          <input
            className="cr-input"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://..."
          />
        </div>
        <div>
          <label style={labelStyle}>Nume fișier (opțional)</label>
          <input
            className="cr-input"
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            placeholder="ex: training-2026-q2.pdf"
          />
        </div>
        {serverError && (
          <div
            style={{
              padding: "8px 10px",
              background: "rgba(248,113,113,0.12)",
              color: "#f87171",
              fontSize: "12px",
              borderRadius: 6,
            }}
          >
            {serverError}
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
          <button onClick={onClose} className="cr-btn cr-btn--secondary cr-btn--sm">
            Anulează
          </button>
          <button onClick={submit} disabled={submitting} className="cr-btn cr-btn--primary cr-btn--sm">
            {submitting ? <Loader2 size={14} className="spin" /> : <Upload size={14} />}
            Atașează
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
  padding: "2px 8px",
  borderRadius: 999,
  fontSize: "10px",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  fontWeight: 600,
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

const detailBlock: CSSProperties = {
  padding: "8px 10px",
  background: "var(--surface-1)",
  border: "1px solid var(--border-soft)",
  borderRadius: 6,
  fontSize: 13,
  color: "var(--ink)",
}
