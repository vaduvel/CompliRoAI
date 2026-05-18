// POST /api/ai-act/eu-declaration
// Generates an EU Declaration of Conformity (Art. 47 + Annex V) for an AI system.
// Returns markdown content ready for download.
// Sprint 026 — EU AI Act legal coverage matrix + final hardening.

import { NextResponse } from "next/server"

import {
  buildEUDeclarationOfConformity,
  type EUDeclarationInputs,
} from "@/lib/compliance/ai-conformity-assessment"
import {
  readState,
  writeState,
  type GeneratedDocumentRecord,
} from "@/lib/server/store"
import { getEffectiveBranding } from "@/lib/server/white-label"

type RequestBody = {
  systemId?: string
  inputs?: Partial<EUDeclarationInputs>
}

function sanitizeInputs(input: Partial<EUDeclarationInputs>): EUDeclarationInputs | null {
  if (!input) return null
  if (typeof input.uniqueIdentifier !== "string" || !input.uniqueIdentifier.trim()) return null
  if (typeof input.providerAddress !== "string" || !input.providerAddress.trim()) return null
  if (typeof input.placeOfIssue !== "string" || !input.placeOfIssue.trim()) return null
  if (typeof input.signerName !== "string" || !input.signerName.trim()) return null
  if (typeof input.signerTitle !== "string" || !input.signerTitle.trim()) return null

  const cleaned: EUDeclarationInputs = {
    uniqueIdentifier: input.uniqueIdentifier.trim(),
    providerAddress: input.providerAddress.trim(),
    placeOfIssue: input.placeOfIssue.trim(),
    signerName: input.signerName.trim(),
    signerTitle: input.signerTitle.trim(),
    language: input.language === "en" ? "en" : "ro",
  }

  if (input.authorisedRepresentative) {
    const ar = input.authorisedRepresentative
    if (typeof ar.name === "string" && ar.name.trim() && typeof ar.address === "string" && ar.address.trim()) {
      cleaned.authorisedRepresentative = { name: ar.name.trim(), address: ar.address.trim() }
    }
  }

  if (Array.isArray(input.harmonisedStandards)) {
    cleaned.harmonisedStandards = input.harmonisedStandards
      .filter((s): s is string => typeof s === "string")
      .map((s) => s.trim())
      .filter(Boolean)
  }

  if (Array.isArray(input.commonSpecifications)) {
    cleaned.commonSpecifications = input.commonSpecifications
      .filter((s): s is string => typeof s === "string")
      .map((s) => s.trim())
      .filter(Boolean)
  }

  if (input.notifiedBody) {
    const nb = input.notifiedBody
    if (
      typeof nb.name === "string" &&
      nb.name.trim() &&
      typeof nb.identificationNumber === "string" &&
      nb.identificationNumber.trim() &&
      (nb.assessmentProcedure === "Anexa VI — Internal Control" ||
        nb.assessmentProcedure === "Anexa VII — QMS + Tech Doc Assessment")
    ) {
      cleaned.notifiedBody = {
        name: nb.name.trim(),
        identificationNumber: nb.identificationNumber.trim(),
        assessmentProcedure: nb.assessmentProcedure,
        certificateReference:
          typeof nb.certificateReference === "string" && nb.certificateReference.trim()
            ? nb.certificateReference.trim()
            : undefined,
      }
    }
  }

  return cleaned
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody
    const { systemId } = body

    if (!systemId) {
      return NextResponse.json({ error: "systemId este obligatoriu." }, { status: 400 })
    }

    const sanitized = sanitizeInputs(body.inputs ?? {})
    if (!sanitized) {
      return NextResponse.json(
        {
          error:
            "Câmpurile obligatorii Anexa V lipsesc (uniqueIdentifier, providerAddress, placeOfIssue, signerName, signerTitle).",
        },
        { status: 400 },
      )
    }

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

    const doc = buildEUDeclarationOfConformity(
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
      sanitized,
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

    const generatedDocumentId = `eu-doc-${Math.random().toString(36).slice(2, 10)}`
    const generatedDocument: GeneratedDocumentRecord = {
      id: generatedDocumentId,
      systemId: system.id,
      documentType: "eu-doc-art-47",
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
    })
  } catch {
    return NextResponse.json(
      { error: "Eroare la generarea EU Declaration of Conformity." },
      { status: 500 },
    )
  }
}
