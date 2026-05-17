"use client"

import { useState } from "react"
import Link from "next/link"
import { Send, ShieldAlert, Trash2 } from "lucide-react"
import type { AISystemRecord, AISystemRiskLevel } from "@/lib/compliance/types"

const RISK_LABELS: Record<AISystemRiskLevel, string> = {
  minimal: "Minimal",
  limited: "Limitat",
  high: "Ridicat",
}

const RISK_BADGE_STYLES: Record<AISystemRiskLevel, React.CSSProperties> = {
  minimal: {
    background: "var(--emerald-soft)",
    color: "var(--emerald-400)",
    border: "1px solid rgba(52,211,153,0.2)",
  },
  limited: {
    background: "var(--cobalt-soft)",
    color: "var(--cobalt-400)",
    border: "1px solid rgba(96,165,250,0.2)",
  },
  high: {
    background: "var(--amber-soft)",
    color: "var(--amber-400)",
    border: "1px solid rgba(251,191,36,0.2)",
  },
}

const PURPOSE_LABELS: Record<string, string> = {
  "hr-screening": "HR Screening",
  "credit-scoring": "Credit Scoring",
  "biometric-identification": "Identificare biometrică",
  "fraud-detection": "Detectare fraudă",
  "marketing-personalization": "Marketing personalizat",
  "support-chatbot": "Chatbot suport",
  "document-assistant": "Asistent documente",
  "other": "Altul",
}

interface AISystemsListProps {
  systems: AISystemRecord[]
  onDelete: (id: string) => void
  /** When "cabinet", each row exposes a "Trimite spre aprobare" button. */
  workspaceMode?: "imm-classic" | "ai-builder" | "cabinet"
  /**
   * Set of high-risk system IDs that DO NOT yet have a FRIA record (Art. 27).
   * When a system id appears here, the row renders an amber banner pointing
   * deployer to start a FRIA evaluation.
   */
  systemsRequiringFriaIds?: Set<string>
}

