import { createHash } from "node:crypto"

import type { GuidanceOwnerRole } from "@/lib/compliance/ai-project-foundation"
import type {
  GuidanceAction,
  GuidancePlan,
  GuidancePriority,
} from "@/lib/compliance/guidance-orchestrator"
import { LEGAL_SOURCE_REGISTRY } from "@/lib/compliance/orchestrator-knowledge-governance"
import type { ComplianceState } from "@/lib/compliance/types"
import type { WorkspaceMode } from "@/lib/server/auth"

import { runComplianceOrchestrator, type ComplianceOrchestratorRunResult } from "./run"
import type { MistralOrchestratorRequest } from "./mistral-client"
import type {
  OrchestratorEvidenceRequest,
  OrchestratorExportBlocker,
  OrchestratorOwnerRole,
  OrchestratorProposedFinding,
  OrchestratorReviewTask,
} from "./types"

type BuildGuidancePlanFromOrchestratorInput = {
  orgId: string
  orgName: string
  workspaceMode: WorkspaceMode
  state: ComplianceState
  user: {
    id: string
    role?: string
  }
  nowISO?: string
  maxActions?: number
  preferMistral?: boolean
  mistral?: Pick<MistralOrchestratorRequest, "model" | "timeoutMs" | "maxTokens">
}

export async function buildGuidancePlanFromOrchestrator(
  input: BuildGuidancePlanFromOrchestratorInput,
): Promise<GuidancePlan> {
  const result = await runComplianceOrchestrator({
    orgId: input.orgId,
    workspaceMode: toOrchestratorWorkspaceMode(input.workspaceMode),
    user: {
      id: input.user.id,
      role: input.user.role ?? defaultPlannerRole(input.workspaceMode),
    },
    state: input.state,
    ragSourceIds: LEGAL_SOURCE_REGISTRY.map((source) => source.id),
    mistral: input.preferMistral && process.env.NODE_ENV !== "test"
      ? input.mistral
      : { apiKey: "" },
  })

  return orchestratorResultToGuidancePlan({
    result,
    orgName: input.orgName,
    workspaceMode: input.workspaceMode,
    state: input.state,
    nowISO: input.nowISO,
    maxActions: input.maxActions,
  })
}

export function orchestratorResultToGuidancePlan(input: {
  result: ComplianceOrchestratorRunResult
  orgName: string
  workspaceMode: WorkspaceMode
  state: ComplianceState
  nowISO?: string
  maxActions?: number
}): GuidancePlan {
  const nowISO = input.nowISO ?? new Date().toISOString()
  const maxActions = Math.max(1, input.maxActions ?? 4)
  const proposal = input.result.proposal
  const activeFindingIds = new Set(
    (input.state.findings ?? [])
      .filter((finding) => isFindingActionable(finding.findingStatus, finding.reviewState))
      .map((finding) => finding.id),
  )
  const candidateActions = uniquifyActionIds(dedupeActions([
    ...proposal.proposedFindings.filter((finding) => isLinkedFindingActionable(finding.linkedEntityType, finding.linkedEntityId, activeFindingIds)).map(toFindingAction),
    ...proposal.evidenceRequests.filter((request) => isLinkedFindingActionable(request.linkedEntityType, request.linkedEntityId, activeFindingIds)).map(toEvidenceAction),
    ...proposal.reviewTasks.filter((task) => isLinkedFindingActionable(task.linkedEntityType, task.linkedEntityId, activeFindingIds)).map(toReviewTaskAction),
    ...proposal.exportBlockers.map(toExportBlockerAction),
    ...proposal.clientQuestions.map((question) => toQuestionAction(question.code, question.question, question.ownerRole)),
    ...proposal.nextActions.map(toNextAction),
  ]))
    .sort(compareActions)
    .map((action, index) => ({ ...action, rank: index + 1 }))

  const actions = candidateActions.slice(0, maxActions)
  const omittedActions = candidateActions.slice(maxActions).map((action) => ({
    ...action,
    omittedReason:
      action.omittedReason ??
      `Nu apare în planul scurt pentru că primele ${maxActions} acțiuni au prioritate mai mare. Rămâne în planul complet.`,
  }))
  const criticalFindingsCount = (input.state.findings ?? []).filter((finding) => finding.severity === "critical").length
  const summary = `${actions.length} acțiuni prioritizate (${criticalFindingsCount} critice), ${omittedActions.length} în planul complet.`

  return {
    id: `guidance-${fingerprintProposal(proposal, input.result.source)}`,
    headline: `Plan de lucru AI${input.orgName ? ` · ${input.orgName}` : ""}`,
    generatedAtISO: nowISO,
    orgName: input.orgName,
    workspaceMode: input.workspaceMode,
    modelLabel: input.result.source === "mistral_rag" ? "mistral-assisted" : "deterministic",
    promptVersion: "v1.2",
    confidence: confidenceFor(input.result, actions, input.state),
    summary,
    guardrails: [
      "AI-ul nu execută acțiuni și nu aprobă nimic automat.",
      "EU AI Act și GDPR rămân sursa de adevăr juridic; planul coordonează munca, nu dă verdict final.",
      "AI-ul poate propune pași și texte de lucru, dar omul atașează dovezile, verifică și aprobă.",
    ],
    actions,
    omittedActions,
    coverage: {
      shown: actions.length,
      omitted: omittedActions.length,
      totalCandidates: candidateActions.length,
    },
    stats: {
      openFindingsCount:
        input.state.findings?.filter(
          (finding) => isFindingActionable(finding.findingStatus, finding.reviewState)
        ).length ?? 0,
      criticalFindingsCount,
      preventiveActionsCount: proposal.exportBlockers.length + proposal.reviewTasks.length,
      aiSystemsCount: input.state.aiSystems?.length ?? 0,
      projectsWithEvidenceGaps: proposal.evidenceRequests.length,
    },
    fingerprint: fingerprintProposal(proposal, `${input.result.source}-${input.result.inputSnapshotHash}`),
  }
}

