import { describe, expect, it } from "vitest"

import {
  ALL_NAV_ITEMS,
  FORBIDDEN_NAV_KEYWORDS,
  getNavForRole,
} from "./nav-config"

// Helpers ────────────────────────────────────────────────────────────────────
function labelsForRole(workspaceMode: Parameters<typeof getNavForRole>[0], tier: Parameters<typeof getNavForRole>[1]) {
  return getNavForRole(workspaceMode, tier).flatMap((g) => g.items.map((i) => i.label))
}

function hrefsForRole(workspaceMode: Parameters<typeof getNavForRole>[0], tier: Parameters<typeof getNavForRole>[1]) {
  return getNavForRole(workspaceMode, tier).flatMap((g) => g.items.map((i) => i.href))
}

describe("nav-config — forbidden modules never appear", () => {
  it("no item href or label contains forbidden frameworks (fiscal/whistleblowing/etc)", () => {
    for (const item of ALL_NAV_ITEMS) {
      for (const keyword of FORBIDDEN_NAV_KEYWORDS) {
        expect(item.href.toLowerCase()).not.toContain(keyword)
        expect(item.label.toLowerCase()).not.toContain(keyword)
      }
    }
  })

  it("free_trial nav in any workspace mode excludes forbidden modules", () => {
    for (const mode of ["imm-classic", "ai-builder", "cabinet"] as const) {
      const hrefs = hrefsForRole(mode, "free_trial")
      for (const href of hrefs) {
        for (const keyword of FORBIDDEN_NAV_KEYWORDS) {
          expect(href.toLowerCase()).not.toContain(keyword)
        }
      }
    }
  })
})

describe("nav-config — imm-classic exposes mandate-spec items", () => {
  it("imm-classic on free_trial sees: Acasă, Inventar AI, Risc AI, Notificări, Literacy, Furnizori, DPIA, De rezolvat, Dosar readiness, Audit Pack, Settings", () => {
    const labels = labelsForRole("imm-classic", "free_trial")
    expect(labels).toContain("Acasă")
    expect(labels).toContain("Inventar AI")
    expect(labels).toContain("Risc AI")
    expect(labels).toContain("Notificări transparență")
    expect(labels).toContain("AI Literacy")
    expect(labels).toContain("Furnizori AI")
    expect(labels).toContain("DPIA")
    expect(labels).toContain("De rezolvat")
    expect(labels).toContain("Dosar readiness")
    expect(labels).toContain("Audit Pack")
    expect(labels).toContain("Setări (facturare)")
  })

  it("imm-classic does NOT see ai-builder items (Annex IV, FRIA, EU Database, QMS)", () => {
    const labels = labelsForRole("imm-classic", "free_trial")
    expect(labels).not.toContain("Annex IV")
    expect(labels).not.toContain("FRIA")
    expect(labels).not.toContain("EU Database")
    expect(labels).not.toContain("QMS")
    expect(labels).not.toContain("Evaluare conformitate")
    expect(labels).not.toContain("API / SDK")
  })

  it("imm-classic does NOT see cabinet items (Portofoliu, Approvals, Trust Center)", () => {
    const labels = labelsForRole("imm-classic", "free_trial")
    expect(labels).not.toContain("Portofoliu")
    expect(labels).not.toContain("Clienți")
    expect(labels).not.toContain("Aprobări")
    expect(labels).not.toContain("Trust Center")
    expect(labels).not.toContain("Magic Links")
    expect(labels).not.toContain("Branding")
  })

  it("imm-classic on imm_solo tier sees Readiness Pack but NOT Audit Pack", () => {
    const labels = labelsForRole("imm-classic", "imm_solo")
    expect(labels).toContain("Dosar readiness")
    expect(labels).not.toContain("Audit Pack")
  })

  it("imm-classic on imm_mid tier sees both Readiness Pack AND Audit Pack", () => {
    const labels = labelsForRole("imm-classic", "imm_mid")
    expect(labels).toContain("Dosar readiness")
    expect(labels).toContain("Audit Pack")
  })
})

