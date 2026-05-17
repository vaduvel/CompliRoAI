/**
 * Sprint 013 — Calendar iCal export
 * GET /api/calendar/ical → RFC 5545 VCALENDAR
 *
 * Servește un feed pe care utilizatorul îl poate "subscribe" în Google
 * Calendar / Apple Calendar / Outlook. Fără filtru: toate evenimentele.
 */
import { NextResponse } from "next/server"

import { getOrgContext } from "@/lib/server/org-context"
import { readState } from "@/lib/server/store"
import { aggregateCalendarEvents, buildICal } from "@/lib/compliance/calendar-aggregator"

export async function GET(req: Request) {
  try {
    const ctx = await getOrgContext()
    const state = await readState()
    const url = new URL(req.url)
    const calendarName = `CompliRoAI · ${ctx.orgName || ctx.orgId}`

    const fromISO = url.searchParams.get("from") ?? undefined
    const toISO = url.searchParams.get("to") ?? undefined

    const events = aggregateCalendarEvents(state, { fromISO, toISO })
    const ical = buildICal(events, { calendarName, orgName: ctx.orgName })

    return new NextResponse(ical, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="compliroai-${ctx.orgId}.ics"`,
        "Cache-Control": "private, no-store",
      },
    })
  } catch (err) {
    console.error("[calendar.ical.GET]", err)
    return NextResponse.json(
      { error: "Nu am putut genera fluxul iCal." },
      { status: 500 },
    )
  }
}
