"use client"

/**
 * Sprint 008B — /dashboard/dosar
 *
 * Vizualizare istoric / audit. 3 tabs:
 *   1. Inchise — findings cu findingStatus in (resolved | dismissed)
 *   2. Evidence vault — agregat operationalEvidenceNote + URL-uri uploaded
 *   3. Audit trail — events ledger cu hash-chain verify badge
 *
 * Style: inline + v3 tokens, fara shadcn / Tailwind.
 */

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  FileText,
  Hash,
  History,
  Lock,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react"

import type {
  ComplianceEvent,
  FindingCategory,
  ScanFinding,
} from "@/lib/compliance/types"
import type { ComplianceSeverity } from "@/lib/compliance/constitution"

// ────────────────────────────────────────────────────────────────────────────
//   Constants
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

const STATUS_COLORS: Record<StatusKey, { bg: string; fg: string }> = {
  open: { bg: "rgba(96,165,250,0.12)", fg: "#60a5fa" },
  confirmed: { bg: "rgba(251,191,36,0.14)", fg: "#fbbf24" },
  dismissed: { bg: "rgba(148,163,184,0.16)", fg: "#94a3b8" },
  resolved: { bg: "rgba(52,211,153,0.14)", fg: "#34d399" },
  under_monitoring: { bg: "rgba(168,85,247,0.14)", fg: "#a855f7" },
}

const SEVERITY_COLORS: Record<ComplianceSeverity, { bg: string; fg: string }> = {
  critical: { bg: "rgba(248,113,113,0.18)", fg: "#f87171" },
  high: { bg: "rgba(251,146,60,0.16)", fg: "#fb923c" },
  medium: { bg: "rgba(251,191,36,0.14)", fg: "#fbbf24" },
  low: { bg: "rgba(96,165,250,0.10)", fg: "#60a5fa" },
}

const CATEGORY_LABELS: Record<FindingCategory, string> = {
  EU_AI_ACT: "AI Act",
  GDPR: "GDPR",
  NIS2: "NIS2",
  E_FACTURA: "e-Factura",
}

type Tab = "closed" | "evidence" | "audit"

// ────────────────────────────────────────────────────────────────────────────
//   API responses
// ────────────────────────────────────────────────────────────────────────────

type FindingsResp = {
  findings: ScanFinding[]
  stats: Record<string, number>
}

type AuditResp = {
  events: ComplianceEvent[]
  chainVerified: boolean
  brokenAt?: { index: number; eventId: string; reason: string }
  stats?: { total: number; verified: number; skippedLegacy: number }
}

// ────────────────────────────────────────────────────────────────────────────
//   Page
// ────────────────────────────────────────────────────────────────────────────

