/**
 * Sprint 019 — PMM Plans list + create.
 *
 * GET  /api/pmm
 *   ?status=draft&completeness=incomplete&freshnessStatus=overdue&linkedAISystemId=sys-1
 *   → { records, summary, schema }
 * POST /api/pmm
 *   → creează PmmPlan nou (rulează evaluator + emite findings)
 */
import { NextResponse } from "next/server"

import {
  PMM_DATA_COLLECTION_FREQUENCY_OPTIONS,
  PMM_DATA_COLLECTION_METHOD_OPTIONS,
  PMM_REVIEW_CYCLE_OPTIONS,
  PMM_SCHEMA_V1,
} from "@/lib/compliance/pmm-schema"
import { getOrgContext } from "@/lib/server/org-context"
import {
  createPlan,
  readPmmPlans,
  summarizePmmPlans,
  type CreatePmmInput,
} from "@/lib/server/pmm-store"
import type { ComplianceEventActorInput } from "@/lib/compliance/events"
import type {
  PmmCompleteness,
  PmmDataCollectionFrequency,
  PmmDataCollectionMethod,
  PmmFreshnessStatus,
  PmmPlanStatus,
  PmmReviewCycle,
} from "@/lib/compliance/types"

const STATUS_VALUES: PmmPlanStatus[] = [
  "draft",
  "in_review",
  "approved",
  "active",
  "obsolete",
  "rejected",
]

const COMPLETENESS_VALUES: PmmCompleteness[] = [
  "incomplete",
  "partial",
  "complete",
]

const FRESHNESS_VALUES: PmmFreshnessStatus[] = [
  "fresh",
  "due_soon",
  "overdue",
  "no_reviews",
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

function isReviewCycle(value: unknown): value is PmmReviewCycle {
  return (
    typeof value === "string" &&
    PMM_REVIEW_CYCLE_OPTIONS.includes(value as PmmReviewCycle)
  )
}

function isFrequency(value: unknown): value is PmmDataCollectionFrequency {
  return (
    typeof value === "string" &&
    PMM_DATA_COLLECTION_FREQUENCY_OPTIONS.includes(value as PmmDataCollectionFrequency)
  )
}

function sanitizeMethods(value: unknown): PmmDataCollectionMethod[] {
  if (!Array.isArray(value)) return []
  return (value as unknown[]).filter((m): m is PmmDataCollectionMethod =>
    PMM_DATA_COLLECTION_METHOD_OPTIONS.includes(m as PmmDataCollectionMethod),
  )
}

function sanitizeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return (value as unknown[])
    .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
    .map((s) => s.trim())
}

export async function GET(request: Request) {
  try {
    const ctx = await getOrgContext()
    const { records } = await readPmmPlans(ctx.orgId)

    const url = new URL(request.url)
    const filterStatus = url.searchParams.get("status")
    const filterCompleteness = url.searchParams.get("completeness")
    const filterFreshness = url.searchParams.get("freshnessStatus")
    const filterSystem = url.searchParams.get("linkedAISystemId")

    let filtered = records
    if (filterStatus && STATUS_VALUES.includes(filterStatus as PmmPlanStatus)) {
      filtered = filtered.filter((r) => r.status === filterStatus)
    }
    if (
      filterCompleteness &&
      COMPLETENESS_VALUES.includes(filterCompleteness as PmmCompleteness)
    ) {
      filtered = filtered.filter((r) => r.completeness === filterCompleteness)
    }
    if (
      filterFreshness &&
      FRESHNESS_VALUES.includes(filterFreshness as PmmFreshnessStatus)
    ) {
      filtered = filtered.filter((r) => r.freshnessStatus === filterFreshness)
    }
    if (filterSystem) {
      filtered = filtered.filter((r) => r.linkedAISystemId === filterSystem)
    }

    return NextResponse.json({
      records: filtered,
      summary: summarizePmmPlans(records),
      schema: PMM_SCHEMA_V1,
    })
  } catch {
    return NextResponse.json(
      { error: "Nu am putut citi registrul PMM Plans." },
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
        { error: "Titlul planului PMM este obligatoriu." },
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
    if (!isReviewCycle(body.reviewCycle)) {
      return NextResponse.json(
        { error: "reviewCycle invalid (monthly/quarterly/biannual/annual)." },
        { status: 400 },
      )
    }
    if (!isFrequency(body.dataCollectionFrequency)) {
      return NextResponse.json(
        { error: "dataCollectionFrequency invalid (real_time/daily/weekly/monthly/quarterly)." },
        { status: 400 },
      )
    }
    const dataCollectionDescription =
      typeof body.dataCollectionDescription === "string"
        ? body.dataCollectionDescription
        : ""
    if (!dataCollectionDescription.trim()) {
      return NextResponse.json(
        { error: "dataCollectionDescription este obligatorie (Art. 72(3)(a))." },
        { status: 400 },
      )
    }

    const input: CreatePmmInput = {
      title,
      linkedAISystemId,
      dataCollectionMethods: sanitizeMethods(body.dataCollectionMethods),
      dataCollectionFrequency: body.dataCollectionFrequency,
      dataCollectionDescription,
      complianceEvaluationMethods: sanitizeStringList(body.complianceEvaluationMethods),
      complianceMetricsTracked: sanitizeStringList(body.complianceMetricsTracked),
      correctiveActionProcess:
        typeof body.correctiveActionProcess === "string"
          ? body.correctiveActionProcess
          : "",
      preventiveActionProcess:
        typeof body.preventiveActionProcess === "string"
          ? body.preventiveActionProcess
          : "",
      reviewCycle: body.reviewCycle,
      notes: typeof body.notes === "string" ? body.notes : undefined,
    }

    const record = await createPlan(
      ctx.orgId,
      input,
      actorFromContext(ctx),
      ctx.orgName ?? "Organizația",
    )
    const { summary } = await readPmmPlans(ctx.orgId)
    return NextResponse.json({ record, summary }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Eroare necunoscută"
    return NextResponse.json(
      { error: `Nu am putut crea planul PMM: ${message}` },
      { status: 500 },
    )
  }
}
