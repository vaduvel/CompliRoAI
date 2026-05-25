import { getImmediateNextSteps } from "./role-classifier"
import { scanState } from "./preventive-scanner"
import {
  buildAIProjectProfiles,
  getObligationTemplatesForProject,
  type GuidanceOwnerRole,
} from "./ai-project-foundation"
import type {
  AIActRole,
  ComplianceState,
  PreventiveAction,
  ScanFinding,
} from "./types"
import type { ComplianceSeverity } from "./constitution"
import type { WorkspaceMode } from "@/lib/server/auth"

export type GuidanceActionSource = "finding" | "preventive" | "role" | "obligation"

export type GuidancePriority = "P0" | "P1" | "P2" | "P3"

export type GuidanceAction = {
  id: string
  rank: number
  source: GuidanceActionSource
  sourceIds: string[]
  title: string
  why: string
  suggestedAction: string
  suggestedOwner: GuidanceOwnerRole
  targetHref: string
  severity: ComplianceSeverity
  priority: GuidancePriority
  legalReferences: string[]
  evidenceRequired: string[]
  dueAtISO?: string
  estimatedMinutes?: number
  omittedReason?: string
}

export type GuidancePlanCoverage = {
  shown: number
  omitted: number
  totalCandidates: number
}

export type GuidancePlan = {
  id: string
  headline: string
  generatedAtISO: string
  orgName: string
  workspaceMode: WorkspaceMode
  modelLabel: "deterministic" | "mistral-assisted"
  promptVersion: "v1.2"
  confidence: "high" | "medium" | "low"
  summary: string
  guardrails: string[]
  actions: GuidanceAction[]
  omittedActions: GuidanceAction[]
  coverage: GuidancePlanCoverage
  stats: {
    openFindingsCount: number
    criticalFindingsCount: number
    preventiveActionsCount: number
    aiSystemsCount: number
    projectsWithEvidenceGaps: number
  }
  fingerprint: string
}

export type GuidancePlanDiff = {
  added: GuidanceAction[]
  removed: GuidanceAction[]
  stayed: GuidanceAction[]
  reprioritized: Array<{
    id: string
    title: string
    previousRank: number
    currentRank: number
  }>
  summary: string
}

export type BuildGuidancePlanInput = {
  state: ComplianceState
  workspaceMode: WorkspaceMode
  orgName: string
  nowISO?: string
  maxActions?: number
}

const DEFAULT_MAX_ACTIONS = 4

const GUARDRAILS = [
  "AI-ul nu execută acțiuni și nu închide findings automat.",
  "Planul citează doar surse existente în state, coverage matrix sau engines deterministe.",
  "Mistral poate formula explicații, dar Compliance Gate / Preventive Engine / findings câștigă verdictul.",
]

export function buildGuidancePlan(input: BuildGuidancePlanInput): GuidancePlan {
  const nowISO = input.nowISO ?? new Date().toISOString()
  const maxActions = Math.max(1, input.maxActions ?? DEFAULT_MAX_ACTIONS)
  const operationalCandidates = [
    ...findingCandidates(input.state),
    ...preventiveCandidates(input.state, nowISO),
    ...obligationCandidates(input.state),
  ]
  const candidates = dedupeCandidates([
    ...operationalCandidates,
    ...(operationalCandidates.length < maxActions
      ? roleCandidates(input.state, input.workspaceMode)
      : []),
  ])
  const ranked = candidates
    .sort(compareCandidates)
    .map((candidate, index) => ({ ...candidate, rank: index + 1 }))
  const actions = ranked.slice(0, maxActions)
  const omittedActions = ranked.slice(maxActions).map((action) => ({
    ...action,
    omittedReason: buildOmittedReason(action, actions.length, ranked.length),
  }))
  const openFindings = openFindingsOnly(input.state.findings ?? [])
  const aiProjects = buildAIProjectProfiles(input.state)
  const plan: Omit<GuidancePlan, "fingerprint" | "id"> = {
    headline: `Plan de lucru AI${input.orgName ? ` · ${input.orgName}` : ""}`,
    generatedAtISO: nowISO,
    orgName: input.orgName,
    workspaceMode: input.workspaceMode,
    modelLabel: "deterministic",
    promptVersion: "v1.2",
    confidence: confidenceFor(actions, omittedActions),
    summary: buildSummary(actions, omittedActions),
    guardrails: GUARDRAILS,
    actions,
    omittedActions,
    coverage: {
      shown: actions.length,
      omitted: omittedActions.length,
      totalCandidates: ranked.length,
    },
    stats: {
      openFindingsCount: openFindings.length,
      criticalFindingsCount: openFindings.filter((f) => f.severity === "critical").length,
      preventiveActionsCount: scanState(input.state, nowISO).length,
      aiSystemsCount: input.state.aiSystems?.length ?? 0,
      projectsWithEvidenceGaps: aiProjects.filter((p) => p.evidenceGaps.length > 0).length,
    },
  }
  const fingerprint = stableFingerprint({
    actions: actions.map((a) => [a.id, a.rank, a.severity, a.legalReferences]),
    omitted: omittedActions.map((a) => a.id),
    stats: plan.stats,
  })

  return {
    ...plan,
    id: `guidance-${fingerprint}`,
    fingerprint,
  }
}

