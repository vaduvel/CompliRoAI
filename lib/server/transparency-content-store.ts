/**
 * Sprint 023.7 — Transparency Content Asset store.
 *
 * Per-asset register pentru Art. 50 Content Labeling Depth. Distinct de
 * `state.transparencyImplementations` (per-system) — assets sunt piese
 * concrete de conținut AI (image / video / audio / text / deepfake /
 * public-interest text / chatbot interaction) tracked individually pentru
 * dovada provider duty (Art. 50(2)) + deployer duty (Art. 50(1)/(3)/(4)).
 *
 * Pattern: identic cu oversight-store / logging-evidence-store —
 * `mutateFreshStateForOrg` + `appendComplianceEvents` + emit findings via
 * `createFinding` din findings-store.
 *
 * Surface API:
 *  - readContentAssets(orgId)        → { assets, summary }
 *  - listContentAssets(orgId)        → assets annotated cu gap
 *  - getContentAssetById(orgId, id)
 *  - createContentAsset(orgId, input, actor)
 *  - updateContentAsset(orgId, id, patch, actor)
 *  - deleteContentAsset(orgId, id, actor)
 *  - attachContentEvidence(orgId, id, evidenceItem, actor)
 *  - buildContentAssetMarkdown(asset)  — pentru audit pack
 *
 * Stable finding IDs: `art50-content-{assetId}-{rule}` ca să facem dedup la
 * re-evaluare (update poate re-emite finding-uri pe gap-uri noi).
 *
 * Legal references:
 *  - Art. 50(1) chatbot disclosure
 *  - Art. 50(2) machine-readable marking (C2PA / IPTC / watermark)
 *  - Art. 50(4)(a) deepfake disclosure
 *  - Art. 50(4)(b) public-interest text — derogare editorial responsibility
 */

import {
  appendComplianceEvents,
  createComplianceEvent,
  type ComplianceEventActorInput,
} from "@/lib/compliance/events"
import {
  annotateContentAsset,
  evaluateContentLabelingGap,
  inferDutyTypeForAsset,
  type AnnotatedContentAsset,
} from "@/lib/compliance/transparency-engine"
import { createFinding } from "@/lib/server/findings-store"
import { mutateFreshStateForOrg, readState } from "@/lib/server/store"
import type { ComplianceSeverity } from "@/lib/compliance/constitution"
import type {
  AIContentAssetType,
  AIContentEvidenceItem,
  AIContentEvidenceType,
  AIContentLabeledAsset,
  ContentLabelingStandard,
  TransparencyLanguage,
  TransparencyPlacement,
} from "@/lib/compliance/types"

// ────────────────────────────────────────────────────────────────────────────
//   Types — input + summary
// ────────────────────────────────────────────────────────────────────────────

export type ContentAssetsSummary = {
  total: number
  withProviderMarking: number
  withDeployerDisclosure: number
  publicInterestReviewed: number
  unresolvedGaps: number
  byType: Partial<Record<AIContentAssetType, number>>
}

export type CreateContentAssetInput = {
  title: string
  assetType: AIContentAssetType
  linkedAISystemId?: string
  publishedAtISO?: string
  distributionContext?: string[]
  audienceSize?: number
  providerMarkingApplied?: boolean
  providerMarkingStandard?: ContentLabelingStandard
  providerMarkingProof?: string
  deployerDisclosureApplied?: boolean
  deployerDisclosurePlacement?: TransparencyPlacement
  deployerDisclosureText?: string
  deployerDisclosureLanguage?: TransparencyLanguage
  isPublicInterest?: boolean
  editorialReviewBy?: string
  editorialReviewAtISO?: string
  editorialResponsibilityClaim?: boolean
  notes?: string
}

export type UpdateContentAssetPatch = Partial<
  Omit<
    AIContentLabeledAsset,
    | "id"
    | "orgId"
    | "createdAtISO"
    | "evidenceItems"
    | "linkedFindingIds"
    | "updatedAtISO"
  >
>

export type AttachContentEvidenceInput = {
  type: AIContentEvidenceType
  description: string
  url?: string
  fileName?: string
  fileHash?: string
}

const VALID_ASSET_TYPES: AIContentAssetType[] = [
  "image",
  "video",
  "audio",
  "text_synthetic",
  "deepfake",
  "public_interest_text",
  "chatbot_interaction",
  "other",
]

