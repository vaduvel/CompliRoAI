// Audit Pack Builder — CompliRoAI Sprint 4
//
// Generează un ZIP "evidence-grade" pentru auditori (ANCOM, DPA, certificatori
// ISO sau parteneri B2B) — diferențiatorul de brand vs PDF-grade compliance:
//
//   • MANIFEST.json — metadata + lista de fișiere + hash chain root
//   • inventory/ai-systems.json — toate sistemele AI înregistrate
//   • documents/annex-iv/*.md — toate documentele Annex IV generate
//   • literacy/training-records.json — toate evidențele Art. 4 (AI literacy)
//   • share-tokens/history.json — toate magic links emise (audit trail)
//   • compliance-report.html — raport executiv brand-uit (white-label)
//   • evidence/audit-trail.log — log structurat al acțiunilor
//   • signatures/SIGNATURE.txt — hash final SHA-256 + signature HMAC
//
// Hash chain (immutability proof):
//   hash[0] = SHA-256(MANIFEST_BASE)
//   hash[i] = SHA-256(hash[i-1] + file_i_bytes)
//   root    = hash[n]
//
// Orice modificare post-fact a oricărui fișier rupe lanțul — auditorul poate
// rula `/verify-pack` și să confirme că dosarul e identic cu momentul export-ului.

import { createHash, createHmac } from "node:crypto"
import JSZip from "jszip"

import { classifyAISystem } from "@/lib/compliance/ai-act-classifier"
import type { AISystemRecord, LiteracyRecord } from "@/lib/compliance/types"
import type { AIActState, GeneratedDocumentRecord } from "@/lib/server/store"
import { loadOrgStateFromSupabase, shouldUseSupabaseOrgState } from "@/lib/server/supabase-org-state"
import { promises as fs } from "node:fs"
import path from "node:path"
import { getEffectiveBranding, type EffectiveBranding } from "@/lib/server/white-label"
import { listOrgShareTokens, type ShareTokenRecord } from "@/lib/server/share-token-store"
import { buildAIActEvidencePack } from "@/lib/server/evidence-pack"
import { readState as readCurrentOrgState } from "@/lib/server/store"

// ────────────────────────────────────────────────────────────────────────────
//   Types
// ────────────────────────────────────────────────────────────────────────────

export type AuditPackManifest = {
  version: "1.0"
  schema: "compliroai.audit-pack/v1"
  generatedAt: string
  generatedBy: {
    userId: string
    userEmail: string
  }
  org: {
    id: string
    name: string
    cui?: string | null
    workspaceMode: "solo" | "cabinet"
  }
  /** Cabinet who issued the pack for a client (white-label). */
  issuedBy: {
    brandName: string
    signerName: string | null
    signerTitle: string | null
    contactEmail: string | null
    website: string | null
    logoUrl: string | null
    isCustomBrand: boolean
  }
  contents: AuditPackFileEntry[]
  summary: {
    aiSystemsCount: number
    annexIvDocumentsCount: number
    literacyRecordsCount: number
    shareTokensCount: number
    overallCompliancePct: number
    highRiskSystemsCount: number
  }
  hashAlgorithm: "sha256"
  hashChainRoot: string
  signature: string
  signatureAlgorithm: "hmac-sha256"
}

export type AuditPackFileEntry = {
  path: string
  sizeBytes: number
  sha256: string
  /** chainHash AFTER this file is folded into the chain. */
  chainHashAfter: string
}

export type BuildAuditPackResult = {
  zipBuffer: Buffer
  fileName: string
  manifest: AuditPackManifest
  hashChainRoot: string
  sizeBytes: number
}

export type BuildAuditPackOptions = {
  /** When set (cabinet mode), generate the pack for a specific client org. */
  clientOrgId?: string
  /** Issuer info — defaults to current session user. */
  issuedByUserId: string
  issuedByUserEmail: string
  /** Workspace mode of the issuer. */
  workspaceMode: "solo" | "cabinet"
  /** orgId of the *current session* (used for share-token registry lookup). */
  currentOrgId: string
  /** When true, the bundle is re-signed with a fresh cabinet signature (POST /sign). */
  reSign?: boolean
}

// ────────────────────────────────────────────────────────────────────────────
//   Secrets / signing
// ────────────────────────────────────────────────────────────────────────────

function getSecret(): string {
  const secret = process.env.AIACT_SESSION_SECRET?.trim()
  if (secret && secret.length >= 16) return secret
  if (process.env.NODE_ENV === "production") {
    throw new Error("AIACT_SESSION_SECRET missing in production")
  }
  return "aiact-audit-pack-dev-fallback-secret-do-not-use-in-prod"
}

// ────────────────────────────────────────────────────────────────────────────
//   Public API
// ────────────────────────────────────────────────────────────────────────────

