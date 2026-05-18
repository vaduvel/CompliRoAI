/**
 * Sprint 024 — AI Ads / LLM Commerce Compliance Pack store adapter.
 *
 * Per-org store pentru:
 *   - AIAdsCampaign        (campanii AI Ads / LLM commerce)
 *   - AIAdsClaim           (claim registry — fiecare afirmație → sursă)
 *   - AIAdsCreativeApproval (log creative approval cu 3 gate-uri)
 *   - ConversionTrackingReview (GDPR review pentru pixel/cookie/CRM/transfer)
 *
 * Pattern: identic cu transparency-content-store / vendor-store —
 *   `mutateFreshStateForOrg` + `appendComplianceEvents` + emit findings via
 *   `createFinding` din findings-store.
 *
 * Stable finding IDs (encoded in evidenceRequired for dedup):
 *   - `ai-ads-campaign-{id}-{rule}`
 *   - `ai-ads-claim-{id}-{rule}`
 *   - `ai-ads-tracking-{id}-{rule}`
 *
 * Cross-module links (Rule 1 — no duplicate registers):
 *   - campaign.linkedVendorId → VendorRecord (Sprint 010)
 *   - campaign.linkedAssetIds[] → AIContentLabeledAsset (Sprint 023.7)
 *
 * Legal anchors:
 *   - Directive 2005/29/EC + RO Law 363/2007 (claims)
 *   - GDPR Art. 5/13/14/28/44-49 (tracking + transfers + DPA)
 *   - ePrivacy Directive 2002/58/EC Art. 5(3) (pixels + cookies)
 *   - Art. 5 + Art. 50 EU AI Act
 */

import {
  buildClaimRiskReasons,
  evaluateCampaignGaps,
  evaluateClaimFindings,
  evaluateClaimRisk,
  evaluateTrackingGaps,
  generateAIAdsMarkdown,
  type AIAdsFindingCandidate,
} from "@/lib/compliance/ai-ads-engine"
import {
  appendComplianceEvents,
  createComplianceEvent,
  type ComplianceEventActorInput,
} from "@/lib/compliance/events"
import { createFinding } from "@/lib/server/findings-store"
import { mutateFreshStateForOrg, readState } from "@/lib/server/store"
import type {
  AIAdsCampaign,
  AIAdsCampaignPlatform,
  AIAdsCampaignStatus,
  AIAdsCampaignType,
  AIAdsClaim,
  AIAdsCreativeApproval,
  AIAdsTransferMechanism,
  AIClaimEvidenceStatus,
  AIClaimMisleadingRisk,
  AIClaimType,
  ComplianceState,
  ConversionTrackingMethod,
  ConversionTrackingReview,
  ScanFinding,
} from "@/lib/compliance/types"

// ────────────────────────────────────────────────────────────────────────────
//   Input types
// ────────────────────────────────────────────────────────────────────────────

export type CreateCampaignInput = {
  title: string
  brandName: string
  platform: AIAdsCampaignPlatform
  campaignType: AIAdsCampaignType
  linkedVendorId?: string
  linkedAssetIds?: string[]
  status?: AIAdsCampaignStatus
  startDateISO?: string
  endDateISO?: string
  budgetEUR?: number
  targetAudienceDescription?: string
  targetsVulnerableCategories?: boolean
  platformTermsReviewed?: boolean
  platformTermsReviewedByEmail?: string
  platformTermsReviewedAtISO?: string
  notes?: string
}

export type UpdateCampaignPatch = Partial<
  Omit<
    AIAdsCampaign,
    | "id"
    | "orgId"
    | "createdByEmail"
    | "createdAtISO"
    | "updatedAtISO"
    | "linkedFindingIds"
    | "approvalIds"
    | "linkedClaimIds"
    | "conversionTrackingReviewId"
  >
>

export type CreateClaimInput = {
  campaignId?: string
  claimType: AIClaimType
  claimText: string
  contextDescription: string
  evidenceStatus: AIClaimEvidenceStatus
  evidenceSource?: string
  evidenceDocumentId?: string
  approvalComment?: string
  notes?: string
}

export type UpdateClaimPatch = Partial<
  Omit<
    AIAdsClaim,
    | "id"
    | "orgId"
    | "createdByEmail"
    | "createdAtISO"
    | "updatedAtISO"
    | "linkedFindingIds"
    | "misleadingRisk"
    | "riskReasons"
  >
>

export type RecordApprovalInput = {
  creativeAssetId?: string
  creativeDescription: string
  approvedByEmail: string
  comment?: string
  prohibitedContentChecked?: boolean
  prohibitedContentNotes?: string
  art5Check?: boolean
  consumerLawCheck?: boolean
  ipRightsCheck?: boolean
}

export type AttachTrackingReviewInput = {
  methods: ConversionTrackingMethod[]
  consentRequired: boolean
  consentRecordedHow?: string
  cookieList?: string[]
  pixelList?: string[]
  crmUploadUsed?: boolean
  crmDataCategoriesUploaded?: string[]
  audienceMatchingPlatform?: string
  thirdCountryTransfer?: boolean
  transferMechanism?: AIAdsTransferMechanism
  reviewedByEmail?: string
  reviewNotes?: string
}

export type CampaignFilters = {
  status?: AIAdsCampaignStatus
  platform?: AIAdsCampaignPlatform
}

// ────────────────────────────────────────────────────────────────────────────
//   Helpers
// ────────────────────────────────────────────────────────────────────────────

function nowISO(): string {
  return new Date().toISOString()
}

function campId(): string {
  return `aac-${Math.random().toString(36).slice(2, 10)}`
}

function claimId(): string {
  return `aacl-${Math.random().toString(36).slice(2, 10)}`
}

