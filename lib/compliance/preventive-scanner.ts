/**
 * Sprint 022 — Preventive Scanner (pure function)
 *
 * Scanează `ComplianceState` curent + acoperă 16 reguli care detectează
 * deadline-uri viitoare, retention expirare, schimbări de sistem AI,
 * acknowledgments lipsă pe modificări legislative + audit pack-uri vechi.
 *
 * Stateless / pure: niciun IO. Runner-ul (lib/server/preventive-engine-runner.ts)
 * apelează `scanState(state, nowISO)` și emite findings / programează emailuri.
 *
 * Spec: docs/strategic/compliroai-dpo-os-port-execution-mandate-2026-05-17.md
 *       §22 + functional-spec-v2 §4 row 22.
 */

import {
  LEGISLATIVE_CHANGE_LOG,
  isAcknowledged,
} from "./legislative-change-log"

import type {
  AIIncident,
  AISystemRecord,
  ApprovalRequest,
  BreachRecord,
  ComplianceState,
  DpiaRecord,
  DsarRequest,
  FriaRecord,
  HumanOversightProtocol,
  LegislativeChangeEvent,
  LoggingConfig,
  PmmPlan,
  PreventiveAction,
  PreventiveActionUrgency,
  PreventiveTriggerType,
  QmsWorkspace,
  TransparencyImplementation,
  VendorRecord,
} from "./types"

// ────────────────────────────────────────────────────────────────────────────
//   Helpers
// ────────────────────────────────────────────────────────────────────────────

const DAY_MS = 86_400_000

function daysBetween(fromISO: string, toISO: string): number {
  return Math.round((new Date(toISO).getTime() - new Date(fromISO).getTime()) / DAY_MS)
}

function safeDays(refISO: string | undefined, nowISO: string): number | undefined {
  if (!refISO) return undefined
  const t = new Date(refISO).getTime()
  if (!Number.isFinite(t)) return undefined
  return Math.round((t - new Date(nowISO).getTime()) / DAY_MS)
}

function urgencyForDays(daysUntilDue: number): PreventiveActionUrgency {
  if (daysUntilDue < 0) return "overdue"
  if (daysUntilDue <= 5) return "due_soon"
  if (daysUntilDue <= 30) return "watch"
  return "info"
}

function urgencyRank(u: PreventiveActionUrgency): number {
  switch (u) {
    case "critical":
      return 5
    case "overdue":
      return 4
    case "due_soon":
      return 3
    case "watch":
      return 2
    case "info":
      return 1
  }
}

function pushAction(
  acc: PreventiveAction[],
  partial: Omit<PreventiveAction, "id" | "detectedAtISO"> & { idSuffix: string },
  nowISO: string,
): void {
  const { idSuffix, ...rest } = partial
  acc.push({
    ...rest,
    id: `prev-${rest.type}-${idSuffix}`,
    detectedAtISO: nowISO,
  })
}

// ────────────────────────────────────────────────────────────────────────────
//   Public API
// ────────────────────────────────────────────────────────────────────────────

export type PreventiveScanOptions = {
  /**
   * Override pentru registry-ul global de modificări legislative. Folosit în
   * tests; production lasă undefined (scanner-ul consumă LEGISLATIVE_CHANGE_LOG).
   */
  legislativeChangeLog?: LegislativeChangeEvent[]
}

/**
 * Rulează cele 16 reguli preventive peste un snapshot de state. Returnează
 * lista de acțiuni sortate descrescător după urgență apoi crescător după
 * daysUntilDue (cea mai urgentă prima).
 */
