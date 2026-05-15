import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { DashboardShell } from "@/components/shell/dashboard-shell"
import { isOnboardingCompleted } from "@/lib/server/onboarding-gate"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const h = await headers()
  const userEmail = h.get("x-aiact-user-email") ?? undefined
  const orgName = h.get("x-aiact-org-name") ?? undefined

  const completed = await isOnboardingCompleted()
  if (!completed) {
    redirect("/onboarding")
  }

  return (
    <DashboardShell userEmail={userEmail} orgName={orgName}>
      {children}
    </DashboardShell>
  )
}