export async function buildAuditPack(
  orgId: string,
  options: BuildAuditPackOptions
): Promise<BuildAuditPackResult> {
  const targetOrgId = options.clientOrgId ?? orgId

  // ─── 1. Load state for target org ────────────────────────────────────────
  const state = await loadStateForOrg(targetOrgId, orgId)
  const branding = await getEffectiveBranding(orgId).catch(() => null)
  const effectiveBranding: EffectiveBranding = branding ?? {
    logoUrl: null,
    primaryColor: "#3b5bdb",
    secondaryColor: "#0ea5e9",
    brandName: "CompliRoAI",
    signerName: null,
    signerTitle: null,
    contactEmail: null,
    address: null,
    website: null,
    updatedAtISO: null,
    isCustom: false,
  }

  // Best-effort share-tokens history for the *issuing* cabinet org.
  let shareTokens: ShareTokenRecord[] = []
  try {
    shareTokens = await listOrgShareTokens(orgId, { limit: 500, includeExpired: true })
  } catch {
    shareTokens = []
  }

  // Build the evidence pack summary for the target org so we have a
  // compliance percentage and high-risk count in the manifest.
  let overallCompliancePct = 0
  let highRiskSystemsCount = 0
  try {
    // buildAIActEvidencePack reads from current session context — only
    // accurate when we're not cross-org (cabinet→client) generating.
    // For client packs we compute manually to avoid context confusion.
    if (targetOrgId === orgId) {
      const pack = await buildAIActEvidencePack(orgId)
      overallCompliancePct = pack.overallCompliance
      highRiskSystemsCount = pack.systems.filter((s) => s.riskClass === "high_risk").length
    } else {
      const summary = computeSummaryForState(state)
      overallCompliancePct = summary.overallCompliancePct
      highRiskSystemsCount = summary.highRiskSystemsCount
    }
  } catch {
    const summary = computeSummaryForState(state)
    overallCompliancePct = summary.overallCompliancePct
    highRiskSystemsCount = summary.highRiskSystemsCount
  }

  const orgName = pickOrgNameFromState(state, targetOrgId)
  const orgCui = pickCuiFromState(state)
  const generatedAt = new Date().toISOString()
  const dateLabel = generatedAt.slice(0, 10)
  const orgSlug = slugify(orgName)
  const fileName = `compliroai-audit-pack-${orgSlug}-${dateLabel}.zip`

  // ─── 2. Build the file contents (deterministic order) ────────────────────
  const files = buildFileContents({
    state,
    targetOrgId,
    orgName,
    orgCui,
    branding: effectiveBranding,
    shareTokens,
    issuedByUserEmail: options.issuedByUserEmail,
    workspaceMode: options.workspaceMode,
    generatedAt,
    summary: {
      overallCompliancePct,
      highRiskSystemsCount,
    },
  })

  // ─── 3. Compute hash chain over file contents (in deterministic order) ───
  const manifestBase = {
    version: "1.0" as const,
    schema: "compliroai.audit-pack/v1" as const,
    generatedAt,
    generatedBy: {
      userId: options.issuedByUserId,
      userEmail: options.issuedByUserEmail,
    },
    org: {
      id: targetOrgId,
      name: orgName,
      cui: orgCui,
      workspaceMode: options.workspaceMode,
    },
    issuedBy: {
      brandName: effectiveBranding.brandName,
      signerName: effectiveBranding.signerName,
      signerTitle: effectiveBranding.signerTitle,
      contactEmail: effectiveBranding.contactEmail,
      website: effectiveBranding.website,
      logoUrl: effectiveBranding.logoUrl,
      isCustomBrand: effectiveBranding.isCustom,
    },
    summary: {
      aiSystemsCount: state.aiSystems.length,
      annexIvDocumentsCount: state.generatedDocuments.length,
      literacyRecordsCount: state.literacyRecords.length,
      shareTokensCount: shareTokens.length,
      overallCompliancePct,
      highRiskSystemsCount,
    },
    hashAlgorithm: "sha256" as const,
  }

  const manifestBaseBytes = Buffer.from(JSON.stringify(manifestBase, null, 2), "utf8")
  let chainHash = sha256(manifestBaseBytes)

  const contents: AuditPackFileEntry[] = files.map((file) => {
    const fileHash = sha256(file.bytes)
    // Hash chain: H(prev || file_content)
    chainHash = sha256(Buffer.concat([Buffer.from(chainHash, "hex"), file.bytes]))
    return {
      path: file.path,
      sizeBytes: file.bytes.length,
      sha256: fileHash,
      chainHashAfter: chainHash,
    }
  })

  // Final signature: HMAC-SHA256 over the root hash, signed with the server
  // secret. Re-signing (POST /sign) regenerates this signature with the
  // current cabinet's effective branding context, but the chain root stays
  // identical (proves the *files* weren't modified).
  const signature = createHmac("sha256", getSecret()).update(chainHash).digest("hex")

  const manifest: AuditPackManifest = {
    ...manifestBase,
    contents,
    hashChainRoot: chainHash,
    signature,
    signatureAlgorithm: "hmac-sha256",
  }

  // ─── 4. Build SIGNATURE.txt (human-readable) ──────────────────────────────
  const signatureTxt = buildSignatureTxt({
    manifest,
    branding: effectiveBranding,
  })

  // ─── 5. Assemble the ZIP ──────────────────────────────────────────────────
  const zip = new JSZip()
  zip.file("MANIFEST.json", JSON.stringify(manifest, null, 2))
  for (const file of files) {
    zip.file(file.path, file.bytes)
  }
  zip.file("signatures/SIGNATURE.txt", signatureTxt)

  const zipBuffer = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  })

  // ─── 6. Best-effort persist registry entry into org_state.auditPacks ─────
  await recordAuditPackInState({
    orgId,
    pack: {
      id: `pack-${dateLabel}-${chainHash.slice(0, 12)}`,
      orgId: targetOrgId,
      orgName,
      hashRoot: chainHash,
      fileCount: contents.length + 1, // +1 for MANIFEST.json
      sizeBytes: zipBuffer.length,
      createdByUserId: options.issuedByUserId,
      createdAtISO: generatedAt,
      reSigned: options.reSign === true,
    },
  })

  return {
    zipBuffer,
    fileName,
    manifest,
    hashChainRoot: chainHash,
    sizeBytes: zipBuffer.length,
  }
}

