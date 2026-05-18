/**
 * Sprint 021 — QMS simplified mode toggle (Art. 17(3) SME).
 *
 * POST /api/qms/simplified-mode
 *   body: { simplifiedMode: boolean }
 */
import { NextResponse } from "next/server"

import { getOrgContext } from "@/lib/server/org-context"
import { markSimplifiedMode } from "@/lib/server/qms-store"
import type { ComplianceEventActorInput } from "@/lib/compliance/events"

function actorFromContext(ctx: {
  userId: string
  email: string
}): ComplianceEventActorInput {
  return {
    id: ctx.userId,
    label: ctx.email,
    role: "compliance",
    source: "session",
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >
    if (typeof body.simplifiedMode !== "boolean") {
      return NextResponse.json(
        { error: "simplifiedMode trebuie să fie boolean." },
        { status: 400 },
      )
    }
    const ctx = await getOrgContext()
    const workspace = await markSimplifiedMode(
      ctx.orgId,
      body.simplifiedMode,
      actorFromContext(ctx),
      ctx.orgName ?? "Organizația",
    )
    return NextResponse.json({ workspace })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Eroare necunoscută"
    return NextResponse.json(
      { error: `Nu am putut schimba modul simplificat: ${message}` },
      { status: 400 },
    )
  }
}
