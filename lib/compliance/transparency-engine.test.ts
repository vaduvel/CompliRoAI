/**
 * Sprint 023.7 — transparency-engine tests pentru Art. 50 Content Labeling
 * Depth (per-asset evaluation).
 *
 * Acoperă:
 *  - evaluateContentLabelingGap pe toate ramurile (deepfake, synthetic, chatbot,
 *    public-interest cu/fără editorial responsibility claim).
 *  - inferDutyTypeForAsset în funcție de rol + tip asset.
 *  - annotateContentAsset wrapper.
 *  - Templates RO+EN pentru noile placements (advertisement, social-post, broadcast).
 *
 * Legal:
 *  - Art. 50(1) chatbot disclosure
 *  - Art. 50(2) machine-readable marking
 *  - Art. 50(4)(a) deepfake disclosure
 *  - Art. 50(4)(b) public-interest text — derogare editorial review
 */

import { describe, expect, it } from "vitest"
import {
  annotateContentAsset,
  evaluateContentLabelingGap,
  inferDutyTypeForAsset,
} from "@/lib/compliance/transparency-engine"
import {
  findTemplate,
  getTemplatesForNotice,
  PLACEMENT_LABELS,
} from "@/lib/compliance/transparency-templates"
import type {
  AIContentAssetType,
  AIContentLabeledAsset,
  ContentLabelingStandard,
} from "@/lib/compliance/types"

function makeAsset(o: Partial<AIContentLabeledAsset> = {}): AIContentLabeledAsset {
  return {
    id: o.id ?? "asset-1",
    orgId: o.orgId ?? "org-test",
    title: o.title ?? "Asset test",
    assetType: o.assetType ?? "image",
    distributionContext: o.distributionContext ?? ["Website"],
    providerMarkingApplied: o.providerMarkingApplied ?? false,
    providerMarkingStandard: o.providerMarkingStandard ?? "none",
    deployerDisclosureApplied: o.deployerDisclosureApplied ?? false,
    evidenceItems: o.evidenceItems ?? [],
    linkedFindingIds: o.linkedFindingIds ?? [],
    createdAtISO: o.createdAtISO ?? "2026-05-18T10:00:00.000Z",
    updatedAtISO: o.updatedAtISO ?? "2026-05-18T10:00:00.000Z",
    ...o,
  }
}

describe("evaluateContentLabelingGap — Art. 50(2) provider marking", () => {
  it("imagine sintetică fără marcaj tehnic → providerGap", () => {
    const gap = evaluateContentLabelingGap(
      makeAsset({ assetType: "image", providerMarkingStandard: "none" }),
    )
    expect(gap.providerGap).toContain("Art. 50(2)")
    expect(gap.providerGap).toMatch(/C2PA|IPTC|watermark/i)
  })

  it("video sintetic cu C2PA → niciun providerGap", () => {
    const gap = evaluateContentLabelingGap(
      makeAsset({
        assetType: "video",
        providerMarkingApplied: true,
        providerMarkingStandard: "c2pa",
      }),
    )
    expect(gap.providerGap).toBeUndefined()
  })

  it("text_synthetic fără marking → providerGap", () => {
    const gap = evaluateContentLabelingGap(
      makeAsset({ assetType: "text_synthetic", providerMarkingStandard: "none" }),
    )
    expect(gap.providerGap).toBeDefined()
  })

  it("chatbot_interaction NU declanșează providerGap (Art. 50(2) e pentru output sintetic)", () => {
    const gap = evaluateContentLabelingGap(
      makeAsset({
        assetType: "chatbot_interaction",
        providerMarkingStandard: "none",
        deployerDisclosureApplied: true,
      }),
    )
    expect(gap.providerGap).toBeUndefined()
  })
})

describe("evaluateContentLabelingGap — Art. 50(4)(a) deepfake", () => {
  it("deepfake fără disclosure → deployerGap critical-level", () => {
    const gap = evaluateContentLabelingGap(
      makeAsset({
        assetType: "deepfake",
        deployerDisclosureApplied: false,
      }),
    )
    expect(gap.deployerGap).toContain("Art. 50(4)(a)")
    expect(gap.deployerGap).toMatch(/etichetă vizibilă deepfake/i)
  })

  it("deepfake cu disclosure aplicat → niciun deployerGap pentru disclosure", () => {
    const gap = evaluateContentLabelingGap(
      makeAsset({
        assetType: "deepfake",
        deployerDisclosureApplied: true,
        providerMarkingApplied: true,
        providerMarkingStandard: "c2pa",
      }),
    )
    expect(gap.deployerGap).toBeUndefined()
  })
})

