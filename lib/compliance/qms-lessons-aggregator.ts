// QMS Lessons Aggregator — Sprint 021 (Art. 17(1)(h)+(i)).
//
// Pure function:
//   aggregateLessonsFromState(state, nowISO) → QmsLessonLearned[]
//
// Auto-derive QmsLessonLearned per:
//   - aiIncident closed (status="closed") cu rootCause → source="ai_incident"
//   - pmmPlan.anomalies cu severity in {high, critical} si resolved=true →
//     source="pmm_anomaly"
//   - findings critical cu findingStatus="resolved" si operationalEvidenceNote
//     non-empty → source="finding"
//
// Idempotent: ID-uri stabile per source entity ID → re-rularea aggregator-ului
// nu produce duplicate.
//
// IMPORTANT: aggregator-ul returneaza candidatii; merge logic-ul cu lessons
// manuale existente este responsibility-ul store-ului (qms-store.ts).

import type {
  AIIncident,
  ComplianceState,
  PmmAnomalyRecord,
  PmmPlan,
  QmsLessonLearned,
  ScanFinding,
} from "@/lib/compliance/types"

// ────────────────────────────────────────────────────────────────────────────
//   Stable IDs
// ────────────────────────────────────────────────────────────────────────────

function lessonIdForIncident(incident: AIIncident): string {
  return `qms-lesson-incident-${incident.id}`
}

function lessonIdForAnomaly(plan: PmmPlan, anomaly: PmmAnomalyRecord): string {
  return `qms-lesson-anomaly-${plan.id}-${anomaly.id}`
}

function lessonIdForFinding(finding: ScanFinding): string {
  return `qms-lesson-finding-${finding.id}`
}

// ────────────────────────────────────────────────────────────────────────────
//   Source-specific lesson builders
// ────────────────────────────────────────────────────────────────────────────

function buildLessonFromIncident(
  incident: AIIncident,
  nowISO: string,
): QmsLessonLearned | null {
  if (incident.status !== "closed") return null
  if (!incident.rootCause) return null
  return {
    id: lessonIdForIncident(incident),
    source: "ai_incident",
    sourceEntityId: incident.id,
    title: `Incident inchis: ${incident.title}`,
    rootCauseSummary:
      incident.rootCause.rootCauseDescription ||
      "Cauza radacina nedocumentata in detaliu.",
    preventiveActionsTaken: [
      ...(incident.rootCause.preventionActions ?? []),
      ...(incident.rootCause.remediationActions ?? []),
    ],
    resultingPolicyChange:
      incident.rootCause.preventiveMeasuresImplementedAtISO
        ? `Masuri preventive implementate efectiv la ${incident.rootCause.preventiveMeasuresImplementedAtISO}.`
        : undefined,
    resultingProcessChange:
      incident.closureNotes && incident.closureNotes.length > 0
        ? incident.closureNotes
        : undefined,
    recordedAtISO: incident.closedAtISO ?? incident.updatedAtISO ?? nowISO,
    recordedByEmail:
      incident.rootCause.identifiedByEmail ||
      incident.assignedToEmail ||
      "sistem@compliroai.local",
    applicableToSystems: [incident.linkedAISystemId],
    notes: `Categorie Art. 73(2): ${incident.category} · severitate: ${incident.severity}`,
  }
}

function buildLessonFromAnomaly(
  plan: PmmPlan,
  anomaly: PmmAnomalyRecord,
  nowISO: string,
): QmsLessonLearned | null {
  if (!anomaly.resolved) return null
  if (anomaly.severity !== "high" && anomaly.severity !== "critical") return null
  return {
    id: lessonIdForAnomaly(plan, anomaly),
    source: "pmm_anomaly",
    sourceEntityId: anomaly.id,
    title: `Anomalie PMM rezolvata (${anomaly.severity}): ${anomaly.description.slice(0, 80)}${anomaly.description.length > 80 ? "..." : ""}`,
    rootCauseSummary: anomaly.impactDescription || anomaly.description,
    preventiveActionsTaken: anomaly.notes
      ? [anomaly.notes]
      : ["Verificare anomalie + corectie aplicata."],
    resultingPolicyChange: anomaly.escalatedToIncident
      ? "Anomalia a fost escaladata la AI Incident (Art. 73) — politica de monitorizare consolidata."
      : undefined,
    resultingProcessChange:
      `Plan PMM "${plan.title}" — categorie anomalie: ${anomaly.category}`,
    recordedAtISO: anomaly.resolvedAtISO ?? anomaly.detectedAtISO ?? nowISO,
    recordedByEmail:
      anomaly.detectedByEmail || "sistem@compliroai.local",
    applicableToSystems: [plan.linkedAISystemId],
    notes: `Detectata la ${anomaly.detectedAtISO} · plan PMM: ${plan.title}`,
  }
}

