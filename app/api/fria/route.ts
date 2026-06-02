/**
 * Sprint 016 — FRIA list + create.
 *
 * GET  /api/fria         → { records, summary, schema }
 * POST /api/fria         → creează FRIA record nou (rulează evaluator + emite findings)
 *
 * Body POST exemplu:
 *   {
 *     title: "FRIA HR Screening",
 *     linkedAISystemId: "sys-1",
 *     deployerType: "public_body",
 *     processDescription: "...",
 *     frequencyOfUse: "daily",
 *     affectedGroups: [...], rightsAtRisk: [...], riskAssessments: [...],
 *     humanOversightMeasures: [...], complaintMechanism: "...",
 *     notifyAuthorityRequired: false, notifyAuthorityName?: "ADR"
 *   }
 */
import { NextResponse } from "next/server"

import {
  FRIA_SCHEMA_V1,
  FUNDAMENTAL_RIGHTS_ORDERED,
} from "@/lib/compliance/fria-schema"
import { getOrgContext } from "@/lib/server/org-context"
import {
  createFria,
  readFriaRecords,
  type CreateFriaInput,
} from "@/lib/server/fria-store"
import type { ComplianceEventActorInput } from "@/lib/compliance/events"
import type {
  FriaAffectedGroup,
  FriaDeployerType,
  FriaFrequencyOfUse,
  FriaHumanOversightMeasure,
  FriaHumanOversightMeasureType,
  FriaLikelihood,
  FriaRiskAssessment,
  FriaRiskLevel,
  FriaSeverity,
  FundamentalRight,
} from "@/lib/compliance/types"

const DEPLOYER_TYPES: FriaDeployerType[] = [
  "public_body",
  "private_public_service",
  "credit_assessment",
  "life_health_insurance",
  "other_high_risk_deployer",
  "not_applicable",
]

const FREQUENCY_TYPES: FriaFrequencyOfUse[] = [
  "real_time_continuous",
  "daily",
  "weekly",
  "monthly",
  "ad_hoc",
  "one_time",
]

const LIKELIHOOD_TYPES: FriaLikelihood[] = [
  "rare",
  "unlikely",
  "possible",
  "likely",
  "almost_certain",
]

const SEVERITY_TYPES: FriaSeverity[] = [
  "negligible",
  "minor",
  "moderate",
  "major",
  "catastrophic",
]

const RISK_LEVELS: FriaRiskLevel[] = ["low", "medium", "high", "critical"]

const OVERSIGHT_TYPES: FriaHumanOversightMeasureType[] = [
  "human_in_loop",
  "human_on_loop",
  "human_in_command",
  "override",
  "audit_log",
  "explainability",
  "complaint_mechanism",
  "fallback",
]

function actorFromContext(ctx: {
  userId: string
  email: string
}): ComplianceEventActorInput {
  return {
    id: ctx.userId,
    label: ctx.email,
    role: "compliance",
    source: "session",
  }
}

function isDeployerType(value: unknown): value is FriaDeployerType {
  return typeof value === "string" && DEPLOYER_TYPES.includes(value as FriaDeployerType)
}

function isFrequency(value: unknown): value is FriaFrequencyOfUse {
  return typeof value === "string" && FREQUENCY_TYPES.includes(value as FriaFrequencyOfUse)
}

function isFundamentalRight(value: unknown): value is FundamentalRight {
  return typeof value === "string" && FUNDAMENTAL_RIGHTS_ORDERED.includes(value as FundamentalRight)
}

function isLikelihood(value: unknown): value is FriaLikelihood {
  return typeof value === "string" && LIKELIHOOD_TYPES.includes(value as FriaLikelihood)
}

function isSeverity(value: unknown): value is FriaSeverity {
  return typeof value === "string" && SEVERITY_TYPES.includes(value as FriaSeverity)
}

function isRiskLevel(value: unknown): value is FriaRiskLevel {
  return typeof value === "string" && RISK_LEVELS.includes(value as FriaRiskLevel)
}

function isOversightType(value: unknown): value is FriaHumanOversightMeasureType {
  return typeof value === "string" && OVERSIGHT_TYPES.includes(value as FriaHumanOversightMeasureType)
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string")
}

function validationError(message: string) {
  return NextResponse.json({ error: message }, { status: 400 })
}

