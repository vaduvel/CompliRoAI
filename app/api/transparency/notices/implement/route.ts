// POST   /api/transparency/notices/implement
//   Body: { systemId, noticeType, placement, language, notes? }
//   Marchează un notice ca implementat și salvează în state.
//
// DELETE /api/transparency/notices/implement?id=...
//   Elimină marcajul de implementare (revine la "pending").

import { NextResponse } from "next/server"
import { nanoid } from "nanoid"

import { getOrgContext } from "@/lib/server/org-context"
import { readState, writeState } from "@/lib/server/store"
import type {
  TransparencyImplementation,
  TransparencyLanguage,
  TransparencyNoticeType,
  TransparencyPlacement,
} from "@/lib/compliance/types"

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
      notes?: string
    }

    const { systemId, noticeType, placement, language, notes } = body

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

    const ctx = await getOrgContext()
    const state = await readState()
    const system = (state.aiSystems ?? []).find((s) => s.id === systemId)

    if (!system) {
      return NextResponse.json(
        { error: `Sistemul AI „${systemId}" nu există în inventar` },
        { status: 404 }
      )
    }

    if (!state.transparencyImplementations) {
      state.transparencyImplementations = []
    }

    // Verifică dacă există deja o implementare pentru combinația
    // systemId + noticeType. Dacă da, actualizează placement/language/notes.
    const existing = state.transparencyImplementations.find(
      (i) => i.systemId === systemId && i.noticeType === noticeType
    )

    let implementation: TransparencyImplementation
    if (existing) {
      existing.placement = placement as TransparencyPlacement
      existing.language = language as TransparencyLanguage
      existing.implementedAtISO = new Date().toISOString()
      existing.implementedByEmail = ctx.email
      if (typeof notes === "string") existing.notes = notes
      implementation = existing
    } else {
      implementation = {
        id: nanoid(),
        systemId,
        noticeType: noticeType as TransparencyNoticeType,
        placement: placement as TransparencyPlacement,
        language: language as TransparencyLanguage,
        implementedAtISO: new Date().toISOString(),
        implementedByEmail: ctx.email,
        notes: typeof notes === "string" ? notes : undefined,
      }
      state.transparencyImplementations.push(implementation)
    }

    await writeState(state)

    return NextResponse.json({ implementation })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url)
    const id = url.searchParams.get("id")
    const systemId = url.searchParams.get("systemId")
    const noticeType = url.searchParams.get("noticeType")

    if (!id && !(systemId && noticeType)) {
      return NextResponse.json(
        { error: "Trimite ?id=... sau ?systemId=...&noticeType=..." },
        { status: 400 }
      )
    }

    const state = await readState()
    const before = (state.transparencyImplementations ?? []).length
    state.transparencyImplementations = (state.transparencyImplementations ?? []).filter(
      (impl) => {
        if (id) return impl.id !== id
        return !(impl.systemId === systemId && impl.noticeType === noticeType)
      }
    )

    if (state.transparencyImplementations.length === before) {
      return NextResponse.json({ error: "Implementare inexistentă" }, { status: 404 })
    }

    await writeState(state)
    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
