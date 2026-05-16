// Portfolio CRUD — list + add clients for cabinet users.
//
// Authorization: only cabinet users (workspaceMode=cabinet) can call these.
//
// Listing returns the cabinet's portfolio: every org where the current user has
// role=partner_manager (i.e. is the consultant).
//
// Adding a client creates a new org and grants the cabinet user partner_manager
// membership on it.

import { NextResponse } from "next/server"

import { getOrgContext } from "@/lib/server/org-context"
import {
  createClientOrg,
  listUserMemberships,
} from "@/lib/server/tenancy"
import { loadOrgStateFromSupabase } from "@/lib/server/supabase-org-state"
import type { AIActState } from "@/lib/server/store"

type ClientRow = {
  orgId: string
  orgName: string
  membershipId: string
  createdAtISO: string
  cui?: string
  aiSystemsCount: number
  literacyTrainingsCount: number
  onboardingCompleted: boolean
}

export async function GET() {
  try {
    const ctx = await getOrgContext()
    if (ctx.workspaceMode !== "cabinet") {
      return NextResponse.json(
        { error: "Doar utilizatorii in mod cabinet pot accesa portofoliul." },
        { status: 403 }
      )
    }

    const memberships = await listUserMemberships(ctx.userId)
    const clientMemberships = memberships.filter(
      (m) => m.status === "active" && m.role === "partner_manager"
    )

    const clients: ClientRow[] = await Promise.all(
      clientMemberships.map(async (m) => {
        let state: Partial<AIActState> | null = null
        try {
          state = await loadOrgStateFromSupabase<AIActState>(m.orgId)
        } catch {
          state = null
        }
        const cui =
          state &&
          typeof state === "object" &&
          "clientMeta" in state &&
          state.clientMeta &&
          typeof state.clientMeta === "object" &&
          "cui" in state.clientMeta &&
          typeof (state.clientMeta as { cui?: unknown }).cui === "string"
            ? ((state.clientMeta as { cui: string }).cui)
            : undefined
        return {
          orgId: m.orgId,
          orgName: m.orgName,
          membershipId: m.membershipId,
          createdAtISO: m.createdAtISO,
          cui,
          aiSystemsCount: Array.isArray(state?.aiSystems) ? state!.aiSystems!.length : 0,
          literacyTrainingsCount: Array.isArray(state?.literacyRecords)
            ? state!.literacyRecords!.length
            : 0,
          onboardingCompleted: state?.onboarding?.completed === true,
        }
      })
    )

    return NextResponse.json({ clients, total: clients.length })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Eroare la incarcarea portofoliului."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getOrgContext()
    if (ctx.workspaceMode !== "cabinet") {
      return NextResponse.json(
        { error: "Doar cabinetele pot adauga clienti." },
        { status: 403 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const orgName = typeof body?.orgName === "string" ? body.orgName.trim() : ""
    const cuiRaw = typeof body?.cui === "string" ? body.cui.trim() : ""
    const cui = cuiRaw && /^(RO)?\d{2,10}$/i.test(cuiRaw) ? cuiRaw.toUpperCase() : undefined

    if (orgName.length < 2) {
      return NextResponse.json(
        { error: "Numele firmei trebuie sa aiba minim 2 caractere." },
        { status: 400 }
      )
    }
    if (cuiRaw && !cui) {
      return NextResponse.json(
        { error: "CUI invalid. Format: RO12345678 sau 12345678." },
        { status: 400 }
      )
    }

    const created = await createClientOrg({
      cabinetUserId: ctx.userId,
      orgName,
      cui,
    })

    return NextResponse.json({
      ok: true,
      client: {
        orgId: created.orgId,
        orgName: created.orgName,
        membershipId: created.membershipId,
        cui,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Eroare la adaugarea clientului."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
