/**
 * Sprint 009 — PII Detection single resource: GET / DELETE.
 *
 * GET    /api/pii-discovery/:id  -> { detection } | 404
 * DELETE /api/pii-discovery/:id  -> hard delete + event
 */
import { NextResponse } from "next/server"

import { getOrgContext } from "@/lib/server/org-context"
import {
  deletePIIDetection,
  getPIIDetection,
} from "@/lib/server/pii-discovery-store"
import type { ComplianceEventActorInput } from "@/lib/compliance/events"

function actorFromContext(ctx: {
  userId: string
  email: string
}): ComplianceEventActorInput {
  return {
    id: ctx.userId,
    label: ctx.email,
    role: "compliance",
    source: "session",
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await getOrgContext()
    const { id } = await params
    const detection = await getPIIDetection(ctx.orgId, id)
    if (!detection) {
      return NextResponse.json({ error: "Scan PII inexistent." }, { status: 404 })
    }
    return NextResponse.json({ detection })
  } catch {
    return NextResponse.json(
      { error: "Nu am putut citi scan-ul PII." },
      { status: 500 },
    )
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await getOrgContext()
    const { id } = await params
    const ok = await deletePIIDetection(ctx.orgId, id, actorFromContext(ctx))
    if (!ok) {
      return NextResponse.json({ error: "Scan PII inexistent." }, { status: 404 })
    }
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json(
      { error: "Nu am putut sterge scan-ul PII." },
      { status: 500 },
    )
  }
}
