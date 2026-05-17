/**
 * Sprint 010 — Vendor Review Brief generator.
 *
 * GET /api/vendor-review/[id]/brief
 *   Query string: ?format=md (default) | ?format=download
 *
 * Returneaza brief markdown (audit-ready) pentru vendor; daca format=download,
 * returneaza Content-Disposition attachment cu nume vendor-brief-{id}.md.
 */
import { NextResponse } from "next/server"

import { getOrgContext } from "@/lib/server/org-context"
import { buildBrief } from "@/lib/server/vendor-review-store"

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params
    const ctx = await getOrgContext()
    const url = new URL(request.url)
    const format = url.searchParams.get("format") ?? "md"

    const markdown = await buildBrief(ctx.orgId, id, ctx.orgName)
    if (!markdown) {
      return NextResponse.json({ error: "Vendorul nu a fost gasit." }, { status: 404 })
    }

    if (format === "download") {
      return new NextResponse(markdown, {
        status: 200,
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          "Content-Disposition": `attachment; filename="vendor-brief-${id}.md"`,
        },
      })
    }

    return NextResponse.json({ id, markdown })
  } catch {
    return NextResponse.json(
      { error: "Nu am putut genera brief-ul." },
      { status: 500 },
    )
  }
}
