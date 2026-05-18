/**
 * Sprint 021 — QMS per-system attestation.
 *
 * GET    /api/qms/system-attestation         → { attestations }
 * POST   /api/qms/system-attestation         → attestSystem (replace pe systemId)
 *   body: { systemId, sectionsConfirmedCovered, gapsAcknowledged?, notes? }
 * DELETE /api/qms/system-attestation?systemId=X → revokeSystemAttestation
 */
import { NextResponse } from "next/server"

import { getOrgContext } from "@/lib/server/org-context"
import {
  attestSystem,
  isQmsSectionKey,
  listSystemAttestations,
  revokeSystemAttestation,
} from "@/lib/server/qms-store"
import type { ComplianceEventActorInput } from "@/lib/compliance/events"
import type { QmsSectionKey } from "@/lib/compliance/types"

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

function sanitizeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return (value as unknown[])
    .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
    .map((s) => s.trim())
}

export async function GET() {
  try {
    const ctx = await getOrgContext()
    const attestations = await listSystemAttestations(ctx.orgId)
    return NextResponse.json({ attestations })
  } catch {
    return NextResponse.json(
      { error: "Nu am putut citi atestările sistemelor." },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >
    const systemId =
      typeof body.systemId === "string" ? body.systemId.trim() : ""
    if (!systemId) {
      return NextResponse.json(
        { error: "systemId obligatoriu." },
        { status: 400 },
      )
    }
    const rawSections = Array.isArray(body.sectionsConfirmedCovered)
      ? (body.sectionsConfirmedCovered as unknown[])
      : []
    const sections: QmsSectionKey[] = []
    for (const v of rawSections) {
      if (typeof v === "string" && isQmsSectionKey(v)) {
        sections.push(v as QmsSectionKey)
      }
    }
    const ctx = await getOrgContext()
    const workspace = await attestSystem(
      ctx.orgId,
      {
        systemId,
        sectionsConfirmedCovered: sections,
        gapsAcknowledged: sanitizeStringList(body.gapsAcknowledged),
        notes: typeof body.notes === "string" ? body.notes : undefined,
        attestedByEmail:
          typeof body.attestedByEmail === "string"
            ? body.attestedByEmail
            : undefined,
      },
      actorFromContext(ctx),
      ctx.orgName ?? "Organizația",
    )
    return NextResponse.json({
      workspace,
      attestations: workspace.systemAttestations,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Eroare necunoscută"
    return NextResponse.json(
      { error: `Nu am putut atesta sistemul: ${message}` },
      { status: 400 },
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url)
    const systemId = url.searchParams.get("systemId")
    if (!systemId) {
      return NextResponse.json(
        { error: "systemId obligatoriu." },
        { status: 400 },
      )
    }
    const ctx = await getOrgContext()
    const workspace = await revokeSystemAttestation(
      ctx.orgId,
      systemId,
      actorFromContext(ctx),
      ctx.orgName ?? "Organizația",
    )
    return NextResponse.json({
      workspace,
      attestations: workspace.systemAttestations,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Eroare necunoscută"
    return NextResponse.json(
      { error: `Nu am putut revoca atestarea: ${message}` },
      { status: 400 },
    )
  }
}