// ────────────────────────────────────────────────────────────────────────────
//   Hash chain verification (used by /api/audit-pack/verify)
// ────────────────────────────────────────────────────────────────────────────

export type VerifyAuditPackResult = {
  valid: boolean
  errors: string[]
  computedHashRoot: string | null
  expectedHashRoot: string | null
  manifest: AuditPackManifest | null
  /** Per-file verification (path → ok). */
  fileChecks: { path: string; expected: string; actual: string; ok: boolean }[]
}

export async function verifyAuditPackZip(zipBuffer: Buffer): Promise<VerifyAuditPackResult> {
  const errors: string[] = []
  const fileChecks: VerifyAuditPackResult["fileChecks"] = []

  let zip: JSZip
  try {
    zip = await JSZip.loadAsync(zipBuffer)
  } catch (err) {
    return {
      valid: false,
      errors: [`ZIP invalid: ${err instanceof Error ? err.message : String(err)}`],
      computedHashRoot: null,
      expectedHashRoot: null,
      manifest: null,
      fileChecks: [],
    }
  }

  const manifestFile = zip.file("MANIFEST.json")
  if (!manifestFile) {
    return {
      valid: false,
      errors: ["MANIFEST.json lipsește din ZIP."],
      computedHashRoot: null,
      expectedHashRoot: null,
      manifest: null,
      fileChecks: [],
    }
  }

  let manifest: AuditPackManifest
  try {
    const text = await manifestFile.async("string")
    manifest = JSON.parse(text) as AuditPackManifest
  } catch (err) {
    return {
      valid: false,
      errors: [`MANIFEST.json nu este JSON valid: ${err instanceof Error ? err.message : String(err)}`],
      computedHashRoot: null,
      expectedHashRoot: null,
      manifest: null,
      fileChecks: [],
    }
  }

  if (manifest.schema !== "compliroai.audit-pack/v1") {
    errors.push(`Schema necunoscută: ${String(manifest.schema)}. Așteptat: compliroai.audit-pack/v1.`)
  }

  // Rebuild the manifestBase exactly (must be byte-identical to original):
  const manifestBase = {
    version: manifest.version,
    schema: manifest.schema,
    generatedAt: manifest.generatedAt,
    generatedBy: manifest.generatedBy,
    org: manifest.org,
    issuedBy: manifest.issuedBy,
    summary: manifest.summary,
    hashAlgorithm: manifest.hashAlgorithm,
  }
  const manifestBaseBytes = Buffer.from(JSON.stringify(manifestBase, null, 2), "utf8")
  let chainHash = sha256(manifestBaseBytes)

  for (const entry of manifest.contents) {
    const file = zip.file(entry.path)
    if (!file) {
      errors.push(`Fișier lipsă din ZIP: ${entry.path}`)
      fileChecks.push({ path: entry.path, expected: entry.sha256, actual: "MISSING", ok: false })
      continue
    }
    const bytes = Buffer.from(await file.async("uint8array"))
    const actualHash = sha256(bytes)
    if (actualHash !== entry.sha256) {
      errors.push(`Fișier modificat: ${entry.path}`)
    }
    fileChecks.push({
      path: entry.path,
      expected: entry.sha256,
      actual: actualHash,
      ok: actualHash === entry.sha256,
    })
    chainHash = sha256(Buffer.concat([Buffer.from(chainHash, "hex"), bytes]))
    if (chainHash !== entry.chainHashAfter) {
      errors.push(`Hash chain corupt la ${entry.path}.`)
    }
  }

  const valid =
    errors.length === 0 &&
    chainHash === manifest.hashChainRoot &&
    fileChecks.every((c) => c.ok)

  if (chainHash !== manifest.hashChainRoot) {
    errors.push(
      `Hash chain root nu corespunde. Așteptat ${manifest.hashChainRoot}, calculat ${chainHash}.`
    )
  }

  return {
    valid,
    errors,
    computedHashRoot: chainHash,
    expectedHashRoot: manifest.hashChainRoot,
    manifest,
    fileChecks,
  }
}

