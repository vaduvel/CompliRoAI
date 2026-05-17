/**
 * Sprint 007 — GET /api/dsar/[id]/draft
 * Generează draft de răspuns markdown pentru o cerere DSAR existentă.
 * Marchează draftResponseGenerated = true după generare.
 */
import { NextResponse } from "next/server"

import { getOrgContext } from "@/lib/server/org-context"
import { readDsarState, updateDsar } from "@/lib/server/dsar-store"
import { generateDsarDraft } from "@/lib/compliance/dsar-drafts"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getOrgContext()
    const { id } = await params

    const state = await readDsarState(ctx.orgId)
    const dsarReq = state.requests.find((r) => r.id === id)
    if (!dsarReq) {
      return NextResponse.json(
        { error: "Cererea DSAR nu a fost găsită." },
        { status: 404 }
      )
    }

    const draft = generateDsarDraft({
      requestType: dsarReq.requestType,
      requesterName: dsarReq.requesterName,
      orgName: ctx.orgName || ctx.orgId,
    })

    await updateDsar(ctx.orgId, id, { draftResponseGenerated: true })

    return NextResponse.json({ draft })
  } catch {
    return NextResponse.json(
      { error: "Eroare la generarea draft-ului." },
      { status: 500 }
    )
  }
}
