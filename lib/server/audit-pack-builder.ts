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
import type {
  AIDataMapRecord,
  AIIncident,
  AISystemRecord,
  BreachRecord,
  ComplianceEvent,
  DpiaRecord,
  FriaRecord,
  HumanOversightProtocol,
  LiteracyRecord,
  LoggingConfig,
  PmmPlan,
  QmsWorkspace,
  RopaActivityRecord,
  ScanFinding,
  VendorRecord,
} from "@/lib/compliance/types"
import type { WorkspaceMode } from "@/lib/server/auth"
import { mergeWithDefault, type AIActState, type GeneratedDocumentRecord } from "@/lib/server/store"
import { loadOrgStateFromSupabase, shouldUseSupabaseOrgState } from "@/lib/server/supabase-org-state"
import { promises as fs } from "node:fs"
import path from "node:path"
import { getEffectiveBranding, type EffectiveBranding } from "@/lib/server/white-label"
import { listOrgShareTokens, type ShareTokenRecord } from "@/lib/server/share-token-store"
import { buildAIActEvidencePack } from "@/lib/server/evidence-pack"
import { readState as readCurrentOrgState } from "@/lib/server/store"
import { verifyEventChain } from "@/lib/compliance/events"
import { buildDpiaMarkdownForRecord, type DpiaRecordWithLink } from "@/lib/server/dpia-store"
import { buildBreachMarkdown } from "@/lib/server/breach-store"
import { buildFriaMarkdown } from "@/lib/server/fria-store"
import { buildOversightMarkdown } from "@/lib/server/oversight-store"
import {
  buildContentAssetMarkdown,
  buildContentRegisterMarkdown,
} from "@/lib/server/transparency-content-store"
import { buildLoggingMarkdown } from "@/lib/server/logging-evidence-store"
import {
  LOGGING_EVENT_CATEGORY_LABELS,
  LOGGING_SEVERITY_LEVEL_LABELS,
  LOGGING_STORAGE_BACKEND_LABELS,
} from "@/lib/compliance/logging-schema"
import { buildPmmMarkdown } from "@/lib/server/pmm-store"
import { PMM_REVIEW_CYCLE_LABELS } from "@/lib/compliance/pmm-schema"
import { buildIncidentMarkdown } from "@/lib/server/ai-incident-store"
import {
  AI_INCIDENT_CATEGORY_LABELS,
  AI_INCIDENT_STATUS_LABELS,
} from "@/lib/compliance/ai-incident-schema"
import { buildQmsMarkdown } from "@/lib/compliance/qms-evaluator"
import {
  QMS_LESSON_SOURCE_LABELS,
  QMS_SECTION_LABELS,
  QMS_WORKSPACE_STATUS_LABELS,
  getQmsSchemaSection,
} from "@/lib/compliance/qms-schema"
import { DEPLOYER_TYPE_LABELS } from "@/lib/compliance/fria-schema"
import { buildRopaMachineReadableExport } from "@/lib/compliance/ropa-risk-engine"
import {
  buildVendorReviewBrief,
  evaluateVendorReview,
} from "@/lib/compliance/vendor-review-engine"
import type { VendorRiskContext } from "@/lib/compliance/vendor-risk"
import { buildAIPolicyPack } from "@/lib/compliance/ai-policy-pack"
import {
  formatEventsAsJSON,
  formatEventsAsMarkdown,
} from "@/lib/compliance/audit-log-formatters"

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
    workspaceMode: WorkspaceMode
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
    // Sprint 011 — extended summary (backward compatible; optional).
    findingsCount?: number
    dpiaRecordsCount?: number
    ropaActivitiesCount?: number
    breachRecordsCount?: number
    aiDataMapRecordsCount?: number
    vendorRecordsCount?: number
    dsarRequestsCount?: number
    eventsCount?: number
    chainOk?: boolean
    // Sprint 016 — FRIA records included in pack.
    friaRecordsCount?: number
    // Sprint 017 — Human Oversight protocols included in pack.
    oversightProtocolsCount?: number
    // Sprint 018 — Logging Evidence configs included in pack.
    loggingConfigsCount?: number
    // Sprint 019 — PMM plans included in pack.
    pmmPlansCount?: number
    // Sprint 020 — AI Incidents Art. 73 included in pack.
    aiIncidentsCount?: number
    // Sprint 021 — QMS Workspace Art. 17 included in pack (1 daca workspace
    // exista, 0 daca neinitializat).
    qmsWorkspaceCount?: number
    qmsCompleteness?: "incomplete" | "partial" | "complete"
    // Sprint 023.7 — Art. 50 Content Register (per-asset Content Labeling
    // Depth). Includes deepfake, synthetic image/video/audio/text,
    // public-interest text, chatbot interactions tracked individually.
    contentAssetsCount?: number
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
  workspaceMode: WorkspaceMode
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
      // Sprint 011 — extended summary counts.
      findingsCount: (state.findings ?? []).length,
      dpiaRecordsCount: (state.dpiaRecords ?? []).length,
      ropaActivitiesCount: (state.ropaActivities ?? []).length,
      breachRecordsCount: (state.breachRecords ?? []).length,
      aiDataMapRecordsCount: (state.aiDataMapRecords ?? []).length,
      vendorRecordsCount: (state.vendorRecords ?? []).length,
      dsarRequestsCount: (state.dsarRequests ?? []).length,
      eventsCount: (state.events ?? []).length,
      chainOk: verifyEventChain(state.events ?? []).ok,
      friaRecordsCount: (state.friaRecords ?? []).length,
      oversightProtocolsCount: (state.humanOversightProtocols ?? []).length,
      loggingConfigsCount: (state.loggingEvidence ?? []).length,
      pmmPlansCount: (state.pmmPlans ?? []).length,
      aiIncidentsCount: (state.aiIncidents ?? []).length,
      qmsWorkspaceCount: state.qmsWorkspace ? 1 : 0,
      qmsCompleteness: state.qmsWorkspace?.completeness,
      // Sprint 023.7 — count of Art. 50 content assets (per-asset register).
      contentAssetsCount: (state.aiContentAssets ?? []).length,
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
  workspaceMode: WorkspaceMode
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

  // ── Sprint 011: wire toate modulele noi în Audit Pack ────────────────────
  pushFindingsFiles(files, input.state, input.orgName, input.generatedAt)
  pushDpiaFiles(files, input.state, input.orgName)
  pushRopaFiles(files, input.state, input.orgName, input.targetOrgId, input.generatedAt)
  pushBreachFiles(files, input.state, input.orgName)
  pushAIDiscoveryFiles(files, input.state, input.orgName, input.generatedAt)
  pushVendorFiles(files, input.state, input.orgName)
  pushDsarFiles(files, input.state, input.generatedAt)
  pushAuditLogFiles(files, input.state, input.orgName, input.generatedAt)
  // ── Sprint 016: FRIA evidence per Art. 27 AI Act ────────────────────────
  pushFriaFiles(files, input.state, input.orgName)
  // ── Sprint 017: Human Oversight protocols per Art. 14 AI Act ────────────
  pushOversightFiles(files, input.state, input.orgName)
  // ── Sprint 018: Logging Evidence configs per Art. 12 + Art. 26(6) AI Act ──
  pushLoggingFiles(files, input.state, input.orgName)
  // ── Sprint 019: PMM plans per Art. 72 + Annex IV AI Act ─────────────────
  pushPmmFiles(files, input.state, input.orgName)
  // ── Sprint 020: AI Incidents Art. 73 (distinct de Breach GDPR Art. 33) ──
  pushAIIncidentFiles(files, input.state, input.orgName)
  // ── Sprint 021: QMS Workspace Art. 17 (umbrella module) ────────────────
  pushQmsFiles(files, input.state, input.orgName)
  // ── Sprint 023: API/SDK developer surface (api-sdk/) ──────────────────
  pushApiSdkFiles(files, input.state, input.orgName, input.generatedAt)

  // ── Sprint 023.7: Art. 50 Content Register per-asset ──────────────────
  pushContentRegisterFiles(files, input.state, input.orgName)

  return files
}

