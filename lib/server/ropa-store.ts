/**
 * Sprint 008C — RoPA store (CRUD pe state.ropaActivities + reaplicare
 * `evaluateRopaDataMap` la fiecare scriere, ca sa propagam findings GDPR,
 * org-knowledge items si discovery triggers).
 *
 * Pattern: foloseste `mutateFreshStateForOrg` pentru audit-trail hash-chain.
 * Cand caller-ul transmite `emitFindings=true` (default), findings GDPR
 * candidate sunt creeate via `createFinding` din findings-store —
 * apar automat in /dashboard/resolve cu lifecycle complet.
 *
 * Surface API:
 *  - readRopaActivities(orgId)
 *  - upsertRopaActivities(orgId, activities, actor, options?)
 *  - createRopaActivity(orgId, input, actor, options?)
 *  - updateRopaActivity(orgId, id, patch, actor, options?)
 *  - deleteRopaActivity(orgId, id, actor)
 *  - evaluateRopaForOrg(orgId) -> evaluation (no save)
 *  - buildMachineReadableForOrg(orgId, orgName) -> RopaMachineReadableExport
 *  - buildMarkdownForOrg(orgId, orgName) -> string (Audit Pack)
 */

import {
  appendComplianceEvents,
  createComplianceEvent,
  type ComplianceEventActorInput,
} from "@/lib/compliance/events"
import {
  evaluateRopaDataMap,
  buildRopaMachineReadableExport,
  normalizeRopaActivityRecord,
  type RopaActivityRecord,
  type RopaDataMapEvaluation,
  type RopaMachineReadableExport,
} from "@/lib/compliance/ropa-risk-engine"
import {
  collectDiscoveryTriggers,
  mergeDiscoveryTriggers,
  normalizeDiscoveryTriggers,
} from "@/lib/compliance/discovery-trigger-orchestrator"
import {
  mergeKnowledgeItems,
  type OrgKnowledge,
} from "@/lib/compliance/org-knowledge"
import { createFinding } from "@/lib/server/findings-store"
import { mutateFreshStateForOrg, readState } from "@/lib/server/store"

// ── Types ────────────────────────────────────────────────────────────────────

export type RopaSummary = {
  total: number
  highRisk: number
  mediumRisk: number
  lowRisk: number
  missingLegalBasis: number
  missingRetention: number
  dpiaTriggers: number
  vendorReviewTriggers: number
  needingReview: number
  riskScoreAverage: number
}

