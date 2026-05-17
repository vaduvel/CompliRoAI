/**
 * RoPA Risk Engine (port Sprint 008C din DPO-OS v3-unified).
 *
 * Pentru fiecare activitate de prelucrare din `state.ropaActivities`,
 * motorul evaluează:
 *  - lipsa temei juridic Art. 6 → finding GDPR severity medium
 *  - lipsa retenție → finding + discovery trigger (retention review)
 *  - date speciale fără Art. 9 → finding severity high
 *  - CNP/date medicale fără controale + Legea 190/2018 → finding high
 *  - procesatori fără DPA → finding + vendor review trigger
 *  - transfer extern fără mecanism → finding high + transfer review trigger
 *  - semnale risc ridicat (special cat / monitorizare / profilare / vulnerable
 *    persons) → DPIA screening trigger
 *  - lipsa măsuri TOMs → finding + security review trigger
 *  - activitate ne-revizuită > 6 luni → finding low (stale)
 *
 * Output: enriched activities cu riskLevel, lista findings GDPR de emis,
 * lista discovery trigger candidates, lista org-knowledge items pentru
 * Multiplicator B (data categories, vendors, retention rules etc).
 *
 * Schema versionată `2026.05.ro.v1` pentru export machine-readable la
 * Audit Pack. Rebrand: `compliroai.ro/schemas/...`.
 */

import type { ComplianceSeverity } from "@/lib/compliance/constitution"
import {
  makeKnowledgeItem,
  type OrgKnowledgeItem,
} from "@/lib/compliance/org-knowledge"
import type {
  FindingCategory,
  RopaActivityConfidence,
  RopaActivityRecord,
  RopaActivitySource,
  RopaActivityStatus,
  RopaRiskLevel,
  RopaThirdCountryTransfer,
  ScanFinding,
} from "@/lib/compliance/types"

export type {
  RopaActivityConfidence,
  RopaActivityRecord,
  RopaActivitySource,
  RopaActivityStatus,
  RopaRiskLevel,
  RopaThirdCountryTransfer,
}

export type RopaActivityRiskSummary = {
  activityId: string
  activityName: string
  riskLevel: RopaRiskLevel
  riskScore: number
  reasons: string[]
  missingFields: string[]
  findingIds: string[]
  triggerIds: string[]
}

export type RopaDataMapTriggerCandidate = {
  id: string
  type:
    | "dpia"
    | "vendor_review"
    | "retention_review"
    | "transfer_review"
    | "security_review"
  label: string
  targetModule: "dpia" | "vendor-review" | "retention" | "ropa" | "security"
  severity: ComplianceSeverity
  reason: string
  sourceActivityId: string
  evidenceRequired: string
  dueDays?: number
}

export type RopaDataMapEvaluation = {
  activities: RopaActivityRecord[]
  activityRisks: RopaActivityRiskSummary[]
  knowledgeItems: OrgKnowledgeItem[]
  candidateFindings: ScanFinding[]
  triggers: RopaDataMapTriggerCandidate[]
  summary: {
    activityCount: number
    highRiskActivities: number
    mediumRiskActivities: number
    missingLegalBasis: number
    missingRetention: number
    dpiaTriggers: number
    vendorReviewTriggers: number
    requiresDpoReview: true
  }
}

export type RopaMachineReadableExport = {
  schema: "https://compliroai.ro/schemas/ropa-data-map.v1.json"
  schemaVersion: "2026.05.ro.v1"
  generatedAtISO: string
  jurisdiction: "RO/EU"
  legalBasis: string[]
  controller: {
    orgId?: string
    orgName?: string
  }
  summary: RopaDataMapEvaluation["summary"] & {
    riskScoreAverage: number
    exportedActivities: number
  }
  activities: Array<{
    id: string
    name: string
    department?: string
    purpose: string
    ownerName?: string
    dataSubjects: string[]
    dataCategories: string[]
    specialCategories: string[]
    legalBasis?: string
    article9Condition?: string
    recipients: string[]
    processors: string[]
    systems: string[]
    thirdCountryTransfers: RopaThirdCountryTransfer[]
    retentionRule?: string
    securityMeasures: string[]
    status: RopaActivityStatus
    confidence: RopaActivityConfidence
    source: RopaActivitySource
    linkedAISystemIds: string[]
    risk: {
      level: RopaRiskLevel
      score: number
      reasons: string[]
      missingFields: string[]
    }
    links: {
      findings: string[]
      evidence: string[]
      triggers: string[]
    }
    timestamps: {
      createdAtISO: string
      updatedAtISO: string
      lastReviewedAtISO?: string
    }
  }>
}

