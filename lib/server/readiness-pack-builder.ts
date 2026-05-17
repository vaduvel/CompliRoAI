// AI Act Readiness Pack Builder — CompliRoAI Sprint 5
//
// Wedge principal pentru cabinete: un singur buton care livrează în <2 minute
// un pachet complet de conformitate AI Act pentru un client. Cabinetul
// facturează 700€ folosind acest tool în 90 de minute.
//
// Conținut (ZIP / markdown):
//   1. executive-summary.md       — 1 pagină pentru CEO/Admin
//   2. ai-systems-inventory.md    — registru sisteme AI cu detalii
//   3. art-4-literacy-evidence.md — evidență AI Literacy + template atestat
//   4. art-50-transparency.md     — disclaimer-e gata de pus pe site/chatbot
//   5. gdpr-cross-compliance.md   — memo GDPR ↔ AI Act
//   6. high-risk-action-plan.md   — roadmap HRAIS (dacă există high-risk)
//   7. art-5-prohibited-audit.md  — verificare practici interzise
//   8. client-facing.html         — raport branduit, gata de print/PDF
//   9. MANIFEST.json              — metadata pack + lista de fișiere + hash
//
// Format livrare: ZIP (default), markdown (concat), sau html (single file).
// Generation time: <2s pentru organizații tipice (1-50 sisteme).

import { createHash } from "node:crypto"
import { promises as fs } from "node:fs"
import path from "node:path"
import JSZip from "jszip"

import { classifyAISystem } from "@/lib/compliance/ai-act-classifier"
import type { AISystemRecord } from "@/lib/compliance/types"
import type { WorkspaceMode } from "@/lib/server/auth"
import {
  clientFacingHtmlTemplate,
  executiveSummaryTemplate,
  gdprCrossComplianceTemplate,
  highRiskPlanTemplate,
  inventoryReportTemplate,
  literacyEvidenceTemplate,
  prohibitedAuditTemplate,
  roleAssessmentMissingNotice,
  roleAssessmentTemplate,
  transparencyNoticesTemplate,
  type ReadinessBranding,
  type ReadinessSummary,
} from "@/lib/compliance/readiness-pack-templates"
import { getEffectiveBranding } from "@/lib/server/white-label"
import {
  loadOrgStateFromSupabase,
  shouldUseSupabaseOrgState,
} from "@/lib/server/supabase-org-state"
import {
  mergeWithDefault,
  readState as readCurrentOrgState,
  writeState,
  type AIActState,
} from "@/lib/server/store"

// ────────────────────────────────────────────────────────────────────────────
//   Tipuri publice
// ────────────────────────────────────────────────────────────────────────────

export type ReadinessPackFormat = "zip" | "markdown" | "html" | "pdf"

export type ReadinessPackRecord = {
  id: string
  generatedAtISO: string
  generatedByUserId: string
  generatedByUserEmail?: string
  format: ReadinessPackFormat
  hashRoot: string
  contentsCount: number
  /** Doar pentru cabinet → client. */
  clientOrgId?: string
  clientOrgName?: string
}

export type BuildReadinessPackOptions = {
  /** Cabinet → client: target client orgId. Solo lasă undefined. */
  clientOrgId?: string
  /** User-ul care a emis pack-ul. */
  issuedByUserId: string
  issuedByUserEmail: string
  /** Mod workspace al emitentului. */
  workspaceMode: WorkspaceMode
  /** orgId-ul sesiunii curente (folosit pentru branding cabinet). */
  currentOrgId: string
  /** Format dorit. Default: "zip". */
  format?: ReadinessPackFormat
}

export type BuildReadinessPackResult = {
  /** Buffer-ul de livrat (ZIP / markdown text / html text). */
  buffer: Buffer
  fileName: string
  mimeType: string
  pack: ReadinessPackRecord
  /** Sumarul calculat — util pentru afișaj UI. */
  summary: ReadinessSummary
  /** Componentele individuale (markdown), utile pentru preview. */
  contents: { path: string; content: string }[]
}

// ────────────────────────────────────────────────────────────────────────────
//   Public API
// ────────────────────────────────────────────────────────────────────────────

