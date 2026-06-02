import {
  ORCHESTRATOR_SCHEMA_VERSION,
  type OrchestratorLegalBasis,
  type OrchestratorProposal,
  type OrchestratorValidationContext,
  type OrchestratorValidationResult,
} from "./types"

type LegalSourceValidationMetadata = NonNullable<OrchestratorValidationContext["legalSourcesById"]>[string]

const ALLOWED_SEVERITIES = new Set(["info", "low", "medium", "high", "critical", "blocker"])
const ALLOWED_OWNER_ROLES = new Set([
  "cabinet_consultant",
  "dpo",
  "legal",
  "management",
  "hr",
  "marketing",
  "customer_support",
  "it_security",
  "engineering",
  "product_owner",
  "procurement",
  "vendor_manager",
  "client_admin",
  "consultant",
])
const ALLOWED_LINKED_ENTITY_TYPES = new Set([
  "client",
  "ai_use_case",
  "ai_system",
  "vendor_model",
  "data_process",
  "ai_literacy_record",
  "finding",
  "evidence",
  "export_pack",
  "ai_project",
])
const ALLOWED_REVIEW_STATUSES = new Set([
  "needs_review",
  "needs_dpo_review",
  "needs_lawyer_review",
  "needs_it_security_review",
  "needs_management_approval",
  "needs_client_approval",
])
const ALLOWED_PRIORITIES = new Set(["P0", "P1", "P2", "P3"])
const FORBIDDEN_FINAL_RISK_DRAFTS = new Set([
  "high_risk_final",
  "prohibited_final",
  "final_high_risk",
  "final_prohibited",
  "high-risk final",
  "prohibited final",
])
const FORBIDDEN_OVERCLAIM_PHRASES = [
  "este conform garantat",
  "fully compliant",
  "nu există niciun risc",
  "nu este nevoie de review",
  "verdict final",
  "certificat ai act",
  "aprobat automat",
  "high-risk final",
  "practică interzisă finală",
]

export function validateOrchestratorProposal(
  payload: unknown,
  context: OrchestratorValidationContext = {},
): OrchestratorValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  const legalContext = Array.isArray(payload) || !isRecord(payload)
    ? []
    : Array.isArray(payload.legalContext)
      ? payload.legalContext
      : []

  if (!isRecord(payload)) {
    return {
      ok: false,
      errors: ["proposal must be an object"],
      warnings,
    }
  }

  if (payload.schemaVersion !== ORCHESTRATOR_SCHEMA_VERSION) {
    errors.push("proposal.schemaVersion must be orchestrator.v1")
  }
  if (payload.finalLegalVerdict !== false) {
    errors.push("proposal.finalLegalVerdict must be false")
  }

  validateArray(payload.proposedFindings, "proposedFindings", errors)
  validateArray(payload.evidenceRequests, "evidenceRequests", errors)
  validateArray(payload.reviewTasks, "reviewTasks", errors)
  validateArray(payload.nextActions, "nextActions", errors)
  validateArray(payload.exportBlockers, "exportBlockers", errors)
  validateArray(payload.clientQuestions, "clientQuestions", errors)
  validateArray(payload.obsoleteCandidates, "obsoleteCandidates", errors)

  const proposedFindings = Array.isArray(payload.proposedFindings) ? payload.proposedFindings : []
  const proposedFindingCodes = new Set<string>()
  proposedFindings.forEach((item) => {
    if (isRecord(item) && typeof item.code === "string" && item.code.trim()) {
      proposedFindingCodes.add(item.code.trim())
    }
  })
  proposedFindings.forEach((item, index) =>
    validateProposedFinding(item, index, legalContext, context, errors, warnings)
  )
  const evidenceRequests = Array.isArray(payload.evidenceRequests) ? payload.evidenceRequests : []
  evidenceRequests.forEach((item, index) =>
    validateEvidenceRequest(item, index, proposedFindingCodes, context, errors)
  )
  const reviewTasks = Array.isArray(payload.reviewTasks) ? payload.reviewTasks : []
  reviewTasks.forEach((item, index) =>
    validateReviewTask(item, index, proposedFindingCodes, context, errors)
  )
  const nextActions = Array.isArray(payload.nextActions) ? payload.nextActions : []
  nextActions.forEach((item, index) => validateNextAction(item, index, errors))
  const exportBlockers = Array.isArray(payload.exportBlockers) ? payload.exportBlockers : []
  exportBlockers.forEach((item, index) => validateExportBlocker(item, index, errors))
  const clientQuestions = Array.isArray(payload.clientQuestions) ? payload.clientQuestions : []
  clientQuestions.forEach((item, index) => validateClientQuestion(item, index, context, errors))
  const obsoleteCandidates = Array.isArray(payload.obsoleteCandidates) ? payload.obsoleteCandidates : []
  obsoleteCandidates.forEach((item, index) =>
    validateObsoleteCandidate(item, index, proposedFindingCodes, context, errors)
  )
  validateLegalContext(payload.legalContext, context, errors)
  validateForbiddenWorkflowMutations(payload, errors)
  validateForbiddenLanguage(payload, errors)
  validateFindingEvidenceCoverage(proposedFindings, evidenceRequests, errors)

  if (errors.length > 0) {
    return { ok: false, errors, warnings }
  }

  return {
    ok: true,
    proposal: payload as OrchestratorProposal,
    warnings,
  }
}

