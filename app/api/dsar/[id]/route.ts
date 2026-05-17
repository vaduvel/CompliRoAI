/**
 * Sprint 007 — DSAR per-request: PATCH update / DELETE
 * Acceptă și câmpul `action` pentru workflow shortcuts (verify_identity, send_response etc.).
 */
import { NextResponse } from "next/server"

import {
  isValidDsarStatus,
  resolveDsarLifecycleAction,
  type DsarLifecycleAction,
} from "@/lib/compliance/dsar-lifecycle"
import { getOrgContext } from "@/lib/server/org-context"
import { updateDsar, deleteDsar } from "@/lib/server/dsar-store"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getOrgContext()
    const { id } = await params
    const body = await request.json()

    // Resolve action shortcut to field updates
    let updates: Record<string, unknown> = { ...body }
    if (body.action) {
      const resolved = resolveDsarLifecycleAction(body.action as DsarLifecycleAction)
      if (!resolved) {
        return NextResponse.json(
          { error: `Acțiune necunoscută: ${body.action}.` },
          { status: 400 }
        )
      }
      const rest = Object.fromEntries(
        Object.entries(updates).filter(([key]) => key !== "action")
      )
      updates = { ...resolved, ...rest }
    }

    if (updates.status && !isValidDsarStatus(updates.status as string)) {
      return NextResponse.json({ error: "Status invalid." }, { status: 400 })
    }

    const updated = await updateDsar(ctx.orgId, id, updates)
    if (!updated) {
      return NextResponse.json(
        { error: "Cererea DSAR nu a fost găsită." },
        { status: 404 }
      )
    }

    return NextResponse.json({ request: updated })
  } catch {
    return NextResponse.json(
      { error: "Nu am putut actualiza cererea DSAR." },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getOrgContext()
    const { id } = await params
    const deleted = await deleteDsar(ctx.orgId, id)
    if (!deleted) {
      return NextResponse.json(
        { error: "Cererea DSAR nu a fost găsită." },
        { status: 404 }
      )
    }
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json(
      { error: "Nu am putut șterge cererea DSAR." },
      { status: 500 }
    )
  }
}
