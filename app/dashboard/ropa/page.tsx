"use client"

/**
 * Sprint 008C — /dashboard/ropa
 *
 * RoPA / Data Map: tabel sortabil pe risc, edit modal cu toate campurile,
 * bulk import via paste (TSV/CSV), per-activitate risk badge cu tooltip,
 * banner cu summary + triggers + export json/markdown.
 *
 * Style: inline + v3 design tokens, fara shadcn / Tailwind.
 */

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Database,
  Download,
  FileText,
  Loader2,
  Plus,
  Save,
  ShieldAlert,
  Trash2,
  Upload,
  X,
} from "lucide-react"

import type {
  RopaActivityConfidence,
  RopaActivityRecord,
  RopaActivityStatus,
  RopaRiskLevel,
  RopaThirdCountryTransfer,
} from "@/lib/compliance/types"
import type { RopaSummary } from "@/lib/server/ropa-store"
import type {
  RopaActivityRiskSummary,
  RopaDataMapTriggerCandidate,
} from "@/lib/compliance/ropa-risk-engine"

// ────────────────────────────────────────────────────────────────────────────
//   Labels / colors
// ────────────────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<RopaActivityStatus, string> = {
  draft: "Schiță",
  needs_review: "Necesită revizie",
  validated: "Validată",
  stale: "Veche",
}

const STATUS_COLORS: Record<RopaActivityStatus, { bg: string; fg: string }> = {
  draft: { bg: "rgba(148,163,184,0.16)", fg: "#94a3b8" },
  needs_review: { bg: "rgba(251,146,60,0.16)", fg: "#fb923c" },
  validated: { bg: "rgba(52,211,153,0.14)", fg: "#34d399" },
  stale: { bg: "rgba(248,113,113,0.16)", fg: "#f87171" },
}

const RISK_LABELS: Record<RopaRiskLevel, string> = {
  low: "Scăzut",
  medium: "Mediu",
  high: "Înalt",
}

const RISK_COLORS: Record<RopaRiskLevel, { bg: string; fg: string }> = {
  low: { bg: "rgba(96,165,250,0.12)", fg: "#60a5fa" },
  medium: { bg: "rgba(251,191,36,0.14)", fg: "#fbbf24" },
  high: { bg: "rgba(248,113,113,0.18)", fg: "#f87171" },
}

const CONFIDENCE_LABELS: Record<RopaActivityConfidence, string> = {
  client_claim: "Declarat de client",
  dpo_confirmed: "Confirmat DPO",
  document_verified: "Verificat document",
}

type ListResponse = {
  activities: RopaActivityRecord[]
  summary: RopaSummary
  triggers: RopaDataMapTriggerCandidate[]
  activityRisks: RopaActivityRiskSummary[]
}

// ────────────────────────────────────────────────────────────────────────────
//   Page
// ────────────────────────────────────────────────────────────────────────────

