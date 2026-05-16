// Magic Links / Share Tokens — CompliRoAI Sprint 2
//
// Token format: <base64url(payload)>.<base64url(HMAC-SHA256 of payload)>
// Tokens are SELF-CONTAINED — verify only needs the secret. The Supabase
// `public.share_tokens` table is an optional registry that backs:
//   - revocation (status="revoked")
//   - listing in the dashboard
//   - usage tracking (status="used", used_at)
//
// If Supabase isn't configured we still issue valid tokens; revocation and
// listing simply degrade to "best effort" (you can verify but not list/revoke).

import { createHmac, randomBytes } from "node:crypto"

import {
  hasSupabaseConfig,
  supabaseDelete,
  supabaseSelect,
  supabaseUpdate,
  supabaseUpsert,
} from "@/lib/server/supabase-rest"

// ---------------- Types ----------------

export type ShareTargetType = "intake" | "approval" | "report"

export type ShareTokenPayload = {
  /** Stable ID also stored in the registry row so we can revoke individual tokens. */
  id: string
  orgId: string
  targetType: ShareTargetType
  targetId?: string
  createdAtISO: string
  expiresAtISO: string
}

export type ShareTokenStatus = "active" | "used" | "revoked" | "expired"

export type ShareTokenRecord = {
  id: string
  orgId: string
  createdByUserId: string
  createdByEmail?: string
  targetType: ShareTargetType
  targetId?: string
  targetLabel?: string
  recipientEmail?: string
  status: ShareTokenStatus
  usedAtISO?: string
  revokedAtISO?: string
  metadata: Record<string, unknown>
  expiresAtISO: string
  createdAtISO: string
  /** Filled in only when freshly created — never persisted. */
  token?: string
  url?: string
}

type ShareTokenRow = {
  id: string
  org_id: string
  created_by_user_id: string
  created_by_email: string | null
  target_type: string
  target_id: string | null
  target_label: string | null
  recipient_email: string | null
  status: string
  used_at_iso: string | null
  revoked_at_iso: string | null
  metadata: Record<string, unknown> | null
  expires_at_iso: string
  created_at_iso: string
}

// ---------------- Crypto ----------------

function getSecret(): string {
  const secret = process.env.AIACT_SESSION_SECRET?.trim()
  if (secret && secret.length >= 16) return secret
  if (process.env.NODE_ENV === "production") {
    throw new Error("AIACT_SESSION_SECRET missing in production")
  }
  return "aiact-share-dev-fallback-do-not-use-in-prod"
}

function b64urlEncode(value: string): string {
  return Buffer.from(value, "utf-8").toString("base64url")
}

function b64urlDecode(value: string): string {
  return Buffer.from(value, "base64url").toString("utf-8")
}

function signPayload(encoded: string): string {
  return createHmac("sha256", getSecret()).update(encoded).digest("base64url")
}

function constantTimeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

function encodeToken(payload: ShareTokenPayload): string {
  const encoded = b64urlEncode(JSON.stringify(payload))
  const sig = signPayload(encoded)
  return `${encoded}.${sig}`
}

function decodeToken(token: string): ShareTokenPayload | null {
  try {
    const dot = token.lastIndexOf(".")
    if (dot === -1) return null
    const encoded = token.slice(0, dot)
    const sig = token.slice(dot + 1)
    const expected = signPayload(encoded)
    if (!constantTimeEquals(expected, sig)) return null
    const payload = JSON.parse(b64urlDecode(encoded)) as Partial<ShareTokenPayload>
    if (!payload?.id || !payload.orgId || !payload.targetType || !payload.expiresAtISO) {
      return null
    }
    if (!isValidTargetType(payload.targetType)) return null
    return {
      id: payload.id,
      orgId: payload.orgId,
      targetType: payload.targetType,
      targetId: payload.targetId,
      createdAtISO: payload.createdAtISO ?? new Date().toISOString(),
      expiresAtISO: payload.expiresAtISO,
    }
  } catch {
    return null
  }
}