function isFindingActionable(
  findingStatus: string | undefined,
  reviewState: string | undefined,
): boolean {
  const status = findingStatus ?? "open"
  if (status === "resolved" || status === "dismissed" || status === "under_monitoring") return false
  if (reviewState === "closed" || reviewState === "monitoring") return false
  return status === "open" || status === "confirmed" || reviewState === "unreviewed" || reviewState === "evidence_attached"
}

function isLinkedFindingActionable(
  linkedEntityType: string | undefined,
  linkedEntityId: string | undefined,
  activeFindingIds: Set<string>,
): boolean {
  if (linkedEntityType !== "finding" || !linkedEntityId) return true
  return activeFindingIds.has(linkedEntityId)
}

function toFindingAction(finding: OrchestratorProposedFinding): GuidanceAction {
  const linkedId = finding.linkedEntityType === "finding" && finding.linkedEntityId ? finding.linkedEntityId : finding.code
  const priority = priorityFromSeverity(finding.severity)
  return {
    id: `guidance-finding-${linkedId}`,
    rank: 0,
    source: "finding",
    sourceIds: compact([
      finding.code,
      finding.linkedEntityId,
      ...finding.legalBasis.map((item) => `${item.instrument}:${item.article ?? item.annex ?? item.note ?? "n/a"}`),
    ]),
    title: finding.title,
    why: finding.reason,
    suggestedAction:
      finding.requiredEvidence.length > 0
        ? `Atașează dovezile cerute și trimite finding-ul la review.`
        : "Deschide finding-ul și documentează remedierea.",
    suggestedOwner: toGuidanceOwnerRole(finding.ownerRole),
    targetHref: targetHrefForLinkedEntity(finding.linkedEntityType),
    severity: toGuidanceSeverity(finding.severity),
    priority,
    legalReferences: finding.legalBasis.map(formatLegalBasis),
    evidenceRequired: finding.requiredEvidence,
    dataCertaintyLabel: finding.requiredEvidence.length > 0 ? "Dovezi cerute" : "State aplicație",
    reviewStatusLabel: "Review uman necesar",
    exportImpactLabel: finding.severity === "critical" || finding.severity === "blocker"
      ? "Blochează export"
      : "Impact export",
    ctaLabel: finding.requiredEvidence.length > 0 ? "Atașează dovezi" : "Deschide finding",
    estimatedMinutes: estimateMinutes(priority),
  }
}

