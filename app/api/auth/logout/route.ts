import { NextResponse } from "next/server"

import { SESSION_COOKIE } from "@/lib/server/auth"

export async function POST() {
  const response = NextResponse.json({ ok: true, message: "Sesiunea a fost inchisa." })
  response.cookies.delete(SESSION_COOKIE)
  return response
}
