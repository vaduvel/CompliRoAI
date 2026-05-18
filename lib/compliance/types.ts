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
  // Sprint 023.7 — placements pentru asset-level Art. 50 disclosure în reclame
  // plătite, social media și broadcast (email newsletter / push notification).
  | "advertisement"
  | "social-post"
  | "broadcast"

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
  /**
   * Sprint 023.7 — Art. 50 split provider vs deployer duty.
   * - `provider_marking` (Art. 50(2)) — providerul aplică marcaj tehnic
   *   machine-readable (C2PA / IPTC / watermark) pe output-ul AI generat.
   * - `deployer_disclosure` (Art. 50(1)/(3)/(4)) — deployerul informează
   *   vizibil persoanele expuse (chatbot info, deepfake label, public-interest
   *   editorial flag, emotion recognition notice).
   * - `both` — aceeași entitate este provider ȘI deployer (build + use).
   * Default backward-compatible: "deployer_disclosure".
   */
  dutyType?: ArtFiftyDutyType
}

// ────────────────────────────────────────────────────────────────────────────
//   Art. 50 Content Labeling Depth — Sprint 023.7
//
//   Per-asset register (distinct de TransparencyImplementation care e
//   per-system). Asset-level tracking permite:
//     - dovada provider duty (Art. 50(2)) — marcaj tehnic machine-readable;
//     - dovada deployer duty (Art. 50(1)/(3)/(4)) — disclosure vizibil;
//     - claim editorial responsibility pentru public-interest text
//       (Art. 50(4)(b) — derogare condiționată de human review).
//
//   Standardele de referință (industry de-facto pentru "machine-readable
//   format" cerut de Art. 50(2)):
//     - C2PA (Coalition for Content Provenance and Authenticity)
//     - IPTC PhotoMetadata
//     - SynthID / invisible AI watermark
//     - visible watermark (legacy fallback)
// ────────────────────────────────────────────────────────────────────────────

export type ArtFiftyDutyType =
  | "provider_marking"               // Art. 50(2) — mark technically (watermark, metadata)
  | "deployer_disclosure"            // Art. 50(1)/(3)/(4) — disclose visibly to humans
  | "both"                           // same entity is provider AND deployer

export type ContentLabelingStandard =
  | "c2pa"                           // Coalition for Content Provenance and Authenticity
  | "iptc_photo_metadata"            // IPTC PhotoMetadata standard
  | "watermark_visible"              // human-visible watermark
  | "watermark_invisible"            // invisible AI watermark (SynthID, etc.)
  | "metadata_only"                  // generic metadata, non-standard
  | "none"                           // no machine-readable marking

export type AIContentAssetType =
  | "image"
  | "video"
  | "audio"
  | "text_synthetic"                 // synthetic text content (LLM output published)
  | "deepfake"                       // deepfake content (Art. 50(4)(a))
  | "public_interest_text"           // Art. 50(4)(b) — text on matters of public interest
  | "chatbot_interaction"            // Art. 50(1)
  | "other"

export type AIContentEvidenceType =
  | "screenshot"
  | "sample_file"
  | "metadata_proof"
  | "editorial_log"
  | "watermark_test"
  | "other"

export type AIContentEvidenceItem = {
  id: string
  type: AIContentEvidenceType
  description: string
  uploadedAtISO: string
  uploadedByEmail: string
  url?: string
  fileName?: string
  fileHash?: string                  // SHA-256 for tamper detection
}