function parseAffectedGroups(value: unknown): FriaAffectedGroup[] | string {
  if (value === undefined) return []
  if (!Array.isArray(value)) return "affectedGroups trebuie să fie array de obiecte."

  return value.map((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new Error(`affectedGroups[${index}] trebuie să fie obiect.`)
    }
    const group = item as Record<string, unknown>
    if (typeof group.category !== "string" || group.category.trim().length === 0) {
      throw new Error(`affectedGroups[${index}].category este obligatoriu.`)
    }
    if (group.estimatedCount !== undefined && typeof group.estimatedCount !== "number") {
      throw new Error(`affectedGroups[${index}].estimatedCount trebuie să fie număr.`)
    }
    if (group.vulnerabilities !== undefined && !isStringArray(group.vulnerabilities)) {
      throw new Error(`affectedGroups[${index}].vulnerabilities trebuie să fie string[].`)
    }
    return {
      category: group.category.trim(),
      estimatedCount: group.estimatedCount,
      vulnerabilities: group.vulnerabilities ?? [],
    }
  })
}

function parseRightsAtRisk(value: unknown): FundamentalRight[] | string {
  if (value === undefined) return []
  if (!Array.isArray(value)) return "rightsAtRisk trebuie să fie array."
  if (!value.every(isFundamentalRight)) {
    return "rightsAtRisk conține drepturi necunoscute. Folosește cheile canonice din schema FRIA."
  }
  return value
}

function parseRiskAssessments(value: unknown): FriaRiskAssessment[] | string {
  if (value === undefined) return []
  if (!Array.isArray(value)) return "riskAssessments trebuie să fie array de obiecte."

  return value.map((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new Error(`riskAssessments[${index}] trebuie să fie obiect.`)
    }
    const assessment = item as Record<string, unknown>
    if (!isFundamentalRight(assessment.rightAffected)) {
      throw new Error(`riskAssessments[${index}].rightAffected invalid.`)
    }
    if (typeof assessment.description !== "string") {
      throw new Error(`riskAssessments[${index}].description trebuie să fie text.`)
    }
    if (!isLikelihood(assessment.likelihood)) {
      throw new Error(`riskAssessments[${index}].likelihood invalid.`)
    }
    if (!isSeverity(assessment.severity)) {
      throw new Error(`riskAssessments[${index}].severity invalid.`)
    }
    if (!isRiskLevel(assessment.riskLevel)) {
      throw new Error(`riskAssessments[${index}].riskLevel invalid.`)
    }
    if (!isRiskLevel(assessment.residualRisk)) {
      throw new Error(`riskAssessments[${index}].residualRisk invalid.`)
    }
    if (!isStringArray(assessment.mitigationMeasures)) {
      throw new Error(`riskAssessments[${index}].mitigationMeasures trebuie să fie string[].`)
    }
    return {
      rightAffected: assessment.rightAffected,
      description: assessment.description.trim(),
      likelihood: assessment.likelihood,
      severity: assessment.severity,
      riskLevel: assessment.riskLevel,
      mitigationMeasures: assessment.mitigationMeasures,
      residualRisk: assessment.residualRisk,
    }
  })
}

function parseHumanOversightMeasures(value: unknown): FriaHumanOversightMeasure[] | string {
  if (value === undefined) return []
  if (!Array.isArray(value)) return "humanOversightMeasures trebuie să fie array de obiecte."

  return value.map((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new Error(`humanOversightMeasures[${index}] trebuie să fie obiect.`)
    }
    const measure = item as Record<string, unknown>
    if (!isOversightType(measure.measureType)) {
      throw new Error(`humanOversightMeasures[${index}].measureType invalid.`)
    }
    if (typeof measure.description !== "string" || measure.description.trim().length === 0) {
      throw new Error(`humanOversightMeasures[${index}].description este obligatoriu.`)
    }
    if (
      typeof measure.responsibleRole !== "string" ||
      measure.responsibleRole.trim().length === 0
    ) {
      throw new Error(`humanOversightMeasures[${index}].responsibleRole este obligatoriu.`)
    }
    if (typeof measure.triggerConditions !== "string") {
      throw new Error(`humanOversightMeasures[${index}].triggerConditions trebuie să fie text.`)
    }
    if (typeof measure.documentedAtISO !== "string") {
      throw new Error(`humanOversightMeasures[${index}].documentedAtISO trebuie să fie text.`)
    }
    return {
      measureType: measure.measureType,
      description: measure.description.trim(),
      responsibleRole: measure.responsibleRole.trim(),
      triggerConditions: measure.triggerConditions.trim(),
      documentedAtISO: measure.documentedAtISO,
    }
  })
}