function validateEvidenceRequest(
  item: unknown,
  index: number,
  proposedFindingCodes: Set<string>,
  context: OrchestratorValidationContext,
  errors: string[],
) {
  const path = `evidenceRequests[${index}]`
  if (!isRecord(item)) {
    errors.push(`${path} must be an object`)
    return
  }
  requireString(item.code, `${path}.code`, errors)
  requireString(item.evidenceType, `${path}.evidenceType`, errors)
  requireString(item.title, `${path}.title`, errors)
  validateOwnerRole(item.ownerRole, `${path}.ownerRole`, errors)
  validateOptionalLinkedEntityType(item.linkedEntityType, `${path}.linkedEntityType`, errors)
  validateLinkedEntityScope(item, path, context, errors)
  validateLinkedFindingCode(item.linkedFindingCode, `${path}.linkedFindingCode`, proposedFindingCodes, context, errors)
  validateOptionalStringArray(item.requiredMetadata, `${path}.requiredMetadata`, errors)
}

function validateReviewTask(
  item: unknown,
  index: number,
  proposedFindingCodes: Set<string>,
  context: OrchestratorValidationContext,
  errors: string[],
) {
  const path = `reviewTasks[${index}]`
  if (!isRecord(item)) {
    errors.push(`${path} must be an object`)
    return
  }
  requireString(item.code, `${path}.code`, errors)
  requireString(item.title, `${path}.title`, errors)
  validateOwnerRole(item.ownerRole, `${path}.ownerRole`, errors)
  if (typeof item.reviewStatus !== "string" || !ALLOWED_REVIEW_STATUSES.has(item.reviewStatus)) {
    errors.push(`${path}.reviewStatus is invalid`)
  }
  validateOptionalLinkedEntityType(item.linkedEntityType, `${path}.linkedEntityType`, errors)
  validateLinkedEntityScope(item, path, context, errors)
  validateLinkedFindingCode(item.linkedFindingCode, `${path}.linkedFindingCode`, proposedFindingCodes, context, errors)
}

function validateNextAction(item: unknown, index: number, errors: string[]) {
  const path = `nextActions[${index}]`
  if (!isRecord(item)) {
    errors.push(`${path} must be an object`)
    return
  }
  requireString(item.code, `${path}.code`, errors)
  requireString(item.title, `${path}.title`, errors)
  if (typeof item.priority !== "string" || !ALLOWED_PRIORITIES.has(item.priority)) {
    errors.push(`${path}.priority is invalid`)
  }
  requireString(item.targetHref, `${path}.targetHref`, errors)
  validateOwnerRole(item.ownerRole, `${path}.ownerRole`, errors)
}

