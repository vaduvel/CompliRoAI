import { describe, expect, it } from "vitest"

import {
  featureBelongsToWorkspace,
  findUpgradeTierForFeature,
  hasFeature,
  listUnlockedFeatures,
} from "./feature-gates"

describe("feature-gates — workspaceMode visibility", () => {
  it("imm-classic does NOT see ai-builder modules (annex IV, FRIA, EU DB)", () => {
    expect(featureBelongsToWorkspace("imm-classic", "annex_iv_generator")).toBe(false)
    expect(featureBelongsToWorkspace("imm-classic", "fria_generator")).toBe(false)
    expect(featureBelongsToWorkspace("imm-classic", "eu_database_wizard")).toBe(false)
    expect(featureBelongsToWorkspace("imm-classic", "qms")).toBe(false)
  })

  it("imm-classic does NOT see cabinet collaboration features", () => {
    expect(featureBelongsToWorkspace("imm-classic", "multi_client_portfolio")).toBe(false)
    expect(featureBelongsToWorkspace("imm-classic", "approval_queue")).toBe(false)
    expect(featureBelongsToWorkspace("imm-classic", "trust_center")).toBe(false)
    expect(featureBelongsToWorkspace("imm-classic", "white_label")).toBe(false)
  })

  it("ai-builder DOES see annex IV, FRIA, oversight, logging, PMM, incidents, QMS, API/SDK", () => {
    expect(featureBelongsToWorkspace("ai-builder", "annex_iv_generator")).toBe(true)
    expect(featureBelongsToWorkspace("ai-builder", "fria_generator")).toBe(true)
    expect(featureBelongsToWorkspace("ai-builder", "human_oversight_protocols")).toBe(true)
    expect(featureBelongsToWorkspace("ai-builder", "logging_evidence")).toBe(true)
    expect(featureBelongsToWorkspace("ai-builder", "post_market_monitoring")).toBe(true)
    expect(featureBelongsToWorkspace("ai-builder", "ai_incident_reporting")).toBe(true)
    expect(featureBelongsToWorkspace("ai-builder", "qms")).toBe(true)
    expect(featureBelongsToWorkspace("ai-builder", "api_sdk")).toBe(true)
  })

  it("ai-builder does NOT see cabinet collaboration modules", () => {
    expect(featureBelongsToWorkspace("ai-builder", "multi_client_portfolio")).toBe(false)
    expect(featureBelongsToWorkspace("ai-builder", "approval_queue")).toBe(false)
    expect(featureBelongsToWorkspace("ai-builder", "trust_center")).toBe(false)
    expect(featureBelongsToWorkspace("ai-builder", "white_label")).toBe(false)
  })

  it("cabinet DOES see portfolio, magic links, approval queue, trust center, white-label", () => {
    expect(featureBelongsToWorkspace("cabinet", "multi_client_portfolio")).toBe(true)
    expect(featureBelongsToWorkspace("cabinet", "magic_links")).toBe(true)
    expect(featureBelongsToWorkspace("cabinet", "approval_queue")).toBe(true)
    expect(featureBelongsToWorkspace("cabinet", "trust_center")).toBe(true)
    expect(featureBelongsToWorkspace("cabinet", "white_label")).toBe(true)
    expect(featureBelongsToWorkspace("cabinet", "client_intake")).toBe(true)
  })

  it("cabinet does NOT see ai-builder-only depth modules (Annex IV / EU DB), DOES see FRIA + Oversight + Logging + PMM (Sprint 016/017/018/019 — cabinets prepare pentru clienți deployer)", () => {
    expect(featureBelongsToWorkspace("cabinet", "annex_iv_generator")).toBe(false)
    expect(featureBelongsToWorkspace("cabinet", "eu_database_wizard")).toBe(false)
    // FRIA + Oversight + Logging + PMM shared cu cabinet per mandate § 16-20
    expect(featureBelongsToWorkspace("cabinet", "fria_generator")).toBe(true)
    expect(featureBelongsToWorkspace("cabinet", "human_oversight_protocols")).toBe(true)
    expect(featureBelongsToWorkspace("cabinet", "logging_evidence")).toBe(true)
    expect(featureBelongsToWorkspace("cabinet", "post_market_monitoring")).toBe(true)
  })
})

