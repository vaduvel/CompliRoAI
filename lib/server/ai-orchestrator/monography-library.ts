import { readFileSync } from "node:fs"
import { join } from "node:path"
import type {
  ExportSectionCode,
  OwnerRole,
  RequiredEvidenceType,
} from "@/lib/compliance/orchestrator-knowledge-governance"
import {
  AI_ACT_ART_50_CHATBOT_NOTICE,
  GDPR_ROPA_DPIA_REVIEW,
  GDPR_VENDOR_DPA_REVIEW,
  HUMAN_ESCALATION_SOP_REVIEW,
} from "@/lib/compliance/orchestrator-knowledge-governance"

export type MonographyLegalBasis = {
  act?: string
  reference?: string
  confidence?: string
  source_url?: string
  source_name?: string
}

export type AIActMonography = {
  id: string
  title: string
  category: string
  subcategory?: string
  risk_level?: string
  engine_status?: string
  humanApprovalRequired: boolean
  legal_basis: MonographyLegalBasis[]
  compliance_obligations?: unknown[]
  documents_to_request_from_client?: unknown[]
  evidence_to_collect?: unknown[]
  red_flags?: unknown[]
  edge_cases?: unknown[]
  manual_checks?: unknown[]
  audit_pack_outputs?: unknown[]
  orchestrator_usage?: unknown
  disclaimer: string
  self_check?: unknown
}

export type AIActMonographyLibrary = {
  sourceKind: "candidate_research"
  legalTruth: false
  sourcePath: string
  monographies: AIActMonography[]
}

export type AIActMonographyValidationReport = {
  ok: boolean
  count: number
  errors: string[]
  warnings: string[]
}

export type OrchestratorScenarioType =
  | "chatbot"
  | "hr_screening"
  | "imm_unknown_ai"
  | "ai_builder_handover"
  | "vendor_review"
  | "ai_literacy"
  | "prohibited_practice"
  | "high_risk"
  | "transparency"
  | "gdpr_ai_bridge"
  | "change_management"
  | "incident_pmm"
  | "other"

export type NormalizedMonographyContext = {
  id: string
  title: string
  scenarioType: OrchestratorScenarioType
  sourceType: "internal_monography"
  legalWeight: "internal_context"
  canBeUsedAsLegalBasis: false
  requiresLegalValidation: true
  obligationCodes: string[]
  requiredEvidence: RequiredEvidenceType[]
  reviewRoles: OwnerRole[]
  exportSections: ExportSectionCode[]
  forbiddenClaims: string[]
}

const MONOGRAPHY_PATH = "data/research/ai-act-monographies/ai_act_compliance_monographies_001_050_combined.json"

type RawMonographyPayload = {
  monographies?: AIActMonography[]
}

export function loadAIActMonographyLibrary(sourcePath = MONOGRAPHY_PATH): AIActMonographyLibrary {
  const absolutePath = join(process.cwd(), sourcePath)
  const payload = JSON.parse(readFileSync(absolutePath, "utf8")) as RawMonographyPayload

  return {
    sourceKind: "candidate_research",
    legalTruth: false,
    sourcePath,
    monographies: Array.isArray(payload.monographies) ? payload.monographies : [],
  }
}

export function validateAIActMonographyLibrary(
  library: AIActMonographyLibrary,
): AIActMonographyValidationReport {
  const errors: string[] = []
  const warnings: string[] = []
  const seen = new Set<string>()

  if (library.legalTruth !== false) {
    errors.push("library.legalTruth must remain false; monographies are context, not law")
  }

  if (library.sourceKind !== "candidate_research") {
    errors.push("library.sourceKind must be candidate_research")
  }

  for (const [index, monography] of library.monographies.entries()) {
    const label = monography.id || `row_${index + 1}`

    if (!monography.id) errors.push(`${label}: id is required`)
    if (!monography.title) errors.push(`${label}: title is required`)
    if (!monography.category) errors.push(`${label}: category is required`)
    if (monography.humanApprovalRequired !== true) {
      errors.push(`${label}: humanApprovalRequired must be true`)
    }
    if (!monography.disclaimer) {
      errors.push(`${label}: disclaimer is required`)
    }
    if (!Array.isArray(monography.legal_basis) || monography.legal_basis.length === 0) {
      errors.push(`${label}: legal_basis must contain at least one source`)
    }
    if (seen.has(monography.id)) {
      errors.push(`${label}: duplicate monography id`)
    }
    seen.add(monography.id)

    if (isFiscalOrLegacyCorpus(monography)) {
      errors.push(`${label}: fiscal/non-AI-Act corpus is not allowed in CompliRoAI orchestrator`)
    }

    const hasPrimaryAIActSource = monography.legal_basis?.some((basis) =>
      /2024\/1689|AI Act/i.test(`${basis.act ?? ""} ${basis.reference ?? ""}`),
    )
    if (!hasPrimaryAIActSource) {
      warnings.push(`${label}: no explicit AI Act legal basis detected`)
    }
  }

  return {
    ok: errors.length === 0,
    count: library.monographies.length,
    errors,
    warnings,
  }
}

