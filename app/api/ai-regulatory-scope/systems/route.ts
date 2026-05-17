/**
 * Sprint 012 — GET /api/ai-regulatory-scope/systems
 *
 * Returnează lista sistemelor AI cu `nis2EntityScope.inScope = true` (numai
 * dacă orgul are NIS2 declarat). Sub-set al summary-ului principal.
 */

import { NextResponse } from "next/server"

import { getOrgContext } from "@/lib/server/org-context"
import { getRegulatoryScopeSummary } from "@/lib/server/ai-regulatory-scope-store"

export async function GET() {
  try {
    const ctx = await getOrgContext()
    const summary = await getRegulatoryScopeSummary(ctx.orgId)
    return NextResponse.json({
      systems: summary.nis2ScopedSystems,
      stats: {
        count: summary.stats.nis2SystemCount,
        openGaps: summary.stats.nis2SystemOpenGaps,
        findingsOpen: summary.stats.nis2FindingsOpen,
      },
      nis2EntityClass: summary.profile?.nis2EntityClass ?? "not_in_scope",
    })
  } catch {
    return NextResponse.json(
      { error: "Nu am putut citi sistemele AI NIS2-scoped." },
      { status: 500 },
    )
  }
}