// ────────────────────────────────────────────────────────────────────────────
//   Registry — JSONB inside org_state.auditPacks (Sprint 2 pattern reuse)
// ────────────────────────────────────────────────────────────────────────────

export type AuditPackRegistryEntry = {
  id: string
  orgId: string
  orgName: string
  hashRoot: string
  fileCount: number
  sizeBytes: number
  createdByUserId: string
  createdAtISO: string
  reSigned?: boolean
}

const PACK_REGISTRY_KEY = "auditPacks"

export async function listAuditPackRegistry(
  sessionOrgId: string
): Promise<AuditPackRegistryEntry[]> {
  // Use the *session* org's state because the cabinet issues packs for many
  // clients but the registry is per-issuer (the cabinet keeps the history).
  // For solo users this is the same as the target org.
  try {
    if (shouldUseSupabaseOrgState()) {
      const remote = await loadOrgStateFromSupabase<Record<string, unknown>>(sessionOrgId)
      const list = remote?.[PACK_REGISTRY_KEY]
      if (Array.isArray(list)) return list as AuditPackRegistryEntry[]
    }
  } catch {
    // fall through
  }
  // Local fallback — read raw file (cannot use readState() since it needs
  // a request context; this is fine, we only use it as a degraded path).
  try {
    const filePath = path.join(process.cwd(), ".data", `state-${sessionOrgId}.json`)
    const raw = await fs.readFile(filePath, "utf-8")
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const list = parsed[PACK_REGISTRY_KEY]
    if (Array.isArray(list)) return list as AuditPackRegistryEntry[]
  } catch {
    // not present
  }
  return []
}

async function recordAuditPackInState(input: {
  orgId: string
  pack: AuditPackRegistryEntry
}): Promise<void> {
  try {
    // Use the public readState/writeState which already handle context + cache.
    const state = await readCurrentOrgState()
    const existing = (state as unknown as Record<string, unknown>)[PACK_REGISTRY_KEY]
    const list: AuditPackRegistryEntry[] = Array.isArray(existing)
      ? (existing as AuditPackRegistryEntry[])
      : []
    list.unshift(input.pack)
    const trimmed = list.slice(0, 100) // keep last 100
    ;(state as unknown as Record<string, unknown>)[PACK_REGISTRY_KEY] = trimmed
    const { writeState } = await import("@/lib/server/store")
    await writeState(state)
  } catch {
    // Registry persistence is best-effort; the ZIP is already built.
  }
}

// ────────────────────────────────────────────────────────────────────────────
//   File content builders
// ────────────────────────────────────────────────────────────────────────────

type FileBytes = { path: string; bytes: Buffer }