function toEvidenceAction(request: OrchestratorEvidenceRequest): GuidanceAction {
  return {
    id: `guidance-evidence-${request.code}`,
    rank: 0,
    source: "finding",
    sourceIds: compact([request.code, request.linkedFindingCode, request.linkedEntityId, request.evidenceType]),
    title: request.title,
    why: request.linkedFindingCode
      ? `Dovadă cerută pentru finding-ul ${request.linkedFindingCode}.`
      : "Dovadă necesară pentru dosarul de conformitate.",
    suggestedAction: `Atașează ${request.evidenceType} și completează metadata cerută.`,
    suggestedOwner: toGuidanceOwnerRole(request.ownerRole),
    targetHref: targetHrefForLinkedEntity(request.linkedEntityType, request.evidenceType),
    severity: "medium",
    priority: "P2",
    legalReferences: [],
    evidenceRequired: [request.evidenceType],
    dataCertaintyLabel: "Dovezi lipsă",
    reviewStatusLabel: "Review după atașare",
    exportImpactLabel: "Export parțial",
    ctaLabel: "Atașează dovezi",
    estimatedMinutes: 12,
  }
}

function toReviewTaskAction(task: OrchestratorReviewTask): GuidanceAction {
  const priority = task.reviewStatus === "needs_lawyer_review" || task.reviewStatus === "needs_dpo_review"
    ? "P1"
    : "P2"
  return {
    id: `guidance-review-${task.code}`,
    rank: 0,
    source: "finding",
    sourceIds: compact([task.code, task.linkedFindingCode, task.linkedEntityId, task.reviewStatus]),
    title: task.title,
    why: reviewReason(task.reviewStatus),
    suggestedAction: `Trimite la ${labelForGuidanceOwner(toGuidanceOwnerRole(task.ownerRole))} și păstrează audit trail-ul review-ului.`,
    suggestedOwner: toGuidanceOwnerRole(task.ownerRole),
    targetHref: targetHrefForLinkedEntity(task.linkedEntityType),
    severity: priority === "P1" ? "high" : "medium",
    priority,
    legalReferences: [],
    evidenceRequired: [],
    dataCertaintyLabel: "State aplicație",
    reviewStatusLabel: reviewStatusLabel(task.reviewStatus),
    exportImpactLabel: task.reviewStatus === "needs_lawyer_review" || task.reviewStatus === "needs_dpo_review"
      ? "Blochează export"
      : "Impact export",
    ctaLabel: "Trimite la review",
    estimatedMinutes: estimateMinutes(priority),
  }
}

function toExportBlockerAction(blocker: OrchestratorExportBlocker): GuidanceAction {
  const priority = priorityFromSeverity(blocker.severity)
  return {
    id: `guidance-export-${blocker.code}`,
    rank: 0,
    source: "obligation",
    sourceIds: [blocker.code, blocker.exportType, blocker.blockedUntil],
    title: `Deblochează exportul ${exportTypeLabel(blocker.exportType)}`,
    why: blocker.reason,
    suggestedAction: `Elimină blocker-ul și recalculă readiness-ul exportului.`,
    suggestedOwner: "Cabinet",
    targetHref: targetHrefForExport(blocker.exportType),
    severity: toGuidanceSeverity(blocker.severity),
    priority,
    legalReferences: [],
    evidenceRequired: [],
    dataCertaintyLabel: "Blocker determinat",
    reviewStatusLabel: "Review necesar",
    exportImpactLabel: "Blochează export",
    ctaLabel: "Vezi blocker-ele",
    estimatedMinutes: estimateMinutes(priority),
  }
}

function toQuestionAction(code: string, question: string, ownerRole: OrchestratorOwnerRole): GuidanceAction {
  return {
    id: `guidance-question-${code}`,
    rank: 0,
    source: "role",
    sourceIds: [code],
    title: question,
    why: "Lipsesc date clare; fără ele, clasificarea și exportul rămân parțiale.",
    suggestedAction: "Trimite întrebarea prin intake sau clarifică manual cu clientul.",
    suggestedOwner: toGuidanceOwnerRole(ownerRole),
    targetHref: "/dashboard/client-intake",
    severity: "medium",
    priority: "P1",
    legalReferences: [],
    evidenceRequired: ["ai_use_case_intake"],
    dataCertaintyLabel: "Certitudine necunoscută",
    reviewStatusLabel: "Client input necesar",
    exportImpactLabel: "Export parțial",
    ctaLabel: "Trimite intake",
    estimatedMinutes: 10,
  }
}

