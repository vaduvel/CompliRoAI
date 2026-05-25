"use client"

/**
 * Sprint 008C — /dashboard/dpia
 *
 * Pagina mature DPIA: wizard screening (11 intrebari Art. 35) + lista
 * record-uri + detail per record + buton "Accept finding & track" care
 * apeleaza POST /api/dpia/screening?save=1 cu acceptFinding=true
 * (apare automat in /dashboard/resolve via findings-store).
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
  ClipboardCheck,
  Download,
  FileText,
  HelpCircle,
  Link as LinkIcon,
  Loader2,
  Plus,
  Shield,
  ShieldAlert,
  Trash2,
  X,
} from "lucide-react"

import type {
  DpiaRecordStatus,
  DpiaRiskLevel,
} from "@/lib/compliance/types"
import type {
  DpiaQuestion,
  DpiaSchema,
  DpiaScreeningEvaluation,
} from "@/lib/compliance/dpia-schema"
import type {
  DpiaRecordWithLink,
  DpiaSummary,
} from "@/lib/server/dpia-store"

// ────────────────────────────────────────────────────────────────────────────
//   Labels / constants
// ────────────────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<DpiaRecordStatus, string> = {
  draft: "Schiță",
  in_review: "În revizie",
  approved: "Aprobată",
  mitigations_in_progress: "Mitigare în curs",
  completed: "Finalizată",
  archived: "Arhivată",
}

const STATUS_COLORS: Record<DpiaRecordStatus, { bg: string; fg: string }> = {
  draft: { bg: "rgba(148,163,184,0.16)", fg: "#94a3b8" },
  in_review: { bg: "rgba(96,165,250,0.14)", fg: "#60a5fa" },
  approved: { bg: "rgba(52,211,153,0.14)", fg: "#34d399" },
  mitigations_in_progress: { bg: "rgba(251,191,36,0.14)", fg: "#fbbf24" },
  completed: { bg: "rgba(52,211,153,0.18)", fg: "#10b981" },
  archived: { bg: "rgba(148,163,184,0.12)", fg: "#94a3b8" },
}

const RISK_LABELS: Record<DpiaRiskLevel, string> = {
  low: "Scăzut",
  medium: "Mediu",
  high: "Înalt",
  critical: "Critic",
}

const RISK_COLORS: Record<DpiaRiskLevel, { bg: string; fg: string }> = {
  low: { bg: "rgba(96,165,250,0.12)", fg: "#60a5fa" },
  medium: { bg: "rgba(251,191,36,0.14)", fg: "#fbbf24" },
  high: { bg: "rgba(251,146,60,0.16)", fg: "#fb923c" },
  critical: { bg: "rgba(248,113,113,0.18)", fg: "#f87171" },
}

type ListResponse = {
  records: DpiaRecordWithLink[]
  summary: DpiaSummary
}

type ScreeningResponse = {
  record: DpiaRecordWithLink
  evaluation: DpiaScreeningEvaluation
  linkedFindingId?: string
}

// ────────────────────────────────────────────────────────────────────────────
//   Page
// ────────────────────────────────────────────────────────────────────────────

export default function DpiaPage() {
  const [records, setRecords] = useState<DpiaRecordWithLink[]>([])
  const [summary, setSummary] = useState<DpiaSummary | null>(null)
  const [schema, setSchema] = useState<DpiaSchema | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showWizard, setShowWizard] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<"all" | DpiaRecordStatus>(
    "all",
  )

  const load = useCallback(async () => {
    try {
      const [resList, resSchema] = await Promise.all([
        fetch("/api/dpia"),
        fetch("/api/dpia/screening"),
      ])
      if (!resList.ok) {
        setError("Nu am putut încărca registrul DPIA.")
        return
      }
      const data = (await resList.json()) as ListResponse
      setRecords(data.records)
      setSummary(data.summary)
      if (resSchema.ok) {
        const schemaData = (await resSchema.json()) as { schema: DpiaSchema }
        setSchema(schemaData.schema)
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
    if (statusFilter === "all") return records
    return records.filter((r) => r.status === statusFilter)
  }, [records, statusFilter])

  async function handleDelete(id: string) {
    if (!confirm("Ștergi acest DPIA? Acțiunea este permanentă și va apărea în audit trail.")) return
    const res = await fetch(`/api/dpia/${id}`, { method: "DELETE" })
    if (res.ok) {
      if (expandedId === id) setExpandedId(null)
      await load()
    }
  }

  async function handleStatusChange(id: string, status: DpiaRecordStatus) {
    const res = await fetch(`/api/dpia/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status }),
    })
    if (res.ok) await load()
  }

  async function handleExport(id: string) {
    window.open(`/api/dpia/${id}/export`, "_blank")
    setTimeout(() => { void load() }, 800)
  }

  return (
    <div className="cr-page cr-stack">
      <div className="cr-hero">
        <div className="cr-hero__copy">
          <span className="cr-eyebrow">Conformitate GDPR</span>
          <h1 className="cr-title">DPIA · evaluare impact date</h1>
          <p className="cr-subtitle">
          GDPR Art. 35-36 · ANSPDCP Decizia 174/2018 · Screening + record + finding cu lanț de dovezi
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
          onClick={() => setShowWizard(true)}
          className="cr-btn cr-btn--primary cr-btn--sm"
        >
          <Plus size={14} /> Screening DPIA nou
        </button>
      </div>

      {showWizard && schema && (
        <ScreeningWizard
          schema={schema}
          onClose={() => setShowWizard(false)}
          onDone={async () => {
            setShowWizard(false)
            await load()
          }}
        />
      )}

      {loading ? (
        <div style={{ fontSize: "13px", color: "var(--ink-dim)", padding: "24px 0" }}>
          Se încarcă registrul DPIA...
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState hasAny={records.length > 0} onCreate={() => setShowWizard(true)} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {filtered.map((record) => (
            <DpiaRow
              key={record.id}
              record={record}
              expanded={expandedId === record.id}
              onToggle={() =>
                setExpandedId((prev) => (prev === record.id ? null : record.id))
              }
              onDelete={() => handleDelete(record.id)}
              onStatusChange={(s) => handleStatusChange(record.id, s)}
              onExport={() => handleExport(record.id)}
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

function StatsBar({ summary }: { summary: DpiaSummary | null }) {
  const items = [
    { label: "Total", value: summary?.total ?? 0, color: "var(--ink)" },
    { label: "Active", value: summary?.open ?? 0, color: "#60a5fa" },
    { label: "Aprobate", value: summary?.approved ?? 0, color: "#34d399" },
    { label: "Risc înalt/critic", value: summary?.highResidual ?? 0, color: "#f87171" },
    { label: "Cu finding asociat", value: summary?.withLinkedFinding ?? 0, color: "#fb923c" },
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
          <div style={{ fontSize: "11px", color: "var(--ink-dim)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
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
  value: "all" | DpiaRecordStatus
  onChange: (v: "all" | DpiaRecordStatus) => void
  records: DpiaRecordWithLink[]
}) {
  const counts = useMemo(() => {
    const c: Partial<Record<DpiaRecordStatus | "all", number>> = { all: records.length }
    for (const r of records) c[r.status] = (c[r.status] ?? 0) + 1
    return c
  }, [records])
  const tabs: { key: "all" | DpiaRecordStatus; label: string }[] = [
    { key: "all", label: "Toate" },
    { key: "draft", label: "Schiță" },
    { key: "in_review", label: "În revizie" },
    { key: "approved", label: "Aprobată" },
    { key: "completed", label: "Finalizată" },
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
//   Row + expand
// ────────────────────────────────────────────────────────────────────────────

function DpiaRow({
  record,
  expanded,
  onToggle,
  onDelete,
  onStatusChange,
  onExport,
}: {
  record: DpiaRecordWithLink
  expanded: boolean
  onToggle: () => void
  onDelete: () => void
  onStatusChange: (s: DpiaRecordStatus) => void
  onExport: () => void
}) {
  const statusColor = STATUS_COLORS[record.status]
  const riskColor = RISK_COLORS[record.residualRisk]

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
        <ClipboardCheck size={16} style={{ color: "var(--ink-dim)", flexShrink: 0 }} />
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
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px", flexWrap: "wrap" }}>
            <Badge bg={statusColor.bg} fg={statusColor.fg}>{STATUS_LABELS[record.status]}</Badge>
            <Badge bg={riskColor.bg} fg={riskColor.fg}>Risc rezidual: {RISK_LABELS[record.residualRisk]}</Badge>
            {typeof record.screeningRiskScore === "number" && (
              <span style={{ fontSize: "11px", color: "var(--ink-dim)" }}>
                Screening {record.screeningRiskScore}/100
              </span>
            )}
            {record.linkedFindingId && (
              <span
                style={{
                  fontSize: "11px",
                  color: "#fb923c",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <LinkIcon size={11} />
                Finding asociat
              </span>
            )}
            <span style={{ fontSize: "11px", color: "var(--ink-dim)" }}>
              Owner: {record.owner}
            </span>
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
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <DetailField label="Scop prelucrare">{record.processingPurpose}</DetailField>
            <DetailField label="Temei legal">{record.legalBasis}</DetailField>
            <DetailField label="Categorii date">
              {record.dataCategories.length ? record.dataCategories.join(", ") : "—"}
            </DetailField>
            <DetailField label="Persoane vizate">
              {record.dataSubjects.length ? record.dataSubjects.join(", ") : "—"}
            </DetailField>
          </div>

          <DetailField label="Descriere">{record.processingDescription}</DetailField>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
            <FactorChip label="Date speciale" value={record.specialCategories} />
            <FactorChip label="Decizie automată" value={record.automatedDecisionMaking} />
            <FactorChip label="Scară largă" value={record.largeScaleProcessing} />
          </div>

          {record.risks.length > 0 && (
            <DetailField label="Riscuri identificate">
              <ul style={{ margin: 0, paddingLeft: "18px", lineHeight: "1.7" }}>
                {record.risks.map((r, i) => (
                  <li key={i} style={{ fontSize: "13px", color: "var(--ink-muted)" }}>{r}</li>
                ))}
              </ul>
            </DetailField>
          )}

          {record.mitigationMeasures.length > 0 && (
            <DetailField label="Măsuri de mitigare">
              <ul style={{ margin: 0, paddingLeft: "18px", lineHeight: "1.7" }}>
                {record.mitigationMeasures.map((r, i) => (
                  <li key={i} style={{ fontSize: "13px", color: "var(--ink-muted)" }}>{r}</li>
                ))}
              </ul>
            </DetailField>
          )}

          {record.screeningReasons && record.screeningReasons.length > 0 && (
            <DetailField label={`Screening Art. 35 (${record.screeningSchemaVersion ?? "-"})`}>
              <ul style={{ margin: 0, paddingLeft: "18px", lineHeight: "1.7" }}>
                {record.screeningReasons.map((r, i) => (
                  <li key={i} style={{ fontSize: "13px", color: "var(--ink-muted)" }}>{r}</li>
                ))}
              </ul>
            </DetailField>
          )}

          {record.linkedFindingId && (
            <div
              style={{
                display: "flex",
                gap: "10px",
                padding: "10px 14px",
                background: "var(--amber-soft)",
                border: "1px solid rgba(251,146,60,0.25)",
                borderRadius: "8px",
                fontSize: "12px",
                color: "#fb923c",
                alignItems: "center",
              }}
            >
              <ShieldAlert size={14} />
              <span style={{ flex: 1 }}>
                Finding GDPR generat din screening: <strong>{record.linkedFindingId}</strong>
              </span>
              <Link href="/dashboard/resolve" style={{ color: "#fb923c", fontWeight: 500 }}>
                Vezi în cockpit →
              </Link>
            </div>
          )}

          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "4px" }}>
            {record.status !== "in_review" && (
              <button onClick={() => onStatusChange("in_review")} className="cr-btn cr-btn--secondary cr-btn--sm">
                Trimite în revizie
              </button>
            )}
            {record.status !== "approved" && (
              <button onClick={() => onStatusChange("approved")} className="cr-btn cr-btn--secondary cr-btn--sm">
                Aprobă
              </button>
            )}
            {record.status !== "completed" && (
              <button onClick={() => onStatusChange("completed")} className="cr-btn cr-btn--secondary cr-btn--sm">
                Marchează finalizat
              </button>
            )}
            {record.status !== "mitigations_in_progress" && (
              <button onClick={() => onStatusChange("mitigations_in_progress")} className="cr-btn cr-btn--secondary cr-btn--sm">
                Mitigare în curs
              </button>
            )}
            <button onClick={onExport} className="cr-btn cr-btn--secondary cr-btn--sm">
              <Download size={12} /> Export markdown
            </button>
            <button onClick={onDelete} className="cr-btn cr-btn--danger cr-btn--sm">
              <Trash2 size={12} /> Șterge
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Badge({ children, bg, fg }: { children: React.ReactNode; bg: string; fg: string }) {
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

function DetailField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div
        style={{
          fontSize: "10px",
          color: "var(--ink-dim)",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          marginBottom: "4px",
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: "13px", color: "var(--ink)" }}>{children}</div>
    </div>
  )
}

function FactorChip({ label, value }: { label: string; value: boolean }) {
  return (
    <div
      style={{
        padding: "8px 10px",
        background: value ? "var(--red-soft)" : "var(--surface-1)",
        border: `1px solid ${value ? "rgba(248,113,113,0.25)" : "var(--border-soft)"}`,
        borderRadius: "6px",
        fontSize: "12px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        color: value ? "#f87171" : "var(--ink-muted)",
      }}
    >
      <span>{label}</span>
      <span style={{ fontWeight: 600 }}>{value ? "Da" : "Nu"}</span>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
//   Screening wizard
// ────────────────────────────────────────────────────────────────────────────

function ScreeningWizard({
  schema,
  onClose,
  onDone,
}: {
  schema: DpiaSchema
  onClose: () => void
  onDone: () => Promise<void>
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [processName, setProcessName] = useState("")
  const [department, setDepartment] = useState("")
  const [ownerName, setOwnerName] = useState("")
  const [description, setDescription] = useState("")
  const [answers, setAnswers] = useState<Record<string, boolean | string>>({})
  const [evaluation, setEvaluation] = useState<DpiaScreeningEvaluation | null>(null)
  const [acceptFinding, setAcceptFinding] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function evaluate() {
    setErr(null)
    setSubmitting(true)
    try {
      const res = await fetch("/api/dpia/screening", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ processName, department, ownerName, description, answers }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({ error: "Eroare" }))
        throw new Error(d.error || "Nu am putut evalua.")
      }
      const data = (await res.json()) as { evaluation: DpiaScreeningEvaluation }
      setEvaluation(data.evaluation)
      setStep(3)
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Eroare")
    } finally {
      setSubmitting(false)
    }
  }

  async function save() {
    setErr(null)
    setSubmitting(true)
    try {
      const res = await fetch("/api/dpia/screening?save=1", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          processName,
          department,
          ownerName,
          description,
          answers,
          acceptFinding,
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({ error: "Eroare" }))
        throw new Error(d.error || "Nu am putut salva.")
      }
      await onDone()
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Eroare")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={modalOverlay}>
      <div style={modalCard}>
        <div style={modalHeader}>
          <div>
            <div style={{ fontSize: "16px", fontWeight: 600, color: "var(--ink)" }}>
              Screening DPIA — pas {step} / 3
            </div>
            <div style={{ fontSize: "11px", color: "var(--ink-dim)", marginTop: "2px" }}>
              Schema {schema.version} · GDPR Art. 35 · ANSPDCP Decizia 174/2018
            </div>
          </div>
          <button onClick={onClose} className="cr-btn cr-btn--icon cr-btn--sm"><X size={16} /></button>
        </div>

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

        {step === 1 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <p style={{ fontSize: "12px", color: "var(--ink-muted)", margin: 0 }}>
              Pasul 1 — context proces. Sunt informații folosite pentru raport și pentru a lega
              record-ul DPIA de cockpit-ul de findings.
            </p>
            <FormField label="Nume proces *">
              <input
                value={processName}
                onChange={(e) => setProcessName(e.target.value)}
                placeholder="Ex: HR screening CV, Chatbot suport, Profilare clienți"
                className="cr-input"
              />
            </FormField>
            <FormField label="Departament">
              <input
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="Ex: HR, IT, Vânzări"
                className="cr-input"
              />
            </FormField>
            <FormField label="Owner proces">
              <input
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="Numele responsabilului"
                className="cr-input"
              />
            </FormField>
            <FormField label="Descriere scurtă (opțional)">
              <textarea
            className="cr-input cr-textarea"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Cum funcționează procesul, ce date intră, cine le primește..."
                rows={3}
                style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
              />
            </FormField>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
              <button onClick={onClose} className="cr-btn cr-btn--secondary cr-btn--sm">Anulează</button>
              <button
                onClick={() => processName.trim() && setStep(2)}
                disabled={!processName.trim()}
                className="cr-btn cr-btn--primary cr-btn--sm"
              >
                Mai departe →
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <p style={{ fontSize: "12px", color: "var(--ink-muted)", margin: 0 }}>
              Pasul 2 — 11 întrebări Art. 35 (cele 9 criterii EDPB + securitate + retenție). Răspunde cinstit; procentajul
              riscului se calculează automat.
            </p>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                maxHeight: "55vh",
                overflowY: "auto",
                padding: "4px 2px",
              }}
            >
              {schema.questions.map((q) => (
                <QuestionField
                  key={q.id}
                  question={q}
                  value={answers[q.id]}
                  onChange={(v) => setAnswers((prev) => ({ ...prev, [q.id]: v }))}
                />
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "8px" }}>
              <button onClick={() => setStep(1)} className="cr-btn cr-btn--secondary cr-btn--sm">← Înapoi</button>
              <button onClick={evaluate} disabled={submitting} className="cr-btn cr-btn--primary cr-btn--sm">
                {submitting ? <Loader2 size={12} className="spin" /> : "Evaluează →"}
              </button>
            </div>
          </div>
        )}

        {step === 3 && evaluation && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div
              style={{
                padding: "14px 16px",
                background: evaluation.requiresFullDpia ? "var(--red-soft)" : "var(--emerald-soft)",
                border: `1px solid ${
                  evaluation.requiresFullDpia ? "rgba(248,113,113,0.25)" : "rgba(52,211,153,0.25)"
                }`,
                borderRadius: "8px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                {evaluation.requiresFullDpia ? <ShieldAlert size={18} color="#f87171" /> : <CheckCircle2 size={18} color="#34d399" />}
                <strong
                  style={{
                    fontSize: "14px",
                    color: evaluation.requiresFullDpia ? "#f87171" : "#34d399",
                  }}
                >
                  {evaluation.requiresFullDpia
                    ? "DPIA completă necesară"
                    : "DPIA completă NU este obligatorie acum"}
                </strong>
              </div>
              <div style={{ fontSize: "12px", color: "var(--ink-muted)", marginTop: "6px" }}>
                Risc {evaluation.riskScore}/100 · nivel{" "}
                <strong>{RISK_LABELS[evaluation.riskLevel as DpiaRiskLevel]}</strong>
              </div>
            </div>

            {evaluation.reasons.length > 0 && (
              <Section title="Semnale de risc detectate">
                <ul style={{ margin: 0, paddingLeft: "18px", lineHeight: "1.6" }}>
                  {evaluation.reasons.map((r, i) => (
                    <li key={i} style={{ fontSize: "12px", color: "var(--ink-muted)" }}>{r}</li>
                  ))}
                </ul>
              </Section>
            )}

            {evaluation.missingEvidence.length > 0 && (
              <Section title="Dovezi lipsă (de completat)">
                <ul style={{ margin: 0, paddingLeft: "18px", lineHeight: "1.6" }}>
                  {evaluation.missingEvidence.map((r, i) => (
                    <li key={i} style={{ fontSize: "12px", color: "var(--ink-muted)" }}>{r}</li>
                  ))}
                </ul>
              </Section>
            )}

            <Section title="Recomandări">
              <ul style={{ margin: 0, paddingLeft: "18px", lineHeight: "1.6" }}>
                {evaluation.recommendedMeasures.map((r, i) => (
                  <li key={i} style={{ fontSize: "12px", color: "var(--ink-muted)" }}>{r}</li>
                ))}
              </ul>
            </Section>

            {evaluation.requiresFullDpia && (
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
                  checked={acceptFinding}
                  onChange={(e) => setAcceptFinding(e.target.checked)}
                  style={{ marginTop: "2px" }}
                />
                <span>
                  <strong style={{ color: "var(--ink)" }}>Creează finding GDPR în cockpit.</strong> Risc-ul rezidual ridicat va apărea
                  în <Link href="/dashboard/resolve" style={{ color: "var(--cobalt-600)" }}>/dashboard/resolve</Link> cu
                  evidence required și lifecycle complet (confirm/dismiss/resolve/monitor).
                </span>
              </label>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", gap: "8px" }}>
              <button onClick={() => setStep(2)} className="cr-btn cr-btn--secondary cr-btn--sm">← Modifică răspunsuri</button>
              <button onClick={save} disabled={submitting} className="cr-btn cr-btn--primary cr-btn--sm">
                {submitting ? <Loader2 size={12} className="spin" /> : "Salvează record DPIA"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function QuestionField({
  question,
  value,
  onChange,
}: {
  question: DpiaQuestion
  value: boolean | string | undefined
  onChange: (v: boolean | string) => void
}) {
  return (
    <div
      style={{
        background: "var(--surface-1)",
        border: "1px solid var(--border-soft)",
        borderRadius: "8px",
        padding: "12px 14px",
      }}
    >
      <div style={{ fontSize: "13px", fontWeight: 500, color: "var(--ink)", marginBottom: "4px" }}>
        {question.label}
      </div>
      <div style={{ fontSize: "11px", color: "var(--ink-dim)", marginBottom: "8px" }}>
        {question.helpText}
      </div>
      {question.type === "boolean" && (
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            type="button"
            onClick={() => onChange(true)}
            className={`cr-filter-chip ${value === true ? "is-active" : ""}`}
          >
            Da
          </button>
          <button
            type="button"
            onClick={() => onChange(false)}
            className={`cr-filter-chip ${value === false ? "is-active" : ""}`}
          >
            Nu
          </button>
        </div>
      )}
      {question.type === "select" && question.options && (
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {question.options.map((opt) => (
            <button
              type="button"
              key={opt}
              onClick={() => onChange(opt)}
              className={`cr-filter-chip ${value === opt ? "is-active" : ""}`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div
        style={{
          fontSize: "10px",
          color: "var(--ink-dim)",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          marginBottom: "6px",
        }}
      >
        {title}
      </div>
      {children}
    </div>
  )
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
      <span style={{ fontSize: "11px", color: "var(--ink-dim)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {label}
      </span>
      {children}
    </label>
  )
}

function EmptyState({ hasAny, onCreate }: { hasAny: boolean; onCreate: () => void }) {
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
      <Shield size={28} style={{ color: "var(--ink-dim)", margin: "0 auto 12px" }} />
      <div style={{ fontSize: "14px", fontWeight: 500, color: "var(--ink)", marginBottom: "4px" }}>
        {hasAny ? "Nicio DPIA în filtrul curent" : "Nu există DPIA înregistrate"}
      </div>
      <div style={{ fontSize: "12px", color: "var(--ink-muted)", marginBottom: "16px" }}>
        {hasAny
          ? "Schimbă filtrul de status pentru a vedea celelalte DPIA."
          : "Rulează screening Art. 35 ca să decizi dacă procesul tău cere DPIA completă."}
      </div>
      {!hasAny && (
        <button onClick={onCreate} className="cr-btn cr-btn--primary cr-btn--sm">
          <Plus size={14} /> Screening DPIA nou
        </button>
      )}
    </div>
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
