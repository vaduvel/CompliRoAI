// GET /api/exports/audit-pack
//   → Auth required (middleware ensures this).
//   → For solo: builds the pack for the current org.
//   → For cabinet: optional ?clientOrgId=<id> to build for a portfolio client.
//                  Authorization: cabinet must have an active partner_manager
//                  membership on the target client org.
//   → Returns application/zip with Content-Disposition: attachment.
//
// POST /api/exports/audit-pack
//   → Same behavior as GET but accepts a JSON body { clientOrgId, reSign }.
//     Used by the UI when the cabinet wants to re-sign a pack with the current
//     white-label cabinet signature.

import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

import { buildAuditPack } from "@/lib/server/audit-pack-builder"
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

async function generate(request: NextRequest, clientOrgId: string | null, reSign: boolean) {
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
    const result = await buildAuditPack(ctx.orgId, {
      clientOrgId: clientOrgId ?? undefined,
      issuedByUserId: ctx.userId,
      issuedByUserEmail: ctx.email,
      workspaceMode: ctx.workspaceMode,
      currentOrgId: ctx.orgId,
      reSign,
    })

    const body = new Uint8Array(result.zipBuffer)
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${result.fileName}"`,
        "Content-Length": String(result.sizeBytes),
        "X-Audit-Pack-Hash-Root": result.hashChainRoot,
        "X-Audit-Pack-File-Count": String(result.manifest.contents.length + 1),
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Eroare la generarea audit pack-ului."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const clientOrgId = url.searchParams.get("clientOrgId")
  return generate(request, clientOrgId, false)
}

export async function POST(request: NextRequest) {
  let body: { clientOrgId?: string; reSign?: boolean } = {}
  try {
    body = await request.json()
  } catch {
    // empty body is fine
  }
  return generate(request, body.clientOrgId ?? null, body.reSign === true)
}
