import { describe, expect, it } from "vitest"

import {
  parseClassifyInput,
  parseDeploymentInput,
  summariseClassifyInput,
  V1_API_VERSION,
  VALID_PURPOSES,
} from "./api-v1-schema"

describe("api-v1-schema — parseClassifyInput", () => {
  it("rejects a non-object body", () => {
    const result = parseClassifyInput("hello")
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors[0].code).toBe("INVALID_BODY")
    }
  })

  it("rejects null body", () => {
    const result = parseClassifyInput(null)
    expect(result.ok).toBe(false)
  })

  it("rejects when systemName is missing", () => {
    const result = parseClassifyInput({ purpose: "hr-screening" })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors.some((e) => e.field === "systemName")).toBe(true)
    }
  })

  it("rejects when purpose is missing", () => {
    const result = parseClassifyInput({ systemName: "HR Bot" })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors.some((e) => e.field === "purpose")).toBe(true)
    }
  })

  it("rejects unknown purpose", () => {
    const result = parseClassifyInput({
      systemName: "Bot",
      purpose: "not-a-real-purpose",
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors.some((e) => e.code === "INVALID_ENUM")).toBe(true)
    }
  })

  it("accepts minimal valid input", () => {
    const result = parseClassifyInput({
      systemName: "HR Bot",
      purpose: "hr-screening",
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.systemName).toBe("HR Bot")
      expect(result.value.purpose).toBe("hr-screening")
    }
  })

  it("accepts full input + trims whitespace", () => {
    const result = parseClassifyInput({
      systemName: "  Credit Risk  ",
      purpose: "credit-scoring",
      sector: "fintech",
      userGroups: ["aplicanți", " corporate "],
      dataCategories: ["CNP", "venit"],
      processesPersonalData: true,
      processesSpecialCategories: false,
      autonomyLevel: "human_in_loop",
      humanOversightDocumented: true,
      loggingEnabled: true,
      vendorRegion: "EU",
      modelProvider: "OpenAI",
      deploymentContext: "production",
      dpaSigned: true,
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.systemName).toBe("Credit Risk")
      expect(result.value.sector).toBe("fintech")
      expect(result.value.userGroups).toEqual(["aplicanți", "corporate"])
    }
  })

  it("rejects wrong type for boolean field", () => {
    const result = parseClassifyInput({
      systemName: "Bot",
      purpose: "support-chatbot",
      processesPersonalData: "yes" as unknown as boolean,
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors.some((e) => e.field === "processesPersonalData")).toBe(true)
    }
  })

  it("rejects non-array userGroups", () => {
    const result = parseClassifyInput({
      systemName: "Bot",
      purpose: "support-chatbot",
      userGroups: "candidați" as unknown as string[],
    })
    expect(result.ok).toBe(false)
  })

  it("VALID_PURPOSES export matches every classifier purpose union member", () => {
    expect(VALID_PURPOSES).toContain("hr-screening")
    expect(VALID_PURPOSES).toContain("biometric-identification")
    expect(VALID_PURPOSES).toContain("image-manipulation-intimate")
    expect(VALID_PURPOSES).toContain("other")
  })

  it("rejects systemName longer than 256 chars", () => {
    const result = parseClassifyInput({
      systemName: "x".repeat(300),
      purpose: "support-chatbot",
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors.some((e) => e.code === "STRING_TOO_LONG")).toBe(true)
    }
  })
})

describe("api-v1-schema — parseDeploymentInput", () => {
  it("requires deploymentRef in addition to classify fields", () => {
    const result = parseDeploymentInput({
      systemName: "Bot",
      purpose: "support-chatbot",
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors.some((e) => e.field === "deploymentRef")).toBe(true)
    }
  })

  it("accepts valid deployment input", () => {
    const result = parseDeploymentInput({
      systemName: "Bot",
      purpose: "support-chatbot",
      deploymentRef: "sha-abc123",
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.deploymentRef).toBe("sha-abc123")
    }
  })
})

describe("api-v1-schema — summariseClassifyInput", () => {
  it("never includes systemName, userGroups, dataCategories or modelProvider", () => {
    const summary = summariseClassifyInput({
      systemName: "Salary Estimator",
      purpose: "hr-screening",
      sector: "hr",
      userGroups: ["candidați seniori"],
      dataCategories: ["CV", "scor interviu"],
      modelProvider: "OpenAI",
      processesPersonalData: true,
      dpaSigned: false,
    })
    expect(summary).not.toContain("Salary Estimator")
    expect(summary).not.toContain("candidați")
    expect(summary).not.toContain("CV")
    expect(summary).not.toContain("OpenAI")
    expect(summary).toContain("purpose=hr-screening")
    expect(summary).toContain("sector=hr")
    expect(summary).toContain("pd=1")
    expect(summary).toContain("dpa=0")
  })

  it("includes booleans only when present (omits undefined)", () => {
    const summary = summariseClassifyInput({
      systemName: "Bot",
      purpose: "support-chatbot",
    })
    expect(summary).toBe("purpose=support-chatbot")
  })
})

describe("api-v1-schema — version constant", () => {
  it("V1_API_VERSION is the stable string 'v1'", () => {
    expect(V1_API_VERSION).toBe("v1")
  })
})
