/**
 * Sprint 012 — AI Regulatory Scope aggregator (DORA + NIS2 AI slice).
 *
 * Pure aggregator. Citește `ComplianceState` + `OrgRegulatoryProfile` și
 * returnează:
 *  - vendori cu `doraScope.material = true` (când orgul are DORA aplicabil)
 *  - sisteme AI cu `nis2EntityScope.inScope = true` (când orgul are NIS2)
 *  - findings recente etichetate DORA/NIS2 (filtrate din state.findings
 *    folosind id prefix `dora-ai-vendor-` sau `nis2-ai-system-`)
 *  - mici stats per surface
 *
 * Folosit de `/dashboard/ai-regulatory-scope` (overview read-only).
 * NU scrie state — toate scrierile trec prin ai-regulatory-scope-store.
 */

import type {
  AISystemRecord,
  ComplianceState,
  OrgRegulatoryProfile,
  ScanFinding,
  VendorRecord,
} from "@/lib/compliance/types"

// ── Prefixes used by rule engines (must match dora-ai-rules + nis2-ai-rules) ─

export const DORA_FINDING_PREFIX = "dora-ai-vendor-"
export const NIS2_FINDING_PREFIX = "nis2-ai-system-"

// ── Types ────────────────────────────────────────────────────────────────────

export type ScopedVendor = {
  vendor: VendorRecord
  gapCount: number
  highestSeverity: "low" | "medium" | "high" | "critical"
  linkedFindingIds: string[]
}

export type ScopedAISystem = {
  system: AISystemRecord
  gapCount: number
  highestSeverity: "low" | "medium" | "high" | "critical"
  linkedFindingIds: string[]
}

export type RegulatoryScopeSummary = {
  profile: OrgRegulatoryProfile | null
  doraScopedVendors: ScopedVendor[]
  nis2ScopedSystems: ScopedAISystem[]
  recentFindings: ScanFinding[]
  stats: {
    doraVendorCount: number
    doraVendorOpenGaps: number
    nis2SystemCount: number
    nis2SystemOpenGaps: number
    doraFindingsOpen: number
    nis2FindingsOpen: number
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const SEVERITY_ORDER = ["low", "medium", "high", "critical"] as const

function maxSeverity(
  a: "low" | "medium" | "high" | "critical",
  b: "low" | "medium" | "high" | "critical",
): "low" | "medium" | "high" | "critical" {
  return SEVERITY_ORDER.indexOf(b) > SEVERITY_ORDER.indexOf(a) ? b : a
}

function isOpen(f: ScanFinding): boolean {
  // unreviewed sau open / under_monitoring → "deschis" pentru sortare.
  if (!f.findingStatus) return true
  return f.findingStatus !== "resolved" && f.findingStatus !== "dismissed"
}

function vendorFindingsFor(
  vendorId: string,
  findings: ScanFinding[],
): ScanFinding[] {
  const prefix = `${DORA_FINDING_PREFIX}${vendorId}-`
  return findings.filter((f) => f.id.startsWith(prefix))
}

function systemFindingsFor(
  systemId: string,
  findings: ScanFinding[],
): ScanFinding[] {
  const prefix = `${NIS2_FINDING_PREFIX}${systemId}-`
  return findings.filter((f) => f.id.startsWith(prefix))
}

// ── Builder ──────────────────────────────────────────────────────────────────

/**
 * Construiește overview-ul AI Regulatory Scope (DORA + NIS2 AI slice).
 */
export function buildRegulatoryScopeSummary(
  state: ComplianceState,
): RegulatoryScopeSummary {
  const profile = state.orgRegulatoryProfile ?? null
  const findings = state.findings ?? []

  // ── DORA: vendor list ──────────────────────────────────────────────────────
  const vendors = (state.vendorRecords ?? []) as VendorRecord[]
  const doraScopedVendors: ScopedVendor[] = profile?.doraApplies
    ? vendors
        .filter((v) => v.doraScope?.material === true)
        .map((v) => {
          const vendorFindings = vendorFindingsFor(v.id, findings)
          const open = vendorFindings.filter(isOpen)
          let highestSeverity: ScopedVendor["highestSeverity"] = "low"
          for (const f of open) {
            highestSeverity = maxSeverity(highestSeverity, f.severity)
          }
          return {
            vendor: v,
            gapCount: open.length,
            highestSeverity,
            linkedFindingIds: vendorFindings.map((f) => f.id),
          }
        })
        .sort((a, b) => {
          const sevDiff =
            SEVERITY_ORDER.indexOf(b.highestSeverity) -
            SEVERITY_ORDER.indexOf(a.highestSeverity)
          if (sevDiff !== 0) return sevDiff
          return b.gapCount - a.gapCount
        })
    : []

  // ── NIS2: AI systems list ──────────────────────────────────────────────────
  const systems = state.aiSystems ?? []
  const nis2ScopedSystems: ScopedAISystem[] =
    profile && profile.nis2EntityClass !== "not_in_scope"
      ? systems
          .filter((s) => s.nis2EntityScope?.inScope === true)
          .map((s) => {
            const sysFindings = systemFindingsFor(s.id, findings)
            const open = sysFindings.filter(isOpen)
            let highestSeverity: ScopedAISystem["highestSeverity"] = "low"
            for (const f of open) {
              highestSeverity = maxSeverity(highestSeverity, f.severity)
            }
            return {
              system: s,
              gapCount: open.length,
              highestSeverity,
              linkedFindingIds: sysFindings.map((f) => f.id),
            }
          })
          .sort((a, b) => {
            const sevDiff =
              SEVERITY_ORDER.indexOf(b.highestSeverity) -
              SEVERITY_ORDER.indexOf(a.highestSeverity)
            if (sevDiff !== 0) return sevDiff
            return b.gapCount - a.gapCount
          })
      : []

  // ── Recent findings tagged DORA / NIS2 (open only, newest first, cap 12) ──
  const taggedFindings = findings.filter(
    (f) =>
      f.id.startsWith(DORA_FINDING_PREFIX) ||
      f.id.startsWith(NIS2_FINDING_PREFIX),
  )
  const recentFindings = taggedFindings
    .filter(isOpen)
    .sort((a, b) => b.createdAtISO.localeCompare(a.createdAtISO))
    .slice(0, 12)

  // ── Stats ──────────────────────────────────────────────────────────────────
  const doraVendorOpenGaps = doraScopedVendors.reduce(
    (acc, v) => acc + v.gapCount,
    0,
  )
  const nis2SystemOpenGaps = nis2ScopedSystems.reduce(
    (acc, s) => acc + s.gapCount,
    0,
  )
  const doraFindingsOpen = taggedFindings.filter(
    (f) => f.id.startsWith(DORA_FINDING_PREFIX) && isOpen(f),
  ).length
  const nis2FindingsOpen = taggedFindings.filter(
    (f) => f.id.startsWith(NIS2_FINDING_PREFIX) && isOpen(f),
  ).length

  return {
    profile,
    doraScopedVendors,
    nis2ScopedSystems,
    recentFindings,
    stats: {
      doraVendorCount: doraScopedVendors.length,
      doraVendorOpenGaps,
      nis2SystemCount: nis2ScopedSystems.length,
      nis2SystemOpenGaps,
      doraFindingsOpen,
      nis2FindingsOpen,
    },
  }
}
