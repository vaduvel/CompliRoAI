// Audit Ledger cu Hash Chain (port Sprint 008A din DPO-OS v3-unified).
//
// Toate evenimentele importante (creare DPIA, schimbare status finding,
// trigger orchestrator etc.) sunt scrise aici cu SHA-256(prevHash + payload),
// formând un lanț tamper-evident. Audit Pack-ul verifică integritatea
// lanțului la export.
//
// Detalii implementare:
//  - newest-first în state (ordine reverse cronologic)
//  - cap 200 înregistrări (rolling window)
//  - evenimente legacy fără hash sunt skip-uite la verify (backward compat)

import { createHash } from "node:crypto"

import type { ComplianceEvent, ComplianceState } from "@/lib/compliance/types"

export type ComplianceEventActorInput = {
  id: string
  label: string
  role?: ComplianceEvent["actorRole"]
  source: NonNullable<ComplianceEvent["actorSource"]>
}

export const GENESIS_HASH = "GENESIS"

/**
 * S2B.3 — Calculează SHA-256 pentru un eveniment, excluzând câmpurile selfHash
 * și prevHash din serializare (pentru a evita auto-referință).
 */
export function computeEventSelfHash(event: ComplianceEvent, prevHash: string): string {
  const { selfHash: _omit, prevHash: _omit2, ...rest } = event
  void _omit
  void _omit2
  // Sortăm cheile pentru deterministic serialization (ordering-independent hash).
  const sorted = sortKeys(rest)
  const payload = `${prevHash}::${JSON.stringify(sorted)}`
  return createHash("sha256").update(payload, "utf8").digest("hex")
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys)
  if (value !== null && typeof value === "object") {
    const sorted: Record<string, unknown> = {}
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      sorted[key] = sortKeys((value as Record<string, unknown>)[key])
    }
    return sorted
  }
  return value
}

export function createComplianceEvent(
  input: Omit<ComplianceEvent, "id" | "selfHash" | "prevHash">,
  actor?: ComplianceEventActorInput
): ComplianceEvent {
  return {
    id: `evt-${Math.random().toString(36).slice(2, 10)}`,
    ...input,
    ...(actor
      ? {
          actorId: actor.id,
          actorLabel: actor.label,
          actorRole: actor.role,
          actorSource: actor.source,
        }
      : {}),
  }
}

/**
 * S2B.3 — Adaugă evenimente la ledger și calculează hash chain pentru ele.
 *
 * Comportament:
 *  - Primul eveniment în ledger primește prevHash = GENESIS.
 *  - Restul primesc prevHash = selfHash al evenimentului anterior.
 *  - Evenimentele vechi din state (fără selfHash) nu sunt re-hash-uite — păstrăm
 *    backward compatibility cu istoricul existent. Hash chain pornește de la
 *    primul eveniment cu hash și continuă strict de acolo.
 *  - State-ul păstrează maximum 200 evenimente (cele mai recente la index 0).
 *
 * Notă: events sunt prepended la state.events (cele mai noi primele). Pentru
 * hash chain, iterăm cronologic (cel mai vechi → cel mai nou) ca să producem
 * un lanț corect.
 */
export function appendComplianceEvents(
  state: ComplianceState,
  events: ComplianceEvent[]
) {
  if (events.length === 0) return state.events ?? []

  const existing = state.events ?? []
  // Cel mai recent hash din ledger-ul curent (head al lanțului).
  // Căutăm primul eveniment care are selfHash (existing[0] fiind cel mai recent).
  const lastChainHash =
    existing.find((e) => typeof e.selfHash === "string" && e.selfHash.length > 0)
      ?.selfHash ?? GENESIS_HASH

  // Hash chain peste evenimentele noi în ordine cronologică (vechi → nou).
  // events[] vine de obicei într-o ordine deja sortată (createdAtISO ascendent),
  // dar nu garantăm asta. Sortăm defensiv.
  const newSorted = [...events].sort((a, b) =>
    a.createdAtISO.localeCompare(b.createdAtISO)
  )

  const hashed: ComplianceEvent[] = []
  let prev = lastChainHash
  for (const event of newSorted) {
    const withPrev: ComplianceEvent = { ...event, prevHash: prev }
    const self = computeEventSelfHash(withPrev, prev)
    const finalEvent: ComplianceEvent = { ...withPrev, selfHash: self }
    hashed.push(finalEvent)
    prev = self
  }

  // În state, păstrăm cele mai noi primele (reverse cronologic).
  const newestFirst = [...hashed].reverse()
  return [...newestFirst, ...existing].slice(0, 200)
}

// ── S2B.3 — Verification helper (pentru audit pack + debug) ──────────────────

export type EventChainVerification =
  | { ok: true; verifiedCount: number; skippedLegacyCount: number }
  | {
      ok: false
      brokenAt: { index: number; eventId: string; reason: string }
      verifiedCount: number
    }

/**
 * Verifică integritatea lanțului de hash-uri în events ledger.
 *
 * Reguli:
 *  - Evenimentele vechi (fără selfHash) sunt skip-uite — backward compatible.
 *  - Pentru cele cu hash, verificăm:
 *    1. selfHash recomputat == selfHash stocat (event neatins)
 *    2. prevHash == selfHash al evenimentului hash-uit anterior cronologic
 *
 * Iterăm cronologic (vechi → nou), deci primim events în ordine reverse
 * (state îl păstrează newest-first; convertim aici).
 */
export function verifyEventChain(events: ComplianceEvent[]): EventChainVerification {
  // Sortăm cronologic (vechi → nou) pentru lanț.
  const chronological = [...events]
    .filter((e) => typeof e.selfHash === "string" && e.selfHash.length > 0)
    .sort((a, b) => a.createdAtISO.localeCompare(b.createdAtISO))

  const skippedLegacyCount = events.length - chronological.length
  let prev = GENESIS_HASH

  for (let i = 0; i < chronological.length; i++) {
    const event = chronological[i]
    if (event.prevHash !== prev) {
      return {
        ok: false,
        brokenAt: {
          index: i,
          eventId: event.id,
          reason: `prevHash mismatch (expected ${prev.slice(0, 12)}…, got ${(event.prevHash ?? "null").slice(0, 12)}…)`,
        },
        verifiedCount: i,
      }
    }
    const recomputed = computeEventSelfHash(event, prev)
    if (recomputed !== event.selfHash) {
      return {
        ok: false,
        brokenAt: {
          index: i,
          eventId: event.id,
          reason: `selfHash mismatch (event tampered)`,
        },
        verifiedCount: i,
      }
    }
    prev = event.selfHash!
  }

  return { ok: true, verifiedCount: chronological.length, skippedLegacyCount }
}
