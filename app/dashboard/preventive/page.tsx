"use client"

/**
 * Sprint 022 — /dashboard/preventive
 * Engine preventiv: ultima rulare + reminders programate + legislative changes
 * + email preferences. Minimum viable UI; full polish viitor.
 */

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Radar,
  Play,
  Mail,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  FileText,
} from "lucide-react"

import type {
  LegislativeChangeEvent,
  PreventiveEmailPreferences,
  PreventiveRunSummary,
  RenewalReminderRecord,
} from "@/lib/compliance/types"

type LegislativeChangeWithAck = LegislativeChangeEvent & {
  acknowledged: boolean
}

export default function PreventivePage() {
  const [lastRunSummary, setLastRunSummary] =
    useState<PreventiveRunSummary | null>(null)
  const [lastRunAtISO, setLastRunAtISO] = useState<string | null>(null)
  const [reminders, setReminders] = useState<RenewalReminderRecord[]>([])
  const [changes, setChanges] = useState<LegislativeChangeWithAck[]>([])
  const [baselineISO, setBaselineISO] = useState<string | null>(null)
  const [prefs, setPrefs] = useState<PreventiveEmailPreferences | null>(null)
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [savingPrefs, setSavingPrefs] = useState(false)
  const [recipients, setRecipients] = useState("")

  const load = useCallback(async () => {
    try {
      const [remRes, chRes, prefRes] = await Promise.all([
        fetch("/api/preventive/reminders"),
        fetch("/api/preventive/legislative-changes"),
        fetch("/api/preventive/preferences"),
      ])
      if (remRes.ok) {
        const data = await remRes.json()
        setReminders(data.reminders)
        setLastRunAtISO(data.lastRunAtISO)
        setLastRunSummary(data.lastRunSummary)
      }
      if (chRes.ok) {
        const data = await chRes.json()
        setChanges(data.changes)
        setBaselineISO(data.baselineISO)
      }
      if (prefRes.ok) {
        const data = await prefRes.json()
        setPrefs(data.preferences)
        setRecipients(data.preferences.recipientEmails.join(", "))
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function handleRunScan() {
    setRunning(true)
    try {
      const res = await fetch("/api/preventive/scan", { method: "POST" })
      if (res.ok) await load()
    } finally {
      setRunning(false)
    }
  }

  async function handleSavePrefs() {
    if (!prefs) return
    setSavingPrefs(true)
    try {
      const recipientList = recipients
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
      const next: PreventiveEmailPreferences = {
        ...prefs,
        recipientEmails: recipientList,
      }
      const res = await fetch("/api/preventive/preferences", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(next),
      })
      if (res.ok) {
        const data = await res.json()
        setPrefs(data.preferences)
      }
    } finally {
      setSavingPrefs(false)
    }
  }

  async function handleAcknowledge(changeId: string) {
    const res = await fetch("/api/preventive/legislative-changes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ changeId, actionPlan: "reviewed" }),
    })
    if (res.ok) await load()
  }

  const upcomingReminders = useMemo(
    () => reminders.filter((r) => r.status === "scheduled"),
    [reminders],
  )
  const unacknowledgedChanges = useMemo(
    () => changes.filter((c) => !c.acknowledged && c.impact !== "info_only"),
    [changes],
  )

  return (
    <div className="cr-page cr-stack">
      <div className="cr-hero">
        <div className="cr-hero__copy">
          <div className="cr-eyebrow">Rapoarte & dosar</div>
          <h1 className="cr-title">Engine preventiv</h1>
          <p className="cr-subtitle">
          Scanare automată a deadline-urilor + reminder-uri email + change log
          legislativ · Apelat zilnic 06:00 UTC via cron, plus rulare manuală.
          </p>
        </div>
      </div>

      <button
        onClick={handleRunScan}
        disabled={running || loading}
        className="cr-btn cr-btn--primary"
        style={{
          alignSelf: "flex-start",
          cursor: running ? "default" : "pointer",
          opacity: running ? 0.6 : 1,
        }}
      >
        {running ? <Loader2 size={14} /> : <Play size={14} />}
        {running ? "Se rulează scan..." : "Rulează scan acum"}
      </button>

      {lastRunSummary && (
        <Card>
          <CardHeader>
            <Radar size={16} style={{ color: "var(--cobalt-400)" }} />
            <span>Ultima rulare</span>
            <span style={{ marginLeft: "auto", fontSize: "11px", color: "var(--ink-dim)" }}>
              {lastRunAtISO
                ? new Date(lastRunAtISO).toLocaleString("ro-RO")
                : ""}
            </span>
          </CardHeader>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: "12px",
              padding: "16px",
            }}
          >
            <Stat label="Acțiuni detectate" value={lastRunSummary.actionsDetected} />
            <Stat label="Findings emise" value={lastRunSummary.findingsEmitted} />
            <Stat label="Email-uri queue" value={lastRunSummary.emailsQueued} />
            <Stat label="Erori" value={lastRunSummary.errorsCount} accent={lastRunSummary.errorsCount > 0 ? "red" : undefined} />
            <Stat label="Durată" value={`${Math.round(lastRunSummary.durationMs)} ms`} />
            <Stat label="Trigger" value={lastRunSummary.triggerSource} />
          </div>
        </Card>
      )}

      {/* Upcoming reminders */}
      <Card>
        <CardHeader>
          <Clock size={16} style={{ color: "var(--cobalt-400)" }} />
          <span>Reminder-uri programate ({upcomingReminders.length})</span>
        </CardHeader>
        {loading ? (
          <Padding>Se încarcă...</Padding>
        ) : upcomingReminders.length === 0 ? (
          <Padding muted>Niciun reminder programat. Excelent — toate deadline-urile sunt sub control.</Padding>
        ) : (
          <Table>
            <THead cols={["Tip", "Entitate", "Email", "Programat", "Template"]} />
            {upcomingReminders.slice(0, 50).map((r) => (
              <Row
                key={r.id}
                cells={[
                  <code key="t" style={codeStyle}>{r.triggerType}</code>,
                  r.entityId,
                  r.recipientEmail,
                  new Date(r.scheduledForISO).toLocaleDateString("ro-RO"),
                  <code key="tpl" style={codeStyle}>{r.emailTemplate}</code>,
                ]}
              />
            ))}
          </Table>
        )}
      </Card>

      {/* Email preferences */}
      {prefs && (
        <Card>
          <CardHeader>
            <Mail size={16} style={{ color: "var(--cobalt-400)" }} />
            <span>Preferințe email</span>
          </CardHeader>
          <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px" }}>
              <input
                type="checkbox"
                checked={prefs.enabled}
                onChange={(e) => setPrefs({ ...prefs, enabled: e.target.checked })}
              />
              Email reminders activate
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--ink-muted)", textTransform: "uppercase" }}>
                Recipients (comma-separated)
              </span>
              <input
                value={recipients}
                onChange={(e) => setRecipients(e.target.value)}
                placeholder="dpo@firma.ro, manager@firma.ro"
                className="cr-input"
              />
            </label>
            <button
              onClick={handleSavePrefs}
              disabled={savingPrefs}
              style={{
                alignSelf: "flex-start",
                padding: "8px 14px",
                fontSize: "12px",
                fontWeight: 600,
                color: "white",
                background: "var(--cobalt-600)",
                border: "none",
                borderRadius: "6px",
                cursor: savingPrefs ? "default" : "pointer",
                opacity: savingPrefs ? 0.6 : 1,
              }}
            >
              {savingPrefs ? "Se salvează..." : "Salvează preferințele"}
            </button>
          </div>
        </Card>
      )}

      {/* Legislative changes */}
      <Card>
        <CardHeader>
          <FileText size={16} style={{ color: "var(--cobalt-400)" }} />
          <span>Modificări legislative ({changes.length})</span>
          <span style={{ marginLeft: "auto", fontSize: "11px", color: "var(--ink-dim)" }}>
            Baseline: {baselineISO ? new Date(baselineISO).toLocaleDateString("ro-RO") : "—"}
          </span>
        </CardHeader>
        {loading ? (
          <Padding>Se încarcă...</Padding>
        ) : unacknowledgedChanges.length === 0 ? (
          <Padding muted>Toate modificările legislative relevante sunt acknowledged.</Padding>
        ) : (
          <Table>
            <THead cols={["Reglementare", "Titlu", "Publicată", "Impact", "Acțiune"]} />
            {unacknowledgedChanges.slice(0, 50).map((c) => (
              <Row
                key={c.id}
                cells={[
                  <code key="r" style={codeStyle}>{c.regulation}</code>,
                  c.title,
                  new Date(c.publishedAtISO).toLocaleDateString("ro-RO"),
                  <ImpactBadge key="i" impact={c.impact} />,
                  <button
                    key="a"
                    onClick={() => handleAcknowledge(c.id)}
                    style={{
                      padding: "4px 10px",
                      fontSize: "11px",
                      fontWeight: 600,
                      color: "var(--cobalt-400)",
                      background: "transparent",
                      border: "1px solid var(--cobalt-400)",
                      borderRadius: "4px",
                      cursor: "pointer",
                    }}
                  >
                    Acknowledge
                  </button>,
                ]}
              />
            ))}
          </Table>
        )}
      </Card>
    </div>
  )
}