export function scanState(
  state: ComplianceState,
  nowISO: string,
  options: PreventiveScanOptions = {},
): PreventiveAction[] {
  const actions: PreventiveAction[] = []

  scanAISystems(state.aiSystems ?? [], nowISO, actions)
  scanFria(state.friaRecords ?? [], nowISO, actions)
  scanDpia(state.dpiaRecords ?? [], nowISO, actions)
  scanOversight(state.humanOversightProtocols ?? [], nowISO, actions)
  scanLogging(state.loggingEvidence ?? [], nowISO, actions)
  scanPmm(state.pmmPlans ?? [], nowISO, actions)
  scanVendors(state.vendorRecords ?? [], nowISO, actions)
  scanQms(state.qmsWorkspace, nowISO, actions)
  scanTransparency(
    state.transparencyImplementations ?? [],
    state.aiSystems ?? [],
    nowISO,
    actions,
  )
  scanDsar(state.dsarRequests ?? [], nowISO, actions)
  scanBreaches(state.breachRecords ?? [], nowISO, actions)
  scanAIIncidents(state.aiIncidents ?? [], nowISO, actions)
  scanApprovals(state.approvalRequests ?? [], nowISO, actions)
  scanLegislativeChanges(state, nowISO, options.legislativeChangeLog, actions)
  scanAuditPackFreshness(state, nowISO, actions)
  scanLessonsRefresh(state, nowISO, actions)

  // Sort: highest urgency first; within same urgency, soonest dueDate first
  actions.sort((a, b) => {
    const rank = urgencyRank(b.urgency) - urgencyRank(a.urgency)
    if (rank !== 0) return rank
    const ad = a.daysUntilDue ?? Number.MAX_SAFE_INTEGER
    const bd = b.daysUntilDue ?? Number.MAX_SAFE_INTEGER
    return ad - bd
  })

  return actions
}

// ────────────────────────────────────────────────────────────────────────────
//   Rule 1 — AI System reclassification needed
// ────────────────────────────────────────────────────────────────────────────

function scanAISystems(
  systems: AISystemRecord[],
  nowISO: string,
  acc: PreventiveAction[],
): void {
  for (const sys of systems) {
    // Heuristic: high-risk system never reviewed since creation > 180 days
    const days = daysBetween(sys.createdAtISO, nowISO)
    if (days > 180 && sys.riskLevel === "high") {
      pushAction(
        acc,
        {
          idSuffix: sys.id,
          type: "system_reclassification_needed",
          urgency: days > 365 ? "overdue" : "watch",
          entityType: "ai_system",
          entityId: sys.id,
          entityLabel: sys.name,
          recommendedAction:
            "Reverifică clasificarea AI Act (Art. 5 + Anexa III) — sistem high-risk fără reevaluare > 180 zile.",
          dueDateISO: undefined,
          daysUntilDue: 180 - days,
          shouldEmitFinding: days > 365,
          shouldEmail: days > 365,
          emailTemplate: "renewal-reminder",
          notes: `Risk level curent: ${sys.riskLevel}. Vârsta înregistrării: ${days}z.`,
        },
        nowISO,
      )
    }
  }
}

// ────────────────────────────────────────────────────────────────────────────
//   Rule 2 — FRIA review overdue (Art. 27)
// ────────────────────────────────────────────────────────────────────────────

function scanFria(
  fria: FriaRecord[],
  nowISO: string,
  acc: PreventiveAction[],
): void {
  for (const f of fria) {
    // Approved FRIA without recent re-review > 365 days
    const ref = f.approvedAtISO ?? f.reviewedAtISO ?? f.updatedAtISO
    const refDays = daysBetween(ref, nowISO)
    const needsReview = refDays > 305 // alertă 60 zile înainte de 1 an
    if (!needsReview) continue
    const daysUntilDue = 365 - refDays
    const urgency: PreventiveActionUrgency =
      daysUntilDue < -30 ? "critical" : urgencyForDays(daysUntilDue)
    pushAction(
      acc,
      {
        idSuffix: f.id,
        type: "fria_review_overdue",
        urgency,
        entityType: "fria",
        entityId: f.id,
        entityLabel: f.title,
        recommendedAction:
          "Reefectuează FRIA Art. 27 — review anual obligatoriu pentru sistem high-risk.",
        dueDateISO: new Date(new Date(ref).getTime() + 365 * DAY_MS).toISOString(),
        daysUntilDue,
        shouldEmitFinding: urgency === "overdue" || urgency === "critical",
        shouldEmail: urgency === "due_soon" || urgency === "overdue" || urgency === "critical",
        emailTemplate: "renewal-reminder",
      },
      nowISO,
    )
  }
}

