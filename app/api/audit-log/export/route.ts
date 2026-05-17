/**
 * Sprint 011 — GET /api/audit-log/export
 *
 * Streams the full filtered ledger as a downloadable file in one of three
 * formats: md (default) / json / csv.
 *
 * Query params: same filter set as /api/audit-log + `format` (md|json|csv).
 * No pagination — exports the entire filtered set.
 *
 * Filename pattern:
 *   compliroai-audit-log-{orgSlug}-{YYYY-MM-DD}.{ext}
 */

import { NextResponse } from "next/server"

import { getOrgContext } from "@/lib/server/org-context"
import { readState } from "@/lib/server/store"
import {
  formatEventsAsCSV,
  formatEventsAsJSON,
  formatEventsAsMarkdown,
} from "@/lib/compliance/audit-log-formatters"
import type {
  ComplianceEvent,
  ComplianceEventEntityType,
} from "@/lib/compliance/types"

const VALID_ENTITY_TYPES: ComplianceEventEntityType[] = [
  "scan",
  "finding",
  "alert",
  "task",
  "integration",
  "system",
  "drift",
]

type ExportFormat = "md" | "json" | "csv"

function parseFormat(value: string | null): ExportFormat {
  if (value === "json") return "json"
  if (value === "csv") return "csv"
  return "md"
}

function applyFilters(
  events: ComplianceEvent[],
  params: URLSearchParams,
): ComplianceEvent[] {
  const from = params.get("from")?.trim() || null
  const to = params.get("to")?.trim() || null
  const entityType = params.get("entityType")?.trim() || null
  const actorEmail = params.get("actorEmail")?.trim().toLowerCase() || null
  const eventType = params.get("eventType")?.trim() || null
  const search = params.get("search")?.trim().toLowerCase() || null

  let filtered = events.slice()
  if (from) filtered = filtered.filter((e) => e.createdAtISO >= from)
  if (to) filtered = filtered.filter((e) => e.createdAtISO <= to)
  if (entityType && VALID_ENTITY_TYPES.includes(entityType as ComplianceEventEntityType)) {
    filtered = filtered.filter((e) => e.entityType === entityType)
  }
  if (actorEmail) {
    filtered = filtered.filter(
      (e) => (e.actorLabel ?? "").toLowerCase() === actorEmail,
    )
  }
  if (eventType) {
    filtered = filtered.filter((e) => e.type === eventType)
  }
  if (search) {
    filtered = filtered.filter((e) => {
      if (e.message.toLowerCase().includes(search)) return true
      if (e.metadata) {
        const metaStr = JSON.stringify(e.metadata).toLowerCase()
        if (metaStr.includes(search)) return true
      }
      if (e.type.toLowerCase().includes(search)) return true
      if (e.entityId.toLowerCase().includes(search)) return true
      return false
    })
  }
  return filtered
}

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^\w-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "org"
  )
}

export async function GET(request: Request) {
  try {
    const ctx = await getOrgContext()
    const state = await readState()
    const allEvents = state.events ?? []
    const url = new URL(request.url)
    const format = parseFormat(url.searchParams.get("format"))

    const filtered = applyFilters(allEvents, url.searchParams)
    const exportedAt = new Date().toISOString()
    const dateLabel = exportedAt.slice(0, 10)
    const orgSlug = slugify(ctx.orgName || ctx.orgId || "org")

    let body: string
    let contentType: string
    let ext: string
    switch (format) {
      case "json":
        body = formatEventsAsJSON(filtered, true)
        contentType = "application/json; charset=utf-8"
        ext = "json"
        break
      case "csv":
        body = formatEventsAsCSV(filtered)
        contentType = "text/csv; charset=utf-8"
        ext = "csv"
        break
      case "md":
      default:
        body = formatEventsAsMarkdown(
          filtered,
          ctx.orgName || ctx.orgId,
          exportedAt,
        )
        contentType = "text/markdown; charset=utf-8"
        ext = "md"
        break
    }

    const fileName = `compliroai-audit-log-${orgSlug}-${dateLabel}.${ext}`

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store",
      },
    })
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? `Nu am putut exporta log-ul de audit: ${err.message}`
            : "Nu am putut exporta log-ul de audit.",
      },
      { status: 500 },
    )
  }
}
