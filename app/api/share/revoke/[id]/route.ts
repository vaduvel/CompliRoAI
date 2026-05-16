// Revoke a magic link by its registry ID.
// Authenticated cabinet route — only the org that issued the link can revoke.

import { NextResponse } from "next/server"

import { getOrgContext } from "@/lib/server/org-context"
import { revokeShareToken } from "@/lib/server/share-token-store"

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getOrgContext()
    const { id } = await context.params
    if (!id || !id.startsWith("mlink-")) {
      return NextResponse.json(
        { error: "ID linkului este invalid." },
        { status: 400 }
      )
    }
    const result = await revokeShareToken(id, ctx.orgId)
    if (!result.ok) {
      return NextResponse.json(
        { error: result.reason ?? "Revocarea a eșuat." },
        { status: 500 }
      )
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Eroare la revocare."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