// ────────────────────────────────────────────────────────────────────────────
//   Sprint 023.7 — Art. 50 Content Register section
//
//   transparency/content-register.md           — top-level register
//   transparency/assets/{id}.md                — per-asset full record
// ────────────────────────────────────────────────────────────────────────────

function pushContentRegisterFiles(
  files: FileBytes[],
  state: AIActState,
  orgName: string,
): void {
  const assets = state.aiContentAssets ?? []
  files.push({
    path: "transparency/content-register.md",
    bytes: utf8(buildContentRegisterMarkdown(assets, orgName)),
  })
  for (const a of assets) {
    files.push({
      path: `transparency/assets/${slugify(a.id)}.md`,
      bytes: utf8(buildContentAssetMarkdown(a)),
    })
  }
}

// ────────────────────────────────────────────────────────────────────────────
//   Sprint 023 — API/SDK section
//
//   Three markdown files surfacing the developer-facing API surface for the
//   audit committee:
//     api-keys-registry.md       — active keys (label + prefix only)
//     recent-calls.md            — last 100 API calls
//     compliance-gate-results.md — aggregated gate verdicts from logs
// ────────────────────────────────────────────────────────────────────────────

function pushApiSdkFiles(
  files: FileBytes[],
  state: AIActState,
  orgName: string,
  generatedAt: string,
): void {
  const keys = state.apiKeys ?? []
  const logs = state.apiCallLogs ?? []

  // api-keys-registry.md
  const keyLines: string[] = [
    `# Registru API keys — ${orgName}`,
    ``,
    `**Exportat:** ${generatedAt}`,
    `**Total chei:** ${keys.length}`,
    ``,
    `Nicio cheie completă (full token) nu este stocată — doar SHA-256 hash + prefix de 8 caractere.`,
    ``,
  ]
  if (keys.length === 0) {
    keyLines.push(`_Nu există chei API generate._`)
  } else {
    keyLines.push(
      `| Nume | Prefix | Scope-uri | Status | Creat | Folosit ultima dată |`,
      `|---|---|---|---|---|---|`,
    )
    for (const k of keys) {
      keyLines.push(
        `| ${escapeMdCell(k.label)} | \`${k.prefix}…\` | ${k.scopes.join(", ")} | ${k.status} | ${k.createdAtISO} | ${k.lastUsedAtISO ?? "—"} |`,
      )
    }
  }
  files.push({
    path: "api-sdk/api-keys-registry.md",
    bytes: utf8(keyLines.join("\n") + "\n"),
  })

  // recent-calls.md
  const recent = logs.slice(0, 100)
  const callLines: string[] = [
    `# API calls recente — ${orgName}`,
    ``,
    `**Exportat:** ${generatedAt}`,
    `**Total în registru:** ${logs.length} (afișate ultimele ${recent.length})`,
    ``,
  ]
  if (recent.length === 0) {
    callLines.push(`_Nu există apeluri /api/v1/* înregistrate._`)
  } else {
    callLines.push(
      `| Endpoint | Metodă | Status | Durată (ms) | Sumar | Când |`,
      `|---|---|---|---|---|---|`,
    )
    for (const c of recent) {
      callLines.push(
        `| ${escapeMdCell(c.endpoint)} | ${c.method} | ${c.statusCode} | ${c.durationMs} | ${escapeMdCell(c.responseSummary)} | ${c.createdAtISO} |`,
      )
    }
  }
  files.push({
    path: "api-sdk/recent-calls.md",
    bytes: utf8(callLines.join("\n") + "\n"),
  })

  // compliance-gate-results.md — derive verdict aggregation from logs whose
  // endpoint is /api/v1/gate or /api/v1/deployment and responseSummary contains
  // "verdict=".
  const gateLogs = logs.filter(
    (c) =>
      (c.endpoint === "/api/v1/gate" || c.endpoint === "/api/v1/deployment") &&
      c.responseSummary.includes("verdict="),
  )
  const counts = { pass: 0, review_required: 0, blocked: 0, unknown: 0 }
  const recentBlocked: typeof gateLogs = []
  for (const c of gateLogs) {
    const m = c.responseSummary.match(/verdict=(pass|review_required|blocked)/)
    const v = m?.[1] as keyof typeof counts | undefined
    if (v) counts[v]++
    else counts.unknown++
    if (v === "blocked") recentBlocked.push(c)
  }
  const gateLines: string[] = [
    `# Compliance Gate — rezultate agregate — ${orgName}`,
    ``,
    `**Exportat:** ${generatedAt}`,
    `**Total evaluări gate:** ${gateLogs.length}`,
    ``,
    `## Distribuție verdicte`,
    ``,
    `| Verdict | Număr |`,
    `|---|---|`,
    `| pass | ${counts.pass} |`,
    `| review_required | ${counts.review_required} |`,
    `| blocked | ${counts.blocked} |`,
    `| necunoscut | ${counts.unknown} |`,
    ``,
    `## Ultimele 10 deploymenturi blocate`,
    ``,
  ]
  if (recentBlocked.length === 0) {
    gateLines.push(`_Nu există deploymenturi blocate în istoric._`)
  } else {
    gateLines.push(
      `| Endpoint | Sumar | Când |`,
      `|---|---|---|`,
    )
    for (const c of recentBlocked.slice(0, 10)) {
      gateLines.push(
        `| ${escapeMdCell(c.endpoint)} | ${escapeMdCell(c.responseSummary)} | ${c.createdAtISO} |`,
      )
    }
  }
  files.push({
    path: "api-sdk/compliance-gate-results.md",
    bytes: utf8(gateLines.join("\n") + "\n"),
  })
}

// ────────────────────────────────────────────────────────────────────────────
//   Sprint 011 — Module-specific file builders
//   Toate pure: primesc state + orgName, returnează FileBytes[] împinși în
//   array-ul `files`. Funcționează egal pentru same-org și cross-org pack-uri.
// ────────────────────────────────────────────────────────────────────────────

function pushFindingsFiles(
  files: FileBytes[],
  state: AIActState,
  orgName: string,
  generatedAt: string,
): void {
  const findings = state.findings ?? []
  files.push({
    path: "findings/registry.md",
    bytes: utf8(buildFindingsRegistryMd(findings, orgName, generatedAt)),
  })
  // Audit trail = events with type prefix "finding."
  const findingEvents = (state.events ?? []).filter((e) =>
    e.type.startsWith("finding."),
  )
  files.push({
    path: "findings/audit-trail.md",
    bytes: utf8(buildFindingAuditTrailMd(findingEvents, orgName, generatedAt)),
  })
}

