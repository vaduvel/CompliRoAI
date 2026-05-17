"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  ExternalLink,
  Loader2,
  MessageSquare,
  X,
} from "lucide-react"

import type {
  TransparencyImplementation,
  TransparencyLanguage,
  TransparencyNoticeRequirement,
  TransparencyNoticeType,
  TransparencyPlacement,
} from "@/lib/compliance/types"

// ────────────────────────────────────────────────────────────────────────────
//   Local types — duplicate of API response shape
// ────────────────────────────────────────────────────────────────────────────

type AnnotatedRequirement = TransparencyNoticeRequirement & {
  implemented: boolean
  implementation: TransparencyImplementation | null
}

type SystemAnalysis = {
  systemId: string
  systemName: string
  requirements: AnnotatedRequirement[]
}

type AllRequiredResponse = {
  role: string | null
  systems: SystemAnalysis[]
  stats: {
    totalSystems: number
    pendingSystems: number
    pendingNotices: number
  }
  implementations: TransparencyImplementation[]
}

// ────────────────────────────────────────────────────────────────────────────
//   Constants — friendly labels
// ────────────────────────────────────────────────────────────────────────────

const NOTICE_TYPE_LABELS: Record<TransparencyNoticeType, string> = {
  "chatbot-disclosure": "Disclosure chatbot",
  "ai-generated-content": "Etichetare conținut generat AI",
  "deepfake-disclosure": "Disclosure deepfake",
  "personalization-notice": "Notificare personalizare",
  "emotion-recognition-notice": "Notificare recunoaștere emoții",
  "automated-decision-notice": "Notificare decizie automatizată",
}

const PLACEMENT_LABELS: Record<TransparencyPlacement, string> = {
  popup: "Popup",
  footer: "Footer",
  header: "Banner header",
  "email-signature": "Semnătură email",
  "video-overlay": "Overlay video",
  inline: "Inline / badge",
}

const ALL_PLACEMENTS: TransparencyPlacement[] = [
  "popup",
  "footer",
  "header",
  "email-signature",
  "video-overlay",
  "inline",
]

const ALL_LANGUAGES: TransparencyLanguage[] = ["ro", "en"]

function severityColor(severity: "critical" | "high" | "medium"): {
  bg: string
  fg: string
  border: string
} {
  switch (severity) {
    case "critical":
      return { bg: "rgba(248,113,113,0.12)", fg: "#dc2626", border: "rgba(248,113,113,0.3)" }
    case "high":
      return { bg: "rgba(251,146,60,0.12)", fg: "#c2410c", border: "rgba(251,146,60,0.3)" }
    case "medium":
    default:
      return { bg: "rgba(250,204,21,0.12)", fg: "#a16207", border: "rgba(250,204,21,0.3)" }
  }
}

// ────────────────────────────────────────────────────────────────────────────
//   Page
// ────────────────────────────────────────────────────────────────────────────

