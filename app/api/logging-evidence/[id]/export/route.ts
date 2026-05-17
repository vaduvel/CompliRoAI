/**
 * Sprint 018 — Logging Config markdown / PDF export.
 *
 * GET /api/logging-evidence/:id/export             → text/markdown
 * GET /api/logging-evidence/:id/export?format=pdf  → application/pdf (cu branding white-label)
 */
import { NextResponse } from "next/server"

import { getOrgContext } from "@/lib/server/org-context"
import {
  buildLoggingMarkdown,
  getLoggingConfigById,
} from "@/lib/server/logging-evidence-store"
import { readState } from "@/lib/server/store"

export const runtime = "nodejs"

function slug(value: string) {
  return (
    value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "logging"
  )
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await getOrgContext()
    const { id } = await params
    const record = await getLoggingConfigById(ctx.orgId, id)
    if (!record) {
      return NextResponse.json(
        { error: "Configurare logging inexistentă." },
        { status: 404 },
      )
    }

    const state = await readState()
    const systemName = state.aiSystems?.find((s) => s.id === record.linkedAISystemId)?.name

    const markdown = buildLoggingMarkdown(record, ctx.orgName ?? "", systemName)

    const fileStem = `logging-${slug(ctx.orgName ?? "org")}-${slug(record.title)}-${new Date()
      .toISOString()
      .slice(0, 10)}`

    const url = new URL(request.url)
    const format = url.searchParams.get("format")
    if (format === "pdf") {
      const { generatePdfFromMarkdown } = await import("@/lib/server/pdf-generator")
      const { getEffectiveBranding } = await import("@/lib/server/white-label")
      const branding = await getEffectiveBranding(ctx.orgId).catch(() => null)
      const pdf = await generatePdfFromMarkdown(markdown, {
        orgName: ctx.orgName ?? "",
        title: `Logging Config — ${record.title}`,
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
  } catch {
    return NextResponse.json(
      { error: "Nu am putut exporta configurarea de logging." },
      { status: 500 },
    )
  }
}