export type AIContentLabeledAsset = {
  id: string
  orgId: string
  // ── Identification ───────────────────────────────────────────────────────
  title: string                      // ex: "Banner reclamă produs X — generat Midjourney"
  assetType: AIContentAssetType
  linkedAISystemId?: string          // optional link to AISystemRecord
  // ── Distribution ─────────────────────────────────────────────────────────
  publishedAtISO?: string
  distributionContext: string[]      // ex: ["LinkedIn ads", "Website hero", "Email newsletter"]
  audienceSize?: number              // estimated reach
  // ── Provider duty (Art. 50(2)) ───────────────────────────────────────────
  providerMarkingApplied: boolean
  providerMarkingStandard: ContentLabelingStandard
  providerMarkingProof?: string      // URL or note describing technical mark
  // ── Deployer duty (Art. 50(1)/(3)/(4)) ───────────────────────────────────
  deployerDisclosureApplied: boolean
  deployerDisclosurePlacement?: TransparencyPlacement
  deployerDisclosureText?: string    // actual visible text shown to humans
  deployerDisclosureLanguage?: TransparencyLanguage
  // ── Public-interest editorial review (Art. 50(4)(b) exception) ───────────
  isPublicInterest?: boolean
  editorialReviewBy?: string         // email of editor who reviewed
  editorialReviewAtISO?: string
  editorialResponsibilityClaim?: boolean   // org claims editorial responsibility (exempts from Art. 50(4)(b))
  // ── Evidence ─────────────────────────────────────────────────────────────
  evidenceItems: AIContentEvidenceItem[]
  // ── Lifecycle ────────────────────────────────────────────────────────────
  linkedFindingIds: string[]
  notes?: string
  createdAtISO: string
  updatedAtISO: string
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

  /**
   * Sprint 023.7 — Art. 50 Content Labeling Register (per-asset).
   * Distinct from TransparencyImplementation (per-system) — assets are
   * concrete pieces of AI-generated content (image / video / audio / text /
   * deepfake / public-interest text / chatbot session) tracked individually
   * for provider duty (Art. 50(2) machine-readable marking) + deployer duty
   * (Art. 50(1)/(3)/(4) visible disclosure) evidence.
   *
   * Findings emise automat de transparency-content-store atunci când:
   *   - asset deepfake fără deployer disclosure (Art. 50(4)(a) — CRITICAL);
   *   - asset sintetic image/video/audio/text fără provider marking (Art. 50(2) — HIGH);
   *   - chatbot interaction fără runtime disclosure (Art. 50(1) — HIGH);
   *   - public-interest text fără editorial responsibility claim ȘI fără
   *     deployer disclosure (Art. 50(4)(b) — HIGH).
   */
  aiContentAssets?: AIContentLabeledAsset[]

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

  /**
   * Sprint 020 — AI Act serious incidents (Art. 73, distinct de GDPR Art. 33).
   * Fiecare record capturează un incident serios afectând un sistem AI
   * high-risk: categorie + severitate + deadline Art. 73(3) (2/10/15 zile) +
   * notificări către autoritatea de supraveghere + investigație root cause
   * Art. 73(4). Bidirectional links: linkedBreachId (Sprint 008D) când
   * același eveniment atinge date personale; linkedPmmAnomalyId (Sprint 019)
   * când a fost escaladat dintr-o anomalie PMM critică.
   */
  aiIncidents?: AIIncident[]

  /**
   * Sprint 021 — QMS Workspace (Art. 17 AI Act umbrella module pentru
   * providers of high-risk AI systems). Singular per org: o singură instanță
   * cu 13 secțiuni Art. 17(1)(a)-(m), lessons learned aggregator (auto +
   * manual) și per-system attestations. Cross-module references (DPIA + FRIA
   * + PMM + Incidents + Logging) sunt auto-populate de evaluator. Art. 17(2)
   * → implementare proporțională cu dimensiunea; Art. 17(3) → SME-urile pot
   * folosi `simplifiedMode=true` care marchează secțiuni "advanced" drept
   * opționale.
   */
  qmsWorkspace?: QmsWorkspace

  /**
   * Sprint 022 — Preventive engine state.
   *
   * `preventiveLastRunAtISO` + `preventiveLastRunSummary` populate de
   * `preventive-engine-runner.runPreventiveScan()`. Surfacate în
   * /dashboard/setari/preventive ca "ultima rulare".
   *
   * `renewalReminders` — emailuri programate (renewal-email-dispatcher
   * citește, marchează sent / skipped_already_resolved).
   *
   * `legislativeChangeAcknowledgments` — confirmări per org pentru
   * evenimentele globale din `LEGISLATIVE_CHANGE_LOG`.
   *
   * `preventiveEmailPreferences` — config per org: enabled, recipients,
   * digest frequency + per-rule toggle.
   */
  preventiveLastRunAtISO?: string
  preventiveLastRunSummary?: PreventiveRunSummary
  renewalReminders?: RenewalReminderRecord[]
  legislativeChangeAcknowledgments?: LegislativeChangeAcknowledgment[]
  preventiveEmailPreferences?: PreventiveEmailPreferences
  /**
   * Sprint 22 fix — Baseline ISO pentru rule 14 (legislative changes). Setat
   * automat la prima rulare preventive-engine (first scan). Modificările
   * legislative publicate ÎNAINTE de baseline sunt considerate parte din
   * baseline-ul de conformitate al organizației (nu fire reminder pentru ele).
   * Doar modificările publicate DUPĂ baseline fire — feature funcționează
   * forward-looking, nu retroactively.
   */
  legislativeBaselineISO?: string

  /**
   * Sprint 023 — API/SDK developer surface (only used by ai-builder workspace).
   *
   * `apiKeys` — registry of issued API keys (full token never persisted; only
   * SHA-256 hash + first 8 chars displayed as prefix). Created via
   * `/dashboard/api-sdk` UI (session auth) or `/api/v1/keys` POST.
   *
   * `apiCallLogs` — recent /api/v1/* calls (capped at 1000 entries, newest
   * first). Logged via `lib/server/api-audit.ts`. Request/response are
   * summarised + redacted — no raw user groups or data categories stored.
   */
  apiKeys?: ApiKey[]
  apiCallLogs?: ApiCallLog[]

  /**
   * Sprint 024 — AI Ads / LLM Commerce Compliance Pack.
   *
   * Legal/evidence workflow for AI-mediated advertising, GEO/LLM visibility,
   * LLM commerce recommendations and brand-claim substantiation. NOT a GEO tool
   * și NICI un nou framework — extinde modulele existente (Vendors / Content
   * Register Sprint 023.7 / Findings) cu cross-module references.
   *
   * Legal references:
   *  - Directive 2005/29/EC (unfair commercial practices) + RO Law 363/2007
   *  - GDPR Art. 5(1)(a) lawfulness + Art. 13/14 information + Art. 44-49 transfers
   *  - Art. 5 EU AI Act (prohibited practices — vulnerable categories targeting)
   *  - Art. 50(4) EU AI Act (AI-generated creative disclosure)
   */
  aiAdsCampaigns?: AIAdsCampaign[]
  aiAdsClaims?: AIAdsClaim[]
  aiAdsCreativeApprovals?: AIAdsCreativeApproval[]
  conversionTrackingReviews?: ConversionTrackingReview[]
}

// ────────────────────────────────────────────────────────────────────────────
//   Sprint 023 — API v1 + SDK types
//
//   Developer surface for AI builders integrating CompliRoAI into their
//   build/deploy workflow. All API responses are versioned ("v1") and shaped
//   to be stable contracts; breaking changes ship via /api/v2 in the future.
//
//   See lib/compliance/api-v1-schema.ts (input validation) +
//   lib/compliance/compliance-gate.ts (gate engine) +
//   app/api/v1/* (HTTP surface) + lib/sdk/* (TypeScript client).
// ────────────────────────────────────────────────────────────────────────────

export type ApiKeyScope =
  | "classify"        // POST /api/v1/classify
  | "gate"            // POST /api/v1/gate
  | "deployment"      // POST /api/v1/deployment
  | "read_state"      // future read-only access

export type ApiKeyStatus = "active" | "revoked" | "expired"

export type ApiKey = {
  id: string
  orgId: string
  /** Human-readable identifier, ex: "Production CI/CD", "Staging" */
  label: string
  /** First 8 chars of the full token, safe to display (ex: "cra_a1b2"). */
  prefix: string
  /** SHA-256 hex of the full token. Lookup key on incoming auth. */
  hmacHash: string
  createdByEmail: string
  createdAtISO: string
  lastUsedAtISO?: string
  /** Optional expiry (ISO date). When passed, status becomes "expired". */
  expiresAtISO?: string
  revokedAtISO?: string
  status: ApiKeyStatus
  scopes: ApiKeyScope[]
  notes?: string
}

export type ApiCallLog = {
  id: string
  orgId: string
  /** null/undefined when call was authenticated via session (e.g. /keys mgmt). */
  apiKeyId?: string
  /** Path of the API call, ex: "/api/v1/classify". */
  endpoint: string
  method: string
  statusCode: number
  durationMs: number
  ip?: string
  userAgent?: string
  /**
   * Hashed/redacted request summary (purpose + truthy flags). Never raw user
   * groups, data categories, or PII.
   */
  requestSummary: string
  /** Verdict / risk class / status code — short text. Never full response body. */
  responseSummary: string
  /** Internal error code, ex: "RATE_LIMITED", "INVALID_BODY". */
  errorCode?: string
  createdAtISO: string
}

