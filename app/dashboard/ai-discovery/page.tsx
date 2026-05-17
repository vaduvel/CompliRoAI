"use client"

/**
 * Sprint 009 — /dashboard/ai-discovery
 *
 * Cockpit AI Discovery cu 4 sectiuni majore:
 *   1) Intake wizard 4-step pentru a inregistra un tool AI nou
 *   2) AI Data Map table cu filter + expand + edit + delete + follow-up + re-evaluate
 *   3) AI Exposure Report (generate + preview markdown + download .md)
 *   4) AI Policy Pack (5 template-uri RO download)
 *
 * Stil: inline + v3 design tokens, fara shadcn/Tailwind.
 * Reference pattern: app/dashboard/breach/page.tsx.
 */

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  Eye,
  FileText,
  Loader2,
  Plus,
  Search,
  Shield,
  Sparkles,
  Trash2,
  X,
} from "lucide-react"

import type {
  AIDataMapRecord,
  AIDeploymentMode,
  AIExposureReport,
  AIRiskCandidate,
  AITrainingDataUsage,
  AIUseCaseCategory,
  AIVendorRegion,
} from "@/lib/compliance/types"
import type { AIDataDiscoveryIntake } from "@/lib/compliance/ai-data-discovery"
import {
  DEPLOYMENT_MODE_LABELS,
  RISK_CANDIDATE_LABELS,
  TRAINING_USAGE_LABELS,
  USE_CASE_LABELS,
  VENDOR_REGION_LABELS,
} from "@/lib/compliance/ai-data-discovery"
import type { AIDataMapSummary } from "@/lib/server/ai-data-discovery-store"
import type {
  AIPolicyPack,
  AIPolicyPackTemplateId,
} from "@/lib/compliance/ai-policy-pack"

// ────────────────────────────────────────────────────────────────────────────
//   Const lists
// ────────────────────────────────────────────────────────────────────────────

const ALL_USE_CASES: AIUseCaseCategory[] = [
  "customer_support",
  "internal_copilot",
  "sales_marketing",
  "hr_workplace",
  "finance_credit_fraud",
  "medical_health",
  "education",
  "ecommerce_retail",
  "legal_professional",
  "ai_builder_agent",
  "cybersecurity",
  "public_sector_critical",
  "other",
]
const ALL_DEPLOYMENT_MODES: AIDeploymentMode[] = ["saas", "self_hosted", "api", "embedded"]
const ALL_VENDOR_REGIONS: AIVendorRegion[] = ["EU", "US", "UK", "other", "unknown"]
const ALL_TRAINING_USAGE: AITrainingDataUsage[] = [
  "no_training",
  "opt_out_available",
  "trains_on_data",
  "unknown",
]

const RISK_COLORS: Record<AIRiskCandidate, { bg: string; fg: string }> = {
  prohibited_candidate: { bg: "rgba(248,113,113,0.22)", fg: "#f87171" },
  high_risk_candidate: { bg: "rgba(251,146,60,0.18)", fg: "#fb923c" },
  needs_human_review: { bg: "rgba(251,191,36,0.16)", fg: "#fbbf24" },
  transparency_limited: { bg: "rgba(168,85,247,0.14)", fg: "#a855f7" },
  minimal: { bg: "rgba(52,211,153,0.14)", fg: "#34d399" },
}

type ListResponse = {
  records: AIDataMapRecord[]
  summary: AIDataMapSummary
}

// ────────────────────────────────────────────────────────────────────────────
//   Page
// ────────────────────────────────────────────────────────────────────────────

