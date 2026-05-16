// Cabinet review endpoint — list all magic links emitted from this org.

import { NextResponse } from "next/server"

import { getOrgContext } from "@/lib/server/org-context"
import { listOrgShareTokens } from "@/lib/server/share-token-store"

export async function GET() {
  try {
    const ctx = await getOrgContext()
    const records = await listOrgShareTokens(ctx.orgId, {
      limit: 200,
      includeExpired: true,
    })
    return NextResponse.json({
      records: records.map((r) => ({
        id: r.id,
        targetType: r.targetType,
        targetId: r.targetId,
        targetLabel: r.targetLabel,
        recipientEmail: r.recipientEmail,
        status: r.status,
        usedAtISO: r.usedAtISO,
        revokedAtISO: r.revokedAtISO,
        createdAtISO: r.createdAtISO,
        expiresAtISO: r.expiresAtISO,
        metadata: r.metadata,
      })),
      total: records.length,
    })
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Eroare la listarea linkurilor."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