function validateExportBlocker(item: unknown, index: number, errors: string[]) {
  const path = `exportBlockers[${index}]`
  if (!isRecord(item)) {
    errors.push(`${path} must be an object`)
    return
  }
  requireString(item.code, `${path}.code`, errors)
  requireString(item.exportType, `${path}.exportType`, errors)
  requireString(item.reason, `${path}.reason`, errors)
  if (typeof item.severity !== "string" || !ALLOWED_SEVERITIES.has(item.severity)) {
    errors.push(`${path}.severity is invalid`)
  }
  requireString(item.blockedUntil, `${path}.blockedUntil`, errors)
}

function validateClientQuestion(
  item: unknown,
  index: number,
  context: OrchestratorValidationContext,
  errors: string[],
) {
  const path = `clientQuestions[${index}]`
  if (!isRecord(item)) {
    errors.push(`${path} must be an object`)
    return
  }
  requireString(item.code, `${path}.code`, errors)
  requireString(item.question, `${path}.question`, errors)
  validateOwnerRole(item.ownerRole, `${path}.ownerRole`, errors)
  validateOptionalLinkedEntityType(item.linkedEntityType, `${path}.linkedEntityType`, errors)
  validateLinkedEntityScope(item, path, context, errors)
}

function validateObsoleteCandidate(
  item: unknown,
  index: number,
  proposedFindingCodes: Set<string>,
  context: OrchestratorValidationContext,
  errors: string[],
) {
  const path = `obsoleteCandidates[${index}]`
  if (!isRecord(item)) {
    errors.push(`${path} must be an object`)
    return
  }
  requireString(item.findingCode, `${path}.findingCode`, errors)
  requireString(item.reason, `${path}.reason`, errors)
  validateLinkedFindingCode(item.findingCode, `${path}.findingCode`, proposedFindingCodes, context, errors)
}

function validateLegalContext(
  value: unknown,
  context: OrchestratorValidationContext,
  errors: string[],
) {
  if (value === undefined) return
  if (!Array.isArray(value)) {
    errors.push("proposal.legalContext must be an array")
    return
  }
  const allowed = new Set(context.allowedRagSourceIds ?? [])
  value.forEach((entry, index) => {
    const path = `legalContext[${index}]`
    if (!isRecord(entry)) {
      errors.push(`${path} must be an object`)
      return
    }
    requireString(entry.sourceId, `${path}.sourceId`, errors)
    requireString(entry.reference, `${path}.reference`, errors)
    requireString(entry.whyRelevant, `${path}.whyRelevant`, errors)
    if (!["EU_AI_ACT", "GDPR", "CONTRACT", "INTERNAL_POLICY"].includes(String(entry.instrument))) {
      errors.push(`${path}.instrument is invalid`)
    }
    if (allowed.size > 0 && typeof entry.sourceId === "string" && !allowed.has(entry.sourceId)) {
      errors.push(`${path}.sourceId was not retrieved in RagContext`)
    }
    if (
      typeof entry.sourceId === "string" &&
      (entry.instrument === "EU_AI_ACT" || entry.instrument === "GDPR") &&
      !isSourceCitableAsLaw(context.legalSourcesById?.[entry.sourceId])
    ) {
      errors.push(`${path}.sourceId cannot be used as legal authority for ${entry.instrument}`)
    }
  })
}

function validateForbiddenLanguage(payload: unknown, errors: string[]) {
  const serialized = JSON.stringify(payload).toLowerCase()
  for (const phrase of FORBIDDEN_OVERCLAIM_PHRASES) {
    if (serialized.includes(phrase)) {
      errors.push(`proposal contains forbidden overclaim phrase: ${phrase}`)
    }
  }
}