// ────────────────────────────────────────────────────────────────────────────
//   Rule 3 — DPIA review overdue (GDPR Art. 35)
// ────────────────────────────────────────────────────────────────────────────

function scanDpia(
  dpia: DpiaRecord[],
  nowISO: string,
  acc: PreventiveAction[],
): void {
  for (const d of dpia) {
    // dueAtISO (review programat) or fall back to (reviewedAtISO + 365d) sau updatedAt
    const ref = d.dueAtISO ?? d.reviewedAtISO ?? d.approvedAtISO ?? d.updatedAtISO
    let daysUntilDue: number
    let dueISO: string
    if (d.dueAtISO) {
      daysUntilDue = daysBetween(nowISO, d.dueAtISO)
      dueISO = d.dueAtISO
    } else {
      const refDays = daysBetween(ref, nowISO)
      daysUntilDue = 365 - refDays
      dueISO = new Date(new Date(ref).getTime() + 365 * DAY_MS).toISOString()
    }
    if (daysUntilDue > 60) continue
    const urgency = urgencyForDays(daysUntilDue)
    pushAction(
      acc,
      {
        idSuffix: d.id,
        type: "dpia_review_overdue",
        urgency,
        entityType: "dpia",
        entityId: d.id,
        entityLabel: d.title,
        recommendedAction:
          "DPIA depășită — revizuiește evaluarea de impact GDPR Art. 35.",
        dueDateISO: dueISO,
        daysUntilDue,
        shouldEmitFinding: urgency === "overdue",
        shouldEmail: urgency === "due_soon" || urgency === "overdue",
        emailTemplate: "renewal-reminder",
      },
      nowISO,
    )
  }
}

// ────────────────────────────────────────────────────────────────────────────
//   Rule 4 — Oversight review overdue (Art. 14)
// ────────────────────────────────────────────────────────────────────────────

function scanOversight(
  protocols: HumanOversightProtocol[],
  nowISO: string,
  acc: PreventiveAction[],
): void {
  for (const p of protocols) {
    if (!p.nextReviewISO) {
      // Approved without nextReviewISO → emit watch only after 180 days
      const refDays = daysBetween(p.updatedAtISO, nowISO)
      if (refDays > 180) {
        pushAction(
          acc,
          {
            idSuffix: p.id,
            type: "oversight_review_overdue",
            urgency: refDays > 240 ? "overdue" : "watch",
            entityType: "oversight",
            entityId: p.id,
            entityLabel: p.title,
            recommendedAction:
              "Protocol oversight uman Art. 14 fără nextReviewISO — programează revizuire periodică.",
            daysUntilDue: 180 - refDays,
            shouldEmitFinding: refDays > 240,
            shouldEmail: refDays > 180,
            emailTemplate: "renewal-reminder",
          },
          nowISO,
        )
      }
      continue
    }
    const daysUntilDue = daysBetween(nowISO, p.nextReviewISO)
    if (daysUntilDue > 30) continue
    const urgency = urgencyForDays(daysUntilDue)
    pushAction(
      acc,
      {
        idSuffix: p.id,
        type: "oversight_review_overdue",
        urgency,
        entityType: "oversight",
        entityId: p.id,
        entityLabel: p.title,
        recommendedAction:
          "Protocol oversight uman Art. 14 trebuie revizuit — capacitățile + responsabilii pot fi învechiți.",
        dueDateISO: p.nextReviewISO,
        daysUntilDue,
        shouldEmitFinding: urgency === "overdue",
        shouldEmail: urgency === "due_soon" || urgency === "overdue",
        emailTemplate: "renewal-reminder",
      },
      nowISO,
    )
  }
}

// ────────────────────────────────────────────────────────────────────────────
//   Rule 5 — Logging retention expiring (Art. 12 + Art. 26(6))
// ────────────────────────────────────────────────────────────────────────────

