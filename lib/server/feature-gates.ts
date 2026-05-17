// Sprint 015 — Feature gates matrix.
//
// Decide what a (workspaceMode, tier) combination can see/use. Used by:
//   - Sidebar (gates which nav items appear)
//   - UI (gates buttons → upsell when feature locked)
//   - Future API routes (defensive enforcement)
//
// Two axes:
//   1. workspaceMode determines IF an item belongs to a role's workflow
//      (e.g. Annex IV is only for ai-builder; Approval Queue is only for cabinet).
//   2. tier determines WHICH paid features in that role are unlocked
//      (e.g. white-label is gated by cabinet_pro+; FRIA gated by ai_builder).
//
// Free trial sees ALL features for trial duration (per mandate § 15).

import type { BillingTier } from "@/lib/compliance/types"
import type { WorkspaceMode } from "@/lib/server/auth"

/**
 * Sprint 015 feature catalog. Distinct from `TierFeature` in
 * `stripe-tier-config.ts` — that is the marketing tier-feature mapping for
 * pricing pages. This is the runtime gate registry used by UI.
 */
export type Feature =
  // ── Common to all roles (always available unless tier explicitly removes) ──
  | "ai_inventory"
  | "ai_risk_classification"
  | "transparency_engine"
  | "literacy_tracking"
  | "vendor_review"
  | "dpia"
  | "ropa"
  | "dsar"
  | "breach_72h"
  | "findings"
  | "readiness_pack"
  | "audit_pack"
  // ── AI Builder workflow ────────────────────────────────────────────────────
  | "annex_iv_generator"
  | "eu_database_wizard"
  | "conformity_assessment"
  | "fria_generator"
  | "api_sdk"
  | "human_oversight_protocols"
  | "logging_evidence"
  | "post_market_monitoring"
  | "ai_incident_reporting"
  | "qms"
  // ── Cabinet workflow ───────────────────────────────────────────────────────
  | "multi_client_portfolio"
  | "magic_links"
  | "approval_queue"
  | "trust_center"
  | "white_label"
  | "client_intake"
  // ── Premium / cross-cutting ────────────────────────────────────────────────
  | "audit_pack_signed"
  | "pdf_exports"
  | "email_notifications"
  | "sso"
  | "dpa"
  | "sla"

// ── Workspace-mode visibility map ─────────────────────────────────────────────
//
// First gate: does the feature even belong in this role's workflow?
// If false here, the feature is hidden regardless of tier.
const WORKSPACE_MODE_FEATURES: Record<WorkspaceMode, ReadonlySet<Feature>> = {
  "imm-classic": new Set<Feature>([
    "ai_inventory",
    "ai_risk_classification",
    "transparency_engine",
    "literacy_tracking",
    "vendor_review",
    "dpia",
    "ropa",
    "dsar",
    "breach_72h",
    "findings",
    "readiness_pack",
    "audit_pack",
    "audit_pack_signed",
    "pdf_exports",
    "email_notifications",
  ]),
  "ai-builder": new Set<Feature>([
    "ai_inventory",
    "ai_risk_classification",
    "findings",
    "audit_pack",
    "audit_pack_signed",
    "pdf_exports",
    "email_notifications",
    "annex_iv_generator",
    "eu_database_wizard",
    "conformity_assessment",
    "fria_generator",
    "api_sdk",
    "human_oversight_protocols",
    "logging_evidence",
    "post_market_monitoring",
    "ai_incident_reporting",
    "qms",
    // ai-builder also retains literacy / vendor / dpia at the deployer side
    "transparency_engine",
    "literacy_tracking",
    "vendor_review",
    "dpia",
    "ropa",
    "dsar",
    "breach_72h",
  ]),
  cabinet: new Set<Feature>([
    "ai_inventory",
    "ai_risk_classification",
    "transparency_engine",
    "literacy_tracking",
    "vendor_review",
    "dpia",
    "ropa",
    "dsar",
    "breach_72h",
    "findings",
    "readiness_pack",
    "audit_pack",
    "audit_pack_signed",
    "pdf_exports",
    "email_notifications",
    "multi_client_portfolio",
    "magic_links",
    "approval_queue",
    "trust_center",
    "white_label",
    "client_intake",
    "sso",
    "dpa",
    "sla",
    // Sprint 016 — cabinets prepare FRIA evaluations for client deployers
    // (deployer of a high-risk system per Art. 27(1)).
    "fria_generator",
    // Sprint 017 — cabinets prepare Human Oversight Protocols (Art. 14) for
    // client deployers of high-risk AI systems.
    "human_oversight_protocols",
  ]),
}

