/**
 * Sprint 009 — AI Data Map list + create.
 *
 * GET  /api/ai-data-discovery     -> { records, summary }
 * POST /api/ai-data-discovery     -> creeaza un AIDataMapRecord; emite findings;
 *                                    appendeaza events.
 */
import { NextResponse } from "next/server"

import { getOrgContext } from "@/lib/server/org-context"
import {
  createAIDataMapRecord,
  isAIDeploymentMode,
  isAITrainingDataUsage,
  isAIUseCaseCategory,
  isAIVendorRegion,
  readAIDataMapRecords,
} from "@/lib/server/ai-data-discovery-store"
import type { ComplianceEventActorInput } from "@/lib/compliance/events"
import type { AIDataDiscoveryIntake } from "@/lib/compliance/ai-data-discovery"

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

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter((v) => v.length > 0)
}

export async function GET() {
  try {
    const ctx = await getOrgContext()
    const { records, summary } = await readAIDataMapRecords(ctx.orgId)
    return NextResponse.json({ records, summary })
  } catch {
    return NextResponse.json(
      { error: "Nu am putut citi AI Data Map." },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getOrgContext()
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>

    const toolName = typeof body.toolName === "string" ? body.toolName.trim() : ""
    if (!toolName) {
      return NextResponse.json({ error: "toolName este obligatoriu." }, { status: 400 })
    }
    if (!isAIUseCaseCategory(body.useCaseCategory)) {
      return NextResponse.json(
        { error: "useCaseCategory invalid sau lipsa." },
        { status: 400 },
      )
    }
    if (!isAIDeploymentMode(body.deploymentMode)) {
      return NextResponse.json(
        { error: "deploymentMode invalid sau lipsa." },
        { status: 400 },
      )
    }
    if (!isAIVendorRegion(body.vendorRegion)) {
      return NextResponse.json(
        { error: "vendorRegion invalid sau lipsa." },
        { status: 400 },
      )
    }
    if (!isAITrainingDataUsage(body.trainingDataUsage)) {
      return NextResponse.json(
        { error: "trainingDataUsage invalid sau lipsa." },
        { status: 400 },
      )
    }

    const intake: AIDataDiscoveryIntake = {
      toolName,
      vendor: typeof body.vendor === "string" ? body.vendor.trim() : "",
      deploymentMode: body.deploymentMode,
      useCaseCategory: body.useCaseCategory,
      useCaseDescription:
        typeof body.useCaseDescription === "string" ? body.useCaseDescription : "",
      inputDataCategories: normalizeStringArray(body.inputDataCategories),
      outputDataCategories: normalizeStringArray(body.outputDataCategories),
      processesPersonalData: Boolean(body.processesPersonalData),
      processesSpecialCategories: Boolean(body.processesSpecialCategories),
      childrenData: Boolean(body.childrenData),
      vendorRegion: body.vendorRegion,
      trainingDataUsage: body.trainingDataUsage,
      dpaSigned: Boolean(body.dpaSigned),
      dpaUrl: typeof body.dpaUrl === "string" ? body.dpaUrl : undefined,
      subprocessorsDocumented: Boolean(body.subprocessorsDocumented),
      linkedAISystemId:
        typeof body.linkedAISystemId === "string" ? body.linkedAISystemId : undefined,
      notes: typeof body.notes === "string" ? body.notes : undefined,
    }

    const { record, linkedFindingIds } = await createAIDataMapRecord(
      ctx.orgId,
      intake,
      actorFromContext(ctx),
    )
    const { summary } = await readAIDataMapRecords(ctx.orgId)
    return NextResponse.json({ record, linkedFindingIds, summary }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Nu am putut crea record-ul AI." },
      { status: 500 },
    )
  }
}