function scanLogging(
  configs: LoggingConfig[],
  nowISO: string,
  acc: PreventiveAction[],
): void {
  for (const c of configs) {
    const isApproachingOrExpired =
      c.retentionStatus === "approaching_expiry" || c.retentionStatus === "expired"
    if (isApproachingOrExpired) {
      const urgency: PreventiveActionUrgency =
        c.retentionStatus === "expired" ? "critical" : "due_soon"
      pushAction(
        acc,
        {
          idSuffix: c.id,
          type: "logging_retention_expiring",
          urgency,
          entityType: "logging",
          entityId: c.id,
          entityLabel: c.title,
          recommendedAction:
            "Retenția log-urilor AI (Art. 26(6)) ajunge la limită — confirmă procedura de prelungire sau arhivare.",
          dueDateISO: c.nextReviewISO,
          daysUntilDue: c.nextReviewISO ? daysBetween(nowISO, c.nextReviewISO) : undefined,
          shouldEmitFinding: true,
          shouldEmail: true,
          emailTemplate: "renewal-reminder",
          notes: `retentionStatus=${c.retentionStatus}`,
        },
        nowISO,
      )
    } else if (c.nextReviewISO) {
      const daysUntilDue = daysBetween(nowISO, c.nextReviewISO)
      if (daysUntilDue > 30) continue
      const urgency = urgencyForDays(daysUntilDue)
      pushAction(
        acc,
        {
          idSuffix: c.id,
          type: "logging_retention_expiring",
          urgency,
          entityType: "logging",
          entityId: c.id,
          entityLabel: c.title,
          recommendedAction:
            "Revizuiește config-ul de logging AI (Art. 12) — nextReview se apropie.",
          dueDateISO: c.nextReviewISO,
          daysUntilDue,
          shouldEmitFinding: urgency === "overdue",
          shouldEmail: urgency === "due_soon" || urgency === "overdue",
          emailTemplate: "renewal-reminder",
        },
        nowISO,
      )
    }
  }
}

// ────────────────────────────────────────────────────────────────────────────
//   Rule 6 — PMM review overdue (Art. 72)
// ────────────────────────────────────────────────────────────────────────────

function scanPmm(plans: PmmPlan[], nowISO: string, acc: PreventiveAction[]): void {
  for (const p of plans) {
    if (!p.nextReviewISO) continue
    const daysUntilDue = daysBetween(nowISO, p.nextReviewISO)
    if (daysUntilDue > 30) continue
    const urgency = urgencyForDays(daysUntilDue)
    pushAction(
      acc,
      {
        idSuffix: p.id,
        type: "pmm_review_overdue",
        urgency,
        entityType: "pmm",
        entityId: p.id,
        entityLabel: p.title,
        recommendedAction:
          "Plan PMM Art. 72 — revizuire periodică datorată conform ciclului declarat.",
        dueDateISO: p.nextReviewISO,
        daysUntilDue,
        shouldEmitFinding: urgency === "overdue",
        shouldEmail: urgency === "due_soon" || urgency === "overdue",
        emailTemplate: "renewal-reminder",
      },
      nowISO,
    )
  }
}

// ────────────────────────────────────────────────────────────────────────────
//   Rule 7 — Vendor DPA expiring (GDPR Art. 28)
// ────────────────────────────────────────────────────────────────────────────

