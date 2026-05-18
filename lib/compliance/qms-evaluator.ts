// QMS Evaluator — Sprint 021 (Art. 17 EU AI Act umbrella module).
//
// Pure functions pentru:
//   1. computeSectionCompleteness(section, tier, simplifiedMode) → bool
//   2. computeOverallCompleteness(workspace, schema) → QmsCompleteness
//   3. computeCrossModuleCounts(state) → per-section counts auto-populate
//   4. evaluateQms(input) → completeness + gaps[] + candidateFindings[]
//   5. buildQmsMarkdown(workspace, orgName, state) → long-form 13 sectiuni +
//      lessons + attestations
//
// Apelat din:
//   - qms-store.ts pe getOrCreateQms / updateQmsSection / attachDocument /
//     approveQms / markSimplifiedMode / attestSystem / recordLesson
//   - API route export pentru a regenera markdown la fiecare descarcare
//   - Audit Pack builder pentru a popula qms/ section

import type { ComplianceSeverity } from "@/lib/compliance/constitution"
import {
  QMS_SCHEMA_V1,
  QMS_SECTION_LABELS,
  QMS_SECTION_STATUS_LABELS,
  QMS_WORKSPACE_STATUS_LABELS,
  QMS_COMPLETENESS_LABELS,
  QMS_LESSON_SOURCE_LABELS,
  QMS_DOCUMENT_TYPE_LABELS,
  QMS_ORGANIZATION_SIZE_LABELS,
  getQmsSchemaSection,
  getEssentialQmsSections,
  type QmsSchema,
  type QmsSchemaSection,
} from "@/lib/compliance/qms-schema"
import type {
  AISystemRecord,
  ComplianceState,
  QmsCompleteness,
  QmsSectionContent,
  QmsSectionKey,
  QmsWorkspace,
  ScanFinding,
} from "@/lib/compliance/types"

// ────────────────────────────────────────────────────────────────────────────
//   Constants
// ────────────────────────────────────────────────────────────────────────────

const ONE_YEAR_MS = 365 * 24 * 3_600_000

// ────────────────────────────────────────────────────────────────────────────
//   Cross-module counts
// ────────────────────────────────────────────────────────────────────────────

/**
 * Numara, pentru fiecare sectiune QMS care are crossModuleLinks, cate
 * inregistrari din modulele linkate sunt active in state.
 */
export function computeCrossModuleCounts(
  state: Pick<
    ComplianceState,
    | "ropaActivities"
    | "aiDataMapRecords"
    | "dpiaRecords"
    | "friaRecords"
    | "findings"
    | "pmmPlans"
    | "aiIncidents"
    | "loggingEvidence"
  >,
): Partial<
  Record<
    QmsSectionKey,
    {
      linkedRopaActivityCount?: number
      linkedAIDataMapCount?: number
      linkedDpiaCount?: number
      linkedFriaCount?: number
      linkedFindingCount?: number
      linkedPmmPlanCount?: number
      linkedAIIncidentCount?: number
      linkedLoggingConfigCount?: number
    }
  >
> {
  const findingsOpen = (state.findings ?? []).filter(
    (f) => f.findingStatus !== "resolved" && f.findingStatus !== "dismissed",
  )
  return {
    f_data_management_systems: {
      linkedRopaActivityCount: (state.ropaActivities ?? []).length,
      linkedAIDataMapCount: (state.aiDataMapRecords ?? []).length,
    },
    g_risk_management_system: {
      linkedDpiaCount: (state.dpiaRecords ?? []).length,
      linkedFriaCount: (state.friaRecords ?? []).length,
      linkedFindingCount: findingsOpen.length,
    },
    h_post_market_monitoring: {
      linkedPmmPlanCount: (state.pmmPlans ?? []).length,
    },
    i_serious_incident_reporting: {
      linkedAIIncidentCount: (state.aiIncidents ?? []).length,
    },
    k_record_keeping: {
      linkedLoggingConfigCount: (state.loggingEvidence ?? []).length,
    },
  }
}

/**
 * Aplica cross-module counts peste un array de QmsSectionContent existent.
 * Returneaza array nou (immutable update).
 */
export function applyCrossModuleCounts(
  sections: QmsSectionContent[],
  counts: ReturnType<typeof computeCrossModuleCounts>,
): QmsSectionContent[] {
  return sections.map((section) => {
    const c = counts[section.key]
    if (!c) return section
    return {
      ...section,
      ...c,
    }
  })
}

