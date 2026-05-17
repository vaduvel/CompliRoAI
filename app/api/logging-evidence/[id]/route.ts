/**
 * Sprint 018 — Logging Config single record: GET / PATCH / DELETE.
 */
import { NextResponse } from "next/server"

import {
  LOGGING_EVENT_CATEGORIES_ORDERED,
  LOGGING_INTEGRITY_MECHANISM_OPTIONS,
  LOGGING_SEVERITY_LEVEL_OPTIONS,
  LOGGING_STORAGE_BACKEND_OPTIONS,
} from "@/lib/compliance/logging-schema"
import { getOrgContext } from "@/lib/server/org-context"
import {
  deleteConfig,
  getLoggingConfigById,
  isLoggingConfigStatus,
  updateConfig,
  type UpdateLoggingPatch,
} from "@/lib/server/logging-evidence-store"
import type { ComplianceEventActorInput } from "@/lib/compliance/events"
import type {
  LoggingConfig,
  LoggingEventCategory,
  LoggingSeverityLevel,
  LoggingStorageBackend,
} from "@/lib/compliance/types"

function actorFromContext(ctx: {
  userId: string
  email: string
}): ComplianceEventActorInput {
  return {
    id: ctx.userId,
    label: ctx.email,
    role: "compliance",
    source: "session",
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await getOrgContext()
    const { id } = await params
    const record = await getLoggingConfigById(ctx.orgId, id)
    if (!record) {
      return NextResponse.json({ error: "Configurare logging inexistentă." }, { status: 404 })
    }
    return NextResponse.json({ record })
  } catch {
    return NextResponse.json(
      { error: "Nu am putut citi configurarea de logging." },
      { status: 500 },
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await getOrgContext()
    const { id } = await params
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>

    const patch: UpdateLoggingPatch = {}
    if (typeof body.title === "string") patch.title = body.title
    if (
      typeof body.severityLevel === "string" &&
      LOGGING_SEVERITY_LEVEL_OPTIONS.includes(body.severityLevel as LoggingSeverityLevel)
    ) {
      patch.severityLevel = body.severityLevel as LoggingSeverityLevel
    }
    if (Array.isArray(body.eventCategoriesLogged)) {
      patch.eventCategoriesLogged = (body.eventCategoriesLogged as unknown[]).filter(
        (c): c is LoggingEventCategory =>
          LOGGING_EVENT_CATEGORIES_ORDERED.includes(c as LoggingEventCategory),
      )
    }
    if (
      typeof body.storageBackend === "string" &&
      LOGGING_STORAGE_BACKEND_OPTIONS.includes(body.storageBackend as LoggingStorageBackend)
    ) {
      patch.storageBackend = body.storageBackend as LoggingStorageBackend
    }
    if (typeof body.storageLocation === "string") patch.storageLocation = body.storageLocation
    if (typeof body.minRetentionMonths === "number" && body.minRetentionMonths >= 0) {
      patch.minRetentionMonths = body.minRetentionMonths
    }
    if (typeof body.actualRetentionMonths === "number" && body.actualRetentionMonths >= 0) {
      patch.actualRetentionMonths = body.actualRetentionMonths
    }
    if (typeof body.retentionPolicy === "string") patch.retentionPolicy = body.retentionPolicy
    if (
      typeof body.integrityMechanism === "string" &&
      (LOGGING_INTEGRITY_MECHANISM_OPTIONS as readonly string[]).includes(
        body.integrityMechanism,
      )
    ) {
      patch.integrityMechanism = body.integrityMechanism as LoggingConfig["integrityMechanism"]
    }
    if (typeof body.integrityMechanismDescription === "string") {
      patch.integrityMechanismDescription = body.integrityMechanismDescription
    }
    if (typeof body.accessRoleDescription === "string") {
      patch.accessRoleDescription = body.accessRoleDescription
    }
    if (typeof body.accessLogged === "boolean") {
      patch.accessLogged = body.accessLogged
    }
    if (body.biometricSpecific && typeof body.biometricSpecific === "object") {
      patch.biometricSpecific = body.biometricSpecific as never
    }
    if (Array.isArray(body.evidenceChecklist)) {
      patch.evidenceChecklist = (body.evidenceChecklist as unknown[]).filter(
        (s): s is string => typeof s === "string",
      )
    }
    if (typeof body.notes === "string") patch.notes = body.notes
    if (typeof body.nextReviewISO === "string") patch.nextReviewISO = body.nextReviewISO
    if (typeof body.status === "string" && isLoggingConfigStatus(body.status)) {
      patch.status = body.status
    }

    const updated = await updateConfig(
      ctx.orgId,
      id,
      patch,
      actorFromContext(ctx),
      ctx.orgName ?? "Organizația",
    )
    if (!updated) {
      return NextResponse.json({ error: "Configurare logging inexistentă." }, { status: 404 })
    }
    return NextResponse.json({ record: updated })
  } catch {
    return NextResponse.json(
      { error: "Nu am putut actualiza configurarea de logging." },
      { status: 500 },
    )
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await getOrgContext()
    const { id } = await params
    const removed = await deleteConfig(ctx.orgId, id, actorFromContext(ctx))
    if (!removed) {
      return NextResponse.json({ error: "Configurare logging inexistentă." }, { status: 404 })
    }
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json(
      { error: "Nu am putut șterge configurarea de logging." },
      { status: 500 },
    )
  }
}
