// Sprint 014 — Onboarding emails (welcome email post-registration).
//
// Wrapper subțire peste sendEmail() ca să furnizeze API stabil pentru caller
// (auth flow). Toate API-urile sunt fire-and-forget — caller-ul nu trebuie
// să aștepte sau să gestioneze erori (logate intern).

import { sendEmail, type SendEmailResult } from "./email-templates"

const PUBLIC_BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL?.trim() ||
  process.env.NEXTAUTH_URL?.trim() ||
  "https://app.compliroai.ro"

export type WelcomeEmailInput = {
  toEmail: string
  userName: string
  orgName?: string
  dashboardPath?: string
}

export async function sendWelcomeEmail(input: WelcomeEmailInput): Promise<SendEmailResult> {
  const dashboardUrl = `${PUBLIC_BASE_URL}${input.dashboardPath ?? "/dashboard"}`
  return sendEmail("welcome", input.toEmail, {
    userName: input.userName,
    dashboardUrl,
  })
}

/**
 * Fire-and-forget variant — never throws, never blocks caller. Used in
 * registration flow where email failure must not block account creation.
 */
export function sendWelcomeEmailAsync(input: WelcomeEmailInput): void {
  sendWelcomeEmail(input)
    .then((result) => {
      if (!result.ok) {
        console.warn(
          `[onboarding-emails] welcome email failed for ${input.toEmail}: ${result.error}`
        )
      }
    })
    .catch((err) => {
      console.warn(
        `[onboarding-emails] welcome email crash for ${input.toEmail}:`,
        err
      )
    })
}
