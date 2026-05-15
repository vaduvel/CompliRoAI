// Prepare EU AI Database submission JSON
import { NextResponse } from "next/server"

import { generateEUDatabaseEntry } from "@/lib/compliance/ai-act-exporter"
import type { AISystemPurpose } from "@/lib/compliance/types"

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const { systemName, purpose, description, humanOversightMeasures, memberStates } = body
    if (!systemName?.trim()) {
      return NextResponse.json(
        { error: "Numele sistemului este obligatoriu." },
        { status: 400 }
      )
    }
    if (!purpose) {
      return NextResponse.json(
        { error: "Scopul sistemului este obligatoriu." },
        { status: 400 }
      )
    }

    // orgName from request body or header
    const { headers } = await import("next/headers")
    const h = await headers()
    const orgNameFromHeader = h.get("x-aiact-org-name") ?? ""
    const emailFromHeader = h.get("x-aiact-user-email") ?? undefined

    const entry = generateEUDatabaseEntry({
      systemName: systemName.trim(),
      purpose: purpose as AISystemPurpose,
      description,
      orgName: body.orgName?.trim() || orgNameFromHeader,
      orgAddress: body.orgAddress,
      orgCountry: body.orgCountry ?? "RO",
      orgEmail: body.orgEmail ?? emailFromHeader,
      memberStates,
      humanOversightMeasures,
    })

    return NextResponse.json({ entry })
  } catch {
    return NextResponse.json(
      { error: "Nu am putut pregăti înregistrarea." },
      { status: 500 }
    )
  }
}