function buildFindingsRegistryMd(
  findings: ScanFinding[],
  orgName: string,
  generatedAt: string,
): string {
  const lines: string[] = [
    `# Registru findings — ${orgName}`,
    ``,
    `**Exportat:** ${generatedAt}`,
    `**Total:** ${findings.length}`,
    ``,
  ]
  if (findings.length === 0) {
    lines.push(`_Nu există findings înregistrate._`)
    return lines.join("\n") + "\n"
  }
  lines.push(
    `| ID | Titlu | Categorie | Severitate | Status | Creat | Notă dovadă |`,
    `|---|---|---|---|---|---|---|`,
  )
  for (const f of findings) {
    const note = (f.operationalEvidenceNote ?? "—")
      .replace(/\|/g, "\\|")
      .replace(/\r?\n/g, " ")
      .slice(0, 80)
    lines.push(
      `| ${f.id} | ${escapeMdCell(f.title)} | ${f.category} | ${f.severity} | ${
        f.findingStatus ?? "open"
      } | ${f.createdAtISO} | ${note} |`,
    )
  }
  return lines.join("\n") + "\n"
}

function buildFindingAuditTrailMd(
  events: ComplianceEvent[],
  orgName: string,
  generatedAt: string,
): string {
  const lines: string[] = [
    `# Findings audit trail — ${orgName}`,
    ``,
    `**Exportat:** ${generatedAt}`,
    `**Evenimente:** ${events.length}`,
    ``,
  ]
  if (events.length === 0) {
    lines.push(`_Nu există evenimente de tip finding.* în ledger._`)
    return lines.join("\n") + "\n"
  }
  const sorted = [...events].sort((a, b) =>
    b.createdAtISO.localeCompare(a.createdAtISO),
  )
  lines.push(
    `| Timestamp | Actor | Tip | Finding ID | Mesaj |`,
    `|---|---|---|---|---|`,
  )
  for (const e of sorted) {
    lines.push(
      `| ${e.createdAtISO} | ${escapeMdCell(e.actorLabel ?? "system")} | ${e.type} | ${e.entityId} | ${escapeMdCell(e.message)} |`,
    )
  }
  return lines.join("\n") + "\n"
}

function pushDpiaFiles(
  files: FileBytes[],
  state: AIActState,
  orgName: string,
): void {
  const dpiaRecords = (state.dpiaRecords ?? []) as DpiaRecordWithLink[]
  const lines: string[] = [
    `# DPIA — ${orgName}`,
    ``,
    `**Total DPIA:** ${dpiaRecords.length}`,
    ``,
  ]
  if (dpiaRecords.length === 0) {
    lines.push(`_Nu există DPIA înregistrate._`)
  } else {
    lines.push(
      `| ID | Titlu | Status | Risc rezidual | Creat | Aprobat |`,
      `|---|---|---|---|---|---|`,
    )
    for (const r of dpiaRecords) {
      lines.push(
        `| ${r.id} | ${escapeMdCell(r.title)} | ${r.status} | ${r.residualRisk} | ${r.createdAtISO} | ${r.approvedAtISO ?? "—"} |`,
      )
    }
  }
  files.push({
    path: "dpia/registry.md",
    bytes: utf8(lines.join("\n") + "\n"),
  })
  // Per-record markdown via buildDpiaMarkdownForRecord.
  for (const r of dpiaRecords) {
    files.push({
      path: `dpia/records/${slugify(r.id)}.md`,
      bytes: utf8(buildDpiaMarkdownForRecord(r, orgName)),
    })
  }
}

function pushRopaFiles(
  files: FileBytes[],
  state: AIActState,
  orgName: string,
  orgId: string,
  generatedAt: string,
): void {
  const activities = (state.ropaActivities ?? []) as RopaActivityRecord[]
  const exported = buildRopaMachineReadableExport({
    activities,
    orgId,
    orgName,
    nowISO: generatedAt,
  })
  // Machine-readable JSON
  files.push({
    path: "ropa/data-map.json",
    bytes: utf8(JSON.stringify(exported, null, 2) + "\n"),
  })
  // Markdown (inline, derived from machine-readable export to remain pure)
  files.push({
    path: "ropa/data-map.md",
    bytes: utf8(buildRopaMarkdownFromExport(exported, orgName)),
  })
}

function buildRopaMarkdownFromExport(
  exported: ReturnType<typeof buildRopaMachineReadableExport>,
  orgName: string,
): string {
  const lines: string[] = [
    `# RoPA / Data Map — ${orgName}`,
    ``,
    `Schema: ${exported.schemaVersion} · Jurisdictie: ${exported.jurisdiction}`,
    `Generat: ${exported.generatedAtISO}`,
    `Activitati: ${exported.summary.exportedActivities} · Risc mediu: ${exported.summary.riskScoreAverage}/100`,
    ``,
    `## Sumar`,
    `- Total activitati: ${exported.summary.activityCount}`,
    `- Risc inalt: ${exported.summary.highRiskActivities}`,
    `- Risc mediu: ${exported.summary.mediumRiskActivities}`,
    `- Fara temei juridic: ${exported.summary.missingLegalBasis}`,
    `- Fara retentie: ${exported.summary.missingRetention}`,
    `- DPIA triggers: ${exported.summary.dpiaTriggers}`,
    `- Vendor review triggers: ${exported.summary.vendorReviewTriggers}`,
    ``,
    `## Activitati`,
  ]
  for (const a of exported.activities) {
    lines.push(`### ${a.name}`)
    lines.push(``)
    if (a.department) lines.push(`**Departament:** ${a.department}`)
    if (a.ownerName) lines.push(`**Owner:** ${a.ownerName}`)
    lines.push(`**Scop:** ${a.purpose || "—"}`)
    lines.push(`**Temei juridic:** ${a.legalBasis || "—"}`)
    if (a.article9Condition) lines.push(`**Condiție Art. 9:** ${a.article9Condition}`)
    lines.push(`**Persoane vizate:** ${a.dataSubjects.join(", ") || "—"}`)
    lines.push(`**Categorii date:** ${a.dataCategories.join(", ") || "—"}`)
    if (a.specialCategories.length)
      lines.push(`**Date speciale:** ${a.specialCategories.join(", ")}`)
    lines.push(`**Destinatari:** ${a.recipients.join(", ") || "—"}`)
    lines.push(`**Procesatori:** ${a.processors.join(", ") || "—"}`)
    lines.push(`**Sisteme:** ${a.systems.join(", ") || "—"}`)
    if (a.thirdCountryTransfers.length)
      lines.push(
        `**Transferuri externe:** ${a.thirdCountryTransfers.map((t) => `${t.country}${t.mechanism ? ` (${t.mechanism})` : ""}`).join(", ")}`,
      )
    lines.push(`**Retenție:** ${a.retentionRule || "—"}`)
    lines.push(`**Măsuri securitate:** ${a.securityMeasures.join(", ") || "—"}`)
    lines.push(
      `**Status:** ${a.status} · **Risc:** ${a.risk.level} (${a.risk.score}/100)`,
    )
    if (a.risk.reasons.length) {
      lines.push(`**Motive risc:**`)
      a.risk.reasons.forEach((r) => lines.push(`- ${r}`))
    }
    if (a.linkedAISystemIds.length) {
      lines.push(`**Sisteme AI legate:** ${a.linkedAISystemIds.join(", ")}`)
    }
    if (a.links.findings.length) {
      lines.push(`**Findings:** ${a.links.findings.join(", ")}`)
    }
    lines.push(``)
  }
  return lines.join("\n")
}

