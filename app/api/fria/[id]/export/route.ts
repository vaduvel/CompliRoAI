/**
 * Sprint 016 — FRIA markdown / PDF export.
 *
 * GET /api/fria/:id/export             → text/markdown
 * GET /api/fria/:id/export?format=pdf  → application/pdf (cu branding white-label)
 */
import { NextResponse } from "next/server"

import { getOrgContext } from "@/lib/server/org-context"
import { buildFriaMarkdown, getFriaRecordById } from "@/lib/server/fria-store"
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
      .slice(0, 80) || "fria"
  )
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await getOrgContext()
    const { id } = await params
    const record = await getFriaRecordById(ctx.orgId, id)
    if (!record) {
      return NextResponse.json({ error: "FRIA inexistentă." }, { status: 404 })
    }

    // Caută numele sistemului AI legat
    const state = await readState()
    const systemName = state.aiSystems?.find((s) => s.id === record.linkedAISystemId)?.name

    const markdown = buildFriaMarkdown(record, ctx.orgName ?? "", systemName)

    const fileStem = `fria-${slug(ctx.orgName ?? "org")}-${slug(record.title)}-${new Date()
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
        title: `FRIA — ${record.title}`,
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
      { error: "Nu am putut exporta FRIA." },
      { status: 500 },
    )
  }
}