export function explainOmittedAction(plan: GuidancePlan, actionId: string): string {
  const action = plan.omittedActions.find((a) => a.id === actionId)
  if (!action) return "Acțiunea nu este în lista de omisiuni a planului curent."
  return (
    action.omittedReason ??
    `Nu apare în planul scurt pentru că primele ${plan.actions.length} acțiuni au prioritate mai mare. O vezi în planul complet.`
  )
}

export function diffGuidancePlans(previous: GuidancePlan, current: GuidancePlan): GuidancePlanDiff {
  const previousAll = [...previous.actions, ...previous.omittedActions]
  const currentAll = [...current.actions, ...current.omittedActions]
  const previousById = new Map(previousAll.map((a) => [a.id, a]))
  const currentById = new Map(currentAll.map((a) => [a.id, a]))

  const added = currentAll.filter((a) => !previousById.has(a.id))
  const removed = previousAll.filter((a) => !currentById.has(a.id))
  const stayed = currentAll.filter((a) => previousById.has(a.id))
  const reprioritized = stayed.flatMap((action) => {
    const before = previousById.get(action.id)
    if (!before || before.rank === action.rank) return []
    return [{
      id: action.id,
      title: action.title,
      previousRank: before.rank,
      currentRank: action.rank,
    }]
  })

  return {
    added,
    removed,
    stayed,
    reprioritized,
    summary: `${added.length} adăugat(e), ${removed.length} scos(e), ${reprioritized.length} reprioritizat(e).`,
  }
}

function findingCandidates(state: ComplianceState): GuidanceAction[] {
  return openFindingsOnly(state.findings ?? []).map((finding) => {
    const legalReferences = referencesFromFinding(finding)
    return {
      id: `guidance-finding-${finding.id}`,
      rank: 0,
      source: "finding",
      sourceIds: [finding.id],
      title: finding.title,
      why: finding.impactSummary || finding.detail,
      suggestedAction:
        finding.resolution?.action || finding.remediationHint || "Deschide finding-ul și atașează dovada cerută.",
      suggestedOwner: normalizeOwner(finding.ownerSuggestion),
      targetHref: `/dashboard/resolve?finding=${encodeURIComponent(finding.id)}`,
      severity: finding.severity,
      priority: priorityForSeverity(finding.severity),
      legalReferences,
      evidenceRequired: splitEvidence(finding.evidenceRequired || finding.closeCondition),
      estimatedMinutes: estimateMinutes(finding.severity),
    }
  })
}

function preventiveCandidates(state: ComplianceState, nowISO: string): GuidanceAction[] {
  return scanState(state, nowISO).map((action) => ({
    id: `guidance-preventive-${action.id}`,
    rank: 0,
    source: "preventive",
    sourceIds: [action.id],
    title: action.entityLabel,
    why: `Engine preventiv: ${action.recommendedAction}`,
    suggestedAction: action.recommendedAction,
    suggestedOwner: ownerForPreventive(action),
    targetHref: targetForPreventive(action),
    severity: severityForUrgency(action.urgency),
    priority: priorityForUrgency(action.urgency),
    legalReferences: referencesForPreventive(action),
    evidenceRequired: evidenceForPreventive(action),
    dueAtISO: action.dueDateISO,
    estimatedMinutes: action.urgency === "critical" || action.urgency === "overdue" ? 12 : 20,
  }))
}

