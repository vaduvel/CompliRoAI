// Sprint 014 — Stripe tier config tests.
//
// Validate că:
//   1. Cele 7 tiers locked sunt definite cu pricing exact din mandate § 15
//   2. Numele displayName respectă spec (NU dpo-only naming)
//   3. NU există fiscal SKUs (mandate rule 3)
//   4. Feature mapping respectă spec v2 § 5
//   5. getStripePriceId returnează null când env lipsește (graceful)
//   6. isStripeConfigured() respectă env state

import { afterEach, beforeEach, describe, expect, it } from "vitest"

import type { BillingTier } from "@/lib/compliance/types"
import {
  findTierByStripePriceId,
  getStripePriceId,
  getTierConfig,
  isStripeConfigured,
  listPaidTiers,
  listTiers,
  tierHasFeature,
  TIERS,
} from "./stripe-tier-config"

describe("TIERS catalog (locked per mandate § 15)", () => {
  it("contains exactly 8 tiers (7 paid + free_trial)", () => {
    expect(listTiers()).toHaveLength(8)
  })

  it("has 7 paid tiers + 1 free trial", () => {
    expect(listPaidTiers()).toHaveLength(7)
  })

  it("uses exact pricing from mandate (€99 / 249 / 399 / 799 / 1499)", () => {
    expect(TIERS.imm_solo.priceEUR).toBe(99)
    expect(TIERS.imm_mid.priceEUR).toBe(249)
    expect(TIERS.ai_builder.priceEUR).toBe(399)
    expect(TIERS.cabinet_solo.priceEUR).toBe(399)
    expect(TIERS.cabinet_pro.priceEUR).toBe(799)
    expect(TIERS.cabinet_enterprise.priceEUR).toBe(1499)
    expect(TIERS.one_off_audit.priceEUR).toBe(799)
    expect(TIERS.free_trial.priceEUR).toBe(0)
  })

  it("uses 'AI Compliance OS' style names (NO DPO-only branding)", () => {
    for (const tier of listTiers()) {
      const lower = tier.displayName.toLowerCase()
      expect(lower).not.toContain("dpo only")
      expect(lower).not.toContain("dpo-only")
    }
  })

  it("NO fiscal SKUs in tier catalog (mandate rule 3)", () => {
    const fiscalKeywords = ["e-factura", "efactura", "spv", "fiscal", "tva", "etva", "anaf"]
    for (const tier of listTiers()) {
      const all =
        tier.displayName.toLowerCase() + " " + tier.description.toLowerCase() + " " + tier.features.join(" ")
      for (const kw of fiscalKeywords) {
        expect(all).not.toContain(kw)
      }
    }
  })

  it("free trial has 14d duration per mandate", () => {
    expect(TIERS.free_trial.trialDays).toBe(14)
  })

  it("cabinet tiers have maxClients limits aligned to mandate", () => {
    expect(TIERS.cabinet_solo.maxClients).toBe(10)
    expect(TIERS.cabinet_pro.maxClients).toBe(50)
    expect(TIERS.cabinet_enterprise.maxClients).toBeGreaterThanOrEqual(50)
  })

  it("AI Builder tier includes API + EU DB + FRIA features", () => {
    expect(TIERS.ai_builder.features).toContain("annex-iv")
    expect(TIERS.ai_builder.features).toContain("eu-database")
    expect(TIERS.ai_builder.features).toContain("fria")
    expect(TIERS.ai_builder.features).toContain("api-sdk")
    expect(TIERS.ai_builder.includesAPI).toBe(true)
  })

  it("Cabinet Pro includes white-label + trust-center + approval-queue", () => {
    expect(TIERS.cabinet_pro.features).toContain("white-label")
    expect(TIERS.cabinet_pro.features).toContain("trust-center")
    expect(TIERS.cabinet_pro.features).toContain("approval-queue")
    expect(TIERS.cabinet_pro.includesWhiteLabel).toBe(true)
  })

  it("Cabinet Enterprise includes SSO + DPA + SLA", () => {
    expect(TIERS.cabinet_enterprise.features).toContain("sso")
    expect(TIERS.cabinet_enterprise.features).toContain("dpa")
    expect(TIERS.cabinet_enterprise.features).toContain("sla")
  })

  it("One-off Audit is one-off (not recurring)", () => {
    expect(TIERS.one_off_audit.oneOff).toBe(true)
  })

  it("All tiers include PDF + email features (Sprint 014 baseline)", () => {
    for (const tier of listTiers()) {
      expect(tier.includesPDFs).toBe(true)
      expect(tier.includesEmails).toBe(true)
    }
  })
})

describe("getTierConfig", () => {
  it("returns config for valid tier", () => {
    const c = getTierConfig("imm_solo")
    expect(c.tier).toBe("imm_solo")
    expect(c.priceEUR).toBe(99)
  })

  it("throws for unknown tier", () => {
    expect(() => getTierConfig("xxx" as BillingTier)).toThrow()
  })
})

describe("getStripePriceId + isStripeConfigured (graceful degradation)", () => {
  beforeEach(() => {
    delete process.env.STRIPE_SECRET_KEY
    delete process.env.STRIPE_PRICE_IMM_SOLO
    delete process.env.STRIPE_PRICE_IMM_MID
  })
  afterEach(() => {
    delete process.env.STRIPE_SECRET_KEY
    delete process.env.STRIPE_PRICE_IMM_SOLO
  })

  it("returns null when env var missing", () => {
    expect(getStripePriceId("imm_solo")).toBeNull()
  })

  it("returns null for free_trial (no Stripe price needed)", () => {
    expect(getStripePriceId("free_trial")).toBeNull()
  })

  it("returns env value when present", () => {
    process.env.STRIPE_PRICE_IMM_SOLO = "price_test_imm_solo"
    expect(getStripePriceId("imm_solo")).toBe("price_test_imm_solo")
  })

  it("isStripeConfigured returns false when secret missing", () => {
    expect(isStripeConfigured()).toBe(false)
  })

  it("isStripeConfigured returns false when secret present but no prices", () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_xxx"
    expect(isStripeConfigured()).toBe(false)
  })

  it("isStripeConfigured returns true when secret + at least one price set", () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_xxx"
    process.env.STRIPE_PRICE_IMM_SOLO = "price_test_xxx"
    expect(isStripeConfigured()).toBe(true)
  })
})

describe("findTierByStripePriceId (webhook handler reverse lookup)", () => {
  beforeEach(() => {
    process.env.STRIPE_PRICE_IMM_SOLO = "price_real_imm_solo"
    process.env.STRIPE_PRICE_CABINET_PRO = "price_real_cabinet_pro"
  })
  afterEach(() => {
    delete process.env.STRIPE_PRICE_IMM_SOLO
    delete process.env.STRIPE_PRICE_CABINET_PRO
  })

  it("finds tier by Price ID", () => {
    expect(findTierByStripePriceId("price_real_imm_solo")).toBe("imm_solo")
    expect(findTierByStripePriceId("price_real_cabinet_pro")).toBe("cabinet_pro")
  })

  it("returns null for unknown Price ID", () => {
    expect(findTierByStripePriceId("price_unknown")).toBeNull()
  })
})

describe("tierHasFeature", () => {
  it("checks feature inclusion correctly", () => {
    expect(tierHasFeature("ai_builder", "annex-iv")).toBe(true)
    expect(tierHasFeature("imm_solo", "annex-iv")).toBe(false)
    expect(tierHasFeature("cabinet_enterprise", "sso")).toBe(true)
    expect(tierHasFeature("imm_solo", "sso")).toBe(false)
  })
})
