"use client"

import { useState } from "react"
import Link from "next/link"
import { Check, Loader2, AlertTriangle, ArrowLeft } from "lucide-react"

import type { BillingTier } from "@/lib/compliance/types"
import type { TierConfig } from "@/lib/server/stripe-tier-config"

interface Props {
  tiers: TierConfig[]
  currentTier: BillingTier | null
  stripeReady: boolean
}

export function CheckoutClient({ tiers, currentTier, stripeReady }: Props) {
  const [loadingTier, setLoadingTier] = useState<BillingTier | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function subscribe(tier: BillingTier) {
    setLoadingTier(tier)
    setError(null)
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Nu am putut crea sesiunea de checkout.")
        return
      }
      window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare necunoscută.")
    } finally {
      setLoadingTier(null)
    }
  }

  // Grupare vizuală: IMM (3) | AI Builder (1) | Cabinet (3) | One-off (1)
  const immTiers = tiers.filter((t) =>
    ["imm_solo", "imm_mid"].includes(t.tier)
  )
  const builderTiers = tiers.filter((t) => t.tier === "ai_builder")
  const cabinetTiers = tiers.filter((t) =>
    ["cabinet_solo", "cabinet_pro", "cabinet_enterprise"].includes(t.tier)
  )
  const oneOffTiers = tiers.filter((t) => t.tier === "one_off_audit")

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>
      <Link
        href="/dashboard/setari/billing"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontSize: 13,
          color: "var(--ink-muted)",
          textDecoration: "none",
          marginBottom: 16,
        }}
      >
        <ArrowLeft size={14} />
        Înapoi la facturare
      </Link>

      <header style={{ marginBottom: 32 }}>
        <h1
          style={{
            fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)",
            fontSize: 32,
            fontWeight: 700,
            color: "var(--ink)",
            margin: 0,
            letterSpacing: "-0.02em",
          }}
        >
          Alege planul potrivit
        </h1>
        <p style={{ color: "var(--ink-muted)", marginTop: 8, fontSize: 15, maxWidth: 600 }}>
          Toate planurile includ Audit Pack, Breach 72h, DPIA, RoPA și DSAR. Alege în
          funcție de mărimea echipei și volumul de clienți.
        </p>
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
            <strong>Plățile online sunt în pregătire.</strong> Stripe va fi activat în
            curând. Pentru activare manuală a unui plan, scrie-ne la{" "}
            <a href="mailto:support@compliroai.ro" style={{ color: "#92400e", textDecoration: "underline" }}>
              support@compliroai.ro
            </a>
            .
          </div>
        </div>
      )}

      {error && (
        <div
          style={{
            background: "#fee2e2",
            border: "1px solid #fecaca",
            borderRadius: 10,
            padding: 14,
            marginBottom: 24,
            color: "#991b1b",
            fontSize: 14,
          }}
        >
          {error}
        </div>
      )}

      <TierGroup title="Pentru IMM" tiers={immTiers} currentTier={currentTier} loadingTier={loadingTier} onSubscribe={subscribe} disabled={!stripeReady} />
      <TierGroup title="Pentru startup AI native" tiers={builderTiers} currentTier={currentTier} loadingTier={loadingTier} onSubscribe={subscribe} disabled={!stripeReady} />
      <TierGroup title="Pentru cabinete de consultanță" tiers={cabinetTiers} currentTier={currentTier} loadingTier={loadingTier} onSubscribe={subscribe} disabled={!stripeReady} />
      <TierGroup title="Plată unică" tiers={oneOffTiers} currentTier={currentTier} loadingTier={loadingTier} onSubscribe={subscribe} disabled={!stripeReady} />
    </div>
  )
}

