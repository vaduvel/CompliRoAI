// GET /api/transparency/all-required
//
// Returnează lista consolidată de obligații Art. 50 pentru toate sistemele AI
// din inventarul organizației + statistici (total / pending / implementate).

import { NextResponse } from "next/server"

import {
  analyzeAllSystems,
  countSystemsWithPendingNotices,
} from "@/lib/compliance/transparency-engine"
import { readState } from "@/lib/server/store"
import type { TransparencyImplementation } from "@/lib/compliance/types"

function implementationKey(impl: Pick<TransparencyImplementation, "systemId" | "noticeType">): string {
  return `${impl.systemId}:${impl.noticeType}`
}

export async function GET() {
  try {
    const state = await readState()
    const systems = state.aiSystems ?? []
    const implementations = state.transparencyImplementations ?? []
    const role = state.roleAssessment?.primaryRole

    const systemAnalyses = analyzeAllSystems(systems, role)

    const implementedKeys = new Set<string>(
      implementations.map((impl) => implementationKey(impl))
    )

    const stats = countSystemsWithPendingNotices(systems, implementedKeys, role)

    // Adnotează fiecare requirement cu flag-ul `implemented`
    // și include implementation-ul dacă există.
    const annotated = systemAnalyses.map((sys) => ({
      systemId: sys.systemId,
      systemName: sys.systemName,
      requirements: sys.requirements.map((req) => {
        const key = `${sys.systemId}:${req.noticeType}`
        const impl = implementations.find(
          (i) => implementationKey(i) === key
        )
        return {
          ...req,
          implemented: implementedKeys.has(key),
          implementation: impl ?? null,
        }
      }),
    }))

    return NextResponse.json({
      role: role ?? null,
      systems: annotated,
      stats,
      implementations,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
