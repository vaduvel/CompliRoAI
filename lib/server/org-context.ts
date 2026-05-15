import { headers } from "next/headers"

export type OrgContext = {
  orgId: string
  userId: string
  email: string
  orgName: string
}

export async function getOrgContext(): Promise<OrgContext> {
  const h = await headers()
  const orgId = h.get("x-aiact-org-id")
  const userId = h.get("x-aiact-user-id")
  const email = h.get("x-aiact-user-email")
  const orgName = h.get("x-aiact-org-name")

  if (!orgId || !userId || !email) {
    throw new Error("Missing org context headers — middleware not running?")
  }

  return { orgId, userId, email, orgName: orgName ?? "" }
}