// ── Compliance Gate response (consumed by /api/v1/gate + SDK.gate()) ─────────

export type ComplianceGateVerdict =
  /** Can deploy as-is. All obligations met or not applicable. */
  | "pass"
  /** Needs human review or additional evidence before deployment. */
  | "review_required"
  /** Must not deploy (prohibited use, missing critical safeguard). */
  | "blocked"

export type ComplianceGateReasonCategory =
  | "legal_prohibition"
  | "missing_evidence"
  | "risk_class_mismatch"
  | "transparency_required"
  | "dpia_required"
  | "fria_required"
  | "logging_required"
  | "human_oversight_required"
  | "dpa_missing"
  | "transfer_review"
  | "other"

export type ComplianceGateReasonSeverity = "info" | "warning" | "error"

export type ComplianceGateReason = {
  category: ComplianceGateReasonCategory
  /** Legal article reference, ex: "Art. 5(1)(a)", "Art. 27", "GDPR Art. 28". */
  articleRef: string
  severity: ComplianceGateReasonSeverity
  /** Human-readable RO message. */
  message: string
  /** Next action the developer/deployer should take. */
  nextAction: string
}

export type ComplianceGateRiskClass =
  | "prohibited"
  | "high"
  | "limited"
  | "minimal"
  | "unknown"

export type ComplianceGateRole =
  | "provider"
  | "deployer"
  | "importer"
  | "distributor"
  | "mixed"
  | "exempt"
  | "unknown"

export type ComplianceGateObligationStatus = "met" | "missing" | "not_applicable"

export type ComplianceGateObligation = {
  /** Legal article, ex: "Art. 14 AI Act", "GDPR Art. 28". */
  article: string
  description: string
  status: ComplianceGateObligationStatus
}

export type ComplianceGateResponse = {
  verdict: ComplianceGateVerdict
  riskClass: ComplianceGateRiskClass
  aiActRole: ComplianceGateRole
  reasons: ComplianceGateReason[]
  obligations: ComplianceGateObligation[]
  /** Evidence pieces the developer must attach to flip review/blocked → pass. */
  missingEvidence: string[]
  nextActions: string[]
  /** Hints surfaced in the Audit Pack ZIP at export time. */
  auditPackHints: string[]
  apiVersion: "v1"
  classifiedAtISO: string
}

// ── Classify response shape (used by /api/v1/classify + SDK.classify()) ─────

export type ClassifyV1Sector =
  | "fintech"
  | "healthcare"
  | "hr"
  | "education"
  | "law_enforcement"
  | "consumer"
  | "industrial"
  | "public"
  | "other"

export type ClassifyV1AutonomyLevel =
  | "fully_autonomous"
  | "human_in_loop"
  | "human_on_loop"
  | "human_in_command"

export type ClassifyV1VendorRegion = "EU" | "US" | "UK" | "other" | "self_hosted"

export type ClassifyV1DeploymentContext =
  | "production"
  | "staging"
  | "preview"
  | "internal"

export type ClassifyV1Input = {
  systemName: string
  purpose: AISystemPurpose
  sector?: ClassifyV1Sector
  userGroups?: string[]
  dataCategories?: string[]
  processesPersonalData?: boolean
  processesSpecialCategories?: boolean
  autonomyLevel?: ClassifyV1AutonomyLevel
  humanOversightDocumented?: boolean
  loggingEnabled?: boolean
  vendorRegion?: ClassifyV1VendorRegion
  modelProvider?: string
  deploymentContext?: ClassifyV1DeploymentContext
  dpaSigned?: boolean
}

export type ClassifyV1Obligation = {
  article: string
  description: string
}

export type ClassifyV1Response = {
  systemName: string
  riskClass: ComplianceGateRiskClass
  /** Mirrors the raw AI Act classifier output for the supplied purpose. */
  aiActArticle: string
  aiActReason: string
  aiActDeadline?: string
  aiActRole: ComplianceGateRole
  obligations: ClassifyV1Obligation[]
  nextActions: string[]
  apiVersion: "v1"
  classifiedAtISO: string
}

export type DeploymentV1Input = ClassifyV1Input & {
  /** Unique identifier supplied by the AI builder, ex: commit SHA or build tag. */
  deploymentRef: string
}

export type DeploymentV1Response = {
  deploymentRef: string
  systemName: string
  gate: ComplianceGateResponse
  /** True if a finding has been emitted for this deployment because gate != pass. */
  findingEmitted: boolean
  apiVersion: "v1"
  loggedAtISO: string
}

// ────────────────────────────────────────────────────────────────────────────
//   Preventive Engine — Sprint 022 (per mandate § 22)
//
//   Periodic scanning + reopen findings + renewal reminders + legislative
//   drift. NU vrem ca utilizatorul să afle de un deadline cu o zi înainte;
//   engine-ul rulează zilnic via Vercel Cron + manual via UI.
//
//   Scanner-ul e PURE FUNCTION (no IO). Runner-ul (în lib/server/) e cel
//   care emite findings + queueing email.
// ────────────────────────────────────────────────────────────────────────────

/**
 * Tipul triggerului preventiv detectat de scanner. 16 reguli care
 * acoperă toate modulele Sprint 008-021 cu deadlines / nextReview /
 * retention / dpaExpiry / approval expiry.
 */
export type PreventiveTriggerType =
  | "system_reclassification_needed"        // AI system purpose/vendor changed
  | "fria_review_overdue"
  | "dpia_review_overdue"
  | "oversight_review_overdue"
  | "logging_retention_expiring"
  | "pmm_review_overdue"
  | "vendor_dpa_expiring"
  | "qms_annual_review_due"
  | "transparency_notice_stale"
  | "dsar_response_overdue"
  | "breach_72h_expiring"
  | "ai_incident_deadline_expiring"
  | "approval_request_expired"
  | "legislative_change_unacknowledged"
  | "missing_audit_pack_recent"
  | "lessons_refresh_due"
  // Sprint 023.7 — Art. 50 Content Labeling Depth (rules 17-20).
  | "art50_deepfake_no_watermark"           // Art. 50(4)(a) — CRITICAL
  | "art50_synthetic_content_no_metadata"   // Art. 50(2) — HIGH
  | "art50_chatbot_no_runtime_disclosure"   // Art. 50(1) — MEDIUM/HIGH
  | "art50_public_interest_no_editorial_flag" // Art. 50(4)(b) — HIGH
  // Sprint 024 — AI Ads / LLM Commerce Compliance (rules 21-25).
  | "ai_ads_claim_evidence_missing"         // Directive 2005/29/EC + Law 363/2007 — MEDIUM
  | "ai_ads_creative_approval_missing"      // Art. 5 + Art. 50 AI Act + Law 363/2007 — HIGH
  | "ai_ads_tracking_review_missing"        // GDPR Art. 5/13/14/44-49 + ePrivacy — HIGH
  | "ai_ads_vendor_review_missing"          // GDPR Art. 28 — HIGH
  | "ai_ads_misleading_claim_risk"          // Directive 2005/29/EC Art. 5 — HIGH