// ────────────────────────────────────────────────────────────────────────────
//   Completeness
// ────────────────────────────────────────────────────────────────────────────

/**
 * O sectiune este "documented" daca:
 *  - description >= 30 chars
 *  - procedureSummary >= 30 chars
 *  - responsibleRole non-empty
 *  - cel putin 1 documentReference
 */
export function isSectionDocumented(section: QmsSectionContent): boolean {
  return (
    (section.description?.trim().length ?? 0) >= 30 &&
    (section.procedureSummary?.trim().length ?? 0) >= 30 &&
    (section.responsibleRole?.trim().length ?? 0) > 0 &&
    section.documentReferences.length > 0
  )
}

/**
 * O sectiune "counts as done" pentru completeness daca:
 *  - status este "documented" sau "approved"
 *  - SAU este documentata via fields (isSectionDocumented true) — pentru
 *    cazul cand statusul este in_progress dar fields-urile sunt complete.
 *
 * Pentru "needs_update" => NU counts (necesita revizuire).
 */
export function isSectionCountedAsDone(section: QmsSectionContent): boolean {
  if (section.status === "needs_update") return false
  if (section.status === "approved" || section.status === "documented") {
    return true
  }
  return isSectionDocumented(section)
}

/**
 * Completeness overall:
 *  - "complete" daca toate cele 13 sectiuni sunt done (sau toate
 *    essentialele sunt done in simplified mode)
 *  - "partial" daca >= 8 sectiuni sunt done SAU simplified mode + toate
 *    essentialele done
 *  - "incomplete" altfel
 */
export function computeOverallCompleteness(
  workspace: Pick<QmsWorkspace, "sections" | "simplifiedMode">,
  schema: QmsSchema = QMS_SCHEMA_V1,
): QmsCompleteness {
  const doneSections = new Set<QmsSectionKey>(
    workspace.sections
      .filter((s) => isSectionCountedAsDone(s))
      .map((s) => s.key),
  )

  if (workspace.simplifiedMode) {
    const essentials = getEssentialQmsSections().map((s) => s.key)
    const allEssentialsDone = essentials.every((k) => doneSections.has(k))
    if (allEssentialsDone) {
      // In simplified mode, all essentials done = complete; orice advanced
      // suplimentar este bonus dar nu cerut.
      return "complete"
    }
    if (doneSections.size >= Math.max(5, Math.ceil(essentials.length / 2))) {
      return "partial"
    }
    return "incomplete"
  }

  const totalSections = schema.sections.length
  if (doneSections.size >= totalSections) return "complete"
  if (doneSections.size >= 8) return "partial"
  return "incomplete"
}

// ────────────────────────────────────────────────────────────────────────────
//   Evaluation (gaps + findings)
// ────────────────────────────────────────────────────────────────────────────

export type QmsEvaluationGap = {
  code:
    | "section_missing_documentation"
    | "section_needs_update"
    | "approval_overdue"
    | "risk_management_no_dpia_no_fria"
    | "pmm_no_active_plans"
    | "incident_reporting_no_records"
    | "record_keeping_no_logging"
    | "high_risk_system_no_attestation"
  message: string
  severity: ComplianceSeverity
  sectionKey?: QmsSectionKey
}

export type QmsEvaluationResult = {
  completeness: QmsCompleteness
  gaps: QmsEvaluationGap[]
  candidateFindings: ScanFinding[]
  generatedMarkdown: string
}

export type EvaluateQmsInput = {
  workspace: QmsWorkspace
  orgName: string
  /**
   * State complet pentru cross-module counts + per-system attestation check.
   * Permite verificarea AISystemRecord.riskLevel === "high" fara attestare.
   */
  state: Pick<
    ComplianceState,
    | "aiSystems"
    | "ropaActivities"
    | "aiDataMapRecords"
    | "dpiaRecords"
    | "friaRecords"
    | "findings"
    | "pmmPlans"
    | "aiIncidents"
    | "loggingEvidence"
  >
  nowISO?: string
}

/**
 * Functia centrala: ia un QmsWorkspace + state, returneaza:
 *  - completeness (incomplete | partial | complete)
 *  - gaps[] (sectiuni lipsa, approval overdue, cross-module gaps, atestari)
 *  - candidateFindings[] (pre-persist, pentru store)
 *  - markdown export (long-form 13 sectiuni + lessons + attestations)
 */
