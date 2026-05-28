import { createHash } from "node:crypto"

import type {
  AIUseCaseRecord,
  AISystemRecord,
  ComplianceState,
  ScanFinding,
} from "@/lib/compliance/types"

export type OrchestratorWorkspaceMode = "cabinet" | "imm_classic" | "ai_builder" | "imm-classic" | "ai-builder"

export type AppStateSnapshotInput = {
  orgId: string
  workspaceMode: OrchestratorWorkspaceMode
  clientId?: string
  aiProjectId?: string
  engagementId?: string
  user: {
    id: string
    role: string
  }
  state: ComplianceState
}

export type AIUseCaseSnapshot = Pick<
  AIUseCaseRecord,
  | "id"
  | "clientId"
  | "aiProjectId"
  | "linkedAiSystemId"
  | "useCaseName"
  | "department"
  | "businessProcess"
  | "lifecycleStatus"
  | "toolName"
  | "vendorName"
  | "usesPersonalData"
  | "usesConfidentialData"
  | "humanReview"
  | "directInteractionWithPersons"
  | "automatedDecision"
  | "scoringOrRanking"
  | "annexIIIDomain"
  | "draftRiskLevel"
  | "draftRole"
  | "highRiskCandidate"
  | "prohibitedCandidate"
  | "certaintyStatus"
  | "reviewStatus"
  | "evidenceCompletenessPct"
  | "openFindingsCount"
>

export type AISystemSnapshot = Pick<
  AISystemRecord,
  | "id"
  | "name"
  | "purpose"
  | "vendor"
  | "modelType"
  | "usesPersonalData"
  | "makesAutomatedDecisions"
  | "impactsRights"
  | "hasHumanReview"
  | "riskLevel"
  | "certaintyStatus"
  | "reviewStatus"
>

export type FindingSnapshot = Pick<
  ScanFinding,
  | "id"
  | "title"
  | "category"
  | "severity"
  | "risk"
  | "legalReference"
  | "evidenceRequired"
  | "findingStatus"
  | "reviewState"
  | "ownerSuggestion"
>

export type DataCertaintySummary = {
  unknown: number
  selfReported: number
  imported: number
  evidenceAttached: number
  reviewed: number
  approved: number
  expired: number
}

export type AppStateSnapshot = {
  workspaceMode: OrchestratorWorkspaceMode
  orgId: string
  clientId?: string
  aiProjectId?: string
  engagementId?: string
  user: {
    id: string
    role: string
  }
  aiUseCases: AIUseCaseSnapshot[]
  aiSystems: AISystemSnapshot[]
  findings: FindingSnapshot[]
  openFindingsCount: number
  dataProcessesCount: number
  literacyRecordsCount: number
  evidenceAttachedCount: number
  generatedDocumentsCount: number
  dataCertaintySummary: DataCertaintySummary
}

export function buildAppStateSnapshot(input: AppStateSnapshotInput): AppStateSnapshot {
  const aiUseCases = (input.state.aiUseCases ?? [])
    .filter((record) => isInRequestedScope(record, input))
    .map(toAIUseCaseSnapshot)
    .sort(byId)

  const aiSystems = (input.state.aiSystems ?? [])
    .map(toAISystemSnapshot)
    .sort(byId)

  const findings = (input.state.findings ?? [])
    .map(toFindingSnapshot)
    .sort(byId)

  return {
    workspaceMode: input.workspaceMode,
    orgId: input.orgId,
    clientId: input.clientId,
    aiProjectId: input.aiProjectId,
    engagementId: input.engagementId,
    user: input.user,
    aiUseCases,
    aiSystems,
    findings,
    openFindingsCount: findings.filter((finding) => !["resolved", "dismissed"].includes(finding.findingStatus ?? "open")).length,
    dataProcessesCount: input.state.ropaActivities?.length ?? 0,
    literacyRecordsCount: input.state.literacyRecords?.length ?? 0,
    evidenceAttachedCount: findings.filter((finding) => finding.reviewState === "evidence_attached").length,
    generatedDocumentsCount: input.state.generatedDocuments?.length ?? 0,
    dataCertaintySummary: summarizeCertainty(aiUseCases),
  }
}