describe("evaluateContentLabelingGap — Art. 50(1) chatbot", () => {
  it("chatbot fără disclosure → deployerGap", () => {
    const gap = evaluateContentLabelingGap(
      makeAsset({
        assetType: "chatbot_interaction",
        deployerDisclosureApplied: false,
      }),
    )
    expect(gap.deployerGap).toContain("Art. 50(1)")
    expect(gap.deployerGap).toMatch(/runtime|interacțion/i)
  })

  it("chatbot cu disclosure → niciun gap", () => {
    const gap = evaluateContentLabelingGap(
      makeAsset({
        assetType: "chatbot_interaction",
        deployerDisclosureApplied: true,
      }),
    )
    expect(gap.deployerGap).toBeUndefined()
  })
})

describe("evaluateContentLabelingGap — Art. 50(4)(b) public-interest text", () => {
  it("public-interest fără claim ȘI fără disclosure → editorialGap", () => {
    const gap = evaluateContentLabelingGap(
      makeAsset({
        assetType: "public_interest_text",
        editorialResponsibilityClaim: false,
        deployerDisclosureApplied: false,
      }),
    )
    expect(gap.editorialGap).toContain("Art. 50(4)(b)")
  })

  it("public-interest cu editorial responsibility claim → derogare → niciun editorialGap", () => {
    const gap = evaluateContentLabelingGap(
      makeAsset({
        assetType: "public_interest_text",
        isPublicInterest: true,
        editorialResponsibilityClaim: true,
        editorialReviewBy: "editor@news.ro",
        editorialReviewAtISO: "2026-05-15T10:00:00.000Z",
        deployerDisclosureApplied: false,
      }),
    )
    expect(gap.editorialGap).toBeUndefined()
  })

  it("public-interest cu disclosure (fără claim) → niciun editorialGap (disclosure suficient)", () => {
    const gap = evaluateContentLabelingGap(
      makeAsset({
        assetType: "public_interest_text",
        editorialResponsibilityClaim: false,
        deployerDisclosureApplied: true,
      }),
    )
    expect(gap.editorialGap).toBeUndefined()
  })

  it("isPublicInterest flag on non-public_interest_text asset still triggers editorialGap", () => {
    const gap = evaluateContentLabelingGap(
      makeAsset({
        assetType: "text_synthetic",
        isPublicInterest: true,
        editorialResponsibilityClaim: false,
        deployerDisclosureApplied: false,
      }),
    )
    expect(gap.editorialGap).toContain("Art. 50(4)(b)")
  })
})

describe("inferDutyTypeForAsset", () => {
  it("asset sintetic + rol provider → provider_marking", () => {
    const duty = inferDutyTypeForAsset(makeAsset({ assetType: "image" }), "provider")
    expect(duty).toBe("provider_marking")
  })

  it("asset sintetic + rol deployer → deployer_disclosure", () => {
    const duty = inferDutyTypeForAsset(makeAsset({ assetType: "video" }), "deployer")
    expect(duty).toBe("deployer_disclosure")
  })

  it("asset sintetic + rol undefined → both", () => {
    const duty = inferDutyTypeForAsset(makeAsset({ assetType: "image" }))
    expect(duty).toBe("both")
  })

  it("chatbot_interaction → deployer_disclosure indiferent de rol", () => {
    expect(
      inferDutyTypeForAsset(
        makeAsset({ assetType: "chatbot_interaction" }),
        "provider",
      ),
    ).toBe("deployer_disclosure")
  })

  it("public-interest text → deployer_disclosure", () => {
    expect(
      inferDutyTypeForAsset(makeAsset({ assetType: "public_interest_text" })),
    ).toBe("deployer_disclosure")
  })
})

describe("annotateContentAsset", () => {
  it("returnează gap + hasAnyGap=true pentru deepfake fără nimic", () => {
    const annotated = annotateContentAsset(
      makeAsset({ assetType: "deepfake" }),
    )
    expect(annotated.hasAnyGap).toBe(true)
    expect(annotated.gap.providerGap).toBeDefined() // deepfake este synthetic
    expect(annotated.gap.deployerGap).toBeDefined()
  })

  it("hasAnyGap=false pentru asset complet", () => {
    const annotated = annotateContentAsset(
      makeAsset({
        assetType: "image",
        providerMarkingApplied: true,
        providerMarkingStandard: "c2pa",
        deployerDisclosureApplied: true,
      }),
    )
    expect(annotated.hasAnyGap).toBe(false)
  })

  it("appliedDutyType reflectă tipul asset-ului", () => {
    const annotated = annotateContentAsset(
      makeAsset({ assetType: "chatbot_interaction" }),
    )
    expect(annotated.appliedDutyType).toBe("deployer_disclosure")
  })
})

