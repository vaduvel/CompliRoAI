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
  /**
   * Sprint 012 — NIS2 AI slice. Setat de utilizator/cabinet când sistemul AI
   * susține un serviciu esențial/important. Setarea declanșează
   * `evaluateNis2AISystem` din `nis2-ai-rules.ts`.
   */
  nis2EntityScope?: AISystemNis2Scope
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
//   ScanFinding & resolution model (Sprint 008A — port complet din DPO-OS
//   v3-unified). Toate modulele care emit risc (DPIA, RoPA, Breach,
//   AI Discovery, Vendor Review, org-knowledge stale, etc.) produc
//   `ScanFinding` cu toate câmpurile opționale necesare cockpit-ului.
// ────────────────────────────────────────────────────────────────────────────

import type {
  CompliancePrinciple,
  ComplianceSeverity,
} from "@/lib/compliance/constitution"

export type TaskEvidenceKind =
  | "screenshot"
  | "policy_text"
  | "log_export"
  | "yaml_evidence"
  | "document_bundle"
  | "other"

export type FindingProvenance = {
  ruleId: string
  matchedKeyword?: string
  excerpt?: string
  startChar?: number
  endChar?: number
  signalSource?: "keyword" | "manifest"
  verdictBasis?: "direct_signal" | "inferred_signal"
  signalConfidence?: "high" | "medium"
}

export type LegalMapping = {
  regulation: string
  article: string
  label: string
  reason: string
}

/**
 * V3 P0.0 — Resolution Layer
 * Structura completă de la detectare la închidere și revalidare.
 * Orice finding nou trebuie să aibă cel puțin problem + impact + action.
 */
export type FindingResolution = {
  problem: string          // Ce problemă concretă a detectat sistemul
  impact: string           // Ce se întâmplă dacă nu e rezolvat
  action: string           // Acțiunea concretă recomandată
  generatedAsset?: string  // Asset generat de aplicație (document, raport, template)
  humanStep?: string       // Pasul uman obligatoriu (ce trebuie să facă persoana)
  closureEvidence?: string // Dovada care confirmă că problema e rezolvată
  revalidation?: string    // Când și cum se reverifică conformitatea
  reviewedAtISO?: string   // Momentul ultimei confirmări explicite din cockpit
}

export type DriftTrigger =
  | "time_elapsed"
  | "legislation_change"
  | "new_vendor_added"
  | "ai_system_modified"
  | "org_profile_change"
  | "incident_closed"
  | "efactura_status_change"

export type FindingDriftStatus = "active" | "resolved" | "reopened"

export type ScanFinding = {
  id: string
  title: string
  detail: string
  category: FindingCategory
  severity: ComplianceSeverity
  verdictConfidence?: "high" | "medium" | "low"
  verdictConfidenceReason?: string
  risk: "high" | "low"
  principles: CompliancePrinciple[]
  createdAtISO: string
  sourceDocument: string
  scanId?: string
  legalReference?: string
  impactSummary?: string
  remediationHint?: string
  legalMappings?: LegalMapping[]
  ownerSuggestion?: string
  evidenceRequired?: string
  evidenceTypes?: TaskEvidenceKind[]
  rescanHint?: string
  readyTextLabel?: string
  readyText?: string
  provenance?: FindingProvenance
  resolution?: FindingResolution
  // B2 — Finding status tracking
  findingStatus?: "open" | "confirmed" | "dismissed" | "resolved" | "under_monitoring"
  findingStatusUpdatedAtISO?: string
  nextMonitoringDateISO?: string
  reopenedFromISO?: string
  operationalEvidenceNote?: string
  driftStatus?: FindingDriftStatus
  driftTriggerType?: DriftTrigger
  driftTriggerReason?: string
  driftTriggeredAtISO?: string
  driftGraceExpiresAtISO?: string
  // B1 — Gemini semantic engine fields
  confidenceScore?: number           // 0-100, from semantic engine analysis
  requiresHumanReview?: boolean      // true if confidence < 80 or severity critical
  reasoning?: string                 // engine's reasoning for the finding
  sourceParagraph?: string           // exact text excerpt that triggered the finding
  suggestedDocumentType?: string     // suggested document to generate (dpa, privacy-policy, etc.)
  // P0-3 — Findings truth model (materialized from finding-kernel)
  findingTypeId?: string             // canonical type from classifyFinding()
  resolutionLocus?: "in_app" | "hybrid" | "external_controlled"
  resolutionMode?: "in_app_guided" | "in_app_full" | "external_action" | "user_attestation"
  closeCondition?: string            // human-readable close condition from kernel
  requiredEvidenceKinds?: string[]   // accepted evidence list from kernel
  reviewState?: "unreviewed" | "confirmed" | "evidence_attached" | "closed" | "monitoring"
  truthMaterializedAtISO?: string    // when truth fields were last stamped
}

// ────────────────────────────────────────────────────────────────────────────
//   ComplianceAlert — pop-up urgent în cockpit (deasupra findings).
// ────────────────────────────────────────────────────────────────────────────

export type AlertSeverity = ComplianceSeverity