function pushBreachFiles(
  files: FileBytes[],
  state: AIActState,
  orgName: string,
): void {
  const records = (state.breachRecords ?? []) as BreachRecord[]
  const lines: string[] = [
    `# Incidente date personale (Art. 33/34 GDPR) — ${orgName}`,
    ``,
    `**Total:** ${records.length}`,
    ``,
  ]
  if (records.length === 0) {
    lines.push(`_Nu există incidente înregistrate._`)
  } else {
    lines.push(
      `| ID | Titlu | Severitate | Status | Descoperit | Deadline 72h |`,
      `|---|---|---|---|---|---|`,
    )
    for (const r of records) {
      lines.push(
        `| ${r.id} | ${escapeMdCell(r.title)} | ${r.severity} | ${r.status} | ${r.discoveredAtISO} | ${r.deadlineISO} |`,
      )
    }
  }
  files.push({
    path: "breach/registry.md",
    bytes: utf8(lines.join("\n") + "\n"),
  })
  for (const r of records) {
    files.push({
      path: `breach/records/${slugify(r.id)}.md`,
      bytes: utf8(buildBreachMarkdown(r, orgName)),
    })
  }
}

function pushAIDiscoveryFiles(
  files: FileBytes[],
  state: AIActState,
  orgName: string,
  generatedAt: string,
): void {
  const dataMap = (state.aiDataMapRecords ?? []) as AIDataMapRecord[]
  // AI Data Map list
  const lines: string[] = [
    `# AI Data Map — ${orgName}`,
    ``,
    `**Total tool-uri AI:** ${dataMap.length}`,
    `**Exportat:** ${generatedAt}`,
    ``,
  ]
  if (dataMap.length === 0) {
    lines.push(`_Nu există tool-uri AI înregistrate._`)
  } else {
    lines.push(
      `| ID | Tool | Vendor | Categorie | Date personale | Risc | DPA |`,
      `|---|---|---|---|---|---|---|`,
    )
    for (const r of dataMap) {
      lines.push(
        `| ${r.id} | ${escapeMdCell(r.toolName)} | ${escapeMdCell(r.vendor)} | ${r.useCaseCategory} | ${r.processesPersonalData ? "Da" : "Nu"} | ${r.riskCandidate} | ${r.dpaSigned ? "Da" : "Nu"} |`,
      )
    }
  }
  files.push({
    path: "ai-discovery/data-map.md",
    bytes: utf8(lines.join("\n") + "\n"),
  })

  // Latest exposure report (if any)
  const reports = state.aiExposureReports ?? []
  const latest = reports.length > 0 ? reports[0] : null
  files.push({
    path: "ai-discovery/exposure-report.md",
    bytes: utf8(
      latest
        ? latest.markdown
        : `# AI Exposure Report — ${orgName}\n\n_Nu există raport generat (folosește /api/ai-data-discovery/exposure-report)._\n`,
    ),
  })

  // Policy pack — 5 markdown templates regenerate la build.
  const policyPack = buildAIPolicyPack({
    orgName,
    generatedAtISO: generatedAt,
  })
  for (const tpl of policyPack.templates) {
    files.push({
      path: `ai-discovery/policy-pack/${tpl.fileName}`,
      bytes: utf8(tpl.markdown),
    })
  }
}

function pushVendorFiles(
  files: FileBytes[],
  state: AIActState,
  orgName: string,
): void {
  const vendors = (state.vendorRecords ?? []) as VendorRecord[]
  const aiSystems = (state.aiSystems ?? []) as AISystemRecord[]
  const dataMaps = (state.aiDataMapRecords ?? []) as AIDataMapRecord[]

  const lines: string[] = [
    `# Vendor AI — ${orgName}`,
    ``,
    `**Total vendori:** ${vendors.length}`,
    ``,
  ]
  if (vendors.length === 0) {
    lines.push(`_Nu există vendori înregistrați._`)
  } else {
    lines.push(
      `| ID | Vendor | Produs | Regiune | DPA | Risc | Status |`,
      `|---|---|---|---|---|---|---|`,
    )
    for (const v of vendors) {
      lines.push(
        `| ${v.id} | ${escapeMdCell(v.name)} | ${escapeMdCell(v.productUsed)} | ${v.vendorRegion} | ${v.dpaStatus} | ${v.riskLevel} | ${v.reviewStatus} |`,
      )
    }
  }
  files.push({
    path: "vendor/registry.md",
    bytes: utf8(lines.join("\n") + "\n"),
  })

  for (const v of vendors) {
    const ctx = buildVendorRiskContext(v, aiSystems, dataMaps)
    // Re-evaluăm pentru a obține risk reasons fresh la build-time.
    evaluateVendorReview(v, ctx)
    files.push({
      path: `vendor/briefs/${slugify(v.id)}.md`,
      bytes: utf8(buildVendorReviewBrief(v, ctx, orgName)),
    })
  }
}

/**
 * Recomputează `VendorRiskContext` din state — inline pentru ca audit-pack
 * să fie auto-suficient (nu cere imports din vendor-review-store care folosește
 * readState() request-scoped).
 */
function buildVendorRiskContext(
  vendor: VendorRecord,
  aiSystems: AISystemRecord[],
  aiDataMaps: AIDataMapRecord[],
): VendorRiskContext {
  const linkedSystems = aiSystems.filter((s) =>
    vendor.linkedAISystemIds.includes(s.id),
  )
  const linkedMaps = aiDataMaps.filter((m) =>
    vendor.linkedAIDataMapIds.includes(m.id),
  )
  const personalData =
    linkedSystems.some((s) => s.usesPersonalData) ||
    linkedMaps.some((m) => m.processesPersonalData)
  const specialCategories = linkedMaps.some((m) => m.processesSpecialCategories)
  const childrenData = linkedMaps.some((m) => m.childrenData)
  const isAIVendor =
    vendor.serviceCategory.toLowerCase().includes("ai") ||
    linkedSystems.length > 0 ||
    linkedMaps.length > 0
  return {
    processesPersonalData: personalData,
    processesSpecialCategories: specialCategories,
    childrenData,
    isAIVendor,
  }
}

function pushFriaFiles(
  files: FileBytes[],
  state: AIActState,
  orgName: string,
): void {
  const records = (state.friaRecords ?? []) as FriaRecord[]
  const aiSystems = (state.aiSystems ?? []) as AISystemRecord[]

  // Registry markdown — table of all FRIA records.
  const lines: string[] = [
    `# FRIA — ${orgName}`,
    ``,
    `**Total:** ${records.length}`,
    `**Cadru:** EU AI Act Art. 27 — Fundamental Rights Impact Assessment`,
    ``,
  ]
  if (records.length === 0) {
    lines.push(`_Nu există FRIA înregistrate._`)
  } else {
    lines.push(
      `| ID | Titlu | Sistem AI | Tip deployer | Risc | Status | Aprobat de | Notificat autoritate |`,
      `|---|---|---|---|---|---|---|---|`,
    )
    for (const r of records) {
      const systemName =
        aiSystems.find((s) => s.id === r.linkedAISystemId)?.name ??
        r.linkedAISystemId
      const deployerLabel =
        DEPLOYER_TYPE_LABELS[r.deployerType] ?? r.deployerType
      lines.push(
        `| ${r.id} | ${escapeMdCell(r.title)} | ${escapeMdCell(systemName)} | ${escapeMdCell(deployerLabel)} | ${r.overallRiskLevel} (${r.overallRiskScore}/100) | ${r.status} | ${r.approvedByEmail ?? "—"} | ${r.notifiedAtISO ? `${r.notifyAuthorityName ?? ""} (${r.notifiedAtISO.slice(0, 10)})` : "—"} |`,
      )
    }
  }
  files.push({
    path: "fria/registry.md",
    bytes: utf8(lines.join("\n") + "\n"),
  })

  // Per-record markdown via buildFriaMarkdown (regenerated fresh at build).
  for (const r of records) {
    const systemName = aiSystems.find((s) => s.id === r.linkedAISystemId)?.name
    files.push({
      path: `fria/records/${slugify(r.id)}.md`,
      bytes: utf8(buildFriaMarkdown(r, orgName, systemName)),
    })
  }
}

