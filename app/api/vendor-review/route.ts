/**
 * Sprint 010 — Vendor Review list + create.
 *
 * GET  /api/vendor-review  -> { records, summary, lifecycle }
 * POST /api/vendor-review  -> creeaza VendorRecord; evalueaza risc; emite
 *                             findings; appendeaza events.
 */
import { NextResponse } from "next/server"

import { getOrgContext } from "@/lib/server/org-context"
import {
  createVendor,
  isDPAStatus,
  isVendorRegion,
  isVendorRole,
  isVendorTransferMechanism,
  readVendorRecords,
  type CreateVendorInput,
} from "@/lib/server/vendor-review-store"
import type { ComplianceEventActorInput } from "@/lib/compliance/events"

function actorFromContext(ctx: { userId: string; email: string }): ComplianceEventActorInput {
  return {
    id: ctx.userId,
    label: ctx.email,
    role: "compliance",
    source: "session",
  }
}

function normStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter((s) => s.length > 0)
}

export async function GET() {
  try {
    const ctx = await getOrgContext()
    const data = await readVendorRecords(ctx.orgId)
    return NextResponse.json(data)
  } catch {
    return NextResponse.json(
      { error: "Nu am putut citi lista de vendori." },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getOrgContext()
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>

    const name = typeof body.name === "string" ? body.name.trim() : ""
    if (!name) {
      return NextResponse.json({ error: "Numele vendorului e obligatoriu." }, { status: 400 })
    }

    const input: CreateVendorInput = {
      name,
      legalEntity: typeof body.legalEntity === "string" ? body.legalEntity : undefined,
      contactEmail: typeof body.contactEmail === "string" ? body.contactEmail : undefined,
      productUsed: typeof body.productUsed === "string" ? body.productUsed : undefined,
      vendorRegion: isVendorRegion(body.vendorRegion) ? body.vendorRegion : undefined,
      role: isVendorRole(body.role) ? body.role : undefined,
      serviceCategory: typeof body.serviceCategory === "string" ? body.serviceCategory : undefined,
      linkedAISystemIds: normStringArray(body.linkedAISystemIds),
      linkedAIDataMapIds: normStringArray(body.linkedAIDataMapIds),
      dpaStatus: isDPAStatus(body.dpaStatus) ? body.dpaStatus : undefined,
      dpaUrl: typeof body.dpaUrl === "string" ? body.dpaUrl : undefined,
      dpaSignedAtISO: typeof body.dpaSignedAtISO === "string" ? body.dpaSignedAtISO : undefined,
      dpaExpiresAtISO: typeof body.dpaExpiresAtISO === "string" ? body.dpaExpiresAtISO : undefined,
      transferRequired:
        typeof body.transferRequired === "boolean" ? body.transferRequired : undefined,
      transferMechanism: isVendorTransferMechanism(body.transferMechanism)
        ? body.transferMechanism
        : undefined,
      transferAssessmentNote:
        typeof body.transferAssessmentNote === "string" ? body.transferAssessmentNote : undefined,
      subprocessorsList: normStringArray(body.subprocessorsList),
      subprocessorsUrl: typeof body.subprocessorsUrl === "string" ? body.subprocessorsUrl : undefined,
      securityEvidence:
        typeof body.securityEvidence === "object" && body.securityEvidence !== null
          ? (body.securityEvidence as CreateVendorInput["securityEvidence"])
          : undefined,
      aiTerms:
        typeof body.aiTerms === "object" && body.aiTerms !== null
          ? (body.aiTerms as CreateVendorInput["aiTerms"])
          : undefined,
      notes: typeof body.notes === "string" ? body.notes : undefined,
      doraScope:
        typeof body.doraScope === "object" && body.doraScope !== null
          ? (body.doraScope as CreateVendorInput["doraScope"])
          : undefined,
    }

    const { record, linkedFindingIds } = await createVendor(
      ctx.orgId,
      input,
      actorFromContext(ctx),
    )
    const { summary, lifecycle } = await readVendorRecords(ctx.orgId)
    return NextResponse.json(
      { record, linkedFindingIds, summary, lifecycle },
      { status: 201 },
    )
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Nu am putut crea vendorul." },
      { status: 500 },
    )
  }
}
