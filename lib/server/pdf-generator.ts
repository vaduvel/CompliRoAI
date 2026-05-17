// Sprint 014 — PDF generator (markdown → PDF).
//
// Strategy: pdfkit (pure JS, lucrează în Vercel serverless dacă patchăm
// fs.readFileSync ca să rezolve runtime data dirs din .next chunks la vendor
// dir-ul din node_modules). Folosim bundled TTF din @vercel/og (livrat cu
// Next.js) pentru a evita standard AFM fonts care nu sunt traced corect.
//
// Decision (mandate § 15): pdfkit > Puppeteer (cold-start cost ridicat în
// serverless, binary mare) > @react-pdf/renderer (require React tree + JSX,
// over-kill pentru markdown linear). pdfkit livrează A4 cu margini fix
// la <40ms steady state.
//
// White-label support: dacă brandingColor + brandingLogoUrl sunt setate
// pe org, header-ul afișează numele brand-ului în culoarea aleasă. Default
// e CompliRoAI cobalt.

import fs from "node:fs"
import path from "node:path"

import PDFDocument from "pdfkit"

import { DEFAULT_BRANDING, type EffectiveBranding } from "@/lib/server/white-label"

export type PDFGenerateOptions = {
  /** Titlu document (apare pe prima pagină ca H1 dacă lipsește din markdown). */
  title?: string
  /** Numele orgului afișat în header. */
  orgName: string
  /** Branding override (când organizația e cabinet cu white-label). */
  branding?: EffectiveBranding | null
  /** Footer custom (default: disclaimer informativ RO). */
  footer?: string
  /** Numele celui care „semnează" documentul (apare pe ultima pagină). */
  signerName?: string | null
  /** „audit_ready" adaugă badge verde în header pe fiecare pagină. */
  auditReadiness?: "audit_ready" | "review_required" | null
  /** Data afișată în header (ISO; default = now). */
  generatedAtISO?: string
}

const DEFAULT_FOOTER_RO =
  "Document informativ, nu constituie consiliere juridică. Verificați cu un specialist înainte de utilizare oficială."

// ────────────────────────────────────────────────────────────────────────────
//   Serverless font + data dir patching
// ────────────────────────────────────────────────────────────────────────────
//
// pdfkit lazy-loads data files (AFM metrics, etc) via fs.readFileSync calls
// against `__dirname/data/…`. În Vercel/Next chunks, __dirname rezolva la
// `/.next/server/chunks/data/…` care nu există în trace. Patchuim
// fs.readFileSync ca să redirecteze către vendor dir-ul real.

let pdfkitDataLookupPatched = false
let cachedPdfFont: Buffer | null = null

const PDFKIT_RUNTIME_DATA_SEGMENT = new RegExp(
  `${path.sep.replace("\\", "\\\\")}\\.next${path.sep.replace("\\", "\\\\")}server${path.sep.replace("\\", "\\\\")}(?:chunks|vendor-chunks)${path.sep.replace("\\", "\\\\")}data${path.sep.replace("\\", "\\\\")}`
)
const PDFKIT_VENDOR_DATA_DIR = path.join(
  process.cwd(),
  "node_modules",
  "pdfkit",
  "js",
  "data"
)

export function resolvePdfkitRuntimeDataFallback(filePath: string): string | undefined {
  if (!PDFKIT_RUNTIME_DATA_SEGMENT.test(filePath)) {
    return undefined
  }
  const fallbackPath = path.join(PDFKIT_VENDOR_DATA_DIR, path.basename(filePath))
  return fs.existsSync(fallbackPath) ? fallbackPath : undefined
}

function patchPdfkitDataLookup() {
  if (pdfkitDataLookupPatched) return

  const originalReadFileSync = fs.readFileSync.bind(fs) as typeof fs.readFileSync
  fs.readFileSync = ((
    filePath: fs.PathOrFileDescriptor,
    options?: Parameters<typeof fs.readFileSync>[1]
  ) => {
    const rawPath =
      typeof filePath === "string"
        ? filePath
        : Buffer.isBuffer(filePath)
          ? filePath.toString("utf8")
          : filePath instanceof URL
            ? filePath.toString()
            : ""
    const fallbackPath = rawPath ? resolvePdfkitRuntimeDataFallback(rawPath) : undefined
    if (fallbackPath) {
      return originalReadFileSync(fallbackPath, options as never)
    }
    return originalReadFileSync(filePath as never, options as never)
  }) as typeof fs.readFileSync
  pdfkitDataLookupPatched = true
}

function getPdfFontBuffer(): Buffer {
  if (cachedPdfFont) return cachedPdfFont
  // Use bundled TTF (Noto Sans) din @vercel/og — guaranteed traced de Next.
  const fontPath = path.join(
    process.cwd(),
    "node_modules",
    "next",
    "dist",
    "compiled",
    "@vercel",
    "og",
    "noto-sans-v27-latin-regular.ttf"
  )
  cachedPdfFont = fs.readFileSync(fontPath)
  return cachedPdfFont
}