type RopaRuleOutput = {
  finding?: ScanFinding
  trigger?: RopaDataMapTriggerCandidate
  reason: string
  missingField?: string
  score: number
}

const SPECIAL_CATEGORY_KEYWORDS = [
  "sănătate",
  "sanatate",
  "medical",
  "diagnostic",
  "biometric",
  "biometrice",
  "genetic",
  "genetice",
  "religie",
  "religioase",
  "sindicat",
  "politice",
  "rasial",
  "etnic",
]

const CNP_KEYWORDS = ["cnp", "serie ci", "carte de identitate", "ci/cnp"]
const VULNERABLE_KEYWORDS = ["copii", "minor", "minori", "pacienți", "pacienti"]
const DPIA_KEYWORDS = ["profilare", "scoring", "decizie automată", "decizie automata", "cctv", "gps", "biometric", "monitorizare"]
const NO_TRANSFER_MECHANISM = ["", "nu", "necunoscut", "neclar", "n/a", "-"]

export function evaluateRopaDataMap(input: {
  activities: RopaActivityRecord[]
  nowISO?: string
}): RopaDataMapEvaluation {
  const nowISO = input.nowISO ?? new Date().toISOString()
  const activities = input.activities
    .map((activity) => normalizeRopaActivityRecord(activity, nowISO))
    .filter(isMeaningfulActivity)

  const knowledgeItems: OrgKnowledgeItem[] = []
  const candidateFindings: ScanFinding[] = []
  const triggers: RopaDataMapTriggerCandidate[] = []
  const activityRisks: RopaActivityRiskSummary[] = []

  for (const activity of activities) {
    knowledgeItems.push(...knowledgeFromActivity(activity))
    const outputs = evaluateActivityRules(activity, nowISO)
    const findingIds = outputs.flatMap((output) => output.finding?.id ? [output.finding.id] : [])
    const triggerIds = outputs.flatMap((output) => output.trigger?.id ? [output.trigger.id] : [])
    const score = outputs.reduce((sum, output) => sum + output.score, 0)
    const riskLevel: RopaRiskLevel = score >= 70 ? "high" : score >= 30 ? "medium" : "low"
    const reasons = outputs.map((output) => output.reason)
    const missingFields = outputs.flatMap((output) => output.missingField ? [output.missingField] : [])

    for (const output of outputs) {
      if (output.finding && !candidateFindings.some((finding) => finding.id === output.finding!.id)) {
        candidateFindings.push(output.finding)
      }
      if (output.trigger && !triggers.some((trigger) => trigger.id === output.trigger!.id)) {
        triggers.push(output.trigger)
      }
    }

    activityRisks.push({
      activityId: activity.id,
      activityName: activity.activityName,
      riskLevel,
      riskScore: Math.min(score, 100),
      reasons,
      missingFields,
      findingIds,
      triggerIds,
    })
  }

  const enrichedActivities: RopaActivityRecord[] = activities.map((activity) => {
    const risk = activityRisks.find((item) => item.activityId === activity.id)
    return {
      ...activity,
      riskLevel: risk?.riskLevel ?? "low",
      riskScore: risk?.riskScore ?? 0,
      riskReasons: risk?.reasons ?? [],
      linkedFindings: Array.from(new Set([...(activity.linkedFindings ?? []), ...(risk?.findingIds ?? [])])),
      status: risk && risk.riskLevel !== "low" ? ("needs_review" as RopaActivityStatus) : activity.status,
      updatedAtISO: nowISO,
    }
  })

  return {
    activities: enrichedActivities,
    activityRisks,
    knowledgeItems: dedupeKnowledge(knowledgeItems),
    candidateFindings,
    triggers,
    summary: {
      activityCount: enrichedActivities.length,
      highRiskActivities: activityRisks.filter((risk) => risk.riskLevel === "high").length,
      mediumRiskActivities: activityRisks.filter((risk) => risk.riskLevel === "medium").length,
      missingLegalBasis: activityRisks.filter((risk) => risk.missingFields.includes("legalBasis")).length,
      missingRetention: activityRisks.filter((risk) => risk.missingFields.includes("retentionRule")).length,
      dpiaTriggers: triggers.filter((trigger) => trigger.type === "dpia").length,
      vendorReviewTriggers: triggers.filter((trigger) => trigger.type === "vendor_review").length,
      requiresDpoReview: true,
    },
  }
}

