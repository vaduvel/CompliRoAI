import { NextResponse } from "next/server"
import { cookies } from "next/headers"

import {
  SESSION_COOKIE,
  createSessionToken,
  getSessionCookieOptions,
  verifySessionToken,
} from "@/lib/server/auth"
import { listUserMemberships, resolveWorkspaceMode } from "@/lib/server/tenancy"

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get(SESSION_COOKIE)
    if (!sessionCookie?.value) {
      return NextResponse.json({ error: "Sesiune invalida." }, { status: 401 })
    }

    const session = verifySessionToken(sessionCookie.value)
    if (!session) {
      return NextResponse.json({ error: "Sesiune invalida." }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const orgId = typeof body?.orgId === "string" ? body.orgId.trim() : ""
    if (!orgId) {
      return NextResponse.json(
        { error: "orgId este obligatoriu." },
        { status: 400 }
      )
    }

    const memberships = await listUserMemberships(session.userId)
    const target = memberships.find((m) => m.orgId === orgId && m.status === "active")
    if (!target) {
      return NextResponse.json(
        { error: "Nu esti membru al organizatiei selectate." },
        { status: 403 }
      )
    }

    // Re-evaluate workspace mode (it depends on the user's roles across all orgs,
    // not just the active one).
    const workspaceMode = await resolveWorkspaceMode(session.userId)

    const token = createSessionToken({
      userId: session.userId,
      orgId: target.orgId,
      email: session.email,
      orgName: target.orgName,
      workspaceMode,
    })

    const response = NextResponse.json({
      ok: true,
      orgId: target.orgId,
      orgName: target.orgName,
      role: target.role,
      workspaceMode,
    })
    response.cookies.set(SESSION_COOKIE, token, getSessionCookieOptions())
    return response
  } catch (error) {
    const message = error instanceof Error ? error.message : "Eroare la schimbarea workspace-ului."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
