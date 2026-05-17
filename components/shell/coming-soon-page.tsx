"use client"
import { useState } from "react"
import type { ComponentType } from "react"

interface ComingSoonPageProps {
  /** Module name (Romanian). */
  title: string
  /** Lucide icon component for the hero. */
  icon: ComponentType<{ size?: number }>
  /** Sprint number where this module ships. */
  sprintNumber: number
  /** Target launch date copy ("Q3 2026", "iunie 2026", etc.). */
  targetCopy: string
  /** AI Act / legal reference. */
  legalReference: string
  /** Why this module matters — 1-2 paragraphs in Romanian. */
  description: string
  /** Sub-bullets of what the module will do. */
  bullets: string[]
}

/**
 * Sprint 015 — Reusable placeholder for upcoming modules (FRIA, Oversight,
 * Logging, PMM, Incidente AI, QMS, API/SDK). Always renders; never 404s.
 *
 * Shows: module name, target sprint + date, legal reference, description,
 * bullets of what's coming, and an opt-in "notify me" button (mailto for now).
 */
export function ComingSoonPage({
  title,
  icon: Icon,
  sprintNumber,
  targetCopy,
  legalReference,
  description,
  bullets,
}: ComingSoonPageProps) {
  const [subscribed, setSubscribed] = useState(false)

  function handleNotify() {
    if (typeof window === "undefined") return
    setSubscribed(true)
    // Future: POST to a "module-interest" endpoint. For now: mailto fallback
    // so the team gets actual signal.
    const subject = encodeURIComponent(`Interes modul: ${title} (Sprint ${sprintNumber})`)
    const body = encodeURIComponent(
      `Salut,\n\nVreau să fiu notificat când modulul "${title}" este disponibil (planificat Sprint ${sprintNumber}, ${targetCopy}).\n\nMulțumesc!`
    )
    window.location.href = `mailto:info@compliroai.ro?subject=${subject}&body=${body}`
  }

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        padding: "40px 32px",
        maxWidth: "880px",
        margin: "0 auto",
        width: "100%",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "8px" }}>
        <div
          style={{
            width: "48px",
            height: "48px",
            borderRadius: "12px",
            background: "var(--cobalt-soft)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--cobalt-400)",
          }}
        >
          <Icon size={24} />
        </div>
        <div>
          <h1
            style={{
              margin: 0,
              fontFamily: "var(--font-display-v3)",
              fontSize: "24px",
              fontWeight: 600,
              color: "var(--ink)",
              letterSpacing: "-0.02em",
            }}
          >
            {title}
          </h1>
          <div style={{ fontSize: "13px", color: "var(--ink-dim)", marginTop: "2px" }}>
            Disponibil în Sprint {String(sprintNumber).padStart(3, "0")} · {targetCopy}
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: "20px",
          padding: "16px 20px",
          background: "var(--bg-elev)",
          border: "1px solid var(--border-strong)",
          borderRadius: "10px",
        }}
      >
        <div
          style={{
            fontSize: "11px",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            color: "var(--ink-subtle)",
            marginBottom: "6px",
          }}
        >
          Referință legală
        </div>
        <div style={{ fontSize: "14px", color: "var(--ink)", fontWeight: 500 }}>
          {legalReference}
        </div>
      </div>

      <p
        style={{
          marginTop: "24px",
          fontSize: "14px",
          color: "var(--ink-muted)",
          lineHeight: 1.6,
        }}
      >
        {description}
      </p>

      <div
        style={{
          marginTop: "20px",
          padding: "18px 22px",
          background: "var(--bg-raised)",
          border: "1px solid var(--border)",
          borderRadius: "10px",
        }}
      >
        <div
          style={{
            fontSize: "12px",
            fontWeight: 600,
            color: "var(--ink)",
            marginBottom: "10px",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          Ce vei putea face
        </div>
        <ul
          style={{
            margin: 0,
            paddingLeft: "18px",
            fontSize: "13.5px",
            color: "var(--ink-muted)",
            lineHeight: 1.8,
          }}
        >
          {bullets.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      </div>

      <div
        style={{
          marginTop: "28px",
          display: "flex",
          gap: "12px",
          alignItems: "center",
        }}
      >
        <button
          type="button"
          onClick={handleNotify}
          disabled={subscribed}
          style={{
            padding: "10px 18px",
            borderRadius: "8px",
            border: "none",
            background: subscribed ? "var(--bg-elev)" : "var(--cobalt-600)",
            color: subscribed ? "var(--ink-muted)" : "#fff",
            fontSize: "13px",
            fontWeight: 500,
            cursor: subscribed ? "default" : "pointer",
          }}
        >
          {subscribed ? "Cerere trimisă" : "Notificați-mă la lansare"}
        </button>
        <span style={{ fontSize: "12px", color: "var(--ink-dim)" }}>
          Sau scrie la info@compliroai.ro
        </span>
      </div>
    </div>
  )
}