function buildFileContents(input: {
  state: AIActState
  targetOrgId: string
  orgName: string
  orgCui?: string | null
  branding: EffectiveBranding
  shareTokens: ShareTokenRecord[]
  issuedByUserEmail: string
  workspaceMode: "solo" | "cabinet"
  generatedAt: string
  summary: { overallCompliancePct: number; highRiskSystemsCount: number }
}): FileBytes[] {
  const files: FileBytes[] = []

  // inventory/ai-systems.json
  files.push({
    path: "inventory/ai-systems.json",
    bytes: utf8(
      JSON.stringify(
        {
          generatedAt: input.generatedAt,
          orgId: input.targetOrgId,
          orgName: input.orgName,
          systemsCount: input.state.aiSystems.length,
          systems: input.state.aiSystems.map((sys) => ({
            ...sys,
            classification: classifyAISystem(sys.purpose),
          })),
        },
        null,
        2
      )
    ),
  })

  // documents/annex-iv/*.md (one file per generated document)
  // Always include an index for traversal convenience.
  const annexIvDocs = input.state.generatedDocuments.filter(
    (d) => d.documentType === "annex-iv"
  )
  files.push({
    path: "documents/annex-iv/_index.json",
    bytes: utf8(
      JSON.stringify(
        {
          generatedAt: input.generatedAt,
          count: annexIvDocs.length,
          documents: annexIvDocs.map((doc) => ({
            id: doc.id,
            systemId: doc.systemId,
            createdAtISO: doc.createdAtISO,
            approvalStatus: doc.approvalStatus ?? "pending",
            fileName: buildAnnexFileName(doc, input.state.aiSystems),
          })),
        },
        null,
        2
      )
    ),
  })
  for (const doc of annexIvDocs) {
    files.push({
      path: `documents/annex-iv/${buildAnnexFileName(doc, input.state.aiSystems)}`,
      bytes: utf8(doc.content),
    })
  }

  // literacy/training-records.json
  files.push({
    path: "literacy/training-records.json",
    bytes: utf8(
      JSON.stringify(
        {
          generatedAt: input.generatedAt,
          orgId: input.targetOrgId,
          totalRecords: input.state.literacyRecords.length,
          records: input.state.literacyRecords,
        },
        null,
        2
      )
    ),
  })

  // share-tokens/history.json
  files.push({
    path: "share-tokens/history.json",
    bytes: utf8(
      JSON.stringify(
        {
          generatedAt: input.generatedAt,
          totalIssued: input.shareTokens.length,
          tokens: input.shareTokens.map((t) => ({
            id: t.id,
            targetType: t.targetType,
            targetLabel: t.targetLabel ?? null,
            recipientEmail: t.recipientEmail ?? null,
            status: t.status,
            createdAtISO: t.createdAtISO,
            expiresAtISO: t.expiresAtISO,
            usedAtISO: t.usedAtISO ?? null,
            revokedAtISO: t.revokedAtISO ?? null,
          })),
        },
        null,
        2
      )
    ),
  })

  // evidence/audit-trail.log — structured human+machine readable log
  files.push({
    path: "evidence/audit-trail.log",
    bytes: utf8(buildAuditTrailLog(input)),
  })

  // compliance-report.html — branded HTML executive summary
  files.push({
    path: "compliance-report.html",
    bytes: utf8(buildComplianceReportHtml(input)),
  })

  // readiness-pack/latest.json — pointer la cel mai recent Readiness Pack
  // generat pentru această org (dacă există) — Sprint 5 integration.
  const readinessPacks =
    (input.state as unknown as { readinessPacks?: Array<{ id: string; generatedAtISO: string; hashRoot: string; format: string; contentsCount: number; clientOrgId?: string; clientOrgName?: string }> }).readinessPacks ?? []
  if (readinessPacks.length > 0) {
    files.push({
      path: "readiness-pack/latest.json",
      bytes: utf8(
        JSON.stringify(
          {
            note: "Readiness Pack-uri generate pentru această organizație. Pentru a regenera pachetul propriu-zis, folosiți /api/readiness-pack/generate.",
            count: readinessPacks.length,
            latest: readinessPacks[0],
            history: readinessPacks.slice(0, 10),
          },
          null,
          2
        )
      ),
    })
  }

  return files
}

function buildAnnexFileName(
  doc: GeneratedDocumentRecord,
  systems: AISystemRecord[]
): string {
  const system = systems.find((s) => s.id === doc.systemId)
  const sysSlug = slugify(system?.name ?? doc.systemId)
  const date = doc.createdAtISO.slice(0, 10)
  return `annex-iv-${sysSlug}-${date}-${doc.id.slice(-6)}.md`
}

