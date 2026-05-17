// Sprint 014 — POST /api/emails/test
//
// Admin/QA endpoint pentru testarea oricărui template cu variabile custom.
// Trimite emailul către user-ul curent (din session).
//
// Body: { template: TemplateName, vars: Record<string,string> }
// Răspuns: { ok, channel, id?, error? }

import { NextResponse } from "next/server"

import { getOrgContext } from "@/lib/server/org-context"
import { listTemplates, sendEmail, type TemplateName } from "@/lib/server/email-templates"
import { getEffectiveBranding } from "@/lib/server/white-label"

export async function GET() {
  // Listează template-urile disponibile.
  return NextResponse.json({ templates: listTemplates() })
}

export async function POST(request: Request) {
  let ctx
  try {
    ctx = await getOrgContext()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: { template?: string; vars?: Record<string, string>; to?: string } = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Body JSON invalid." }, { status: 400 })
  }

  const template = body.template as TemplateName | undefined
  if (!template || !listTemplates().includes(template)) {
    return NextResponse.json(
      { error: `Template necunoscut. Disponibile: ${listTemplates().join(", ")}` },
      { status: 400 }
    )
  }

  const to = body.to?.trim() || ctx.email
  if (!to || !to.includes("@")) {
    return NextResponse.json({ error: "Email destinatar invalid." }, { status: 400 })
  }

  const branding = await getEffectiveBranding(ctx.orgId).catch(() => null)

  const result = await sendEmail(template, to, body.vars ?? {}, { branding })
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, channel: result.channel, error: result.error },
      { status: 500 }
    )
  }
  return NextResponse.json({ ok: true, channel: result.channel, id: result.id })
}
