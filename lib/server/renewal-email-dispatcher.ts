/**
 * Sprint 022 — Renewal Email Dispatcher.
 *
 * Citește `state.renewalReminders[]`, trimite cele cu `scheduledForISO <= now`
 * și status="scheduled". Verifică dacă entitatea încă există / e pending. Dacă
 * nu, marchează `status="skipped_already_resolved"`.
 *
 * Graceful degradation: când RESEND_API_KEY lipsește, email-templates.sendEmail
 * loggă pe console și returnează ok=true / channel="console". Status va fi
 * "sent" cu success channel=console.
 *
 * Apelat din:
 *   - /api/cron/renewal-reminders (Vercel Cron daily 08:00 UTC)
 *   - test harness
 */

import {
  appendComplianceEvents,
  createComplianceEvent,
  type ComplianceEventActorInput,
} from "@/lib/compliance/events"
import { mutateFreshStateForOrg } from "@/lib/server/store"
import { sendEmail, type TemplateName } from "@/lib/server/email-templates"
import type {
  ComplianceState,
  PreventiveAction,
  PreventiveEntityType,
  RenewalReminderRecord,
} from "@/lib/compliance/types"

// ────────────────────────────────────────────────────────────────────────────
//   Public types
// ────────────────────────────────────────────────────────────────────────────

export type DispatchResult = {
  sent: number
  failed: number
  skipped: number
  total: number
}

export type DispatchOptions = {
  /** Current time, default nowISO. */
  nowISO?: string
  actor?: ComplianceEventActorInput
  /** Override: send even when scheduledForISO > now (only for tests). */
  forceAll?: boolean
}

// ────────────────────────────────────────────────────────────────────────────
//   Helpers — check if entity still needs action
// ────────────────────────────────────────────────────────────────────────────

/**
 * True dacă entitatea referențiată mai are nevoie de acțiune. Pure check —
 * folosit pentru a evita email-uri pe entități deja rezolvate.
 */
export function isReminderStillApplicable(
  state: ComplianceState,
  reminder: RenewalReminderRecord,
): boolean {
  return isEntityStillPending(state, reminder.entityType, reminder.entityId)
}

function isEntityStillPending(
  state: ComplianceState,
  entityType: PreventiveEntityType,
  entityId: string,
): boolean {
  switch (entityType) {
    case "dsar": {
      const d = (state.dsarRequests ?? []).find((x) => x.id === entityId)
      if (!d) return false
      return d.status !== "responded" && d.status !== "refused"
    }
    case "breach": {
      const b = (state.breachRecords ?? []).find((x) => x.id === entityId)
      if (!b) return false
      return (
        b.status !== "closed" &&
        b.status !== "anspdcp_notified" &&
        b.status !== "subjects_notified" &&
        b.status !== "no_notification_required"
      )
    }
    case "ai_incident": {
      const i = (state.aiIncidents ?? []).find((x) => x.id === entityId)
      if (!i) return false
      return i.status !== "closed" && i.status !== "not_reportable"
    }
    case "approval": {
      const a = (state.approvalRequests ?? []).find((x) => x.id === entityId)
      if (!a) return false
      return a.status === "pending"
    }
    case "fria":
      return Boolean((state.friaRecords ?? []).find((x) => x.id === entityId))
    case "dpia":
      return Boolean((state.dpiaRecords ?? []).find((x) => x.id === entityId))
    case "oversight":
      return Boolean(
        (state.humanOversightProtocols ?? []).find((x) => x.id === entityId),
      )
    case "logging":
      return Boolean(
        (state.loggingEvidence ?? []).find((x) => x.id === entityId),
      )
    case "pmm":
      return Boolean((state.pmmPlans ?? []).find((x) => x.id === entityId))
    case "vendor":
      return Boolean((state.vendorRecords ?? []).find((x) => x.id === entityId))
    case "qms":
      return Boolean(state.qmsWorkspace)
    case "transparency":
      return Boolean(
        (state.transparencyImplementations ?? []).find((x) => x.id === entityId),
      )
    case "ai_system":
      return Boolean((state.aiSystems ?? []).find((x) => x.id === entityId))
    case "legislative_change": {
      const acks = state.legislativeChangeAcknowledgments ?? []
      return !acks.some((a) => a.changeId === entityId)
    }
    case "audit_pack":
      return true
    case "content_asset":
      return Boolean(
        (state.aiContentAssets ?? []).find((x) => x.id === entityId),
      )
  }
}

function buildVarsForTemplate(
  reminder: RenewalReminderRecord,
  brandName: string,
  baseUrl: string,
): Record<string, string> {
  const daysLeft = Math.max(
    0,
    Math.round(
      (new Date(reminder.scheduledForISO).getTime() - Date.now()) / 86_400_000,
    ),
  )
  const entityUrl = entityToUrl(reminder.entityType, reminder.entityId, baseUrl)
  const triggerLabel = reminder.triggerType.replace(/_/g, " ")

  return {
    entityLabel: reminder.entityId,
    entityUrl,
    deadlineDate: new Date(reminder.scheduledForISO).toLocaleDateString("ro-RO"),
    daysLeft: String(daysLeft),
    recommendedAction: triggerLabel,
    triggerType: triggerLabel,
    brandName,
    breachTitle: reminder.entityId,
    breachUrl: entityUrl,
    severityLabel: "high",
    dsarType: reminder.entityId,
    dsarUrl: entityUrl,
    subjectIdentifier: "",
    vendorName: reminder.entityId,
    vendorUrl: entityUrl,
    expiryDate: new Date(reminder.scheduledForISO).toLocaleDateString("ro-RO"),
  }
}

