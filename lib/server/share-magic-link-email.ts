// CompliRoAI — Magic Link email delivery via Resend.
//
// Falls back to a console.log when RESEND_API_KEY is missing, so dev still
// works end-to-end (you can copy the URL from the API response).

import type { ShareTargetType } from "./share-token-store"

const RESEND_API_KEY = process.env.RESEND_API_KEY?.trim() || ""
const FROM_ADDRESS =
  process.env.COMPLIROAI_EMAIL_FROM?.trim() ||
  "CompliRoAI <onboarding@resend.dev>"

export type SendMagicLinkEmailInput = {
  toEmail: string
  recipientName?: string
  cabinetName?: string
  targetType: ShareTargetType
  targetLabel?: string
  shareUrl: string
  expiresAtISO: string
  note?: string
}

const TARGET_COPY: Record<
  ShareTargetType,
  { subject: string; heading: string; body: string }
> = {
  intake: {
    subject: "Te rugăm să completezi datele firmei pentru AI Act",
    heading: "Completează datele firmei",
    body: "Cabinetul tău are nevoie de câteva detalii despre firma și sistemele AI folosite pentru a finaliza analiza de conformitate AI Act + GDPR.",
  },
  approval: {
    subject: "Cerere de aprobare — sistem AI",
    heading: "Confirmă utilizarea unui sistem AI",
    body: "Cabinetul tău a pregătit un sistem AI pentru includerea în registrul de conformitate. Te rugăm să confirmi sau să respingi din formularul de mai jos.",
  },
  report: {
    subject: "Raport de conformitate AI Act — disponibil pentru consultare",
    heading: "Raport AI Act disponibil",
    body: "Cabinetul tău a pregătit un raport de conformitate AI Act + GDPR pentru firma ta.",
  },
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("ro-RO", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return iso
  }
}

function buildHtml(input: SendMagicLinkEmailInput): string {
  const copy = TARGET_COPY[input.targetType]
  const brand = "#3b5bdb" // CompliRoAI cobalt
  const cabinet = input.cabinetName?.trim() || "Cabinetul tău de consultanță"
  const recipient = input.recipientName?.trim()
  const noteBlock = input.note?.trim()
    ? `<div style="margin:18px 0;padding:14px 16px;background:#f8fafc;border-left:3px solid ${brand};border-radius:0 6px 6px 0;color:#0f172a;font-size:14px;line-height:1.55;white-space:pre-wrap">${escapeHtml(input.note.trim())}</div>`
    : ""
  const targetLabelLine = input.targetLabel
    ? `<p style="margin:0 0 6px;color:#64748b;font-size:13px">Subiect: <strong style="color:#0f172a">${escapeHtml(input.targetLabel)}</strong></p>`
    : ""

  return `<!DOCTYPE html>
<html lang="ro">
<head><meta charset="utf-8"></head>
<body style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#0f172a;background:#fff">
  <div style="background:${brand};padding:18px 24px;border-radius:8px 8px 0 0">
    <h1 style="color:#fff;margin:0;font-size:16px;font-weight:600;letter-spacing:-0.01em">CompliRoAI</h1>
    <p style="color:rgba(255,255,255,0.85);margin:4px 0 0;font-size:12px">Conformitate AI Act + GDPR pentru România</p>
  </div>
  <div style="border:1px solid #e2e8f0;border-top:none;padding:24px;border-radius:0 0 8px 8px;background:#fff">
    ${recipient ? `<p style="margin:0 0 12px;color:#0f172a;font-size:14px">Bună, ${escapeHtml(recipient)},</p>` : ""}
    <h2 style="margin:0 0 12px;color:#0f172a;font-size:18px;font-weight:600;line-height:1.35">${copy.heading}</h2>
    <p style="margin:0 0 14px;color:#334155;font-size:14px;line-height:1.6">
      ${copy.body}
    </p>
    <p style="margin:0 0 6px;color:#64748b;font-size:13px">Trimis de: <strong style="color:#0f172a">${escapeHtml(cabinet)}</strong></p>
    ${targetLabelLine}
    ${noteBlock}
    <div style="margin:24px 0">
      <a href="${input.shareUrl}" style="display:inline-block;padding:11px 20px;background:${brand};color:#fff;text-decoration:none;border-radius:6px;font-size:14px;font-weight:600">
        Deschide linkul
      </a>
    </div>
    <p style="margin:0;color:#64748b;font-size:12px">
      Linkul expiră la <strong style="color:#0f172a">${escapeHtml(formatDate(input.expiresAtISO))}</strong>.
      Dacă nu ai cerut acest mesaj, poți ignora email-ul.
    </p>
    <hr style="margin:22px 0;border:none;border-top:1px solid #e2e8f0">
    <p style="color:#94a3b8;font-size:11px;margin:0">
      Notificare automată CompliRoAI · Trimis prin link unic, semnat HMAC. Nu răspunde acestui email.
    </p>
  </div>
</body>
</html>`
}

export type SendMagicLinkEmailResult =
  | { ok: true; channel: "resend" | "console"; id?: string }
  | { ok: false; channel: "resend" | "console"; error: string }

export async function sendMagicLinkEmail(
  input: SendMagicLinkEmailInput
): Promise<SendMagicLinkEmailResult> {
  const copy = TARGET_COPY[input.targetType]
  const subject = copy.subject
  const html = buildHtml(input)

  if (!RESEND_API_KEY) {
    console.log(
      `[share-magic-link-email] (no RESEND_API_KEY) → ${input.toEmail} | ${input.targetType} | ${input.shareUrl}`
    )
    return { ok: true, channel: "console" }
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: [input.toEmail],
        subject,
        html,
      }),
      signal: AbortSignal.timeout(10_000),
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText)
      console.error(
        `[share-magic-link-email] Resend error ${res.status}: ${errText}`
      )
      return {
        ok: false,
        channel: "resend",
        error: `HTTP ${res.status}: ${errText.slice(0, 200)}`,
      }
    }

    const data = (await res.json().catch(() => ({}))) as { id?: string }
    return { ok: true, channel: "resend", id: data.id }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "fetch failed"
    console.error(`[share-magic-link-email] Resend exception: ${msg}`)
    return { ok: false, channel: "resend", error: msg }
  }
}
