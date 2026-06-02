import type { ComplianceState } from "@/lib/compliance/types"

export type ExportReadinessStatus = "blocked" | "draft_only" | "ready_for_review" | "approved"
export type ExportBlockerStatus = "evidence_missing" | "review_pending" | "critical_open" | "open_risk"

export type ExportBlockerItem = {
  id: string
  code: string
  title: string
  sourceType: "finding" | "ai_use_case" | "vendor" | "review" | "evidence"
  severity: string
  ownerRole: string
  requiredEvidence: string[]
  reviewGate: string
  status: ExportBlockerStatus
  statusLabel: string
  href: string
}

export type DashboardSnapshot = {
  aiSystems: number
  aiUseCasesCandidateCount: number
  aiUseCasesConfirmedCount: number
  vendorsCount: number
  evidenceMissingCount: number
  reviewPendingCount: number
  exportReadinessStatus: ExportReadinessStatus
  exportBlockersCount: number
  literacyRecords: number
  loggingConfigs: number
  pmmPlans: number
  aiIncidentsOpen: number
}

export type DashboardExecutionState = {
  isClientExecution: boolean
  snapshot: DashboardSnapshot
  exportBlockers: ExportBlockerItem[]
  auditPackCta: {
    label: string
    href: string
    tone: "primary" | "warning" | "neutral"
  }
  provenanceLabel: string
}

export type GuidancePlanCoherence = {
  aiUseCasesCandidateCount: number
  aiUseCasesConfirmedCount: number
  aiSystemsCount: number
  evidenceMissingCount: number
  reviewPendingCount: number
  exportReadinessLabel: string
  exportBlockers: Array<{
    id: string
    code: string
    title: string
    statusLabel: string
    ownerRole: string
    requiredEvidence: string[]
    reviewGate: string
    href: string
  }>
}

const REVIEW_PENDING_TOKENS = ["pending", "review", "needs", "required", "unreviewed", "open", "draft"]

export function buildDashboardExecutionState(
  state: ComplianceState,
  options: { isClientExecution: boolean },
): DashboardExecutionState {
  const exportBlockers = buildExportBlockers(state)
  const reviewPendingCount = countReviewPendingItems(state, exportBlockers)
  const snapshot = buildCoherenceSnapshot(state, exportBlockers, reviewPendingCount)

  return {
    isClientExecution: options.isClientExecution,
    snapshot,
    exportBlockers,
    auditPackCta: auditPackCtaFor(snapshot.exportReadinessStatus),
    provenanceLabel:
      "Calculat din findings, dovezi și review-uri. AI-ul te ghidează, dar dosarul rămâne blocat până când dovezile și aprobările cerute sunt închise.",
  }
}

export function buildGuidancePlanCoherence(executionState: DashboardExecutionState): GuidancePlanCoherence {
  const { snapshot } = executionState
  return {
    aiUseCasesCandidateCount: snapshot.aiUseCasesCandidateCount,
    aiUseCasesConfirmedCount: snapshot.aiUseCasesConfirmedCount,
    aiSystemsCount: snapshot.aiSystems,
    evidenceMissingCount: snapshot.evidenceMissingCount,
    reviewPendingCount: snapshot.reviewPendingCount,
    exportReadinessLabel: exportReadinessLabel(snapshot.exportReadinessStatus),
    exportBlockers: executionState.exportBlockers.map((blocker) => ({
      id: blocker.id,
      code: blocker.code,
      title: blocker.title,
      statusLabel: blocker.statusLabel,
      ownerRole: blocker.ownerRole,
      requiredEvidence: blocker.requiredEvidence,
      reviewGate: blocker.reviewGate,
      href: blocker.href,
    })),
  }
}

function buildCoherenceSnapshot(
  state: ComplianceState,
  exportBlockers: ExportBlockerItem[],
  reviewPendingCount: number,
): DashboardSnapshot {
  const aiUseCases = state.aiUseCases ?? []
  const aiSystems = state.aiSystems ?? []
  const vendors = state.vendorRecords ?? []
  const confirmedUseCases = aiUseCases.filter((useCase) => isConfirmedAiUseCase(useCase)).length
  const candidateUseCases = Math.max(0, aiUseCases.length - confirmedUseCases)
  const openFindings = state.findings?.filter(isOpenFinding) ?? []
  const hasOperationalData = aiUseCases.length + aiSystems.length + vendors.length + openFindings.length > 0
  const exportReadinessStatus = exportReadinessFor({
    hasOperationalData,
    exportBlockersCount: exportBlockers.length,
    reviewPendingCount,
  })

  return {
    aiSystems: aiSystems.length,
    aiUseCasesCandidateCount: candidateUseCases,
    aiUseCasesConfirmedCount: confirmedUseCases,
    vendorsCount: vendors.length,
    evidenceMissingCount: exportBlockers.filter((blocker) => blocker.status === "evidence_missing").length,
    reviewPendingCount,
    exportReadinessStatus,
    exportBlockersCount: exportBlockers.length,
    literacyRecords: state.literacyRecords?.length ?? 0,
    loggingConfigs: state.loggingEvidence?.length ?? 0,
    pmmPlans: state.pmmPlans?.length ?? 0,
    aiIncidentsOpen:
      state.aiIncidents?.filter(
        (incident) => incident.status !== "closed" && incident.status !== "not_reportable",
      ).length ?? 0,
  }
}

