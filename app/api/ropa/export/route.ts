/**
 * Sprint 008C — RoPA export.
 *
 * GET /api/ropa/export           -> JSON machine-readable (Audit Pack)
 * GET /api/ropa/export?format=md -> Markdown human-readable
 */
import { NextResponse } from "next/server"

import { getOrgContext } from "@/lib/server/org-context"
import {
  buildMachineReadableForOrg,
  buildMarkdownForOrg,
} from "@/lib/server/ropa-store"

export const runtime = "nodejs"

function slug(value: string) {
  return (
    value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "ropa"
  )
}

export async function GET(request: Request) {
  try {
    const ctx = await getOrgContext()
    const format = new URL(request.url).searchParams.get("format")
    const date = new Date().toISOString().slice(0, 10)
    const fileStem = `ropa-${slug(ctx.orgName ?? "org")}-${date}`

    if (format === "md") {
      const md = await buildMarkdownForOrg(ctx.orgId, ctx.orgName)
      return new NextResponse(md, {
        status: 200,
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          "Content-Disposition": `attachment; filename="${fileStem}.md"`,
          "Cache-Control": "no-store",
        },
      })
    }

    // Sprint 014 — PDF format
    if (format === "pdf") {
      const md = await buildMarkdownForOrg(ctx.orgId, ctx.orgName)
      const { generatePdfFromMarkdown } = await import("@/lib/server/pdf-generator")
      const { getEffectiveBranding } = await import("@/lib/server/white-label")
      const branding = await getEffectiveBranding(ctx.orgId).catch(() => null)
      const pdf = await generatePdfFromMarkdown(md, {
        orgName: ctx.orgName ?? "",
        title: `RoPA — ${ctx.orgName ?? ""}`,
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

    const json = await buildMachineReadableForOrg(ctx.orgId, ctx.orgName)
    return new NextResponse(JSON.stringify(json, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileStem}.json"`,
        "Cache-Control": "no-store",
      },
    })
  } catch {
    return NextResponse.json(
      { error: "Nu am putut exporta RoPA." },
      { status: 500 },
    )
  }
}
