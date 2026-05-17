/**
 * Sprint 009 — PII Discovery scan list + create.
 *
 * GET  /api/pii-discovery     -> { detections, summary }
 * POST /api/pii-discovery     -> scan text + persist + auto-finding daca
 *                                high-confidence.
 */
import { NextResponse } from "next/server"

import { getOrgContext } from "@/lib/server/org-context"
import {
  createPIIDetection,
  readPIIDetections,
} from "@/lib/server/pii-discovery-store"
import type { ComplianceEventActorInput } from "@/lib/compliance/events"

const MAX_TEXT_BYTES = 5 * 1024 * 1024 // 5MB

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

export async function GET() {
  try {
    const ctx = await getOrgContext()
    const { detections, summary } = await readPIIDetections(ctx.orgId)
    return NextResponse.json({ detections, summary })
  } catch {
    return NextResponse.json(
      { error: "Nu am putut citi scan-urile PII." },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getOrgContext()
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>

    const sourceLabel = typeof body.sourceLabel === "string" ? body.sourceLabel.trim() : ""
    const text = typeof body.text === "string" ? body.text : ""
    if (!text) {
      return NextResponse.json({ error: "text este obligatoriu." }, { status: 400 })
    }
    if (Buffer.byteLength(text, "utf8") > MAX_TEXT_BYTES) {
      return NextResponse.json({ error: "text peste 5MB." }, { status: 413 })
    }

    const { detection, linkedFindingId } = await createPIIDetection(
      ctx.orgId,
      {
        sourceLabel: sourceLabel || "Document fara label",
        text,
        notes: typeof body.notes === "string" ? body.notes : undefined,
      },
      actorFromContext(ctx),
    )
    const { summary } = await readPIIDetections(ctx.orgId)
    return NextResponse.json({ detection, linkedFindingId, summary }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Nu am putut crea scan-ul." },
      { status: 500 },
    )
  }
}