export function buildRopaMachineReadableExport(input: {
  activities: RopaActivityRecord[]
  orgId?: string
  orgName?: string
  nowISO?: string
}): RopaMachineReadableExport {
  const nowISO = input.nowISO ?? new Date().toISOString()
  const evaluation = evaluateRopaDataMap({
    activities: input.activities,
    nowISO,
  })
  const riskByActivityId = new Map(evaluation.activityRisks.map((risk) => [risk.activityId, risk]))
  const riskScoreAverage = evaluation.activityRisks.length
    ? Math.round(evaluation.activityRisks.reduce((sum, risk) => sum + risk.riskScore, 0) / evaluation.activityRisks.length)
    : 0

  return {
    schema: "https://compliroai.ro/schemas/ropa-data-map.v1.json",
    schemaVersion: "2026.05.ro.v1",
    generatedAtISO: nowISO,
    jurisdiction: "RO/EU",
    legalBasis: [
      "GDPR Art. 30",
      "GDPR Art. 5(2)",
      "GDPR Art. 6",
      "GDPR Art. 9",
      "Legea 190/2018",
    ],
    controller: {
      orgId: input.orgId,
      orgName: input.orgName,
    },
    summary: {
      ...evaluation.summary,
      riskScoreAverage,
      exportedActivities: evaluation.activities.length,
    },
    activities: evaluation.activities.map((activity) => {
      const risk = riskByActivityId.get(activity.id)
      return {
        id: activity.id,
        name: activity.activityName,
        department: activity.department,
        purpose: activity.purpose,
        ownerName: activity.ownerName,
        dataSubjects: activity.dataSubjects,
        dataCategories: activity.dataCategories,
        specialCategories: activity.specialCategories,
        legalBasis: activity.legalBasis,
        article9Condition: activity.article9Condition,
        recipients: activity.recipients,
        processors: activity.processors,
        systems: activity.systems,
        thirdCountryTransfers: activity.thirdCountryTransfers,
        retentionRule: activity.retentionRule,
        securityMeasures: activity.securityMeasures,
        status: activity.status,
        confidence: activity.confidence,
        source: activity.source,
        linkedAISystemIds: activity.linkedAISystemIds ?? [],
        risk: {
          level: risk?.riskLevel ?? activity.riskLevel ?? "low",
          score: risk?.riskScore ?? activity.riskScore ?? 0,
          reasons: risk?.reasons ?? activity.riskReasons ?? [],
          missingFields: risk?.missingFields ?? [],
        },
        links: {
          findings: Array.from(new Set([...(activity.linkedFindings ?? []), ...(risk?.findingIds ?? [])])),
          evidence: activity.linkedEvidence ?? [],
          triggers: risk?.triggerIds ?? [],
        },
        timestamps: {
          createdAtISO: activity.createdAtISO,
          updatedAtISO: activity.updatedAtISO,
          lastReviewedAtISO: activity.lastReviewedAtISO,
        },
      }
    }),
  }
}

