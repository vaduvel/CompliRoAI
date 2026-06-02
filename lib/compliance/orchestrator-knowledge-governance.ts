export const AI_ACT_ART_50_CHATBOT_NOTICE = "AI_ACT_ART_50_CHATBOT_NOTICE" as const
export const GDPR_VENDOR_DPA_REVIEW = "GDPR_VENDOR_DPA_REVIEW" as const
export const GDPR_ROPA_DPIA_REVIEW = "GDPR_ROPA_DPIA_REVIEW" as const
export const HUMAN_ESCALATION_SOP_REVIEW = "HUMAN_ESCALATION_SOP_REVIEW" as const

export type LegalSourceType =
  | "primary_law"
  | "official_guidance"
  | "draft_official_guidance"
  | "regulator_faq"
  | "internal_monography"
  | "internal_template"
  | "case_law"
  | "market_research"

export type LegalSource = {
  id: string
  domain: "eu_ai_act" | "gdpr" | "ai_governance" | "internal"
  sourceType: LegalSourceType
  authority: "EUR_LEX" | "EU_COMMISSION" | "AI_OFFICE" | "EDPB" | "INTERNAL" | "COURT" | "OTHER"
  title: string
  citationLabel: string
  jurisdiction: "EU" | "RO" | "INTERNAL"
  language: "ro" | "en" | "multi"
  version: string
  legalWeight: "primary" | "secondary_official" | "draft" | "internal_context"
  canBeCitedAsLaw: boolean
  requiresLegalValidation: boolean
}

export type OwnerRole =
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

export type FindingSeverity = "info" | "low" | "medium" | "high" | "critical" | "blocker"

export type RequiredEvidenceType =
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
  | "data_flow_diagram"

export type ReviewGateCode =
  | "dpo_review"
  | "legal_review"
  | "it_security_review"
  | "management_approval"
  | "client_approval"
  | "ai_builder_product_owner_review"

export type ExportSectionCode =
  | "ai_register"
  | "transparency"
  | "gdpr_bridge"
  | "vendor_review"
  | "human_oversight"
  | "ai_literacy"
  | "logging"
  | "audit_trail"
  | "builder_handover"

export type ExportReadiness = "blocked" | "draft_only" | "partial" | "ready_for_review" | "approved" | "expired"

export type Obligation = {
  code: string
  instrument: "EU_AI_ACT" | "GDPR" | "INTERNAL_POLICY" | "CONTRACT"
  article: string
  annex?: string
  title: string
  sourceId: string
  legalWeight: LegalSource["legalWeight"]
  appliesTo: string[]
  triggerConditions: string[]
  requiredEvidence: RequiredEvidenceType[]
  defaultOwnerRole: OwnerRole
  defaultSeverity: FindingSeverity
  reviewGate: ReviewGateCode[]
  exportSections: ExportSectionCode[]
  canBeAutoApplied: boolean
  finalVerdictRequiresHuman: boolean
}

export type EvidenceAcceptanceRule = {
  evidenceType: RequiredEvidenceType
  label: string
  acceptedFormats: ("pdf" | "docx" | "xlsx" | "csv" | "png" | "jpg" | "webp" | "json" | "yaml" | "url" | "md")[]
  requiredMetadata: string[]
  canExpire: boolean
  defaultExpiryDays?: number
  minimumCertaintyAfterUpload: "evidence_attached"
  reviewRequiredBy: OwnerRole[]
  canResolveFindingAutomatically: false
  canApproveAutomatically: false
  exportSection: ExportSectionCode
}

export type ReviewGateRule = {
  gateCode: ReviewGateCode
  obligationCodes: string[]
  reviewerRoles: OwnerRole[]
  blocksExport: boolean
  canBeSkipped: boolean
  skipRequiresReason: boolean
}