/**
 * Nivelul de urgență al unei acțiuni preventive.
 *
 *   info       — informativ, nimic critic (ex: review în > 60 zile)
 *   watch      — atenție, deadline vine (30-60 zile)
 *   due_soon   — urgent, deadline în 5-30 zile
 *   overdue    — deadline depășit, acțiune necesară
 *   critical   — overdue + impact mare (FRIA / Breach 72h / Incident <2z)
 */
export type PreventiveActionUrgency =
  | "info"
  | "watch"
  | "due_soon"
  | "overdue"
  | "critical"

/**
 * Tipul de entitate scanată (mirror la entityType din ComplianceEvent
 * dar specific preventive — include "legislative_change" + "audit_pack").
 */
export type PreventiveEntityType =
  | "ai_system"
  | "fria"
  | "dpia"
  | "oversight"
  | "logging"
  | "pmm"
  | "vendor"
  | "qms"
  | "transparency"
  | "dsar"
  | "breach"
  | "ai_incident"
  | "approval"
  | "legislative_change"
  | "audit_pack"
  // Sprint 023.7 — Art. 50 content asset (per-asset, distinct of `transparency`
  // which is per-system implementation).
  | "content_asset"
  // Sprint 024 — AI Ads campaign + claim (per-campaign or per-claim).
  | "ai_ads_campaign"
  | "ai_ads_claim"

/**
 * Acțiunea preventivă detectată. ID-ul este stabil per (entity + rule) ca
 * runnerul să poată face dedup + auto-reopen al unui finding deja emis.
 */
export type PreventiveAction = {
  id: string                                // stable per entity+rule
  type: PreventiveTriggerType
  urgency: PreventiveActionUrgency
  // ── What triggered this ──────────────────────────────────────────────────
  entityType: PreventiveEntityType
  entityId: string
  entityLabel: string                       // human readable RO
  // ── What needs to happen ─────────────────────────────────────────────────
  recommendedAction: string                 // RO
  dueDateISO?: string                       // când devine overdue (dacă aplicabil)
  daysUntilDue?: number                     // negative dacă deja overdue
  // ── Outputs ──────────────────────────────────────────────────────────────
  shouldEmitFinding: boolean                // engine emite ScanFinding
  shouldEmail: boolean                      // engine queue email
  emailTemplate?: string                    // ex: "fria-review-reminder"
  emailRecipient?: string                   // resolved din state.org / responsible role
  emailScheduledAtISO?: string
  // ── Lifecycle ────────────────────────────────────────────────────────────
  detectedAtISO: string
  notes?: string
}

/**
 * Sumarul unei rulări preventive — persistat în
 * `state.preventiveLastRunSummary` pentru audit + display UI.
 */
export type PreventiveRunSummary = {
  runId: string
  startedAtISO: string
  completedAtISO: string
  durationMs: number
  triggerSource: "cron" | "manual" | "webhook"
  triggerByEmail?: string
  // ── Stats ────────────────────────────────────────────────────────────────
  actionsDetected: number
  findingsEmitted: number                   // new + reopened
  emailsQueued: number
  errorsCount: number
  errors: string[]
  // ── Per-type breakdown ───────────────────────────────────────────────────
  byType: Partial<Record<PreventiveTriggerType, number>>
}

/**
 * Reminder programat de scanner / runner. Dispatcher-ul citește
 * `scheduledForISO <= now` și trimite, marchează sent/skipped/failed.
 */
export type RenewalReminderRecord = {
  id: string
  triggerType: PreventiveTriggerType
  entityType: PreventiveEntityType
  entityId: string
  recipientEmail: string
  scheduledForISO: string                   // când să trimită
  sentAtISO?: string
  emailTemplate: string
  resendIfNotActioned: boolean              // re-send 7 zile mai târziu dacă entitatea pending
  status: "scheduled" | "sent" | "skipped_already_resolved" | "failed"
  failureReason?: string
}

/**
 * Preferințe de email per org pentru engine-ul preventiv.
 */
export type PreventiveEmailPreferences = {
  enabled: boolean
  recipientEmails: string[]
  digestFrequency: "immediate" | "daily" | "weekly"
  perRuleEnabled: Partial<Record<PreventiveTriggerType, boolean>>
}

// ────────────────────────────────────────────────────────────────────────────
//   Legislative Change Log — Sprint 022
//
//   Registru global (NOT per-org) de amendamente / guidance / acte delegate
//   publicate pentru AI Act + GDPR + DORA + NIS2 + reguli ANSPDCP. Permite
//   consultantilor să rămână înaintea drift-ului regulatoriu.
//
//   Stocat ca `LEGISLATIVE_CHANGE_LOG: LegislativeChangeEvent[]` în
//   `lib/compliance/legislative-change-log.ts` (static seed).
//   Acknowledge-urile sunt per org în state.legislativeChangeAcknowledgments.
// ────────────────────────────────────────────────────────────────────────────

export type LegislativeRegulation =
  | "AI_ACT"
  | "GDPR"
  | "DORA"
  | "NIS2"
  | "ANSPDCP"
  | "EDPB"
  | "AI_OFFICE"
  | "ROMANIAN_LAW"

export type LegislativeChangeImpact =
  | "high"
  | "medium"
  | "low"
  | "info_only"

/**
 * Modulele CompliRoAI care pot fi afectate de o schimbare legislativă.
 * Folosite pentru a sugera unde să adauge consultantul acțiuni.
 */
