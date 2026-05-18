/**
 * Sprint 020 — AI Incident markdown / PDF export.
 *
 * GET /api/ai-incidents/:id/export                                → text/markdown
 * GET /api/ai-incidents/:id/export?format=pdf                     → application/pdf
 * GET /api/ai-incidents/:id/export?format=md&doc=authority-notif  → narrative Art. 73(5)
 */
import { NextResponse } from "next/server"

import { generateAuthorityNotification } from "@/lib/compliance/ai-incident-narrative"
import { getOrgContext } from "@/lib/server/org-context"
import {
  buildIncidentMarkdown,
  getIncidentById,
} from "@/lib/server/ai-incident-store"
import { readState } from "@/lib/server/store"

export const runtime = "nodejs"

function slug(value: string) {
  return (
    value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "incident"
  )
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await getOrgContext()
    const { id } = await params
    const record = await getIncidentById(ctx.orgId, id)
    if (!record) {
      return NextResponse.json(
        { error: "Incident AI inexistent." },
        { status: 404 },
      )
    }

    const state = await readState()
    const systemName = state.aiSystems?.find(
      (s) => s.id === record.linkedAISystemId,
    )?.name

    const url = new URL(request.url)
    const docType = url.searchParams.get("doc") ?? "incident"

    const markdown =
      docType === "authority-notif"
        ? generateAuthorityNotification(
            record,
            ctx.orgName ?? "",
            systemName,
          )
        : buildIncidentMarkdown(record, ctx.orgName ?? "", systemName)

    const fileStem = `ai-incident-${slug(ctx.orgName ?? "org")}-${slug(record.title)}-${new Date()
      .toISOString()
      .slice(0, 10)}`

    const format = url.searchParams.get("format")
    if (format === "pdf") {
      const { generatePdfFromMarkdown } = await import(
        "@/lib/server/pdf-generator"
      )
      const { getEffectiveBranding } = await import("@/lib/server/white-label")
      const branding = await getEffectiveBranding(ctx.orgId).catch(() => null)
      const pdf = await generatePdfFromMarkdown(markdown, {
        orgName: ctx.orgName ?? "",
        title:
          docType === "authority-notif"
            ? `Notificare Art. 73 — ${record.title}`
            : `Incident AI — ${record.title}`,
        branding,
        signerName: branding?.signerName ?? null,
      })
      return new NextResponse(new Uint8Array(pdf), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${fileStem}-${docType}.pdf"`,
          "Cache-Control": "no-store",
        },
      })
    }

    return new NextResponse(markdown, {
      status: 200,
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileStem}-${docType}.md"`,
        "Cache-Control": "no-store",
      },
    })
  } catch {
    return NextResponse.json(
      { error: "Nu am putut exporta incidentul AI." },
      { status: 500 },
    )
  }
}