function scanVendors(
  vendors: VendorRecord[],
  nowISO: string,
  acc: PreventiveAction[],
): void {
  for (const v of vendors) {
    // DPA expiry
    if (v.dpaExpiresAtISO) {
      const daysUntilDue = daysBetween(nowISO, v.dpaExpiresAtISO)
      if (daysUntilDue <= 60) {
        const urgency = urgencyForDays(daysUntilDue)
        pushAction(
          acc,
          {
            idSuffix: `${v.id}-dpa`,
            type: "vendor_dpa_expiring",
            urgency,
            entityType: "vendor",
            entityId: v.id,
            entityLabel: v.name,
            recommendedAction: `DPA pentru ${v.name} expiră — renegociază sau actualizează semnătura conform Art. 28 GDPR.`,
            dueDateISO: v.dpaExpiresAtISO,
            daysUntilDue,
            shouldEmitFinding: urgency === "overdue",
            // Sprint 22 fix — emit reminder also at "watch" (≤30 days). DPA
            // renewal at 10 days needs early action; "watch" is the right gate.
            shouldEmail:
              urgency === "watch" ||
              urgency === "due_soon" ||
              urgency === "overdue",
            emailTemplate: "vendor-dpa-expiring",
          },
          nowISO,
        )
      }
    }
    // Revalidation
    if (v.nextRevalidationISO) {
      const daysUntilDue = daysBetween(nowISO, v.nextRevalidationISO)
      if (daysUntilDue <= 30) {
        const urgency = urgencyForDays(daysUntilDue)
        pushAction(
          acc,
          {
            idSuffix: `${v.id}-reval`,
            type: "vendor_dpa_expiring",
            urgency,
            entityType: "vendor",
            entityId: v.id,
            entityLabel: v.name,
            recommendedAction: `Revalidare vendor ${v.name} datorată — review subprocesori + transfer + securitate.`,
            dueDateISO: v.nextRevalidationISO,
            daysUntilDue,
            shouldEmitFinding: urgency === "overdue",
            shouldEmail: urgency === "due_soon" || urgency === "overdue",
            emailTemplate: "renewal-reminder",
          },
          nowISO,
        )
      }
    }
  }
}

// ────────────────────────────────────────────────────────────────────────────
//   Rule 8 — QMS annual review due (Art. 17)
// ────────────────────────────────────────────────────────────────────────────

function scanQms(
  qms: QmsWorkspace | undefined,
  nowISO: string,
  acc: PreventiveAction[],
): void {
  if (!qms) return
  // Not approved at all
  if (!qms.approvedAtISO) {
    pushAction(
      acc,
      {
        idSuffix: qms.id,
        type: "qms_annual_review_due",
        urgency: "watch",
        entityType: "qms",
        entityId: qms.id,
        entityLabel: `QMS — ${qms.versionLabel}`,
        recommendedAction:
          "Sistemul QMS Art. 17 nu este aprobat — finalizează secțiunile + aprobă oficial.",
        shouldEmitFinding: false,
        shouldEmail: false,
      },
      nowISO,
    )
    return
  }
  const ref = qms.nextReviewISO
  if (!ref) {
    const refDays = daysBetween(qms.approvedAtISO, nowISO)
    if (refDays > 305) {
      const daysUntilDue = 365 - refDays
      pushAction(
        acc,
        {
          idSuffix: qms.id,
          type: "qms_annual_review_due",
          urgency: urgencyForDays(daysUntilDue),
          entityType: "qms",
          entityId: qms.id,
          entityLabel: `QMS — ${qms.versionLabel}`,
          recommendedAction:
            "Review anual QMS Art. 17 datorat — bump version + re-aprobare.",
          daysUntilDue,
          shouldEmitFinding: daysUntilDue < 0,
          shouldEmail: daysUntilDue <= 30,
          emailTemplate: "renewal-reminder",
        },
        nowISO,
      )
    }
    return
  }
  const daysUntilDue = daysBetween(nowISO, ref)
  if (daysUntilDue > 60) return
  pushAction(
    acc,
    {
      idSuffix: qms.id,
      type: "qms_annual_review_due",
      urgency: urgencyForDays(daysUntilDue),
      entityType: "qms",
      entityId: qms.id,
      entityLabel: `QMS — ${qms.versionLabel}`,
      recommendedAction:
        "Review anual QMS Art. 17 — bump version + re-aprobare.",
      dueDateISO: ref,
      daysUntilDue,
      shouldEmitFinding: daysUntilDue < 0,
      shouldEmail: daysUntilDue <= 30,
      emailTemplate: "renewal-reminder",
    },
    nowISO,
  )
}

// ────────────────────────────────────────────────────────────────────────────
//   Rule 9 — Transparency notice stale (Art. 50)
// ────────────────────────────────────────────────────────────────────────────