/**
 * Sprint 017 — Human Oversight Protocols (Art. 14 AI Act). Pattern identic
 * cu pushFriaFiles: registry.md + records/{id}.md regenerat live via
 * buildOversightMarkdown pentru hash chain.
 */
function pushOversightFiles(
  files: FileBytes[],
  state: AIActState,
  orgName: string,
): void {
  const records = (state.humanOversightProtocols ?? []) as HumanOversightProtocol[]
  const aiSystems = (state.aiSystems ?? []) as AISystemRecord[]

  const lines: string[] = [
    `# Human Oversight Protocols — ${orgName}`,
    ``,
    `**Total:** ${records.length}`,
    `**Cadru:** EU AI Act Art. 14 — supraveghere umană (+ Art. 26(2) responsabilități deployer)`,
    ``,
  ]
  if (records.length === 0) {
    lines.push(`_Nu există protocoale Oversight înregistrate._`)
  } else {
    lines.push(
      `| ID | Titlu | Sistem AI | Model | Completeness | Status | Aprobat de | Următoarea revizie |`,
      `|---|---|---|---|---|---|---|---|`,
    )
    for (const r of records) {
      const systemName =
        aiSystems.find((s) => s.id === r.linkedAISystemId)?.name ??
        r.linkedAISystemId
      lines.push(
        `| ${r.id} | ${escapeMdCell(r.title)} | ${escapeMdCell(systemName)} | ${r.oversightModel} | ${r.completeness} | ${r.status} | ${r.approvedByEmail ?? "—"} | ${r.nextReviewISO ? r.nextReviewISO.slice(0, 10) : "—"} |`,
      )
    }
  }
  files.push({
    path: "oversight/registry.md",
    bytes: utf8(lines.join("\n") + "\n"),
  })

  for (const r of records) {
    const systemName = aiSystems.find((s) => s.id === r.linkedAISystemId)?.name
    files.push({
      path: `oversight/records/${slugify(r.id)}.md`,
      bytes: utf8(buildOversightMarkdown(r, orgName, systemName)),
    })
  }
}

/**
 * Sprint 018 — Logging Evidence configs (Art. 12 + Art. 26(6) AI Act).
 * Pattern identic cu pushOversightFiles: registry.md + records/{id}.md
 * regenerat live via buildLoggingMarkdown.
 */
function pushLoggingFiles(
  files: FileBytes[],
  state: AIActState,
  orgName: string,
): void {
  const records = (state.loggingEvidence ?? []) as LoggingConfig[]
  const aiSystems = (state.aiSystems ?? []) as AISystemRecord[]

  const lines: string[] = [
    `# Logging Evidence — ${orgName}`,
    ``,
    `**Total:** ${records.length}`,
    `**Cadru:** EU AI Act Art. 12 — logging automat + Art. 26(6) — retenție min 6 luni`,
    ``,
  ]
  if (records.length === 0) {
    lines.push(`_Nu există configurări de logging înregistrate._`)
  } else {
    lines.push(
      `| ID | Titlu | Sistem AI | Severitate | Storage | Retenție | Completeness | Retention status | Status | Activat de |`,
      `|---|---|---|---|---|---|---|---|---|---|`,
    )
    for (const r of records) {
      const systemName =
        aiSystems.find((s) => s.id === r.linkedAISystemId)?.name ??
        r.linkedAISystemId
      lines.push(
        `| ${r.id} | ${escapeMdCell(r.title)} | ${escapeMdCell(systemName)} | ${r.severityLevel} | ${r.storageBackend} | ${r.actualRetentionMonths}/${r.minRetentionMonths}mo | ${r.completeness} | ${r.retentionStatus} | ${r.status} | ${r.approvedByEmail ?? "—"} |`,
      )
    }
  }
  files.push({
    path: "logging/registry.md",
    bytes: utf8(lines.join("\n") + "\n"),
  })

  for (const r of records) {
    const systemName = aiSystems.find((s) => s.id === r.linkedAISystemId)?.name
    files.push({
      path: `logging/records/${slugify(r.id)}.md`,
      bytes: utf8(buildLoggingMarkdown(r, orgName, systemName)),
    })
  }

  // Suppress unused-import warnings when records=0 (still exporting labels for type safety).
  void LOGGING_EVENT_CATEGORY_LABELS
  void LOGGING_SEVERITY_LEVEL_LABELS
  void LOGGING_STORAGE_BACKEND_LABELS
}

/**
 * Sprint 019 — Post-Market Monitoring plans (Art. 72 + Annex IV AI Act).
 * Pattern identic cu pushLoggingFiles: registry.md + records/{id}.md
 * regenerat live via buildPmmMarkdown. Records includ inline reviews,
 * version changes, anomalii (timeline complet pentru auditor).
 */
function pushPmmFiles(
  files: FileBytes[],
  state: AIActState,
  orgName: string,
): void {
  const records = (state.pmmPlans ?? []) as PmmPlan[]
  const aiSystems = (state.aiSystems ?? []) as AISystemRecord[]

  const lines: string[] = [
    `# Post-Market Monitoring — ${orgName}`,
    ``,
    `**Total planuri:** ${records.length}`,
    `**Cadru:** EU AI Act Art. 72 — sistem PMM + Annex IV pct. 10 — descriere PMM în technical documentation + Art. 43(4) — substantial modification triggers re-evaluation`,
    ``,
  ]
  if (records.length === 0) {
    lines.push(`_Nu există planuri PMM înregistrate._`)
  } else {
    lines.push(
      `| ID | Titlu | Sistem AI | Ciclu | Completeness | Freshness | Reviews | Version changes | Anomalii | Status | Aprobat de |`,
      `|---|---|---|---|---|---|---|---|---|---|---|`,
    )
    for (const r of records) {
      const systemName =
        aiSystems.find((s) => s.id === r.linkedAISystemId)?.name ??
        r.linkedAISystemId
      const unresolved = r.anomalies.filter((a) => !a.resolved).length
      lines.push(
        `| ${r.id} | ${escapeMdCell(r.title)} | ${escapeMdCell(systemName)} | ${r.reviewCycle} | ${r.completeness} | ${r.freshnessStatus} | ${r.reviews.length} | ${r.versionChanges.length} | ${r.anomalies.length} (${unresolved} unresolved) | ${r.status} | ${r.approvedByEmail ?? "—"} |`,
      )
    }
  }
  files.push({
    path: "pmm/registry.md",
    bytes: utf8(lines.join("\n") + "\n"),
  })

  for (const r of records) {
    const systemName = aiSystems.find((s) => s.id === r.linkedAISystemId)?.name
    files.push({
      path: `pmm/records/${slugify(r.id)}.md`,
      bytes: utf8(buildPmmMarkdown(r, orgName, systemName)),
    })
  }

  // Suppress unused-import warning when records=0
  void PMM_REVIEW_CYCLE_LABELS
}

/**
 * Sprint 020 — AI Incident Reporting (Art. 73 AI Act, distinct de GDPR Art.
 * 33 / Sprint 008D). Pattern identic: registry.md + records/{id}.md
 * regenerat live via buildIncidentMarkdown. Records includ inline cronologie
 * Art. 73(3), notifications timeline, investigația root cause Art. 73(4),
 * linkages BreachRecord + PmmAnomalyRecord.
 */