function TierGroup({
  title,
  tiers,
  currentTier,
  loadingTier,
  onSubscribe,
  disabled,
}: {
  title: string
  tiers: TierConfig[]
  currentTier: BillingTier | null
  loadingTier: BillingTier | null
  onSubscribe: (tier: BillingTier) => void
  disabled: boolean
}) {
  if (tiers.length === 0) return null
  return (
    <section style={{ marginBottom: 36 }}>
      <h2
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: "var(--ink-muted)",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          margin: 0,
          marginBottom: 14,
        }}
      >
        {title}
      </h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(auto-fit, minmax(260px, 1fr))`,
          gap: 16,
        }}
      >
        {tiers.map((tier) => (
          <TierCard
            key={tier.tier}
            tier={tier}
            isCurrent={currentTier === tier.tier}
            isLoading={loadingTier === tier.tier}
            disabled={disabled || loadingTier !== null}
            onClick={() => onSubscribe(tier.tier)}
          />
        ))}
      </div>
    </section>
  )
}

function TierCard({
  tier,
  isCurrent,
  isLoading,
  disabled,
  onClick,
}: {
  tier: TierConfig
  isCurrent: boolean
  isLoading: boolean
  disabled: boolean
  onClick: () => void
}) {
  const highlight = tier.highlighted
  return (
    <div
      style={{
        background: "var(--bg-surface, #fff)",
        border: highlight ? "2px solid var(--cobalt-500, #3b5bdb)" : "1px solid var(--border-soft, #e2e8f0)",
        borderRadius: 12,
        padding: 22,
        display: "flex",
        flexDirection: "column",
        position: "relative",
      }}
    >
      {highlight && (
        <div
          style={{
            position: "absolute",
            top: -10,
            left: 18,
            background: "var(--cobalt-500, #3b5bdb)",
            color: "#fff",
            fontSize: 11,
            fontWeight: 600,
            padding: "3px 10px",
            borderRadius: 999,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          Recomandat
        </div>
      )}
      <div style={{ fontSize: 18, fontWeight: 700, color: "var(--ink)", marginBottom: 6 }}>
        {tier.displayName}
      </div>
      <div style={{ fontSize: 13, color: "var(--ink-muted)", marginBottom: 16, minHeight: 36 }}>
        {tier.description}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: "var(--ink)", marginBottom: 4 }}>
        {tier.priceEUR}€
        {!tier.oneOff && (
          <span style={{ fontSize: 13, fontWeight: 400, color: "var(--ink-muted)", marginLeft: 4 }}>
            / lună
          </span>
        )}
        {tier.oneOff && (
          <span style={{ fontSize: 13, fontWeight: 400, color: "var(--ink-muted)", marginLeft: 4 }}>
            (unic)
          </span>
        )}
      </div>
      {tier.maxClients !== undefined && (
        <div style={{ fontSize: 12, color: "var(--ink-muted)", marginBottom: 14 }}>
          Până la {tier.maxClients} clienți
        </div>
      )}
      <ul style={{ listStyle: "none", margin: 0, padding: 0, marginBottom: 18, flex: 1 }}>
        {tier.features.slice(0, 8).map((f) => (
          <li
            key={f}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 12,
              color: "var(--ink-muted)",
              padding: "3px 0",
            }}
          >
            <Check size={12} style={{ color: "#10b981", flexShrink: 0 }} />
            {f}
          </li>
        ))}
        {tier.features.length > 8 && (
          <li style={{ fontSize: 12, color: "var(--ink-dim)", paddingTop: 4 }}>
            + încă {tier.features.length - 8} module
          </li>
        )}
      </ul>
      {isCurrent ? (
        <div
          style={{
            background: "#dcfce7",
            color: "#166534",
            padding: "10px 16px",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            textAlign: "center",
            border: "1px solid #bbf7d0",
          }}
        >
          Planul tău curent
        </div>
      ) : (
        <button
          onClick={onClick}
          disabled={disabled || isLoading}
          style={{
            background: highlight ? "var(--cobalt-500, #3b5bdb)" : "transparent",
            color: highlight ? "#fff" : "var(--cobalt-500, #3b5bdb)",
            border: highlight ? "none" : "1px solid var(--cobalt-500, #3b5bdb)",
            padding: "10px 16px",
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            cursor: disabled ? "not-allowed" : "pointer",
            opacity: disabled ? 0.5 : 1,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          {isLoading && <Loader2 size={14} className="animate-spin" />}
          {disabled && !isLoading ? "În pregătire" : tier.oneOff ? "Cumpără audit" : "Abonează-te"}
        </button>
      )}
    </div>
  )
}