function buildExportBlockers(state: ComplianceState): ExportBlockerItem[] {
  const openFindings = state.findings?.filter(isOpenFinding) ?? []

  return openFindings.map((finding, index) => {
    const evidenceMissing = findingNeedsEvidenceForCoherence(finding)
    const reviewPending = findingNeedsReviewForCoherence(finding)
    const criticalOpen = finding.severity === "critical"
    const status: ExportBlockerStatus = evidenceMissing
      ? "evidence_missing"
      : reviewPending
        ? "review_pending"
        : criticalOpen
          ? "critical_open"
          : "open_risk"

    return {
      id: String(finding.id ?? "finding-" + (index + 1)),
      code: "BLK-" + String(index + 1).padStart(3, "0"),
      title: displayProductText(String(finding.title ?? "Finding deschis")),
      sourceType: "finding",
      severity: String(finding.severity ?? "medium"),
      ownerRole: ownerRoleForFinding(finding),
      requiredEvidence: evidenceRequiredForFinding(finding),
      reviewGate: reviewGateForFinding(finding),
      status,
      statusLabel: exportBlockerStatusLabel(status),
      href: "/dashboard/resolve?finding=" + encodeURIComponent(String(finding.id ?? "")),
    }
  })
}

function countReviewPendingItems(state: ComplianceState, exportBlockers: ExportBlockerItem[]) {
  const findingReviewBlockers = exportBlockers.filter((blocker) => blocker.status === "review_pending").length
  const approvalRequestsPending = state.approvalRequests?.filter((approval) => approval.status === "pending").length ?? 0
  return findingReviewBlockers + approvalRequestsPending
}

function isConfirmedAiUseCase(useCase: { reviewStatus?: string; certaintyStatus?: string; status?: string }) {
  const tokens = [useCase.reviewStatus, useCase.certaintyStatus, useCase.status].map(normalizeToken)
  return tokens.some((token) =>
    ["approved", "confirmed", "client_approved", "dpo_reviewed", "lawyer_reviewed", "consultant_reviewed", "reviewed"].some((confirmed) => token.includes(confirmed)),
  )
}

function findingNeedsEvidenceForCoherence(finding: {
  evidenceRequired?: string
  requiredEvidenceKinds?: string[]
  closeCondition?: string
  reviewState?: string
}) {
  const reviewState = normalizeToken(finding.reviewState)
  if (reviewState === "evidence_attached" || reviewState === "closed" || reviewState === "monitoring") return false
  return evidenceRequiredForFinding(finding).length > 0
}

function findingNeedsReviewForCoherence(finding: {
  reviewState?: string
  requiresHumanReview?: boolean
  owner?: string
  category?: string
  title?: string
  legalReferences?: string[]
}) {
  if (finding.requiresHumanReview) return true
  if (reviewTokenIsPending(finding.reviewState)) return true
  const reviewText = normalizeToken([finding.owner, finding.category, finding.title, ...(finding.legalReferences ?? [])].join(" "))
  return reviewText.includes("legal") || reviewText.includes("dpo") || reviewText.includes("gdpr") || reviewText.includes("art")
}