export default function DosarPage() {
  const [tab, setTab] = useState<Tab>("closed")
  const [findings, setFindings] = useState<ScanFinding[]>([])
  const [events, setEvents] = useState<ComplianceEvent[]>([])
  const [chainVerified, setChainVerified] = useState<boolean | null>(null)
  const [brokenAt, setBrokenAt] = useState<AuditResp["brokenAt"] | undefined>()
  const [chainStats, setChainStats] = useState<AuditResp["stats"] | undefined>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const [resFindings, resAudit] = await Promise.all([
        fetch("/api/findings"),
        fetch("/api/findings/audit-trail"),
      ])
      if (!resFindings.ok || !resAudit.ok) {
        setError("Nu am putut incarca dosarul.")
        return
      }
      const dataF = (await resFindings.json()) as FindingsResp
      const dataA = (await resAudit.json()) as AuditResp
      setFindings(dataF.findings)
      setEvents(dataA.events)
      setChainVerified(dataA.chainVerified)
      setBrokenAt(dataA.brokenAt)
      setChainStats(dataA.stats)
      setError(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const closedFindings = useMemo(
    () =>
      findings.filter((f) => {
        const status = (f.findingStatus ?? "open") as StatusKey
        return status === "resolved" || status === "dismissed"
      }),
    [findings],
  )

  const evidenceCount = useMemo(() => countEvidence(findings), [findings])

  return (
    <div
      style={{
        padding: "32px",
        maxWidth: "1100px",
        display: "flex",
        flexDirection: "column",
        gap: "24px",
      }}
    >
      {/* Header */}
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
          Dosar
        </h1>
        <p style={{ fontSize: "13px", color: "var(--ink-muted)", marginTop: "6px" }}>
          Istoric inchideri, dovezi atasate si audit trail hash-chained.
        </p>
      </div>

      {/* Error */}
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

      {/* Tabs */}
      <Tabs
        value={tab}
        onChange={setTab}
        closedCount={closedFindings.length}
        evidenceCount={evidenceCount}
        auditCount={events.length}
      />

      {loading ? (
        <div style={{ fontSize: "13px", color: "var(--ink-dim)", padding: "24px 0" }}>
          Se incarca dosarul...
        </div>
      ) : tab === "closed" ? (
        <ClosedFindingsTab findings={closedFindings} events={events} />
      ) : tab === "evidence" ? (
        <EvidenceVaultTab findings={findings} />
      ) : (
        <AuditTrailTab
          events={events}
          chainVerified={chainVerified}
          brokenAt={brokenAt}
          stats={chainStats}
        />
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
//   Helpers
// ────────────────────────────────────────────────────────────────────────────

function countEvidence(findings: ScanFinding[]): number {
  let count = 0
  for (const f of findings) {
    if (f.operationalEvidenceNote) {
      count += f.operationalEvidenceNote.split("\n").filter((l) => l.trim()).length
    }
  }
  return count
}

// ────────────────────────────────────────────────────────────────────────────
//   Tabs
// ────────────────────────────────────────────────────────────────────────────

function Tabs({
  value,
  onChange,
  closedCount,
  evidenceCount,
  auditCount,
}: {
  value: Tab
  onChange: (t: Tab) => void
  closedCount: number
  evidenceCount: number
  auditCount: number
}) {
  const tabs: Array<{ key: Tab; label: string; icon: React.ReactNode; count: number }> = [
    { key: "closed", label: "Inchise", icon: <CheckCircle2 size={13} />, count: closedCount },
    { key: "evidence", label: "Evidence vault", icon: <FileText size={13} />, count: evidenceCount },
    { key: "audit", label: "Audit trail", icon: <History size={13} />, count: auditCount },
  ]
  return (
    <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
      {tabs.map((t) => {
        const active = t.key === value
        return (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 14px",
              fontSize: "12px",
              fontWeight: active ? 600 : 500,
              color: active ? "var(--cobalt-400)" : "var(--ink-muted)",
              background: active ? "rgba(96,165,250,0.10)" : "transparent",
              border: "1px solid",
              borderColor: active ? "rgba(96,165,250,0.3)" : "var(--border-soft)",
              borderRadius: "8px",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            {t.icon}
            {t.label}
            <span
              style={{
                fontSize: "11px",
                color: "var(--ink-dim)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {t.count}
            </span>
          </button>
        )
      })}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
//   Tab: Closed findings
// ────────────────────────────────────────────────────────────────────────────

function ClosedFindingsTab({
  findings,
  events,
}: {
  findings: ScanFinding[]
  events: ComplianceEvent[]
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (findings.length === 0) {
    return (
      <EmptyPanel
        icon={<ShieldCheck size={28} style={{ color: "var(--ink-dim)" }} />}
        title="Niciun risc inchis"
        body="Aici vor aparea risc-urile marcate ca rezolvate sau respinse. Sunt ready pentru audit/AUTORITATE."
      />
    )
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {findings.map((f) => {
        const status = (f.findingStatus ?? "open") as StatusKey
        const statusColor = STATUS_COLORS[status]
        const sevColor = SEVERITY_COLORS[f.severity]
        const expanded = expandedId === f.id
        const myEvents = events.filter((e) => e.entityId === f.id).slice(0, 8)
        return (
          <div
            key={f.id}
            style={{
              background: "var(--surface-1)",
              borderRadius: "10px",
              border: "1px solid var(--border-soft)",
              overflow: "hidden",
            }}
          >
            <button
              onClick={() => setExpandedId((p) => (p === f.id ? null : f.id))}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "14px",
                padding: "14px 16px",
                width: "100%",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                textAlign: "left",
                color: "var(--ink)",
              }}
            >
              {f.severity === "critical" ? (
                <ShieldAlert size={18} style={{ color: sevColor.fg, flexShrink: 0 }} />
              ) : (
                <Shield size={18} style={{ color: sevColor.fg, flexShrink: 0 }} />
              )}

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "14px", fontWeight: 500 }}>{f.title}</span>
                  <Badge bg={statusColor.bg} fg={statusColor.fg}>{STATUS_LABELS[status]}</Badge>
                  <Badge bg="var(--surface-2)" fg="var(--ink-muted)">{CATEGORY_LABELS[f.category]}</Badge>
                </div>
                <div style={{ fontSize: "11px", color: "var(--ink-dim)", marginTop: "3px" }}>
                  Inchis{" "}
                  {f.findingStatusUpdatedAtISO
                    ? new Date(f.findingStatusUpdatedAtISO).toLocaleString("ro-RO")
                    : "—"}
                </div>
              </div>

              {expanded ? (
                <ChevronUp size={16} style={{ color: "var(--ink-dim)", flexShrink: 0 }} />
              ) : (
                <ChevronDown size={16} style={{ color: "var(--ink-dim)", flexShrink: 0 }} />
              )}
            </button>

            {expanded && (
              <div
                style={{
                  borderTop: "1px solid var(--border-soft)",
                  padding: "16px 20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                  background: "var(--surface-0)",
                }}
              >
                <div>
                  <SectionLabel>Detalii</SectionLabel>
                  <p style={paragraphStyle}>{f.resolution?.problem ?? f.detail}</p>
                </div>
                {f.operationalEvidenceNote && (
                  <div>
                    <SectionLabel>Dovezi atasate</SectionLabel>
                    <pre
                      style={{
                        fontSize: "11px",
                        color: "var(--ink)",
                        background: "var(--surface-1)",
                        padding: "10px 12px",
                        borderRadius: "6px",
                        border: "1px solid var(--border-soft)",
                        marginTop: "8px",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                        fontFamily: "ui-monospace, SFMono-Regular, monospace",
                        maxHeight: "200px",
                        overflow: "auto",
                      }}
                    >
                      {f.operationalEvidenceNote}
                    </pre>
                  </div>
                )}
                {myEvents.length > 0 && (
                  <div>
                    <SectionLabel>Trail evenimente</SectionLabel>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "8px" }}>
                      {myEvents.map((e) => (
                        <EventRow key={e.id} event={e} compact />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
//   Tab: Evidence vault
// ────────────────────────────────────────────────────────────────────────────

type EvidenceItem = {
  key: string
  findingId: string
  findingTitle: string
  category: FindingCategory
  text: string
  atISO?: string
  url?: string
  fileName?: string
}

/**
 * Extrage URL-uri din textul unei note (linkify simplu). Pana cand Sprint 011
 * expune /api/documents pentru ClientPortalDocument, parsam URL-urile direct
 * din operationalEvidenceNote (acolo unde user-ul a lipit un link).
 */
function extractFirstUrl(text: string): string | undefined {
  const m = text.match(/https?:\/\/[^\s)]+/i)
  return m ? m[0] : undefined
}

function EvidenceVaultTab({ findings }: { findings: ScanFinding[] }) {
  const [search, setSearch] = useState("")

  const items: EvidenceItem[] = useMemo(() => {
    const result: EvidenceItem[] = []

    for (const f of findings) {
      if (!f.operationalEvidenceNote) continue
      const lines = f.operationalEvidenceNote.split("\n").filter((l) => l.trim())
      lines.forEach((line, i) => {
        // Try to parse leading ISO timestamp from "[2026-...] author: note"
        const match = line.match(/^\[([0-9T:.Z-]+)\]\s+(.+)$/)
        const atISO = match?.[1]
        const text = match?.[2] ?? line
        result.push({
          key: `${f.id}-note-${i}`,
          findingId: f.id,
          findingTitle: f.title,
          category: f.category,
          text,
          atISO,
          url: extractFirstUrl(text),
        })
      })
    }

    // Sort newest first
    return result.sort((a, b) => (b.atISO ?? "").localeCompare(a.atISO ?? ""))
  }, [findings])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return items
    return items.filter(
      (it) =>
        it.text.toLowerCase().includes(q) ||
        it.findingTitle.toLowerCase().includes(q) ||
        (it.fileName?.toLowerCase().includes(q) ?? false),
    )
  }, [items, search])

  if (items.length === 0) {
    return (
      <EmptyPanel
        icon={<FileText size={28} style={{ color: "var(--ink-dim)" }} />}
        title="Nicio dovada inregistrata"
        body="Cand atasezi dovezi pe un risc (nota sau URL document), ele apar aici agregat pentru audit."
      />
    )
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <div
        style={{
          position: "relative",
          maxWidth: "420px",
        }}
      >
        <Search
          size={14}
          style={{
            position: "absolute",
            left: "10px",
            top: "50%",
            transform: "translateY(-50%)",
            color: "var(--ink-dim)",
          }}
        />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cauta in dovezi (titlu finding, text, fisier)..."
          style={{
            ...inputStyle,
            paddingLeft: "30px",
          }}
        />
      </div>

      {filtered.length === 0 ? (
        <div style={{ fontSize: "12px", color: "var(--ink-dim)", padding: "16px 0" }}>
          Niciun rezultat pentru cautarea ta.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {filtered.map((it) => (
            <div
              key={it.key}
              style={{
                background: "var(--surface-1)",
                border: "1px solid var(--border-soft)",
                borderRadius: "8px",
                padding: "12px 14px",
                display: "flex",
                gap: "12px",
                alignItems: "flex-start",
              }}
            >
              <FileText
                size={14}
                style={{
                  color: it.url ? "var(--cobalt-400)" : "var(--ink-dim)",
                  flexShrink: 0,
                  marginTop: "2px",
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                  <span style={{ fontSize: "12px", fontWeight: 500, color: "var(--ink)" }}>
                    {it.findingTitle}
                  </span>
                  <Badge bg="var(--surface-2)" fg="var(--ink-muted)">
                    {CATEGORY_LABELS[it.category]}
                  </Badge>
                  {it.url && (
                    <Badge bg="rgba(96,165,250,0.10)" fg="var(--cobalt-400)">
                      Link
                    </Badge>
                  )}
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    color: "var(--ink)",
                    marginTop: "4px",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {it.text}
                </div>
                <div
                  style={{
                    fontSize: "10px",
                    color: "var(--ink-dim)",
                    marginTop: "4px",
                    display: "flex",
                    gap: "8px",
                    flexWrap: "wrap",
                  }}
                >
                  {it.atISO && <span>{new Date(it.atISO).toLocaleString("ro-RO")}</span>}
                  {it.url && (
                    <>
                      <span>·</span>
                      <a
                        href={it.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: "var(--cobalt-400)" }}
                      >
                        Deschide link
                      </a>
                    </>
                  )}
                  <span>·</span>
                  <span>finding: {it.findingId.slice(0, 16)}…</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
//   Tab: Audit trail (events ledger)
// ────────────────────────────────────────────────────────────────────────────

function AuditTrailTab({
  events,
  chainVerified,
  brokenAt,
  stats,
}: {
  events: ComplianceEvent[]
  chainVerified: boolean | null
  brokenAt?: AuditResp["brokenAt"]
  stats?: AuditResp["stats"]
}) {
  if (events.length === 0) {
    return (
      <EmptyPanel
        icon={<History size={28} style={{ color: "var(--ink-dim)" }} />}
        title="Audit trail gol"
        body="Toate actiunile (crearea unui finding, schimbarea unui status, atasare dovada) vor aparea aici cu hash chain SHA-256."
      />
    )
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <ChainBadge verified={chainVerified} brokenAt={brokenAt} stats={stats} />
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {events.map((e) => (
          <EventRow key={e.id} event={e} compact={false} />
        ))}
      </div>
    </div>
  )
}

function ChainBadge({
  verified,
  brokenAt,
  stats,
}: {
  verified: boolean | null
  brokenAt?: AuditResp["brokenAt"]
  stats?: AuditResp["stats"]
}) {
  if (verified === null) return null
  return (
    <div
      style={{
        display: "flex",
        gap: "12px",
        padding: "12px 16px",
        background: verified ? "rgba(52,211,153,0.08)" : "var(--red-soft)",
        borderRadius: "8px",
        border: `1px solid ${verified ? "rgba(52,211,153,0.25)" : "rgba(248,113,113,0.25)"}`,
        color: verified ? "#34d399" : "#f87171",
        fontSize: "13px",
        alignItems: "flex-start",
      }}
    >
      {verified ? (
        <CheckCircle2 size={16} style={{ flexShrink: 0, marginTop: "1px" }} />
      ) : (
        <AlertCircle size={16} style={{ flexShrink: 0, marginTop: "1px" }} />
      )}
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600 }}>
          {verified ? "Hash chain verificat" : `Hash chain rupt la ${brokenAt?.eventId ?? "?"}`}
        </div>
        <div style={{ fontSize: "11px", marginTop: "3px", opacity: 0.85 }}>
          {verified
            ? `${stats?.verified ?? 0} evenimente in lant${stats?.skippedLegacy ? ` · ${stats.skippedLegacy} legacy (skip)` : ""}`
            : brokenAt?.reason}
        </div>
      </div>
      <Lock size={14} style={{ color: verified ? "#34d399" : "#f87171", flexShrink: 0, marginTop: "1px" }} />
    </div>
  )
}

function EventRow({ event, compact }: { event: ComplianceEvent; compact: boolean }) {
  const [copied, setCopied] = useState(false)
  async function copyHash() {
    if (!event.selfHash) return
    await navigator.clipboard.writeText(event.selfHash)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <div
      style={{
        fontSize: compact ? "11px" : "12px",
        color: "var(--ink)",
        padding: compact ? "8px 10px" : "10px 14px",
        background: "var(--surface-1)",
        borderRadius: "6px",
        border: "1px solid var(--border-soft)",
        display: "flex",
        gap: "12px",
        alignItems: "center",
        flexWrap: "wrap",
      }}
    >
      <span
        style={{
          fontSize: compact ? "10px" : "11px",
          color: "var(--ink-dim)",
          fontVariantNumeric: "tabular-nums",
          minWidth: "120px",
        }}
      >
        {new Date(event.createdAtISO).toLocaleString("ro-RO")}
      </span>
      <span
        style={{
          fontFamily: "ui-monospace, SFMono-Regular, monospace",
          fontSize: compact ? "10px" : "11px",
          color: "var(--cobalt-400)",
          background: "rgba(96,165,250,0.08)",
          padding: "2px 6px",
          borderRadius: "4px",
        }}
      >
        {event.type}
      </span>
      <span
        style={{
          fontSize: compact ? "10px" : "11px",
          color: "var(--ink-muted)",
          background: "var(--surface-2)",
          padding: "2px 6px",
          borderRadius: "4px",
        }}
      >
        {event.entityType}
      </span>
      <span style={{ color: "var(--ink)", flex: 1, minWidth: 0 }}>{event.message}</span>
      {event.actorLabel && (
        <span style={{ fontSize: "10px", color: "var(--ink-dim)" }}>
          {event.actorLabel}
        </span>
      )}
      {event.selfHash && (
        <button
          onClick={copyHash}
          title="Copiaza hash-ul (selfHash) pentru audit"
          style={{
            ...btnGhost,
            fontFamily: "ui-monospace, SFMono-Regular, monospace",
            color: copied ? "#34d399" : "var(--ink-dim)",
          }}
        >
          {copied ? <CheckCircle2 size={10} /> : <Hash size={10} />}
          {event.selfHash.slice(0, 8)}…
          {!copied && <Copy size={9} />}
        </button>
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
//   Reusable bits
// ────────────────────────────────────────────────────────────────────────────

function Badge({ bg, fg, children }: { bg: string; fg: string; children: React.ReactNode }) {
  return (
    <span
      style={{
        fontSize: "10px",
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        padding: "2px 8px",
        borderRadius: "999px",
        background: bg,
        color: fg,
      }}
    >
      {children}
    </span>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: "10px",
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        color: "var(--ink-dim)",
      }}
    >
      {children}
    </div>
  )
}

function EmptyPanel({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode
  title: string
  body: string
}) {
  return (
    <div
      style={{
        padding: "40px 24px",
        background: "var(--surface-1)",
        borderRadius: "10px",
        border: "1px dashed var(--border-soft)",
        textAlign: "center",
      }}
    >
      <div style={{ marginBottom: "12px" }}>{icon}</div>
      <div style={{ fontSize: "14px", fontWeight: 500, color: "var(--ink)", marginBottom: "6px" }}>
        {title}
      </div>
      <div
        style={{
          fontSize: "12px",
          color: "var(--ink-muted)",
          maxWidth: "440px",
          margin: "0 auto",
        }}
      >
        {body}
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
//   Style tokens (inline)
// ────────────────────────────────────────────────────────────────────────────

const btnGhost: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "4px",
  padding: "3px 6px",
  fontSize: "10px",
  fontWeight: 500,
  background: "transparent",
  border: "1px solid var(--border-soft)",
  borderRadius: "4px",
  cursor: "pointer",
  transition: "all 0.15s",
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  fontSize: "13px",
  color: "var(--ink)",
  background: "var(--surface-0)",
  border: "1px solid var(--border-soft)",
  borderRadius: "6px",
  outline: "none",
  fontFamily: "inherit",
}

const paragraphStyle: React.CSSProperties = {
  fontSize: "13px",
  color: "var(--ink)",
  marginTop: "8px",
  marginBottom: "8px",
  lineHeight: 1.55,
  whiteSpace: "pre-wrap",
}