export type LegislativeAffectedModule =
  | "role_assessment"
  | "ai_inventory"
  | "prohibited"
  | "literacy"
  | "transparency"
  | "annex_iv"
  | "eu_database"
  | "conformity"
  | "fria"
  | "oversight"
  | "logging"
  | "pmm"
  | "ai_incidents"
  | "qms"
  | "dpia"
  | "ropa"
  | "breach"
  | "dsar"
  | "vendor"
  | "ai_discovery"

export type LegislativeChangeEvent = {
  id: string
  publishedAtISO: string
  effectiveFromISO?: string                 // când devine efectiv binding
  regulation: LegislativeRegulation
  articleReferences: string[]               // ex: ["Art. 50", "Annex III pt. 5(b)"]
  title: string                             // RO
  summary: string                           // RO 2-3 propoziții
  fullTextUrl?: string                      // EUR-Lex / EC link
  impact: LegislativeChangeImpact
  affectedModules: LegislativeAffectedModule[]
  recommendedActions: string[]              // RO list
  source: "auto_imported" | "manual"
}

/**
 * Confirmarea unei org că a luat la cunoștință o schimbare legislativă.
 * Inclus în state.legislativeChangeAcknowledgments. Acțiunea = opțional
 * un plan, opțional un closed timestamp.
 */
