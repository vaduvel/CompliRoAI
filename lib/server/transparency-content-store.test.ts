/**
 * Sprint 023.7 — transparency-content-store tests.
 *
 * Acoperă:
 *  - createContentAsset emite findings pentru gaps.
 *  - createContentAsset cu deepfake fără disclosure → finding CRITICAL.
 *  - createContentAsset cu image sintetic fără provider mark → finding HIGH.
 *  - createContentAsset cu public-interest text fără editorial claim → finding HIGH.
 *  - updateContentAsset re-evaluează: rezolvă finding când gap se închide.
 *  - deleteContentAsset închide findings linkate.
 *  - attachContentEvidence persistă evidence + emite event.
 *  - summarizeContentAssets numără corect.
 *  - buildContentAssetMarkdown produce markdown valid pentru audit pack.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/server/org-context", () => ({
  getOrgContext: vi.fn(async () => ({
    orgId: "org-content-test",
    userId: "user-content-test",
    email: "content@example.com",
    orgName: "Test Content Org",
    workspaceMode: "ai-builder",
  })),
}))

vi.mock("@/lib/server/fs-safe", () => ({
  writeFileSafe: vi.fn(async () => {}),
}))

vi.mock("node:fs", async () => {
  const actual = await vi.importActual<typeof import("node:fs")>("node:fs")
  return {
    ...actual,
    promises: {
      ...actual.promises,
      readFile: vi.fn(async () => {
        throw new Error("ENOENT")
      }),
    },
  }
})

import type { ComplianceEventActorInput } from "@/lib/compliance/events"
import { mutateFreshStateForOrg, readState } from "@/lib/server/store"
import {
  attachContentEvidence,
  buildContentAssetMarkdown,
  buildContentRegisterMarkdown,
  createContentAsset,
  deleteContentAsset,
  getContentAssetById,
  listContentAssets,
  readContentAssets,
  summarizeContentAssets,
  updateContentAsset,
  type CreateContentAssetInput,
} from "@/lib/server/transparency-content-store"

const ACTOR: ComplianceEventActorInput = {
  id: "user-content-test",
  label: "content@example.com",
  role: "compliance",
  source: "session",
}
const ORG = "org-content-test"

function baseInput(
  overrides: Partial<CreateContentAssetInput> = {},
): CreateContentAssetInput {
  return {
    title: "Banner reclamă produs X",
    assetType: "image",
    distributionContext: ["LinkedIn Ads"],
    providerMarkingApplied: false,
    providerMarkingStandard: "none",
    deployerDisclosureApplied: false,
    ...overrides,
  }
}

beforeEach(async () => {
  await mutateFreshStateForOrg(ORG, (s) => ({
    ...s,
    aiContentAssets: [],
    findings: [],
    events: [],
  }))
})

afterEach(() => {
  vi.clearAllMocks()
})

describe("transparency-content-store — createContentAsset", () => {
  it("salvează asset și emite event content_asset.created", async () => {
    const created = await createContentAsset(ORG, baseInput(), ACTOR)
    expect(created.id).toMatch(/^cnt-/)
    expect(created.title).toBe("Banner reclamă produs X")

    const state = await readState()
    const evt = state.events?.find(
      (e) => e.entityId === created.id && e.type === "content_asset.created",
    )
    expect(evt).toBeTruthy()
    expect(evt?.selfHash).toMatch(/^[0-9a-f]{64}$/)
  })

  it("deepfake fără disclosure → emite finding CRITICAL Art. 50(4)(a)", async () => {
    const created = await createContentAsset(
      ORG,
      baseInput({
        title: "Reclamă deepfake celebrity",
        assetType: "deepfake",
      }),
      ACTOR,
    )
    expect(created.linkedFindingIds.length).toBeGreaterThan(0)
    const state = await readState()
    const findings = state.findings ?? []
    const critical = findings.find(
      (f) =>
        created.linkedFindingIds.includes(f.id) &&
        f.severity === "critical" &&
        f.legalReference?.includes("Art. 50(4)(a)"),
    )
    expect(critical).toBeTruthy()
    expect(critical?.title).toMatch(/Deepfake fără disclosure/i)
  })

  it("imagine sintetică fără provider mark → emite finding HIGH Art. 50(2)", async () => {
    const created = await createContentAsset(
      ORG,
      baseInput({
        title: "Hero image Midjourney",
        assetType: "image",
        providerMarkingApplied: false,
        providerMarkingStandard: "none",
        deployerDisclosureApplied: true, // doar provider gap
      }),
      ACTOR,
    )
    const state = await readState()
    const high = state.findings?.find(
      (f) =>
        created.linkedFindingIds.includes(f.id) &&
        f.severity === "high" &&
        f.legalReference?.includes("Art. 50(2)"),
    )
    expect(high).toBeTruthy()
    expect(high?.title).toMatch(/Conținut sintetic fără marcaj/i)
  })

  it("chatbot fără runtime disclosure → emite finding Art. 50(1)", async () => {
    const created = await createContentAsset(
      ORG,
      baseInput({
        title: "Chatbot suport WebSite",
        assetType: "chatbot_interaction",
        deployerDisclosureApplied: false,
      }),
      ACTOR,
    )
    const state = await readState()
    const finding = state.findings?.find(
      (f) =>
        created.linkedFindingIds.includes(f.id) &&
        f.legalReference?.includes("Art. 50(1)"),
    )
    expect(finding).toBeTruthy()
    expect(finding?.title).toMatch(/Chatbot fără disclosure/i)
  })

  it("public-interest text fără editorial claim → emite finding Art. 50(4)(b)", async () => {
    const created = await createContentAsset(
      ORG,
      baseInput({
        title: "Articol opinie politică AI-generated",
        assetType: "public_interest_text",
        isPublicInterest: true,
        editorialResponsibilityClaim: false,
        deployerDisclosureApplied: false,
      }),
      ACTOR,
    )
    const state = await readState()
    const finding = state.findings?.find(
      (f) =>
        created.linkedFindingIds.includes(f.id) &&
        f.legalReference?.includes("Art. 50(4)(b)"),
    )
    expect(finding).toBeTruthy()
    expect(finding?.severity).toBe("high")
  })

  it("asset complet (deepfake + disclosure + C2PA) → niciun finding emis", async () => {
    const created = await createContentAsset(
      ORG,
      baseInput({
        title: "Demo deepfake cu C2PA + disclosure",
        assetType: "deepfake",
        providerMarkingApplied: true,
        providerMarkingStandard: "c2pa",
        deployerDisclosureApplied: true,
        deployerDisclosurePlacement: "video-overlay",
      }),
      ACTOR,
    )
    expect(created.linkedFindingIds).toEqual([])
  })
})

describe("transparency-content-store — updateContentAsset", () => {
  it("update care rezolvă gap → finding linkat marcat ca resolved", async () => {
    const created = await createContentAsset(
      ORG,
      baseInput({
        title: "Image fără watermark",
        assetType: "image",
        deployerDisclosureApplied: true,
      }),
      ACTOR,
    )
    expect(created.linkedFindingIds.length).toBeGreaterThan(0)
    const findingId = created.linkedFindingIds[0]

    await updateContentAsset(
      ORG,
      created.id,
      {
        providerMarkingApplied: true,
        providerMarkingStandard: "c2pa",
        providerMarkingProof: "https://verify.c2pa.org/asset/xyz",
      },
      ACTOR,
    )

    const state = await readState()
    const finding = state.findings?.find((f) => f.id === findingId)
    expect(finding?.findingStatus).toBe("resolved")
  })

  it("update care introduce un gap nou → emite finding nou", async () => {
    const created = await createContentAsset(
      ORG,
      baseInput({
        title: "Asset complet",
        assetType: "image",
        providerMarkingApplied: true,
        providerMarkingStandard: "c2pa",
        deployerDisclosureApplied: true,
      }),
      ACTOR,
    )
    expect(created.linkedFindingIds).toEqual([])

    const updated = await updateContentAsset(
      ORG,
      created.id,
      {
        // Schimbăm tipul în deepfake fără disclosure — gap nou
        assetType: "deepfake",
        deployerDisclosureApplied: false,
      },
      ACTOR,
    )
    expect(updated?.linkedFindingIds.length).toBeGreaterThan(0)
  })
})

describe("transparency-content-store — deleteContentAsset", () => {
  it("șterge asset și marchează findings linkate ca resolved", async () => {
    const created = await createContentAsset(
      ORG,
      baseInput({ assetType: "deepfake" }),
      ACTOR,
    )
    const findingIds = created.linkedFindingIds
    expect(findingIds.length).toBeGreaterThan(0)

    const removed = await deleteContentAsset(ORG, created.id, ACTOR)
    expect(removed).toBe(true)
    expect(await getContentAssetById(ORG, created.id)).toBeNull()

    const state = await readState()
    for (const fid of findingIds) {
      const f = state.findings?.find((x) => x.id === fid)
      expect(f?.findingStatus).toBe("resolved")
      expect(f?.operationalEvidenceNote).toMatch(/asset Art\. 50/)
    }
  })
})

describe("transparency-content-store — attachContentEvidence", () => {
  it("atașează evidence + emite event content_asset.evidence_attached", async () => {
    const created = await createContentAsset(
      ORG,
      baseInput({
        title: "Demo",
        assetType: "image",
        providerMarkingApplied: true,
        providerMarkingStandard: "c2pa",
        deployerDisclosureApplied: true,
      }),
      ACTOR,
    )
    const updated = await attachContentEvidence(
      ORG,
      created.id,
      {
        type: "watermark_test",
        description: "Test C2PA verifier — pass on 2026-05-18",
        url: "https://verify.c2pa.org/result/abc",
        fileHash: "a".repeat(64),
      },
      ACTOR,
    )
    expect(updated?.evidenceItems.length).toBe(1)
    expect(updated?.evidenceItems[0].type).toBe("watermark_test")

    const state = await readState()
    const evt = state.events?.find(
      (e) =>
        e.entityId === created.id && e.type === "content_asset.evidence_attached",
    )
    expect(evt).toBeTruthy()
  })

  it("evidence cu descriere prea scurtă → throws", async () => {
    const created = await createContentAsset(ORG, baseInput(), ACTOR)
    await expect(
      attachContentEvidence(
        ORG,
        created.id,
        { type: "screenshot", description: "ab" },
        ACTOR,
      ),
    ).rejects.toThrow(/description/i)
  })
})

describe("transparency-content-store — read + summary", () => {
  it("summarizeContentAssets numără corect provider+deployer+gaps", async () => {
    await createContentAsset(
      ORG,
      baseInput({
        title: "A",
        assetType: "image",
        providerMarkingApplied: true,
        providerMarkingStandard: "c2pa",
        deployerDisclosureApplied: true,
      }),
      ACTOR,
    )
    await createContentAsset(
      ORG,
      baseInput({
        title: "B (gap)",
        assetType: "deepfake",
      }),
      ACTOR,
    )
    const { summary } = await readContentAssets(ORG)
    expect(summary.total).toBe(2)
    expect(summary.withProviderMarking).toBe(1)
    expect(summary.withDeployerDisclosure).toBe(1)
    expect(summary.unresolvedGaps).toBe(1)
    expect(summary.byType.image).toBe(1)
    expect(summary.byType.deepfake).toBe(1)
  })

  it("listContentAssets returnează asset-uri adnotate cu gap", async () => {
    await createContentAsset(
      ORG,
      baseInput({
        title: "X (deepfake fără disclosure)",
        assetType: "deepfake",
      }),
      ACTOR,
    )
    const { assets } = await listContentAssets(ORG)
    expect(assets.length).toBe(1)
    expect(assets[0].hasAnyGap).toBe(true)
    expect(assets[0].gap.deployerGap).toBeDefined()
    expect(assets[0].appliedDutyType).toBe("both")
  })
})

describe("transparency-content-store — markdown builders", () => {
  it("buildContentAssetMarkdown produce header + secțiunile A/B/D/E", async () => {
    const created = await createContentAsset(
      ORG,
      baseInput({
        title: "Markdown test",
        assetType: "image",
        providerMarkingApplied: true,
        providerMarkingStandard: "iptc_photo_metadata",
        deployerDisclosureApplied: true,
        deployerDisclosurePlacement: "footer",
      }),
      ACTOR,
    )
    const md = buildContentAssetMarkdown(created)
    expect(md).toContain("# Asset Art. 50 — Markdown test")
    expect(md).toContain("## A. Provider duty (Art. 50(2))")
    expect(md).toContain("## B. Deployer duty (Art. 50(1)/(3)/(4))")
    expect(md).toContain("## D. Dovezi atașate")
    expect(md).toContain("## E. Findings linkate")
    expect(md).toContain("IPTC PhotoMetadata")
  })

  it("buildContentAssetMarkdown afișează ⚠️ pentru gap-uri", async () => {
    const created = await createContentAsset(
      ORG,
      baseInput({
        title: "Gappy",
        assetType: "deepfake",
      }),
      ACTOR,
    )
    const md = buildContentAssetMarkdown(created)
    expect(md).toContain("⚠️")
    expect(md).toContain("Art. 50(4)(a)")
  })

  it("buildContentRegisterMarkdown produce table cu toate asset-urile", async () => {
    await createContentAsset(
      ORG,
      baseInput({ title: "A1", assetType: "image" }),
      ACTOR,
    )
    await createContentAsset(
      ORG,
      baseInput({ title: "A2", assetType: "video" }),
      ACTOR,
    )
    const { assets } = await readContentAssets(ORG)
    const md = buildContentRegisterMarkdown(assets, "ACME SRL")
    expect(md).toContain("# Content Register Art. 50 — ACME SRL")
    expect(md).toContain("A1")
    expect(md).toContain("A2")
    expect(md).toContain("Total assets:")
  })

  it("summarizeContentAssets helper standalone funcționează", () => {
    const summary = summarizeContentAssets([])
    expect(summary.total).toBe(0)
    expect(summary.unresolvedGaps).toBe(0)
  })
})
