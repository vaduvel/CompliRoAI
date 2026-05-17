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

import { FRIA_SCHEMA_V1 } from "@/lib/compliance/fria-schema"
import { getOrgContext } from "@/lib/server/org-context"
import {
  createFria,
  readFriaRecords,
  type CreateFriaInput,
} from "@/lib/server/fria-store"
import type { ComplianceEventActorInput } from "@/lib/compliance/events"
import type { FriaDeployerType, FriaFrequencyOfUse } from "@/lib/compliance/types"

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
      affectedGroups: Array.isArray(body.affectedGroups) ? body.affectedGroups : [],
      rightsAtRisk: Array.isArray(body.rightsAtRisk) ? body.rightsAtRisk : [],
      riskAssessments: Array.isArray(body.riskAssessments) ? body.riskAssessments : [],
      humanOversightMeasures: Array.isArray(body.humanOversightMeasures)
        ? body.humanOversightMeasures
        : [],
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
