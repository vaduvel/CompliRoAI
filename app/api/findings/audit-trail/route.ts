/**
 * Sprint 008B — Audit trail (events ledger) cu hash-chain verification.
 *
 * GET /api/findings/audit-trail
 *   -> { events: ComplianceEvent[], chainVerified: boolean, brokenAt?, stats }
 *
 * Folosit de pagina `/dashboard/dosar` tab "Audit trail". Returneaza events
 * newest-first asa cum sunt stocate in state, plus rezultatul `verifyEventChain`
 * pentru tamper-evidence badge.
 */
import { NextResponse } from "next/server"

import { verifyEventChain } from "@/lib/compliance/events"
import { getOrgContext } from "@/lib/server/org-context"
import { readState } from "@/lib/server/store"

export async function GET() {
  try {
    await getOrgContext()
    const state = await readState()
    const events = state.events ?? []
    const verification = verifyEventChain(events)

    const stats = {
      total: events.length,
      verified: verification.ok
        ? verification.verifiedCount
        : verification.verifiedCount,
      skippedLegacy: verification.ok ? verification.skippedLegacyCount : 0,
    }

    if (verification.ok) {
      return NextResponse.json({
        events,
        chainVerified: true,
        stats,
      })
    }
    return NextResponse.json({
      events,
      chainVerified: false,
      brokenAt: verification.brokenAt,
      stats,
    })
  } catch {
    return NextResponse.json(
      { error: "Nu am putut incarca audit trail-ul." },
      { status: 500 },
    )
  }
}