export type ComplianceAlert = {
  id: string
  message: string
  severity: AlertSeverity
  open: boolean
  sourceDocument?: string
  createdAtISO: string
  scanId?: string
  findingId?: string
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

// ────────────────────────────────────────────────────────────────────────────
//   AI System extras DPO-OS (Sprint 008A — adăugate ca optional peste
//   `AISystemRecord` lighter version din CompliRoAI. Folosit de
//   `DetectedAISystemRecord` pentru flow-ul auto-discovery.
// ────────────────────────────────────────────────────────────────────────────

export type DetectedAISystemRecord = AISystemRecord & {
  sourceScanId?: string
  sourceDocument?: string
  discoveryMethod: Exclude<AISystemDiscoveryMethod, "manual"> | "hybrid"
  detectionStatus: AISystemDetectionStatus
  confidence: AISystemConfidence
  frameworks: string[]
  evidence: string[]
  detectedAtISO: string
  confirmedSystemId?: string
}

// ────────────────────────────────────────────────────────────────────────────
//   Drift (Sprint 008A — port DPO-OS subset). Records emise de modulele
//   compliance când detectează drift operațional (provider schimbat,
//   personal data added, etc.) sau de legislație.
// ────────────────────────────────────────────────────────────────────────────

export type ComplianceDriftSeverity = ComplianceSeverity
export type ComplianceDriftType = "operational_drift" | "compliance_drift"
export type ComplianceDriftChange =
  | "provider_added"
  | "provider_changed"
  | "model_changed"
  | "framework_added"
  | "human_review_removed"
  | "personal_data_detected"
  | "risk_class_changed"
  | "purpose_changed"
  | "data_residency_changed"
  | "provider_removed"
  | "tracking_detected"
  | "high_risk_signal_detected"

export type ComplianceDriftSettings = {
  severityOverrides: Partial<Record<ComplianceDriftChange, ComplianceDriftSeverity>>
}

export type ComplianceDriftEscalationTier = "watch" | "urgent" | "critical"
export type ComplianceDriftLifecycleStatus =
  | "open"
  | "acknowledged"
  | "in_progress"
  | "resolved"
  | "waived"

export type ComplianceDriftRecord = {
  id: string
  snapshotId: string
  comparedToSnapshotId: string | null
  type: ComplianceDriftType
  change: ComplianceDriftChange
  severity: ComplianceDriftSeverity
  summary: string
  severityReason?: string
  impactSummary?: string
  nextAction?: string
  evidenceRequired?: string
  lawReference?: string
  escalationOwner?: string
  escalationTier?: ComplianceDriftEscalationTier
  escalationSlaHours?: number
  escalationDueAtISO?: string
  lifecycleStatus?: ComplianceDriftLifecycleStatus
  acknowledgedAtISO?: string
  acknowledgedBy?: string
  inProgressAtISO?: string
  resolvedAtISO?: string
  waivedAtISO?: string
  waivedReason?: string
  escalationBreachedAtISO?: string
  lastStatusUpdatedAtISO?: string
  blocksAudit?: boolean
  blocksBaseline?: boolean
  requiresHumanApproval?: boolean
  systemLabel?: string
  sourceDocument?: string
  detectedAtISO: string
  before?: Record<string, string | number | boolean | null>
  after?: Record<string, string | number | boolean | null>
  open: boolean
}

// ────────────────────────────────────────────────────────────────────────────
//   DPIA — Data Protection Impact Assessment (GDPR Art. 35)
//   Port Sprint 008A (type only; lifecycle + store vin în 008C).
// ────────────────────────────────────────────────────────────────────────────

export type DpiaRecordStatus =
  | "draft"
  | "in_review"
  | "approved"
  | "mitigations_in_progress"
  | "completed"
  | "archived"

export type DpiaRiskLevel = "low" | "medium" | "high" | "critical"

export type DpiaRecord = {
  id: string
  title: string
  processingPurpose: string
  processingDescription: string
  dataCategories: string[]
  dataSubjects: string[]
  legalBasis: string
  specialCategories: boolean
  automatedDecisionMaking: boolean
  largeScaleProcessing: boolean
  linkedRopaDocumentId?: string
  linkedRopaEntryLabel?: string
  necessityAssessment: string
  proportionalityAssessment: string
  risks: string[]
  mitigationMeasures: string[]
  residualRisk: DpiaRiskLevel
  status: DpiaRecordStatus
  owner: string
  dueAtISO?: string
  reviewedAtISO?: string
  approvedAtISO?: string
  approvedBy?: string
  evidenceNote?: string
  evidenceFileName?: string
  exportedAtISO?: string
  createdAtISO: string
  updatedAtISO: string
}

// ────────────────────────────────────────────────────────────────────────────
//   GDPR training & HR reconciliation (port DPO-OS — Sprint 008A).
// ────────────────────────────────────────────────────────────────────────────

export type GdprTrainingAudience = "all_staff" | "management" | "new_hires" | "specific_roles"

export type GdprTrainingRecord = {
  id: string
  title: string
  audience: GdprTrainingAudience
  participantCount: number
  participantNames?: string[]
  status: "planned" | "completed" | "evidence_required"
  dueAtISO?: string
  completedAtISO?: string
  evidenceNote?: string
  evidenceFileName?: string
  evidenceFileType?: string
  evidenceFileSizeBytes?: number
  certificateTitle?: string
  evidenceValidatedAtISO?: string
  evidenceValidatedBy?: string
  createdAtISO: string
  updatedAtISO: string
}

export type HrRegistryReconciliationRecord = {
  findingId: string
  rosterSnapshot: string
  registryChecklistText: string
  updatedAtISO: string
}

// ────────────────────────────────────────────────────────────────────────────
//   DPO Migration imports (cabinet onboarding) — Sprint 008A subset port.
// ────────────────────────────────────────────────────────────────────────────

export type DpoMigrationImportKind =
  | "dsar-log"
  | "ropa-register"
  | "vendor-dpa-register"
  | "training-tracker"
  | "breach-log"
  | "approval-history"
  | "evidence-archive"

export type DpoMigrationImportRecord = {
  id: string
  kind: DpoMigrationImportKind
  fileName: string
  importedAtISO: string
  importedByEmail?: string
  rowCount: number
  importedCount: number
  skippedCount: number
  structuredCount: number
  archiveOnlyCount: number
  notes: string[]
}

// ────────────────────────────────────────────────────────────────────────────
//   Imported client context (partner workspace handoff).
// ────────────────────────────────────────────────────────────────────────────

export type ImportedClientContext = {
  source: "partner_import"
  importedAtISO: string
  contactName?: string
  contactEmail?: string
  phone?: string
  city?: string
  dpoContract?: string
  notes?: string
  raw?: Record<string, string>
}

// ────────────────────────────────────────────────────────────────────────────
//   Compliance streak (gamification — păstrăm hook-ul, UI vine separat).
// ────────────────────────────────────────────────────────────────────────────

export type ComplianceStreak = {
  currentDays: number        // consecutive days above threshold
  longestStreak: number      // personal record
  lastUpdated: string        // ISO date of last update
  threshold: number          // default 70
  brokenAt: string | null    // when the streak last broke
}

// ────────────────────────────────────────────────────────────────────────────
//   Opaque placeholders pentru module care vor fi portate ulterior.
//   Forma exactă vine din modulul portat — aici acceptăm Record<string,unknown>
//   pentru a permite stocarea fără să blocăm sprint-uri viitoare.
//
//   Sprint 008C va înlocui aceste placeholders cu type real:
//   - DpoDiscoveryWorkshopRecord (dpo-discovery-workshop)
//   - RopaActivityRecord (ropa-risk-engine)
//   - ClientIntakeSubmissionRecord (client-intake)
//   - AIDataMapRecord (ai-data-discovery)
//
//   Sprint 008B va înlocui:
//   - DiscoveryTriggerRecord vine din discovery-trigger-orchestrator (deja
//     portat în 008A-5 ca import explicit, vezi mai jos).
//
//   OrgProfile/ApplicabilityResult/OrgProfilePrefill — open shape până la
//   portarea modulului `applicability` (intra în Sprint 009).
// ────────────────────────────────────────────────────────────────────────────

export type OrgProfile = Record<string, unknown>
export type ApplicabilityResult = Record<string, unknown>
export type OrgProfilePrefill = Record<string, unknown>
export type DpoDiscoveryWorkshopRecord = Record<string, unknown>
export type ClientIntakeSubmissionRecord = Record<string, unknown>

// ────────────────────────────────────────────────────────────────────────────
//   AI Discovery — Wave 1 (Sprint 009)
//
//   Operationalizeaza AI Automation Library (compliroai-ai-automation-library
//   -2026-05-17.md): user descrie tool-urile AI folosite -> CompliRoAI mapeaza
//   la AIUseCaseCategory + AIRiskCandidate si emite findings (transparency,
//   missing DPA, missing DPIA, third-country transfers, prohibited practices).
//
//   AIDataMapRecord (full type, inlocuieste placeholder-ul 008A).
//   PIIDetection — output al PII scanner pe text/json/csv blobs.
//   AIExposureReport — agregare client-facing pentru AI Data Map.
//
//   Mandate § 19 cere AIUseCaseCategory + AIRiskCandidate ca canonic.
// ────────────────────────────────────────────────────────────────────────────

export type AIUseCaseCategory =
  | "customer_support"
  | "internal_copilot"
  | "sales_marketing"
  | "hr_workplace"
  | "finance_credit_fraud"
  | "medical_health"
  | "education"
  | "ecommerce_retail"
  | "legal_professional"
  | "ai_builder_agent"
  | "cybersecurity"
  | "public_sector_critical"
  | "other"

export type AIRiskCandidate =
  | "prohibited_candidate"
  | "high_risk_candidate"
  | "transparency_limited"
  | "minimal"
  | "needs_human_review"

export type AIDeploymentMode = "saas" | "self_hosted" | "api" | "embedded"

export type AIVendorRegion = "EU" | "US" | "UK" | "other" | "unknown"

export type AITrainingDataUsage =
  | "no_training"
  | "opt_out_available"
  | "trains_on_data"
  | "unknown"

export type AIDataMapStatus = "draft" | "active" | "deprecated"

export type AIDataMapRecord = {
  id: string
  orgId: string
  // Identification
  toolName: string                       // ex: ChatGPT, Copilot, custom GPT
  vendor: string                         // ex: OpenAI, Microsoft
  deploymentMode: AIDeploymentMode
  useCaseCategory: AIUseCaseCategory
  useCaseDescription: string
  // Data flow
  inputDataCategories: string[]          // ex: chat, documents, code, customer data
  outputDataCategories: string[]
  processesPersonalData: boolean
  processesSpecialCategories: boolean
  childrenData: boolean
  // Vendor / governance
  vendorRegion: AIVendorRegion
  trainingDataUsage: AITrainingDataUsage
  dpaSigned: boolean
  dpaUrl?: string
  subprocessorsDocumented: boolean
  // Risk
  riskCandidate: AIRiskCandidate
  reasons: string[]                      // why this risk level
  // Lifecycle
  linkedFindingIds: string[]             // findings emise din acest record
  linkedAISystemId?: string              // legatura optionala la AI inventory
  status: AIDataMapStatus
  notes?: string
  createdAtISO: string
  updatedAtISO: string
}

export type PIICategoryType =
  | "email"
  | "phone"
  | "cnp"
  | "iban"
  | "card"
  | "passport"
  | "ip"
  | "address"
  | "name"
  | "other"

export type PIIConfidence = "high" | "medium" | "low"

export type PIICategoryHit = {
  type: PIICategoryType
  count: number
  confidence: PIIConfidence
  sample?: string                        // primul sample masked
}

export type PIIDetection = {
  id: string
  orgId: string
  sourceLabel: string                    // ex: "chat-log.json", "manual paste"
  scannedAtISO: string
  detectionCount: number
  categories: PIICategoryHit[]
  linkedFindingId?: string
  notes?: string
}

export type AIExposureReportScope = {
  aiToolCount: number
  personalDataToolCount: number
  specialCategoryToolCount: number
  noDpaCount: number
  nonEuVendorCount: number
  highRiskCandidateCount: number
  prohibitedCandidateCount: number
}

export type AIExposureReport = {
  id: string
  orgId: string
  generatedAtISO: string
  scope: AIExposureReportScope
  topRisks: string[]                     // sorted risk summary
  recommendedActions: string[]
  markdown: string                       // full report
}

// ────────────────────────────────────────────────────────────────────────────
//   RoPA — Records of Processing Activities (GDPR Art. 30)
//   Port Sprint 008C — types extrase din donor `ropa-risk-engine.ts` ca sa
//   poata fi referentiate din ComplianceState fara dep ciclica.
// ────────────────────────────────────────────────────────────────────────────

export type RopaActivitySource =
  | "workshop"
  | "client-intake"
  | "import"
  | "manual"
  | "website-scan"

export type RopaActivityConfidence =
  | "client_claim"
  | "dpo_confirmed"
  | "document_verified"

export type RopaActivityStatus = "draft" | "needs_review" | "validated" | "stale"
export type RopaRiskLevel = "low" | "medium" | "high"

export type RopaThirdCountryTransfer = {
  country: string
  mechanism?: string
}

export type RopaActivityRecord = {
  id: string
  orgId?: string
  department?: string
  activityName: string
  ownerName?: string
  purpose: string
  dataSubjects: string[]
  dataCategories: string[]
  specialCategories: string[]
  legalBasis?: string
  article9Condition?: string
  recipients: string[]
  processors: string[]
  systems: string[]
  thirdCountryTransfers: RopaThirdCountryTransfer[]
  retentionRule?: string
  securityMeasures: string[]
  source: RopaActivitySource
  confidence: RopaActivityConfidence
  status: RopaActivityStatus
  linkedFindings: string[]
  linkedEvidence: string[]
  linkedAISystemIds?: string[]
  createdAtISO: string
  updatedAtISO: string
  lastReviewedAtISO?: string
  riskLevel?: RopaRiskLevel
  riskScore?: number
  riskReasons?: string[]
}

// ────────────────────────────────────────────────────────────────────────────
//   GDPR Breach — Art. 33 (ANSPDCP notification 72h) + Art. 34 (data subject
//   notification). Sprint 008D — standalone GDPR module, separat de NIS2
//   incident management (Sprint 012 va wire AI-critical NIS2 slice).
// ────────────────────────────────────────────────────────────────────────────

export type BreachSeverity = "low" | "medium" | "high" | "critical"

export type BreachStatus =
  | "draft"                    // în evaluare internă
  | "assessing"                // se evaluează necesitatea notificării
  | "anspdcp_required"         // necesită notificare ANSPDCP (Art. 33)
  | "anspdcp_notified"         // notificare ANSPDCP trimisă
  | "subjects_required"        // necesită notificare persoane vizate (Art. 34)
  | "subjects_notified"        // persoane vizate notificate
  | "closed"                   // caz închis cu toate notificările trimise
  | "no_notification_required" // documentat că nu necesită notificare

export type AnspdcpNotificationStatus = "draft" | "submitted" | "acknowledged"

export type BreachDataCategory =
  | "identification"           // nume, CNP, CI
  | "contact"                  // email, telefon, adresă
  | "financial"                // date bancare, card, salariu
  | "special_health"           // date sănătate
  | "special_biometric"        // date biometrice
  | "special_genetic"          // date genetice
  | "special_political"        // opinii politice
  | "special_religious"        // convingeri religioase
  | "special_sexual"           // viață sexuală
  | "special_criminal"         // condamnări penale
  | "children"                 // date minori
  | "employee"                 // date angajați
  | "credentials"              // parole, autentificare
  | "behavioral"               // tracking, cookie-uri, comportament
  | "other"

export type BreachCause =
  | "cyberattack"              // ransomware, phishing, hack
  | "insider_malicious"        // angajat rău-intenționat
  | "insider_accidental"       // greșeală angajat
  | "lost_device"              // laptop/telefon pierdut
  | "misconfiguration"         // ex: backup public
  | "third_party"              // vendor / subprocesator
  | "physical"                 // intruziune fizică, documente
  | "ai_system"                // AI a expus date (hallucinare, prompt leak)
  | "other"

export type BreachSubjectNotificationMethod =
  | "email"
  | "letter"
  | "public_communication"
  | "other"
  | "not_yet"

export type BreachAnspdcpNotification = {
  status: AnspdcpNotificationStatus
  submittedAtISO?: string
  referenceNumber?: string               // nr. înregistrare primit
  delayJustification?: string            // dacă notificarea > 72h, justificare obligatorie
}

export type BreachSubjectNotification = {
  sentAtISO?: string
  method: BreachSubjectNotificationMethod
  contentDocumented: boolean
  skipReason?: string                    // dacă subjectNotificationRequired=false dar e personal data, justificare
}

export type BreachEvidence = {
  id: string
  note: string
  url?: string
  fileName?: string
  attachedByEmail?: string
  attachedAtISO: string
}

export type BreachRecord = {
  id: string
  orgId: string
  // Identification
  title: string
  description: string
  cause: BreachCause
  // Timeline (CRITICAL — 72h clock starts here)
  discoveredAtISO: string                  // momentul descoperirii
  occurredAtISO?: string                   // momentul incidentului (poate fi necunoscut)
  deadlineISO: string                      // discoveredAt + 72h (calculat automat)
  // Scope & impact
  severity: BreachSeverity
  dataCategories: BreachDataCategory[]
  affectedSubjectsCount?: number           // număr aproximativ persoane afectate
  affectedSubjectsCategories: string[]     // ex: ["angajați", "clienți B2C"]
  affectedSystems: string[]                // ex: ["CRM", "fileserver", "Mailchimp"]
  // Risk assessment
  likelyConsequences: string               // ce se poate întâmpla persoanelor afectate
  highRiskToRights: boolean                // dacă DA → Art. 34 notificare persoane vizate
  // Mitigation
  containmentMeasures: string[]            // măsuri luate pentru limitare
  preventionMeasures: string[]             // măsuri viitoare
  // ANSPDCP notification (Art. 33)
  anspdcpNotificationRequired: boolean     // determinat automatic dacă date personale + nu evident sigur
  anspdcpNotification?: BreachAnspdcpNotification
  // Data subject notification (Art. 34)
  subjectNotificationRequired: boolean
  subjectNotification?: BreachSubjectNotification
  // Lifecycle
  status: BreachStatus
  assignedToEmail?: string
  linkedFindingId?: string                 // finding generat în /dashboard/resolve
  linkedAISystemIds?: string[]             // dacă AI e cauza
  evidenceVaultIds: string[]               // ID-uri evidence vault legacy (compat)
  evidence?: BreachEvidence[]              // dovezi atașate (note + url + fileName)
  notes?: string
  // Audit
  createdAtISO: string
  updatedAtISO: string
  closedAtISO?: string
}

// ────────────────────────────────────────────────────────────────────────────
//   Vendor AI Assessment + DPA Review — Sprint 010
//   GDPR Art. 28 (processor) + AI Act vendor obligations.
//
//   Vendor record links to one or more AI systems / data flows. CompliRoAI
//   tracks: DPA status, training data rights, subprocessor/transfer risk,
//   security evidence, AI-specific terms. Risk evaluator emits findings for
//   missing DPA, missing transfer review, missing security evidence,
//   missing AI terms, expired DPA, high-risk without human review.
//
//   NU full NIS2 vendor management (per mandate Rule 3). AI-critical
//   NIS2 vendor slice goes in Sprint 012.
// ────────────────────────────────────────────────────────────────────────────

export type VendorRiskLevel = "minimal" | "low" | "medium" | "high" | "critical"

export type VendorReviewStatus =
  | "draft"
  | "in_review"
  | "needs_dpa"
  | "needs_transfer_review"
  | "needs_security_review"
  | "approved"
  | "rejected"
  | "expired"

export type DPAStatus =
  | "not_required"
  | "missing"
  | "draft_received"
  | "negotiating"
  | "signed"
  | "expired"

export type VendorTransferMechanism =
  | "none"
  | "adequacy_decision"
  | "scc_controller_processor"
  | "scc_processor_processor"
  | "bcr"
  | "derogation_art_49"
  | "unknown"

export type VendorRegion = "EU" | "US" | "UK" | "other" | "unknown"

export type VendorRole =
  | "processor"
  | "controller"
  | "joint_controller"
  | "subprocessor"

export type VendorAITrainingOptOut =
  | "yes"
  | "no"
  | "default_opt_out"
  | "unknown"

export type VendorAIInputRetention =
  | "no_retention"
  | "session_only"
  | "days_30"
  | "indefinite"
  | "unknown"

export type VendorAIOutputOwnership =
  | "client"
  | "vendor"
  | "shared"
  | "unknown"

export type VendorAIModelTransparency =
  | "documented"
  | "partial"
  | "opaque"
  | "unknown"

export type VendorAITerms = {
  trainingDataOptOut: VendorAITrainingOptOut
  inputDataRetention: VendorAIInputRetention
  outputRightsOwnership: VendorAIOutputOwnership
  modelTransparency: VendorAIModelTransparency
  reproducibilityGuarantees: boolean
}

export type VendorSecurityEvidence = {
  iso27001: boolean
  soc2: boolean
  penTestRecent: boolean
  encryptionInTransit: boolean
  encryptionAtRest: boolean
  mfaEnforced: boolean
  auditLogsAvailable: boolean
  /** Vendor-promised SLA in hours pentru notificarea unui incident (ex. 24, 48, 72). */
  incidentNotificationCommitmentHours?: number
}

export type VendorRecord = {
  id: string
  orgId: string
  // ── Identification ────────────────────────────────────────────────────────
  name: string                                   // "OpenAI", "Microsoft Azure OpenAI"
  legalEntity?: string                           // "OpenAI Ireland Limited"
  contactEmail?: string
  productUsed: string                            // "ChatGPT Enterprise", "Azure OpenAI Service"
  vendorRegion: VendorRegion
  // ── Relationship ─────────────────────────────────────────────────────────
  role: VendorRole
  serviceCategory: string                        // "AI/LLM", "AI Vision", "AI Voice", "Vector DB", etc.
  linkedAISystemIds: string[]
  linkedAIDataMapIds: string[]
  // ── DPA (Art. 28 GDPR) ───────────────────────────────────────────────────
  dpaStatus: DPAStatus
  dpaUrl?: string
  dpaSignedAtISO?: string
  dpaExpiresAtISO?: string
  // ── International transfers (Art. 44-49 GDPR) ────────────────────────────
  transferRequired: boolean                      // true if data leaves EU/SEE
  transferMechanism: VendorTransferMechanism
  transferAssessmentNote?: string                // TIA summary
  // ── Subprocessors ────────────────────────────────────────────────────────
  subprocessorsList: string[]                    // ["Stripe", "AWS US-East", ...]
  subprocessorsUrl?: string                      // link to public subprocessor page
  // ── Security ─────────────────────────────────────────────────────────────
  securityEvidence: VendorSecurityEvidence
  // ── AI-specific terms ────────────────────────────────────────────────────
  aiTerms: VendorAITerms
  // ── Risk + review ────────────────────────────────────────────────────────
  riskLevel: VendorRiskLevel
  riskReasons: string[]
  reviewStatus: VendorReviewStatus
  humanReviewRequired: boolean
  reviewedByEmail?: string
  reviewedAtISO?: string
  nextRevalidationISO?: string                   // typically +1 year
  // ── Lifecycle ────────────────────────────────────────────────────────────
  linkedFindingIds: string[]
  notes?: string
  createdAtISO: string
  updatedAtISO: string
  /**
   * Sprint 012 — DORA AI slice. Setat când vendorul e material pentru un
   * serviciu financiar al orgului. Setarea declanșează
   * `evaluateDoraVendor` din `dora-ai-rules.ts`.
   */
  doraScope?: VendorDoraScope
}

// ────────────────────────────────────────────────────────────────────────────
//   DORA + NIS2 AI Slices — Sprint 012
//
//   STRICT: doar AI-relevant scope. Forbidden (per mandate § 13 + Rule 3) =
//   full DORA dashboard, full NIS2 dashboard, generic DNSC registration,
//   non-AI vendor management, generic cyber posture product.
//
//   Allowed DORA AI slice:
//     - AI vendor in financial service (extension `VendorRecord.doraScope`)
//     - Third-party AI risk
//     - AI incident evidence (when AI causes operational incident in fintech)
//     - DORA-style resilience notes when AI is material to financial service
//
//   Allowed NIS2 AI slice:
//     - AI system used in essential/important entity
//       (extension `AISystemRecord.nis2EntityScope`)
//     - AI incident or cybersecurity AI system in NIS2 scope
//     - Incident escalation + evidence pack for AI-critical service
//
//   Org self-declares regulatory profile via `OrgRegulatoryProfile`. Rules
//   engines (`dora-ai-rules.ts`, `nis2-ai-rules.ts`) consume profile + record
//   and emit findings tagged `EU_AI_ACT`/`GDPR`/`NIS2` so cockpit stays unified.
// ────────────────────────────────────────────────────────────────────────────

/**
 * Tipuri de entități DORA (Regulament UE 2022/2554, Art. 2).
 * `ict_third_party` = furnizor critic de servicii ICT (capitol V DORA).
 * `not_applicable` = orgul nu intră în scope DORA.
 */
export type DoraEntityType =
  | "credit_institution"      // bancă (CRD IV)
  | "payment_institution"     // PSP (PSD2)
  | "emi"                     // electronic money institution
  | "investment_firm"         // SSIF (MiFID II)
  | "insurance"               // asigurător (Solvency II)
  | "ucits_aifm"              // societate management fond (UCITS / AIFMD)
  | "crowdfunding"            // platformă crowdfunding (Reg. 2020/1503)
  | "crypto_casp"             // crypto-asset service provider (MiCA)
  | "ict_third_party"         // furnizor critic ICT terță parte
  | "not_applicable"

/**
 * Clase de entități NIS2 (Directiva UE 2022/2555, Anexa I + II).
 * `essential` = Anexa I (Art. 3 alin. 1).
 * `important` = Anexa II (Art. 3 alin. 2).
 */
export type Nis2EntityClass = "essential" | "important" | "not_in_scope"

/**
 * Sectoarele NIS2 (Anexa I + Anexa II). Listează doar sectoarele pe care
 * o organizație din RO le-ar putea declara în mod realist; menținem
 * `not_applicable` ca sentinel.
 */
export type Nis2Sector =
  | "energy"
  | "transport"
  | "banking"                 // overlap cu DORA
  | "financial_markets"       // overlap cu DORA
  | "health"
  | "drinking_water"
  | "waste_water"
  | "digital_infrastructure"  // DNS, cloud, data center, CDN, electronic comm
  | "ict_service_management"  // MSP, MSSP
  | "public_administration"
  | "space"
  | "postal_courier"
  | "waste_management"
  | "chemicals"
  | "food"
  | "manufacturing"
  | "digital_providers"       // marketplace, search engine, social network
  | "research"
  | "not_applicable"

/**
 * Profil regulator declarat de organizație. Folosit ca toggle pentru:
 *  - rulele DORA AI (vendor.doraScope.material)
 *  - rulele NIS2 AI (system.nis2EntityScope.inScope)
 *
 * Self-declaration → NU înlocuiește consultanță juridică. Câmpul
 * `notes` permite explicații libere (ex. "Solvency II §X")
 */
export type OrgRegulatoryProfile = {
  orgId: string
  // ── DORA self-declaration ────────────────────────────────────────────────
  doraApplies: boolean
  doraEntityType: DoraEntityType
  doraEntityRegistrationNumber?: string   // ex. cod BNR / ASF
  // ── NIS2 self-declaration ────────────────────────────────────────────────
  nis2EntityClass: Nis2EntityClass
  nis2Sectors: Nis2Sector[]
  nis2DnscRegistrationNumber?: string     // ID registru DNSC dacă există
  // ── Provenance ───────────────────────────────────────────────────────────
  declaredByEmail?: string
  declaredAtISO?: string
  notes?: string
  createdAtISO: string
  updatedAtISO: string
}

/**
 * Extensie DORA AI scope pe `VendorRecord`. `material: true` declanșează
 * `evaluateDoraVendor` și emite findings (Art. 28-30 DORA: ICT contractual
 * arrangements, exit strategy, incident notification SLA).
 */
export type VendorDoraScope = {
  material: boolean                       // material pentru serviciu financiar
  criticalForService?: string             // ex. "credit scoring", "payment routing"
  assessmentNote?: string                 // notă internă (TIA-stil)
  /** Marker setat de motorul DORA AI la ultima evaluare. */
  evaluatedAtISO?: string
}

/**
 * Extensie NIS2 scope pe `AISystemRecord`. `inScope: true` declanșează
 * `evaluateNis2AISystem` și emite findings (Art. 21-23 NIS2: governance +
 * incident escalation 24h/72h/1m, logging evidence).
 */
export type AISystemNis2Scope = {
  inScope: boolean
  service?: string                        // ex. "platformă plată cetățean"
  assessmentNote?: string
  evaluatedAtISO?: string
}

// ────────────────────────────────────────────────────────────────────────────
//   Client portal (cabinet ↔ client comments + uploads pe finding-uri).
// ────────────────────────────────────────────────────────────────────────────

export type ClientPortalDocument = {
  id: string
  findingId: string
  fileName: string
  contentType: string
  sizeBytes: number
  uploadedByEmail?: string
  uploadedAtISO: string
  note?: string
  storageKey: string
}

export type ClientPortalComment = {
  id: string
  findingId: string
  authorEmail?: string
  authorRole: "cabinet" | "client"
  body: string
  createdAtISO: string
}

// ────────────────────────────────────────────────────────────────────────────
//   ComplianceState — filtered AI-relevant subset (Sprint 008A-4).
//
//   Sursa: DPO-OS v3-unified `lib/compliance/types.ts:656-775`. Filtrat strict
//   la câmpuri relevante pentru CompliRoAI (AI Compliance OS):
//
//   PĂSTRATE (privacy + AI):
//   - core score + ledger: highRisk, lowRisk, gdprProgress, alerts, findings,
//     generatedDocuments, events
//   - AI inventory: aiSystems, detectedAISystems
//   - drift: driftRecords, driftSettings
//   - org profile: orgProfile, applicability, orgProfilePrefill
//   - shadow AI: shadowAiAnswers, shadowAiCompletedAtISO
//   - streak: complianceStreak
//   - knowledge: orgKnowledge
//   - DPIA/RoPA: dpiaRecords, ropaActivities, discoveryTriggers, aiDataMapRecords
//   - cabinet flows: partnerWorkspace, clientIntakeSubmissions, clientPortal*,
//     importedClientContext, dpoMigrationImports, dpoDiscoveryWorkshops
//   - HR/training (pentru AI Act Art. 4 + GDPR awareness): hrRegistryReconciliations,
//     gdprTrainingRecords
//   - CompliRoAI native: literacyRecords, onboarding, readinessPacks,
//     roleAssessment, transparencyImplementations, dsarRequests
//
//   ELIMINATE COMPLET (NU AI-relevant — fiscal/document-scanner/etc.):
//   - efactura* (Bundle D fiscal — separat product)
//   - scannedDocuments, scans (document scanner — diferit product)
//   - chat, taskState (UX layers — Sprint 011)
//   - aiComplianceFieldOverrides, traceabilityReviews (specific compliscan)
//   - fiscalProtocols, snapshotHistory, validatedBaselineSnapshotId
//   - intakeAnswers, intakeCompletedAtISO, d406EvidenceSubmitted
//   - siteScan, siteScanJobs (separate site-scanner module)
//   - anafRetryQueue, spvSeenMessageIds, integrations, aiPrivacyMode
//   - pfaForm082Clients, certSpvRecords (RO-fiscal only)
//
//   Sprint 008A-7 va aliasa `AIActState = ComplianceState` în store.ts.
// ────────────────────────────────────────────────────────────────────────────

export type ComplianceState = {
  // ── Core score + risk surface ──────────────────────────────────────────────
  highRisk: number
  lowRisk: number
  gdprProgress: number
  alerts: ComplianceAlert[]
  findings: ScanFinding[]
  events: ComplianceEvent[]

  // ── Documents generate de motoare (annex-iv, dpia, ropa exporturi) ─────────
  generatedDocuments: AIActGeneratedDocumentRecord[]

  // ── AI Inventory (manual + auto-detected) ──────────────────────────────────
  aiSystems: AISystemRecord[]
  detectedAISystems?: DetectedAISystemRecord[]

  // ── Drift detection ────────────────────────────────────────────────────────
  driftRecords?: ComplianceDriftRecord[]
  driftSettings?: ComplianceDriftSettings

  // ── Applicability engine (porting deferred — vezi placeholders) ────────────
  orgProfile?: OrgProfile
  applicability?: ApplicabilityResult
  orgProfilePrefill?: OrgProfilePrefill

  // ── V3 P2.1 Shadow AI ──────────────────────────────────────────────────────
  shadowAiAnswers?: { questionId: string; value: string | string[] }[]
  shadowAiCompletedAtISO?: string

  // ── Addon: Compliance Streak (gamification) ────────────────────────────────
  complianceStreak?: ComplianceStreak

  // ── Multiplicator B: Progressive Data Enrichment ───────────────────────────
  orgKnowledge?: import("@/lib/compliance/org-knowledge").OrgKnowledge

  // ── DPIA / RoPA / Discovery Triggers (Sprint 008C va aduce store-uri) ──────
  dpiaRecords?: DpiaRecord[]
  ropaActivities?: RopaActivityRecord[]
  discoveryTriggers?: import("@/lib/compliance/discovery-trigger-orchestrator").DiscoveryTriggerRecord[]

  /**
   * AI Data Map records (Sprint 009 — Wave 1 AI Discovery).
   * Fiecare entry mapeaza un tool AI folosit -> categorie + risc + governance.
   */
  aiDataMapRecords?: AIDataMapRecord[]

  /**
   * PII Discovery scans (Sprint 009). Output al scanner-ului pe text/blobs;
   * persistat pentru audit + linkage finding-uri.
   */
  piiDetections?: PIIDetection[]

  /**
   * AI Exposure Reports (Sprint 009). Snapshot agregat client-facing
   * generat din state-ul AI Data Map curent.
   */
  aiExposureReports?: AIExposureReport[]

  /**
   * GDPR breach records (Sprint 008D — Art. 33 ANSPDCP 72h + Art. 34 data
   * subject notification). Standalone modul, separat de NIS2 incidents.
   * Sprint 012 va wire AI-critical NIS2 slice care, când implică date
   * personale, poate emite un BreachRecord legat via `linkedFindingId`.
   */
  breachRecords?: BreachRecord[]

  /**
   * Vendor records (Sprint 010 — Vendor AI Assessment + GDPR Art. 28 DPA
   * Review). Fiecare vendor link-uieste la AI systems / AI data map; engine-ul
   * emite findings pentru lipsa DPA, transfer fara mecanism, AI terms
   * neclare, securitate insuficienta.
   */
  vendorRecords?: VendorRecord[]

  /**
   * Sprint 012 — DORA + NIS2 AI slice scope profile (org self-declaration).
   * NU activează module noi by-default; doar gate-uiește rule engines (DORA
   * AI / NIS2 AI) care apoi emit findings via canalul standard.
   */
  orgRegulatoryProfile?: OrgRegulatoryProfile

  // ── Cabinet workspaces & client onboarding ─────────────────────────────────
  partnerWorkspace?: {
    orgName?: string
    clientScale?: "1-5" | "5-20" | "20+"
    configuredAtISO: string
  }
  clientIntakeSubmissions?: ClientIntakeSubmissionRecord[]
  clientPortalDocuments?: ClientPortalDocument[]
  clientPortalComments?: ClientPortalComment[]
  importedClientContext?: ImportedClientContext
  dpoMigrationImports?: DpoMigrationImportRecord[]
  dpoDiscoveryWorkshops?: DpoDiscoveryWorkshopRecord[]

  // ── HR/training (AI Act Art. 4 + GDPR awareness) ───────────────────────────
  hrRegistryReconciliations?: Record<string, HrRegistryReconciliationRecord>
  gdprTrainingRecords?: GdprTrainingRecord[]

  // ── CompliRoAI native (păstrate din pre-008A) ──────────────────────────────
  literacyRecords: LiteracyRecord[]
  onboarding?: AIActOnboardingState
  readinessPacks?: AIActReadinessPackRecord[]
  roleAssessment?: RoleAssessment
  transparencyImplementations?: TransparencyImplementation[]
  dsarRequests?: DsarRequest[]

  /**
   * Sprint 013 — Approval queue (cabinet workflow: client request →
   * consultant decide). Apply pattern: la `approve`, motorul aplică
   * `proposedChange` pe entitate.
   */
  approvalRequests?: ApprovalRequest[]

  /**
   * Sprint 013 — Trust Center public tokens (link-uri shareable la profilul
   * public de compliance). Token-ul e HMAC self-contained — registry-ul de
   * aici servește pentru revocare + listare + view tracking.
   */
  trustCenterTokens?: TrustCenterToken[]

  /**
   * Sprint 014 — Stripe billing subscription. Updated by webhook handler;
   * read by /dashboard/setari/billing UI + by feature gates (read-only enforcement).
   */
  orgSubscription?: OrgSubscription

  /**
   * Sprint 016 — FRIA records (Art. 27 AI Act). Fiecare record evaluează
   * impactul asupra drepturilor fundamentale al unui sistem AI high-risk
   * pentru un deployer eligibil (organism public / servicii publice /
   * credit scoring / asigurări viață-sănătate). Findings emise de evaluator
   * sunt linkate via `linkedFindingIds[]`.
   */
  friaRecords?: FriaRecord[]

  /**
   * Sprint 017 — Human Oversight Protocols per AI system (Art. 14 AI Act).
   * Fiecare protocol documentează capacitățile Art. 14(3) acoperite, oamenii
   * responsabili (Art. 26(2)), escaladarea, contestația și procedura de
   * stop/fallback pentru un sistem AI high-risk. Findings sunt emise când
   * protocolul este incomplet sau lipsește pentru un sistem high-risk.
   */
  humanOversightProtocols?: HumanOversightProtocol[]

  /**
   * Sprint 018 — Logging Evidence per AI system (Art. 12 + Art. 26(6) AI Act).
   * Fiecare config descrie cum sunt logate evenimentele unui sistem AI
   * high-risk (categorii loguite, backend storage, retenție minimă 6 luni),
   * cum se asigură integritatea (hash chain, write-once, signed writes) și
   * cine are acces. Dovezi (export-uri SIEM, screenshot-uri, rapoarte
   * audit) sunt atașate per config cu retenție tracking. Findings emise
   * când config lipsește pentru sistem high-risk, retenția este sub minim
   * sau logs au expirat.
   */
  loggingEvidence?: LoggingConfig[]

  /**
   * Sprint 019 — Post-Market Monitoring plans per high-risk AI system (Art. 72
   * AI Act). Fiecare plan documentează cum se colectează date despre
   * performanța sistemului AI pe durata vieții (Art. 72(2)), cum se evaluează
   * continua conformitate cu Capitolul III Sec. 2 (Art. 72(3)(b)) și ce
   * mecanism de acțiune corectivă/preventivă există (Art. 72(3)(c)). Reviews
   * periodice, version changes (substantial mod. Art. 43(4)) și anomalii
   * detectate sunt stocate inline. Findings emise când planul lipsește pentru
   * un sistem high-risk, când datele colectate sunt insuficiente, când
   * review-ul este overdue, când o modificare substanțială rămâne fără
   * re-evaluare risc sau când o anomalie critică rămâne nerezolvată.
   */
  pmmPlans?: PmmPlan[]
}

// ────────────────────────────────────────────────────────────────────────────
//   Billing — Sprint 014
//
//   Stripe integration cu 7 tiers locked per CompliRoAI pricing mandate § 15.
//   NU se permit fiscal SKUs aici (rule mandate). Tier names exact ca în
//   pricing table din functional spec v2 § 5.
// ────────────────────────────────────────────────────────────────────────────

export type BillingTier =
  | "free_trial"
  | "imm_solo"
  | "imm_mid"
  | "ai_builder"
  | "cabinet_solo"
  | "cabinet_pro"
  | "cabinet_enterprise"
  | "one_off_audit"

export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "incomplete"
  | "incomplete_expired"
  | "unpaid"
  | "none"

export type OrgSubscription = {
  orgId: string
  // ── Stripe linkage ────────────────────────────────────────────────────────
  stripeCustomerId?: string
  stripeSubscriptionId?: string
  stripePriceId?: string
  // ── Current tier ──────────────────────────────────────────────────────────
  tier: BillingTier
  status: SubscriptionStatus
  // ── Period ────────────────────────────────────────────────────────────────
  currentPeriodStartISO?: string
  currentPeriodEndISO?: string
  trialEndsAtISO?: string
  cancelAtPeriodEnd: boolean
  // ── Pricing ───────────────────────────────────────────────────────────────
  monthlyPriceEUR?: number
  // ── Usage metrics (informational; not enforced as hard limits in v1) ──────
  usageMetrics: {
    activeClients?: number
    aiSystemsCount?: number
    findingsActiveCount?: number
    auditPacksGeneratedThisMonth?: number
    apiCallsThisMonth?: number
  }
  // ── Lifecycle ─────────────────────────────────────────────────────────────
  lastWebhookEventAtISO?: string
  createdAtISO: string
  updatedAtISO: string
}

// Forward decl pentru tipuri trăite în `lib/server/store.ts` care sunt parte
// din ComplianceState dar nu vrem să facem dependency loop. store.ts redefinește
// aceste tipuri și le re-exportă pentru cod feature.
export type AIActGeneratedDocumentRecord = {
  id: string
  systemId: string
  documentType: "annex-iv"
  content: string
  createdAtISO: string
  approvalStatus?: "pending" | "approved_as_evidence"
}

export type AIActOnboardingState = {
  completed: boolean
  completedAtISO?: string
  role?: "solo" | "cabinet"
  workspaceMode?: "imm-classic" | "ai-builder" | "cabinet"
  companyInfo?: {
    cui?: string
    sector?:
      | "fintech"
      | "saas"
      | "consulting"
      | "ecommerce"
      | "industrial"
      | "healthcare"
      | "education"
      | "altele"
    employeeCount?: "<10" | "10-49" | "50-249" | "250+"
  }
  builderInfo?: {
    ctoEmail?: string
    githubOrg?: string
    firstModelDeployed?: string
    customerFacing?: boolean
  }
  cabinetInfo?: {
    cabinetName?: string
    clientScale?: string
  }
  currentStep?: 1 | 2 | 3 | 4
}

export type AIActReadinessPackRecord = {
  id: string
  generatedAtISO: string
  generatedByUserId: string
  generatedByUserEmail?: string
  format: "zip" | "markdown" | "html" | "pdf"
  hashRoot: string
  contentsCount: number
  clientOrgId?: string
  clientOrgName?: string
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

// ────────────────────────────────────────────────────────────────────────────
//   FRIA — Fundamental Rights Impact Assessment (Art. 27 AI Act)
//   Sprint 016 — BUILD NEW pentru obligația deployer-ului unui sistem AI
//   high-risk (Reg. (UE) 2024/1689, Art. 27 + Carta drepturilor fundamentale).
//
//   FRIA este distinctă de DPIA (GDPR Art. 35): DPIA evaluează prelucrarea
//   datelor cu caracter personal, FRIA evaluează impactul sistemului AI
//   asupra DREPTURILOR FUNDAMENTALE ale persoanelor afectate. Art. 27(4)
//   permite reutilizarea DPIA dacă acoperă aceleași riscuri.
//
//   Categorii deployer (Art. 27(1)):
//     (a) public bodies + private entities providing public services
//     (b) credit scoring (Annex III pt. 5(b))
//     (b) life/health insurance pricing (Annex III pt. 5(c))
//
//   Drepturile fundamentale evaluate vin din Carta UE — 24 drepturi
//   relevante pentru sistemele AI (selectate din Titlurile I-VI).
// ────────────────────────────────────────────────────────────────────────────

export type FriaDeployerType =
  | "public_body"                    // Art. 27(1)(a) — organism public
  | "private_public_service"         // Art. 27(1)(a) — entitate privată cu serv. publice
  | "credit_assessment"              // Art. 27(1)(b) — Annex III pt. 5(b)
  | "life_health_insurance"          // Art. 27(1)(b) — Annex III pt. 5(c)
  | "other_high_risk_deployer"       // deployer high-risk fără mandat Art. 27(1)
  | "not_applicable"

export type FriaRecordStatus =
  | "draft"
  | "screening_done"
  | "in_review"
  | "needs_mitigation"
  | "approved"
  | "rejected"
  | "obsolete"

export type FriaRiskLevel = "low" | "medium" | "high" | "critical"

/**
 * Drepturile fundamentale evaluate în FRIA (selecție din Carta UE 2012/C 326/02).
 * 24 drepturi acoperă obligația Art. 27(1)(d) de a identifica „riscurile
 * specifice pentru drepturile persoanelor".
 */
export type FundamentalRight =
  // Titlul I — Demnitate
  | "human_dignity"                  // Art. 1
  | "right_to_life"                  // Art. 2
  | "integrity_of_person"            // Art. 3
  // Titlul II — Libertăți
  | "privacy_family_life"            // Art. 7
  | "data_protection"                // Art. 8
  | "freedom_thought_religion"       // Art. 10
  | "freedom_expression"             // Art. 11
  | "freedom_assembly"               // Art. 12
  | "right_to_education"             // Art. 14
  | "right_to_work"                  // Art. 15
  | "freedom_to_conduct_business"    // Art. 16
  | "right_to_property"              // Art. 17
  | "right_to_asylum"                // Art. 18
  // Titlul III — Egalitate
  | "equality_before_law"            // Art. 20
  | "non_discrimination"             // Art. 21
  | "cultural_religious_linguistic_diversity" // Art. 22
  | "gender_equality"                // Art. 23
  | "rights_of_child"                // Art. 24
  | "rights_of_elderly"              // Art. 25
  | "rights_of_disabled"             // Art. 26
  // Titlul IV — Solidaritate
  | "fair_working_conditions"        // Art. 31
  | "social_security"                // Art. 34
  | "consumer_protection"            // Art. 38
  // Titlul V — Cetățenie / Justiție
  | "good_administration"            // Art. 41
  | "effective_remedy"               // Art. 47

export type FriaLikelihood = "rare" | "unlikely" | "possible" | "likely" | "almost_certain"
export type FriaSeverity = "negligible" | "minor" | "moderate" | "major" | "catastrophic"

export type FriaAffectedGroup = {
  /** Etichetă liberă: "candidați angajare", "beneficiari de venit minim garantat", "clienți creditare". */
  category: string
  estimatedCount?: number
  /** Vulnerabilități declarate: copii, vârstnici, persoane cu dizabilități, etc. */
  vulnerabilities: string[]
}

export type FriaRiskAssessment = {
  rightAffected: FundamentalRight
  description: string
  likelihood: FriaLikelihood
  severity: FriaSeverity
  riskLevel: FriaRiskLevel
  mitigationMeasures: string[]
  residualRisk: FriaRiskLevel
}

export type FriaHumanOversightMeasureType =
  | "human_in_loop"
  | "human_on_loop"
  | "human_in_command"
  | "override"
  | "audit_log"
  | "explainability"
  | "complaint_mechanism"
  | "fallback"

export type FriaHumanOversightMeasure = {
  measureType: FriaHumanOversightMeasureType
  description: string
  /** Rolul responsabil: "DPO", "Compliance officer", "Operator HR", etc. */
  responsibleRole: string
  /** Condițiile care declanșează măsura: "scor sub prag", "decizie negativă". */
  triggerConditions: string
  documentedAtISO: string
}

export type FriaFrequencyOfUse =
  | "real_time_continuous"
  | "daily"
  | "weekly"
  | "monthly"
  | "ad_hoc"
  | "one_time"

export type FriaRecord = {
  id: string
  orgId: string
  title: string
  /** Sistemul AI cu risc înalt evaluat. */
  linkedAISystemId: string
  /** Art. 27(4) — DPIA care acoperă aceleași riscuri (reuse). */
  linkedDpiaRecordId?: string
  deployerType: FriaDeployerType
  /** Descrierea procesului în care e folosit sistemul AI. */
  processDescription: string
  periodOfUseStartISO?: string
  periodOfUseEndISO?: string
  frequencyOfUse: FriaFrequencyOfUse
  expectedVolume?: number
  /** Categoriile de persoane afectate de output-ul sistemului AI. */
  affectedGroups: FriaAffectedGroup[]
  /** Drepturile fundamentale identificate ca fiind la risc (multi-select din 24). */
  rightsAtRisk: FundamentalRight[]
  /** Evaluare per-drept: likelihood × severity → riskLevel + mitigare. */
  riskAssessments: FriaRiskAssessment[]
  /** Scor agregat 0-100 calculat de evaluator. */
  overallRiskScore: number
  overallRiskLevel: FriaRiskLevel
  /** Măsurile Art. 14 de supraveghere umană implementate. */
  humanOversightMeasures: FriaHumanOversightMeasure[]
  /** Descrierea mecanismului de plângere conform Art. 27(1)(f). */
  complaintMechanism: string
  /** Măsuri organizatorice + tehnice suplimentare. */
  governanceMeasures: string[]
  /** Notificare autoritate de supraveghere conform Art. 27(3) — ADR/ANSPDCP/ASF. */
  notifyAuthorityRequired: boolean
  notifyAuthorityName?: string
  notifiedAtISO?: string
  authorityReference?: string
  status: FriaRecordStatus
  reviewedByEmail?: string
  reviewedAtISO?: string
  approvedByEmail?: string
  approvedAtISO?: string
  rejectionReason?: string
  /** Findings emise de evaluator (linkate în /dashboard/resolve). */
  linkedFindingIds: string[]
  /** Evidence vault attachments (compat with audit pack). */
  evidenceVaultIds: string[]
  /** Markdown generat de evaluator pentru export. */
  generatedMarkdown?: string
  notes?: string
  createdAtISO: string
  updatedAtISO: string
}

// ────────────────────────────────────────────────────────────────────────────
//   Human Oversight Protocols — Art. 14 AI Act
//   Sprint 017 — BUILD NEW; protocol per high-risk AI system per Art. 14
//
//   Sursa legală:
//     • Reg. (UE) 2024/1689 Art. 14 — supraveghere umană (5 capacități cerute
//       la (3)(a)–(e); 4-eyes pentru biometric ID la (4))
//     • Reg. (UE) 2024/1689 Art. 26(2) — deployer trebuie să atribuie
//       responsabilitatea unei persoane cu competență, training, autoritate
//       și suport
// ────────────────────────────────────────────────────────────────────────────

/**
 * Modelul de supraveghere umană implementat pe sistem.
 *
 * - `human_in_the_loop` (HITL): un uman aprobă fiecare output înainte de execuție
 * - `human_on_the_loop` (HOTL): un uman monitorizează și poate interveni
 * - `human_in_command` (HIC): un uman setează parametri + are override
 * - `two_person_rule`: 4-eyes — Art. 14(4) pentru biometric ID
 * - `hybrid`: combinație (ex: HOTL + escalare HITL pe risc înalt)
 */
export type OversightModel =
  | "human_in_the_loop"
  | "human_on_the_loop"
  | "human_in_command"
  | "two_person_rule"
  | "hybrid"

/**
 * Cele 5 capacități obligatorii cerute de Art. 14(3):
 *   (a) understand the relevant capacities + limitations of the system
 *   (b) remain aware of automation bias
 *   (c) correctly interpret the output of the system
 *   (d) decide not to use the system OR override / disregard / reverse output
 *   (e) intervene in the operation of the system OR interrupt via "stop" button
 */
export type OversightCapability =
  | "understand_capabilities"
  | "aware_of_automation_bias"
  | "interpret_output_correctly"
  | "decide_not_to_use"
  | "intervene_or_stop"

export type OversightProtocolStatus =
  | "draft"
  | "in_review"
  | "approved"
  | "active"
  | "obsolete"
  | "rejected"

export type OversightCompleteness = "incomplete" | "partial" | "complete"

/**
 * Persoana responsabilă cu oversight pentru un sistem AI (Art. 26(2)).
 */
export type OversightResponsibleHuman = {
  email: string
  name?: string
  role: string                              // ex: "DPO", "Manager HR", "Operator"
  competenceLevel: "basic" | "trained" | "expert"
  trainingDocumentedAtISO?: string
  hasAuthorityToOverride: boolean
  hasSupportTeam: boolean
}

/**
 * Pas de escaladare (când + către cine se ridică o decizie/situație).
 */
export type OversightEscalationStep = {
  triggerCondition: string                  // ex: "Decizie impactează >100 candidați", "Risc >0.8"
  escalateToEmail: string
  escalateToRole: string
  slaHours: number
  notificationMethod: "email" | "sms" | "phone" | "slack" | "in_app"
}

/**
 * Procedura prin care persoana afectată poate contesta o decizie automată.
 */
export type OversightContestationProcedure = {
  channelDescription: string                // cum poate contesta (email/portal/telefon)
  acknowledgementSlaHours: number           // răspuns inițial
  resolutionSlaDays: number                 // decizie finală
  reviewerRole: string
  evidencePreservation: string              // cum păstrăm dovezile
}

/**
 * Procedura de stop / fallback (Art. 14(3)(e) + Art. 14(4)(d)).
 */
export type OversightStopProcedure = {
  stopButtonAvailable: boolean
  stopButtonLocation: string                // ex: "Admin dashboard", "Operator panel"
  fallbackMode:
    | "manual_processing"
    | "previous_model"
    | "deny_all"
    | "queue_for_review"
    | "other"
  fallbackDescription: string
  testedAtISO?: string
  testFrequency: "weekly" | "monthly" | "quarterly" | "annually"
}

/**
 * Dovadă atașată protocolului (training, audit log, screenshot fallback test).
 */
export type OversightEvidenceItem = {
  id: string
  type:
    | "log"
    | "screenshot"
    | "video"
    | "audit_report"
    | "training_record"
    | "test_report"
    | "other"
  description: string
  uploadedAtISO: string
  uploadedByEmail: string
  url?: string
  fileName?: string
}

/**
 * Înregistrarea completă a protocolului de oversight pentru un sistem AI.
 *
 * Fluxul:
 *   1. draft   — creat de operator, capacități parțial bifate
 *   2. in_review — DPO / responsabil verifică
 *   3. approved — semnătură electronică DPO/manager
 *   4. active   — în vigoare pentru utilizarea sistemului
 *   5. obsolete — sistemul retras sau protocol înlocuit
 *   6. rejected — review-ul a respins protocolul (motiv obligatoriu)
 */
export type HumanOversightProtocol = {
  id: string
  orgId: string
  // Identification
  title: string                             // ex: "Oversight Protocol — HR Screening AI"
  linkedAISystemId: string
  oversightModel: OversightModel
  // Art. 14(3) capabilities — must check each
  capabilitiesCovered: OversightCapability[]
  // Responsible humans (Art. 26(2))
  responsibleHumans: OversightResponsibleHuman[]
  // Workflow
  escalationSteps: OversightEscalationStep[]
  contestationProcedure: OversightContestationProcedure
  stopProcedure: OversightStopProcedure
  // Evidence
  evidenceChecklist: string[]               // human-defined items needed for audit
  evidenceItems: OversightEvidenceItem[]
  // Workflow status
  status: OversightProtocolStatus
  completeness: OversightCompleteness
  approvedByEmail?: string
  approvedAtISO?: string
  rejectionReason?: string
  nextReviewISO?: string                    // typically +6 months
  // Lifecycle
  linkedFindingIds: string[]
  notes?: string
  generatedMarkdown?: string
  createdAtISO: string
  updatedAtISO: string
}

// ────────────────────────────────────────────────────────────────────────────
//   Logging Evidence — Art. 12 + Art. 26(6) AI Act — Sprint 018 BUILD NEW
//
//   Art. 12(1): high-risk AI systems "shall technically allow for the
//     automatic recording of events (logs) over their lifetime".
//   Art. 12(2): logs must enable identification of situations risk Art. 79(1)
//     + substantial modifications, post-market monitoring (Art. 72) + human
//     oversight (Art. 14).
//   Art. 12(3): pentru biometric identification la distanță (Annex III 1(a))
//     OBLIGATORIU min: (a) periodul de utilizare; (b) baza de date de
//     referință; (c) input data verificate; (d) operatorii naturali.
//   Art. 26(6): deployer-ul păstrează logs MIN 6 luni (sau mai mult per
//     drepturile fundamentale / GDPR / lege EU/națională).
// ────────────────────────────────────────────────────────────────────────────

/**
 * Severitatea logging-ului per cerințele Art. 12 — variază cu riscul:
 *  - minimal           — recomandat pentru limited/minimal risk
 *  - standard          — high-risk standard (Art. 12(1))
 *  - enhanced          — high-risk + decizii cu impact (Art. 12(2))
 *  - biometric_full    — Annex III pt. 1(a) — Art. 12(3) integral
 */
export type LoggingSeverityLevel =
  | "minimal"
  | "standard"
  | "enhanced"
  | "biometric_full"

/**
 * Backend-uri tipice de storage logs. Folosit pentru self-declaration deployer.
 */
export type LoggingStorageBackend =
  | "local_files"
  | "siem_splunk"
  | "siem_elastic"
  | "siem_datadog"
  | "cloud_aws_cloudwatch"
  | "cloud_azure_monitor"
  | "cloud_gcp_logging"
  | "supabase"
  | "other"

/**
 * Stările de workflow pentru config-ul de logging.
 */
export type LoggingConfigStatus =
  | "draft"
  | "in_review"
  | "active"
  | "expired"
  | "obsolete"
  | "rejected"

/**
 * Cât de complet e configurat logging-ul față de Art. 12.
 */
export type LoggingCompleteness = "incomplete" | "partial" | "complete"

/**
 * Statusul retenției față de minRetentionMonths (Art. 26(6)).
 *  - compliant            — există dovadă recentă + actualRetention >= min
 *  - approaching_expiry   — < 30 zile până la expirarea ultimei dovezi
 *  - expired              — past retention end (last evidence + actualRetention < now)
 *  - no_evidence          — niciun item evidence atașat încă
 */
export type LoggingRetentionStatus =
  | "compliant"
  | "approaching_expiry"
  | "expired"
  | "no_evidence"

/**
 * Categoriile de evenimente loguite — derivate Art. 12(2) + Art. 12(3) +
 * Art. 14 (override) + Art. 72 (post-market monitoring).
 */
export type LoggingEventCategory =
  | "input_data_received"
  | "output_decision_made"
  | "human_override_applied"
  | "human_review_completed"
  | "stop_button_pressed"
  | "model_updated"
  | "data_drift_detected"
  | "error_or_anomaly"
  | "user_authentication"
  | "biometric_match_attempt"        // Art. 12(3)
  | "biometric_match_result"         // Art. 12(3)
  | "system_start_stop"
  | "other"

/**
 * Item de dovadă atașat config-ului (export SIEM, screenshot, raport audit).
 */
export type LogEvidenceItem = {
  id: string
  type:
    | "log_export"
    | "siem_screenshot"
    | "audit_report"
    | "retention_proof"
    | "integrity_proof"
    | "access_log"
    | "other"
  description: string
  uploadedAtISO: string
  uploadedByEmail: string
  url?: string
  fileName?: string
  /** SHA-256 declarat pentru tamper detection (opțional). */
  fileHash?: string
  /** Perioada acoperită de dovadă (folosit la calcul retention). */
  coversPeriodStartISO?: string
  coversPeriodEndISO?: string
  eventCount?: number
}

/**
 * Câmpuri suplimentare obligatorii Art. 12(3) pentru biometric ID Annex III 1(a).
 */
export type LoggingBiometricSpecifics = {
  periodOfUseTracked: boolean
  referenceDatabaseRecorded: boolean
  inputDataRecorded: boolean
  operatorsIdentified: boolean
}

/**
 * Înregistrarea completă a configurării de logging pentru un sistem AI.
 *
 * Flow status:
 *   1. draft     — creat de operator
 *   2. in_review — DPO/responsabil verifică
 *   3. active    — în vigoare
 *   4. expired   — retenția a depășit min/actual
 *   5. obsolete  — sistemul retras
 *   6. rejected  — review-ul a respins config-ul
 */
export type LoggingConfig = {
  id: string
  orgId: string
  // Identification
  title: string                             // ex: "Logging Config — HR Screening AI"
  linkedAISystemId: string
  severityLevel: LoggingSeverityLevel
  // Art. 12 — categorii loguite
  eventCategoriesLogged: LoggingEventCategory[]
  // Storage
  storageBackend: LoggingStorageBackend
  storageLocation: string                   // SIEM URL / bucket path / etc.
  // Art. 26(6) — retenția
  minRetentionMonths: number                // cerut (>= 6 default; mai mult pentru drepturi/GDPR)
  actualRetentionMonths: number             // declarat de deployer
  retentionPolicy: string                   // descriere narativă
  // Integritate
  integrityMechanism:
    | "hash_chain"
    | "writeonce"
    | "signed_writes"
    | "external_audit"
    | "none"
  integrityMechanismDescription: string
  // Access control
  accessRoleDescription: string             // cine poate citi logs
  accessLogged: boolean                     // meta-logging: dacă accesul la logs e și el logat
  // Art. 12(3) — biometric specific
  biometricSpecific?: LoggingBiometricSpecifics
  // Workflow
  status: LoggingConfigStatus
  completeness: LoggingCompleteness
  retentionStatus: LoggingRetentionStatus
  approvedByEmail?: string
  approvedAtISO?: string
  rejectionReason?: string
  /** ISO al ultimei dovezi atașate — folosit pentru retentionStatus. */
  lastEvidenceAtISO?: string
  /** Următoarea revizie (default +90 zile la create/update). */
  nextReviewISO?: string
  // Evidence
  evidenceChecklist: string[]               // listă liberă de items
  evidenceItems: LogEvidenceItem[]
  // Lifecycle
  linkedFindingIds: string[]
  notes?: string
  generatedMarkdown?: string
  createdAtISO: string
  updatedAtISO: string
}

// ────────────────────────────────────────────────────────────────────────────
//   Approval Queue — Sprint 013
//
//   Pentru flow cabinet: client face acțiune → consultant aprobă/respinge
//   înainte de finalizare. Aplicabil pentru DPIA screening, breach skip
//   notification, vendor approval, finding status change critic, etc.
//
//   Tied la share-tokens (Sprint 002): requesterii via magic link au
//   `linkedShareTokenId` setat pentru audit.
// ────────────────────────────────────────────────────────────────────────────

/**
 * Categoriile de schimbări care intră în cozile de aprobare. Acoperă
 * deciziile high-stakes care, în modul cabinet, trebuie să treacă printr-un
 * consultant înainte să devină definitive.
 */
export type ApprovalEntityType =
  | "finding_status_change"
  | "dpia_screening"
  | "breach_anspdcp_decision"
  | "breach_subject_skip"
  | "vendor_approved"
  | "vendor_rejected"
  | "ai_system_classification"
  | "transparency_notice_published"
  | "readiness_pack_exported"
  | "audit_pack_exported"

export type ApprovalStatus = "pending" | "approved" | "rejected" | "withdrawn"

export type ApprovalRequesterRole = "client" | "consultant"

export type ApprovalRequest = {
  id: string
  orgId: string
  // ── Ce se aprobă ──────────────────────────────────────────────────────────
  entityType: ApprovalEntityType
  entityId: string                            // findingId, dpiaId, breachId, vendorId, etc.
  title: string                               // ex: "Aprobă DPIA pentru HR Screening"
  description: string                         // human-readable summary
  /**
   * Payload structurat care descrie schimbarea propusă. La approve, motorul
   * o aplică automat pe entitate (vezi `approval-queue-store.approveRequest`).
   */
  proposedChange: Record<string, unknown>
  // ── Requester ─────────────────────────────────────────────────────────────
  requestedByEmail: string
  requestedByRole: ApprovalRequesterRole
  requestedAtISO: string
  // ── Reviewer ──────────────────────────────────────────────────────────────
  status: ApprovalStatus
  reviewedByEmail?: string
  reviewedAtISO?: string
  reviewComment?: string
  // ── Lifecycle ─────────────────────────────────────────────────────────────
  expiresAtISO?: string                        // opțional: expirare automată după N zile
  linkedShareTokenId?: string                  // dacă a fost generat via magic link
  notes?: string
  createdAtISO: string
  updatedAtISO: string
}

// ────────────────────────────────────────────────────────────────────────────
//   Calendar Event — Sprint 013
//
//   View agregat al deadline-urilor din toate modulele AI/GDPR/DORA/NIS2.
//   Generate de `lib/compliance/calendar-aggregator.ts` ca pure function din
//   ComplianceState. NU include fiscal (per mandate Rule 3).
// ────────────────────────────────────────────────────────────────────────────

export type CalendarEventModule =
  | "dsar"
  | "dpia"
  | "ropa"
  | "breach"
  | "vendor"
  | "ai_act_regulatory"      // dates oficiale: Art. 50, high-risk Annex III, etc.
  | "approval"
  | "finding"
  | "audit_pack"             // reminder lunar pentru audit pack
  | "trust_center"           // expirare link Trust Center

export type CalendarEventSeverity = "info" | "warning" | "urgent" | "critical"

export type CalendarEventStatus = "upcoming" | "due_today" | "overdue" | "completed"

export type CalendarEventRecurrence = {
  interval: "monthly" | "quarterly" | "yearly"
  until?: string
}

export type CalendarEvent = {
  /** ID stabil: `{module}-{entityId}-{kind}` ca să fie idempotent peste re-renders. */
  id: string
  module: CalendarEventModule
  entityId?: string
  entityLinkHref?: string                     // ex: "/dashboard/dsar"
  title: string
  description?: string
  dateISO: string                             // start
  endDateISO?: string                         // pentru intervale
  allDay: boolean
  severity: CalendarEventSeverity
  status: CalendarEventStatus
  recurring?: CalendarEventRecurrence
}

// ────────────────────────────────────────────────────────────────────────────
//   Trust Center — Sprint 013
//
//   Surface publică read-only pentru a dovedi postura de compliance către
//   clienți/auditori. Generat din ComplianceState curent, dar NU expune PII,
//   numele actorilor, conținut findings, nume vendori. Doar counts +
//   framework declarations + audit pack hash.
//
//   Distribuit prin token HMAC self-contained (pattern Sprint 002).
// ────────────────────────────────────────────────────────────────────────────

export type TrustCenterToken = {
  id: string
  orgId: string
  /** Token public (HMAC self-contained, fără DB lookup necesar). */
  token: string
  /** Label intern (ex: "Link pentru clientul X"). */
  label: string
  createdByEmail: string
  createdAtISO: string
  expiresAtISO?: string                       // opțional; null = fără expirare
  revokedAtISO?: string
  viewCount: number
  lastViewedAtISO?: string
}

export type TrustCenterPublicProfile = {
  // ── Org identification (controlat de white-label) ─────────────────────────
  orgName: string
  brandingLogoUrl?: string
  brandingColor?: string
  brandingSecondaryColor?: string
  brandingFooter?: string
  // ── Generated stamp ───────────────────────────────────────────────────────
  generatedAtISO: string
  // ── AI Act role ───────────────────────────────────────────────────────────
  aiActRole?: AIActRole | "unknown"
  roleDeterminedAtISO?: string
  // ── Frameworks declarate ──────────────────────────────────────────────────
  frameworksInScope: Array<"AI_ACT" | "GDPR" | "DORA" | "NIS2">
  doraEntityType?: string
  nis2EntityClass?: string
  // ── Compliance posture (counts only, NO details) ──────────────────────────
  stats: {
    aiSystemsCount: number
    highRiskSystemsCount: number
    findingsOpen: number
    findingsResolved: number
    findingsCritical: number
    dpiaCompletedCount: number
    ropaActivitiesCount: number
    breachesClosedCount: number
    breachesPendingCount: number
    vendorsApprovedCount: number
    transparencyNoticesImplementedCount: number
    literacyRecordsCount: number
  }
  // ── Latest audit pack (hash root pentru verificare) ───────────────────────
  latestAuditPack?: {
    generatedAtISO: string
    hashRoot: string
    contentsCount: number
  }
  // ── Attestations publice (text + dată confirmare + ref legală) ────────────
  attestations: Array<{
    label: string
    confirmedAtISO: string
    legalReference: string
  }>
}

// ────────────────────────────────────────────────────────────────────────────
//   Post-Market Monitoring — Art. 72 + Annex IV AI Act
//   Sprint 019 — BUILD NEW; monitoring plan + reviews + version changes per high-risk AI system
//
//   Art. 72(1): Providers establish + document PMM system proportionate to nature + risk.
//   Art. 72(2): PMM collects + documents data relevant to performance throughout lifetime.
//   Art. 72(3): PMM based on plan covering (a) data collection methods, (b) continuous
//               compliance evaluation, (c) corrective/preventive action identification.
//   Art. 72(4): Provider analyzes data + uses results to inform updates/improvements.
//   Art. 26(4): Deployers inform providers of malfunctioning + relevant data.
//
//   Art. 43(4): Substantial modification triggers re-evaluation of conformity assessment.
// ────────────────────────────────────────────────────────────────────────────

export type PmmPlanStatus =
  | "draft"
  | "in_review"
  | "approved"
  | "active"
  | "obsolete"
  | "rejected"

export type PmmCompleteness = "incomplete" | "partial" | "complete"

export type PmmFreshnessStatus =
  | "fresh"          // last review within reviewCycleMonths
  | "due_soon"       // < 30 days until next review
  | "overdue"        // past next review date
  | "no_reviews"     // no review ever recorded

export type PmmReviewCycle = "monthly" | "quarterly" | "biannual" | "annual"

export type PmmDataCollectionMethod =
  | "system_logs"            // ties to Sprint 018 logging
  | "user_feedback"          // ratings, complaints
  | "performance_metrics"    // accuracy, latency, throughput
  | "bias_metrics"           // fairness across demographics
  | "drift_detection"        // distribution shift monitoring
  | "incident_reports"       // ties to Sprint 020
  | "external_audit"         // third-party
  | "human_oversight_logs"   // ties to Sprint 017
  | "other"

/**
 * Reviewing type — `scheduled` (cycle), `ad_hoc` (DPO request), `incident_triggered`
 * (anomalie sau breach), `regulatory_request` (ANSPDCP / autoritate sectorială).
 */
export type PmmReviewType =
  | "scheduled"
  | "ad_hoc"
  | "incident_triggered"
  | "regulatory_request"

export type PmmReviewRecord = {
  id: string
  reviewDateISO: string
  reviewedByEmail: string
  reviewType: PmmReviewType
  /**
   * Metricile de performanță observate la review (ex: { accuracy: 0.92,
   * biasGapPct: 3.5, p95LatencyMs: 1200 }). Free-form mapping pentru a accepta
   * orice metrici relevante per use case.
   */
  performanceMetrics: Record<string, number | string>
  risksDetected: string[]
  correctiveActions: string[]
  preventiveActions: string[]
  notes?: string
  /**
   * ISO al următoarei revizii (calculat automat din `reviewCycleMonths` sau
   * override manual de reviewer dacă urgență cere review mai des).
   */
  nextReviewISO: string
}

export type PmmVersionChangeType =
  | "model_retrain"
  | "model_swap"
  | "fine_tune"
  | "config_update"
  | "prompt_update"
  | "data_source_change"
  | "infrastructure"
  | "other"

export type PmmVersionChangeRecord = {
  id: string
  changedAtISO: string
  changedByEmail: string
  oldVersion: string
  newVersion: string
  changeType: PmmVersionChangeType
  /**
   * Marker Art. 43(4): dacă modificarea reprezintă o schimbare substanțială
   * a sistemului AI, conformity assessment trebuie re-evaluat.
   */
  substantialModification: boolean
  description: string
  /**
   * Dacă true, plus `substantialModification`, evaluator-ul emite finding
   * CRITICAL când nu apare un review follow-up în următoarele 30 zile după
   * changedAtISO (Art. 43(4)).
   */
  riskReassessmentRequired: boolean
  approvedByEmail?: string
  notes?: string
}

export type PmmAnomalySeverity = "low" | "medium" | "high" | "critical"

export type PmmAnomalyCategory =
  | "performance_drop"
  | "bias_drift"
  | "data_drift"
  | "concept_drift"
  | "system_error"
  | "user_complaint"
  | "security"
  | "other"

export type PmmAnomalyRecord = {
  id: string
  detectedAtISO: string
  detectedByEmail?: string
  severity: PmmAnomalySeverity
  category: PmmAnomalyCategory
  description: string
  impactDescription: string
  resolved: boolean
  resolvedAtISO?: string
  /**
   * Marker: dacă a fost escalată spre AI Incident Reporting (Sprint 020,
   * Art. 73). Când `true`, `linkedIncidentId` referențiază entitatea creată
   * în registrul de incidente.
   */
  escalatedToIncident: boolean
  linkedIncidentId?: string
  notes?: string
}

export type PmmDataCollectionFrequency =
  | "real_time"
  | "daily"
  | "weekly"
  | "monthly"
  | "quarterly"

/**
 * Plan de Post-Market Monitoring (Art. 72 AI Act). Per sistem AI high-risk,
 * un singur plan activ; restul `obsolete` sau `rejected`.
 *
 * Lifecycle:
 *   1. draft     — operator/DPO populează cele 5 secțiuni Art. 72(3)
 *   2. in_review — DPO/responsabil verifică planul
 *   3. approved  — semnat de DPO; nu este încă activ (warm-up)
 *   4. active    — în vigoare; reviews/version changes/anomalies se atașează
 *   5. obsolete  — sistemul retras sau înlocuit
 *   6. rejected  — review a respins planul, trebuie rescris
 */
export type PmmPlan = {
  id: string
  orgId: string
  title: string
  linkedAISystemId: string
  // ── Art. 72(3)(a) Data collection ──────────────────────────────────────────
  dataCollectionMethods: PmmDataCollectionMethod[]
  dataCollectionFrequency: PmmDataCollectionFrequency
  dataCollectionDescription: string
  // ── Art. 72(3)(b) Continuous compliance evaluation ─────────────────────────
  /** Methodologii de evaluare (ex: "comparare rezultate AI vs ground truth lunar"). */
  complianceEvaluationMethods: string[]
  /** Metrici tracked pentru continua conformitate Cap III Sec 2. */
  complianceMetricsTracked: string[]
  // ── Art. 72(3)(c) Corrective + preventive action ───────────────────────────
  correctiveActionProcess: string
  preventiveActionProcess: string
  // ── Review cycle ───────────────────────────────────────────────────────────
  reviewCycle: PmmReviewCycle
  reviewCycleMonths: number   // computed: 1 / 3 / 6 / 12
  // ── Inline timelines ───────────────────────────────────────────────────────
  reviews: PmmReviewRecord[]
  versionChanges: PmmVersionChangeRecord[]
  anomalies: PmmAnomalyRecord[]
  // ── Workflow ───────────────────────────────────────────────────────────────
  status: PmmPlanStatus
  completeness: PmmCompleteness
  freshnessStatus: PmmFreshnessStatus
  approvedByEmail?: string
  approvedAtISO?: string
  rejectionReason?: string
  lastReviewAtISO?: string
  nextReviewISO?: string
  // ── Lifecycle ──────────────────────────────────────────────────────────────
  linkedFindingIds: string[]
  notes?: string
  generatedMarkdown?: string
  createdAtISO: string
  updatedAtISO: string
}
