/**
 * Sprint 008B — Per-finding share magic link (read-only view).
 *
 * POST /api/findings/[id]/share
 *   body: { expiresInDays?: number, recipientEmail?: string }
 *   -> { shareUrl, expiresAtISO, id }
 *
 * Refolosim `share-token-store` cu targetType="report" + targetId = findingId.
 * metadata.kind="finding" permite share handler-ului (Sprint 011+) sa stie ce
 * sa redea. Pana atunci, link-ul e cryptographic-valid si poate fi listat in
 * /dashboard/magic-links.
 */
import { NextResponse } from "next/server"

import { getOrgContext } from "@/lib/server/org-context"
import { getFindingById } from "@/lib/server/findings-store"
import {
  buildShareUrl,
  createShareToken,
} from "@/lib/server/share-token-store"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await getOrgContext()
    const { id } = await params
    const body = await request.json().catch(() => ({}))

    const finding = await getFindingById(ctx.orgId, id)
    if (!finding) {
      return NextResponse.json(
        { error: "Risc-ul nu a fost gasit." },
        { status: 404 },
      )
    }

    const expiresInDays =
      typeof body.expiresInDays === "number" && Number.isFinite(body.expiresInDays)
        ? body.expiresInDays
        : 7
    const recipientEmail =
      typeof body.recipientEmail === "string" && body.recipientEmail.trim()
        ? body.recipientEmail.trim()
        : undefined

    const record = await createShareToken({
      orgId: ctx.orgId,
      createdByUserId: ctx.userId,
      createdByEmail: ctx.email,
      targetType: "report",
      targetId: finding.id,
      targetLabel: `Finding: ${finding.title}`,
      recipientEmail,
      expiresInDays,
      metadata: {
        kind: "finding",
        findingId: finding.id,
        category: finding.category,
        severity: finding.severity,
      },
    })

    if (!record.token) {
      return NextResponse.json(
        { error: "Nu am putut genera token-ul." },
        { status: 500 },
      )
    }

    const origin = new URL(request.url).origin
    const shareUrl = buildShareUrl(origin, record.token)

    return NextResponse.json({
      id: record.id,
      shareUrl,
      expiresAtISO: record.expiresAtISO,
    })
  } catch {
    return NextResponse.json(
      { error: "Nu am putut genera link-ul de share." },
      { status: 500 },
    )
  }
}
