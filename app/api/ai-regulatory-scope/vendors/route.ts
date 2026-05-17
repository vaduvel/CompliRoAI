/**
 * Sprint 012 — GET /api/ai-regulatory-scope/vendors
 *
 * Returnează lista vendorilor cu `doraScope.material = true` (numai dacă
 * orgul are DORA aplicabil). Sub-set al summary-ului principal, expus
 * separat pentru convenience UI / future filtrare.
 */

import { NextResponse } from "next/server"

import { getOrgContext } from "@/lib/server/org-context"
import { getRegulatoryScopeSummary } from "@/lib/server/ai-regulatory-scope-store"

export async function GET() {
  try {
    const ctx = await getOrgContext()
    const summary = await getRegulatoryScopeSummary(ctx.orgId)
    return NextResponse.json({
      vendors: summary.doraScopedVendors,
      stats: {
        count: summary.stats.doraVendorCount,
        openGaps: summary.stats.doraVendorOpenGaps,
        findingsOpen: summary.stats.doraFindingsOpen,
      },
      doraApplies: summary.profile?.doraApplies === true,
    })
  } catch {
    return NextResponse.json(
      { error: "Nu am putut citi vendorii DORA-material." },
      { status: 500 },
    )
  }
}