export const LEGAL_SOURCE_REGISTRY: LegalSource[] = [
  {
    id: "src_eu_ai_act_2024_1689",
    domain: "eu_ai_act",
    sourceType: "primary_law",
    authority: "EUR_LEX",
    title: "Regulamentul (UE) 2024/1689 privind inteligența artificială",
    citationLabel: "Regulation (EU) 2024/1689",
    jurisdiction: "EU",
    language: "multi",
    version: "2024-07-12-OJ",
    legalWeight: "primary",
    canBeCitedAsLaw: true,
    requiresLegalValidation: false,
  },
  {
    id: "src_gdpr_2016_679",
    domain: "gdpr",
    sourceType: "primary_law",
    authority: "EUR_LEX",
    title: "Regulamentul (UE) 2016/679 privind protecția datelor",
    citationLabel: "Regulation (EU) 2016/679",
    jurisdiction: "EU",
    language: "multi",
    version: "2016-05-04-OJ",
    legalWeight: "primary",
    canBeCitedAsLaw: true,
    requiresLegalValidation: false,
  },
  {
    id: "src_internal_chatbot_art50_monography",
    domain: "internal",
    sourceType: "internal_monography",
    authority: "INTERNAL",
    title: "CompliRoAI chatbot Art. 50 + GDPR workflow monography",
    citationLabel: "Internal chatbot workflow monography",
    jurisdiction: "INTERNAL",
    language: "ro",
    version: "2026-05-27-candidate",
    legalWeight: "internal_context",
    canBeCitedAsLaw: false,
    requiresLegalValidation: true,
  },
]

export const OBLIGATION_LIBRARY: Obligation[] = [
  {
    code: AI_ACT_ART_50_CHATBOT_NOTICE,
    instrument: "EU_AI_ACT",
    article: "Art. 50(1)",
    title: "Informarea persoanelor că interacționează cu un sistem AI",
    sourceId: "src_eu_ai_act_2024_1689",
    legalWeight: "primary",
    appliesTo: ["provider", "deployer"],
    triggerConditions: ["directInteractionWithPersons=yes", "outputTypes contains chatbot_interaction"],
    requiredEvidence: ["transparency_notice_text", "transparency_screenshot"],
    defaultOwnerRole: "customer_support",
    defaultSeverity: "high",
    reviewGate: ["dpo_review"],
    exportSections: ["transparency"],
    canBeAutoApplied: false,
    finalVerdictRequiresHuman: true,
  },
  {
    code: GDPR_VENDOR_DPA_REVIEW,
    instrument: "GDPR",
    article: "Art. 28",
    title: "Verificare DPA / termeni procesator pentru vendor AI",
    sourceId: "src_gdpr_2016_679",
    legalWeight: "primary",
    appliesTo: ["deployer", "dpo", "cabinet_consultant"],
    triggerConditions: ["vendorName present", "usesPersonalData=yes|unknown"],
    requiredEvidence: ["vendor_dpa", "vendor_subprocessors", "vendor_data_region"],
    defaultOwnerRole: "procurement",
    defaultSeverity: "high",
    reviewGate: ["dpo_review", "legal_review"],
    exportSections: ["vendor_review", "gdpr_bridge"],
    canBeAutoApplied: false,
    finalVerdictRequiresHuman: true,
  },
  {
    code: GDPR_ROPA_DPIA_REVIEW,
    instrument: "GDPR",
    article: "Art. 30 / Art. 35",
    title: "RoPA și DPIA screening pentru procesarea datelor personale cu AI",
    sourceId: "src_gdpr_2016_679",
    legalWeight: "primary",
    appliesTo: ["deployer", "dpo"],
    triggerConditions: ["usesPersonalData=yes|unknown"],
    requiredEvidence: ["ropa_record", "dpia_screening"],
    defaultOwnerRole: "dpo",
    defaultSeverity: "high",
    reviewGate: ["dpo_review"],
    exportSections: ["gdpr_bridge"],
    canBeAutoApplied: false,
    finalVerdictRequiresHuman: true,
  },
  {
    code: HUMAN_ESCALATION_SOP_REVIEW,
    instrument: "INTERNAL_POLICY",
    article: "Internal oversight workflow",
    title: "Procedură de escaladare umană pentru chatbot",
    sourceId: "src_internal_chatbot_art50_monography",
    legalWeight: "internal_context",
    appliesTo: ["deployer", "customer_support"],
    triggerConditions: ["outputTypes contains chatbot_interaction", "humanReview=escalation_only|unknown"],
    requiredEvidence: ["human_oversight_sop"],
    defaultOwnerRole: "customer_support",
    defaultSeverity: "medium",
    reviewGate: ["dpo_review"],
    exportSections: ["human_oversight"],
    canBeAutoApplied: false,
    finalVerdictRequiresHuman: true,
  },
]