export type RopaUpsertOptions = {
  emitFindings?: boolean        // default true
  emitTriggers?: boolean        // default true
  enrichKnowledge?: boolean     // default true
  acceptTriggers?: boolean      // default false (lasa needs_dpo_review)
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function nowISO(): string {
  return new Date().toISOString()
}

function uid(): string {
  return `ropa-${Math.random().toString(36).slice(2, 10)}`
}

export function summarizeRopa(
  evaluation: RopaDataMapEvaluation,
): RopaSummary {
  const scores = evaluation.activityRisks.map((r) => r.riskScore)
  const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0
  return {
    total: evaluation.summary.activityCount,
    highRisk: evaluation.summary.highRiskActivities,
    mediumRisk: evaluation.summary.mediumRiskActivities,
    lowRisk:
      evaluation.summary.activityCount -
      evaluation.summary.highRiskActivities -
      evaluation.summary.mediumRiskActivities,
    missingLegalBasis: evaluation.summary.missingLegalBasis,
    missingRetention: evaluation.summary.missingRetention,
    dpiaTriggers: evaluation.summary.dpiaTriggers,
    vendorReviewTriggers: evaluation.summary.vendorReviewTriggers,
    needingReview: evaluation.activities.filter((a) => a.status === "needs_review").length,
    riskScoreAverage: avg,
  }
}

// ── Read ─────────────────────────────────────────────────────────────────────

export async function readRopaActivities(_orgId?: string): Promise<{
  activities: RopaActivityRecord[]
  evaluation: RopaDataMapEvaluation
  summary: RopaSummary
}> {
  const state = await readState()
  const raw = (state.ropaActivities ?? []) as RopaActivityRecord[]
  const activities = raw.map((a) => normalizeRopaActivityRecord(a))
  const evaluation = evaluateRopaDataMap({ activities })
  return { activities: evaluation.activities, evaluation, summary: summarizeRopa(evaluation) }
}

export async function getRopaActivityById(
  _orgId: string,
  id: string,
): Promise<RopaActivityRecord | null> {
  const state = await readState()
  const records = (state.ropaActivities ?? []) as RopaActivityRecord[]
  return records.find((a) => a.id === id) ?? null
}

// ── Internal: re-run engine + propagate findings/knowledge/triggers ─────────

/**
 * Aplicat dupa fiecare scriere CRUD: evalueaza state-ul curent al
 * activitatilor RoPA si:
 *   1. updateaza `state.ropaActivities` cu enrichedActivities (riskLevel etc.)
 *   2. emite ScanFinding-uri GDPR pentru candidate findings (daca emitFindings)
 *   3. mergeazaz knowledge items in state.orgKnowledge (daca enrichKnowledge)
 *   4. orchestrateaza discovery triggers (daca emitTriggers)
 *
 * Returnam findingIds emise + triggerIds noi pentru audit/UI.
 */
async function propagateRopaEvaluation(
  orgId: string,
  actor: ComplianceEventActorInput,
  options: RopaUpsertOptions,
): Promise<{
  evaluation: RopaDataMapEvaluation
  emittedFindingIds: string[]
  emittedTriggerIds: string[]
}> {
  const opts: Required<RopaUpsertOptions> = {
    emitFindings: options.emitFindings !== false,
    emitTriggers: options.emitTriggers !== false,
    enrichKnowledge: options.enrichKnowledge !== false,
    acceptTriggers: options.acceptTriggers === true,
  }

  // 1) Read curent, ruleaza engine pe stare proaspata
  const state = await readState()
  const currentActivities = ((state.ropaActivities ?? []) as RopaActivityRecord[]).map((a) =>
    normalizeRopaActivityRecord(a),
  )
  const evaluation = evaluateRopaDataMap({ activities: currentActivities })

  // 2) Emite findings — facute INAINTE de mutateFreshStateForOrg pentru ca
  //    createFinding e propriul `mutateFreshStateForOrg` (cu hash chain) si
  //    ne intoarce id-ul finding-ului real (cu prefix finding-XXX).
  const emittedFindingIds: string[] = []
  if (opts.emitFindings) {
    // Skip findings deja prezente in state (dedupe pe id stabil ropa-xxx-rule)
    const existingFindingIds = new Set((state.findings ?? []).map((f) => f.id))
    // Mapping de la id stabil generat de engine -> id real finding-XXX
    const seenStableIds = new Set<string>()
    for (const candidate of evaluation.candidateFindings) {
      // Daca state-ul are deja un finding cu acest id stabil, sarim
      // (engine emite acelasi id la fiecare run pe aceeasi activitate).
      if (existingFindingIds.has(candidate.id)) continue
      if (seenStableIds.has(candidate.id)) continue
      seenStableIds.add(candidate.id)
      const created = await createFinding(
        orgId,
        {
          title: candidate.title,
          detail: candidate.detail,
          category: candidate.category,
          severity: candidate.severity,
          legalReference: candidate.legalReference,
          remediationHint: candidate.remediationHint,
          evidenceRequired: candidate.evidenceRequired,
          ownerSuggestion: "DPO",
          closeCondition: candidate.resolution?.closureEvidence,
        },
        actor,
      )
      emittedFindingIds.push(created.id)
    }
  }

  // 3) Mutate state: enriched activities + knowledge merge + triggers orchestrate
  let emittedTriggerIds: string[] = []
  await mutateFreshStateForOrg(orgId, (s) => {
    const now = nowISO()
    let nextState = s

    // 3a) Replace ropaActivities cu enriched (riskLevel/status/linkedFindings)
    nextState = {
      ...nextState,
      ropaActivities: evaluation.activities,
    }

    // 3b) Knowledge merge
    if (opts.enrichKnowledge && evaluation.knowledgeItems.length > 0) {
      const existingKnowledge: OrgKnowledge = nextState.orgKnowledge ?? {
        items: [],
        lastUpdatedAtISO: now,
      }
      const merged = mergeKnowledgeItems(existingKnowledge.items, evaluation.knowledgeItems)
      nextState = {
        ...nextState,
        orgKnowledge: { items: merged, lastUpdatedAtISO: now },
      }
    }

    // 3c) Discovery triggers — collect din ROPA + merge cu existing
    if (opts.emitTriggers && evaluation.triggers.length > 0) {
      const ropaTriggers = collectDiscoveryTriggers({
        orgId,
        nowISO: now,
        accepted: opts.acceptTriggers,
        ropaActivities: evaluation.activities,
      })
      const existingTriggers = normalizeDiscoveryTriggers(nextState.discoveryTriggers ?? [])
      const merged = mergeDiscoveryTriggers(existingTriggers, ropaTriggers, now)
      emittedTriggerIds = ropaTriggers
        .filter((t) => !existingTriggers.some((existing) => existing.id === t.id))
        .map((t) => t.id)
      nextState = { ...nextState, discoveryTriggers: merged }
    }

    // 3d) Event ledger summary entry
    const ropaEvent = createComplianceEvent(
      {
        type: "ropa.evaluated",
        entityType: "system",
        entityId: "ropa-data-map",
        message: `RoPA reevaluat — ${evaluation.activities.length} activități · ${evaluation.candidateFindings.length} candidate findings · ${evaluation.triggers.length} trigger-uri.`,
        createdAtISO: now,
        metadata: {
          activityCount: evaluation.activities.length,
          highRisk: evaluation.summary.highRiskActivities,
          mediumRisk: evaluation.summary.mediumRiskActivities,
          dpiaTriggers: evaluation.summary.dpiaTriggers,
          vendorReviewTriggers: evaluation.summary.vendorReviewTriggers,
          findingsEmittedNow: emittedFindingIds.length,
          triggersEmittedNow: emittedTriggerIds.length,
        },
      },
      actor,
    )
    nextState = {
      ...nextState,
      events: appendComplianceEvents(nextState, [ropaEvent]),
    }

    return nextState
  })

  return { evaluation, emittedFindingIds, emittedTriggerIds }
}

// ── Create ───────────────────────────────────────────────────────────────────

export async function createRopaActivity(
  orgId: string,
  input: Partial<RopaActivityRecord> & { activityName: string },
  actor: ComplianceEventActorInput,
  options: RopaUpsertOptions = {},
): Promise<{
  activity: RopaActivityRecord
  evaluation: RopaDataMapEvaluation
  emittedFindingIds: string[]
  emittedTriggerIds: string[]
}> {
  const now = nowISO()
  const activity = normalizeRopaActivityRecord(
    {
      ...input,
      id: input.id || uid(),
      createdAtISO: input.createdAtISO || now,
      updatedAtISO: now,
    },
    now,
  )

  await mutateFreshStateForOrg(orgId, (state) => {
    const records = (state.ropaActivities ?? []) as RopaActivityRecord[]
    return {
      ...state,
      ropaActivities: [activity, ...records.filter((r) => r.id !== activity.id)].slice(0, 200),
      events: appendComplianceEvents(state, [
        createComplianceEvent(
          {
            type: "ropa.activity.created",
            entityType: "system",
            entityId: activity.id,
            message: `RoPA activitate creată: ${activity.activityName}`,
            createdAtISO: now,
            metadata: {
              hasLegalBasis: Boolean(activity.legalBasis),
              hasRetention: Boolean(activity.retentionRule),
              specialCategoryCount: activity.specialCategories.length,
              processorCount: activity.processors.length,
            },
          },
          actor,
        ),
      ]),
    }
  })

  const propagated = await propagateRopaEvaluation(orgId, actor, options)
  return {
    activity: propagated.evaluation.activities.find((a) => a.id === activity.id) ?? activity,
    evaluation: propagated.evaluation,
    emittedFindingIds: propagated.emittedFindingIds,
    emittedTriggerIds: propagated.emittedTriggerIds,
  }
}

// ── Update ───────────────────────────────────────────────────────────────────

export async function updateRopaActivity(
  orgId: string,
  id: string,
  patch: Partial<RopaActivityRecord>,
  actor: ComplianceEventActorInput,
  options: RopaUpsertOptions = {},
): Promise<{
  activity: RopaActivityRecord | null
  evaluation: RopaDataMapEvaluation
  emittedFindingIds: string[]
  emittedTriggerIds: string[]
}> {
  let updated: RopaActivityRecord | null = null
  let notFound = false

  await mutateFreshStateForOrg(orgId, (state) => {
    const records = (state.ropaActivities ?? []) as RopaActivityRecord[]
    const idx = records.findIndex((r) => r.id === id)
    if (idx === -1) {
      notFound = true
      return state
    }
    const now = nowISO()
    const merged: RopaActivityRecord = normalizeRopaActivityRecord(
      {
        ...records[idx],
        ...patch,
        id,
        updatedAtISO: now,
      },
      now,
    )
    updated = merged
    const next = [...records]
    next[idx] = merged
    return {
      ...state,
      ropaActivities: next,
      events: appendComplianceEvents(state, [
        createComplianceEvent(
          {
            type: "ropa.activity.updated",
            entityType: "system",
            entityId: id,
            message: `RoPA activitate actualizată: ${merged.activityName}`,
            createdAtISO: now,
            metadata: {
              status: merged.status,
              hasLegalBasis: Boolean(merged.legalBasis),
              hasRetention: Boolean(merged.retentionRule),
            },
          },
          actor,
        ),
      ]),
    }
  })

  if (notFound) {
    const evaluation = (await readRopaActivities(orgId)).evaluation
    return { activity: null, evaluation, emittedFindingIds: [], emittedTriggerIds: [] }
  }

  const propagated = await propagateRopaEvaluation(orgId, actor, options)
  return {
    activity: propagated.evaluation.activities.find((a) => a.id === id) ?? updated,
    evaluation: propagated.evaluation,
    emittedFindingIds: propagated.emittedFindingIds,
    emittedTriggerIds: propagated.emittedTriggerIds,
  }
}

// ── Bulk upsert (paste-import) ──────────────────────────────────────────────

export async function upsertRopaActivities(
  orgId: string,
  activities: Array<Partial<RopaActivityRecord> & { activityName: string }>,
  actor: ComplianceEventActorInput,
  options: RopaUpsertOptions = {},
): Promise<{
  count: number
  evaluation: RopaDataMapEvaluation
  emittedFindingIds: string[]
  emittedTriggerIds: string[]
}> {
  const now = nowISO()
  const normalized = activities.map((a) =>
    normalizeRopaActivityRecord(
      {
        ...a,
        id: a.id || uid(),
        createdAtISO: a.createdAtISO || now,
        updatedAtISO: now,
      },
      now,
    ),
  )

  await mutateFreshStateForOrg(orgId, (state) => {
    const records = (state.ropaActivities ?? []) as RopaActivityRecord[]
    const byId = new Map(records.map((r) => [r.id, r]))
    for (const incoming of normalized) byId.set(incoming.id, incoming)
    return {
      ...state,
      ropaActivities: Array.from(byId.values()).slice(0, 200),
      events: appendComplianceEvents(state, [
        createComplianceEvent(
          {
            type: "ropa.activities.bulk_upsert",
            entityType: "system",
            entityId: "ropa-data-map",
            message: `RoPA: ${normalized.length} activități upsert prin import bulk`,
            createdAtISO: now,
            metadata: { count: normalized.length },
          },
          actor,
        ),
      ]),
    }
  })

  const propagated = await propagateRopaEvaluation(orgId, actor, options)
  return {
    count: normalized.length,
    evaluation: propagated.evaluation,
    emittedFindingIds: propagated.emittedFindingIds,
    emittedTriggerIds: propagated.emittedTriggerIds,
  }
}

// ── Delete ───────────────────────────────────────────────────────────────────

export async function deleteRopaActivity(
  orgId: string,
  id: string,
  actor: ComplianceEventActorInput,
): Promise<boolean> {
  let removed = false
  await mutateFreshStateForOrg(orgId, (state) => {
    const records = (state.ropaActivities ?? []) as RopaActivityRecord[]
    const target = records.find((r) => r.id === id)
    if (!target) return state
    removed = true
    return {
      ...state,
      ropaActivities: records.filter((r) => r.id !== id),
      events: appendComplianceEvents(state, [
        createComplianceEvent(
          {
            type: "ropa.activity.deleted",
            entityType: "system",
            entityId: id,
            message: `RoPA activitate ștearsă: ${target.activityName}`,
            createdAtISO: nowISO(),
            metadata: { activityName: target.activityName },
          },
          actor,
        ),
      ]),
    }
  })
  // Re-evaluate to update enriched + propagate trigger removal upstream;
  // emitFindings=false ca sa nu re-emiti finding-uri orfane dupa delete.
  if (removed) {
    await propagateRopaEvaluation(orgId, actor, { emitFindings: false })
  }
  return removed
}

// ── Evaluate only (no save) ─────────────────────────────────────────────────

export async function evaluateRopaForOrg(_orgId: string): Promise<{
  evaluation: RopaDataMapEvaluation
  summary: RopaSummary
}> {
  const state = await readState()
  const activities = ((state.ropaActivities ?? []) as RopaActivityRecord[]).map((a) =>
    normalizeRopaActivityRecord(a),
  )
  const evaluation = evaluateRopaDataMap({ activities })
  return { evaluation, summary: summarizeRopa(evaluation) }
}

// ── Machine-readable export ─────────────────────────────────────────────────

export async function buildMachineReadableForOrg(
  orgId: string,
  orgName?: string,
): Promise<RopaMachineReadableExport> {
  const state = await readState()
  const activities = ((state.ropaActivities ?? []) as RopaActivityRecord[]).map((a) =>
    normalizeRopaActivityRecord(a),
  )
  return buildRopaMachineReadableExport({ activities, orgId, orgName })
}

// ── Markdown export (Audit Pack) ────────────────────────────────────────────

export async function buildMarkdownForOrg(
  orgId: string,
  orgName?: string,
): Promise<string> {
  const exported = await buildMachineReadableForOrg(orgId, orgName)
  const lines: string[] = [
    `# RoPA / Data Map — ${orgName ?? "organizație"}`,
    "",
    `Schema: ${exported.schemaVersion} · Jurisdictie: ${exported.jurisdiction}`,
    `Generat: ${new Date(exported.generatedAtISO).toLocaleString("ro-RO")}`,
    `Activitati: ${exported.summary.exportedActivities} · Risc mediu: ${exported.summary.riskScoreAverage}/100`,
    "",
    "## Sumar",
    `- Total activitati: ${exported.summary.activityCount}`,
    `- Risc inalt: ${exported.summary.highRiskActivities}`,
    `- Risc mediu: ${exported.summary.mediumRiskActivities}`,
    `- Fara temei juridic: ${exported.summary.missingLegalBasis}`,
    `- Fara retentie: ${exported.summary.missingRetention}`,
    `- DPIA triggers: ${exported.summary.dpiaTriggers}`,
    `- Vendor review triggers: ${exported.summary.vendorReviewTriggers}`,
    "",
    "## Activitati",
  ]
  for (const a of exported.activities) {
    lines.push(`### ${a.name}`)
    lines.push("")
    if (a.department) lines.push(`**Departament:** ${a.department}`)
    if (a.ownerName) lines.push(`**Owner:** ${a.ownerName}`)
    lines.push(`**Scop:** ${a.purpose || "—"}`)
    lines.push(`**Temei juridic:** ${a.legalBasis || "—"}`)
    if (a.article9Condition) lines.push(`**Condiție Art. 9:** ${a.article9Condition}`)
    lines.push(`**Persoane vizate:** ${a.dataSubjects.join(", ") || "—"}`)
    lines.push(`**Categorii date:** ${a.dataCategories.join(", ") || "—"}`)
    if (a.specialCategories.length) lines.push(`**Date speciale:** ${a.specialCategories.join(", ")}`)
    lines.push(`**Destinatari:** ${a.recipients.join(", ") || "—"}`)
    lines.push(`**Procesatori:** ${a.processors.join(", ") || "—"}`)
    lines.push(`**Sisteme:** ${a.systems.join(", ") || "—"}`)
    if (a.thirdCountryTransfers.length)
      lines.push(
        `**Transferuri externe:** ${a.thirdCountryTransfers.map((t) => `${t.country}${t.mechanism ? ` (${t.mechanism})` : ""}`).join(", ")}`,
      )
    lines.push(`**Retenție:** ${a.retentionRule || "—"}`)
    lines.push(`**Măsuri securitate:** ${a.securityMeasures.join(", ") || "—"}`)
    lines.push(`**Status:** ${a.status} · **Risc:** ${a.risk.level} (${a.risk.score}/100)`)
    if (a.risk.reasons.length) {
      lines.push("**Motive risc:**")
      a.risk.reasons.forEach((r) => lines.push(`- ${r}`))
    }
    if (a.linkedAISystemIds.length) {
      lines.push(`**Sisteme AI legate:** ${a.linkedAISystemIds.join(", ")}`)
    }
    if (a.links.findings.length) {
      lines.push(`**Findings:** ${a.links.findings.join(", ")}`)
    }
    lines.push("")
  }
  return lines.join("\n")
}