// ── Tier feature unlock map ───────────────────────────────────────────────────
//
// Second gate: even if the feature belongs to the role's workflow, the user
// must be on a tier that unlocks it. free_trial unlocks everything during the
// trial period.
const TIER_UNLOCKED_FEATURES: Record<BillingTier, ReadonlySet<Feature>> = {
  free_trial: new Set<Feature>([
    "ai_inventory",
    "ai_risk_classification",
    "transparency_engine",
    "literacy_tracking",
    "vendor_review",
    "dpia",
    "ropa",
    "dsar",
    "breach_72h",
    "findings",
    "readiness_pack",
    "audit_pack",
    "audit_pack_signed",
    "annex_iv_generator",
    "eu_database_wizard",
    "conformity_assessment",
    "fria_generator",
    "api_sdk",
    "human_oversight_protocols",
    "logging_evidence",
    "post_market_monitoring",
    "ai_incident_reporting",
    "qms",
    "multi_client_portfolio",
    "magic_links",
    "approval_queue",
    "trust_center",
    "white_label",
    "client_intake",
    "pdf_exports",
    "email_notifications",
  ]),
  imm_solo: new Set<Feature>([
    "ai_inventory",
    "ai_risk_classification",
    "transparency_engine",
    "literacy_tracking",
    "vendor_review",
    "dpia",
    "ropa",
    "dsar",
    "breach_72h",
    "findings",
    "readiness_pack",
    "pdf_exports",
    "email_notifications",
  ]),
  imm_mid: new Set<Feature>([
    "ai_inventory",
    "ai_risk_classification",
    "transparency_engine",
    "literacy_tracking",
    "vendor_review",
    "dpia",
    "ropa",
    "dsar",
    "breach_72h",
    "findings",
    "readiness_pack",
    "audit_pack",
    "audit_pack_signed",
    "pdf_exports",
    "email_notifications",
  ]),
  ai_builder: new Set<Feature>([
    "ai_inventory",
    "ai_risk_classification",
    "transparency_engine",
    "literacy_tracking",
    "vendor_review",
    "dpia",
    "ropa",
    "dsar",
    "breach_72h",
    "findings",
    "audit_pack",
    "audit_pack_signed",
    "pdf_exports",
    "email_notifications",
    "annex_iv_generator",
    "eu_database_wizard",
    "conformity_assessment",
    "fria_generator",
    "api_sdk",
    "human_oversight_protocols",
    "logging_evidence",
    "post_market_monitoring",
    "ai_incident_reporting",
    "qms",
  ]),
  cabinet_solo: new Set<Feature>([
    "ai_inventory",
    "ai_risk_classification",
    "transparency_engine",
    "literacy_tracking",
    "vendor_review",
    "dpia",
    "ropa",
    "dsar",
    "breach_72h",
    "findings",
    "readiness_pack",
    "audit_pack",
    "audit_pack_signed",
    "multi_client_portfolio",
    "magic_links",
    "client_intake",
    "pdf_exports",
    "email_notifications",
  ]),
  cabinet_pro: new Set<Feature>([
    "ai_inventory",
    "ai_risk_classification",
    "transparency_engine",
    "literacy_tracking",
    "vendor_review",
    "dpia",
    "ropa",
    "dsar",
    "breach_72h",
    "findings",
    "readiness_pack",
    "audit_pack",
    "audit_pack_signed",
    "multi_client_portfolio",
    "magic_links",
    "approval_queue",
    "trust_center",
    "white_label",
    "client_intake",
    "pdf_exports",
    "email_notifications",
    // Sprint 016 — cabinet preparing FRIA for client deployer.
    "fria_generator",
    // Sprint 017 — cabinet preparing Oversight Protocols (Art. 14).
    "human_oversight_protocols",
  ]),
  cabinet_enterprise: new Set<Feature>([
    "ai_inventory",
    "ai_risk_classification",
    "transparency_engine",
    "literacy_tracking",
    "vendor_review",
    "dpia",
    "ropa",
    "dsar",
    "breach_72h",
    "findings",
    "readiness_pack",
    "audit_pack",
    "audit_pack_signed",
    "multi_client_portfolio",
    "magic_links",
    "approval_queue",
    "trust_center",
    "white_label",
    "client_intake",
    "pdf_exports",
    "email_notifications",
    "sso",
    "dpa",
    "sla",
    "fria_generator",
    // Sprint 017 — cabinet preparing Oversight Protocols (Art. 14).
    "human_oversight_protocols",
  ]),
  one_off_audit: new Set<Feature>([
    "ai_inventory",
    "ai_risk_classification",
    "transparency_engine",
    "literacy_tracking",
    "vendor_review",
    "dpia",
    "ropa",
    "dsar",
    "breach_72h",
    "findings",
    "readiness_pack",
    "audit_pack",
    "audit_pack_signed",
    "pdf_exports",
    "email_notifications",
  ]),
}