export function evaluateQms(input: EvaluateQmsInput): QmsEvaluationResult {
  const { workspace, orgName, state } = input
  const nowISO = input.nowISO ?? new Date().toISOString()
  const nowMs = new Date(nowISO).getTime()

  // Auto-populate cross-module counts (imuabil — nu modifica workspace.sections)
  const counts = computeCrossModuleCounts(state)
  const enrichedSections = applyCrossModuleCounts(workspace.sections, counts)
  const enrichedWorkspace: QmsWorkspace = {
    ...workspace,
    sections: enrichedSections,
  }

  // 1) Completeness
  const completeness = computeOverallCompleteness(enrichedWorkspace)

  // 2) Gaps
  const gaps: QmsEvaluationGap[] = []
  const candidateFindings: ScanFinding[] = []

  for (const section of enrichedSections) {
    const schemaSec = getQmsSchemaSection(section.key)
    if (!schemaSec) continue
    // Skip advanced sections daca simplified mode
    if (workspace.simplifiedMode && schemaSec.tier === "advanced") continue

    if (!isSectionCountedAsDone(section)) {
      gaps.push({
        code: "section_missing_documentation",
        message: `Sectiunea ${schemaSec.letter} (${schemaSec.displayLabel}) nu este documentata. Status: ${QMS_SECTION_STATUS_LABELS[section.status]}.`,
        severity: "medium",
        sectionKey: section.key,
      })
      candidateFindings.push(
        buildFinding({
          stableSuffix: `${workspace.id}-section-${section.key}-missing`,
          title: `QMS sectiunea ${schemaSec.letter} fara documentatie: ${schemaSec.displayLabel}`,
          detail: `Sectiunea ${schemaSec.letter} (${QMS_SECTION_LABELS[section.key]}) din QMS-ul organizatiei "${orgName}" nu este documentata sau este incompleta. Status curent: ${QMS_SECTION_STATUS_LABELS[section.status]}. ${schemaSec.articleRef} cere ca aceasta sectiune sa fie documentata in scris cu: descriere narrativa, procedura step-by-step, responsabil asignat si cel putin un document atasat (politica/procedura/template).`,
          severity: "medium",
          legalReference: schemaSec.articleRef,
          remediationHint: `Editeaza sectiunea din /dashboard/qms: completeaza description (min 30 chars), procedureSummary (min 30 chars), responsibleRole si ataseaza cel putin un document tip ${schemaSec.suggestedDocuments[0]}.`,
          impactSummary:
            "QMS incomplet impiedica demonstrarea conformitatii Art. 17 in fata autoritatii / notified body. Risc sanctiune Art. 99 (pana la 35M EUR sau 7% turnover) pentru providers high-risk.",
          evidenceRequired: `QmsSectionContent.status='documented' sau 'approved' + isSectionDocumented(section) true.`,
          sourceDoc: `QMS ${workspace.versionLabel}`,
          nowISO,
        }),
      )
    }
    if (section.status === "needs_update") {
      gaps.push({
        code: "section_needs_update",
        message: `Sectiunea ${schemaSec.letter} (${schemaSec.displayLabel}) este marcata "needs_update" — revizuire necesara.`,
        severity: "medium",
        sectionKey: section.key,
      })
    }
  }

  // 3) Approval overdue (>= 12 luni de la approvedAtISO)
  if (workspace.approvedAtISO) {
    const approvedMs = new Date(workspace.approvedAtISO).getTime()
    if (Number.isFinite(approvedMs) && nowMs - approvedMs > ONE_YEAR_MS) {
      gaps.push({
        code: "approval_overdue",
        message: `QMS aprobat la ${workspace.approvedAtISO} (acum peste 12 luni) — necesita review anual.`,
        severity: "high",
      })
      candidateFindings.push(
        buildFinding({
          stableSuffix: `${workspace.id}-approval-overdue`,
          title: `QMS aprobat acum peste 12 luni — review anual necesar`,
          detail: `QMS-ul organizatiei "${orgName}" a fost aprobat ultima data la ${workspace.approvedAtISO}, iar pana la ${nowISO} au trecut peste 12 luni. Art. 17(1)(a) cere management of modifications continuu; o organizatie matura revizuieste QMS anual. Aprobare expirata risca a fi considerata QMS obsolet la audit.`,
          severity: "high",
          legalReference: "EU AI Act Art. 17(1)(a) + Art. 17(2)",
          remediationHint:
            "Revizuieste fiecare sectiune QMS, atasa documente actualizate (versionLabel nou), apoi apasa 'Aproba QMS' pentru a inregistra noua aprobare cu data curenta.",
          impactSummary:
            "QMS cu aprobare > 1 an nu demonstreaza management of modifications activ. Risc notified body audit gap + risc Art. 99 sanctiune.",
          evidenceRequired:
            "QmsWorkspace.approvedAtISO actualizat in ultimele 12 luni + versionLabel bump + linkedFindingIds rezolvate.",
          sourceDoc: `QMS ${workspace.versionLabel}`,
          nowISO,
        }),
      )
    }
  }

  // 4) Section (g) risk management: 0 DPIA + 0 FRIA = critical gap
  const sectionG = enrichedSections.find((s) => s.key === "g_risk_management_system")
  if (sectionG) {
    const dpiaCount = sectionG.linkedDpiaCount ?? 0
    const friaCount = sectionG.linkedFriaCount ?? 0
    if (dpiaCount === 0 && friaCount === 0) {
      gaps.push({
        code: "risk_management_no_dpia_no_fria",
        message:
          "Sectiunea (g) Risk Management nu are nicio DPIA sau FRIA inregistrata (Art. 9 + Art. 27).",
        severity: "high",
      })
      candidateFindings.push(
        buildFinding({
          stableSuffix: `${workspace.id}-risk-mgmt-no-dpia-fria`,
          title: `QMS sectiunea (g) Risk Management fara DPIA + FRIA`,
          detail: `Sectiunea (g) Risk Management System (Art. 17(1)(g)) este conditionata de existenta unui sistem de evaluare a riscurilor operational. Organizatia "${orgName}" nu are nicio DPIA (Sprint 008C — GDPR Art. 35) sau FRIA (Sprint 016 — AI Act Art. 27) inregistrata. Fara aceste artefacte, sistemul de management al riscurilor cerut de Art. 9 AI Act nu este demonstrabil.`,
          severity: "high",
          legalReference: "EU AI Act Art. 17(1)(g) + Art. 9 + Art. 27 + GDPR Art. 35",
          remediationHint:
            "Daca organizatia foloseste sisteme AI cu impact pe persoane fizice → creaza DPIA. Daca organizatia este deployer high-risk eligibil pentru FRIA → creaza FRIA. Documentele DPIA/FRIA vor aparea auto in sectiunea (g) QMS.",
          impactSummary:
            "Sectiune (g) QMS fara risk artefacts = audit gap clar pentru notified body. Art. 9 risk management este pillar AI Act compliance.",
          evidenceRequired:
            "state.dpiaRecords.length > 0 SAU state.friaRecords.length > 0 (auto-populate sectiunea g cu count > 0).",
          sourceDoc: `QMS ${workspace.versionLabel}`,
          nowISO,
        }),
      )
    }
  }

  // 5) Section (h) PMM: 0 plans = high gap (daca exista high-risk systems)
  const sectionH = enrichedSections.find((s) => s.key === "h_post_market_monitoring")
  const highRiskSystems = (state.aiSystems ?? []).filter(
    (s) => s.riskLevel === "high",
  )
  if (sectionH && highRiskSystems.length > 0) {
    const pmmCount = sectionH.linkedPmmPlanCount ?? 0
    if (pmmCount === 0) {
      gaps.push({
        code: "pmm_no_active_plans",
        message: `Sectiunea (h) PMM nu are niciun plan activ pentru ${highRiskSystems.length} sistem(e) AI high-risk.`,
        severity: "high",
      })
      candidateFindings.push(
        buildFinding({
          stableSuffix: `${workspace.id}-pmm-no-plans`,
          title: `QMS sectiunea (h) PMM fara planuri active pentru sisteme high-risk`,
          detail: `Sectiunea (h) Post-Market Monitoring (Art. 17(1)(h) + Art. 72) cere ca pentru fiecare sistem AI high-risk plasat pe piata sa existe un plan PMM. Organizatia "${orgName}" are ${highRiskSystems.length} sistem(e) AI high-risk dar nicio inregistrare PMM (Sprint 019). Aceasta este o lacuna majora.`,
          severity: "high",
          legalReference: "EU AI Act Art. 17(1)(h) + Art. 72",
          remediationHint:
            "Mergi la /dashboard/post-market-monitoring si creaza plan PMM pentru fiecare sistem AI high-risk (data collection + compliance metrics + review cycle).",
          impactSummary:
            "Lipsa PMM pentru high-risk = audit gap critic + risc sanctiune Art. 99 + risc revocare conformity assessment.",
          evidenceRequired:
            "state.pmmPlans.length > 0 si fiecare AISystemRecord high-risk are >=1 plan PMM linkat.",
          sourceDoc: `QMS ${workspace.versionLabel}`,
          nowISO,
        }),
      )
    }
  }

  // 6) Section (i) Incident reporting: nu emit critical aici daca nu sunt
  // incidente (e bine sa nu fie), dar emit medium daca lipseste procedura
  // documentata (description vide). Verificat deja via section_missing.
  // Adaugam totusi check separat: sectiune (i) marcata "documented" dar fara
  // procedureSummary detaliat -> medium (acoperita de section_missing).

  // 7) Section (k) Record-keeping: 0 logging configs + high-risk systems = high
  const sectionK = enrichedSections.find((s) => s.key === "k_record_keeping")
  if (sectionK && highRiskSystems.length > 0) {
    const loggingCount = sectionK.linkedLoggingConfigCount ?? 0
    if (loggingCount === 0) {
      gaps.push({
        code: "record_keeping_no_logging",
        message: `Sectiunea (k) Record-keeping fara configurari Logging Evidence pentru ${highRiskSystems.length} sistem(e) high-risk.`,
        severity: "high",
      })
      candidateFindings.push(
        buildFinding({
          stableSuffix: `${workspace.id}-record-keeping-no-logging`,
          title: `QMS sectiunea (k) Record-keeping fara Logging Evidence configurat`,
          detail: `Sectiunea (k) Record-keeping (Art. 17(1)(k) + Art. 12) este conditionata de existenta unei infrastructuri de logging cu retentie minim 6 luni si integritate verificabila. Organizatia "${orgName}" are ${highRiskSystems.length} sistem(e) AI high-risk dar nicio configurare Logging Evidence (Sprint 018). Aceasta este o lacuna majora pentru audit.`,
          severity: "high",
          legalReference: "EU AI Act Art. 17(1)(k) + Art. 12 + Art. 26(6)",
          remediationHint:
            "Mergi la /dashboard/logging-evidence si configureaza logging pentru fiecare sistem AI high-risk (storage backend, retention, integrity mechanism, access role).",
          impactSummary:
            "Fara Logging Evidence configurat, organizatia nu poate demonstra trasabilitatea AI conform Art. 12 — audit blocker.",
          evidenceRequired:
            "state.loggingEvidence.length > 0 si fiecare AISystemRecord high-risk are >=1 config linkat.",
          sourceDoc: `QMS ${workspace.versionLabel}`,
          nowISO,
        }),
      )
    }
  }

  // 8) High-risk systems fara QMS attestation
  const attestedSystemIds = new Set(
    workspace.systemAttestations.map((a) => a.systemId),
  )
  const highRiskWithoutAttestation = highRiskSystems.filter(
    (s) => !attestedSystemIds.has(s.id),
  )
  if (highRiskWithoutAttestation.length > 0) {
    gaps.push({
      code: "high_risk_system_no_attestation",
      message: `${highRiskWithoutAttestation.length} sistem(e) AI high-risk fara QMS attestation.`,
      severity: "high",
    })
    candidateFindings.push(
      buildFinding({
        stableSuffix: `${workspace.id}-no-attestation-${highRiskWithoutAttestation.length}`,
        title: `${highRiskWithoutAttestation.length} sistem(e) AI high-risk fara QMS attestation`,
        detail: `Organizatia "${orgName}" are ${highRiskWithoutAttestation.length} sistem(e) AI high-risk care nu au atestare QMS explicita (Art. 17(1)(a) coverage confirmation). Sistemele afectate: ${highRiskWithoutAttestation.map((s) => s.name).slice(0, 5).join(", ")}${highRiskWithoutAttestation.length > 5 ? "..." : ""}. Atestarea per-sistem confirma ca QMS-ul acopera explicit sistemul AI respectiv si declara orice gap-uri cunoscute.`,
        severity: "high",
        legalReference: "EU AI Act Art. 17(1)(a) + Art. 17(1)(m)",
        remediationHint:
          "In /dashboard/qms → tab 'System Attestations' → 'Attest system' pentru fiecare sistem high-risk neatestat. Confirma care sectiuni QMS il acopera + declara gap-uri.",
        impactSummary:
          "Sistem high-risk fara attestation = ambiguitate audit privind scope QMS — auditorul nu poate confirma ca sistemul este acoperit.",
        evidenceRequired:
          "Pentru fiecare AISystemRecord.riskLevel='high' → exista QmsSystemAttestation cu systemId match.",
        sourceDoc: `QMS ${workspace.versionLabel}`,
        nowISO,
      }),
    )
  }

  // 9) Markdown
  const generatedMarkdown = buildQmsMarkdown({
    workspace: enrichedWorkspace,
    orgName,
    state,
    completeness,
    gaps,
    candidateFindingsCount: candidateFindings.length,
    nowISO,
  })

  return {
    completeness,
    gaps,
    candidateFindings,
    generatedMarkdown,
  }
}