export type LegislativeChangeAcknowledgment = {
  changeId: string
  orgId: string
  acknowledgedAtISO: string
  acknowledgedByEmail: string
  actionPlan?: string
  completedAtISO?: string
  notes?: string
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

// ────────────────────────────────────────────────────────────────────────────
//   AI Incident Reporting — Art. 73 AI Act (Sprint 020)
//
//   Distinct from GDPR Art. 33 breach (Sprint 008D). Art. 73 AI Act se aplică
//   sistemelor AI high-risk introduse pe piață în UE (provider) sau folosite
//   în UE (deployer via Art. 26(5)), când apare un "incident serios" definit
//   la Art. 3(49):
//     (a) deces de persoană sau lezare gravă a sănătății
//     (b) perturbare gravă + ireversibilă a managementului / funcționării
//         infrastructurii critice
//     (c) încălcare a obligațiilor din dreptul Uniunii destinate protecției
//         drepturilor fundamentale
//     (d) prejudiciu grav adus proprietății sau mediului
//
//   Termenele Art. 73(3):
//     • 2 zile  → deces / lezare gravă a sănătății + critical_infrastructure
//                 (b) ireversibil + widespread infringement
//     • 10 zile → widespread infringement
//     • 15 zile → orice alt incident serios
//
//   Art. 73(4) cere investigație root cause. Art. 73(5) descrie conținutul
//   raportului (natura + circumstanțe + părți afectate + măsuri provizorii).
//   Art. 26(5) impune deployer-ului să informeze provider-ul când detectează
//   incident serios.
//
//   Bidirectional linkage:
//     • linkedBreachId    → BreachRecord (Sprint 008D) când același eveniment
//                           atinge și date personale (notificare paralelă
//                           ANSPDCP Art. 33 + market surveillance Art. 73)
//     • linkedPmmAnomalyId → PmmAnomalyRecord (Sprint 019) când incidentul a
//                           fost escaladat dintr-o anomalie PMM
// ────────────────────────────────────────────────────────────────────────────

/**
 * Categoria incidentului per Art. 73(2). Determină termenul de raportare:
 *   • death_or_serious_harm_health    → 2 zile
 *   • critical_infrastructure_disruption → 2 zile
 *   • widespread_infringement         → 10 zile
 *   • fundamental_rights_infringement → 15 zile
 *   • property_or_environment_harm    → 15 zile
 *   • other_serious                   → 15 zile
 */
export type AIIncidentCategory =
  | "death_or_serious_harm_health"
  | "critical_infrastructure_disruption"
  | "fundamental_rights_infringement"
  | "widespread_infringement"
  | "property_or_environment_harm"
  | "other_serious"

export type AIIncidentSeverity = "minor" | "moderate" | "serious" | "catastrophic"

/**
 * Lifecycle status:
 *   draft                    — în pregătire, nu s-a decis dacă e raportabil
 *   assessing                — evaluare de către DPO / responsabil AI
 *   notification_required    — confirmat raportabil, încă netrimis autoritate
 *   authority_notified       — notificarea a fost transmisă autorității
 *   root_cause_investigation — Art. 73(4) în curs
 *   remediated               — acțiuni corective aplicate, pending closure
 *   closed                   — incident închis cu lecții documentate
 *   not_reportable           — evaluat și concluzionat că NU este Art. 73
 */
export type AIIncidentStatus =
  | "draft"
  | "assessing"
  | "notification_required"
  | "authority_notified"
  | "root_cause_investigation"
  | "remediated"
  | "closed"
  | "not_reportable"

export type AIIncidentNotificationStatus =
  | "draft"
  | "submitted"
  | "acknowledged"
  | "additional_info_requested"

/**
 * O singură notificare către autoritate. Poate fi mai multe: notificarea
 * inițială (Art. 73(1)), urmată de update-uri / informații suplimentare la
 * cererea autorității (Art. 73(7)).
 */
export type AIIncidentNotificationRecord = {
  id: string
  /**
   * Numele autorității notificate. În România, market surveillance authority
   * pentru AI Act este TBD (ADR coordonează; ANCOM propus). DPO completează
   * conform desemnării oficiale din momentul incidentului.
   */
  authorityName: string
  status: AIIncidentNotificationStatus
  submittedAtISO?: string
  /** Numărul de înregistrare al autorității (probă oficială). */
  referenceNumber?: string
  acknowledgmentReceivedAtISO?: string
  additionalInfoRequestedAtISO?: string
  /** Persoană de contact din autoritate. */
  contactPersonEmail?: string
  notes?: string
}

/**
 * Art. 73(4) — investigația cauzei rădăcină. Provider-ul (și deployer-ul, prin
 * Art. 26(5)) trebuie să investigheze incidentul, să stabilească contribuitorii
 * și să implementeze măsuri corective + preventive verificabile.
 */
export type AIIncidentRootCause = {
  identifiedAtISO: string
  identifiedByEmail: string
  rootCauseDescription: string
  contributingFactors: string[]
  evidenceCollected: string[]
  remediationActions: string[]
  preventionActions: string[]
  preventiveMeasuresImplementedAtISO?: string
}

/**
 * Incident raportabil sub Art. 73 EU AI Act. Per sistem AI high-risk, poate
 * exista 0..N incidente; lifecycle-ul este independent pentru fiecare.
 *
 * Termenul (`reportingDeadlineISO`) este calculat de evaluator pornind de la
 * `detectedAtISO` (clock starts când organizația a luat la cunoștință, per
 * Art. 73(3) — "after becoming aware").
 */
export type AIIncident = {
  id: string
  orgId: string
  title: string
  description: string
  category: AIIncidentCategory
  severity: AIIncidentSeverity
  /** Sistemul AI high-risk implicat (din state.aiSystems). */
  linkedAISystemId: string
  /** Categorii de persoane afectate (ex: "clienți", "angajați", "pacienți"). */
  affectedSubjectsCategories: string[]
  /** Număr aproximativ de persoane afectate (best estimate). */
  affectedSubjectsCount?: number
  /** Când s-a produs efectiv incidentul (poate fi anterior detectării). */
  occurredAtISO?: string
  /**
   * Când organizația a devenit conștientă de incident — clock-ul Art. 73(3)
   * începe de la acest moment.
   */
  detectedAtISO: string
  /**
   * Calculat de evaluator pe baza categoriei: detectedAt + 2/10/15 zile.
   */
  reportingDeadlineISO: string
  reportingDeadlineDays: 2 | 10 | 15
  /**
   * Notificările trimise autorității de supraveghere (poate fi 0..N).
   */
  notifications: AIIncidentNotificationRecord[]
  /**
   * Concluzia evaluării: este incidentul raportabil Art. 73? True implicit
   * pentru categoriile (a)/(b)/(c); poate fi marcat false după evaluare DPO
   * dacă nu îndeplinește pragul "serios".
   */
  notificationRequired: boolean
  /**
   * Investigația Art. 73(4) — completată după ce echipa stabilește cauza.
   */
  rootCause?: AIIncidentRootCause
  /**
   * Sprint 008D bridge — când același eveniment atinge și date personale,
   * BreachRecord-ul GDPR Art. 33 paralel este referențiat aici.
   */
  linkedBreachId?: string
  /**
   * Sprint 019 bridge — când incidentul a fost escaladat dintr-o anomalie
   * PMM (PmmAnomalyRecord.severity = critical), planul + anomalia sunt
   * referențiate aici.
   */
  linkedPmmAnomalyId?: string
  /** ScanFinding-uri emise de evaluator (deadline overdue, lipsă root cause). */
  linkedFindingIds: string[]
  status: AIIncidentStatus
  assignedToEmail?: string
  closedAtISO?: string
  closureNotes?: string
  notes?: string
  /** Markdown live regenerat de evaluator pentru export. */
  generatedMarkdown?: string
  createdAtISO: string
  updatedAtISO: string
}

// ────────────────────────────────────────────────────────────────────────────
//   QMS — Quality Management System (Art. 17 AI Act)
//   Sprint 021 — umbrella module pentru providers of high-risk AI systems
//
//   Art. 17(1) cere providerului să stabilească un Sistem de Management al
//   Calității în formă scrisă, cu cel puțin elementele (a)-(m):
//     (a) strategie regulatory compliance + procedures conformity assessment +
//         management of modifications
//     (b) techniques + procedures + specifications design + design control +
//         design verification
//     (c) techniques + procedures + specifications development + quality
//         control + quality assurance
//     (d) examination, test, validation procedures (pre + post) + frecvență
//     (e) specifications + standards aplicate
//     (f) data management (collection, analysis, labeling, storage, filtration,
//         mining, aggregation, retention) BEFORE + during placing on market
//     (g) risk management system (Art. 9)
//     (h) setting-up + implementation + maintenance of post-market monitoring
//         (Art. 72)
//     (i) procedures pentru reporting serious incidents (Art. 73)
//     (j) handling communication cu autoritățile, notified bodies, customers,
//         alți operatori, public
//     (k) systems + procedures pentru record-keeping toate documentele
//     (l) resource management incl. security-of-supply
//     (m) accountability framework (responsabilități management + staff)
//   Art. 17(2) — implementare proporțională cu dimensiunea providerului.
//   Art. 17(3) — SME-urile pot folosi simplified QMS (documentație mai simplă).
//   Art. 16(c) — providers păstrează documentație QMS conform Art. 18.
//   Annex IV — QMS este inspectabil pentru conformity assessment.
//
//   Singular per org: o singură instanță QmsWorkspace per organizație.
//   Per-system attestation = confirmare per sistem AI high-risk că QMS
//   acoperă sistemul (Art. 17(1)(a) coverage).
//
//   Cross-module references auto-populate la evaluare:
//     (f) → RoPA (Sprint 008C) + AI Data Map (Sprint 009)
//     (g) → DPIA (Sprint 008C) + FRIA (Sprint 016) + findings (Sprint 008B)
//     (h) → PMM plans (Sprint 019)
//     (i) → AI Incidents (Sprint 020)
//     (k) → Logging Evidence (Sprint 018) + Audit Pack (Sprint 011)
// ────────────────────────────────────────────────────────────────────────────

export type QmsSectionKey =
  | "a_regulatory_compliance_strategy"
  | "b_design_control_verification"
  | "c_development_quality_assurance"
  | "d_examination_test_validation"
  | "e_technical_specifications_standards"
  | "f_data_management_systems"
  | "g_risk_management_system"
  | "h_post_market_monitoring"
  | "i_serious_incident_reporting"
  | "j_communication_with_authorities"
  | "k_record_keeping"
  | "l_resource_management_security"
  | "m_accountability_framework"

export type QmsSectionStatus =
  | "not_started"
  | "in_progress"
  | "documented"
  | "approved"
  | "needs_update"

export type QmsDocumentReferenceType =
  | "policy"
  | "procedure"
  | "standard"
  | "specification"
  | "template"
  | "report"
  | "audit_record"
  | "other"

export type QmsDocumentReference = {
  id: string
  type: QmsDocumentReferenceType
  title: string
  url?: string
  fileName?: string
  attachedAtISO: string
  attachedByEmail: string
  /** Ex: "v1.2 — 2026-05". Folosit pentru evidence layering în audit. */
  versionLabel?: string
  notes?: string
}

export type QmsSectionContent = {
  key: QmsSectionKey
  status: QmsSectionStatus
  /** Descriere narativă a modului în care secțiunea este îndeplinită. */
  description: string
  /** Procedură step-by-step sau sumar de implementare. */
  procedureSummary: string
  /** Ex: "Head of AI Engineering", "DPO", "CISO". */
  responsibleRole: string
  responsibleEmail?: string
  documentReferences: QmsDocumentReference[]
  // ── Cross-module reference counts (populate de evaluator) ────────────────
  /** Section (f) — RoPA. */
  linkedRopaActivityCount?: number
  /** Section (f) — AI Data Map records (Sprint 009). */
  linkedAIDataMapCount?: number
  /** Section (g) — DPIA records (Art. 9 risk management context). */
  linkedDpiaCount?: number
  /** Section (g) — FRIA records (Art. 9 + Art. 27). */
  linkedFriaCount?: number
  /** Section (g) — open findings care necesită mitigation. */
  linkedFindingCount?: number
  /** Section (h) — PMM plans (Art. 72). */
  linkedPmmPlanCount?: number
  /** Section (i) — AI Incidents (Art. 73). */
  linkedAIIncidentCount?: number
  /** Section (k) — Logging Evidence configs (Art. 12 + Art. 26(6)). */
  linkedLoggingConfigCount?: number
  reviewedAtISO?: string
  approvedAtISO?: string
  approvedByEmail?: string
  notes?: string
}

export type QmsLessonSource =
  | "ai_incident"
  | "pmm_anomaly"
  | "finding"
  | "manual"

export type QmsLessonLearned = {
  id: string
  source: QmsLessonSource
  /** ID-ul entității sursă (incident id, anomaly id, finding id). */
  sourceEntityId?: string
  /** Titlu scurt sintetic (ex: "AI bias în HR screening — necesită calibrare quarterly"). */
  title: string
  rootCauseSummary: string
  preventiveActionsTaken: string[]
  resultingPolicyChange?: string
  resultingProcessChange?: string
  recordedAtISO: string
  recordedByEmail: string
  /** ID-uri sisteme AI cărora lecția li se aplică (din state.aiSystems). */
  applicableToSystems: string[]
  notes?: string
}

export type QmsSystemAttestation = {
  /** ID-ul sistemului din state.aiSystems. */
  systemId: string
  attestedAtISO: string
  attestedByEmail: string
  /** Ex: "QMS v1.0 — 2026-05". */
  qmsVersionLabel: string
  /** Sectiunile QMS confirmate că acoperă sistemul. */
  sectionsConfirmedCovered: QmsSectionKey[]
  /** Gap-uri recunoscute (sectiuni neacoperite) — auditor-visible. */
  gapsAcknowledged: string[]
  notes?: string
}

export type QmsWorkspaceStatus = "draft" | "in_review" | "approved" | "obsolete"

export type QmsCompleteness = "incomplete" | "partial" | "complete"

export type QmsOrganizationSize = "sme" | "midsize" | "large"

/**
 * QMS Workspace — singular per org. Reflectă Art. 17(1)(a)-(m) ca 13 secțiuni
 * documentate + lessons learned aggregator (din incidents + PMM anomalies) +
 * per-system attestations.
 */
export type QmsWorkspace = {
  id: string
  orgId: string
  // ── Profil organizație pentru Art. 17(2)/(3) ─────────────────────────────
  organizationSize: QmsOrganizationSize
  /** Art. 17(3) — SME-urile pot folosi documentație simplificată. */
  simplifiedMode: boolean
  // ── 13 secțiuni Art. 17(1)(a)-(m) ────────────────────────────────────────
  sections: QmsSectionContent[]
  // ── Lessons learned (auto + manual) ──────────────────────────────────────
  lessonsLearned: QmsLessonLearned[]
  // ── Per-system attestations ──────────────────────────────────────────────
  systemAttestations: QmsSystemAttestation[]
  // ── Workflow ─────────────────────────────────────────────────────────────
  status: QmsWorkspaceStatus
  completeness: QmsCompleteness
  /** Ex: "v1.0 — 2026-05-18". Bumped manual la aprobare nouă. */
  versionLabel: string
  /** Typically CEO / Head of AI / Quality Manager. */
  approvedByEmail?: string
  approvedAtISO?: string
  /** Typically approvedAtISO + 12 months. */
  nextReviewISO?: string
  // ── Lifecycle ─────────────────────────────────────────────────────────────
  linkedFindingIds: string[]
  notes?: string
  /** Markdown live regenerat de evaluator pentru export. */
  generatedMarkdown?: string
  createdAtISO: string
  updatedAtISO: string
}

// ────────────────────────────────────────────────────────────────────────────
//   Sprint 024 — AI Ads / LLM Commerce Compliance Pack
//
//   Legal/evidence workflow for AI-mediated advertising + brand-claim
//   substantiation. NOT a GEO tool. NOT a protocol clone (CatyAI/Ahauros/NAP).
//   Cross-module integration: links to existing VendorRecord (Sprint 010) +
//   AIContentLabeledAsset (Sprint 023.7) — no duplicate registers.
//
//   Positioning (per mandate § 18.1):
//     "AI Ads Compliance Pack: ce afirmă AI-ul despre brand, pe ce sursă, cine
//      a aprobat, ce date au fost folosite și ce risc legal există."
//
//   Legal anchors:
//     - Directive 2005/29/EC unfair commercial practices + RO Law 363/2007
//     - GDPR Art. 5(1)(a)/13/14 + Art. 44-49 transfers
//     - Art. 5 + Art. 50(4) EU AI Act
//     - ePrivacy Directive 2002/58/EC (cookies + pixels)
// ────────────────────────────────────────────────────────────────────────────

export type AIAdsCampaignPlatform =
  | "chatgpt_ads"                    // OpenAI AI Ads Manager (when public)
  | "meta_ai_ads"                    // Meta AI placements
  | "google_ai_ads"                  // Google AI-powered campaigns
  | "perplexity_sponsored"           // Perplexity AI sponsored answers
  | "anthropic_claude"               // future Anthropic ad surface
  | "llm_recommendation_native"      // brand mentioned natively in LLM responses (organic LLM commerce)
  | "ai_generated_creative_meta"     // Meta with AI-generated creative
  | "ai_generated_creative_google"   // Google with AI-generated creative
  | "ai_generated_creative_linkedin" // LinkedIn AI creative
  | "other"

export type AIAdsCampaignStatus =
  | "draft"
  | "in_review"
  | "approved"
  | "active"
  | "paused"
  | "completed"
  | "rejected"

export type AIAdsCampaignType =
  | "paid_placement"                 // sponsored placement in AI interface
  | "llm_recommendation"             // organic LLM mentions (GEO/visibility)
  | "ai_generated_creative"          // creative made with AI for traditional ads
  | "ai_landing_page"                // AI-generated landing/copy
  | "hybrid"

export type AIClaimType =
  | "performance_metric"             // ex: "10x mai rapid"
  | "price_promise"                  // ex: "cel mai ieftin din piață"
  | "guarantee"                      // ex: "garanție 5 ani"
  | "certification"                  // ex: "ISO 27001 certified"
  | "comparative"                    // ex: "mai bun decât competitor X"
  | "endorsement"                    // ex: "recomandat de experți"
  | "compliance_claim"               // ex: "GDPR compliant"
  | "outcome_claim"                  // ex: "crește vânzările cu 30%"
  | "other"

export type AIClaimEvidenceStatus =
  | "unsubstantiated"                // no source linked yet
  | "internal_data"                  // internal metrics / studies
  | "third_party_audit"              // external audit / certification
  | "public_record"                  // public regulatory record
  | "vendor_attestation"             // vendor's own claim (e.g. "GDPR compliant")
  | "needs_review"
  | "verified"

export type AIClaimMisleadingRisk = "low" | "medium" | "high" | "critical"

export type ConversionTrackingMethod =
  | "first_party_cookie"
  | "third_party_cookie"
  | "server_side_tagging"
  | "pixel_meta"
  | "pixel_google"
  | "pixel_linkedin"
  | "audience_matching_crm_upload"
  | "fingerprinting"
  | "none"

export type AIAdsTransferMechanism =
  | "scc"
  | "adequacy"
  | "bcr"
  | "derogation"
  | "none"

/**
 * Claim registry — fiecare afirmație despre brand trebuie să mapeze la o
 * sursă verificabilă (Directive 2005/29/EC + RO Law 363/2007). Evaluator
 * heuristic stabilește `misleadingRisk` la creare/update.
 */
export type AIAdsClaim = {
  id: string
  orgId: string
  campaignId?: string                // optional link to campaign
  claimType: AIClaimType
  claimText: string                  // the actual claim
  contextDescription: string         // where + how the claim appears
  // Evidence source
  evidenceStatus: AIClaimEvidenceStatus
  evidenceSource?: string            // URL or note describing the source
  evidenceDocumentId?: string        // optional link to AIContentLabeledAsset.id
  // Risk
  misleadingRisk: AIClaimMisleadingRisk
  riskReasons: string[]
  // Approval
  approvedByEmail?: string
  approvedAtISO?: string
  approvalComment?: string
  // Lifecycle
  linkedFindingIds: string[]
  notes?: string
  createdByEmail: string
  createdAtISO: string
  updatedAtISO: string
}

/**
 * Creative approval log entry. Fiecare aprobare confirmă că cele 3 gate-uri
 * (Art. 5 AI Act prohibitions / consumer law / IP rights) au fost verificate
 * și că un om identificabil își asumă semnătura.
 */
export type AIAdsCreativeApproval = {
  id: string
  campaignId: string
  creativeAssetId?: string           // link to AIContentLabeledAsset.id (Sprint 023.7)
  creativeDescription: string
  approvedByEmail: string
  approvedAtISO: string
  comment?: string
  // Prohibited content check
  prohibitedContentChecked: boolean
  prohibitedContentNotes?: string
  // Compliance gates applied
  art5Check: boolean                 // Art. 5 AI Act prohibitions
  consumerLawCheck: boolean          // Law 363/2007 unfair commercial practices
  ipRightsCheck: boolean             // IP / copyright clearance
}

/**
 * GDPR review for conversion tracking infrastructure used by an AI Ads
 * campaign — pixels, cookies, audience matching, third-country transfers.
 * Evaluator auto-populează `gaps[]` la create/update.
 */
export type ConversionTrackingReview = {
  id: string
  orgId: string
  campaignId?: string                // optional link
  methods: ConversionTrackingMethod[]
  // Consent + cookie
  consentRequired: boolean
  consentRecordedHow: string         // ex: "CMP banner Cookiebot, granular per category"
  cookieList: string[]               // cookies set
  pixelList: string[]                // pixels deployed
  // CRM / audience
  crmUploadUsed: boolean
  crmDataCategoriesUploaded: string[] // ex: ["email hashed", "phone"]
  audienceMatchingPlatform?: string
  // Transfers (GDPR Art. 44-49)
  thirdCountryTransfer: boolean
  transferMechanism?: AIAdsTransferMechanism
  // Review status
  reviewedByEmail?: string
  reviewedAtISO?: string
  reviewNotes?: string
  // GDPR gaps
  gaps: string[]                     // auto-computed
  linkedFindingIds: string[]
  createdAtISO: string
  updatedAtISO: string
}

/**
 * AI Ads campaign — top-level record. Cross-module links (no duplicate
 * registers): linkedVendorId → VendorRecord (Sprint 010), linkedAssetIds[] →
 * AIContentLabeledAsset (Sprint 023.7), linkedClaimIds[] → AIAdsClaim,
 * approvalIds[] → AIAdsCreativeApproval, conversionTrackingReviewId →
 * ConversionTrackingReview.
 */
export type AIAdsCampaign = {
  id: string
  orgId: string
  // Identification
  title: string
  brandName: string                  // brand being advertised
  platform: AIAdsCampaignPlatform
  campaignType: AIAdsCampaignType
  // Cross-module links (NO duplicate registers)
  linkedVendorId?: string            // link to VendorRecord (Sprint 010)
  linkedAssetIds: string[]           // link to AIContentLabeledAsset[] (Sprint 023.7)
  linkedClaimIds: string[]           // link to AIAdsClaim[]
  // Lifecycle
  status: AIAdsCampaignStatus
  startDateISO?: string
  endDateISO?: string
  budgetEUR?: number
  targetAudienceDescription?: string
  targetsVulnerableCategories: boolean // minors, sensitive profiles
  // Platform terms review
  platformTermsReviewed: boolean
  platformTermsReviewedByEmail?: string
  platformTermsReviewedAtISO?: string
  // Tracking review
  conversionTrackingReviewId?: string // link to ConversionTrackingReview
  // Approvals
  approvalIds: string[]              // link to AIAdsCreativeApproval[]
  // Findings
  linkedFindingIds: string[]
  notes?: string
  createdByEmail: string
  createdAtISO: string
  updatedAtISO: string
}

