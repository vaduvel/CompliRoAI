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

export async function GET(request: Request) {
  try {
    const ctx = await getOrgContext()
    const reports = await readAIExposureReports(ctx.orgId)

    // Sprint 014 — ?format=pdf returns latest report as PDF.
    const url = new URL(request.url)
    const format = url.searchParams.get("format")
    if (format === "pdf") {
      const latest = reports[0]
      if (!latest) {
        return NextResponse.json(
          { error: "Niciun raport disponibil. Generați unul cu POST /api/ai-data-discovery/report mai întâi." },
          { status: 404 },
        )
      }
      const markdown =
        (latest as { markdownReport?: string }).markdownReport ??
        `# AI Exposure Report\n\nRaport ${latest.id}\n\nGenerat: ${latest.generatedAtISO}`
      const { generatePdfFromMarkdown } = await import("@/lib/server/pdf-generator")
      const { getEffectiveBranding } = await import("@/lib/server/white-label")
      const branding = await getEffectiveBranding(ctx.orgId).catch(() => null)
      const pdf = await generatePdfFromMarkdown(markdown, {
        orgName: ctx.orgName ?? "",
        title: `AI Exposure Report — ${ctx.orgName ?? ""}`,
        branding,
        generatedAtISO: latest.generatedAtISO,
        signerName: branding?.signerName ?? null,
      })
      return new NextResponse(new Uint8Array(pdf), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="ai-exposure-report-${latest.generatedAtISO.slice(0, 10)}.pdf"`,
          "Cache-Control": "no-store",
        },
      })
    }

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
