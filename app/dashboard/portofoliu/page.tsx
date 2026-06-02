import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { PortfolioClient } from "./portfolio-client"

export const dynamic = "force-dynamic"

export default async function PortofoliuPage() {
  const h = await headers()
  const workspaceMode = h.get("x-aiact-workspace-mode")
  if (workspaceMode !== "cabinet") {
    redirect("/dashboard/module-unavailable?module=portofoliu")
  }

  return <PortfolioClient />
}