function validateForbiddenWorkflowMutations(payload: unknown, errors: string[]) {
  walkProposal(payload, "proposal", (value, path) => {
    if (!isRecord(value)) return

    if (value.autoApprove !== undefined) {
      errors.push(`${displayMutationPath(path)}.autoApprove is forbidden`)
    }
    if (value.autoResolve !== undefined) {
      errors.push(`${displayMutationPath(path)}.autoResolve is forbidden`)
    }
    if (value.approveEvidence !== undefined) {
      errors.push(`${displayMutationPath(path)}.approveEvidence is forbidden`)
    }
    if (value.resolveFinding !== undefined) {
      errors.push(`${displayMutationPath(path)}.resolveFinding is forbidden`)
    }
    if (value.canExportFinal !== undefined) {
      errors.push(`${displayMutationPath(path)}.canExportFinal is forbidden`)
    }
    if (value.finalExportApproved !== undefined) {
      errors.push(`${displayMutationPath(path)}.finalExportApproved is forbidden`)
    }

    if (typeof value.findingStatus === "string") {
      const normalized = normalizeWorkflowValue(value.findingStatus)
      if (normalized === "resolved" || normalized === "dismissed" || normalized === "under_monitoring") {
        errors.push(`${displayMutationPath(path)}.findingStatus cannot be ${value.findingStatus} by orchestrator`)
      }
    }
    if (typeof value.exportReadinessStatus === "string") {
      const normalized = normalizeWorkflowValue(value.exportReadinessStatus)
      if (normalized === "approved") {
        errors.push(`${displayMutationPath(path)}.exportReadinessStatus cannot be approved by orchestrator`)
      }
    }
    if (typeof value.packKind === "string") {
      const normalized = normalizeWorkflowValue(value.packKind)
      if (normalized === "final") {
        errors.push(`${displayMutationPath(path)}.packKind cannot be final by orchestrator`)
      }
    }

    const approvalStatus =
      typeof value.approvalStatus === "string"
        ? value.approvalStatus
        : typeof value.evidenceStatus === "string"
          ? value.evidenceStatus
          : typeof value.status === "string" && path.includes("evidenceRequests[")
            ? value.status
            : undefined
    if (approvalStatus && normalizeWorkflowValue(approvalStatus) === "approved") {
      const fieldName = typeof value.approvalStatus === "string"
        ? "approvalStatus"
        : typeof value.evidenceStatus === "string"
          ? "evidenceStatus"
          : "status"
      errors.push(`${displayMutationPath(path)}.${fieldName} cannot be approved by orchestrator`)
    }
  })
}

function isSourceCitableAsLaw(source: LegalSourceValidationMetadata | undefined) {
  if (!source) return true
  if (source.canBeCitedAsLaw === false) return false
  if (source.legalWeight === "internal_context") return false
  if (source.sourceType === "internal_monography" || source.sourceType === "internal_template") return false
  return true
}

function walkProposal(
  value: unknown,
  path: string,
  visitor: (value: unknown, path: string) => void,
) {
  visitor(value, path)
  if (Array.isArray(value)) {
    value.forEach((item, index) => walkProposal(item, `${path}[${index}]`, visitor))
    return
  }
  if (!isRecord(value)) return

  Object.entries(value).forEach(([key, child]) => {
    walkProposal(child, path === "proposal" ? `proposal.${key}` : `${path}.${key}`, visitor)
  })
}

