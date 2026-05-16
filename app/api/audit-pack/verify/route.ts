// POST /api/audit-pack/verify
//
// PUBLIC endpoint — verifies the integrity of an audit pack ZIP by recomputing
// the hash chain. No authentication required (oricine poate verifica
// integritatea unui pachet primit de la un cabinet).
//
// Input:
//   • body: application/zip (raw ZIP bytes) — preferred
//   • OR multipart/form-data with field `zip`
//   • OR JSON { zipBase64: "..." }
//
// Optional query: ?expectedHash=<hex> — also compares against caller's expected root.
//
// Output: { valid, errors, computedHash, expectedHash, manifest, fileChecks }

import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

import { verifyAuditPackZip } from "@/lib/server/audit-pack-builder"

const MAX_BYTES = 25 * 1024 * 1024 // 25 MB safety cap

async function readZipFromRequest(request: NextRequest): Promise<Buffer | { error: string; status: number }> {
  const contentType = request.headers.get("content-type") ?? ""

  if (contentType.startsWith("multipart/form-data")) {
    try {
      const form = await request.formData()
      const entry = form.get("zip")
      if (!entry || typeof entry === "string") {
        return { error: "Lipsește câmpul 'zip' din form-data.", status: 400 }
      }
      const buf = Buffer.from(await entry.arrayBuffer())
      if (buf.length > MAX_BYTES) {
        return { error: `Fișierul depășește limita de ${MAX_BYTES / 1024 / 1024} MB.`, status: 413 }
      }
      return buf
    } catch (err) {
      return {
        error: `Form-data invalid: ${err instanceof Error ? err.message : String(err)}`,
        status: 400,
      }
    }
  }

  if (contentType.includes("application/json")) {
    try {
      const json = (await request.json()) as { zipBase64?: string }
      if (!json.zipBase64 || typeof json.zipBase64 !== "string") {
        return { error: "JSON body must contain { zipBase64: '...' }", status: 400 }
      }
      const buf = Buffer.from(json.zipBase64, "base64")
      if (buf.length > MAX_BYTES) {
        return { error: `Fișierul depășește limita de ${MAX_BYTES / 1024 / 1024} MB.`, status: 413 }
      }
      return buf
    } catch (err) {
      return { error: `JSON invalid: ${err instanceof Error ? err.message : String(err)}`, status: 400 }
    }
  }

  // Raw binary body (application/zip or application/octet-stream)
  try {
    const ab = await request.arrayBuffer()
    if (ab.byteLength === 0) {
      return { error: "Body gol — încarcă un ZIP.", status: 400 }
    }
    if (ab.byteLength > MAX_BYTES) {
      return { error: `Fișierul depășește limita de ${MAX_BYTES / 1024 / 1024} MB.`, status: 413 }
    }
    return Buffer.from(ab)
  } catch (err) {
    return {
      error: `Body invalid: ${err instanceof Error ? err.message : String(err)}`,
      status: 400,
    }
  }
}

export async function POST(request: NextRequest) {
  const zipOrError = await readZipFromRequest(request)
  if (Buffer.isBuffer(zipOrError) === false) {
    return NextResponse.json({ error: zipOrError.error }, { status: zipOrError.status })
  }

  const url = new URL(request.url)
  const expectedHash = url.searchParams.get("expectedHash")?.trim() || null

  const result = await verifyAuditPackZip(zipOrError as Buffer)

  const expectedMatchesIfProvided =
    expectedHash !== null && result.computedHashRoot
      ? expectedHash.toLowerCase() === result.computedHashRoot.toLowerCase()
      : true

  return NextResponse.json(
    {
      valid: result.valid && expectedMatchesIfProvided,
      errors: [
        ...result.errors,
        ...(expectedMatchesIfProvided
          ? []
          : [
              `Hash-ul așteptat (${expectedHash}) diferă de cel calculat (${result.computedHashRoot}).`,
            ]),
      ],
      computedHash: result.computedHashRoot,
      expectedHash: expectedHash ?? result.expectedHashRoot,
      manifest: result.manifest,
      fileChecks: result.fileChecks,
    },
    { status: 200 }
  )
}

// GET returns a short usage message so visitors who hit the URL in a browser
// see something helpful rather than 405.
export async function GET() {
  return NextResponse.json({
    endpoint: "POST /api/audit-pack/verify",
    description:
      "Verifică integritatea unui audit pack CompliRoAI. Trimite ZIP-ul ca application/zip body sau multipart/form-data (câmp 'zip').",
    public: true,
  })
}