export function normalizeRopaActivityRecord(
  activity: Partial<RopaActivityRecord> & { id?: string },
  nowISO = new Date().toISOString(),
): RopaActivityRecord {
  const dataCategories = cleanList(activity.dataCategories)
  const specialCategories = Array.from(new Set([
    ...cleanList(activity.specialCategories),
    ...inferSpecialCategories(dataCategories),
  ]))

  return {
    id: cleanString(activity.id) || stableId(activity.activityName ?? "activity"),
    orgId: cleanString(activity.orgId) || undefined,
    department: cleanString(activity.department) || undefined,
    activityName: cleanString(activity.activityName),
    ownerName: cleanString(activity.ownerName) || undefined,
    purpose: cleanString(activity.purpose),
    dataSubjects: cleanList(activity.dataSubjects),
    dataCategories,
    specialCategories,
    legalBasis: cleanString(activity.legalBasis) || undefined,
    article9Condition: cleanString(activity.article9Condition) || undefined,
    recipients: cleanList(activity.recipients),
    processors: cleanList(activity.processors),
    systems: cleanList(activity.systems),
    thirdCountryTransfers: normalizeTransfers(activity.thirdCountryTransfers),
    retentionRule: cleanString(activity.retentionRule) || undefined,
    securityMeasures: cleanList(activity.securityMeasures),
    source: activity.source ?? "manual",
    confidence: activity.confidence ?? "dpo_confirmed",
    status: activity.status ?? "draft",
    linkedFindings: cleanList(activity.linkedFindings),
    linkedEvidence: cleanList(activity.linkedEvidence),
    linkedAISystemIds: cleanList(activity.linkedAISystemIds),
    createdAtISO: isIso(activity.createdAtISO) ? activity.createdAtISO! : nowISO,
    updatedAtISO: isIso(activity.updatedAtISO) ? activity.updatedAtISO! : nowISO,
    lastReviewedAtISO: isIso(activity.lastReviewedAtISO) ? activity.lastReviewedAtISO : undefined,
    riskLevel: activity.riskLevel,
    riskScore: typeof activity.riskScore === "number" ? activity.riskScore : undefined,
    riskReasons: cleanList(activity.riskReasons),
  }
}

export function inferSpecialCategories(dataCategories: string[]): string[] {
  return dataCategories.filter((category) =>
    SPECIAL_CATEGORY_KEYWORDS.some((keyword) => category.toLowerCase().includes(keyword))
  )
}

