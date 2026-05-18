// Sprint 023 — API context resolver for /api/v1/* routes.
//
// `/api/v1/*` is excluded from the session middleware (see middleware.ts
// matcher), so we have to resolve auth + org context manually in each route.
// Two paths:
//
//   1. API key (Authorization: Bearer cra_xxx) → preferred for machine traffic.
//      Resolves to org + apiKeyId via verifyApiKey(). The route runs in
//      AsyncLocalStorage with the org context injected so downstream calls
//      to readState()/writeState() (which read from headers) work.
//
//   2. Session cookie (aiact_session) → used by /api/v1/keys mgmt endpoints
//      invoked from /dashboard/api-sdk UI. Resolves via verifySessionToken().
//
// IMPORTANT: readState/writeState/mutateFreshStateForOrg read orgId from
// next/headers, not arguments. To make non-middleware-routed handlers work
// we wrap the actual call in a synthetic Headers context using
// `withApiContextHeaders` which monkey-patches via cookies API.
//
// Simpler approach used here: we expose `runWithApiOrgContext(orgId, fn)`
// which sets a module-level override that org-context.ts checks first.
// This keeps the existing org-context surface untouched.

import { cookies } from "next/headers"

import { SESSION_COOKIE, verifySessionToken } from "@/lib/server/auth"
import {
  verifyApiKey,
  type VerifyApiKeyResult,
} from "@/lib/server/api-key-store"
import type { ApiKeyScope } from "@/lib/compliance/types"

export type ApiAuthSource = "api_key" | "session"

export type ApiAuthContext = {
  source: ApiAuthSource
  orgId: string
  userId: string
  email: string
  orgName: string
  apiKey?: VerifyApiKeyResult["apiKey"]
}

export type ApiAuthResult =
  | { ok: true; ctx: ApiAuthContext }
  | { ok: false; status: number; code: string; message: string }

// ─── Auth resolution ─────────────────────────────────────────────────────────

export async function resolveApiAuth(request: Request): Promise<ApiAuthResult> {
  // 1. Try Bearer token first.
  const auth = request.headers.get("authorization") ?? request.headers.get("Authorization")
  if (auth && auth.toLowerCase().startsWith("bearer ")) {
    const token = auth.slice(7).trim()
    const verified = await verifyApiKey(token)
    if (!verified) {
      return {
        ok: false,
        status: 401,
        code: "INVALID_API_KEY",
        message: "API key invalid sau revocat. Generează un key nou în /dashboard/api-sdk.",
      }
    }
    return {
      ok: true,
      ctx: {
        source: "api_key",
        orgId: verified.orgId,
        userId: `apikey:${verified.apiKey.id}`,
        email: verified.apiKey.createdByEmail,
        orgName: "",
        apiKey: verified.apiKey,
      },
    }
  }

  // 2. Fall back to session cookie (used by /api/v1/keys from the UI).
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get(SESSION_COOKIE)?.value
  if (!sessionCookie) {
    return {
      ok: false,
      status: 401,
      code: "MISSING_AUTH",
      message:
        "Necesită autentificare prin API key (Authorization: Bearer cra_...) sau sesiune logată.",
    }
  }
  const session = verifySessionToken(sessionCookie)
  if (!session) {
    return {
      ok: false,
      status: 401,
      code: "INVALID_SESSION",
      message: "Sesiunea a expirat sau este invalidă.",
    }
  }
  return {
    ok: true,
    ctx: {
      source: "session",
      orgId: session.orgId,
      userId: session.userId,
      email: session.email,
      orgName: session.orgName,
    },
  }
}

export function requireScope(ctx: ApiAuthContext, scope: ApiKeyScope): ApiAuthResult {
  // Session auth bypasses scope check (UI is fully privileged).
  if (ctx.source === "session") return { ok: true, ctx }
  if (!ctx.apiKey) {
    return {
      ok: false,
      status: 401,
      code: "MISSING_AUTH",
      message: "Lipsește contextul API key.",
    }
  }
  if (!ctx.apiKey.scopes.includes(scope)) {
    return {
      ok: false,
      status: 403,
      code: "SCOPE_FORBIDDEN",
      message: `API key-ul nu are scope-ul '${scope}'. Generează un key cu scopurile necesare.`,
    }
  }
  return { ok: true, ctx }
}
