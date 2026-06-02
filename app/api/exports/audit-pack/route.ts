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
import { buildDashboardExecutionState } from "@/lib/compliance/dashboard-coherence"
import { getOrgContext } from "@/lib/server/org-context"
import { readFreshStateForOrg } from "@/lib/server/store"
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

async function generate(request: NextRequest, clientOrgId: string | null, reSign: boolean, finalExport: boolean) {
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
    const targetOrgId = clientOrgId ?? ctx.orgId
    const targetState = await readFreshStateForOrg(targetOrgId, clientOrgId ? "" : ctx.orgName)
    const executionState = buildDashboardExecutionState(targetState, {
      isClientExecution: Boolean(clientOrgId),
    })

    if (finalExport && executionState.snapshot.exportReadinessStatus !== "approved") {
      return NextResponse.json(
        {
          error: "Audit Pack final blocat: dosarul nu este aprobat pentru export final.",
          exportReadinessStatus: executionState.snapshot.exportReadinessStatus,
          exportBlockers: executionState.exportBlockers,
        },
        { status: 409 },
      )
    }

    const result = await buildAuditPack(ctx.orgId, {
      clientOrgId: clientOrgId ?? undefined,
      issuedByUserId: ctx.userId,
      issuedByUserEmail: ctx.email,
      workspaceMode: ctx.workspaceMode,
      currentOrgId: ctx.orgId,
      reSign,
      exportReadinessStatus: executionState.snapshot.exportReadinessStatus,
      exportBlockersCount: executionState.exportBlockers.length,
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
        "X-Audit-Pack-Readiness": executionState.snapshot.exportReadinessStatus,
        "X-Audit-Pack-Blockers": String(executionState.exportBlockers.length),
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
  const finalExport = url.searchParams.get("final") === "true"
  return generate(request, clientOrgId, false, finalExport)
}

export async function POST(request: NextRequest) {
  let body: { clientOrgId?: string; reSign?: boolean; final?: boolean } = {}
  try {
    body = await request.json()
  } catch {
    // empty body is fine
  }
  return generate(request, body.clientOrgId ?? null, body.reSign === true, body.final === true)
}