export default function RopaPage() {
  const [data, setData] = useState<ListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [riskFilter, setRiskFilter] = useState<"all" | RopaRiskLevel>("all")
  const [editing, setEditing] = useState<RopaActivityRecord | null>(null)
  const [creating, setCreating] = useState(false)
  const [importing, setImporting] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/ropa")
      if (!res.ok) {
        setError("Nu am putut încărca RoPA.")
        return
      }
      setData((await res.json()) as ListResponse)
      setError(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const activities = data?.activities ?? []
  const risksById = useMemo(() => {
    const map = new Map<string, RopaActivityRiskSummary>()
    for (const r of data?.activityRisks ?? []) map.set(r.activityId, r)
    return map
  }, [data?.activityRisks])

  const filtered = useMemo(() => {
    const list = [...activities].sort((a, b) => {
      const rankA = a.riskLevel === "high" ? 0 : a.riskLevel === "medium" ? 1 : 2
      const rankB = b.riskLevel === "high" ? 0 : b.riskLevel === "medium" ? 1 : 2
      if (rankA !== rankB) return rankA - rankB
      return (b.riskScore ?? 0) - (a.riskScore ?? 0)
    })
    if (riskFilter === "all") return list
    return list.filter((a) => (a.riskLevel ?? "low") === riskFilter)
  }, [activities, riskFilter])

  async function handleDelete(id: string) {
    if (!confirm("Ștergi activitatea? Acțiunea este permanentă și va apărea în audit trail.")) return
    const res = await fetch(`/api/ropa/${id}`, { method: "DELETE" })
    if (res.ok) await load()
  }

  async function handleSave(activity: Partial<RopaActivityRecord>) {
    const method = activity.id ? "PATCH" : "POST"
    const url = activity.id ? `/api/ropa/${activity.id}` : "/api/ropa"
    const res = await fetch(url, {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(activity),
    })
    if (!res.ok) {
      const d = await res.json().catch(() => ({ error: "Eroare" }))
      throw new Error(d.error || "Nu am putut salva.")
    }
    setEditing(null)
    setCreating(false)
    await load()
  }

  function handleExport(format: "json" | "md") {
    const url = format === "md" ? "/api/ropa/export?format=md" : "/api/ropa/export"
    window.open(url, "_blank")
  }

  return (
    <div className="cr-page cr-page--full cr-stack">
      <div className="cr-hero">
        <div className="cr-hero__copy">
          <span className="cr-eyebrow">Conformitate GDPR</span>
          <h1 className="cr-title">Hartă date · RoPA</h1>
          <p className="cr-subtitle">
          GDPR Art. 30 · Legea 190/2018 · Motor risc + findings + discovery triggers · Export Audit Pack
          </p>
        </div>
      </div>

      <SummaryStats summary={data?.summary ?? null} />

      {error && (
        <div className="cr-alert cr-alert--danger">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {data?.triggers && data.triggers.length > 0 && (
        <TriggersBanner triggers={data.triggers} />
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
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {(["all", "high", "medium", "low"] as const).map((key) => (
            <button
              key={key}
              onClick={() => setRiskFilter(key)}
              className={`cr-filter-chip ${riskFilter === key ? "is-active" : ""}`}
            >
              {key === "all" ? "Toate" : RISK_LABELS[key]}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button onClick={() => handleExport("json")} className="cr-btn cr-btn--secondary cr-btn--sm">
            <Download size={13} /> Export JSON
          </button>
          <button onClick={() => handleExport("md")} className="cr-btn cr-btn--secondary cr-btn--sm">
            <FileText size={13} /> Export Markdown
          </button>
          <button onClick={() => setImporting(true)} className="cr-btn cr-btn--secondary cr-btn--sm">
            <Upload size={13} /> Import bulk
          </button>
          <button onClick={() => setCreating(true)} className="cr-btn cr-btn--primary cr-btn--sm">
            <Plus size={14} /> Activitate nouă
          </button>
        </div>
      </div>

      {(creating || editing) && (
        <EditModal
          initial={editing}
          onClose={() => {
            setEditing(null)
            setCreating(false)
          }}
          onSave={handleSave}
        />
      )}

      {importing && <ImportModal onClose={() => setImporting(false)} onDone={async () => {
        setImporting(false)
        await load()
      }} />}

      {loading ? (
        <div style={{ fontSize: "13px", color: "var(--ink-dim)", padding: "24px 0" }}>
          Se încarcă RoPA...
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState onCreate={() => setCreating(true)} onImport={() => setImporting(true)} />
      ) : (
        <ActivityTable
          activities={filtered}
          risksById={risksById}
          onEdit={(a) => setEditing(a)}
          onDelete={handleDelete}
        />
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
//   SummaryStats
// ────────────────────────────────────────────────────────────────────────────

function SummaryStats({ summary }: { summary: RopaSummary | null }) {
  const items = [
    { label: "Total activități", value: summary?.total ?? 0, color: "var(--ink)" },
    { label: "Risc înalt", value: summary?.highRisk ?? 0, color: "#f87171" },
    { label: "Risc mediu", value: summary?.mediumRisk ?? 0, color: "#fbbf24" },
    { label: "Fără temei juridic", value: summary?.missingLegalBasis ?? 0, color: "#fb923c" },
    { label: "Fără retenție", value: summary?.missingRetention ?? 0, color: "#fb923c" },
    { label: "DPIA triggers", value: summary?.dpiaTriggers ?? 0, color: "#a855f7" },
    { label: "Vendor review", value: summary?.vendorReviewTriggers ?? 0, color: "#60a5fa" },
    { label: "Scor mediu", value: `${summary?.riskScoreAverage ?? 0}/100`, color: "var(--ink)" },
  ]
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(155px, 1fr))",
        gap: "8px",
      }}
    >
      {items.map((it) => (
        <div
          key={it.label}
          style={{
            background: "var(--surface-1)",
            border: "1px solid var(--border-soft)",
            borderRadius: "10px",
            padding: "12px 14px",
          }}
        >
          <div style={{ fontSize: "10px", color: "var(--ink-dim)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            {it.label}
          </div>
          <div
            style={{
              fontFamily: "var(--font-display-v3)",
              fontSize: "19px",
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
//   TriggersBanner
// ────────────────────────────────────────────────────────────────────────────

function TriggersBanner({ triggers }: { triggers: RopaDataMapTriggerCandidate[] }) {
  return (
    <div
      style={{
        background: "var(--amber-soft)",
        border: "1px solid rgba(251,146,60,0.25)",
        borderRadius: "10px",
        padding: "12px 14px",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#fb923c", fontWeight: 500 }}>
        <ShieldAlert size={15} />
        {triggers.length} discovery trigger{triggers.length === 1 ? "" : "-uri"} active din RoPA — verifică în cockpit-ul de findings
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
        {triggers.slice(0, 6).map((t) => (
          <span
            key={t.id}
            style={{
              fontSize: "11px",
              padding: "3px 9px",
              borderRadius: "999px",
              background: "var(--surface-1)",
              color: "var(--ink-muted)",
              border: "1px solid var(--border-soft)",
            }}
            title={t.reason}
          >
            {t.label}
          </span>
        ))}
        {triggers.length > 6 && (
          <span style={{ fontSize: "11px", color: "var(--ink-dim)" }}>+{triggers.length - 6}</span>
        )}
      </div>
      <Link
        href="/dashboard/resolve"
        style={{ fontSize: "12px", color: "#fb923c", fontWeight: 500, textDecoration: "underline" }}
      >
        Deschide cockpit de risc-uri →
      </Link>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
//   ActivityTable
// ────────────────────────────────────────────────────────────────────────────

function ActivityTable({
  activities,
  risksById,
  onEdit,
  onDelete,
}: {
  activities: RopaActivityRecord[]
  risksById: Map<string, RopaActivityRiskSummary>
  onEdit: (activity: RopaActivityRecord) => void
  onDelete: (id: string) => void
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {activities.map((a) => {
        const risk = risksById.get(a.id)
        const riskLevel: RopaRiskLevel = a.riskLevel ?? "low"
        const riskColor = RISK_COLORS[riskLevel]
        const statusColor = STATUS_COLORS[a.status]
        const isExpanded = expandedId === a.id
        return (
          <div
            key={a.id}
            style={{
              background: "var(--surface-1)",
              border: "1px solid var(--border-soft)",
              borderRadius: "10px",
              overflow: "hidden",
            }}
          >
            <button
              onClick={() => setExpandedId(isExpanded ? null : a.id)}
              style={{
                width: "100%",
                background: "transparent",
                border: "none",
                textAlign: "left",
                padding: "12px 16px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "14px",
              }}
            >
              <Database size={16} style={{ color: "var(--ink-dim)", flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "14px", fontWeight: 500, color: "var(--ink)" }}>
                  {a.activityName}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px", flexWrap: "wrap" }}>
                  <Badge bg={riskColor.bg} fg={riskColor.fg}>
                    Risc: {RISK_LABELS[riskLevel]} ({a.riskScore ?? 0}/100)
                  </Badge>
                  <Badge bg={statusColor.bg} fg={statusColor.fg}>{STATUS_LABELS[a.status]}</Badge>
                  {a.specialCategories.length > 0 && (
                    <Badge bg="rgba(248,113,113,0.15)" fg="#f87171">Date speciale</Badge>
                  )}
                  {!a.legalBasis && (
                    <Badge bg="rgba(251,146,60,0.14)" fg="#fb923c">Lipsește temei</Badge>
                  )}
                  {!a.retentionRule && (
                    <Badge bg="rgba(251,146,60,0.14)" fg="#fb923c">Lipsește retenție</Badge>
                  )}
                  {a.linkedAISystemIds && a.linkedAISystemIds.length > 0 && (
                    <Badge bg="rgba(168,85,247,0.14)" fg="#a855f7">{a.linkedAISystemIds.length} sisteme AI</Badge>
                  )}
                  {a.department && (
                    <span style={{ fontSize: "11px", color: "var(--ink-dim)" }}>{a.department}</span>
                  )}
                </div>
              </div>
              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {isExpanded && (
              <div
                style={{
                  padding: "16px",
                  borderTop: "1px solid var(--border-soft)",
                  background: "var(--surface-2)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "14px",
                }}
              >
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                  <DetailField label="Scop">{a.purpose || "—"}</DetailField>
                  <DetailField label="Temei juridic">{a.legalBasis || "—"}</DetailField>
                  <DetailField label="Owner">{a.ownerName || "—"}</DetailField>
                  <DetailField label="Confidence">{CONFIDENCE_LABELS[a.confidence]}</DetailField>
                  <DetailField label="Persoane vizate">
                    {a.dataSubjects.length ? a.dataSubjects.join(", ") : "—"}
                  </DetailField>
                  <DetailField label="Categorii date">
                    {a.dataCategories.length ? a.dataCategories.join(", ") : "—"}
                  </DetailField>
                  {a.specialCategories.length > 0 && (
                    <DetailField label="Date speciale">{a.specialCategories.join(", ")}</DetailField>
                  )}
                  {a.article9Condition && (
                    <DetailField label="Condiție Art. 9">{a.article9Condition}</DetailField>
                  )}
                  <DetailField label="Destinatari">
                    {a.recipients.length ? a.recipients.join(", ") : "—"}
                  </DetailField>
                  <DetailField label="Procesatori">
                    {a.processors.length ? a.processors.join(", ") : "—"}
                  </DetailField>
                  <DetailField label="Sisteme">
                    {a.systems.length ? a.systems.join(", ") : "—"}
                  </DetailField>
                  <DetailField label="Retenție">{a.retentionRule || "—"}</DetailField>
                  <DetailField label="Măsuri securitate">
                    {a.securityMeasures.length ? a.securityMeasures.join(", ") : "—"}
                  </DetailField>
                </div>

                {a.thirdCountryTransfers.length > 0 && (
                  <DetailField label="Transferuri internaționale">
                    {a.thirdCountryTransfers
                      .map((t) => `${t.country}${t.mechanism ? ` (${t.mechanism})` : " (mecanism lipsă)"}`)
                      .join(", ")}
                  </DetailField>
                )}

                {risk && risk.reasons.length > 0 && (
                  <DetailField label={`Motive risc (${risk.reasons.length})`}>
                    <ul style={{ margin: 0, paddingLeft: "18px", lineHeight: "1.7" }}>
                      {risk.reasons.map((r, i) => (
                        <li key={i} style={{ fontSize: "12px", color: "var(--ink-muted)" }}>{r}</li>
                      ))}
                    </ul>
                  </DetailField>
                )}

                {risk && risk.findingIds.length > 0 && (
                  <div
                    style={{
                      display: "flex",
                      gap: "8px",
                      padding: "8px 12px",
                      background: "var(--amber-soft)",
                      border: "1px solid rgba(251,146,60,0.25)",
                      borderRadius: "6px",
                      fontSize: "11px",
                      color: "#fb923c",
                      alignItems: "center",
                    }}
                  >
                    <ShieldAlert size={13} />
                    <span style={{ flex: 1 }}>
                      Activitatea a generat {risk.findingIds.length} finding GDPR — vezi cockpit.
                    </span>
                    <Link href="/dashboard/resolve" style={{ color: "#fb923c", fontWeight: 500 }}>
                      Vezi →
                    </Link>
                  </div>
                )}

                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <button onClick={() => onEdit(a)} className="cr-btn cr-btn--secondary cr-btn--sm">
                    <Save size={13} /> Editează
                  </button>
                  <button onClick={() => onDelete(a.id)} className="cr-btn cr-btn--danger cr-btn--sm">
                    <Trash2 size={13} /> Șterge
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })}
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
      <div style={{ fontSize: "12px", color: "var(--ink)" }}>{children}</div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
//   EmptyState
// ────────────────────────────────────────────────────────────────────────────

function EmptyState({ onCreate, onImport }: { onCreate: () => void; onImport: () => void }) {
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
      <Database size={28} style={{ color: "var(--ink-dim)", margin: "0 auto 12px" }} />
      <div style={{ fontSize: "14px", fontWeight: 500, color: "var(--ink)", marginBottom: "4px" }}>
        Nicio activitate de prelucrare înregistrată
      </div>
      <div style={{ fontSize: "12px", color: "var(--ink-muted)", marginBottom: "16px" }}>
        Construiește registrul Art. 30 al organizației — fie manual, fie prin import bulk din tabelul tău existent (CSV/TSV).
      </div>
      <div style={{ display: "flex", justifyContent: "center", gap: "8px" }}>
        <button onClick={onCreate} className="cr-btn cr-btn--primary cr-btn--sm">
          <Plus size={14} /> Activitate nouă
        </button>
        <button onClick={onImport} className="cr-btn cr-btn--secondary cr-btn--sm">
          <Upload size={13} /> Import bulk
        </button>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
//   EditModal
// ────────────────────────────────────────────────────────────────────────────

function EditModal({
  initial,
  onClose,
  onSave,
}: {
  initial: RopaActivityRecord | null
  onClose: () => void
  onSave: (a: Partial<RopaActivityRecord>) => Promise<void>
}) {
  const [form, setForm] = useState<Partial<RopaActivityRecord>>(() => initial ?? { activityName: "" })
  const [transfers, setTransfers] = useState<RopaThirdCountryTransfer[]>(
    initial?.thirdCountryTransfers ?? [],
  )
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  function f<K extends keyof RopaActivityRecord>(key: K, value: RopaActivityRecord[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function flist(key: keyof RopaActivityRecord, text: string) {
    f(key, text.split(/[\n,;]+/).map((x) => x.trim()).filter(Boolean) as never)
  }

  async function submit() {
    setErr(null)
    if (!form.activityName?.trim()) {
      setErr("Numele activității este obligatoriu.")
      return
    }
    setSubmitting(true)
    try {
      await onSave({ ...form, thirdCountryTransfers: transfers })
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
              {initial ? "Editează activitate RoPA" : "Activitate RoPA nouă"}
            </div>
            <div style={{ fontSize: "11px", color: "var(--ink-dim)", marginTop: "2px" }}>
              Toate câmpurile Art. 30(1) + linkuri AI · Risc-ul se calculează după salvare.
            </div>
          </div>
          <button onClick={onClose} className="cr-btn cr-btn--icon cr-btn--sm"><X size={16} /></button>
        </div>

        {err && (
          <div style={{ padding: "8px 12px", background: "var(--red-soft)", color: "#f87171", borderRadius: "6px", fontSize: "12px" }}>
            {err}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          <Field label="Nume activitate *">
            <input value={form.activityName ?? ""} onChange={(e) => f("activityName", e.target.value)} className="cr-input" />
          </Field>
          <Field label="Departament">
            <input value={form.department ?? ""} onChange={(e) => f("department", e.target.value)} className="cr-input" />
          </Field>
          <Field label="Owner">
            <input value={form.ownerName ?? ""} onChange={(e) => f("ownerName", e.target.value)} className="cr-input" />
          </Field>
          <Field label="Status">
            <select value={form.status ?? "draft"} onChange={(e) => f("status", e.target.value as RopaActivityStatus)} className="cr-input">
              <option value="draft">Schiță</option>
              <option value="needs_review">Necesită revizie</option>
              <option value="validated">Validată</option>
              <option value="stale">Veche</option>
            </select>
          </Field>
        </div>

        <Field label="Scop prelucrare">
          <textarea
            className="cr-input cr-textarea"
            value={form.purpose ?? ""}
            onChange={(e) => f("purpose", e.target.value)}
            rows={2}
            style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
          />
        </Field>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          <Field label="Temei juridic (Art. 6)">
            <input value={form.legalBasis ?? ""} onChange={(e) => f("legalBasis", e.target.value)} placeholder="6(1)(a)/(b)/..." className="cr-input" />
          </Field>
          <Field label="Condiție Art. 9 (date speciale)">
            <input value={form.article9Condition ?? ""} onChange={(e) => f("article9Condition", e.target.value)} placeholder="9(2)(a)/(b)/..." className="cr-input" />
          </Field>
        </div>

        <Field label="Persoane vizate (CSV/newline)">
          <textarea
            className="cr-input cr-textarea"
            value={(form.dataSubjects ?? []).join("\n")}
            onChange={(e) => flist("dataSubjects", e.target.value)}
            rows={2}
            style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
          />
        </Field>

        <Field label="Categorii de date (CSV/newline)">
          <textarea
            className="cr-input cr-textarea"
            value={(form.dataCategories ?? []).join("\n")}
            onChange={(e) => flist("dataCategories", e.target.value)}
            rows={2}
            style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
            placeholder="Ex: Email, Telefon, CNP, Date de sănătate"
          />
        </Field>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          <Field label="Destinatari (CSV)">
            <textarea
            className="cr-input cr-textarea"
              value={(form.recipients ?? []).join("\n")}
              onChange={(e) => flist("recipients", e.target.value)}
              rows={2}
              style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
            />
          </Field>
          <Field label="Procesatori / vendori (CSV)">
            <textarea
            className="cr-input cr-textarea"
              value={(form.processors ?? []).join("\n")}
              onChange={(e) => flist("processors", e.target.value)}
              rows={2}
              style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
            />
          </Field>
        </div>

        <Field label="Sisteme / tool-uri (CSV)">
          <textarea
            className="cr-input cr-textarea"
            value={(form.systems ?? []).join("\n")}
            onChange={(e) => flist("systems", e.target.value)}
            rows={2}
            style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
          />
        </Field>

        <Field label="Sisteme AI legate (ID-uri, CSV)">
          <input
            value={(form.linkedAISystemIds ?? []).join(", ")}
            onChange={(e) => flist("linkedAISystemIds", e.target.value)}
            placeholder="Ex: ai-sys-abc123, ai-sys-def456"
            className="cr-input"
          />
        </Field>

        <Field label="Transferuri internaționale (țară + mecanism)">
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {transfers.map((t, i) => (
              <div key={i} style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                <input
                  className="cr-input"
                  value={t.country}
                  onChange={(e) => {
                    const next = [...transfers]
                    next[i] = { ...next[i], country: e.target.value }
                    setTransfers(next)
                  }}
                  placeholder="Țară (ex: SUA)"
                  style={{ ...inputStyle, flex: 1 }}
                />
                <input
                  className="cr-input"
                  value={t.mechanism ?? ""}
                  onChange={(e) => {
                    const next = [...transfers]
                    next[i] = { ...next[i], mechanism: e.target.value }
                    setTransfers(next)
                  }}
                  placeholder="Mecanism (SCC, adequacy, DPF...)"
                  style={{ ...inputStyle, flex: 1 }}
                />
                <button
                  onClick={() => setTransfers(transfers.filter((_, idx) => idx !== i))}
                  className="cr-btn cr-btn--icon cr-btn--sm"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
            <button
              onClick={() => setTransfers([...transfers, { country: "", mechanism: "" }])}
              className="cr-btn cr-btn--secondary cr-btn--sm"
              style={{ alignSelf: "flex-start" }}
            >
              <Plus size={12} /> Adaugă transfer
            </button>
          </div>
        </Field>

        <Field label="Retenție">
          <input
            value={form.retentionRule ?? ""}
            onChange={(e) => f("retentionRule", e.target.value)}
            placeholder="Ex: 5 ani după ultima interacțiune"
            className="cr-input"
          />
        </Field>

        <Field label="Măsuri tehnice/organizatorice (CSV)">
          <textarea
            className="cr-input cr-textarea"
            value={(form.securityMeasures ?? []).join("\n")}
            onChange={(e) => flist("securityMeasures", e.target.value)}
            rows={2}
            style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
            placeholder="Ex: RBAC, MFA, Encryption la rest, Logging, Backup"
          />
        </Field>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
          <button onClick={onClose} className="cr-btn cr-btn--secondary cr-btn--sm">Anulează</button>
          <button onClick={submit} disabled={submitting} className="cr-btn cr-btn--primary cr-btn--sm">
            {submitting ? <Loader2 size={12} className="spin" /> : <Save size={13} />}
            Salvează
          </button>
        </div>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
//   ImportModal — TSV/CSV paste
// ────────────────────────────────────────────────────────────────────────────

function ImportModal({ onClose, onDone }: { onClose: () => void; onDone: () => Promise<void> }) {
  const [text, setText] = useState("")
  const [parsed, setParsed] = useState<Array<Partial<RopaActivityRecord>>>([])
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  function parse() {
    setErr(null)
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
    if (lines.length === 0) {
      setErr("Conținut gol.")
      setParsed([])
      return
    }
    // First line = header. Detect TSV/CSV.
    const sep = lines[0].includes("\t") ? "\t" : ","
    const headers = lines[0].split(sep).map((h) => h.trim().toLowerCase())
    const out: Array<Partial<RopaActivityRecord>> = []
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(sep)
      const row: Record<string, string> = {}
      for (let j = 0; j < headers.length; j++) {
        row[headers[j]] = (cols[j] ?? "").trim()
      }
      const activityName = row.activityname || row.activity || row["nume activitate"] || row.name
      if (!activityName) continue
      out.push({
        activityName,
        purpose: row.purpose || row.scop || undefined,
        department: row.department || row.departament || undefined,
        ownerName: row.owner || row.ownername || undefined,
        legalBasis: row.legalbasis || row["temei juridic"] || row.legal || undefined,
        retentionRule: row.retention || row.retentionrule || row["retentie"] || undefined,
        dataCategories: splitField(row.datacategories || row["categorii date"]),
        dataSubjects: splitField(row.datasubjects || row["persoane vizate"]),
        recipients: splitField(row.recipients || row.destinatari),
        processors: splitField(row.processors || row.procesatori),
        systems: splitField(row.systems || row.sisteme),
        securityMeasures: splitField(row.security || row.securitymeasures || row["masuri securitate"]),
      })
    }
    setParsed(out)
  }

  function splitField(value: string | undefined): string[] {
    if (!value) return []
    return value.split(/[;|]+/).map((s) => s.trim()).filter(Boolean)
  }

  async function submit() {
    if (parsed.length === 0) {
      setErr('Nimic de importat — apasă "Pre-procesează" mai întâi.')
      return
    }
    setSubmitting(true)
    setErr(null)
    try {
      const res = await fetch("/api/ropa", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ activities: parsed }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({ error: "Eroare" }))
        throw new Error(d.error || "Nu am putut importa.")
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
      <div style={{ ...modalCard, maxWidth: "720px" }}>
        <div style={modalHeader}>
          <div>
            <div style={{ fontSize: "16px", fontWeight: 600, color: "var(--ink)" }}>
              Import bulk RoPA (TSV/CSV)
            </div>
            <div style={{ fontSize: "11px", color: "var(--ink-dim)", marginTop: "2px" }}>
              Lipește din Excel/Google Sheets. Header obligatoriu pe primul rând.
            </div>
          </div>
          <button onClick={onClose} className="cr-btn cr-btn--icon cr-btn--sm"><X size={16} /></button>
        </div>

        <div style={{ fontSize: "11px", color: "var(--ink-dim)", padding: "8px 10px", background: "var(--surface-2)", borderRadius: "6px" }}>
          Coloane recunoscute (ro/en):{" "}
          <code>activityName / "nume activitate"</code>, <code>purpose / scop</code>,{" "}
          <code>department / departament</code>, <code>owner</code>, <code>legalBasis / "temei juridic"</code>,{" "}
          <code>retention / retentie</code>, <code>dataCategories / "categorii date"</code> (separate cu „;"),{" "}
          <code>dataSubjects / "persoane vizate"</code>, <code>recipients / destinatari</code>,{" "}
          <code>processors / procesatori</code>, <code>systems / sisteme</code>,{" "}
          <code>securityMeasures / "masuri securitate"</code>.
        </div>

        {err && (
          <div style={{ padding: "8px 12px", background: "var(--red-soft)", color: "#f87171", borderRadius: "6px", fontSize: "12px" }}>
            {err}
          </div>
        )}

        <textarea
            className="cr-input cr-textarea"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={10}
          placeholder={"activityName\tpurpose\tlegalBasis\tdataCategories\nCRM leads\tGestiune leads\t6(1)(f)\tEmail;Telefon"}
          style={{ ...inputStyle, fontFamily: "ui-monospace, monospace", fontSize: "11px", resize: "vertical" }}
        />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
          <div style={{ fontSize: "12px", color: "var(--ink-muted)" }}>
            {parsed.length > 0 ? `${parsed.length} activități recunoscute` : "—"}
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={parse} className="cr-btn cr-btn--secondary cr-btn--sm">Pre-procesează</button>
            <button onClick={submit} disabled={submitting || parsed.length === 0} className="cr-btn cr-btn--primary cr-btn--sm">
              {submitting ? <Loader2 size={12} className="spin" /> : <Upload size={13} />}
              Importă ({parsed.length})
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
//   Form Field helper
// ────────────────────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
      <span style={{ fontSize: "11px", color: "var(--ink-dim)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
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
