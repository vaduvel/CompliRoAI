import { describe, expect, it } from "vitest"
import {
  VENDOR_LIBRARY,
  buildVendorDraftFromLibrary,
  findVendorInLibrary,
  listVendorCategories,
  listVendorLibrary,
  searchVendorLibrary,
} from "@/lib/compliance/vendor-library"

describe("vendor-library catalog", () => {
  it("contine cel putin 15 vendori AI majori (mandate § 11)", () => {
    expect(VENDOR_LIBRARY.length).toBeGreaterThanOrEqual(15)
  })

  it("acopera vendorii cerut de mandate (OpenAI, Anthropic, Mistral, etc.)", () => {
    const required = [
      "openai",
      "anthropic",
      "azure-openai",
      "microsoft-365-copilot",
      "google-vertex-ai",
      "mistral",
      "meta-llama",
      "cohere",
      "aws-bedrock",
      "ibm-watsonx",
      "huggingface",
      "elevenlabs",
      "synthesia",
      "pinecone",
      "weaviate",
      "replicate",
      "stability-ai",
    ]
    const ids = VENDOR_LIBRARY.map((v) => v.id)
    for (const id of required) {
      expect(ids).toContain(id)
    }
  })

  it("fiecare entry are id, canonicalName si productCatalog non-vide", () => {
    for (const entry of VENDOR_LIBRARY) {
      expect(entry.id).toMatch(/^[a-z0-9-]+$/)
      expect(entry.canonicalName.length).toBeGreaterThan(0)
      expect(entry.productCatalog.length).toBeGreaterThan(0)
    }
  })

  it("fiecare entry are minim un alias", () => {
    for (const entry of VENDOR_LIBRARY) {
      expect(entry.aliases.length).toBeGreaterThan(0)
    }
  })

  it("ID-urile sunt unice", () => {
    const ids = VENDOR_LIBRARY.map((v) => v.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe("findVendorInLibrary", () => {
  it("gaseste prin id exact", () => {
    const found = findVendorInLibrary("openai")
    expect(found).toBeTruthy()
    expect(found?.canonicalName).toBe("OpenAI")
  })

  it("gaseste prin alias (case-insensitive)", () => {
    const found = findVendorInLibrary("ChatGPT")
    expect(found).toBeTruthy()
    expect(found?.id).toBe("openai")
  })

  it("gaseste prin canonicalName", () => {
    const found = findVendorInLibrary("Anthropic (Claude)")
    expect(found?.id).toBe("anthropic")
  })

  it("returneaza null pentru query necunoscut", () => {
    expect(findVendorInLibrary("vendor-care-nu-exista-xyz")).toBeNull()
  })

  it("returneaza null pentru query gol", () => {
    expect(findVendorInLibrary("")).toBeNull()
    expect(findVendorInLibrary("   ")).toBeNull()
  })
})

describe("searchVendorLibrary", () => {
  it("returneaza prefix match-uri partiale", () => {
    const results = searchVendorLibrary("claude")
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].id).toBe("anthropic")
  })

  it("respecta limit-ul", () => {
    const results = searchVendorLibrary("", 5)
    expect(results.length).toBe(5)
  })

  it("returneaza tot catalogul pentru query gol fara limit", () => {
    const results = searchVendorLibrary("", 100)
    expect(results.length).toBe(VENDOR_LIBRARY.length)
  })
})

describe("listVendorLibrary + listVendorCategories", () => {
  it("returneaza copie a catalogului", () => {
    const list = listVendorLibrary()
    expect(list.length).toBe(VENDOR_LIBRARY.length)
    // mutatia copiei nu altereaza originalul
    list.pop()
    expect(VENDOR_LIBRARY.length).toBeGreaterThanOrEqual(15)
  })

  it("returneaza categorii unice sortate", () => {
    const cats = listVendorCategories()
    expect(cats.length).toBeGreaterThan(0)
    expect(cats).toContain("AI/LLM")
    // sortate alfabetic
    const sorted = cats.slice().sort()
    expect(cats).toEqual(sorted)
  })
})

describe("buildVendorDraftFromLibrary", () => {
  it("produce draft cu campuri esentiale completate", () => {
    const entry = findVendorInLibrary("openai")!
    const draft = buildVendorDraftFromLibrary(entry)

    expect(draft.name).toBe("OpenAI")
    expect(draft.legalEntity).toBe("OpenAI Ireland Limited")
    expect(draft.vendorRegion).toBe("US")
    expect(draft.role).toBe("processor")
    expect(draft.dpaUrl).toMatch(/openai\.com/)
    expect(draft.transferRequired).toBe(true) // US != EU
    expect(draft.reviewStatus).toBe("draft")
    expect(draft.linkedAISystemIds).toEqual([])
    expect(draft.linkedFindingIds).toEqual([])
  })

  it("EU vendor produce transferRequired=false", () => {
    const entry = findVendorInLibrary("mistral")!
    const draft = buildVendorDraftFromLibrary(entry)

    expect(draft.vendorRegion).toBe("EU")
    expect(draft.transferRequired).toBe(false)
  })

  it("default AI terms completeaza 'unknown' cand entry-ul nu specifica", () => {
    const entry = findVendorInLibrary("meta-llama")!
    const draft = buildVendorDraftFromLibrary(entry)

    // meta-llama are trainingDataOptOut: "unknown" in defaultAITerms
    expect(draft.aiTerms.trainingDataOptOut).toBe("unknown")
    expect(draft.aiTerms.inputDataRetention).toBe("unknown")
  })

  it("baseline risk high → humanReviewRequired=true", () => {
    const entry = findVendorInLibrary("openai")!
    const draft = buildVendorDraftFromLibrary(entry)
    expect(draft.riskLevel).toBe("high")
    expect(draft.humanReviewRequired).toBe(true)
  })

  it("baseline risk low → humanReviewRequired=false", () => {
    const entry = findVendorInLibrary("mistral")!
    const draft = buildVendorDraftFromLibrary(entry)
    expect(draft.riskLevel).toBe("low")
    expect(draft.humanReviewRequired).toBe(false)
  })

  it("subprocessorsList si subprocessorsUrl sunt preluate cand exista", () => {
    const entry = findVendorInLibrary("anthropic")!
    const draft = buildVendorDraftFromLibrary(entry)
    expect(draft.subprocessorsList.length).toBeGreaterThan(0)
    expect(draft.subprocessorsList).toContain("Amazon Web Services")
  })
})