function pushAIIncidentFiles(
  files: FileBytes[],
  state: AIActState,
  orgName: string,
): void {
  const records = (state.aiIncidents ?? []) as AIIncident[]
  const aiSystems = (state.aiSystems ?? []) as AISystemRecord[]

  const lines: string[] = [
    `# AI Incidents — Art. 73 — ${orgName}`,
    ``,
    `**Total incidente:** ${records.length}`,
    `**Cadru:** EU AI Act Art. 73 — incidente serioase pe sisteme AI high-risk (distinct de GDPR Art. 33 breach)`,
    ``,
  ]
  if (records.length === 0) {
    lines.push(`_Nu există incidente AI înregistrate._`)
  } else {
    lines.push(
      `| ID | Titlu | Sistem AI | Categorie Art. 73(2) | Severitate | Status | Termen (zile) | Notificat | Root cause | Asignat |`,
      `|---|---|---|---|---|---|---|---|---|---|`,
    )
    for (const r of records) {
      const systemName =
        aiSystems.find((s) => s.id === r.linkedAISystemId)?.name ??
        r.linkedAISystemId
      const notified = r.notifications.some(
        (n) => n.status === "submitted" || n.status === "acknowledged",
      )
      lines.push(
        `| ${r.id} | ${escapeMdCell(r.title)} | ${escapeMdCell(systemName)} | ${escapeMdCell(AI_INCIDENT_CATEGORY_LABELS[r.category])} | ${r.severity} | ${AI_INCIDENT_STATUS_LABELS[r.status]} | ${r.reportingDeadlineDays} | ${notified ? "DA" : "NU"} | ${r.rootCause ? "DA" : "NU"} | ${r.assignedToEmail ?? "—"} |`,
      )
    }
  }
  files.push({
    path: "ai-incidents/registry.md",
    bytes: utf8(lines.join("\n") + "\n"),
  })

  for (const r of records) {
    const systemName = aiSystems.find((s) => s.id === r.linkedAISystemId)?.name
    files.push({
      path: `ai-incidents/records/${slugify(r.id)}.md`,
      bytes: utf8(buildIncidentMarkdown(r, orgName, systemName)),
    })
  }

  // Suppress unused-import warnings (labels stay imported for type safety)
  void AI_INCIDENT_CATEGORY_LABELS
  void AI_INCIDENT_STATUS_LABELS
}

/**
 * Sprint 021 — QMS Workspace (Art. 17 EU AI Act umbrella module). Patternul
 * urmărit: workspace.md (long-form 13 sectiuni + lessons + attestations) +
 * sections/{key}.md (granular per sectiune) + lessons-learned.md +
 * system-attestations.md + cross-module-health.md. Daca QMS nu este
 * initializat, scrie un singur fisier note (audit-pack rămâne valid).
 */
function pushQmsFiles(
  files: FileBytes[],
  state: AIActState,
  orgName: string,
): void {
  const workspace = state.qmsWorkspace as QmsWorkspace | undefined
  if (!workspace) {
    files.push({
      path: "qms/README.md",
      bytes: utf8(
        `# QMS — ${orgName}\n\n_QMS Workspace (Art. 17 EU AI Act) nu este inițializat pentru această organizație._\n`,
      ),
    })
    return
  }
  // 1) workspace.md — full markdown via evaluator
  files.push({
    path: "qms/workspace.md",
    bytes: utf8(
      buildQmsMarkdown({
        workspace,
        orgName,
        state,
      }),
    ),
  })
  // 2) sections/{key}.md — granular per sectiune
  for (const section of workspace.sections) {
    const schemaSec = getQmsSchemaSection(section.key)
    if (!schemaSec) continue
    const lines: string[] = [
      `# QMS Sectiunea ${schemaSec.letter} — ${schemaSec.displayLabel}`,
      ``,
      `**Organizatie:** ${orgName}`,
      `**Referinta legala:** ${schemaSec.articleRef}`,
      `**Status:** ${section.status}`,
      `**Tier:** ${schemaSec.tier}`,
      `**Responsabil rol:** ${section.responsibleRole || "—"}`,
      section.responsibleEmail ? `**Responsabil email:** ${section.responsibleEmail}` : "",
      section.approvedAtISO
        ? `**Aprobat la:** ${section.approvedAtISO} de ${section.approvedByEmail ?? "—"}`
        : "",
      ``,
      `## Descriere`,
      section.description || "_de completat_",
      ``,
      `## Procedura`,
      section.procedureSummary || "_de completat_",
      ``,
      `## Cross-module references`,
    ]
    const counts: string[] = []
    if (section.linkedRopaActivityCount !== undefined)
      counts.push(`- RoPA activities: ${section.linkedRopaActivityCount}`)
    if (section.linkedAIDataMapCount !== undefined)
      counts.push(`- AI Data Map: ${section.linkedAIDataMapCount}`)
    if (section.linkedDpiaCount !== undefined)
      counts.push(`- DPIA: ${section.linkedDpiaCount}`)
    if (section.linkedFriaCount !== undefined)
      counts.push(`- FRIA: ${section.linkedFriaCount}`)
    if (section.linkedFindingCount !== undefined)
      counts.push(`- Findings (open): ${section.linkedFindingCount}`)
    if (section.linkedPmmPlanCount !== undefined)
      counts.push(`- PMM plans: ${section.linkedPmmPlanCount}`)
    if (section.linkedAIIncidentCount !== undefined)
      counts.push(`- AI Incidents: ${section.linkedAIIncidentCount}`)
    if (section.linkedLoggingConfigCount !== undefined)
      counts.push(`- Logging Evidence: ${section.linkedLoggingConfigCount}`)
    if (counts.length === 0) lines.push("_Niciun modul cross-linkat._")
    else lines.push(...counts)
    lines.push("")
    lines.push(`## Documente atasate (${section.documentReferences.length})`)
    if (section.documentReferences.length === 0) {
      lines.push("_Niciun document atasat._")
    } else {
      for (const d of section.documentReferences) {
        lines.push(
          `- **${d.type}** · ${escapeMdCell(d.title)}${d.versionLabel ? ` (${d.versionLabel})` : ""} — atasat ${d.attachedAtISO} de ${d.attachedByEmail}${d.url ? ` · ${d.url}` : ""}`,
        )
      }
    }
    if (section.notes) {
      lines.push("")
      lines.push("## Note")
      lines.push(section.notes)
    }
    files.push({
      path: `qms/sections/${section.key}.md`,
      bytes: utf8(lines.join("\n") + "\n"),
    })
  }
  // 3) lessons-learned.md
  {
    const lines: string[] = [
      `# QMS Lessons Learned — ${orgName}`,
      ``,
      `**Total:** ${workspace.lessonsLearned.length}`,
      ``,
    ]
    if (workspace.lessonsLearned.length === 0) {
      lines.push(`_Nicio lectie inregistrata._`)
    } else {
      for (const l of workspace.lessonsLearned) {
        lines.push(`## ${l.title}`)
        lines.push(``)
        lines.push(`- Sursa: ${QMS_LESSON_SOURCE_LABELS[l.source]}`)
        if (l.sourceEntityId) lines.push(`- Entitate sursa: ${l.sourceEntityId}`)
        lines.push(`- Inregistrat: ${l.recordedAtISO} de ${l.recordedByEmail}`)
        if (l.applicableToSystems.length > 0) {
          lines.push(`- Sisteme aplicabile: ${l.applicableToSystems.join(", ")}`)
        }
        lines.push(``)
        lines.push(`**Cauza radacina:** ${l.rootCauseSummary}`)
        if (l.preventiveActionsTaken.length > 0) {
          lines.push(``)
          lines.push(`**Actiuni preventive aplicate:**`)
          for (const a of l.preventiveActionsTaken) lines.push(`- ${a}`)
        }
        if (l.resultingPolicyChange) {
          lines.push(``)
          lines.push(`**Schimbare politica:** ${l.resultingPolicyChange}`)
        }
        if (l.resultingProcessChange) {
          lines.push(``)
          lines.push(`**Schimbare proces:** ${l.resultingProcessChange}`)
        }
        lines.push(``)
      }
    }
    files.push({
      path: "qms/lessons-learned.md",
      bytes: utf8(lines.join("\n") + "\n"),
    })
  }
  // 4) system-attestations.md
  {
    const lines: string[] = [
      `# QMS Per-System Attestations — ${orgName}`,
      ``,
      `**Total:** ${workspace.systemAttestations.length}`,
      ``,
    ]
    const aiSystems = (state.aiSystems ?? []) as AISystemRecord[]
    const sysById = new Map<string, AISystemRecord>()
    for (const s of aiSystems) sysById.set(s.id, s)
    if (workspace.systemAttestations.length === 0) {
      lines.push(`_Niciun sistem atestat._`)
    } else {
      lines.push(
        `| Sistem | Versiune QMS | Atestat la | Atestat de | Sectiuni acoperite | Gap-uri |`,
      )
      lines.push(`|---|---|---|---|---|---|`)
      for (const a of workspace.systemAttestations) {
        const sysName = sysById.get(a.systemId)?.name ?? a.systemId
        lines.push(
          `| ${escapeMdCell(sysName)} | ${escapeMdCell(a.qmsVersionLabel)} | ${a.attestedAtISO} | ${a.attestedByEmail} | ${a.sectionsConfirmedCovered.length}/13 | ${a.gapsAcknowledged.length} |`,
        )
      }
    }
    files.push({
      path: "qms/system-attestations.md",
      bytes: utf8(lines.join("\n") + "\n"),
    })
  }
  // 5) cross-module-health.md
  {
    const lines: string[] = [
      `# QMS Cross-Module Health — ${orgName}`,
      ``,
      `**Versiune QMS:** ${workspace.versionLabel}`,
      `**Status:** ${QMS_WORKSPACE_STATUS_LABELS[workspace.status]}`,
      `**Completeness:** ${workspace.completeness}`,
      ``,
      `| Litera | Sectiune | Module asteptate | Total refs |`,
      `|---|---|---|---|`,
    ]
    for (const section of workspace.sections) {
      const schemaSec = getQmsSchemaSection(section.key)
      if (!schemaSec || schemaSec.crossModuleLinks.length === 0) continue
      const totalRefs =
        (section.linkedRopaActivityCount ?? 0) +
        (section.linkedAIDataMapCount ?? 0) +
        (section.linkedDpiaCount ?? 0) +
        (section.linkedFriaCount ?? 0) +
        (section.linkedFindingCount ?? 0) +
        (section.linkedPmmPlanCount ?? 0) +
        (section.linkedAIIncidentCount ?? 0) +
        (section.linkedLoggingConfigCount ?? 0)
      lines.push(
        `| ${schemaSec.letter} | ${escapeMdCell(schemaSec.displayLabel)} | ${schemaSec.crossModuleLinks.join(", ")} | ${totalRefs} |`,
      )
    }
    files.push({
      path: "qms/cross-module-health.md",
      bytes: utf8(lines.join("\n") + "\n"),
    })
  }
  // Suppress unused-import warning (label catalog stays imported for type safety)
  void QMS_SECTION_LABELS
}

