// Audit pack builder round-trip test.
//
// We bypass the full buildAuditPack() entry point (which needs request context
// for readState) and instead test the verification logic against a hand-built
// ZIP that follows the same MANIFEST schema and hash-chain rules.

import { describe, it, expect } from "vitest"
import { createHash } from "node:crypto"
import JSZip from "jszip"

import { verifyAuditPackZip } from "@/lib/server/audit-pack-builder"

function sha256(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex")
}

async function buildValidZipBuffer(): Promise<{ zipBuffer: Buffer; rootHash: string }> {
  const generatedAt = "2026-05-16T00:00:00.000Z"
  const manifestBase = {
    version: "1.0" as const,
    schema: "compliroai.audit-pack/v1" as const,
    generatedAt,
    generatedBy: { userId: "u1", userEmail: "u1@example.com" },
    org: { id: "org-test", name: "Test SRL", cui: "RO12345678", workspaceMode: "solo" as const },
    issuedBy: {
      brandName: "CompliRoAI",
      signerName: null,
      signerTitle: null,
      contactEmail: null,
      website: null,
      logoUrl: null,
      isCustomBrand: false,
    },
    summary: {
      aiSystemsCount: 0,
      annexIvDocumentsCount: 0,
      literacyRecordsCount: 0,
      shareTokensCount: 0,
      overallCompliancePct: 100,
      highRiskSystemsCount: 0,
    },
    hashAlgorithm: "sha256" as const,
  }
  const baseBytes = Buffer.from(JSON.stringify(manifestBase, null, 2), "utf8")
  let chain = sha256(baseBytes)

  const files: { path: string; bytes: Buffer }[] = [
    { path: "inventory/ai-systems.json", bytes: Buffer.from('{"systems":[]}', "utf8") },
    { path: "literacy/training-records.json", bytes: Buffer.from('{"records":[]}', "utf8") },
  ]

  const contents = files.map((f) => {
    const fh = sha256(f.bytes)
    chain = sha256(Buffer.concat([Buffer.from(chain, "hex"), f.bytes]))
    return { path: f.path, sizeBytes: f.bytes.length, sha256: fh, chainHashAfter: chain }
  })

  const manifest = {
    ...manifestBase,
    contents,
    hashChainRoot: chain,
    signature: "fake-sig",
    signatureAlgorithm: "hmac-sha256" as const,
  }

  const zip = new JSZip()
  zip.file("MANIFEST.json", JSON.stringify(manifest, null, 2))
  for (const f of files) zip.file(f.path, f.bytes)
  zip.file("signatures/SIGNATURE.txt", "fake")
  const zipBuffer = (await zip.generateAsync({ type: "nodebuffer" })) as Buffer
  return { zipBuffer, rootHash: chain }
}

describe("audit-pack verify", () => {
  it("verifies a valid pack and recomputes the hash chain root", async () => {
    const { zipBuffer, rootHash } = await buildValidZipBuffer()
    const result = await verifyAuditPackZip(zipBuffer)
    expect(result.valid).toBe(true)
    expect(result.computedHashRoot).toBe(rootHash)
    expect(result.expectedHashRoot).toBe(rootHash)
    expect(result.fileChecks.every((c) => c.ok)).toBe(true)
  })

  it("rejects a pack with a tampered file", async () => {
    const { zipBuffer } = await buildValidZipBuffer()
    const tampered = await JSZip.loadAsync(zipBuffer)
    tampered.file("inventory/ai-systems.json", '{"systems":[{"id":"injected"}]}')
    const tamperedBuf = (await tampered.generateAsync({ type: "nodebuffer" })) as Buffer
    const result = await verifyAuditPackZip(tamperedBuf)
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
    expect(result.fileChecks.find((c) => c.path === "inventory/ai-systems.json")?.ok).toBe(false)
  })

  it("rejects a ZIP with missing MANIFEST.json", async () => {
    const zip = new JSZip()
    zip.file("inventory/ai-systems.json", "{}")
    const buf = (await zip.generateAsync({ type: "nodebuffer" })) as Buffer
    const result = await verifyAuditPackZip(buf)
    expect(result.valid).toBe(false)
    expect(result.errors[0]).toMatch(/MANIFEST/)
  })

  it("rejects garbage non-zip input", async () => {
    const result = await verifyAuditPackZip(Buffer.from("not a zip"))
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
  })

  // Sprint 011 backward compat: a pre-Sprint-011 manifest (without the new
  // optional summary fields) must still verify cleanly. We synthesize one
  // with the OLD summary shape and confirm it verifies, then we synthesize
  // one with the EXTENDED summary shape and confirm it also verifies.
  it("verifies pre-Sprint-011 packs (old summary shape, no extra fields)", async () => {
    const { zipBuffer } = await buildValidZipBuffer()
    const result = await verifyAuditPackZip(zipBuffer)
    expect(result.valid).toBe(true)
  })

  it("verifies Sprint-011 extended packs (new summary fields present)", async () => {
    // Build a pack whose manifest base summary already contains the new
    // Sprint 011 keys. Verification must accept both shapes.
    const generatedAt = "2026-05-17T00:00:00.000Z"
    const manifestBase = {
      version: "1.0" as const,
      schema: "compliroai.audit-pack/v1" as const,
      generatedAt,
      generatedBy: { userId: "u1", userEmail: "u1@example.com" },
      org: { id: "org-test", name: "Test SRL", cui: "RO12345678", workspaceMode: "solo" as const },
      issuedBy: {
        brandName: "CompliRoAI",
        signerName: null,
        signerTitle: null,
        contactEmail: null,
        website: null,
        logoUrl: null,
        isCustomBrand: false,
      },
      summary: {
        aiSystemsCount: 0,
        annexIvDocumentsCount: 0,
        literacyRecordsCount: 0,
        shareTokensCount: 0,
        overallCompliancePct: 100,
        highRiskSystemsCount: 0,
        findingsCount: 2,
        dpiaRecordsCount: 1,
        ropaActivitiesCount: 1,
        breachRecordsCount: 0,
        aiDataMapRecordsCount: 3,
        vendorRecordsCount: 2,
        dsarRequestsCount: 0,
        eventsCount: 5,
        chainOk: true,
      },
      hashAlgorithm: "sha256" as const,
    }
    const baseBytes = Buffer.from(JSON.stringify(manifestBase, null, 2), "utf8")
    let chain = sha256(baseBytes)

    const files: { path: string; bytes: Buffer }[] = [
      { path: "findings/registry.md", bytes: Buffer.from("# Findings\n\n_None_", "utf8") },
      { path: "audit-log/events.json", bytes: Buffer.from("[]\n", "utf8") },
    ]
    const contents = files.map((f) => {
      const fh = sha256(f.bytes)
      chain = sha256(Buffer.concat([Buffer.from(chain, "hex"), f.bytes]))
      return { path: f.path, sizeBytes: f.bytes.length, sha256: fh, chainHashAfter: chain }
    })
    const manifest = {
      ...manifestBase,
      contents,
      hashChainRoot: chain,
      signature: "fake-sig",
      signatureAlgorithm: "hmac-sha256" as const,
    }
    const zip = new JSZip()
    zip.file("MANIFEST.json", JSON.stringify(manifest, null, 2))
    for (const f of files) zip.file(f.path, f.bytes)
    zip.file("signatures/SIGNATURE.txt", "fake")
    const zipBuffer = (await zip.generateAsync({ type: "nodebuffer" })) as Buffer

    const result = await verifyAuditPackZip(zipBuffer)
    expect(result.valid).toBe(true)
    expect(result.computedHashRoot).toBe(chain)
  })
})

