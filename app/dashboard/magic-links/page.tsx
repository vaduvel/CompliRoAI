import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { MagicLinksClient } from "./magic-links-client"

export const dynamic = "force-dynamic"

export default async function MagicLinksPage() {
  const h = await headers()
  const workspaceMode = h.get("x-aiact-workspace-mode")
  if (workspaceMode !== "cabinet") {
    redirect("/dashboard/sisteme")
  }
  return <MagicLinksClient />
}
