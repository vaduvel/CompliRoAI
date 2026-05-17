// Sprint 014 — PDF generator tests.
//
// Strategy: integration-style. Pdfkit is pure-JS deterministic enough to
// inspect Buffer-level magic bytes + size guarantees. Nu validăm pixel-perfect
// rendering aici (asta cere visual diff suite); validăm că:
//   1. Output e un PDF valid (PDF magic prefix + EOF marker)
//   2. Output crește cu content (smoke: empty < short < long)
//   3. White-label branding e respectat (titlu, brand name)
//   4. Helper-ul pdfBufferToHeaders generează headers safe pentru download

import { describe, expect, it } from "vitest"

import {
  generatePdfFromMarkdown,
  pdfBufferToHeaders,
  resolvePdfkitRuntimeDataFallback,
} from "./pdf-generator"

const SAMPLE_ORG_NAME = "Acme S.R.L."

const SHORT_MD = `# Raport CompliRoAI

Acesta este un raport scurt pentru testare.

## Secțiune 1

Conținut secțiunea unu.

- Item 1
- Item 2

## Concluzie

Final.`

const LONG_MD = Array.from({ length: 80 }, (_, i) => `## Secțiunea ${i + 1}\n\nUn paragraf detaliat care explică contextul ${i + 1}.`).join("\n\n")

describe("generatePdfFromMarkdown", () => {
  it("produces a valid PDF buffer (magic bytes + EOF marker)", async () => {
    const buf = await generatePdfFromMarkdown(SHORT_MD, {
      orgName: SAMPLE_ORG_NAME,
      title: "Raport Test",
    })

    // PDF files start with "%PDF-"
    expect(buf.subarray(0, 5).toString("ascii")).toBe("%PDF-")

    // PDF files end with "%%EOF" (possibly with trailing newline)
    const tail = buf.subarray(buf.length - 8).toString("ascii")
    expect(tail).toContain("%%EOF")
  })

  it("output size scales with content length", async () => {
    const small = await generatePdfFromMarkdown("# Mic", { orgName: SAMPLE_ORG_NAME })
    const short = await generatePdfFromMarkdown(SHORT_MD, { orgName: SAMPLE_ORG_NAME })
    const long = await generatePdfFromMarkdown(LONG_MD, { orgName: SAMPLE_ORG_NAME })

    expect(small.length).toBeGreaterThan(1000)
    expect(short.length).toBeGreaterThan(small.length)
    expect(long.length).toBeGreaterThan(short.length)
  })

  it("respects optional title argument", async () => {
    const withTitle = await generatePdfFromMarkdown("Conținut", {
      orgName: SAMPLE_ORG_NAME,
      title: "Titlul Special",
    })
    const noTitle = await generatePdfFromMarkdown("Conținut", {
      orgName: SAMPLE_ORG_NAME,
    })
    // Title adds at minimum the title text + spacing, so output is bigger.
    expect(withTitle.length).toBeGreaterThan(noTitle.length)
  })

  it("respects white-label branding (custom brandName + color) without throwing", async () => {
    const bufBranded = await generatePdfFromMarkdown(SHORT_MD, {
      orgName: SAMPLE_ORG_NAME,
      title: "Cabinet Doe Raport",
      branding: {
        brandName: "Cabinet Doe & Asociații",
        primaryColor: "#dc2626",
        secondaryColor: "#7c3aed",
        logoUrl: null,
        signerName: "Diana Popescu, DPO",
        signerTitle: "DPO",
        contactEmail: null,
        address: null,
        website: null,
        updatedAtISO: null,
        isCustom: true,
      },
    })
    const bufPlain = await generatePdfFromMarkdown(SHORT_MD, {
      orgName: SAMPLE_ORG_NAME,
      title: "Cabinet Doe Raport",
    })
    expect(bufBranded.subarray(0, 5).toString("ascii")).toBe("%PDF-")
    expect(bufPlain.subarray(0, 5).toString("ascii")).toBe("%PDF-")
    // Branded version has extra signer line, so it's bigger.
    expect(bufBranded.length).toBeGreaterThan(bufPlain.length)
  })

  it("renders audit-ready variant without throwing (changes output)", async () => {
    const audit = await generatePdfFromMarkdown(SHORT_MD, {
      orgName: SAMPLE_ORG_NAME,
      auditReadiness: "audit_ready",
    })
    const review = await generatePdfFromMarkdown(SHORT_MD, {
      orgName: SAMPLE_ORG_NAME,
      auditReadiness: "review_required",
    })
    expect(audit.subarray(0, 5).toString("ascii")).toBe("%PDF-")
    expect(review.subarray(0, 5).toString("ascii")).toBe("%PDF-")
    // Audit-ready adds badge rect + extra text → strictly larger.
    expect(audit.length).toBeGreaterThan(review.length)
  })

  it("handles markdown with multiple headers, lists, blockquotes", async () => {
    const md = `# H1
## H2
### H3
---
> Avertisment important.
- list item 1
- list item 2
1. ordered 1
2. ordered 2

Paragraph here.`
    const buf = await generatePdfFromMarkdown(md, { orgName: SAMPLE_ORG_NAME })
    expect(buf.subarray(0, 5).toString("ascii")).toBe("%PDF-")
    expect(buf.length).toBeGreaterThan(1000)
  })

  it("includes signer name when provided (changes output size)", async () => {
    const withSigner = await generatePdfFromMarkdown(SHORT_MD, {
      orgName: SAMPLE_ORG_NAME,
      signerName: "Andrei Ionescu",
    })
    const withoutSigner = await generatePdfFromMarkdown(SHORT_MD, {
      orgName: SAMPLE_ORG_NAME,
    })
    expect(withSigner.subarray(0, 5).toString("ascii")).toBe("%PDF-")
    expect(withSigner.length).toBeGreaterThan(withoutSigner.length)
  })
})

describe("pdfBufferToHeaders", () => {
  it("returns Content-Type application/pdf", () => {
    const headers = pdfBufferToHeaders("raport")
    expect(headers["Content-Type"]).toBe("application/pdf")
  })

  it("returns attachment disposition with .pdf extension", () => {
    const headers = pdfBufferToHeaders("raport-audit-2026")
    expect(headers["Content-Disposition"]).toContain("attachment")
    expect(headers["Content-Disposition"]).toContain("raport-audit-2026.pdf")
  })

  it("sanitizes filename — strips special chars to underscore", () => {
    const headers = pdfBufferToHeaders("raport audit/2026 (final)")
    expect(headers["Content-Disposition"]).toContain("raport_audit_2026__final_.pdf")
  })

  it("sets no-cache headers (private content)", () => {
    const headers = pdfBufferToHeaders("x")
    expect(headers["Cache-Control"]).toContain("no-store")
  })
})

describe("resolvePdfkitRuntimeDataFallback", () => {
  it("returns undefined for paths outside .next/server/chunks/data", () => {
    expect(resolvePdfkitRuntimeDataFallback("/tmp/foo/bar.afm")).toBeUndefined()
    expect(resolvePdfkitRuntimeDataFallback("/var/log/whatever")).toBeUndefined()
  })

  it("returns undefined for paths in .next/server/chunks/data when vendor file doesn't exist", () => {
    // This file definitely doesn't exist in node_modules/pdfkit/js/data
    const fake = "/foo/.next/server/chunks/data/non-existent.afm"
    expect(resolvePdfkitRuntimeDataFallback(fake)).toBeUndefined()
  })
})
