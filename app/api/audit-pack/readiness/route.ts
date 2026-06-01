import { NextResponse, type NextRequest } from "next/server"

import {
  buildDashboardExecutionState,
  buildGuidancePlanCoherence,
  exportReadinessLabel,
} from "@/lib/compliance/dashboard-coherence"
import { getOrgContext } from "@/lib/server/org-context"
import { readFreshStateForOrg } from "@/lib/server/store"
import { listUserMemberships } from "@/lib/server/tenancy"

async function authorizeTargetOrg(
  userId: string,
  ownOrgId: string,
  workspaceMode: string,
  clientOrgId: string | null,
) {
  if (!clientOrgId || clientOrgId === ownOrgId) {
    return { ok: true, targetOrgId: ownOrgId, targetOrgName: "" }
  }
  if (workspaceMode !== "cabinet") {
    return { ok: false, status: 403, error: "Doar utilizatorii în mod cabinet pot verifica readiness pentru clienți." }
  }
  const memberships = await listUserMemberships(userId)
  const membership = memberships.find(
    (item) => item.orgId === clientOrgId && item.status === "active" && item.role === "partner_manager",
  )
  if (!membership) {
    return { ok: false, status: 403, error: "Clientul nu este în portofoliul tău sau nu ai drepturi." }
  }
  return {
    ok: true,
    targetOrgId: clientOrgId,
    targetOrgName: "orgName" in membership && typeof membership.orgName === "string" ? membership.orgName : "",
  }
}

export async function GET(request: NextRequest) {
  let ctx
  try {
    ctx = await getOrgContext()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const url = new URL(request.url)
  const clientOrgId = url.searchParams.get("clientOrgId")
  const authorization = await authorizeTargetOrg(ctx.userId, ctx.orgId, ctx.workspaceMode, clientOrgId)

  if (!authorization.ok) {
    return NextResponse.json(
      { error: authorization.error },
      { status: authorization.status ?? 403 },
    )
  }

  const state = await readFreshStateForOrg(
    authorization.targetOrgId,
    authorization.targetOrgName || (authorization.targetOrgId === ctx.orgId ? ctx.orgName : ""),
  )
  const executionState = buildDashboardExecutionState(state, {
    isClientExecution: Boolean(clientOrgId && clientOrgId !== ctx.orgId),
  })
  const snapshot = executionState.snapshot

  return NextResponse.json({
    targetOrgId: authorization.targetOrgId,
    snapshot,
    exportReadinessLabel: exportReadinessLabel(snapshot.exportReadinessStatus),
    exportBlockers: executionState.exportBlockers,
    auditPackCta: executionState.auditPackCta,
    guidanceCoherence: buildGuidancePlanCoherence(executionState),
  })
}
