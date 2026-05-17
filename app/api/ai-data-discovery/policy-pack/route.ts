/**
 * Sprint 009 — AI Policy Pack download.
 *
 * GET /api/ai-data-discovery/policy-pack
 *    -> { pack: AIPolicyPack } cu toate 5 template-uri RO parametrizate
 *       cu orgName + dpoEmail (din getOrgContext).
 *
 * GET /api/ai-data-discovery/policy-pack?id=acceptable_use
 *    -> single template (markdown raw + headers content-disposition).
 */
import { NextResponse } from "next/server"

import { getOrgContext } from "@/lib/server/org-context"
import {
  buildAIPolicyPack,
  getAIPolicyTemplate,
  type AIPolicyPackTemplateId,
} from "@/lib/compliance/ai-policy-pack"

const VALID_IDS: AIPolicyPackTemplateId[] = [
  "acceptable_use",
  "vendor_onboarding",
  "incident_response",
  "audit_logging",
  "human_oversight",
]

function isTemplateId(value: string | null): value is AIPolicyPackTemplateId {
  return value !== null && VALID_IDS.includes(value as AIPolicyPackTemplateId)
}

export async function GET(request: Request) {
  try {
    const ctx = await getOrgContext()
    const orgName = ctx.orgName ?? "Organizația"
    const dpoEmail = ctx.email

    const url = new URL(request.url)
    const idParam = url.searchParams.get("id")

    if (idParam) {
      if (!isTemplateId(idParam)) {
        return NextResponse.json({ error: "Template id invalid." }, { status: 400 })
      }
      const template = getAIPolicyTemplate(idParam, { orgName, dpoEmail })
      if (!template) {
        return NextResponse.json({ error: "Template inexistent." }, { status: 404 })
      }
      return new NextResponse(template.markdown, {
        status: 200,
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          "Content-Disposition": `attachment; filename="${template.fileName}"`,
        },
      })
    }

    const pack = buildAIPolicyPack({ orgName, dpoEmail })
    return NextResponse.json({ pack })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Nu am putut genera Policy Pack." },
      { status: 500 },
    )
  }
}
