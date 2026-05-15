"use client"

import { Trash2 } from "lucide-react"
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
}

export function AISystemsList({ systems, onDelete }: AISystemsListProps) {
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
      {systems.map((system) => {
        const badgeStyle = RISK_BADGE_STYLES[system.riskLevel] ?? RISK_BADGE_STYLES.minimal
        const riskLabel = RISK_LABELS[system.riskLevel] ?? system.riskLevel
        const actionCount = system.recommendedActions?.length ?? 0

        return (
          <div
            key={system.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "12px 16px",
              background: "var(--bg-raised)",
              border: "1px solid var(--border)",
              borderRadius: "10px",
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
        )
      })}
    </div>
  )
}
