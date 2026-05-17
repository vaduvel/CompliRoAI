// POST /api/transparency/notices/generate
//
// Body: { systemId, noticeType, placement, language, substitutions? }
// Răspuns: { template: { html, text, shortText, placement, language } }

import { NextResponse } from "next/server"

import { findTemplate } from "@/lib/compliance/transparency-templates"
import type {
  TransparencyLanguage,
  TransparencyNoticeType,
  TransparencyPlacement,
} from "@/lib/compliance/types"
import { readState } from "@/lib/server/store"

const VALID_NOTICE_TYPES: TransparencyNoticeType[] = [
  "chatbot-disclosure",
  "ai-generated-content",
  "deepfake-disclosure",
  "personalization-notice",
  "emotion-recognition-notice",
  "automated-decision-notice",
]

const VALID_PLACEMENTS: TransparencyPlacement[] = [
  "popup",
  "footer",
  "header",
  "email-signature",
  "video-overlay",
  "inline",
]

const VALID_LANGUAGES: TransparencyLanguage[] = ["ro", "en"]

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      systemId?: string
      noticeType?: string
      placement?: string
      language?: string
      substitutions?: {
        contactEmail?: string
        settingsUrl?: string
        modelName?: string
      }
    }

    const { systemId, noticeType, placement, language } = body

    if (!systemId || !noticeType || !placement || !language) {
      return NextResponse.json(
        { error: "systemId, noticeType, placement și language sunt obligatorii" },
        { status: 400 }
      )
    }

    if (!VALID_NOTICE_TYPES.includes(noticeType as TransparencyNoticeType)) {
      return NextResponse.json(
        { error: `noticeType invalid. Valori valide: ${VALID_NOTICE_TYPES.join(", ")}` },
        { status: 400 }
      )
    }
    if (!VALID_PLACEMENTS.includes(placement as TransparencyPlacement)) {
      return NextResponse.json(
        { error: `placement invalid. Valori valide: ${VALID_PLACEMENTS.join(", ")}` },
        { status: 400 }
      )
    }
    if (!VALID_LANGUAGES.includes(language as TransparencyLanguage)) {
      return NextResponse.json(
        { error: `language invalid. Valori valide: ${VALID_LANGUAGES.join(", ")}` },
        { status: 400 }
      )
    }

    const state = await readState()
    const system = (state.aiSystems ?? []).find((s) => s.id === systemId)

    if (!system) {
      return NextResponse.json(
        { error: `Sistemul AI „${systemId}" nu există în inventar` },
        { status: 404 }
      )
    }

    const template = findTemplate(
      noticeType as TransparencyNoticeType,
      placement as TransparencyPlacement,
      language as TransparencyLanguage,
      {
        systemName: system.name,
        vendor: system.vendor || undefined,
        modelName: body.substitutions?.modelName || system.modelType || system.name,
        contactEmail: body.substitutions?.contactEmail,
        settingsUrl: body.substitutions?.settingsUrl,
        dateISO: new Date().toISOString(),
      }
    )

    if (!template) {
      return NextResponse.json(
        { error: "Niciun template disponibil pentru combinația cerută" },
        { status: 404 }
      )
    }

    return NextResponse.json({ template })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