// ── Style helpers ────────────────────────────────────────────────────────────

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "var(--surface-1)",
        border: "1px solid var(--border-soft)",
        borderRadius: "10px",
        overflow: "hidden",
      }}
    >
      {children}
    </div>
  )
}

function CardHeader({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "12px 16px",
        borderBottom: "1px solid var(--border-soft)",
        fontSize: "13px",
        fontWeight: 500,
        color: "var(--ink)",
      }}
    >
      {children}
    </div>
  )
}

function Padding({
  children,
  muted = false,
}: {
  children: React.ReactNode
  muted?: boolean
}) {
  return (
    <div
      style={{
        padding: "16px",
        fontSize: "13px",
        color: muted ? "var(--ink-muted)" : "var(--ink)",
      }}
    >
      {children}
    </div>
  )
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string
  value: number | string
  accent?: "red" | "amber"
}) {
  const color =
    accent === "red"
      ? "#f87171"
      : accent === "amber"
        ? "#fbbf24"
        : "var(--ink)"
  return (
    <div
      style={{
        padding: "12px 14px",
        background: "var(--surface-2)",
        borderRadius: "8px",
        border: "1px solid var(--border-soft)",
      }}
    >
      <div
        style={{
          fontSize: "10px",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: "var(--ink-dim)",
          marginBottom: "4px",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: "18px",
          fontWeight: 600,
          color,
          fontFamily: "var(--font-display-v3)",
        }}
      >
        {value}
      </div>
    </div>
  )
}

