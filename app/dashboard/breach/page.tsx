"use client"

/**
 * Sprint 008D — /dashboard/breach
 *
 * Pagina mature breach GDPR: lista + stats + filter tabs + create modal +
 * countdown 72h per rand + detail expand cu workflow status (notify ANSPDCP,
 * notify subjects, skip) + narrative copy + export markdown.
 *
 * Style: inline + v3 design tokens, fara shadcn/Tailwind.
 * Reference: app/dashboard/dpia/page.tsx + app/dashboard/dsar/page.tsx.
 */

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  Download,
  FileText,
  Loader2,
  Mail,
  Plus,
  ShieldAlert,
  Trash2,
  X,
} from "lucide-react"

import type {
  BreachCause,
  BreachDataCategory,
  BreachRecord,
  BreachSeverity,
  BreachStatus,
} from "@/lib/compliance/types"
import type { BreachSummary } from "@/lib/server/breach-store"

// ────────────────────────────────────────────────────────────────────────────
//   Labels
// ────────────────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<BreachStatus, string> = {
  draft: "Schiță",
  assessing: "În evaluare",
  anspdcp_required: "ANSPDCP necesar",
  anspdcp_notified: "ANSPDCP trimis",
  subjects_required: "Notificare persoane necesară",
  subjects_notified: "Persoane notificate",
  closed: "Închis",
  no_notification_required: "Documentat: fără notificare",
}

const STATUS_COLORS: Record<BreachStatus, { bg: string; fg: string }> = {
  draft: { bg: "rgba(148,163,184,0.16)", fg: "#94a3b8" },
  assessing: { bg: "rgba(96,165,250,0.14)", fg: "#60a5fa" },
  anspdcp_required: { bg: "rgba(248,113,113,0.18)", fg: "#f87171" },
  anspdcp_notified: { bg: "rgba(168,85,247,0.14)", fg: "#a855f7" },
  subjects_required: { bg: "rgba(251,146,60,0.16)", fg: "#fb923c" },
  subjects_notified: { bg: "rgba(52,211,153,0.14)", fg: "#34d399" },
  closed: { bg: "rgba(52,211,153,0.18)", fg: "#10b981" },
  no_notification_required: { bg: "rgba(148,163,184,0.12)", fg: "#94a3b8" },
}

const SEVERITY_LABELS: Record<BreachSeverity, string> = {
  low: "Scăzut",
  medium: "Mediu",
  high: "Înalt",
  critical: "Critic",
}

const SEVERITY_COLORS: Record<BreachSeverity, { bg: string; fg: string }> = {
  low: { bg: "rgba(96,165,250,0.12)", fg: "#60a5fa" },
  medium: { bg: "rgba(251,191,36,0.14)", fg: "#fbbf24" },
  high: { bg: "rgba(251,146,60,0.16)", fg: "#fb923c" },
  critical: { bg: "rgba(248,113,113,0.18)", fg: "#f87171" },
}

const CAUSE_LABELS: Record<BreachCause, string> = {
  cyberattack: "Atac cibernetic",
  insider_malicious: "Insider rău-intenționat",
  insider_accidental: "Eroare angajat",
  lost_device: "Dispozitiv pierdut/furat",
  misconfiguration: "Configurație incorectă",
  third_party: "Furnizor / subprocesator",
  physical: "Intruziune fizică",
  ai_system: "Sistem AI",
  other: "Altă cauză",
}

const DATA_CATEGORY_LABELS: Record<BreachDataCategory, string> = {
  identification: "Identificare (nume, CNP, CI)",
  contact: "Contact (email, telefon, adresă)",
  financial: "Financiare (cont, card, salariu)",
  special_health: "Sănătate (Art. 9)",
  special_biometric: "Biometrice (Art. 9)",
  special_genetic: "Genetice (Art. 9)",
  special_political: "Politice (Art. 9)",
  special_religious: "Religioase (Art. 9)",
  special_sexual: "Viață sexuală (Art. 9)",
  special_criminal: "Condamnări penale (Art. 10)",
  children: "Minori",
  employee: "Angajați",
  credentials: "Credențiale / parole",
  behavioral: "Comportamentale / tracking",
  other: "Altele",
}

const ALL_CAUSES: BreachCause[] = [
  "cyberattack",
  "insider_malicious",
  "insider_accidental",
  "lost_device",
  "misconfiguration",
  "third_party",
  "physical",
  "ai_system",
  "other",
]

const ALL_DATA_CATEGORIES: BreachDataCategory[] = [
  "identification",
  "contact",
  "financial",
  "employee",
  "credentials",
  "behavioral",
  "special_health",
  "special_biometric",
  "special_genetic",
  "special_political",
  "special_religious",
  "special_sexual",
  "special_criminal",
  "children",
  "other",
]

const ALL_SEVERITIES: BreachSeverity[] = ["low", "medium", "high", "critical"]

type ListResponse = {
  records: BreachRecord[]
  summary: BreachSummary
}

// ────────────────────────────────────────────────────────────────────────────
//   Helpers
// ────────────────────────────────────────────────────────────────────────────

