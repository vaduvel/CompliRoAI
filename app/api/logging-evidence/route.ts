/**
 * Sprint 018 — Logging Evidence list + create.
 *
 * GET  /api/logging-evidence
 *   ?status=draft&completeness=incomplete&retentionStatus=expired&linkedAISystemId=sys-1
 *   → { records, summary, schema }
 * POST /api/logging-evidence
 *   → creează LoggingConfig nou (rulează evaluator + emite findings)
 */
import { NextResponse } from "next/server"

import {
  LOGGING_EVENT_CATEGORIES_ORDERED,
  LOGGING_INTEGRITY_MECHANISM_OPTIONS,
  LOGGING_SCHEMA_V1,
  LOGGING_SEVERITY_LEVEL_OPTIONS,
  LOGGING_STORAGE_BACKEND_OPTIONS,
} from "@/lib/compliance/logging-schema"
import { getOrgContext } from "@/lib/server/org-context"
import {
  createConfig,
  readLoggingConfigs,
  summarizeLoggingConfigs,
  type CreateLoggingInput,
} from "@/lib/server/logging-evidence-store"
import type { ComplianceEventActorInput } from "@/lib/compliance/events"
import type {
  LoggingCompleteness,
  LoggingConfig,
  LoggingConfigStatus,
  LoggingEventCategory,
  LoggingRetentionStatus,
  LoggingSeverityLevel,
  LoggingStorageBackend,
} from "@/lib/compliance/types"

const STATUS_VALUES: LoggingConfigStatus[] = [
  "draft",
  "in_review",
  "active",
  "expired",
  "obsolete",
  "rejected",
]

const COMPLETENESS_VALUES: LoggingCompleteness[] = [
  "incomplete",
  "partial",
  "complete",
]

const RETENTION_VALUES: LoggingRetentionStatus[] = [
  "compliant",
  "approaching_expiry",
  "expired",
  "no_evidence",
]

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

function isSeverity(value: unknown): value is LoggingSeverityLevel {
  return (
    typeof value === "string" &&
    LOGGING_SEVERITY_LEVEL_OPTIONS.includes(value as LoggingSeverityLevel)
  )
}

function isStorageBackend(value: unknown): value is LoggingStorageBackend {
  return (
    typeof value === "string" &&
    LOGGING_STORAGE_BACKEND_OPTIONS.includes(value as LoggingStorageBackend)
  )
}

function isIntegrity(value: unknown): value is LoggingConfig["integrityMechanism"] {
  return (
    typeof value === "string" &&
    (LOGGING_INTEGRITY_MECHANISM_OPTIONS as readonly string[]).includes(value)
  )
}

