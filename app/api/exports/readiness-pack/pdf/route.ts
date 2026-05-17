// Sprint 014 — GET /api/exports/readiness-pack/pdf
//   → Returns the readiness pack as a single PDF (markdown components combined
//     and rendered cu branding cabinet aplicat). Cabinet poate folosi
//     ?clientOrgId=… pentru pack-uri per-client.

import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

import { buildReadinessPack } from "@/lib/server/readiness-pack-builder"
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

export async function GET(request: NextRequest) {
  let ctx
  try {
    ctx = await getOrgContext()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const url = new URL(request.url)
  const clientOrgId = url.searchParams.get("clientOrgId")

  if (clientOrgId) {
    if (ctx.workspaceMode !== "cabinet") {
      return NextResponse.json(
        { error: "Doar cabinetele pot genera pack-uri pentru clienți." },
        { status: 403 }
      )
    }
    const ok = await authorizeClientOrg(ctx.userId, clientOrgId)
    if (!ok) {
      return NextResponse.json(
        { error: "Clientul nu este în portofoliul tău." },
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
      format: "pdf",
    })

    const body = new Uint8Array(result.buffer)
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${result.fileName}"`,
        "Content-Length": String(result.buffer.length),
        "X-Readiness-Pack-Id": result.pack.id,
        "X-Readiness-Pack-Hash": result.pack.hashRoot,
        "Cache-Control": "no-store, no-cache, must-revalidate, private",
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Eroare la generarea PDF."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
