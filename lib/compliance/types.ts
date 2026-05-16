// EU AI Act compliance types — AI-related only

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
