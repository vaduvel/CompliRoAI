// GET /api/readiness-pack/registry
//   → Listează ultimele 50 de pachete generate de organizația curentă.
//   → Pentru cabinet: include și pachete generate pentru clienți (clientOrgId set).

import { NextResponse } from "next/server"

import { getOrgContext } from "@/lib/server/org-context"
import { listReadinessPacks } from "@/lib/server/readiness-pack-builder"

export async function GET() {
  try {
    await getOrgContext()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const packs = await listReadinessPacks()
    return NextResponse.json({ packs })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Eroare la citirea registrului."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
