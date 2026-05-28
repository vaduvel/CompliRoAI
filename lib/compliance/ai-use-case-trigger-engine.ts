import {
  inferPrinciplesFromCategory,
  severityToLegacyRisk,
  type ComplianceSeverity,
} from "@/lib/compliance/constitution"
import type {
  AIUseCaseBusinessProcess,
  AIUseCaseDepartment,
  AIUseCaseOutputType,
  AIUseCaseProhibitedPracticeFlag,
  AIUseCaseRecord,
  AIUseCaseReviewStatus,
  FindingCategory,
  ScanFinding,
} from "@/lib/compliance/types"

type TriggerSpec = {
  code: string
  title: string
  detail: string
  category: FindingCategory
  severity: ComplianceSeverity
  legalReference: string
  evidenceRequired: string
  remediationHint: string
  impactSummary: string
  ownerSuggestion: string
}

export function normalizeAIUseCaseKeyPart(value: string | null | undefined): string {
  const normalized = (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
  return normalized || "unknown"
}

export function buildAIUseCaseDedupeKey(input: {
  orgId: string
  clientId?: string | null
  department?: string | null
  intendedPurpose?: string | null
  linkedAiSystemId?: string | null
  toolName?: string | null
}) {
  return [
    input.clientId ?? input.orgId,
    normalizeAIUseCaseKeyPart(input.department),
    normalizeAIUseCaseKeyPart(input.intendedPurpose),
    input.linkedAiSystemId ?? normalizeAIUseCaseKeyPart(input.toolName ?? "no_tool"),
  ].join(":")
}

export function deriveAIUseCaseDraftFlags(record: AIUseCaseRecord): AIUseCaseRecord {
  const prohibitedCandidate = hasRealProhibitedFlag(record.prohibitedPracticeFlags)
  const highRiskCandidate = !prohibitedCandidate && isHighRiskCandidate(record)
  const art50TransparencyTrigger = hasTransparencyTrigger(record)
  const gdprReviewNeeded =
    record.usesPersonalData !== "no" ||
    record.usesSpecialCategoryData !== "no" ||
    record.usesChildrenData === "yes"
  const dpiNeedsReview = gdprReviewNeeded && (
    highRiskCandidate ||
    record.automatedDecision !== "no" ||
    record.scoringOrRanking !== "no" ||
    record.impactsPeopleRights !== "no"
  )
  const vendorReviewNeeded = Boolean(record.vendorName?.trim() || record.toolName?.trim())
  const humanOversightNeeded =
    highRiskCandidate ||
    record.impactsPeopleRights !== "no" ||
    record.automatedDecision !== "no" ||
    record.scoringOrRanking !== "no" ||
    record.humanReview === "none" ||
    record.humanReview === "unknown"
  const loggingReviewNeeded =
    highRiskCandidate || record.automatedDecision === "yes" || record.scoringOrRanking === "yes"

  let reviewStatus: AIUseCaseReviewStatus = record.reviewStatus
  if (prohibitedCandidate || highRiskCandidate) {
    reviewStatus = "needs_lawyer_review"
  } else if (gdprReviewNeeded && record.reviewStatus === "draft") {
    reviewStatus = "needs_dpo_review"
  } else if (record.reviewStatus === "draft") {
    reviewStatus = "needs_review"
  }

  return {
    ...record,
    prohibitedCandidate,
    highRiskCandidate,
    art50TransparencyTrigger,
    gdprReviewNeeded,
    dpiNeedsReview,
    friaCandidate: highRiskCandidate && gdprReviewNeeded,
    vendorReviewNeeded,
    humanOversightNeeded,
    loggingReviewNeeded,
    qmsReviewNeeded: highRiskCandidate && record.draftRole !== "deployer",
    pmmReviewNeeded: highRiskCandidate && record.draftRole !== "deployer",
    incidentProcessNeeded: highRiskCandidate || record.directInteractionWithPersons === "yes",
    draftRiskLevel: prohibitedCandidate
      ? "prohibited_candidate"
      : highRiskCandidate
        ? "high_risk_candidate"
        : art50TransparencyTrigger
          ? "limited_transparency"
          : record.draftRiskLevel === "unknown"
            ? "minimal"
            : record.draftRiskLevel,
    draftRole: record.draftRole === "unknown" ? "deployer" : record.draftRole,
    reviewStatus,
  }
}

export function evaluateAIUseCaseTriggers(
  input: AIUseCaseRecord,
  nowISO = new Date().toISOString()
): ScanFinding[] {
  const record = deriveAIUseCaseDraftFlags(input)
  const specs: TriggerSpec[] = []
  const name = record.useCaseName

  if (!record.ownerEmail && !record.ownerName) {
    specs.push({
      code: "ai_use_case.owner_assignment",
      title: `Atribuie owner pentru utilizarea AI: ${name}`,
      detail: "Utilizarea AI nu are owner intern confirmat.",
      category: "EU_AI_ACT",
      severity: "medium",
      legalReference: "AI Act governance, Art. 4, Art. 26",
      evidenceRequired: "Owner intern, rol, email și responsabilitate de review.",
      remediationHint: "Atribuie owner operațional și owner de review înainte de export.",
      impactSummary: "Fără owner, finding-urile și dovezile nu pot fi urmărite până la rezolvare.",
      ownerSuggestion: "Management / consultant",
    })
  }

  if (record.source === "csv_import" || record.certaintyStatus === "imported") {
    specs.push({
      code: "ai_use_case.role_risk_review",
      title: `Validează rolul și riscul AI Act pentru utilizarea AI: ${name}`,
      detail: "Utilizarea AI a fost importată ca draft și cere review uman.",
      category: "EU_AI_ACT",
      severity: record.highRiskCandidate ? "high" : "medium",
      legalReference: "EU AI Act Art. 6, Art. 25, Art. 26, Annex III",
      evidenceRequired: "Role/risk assessment, intended purpose și justificare de risc.",
      remediationHint: "Rulează review-ul de rol/risc și salvează decizia consultantului.",
      impactSummary: "Importul nu este verdict legal final; fără review, exportul ar supraestima certitudinea.",
      ownerSuggestion: "Consultant / DPO",
    })
  }

  if (record.usesPersonalData === "unknown") {
    specs.push({
      code: "ai_use_case.confirm_personal_data",
      title: `Confirmă dacă utilizarea AI procesează date personale: ${name}`,
      detail: "Datele personale sunt marcate necunoscut și trebuie confirmate explicit.",
      category: "GDPR",
      severity: "medium",
      legalReference: "GDPR Art. 5, Art. 30, Art. 35; AI Act Art. 26(9)",
      evidenceRequired: "Data-flow minim, categorii de date și răspuns owner/DPO.",
      remediationHint: "Cere data-flow sau intake pe departament pentru această utilizare AI.",
      impactSummary: "Unknown nu este tratat ca no; fără confirmare, GDPR bridge rămâne deschis.",
      ownerSuggestion: "DPO / process owner",
    })
  }

  if (record.usesPersonalData === "yes" || record.usesSpecialCategoryData !== "no") {
    specs.push({
      code: "ai_use_case.gdpr_ropa_dpia",
      title: `Verifică GDPR/RoPA/DPIA pentru utilizarea AI: ${name}`,
      detail: "Utilizarea AI implică sau poate implica date personale ori categorii speciale.",
      category: "GDPR",
      severity: "high",
      legalReference: "GDPR Art. 30, Art. 35; AI Act Art. 26(9), Art. 27",
      evidenceRequired: "RoPA/DPIA screening, temei juridic, data-flow și vendor/DPA.",
      remediationHint: "Leagă utilizarea AI de RoPA/date și decide dacă DPIA este necesară.",
      impactSummary: "AI Act + GDPR nu pot fi separate când datele personale intră în sistem.",
      ownerSuggestion: "DPO",
    })
  }

  if (record.vendorName || record.toolName) {
    specs.push({
      code: "ai_use_case.vendor_review",
      title: `Review vendor/model pentru ${name}`,
      detail: "Toolul sau vendorul trebuie verificat contractual și operațional.",
      category: "GDPR",
      severity: record.usesPersonalData === "yes" ? "high" : "medium",
      legalReference: "GDPR Art. 28; AI Act Art. 13, Art. 26",
      evidenceRequired: "Vendor record, DPA/terms, regiune, subprocesatori, training opt-out.",
      remediationHint: "Completează tabul Furnizori / modele și atașează dovezile vendor.",
      impactSummary: "Fără vendor review, dosarul nu poate demonstra controlul furnizorului.",
      ownerSuggestion: "Procurement / IT / DPO",
    })
  }

  if (record.usesConfidentialData === "yes") {
    specs.push({
      code: "ai_use_case.confidential_data_policy",
      title: `Verifică politica pentru date confidențiale în AI: ${name}`,
      detail: "Utilizarea AI poate primi date confidențiale sau documente interne.",
      category: "EU_AI_ACT",
      severity: "high",
      legalReference: "Contract, GDPR Art. 5(1)(f), AI governance",
      evidenceRequired: "Politică AI internă, reguli de input și aprobarea ownerului.",
      remediationHint: "Definește ce date pot fi introduse și atașează policy/acknowledgement.",
      impactSummary: "Datele confidențiale în AI cresc riscul de divulgare și vendor leakage.",
      ownerSuggestion: "Legal / IT security",
    })
  }

  if (record.usesTradeSecrets === "yes" || record.dataCategories.some((c) => c === "source_code" || c === "trade_secrets")) {
    specs.push({
      code: "ai_use_case.source_code_trade_secret_policy",
      title: `Verifică politica pentru cod sursă și secrete comerciale în AI: ${name}`,
      detail: "Utilizarea AI implică source code, trade secrets sau know-how intern.",
      category: "EU_AI_ACT",
      severity: "high",
      legalReference: "Contract, trade secrets, GDPR security",
      evidenceRequired: "Policy pentru cod/secrete comerciale, setări enterprise și confirmare opt-out.",
      remediationHint: "Atașează regulile de folosire și dovada setărilor vendor pentru date de training.",
      impactSummary: "Codul sursă și secretele comerciale cer control tehnic și contractual explicit.",
      ownerSuggestion: "Engineering / IT security / legal",
    })

    if (record.vendorName || record.toolName) {
      specs.push({
        code: "ai_use_case.vendor_training_use",
        title: `Confirmă dacă vendorul folosește datele clientului la training: ${name}`,
        detail: "Termenii de training/retention pentru vendor trebuie confirmați.",
        category: "GDPR",
        severity: "high",
        legalReference: "GDPR Art. 28, confidentiality clauses, AI terms",
        evidenceRequired: "Training opt-out, enterprise terms sau policy vendor.",
        remediationHint: "Cere dovada setării opt-out și atașează termenii vendor.",
        impactSummary: "Training use neconfirmat poate compromite confidențialitatea clientului.",
        ownerSuggestion: "Procurement / legal / IT",
      })
    }
  }

  if (record.department === "it_development" || record.department === "security" || record.dataCategories.includes("source_code")) {
    specs.push({
      code: "ai_use_case.it_security_review",
      title: `Review IT security pentru utilizarea AI: ${name}`,
      detail: "Utilizarea AI atinge cod, infrastructură sau date tehnice sensibile.",
      category: "EU_AI_ACT",
      severity: "medium",
      legalReference: "AI Act Art. 15, security governance",
      evidenceRequired: "Aprobare IT/security, setări de retenție, acces și logging.",
      remediationHint: "Cere review IT security înainte de includerea în Audit Pack.",
      impactSummary: "Fără security review, registrul nu acoperă riscul tehnic al toolului AI.",
      ownerSuggestion: "IT security",
    })
  }

  if (record.directInteractionWithPersons === "yes" || record.outputTypes.includes("chatbot_interaction")) {
    specs.push({
      code: "ai_use_case.art50_chatbot_notice",
      title: `Adaugă notice Art. 50 pentru chatbot: ${name}`,
      detail: "Utilizarea AI interacționează direct cu persoane fizice.",
      category: "EU_AI_ACT",
      severity: "medium",
      legalReference: "EU AI Act Art. 50(1)",
      evidenceRequired: "Text notice, plasare în UI și screenshot cu dovada afișării.",
      remediationHint: "Generează notice-ul și cere screenshot evidence.",
      impactSummary: "Fără disclosure, utilizatorul nu știe că interacționează cu AI.",
      ownerSuggestion: "Customer support / product owner",
    })
  }

  if (record.highRiskCandidate) {
    specs.push({
      code: "ai_use_case.high_risk_candidate_review",
      title: `Review high-risk candidate pentru ${name}`,
      detail: "Utilizarea AI intră într-un domeniu sensibil sau implică scoring/ranking/impact asupra persoanelor.",
      category: "EU_AI_ACT",
      severity: "critical",
      legalReference: "EU AI Act Art. 6, Annex III, Art. 26, Art. 27",
      evidenceRequired: "High-risk triage, role matrix, Annex III memo, FRIA/DPIA decision.",
      remediationHint: "Marchează ca high-risk candidate și trimite la review juridic/DPO.",
      impactSummary: "Candidatul high-risk nu devine verdict final fără review uman.",
      ownerSuggestion: "Legal / DPO / consultant",
    })
  }

  if (record.humanOversightNeeded) {
    specs.push({
      code: "ai_use_case.human_oversight",
      title: `Definește human oversight pentru ${name}`,
      detail: "Nivelul de autonomie, scoring sau impactul asupra persoanelor cere control uman documentat.",
      category: "EU_AI_ACT",
      severity: record.highRiskCandidate ? "high" : "medium",
      legalReference: "EU AI Act Art. 14, Art. 26(2)",
      evidenceRequired: "SOP supraveghere umană, owner, escaladare și dovadă de aprobare.",
      remediationHint: "Definește cine verifică output-ul și când poate opri/fallback sistemul.",
      impactSummary: "Fără oversight, acțiunile AI pot fi tratate ca necontrolate operațional.",
      ownerSuggestion: "Process owner / DPO",
    })
  }

  if (record.loggingReviewNeeded) {
    specs.push({
      code: "ai_use_case.logging_evidence",
      title: `Verifică logging evidence pentru ${name}`,
      detail: "Utilizarea AI cere dovadă de logging pentru review, audit sau contestare.",
      category: "EU_AI_ACT",
      severity: "high",
      legalReference: "EU AI Act Art. 12, Art. 26(6)",
      evidenceRequired: "Logging configuration, sample logs și retenție.",
      remediationHint: "Atașează dovada de logging sau marchează gap-ul ca blocant.",
      impactSummary: "Fără logs, nu poți demonstra funcționare, review sau incident handling.",
      ownerSuggestion: "IT security / product owner",
    })
  }

  if (record.department === "legal_compliance" || record.businessProcess === "contract_review" || record.businessProcess === "document_review") {
    specs.push({
      code: "ai_use_case.legal_human_review",
      title: `Confirmă review juridic uman pentru ${name}`,
      detail: "Utilizarea AI produce output juridic/documentar care trebuie verificat de om.",
      category: "EU_AI_ACT",
      severity: "high",
      legalReference: "AI governance, professional responsibility, contract risk",
      evidenceRequired: "SOP review legal, reviewer desemnat și dovadă de aprobare.",
      remediationHint: "Documentează regula că output-ul AI este draft și cere review juridic uman.",
      impactSummary: "Output-ul legal neverificat poate crea risc contractual și de overreliance.",
      ownerSuggestion: "Legal",
    })
  }

  if (hasRealProhibitedFlag(record.prohibitedPracticeFlags)) {
    specs.push({
      code: "ai_use_case.prohibited_candidate_review",
      title: `Blochează și trimite la legal review practica AI suspect interzisă: ${name}`,
      detail: "Importul sau intake-ul indică o posibilă practică interzisă.",
      category: "EU_AI_ACT",
      severity: "critical",
      legalReference: "EU AI Act Art. 5",
      evidenceRequired: "Legal memo, decizie de stop/allow, dovadă dezactivare unde se aplică.",
      remediationHint: "Nu exporta ca aprobat; marchează prohibited candidate și cere review juridic.",
      impactSummary: "Practica interzisă nu poate fi tratată ca simplu warning operațional.",
      ownerSuggestion: "Legal / management",
    })
  }

  if (!specs.some((spec) => spec.code === "ai_use_case.ai_literacy")) {
    specs.push({
      code: "ai_use_case.ai_literacy",
      title: `Pornește / confirmă AI Literacy pentru utilizarea AI: ${name}`,
      detail: "Persoanele care folosesc sau supraveghează AI trebuie să aibă literacy proporțională cu rolul.",
      category: "EU_AI_ACT",
      severity: "medium",
      legalReference: "EU AI Act Art. 4",
      evidenceRequired: "Training roster, conținut, dată, roluri acoperite și confirmări.",
      remediationHint: "Leagă utilizarea AI de programul AI Literacy și colectează dovada.",
      impactSummary: "Fără AI Literacy, organizația nu poate demonstra controlul oamenilor care folosesc AI.",
      ownerSuggestion: "HR / DPO",
    })
  }

  return dedupeFindings(specs.map((spec) => makeFinding(record, spec, nowISO)))
}

export function mergeAIUseCaseFindings(existing: ScanFinding[], generated: ScanFinding[]): ScanFinding[] {
  const byKey = new Map<string, ScanFinding>()
  for (const finding of [...existing, ...generated]) {
    byKey.set(finding.provenance?.ruleId ?? finding.id, finding)
  }
  return [...byKey.values()]
}

function makeFinding(record: AIUseCaseRecord, spec: TriggerSpec, nowISO: string): ScanFinding {
  const id = `ai-use-case-${normalizeAIUseCaseKeyPart(record.id)}-${normalizeAIUseCaseKeyPart(spec.code)}`
  return {
    id,
    title: spec.title,
    detail: spec.detail,
    category: spec.category,
    severity: spec.severity,
    verdictConfidence: "medium",
    verdictConfidenceReason:
      "Draft orchestration generat determinist din Registru AIUseCase. Nu este verdict legal final; necesită review uman.",
    risk: severityToLegacyRisk(spec.severity),
    principles: inferPrinciplesFromCategory(spec.category),
    createdAtISO: nowISO,
    sourceDocument: "ai_use_case_register",
    legalReference: spec.legalReference,
    impactSummary: spec.impactSummary,
    remediationHint: spec.remediationHint,
    ownerSuggestion: spec.ownerSuggestion,
    evidenceRequired: spec.evidenceRequired,
    evidenceTypes: ["document_bundle", "screenshot", "policy_text", "other"],
    findingStatus: "open",
    findingStatusUpdatedAtISO: nowISO,
    reviewState: "unreviewed",
    closeCondition: spec.evidenceRequired,
    requiredEvidenceKinds: ["ai_inventory", "vendor_review", "dpia_decision", "owner_attestation"],
    resolutionLocus: "hybrid",
    resolutionMode: "external_action",
    requiresHumanReview: true,
    resolution: {
      problem: spec.detail,
      impact: spec.impactSummary,
      action: spec.remediationHint,
      humanStep: "Consultantul validează informația importată înainte de verdict sau export.",
      closureEvidence: spec.evidenceRequired,
      revalidation: "Reverifică la modificare de scop, vendor, model, date procesate sau owner.",
    },
    provenance: {
      ruleId: `ai_use_case.${spec.code}`,
      matchedKeyword: spec.code,
      excerpt: spec.title,
      signalSource: "manifest",
      verdictBasis: "direct_signal",
      signalConfidence: "medium",
    },
  }
}

function dedupeFindings(findings: ScanFinding[]) {
  const map = new Map<string, ScanFinding>()
  for (const finding of findings) {
    map.set(finding.provenance?.ruleId ?? finding.id, finding)
  }
  return [...map.values()]
}

function hasTransparencyTrigger(record: AIUseCaseRecord): boolean {
  return (
    record.directInteractionWithPersons === "yes" ||
    record.outputTypes.some((type) =>
      ["chatbot_interaction", "generated_image", "generated_audio", "generated_video"].includes(type)
    )
  )
}

function hasRealProhibitedFlag(flags: AIUseCaseProhibitedPracticeFlag[] = []): boolean {
  return flags.some((flag) => flag !== "none" && flag !== "unknown")
}

function isHighRiskCandidate(record: AIUseCaseRecord): boolean {
  if (record.annexIIIDomain !== "none" && record.annexIIIDomain !== "unknown") return true
  if (isSensitiveDepartment(record.department) && hasPeopleImpact(record)) return true
  if (isSensitiveProcess(record.businessProcess) && hasPeopleImpact(record)) return true
  return false
}

function isSensitiveDepartment(department: AIUseCaseDepartment): boolean {
  return [
    "hr_recruitment",
    "medical_healthcare",
    "education_training",
    "credit_finance",
    "insurance",
    "public_services",
  ].includes(department)
}

function isSensitiveProcess(process: AIUseCaseBusinessProcess): boolean {
  return [
    "recruitment_selection",
    "employee_management",
    "credit_assessment",
    "insurance_pricing",
    "medical_triage",
    "education_assessment",
    "biometric_access",
    "risk_scoring",
  ].includes(process)
}

function hasPeopleImpact(record: AIUseCaseRecord): boolean {
  return (
    record.automatedDecision === "yes" ||
    record.scoringOrRanking === "yes" ||
    record.impactsPeopleRights === "yes" ||
    record.outputTypes.some(isPeopleImpactOutput) ||
    record.autonomyLevel === "ranks_or_scores" ||
    record.autonomyLevel === "semi_automated_action" ||
    record.autonomyLevel === "fully_automated_action"
  )
}

function isPeopleImpactOutput(type: AIUseCaseOutputType): boolean {
  return ["ranking", "scoring", "classification", "automated_decision", "prediction"].includes(type)
}