// ────────────────────────────────────────────────────────────────────────────
//   Color hex helpers (lightweight, no external dep)
// ────────────────────────────────────────────────────────────────────────────

function safeHexColor(value: string | null | undefined, fallback: string): string {
  if (!value) return fallback
  if (/^#[0-9a-fA-F]{6}$/.test(value)) return value
  return fallback
}

// ────────────────────────────────────────────────────────────────────────────
//   Public API
// ────────────────────────────────────────────────────────────────────────────

/**
 * Generates a PDF Buffer from Markdown-like content.
 *
 * Supported syntax:
 *   # H1, ## H2, ### H3
 *   --- horizontal rule
 *   > blockquote (warning, amber)
 *   - / * bullet list
 *   1. ordered list
 *   paragraphs (any other non-empty line)
 *
 * Header on each page: brand name + org name + date + optional audit-ready badge.
 * Footer on each page: disclaimer (default RO) + page X/Y + optional signer name.
 */
export async function generatePdfFromMarkdown(
  markdown: string,
  options: PDFGenerateOptions
): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    patchPdfkitDataLookup()

    const branding: EffectiveBranding = options.branding ?? {
      ...DEFAULT_BRANDING,
      isCustom: false,
    }
    const brandName = branding.brandName || "CompliRoAI"
    const primaryColor = safeHexColor(branding.primaryColor, "#3b5bdb")
    const generatedDate = options.generatedAtISO
      ? new Date(options.generatedAtISO)
      : new Date()
    const dateLabel = generatedDate.toLocaleDateString("ro-RO", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })
    const footerText = options.footer ?? DEFAULT_FOOTER_RO
    const signerName = options.signerName ?? branding.signerName ?? null
    const isAuditReady = options.auditReadiness === "audit_ready"

    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 72, bottom: 72, left: 72, right: 72 },
      bufferPages: true,
      info: {
        Title: options.title ?? `Document ${brandName}`,
        Author: brandName,
        Creator: "CompliRoAI PDF Generator",
        Producer: "pdfkit + CompliRoAI",
      },
    })

    const chunks: Buffer[] = []
    doc.on("data", (chunk: Buffer) => chunks.push(chunk))
    doc.on("end", () => resolve(Buffer.concat(chunks)))
    doc.on("error", reject)

    const fontBuffer = getPdfFontBuffer()
    doc.registerFont("CompliSans", fontBuffer)
    doc.registerFont("CompliSans-Bold", fontBuffer)

    const W = doc.page.width - doc.page.margins.left - doc.page.margins.right

    // ── Optional title page block ────────────────────────────────────────────
    if (options.title) {
      doc
        .fontSize(22)
        .fillColor(primaryColor)
        .font("CompliSans-Bold")
        .text(options.title, { width: W })
      doc.moveDown(0.4)
      doc
        .fontSize(10)
        .fillColor("#64748b")
        .font("CompliSans")
        .text(`${options.orgName} · ${dateLabel}`, { width: W })
      doc.moveDown(0.8)
    }

    // ── Content rendering ────────────────────────────────────────────────────
    const lines = markdown.split("\n")
    let firstContent = !options.title

    function ensureSpace(needed: number) {
      if (doc.y + needed > doc.page.height - doc.page.margins.bottom - 20) {
        doc.addPage()
      }
    }

    for (const line of lines) {
      if (line.startsWith("# ")) {
        ensureSpace(40)
        if (!firstContent) doc.moveDown(0.6)
        doc
          .fontSize(18)
          .fillColor(primaryColor)
          .font("CompliSans-Bold")
          .text(line.slice(2), { width: W })
        doc.moveDown(0.4)
        firstContent = false
      } else if (line.startsWith("## ")) {
        ensureSpace(30)
        if (!firstContent) doc.moveDown(0.5)
        doc
          .fontSize(13)
          .fillColor("#1e293b")
          .font("CompliSans-Bold")
          .text(line.slice(3), { width: W })
        doc.moveDown(0.3)
        firstContent = false
      } else if (line.startsWith("### ")) {
        ensureSpace(24)
        if (!firstContent) doc.moveDown(0.4)
        doc
          .fontSize(10)
          .fillColor("#475569")
          .font("CompliSans-Bold")
          .text(line.slice(4).toUpperCase(), { width: W, characterSpacing: 0.5 })
        doc.moveDown(0.2)
        firstContent = false
      } else if (line.startsWith("---")) {
        doc.moveDown(0.3)
        doc
          .moveTo(doc.page.margins.left, doc.y)
          .lineTo(doc.page.margins.left + W, doc.y)
          .strokeColor("#e2e8f0")
          .lineWidth(0.5)
          .stroke()
        doc.moveDown(0.3)
      } else if (line.startsWith("> ")) {
        ensureSpace(28)
        const savedY = doc.y
        doc
          .moveTo(doc.page.margins.left, savedY)
          .lineTo(doc.page.margins.left, savedY + 28)
          .strokeColor("#f59e0b")
          .lineWidth(2)
          .stroke()
        doc
          .fontSize(9)
          .fillColor("#92400e")
          .font("CompliSans")
          .text(line.slice(2), doc.page.margins.left + 10, savedY, { width: W - 10 })
        doc.moveDown(0.4)
        firstContent = false
      } else if (line.startsWith("- ") || line.startsWith("* ")) {
        ensureSpace(18)
        doc
          .fontSize(10)
          .fillColor("#475569")
          .font("CompliSans")
          .text(`• ${line.slice(2)}`, doc.page.margins.left + 12, doc.y, { width: W - 12 })
        firstContent = false
      } else if (/^\d+\.\s/.test(line)) {
        ensureSpace(18)
        doc
          .fontSize(10)
          .fillColor("#475569")
          .font("CompliSans")
          .text(line, doc.page.margins.left + 12, doc.y, { width: W - 12 })
        firstContent = false
      } else if (line.trim() === "") {
        if (!firstContent) doc.moveDown(0.25)
      } else {
        ensureSpace(18)
        doc
          .fontSize(10)
          .fillColor("#334155")
          .font("CompliSans")
          .text(line, { width: W, lineGap: 3 })
        firstContent = false
      }
    }

    // ── Header + footer decorations (loop after content) ─────────────────────
    // Nu apelăm doc.flushPages() — pdfkit ar marca paginile ca finalize și
    // switchToPage ar deveni no-op pentru editing. În schimb, lăsăm bufferul
    // pendulează și editem inline înainte de doc.end().
    const pages = doc.bufferedPageRange()
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(pages.start + i)

      // Header text
      doc
        .fontSize(8)
        .fillColor("#94a3b8")
        .font("CompliSans")
        .text(
          `Generat cu ${brandName} · ${options.orgName} · ${dateLabel}`,
          doc.page.margins.left,
          24,
          { width: W, align: "left" }
        )

      if (isAuditReady) {
        const badgeText = "AUDIT READY"
        const badgeWidth = 70
        const badgeHeight = 14
        const badgeX = doc.page.margins.left + W - badgeWidth
        const badgeY = 18
        doc
          .roundedRect(badgeX, badgeY, badgeWidth, badgeHeight, 3)
          .fillColor("#10b981")
          .fill()
        doc
          .fontSize(7.5)
          .fillColor("#ffffff")
          .font("CompliSans-Bold")
          .text(badgeText, badgeX, badgeY + 3.5, { width: badgeWidth, align: "center" })
      }

      // Header separator (color = primary when audit-ready, neutral otherwise)
      doc
        .moveTo(doc.page.margins.left, 38)
        .lineTo(doc.page.margins.left + W, 38)
        .strokeColor(isAuditReady ? "#10b981" : primaryColor)
        .lineWidth(isAuditReady ? 1 : 0.8)
        .stroke()

      // Footer separator
      doc
        .moveTo(doc.page.margins.left, doc.page.height - 50)
        .lineTo(doc.page.margins.left + W, doc.page.height - 50)
        .strokeColor("#e2e8f0")
        .lineWidth(0.5)
        .stroke()

      // Footer text
      doc
        .fontSize(7)
        .fillColor("#94a3b8")
        .font("CompliSans")
        .text(footerText, doc.page.margins.left, doc.page.height - 44, {
          width: W,
          align: "center",
        })

      // Signer line on last page only
      if (i === pages.count - 1 && signerName) {
        doc
          .fontSize(8)
          .fillColor("#475569")
          .font("CompliSans-Bold")
          .text(
            `Pregătit de: ${signerName}`,
            doc.page.margins.left,
            doc.page.height - 60,
            { width: W, align: "right" }
          )
      }

      // Page number
      doc
        .fontSize(7)
        .fillColor("#94a3b8")
        .font("CompliSans")
        .text(`${i + 1} / ${pages.count}`, doc.page.margins.left, doc.page.height - 32, {
          width: W,
          align: "right",
        })
    }

    doc.end()
  })
}

/**
 * Helper for API routes: returns a Response-compatible body + headers for
 * direct PDF download. Filename should NOT include extension; caller adds `.pdf`.
 */
export function pdfBufferToHeaders(filename: string): Record<string, string> {
  const safeName = filename.replace(/[^a-z0-9_\-.]/gi, "_")
  return {
    "Content-Type": "application/pdf",
    "Content-Disposition": `attachment; filename="${safeName}.pdf"`,
    "Cache-Control": "no-store, no-cache, must-revalidate, private",
  }
}
