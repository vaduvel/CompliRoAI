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
  format: "zip" | "markdown" | "html"
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
