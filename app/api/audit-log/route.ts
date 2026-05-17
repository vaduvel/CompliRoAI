/**
 * Sprint 011 — GET /api/audit-log
 *
 * Returns the full event ledger for the current org, with server-side filters
 * (date range, entity type, actor, event type, full-text search, pagination)
 * + chain verification result.
 *
 * Query params:
 *  - from         ISO date (inclusive lower bound on createdAtISO)
 *  - to           ISO date (inclusive upper bound on createdAtISO)
 *  - entityType   ComplianceEventEntityType filter (single value)
 *  - actorEmail   exact match on actorLabel (case-insensitive)
 *  - eventType    exact match on event `type`
 *  - search       case-insensitive substring on message + JSON(metadata)
 *  - limit        default 100, max 500
 *  - offset       default 0
 *
 * Response shape:
 *   {
 *     events: ComplianceEvent[],
 *     total: number,                // total AFTER filters (before pagination)
 *     chainVerification: EventChainVerification,
 *     facets: {
 *       actors: string[],           // unique actorLabel across all events
 *       eventTypes: string[],       // unique event `type` across all events
 *       entityTypes: string[],      // unique entityType across all events
 *     },
 *   }
 *
 * Sortare: newest-first.
 */

import { NextResponse } from "next/server"

import { getOrgContext } from "@/lib/server/org-context"
import { readState } from "@/lib/server/store"
import { verifyEventChain } from "@/lib/compliance/events"
import type { ComplianceEvent, ComplianceEventEntityType } from "@/lib/compliance/types"

const VALID_ENTITY_TYPES: ComplianceEventEntityType[] = [
  "scan",
  "finding",
  "alert",
  "task",
  "integration",
  "system",
  "drift",
]

const MAX_LIMIT = 500
const DEFAULT_LIMIT = 100

export async function GET(request: Request) {
  try {
    await getOrgContext()
    const state = await readState()
    const allEvents = state.events ?? []

    const url = new URL(request.url)
    const params = url.searchParams

    const from = params.get("from")?.trim() || null
    const to = params.get("to")?.trim() || null
    const entityType = params.get("entityType")?.trim() || null
    const actorEmail = params.get("actorEmail")?.trim().toLowerCase() || null
    const eventType = params.get("eventType")?.trim() || null
    const search = params.get("search")?.trim().toLowerCase() || null

    const limitRaw = Number.parseInt(params.get("limit") ?? "", 10)
    const offsetRaw = Number.parseInt(params.get("offset") ?? "", 10)
    const limit = Number.isFinite(limitRaw) && limitRaw > 0
      ? Math.min(limitRaw, MAX_LIMIT)
      : DEFAULT_LIMIT
    const offset = Number.isFinite(offsetRaw) && offsetRaw >= 0 ? offsetRaw : 0

    // Filtering (sortarea newest-first o asiguram dupa)
    let filtered = allEvents.slice()
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

    // Sortare newest-first (events din state sunt deja newest-first dar
    // filtrele nu pastreaza neaparat ordinea).
    filtered.sort((a, b) => b.createdAtISO.localeCompare(a.createdAtISO))

    const total = filtered.length
    const paginated = filtered.slice(offset, offset + limit)

    // Chain verification ruleaza pe TOATE evenimentele (nu doar pe pagina),
    // pentru ca lantul e secvential global.
    const chainVerification = verifyEventChain(allEvents)

    // Facete pentru filter dropdowns — extrase din toate evenimentele.
    const actorSet = new Set<string>()
    const eventTypeSet = new Set<string>()
    const entityTypeSet = new Set<string>()
    for (const e of allEvents) {
      if (e.actorLabel) actorSet.add(e.actorLabel)
      if (e.type) eventTypeSet.add(e.type)
      if (e.entityType) entityTypeSet.add(e.entityType)
    }

    return NextResponse.json({
      events: paginated,
      total,
      chainVerification,
      facets: {
        actors: Array.from(actorSet).sort(),
        eventTypes: Array.from(eventTypeSet).sort(),
        entityTypes: Array.from(entityTypeSet).sort(),
      },
    })
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? `Nu am putut incarca log-ul de audit: ${err.message}`
            : "Nu am putut incarca log-ul de audit.",
      },
      { status: 500 },
    )
  }
}

export type AuditLogGetResponse = {
  events: ComplianceEvent[]
  total: number
  chainVerification: ReturnType<typeof verifyEventChain>
  facets: {
    actors: string[]
    eventTypes: string[]
    entityTypes: string[]
  }
}
