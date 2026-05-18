// Sprint 023 — API v1 input schema + validation.
//
// Pure functions only — no IO, no side effects. Used by /api/v1/* route
// handlers to parse + validate incoming bodies before they hit the
// classifier or compliance-gate engine.
//
// Why a hand-rolled validator and not Zod?
//   1. No new dependency.
//   2. Match the existing repo style (see lib/compliance/role-classifier.ts,
//      lib/compliance/ai-act-classifier.ts — all pure functions, no schema lib).
//   3. We control error messages (RO copy) + shape exactly.
//   4. Output is fully typed (`ClassifyV1Input`).
//
// Versioning policy:
//   - V1_API_VERSION is the stable string clients read from responses.
//   - Breaking changes ship at /api/v2 (new module + new constant). V1 stays
//     forever once announced. Additive changes (new optional fields) are OK
//     under v1.

import type {
  AISystemPurpose,
  ClassifyV1AutonomyLevel,
  ClassifyV1DeploymentContext,
  ClassifyV1Input,
  ClassifyV1Sector,
  ClassifyV1VendorRegion,
  DeploymentV1Input,
} from "@/lib/compliance/types"

export const V1_API_VERSION = "v1" as const

// ─── Allowed values (mirror the type unions) ─────────────────────────────────

export const VALID_PURPOSES: AISystemPurpose[] = [
  "hr-screening",
  "credit-scoring",
  "biometric-identification",
  "fraud-detection",
  "marketing-personalization",
  "support-chatbot",
  "document-assistant",
  "image-manipulation-intimate",
  "other",
]

export const VALID_SECTORS: ClassifyV1Sector[] = [
  "fintech",
  "healthcare",
  "hr",
  "education",
  "law_enforcement",
  "consumer",
  "industrial",
  "public",
  "other",
]

export const VALID_AUTONOMY_LEVELS: ClassifyV1AutonomyLevel[] = [
  "fully_autonomous",
  "human_in_loop",
  "human_on_loop",
  "human_in_command",
]

export const VALID_VENDOR_REGIONS: ClassifyV1VendorRegion[] = [
  "EU",
  "US",
  "UK",
  "other",
  "self_hosted",
]

export const VALID_DEPLOYMENT_CONTEXTS: ClassifyV1DeploymentContext[] = [
  "production",
  "staging",
  "preview",
  "internal",
]

// ─── Validation result types ─────────────────────────────────────────────────

export type ValidationError = {
  field: string
  message: string
  code: string
}

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; errors: ValidationError[] }

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v)
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((entry) => typeof entry === "string")
}

function requireString(
  body: Record<string, unknown>,
  field: string,
  errors: ValidationError[],
  maxLen = 256
): string | null {
  const raw = body[field]
  if (typeof raw !== "string" || raw.trim().length === 0) {
    errors.push({
      field,
      message: `Câmpul '${field}' este obligatoriu (string non-empty).`,
      code: "REQUIRED_STRING",
    })
    return null
  }
  if (raw.length > maxLen) {
    errors.push({
      field,
      message: `Câmpul '${field}' depășește limita de ${maxLen} caractere.`,
      code: "STRING_TOO_LONG",
    })
    return null
  }
  return raw.trim()
}

function optionalEnum<T extends string>(
  body: Record<string, unknown>,
  field: string,
  allowed: readonly T[],
  errors: ValidationError[]
): T | undefined {
  const raw = body[field]
  if (raw === undefined || raw === null) return undefined
  if (typeof raw !== "string") {
    errors.push({
      field,
      message: `Câmpul '${field}' trebuie să fie string.`,
      code: "INVALID_TYPE",
    })
    return undefined
  }
  if (!allowed.includes(raw as T)) {
    errors.push({
      field,
      message: `Valoare necunoscută pentru '${field}': '${raw}'.`,
      code: "INVALID_ENUM",
    })
    return undefined
  }
  return raw as T
}

function optionalBoolean(
  body: Record<string, unknown>,
  field: string,
  errors: ValidationError[]
): boolean | undefined {
  const raw = body[field]
  if (raw === undefined || raw === null) return undefined
  if (typeof raw !== "boolean") {
    errors.push({
      field,
      message: `Câmpul '${field}' trebuie să fie boolean.`,
      code: "INVALID_TYPE",
    })
    return undefined
  }
  return raw
}

function optionalStringArray(
  body: Record<string, unknown>,
  field: string,
  errors: ValidationError[],
  maxItems = 32
): string[] | undefined {
  const raw = body[field]
  if (raw === undefined || raw === null) return undefined
  if (!isStringArray(raw)) {
    errors.push({
      field,
      message: `Câmpul '${field}' trebuie să fie un array de string-uri.`,
      code: "INVALID_TYPE",
    })
    return undefined
  }
  if (raw.length > maxItems) {
    errors.push({
      field,
      message: `Câmpul '${field}' depășește ${maxItems} elemente.`,
      code: "ARRAY_TOO_LONG",
    })
    return undefined
  }
  return raw.map((s) => s.trim()).filter((s) => s.length > 0)
}

