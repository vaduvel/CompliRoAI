/**
 * Sprint 012 — AI Regulatory Scope Store (DORA + NIS2 AI slice).
 *
 * Persistă `state.orgRegulatoryProfile` + expune funcții utilizate de:
 *  - `/api/ai-regulatory-scope` (GET summary + POST update profile)
 *  - vendor-review-store (wire DORA AI rules pe vendor mutations)
 *  - AI inventory route (wire NIS2 AI rules pe system mutations)
 *
 * Pattern consistent cu findings-store / dpia-store / vendor-review-store:
 *  - mutateFreshStateForOrg pentru scrieri
 *  - appendComplianceEvents + createComplianceEvent pentru ledger
 *  - findings cu id stabil (din rules engines) sunt merged idempotent via
 *    `mergeStableFindings` (deduplicate by id; doesn't replace existing
 *    findings that may have user-edited status).
 *
 * Surface API:
 *   readRegulatoryProfile(orgId): OrgRegulatoryProfile | null
 *   getRegulatoryScopeSummary(orgId): summary aggregator output
 *   updateRegulatoryProfile(orgId, patch, actor): persists + emits
 *     auto-findings dacă profile-ul devine in-scope (review-required).
 *   evaluateAndMergeDoraFindings(orgId, vendor, actor): apelat de
 *     vendor-review-store pe create/update vendor.
 *   evaluateAndMergeNis2Findings(orgId, system, actor): apelat de AI
 *     inventory route pe create/update system.
 */

import {
  appendComplianceEvents,
  createComplianceEvent,
  type ComplianceEventActorInput,
} from "@/lib/compliance/events"
import { mutateFreshStateForOrg, readState } from "@/lib/server/store"
import {
  buildRegulatoryScopeSummary,
  type RegulatoryScopeSummary,
} from "@/lib/compliance/ai-regulatory-scope"
import { evaluateDoraVendor } from "@/lib/compliance/dora-ai-rules"
import { evaluateNis2AISystem } from "@/lib/compliance/nis2-ai-rules"
import type {
  AISystemRecord,
  DoraEntityType,
  Nis2EntityClass,
  Nis2Sector,
  OrgRegulatoryProfile,
  ScanFinding,
  VendorRecord,
} from "@/lib/compliance/types"

// ── Types ────────────────────────────────────────────────────────────────────

export type UpdateRegulatoryProfileInput = {
  doraApplies?: boolean
  doraEntityType?: DoraEntityType
  doraEntityRegistrationNumber?: string
  nis2EntityClass?: Nis2EntityClass
  nis2Sectors?: Nis2Sector[]
  nis2DnscRegistrationNumber?: string
  notes?: string
}

// ── Validation helpers ───────────────────────────────────────────────────────

const VALID_DORA_TYPES: DoraEntityType[] = [
  "credit_institution",
  "payment_institution",
  "emi",
  "investment_firm",
  "insurance",
  "ucits_aifm",
  "crowdfunding",
  "crypto_casp",
  "ict_third_party",
  "not_applicable",
]

const VALID_NIS2_CLASS: Nis2EntityClass[] = ["essential", "important", "not_in_scope"]

const VALID_NIS2_SECTORS: Nis2Sector[] = [
  "energy",
  "transport",
  "banking",
  "financial_markets",
  "health",
  "drinking_water",
  "waste_water",
  "digital_infrastructure",
  "ict_service_management",
  "public_administration",
  "space",
  "postal_courier",
  "waste_management",
  "chemicals",
  "food",
  "manufacturing",
  "digital_providers",
  "research",
  "not_applicable",
]

export function isDoraEntityType(v: unknown): v is DoraEntityType {
  return typeof v === "string" && VALID_DORA_TYPES.includes(v as DoraEntityType)
}

export function isNis2EntityClass(v: unknown): v is Nis2EntityClass {
  return typeof v === "string" && VALID_NIS2_CLASS.includes(v as Nis2EntityClass)
}

export function isNis2Sector(v: unknown): v is Nis2Sector {
  return typeof v === "string" && VALID_NIS2_SECTORS.includes(v as Nis2Sector)
}

function normSectors(values: unknown): Nis2Sector[] {
  if (!Array.isArray(values)) return []
  const out: Nis2Sector[] = []
  for (const v of values) {
    if (isNis2Sector(v) && !out.includes(v)) out.push(v)
  }
  return out
}

function nowISO(): string {
  return new Date().toISOString()
}

// ── Read surface ─────────────────────────────────────────────────────────────

export async function readRegulatoryProfile(
  _orgId?: string,
): Promise<OrgRegulatoryProfile | null> {
  const state = await readState()
  return state.orgRegulatoryProfile ?? null
}

export async function getRegulatoryScopeSummary(
  _orgId?: string,
): Promise<RegulatoryScopeSummary> {
  const state = await readState()
  return buildRegulatoryScopeSummary(state)
}

// ── Stable-id finding merge (used by both DORA + NIS2 wires) ────────────────

