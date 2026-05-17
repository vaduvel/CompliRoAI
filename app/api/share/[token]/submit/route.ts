// Public submit endpoint for magic links.
//
// Routes the submission to a specific handler based on the token's targetType:
//   - intake    → writes a client_intake submission into the org_state JSON
//   - approval  → updates approvalStatus on the targeted aiSystem
//   - report    → no-op (read-only). Returns 405.
//
// After a successful submit the token is marked "used" in the registry.

import { NextResponse } from "next/server"
import { nanoid } from "nanoid"

import {
  hasSupabaseConfig,
  supabaseSelect,
  supabaseUpsert,
} from "@/lib/server/supabase-rest"
import {
  markShareTokenUsed,
  verifyShareToken,
} from "@/lib/server/share-token-store"
import { mergeWithDefault, type AIActState } from "@/lib/server/store"
import { writeFileSafe } from "@/lib/server/fs-safe"
import { promises as fs } from "node:fs"
import path from "node:path"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// ---------- Helpers ----------

type ClientIntakeSubmission = {
  id: string
  submittedAtISO: string
  contactName?: string
  contactEmail?: string
  companyName?: string
  companyCui?: string
  aiSystemsInUse?: string
  observations?: string
  approved?: boolean
}

type ExtendedState = AIActState & {
  clientIntakeSubmissions?: ClientIntakeSubmission[]
}

function cleanString(value: unknown, max = 1000): string | undefined {
  if (typeof value !== "string") return undefined
  const trimmed = value.trim()
  if (!trimmed) return undefined
  return trimmed.slice(0, max)
}

function localStatePath(orgId: string): string {
  return path.join(process.cwd(), ".data", `state-${orgId}.json`)
}

async function readOrgStateForSubmit(orgId: string): Promise<ExtendedState> {
  if (hasSupabaseConfig()) {
    try {
      const rows = await supabaseSelect<{ state: Partial<ExtendedState> | null }>(
        "org_state",
        `select=state&org_id=eq.${encodeURIComponent(orgId)}&limit=1`,
        "public"
      )
      const remote = rows[0]?.state
      if (remote) return mergeWithDefault(remote) as ExtendedState
    } catch {
      // fall through
    }
  }

  try {
    const raw = await fs.readFile(localStatePath(orgId), "utf8")
    return mergeWithDefault(JSON.parse(raw) as Partial<ExtendedState>) as ExtendedState
  } catch {
    return mergeWithDefault(null) as ExtendedState
  }
}

async function writeOrgStateForSubmit(
  orgId: string,
  state: ExtendedState
): Promise<void> {
  if (hasSupabaseConfig()) {
    try {
      await supabaseUpsert(
        "org_state",
        { org_id: orgId, state, updated_at: new Date().toISOString() },
        "public"
      )
      return
    } catch {
      // fall through to local
    }
  }
  await writeFileSafe(localStatePath(orgId), JSON.stringify(state, null, 2))
}

// ---------- Route ----------

export async function POST(
  request: Request,
  context: { params: Promise<{ token: string }> }
) {
  const { token } = await context.params
  const verified = await verifyShareToken(token)
  if (!verified) {
    return NextResponse.json(
      { ok: false, error: "Link invalid sau expirat." },
      { status: 401 }
    )
  }

  const { payload, record } = verified

  if (record?.status === "used") {
    return NextResponse.json(
      { ok: false, error: "Linkul a fost deja folosit." },
      { status: 409 }
    )
  }

  if (payload.targetType === "report") {
    return NextResponse.json(
      { ok: false, error: "Linkurile de tip raport sunt read-only." },
      { status: 405 }
    )
  }

  let body: Record<string, unknown> = {}
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    body = {}
  }

  const nowISO = new Date().toISOString()
  const state = await readOrgStateForSubmit(payload.orgId)

  if (payload.targetType === "intake") {
    const submission: ClientIntakeSubmission = {
      id: `client-intake-${nanoid(10)}`,
      submittedAtISO: nowISO,
      contactName: cleanString(body.contactName, 120),
      contactEmail: cleanString(body.contactEmail, 120),
      companyName: cleanString(body.companyName, 200),
      companyCui: cleanString(body.companyCui, 32),
      aiSystemsInUse: cleanString(body.aiSystemsInUse, 4000),
      observations: cleanString(body.observations, 4000),
    }
    state.clientIntakeSubmissions = [
      submission,
      ...(state.clientIntakeSubmissions ?? []),
    ].slice(0, 100)
    await writeOrgStateForSubmit(payload.orgId, state)
    await markShareTokenUsed(payload.id, nowISO)
    return NextResponse.json({ ok: true, submission })
  }

  if (payload.targetType === "approval") {
    if (!payload.targetId) {
      return NextResponse.json(
        { ok: false, error: "Linkul de aprobare nu are sistem AI țintă." },
        { status: 400 }
      )
    }
    const decision = body.decision === "rejected" ? "rejected" : "approved"
    const approverName = cleanString(body.approverName, 120)
    const approverEmail = cleanString(body.approverEmail, 120)

    const idx = state.aiSystems.findIndex((s) => s.id === payload.targetId)
    if (idx === -1) {
      return NextResponse.json(
        { ok: false, error: "Sistemul AI nu mai există în registru." },
        { status: 404 }
      )
    }
    state.aiSystems[idx] = {
      ...state.aiSystems[idx],
      approvalStatus: decision,
      approvedAtISO: nowISO,
      approvedByEmail: approverEmail ?? approverName ?? "client@magic-link",
    }
    await writeOrgStateForSubmit(payload.orgId, state)
    await markShareTokenUsed(payload.id, nowISO)
    return NextResponse.json({
      ok: true,
      system: state.aiSystems[idx],
      decision,
    })
  }

  return NextResponse.json(
    { ok: false, error: "Tipul de link nu este suportat." },
    { status: 400 }
  )
}
