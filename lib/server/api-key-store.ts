// Sprint 023 — API key store.
//
// Token format: `cra_<32 hex chars>` (cra = CompliRoAI). We store only:
//   - SHA-256 hex of the full token (hmacHash) — used for lookup on incoming auth.
//   - first 8 chars of the full token (prefix) — safe to display in UI.
//
// Token verification across orgs:
//   API requests carry an `Authorization: Bearer cra_xxx` header. We compute
//   SHA-256(full token) and look it up in `state.apiKeys[]`. Because state is
//   per-org and the request comes anonymous (no org context), we maintain a
//   global reverse index `hmacHash → { orgId, apiKeyId }` populated on:
//     1. Key creation (eager add to index).
//     2. First miss on lookup (lazy scan of `.data/state-*.json`).
//
// The reverse index is in-memory only — re-built on cold start. This is the
// same trade-off used by `lib/server/store.ts` (Map cache) and is fine for
// Vercel serverless (idle warm time = same instance reads same cache).

import { promises as fs } from "node:fs"
import path from "node:path"
import { createHash, randomBytes } from "node:crypto"

import {
  appendComplianceEvents,
  createComplianceEvent,
  type ComplianceEventActorInput,
} from "@/lib/compliance/events"
import { mutateFreshStateForOrg } from "@/lib/server/store"
import type { ApiKey, ApiKeyScope, ApiKeyStatus, ComplianceState } from "@/lib/compliance/types"

const TOKEN_PREFIX = "cra_"
const TOKEN_BODY_BYTES = 16 // 32 hex chars
const PREFIX_DISPLAY_LEN = 8

// ─── Reverse index (cross-org lookup) ────────────────────────────────────────

type IndexEntry = { orgId: string; apiKeyId: string }
const hashIndex = new Map<string, IndexEntry>()
let indexHydrated = false

function indexKey(hmacHash: string): string {
  return hmacHash.toLowerCase()
}

function addToIndex(hmacHash: string, entry: IndexEntry): void {
  hashIndex.set(indexKey(hmacHash), entry)
}

function removeFromIndex(hmacHash: string): void {
  hashIndex.delete(indexKey(hmacHash))
}

