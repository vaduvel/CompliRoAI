/**
 * Sprint 022 — Preventive Engine Runner (server-side).
 *
 * Orchestrează:
 *   1. citește state via mutateFreshStateForOrg
 *   2. apelează scanState() din lib/compliance/preventive-scanner
 *   3. pentru fiecare PreventiveAction cu shouldEmitFinding=true:
 *      - creează un finding NEW (stable ID per action) sau auto-reopen
 *        dacă există deja un finding stale linked
 *   4. pentru fiecare cu shouldEmail=true: queue un RenewalReminderRecord
 *      (la 30/15/5/1 zile sau imediat dacă urgency=critical)
 *   5. actualizează state.preventiveLastRunAtISO + summary
 *
 * Apelat din:
 *   - /api/cron/preventive-scan (Vercel Cron daily 06:00 UTC)
 *   - /api/preventive/run (manual, current org)
 */

import {
  appendComplianceEvents,
  createComplianceEvent,
  type ComplianceEventActorInput,
} from "@/lib/compliance/events"
import { scanState } from "@/lib/compliance/preventive-scanner"
import { getReminderSchedule } from "@/lib/compliance/renewal-tracker"
import {
  inferPrinciplesFromCategory,
  normalizeComplianceSeverity,
  severityToLegacyRisk,
  type ComplianceSeverity,
} from "@/lib/compliance/constitution"
import { mutateFreshStateForOrg } from "@/lib/server/store"
import type {
  ComplianceState,
  FindingCategory,
  PreventiveAction,
  PreventiveActionUrgency,
  PreventiveRunSummary,
  PreventiveTriggerType,
  RenewalReminderRecord,
  ScanFinding,
} from "@/lib/compliance/types"

// ────────────────────────────────────────────────────────────────────────────
//   Helpers
// ────────────────────────────────────────────────────────────────────────────

function nowISO(): string {
  return new Date().toISOString()
}

function urgencyToSeverity(u: PreventiveActionUrgency): ComplianceSeverity {
  switch (u) {
    case "critical":
      return "critical"
    case "overdue":
      return "high"
    case "due_soon":
      return "medium"
    case "watch":
      return "low"
    case "info":
      return "low"
  }
}

function triggerToCategory(t: PreventiveTriggerType): FindingCategory {
  switch (t) {
    case "dpia_review_overdue":
    case "dsar_response_overdue":
    case "breach_72h_expiring":
    case "vendor_dpa_expiring":
      return "GDPR"
    case "fria_review_overdue":
    case "oversight_review_overdue":
    case "logging_retention_expiring":
    case "pmm_review_overdue":
    case "qms_annual_review_due":
    case "transparency_notice_stale":
    case "ai_incident_deadline_expiring":
    case "system_reclassification_needed":
    case "legislative_change_unacknowledged":
    case "missing_audit_pack_recent":
    case "lessons_refresh_due":
      return "EU_AI_ACT"
    case "approval_request_expired":
      return "EU_AI_ACT"
    // Sprint 023.7 — Art. 50 content labeling depth (per-asset).
    case "art50_deepfake_no_watermark":
    case "art50_synthetic_content_no_metadata":
    case "art50_chatbot_no_runtime_disclosure":
    case "art50_public_interest_no_editorial_flag":
      return "EU_AI_ACT"
  }
}

function pickEmailRecipient(
  state: ComplianceState,
  fallbackEmail?: string,
): string | undefined {
  const prefs = state.preventiveEmailPreferences
  if (prefs?.enabled && prefs.recipientEmails.length > 0) {
    return prefs.recipientEmails[0]
  }
  return fallbackEmail
}

function isRuleEnabled(state: ComplianceState, t: PreventiveTriggerType): boolean {
  const prefs = state.preventiveEmailPreferences
  if (!prefs) return true // default: all rules enabled when no prefs set
  if (!prefs.enabled) return false
  if (prefs.perRuleEnabled[t] === false) return false
  return true
}

function findingIdForAction(action: PreventiveAction): string {
  return `prev-finding-${action.id}`
}

function reminderIdForAction(action: PreventiveAction, scheduledISO: string): string {
  return `${action.id}-${scheduledISO}`
}

