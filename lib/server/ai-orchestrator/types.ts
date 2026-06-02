import type { ComplianceSeverity } from "@/lib/compliance/constitution"

export const ORCHESTRATOR_SCHEMA_VERSION = "orchestrator.v1" as const

export type OrchestratorSchemaVersion = typeof ORCHESTRATOR_SCHEMA_VERSION

export type OrchestratorOwnerRole =
  | "cabinet_consultant"
  | "dpo"
  | "legal"
  | "management"
  | "hr"
  | "marketing"
  | "customer_support"
  | "it_security"
  | "engineering"
  | "product_owner"
  | "procurement"
  | "vendor_manager"
  | "client_admin"
  | "consultant"

export type OrchestratorLegalBasis = {
  instrument: "EU_AI_ACT" | "GDPR" | "CONTRACT" | "INTERNAL_POLICY"
  article?: string
  annex?: string
  note?: string
}

export type OrchestratorEvidenceType =
  | "ai_use_case_intake"
  | "owner_assignment"
  | "role_risk_assessment"
  | "management_approval"
  | "ai_literacy_training_roster"
  | "ai_literacy_completion_proof"
  | "vendor_contract"
  | "vendor_dpa"
  | "vendor_subprocessors"
  | "vendor_data_region"
  | "vendor_training_opt_out"
  | "ropa_record"
  | "dpia_screening"
  | "dpia_report"
  | "fria_screening"
  | "fria_report"
  | "transparency_notice_text"
  | "transparency_screenshot"
  | "human_oversight_sop"
  | "logging_configuration"
  | "sample_logs"
  | "incident_response_sop"
  | "technical_documentation"
  | "annex_iv_file"
  | "qms_policy"
  | "post_market_monitoring_plan"
  | "accuracy_robustness_security_eval"
  | "eu_db_registration_draft"
  | "contract_clause_review"
  | "board_ai_brief"
  | string

export type OrchestratorLinkedEntityType =
  | "client"
  | "ai_use_case"
  | "ai_system"
  | "vendor_model"
  | "data_process"
  | "ai_literacy_record"
  | "finding"
  | "evidence"
  | "export_pack"
  | "ai_project"

export type OrchestratorProposedFinding = {
  code: string
  title: string
  reason: string
  severity: ComplianceSeverity | "blocker"
  ownerRole: OrchestratorOwnerRole
  linkedEntityType?: OrchestratorLinkedEntityType
  linkedEntityId?: string
  legalBasis: OrchestratorLegalBasis[]
  requiredEvidence: OrchestratorEvidenceType[]
  riskDraft?: string
  roleDraft?: string
  finalLegalVerdict: false
}

export type OrchestratorEvidenceRequest = {
  code: string
  linkedFindingCode?: string
  linkedEntityType?: OrchestratorLinkedEntityType
  linkedEntityId?: string
  evidenceType: OrchestratorEvidenceType
  title: string
  ownerRole: OrchestratorOwnerRole
  requiredMetadata?: string[]
}

export type OrchestratorReviewTask = {
  code: string
  title: string
  ownerRole: OrchestratorOwnerRole
  reviewStatus:
    | "needs_review"
    | "needs_dpo_review"
    | "needs_lawyer_review"
    | "needs_it_security_review"
    | "needs_management_approval"
    | "needs_client_approval"
  linkedFindingCode?: string
  linkedEntityType?: OrchestratorLinkedEntityType
  linkedEntityId?: string
}

export type OrchestratorNextAction = {
  code: string
  title: string
  priority: "P0" | "P1" | "P2" | "P3"
  targetHref: string
  ownerRole: OrchestratorOwnerRole
}

export type OrchestratorExportBlocker = {
  code: string
  exportType:
    | "management_summary"
    | "audit_pack"
    | "authority_pack"
    | "enterprise_questionnaire"
    | "builder_handover_pack"
    | "change_impact_report"
    | string
  reason: string
  severity: ComplianceSeverity | "blocker"
  blockedUntil: "evidence_attached" | "reviewed" | "approved" | "client_approved" | "not_applicable" | string
}

export type OrchestratorClientQuestion = {
  code: string
  question: string
  ownerRole: OrchestratorOwnerRole
  linkedEntityType?: OrchestratorLinkedEntityType
  linkedEntityId?: string
}

export type OrchestratorObsoleteCandidate = {
  findingCode: string
  reason: string
}

export type OrchestratorLegalContextReference = {
  sourceId: string
  instrument: "EU_AI_ACT" | "GDPR" | "CONTRACT" | "INTERNAL_POLICY"
  reference: string
  whyRelevant: string
}

export type OrchestratorProposal = {
  schemaVersion: OrchestratorSchemaVersion
  finalLegalVerdict: false
  legalContext?: OrchestratorLegalContextReference[]
  proposedFindings: OrchestratorProposedFinding[]
  evidenceRequests: OrchestratorEvidenceRequest[]
  reviewTasks: OrchestratorReviewTask[]
  nextActions: OrchestratorNextAction[]
  exportBlockers: OrchestratorExportBlocker[]
  clientQuestions: OrchestratorClientQuestion[]
  obsoleteCandidates: OrchestratorObsoleteCandidate[]
  modelNotes?: string[]
  missingData?: string[]
}

export type OrchestratorValidationContext = {
  allowedRagSourceIds?: string[]
  allowedLinkedEntityIdsByType?: Partial<Record<OrchestratorLinkedEntityType, string[]>>
  allowedFindingCodes?: string[]
}

export type OrchestratorValidationResult =
  | {
      ok: true
      proposal: OrchestratorProposal
      warnings: string[]
    }
  | {
      ok: false
      errors: string[]
      warnings: string[]
    }
