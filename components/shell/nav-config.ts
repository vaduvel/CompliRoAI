// Sprint 015 — Single source of truth for sidebar navigation.
//
// Strategy: ONE catalog of nav items, each tagged with:
//   - workspaceModes[] — which roles can see this item (mandate § 16)
//   - requiredFeature  — optional feature flag (gated by feature-gates.ts)
//   - section          — visual group label rendered in sidebar
//   - badge            — "new", "coming-soon", "trial" for visual hint
//
// `getNavForRole(workspaceMode, tier)` returns the filtered + grouped list.
//
// Per mandate: UI must NOT show irrelevant modules by default. Cabinet doesn't
// see Annex IV. IMM Classic doesn't see Portfolio. No role sees fiscal /
// whistleblowing / pay transparency (those are absent from this catalog).

import type { BillingTier } from "@/lib/compliance/types"
import type { WorkspaceMode } from "@/lib/server/auth"
import {
  type Feature,
  featureBelongsToWorkspace,
  hasFeature,
} from "@/lib/server/feature-gates"

export type NavBadge = "new" | "coming-soon" | "trial"

export type NavSection =
  | "main"        // Home, primary workflows
  | "compliance"  // DPIA / RoPA / DSAR / Breach
  | "discovery"   // AI Discovery / Vendor / Role Assessment
  | "exports"     // Readiness Pack / Audit Pack / Reports
  | "collab"      // Cabinet collaboration: approvals, magic links, trust
  | "builder"     // AI Builder depth: Annex IV / FRIA / Oversight / PMM / QMS
  | "settings"    // Settings, billing, branding

export type NavItemConfig = {
  /** Route path. */
  href: string
  /** Romanian display label rendered in sidebar. */
  label: string
  /** Lucide icon name. UI maps to component. */
  iconName: string
  /** Section group (renders as small subtle label above items). */
  section: NavSection
  /** Workspace modes that can see this item. */
  workspaceModes: WorkspaceMode[]
  /** Optional gating feature — if set, item only shows when hasFeature() = true. */
  requiredFeature?: Feature
  /** Optional badge ("Nou", "Curând", "Trial"). */
  badge?: NavBadge
}

