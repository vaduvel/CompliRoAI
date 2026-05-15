import { describe, it, expect } from "vitest"
import { classifyAISystem } from "@/lib/compliance/ai-act-classifier"

describe("classifyAISystem", () => {
  it("classifies hr-screening as high_risk", () => {
    const result = classifyAISystem("hr-screening")
    expect(result.riskLevel).toBe("high_risk")
  })

  it("classifies biometric-identification as prohibited", () => {
    const result = classifyAISystem("biometric-identification")
    expect(result.riskLevel).toBe("prohibited")
  })

  it("classifies support-chatbot as limited_risk", () => {
    const result = classifyAISystem("support-chatbot")
    expect(result.riskLevel).toBe("limited_risk")
  })

  it("classifies document-assistant as minimal_risk", () => {
    const result = classifyAISystem("document-assistant")
    expect(result.riskLevel).toBe("minimal_risk")
  })
})
