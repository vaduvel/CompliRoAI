// DELETE /api/portfolio/clients/[id] — removes a client from the cabinet's
// portfolio by deleting the cabinet's partner_manager membership on that org.
// The org and its compliance data persist (in case the cabinet re-adds later).

import { NextResponse } from "next/server"

import { getOrgContext } from "@/lib/server/org-context"
import { removeClientFromPortfolio } from "@/lib/server/tenancy"

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getOrgContext()
    if (ctx.workspaceMode !== "cabinet") {
      return NextResponse.json(
        { error: "Doar cabinetele pot elimina clienti din portofoliu." },
        { status: 403 }
      )
    }

    const { id } = await context.params
    const orgId = id.trim()
    if (!orgId) {
      return NextResponse.json({ error: "Id client invalid." }, { status: 400 })
    }
    if (orgId === ctx.orgId) {
      return NextResponse.json(
        { error: "Nu poti elimina propriul workspace din portofoliu." },
        { status: 400 }
      )
    }

    await removeClientFromPortfolio({ cabinetUserId: ctx.userId, orgId })
    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Eroare la eliminare."
    const status =
      message === "MEMBERSHIP_NOT_FOUND" || message === "NOT_A_PORTFOLIO_CLIENT" ? 404 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