function entityToUrl(
  type: PreventiveEntityType,
  id: string,
  baseUrl: string,
): string {
  const base = baseUrl.replace(/\/$/, "")
  switch (type) {
    case "fria":
      return `${base}/dashboard/fria`
    case "dpia":
      return `${base}/dashboard/dpia`
    case "oversight":
      return `${base}/dashboard/human-oversight`
    case "logging":
      return `${base}/dashboard/logging-evidence`
    case "pmm":
      return `${base}/dashboard/post-market-monitoring`
    case "vendor":
      return `${base}/dashboard/vendor-review`
    case "qms":
      return `${base}/dashboard/qms`
    case "transparency":
      return `${base}/dashboard/transparency`
    case "dsar":
      return `${base}/dashboard/dsar`
    case "breach":
      return `${base}/dashboard/breach`
    case "ai_incident":
      return `${base}/dashboard/ai-incidents`
    case "approval":
      return `${base}/dashboard/approvals`
    case "legislative_change":
      return `${base}/dashboard/legislative-changes`
    case "ai_system":
      return `${base}/dashboard/sisteme`
    case "audit_pack":
      return `${base}/dashboard/audit-pack`
    case "content_asset":
      return `${base}/dashboard/transparency?tab=content-register&asset=${id}`
  }
}

// ────────────────────────────────────────────────────────────────────────────
//   Public API
// ────────────────────────────────────────────────────────────────────────────

const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.COMPLIROAI_APP_URL ||
  "https://compliroai.ro"

export async function dispatchScheduledReminders(
  orgId: string,
  options: DispatchOptions = {},
): Promise<DispatchResult> {
  const now = options.nowISO ?? new Date().toISOString()
  const nowMs = new Date(now).getTime()
  let sent = 0
  let failed = 0
  let skipped = 0
  let total = 0
  const sendTasks: Array<{
    reminder: RenewalReminderRecord
    vars: Record<string, string>
    template: TemplateName
  }> = []

  await mutateFreshStateForOrg(orgId, (state) => {
    const reminders = state.renewalReminders ?? []
    const updated: RenewalReminderRecord[] = []
    for (const r of reminders) {
      if (r.status !== "scheduled") {
        updated.push(r)
        continue
      }
      const due = new Date(r.scheduledForISO).getTime() <= nowMs
      if (!due && !options.forceAll) {
        updated.push(r)
        continue
      }
      total += 1
      // Check entity still applicable
      if (!isReminderStillApplicable(state, r)) {
        skipped += 1
        updated.push({
          ...r,
          status: "skipped_already_resolved",
          sentAtISO: now,
        })
        continue
      }
      // Stage send (real send happens AFTER mutateFreshState commit)
      const vars = buildVarsForTemplate(r, "CompliRoAI", BASE_URL)
      sendTasks.push({ reminder: r, vars, template: r.emailTemplate as TemplateName })
      // Optimistically mark sent — failures are corrected post-commit via
      // markReminderFailed.
      updated.push({
        ...r,
        status: "sent",
        sentAtISO: now,
      })
    }
    // Cleanup old "sent" records > 90 days
    const ninetyDaysAgo = nowMs - 90 * 86_400_000
    const cleaned = updated.filter((r) => {
      if (r.status !== "sent") return true
      if (!r.sentAtISO) return true
      return new Date(r.sentAtISO).getTime() >= ninetyDaysAgo
    })
    return {
      ...state,
      renewalReminders: cleaned,
    }
  })

  // Fire sends after state commit (graceful: failures are logged not blocking)
  for (const task of sendTasks) {
    try {
      const res = await sendEmail(task.template, task.reminder.recipientEmail, task.vars)
      if (res.ok) {
        sent += 1
      } else {
        failed += 1
        await markReminderFailed(orgId, task.reminder.id, res.error)
      }
    } catch (err) {
      failed += 1
      await markReminderFailed(
        orgId,
        task.reminder.id,
        err instanceof Error ? err.message : "send threw",
      )
    }
  }

  // Append ledger event for the run
  await mutateFreshStateForOrg(orgId, (state) => {
    const actor: ComplianceEventActorInput =
      options.actor ?? {
        id: "system:renewal-email-dispatcher",
        role: "compliance",
        source: "system",
        label: "renewal-email-dispatcher",
      }
    const event = createComplianceEvent(
      {
        type: "preventive.reminders_dispatched",
        entityType: "system",
        entityId: "dispatcher",
        message: `Dispatched ${sent} reminders (skipped=${skipped}, failed=${failed})`,
        createdAtISO: now,
        metadata: { sent, failed, skipped, total },
      },
      actor,
    )
    return {
      ...state,
      events: appendComplianceEvents(state, [event]),
    }
  })

  return { sent, failed, skipped, total }
}

async function markReminderFailed(
  orgId: string,
  reminderId: string,
  reason: string,
): Promise<void> {
  await mutateFreshStateForOrg(orgId, (state) => {
    const reminders = state.renewalReminders ?? []
    const idx = reminders.findIndex((r) => r.id === reminderId)
    if (idx === -1) return state
    const next = [...reminders]
    next[idx] = {
      ...next[idx],
      status: "failed",
      failureReason: reason,
    }
    return { ...state, renewalReminders: next }
  })
}

/**
 * Helper pentru test compat — wraps PreventiveAction → reminders.
 */
export function scheduleReminderFromAction(
  action: PreventiveAction,
  recipientEmail: string,
): RenewalReminderRecord[] {
  if (action.urgency === "critical") {
    return [
      {
        id: `${action.id}-${action.detectedAtISO}`,
        triggerType: action.type,
        entityType: action.entityType,
        entityId: action.entityId,
        recipientEmail,
        scheduledForISO: action.detectedAtISO,
        emailTemplate: action.emailTemplate || "renewal-reminder",
        resendIfNotActioned: false,
        status: "scheduled",
      },
    ]
  }
  return []
}
