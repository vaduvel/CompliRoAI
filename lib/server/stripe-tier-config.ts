// Sprint 014 — Stripe tier configuration (7 locked tiers per mandate § 15).
//
// Tier names exact ca în pricing table din functional spec v2 § 5:
//   Free Trial (€0/14d) | IMM Solo (€99) | IMM Mid (€249) | AI Builder (€399)
//   Cabinet Solo (€399) | Cabinet Pro (€799) | Cabinet Enterprise (€1499)
//   One-off Audit (€799 setup)
//
// NU SE PERMIT fiscal SKUs aici (mandate rule 3). Pure AI Compliance OS.
//
// Mapping price IDs:
//   - Production: env vars STRIPE_PRICE_*
//   - Dev/CI: placeholder strings care eșuează grațios la checkout

import type { BillingTier } from "@/lib/compliance/types"

export type TierFeature =
  | "ai-inventory"
  | "ai-risk-classification"
  | "transparency-engine"
  | "literacy-tracking"
  | "vendor-review"
  | "dpia"
  | "ropa"
  | "dsar"
  | "breach-72h"
  | "findings"
  | "readiness-pack"
  | "audit-pack"
  | "annex-iv"
  | "eu-database"
  | "conformity-assessment"
  | "fria"
  | "api-sdk"
  | "multi-client"
  | "magic-links"
  | "white-label"
  | "trust-center"
  | "approval-queue"
  | "audit-signed"
  | "sso"
  | "dpa"
  | "sla"
  | "monthly-digest"
  | "pdf-export"
  | "email-alerts"

export type TierConfig = {
  tier: BillingTier
  displayName: string
  description: string
  priceEUR: number              // monthly (0 for free trial; flat for one-off)
  /** Stripe Price ID. ENV var key. Folosit la build URL Checkout. */
  stripePriceIdEnvKey: string
  features: TierFeature[]
  // Soft limits (informative; not hard-enforced in v1)
  maxClients?: number           // cabinet-only
  maxAISystems?: number
  maxApiCallsPerMonth?: number  // ai-builder
  includesPDFs: boolean
  includesEmails: boolean
  includesAPI: boolean
  includesWhiteLabel: boolean
  /** Trial duration days (only meaningful for free_trial). */
  trialDays?: number
  /** Highlight for marketing pricing page. */
  highlighted?: boolean
  /** True = one-off purchase (nu lunar). */
  oneOff?: boolean
}

const COMMON_BASE: TierFeature[] = [
  "ai-inventory",
  "ai-risk-classification",
  "transparency-engine",
  "literacy-tracking",
  "findings",
  "monthly-digest",
  "pdf-export",
  "email-alerts",
]

const COMMON_PRIVACY: TierFeature[] = ["dsar", "ropa", "dpia"]

