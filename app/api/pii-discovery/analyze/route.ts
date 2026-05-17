/**
 * Sprint 009 — PII analyze (no persist).
 *
 * POST /api/pii-discovery/analyze
 *   body: { sourceLabel?: string, text: string }
 *   -> PIIDiscoveryResult (NU persistat). Folosit pentru preview UI inainte
 *      de "Save scan".
 */
import { NextResponse } from "next/server"

import { getOrgContext } from "@/lib/server/org-context"
import { analyzePIIWithoutSaving } from "@/lib/server/pii-discovery-store"

const MAX_TEXT_BYTES = 5 * 1024 * 1024 // 5MB

export async function POST(request: Request) {
  try {
    // Auth required even for analyze (rate limit per org via session)
    await getOrgContext()
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>

    const sourceLabel = typeof body.sourceLabel === "string" ? body.sourceLabel.trim() : ""
    const text = typeof body.text === "string" ? body.text : ""
    if (!text) {
      return NextResponse.json({ error: "text este obligatoriu." }, { status: 400 })
    }
    if (Buffer.byteLength(text, "utf8") > MAX_TEXT_BYTES) {
      return NextResponse.json({ error: "text peste 5MB." }, { status: 413 })
    }

    const result = analyzePIIWithoutSaving({
      sourceLabel: sourceLabel || "Document fara label",
      text,
    })
    return NextResponse.json({ result })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Nu am putut analiza textul." },
      { status: 500 },
    )
  }
}