/**
 * Merge findings cu id stabil în state.findings. Dacă id-ul există deja:
 *  - dacă finding-ul existent e `resolved` sau `dismissed`, NU îl re-deschidem
 *    (respectă deciziile utilizatorului)
 *  - altfel, lăsăm finding-ul existent (preservă status / evidence)
 * Dacă id-ul NU există → adăugăm.
 *
 * Emit un singur event "agg.compliance.events.regulatory_scope.findings_merged"
 * dacă cel puțin un finding nou a fost adăugat.
 */
async function mergeStableFindings(
  orgId: string,
  scope: "dora" | "nis2",
  newFindings: ScanFinding[],
  actor: ComplianceEventActorInput,
): Promise<{ added: number; existing: number }> {
  if (newFindings.length === 0) return { added: 0, existing: 0 }

  let added = 0
  let existingCount = 0

  await mutateFreshStateForOrg(orgId, (state) => {
    const existing = state.findings ?? []
    const existingById = new Map(existing.map((f) => [f.id, f]))
    const toAdd: ScanFinding[] = []

    for (const f of newFindings) {
      if (existingById.has(f.id)) {
        existingCount++
        continue
      }
      toAdd.push({
        ...f,
        findingStatus: "open",
        findingStatusUpdatedAtISO: f.createdAtISO,
        reviewState: "unreviewed",
      })
      added++
    }

    if (toAdd.length === 0) return state

    const event = createComplianceEvent(
      {
        type:
          scope === "dora"
            ? "regulatory_scope.dora.findings_merged"
            : "regulatory_scope.nis2.findings_merged",
        entityType: "finding",
        entityId: toAdd[0].id,
        message: `${scope === "dora" ? "DORA" : "NIS2"} AI rules: ${toAdd.length} finding nou${toAdd.length === 1 ? "" : "i"} adăugat${toAdd.length === 1 ? "" : "e"} (id stabil).`,
        createdAtISO: nowISO(),
        metadata: {
          scope,
          added: toAdd.length,
          existingDeduped: existingCount,
        },
      },
      actor,
    )

    return {
      ...state,
      findings: [...toAdd, ...existing],
      events: appendComplianceEvents(state, [event]),
    }
  })

  return { added, existing: existingCount }
}

// ── Profile update ──────────────────────────────────────────────────────────

