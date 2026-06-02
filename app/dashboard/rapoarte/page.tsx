import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { ReportsList } from "./reports-list"

export const dynamic = "force-dynamic"

export default async function RapoartePage() {
  const h = await headers()
  const workspaceMode = h.get("x-aiact-workspace-mode")
  if (workspaceMode !== "cabinet") {
    redirect("/dashboard/module-unavailable?module=rapoarte")
  }
  return <ReportsList />
}
