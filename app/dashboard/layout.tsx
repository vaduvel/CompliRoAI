import { headers } from "next/headers"
import { DashboardShell } from "@/components/shell/dashboard-shell"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const h = await headers()
  const userEmail = h.get("x-aiact-user-email") ?? undefined
  const orgName = h.get("x-aiact-org-name") ?? undefined

  return (
    <DashboardShell userEmail={userEmail} orgName={orgName}>
      {children}
    </DashboardShell>
  )
}
