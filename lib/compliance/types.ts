// EU AI Act compliance types — AI-related only

/**
 * Categoria de conformitate la care se referă un finding sau alertă.
 * Folosit de constituție pentru inferarea principiilor și de UI pentru
 * filtrare/iconuri. Sprint 008A: extras din DPO-OS pentru a deveni
 * primitive partajate cu ScanFinding.
 */
export type FindingCategory = "EU_AI_ACT" | "GDPR" | "E_FACTURA" | "NIS2"

export type AISystemPurpose =
  | "hr-screening"
  | "credit-scoring"
  | "biometric-identification"
  | "fraud-detection"
  | "marketing-personalization"
  | "support-chatbot"
  | "document-assistant"
  | "image-manipulation-intimate"
  | "other"

export type AISystemRiskLevel = "minimal" | "limited" | "high"
export type AISystemDiscoveryMethod = "manual" | "auto" | "hybrid"
export type AISystemDetectionStatus =
  | "detected"
  | "reviewed"
  | "confirmed"
  | "rejected"
export type AISystemConfidence = "low" | "medium" | "high"

export type AISystemApprovalStatus = "pending" | "approved" | "rejected"
export type AISystemAttestationStatus = "not-attested" | "attested"

export type AISystemRecord = {
  id: string
  name: string
  purpose: AISystemPurpose
  vendor: string
  modelType: string
  usesPersonalData: boolean
  makesAutomatedDecisions: boolean
  impactsRights: boolean
  hasHumanReview: boolean
  riskLevel: AISystemRiskLevel
  annexIIIHint?: string
  recommendedActions: string[]
  createdAtISO: string
  approvalStatus?: AISystemApprovalStatus
  approvedAtISO?: string
  approvedByEmail?: string
  policyAttestationStatus?: AISystemAttestationStatus
  policyAttestedAtISO?: string
  policyAttestedByEmail?: string
}

// ────────────────────────────────────────────────────────────────────────────
//   AI Act Role Assessment (Sprint 5.5)
//   Determină rolul organizației conform Art. 2 + Art. 3 EU AI Act.
// ────────────────────────────────────────────────────────────────────────────

export type AIActRole =
  | "provider"
  | "deployer"
  | "importer"
  | "distributor"
  | "manufacturer"
  | "mixed"
  | "exempt"

export type RoleAssessmentAnswer = "yes" | "no" | "unsure"

export type RoleAssessmentAnswers = {
  developsAI: RoleAssessmentAnswer
  sellsToThirdParties: RoleAssessmentAnswer
  usesAIInternally: RoleAssessmentAnswer
  importsFromNonEU: RoleAssessmentAnswer
  distributesThirdPartyAI: RoleAssessmentAnswer
  embedsAIInPhysicalProducts: RoleAssessmentAnswer
  personalNonCommercialUseOnly: RoleAssessmentAnswer
  militaryOrResearchOnly: RoleAssessmentAnswer
}

export type RoleAssessment = {
  id: string
  primaryRole: AIActRole
  secondaryRoles: AIActRole[]
  reasoning: string
  applicableArticles: string[]
  scopeExceptions: string[]
  answeredAtISO: string
  answeredByEmail: string
  answers: RoleAssessmentAnswers
}

// ────────────────────────────────────────────────────────────────────────────
//   Art. 50 — Transparency Notices (Sprint 6)
//   Obligații de transparență pentru sisteme AI care interacționează cu
//   persoane fizice + watermarking conținut sintetic. Deadline aplicabilitate:
//   2 decembrie 2026 (extindere Omnibus mai 2026, de la 2 august 2026).
// ────────────────────────────────────────────────────────────────────────────

export type TransparencyNoticeType =
  | "chatbot-disclosure"
  | "ai-generated-content"
  | "deepfake-disclosure"
  | "personalization-notice"
  | "emotion-recognition-notice"
  | "automated-decision-notice"

export type TransparencyPlacement =
  | "popup"
  | "footer"
  | "header"
  | "email-signature"
  | "video-overlay"
  | "inline"

export type TransparencyLanguage = "ro" | "en"

export type TransparencyTemplate = {
  language: TransparencyLanguage
  placement: TransparencyPlacement
  text: string
  /** Variantă scurtă pentru spații mici (footer compact, badge etc). */
  shortText?: string
  /** HTML gata de copy-paste (cu styling inline mic). */
  html?: string
}

export type TransparencyNoticeRequirement = {
  noticeType: TransparencyNoticeType
  /** Articolul AI Act care impune obligația (e.g. "Art. 50(1)"). */
  article: string
  /** Ce element din sistem a declanșat obligația — text scurt explicativ. */
  triggeredBy: string
  /** Data ISO la care obligația devine executorie. */
  deadline: string
  /** Text scurt al obligației (1-2 propoziții, în română). */
  obligation: string
  /** Severitate operațională — folosit pentru badge / prioritizare. */
  severity: "critical" | "high" | "medium"
  templates: TransparencyTemplate[]
}

export type TransparencyImplementation = {
  id: string
  systemId: string
  noticeType: TransparencyNoticeType
  placement: TransparencyPlacement
  language: TransparencyLanguage
  implementedAtISO: string
  implementedByEmail: string
  notes?: string
}