function deadlineLevel(
  record: BreachRecord,
  now: number,
): { hoursLeft: number; level: "ok" | "warn" | "urgent" | "expired" | "done" } {
  const submitted =
    record.anspdcpNotification?.status === "submitted" ||
    record.anspdcpNotification?.status === "acknowledged"
  if (submitted) return { hoursLeft: 0, level: "done" }
  const diff = new Date(record.deadlineISO).getTime() - now
  const hoursLeft = Math.round(diff / 3_600_000)
  if (hoursLeft <= 0) return { hoursLeft, level: "expired" }
  if (hoursLeft <= 6) return { hoursLeft, level: "urgent" }
  if (hoursLeft <= 24) return { hoursLeft, level: "warn" }
  return { hoursLeft, level: "ok" }
}

function fmtDateRO(iso?: string): string {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString("ro-RO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

// ────────────────────────────────────────────────────────────────────────────
//   Page
// ────────────────────────────────────────────────────────────────────────────

type FilterValue = "all" | BreachStatus

export default function BreachPage() {
  const [records, setRecords] = useState<BreachRecord[]>([])
  const [summary, setSummary] = useState<BreachSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterValue>("all")
  const [now, setNow] = useState(() => Date.now())

  // Refresh "now" every minute so countdown updates live
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(t)
  }, [])

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/breach")
      if (!res.ok) {
        setError("Nu am putut încărca registrul breach-urilor.")
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
    if (filter === "all") return records
    return records.filter((r) => r.status === filter)
  }, [records, filter])

  async function handleDelete(id: string) {
    if (!confirm("Ștergi acest breach? Acțiunea apare în audit trail.")) return
    const res = await fetch(`/api/breach/${id}`, { method: "DELETE" })
    if (res.ok) {
      if (expandedId === id) setExpandedId(null)
      await load()
    }
  }

  async function handleExport(id: string) {
    window.open(`/api/breach/${id}/export`, "_blank")
  }

  return (
    <div className="cr-page cr-stack">
      <div className="cr-hero">
        <div className="cr-hero__copy cr-hero__copy--icon">
          <ShieldAlert size={28} color="var(--red-700)" />
          <div>
            <span className="cr-eyebrow">Conformitate GDPR</span>
            <h1 className="cr-title">Incident date personale · 72h</h1>
            <p className="cr-subtitle">
          GDPR Art. 33 (notificare autoritate) + Art. 34 (notificare persoane vizate) · countdown 72h
          live · finding rescue auto-emis în <strong>De rezolvat</strong>
            </p>
          </div>
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
        <FilterTabs value={filter} onChange={setFilter} records={records} />
        <button onClick={() => setShowCreate(true)} className="cr-btn cr-btn--primary cr-btn--sm">
          <Plus size={14} /> Înregistrează breach
        </button>
      </div>

      {showCreate && (
        <CreateModal
          onClose={() => setShowCreate(false)}
          onDone={async () => {
            setShowCreate(false)
            await load()
          }}
        />
      )}

      {loading ? (
        <div style={{ fontSize: "13px", color: "var(--ink-dim)", padding: "24px 0" }}>
          Se încarcă registrul breach-urilor...
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState hasAny={records.length > 0} onCreate={() => setShowCreate(true)} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {filtered.map((record) => (
            <BreachRow
              key={record.id}
              record={record}
              now={now}
              expanded={expandedId === record.id}
              onToggle={() =>
                setExpandedId((prev) => (prev === record.id ? null : record.id))
              }
              onDelete={() => handleDelete(record.id)}
              onExport={() => handleExport(record.id)}
              onRefresh={load}
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

function StatsBar({ summary }: { summary: BreachSummary | null }) {
  const items = [
    { label: "Total", value: summary?.total ?? 0, color: "var(--ink)" },
    { label: "Deschise", value: summary?.open ?? 0, color: "#60a5fa" },
    { label: "ANSPDCP urgent (<24h)", value: summary?.urgentAnspdcp ?? 0, color: "#fb923c" },
    { label: "ANSPDCP depășit", value: summary?.overdueAnspdcp ?? 0, color: "#f87171" },
    { label: "Persoane de notificat", value: summary?.awaitingSubjects ?? 0, color: "#a855f7" },
    { label: "Închise", value: summary?.closed ?? 0, color: "#34d399" },
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
          <div style={{ fontSize: "11px", color: "var(--ink-dim)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
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

// ────────────────────────────────────────────────────────────────────────────
//   Filter tabs
// ────────────────────────────────────────────────────────────────────────────

function FilterTabs({
  value,
  onChange,
  records,
}: {
  value: FilterValue
  onChange: (v: FilterValue) => void
  records: BreachRecord[]
}) {
  const tabs: { value: FilterValue; label: string; count: number }[] = [
    { value: "all", label: "Toate", count: records.length },
    {
      value: "assessing",
      label: "În evaluare",
      count: records.filter((r) => r.status === "assessing").length,
    },
    {
      value: "anspdcp_required",
      label: "ANSPDCP necesar",
      count: records.filter((r) => r.status === "anspdcp_required").length,
    },
    {
      value: "anspdcp_notified",
      label: "ANSPDCP trimis",
      count: records.filter((r) => r.status === "anspdcp_notified").length,
    },
    {
      value: "subjects_required",
      label: "Persoane de notificat",
      count: records.filter((r) => r.status === "subjects_required").length,
    },
    {
      value: "closed",
      label: "Închise",
      count: records.filter(
        (r) => r.status === "closed" || r.status === "no_notification_required",
      ).length,
    },
  ]
  return (
    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
      {tabs.map((tab) => {
        const active = tab.value === value
        return (
          <button
            key={tab.value}
            onClick={() => onChange(tab.value)}
            className={`cr-filter-chip ${active ? "is-active" : ""}`}
          >
            {tab.label} · {tab.count}
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
        padding: "32px",
        background: "var(--surface-1)",
        border: "1px dashed var(--border-soft)",
        borderRadius: "10px",
        textAlign: "center",
      }}
    >
      <ShieldAlert size={28} color="#94a3b8" style={{ marginBottom: "8px" }} />
      <div style={{ fontSize: "14px", fontWeight: 500, color: "var(--ink)" }}>
        {hasAny ? "Niciun breach în filtrul curent" : "Niciun breach înregistrat"}
      </div>
      <p style={{ fontSize: "12px", color: "var(--ink-dim)", marginTop: "6px" }}>
        Înregistrează un incident de securitate a datelor pentru a porni cronometrul de 72h și a
        emite automat un finding rescue în <strong>De rezolvat</strong>.
      </p>
      <button onClick={onCreate} className="cr-btn cr-btn--primary cr-btn--sm" style={{ marginTop: "14px" }}>
        <Plus size={14} /> Înregistrează breach
      </button>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
//   Row + detail
// ────────────────────────────────────────────────────────────────────────────

function BreachRow({
  record,
  now,
  expanded,
  onToggle,
  onDelete,
  onExport,
  onRefresh,
}: {
  record: BreachRecord
  now: number
  expanded: boolean
  onToggle: () => void
  onDelete: () => void
  onExport: () => void
  onRefresh: () => Promise<void>
}) {
  const dl = deadlineLevel(record, now)
  const statusColors = STATUS_COLORS[record.status]
  const sevColors = SEVERITY_COLORS[record.severity]

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
          gridTemplateColumns: "1fr auto auto auto auto",
          gap: "12px",
          alignItems: "center",
          cursor: "pointer",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: "14px", fontWeight: 500, color: "var(--ink)", marginBottom: "3px" }}>
            {record.title}
          </div>
          <div style={{ fontSize: "11px", color: "var(--ink-dim)" }}>
            {CAUSE_LABELS[record.cause]} · descoperit {fmtDateRO(record.discoveredAtISO)}
          </div>
        </div>
        <Badge bg={sevColors.bg} fg={sevColors.fg}>
          {SEVERITY_LABELS[record.severity]}
        </Badge>
        <CountdownBadge level={dl.level} hoursLeft={dl.hoursLeft} />
        <Badge bg={statusColors.bg} fg={statusColors.fg}>
          {STATUS_LABELS[record.status]}
        </Badge>
        {expanded ? <ChevronUp size={16} color="var(--ink-muted)" /> : <ChevronDown size={16} color="var(--ink-muted)" />}
      </div>

      {expanded && (
        <BreachDetail
          record={record}
          now={now}
          onDelete={onDelete}
          onExport={onExport}
          onRefresh={onRefresh}
        />
      )}
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
      }}
    >
      {children}
    </span>
  )
}

function CountdownBadge({
  level,
  hoursLeft,
}: {
  level: "ok" | "warn" | "urgent" | "expired" | "done"
  hoursLeft: number
}) {
  if (level === "done") {
    return (
      <Badge bg="rgba(52,211,153,0.14)" fg="#34d399">
        <CheckCircle2 size={11} style={{ display: "inline", verticalAlign: "-2px", marginRight: "4px" }} />
        ANSPDCP trimis
      </Badge>
    )
  }
  const map: Record<"ok" | "warn" | "urgent" | "expired", { bg: string; fg: string; label: string }> = {
    ok: { bg: "rgba(52,211,153,0.14)", fg: "#34d399", label: `${hoursLeft}h rămase` },
    warn: { bg: "rgba(251,191,36,0.18)", fg: "#fbbf24", label: `${hoursLeft}h rămase` },
    urgent: { bg: "rgba(251,146,60,0.18)", fg: "#fb923c", label: `${hoursLeft}h rămase (urgent)` },
    expired: { bg: "rgba(248,113,113,0.22)", fg: "#f87171", label: `Depășit cu ${Math.abs(hoursLeft)}h` },
  }
  const c = map[level]
  return (
    <Badge bg={c.bg} fg={c.fg}>
      <Clock size={11} style={{ display: "inline", verticalAlign: "-2px", marginRight: "4px" }} />
      {c.label}
    </Badge>
  )
}

// ────────────────────────────────────────────────────────────────────────────
//   Detail (expand)
// ────────────────────────────────────────────────────────────────────────────

function BreachDetail({
  record,
  now,
  onDelete,
  onExport,
  onRefresh,
}: {
  record: BreachRecord
  now: number
  onDelete: () => void
  onExport: () => void
  onRefresh: () => Promise<void>
}) {
  const [showAnspdcp, setShowAnspdcp] = useState(false)
  const [showSubjects, setShowSubjects] = useState(false)

  const dl = deadlineLevel(record, now)
  const anspdcpDone =
    record.anspdcpNotification?.status === "submitted" ||
    record.anspdcpNotification?.status === "acknowledged"
  const subjectsDone = Boolean(record.subjectNotification?.sentAtISO)

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
      {/* Description */}
      <Section title="Descriere incident">
        <div style={{ fontSize: "13px", color: "var(--ink-muted)", lineHeight: 1.55, whiteSpace: "pre-wrap" }}>
          {record.description}
        </div>
      </Section>

      {/* Scope */}
      <Section title="Scope & impact">
        <Grid>
          <KV
            label="Cauza"
            value={CAUSE_LABELS[record.cause]}
          />
          <KV
            label="Severitate"
            value={SEVERITY_LABELS[record.severity]}
          />
          <KV
            label="Persoane afectate (aprox.)"
            value={typeof record.affectedSubjectsCount === "number" ? String(record.affectedSubjectsCount) : "necunoscut"}
          />
          <KV
            label="Risc ridicat pt. drepturi"
            value={record.highRiskToRights ? "Da (Art. 34 aplicabil)" : "Nu"}
          />
        </Grid>
        <div style={{ marginTop: "10px" }}>
          <KVList label="Categorii date afectate" items={record.dataCategories.map((c) => DATA_CATEGORY_LABELS[c])} />
          <KVList label="Categorii persoane vizate" items={record.affectedSubjectsCategories} />
          <KVList label="Sisteme afectate" items={record.affectedSystems} />
        </div>
      </Section>

      {/* Timeline 72h */}
      <Section title="Cronologie 72h">
        <Timeline record={record} now={now} dl={dl} />
      </Section>

      {/* ANSPDCP */}
      <Section title="Notificare ANSPDCP (Art. 33)">
        {anspdcpDone ? (
          <div
            style={{
              padding: "12px",
              background: "var(--emerald-soft)",
              borderRadius: "6px",
              border: "1px solid rgba(52,211,153,0.2)",
              fontSize: "12px",
              color: "#10b981",
            }}
          >
            <CheckCircle2 size={14} style={{ display: "inline", verticalAlign: "-2px", marginRight: "6px" }} />
            Notificare trimisă pe {fmtDateRO(record.anspdcpNotification?.submittedAtISO)} ·
            nr. înregistrare <strong>{record.anspdcpNotification?.referenceNumber}</strong>
            {record.anspdcpNotification?.delayJustification && (
              <div style={{ marginTop: "6px", color: "var(--ink-muted)" }}>
                Justificare întârziere: {record.anspdcpNotification.delayJustification}
              </div>
            )}
          </div>
        ) : record.anspdcpNotificationRequired ? (
          <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: "12px", color: "var(--ink-muted)" }}>
              Status: <strong>{record.anspdcpNotification?.status ?? "draft"}</strong>. Acțiune
              necesară: trimite notificarea către ANSPDCP cu numărul de înregistrare.
            </span>
            <button onClick={() => setShowAnspdcp(true)} className="cr-btn cr-btn--secondary cr-btn--sm">
              <Mail size={13} /> Marchează ANSPDCP trimis
            </button>
          </div>
        ) : (
          <div style={{ fontSize: "12px", color: "var(--ink-muted)" }}>
            Documentat ca <strong>NEnecesar</strong>. Dacă apare informație nouă, redeschide
            evaluarea.
          </div>
        )}
      </Section>

      {/* Subjects */}
      <Section title="Notificare persoane vizate (Art. 34)">
        {subjectsDone ? (
          <div
            style={{
              padding: "12px",
              background: "var(--emerald-soft)",
              borderRadius: "6px",
              border: "1px solid rgba(52,211,153,0.2)",
              fontSize: "12px",
              color: "#10b981",
            }}
          >
            <CheckCircle2 size={14} style={{ display: "inline", verticalAlign: "-2px", marginRight: "6px" }} />
            Notificate via <strong>{record.subjectNotification?.method}</strong> pe{" "}
            {fmtDateRO(record.subjectNotification?.sentAtISO)}
          </div>
        ) : record.subjectNotificationRequired ? (
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button onClick={() => setShowSubjects(true)} className="cr-btn cr-btn--secondary cr-btn--sm">
              <Mail size={13} /> Marchează persoane notificate
            </button>
          </div>
        ) : (
          <div style={{ fontSize: "12px", color: "var(--ink-muted)" }}>
            Documentat ca <strong>NEnecesar</strong>.
            {record.subjectNotification?.skipReason && (
              <span> Motiv: {record.subjectNotification.skipReason}</span>
            )}
          </div>
        )}
      </Section>

      {/* Consequences + measures */}
      <Section title="Consecințe probabile + măsuri">
        <KV label="Consecințe" value={record.likelyConsequences || "_de completat_"} />
        <KVList label="Măsuri de limitare (containment)" items={record.containmentMeasures} />
        <KVList label="Măsuri de prevenție" items={record.preventionMeasures} />
      </Section>

      {/* Linked finding */}
      {record.linkedFindingId && (
        <Section title="Finding asociat în cockpit">
          <div style={{ fontSize: "12px", color: "var(--ink-muted)" }}>
            <FileText size={12} style={{ display: "inline", verticalAlign: "-2px", marginRight: "4px" }} />
            <a
              href={`/dashboard/resolve`}
              style={{ color: "var(--cobalt-600)", textDecoration: "underline" }}
            >
              {record.linkedFindingId}
            </a>{" "}
            (auto-emis la creare · severitate sincronizată cu deadline-ul 72h)
          </div>
        </Section>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "4px" }}>
        <button onClick={onExport} className="cr-btn cr-btn--secondary cr-btn--sm">
          <Download size={13} /> Export markdown (Audit Pack)
        </button>
        <button onClick={onDelete} className="cr-btn cr-btn--danger cr-btn--sm">
          <Trash2 size={13} /> Șterge breach
        </button>
      </div>

      {showAnspdcp && (
        <NotifyAnspdcpModal
          record={record}
          onClose={() => setShowAnspdcp(false)}
          onDone={async () => {
            setShowAnspdcp(false)
            await onRefresh()
          }}
        />
      )}
      {showSubjects && (
        <NotifySubjectsModal
          record={record}
          onClose={() => setShowSubjects(false)}
          onDone={async () => {
            setShowSubjects(false)
            await onRefresh()
          }}
        />
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
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

function Grid({ children }: { children: React.ReactNode }) {
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
      <div style={{ fontSize: "13px", color: "var(--ink)", marginTop: "2px" }}>{value}</div>
    </div>
  )
}

function KVList({ label, items }: { label: string; items: string[] }) {
  return (
    <div style={{ marginTop: "8px" }}>
      <div style={{ fontSize: "11px", color: "var(--ink-dim)" }}>{label}</div>
      <div style={{ fontSize: "12px", color: "var(--ink)", marginTop: "3px" }}>
        {items.length ? items.join(", ") : <span style={{ color: "var(--ink-dim)" }}>—</span>}
      </div>
    </div>
  )
}

function Timeline({
  record,
  now,
  dl,
}: {
  record: BreachRecord
  now: number
  dl: { hoursLeft: number; level: "ok" | "warn" | "urgent" | "expired" | "done" }
}) {
  void now
  const items = [
    { label: "Descoperit", iso: record.discoveredAtISO, ok: true },
    { label: "Termen 72h", iso: record.deadlineISO, ok: dl.level === "done" || dl.level === "ok" || dl.level === "warn" },
    {
      label: "ANSPDCP trimis",
      iso: record.anspdcpNotification?.submittedAtISO,
      ok: Boolean(record.anspdcpNotification?.submittedAtISO),
    },
    {
      label: "Persoane notificate",
      iso: record.subjectNotification?.sentAtISO,
      ok: Boolean(record.subjectNotification?.sentAtISO),
    },
  ]
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px" }}>
      {items.map((it) => (
        <div
          key={it.label}
          style={{
            padding: "10px 12px",
            background: "var(--surface-1)",
            border: "1px solid var(--border-soft)",
            borderRadius: "6px",
          }}
        >
          <div style={{ fontSize: "11px", color: "var(--ink-dim)" }}>{it.label}</div>
          <div style={{ fontSize: "12px", color: it.ok ? "#34d399" : "var(--ink-muted)", marginTop: "3px" }}>
            {fmtDateRO(it.iso)}
          </div>
        </div>
      ))}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
//   Create modal
// ────────────────────────────────────────────────────────────────────────────

function CreateModal({ onClose, onDone }: { onClose: () => void; onDone: () => Promise<void> }) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [cause, setCause] = useState<BreachCause>("cyberattack")
  const [severity, setSeverity] = useState<BreachSeverity>("medium")
  const [discoveredAt, setDiscoveredAt] = useState(() => new Date().toISOString().slice(0, 16))
  const [dataCategories, setDataCategories] = useState<BreachDataCategory[]>([])
  const [affectedCount, setAffectedCount] = useState("")
  const [affectedCategoriesText, setAffectedCategoriesText] = useState("")
  const [affectedSystemsText, setAffectedSystemsText] = useState("")
  const [likelyConsequences, setLikelyConsequences] = useState("")
  const [highRiskToRights, setHighRiskToRights] = useState(false)
  const [containmentText, setContainmentText] = useState("")
  const [preventionText, setPreventionText] = useState("")
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  function toggleCategory(c: BreachDataCategory) {
    setDataCategories((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c],
    )
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    if (!title.trim() || !description.trim()) {
      setErr("Titlul și descrierea sunt obligatorii.")
      return
    }
    setBusy(true)
    setErr(null)
    try {
      const body = {
        title: title.trim(),
        description: description.trim(),
        cause,
        severity,
        discoveredAtISO: new Date(discoveredAt).toISOString(),
        dataCategories,
        affectedSubjectsCount: affectedCount ? Number(affectedCount) : undefined,
        affectedSubjectsCategories: splitLines(affectedCategoriesText),
        affectedSystems: splitLines(affectedSystemsText),
        likelyConsequences: likelyConsequences.trim() || undefined,
        highRiskToRights,
        containmentMeasures: splitLines(containmentText),
        preventionMeasures: splitLines(preventionText),
      }
      const res = await fetch("/api/breach", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string }
        setErr(j.error || "Nu am putut crea breach-ul.")
        return
      }
      await onDone()
    } finally {
      setBusy(false)
    }
  }

  return (
    <ModalShell onClose={onClose} title="Înregistrează breach GDPR">
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        <Field label="Titlu incident *">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Acces neautorizat la fileserver HR"
            className="cr-input"
            required
          />
        </Field>
        <Field label="Descriere completă *">
          <textarea
            className="cr-input cr-textarea"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ce s-a întâmplat, când și cum a fost descoperit..."
            style={{ ...inputStyle, minHeight: "80px" }}
            required
          />
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <Field label="Cauză *">
            <select value={cause} onChange={(e) => setCause(e.target.value as BreachCause)} className="cr-input">
              {ALL_CAUSES.map((c) => (
                <option key={c} value={c}>
                  {CAUSE_LABELS[c]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Severitate">
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value as BreachSeverity)}
              className="cr-input"
            >
              {ALL_SEVERITIES.map((s) => (
                <option key={s} value={s}>
                  {SEVERITY_LABELS[s]}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Descoperit la *">
          <input
            type="datetime-local"
            value={discoveredAt}
            onChange={(e) => setDiscoveredAt(e.target.value)}
            className="cr-input"
            required
          />
        </Field>
        <Field label="Categorii date afectate (selectează toate aplicabile)">
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {ALL_DATA_CATEGORIES.map((c) => {
              const active = dataCategories.includes(c)
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggleCategory(c)}
                  style={{
                    padding: "5px 10px",
                    fontSize: "11px",
                    borderRadius: "999px",
                    border: "1px solid " + (active ? "var(--cobalt-600)" : "var(--border-soft)"),
                    background: active ? "rgba(96,165,250,0.14)" : "var(--surface-1)",
                    color: active ? "#60a5fa" : "var(--ink-muted)",
                    cursor: "pointer",
                  }}
                >
                  {DATA_CATEGORY_LABELS[c]}
                </button>
              )
            })}
          </div>
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <Field label="Persoane afectate (număr aprox.)">
            <input
              type="number"
              value={affectedCount}
              onChange={(e) => setAffectedCount(e.target.value)}
              placeholder="120"
              className="cr-input"
              min={0}
            />
          </Field>
          <Field label="Categorii persoane vizate (1 pe linie)">
            <textarea
            className="cr-input cr-textarea"
              value={affectedCategoriesText}
              onChange={(e) => setAffectedCategoriesText(e.target.value)}
              placeholder={"Angajați activi\nClienți B2C"}
              style={{ ...inputStyle, minHeight: "50px" }}
            />
          </Field>
        </div>
        <Field label="Sisteme afectate (1 pe linie)">
          <textarea
            className="cr-input cr-textarea"
            value={affectedSystemsText}
            onChange={(e) => setAffectedSystemsText(e.target.value)}
            placeholder={"fileserver-hr\nActive Directory\nMailchimp"}
            style={{ ...inputStyle, minHeight: "50px" }}
          />
        </Field>
        <Field label="Consecințe probabile pentru persoanele vizate">
          <textarea
            className="cr-input cr-textarea"
            value={likelyConsequences}
            onChange={(e) => setLikelyConsequences(e.target.value)}
            placeholder="Ex: Posibilă utilizare CNP/IBAN pentru fraudă financiară..."
            style={{ ...inputStyle, minHeight: "60px" }}
          />
        </Field>
        <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "var(--ink-muted)" }}>
          <input
            type="checkbox"
            checked={highRiskToRights}
            onChange={(e) => setHighRiskToRights(e.target.checked)}
          />
          Risc ridicat pentru drepturile / libertățile persoanelor (Art. 34 aplicabil)
        </label>
        <Field label="Măsuri de limitare luate (1 pe linie)">
          <textarea
            className="cr-input cr-textarea"
            value={containmentText}
            onChange={(e) => setContainmentText(e.target.value)}
            placeholder={"Resetare parole\nIzolare server compromis"}
            style={{ ...inputStyle, minHeight: "50px" }}
          />
        </Field>
        <Field label="Măsuri preventive (1 pe linie)">
          <textarea
            className="cr-input cr-textarea"
            value={preventionText}
            onChange={(e) => setPreventionText(e.target.value)}
            placeholder={"MFA pe toate conturile\nAudit acces lunar"}
            style={{ ...inputStyle, minHeight: "50px" }}
          />
        </Field>

        {err && (
          <div style={{ fontSize: "12px", color: "#f87171", display: "flex", gap: "6px", alignItems: "center" }}>
            <AlertTriangle size={14} />
            {err}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
          <button type="button" onClick={onClose} className="cr-btn cr-btn--secondary cr-btn--sm">
            Anulează
          </button>
          <button type="submit" disabled={busy} className="cr-btn cr-btn--primary cr-btn--sm">
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Înregistrează
          </button>
        </div>
      </form>
    </ModalShell>
  )
}

// ────────────────────────────────────────────────────────────────────────────
//   Notify ANSPDCP modal
// ────────────────────────────────────────────────────────────────────────────

function NotifyAnspdcpModal({
  record,
  onClose,
  onDone,
}: {
  record: BreachRecord
  onClose: () => void
  onDone: () => Promise<void>
}) {
  const [refNum, setRefNum] = useState("")
  const [submittedAt, setSubmittedAt] = useState(() =>
    new Date().toISOString().slice(0, 16),
  )
  const [delayJust, setDelayJust] = useState("")
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [narrative, setNarrative] = useState("")

  // Lazy preview: build narrative based on what we'd send
  useEffect(() => {
    // We do NOT call API; show a static preview note instead
    setNarrative(
      `Notificare ANSPDCP pentru "${record.title}":\n\nNumăr înregistrare: ${refNum || "(de completat)"}\nTrimisă la: ${submittedAt}\n\nFolosește butonul Export markdown pentru narativa completă Art. 33(3) după salvare.`,
    )
  }, [record.title, refNum, submittedAt])

  const submittedIso = new Date(submittedAt).toISOString()
  const late = new Date(submittedIso).getTime() > new Date(record.deadlineISO).getTime()

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    if (!refNum.trim()) {
      setErr("Numărul de înregistrare ANSPDCP e obligatoriu.")
      return
    }
    if (late && !delayJust.trim()) {
      setErr("Submission depășește deadline-ul 72h — justificarea e obligatorie.")
      return
    }
    setBusy(true)
    setErr(null)
    try {
      const res = await fetch(`/api/breach/${record.id}/notify-anspdcp`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          referenceNumber: refNum.trim(),
          submittedAtISO: submittedIso,
          delayJustification: delayJust.trim() || undefined,
        }),
      })
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string }
        setErr(j.error || "Nu am putut marca notificarea.")
        return
      }
      await onDone()
    } finally {
      setBusy(false)
    }
  }

  function copyNarrative() {
    if (navigator?.clipboard) {
      void navigator.clipboard.writeText(narrative)
    }
  }

  return (
    <ModalShell onClose={onClose} title="Marchează ANSPDCP notificat (Art. 33)">
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        <Field label="Număr de înregistrare ANSPDCP *">
          <input
            type="text"
            value={refNum}
            onChange={(e) => setRefNum(e.target.value)}
            placeholder="ANSPDCP-2026-12345"
            className="cr-input"
            required
          />
        </Field>
        <Field label="Trimisă la *">
          <input
            type="datetime-local"
            value={submittedAt}
            onChange={(e) => setSubmittedAt(e.target.value)}
            className="cr-input"
            required
          />
        </Field>
        {late && (
          <div
            style={{
              padding: "10px 12px",
              background: "var(--red-soft)",
              border: "1px solid rgba(248,113,113,0.2)",
              borderRadius: "6px",
              fontSize: "12px",
              color: "#f87171",
            }}
          >
            <AlertTriangle size={12} style={{ display: "inline", verticalAlign: "-2px", marginRight: "4px" }} />
            Termenul 72h a fost depășit. Justificarea e obligatorie.
          </div>
        )}
        <Field label={late ? "Justificare depășire 72h *" : "Justificare depășire 72h (dacă e cazul)"}>
          <textarea
            className="cr-input cr-textarea"
            value={delayJust}
            onChange={(e) => setDelayJust(e.target.value)}
            placeholder="Ex: Incidentul a fost confirmat tehnic abia după 96h..."
            style={{ ...inputStyle, minHeight: "60px" }}
            required={late}
          />
        </Field>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--ink-muted)", textTransform: "uppercase" }}>
              Preview narativă
            </div>
            <button type="button" onClick={copyNarrative} className="cr-btn cr-btn--secondary cr-btn--sm">
              <Copy size={12} /> Copiază
            </button>
          </div>
          <pre
            style={{
              marginTop: "6px",
              padding: "10px",
              background: "var(--surface-1)",
              border: "1px solid var(--border-soft)",
              borderRadius: "6px",
              fontSize: "11px",
              color: "var(--ink-muted)",
              whiteSpace: "pre-wrap",
              fontFamily: "inherit",
              maxHeight: "150px",
              overflowY: "auto",
            }}
          >
            {narrative}
          </pre>
        </div>
        {err && (
          <div style={{ fontSize: "12px", color: "#f87171", display: "flex", gap: "6px", alignItems: "center" }}>
            <AlertTriangle size={14} />
            {err}
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
          <button type="button" onClick={onClose} className="cr-btn cr-btn--secondary cr-btn--sm">
            Anulează
          </button>
          <button type="submit" disabled={busy} className="cr-btn cr-btn--primary cr-btn--sm">
            {busy ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            Confirmă trimitere
          </button>
        </div>
      </form>
    </ModalShell>
  )
}

// ────────────────────────────────────────────────────────────────────────────
//   Notify subjects modal
// ────────────────────────────────────────────────────────────────────────────

function NotifySubjectsModal({
  record,
  onClose,
  onDone,
}: {
  record: BreachRecord
  onClose: () => void
  onDone: () => Promise<void>
}) {
  const [mode, setMode] = useState<"notify" | "skip">("notify")
  const [method, setMethod] = useState<"email" | "letter" | "public_communication" | "other">("email")
  const [sentAt, setSentAt] = useState(() => new Date().toISOString().slice(0, 16))
  const [skipReason, setSkipReason] = useState("")
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    setBusy(true)
    setErr(null)
    try {
      const body =
        mode === "notify"
          ? { method, sentAtISO: new Date(sentAt).toISOString(), contentDocumented: true }
          : { skipReason: skipReason.trim() }
      if (mode === "skip" && !skipReason.trim()) {
        setErr("Motivul documentat e obligatoriu.")
        setBusy(false)
        return
      }
      const res = await fetch(`/api/breach/${record.id}/notify-subjects`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string }
        setErr(j.error || "Operațiune eșuată.")
        return
      }
      await onDone()
    } finally {
      setBusy(false)
    }
  }

  return (
    <ModalShell onClose={onClose} title="Notificare persoane vizate (Art. 34)">
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        <div style={{ display: "flex", gap: "6px" }}>
          <button
            type="button"
            onClick={() => setMode("notify")}
            style={{
              flex: 1,
              padding: "8px",
              fontSize: "12px",
              borderRadius: "6px",
              border: "1px solid " + (mode === "notify" ? "var(--cobalt-600)" : "var(--border-soft)"),
              background: mode === "notify" ? "rgba(96,165,250,0.14)" : "var(--surface-1)",
              color: mode === "notify" ? "#60a5fa" : "var(--ink-muted)",
              cursor: "pointer",
            }}
          >
            Marchează persoane notificate
          </button>
          <button
            type="button"
            onClick={() => setMode("skip")}
            style={{
              flex: 1,
              padding: "8px",
              fontSize: "12px",
              borderRadius: "6px",
              border: "1px solid " + (mode === "skip" ? "var(--cobalt-600)" : "var(--border-soft)"),
              background: mode === "skip" ? "rgba(96,165,250,0.14)" : "var(--surface-1)",
              color: mode === "skip" ? "#60a5fa" : "var(--ink-muted)",
              cursor: "pointer",
            }}
          >
            Documentează NEnecesitatea
          </button>
        </div>

        {mode === "notify" ? (
          <>
            <Field label="Metodă *">
              <select
                value={method}
                onChange={(e) =>
                  setMethod(e.target.value as "email" | "letter" | "public_communication" | "other")
                }
                className="cr-input"
              >
                <option value="email">Email</option>
                <option value="letter">Scrisoare</option>
                <option value="public_communication">Comunicare publică</option>
                <option value="other">Altele</option>
              </select>
            </Field>
            <Field label="Trimisă la *">
              <input
                type="datetime-local"
                value={sentAt}
                onChange={(e) => setSentAt(e.target.value)}
                className="cr-input"
                required
              />
            </Field>
          </>
        ) : (
          <Field label="Motiv documentat de ce NU e necesară notificarea persoanelor (Art. 34(3)) *">
            <textarea
            className="cr-input cr-textarea"
              value={skipReason}
              onChange={(e) => setSkipReason(e.target.value)}
              placeholder="Ex: Datele au fost criptate cu o cheie inaccesibilă atacatorului — risc redus pentru persoanele vizate."
              style={{ ...inputStyle, minHeight: "80px" }}
              required
            />
          </Field>
        )}

        {err && (
          <div style={{ fontSize: "12px", color: "#f87171", display: "flex", gap: "6px", alignItems: "center" }}>
            <AlertTriangle size={14} />
            {err}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
          <button type="button" onClick={onClose} className="cr-btn cr-btn--secondary cr-btn--sm">
            Anulează
          </button>
          <button type="submit" disabled={busy} className="cr-btn cr-btn--primary cr-btn--sm">
            {busy ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            {mode === "notify" ? "Marchează notificat" : "Documentează skip"}
          </button>
        </div>
      </form>
    </ModalShell>
  )
}

// ────────────────────────────────────────────────────────────────────────────
//   Modal shell + form helpers
// ────────────────────────────────────────────────────────────────────────────

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
          maxWidth: "640px",
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
      <span style={{ fontSize: "11px", color: "var(--ink-dim)", fontWeight: 500 }}>{label}</span>
      {children}
    </label>
  )
}

function splitLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean)
}

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