const VALID_STANDARDS: ContentLabelingStandard[] = [
  "c2pa",
  "iptc_photo_metadata",
  "watermark_visible",
  "watermark_invisible",
  "metadata_only",
  "none",
]

const VALID_EVIDENCE_TYPES: AIContentEvidenceType[] = [
  "screenshot",
  "sample_file",
  "metadata_proof",
  "editorial_log",
  "watermark_test",
  "other",
]

export function isAssetType(value: unknown): value is AIContentAssetType {
  return typeof value === "string" && VALID_ASSET_TYPES.includes(value as AIContentAssetType)
}

export function isContentLabelingStandard(
  value: unknown,
): value is ContentLabelingStandard {
  return typeof value === "string" && VALID_STANDARDS.includes(value as ContentLabelingStandard)
}

export function isContentEvidenceType(
  value: unknown,
): value is AIContentEvidenceType {
  return typeof value === "string" && VALID_EVIDENCE_TYPES.includes(value as AIContentEvidenceType)
}

// ────────────────────────────────────────────────────────────────────────────
//   Helpers
// ────────────────────────────────────────────────────────────────────────────

function nowISO(): string {
  return new Date().toISOString()
}

function uid(): string {
  return `cnt-${Math.random().toString(36).slice(2, 10)}`
}

function evidenceId(): string {
  return `cnt-ev-${Math.random().toString(36).slice(2, 10)}`
}

export function summarizeContentAssets(
  assets: AIContentLabeledAsset[],
): ContentAssetsSummary {
  let withProviderMarking = 0
  let withDeployerDisclosure = 0
  let publicInterestReviewed = 0
  let unresolvedGaps = 0
  const byType: Partial<Record<AIContentAssetType, number>> = {}
  for (const a of assets) {
    if (a.providerMarkingApplied && a.providerMarkingStandard !== "none") {
      withProviderMarking++
    }
    if (a.deployerDisclosureApplied) withDeployerDisclosure++
    if (a.editorialResponsibilityClaim && a.editorialReviewBy) {
      publicInterestReviewed++
    }
    const gap = evaluateContentLabelingGap(a)
    if (gap.providerGap || gap.deployerGap || gap.editorialGap) {
      unresolvedGaps++
    }
    byType[a.assetType] = (byType[a.assetType] ?? 0) + 1
  }
  return {
    total: assets.length,
    withProviderMarking,
    withDeployerDisclosure,
    publicInterestReviewed,
    unresolvedGaps,
    byType,
  }
}

// ────────────────────────────────────────────────────────────────────────────
//   Read
// ────────────────────────────────────────────────────────────────────────────

export async function readContentAssets(_orgId?: string): Promise<{
  assets: AIContentLabeledAsset[]
  summary: ContentAssetsSummary
}> {
  const state = await readState()
  const assets = state.aiContentAssets ?? []
  return { assets, summary: summarizeContentAssets(assets) }
}

export async function listContentAssets(
  _orgId?: string,
): Promise<{
  assets: AnnotatedContentAsset[]
  summary: ContentAssetsSummary
}> {
  const state = await readState()
  const assets = state.aiContentAssets ?? []
  return {
    assets: assets.map((a) => annotateContentAsset(a)),
    summary: summarizeContentAssets(assets),
  }
}

export async function getContentAssetById(
  _orgId: string,
  id: string,
): Promise<AIContentLabeledAsset | null> {
  const state = await readState()
  return state.aiContentAssets?.find((a) => a.id === id) ?? null
}

// ────────────────────────────────────────────────────────────────────────────
//   Findings emission — pure helper for gap → finding mapping
//
//   Stable IDs ca să putem face dedup la re-evaluare. Severity per Art. 50:
//     - deepfake fără disclosure: CRITICAL (Art. 50(4)(a))
//     - synthetic content fără marking: HIGH (Art. 50(2))
//     - chatbot fără runtime disclosure: HIGH (Art. 50(1))
//     - public-interest fără editorial flag: HIGH (Art. 50(4)(b))
// ────────────────────────────────────────────────────────────────────────────

type GapFindingDescriptor = {
  ruleKey: string
  title: string
  detail: string
  severity: ComplianceSeverity
  legalReference: string
  remediationHint: string
  impactSummary: string
}