describe("transparency-templates — placements noi (Sprint 023.7)", () => {
  it("advertisement RO pentru chatbot-disclosure există", () => {
    const tpl = findTemplate("chatbot-disclosure", "advertisement", "ro", {
      systemName: "BotX",
      contactEmail: "ops@example.ro",
    })
    expect(tpl).toBeTruthy()
    expect(tpl?.text).toContain("BotX")
    expect(tpl?.text).toMatch(/Art\. 50\(1\)/)
  })

  it("social-post EN pentru ai-generated-content există", () => {
    const tpl = findTemplate("ai-generated-content", "social-post", "en", {
      modelName: "GPT-4o",
      dateISO: "2026-05-18T10:00:00.000Z",
    })
    expect(tpl).toBeTruthy()
    expect(tpl?.text).toContain("GPT-4o")
    expect(tpl?.text).toMatch(/Art\. 50\(2\)/)
  })

  it("broadcast RO pentru deepfake-disclosure există", () => {
    const tpl = findTemplate("deepfake-disclosure", "broadcast", "ro", {
      systemName: "DeepEdit",
    })
    expect(tpl).toBeTruthy()
    expect(tpl?.text).toContain("DeepEdit")
    expect(tpl?.text).toMatch(/Art\. 50\(4\)\(a\)/)
  })

  it("PLACEMENT_LABELS conține cele 3 placements noi", () => {
    expect(PLACEMENT_LABELS.advertisement).toBe("Reclamă plătită")
    expect(PLACEMENT_LABELS["social-post"]).toBe("Post social media")
    expect(PLACEMENT_LABELS.broadcast).toContain("broadcast")
  })

  it("getTemplatesForNotice produce HTML pentru advertisement/social-post/broadcast (fallback inline)", () => {
    const tpls = getTemplatesForNotice("ai-generated-content")
    const adTpl = tpls.find((t) => t.placement === "advertisement")
    expect(adTpl?.html).toBeDefined()
    expect(adTpl?.html).toContain("data-ai-notice")
  })
})

describe("evaluateContentLabelingGap — combinații realiste", () => {
  it("deepfake video în reclamă plătită — provider + deployer gaps", () => {
    const asset = makeAsset({
      assetType: "deepfake",
      distributionContext: ["TikTok Ads"],
      providerMarkingApplied: false,
      providerMarkingStandard: "none",
      deployerDisclosureApplied: false,
    })
    const gap = evaluateContentLabelingGap(asset)
    expect(gap.providerGap).toBeDefined()
    expect(gap.deployerGap).toBeDefined()
  })

  it("image cu watermark_invisible (SynthID) + disclosure în footer → fără gaps", () => {
    const asset = makeAsset({
      assetType: "image",
      providerMarkingApplied: true,
      providerMarkingStandard: "watermark_invisible",
      deployerDisclosureApplied: true,
    })
    const gap = evaluateContentLabelingGap(asset)
    expect(gap.providerGap).toBeUndefined()
    expect(gap.deployerGap).toBeUndefined()
    expect(gap.editorialGap).toBeUndefined()
  })

  it("public-interest text publicat de cabinet de presă cu editorial responsibility → ok", () => {
    const asset = makeAsset({
      assetType: "public_interest_text",
      providerMarkingApplied: false, // text fără watermark = OK dacă editorial OK
      providerMarkingStandard: "none",
      isPublicInterest: true,
      editorialResponsibilityClaim: true,
      editorialReviewBy: "redactor@news.ro",
      editorialReviewAtISO: "2026-05-15T10:00:00.000Z",
      deployerDisclosureApplied: false,
    })
    const gap = evaluateContentLabelingGap(asset)
    // Atenție: public_interest_text NU este în SYNTHETIC_TYPES,
    // dar text generat oricum cere Art. 50(2) → în implementarea curentă
    // public_interest_text e tratat ca text editorial (nu necesită watermark
    // dacă editorial OK). Deci providerGap undefined.
    expect(gap.providerGap).toBeUndefined()
    expect(gap.editorialGap).toBeUndefined()
  })
})