// ────────────────────────────────────────────────────────────────────────────
//   Markdown export — folosit de Audit Pack + API export
// ────────────────────────────────────────────────────────────────────────────

export function buildQmsMarkdown(args: {
  workspace: QmsWorkspace
  orgName: string
  state: Pick<ComplianceState, "aiSystems">
  completeness?: QmsCompleteness
  gaps?: QmsEvaluationGap[]
  candidateFindingsCount?: number
  nowISO?: string
}): string {
  const w = args.workspace
  const nowISO = args.nowISO ?? new Date().toISOString()
  const completeness = args.completeness ?? w.completeness ?? "incomplete"
  const lines: (string | null)[] = [
    `# QMS — Sistem Management Calitate (Art. 17 EU AI Act)`,
    `# ${args.orgName}`,
    ``,
    `**Versiune:** ${w.versionLabel}`,
    `**Status:** ${QMS_WORKSPACE_STATUS_LABELS[w.status]}`,
    `**Completeness:** ${QMS_COMPLETENESS_LABELS[completeness]}`,
    `**Marime organizatie:** ${QMS_ORGANIZATION_SIZE_LABELS[w.organizationSize]}`,
    `**Mod simplificat (Art. 17(3)):** ${w.simplifiedMode ? "DA" : "NU"}`,
    `**Generat la:** ${nowISO}`,
    w.approvedAtISO ? `**Aprobat la:** ${w.approvedAtISO}` : null,
    w.approvedByEmail ? `**Aprobat de:** ${w.approvedByEmail}` : null,
    w.nextReviewISO ? `**Urmatorul review:** ${w.nextReviewISO}` : null,
    ``,
    `---`,
    ``,
    `## Sumar`,
    `- Sectiuni totale: ${w.sections.length} / 13`,
    `- Sectiuni documentate sau aprobate: ${w.sections.filter(isSectionCountedAsDone).length}`,
    `- Lessons learned: ${w.lessonsLearned.length}`,
    `- Per-system attestations: ${w.systemAttestations.length} / ${(args.state.aiSystems ?? []).filter((s) => s.riskLevel === "high").length} sisteme high-risk`,
    `- Findings linkate (open): ${w.linkedFindingIds.length}`,
    args.candidateFindingsCount !== undefined
      ? `- Findings candidate evaluator: ${args.candidateFindingsCount}`
      : null,
    ``,
    `---`,
    ``,
    `## Sectiuni Art. 17(1)(a)-(m)`,
    ``,
  ]
  for (const section of w.sections) {
    const schemaSec = getQmsSchemaSection(section.key)
    if (!schemaSec) continue
    lines.push(`### ${schemaSec.letter}. ${schemaSec.displayLabel}`)
    lines.push(``)
    lines.push(`**Referinta legala:** ${schemaSec.articleRef}`)
    lines.push(`**Status:** ${QMS_SECTION_STATUS_LABELS[section.status]}`)
    lines.push(`**Tier:** ${schemaSec.tier}`)
    lines.push(`**Responsabil rol:** ${section.responsibleRole || "_neasignat_"}`)
    if (section.responsibleEmail) {
      lines.push(`**Responsabil email:** ${section.responsibleEmail}`)
    }
    if (section.approvedAtISO) {
      lines.push(`**Aprobat la:** ${section.approvedAtISO} de ${section.approvedByEmail ?? "—"}`)
    }
    lines.push(``)
    lines.push(`#### Descriere`)
    lines.push(section.description || "_de completat_")
    lines.push(``)
    lines.push(`#### Procedura`)
    lines.push(section.procedureSummary || "_de completat_")
    lines.push(``)
    // Cross-module references
    const crossModuleLines: string[] = []
    if (section.linkedRopaActivityCount !== undefined) {
      crossModuleLines.push(`- RoPA activities linkate: ${section.linkedRopaActivityCount}`)
    }
    if (section.linkedAIDataMapCount !== undefined) {
      crossModuleLines.push(`- AI Data Map records linkate: ${section.linkedAIDataMapCount}`)
    }
    if (section.linkedDpiaCount !== undefined) {
      crossModuleLines.push(`- DPIA records linkate: ${section.linkedDpiaCount}`)
    }
    if (section.linkedFriaCount !== undefined) {
      crossModuleLines.push(`- FRIA records linkate: ${section.linkedFriaCount}`)
    }
    if (section.linkedFindingCount !== undefined) {
      crossModuleLines.push(`- Findings (open) linkate: ${section.linkedFindingCount}`)
    }
    if (section.linkedPmmPlanCount !== undefined) {
      crossModuleLines.push(`- PMM plans linkate: ${section.linkedPmmPlanCount}`)
    }
    if (section.linkedAIIncidentCount !== undefined) {
      crossModuleLines.push(`- AI Incidents linkate: ${section.linkedAIIncidentCount}`)
    }
    if (section.linkedLoggingConfigCount !== undefined) {
      crossModuleLines.push(`- Logging Evidence configs linkate: ${section.linkedLoggingConfigCount}`)
    }
    if (crossModuleLines.length > 0) {
      lines.push(`#### Cross-module references`)
      lines.push(...crossModuleLines)
      lines.push(``)
    }
    // Documents
    lines.push(`#### Documente atasate (${section.documentReferences.length})`)
    if (section.documentReferences.length === 0) {
      lines.push(`_Niciun document atasat._`)
    } else {
      for (const d of section.documentReferences) {
        lines.push(
          `- **${QMS_DOCUMENT_TYPE_LABELS[d.type]}** · ${d.title}${d.versionLabel ? ` (${d.versionLabel})` : ""} — atasat ${d.attachedAtISO} de ${d.attachedByEmail}${d.url ? ` · [link](${d.url})` : ""}${d.fileName ? ` · ${d.fileName}` : ""}`,
        )
      }
    }
    lines.push(``)
    if (section.notes) {
      lines.push(`#### Note`)
      lines.push(section.notes)
      lines.push(``)
    }
    lines.push(`---`)
    lines.push(``)
  }
  // Lessons learned
  lines.push(`## Lessons Learned`)
  lines.push(``)
  if (w.lessonsLearned.length === 0) {
    lines.push(`_Nicio lectie inregistrata._`)
  } else {
    for (const l of w.lessonsLearned) {
      lines.push(`### ${l.title}`)
      lines.push(``)
      lines.push(`- Sursa: ${QMS_LESSON_SOURCE_LABELS[l.source]}`)
      if (l.sourceEntityId) lines.push(`- Entitate sursa: ${l.sourceEntityId}`)
      lines.push(`- Inregistrat: ${l.recordedAtISO} de ${l.recordedByEmail}`)
      if (l.applicableToSystems.length > 0) {
        lines.push(`- Sisteme aplicabile: ${l.applicableToSystems.join(", ")}`)
      }
      lines.push(``)
      lines.push(`**Sumar cauza radacina:**`)
      lines.push(l.rootCauseSummary || "_nedefinit_")
      lines.push(``)
      lines.push(`**Masuri preventive aplicate:**`)
      if (l.preventiveActionsTaken.length === 0) lines.push(`- _nedefinit_`)
      else for (const a of l.preventiveActionsTaken) lines.push(`- ${a}`)
      lines.push(``)
      if (l.resultingPolicyChange) {
        lines.push(`**Schimbare politica:** ${l.resultingPolicyChange}`)
        lines.push(``)
      }
      if (l.resultingProcessChange) {
        lines.push(`**Schimbare proces:** ${l.resultingProcessChange}`)
        lines.push(``)
      }
    }
  }
  lines.push(``)
  lines.push(`---`)
  lines.push(``)
  // Attestations
  lines.push(`## Per-System Attestations`)
  lines.push(``)
  if (w.systemAttestations.length === 0) {
    lines.push(`_Niciun sistem atestat._`)
  } else {
    const systemsById = new Map<string, AISystemRecord>()
    for (const s of args.state.aiSystems ?? []) systemsById.set(s.id, s)
    for (const att of w.systemAttestations) {
      const sys = systemsById.get(att.systemId)
      lines.push(
        `### ${sys?.name ?? att.systemId}${sys?.riskLevel === "high" ? " (high-risk)" : ""}`,
      )
      lines.push(``)
      lines.push(`- Atestat la: ${att.attestedAtISO} de ${att.attestedByEmail}`)
      lines.push(`- Versiune QMS: ${att.qmsVersionLabel}`)
      lines.push(`- Sectiuni confirmate acoperite: ${att.sectionsConfirmedCovered.length} / 13`)
      if (att.sectionsConfirmedCovered.length > 0) {
        lines.push(`  - ${att.sectionsConfirmedCovered.map((k) => getQmsSchemaSection(k)?.letter ?? k).join(", ")}`)
      }
      if (att.gapsAcknowledged.length > 0) {
        lines.push(`- Gap-uri recunoscute:`)
        for (const g of att.gapsAcknowledged) lines.push(`  - ${g}`)
      }
      if (att.notes) {
        lines.push(`- Note: ${att.notes}`)
      }
      lines.push(``)
    }
  }
  lines.push(`---`)
  lines.push(``)
  // Gaps detected
  if (args.gaps && args.gaps.length > 0) {
    lines.push(`## Lacune detectate de evaluator`)
    lines.push(``)
    lines.push(`| Cod | Severitate | Sectiune | Mesaj |`)
    lines.push(`|---|---|---|---|`)
    for (const g of args.gaps) {
      const secLetter = g.sectionKey
        ? getQmsSchemaSection(g.sectionKey)?.letter ?? "—"
        : "—"
      lines.push(
        `| ${g.code} | ${g.severity} | ${secLetter} | ${escapeCell(g.message)} |`,
      )
    }
    lines.push(``)
  }
  if (w.notes) {
    lines.push(`## Note suplimentare`)
    lines.push(w.notes)
    lines.push(``)
  }
  lines.push(
    `> Document operational generat de CompliRoAI conform Art. 17 EU AI Act. QMS este umbrella module pentru providerii de sisteme AI high-risk si trebuie sa fie inspectabil pentru conformity assessment (Annex IV) si notified body audit. Reprezinta masurile de buna-credinta ale organizatiei; nu inlocuieste opinia juridica finala.`,
  )

  return lines.filter((line): line is string => typeof line === "string").join("\n")
}