function displayMutationPath(path: string) {
  return path.replace(
    /^proposal\.(proposedFindings|evidenceRequests|reviewTasks|nextActions|exportBlockers|clientQuestions|obsoleteCandidates)(?=\.|\[|$)/,
    "$1",
  )
}

function normalizeWorkflowValue(value: string) {
  return value.trim().toLowerCase().replace(/[\s-]+/g, "_")
}

function validateFindingEvidenceCoverage(
  proposedFindings: unknown[],
  evidenceRequests: unknown[],
  errors: string[],
) {
  proposedFindings.forEach((finding, index) => {
    if (!isRecord(finding)) return
    const requiredEvidence = Array.isArray(finding.requiredEvidence)
      ? finding.requiredEvidence.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      : []

    if (requiredEvidence.length === 0) return

    const coveredEvidence = new Set<string>()
    for (const request of evidenceRequests) {
      if (!isRecord(request)) continue
      if (typeof request.evidenceType !== "string" || request.evidenceType.trim().length === 0) continue
      if (!evidenceRequestTargetsFinding(request, finding)) continue
      coveredEvidence.add(request.evidenceType)
    }

    const missing = requiredEvidence.filter((evidenceType) => !coveredEvidence.has(evidenceType))
    if (missing.length > 0) {
      errors.push(
        `proposedFindings[${index}] missing evidenceRequests for requiredEvidence: ${missing.join(", ")}`
      )
    }
  })
}

function evidenceRequestTargetsFinding(
  request: Record<string, unknown>,
  finding: Record<string, unknown>,
) {
  const findingCode = typeof finding.code === "string" ? finding.code : ""
  const findingEntityType = typeof finding.linkedEntityType === "string" ? finding.linkedEntityType : ""
  const findingEntityId = typeof finding.linkedEntityId === "string" ? finding.linkedEntityId : ""
  const requestFindingCode = typeof request.linkedFindingCode === "string" ? request.linkedFindingCode : ""
  const requestEntityType = typeof request.linkedEntityType === "string" ? request.linkedEntityType : ""
  const requestEntityId = typeof request.linkedEntityId === "string" ? request.linkedEntityId : ""

  if (requestFindingCode && findingCode && requestFindingCode === findingCode) return true
  if (requestEntityType && requestEntityId && requestEntityType === findingEntityType && requestEntityId === findingEntityId) {
    return true
  }
  return false
}

function validateArray(value: unknown, path: string, errors: string[]) {
  if (!Array.isArray(value)) errors.push(`proposal.${path} must be an array`)
}

function validateProposedFinding(
  item: unknown,
  index: number,
  legalContext: unknown[],
  context: OrchestratorValidationContext,
  errors: string[],
  warnings: string[],
) {
  const path = `proposedFindings[${index}]`
  if (!isRecord(item)) {
    errors.push(`${path} must be an object`)
    return
  }

  requireString(item.code, `${path}.code`, errors)
  requireString(item.title, `${path}.title`, errors)
  requireString(item.reason, `${path}.reason`, errors)

  if (typeof item.severity !== "string" || !ALLOWED_SEVERITIES.has(item.severity)) {
    errors.push(`${path}.severity is invalid`)
  }
  if (typeof item.ownerRole !== "string" || !ALLOWED_OWNER_ROLES.has(item.ownerRole)) {
    errors.push(`${path}.ownerRole is invalid`)
  }
  if (item.finalLegalVerdict !== false) {
    errors.push(`${path}.finalLegalVerdict must be false`)
  }
  validateLinkedEntityScope(item, path, context, errors)

  if (!Array.isArray(item.legalBasis) || item.legalBasis.length === 0) {
    errors.push(`${path}.legalBasis must contain at least one source`)
  } else {
    item.legalBasis.forEach((basis, basisIndex) =>
      validateLegalBasis(basis, `${path}.legalBasis[${basisIndex}]`, legalContext, errors)
    )
  }

  if (!Array.isArray(item.requiredEvidence) || item.requiredEvidence.length === 0) {
    errors.push(`${path}.requiredEvidence must contain at least one item`)
  } else if (item.requiredEvidence.some((entry) => typeof entry !== "string" || !entry.trim())) {
    errors.push(`${path}.requiredEvidence entries must be non-empty strings`)
  }

  if (typeof item.riskDraft === "string") {
    const normalized = item.riskDraft.trim().toLowerCase().replace(/[_\s]+/g, "_")
    if (FORBIDDEN_FINAL_RISK_DRAFTS.has(normalized)) {
      errors.push(`${path}.riskDraft cannot be ${item.riskDraft}`)
    }
    if (normalized === "high_risk_candidate" || normalized === "prohibited_candidate") {
      warnings.push(`${path}.riskDraft is candidate-only and still needs human review`)
    }
  }
}

function validateLegalBasis(value: unknown, path: string, legalContext: unknown[], errors: string[]) {
  if (!isRecord(value)) {
    errors.push(`${path} must be an object`)
    return
  }
  const basis = value as Partial<OrchestratorLegalBasis>
  if (!["EU_AI_ACT", "GDPR", "CONTRACT", "INTERNAL_POLICY"].includes(String(basis.instrument))) {
    errors.push(`${path}.instrument is invalid`)
  }
  if (
    (typeof basis.article !== "string" || !basis.article.trim()) &&
    (typeof basis.annex !== "string" || !basis.annex.trim()) &&
    (typeof basis.note !== "string" || !basis.note.trim())
  ) {
    errors.push(`${path} must include article, annex, or note`)
  }

  const instrument = String(basis.instrument)
  if (instrument === "EU_AI_ACT" || instrument === "GDPR") {
    const matchingContext = legalContext.filter(
      (entry): entry is Record<string, unknown> => isRecord(entry) && String(entry.instrument) === instrument,
    )

    if (matchingContext.length === 0) {
      errors.push(`${path} is not grounded in proposal.legalContext`)
      return
    }

    const basisReference = [
      typeof basis.article === "string" ? basis.article : undefined,
      typeof basis.annex === "string" ? basis.annex : undefined,
      typeof basis.note === "string" ? basis.note : undefined,
    ].find((entry) => typeof entry === "string" && entry.trim().length > 0)

    if (!basisReference) return

    const normalizedBasisReference = normalizeReference(basisReference)
    const isGrounded = matchingContext.some((entry) => {
      const reference = typeof entry.reference === "string" ? entry.reference : ""
      const normalizedContextReference = normalizeReference(reference)
      return (
        normalizedBasisReference.includes(normalizedContextReference) ||
        normalizedContextReference.includes(normalizedBasisReference)
      )
    })

    if (!isGrounded) {
      errors.push(`${path} is not grounded in proposal.legalContext`)
    }
  }
}

function validateOwnerRole(value: unknown, path: string, errors: string[]) {
  if (typeof value !== "string" || !ALLOWED_OWNER_ROLES.has(value)) {
    errors.push(`${path} is invalid`)
  }
}

function validateOptionalLinkedEntityType(value: unknown, path: string, errors: string[]) {
  if (value === undefined) return
  if (typeof value !== "string" || !ALLOWED_LINKED_ENTITY_TYPES.has(value)) {
    errors.push(`${path} is invalid`)
  }
}

function validateOptionalStringArray(value: unknown, path: string, errors: string[]) {
  if (value === undefined) return
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string" || !entry.trim())) {
    errors.push(`${path} must be an array of non-empty strings`)
  }
}