function evaluateActivityRules(activity: RopaActivityRecord, nowISO: string): RopaRuleOutput[] {
  if (!isMeaningfulActivity(activity)) return []

  const outputs: RopaRuleOutput[] = []
  const haystack = [
    activity.activityName,
    activity.purpose,
    ...activity.dataCategories,
    ...activity.dataSubjects,
    ...activity.recipients,
    ...activity.processors,
    ...activity.systems,
    activity.retentionRule ?? "",
    activity.article9Condition ?? "",
  ].join(" ").toLowerCase()

  if (!activity.legalBasis) {
    outputs.push({
      reason: "Lipsește temeiul juridic Art. 6 pentru activitatea RoPA.",
      missingField: "legalBasis",
      score: 24,
      finding: makeRopaFinding(activity, "legal-basis", "Temei juridic lipsă în RoPA", "Activitatea de prelucrare nu are completat temeiul juridic Art. 6 GDPR.", "medium", nowISO, {
        legalReference: "GDPR Art. 6, Art. 30(1)(b)",
        evidenceRequired: "RoPA actualizat cu temeiul juridic + notă DPO privind justificarea.",
        remediationHint: "Alege temeiul juridic corect și documentează raționamentul în RoPA.",
      }),
    })
  }

  if (!activity.retentionRule) {
    outputs.push({
      reason: "Lipsește regula de retenție pentru activitatea RoPA.",
      missingField: "retentionRule",
      score: 20,
      finding: makeRopaFinding(activity, "retention", "Retenție nedefinită în RoPA", "Activitatea nu are termen de păstrare documentat, ceea ce slăbește principiul limitării stocării.", "medium", nowISO, {
        legalReference: "GDPR Art. 5(1)(e), Art. 30(1)(f)",
        evidenceRequired: "Regulă de retenție aprobată + RoPA actualizat + dovadă revizie.",
        remediationHint: "Definește termenul de păstrare și leagă activitatea de politica de retenție.",
        suggestedDocumentType: "retention-policy",
      }),
      trigger: makeTrigger(activity, "retention_review", "Revizuiește retenția", "retention", "medium", "Activitatea nu are termen de păstrare clar.", "Regulă de retenție + aprobare DPO", 14),
    })
  }

  if (activity.specialCategories.length > 0 && !activity.article9Condition) {
    outputs.push({
      reason: "Activitatea include date speciale, dar condiția Art. 9 nu este documentată.",
      missingField: "article9Condition",
      score: 32,
      finding: makeRopaFinding(activity, "article-9", "Date speciale fără condiție Art. 9 în RoPA", `Activitatea include ${activity.specialCategories.join(", ")}, dar nu are completată condiția Art. 9 GDPR.`, "high", nowISO, {
        legalReference: "GDPR Art. 9, Art. 30",
        evidenceRequired: "Condiție Art. 9 documentată + măsuri suplimentare + RoPA actualizat.",
        remediationHint: "Completează condiția Art. 9 și atașează decizia DPO/management.",
      }),
    })
  }

  if (includesAny(haystack, CNP_KEYWORDS) || includesAny(haystack, ["date de sănătate", "date de sanatate", "medical"])) {
    const hasControl = activity.securityMeasures.length > 0 && activity.retentionRule
    if (!hasControl) {
      outputs.push({
        reason: "CNP/date medicale apar în RoPA fără controale și retenție suficient documentate.",
        missingField: "lege190Controls",
        score: 32,
        finding: makeRopaFinding(activity, "lege-190", "Legea 190/2018 — CNP/date sensibile fără anexă de control", "Activitatea indică CNP sau date medicale, dar RoPA nu arată suficient controalele de acces, retenție și minimizare.", "high", nowISO, {
          legalReference: "Legea 190/2018; GDPR Art. 5, Art. 9, Art. 32",
          evidenceRequired: "Anexă CNP/date sensibile + controale acces + retenție + RoPA actualizat.",
          remediationHint: "Completează anexa Legea 190/2018 și atașează dovezile de acces/retenție.",
          suggestedDocumentType: "ropa",
        }),
      })
    }
  }

  if (activity.processors.length > 0) {
    outputs.push({
      reason: "Activitatea folosește procesatori/furnizori care trebuie verificați Art. 28.",
      score: 16,
      finding: makeRopaFinding(activity, "processor-dpa", "Procesatori RoPA fără verificare DPA/vendor pack", `Activitatea listează procesatori (${activity.processors.join(", ")}), dar trebuie confirmate DPA-ul, subprocesatorii și transferurile.`, "medium", nowISO, {
        legalReference: "GDPR Art. 28, Art. 30(1)(d)",
        evidenceRequired: "DPA semnat sau termeni vendor + lista subprocesatori + status transfer.",
        remediationHint: "Rulează Vendor Review și atașează DPA/vendor pack la activitate.",
        suggestedDocumentType: "dpa",
      }),
      trigger: makeTrigger(activity, "vendor_review", "Verifică DPA / vendor pack", "vendor-review", "medium", "RoPA indică procesatori activi.", "DPA/termeni vendor + subprocesatori + regiune date", 14),
    })
  }

  for (const transfer of activity.thirdCountryTransfers) {
    const mechanism = transfer.mechanism?.trim().toLowerCase() ?? ""
    if (!transfer.country || NO_TRANSFER_MECHANISM.includes(mechanism)) {
      outputs.push({
        reason: "Transfer în afara SEE fără mecanism clar.",
        missingField: "transferMechanism",
        score: 30,
        finding: makeRopaFinding(activity, "transfer", "Transfer internațional fără mecanism documentat", "RoPA indică transfer în afara UE/SEE, dar nu documentează mecanismul legal (SCC, adequacy, DPF etc.).", "high", nowISO, {
          legalReference: "GDPR Art. 44-49, Art. 30(1)(e)",
          evidenceRequired: "Mecanism transfer + TIA/SCC/decizie adecvare + RoPA actualizat.",
          remediationHint: "Documentează țara, mecanismul transferului și dovezile aferente.",
        }),
        trigger: makeTrigger(activity, "transfer_review", "Revizuiește transferul extern", "ropa", "high", "RoPA indică transfer extern fără mecanism complet.", "SCC/TIA/adequacy evidence + RoPA link", 7),
      })
    }
  }

  const requiresDpia =
    activity.specialCategories.length > 0 ||
    includesAny(haystack, DPIA_KEYWORDS) ||
    includesAny(haystack, VULNERABLE_KEYWORDS)
  if (requiresDpia) {
    outputs.push({
      reason: "Activitatea are semnale de risc ridicat și cere DPIA screening.",
      score: 18,
      finding: makeRopaFinding(activity, "dpia-screening", "DPIA screening necesar pentru activitatea RoPA", "RoPA indică date speciale, persoane vulnerabile, monitorizare, profilare sau alt risc ridicat. DPO trebuie să ruleze DPIA screening și să documenteze decizia.", "high", nowISO, {
        legalReference: "GDPR Art. 35; ANSPDCP Decizia 174/2018",
        evidenceRequired: "DPIA screening + decizie DPO + DPIA completă dacă riscul rămâne ridicat.",
        remediationHint: "Rulează DPIA screening și leagă rezultatul de această activitate RoPA.",
      }),
      trigger: makeTrigger(activity, "dpia", "Rulează DPIA screening", "dpia", "high", "Activitatea conține semnale de risc ridicat.", "DPIA screening + decizie DPO + RoPA link", 14),
    })
  }

  if (activity.securityMeasures.length === 0) {
    outputs.push({
      reason: "Nu sunt documentate măsuri tehnice/organizatorice pentru activitate.",
      missingField: "securityMeasures",
      score: 18,
      finding: makeRopaFinding(activity, "security-measures", "Măsuri de securitate lipsă în RoPA", "Activitatea nu are măsuri tehnice și organizatorice documentate, deși Art. 30 cere descrierea generală a măsurilor de securitate unde este posibil.", "medium", nowISO, {
        legalReference: "GDPR Art. 30(1)(g), Art. 32",
        evidenceRequired: "Descriere TOMs + dovadă acces/MFA/backup/logging sau măsuri compensatorii.",
        remediationHint: "Completează măsurile tehnice și organizatorice pentru activitate.",
      }),
      trigger: makeTrigger(activity, "security_review", "Atașează TOMs / security evidence", "security", "medium", "RoPA nu are măsuri de securitate pentru activitate.", "MFA/RBAC/logging/backup/access evidence", 14),
    })
  }

  if (activity.lastReviewedAtISO && olderThanMonths(activity.lastReviewedAtISO, nowISO, 6)) {
    outputs.push({
      reason: "Activitatea RoPA nu a fost revizuită de peste 6 luni.",
      score: 12,
      finding: makeRopaFinding(activity, "stale", "Activitate RoPA veche, nereconfirmată", "Activitatea de prelucrare nu a fost reconfirmată recent. Datele pot fi depășite față de procesele reale.", "low", nowISO, {
        legalReference: "GDPR Art. 5(2), Art. 30",
        evidenceRequired: "Notă de revizie DPO + confirmare owner proces + RoPA actualizat.",
        remediationHint: "Cere confirmare ownerului procesului și marchează activitatea revizuită.",
      }),
    })
  }

  return outputs
}

