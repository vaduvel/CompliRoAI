import { NextResponse } from "next/server"
import { headers } from "next/headers"

import { buildAIActEvidencePack } from "@/lib/server/evidence-pack"

function slugify(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export async function GET() {
  try {
    const h = await headers()
    const orgId = h.get("x-aiact-org-id")
    const orgName = h.get("x-aiact-org-name") ?? "organization"

    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const pack = await buildAIActEvidencePack(orgId)
    const fileName = `ai-act-evidence-pack-${slugify(orgName)}-${pack.generatedAtISO.slice(0, 10)}.json`

    return new NextResponse(JSON.stringify(pack, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    })
  } catch {
    return NextResponse.json(
      { error: "Nu am putut genera AI Act Evidence Pack." },
      { status: 500 }
    )
  }
}
