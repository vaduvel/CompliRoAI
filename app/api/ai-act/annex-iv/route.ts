// POST /api/ai-act/annex-iv
// Generates an Annex IV technical documentation template for a given AI system.
// Returns markdown content ready for download.

import { NextResponse } from "next/server"

import { buildAnnexIVDocument } from "@/lib/compliance/ai-conformity-assessment"
import { readState, writeState, type GeneratedDocumentRecord } from "@/lib/server/store"

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { systemId?: string }
    const { systemId } = body

    if (!systemId) {
      return NextResponse.json({ error: "systemId este obligatoriu." }, { status: 400 })
    }

    const { headers } = await import("next/headers")
    const h = await headers()
    const orgName = h.get("x-aiact-org-name") ?? undefined

    const state = await readState()
    const system = state.aiSystems.find((s) => s.id === systemId)
    if (!system) {
      return NextResponse.json({ error: "Sistem AI negăsit." }, { status: 404 })
    }

    const doc = buildAnnexIVDocument(
      {
        id: system.id,
        name: system.name,
        vendor: system.vendor,
        modelType: system.modelType,
        purpose: system.purpose,
        riskLevel: system.riskLevel,
        usesPersonalData: system.usesPersonalData,
        makesAutomatedDecisions: system.makesAutomatedDecisions,
        impactsRights: system.impactsRights,
        hasHumanReview: system.hasHumanReview,
        annexIIIHint: system.annexIIIHint,
        createdAtISO: system.createdAtISO,
      },
      {}, // empty answers — template mode
      orgName
    )

    const generatedDocumentId = `generated-doc-${Math.random().toString(36).slice(2, 10)}`
    const generatedDocument: GeneratedDocumentRecord = {
      id: generatedDocumentId,
      systemId: system.id,
      documentType: "annex-iv",
      content: doc.content,
      createdAtISO: doc.generatedAtISO,
      approvalStatus: "pending",
    }

    const updatedState = {
      ...state,
      generatedDocuments: [
        generatedDocument,
        ...state.generatedDocuments,
      ].slice(0, 150),
    }
    await writeState(updatedState)

    return NextResponse.json({
      ok: true,
      title: doc.title,
      content: doc.content,
      generatedAtISO: doc.generatedAtISO,
      recordId: generatedDocumentId,
    })
  } catch {
    return NextResponse.json(
      { error: "Eroare la generarea Anexei IV." },
      { status: 500 }
    )
  }
}