function gapFindingsForAsset(
  asset: AIContentLabeledAsset,
): GapFindingDescriptor[] {
  const out: GapFindingDescriptor[] = []
  const gap = evaluateContentLabelingGap(asset)
  const label = `"${asset.title}" (${asset.assetType})`

  if (asset.assetType === "deepfake" && gap.deployerGap) {
    out.push({
      ruleKey: "deepfake-no-disclosure",
      title: `Deepfake fără disclosure vizibil — ${asset.title}`,
      detail: `Asset-ul ${label} este clasificat ca deepfake dar nu are deployer disclosure aplicat. Art. 50(4)(a) EU AI Act cere etichetare vizibilă: persoanele expuse trebuie să fie informate că materialul este generat sau manipulat artificial.`,
      severity: "critical",
      legalReference: "Art. 50(4)(a) EU AI Act + Recital 134",
      impactSummary:
        "Risc juridic CRITIC: deepfake fără disclosure poate genera amendă până la 15M EUR sau 3% cifră de afaceri globală (Art. 99). Risc reputational + posibilă răspundere civilă pentru victime.",
      remediationHint:
        "Adaugă etichetă vizibilă (header / overlay video / footer / advertisement label) cu textul „Conținut manipulat cu AI — Art. 50(4) EU AI Act”. Folosește template-urile din /dashboard/transparency.",
    })
  } else if (asset.assetType === "chatbot_interaction" && gap.deployerGap) {
    out.push({
      ruleKey: "chatbot-no-disclosure",
      title: `Chatbot fără disclosure runtime — ${asset.title}`,
      detail: `Sesiunea de chatbot ${label} nu are disclosure runtime aplicat. Art. 50(1) EU AI Act cere ca utilizatorul să fie informat, la prima interacțiune, că discută cu un sistem AI.`,
      severity: "high",
      legalReference: "Art. 50(1) EU AI Act",
      impactSummary:
        "Risc juridic HIGH: chatbot fără disclosure runtime → amendă Art. 99 + plângere ANSPDCP via dreptul la informare GDPR Art. 13.",
      remediationHint:
        "Adaugă mesaj welcome runtime („Vorbești cu un asistent AI”) sau popup la prima interacțiune. Vezi template-urile chatbot-disclosure (popup / header / advertisement / social-post / broadcast) în /dashboard/transparency.",
    })
  }

  if (gap.providerGap) {
    out.push({
      ruleKey: "missing-provider-marking",
      title: `Conținut sintetic fără marcaj tehnic — ${asset.title}`,
      detail: `Asset-ul ${label} este conținut generat AI (sintetic) dar nu are aplicat un marcaj tehnic machine-readable (C2PA, IPTC PhotoMetadata, watermark vizibil/invizibil). Art. 50(2) EU AI Act cere providerilor să marcheze output-ul într-un format detectabil ca artificial.`,
      severity: "high",
      legalReference: "Art. 50(2) EU AI Act + Recital 133",
      impactSummary:
        "Risc juridic HIGH: provider duty neîndeplinit → amendă Art. 99. La 2 decembrie 2026 cerința devine executorie (post-Omnibus).",
      remediationHint:
        "Aplică marcaj tehnic conform unui standard recunoscut: C2PA (Adobe / Microsoft / OpenAI), IPTC PhotoMetadata (foto), SynthID (Google), sau watermark vizibil. Atașează dovada (metadata_proof / watermark_test) în secțiunea Evidence.",
    })
  }

  if (gap.editorialGap) {
    out.push({
      ruleKey: "public-interest-no-editorial",
      title: `Text public-interest fără editorial responsibility claim — ${asset.title}`,
      detail: `Asset-ul ${label} este text pe subiecte de interes public dar nu are claim de editorial responsibility (Art. 50(4)(b) derogare) și nici disclosure AI vizibil. Art. 50(4)(b) cere ori disclosure, ori claim explicit că un editor uman a revizuit și își asumă responsabilitatea editorială.`,
      severity: "high",
      legalReference: "Art. 50(4)(b) EU AI Act + Recital 134",
      impactSummary:
        "Risc juridic HIGH: text politic/social/medical/financiar AI-generated fără disclosure ȘI fără editorial responsibility claim → încalcă Art. 50(4)(b). Risc adițional: dezinformare, plângere ANSPDCP.",
      remediationHint:
        "Două opțiuni: (a) aplică disclosure vizibil „Text generat parțial cu AI” în articol/email; SAU (b) marchează editorialResponsibilityClaim=true ȘI atașează editorial log (cine a revizuit, când). Recomandat: ambele.",
    })
  }

  return out
}