function scanTransparency(
  notices: TransparencyImplementation[],
  systems: AISystemRecord[],
  nowISO: string,
  acc: PreventiveAction[],
): void {
  const systemsById = new Map(systems.map((s) => [s.id, s]))
  for (const n of notices) {
    const sys = systemsById.get(n.systemId)
    if (!sys) continue
    // If system updated after notice implemented, mark stale (heuristic)
    const sysCreated = new Date(sys.createdAtISO).getTime()
    const noticeImpl = new Date(n.implementedAtISO).getTime()
    if (sysCreated > noticeImpl) {
      pushAction(
        acc,
        {
          idSuffix: n.id,
          type: "transparency_notice_stale",
          urgency: "watch",
          entityType: "transparency",
          entityId: n.id,
          entityLabel: `Notificare ${n.noticeType} — ${sys.name}`,
          recommendedAction:
            "Sistemul AI a fost actualizat după publicarea notificării Art. 50 — verifică dacă textul mai e corect.",
          shouldEmitFinding: false,
          shouldEmail: false,
        },
        nowISO,
      )
    }
  }
}

// ────────────────────────────────────────────────────────────────────────────
//   Rule 10 — DSAR response overdue (GDPR Art. 12(3))
// ────────────────────────────────────────────────────────────────────────────

function scanDsar(
  dsars: DsarRequest[],
  nowISO: string,
  acc: PreventiveAction[],
): void {
  for (const d of dsars) {
    if (d.status === "responded" || d.status === "refused") continue
    const deadline = d.extendedDeadlineISO ?? d.deadlineISO
    const daysUntilDue = daysBetween(nowISO, deadline)
    if (daysUntilDue > 14) continue
    const urgency: PreventiveActionUrgency =
      daysUntilDue < 0 ? "critical" : daysUntilDue <= 3 ? "due_soon" : "watch"
    pushAction(
      acc,
      {
        idSuffix: d.id,
        type: "dsar_response_overdue",
        urgency,
        entityType: "dsar",
        entityId: d.id,
        entityLabel: `DSAR ${d.requestType} — ${d.requesterName}`,
        recommendedAction:
          "Termenul de răspuns DSAR (GDPR Art. 12(3) - 30 zile) se apropie sau este depășit.",
        dueDateISO: deadline,
        daysUntilDue,
        shouldEmitFinding: urgency === "critical",
        shouldEmail: true,
        emailTemplate: "dsar-deadline-alert",
      },
      nowISO,
    )
  }
}

// ────────────────────────────────────────────────────────────────────────────
//   Rule 11 — Breach 72h expiring (GDPR Art. 33)
// ────────────────────────────────────────────────────────────────────────────

function scanBreaches(
  breaches: BreachRecord[],
  nowISO: string,
  acc: PreventiveAction[],
): void {
  for (const b of breaches) {
    if (
      b.status === "closed" ||
      b.status === "anspdcp_notified" ||
      b.status === "subjects_notified" ||
      b.status === "no_notification_required"
    )
      continue
    const daysUntilDue = daysBetween(nowISO, b.deadlineISO)
    if (daysUntilDue > 3) continue
    const urgency: PreventiveActionUrgency =
      daysUntilDue < 0 ? "critical" : daysUntilDue <= 1 ? "critical" : "due_soon"
    pushAction(
      acc,
      {
        idSuffix: b.id,
        type: "breach_72h_expiring",
        urgency,
        entityType: "breach",
        entityId: b.id,
        entityLabel: b.title,
        recommendedAction:
          "Termenul ANSPDCP de 72h (GDPR Art. 33) expiră — finalizează notificarea sau documentează decizia de non-notificare.",
        dueDateISO: b.deadlineISO,
        daysUntilDue,
        shouldEmitFinding: true,
        shouldEmail: true,
        emailTemplate: "breach-72h-alert",
      },
      nowISO,
    )
  }
}

// ────────────────────────────────────────────────────────────────────────────
//   Rule 12 — AI Incident deadline expiring (Art. 73(3))
// ────────────────────────────────────────────────────────────────────────────

