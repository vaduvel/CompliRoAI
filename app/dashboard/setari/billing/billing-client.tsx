"use client"

import { useState } from "react"
import Link from "next/link"
import { CreditCard, ExternalLink, Loader2, Check, AlertTriangle } from "lucide-react"

import type { OrgSubscription } from "@/lib/compliance/types"
import type { TierConfig } from "@/lib/server/stripe-tier-config"

interface Props {
  orgName: string
  subscription: OrgSubscription | null
  tierConfig: TierConfig | null
  stripeReady: boolean
}

function formatDate(iso?: string): string {
  if (!iso) return "—"
  try {
    return new Date(iso).toLocaleDateString("ro-RO", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  } catch {
    return iso
  }
}

function statusLabel(status: OrgSubscription["status"]): { text: string; color: string } {
  switch (status) {
    case "active":
      return { text: "Activ", color: "#10b981" }
    case "trialing":
      return { text: "Trial", color: "#3b82f6" }
    case "past_due":
      return { text: "Plată restantă", color: "#dc2626" }
    case "canceled":
      return { text: "Anulat", color: "#94a3b8" }
    case "incomplete":
      return { text: "Incomplet", color: "#f59e0b" }
    case "incomplete_expired":
      return { text: "Expirat (incomplet)", color: "#94a3b8" }
    case "unpaid":
      return { text: "Neachitat", color: "#dc2626" }
    case "none":
    default:
      return { text: "Fără abonament", color: "#94a3b8" }
  }
}

export function BillingClient({ orgName, subscription, tierConfig, stripeReady }: Props) {
  const [portalLoading, setPortalLoading] = useState(false)
  const [portalError, setPortalError] = useState<string | null>(null)

  async function openPortal() {
    setPortalLoading(true)
    setPortalError(null)
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" })
      const data = await res.json()
      if (!res.ok) {
        setPortalError(data.error ?? "Nu am putut deschide portalul.")
        return
      }
      window.location.href = data.url
    } catch (err) {
      setPortalError(err instanceof Error ? err.message : "Eroare necunoscută.")
    } finally {
      setPortalLoading(false)
    }
  }

  const status = subscription ? statusLabel(subscription.status) : statusLabel("none")
  const metrics = subscription?.usageMetrics ?? {}

  return (
    <div className="cr-page cr-stack">
      <header className="cr-hero">
        <div className="cr-hero__copy">
          <div className="cr-eyebrow">Setări</div>
          <h1 className="cr-title">Facturare</h1>
          <p className="cr-subtitle">
          Vezi tier-ul tău activ, statisticile de utilizare și gestionează abonamentul.
          </p>
        </div>
      </header>

      {!stripeReady && (
        <div
          style={{
            background: "#fef3c7",
            border: "1px solid #fde68a",
            borderRadius: 10,
            padding: 16,
            marginBottom: 24,
            color: "#92400e",
            display: "flex",
            gap: 12,
            alignItems: "flex-start",
          }}
        >
          <AlertTriangle size={20} style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: 14, lineHeight: 1.6 }}>
            <strong>Plăți online în pregătire.</strong> Configurarea Stripe este în curs.
            Pentru activare manuală a unui plan, contactează-ne la{" "}
            <a
              href="mailto:support@compliroai.ro"
              style={{ color: "#92400e", textDecoration: "underline" }}
            >
              support@compliroai.ro
            </a>
            .
          </div>
        </div>
      )}

      {/* Current tier card */}
      <section
        style={{
          background: "var(--bg-surface, #fff)",
          border: "1px solid var(--border-soft, #e2e8f0)",
          borderRadius: 12,
          padding: 24,
          marginBottom: 24,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <div
              style={{
                fontSize: 12,
                color: "var(--ink-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: 6,
              }}
            >
              Tier curent
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color: "var(--ink)" }}>
              {tierConfig?.displayName ?? "Fără abonament"}
            </div>
            {tierConfig && (
              <div style={{ fontSize: 14, color: "var(--ink-muted)", marginTop: 6 }}>
                {tierConfig.description}
              </div>
            )}
          </div>
          <div>
            <span
              style={{
                display: "inline-block",
                padding: "4px 12px",
                borderRadius: 999,
                background: `${status.color}15`,
                color: status.color,
                fontSize: 12,
                fontWeight: 600,
                border: `1px solid ${status.color}30`,
              }}
            >
              {status.text}
            </span>
          </div>
        </div>

        {tierConfig && (
          <div style={{ fontSize: 32, fontWeight: 700, color: "var(--cobalt-500, #3b5bdb)" }}>
            {tierConfig.priceEUR === 0 ? "Gratis" : `${tierConfig.priceEUR}€`}
            {tierConfig.priceEUR > 0 && !tierConfig.oneOff && (
              <span style={{ fontSize: 14, fontWeight: 400, color: "var(--ink-muted)", marginLeft: 6 }}>
                / lună
              </span>
            )}
            {tierConfig.oneOff && (
              <span style={{ fontSize: 14, fontWeight: 400, color: "var(--ink-muted)", marginLeft: 6 }}>
                (unic)
              </span>
            )}
          </div>
        )}

        {subscription && (
          <div style={{ marginTop: 20, fontSize: 13, color: "var(--ink-muted)" }}>
            <div>
              Perioadă curentă: <strong style={{ color: "var(--ink)" }}>{formatDate(subscription.currentPeriodStartISO)}</strong>{" "}
              → <strong style={{ color: "var(--ink)" }}>{formatDate(subscription.currentPeriodEndISO)}</strong>
            </div>
            {subscription.trialEndsAtISO && (
              <div style={{ marginTop: 4 }}>
                Trial expiră: <strong style={{ color: "var(--ink)" }}>{formatDate(subscription.trialEndsAtISO)}</strong>
              </div>
            )}
            {subscription.cancelAtPeriodEnd && (
              <div style={{ marginTop: 4, color: "#dc2626" }}>
                Anulare programată la finalul perioadei.
              </div>
            )}
          </div>
        )}

        <div style={{ display: "flex", gap: 12, marginTop: 24, flexWrap: "wrap" }}>
          {subscription?.stripeCustomerId && stripeReady && (
            <button
              onClick={openPortal}
              disabled={portalLoading}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 18px",
                background: "var(--cobalt-500, #3b5bdb)",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                cursor: portalLoading ? "wait" : "pointer",
                opacity: portalLoading ? 0.7 : 1,
              }}
            >
              {portalLoading ? <Loader2 size={16} className="animate-spin" /> : <ExternalLink size={16} />}
              Gestionează abonament
            </button>
          )}
          <Link
            href="/dashboard/setari/billing/checkout"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 18px",
              background: "transparent",
              color: "var(--cobalt-500, #3b5bdb)",
              border: "1px solid var(--cobalt-500, #3b5bdb)",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            <CreditCard size={16} />
            {subscription ? "Schimbă planul" : "Vezi planurile"}
          </Link>
        </div>

        {portalError && (
          <div
            style={{
              marginTop: 14,
              padding: 10,
              background: "#fee2e2",
              border: "1px solid #fecaca",
              borderRadius: 6,
              color: "#991b1b",
              fontSize: 13,
            }}
          >
            {portalError}
          </div>
        )}
      </section>

      {/* Usage metrics */}
      <section
        style={{
          background: "var(--bg-surface, #fff)",
          border: "1px solid var(--border-soft, #e2e8f0)",
          borderRadius: 12,
          padding: 24,
          marginBottom: 24,
        }}
      >
        <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--ink)", margin: 0, marginBottom: 16 }}>
          Utilizare (perioada curentă)
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
          <UsageStat label="Sisteme AI înregistrate" value={metrics.aiSystemsCount ?? 0} limit={tierConfig?.maxAISystems} />
          <UsageStat label="Findings active" value={metrics.findingsActiveCount ?? 0} />
          <UsageStat label="Audit Pack-uri (lună)" value={metrics.auditPacksGeneratedThisMonth ?? 0} />
          {tierConfig?.maxClients !== undefined && (
            <UsageStat label="Clienți activi" value={metrics.activeClients ?? 0} limit={tierConfig?.maxClients} />
          )}
        </div>
      </section>

      {/* Tier features */}
      {tierConfig && (
        <section
          style={{
            background: "var(--bg-surface, #fff)",
            border: "1px solid var(--border-soft, #e2e8f0)",
            borderRadius: 12,
            padding: 24,
          }}
        >
          <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--ink)", margin: 0, marginBottom: 16 }}>
            Module incluse în {tierConfig.displayName}
          </h2>
          <ul
            style={{
              listStyle: "none",
              margin: 0,
              padding: 0,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 8,
            }}
          >
            {tierConfig.features.map((f) => (
              <li
                key={f}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 13,
                  color: "var(--ink-muted)",
                }}
              >
                <Check size={14} style={{ color: "#10b981", flexShrink: 0 }} />
                {f}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

function UsageStat({ label, value, limit }: { label: string; value: number; limit?: number }) {
  return (
    <div
      style={{
        padding: 14,
        background: "var(--bg-subtle, #f8fafc)",
        border: "1px solid var(--border-soft, #e2e8f0)",
        borderRadius: 8,
      }}
    >
      <div style={{ fontSize: 11, color: "var(--ink-muted)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: "var(--ink)" }}>
        {value}
        {limit !== undefined && (
          <span style={{ fontSize: 13, fontWeight: 400, color: "var(--ink-muted)", marginLeft: 6 }}>
            / {limit}
          </span>
        )}
      </div>
    </div>
  )
}
