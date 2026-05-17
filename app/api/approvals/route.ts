/**
 * Sprint 013 — Approval Queue API
 * GET list (cu filter ?status= ?entityType= ?limit=)
 * POST create cerere nouă (din UI cabinet sau via internă din alte module)
 */
import { NextResponse } from "next/server"

import { getOrgContext } from "@/lib/server/org-context"
import {
  createApprovalRequest,
  listApprovalRequests,
  summarizeApprovals,
  type CreateApprovalRequestInput,
} from "@/lib/server/approval-queue-store"
import type {
  ApprovalEntityType,
  ApprovalStatus,
  ApprovalRequesterRole,
} from "@/lib/compliance/types"
import type { ComplianceEventActorInput } from "@/lib/compliance/events"

const VALID_ENTITY_TYPES: ApprovalEntityType[] = [
  "finding_status_change",
  "dpia_screening",
  "breach_anspdcp_decision",
  "breach_subject_skip",
  "vendor_approved",
  "vendor_rejected",
  "ai_system_classification",
  "transparency_notice_published",
  "readiness_pack_exported",
  "audit_pack_exported",
]
const VALID_STATUSES: ApprovalStatus[] = ["pending", "approved", "rejected", "withdrawn"]
const VALID_ROLES: ApprovalRequesterRole[] = ["client", "consultant"]

function actorFrom(ctx: Awaited<ReturnType<typeof getOrgContext>>): ComplianceEventActorInput {
  return {
    id: ctx.userId,
    label: ctx.email,
    role: "compliance",
    source: "session",
  }
}

function parseStatusList(value: string | null): ApprovalStatus[] | undefined {
  if (!value) return undefined
  const list = value
    .split(",")
    .map((s) => s.trim())
    .filter((s): s is ApprovalStatus => (VALID_STATUSES as string[]).includes(s))
  return list.length ? list : undefined
}

function parseEntityList(value: string | null): ApprovalEntityType[] | undefined {
  if (!value) return undefined
  const list = value
    .split(",")
    .map((s) => s.trim())
    .filter((s): s is ApprovalEntityType => (VALID_ENTITY_TYPES as string[]).includes(s))
  return list.length ? list : undefined
}

export async function GET(req: Request) {
  try {
    const ctx = await getOrgContext()
    const url = new URL(req.url)
    const status = parseStatusList(url.searchParams.get("status"))
    const entityType = parseEntityList(url.searchParams.get("entityType"))
    const limitRaw = url.searchParams.get("limit")
    const limit = limitRaw ? Math.min(Math.max(parseInt(limitRaw, 10) || 0, 0), 200) : undefined

    const requests = await listApprovalRequests(ctx.orgId, { status, entityType, limit })
    const counts = summarizeApprovals(await listApprovalRequests(ctx.orgId))
    return NextResponse.json({ requests, counts })
  } catch (err) {
    console.error("[approvals.GET]", err)
    return NextResponse.json(
      { error: "Nu am putut încărca lista de aprobări." },
      { status: 500 },
    )
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await getOrgContext()
    const body = (await req.json()) as Partial<CreateApprovalRequestInput>

    if (!body.entityType || !(VALID_ENTITY_TYPES as string[]).includes(body.entityType)) {
      return NextResponse.json(
        { error: "entityType invalid sau lipsă." },
        { status: 400 },
      )
    }
    if (!body.entityId || typeof body.entityId !== "string") {
      return NextResponse.json({ error: "entityId obligatoriu." }, { status: 400 })
    }
    if (!body.title || typeof body.title !== "string" || !body.title.trim()) {
      return NextResponse.json({ error: "Titlu obligatoriu." }, { status: 400 })
    }
    if (body.requestedByRole && !(VALID_ROLES as string[]).includes(body.requestedByRole)) {
      return NextResponse.json({ error: "requestedByRole invalid." }, { status: 400 })
    }

    const requestedByEmail =
      typeof body.requestedByEmail === "string" && body.requestedByEmail.trim()
        ? body.requestedByEmail.trim()
        : ctx.email

    const created = await createApprovalRequest(
      ctx.orgId,
      {
        entityType: body.entityType,
        entityId: body.entityId,
        title: body.title.trim(),
        description: typeof body.description === "string" ? body.description : "",
        proposedChange:
          (body.proposedChange && typeof body.proposedChange === "object"
            ? body.proposedChange
            : {}) as Record<string, unknown>,
        requestedByEmail,
        requestedByRole: body.requestedByRole ?? "client",
        expiresInDays: typeof body.expiresInDays === "number" ? body.expiresInDays : undefined,
        linkedShareTokenId:
          typeof body.linkedShareTokenId === "string" ? body.linkedShareTokenId : undefined,
        notes: typeof body.notes === "string" ? body.notes : undefined,
      },
      actorFrom(ctx),
    )
    return NextResponse.json({ request: created }, { status: 201 })
  } catch (err) {
    console.error("[approvals.POST]", err)
    return NextResponse.json(
      { error: "Nu am putut crea cererea de aprobare." },
      { status: 500 },
    )
  }
}
