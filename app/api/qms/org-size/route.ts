/**
 * Sprint 021 — QMS organization size (Art. 17(2) proportionality).
 *
 * POST /api/qms/org-size
 *   body: { organizationSize: "sme" | "midsize" | "large" }
 */
import { NextResponse } from "next/server"

import { getOrgContext } from "@/lib/server/org-context"
import { isQmsOrgSize, setOrganizationSize } from "@/lib/server/qms-store"
import type { ComplianceEventActorInput } from "@/lib/compliance/events"
import type { QmsOrganizationSize } from "@/lib/compliance/types"

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
    if (!isQmsOrgSize(body.organizationSize)) {
      return NextResponse.json(
        { error: "organizationSize invalid (sme/midsize/large)." },
        { status: 400 },
      )
    }
    const ctx = await getOrgContext()
    const workspace = await setOrganizationSize(
      ctx.orgId,
      body.organizationSize as QmsOrganizationSize,
      actorFromContext(ctx),
      ctx.orgName ?? "Organizația",
    )
    return NextResponse.json({ workspace })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Eroare necunoscută"
    return NextResponse.json(
      { error: `Nu am putut schimba mărimea organizației: ${message}` },
      { status: 400 },
    )
  }
}