function findingIdForGap(assetId: string, ruleKey: string): string {
  return `art50-content-${assetId}-${ruleKey}`
}

async function emitFindingsForAsset(
  orgId: string,
  asset: AIContentLabeledAsset,
  actor: ComplianceEventActorInput,
): Promise<string[]> {
  const descriptors = gapFindingsForAsset(asset)
  const findingIds: string[] = []
  for (const d of descriptors) {
    const stableId = findingIdForGap(asset.id, d.ruleKey)
    // Check if a finding with this stable ID already exists; if so reuse it.
    const state = await readState()
    const existing = state.findings?.find(
      (f) =>
        f.title === d.title ||
        f.detail.includes(`asset-${asset.id}`) ||
        // Stable id check — we encode it in evidenceRequired so we can dedup.
        f.evidenceRequired?.includes(stableId),
    )
    if (existing) {
      findingIds.push(existing.id)
      continue
    }
    const created = await createFinding(
      orgId,
      {
        title: d.title,
        detail: `${d.detail}\n\n[stable-id: ${stableId}] [asset-${asset.id}]`,
        category: "EU_AI_ACT",
        severity: d.severity,
        legalReference: d.legalReference,
        remediationHint: d.remediationHint,
        impactSummary: d.impactSummary,
        evidenceRequired: `Dovadă remediere: screenshot disclosure, metadata C2PA/IPTC, sau editorial log. [${stableId}]`,
        ownerSuggestion: "DPO / responsabil compliance AI / editor șef",
        closeCondition: "Asset re-marcat ca implementat și gap eliminat la re-evaluare.",
      },
      actor,
    )
    findingIds.push(created.id)
  }
  return findingIds
}

// ────────────────────────────────────────────────────────────────────────────
//   Create
// ────────────────────────────────────────────────────────────────────────────

export async function createContentAsset(
  orgId: string,
  input: CreateContentAssetInput,
  actor: ComplianceEventActorInput,
): Promise<AIContentLabeledAsset> {
  const title = input.title?.trim()
  if (!title) throw new Error("Content asset title required")
  if (!isAssetType(input.assetType)) {
    throw new Error("Invalid assetType")
  }
  const standard: ContentLabelingStandard =
    input.providerMarkingStandard && isContentLabelingStandard(input.providerMarkingStandard)
      ? input.providerMarkingStandard
      : "none"

  const now = nowISO()
  const id = uid()
  const draft: AIContentLabeledAsset = {
    id,
    orgId,
    title,
    assetType: input.assetType,
    linkedAISystemId: input.linkedAISystemId?.trim() || undefined,
    publishedAtISO: input.publishedAtISO,
    distributionContext: Array.isArray(input.distributionContext)
      ? input.distributionContext.filter((s) => typeof s === "string" && s.trim().length > 0)
      : [],
    audienceSize:
      typeof input.audienceSize === "number" && Number.isFinite(input.audienceSize)
        ? input.audienceSize
        : undefined,
    providerMarkingApplied: Boolean(input.providerMarkingApplied),
    providerMarkingStandard: standard,
    providerMarkingProof: input.providerMarkingProof?.trim() || undefined,
    deployerDisclosureApplied: Boolean(input.deployerDisclosureApplied),
    deployerDisclosurePlacement: input.deployerDisclosurePlacement,
    deployerDisclosureText: input.deployerDisclosureText?.trim() || undefined,
    deployerDisclosureLanguage: input.deployerDisclosureLanguage,
    isPublicInterest: input.isPublicInterest,
    editorialReviewBy: input.editorialReviewBy?.trim() || undefined,
    editorialReviewAtISO: input.editorialReviewAtISO,
    editorialResponsibilityClaim: input.editorialResponsibilityClaim,
    evidenceItems: [],
    linkedFindingIds: [],
    notes: input.notes?.trim() || undefined,
    createdAtISO: now,
    updatedAtISO: now,
  }

  const findingIds = await emitFindingsForAsset(orgId, draft, actor)
  const enriched: AIContentLabeledAsset = { ...draft, linkedFindingIds: findingIds }

  await mutateFreshStateForOrg(orgId, (s) => {
    return {
      ...s,
      aiContentAssets: [enriched, ...(s.aiContentAssets ?? [])].slice(0, 500),
      events: appendComplianceEvents(s, [
        createComplianceEvent(
          {
            type: "content_asset.created",
            entityType: "system",
            entityId: enriched.id,
            message: `Asset Art. 50 creat: ${enriched.title} · ${enriched.assetType} · gaps: ${findingIds.length}`,
            createdAtISO: now,
            metadata: {
              assetType: enriched.assetType,
              providerMarkingStandard: enriched.providerMarkingStandard,
              deployerDisclosureApplied: enriched.deployerDisclosureApplied,
              dutyType: inferDutyTypeForAsset(enriched),
              candidateFindingsEmitted: findingIds.length,
            },
          },
          actor,
        ),
      ]),
    }
  })

  return enriched
}