// ────────────────────────────────────────────────────────────────────────────
//   Helpers
// ────────────────────────────────────────────────────────────────────────────

function buildFinding(args: {
  stableSuffix: string
  title: string
  detail: string
  severity: ComplianceSeverity
  legalReference: string
  remediationHint: string
  impactSummary: string
  evidenceRequired: string
  sourceDoc: string
  nowISO: string
}): ScanFinding {
  return {
    id: `qms-finding-${args.stableSuffix}`,
    title: args.title,
    detail: args.detail,
    category: "EU_AI_ACT",
    severity: args.severity,
    risk:
      args.severity === "critical" || args.severity === "high" ? "high" : "low",
    principles: ["accountability", "transparency", "robustness"],
    createdAtISO: args.nowISO,
    sourceDocument: args.sourceDoc,
    legalReference: args.legalReference,
    impactSummary: args.impactSummary,
    remediationHint: args.remediationHint,
    evidenceRequired: args.evidenceRequired,
    findingStatus: "open",
    reviewState: "unreviewed",
    requiresHumanReview: true,
    resolution: {
      problem: args.title,
      impact: args.impactSummary,
      action: args.remediationHint,
      humanStep:
        "Responsabil QMS / Quality Manager actualizeaza sectiunea + ataseaza dovezi inainte de re-evaluare.",
      closureEvidence: args.evidenceRequired,
      revalidation:
        "Recheck la fiecare modificare a QMS-ului; reopen daca completitudinea scade sub pragul curent.",
    },
  }
}

function escapeCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\r?\n/g, " ").trim()
}

/**
 * Helper public: detecteaza daca QmsSchema referit are sectiuni schema-driven.
 * Folosit de teste pentru a evita drift schema <-> evaluator.
 */
export function getQmsSchemaForEvaluator(): QmsSchema {
  return QMS_SCHEMA_V1
}

/**
 * Helper public: returneaza schema-section list (proxy spre schema).
 */
export function listQmsSchemaSections(): QmsSchemaSection[] {
  return QMS_SCHEMA_V1.sections
}
