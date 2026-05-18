// POST /api/ai-act/ce-marking
// Generates a CE marking checklist (Art. 48) document for an AI system.
// Sprint 026 — EU AI Act legal coverage matrix + final hardening.

import { NextResponse } from "next/server"

import {
  buildCEMarkingChecklistDocument,
  evaluateCEMarkingChecklist,
  type CEMarkingChecklistAnswers,
} from "@/lib/compliance/ai-conformity-assessment"
import {
  readState,
  writeState,
  type GeneratedDocumentRecord,
} from "@/lib/server/store"
import { getEffectiveBranding } from "@/lib/server/white-label"

type RequestBody = {
  systemId?: string
  answers?: CEMarkingChecklistAnswers
  hasPhysicalProduct?: boolean
  hasNotifiedBody?: boolean
}

function sanitizeAnswers(input: unknown): CEMarkingChecklistAnswers {
  const out: CEMarkingChecklistAnswers = {}
  if (!input || typeof input !== "object") return out
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (typeof key !== "string") continue
    if (value === "yes" || value === "no" || value === "na") {
      out[key] = value
    }
  }
  return out
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody
    const { systemId } = body

    if (!systemId) {
      return NextResponse.json({ error: "systemId este obligatoriu." }, { status: 400 })
    }

    const answers = sanitizeAnswers(body.answers)
    const hasPhysicalProduct = body.hasPhysicalProduct === true
    const hasNotifiedBody = body.hasNotifiedBody === true

    const { headers } = await import("next/headers")
    const h = await headers()
    const orgName = h.get("x-aiact-org-name") ?? undefined
    const orgId = h.get("x-aiact-org-id") ?? undefined

    const state = await readState()
    const system = state.aiSystems.find((s) => s.id === systemId)
    if (!system) {
      return NextResponse.json({ error: "Sistem AI negăsit." }, { status: 404 })
    }

    const branding = orgId ? await getEffectiveBranding(orgId) : null

    const result = evaluateCEMarkingChecklist(answers, {
      hasPhysicalProduct,
      hasNotifiedBody,
    })

    const doc = buildCEMarkingChecklistDocument(
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
      answers,
      { hasPhysicalProduct, hasNotifiedBody },
      orgName ?? "Organizație neidentificată",
      branding
        ? {
            brandName: branding.brandName,
            logoUrl: branding.logoUrl,
            signerName: branding.signerName,
            signerTitle: branding.signerTitle,
            contactEmail: branding.contactEmail,
            website: branding.website,
            isCustom: branding.isCustom,
          }
        : undefined,
    )

    const generatedDocumentId = `ce-marking-${Math.random().toString(36).slice(2, 10)}`
    const generatedDocument: GeneratedDocumentRecord = {
      id: generatedDocumentId,
      systemId: system.id,
      documentType: "ce-marking-art-48-checklist",
      content: doc.content,
      createdAtISO: doc.generatedAtISO,
      approvalStatus: "pending",
    }

    const updatedState = {
      ...state,
      generatedDocuments: [generatedDocument, ...state.generatedDocuments].slice(0, 150),
    }
    await writeState(updatedState)

    return NextResponse.json({
      ok: true,
      title: doc.title,
      content: doc.content,
      generatedAtISO: doc.generatedAtISO,
      recordId: generatedDocumentId,
      result,
    })
  } catch {
    return NextResponse.json(
      { error: "Eroare la generarea checklist-ului CE marking." },
      { status: 500 },
    )
  }
}