// ────────────────────────────────────────────────────────────────────────────
//   Update — re-evaluează gap-uri, emite/închide findings
// ────────────────────────────────────────────────────────────────────────────

export async function updateContentAsset(
  orgId: string,
  id: string,
  patch: UpdateContentAssetPatch,
  actor: ComplianceEventActorInput,
): Promise<AIContentLabeledAsset | null> {
  const existing = await getContentAssetById(orgId, id)
  if (!existing) return null

  const now = nowISO()
  const merged: AIContentLabeledAsset = {
    ...existing,
    ...patch,
    id: existing.id,
    orgId: existing.orgId,
    createdAtISO: existing.createdAtISO,
    evidenceItems: existing.evidenceItems,
    linkedFindingIds: existing.linkedFindingIds,
    updatedAtISO: now,
  }
  if (
    patch.providerMarkingStandard &&
    !isContentLabelingStandard(patch.providerMarkingStandard)
  ) {
    merged.providerMarkingStandard = existing.providerMarkingStandard
  }

  // Re-evaluate gap, emit new findings if any, close fixed findings.
  const previousGap = evaluateContentLabelingGap(existing)
  const newGap = evaluateContentLabelingGap(merged)

  // Pentru fiecare gap care s-a închis (era în previous, nu mai e în new),
  // marcăm finding-ul ca resolved.
  const resolvedFindingIds: string[] = []
  await mutateFreshStateForOrg(orgId, (s) => {
    const findings = s.findings ?? []
    const stableIds = new Set<string>()
    if (previousGap.providerGap && !newGap.providerGap) {
      stableIds.add(findingIdForGap(existing.id, "missing-provider-marking"))
    }
    if (previousGap.deployerGap && !newGap.deployerGap) {
      if (existing.assetType === "deepfake") {
        stableIds.add(findingIdForGap(existing.id, "deepfake-no-disclosure"))
      } else if (existing.assetType === "chatbot_interaction") {
        stableIds.add(findingIdForGap(existing.id, "chatbot-no-disclosure"))
      }
    }
    if (previousGap.editorialGap && !newGap.editorialGap) {
      stableIds.add(findingIdForGap(existing.id, "public-interest-no-editorial"))
    }
    const updatedFindings = findings.map((f) => {
      if (
        stableIds.size > 0 &&
        f.evidenceRequired &&
        [...stableIds].some((sid) => f.evidenceRequired?.includes(sid))
      ) {
        resolvedFindingIds.push(f.id)
        return {
          ...f,
          findingStatus: "resolved" as const,
          findingStatusUpdatedAtISO: now,
        }
      }
      return f
    })
    return { ...s, findings: updatedFindings }
  })

  // Emit findings for any NEW gap.
  const newFindingIds = await emitFindingsForAsset(orgId, merged, actor)
  // De-duplicate: păstrează existing linkedFindingIds + adaugă newFindingIds.
  const mergedLinkedIds = Array.from(
    new Set([...existing.linkedFindingIds, ...newFindingIds]),
  )
  merged.linkedFindingIds = mergedLinkedIds

  await mutateFreshStateForOrg(orgId, (s) => {
    const assets = s.aiContentAssets ?? []
    const idx = assets.findIndex((a) => a.id === id)
    if (idx === -1) return s
    const next = [...assets]
    next[idx] = merged
    return {
      ...s,
      aiContentAssets: next,
      events: appendComplianceEvents(s, [
        createComplianceEvent(
          {
            type: "content_asset.updated",
            entityType: "system",
            entityId: merged.id,
            message: `Asset Art. 50 actualizat: ${merged.title} · resolved: ${resolvedFindingIds.length} · new findings: ${newFindingIds.length - existing.linkedFindingIds.length}`,
            createdAtISO: now,
            metadata: {
              assetType: merged.assetType,
              providerMarkingStandard: merged.providerMarkingStandard,
              deployerDisclosureApplied: merged.deployerDisclosureApplied,
              resolvedFindingIds: resolvedFindingIds.length,
            },
          },
          actor,
        ),
      ]),
    }
  })

  return merged
}

