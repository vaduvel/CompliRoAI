import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { DashboardShell } from "@/components/shell/dashboard-shell"
import { isOnboardingCompleted } from "@/lib/server/onboarding-gate"
import { normalizeWorkspaceMode } from "@/lib/server/auth"
import { getCurrentSubscription } from "@/lib/server/billing-store"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const h = await headers()
  const userEmail = h.get("x-aiact-user-email") ?? undefined
  const orgName = h.get("x-aiact-org-name") ?? undefined
  const workspaceMode = normalizeWorkspaceMode(h.get("x-aiact-workspace-mode"))

  const completed = await isOnboardingCompleted()
  if (!completed) {
    redirect("/onboarding")
  }

  // Best-effort read — if billing-store fails (no state yet, supabase down,
  // etc.) we fall through to defaults (free_trial, no trialEndsAtISO).
  let tier: Parameters<typeof DashboardShell>[0]["tier"] = "free_trial"
  let trialEndsAtISO: string | undefined
  try {
    const sub = await getCurrentSubscription()
    if (sub) {
      tier = sub.tier
      trialEndsAtISO = sub.trialEndsAtISO
    }
  } catch {
    // swallow — defaults are safe.
  }

  return (
    <DashboardShell
      userEmail={userEmail}
      orgName={orgName}
      workspaceMode={workspaceMode}
      tier={tier}
      trialEndsAtISO={trialEndsAtISO}
    >
      {children}
    </DashboardShell>
  )
}
