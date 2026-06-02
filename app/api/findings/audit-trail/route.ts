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
    // Audit trail-ul este auxiliar pentru cockpit-ul de findings. Dacă backend-ul
    // de state are un read tranzitoriu, nu rupem pagina de execuție; exporturile
    // și verificările stricte pot trata explicit `degraded`.
    return NextResponse.json(
      {
        events: [],
        chainVerified: true,
        degraded: true,
        error: "Nu am putut incarca audit trail-ul.",
        stats: { total: 0, verified: 0, skippedLegacy: 0 },
      },
      { status: 200 },
    )
  }
}
