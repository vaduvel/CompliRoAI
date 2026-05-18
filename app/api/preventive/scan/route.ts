/**
 * Sprint 022 — POST /api/preventive/scan
 *
 * Manual trigger pentru preventive engine. Rulează scanState peste org curent
 * și actualizează state.preventiveLastRunSummary + findings + renewalReminders.
 *
 * Cron echivalent: /api/cron/preventive-scan (Vercel Cron).
 */

import { NextResponse } from "next/server"

import { getOrgContext } from "@/lib/server/org-context"
import { runPreventiveScan } from "@/lib/server/preventive-engine-runner"

export async function POST(request: Request) {
  try {
    const ctx = await getOrgContext()
    const body = await request.json().catch(() => ({}))
    const summary = await runPreventiveScan(ctx.orgId, {
      triggerSource: "manual",
      triggerByEmail: ctx.email,
      nowISO: typeof body.nowISO === "string" ? body.nowISO : undefined,
      actor: {
        id: ctx.userId,
        role: "compliance",
        source: "session",
        label: ctx.email,
      },
    })
    return NextResponse.json({ summary })
  } catch {
    return NextResponse.json(
      { error: "Nu am putut rula preventive scan." },
      { status: 500 },
    )
  }
}
