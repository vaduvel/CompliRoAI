import { describe, expect, it } from "vitest"
import {
  prefillVendorFromLibrary,
  suggestVendorsFromQuery,
} from "@/lib/compliance/vendor-prefill"
import type { AIDataMapRecord, AISystemRecord } from "@/lib/compliance/types"

const mockAISystems: AISystemRecord[] = [
  {
    id: "sys-001",
    name: "ChatGPT pentru support",
    purpose: "support-chatbot",
    vendor: "OpenAI",
    modelType: "GPT-4o",
    usesPersonalData: true,
    makesAutomatedDecisions: false,
    impactsRights: false,
    hasHumanReview: true,
    riskLevel: "limited",
    recommendedActions: [],
    createdAtISO: "2026-05-01T00:00:00.000Z",
  },
  {
    id: "sys-002",
    name: "Claude pentru contracts",
    purpose: "document-assistant",
    vendor: "Anthropic Claude",
    modelType: "claude-3-5-sonnet",
    usesPersonalData: true,
    makesAutomatedDecisions: false,
    impactsRights: false,
    hasHumanReview: true,
    riskLevel: "limited",
    recommendedActions: [],
    createdAtISO: "2026-05-01T00:00:00.000Z",
  },
]

const mockAIDataMap: AIDataMapRecord[] = [
  {
    id: "ai-map-001",
    orgId: "org-test",
    toolName: "ChatGPT Enterprise",
    vendor: "OpenAI",
    deploymentMode: "saas",
    useCaseCategory: "customer_support",
    useCaseDescription: "Support clienti",
    inputDataCategories: ["chat messages"],
    outputDataCategories: ["responses"],
    processesPersonalData: true,
    processesSpecialCategories: false,
    childrenData: false,
    vendorRegion: "US",
    trainingDataUsage: "opt_out_available",
    dpaSigned: false,
    subprocessorsDocumented: false,
    riskCandidate: "transparency_limited",
    reasons: [],
    linkedFindingIds: [],
    status: "active",
    createdAtISO: "2026-05-01T00:00:00.000Z",
    updatedAtISO: "2026-05-01T00:00:00.000Z",
  },
]

describe("prefillVendorFromLibrary", () => {
  it("match exact prin id → draft completat", () => {
    const result = prefillVendorFromLibrary({ query: "openai" })
    expect(result.libraryEntry).not.toBeNull()
    expect(result.libraryEntry!.id).toBe("openai")
    expect(result.draft).not.toBeNull()
    expect(result.draft!.name).toBe("OpenAI")
  })

  it("match prin alias (case-insensitive)", () => {
    const result = prefillVendorFromLibrary({ query: "ChatGPT" })
    expect(result.libraryEntry?.id).toBe("openai")
  })

  it("query gol → libraryEntry null + draft null + suggestii alternative", () => {
    const result = prefillVendorFromLibrary({ query: "" })
    expect(result.libraryEntry).toBeNull()
    expect(result.draft).toBeNull()
    expect(result.alternativeMatches.length).toBeGreaterThan(0)
  })

  it("query necunoscut → match null + nota de explicare", () => {
    const result = prefillVendorFromLibrary({ query: "vendor-xyz-necunoscut" })
    expect(result.libraryEntry).toBeNull()
    expect(result.draft).toBeNull()
    expect(result.notes.some((n) => n.includes("Niciun match exact"))).toBe(true)
  })

  it("linkage automat catre AI inventory cand vendor exista deja", () => {
    const result = prefillVendorFromLibrary({
      query: "openai",
      aiSystems: mockAISystems,
    })
    expect(result.linkedAISystems.value).toContain("sys-001")
    expect(result.draft?.linkedAISystemIds).toContain("sys-001")
    expect(result.notes.some((n) => n.includes("AI system"))).toBe(true)
  })

  it("linkage automat catre AI data map", () => {
    const result = prefillVendorFromLibrary({
      query: "openai",
      aiDataMapRecords: mockAIDataMap,
    })
    expect(result.linkedAIDataMaps.value).toContain("ai-map-001")
    expect(result.draft?.linkedAIDataMapIds).toContain("ai-map-001")
  })

  it("anthropic match → linked sys-002 (alias Claude)", () => {
    const result = prefillVendorFromLibrary({
      query: "anthropic",
      aiSystems: mockAISystems,
    })
    expect(result.linkedAISystems.value).toContain("sys-002")
  })

  it("nicio linkage cand vendorul library nu match-uieste cu inventory", () => {
    const result = prefillVendorFromLibrary({
      query: "mistral",
      aiSystems: mockAISystems,
    })
    expect(result.linkedAISystems.value).toEqual([])
  })

  it("alternativeMatches exclude match-ul exact", () => {
    const result = prefillVendorFromLibrary({ query: "openai" })
    expect(result.alternativeMatches.find((e) => e.id === "openai")).toBeUndefined()
  })

  it("draft pentru EU vendor are transferRequired=false", () => {
    const result = prefillVendorFromLibrary({ query: "mistral" })
    expect(result.draft?.vendorRegion).toBe("EU")
    expect(result.draft?.transferRequired).toBe(false)
  })

  it("draft pentru US vendor are transferRequired=true", () => {
    const result = prefillVendorFromLibrary({ query: "openai" })
    expect(result.draft?.vendorRegion).toBe("US")
    expect(result.draft?.transferRequired).toBe(true)
  })
})

describe("suggestVendorsFromQuery", () => {
  it("returneaza label+region+category", () => {
    const suggestions = suggestVendorsFromQuery("claude")
    expect(suggestions.length).toBeGreaterThan(0)
    const first = suggestions[0]
    expect(first.id).toBe("anthropic")
    expect(first.label).toBe("Anthropic (Claude)")
    expect(first.region).toBe("US")
    expect(first.category).toBe("AI/LLM")
    expect(first.note.length).toBeGreaterThan(0)
  })

  it("respecta limit-ul", () => {
    const suggestions = suggestVendorsFromQuery("", 3)
    expect(suggestions.length).toBe(3)
  })
})