// ────────────────────────────────────────────────────────────────────────────
//   Delete — închide findings linkate + emite event
// ────────────────────────────────────────────────────────────────────────────

export async function deleteContentAsset(
  orgId: string,
  id: string,
  actor: ComplianceEventActorInput,
): Promise<boolean> {
  let removed = false
  await mutateFreshStateForOrg(orgId, (s) => {
    const assets = s.aiContentAssets ?? []
    const target = assets.find((a) => a.id === id)
    if (!target) return s
    removed = true
    const now = nowISO()
    const linkedIds = new Set(target.linkedFindingIds)
    const findings = s.findings ?? []
    const updatedFindings = findings.map((f) => {
      if (linkedIds.has(f.id)) {
        return {
          ...f,
          findingStatus: "resolved" as const,
          findingStatusUpdatedAtISO: now,
          operationalEvidenceNote: `Closed automatic: asset Art. 50 șters (${target.title}).`,
        }
      }
      return f
    })
    return {
      ...s,
      aiContentAssets: assets.filter((a) => a.id !== id),
      findings: updatedFindings,
      events: appendComplianceEvents(s, [
        createComplianceEvent(
          {
            type: "content_asset.deleted",
            entityType: "system",
            entityId: id,
            message: `Asset Art. 50 șters: ${target.title} · findings închise: ${target.linkedFindingIds.length}`,
            createdAtISO: now,
            metadata: {
              assetType: target.assetType,
              linkedFindingIdsClosed: target.linkedFindingIds.length,
            },
          },
          actor,
        ),
      ]),
    }
  })
  return removed
}

// ────────────────────────────────────────────────────────────────────────────
//   Attach evidence
// ────────────────────────────────────────────────────────────────────────────

export async function attachContentEvidence(
  orgId: string,
  id: string,
  input: AttachContentEvidenceInput,
  actor: ComplianceEventActorInput,
): Promise<AIContentLabeledAsset | null> {
  if (!isContentEvidenceType(input.type)) {
    throw new Error("Invalid evidence type")
  }
  if (!input.description || input.description.trim().length < 3) {
    throw new Error("Evidence description required (min 3 chars)")
  }
  const existing = await getContentAssetById(orgId, id)
  if (!existing) return null
  const now = nowISO()
  const newItem: AIContentEvidenceItem = {
    id: evidenceId(),
    type: input.type,
    description: input.description.trim(),
    uploadedAtISO: now,
    uploadedByEmail: actor.label,
    url: input.url?.trim() || undefined,
    fileName: input.fileName?.trim() || undefined,
    fileHash: input.fileHash?.trim() || undefined,
  }
  const next: AIContentLabeledAsset = {
    ...existing,
    evidenceItems: [...existing.evidenceItems, newItem],
    updatedAtISO: now,
  }
  await mutateFreshStateForOrg(orgId, (s) => {
    const assets = s.aiContentAssets ?? []
    const idx = assets.findIndex((a) => a.id === id)
    if (idx === -1) return s
    const arr = [...assets]
    arr[idx] = next
    return {
      ...s,
      aiContentAssets: arr,
      events: appendComplianceEvents(s, [
        createComplianceEvent(
          {
            type: "content_asset.evidence_attached",
            entityType: "system",
            entityId: next.id,
            message: `Dovadă atașată asset Art. 50 "${next.title}": ${newItem.type} — ${newItem.description}`,
            createdAtISO: now,
            metadata: {
              evidenceId: newItem.id,
              evidenceType: newItem.type,
              hasUrl: Boolean(newItem.url),
              hasFile: Boolean(newItem.fileName),
              hasHash: Boolean(newItem.fileHash),
            },
          },
          actor,
        ),
      ]),
    }
  })
  return next
}