// ── Catalog ───────────────────────────────────────────────────────────────────
//
// Order in this array = render order within each section.
export const ALL_NAV_ITEMS: NavItemConfig[] = [
  // ── MAIN ────────────────────────────────────────────────────────────────────
  {
    href: "/dashboard",
    label: "Acasă",
    iconName: "Home",
    section: "main",
    workspaceModes: ["imm-classic", "ai-builder", "cabinet"],
  },
  {
    href: "/dashboard/portofoliu",
    label: "Portofoliu",
    iconName: "Users",
    section: "main",
    workspaceModes: ["cabinet"],
    requiredFeature: "multi_client_portfolio",
  },
  {
    href: "/dashboard/clienti",
    label: "Clienți",
    iconName: "Building2",
    section: "main",
    workspaceModes: ["cabinet"],
    requiredFeature: "multi_client_portfolio",
  },
  {
    href: "/dashboard/sisteme",
    label: "Inventar AI",
    iconName: "Cpu",
    section: "main",
    workspaceModes: ["imm-classic", "ai-builder", "cabinet"],
    requiredFeature: "ai_inventory",
  },

  // ── DISCOVERY / RISK CLASSIFICATION ─────────────────────────────────────────
  {
    href: "/dashboard/conformitate",
    label: "Risc AI",
    iconName: "FileCheck",
    section: "discovery",
    workspaceModes: ["imm-classic"],
    requiredFeature: "ai_risk_classification",
  },
  {
    href: "/dashboard/role-assessment",
    label: "Role Assessment",
    iconName: "Compass",
    section: "discovery",
    workspaceModes: ["ai-builder", "cabinet"],
  },
  {
    href: "/dashboard/conformitate",
    label: "Conformity Assessment",
    iconName: "FileCheck",
    section: "discovery",
    workspaceModes: ["ai-builder"],
    requiredFeature: "conformity_assessment",
  },
  {
    href: "/dashboard/transparency",
    label: "Transparency",
    iconName: "MessageSquare",
    section: "discovery",
    workspaceModes: ["imm-classic"],
    requiredFeature: "transparency_engine",
  },
  {
    href: "/dashboard/literacy",
    label: "AI Literacy",
    iconName: "BookOpen",
    section: "discovery",
    workspaceModes: ["imm-classic"],
    requiredFeature: "literacy_tracking",
  },
  {
    href: "/dashboard/vendor-review",
    label: "Vendor AI",
    iconName: "Package",
    section: "discovery",
    workspaceModes: ["imm-classic", "cabinet"],
    requiredFeature: "vendor_review",
  },
  {
    href: "/dashboard/ai-discovery",
    label: "AI Discovery",
    iconName: "Search",
    section: "discovery",
    workspaceModes: ["cabinet"],
  },

  // ── BUILDER DEPTH (ai-builder only) ─────────────────────────────────────────
  {
    href: "/dashboard/sisteme/eu-db-wizard",
    label: "Annex IV",
    iconName: "FileText",
    section: "builder",
    workspaceModes: ["ai-builder"],
    requiredFeature: "annex_iv_generator",
  },
  {
    href: "/dashboard/sisteme/eu-db-wizard",
    label: "EU Database",
    iconName: "Database",
    section: "builder",
    workspaceModes: ["ai-builder"],
    requiredFeature: "eu_database_wizard",
  },
  {
    // FRIA = Fundamental Rights Impact Assessment (Art. 27 AI Act).
    // Obligație compliance pentru deployeri high-risk; expusă atât în ai-builder
    // (provider+deployer dual) cât și în cabinet (consultantul prepară FRIA
    // pe seama clienților deployer). Plasată în "compliance" pentru cabinet
    // alignment cu DPIA/RoPA și pentru a păstra section grouping fără "builder".
    href: "/dashboard/fria",
    label: "FRIA",
    iconName: "ShieldAlert",
    section: "compliance",
    workspaceModes: ["ai-builder", "cabinet"],
    requiredFeature: "fria_generator",
  },
  {
    // Sprint 017 — Human Oversight Protocols (Art. 14). Cabinetele prepară
    // protocoale Art. 14 pentru clienții deployer (similar cu FRIA). Plasat
    // în "compliance" pentru cabinet alignment cu DPIA / FRIA.
    href: "/dashboard/human-oversight",
    label: "Oversight uman",
    iconName: "Eye",
    section: "compliance",
    workspaceModes: ["ai-builder", "cabinet"],
    requiredFeature: "human_oversight_protocols",
  },
  {
    // Sprint 018 — Logging Evidence (Art. 12 + Art. 26(6)). Cabinetele prepară
    // configurări de logging pentru clienții deployer (similar cu FRIA +
    // Oversight). Plasat în "compliance" pentru cabinet alignment.
    href: "/dashboard/logging-evidence",
    label: "Logging",
    iconName: "Database",
    section: "compliance",
    workspaceModes: ["ai-builder", "cabinet"],
    requiredFeature: "logging_evidence",
  },
  {
    href: "/dashboard/post-market-monitoring",
    label: "PMM",
    iconName: "Activity",
    section: "compliance",
    workspaceModes: ["ai-builder", "cabinet"],
    requiredFeature: "post_market_monitoring",
  },
  {
    // Sprint 020 — AI Incident Reporting (Art. 73 AI Act). Cabinetele asistă
    // clienții deployer la raportarea incidentelor serioase, similar cu FRIA
    // + Oversight + Logging + PMM. Plasat în "compliance" pentru cabinet
    // alignment.
    href: "/dashboard/ai-incidents",
    label: "Incidente AI",
    iconName: "Bell",
    section: "compliance",
    workspaceModes: ["ai-builder", "cabinet"],
    requiredFeature: "ai_incident_reporting",
  },
  {
    href: "/dashboard/qms",
    label: "QMS",
    iconName: "Cog",
    section: "builder",
    workspaceModes: ["ai-builder"],
    requiredFeature: "qms",
    badge: "coming-soon",
  },
  {
    href: "/dashboard/api-sdk",
    label: "API / SDK",
    iconName: "Code",
    section: "builder",
    workspaceModes: ["ai-builder"],
    requiredFeature: "api_sdk",
    badge: "coming-soon",
  },

  // ── COMPLIANCE (GDPR / privacy) ─────────────────────────────────────────────
  {
    href: "/dashboard/dpia",
    label: "DPIA",
    iconName: "ClipboardCheck",
    section: "compliance",
    workspaceModes: ["imm-classic", "ai-builder", "cabinet"],
    requiredFeature: "dpia",
  },
  {
    href: "/dashboard/ropa",
    label: "RoPA / Data Map",
    iconName: "Database",
    section: "compliance",
    workspaceModes: ["cabinet", "ai-builder"],
    requiredFeature: "ropa",
  },
  {
    href: "/dashboard/dsar",
    label: "DSAR (GDPR)",
    iconName: "Mail",
    section: "compliance",
    workspaceModes: ["cabinet"],
    requiredFeature: "dsar",
  },
  {
    href: "/dashboard/breach",
    label: "Incident date personale",
    iconName: "ShieldAlert",
    section: "compliance",
    workspaceModes: ["cabinet"],
    requiredFeature: "breach_72h",
  },
  {
    href: "/dashboard/resolve",
    label: "De rezolvat",
    iconName: "AlertCircle",
    section: "compliance",
    workspaceModes: ["imm-classic", "ai-builder", "cabinet"],
    requiredFeature: "findings",
  },

  // ── EXPORTS ─────────────────────────────────────────────────────────────────
  {
    href: "/dashboard/readiness-pack",
    label: "Readiness Pack",
    iconName: "Sparkles",
    section: "exports",
    workspaceModes: ["imm-classic"],
    requiredFeature: "readiness_pack",
  },
  {
    href: "/dashboard/rapoarte",
    label: "Rapoarte",
    iconName: "FileBarChart",
    section: "exports",
    workspaceModes: ["cabinet"],
    requiredFeature: "readiness_pack",
  },
  {
    href: "/dashboard/audit-pack",
    label: "Audit Pack",
    iconName: "ShieldCheck",
    section: "exports",
    workspaceModes: ["imm-classic", "ai-builder", "cabinet"],
    requiredFeature: "audit_pack",
  },
  {
    href: "/dashboard/dosar",
    label: "Dosar",
    iconName: "History",
    section: "exports",
    workspaceModes: ["cabinet"],
  },
  {
    href: "/dashboard/audit-log",
    label: "Audit Log",
    iconName: "FileSearch",
    section: "exports",
    workspaceModes: ["cabinet"],
  },

  // ── CABINET COLLABORATION ───────────────────────────────────────────────────
  {
    href: "/dashboard/client-intake",
    label: "Client Intake",
    iconName: "UserPlus",
    section: "collab",
    workspaceModes: ["cabinet"],
    requiredFeature: "client_intake",
  },
  {
    href: "/dashboard/approvals",
    label: "Aprobări",
    iconName: "CheckSquare",
    section: "collab",
    workspaceModes: ["cabinet"],
    requiredFeature: "approval_queue",
  },
  {
    href: "/dashboard/calendar",
    label: "Calendar",
    iconName: "Calendar",
    section: "collab",
    workspaceModes: ["cabinet"],
  },
  {
    href: "/dashboard/magic-links",
    label: "Magic Links",
    iconName: "Link2",
    section: "collab",
    workspaceModes: ["cabinet"],
    requiredFeature: "magic_links",
  },
  {
    href: "/dashboard/trust-center",
    label: "Trust Center",
    iconName: "Eye",
    section: "collab",
    workspaceModes: ["cabinet"],
    requiredFeature: "trust_center",
  },

  // ── SETTINGS ────────────────────────────────────────────────────────────────
  {
    href: "/dashboard/setari/branding",
    label: "Branding",
    iconName: "Palette",
    section: "settings",
    workspaceModes: ["cabinet"],
    requiredFeature: "white_label",
  },
  {
    href: "/dashboard/setari/billing",
    label: "Setări (facturare)",
    iconName: "Settings",
    section: "settings",
    workspaceModes: ["imm-classic", "ai-builder", "cabinet"],
  },
]