describe("feature-gates — tier unlocking", () => {
  it("free_trial unlocks everything for imm-classic, ai-builder, cabinet", () => {
    expect(hasFeature("imm-classic", "free_trial", "audit_pack")).toBe(true)
    expect(hasFeature("ai-builder", "free_trial", "annex_iv_generator")).toBe(true)
    expect(hasFeature("cabinet", "free_trial", "white_label")).toBe(true)
    expect(hasFeature("cabinet", "free_trial", "trust_center")).toBe(true)
  })

  it("imm_solo does NOT unlock audit_pack (mandate § 15)", () => {
    // imm_solo is the entry-level IMM tier — readiness pack only.
    expect(hasFeature("imm-classic", "imm_solo", "audit_pack")).toBe(false)
    expect(hasFeature("imm-classic", "imm_solo", "readiness_pack")).toBe(true)
  })

  it("imm_mid unlocks audit_pack + audit_pack_signed", () => {
    expect(hasFeature("imm-classic", "imm_mid", "audit_pack")).toBe(true)
    expect(hasFeature("imm-classic", "imm_mid", "audit_pack_signed")).toBe(true)
  })

  it("ai_builder tier unlocks annex IV / FRIA / EU DB / API SDK", () => {
    expect(hasFeature("ai-builder", "ai_builder", "annex_iv_generator")).toBe(true)
    expect(hasFeature("ai-builder", "ai_builder", "fria_generator")).toBe(true)
    expect(hasFeature("ai-builder", "ai_builder", "eu_database_wizard")).toBe(true)
    expect(hasFeature("ai-builder", "ai_builder", "api_sdk")).toBe(true)
  })

  it("cabinet_solo unlocks magic_links + multi_client but NOT trust_center / white_label", () => {
    expect(hasFeature("cabinet", "cabinet_solo", "magic_links")).toBe(true)
    expect(hasFeature("cabinet", "cabinet_solo", "multi_client_portfolio")).toBe(true)
    expect(hasFeature("cabinet", "cabinet_solo", "trust_center")).toBe(false)
    expect(hasFeature("cabinet", "cabinet_solo", "white_label")).toBe(false)
  })

  it("cabinet_pro unlocks trust_center + white_label + approval_queue", () => {
    expect(hasFeature("cabinet", "cabinet_pro", "trust_center")).toBe(true)
    expect(hasFeature("cabinet", "cabinet_pro", "white_label")).toBe(true)
    expect(hasFeature("cabinet", "cabinet_pro", "approval_queue")).toBe(true)
  })

  it("cabinet_enterprise unlocks SSO + DPA + SLA", () => {
    expect(hasFeature("cabinet", "cabinet_enterprise", "sso")).toBe(true)
    expect(hasFeature("cabinet", "cabinet_enterprise", "dpa")).toBe(true)
    expect(hasFeature("cabinet", "cabinet_enterprise", "sla")).toBe(true)
  })
})

describe("feature-gates — intersectional safety", () => {
  it("ai_builder tier on cabinet workspace does NOT unlock annex IV (workspace mismatch)", () => {
    // Even if a cabinet user somehow had an ai_builder tier, annex IV is not
    // part of the cabinet workflow.
    expect(hasFeature("cabinet", "ai_builder", "annex_iv_generator")).toBe(false)
  })

  it("cabinet_pro tier on imm-classic workspace does NOT unlock trust_center", () => {
    expect(hasFeature("imm-classic", "cabinet_pro", "trust_center")).toBe(false)
  })
})

describe("feature-gates — upgrade hints", () => {
  it("findUpgradeTierForFeature for audit_pack on imm-classic = imm_mid (skipping imm_solo)", () => {
    expect(findUpgradeTierForFeature("imm-classic", "audit_pack")).toBe("imm_mid")
  })

  it("findUpgradeTierForFeature for trust_center on cabinet = cabinet_pro (skipping cabinet_solo)", () => {
    expect(findUpgradeTierForFeature("cabinet", "trust_center")).toBe("cabinet_pro")
  })

  it("findUpgradeTierForFeature for annex IV on ai-builder = ai_builder", () => {
    expect(findUpgradeTierForFeature("ai-builder", "annex_iv_generator")).toBe("ai_builder")
  })

  it("findUpgradeTierForFeature returns null when workspace doesn't support feature at all", () => {
    expect(findUpgradeTierForFeature("imm-classic", "annex_iv_generator")).toBeNull()
    expect(findUpgradeTierForFeature("ai-builder", "trust_center")).toBeNull()
  })
})

describe("feature-gates — listUnlockedFeatures", () => {
  it("imm_solo on imm-classic yields a small set without audit_pack", () => {
    const features = listUnlockedFeatures("imm-classic", "imm_solo")
    expect(features).toContain("ai_inventory")
    expect(features).toContain("readiness_pack")
    expect(features).not.toContain("audit_pack")
    expect(features).not.toContain("annex_iv_generator")
  })

  it("free_trial on ai-builder includes all builder modules", () => {
    const features = listUnlockedFeatures("ai-builder", "free_trial")
    expect(features).toContain("annex_iv_generator")
    expect(features).toContain("fria_generator")
    expect(features).toContain("qms")
    expect(features).toContain("api_sdk")
  })

  it("cabinet_pro on cabinet includes trust_center but not SSO", () => {
    const features = listUnlockedFeatures("cabinet", "cabinet_pro")
    expect(features).toContain("trust_center")
    expect(features).toContain("white_label")
    expect(features).not.toContain("sso")
  })
})