export async function buildReadinessPack(
  orgId: string,
  options: BuildReadinessPackOptions
): Promise<BuildReadinessPackResult> {
  const format = options.format ?? "zip"
  const targetOrgId = options.clientOrgId ?? orgId

  // 1. Încarcă starea organizației țintă
  const state = await loadStateForOrg(targetOrgId, orgId)

  // 2. Branding cabinet (white-label) — întotdeauna al emitentului
  const branding = await getEffectiveBrandingSafe(orgId)

  // 3. Calculează sumarul
  const orgName = pickOrgNameFromState(state, targetOrgId)
  const orgCui = pickCuiFromState(state)
  const generatedAtISO = new Date().toISOString()
  const summary = computeSummary({
    state,
    orgName,
    orgCui,
    generatedAtISO,
  })

  // 4. Construiește componentele
  const readinessBranding: ReadinessBranding = {
    brandName: branding.brandName,
    signerName: branding.signerName,
    signerTitle: branding.signerTitle,
    contactEmail: branding.contactEmail,
    website: branding.website,
    isCustom: branding.isCustom,
  }

  // Role Memo — prima secțiune din pack (răspunde la "cine sunt eu în AI Act?")
  const roleMemo = state.roleAssessment
    ? roleAssessmentTemplate({
        branding: readinessBranding,
        summary,
        assessment: state.roleAssessment,
      })
    : roleAssessmentMissingNotice({ branding: readinessBranding, summary })

  const executiveSummary = executiveSummaryTemplate({ branding: readinessBranding, summary })
  const inventoryReport = inventoryReportTemplate({
    branding: readinessBranding,
    summary,
    systems: state.aiSystems,
  })
  const literacyEvidence = literacyEvidenceTemplate({
    branding: readinessBranding,
    summary,
    records: state.literacyRecords,
  })
  const transparencyNotices = transparencyNoticesTemplate({
    branding: readinessBranding,
    summary,
    systems: state.aiSystems,
  })
  const gdprMemo = gdprCrossComplianceTemplate({
    branding: readinessBranding,
    summary,
    systems: state.aiSystems,
  })
  const highRiskPlan = highRiskPlanTemplate({
    branding: readinessBranding,
    summary,
    systems: state.aiSystems,
  })
  const prohibitedAudit = prohibitedAuditTemplate({
    branding: readinessBranding,
    summary,
    systems: state.aiSystems,
  })

  const packIdCandidate = generatePackIdCandidate(generatedAtISO)

  const clientHtml = clientFacingHtmlTemplate({
    branding: readinessBranding,
    summary,
    systems: state.aiSystems,
    packId: packIdCandidate,
    primaryColor: branding.primaryColor,
    secondaryColor: branding.secondaryColor,
    logoUrl: branding.logoUrl,
  })

  const contents: { path: string; content: string }[] = [
    { path: "00-ai-act-role-memo.md", content: roleMemo },
    { path: "01-executive-summary.md", content: executiveSummary },
    { path: "02-ai-systems-inventory.md", content: inventoryReport },
    { path: "03-art-4-literacy-evidence.md", content: literacyEvidence },
    { path: "04-art-50-transparency-notices.md", content: transparencyNotices },
    { path: "05-gdpr-cross-compliance.md", content: gdprMemo },
    { path: "06-high-risk-action-plan.md", content: highRiskPlan },
    { path: "07-art-5-prohibited-audit.md", content: prohibitedAudit },
    { path: "08-client-facing-report.html", content: clientHtml },
  ]

  // 5. Hash root deterministic (SHA-256 peste toate componentele concatenate)
  const hashRoot = sha256(
    Buffer.concat(contents.map((c) => Buffer.from(`${c.path}\n${c.content}\n`, "utf8")))
  )

  const packId = `pack-${generatedAtISO.slice(0, 10)}-${hashRoot.slice(0, 12)}`

  const manifest = {
    packId,
    schema: "compliroai.readiness-pack/v1",
    generatedAt: generatedAtISO,
    generatedBy: {
      userId: options.issuedByUserId,
      userEmail: options.issuedByUserEmail,
    },
    org: {
      id: targetOrgId,
      name: orgName,
      cui: orgCui,
    },
    issuedBy: {
      brandName: branding.brandName,
      signerName: branding.signerName,
      signerTitle: branding.signerTitle,
      contactEmail: branding.contactEmail,
      website: branding.website,
      isCustomBrand: branding.isCustom,
    },
    summary: {
      overallCompliancePct: summary.overallCompliancePct,
      systemsCount: summary.systemsCount,
      prohibitedCount: summary.prohibitedCount,
      highRiskCount: summary.highRiskCount,
      limitedRiskCount: summary.limitedRiskCount,
      minimalRiskCount: summary.minimalRiskCount,
      literacyRecordsCount: summary.literacyRecordsCount,
      topActions: summary.topActions,
      deadlines: summary.deadlines,
    },
    contents: contents.map((c) => ({
      path: c.path,
      sha256: sha256(Buffer.from(c.content, "utf8")),
      sizeBytes: Buffer.byteLength(c.content, "utf8"),
    })),
    hashAlgorithm: "sha256" as const,
    hashRoot,
  }

  // 6. Construiește buffer-ul după format
  let buffer: Buffer
  let mimeType: string
  let fileName: string

  const orgSlug = slugify(orgName)
  const dateLabel = generatedAtISO.slice(0, 10)
  const baseName = `compliroai-readiness-pack-${orgSlug}-${dateLabel}`

  if (format === "zip") {
    const zip = new JSZip()
    zip.file("MANIFEST.json", JSON.stringify(manifest, null, 2))
    for (const c of contents) {
      zip.file(c.path, c.content)
    }
    // README scurt în root
    zip.file(
      "README.md",
      [
        `# AI Act Readiness Pack — ${orgName}`,
        ``,
        `Generat de **${branding.brandName}** la ${dateLabel}.`,
        ``,
        `## Conținut`,
        ``,
        contents.map((c) => `- ${c.path}`).join("\n"),
        ``,
        `## Cum se folosește`,
        ``,
        `1. Deschideți \`01-executive-summary.md\` pentru o vedere de ansamblu.`,
        `2. Tipăriți \`08-client-facing-report.html\` (browser → Print → PDF) pentru livrabilul către client.`,
        `3. Folosiți restul documentelor ca anexe la dosarul de audit.`,
        ``,
        `## Integritate`,
        ``,
        `Hash root SHA-256: \`${hashRoot}\``,
        `Verificați la: https://eu-ai-act-beige.vercel.app/verify-pack`,
        ``,
      ].join("\n")
    )
    buffer = await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    })
    mimeType = "application/zip"
    fileName = `${baseName}.zip`
  } else if (format === "markdown" || format === "pdf") {
    const combined = [
      `# AI Act Readiness Pack — ${orgName}`,
      ``,
      `Generat de **${branding.brandName}** la ${dateLabel}.`,
      ``,
      `---`,
      ``,
      ...contents.filter((c) => c.path.endsWith(".md")).map((c) => c.content),
      ``,
      `---`,
      ``,
      `Hash root: \`${hashRoot}\``,
    ].join("\n\n")
    if (format === "pdf") {
      // Sprint 014 — wrap combined markdown în PDF cu branding cabinet aplicat.
      const { generatePdfFromMarkdown } = await import("@/lib/server/pdf-generator")
      buffer = await generatePdfFromMarkdown(combined, {
        orgName,
        title: `Readiness Pack — ${orgName}`,
        branding: {
          ...branding,
          isCustom: branding.isCustom,
        },
        signerName: branding.signerName,
        generatedAtISO,
      })
      mimeType = "application/pdf"
      fileName = `${baseName}.pdf`
    } else {
      buffer = Buffer.from(combined, "utf8")
      mimeType = "text/markdown; charset=utf-8"
      fileName = `${baseName}.md`
    }
  } else {
    // html
    buffer = Buffer.from(clientHtml, "utf8")
    mimeType = "text/html; charset=utf-8"
    fileName = `${baseName}.html`
  }

  const pack: ReadinessPackRecord = {
    id: packId,
    generatedAtISO,
    generatedByUserId: options.issuedByUserId,
    generatedByUserEmail: options.issuedByUserEmail,
    format,
    hashRoot,
    contentsCount: contents.length,
    clientOrgId: options.clientOrgId,
    clientOrgName: options.clientOrgId ? orgName : undefined,
  }

  // 7. Best-effort persistă în istoricul org-ului emitent (cabinet sau solo)
  await persistPackRecord(pack)

  return {
    buffer,
    fileName,
    mimeType,
    pack,
    summary,
    contents,
  }
}