// ────────────────────────────────────────────────────────────────────────────
//   Markdown export pentru Audit Pack
// ────────────────────────────────────────────────────────────────────────────

const ASSET_TYPE_LABELS: Record<AIContentAssetType, string> = {
  image: "Imagine sintetică",
  video: "Video sintetic",
  audio: "Audio sintetic",
  text_synthetic: "Text sintetic",
  deepfake: "Deepfake (Art. 50(4)(a))",
  public_interest_text: "Text public-interest (Art. 50(4)(b))",
  chatbot_interaction: "Sesiune chatbot (Art. 50(1))",
  other: "Altul",
}

const STANDARD_LABELS: Record<ContentLabelingStandard, string> = {
  c2pa: "C2PA (Coalition for Content Provenance and Authenticity)",
  iptc_photo_metadata: "IPTC PhotoMetadata",
  watermark_visible: "Watermark vizibil",
  watermark_invisible: "Watermark invizibil (SynthID etc.)",
  metadata_only: "Metadata generică (non-standard)",
  none: "— niciunul —",
}

export function buildContentAssetMarkdown(asset: AIContentLabeledAsset): string {
  const lines: string[] = []
  const gap = evaluateContentLabelingGap(asset)
  lines.push(`# Asset Art. 50 — ${asset.title}`)
  lines.push(``)
  lines.push(`**ID:** ${asset.id}`)
  lines.push(`**Tip:** ${ASSET_TYPE_LABELS[asset.assetType]}`)
  if (asset.linkedAISystemId) {
    lines.push(`**Sistem AI legat:** ${asset.linkedAISystemId}`)
  }
  lines.push(`**Creat:** ${asset.createdAtISO}`)
  lines.push(`**Actualizat:** ${asset.updatedAtISO}`)
  if (asset.publishedAtISO) lines.push(`**Publicat:** ${asset.publishedAtISO}`)
  if (asset.distributionContext.length > 0) {
    lines.push(`**Canale distribuție:** ${asset.distributionContext.join(", ")}`)
  }
  if (typeof asset.audienceSize === "number") {
    lines.push(`**Audiență estimată:** ${asset.audienceSize}`)
  }
  lines.push(``)
  lines.push(`## A. Provider duty (Art. 50(2))`)
  lines.push(``)
  lines.push(`- **Marcaj tehnic aplicat:** ${asset.providerMarkingApplied ? "DA" : "NU"}`)
  lines.push(`- **Standard:** ${STANDARD_LABELS[asset.providerMarkingStandard]}`)
  if (asset.providerMarkingProof) {
    lines.push(`- **Dovadă:** ${asset.providerMarkingProof}`)
  }
  if (gap.providerGap) {
    lines.push(``)
    lines.push(`> ⚠️ ${gap.providerGap}`)
  }
  lines.push(``)
  lines.push(`## B. Deployer duty (Art. 50(1)/(3)/(4))`)
  lines.push(``)
  lines.push(
    `- **Disclosure vizibil aplicat:** ${asset.deployerDisclosureApplied ? "DA" : "NU"}`,
  )
  if (asset.deployerDisclosurePlacement) {
    lines.push(`- **Placement:** ${asset.deployerDisclosurePlacement}`)
  }
  if (asset.deployerDisclosureLanguage) {
    lines.push(`- **Limbă:** ${asset.deployerDisclosureLanguage}`)
  }
  if (asset.deployerDisclosureText) {
    lines.push(`- **Text disclosure:**`)
    lines.push(``)
    lines.push("> " + asset.deployerDisclosureText.replace(/\n/g, "\n> "))
  }
  if (gap.deployerGap) {
    lines.push(``)
    lines.push(`> ⚠️ ${gap.deployerGap}`)
  }
  lines.push(``)
  if (
    asset.assetType === "public_interest_text" ||
    asset.isPublicInterest === true
  ) {
    lines.push(`## C. Public-interest editorial review (Art. 50(4)(b))`)
    lines.push(``)
    lines.push(
      `- **Editorial responsibility claim:** ${asset.editorialResponsibilityClaim ? "DA" : "NU"}`,
    )
    if (asset.editorialReviewBy) {
      lines.push(`- **Revizuit de:** ${asset.editorialReviewBy}`)
    }
    if (asset.editorialReviewAtISO) {
      lines.push(`- **Data revizuire:** ${asset.editorialReviewAtISO}`)
    }
    if (gap.editorialGap) {
      lines.push(``)
      lines.push(`> ⚠️ ${gap.editorialGap}`)
    }
    lines.push(``)
  }
  lines.push(`## D. Dovezi atașate (${asset.evidenceItems.length})`)
  lines.push(``)
  if (asset.evidenceItems.length === 0) {
    lines.push(`_Nicio dovadă atașată._`)
  } else {
    lines.push(`| Tip | Descriere | Uploaded | Of | Hash |`)
    lines.push(`|---|---|---|---|---|`)
    for (const ev of asset.evidenceItems) {
      lines.push(
        `| ${ev.type} | ${ev.description.replace(/\|/g, "\\|")} | ${ev.uploadedAtISO} | ${ev.uploadedByEmail} | ${ev.fileHash ? ev.fileHash.slice(0, 16) + "…" : "—"} |`,
      )
    }
  }
  lines.push(``)
  lines.push(`## E. Findings linkate (${asset.linkedFindingIds.length})`)
  lines.push(``)
  if (asset.linkedFindingIds.length === 0) {
    lines.push(`_Niciun finding deschis._`)
  } else {
    for (const fid of asset.linkedFindingIds) {
      lines.push(`- ${fid}`)
    }
  }
  if (asset.notes) {
    lines.push(``)
    lines.push(`## F. Note interne`)
    lines.push(``)
    lines.push(asset.notes)
  }
  lines.push(``)
  return lines.join("\n")
}

