import { NextResponse } from "next/server"
import { headers } from "next/headers"

export async function GET() {
  try {
    const h = await headers()
    const email = h.get("x-aiact-user-email")
    const orgId = h.get("x-aiact-org-id")
    const orgName = h.get("x-aiact-org-name")

    if (!email || !orgId) {
      return NextResponse.json({ user: null }, { status: 401 })
    }

    return NextResponse.json({
      user: {
        email,
        orgId,
        orgName: orgName ?? "",
        workspaceMode: "solo",
      },
    })
  } catch {
    return NextResponse.json({ error: "Sesiunea nu poate fi verificata." }, { status: 500 })
  }
}
