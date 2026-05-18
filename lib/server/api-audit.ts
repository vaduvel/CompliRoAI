// Sprint 023 — API call audit logger.
//
// Every /api/v1/* call goes through `logApiCall`. We:
//   1. Append an ApiCallLog entry to `state.apiCallLogs` (cap 1000, newest-first).
//   2. Emit a ComplianceEvent on the hash chain (tamper-evident).
//   3. When a gate verdict != "pass" is reached on /api/v1/deployment, the
//      caller passes `emitFinding=true` and we create a finding via the
//      existing findings-store path so it surfaces in /dashboard/de-rezolvat.
//
// IMPORTANT redaction guarantee: requestSummary / responseSummary store only
// non-sensitive fields (purpose, sector, verdict). They NEVER include
// systemName, userGroups, dataCategories, modelProvider, or any free-text
// the developer supplied.

import {
  appendComplianceEvents,
  createComplianceEvent,
  type ComplianceEventActorInput,
} from "@/lib/compliance/events"
import { createFinding } from "@/lib/server/findings-store"
import { mutateFreshStateForOrg } from "@/lib/server/store"
import type {
  ApiCallLog,
  ComplianceGateResponse,
  ComplianceGateVerdict,
} from "@/lib/compliance/types"

const MAX_LOG_ENTRIES = 1000

export type LogApiCallInput = {
  orgId: string
  apiKeyId?: string
  endpoint: string
  method: string
  statusCode: number
  durationMs: number
  ip?: string
  userAgent?: string
  /** Already-redacted summary string (see summariseClassifyInput). */
  requestSummary: string
  /** Short, non-PII status string (verdict + risk class). */
  responseSummary: string
  errorCode?: string
  /** Defaults to `new Date().toISOString()`. */
  nowISO?: string
  actor: ComplianceEventActorInput
}

function uid(): string {
  return `apicall-${Math.random().toString(36).slice(2, 10)}`
}

function eventTypeForEndpoint(endpoint: string, statusCode: number): string {
  if (statusCode >= 400) return "api.call_error"
  if (endpoint.endsWith("/classify")) return "api.classify_called"
  if (endpoint.endsWith("/gate")) return "api.gate_evaluated"
  if (endpoint.endsWith("/deployment")) return "api.deployment_registered"
  if (endpoint.endsWith("/keys")) return "api.keys_accessed"
  return "api.call"
}

export async function logApiCall(input: LogApiCallInput): Promise<ApiCallLog> {
  const now = input.nowISO ?? new Date().toISOString()
  const entry: ApiCallLog = {
    id: uid(),
    orgId: input.orgId,
    apiKeyId: input.apiKeyId,
    endpoint: input.endpoint,
    method: input.method,
    statusCode: input.statusCode,
    durationMs: input.durationMs,
    ip: input.ip,
    userAgent: input.userAgent,
    requestSummary: input.requestSummary,
    responseSummary: input.responseSummary,
    errorCode: input.errorCode,
    createdAtISO: now,
  }

  await mutateFreshStateForOrg(input.orgId, (state) => {
    const existing = state.apiCallLogs ?? []
    const nextLogs = [entry, ...existing].slice(0, MAX_LOG_ENTRIES)

    const event = createComplianceEvent(
      {
        type: eventTypeForEndpoint(entry.endpoint, entry.statusCode),
        entityType: "system",
        entityId: entry.id,
        message: `${entry.method} ${entry.endpoint} → ${entry.statusCode} (${entry.durationMs}ms)`,
        createdAtISO: now,
        metadata: {
          endpoint: entry.endpoint,
          status: entry.statusCode,
          summary: entry.responseSummary,
          ...(entry.apiKeyId ? { apiKeyId: entry.apiKeyId } : {}),
        },
      },
      input.actor,
    )

    return {
      ...state,
      apiCallLogs: nextLogs,
      events: appendComplianceEvents(state, [event]),
    }
  })

  return entry
}

/**
 * Convenience: short summary of a gate response for the responseSummary
 * column. Avoids dumping full obligations array into the log.
 */
export function summariseGateResponse(gate: ComplianceGateResponse): string {
  return [
    `verdict=${gate.verdict}`,
    `risk=${gate.riskClass}`,
    `role=${gate.aiActRole}`,
    `reasons=${gate.reasons.length}`,
  ].join(" ")
}

/**
 * When /api/v1/deployment receives a non-pass verdict, emit a finding so the
 * cockpit / de-rezolvat surface picks it up. Findings link back to the gate
 * via the description.
 */
export async function emitDeploymentFinding(input: {
  orgId: string
  systemName: string
  deploymentRef: string
  gate: ComplianceGateResponse
  actor: ComplianceEventActorInput
}): Promise<string | null> {
  if (input.gate.verdict === "pass") return null
  const severity: "critical" | "high" | "medium" =
    input.gate.verdict === "blocked" ? "critical" : "high"
  const title =
    input.gate.verdict === "blocked"
      ? `Deployment blocat — ${input.systemName} (${input.deploymentRef})`
      : `Deployment necesită review — ${input.systemName} (${input.deploymentRef})`

  const detailLines: string[] = [
    `Sistemul **${input.systemName}** a fost trimis via API v1 (deployment ref: \`${input.deploymentRef}\`).`,
    `Verdict Compliance Gate: **${verdictLabelRO(input.gate.verdict)}** (risk: ${input.gate.riskClass}, rol: ${input.gate.aiActRole}).`,
    "",
    "Motive:",
    ...input.gate.reasons.map(
      (r) => `- (${r.articleRef}) ${r.message} → ${r.nextAction}`,
    ),
  ]
  if (input.gate.missingEvidence.length > 0) {
    detailLines.push("", "Dovezi lipsă:")
    for (const ev of input.gate.missingEvidence) detailLines.push(`- ${ev}`)
  }

  const finding = await createFinding(
    input.orgId,
    {
      title,
      detail: detailLines.join("\n"),
      category: "EU_AI_ACT",
      severity,
      legalReference: input.gate.reasons[0]?.articleRef ?? "EU AI Act",
      remediationHint:
        input.gate.nextActions[0] ??
        "Re-rulează gate-ul după ce dovezile sunt completate.",
      impactSummary:
        input.gate.verdict === "blocked"
          ? "Deploymentul nu poate continua până la rezolvarea motivului de blocare."
          : "Deploymentul rămâne în review până la atașarea dovezilor.",
    },
    input.actor,
  )
  return finding.id
}

function verdictLabelRO(v: ComplianceGateVerdict): string {
  switch (v) {
    case "pass":
      return "Pass"
    case "review_required":
      return "Review necesar"
    case "blocked":
      return "Blocat"
  }
}
