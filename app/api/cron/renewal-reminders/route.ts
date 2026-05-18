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
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
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
