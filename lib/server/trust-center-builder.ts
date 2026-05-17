/**
 * Sprint 013 — Trust Center public profile builder
 *
 * Pure function: ComplianceState + branding + audit pack registry →
 * TrustCenterPublicProfile (counts-only, NO PII).
 *
 * Folosit de:
 *  - GET /api/trust-center/[token] (public surface, fără auth)
 *  - /dashboard/trust-center (preview consultant)
 *
 * Garanții stricte (per mandate Rule 6):
 *  - NU expune nume actori (clienți, requesters)
 *  - NU expune titluri findings, descrieri breach, nume vendori
 *  - NU expune emails, IP, IDs entități
 *  - Doar: counts + framework declarations + audit pack hash + branding
 */

import type {
  AIActRole,
  ComplianceState,
  TrustCenterPublicProfile,
} from "@/lib/compliance/types"
import type { EffectiveBranding } from "@/lib/server/white-label"
import type { AuditPackRegistryEntry } from "@/lib/server/audit-pack-builder"

export type TrustCenterBuildInput = {
  state: ComplianceState
  orgId: string
  orgName: string
  branding: EffectiveBranding
  auditPackRegistry?: AuditPackRegistryEntry[]
  /** Pentru test determinism. */
  nowISO?: string
}

export function buildTrustCenterProfile(
  input: TrustCenterBuildInput,
): TrustCenterPublicProfile {
  const { state, orgName, branding } = input
  const now = input.nowISO ?? new Date().toISOString()

  // ── Stats (counts only) ───────────────────────────────────────────────────
  const aiSystems = state.aiSystems ?? []
  const findings = state.findings ?? []
  const dpia = state.dpiaRecords ?? []
  const ropa = state.ropaActivities ?? []
  const breach = state.breachRecords ?? []
  const vendors = state.vendorRecords ?? []
  const transparencyImpls = state.transparencyImplementations ?? []
  const literacy = state.literacyRecords ?? []

  const highRiskSystems = aiSystems.filter((s) => s.riskLevel === "high").length
  const findingsOpen = findings.filter((f) => {
    const s = f.findingStatus
    return s === "open" || s === "confirmed" || s === "under_monitoring" || !s
  }).length
  const findingsResolved = findings.filter(
    (f) => f.findingStatus === "resolved" || f.findingStatus === "dismissed",
  ).length
  const findingsCritical = findings.filter((f) => f.severity === "critical").length
  const dpiaCompleted = dpia.filter((d) => d.status === "completed" || d.status === "approved").length
  const breachesClosed = breach.filter(
    (b) =>
      b.status === "closed" ||
      b.status === "anspdcp_notified" ||
      b.status === "subjects_notified" ||
      b.status === "no_notification_required",
  ).length
  const breachesPending = breach.length - breachesClosed
  const vendorsApproved = vendors.filter((v) => v.reviewStatus === "approved").length

  // ── Framework scope (declarations) ────────────────────────────────────────
  const role = state.roleAssessment?.primaryRole
  const aiActApplies = Boolean(role && role !== "exempt")
  const orgProfile = state.orgRegulatoryProfile
  const frameworksInScope: TrustCenterPublicProfile["frameworksInScope"] = []
  if (aiActApplies) frameworksInScope.push("AI_ACT")
  // GDPR este universal aplicabil pentru orice org care procesează date personale.
  // Marker: existența RoPA / DPIA / DSAR sugerează că orgul tratează GDPR ca scope.
  if (ropa.length > 0 || dpia.length > 0 || (state.dsarRequests ?? []).length > 0) {
    frameworksInScope.push("GDPR")
  }
  if (orgProfile?.doraApplies) frameworksInScope.push("DORA")
  if (orgProfile && orgProfile.nis2EntityClass !== "not_in_scope") {
    frameworksInScope.push("NIS2")
  }

  // ── Latest audit pack ─────────────────────────────────────────────────────
  const latestPack = (input.auditPackRegistry ?? [])[0]

  // ── Attestations (text + dată + lege) ─────────────────────────────────────
  const attestations: TrustCenterPublicProfile["attestations"] = []
  if (transparencyImpls.length > 0) {
    const sorted = [...transparencyImpls].sort((a, b) =>
      a.implementedAtISO.localeCompare(b.implementedAtISO),
    )
    attestations.push({
      label: `Implementat ${transparencyImpls.length} notificare(i) de transparență Art. 50`,
      confirmedAtISO: sorted[sorted.length - 1].implementedAtISO,
      legalReference: "Regulament (UE) 2024/1689, Art. 50",
    })
  }
  if (state.roleAssessment) {
    attestations.push({
      label: `Rol declarat în lanțul AI: ${role}`,
      confirmedAtISO: state.roleAssessment.answeredAtISO,
      legalReference: "Regulament (UE) 2024/1689, Art. 2-3",
    })
  }
  if (literacy.length > 0) {
    const last = [...literacy].sort((a, b) => a.createdAtISO.localeCompare(b.createdAtISO))[literacy.length - 1]
    attestations.push({
      label: `Înregistrate ${literacy.length} sesiune(i) AI Literacy (Art. 4)`,
      confirmedAtISO: last.createdAtISO,
      legalReference: "Regulament (UE) 2024/1689, Art. 4",
    })
  }
  if (dpiaCompleted > 0) {
    const completedDpia = dpia.filter((d) => d.status === "completed" || d.status === "approved")
    const last = [...completedDpia].sort((a, b) => a.updatedAtISO.localeCompare(b.updatedAtISO))[
      completedDpia.length - 1
    ]
    attestations.push({
      label: `Finalizate ${dpiaCompleted} evaluare(i) DPIA (GDPR Art. 35)`,
      confirmedAtISO: last.updatedAtISO,
      legalReference: "Regulament UE 2016/679, Art. 35",
    })
  }
  if (breachesClosed > 0) {
    attestations.push({
      label: `Procesate ${breachesClosed} incident(e) date personale conform 72h ANSPDCP`,
      confirmedAtISO: now,
      legalReference: "Regulament UE 2016/679, Art. 33-34",
    })
  }

  return {
    orgName,
    brandingLogoUrl: branding.logoUrl ?? undefined,
    brandingColor: branding.primaryColor,
    brandingSecondaryColor: branding.secondaryColor,
    brandingFooter: branding.contactEmail ?? branding.website ?? undefined,
    generatedAtISO: now,
    aiActRole: role ?? ("unknown" as AIActRole | "unknown"),
    roleDeterminedAtISO: state.roleAssessment?.answeredAtISO,
    frameworksInScope,
    doraEntityType: orgProfile?.doraApplies ? orgProfile.doraEntityType : undefined,
    nis2EntityClass:
      orgProfile && orgProfile.nis2EntityClass !== "not_in_scope" ? orgProfile.nis2EntityClass : undefined,
    stats: {
      aiSystemsCount: aiSystems.length,
      highRiskSystemsCount: highRiskSystems,
      findingsOpen,
      findingsResolved,
      findingsCritical,
      dpiaCompletedCount: dpiaCompleted,
      ropaActivitiesCount: ropa.length,
      breachesClosedCount: breachesClosed,
      breachesPendingCount: breachesPending,
      vendorsApprovedCount: vendorsApproved,
      transparencyNoticesImplementedCount: transparencyImpls.length,
      literacyRecordsCount: literacy.length,
    },
    latestAuditPack: latestPack
      ? {
          generatedAtISO: latestPack.createdAtISO,
          hashRoot: latestPack.hashRoot,
          contentsCount: latestPack.fileCount,
        }
      : undefined,
    attestations,
  }
}
