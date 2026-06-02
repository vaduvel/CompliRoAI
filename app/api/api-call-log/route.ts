import { NextResponse } from "next/server"

import { getOrgContext } from "@/lib/server/org-context"
import { readState } from "@/lib/server/store"

export async function GET() {
  try {
    await getOrgContext()
    const state = await readState()
    return NextResponse.json({
      logs: (state.apiCallLogs ?? []).slice(0, 20),
    })
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Nu am putut incarca apelurile API."
    const status = message.includes("Missing org context") ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