describe("nav-config — ai-builder exposes builder workflow", () => {
  it("ai-builder on free_trial sees: Acasă, Inventar AI, Role Assessment, Annex IV, EU DB, Conformity, FRIA, Oversight, Logging, PMM, Incidente, QMS, API/SDK, De rezolvat, Audit Pack, Settings", () => {
    const labels = labelsForRole("ai-builder", "free_trial")
    expect(labels).toContain("Acasă")
    expect(labels).toContain("Inventar AI")
    expect(labels).toContain("Evaluare rol")
    expect(labels).toContain("Annex IV")
    expect(labels).toContain("EU Database")
    expect(labels).toContain("Evaluare conformitate")
    expect(labels).toContain("FRIA")
    expect(labels).toContain("Supraveghere umană")
    expect(labels).toContain("Jurnalizare")
    expect(labels).toContain("Monitorizare post-market")
    expect(labels).toContain("Incidente AI")
    expect(labels).toContain("QMS")
    expect(labels).toContain("API / SDK")
    expect(labels).toContain("De rezolvat")
    expect(labels).toContain("Audit Pack")
    expect(labels).toContain("Setări (facturare)")
  })

  it("ai-builder does NOT see cabinet collab items", () => {
    const labels = labelsForRole("ai-builder", "free_trial")
    expect(labels).not.toContain("Portofoliu")
    expect(labels).not.toContain("Aprobări")
    expect(labels).not.toContain("Trust Center")
    expect(labels).not.toContain("Magic Links")
    expect(labels).not.toContain("Branding")
    expect(labels).not.toContain("Client Intake")
  })

  it("ai-builder does NOT see imm-only 'Risc AI' (uses Conformity Assessment instead)", () => {
    const labels = labelsForRole("ai-builder", "free_trial")
    expect(labels).not.toContain("Risc AI")
  })

  it("ai-builder Sprint 016-023 modules sunt live pe ai_builder tier (FRIA + Oversight + Logging + PMM + Incidente + QMS + API/SDK)", () => {
    const labels = labelsForRole("ai-builder", "ai_builder")
    // Sprint 016 + 017 + 018 + 019 + 020 + 021 — toate live in "compliance".
    expect(labels).toContain("FRIA")
    expect(labels).toContain("Supraveghere umană")
    expect(labels).toContain("Jurnalizare")
    expect(labels).toContain("Monitorizare post-market")
    expect(labels).toContain("Incidente AI")
    expect(labels).toContain("QMS")
    // Sprint 023 — API/SDK acum live (no longer coming-soon).
    expect(labels).toContain("API / SDK")
  })

  it("API / SDK nav item nu mai poartă badge 'coming-soon' după Sprint 023", () => {
    const apiItem = ALL_NAV_ITEMS.find((it) => it.href === "/dashboard/api-sdk")
    expect(apiItem).toBeDefined()
    expect(apiItem?.badge).toBeUndefined()
    expect(apiItem?.workspaceModes).toEqual(["ai-builder"])
    expect(apiItem?.requiredFeature).toBe("api_sdk")
  })
})

describe("nav-config — cabinet exposes full collaboration workflow", () => {
  it("cabinet on free_trial sees mandate-spec items: Portofoliu, Clients, Client Intake, AI Discovery, Findings, DPIA, RoPA, DSAR, Breach, Vendor, Reports, Audit Pack, Approval Queue, Calendar, Trust Center, Branding, Settings", () => {
    const labels = labelsForRole("cabinet", "free_trial")
    expect(labels).toContain("Portofoliu")
    expect(labels).toContain("Clienți")
    expect(labels).toContain("Client Intake")
    expect(labels).toContain("Descoperire AI")
    expect(labels).toContain("De rezolvat")
    expect(labels).toContain("DPIA")
    expect(labels).toContain("Hartă date (RoPA)")
    expect(labels).toContain("DSAR (GDPR)")
    expect(labels).toContain("Incident date personale")
    expect(labels).toContain("Incidente AI")
    expect(labels).toContain("Furnizori AI")
    expect(labels).toContain("Rapoarte")
    expect(labels).toContain("Audit Pack")
    expect(labels).toContain("Aprobări")
    expect(labels).toContain("Calendar")
    expect(labels).toContain("Trust Center")
    expect(labels).toContain("Branding")
    expect(labels).toContain("Setări (facturare)")
  })

  it("cabinet does NOT see ai-builder-only modules (Annex IV / EU DB / API SDK), DOES see FRIA + Oversight + Logging + PMM + Incidente AI + QMS (Sprint 016-021 — cabinets prepare pentru clienți provider/deployer)", () => {
    const labels = labelsForRole("cabinet", "free_trial")
    expect(labels).not.toContain("Annex IV")
    expect(labels).not.toContain("EU Database")
    expect(labels).not.toContain("API / SDK")
    // FRIA + Oversight + Logging + PMM + Incidente AI + QMS sunt shared între
    // ai-builder + cabinet per mandate § 16-21 — cabinet prepares evaluări pe
    // seama clienților provider/deployer (Art. 27 + Art. 14 + Art. 12 + Art.
    // 72 + Art. 73 + Art. 17 AI Act).
    expect(labels).toContain("FRIA")
    expect(labels).toContain("Supraveghere umană")
    expect(labels).toContain("Jurnalizare")
    expect(labels).toContain("Monitorizare post-market")
    expect(labels).toContain("Incidente AI")
    expect(labels).toContain("QMS")
  })

  it("cabinet on cabinet_solo tier sees magic links but NOT trust center / branding / approvals", () => {
    const labels = labelsForRole("cabinet", "cabinet_solo")
    expect(labels).toContain("Magic Links")
    expect(labels).not.toContain("Trust Center")
    expect(labels).not.toContain("Branding")
    expect(labels).not.toContain("Aprobări")
  })

  it("cabinet on cabinet_pro tier sees trust center + branding + approvals", () => {
    const labels = labelsForRole("cabinet", "cabinet_pro")
    expect(labels).toContain("Trust Center")
    expect(labels).toContain("Branding")
    expect(labels).toContain("Aprobări")
  })
})

