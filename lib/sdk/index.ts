// Sprint 023 — Public SDK entry point.
//
// Re-exports the client + all types AI builders need to type their code.
// The future npm package `@compliroai/client` will publish this file.

export { CompliRoAIClient, CompliRoAIError } from "./client"
export type {
  CompliRoAIClientOptions,
  HealthResponse,
  GateEvidenceInput,
  GateInput,
  DeploymentInput,
} from "./client"

export type {
  // Inputs
  ClassifyV1Input,
  ClassifyV1Sector,
  ClassifyV1AutonomyLevel,
  ClassifyV1VendorRegion,
  ClassifyV1DeploymentContext,
  DeploymentV1Input,
  // Responses
  ClassifyV1Response,
  ClassifyV1Obligation,
  ComplianceGateResponse,
  ComplianceGateReason,
  ComplianceGateReasonCategory,
  ComplianceGateReasonSeverity,
  ComplianceGateVerdict,
  ComplianceGateRiskClass,
  ComplianceGateRole,
  ComplianceGateObligation,
  ComplianceGateObligationStatus,
  DeploymentV1Response,
  // Misc
  AISystemPurpose,
} from "@/lib/compliance/types"