function pushDsarFiles(
  files: FileBytes[],
  state: AIActState,
  generatedAt: string,
): void {
  const dsar = state.dsarRequests ?? []
  const lines: string[] = [
    `# DSAR Registry`,
    ``,
    `**Exportat:** ${generatedAt}`,
    `**Total cereri:** ${dsar.length}`,
    ``,
  ]
  if (dsar.length === 0) {
    lines.push(`_Nu există cereri DSAR înregistrate._`)
  } else {
    lines.push(
      `| ID | Tip | Solicitant | Email | Status | Primit | Deadline |`,
      `|---|---|---|---|---|---|---|`,
    )
    for (const r of dsar) {
      lines.push(
        `| ${r.id} | ${r.requestType} | ${escapeMdCell(r.requesterName)} | ${escapeMdCell(r.requesterEmail)} | ${r.status} | ${r.receivedAtISO} | ${r.deadlineISO} |`,
      )
    }
  }
  files.push({
    path: "dsar/registry.md",
    bytes: utf8(lines.join("\n") + "\n"),
  })
}

function pushAuditLogFiles(
  files: FileBytes[],
  state: AIActState,
  orgName: string,
  generatedAt: string,
): void {
  const events = state.events ?? []
  // JSON: include hash chain fields pentru audit forensic.
  files.push({
    path: "audit-log/events.json",
    bytes: utf8(formatEventsAsJSON(events, true)),
  })
  // Markdown: tabular pentru auditor inspectabil rapid.
  files.push({
    path: "audit-log/events.md",
    bytes: utf8(formatEventsAsMarkdown(events, orgName, generatedAt)),
  })
  // Chain verification snapshot la build-time.
  const verification = verifyEventChain(events)
  files.push({
    path: "audit-log/chain-verification.json",
    bytes: utf8(
      JSON.stringify(
        {
          verifiedAtISO: generatedAt,
          totalEvents: events.length,
          ...verification,
        },
        null,
        2,
      ) + "\n",
    ),
  })
}