export function buildContentRegisterMarkdown(
  assets: AIContentLabeledAsset[],
  orgName: string,
): string {
  const lines: string[] = []
  lines.push(`# Content Register Art. 50 — ${orgName}`)
  lines.push(``)
  lines.push(
    `Registru per-asset al conținutului AI generat / chatbot interactiv,`,
  )
  lines.push(
    `tracking provider duty (Art. 50(2) — machine-readable marking) +`,
  )
  lines.push(
    `deployer duty (Art. 50(1)/(3)/(4) — visible disclosure).`,
  )
  lines.push(``)
  const summary = summarizeContentAssets(assets)
  lines.push(`**Total assets:** ${summary.total}`)
  lines.push(`**Cu provider marking:** ${summary.withProviderMarking}`)
  lines.push(`**Cu deployer disclosure:** ${summary.withDeployerDisclosure}`)
  lines.push(`**Public-interest cu editorial review:** ${summary.publicInterestReviewed}`)
  lines.push(`**Unresolved gaps:** ${summary.unresolvedGaps}`)
  lines.push(``)
  if (assets.length === 0) {
    lines.push(`_Niciun asset înregistrat._`)
    return lines.join("\n") + "\n"
  }
  lines.push(
    `| Titlu | Tip | Provider mark | Deployer disclosure | Public-interest | Gaps |`,
  )
  lines.push(`|---|---|---|---|---|---|`)
  for (const a of assets) {
    const gap = evaluateContentLabelingGap(a)
    const gaps = [
      gap.providerGap ? "provider" : null,
      gap.deployerGap ? "deployer" : null,
      gap.editorialGap ? "editorial" : null,
    ]
      .filter(Boolean)
      .join(", ")
    lines.push(
      `| ${a.title.replace(/\|/g, "\\|")} | ${ASSET_TYPE_LABELS[a.assetType]} | ${a.providerMarkingApplied ? STANDARD_LABELS[a.providerMarkingStandard] : "—"} | ${a.deployerDisclosureApplied ? (a.deployerDisclosurePlacement ?? "DA") : "—"} | ${a.editorialResponsibilityClaim ? "claim" : a.isPublicInterest ? "needs review" : "—"} | ${gaps || "✅"} |`,
    )
  }
  lines.push(``)
  return lines.join("\n") + "\n"
}