export const EVIDENCE_ACCEPTANCE_RULES: EvidenceAcceptanceRule[] = [
  {
    evidenceType: "transparency_notice_text",
    label: "Textul notice-ului AI afișat utilizatorului",
    acceptedFormats: ["md", "docx", "pdf", "url"],
    requiredMetadata: ["url", "capturedAt", "documentOwner"],
    canExpire: true,
    defaultExpiryDays: 180,
    minimumCertaintyAfterUpload: "evidence_attached",
    reviewRequiredBy: ["dpo", "legal"],
    canResolveFindingAutomatically: false,
    canApproveAutomatically: false,
    exportSection: "transparency",
  },
  {
    evidenceType: "transparency_screenshot",
    label: "Screenshot cu notice-ul AI afișat în chatbot/site",
    acceptedFormats: ["png", "jpg", "webp", "pdf", "url"],
    requiredMetadata: ["url", "capturedAt", "capturedBy"],
    canExpire: true,
    defaultExpiryDays: 180,
    minimumCertaintyAfterUpload: "evidence_attached",
    reviewRequiredBy: ["dpo"],
    canResolveFindingAutomatically: false,
    canApproveAutomatically: false,
    exportSection: "transparency",
  },
  {
    evidenceType: "vendor_dpa",
    label: "DPA / termeni procesator vendor AI",
    acceptedFormats: ["pdf", "docx", "url", "md"],
    requiredMetadata: ["vendorName", "effectiveDate", "documentOwner"],
    canExpire: true,
    defaultExpiryDays: 365,
    minimumCertaintyAfterUpload: "evidence_attached",
    reviewRequiredBy: ["dpo", "legal"],
    canResolveFindingAutomatically: false,
    canApproveAutomatically: false,
    exportSection: "vendor_review",
  },
  {
    evidenceType: "ropa_record",
    label: "Înregistrare RoPA pentru procesarea AI",
    acceptedFormats: ["pdf", "docx", "xlsx", "csv", "url", "md"],
    requiredMetadata: ["processName", "lastUpdated", "owner"],
    canExpire: true,
    defaultExpiryDays: 365,
    minimumCertaintyAfterUpload: "evidence_attached",
    reviewRequiredBy: ["dpo"],
    canResolveFindingAutomatically: false,
    canApproveAutomatically: false,
    exportSection: "gdpr_bridge",
  },
  {
    evidenceType: "dpia_screening",
    label: "DPIA screening / justificare DPIA",
    acceptedFormats: ["pdf", "docx", "xlsx", "url", "md"],
    requiredMetadata: ["screeningDate", "reviewer"],
    canExpire: true,
    defaultExpiryDays: 365,
    minimumCertaintyAfterUpload: "evidence_attached",
    reviewRequiredBy: ["dpo"],
    canResolveFindingAutomatically: false,
    canApproveAutomatically: false,
    exportSection: "gdpr_bridge",
  },
  {
    evidenceType: "human_oversight_sop",
    label: "SOP de escaladare / supraveghere umană",
    acceptedFormats: ["pdf", "docx", "md", "url"],
    requiredMetadata: ["version", "approvedBy", "approvedAt"],
    canExpire: true,
    defaultExpiryDays: 365,
    minimumCertaintyAfterUpload: "evidence_attached",
    reviewRequiredBy: ["dpo", "management"],
    canResolveFindingAutomatically: false,
    canApproveAutomatically: false,
    exportSection: "human_oversight",
  },
]

