import { NextResponse } from "next/server"

import {
  SESSION_COOKIE,
  authenticateUser,
  createSessionToken,
  getSessionCookieOptions,
} from "@/lib/server/auth"
import {
  listUserMemberships,
  pickDefaultWorkspace,
  resolveWorkspaceMode,
} from "@/lib/server/tenancy"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const email = typeof body.email === "string" ? body.email.trim() : ""
    const password = typeof body.password === "string" ? body.password : ""

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email si parola sunt obligatorii." },
        { status: 400 }
      )
    }

    let resolved
    try {
      resolved = await authenticateUser(email, password)
    } catch (err) {
      const msg = err instanceof Error ? err.message : ""
      if (msg === "AUTH_INVALID_CREDENTIALS") {
        return NextResponse.json(
          { error: "Email sau parola incorecta." },
          { status: 401 }
        )
      }
      throw err
    }

    // Pick default workspace (owner first, otherwise first active membership).
    const memberships = await listUserMemberships(resolved.userId)
    const defaultMembership = pickDefaultWorkspace(memberships)
    const orgId = defaultMembership?.orgId ?? resolved.orgId
    const orgName = defaultMembership?.orgName ?? resolved.orgName
    const workspaceMode = await resolveWorkspaceMode(resolved.userId)

    const token = createSessionToken({
      userId: resolved.userId,
      orgId,
      email: resolved.email,
      orgName,
      workspaceMode,
    })

    const destination =
      workspaceMode === "cabinet" ? "/dashboard/portofoliu" : "/dashboard"

    const response = NextResponse.json({
      ok: true,
      orgId,
      orgName,
      workspaceMode,
      destination,
    })
    response.cookies.set(SESSION_COOKIE, token, getSessionCookieOptions())
    return response
  } catch {
    return NextResponse.json(
      { error: "Autentificarea nu a putut fi pornita." },
      { status: 500 }
    )
  }
}