/**
 * True if the (workspaceMode, tier) combination grants access to the feature.
 *
 * Logic: feature must be present in BOTH the workspace mode allowlist AND the
 * tier allowlist. This makes feature visibility intersectional — for instance,
 * `annex_iv_generator` is workspace-allowed only for `ai-builder`, and within
 * that, tier-allowed only for `ai_builder` and `free_trial`.
 */
export function hasFeature(
  workspaceMode: WorkspaceMode,
  tier: BillingTier,
  feature: Feature
): boolean {
  const inMode = WORKSPACE_MODE_FEATURES[workspaceMode]?.has(feature) ?? false
  const inTier = TIER_UNLOCKED_FEATURES[tier]?.has(feature) ?? false
  return inMode && inTier
}

/**
 * Returns the lowest paid tier that unlocks `feature` within `workspaceMode`.
 * Used by UI to show "Activează tier {X}" upsell text. Returns null if no paid
 * tier unlocks it (e.g. cross-workspace mismatch).
 */
export function findUpgradeTierForFeature(
  workspaceMode: WorkspaceMode,
  feature: Feature
): BillingTier | null {
  // Search order = cheapest → most expensive paid tier for that role.
  const tierOrder: BillingTier[] = (() => {
    if (workspaceMode === "imm-classic") return ["imm_solo", "imm_mid"]
    if (workspaceMode === "ai-builder") return ["ai_builder"]
    return ["cabinet_solo", "cabinet_pro", "cabinet_enterprise"]
  })()

  for (const tier of tierOrder) {
    if (hasFeature(workspaceMode, tier, feature)) return tier
  }
  return null
}

/**
 * Returns true if `feature` belongs to `workspaceMode`'s workflow (ignoring tier).
 * Useful for checking "should this UI section render at all?" — separate from
 * "should this UI section be unlocked?".
 */
export function featureBelongsToWorkspace(
  workspaceMode: WorkspaceMode,
  feature: Feature
): boolean {
  return WORKSPACE_MODE_FEATURES[workspaceMode]?.has(feature) ?? false
}

/**
 * Returns all features unlocked for a (workspaceMode, tier) combination.
 * Used in tests + debug pages.
 */
export function listUnlockedFeatures(
  workspaceMode: WorkspaceMode,
  tier: BillingTier
): Feature[] {
  const mode = WORKSPACE_MODE_FEATURES[workspaceMode]
  const tierSet = TIER_UNLOCKED_FEATURES[tier]
  if (!mode || !tierSet) return []
  return Array.from(mode).filter((f) => tierSet.has(f))
}