function toNextAction(action: { code: string; title: string; priority: "P0" | "P1" | "P2" | "P3"; targetHref: string; ownerRole: OrchestratorOwnerRole }): GuidanceAction {
  return {
    id: `guidance-next-${action.code}`,
    rank: 0,
    source: "obligation",
    sourceIds: [action.code],
    title: action.title,
    why: "Acțiune propusă din starea curentă a dosarului.",
    suggestedAction: action.title,
    suggestedOwner: toGuidanceOwnerRole(action.ownerRole),
    targetHref: action.targetHref,
    severity: severityFromPriority(action.priority),
    priority: action.priority,
    legalReferences: [],
    evidenceRequired: [],
    dataCertaintyLabel: "State aplicație",
    reviewStatusLabel: "Review uman",
    exportImpactLabel: action.targetHref.includes("audit-pack") ? "Impact export" : "Neutru",
    ctaLabel: ctaLabelForNextAction(action),
    estimatedMinutes: estimateMinutes(action.priority),
  }
}

function toGuidanceOwnerRole(ownerRole: OrchestratorOwnerRole): GuidanceOwnerRole {
  switch (ownerRole) {
    case "legal":
      return "Legal"
    case "management":
      return "Management"
    case "marketing":
      return "Marketing"
    case "engineering":
      return "Engineering"
    case "product_owner":
      return "Product"
    case "it_security":
      return "Security"
    case "procurement":
      return "Procurement"
    case "hr":
      return "HR"
    case "customer_support":
      return "Customer Support"
    case "vendor_manager":
      return "Vendor Manager"
    case "client_admin":
      return "Client Admin"
    case "cabinet_consultant":
    case "consultant":
      return "Cabinet"
    case "dpo":
    default:
      return "DPO"
  }
}

function toGuidanceSeverity(value: string): GuidanceAction["severity"] {
  if (value === "critical" || value === "blocker") return "critical"
  if (value === "high") return "high"
  if (value === "medium") return "medium"
  return "low"
}

function priorityFromSeverity(value: string): GuidancePriority {
  if (value === "critical" || value === "blocker") return "P0"
  if (value === "high") return "P1"
  if (value === "medium") return "P2"
  return "P3"
}

function severityFromPriority(priority: GuidancePriority): GuidanceAction["severity"] {
  if (priority === "P0") return "critical"
  if (priority === "P1") return "high"
  if (priority === "P2") return "medium"
  return "low"
}

function estimateMinutes(priority: GuidancePriority): number {
  if (priority === "P0") return 20
  if (priority === "P1") return 15
  if (priority === "P2") return 12
  return 10
}

function compareActions(a: GuidanceAction, b: GuidanceAction): number {
  const priorityDelta = priorityRank(a.priority) - priorityRank(b.priority)
  if (priorityDelta !== 0) return priorityDelta
  const severityDelta = severityRank(b.severity) - severityRank(a.severity)
  if (severityDelta !== 0) return severityDelta
  return a.title.localeCompare(b.title, "ro")
}

function dedupeActions(actions: GuidanceAction[]): GuidanceAction[] {
  const seen = new Map<string, GuidanceAction>()
  for (const action of actions) {
    const key = [action.title, action.targetHref, action.suggestedOwner].join("|")
    const existing = seen.get(key)
    if (!existing) {
      seen.set(key, action)
      continue
    }
    seen.set(key, {
      ...existing,
      sourceIds: [...new Set([...existing.sourceIds, ...action.sourceIds])],
      legalReferences: [...new Set([...existing.legalReferences, ...action.legalReferences])],
      evidenceRequired: [...new Set([...existing.evidenceRequired, ...action.evidenceRequired])],
      severity: severityRank(action.severity) > severityRank(existing.severity) ? action.severity : existing.severity,
      priority: priorityRank(action.priority) < priorityRank(existing.priority) ? action.priority : existing.priority,
    })
  }
  return [...seen.values()]
}

function uniquifyActionIds(actions: GuidanceAction[]): GuidanceAction[] {
  const counts = new Map<string, number>()
  return actions.map((action) => {
    const seen = counts.get(action.id) ?? 0
    counts.set(action.id, seen + 1)
    if (seen === 0) return action
    return {
      ...action,
      id: `${action.id}-${seen + 1}`,
    }
  })
}

function targetHrefForLinkedEntity(
  linkedEntityType?: string,
  evidenceType?: string,
): string {
  if (evidenceType?.includes("transparency")) return "/dashboard/ai-ads"
  switch (linkedEntityType) {
    case "data_process":
      return "/dashboard/ropa"
    case "vendor_model":
      return "/dashboard/vendor-review"
    case "ai_literacy_record":
      return "/dashboard/literacy"
    case "evidence":
      return "/dashboard/resolve"
    case "export_pack":
      return "/dashboard/audit-pack"
    case "ai_project":
      return "/dashboard/sisteme/eu-db-wizard"
    case "ai_system":
    case "ai_use_case":
    case "finding":
    case "client":
    default:
      return "/dashboard/resolve"
  }
}

