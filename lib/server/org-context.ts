import { headers } from "next/headers"
import type { WorkspaceMode } from "@/lib/server/auth"

export type OrgContext = {
  orgId: string
  userId: string
  email: string
  orgName: string
  workspaceMode: WorkspaceMode
}

export async function getOrgContext(): Promise<OrgContext> {
  const h = await headers()
  const orgId = h.get("x-aiact-org-id")
  const userId = h.get("x-aiact-user-id")
  const email = h.get("x-aiact-user-email")
  const orgName = h.get("x-aiact-org-name")
  const workspaceModeHeader = h.get("x-aiact-workspace-mode")

  if (!orgId || !userId || !email) {
    throw new Error("Missing org context headers — middleware not running?")
  }

  const workspaceMode: WorkspaceMode =
    workspaceModeHeader === "cabinet" ? "cabinet" : "solo"

  return { orgId, userId, email, orgName: orgName ?? "", workspaceMode }
}
