import { NextResponse } from "next/server"

import type { ImportCenterTabId } from "@/lib/client-import"
import { getOrgContext } from "@/lib/server/org-context"
import {
  buildPortfolioImportActor,
  commitNoFileImportChecklist,
  loadCabinetPortfolioImportTargets,
  persistChangedPortfolioImportTargets,
} from "@/lib/server/portfolio-import"
import {
  loadOrgStateFromSupabase,
  persistOrgStateToSupabase,
} from "@/lib/server/supabase-org-state"
import { mergeWithDefault, type AIActState } from "@/lib/server/store"

const IMPORT_TYPES: ImportCenterTabId[] = [
  "clients",
  "ai_systems",
  "vendors_models",
  "ropa",
  "ai_literacy",
]

function isImportType(value: unknown): value is ImportCenterTabId {
  return typeof value === "string" && IMPORT_TYPES.includes(value as ImportCenterTabId)
}

export async function POST(request: Request) {
  try {
    const ctx = await getOrgContext()
    if (ctx.workspaceMode !== "cabinet") {
      return NextResponse.json(
        { error: "Doar cabinetele pot crea checklisturi fără fișier pe clienți." },
        { status: 403 }
      )
    }

    const body = (await request.json().catch(() => ({}))) as {
      importType?: unknown
      clientOrgId?: unknown
      importId?: string
    }
    if (!isImportType(body.importType)) {
      return NextResponse.json({ error: "Tip import invalid." }, { status: 400 })
    }
    if (body.importType === "clients") {
      const rawState = await loadOrgStateFromSupabase<Partial<AIActState>>(ctx.orgId).catch(() => null)
      const target = {
        orgId: ctx.orgId,
        orgName: ctx.orgName || "Cabinet",
        state: mergeWithDefault(rawState),
        changed: false,
      }
      const result = commitNoFileImportChecklist({
        target,
        importType: body.importType,
        actor: buildPortfolioImportActor(ctx),
        nowISO: new Date().toISOString(),
        importId: body.importId ?? `imp-no-file-${body.importType}-${Date.now()}`,
      })

      await persistOrgStateToSupabase(target.orgId, target.state)
      return NextResponse.json(result)
    }

    if (typeof body.clientOrgId !== "string" || !body.clientOrgId.trim()) {
      return NextResponse.json(
        { error: "Alege clientul pentru care creezi checklistul fără fișier." },
        { status: 400 }
      )
    }

    const targets = await loadCabinetPortfolioImportTargets(ctx)
    const target = targets.find((candidate) => candidate.orgId === body.clientOrgId)
    if (!target) {
      return NextResponse.json({ error: "Clientul nu există în portofoliul cabinetului." }, { status: 404 })
    }

    const result = commitNoFileImportChecklist({
      target,
      importType: body.importType,
      actor: buildPortfolioImportActor(ctx),
      nowISO: new Date().toISOString(),
      importId: body.importId ?? `imp-no-file-${body.importType}-${Date.now()}`,
    })

    await persistChangedPortfolioImportTargets(targets)
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Eroare la checklistul fără fișier."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
