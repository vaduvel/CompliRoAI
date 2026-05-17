import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { ClientsList } from "./clients-list"

export const dynamic = "force-dynamic"

export default async function ClientiPage() {
  const h = await headers()
  const workspaceMode = h.get("x-aiact-workspace-mode")
  if (workspaceMode !== "cabinet") {
    // Imm-classic + ai-builder don't manage portfolios — bounce them home.
    redirect("/dashboard")
  }
  return <ClientsList />
}
