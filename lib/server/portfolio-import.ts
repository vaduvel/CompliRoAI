import {
  aiSystemImportDraftToRecord,
  literacyImportDraftToRecord,
  normalizeCui,
  ropaImportDraftToRecord,
  vendorModelImportDraftToRecord,
  type AISystemImportClientMatcher,
  type AISystemImportDraft,
  type ImportCenterTabId,
  type LiteracyImportDraft,
  type RopaImportDraft,
  type VendorModelImportDraft,
} from "@/lib/client-import"
import {
  appendComplianceEvents,
  createComplianceEvent,
  type ComplianceEventActorInput,
} from "@/lib/compliance/events"
import {
  buildAIUseCaseDedupeKey,
  deriveAIUseCaseDraftFlags,
  evaluateAIUseCaseTriggers,
  normalizeAIUseCaseKeyPart,
} from "@/lib/compliance/ai-use-case-trigger-engine"
import {
  inferPrinciplesFromCategory,
  severityToLegacyRisk,
  type ComplianceSeverity,
} from "@/lib/compliance/constitution"
import type {
  AIUseCaseAffectedPerson,
  AIUseCaseAnnexIIIDomain,
  AIUseCaseAutonomyLevel,
  AIUseCaseBusinessProcess,
  AIUseCaseDataCategory,
  AIUseCaseDepartment,
  AIUseCaseHumanReview,
  AIUseCaseOutputType,
  AIUseCaseProhibitedPracticeFlag,
  AIUseCaseRecord,
  AIUseCaseTriState,
  ClientMeta,
  ComplianceEvent,
  FindingCategory,
  ScanFinding,
} from "@/lib/compliance/types"
import type { OrgContext } from "@/lib/server/org-context"
import {
  loadOrgStatesFromSupabase,
  persistOrgStateToSupabase,
} from "@/lib/server/supabase-org-state"
import { listUserMemberships } from "@/lib/server/tenancy"
import {
  mergeWithDefault,
  primeStateCacheForOrg,
  type AIActState,
} from "@/lib/server/store"
import { loadAIUseCasesForOrgIds } from "@/lib/server/ai-use-case-store"

export type PortfolioImportTarget = {
  orgId: string
  orgName: string
  state: AIActState
  changed: boolean
}

export type PortfolioImportRowResult = {
  rowNumber: number
  ok: boolean
  orgId?: string
  orgName?: string
  entityName: string
  message: string
  warnings: string[]
  generatedFindings: string[]
}

export type PortfolioImportCommitResult = {
  ok: boolean
  imported: number
  failed: number
  total: number
  results: PortfolioImportRowResult[]
}

export type NoFileImportChecklistResult = {
  ok: boolean
  orgId: string
  orgName: string
  findingId: string
  title: string
  message: string
}

export function buildPortfolioImportActor(ctx: OrgContext): ComplianceEventActorInput {
  return {
    id: ctx.userId,
    label: ctx.email,
    role: "partner_manager",
    source: "session",
  }
}

export async function loadCabinetPortfolioImportTargets(
  ctx: OrgContext
): Promise<PortfolioImportTarget[]> {
  const memberships = await listUserMemberships(ctx.userId)
  const clientMemberships = memberships.filter(
    (membership) => membership.status === "active" && membership.role === "partner_manager"
  )
  const stateByOrgId = await loadOrgStatesFromSupabase<Partial<AIActState>>(
    clientMemberships.map((membership) => membership.orgId)
  ).catch(() => new Map<string, Partial<AIActState>>())
  const persistedUseCasesByOrg = await loadAIUseCasesForOrgIds(
    clientMemberships.map((membership) => membership.orgId)
  ).catch(() => new Map<string, AIUseCaseRecord[]>())

  return Promise.all(
    clientMemberships.map(async (membership) => {
      const rawState = stateByOrgId.get(membership.orgId) ?? null
      const state = mergeWithDefault(rawState)
      const persistedUseCases = persistedUseCasesByOrg.get(membership.orgId) ?? []
      if (persistedUseCases.length > 0) {
        const merged = new Map<string, AIUseCaseRecord>()
        for (const record of [...(state.aiUseCases ?? []), ...persistedUseCases]) {
          merged.set(record.id, record)
        }
        state.aiUseCases = [...merged.values()]
      }
      return {
        orgId: membership.orgId,
        orgName: membership.orgName,
        state,
        changed: false,
      } satisfies PortfolioImportTarget
    })
  )
}

export async function persistChangedPortfolioImportTargets(targets: PortfolioImportTarget[]) {
  await Promise.all(
    targets
      .filter((target) => target.changed)
      .map(async (target) => {
        await persistOrgStateToSupabase(target.orgId, target.state)
        primeStateCacheForOrg(target.orgId, target.state)
      })
  )
}

type ImportableRow = {
  rowNumber?: number
  clientMatcher?: AISystemImportClientMatcher
  errors?: string[]
  warnings?: string[]
}

const CLIENT_NOT_FOUND =
  "Client negăsit în portofoliu. Importă întâi clientul sau folosește client_name / client_cui corect."

function getClientMeta(state: Partial<AIActState> | null | undefined): ClientMeta | undefined {
  if (!state || typeof state !== "object") return undefined
  return state.clientMeta
}

