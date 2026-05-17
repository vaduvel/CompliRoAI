/**
 * Sprint 016 — POST /api/fria/trigger-check
 *
 * Body: { systemId: string, deployerType?: FriaDeployerType }
 *
 * Returnează rezultatul evaluării triggerului FRIA pentru un sistem AI:
 *   - friaRequired: boolean
 *   - reason: string (în română)
 *   - deployerType: FriaDeployerType inferat
 *   - urgency: "before_use" | "annual_review" | "none"
 *   - legalReferences: string[]
 *
 * Folosit de UI:
 *   - AI Inventory: la afișarea unui sistem AI, apelează trigger-check pentru
 *     a decide dacă să afișeze banner-ul „Necesită FRIA"
 *   - /dashboard/fria: la deschiderea wizard-ului pentru un sistem
 */
import { NextResponse } from "next/server"

import {
  evaluateFriaRequirement,
  type EvaluateFriaRequirementInput,
} from "@/lib/compliance/fria-trigger"
import { getOrgContext } from "@/lib/server/org-context"
import { readState } from "@/lib/server/store"

const DEPLOYER_TYPES = [
  "public_body",
  "private_public_service",
  "credit_assessment",
  "life_health_insurance",
  "other_high_risk_deployer",
  "not_applicable",
] as const

type DeployerType = (typeof DEPLOYER_TYPES)[number]

function isDeployerType(value: unknown): value is DeployerType {
  return typeof value === "string" && (DEPLOYER_TYPES as readonly string[]).includes(value)
}

export async function POST(request: Request) {
  try {
    const ctx = await getOrgContext()
    const body = await request.json().catch(() => ({}))
    const systemId = typeof body.systemId === "string" ? body.systemId.trim() : ""
    if (!systemId) {
      return NextResponse.json(
        { error: "systemId obligatoriu." },
        { status: 400 },
      )
    }

    const state = await readState()
    const system = state.aiSystems?.find((s) => s.id === systemId)
    if (!system) {
      return NextResponse.json(
        { error: "Sistemul AI nu există în inventar." },
        { status: 404 },
      )
    }

    // Determine if there's an existing FRIA for this system to compute urgency
    const existingFria = state.friaRecords?.find((r) => r.linkedAISystemId === systemId)
    const lastFriaDateISO = existingFria?.createdAtISO

    const input: EvaluateFriaRequirementInput = {
      system,
      orgRegulatoryProfile: state.orgRegulatoryProfile,
      lastFriaDateISO,
    }
    if (isDeployerType(body.deployerType)) {
      input.deployerTypeOverride = body.deployerType
    }

    const result = evaluateFriaRequirement(input)
    return NextResponse.json({
      trigger: result,
      hasExistingFria: Boolean(existingFria),
      existingFriaId: existingFria?.id,
      orgId: ctx.orgId,
    })
  } catch {
    return NextResponse.json(
      { error: "Nu am putut evalua trigger-ul FRIA." },
      { status: 500 },
    )
  }
}
