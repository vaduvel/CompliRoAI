import type { AIUseCaseRecord } from "@/lib/compliance/types"
import { hasSupabaseConfig, supabaseSelect, supabaseUpsert } from "@/lib/server/supabase-rest"
import type { PortfolioImportTarget } from "@/lib/server/portfolio-import"

type AIUseCaseRow = {
  id: string
  org_id: string
  workspace_mode: string
  client_id: string | null
  ai_project_id: string | null
  linked_ai_system_id: string | null
  linked_vendor_id: string | null
  linked_model_id: string | null
  linked_data_process_id: string | null
  use_case_name: string
  short_description: string | null
  department: string
  business_process: string
  lifecycle_status: string
  owner_name: string | null
  owner_email: string | null
  owner_role: string | null
  intended_purpose: string
  actual_use_description: string | null
  out_of_scope_use: string | null
  tool_name: string | null
  vendor_name: string | null
  model_name: string | null
  deployment_mode: string
  internal_users: string[]
  affected_persons: string[]
  vulnerable_groups: string[]
  uses_personal_data: string
  uses_special_category_data: string
  uses_confidential_data: string
  uses_trade_secrets: string
  uses_children_data: string
  data_categories: string[]
  input_data_source: string[]
  data_region: string | null
  transfer_outside_eea: string
  output_types: string[]
  autonomy_level: string
  human_review: string
  public_output: string
  direct_interaction_with_persons: string
  automated_decision: string
  scoring_or_ranking: string
  impacts_people_rights: string
  annex_iii_domain: string
  prohibited_practice_flags: string[]
  draft_role: string
  draft_risk_level: string
  high_risk_candidate: boolean
  prohibited_candidate: boolean
  art50_transparency_trigger: boolean
  gdpr_review_needed: boolean
  dpi_needs_review: boolean
  fria_candidate: boolean
  vendor_review_needed: boolean
  human_oversight_needed: boolean
  logging_review_needed: boolean
  qms_review_needed: boolean
  pmm_review_needed: boolean
  incident_process_needed: boolean
  certainty_status: string
  review_status: string
  evidence_completeness_pct: number
  open_findings_count: number
  last_reviewed_at: string | null
  last_reviewed_by: string | null
  approved_at: string | null
  approved_by: string | null
  source: string
  source_import_id: string | null
  source_row_number: number | null
  source_magic_link_token: string | null
  source_confidence_pct: number | null
  consultant_notes: string | null
  internal_notes: string | null
  dedupe_key: string
  audit_version: number
  created_at: string
  created_by: string
  updated_at: string
  updated_by: string | null
  archived_at: string | null
  archived_by: string | null
}