export async function updateRegulatoryProfile(
  orgId: string,
  patch: UpdateRegulatoryProfileInput,
  actor: ComplianceEventActorInput,
): Promise<OrgRegulatoryProfile> {
  let updated: OrgRegulatoryProfile | null = null

  await mutateFreshStateForOrg(orgId, (state) => {
    const now = nowISO()
    const current = state.orgRegulatoryProfile

    const base: OrgRegulatoryProfile = current ?? {
      orgId,
      doraApplies: false,
      doraEntityType: "not_applicable",
      nis2EntityClass: "not_in_scope",
      nis2Sectors: [],
      createdAtISO: now,
      updatedAtISO: now,
    }

    const newDoraType = isDoraEntityType(patch.doraEntityType)
      ? patch.doraEntityType
      : base.doraEntityType
    const newNis2Class = isNis2EntityClass(patch.nis2EntityClass)
      ? patch.nis2EntityClass
      : base.nis2EntityClass

    const merged: OrgRegulatoryProfile = {
      ...base,
      orgId,
      doraApplies:
        typeof patch.doraApplies === "boolean"
          ? patch.doraApplies
          : base.doraApplies,
      doraEntityType: newDoraType,
      doraEntityRegistrationNumber:
        patch.doraEntityRegistrationNumber === undefined
          ? base.doraEntityRegistrationNumber
          : patch.doraEntityRegistrationNumber?.trim() || undefined,
      nis2EntityClass: newNis2Class,
      nis2Sectors:
        patch.nis2Sectors === undefined
          ? base.nis2Sectors
          : normSectors(patch.nis2Sectors),
      nis2DnscRegistrationNumber:
        patch.nis2DnscRegistrationNumber === undefined
          ? base.nis2DnscRegistrationNumber
          : patch.nis2DnscRegistrationNumber?.trim() || undefined,
      notes: patch.notes === undefined ? base.notes : (patch.notes?.trim() || undefined),
      declaredByEmail: actor.label,
      declaredAtISO: now,
      updatedAtISO: now,
    }

    // Coherence: dacă DORA aplica și doraApplies devine false, resetăm tipul.
    if (!merged.doraApplies && merged.doraEntityType !== "not_applicable") {
      merged.doraEntityType = "not_applicable"
    }
    // Coherence: dacă NIS2 nu se aplică, golim sectoare.
    if (merged.nis2EntityClass === "not_in_scope") {
      merged.nis2Sectors = []
    }

    updated = merged

    return {
      ...state,
      orgRegulatoryProfile: merged,
      events: appendComplianceEvents(state, [
        createComplianceEvent(
          {
            type: "org.regulatory_profile.updated",
            entityType: "system",
            entityId: orgId,
            message: `Profil regulator actualizat: DORA=${merged.doraApplies ? merged.doraEntityType : "—"} · NIS2=${merged.nis2EntityClass}`,
            createdAtISO: now,
            metadata: {
              doraApplies: merged.doraApplies,
              doraEntityType: merged.doraEntityType,
              nis2EntityClass: merged.nis2EntityClass,
              sectorCount: merged.nis2Sectors.length,
            },
          },
          actor,
        ),
      ]),
    }
  })

  if (!updated) throw new Error("updateRegulatoryProfile: mutator did not produce a profile")
  const finalProfile: OrgRegulatoryProfile = updated

  // Emit "review required" findings când orgul intră (sau rămâne) în scope.
  // ID-uri stabile: doar 1 review-finding per scope; merge dedup.
  const reviewFindings: ScanFinding[] = []
  const now = nowISO()
  if (finalProfile.doraApplies && finalProfile.doraEntityType !== "not_applicable") {
    reviewFindings.push({
      id: "dora-ai-vendor-REVIEW_REQUIRED",
      title: "DORA aplicabil — revizuiește vendorii materiali",
      detail: [
        "Organizația a declarat că DORA (Reg UE 2022/2554) se aplică.",
        "",
        "Acțiune: în /dashboard/vendor-review marchează vendorii ICT materiali pentru serviciile financiare (doraScope.material = true). Motorul DORA AI va emite findings automat pentru fiecare gap (Art. 28-30 ICT contract, Art. 19 SLA incident, exit strategy etc.).",
      ].join("\n"),
      category: "EU_AI_ACT",
      severity: "medium",
      risk: "low",
      principles: ["accountability", "oversight"],
      createdAtISO: now,
      sourceDocument: "Profil regulator org",
      legalReference: "Reg (UE) 2022/2554 (DORA) Art. 28",
      remediationHint:
        "Deschide /dashboard/vendor-review, expandează fiecare vendor ICT și bifează DORA scope.material dacă vendorul e material pentru serviciul financiar.",
      evidenceRequired: "Listă vendori cu doraScope.material setat + assessment notes.",
      ownerSuggestion: "DPO / CISO",
    })
  }
  if (finalProfile.nis2EntityClass !== "not_in_scope") {
    reviewFindings.push({
      id: "nis2-ai-system-REVIEW_REQUIRED",
      title: "NIS2 aplicabil — clasifică sistemele AI în scope",
      detail: [
        `Organizația a declarat că NIS2 se aplică ca entitate ${finalProfile.nis2EntityClass === "essential" ? "esențială" : "importantă"}.`,
        "",
        "Acțiune: în /dashboard/sisteme marchează sistemele AI care susțin un serviciu esențial/important (nis2EntityScope.inScope = true). Motorul NIS2 AI va emite findings pentru fiecare gap (Art. 21 măsuri, Art. 23 incident escalation, logging, supply-chain).",
      ].join("\n"),
      category: "NIS2",
      severity: "medium",
      risk: "low",
      principles: ["robustness", "oversight"],
      createdAtISO: now,
      sourceDocument: "Profil regulator org",
      legalReference: "Directiva (UE) 2022/2555 (NIS2) Art. 21",
      remediationHint:
        "Deschide /dashboard/sisteme, expandează fiecare sistem AI și bifează NIS2 scope.inScope dacă susține serviciul esențial/important.",
      evidenceRequired:
        "Listă AI systems cu nis2EntityScope.inScope setat + serviciu menționat.",
      ownerSuggestion: "CISO / DPO",
    })
  }
  await mergeStableFindings(orgId, "dora", reviewFindings, actor)

  return finalProfile
}

// ── Wire functions (called by vendor-review-store / AI inventory) ───────────

/**
 * Wire DORA AI rules pentru un vendor după create/update. Apelată din
 * vendor-review-store dacă orgul are DORA aplicabil și vendor.doraScope
 * .material = true. Returnează nr findings adăugate.
 */
export async function evaluateAndMergeDoraFindings(
  orgId: string,
  vendor: VendorRecord,
  actor: ComplianceEventActorInput,
): Promise<{ added: number; existing: number; gaps: string[] }> {
  const profile = await readRegulatoryProfile(orgId)
  if (!profile) return { added: 0, existing: 0, gaps: [] }
  const result = evaluateDoraVendor(vendor, profile)
  const { added, existing } = await mergeStableFindings(
    orgId,
    "dora",
    result.findings,
    actor,
  )
  return { added, existing, gaps: result.gaps }
}

/**
 * Wire NIS2 AI rules pentru un sistem după create/update.
 */
export async function evaluateAndMergeNis2Findings(
  orgId: string,
  system: AISystemRecord,
  actor: ComplianceEventActorInput,
): Promise<{ added: number; existing: number; gaps: string[] }> {
  const profile = await readRegulatoryProfile(orgId)
  if (!profile) return { added: 0, existing: 0, gaps: [] }
  const result = evaluateNis2AISystem(system, profile)
  const { added, existing } = await mergeStableFindings(
    orgId,
    "nis2",
    result.findings,
    actor,
  )
  return { added, existing, gaps: result.gaps }
}
