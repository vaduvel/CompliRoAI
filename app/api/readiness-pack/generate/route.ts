// POST /api/readiness-pack/generate
//   Body: { clientOrgId?: string, format?: "zip" | "markdown" | "html" }
//   → Solo: pack pentru propria org.
//   → Cabinet: pack pentru clientOrgId (necesită membership partner_manager activ).
//   → Răspuns: descărcare directă (Content-Disposition: attachment).
//
// GET /api/readiness-pack/generate?clientOrgId=…&format=…
//   → Variantă convenabilă pentru click-to-download din UI.

import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

import { buildReadinessPack, type ReadinessPackFormat } from "@/lib/server/readiness-pack-builder"
import { getOrgContext } from "@/lib/server/org-context"
import { listUserMemberships } from "@/lib/server/tenancy"

async function authorizeClientOrg(
  cabinetUserId: string,
  clientOrgId: string
): Promise<boolean> {
  const memberships = await listUserMemberships(cabinetUserId)
  return memberships.some(
    (m) => m.orgId === clientOrgId && m.status === "active" && m.role === "partner_manager"
  )
}

function parseFormat(value: string | null | undefined): ReadinessPackFormat {
  if (value === "markdown" || value === "html" || value === "zip") return value
  return "zip"
}

async function generate(
  _request: NextRequest,
  clientOrgId: string | null,
  format: ReadinessPackFormat
) {
  let ctx
  try {
    ctx = await getOrgContext()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (clientOrgId) {
    if (ctx.workspaceMode !== "cabinet") {
      return NextResponse.json(
        { error: "Doar utilizatorii în mod cabinet pot genera pachete pentru clienți." },
        { status: 403 }
      )
    }
    const ok = await authorizeClientOrg(ctx.userId, clientOrgId)
    if (!ok) {
      return NextResponse.json(
        { error: "Clientul nu este în portofoliul tău sau nu ai drepturi." },
        { status: 403 }
      )
    }
  }

  try {
    const result = await buildReadinessPack(ctx.orgId, {
      clientOrgId: clientOrgId ?? undefined,
      issuedByUserId: ctx.userId,
      issuedByUserEmail: ctx.email,
      workspaceMode: ctx.workspaceMode,
      currentOrgId: ctx.orgId,
      format,
    })

    const body = new Uint8Array(result.buffer)
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": result.mimeType,
        "Content-Disposition": `attachment; filename="${result.fileName}"`,
        "Content-Length": String(result.buffer.length),
        "X-Readiness-Pack-Id": result.pack.id,
        "X-Readiness-Pack-Hash": result.pack.hashRoot,
        "X-Readiness-Pack-Format": result.pack.format,
        "X-Readiness-Pack-Components": String(result.pack.contentsCount),
      },
    })
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Eroare la generarea readiness pack-ului."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  let body: { clientOrgId?: string; format?: string } = {}
  try {
    body = await request.json()
  } catch {
    // empty body is fine
  }
  return generate(request, body.clientOrgId ?? null, parseFormat(body.format))
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const clientOrgId = url.searchParams.get("clientOrgId")
  const format = parseFormat(url.searchParams.get("format"))
  return generate(request, clientOrgId, format)
}
