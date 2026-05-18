/**
 * Sprint 024 — AI Ads Pack export.
 *
 * GET /api/ai-ads/export?format=md
 *   Returns the full org-wide AI Ads Compliance Pack as markdown.
 */
import { NextResponse } from "next/server"

import { buildOrgAIAdsMarkdown } from "@/lib/server/ai-ads-store"
import { getOrgContext } from "@/lib/server/org-context"

export async function GET(request: Request) {
  try {
    const ctx = await getOrgContext()
    const url = new URL(request.url)
    const format = url.searchParams.get("format") ?? "md"

    if (format !== "md") {
      return NextResponse.json(
        { error: "Format suportat: 'md'." },
        { status: 400 },
      )
    }

    const markdown = await buildOrgAIAdsMarkdown(ctx.orgId, ctx.orgName ?? "Organizație")
    const filename = `ai-ads-pack-${new Date().toISOString().slice(0, 10)}.md`

    return new NextResponse(markdown, {
      status: 200,
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Eroare necunoscută"
    return NextResponse.json(
      { error: `Nu am putut genera pack-ul: ${message}` },
      { status: 500 },
    )
  }
}
