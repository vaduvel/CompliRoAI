/**
 * Sprint 021 — QMS export full document.
 *
 * GET /api/qms/export?format=md|json
 *   - md (default) → full QMS markdown (13 sectiuni + lessons + attestations)
 *   - json         → workspace + schema + summary serializate (audit-clean)
 *
 * Filename: compliroai-qms-{orgSlug}-{YYYY-MM-DD}.{ext}
 */
import { NextResponse } from "next/server"

import { QMS_SCHEMA_V1 } from "@/lib/compliance/qms-schema"
import { getOrgContext } from "@/lib/server/org-context"
import {
  buildQmsMarkdownForState,
  readQmsWorkspace,
} from "@/lib/server/qms-store"

type ExportFormat = "md" | "json"

function parseFormat(value: string | null): ExportFormat {
  if (value === "json") return "json"
  return "md"
}

function orgSlug(orgName: string): string {
  return orgName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const format = parseFormat(url.searchParams.get("format"))
    const ctx = await getOrgContext()
    const orgName = ctx.orgName ?? "Organizația"

    if (format === "json") {
      const { workspace, summary } = await readQmsWorkspace(ctx.orgId)
      const date = new Date().toISOString().slice(0, 10)
      const filename = `compliroai-qms-${orgSlug(orgName)}-${date}.json`
      return new NextResponse(
        JSON.stringify(
          { workspace, summary, schema: QMS_SCHEMA_V1, exportedAtISO: new Date().toISOString() },
          null,
          2,
        ),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Content-Disposition": `attachment; filename="${filename}"`,
          },
        },
      )
    }
    // md
    const md = await buildQmsMarkdownForState(orgName)
    const date = new Date().toISOString().slice(0, 10)
    const filename = `compliroai-qms-${orgSlug(orgName)}-${date}.md`
    return new NextResponse(md, {
      status: 200,
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Eroare necunoscută"
    return NextResponse.json(
      { error: `Nu am putut exporta QMS: ${message}` },
      { status: 500 },
    )
  }
}