function knowledgeFromActivity(activity: RopaActivityRecord): OrgKnowledgeItem[] {
  const label = `RoPA/Data Map — ${activity.activityName}`
  const items: OrgKnowledgeItem[] = [
    makeKnowledgeItem("processing-activities", activity.activityName, "ropa-data-map", label, "high"),
  ]

  if (activity.purpose) items.push(makeKnowledgeItem("processing-purposes", activity.purpose, "ropa-data-map", label, "high"))
  if (activity.legalBasis) items.push(makeKnowledgeItem("legal-bases", activity.legalBasis, "ropa-data-map", label, "high"))
  if (activity.retentionRule) items.push(makeKnowledgeItem("retention-rules", activity.retentionRule, "ropa-data-map", label, "high"))
  for (const item of activity.dataSubjects) items.push(makeKnowledgeItem("data-subjects", item, "ropa-data-map", label, "high"))
  for (const item of activity.dataCategories) items.push(makeKnowledgeItem("data-categories", item, "ropa-data-map", label, "high"))
  for (const item of activity.recipients) items.push(makeKnowledgeItem("recipients", item, "ropa-data-map", label, "medium"))
  for (const item of activity.processors) items.push(makeKnowledgeItem("vendors", item, "ropa-data-map", label, "medium"))
  for (const item of activity.systems) items.push(makeKnowledgeItem("tools", item, "ropa-data-map", label, "medium"))
  for (const item of activity.securityMeasures) items.push(makeKnowledgeItem("security-measures", item, "ropa-data-map", label, "high"))
  for (const transfer of activity.thirdCountryTransfers) {
    if (transfer.country) items.push(makeKnowledgeItem("international-transfers", `${transfer.country}${transfer.mechanism ? ` (${transfer.mechanism})` : ""}`, "ropa-data-map", label, "medium"))
  }

  return items
}

