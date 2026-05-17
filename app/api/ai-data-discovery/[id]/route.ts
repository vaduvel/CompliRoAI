/**
 * Sprint 009 — AI Data Map single record: GET / PATCH / DELETE.
 *
 * GET    /api/ai-data-discovery/:id  -> { record }
 * PATCH  /api/ai-data-discovery/:id  -> merge patch + re-evaluate risk
 * DELETE /api/ai-data-discovery/:id  -> hard delete
 */
import { NextResponse } from "next/server"

import { getOrgContext } from "@/lib/server/org-context"
import {
  deleteAIDataMapRecord,
  getAIDataMapRecord,
  isAIDataMapStatus,
  isAIDeploymentMode,
  isAITrainingDataUsage,
  isAIUseCaseCategory,
  isAIVendorRegion,
  updateAIDataMapRecord,
  type UpdateAIDataMapPatch,
} from "@/lib/server/ai-data-discovery-store"
import type { ComplianceEventActorInput } from "@/lib/compliance/events"

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

function normalizeStringArray(value: unknown): string[] | undefined {
  if (value === undefined) return undefined
  if (!Array.isArray(value)) return []
  return value
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter((v) => v.length > 0)
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await getOrgContext()
    const { id } = await params
    const record = await getAIDataMapRecord(ctx.orgId, id)
    if (!record) {
      return NextResponse.json({ error: "Record AI inexistent." }, { status: 404 })
    }
    return NextResponse.json({ record })
  } catch {
    return NextResponse.json(
      { error: "Nu am putut citi record-ul." },
      { status: 500 },
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await getOrgContext()
    const { id } = await params
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>

    const patch: UpdateAIDataMapPatch = {
      toolName: typeof body.toolName === "string" ? body.toolName : undefined,
      vendor: typeof body.vendor === "string" ? body.vendor : undefined,
      deploymentMode: isAIDeploymentMode(body.deploymentMode) ? body.deploymentMode : undefined,
      useCaseCategory: isAIUseCaseCategory(body.useCaseCategory) ? body.useCaseCategory : undefined,
      useCaseDescription:
        typeof body.useCaseDescription === "string" ? body.useCaseDescription : undefined,
      inputDataCategories: normalizeStringArray(body.inputDataCategories),
      outputDataCategories: normalizeStringArray(body.outputDataCategories),
      processesPersonalData:
        typeof body.processesPersonalData === "boolean"
          ? body.processesPersonalData
          : undefined,
      processesSpecialCategories:
        typeof body.processesSpecialCategories === "boolean"
          ? body.processesSpecialCategories
          : undefined,
      childrenData:
        typeof body.childrenData === "boolean" ? body.childrenData : undefined,
      vendorRegion: isAIVendorRegion(body.vendorRegion) ? body.vendorRegion : undefined,
      trainingDataUsage: isAITrainingDataUsage(body.trainingDataUsage)
        ? body.trainingDataUsage
        : undefined,
      dpaSigned: typeof body.dpaSigned === "boolean" ? body.dpaSigned : undefined,
      dpaUrl: typeof body.dpaUrl === "string" ? body.dpaUrl : undefined,
      subprocessorsDocumented:
        typeof body.subprocessorsDocumented === "boolean"
          ? body.subprocessorsDocumented
          : undefined,
      linkedAISystemId:
        typeof body.linkedAISystemId === "string" ? body.linkedAISystemId : undefined,
      notes: typeof body.notes === "string" ? body.notes : undefined,
      status: isAIDataMapStatus(body.status) ? body.status : undefined,
    }

    const updated = await updateAIDataMapRecord(ctx.orgId, id, patch, actorFromContext(ctx))
    if (!updated) {
      return NextResponse.json({ error: "Record AI inexistent." }, { status: 404 })
    }
    return NextResponse.json({ record: updated })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Nu am putut actualiza record-ul." },
      { status: 500 },
    )
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await getOrgContext()
    const { id } = await params
    const ok = await deleteAIDataMapRecord(ctx.orgId, id, actorFromContext(ctx))
    if (!ok) {
      return NextResponse.json({ error: "Record AI inexistent." }, { status: 404 })
    }
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json(
      { error: "Nu am putut sterge record-ul." },
      { status: 500 },
    )
  }
}
