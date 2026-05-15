import { NextResponse } from "next/server"

import {
  createSessionToken,
  createUser,
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
    const orgName = typeof body.orgName === "string" ? body.orgName.trim() : ""

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email si parola sunt obligatorii." },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Parola trebuie sa aiba cel putin 8 caractere." },
        { status: 400 }
      )
    }

    const { user, orgId } = await createUser(email, password, orgName)

    const token = createSessionToken({
      userId: user.id,
      orgId,
      email: user.email,
      orgName: user.orgName ?? "",
    })

    const response = NextResponse.json({
      ok: true,
      orgId,
      orgName: user.orgName ?? "",
      workspaceMode: "solo",
    })
    response.cookies.set(SESSION_COOKIE, token, getSessionCookieOptions())
    return response
  } catch (error) {
    const message = error instanceof Error ? error.message : "Eroare la inregistrare."
    if (
      message === "AUTH_EMAIL_ALREADY_REGISTERED" ||
      message.includes("deja înregistrată") ||
      message.includes("deja inregistrata")
    ) {
      return NextResponse.json(
        { error: "Adresa de email este deja inregistrata." },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
