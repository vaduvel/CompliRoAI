/**
 * Sprint 013 — Calendar aggregator API
 * GET /api/calendar?from=&to=&modules=dsar,dpia,breach
 */
import { NextResponse } from "next/server"

import { getOrgContext } from "@/lib/server/org-context"
import { readState } from "@/lib/server/store"
import { aggregateCalendarEvents } from "@/lib/compliance/calendar-aggregator"
import type { CalendarEventModule } from "@/lib/compliance/types"

const VALID_MODULES: CalendarEventModule[] = [
  "dsar",
  "dpia",
  "ropa",
  "breach",
  "vendor",
  "ai_act_regulatory",
  "approval",
  "finding",
  "audit_pack",
  "trust_center",
]

export async function GET(req: Request) {
  try {
    await getOrgContext()
    const state = await readState()
    const url = new URL(req.url)

    const fromISO = url.searchParams.get("from") ?? undefined
    const toISO = url.searchParams.get("to") ?? undefined
    const modulesRaw = url.searchParams.get("modules")
    const modules = modulesRaw
      ? (modulesRaw
          .split(",")
          .map((s) => s.trim())
          .filter((s): s is CalendarEventModule => (VALID_MODULES as string[]).includes(s)) as CalendarEventModule[])
      : undefined

    const events = aggregateCalendarEvents(state, {
      fromISO,
      toISO,
      modules: modules && modules.length ? modules : undefined,
    })

    return NextResponse.json({
      events,
      total: events.length,
      availableModules: VALID_MODULES,
    })
  } catch (err) {
    console.error("[calendar.GET]", err)
    return NextResponse.json(
      { error: "Nu am putut încărca calendarul." },
      { status: 500 },
    )
  }
}
