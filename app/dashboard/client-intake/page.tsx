import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { ClientIntakeForm } from "./client-intake-form"

export const dynamic = "force-dynamic"

export default async function ClientIntakePage() {
  const h = await headers()
  const workspaceMode = h.get("x-aiact-workspace-mode")
  if (workspaceMode !== "cabinet") {
    redirect("/dashboard")
  }
  return <ClientIntakeForm />
}