function validateLinkedEntityScope(
  item: Record<string, unknown>,
  path: string,
  context: OrchestratorValidationContext,
  errors: string[],
) {
  const linkedEntityType = typeof item.linkedEntityType === "string" ? item.linkedEntityType : undefined
  const linkedEntityId = typeof item.linkedEntityId === "string" ? item.linkedEntityId : undefined

  if (linkedEntityId && !linkedEntityType) {
    errors.push(`${path}.linkedEntityType is required when linkedEntityId is present`)
    return
  }
  if (!linkedEntityType || !linkedEntityId) return

  const allowedForType = context.allowedLinkedEntityIdsByType?.[
    linkedEntityType as keyof NonNullable<OrchestratorValidationContext["allowedLinkedEntityIdsByType"]>
  ]
  if (Array.isArray(allowedForType) && allowedForType.length > 0 && !allowedForType.includes(linkedEntityId)) {
    errors.push(`${path}.linkedEntityId is outside the scoped ${linkedEntityType} context`)
  }
}

function validateLinkedFindingCode(
  value: unknown,
  path: string,
  proposedFindingCodes: Set<string>,
  context: OrchestratorValidationContext,
  errors: string[],
) {
  if (value === undefined) return
  if (typeof value !== "string" || !value.trim()) {
    errors.push(`${path} is invalid`)
    return
  }

  const allowed = new Set<string>([
    ...proposedFindingCodes,
    ...(context.allowedFindingCodes ?? []),
  ])
  if (allowed.size > 0 && !allowed.has(value)) {
    errors.push(`${path} is outside the scoped finding context`)
  }
}

function normalizeReference(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function requireString(value: unknown, path: string, errors: string[]) {
  if (typeof value !== "string" || !value.trim()) errors.push(`${path} is required`)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}
