"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Loader2,
  MessageSquare,
  Music,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Upload,
  Video,
  X,
} from "lucide-react"

import type {
  AIContentAssetType,
  AIContentEvidenceItem,
  AIContentEvidenceType,
  AIContentLabeledAsset,
  ContentLabelingStandard,
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
  advertisement: "Reclamă plătită",
  "social-post": "Post social media",
  broadcast: "Email broadcast",
}

const ALL_PLACEMENTS: TransparencyPlacement[] = [
  "popup",
  "footer",
  "header",
  "email-signature",
  "video-overlay",
  "inline",
  "advertisement",
  "social-post",
  "broadcast",
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

type TabKey = "notices" | "content-register"

export default function TransparencyPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("notices")
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
          interacționează cu persoane fizice sau produc conținut sintetic. În tabul „Content
          Register” poți înregistra individual fiecare piesă de conținut AI (imagine, video,
          deepfake, text public-interest, chatbot) cu dovada provider + deployer duty.
        </p>
      </div>

      {/* Tab switcher */}
      <div
        role="tablist"
        aria-label="Tabs transparency"
        style={{
          display: "flex",
          gap: "4px",
          borderBottom: "1px solid var(--border-soft)",
          paddingBottom: "0",
        }}
      >
        {([
          { key: "notices" as TabKey, label: "Notice-uri per sistem" },
          { key: "content-register" as TabKey, label: "Content Register (per asset)" },
        ]).map((tab) => {
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: "10px 16px",
                background: "transparent",
                border: "none",
                borderBottom: isActive
                  ? "2px solid var(--cobalt-600)"
                  : "2px solid transparent",
                color: isActive ? "var(--ink)" : "var(--ink-muted)",
                fontWeight: isActive ? 600 : 500,
                fontSize: "13px",
                cursor: "pointer",
                marginBottom: "-1px",
              }}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {activeTab === "content-register" && <ContentRegisterTab />}

      {activeTab === "notices" && (
      <>
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
      </>
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

// ============================================================================
//   Sprint 023.7 — Content Register tab (per-asset Art. 50)
// ============================================================================

type AnnotatedAsset = AIContentLabeledAsset & {
  gap: { providerGap?: string; deployerGap?: string; editorialGap?: string }
  hasAnyGap: boolean
  appliedDutyType: "provider_marking" | "deployer_disclosure" | "both"
}

type ContentRegisterResponse = {
  assets: AnnotatedAsset[]
  summary: {
    total: number
    withProviderMarking: number
    withDeployerDisclosure: number
    publicInterestReviewed: number
    unresolvedGaps: number
    byType: Partial<Record<AIContentAssetType, number>>
  }
  schema: {
    version: string
    assetTypes: AIContentAssetType[]
    standards: ContentLabelingStandard[]
    placements: TransparencyPlacement[]
    languages: TransparencyLanguage[]
  }
}

const ASSET_TYPE_LABELS: Record<AIContentAssetType, string> = {
  image: "Imagine sintetică",
  video: "Video sintetic",
  audio: "Audio sintetic",
  text_synthetic: "Text sintetic",
  deepfake: "Deepfake (Art. 50(4)(a))",
  public_interest_text: "Text public-interest (Art. 50(4)(b))",
  chatbot_interaction: "Sesiune chatbot (Art. 50(1))",
  other: "Altul",
}

const STANDARD_LABELS: Record<ContentLabelingStandard, string> = {
  c2pa: "C2PA",
  iptc_photo_metadata: "IPTC PhotoMetadata",
  watermark_visible: "Watermark vizibil",
  watermark_invisible: "Watermark invizibil (SynthID etc.)",
  metadata_only: "Metadata generică",
  none: "— niciunul —",
}

const PLACEMENT_LABELS_FULL: Record<TransparencyPlacement, string> = {
  popup: "Popup / modal",
  footer: "Footer pagină",
  header: "Banner header",
  "email-signature": "Semnătură email",
  "video-overlay": "Overlay video",
  inline: "Inline / badge",
  advertisement: "Reclamă plătită",
  "social-post": "Post social media",
  broadcast: "Email broadcast / newsletter / push",
}

const EVIDENCE_TYPE_LABELS: Record<AIContentEvidenceType, string> = {
  screenshot: "Screenshot disclosure",
  sample_file: "Fișier exemplu",
  metadata_proof: "Dovadă metadata (C2PA/IPTC)",
  editorial_log: "Log editorial",
  watermark_test: "Test watermark",
  other: "Altul",
}

function iconForType(type: AIContentAssetType): React.ReactNode {
  switch (type) {
    case "image":
      return <ImageIcon size={14} />
    case "video":
      return <Video size={14} />
    case "audio":
      return <Music size={14} />
    case "deepfake":
      return <ShieldAlert size={14} style={{ color: "#dc2626" }} />
    case "chatbot_interaction":
      return <MessageSquare size={14} />
    default:
      return <FileText size={14} />
  }
}

function ContentRegisterTab() {
  const [data, setData] = useState<ContentRegisterResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [expandedAssetId, setExpandedAssetId] = useState<string | null>(null)
  const [filterType, setFilterType] = useState<AIContentAssetType | "all">("all")
  const [filterGap, setFilterGap] = useState<"all" | "with-gap" | "no-gap">("all")

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/transparency/content-assets", {
        cache: "no-store",
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body?.error || `HTTP ${res.status}`)
        return
      }
      const json = (await res.json()) as ContentRegisterResponse
      setData(json)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Eroare la încărcare")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = useMemo(() => {
    if (!data) return []
    let out = data.assets
    if (filterType !== "all") out = out.filter((a) => a.assetType === filterType)
    if (filterGap === "with-gap") out = out.filter((a) => a.hasAnyGap)
    if (filterGap === "no-gap") out = out.filter((a) => !a.hasAnyGap)
    return out
  }, [data, filterType, filterGap])

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Stats grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: "10px",
        }}
      >
        {[
          { label: "Total assets", value: data?.summary.total ?? 0 },
          {
            label: "Cu provider marking",
            value: data?.summary.withProviderMarking ?? 0,
          },
          {
            label: "Cu deployer disclosure",
            value: data?.summary.withDeployerDisclosure ?? 0,
          },
          {
            label: "Public-interest review",
            value: data?.summary.publicInterestReviewed ?? 0,
          },
          {
            label: "Unresolved gaps",
            value: data?.summary.unresolvedGaps ?? 0,
            danger: (data?.summary.unresolvedGaps ?? 0) > 0,
          },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              padding: "12px",
              background: "var(--bg-raised)",
              borderRadius: "8px",
              border: `1px solid ${stat.danger ? "rgba(248,113,113,0.4)" : "var(--border)"}`,
            }}
          >
            <div
              style={{
                fontSize: "22px",
                fontWeight: 600,
                color: stat.danger ? "#dc2626" : "var(--ink)",
                fontFamily: "var(--font-display-v3)",
              }}
            >
              {stat.value}
            </div>
            <div
              style={{
                fontSize: "11px",
                color: "var(--ink-dim)",
                marginTop: "2px",
              }}
            >
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Filters + add button */}
      <div
        style={{
          display: "flex",
          gap: "10px",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <select
            value={filterType}
            onChange={(e) =>
              setFilterType(e.target.value as AIContentAssetType | "all")
            }
            style={{
              padding: "6px 10px",
              border: "1px solid var(--border)",
              borderRadius: "6px",
              background: "var(--bg)",
              color: "var(--ink)",
              fontSize: "12px",
            }}
          >
            <option value="all">Toate tipurile</option>
            {Object.entries(ASSET_TYPE_LABELS).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
          <select
            value={filterGap}
            onChange={(e) =>
              setFilterGap(e.target.value as "all" | "with-gap" | "no-gap")
            }
            style={{
              padding: "6px 10px",
              border: "1px solid var(--border)",
              borderRadius: "6px",
              background: "var(--bg)",
              color: "var(--ink)",
              fontSize: "12px",
            }}
          >
            <option value="all">Toate gap-urile</option>
            <option value="with-gap">Doar cu gap nerezolvat</option>
            <option value="no-gap">Doar fără gap</option>
          </select>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          style={{
            padding: "8px 14px",
            borderRadius: "6px",
            border: "1px solid var(--cobalt-600)",
            background: "var(--cobalt-600)",
            color: "#fff",
            fontSize: "13px",
            fontWeight: 500,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <Plus size={14} />
          Adaugă asset
        </button>
      </div>

      {/* Loading / error */}
      {loading && (
        <div
          style={{
            fontSize: "13px",
            color: "var(--ink-dim)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
          Se încarcă registrul de content assets…
        </div>
      )}
      {error && !loading && (
        <div
          role="alert"
          style={{
            padding: "12px 14px",
            background: "rgba(248,113,113,0.10)",
            border: "1px solid rgba(248,113,113,0.30)",
            borderRadius: "8px",
            fontSize: "13px",
            color: "#dc2626",
          }}
        >
          {error}
        </div>
      )}

      {/* Asset list */}
      {!loading && !error && data && filtered.length === 0 && (
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
          Niciun asset înregistrat. Înregistrează prima piesă de conținut AI
          (imagine, video, deepfake, text public-interest, chatbot) cu butonul
          „Adaugă asset".
        </div>
      )}
      {!loading && !error && data && filtered.length > 0 && (
        <div
          style={{
            background: "var(--bg-raised)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            overflow: "hidden",
          }}
        >
          {filtered.map((asset) => {
            const isExpanded = expandedAssetId === asset.id
            return (
              <div
                key={asset.id}
                style={{
                  borderBottom: "1px solid var(--border-soft)",
                }}
              >
                <button
                  onClick={() =>
                    setExpandedAssetId(isExpanded ? null : asset.id)
                  }
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    display: "grid",
                    gridTemplateColumns: "auto 1.6fr 1fr 1fr 1fr auto",
                    gap: "12px",
                    alignItems: "center",
                    textAlign: "left",
                    color: "var(--ink)",
                  }}
                >
                  {iconForType(asset.assetType)}
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 500 }}>
                      {asset.title}
                    </div>
                    <div
                      style={{
                        fontSize: "11px",
                        color: "var(--ink-dim)",
                        marginTop: "2px",
                      }}
                    >
                      {ASSET_TYPE_LABELS[asset.assetType]}
                      {asset.distributionContext.length > 0 &&
                        ` · ${asset.distributionContext.join(", ")}`}
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: "11px",
                      color: asset.providerMarkingApplied
                        ? "var(--emerald-400, #059669)"
                        : "var(--ink-dim)",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    {asset.providerMarkingApplied ? (
                      <ShieldCheck size={12} />
                    ) : (
                      <ShieldAlert size={12} />
                    )}
                    {asset.providerMarkingApplied
                      ? STANDARD_LABELS[asset.providerMarkingStandard]
                      : "Fără mark"}
                  </div>
                  <div
                    style={{
                      fontSize: "11px",
                      color: asset.deployerDisclosureApplied
                        ? "var(--emerald-400, #059669)"
                        : "var(--ink-dim)",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    {asset.deployerDisclosureApplied ? (
                      <CheckCircle2 size={12} />
                    ) : (
                      <X size={12} />
                    )}
                    {asset.deployerDisclosureApplied
                      ? (asset.deployerDisclosurePlacement
                          ? PLACEMENT_LABELS_FULL[asset.deployerDisclosurePlacement]
                          : "DA")
                      : "Fără disclosure"}
                  </div>
                  <div>
                    {asset.hasAnyGap ? (
                      <span
                        style={{
                          fontSize: "11px",
                          padding: "2px 6px",
                          borderRadius: "999px",
                          background: "rgba(248,113,113,0.12)",
                          color: "#dc2626",
                          border: "1px solid rgba(248,113,113,0.30)",
                        }}
                      >
                        {[
                          asset.gap.providerGap ? "provider" : null,
                          asset.gap.deployerGap ? "deployer" : null,
                          asset.gap.editorialGap ? "editorial" : null,
                        ]
                          .filter(Boolean)
                          .join(", ")}
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: "11px",
                          color: "var(--emerald-400, #059669)",
                          display: "inline-flex",
                          gap: "4px",
                          alignItems: "center",
                        }}
                      >
                        <CheckCircle2 size={11} /> Complet
                      </span>
                    )}
                  </div>
                  {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                {isExpanded && (
                  <ContentAssetDetails asset={asset} onChanged={load} />
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Create modal */}
      {showCreate && data && (
        <ContentAssetCreateModal
          schema={data.schema}
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false)
            void load()
          }}
        />
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
//   Inline expanded asset details panel
// ────────────────────────────────────────────────────────────────────────────

function ContentAssetDetails({
  asset,
  onChanged,
}: {
  asset: AnnotatedAsset
  onChanged: () => void | Promise<void>
}) {
  const [showEvidence, setShowEvidence] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const markProviderApplied = async () => {
    setBusy("provider")
    setActionError(null)
    try {
      const res = await fetch(`/api/transparency/content-assets/${asset.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerMarkingApplied: true,
          providerMarkingStandard:
            asset.providerMarkingStandard === "none"
              ? "c2pa"
              : asset.providerMarkingStandard,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error || `HTTP ${res.status}`)
      }
      await onChanged()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Eroare")
    } finally {
      setBusy(null)
    }
  }

  const markDeployerApplied = async () => {
    setBusy("deployer")
    setActionError(null)
    try {
      const res = await fetch(`/api/transparency/content-assets/${asset.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deployerDisclosureApplied: true,
          deployerDisclosurePlacement:
            asset.deployerDisclosurePlacement ?? "footer",
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error || `HTTP ${res.status}`)
      }
      await onChanged()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Eroare")
    } finally {
      setBusy(null)
    }
  }

  const deleteAsset = async () => {
    if (
      !window.confirm(
        `Ștergi asset-ul „${asset.title}"? Toate findings linkate se închid automat.`,
      )
    )
      return
    setBusy("delete")
    setActionError(null)
    try {
      const res = await fetch(`/api/transparency/content-assets/${asset.id}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error || `HTTP ${res.status}`)
      }
      await onChanged()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Eroare")
    } finally {
      setBusy(null)
    }
  }

  return (
    <div
      style={{
        padding: "16px 24px 20px",
        background: "var(--bg)",
        borderTop: "1px solid var(--border-soft)",
      }}
    >
      {/* Gap warnings */}
      {asset.hasAnyGap && (
        <div
          style={{
            marginBottom: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          {asset.gap.providerGap && (
            <div
              style={{
                padding: "10px 12px",
                background: "rgba(251,146,60,0.12)",
                borderRadius: "6px",
                border: "1px solid rgba(251,146,60,0.30)",
                fontSize: "12px",
                color: "#c2410c",
              }}
            >
              <strong>Provider gap (Art. 50(2)):</strong> {asset.gap.providerGap}
            </div>
          )}
          {asset.gap.deployerGap && (
            <div
              style={{
                padding: "10px 12px",
                background: "rgba(248,113,113,0.12)",
                borderRadius: "6px",
                border: "1px solid rgba(248,113,113,0.30)",
                fontSize: "12px",
                color: "#dc2626",
              }}
            >
              <strong>Deployer gap:</strong> {asset.gap.deployerGap}
            </div>
          )}
          {asset.gap.editorialGap && (
            <div
              style={{
                padding: "10px 12px",
                background: "rgba(250,204,21,0.12)",
                borderRadius: "6px",
                border: "1px solid rgba(250,204,21,0.30)",
                fontSize: "12px",
                color: "#a16207",
              }}
            >
              <strong>Editorial gap (Art. 50(4)(b)):</strong>{" "}
              {asset.gap.editorialGap}
            </div>
          )}
        </div>
      )}

      {/* Sections grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "16px",
          fontSize: "12px",
          color: "var(--ink)",
        }}
      >
        <div>
          <div style={{ fontWeight: 600, marginBottom: "6px" }}>
            A. Provider duty (Art. 50(2))
          </div>
          <div style={{ color: "var(--ink-muted)" }}>
            Marcaj aplicat: <strong>{asset.providerMarkingApplied ? "DA" : "NU"}</strong>
          </div>
          <div style={{ color: "var(--ink-muted)" }}>
            Standard: <strong>{STANDARD_LABELS[asset.providerMarkingStandard]}</strong>
          </div>
          {asset.providerMarkingProof && (
            <div style={{ color: "var(--ink-muted)", marginTop: "4px" }}>
              Dovadă: <span>{asset.providerMarkingProof}</span>
            </div>
          )}
        </div>
        <div>
          <div style={{ fontWeight: 600, marginBottom: "6px" }}>
            B. Deployer duty (Art. 50(1)/(3)/(4))
          </div>
          <div style={{ color: "var(--ink-muted)" }}>
            Disclosure aplicat:{" "}
            <strong>{asset.deployerDisclosureApplied ? "DA" : "NU"}</strong>
          </div>
          {asset.deployerDisclosurePlacement && (
            <div style={{ color: "var(--ink-muted)" }}>
              Placement:{" "}
              <strong>
                {PLACEMENT_LABELS_FULL[asset.deployerDisclosurePlacement]}
              </strong>
            </div>
          )}
          {asset.deployerDisclosureLanguage && (
            <div style={{ color: "var(--ink-muted)" }}>
              Limbă:{" "}
              <strong>{asset.deployerDisclosureLanguage.toUpperCase()}</strong>
            </div>
          )}
          {asset.deployerDisclosureText && (
            <div style={{ color: "var(--ink-muted)", marginTop: "4px" }}>
              Text: <em>„{asset.deployerDisclosureText}"</em>
            </div>
          )}
        </div>
        {(asset.assetType === "public_interest_text" ||
          asset.isPublicInterest) && (
          <div>
            <div style={{ fontWeight: 600, marginBottom: "6px" }}>
              C. Editorial review (Art. 50(4)(b))
            </div>
            <div style={{ color: "var(--ink-muted)" }}>
              Editorial responsibility claim:{" "}
              <strong>{asset.editorialResponsibilityClaim ? "DA" : "NU"}</strong>
            </div>
            {asset.editorialReviewBy && (
              <div style={{ color: "var(--ink-muted)" }}>
                Editor: <strong>{asset.editorialReviewBy}</strong>
              </div>
            )}
            {asset.editorialReviewAtISO && (
              <div style={{ color: "var(--ink-muted)" }}>
                Data revizuire: <strong>{asset.editorialReviewAtISO}</strong>
              </div>
            )}
          </div>
        )}
        <div>
          <div style={{ fontWeight: 600, marginBottom: "6px" }}>
            D. Evidence ({asset.evidenceItems.length})
          </div>
          {asset.evidenceItems.length === 0 ? (
            <div style={{ color: "var(--ink-dim)", fontStyle: "italic" }}>
              Nicio dovadă atașată.
            </div>
          ) : (
            <ul
              style={{
                margin: 0,
                paddingLeft: "16px",
                color: "var(--ink-muted)",
              }}
            >
              {asset.evidenceItems.map((ev) => (
                <li key={ev.id} style={{ marginBottom: "4px" }}>
                  <strong>{EVIDENCE_TYPE_LABELS[ev.type]}:</strong>{" "}
                  {ev.description}
                  {ev.url && (
                    <>
                      {" "}
                      <a
                        href={ev.url}
                        target="_blank"
                        rel="noreferrer noopener"
                        style={{ color: "var(--cobalt-600)" }}
                      >
                        link
                      </a>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Findings linked */}
      {asset.linkedFindingIds.length > 0 && (
        <div
          style={{
            marginTop: "12px",
            fontSize: "11px",
            color: "var(--ink-dim)",
          }}
        >
          Findings linkate:{" "}
          {asset.linkedFindingIds.map((fid) => (
            <a
              key={fid}
              href={`/dashboard/resolve/${fid}`}
              style={{
                color: "var(--cobalt-600)",
                marginRight: "8px",
                textDecoration: "underline",
              }}
            >
              {fid}
            </a>
          ))}
        </div>
      )}

      {/* Actions */}
      <div
        style={{
          marginTop: "16px",
          display: "flex",
          gap: "8px",
          flexWrap: "wrap",
        }}
      >
        {!asset.providerMarkingApplied && (
          <button
            onClick={markProviderApplied}
            disabled={busy !== null}
            style={{
              padding: "6px 12px",
              borderRadius: "6px",
              border: "1px solid var(--border)",
              background: "var(--bg-raised)",
              color: "var(--ink)",
              fontSize: "12px",
              cursor: busy ? "not-allowed" : "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            {busy === "provider" ? (
              <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} />
            ) : (
              <ShieldCheck size={12} />
            )}
            Marchează provider mark aplicat
          </button>
        )}
        {!asset.deployerDisclosureApplied && (
          <button
            onClick={markDeployerApplied}
            disabled={busy !== null}
            style={{
              padding: "6px 12px",
              borderRadius: "6px",
              border: "1px solid var(--border)",
              background: "var(--bg-raised)",
              color: "var(--ink)",
              fontSize: "12px",
              cursor: busy ? "not-allowed" : "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            {busy === "deployer" ? (
              <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} />
            ) : (
              <CheckCircle2 size={12} />
            )}
            Marchează deployer disclosure aplicat
          </button>
        )}
        <button
          onClick={() => setShowEvidence(true)}
          style={{
            padding: "6px 12px",
            borderRadius: "6px",
            border: "1px solid var(--border)",
            background: "var(--bg-raised)",
            color: "var(--ink)",
            fontSize: "12px",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <Upload size={12} />
          Atașează dovadă
        </button>
        <button
          onClick={deleteAsset}
          disabled={busy !== null}
          style={{
            padding: "6px 12px",
            borderRadius: "6px",
            border: "1px solid rgba(248,113,113,0.30)",
            background: "rgba(248,113,113,0.06)",
            color: "#dc2626",
            fontSize: "12px",
            cursor: busy ? "not-allowed" : "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          {busy === "delete" ? (
            <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} />
          ) : (
            <Trash2 size={12} />
          )}
          Șterge
        </button>
      </div>

      {actionError && (
        <div
          role="alert"
          style={{
            marginTop: "10px",
            padding: "8px 10px",
            background: "rgba(248,113,113,0.10)",
            border: "1px solid rgba(248,113,113,0.30)",
            borderRadius: "6px",
            fontSize: "12px",
            color: "#dc2626",
          }}
        >
          {actionError}
        </div>
      )}

      {showEvidence && (
        <AttachEvidenceModal
          assetId={asset.id}
          onClose={() => setShowEvidence(false)}
          onAttached={() => {
            setShowEvidence(false)
            void onChanged()
          }}
        />
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
//   Create asset modal
// ────────────────────────────────────────────────────────────────────────────

function ContentAssetCreateModal({
  schema,
  onClose,
  onCreated,
}: {
  schema: ContentRegisterResponse["schema"]
  onClose: () => void
  onCreated: () => void | Promise<void>
}) {
  const [title, setTitle] = useState("")
  const [assetType, setAssetType] = useState<AIContentAssetType>("image")
  const [distributionContext, setDistributionContext] = useState("")
  const [providerMarkingApplied, setProviderMarkingApplied] = useState(false)
  const [providerMarkingStandard, setProviderMarkingStandard] =
    useState<ContentLabelingStandard>("none")
  const [providerMarkingProof, setProviderMarkingProof] = useState("")
  const [deployerDisclosureApplied, setDeployerDisclosureApplied] = useState(false)
  const [deployerDisclosurePlacement, setDeployerDisclosurePlacement] =
    useState<TransparencyPlacement>("footer")
  const [deployerDisclosureText, setDeployerDisclosureText] = useState("")
  const [deployerDisclosureLanguage, setDeployerDisclosureLanguage] =
    useState<TransparencyLanguage>("ro")
  const [isPublicInterest, setIsPublicInterest] = useState(false)
  const [editorialReviewBy, setEditorialReviewBy] = useState("")
  const [editorialResponsibilityClaim, setEditorialResponsibilityClaim] =
    useState(false)
  const [notes, setNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const showPublicInterestSection =
    assetType === "public_interest_text" || isPublicInterest

  const submit = async () => {
    setError(null)
    if (!title.trim()) {
      setError("Titlul este obligatoriu.")
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch("/api/transparency/content-assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          assetType,
          distributionContext: distributionContext
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          providerMarkingApplied,
          providerMarkingStandard,
          providerMarkingProof: providerMarkingProof.trim() || undefined,
          deployerDisclosureApplied,
          deployerDisclosurePlacement: deployerDisclosureApplied
            ? deployerDisclosurePlacement
            : undefined,
          deployerDisclosureText: deployerDisclosureApplied
            ? deployerDisclosureText.trim() || undefined
            : undefined,
          deployerDisclosureLanguage: deployerDisclosureApplied
            ? deployerDisclosureLanguage
            : undefined,
          isPublicInterest: isPublicInterest || undefined,
          editorialReviewBy: editorialReviewBy.trim() || undefined,
          editorialResponsibilityClaim: showPublicInterestSection
            ? editorialResponsibilityClaim
            : undefined,
          notes: notes.trim() || undefined,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error || `HTTP ${res.status}`)
      }
      await onCreated()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Eroare")
    } finally {
      setSubmitting(false)
    }
  }

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
          maxWidth: "720px",
          background: "var(--bg)",
          border: "1px solid var(--border)",
          borderRadius: "12px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
        }}
      >
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--border-soft)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
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
            Adaugă asset — Content Register Art. 50
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

        <div
          style={{
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            maxHeight: "70vh",
            overflowY: "auto",
          }}
        >
          {/* Identification */}
          <div>
            <label
              style={{
                fontSize: "12px",
                fontWeight: 600,
                color: "var(--ink)",
                display: "block",
                marginBottom: "6px",
              }}
            >
              Titlu asset *
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="ex: Banner reclamă produs X — generat Midjourney"
              style={{
                width: "100%",
                padding: "8px 10px",
                border: "1px solid var(--border)",
                borderRadius: "6px",
                background: "var(--bg)",
                color: "var(--ink)",
                fontSize: "13px",
              }}
            />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "var(--ink)",
                  display: "block",
                  marginBottom: "6px",
                }}
              >
                Tip asset *
              </label>
              <select
                value={assetType}
                onChange={(e) =>
                  setAssetType(e.target.value as AIContentAssetType)
                }
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  border: "1px solid var(--border)",
                  borderRadius: "6px",
                  background: "var(--bg)",
                  color: "var(--ink)",
                  fontSize: "13px",
                }}
              >
                {schema.assetTypes.map((t) => (
                  <option key={t} value={t}>
                    {ASSET_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "var(--ink)",
                  display: "block",
                  marginBottom: "6px",
                }}
              >
                Canale distribuție (separate prin virgulă)
              </label>
              <input
                value={distributionContext}
                onChange={(e) => setDistributionContext(e.target.value)}
                placeholder="ex: LinkedIn Ads, Website hero, Newsletter"
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  border: "1px solid var(--border)",
                  borderRadius: "6px",
                  background: "var(--bg)",
                  color: "var(--ink)",
                  fontSize: "13px",
                }}
              />
            </div>
          </div>

          {/* Provider section */}
          <div
            style={{
              padding: "14px",
              background: "var(--bg-raised)",
              borderRadius: "8px",
              border: "1px solid var(--border-soft)",
            }}
          >
            <div
              style={{
                fontWeight: 600,
                fontSize: "13px",
                color: "var(--ink)",
                marginBottom: "8px",
              }}
            >
              A. Provider duty (Art. 50(2))
            </div>
            <label
              style={{
                fontSize: "12px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                color: "var(--ink)",
              }}
            >
              <input
                type="checkbox"
                checked={providerMarkingApplied}
                onChange={(e) => setProviderMarkingApplied(e.target.checked)}
              />
              Marcaj tehnic machine-readable aplicat
            </label>
            <div style={{ marginTop: "8px" }}>
              <label
                style={{
                  fontSize: "12px",
                  color: "var(--ink-muted)",
                  display: "block",
                  marginBottom: "4px",
                }}
              >
                Standard
              </label>
              <select
                value={providerMarkingStandard}
                onChange={(e) =>
                  setProviderMarkingStandard(
                    e.target.value as ContentLabelingStandard,
                  )
                }
                style={{
                  width: "100%",
                  padding: "6px 10px",
                  border: "1px solid var(--border)",
                  borderRadius: "6px",
                  background: "var(--bg)",
                  color: "var(--ink)",
                  fontSize: "12px",
                }}
              >
                {schema.standards.map((s) => (
                  <option key={s} value={s}>
                    {STANDARD_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ marginTop: "8px" }}>
              <label
                style={{
                  fontSize: "12px",
                  color: "var(--ink-muted)",
                  display: "block",
                  marginBottom: "4px",
                }}
              >
                Dovadă marcaj (URL sau notă)
              </label>
              <input
                value={providerMarkingProof}
                onChange={(e) => setProviderMarkingProof(e.target.value)}
                placeholder="ex: https://verify.c2pa.org/asset/xyz sau IPTC Digital Source Type=trainedAlgorithmicMedia"
                style={{
                  width: "100%",
                  padding: "6px 10px",
                  border: "1px solid var(--border)",
                  borderRadius: "6px",
                  background: "var(--bg)",
                  color: "var(--ink)",
                  fontSize: "12px",
                }}
              />
            </div>
          </div>

          {/* Deployer section */}
          <div
            style={{
              padding: "14px",
              background: "var(--bg-raised)",
              borderRadius: "8px",
              border: "1px solid var(--border-soft)",
            }}
          >
            <div
              style={{
                fontWeight: 600,
                fontSize: "13px",
                color: "var(--ink)",
                marginBottom: "8px",
              }}
            >
              B. Deployer duty (Art. 50(1)/(3)/(4))
            </div>
            <label
              style={{
                fontSize: "12px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                color: "var(--ink)",
              }}
            >
              <input
                type="checkbox"
                checked={deployerDisclosureApplied}
                onChange={(e) =>
                  setDeployerDisclosureApplied(e.target.checked)
                }
              />
              Disclosure vizibil aplicat către utilizatori
            </label>
            {deployerDisclosureApplied && (
              <>
                <div
                  style={{
                    marginTop: "8px",
                    display: "grid",
                    gridTemplateColumns: "2fr 1fr",
                    gap: "8px",
                  }}
                >
                  <div>
                    <label
                      style={{
                        fontSize: "12px",
                        color: "var(--ink-muted)",
                        display: "block",
                        marginBottom: "4px",
                      }}
                    >
                      Placement
                    </label>
                    <select
                      value={deployerDisclosurePlacement}
                      onChange={(e) =>
                        setDeployerDisclosurePlacement(
                          e.target.value as TransparencyPlacement,
                        )
                      }
                      style={{
                        width: "100%",
                        padding: "6px 10px",
                        border: "1px solid var(--border)",
                        borderRadius: "6px",
                        background: "var(--bg)",
                        color: "var(--ink)",
                        fontSize: "12px",
                      }}
                    >
                      {schema.placements.map((p) => (
                        <option key={p} value={p}>
                          {PLACEMENT_LABELS_FULL[p]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label
                      style={{
                        fontSize: "12px",
                        color: "var(--ink-muted)",
                        display: "block",
                        marginBottom: "4px",
                      }}
                    >
                      Limbă
                    </label>
                    <select
                      value={deployerDisclosureLanguage}
                      onChange={(e) =>
                        setDeployerDisclosureLanguage(
                          e.target.value as TransparencyLanguage,
                        )
                      }
                      style={{
                        width: "100%",
                        padding: "6px 10px",
                        border: "1px solid var(--border)",
                        borderRadius: "6px",
                        background: "var(--bg)",
                        color: "var(--ink)",
                        fontSize: "12px",
                      }}
                    >
                      {schema.languages.map((l) => (
                        <option key={l} value={l}>
                          {l.toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div style={{ marginTop: "8px" }}>
                  <label
                    style={{
                      fontSize: "12px",
                      color: "var(--ink-muted)",
                      display: "block",
                      marginBottom: "4px",
                    }}
                  >
                    Text disclosure (cum apare vizibil)
                  </label>
                  <textarea
                    value={deployerDisclosureText}
                    onChange={(e) => setDeployerDisclosureText(e.target.value)}
                    rows={2}
                    placeholder="ex: „Conținut generat cu AI — Art. 50(2) EU AI Act"
                    style={{
                      width: "100%",
                      padding: "6px 10px",
                      border: "1px solid var(--border)",
                      borderRadius: "6px",
                      background: "var(--bg)",
                      color: "var(--ink)",
                      fontSize: "12px",
                      fontFamily: "inherit",
                      resize: "vertical",
                    }}
                  />
                </div>
              </>
            )}
          </div>

          {/* Public-interest editorial (collapsed when not applicable) */}
          {(assetType === "public_interest_text" ||
            assetType === "text_synthetic") && (
            <div
              style={{
                padding: "14px",
                background: "var(--bg-raised)",
                borderRadius: "8px",
                border: "1px solid var(--border-soft)",
              }}
            >
              <div
                style={{
                  fontWeight: 600,
                  fontSize: "13px",
                  color: "var(--ink)",
                  marginBottom: "8px",
                }}
              >
                C. Public-interest editorial (Art. 50(4)(b))
              </div>
              <label
                style={{
                  fontSize: "12px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  color: "var(--ink)",
                }}
              >
                <input
                  type="checkbox"
                  checked={isPublicInterest}
                  onChange={(e) => setIsPublicInterest(e.target.checked)}
                />
                Conținutul este pe un subiect de interes public
              </label>
              {showPublicInterestSection && (
                <>
                  <label
                    style={{
                      fontSize: "12px",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      color: "var(--ink)",
                      marginTop: "8px",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={editorialResponsibilityClaim}
                      onChange={(e) =>
                        setEditorialResponsibilityClaim(e.target.checked)
                      }
                    />
                    Editorul își asumă responsabilitatea editorială (derogare
                    Art. 50(4)(b))
                  </label>
                  <div style={{ marginTop: "8px" }}>
                    <label
                      style={{
                        fontSize: "12px",
                        color: "var(--ink-muted)",
                        display: "block",
                        marginBottom: "4px",
                      }}
                    >
                      Editor responsabil (email)
                    </label>
                    <input
                      value={editorialReviewBy}
                      onChange={(e) => setEditorialReviewBy(e.target.value)}
                      placeholder="editor@news.ro"
                      style={{
                        width: "100%",
                        padding: "6px 10px",
                        border: "1px solid var(--border)",
                        borderRadius: "6px",
                        background: "var(--bg)",
                        color: "var(--ink)",
                        fontSize: "12px",
                      }}
                    />
                  </div>
                </>
              )}
            </div>
          )}

          <div>
            <label
              style={{
                fontSize: "12px",
                fontWeight: 600,
                color: "var(--ink)",
                display: "block",
                marginBottom: "6px",
              }}
            >
              Note interne
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="(opțional) context, decizii editoriale, etc."
              style={{
                width: "100%",
                padding: "6px 10px",
                border: "1px solid var(--border)",
                borderRadius: "6px",
                background: "var(--bg)",
                color: "var(--ink)",
                fontSize: "12px",
                fontFamily: "inherit",
                resize: "vertical",
              }}
            />
          </div>

          {error && (
            <div
              role="alert"
              style={{
                padding: "10px 12px",
                background: "rgba(248,113,113,0.10)",
                border: "1px solid rgba(248,113,113,0.30)",
                borderRadius: "6px",
                fontSize: "12px",
                color: "#dc2626",
              }}
            >
              {error}
            </div>
          )}
        </div>

        <div
          style={{
            padding: "12px 20px",
            borderTop: "1px solid var(--border-soft)",
            display: "flex",
            justifyContent: "flex-end",
            gap: "8px",
          }}
        >
          <button
            onClick={onClose}
            disabled={submitting}
            style={{
              padding: "8px 14px",
              borderRadius: "6px",
              border: "1px solid var(--border)",
              background: "var(--bg-raised)",
              color: "var(--ink-muted)",
              fontSize: "13px",
              cursor: submitting ? "not-allowed" : "pointer",
            }}
          >
            Anulează
          </button>
          <button
            onClick={submit}
            disabled={submitting}
            style={{
              padding: "8px 14px",
              borderRadius: "6px",
              border: "1px solid var(--cobalt-600)",
              background: "var(--cobalt-600)",
              color: "#fff",
              fontSize: "13px",
              fontWeight: 500,
              cursor: submitting ? "not-allowed" : "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            {submitting && (
              <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} />
            )}
            Salvează asset
          </button>
        </div>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
//   Attach evidence modal
// ────────────────────────────────────────────────────────────────────────────

function AttachEvidenceModal({
  assetId,
  onClose,
  onAttached,
}: {
  assetId: string
  onClose: () => void
  onAttached: () => void | Promise<void>
}) {
  const [type, setType] = useState<AIContentEvidenceType>("screenshot")
  const [description, setDescription] = useState("")
  const [url, setUrl] = useState("")
  const [fileName, setFileName] = useState("")
  const [fileHash, setFileHash] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    setError(null)
    if (description.trim().length < 3) {
      setError("Descriere min 3 caractere.")
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch(
        `/api/transparency/content-assets/${assetId}/evidence`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type,
            description: description.trim(),
            url: url.trim() || undefined,
            fileName: fileName.trim() || undefined,
            fileHash: fileHash.trim() || undefined,
          }),
        },
      )
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error || `HTTP ${res.status}`)
      }
      await onAttached()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Eroare")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,0.55)",
        zIndex: 1100,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "48px 16px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: "520px",
          background: "var(--bg)",
          border: "1px solid var(--border)",
          borderRadius: "12px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
        }}
      >
        <div
          style={{
            padding: "14px 18px",
            borderBottom: "1px solid var(--border-soft)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-display-v3)",
              fontSize: "15px",
              fontWeight: 600,
              color: "var(--ink)",
            }}
          >
            Atașează dovadă Art. 50
          </div>
          <button
            onClick={onClose}
            aria-label="Închide"
            style={{
              padding: "4px",
              borderRadius: "6px",
              border: "1px solid var(--border)",
              background: "var(--bg-raised)",
              color: "var(--ink-muted)",
              cursor: "pointer",
            }}
          >
            <X size={14} />
          </button>
        </div>

        <div
          style={{
            padding: "16px 18px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          <div>
            <label
              style={{
                fontSize: "12px",
                color: "var(--ink)",
                display: "block",
                marginBottom: "4px",
              }}
            >
              Tip dovadă
            </label>
            <select
              value={type}
              onChange={(e) =>
                setType(e.target.value as AIContentEvidenceType)
              }
              style={{
                width: "100%",
                padding: "6px 10px",
                border: "1px solid var(--border)",
                borderRadius: "6px",
                background: "var(--bg)",
                color: "var(--ink)",
                fontSize: "12px",
              }}
            >
              {Object.entries(EVIDENCE_TYPE_LABELS).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              style={{
                fontSize: "12px",
                color: "var(--ink)",
                display: "block",
                marginBottom: "4px",
              }}
            >
              Descriere *
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder={"ex: Screenshot post LinkedIn cu eticheta „Generated by AI” vizibilă în footer."}
              style={{
                width: "100%",
                padding: "6px 10px",
                border: "1px solid var(--border)",
                borderRadius: "6px",
                background: "var(--bg)",
                color: "var(--ink)",
                fontSize: "12px",
                fontFamily: "inherit",
                resize: "vertical",
              }}
            />
          </div>
          <div>
            <label
              style={{
                fontSize: "12px",
                color: "var(--ink)",
                display: "block",
                marginBottom: "4px",
              }}
            >
              URL dovadă (opțional)
            </label>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://…"
              style={{
                width: "100%",
                padding: "6px 10px",
                border: "1px solid var(--border)",
                borderRadius: "6px",
                background: "var(--bg)",
                color: "var(--ink)",
                fontSize: "12px",
              }}
            />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div>
              <label
                style={{
                  fontSize: "12px",
                  color: "var(--ink)",
                  display: "block",
                  marginBottom: "4px",
                }}
              >
                Nume fișier (opțional)
              </label>
              <input
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder="screenshot.png"
                style={{
                  width: "100%",
                  padding: "6px 10px",
                  border: "1px solid var(--border)",
                  borderRadius: "6px",
                  background: "var(--bg)",
                  color: "var(--ink)",
                  fontSize: "12px",
                }}
              />
            </div>
            <div>
              <label
                style={{
                  fontSize: "12px",
                  color: "var(--ink)",
                  display: "block",
                  marginBottom: "4px",
                }}
              >
                SHA-256 hash (opțional)
              </label>
              <input
                value={fileHash}
                onChange={(e) => setFileHash(e.target.value)}
                placeholder="ex: f3a8…"
                style={{
                  width: "100%",
                  padding: "6px 10px",
                  border: "1px solid var(--border)",
                  borderRadius: "6px",
                  background: "var(--bg)",
                  color: "var(--ink)",
                  fontSize: "12px",
                  fontFamily: "monospace",
                }}
              />
            </div>
          </div>
          {error && (
            <div
              role="alert"
              style={{
                padding: "8px 10px",
                background: "rgba(248,113,113,0.10)",
                border: "1px solid rgba(248,113,113,0.30)",
                borderRadius: "6px",
                fontSize: "12px",
                color: "#dc2626",
              }}
            >
              {error}
            </div>
          )}
        </div>

        <div
          style={{
            padding: "12px 18px",
            borderTop: "1px solid var(--border-soft)",
            display: "flex",
            justifyContent: "flex-end",
            gap: "8px",
          }}
        >
          <button
            onClick={onClose}
            disabled={submitting}
            style={{
              padding: "6px 12px",
              borderRadius: "6px",
              border: "1px solid var(--border)",
              background: "var(--bg-raised)",
              color: "var(--ink-muted)",
              fontSize: "12px",
              cursor: submitting ? "not-allowed" : "pointer",
            }}
          >
            Anulează
          </button>
          <button
            onClick={submit}
            disabled={submitting}
            style={{
              padding: "6px 12px",
              borderRadius: "6px",
              border: "1px solid var(--cobalt-600)",
              background: "var(--cobalt-600)",
              color: "#fff",
              fontSize: "12px",
              fontWeight: 500,
              cursor: submitting ? "not-allowed" : "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            {submitting && (
              <Loader2 size={11} style={{ animation: "spin 1s linear infinite" }} />
            )}
            Atașează
          </button>
        </div>
      </div>
    </div>
  )
}