function makeRopaFinding(
  activity: RopaActivityRecord,
  ruleId: string,
  title: string,
  detail: string,
  severity: ComplianceSeverity,
  nowISO: string,
  opts: {
    legalReference: string
    evidenceRequired: string
    remediationHint: string
    suggestedDocumentType?: ScanFinding["suggestedDocumentType"]
  },
): ScanFinding {
  const id = `ropa-${stableId(activity.id)}-${ruleId}`
  const category: FindingCategory = "GDPR"
  return {
    id,
    title,
    detail: `${detail} Activitate: ${activity.activityName}.`,
    category,
    severity,
    verdictConfidence: "medium",
    verdictConfidenceReason: "Risc generat din RoPA/Data Map; necesită validare consultant DPO înainte de închidere.",
    risk: severity === "critical" || severity === "high" ? "high" : "low",
    principles: ["privacy_data_governance", "accountability"],
    createdAtISO: nowISO,
    sourceDocument: `RoPA/Data Map (${activity.activityName})`,
    legalReference: opts.legalReference,
    remediationHint: opts.remediationHint,
    evidenceRequired: opts.evidenceRequired,
    findingStatus: "open",
    reviewState: "unreviewed",
    requiresHumanReview: true,
    suggestedDocumentType: opts.suggestedDocumentType,
    provenance: {
      ruleId: `ROPA-${ruleId.toUpperCase()}`,
      signalSource: "manifest",
      verdictBasis: "direct_signal",
      signalConfidence: "medium",
    },
    resolution: {
      problem: title,
      impact: "Fără completarea RoPA și dovada aferentă, consultantul DPO nu poate demonstra conformitatea activității în raportul lunar sau Audit Pack.",
      action: opts.remediationHint,
      closureEvidence: opts.evidenceRequired,
      revalidation: "Reverifică activitatea la schimbarea scopului, vendorului, datelor procesate sau cel puțin la 6 luni.",
    },
  }
}

function makeTrigger(
  activity: RopaActivityRecord,
  type: RopaDataMapTriggerCandidate["type"],
  label: string,
  targetModule: RopaDataMapTriggerCandidate["targetModule"],
  severity: ComplianceSeverity,
  reason: string,
  evidenceRequired: string,
  dueDays: number,
): RopaDataMapTriggerCandidate {
  return {
    id: `trigger-ropa-${stableId(activity.id)}-${type}`,
    type,
    label,
    targetModule,
    severity,
    reason,
    sourceActivityId: activity.id,
    evidenceRequired,
    dueDays,
  }
}

function isMeaningfulActivity(activity: RopaActivityRecord): boolean {
  return Boolean(
    activity.activityName ||
    activity.purpose ||
    activity.dataCategories.length ||
    activity.dataSubjects.length ||
    activity.recipients.length ||
    activity.processors.length ||
    activity.systems.length
  )
}

function normalizeTransfers(value: unknown): RopaThirdCountryTransfer[] {
  if (!Array.isArray(value)) return []
  return value
    .flatMap((item) => {
      if (!item || typeof item !== "object") return []
      const transfer = item as Partial<RopaThirdCountryTransfer>
      const country = cleanString(transfer.country)
      const mechanism = cleanString(transfer.mechanism)
      if (!country && !mechanism) return []
      return [{ country, mechanism: mechanism || undefined }]
    })
    .slice(0, 20)
}

function cleanList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return Array.from(new Set(
    value
      .map((item) => cleanString(item))
      .filter(Boolean)
  )).slice(0, 30)
}

function cleanString(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

function isIso(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value))
}

function includesAny(text: string, needles: string[]): boolean {
  return needles.some((needle) => text.includes(needle.toLowerCase()))
}

function olderThanMonths(iso: string, nowISO: string, months: number): boolean {
  const reviewed = new Date(iso).getTime()
  const now = new Date(nowISO).getTime()
  if (Number.isNaN(reviewed) || Number.isNaN(now)) return false
  return now - reviewed > months * 30 * 24 * 3_600_000
}

function stableId(value: string): string {
  const normalized = cleanString(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48)
  return normalized || "activity"
}

function dedupeKnowledge(items: OrgKnowledgeItem[]): OrgKnowledgeItem[] {
  const seen = new Set<string>()
  const result: OrgKnowledgeItem[] = []
  for (const item of items) {
    const key = `${item.category}:${item.value.toLowerCase()}`
    if (seen.has(key)) continue
    seen.add(key)
    result.push(item)
  }
  return result
}
