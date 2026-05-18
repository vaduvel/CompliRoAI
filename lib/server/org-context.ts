import { AsyncLocalStorage } from "node:async_hooks"

import { headers } from "next/headers"
import { normalizeWorkspaceMode, type WorkspaceMode } from "@/lib/server/auth"

export type OrgContext = {
  orgId: string
  userId: string
  email: string
  orgName: string
  workspaceMode: WorkspaceMode
}

// Sprint 023 — `/api/v1/*` routes are excluded from the session middleware so
// they don't carry the x-aiact-* headers. The route handler resolves the
// context manually (API key or session cookie) and wraps downstream work in
// `runWithOrgContext` so `getOrgContext()` returns a sane value without
// touching the middleware contract.
const orgContextStore = new AsyncLocalStorage<OrgContext>()

export async function getOrgContext(): Promise<OrgContext> {
  const override = orgContextStore.getStore()
  if (override) return override

  const h = await headers()
  const orgId = h.get("x-aiact-org-id")
  const userId = h.get("x-aiact-user-id")
  const email = h.get("x-aiact-user-email")
  const orgName = h.get("x-aiact-org-name")
  const workspaceModeHeader = h.get("x-aiact-workspace-mode")

  if (!orgId || !userId || !email) {
    throw new Error("Missing org context headers — middleware not running?")
  }

  return {
    orgId,
    userId,
    email,
    orgName: orgName ?? "",
    workspaceMode: normalizeWorkspaceMode(workspaceModeHeader),
  }
}

/**
 * Sprint 023 — Run `fn` with a synthetic OrgContext available to any
 * downstream call to `getOrgContext()`. Used by /api/v1/* route handlers
 * after they resolve auth manually (API key or session). The context is
 * scoped via AsyncLocalStorage so concurrent requests stay isolated.
 */
export function runWithOrgContext<T>(ctx: OrgContext, fn: () => Promise<T>): Promise<T> {
  return orgContextStore.run(ctx, fn)
}
