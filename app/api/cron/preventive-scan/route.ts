/**
 * Sprint 022 — GET /api/cron/preventive-scan
 *
 * Vercel Cron entrypoint. Rulează preventive scan pentru org-ul curent
 * (CompliRoAI = single-tenant per session; multi-tenant cron iteration peste
 * orgs din Supabase rămâne extensibilitate viitoare cu auth.users + state).
 *
 * Auth: header `Authorization: Bearer ${process.env.CRON_SECRET}`. Without it,
 * returns 401 — Vercel Cron sets this automatically per project secrets.
 */

import { NextResponse } from "next/server"

import { runPreventiveScan } from "@/lib/server/preventive-engine-runner"

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    // Default: scan default org. Multi-tenant iteration TBD (Supabase fetch).
    const orgId = process.env.PREVENTIVE_DEFAULT_ORG_ID ?? "default"
    const summary = await runPreventiveScan(orgId, {
      triggerSource: "cron",
      triggerByEmail: "cron@compliroai.ro",
    })
    return NextResponse.json({ ok: true, summary })
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Cron preventive-scan failed",
      },
      { status: 500 },
    )
  }
}