export async function GET(request: Request) {
  try {
    const ctx = await getOrgContext()
    const { records } = await readLoggingConfigs(ctx.orgId)

    const url = new URL(request.url)
    const filterStatus = url.searchParams.get("status")
    const filterCompleteness = url.searchParams.get("completeness")
    const filterRetention = url.searchParams.get("retentionStatus")
    const filterSystem = url.searchParams.get("linkedAISystemId")

    let filtered = records
    if (filterStatus && STATUS_VALUES.includes(filterStatus as LoggingConfigStatus)) {
      filtered = filtered.filter((r) => r.status === filterStatus)
    }
    if (
      filterCompleteness &&
      COMPLETENESS_VALUES.includes(filterCompleteness as LoggingCompleteness)
    ) {
      filtered = filtered.filter((r) => r.completeness === filterCompleteness)
    }
    if (
      filterRetention &&
      RETENTION_VALUES.includes(filterRetention as LoggingRetentionStatus)
    ) {
      filtered = filtered.filter((r) => r.retentionStatus === filterRetention)
    }
    if (filterSystem) {
      filtered = filtered.filter((r) => r.linkedAISystemId === filterSystem)
    }

    return NextResponse.json({
      records: filtered,
      summary: summarizeLoggingConfigs(records),
      schema: LOGGING_SCHEMA_V1,
    })
  } catch {
    return NextResponse.json(
      { error: "Nu am putut citi registrul Logging Evidence." },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getOrgContext()
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>

    const title = typeof body.title === "string" ? body.title.trim() : ""
    if (!title) {
      return NextResponse.json(
        { error: "Titlul configurării de logging este obligatoriu." },
        { status: 400 },
      )
    }
    const linkedAISystemId =
      typeof body.linkedAISystemId === "string" ? body.linkedAISystemId.trim() : ""
    if (!linkedAISystemId) {
      return NextResponse.json(
        { error: "Sistemul AI legat (linkedAISystemId) este obligatoriu." },
        { status: 400 },
      )
    }
    if (!isSeverity(body.severityLevel)) {
      return NextResponse.json(
        { error: "severityLevel invalid (minimal/standard/enhanced/biometric_full)." },
        { status: 400 },
      )
    }
    if (!isStorageBackend(body.storageBackend)) {
      return NextResponse.json(
        { error: "storageBackend invalid." },
        { status: 400 },
      )
    }
    if (typeof body.storageLocation !== "string" || !body.storageLocation.trim()) {
      return NextResponse.json(
        { error: "storageLocation este obligatorie." },
        { status: 400 },
      )
    }
    if (typeof body.actualRetentionMonths !== "number" || body.actualRetentionMonths < 0) {
      return NextResponse.json(
        { error: "actualRetentionMonths trebuie să fie ≥ 0." },
        { status: 400 },
      )
    }
    if (!isIntegrity(body.integrityMechanism)) {
      return NextResponse.json(
        { error: "integrityMechanism invalid." },
        { status: 400 },
      )
    }

    const eventCategoriesLogged = Array.isArray(body.eventCategoriesLogged)
      ? (body.eventCategoriesLogged as unknown[]).filter((c): c is LoggingEventCategory =>
          LOGGING_EVENT_CATEGORIES_ORDERED.includes(c as LoggingEventCategory),
        )
      : []

    const input: CreateLoggingInput = {
      title,
      linkedAISystemId,
      severityLevel: body.severityLevel,
      eventCategoriesLogged,
      storageBackend: body.storageBackend,
      storageLocation: body.storageLocation,
      minRetentionMonths:
        typeof body.minRetentionMonths === "number" && body.minRetentionMonths >= 0
          ? body.minRetentionMonths
          : undefined,
      actualRetentionMonths: body.actualRetentionMonths,
      retentionPolicy:
        typeof body.retentionPolicy === "string" ? body.retentionPolicy : "",
      integrityMechanism: body.integrityMechanism,
      integrityMechanismDescription:
        typeof body.integrityMechanismDescription === "string"
          ? body.integrityMechanismDescription
          : "",
      accessRoleDescription:
        typeof body.accessRoleDescription === "string"
          ? body.accessRoleDescription
          : "",
      accessLogged: Boolean(body.accessLogged),
      biometricSpecific:
        body.biometricSpecific && typeof body.biometricSpecific === "object"
          ? (body.biometricSpecific as never)
          : undefined,
      evidenceChecklist: Array.isArray(body.evidenceChecklist)
        ? (body.evidenceChecklist as unknown[]).filter(
            (s): s is string => typeof s === "string",
          )
        : [],
      notes: typeof body.notes === "string" ? body.notes : undefined,
      nextReviewISO:
        typeof body.nextReviewISO === "string" ? body.nextReviewISO : undefined,
    }

    const record = await createConfig(
      ctx.orgId,
      input,
      actorFromContext(ctx),
      ctx.orgName ?? "Organizația",
    )
    const { summary } = await readLoggingConfigs(ctx.orgId)
    return NextResponse.json({ record, summary }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Eroare necunoscută"
    return NextResponse.json(
      { error: `Nu am putut crea configurarea de logging: ${message}` },
      { status: 500 },
    )
  }
}