// ── Section labels (rendered above grouped items) ────────────────────────────
export const SECTION_LABELS: Record<NavSection, string> = {
  main: "",
  discovery: "Discovery & risc",
  compliance: "Conformitate",
  exports: "Rapoarte & dosar",
  collab: "Colaborare",
  builder: "AI Builder",
  settings: "Setări",
}

/** Order of sections from top to bottom in sidebar. */
export const SECTION_ORDER: NavSection[] = [
  "main",
  "discovery",
  "builder",
  "compliance",
  "exports",
  "collab",
  "settings",
]

// ── Public API ────────────────────────────────────────────────────────────────

export type NavSectionGroup = {
  section: NavSection
  label: string
  items: NavItemConfig[]
}

/**
 * Returns the filtered + grouped nav for a (workspaceMode, tier) combination.
 * Sections with zero items are omitted. Items where `requiredFeature` resolves
 * to false (via feature-gates) are dropped, EXCEPT for placeholder items with
 * `badge: "coming-soon"` which always render so users understand what's planned.
 */
export function getNavForRole(
  workspaceMode: WorkspaceMode,
  tier: BillingTier
): NavSectionGroup[] {
  const filteredItems = ALL_NAV_ITEMS.filter((item) => {
    // 1. Workspace mode must match.
    if (!item.workspaceModes.includes(workspaceMode)) return false

    // 2. If no feature required, item is always shown (Home, Calendar, Audit Log).
    if (!item.requiredFeature) return true

    // 3. Coming-soon items: show even if locked, so user understands the roadmap.
    //    They link to placeholder pages that explain the upcoming module.
    if (item.badge === "coming-soon") {
      // Still must belong to the workspace's workflow.
      return featureBelongsToWorkspace(workspaceMode, item.requiredFeature)
    }

    // 4. Otherwise, require the feature gate to pass for current tier.
    return hasFeature(workspaceMode, tier, item.requiredFeature)
  })

  // Group by section in SECTION_ORDER.
  const groups: NavSectionGroup[] = []
  for (const section of SECTION_ORDER) {
    const items = filteredItems.filter((i) => i.section === section)
    if (items.length === 0) continue
    groups.push({
      section,
      label: SECTION_LABELS[section],
      items,
    })
  }
  return groups
}

/**
 * Forbidden modules that must NEVER appear in any role's nav.
 * Used by tests as a defensive guard against accidental fiscal/whistleblowing
 * leaks (mandate rule 3).
 */
export const FORBIDDEN_NAV_KEYWORDS = [
  "fiscal",
  "e-factura",
  "anaf",
  "spv",
  "saf-t",
  "pay-transparency",
  "whistleblowing",
  "warisori",
] as const