export default function AIDiscoveryPage() {
  const [records, setRecords] = useState<AIDataMapRecord[]>([])
  const [summary, setSummary] = useState<AIDataMapSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showWizard, setShowWizard] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [riskFilter, setRiskFilter] = useState<"all" | AIRiskCandidate>("all")
  const [categoryFilter, setCategoryFilter] = useState<"all" | AIUseCaseCategory>("all")

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/ai-data-discovery")
      if (!res.ok) {
        setError("Nu am putut încărca AI Data Map.")
        return
      }
      const data = (await res.json()) as ListResponse
      setRecords(data.records)
      setSummary(data.summary)
      setError(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = useMemo(() => {
    return records.filter((r) => {
      if (riskFilter !== "all" && r.riskCandidate !== riskFilter) return false
      if (categoryFilter !== "all" && r.useCaseCategory !== categoryFilter) return false
      return true
    })
  }, [records, riskFilter, categoryFilter])

  async function handleDelete(id: string) {
    if (!confirm("Ștergi acest tool AI din Data Map? Acțiunea apare în audit trail.")) return
    const res = await fetch(`/api/ai-data-discovery/${id}`, { method: "DELETE" })
    if (res.ok) {
      if (expandedId === id) setExpandedId(null)
      await load()
    }
  }

  return (
    <div
      style={{
        padding: "32px",
        maxWidth: "1200px",
        display: "flex",
        flexDirection: "column",
        gap: "28px",
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
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <Search size={20} color="#60a5fa" />
          AI Discovery — ce AI folosești și ce date îl traversează
        </h1>
        <p style={{ fontSize: "13px", color: "var(--ink-muted)", marginTop: "6px" }}>
          Înregistrează fiecare tool AI folosit, primește scor de risc EU AI Act + GDPR automat
          + findings emise în <strong>De rezolvat</strong>. Generează AI Exposure Report
          client-facing și descarcă Policy Pack RO. Pentru detecție PII în text/blob, deschide{" "}
          <a
            href="/dashboard/ai-discovery/pii-scan"
            style={{ color: "var(--cobalt-600)", textDecoration: "underline" }}
          >
            PII Scan
          </a>
          .
        </p>
      </div>

      <StatsBar summary={summary} />

      {error && <ErrorBanner message={error} />}

      {/* ── Section 1: AI Data Map ─────────────────────────────────────── */}
      <Section
        icon={<Sparkles size={16} color="#60a5fa" />}
        title="AI Data Map"
        subtitle="Tool-uri AI înregistrate per organizație. Click pe rând pentru detalii + acțiuni."
        action={
          <button onClick={() => setShowWizard(true)} style={btnPrimary}>
            <Plus size={14} /> Adaugă tool AI
          </button>
        }
      >
        <DataMapFilters
          riskFilter={riskFilter}
          onRiskFilter={setRiskFilter}
          categoryFilter={categoryFilter}
          onCategoryFilter={setCategoryFilter}
          records={records}
        />
        {loading ? (
          <div style={{ fontSize: "13px", color: "var(--ink-dim)", padding: "24px 0" }}>
            Se încarcă AI Data Map...
          </div>
        ) : filtered.length === 0 ? (
          <EmptyDataMap hasAny={records.length > 0} onCreate={() => setShowWizard(true)} />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {filtered.map((record) => (
              <RecordRow
                key={record.id}
                record={record}
                expanded={expandedId === record.id}
                onToggle={() =>
                  setExpandedId((prev) => (prev === record.id ? null : record.id))
                }
                onDelete={() => handleDelete(record.id)}
                onRefresh={load}
              />
            ))}
          </div>
        )}
      </Section>

      {/* ── Section 2: AI Exposure Report ──────────────────────────────── */}
      <ExposureReportPanel records={records} />

      {/* ── Section 3: Policy Pack ─────────────────────────────────────── */}
      <PolicyPackPanel />

      {showWizard && (
        <WizardModal
          onClose={() => setShowWizard(false)}
          onDone={async () => {
            setShowWizard(false)
            await load()
          }}
        />
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
//   Stats
// ────────────────────────────────────────────────────────────────────────────

function StatsBar({ summary }: { summary: AIDataMapSummary | null }) {
  const items = [
    { label: "Total tool-uri", value: summary?.total ?? 0, color: "var(--ink)" },
    { label: "Active", value: summary?.active ?? 0, color: "#60a5fa" },
    { label: "Cu date personale", value: summary?.withPersonalData ?? 0, color: "#a855f7" },
    {
      label: "High-risk candidate",
      value: summary?.highRiskCandidate ?? 0,
      color: "#fb923c",
    },
    {
      label: "Prohibited candidate",
      value: summary?.prohibitedCandidate ?? 0,
      color: "#f87171",
    },
    { label: "Lipsă DPA", value: summary?.noDpa ?? 0, color: "#fbbf24" },
  ]
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
        gap: "10px",
      }}
    >
      {items.map((it) => (
        <div
          key={it.label}
          style={{
            padding: "12px 14px",
            background: "var(--surface-1)",
            border: "1px solid var(--border-soft)",
            borderRadius: "8px",
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
              fontSize: "20px",
              fontWeight: 600,
              color: it.color,
              marginTop: "4px",
            }}
          >
            {it.value}
          </div>
        </div>
      ))}
    </div>
  )
}

function ErrorBanner({ message }: { message: string }) {
  return (
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
      {message}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
//   Filters
// ────────────────────────────────────────────────────────────────────────────

function DataMapFilters({
  riskFilter,
  onRiskFilter,
  categoryFilter,
  onCategoryFilter,
  records,
}: {
  riskFilter: "all" | AIRiskCandidate
  onRiskFilter: (v: "all" | AIRiskCandidate) => void
  categoryFilter: "all" | AIUseCaseCategory
  onCategoryFilter: (v: "all" | AIUseCaseCategory) => void
  records: AIDataMapRecord[]
}) {
  const RISKS: ("all" | AIRiskCandidate)[] = [
    "all",
    "prohibited_candidate",
    "high_risk_candidate",
    "needs_human_review",
    "transparency_limited",
    "minimal",
  ]
  return (
    <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "12px" }}>
      <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
        {RISKS.map((r) => {
          const active = r === riskFilter
          const count = r === "all" ? records.length : records.filter((x) => x.riskCandidate === r).length
          return (
            <button
              key={r}
              onClick={() => onRiskFilter(r)}
              style={{
                padding: "5px 10px",
                fontSize: "11px",
                fontWeight: 500,
                borderRadius: "999px",
                border: "1px solid " + (active ? "var(--cobalt-600)" : "var(--border-soft)"),
                background: active ? "rgba(96,165,250,0.14)" : "var(--surface-1)",
                color: active ? "#60a5fa" : "var(--ink-muted)",
                cursor: "pointer",
              }}
            >
              {r === "all" ? "Toate riscurile" : RISK_CANDIDATE_LABELS[r]} · {count}
            </button>
          )
        })}
      </div>
      <select
        value={categoryFilter}
        onChange={(e) => onCategoryFilter(e.target.value as "all" | AIUseCaseCategory)}
        style={{ ...inputStyle, width: "auto", minWidth: "200px" }}
      >
        <option value="all">Toate categoriile</option>
        {ALL_USE_CASES.map((c) => (
          <option key={c} value={c}>
            {USE_CASE_LABELS[c]}
          </option>
        ))}
      </select>
    </div>
  )
}

function EmptyDataMap({
  hasAny,
  onCreate,
}: {
  hasAny: boolean
  onCreate: () => void
}) {
  return (
    <div
      style={{
        padding: "32px",
        background: "var(--surface-1)",
        border: "1px dashed var(--border-soft)",
        borderRadius: "10px",
        textAlign: "center",
      }}
    >
      <Search size={28} color="#94a3b8" style={{ marginBottom: "8px" }} />
      <div style={{ fontSize: "14px", fontWeight: 500, color: "var(--ink)" }}>
        {hasAny ? "Niciun tool AI în filtrul curent" : "Niciun tool AI înregistrat"}
      </div>
      <p style={{ fontSize: "12px", color: "var(--ink-dim)", marginTop: "6px" }}>
        Pornește prin a înregistra tool-urile AI folosite (ChatGPT, Copilot, chatbot suport,
        scoring, HR screening). Primești evaluare risc EU AI Act + findings automat.
      </p>
      <button onClick={onCreate} style={{ ...btnPrimary, marginTop: "14px" }}>
        <Plus size={14} /> Adaugă primul tool AI
      </button>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
//   Record row + detail
// ────────────────────────────────────────────────────────────────────────────

function RecordRow({
  record,
  expanded,
  onToggle,
  onDelete,
  onRefresh,
}: {
  record: AIDataMapRecord
  expanded: boolean
  onToggle: () => void
  onDelete: () => void
  onRefresh: () => Promise<void>
}) {
  const riskColors = RISK_COLORS[record.riskCandidate]

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
          padding: "14px 18px",
          display: "grid",
          gridTemplateColumns: "1fr auto auto auto auto auto",
          gap: "12px",
          alignItems: "center",
          cursor: "pointer",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: "14px", fontWeight: 500, color: "var(--ink)", marginBottom: "3px" }}>
            {record.toolName}
            {record.vendor && (
              <span style={{ color: "var(--ink-dim)", fontWeight: 400 }}> · {record.vendor}</span>
            )}
          </div>
          <div style={{ fontSize: "11px", color: "var(--ink-dim)" }}>
            {USE_CASE_LABELS[record.useCaseCategory]} ·{" "}
            {DEPLOYMENT_MODE_LABELS[record.deploymentMode]} ·{" "}
            {VENDOR_REGION_LABELS[record.vendorRegion]}
          </div>
        </div>
        <Badge bg={riskColors.bg} fg={riskColors.fg}>
          {RISK_CANDIDATE_LABELS[record.riskCandidate]}
        </Badge>
        <Badge
          bg={record.processesPersonalData ? "rgba(168,85,247,0.14)" : "var(--surface-2)"}
          fg={record.processesPersonalData ? "#a855f7" : "var(--ink-dim)"}
        >
          {record.processesPersonalData ? "Date personale" : "Fără PII"}
        </Badge>
        <Badge
          bg={record.dpaSigned ? "rgba(52,211,153,0.14)" : "rgba(248,113,113,0.18)"}
          fg={record.dpaSigned ? "#34d399" : "#f87171"}
        >
          {record.dpaSigned ? "DPA OK" : "Lipsă DPA"}
        </Badge>
        <span
          style={{
            fontSize: "11px",
            color: "var(--ink-dim)",
            display: "flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          <Shield size={12} /> {record.linkedFindingIds.length}
        </span>
        {expanded ? (
          <ChevronUp size={16} color="var(--ink-muted)" />
        ) : (
          <ChevronDown size={16} color="var(--ink-muted)" />
        )}
      </div>

      {expanded && <RecordDetail record={record} onDelete={onDelete} onRefresh={onRefresh} />}
    </div>
  )
}

function RecordDetail({
  record,
  onDelete,
  onRefresh,
}: {
  record: AIDataMapRecord
  onDelete: () => void
  onRefresh: () => Promise<void>
}) {
  const [showFollowUp, setShowFollowUp] = useState(false)

  return (
    <div
      style={{
        padding: "18px",
        borderTop: "1px solid var(--border-soft)",
        background: "var(--surface-2)",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
      }}
    >
      <SubSection title="Descriere utilizare">
        <div
          style={{
            fontSize: "13px",
            color: "var(--ink-muted)",
            lineHeight: 1.55,
            whiteSpace: "pre-wrap",
          }}
        >
          {record.useCaseDescription || <span style={{ color: "var(--ink-dim)" }}>—</span>}
        </div>
      </SubSection>

      <SubSection title="Date">
        <DetailGrid>
          <KV label="Input categories" value={record.inputDataCategories.join(", ") || "—"} />
          <KV label="Output categories" value={record.outputDataCategories.join(", ") || "—"} />
          <KV label="Procesează date personale" value={record.processesPersonalData ? "Da" : "Nu"} />
          <KV
            label="Categorii speciale Art. 9"
            value={record.processesSpecialCategories ? "Da" : "Nu"}
          />
          <KV label="Date copii (sub 16)" value={record.childrenData ? "Da" : "Nu"} />
        </DetailGrid>
      </SubSection>

      <SubSection title="Vendor & governance">
        <DetailGrid>
          <KV label="Vendor region" value={VENDOR_REGION_LABELS[record.vendorRegion]} />
          <KV label="Training pe date" value={TRAINING_USAGE_LABELS[record.trainingDataUsage]} />
          <KV label="DPA" value={record.dpaSigned ? "Semnat" : "Lipsă"} />
          <KV
            label="Subprocesori documentați"
            value={record.subprocessorsDocumented ? "Da" : "Nu"}
          />
          {record.dpaUrl && (
            <KV label="DPA URL" value={record.dpaUrl} />
          )}
        </DetailGrid>
      </SubSection>

      <SubSection title="Risc + motive">
        <Badge
          bg={RISK_COLORS[record.riskCandidate].bg}
          fg={RISK_COLORS[record.riskCandidate].fg}
        >
          {RISK_CANDIDATE_LABELS[record.riskCandidate]}
        </Badge>
        <ul style={{ paddingLeft: "16px", marginTop: "8px", color: "var(--ink-muted)", fontSize: "12px" }}>
          {record.reasons.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      </SubSection>

      {record.linkedFindingIds.length > 0 && (
        <SubSection title={`Findings emise (${record.linkedFindingIds.length})`}>
          <div style={{ fontSize: "12px", color: "var(--ink-muted)" }}>
            <a
              href="/dashboard/resolve"
              style={{ color: "var(--cobalt-600)", textDecoration: "underline" }}
            >
              Deschide în „De rezolvat" →
            </a>
            <ul style={{ paddingLeft: "16px", marginTop: "6px" }}>
              {record.linkedFindingIds.map((id) => (
                <li key={id}>{id}</li>
              ))}
            </ul>
          </div>
        </SubSection>
      )}

      {record.notes && (
        <SubSection title="Note & follow-up">
          <div
            style={{
              fontSize: "12px",
              color: "var(--ink-muted)",
              whiteSpace: "pre-wrap",
              padding: "10px",
              background: "var(--surface-1)",
              borderRadius: "6px",
              border: "1px solid var(--border-soft)",
            }}
          >
            {record.notes}
          </div>
        </SubSection>
      )}

      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        <button onClick={() => setShowFollowUp(true)} style={btnSecondary}>
          <FileText size={13} /> Adaugă follow-up
        </button>
        <button onClick={onDelete} style={btnDanger}>
          <Trash2 size={13} /> Șterge
        </button>
      </div>

      {showFollowUp && (
        <FollowUpModal
          recordId={record.id}
          onClose={() => setShowFollowUp(false)}
          onDone={async () => {
            setShowFollowUp(false)
            await onRefresh()
          }}
        />
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
//   Exposure Report panel
// ────────────────────────────────────────────────────────────────────────────

function ExposureReportPanel({ records }: { records: AIDataMapRecord[] }) {
  const [busy, setBusy] = useState(false)
  const [report, setReport] = useState<AIExposureReport | null>(null)
  const [err, setErr] = useState<string | null>(null)

  async function loadLatest() {
    const res = await fetch("/api/ai-data-discovery/report")
    if (!res.ok) return
    const data = (await res.json()) as { reports: AIExposureReport[] }
    if (data.reports && data.reports.length > 0) {
      setReport(data.reports[0] ?? null)
    }
  }

  useEffect(() => {
    void loadLatest()
  }, [])

  async function generate() {
    setBusy(true)
    setErr(null)
    try {
      const res = await fetch("/api/ai-data-discovery/report", { method: "POST" })
      if (!res.ok) {
        setErr("Nu am putut genera raportul.")
        return
      }
      const data = (await res.json()) as { report: AIExposureReport }
      setReport(data.report)
    } finally {
      setBusy(false)
    }
  }

  function downloadMd() {
    if (!report) return
    const blob = new Blob([report.markdown], { type: "text/markdown;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `ai-exposure-report-${report.generatedAtISO.slice(0, 10)}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function copyMd() {
    if (!report) return
    try {
      await navigator.clipboard.writeText(report.markdown)
    } catch {
      // ignore
    }
  }

  return (
    <Section
      icon={<Eye size={16} color="#a855f7" />}
      title="AI Exposure Report"
      subtitle="Raport client-facing agregat din AI Data Map. Markdown ready pentru email / cabinet handoff."
      action={
        <button onClick={generate} disabled={busy || records.length === 0} style={btnPrimary}>
          {busy ? <Loader2 size={14} /> : <Sparkles size={14} />}
          Generează raport
        </button>
      }
    >
      {err && <ErrorBanner message={err} />}
      {report ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
              gap: "10px",
            }}
          >
            <MiniStat label="Tool-uri" value={report.scope.aiToolCount} />
            <MiniStat label="Date personale" value={report.scope.personalDataToolCount} />
            <MiniStat label="Special Art. 9" value={report.scope.specialCategoryToolCount} />
            <MiniStat label="Lipsă DPA" value={report.scope.noDpaCount} />
            <MiniStat label="Țări terțe" value={report.scope.nonEuVendorCount} />
            <MiniStat label="High-risk" value={report.scope.highRiskCandidateCount} />
            <MiniStat label="Prohibited" value={report.scope.prohibitedCandidateCount} highlight />
          </div>

          <div
            style={{
              maxHeight: "300px",
              overflowY: "auto",
              padding: "12px 14px",
              background: "var(--surface-1)",
              border: "1px solid var(--border-soft)",
              borderRadius: "8px",
              fontFamily: "ui-monospace, monospace",
              fontSize: "11px",
              color: "var(--ink-muted)",
              whiteSpace: "pre-wrap",
              lineHeight: 1.5,
            }}
          >
            {report.markdown}
          </div>

          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button onClick={downloadMd} style={btnPrimary}>
              <Download size={14} /> Descarcă .md
            </button>
            <button onClick={copyMd} style={btnSecondary}>
              <FileText size={13} /> Copy markdown
            </button>
            <span style={{ fontSize: "11px", color: "var(--ink-dim)", alignSelf: "center" }}>
              Generat: {new Date(report.generatedAtISO).toLocaleString("ro-RO")}
            </span>
          </div>
        </div>
      ) : records.length === 0 ? (
        <div style={{ fontSize: "12px", color: "var(--ink-dim)" }}>
          Adaugă tool-uri AI în Data Map înainte de a genera raportul.
        </div>
      ) : (
        <div style={{ fontSize: "12px", color: "var(--ink-dim)" }}>
          Niciun raport generat încă. Click pe „Generează raport" pentru snapshot curent.
        </div>
      )}
    </Section>
  )
}

function MiniStat({
  label,
  value,
  highlight,
}: {
  label: string
  value: number
  highlight?: boolean
}) {
  return (
    <div
      style={{
        padding: "10px 12px",
        background: highlight && value > 0 ? "rgba(248,113,113,0.18)" : "var(--surface-1)",
        border:
          "1px solid " + (highlight && value > 0 ? "rgba(248,113,113,0.4)" : "var(--border-soft)"),
        borderRadius: "6px",
      }}
    >
      <div style={{ fontSize: "10px", color: "var(--ink-dim)", textTransform: "uppercase" }}>
        {label}
      </div>
      <div
        style={{
          fontFamily: "var(--font-display-v3)",
          fontSize: "18px",
          fontWeight: 600,
          color: highlight && value > 0 ? "#f87171" : "var(--ink)",
          marginTop: "2px",
        }}
      >
        {value}
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
//   Policy Pack panel
// ────────────────────────────────────────────────────────────────────────────

function PolicyPackPanel() {
  const [pack, setPack] = useState<AIPolicyPack | null>(null)
  const [loading, setLoading] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch("/api/ai-data-discovery/policy-pack")
      if (res.ok) {
        const data = (await res.json()) as { pack: AIPolicyPack }
        setPack(data.pack)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  async function downloadTemplate(id: AIPolicyPackTemplateId) {
    const res = await fetch(`/api/ai-data-discovery/policy-pack?id=${id}`)
    if (!res.ok) return
    const text = await res.text()
    const blob = new Blob([text], { type: "text/markdown;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${id}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function downloadBundle() {
    if (!pack) return
    for (const tpl of pack.templates) {
      const blob = new Blob([tpl.markdown], { type: "text/markdown;charset=utf-8" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = tpl.fileName
      a.click()
      URL.revokeObjectURL(url)
      await new Promise((r) => setTimeout(r, 150))
    }
  }

  return (
    <Section
      icon={<Shield size={16} color="#34d399" />}
      title="AI Policy Pack"
      subtitle="5 template-uri RO parametrizate cu numele organizației. Personalizează și aprobă intern."
      action={
        <button onClick={downloadBundle} disabled={!pack} style={btnPrimary}>
          <Download size={14} /> Descarcă toate (5)
        </button>
      }
    >
      {loading ? (
        <div style={{ fontSize: "12px", color: "var(--ink-dim)" }}>Se încarcă template-urile...</div>
      ) : pack ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {pack.templates.map((tpl) => (
            <div
              key={tpl.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "10px 14px",
                background: "var(--surface-1)",
                border: "1px solid var(--border-soft)",
                borderRadius: "8px",
              }}
            >
              <div>
                <div style={{ fontSize: "13px", fontWeight: 500, color: "var(--ink)" }}>
                  {tpl.title}
                </div>
                <div style={{ fontSize: "11px", color: "var(--ink-dim)" }}>{tpl.fileName}</div>
              </div>
              <button onClick={() => downloadTemplate(tpl.id)} style={btnSecondary}>
                <Download size={12} /> Download
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </Section>
  )
}

// ────────────────────────────────────────────────────────────────────────────
//   Wizard modal (4 steps)
// ────────────────────────────────────────────────────────────────────────────

function WizardModal({ onClose, onDone }: { onClose: () => void; onDone: () => Promise<void> }) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [useCaseCategory, setUseCaseCategory] = useState<AIUseCaseCategory>("internal_copilot")
  const [toolName, setToolName] = useState("")
  const [vendor, setVendor] = useState("")
  const [deploymentMode, setDeploymentMode] = useState<AIDeploymentMode>("saas")
  const [useCaseDescription, setUseCaseDescription] = useState("")
  const [inputDataCategories, setInputDataCategories] = useState("")
  const [outputDataCategories, setOutputDataCategories] = useState("")
  const [processesPersonalData, setProcessesPersonalData] = useState(false)
  const [processesSpecialCategories, setProcessesSpecialCategories] = useState(false)
  const [childrenData, setChildrenData] = useState(false)
  const [vendorRegion, setVendorRegion] = useState<AIVendorRegion>("EU")
  const [trainingDataUsage, setTrainingDataUsage] = useState<AITrainingDataUsage>("opt_out_available")
  const [dpaSigned, setDpaSigned] = useState(false)
  const [dpaUrl, setDpaUrl] = useState("")
  const [subprocessorsDocumented, setSubprocessorsDocumented] = useState(false)
  const [notes, setNotes] = useState("")
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function handleSubmit() {
    if (!toolName.trim()) {
      setErr("Nume tool obligatoriu.")
      setStep(2)
      return
    }
    setBusy(true)
    setErr(null)
    try {
      const body: AIDataDiscoveryIntake = {
        toolName: toolName.trim(),
        vendor: vendor.trim(),
        deploymentMode,
        useCaseCategory,
        useCaseDescription: useCaseDescription.trim(),
        inputDataCategories: splitLines(inputDataCategories),
        outputDataCategories: splitLines(outputDataCategories),
        processesPersonalData,
        processesSpecialCategories,
        childrenData,
        vendorRegion,
        trainingDataUsage,
        dpaSigned,
        dpaUrl: dpaUrl.trim() || undefined,
        subprocessorsDocumented,
        notes: notes.trim() || undefined,
      }
      const res = await fetch("/api/ai-data-discovery", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string }
        setErr(j.error || "Nu am putut crea tool-ul.")
        return
      }
      await onDone()
    } finally {
      setBusy(false)
    }
  }

  return (
    <ModalShell onClose={onClose} title={`Adaugă tool AI — pas ${step}/4`}>
      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        <StepIndicator step={step} />

        {step === 1 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ fontSize: "12px", color: "var(--ink-muted)" }}>
              Alege categoria de utilizare AI (per AI Automation Library + Annex III EU AI Act).
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "8px",
              }}
            >
              {ALL_USE_CASES.map((c) => {
                const active = c === useCaseCategory
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setUseCaseCategory(c)}
                    style={{
                      padding: "10px 12px",
                      fontSize: "12px",
                      borderRadius: "8px",
                      border: "1px solid " + (active ? "var(--cobalt-600)" : "var(--border-soft)"),
                      background: active ? "rgba(96,165,250,0.14)" : "var(--surface-1)",
                      color: active ? "#60a5fa" : "var(--ink)",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    {USE_CASE_LABELS[c]}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {step === 2 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <Field label="Nume tool *">
              <input
                type="text"
                value={toolName}
                onChange={(e) => setToolName(e.target.value)}
                placeholder="ex: ChatGPT, Copilot, HireVue, Salesforce Einstein"
                style={inputStyle}
                required
              />
            </Field>
            <Field label="Vendor">
              <input
                type="text"
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                placeholder="ex: OpenAI, Microsoft, Salesforce"
                style={inputStyle}
              />
            </Field>
            <Field label="Tip deployment">
              <select
                value={deploymentMode}
                onChange={(e) => setDeploymentMode(e.target.value as AIDeploymentMode)}
                style={inputStyle}
              >
                {ALL_DEPLOYMENT_MODES.map((m) => (
                  <option key={m} value={m}>
                    {DEPLOYMENT_MODE_LABELS[m]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Descriere utilizare (detaliu intern)">
              <textarea
                value={useCaseDescription}
                onChange={(e) => setUseCaseDescription(e.target.value)}
                placeholder="ex: Screening CV-uri candidați pentru rolurile tech"
                style={{ ...inputStyle, minHeight: "60px" }}
              />
            </Field>
          </div>
        )}

        {step === 3 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <Field label="Categorii date input (1 pe linie)">
              <textarea
                value={inputDataCategories}
                onChange={(e) => setInputDataCategories(e.target.value)}
                placeholder={"chat\ncv\ncod\ndate client"}
                style={{ ...inputStyle, minHeight: "60px" }}
              />
            </Field>
            <Field label="Categorii date output (1 pe linie)">
              <textarea
                value={outputDataCategories}
                onChange={(e) => setOutputDataCategories(e.target.value)}
                placeholder={"text\nclasificare\ndecizie"}
                style={{ ...inputStyle, minHeight: "60px" }}
              />
            </Field>
            <CheckboxField
              label="Procesează date personale (nume, email, etc.)"
              checked={processesPersonalData}
              onChange={setProcessesPersonalData}
            />
            <CheckboxField
              label="Procesează categorii speciale GDPR Art. 9 (sănătate, biometric, etnic, etc.)"
              checked={processesSpecialCategories}
              onChange={setProcessesSpecialCategories}
            />
            <CheckboxField
              label="Procesează date copii (sub 16 ani)"
              checked={childrenData}
              onChange={setChildrenData}
            />
          </div>
        )}

        {step === 4 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <Field label="Vendor region">
                <select
                  value={vendorRegion}
                  onChange={(e) => setVendorRegion(e.target.value as AIVendorRegion)}
                  style={inputStyle}
                >
                  {ALL_VENDOR_REGIONS.map((r) => (
                    <option key={r} value={r}>
                      {VENDOR_REGION_LABELS[r]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Training pe date client">
                <select
                  value={trainingDataUsage}
                  onChange={(e) => setTrainingDataUsage(e.target.value as AITrainingDataUsage)}
                  style={inputStyle}
                >
                  {ALL_TRAINING_USAGE.map((t) => (
                    <option key={t} value={t}>
                      {TRAINING_USAGE_LABELS[t]}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <CheckboxField label="DPA semnat" checked={dpaSigned} onChange={setDpaSigned} />
            {dpaSigned && (
              <Field label="DPA URL (opțional)">
                <input
                  type="url"
                  value={dpaUrl}
                  onChange={(e) => setDpaUrl(e.target.value)}
                  placeholder="https://vendor.com/dpa"
                  style={inputStyle}
                />
              </Field>
            )}
            <CheckboxField
              label="Subprocesori documentați (Art. 28 GDPR)"
              checked={subprocessorsDocumented}
              onChange={setSubprocessorsDocumented}
            />
            <Field label="Note (opțional)">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="ex: aprobat de DPO pe 17 mai, verificat DPF lista"
                style={{ ...inputStyle, minHeight: "60px" }}
              />
            </Field>
          </div>
        )}

        {err && (
          <div
            style={{
              padding: "8px 12px",
              fontSize: "12px",
              background: "var(--red-soft)",
              border: "1px solid rgba(248,113,113,0.2)",
              borderRadius: "6px",
              color: "#f87171",
            }}
          >
            {err}
          </div>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "8px",
            marginTop: "4px",
          }}
        >
          <button
            type="button"
            onClick={() => setStep((s) => (s > 1 ? ((s - 1) as 1 | 2 | 3 | 4) : s))}
            disabled={step === 1}
            style={{ ...btnGhost, opacity: step === 1 ? 0.5 : 1 }}
          >
            Înapoi
          </button>
          {step < 4 ? (
            <button
              type="button"
              onClick={() => setStep((s) => (s < 4 ? ((s + 1) as 1 | 2 | 3 | 4) : s))}
              style={btnPrimary}
            >
              Continuă
            </button>
          ) : (
            <button type="button" onClick={handleSubmit} disabled={busy} style={btnPrimary}>
              {busy ? <Loader2 size={14} /> : <CheckCircle2 size={14} />}
              Înregistrează tool
            </button>
          )}
        </div>
      </div>
    </ModalShell>
  )
}

function StepIndicator({ step }: { step: 1 | 2 | 3 | 4 }) {
  const labels = ["Categorie", "Detalii tool", "Date flow", "Governance"]
  return (
    <div style={{ display: "flex", gap: "8px", marginBottom: "4px" }}>
      {labels.map((l, i) => {
        const num = (i + 1) as 1 | 2 | 3 | 4
        const active = num === step
        const done = num < step
        return (
          <div
            key={l}
            style={{
              flex: 1,
              padding: "6px 8px",
              fontSize: "11px",
              fontWeight: 500,
              textAlign: "center",
              borderRadius: "6px",
              background: active
                ? "rgba(96,165,250,0.14)"
                : done
                  ? "rgba(52,211,153,0.12)"
                  : "var(--surface-2)",
              color: active ? "#60a5fa" : done ? "#34d399" : "var(--ink-dim)",
              border: "1px solid " + (active ? "var(--cobalt-600)" : "var(--border-soft)"),
            }}
          >
            {num}. {l}
          </div>
        )
      })}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
//   Follow-up modal
// ────────────────────────────────────────────────────────────────────────────

function FollowUpModal({
  recordId,
  onClose,
  onDone,
}: {
  recordId: string
  onClose: () => void
  onDone: () => Promise<void>
}) {
  const [note, setNote] = useState("")
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function handleSubmit() {
    if (!note.trim()) {
      setErr("Nota este obligatorie.")
      return
    }
    setBusy(true)
    setErr(null)
    try {
      const res = await fetch("/api/ai-data-discovery/follow-up", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: recordId, note: note.trim() }),
      })
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string }
        setErr(j.error || "Nu am putut adăuga follow-up.")
        return
      }
      await onDone()
    } finally {
      setBusy(false)
    }
  }

  return (
    <ModalShell onClose={onClose} title="Adaugă follow-up note">
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <Field label="Notă *">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="ex: Solicitat DPA de la OpenAI pe 17 mai 2026; aștept răspuns."
            style={{ ...inputStyle, minHeight: "100px" }}
          />
        </Field>
        {err && (
          <div style={{ fontSize: "12px", color: "#f87171" }}>{err}</div>
        )}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
          <button onClick={onClose} style={btnGhost}>
            Anulează
          </button>
          <button onClick={handleSubmit} disabled={busy} style={btnPrimary}>
            {busy ? <Loader2 size={14} /> : <CheckCircle2 size={14} />}
            Salvează
          </button>
        </div>
      </div>
    </ModalShell>
  )
}

// ────────────────────────────────────────────────────────────────────────────
//   Building blocks
// ────────────────────────────────────────────────────────────────────────────

function Section({
  icon,
  title,
  subtitle,
  action,
  children,
}: {
  icon: React.ReactNode
  title: string
  subtitle?: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "12px",
          flexWrap: "wrap",
        }}
      >
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontFamily: "var(--font-display-v3)",
              fontSize: "16px",
              fontWeight: 600,
              color: "var(--ink)",
              letterSpacing: "-0.01em",
            }}
          >
            {icon}
            {title}
          </div>
          {subtitle && (
            <p style={{ fontSize: "12px", color: "var(--ink-muted)", marginTop: "4px", margin: 0, paddingTop: "4px" }}>
              {subtitle}
            </p>
          )}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div
        style={{
          fontSize: "11px",
          fontWeight: 600,
          color: "var(--ink-muted)",
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          marginBottom: "8px",
        }}
      >
        {title}
      </div>
      {children}
    </div>
  )
}

function DetailGrid({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "10px" }}>
      {children}
    </div>
  )
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: "11px", color: "var(--ink-dim)" }}>{label}</div>
      <div style={{ fontSize: "13px", color: "var(--ink)", marginTop: "2px", wordBreak: "break-word" }}>{value}</div>
    </div>
  )
}

function Badge({ children, bg, fg }: { children: React.ReactNode; bg: string; fg: string }) {
  return (
    <span
      style={{
        padding: "3px 9px",
        fontSize: "11px",
        fontWeight: 500,
        background: bg,
        color: fg,
        borderRadius: "999px",
        whiteSpace: "nowrap",
        display: "inline-block",
      }}
    >
      {children}
    </span>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
      <span style={{ fontSize: "11px", color: "var(--ink-dim)", fontWeight: 500 }}>{label}</span>
      {children}
    </label>
  )
}

function CheckboxField({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ cursor: "pointer" }}
      />
      <span style={{ fontSize: "12px", color: "var(--ink)" }}>{label}</span>
    </label>
  )
}

function ModalShell({
  onClose,
  title,
  children,
}: {
  onClose: () => void
  title: string
  children: React.ReactNode
}) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--surface-1)",
          border: "1px solid var(--border-soft)",
          borderRadius: "12px",
          padding: "20px",
          width: "100%",
          maxWidth: "720px",
          maxHeight: "92vh",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-display-v3)",
              fontSize: "16px",
              fontWeight: 600,
              color: "var(--ink)",
            }}
          >
            {title}
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "var(--ink-dim)",
              padding: "4px",
            }}
            aria-label="Închide"
          >
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function splitLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean)
}

// Use AlertTriangle / Eye somewhere to satisfy ts-noUnusedLocals.
void AlertTriangle

// ────────────────────────────────────────────────────────────────────────────
//   Styles
// ────────────────────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  padding: "8px 10px",
  fontSize: "13px",
  borderRadius: "6px",
  border: "1px solid var(--border-soft)",
  background: "var(--surface-2)",
  color: "var(--ink)",
  fontFamily: "inherit",
  width: "100%",
  boxSizing: "border-box",
}

const btnPrimary: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  padding: "8px 14px",
  fontSize: "13px",
  fontWeight: 500,
  borderRadius: "6px",
  border: "none",
  background: "var(--cobalt-600)",
  color: "white",
  cursor: "pointer",
}

const btnSecondary: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  padding: "6px 10px",
  fontSize: "12px",
  fontWeight: 500,
  borderRadius: "6px",
  border: "1px solid var(--border-soft)",
  background: "var(--surface-1)",
  color: "var(--ink)",
  cursor: "pointer",
}

const btnGhost: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  padding: "6px 10px",
  fontSize: "12px",
  fontWeight: 500,
  borderRadius: "6px",
  border: "1px solid transparent",
  background: "transparent",
  color: "var(--ink-muted)",
  cursor: "pointer",
}

const btnDanger: React.CSSProperties = {
  ...btnSecondary,
  color: "#f87171",
  borderColor: "rgba(248,113,113,0.3)",
}
