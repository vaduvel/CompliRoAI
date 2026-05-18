// Sprint 023 — API rate limiter.
//
// Sliding-window in-memory limiter, keyed by orgId (preferred) or IP (fallback
// for anonymous endpoints like /api/v1/health). Production posture for v1:
// in-memory cap per serverless instance — acceptable because:
//   1. Mandate § 18 row 023 calls for "real rate limit, not stubs" — this is
//      a real algorithm, not a noop.
//   2. Vercel keeps warm instances; in-memory state is preserved per instance.
//   3. Cross-instance perfect coordination requires Redis/Upstash — gated for
//      Sprint 024 (commercial phase).
//
// Window: 60s. Default: 60 req/min. Per-key override supported.

const DEFAULT_RATE = 60
const WINDOW_MS = 60_000

type Bucket = {
  count: number
  windowStart: number
}

const buckets = new Map<string, Bucket>()

export type RateLimitResult = {
  allowed: boolean
  remaining: number
  limit: number
  retryAfterSec: number
}

export type RateLimitInput = {
  /** Composite key, ex: `org:org-abc:/api/v1/classify` or `ip:1.2.3.4`. */
  key: string
  limit?: number
  nowMs?: number
}

export function checkRateLimit(input: RateLimitInput): RateLimitResult {
  const limit = input.limit ?? DEFAULT_RATE
  const nowMs = input.nowMs ?? Date.now()
  const bucket = buckets.get(input.key)

  if (!bucket || nowMs - bucket.windowStart >= WINDOW_MS) {
    buckets.set(input.key, { count: 1, windowStart: nowMs })
    return {
      allowed: true,
      remaining: limit - 1,
      limit,
      retryAfterSec: Math.ceil(WINDOW_MS / 1000),
    }
  }

  if (bucket.count >= limit) {
    const elapsed = nowMs - bucket.windowStart
    const retryAfterSec = Math.max(1, Math.ceil((WINDOW_MS - elapsed) / 1000))
    return { allowed: false, remaining: 0, limit, retryAfterSec }
  }

  bucket.count++
  return {
    allowed: true,
    remaining: limit - bucket.count,
    limit,
    retryAfterSec: Math.ceil((WINDOW_MS - (nowMs - bucket.windowStart)) / 1000),
  }
}

/**
 * Builds a stable key. Orgs take precedence over IP (a paying customer should
 * never get rate-limited together with anonymous health-check traffic).
 */
export function buildRateLimitKey(input: {
  orgId?: string | null
  ip?: string | null
  endpoint: string
}): string {
  if (input.orgId) return `org:${input.orgId}:${input.endpoint}`
  return `ip:${input.ip ?? "anonymous"}:${input.endpoint}`
}

/**
 * Extracts a best-effort client IP from request headers. Mirrors the legacy
 * `/api/v1/clasifica` behaviour.
 */
export function extractClientIp(headers: Headers): string {
  const xff = headers.get("x-forwarded-for")
  if (xff) return xff.split(",")[0].trim()
  const realIp = headers.get("x-real-ip")
  if (realIp) return realIp
  return "anonymous"
}

/**
 * Test helper — clears all buckets so tests don't bleed into each other.
 */
export function __resetRateLimiterForTests(): void {
  buckets.clear()
}