function Table({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "auto",
        fontSize: "12px",
      }}
    >
      {children}
    </div>
  )
}

function THead({ cols }: { cols: string[] }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${cols.length}, 1fr)`,
        gap: "12px",
        padding: "8px 16px",
        background: "var(--surface-2)",
        borderBottom: "1px solid var(--border-soft)",
        fontSize: "10px",
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        color: "var(--ink-dim)",
      }}
    >
      {cols.map((c) => (
        <span key={c}>{c}</span>
      ))}
    </div>
  )
}

function Row({ cells }: { cells: React.ReactNode[] }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${cells.length}, 1fr)`,
        gap: "12px",
        padding: "10px 16px",
        borderBottom: "1px solid var(--border-soft)",
        alignItems: "center",
        color: "var(--ink)",
      }}
    >
      {cells.map((c, i) => (
        <div key={i}>{c}</div>
      ))}
    </div>
  )
}

function ImpactBadge({ impact }: { impact: string }) {
  const colors: Record<string, { bg: string; fg: string }> = {
    high: { bg: "rgba(248,113,113,0.14)", fg: "#f87171" },
    medium: { bg: "rgba(251,191,36,0.14)", fg: "#fbbf24" },
    low: { bg: "rgba(96,165,250,0.10)", fg: "#60a5fa" },
    info_only: { bg: "rgba(148,163,184,0.12)", fg: "#94a3b8" },
  }
  const c = colors[impact] ?? colors.info_only
  return (
    <span
      style={{
        fontSize: "10px",
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        padding: "2px 8px",
        borderRadius: "999px",
        background: c.bg,
        color: c.fg,
      }}
    >
      {impact}
    </span>
  )
}

const codeStyle: React.CSSProperties = {
  fontFamily: "ui-monospace, monospace",
  fontSize: "11px",
  color: "var(--ink-muted)",
  background: "var(--surface-2)",
  padding: "2px 6px",
  borderRadius: "3px",
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  fontSize: "13px",
  color: "var(--ink)",
  background: "var(--surface-0)",
  border: "1px solid var(--border-soft)",
  borderRadius: "6px",
  outline: "none",
  fontFamily: "inherit",
}

void CheckCircle2
void AlertTriangle
