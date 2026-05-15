import { NextResponse } from "next/server"

import {
  createSessionToken,
  getUserByEmail,
  verifyPassword,
  SESSION_COOKIE,
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

    const user = await getUserByEmail(email)
    if (!user || !verifyPassword(password, user.passwordHash, user.salt)) {
      return NextResponse.json(
        { error: "Email sau parola incorecta." },
        { status: 401 }
      )
    }

    const orgId = user.orgId ?? `org-${user.id}`
    const orgName = user.orgName ?? ""

    const token = createSessionToken({
      userId: user.id,
      orgId,
      email: user.email,
      orgName,
    })

    const response = NextResponse.json({
      ok: true,
      orgId,
      orgName,
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
