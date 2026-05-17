/**
 * Sprint 009 — AI Exposure Report endpoint.
 *
 * GET  /api/ai-data-discovery/report          -> { reports: AIExposureReport[] }
 *                                                (list cached reports)
 * POST /api/ai-data-discovery/report          -> genereaza un raport nou,
 *                                                persistat in state, +
 *                                                returneaza markdown.
 */
import { NextResponse } from "next/server"

import { getOrgContext } from "@/lib/server/org-context"
import {
  generateAIExposureReport,
  readAIExposureReports,
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

export async function GET() {
  try {
    const ctx = await getOrgContext()
    const reports = await readAIExposureReports(ctx.orgId)
    return NextResponse.json({ reports })
  } catch {
    return NextResponse.json(
      { error: "Nu am putut citi rapoartele AI Exposure." },
      { status: 500 },
    )
  }
}

export async function POST() {
  try {
    const ctx = await getOrgContext()
    const report = await generateAIExposureReport(ctx.orgId, actorFromContext(ctx))
    return NextResponse.json({ report }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Nu am putut genera raportul." },
      { status: 500 },
    )
  }
}