function approvalId(): string {
  return `aapr-${Math.random().toString(36).slice(2, 10)}`
}

function trackingId(): string {
  return `aatr-${Math.random().toString(36).slice(2, 10)}`
}

function stableCampaignFindingId(campaignId: string, ruleKey: string): string {
  return `ai-ads-campaign-${campaignId}-${ruleKey}`
}

function stableClaimFindingId(claimId: string, ruleKey: string): string {
  return `ai-ads-claim-${claimId}-${ruleKey}`
}

function stableHash(input: string): string {
  // Simple deterministic short hash (not cryptographic) for stable rule key
  let h = 0
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) | 0
  }
  return Math.abs(h).toString(36).slice(0, 8)
}

const VALID_PLATFORMS: AIAdsCampaignPlatform[] = [
  "chatgpt_ads",
  "meta_ai_ads",
  "google_ai_ads",
  "perplexity_sponsored",
  "anthropic_claude",
  "llm_recommendation_native",
  "ai_generated_creative_meta",
  "ai_generated_creative_google",
  "ai_generated_creative_linkedin",
  "other",
]

const VALID_STATUS: AIAdsCampaignStatus[] = [
  "draft",
  "in_review",
  "approved",
  "active",
  "paused",
  "completed",
  "rejected",
]

const VALID_CAMPAIGN_TYPES: AIAdsCampaignType[] = [
  "paid_placement",
  "llm_recommendation",
  "ai_generated_creative",
  "ai_landing_page",
  "hybrid",
]

const VALID_CLAIM_TYPES: AIClaimType[] = [
  "performance_metric",
  "price_promise",
  "guarantee",
  "certification",
  "comparative",
  "endorsement",
  "compliance_claim",
  "outcome_claim",
  "other",
]

const VALID_EVIDENCE_STATUS: AIClaimEvidenceStatus[] = [
  "unsubstantiated",
  "internal_data",
  "third_party_audit",
  "public_record",
  "vendor_attestation",
  "needs_review",
  "verified",
]

const VALID_TRACKING_METHODS: ConversionTrackingMethod[] = [
  "first_party_cookie",
  "third_party_cookie",
  "server_side_tagging",
  "pixel_meta",
  "pixel_google",
  "pixel_linkedin",
  "audience_matching_crm_upload",
  "fingerprinting",
  "none",
]

const VALID_TRANSFER_MECHANISMS: AIAdsTransferMechanism[] = [
  "scc",
  "adequacy",
  "bcr",
  "derogation",
  "none",
]

export function isCampaignPlatform(value: unknown): value is AIAdsCampaignPlatform {
  return typeof value === "string" && VALID_PLATFORMS.includes(value as AIAdsCampaignPlatform)
}

export function isCampaignStatus(value: unknown): value is AIAdsCampaignStatus {
  return typeof value === "string" && VALID_STATUS.includes(value as AIAdsCampaignStatus)
}

export function isCampaignType(value: unknown): value is AIAdsCampaignType {
  return typeof value === "string" && VALID_CAMPAIGN_TYPES.includes(value as AIAdsCampaignType)
}

export function isClaimType(value: unknown): value is AIClaimType {
  return typeof value === "string" && VALID_CLAIM_TYPES.includes(value as AIClaimType)
}

export function isEvidenceStatus(value: unknown): value is AIClaimEvidenceStatus {
  return typeof value === "string" && VALID_EVIDENCE_STATUS.includes(value as AIClaimEvidenceStatus)
}

export function isTrackingMethod(value: unknown): value is ConversionTrackingMethod {
  return typeof value === "string" && VALID_TRACKING_METHODS.includes(value as ConversionTrackingMethod)
}

export function isTransferMechanism(value: unknown): value is AIAdsTransferMechanism {
  return typeof value === "string" && VALID_TRANSFER_MECHANISMS.includes(value as AIAdsTransferMechanism)
}

// ────────────────────────────────────────────────────────────────────────────
//   Reads
// ────────────────────────────────────────────────────────────────────────────

export type AIAdsSummary = {
  totalCampaigns: number
  activeCampaigns: number
  totalClaims: number
  claimsUnsubstantiated: number
  totalApprovals: number
  totalTrackingReviews: number
  pendingTrackingReviews: number
  totalFindings: number
}

export function summarizeAIAds(
  campaigns: AIAdsCampaign[],
  claims: AIAdsClaim[],
  approvals: AIAdsCreativeApproval[],
  trackingReviews: ConversionTrackingReview[],
): AIAdsSummary {
  return {
    totalCampaigns: campaigns.length,
    activeCampaigns: campaigns.filter((c) => c.status === "active").length,
    totalClaims: claims.length,
    claimsUnsubstantiated: claims.filter(
      (c) => c.evidenceStatus === "unsubstantiated" || c.evidenceStatus === "needs_review",
    ).length,
    totalApprovals: approvals.length,
    totalTrackingReviews: trackingReviews.length,
    pendingTrackingReviews: trackingReviews.filter((t) => !t.reviewedByEmail).length,
    totalFindings:
      campaigns.reduce((sum, c) => sum + c.linkedFindingIds.length, 0) +
      claims.reduce((sum, c) => sum + c.linkedFindingIds.length, 0),
  }
}