async function hydrateIndexFromDisk(): Promise<void> {
  if (indexHydrated) return
  indexHydrated = true
  try {
    const dataDir = path.join(process.cwd(), ".data")
    const entries = await fs.readdir(dataDir)
    for (const entry of entries) {
      const match = entry.match(/^state-(.+)\.json$/)
      if (!match) continue
      const orgId = match[1]
      try {
        const raw = await fs.readFile(path.join(dataDir, entry), "utf-8")
        const parsed = JSON.parse(raw) as Partial<ComplianceState>
        for (const key of parsed.apiKeys ?? []) {
          if (key.status === "active") {
            addToIndex(key.hmacHash, { orgId, apiKeyId: key.id })
          }
        }
      } catch {
        // Skip unreadable file — don't block other orgs.
      }
    }
  } catch {
    // No .data dir (production w/ Supabase) — caller paths still work
    // because key creation eager-populates the index.
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function uid(): string {
  return `apikey-${Math.random().toString(36).slice(2, 10)}`
}

function nowISO(): string {
  return new Date().toISOString()
}

function generateToken(): string {
  return `${TOKEN_PREFIX}${randomBytes(TOKEN_BODY_BYTES).toString("hex")}`
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex")
}

function isExpired(key: ApiKey, nowMs: number): boolean {
  if (!key.expiresAtISO) return false
  return new Date(key.expiresAtISO).getTime() <= nowMs
}

function deriveStatus(key: ApiKey, nowMs: number): ApiKeyStatus {
  if (key.revokedAtISO) return "revoked"
  if (isExpired(key, nowMs)) return "expired"
  return "active"
}

// ─── Public CRUD ─────────────────────────────────────────────────────────────

export type CreateApiKeyInput = {
  label: string
  scopes: ApiKeyScope[]
  expiresAtISO?: string
  notes?: string
}

export type CreateApiKeyResult = {
  key: ApiKey
  /** Full token. Returned ONCE on creation — never persisted. */
  fullToken: string
}

export async function createApiKey(
  orgId: string,
  input: CreateApiKeyInput,
  actor: ComplianceEventActorInput,
): Promise<CreateApiKeyResult> {
  if (!input.label.trim()) {
    throw new Error("createApiKey: label is required")
  }
  if (!Array.isArray(input.scopes) || input.scopes.length === 0) {
    throw new Error("createApiKey: at least one scope is required")
  }

  const fullToken = generateToken()
  const hmacHash = hashToken(fullToken)
  const prefix = fullToken.slice(0, PREFIX_DISPLAY_LEN)
  const now = nowISO()

  let createdRef: ApiKey | null = null

  await mutateFreshStateForOrg(orgId, (state) => {
    const key: ApiKey = {
      id: uid(),
      orgId,
      label: input.label.trim(),
      prefix,
      hmacHash,
      createdByEmail: actor.label,
      createdAtISO: now,
      expiresAtISO: input.expiresAtISO,
      status: "active",
      scopes: input.scopes,
      notes: input.notes,
    }
    createdRef = key

    const event = createComplianceEvent(
      {
        type: "api.key_created",
        entityType: "system",
        entityId: key.id,
        message: `API key emis: ${key.label} (${key.prefix}…)`,
        createdAtISO: now,
        metadata: {
          label: key.label,
          scopes: key.scopes.join(","),
        },
      },
      actor,
    )

    return {
      ...state,
      apiKeys: [key, ...(state.apiKeys ?? [])],
      events: appendComplianceEvents(state, [event]),
    }
  })

  if (!createdRef) {
    throw new Error("createApiKey: mutator did not produce a key")
  }
  const created: ApiKey = createdRef
  addToIndex(hmacHash, { orgId, apiKeyId: created.id })
  return { key: created, fullToken }
}

export async function listApiKeys(orgId: string): Promise<ApiKey[]> {
  // Use mutator with identity to read consistent state through the same
  // path tests/runtime use elsewhere.
  let snapshot: ApiKey[] = []
  await mutateFreshStateForOrg(orgId, (state) => {
    const nowMs = Date.now()
    snapshot = (state.apiKeys ?? []).map((key) => ({
      ...key,
      status: deriveStatus(key, nowMs),
    }))
    return state
  })
  return snapshot
}

export async function revokeApiKey(
  orgId: string,
  id: string,
  actor: ComplianceEventActorInput,
): Promise<ApiKey | null> {
  let updated: ApiKey | null = null

  await mutateFreshStateForOrg(orgId, (state) => {
    const list = state.apiKeys ?? []
    const target = list.find((k) => k.id === id)
    if (!target || target.status === "revoked") return state

    const now = nowISO()
    const next: ApiKey = { ...target, status: "revoked", revokedAtISO: now }
    updated = next
    removeFromIndex(target.hmacHash)

    const event = createComplianceEvent(
      {
        type: "api.key_revoked",
        entityType: "system",
        entityId: target.id,
        message: `API key revocat: ${target.label} (${target.prefix}…)`,
        createdAtISO: now,
        metadata: { label: target.label },
      },
      actor,
    )

    return {
      ...state,
      apiKeys: list.map((k) => (k.id === id ? next : k)),
      events: appendComplianceEvents(state, [event]),
    }
  })

  return updated
}

export type VerifyApiKeyResult = {
  orgId: string
  apiKey: ApiKey
}

/**
 * Verifies an incoming bearer token. Strips the `cra_` prefix check, hashes,
 * looks up in the reverse index (rehydrating from disk on first miss), then
 * loads the org state to fetch the current ApiKey record.
 *
 * Returns null when:
 *   - token shape is wrong
 *   - hash not found in any org
 *   - key is revoked or expired
 */
export async function verifyApiKey(rawToken: string): Promise<VerifyApiKeyResult | null> {
  if (!rawToken || typeof rawToken !== "string") return null
  const trimmed = rawToken.trim()
  if (!trimmed.startsWith(TOKEN_PREFIX)) return null

  const hash = hashToken(trimmed)
  let entry = hashIndex.get(indexKey(hash)) ?? null
  if (!entry) {
    await hydrateIndexFromDisk()
    entry = hashIndex.get(indexKey(hash)) ?? null
  }
  if (!entry) return null

  // Pull the live ApiKey from state to honour revocation/expiry.
  let live: ApiKey | null = null
  await mutateFreshStateForOrg(entry.orgId, (state) => {
    const found = (state.apiKeys ?? []).find((k) => k.id === entry!.apiKeyId)
    if (!found) return state
    const nowMs = Date.now()
    const status = deriveStatus(found, nowMs)
    if (status !== "active") return state
    // Update lastUsedAtISO (cheap write — kept lean).
    const updated: ApiKey = { ...found, lastUsedAtISO: new Date(nowMs).toISOString() }
    live = updated
    return {
      ...state,
      apiKeys: (state.apiKeys ?? []).map((k) => (k.id === entry!.apiKeyId ? updated : k)),
    }
  })

  if (!live) {
    removeFromIndex(hash)
    return null
  }
  return { orgId: entry.orgId, apiKey: live }
}

export function tokenScopeAllowed(key: ApiKey, scope: ApiKeyScope): boolean {
  return key.scopes.includes(scope)
}

/**
 * Test helper — resets the in-memory index so tests can start clean.
 * Production callers MUST NOT use this.
 */
export function __resetApiKeyIndexForTests(): void {
  hashIndex.clear()
  indexHydrated = false
}

export const __internals = {
  TOKEN_PREFIX,
  PREFIX_DISPLAY_LEN,
  generateToken,
  hashToken,
}
