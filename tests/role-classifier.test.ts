import { describe, it, expect } from "vitest"
import { classifyAIActRole } from "@/lib/compliance/role-classifier"
import type { RoleAssessmentAnswers } from "@/lib/compliance/types"

const NO_ANSWERS: RoleAssessmentAnswers = {
  developsAI: "no",
  sellsToThirdParties: "no",
  usesAIInternally: "no",
  importsFromNonEU: "no",
  distributesThirdPartyAI: "no",
  embedsAIInPhysicalProducts: "no",
  personalNonCommercialUseOnly: "no",
  militaryOrResearchOnly: "no",
}

describe("classifyAIActRole", () => {
  it("returns exempt for pure personal use (Art. 2(10))", () => {
    const r = classifyAIActRole({
      ...NO_ANSWERS,
      personalNonCommercialUseOnly: "yes",
    })
    expect(r.primaryRole).toBe("exempt")
    expect(r.scopeExceptions[0]).toContain("Art. 2(10)")
  })

  it("returns exempt for military/research use (Art. 2(3), 2(6))", () => {
    const r = classifyAIActRole({
      ...NO_ANSWERS,
      militaryOrResearchOnly: "yes",
    })
    expect(r.primaryRole).toBe("exempt")
    expect(r.scopeExceptions.some((e) => e.includes("Art. 2(3)"))).toBe(true)
  })

  it("classifies a pure SaaS company as provider", () => {
    const r = classifyAIActRole({
      ...NO_ANSWERS,
      developsAI: "yes",
      sellsToThirdParties: "yes",
    })
    expect(r.primaryRole).toBe("provider")
    expect(r.applicableArticles.join(" ")).toContain("Art. 16-22")
  })

  it("classifies an internal-only user as deployer", () => {
    const r = classifyAIActRole({
      ...NO_ANSWERS,
      usesAIInternally: "yes",
    })
    expect(r.primaryRole).toBe("deployer")
    expect(r.applicableArticles.join(" ")).toContain("Art. 26")
  })

  it("classifies an importer correctly", () => {
    const r = classifyAIActRole({
      ...NO_ANSWERS,
      importsFromNonEU: "yes",
    })
    expect(r.primaryRole).toBe("importer")
  })

  it("classifies a distributor correctly (without import)", () => {
    const r = classifyAIActRole({
      ...NO_ANSWERS,
      distributesThirdPartyAI: "yes",
    })
    expect(r.primaryRole).toBe("distributor")
  })

  it("does NOT double-count: importer who also distributes", () => {
    // If you import from non-EU you are importer, not distributor (avoid duplication).
    const r = classifyAIActRole({
      ...NO_ANSWERS,
      importsFromNonEU: "yes",
      distributesThirdPartyAI: "yes",
    })
    expect(r.primaryRole).toBe("importer")
    expect(r.secondaryRoles).not.toContain("distributor")
  })

  it("returns mixed when both provider and deployer apply (uses own AI)", () => {
    const r = classifyAIActRole({
      ...NO_ANSWERS,
      developsAI: "yes",
      sellsToThirdParties: "yes",
      usesAIInternally: "yes",
    })
    expect(r.primaryRole).toBe("mixed")
    expect(r.secondaryRoles).toContain("provider")
    expect(r.secondaryRoles).toContain("deployer")
  })

  it("includes manufacturer when AI is embedded in physical products", () => {
    const r = classifyAIActRole({
      ...NO_ANSWERS,
      developsAI: "yes",
      embedsAIInPhysicalProducts: "yes",
    })
    expect(["mixed", "manufacturer"]).toContain(r.primaryRole)
    expect(
      r.primaryRole === "manufacturer" ||
        r.secondaryRoles.includes("manufacturer")
    ).toBe(true)
  })

  it("returns exempt with manual review hint when nothing is selected", () => {
    const r = classifyAIActRole(NO_ANSWERS)
    expect(r.primaryRole).toBe("exempt")
    expect(r.scopeExceptions[0]).toContain("manuală")
  })
})