export function AISystemsList({
  systems,
  onDelete,
  workspaceMode = "imm-classic",
  systemsRequiringFriaIds,
}: AISystemsListProps) {
  const isCabinet = workspaceMode === "cabinet"
  const [busyId, setBusyId] = useState<string | null>(null)
  const [createdLink, setCreatedLink] = useState<{ url: string; systemName: string } | null>(null)

  async function handleSendApproval(system: AISystemRecord) {
    const email = window.prompt(`Email-ul clientului pentru aprobarea sistemului "${system.name}":`)
    if (!email) return
    setBusyId(system.id)
    try {
      const res = await fetch("/api/share/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType: "approval",
          targetId: system.id,
          targetLabel: system.name,
          recipientEmail: email,
          expiresInDays: 7,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error ?? "Generare link eșuată.")
        return
      }
      setCreatedLink({ url: data.url, systemName: system.name })
    } catch {
      alert("Eroare de rețea. Încearcă din nou.")
    } finally {
      setBusyId(null)
    }
  }
  if (systems.length === 0) {
    return (
      <div
        style={{
          padding: "40px 24px",
          textAlign: "center",
          border: "1px dashed var(--border)",
          borderRadius: "10px",
          color: "var(--ink-dim)",
          fontSize: "13px",
        }}
      >
        Niciun sistem AI înregistrat. Adaugă primul sistem folosind formularul de mai sus.
      </div>
    )
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {createdLink && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "10px 14px",
            background: "var(--cobalt-soft)",
            border: "1px solid rgba(96,165,250,0.25)",
            borderRadius: "8px",
            fontSize: "12px",
            color: "var(--ink)",
          }}
        >
          <Send size={14} style={{ color: "var(--cobalt-400)" }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 500 }}>
              Magic link trimis pentru &quot;{createdLink.systemName}&quot;
            </div>
            <code
              style={{
                fontSize: "11px",
                color: "var(--ink-muted)",
                display: "block",
                overflowWrap: "anywhere",
                marginTop: "2px",
              }}
            >
              {createdLink.url}
            </code>
          </div>
          <button
            onClick={() => {
              navigator.clipboard.writeText(createdLink.url).catch(() => {})
            }}
            style={{
              padding: "4px 8px",
              borderRadius: "4px",
              background: "transparent",
              border: "1px solid var(--border)",
              color: "var(--ink-muted)",
              cursor: "pointer",
              fontSize: "11px",
            }}
          >
            Copy
          </button>
          <button
            onClick={() => setCreatedLink(null)}
            style={{
              padding: "4px 8px",
              borderRadius: "4px",
              background: "transparent",
              border: "none",
              color: "var(--ink-dim)",
              cursor: "pointer",
              fontSize: "11px",
            }}
          >
            ×
          </button>
        </div>
      )}
      {systems.map((system) => {
        const badgeStyle = RISK_BADGE_STYLES[system.riskLevel] ?? RISK_BADGE_STYLES.minimal
        const riskLabel = RISK_LABELS[system.riskLevel] ?? system.riskLevel
        const actionCount = system.recommendedActions?.length ?? 0
        const needsFria =
          system.riskLevel === "high" &&
          systemsRequiringFriaIds?.has(system.id) === true

        return (
          <div
            key={system.id}
            style={{ display: "flex", flexDirection: "column", gap: "0" }}
          >
            {needsFria && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "8px 12px",
                  background: "var(--amber-soft)",
                  border: "1px solid rgba(251,191,36,0.25)",
                  borderTopLeftRadius: "10px",
                  borderTopRightRadius: "10px",
                  borderBottom: "none",
                  fontSize: "11px",
                  color: "#fbbf24",
                }}
              >
                <ShieldAlert size={12} style={{ flexShrink: 0 }} />
                <span style={{ flex: 1 }}>
                  Acest sistem high-risk necesită FRIA (Art. 27)
                </span>
                <Link
                  href={`/dashboard/fria?systemId=${encodeURIComponent(system.id)}`}
                  style={{
                    color: "#fbbf24",
                    fontWeight: 600,
                    textDecoration: "none",
                  }}
                >
                  Pornește evaluare →
                </Link>
              </div>
            )}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "12px 16px",
              background: "var(--bg-raised)",
              border: "1px solid var(--border)",
              borderTopLeftRadius: needsFria ? "0" : "10px",
              borderTopRightRadius: needsFria ? "0" : "10px",
              borderBottomLeftRadius: "10px",
              borderBottomRightRadius: "10px",
              borderTop: needsFria ? "none" : "1px solid var(--border)",
            }}
          >
            {/* Main info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "var(--ink)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    maxWidth: "220px",
                  }}
                >
                  {system.name}
                </span>

                {/* Risk badge */}
                <span
                  style={{
                    ...badgeStyle,
                    fontSize: "10px",
                    fontWeight: 600,
                    padding: "2px 7px",
                    borderRadius: "20px",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    flexShrink: 0,
                  }}
                >
                  {riskLabel}
                </span>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  marginTop: "4px",
                  flexWrap: "wrap",
                }}
              >
                <span style={{ fontSize: "11px", color: "var(--ink-muted)" }}>
                  {PURPOSE_LABELS[system.purpose] ?? system.purpose}
                </span>

                {system.vendor && (
                  <span style={{ fontSize: "11px", color: "var(--ink-dim)" }}>
                    · {system.vendor}
                  </span>
                )}

                {actionCount > 0 && (
                  <span
                    style={{
                      fontSize: "10px",
                      color: "var(--amber-400)",
                      background: "var(--amber-soft)",
                      border: "1px solid rgba(251,191,36,0.2)",
                      borderRadius: "20px",
                      padding: "1px 6px",
                    }}
                  >
                    {actionCount} acțiun{actionCount !== 1 ? "i" : "e"} recomandate
                  </span>
                )}
              </div>
            </div>

            {/* Metadata */}
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontSize: "10px", color: "var(--ink-dim)" }}>
                {new Date(system.createdAtISO).toLocaleDateString("ro-RO", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </div>
              {system.approvalStatus && (
                <div style={{ fontSize: "10px", color: "var(--ink-dim)", marginTop: "2px" }}>
                  {system.approvalStatus === "approved"
                    ? "✓ Aprobat"
                    : system.approvalStatus === "rejected"
                    ? "✗ Respins"
                    : "⏳ Pending"}
                </div>
              )}
            </div>

            {/* Send for approval (cabinet only) */}
            {isCabinet && (
              <button
                onClick={() => handleSendApproval(system)}
                disabled={busyId === system.id}
                aria-label={`Trimite spre aprobare ${system.name}`}
                title="Trimite spre aprobare la client (magic link)"
                style={{
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "0 10px",
                  height: "30px",
                  border: "1px solid var(--border)",
                  borderRadius: "6px",
                  background: "transparent",
                  cursor: busyId === system.id ? "wait" : "pointer",
                  color: "var(--cobalt-400)",
                  fontSize: "11px",
                  fontWeight: 500,
                }}
              >
                <Send size={12} />
                {busyId === system.id ? "Se trimite…" : "Trimite aprobare"}
              </button>
            )}

            {/* Delete button */}
            <button
              onClick={() => onDelete(system.id)}
              aria-label={`Șterge sistemul ${system.name}`}
              style={{
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "30px",
                height: "30px",
                border: "1px solid var(--border)",
                borderRadius: "6px",
                background: "transparent",
                cursor: "pointer",
                color: "var(--ink-dim)",
                transition: "color 0.15s, background 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--red-400)"
                e.currentTarget.style.background = "var(--red-soft)"
                e.currentTarget.style.borderColor = "rgba(248,113,113,0.3)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--ink-dim)"
                e.currentTarget.style.background = "transparent"
                e.currentTarget.style.borderColor = "var(--border)"
              }}
            >
              <Trash2 size={13} />
            </button>
          </div>
          </div>
        )
      })}
    </div>
  )
}
