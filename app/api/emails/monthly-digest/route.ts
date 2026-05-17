// Sprint 014 — POST /api/emails/monthly-digest
//
// Admin endpoint pentru a trimite digest-ul lunar către user-ul curent.
// Folosit pentru testing + va fi apelat de cron (Sprint 022).

import { NextResponse } from "next/server"

import { getOrgContext } from "@/lib/server/org-context"
import { sendMonthlyDigestEmail } from "@/lib/server/renewal-email"
import { readState } from "@/lib/server/store"

export async function POST(request: Request) {
  let ctx
  try {
    ctx = await getOrgContext()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: { to?: string } = {}
  try {
    body = await request.json()
  } catch {
    // empty OK
  }

  const to = body.to?.trim() || ctx.email
  if (!to || !to.includes("@")) {
    return NextResponse.json({ error: "Email invalid." }, { status: 400 })
  }

  const state = await readState()
  const result = await sendMonthlyDigestEmail({ toEmail: to, state })

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, channel: result.channel, error: result.error },
      { status: 500 }
    )
  }
  return NextResponse.json({ ok: true, channel: result.channel, id: result.id })
}
