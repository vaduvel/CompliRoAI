/**
 * Sprint 008D — Breach markdown export.
 *
 * GET /api/breach/:id/export
 *   - returneaza dosarul markdown (Art. 33 + Art. 34 narative + audit info)
 *   - Content-Type: text/markdown
 *   - filename: breach-{org-slug}-{title-slug}-{date}.md
 */
import { NextResponse } from "next/server"

import { getOrgContext } from "@/lib/server/org-context"
import { buildBreachMarkdown, getBreachById } from "@/lib/server/breach-store"
import {
  appendComplianceEvents,
  createComplianceEvent,
} from "@/lib/compliance/events"
import { mutateFreshStateForOrg } from "@/lib/server/store"

function safeFileSegment(value: string): string {
  return (
    value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "breach"
  )
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await getOrgContext()
    const { id } = await params
    const record = await getBreachById(ctx.orgId, id)
    if (!record) {
      return NextResponse.json({ error: "Breach inexistent." }, { status: 404 })
    }

    const generatedAtISO = new Date().toISOString()
    const markdown = buildBreachMarkdown(record, ctx.orgName)
    const fileStem = `breach-${safeFileSegment(ctx.orgName || "compliroai")}-${safeFileSegment(record.title)}-${generatedAtISO.slice(0, 10)}`

    // Audit trail: breach.exported event
    await mutateFreshStateForOrg(ctx.orgId, (state) => ({
      ...state,
      events: appendComplianceEvents(state, [
        createComplianceEvent(
          {
            type: "breach.exported",
            entityType: "system",
            entityId: record.id,
            message: `Dosar breach exportat: "${record.title}"`,
            createdAtISO: generatedAtISO,
            metadata: {
              status: record.status,
              severity: record.severity,
              anspdcpNotified:
                record.anspdcpNotification?.status === "submitted" ||
                record.anspdcpNotification?.status === "acknowledged",
            },
          },
          {
            id: ctx.userId,
            label: ctx.email,
            role: "compliance",
            source: "session",
          },
        ),
      ]),
    }))

    // Sprint 014 — ?format=pdf returns PDF with white-label branding.
    const url = new URL(request.url)
    const format = url.searchParams.get("format")
    if (format === "pdf") {
      const { generatePdfFromMarkdown } = await import("@/lib/server/pdf-generator")
      const { getEffectiveBranding } = await import("@/lib/server/white-label")
      const branding = await getEffectiveBranding(ctx.orgId).catch(() => null)
      const pdf = await generatePdfFromMarkdown(markdown, {
        orgName: ctx.orgName ?? "",
        title: `Breach — ${record.title}`,
        branding,
        signerName: branding?.signerName ?? null,
      })
      return new NextResponse(new Uint8Array(pdf), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${fileStem}.pdf"`,
          "Cache-Control": "no-store",
        },
      })
    }

    return new NextResponse(markdown, {
      status: 200,
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileStem}.md"`,
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Exportul a esuat." },
      { status: 500 },
    )
  }
}