function scanAIIncidents(
  incidents: AIIncident[],
  nowISO: string,
  acc: PreventiveAction[],
): void {
  for (const i of incidents) {
    if (i.status === "closed") continue
    const daysUntilDue = daysBetween(nowISO, i.reportingDeadlineISO)
    if (daysUntilDue > 5) continue
    const urgency: PreventiveActionUrgency =
      daysUntilDue < 0 ? "critical" : daysUntilDue <= 1 ? "critical" : "due_soon"
    pushAction(
      acc,
      {
        idSuffix: i.id,
        type: "ai_incident_deadline_expiring",
        urgency,
        entityType: "ai_incident",
        entityId: i.id,
        entityLabel: i.title,
        recommendedAction: `Incident AI Art. 73 — deadline ${i.reportingDeadlineDays}z către autoritatea de supraveghere.`,
        dueDateISO: i.reportingDeadlineISO,
        daysUntilDue,
        shouldEmitFinding: true,
        shouldEmail: true,
        emailTemplate: "renewal-reminder",
      },
      nowISO,
    )
  }
}

// ────────────────────────────────────────────────────────────────────────────
//   Rule 13 — Approval request expired
// ────────────────────────────────────────────────────────────────────────────

function scanApprovals(
  approvals: ApprovalRequest[],
  nowISO: string,
  acc: PreventiveAction[],
): void {
  for (const a of approvals) {
    if (a.status !== "pending") continue
    if (!a.expiresAtISO) continue
    const daysUntilDue = daysBetween(nowISO, a.expiresAtISO)
    if (daysUntilDue > 5) continue
    const urgency: PreventiveActionUrgency =
      daysUntilDue < 0 ? "overdue" : daysUntilDue <= 1 ? "due_soon" : "watch"
    pushAction(
      acc,
      {
        idSuffix: a.id,
        type: "approval_request_expired",
        urgency,
        entityType: "approval",
        entityId: a.id,
        entityLabel: a.title,
        recommendedAction:
          "Cerere de aprobare în coadă expiră — decide approve/reject sau acordă timp suplimentar.",
        dueDateISO: a.expiresAtISO,
        daysUntilDue,
        shouldEmitFinding: urgency === "overdue",
        shouldEmail: true,
        emailTemplate: "renewal-reminder",
      },
      nowISO,
    )
  }
}

// ────────────────────────────────────────────────────────────────────────────
//   Rule 14 — Legislative change unacknowledged
// ────────────────────────────────────────────────────────────────────────────

function scanLegislativeChanges(
  state: ComplianceState,
  nowISO: string,
  override: LegislativeChangeEvent[] | undefined,
  acc: PreventiveAction[],
): void {
  const log = override ?? LEGISLATIVE_CHANGE_LOG
  const acks = state.legislativeChangeAcknowledgments ?? []
  // Sprint 22 fix — baseline filter applies only to PRODUCTION log path
  // (override undefined). Test injection (`override !== undefined`) bypasses
  // baseline so test fixtures with old publishedAtISO still fire as designed.
  // Production: baseline defaults to nowISO at first scan so historical
  // legislation is treated as foundational, not as a backlog of overdue tasks.
  // Runner sets state.legislativeBaselineISO = nowISO after first scan, so
  // future scans only see changes published AFTER org adoption.
  const applyBaseline = override === undefined
  const baselineMs = applyBaseline
    ? new Date(state.legislativeBaselineISO ?? nowISO).getTime()
    : 0
  for (const change of log) {
    if (change.impact === "info_only" || change.impact === "low") continue
    if (isAcknowledged(acks, change.id)) continue
    if (
      applyBaseline &&
      new Date(change.publishedAtISO).getTime() < baselineMs
    )
      continue
    const daysSincePublished = daysBetween(change.publishedAtISO, nowISO)
    if (daysSincePublished < 7) continue
    const urgency: PreventiveActionUrgency =
      change.impact === "high"
        ? daysSincePublished > 60
          ? "overdue"
          : "due_soon"
        : daysSincePublished > 90
          ? "overdue"
          : "watch"
    pushAction(
      acc,
      {
        idSuffix: change.id,
        type: "legislative_change_unacknowledged",
        urgency,
        entityType: "legislative_change",
        entityId: change.id,
        entityLabel: change.title,
        recommendedAction: `Modificare legislativă ${change.regulation} nepreluată — examinează implicațiile asupra modulelor: ${change.affectedModules.join(", ")}.`,
        dueDateISO: change.effectiveFromISO,
        daysUntilDue: change.effectiveFromISO
          ? daysBetween(nowISO, change.effectiveFromISO)
          : undefined,
        shouldEmitFinding: urgency === "overdue",
        shouldEmail: urgency === "due_soon" || urgency === "overdue",
        emailTemplate: "renewal-reminder",
      },
      nowISO,
    )
  }
}