function obligationCandidates(state: ComplianceState): GuidanceAction[] {
  return buildAIProjectProfiles(state).flatMap((project) =>
    getObligationTemplatesForProject(project)
      .filter((template) => {
        if (template.id === "art-14-human-oversight" && project.hasHumanReview) return false
        return true
      })
      .map((template) => ({
        id: `guidance-obligation-${project.id}-${template.id}`,
        rank: 0,
        source: "obligation" as const,
        sourceIds: [project.id, template.id],
        title: `${template.title} · ${project.name}`,
        why: `${project.name} este ${project.aiActRole} cu risc ${project.riskClass}; ${template.description}`,
        suggestedAction: template.actionTemplate,
        suggestedOwner: template.ownerRole,
        targetHref: template.targetHref,
        severity: severityForProjectObligation(project.riskClass, template.article),
        priority: project.riskClass === "high" ? "P1" : "P2",
        legalReferences: [template.article],
        evidenceRequired: template.evidenceRequired,
        estimatedMinutes: project.riskClass === "high" ? 18 : 12,
      }))
  )
}

function roleCandidates(state: ComplianceState, workspaceMode: WorkspaceMode): GuidanceAction[] {
  const role = roleForGuidance(state.roleAssessment?.primaryRole, workspaceMode)
  return getImmediateNextSteps(role).map((step, index) => ({
    id: `guidance-role-${role}-${index + 1}`,
    rank: 0,
    source: "role",
    sourceIds: [role],
    title: step,
    why: state.roleAssessment?.reasoning || `Pas recomandat pentru rolul ${role}.`,
    suggestedAction: step,
    suggestedOwner: role === "provider" ? "Product" : "DPO",
    targetHref: targetForRoleStep(step),
    severity: "medium",
    priority: "P2",
    legalReferences: state.roleAssessment?.applicableArticles?.slice(0, 2) ?? [],
    evidenceRequired: ["confirmare responsabil", "dovadă execuție în modulul aferent"],
    estimatedMinutes: 15,
  }))
}

function openFindingsOnly(findings: ScanFinding[]): ScanFinding[] {
  return findings.filter((finding) => {
    const status = finding.findingStatus ?? "open"
    const review = finding.reviewState
    return status === "open" || status === "confirmed" || review === "unreviewed"
  })
}

function referencesFromFinding(finding: ScanFinding): string[] {
  const refs = new Set<string>()
  if (finding.legalReference) refs.add(finding.legalReference)
  for (const mapping of finding.legalMappings ?? []) {
    if (mapping.article) refs.add(`${mapping.regulation} ${mapping.article}`)
  }
  return [...refs]
}

