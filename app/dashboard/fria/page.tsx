"use client"

/**
 * Sprint 016 — /dashboard/fria
 *
 * UI mature FRIA: stats + filtre + wizard 6 pași + listă record-uri cu
 * expand inline (secțiuni A-F, risk matrix per drept, oversight, plângere,
 * notificare autoritate Art. 27(3)) + acțiuni approve/reject/notify/export.
 *
 * Banner din Inventar AI (high-risk systems fără FRIA) este afișat aici
 * prin GET /api/ai-systems → filter high-risk → cross-reference cu FRIA list.
 *
 * Style: inline + v3 design tokens, fără shadcn / Tailwind utilities.
 */

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  FileText,
  Loader2,
  Plus,
  Shield,
  ShieldAlert,
  Trash2,
  X,
} from "lucide-react"

import {
  DEPLOYER_TYPE_LABELS,
  DEPLOYER_TYPE_OPTIONS,
  FREQUENCY_LABELS,
  FREQUENCY_OPTIONS,
  FUNDAMENTAL_RIGHTS_ORDERED,
  FUNDAMENTAL_RIGHT_LABELS,
} from "@/lib/compliance/fria-schema"
import type {
  AISystemRecord,
  DpiaRecord,
  FriaAffectedGroup,
  FriaDeployerType,
  FriaFrequencyOfUse,
  FriaHumanOversightMeasure,
  FriaHumanOversightMeasureType,
  FriaLikelihood,
  FriaRecord,
  FriaRecordStatus,
  FriaRiskAssessment,
  FriaRiskLevel,
  FriaSeverity,
  FundamentalRight,
} from "@/lib/compliance/types"
import type { FriaSummary } from "@/lib/server/fria-store"

// ────────────────────────────────────────────────────────────────────────────
//   Labels / colors
// ────────────────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<FriaRecordStatus, string> = {
  draft: "Schiță",
  screening_done: "Screening finalizat",
  in_review: "În revizie",
  needs_mitigation: "Necesită mitigare",
  approved: "Aprobată",
  rejected: "Respinsă",
  obsolete: "Învechită",
}

const STATUS_COLORS: Record<FriaRecordStatus, { bg: string; fg: string }> = {
  draft: { bg: "rgba(148,163,184,0.16)", fg: "#94a3b8" },
  screening_done: { bg: "rgba(96,165,250,0.12)", fg: "#60a5fa" },
  in_review: { bg: "rgba(96,165,250,0.14)", fg: "#60a5fa" },
  needs_mitigation: { bg: "rgba(251,146,60,0.16)", fg: "#fb923c" },
  approved: { bg: "rgba(52,211,153,0.18)", fg: "#10b981" },
  rejected: { bg: "rgba(248,113,113,0.18)", fg: "#f87171" },
  obsolete: { bg: "rgba(148,163,184,0.12)", fg: "#94a3b8" },
}

const RISK_LABELS: Record<FriaRiskLevel, string> = {
  low: "Scăzut",
  medium: "Mediu",
  high: "Înalt",
  critical: "Critic",
}

const RISK_COLORS: Record<FriaRiskLevel, { bg: string; fg: string }> = {
  low: { bg: "rgba(96,165,250,0.12)", fg: "#60a5fa" },
  medium: { bg: "rgba(251,191,36,0.14)", fg: "#fbbf24" },
  high: { bg: "rgba(251,146,60,0.16)", fg: "#fb923c" },
  critical: { bg: "rgba(248,113,113,0.18)", fg: "#f87171" },
}

const LIKELIHOOD_OPTIONS: FriaLikelihood[] = [
  "rare",
  "unlikely",
  "possible",
  "likely",
  "almost_certain",
]

const LIKELIHOOD_LABELS: Record<FriaLikelihood, string> = {
  rare: "Rar (1)",
  unlikely: "Improbabil (2)",
  possible: "Posibil (3)",
  likely: "Probabil (4)",
  almost_certain: "Aproape sigur (5)",
}

const SEVERITY_OPTIONS: FriaSeverity[] = [
  "negligible",
  "minor",
  "moderate",
  "major",
  "catastrophic",
]

const SEVERITY_LABELS: Record<FriaSeverity, string> = {
  negligible: "Neglijabil (1)",
  minor: "Minor (2)",
  moderate: "Moderat (3)",
  major: "Major (4)",
  catastrophic: "Catastrofic (5)",
}

const OVERSIGHT_TYPE_OPTIONS: FriaHumanOversightMeasureType[] = [
  "human_in_loop",
  "human_on_loop",
  "human_in_command",
  "override",
  "audit_log",
  "explainability",
  "complaint_mechanism",
  "fallback",
]

const OVERSIGHT_TYPE_LABELS: Record<FriaHumanOversightMeasureType, string> = {
  human_in_loop: "Human-in-the-loop",
  human_on_loop: "Human-on-the-loop",
  human_in_command: "Human-in-command",
  override: "Override (suprareglare)",
  audit_log: "Audit log",
  explainability: "Explainability (explicații)",
  complaint_mechanism: "Mecanism plângere",
  fallback: "Fallback / oprire urgență",
}

const AUTHORITY_OPTIONS = [
  "ADR (Autoritatea pentru Digitalizarea României)",
  "ANSPDCP (date personale)",
  "ASF (Autoritatea de Supraveghere Financiară)",
  "BNR (Banca Națională a României)",
  "ANCOM (Autoritatea Națională pentru Administrare și Reglementare în Comunicații)",
]

type ListResponse = {
  records: FriaRecord[]
  summary: FriaSummary
}

type AISystemsResponse = { systems: AISystemRecord[] }

type DpiaListResponse = { records: DpiaRecord[] }

// ────────────────────────────────────────────────────────────────────────────
//   Risk matrix calculator (mirror of fria-evaluator computeRightRiskLevel)
// ────────────────────────────────────────────────────────────────────────────

const LIKELIHOOD_SCORE: Record<FriaLikelihood, number> = {
  rare: 1,
  unlikely: 2,
  possible: 3,
  likely: 4,
  almost_certain: 5,
}

const SEVERITY_SCORE: Record<FriaSeverity, number> = {
  negligible: 1,
  minor: 2,
  moderate: 3,
  major: 4,
  catastrophic: 5,
}

function computeRiskCell(
  likelihood: FriaLikelihood,
  severity: FriaSeverity,
): FriaRiskLevel {
  const score = LIKELIHOOD_SCORE[likelihood] * SEVERITY_SCORE[severity]
  if (score >= 16) return "critical"
  if (score >= 10) return "high"
  if (score >= 5) return "medium"
  return "low"
}

// ────────────────────────────────────────────────────────────────────────────
//   Page
// ────────────────────────────────────────────────────────────────────────────