export async function listCampaigns(
  _orgId?: string,
  filters: CampaignFilters = {},
): Promise<{
  campaigns: AIAdsCampaign[]
  claims: AIAdsClaim[]
  approvals: AIAdsCreativeApproval[]
  trackingReviews: ConversionTrackingReview[]
  summary: AIAdsSummary
}> {
  const state = await readState()
  const allCampaigns = state.aiAdsCampaigns ?? []
  const allClaims = state.aiAdsClaims ?? []
  const allApprovals = state.aiAdsCreativeApprovals ?? []
  const allTracking = state.conversionTrackingReviews ?? []

  let campaigns = allCampaigns
  if (filters.status) campaigns = campaigns.filter((c) => c.status === filters.status)
  if (filters.platform) campaigns = campaigns.filter((c) => c.platform === filters.platform)

  return {
    campaigns,
    claims: allClaims,
    approvals: allApprovals,
    trackingReviews: allTracking,
    summary: summarizeAIAds(allCampaigns, allClaims, allApprovals, allTracking),
  }
}

export async function getCampaignById(
  _orgId: string,
  id: string,
): Promise<AIAdsCampaign | null> {
  const state = await readState()
  return state.aiAdsCampaigns?.find((c) => c.id === id) ?? null
}

export async function getClaimById(
  _orgId: string,
  id: string,
): Promise<AIAdsClaim | null> {
  const state = await readState()
  return state.aiAdsClaims?.find((c) => c.id === id) ?? null
}

export async function getTrackingReviewById(
  _orgId: string,
  id: string,
): Promise<ConversionTrackingReview | null> {
  const state = await readState()
  return state.conversionTrackingReviews?.find((t) => t.id === id) ?? null
}

export async function getApprovalById(
  _orgId: string,
  id: string,
): Promise<AIAdsCreativeApproval | null> {
  const state = await readState()
  return state.aiAdsCreativeApprovals?.find((a) => a.id === id) ?? null
}

// ────────────────────────────────────────────────────────────────────────────
//   Finding emission helpers (campaign + claim)
// ────────────────────────────────────────────────────────────────────────────

async function emitCampaignFindings(
  orgId: string,
  campaign: AIAdsCampaign,
  candidates: AIAdsFindingCandidate[],
  actor: ComplianceEventActorInput,
): Promise<string[]> {
  const findingIds: string[] = []
  for (const cand of candidates) {
    const stableId = stableCampaignFindingId(campaign.id, cand.ruleKey)
    const state = await readState()
    const existing = state.findings?.find((f) =>
      f.evidenceRequired?.includes(stableId),
    )
    if (existing) {
      findingIds.push(existing.id)
      continue
    }
    const created = await createFinding(
      orgId,
      {
        title: cand.title,
        detail: `${cand.detail}\n\n[stable-id: ${stableId}] [campaign-${campaign.id}]`,
        category: cand.category,
        severity: cand.severity,
        legalReference: cand.legalReference,
        remediationHint: cand.remediationHint,
        impactSummary: cand.impactSummary,
        evidenceRequired: `${cand.evidenceRequired} [${stableId}]`,
        ownerSuggestion: "DPO / responsabil marketing / consilier juridic",
        closeCondition:
          "Campania remediată și gap-ul eliminat la re-evaluare (engine evaluateCampaignGaps).",
      },
      actor,
    )
    findingIds.push(created.id)
  }
  return findingIds
}

async function emitClaimFindings(
  orgId: string,
  claim: AIAdsClaim,
  actor: ComplianceEventActorInput,
): Promise<string[]> {
  const candidates = evaluateClaimFindings(claim)
  const findingIds: string[] = []
  for (const cand of candidates) {
    const stableId = stableClaimFindingId(claim.id, cand.ruleKey)
    const state = await readState()
    const existing = state.findings?.find((f) =>
      f.evidenceRequired?.includes(stableId),
    )
    if (existing) {
      findingIds.push(existing.id)
      continue
    }
    const created = await createFinding(
      orgId,
      {
        title: cand.title,
        detail: `${cand.detail}\n\n[stable-id: ${stableId}] [claim-${claim.id}]`,
        category: cand.category,
        severity: cand.severity,
        legalReference: cand.legalReference,
        remediationHint: cand.remediationHint,
        impactSummary: cand.impactSummary,
        evidenceRequired: `${cand.evidenceRequired} [${stableId}]`,
        ownerSuggestion: "DPO / marketing legal owner",
        closeCondition:
          "Claim substanțiat cu sursă verificabilă sau retras din creative.",
      },
      actor,
    )
    findingIds.push(created.id)
  }
  return findingIds
}

/**
 * Closes (resolves) findings whose stable IDs match. Returns updated state +
 * list of finding IDs that were resolved.
 */
function resolveStableFindings(
  state: ComplianceState,
  stableIds: string[],
  reason: string,
): { state: ComplianceState; resolvedIds: string[] } {
  if (stableIds.length === 0) return { state, resolvedIds: [] }
  const findings = state.findings ?? []
  const resolvedIds: string[] = []
  const now = nowISO()
  const updatedFindings = findings.map((f) => {
    if (
      stableIds.some((sid) => f.evidenceRequired?.includes(sid)) &&
      f.findingStatus !== "resolved"
    ) {
      resolvedIds.push(f.id)
      return {
        ...f,
        findingStatus: "resolved" as const,
        findingStatusUpdatedAtISO: now,
        operationalEvidenceNote: reason,
      }
    }
    return f
  })
  return { state: { ...state, findings: updatedFindings }, resolvedIds }
}

// ────────────────────────────────────────────────────────────────────────────
//   Create campaign
// ────────────────────────────────────────────────────────────────────────────

