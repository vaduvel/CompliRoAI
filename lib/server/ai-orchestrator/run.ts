import type { ComplianceState } from "@/lib/compliance/types"
import { LEGAL_SOURCE_REGISTRY } from "@/lib/compliance/orchestrator-knowledge-governance"
import {
  buildAppStateSnapshot,
  fingerprintSnapshot,
  type OrchestratorWorkspaceMode,
} from "./state-snapshot"
import {
  requestMistralOrchestratorProposal,
  type MistralOrchestratorRequest,
  type MistralOrchestratorResult,
} from "./mistral-client"
import { canonicalizeOrchestratorProposal } from "./canonicalize"
import { validateOrchestratorProposal } from "./validator"
import type {
  OrchestratorLinkedEntityType,
  OrchestratorLegalContextReference,
  OrchestratorProposal,
  OrchestratorValidationContext,
  OrchestratorValidationResult,
} from "./types"

export type ComplianceOrchestratorRunInput = {
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
  ragSourceIds: string[]
  mistral?: Pick<MistralOrchestratorRequest, "apiKey" | "model" | "fetchImpl" | "timeoutMs" | "maxTokens">
}

export type ComplianceOrchestratorAuditEvent = {
  type: "orchestrator.plan_generated" | "orchestrator.plan_rejected" | "orchestrator.fallback_generated"
  orgId: string
  clientId?: string
  aiProjectId?: string
  inputSnapshotHash: string
  source: "mistral_rag" | "deterministic"
  createdAtISO: string
  actorId: string
}

export type ComplianceOrchestratorRunResult = {
  status: "validated" | "fallback_deterministic"
  source: "mistral_rag" | "deterministic"
  inputSnapshotHash: string
  proposal: OrchestratorProposal
  validation: OrchestratorValidationResult
  auditEvent: ComplianceOrchestratorAuditEvent
}

type MistralOrchestratorRequestFailureReason = Extract<
  MistralOrchestratorResult,
  { ok: false }
>["reason"]

export async function runComplianceOrchestrator(
  input: ComplianceOrchestratorRunInput,
): Promise<ComplianceOrchestratorRunResult> {
  const snapshot = buildAppStateSnapshot(input)
  const inputSnapshotHash = fingerprintSnapshot(snapshot)
  const fallback = buildDeterministicFallbackProposal(snapshot)
  const validationContext = buildValidationContext(input, snapshot)
  const mistralRequestBase = {
    apiKey: input.mistral?.apiKey,
    model: input.mistral?.model,
    fetchImpl: input.mistral?.fetchImpl,
    timeoutMs: input.mistral?.timeoutMs ?? 45_000,
    maxTokens: input.mistral?.maxTokens ?? 4_000,
  } satisfies Pick<MistralOrchestratorRequest, "apiKey" | "model" | "fetchImpl" | "timeoutMs" | "maxTokens">

  const mistralPrompt = buildMistralPrompt({
    snapshot,
    ragSourceIds: input.ragSourceIds,
    deterministicFallback: fallback,
  })

  let mistralResult = await requestMistralOrchestratorProposal({
    ...mistralRequestBase,
    prompt: mistralPrompt,
  })

  for (
    let retryAttempt = 1;
    !mistralResult.ok && shouldRetryMistralRequest(mistralResult.reason, mistralResult.status) && retryAttempt <= 2;
    retryAttempt += 1
  ) {
    const retryReason = mistralResult.reason
    const retryStatus = mistralResult.status
    await sleep(retryDelayMs(retryReason, retryStatus, retryAttempt))
    mistralResult = await requestMistralOrchestratorProposal({
      ...mistralRequestBase,
      timeoutMs: extendRetryTimeout(mistralRequestBase.timeoutMs),
      maxTokens: retryReason === "mistral_truncated_json"
        ? extendRetryMaxTokens(mistralRequestBase.maxTokens)
        : mistralRequestBase.maxTokens,
      prompt: mistralPrompt,
    })
  }

  if (!mistralResult.ok) {
    return {
      status: "fallback_deterministic",
      source: "deterministic",
      inputSnapshotHash,
      proposal: fallback,
      validation: { ok: true, proposal: fallback, warnings: [`mistral:${mistralResult.reason}`] },
      auditEvent: buildAuditEvent("orchestrator.fallback_generated", input, inputSnapshotHash, "deterministic"),
    }
  }

  let canonicalProposal: OrchestratorProposal
  try {
    canonicalProposal = repairProposalAgainstDeterministicFallback(
      canonicalizeOrchestratorProposal(mistralResult.proposal),
      fallback,
    )
  } catch (error) {
    const reason = error instanceof Error ? error.message : "canonicalization_failed"
    return {
      status: "fallback_deterministic",
      source: "deterministic",
      inputSnapshotHash,
      proposal: fallback,
      validation: { ok: true, proposal: fallback, warnings: [`mistral:canonicalization_failed:${reason}`] },
      auditEvent: buildAuditEvent("orchestrator.fallback_generated", input, inputSnapshotHash, "deterministic"),
    }
  }
  const validation = validateOrchestratorProposal(canonicalProposal, {
    ...validationContext,
  })

  if (!validation.ok && shouldRetryInvalidProposal(validation.errors)) {
    const retryResult = await requestMistralOrchestratorProposal({
      ...mistralRequestBase,
      prompt: buildMistralPrompt({
        snapshot,
        ragSourceIds: input.ragSourceIds,
        deterministicFallback: fallback,
        retryErrors: validation.errors,
      }),
    })

    if (retryResult.ok) {
      const retryCanonical = repairProposalAgainstDeterministicFallback(
        canonicalizeOrchestratorProposal(retryResult.proposal),
        fallback,
      )
      const retryValidation = validateOrchestratorProposal(retryCanonical, {
        ...validationContext,
      })
      if (retryValidation.ok) {
        return {
          status: "validated",
          source: "mistral_rag",
          inputSnapshotHash,
          proposal: retryValidation.proposal,
          validation: retryValidation,
          auditEvent: buildAuditEvent("orchestrator.plan_generated", input, inputSnapshotHash, "mistral_rag"),
        }
      }
    }
  }

  if (!validation.ok) {
    return {
      status: "fallback_deterministic",
      source: "deterministic",
      inputSnapshotHash,
      proposal: fallback,
      validation,
      auditEvent: buildAuditEvent("orchestrator.plan_rejected", input, inputSnapshotHash, "deterministic"),
    }
  }

  return {
    status: "validated",
    source: "mistral_rag",
    inputSnapshotHash,
    proposal: validation.proposal,
    validation,
    auditEvent: buildAuditEvent("orchestrator.plan_generated", input, inputSnapshotHash, "mistral_rag"),
  }
}