function buildAuditTrailLog(input: {
  state: AIActState
  generatedAt: string
  issuedByUserEmail: string
  orgName: string
}): string {
  const lines: string[] = []
  const push = (atISO: string, actor: string, action: string, target: string) =>
    lines.push(`[${atISO}] ${actor} → ${action} :: ${target}`)

  // Onboarding
  if (input.state.onboarding?.completed) {
    push(
      input.state.onboarding.completedAtISO ?? input.generatedAt,
      input.issuedByUserEmail,
      "ONBOARDING_COMPLETED",
      `org=${input.orgName}, role=${input.state.onboarding.role ?? "solo"}`
    )
  }

  // AI systems
  for (const sys of input.state.aiSystems) {
    push(sys.createdAtISO, input.issuedByUserEmail, "AI_SYSTEM_REGISTERED", `${sys.name} (${sys.purpose})`)
    if (sys.approvalStatus === "approved" && sys.approvedAtISO) {
      push(sys.approvedAtISO, sys.approvedByEmail ?? input.issuedByUserEmail, "AI_SYSTEM_APPROVED", sys.name)
    }
    if (sys.policyAttestationStatus === "attested" && sys.policyAttestedAtISO) {
      push(
        sys.policyAttestedAtISO,
        sys.policyAttestedByEmail ?? input.issuedByUserEmail,
        "AI_SYSTEM_POLICY_ATTESTED",
        sys.name
      )
    }
  }

  // Documents
  for (const doc of input.state.generatedDocuments) {
    push(doc.createdAtISO, input.issuedByUserEmail, "DOCUMENT_GENERATED", `annex-iv ${doc.id} → system=${doc.systemId}`)
    if (doc.approvalStatus === "approved_as_evidence") {
      push(doc.createdAtISO, input.issuedByUserEmail, "DOCUMENT_APPROVED_AS_EVIDENCE", doc.id)
    }
  }

  // Literacy
  for (const rec of input.state.literacyRecords) {
    push(
      rec.createdAtISO,
      input.issuedByUserEmail,
      "LITERACY_TRAINING_LOGGED",
      `${rec.employeeName} (${rec.role}) — ${rec.trainingType}, ${rec.durationHours}h`
    )
  }

  // Generation event itself
  push(input.generatedAt, input.issuedByUserEmail, "AUDIT_PACK_GENERATED", `org=${input.orgName}`)

  // Sort chronologically
  lines.sort()

  return [
    `# CompliRoAI Audit Trail`,
    `# Org: ${input.orgName}`,
    `# Generated: ${input.generatedAt}`,
    `# Format: [timestamp] actor → ACTION :: target`,
    ``,
    ...lines,
    ``,
  ].join("\n")
}

