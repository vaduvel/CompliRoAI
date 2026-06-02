import { NextResponse } from "next/server"
import { cookies } from "next/headers"

import {
  SESSION_COOKIE,
  createSessionToken,
  getSessionCookieOptions,
  verifySessionToken,
} from "@/lib/server/auth"
import {
  listUserMemberships,
  pickDefaultWorkspace,
  resolveWorkspaceMode,
} from "@/lib/server/tenancy"

export async function POST() {
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

    const memberships = await listUserMemberships(session.userId)
    const target = pickDefaultWorkspace(memberships)
    if (!target) {
      return NextResponse.json(
        { error: "Nu am gasit workspace-ul principal al cabinetului." },
        { status: 404 }
      )
    }

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
      destination: "/dashboard/portofoliu",
    })
    response.cookies.set(SESSION_COOKIE, token, getSessionCookieOptions())
    return response
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Eroare la revenirea in workspace-ul cabinetului."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