function targetHrefForExport(exportType: string): string {
  if (exportType.includes("builder")) return "/dashboard/sisteme/eu-db-wizard"
  if (exportType.includes("questionnaire")) return "/dashboard/rapoarte"
  return "/dashboard/audit-pack"
}

function exportTypeLabel(exportType: string): string {
  const normalized = exportType.toLowerCase()
  if (normalized.includes("audit_pack")) return "Audit Pack"
  if (normalized.includes("builder")) return "AI Builder Handover Pack"
  if (normalized.includes("questionnaire")) return "pachetul de răspuns"
  return exportType.replace(/_/g, " ")
}

function reviewReason(status: string): string {
  if (status === "needs_lawyer_review") return "Necesită validare juridică înainte de a trage concluzii."
  if (status === "needs_dpo_review") return "Necesită review DPO pentru date personale, RoPA sau DPIA."
  if (status === "needs_it_security_review") return "Necesită review IT/security pentru vendor, logging sau configurație."
  if (status === "needs_management_approval") return "Necesită aprobarea managementului."
  if (status === "needs_client_approval") return "Necesită confirmarea clientului."
  return "Necesită review uman înainte de închidere sau export."
}

function reviewStatusLabel(status: string): string {
  if (status === "needs_lawyer_review") return "Legal review"
  if (status === "needs_dpo_review") return "DPO review"
  if (status === "needs_it_security_review") return "IT/security review"
  if (status === "needs_management_approval") return "Management approval"
  if (status === "needs_client_approval") return "Client approval"
  return "Review necesar"
}

function formatLegalBasis(item: {
  instrument: "EU_AI_ACT" | "GDPR" | "CONTRACT" | "INTERNAL_POLICY"
  article?: string
  annex?: string
  note?: string
}) {
  const detail = item.article ?? item.annex ?? item.note ?? ""
  const instrument = item.instrument === "EU_AI_ACT"
    ? "AI Act"
    : item.instrument === "INTERNAL_POLICY"
      ? "Internal governance"
      : item.instrument
  return detail ? `${instrument} ${detail}` : instrument
}

function ctaLabelForNextAction(action: {
  title: string
  targetHref: string
}) {
  const raw = `${action.title} ${action.targetHref}`.toLowerCase()
  if (raw.includes("audit-pack") || raw.includes("export") || raw.includes("blocker")) return "Vezi blocker-ele"
  if (raw.includes("notice") || raw.includes("transparen")) return "Creează notice"
  if (raw.includes("review")) return "Trimite la review"
  if (raw.includes("dovad") || raw.includes("evidence")) return "Atașează dovezi"
  if (raw.includes("registr") || raw.includes("use case") || raw.includes("candidate")) return "Confirmă use case"
  return "Deschide finding"
}

function fingerprintProposal(value: unknown, suffix: string): string {
  return createHash("sha256")
    .update(JSON.stringify(value))
    .update(String(suffix))
    .digest("hex")
}

function confidenceFor(
  result: ComplianceOrchestratorRunResult,
  actions: GuidanceAction[],
  state: ComplianceState,
): GuidancePlan["confidence"] {
  if (result.source === "mistral_rag" && actions.length > 0) return "high"
  if ((state.aiUseCases?.length ?? 0) > 0 || (state.findings?.length ?? 0) > 0) return "medium"
  return "low"
}

function priorityRank(priority: GuidancePriority): number {
  if (priority === "P0") return 0
  if (priority === "P1") return 1
  if (priority === "P2") return 2
  return 3
}

function severityRank(severity: GuidanceAction["severity"]): number {
  if (severity === "critical") return 4
  if (severity === "high") return 3
  if (severity === "medium") return 2
  return 1
}

function compact(values: Array<string | undefined>): string[] {
  return values.filter((value): value is string => Boolean(value))
}

function defaultPlannerRole(workspaceMode: WorkspaceMode): string {
  if (workspaceMode === "cabinet") return "cabinet_consultant"
  if (workspaceMode === "ai-builder") return "product_owner"
  return "management"
}

function toOrchestratorWorkspaceMode(workspaceMode: WorkspaceMode): "cabinet" | "imm-classic" | "ai-builder" {
  return workspaceMode
}

function labelForGuidanceOwner(owner: GuidanceOwnerRole): string {
  return owner
}