function escapeMdCell(value: string): string {
  return value
    .replace(/\|/g, "\\|")
    .replace(/\r?\n/g, " ")
    .trim()
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

  // FRIA records (Art. 27)
  for (const fria of input.state.friaRecords ?? []) {
    push(
      fria.createdAtISO,
      input.issuedByUserEmail,
      "FRIA_CREATED",
      `${fria.title} → system=${fria.linkedAISystemId} risk=${fria.overallRiskLevel}`,
    )
    if (fria.approvedAtISO) {
      push(
        fria.approvedAtISO,
        fria.approvedByEmail ?? input.issuedByUserEmail,
        "FRIA_APPROVED",
        fria.title,
      )
    }
    if (fria.notifiedAtISO) {
      push(
        fria.notifiedAtISO,
        input.issuedByUserEmail,
        "FRIA_AUTHORITY_NOTIFIED",
        `${fria.title} → ${fria.notifyAuthorityName ?? "—"} ref=${fria.authorityReference ?? "—"}`,
      )
    }
  }

  // Sprint 017 — Human Oversight Protocols (Art. 14)
  for (const op of input.state.humanOversightProtocols ?? []) {
    push(
      op.createdAtISO,
      input.issuedByUserEmail,
      "OVERSIGHT_PROTOCOL_CREATED",
      `${op.title} → system=${op.linkedAISystemId} model=${op.oversightModel} completeness=${op.completeness}`,
    )
    if (op.approvedAtISO) {
      push(
        op.approvedAtISO,
        op.approvedByEmail ?? input.issuedByUserEmail,
        "OVERSIGHT_PROTOCOL_APPROVED",
        op.title,
      )
    }
    for (const ev of op.evidenceItems) {
      push(
        ev.uploadedAtISO,
        ev.uploadedByEmail,
        "OVERSIGHT_EVIDENCE_ATTACHED",
        `${op.title} → ${ev.type}: ${ev.description}`,
      )
    }
  }

  // Sprint 018 — Logging Evidence configs (Art. 12 + Art. 26(6))
  for (const lg of input.state.loggingEvidence ?? []) {
    push(
      lg.createdAtISO,
      input.issuedByUserEmail,
      "LOGGING_CONFIG_CREATED",
      `${lg.title} → system=${lg.linkedAISystemId} severity=${lg.severityLevel} retention=${lg.actualRetentionMonths}/${lg.minRetentionMonths}mo completeness=${lg.completeness}`,
    )
    if (lg.approvedAtISO) {
      push(
        lg.approvedAtISO,
        lg.approvedByEmail ?? input.issuedByUserEmail,
        "LOGGING_CONFIG_ACTIVATED",
        lg.title,
      )
    }
    for (const ev of lg.evidenceItems) {
      push(
        ev.uploadedAtISO,
        ev.uploadedByEmail,
        "LOGGING_EVIDENCE_ATTACHED",
        `${lg.title} → ${ev.type}: ${ev.description}${ev.eventCount ? ` (${ev.eventCount} events)` : ""}`,
      )
    }
  }

  // Sprint 019 — Post-Market Monitoring plans (Art. 72)
  for (const pm of input.state.pmmPlans ?? []) {
    push(
      pm.createdAtISO,
      input.issuedByUserEmail,
      "PMM_PLAN_CREATED",
      `${pm.title} → system=${pm.linkedAISystemId} cycle=${pm.reviewCycle} completeness=${pm.completeness}`,
    )
    if (pm.approvedAtISO) {
      push(
        pm.approvedAtISO,
        pm.approvedByEmail ?? input.issuedByUserEmail,
        "PMM_PLAN_ACTIVATED",
        pm.title,
      )
    }
    for (const rv of pm.reviews) {
      push(
        rv.reviewDateISO,
        rv.reviewedByEmail,
        "PMM_REVIEW_RECORDED",
        `${pm.title} → ${rv.reviewType} (risks=${rv.risksDetected.length} corrective=${rv.correctiveActions.length})`,
      )
    }
    for (const ch of pm.versionChanges) {
      push(
        ch.changedAtISO,
        ch.changedByEmail,
        "PMM_VERSION_CHANGE",
        `${pm.title} → ${ch.oldVersion}→${ch.newVersion} (${ch.changeType}, substantial=${ch.substantialModification})`,
      )
    }
    for (const a of pm.anomalies) {
      push(
        a.detectedAtISO,
        a.detectedByEmail ?? input.issuedByUserEmail,
        "PMM_ANOMALY_RECORDED",
        `${pm.title} → ${a.severity} ${a.category}: ${a.description}${a.escalatedToIncident ? " [ESCALATED]" : ""}`,
      )
    }
  }

  // Sprint 020 — AI Incidents Art. 73
  for (const inc of input.state.aiIncidents ?? []) {
    push(
      inc.createdAtISO,
      input.issuedByUserEmail,
      "AI_INCIDENT_CREATED",
      `${inc.title} → system=${inc.linkedAISystemId} category=${inc.category} severity=${inc.severity} deadline=${inc.reportingDeadlineDays}d`,
    )
    for (const n of inc.notifications) {
      push(
        n.submittedAtISO ?? inc.updatedAtISO,
        input.issuedByUserEmail,
        "AI_INCIDENT_AUTHORITY_NOTIFIED",
        `${inc.title} → ${n.authorityName} status=${n.status}${n.referenceNumber ? ` ref=${n.referenceNumber}` : ""}`,
      )
    }
    if (inc.rootCause) {
      push(
        inc.rootCause.identifiedAtISO,
        inc.rootCause.identifiedByEmail,
        "AI_INCIDENT_ROOT_CAUSE_RECORDED",
        `${inc.title} → ${inc.rootCause.contributingFactors.length} factori, ${inc.rootCause.remediationActions.length} corective`,
      )
    }
    if (inc.closedAtISO) {
      push(
        inc.closedAtISO,
        input.issuedByUserEmail,
        "AI_INCIDENT_CLOSED",
        `${inc.title}`,
      )
    }
    if (inc.linkedPmmAnomalyId) {
      push(
        inc.createdAtISO,
        input.issuedByUserEmail,
        "AI_INCIDENT_LINKED_PMM_ANOMALY",
        `${inc.title} ← anomaly=${inc.linkedPmmAnomalyId}`,
      )
    }
    if (inc.linkedBreachId) {
      push(
        inc.createdAtISO,
        input.issuedByUserEmail,
        "AI_INCIDENT_LINKED_BREACH",
        `${inc.title} ← breach=${inc.linkedBreachId}`,
      )
    }
  }

  // Sprint 021 — QMS Workspace lifecycle
  const qms = input.state.qmsWorkspace
  if (qms) {
    push(
      qms.createdAtISO,
      input.issuedByUserEmail,
      "QMS_INITIALIZED",
      `version=${qms.versionLabel} size=${qms.organizationSize} simplified=${qms.simplifiedMode}`,
    )
    if (qms.approvedAtISO) {
      push(
        qms.approvedAtISO,
        qms.approvedByEmail ?? input.issuedByUserEmail,
        "QMS_APPROVED",
        `version=${qms.versionLabel} nextReview=${qms.nextReviewISO ?? "—"}`,
      )
    }
    for (const att of qms.systemAttestations) {
      push(
        att.attestedAtISO,
        att.attestedByEmail,
        "QMS_SYSTEM_ATTESTED",
        `system=${att.systemId} sections=${att.sectionsConfirmedCovered.length}/13 gaps=${att.gapsAcknowledged.length}`,
      )
    }
    for (const lesson of qms.lessonsLearned) {
      push(
        lesson.recordedAtISO,
        lesson.recordedByEmail,
        "QMS_LESSON_RECORDED",
        `source=${lesson.source} title=${lesson.title.slice(0, 80)}`,
      )
    }
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
  workspaceMode: WorkspaceMode
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
    <span class="badge">${escapeHtml(
      input.workspaceMode === "cabinet"
        ? "Mod cabinet"
        : input.workspaceMode === "ai-builder"
          ? "Mod AI Builder"
          : "Mod IMM"
    )}</span>
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
    `FRIA records (Art.27):${input.manifest.summary.friaRecordsCount ?? 0}`,
    `Oversight protocols (Art.14):${input.manifest.summary.oversightProtocolsCount ?? 0}`,
    `Logging configs (Art.12):${input.manifest.summary.loggingConfigsCount ?? 0}`,
    `PMM plans (Art.72):   ${input.manifest.summary.pmmPlansCount ?? 0}`,
    `AI Incidents (Art.73):${input.manifest.summary.aiIncidentsCount ?? 0}`,
    `QMS Workspace (Art.17):${input.manifest.summary.qmsWorkspaceCount ?? 0} (${input.manifest.summary.qmsCompleteness ?? "—"})`,
    `Content assets (Art.50):${input.manifest.summary.contentAssetsCount ?? 0}`,
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
      if (remote) return mergeWithDefault(remote)
    }
  } catch {
    // fall through to local
  }
  try {
    const filePath = path.join(process.cwd(), ".data", `state-${targetOrgId}.json`)
    const raw = await fs.readFile(filePath, "utf-8")
    return mergeWithDefault(JSON.parse(raw) as Partial<AIActState>)
  } catch {
    return mergeWithDefault(null)
  }
}