function buildComplianceReportHtml(input: {
  state: AIActState
  branding: EffectiveBranding
  orgName: string
  orgCui?: string | null
  generatedAt: string
  workspaceMode: "solo" | "cabinet"
  summary: { overallCompliancePct: number; highRiskSystemsCount: number }
}): string {
  const date = new Date(input.generatedAt).toLocaleDateString("ro-RO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
  const brand = input.branding
  const issuerLine = brand.isCustom
    ? `${escapeHtml(brand.brandName)} — pregătit de ${escapeHtml(brand.signerName ?? "consultant")}`
    : "Generat de CompliRoAI"

  const systemRows = input.state.aiSystems
    .map((sys) => {
      const cls = classifyAISystem(sys.purpose)
      return `
        <tr>
          <td>${escapeHtml(sys.name)}</td>
          <td>${escapeHtml(sys.purpose)}</td>
          <td>${escapeHtml(cls.riskLevel)}</td>
          <td>${sys.approvalStatus === "approved" ? "Aprobat" : sys.approvalStatus === "rejected" ? "Respins" : "În așteptare"}</td>
        </tr>
      `
    })
    .join("")

  return `<!doctype html>
<html lang="ro">
<head>
<meta charset="utf-8" />
<title>Raport conformitate AI Act — ${escapeHtml(input.orgName)}</title>
<style>
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 32px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: #0f172a; background: #fafafa; line-height: 1.55;
  }
  .header {
    border-bottom: 3px solid ${escapeAttr(brand.primaryColor)};
    padding-bottom: 16px; margin-bottom: 24px;
    display: flex; align-items: center; justify-content: space-between;
  }
  .brand { display: flex; align-items: center; gap: 12px; }
  .brand img { max-height: 40px; }
  .brand-name { font-size: 18px; font-weight: 600; color: ${escapeAttr(brand.primaryColor)}; }
  .doc-title { font-size: 24px; font-weight: 600; margin: 8px 0 4px; }
  .meta { color: #64748b; font-size: 13px; }
  h2 { font-size: 18px; margin-top: 32px; color: ${escapeAttr(brand.primaryColor)}; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; background: #fff; }
  th, td { text-align: left; padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
  th { background: #f1f5f9; font-weight: 600; }
  .score-card {
    display: inline-block; padding: 16px 24px; background: #fff;
    border: 1px solid #e2e8f0; border-radius: 8px; margin-right: 12px;
  }
  .score-value { font-size: 32px; font-weight: 700; color: ${escapeAttr(brand.primaryColor)}; }
  .score-label { font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
  .footer {
    margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0;
    font-size: 12px; color: #64748b;
  }
  .badge {
    display: inline-block; padding: 2px 8px; border-radius: 4px;
    background: ${escapeAttr(brand.secondaryColor)}; color: #fff; font-size: 11px;
  }
</style>
</head>
<body>
  <div class="header">
    <div class="brand">
      ${brand.logoUrl ? `<img src="${escapeAttr(brand.logoUrl)}" alt="${escapeAttr(brand.brandName)}" />` : ""}
      <span class="brand-name">${escapeHtml(brand.brandName)}</span>
    </div>
    <span class="badge">${escapeHtml(input.workspaceMode === "cabinet" ? "Mod cabinet" : "Mod solo")}</span>
  </div>

  <div class="doc-title">Raport conformitate AI Act</div>
  <div class="meta">
    Organizație: <strong>${escapeHtml(input.orgName)}</strong>${
      input.orgCui ? ` · CUI: ${escapeHtml(input.orgCui)}` : ""
    }<br />
    Data generării: ${escapeHtml(date)}<br />
    ${issuerLine}
  </div>

  <h2>Rezumat executiv</h2>
  <div>
    <div class="score-card">
      <div class="score-value">${input.summary.overallCompliancePct}%</div>
      <div class="score-label">Scor conformitate AI Act</div>
    </div>
    <div class="score-card">
      <div class="score-value">${input.state.aiSystems.length}</div>
      <div class="score-label">Sisteme AI</div>
    </div>
    <div class="score-card">
      <div class="score-value">${input.summary.highRiskSystemsCount}</div>
      <div class="score-label">Sisteme high-risk</div>
    </div>
    <div class="score-card">
      <div class="score-value">${input.state.literacyRecords.length}</div>
      <div class="score-label">Training-uri AI Literacy (Art. 4)</div>
    </div>
  </div>

  <h2>Registru sisteme AI</h2>
  ${
    input.state.aiSystems.length === 0
      ? `<p class="meta">Niciun sistem AI înregistrat.</p>`
      : `<table>
    <thead><tr><th>Nume</th><th>Scop</th><th>Clasificare</th><th>Aprobare</th></tr></thead>
    <tbody>${systemRows}</tbody>
  </table>`
  }

  <h2>Note despre integritate</h2>
  <p class="meta">
    Acest raport face parte dintr-un audit pack criptografic. Toate fișierele din ZIP
    sunt înlănțuite SHA-256 într-o cale de hash (hash chain). Orice modificare post-fact
    a vreunui fișier rupe lanțul. Verifică integritatea pe pagina publică
    <code>/verify-pack</code> sau prin endpoint-ul <code>POST /api/audit-pack/verify</code>.
  </p>

  <div class="footer">
    ${escapeHtml(brand.brandName)}${
      brand.signerName ? ` · ${escapeHtml(brand.signerName)}${brand.signerTitle ? ` (${escapeHtml(brand.signerTitle)})` : ""}` : ""
    }${brand.contactEmail ? ` · ${escapeHtml(brand.contactEmail)}` : ""}${
      brand.website ? ` · <a href="${escapeAttr(brand.website)}">${escapeHtml(brand.website)}</a>` : ""
    }
    <br />Raport generat automat — nu înlocuiește validarea profesională.
  </div>
</body>
</html>
`
}

function buildSignatureTxt(input: {
  manifest: AuditPackManifest
  branding: EffectiveBranding
}): string {
  const lines = [
    "═══════════════════════════════════════════════════════════════════",
    "       COMPLIROAI AUDIT PACK — CRYPTOGRAPHIC SIGNATURE",
    "═══════════════════════════════════════════════════════════════════",
    "",
    `Schema:               ${input.manifest.schema}`,
    `Version:              ${input.manifest.version}`,
    `Generated at:         ${input.manifest.generatedAt}`,
    `Organization:         ${input.manifest.org.name}`,
    `Org ID:               ${input.manifest.org.id}`,
    input.manifest.org.cui ? `CUI:                  ${input.manifest.org.cui}` : null,
    "",
    `Issued by:            ${input.manifest.issuedBy.brandName}`,
    input.manifest.issuedBy.signerName
      ? `Signer:               ${input.manifest.issuedBy.signerName}${
          input.manifest.issuedBy.signerTitle ? ` (${input.manifest.issuedBy.signerTitle})` : ""
        }`
      : null,
    input.manifest.issuedBy.contactEmail ? `Contact:              ${input.manifest.issuedBy.contactEmail}` : null,
    "",
    `Files in bundle:      ${input.manifest.contents.length + 1}`,
    `AI systems:           ${input.manifest.summary.aiSystemsCount}`,
    `Annex IV docs:        ${input.manifest.summary.annexIvDocumentsCount}`,
    `Literacy records:     ${input.manifest.summary.literacyRecordsCount}`,
    `Share tokens:         ${input.manifest.summary.shareTokensCount}`,
    `Overall compliance:   ${input.manifest.summary.overallCompliancePct}%`,
    "",
    "──────────────────────  HASH CHAIN  ──────────────────────────────",
    "",
    `Algorithm:            SHA-256 (chained)`,
    `Hash chain root:`,
    `   ${input.manifest.hashChainRoot}`,
    "",
    "──────────────────────  SIGNATURE  ───────────────────────────────",
    "",
    `Algorithm:            HMAC-SHA256`,
    `Signature:`,
    `   ${input.manifest.signature}`,
    "",
    "───────────────────  HOW TO VERIFY  ──────────────────────────────",
    "",
    "1. Vizitează https://eu-ai-act-beige.vercel.app/verify-pack",
    "2. Încarcă acest ZIP prin drag & drop",
    "3. Pagina re-calculează hash chain-ul și compară cu cel din MANIFEST.json",
    "",
    "Alternativ, POST către /api/audit-pack/verify cu ZIP-ul în body:",
    "   curl -X POST --data-binary @audit-pack.zip \\",
    "        -H 'Content-Type: application/zip' \\",
    "        https://eu-ai-act-beige.vercel.app/api/audit-pack/verify",
    "",
    "Orice modificare a unui singur byte din orice fișier al pachetului",
    "va invalida hash chain-ul și va respinge dovada.",
    "",
    "═══════════════════════════════════════════════════════════════════",
  ]
    .filter((line): line is string => line !== null)
    .join("\n")
  return lines + "\n"
}

// ────────────────────────────────────────────────────────────────────────────
//   Helpers
// ────────────────────────────────────────────────────────────────────────────

function sha256(data: Buffer): string {
  return createHash("sha256").update(data).digest("hex")
}

function utf8(s: string): Buffer {
  return Buffer.from(s, "utf8")
}

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "org"
  )
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;")
}