export const TIERS: Record<BillingTier, TierConfig> = {
  free_trial: {
    tier: "free_trial",
    displayName: "Free Trial",
    description: "14 zile complet, toate modulele acces, fără card.",
    priceEUR: 0,
    stripePriceIdEnvKey: "",          // no Stripe price — direct activation
    features: [
      ...COMMON_BASE,
      ...COMMON_PRIVACY,
      "vendor-review",
      "breach-72h",
      "readiness-pack",
      "audit-pack",
    ],
    includesPDFs: true,
    includesEmails: true,
    includesAPI: false,
    includesWhiteLabel: false,
    trialDays: 14,
    maxAISystems: 50,
  },

  imm_solo: {
    tier: "imm_solo",
    displayName: "IMM Solo",
    description: "10-50 angajați. AI cumpărat (nu dezvoltat).",
    priceEUR: 99,
    stripePriceIdEnvKey: "STRIPE_PRICE_IMM_SOLO",
    features: [
      ...COMMON_BASE,
      ...COMMON_PRIVACY,
      "vendor-review",
      "breach-72h",
      "readiness-pack",
    ],
    includesPDFs: true,
    includesEmails: true,
    includesAPI: false,
    includesWhiteLabel: false,
    maxAISystems: 100,
  },

  imm_mid: {
    tier: "imm_mid",
    displayName: "IMM Mid",
    description: "50-250 angajați. Vendor AI portfolio + audit semnat.",
    priceEUR: 249,
    stripePriceIdEnvKey: "STRIPE_PRICE_IMM_MID",
    features: [
      ...COMMON_BASE,
      ...COMMON_PRIVACY,
      "vendor-review",
      "breach-72h",
      "readiness-pack",
      "audit-pack",
      "audit-signed",
    ],
    includesPDFs: true,
    includesEmails: true,
    includesAPI: false,
    includesWhiteLabel: false,
    maxAISystems: 500,
    highlighted: true,
  },

  ai_builder: {
    tier: "ai_builder",
    displayName: "AI Builder",
    description: "Startup AI native. Annex IV + EU DB + FRIA + API/SDK.",
    priceEUR: 399,
    stripePriceIdEnvKey: "STRIPE_PRICE_AI_BUILDER",
    features: [
      ...COMMON_BASE,
      ...COMMON_PRIVACY,
      "vendor-review",
      "breach-72h",
      "readiness-pack",
      "audit-pack",
      "annex-iv",
      "eu-database",
      "conformity-assessment",
      "fria",
      "api-sdk",
    ],
    includesPDFs: true,
    includesEmails: true,
    includesAPI: true,
    includesWhiteLabel: false,
    maxAISystems: 1000,
    maxApiCallsPerMonth: 100_000,
  },

  cabinet_solo: {
    tier: "cabinet_solo",
    displayName: "Cabinet Solo",
    description: "1-10 clienți. Multi-client + magic links.",
    priceEUR: 399,
    stripePriceIdEnvKey: "STRIPE_PRICE_CABINET_SOLO",
    features: [
      ...COMMON_BASE,
      ...COMMON_PRIVACY,
      "vendor-review",
      "breach-72h",
      "readiness-pack",
      "audit-pack",
      "multi-client",
      "magic-links",
    ],
    includesPDFs: true,
    includesEmails: true,
    includesAPI: false,
    includesWhiteLabel: false,
    maxClients: 10,
    maxAISystems: 200,
  },

  cabinet_pro: {
    tier: "cabinet_pro",
    displayName: "Cabinet Pro",
    description: "10-50 clienți. White-label + Trust Center + Approval queue.",
    priceEUR: 799,
    stripePriceIdEnvKey: "STRIPE_PRICE_CABINET_PRO",
    features: [
      ...COMMON_BASE,
      ...COMMON_PRIVACY,
      "vendor-review",
      "breach-72h",
      "readiness-pack",
      "audit-pack",
      "audit-signed",
      "multi-client",
      "magic-links",
      "white-label",
      "trust-center",
      "approval-queue",
    ],
    includesPDFs: true,
    includesEmails: true,
    includesAPI: false,
    includesWhiteLabel: true,
    maxClients: 50,
    maxAISystems: 1000,
    highlighted: true,
  },

  cabinet_enterprise: {
    tier: "cabinet_enterprise",
    displayName: "Cabinet Enterprise",
    description: "50+ clienți. SSO + DPA + SLA contractual.",
    priceEUR: 1499,
    stripePriceIdEnvKey: "STRIPE_PRICE_CABINET_ENTERPRISE",
    features: [
      ...COMMON_BASE,
      ...COMMON_PRIVACY,
      "vendor-review",
      "breach-72h",
      "readiness-pack",
      "audit-pack",
      "audit-signed",
      "multi-client",
      "magic-links",
      "white-label",
      "trust-center",
      "approval-queue",
      "sso",
      "dpa",
      "sla",
    ],
    includesPDFs: true,
    includesEmails: true,
    includesAPI: true,
    includesWhiteLabel: true,
    maxClients: 1000,
    maxAISystems: 10_000,
  },

  one_off_audit: {
    tier: "one_off_audit",
    displayName: "One-off Audit",
    description: "Dosar audit complet livrat în 3-7 zile, plată unică.",
    priceEUR: 799,
    stripePriceIdEnvKey: "STRIPE_PRICE_ONE_OFF_AUDIT",
    features: [
      ...COMMON_BASE,
      ...COMMON_PRIVACY,
      "vendor-review",
      "breach-72h",
      "readiness-pack",
      "audit-pack",
      "audit-signed",
    ],
    includesPDFs: true,
    includesEmails: true,
    includesAPI: false,
    includesWhiteLabel: false,
    oneOff: true,
  },
}

// ────────────────────────────────────────────────────────────────────────────
//   Public helpers
// ────────────────────────────────────────────────────────────────────────────

export function getTierConfig(tier: BillingTier): TierConfig {
  const config = TIERS[tier]
  if (!config) throw new Error(`Tier necunoscut: ${tier}`)
  return config
}

export function listTiers(): TierConfig[] {
  return Object.values(TIERS)
}

export function listPaidTiers(): TierConfig[] {
  return listTiers().filter((t) => t.priceEUR > 0)
}

/**
 * Returnează Price ID-ul Stripe pentru un tier dat, din env vars.
 * Returnează null pentru free trial (nu are Stripe price) și pentru
 * cazul când env var lipsește (graceful degradation).
 */
export function getStripePriceId(tier: BillingTier): string | null {
  const config = getTierConfig(tier)
  if (!config.stripePriceIdEnvKey) return null
  const priceId = process.env[config.stripePriceIdEnvKey]?.trim()
  if (!priceId) return null
  return priceId
}

/**
 * True dacă Stripe e configurat în env (STRIPE_SECRET_KEY + cel puțin un
 * Price ID per tier paid). Folosit de UI ca să afișeze "billing pending"
 * sau pricing page complet.
 */
export function isStripeConfigured(): boolean {
  const hasSecret = Boolean(process.env.STRIPE_SECRET_KEY?.trim())
  if (!hasSecret) return false
  // At least one paid tier must have a price ID.
  return listPaidTiers().some((t) => getStripePriceId(t.tier) !== null)
}

export function tierHasFeature(tier: BillingTier, feature: TierFeature): boolean {
  return getTierConfig(tier).features.includes(feature)
}

/**
 * Lookup tier by Stripe Price ID (used in webhook handler).
 * Returnează null dacă price ID-ul nu mapează la niciun tier (e.g. test prices).
 */
export function findTierByStripePriceId(priceId: string): BillingTier | null {
  for (const tier of listTiers()) {
    if (getStripePriceId(tier.tier) === priceId) return tier.tier
  }
  return null
}
