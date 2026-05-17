// Sprint 014 — Transactional alert emails (breach, finding critical, DSAR
// deadline, vendor DPA expiring). Toate sunt fire-and-forget — caller-ul
// stochează rezultatul în registry, nu așteaptă confirmare email.

import { sendEmail, type SendEmailResult } from "./email-templates"
import type { BreachRecord } from "@/lib/compliance/types"
import type { ScanFinding } from "@/lib/compliance/types"

const PUBLIC_BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL?.trim() ||
  process.env.NEXTAUTH_URL?.trim() ||
  "https://app.compliroai.ro"

// ────────────────────────────────────────────────────────────────────────────
//   Breach 72h alert
// ────────────────────────────────────────────────────────────────────────────

export type BreachAlertInput = {
  toEmail: string
  breach: Pick<BreachRecord, "id" | "title" | "severity" | "discoveredAtISO">
}

function severityLabel(severity: BreachRecord["severity"]): string {
  switch (severity) {
    case "critical":
      return "Critic"
    case "high":
      return "Ridicat"
    case "medium":
      return "Mediu"
    case "low":
      return "Scăzut"
    default:
      return String(severity)
  }
}

export async function sendBreachAlertEmail(input: BreachAlertInput): Promise<SendEmailResult> {
  const detected = new Date(input.breach.discoveredAtISO)
  const deadline = new Date(detected.getTime() + 72 * 60 * 60 * 1000)
  return sendEmail("breach-72h-alert", input.toEmail, {
    breachTitle: input.breach.title,
    breachUrl: `${PUBLIC_BASE_URL}/dashboard/breach/${input.breach.id}`,
    deadlineDate: deadline.toLocaleString("ro-RO", {
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    }),
    severityLabel: severityLabel(input.breach.severity),
  })
}

export function sendBreachAlertEmailAsync(input: BreachAlertInput): void {
  sendBreachAlertEmail(input)
    .then((r) => {
      if (!r.ok) {
        console.warn(
          `[email-alerts] breach alert failed for ${input.toEmail}: ${r.error}`
        )
      }
    })
    .catch((err) => console.warn(`[email-alerts] breach alert crash:`, err))
}

// ────────────────────────────────────────────────────────────────────────────
//   Finding critical created
// ────────────────────────────────────────────────────────────────────────────

export type FindingCriticalAlertInput = {
  toEmail: string
  finding: Pick<ScanFinding, "id" | "title" | "category" | "createdAtISO">
}

export async function sendFindingCriticalEmail(
  input: FindingCriticalAlertInput
): Promise<SendEmailResult> {
  return sendEmail("finding-critical-created", input.toEmail, {
    findingTitle: input.finding.title,
    findingUrl: `${PUBLIC_BASE_URL}/dashboard/findings/${input.finding.id}`,
    category: input.finding.category,
    createdAtDate: new Date(input.finding.createdAtISO).toLocaleDateString("ro-RO", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
  })
}

export function sendFindingCriticalEmailAsync(input: FindingCriticalAlertInput): void {
  sendFindingCriticalEmail(input)
    .then((r) => {
      if (!r.ok) {
        console.warn(
          `[email-alerts] finding critical alert failed for ${input.toEmail}: ${r.error}`
        )
      }
    })
    .catch((err) => console.warn(`[email-alerts] finding alert crash:`, err))
}

// ────────────────────────────────────────────────────────────────────────────
//   DSAR deadline reminder
// ────────────────────────────────────────────────────────────────────────────

export type DsarDeadlineAlertInput = {
  toEmail: string
  dsarId: string
  dsarType: string
  subjectIdentifier: string
  deadlineISO: string
}

export async function sendDsarDeadlineEmail(
  input: DsarDeadlineAlertInput
): Promise<SendEmailResult> {
  const deadline = new Date(input.deadlineISO)
  const now = new Date()
  const daysLeft = Math.max(0, Math.ceil((deadline.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)))
  return sendEmail("dsar-deadline-alert", input.toEmail, {
    dsarType: input.dsarType,
    dsarUrl: `${PUBLIC_BASE_URL}/dashboard/dsar/${input.dsarId}`,
    deadlineDate: deadline.toLocaleDateString("ro-RO", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
    daysLeft: String(daysLeft),
    subjectIdentifier: input.subjectIdentifier,
  })
}

export function sendDsarDeadlineEmailAsync(input: DsarDeadlineAlertInput): void {
  sendDsarDeadlineEmail(input)
    .then((r) => {
      if (!r.ok) {
        console.warn(
          `[email-alerts] DSAR deadline failed for ${input.toEmail}: ${r.error}`
        )
      }
    })
    .catch((err) => console.warn(`[email-alerts] DSAR deadline crash:`, err))
}

// ────────────────────────────────────────────────────────────────────────────
//   Vendor DPA expiring
// ────────────────────────────────────────────────────────────────────────────

export type VendorDpaExpiringInput = {
  toEmail: string
  vendorId: string
  vendorName: string
  expiryISO: string
}

export async function sendVendorDpaExpiringEmail(
  input: VendorDpaExpiringInput
): Promise<SendEmailResult> {
  const expiry = new Date(input.expiryISO)
  const now = new Date()
  const daysLeft = Math.max(0, Math.ceil((expiry.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)))
  return sendEmail("vendor-dpa-expiring", input.toEmail, {
    vendorName: input.vendorName,
    vendorUrl: `${PUBLIC_BASE_URL}/dashboard/vendor-review/${input.vendorId}`,
    expiryDate: expiry.toLocaleDateString("ro-RO", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
    daysLeft: String(daysLeft),
  })
}