// ────────────────────────────────────────────────────────────────────────────
//   Public helpers
// ────────────────────────────────────────────────────────────────────────────

export async function listReadinessPacks(): Promise<ReadinessPackRecord[]> {
  try {
    const state = await readCurrentOrgState()
    const list = (state as unknown as { readinessPacks?: ReadinessPackRecord[] }).readinessPacks
    if (Array.isArray(list)) return list
  } catch {
    // ignore
  }
  return []
}

/** Folosit de audit-pack builder pentru a include latest readiness pack în ZIP. */
export async function getLatestReadinessPack(): Promise<ReadinessPackRecord | null> {
  const list = await listReadinessPacks()
  return list[0] ?? null
}

// ────────────────────────────────────────────────────────────────────────────
//   Internal helpers
// ────────────────────────────────────────────────────────────────────────────

function sha256(data: Buffer): string {
  return createHash("sha256").update(data).digest("hex")
}

function generatePackIdCandidate(iso: string): string {
  // Used inside HTML cover before we know the final hash. We re-use the
  // timestamp + a small random suffix; final manifest carries the real id.
  return `pack-${iso.slice(0, 10)}-preview`
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

function computeSummary(input: {
  state: AIActState
  orgName: string
  orgCui?: string | null
  generatedAtISO: string
}): ReadinessSummary {
  const { state, orgName, orgCui, generatedAtISO } = input
  let prohibited = 0
  let highRisk = 0
  let limited = 0
  let minimal = 0

  for (const sys of state.aiSystems) {
    const cls = classifyAISystem(sys.purpose)
    if (cls.riskLevel === "prohibited") prohibited += 1
    else if (cls.riskLevel === "high_risk") highRisk += 1
    else if (cls.riskLevel === "limited_risk") limited += 1
    else minimal += 1
  }

  // Calcul scor conformitate: aproximare bazată pe approvals + attestations + literacy
  let pct = 100
  if (state.aiSystems.length > 0) {
    let total = 0
    let done = 0
    for (const sys of state.aiSystems) {
      total += 2 // approval + attestation
      if (sys.approvalStatus === "approved") done += 1
      if (sys.policyAttestationStatus === "attested") done += 1
    }
    // Penalty pentru lipsa literacy
    total += 1
    if (state.literacyRecords.length > 0) done += 1
    // Penalty greu pentru prohibited
    if (prohibited > 0) {
      total += prohibited * 3
      // sisteme prohibited netratate trag scor în jos
    }
    pct = total === 0 ? 100 : Math.round((done / total) * 100)
  }

  // Top 3 acțiuni urgente — calculate din gap-urile reale
  const topActions: string[] = []
  if (prohibited > 0) {
    topActions.push(
      `Opriți imediat utilizarea celor ${prohibited} sistem(e) clasificate ca *prohibited* (Art. 5).`
    )
  }
  if (state.literacyRecords.length === 0) {
    topActions.push(
      `Inițiați programul de AI Literacy (Art. 4) — obligatoriu din 2 februarie 2025.`
    )
  }
  if (highRisk > 0) {
    const noAnnex = state.aiSystems.filter((s) => {
      const cls = classifyAISystem(s.purpose)
      return cls.riskLevel === "high_risk" && s.approvalStatus !== "approved"
    }).length
    if (noAnnex > 0) {
      topActions.push(
        `Generați și aprobați documentația Annex IV pentru ${noAnnex} sistem(e) high-risk.`
      )
    }
  }
  if (limited > 0 && topActions.length < 3) {
    const noAttest = state.aiSystems.filter((s) => {
      const cls = classifyAISystem(s.purpose)
      return cls.riskLevel === "limited_risk" && s.policyAttestationStatus !== "attested"
    }).length
    if (noAttest > 0) {
      topActions.push(
        `Confirmați politica internă de disclosure pentru ${noAttest} sistem(e) limited risk (Art. 50).`
      )
    }
  }
  if (state.aiSystems.length === 0 && topActions.length === 0) {
    topActions.push(
      `Înregistrați primul sistem AI în uz pentru a activa monitorizarea conformității.`
    )
  }

  // Deadline-uri AI Act ordonate
  const today = new Date(generatedAtISO)
  const allDeadlines = [
    { label: "Art. 4 — AI Literacy (în vigoare)", dateISO: "2025-02-02" },
    { label: "Art. 5 — practici interzise (lista originală a-h)", dateISO: "2025-02-02" },
    { label: "Art. 51-56 — GPAI providers (modele noi)", dateISO: "2025-08-02" },
    { label: "Art. 50 — transparență generală", dateISO: "2026-08-02" },
    { label: "Art. 50 — etichetare conținut sintetic (watermark)", dateISO: "2026-12-02" },
    { label: "Art. 5(1)(i) — interzicere nudifier / CSAM", dateISO: "2026-12-02" },
    { label: "Art. 6 + Annex III — HRAIS stand-alone", dateISO: "2027-12-02" },
  ]
  const deadlines = allDeadlines.map((d) => {
    const dt = new Date(d.dateISO)
    const status: "trecut" | "iminent" | "viitor" =
      dt.getTime() < today.getTime()
        ? "trecut"
        : dt.getTime() - today.getTime() < 1000 * 60 * 60 * 24 * 180
          ? "iminent"
          : "viitor"
    return { ...d, status }
  })

  return {
    orgName,
    orgCui,
    generatedAtISO,
    overallCompliancePct: pct,
    systemsCount: state.aiSystems.length,
    prohibitedCount: prohibited,
    highRiskCount: highRisk,
    limitedRiskCount: limited,
    minimalRiskCount: minimal,
    literacyRecordsCount: state.literacyRecords.length,
    topActions: topActions.slice(0, 3),
    deadlines,
  }
}

async function getEffectiveBrandingSafe(orgId: string): Promise<{
  logoUrl: string | null
  primaryColor: string
  secondaryColor: string
  brandName: string
  signerName: string | null
  signerTitle: string | null
  contactEmail: string | null
  address: string | null
  website: string | null
  updatedAtISO: string | null
  isCustom: boolean
}> {
  try {
    return await getEffectiveBranding(orgId)
  } catch {
    return {
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
  }
}

function pickOrgNameFromState(state: AIActState, orgId: string): string {
  const meta = (state as unknown as { clientMeta?: { orgName?: string } }).clientMeta
  if (meta?.orgName && typeof meta.orgName === "string") return meta.orgName
  return orgId
}

function pickCuiFromState(state: AIActState): string | null {
  const meta = state as unknown as {
    clientMeta?: { cui?: string }
    onboarding?: { companyInfo?: { cui?: string } }
  }
  return meta.clientMeta?.cui ?? meta.onboarding?.companyInfo?.cui ?? null
}

async function loadStateForOrg(
  targetOrgId: string,
  sessionOrgId: string
): Promise<AIActState> {
  if (targetOrgId === sessionOrgId) {
    return readCurrentOrgState()
  }
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

async function persistPackRecord(pack: ReadinessPackRecord): Promise<void> {
  try {
    const state = await readCurrentOrgState()
    const existing = (state as unknown as { readinessPacks?: ReadinessPackRecord[] }).readinessPacks
    const list: ReadinessPackRecord[] = Array.isArray(existing) ? existing : []
    list.unshift(pack)
    const trimmed = list.slice(0, 50)
    ;(state as unknown as { readinessPacks?: ReadinessPackRecord[] }).readinessPacks = trimmed
    await writeState(state)
  } catch {
    // best-effort
  }
}