export const REVIEW_GATE_MATRIX: ReviewGateRule[] = [
  {
    gateCode: "dpo_review",
    obligationCodes: [AI_ACT_ART_50_CHATBOT_NOTICE, GDPR_ROPA_DPIA_REVIEW, GDPR_VENDOR_DPA_REVIEW, HUMAN_ESCALATION_SOP_REVIEW],
    reviewerRoles: ["dpo"],
    blocksExport: true,
    canBeSkipped: false,
    skipRequiresReason: false,
  },
  {
    gateCode: "legal_review",
    obligationCodes: [GDPR_VENDOR_DPA_REVIEW],
    reviewerRoles: ["legal"],
    blocksExport: true,
    canBeSkipped: false,
    skipRequiresReason: false,
  },
]

const EVIDENCE_ALIASES: Record<string, RequiredEvidenceType> = {
  ro_pa_entry: "ropa_record",
  ropa_entry: "ropa_record",
  roipa_entry: "ropa_record",
  records_of_processing: "ropa_record",
  vendor_dpa_document: "vendor_dpa",
  data_processing_agreement: "vendor_dpa",
  dpa_agreement: "vendor_dpa",
  vendor_region_compliance: "vendor_data_region",
  escalation_sop_document: "human_oversight_sop",
  escalation_training_records: "human_oversight_sop",
  escalation_workflow_diagram: "human_oversight_sop",
}

export function getLegalSource(id: string): LegalSource {
  const source = LEGAL_SOURCE_REGISTRY.find((entry) => entry.id === id)
  if (!source) throw new Error(`Unknown legal source: ${id}`)
  return source
}

export function getObligation(code: string): Obligation {
  const obligation = OBLIGATION_LIBRARY.find((entry) => entry.code === code)
  if (!obligation) throw new Error(`Unknown obligation: ${code}`)
  return obligation
}

export function getEvidenceAcceptanceRule(evidenceType: string): EvidenceAcceptanceRule {
  const canonical = normalizeEvidenceType(evidenceType)
  const rule = EVIDENCE_ACCEPTANCE_RULES.find((entry) => entry.evidenceType === canonical)
  if (!rule) throw new Error(`Unknown evidence type: ${evidenceType}`)
  return rule
}

export function getReviewGatesForObligation(obligationCode: string): ReviewGateRule[] {
  return REVIEW_GATE_MATRIX.filter((gate) => gate.obligationCodes.includes(obligationCode))
}

export function normalizeEvidenceType(value: string): RequiredEvidenceType {
  const normalized = value.trim().toLowerCase().replace(/[\s-]+/g, "_")
  return EVIDENCE_ALIASES[normalized] ?? normalized as RequiredEvidenceType
}

export function resolveExportReadinessForMissingEvidence(input: {
  obligationCode: string
  attachedEvidence: string[]
  completedReviewGates: ReviewGateCode[]
}): {
  readiness: ExportReadiness
  missingEvidence: RequiredEvidenceType[]
  missingReviewGates: ReviewGateCode[]
  forbiddenClaims: string[]
} {
  const obligation = getObligation(input.obligationCode)
  const attached = new Set(input.attachedEvidence.map(normalizeEvidenceType))
  const completedGates = new Set(input.completedReviewGates)
  const missingEvidence = obligation.requiredEvidence.filter((evidence) => !attached.has(evidence))
  const missingReviewGates = obligation.reviewGate.filter((gate) => !completedGates.has(gate))

  return {
    readiness: missingEvidence.length > 0 || missingReviewGates.length > 0 ? "blocked" : "ready_for_review",
    missingEvidence,
    missingReviewGates,
    forbiddenClaims: forbiddenClaimsForObligation(obligation.code),
  }
}

function forbiddenClaimsForObligation(obligationCode: string): string[] {
  if (obligationCode === AI_ACT_ART_50_CHATBOT_NOTICE) {
    return [
      "Art. 50 fully implemented",
      "chatbot transparency compliant",
      "chatbot AI notice approved",
    ]
  }
  return ["fully compliant", "approved automatically", "final legal verdict"]
}
