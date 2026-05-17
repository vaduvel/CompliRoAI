/**
 * Sprint 007 — DSAR CRUD: GET list + POST create
 * Port DPO-OS v3-unified, adaptat la pattern CompliRoAI (getOrgContext + readState/writeState).
 * GDPR Art. 15-22 — Data Subject Access Requests.
 */
import { NextResponse } from "next/server"

import { getOrgContext } from "@/lib/server/org-context"
import { createDsar, readDsarState, updateDsar } from "@/lib/server/dsar-store"
import { generateDsarDraft, generateDsarProcessPack } from "@/lib/compliance/dsar-drafts"
import type { DsarRequestType } from "@/lib/compliance/types"

const VALID_TYPES: DsarRequestType[] = [
  "access",
  "rectification",
  "erasure",
  "portability",
  "objection",
  "restriction",
]

export async function GET() {
  try {
    const ctx = await getOrgContext()
    const state = await readDsarState(ctx.orgId)
    return NextResponse.json({
      requests: state.requests,
      processPack: generateDsarProcessPack({ orgName: ctx.orgName || ctx.orgId }),
    })
  } catch {
    return NextResponse.json(
      { error: "Nu am putut încărca cererile DSAR." },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getOrgContext()
    const body = await request.json()

    const { requesterName, requesterEmail, requestType, receivedAtISO, notes } = body
    if (!requesterName?.trim()) {
      return NextResponse.json(
        { error: "Numele solicitantului este obligatoriu." },
        { status: 400 }
      )
    }
    if (!requesterEmail?.trim()) {
      return NextResponse.json(
        { error: "Email-ul solicitantului este obligatoriu." },
        { status: 400 }
      )
    }
    if (!VALID_TYPES.includes(requestType)) {
      return NextResponse.json({ error: "Tip cerere invalid." }, { status: 400 })
    }

    const requestedReceivedAtISO =
      typeof receivedAtISO === "string" && receivedAtISO.trim()
        ? receivedAtISO.trim()
        : new Date().toISOString()

    const existingState = await readDsarState(ctx.orgId)
    const duplicate = existingState.requests.find(
      (req) =>
        req.requesterEmail.trim().toLowerCase() === requesterEmail.trim().toLowerCase() &&
        req.requestType === requestType &&
        isDuplicateWindow(req.receivedAtISO, requestedReceivedAtISO)
    )

    if (duplicate) {
      const draft = generateDsarDraft({
        requestType: duplicate.requestType,
        requesterName: duplicate.requesterName,
        orgName: ctx.orgName || ctx.orgId,
      })
      return NextResponse.json({
        request: duplicate,
        draft,
        deduplicated: true,
        message: "Cererea DSAR există deja în registru pentru această fereastră de timp.",
      })
    }

    const dsar = await createDsar(ctx.orgId, {
      requesterName: requesterName.trim(),
      requesterEmail: requesterEmail.trim(),
      requestType,
      receivedAtISO: requestedReceivedAtISO,
      notes,
    })

    // Auto-generate draft on creation (mark draftResponseGenerated = true)
    const draft = generateDsarDraft({
      requestType: dsar.requestType,
      requesterName: dsar.requesterName,
      orgName: ctx.orgName || ctx.orgId,
    })
    const updatedDsar = await updateDsar(ctx.orgId, dsar.id, {
      draftResponseGenerated: true,
    })

    return NextResponse.json(
      { request: updatedDsar ?? dsar, draft },
      { status: 201 }
    )
  } catch {
    return NextResponse.json(
      { error: "Nu am putut crea cererea DSAR." },
      { status: 500 }
    )
  }
}

function isDuplicateWindow(leftISO: string, rightISO: string) {
  const left = new Date(leftISO).getTime()
  const right = new Date(rightISO).getTime()
  if (!Number.isFinite(left) || !Number.isFinite(right)) return false
  return Math.abs(left - right) <= 5 * 60 * 1000
}
