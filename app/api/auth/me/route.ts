import { NextResponse } from "next/server"
import { cookies } from "next/headers"

import {
  SESSION_COOKIE,
  verifySessionToken,
  type WorkspaceMode,
} from "@/lib/server/auth"
import { listUserMemberships } from "@/lib/server/tenancy"

export async function GET() {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get(SESSION_COOKIE)
    if (!sessionCookie?.value) {
      return NextResponse.json({ user: null }, { status: 401 })
    }

    const session = verifySessionToken(sessionCookie.value)
    if (!session) {
      return NextResponse.json({ user: null }, { status: 401 })
    }

    let memberships: Awaited<ReturnType<typeof listUserMemberships>> = []
    try {
      memberships = await listUserMemberships(session.userId)
    } catch {
      // Supabase down or not configured — return minimal payload
    }

    const workspaceMode: WorkspaceMode = session.workspaceMode ?? "solo"

    return NextResponse.json({
      user: {
        userId: session.userId,
        email: session.email,
        orgId: session.orgId,
        orgName: session.orgName,
        workspaceMode,
      },
      workspaces: memberships.map((m) => ({
        orgId: m.orgId,
        orgName: m.orgName,
        role: m.role,
        status: m.status,
        membershipId: m.membershipId,
        isActive: m.orgId === session.orgId,
      })),
    })
  } catch {
    return NextResponse.json({ error: "Sesiunea nu poate fi verificata." }, { status: 500 })
  }
}