export async function createCampaign(
  orgId: string,
  input: CreateCampaignInput,
  actor: ComplianceEventActorInput,
): Promise<AIAdsCampaign> {
  const title = input.title?.trim()
  if (!title) throw new Error("Campaign title required")
  const brandName = input.brandName?.trim()
  if (!brandName) throw new Error("Campaign brandName required")
  if (!isCampaignPlatform(input.platform)) {
    throw new Error("Invalid campaign platform")
  }
  if (!isCampaignType(input.campaignType)) {
    throw new Error("Invalid campaign type")
  }
  const status: AIAdsCampaignStatus = input.status ?? "draft"
  if (!isCampaignStatus(status)) {
    throw new Error("Invalid campaign status")
  }

  const now = nowISO()
  const id = campId()
  const draft: AIAdsCampaign = {
    id,
    orgId,
    title,
    brandName,
    platform: input.platform,
    campaignType: input.campaignType,
    linkedVendorId: input.linkedVendorId?.trim() || undefined,
    linkedAssetIds: Array.isArray(input.linkedAssetIds)
      ? input.linkedAssetIds.filter((s) => typeof s === "string" && s.trim().length > 0)
      : [],
    linkedClaimIds: [],
    status,
    startDateISO: input.startDateISO,
    endDateISO: input.endDateISO,
    budgetEUR:
      typeof input.budgetEUR === "number" && Number.isFinite(input.budgetEUR)
        ? input.budgetEUR
        : undefined,
    targetAudienceDescription: input.targetAudienceDescription?.trim() || undefined,
    targetsVulnerableCategories: Boolean(input.targetsVulnerableCategories),
    platformTermsReviewed: Boolean(input.platformTermsReviewed),
    platformTermsReviewedByEmail: input.platformTermsReviewedByEmail?.trim() || undefined,
    platformTermsReviewedAtISO: input.platformTermsReviewedAtISO,
    approvalIds: [],
    linkedFindingIds: [],
    notes: input.notes?.trim() || undefined,
    createdByEmail: actor.label,
    createdAtISO: now,
    updatedAtISO: now,
  }

  // Evaluate gaps against current state
  const state = await readState()
  const evaluation = evaluateCampaignGaps(
    draft,
    state.aiAdsClaims ?? [],
    state.aiAdsCreativeApprovals ?? [],
    state.conversionTrackingReviews ?? [],
    state.vendorRecords ?? [],
  )
  const findingIds = await emitCampaignFindings(orgId, draft, evaluation.findingCandidates, actor)
  const enriched: AIAdsCampaign = { ...draft, linkedFindingIds: findingIds }

  await mutateFreshStateForOrg(orgId, (s) => ({
    ...s,
    aiAdsCampaigns: [enriched, ...(s.aiAdsCampaigns ?? [])].slice(0, 500),
    events: appendComplianceEvents(s, [
      createComplianceEvent(
        {
          type: "ai_ads_campaign.created",
          entityType: "system",
          entityId: enriched.id,
          message: `Campanie AI Ads creată: ${enriched.title} · ${enriched.platform} · gaps: ${findingIds.length}`,
          createdAtISO: now,
          metadata: {
            platform: enriched.platform,
            campaignType: enriched.campaignType,
            status: enriched.status,
            findingsEmitted: findingIds.length,
          },
        },
        actor,
      ),
    ]),
  }))

  return enriched
}

// ────────────────────────────────────────────────────────────────────────────
//   Update campaign — re-evaluate gaps, resolve fixed findings, emit new
// ────────────────────────────────────────────────────────────────────────────