function evidenceRequiredForFinding(finding: {
  evidenceRequired?: string
  requiredEvidenceKinds?: string[]
  closeCondition?: string
}) {
  const rawEvidence = typeof finding.evidenceRequired === "string" ? splitEvidenceText(finding.evidenceRequired) : []
  const closeCondition = typeof finding.closeCondition === "string" ? splitEvidenceText(finding.closeCondition) : []
  const evidenceKinds = rawEvidence.length > 0 || closeCondition.length > 0
    ? []
    : Array.isArray(finding.requiredEvidenceKinds)
      ? finding.requiredEvidenceKinds
      : []
  const seen = new Set<string>()
  return [...rawEvidence, ...evidenceKinds, ...closeCondition]
    .map((item) => displayEvidenceRequirement(String(item).trim()))
    .filter(Boolean)
    .filter((item) => {
      const key = normalizeEvidenceRequirement(item)
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
}

function splitEvidenceText(value: string) {
  return value
    .split(/[;,]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function displayEvidenceRequirement(value: string) {
  const cleanValue = value.replace(/\.+$/g, "").replace(/data-flow/gi, "data flow")
  const labels: Record<string, string> = {
    ai_inventory: "Inventar AI actualizat",
    vendor_review: "Review vendor",
    dpia_decision: "Decizie RoPA/DPIA",
    owner_attestation: "Confirmare responsabil",
    ai_use_case_intake: "Intake use case AI",
    vendor_dpa: "DPA vendor",
    vendor_contract: "Contract vendor",
    human_oversight_sop: "Procedură human oversight",
    ai_literacy_training_roster: "Dovadă AI literacy",
    transparency_notice_text: "Text notice Art. 50",
    transparency_screenshot: "Screenshot notice Art. 50",
  }
  const normalizedKey = cleanValue.toLowerCase().replace(/\s+/g, "_")
  return displayProductText(labels[normalizedKey] ?? cleanValue.replace(/_/g, " "))
}

function normalizeEvidenceRequirement(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

function ownerRoleForFinding(finding: { owner?: string; category?: string; title?: string }) {
  const text = normalizeToken([finding.owner, finding.category, finding.title].join(" "))
  if (text.includes("gdpr") || text.includes("dpia") || text.includes("dpo")) return "DPO / privacy owner"
  if (text.includes("legal") || text.includes("contract") || text.includes("art")) return "Legal / compliance"
  if (text.includes("vendor") || text.includes("supplier") || text.includes("furniz")) return "Vendor owner"
  if (text.includes("security") || text.includes("incident") || text.includes("logging")) return "Security owner"
  return "DPO / legal reviewer"
}

function reviewGateForFinding(finding: { requiresHumanReview?: boolean; owner?: string; category?: string; title?: string }) {
  if (finding.requiresHumanReview) return "Review uman obligatoriu înainte de export"
  const ownerRole = ownerRoleForFinding(finding)
  if (ownerRole.includes("DPO")) return "Review DPO"
  if (ownerRole.includes("Legal")) return "Review legal/compliance"
  if (ownerRole.includes("Security")) return "Review security"
  return "Review responsabil client"
}

function isOpenFinding(finding: { findingStatus?: string; reviewState?: string }) {
  const status = finding.findingStatus ?? "open"
  if (status === "resolved" || status === "dismissed" || status === "under_monitoring") return false
  if (finding.reviewState === "closed" || finding.reviewState === "monitoring") return false
  return status === "open" || status === "confirmed" || finding.reviewState === "unreviewed" || finding.reviewState === "evidence_attached"
}

function exportReadinessFor(input: {
  hasOperationalData: boolean
  exportBlockersCount: number
  reviewPendingCount: number
}): ExportReadinessStatus {
  if (input.exportBlockersCount > 0) return "blocked"
  if (input.reviewPendingCount > 0) return "ready_for_review"
  if (input.hasOperationalData) return "approved"
  return "draft_only"
}

function auditPackCtaFor(status: ExportReadinessStatus): DashboardExecutionState["auditPackCta"] {
  if (status === "blocked") {
    return { label: "Rezolvă blocker-ele Audit Pack", href: "/dashboard/resolve", tone: "warning" }
  }
  if (status === "draft_only") {
    return { label: "Importă date pentru Audit Pack", href: "/dashboard/import", tone: "neutral" }
  }
  if (status === "approved") {
    return { label: "Exportă Audit Pack", href: "/dashboard/audit-pack", tone: "primary" }
  }
  return { label: "Trimite Audit Pack la review", href: "/dashboard/approvals", tone: "primary" }
}

function exportBlockerStatusLabel(status: ExportBlockerStatus) {
  if (status === "evidence_missing") return "Dovezi lipsă"
  if (status === "review_pending") return "Review deschis"
  if (status === "critical_open") return "Risc critic deschis"
  return "Finding deschis"
}

export function exportReadinessLabel(status: ExportReadinessStatus) {
  const labels: Record<ExportReadinessStatus, string> = {
    blocked: "Blocat",
    draft_only: "Draft fără date complete",
    ready_for_review: "Gata pentru review",
    approved: "Aprobat pentru export",
  }
  return labels[status]
}

function reviewTokenIsPending(value?: string) {
  const token = normalizeToken(value)
  if (!token || token === "approved" || token === "rejected" || token === "reviewed" || token === "closed") return false
  return REVIEW_PENDING_TOKENS.some((pendingToken) => token.includes(pendingToken))
}

function normalizeToken(value?: string) {
  return String(value ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_")
}

function displayProductText(value: string) {
  return value
    .replace(/Fixture AI use case/gi, "Caz AI candidat")
    .replace(/Fixture/gi, "Caz candidat")
    .replace(/mock/gi, "date de test")
    .trim()
}