export default function FriaPage() {
  const [records, setRecords] = useState<FriaRecord[]>([])
  const [summary, setSummary] = useState<FriaSummary | null>(null)
  const [aiSystems, setAiSystems] = useState<AISystemRecord[]>([])
  const [dpiaRecords, setDpiaRecords] = useState<DpiaRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showWizard, setShowWizard] = useState(false)
  const [wizardPrefilledSystemId, setWizardPrefilledSystemId] = useState<string | undefined>(undefined)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<"all" | FriaRecordStatus>("all")

  const load = useCallback(async () => {
    try {
      const [friaRes, systemsRes, dpiaRes] = await Promise.all([
        fetch("/api/fria"),
        fetch("/api/ai-systems"),
        fetch("/api/dpia"),
      ])
      if (friaRes.ok) {
        const data = (await friaRes.json()) as ListResponse
        setRecords(data.records ?? [])
        setSummary(data.summary)
      } else {
        setError("Nu am putut încărca registrul FRIA.")
      }
      if (systemsRes.ok) {
        const data = (await systemsRes.json()) as AISystemsResponse
        setAiSystems(data.systems ?? [])
      }
      if (dpiaRes.ok) {
        const data = (await dpiaRes.json()) as DpiaListResponse
        setDpiaRecords(data.records ?? [])
      }
      setError(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  // Read ?systemId=... from URL to pre-fill wizard
  useEffect(() => {
    if (typeof window === "undefined") return
    const params = new URLSearchParams(window.location.search)
    const sid = params.get("systemId")
    if (sid) {
      setWizardPrefilledSystemId(sid)
      setShowWizard(true)
    }
  }, [])

  const filtered = useMemo(() => {
    if (statusFilter === "all") return records
    return records.filter((r) => r.status === statusFilter)
  }, [records, statusFilter])

  // High-risk systems without FRIA
  const systemsWithoutFria = useMemo(() => {
    const friaSystemIds = new Set(records.map((r) => r.linkedAISystemId))
    return aiSystems.filter(
      (s) => s.riskLevel === "high" && !friaSystemIds.has(s.id),
    )
  }, [aiSystems, records])

  async function handleDelete(id: string) {
    if (!confirm("Ștergi acest FRIA? Acțiunea apare în audit trail.")) return
    const res = await fetch(`/api/fria/${id}`, { method: "DELETE" })
    if (res.ok) {
      if (expandedId === id) setExpandedId(null)
      await load()
    }
  }

  async function handleApprove(id: string) {
    const res = await fetch(`/api/fria/${id}/approve`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    })
    if (res.ok) await load()
  }

  async function handleReject(id: string) {
    const reason = window.prompt("Motivul respingerii (min 5 caractere):")
    if (!reason || reason.trim().length < 5) return
    const res = await fetch(`/api/fria/${id}/reject`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ reason }),
    })
    if (res.ok) await load()
  }

  async function handleNotifyAuthority(
    id: string,
    authorityName: string,
    reference: string,
  ) {
    const res = await fetch(`/api/fria/${id}/notify-authority`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ authorityName, reference }),
    })
    if (res.ok) await load()
  }

  function handleExport(id: string, format: "md" | "pdf") {
    const url =
      format === "pdf"
        ? `/api/fria/${id}/export?format=pdf`
        : `/api/fria/${id}/export`
    window.open(url, "_blank")
  }

  return (
    <div className="cr-page cr-page--full cr-stack">
      <div className="cr-hero">
        <div className="cr-hero__copy">
          <span className="cr-eyebrow">Conformitate</span>
          <h1 className="cr-title">FRIA · Art. 27</h1>
          <p className="cr-subtitle">
          Evaluare obligatorie pentru deployeri de sisteme AI high-risk · 24
          drepturi fundamentale · Inclus în Audit Pack
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

      {systemsWithoutFria.length > 0 && (
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
          <AlertTriangle
            size={18}
            style={{ color: "#fbbf24", flexShrink: 0 }}
          />
          <div style={{ flex: 1, minWidth: "200px" }}>
            <div
              style={{
                fontSize: "13px",
                fontWeight: 600,
                color: "#fbbf24",
                marginBottom: "2px",
              }}
            >
              {systemsWithoutFria.length} sistem
              {systemsWithoutFria.length !== 1 ? "e" : ""} AI high-risk fără
              FRIA înregistrată
            </div>
            <div style={{ fontSize: "12px", color: "var(--ink-muted)" }}>
              Art. 27 cere FRIA înainte de prima utilizare a unui sistem AI
              high-risk pentru deployerii din categoriile (a) și (b).
            </div>
          </div>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {systemsWithoutFria.slice(0, 3).map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  setWizardPrefilledSystemId(s.id)
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
            {systemsWithoutFria.length > 3 && (
              <span
                style={{
                  fontSize: "11px",
                  color: "var(--ink-dim)",
                  alignSelf: "center",
                }}
              >
                +{systemsWithoutFria.length - 3} altele
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
        <FilterTabs
          value={statusFilter}
          onChange={setStatusFilter}
          records={records}
        />
        <button
          onClick={() => {
            setWizardPrefilledSystemId(undefined)
            setShowWizard(true)
          }}
          className="cr-btn cr-btn--primary cr-btn--sm"
        >
          <Plus size={14} /> FRIA nou
        </button>
      </div>

      {showWizard && (
        <FriaWizard
          aiSystems={aiSystems}
          dpiaRecords={dpiaRecords}
          prefilledSystemId={wizardPrefilledSystemId}
          onClose={() => {
            setShowWizard(false)
            setWizardPrefilledSystemId(undefined)
          }}
          onDone={async () => {
            setShowWizard(false)
            setWizardPrefilledSystemId(undefined)
            await load()
          }}
        />
      )}

      {loading ? (
        <div
          style={{
            fontSize: "13px",
            color: "var(--ink-dim)",
            padding: "24px 0",
          }}
        >
          Se încarcă registrul FRIA...
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          hasAny={records.length > 0}
          onCreate={() => setShowWizard(true)}
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {filtered.map((record) => (
            <FriaRow
              key={record.id}
              record={record}
              aiSystems={aiSystems}
              expanded={expandedId === record.id}
              onToggle={() =>
                setExpandedId((prev) => (prev === record.id ? null : record.id))
              }
              onDelete={() => handleDelete(record.id)}
              onApprove={() => handleApprove(record.id)}
              onReject={() => handleReject(record.id)}
              onNotifyAuthority={(name, ref) =>
                handleNotifyAuthority(record.id, name, ref)
              }
              onExport={(format) => handleExport(record.id, format)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
//   Stats
// ────────────────────────────────────────────────────────────────────────────

function StatsBar({ summary }: { summary: FriaSummary | null }) {
  const items = [
    { label: "Total", value: summary?.total ?? 0, color: "var(--ink)" },
    {
      label: "Schiță",
      value: summary?.draft ?? 0,
      color: "#94a3b8",
    },
    {
      label: "În revizie",
      value: summary?.inReview ?? 0,
      color: "#60a5fa",
    },
    {
      label: "Aprobate",
      value: summary?.approved ?? 0,
      color: "#34d399",
    },
    {
      label: "Risc înalt/critic",
      value: summary?.highOrCriticalCount ?? 0,
      color: "#f87171",
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
  value: "all" | FriaRecordStatus
  onChange: (v: "all" | FriaRecordStatus) => void
  records: FriaRecord[]
}) {
  const counts = useMemo(() => {
    const c: Partial<Record<FriaRecordStatus | "all", number>> = {
      all: records.length,
    }
    for (const r of records) c[r.status] = (c[r.status] ?? 0) + 1
    return c
  }, [records])
  const tabs: { key: "all" | FriaRecordStatus; label: string }[] = [
    { key: "all", label: "Toate" },
    { key: "draft", label: "Schiță" },
    { key: "screening_done", label: "Screening" },
    { key: "in_review", label: "În revizie" },
    { key: "needs_mitigation", label: "Mitigare" },
    { key: "approved", label: "Aprobate" },
    { key: "rejected", label: "Respinse" },
  ]
  return (
    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={`cr-tab ${value === tab.key ? "is-active" : ""}`}
        >
          {tab.label}
          <span className="cr-tab__count">
            {counts[tab.key] ?? 0}
          </span>
        </button>
      ))}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
//   Record row with expand
// ────────────────────────────────────────────────────────────────────────────

function FriaRow({
  record,
  aiSystems,
  expanded,
  onToggle,
  onDelete,
  onApprove,
  onReject,
  onNotifyAuthority,
  onExport,
}: {
  record: FriaRecord
  aiSystems: AISystemRecord[]
  expanded: boolean
  onToggle: () => void
  onDelete: () => void
  onApprove: () => void
  onReject: () => void
  onNotifyAuthority: (name: string, ref: string) => void
  onExport: (format: "md" | "pdf") => void
}) {
  const [showNotifyModal, setShowNotifyModal] = useState(false)
  const statusColor = STATUS_COLORS[record.status]
  const riskColor = RISK_COLORS[record.overallRiskLevel]
  const linkedSystem = aiSystems.find((s) => s.id === record.linkedAISystemId)
  const daysSinceUpdate = Math.floor(
    (Date.now() - new Date(record.updatedAtISO).getTime()) / 86_400_000,
  )

  return (
    <div
      style={{
        background: "var(--surface-1)",
        border: "1px solid var(--border-soft)",
        borderRadius: "10px",
        overflow: "hidden",
      }}
    >
      <button
        onClick={onToggle}
        style={{
          width: "100%",
          background: "transparent",
          border: "none",
          textAlign: "left",
          padding: "14px 16px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "14px",
        }}
      >
        <ShieldAlert
          size={16}
          style={{ color: "var(--ink-dim)", flexShrink: 0 }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: "14px",
              fontWeight: 500,
              color: "var(--ink)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {record.title}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginTop: "4px",
              flexWrap: "wrap",
            }}
          >
            <Badge bg={statusColor.bg} fg={statusColor.fg}>
              {STATUS_LABELS[record.status]}
            </Badge>
            <Badge bg={riskColor.bg} fg={riskColor.fg}>
              Risc: {RISK_LABELS[record.overallRiskLevel]} (
              {record.overallRiskScore}/100)
            </Badge>
            <span style={{ fontSize: "11px", color: "var(--ink-dim)" }}>
              {DEPLOYER_TYPE_LABELS[record.deployerType]}
            </span>
            {linkedSystem && (
              <span style={{ fontSize: "11px", color: "var(--ink-dim)" }}>
                · Sistem: {linkedSystem.name}
              </span>
            )}
            <span style={{ fontSize: "11px", color: "var(--ink-dim)" }}>
              · {daysSinceUpdate} zile
            </span>
            {record.notifiedAtISO && (
              <span
                style={{
                  fontSize: "11px",
                  color: "#34d399",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <CheckCircle2 size={11} />
                Notificat autoritate
              </span>
            )}
          </div>
        </div>
        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {expanded && (
        <div
          style={{
            padding: "16px",
            borderTop: "1px solid var(--border-soft)",
            background: "var(--surface-2)",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          {/* Section A */}
          <Section title="A. Profilul deployer-ului">
            <DetailRow label="Tip deployer">
              {DEPLOYER_TYPE_LABELS[record.deployerType]}
            </DetailRow>
            {record.linkedDpiaRecordId && (
              <DetailRow label="DPIA legată (Art. 27(4) reuse)">
                {record.linkedDpiaRecordId}
              </DetailRow>
            )}
          </Section>

          {/* Section B */}
          <Section title="B. Procesul și utilizarea">
            <DetailRow label="Descriere">
              {record.processDescription || "—"}
            </DetailRow>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: "12px",
              }}
            >
              <DetailRow label="Frecvență">
                {FREQUENCY_LABELS[record.frequencyOfUse]}
              </DetailRow>
              <DetailRow label="Început utilizare">
                {record.periodOfUseStartISO?.slice(0, 10) ?? "—"}
              </DetailRow>
              <DetailRow label="Volum estimat">
                {record.expectedVolume ?? "—"}
              </DetailRow>
            </div>
          </Section>

          {/* Section C */}
          <Section title={`C. Persoane afectate (${record.affectedGroups.length})`}>
            {record.affectedGroups.length === 0 ? (
              <span
                style={{ fontSize: "12px", color: "var(--ink-dim)" }}
              >
                Niciun grup declarat.
              </span>
            ) : (
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Categorie</th>
                    <th style={thStyle}>Volum estimat</th>
                    <th style={thStyle}>Vulnerabilități</th>
                  </tr>
                </thead>
                <tbody>
                  {record.affectedGroups.map((g, i) => (
                    <tr key={i}>
                      <td style={tdStyle}>{g.category}</td>
                      <td style={tdStyle}>{g.estimatedCount ?? "—"}</td>
                      <td style={tdStyle}>
                        {g.vulnerabilities.length > 0
                          ? g.vulnerabilities.join(", ")
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Section>

          {/* Section D — Rights at risk + risk matrix */}
          <Section title={`D. Drepturi la risc (${record.rightsAtRisk.length} / 24)`}>
            {record.riskAssessments.length === 0 ? (
              <span
                style={{ fontSize: "12px", color: "var(--ink-dim)" }}
              >
                Nicio evaluare de risc.
              </span>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                }}
              >
                {record.riskAssessments.map((a, i) => {
                  const initialColor = RISK_COLORS[a.riskLevel]
                  const residualColor = RISK_COLORS[a.residualRisk]
                  return (
                    <div
                      key={i}
                      style={{
                        background: "var(--surface-1)",
                        border: "1px solid var(--border-soft)",
                        borderRadius: "8px",
                        padding: "10px 12px",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "13px",
                          fontWeight: 500,
                          color: "var(--ink)",
                          marginBottom: "4px",
                        }}
                      >
                        {FUNDAMENTAL_RIGHT_LABELS[a.rightAffected]}
                      </div>
                      <div
                        style={{
                          fontSize: "12px",
                          color: "var(--ink-muted)",
                          marginBottom: "6px",
                        }}
                      >
                        {a.description}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          gap: "6px",
                          flexWrap: "wrap",
                          alignItems: "center",
                        }}
                      >
                        <Badge bg="var(--surface-2)" fg="var(--ink-dim)">
                          Likelihood: {LIKELIHOOD_LABELS[a.likelihood]}
                        </Badge>
                        <Badge bg="var(--surface-2)" fg="var(--ink-dim)">
                          Severity: {SEVERITY_LABELS[a.severity]}
                        </Badge>
                        <Badge bg={initialColor.bg} fg={initialColor.fg}>
                          Inițial: {RISK_LABELS[a.riskLevel]}
                        </Badge>
                        <Badge bg={residualColor.bg} fg={residualColor.fg}>
                          Rezidual: {RISK_LABELS[a.residualRisk]}
                        </Badge>
                      </div>
                      {a.mitigationMeasures.length > 0 && (
                        <div
                          style={{
                            marginTop: "6px",
                            fontSize: "11px",
                            color: "var(--ink-muted)",
                          }}
                        >
                          <strong style={{ color: "var(--ink-dim)" }}>
                            Mitigare:
                          </strong>{" "}
                          {a.mitigationMeasures.join("; ")}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </Section>

          {/* Section E — Human oversight */}
          <Section
            title={`E. Supraveghere umană (${record.humanOversightMeasures.length})`}
          >
            {record.humanOversightMeasures.length === 0 ? (
              <span
                style={{ fontSize: "12px", color: "var(--ink-dim)" }}
              >
                Nicio măsură Art. 14 documentată.
              </span>
            ) : (
              <ul style={{ margin: 0, paddingLeft: "18px", lineHeight: 1.7 }}>
                {record.humanOversightMeasures.map((m, i) => (
                  <li
                    key={i}
                    style={{ fontSize: "12px", color: "var(--ink-muted)" }}
                  >
                    <strong style={{ color: "var(--ink)" }}>
                      {OVERSIGHT_TYPE_LABELS[m.measureType]}
                    </strong>{" "}
                    · {m.description}{" "}
                    <span style={{ color: "var(--ink-dim)" }}>
                      ({m.responsibleRole})
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {/* Section F — Complaint + governance */}
          <Section title="F. Plângere și guvernanță">
            <DetailRow label="Mecanism plângere">
              {record.complaintMechanism || "—"}
            </DetailRow>
            {record.governanceMeasures.length > 0 && (
              <DetailRow label="Măsuri organizatorice">
                <ul style={{ margin: 0, paddingLeft: "18px", lineHeight: 1.6 }}>
                  {record.governanceMeasures.map((g, i) => (
                    <li
                      key={i}
                      style={{ fontSize: "12px", color: "var(--ink-muted)" }}
                    >
                      {g}
                    </li>
                  ))}
                </ul>
              </DetailRow>
            )}
            <div
              style={{
                display: "flex",
                gap: "12px",
                alignItems: "center",
                flexWrap: "wrap",
                marginTop: "8px",
              }}
            >
              <Badge
                bg={
                  record.notifyAuthorityRequired
                    ? "var(--amber-soft)"
                    : "var(--surface-2)"
                }
                fg={
                  record.notifyAuthorityRequired ? "#fbbf24" : "var(--ink-dim)"
                }
              >
                Notificare Art. 27(3):{" "}
                {record.notifyAuthorityRequired ? "DA" : "NU"}
              </Badge>
              {record.notifyAuthorityRequired && record.notifiedAtISO && (
                <span style={{ fontSize: "11px", color: "#34d399" }}>
                  Notificat la {record.notifiedAtISO.slice(0, 10)} ·{" "}
                  {record.notifyAuthorityName} · ref {record.authorityReference}
                </span>
              )}
              {record.notifyAuthorityRequired && !record.notifiedAtISO && (
                <button
                  onClick={() => setShowNotifyModal(true)}
                  className="cr-btn cr-btn--secondary cr-btn--sm"
                >
                  Marchează notificat
                </button>
              )}
            </div>
          </Section>

          {/* Linked findings */}
          {record.linkedFindingIds.length > 0 && (
            <div
              style={{
                padding: "10px 14px",
                background: "var(--amber-soft)",
                border: "1px solid rgba(251,146,60,0.25)",
                borderRadius: "8px",
                fontSize: "12px",
                color: "#fb923c",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                flexWrap: "wrap",
              }}
            >
              <ShieldAlert size={14} />
              <span style={{ flex: 1 }}>
                {record.linkedFindingIds.length} finding
                {record.linkedFindingIds.length !== 1 ? "uri" : ""} generate de
                FRIA în cockpit
              </span>
              <Link
                href="/dashboard/resolve"
                style={{ color: "#fb923c", fontWeight: 500 }}
              >
                Vezi în cockpit →
              </Link>
            </div>
          )}

          {/* Rejection reason */}
          {record.rejectionReason && (
            <div
              style={{
                padding: "10px 14px",
                background: "var(--red-soft)",
                border: "1px solid rgba(248,113,113,0.25)",
                borderRadius: "8px",
                fontSize: "12px",
                color: "#f87171",
              }}
            >
              <strong>Motiv respingere:</strong> {record.rejectionReason}
            </div>
          )}

          {/* Action row */}
          <div
            style={{
              display: "flex",
              gap: "8px",
              flexWrap: "wrap",
              marginTop: "4px",
            }}
          >
            {record.status !== "approved" && (
              <button onClick={onApprove} className="cr-btn cr-btn--secondary cr-btn--sm">
                <CheckCircle2 size={12} /> Aprobă
              </button>
            )}
            {record.status !== "rejected" && (
              <button onClick={onReject} className="cr-btn cr-btn--secondary cr-btn--sm">
                Respinge
              </button>
            )}
            <button onClick={() => onExport("md")} className="cr-btn cr-btn--secondary cr-btn--sm">
              <Download size={12} /> Markdown
            </button>
            <button onClick={() => onExport("pdf")} className="cr-btn cr-btn--secondary cr-btn--sm">
              <FileText size={12} /> PDF
            </button>
            <button
              onClick={onDelete}
              className="cr-btn cr-btn--danger cr-btn--sm"
            >
              <Trash2 size={12} /> Șterge
            </button>
          </div>
        </div>
      )}

      {showNotifyModal && (
        <NotifyAuthorityModal
          onClose={() => setShowNotifyModal(false)}
          onSubmit={(name, ref) => {
            onNotifyAuthority(name, ref)
            setShowNotifyModal(false)
          }}
          defaultAuthority={record.notifyAuthorityName}
        />
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
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        paddingBottom: "12px",
        borderBottom: "1px dashed var(--border-soft)",
      }}
    >
      <div
        style={{
          fontSize: "10px",
          color: "var(--ink-dim)",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          fontWeight: 600,
        }}
      >
        {title}
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "6px",
        }}
      >
        {children}
      </div>
    </div>
  )
}

function DetailRow({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div
        style={{
          fontSize: "10px",
          color: "var(--ink-dim)",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          marginBottom: "2px",
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: "13px", color: "var(--ink)" }}>{children}</div>
    </div>
  )
}

function Badge({
  children,
  bg,
  fg,
}: {
  children: React.ReactNode
  bg: string
  fg: string
}) {
  return (
    <span
      style={{
        fontSize: "11px",
        fontWeight: 500,
        background: bg,
        color: fg,
        padding: "2px 8px",
        borderRadius: "999px",
      }}
    >
      {children}
    </span>
  )
}

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
        textAlign: "center",
        padding: "48px 24px",
        background: "var(--surface-1)",
        border: "1px solid var(--border-soft)",
        borderRadius: "12px",
      }}
    >
      <Shield
        size={28}
        style={{ color: "var(--ink-dim)", margin: "0 auto 12px" }}
      />
      <div
        style={{
          fontSize: "14px",
          fontWeight: 500,
          color: "var(--ink)",
          marginBottom: "4px",
        }}
      >
        {hasAny ? "Niciun FRIA în filtrul curent" : "Niciun FRIA înregistrat"}
      </div>
      <div
        style={{
          fontSize: "12px",
          color: "var(--ink-muted)",
          marginBottom: "16px",
        }}
      >
        {hasAny
          ? "Schimbă filtrul de status pentru a vedea celelalte FRIA."
          : "Începe o evaluare Art. 27 pentru a documenta impactul sistemelor AI high-risk asupra drepturilor fundamentale."}
      </div>
      {!hasAny && (
        <button onClick={onCreate} className="cr-btn cr-btn--primary cr-btn--sm">
          <Plus size={14} /> FRIA nou
        </button>
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
//   Notify authority modal
// ────────────────────────────────────────────────────────────────────────────

function NotifyAuthorityModal({
  onClose,
  onSubmit,
  defaultAuthority,
}: {
  onClose: () => void
  onSubmit: (name: string, reference: string) => void
  defaultAuthority?: string
}) {
  const [authority, setAuthority] = useState(defaultAuthority ?? AUTHORITY_OPTIONS[0])
  const [reference, setReference] = useState("")

  return (
    <div style={modalOverlay}>
      <div style={modalCard}>
        <div style={modalHeader}>
          <div>
            <div
              style={{
                fontSize: "16px",
                fontWeight: 600,
                color: "var(--ink)",
              }}
            >
              Marchează notificare autoritate (Art. 27(3))
            </div>
            <div
              style={{
                fontSize: "11px",
                color: "var(--ink-dim)",
                marginTop: "2px",
              }}
            >
              Înregistrează autoritatea + referința/numărul de înregistrare.
            </div>
          </div>
          <button onClick={onClose} className="cr-btn cr-btn--icon cr-btn--sm">
            <X size={16} />
          </button>
        </div>

        <FormField label="Autoritate">
          <select
            value={authority}
            onChange={(e) => setAuthority(e.target.value)}
            className="cr-input"
          >
            {AUTHORITY_OPTIONS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Referință / Nr. înregistrare">
          <input
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="Ex: ADR/2026/12345"
            className="cr-input"
          />
        </FormField>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
          <button onClick={onClose} className="cr-btn cr-btn--secondary cr-btn--sm">
            Anulează
          </button>
          <button
            onClick={() => {
              if (authority.trim() && reference.trim()) {
                onSubmit(authority.trim(), reference.trim())
              }
            }}
            disabled={!authority.trim() || !reference.trim()}
            className="cr-btn cr-btn--primary cr-btn--sm"
          >
            Confirmă notificare
          </button>
        </div>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
//   6-step Wizard
// ────────────────────────────────────────────────────────────────────────────

function FriaWizard({
  aiSystems,
  dpiaRecords,
  prefilledSystemId,
  onClose,
  onDone,
}: {
  aiSystems: AISystemRecord[]
  dpiaRecords: DpiaRecord[]
  prefilledSystemId?: string
  onClose: () => void
  onDone: () => Promise<void>
}) {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1)
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  // Step 1 — Deployer profile
  const [title, setTitle] = useState("")
  const [linkedAISystemId, setLinkedAISystemId] = useState(
    prefilledSystemId ?? "",
  )
  const [deployerType, setDeployerType] = useState<FriaDeployerType>(
    "other_high_risk_deployer",
  )
  const [linkedDpiaRecordId, setLinkedDpiaRecordId] = useState<string>("")

  // Step 2 — Process
  const [processDescription, setProcessDescription] = useState("")
  const [periodOfUseStartISO, setPeriodOfUseStartISO] = useState(
    new Date().toISOString().slice(0, 10),
  )
  const [periodOfUseEndISO, setPeriodOfUseEndISO] = useState("")
  const [frequencyOfUse, setFrequencyOfUse] = useState<FriaFrequencyOfUse>("monthly")
  const [expectedVolume, setExpectedVolume] = useState<number | "">("")

  // Step 3 — Affected groups
  const [affectedGroups, setAffectedGroups] = useState<FriaAffectedGroup[]>([])

  // Step 4 — Rights at risk + assessments
  const [rightsAtRisk, setRightsAtRisk] = useState<FundamentalRight[]>([])
  const [riskAssessments, setRiskAssessments] = useState<FriaRiskAssessment[]>([])

  // Step 5 — Oversight
  const [humanOversightMeasures, setHumanOversightMeasures] = useState<
    FriaHumanOversightMeasure[]
  >([])

  // Step 6 — Complaint + governance
  const [complaintMechanism, setComplaintMechanism] = useState("")
  const [governanceMeasures, setGovernanceMeasures] = useState("")
  const [notifyAuthorityRequired, setNotifyAuthorityRequired] = useState(false)
  const [notifyAuthorityName, setNotifyAuthorityName] = useState(AUTHORITY_OPTIONS[0])

  async function submit() {
    setErr(null)
    if (!title.trim()) {
      setErr("Titlul FRIA este obligatoriu.")
      setStep(1)
      return
    }
    if (!linkedAISystemId) {
      setErr("Selectează sistemul AI evaluat.")
      setStep(1)
      return
    }
    if (processDescription.trim().length < 10) {
      setErr("Descrierea procesului trebuie să aibă cel puțin 10 caractere.")
      setStep(2)
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch("/api/fria", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          linkedAISystemId,
          linkedDpiaRecordId: linkedDpiaRecordId || undefined,
          deployerType,
          processDescription: processDescription.trim(),
          periodOfUseStartISO: periodOfUseStartISO || undefined,
          periodOfUseEndISO: periodOfUseEndISO || undefined,
          frequencyOfUse,
          expectedVolume:
            typeof expectedVolume === "number" ? expectedVolume : undefined,
          affectedGroups,
          rightsAtRisk,
          riskAssessments,
          humanOversightMeasures,
          complaintMechanism: complaintMechanism.trim(),
          governanceMeasures: governanceMeasures
            .split("\n")
            .map((l) => l.trim())
            .filter(Boolean),
          notifyAuthorityRequired,
          notifyAuthorityName: notifyAuthorityRequired
            ? notifyAuthorityName
            : undefined,
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({ error: "Eroare" }))
        throw new Error(d.error || "Nu am putut salva FRIA.")
      }
      await onDone()
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Eroare")
    } finally {
      setSubmitting(false)
    }
  }

  // Sync rightsAtRisk → riskAssessments (add new, remove dropped)
  function toggleRight(right: FundamentalRight) {
    setRightsAtRisk((prev) => {
      if (prev.includes(right)) {
        setRiskAssessments((ra) => ra.filter((a) => a.rightAffected !== right))
        return prev.filter((r) => r !== right)
      } else {
        setRiskAssessments((ra) => [
          ...ra,
          {
            rightAffected: right,
            description: "",
            likelihood: "possible",
            severity: "moderate",
            riskLevel: computeRiskCell("possible", "moderate"),
            mitigationMeasures: [],
            residualRisk: "low",
          },
        ])
        return [...prev, right]
      }
    })
  }

  function updateAssessment(
    index: number,
    patch: Partial<FriaRiskAssessment>,
  ) {
    setRiskAssessments((prev) => {
      const next = [...prev]
      const updated = { ...next[index], ...patch }
      // Recompute riskLevel if likelihood/severity changed
      if (patch.likelihood || patch.severity) {
        updated.riskLevel = computeRiskCell(updated.likelihood, updated.severity)
      }
      next[index] = updated
      return next
    })
  }

  const highRiskSystems = aiSystems.filter((s) => s.riskLevel === "high")
  const eligibleSystems = highRiskSystems.length > 0 ? highRiskSystems : aiSystems

  return (
    <div style={modalOverlay}>
      <div style={{ ...modalCard, maxWidth: "780px" }}>
        <div style={modalHeader}>
          <div>
            <div
              style={{
                fontSize: "16px",
                fontWeight: 600,
                color: "var(--ink)",
              }}
            >
              FRIA — pas {step} / 6
            </div>
            <div
              style={{
                fontSize: "11px",
                color: "var(--ink-dim)",
                marginTop: "2px",
              }}
            >
              EU AI Act Art. 27 · Carta drepturilor fundamentale a UE
            </div>
          </div>
          <button onClick={onClose} className="cr-btn cr-btn--icon cr-btn--sm">
            <X size={16} />
          </button>
        </div>

        <StepIndicator current={step} />

        {err && (
          <div
            style={{
              padding: "8px 12px",
              background: "var(--red-soft)",
              color: "#f87171",
              borderRadius: "6px",
              fontSize: "12px",
            }}
          >
            {err}
          </div>
        )}

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            maxHeight: "62vh",
            overflowY: "auto",
            padding: "4px 2px",
          }}
        >
          {/* STEP 1 — Deployer profile */}
          {step === 1 && (
            <>
              <p style={wizardHint}>
                Pasul 1 — profilul deployer-ului + sistemul AI evaluat.
                Selectează tipul deployer-ului conform Art. 27(1) și sistemul AI
                high-risk vizat. Opțional: leagă o DPIA existentă (Art. 27(4)
                reuse).
              </p>

              <FormField label="Titlu FRIA *">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: FRIA HR Screening AI 2026"
                  className="cr-input"
                />
              </FormField>

              <FormField label="Sistem AI evaluat *">
                <select
                  value={linkedAISystemId}
                  onChange={(e) => setLinkedAISystemId(e.target.value)}
                  className="cr-input"
                >
                  <option value="">— selectează —</option>
                  {eligibleSystems.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} · {s.riskLevel}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Tip deployer (Art. 27(1)) *">
                <select
                  value={deployerType}
                  onChange={(e) =>
                    setDeployerType(e.target.value as FriaDeployerType)
                  }
                  className="cr-input"
                >
                  {DEPLOYER_TYPE_OPTIONS.map((d) => (
                    <option key={d} value={d}>
                      {DEPLOYER_TYPE_LABELS[d]}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="DPIA legată (Art. 27(4) reuse — opțional)">
                <select
                  value={linkedDpiaRecordId}
                  onChange={(e) => setLinkedDpiaRecordId(e.target.value)}
                  className="cr-input"
                >
                  <option value="">— niciuna —</option>
                  {dpiaRecords.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.title}
                    </option>
                  ))}
                </select>
              </FormField>
            </>
          )}

          {/* STEP 2 — Process */}
          {step === 2 && (
            <>
              <p style={wizardHint}>
                Pasul 2 — descrie procesul în care e folosit sistemul AI +
                perioada de utilizare + frecvența + volumul estimat.
              </p>

              <FormField label="Descrierea procesului *">
                <textarea
            className="cr-input cr-textarea"
                  value={processDescription}
                  onChange={(e) => setProcessDescription(e.target.value)}
                  placeholder="Ex: Trierea automată a CV-urilor pentru posturile vacante prin scor de potrivire generat de model NLP."
                  rows={4}
                  style={{
                    ...inputStyle,
                    resize: "vertical",
                    fontFamily: "inherit",
                  }}
                />
              </FormField>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "12px",
                }}
              >
                <FormField label="Început utilizare">
                  <input
                    type="date"
                    value={periodOfUseStartISO}
                    onChange={(e) => setPeriodOfUseStartISO(e.target.value)}
                    className="cr-input"
                  />
                </FormField>
                <FormField label="Sfârșit utilizare (opțional)">
                  <input
                    type="date"
                    value={periodOfUseEndISO}
                    onChange={(e) => setPeriodOfUseEndISO(e.target.value)}
                    className="cr-input"
                  />
                </FormField>
              </div>

              <FormField label="Frecvență utilizare *">
                <select
                  value={frequencyOfUse}
                  onChange={(e) =>
                    setFrequencyOfUse(e.target.value as FriaFrequencyOfUse)
                  }
                  className="cr-input"
                >
                  {FREQUENCY_OPTIONS.map((f) => (
                    <option key={f} value={f}>
                      {FREQUENCY_LABELS[f]}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Volum estimat (decizii / perioadă)">
                <input
                  type="number"
                  value={expectedVolume}
                  onChange={(e) =>
                    setExpectedVolume(
                      e.target.value === "" ? "" : Number(e.target.value),
                    )
                  }
                  placeholder="Ex: 500"
                  className="cr-input"
                />
              </FormField>
            </>
          )}

          {/* STEP 3 — Affected groups */}
          {step === 3 && (
            <>
              <p style={wizardHint}>
                Pasul 3 — identifică grupurile afectate de output-ul sistemului
                AI. Notează vulnerabilitățile (copii, vârstnici, persoane cu
                dizabilități, persoane cu venituri reduse, refugiați etc.).
              </p>

              <AffectedGroupsEditor
                value={affectedGroups}
                onChange={setAffectedGroups}
              />
            </>
          )}

          {/* STEP 4 — Rights at risk + matrix */}
          {step === 4 && (
            <>
              <p style={wizardHint}>
                Pasul 4 — selectează drepturile fundamentale la risc (24 din
                Carta UE) + pentru fiecare drept selectat, evaluează likelihood
                × severity + descrie mitigarea + estimează riscul rezidual.
              </p>

              <RightsSelector
                selectedRights={rightsAtRisk}
                onToggle={toggleRight}
              />

              {riskAssessments.length > 0 && (
                <div
                  style={{
                    marginTop: "12px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "11px",
                      color: "var(--ink-dim)",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    Matrice de risc per drept ({riskAssessments.length})
                  </div>
                  {riskAssessments.map((a, i) => (
                    <RiskAssessmentEditor
                      key={a.rightAffected}
                      assessment={a}
                      onChange={(patch) => updateAssessment(i, patch)}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {/* STEP 5 — Oversight */}
          {step === 5 && (
            <>
              <p style={wizardHint}>
                Pasul 5 — măsurile Art. 14 de supraveghere umană: human-in-loop,
                override, audit log, explainability, fallback. Cel puțin o
                măsură este recomandată pentru sisteme high-risk.
              </p>

              <OversightEditor
                value={humanOversightMeasures}
                onChange={setHumanOversightMeasures}
              />
            </>
          )}

          {/* STEP 6 — Complaint + governance */}
          {step === 6 && (
            <>
              <p style={wizardHint}>
                Pasul 6 — mecanismul de plângere conform Art. 27(1)(f) + măsuri
                organizatorice + decide dacă rezultatul FRIA trebuie notificat
                autorității (Art. 27(3)).
              </p>

              <FormField label="Mecanism de plângere *">
                <textarea
            className="cr-input cr-textarea"
                  value={complaintMechanism}
                  onChange={(e) => setComplaintMechanism(e.target.value)}
                  placeholder="Ex: Persoanele afectate pot trimite plângere la dpo@firma.ro sau prin portalul /plangeri. Termen de răspuns: 15 zile. Autoritate competentă: ADR/ANSPDCP."
                  rows={3}
                  style={{
                    ...inputStyle,
                    resize: "vertical",
                    fontFamily: "inherit",
                  }}
                />
              </FormField>

              <FormField label="Măsuri organizatorice + tehnice (un item pe linie)">
                <textarea
            className="cr-input cr-textarea"
                  value={governanceMeasures}
                  onChange={(e) => setGovernanceMeasures(e.target.value)}
                  placeholder={
                    "Training trimestrial operatori\nAudit lunar al bias\nRevizuire model anual\nLog review săptămânal"
                  }
                  rows={4}
                  style={{
                    ...inputStyle,
                    resize: "vertical",
                    fontFamily: "inherit",
                  }}
                />
              </FormField>

              <label
                style={{
                  display: "flex",
                  gap: "8px",
                  fontSize: "12px",
                  color: "var(--ink-muted)",
                  padding: "10px 12px",
                  background: "var(--surface-2)",
                  borderRadius: "6px",
                  cursor: "pointer",
                  alignItems: "flex-start",
                }}
              >
                <input
                  type="checkbox"
                  checked={notifyAuthorityRequired}
                  onChange={(e) => setNotifyAuthorityRequired(e.target.checked)}
                  style={{ marginTop: "2px" }}
                />
                <span>
                  <strong style={{ color: "var(--ink)" }}>
                    Necesită notificare la autoritatea de supraveghere (Art.
                    27(3)).
                  </strong>{" "}
                  Marchează DA pentru sisteme cu risc înalt/critic asupra
                  drepturilor fundamentale.
                </span>
              </label>

              {notifyAuthorityRequired && (
                <FormField label="Autoritate competentă">
                  <select
                    value={notifyAuthorityName}
                    onChange={(e) => setNotifyAuthorityName(e.target.value)}
                    className="cr-input"
                  >
                    {AUTHORITY_OPTIONS.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </FormField>
              )}
            </>
          )}
        </div>

        {/* Step navigation */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "8px",
            paddingTop: "8px",
            borderTop: "1px solid var(--border-soft)",
          }}
        >
          <button
            onClick={() => {
              if (step > 1) setStep((s) => (s - 1) as typeof step)
            }}
            disabled={step === 1}
            className="cr-btn cr-btn--secondary cr-btn--sm"
          >
            ← Înapoi
          </button>
          {step < 6 ? (
            <button
              onClick={() => setStep((s) => (s + 1) as typeof step)}
              className="cr-btn cr-btn--primary cr-btn--sm"
            >
              Mai departe →
            </button>
          ) : (
            <button onClick={submit} disabled={submitting} className="cr-btn cr-btn--primary cr-btn--sm">
              {submitting ? (
                <Loader2 size={12} className="spin" />
              ) : (
                "Înregistrează FRIA"
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function StepIndicator({ current }: { current: number }) {
  const steps = [
    { n: 1, label: "Deployer" },
    { n: 2, label: "Proces" },
    { n: 3, label: "Persoane" },
    { n: 4, label: "Drepturi" },
    { n: 5, label: "Oversight" },
    { n: 6, label: "Plângere" },
  ]
  return (
    <div
      style={{
        display: "flex",
        gap: "4px",
        flexWrap: "wrap",
        padding: "8px 0",
      }}
    >
      {steps.map((s) => (
        <div
          key={s.n}
          style={{
            flex: 1,
            minWidth: "60px",
            padding: "6px 8px",
            background:
              s.n === current
                ? "var(--cobalt-600)"
                : s.n < current
                  ? "var(--emerald-soft)"
                  : "var(--surface-2)",
            color:
              s.n === current
                ? "white"
                : s.n < current
                  ? "#34d399"
                  : "var(--ink-dim)",
            borderRadius: "4px",
            fontSize: "10px",
            textAlign: "center",
            fontWeight: 500,
          }}
        >
          {s.n}. {s.label}
        </div>
      ))}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
//   Wizard sub-editors
// ────────────────────────────────────────────────────────────────────────────

function AffectedGroupsEditor({
  value,
  onChange,
}: {
  value: FriaAffectedGroup[]
  onChange: (v: FriaAffectedGroup[]) => void
}) {
  const [newCategory, setNewCategory] = useState("")
  const [newCount, setNewCount] = useState<number | "">("")
  const [newVuln, setNewVuln] = useState("")

  function add() {
    if (!newCategory.trim()) return
    onChange([
      ...value,
      {
        category: newCategory.trim(),
        estimatedCount: typeof newCount === "number" ? newCount : undefined,
        vulnerabilities: newVuln
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      },
    ])
    setNewCategory("")
    setNewCount("")
    setNewVuln("")
  }

  function remove(i: number) {
    onChange(value.filter((_, idx) => idx !== i))
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {value.length > 0 && (
        <div
          style={{
            background: "var(--surface-2)",
            borderRadius: "8px",
            padding: "10px 12px",
            display: "flex",
            flexDirection: "column",
            gap: "6px",
          }}
        >
          {value.map((g, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                gap: "8px",
                alignItems: "center",
                fontSize: "12px",
              }}
            >
              <strong style={{ color: "var(--ink)" }}>{g.category}</strong>
              {g.estimatedCount && (
                <span style={{ color: "var(--ink-dim)" }}>
                  · ~{g.estimatedCount}
                </span>
              )}
              {g.vulnerabilities.length > 0 && (
                <span style={{ color: "var(--ink-muted)" }}>
                  · vulnerabilități: {g.vulnerabilities.join(", ")}
                </span>
              )}
              <button
                onClick={() => remove(i)}
                style={{
                  marginLeft: "auto",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "#f87171",
                  padding: "2px",
                }}
                aria-label="Șterge"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div
        style={{
          background: "var(--surface-1)",
          border: "1px dashed var(--border-soft)",
          borderRadius: "8px",
          padding: "10px 12px",
          display: "flex",
          flexDirection: "column",
          gap: "6px",
        }}
      >
        <div
          style={{
            fontSize: "10px",
            color: "var(--ink-dim)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          Adaugă grup
        </div>
        <input
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          placeholder="Categorie (ex: candidați angajare)"
          className="cr-input"
        />
        <input
          type="number"
          value={newCount}
          onChange={(e) =>
            setNewCount(e.target.value === "" ? "" : Number(e.target.value))
          }
          placeholder="Volum estimat (ex: 500)"
          className="cr-input"
        />
        <input
          value={newVuln}
          onChange={(e) => setNewVuln(e.target.value)}
          placeholder="Vulnerabilități (separate prin virgulă: copii, vârstnici, dizabilități)"
          className="cr-input"
        />
        <button
          onClick={add}
          disabled={!newCategory.trim()}
          className="cr-btn cr-btn--secondary cr-btn--sm"
          style={{ alignSelf: "flex-end" }}
        >
          <Plus size={12} /> Adaugă
        </button>
      </div>
    </div>
  )
}

function RightsSelector({
  selectedRights,
  onToggle,
}: {
  selectedRights: FundamentalRight[]
  onToggle: (right: FundamentalRight) => void
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
        gap: "6px",
        maxHeight: "280px",
        overflowY: "auto",
        padding: "8px",
        background: "var(--surface-2)",
        borderRadius: "8px",
      }}
    >
      {FUNDAMENTAL_RIGHTS_ORDERED.map((right) => {
        const selected = selectedRights.includes(right)
        return (
          <label
            key={right}
            style={{
              display: "flex",
              gap: "8px",
              alignItems: "flex-start",
              padding: "6px 8px",
              background: selected ? "var(--cobalt-soft)" : "transparent",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "12px",
              color: selected ? "var(--ink)" : "var(--ink-muted)",
            }}
          >
            <input
              type="checkbox"
              checked={selected}
              onChange={() => onToggle(right)}
              style={{ marginTop: "2px" }}
            />
            <span>{FUNDAMENTAL_RIGHT_LABELS[right]}</span>
          </label>
        )
      })}
    </div>
  )
}

function RiskAssessmentEditor({
  assessment,
  onChange,
}: {
  assessment: FriaRiskAssessment
  onChange: (patch: Partial<FriaRiskAssessment>) => void
}) {
  const initialColor = RISK_COLORS[assessment.riskLevel]
  return (
    <div
      style={{
        background: "var(--surface-1)",
        border: "1px solid var(--border-soft)",
        borderRadius: "8px",
        padding: "10px 12px",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
      }}
    >
      <div
        style={{
          fontSize: "12px",
          fontWeight: 600,
          color: "var(--ink)",
        }}
      >
        {FUNDAMENTAL_RIGHT_LABELS[assessment.rightAffected]}
      </div>

      <textarea
            className="cr-input cr-textarea"
        value={assessment.description}
        onChange={(e) => onChange({ description: e.target.value })}
        placeholder="Descrierea riscului concret asupra acestui drept..."
        rows={2}
        style={{
          ...inputStyle,
          resize: "vertical",
          fontFamily: "inherit",
          fontSize: "12px",
        }}
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "8px",
        }}
      >
        <FormField label="Likelihood">
          <select
            value={assessment.likelihood}
            onChange={(e) =>
              onChange({ likelihood: e.target.value as FriaLikelihood })
            }
            className="cr-input"
          >
            {LIKELIHOOD_OPTIONS.map((l) => (
              <option key={l} value={l}>
                {LIKELIHOOD_LABELS[l]}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Severity">
          <select
            value={assessment.severity}
            onChange={(e) =>
              onChange({ severity: e.target.value as FriaSeverity })
            }
            className="cr-input"
          >
            {SEVERITY_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {SEVERITY_LABELS[s]}
              </option>
            ))}
          </select>
        </FormField>
      </div>

      <div
        style={{
          display: "flex",
          gap: "8px",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <Badge bg={initialColor.bg} fg={initialColor.fg}>
          Risc calculat: {RISK_LABELS[assessment.riskLevel]}
        </Badge>
        <span style={{ fontSize: "10px", color: "var(--ink-dim)" }}>
          (likelihood × severity ={" "}
          {LIKELIHOOD_SCORE[assessment.likelihood] *
            SEVERITY_SCORE[assessment.severity]}
          )
        </span>
      </div>

      <FormField label="Măsuri de mitigare (un item pe linie)">
        <textarea
            className="cr-input cr-textarea"
          value={assessment.mitigationMeasures.join("\n")}
          onChange={(e) =>
            onChange({
              mitigationMeasures: e.target.value
                .split("\n")
                .map((s) => s.trim())
                .filter(Boolean),
            })
          }
          placeholder={"Human-in-the-loop\nExplainability dashboard\nBias monitoring"}
          rows={2}
          style={{
            ...inputStyle,
            resize: "vertical",
            fontFamily: "inherit",
            fontSize: "12px",
          }}
        />
      </FormField>

      <FormField label="Risc rezidual (după mitigare)">
        <select
          value={assessment.residualRisk}
          onChange={(e) =>
            onChange({ residualRisk: e.target.value as FriaRiskLevel })
          }
          className="cr-input"
        >
          {(["low", "medium", "high", "critical"] as FriaRiskLevel[]).map(
            (r) => (
              <option key={r} value={r}>
                {RISK_LABELS[r]}
              </option>
            ),
          )}
        </select>
      </FormField>
    </div>
  )
}

function OversightEditor({
  value,
  onChange,
}: {
  value: FriaHumanOversightMeasure[]
  onChange: (v: FriaHumanOversightMeasure[]) => void
}) {
  const [type, setType] = useState<FriaHumanOversightMeasureType>("human_in_loop")
  const [description, setDescription] = useState("")
  const [role, setRole] = useState("")
  const [trigger, setTrigger] = useState("")

  function add() {
    if (!description.trim() || !role.trim()) return
    onChange([
      ...value,
      {
        measureType: type,
        description: description.trim(),
        responsibleRole: role.trim(),
        triggerConditions: trigger.trim(),
        documentedAtISO: new Date().toISOString(),
      },
    ])
    setDescription("")
    setRole("")
    setTrigger("")
  }

  function remove(i: number) {
    onChange(value.filter((_, idx) => idx !== i))
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {value.length > 0 && (
        <div
          style={{
            background: "var(--surface-2)",
            borderRadius: "8px",
            padding: "10px 12px",
            display: "flex",
            flexDirection: "column",
            gap: "6px",
          }}
        >
          {value.map((m, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                gap: "8px",
                alignItems: "flex-start",
                fontSize: "12px",
              }}
            >
              <div style={{ flex: 1 }}>
                <strong style={{ color: "var(--ink)" }}>
                  {OVERSIGHT_TYPE_LABELS[m.measureType]}
                </strong>
                <div style={{ color: "var(--ink-muted)" }}>
                  {m.description}{" "}
                  <span style={{ color: "var(--ink-dim)" }}>
                    · {m.responsibleRole}
                    {m.triggerConditions ? ` · ${m.triggerConditions}` : ""}
                  </span>
                </div>
              </div>
              <button
                onClick={() => remove(i)}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "#f87171",
                  padding: "2px",
                }}
                aria-label="Șterge"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div
        style={{
          background: "var(--surface-1)",
          border: "1px dashed var(--border-soft)",
          borderRadius: "8px",
          padding: "10px 12px",
          display: "flex",
          flexDirection: "column",
          gap: "6px",
        }}
      >
        <div
          style={{
            fontSize: "10px",
            color: "var(--ink-dim)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          Adaugă măsură
        </div>
        <select
          value={type}
          onChange={(e) =>
            setType(e.target.value as FriaHumanOversightMeasureType)
          }
          className="cr-input"
        >
          {OVERSIGHT_TYPE_OPTIONS.map((o) => (
            <option key={o} value={o}>
              {OVERSIGHT_TYPE_LABELS[o]}
            </option>
          ))}
        </select>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descriere măsură"
          className="cr-input"
        />
        <input
          value={role}
          onChange={(e) => setRole(e.target.value)}
          placeholder="Rol responsabil (ex: DPO, Recrutor HR senior)"
          className="cr-input"
        />
        <input
          value={trigger}
          onChange={(e) => setTrigger(e.target.value)}
          placeholder="Condiții declanșare (ex: scor sub 50, decizie negativă)"
          className="cr-input"
        />
        <button
          onClick={add}
          disabled={!description.trim() || !role.trim()}
          className="cr-btn cr-btn--secondary cr-btn--sm"
          style={{ alignSelf: "flex-end" }}
        >
          <Plus size={12} /> Adaugă
        </button>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
//   Shared
// ────────────────────────────────────────────────────────────────────────────

function FormField({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
      <span
        style={{
          fontSize: "11px",
          color: "var(--ink-dim)",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
        }}
      >
        {label}
      </span>
      {children}
    </label>
  )
}

// ────────────────────────────────────────────────────────────────────────────
//   Styles
// ────────────────────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  padding: "8px 10px",
  background: "var(--surface-2)",
  border: "1px solid var(--border-soft)",
  borderRadius: "6px",
  fontSize: "13px",
  color: "var(--ink)",
  outline: "none",
  width: "100%",
}

const modalOverlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.55)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 50,
  padding: "20px",
}

const modalCard: React.CSSProperties = {
  background: "var(--surface-1)",
  border: "1px solid var(--border-soft)",
  borderRadius: "12px",
  padding: "20px",
  width: "100%",
  maxWidth: "640px",
  display: "flex",
  flexDirection: "column",
  gap: "12px",
  maxHeight: "92vh",
  overflowY: "auto",
}

const modalHeader: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  borderBottom: "1px solid var(--border-soft)",
  paddingBottom: "12px",
}

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "12px",
}

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "6px 8px",
  borderBottom: "1px solid var(--border-soft)",
  color: "var(--ink-dim)",
  fontSize: "10px",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
}

const tdStyle: React.CSSProperties = {
  padding: "6px 8px",
  borderBottom: "1px solid var(--border-soft)",
  color: "var(--ink-muted)",
}

const wizardHint: React.CSSProperties = {
  fontSize: "12px",
  color: "var(--ink-muted)",
  margin: 0,
  lineHeight: 1.5,
}