function buildLessonFromFinding(
  finding: ScanFinding,
  nowISO: string,
): QmsLessonLearned | null {
  if (finding.findingStatus !== "resolved") return null
  if (finding.severity !== "critical") return null
  if (!finding.operationalEvidenceNote || finding.operationalEvidenceNote.trim().length === 0) {
    return null
  }
  return {
    id: lessonIdForFinding(finding),
    source: "finding",
    sourceEntityId: finding.id,
    title: `Finding critical rezolvat: ${finding.title.slice(0, 100)}${finding.title.length > 100 ? "..." : ""}`,
    rootCauseSummary: finding.impactSummary || finding.detail.slice(0, 300),
    preventiveActionsTaken: finding.operationalEvidenceNote
      ? [finding.operationalEvidenceNote]
      : [],
    resultingPolicyChange: finding.legalReference
      ? `Conformitate restabilita cu ${finding.legalReference}.`
      : undefined,
    recordedAtISO: finding.findingStatusUpdatedAtISO ?? finding.createdAtISO ?? nowISO,
    recordedByEmail: "sistem@compliroai.local",
    applicableToSystems: [],
    notes: finding.sourceDocument ? `Sursa: ${finding.sourceDocument}` : undefined,
  }
}

// ────────────────────────────────────────────────────────────────────────────
//   Aggregator
// ────────────────────────────────────────────────────────────────────────────

export type AggregateLessonsInput = Pick<
  ComplianceState,
  "aiIncidents" | "pmmPlans" | "findings"
>

/**
 * Returneaza candidate lessons din state (incidents inchise + anomalii
 * rezolvate + findings critical rezolvate). Idempotent: foloseste ID-uri
 * stabile per source entity.
 *
 * NU mutate state. Caller-ul (qms-store) merge-uieste cu lessons manuale.
 */
export function aggregateLessonsFromState(
  state: AggregateLessonsInput,
  nowISO: string = new Date().toISOString(),
): QmsLessonLearned[] {
  const lessons: QmsLessonLearned[] = []

  // 1) From AI Incidents (closed + rootCause)
  for (const incident of state.aiIncidents ?? []) {
    const lesson = buildLessonFromIncident(incident, nowISO)
    if (lesson) lessons.push(lesson)
  }

  // 2) From PMM anomalies (resolved + high/critical)
  for (const plan of state.pmmPlans ?? []) {
    for (const anomaly of plan.anomalies ?? []) {
      const lesson = buildLessonFromAnomaly(plan, anomaly, nowISO)
      if (lesson) lessons.push(lesson)
    }
  }

  // 3) From findings (critical + resolved + evidence note)
  for (const finding of state.findings ?? []) {
    const lesson = buildLessonFromFinding(finding, nowISO)
    if (lesson) lessons.push(lesson)
  }

  return lessons
}

/**
 * Merge auto-aggregated lessons cu lessons manuale existente.
 *
 * Strategie:
 *  - Pastreaza TOATE lessons manuale (source="manual")
 *  - Pentru sources auto, inlocuieste duplicatii (acelasi id stabil) cu
 *    versiunea proaspata din aggregator
 *  - Adauga noile lessons auto care nu existau anterior
 *
 * Returneaza array sortat descrescator dupa recordedAtISO (mai noi primii).
 */
export function mergeAutoAndManualLessons(
  existing: QmsLessonLearned[],
  autoLessons: QmsLessonLearned[],
): QmsLessonLearned[] {
  const autoById = new Map<string, QmsLessonLearned>()
  for (const l of autoLessons) autoById.set(l.id, l)

  const merged: QmsLessonLearned[] = []
  const seenAutoIds = new Set<string>()

  for (const ex of existing) {
    if (ex.source === "manual") {
      merged.push(ex)
      continue
    }
    const auto = autoById.get(ex.id)
    if (auto) {
      merged.push(auto)
      seenAutoIds.add(ex.id)
    } else {
      // Auto lesson care nu mai exista in state — pastreaza varianta veche
      // (sursa entitate posibil sters dar lectia ramane utila auditorului).
      merged.push(ex)
    }
  }

  for (const auto of autoLessons) {
    if (!seenAutoIds.has(auto.id)) {
      merged.push(auto)
    }
  }

  merged.sort((a, b) => {
    const aMs = new Date(a.recordedAtISO).getTime()
    const bMs = new Date(b.recordedAtISO).getTime()
    return bMs - aMs
  })

  return merged
}
