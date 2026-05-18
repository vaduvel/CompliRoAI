/**
 * Sprint 021 — QMS lessons learned.
 *
 * GET  /api/qms/lessons              → { lessons }
 * POST /api/qms/lessons              → recordLesson (manual)
 * POST /api/qms/lessons?refresh=auto → refreshAutoLessons (din incidents +
 *                                       PMM anomalies + findings)
 */
import { NextResponse } from "next/server"

import { getOrgContext } from "@/lib/server/org-context"
import {
  readQmsWorkspace,
  recordLesson,
  refreshAutoLessons,
} from "@/lib/server/qms-store"
import type { ComplianceEventActorInput } from "@/lib/compliance/events"

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

function sanitizeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return (value as unknown[])
    .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
    .map((s) => s.trim())
}

export async function GET() {
  try {
    const ctx = await getOrgContext()
    const { workspace } = await readQmsWorkspace(ctx.orgId)
    return NextResponse.json({
      lessons: workspace?.lessonsLearned ?? [],
    })
  } catch {
    return NextResponse.json(
      { error: "Nu am putut citi lecțiile QMS." },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getOrgContext()
    const url = new URL(request.url)
    if (url.searchParams.get("refresh") === "auto") {
      const workspace = await refreshAutoLessons(
        ctx.orgId,
        actorFromContext(ctx),
      )
      return NextResponse.json({
        workspace,
        lessons: workspace.lessonsLearned,
        refreshed: true,
      })
    }
    const body = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >
    const title = typeof body.title === "string" ? body.title.trim() : ""
    if (!title) {
      return NextResponse.json(
        { error: "title obligatoriu." },
        { status: 400 },
      )
    }
    const rootCauseSummary =
      typeof body.rootCauseSummary === "string"
        ? body.rootCauseSummary.trim()
        : ""
    if (!rootCauseSummary) {
      return NextResponse.json(
        { error: "rootCauseSummary obligatoriu." },
        { status: 400 },
      )
    }
    const workspace = await recordLesson(
      ctx.orgId,
      {
        title,
        rootCauseSummary,
        preventiveActionsTaken: sanitizeStringList(body.preventiveActionsTaken),
        resultingPolicyChange:
          typeof body.resultingPolicyChange === "string"
            ? body.resultingPolicyChange
            : undefined,
        resultingProcessChange:
          typeof body.resultingProcessChange === "string"
            ? body.resultingProcessChange
            : undefined,
        applicableToSystems: sanitizeStringList(body.applicableToSystems),
        notes: typeof body.notes === "string" ? body.notes : undefined,
        sourceEntityId:
          typeof body.sourceEntityId === "string"
            ? body.sourceEntityId
            : undefined,
        recordedByEmail:
          typeof body.recordedByEmail === "string"
            ? body.recordedByEmail
            : undefined,
      },
      actorFromContext(ctx),
    )
    return NextResponse.json({ workspace, lessons: workspace.lessonsLearned })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Eroare necunoscută"
    return NextResponse.json(
      { error: `Nu am putut înregistra lecția: ${message}` },
      { status: 400 },
    )
  }
}