export type LiteracyRecord = {
  id: string
  employeeName: string
  role: string
  trainingDate: string          // ISO date YYYY-MM-DD
  trainingType: "intern" | "extern" | "platforma-online" | "workshop"
  topicsCovered: string[]
  trainerName: string
  durationHours: number
  attestationSigned: boolean
  notes?: string
  createdAtISO: string
}

// ────────────────────────────────────────────────────────────────────────────
//   ScanFinding (Sprint 008A — stub minimal pentru org-knowledge, extins
//   complet în 008A-4 cu toate câmpurile DPO-OS).
//   NU folosi acest type direct în feature code până nu e finalizat în 008A-4.
// ────────────────────────────────────────────────────────────────────────────

import type {
  CompliancePrinciple,
  ComplianceSeverity,
} from "@/lib/compliance/constitution"

export type ScanFinding = {
  id: string
  title: string
  detail: string
  category: FindingCategory
  severity: ComplianceSeverity
  risk: "high" | "low"
  principles: CompliancePrinciple[]
  createdAtISO: string
  sourceDocument: string
  legalReference?: string
  remediationHint?: string
  findingStatus?: "open" | "confirmed" | "dismissed" | "resolved" | "under_monitoring"
  reviewState?: "unreviewed" | "confirmed" | "evidence_attached" | "closed" | "monitoring"
}

// ────────────────────────────────────────────────────────────────────────────
//   Audit Trail — ComplianceEvent (Sprint 008A port from DPO-OS v3-unified)
//   Eveniment auditabil cu hash chain (SHA-256) pentru tamper-evidence.
//   Folosit ca ledger central pentru toate modulele (DPIA, RoPA, Breach,
//   AI Discovery, Vendor Review). Stocat în `ComplianceState.events`,
//   newest-first, cap 200 înregistrări.
// ────────────────────────────────────────────────────────────────────────────

export type ComplianceEventEntityType =
  | "scan"
  | "finding"
  | "alert"
  | "task"
  | "integration"
  | "system"
  | "drift"

export type ComplianceEventActorRole =
  | "owner"
  | "partner_manager"
  | "compliance"
  | "reviewer"
  | "viewer"

export type ComplianceEventActorSource = "session" | "workspace" | "system"

export type ComplianceEvent = {
  id: string
  type: string
  entityType: ComplianceEventEntityType
  entityId: string
  message: string
  createdAtISO: string
  actorId?: string
  actorLabel?: string
  actorRole?: ComplianceEventActorRole
  actorSource?: ComplianceEventActorSource
  metadata?: Record<string, string | number | boolean>
  // S2B.3 — Hash chain end-to-end (tamper-evident events ledger).
  // selfHash = SHA-256(prevHash + JSON.stringify(eventWithoutHashes)).
  // prevHash = selfHash al evenimentului anterior (sau "GENESIS" pentru primul).
  // Câmpurile lipsesc pe evenimente vechi (pre-S2B.3) — backward compatible.
  prevHash?: string
  selfHash?: string
}

/**
 * Stub minimal pentru `ComplianceState` — extins în Sprint 008A-4 cu toate
 * câmpurile AI-relevant. Aici ținem doar `events?` ca events.ts să poată
 * type-checka standalone.
 *
 * NU folosi acest type direct în cod feature — folosește `AIActState` din
 * `@/lib/server/store` (care, după 008A-7, va fi alias către `ComplianceState`).
 */
export type ComplianceState = {
  events?: ComplianceEvent[]
}

// ────────────────────────────────────────────────────────────────────────────
//   GDPR — DSAR (Sprint 007 port from DPO-OS v3-unified)
//   Data Subject Access Requests — GDPR Art. 15-22
//   Tracking cereri persoane vizate cu deadline legal (30 zile, extensibil 60).
// ────────────────────────────────────────────────────────────────────────────

export type DsarRequestType =
  | "access"          // Art. 15 — dreptul de acces
  | "rectification"   // Art. 16 — dreptul la rectificare
  | "erasure"         // Art. 17 — dreptul la ștergere
  | "portability"     // Art. 20 — dreptul la portabilitate
  | "objection"       // Art. 21 — dreptul la opoziție
  | "restriction"     // Art. 18 — dreptul la restricționare

export type DsarStatus =
  | "received"
  | "in_progress"
  | "awaiting_verification"
  | "responded"
  | "refused"

export type DsarRequest = {
  id: string
  orgId: string
  receivedAtISO: string
  deadlineISO: string                  // receivedAt + 30 zile
  extendedDeadlineISO?: string         // max 60 zile total, cu notificare
  requesterName: string
  requesterEmail: string
  requestType: DsarRequestType
  status: DsarStatus
  identityVerified: boolean
  systemsScoped?: boolean
  dataSearchCompleted?: boolean
  draftResponseGenerated: boolean
  responseReviewedByHuman: boolean
  responseSentAtISO?: string
  archivedAtISO?: string
  evidenceVaultIds: string[]
  notes?: string
  createdAtISO: string
  updatedAtISO: string
}
