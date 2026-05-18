/**
 * Sprint 022 — GET /api/cron/renewal-reminders
 *
 * Vercel Cron entrypoint. Trimite renewal reminder emails programate.
 *
 * Auth: `Authorization: Bearer ${CRON_SECRET}`.
 */

import { NextResponse } from "next/server"

import { dispatchScheduledReminders } from "@/lib/server/renewal-email-dispatcher"

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  // Fail-closed: în production fără CRON_SECRET endpoint-ul rămâne închis
  // (503). În dev/test fără secret îl lăsăm deschis pentru iterație locală.
  if (!cronSecret) {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { error: "Cron auth not configured." },
        { status: 503 },
      )
    }
  } else if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    const orgId = process.env.PREVENTIVE_DEFAULT_ORG_ID ?? "default"
    const result = await dispatchScheduledReminders(orgId, {})
    return NextResponse.json({ ok: true, result })
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error:
          err instanceof Error ? err.message : "Cron renewal-reminders failed",
      },
      { status: 500 },
    )
  }
}