function splitEvidence(value: string | undefined): string[] {
  if (!value) return []
  return value
    .split(/[;,\n]+|\s+și\s+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function normalizeOwner(value: string | undefined): GuidanceOwnerRole {
  const raw = (value ?? "").toLowerCase()
  if (raw.includes("jur") || raw.includes("legal")) return "Legal"
  if (raw.includes("it") || raw.includes("ciso") || raw.includes("security")) return "IT"
  if (raw.includes("prod")) return "Product"
  if (raw.includes("marketing")) return "Marketing"
  if (raw.includes("management") || raw.includes("owner")) return "Management"
  if (raw.includes("cabinet")) return "Cabinet"
  return "DPO"
}

function ownerForPreventive(action: PreventiveAction): GuidanceOwnerRole {
  if (action.entityType === "logging" || action.entityType === "ai_incident") return "IT"
  if (action.entityType === "pmm" || action.entityType === "qms") return "Product"
  if (action.entityType === "ai_ads_campaign" || action.entityType === "ai_ads_claim") return "Marketing"
  if (action.entityType === "fria") return "Legal"
  return "DPO"
}

function targetForPreventive(action: PreventiveAction): string {
  switch (action.entityType) {
    case "dpia":
      return "/dashboard/dpia"
    case "fria":
      return "/dashboard/fria"
    case "oversight":
      return "/dashboard/human-oversight"
    case "logging":
      return "/dashboard/logging-evidence"
    case "pmm":
      return "/dashboard/post-market-monitoring"
    case "vendor":
      return "/dashboard/vendor-review"
    case "qms":
      return "/dashboard/qms"
    case "transparency":
    case "content_asset":
      return "/dashboard/transparency"
    case "dsar":
      return "/dashboard/dsar"
    case "breach":
      return "/dashboard/breach"
    case "ai_incident":
      return "/dashboard/ai-incidents"
    case "approval":
      return "/dashboard/approvals"
    case "legislative_change":
      return "/dashboard/preventive"
    case "audit_pack":
      return "/dashboard/audit-pack"
    case "ai_ads_campaign":
    case "ai_ads_claim":
      return "/dashboard/ai-ads"
    case "ai_system":
    default:
      return "/dashboard/resolve"
  }
}

function referencesForPreventive(action: PreventiveAction): string[] {
  switch (action.entityType) {
    case "dpia":
      return ["GDPR Art. 35"]
    case "fria":
      return ["AI Act Art. 27"]
    case "oversight":
      return ["AI Act Art. 14"]
    case "logging":
      return ["AI Act Art. 12", "AI Act Art. 26(6)"]
    case "pmm":
      return ["AI Act Art. 72"]
    case "qms":
      return ["AI Act Art. 17"]
    case "vendor":
      return ["GDPR Art. 28"]
    case "transparency":
    case "content_asset":
      return ["AI Act Art. 50"]
    case "ai_incident":
      return ["AI Act Art. 73"]
    case "breach":
      return ["GDPR Art. 33-34"]
    case "dsar":
      return ["GDPR Art. 12-22"]
    case "ai_ads_campaign":
    case "ai_ads_claim":
      return ["AI Act Art. 50", "Directive 2005/29/EC"]
    case "legislative_change":
      return ["EU AI Act coverage matrix"]
    default:
      return ["EU AI Act"]
  }
}

function evidenceForPreventive(action: PreventiveAction): string[] {
  if (action.notes) return [action.notes]
  if (action.entityType === "dpia") return ["DPIA revizuită", "măsuri actualizate", "aprobare risc rezidual"]
  if (action.entityType === "vendor") return ["DPA actualizat", "sub-procesatori", "transfer mechanism"]
  return ["dovadă execuție", "notă responsabil", "timestamp audit log"]
}

function severityForUrgency(urgency: PreventiveAction["urgency"]): ComplianceSeverity {
  if (urgency === "critical" || urgency === "overdue") return "critical"
  if (urgency === "due_soon") return "high"
  if (urgency === "watch") return "medium"
  return "low"
}

function priorityForUrgency(urgency: PreventiveAction["urgency"]): GuidancePriority {
  if (urgency === "critical" || urgency === "overdue") return "P0"
  if (urgency === "due_soon") return "P1"
  if (urgency === "watch") return "P2"
  return "P3"
}

function priorityForSeverity(severity: ComplianceSeverity): GuidancePriority {
  if (severity === "critical") return "P0"
  if (severity === "high") return "P1"
  if (severity === "medium") return "P2"
  return "P3"
}

function severityForProjectObligation(
  riskClass: string,
  article: string,
): ComplianceSeverity {
  if (/Art\. 53-55/.test(article)) return "high"
  if (
    riskClass === "high" &&
    /Art\. 10|Art\. 11|Art\. 12|Art\. 13|Art\. 14|Art\. 15|Art\. 17|Art\. 23-25|Art\. 27|Art\. 47|Art\. 86/.test(article)
  ) {
    return "high"
  }
  if (riskClass === "high") return "medium"
  return "medium"
}

function roleForGuidance(role: AIActRole | undefined, mode: WorkspaceMode): Exclude<AIActRole, "mixed" | "exempt"> {
  if (role === "provider" || role === "deployer" || role === "importer" || role === "distributor" || role === "manufacturer") {
    return role
  }
  if (mode === "ai-builder") return "provider"
  return "deployer"
}

function targetForRoleStep(step: string): string {
  const lower = step.toLowerCase()
  if (lower.includes("annex")) return "/dashboard/sisteme/eu-db-wizard"
  if (lower.includes("database")) return "/dashboard/sisteme/eu-db-wizard"
  if (lower.includes("fria")) return "/dashboard/fria"
  if (lower.includes("literacy")) return "/dashboard/literacy"
  if (lower.includes("logging")) return "/dashboard/logging-evidence"
  if (lower.includes("pmm") || lower.includes("post-market")) return "/dashboard/post-market-monitoring"
  if (lower.includes("vendor")) return "/dashboard/vendor-review"
  return "/dashboard/resolve"
}

function compareCandidates(a: GuidanceAction, b: GuidanceAction): number {
  const severityDelta = severityRank(b.severity) - severityRank(a.severity)
  if (severityDelta !== 0) return severityDelta
  const priorityDelta = priorityRank(a.priority) - priorityRank(b.priority)
  if (priorityDelta !== 0) return priorityDelta
  const dueDelta = dueRank(a.dueAtISO) - dueRank(b.dueAtISO)
  if (dueDelta !== 0) return dueDelta
  const sourceDelta = sourceRank(a.source) - sourceRank(b.source)
  if (sourceDelta !== 0) return sourceDelta
  return a.title.localeCompare(b.title, "ro")
}

function dueRank(dueAtISO: string | undefined): number {
  if (!dueAtISO) return Number.MAX_SAFE_INTEGER
  const dueAt = new Date(dueAtISO).getTime()
  return Number.isFinite(dueAt) ? dueAt : Number.MAX_SAFE_INTEGER
}

function severityRank(severity: ComplianceSeverity): number {
  if (severity === "critical") return 4
  if (severity === "high") return 3
  if (severity === "medium") return 2
  return 1
}

function priorityRank(priority: GuidancePriority): number {
  if (priority === "P0") return 0
  if (priority === "P1") return 1
  if (priority === "P2") return 2
  return 3
}

function sourceRank(source: GuidanceActionSource): number {
  if (source === "finding") return 0
  if (source === "preventive") return 1
  if (source === "obligation") return 2
  return 3
}

function dedupeCandidates(candidates: GuidanceAction[]): GuidanceAction[] {
  const deduped = new Map<string, GuidanceAction>()
  for (const candidate of candidates) {
    const key = semanticCandidateKey(candidate)
    const existing = deduped.get(key)
    deduped.set(key, existing ? mergeGuidanceCandidate(existing, candidate) : candidate)
  }
  return [...deduped.values()]
}

function semanticCandidateKey(candidate: GuidanceAction): string {
  return [
    normalizeForDedupe(candidate.title),
    normalizeForDedupe(candidate.suggestedAction),
    normalizeForDedupe(candidate.legalReferences.slice().sort().join("|")),
  ].join("::")
}

function mergeGuidanceCandidate(a: GuidanceAction, b: GuidanceAction): GuidanceAction {
  const preferred = compareCandidates(a, b) <= 0 ? a : b
  const sourceIds = uniqueStrings([...a.sourceIds, ...b.sourceIds])
  return {
    ...preferred,
    sourceIds,
    legalReferences: uniqueStrings([...a.legalReferences, ...b.legalReferences]),
    evidenceRequired: uniqueStrings([...a.evidenceRequired, ...b.evidenceRequired]),
    dueAtISO: earliestDueAt(a.dueAtISO, b.dueAtISO),
    why: withConsolidationNote(preferred.why, sourceIds.length),
  }
}

function normalizeForDedupe(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
}

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const value of values) {
    const normalized = normalizeForDedupe(value)
    if (!normalized || seen.has(normalized)) continue
    seen.add(normalized)
    result.push(value)
  }
  return result
}

