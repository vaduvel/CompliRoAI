import { NextResponse } from "next/server"

import type { AISystemImportDraft } from "@/lib/client-import"
import { getOrgContext } from "@/lib/server/org-context"
import {
  buildPortfolioImportActor,
  commitAISystemImportRows,
  loadCabinetPortfolioImportTargets,
  persistChangedPortfolioImportTargets,
} from "@/lib/server/portfolio-import"
import { persistAIUseCasesForChangedTargets } from "@/lib/server/ai-use-case-store"

export async function PUT(request: Request) {
  try {
    const ctx = await getOrgContext()
    if (ctx.workspaceMode !== "cabinet") {
      return NextResponse.json(
        { error: "Doar cabinetele pot importa sisteme AI pe clienți." },
        { status: 403 }
      )
    }

    const body = (await request.json().catch(() => ({}))) as {
      rows?: AISystemImportDraft[]
      importId?: string
    }
    const rows = Array.isArray(body.rows) ? body.rows : []
    if (rows.length === 0) {
      return NextResponse.json({ error: "Niciun sistem AI de importat." }, { status: 400 })
    }
    if (rows.length > 500) {
      return NextResponse.json(
        { error: "Importul acceptă maximum 500 de sisteme AI per fișier." },
        { status: 400 }
      )
    }

    const targets = await loadCabinetPortfolioImportTargets(ctx)
    const result = commitAISystemImportRows({
      targets,
      rows,
      actor: buildPortfolioImportActor(ctx),
      nowISO: new Date().toISOString(),
      importId: body.importId ?? `imp-ai-systems-${Date.now()}`,
    })

    await persistChangedPortfolioImportTargets(targets)
    let aiUseCaseTablePersisted = true
    let aiUseCasePersistenceWarning: string | undefined
    try {
      await persistAIUseCasesForChangedTargets(targets)
    } catch (err) {
      aiUseCaseTablePersisted = false
      aiUseCasePersistenceWarning =
        err instanceof Error ? err.message : "AIUseCase Supabase persistence failed."
    }
    return NextResponse.json({
      ...result,
      aiUseCaseTablePersisted,
      aiUseCasePersistenceWarning,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Eroare la importul sistemelor AI."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