export function aiUseCaseFromSupabaseRow(row: AIUseCaseRow): AIUseCaseRecord {
  return {
    id: row.id,
    orgId: row.org_id,
    workspaceMode: row.workspace_mode,
    clientId: row.client_id,
    aiProjectId: row.ai_project_id,
    linkedAiSystemId: row.linked_ai_system_id,
    linkedVendorId: row.linked_vendor_id,
    linkedModelId: row.linked_model_id,
    linkedDataProcessId: row.linked_data_process_id,
    useCaseName: row.use_case_name,
    shortDescription: row.short_description,
    department: row.department,
    businessProcess: row.business_process,
    lifecycleStatus: row.lifecycle_status,
    ownerName: row.owner_name,
    ownerEmail: row.owner_email,
    ownerRole: row.owner_role,
    intendedPurpose: row.intended_purpose,
    actualUseDescription: row.actual_use_description,
    outOfScopeUse: row.out_of_scope_use,
    toolName: row.tool_name,
    vendorName: row.vendor_name,
    modelName: row.model_name,
    deploymentMode: row.deployment_mode,
    internalUsers: row.internal_users,
    affectedPersons: row.affected_persons,
    vulnerableGroups: row.vulnerable_groups,
    usesPersonalData: row.uses_personal_data,
    usesSpecialCategoryData: row.uses_special_category_data,
    usesConfidentialData: row.uses_confidential_data,
    usesTradeSecrets: row.uses_trade_secrets,
    usesChildrenData: row.uses_children_data,
    dataCategories: row.data_categories,
    inputDataSource: row.input_data_source,
    dataRegion: row.data_region,
    transferOutsideEea: row.transfer_outside_eea,
    outputTypes: row.output_types,
    autonomyLevel: row.autonomy_level,
    humanReview: row.human_review,
    publicOutput: row.public_output,
    directInteractionWithPersons: row.direct_interaction_with_persons,
    automatedDecision: row.automated_decision,
    scoringOrRanking: row.scoring_or_ranking,
    impactsPeopleRights: row.impacts_people_rights,
    annexIIIDomain: row.annex_iii_domain,
    prohibitedPracticeFlags: row.prohibited_practice_flags,
    draftRole: row.draft_role,
    draftRiskLevel: row.draft_risk_level,
    highRiskCandidate: row.high_risk_candidate,
    prohibitedCandidate: row.prohibited_candidate,
    art50TransparencyTrigger: row.art50_transparency_trigger,
    gdprReviewNeeded: row.gdpr_review_needed,
    dpiNeedsReview: row.dpi_needs_review,
    friaCandidate: row.fria_candidate,
    vendorReviewNeeded: row.vendor_review_needed,
    humanOversightNeeded: row.human_oversight_needed,
    loggingReviewNeeded: row.logging_review_needed,
    qmsReviewNeeded: row.qms_review_needed,
    pmmReviewNeeded: row.pmm_review_needed,
    incidentProcessNeeded: row.incident_process_needed,
    certaintyStatus: row.certainty_status,
    reviewStatus: row.review_status,
    evidenceCompletenessPct: row.evidence_completeness_pct,
    openFindingsCount: row.open_findings_count,
    lastReviewedAtISO: row.last_reviewed_at,
    lastReviewedBy: row.last_reviewed_by,
    approvedAtISO: row.approved_at,
    approvedBy: row.approved_by,
    source: row.source,
    sourceImportId: row.source_import_id,
    sourceRowNumber: row.source_row_number,
    sourceMagicLinkToken: row.source_magic_link_token,
    sourceConfidencePct: row.source_confidence_pct,
    consultantNotes: row.consultant_notes,
    internalNotes: row.internal_notes,
    dedupeKey: row.dedupe_key,
    auditVersion: row.audit_version,
    createdAtISO: row.created_at,
    createdBy: row.created_by,
    updatedAtISO: row.updated_at,
    updatedBy: row.updated_by,
    archivedAtISO: row.archived_at,
    archivedBy: row.archived_by,
  } as AIUseCaseRecord
}