export default function TransparencyPage() {
  const [data, setData] = useState<AllRequiredResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openSystemId, setOpenSystemId] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/transparency/all-required", { cache: "no-store" })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body?.error || `HTTP ${res.status}`)
        setLoading(false)
        return
      }
      const json = (await res.json()) as AllRequiredResponse
      setData(json)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Eroare la încărcare")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const totals = data?.stats ?? { totalSystems: 0, pendingSystems: 0, pendingNotices: 0 }
  const totalRequired = useMemo(() => {
    if (!data) return 0
    return data.systems.reduce((acc, s) => acc + s.requirements.length, 0)
  }, [data])
  const totalImplemented = useMemo(() => {
    if (!data) return 0
    return data.systems.reduce(
      (acc, s) => acc + s.requirements.filter((r) => r.implemented).length,
      0
    )
  }, [data])

  const openSystem = data?.systems.find((s) => s.systemId === openSystemId) ?? null

  return (
    <div
      style={{
        padding: "32px",
        maxWidth: "1100px",
        display: "flex",
        flexDirection: "column",
        gap: "20px",
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
          Transparency · Art. 50 EU AI Act
        </h1>
        <p style={{ fontSize: "13px", color: "var(--ink-muted)", marginTop: "6px" }}>
          Generează notice-uri de transparență RO + EN gata de copy-paste pentru sistemele AI care
          interacționează cu persoane fizice sau produc conținut sintetic.
        </p>
      </div>

      {/* Deadline banner */}
      <div
        role="status"
        style={{
          display: "flex",
          gap: "12px",
          padding: "14px 16px",
          background: "rgba(251,191,36,0.10)",
          borderRadius: "8px",
          border: "1px solid rgba(251,191,36,0.30)",
          alignItems: "flex-start",
        }}
      >
        <AlertTriangle size={16} style={{ color: "#b45309", flexShrink: 0, marginTop: "2px" }} />
        <div>
          <div style={{ fontSize: "13px", fontWeight: 600, color: "#92400e" }}>
            Art. 50 EU AI Act devine executoriu la 2 decembrie 2026
          </div>
          <div style={{ fontSize: "12px", color: "#92400e", marginTop: "3px", opacity: 0.85 }}>
            Extindere prin Omnibus (mai 2026) de la 2 august 2026 → 2 decembrie 2026.
            Sancțiuni: până la 15 mil EUR sau 3% din cifra de afaceri globală.
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
        {[
          { label: "Sisteme AI total", value: totals.totalSystems },
          { label: "Cu obligații Art. 50", value: totals.pendingSystems + (totalImplemented > 0 ? data?.systems.filter((s) => s.requirements.length > 0 && s.requirements.every((r) => r.implemented)).length ?? 0 : 0) },
          { label: "Notice-uri implementate", value: totalImplemented },
          { label: "Notice-uri pending", value: totals.pendingNotices },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              padding: "16px",
              background: "var(--bg-raised)",
              borderRadius: "8px",
              border: "1px solid var(--border)",
            }}
          >
            <div
              style={{
                fontSize: "24px",
                fontWeight: 600,
                color: "var(--ink)",
                fontFamily: "var(--font-display-v3)",
              }}
            >
              {stat.value}
            </div>
            <div style={{ fontSize: "12px", color: "var(--ink-dim)", marginTop: "4px" }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Role info */}
      {data?.role && (
        <div
          style={{
            fontSize: "12px",
            color: "var(--ink-muted)",
            padding: "8px 12px",
            background: "var(--bg-raised)",
            border: "1px solid var(--border-soft)",
            borderRadius: "6px",
          }}
        >
          Rol organizație detectat: <strong style={{ color: "var(--ink)" }}>{data.role}</strong>
        </div>
      )}

      {/* States */}
      {loading && (
        <div style={{ fontSize: "13px", color: "var(--ink-dim)", display: "flex", alignItems: "center", gap: "8px" }}>
          <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
          Se încarcă obligațiile de transparență…
        </div>
      )}

      {error && !loading && (
        <div
          style={{
            padding: "14px 16px",
            background: "var(--red-soft, rgba(248,113,113,0.12))",
            border: "1px solid rgba(248,113,113,0.30)",
            borderRadius: "8px",
            fontSize: "13px",
            color: "var(--red-400, #dc2626)",
          }}
        >
          {error}
        </div>
      )}

      {/* Systems table */}
      {!loading && !error && data && data.systems.length === 0 && (
        <div
          style={{
            padding: "32px",
            background: "var(--bg-raised)",
            border: "1px dashed var(--border)",
            borderRadius: "8px",
            textAlign: "center",
            color: "var(--ink-muted)",
            fontSize: "13px",
          }}
        >
          Nu ai sisteme AI în inventar. Adaugă mai întâi sisteme în secțiunea{" "}
          <a
            href="/dashboard/sisteme"
            style={{ color: "var(--cobalt-600)", textDecoration: "underline" }}
          >
            Sisteme AI
          </a>{" "}
          ca să vezi ce notice-uri Art. 50 trebuie publicate.
        </div>
      )}

      {!loading && !error && data && data.systems.length > 0 && (
        <div
          style={{
            background: "var(--bg-raised)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "12px 16px",
              borderBottom: "1px solid var(--border-soft)",
              fontSize: "12px",
              color: "var(--ink-dim)",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              display: "grid",
              gridTemplateColumns: "1.4fr 1fr 1fr 1fr",
              gap: "12px",
            }}
          >
            <div>Sistem AI</div>
            <div>Notice obligatorii</div>
            <div>Status</div>
            <div style={{ textAlign: "right" }}>Acțiuni</div>
          </div>

          {data.systems.map((sys) => {
            const total = sys.requirements.length
            const implemented = sys.requirements.filter((r) => r.implemented).length
            const pending = total - implemented
            const isFullyOk = total === 0
            const isComplete = total > 0 && pending === 0

            return (
              <div
                key={sys.systemId}
                style={{
                  padding: "14px 16px",
                  borderBottom: "1px solid var(--border-soft)",
                  display: "grid",
                  gridTemplateColumns: "1.4fr 1fr 1fr 1fr",
                  gap: "12px",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontSize: "13px", fontWeight: 500, color: "var(--ink)" }}>
                    {sys.systemName}
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--ink-dim)", marginTop: "2px" }}>
                    {sys.systemId}
                  </div>
                </div>

                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  {isFullyOk ? (
                    <span
                      style={{
                        fontSize: "11px",
                        color: "var(--ink-dim)",
                        fontStyle: "italic",
                      }}
                    >
                      Niciunul (nu intră sub Art. 50)
                    </span>
                  ) : (
                    sys.requirements.map((req) => {
                      const c = severityColor(req.severity)
                      return (
                        <span
                          key={req.noticeType}
                          title={req.obligation}
                          style={{
                            fontSize: "11px",
                            padding: "3px 8px",
                            borderRadius: "999px",
                            background: c.bg,
                            color: c.fg,
                            border: `1px solid ${c.border}`,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {NOTICE_TYPE_LABELS[req.noticeType]}
                        </span>
                      )
                    })
                  )}
                </div>

                <div>
                  {isFullyOk ? (
                    <span style={{ fontSize: "12px", color: "var(--ink-dim)" }}>—</span>
                  ) : isComplete ? (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        fontSize: "12px",
                        color: "var(--emerald-400, #059669)",
                      }}
                    >
                      <CheckCircle2 size={12} /> Toate implementate
                    </span>
                  ) : (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        fontSize: "12px",
                        color: "var(--red-400, #dc2626)",
                      }}
                    >
                      <AlertTriangle size={12} /> {pending} / {total} pending
                    </span>
                  )}
                </div>

                <div style={{ textAlign: "right" }}>
                  {!isFullyOk && (
                    <button
                      onClick={() => setOpenSystemId(sys.systemId)}
                      style={{
                        padding: "6px 12px",
                        borderRadius: "6px",
                        border: "1px solid var(--cobalt-600)",
                        background: "var(--cobalt-600)",
                        color: "#fff",
                        fontSize: "12px",
                        cursor: "pointer",
                        fontWeight: 500,
                      }}
                    >
                      Vezi notice-uri
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {openSystem && (
        <SystemNoticesModal
          system={openSystem}
          onClose={() => setOpenSystemId(null)}
          onChanged={load}
        />
      )}

      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
//   Modal
// ────────────────────────────────────────────────────────────────────────────

function SystemNoticesModal({
  system,
  onClose,
  onChanged,
}: {
  system: SystemAnalysis
  onClose: () => void
  onChanged: () => void | Promise<void>
}) {
  const [activeNoticeIdx, setActiveNoticeIdx] = useState(0)
  const active = system.requirements[activeNoticeIdx]

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,0.55)",
        zIndex: 1000,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "48px 16px",
        overflowY: "auto",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: "880px",
          background: "var(--bg)",
          border: "1px solid var(--border)",
          borderRadius: "12px",
          overflow: "hidden",
          boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--border-soft)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "16px",
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "var(--font-display-v3)",
                fontSize: "16px",
                fontWeight: 600,
                color: "var(--ink)",
              }}
            >
              Notice-uri pentru: {system.systemName}
            </div>
            <div style={{ fontSize: "12px", color: "var(--ink-dim)", marginTop: "2px" }}>
              {system.requirements.length} obligație(i) de transparență sub Art. 50 EU AI Act
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Închide"
            style={{
              padding: "6px",
              borderRadius: "6px",
              border: "1px solid var(--border)",
              background: "var(--bg-raised)",
              color: "var(--ink-muted)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
            }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Tabs notice types */}
        {system.requirements.length > 1 && (
          <div
            style={{
              display: "flex",
              gap: "4px",
              padding: "12px 20px 0",
              borderBottom: "1px solid var(--border-soft)",
              overflowX: "auto",
            }}
          >
            {system.requirements.map((req, idx) => {
              const isActive = idx === activeNoticeIdx
              return (
                <button
                  key={req.noticeType}
                  onClick={() => setActiveNoticeIdx(idx)}
                  style={{
                    padding: "8px 12px",
                    border: "none",
                    borderBottom: isActive
                      ? "2px solid var(--cobalt-600)"
                      : "2px solid transparent",
                    background: "transparent",
                    color: isActive ? "var(--ink)" : "var(--ink-muted)",
                    fontSize: "12px",
                    fontWeight: isActive ? 600 : 400,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  {NOTICE_TYPE_LABELS[req.noticeType]}
                  {req.implemented && (
                    <CheckCircle2
                      size={12}
                      style={{
                        marginLeft: "6px",
                        verticalAlign: "middle",
                        color: "var(--emerald-400, #059669)",
                      }}
                    />
                  )}
                </button>
              )
            })}
          </div>
        )}

        {/* Body */}
        <div style={{ padding: "20px", maxHeight: "70vh", overflowY: "auto" }}>
          {active && (
            <NoticeDetail
              key={active.noticeType}
              systemId={system.systemId}
              requirement={active}
              onChanged={onChanged}
            />
          )}
        </div>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
//   Notice detail — placement/language tabs + template preview + actions
// ────────────────────────────────────────────────────────────────────────────

function NoticeDetail({
  systemId,
  requirement,
  onChanged,
}: {
  systemId: string
  requirement: AnnotatedRequirement
  onChanged: () => void | Promise<void>
}) {
  // Sane defaults: prefer existing implementation's combo, else RO+popup (or first available).
  const defaultLang: TransparencyLanguage =
    requirement.implementation?.language ||
    (requirement.templates.some((t) => t.language === "ro") ? "ro" : "en")
  const defaultPlacement: TransparencyPlacement =
    requirement.implementation?.placement ||
    requirement.templates[0]?.placement ||
    "popup"

  const [language, setLanguage] = useState<TransparencyLanguage>(defaultLang)
  const [placement, setPlacement] = useState<TransparencyPlacement>(defaultPlacement)
  const [contactEmail, setContactEmail] = useState("")
  const [settingsUrl, setSettingsUrl] = useState("")
  const [notes, setNotes] = useState(requirement.implementation?.notes ?? "")

  const [generated, setGenerated] = useState<{
    text: string
    shortText?: string
    html?: string
  } | null>(null)
  const [generating, setGenerating] = useState(false)
  const [implementing, setImplementing] = useState(false)
  const [copyState, setCopyState] = useState<"idle" | "html" | "text">("idle")
  const [feedback, setFeedback] = useState<string | null>(null)

  const availablePlacements = useMemo(() => {
    const set = new Set<TransparencyPlacement>()
    requirement.templates.forEach((t) => set.add(t.placement))
    // Permite și placement-uri care nu au template direct — fallback la limba.
    ALL_PLACEMENTS.forEach((p) => set.add(p))
    return Array.from(set)
  }, [requirement.templates])

  const generate = useCallback(async () => {
    setGenerating(true)
    setFeedback(null)
    try {
      const res = await fetch("/api/transparency/notices/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemId,
          noticeType: requirement.noticeType,
          placement,
          language,
          substitutions: {
            contactEmail: contactEmail || undefined,
            settingsUrl: settingsUrl || undefined,
          },
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setFeedback(data?.error || `Eroare ${res.status}`)
        setGenerated(null)
      } else {
        setGenerated({
          text: data.template?.text ?? "",
          shortText: data.template?.shortText,
          html: data.template?.html,
        })
      }
    } catch (e) {
      setFeedback(e instanceof Error ? e.message : "Eroare la generare")
    } finally {
      setGenerating(false)
    }
  }, [systemId, requirement.noticeType, placement, language, contactEmail, settingsUrl])

  // Auto-generate when tabs change
  useEffect(() => {
    void generate()
  }, [generate])

  async function copy(payload: string, which: "html" | "text") {
    try {
      await navigator.clipboard.writeText(payload)
      setCopyState(which)
      setTimeout(() => setCopyState("idle"), 1500)
    } catch {
      setFeedback("Clipboard indisponibil — selectează manual textul.")
    }
  }

  async function markImplemented() {
    setImplementing(true)
    setFeedback(null)
    try {
      const res = await fetch("/api/transparency/notices/implement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemId,
          noticeType: requirement.noticeType,
          placement,
          language,
          notes: notes || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setFeedback(data?.error || `Eroare ${res.status}`)
      } else {
        setFeedback("✓ Marcat ca implementat.")
        await onChanged()
      }
    } catch (e) {
      setFeedback(e instanceof Error ? e.message : "Eroare la marcare")
    } finally {
      setImplementing(false)
    }
  }

  async function unmarkImplemented() {
    if (!requirement.implementation) return
    setImplementing(true)
    setFeedback(null)
    try {
      const res = await fetch(
        `/api/transparency/notices/implement?id=${encodeURIComponent(
          requirement.implementation.id
        )}`,
        { method: "DELETE" }
      )
      const data = await res.json()
      if (!res.ok) {
        setFeedback(data?.error || `Eroare ${res.status}`)
      } else {
        setFeedback("Implementare ștearsă.")
        await onChanged()
      }
    } catch (e) {
      setFeedback(e instanceof Error ? e.message : "Eroare")
    } finally {
      setImplementing(false)
    }
  }

  const severity = severityColor(requirement.severity)

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Requirement summary */}
      <div
        style={{
          padding: "14px 16px",
          background: severity.bg,
          border: `1px solid ${severity.border}`,
          borderRadius: "8px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "6px",
          }}
        >
          <span
            style={{
              fontSize: "11px",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              color: severity.fg,
              fontWeight: 600,
            }}
          >
            {requirement.severity} · {requirement.article}
          </span>
          {requirement.implemented && (
            <span
              style={{
                fontSize: "11px",
                color: "var(--emerald-400, #059669)",
                display: "inline-flex",
                alignItems: "center",
                gap: "3px",
              }}
            >
              <CheckCircle2 size={11} /> Implementat
            </span>
          )}
        </div>
        <div style={{ fontSize: "13px", color: "var(--ink)", lineHeight: 1.5 }}>
          {requirement.obligation}
        </div>
        <div
          style={{
            fontSize: "11px",
            color: "var(--ink-muted)",
            marginTop: "8px",
            fontStyle: "italic",
          }}
        >
          {requirement.triggeredBy}
        </div>
        <div style={{ fontSize: "11px", color: "var(--ink-dim)", marginTop: "4px" }}>
          Deadline aplicabilitate: <strong>{requirement.deadline}</strong>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        <div>
          <div
            style={{
              fontSize: "11px",
              color: "var(--ink-dim)",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              marginBottom: "6px",
            }}
          >
            Limba
          </div>
          <div style={{ display: "flex", gap: "4px" }}>
            {ALL_LANGUAGES.map((lang) => {
              const isActive = lang === language
              return (
                <button
                  key={lang}
                  onClick={() => setLanguage(lang)}
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    borderRadius: "6px",
                    border: isActive
                      ? "1px solid var(--cobalt-600)"
                      : "1px solid var(--border)",
                    background: isActive ? "var(--cobalt-600)" : "var(--bg-raised)",
                    color: isActive ? "#fff" : "var(--ink)",
                    fontSize: "12px",
                    fontWeight: isActive ? 600 : 400,
                    cursor: "pointer",
                    textTransform: "uppercase",
                  }}
                >
                  {lang}
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <div
            style={{
              fontSize: "11px",
              color: "var(--ink-dim)",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              marginBottom: "6px",
            }}
          >
            Placement
          </div>
          <select
            value={placement}
            onChange={(e) => setPlacement(e.target.value as TransparencyPlacement)}
            style={{
              width: "100%",
              padding: "8px 10px",
              borderRadius: "6px",
              border: "1px solid var(--border)",
              background: "var(--bg-raised)",
              color: "var(--ink)",
              fontSize: "12px",
            }}
          >
            {availablePlacements.map((p) => (
              <option key={p} value={p}>
                {PLACEMENT_LABELS[p]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Optional substitutions */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        <div>
          <label
            style={{
              fontSize: "11px",
              color: "var(--ink-dim)",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              display: "block",
              marginBottom: "6px",
            }}
          >
            Email contact (opțional)
          </label>
          <input
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            placeholder="contact@firma.ro"
            style={{
              width: "100%",
              padding: "8px 10px",
              borderRadius: "6px",
              border: "1px solid var(--border)",
              background: "var(--bg-raised)",
              color: "var(--ink)",
              fontSize: "12px",
            }}
          />
        </div>
        <div>
          <label
            style={{
              fontSize: "11px",
              color: "var(--ink-dim)",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              display: "block",
              marginBottom: "6px",
            }}
          >
            URL preferințe (opțional)
          </label>
          <input
            type="url"
            value={settingsUrl}
            onChange={(e) => setSettingsUrl(e.target.value)}
            placeholder="https://firma.ro/preferinte"
            style={{
              width: "100%",
              padding: "8px 10px",
              borderRadius: "6px",
              border: "1px solid var(--border)",
              background: "var(--bg-raised)",
              color: "var(--ink)",
              fontSize: "12px",
            }}
          />
        </div>
      </div>

      {/* Preview */}
      <div>
        <div
          style={{
            fontSize: "11px",
            color: "var(--ink-dim)",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            marginBottom: "6px",
          }}
        >
          Text notice
        </div>
        <div
          style={{
            padding: "14px 16px",
            background: "var(--bg-raised)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            fontSize: "13px",
            color: "var(--ink)",
            lineHeight: 1.5,
            minHeight: "60px",
            whiteSpace: "pre-wrap",
            position: "relative",
          }}
        >
          {generating ? (
            <span
              style={{
                color: "var(--ink-dim)",
                fontStyle: "italic",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} />
              Se generează…
            </span>
          ) : (
            generated?.text || "—"
          )}
        </div>

        <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
          <button
            onClick={() => generated?.text && copy(generated.text, "text")}
            disabled={!generated?.text}
            style={{
              padding: "8px 12px",
              borderRadius: "6px",
              border: "1px solid var(--border)",
              background: "var(--bg-raised)",
              color: "var(--ink)",
              fontSize: "12px",
              fontWeight: 500,
              cursor: generated?.text ? "pointer" : "not-allowed",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              opacity: generated?.text ? 1 : 0.5,
            }}
          >
            <Copy size={12} />
            {copyState === "text" ? "Copiat!" : "Copiază text"}
          </button>
          <button
            onClick={() => generated?.html && copy(generated.html, "html")}
            disabled={!generated?.html}
            style={{
              padding: "8px 12px",
              borderRadius: "6px",
              border: "1px solid var(--border)",
              background: "var(--bg-raised)",
              color: "var(--ink)",
              fontSize: "12px",
              fontWeight: 500,
              cursor: generated?.html ? "pointer" : "not-allowed",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              opacity: generated?.html ? 1 : 0.5,
            }}
          >
            <Copy size={12} />
            {copyState === "html" ? "Copiat!" : "Copiază HTML snippet"}
          </button>
        </div>
      </div>

      {/* HTML preview */}
      {generated?.html && (
        <details>
          <summary
            style={{
              fontSize: "11px",
              color: "var(--ink-dim)",
              cursor: "pointer",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              marginBottom: "6px",
            }}
          >
            HTML source (click)
          </summary>
          <pre
            style={{
              fontFamily: "ui-monospace, SF Mono, Consolas, monospace",
              fontSize: "11px",
              padding: "12px",
              background: "var(--bg-code, #0f172a)",
              color: "#e2e8f0",
              borderRadius: "6px",
              border: "1px solid var(--border)",
              overflowX: "auto",
              margin: "6px 0 0",
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
            }}
          >
            {generated.html}
          </pre>
        </details>
      )}

      {/* Notes + implement controls */}
      <div>
        <label
          style={{
            fontSize: "11px",
            color: "var(--ink-dim)",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            display: "block",
            marginBottom: "6px",
          }}
        >
          Note implementare (opțional — unde ai pus notice-ul)
        </label>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="ex: footer pe /chat, popup la prima vizită"
          style={{
            width: "100%",
            padding: "8px 10px",
            borderRadius: "6px",
            border: "1px solid var(--border)",
            background: "var(--bg-raised)",
            color: "var(--ink)",
            fontSize: "12px",
          }}
        />
      </div>

      <div
        style={{
          display: "flex",
          gap: "8px",
          paddingTop: "8px",
          borderTop: "1px solid var(--border-soft)",
        }}
      >
        <button
          onClick={markImplemented}
          disabled={implementing || generating}
          style={{
            padding: "9px 14px",
            borderRadius: "6px",
            border: "1px solid var(--cobalt-600)",
            background: "var(--cobalt-600)",
            color: "#fff",
            fontSize: "13px",
            fontWeight: 600,
            cursor: implementing ? "wait" : "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            opacity: implementing ? 0.7 : 1,
          }}
        >
          {implementing ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> : <CheckCircle2 size={12} />}
          {requirement.implemented ? "Actualizează implementare" : "Marchează ca implementat"}
        </button>
        {requirement.implementation && (
          <button
            onClick={unmarkImplemented}
            disabled={implementing}
            style={{
              padding: "9px 14px",
              borderRadius: "6px",
              border: "1px solid var(--border)",
              background: "var(--bg-raised)",
              color: "var(--ink-muted)",
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            Anulează marcaj
          </button>
        )}
      </div>

      {feedback && (
        <div
          style={{
            fontSize: "12px",
            padding: "10px 12px",
            background: "var(--bg-raised)",
            border: "1px solid var(--border)",
            borderRadius: "6px",
            color: "var(--ink)",
          }}
        >
          {feedback}
        </div>
      )}

      {requirement.implementation && (
        <div
          style={{
            fontSize: "11px",
            color: "var(--ink-dim)",
            padding: "8px 12px",
            background: "var(--bg-raised)",
            border: "1px solid var(--border-soft)",
            borderRadius: "6px",
          }}
        >
          Ultima implementare: {new Date(requirement.implementation.implementedAtISO).toLocaleString("ro-RO")} ·{" "}
          {requirement.implementation.implementedByEmail} · {requirement.implementation.placement} ·{" "}
          {requirement.implementation.language.toUpperCase()}
          {requirement.implementation.notes && (
            <>
              <br />
              <em>Notă: {requirement.implementation.notes}</em>
            </>
          )}
        </div>
      )}

      {/* Helpful link */}
      <a
        href="https://eur-lex.europa.eu/eli/reg/2024/1689/oj"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          fontSize: "11px",
          color: "var(--cobalt-600)",
          textDecoration: "none",
          display: "inline-flex",
          alignItems: "center",
          gap: "4px",
        }}
      >
        <ExternalLink size={11} />
        Textul oficial EU AI Act (EUR-Lex)
      </a>

      {/* Silence unused-import linting */}
      <span style={{ display: "none" }}>
        <MessageSquare size={1} />
      </span>
    </div>
  )
}