export async function updateCampaign(
  orgId: string,
  id: string,
  patch: UpdateCampaignPatch,
  actor: ComplianceEventActorInput,
): Promise<AIAdsCampaign | null> {
  const existing = await getCampaignById(orgId, id)
  if (!existing) return null

  const now = nowISO()
  const merged: AIAdsCampaign = {
    ...existing,
    ...patch,
    id: existing.id,
    orgId: existing.orgId,
    createdByEmail: existing.createdByEmail,
    createdAtISO: existing.createdAtISO,
    linkedClaimIds: existing.linkedClaimIds,
    conversionTrackingReviewId: existing.conversionTrackingReviewId,
    approvalIds: existing.approvalIds,
    linkedFindingIds: existing.linkedFindingIds,
    updatedAtISO: now,
  }
  if (patch.platform && !isCampaignPlatform(patch.platform)) {
    merged.platform = existing.platform
  }
  if (patch.campaignType && !isCampaignType(patch.campaignType)) {
    merged.campaignType = existing.campaignType
  }
  if (patch.status && !isCampaignStatus(patch.status)) {
    merged.status = existing.status
  }

  const state = await readState()
  const previousEvaluation = evaluateCampaignGaps(
    existing,
    state.aiAdsClaims ?? [],
    state.aiAdsCreativeApprovals ?? [],
    state.conversionTrackingReviews ?? [],
    state.vendorRecords ?? [],
  )
  const newEvaluation = evaluateCampaignGaps(
    merged,
    state.aiAdsClaims ?? [],
    state.aiAdsCreativeApprovals ?? [],
    state.conversionTrackingReviews ?? [],
    state.vendorRecords ?? [],
  )

  // Resolve findings that were in previous but not in new (fixed gaps)
  const previousRules = new Set(previousEvaluation.findingCandidates.map((c) => c.ruleKey))
  const newRules = new Set(newEvaluation.findingCandidates.map((c) => c.ruleKey))
  const resolvedRules: string[] = []
  for (const rule of previousRules) {
    if (!newRules.has(rule)) resolvedRules.push(rule)
  }
  const resolvedStableIds = resolvedRules.map((r) => stableCampaignFindingId(id, r))

  let resolvedFindingCount = 0
  if (resolvedStableIds.length > 0) {
    await mutateFreshStateForOrg(orgId, (s) => {
      const { state: nextState, resolvedIds } = resolveStableFindings(
        s,
        resolvedStableIds,
        `Closed automatic: gap remediat la update campanie (${merged.title}).`,
      )
      resolvedFindingCount = resolvedIds.length
      return nextState
    })
  }

  // Emit findings for new gaps
  const newFindingIds = await emitCampaignFindings(orgId, merged, newEvaluation.findingCandidates, actor)
  const previousLinkedCount = existing.linkedFindingIds.length
  merged.linkedFindingIds = Array.from(
    new Set([...existing.linkedFindingIds, ...newFindingIds]),
  )

  await mutateFreshStateForOrg(orgId, (s) => {
    const list = s.aiAdsCampaigns ?? []
    const idx = list.findIndex((c) => c.id === id)
    if (idx === -1) return s
    const next = [...list]
    next[idx] = merged
    return {
      ...s,
      aiAdsCampaigns: next,
      events: appendComplianceEvents(s, [
        createComplianceEvent(
          {
            type: "ai_ads_campaign.updated",
            entityType: "system",
            entityId: merged.id,
            message: `Campanie AI Ads actualizată: ${merged.title} · resolved: ${resolvedFindingCount} · new findings: ${merged.linkedFindingIds.length - previousLinkedCount}`,
            createdAtISO: now,
            metadata: {
              platform: merged.platform,
              status: merged.status,
              resolvedFindings: resolvedFindingCount,
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
//   Delete campaign — cascade-close linked claims/approvals/tracking + findings
// ────────────────────────────────────────────────────────────────────────────

export async function deleteCampaign(
  orgId: string,
  id: string,
  actor: ComplianceEventActorInput,
): Promise<boolean> {
  let removed = false
  await mutateFreshStateForOrg(orgId, (s) => {
    const campaigns = s.aiAdsCampaigns ?? []
    const target = campaigns.find((c) => c.id === id)
    if (!target) return s
    removed = true
    const now = nowISO()

    // Cascade: collect linked claim/approval/tracking + their findings
    const linkedClaimIds = new Set(target.linkedClaimIds)
    const linkedApprovalIds = new Set(target.approvalIds)
    const linkedTrackingId = target.conversionTrackingReviewId

    const claims = (s.aiAdsClaims ?? []).filter((cl) => {
      if (linkedClaimIds.has(cl.id)) return false
      if (cl.campaignId === target.id) return false
      return true
    })
    const cascadeClaimFindings = (s.aiAdsClaims ?? [])
      .filter((cl) => linkedClaimIds.has(cl.id) || cl.campaignId === target.id)
      .flatMap((cl) => cl.linkedFindingIds)

    const approvals = (s.aiAdsCreativeApprovals ?? []).filter(
      (a) => !linkedApprovalIds.has(a.id) && a.campaignId !== target.id,
    )

    const trackingReviews = (s.conversionTrackingReviews ?? []).filter(
      (t) => t.id !== linkedTrackingId && t.campaignId !== target.id,
    )
    const cascadeTrackingFindings = (s.conversionTrackingReviews ?? [])
      .filter((t) => t.id === linkedTrackingId || t.campaignId === target.id)
      .flatMap((t) => t.linkedFindingIds)

    const allFindingsToClose = new Set<string>([
      ...target.linkedFindingIds,
      ...cascadeClaimFindings,
      ...cascadeTrackingFindings,
    ])

    const findings = (s.findings ?? []).map((f) => {
      if (allFindingsToClose.has(f.id) && f.findingStatus !== "resolved") {
        return {
          ...f,
          findingStatus: "resolved" as const,
          findingStatusUpdatedAtISO: now,
          operationalEvidenceNote: `Closed automatic: campania AI Ads ștearsă (${target.title}).`,
        }
      }
      return f
    })

    return {
      ...s,
      aiAdsCampaigns: campaigns.filter((c) => c.id !== id),
      aiAdsClaims: claims,
      aiAdsCreativeApprovals: approvals,
      conversionTrackingReviews: trackingReviews,
      findings,
      events: appendComplianceEvents(s, [
        createComplianceEvent(
          {
            type: "ai_ads_campaign.deleted",
            entityType: "system",
            entityId: id,
            message: `Campanie AI Ads ștearsă: ${target.title} · findings închise: ${allFindingsToClose.size}`,
            createdAtISO: now,
            metadata: {
              platform: target.platform,
              findingsClosed: allFindingsToClose.size,
              claimsCascaded: target.linkedClaimIds.length,
              approvalsCascaded: target.approvalIds.length,
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
//   Create claim
// ────────────────────────────────────────────────────────────────────────────

export async function createClaim(
  orgId: string,
  input: CreateClaimInput,
  actor: ComplianceEventActorInput,
): Promise<AIAdsClaim> {
  const claimText = input.claimText?.trim()
  if (!claimText) throw new Error("Claim text required")
  if (!isClaimType(input.claimType)) throw new Error("Invalid claim type")
  if (!isEvidenceStatus(input.evidenceStatus)) throw new Error("Invalid evidence status")

  const now = nowISO()
  const id = claimId()
  const misleadingRisk: AIClaimMisleadingRisk = evaluateClaimRisk({
    claimType: input.claimType,
    evidenceStatus: input.evidenceStatus,
  })
  const riskReasons = buildClaimRiskReasons({
    claimType: input.claimType,
    evidenceStatus: input.evidenceStatus,
  })

  const draft: AIAdsClaim = {
    id,
    orgId,
    campaignId: input.campaignId?.trim() || undefined,
    claimType: input.claimType,
    claimText,
    contextDescription: input.contextDescription?.trim() || "",
    evidenceStatus: input.evidenceStatus,
    evidenceSource: input.evidenceSource?.trim() || undefined,
    evidenceDocumentId: input.evidenceDocumentId?.trim() || undefined,
    misleadingRisk,
    riskReasons,
    linkedFindingIds: [],
    notes: input.notes?.trim() || undefined,
    createdByEmail: actor.label,
    createdAtISO: now,
    updatedAtISO: now,
  }

  const findingIds = await emitClaimFindings(orgId, draft, actor)
  const enriched: AIAdsClaim = { ...draft, linkedFindingIds: findingIds }

  await mutateFreshStateForOrg(orgId, (s) => {
    const claims = [enriched, ...(s.aiAdsClaims ?? [])].slice(0, 1000)
    // Link claim to campaign if campaignId is set
    let campaigns = s.aiAdsCampaigns ?? []
    if (enriched.campaignId) {
      campaigns = campaigns.map((c) =>
        c.id === enriched.campaignId
          ? {
              ...c,
              linkedClaimIds: Array.from(new Set([...c.linkedClaimIds, enriched.id])),
              updatedAtISO: now,
            }
          : c,
      )
    }
    return {
      ...s,
      aiAdsClaims: claims,
      aiAdsCampaigns: campaigns,
      events: appendComplianceEvents(s, [
        createComplianceEvent(
          {
            type: "ai_ads_claim.created",
            entityType: "system",
            entityId: enriched.id,
            message: `Claim AI Ads înregistrat: „${enriched.claimText.slice(0, 60)}…” · risc: ${enriched.misleadingRisk}`,
            createdAtISO: now,
            metadata: {
              claimType: enriched.claimType,
              evidenceStatus: enriched.evidenceStatus,
              misleadingRisk: enriched.misleadingRisk,
              findingsEmitted: findingIds.length,
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
//   Update claim — re-eval risk, resolve fixed findings, emit new
// ────────────────────────────────────────────────────────────────────────────

export async function updateClaim(
  orgId: string,
  id: string,
  patch: UpdateClaimPatch,
  actor: ComplianceEventActorInput,
): Promise<AIAdsClaim | null> {
  const existing = await getClaimById(orgId, id)
  if (!existing) return null

  const now = nowISO()
  const merged: AIAdsClaim = {
    ...existing,
    ...patch,
    id: existing.id,
    orgId: existing.orgId,
    createdByEmail: existing.createdByEmail,
    createdAtISO: existing.createdAtISO,
    misleadingRisk: existing.misleadingRisk,
    riskReasons: existing.riskReasons,
    linkedFindingIds: existing.linkedFindingIds,
    updatedAtISO: now,
  }
  if (patch.claimType && !isClaimType(patch.claimType)) {
    merged.claimType = existing.claimType
  }
  if (patch.evidenceStatus && !isEvidenceStatus(patch.evidenceStatus)) {
    merged.evidenceStatus = existing.evidenceStatus
  }

  // Re-evaluate misleadingRisk
  merged.misleadingRisk = evaluateClaimRisk({
    claimType: merged.claimType,
    evidenceStatus: merged.evidenceStatus,
  })
  merged.riskReasons = buildClaimRiskReasons({
    claimType: merged.claimType,
    evidenceStatus: merged.evidenceStatus,
  })

  // Resolve previous high-risk findings if risk dropped
  const previousHighRisk =
    existing.misleadingRisk === "high" || existing.misleadingRisk === "critical"
  const newHighRisk =
    merged.misleadingRisk === "high" || merged.misleadingRisk === "critical"

  let resolvedFindingCount = 0
  if (previousHighRisk && !newHighRisk) {
    const stableId = stableClaimFindingId(id, "claim-misleading-risk")
    await mutateFreshStateForOrg(orgId, (s) => {
      const { state: nextState, resolvedIds } = resolveStableFindings(
        s,
        [stableId],
        `Closed automatic: claim substanțiat (${merged.claimText.slice(0, 40)}).`,
      )
      resolvedFindingCount = resolvedIds.length
      return nextState
    })
  }

  // Emit new findings if risk increased / stayed high
  const newFindingIds = await emitClaimFindings(orgId, merged, actor)
  merged.linkedFindingIds = Array.from(
    new Set([...existing.linkedFindingIds, ...newFindingIds]),
  )

  await mutateFreshStateForOrg(orgId, (s) => {
    const claims = s.aiAdsClaims ?? []
    const idx = claims.findIndex((c) => c.id === id)
    if (idx === -1) return s
    const next = [...claims]
    next[idx] = merged
    return {
      ...s,
      aiAdsClaims: next,
      events: appendComplianceEvents(s, [
        createComplianceEvent(
          {
            type: "ai_ads_claim.updated",
            entityType: "system",
            entityId: merged.id,
            message: `Claim AI Ads actualizat · risc: ${merged.misleadingRisk} · resolved: ${resolvedFindingCount}`,
            createdAtISO: now,
            metadata: {
              claimType: merged.claimType,
              evidenceStatus: merged.evidenceStatus,
              misleadingRisk: merged.misleadingRisk,
              resolvedFindings: resolvedFindingCount,
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
//   Delete claim
// ────────────────────────────────────────────────────────────────────────────

export async function deleteClaim(
  orgId: string,
  id: string,
  actor: ComplianceEventActorInput,
): Promise<boolean> {
  let removed = false
  await mutateFreshStateForOrg(orgId, (s) => {
    const claims = s.aiAdsClaims ?? []
    const target = claims.find((c) => c.id === id)
    if (!target) return s
    removed = true
    const now = nowISO()
    const linkedIds = new Set(target.linkedFindingIds)

    const findings = (s.findings ?? []).map((f) => {
      if (linkedIds.has(f.id) && f.findingStatus !== "resolved") {
        return {
          ...f,
          findingStatus: "resolved" as const,
          findingStatusUpdatedAtISO: now,
          operationalEvidenceNote: `Closed automatic: claim AI Ads șters.`,
        }
      }
      return f
    })

    // Unlink from campaigns
    const campaigns = (s.aiAdsCampaigns ?? []).map((c) =>
      c.linkedClaimIds.includes(id)
        ? {
            ...c,
            linkedClaimIds: c.linkedClaimIds.filter((cid) => cid !== id),
            updatedAtISO: now,
          }
        : c,
    )

    return {
      ...s,
      aiAdsClaims: claims.filter((c) => c.id !== id),
      aiAdsCampaigns: campaigns,
      findings,
      events: appendComplianceEvents(s, [
        createComplianceEvent(
          {
            type: "ai_ads_claim.deleted",
            entityType: "system",
            entityId: id,
            message: `Claim AI Ads șters: „${target.claimText.slice(0, 60)}…”`,
            createdAtISO: now,
            metadata: {
              findingsClosed: target.linkedFindingIds.length,
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
//   Record creative approval
// ────────────────────────────────────────────────────────────────────────────

export async function recordCreativeApproval(
  orgId: string,
  campaignId: string,
  input: RecordApprovalInput,
  actor: ComplianceEventActorInput,
): Promise<AIAdsCreativeApproval> {
  const existing = await getCampaignById(orgId, campaignId)
  if (!existing) throw new Error("Campaign not found")
  const approvedByEmail = input.approvedByEmail?.trim()
  if (!approvedByEmail || !approvedByEmail.includes("@")) {
    throw new Error("approvedByEmail required")
  }
  const creativeDescription = input.creativeDescription?.trim()
  if (!creativeDescription) {
    throw new Error("creativeDescription required")
  }

  const now = nowISO()
  const approval: AIAdsCreativeApproval = {
    id: approvalId(),
    campaignId,
    creativeAssetId: input.creativeAssetId?.trim() || undefined,
    creativeDescription,
    approvedByEmail,
    approvedAtISO: now,
    comment: input.comment?.trim() || undefined,
    prohibitedContentChecked: Boolean(input.prohibitedContentChecked),
    prohibitedContentNotes: input.prohibitedContentNotes?.trim() || undefined,
    art5Check: Boolean(input.art5Check),
    consumerLawCheck: Boolean(input.consumerLawCheck),
    ipRightsCheck: Boolean(input.ipRightsCheck),
  }

  await mutateFreshStateForOrg(orgId, (s) => {
    const approvals = [approval, ...(s.aiAdsCreativeApprovals ?? [])].slice(0, 1000)
    const campaigns = (s.aiAdsCampaigns ?? []).map((c) =>
      c.id === campaignId
        ? {
            ...c,
            approvalIds: Array.from(new Set([...c.approvalIds, approval.id])),
            updatedAtISO: now,
          }
        : c,
    )
    return {
      ...s,
      aiAdsCreativeApprovals: approvals,
      aiAdsCampaigns: campaigns,
      events: appendComplianceEvents(s, [
        createComplianceEvent(
          {
            type: "ai_ads_approval.recorded",
            entityType: "system",
            entityId: approval.id,
            message: `Aprobare creative înregistrată pentru ${existing.title} · ${approval.approvedByEmail}`,
            createdAtISO: now,
            metadata: {
              campaignId,
              art5Check: approval.art5Check,
              consumerLawCheck: approval.consumerLawCheck,
              ipRightsCheck: approval.ipRightsCheck,
            },
          },
          actor,
        ),
      ]),
    }
  })

  // Re-evaluate campaign gaps (approval may have closed creative-approval-missing rule)
  await updateCampaign(orgId, campaignId, {}, actor)

  return approval
}

// ────────────────────────────────────────────────────────────────────────────
//   Attach conversion tracking review (upsert)
// ────────────────────────────────────────────────────────────────────────────

export async function attachConversionTrackingReview(
  orgId: string,
  campaignId: string,
  input: AttachTrackingReviewInput,
  actor: ComplianceEventActorInput,
): Promise<ConversionTrackingReview> {
  const existing = await getCampaignById(orgId, campaignId)
  if (!existing) throw new Error("Campaign not found")
  if (!Array.isArray(input.methods)) {
    throw new Error("methods array required")
  }
  const methods = input.methods.filter(isTrackingMethod)
  if (methods.length === 0) {
    throw new Error("At least one valid tracking method required")
  }

  const now = nowISO()

  // Determine if this is upsert or create
  let existingReview: ConversionTrackingReview | null = null
  if (existing.conversionTrackingReviewId) {
    const state = await readState()
    existingReview =
      state.conversionTrackingReviews?.find(
        (t) => t.id === existing.conversionTrackingReviewId,
      ) ?? null
  }

  const trkBaseId = existingReview?.id ?? trackingId()
  const draft: ConversionTrackingReview = {
    id: trkBaseId,
    orgId,
    campaignId,
    methods,
    consentRequired: Boolean(input.consentRequired),
    consentRecordedHow: input.consentRecordedHow?.trim() ?? "",
    cookieList: Array.isArray(input.cookieList)
      ? input.cookieList.filter((c) => typeof c === "string" && c.trim().length > 0)
      : [],
    pixelList: Array.isArray(input.pixelList)
      ? input.pixelList.filter((p) => typeof p === "string" && p.trim().length > 0)
      : [],
    crmUploadUsed: Boolean(input.crmUploadUsed),
    crmDataCategoriesUploaded: Array.isArray(input.crmDataCategoriesUploaded)
      ? input.crmDataCategoriesUploaded.filter((c) => typeof c === "string" && c.trim().length > 0)
      : [],
    audienceMatchingPlatform: input.audienceMatchingPlatform?.trim() || undefined,
    thirdCountryTransfer: Boolean(input.thirdCountryTransfer),
    transferMechanism:
      input.transferMechanism && isTransferMechanism(input.transferMechanism)
        ? input.transferMechanism
        : undefined,
    reviewedByEmail: input.reviewedByEmail?.trim() || undefined,
    reviewedAtISO: input.reviewedByEmail ? now : undefined,
    reviewNotes: input.reviewNotes?.trim() || undefined,
    gaps: [],
    linkedFindingIds: existingReview?.linkedFindingIds ?? [],
    createdAtISO: existingReview?.createdAtISO ?? now,
    updatedAtISO: now,
  }
  draft.gaps = evaluateTrackingGaps(draft)

  // Emit findings for each gap
  const findingIds: string[] = []
  for (const gap of draft.gaps) {
    const ruleKey = `tracking-gap-${stableHash(gap)}`
    const stableId = `ai-ads-tracking-${draft.id}-${ruleKey}`
    const state = await readState()
    const existingFinding = state.findings?.find((f) =>
      f.evidenceRequired?.includes(stableId),
    )
    if (existingFinding) {
      findingIds.push(existingFinding.id)
      continue
    }
    const created = await createFinding(
      orgId,
      {
        title: `Conversion tracking gap — ${existing.title}`,
        detail: `Review tracking pentru campania „${existing.title}”: ${gap}\n\n[stable-id: ${stableId}] [tracking-${draft.id}]`,
        category: "GDPR",
        severity: "high",
        legalReference:
          "GDPR Art. 5/13/14/44-49 + ePrivacy Directive 2002/58/EC Art. 5(3)",
        remediationHint:
          "Remediază gap-ul în review (consent / mechanism / DPA / consent banner) și salvează din nou.",
        impactSummary:
          "Risc juridic HIGH GDPR + ePrivacy: amendă până la 4% cifră de afaceri (Art. 83(5) GDPR).",
        evidenceRequired: `Screenshot CMP / DPA / mechanism doc. [${stableId}]`,
        ownerSuggestion: "DPO / responsabil marketing tehnic",
        closeCondition: "Gap remediat și absent la re-evaluare tracking.",
      },
      actor,
    )
    findingIds.push(created.id)
  }
  draft.linkedFindingIds = Array.from(new Set([...draft.linkedFindingIds, ...findingIds]))

  await mutateFreshStateForOrg(orgId, (s) => {
    const reviews = s.conversionTrackingReviews ?? []
    const idx = reviews.findIndex((t) => t.id === draft.id)
    const next = idx === -1 ? [draft, ...reviews] : reviews.map((t, i) => (i === idx ? draft : t))
    const campaigns = (s.aiAdsCampaigns ?? []).map((c) =>
      c.id === campaignId
        ? { ...c, conversionTrackingReviewId: draft.id, updatedAtISO: now }
        : c,
    )
    return {
      ...s,
      conversionTrackingReviews: next.slice(0, 500),
      aiAdsCampaigns: campaigns,
      events: appendComplianceEvents(s, [
        createComplianceEvent(
          {
            type: "ai_ads_tracking_review.attached",
            entityType: "system",
            entityId: draft.id,
            message: `Conversion tracking review atașat campaniei ${existing.title} · gaps: ${draft.gaps.length}`,
            createdAtISO: now,
            metadata: {
              campaignId,
              gapsCount: draft.gaps.length,
              consentRequired: draft.consentRequired,
              thirdCountryTransfer: draft.thirdCountryTransfer,
            },
          },
          actor,
        ),
      ]),
    }
  })

  // Re-evaluate campaign (may have closed conversion-tracking-review-missing rule)
  await updateCampaign(orgId, campaignId, {}, actor)

  return draft
}

// ────────────────────────────────────────────────────────────────────────────
//   Export — full AI Ads pack markdown for an org
// ────────────────────────────────────────────────────────────────────────────

export async function buildOrgAIAdsMarkdown(
  _orgId: string,
  orgName: string,
): Promise<string> {
  const state = await readState()
  const campaigns = state.aiAdsCampaigns ?? []
  const claims = state.aiAdsClaims ?? []
  const approvals = state.aiAdsCreativeApprovals ?? []
  const trackingReviews = state.conversionTrackingReviews ?? []

  const lines: string[] = []
  lines.push(`# AI Ads Compliance Pack — ${orgName}`)
  lines.push(``)
  lines.push(
    `> AI Ads Compliance Pack: ce afirmă AI-ul despre brand, pe ce sursă, cine a aprobat, ce date au fost folosite și ce risc legal există.`,
  )
  lines.push(``)
  const summary = summarizeAIAds(campaigns, claims, approvals, trackingReviews)
  lines.push(`**Total campanii:** ${summary.totalCampaigns}`)
  lines.push(`**Campanii active:** ${summary.activeCampaigns}`)
  lines.push(`**Claims totale:** ${summary.totalClaims}`)
  lines.push(`**Claims nesubstanțiate:** ${summary.claimsUnsubstantiated}`)
  lines.push(`**Aprobări creative:** ${summary.totalApprovals}`)
  lines.push(`**Tracking reviews:** ${summary.totalTrackingReviews}`)
  lines.push(``)

  for (const c of campaigns) {
    const cClaims = claims.filter(
      (cl) => cl.campaignId === c.id || c.linkedClaimIds.includes(cl.id),
    )
    const cApprovals = approvals.filter((a) => a.campaignId === c.id)
    const tr =
      trackingReviews.find((t) => t.id === c.conversionTrackingReviewId) ??
      trackingReviews.find((t) => t.campaignId === c.id) ??
      null
    lines.push(`---`)
    lines.push(``)
    lines.push(generateAIAdsMarkdown(c, cClaims, cApprovals, tr))
  }
  return lines.join("\n")
}

// Re-export for tests / audit pack
export { generateAIAdsMarkdown, evaluateClaimRisk } from "@/lib/compliance/ai-ads-engine"
export type { ScanFinding }