function isValidTargetType(value: unknown): value is ShareTargetType {
  return value === "intake" || value === "approval" || value === "report"
}

function newTokenId(): string {
  return `mlink-${randomBytes(8).toString("hex")}`
}

// ---------------- Row mapping ----------------

function isShareTokenStatus(value: unknown): value is ShareTokenStatus {
  return (
    value === "active" ||
    value === "used" ||
    value === "revoked" ||
    value === "expired"
  )
}

function rowToRecord(row: ShareTokenRow): ShareTokenRecord {
  return {
    id: row.id,
    orgId: row.org_id,
    createdByUserId: row.created_by_user_id,
    createdByEmail: row.created_by_email ?? undefined,
    targetType: isValidTargetType(row.target_type) ? row.target_type : "intake",
    targetId: row.target_id ?? undefined,
    targetLabel: row.target_label ?? undefined,
    recipientEmail: row.recipient_email ?? undefined,
    status: isShareTokenStatus(row.status) ? row.status : "active",
    usedAtISO: row.used_at_iso ?? undefined,
    revokedAtISO: row.revoked_at_iso ?? undefined,
    metadata: row.metadata ?? {},
    expiresAtISO: row.expires_at_iso,
    createdAtISO: row.created_at_iso,
  }
}

// ---------------- Public API ----------------

export type CreateShareTokenInput = {
  orgId: string
  createdByUserId: string
  createdByEmail?: string
  targetType: ShareTargetType
  targetId?: string
  targetLabel?: string
  recipientEmail?: string
  /** Default 7 days. Capped at 30. Minimum 1 hour. */
  expiresInDays?: number
  metadata?: Record<string, unknown>
  /** When true, do NOT attempt to persist in Supabase (useful in tests). */
  skipRegistry?: boolean
}

export async function createShareToken(
  input: CreateShareTokenInput
): Promise<ShareTokenRecord> {
  const expiresInDays = clamp(
    typeof input.expiresInDays === "number" ? input.expiresInDays : 7,
    1 / 24,
    30
  )
  const nowMs = Date.now()
  const createdAtISO = new Date(nowMs).toISOString()
  const expiresAtISO = new Date(nowMs + expiresInDays * 24 * 3_600_000).toISOString()
  const id = newTokenId()

  const payload: ShareTokenPayload = {
    id,
    orgId: input.orgId,
    targetType: input.targetType,
    targetId: input.targetId,
    createdAtISO,
    expiresAtISO,
  }
  const token = encodeToken(payload)

  const record: ShareTokenRecord = {
    id,
    orgId: input.orgId,
    createdByUserId: input.createdByUserId,
    createdByEmail: input.createdByEmail,
    targetType: input.targetType,
    targetId: input.targetId,
    targetLabel: input.targetLabel,
    recipientEmail: input.recipientEmail,
    status: "active",
    metadata: input.metadata ?? {},
    expiresAtISO,
    createdAtISO,
    token,
  }

  if (!input.skipRegistry && hasSupabaseConfig()) {
    try {
      await supabaseUpsert(
        "share_tokens",
        {
          id,
          org_id: input.orgId,
          created_by_user_id: input.createdByUserId,
          created_by_email: input.createdByEmail ?? null,
          target_type: input.targetType,
          target_id: input.targetId ?? null,
          target_label: input.targetLabel ?? null,
          recipient_email: input.recipientEmail ?? null,
          status: "active",
          metadata: input.metadata ?? {},
          expires_at_iso: expiresAtISO,
          created_at_iso: createdAtISO,
        },
        "public"
      )
    } catch (err) {
      // Best-effort: still return the issued token, but surface the issue in logs.
      console.warn(
        "[share-token-store] registry upsert failed — token still issued",
        err instanceof Error ? err.message : err
      )
    }
  }

  return record
}

/**
 * Verify a token cryptographically AND check the registry for revocation/usage.
 * Returns null for invalid/expired/revoked tokens.
 */