function isFiscalOrLegacyCorpus(monography: Pick<AIActMonography, "id" | "title" | "category" | "subcategory">) {
  const fields = [
    monography.id,
    monography.title,
    monography.category,
    monography.subcategory,
  ].join(" ")

  return (
    /^fiscabuddy/i.test(monography.id) ||
    /\b(anaf|tva|saf-t|e-factura|fiscal|fiscalitate)\b/i.test(fields)
  )
}

export function normalizeMonographyForOrchestrator(
  monography: AIActMonography,
): NormalizedMonographyContext {
  const scenarioType = inferScenarioType(monography)
  const mapping = scenarioMapping(scenarioType)

  return {
    id: monography.id,
    title: monography.title,
    scenarioType,
    sourceType: "internal_monography",
    legalWeight: "internal_context",
    canBeUsedAsLegalBasis: false,
    requiresLegalValidation: true,
    obligationCodes: mapping.obligationCodes,
    requiredEvidence: mapping.requiredEvidence,
    reviewRoles: mapping.reviewRoles,
    exportSections: mapping.exportSections,
    forbiddenClaims: mapping.forbiddenClaims,
  }
}

function inferScenarioType(monography: AIActMonography): OrchestratorScenarioType {
  const text = `${monography.id} ${monography.title} ${monography.category} ${monography.subcategory ?? ""}`.toLowerCase()
  if (/chatbot/.test(text)) return "chatbot"
  if (/(hr|cv|recruit|angaja|employee|workplace)/.test(text)) return "hr_screening"
  if (/(inventory|inventar|nu are inventar|unknown ai)/.test(text)) return "imm_unknown_ai"
  if (/(vendor|procurement|furnizor)/.test(text)) return "vendor_review"
  if (/(literacy|alfabetizare)/.test(text)) return "ai_literacy"
  if (/(prohibited|interzis|manipulation|social scoring|emotion recognition)/.test(text)) return "prohibited_practice"
  if (/(high-risk|high risk|annex|credit|education|medical|biometric)/.test(text)) return "high_risk"
  if (/(transparency|disclosure|deepfake|synthetic|marking)/.test(text)) return "transparency"
  if (/(gdpr|personal data|date personale|rag intern|fine-tun)/.test(text)) return "gdpr_ai_bridge"
  if (/(change|modific|substantial)/.test(text)) return "change_management"
  if (/(incident|post-market|pmm|logging|logs)/.test(text)) return "incident_pmm"
  if (/(provider|builder|annex iv|qms|conformity|ce marking)/.test(text)) return "ai_builder_handover"
  return "other"
}

function scenarioMapping(scenarioType: OrchestratorScenarioType): Omit<NormalizedMonographyContext, "id" | "title" | "scenarioType" | "sourceType" | "legalWeight" | "canBeUsedAsLegalBasis" | "requiresLegalValidation"> {
  if (scenarioType === "chatbot") {
    return {
      obligationCodes: [AI_ACT_ART_50_CHATBOT_NOTICE, GDPR_VENDOR_DPA_REVIEW, GDPR_ROPA_DPIA_REVIEW],
      requiredEvidence: ["transparency_notice_text", "transparency_screenshot", "vendor_dpa", "ropa_record", "dpia_screening"],
      reviewRoles: ["dpo", "legal", "customer_support"],
      exportSections: ["transparency", "vendor_review", "gdpr_bridge"],
      forbiddenClaims: ["Art. 50 fully implemented", "chatbot transparency compliant", "GDPR compliant"],
    }
  }

  if (scenarioType === "hr_screening") {
    return {
      obligationCodes: ["AI_ACT_ANNEX_III_EMPLOYMENT_REVIEW", GDPR_ROPA_DPIA_REVIEW, GDPR_VENDOR_DPA_REVIEW, HUMAN_ESCALATION_SOP_REVIEW],
      requiredEvidence: ["role_risk_assessment", "dpia_screening", "human_oversight_sop", "vendor_dpa", "logging_configuration"],
      reviewRoles: ["dpo", "legal", "hr", "it_security"],
      exportSections: ["ai_register", "gdpr_bridge", "human_oversight", "vendor_review", "logging"],
      forbiddenClaims: ["high-risk final", "not high-risk", "DPIA not needed", "fully compliant"],
    }
  }

  if (scenarioType === "imm_unknown_ai") {
    return {
      obligationCodes: ["AI_USAGE_DISCOVERY", "AI_ACT_ART_4_AI_LITERACY_BASELINE", GDPR_ROPA_DPIA_REVIEW],
      requiredEvidence: ["ai_use_case_intake", "ai_literacy_training_roster", "owner_assignment", "vendor_contract"],
      reviewRoles: ["management", "dpo", "it_security"],
      exportSections: ["ai_register", "ai_literacy", "vendor_review"],
      forbiddenClaims: ["no AI usage", "all AI tools approved", "no personal data"],
    }
  }

  return {
    obligationCodes: [],
    requiredEvidence: ["ai_use_case_intake", "role_risk_assessment"],
    reviewRoles: ["dpo", "legal"],
    exportSections: ["ai_register", "audit_trail"],
    forbiddenClaims: ["fully compliant", "final legal verdict", "approved automatically"],
  }
}