export function aiUseCaseToSupabaseRow(record: AIUseCaseRecord): AIUseCaseRow {
  return {
    id: record.id,
    org_id: record.orgId,
    workspace_mode: record.workspaceMode,
    client_id: record.clientId ?? null,
    ai_project_id: record.aiProjectId ?? null,
    linked_ai_system_id: record.linkedAiSystemId ?? null,
    linked_vendor_id: record.linkedVendorId ?? null,
    linked_model_id: record.linkedModelId ?? null,
    linked_data_process_id: record.linkedDataProcessId ?? null,
    use_case_name: record.useCaseName,
    short_description: record.shortDescription ?? null,
    department: record.department,
    business_process: record.businessProcess,
    lifecycle_status: record.lifecycleStatus,
    owner_name: record.ownerName ?? null,
    owner_email: record.ownerEmail ?? null,
    owner_role: record.ownerRole ?? null,
    intended_purpose: record.intendedPurpose,
    actual_use_description: record.actualUseDescription ?? null,
    out_of_scope_use: record.outOfScopeUse ?? null,
    tool_name: record.toolName ?? null,
    vendor_name: record.vendorName ?? null,
    model_name: record.modelName ?? null,
    deployment_mode: record.deploymentMode,
    internal_users: record.internalUsers,
    affected_persons: record.affectedPersons,
    vulnerable_groups: record.vulnerableGroups,
    uses_personal_data: record.usesPersonalData,
    uses_special_category_data: record.usesSpecialCategoryData,
    uses_confidential_data: record.usesConfidentialData,
    uses_trade_secrets: record.usesTradeSecrets,
    uses_children_data: record.usesChildrenData,
    data_categories: record.dataCategories,
    input_data_source: record.inputDataSource,
    data_region: record.dataRegion ?? null,
    transfer_outside_eea: record.transferOutsideEea,
    output_types: record.outputTypes,
    autonomy_level: record.autonomyLevel,
    human_review: record.humanReview,
    public_output: record.publicOutput,
    direct_interaction_with_persons: record.directInteractionWithPersons,
    automated_decision: record.automatedDecision,
    scoring_or_ranking: record.scoringOrRanking,
    impacts_people_rights: record.impactsPeopleRights,
    annex_iii_domain: record.annexIIIDomain,
    prohibited_practice_flags: record.prohibitedPracticeFlags,
    draft_role: record.draftRole,
    draft_risk_level: record.draftRiskLevel,
    high_risk_candidate: record.highRiskCandidate,
    prohibited_candidate: record.prohibitedCandidate,
    art50_transparency_trigger: record.art50TransparencyTrigger,
    gdpr_review_needed: record.gdprReviewNeeded,
    dpi_needs_review: record.dpiNeedsReview,
    fria_candidate: record.friaCandidate,
    vendor_review_needed: record.vendorReviewNeeded,
    human_oversight_needed: record.humanOversightNeeded,
    logging_review_needed: record.loggingReviewNeeded,
    qms_review_needed: record.qmsReviewNeeded,
    pmm_review_needed: record.pmmReviewNeeded,
    incident_process_needed: record.incidentProcessNeeded,
    certainty_status: record.certaintyStatus,
    review_status: record.reviewStatus,
    evidence_completeness_pct: record.evidenceCompletenessPct,
    open_findings_count: record.openFindingsCount,
    last_reviewed_at: record.lastReviewedAtISO ?? null,
    last_reviewed_by: record.lastReviewedBy ?? null,
    approved_at: record.approvedAtISO ?? null,
    approved_by: record.approvedBy ?? null,
    source: record.source,
    source_import_id: record.sourceImportId ?? null,
    source_row_number: record.sourceRowNumber ?? null,
    source_magic_link_token: record.sourceMagicLinkToken ?? null,
    source_confidence_pct: record.sourceConfidencePct ?? null,
    consultant_notes: record.consultantNotes ?? null,
    internal_notes: record.internalNotes ?? null,
    dedupe_key: record.dedupeKey,
    audit_version: record.auditVersion,
    created_at: record.createdAtISO,
    created_by: record.createdBy,
    updated_at: record.updatedAtISO,
    updated_by: record.updatedBy ?? null,
    archived_at: record.archivedAtISO ?? null,
    archived_by: record.archivedBy ?? null,
  }
}

export async function upsertAIUseCasesToSupabase(records: AIUseCaseRecord[]) {
  if (!hasSupabaseConfig() || records.length === 0) return
  await supabaseUpsert("ai_use_cases", records.map(aiUseCaseToSupabaseRow), "public", "on_conflict=id")
}

export async function loadAIUseCasesForOrgIds(orgIds: string[]): Promise<Map<string, AIUseCaseRecord[]>> {
  const grouped = new Map<string, AIUseCaseRecord[]>()
  const uniqueOrgIds = [...new Set(orgIds.filter(Boolean))]
  if (!hasSupabaseConfig() || uniqueOrgIds.length === 0) return grouped

  const rows = await supabaseSelect<AIUseCaseRow>(
    "ai_use_cases",
    `select=*&org_id=in.(${uniqueOrgIds.join(",")})&archived_at=is.null`,
    "public"
  )

  for (const row of rows) {
    const record = aiUseCaseFromSupabaseRow(row)
    const records = grouped.get(record.orgId) ?? []
    records.push(record)
    grouped.set(record.orgId, records)
  }

  return grouped
}

export async function persistAIUseCasesForChangedTargets(targets: PortfolioImportTarget[]) {
  const records = targets
    .filter((target) => target.changed)
    .flatMap((target) => target.state.aiUseCases ?? [])
  await upsertAIUseCasesToSupabase(records)
}