export async function verifyShareToken(
  token: string
): Promise<{ payload: ShareTokenPayload; record: ShareTokenRecord | null } | null> {
  const payload = decodeToken(token)
  if (!payload) return null
  if (new Date(payload.expiresAtISO).getTime() < Date.now()) return null

  if (!hasSupabaseConfig()) {
    return { payload, record: null }
  }

  try {
    const rows = await supabaseSelect<ShareTokenRow>(
      "share_tokens",
      `select=*&id=eq.${encodeURIComponent(payload.id)}&limit=1`,
      "public"
    )
    const row = rows[0]
    if (!row) {
      // Token signature valid but no registry row — accept as best-effort
      // (allows tokens issued during a brief Supabase outage to still work).
      return { payload, record: null }
    }
    const record = rowToRecord(row)
    if (record.status === "revoked") return null
    if (record.status === "expired") return null
    if (new Date(record.expiresAtISO).getTime() < Date.now()) return null
    return { payload, record }
  } catch (err) {
    console.warn(
      "[share-token-store] registry verify failed — falling back to signature-only",
      err instanceof Error ? err.message : err
    )
    return { payload, record: null }
  }
}

export async function markShareTokenUsed(
  id: string,
  nowISO: string = new Date().toISOString()
): Promise<void> {
  if (!hasSupabaseConfig()) return
  try {
    await supabaseUpdate(
      "share_tokens",
      `id=eq.${encodeURIComponent(id)}`,
      { status: "used", used_at_iso: nowISO },
      "public"
    )
  } catch (err) {
    console.warn(
      "[share-token-store] markUsed failed",
      err instanceof Error ? err.message : err
    )
  }
}

export async function revokeShareToken(
  id: string,
  orgId: string,
  nowISO: string = new Date().toISOString()
): Promise<{ ok: boolean; reason?: string }> {
  if (!hasSupabaseConfig()) {
    return { ok: false, reason: "REGISTRY_UNAVAILABLE" }
  }
  try {
    await supabaseUpdate(
      "share_tokens",
      `id=eq.${encodeURIComponent(id)}&org_id=eq.${encodeURIComponent(orgId)}`,
      { status: "revoked", revoked_at_iso: nowISO },
      "public"
    )
    return { ok: true }
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : "UPDATE_FAILED",
    }
  }
}

export async function listOrgShareTokens(
  orgId: string,
  options: { limit?: number; includeExpired?: boolean } = {}
): Promise<ShareTokenRecord[]> {
  if (!hasSupabaseConfig()) return []
  const limit = clamp(options.limit ?? 100, 1, 500)
  try {
    const rows = await supabaseSelect<ShareTokenRow>(
      "share_tokens",
      `select=*&org_id=eq.${encodeURIComponent(orgId)}&order=created_at_iso.desc&limit=${limit}`,
      "public"
    )
    const nowMs = Date.now()
    const records = rows.map(rowToRecord).map((record) => {
      if (record.status === "active" && new Date(record.expiresAtISO).getTime() < nowMs) {
        return { ...record, status: "expired" as const }
      }
      return record
    })
    if (!options.includeExpired) {
      return records
    }
    return records
  } catch (err) {
    console.warn(
      "[share-token-store] list failed",
      err instanceof Error ? err.message : err
    )
    return []
  }
}

export async function deleteShareToken(
  id: string,
  orgId: string
): Promise<void> {
  if (!hasSupabaseConfig()) return
  try {
    await supabaseDelete(
      "share_tokens",
      `id=eq.${encodeURIComponent(id)}&org_id=eq.${encodeURIComponent(orgId)}`,
      "public"
    )
  } catch (err) {
    console.warn(
      "[share-token-store] delete failed",
      err instanceof Error ? err.message : err
    )
  }
}

function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min
  return Math.min(max, Math.max(min, value))
}

/**
 * Build the absolute URL the recipient should visit.
 * `origin` is supplied by the caller (from `request.url`).
 */
export function buildShareUrl(origin: string, token: string): string {
  return new URL(`/share/${token}`, origin).toString()
}
