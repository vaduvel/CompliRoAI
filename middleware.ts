import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const SESSION_COOKIE = "aiact_session"

function getSessionSecret(): string {
  const s = process.env.AIACT_SESSION_SECRET?.trim()
  if (s) return s
  if (process.env.NODE_ENV === "production") {
    throw new Error("AIACT_SESSION_SECRET missing in production")
  }
  return "dev-secret-change-me"
}

async function verifyToken(
  token: string
): Promise<{ userId: string; orgId: string; email: string; orgName: string } | null> {
  try {
    const secret = getSessionSecret()
    const dotIndex = token.lastIndexOf(".")
    if (dotIndex === -1) return null
    const encoded = token.slice(0, dotIndex)
    const sig = token.slice(dotIndex + 1)

    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    )
    const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(encoded))
    const uint8 = new Uint8Array(signatureBuffer)
    let binary = ""
    for (const byte of uint8) binary += String.fromCharCode(byte)
    const expectedSig = btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "")
    if (sig !== expectedSig) return null

    const pad = encoded.length % 4
    const fixed = pad
      ? encoded.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat(4 - pad)
      : encoded.replace(/-/g, "+").replace(/_/g, "/")
    const payload = JSON.parse(atob(fixed)) as {
      userId: string; orgId: string; email: string; orgName: string; exp: number
    }
    if (payload.exp < Date.now()) return null
    return { userId: payload.userId, orgId: payload.orgId, email: payload.email, orgName: payload.orgName }
  } catch {
    return null
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isApi = pathname.startsWith("/api/")

  const sessionCookie = request.cookies.get(SESSION_COOKIE)
  if (!sessionCookie?.value) {
    if (isApi) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    return NextResponse.redirect(new URL("/login", request.url))
  }

  const session = await verifyToken(sessionCookie.value)
  if (!session) {
    if (isApi) {
      const res = NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      res.cookies.delete(SESSION_COOKIE)
      return res
    }
    const res = NextResponse.redirect(new URL("/login", request.url))
    res.cookies.delete(SESSION_COOKIE)
    return res
  }

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set("x-aiact-org-id", session.orgId)
  requestHeaders.set("x-aiact-user-id", session.userId)
  requestHeaders.set("x-aiact-user-email", session.email)
  requestHeaders.set("x-aiact-org-name", session.orgName)

  return NextResponse.next({ request: { headers: requestHeaders } })
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/api/((?!auth).*)",
  ],
}
