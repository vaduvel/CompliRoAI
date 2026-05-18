/**
 * Sprint 021 — QMS Workspace singleton.
 *
 * GET  /api/qms   → { workspace, summary, schema }   (returns null daca neinit)
 * POST /api/qms   → getOrCreate (initializeaza daca lipseste, returneaza
 *                   workspace + summary + created flag)
 */
import { NextResponse } from "next/server"

import { QMS_SCHEMA_V1 } from "@/lib/compliance/qms-schema"
import { getOrgContext } from "@/lib/server/org-context"
import {
  getOrCreateQms,
  readQmsWorkspace,
} from "@/lib/server/qms-store"
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

export async function GET() {
  try {
    const ctx = await getOrgContext()
    const { workspace, summary } = await readQmsWorkspace(ctx.orgId)
    return NextResponse.json({
      workspace,
      summary,
      schema: QMS_SCHEMA_V1,
    })
  } catch {
    return NextResponse.json(
      { error: "Nu am putut citi QMS workspace." },
      { status: 500 },
    )
  }
}

export async function POST() {
  try {
    const ctx = await getOrgContext()
    const { workspace, created } = await getOrCreateQms(
      ctx.orgId,
      actorFromContext(ctx),
      ctx.orgName ?? "Organizația",
    )
    const { summary } = await readQmsWorkspace(ctx.orgId)
    return NextResponse.json({
      workspace,
      summary,
      schema: QMS_SCHEMA_V1,
      created,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Eroare necunoscută"
    return NextResponse.json(
      { error: `Nu am putut iniţializa QMS: ${message}` },
      { status: 500 },
    )
  }
}