function normalizeNameKey(value: string | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

function normalizeImportKey(value: string | undefined): string {
  return normalizeNameKey(value)
}

function findingIdPart(value: string | undefined): string {
  const part = normalizeNameKey(value).replace(/\s+/g, "-").slice(0, 60)
  return part || Math.random().toString(36).slice(2, 10)
}

function lookupKey(matcher: AISystemImportClientMatcher | undefined): string | undefined {
  if (!matcher) return undefined
  const value = matcher.value.trim()
  if (!value) return undefined
  if (matcher.type === "cui") {
    const cui = normalizeCui(value)
    return cui ? `cui:${cui}` : undefined
  }
  if (matcher.type === "name") return `name:${normalizeNameKey(value)}`
  return `${matcher.type}:${value}`
}

function addLookup(
  lookup: Map<string, PortfolioImportTarget>,
  key: string | undefined,
  target: PortfolioImportTarget
) {
  if (!key || lookup.has(key)) return
  lookup.set(key, target)
}

function buildTargetLookup(targets: PortfolioImportTarget[]) {
  const lookup = new Map<string, PortfolioImportTarget>()
  for (const target of targets) {
    const meta = getClientMeta(target.state)
    addLookup(lookup, `orgId:${target.orgId}`, target)
    addLookup(lookup, `name:${normalizeNameKey(target.orgName)}`, target)
    addLookup(lookup, meta?.externalId ? `externalId:${meta.externalId}` : undefined, target)
    addLookup(lookup, meta?.cui ? `cui:${normalizeCui(meta.cui)}` : undefined, target)
    addLookup(lookup, meta?.orgName ? `name:${normalizeNameKey(meta.orgName)}` : undefined, target)
  }
  return lookup
}

function rowWarnings(row: ImportableRow): string[] {
  return Array.isArray(row.warnings) ? row.warnings : []
}

function rowErrors(row: ImportableRow): string[] {
  return Array.isArray(row.errors) ? row.errors : []
}

function existingVendorKey(input: { name: string; productUsed?: string; modelName?: string }) {
  return [
    normalizeNameKey(input.name),
    normalizeNameKey(input.productUsed),
    normalizeNameKey(input.modelName),
  ].join("::")
}

function existingSystemKey(input: { name: string; vendor?: string }) {
  return [normalizeNameKey(input.name), normalizeNameKey(input.vendor)].join("::")
}

function existingUseCaseKey(input: { department?: string; intendedPurpose?: string; linkedAiSystemId?: string | null; toolName?: string | null }) {
  return [
    normalizeNameKey(input.department),
    normalizeNameKey(input.intendedPurpose),
    input.linkedAiSystemId ?? normalizeNameKey(input.toolName ?? "no_tool"),
  ].join("::")
}

function existingRopaKey(input: { activityName: string; purpose?: string }) {
  return [normalizeNameKey(input.activityName), normalizeNameKey(input.purpose)].join("::")
}

function existingLiteracyKey(input: { employeeName: string; trainingDate?: string; role?: string }) {
  return [
    normalizeNameKey(input.employeeName),
    normalizeNameKey(input.trainingDate),
    normalizeNameKey(input.role),
  ].join("::")
}

function makeFinding(input: {
  importId: string
  entityId: string
  ruleId: string
  title: string
  detail: string
  category: FindingCategory
  severity: ComplianceSeverity
  legalReference?: string
  ownerSuggestion?: string
  evidenceRequired: string
  remediationHint: string
  impactSummary: string
  nowISO: string
  sourceDocument?: string
}): ScanFinding {
  return {
    id: `import-${findingIdPart(input.importId)}-${findingIdPart(input.entityId)}-${findingIdPart(input.ruleId)}`,
    title: input.title,
    detail: input.detail,
    category: input.category,
    severity: input.severity,
    verdictConfidence: "high",
    verdictConfidenceReason:
      "Finding generat determinist din reguli de import. Importul nu stabilește verdict legal final.",
    risk: severityToLegacyRisk(input.severity),
    principles: inferPrinciplesFromCategory(input.category),
    createdAtISO: input.nowISO,
    sourceDocument: input.sourceDocument ?? "import_center",
    legalReference: input.legalReference,
    impactSummary: input.impactSummary,
    remediationHint: input.remediationHint,
    ownerSuggestion: input.ownerSuggestion,
    evidenceRequired: input.evidenceRequired,
    evidenceTypes: ["document_bundle", "screenshot", "other"],
    findingStatus: "open",
    findingStatusUpdatedAtISO: input.nowISO,
    reviewState: "unreviewed",
    closeCondition: input.evidenceRequired,
    requiredEvidenceKinds: ["document_bundle", "screenshot", "other"],
    resolutionLocus: "hybrid",
    resolutionMode: "external_action",
    requiresHumanReview: true,
    resolution: {
      problem: input.detail,
      impact: input.impactSummary,
      action: input.remediationHint,
      humanStep: "Consultantul validează informația importată înainte de exportul dosarului.",
      closureEvidence: input.evidenceRequired,
      revalidation: "Reverifică la modificare de vendor, scop, date procesate sau politici interne.",
    },
    provenance: {
      ruleId: input.ruleId,
      matchedKeyword: input.ruleId,
      excerpt: input.title,
      signalSource: "manifest",
      verdictBasis: "direct_signal",
      signalConfidence: "high",
    },
  }
}

function findingCreatedEvent(
  finding: ScanFinding,
  actor: ComplianceEventActorInput,
  createdAtISO = finding.createdAtISO
): ComplianceEvent {
  return createComplianceEvent(
    {
      type: "finding.created",
      entityType: "finding",
      entityId: finding.id,
      message: `Acțiune generată din Import Center: ${finding.title}`,
      createdAtISO,
      metadata: {
        category: finding.category,
        severity: finding.severity,
        source: finding.sourceDocument,
      },
    },
    actor
  )
}

function offsetISO(iso: string, ms: number) {
  return new Date(new Date(iso).getTime() + ms).toISOString()
}

function appendToTarget(
  target: PortfolioImportTarget,
  input: {
    findings: ScanFinding[]
    events: ComplianceEvent[]
    actor: ComplianceEventActorInput
  }
) {
  if (input.findings.length > 0) {
    target.state.findings = [...input.findings, ...(target.state.findings ?? [])]
  }
  const baseISO = input.findings[0]?.createdAtISO ?? input.events[0]?.createdAtISO ?? new Date().toISOString()
  const findingEvents = input.findings.map((finding, index) =>
    findingCreatedEvent(finding, input.actor, offsetISO(baseISO, index))
  )
  const businessEvents = input.events.map((event, index) => ({
    ...event,
    createdAtISO: offsetISO(baseISO, findingEvents.length + index),
  }))
  target.state.events = appendComplianceEvents(target.state, [
    ...findingEvents,
    ...businessEvents,
  ])
  target.changed = true
}

function aiSystemFindings(input: {
  importId: string
  entityId: string
  systemName: string
  vendor?: string
  usesPersonalData: boolean
  hasHumanReview: boolean
  riskLevel: "minimal" | "limited" | "high"
  makesAutomatedDecisions: boolean
  impactsRights: boolean
  nowISO: string
}) {
  const findings: ScanFinding[] = [
    makeFinding({
      importId: input.importId,
      entityId: input.entityId,
      ruleId: "ai_system.role_risk_review",
      title: `Validează rolul și riscul AI Act pentru ${input.systemName}`,
      detail: "Sistem AI importat cu clasificare draft. Rolul și riscul trebuie validate de consultant.",
      category: "EU_AI_ACT",
      severity: input.riskLevel === "high" ? "high" : "medium",
      legalReference: "AI Act Art. 6, Art. 25",
      evidenceRequired: "Decizie role/risk aprobată, scop intenționat și justificare pentru categoria de risc.",
      remediationHint: "Rulează role/risk review și marchează decizia înainte de Audit Pack.",
      impactSummary: "Fără review, CSV-ul ar putea fi interpretat greșit ca verdict legal final.",
      ownerSuggestion: "Consultant / DPO",
      nowISO: input.nowISO,
    }),
  ]

  if (input.usesPersonalData) {
    findings.push(
      makeFinding({
        importId: input.importId,
        entityId: input.entityId,
        ruleId: "ai_system.gdpr_overlap_review",
        title: `Verifică DPIA/RoPA pentru sistemul AI ${input.systemName}`,
        detail: "Sistemul AI importat procesează sau poate procesa date personale.",
        category: "GDPR",
        severity: "medium",
        legalReference: "GDPR Art. 30, Art. 35",
        evidenceRequired: "RoPA/DPIA screening, data-flow și temei juridic.",
        remediationHint: "Leagă sistemul de RoPA/date și rulează DPIA triage.",
        impactSummary: "Overlap-ul AI Act + GDPR rămâne incomplet fără data mapping.",
        ownerSuggestion: "DPO",
        nowISO: input.nowISO,
      })
    )
  }

  if (input.vendor) {
    findings.push(
      makeFinding({
        importId: input.importId,
        entityId: input.entityId,
        ruleId: "ai_system.vendor_review",
        title: `Review vendor/model pentru ${input.systemName}`,
        detail: "Sistemul AI are vendor/model declarat, dar dovada contractuală și termenii AI trebuie verificați.",
        category: "GDPR",
        severity: "medium",
        legalReference: "GDPR Art. 28, AI Act Art. 13",
        evidenceRequired: "Vendor record, DPA/terms, regiune, training opt-out și security docs.",
        remediationHint: "Importă sau completează tabul Furnizori / modele pentru acest client.",
        impactSummary: "Fără vendor review, dosarul nu poate demonstra controlul furnizorului.",
        ownerSuggestion: "IT / Procurement / DPO",
        nowISO: input.nowISO,
      })
    )
  }

  if (!input.hasHumanReview) {
    findings.push(
      makeFinding({
        importId: input.importId,
        entityId: input.entityId,
        ruleId: "ai_system.human_oversight",
        title: `Definește human oversight pentru ${input.systemName}`,
        detail: "Importul declară sistem fără human review sau cu human review neconfirmat.",
        category: "EU_AI_ACT",
        severity: "high",
        legalReference: "AI Act Art. 14",
        evidenceRequired: "Owner uman, procedură de review, fallback și dovadă de aprobare.",
        remediationHint: "Definește supravegherea umană și atașează dovada.",
        impactSummary: "Lipsa supravegherii umane crește riscul operațional și legal.",
        ownerSuggestion: "Process owner / DPO",
        nowISO: input.nowISO,
      })
    )
  }

  if (input.riskLevel === "high" || input.makesAutomatedDecisions || input.impactsRights) {
    findings.push(
      makeFinding({
        importId: input.importId,
        entityId: input.entityId,
        ruleId: "ai_system.high_risk_candidate_review",
        title: `Review high-risk candidate pentru ${input.systemName}`,
        detail: "Importul indică domeniu sensibil, decizie automată sau impact asupra drepturilor.",
        category: "EU_AI_ACT",
        severity: "high",
        legalReference: "AI Act Art. 6, Annex III, Art. 27",
        evidenceRequired: "High-risk triage, FRIA/DPIA decision, human oversight și vendor documentation.",
        remediationHint: "Deschide review high-risk și marchează rezultatul ca decizie umană.",
        impactSummary: "Un candidat high-risk netriat poate subestima obligațiile clientului.",
        ownerSuggestion: "Consultant / DPO",
        nowISO: input.nowISO,
      })
    )
  }

  return findings
}

function mapImportTriState(value: string | undefined): AIUseCaseTriState {
  if (value === "yes" || value === "no" || value === "unknown") return value
  return "unknown"
}

function rawImportValue(row: AISystemImportDraft, aliases: string[]) {
  const aliasSet = new Set(aliases.map((alias) => normalizeImportKey(alias)))
  for (const [key, value] of Object.entries(row.raw ?? {})) {
    if (aliasSet.has(normalizeImportKey(key))) {
      const trimmed = value?.trim()
      if (trimmed) return trimmed
    }
  }
  return undefined
}

function mapDepartment(value: string | undefined, purposeRaw?: string): AIUseCaseDepartment {
  const key = normalizeNameKey(value ?? purposeRaw)
  if (key.includes("hr") || key.includes("recrut")) return "hr_recruitment"
  if (key.includes("marketing")) return "marketing"
  if (key.includes("legal") || key.includes("jurid") || key.includes("contract")) return "legal_compliance"
  if (key.includes("support") || key.includes("suport") || key.includes("client")) return "customer_support"
  if (key.includes("it") || key.includes("dev") || key.includes("software") || key.includes("cod")) return "it_development"
  if (key.includes("secur")) return "security"
  if (key.includes("financ") || key.includes("contab")) return "finance_accounting"
  if (key.includes("procurement") || key.includes("achiz")) return "procurement"
  if (key.includes("sales") || key.includes("vanz")) return "sales"
  if (key.includes("medical") || key.includes("health") || key.includes("sanat")) return "medical_healthcare"
  if (key.includes("educ")) return "education_training"
  if (key.includes("credit")) return "credit_finance"
  if (key.includes("asigur") || key.includes("insurance")) return "insurance"
  return value ? "other" : "unknown"
}

function mapBusinessProcess(value: string | undefined, useCaseName?: string, purposeRaw?: string): AIUseCaseBusinessProcess {
  const key = normalizeNameKey([value, useCaseName, purposeRaw].filter(Boolean).join(" "))
  if (
    key.includes("content") ||
    key.includes("reclame") ||
    key.includes("texte") ||
    key.includes("campanii") ||
    key.includes("draft") ||
    key.includes("redact") ||
    key.includes("descrieri") ||
    key.includes("anunturi")
  ) {
    return "content_creation"
  }
  if (key.includes("chatbot") || key.includes("customer") || key.includes("suport")) return "customer_interaction"
  if (key.includes("ticket")) return "support_ticketing"
  if (key.includes("cv") || key.includes("recrut") || key.includes("screening")) return "recruitment_selection"
  if (key.includes("contract")) return "contract_review"
  if (key.includes("document")) return "document_review"
  if (key.includes("software") || key.includes("cod") || key.includes("dev")) return "software_development"
  if (key.includes("scoring") || key.includes("ranking")) return "risk_scoring"
  if (key.includes("credit")) return "credit_assessment"
  if (key.includes("asigur") || key.includes("insurance")) return "insurance_pricing"
  if (key.includes("medical") || key.includes("triage")) return "medical_triage"
  return value ? "other" : "unknown"
}

function mapHumanReview(value: string | undefined): AIUseCaseHumanReview {
  if (value === "yes") return "required_before_action"
  if (value === "no") return "none"
  return "unknown"
}

function mapHumanReviewFromImportRow(row: AISystemImportDraft): AIUseCaseHumanReview {
  const raw = rawImportValue(row, [
    "human_review",
    "human review",
    "has_human_review",
    "has human review",
  ])
  const key = normalizeImportKey(raw)
  if (key === "required before action" || key === "required_before_action") return "required_before_action"
  if (key === "required after output" || key === "required_after_output") return "required_after_output"
  if (key === "sample review" || key === "sample_review") return "sample_review"
  if (key === "optional") return "optional"
  if (key === "provider defined" || key === "provider_defined") return "provider_defined"
  if (key === "escalation only" || key === "escalation_only") return "escalation_only"
  if (key === "two person verification" || key === "two_person_verification") return "two_person_verification"
  return mapHumanReview(row.humanReviewAnswer)
}

function mapLifecycle(value: string | undefined): AIUseCaseRecord["lifecycleStatus"] {
  const key = normalizeNameKey(value)
  if (key.includes("pilot")) return "pilot"
  if (key.includes("activ") || key === "active") return "active"
  if (key.includes("plan")) return "planned"
  if (key.includes("test")) return "internal_test"
  if (key.includes("suspend") || key.includes("pause")) return "paused"
  if (key.includes("retired") || key.includes("retras")) return "retired"
  return "unknown"
}

function dataCategoriesForUseCase(row: AISystemImportDraft): AIUseCaseDataCategory[] {
  return dataCategoriesForUseCaseWithContext(
    row,
    mapDepartment(row.department, row.purposeRaw),
    mapBusinessProcess(row.businessProcess, row.useCaseName, row.purposeRaw),
    inferScoringOrRanking(
      row,
      mapDepartment(row.department, row.purposeRaw),
      mapBusinessProcess(row.businessProcess, row.useCaseName, row.purposeRaw)
    ),
    mapAffectedPersons(
      row,
      mapDepartment(row.department, row.purposeRaw),
      mapBusinessProcess(row.businessProcess, row.useCaseName, row.purposeRaw)
    )
  )
}

function mapAffectedPersons(
  row: AISystemImportDraft,
  department: AIUseCaseDepartment,
  businessProcess: AIUseCaseBusinessProcess
): AIUseCaseAffectedPerson[] {
  const mapped = new Set<AIUseCaseAffectedPerson>()
  for (const raw of row.affectedPersons) {
    const key = normalizeImportKey(raw)
    if (["customers", "clienti", "clienți"].includes(key)) mapped.add("customers")
    else if (["prospects", "prospecti", "prospects leads"].includes(key)) mapped.add("prospects")
    else if (["website visitors", "website_visitors", "vizitatori site", "vizitatori website"].includes(key)) {
      mapped.add("website_visitors")
    } else if (["candidates", "candidati", "candidați"].includes(key)) mapped.add("candidates")
    else if (["employees", "angajati", "angajați"].includes(key)) mapped.add("employees")
    else if (["patients", "pacienti", "pacienți"].includes(key)) mapped.add("patients")
    else if (["students", "studenti", "studenți"].includes(key)) mapped.add("students")
    else if (["children", "copii", "minori"].includes(key)) mapped.add("children")
    else if (["suppliers", "furnizori"].includes(key)) mapped.add("suppliers")
    else if (["contractors", "contractori"].includes(key)) mapped.add("contractors")
    else if (["end users", "end_users", "utilizatori finali"].includes(key)) mapped.add("end_users")
    else if (["citizens public", "citizens_public", "cetateni", "cetățeni"].includes(key)) mapped.add("citizens_public")
    else if (
      ["vulnerable persons", "vulnerable_persons", "persoane vulnerabile"].includes(key)
    ) {
      mapped.add("vulnerable_persons")
    } else if (
      ["no natural persons", "no_natural_persons", "fara persoane fizice", "fără persoane fizice"].includes(key)
    ) {
      mapped.add("no_natural_persons")
    }
  }

  if (mapped.size > 0) return [...mapped]
  if (department === "hr_recruitment" && businessProcess === "recruitment_selection") return ["candidates"]
  if (businessProcess === "customer_interaction" || businessProcess === "support_ticketing") {
    return ["customers"]
  }
  return ["unknown"]
}

function inferScoringOrRanking(
  row: AISystemImportDraft,
  department: AIUseCaseDepartment,
  businessProcess: AIUseCaseBusinessProcess
): AIUseCaseTriState {
  const key = normalizeNameKey(
    [row.useCaseName, row.purposeRaw, row.systemName, row.businessProcess, row.department].filter(Boolean).join(" ")
  )
  if (
    row.purpose === "credit-scoring" ||
    key.includes("ranking") ||
    key.includes("scoring") ||
    key.includes("score") ||
    key.includes("shortlist") ||
    key.includes("filtr") ||
    key.includes("emotion scoring")
  ) {
    return "yes"
  }
  if (
    row.automatedDecisionsAnswer === "yes" &&
    (
      businessProcess === "recruitment_selection" ||
      businessProcess === "risk_scoring" ||
      businessProcess === "credit_assessment" ||
      businessProcess === "insurance_pricing" ||
      department === "credit_finance" ||
      department === "insurance"
    )
  ) {
    return "yes"
  }
  if (row.automatedDecisionsAnswer === "no") return "no"
  return "unknown"
}

function inferOutputTypes(
  row: AISystemImportDraft,
  businessProcess: AIUseCaseBusinessProcess,
  scoringOrRanking: AIUseCaseTriState
): AIUseCaseOutputType[] {
  const key = normalizeNameKey(
    [row.useCaseName, row.purposeRaw, row.systemName, row.department, row.businessProcess].filter(Boolean).join(" ")
  )
  const types = new Set<AIUseCaseOutputType>()

  if (row.purpose === "support-chatbot" || key.includes("chatbot")) {
    types.add("chatbot_interaction")
    types.add("generated_text")
  }
  if (row.publicOutputAnswer === "yes") types.add("generated_text")
  if (row.purpose === "decision-support") {
    types.add("recommendation")
    types.add("decision_support")
  }
  if (row.purpose === "credit-scoring") {
    types.add("scoring")
    types.add("prediction")
    types.add("recommendation")
  }
  if (scoringOrRanking === "yes") {
    types.add("ranking")
    types.add("scoring")
    types.add("classification")
    types.add("recommendation")
  }
  if (row.automatedDecisionsAnswer === "yes") types.add("automated_decision")
  if (key.includes("sumar")) types.add("summarization")
  if (key.includes("transcri")) types.add("transcription")
  if (key.includes("copilot") || key.includes("cod") || businessProcess === "software_development") {
    types.add("code_generation")
  }
  if (key.includes("emotion")) types.add("emotion_recognition")
  if (types.size === 0) types.add("unknown")
  return [...types]
}

function inferAutonomyLevel(
  row: AISystemImportDraft,
  scoringOrRanking: AIUseCaseTriState
): AIUseCaseAutonomyLevel {
  if (row.automatedDecisionsAnswer === "yes" && row.humanReviewAnswer === "no") return "fully_automated_action"
  if (row.automatedDecisionsAnswer === "yes") return "semi_automated_action"
  if (scoringOrRanking === "yes") return "ranks_or_scores"
  if (row.purpose === "decision-support" || row.purpose === "credit-scoring") return "recommends_human_decides"
  return "assistive_only"
}

function inferPeopleRightsImpact(
  row: AISystemImportDraft,
  businessProcess: AIUseCaseBusinessProcess,
  scoringOrRanking: AIUseCaseTriState,
  affectedPersons: AIUseCaseAffectedPerson[]
): AIUseCaseTriState {
  if (row.impactsRightsAnswer === "yes" || row.impactsRightsAnswer === "no") {
    return row.impactsRightsAnswer
  }
  if (affectedPersons.includes("no_natural_persons")) return "no"
  if (
    row.usesPersonalDataAnswer === "no" &&
    row.automatedDecisionsAnswer === "no" &&
    scoringOrRanking === "no" &&
    businessProcess === "content_creation"
  ) {
    return "no"
  }
  return "unknown"
}

function inferAnnexIIIDomain(
  row: AISystemImportDraft,
  department: AIUseCaseDepartment,
  businessProcess: AIUseCaseBusinessProcess,
  scoringOrRanking: AIUseCaseTriState
): AIUseCaseAnnexIIIDomain {
  const hasMaterialPeopleImpact =
    scoringOrRanking === "yes" ||
    row.automatedDecisionsAnswer === "yes" ||
    row.impactsRightsAnswer === "yes"

  if (
    department === "hr_recruitment" &&
    (businessProcess === "recruitment_selection" || businessProcess === "employee_management") &&
    hasMaterialPeopleImpact
  ) {
    return "employment_worker_management"
  }
  if (
    department === "credit_finance" &&
    (businessProcess === "credit_assessment" || businessProcess === "risk_scoring") &&
    hasMaterialPeopleImpact
  ) {
    return "creditworthiness"
  }
  if (
    department === "insurance" &&
    businessProcess === "insurance_pricing" &&
    hasMaterialPeopleImpact
  ) {
    return "life_health_insurance"
  }
  if (
    department === "medical_healthcare" &&
    businessProcess === "medical_triage" &&
    hasMaterialPeopleImpact
  ) {
    return "emergency_dispatch_triage"
  }
  if (
    department === "education_training" &&
    businessProcess === "education_assessment" &&
    hasMaterialPeopleImpact
  ) {
    return "education_vocational_training"
  }
  if (businessProcess === "biometric_access" && hasMaterialPeopleImpact) return "biometrics"
  return "none"
}

function inferProhibitedPracticeFlags(
  row: AISystemImportDraft,
  department: AIUseCaseDepartment
): AIUseCaseProhibitedPracticeFlag[] {
  const key = normalizeNameKey(
    [row.useCaseName, row.purposeRaw, row.systemName, row.department].filter(Boolean).join(" ")
  )
  if (
    (department === "hr_recruitment" || department === "education_training") &&
    key.includes("emotion")
  ) {
    return ["workplace_education_emotion_recognition"]
  }
  return ["none"]
}

function dataCategoriesForUseCaseWithContext(
  row: AISystemImportDraft,
  department: AIUseCaseDepartment,
  businessProcess: AIUseCaseBusinessProcess,
  scoringOrRanking: AIUseCaseTriState,
  affectedPersons: AIUseCaseAffectedPerson[]
): AIUseCaseDataCategory[] {
  const categories = new Set<AIUseCaseDataCategory>()
  if (row.usesPersonalDataAnswer === "no") categories.add("no_personal_data")
  if (row.usesPersonalDataAnswer === "yes") {
    if (affectedPersons.includes("candidates")) categories.add("candidate_data")
    if (affectedPersons.includes("employees")) categories.add("employee_data")
    if (affectedPersons.includes("customers")) categories.add("customer_data")
    if (affectedPersons.includes("prospects")) categories.add("prospect_data")
    if (affectedPersons.includes("patients")) categories.add("patient_health_data")
    if (affectedPersons.includes("students")) categories.add("student_data")
    if (affectedPersons.includes("children")) categories.add("child_data")
  }
  if (row.confidentialDataAnswer === "yes") categories.add("confidential_business_data")
  if (businessProcess === "contract_review" || normalizeNameKey(row.useCaseName).includes("contract")) {
    categories.add("contracts_legal_docs")
  }
  if (
    row.usesPersonalDataAnswer !== "no" &&
    affectedPersons.includes("candidates") &&
    (scoringOrRanking === "yes" || businessProcess === "recruitment_selection")
  ) {
    categories.add("candidate_data")
  }
  if (affectedPersons.includes("patients")) categories.add("special_category_data")
  if (normalizeNameKey([row.systemName, row.useCaseName, row.purposeRaw].filter(Boolean).join(" ")).includes("copilot")) {
    categories.add("source_code")
  }
  if (categories.size === 0) categories.add("unknown")
  return [...categories]
}

function buildAIUseCaseRecord(input: {
  row: AISystemImportDraft
  target: PortfolioImportTarget
  systemId: string
  actor: ComplianceEventActorInput
  nowISO: string
  importId: string
}): AIUseCaseRecord {
  const row = input.row
  const useCaseName = row.useCaseName?.trim() || row.purposeRaw?.trim() || row.systemName
  const intendedPurpose = row.purposeRaw?.trim() || useCaseName
  const department = mapDepartment(row.department, row.purposeRaw)
  const businessProcess = mapBusinessProcess(row.businessProcess, useCaseName, row.purposeRaw)
  const affectedPersons = mapAffectedPersons(row, department, businessProcess)
  const scoringOrRanking = inferScoringOrRanking(row, department, businessProcess)
  const humanReview = mapHumanReviewFromImportRow(row)
  const outputTypes = inferOutputTypes(row, businessProcess, scoringOrRanking)
  const autonomyLevel = inferAutonomyLevel(row, scoringOrRanking)
  const annexIIIDomain = inferAnnexIIIDomain(row, department, businessProcess, scoringOrRanking)
  const prohibitedPracticeFlags = inferProhibitedPracticeFlags(row, department)
  const impactsPeopleRights = inferPeopleRightsImpact(
    row,
    businessProcess,
    scoringOrRanking,
    affectedPersons
  )
  const dataCategories = dataCategoriesForUseCaseWithContext(
    row,
    department,
    businessProcess,
    scoringOrRanking,
    affectedPersons
  )
  const id = `ai-use-case-${findingIdPart(input.importId)}-${findingIdPart(useCaseName)}-${row.rowNumber ?? Date.now()}`
  const record: AIUseCaseRecord = {
    id,
    orgId: input.target.orgId,
    workspaceMode: "cabinet",
    clientId: input.target.orgId,
    aiProjectId: null,
    linkedAiSystemId: input.systemId,
    linkedVendorId: null,
    linkedModelId: null,
    linkedDataProcessId: null,
    useCaseName,
    shortDescription: row.notes ?? null,
    department,
    businessProcess,
    lifecycleStatus: mapLifecycle(row.stage),
    ownerName: null,
    ownerEmail: row.owner ?? null,
    ownerRole: null,
    intendedPurpose,
    actualUseDescription: row.notes ?? null,
    outOfScopeUse: null,
    toolName: row.systemName,
    vendorName: row.vendor ?? null,
    modelName: row.modelType ?? null,
    deploymentMode: "unknown",
    internalUsers: row.owner ? [row.owner] : [],
    affectedPersons,
    vulnerableGroups: ["unknown"],
    usesPersonalData: mapImportTriState(row.usesPersonalDataAnswer),
    usesSpecialCategoryData: row.usesPersonalDataAnswer === "no" ? "no" : "unknown",
    usesConfidentialData: mapImportTriState(row.confidentialDataAnswer),
    usesTradeSecrets: "unknown",
    usesChildrenData: row.usesPersonalDataAnswer === "no" ? "no" : "unknown",
    dataCategories,
    inputDataSource: ["manual_user_input"],
    dataRegion: "unknown",
    transferOutsideEea: "unknown",
    outputTypes,
    autonomyLevel,
    humanReview,
    publicOutput: mapImportTriState(row.publicOutputAnswer),
    directInteractionWithPersons:
      row.purpose === "support-chatbot" || businessProcess === "customer_interaction" ? "yes" : "unknown",
    automatedDecision: mapImportTriState(row.automatedDecisionsAnswer),
    scoringOrRanking,
    impactsPeopleRights,
    annexIIIDomain,
    prohibitedPracticeFlags,
    draftRole: "deployer",
    draftRiskLevel: "unknown",
    highRiskCandidate: false,
    prohibitedCandidate: false,
    art50TransparencyTrigger: false,
    gdprReviewNeeded: false,
    dpiNeedsReview: false,
    friaCandidate: false,
    vendorReviewNeeded: false,
    humanOversightNeeded: false,
    loggingReviewNeeded: false,
    qmsReviewNeeded: false,
    pmmReviewNeeded: false,
    incidentProcessNeeded: false,
    certaintyStatus: "imported",
    reviewStatus: "needs_review",
    evidenceCompletenessPct: 0,
    openFindingsCount: 0,
    source: "csv_import",
    sourceImportId: input.importId,
    sourceRowNumber: row.rowNumber ?? null,
    sourceMagicLinkToken: null,
    sourceConfidencePct: null,
    createdAtISO: input.nowISO,
    createdBy: input.actor.id ?? "system",
    updatedAtISO: input.nowISO,
    updatedBy: null,
    archivedAtISO: null,
    archivedBy: null,
    auditVersion: 1,
    dedupeKey: "",
    consultantNotes: null,
    internalNotes: row.notes ?? null,
  }
  record.dedupeKey = buildAIUseCaseDedupeKey({
    orgId: record.orgId,
    clientId: record.clientId,
    department: record.department,
    intendedPurpose: record.intendedPurpose,
    linkedAiSystemId: record.linkedAiSystemId,
    toolName: record.toolName,
  })
  const withFlags = deriveAIUseCaseDraftFlags(record)
  return withFlags
}

function vendorFindings(input: {
  importId: string
  entityId: string
  vendorName: string
  dpaMissing: boolean
  transferUnknown: boolean
  trainingUnknown: boolean
  nowISO: string
}) {
  const findings: ScanFinding[] = []
  if (input.dpaMissing) {
    findings.push(
      makeFinding({
        importId: input.importId,
        entityId: input.entityId,
        ruleId: "vendor.attach_dpa",
        title: `Atașează DPA / termenii furnizorului AI pentru ${input.vendorName}`,
        detail: "Importul indică DPA lipsă sau neconfirmat pentru un furnizor AI.",
        category: "GDPR",
        severity: "high",
        legalReference: "GDPR Art. 28",
        evidenceRequired: "DPA semnat, termenii enterprise sau dovada că DPA nu este necesar.",
        remediationHint: "Atașează documentul DPA/terms și marchează review-ul vendorului.",
        impactSummary: "Fără DPA/terms, procesarea prin vendor nu poate fi susținută în audit.",
        ownerSuggestion: "DPO / Procurement",
        nowISO: input.nowISO,
      })
    )
  }
  if (input.transferUnknown) {
    findings.push(
      makeFinding({
        importId: input.importId,
        entityId: input.entityId,
        ruleId: "vendor.confirm_transfer",
        title: `Confirmă regiunea și mecanismul de transfer pentru ${input.vendorName}`,
        detail: "Importul nu confirmă unde sunt procesate datele sau mecanismul de transfer.",
        category: "GDPR",
        severity: "medium",
        legalReference: "GDPR Art. 44-49",
        evidenceRequired: "Regiune de procesare, SCC/TIA sau dovada că nu există transfer în afara SEE.",
        remediationHint: "Confirmă regiunea vendorului și atașează dovada de transfer.",
        impactSummary: "Transferurile nerezolvate pot bloca exportul unui dosar auditabil.",
        ownerSuggestion: "DPO / IT",
        nowISO: input.nowISO,
      })
    )
  }
  if (input.trainingUnknown) {
    findings.push(
      makeFinding({
        importId: input.importId,
        entityId: input.entityId,
        ruleId: "vendor.confirm_training_use",
        title: `Confirmă dacă ${input.vendorName} folosește datele clientului la training`,
        detail: "Importul nu confirmă termenii AI privind folosirea datelor clientului pentru training.",
        category: "EU_AI_ACT",
        severity: "medium",
        legalReference: "AI Act Art. 4, Art. 13, Art. 50",
        evidenceRequired: "Termeni AI, setare opt-out, contract enterprise sau policy vendor.",
        remediationHint: "Confirmă termenii de training/retention și atașează dovada.",
        impactSummary: "Termenii AI neclari cresc riscul de confidențialitate și guvernanță.",
        ownerSuggestion: "IT / DPO",
        nowISO: input.nowISO,
      })
    )
  }
  return findings
}

function ropaFindings(input: {
  importId: string
  entityId: string
  activityName: string
  hasTransfer: boolean
  needsDpia: boolean
  nowISO: string
}) {
  const findings: ScanFinding[] = []
  if (input.hasTransfer) {
    findings.push(
      makeFinding({
        importId: input.importId,
        entityId: input.entityId,
        ruleId: "ropa.transfer_review",
        title: `Verifică transferul internațional pentru RoPA: ${input.activityName}`,
        detail: "Activitatea RoPA importată include transferuri în țări terțe.",
        category: "GDPR",
        severity: "medium",
        legalReference: "GDPR Art. 44-49",
        evidenceRequired: "Mecanism transfer, SCC/TIA sau confirmare procesare exclusiv SEE.",
        remediationHint: "Documentează transferul și atașează dovada vendorului.",
        impactSummary: "Transferul nerezolvat blochează dosarul GDPR pentru utilizarea AI.",
        ownerSuggestion: "DPO",
        nowISO: input.nowISO,
      })
    )
  }
  if (input.needsDpia) {
    findings.push(
      makeFinding({
        importId: input.importId,
        entityId: input.entityId,
        ruleId: "ropa.dpia_review",
        title: `Verifică necesitatea DPIA pentru procesul AI: ${input.activityName}`,
        detail: "Procesul importat implică AI/date personale și necesită triere DPIA.",
        category: "GDPR",
        severity: "medium",
        legalReference: "GDPR Art. 35",
        evidenceRequired: "DPIA screening, decizie DPO sau DPIA completă unde se aplică.",
        remediationHint: "Rulează screening DPIA și marchează decizia înainte de export.",
        impactSummary: "Fără DPIA triage, overlap-ul AI Act + GDPR rămâne neverificat.",
        ownerSuggestion: "DPO",
        nowISO: input.nowISO,
      })
    )
  }
  return findings
}

function literacyFindings(input: {
  importId: string
  entityId: string
  employeeName: string
  attestationSigned: boolean
  nowISO: string
}) {
  if (input.attestationSigned) return []
  return [
    makeFinding({
      importId: input.importId,
      entityId: input.entityId,
      ruleId: "literacy.collect_training_evidence",
      title: `Colectează dovada de finalizare AI Literacy pentru ${input.employeeName}`,
      detail: "Trainingul AI Literacy este importat fără dovadă/atestare semnată.",
      category: "EU_AI_ACT",
      severity: "medium",
      legalReference: "AI Act Art. 4",
      evidenceRequired: "Confirmare semnată, certificat, roster LMS sau captură din platforma de training.",
      remediationHint: "Cere dovada de finalizare și marchează review-ul trainingului.",
      impactSummary: "Fără dovadă, programul de AI Literacy nu poate fi susținut în audit.",
      ownerSuggestion: "HR / DPO",
      nowISO: input.nowISO,
    }),
  ]
}

function buildResult(results: PortfolioImportRowResult[]): PortfolioImportCommitResult {
  const imported = results.filter((result) => result.ok).length
  return {
    ok: imported > 0,
    imported,
    failed: results.length - imported,
    total: results.length,
    results,
  }
}

export function commitAISystemImportRows(input: {
  targets: PortfolioImportTarget[]
  rows: AISystemImportDraft[]
  actor: ComplianceEventActorInput
  nowISO: string
  importId: string
}): PortfolioImportCommitResult {
  const lookup = buildTargetLookup(input.targets)
  const results: PortfolioImportRowResult[] = []

  for (const row of input.rows) {
    const rowNumber = row.rowNumber ?? results.length + 2
    const systemName = row.systemName?.trim() || "Sistem AI fără nume"
    const errors = rowErrors(row)
    if (errors.length > 0 || !row.systemName) {
      results.push({
        rowNumber,
        ok: false,
        entityName: systemName,
        message: errors[0] ?? "Nume sistem AI lipsă.",
        warnings: rowWarnings(row),
        generatedFindings: [],
      })
      continue
    }

    const target = lookup.get(lookupKey(row.clientMatcher) ?? "")
    if (!target) {
      results.push({
        rowNumber,
        ok: false,
        entityName: systemName,
        message: CLIENT_NOT_FOUND,
        warnings: rowWarnings(row),
        generatedFindings: [],
      })
      continue
    }

    const isUseCaseRow = Boolean(row.useCaseName || row.department || row.businessProcess)
    const duplicateKey = existingSystemKey({ name: row.systemName, vendor: row.vendor })
    const existingSystem = (target.state.aiSystems ?? []).find((system) =>
      existingSystemKey({ name: system.name, vendor: system.vendor }) === duplicateKey
    )

    if (isUseCaseRow) {
      let systemRecord = existingSystem
      const systemWasCreated = !systemRecord
      if (!systemRecord) {
        systemRecord = {
          ...aiSystemImportDraftToRecord(row, input.nowISO),
          sourceImportId: input.importId,
          certaintyStatus: "imported" as const,
          reviewStatus: "needs_review" as const,
        }
        target.state.aiSystems = [...(target.state.aiSystems ?? []), systemRecord]
      }

      const draftUseCase = buildAIUseCaseRecord({
        row,
        target,
        systemId: systemRecord.id,
        actor: input.actor,
        nowISO: input.nowISO,
        importId: input.importId,
      })
      const useCaseKey = existingUseCaseKey({
        department: draftUseCase.department,
        intendedPurpose: draftUseCase.intendedPurpose,
        linkedAiSystemId: draftUseCase.linkedAiSystemId,
        toolName: draftUseCase.toolName,
      })
      const existingUseCases = target.state.aiUseCases ?? []
      const existingUseCaseIndex = existingUseCases.findIndex((record) =>
        existingUseCaseKey({
          department: record.department,
          intendedPurpose: record.intendedPurpose,
          linkedAiSystemId: record.linkedAiSystemId,
          toolName: record.toolName,
        }) === useCaseKey
      )
      if (existingUseCaseIndex >= 0) {
        const existingUseCase = existingUseCases[existingUseCaseIndex]
        const updatedDraft = deriveAIUseCaseDraftFlags({
          ...draftUseCase,
          id: existingUseCase.id,
          createdAtISO: existingUseCase.createdAtISO,
          createdBy: existingUseCase.createdBy,
          sourceImportId: input.importId,
          updatedAtISO: input.nowISO,
          updatedBy: input.actor.id ?? "system",
          auditVersion: (existingUseCase.auditVersion ?? 1) + 1,
        })
        const generatedFindings = evaluateAIUseCaseTriggers(updatedDraft, input.nowISO)
        const existingFindingKeys = new Set(
          (target.state.findings ?? [])
            .filter((finding) => finding.id.includes(normalizeAIUseCaseKeyPart(existingUseCase.id)))
            .map((finding) => finding.provenance?.ruleId ?? finding.id)
        )
        const newFindings = generatedFindings.filter((finding) =>
          !existingFindingKeys.has(finding.provenance?.ruleId ?? finding.id)
        )
        const updatedUseCase = {
          ...updatedDraft,
          openFindingsCount: generatedFindings.length,
        }
        target.state.aiUseCases = existingUseCases.map((record, index) =>
          index === existingUseCaseIndex ? updatedUseCase : record
        )
        appendToTarget(target, {
          findings: newFindings,
          actor: input.actor,
          events: [
            createComplianceEvent(
              {
                type: "ai_use_case.updated",
                entityType: "ai_use_case",
                entityId: updatedUseCase.id,
                message: `Utilizare AI actualizată din import pentru ${target.orgName}: ${updatedUseCase.useCaseName}`,
                createdAtISO: input.nowISO,
                metadata: {
                  source: "ai_systems_use_cases_import",
                  importId: input.importId,
                  clientOrgId: target.orgId,
                  linkedAiSystemId: systemRecord.id,
                  draftRiskLevel: updatedUseCase.draftRiskLevel,
                  reviewStatus: updatedUseCase.reviewStatus,
                  generatedFindings: newFindings.length,
                  idempotentUpdate: true,
                },
              },
              input.actor
            ),
          ],
        })
        results.push({
          rowNumber,
          ok: true,
          orgId: target.orgId,
          orgName: target.orgName,
          entityName: updatedUseCase.useCaseName,
          message: "Utilizare AI existentă actualizată pentru acest client (idempotent).",
          warnings: rowWarnings(row),
          generatedFindings: newFindings.map((finding) => finding.title),
        })
        continue
      }

      const findings = evaluateAIUseCaseTriggers(draftUseCase, input.nowISO)
      const useCaseRecord = {
        ...draftUseCase,
        openFindingsCount: findings.length,
      }
      target.state.aiUseCases = [...(target.state.aiUseCases ?? []), useCaseRecord]
      appendToTarget(target, {
        findings,
        actor: input.actor,
        events: [
          ...(systemWasCreated
            ? [
                createComplianceEvent(
                  {
                    type: "ai_system.imported",
                    entityType: "system",
                    entityId: systemRecord.id,
                    message: `Sistem AI creat ca tool pentru utilizări AI în ${target.orgName}: ${systemRecord.name}`,
                    createdAtISO: input.nowISO,
                    metadata: {
                      source: "ai_use_case_import",
                      importId: input.importId,
                      clientOrgId: target.orgId,
                      vendor: systemRecord.vendor,
                      modelType: systemRecord.modelType,
                    },
                  },
                  input.actor
                ),
              ]
            : []),
          createComplianceEvent(
            {
              type: "ai_use_case.imported",
              entityType: "ai_use_case",
              entityId: useCaseRecord.id,
              message: `Utilizare AI importată pentru ${target.orgName}: ${useCaseRecord.useCaseName}`,
              createdAtISO: input.nowISO,
              metadata: {
                source: "ai_systems_use_cases_import",
                importId: input.importId,
                clientOrgId: target.orgId,
                linkedAiSystemId: systemRecord.id,
                draftRiskLevel: useCaseRecord.draftRiskLevel,
                reviewStatus: useCaseRecord.reviewStatus,
                generatedFindings: findings.length,
              },
            },
            input.actor
          ),
        ],
      })
      results.push({
        rowNumber,
        ok: true,
        orgId: target.orgId,
        orgName: target.orgName,
        entityName: useCaseRecord.useCaseName,
        message: `Utilizare AI importată în ${target.orgName}.`,
        warnings: rowWarnings(row),
        generatedFindings: findings.map((finding) => finding.title),
      })
      continue
    }

    const existingKeys = new Set(
      (target.state.aiSystems ?? []).map((system) =>
        existingSystemKey({ name: system.name, vendor: system.vendor })
      )
    )
    if (existingKeys.has(duplicateKey)) {
      results.push({
        rowNumber,
        ok: false,
        orgId: target.orgId,
        orgName: target.orgName,
        entityName: systemName,
        message: "Sistem AI duplicat pentru acest client (nume + vendor).",
        warnings: rowWarnings(row),
        generatedFindings: [],
      })
      continue
    }

    const record = {
      ...aiSystemImportDraftToRecord(row, input.nowISO),
      sourceImportId: input.importId,
      certaintyStatus: "imported" as const,
      reviewStatus: "needs_review" as const,
    }
    const findings = aiSystemFindings({
      importId: input.importId,
      entityId: record.id,
      systemName: record.name,
      vendor: record.vendor,
      usesPersonalData: record.usesPersonalData,
      hasHumanReview: record.hasHumanReview,
      riskLevel: record.riskLevel,
      makesAutomatedDecisions: record.makesAutomatedDecisions,
      impactsRights: record.impactsRights,
      nowISO: input.nowISO,
    })
    target.state.aiSystems = [...(target.state.aiSystems ?? []), record]
    appendToTarget(target, {
      findings,
      actor: input.actor,
      events: [
        createComplianceEvent(
          {
            type: "ai_system.imported",
            entityType: "system",
            entityId: record.id,
            message: `Sistem AI importat în inventar pentru ${target.orgName}: ${record.name}`,
            createdAtISO: input.nowISO,
            metadata: {
              source: "ai_system_import",
              importId: input.importId,
              clientOrgId: target.orgId,
              vendor: record.vendor,
              modelType: record.modelType,
              riskLevel: record.riskLevel,
              reviewStatus: record.reviewStatus ?? "needs_review",
              generatedFindings: findings.length,
            },
          },
          input.actor
        ),
      ],
    })
    results.push({
      rowNumber,
      ok: true,
      orgId: target.orgId,
      orgName: target.orgName,
      entityName: systemName,
      message: `Sistem AI importat în ${target.orgName}.`,
      warnings: rowWarnings(row),
      generatedFindings: findings.map((finding) => finding.title),
    })
  }

  return buildResult(results)
}

export function commitVendorModelImportRows(input: {
  targets: PortfolioImportTarget[]
  rows: VendorModelImportDraft[]
  actor: ComplianceEventActorInput
  nowISO: string
  importId: string
}): PortfolioImportCommitResult {
  const lookup = buildTargetLookup(input.targets)
  const results: PortfolioImportRowResult[] = []

  for (const row of input.rows) {
    const rowNumber = row.rowNumber ?? results.length + 2
    const vendorName = row.vendorName?.trim() || "Vendor fără nume"
    const errors = rowErrors(row)
    if (errors.length > 0 || !row.vendorName) {
      results.push({
        rowNumber,
        ok: false,
        entityName: vendorName,
        message: errors[0] ?? "Nume vendor lipsă.",
        warnings: rowWarnings(row),
        generatedFindings: [],
      })
      continue
    }

    const target = lookup.get(lookupKey(row.clientMatcher) ?? "")
    if (!target) {
      results.push({
        rowNumber,
        ok: false,
        entityName: vendorName,
        message: CLIENT_NOT_FOUND,
        warnings: rowWarnings(row),
        generatedFindings: [],
      })
      continue
    }

    const duplicateKey = existingVendorKey({ name: row.vendorName, productUsed: row.productUsed })
    const existingKeys = new Set(
      (target.state.vendorRecords ?? []).map((vendor) =>
        existingVendorKey({ name: vendor.name, productUsed: vendor.productUsed })
      )
    )
    if (existingKeys.has(duplicateKey)) {
      results.push({
        rowNumber,
        ok: false,
        orgId: target.orgId,
        orgName: target.orgName,
        entityName: vendorName,
        message: "Vendor/model duplicat pentru acest client.",
        warnings: rowWarnings(row),
        generatedFindings: [],
      })
      continue
    }

    const record = {
      ...vendorModelImportDraftToRecord(row, target.orgId, input.nowISO),
      sourceImportId: input.importId,
      certaintyStatus: "imported" as const,
      importReviewStatus: "needs_review" as const,
    }
    const findings = vendorFindings({
      importId: input.importId,
      entityId: record.id,
      vendorName: record.name,
      dpaMissing: record.dpaStatus !== "signed" && record.dpaStatus !== "not_required",
      transferUnknown: record.vendorRegion === "unknown" || record.transferMechanism === "unknown",
      trainingUnknown: record.aiTerms.trainingDataOptOut === "unknown",
      nowISO: input.nowISO,
    })
    record.linkedFindingIds = findings.map((finding) => finding.id)
    target.state.vendorRecords = [...(target.state.vendorRecords ?? []), record]
    appendToTarget(target, {
      findings,
      actor: input.actor,
      events: [
        createComplianceEvent(
          {
            type: "vendor_model.imported",
            entityType: "system",
            entityId: record.id,
            message: `Vendor/model importat pentru ${target.orgName}: ${record.name} / ${record.productUsed}`,
            createdAtISO: input.nowISO,
            metadata: {
              source: "vendors_models_import",
              importId: input.importId,
              clientOrgId: target.orgId,
              vendor: record.name,
              product: record.productUsed,
              dpaStatus: record.dpaStatus,
              reviewStatus: record.reviewStatus,
            },
          },
          input.actor
        ),
      ],
    })
    results.push({
      rowNumber,
      ok: true,
      orgId: target.orgId,
      orgName: target.orgName,
      entityName: vendorName,
      message: `Vendor/model importat în ${target.orgName}.`,
      warnings: rowWarnings(row),
      generatedFindings: findings.map((finding) => finding.title),
    })
  }

  return buildResult(results)
}

export function commitRopaImportRows(input: {
  targets: PortfolioImportTarget[]
  rows: RopaImportDraft[]
  actor: ComplianceEventActorInput
  nowISO: string
  importId: string
}): PortfolioImportCommitResult {
  const lookup = buildTargetLookup(input.targets)
  const results: PortfolioImportRowResult[] = []

  for (const row of input.rows) {
    const rowNumber = row.rowNumber ?? results.length + 2
    const activityName = row.activityName?.trim() || "Activitate RoPA fără nume"
    const errors = rowErrors(row)
    if (errors.length > 0 || !row.activityName) {
      results.push({
        rowNumber,
        ok: false,
        entityName: activityName,
        message: errors[0] ?? "Nume activitate RoPA lipsă.",
        warnings: rowWarnings(row),
        generatedFindings: [],
      })
      continue
    }

    const target = lookup.get(lookupKey(row.clientMatcher) ?? "")
    if (!target) {
      results.push({
        rowNumber,
        ok: false,
        entityName: activityName,
        message: CLIENT_NOT_FOUND,
        warnings: rowWarnings(row),
        generatedFindings: [],
      })
      continue
    }

    const duplicateKey = existingRopaKey({ activityName: row.activityName, purpose: row.purpose })
    const existingKeys = new Set(
      (target.state.ropaActivities ?? []).map((activity) =>
        existingRopaKey({ activityName: activity.activityName, purpose: activity.purpose })
      )
    )
    if (existingKeys.has(duplicateKey)) {
      results.push({
        rowNumber,
        ok: false,
        orgId: target.orgId,
        orgName: target.orgName,
        entityName: activityName,
        message: "Activitate RoPA duplicată pentru acest client.",
        warnings: rowWarnings(row),
        generatedFindings: [],
      })
      continue
    }

    const record = {
      ...ropaImportDraftToRecord(row, target.orgId, input.nowISO),
      sourceImportId: input.importId,
      certaintyStatus: "imported" as const,
      reviewStatus: "needs_review" as const,
    }
    const hasTransfer = record.thirdCountryTransfers.length > 0
    const needsDpia =
      hasTransfer ||
      record.specialCategories.length > 0 ||
      record.dataCategories.length > 0 ||
      record.processors.length > 0
    const findings = ropaFindings({
      importId: input.importId,
      entityId: record.id,
      activityName: record.activityName,
      hasTransfer,
      needsDpia,
      nowISO: input.nowISO,
    })
    record.linkedFindings = findings.map((finding) => finding.id)
    target.state.ropaActivities = [...(target.state.ropaActivities ?? []), record]
    appendToTarget(target, {
      findings,
      actor: input.actor,
      events: [
        createComplianceEvent(
          {
            type: "ropa.activity.imported",
            entityType: "system",
            entityId: record.id,
            message: `Activitate RoPA importată pentru ${target.orgName}: ${record.activityName}`,
            createdAtISO: input.nowISO,
            metadata: {
              source: "ropa_import",
              importId: input.importId,
              clientOrgId: target.orgId,
              activityName: record.activityName,
              riskLevel: record.riskLevel ?? "unknown",
            },
          },
          input.actor
        ),
      ],
    })
    results.push({
      rowNumber,
      ok: true,
      orgId: target.orgId,
      orgName: target.orgName,
      entityName: activityName,
      message: `Activitate RoPA importată în ${target.orgName}.`,
      warnings: rowWarnings(row),
      generatedFindings: findings.map((finding) => finding.title),
    })
  }

  return buildResult(results)
}

export function commitLiteracyImportRows(input: {
  targets: PortfolioImportTarget[]
  rows: LiteracyImportDraft[]
  actor: ComplianceEventActorInput
  nowISO: string
  importId: string
}): PortfolioImportCommitResult {
  const lookup = buildTargetLookup(input.targets)
  const results: PortfolioImportRowResult[] = []

  for (const row of input.rows) {
    const rowNumber = row.rowNumber ?? results.length + 2
    const employeeName = row.employeeName?.trim() || "Persoană fără nume"
    const errors = rowErrors(row)
    if (errors.length > 0 || !row.employeeName) {
      results.push({
        rowNumber,
        ok: false,
        entityName: employeeName,
        message: errors[0] ?? "Nume persoană lipsă.",
        warnings: rowWarnings(row),
        generatedFindings: [],
      })
      continue
    }

    const target = lookup.get(lookupKey(row.clientMatcher) ?? "")
    if (!target) {
      results.push({
        rowNumber,
        ok: false,
        entityName: employeeName,
        message: CLIENT_NOT_FOUND,
        warnings: rowWarnings(row),
        generatedFindings: [],
      })
      continue
    }

    const duplicateKey = existingLiteracyKey({
      employeeName: row.employeeName,
      trainingDate: row.trainingDate,
      role: row.role,
    })
    const existingKeys = new Set(
      (target.state.literacyRecords ?? []).map((record) =>
        existingLiteracyKey({
          employeeName: record.employeeName,
          trainingDate: record.trainingDate,
          role: record.role,
        })
      )
    )
    if (existingKeys.has(duplicateKey)) {
      results.push({
        rowNumber,
        ok: false,
        orgId: target.orgId,
        orgName: target.orgName,
        entityName: employeeName,
        message: "Training AI Literacy duplicat pentru acest client.",
        warnings: rowWarnings(row),
        generatedFindings: [],
      })
      continue
    }

    const record = {
      ...literacyImportDraftToRecord(row, input.nowISO),
      sourceImportId: input.importId,
      certaintyStatus: "imported" as const,
      reviewStatus: "needs_review" as const,
    }
    const findings = literacyFindings({
      importId: input.importId,
      entityId: record.id,
      employeeName: record.employeeName,
      attestationSigned: record.attestationSigned,
      nowISO: input.nowISO,
    })
    target.state.literacyRecords = [...(target.state.literacyRecords ?? []), record]
    appendToTarget(target, {
      findings,
      actor: input.actor,
      events: [
        createComplianceEvent(
          {
            type: "ai_literacy.imported",
            entityType: "system",
            entityId: record.id,
            message: `Training AI Literacy importat pentru ${target.orgName}: ${record.employeeName}`,
            createdAtISO: input.nowISO,
            metadata: {
              source: "ai_literacy_import",
              importId: input.importId,
              clientOrgId: target.orgId,
              employeeName: record.employeeName,
              role: record.role,
              attestationSigned: record.attestationSigned,
            },
          },
          input.actor
        ),
      ],
    })
    results.push({
      rowNumber,
      ok: true,
      orgId: target.orgId,
      orgName: target.orgName,
      entityName: employeeName,
      message: `Training AI Literacy importat în ${target.orgName}.`,
      warnings: rowWarnings(row),
      generatedFindings: findings.map((finding) => finding.title),
    })
  }

  return buildResult(results)
}

function noFileTemplate(importType: ImportCenterTabId) {
  switch (importType) {
    case "ai_systems":
      return {
        title: "Creează survey departamental pentru inventarul AI",
        detail: "Nu există fișier cu sisteme AI; trebuie colectate utilizările AI pe departamente.",
        category: "EU_AI_ACT" as const,
        legalReference: "AI Act Art. 4, Art. 6, Art. 50",
        evidenceRequired: "Survey completat de departamente sau intake client cu tooluri/scopuri AI.",
        remediationHint: "Trimite survey/intake și colectează tool, scop, date, owner și human review.",
      }
    case "vendors_models":
      return {
        title: "Creează checklist de dovezi pentru furnizori AI",
        detail: "Nu există fișier cu furnizori/modele; trebuie cerute DPA, regiune, termeni AI și securitate.",
        category: "GDPR" as const,
        legalReference: "GDPR Art. 28, Art. 44-49",
        evidenceRequired: "DPA/terms, subprocesatori, regiune, training opt-out și security docs.",
        remediationHint: "Trimite checklist către IT/procurement și atașează documentele primite.",
      }
    case "ropa":
      return {
        title: "Creează chestionar GDPR pentru procesele AI",
        detail: "Nu există fișier RoPA/date; trebuie mapate procesele AI cu date personale.",
        category: "GDPR" as const,
        legalReference: "GDPR Art. 30, Art. 35",
        evidenceRequired: "Proces, date, persoane vizate, temei, retenție, transferuri și procesatori.",
        remediationHint: "Trimite chestionar DPO/operational și leagă procesele de use case-uri AI.",
      }
    case "ai_literacy":
      return {
        title: "Creează rosterul pentru AI Literacy",
        detail: "Nu există fișier cu traininguri; trebuie construit rosterul pe persoane/roluri.",
        category: "EU_AI_ACT" as const,
        legalReference: "AI Act Art. 4",
        evidenceRequired: "Lista persoanelor, nivelul de utilizare AI, training asignat și dovada finalizării.",
        remediationHint: "Cere HR rosterul și pornește colectarea dovezilor AI Literacy.",
      }
    case "clients":
    default:
      return {
        title: "Creează checklist pentru onboarding client fără fișier",
        detail: "Nu există fișier de clienți; consultantul trebuie să introducă manual datele minime.",
        category: "EU_AI_ACT" as const,
        legalReference: "AI Act Art. 4",
        evidenceRequired: "Nume client, CUI unde există, contact, scope, deadline și status AI cunoscut/necunoscut.",
        remediationHint: "Creează clientul manual și trimite intake dacă AI-ul este necunoscut.",
      }
  }
}

export function commitNoFileImportChecklist(input: {
  target: PortfolioImportTarget
  importType: ImportCenterTabId
  actor: ComplianceEventActorInput
  nowISO: string
  importId: string
}): NoFileImportChecklistResult {
  const template = noFileTemplate(input.importType)
  const finding = makeFinding({
    importId: input.importId,
    entityId: `${input.target.orgId}-${input.importType}`,
    ruleId: `no_file.${input.importType}`,
    title: template.title,
    detail: template.detail,
    category: template.category,
    severity: "medium",
    legalReference: template.legalReference,
    evidenceRequired: template.evidenceRequired,
    remediationHint: template.remediationHint,
    impactSummary: "Fără acest checklist, importul rămâne blocat și dosarul clientului nu poate avansa.",
    ownerSuggestion: "Consultant / client owner",
    nowISO: input.nowISO,
    sourceDocument: "import_center_no_file",
  })

  appendToTarget(input.target, {
    findings: [finding],
    actor: input.actor,
    events: [
      createComplianceEvent(
        {
          type: "import.no_file_checklist_created",
          entityType: "finding",
          entityId: finding.id,
          message: `Checklist fără fișier creat pentru ${input.target.orgName}: ${template.title}`,
          createdAtISO: input.nowISO,
          metadata: {
            source: "import_center_no_file",
            importId: input.importId,
            importType: input.importType,
            clientOrgId: input.target.orgId,
          },
        },
        input.actor
      ),
    ],
  })

  return {
    ok: true,
    orgId: input.target.orgId,
    orgName: input.target.orgName,
    findingId: finding.id,
    title: finding.title,
    message: `Checklist creat în ${input.target.orgName}.`,
  }
}