export async function GET() {
  try {
    const ctx = await getOrgContext()
    const { records, summary } = await readFriaRecords(ctx.orgId)
    return NextResponse.json({ records, summary, schema: FRIA_SCHEMA_V1 })
  } catch {
    return NextResponse.json(
      { error: "Nu am putut citi registrul FRIA." },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getOrgContext()
    const body = await request.json().catch(() => ({}))

    const title = typeof body.title === "string" ? body.title.trim() : ""
    if (!title) {
      return NextResponse.json(
        { error: "Titlul FRIA este obligatoriu." },
        { status: 400 },
      )
    }
    const linkedAISystemId =
      typeof body.linkedAISystemId === "string" ? body.linkedAISystemId.trim() : ""
    if (!linkedAISystemId) {
      return NextResponse.json(
        { error: "Sistemul AI legat (linkedAISystemId) este obligatoriu." },
        { status: 400 },
      )
    }
    if (!isDeployerType(body.deployerType)) {
      return NextResponse.json(
        { error: "deployerType invalid (Art. 27(1))." },
        { status: 400 },
      )
    }
    if (!isFrequency(body.frequencyOfUse)) {
      return NextResponse.json(
        { error: "frequencyOfUse invalid." },
        { status: 400 },
      )
    }
    const processDescription =
      typeof body.processDescription === "string" ? body.processDescription.trim() : ""
    if (processDescription.length < 10) {
      return NextResponse.json(
        { error: "processDescription trebuie să aibă cel puțin 10 caractere." },
        { status: 400 },
      )
    }

    let affectedGroups: FriaAffectedGroup[]
    let rightsAtRisk: FundamentalRight[]
    let riskAssessments: FriaRiskAssessment[]
    let humanOversightMeasures: FriaHumanOversightMeasure[]

    try {
      const parsedAffectedGroups = parseAffectedGroups(body.affectedGroups)
      if (typeof parsedAffectedGroups === "string") return validationError(parsedAffectedGroups)
      affectedGroups = parsedAffectedGroups

      const parsedRightsAtRisk = parseRightsAtRisk(body.rightsAtRisk)
      if (typeof parsedRightsAtRisk === "string") return validationError(parsedRightsAtRisk)
      rightsAtRisk = parsedRightsAtRisk

      const parsedRiskAssessments = parseRiskAssessments(body.riskAssessments)
      if (typeof parsedRiskAssessments === "string") return validationError(parsedRiskAssessments)
      riskAssessments = parsedRiskAssessments

      const parsedOversight = parseHumanOversightMeasures(body.humanOversightMeasures)
      if (typeof parsedOversight === "string") return validationError(parsedOversight)
      humanOversightMeasures = parsedOversight
    } catch (error) {
      return validationError(error instanceof Error ? error.message : "Payload FRIA invalid.")
    }

    const input: CreateFriaInput = {
      title,
      linkedAISystemId,
      linkedDpiaRecordId:
        typeof body.linkedDpiaRecordId === "string" ? body.linkedDpiaRecordId : undefined,
      deployerType: body.deployerType,
      processDescription,
      periodOfUseStartISO:
        typeof body.periodOfUseStartISO === "string" ? body.periodOfUseStartISO : undefined,
      periodOfUseEndISO:
        typeof body.periodOfUseEndISO === "string" ? body.periodOfUseEndISO : undefined,
      frequencyOfUse: body.frequencyOfUse,
      expectedVolume: typeof body.expectedVolume === "number" ? body.expectedVolume : undefined,
      affectedGroups,
      rightsAtRisk,
      riskAssessments,
      humanOversightMeasures,
      complaintMechanism:
        typeof body.complaintMechanism === "string" ? body.complaintMechanism : "",
      governanceMeasures: Array.isArray(body.governanceMeasures)
        ? body.governanceMeasures.filter((m: unknown): m is string => typeof m === "string")
        : [],
      notifyAuthorityRequired: Boolean(body.notifyAuthorityRequired),
      notifyAuthorityName:
        typeof body.notifyAuthorityName === "string" ? body.notifyAuthorityName : undefined,
      notes: typeof body.notes === "string" ? body.notes : undefined,
    }

    const record = await createFria(
      ctx.orgId,
      input,
      actorFromContext(ctx),
      ctx.orgName ?? "Organizația",
    )

    const { summary } = await readFriaRecords(ctx.orgId)
    return NextResponse.json({ record, summary }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Eroare necunoscută"
    return NextResponse.json(
      { error: `Nu am putut crea FRIA: ${message}` },
      { status: 500 },
    )
  }
}