function buildDeterministicFallbackProposal(snapshot: ReturnType<typeof buildAppStateSnapshot>): OrchestratorProposal {
  const openFindings = snapshot.findings.filter((finding) =>
    !["resolved", "dismissed"].includes(finding.findingStatus ?? "open")
  )
  const proposedFindings = openFindings.map((finding) => ({
    code: finding.id,
    title: finding.title,
    reason: finding.legalReference || "Finding activ ce necesită dovadă și review uman.",
    severity: finding.severity,
    ownerRole: ownerRoleFromFinding(finding.ownerSuggestion),
    linkedEntityType: "finding" as const,
    linkedEntityId: finding.id,
    legalBasis: legalBasisFromReference(finding.legalReference),
    requiredEvidence: splitEvidence(finding.evidenceRequired),
    finalLegalVerdict: false as const,
  }))
  const evidenceRequests = proposedFindings.flatMap((finding) =>
    finding.requiredEvidence.map((evidenceType, index) => ({
      code: `${finding.code}-evidence-${index + 1}`,
      linkedFindingCode: finding.code,
      linkedEntityType: "finding" as const,
      linkedEntityId: finding.linkedEntityId,
      evidenceType,
      title: `Atașează dovada pentru ${finding.title}`,
      ownerRole: finding.ownerRole,
    }))
  )
  const reviewTasks = openFindings
    .filter((finding) => (finding.reviewState ?? "unreviewed") !== "closed")
    .map((finding) => ({
      code: `${finding.id}-review`,
      title: `Revizuiește finding-ul: ${finding.title}`,
      ownerRole: ownerRoleFromFinding(finding.ownerSuggestion),
      reviewStatus: reviewStatusFromFinding(finding.reviewState),
      linkedFindingCode: finding.id,
      linkedEntityType: "finding" as const,
      linkedEntityId: finding.id,
    }))

  return {
    schemaVersion: "orchestrator.v1",
    finalLegalVerdict: false,
    legalContext: [],
    proposedFindings,
    evidenceRequests,
    reviewTasks,
    nextActions: [
      {
        code: "review_current_compliance_state",
        title: snapshot.aiUseCases.length > 0
          ? "Revizuiește registrul AI și findings deschise"
          : "Pornește discovery: intake, registru AI și AI Literacy baseline",
        priority: "P1",
        targetHref: snapshot.aiUseCases.length > 0 ? "/dashboard/resolve" : "/dashboard/clienti",
        ownerRole: "cabinet_consultant",
      },
    ],
    exportBlockers: snapshot.openFindingsCount > 0
      ? [
          {
            code: "open_findings_block_final_export",
            exportType: "audit_pack",
            reason: "Există findings deschise care necesită dovadă și review uman.",
            severity: "medium",
            blockedUntil: "reviewed",
          },
        ]
      : [],
    clientQuestions: snapshot.aiUseCases.length === 0
      ? [
          {
            code: "confirm_ai_usage",
            question: "Ce tooluri AI folosește compania pe departamente?",
            ownerRole: "client_admin",
          },
        ]
      : [],
    obsoleteCandidates: [],
    modelNotes: [
      "Fallback determinist. Nu conține verdict legal final și nu aprobă automat nimic.",
    ],
  }
}

function ownerRoleFromFinding(value: string | undefined): "cabinet_consultant" | "dpo" | "legal" | "management" | "marketing" | "customer_support" | "it_security" | "product_owner" | "procurement" {
  const raw = (value ?? "").toLowerCase()
  if (raw.includes("legal") || raw.includes("jur")) return "legal"
  if (raw.includes("procurement") || raw.includes("vendor")) return "procurement"
  if (raw.includes("support")) return "customer_support"
  if (raw.includes("marketing")) return "marketing"
  if (raw.includes("management") || raw.includes("owner")) return "management"
  if (raw.includes("security") || raw.includes("it")) return "it_security"
  if (raw.includes("product")) return "product_owner"
  if (raw.includes("cabinet") || raw.includes("consultant")) return "cabinet_consultant"
  return "dpo"
}

