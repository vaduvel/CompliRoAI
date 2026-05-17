// Sprint 014 — GET /api/exports/audit-pack/pdf
//   → Returns the audit pack summary as a single PDF (manifest summary +
//     all markdown files concatenated cu branding cabinet aplicat).
//   → ZIP rămâne la /api/exports/audit-pack pentru audit-uri formale care cer
//     fișiere separate cu hash chain; PDF e pentru livrare client-facing rapidă.

import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

import { buildAuditPack } from "@/lib/server/audit-pack-builder"
import { getOrgContext } from "@/lib/server/org-context"
import { generatePdfFromMarkdown } from "@/lib/server/pdf-generator"
import { getEffectiveBranding } from "@/lib/server/white-label"
import { listUserMemberships } from "@/lib/server/tenancy"
import JSZip from "jszip"

async function authorizeClientOrg(
  cabinetUserId: string,
  clientOrgId: string
): Promise<boolean> {
  const memberships = await listUserMemberships(cabinetUserId)
  return memberships.some(
    (m) => m.orgId === clientOrgId && m.status === "active" && m.role === "partner_manager"
  )
}

/**
 * Extract markdown files from a JSZip ZIP buffer (audit pack).
 */
async function extractMarkdownFromZip(zipBuffer: Buffer): Promise<{ path: string; content: string }[]> {
  const zip = await JSZip.loadAsync(zipBuffer)
  const entries: { path: string; content: string }[] = []
  // Stable order: alphabetic by path.
  const paths = Object.keys(zip.files).filter((p) => p.endsWith(".md")).sort()
  for (const p of paths) {
    const entry = zip.file(p)
    if (!entry) continue
    const content = await entry.async("string")
    entries.push({ path: p, content })
  }
  return entries
}

export async function GET(request: NextRequest) {
  let ctx
  try {
    ctx = await getOrgContext()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const url = new URL(request.url)
  const clientOrgId = url.searchParams.get("clientOrgId")

  if (clientOrgId) {
    if (ctx.workspaceMode !== "cabinet") {
      return NextResponse.json(
        { error: "Doar cabinetele pot genera pack-uri pentru clienți." },
        { status: 403 }
      )
    }
    const ok = await authorizeClientOrg(ctx.userId, clientOrgId)
    if (!ok) {
      return NextResponse.json(
        { error: "Clientul nu este în portofoliul tău." },
        { status: 403 }
      )
    }
  }

  try {
    const pack = await buildAuditPack(ctx.orgId, {
      clientOrgId: clientOrgId ?? undefined,
      issuedByUserId: ctx.userId,
      issuedByUserEmail: ctx.email,
      workspaceMode: ctx.workspaceMode,
      currentOrgId: ctx.orgId,
    })

    const branding = await getEffectiveBranding(ctx.orgId).catch(() => null)
    const mdEntries = await extractMarkdownFromZip(pack.zipBuffer)

    const orgLine = clientOrgId ? `Client ${clientOrgId}` : ctx.orgName
    const combined = [
      `# Audit Pack — ${orgLine}`,
      ``,
      `Generat la ${new Date(pack.manifest.generatedAt).toLocaleDateString("ro-RO")}.`,
      `Hash root: \`${pack.hashChainRoot}\``,
      `Fișiere: ${pack.manifest.contents.length + 1}`,
      ``,
      `---`,
      ``,
      `## Sumar`,
      ``,
      `- Sisteme AI: ${pack.manifest.summary.aiSystemsCount}`,
      `- Sisteme high-risk: ${pack.manifest.summary.highRiskSystemsCount}`,
      `- Documente Annex IV: ${pack.manifest.summary.annexIvDocumentsCount}`,
      `- Înregistrări AI Literacy: ${pack.manifest.summary.literacyRecordsCount}`,
      `- Compliance overall: ${pack.manifest.summary.overallCompliancePct}%`,
      ``,
      `---`,
      ``,
      ...mdEntries.flatMap((e) => [`## ${e.path}`, ``, e.content, ``, `---`, ``]),
    ].join("\n")

    const pdfBuf = await generatePdfFromMarkdown(combined, {
      orgName: orgLine,
      title: `Audit Pack — ${orgLine}`,
      branding: branding ?? null,
      generatedAtISO: pack.manifest.generatedAt,
      signerName: branding?.signerName ?? null,
      auditReadiness: "audit_ready",
    })

    const pdfFileName = pack.fileName.replace(/\.zip$/, ".pdf")
    return new NextResponse(new Uint8Array(pdfBuf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${pdfFileName}"`,
        "Content-Length": String(pdfBuf.length),
        "X-Audit-Pack-Hash-Root": pack.hashChainRoot,
        "X-Audit-Pack-File-Count": String(pack.manifest.contents.length + 1),
        "Cache-Control": "no-store, no-cache, must-revalidate, private",
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Eroare la generarea PDF audit pack."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
