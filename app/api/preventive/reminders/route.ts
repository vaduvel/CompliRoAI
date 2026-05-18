/**
 * Sprint 022 — GET /api/preventive/reminders
 *
 * Listează renewal reminders programate / trimise / failed pentru org curent.
 * Filtre opționale: status, triggerType, entityType.
 */

import { NextResponse } from "next/server"

import { getOrgContext } from "@/lib/server/org-context"
import { readState } from "@/lib/server/store"

export async function GET(request: Request) {
  try {
    await getOrgContext()
    const state = await readState()
    const url = new URL(request.url)
    const status = url.searchParams.get("status")
    const triggerType = url.searchParams.get("triggerType")
    const entityType = url.searchParams.get("entityType")
    let reminders = state.renewalReminders ?? []
    if (status) reminders = reminders.filter((r) => r.status === status)
    if (triggerType)
      reminders = reminders.filter((r) => r.triggerType === triggerType)
    if (entityType)
      reminders = reminders.filter((r) => r.entityType === entityType)
    const sorted = [...reminders].sort((a, b) =>
      a.scheduledForISO.localeCompare(b.scheduledForISO),
    )
    return NextResponse.json({
      reminders: sorted,
      count: sorted.length,
      lastRunAtISO: state.preventiveLastRunAtISO ?? null,
      lastRunSummary: state.preventiveLastRunSummary ?? null,
    })
  } catch {
    return NextResponse.json(
      { error: "Nu am putut citi renewal reminders." },
      { status: 500 },
    )
  }
}