function legalBasisFromReference(reference: string | undefined): Array<{
  instrument: "EU_AI_ACT" | "GDPR" | "CONTRACT" | "INTERNAL_POLICY"
  article?: string
}> {
  if (!reference) return []
  const normalized = reference.toLowerCase()
  if (normalized.includes("gdpr")) {
    return [{ instrument: "GDPR", article: reference.replace(/^GDPR\s*/i, "").trim() || reference }]
  }
  if (normalized.includes("ai act")) {
    return [{ instrument: "EU_AI_ACT", article: reference.replace(/^AI Act\s*/i, "").trim() || reference }]
  }
  return [{ instrument: "INTERNAL_POLICY", article: reference }]
}

function splitEvidence(value: string | undefined): string[] {
  if (!value) return []
  return value
    .split(/[;,\n]+|\s+și\s+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function reviewStatusFromFinding(
  value: string | undefined,
): "needs_review" | "needs_dpo_review" | "needs_lawyer_review" | "needs_it_security_review" | "needs_management_approval" | "needs_client_approval" {
  const raw = (value ?? "").toLowerCase()
  if (raw.includes("lawyer")) return "needs_lawyer_review"
  if (raw.includes("security") || raw.includes("it")) return "needs_it_security_review"
  if (raw.includes("management")) return "needs_management_approval"
  if (raw.includes("client")) return "needs_client_approval"
  if (raw.includes("dpo")) return "needs_dpo_review"
  return "needs_review"
}

function buildMistralPrompt(input: {
  snapshot: ReturnType<typeof buildAppStateSnapshot>
  ragSourceIds: string[]
  deterministicFallback: OrchestratorProposal
  retryErrors?: string[]
}) {
  const compactSnapshot = compactSnapshotForPrompt(input.snapshot)
  const compactFallback = compactFallbackForPrompt(input.deterministicFallback)
  const exemplar = buildPromptExemplar(input.deterministicFallback, input.ragSourceIds)

  return JSON.stringify({
    task: "Create a CompliRoAI guided execution plan. Return only JSON.",
    lawTruth: "EU AI Act and GDPR official texts are primary legal truth. Deterministic engine applies the law. You orchestrate work only.",
    forbidden: [
      "final legal verdict",
      "auto-resolve finding",
      "approve evidence",
      "fully compliant claim",
      "source outside RagContext",
      "entity outside scoped tenant context",
    ],
    requiredRootKeys: [
      "schemaVersion",
      "finalLegalVerdict",
      "legalContext",
      "proposedFindings",
      "evidenceRequests",
      "reviewTasks",
      "nextActions",
      "exportBlockers",
      "clientQuestions",
      "obsoleteCandidates",
    ],
    outputRules: {
      userFacingLanguage: "ro",
      keepTopPriorityActionsShort: true,
      preferExistingDeterministicCandidates: true,
      useExactDeterministicTitlesWhenAvailable: true,
      useExactDeterministicEvidenceCodesOnly: true,
      doNotInventGenericEvidenceCodes: true,
      doNotCopyEnglishExemplarFallbackText: true,
      unknownFactsBecomeClientQuestions: true,
      noFinalVerdicts: true,
      everyRootArrayMustExist: true,
      useEmptyArraysInsteadOfOmittingKeys: true,
      everyRequiredEvidenceMustHaveMatchingEvidenceRequest: true,
      evidenceRequestsMustLinkBackToFindingOrEntity: true,
      everyLegalBasisMustBeGroundedInLegalContext: true,
      everyLinkedEntityMustStayInsideScopedTenantContext: true,
      keepResponseCompact: true,
      avoidMirroringEveryOpenFindingWhenRepetitive: true,
      preferTopBlockersAndHighestValueStepsOnly: true,
      focusOnScopedContextOnly: true,
    },
    prioritizationRules: [
      "Prioritize export blockers and open findings with direct legal impact before baseline hygiene work.",
      "When personal data, chatbot transparency, vendor review, or human oversight blockers exist, keep them ahead of AI literacy actions.",
      "AI literacy remains important but should not displace concrete remediation blockers already open in the workspace.",
      "Work only on the scoped use cases, scoped systems, top findings, and deterministic blockers provided in this prompt.",
      "Use Romanian for every user-facing title, question, reason, and action.",
      "Prefer deterministic finding and evidence titles exactly; do not invent placeholder titles.",
      "Return only the highest-impact subset. The deterministic plan already contains the complete backlog.",
    ],
    responseBudget: {
      proposedFindingsMax: 2,
      evidenceRequestsMax: 4,
      reviewTasksMax: 2,
      nextActionsMax: 2,
      exportBlockersMax: 1,
      clientQuestionsMax: 1,
      obsoleteCandidatesMax: 1,
      modelNotesMax: 1,
      maxStringChars: 120,
    },
    allowedEnums: {
      ownerRoles: [
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
      ],
      severities: ["info", "low", "medium", "high", "critical", "blocker"],
      reviewStatuses: [
        "needs_review",
        "needs_dpo_review",
        "needs_lawyer_review",
        "needs_it_security_review",
        "needs_management_approval",
        "needs_client_approval",
      ],
      priorities: ["P0", "P1", "P2", "P3"],
      linkedEntityTypes: [
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
      ],
      legalInstruments: ["EU_AI_ACT", "GDPR", "CONTRACT", "INTERNAL_POLICY"],
    },
    responseShape: {
      schemaVersion: "orchestrator.v1",
      finalLegalVerdict: false,
      legalContext: [
        {
          sourceId: exemplar.sourceId,
          instrument: exemplar.instrument,
          reference: exemplar.reference,
          whyRelevant: "Primary law source relevant for the top remediation step.",
        },
      ],
      proposedFindings: [
        {
          code: exemplar.finding.code,
          title: exemplar.finding.title,
          reason: exemplar.finding.reason,
          severity: exemplar.finding.severity,
          ownerRole: exemplar.finding.ownerRole,
          linkedEntityType: exemplar.finding.linkedEntityType,
          linkedEntityId: exemplar.finding.linkedEntityId,
          legalBasis: exemplar.finding.legalBasis,
          requiredEvidence: exemplar.finding.requiredEvidence,
          finalLegalVerdict: false,
        },
      ],
      evidenceRequests: [
        {
          code: exemplar.evidenceRequest.code,
          linkedFindingCode: exemplar.evidenceRequest.linkedFindingCode,
          linkedEntityType: exemplar.evidenceRequest.linkedEntityType,
          linkedEntityId: exemplar.evidenceRequest.linkedEntityId,
          evidenceType: exemplar.evidenceRequest.evidenceType,
          title: exemplar.evidenceRequest.title,
          ownerRole: exemplar.evidenceRequest.ownerRole,
          requiredMetadata: ["capturedAt"],
        },
      ],
      reviewTasks: [
        {
          code: exemplar.reviewTask.code,
          title: exemplar.reviewTask.title,
          ownerRole: exemplar.reviewTask.ownerRole,
          reviewStatus: exemplar.reviewTask.reviewStatus,
          linkedFindingCode: exemplar.reviewTask.linkedFindingCode,
          linkedEntityType: exemplar.reviewTask.linkedEntityType,
          linkedEntityId: exemplar.reviewTask.linkedEntityId,
        },
      ],
      nextActions: [
        {
          code: exemplar.nextAction.code,
          title: exemplar.nextAction.title,
          priority: exemplar.nextAction.priority,
          targetHref: exemplar.nextAction.targetHref,
          ownerRole: exemplar.nextAction.ownerRole,
        },
      ],
      exportBlockers: [
        {
          code: exemplar.exportBlocker.code,
          exportType: exemplar.exportBlocker.exportType,
          reason: exemplar.exportBlocker.reason,
          severity: exemplar.exportBlocker.severity,
          blockedUntil: exemplar.exportBlocker.blockedUntil,
        },
      ],
      clientQuestions: [
        {
          code: exemplar.clientQuestion.code,
          question: exemplar.clientQuestion.question,
          ownerRole: exemplar.clientQuestion.ownerRole,
          linkedEntityType: exemplar.clientQuestion.linkedEntityType,
          linkedEntityId: exemplar.clientQuestion.linkedEntityId,
        },
      ],
      obsoleteCandidates: [],
    },
    retryFeedback: input.retryErrors?.length
      ? {
          previousAttemptInvalid: true,
          fixTheseSchemaErrors: input.retryErrors.slice(0, 8),
          instruction: [
            "Return the same JSON schema again.",
            "Include every root array and keep the response compact.",
            "Ensure every proposed finding has evidenceRequests covering all requiredEvidence items.",
            "Ensure every legalBasis object has instrument and at least one of article, annex, or note.",
            "Ensure every EU_AI_ACT or GDPR legalBasis is grounded in the legalContext entries you return.",
            "Do not reference entities or findings outside the scoped tenant context from the prompt.",
          ].join(" "),
        }
      : undefined,
    snapshotSummary: compactSnapshot.summary,
    scopedContextFocus: compactSnapshot.focus,
    scopedAIUseCases: compactSnapshot.aiUseCases,
    scopedAISystems: compactSnapshot.aiSystems,
    ragSourceIds: input.ragSourceIds,
    deterministicPack: compactFallback,
  })
}

function shouldRetryInvalidProposal(errors: string[]) {
  if (errors.length === 0) return false
  return errors.every((error) =>
    error.includes("must be an array") ||
    error.includes("whyRelevant is required") ||
    error.includes("missing evidenceRequests for requiredEvidence") ||
    error.includes("legalBasis") ||
    error.includes("not grounded in proposal.legalContext") ||
    error.includes("must include article, annex, or note") ||
    error.includes("obsoleteCandidates[")
  )
}

function shouldRetryMistralRequest(
  reason: MistralOrchestratorRequestFailureReason,
  status?: number,
) {
  return (
    reason === "mistral_timeout" ||
    reason === "mistral_network_error" ||
    reason === "mistral_truncated_json" ||
    (reason === "mistral_http_error" &&
      typeof status === "number" &&
      (status === 408 || status === 409 || status === 429 || status >= 500))
  )
}

function retryDelayMs(
  reason: MistralOrchestratorRequestFailureReason,
  status: number | undefined,
  attempt: number,
) {
  if (reason === "mistral_http_error" && status === 429) {
    return attempt === 1 ? 6_000 : 12_000
  }
  return attempt === 1 ? 1_500 : 3_000
}

function extendRetryTimeout(timeoutMs: number | undefined) {
  const baseTimeout = timeoutMs ?? 45_000
  return Math.min(Math.max(baseTimeout * 2, 60_000), 180_000)
}

function extendRetryMaxTokens(maxTokens: number | undefined) {
  const baseTokens = maxTokens ?? 4_000
  return Math.min(Math.max(baseTokens * 2, 4_000), 8_000)
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

function compactSnapshotForPrompt(snapshot: ReturnType<typeof buildAppStateSnapshot>) {
  const aiUseCasesRanked = [...snapshot.aiUseCases].sort((left, right) => {
    const riskDelta = Number(right.highRiskCandidate) - Number(left.highRiskCandidate)
    if (riskDelta !== 0) return riskDelta
    const prohibitedDelta = Number(right.prohibitedCandidate) - Number(left.prohibitedCandidate)
    if (prohibitedDelta !== 0) return prohibitedDelta
    return (right.openFindingsCount ?? 0) - (left.openFindingsCount ?? 0)
  })

  const aiUseCases = [...snapshot.aiUseCases]
    .sort((left, right) => {
      const riskDelta = Number(right.highRiskCandidate) - Number(left.highRiskCandidate)
      if (riskDelta !== 0) return riskDelta
      return (right.openFindingsCount ?? 0) - (left.openFindingsCount ?? 0)
    })
    .slice(0, 6)
    .map((record) => ({
      id: record.id,
      useCaseName: record.useCaseName,
      department: record.department,
      businessProcess: record.businessProcess,
      toolName: record.toolName,
      vendorName: record.vendorName,
      usesPersonalData: record.usesPersonalData,
      humanReview: record.humanReview,
      directInteractionWithPersons: record.directInteractionWithPersons,
      draftRiskLevel: record.draftRiskLevel,
      openFindingsCount: record.openFindingsCount,
    }))

  const aiSystems = snapshot.aiSystems
    .slice(0, 6)
    .map((record) => ({
      id: record.id,
      name: record.name,
      purpose: record.purpose,
      vendor: record.vendor,
      usesPersonalData: record.usesPersonalData,
      hasHumanReview: record.hasHumanReview,
      riskLevel: record.riskLevel,
      reviewStatus: record.reviewStatus,
    }))

  const findings = [...snapshot.findings]
    .filter((finding) => !["resolved", "dismissed"].includes(finding.findingStatus ?? "open"))
    .sort(compareFindingsForPrompt)
    .slice(0, 6)
    .map((finding) => ({
      id: finding.id,
      title: finding.title,
      category: finding.category,
      severity: finding.severity,
      legalReference: finding.legalReference,
      requiredEvidenceHints: splitEvidence(finding.evidenceRequired).slice(0, 3),
      requiredEvidenceCount: splitEvidence(finding.evidenceRequired).length,
      reviewState: finding.reviewState,
      ownerSuggestion: finding.ownerSuggestion,
    }))

  return {
    summary: {
      workspaceMode: snapshot.workspaceMode,
      orgId: snapshot.orgId,
      clientId: snapshot.clientId,
      aiUseCasesCount: snapshot.aiUseCases.length,
      aiSystemsCount: snapshot.aiSystems.length,
      openFindingsCount: snapshot.openFindingsCount,
      dataProcessesCount: snapshot.dataProcessesCount,
      literacyRecordsCount: snapshot.literacyRecordsCount,
      evidenceAttachedCount: snapshot.evidenceAttachedCount,
      generatedDocumentsCount: snapshot.generatedDocumentsCount,
      dataCertaintySummary: snapshot.dataCertaintySummary,
      includedAIUseCases: aiUseCases.length,
      includedAISystems: aiSystems.length,
      includedOpenFindings: findings.length,
      truncated: {
        aiUseCases: snapshot.aiUseCases.length > aiUseCases.length,
        aiSystems: snapshot.aiSystems.length > aiSystems.length,
        findings: snapshot.findings.filter((finding) => !["resolved", "dismissed"].includes(finding.findingStatus ?? "open")).length > findings.length,
      },
    },
    focus: {
      topUseCaseNames: aiUseCasesRanked
        .slice(0, 3)
        .map((record) => record.useCaseName),
      topFindingTitles: findings
        .slice(0, 4)
        .map((finding) => finding.title),
      topRiskSignals: aiUseCasesRanked
        .slice(0, 4)
        .map((record) => [
          record.useCaseName,
          record.draftRiskLevel,
          record.usesPersonalData,
          record.directInteractionWithPersons,
        ]
          .filter(Boolean)
          .join(" | ")),
    },
    aiUseCases,
    aiSystems,
    findings,
  }
}

function buildPromptExemplar(
  fallback: OrchestratorProposal,
  ragSourceIds: string[],
) {
  const sourceId = ragSourceIds[0] ?? "src_eu_ai_act_2024_1689"
  const topFinding = fallback.proposedFindings[0] ?? {
    code: "top_remediation_finding",
    title: "Rezolvă principalul blocker de compliance",
    reason: "Folosește findings deterministe ca punct de plecare și păstrează planul orientat pe acțiuni.",
    severity: "high" as const,
    ownerRole: "dpo" as const,
    linkedEntityType: "ai_use_case" as const,
    linkedEntityId: "entity-id",
    legalBasis: [{ instrument: "EU_AI_ACT" as const, article: "Art. 50" }],
    requiredEvidence: ["transparency_notice_text"],
    finalLegalVerdict: false as const,
  }
  const topEvidenceType = topFinding.requiredEvidence[0] ?? "transparency_notice_text"
  const topReviewTask = fallback.reviewTasks[0] ?? {
    code: `${topFinding.code}-review`,
    title: `Revizuiește finding-ul: ${topFinding.title}`,
    ownerRole: topFinding.ownerRole,
    reviewStatus: "needs_review" as const,
    linkedFindingCode: topFinding.code,
    linkedEntityType: topFinding.linkedEntityType,
    linkedEntityId: topFinding.linkedEntityId,
  }
  const topNextAction = fallback.nextActions[0] ?? {
    code: "open_resolve",
    title: "Deschide flow-ul de remediere prioritar",
    priority: "P1" as const,
    targetHref: "/dashboard/resolve",
    ownerRole: topFinding.ownerRole,
  }
  const topExportBlocker = fallback.exportBlockers[0] ?? {
    code: "open_findings_block_final_export",
    exportType: "audit_pack",
    reason: "Findings deschise blochează încă exportul final.",
    severity: "high" as const,
    blockedUntil: "reviewed" as const,
  }
  const topClientQuestion = fallback.clientQuestions[0] ?? {
    code: "confirm_missing_fact",
    question: "Clarifică faptul lipsă care blochează remedierea.",
    ownerRole: "client_admin" as const,
    linkedEntityType: topFinding.linkedEntityType,
    linkedEntityId: topFinding.linkedEntityId,
  }
  const firstLegalBasis = topFinding.legalBasis[0]

  return {
    sourceId,
    instrument: firstLegalBasis?.instrument ?? "EU_AI_ACT",
    reference: firstLegalBasis?.article ?? firstLegalBasis?.annex ?? firstLegalBasis?.note ?? "Art. 50",
    finding: topFinding,
    evidenceRequest: {
      code: `${topFinding.code}-evidence-1`,
      linkedFindingCode: topFinding.code,
      linkedEntityType: topFinding.linkedEntityType,
      linkedEntityId: topFinding.linkedEntityId,
      evidenceType: topEvidenceType,
      title: `Atașează dovada pentru ${topFinding.title}`,
      ownerRole: topFinding.ownerRole,
    },
    reviewTask: topReviewTask,
    nextAction: topNextAction,
    exportBlocker: topExportBlocker,
    clientQuestion: topClientQuestion,
  }
}

function compactFallbackForPrompt(fallback: OrchestratorProposal) {
  return {
    summary: {
      proposedFindingsCount: fallback.proposedFindings.length,
      evidenceRequestsCount: fallback.evidenceRequests.length,
      reviewTasksCount: fallback.reviewTasks.length,
      nextActionsCount: fallback.nextActions.length,
      exportBlockersCount: fallback.exportBlockers.length,
      clientQuestionsCount: fallback.clientQuestions.length,
    },
    proposedFindings: fallback.proposedFindings
      .slice(0, 2)
      .map((finding) => ({
        code: finding.code,
        title: finding.title,
        severity: finding.severity,
        ownerRole: finding.ownerRole,
        legalBasis: finding.legalBasis,
        requiredEvidence: finding.requiredEvidence,
    })),
    reviewTasks: fallback.reviewTasks
      .slice(0, 2)
      .map((task) => ({
        code: task.code,
        title: task.title,
        ownerRole: task.ownerRole,
        reviewStatus: task.reviewStatus,
        linkedFindingCode: task.linkedFindingCode,
      })),
    nextActions: fallback.nextActions.slice(0, 2),
    exportBlockers: fallback.exportBlockers.slice(0, 1),
    clientQuestions: fallback.clientQuestions.slice(0, 1),
  }
}

function compareFindingsForPrompt(
  left: ReturnType<typeof buildAppStateSnapshot>["findings"][number],
  right: ReturnType<typeof buildAppStateSnapshot>["findings"][number],
) {
  const severityDelta = severityRank(right.severity) - severityRank(left.severity)
  if (severityDelta !== 0) return severityDelta
  return left.title.localeCompare(right.title)
}

function severityRank(value: string | undefined) {
  switch ((value ?? "").toLowerCase()) {
    case "critical":
      return 5
    case "high":
    case "ridicat":
      return 4
    case "medium":
    case "mediu":
      return 3
    case "low":
    case "scăzut":
    case "scazut":
      return 2
    case "info":
      return 1
    default:
      return 0
  }
}

function buildAuditEvent(
  type: ComplianceOrchestratorAuditEvent["type"],
  input: ComplianceOrchestratorRunInput,
  inputSnapshotHash: string,
  source: ComplianceOrchestratorAuditEvent["source"],
): ComplianceOrchestratorAuditEvent {
  return {
    type,
    orgId: input.orgId,
    clientId: input.clientId,
    aiProjectId: input.aiProjectId,
    inputSnapshotHash,
    source,
    actorId: input.user.id,
    createdAtISO: new Date().toISOString(),
  }
}

function repairProposalAgainstDeterministicFallback(
  proposal: OrchestratorProposal,
  fallback: OrchestratorProposal,
): OrchestratorProposal {
  const fallbackFindingsByCode = new Map(
    fallback.proposedFindings.map((finding) => [finding.code, finding]),
  )
  const fallbackRequestsByKey = new Map(
    fallback.evidenceRequests.map((request) => [
      `${request.linkedFindingCode ?? ""}::${request.evidenceType}`,
      request,
    ]),
  )
  const fallbackNextActionsByCode = new Map(
    fallback.nextActions.map((action) => [action.code, action]),
  )
  const fallbackExportBlockersByCode = new Map(
    fallback.exportBlockers.map((blocker) => [blocker.code, blocker]),
  )
  const deterministicEvidenceTypes = new Set(
    fallback.proposedFindings.flatMap((finding) => finding.requiredEvidence),
  )
  const originalEvidenceRequestKeys = new Set(
    proposal.evidenceRequests.map((request) => `${request.linkedFindingCode ?? ""}::${request.evidenceType}`),
  )

  const proposedFindings = proposal.proposedFindings
    .map((finding) => {
      const canonicalFinding = fallbackFindingsByCode.get(finding.code)
      if (!canonicalFinding || canonicalFinding.requiredEvidence.length === 0) return finding
      return {
        ...finding,
        title: canonicalFinding.title,
        ownerRole: canonicalFinding.ownerRole,
        linkedEntityType: finding.linkedEntityType ?? canonicalFinding.linkedEntityType,
        linkedEntityId: finding.linkedEntityId ?? canonicalFinding.linkedEntityId,
        requiredEvidence: canonicalFinding.requiredEvidence,
      }
    })
    .filter((finding) => {
      if (fallbackFindingsByCode.has(finding.code)) return true
      if (deterministicEvidenceTypes.size === 0) return true

      const hasOnlyKnownEvidence = finding.requiredEvidence.every((evidenceType) =>
        deterministicEvidenceTypes.has(evidenceType),
      )
      const hasOwnCoverage = finding.requiredEvidence.every((evidenceType) =>
        originalEvidenceRequestKeys.has(`${finding.code}::${evidenceType}`),
      )

      return hasOnlyKnownEvidence && hasOwnCoverage
    })
  const proposedFindingCodes = new Set(proposedFindings.map((finding) => finding.code))
  const mandatoryDeterministicFindings = fallback.proposedFindings
    .filter((finding) => severityRank(finding.severity) >= severityRank("high"))
    .sort((left, right) => severityRank(right.severity) - severityRank(left.severity))
    .slice(0, 4)

  for (const finding of mandatoryDeterministicFindings) {
    if (proposedFindingCodes.has(finding.code)) continue
    proposedFindings.push(finding)
    proposedFindingCodes.add(finding.code)
  }

  const retainedFindingCodes = new Set(proposedFindings.map((finding) => finding.code))
  const evidenceRequests = proposal.evidenceRequests
    .filter((request) => !request.linkedFindingCode || retainedFindingCodes.has(request.linkedFindingCode))
    .map((request) => {
      const fallbackRequest = fallbackRequestsByKey.get(`${request.linkedFindingCode ?? ""}::${request.evidenceType}`)
      if (!fallbackRequest) return request
      return {
        ...request,
        title: fallbackRequest.title,
        ownerRole: fallbackRequest.ownerRole,
        linkedEntityType: request.linkedEntityType ?? fallbackRequest.linkedEntityType,
        linkedEntityId: request.linkedEntityId ?? fallbackRequest.linkedEntityId,
      }
    })
  const existingRequestKeys = new Set(
    evidenceRequests.map((request) => `${request.linkedFindingCode ?? ""}::${request.evidenceType}`),
  )

  for (const finding of proposedFindings) {
    const canonicalFinding = fallbackFindingsByCode.get(finding.code)
    if (!canonicalFinding) continue

    for (const evidenceType of canonicalFinding.requiredEvidence) {
      const requestKey = `${finding.code}::${evidenceType}`
      if (existingRequestKeys.has(requestKey)) continue

      const fallbackRequest = fallbackRequestsByKey.get(requestKey)
      evidenceRequests.push(
        fallbackRequest ?? {
          code: `${finding.code}-${evidenceType}`,
          linkedFindingCode: finding.code,
          linkedEntityType: finding.linkedEntityType,
          linkedEntityId: finding.linkedEntityId,
          evidenceType,
          title: `Atașează dovada ${evidenceType} pentru ${finding.title}`,
          ownerRole: finding.ownerRole,
        },
      )
      existingRequestKeys.add(requestKey)
    }
  }

  const reviewTasks = [...proposal.reviewTasks]
  const existingReviewTaskKeys = new Set(
    reviewTasks.map((task) => `${task.linkedFindingCode ?? ""}::${task.reviewStatus}`),
  )
  for (const task of fallback.reviewTasks) {
    if (!task.linkedFindingCode || !retainedFindingCodes.has(task.linkedFindingCode)) continue
    const key = `${task.linkedFindingCode}::${task.reviewStatus}`
    if (existingReviewTaskKeys.has(key)) continue
    reviewTasks.push(task)
    existingReviewTaskKeys.add(key)
  }
  const nextActions = proposal.nextActions
    .filter((action) => fallbackNextActionsByCode.has(action.code))
    .map((action) => fallbackNextActionsByCode.get(action.code) ?? action)
  const existingNextActionCodes = new Set(nextActions.map((action) => action.code))
  for (const action of fallback.nextActions) {
    if (existingNextActionCodes.has(action.code)) continue
    nextActions.push(action)
    existingNextActionCodes.add(action.code)
  }
  const exportBlockers = proposal.exportBlockers.map((blocker) =>
    fallbackExportBlockersByCode.get(blocker.code) ?? blocker
  )
  const existingExportBlockerCodes = new Set(exportBlockers.map((blocker) => blocker.code))
  for (const blocker of fallback.exportBlockers) {
    if (existingExportBlockerCodes.has(blocker.code)) continue
    exportBlockers.push(blocker)
    existingExportBlockerCodes.add(blocker.code)
  }

  const legalContext = groundLegalContextForFindings(
    repairLegalContextReferences(proposal.legalContext, fallback.legalContext) ?? [],
    proposedFindings,
    fallback.legalContext,
  )

  return {
    ...proposal,
    legalContext,
    proposedFindings,
    evidenceRequests,
    reviewTasks,
    nextActions,
    exportBlockers,
  }
}

function groundLegalContextForFindings(
  legalContext: OrchestratorLegalContextReference[],
  proposedFindings: OrchestratorProposal["proposedFindings"],
  fallbackLegalContext: OrchestratorLegalContextReference[] | undefined,
): OrchestratorLegalContextReference[] {
  const grounded = [...legalContext]

  for (const finding of proposedFindings) {
    for (const basis of finding.legalBasis) {
      if (basis.instrument !== "EU_AI_ACT" && basis.instrument !== "GDPR") continue

      const reference = nonEmptyString(basis.article) ?? nonEmptyString(basis.annex) ?? nonEmptyString(basis.note)
      if (!reference) continue
      if (hasGroundedLegalContext(grounded, basis.instrument, reference)) continue

      grounded.push({
        sourceId: sourceIdForLegalInstrument(basis.instrument, grounded, fallbackLegalContext),
        instrument: basis.instrument,
        reference,
        whyRelevant: "Sursă juridică primară folosită pentru pașii de remediere propuși.",
      })
    }
  }

  return grounded
}

function hasGroundedLegalContext(
  legalContext: OrchestratorLegalContextReference[],
  instrument: OrchestratorLegalContextReference["instrument"],
  reference: string,
): boolean {
  const normalizedBasisReference = normalizeLegalReference(reference)
  return legalContext.some((entry) => {
    if (entry.instrument !== instrument) return false
    const normalizedContextReference = normalizeLegalReference(entry.reference)
    return (
      normalizedBasisReference.includes(normalizedContextReference) ||
      normalizedContextReference.includes(normalizedBasisReference)
    )
  })
}

function sourceIdForLegalInstrument(
  instrument: OrchestratorLegalContextReference["instrument"],
  legalContext: OrchestratorLegalContextReference[],
  fallbackLegalContext: OrchestratorLegalContextReference[] | undefined,
): string {
  const existing = legalContext.find((entry) => entry.instrument === instrument && nonEmptyString(entry.sourceId))
    ?? fallbackLegalContext?.find((entry) => entry.instrument === instrument && nonEmptyString(entry.sourceId))
  if (existing?.sourceId) return existing.sourceId
  if (instrument === "GDPR") return "src_gdpr_2016_679"
  return "src_eu_ai_act_2024_1689"
}

function normalizeLegalReference(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function buildValidationContext(
  input: ComplianceOrchestratorRunInput,
  snapshot: ReturnType<typeof buildAppStateSnapshot>,
): OrchestratorValidationContext {
  const allowedLinkedEntityIdsByType: Partial<Record<OrchestratorLinkedEntityType, string[]>> = {}
  if (input.clientId) {
    allowedLinkedEntityIdsByType.client = [input.clientId]
  }
  if (input.aiProjectId) {
    allowedLinkedEntityIdsByType.ai_project = [input.aiProjectId]
  }

  const scopedUseCaseIds = snapshot.aiUseCases.map((record) => record.id).filter(Boolean)
  if (scopedUseCaseIds.length > 0) {
    allowedLinkedEntityIdsByType.ai_use_case = scopedUseCaseIds
  }
  const scopedSystemIds = snapshot.aiSystems.map((record) => record.id).filter(Boolean)
  if (scopedSystemIds.length > 0) {
    allowedLinkedEntityIdsByType.ai_system = scopedSystemIds
  }
  const scopedFindingIds = snapshot.findings.map((record) => record.id).filter(Boolean)
  if (scopedFindingIds.length > 0) {
    allowedLinkedEntityIdsByType.finding = scopedFindingIds
  }

  return {
    allowedRagSourceIds: input.ragSourceIds,
    legalSourcesById: Object.fromEntries(
      LEGAL_SOURCE_REGISTRY
        .filter((source) => input.ragSourceIds.includes(source.id))
        .map((source) => [
          source.id,
          {
            canBeCitedAsLaw: source.canBeCitedAsLaw,
            legalWeight: source.legalWeight,
            sourceType: source.sourceType,
          },
        ]),
    ),
    allowedLinkedEntityIdsByType,
    allowedFindingCodes: scopedFindingIds,
  }
}

function repairLegalContextReferences(
  legalContext: OrchestratorLegalContextReference[] | undefined,
  fallbackLegalContext: OrchestratorLegalContextReference[] | undefined,
): OrchestratorLegalContextReference[] | undefined {
  const proposed = legalContext?.length ? legalContext : fallbackLegalContext
  if (!proposed?.length) return undefined

  return proposed.map((entry, index) => {
    const fallbackEntry = fallbackLegalContext?.[index] ?? fallbackLegalContext?.[0]
    const instrument = isLegalContextInstrument(entry.instrument)
      ? entry.instrument
      : fallbackEntry?.instrument ?? "EU_AI_ACT"

    return {
      ...entry,
      sourceId: nonEmptyString(entry.sourceId) ?? fallbackEntry?.sourceId ?? "eu-ai-act-corpus",
      instrument,
      reference:
        nonEmptyString(entry.reference) ??
        fallbackEntry?.reference ??
        defaultLegalContextReference(instrument),
      whyRelevant:
        nonEmptyString(entry.whyRelevant) ??
        fallbackEntry?.whyRelevant ??
        "Sursă RAG permisă pentru contextul juridic al planului.",
    }
  })
}

function nonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined
}

function isLegalContextInstrument(
  value: unknown,
): value is OrchestratorLegalContextReference["instrument"] {
  return value === "EU_AI_ACT" || value === "GDPR" || value === "CONTRACT" || value === "INTERNAL_POLICY"
}

function defaultLegalContextReference(
  instrument: OrchestratorLegalContextReference["instrument"],
) {
  switch (instrument) {
    case "GDPR":
      return "Art. 5"
    case "CONTRACT":
      return "DPA / contract"
    case "INTERNAL_POLICY":
      return "Politică internă AI"
    case "EU_AI_ACT":
    default:
      return "Art. 50"
  }
}
