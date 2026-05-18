// Slim org_state Supabase access for eu-ai-act.
// Reads/writes a JSONB blob keyed by org_id in the shared `org_state` table.
// CompliAI uses the same table; eu-ai-act stores its own AIActState shape.

import { hasSupabaseConfig, supabaseSelect, supabaseUpsert } from "@/lib/server/supabase-rest"

type OrgStateRow<T> = {
  org_id: string
  state: T
  updated_at?: string
}

export function getConfiguredDataBackend(): "local" | "supabase" | "hybrid" {
  // Preferă AIACT_DATA_BACKEND (mandate § 20 — env prefix AIACT_*), cu fallback
  // pe COMPLISCAN_DATA_BACKEND pentru deploy-uri legacy.
  const raw =
    process.env.AIACT_DATA_BACKEND ?? process.env.COMPLISCAN_DATA_BACKEND
  const value = raw?.trim().toLowerCase()
  if (value === "supabase") return "supabase"
  if (value === "hybrid") return "hybrid"
  return "local"
}

export function shouldUseSupabaseOrgState(): boolean {
  return hasSupabaseConfig() && getConfiguredDataBackend() !== "local"
}

export async function loadOrgStateFromSupabase<T>(orgId: string): Promise<T | null> {
  if (!shouldUseSupabaseOrgState()) return null

  const rows = await supabaseSelect<OrgStateRow<T>>(
    "org_state",
    `select=org_id,state,updated_at&org_id=eq.${encodeURIComponent(orgId)}&limit=1`,
    "public"
  )
  return rows[0]?.state ?? null
}

export async function persistOrgStateToSupabase<T>(orgId: string, state: T): Promise<void> {
  if (!shouldUseSupabaseOrgState()) return

  await supabaseUpsert(
    "org_state",
    { org_id: orgId, state },
    "public"
  )
}