// ────────────────────────────────────────────────────────────────────────────
//   Rule 15 — Missing recent Audit Pack
// ────────────────────────────────────────────────────────────────────────────

function scanAuditPackFreshness(
  state: ComplianceState,
  nowISO: string,
  acc: PreventiveAction[],
): void {
  const aiSystems = state.aiSystems ?? []
  if (aiSystems.length === 0) return
  const packs = state.readinessPacks ?? []
  if (packs.length === 0) {
    pushAction(
      acc,
      {
        idSuffix: "no-pack",
        type: "missing_audit_pack_recent",
        urgency: "watch",
        entityType: "audit_pack",
        entityId: "audit-pack-org",
        entityLabel: "Audit Pack",
        recommendedAction:
          "Niciun Audit Pack nu a fost generat — generează un snapshot pentru clienți / auditori.",
        shouldEmitFinding: false,
        shouldEmail: false,
      },
      nowISO,
    )
    return
  }
  const newest = packs
    .map((p) => new Date(p.generatedAtISO).getTime())
    .reduce((a, b) => Math.max(a, b), 0)
  const days = Math.round((new Date(nowISO).getTime() - newest) / DAY_MS)
  if (days > 90) {
    pushAction(
      acc,
      {
        idSuffix: "stale-pack",
        type: "missing_audit_pack_recent",
        urgency: days > 180 ? "overdue" : "watch",
        entityType: "audit_pack",
        entityId: "audit-pack-org",
        entityLabel: "Audit Pack",
        recommendedAction: `Ultimul Audit Pack are ${days} zile — regenerează snapshot-ul cu starea curentă.`,
        daysUntilDue: 90 - days,
        shouldEmitFinding: days > 180,
        shouldEmail: days > 180,
        emailTemplate: "renewal-reminder",
      },
      nowISO,
    )
  }
}

// ────────────────────────────────────────────────────────────────────────────
//   Rule 16 — Lessons refresh due (QMS auto-aggregator)
// ────────────────────────────────────────────────────────────────────────────

function scanLessonsRefresh(
  state: ComplianceState,
  nowISO: string,
  acc: PreventiveAction[],
): void {
  const qms = state.qmsWorkspace
  if (!qms) return
  const days = daysBetween(qms.updatedAtISO, nowISO)
  if (days < 7) return
  // Heuristic: if AI incidents or PMM anomalies exist but lessons stale → refresh due
  const incidentCount = (state.aiIncidents ?? []).length
  const pmmAnomalyCount = (state.pmmPlans ?? []).reduce(
    (n, p) => n + (p.anomalies?.length ?? 0),
    0,
  )
  const autoLessons = qms.lessonsLearned.filter((l) => l.source !== "manual").length
  // Trigger if mai multe surse decat lessons
  if (incidentCount + pmmAnomalyCount > autoLessons + 3) {
    pushAction(
      acc,
      {
        idSuffix: qms.id,
        type: "lessons_refresh_due",
        urgency: "watch",
        entityType: "qms",
        entityId: qms.id,
        entityLabel: "QMS lessons learned",
        recommendedAction:
          "Aggregator-ul de lessons learned QMS nu a fost rulat recent — refresh recomandat din PMM + incidente.",
        shouldEmitFinding: false,
        shouldEmail: false,
      },
      nowISO,
    )
  }
}