describe("nav-config — section grouping", () => {
  it("ai-builder sections render in order: main, discovery, builder, compliance, exports, settings", () => {
    const sections = getNavForRole("ai-builder", "free_trial").map((g) => g.section)
    expect(sections).toEqual(["main", "discovery", "builder", "compliance", "exports", "settings"])
  })

  it("cabinet sections render in order: main, discovery, compliance, exports, collab, settings", () => {
    const sections = getNavForRole("cabinet", "free_trial").map((g) => g.section)
    expect(sections).toEqual(["main", "discovery", "compliance", "exports", "collab", "settings"])
  })

  it("imm-classic sections render in order: main, discovery, compliance, exports, settings", () => {
    const sections = getNavForRole("imm-classic", "free_trial").map((g) => g.section)
    expect(sections).toEqual(["main", "discovery", "compliance", "exports", "settings"])
  })
})

describe("nav-config — every nav item points to a valid icon name", () => {
  it("iconName is a non-empty string", () => {
    for (const item of ALL_NAV_ITEMS) {
      expect(item.iconName).toMatch(/^[A-Z][A-Za-z0-9]+$/)
    }
  })
})

// ────────────────────────────────────────────────────────────────────────────
//   Sprint 024 — AI Ads & Claims visibility
// ────────────────────────────────────────────────────────────────────────────

describe("nav-config — AI Ads & Claims (Sprint 024)", () => {
  it("imm-classic free_trial vede AI Ads & Claims", () => {
    const labels = labelsForRole("imm-classic", "free_trial")
    expect(labels).toContain("AI Ads & Claims")
  })

  it("ai-builder free_trial vede AI Ads & Claims", () => {
    const labels = labelsForRole("ai-builder", "free_trial")
    expect(labels).toContain("AI Ads & Claims")
  })

  it("cabinet free_trial vede AI Ads & Claims", () => {
    const labels = labelsForRole("cabinet", "free_trial")
    expect(labels).toContain("AI Ads & Claims")
  })

  it("imm-classic imm_solo NU vede AI Ads (tier nu unlock)", () => {
    const labels = labelsForRole("imm-classic", "imm_solo")
    expect(labels).not.toContain("AI Ads & Claims")
  })

  it("imm-classic imm_mid vede AI Ads", () => {
    const labels = labelsForRole("imm-classic", "imm_mid")
    expect(labels).toContain("AI Ads & Claims")
  })

  it("ai-builder pe ai_builder tier vede AI Ads", () => {
    const labels = labelsForRole("ai-builder", "ai_builder")
    expect(labels).toContain("AI Ads & Claims")
  })

  it("cabinet pe cabinet_solo vede AI Ads", () => {
    const labels = labelsForRole("cabinet", "cabinet_solo")
    expect(labels).toContain("AI Ads & Claims")
  })

  it("cabinet pe cabinet_pro + cabinet_enterprise vede AI Ads", () => {
    expect(labelsForRole("cabinet", "cabinet_pro")).toContain("AI Ads & Claims")
    expect(labelsForRole("cabinet", "cabinet_enterprise")).toContain(
      "AI Ads & Claims",
    )
  })
})
