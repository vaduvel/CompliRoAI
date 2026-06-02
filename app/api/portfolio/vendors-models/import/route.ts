import { NextResponse } from "next/server"

import type { VendorModelImportDraft } from "@/lib/client-import"
import { getOrgContext } from "@/lib/server/org-context"
import {
  buildPortfolioImportActor,
  commitVendorModelImportRows,
  loadCabinetPortfolioImportTargets,
  persistChangedPortfolioImportTargets,
} from "@/lib/server/portfolio-import"

export async function PUT(request: Request) {
  try {
    const ctx = await getOrgContext()
    if (ctx.workspaceMode !== "cabinet") {
      return NextResponse.json(
        { error: "Doar cabinetele pot importa furnizori/modele pe clienți." },
        { status: 403 }
      )
    }

    const body = (await request.json().catch(() => ({}))) as {
      rows?: VendorModelImportDraft[]
      importId?: string
    }
    const rows = Array.isArray(body.rows) ? body.rows : []
    if (rows.length === 0) {
      return NextResponse.json({ error: "Niciun vendor/model de importat." }, { status: 400 })
    }
    if (rows.length > 500) {
      return NextResponse.json(
        { error: "Importul acceptă maximum 500 de furnizori/modele per fișier." },
        { status: 400 }
      )
    }

    const targets = await loadCabinetPortfolioImportTargets(ctx)
    const result = commitVendorModelImportRows({
      targets,
      rows,
      actor: buildPortfolioImportActor(ctx),
      nowISO: new Date().toISOString(),
      importId: body.importId ?? `imp-vendors-${Date.now()}`,
    })

    await persistChangedPortfolioImportTargets(targets)
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Eroare la importul furnizorilor/modelelor."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