function earliestDueAt(a: string | undefined, b: string | undefined): string | undefined {
  if (!a) return b
  if (!b) return a
  return dueRank(a) <= dueRank(b) ? a : b
}

function withConsolidationNote(why: string, sourceCount: number): string {
  const clean = why.replace(/\s+\(\d+ surse consolidate\.\)$/u, "")
  if (sourceCount <= 1) return clean
  return `${clean} (${sourceCount} surse consolidate.)`
}

function buildOmittedReason(action: GuidanceAction, shown: number, total: number): string {
  return (
    `Nu apare în planul scurt pentru că primele ${shown} acțiuni au prioritate mai mare ` +
    `din ${total} candidate. Rămâne în planul complet și se poate promova automat după rezolvare.`
  )
}

function confidenceFor(actions: GuidanceAction[], omitted: GuidanceAction[]): GuidancePlan["confidence"] {
  if (actions.some((a) => a.legalReferences.length === 0)) return "medium"
  if (omitted.length > actions.length * 2) return "medium"
  return "high"
}

function buildSummary(actions: GuidanceAction[], omitted: GuidanceAction[]): string {
  const critical = actions.filter((a) => a.severity === "critical").length
  if (actions.length === 0) return "Nu există acțiuni urgente. Monitorizarea rămâne activă."
  return `${actions.length} acțiuni prioritizate (${critical} critice), ${omitted.length} în planul complet.`
}

function estimateMinutes(severity: ComplianceSeverity): number {
  if (severity === "critical") return 7
  if (severity === "high") return 12
  if (severity === "medium") return 18
  return 24
}

function stableFingerprint(input: unknown): string {
  const value = JSON.stringify(input)
  let hash = 2166136261
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(16).padStart(8, "0")
}