export function fingerprintSnapshot(snapshot: AppStateSnapshot): string {
  return createHash("sha256").update(stableStringify(snapshot)).digest("hex")
}

function isInRequestedScope(record: AIUseCaseRecord, input: AppStateSnapshotInput) {
  if (input.clientId && record.clientId !== input.clientId) return false
  if (input.aiProjectId && record.aiProjectId !== input.aiProjectId) return false
  return true
}

function toAIUseCaseSnapshot(record: AIUseCaseRecord): AIUseCaseSnapshot {
  return {
    id: record.id,
    clientId: record.clientId,
    aiProjectId: record.aiProjectId,
    linkedAiSystemId: record.linkedAiSystemId,
    useCaseName: record.useCaseName,
    department: record.department,
    businessProcess: record.businessProcess,
    lifecycleStatus: record.lifecycleStatus,
    toolName: record.toolName,
    vendorName: record.vendorName,
    usesPersonalData: record.usesPersonalData,
    usesConfidentialData: record.usesConfidentialData,
    humanReview: record.humanReview,
    directInteractionWithPersons: record.directInteractionWithPersons,
    automatedDecision: record.automatedDecision,
    scoringOrRanking: record.scoringOrRanking,
    annexIIIDomain: record.annexIIIDomain,
    draftRiskLevel: record.draftRiskLevel,
    draftRole: record.draftRole,
    highRiskCandidate: record.highRiskCandidate,
    prohibitedCandidate: record.prohibitedCandidate,
    certaintyStatus: record.certaintyStatus,
    reviewStatus: record.reviewStatus,
    evidenceCompletenessPct: record.evidenceCompletenessPct,
    openFindingsCount: record.openFindingsCount,
  }
}

function toAISystemSnapshot(record: AISystemRecord): AISystemSnapshot {
  return {
    id: record.id,
    name: record.name,
    purpose: record.purpose,
    vendor: record.vendor,
    modelType: record.modelType,
    usesPersonalData: record.usesPersonalData,
    makesAutomatedDecisions: record.makesAutomatedDecisions,
    impactsRights: record.impactsRights,
    hasHumanReview: record.hasHumanReview,
    riskLevel: record.riskLevel,
    certaintyStatus: record.certaintyStatus,
    reviewStatus: record.reviewStatus,
  }
}

function toFindingSnapshot(record: ScanFinding): FindingSnapshot {
  return {
    id: record.id,
    title: record.title,
    category: record.category,
    severity: record.severity,
    risk: record.risk,
    legalReference: record.legalReference,
    evidenceRequired: record.evidenceRequired,
    findingStatus: record.findingStatus,
    reviewState: record.reviewState,
    ownerSuggestion: record.ownerSuggestion,
  }
}

function summarizeCertainty(records: AIUseCaseSnapshot[]): DataCertaintySummary {
  const summary: DataCertaintySummary = {
    unknown: 0,
    selfReported: 0,
    imported: 0,
    evidenceAttached: 0,
    reviewed: 0,
    approved: 0,
    expired: 0,
  }

  for (const record of records) {
    switch (record.certaintyStatus) {
      case "self_reported":
        summary.selfReported += 1
        break
      case "imported":
        summary.imported += 1
        break
      case "evidence_attached":
        summary.evidenceAttached += 1
        break
      case "dpo_reviewed":
      case "lawyer_reviewed":
      case "consultant_reviewed":
        summary.reviewed += 1
        break
      case "management_approved":
      case "client_approved":
        summary.approved += 1
        break
      case "expired":
        summary.expired += 1
        break
      default:
        summary.unknown += 1
    }
  }

  return summary
}

function byId(a: { id: string }, b: { id: string }) {
  return a.id.localeCompare(b.id)
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .filter(([, entry]) => entry !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`)
      .join(",")}}`
  }
  return JSON.stringify(value)
}