function optionalString(
  body: Record<string, unknown>,
  field: string,
  errors: ValidationError[],
  maxLen = 128
): string | undefined {
  const raw = body[field]
  if (raw === undefined || raw === null) return undefined
  if (typeof raw !== "string") {
    errors.push({
      field,
      message: `Câmpul '${field}' trebuie să fie string.`,
      code: "INVALID_TYPE",
    })
    return undefined
  }
  if (raw.length > maxLen) {
    errors.push({
      field,
      message: `Câmpul '${field}' depășește ${maxLen} caractere.`,
      code: "STRING_TOO_LONG",
    })
    return undefined
  }
  const trimmed = raw.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

// ─── Public API ──────────────────────────────────────────────────────────────

export function parseClassifyInput(body: unknown): ValidationResult<ClassifyV1Input> {
  if (!isPlainObject(body)) {
    return {
      ok: false,
      errors: [
        {
          field: "body",
          message: "Body invalid — trebuie să fie un obiect JSON.",
          code: "INVALID_BODY",
        },
      ],
    }
  }

  const errors: ValidationError[] = []
  const systemName = requireString(body, "systemName", errors)
  const purpose = optionalEnum(body, "purpose", VALID_PURPOSES, errors)
  if (purpose === undefined && !errors.some((e) => e.field === "purpose")) {
    errors.push({
      field: "purpose",
      message: `Câmpul 'purpose' este obligatoriu.`,
      code: "REQUIRED_ENUM",
    })
  }

  const sector = optionalEnum(body, "sector", VALID_SECTORS, errors)
  const userGroups = optionalStringArray(body, "userGroups", errors)
  const dataCategories = optionalStringArray(body, "dataCategories", errors)
  const processesPersonalData = optionalBoolean(body, "processesPersonalData", errors)
  const processesSpecialCategories = optionalBoolean(body, "processesSpecialCategories", errors)
  const autonomyLevel = optionalEnum(body, "autonomyLevel", VALID_AUTONOMY_LEVELS, errors)
  const humanOversightDocumented = optionalBoolean(body, "humanOversightDocumented", errors)
  const loggingEnabled = optionalBoolean(body, "loggingEnabled", errors)
  const vendorRegion = optionalEnum(body, "vendorRegion", VALID_VENDOR_REGIONS, errors)
  const modelProvider = optionalString(body, "modelProvider", errors)
  const deploymentContext = optionalEnum(body, "deploymentContext", VALID_DEPLOYMENT_CONTEXTS, errors)
  const dpaSigned = optionalBoolean(body, "dpaSigned", errors)

  if (errors.length > 0 || !systemName || !purpose) {
    return { ok: false, errors }
  }

  const value: ClassifyV1Input = {
    systemName,
    purpose,
    sector,
    userGroups,
    dataCategories,
    processesPersonalData,
    processesSpecialCategories,
    autonomyLevel,
    humanOversightDocumented,
    loggingEnabled,
    vendorRegion,
    modelProvider,
    deploymentContext,
    dpaSigned,
  }
  return { ok: true, value }
}

export function parseDeploymentInput(body: unknown): ValidationResult<DeploymentV1Input> {
  const base = parseClassifyInput(body)
  if (!base.ok) return base

  if (!isPlainObject(body)) {
    // Defensive — parseClassifyInput already covers this path.
    return {
      ok: false,
      errors: [{ field: "body", message: "Body invalid.", code: "INVALID_BODY" }],
    }
  }

  const errors: ValidationError[] = []
  const deploymentRef = requireString(body, "deploymentRef", errors, 128)
  if (errors.length > 0 || !deploymentRef) {
    return { ok: false, errors }
  }
  return { ok: true, value: { ...base.value, deploymentRef } }
}

// ─── Redaction helper (used by api-audit.ts) ─────────────────────────────────

/**
 * Builds a short, redacted summary string of the request. Logs ONLY:
 *   - purpose (always safe)
 *   - sector (low-cardinality enum)
 *   - has_personal_data / has_special_categories / dpa_signed (booleans)
 *   - deployment context
 *
 * NEVER logs: systemName, userGroups, dataCategories, modelProvider —
 * those can contain customer/PII data.
 */
export function summariseClassifyInput(input: ClassifyV1Input): string {
  const parts: string[] = []
  parts.push(`purpose=${input.purpose}`)
  if (input.sector) parts.push(`sector=${input.sector}`)
  if (input.deploymentContext) parts.push(`ctx=${input.deploymentContext}`)
  if (input.processesPersonalData !== undefined) {
    parts.push(`pd=${input.processesPersonalData ? "1" : "0"}`)
  }
  if (input.processesSpecialCategories !== undefined) {
    parts.push(`spc=${input.processesSpecialCategories ? "1" : "0"}`)
  }
  if (input.dpaSigned !== undefined) {
    parts.push(`dpa=${input.dpaSigned ? "1" : "0"}`)
  }
  if (input.humanOversightDocumented !== undefined) {
    parts.push(`oversight=${input.humanOversightDocumented ? "1" : "0"}`)
  }
  if (input.loggingEnabled !== undefined) {
    parts.push(`logging=${input.loggingEnabled ? "1" : "0"}`)
  }
  return parts.join(" ")
}
