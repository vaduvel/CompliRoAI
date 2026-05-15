import { NextResponse } from "next/server"

import {
  SESSION_COOKIE,
  authenticateUser,
  createSessionToken,
} from "@/lib/server/auth"

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000

function getSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: SESSION_TTL_MS / 1000,
    path: "/",
  }
}

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

    const token = createSessionToken({
      userId: resolved.userId,
      orgId: resolved.orgId,
      email: resolved.email,
      orgName: resolved.orgName,
    })

    const response = NextResponse.json({
      ok: true,
      orgId: resolved.orgId,
      orgName: resolved.orgName,
      workspaceMode: "solo",
      destination: "/dashboard",
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