function escapeAttr(value: string): string {
  return escapeHtml(value)
}

function computeSummaryForState(state: AIActState): {
  overallCompliancePct: number
  highRiskSystemsCount: number
} {
  if (state.aiSystems.length === 0) {
    return { overallCompliancePct: 100, highRiskSystemsCount: 0 }
  }
  let totalObligations = 0
  let doneObligations = 0
  let highRisk = 0
  for (const sys of state.aiSystems) {
    const cls = classifyAISystem(sys.purpose)
    if (cls.riskLevel === "high_risk") highRisk += 1
    // Approximate progress: count system-level signals as obligations.
    const ob = 3 // approval + attestation + at least one annex-iv
    totalObligations += ob
    if (sys.approvalStatus === "approved") doneObligations += 1
    if (sys.policyAttestationStatus === "attested") doneObligations += 1
  }
  const pct = totalObligations === 0 ? 100 : Math.round((doneObligations / totalObligations) * 100)
  return { overallCompliancePct: pct, highRiskSystemsCount: highRisk }
}

function pickOrgNameFromState(state: AIActState, orgId: string): string {
  // The state schema does not store org name directly; fall back to clientMeta
  // or org id. Cabinet → client packs include orgId.
  const meta = (state as unknown as { clientMeta?: { orgName?: string } }).clientMeta
  if (meta?.orgName && typeof meta.orgName === "string") return meta.orgName
  return orgId
}

function pickCuiFromState(state: AIActState): string | null {
  const meta = (state as unknown as { clientMeta?: { cui?: string }; onboarding?: { companyInfo?: { cui?: string } } })
  return (
    meta.clientMeta?.cui ??
    meta.onboarding?.companyInfo?.cui ??
    null
  )
}

async function loadStateForOrg(
  targetOrgId: string,
  sessionOrgId: string
): Promise<AIActState> {
  // Same-org path: use the cached/standard reader.
  if (targetOrgId === sessionOrgId) {
    return readCurrentOrgState()
  }
  // Cross-org (cabinet → client) path: load directly from Supabase + fallback.
  try {
    if (shouldUseSupabaseOrgState()) {
      const remote = await loadOrgStateFromSupabase<Partial<AIActState>>(targetOrgId)
      if (remote) {
        return {
          aiSystems: remote.aiSystems ?? [],
          literacyRecords: remote.literacyRecords ?? [],
          generatedDocuments: remote.generatedDocuments ?? [],
          onboarding: remote.onboarding ?? { completed: false, currentStep: 1 },
        }
      }
    }
  } catch {
    // fall through to local
  }
  try {
    const filePath = path.join(process.cwd(), ".data", `state-${targetOrgId}.json`)
    const raw = await fs.readFile(filePath, "utf-8")
    const parsed = JSON.parse(raw) as Partial<AIActState>
    return {
      aiSystems: parsed.aiSystems ?? [],
      literacyRecords: parsed.literacyRecords ?? [],
      generatedDocuments: parsed.generatedDocuments ?? [],
      onboarding: parsed.onboarding ?? { completed: false, currentStep: 1 },
    }
  } catch {
    return {
      aiSystems: [],
      literacyRecords: [],
      generatedDocuments: [],
      onboarding: { completed: false, currentStep: 1 },
    }
  }
}