// ────────────────────────────────────────────────────────────────────────────
//   Public API — runPreventiveScan
// ────────────────────────────────────────────────────────────────────────────

export type RunPreventiveScanOptions = {
  triggerSource: "cron" | "manual" | "webhook"
  triggerByEmail?: string
  /** Override pentru testare (default: new Date().toISOString()). */
  nowISO?: string
  /** Actor pentru ledger events (default: synthesized "system"). */
  actor?: ComplianceEventActorInput
}

export async function runPreventiveScan(
  orgId: string,
  options: RunPreventiveScanOptions,
): Promise<PreventiveRunSummary> {
  const startedAtISO = options.nowISO ?? nowISO()
  const runId = `prev-run-${startedAtISO}-${Math.random().toString(36).slice(2, 6)}`
  const errors: string[] = []
  const byType: Partial<Record<PreventiveTriggerType, number>> = {}
  let actionsDetected = 0
  let findingsEmitted = 0
  let emailsQueued = 0

  const actor: ComplianceEventActorInput =
    options.actor ?? {
      id: "system:preventive-engine",
      role: "compliance",
      source: "system",
      label: options.triggerByEmail ?? "preventive-engine",
    }

  await mutateFreshStateForOrg(orgId, (state) => {
    let actions: PreventiveAction[] = []
    try {
      actions = scanState(state, startedAtISO)
    } catch (err) {
      errors.push(
        `scanState failed: ${err instanceof Error ? err.message : String(err)}`,
      )
      return updateLastRun(state, {
        runId,
        startedAtISO,
        completedAtISO: nowISO(),
        durationMs: Date.now() - new Date(startedAtISO).getTime(),
        triggerSource: options.triggerSource,
        triggerByEmail: options.triggerByEmail,
        actionsDetected: 0,
        findingsEmitted: 0,
        emailsQueued: 0,
        errorsCount: errors.length,
        errors,
        byType: {},
      })
    }

    actionsDetected = actions.length
    let newState = state
    const newEvents = newState.events

    const findingsByStableId = new Map<string, ScanFinding>()
    for (const f of newState.findings ?? []) {
      findingsByStableId.set(f.id, f)
    }
    const findings: ScanFinding[] = [...(newState.findings ?? [])]
    const reminders: RenewalReminderRecord[] = [...(newState.renewalReminders ?? [])]
    const remindersById = new Set(reminders.map((r) => r.id))

    for (const action of actions) {
      byType[action.type] = (byType[action.type] ?? 0) + 1

      // Findings: create/reopen
      if (action.shouldEmitFinding) {
        const stableId = findingIdForAction(action)
        const existingIdx = findings.findIndex((f) => f.id === stableId)
        const severity = urgencyToSeverity(action.urgency)
        const category = triggerToCategory(action.type)
        if (existingIdx === -1) {
          const finding: ScanFinding = {
            id: stableId,
            title: `Preventiv — ${action.entityLabel}`,
            detail: action.recommendedAction,
            category,
            severity,
            risk: severityToLegacyRisk(severity),
            principles: inferPrinciplesFromCategory(category),
            createdAtISO: startedAtISO,
            sourceDocument: "preventive-engine",
            findingStatus: "open",
            findingStatusUpdatedAtISO: startedAtISO,
            reviewState: "unreviewed",
            remediationHint: action.recommendedAction,
            impactSummary: action.notes,
          }
          findings.unshift(finding)
          findingsEmitted += 1
        } else {
          // Auto-reopen if stale closed
          const cur = findings[existingIdx]
          if (cur.findingStatus === "resolved" || cur.findingStatus === "dismissed") {
            findings[existingIdx] = {
              ...cur,
              findingStatus: "open",
              findingStatusUpdatedAtISO: startedAtISO,
              reopenedFromISO: startedAtISO,
              severity,
              risk: severityToLegacyRisk(severity),
              reviewState: "unreviewed",
            }
            findingsEmitted += 1
          }
        }
      }

      // Emails: schedule reminders
      if (action.shouldEmail && isRuleEnabled(newState, action.type)) {
        const recipient = pickEmailRecipient(newState, options.triggerByEmail)
        if (!recipient) continue
        const template = action.emailTemplate || "renewal-reminder"
        // For critical: immediate; for others: schedule at intervals
        if (action.urgency === "critical") {
          const rid = reminderIdForAction(action, startedAtISO)
          if (!remindersById.has(rid)) {
            reminders.push({
              id: rid,
              triggerType: action.type,
              entityType: action.entityType,
              entityId: action.entityId,
              recipientEmail: recipient,
              scheduledForISO: startedAtISO,
              emailTemplate: template,
              resendIfNotActioned: false,
              status: "scheduled",
            })
            remindersById.add(rid)
            emailsQueued += 1
          }
        } else if (action.dueDateISO) {
          const schedule = getReminderSchedule(
            {
              entityType: action.entityType,
              entityId: action.entityId,
              entityLabel: action.entityLabel,
              renewalType: action.type,
              nextRenewalISO: action.dueDateISO,
              daysUntil: action.daysUntilDue ?? 0,
            },
            startedAtISO,
          )
          for (const s of schedule) {
            const rid = reminderIdForAction(action, s.scheduledForISO)
            if (remindersById.has(rid)) continue
            reminders.push({
              id: rid,
              triggerType: action.type,
              entityType: action.entityType,
              entityId: action.entityId,
              recipientEmail: recipient,
              scheduledForISO: s.scheduledForISO,
              emailTemplate: template,
              resendIfNotActioned: false,
              status: "scheduled",
            })
            remindersById.add(rid)
            emailsQueued += 1
          }
        } else {
          // Fallback: schedule immediate
          const rid = reminderIdForAction(action, startedAtISO)
          if (!remindersById.has(rid)) {
            reminders.push({
              id: rid,
              triggerType: action.type,
              entityType: action.entityType,
              entityId: action.entityId,
              recipientEmail: recipient,
              scheduledForISO: startedAtISO,
              emailTemplate: template,
              resendIfNotActioned: false,
              status: "scheduled",
            })
            remindersById.add(rid)
            emailsQueued += 1
          }
        }
      }
    }

    const summary: PreventiveRunSummary = {
      runId,
      startedAtISO,
      completedAtISO: nowISO(),
      durationMs:
        new Date(nowISO()).getTime() - new Date(startedAtISO).getTime(),
      triggerSource: options.triggerSource,
      triggerByEmail: options.triggerByEmail,
      actionsDetected,
      findingsEmitted,
      emailsQueued,
      errorsCount: errors.length,
      errors,
      byType,
    }

    const event = createComplianceEvent(
      {
        type: "preventive.scan_run",
        entityType: "system",
        entityId: runId,
        message: `Preventive scan: ${actionsDetected} acțiuni, ${findingsEmitted} findings, ${emailsQueued} email-uri queue`,
        createdAtISO: startedAtISO,
        metadata: {
          triggerSource: options.triggerSource,
        },
      },
      actor,
    )

    newState = {
      ...newState,
      findings,
      renewalReminders: reminders,
      preventiveLastRunAtISO: startedAtISO,
      preventiveLastRunSummary: summary,
      // Sprint 22 fix — set legislative baseline at first scan so rule 14
      // only fires for changes published AFTER org adoption (forward-looking).
      legislativeBaselineISO:
        newState.legislativeBaselineISO ?? startedAtISO,
      events: appendComplianceEvents(newState, [event]),
    }
    void newEvents
    return newState
  })

  // Final summary returned to caller — re-read to avoid stale closure
  return {
    runId,
    startedAtISO,
    completedAtISO: nowISO(),
    durationMs: new Date(nowISO()).getTime() - new Date(startedAtISO).getTime(),
    triggerSource: options.triggerSource,
    triggerByEmail: options.triggerByEmail,
    actionsDetected,
    findingsEmitted,
    emailsQueued,
    errorsCount: errors.length,
    errors,
    byType,
  }
}

function updateLastRun(
  state: ComplianceState,
  summary: PreventiveRunSummary,
): ComplianceState {
  return {
    ...state,
    preventiveLastRunAtISO: summary.startedAtISO,
    preventiveLastRunSummary: summary,
  }
}
