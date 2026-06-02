import type {
  AISystemPurpose,
  AISystemRecord,
  AISystemRiskLevel,
  ClientImportDataCertainty,
  ClientImportDiscoveryNeed,
  ClientImportDiscoveryNeedType,
  ClientImportFieldAssessment,
  ClientExpectedAIRole,
  ClientImportSignal,
  ClientImportYesNoUnknown,
  ClientMeta,
  ClientServiceScope,
  ClientStatus,
  DPAStatus,
  LiteracyRecord,
  RopaActivityRecord,
  RopaActivityStatus,
  RopaRiskLevel,
  RopaThirdCountryTransfer,
  ScanFinding,
  VendorAIInputRetention,
  VendorAIModelTransparency,
  VendorAIOutputOwnership,
  VendorAITrainingOptOut,
  VendorRecord,
  VendorRegion,
  VendorReviewStatus,
  VendorRiskLevel,
  VendorRole,
  VendorTransferMechanism,
} from "@/lib/compliance/types"
import {
  inferPrinciplesFromCategory,
  severityToLegacyRisk,
  type ComplianceSeverity,
} from "@/lib/compliance/constitution"
import { classifyAISystem, type AIActRiskLevel } from "@/lib/compliance/ai-act-classifier"

export type ClientImportCanonicalColumn =
  | "companyName"
  | "cui"
  | "contactName"
  | "contactEmail"
  | "phone"
  | "sector"
  | "employees"
  | "city"
  | "country"
  | "serviceScope"
  | "expectedAiRole"
  | "usesAi"
  | "knownAiTools"
  | "personalDataAi"
  | "highRiskSuspected"
  | "assignedTo"
  | "clientStatus"
  | "intakeEmail"
  | "sendIntake"
  | "notes"
  | "tags"
  | "externalId"

export type ClientImportDraft = {
  rowNumber: number
  raw: Record<string, string>
  companyName: string
  cui?: string
  contactName?: string
  contactEmail?: string
  phone?: string
  sector?: string
  employees?: string
  city?: string
  country?: string
  serviceScope: ClientServiceScope[]
  expectedAiRole: ClientExpectedAIRole
  usesAi: ClientImportYesNoUnknown
  knownAiTools: string[]
  personalDataAi: ClientImportYesNoUnknown
  highRiskSuspected: ClientImportYesNoUnknown
  assignedTo?: string
  clientStatus: ClientStatus
  intakeEmail?: string
  sendIntake: boolean
  notes?: string
  tags: string[]
  externalId?: string
  errors: string[]
  warnings: string[]
  duplicateKey?: string
  signals: ClientImportSignal[]
  dataCertainty: ClientImportDataCertainty
}

export type ClientImportParseResult = {
  headers: string[]
  delimiter: "," | ";" | "\t"
  mappedColumns: Partial<Record<ClientImportCanonicalColumn, string>>
  unmappedHeaders: string[]
  rows: ClientImportDraft[]
  totalRows: number
  validRows: number
  errorRows: number
  warningRows: number
}

export type ImportCenterTabId = "clients" | "ai_systems" | "vendors_models" | "ropa" | "ai_literacy"

export type ImportCenterTab = {
  id: ImportCenterTabId
  label: string
  description: string
  status: "active" | "planned"
  sourceHint: string
}

export const IMPORT_CENTER_TABS: ImportCenterTab[] = [
  {
    id: "clients",
    label: "Clienți",
    description: "Bulk onboarding de firme, contacte, scope și semnale proactive.",
    status: "active",
    sourceHint: "CRM, billing, Excel intern, listă cabinet",
  },
  {
    id: "ai_systems",
    label: "Sisteme AI",
    description: "Inventar de chatboturi, copilots, agenți, automatizări și tool-uri AI.",
    status: "active",
    sourceHint: "Intake client, export IT, procurement, spreadsheet intern",
  },
  {
    id: "vendors_models",
    label: "Furnizori / modele",
    description: "Vendor, model, DPA, subprocesatori, limitări și instrucțiuni de utilizare.",
    status: "active",
    sourceHint: "Contracte, invoices, admin console, model registry",
  },
  {
    id: "ropa",
    label: "RoPA / date",
    description: "Fluxuri de date, rol GDPR, bază legală, retenție și DPIA trigger.",
    status: "active",
    sourceHint: "RoPA existent, DPIA vechi, data map, policy pack",
  },
  {
    id: "ai_literacy",
    label: "AI Literacy",
    description: "Persoane, roluri, training, acknowledgement și dovadă Art. 4.",
    status: "active",
    sourceHint: "HR export, LMS, attendance sheet, policy acknowledgements",
  },
]

const COLUMN_ALIASES: Record<ClientImportCanonicalColumn, string[]> = {
  companyName: [
    "company_name",
    "company name",
    "company",
    "org_name",
    "org name",
    "nume firma",
    "nume firmă",
    "firma",
    "firmă",
    "client",
    "organizatie",
    "organizație",
    "denumire",
    "denumire firma",
  ],
  cui: ["cui", "cif", "cod fiscal", "cod_fiscal", "tax id", "tax_id", "vat", "vat number"],
  contactName: ["contact_name", "contact name", "persoana contact", "nume contact", "contact"],
  contactEmail: ["contact_email", "contact email", "email", "e-mail", "mail", "email contact"],
  phone: ["phone", "telefon", "tel", "mobile", "mobil"],
  sector: ["sector", "industrie", "industry", "domeniu", "caen", "activitate"],
  employees: ["employees", "employee_count", "nr angajati", "numar angajati", "angajati", "salariati"],
  city: ["city", "oras", "oraș", "localitate"],
  country: ["country", "tara", "țara", "ro"],
  serviceScope: ["service_scope", "scope", "servicii", "serviciu", "pachet", "module"],
  expectedAiRole: ["expected_ai_role", "ai_role", "role", "rol ai", "rol", "rol estimat"],
  usesAi: ["uses_ai", "ai used", "foloseste ai", "folosește ai", "utilizeaza ai", "utilizează ai"],
  knownAiTools: ["known_ai_tools", "ai_tools", "tools", "instrumente ai", "tooluri ai", "sisteme ai"],
  personalDataAi: [
    "personal_data_ai",
    "date personale ai",
    "date personale",
    "personal data",
    "gdpr ai",
  ],
  highRiskSuspected: [
    "high_risk_suspected",
    "high risk",
    "risc ridicat",
    "high-risk",
    "suspect high risk",
  ],
  assignedTo: ["assigned_to", "owner", "responsabil", "consultant", "dpo"],
  clientStatus: ["client_status", "status", "stare", "etapa"],
  intakeEmail: ["intake_email", "email intake", "email onboarding", "onboarding_email"],
  sendIntake: ["send_intake", "trimite intake", "send intake", "magic link", "trimite link"],
  notes: ["notes", "note", "observatii", "observații", "comentarii"],
  tags: ["tags", "taguri", "etichete"],
  externalId: ["external_id", "id extern", "id", "client_id", "cod client"],
}

export type AISystemImportCanonicalColumn =
  | "clientOrgId"
  | "clientExternalId"
  | "clientCui"
  | "clientName"
  | "systemName"
  | "useCaseName"
  | "department"
  | "businessProcess"
  | "purpose"
  | "vendor"
  | "modelType"
  | "usesPersonalData"
  | "confidentialData"
  | "makesAutomatedDecisions"
  | "impactsRights"
  | "hasHumanReview"
  | "publicOutput"
  | "affectedPersons"
  | "owner"
  | "stage"
  | "notes"
  | "tags"
  | "externalId"

export type AISystemImportClientMatcher =
  | { type: "orgId"; value: string }
  | { type: "externalId"; value: string }
  | { type: "cui"; value: string }
  | { type: "name"; value: string }

export type AISystemImportDraft = {
  rowNumber: number
  raw: Record<string, string>
  clientOrgId?: string
  clientExternalId?: string
  clientCui?: string
  clientName?: string
  clientMatcher?: AISystemImportClientMatcher
  systemName: string
  useCaseName?: string
  department?: string
  businessProcess?: string
  purpose: AISystemPurpose
  purposeRaw?: string
  vendor?: string
  modelType?: string
  usesPersonalDataAnswer: ClientImportYesNoUnknown
  confidentialDataAnswer: ClientImportYesNoUnknown
  automatedDecisionsAnswer: ClientImportYesNoUnknown
  impactsRightsAnswer: ClientImportYesNoUnknown
  humanReviewAnswer: ClientImportYesNoUnknown
  publicOutputAnswer: ClientImportYesNoUnknown
  affectedPersons: string[]
  usesPersonalData: boolean
  makesAutomatedDecisions: boolean
  impactsRights: boolean
  hasHumanReview: boolean
  owner?: string
  stage?: string
  notes?: string
  tags: string[]
  externalId?: string
  errors: string[]
  warnings: string[]
  duplicateKey?: string
}

export type AISystemImportParseResult = {
  headers: string[]
  delimiter: "," | ";" | "\t"
  mappedColumns: Partial<Record<AISystemImportCanonicalColumn, string>>
  unmappedHeaders: string[]
  rows: AISystemImportDraft[]
  totalRows: number
  validRows: number
  errorRows: number
  warningRows: number
}

const AI_SYSTEM_COLUMN_ALIASES: Record<AISystemImportCanonicalColumn, string[]> = {
  clientOrgId: ["client_org_id", "org_id", "organization_id", "id organizatie", "id organizație"],
  clientExternalId: [
    "client_external_id",
    "external_id_client",
    "client_id",
    "cod client",
    "id client",
  ],
  clientCui: ["client_cui", "cui client", "cif client", "cod fiscal client", "cui"],
  clientName: [
    "client_name",
    "company_name",
    "company",
    "nume firma",
    "nume firmă",
    "firma",
    "firmă",
    "client",
  ],
  systemName: [
    "system_name",
    "ai_system_name",
    "ai system",
    "nume sistem",
    "sistem ai",
    "tool",
    "tool ai",
    "automatizare",
    "agent",
  ],
  useCaseName: ["use_case", "use case", "use_case_name", "utilizare ai", "caz utilizare"],
  department: ["department", "departament", "echipa", "echipă"],
  businessProcess: ["business_process", "process", "proces business", "proces"],
  purpose: ["purpose", "intended_purpose", "scop", "descriere scop"],
  vendor: ["vendor", "vendor_name", "provider", "furnizor", "platforma", "platformă"],
  modelType: ["model_type", "model", "model_name", "tip model", "model ai", "llm"],
  usesPersonalData: [
    "uses_personal_data",
    "personal_data",
    "date personale",
    "date personale ai",
    "prelucreaza date",
    "prelucrează date",
  ],
  confidentialData: [
    "confidential_data",
    "client_data",
    "date confidentiale",
    "date confidențiale",
    "date client",
  ],
  makesAutomatedDecisions: [
    "automated_decision",
    "automated_decisions",
    "decizii automate",
    "adm",
    "scoring",
    "decizie automata",
    "decizie automată",
  ],
  impactsRights: ["impacts_rights", "impact drepturi", "efect juridic", "rights impact", "impact persoane"],
  hasHumanReview: [
    "human_review",
    "human oversight",
    "review uman",
    "supraveghere umana",
    "supraveghere umană",
  ],
  publicOutput: ["public_output", "output public", "public", "ajunge public"],
  affectedPersons: ["affected_persons", "persoane afectate", "data_subjects", "persoane"],
  owner: ["owner", "owner_email", "owner email", "responsabil", "product owner", "dpo", "manager"],
  stage: ["stage", "status", "etapa", "stadiu"],
  notes: ["notes", "note", "observatii", "observații", "comentarii"],
  tags: ["tags", "taguri", "etichete"],
  externalId: ["external_id", "system_external_id", "id sistem", "cod sistem"],
}

type ImportClientMatcher = AISystemImportClientMatcher

type SharedClientImportColumns =
  | "clientOrgId"
  | "clientExternalId"
  | "clientCui"
  | "clientName"

export type VendorModelImportCanonicalColumn =
  | SharedClientImportColumns
  | "vendorName"
  | "legalEntity"
  | "productUsed"
  | "region"
  | "role"
  | "serviceCategory"
  | "dpaStatus"
  | "transferMechanism"
  | "subprocessors"
  | "iso27001"
  | "soc2"
  | "trainingOnCustomerData"
  | "inputRetention"
  | "modelTransparency"
  | "contactEmail"
  | "personalData"
  | "notes"
  | "externalId"

export type VendorModelImportDraft = {
  rowNumber: number
  raw: Record<string, string>
  clientOrgId?: string
  clientExternalId?: string
  clientCui?: string
  clientName?: string
  clientMatcher?: ImportClientMatcher
  vendorName: string
  legalEntity?: string
  productUsed: string
  vendorRegion: VendorRegion
  role: VendorRole
  serviceCategory?: string
  dpaStatus: DPAStatus
  transferMechanism: VendorTransferMechanism
  subprocessors: string[]
  iso27001: boolean
  soc2: boolean
  trainingDataOptOut: VendorAITrainingOptOut
  inputDataRetention: VendorAIInputRetention
  modelTransparency: VendorAIModelTransparency
  contactEmail?: string
  personalData: ClientImportYesNoUnknown
  notes?: string
  externalId?: string
  errors: string[]
  warnings: string[]
  duplicateKey?: string
}

export type VendorModelImportParseResult = {
  headers: string[]
  delimiter: "," | ";" | "\t"
  mappedColumns: Partial<Record<VendorModelImportCanonicalColumn, string>>
  unmappedHeaders: string[]
  rows: VendorModelImportDraft[]
  totalRows: number
  validRows: number
  errorRows: number
  warningRows: number
}

export type RopaImportCanonicalColumn =
  | SharedClientImportColumns
  | "department"
  | "activityName"
  | "owner"
  | "purpose"
  | "dataSubjects"
  | "dataCategories"
  | "specialCategories"
  | "legalBasis"
  | "article9Condition"
  | "recipients"
  | "processors"
  | "systems"
  | "retention"
  | "securityMeasures"
  | "thirdCountryTransfers"
  | "notes"
  | "externalId"

export type RopaImportDraft = {
  rowNumber: number
  raw: Record<string, string>
  clientOrgId?: string
  clientExternalId?: string
  clientCui?: string
  clientName?: string
  clientMatcher?: ImportClientMatcher
  department?: string
  activityName: string
  owner?: string
  purpose: string
  dataSubjects: string[]
  dataCategories: string[]
  specialCategories: string[]
  legalBasis?: string
  article9Condition?: string
  recipients: string[]
  processors: string[]
  systems: string[]
  retention?: string
  securityMeasures: string[]
  thirdCountryTransfers: RopaThirdCountryTransfer[]
  notes?: string
  externalId?: string
  errors: string[]
  warnings: string[]
  duplicateKey?: string
}

export type RopaImportParseResult = {
  headers: string[]
  delimiter: "," | ";" | "\t"
  mappedColumns: Partial<Record<RopaImportCanonicalColumn, string>>
  unmappedHeaders: string[]
  rows: RopaImportDraft[]
  totalRows: number
  validRows: number
  errorRows: number
  warningRows: number
}

export type LiteracyImportCanonicalColumn =
  | SharedClientImportColumns
  | "employeeName"
  | "role"
  | "trainingDate"
  | "trainingType"
  | "topics"
  | "trainer"
  | "durationHours"
  | "attestationSigned"
  | "notes"
  | "externalId"

export type LiteracyImportDraft = {
  rowNumber: number
  raw: Record<string, string>
  clientOrgId?: string
  clientExternalId?: string
  clientCui?: string
  clientName?: string
  clientMatcher?: ImportClientMatcher
  employeeName: string
  role: string
  trainingDate: string
  trainingType: LiteracyRecord["trainingType"]
  topics: string[]
  trainer?: string
  durationHours: number
  attestationSigned: boolean
  notes?: string
  externalId?: string
  errors: string[]
  warnings: string[]
  duplicateKey?: string
}

export type LiteracyImportParseResult = {
  headers: string[]
  delimiter: "," | ";" | "\t"
  mappedColumns: Partial<Record<LiteracyImportCanonicalColumn, string>>
  unmappedHeaders: string[]
  rows: LiteracyImportDraft[]
  totalRows: number
  validRows: number
  errorRows: number
  warningRows: number
}

const SHARED_CLIENT_COLUMN_ALIASES: Record<SharedClientImportColumns, string[]> = {
  clientOrgId: ["client_org_id", "org_id", "organization_id", "id organizatie", "id organizație"],
  clientExternalId: [
    "client_external_id",
    "external_id_client",
    "client_id",
    "cod client",
    "id client",
  ],
  clientCui: ["client_cui", "cui client", "cif client", "cod fiscal client", "cui"],
  clientName: [
    "client_name",
    "company_name",
    "company",
    "nume firma",
    "nume firmă",
    "firma",
    "firmă",
    "client",
  ],
}

const VENDOR_MODEL_COLUMN_ALIASES: Record<VendorModelImportCanonicalColumn, string[]> = {
  ...SHARED_CLIENT_COLUMN_ALIASES,
  vendorName: ["vendor_name", "vendor", "provider", "furnizor", "nume furnizor"],
  legalEntity: ["legal_entity", "entitate juridica", "entitate juridică", "societate furnizor"],
  productUsed: ["product_used", "product_name", "product", "produs", "tool", "sistem", "model", "serviciu"],
  region: ["region", "vendor_region", "data_region", "regiune", "tara furnizor", "țara furnizor", "country"],
  role: ["role", "vendor_role", "rol", "rol gdpr", "processor role"],
  serviceCategory: ["service_category", "categorie", "tip serviciu"],
  dpaStatus: ["dpa_status", "status dpa", "dpa", "acord prelucrare", "contract date"],
  transferMechanism: [
    "transfer_mechanism",
    "mecanism transfer",
    "transfer",
    "scc",
    "transferuri",
  ],
  subprocessors: ["subprocessors", "subprocesatori", "sub-processors", "subprocessor list"],
  iso27001: ["iso27001", "iso 27001", "iso"],
  soc2: ["soc2", "soc 2", "soc"],
  trainingOnCustomerData: [
    "training_on_customer_data",
    "training_opt_out",
    "training data",
    "antrenare date client",
    "foloseste date training",
    "folosește date training",
  ],
  inputRetention: ["input_retention", "retentie input", "retenție input", "data retention"],
  modelTransparency: ["model_transparency", "transparenta model", "transparență model", "model card"],
  contactEmail: ["contact_email", "owner_email", "email", "email furnizor", "dpa email"],
  personalData: ["personal_data", "date personale", "date personale ai"],
  notes: ["notes", "note", "observatii", "observații"],
  externalId: ["external_id", "vendor_external_id", "id furnizor"],
}

const ROPA_COLUMN_ALIASES: Record<RopaImportCanonicalColumn, string[]> = {
  ...SHARED_CLIENT_COLUMN_ALIASES,
  department: ["department", "departament", "functie", "funcție"],
  activityName: ["activity_name", "process_name", "activitate", "nume activitate", "proces", "processing activity"],
  owner: ["owner", "responsabil", "dpo", "manager"],
  purpose: ["purpose", "scop", "scop prelucrare"],
  dataSubjects: ["data_subjects", "persoane vizate", "data subjects", "categorii persoane"],
  dataCategories: ["data_categories", "personal_data_categories", "categorii date", "date", "personal data categories"],
  specialCategories: ["special_categories", "categorii speciale", "art 9", "date speciale"],
  legalBasis: ["legal_basis", "temei juridic", "baza legala", "bază legală"],
  article9Condition: ["article9_condition", "conditie art 9", "condiție art 9"],
  recipients: ["recipients", "destinatari", "recipienți"],
  processors: ["processors", "processor_vendor", "imputerniciti", "împuterniciți", "subprocesatori", "furnizori"],
  systems: ["systems", "sisteme", "tooluri", "tools", "sisteme ai"],
  retention: ["retention", "retenție", "retentie", "pastrare", "păstrare"],
  securityMeasures: ["security_measures", "masuri securitate", "măsuri securitate", "tom"],
  thirdCountryTransfers: [
    "third_country_transfers",
    "transferuri tari terte",
    "transferuri țări terțe",
    "transferuri",
  ],
  notes: ["notes", "note", "observatii", "observații"],
  externalId: ["external_id", "ropa_external_id", "id activitate"],
}

const LITERACY_COLUMN_ALIASES: Record<LiteracyImportCanonicalColumn, string[]> = {
  ...SHARED_CLIENT_COLUMN_ALIASES,
  employeeName: ["employee_name", "person_name", "nume persoana", "nume persoană", "angajat", "participant"],
  role: ["role", "rol", "functie", "funcție", "job title"],
  trainingDate: ["training_date", "completion_date", "data training", "data curs", "date"],
  trainingType: ["training_type", "tip training", "tip curs", "format", "ai_user_level"],
  topics: ["topics", "subiecte", "module", "topics_covered", "continut", "conținut"],
  trainer: ["trainer", "lector", "formator", "trainer_name"],
  durationHours: ["duration_hours", "ore", "durata", "durată", "hours"],
  attestationSigned: [
    "attestation_signed",
    "training_completed",
    "semnat",
    "policy signed",
    "acknowledgement",
    "confirmare",
  ],
  notes: ["notes", "note", "observatii", "observații"],
  externalId: ["external_id", "person_external_id", "id persoana", "employee_id"],
}

const SERVICE_SCOPE_ALIASES: Record<string, ClientServiceScope> = {
  ai_act: "ai_act",
  aiact: "ai_act",
  "ai act": "ai_act",
  "eu ai act": "ai_act",
  gdpr: "gdpr",
  ai_literacy: "ai_literacy",
  "ai literacy": "ai_literacy",
  literacy: "ai_literacy",
  alfabetizare: "ai_literacy",
  audit_pack: "audit_pack",
  "audit pack": "audit_pack",
  dosar: "audit_pack",
}

const ROLE_ALIASES: Record<string, ClientExpectedAIRole> = {
  deployer: "deployer",
  utilizator: "deployer",
  beneficiar: "deployer",
  provider: "provider",
  furnizor: "provider",
  builder: "builder",
  integrator: "builder",
  agency: "builder",
  agentie: "builder",
  agenție: "builder",
  unknown: "unknown",
  necunoscut: "unknown",
}

const STATUS_ALIASES: Record<string, ClientStatus> = {
  lead: "lead",
  prospect: "lead",
  active: "active",
  activ: "active",
  paused: "paused",
  pauza: "paused",
  pauză: "paused",
  archived: "archived",
  arhivat: "archived",
}

const AI_SYSTEM_PURPOSE_ALIASES: Record<string, AISystemPurpose> = {
  "hr screening": "hr-screening",
  recrutare: "hr-screening",
  recruitment: "hr-screening",
  "screening cv": "hr-screening",
  "ranking candidati": "hr-screening",
  "interviuri video": "hr-screening",
  candidati: "hr-screening",
  candidates: "hr-screening",
  "credit scoring": "credit-scoring",
  creditare: "credit-scoring",
  scoring: "credit-scoring",
  "biometric identification": "biometric-identification",
  biometrie: "biometric-identification",
  "identificare faciala": "biometric-identification",
  "fraud detection": "fraud-detection",
  frauda: "fraud-detection",
  fraud: "fraud-detection",
  aml: "fraud-detection",
  "marketing personalization": "marketing-personalization",
  marketing: "marketing-personalization",
  personalizare: "marketing-personalization",
  campanii: "marketing-personalization",
  reclame: "marketing-personalization",
  "descrieri produse": "marketing-personalization",
  "emailuri promotionale": "marketing-personalization",
  "support chatbot": "support-chatbot",
  chatbot: "support-chatbot",
  "suport clienti": "support-chatbot",
  support: "support-chatbot",
  "decision support": "decision-support",
  "suport decizional": "decision-support",
  crm: "decision-support",
  "follow up": "decision-support",
  followup: "decision-support",
  "actualizeaza crm": "decision-support",
  "actualizeaza campuri": "decision-support",
  "campuri crm": "decision-support",
  "triere simptome": "decision-support",
  "pre triere": "decision-support",
  simptome: "decision-support",
  programare: "decision-support",
  consultatie: "decision-support",
  consultație: "decision-support",
  irigatii: "decision-support",
  irigatie: "decision-support",
  irigare: "decision-support",
  drone: "decision-support",
  "imagini drone": "decision-support",
  "scorare credit": "credit-scoring",
  creditworthiness: "credit-scoring",
  "scor intern": "credit-scoring",
  "document assistant": "document-assistant",
  documente: "document-assistant",
  copilot: "document-assistant",
  "contract assistant": "document-assistant",
  transcriere: "document-assistant",
  sumarizare: "document-assistant",
  contracte: "document-assistant",
  deepfake: "image-manipulation-intimate",
  nudifier: "image-manipulation-intimate",
  "image manipulation intimate": "image-manipulation-intimate",
  other: "other",
  necunoscut: "other",
}

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
}

function findingIdPart(value: string | undefined): string {
  const normalized = normalizeText(value ?? "")
  return normalized.replace(/\s+/g, "-").slice(0, 48) || "client"
}

function clean(value: unknown, maxLength = 500): string | undefined {
  if (typeof value !== "string") return undefined
  const trimmed = value.trim()
  if (!trimmed) return undefined
  return trimmed.slice(0, maxLength)
}

export function normalizeCui(value: unknown): string | undefined {
  const raw = clean(value, 32)
  if (!raw) return undefined
  const normalized = raw.toUpperCase().replace(/\s/g, "")
  return /^(RO)?\d{2,10}$/.test(normalized) ? normalized : undefined
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

function normalizeYesNo(value: unknown): ClientImportYesNoUnknown {
  const raw = clean(value, 40)
  if (!raw) return "unknown"
  const key = normalizeText(raw)
  if (["yes", "y", "da", "true", "1"].includes(key)) return "yes"
  if (["no", "n", "nu", "false", "0"].includes(key)) return "no"
  return "unknown"
}

function normalizeReviewPresence(value: unknown): ClientImportYesNoUnknown {
  const raw = clean(value, 80)
  if (!raw) return "unknown"
  const key = normalizeText(raw)
  if (
    [
      "required before action",
      "required_before_action",
      "required after output",
      "required_after_output",
      "sample review",
      "sample_review",
      "optional",
      "provider defined",
      "provider_defined",
      "escalation only",
      "escalation_only",
      "two person verification",
      "two_person_verification",
      "yes",
      "y",
      "da",
      "true",
      "1",
    ].includes(key)
  ) {
    return "yes"
  }
  if (["none", "no", "n", "nu", "false", "0"].includes(key)) return "no"
  return "unknown"
}

function normalizeBoolean(value: unknown): boolean {
  return normalizeYesNo(value) === "yes"
}

function splitList(value: unknown): string[] {
  const raw = clean(value, 1000)
  if (!raw) return []
  return raw
    .split(/[;,|]/g)
    .map((item) => item.trim())
    .filter(Boolean)
}

function normalizeServiceScope(value: unknown): ClientServiceScope[] {
  const scopes = splitList(value)
    .map((item) => SERVICE_SCOPE_ALIASES[normalizeText(item)])
    .filter((item): item is ClientServiceScope => Boolean(item))
  return [...new Set(scopes)]
}

function normalizeRole(value: unknown): ClientExpectedAIRole {
  const raw = clean(value, 80)
  if (!raw) return "unknown"
  return ROLE_ALIASES[normalizeText(raw)] ?? "unknown"
}

function normalizeStatus(value: unknown): ClientStatus {
  const raw = clean(value, 80)
  if (!raw) return "lead"
  return STATUS_ALIASES[normalizeText(raw)] ?? "lead"
}

function normalizeAISystemPurpose(value: unknown): AISystemPurpose {
  const raw = clean(value, 200)
  if (!raw) return "other"
  const key = normalizeText(raw)
  if (AI_SYSTEM_PURPOSE_ALIASES[key]) return AI_SYSTEM_PURPOSE_ALIASES[key]

  for (const [needle, purpose] of Object.entries(AI_SYSTEM_PURPOSE_ALIASES)) {
    if (needle !== "other" && key.includes(needle)) return purpose
  }

  return "other"
}

function resolveAISystemPurpose(...candidates: Array<unknown>): AISystemPurpose {
  let fallback: AISystemPurpose = "other"

  for (const candidate of candidates) {
    const purpose = normalizeAISystemPurpose(candidate)
    if (purpose !== "other") return purpose
    if (fallback === "other" && clean(candidate, 200)) fallback = purpose
  }

  return fallback
}

function mapAIActRiskToSystemRisk(level: AIActRiskLevel): AISystemRiskLevel {
  if (level === "high_risk" || level === "prohibited") return "high"
  if (level === "limited_risk") return "limited"
  return "minimal"
}

function normalizeVendorRegion(value: unknown): VendorRegion {
  const raw = clean(value, 80)
  if (!raw) return "unknown"
  const key = normalizeText(raw)
  if (["eu", "ue", "eea", "see", "romania", "ro"].includes(key)) return "EU"
  if (["us", "usa", "united states", "sua"].includes(key)) return "US"
  if (["uk", "gb", "united kingdom", "marea britanie"].includes(key)) return "UK"
  if (["unknown", "necunoscut", "n a"].includes(key)) return "unknown"
  return "other"
}

function normalizeVendorRole(value: unknown): VendorRole {
  const raw = clean(value, 80)
  if (!raw) return "processor"
  const key = normalizeText(raw)
  if (["controller", "operator", "operator independent"].includes(key)) return "controller"
  if (["joint controller", "operator asociat", "operatori asociati"].includes(key)) return "joint_controller"
  if (["subprocessor", "subprocesator", "sub processor"].includes(key)) return "subprocessor"
  return "processor"
}

function normalizeDpaStatus(value: unknown): DPAStatus {
  const raw = clean(value, 80)
  if (!raw) return "missing"
  const key = normalizeText(raw)
  if (["not required", "not_required", "nu necesita", "nu necesita dpa", "n a"].includes(key)) {
    return "not_required"
  }
  if (["signed", "semnat", "executat", "valid"].includes(key)) return "signed"
  if (["draft", "draft received", "primit", "draft primit"].includes(key)) return "draft_received"
  if (["negotiating", "negociere", "in negociere"].includes(key)) return "negotiating"
  if (["expired", "expirat"].includes(key)) return "expired"
  return "missing"
}

function normalizeTransferMechanism(value: unknown): VendorTransferMechanism {
  const raw = clean(value, 120)
  if (!raw) return "unknown"
  const key = normalizeText(raw)
  if (["none", "nu", "no", "fara", "fara transfer", "no transfer"].includes(key)) return "none"
  if (["adequacy", "adequacy decision", "decizie adecvare"].includes(key)) return "adequacy_decision"
  if (["scc", "scc cp", "scc controller processor", "scc controller_processor", "scc_controller_processor"].includes(key)) {
    return "scc_controller_processor"
  }
  if (["scc pp", "scc processor processor", "scc_processor_processor"].includes(key)) {
    return "scc_processor_processor"
  }
  if (["bcr", "binding corporate rules"].includes(key)) return "bcr"
  if (["art 49", "derogation", "derogare", "derogation art 49"].includes(key)) return "derogation_art_49"
  return "unknown"
}

function normalizeTrainingOptOutFromCustomerTraining(value: unknown): VendorAITrainingOptOut {
  const answer = normalizeYesNo(value)
  if (answer === "yes") return "no"
  if (answer === "no") return "yes"
  return "unknown"
}

function normalizeTrainingOptOut(value: unknown): VendorAITrainingOptOut {
  const answer = normalizeYesNo(value)
  if (answer === "yes") return "yes"
  if (answer === "no") return "no"
  return "unknown"
}

function normalizeInputRetention(value: unknown): VendorAIInputRetention {
  const raw = clean(value, 80)
  if (!raw) return "unknown"
  const key = normalizeText(raw)
  if (["none", "no retention", "fara retentie", "fara retenție", "zero"].includes(key)) return "no_retention"
  if (["session", "session only", "sesiune"].includes(key)) return "session_only"
  if (["30", "30 days", "days 30", "30 zile"].includes(key)) return "days_30"
  if (["indefinite", "nelimitat", "permanent"].includes(key)) return "indefinite"
  return "unknown"
}

function normalizeModelTransparency(value: unknown): VendorAIModelTransparency {
  const raw = clean(value, 80)
  if (!raw) return "unknown"
  const key = normalizeText(raw)
  if (["documented", "documentat", "model card", "full"].includes(key)) return "documented"
  if (["partial", "partiala", "parțială", "partially"].includes(key)) return "partial"
  if (["opaque", "opac", "black box"].includes(key)) return "opaque"
  return "unknown"
}

function normalizeTrainingType(value: unknown): LiteracyRecord["trainingType"] {
  const raw = clean(value, 80)
  if (!raw) return "platforma-online"
  const key = normalizeText(raw)
  if (["intern", "internal", "in house", "in-house"].includes(key)) return "intern"
  if (["extern", "external", "provider", "furnizor"].includes(key)) return "extern"
  if (["workshop", "atelier"].includes(key)) return "workshop"
  return "platforma-online"
}

function normalizeDateValue(value: unknown): string | undefined {
  const raw = clean(value, 40)
  if (!raw) return undefined
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw
  const match = raw.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/)
  if (!match) return undefined
  const [, dd, mm, yyyy] = match
  return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`
}

function parseNumberValue(value: unknown, fallback = 0): number {
  const raw = clean(value, 40)
  if (!raw) return fallback
  const number = Number(raw.replace(",", "."))
  return Number.isFinite(number) ? number : fallback
}

function parseThirdCountryTransfers(value: unknown): RopaThirdCountryTransfer[] {
  return splitList(value).map((item) => {
    const [countryRaw, mechanismRaw] = item.split(/[:=]/)
    return {
      country: (countryRaw ?? "").trim(),
      mechanism: clean(mechanismRaw, 80),
    }
  }).filter((transfer) => transfer.country)
}

function randomImportId(prefix: string): string {
  const bytes = new Uint8Array(6)
  globalThis.crypto?.getRandomValues?.(bytes)
  const suffix = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")
  return `${prefix}-${suffix || Math.random().toString(36).slice(2, 10)}`
}

function parseLine(line: string, delimiter: "," | ";" | "\t"): string[] {
  const cells: string[] = []
  let current = ""
  let quoted = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const next = line[i + 1]
    if (char === '"' && quoted && next === '"') {
      current += '"'
      i++
    } else if (char === '"') {
      quoted = !quoted
    } else if (char === delimiter && !quoted) {
      cells.push(current.trim())
      current = ""
    } else {
      current += char
    }
  }
  cells.push(current.trim())
  return cells
}

function detectDelimiter(firstLine: string): "," | ";" | "\t" {
  const candidates: Array<"," | ";" | "\t"> = ["\t", ";", ","]
  return candidates
    .map((delimiter) => ({ delimiter, count: parseLine(firstLine, delimiter).length }))
    .sort((a, b) => b.count - a.count)[0]?.delimiter ?? ","
}

function detectMapping(headers: string[]): Partial<Record<ClientImportCanonicalColumn, number>> {
  const mapping: Partial<Record<ClientImportCanonicalColumn, number>> = {}
  const used = new Set<number>()
  for (const column of Object.keys(COLUMN_ALIASES) as ClientImportCanonicalColumn[]) {
    const aliases = COLUMN_ALIASES[column].map(normalizeText)
    const index = headers.findIndex((header, i) => !used.has(i) && aliases.includes(normalizeText(header)))
    if (index >= 0) {
      mapping[column] = index
      used.add(index)
    }
  }
  if (mapping.companyName === undefined && headers.length > 0) {
    mapping.companyName = 0
  }
  return mapping
}

function detectAISystemMapping(headers: string[]): Partial<Record<AISystemImportCanonicalColumn, number>> {
  const mapping: Partial<Record<AISystemImportCanonicalColumn, number>> = {}
  const used = new Set<number>()
  for (const column of Object.keys(AI_SYSTEM_COLUMN_ALIASES) as AISystemImportCanonicalColumn[]) {
    const aliases = AI_SYSTEM_COLUMN_ALIASES[column].map(normalizeText)
    const index = headers.findIndex((header, i) => !used.has(i) && aliases.includes(normalizeText(header)))
    if (index >= 0) {
      mapping[column] = index
      used.add(index)
    }
  }
  return mapping
}

function detectImportMapping<T extends string>(
  headers: string[],
  aliasesByColumn: Record<T, string[]>
): Partial<Record<T, number>> {
  const mapping: Partial<Record<T, number>> = {}
  const used = new Set<number>()
  for (const column of Object.keys(aliasesByColumn) as T[]) {
    const aliases = aliasesByColumn[column].map(normalizeText)
    const index = headers.findIndex((header, i) => !used.has(i) && aliases.includes(normalizeText(header)))
    if (index >= 0) {
      mapping[column] = index
      used.add(index)
    }
  }
  return mapping
}

function cell(
  values: string[],
  mapping: Partial<Record<ClientImportCanonicalColumn, number>>,
  column: ClientImportCanonicalColumn
): string | undefined {
  const index = mapping[column]
  if (typeof index !== "number") return undefined
  return clean(values[index])
}

function aiCell(
  values: string[],
  mapping: Partial<Record<AISystemImportCanonicalColumn, number>>,
  column: AISystemImportCanonicalColumn
): string | undefined {
  const index = mapping[column]
  if (typeof index !== "number") return undefined
  return clean(values[index])
}

function importCell<T extends string>(
  values: string[],
  mapping: Partial<Record<T, number>>,
  column: T
): string | undefined {
  const index = mapping[column]
  if (typeof index !== "number") return undefined
  return clean(values[index])
}

function resolveAISystemClientMatcher(input: {
  clientOrgId?: string
  clientExternalId?: string
  clientCui?: string
  clientName?: string
}): AISystemImportClientMatcher | undefined {
  if (input.clientOrgId) return { type: "orgId", value: input.clientOrgId }
  if (input.clientExternalId) return { type: "externalId", value: input.clientExternalId }
  if (input.clientCui) return { type: "cui", value: input.clientCui }
  if (input.clientName) return { type: "name", value: input.clientName }
  return undefined
}

function readSharedClientMatcher<T extends SharedClientImportColumns>(
  values: string[],
  mapping: Partial<Record<T, number>>
): {
  clientOrgId?: string
  clientExternalId?: string
  clientCui?: string
  clientCuiRaw?: string
  clientName?: string
  clientMatcher?: ImportClientMatcher
} {
  const clientOrgId = importCell(values, mapping, "clientOrgId" as T)
  const clientExternalId = importCell(values, mapping, "clientExternalId" as T)
  const clientCuiRaw = importCell(values, mapping, "clientCui" as T)
  const clientCui = normalizeCui(clientCuiRaw)
  const clientName = importCell(values, mapping, "clientName" as T)
  return {
    clientOrgId,
    clientExternalId,
    clientCui,
    clientCuiRaw,
    clientName,
    clientMatcher: resolveAISystemClientMatcher({
      clientOrgId,
      clientExternalId,
      clientCui,
      clientName,
    }),
  }
}

function emptyParseResult<TColumn extends string, TRow>(
  delimiter: "," | ";" | "\t" = ","
): {
  headers: string[]
  delimiter: "," | ";" | "\t"
  mappedColumns: Partial<Record<TColumn, string>>
  unmappedHeaders: string[]
  rows: TRow[]
  totalRows: number
  validRows: number
  errorRows: number
  warningRows: number
} {
  return {
    headers: [],
    delimiter,
    mappedColumns: {},
    unmappedHeaders: [],
    rows: [],
    totalRows: 0,
    validRows: 0,
    errorRows: 0,
    warningRows: 0,
  }
}

function summarizeParseResult<TColumn extends string, TRow extends { errors: string[]; warnings: string[] }>(
  input: {
    headers: string[]
    delimiter: "," | ";" | "\t"
    mapping: Partial<Record<TColumn, number>>
    rows: TRow[]
  }
) {
  const usedHeaders = new Set(
    Object.values(input.mapping).filter((value): value is number => typeof value === "number")
  )
  const mappedColumns = Object.fromEntries(
    Object.entries(input.mapping).map(([key, value]) => [
      key,
      typeof value === "number" ? input.headers[value] : "",
    ])
  ) as Partial<Record<TColumn, string>>
  const unmappedHeaders = input.headers.filter((_, index) => !usedHeaders.has(index))
  return {
    headers: input.headers,
    delimiter: input.delimiter,
    mappedColumns,
    unmappedHeaders,
    rows: input.rows,
    totalRows: input.rows.length,
    validRows: input.rows.filter((row) => row.errors.length === 0).length,
    errorRows: input.rows.filter((row) => row.errors.length > 0).length,
    warningRows: input.rows.filter((row) => row.warnings.length > 0).length,
  }
}

function hasMeaningfulValue(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === "boolean") return true
  if (typeof value !== "string") return Boolean(value)
  return value.trim().length > 0
}

const FIELD_LABELS: Record<ClientImportCanonicalColumn, string> = {
  companyName: "Nume firmă",
  cui: "CUI / cod fiscal",
  contactName: "Persoană contact",
  contactEmail: "Email contact",
  phone: "Telefon",
  sector: "Sector",
  employees: "Număr angajați",
  city: "Oraș",
  country: "Țară",
  serviceScope: "Scope servicii",
  expectedAiRole: "Rol AI estimat",
  usesAi: "Folosește AI",
  knownAiTools: "Tool-uri AI cunoscute",
  personalDataAi: "Date personale în AI",
  highRiskSuspected: "High-risk suspectat",
  assignedTo: "Responsabil",
  clientStatus: "Status client",
  intakeEmail: "Email intake",
  sendIntake: "Trimite intake",
  notes: "Note",
  tags: "Taguri",
  externalId: "ID extern",
}

const HARD_IMPORT_FIELDS: ClientImportCanonicalColumn[] = [
  "companyName",
  "cui",
  "contactName",
  "contactEmail",
  "phone",
  "sector",
  "employees",
  "city",
  "country",
  "externalId",
]

const SOFT_IMPORT_FIELDS: ClientImportCanonicalColumn[] = [
  "serviceScope",
  "assignedTo",
  "clientStatus",
  "intakeEmail",
  "sendIntake",
  "notes",
  "tags",
]

const TRIAGE_CLAIM_FIELDS: ClientImportCanonicalColumn[] = [
  "expectedAiRole",
  "usesAi",
  "knownAiTools",
  "personalDataAi",
  "highRiskSuspected",
]

function stringifyImportValue(value: unknown): string | undefined {
  if (Array.isArray(value)) return value.length > 0 ? value.join("; ") : undefined
  if (typeof value === "boolean") return value ? "yes" : "no"
  if (typeof value === "string") return clean(value, 1000)
  return value == null ? undefined : String(value)
}

function pushDiscoveryNeed(
  needs: ClientImportDiscoveryNeed[],
  type: ClientImportDiscoveryNeedType,
  input: Omit<ClientImportDiscoveryNeed, "type" | "source">
) {
  if (needs.some((need) => need.type === type)) return
  needs.push({ type, source: "client_import", ...input })
}

function buildClientImportDataCertainty(input: {
  fields: Record<ClientImportCanonicalColumn, unknown>
}): ClientImportDataCertainty {
  const fieldAssessments: ClientImportFieldAssessment[] = []

  for (const field of HARD_IMPORT_FIELDS) {
    const value = input.fields[field]
    if (!hasMeaningfulValue(value)) continue
    fieldAssessments.push({
      field,
      label: FIELD_LABELS[field],
      value: stringifyImportValue(value),
      certainty: "hard_import",
      source: "csv",
      reviewRequired: false,
      reason: "Date administrative importate ca bază de onboarding. Se validează doar formatul minim, nu realitatea juridică externă.",
    })
  }

  for (const field of SOFT_IMPORT_FIELDS) {
    const value = input.fields[field]
    if (!hasMeaningfulValue(value)) continue
    fieldAssessments.push({
      field,
      label: FIELD_LABELS[field],
      value: stringifyImportValue(value),
      certainty: "soft_import",
      source: field === "serviceScope" && Array.isArray(value) && value.length > 0 ? "csv" : "csv",
      reviewRequired: field === "serviceScope" || field === "sendIntake",
      reason: "Context operațional util pentru execuție, dar trebuie confirmat în mandat sau intake.",
    })
  }

  for (const field of TRIAGE_CLAIM_FIELDS) {
    const value = input.fields[field]
    if (!hasMeaningfulValue(value)) continue
    fieldAssessments.push({
      field,
      label: FIELD_LABELS[field],
      value: stringifyImportValue(value),
      certainty: "triage_claim",
      source: "csv",
      reviewRequired: true,
      reason: "Declarație de triaj. Nu devine verdict legal până nu este confirmată prin intake, evidence sau review consultant.",
    })
  }

  const needs: ClientImportDiscoveryNeed[] = []
  const usesAi = input.fields.usesAi as ClientImportYesNoUnknown
  const personalDataAi = input.fields.personalDataAi as ClientImportYesNoUnknown
  const highRiskSuspected = input.fields.highRiskSuspected as ClientImportYesNoUnknown
  const expectedAiRole = input.fields.expectedAiRole as ClientExpectedAIRole
  const serviceScope = Array.isArray(input.fields.serviceScope)
    ? (input.fields.serviceScope as ClientServiceScope[])
    : []
  const knownAiTools = Array.isArray(input.fields.knownAiTools) ? input.fields.knownAiTools : []

  if (usesAi === "unknown") {
    pushDiscoveryNeed(needs, "ai_inventory_intake", {
      label: "Confirmă dacă firma folosește AI",
      reason: "Importul nu spune dacă există chatboturi, copilots, agenți sau automatizări AI.",
      recommendedAction: "Trimite intake sau completează manual discovery-ul AI cu clientul.",
      severity: "medium",
    })
  }

  if (usesAi === "yes" && knownAiTools.length === 0) {
    pushDiscoveryNeed(needs, "ai_inventory_details", {
      label: "Detaliază sistemele AI declarate",
      reason: "Clientul declară că folosește AI, dar nu există tool-uri sau sisteme nominalizate.",
      recommendedAction: "Cere lista de tool-uri AI, scopuri, owneri și date procesate.",
      severity: "medium",
    })
  }

  if (knownAiTools.length > 0) {
    pushDiscoveryNeed(needs, "vendor_model_confirmation", {
      label: "Confirmă furnizorii și modelele",
      reason: "Tool-urile AI sunt declarate, dar importul nu conține vendor/model, DPA, instrucțiuni sau limitări.",
      recommendedAction: "Deschide review Furnizori AI și cere DPA / terms / model card unde există.",
      severity: "medium",
    })
  }

  if (expectedAiRole === "unknown" || highRiskSuspected === "unknown") {
    pushDiscoveryNeed(needs, "role_risk_confirmation", {
      label: "Confirmă rolul și riscul AI Act",
      reason: "Rolul sau high-risk statusul nu pot fi tratate ca verdict din CSV.",
      recommendedAction: "Rulează Evaluare rol + clasificare risc pe fiecare sistem AI relevant.",
      severity: highRiskSuspected === "unknown" ? "medium" : "high",
    })
  }

  if (personalDataAi === "unknown") {
    pushDiscoveryNeed(needs, "gdpr_data_confirmation", {
      label: "Confirmă dacă AI procesează date personale",
      reason: "Importul nu poate stabili legătura GDPR/DPIA fără data-flow minim.",
      recommendedAction: "Cere data-flow, scop, categorii de date, rol controller/processor și vendor DPA.",
      severity: serviceScope.includes("gdpr") ? "high" : "medium",
    })
  }

  if (serviceScope.includes("ai_literacy")) {
    pushDiscoveryNeed(needs, "ai_literacy_people", {
      label: "Importă sau colectează persoanele pentru AI Literacy",
      reason: "Scope-ul include AI Literacy, dar importul de clienți nu conține încă angajații și rolurile lor.",
      recommendedAction: "Cere export HR/LMS sau trimite intake pentru persoanele care folosesc ori supraveghează AI.",
      severity: "medium",
    })
  }

  return {
    counts: {
      hardImport: fieldAssessments.filter((field) => field.certainty === "hard_import").length,
      softImport: fieldAssessments.filter((field) => field.certainty === "soft_import").length,
      triageClaims: fieldAssessments.filter((field) => field.certainty === "triage_claim").length,
      needsDiscovery: needs.length,
      technicalEvidence: fieldAssessments.filter((field) => field.certainty === "technical_evidence").length,
    },
    fieldAssessments,
    discoveryNeeds: needs,
  }
}

export function buildClientImportSignals(input: {
  usesAi: ClientImportYesNoUnknown
  personalDataAi: ClientImportYesNoUnknown
  highRiskSuspected: ClientImportYesNoUnknown
  serviceScope: ClientServiceScope[]
  sendIntake: boolean
  nowISO?: string
}): ClientImportSignal[] {
  const nowISO = input.nowISO ?? new Date().toISOString()
  const signals: Omit<ClientImportSignal, "id">[] = []
  if (input.sendIntake) {
    signals.push({
      type: "send_intake",
      label: "Trimite intake/magic link către client",
      severity: "info",
      createdAtISO: nowISO,
      status: "open",
      source: "client_import",
    })
  }
  if (input.usesAi === "yes") {
    signals.push({
      type: "complete_ai_inventory",
      label: "Completează inventarul AI pentru client",
      severity: "medium",
      createdAtISO: nowISO,
      status: "open",
      source: "client_import",
    })
  }
  if (input.personalDataAi === "yes") {
    signals.push({
      type: "gdpr_dpia_review",
      label: "Rulează review GDPR/DPIA pentru AI cu date personale",
      severity: "high",
      createdAtISO: nowISO,
      status: "open",
      source: "client_import",
    })
  }
  if (input.serviceScope.includes("ai_literacy")) {
    signals.push({
      type: "ai_literacy_task",
      label: "Pregătește evidență AI Literacy Art. 4",
      severity: "medium",
      createdAtISO: nowISO,
      status: "open",
      source: "client_import",
    })
  }
  if (input.highRiskSuspected === "yes") {
    signals.push({
      type: "role_risk_review",
      label: "Verifică rolul și riscul high-risk suspectat",
      severity: "high",
      createdAtISO: nowISO,
      status: "open",
      source: "client_import",
    })
  }
  return signals.map((signal, index) => ({
    id: `client-import-${signal.type}-${Date.parse(nowISO)}-${index}`,
    ...signal,
  }))
}

type ImportFindingTemplate = {
  category: ScanFinding["category"]
  severity: ComplianceSeverity
  title: string
  detail: string
  legalReference: string
  impactSummary: string
  remediationHint: string
  ownerSuggestion: string
  evidenceRequired: string
  closeCondition: string
  resolution: NonNullable<ScanFinding["resolution"]>
  evidenceTypes: NonNullable<ScanFinding["evidenceTypes"]>
  requiredEvidenceKinds: NonNullable<ScanFinding["requiredEvidenceKinds"]>
}

function describeClientContext(meta: ClientMeta): string {
  const bits = [
    meta.cui ? `CUI ${meta.cui}` : null,
    meta.sector ? `sector ${meta.sector}` : null,
    meta.employees ? `${meta.employees} angajați` : null,
    meta.expectedAiRole && meta.expectedAiRole !== "unknown" ? `rol estimat ${meta.expectedAiRole}` : null,
    meta.knownAiTools?.length ? `tool-uri declarate: ${meta.knownAiTools.join(", ")}` : null,
  ].filter(Boolean)
  return bits.length > 0 ? bits.join(" · ") : "client importat fără context suplimentar"
}

function templateForImportSignal(signal: ClientImportSignal, meta: ClientMeta): ImportFindingTemplate | null {
  const orgName = meta.orgName ?? "client"
  const context = describeClientContext(meta)

  if (signal.type === "send_intake") {
    return {
      category: "EU_AI_ACT",
      severity: "low",
      title: `Trimite intake-ul AI Act + GDPR către ${orgName}`,
      detail: `Clientul a fost importat cu send_intake=yes. ${context}. Înainte de execuție, cabinetul trebuie să colecteze datele minime despre sisteme AI, furnizori, roluri și procesări de date.`,
      legalReference: "EU AI Act Art. 3, Art. 4, Art. 26; GDPR Art. 5, Art. 30, Art. 35",
      impactSummary: "Fără intake, dosarul pornește din presupuneri și consultantul nu poate demonstra ce informații a cerut clientului.",
      remediationHint: "Trimite magic link-ul de intake sau completează manual chestionarul inițial împreună cu clientul.",
      ownerSuggestion: meta.assignedTo ?? "DPO / consultant responsabil",
      evidenceRequired: "Magic link trimis sau chestionar intake completat, cu dată, destinatar și răspunsuri salvate.",
      closeCondition: "Intake-ul este trimis/completat și datele inițiale apar în inventar sau în notițele clientului.",
      evidenceTypes: ["document_bundle", "other"],
      requiredEvidenceKinds: ["intake_response", "client_confirmation"],
      resolution: {
        problem: "Clientul există în portofoliu, dar încă nu are intake complet.",
        impact: "Risc de evaluare incompletă și onboarding blocat.",
        action: "Trimite intake-ul și cere confirmarea sistemelor AI folosite sau planificate.",
        humanStep: "Consultantul validează răspunsurile înainte de clasificare.",
        closureEvidence: "Răspuns intake sau notă de discuție atașată.",
        revalidation: "Reverifică la fiecare import nou sau modificare de scope.",
      },
    }
  }

  if (signal.type === "complete_ai_inventory") {
    return {
      category: "EU_AI_ACT",
      severity: "medium",
      title: `Completează inventarul AI pentru ${orgName}`,
      detail: `Importul indică uses_ai=yes. ${context}. Trebuie înregistrate fiecare chatbot, copilot, agent, automatizare sau tool AI folosit de echipă, inclusiv furnizorul, scopul, datele procesate și owner-ul intern.`,
      legalReference: "EU AI Act Art. 3, Art. 4, Art. 6, Art. 26; GDPR Art. 30 și Art. 35 dacă sunt date personale",
      impactSummary: "Fără inventar AI, nu se poate stabili rolul legal, riscul, obligațiile de literacy, DPIA/FRIA sau dovezile pentru audit/procurement.",
      remediationHint: "Deschide Inventar AI și adaugă sistemele declarate sau pornește discovery cu clientul.",
      ownerSuggestion: meta.assignedTo ?? "DPO / legal / IT owner",
      evidenceRequired: "Registru AI completat cu nume sistem, furnizor/model, scop, date, rol estimat, risc și owner.",
      closeCondition: "Toate tool-urile AI cunoscute sunt înregistrate în Inventar AI și au owner atribuit.",
      evidenceTypes: ["document_bundle", "other"],
      requiredEvidenceKinds: ["ai_inventory", "owner_attestation"],
      resolution: {
        problem: "Clientul folosește AI, dar sistemele nu sunt încă înregistrate în dosar.",
        impact: "Nu există bază auditabilă pentru clasificare AI Act sau GDPR review.",
        action: "Înregistrează sistemele AI și marchează scopul, vendorul, datele și owner-ul.",
        humanStep: "Consultantul confirmă cu clientul că lista nu omite shadow AI.",
        closureEvidence: "Inventar AI exportabil sau captură din registru.",
        revalidation: "Reverifică după onboarding, după fiecare tool nou și la minimum 90 zile.",
      },
    }
  }

  if (signal.type === "gdpr_dpia_review") {
    return {
      category: "GDPR",
      severity: "high",
      title: `Rulează DPIA/GDPR review pentru AI cu date personale — ${orgName}`,
      detail: `Importul indică personal_data_ai=yes. ${context}. Trebuie verificată baza legală, rolul controller/processor, furnizorii/subprocesatorii, transferurile, minimizarea, transparența și dacă este necesară DPIA.`,
      legalReference: "GDPR Art. 5, Art. 6, Art. 9, Art. 22, Art. 28, Art. 30, Art. 35; EU AI Act Art. 26 și Art. 27 unde se aplică",
      impactSummary: "AI cu date personale fără review GDPR poate bloca audit pack-ul și crește riscul de sancțiuni, reclamații sau respingere în procurement.",
      remediationHint: "Pornește DPIA trigger decision, verifică RoPA/furnizori și atașează DPA sau justificarea legală.",
      ownerSuggestion: meta.assignedTo ?? "DPO / privacy lead",
      evidenceRequired: "Data-flow, legal basis, RoPA/DPIA decision, vendor/DPA, transfer assessment și transparență către persoane.",
      closeCondition: "DPIA trigger este decis, fluxul de date este documentat și vendor/DPA este verificat.",
      evidenceTypes: ["document_bundle", "policy_text", "other"],
      requiredEvidenceKinds: ["data_flow", "dpia_decision", "dpa_vendor_review", "privacy_notice"],
      resolution: {
        problem: "Clientul folosește AI cu date personale, dar review-ul GDPR nu este încă documentat.",
        impact: "Risc de procesare fără bază legală clară, DPIA omisă sau vendor neacoperit contractual.",
        action: "Rulează screening GDPR/DPIA și atașează dovezile relevante.",
        humanStep: "DPO-ul sau consultantul validează concluzia DPIA și măsurile reziduale.",
        closureEvidence: "DPIA decision record / RoPA update / DPA atașat.",
        revalidation: "Reverifică la schimbare de scop, date, furnizor sau model.",
      },
    }
  }

  if (signal.type === "ai_literacy_task") {
    return {
      category: "EU_AI_ACT",
      severity: "medium",
      title: `Documentează AI Literacy Art. 4 pentru ${orgName}`,
      detail: `Scope-ul importat include AI Literacy. ${context}. Trebuie creată dovada că persoanele care folosesc sau supraveghează AI au competență proporțională cu rolul, riscul și contextul de utilizare.`,
      legalReference: "EU AI Act Art. 4; European Commission AI literacy Q&A",
      impactSummary: "Un certificat generic nu este suficient dacă nu este legat de roluri, sisteme AI și politici interne.",
      remediationHint: "Adaugă trainingurile, rolurile acoperite și policy acknowledgement pentru echipele relevante.",
      ownerSuggestion: meta.assignedTo ?? "DPO / HR / manager operațional",
      evidenceRequired: "Listă participanți, roluri, conținut training, dată, trainer, policy acknowledgement și sisteme AI acoperite.",
      closeCondition: "Există evidență AI Literacy pentru persoanele relevante și este legată de sistemele AI folosite.",
      evidenceTypes: ["document_bundle", "policy_text", "other"],
      requiredEvidenceKinds: ["training_roster", "policy_acknowledgement", "role_guidance"],
      resolution: {
        problem: "AI Literacy este în scope, dar încă nu există dovadă role-aware în dosar.",
        impact: "La audit, clientul poate arăta un curs, dar nu poate demonstra competența raportată la folosirea reală a AI.",
        action: "Înregistrează trainingurile și leagă-le de roluri și sisteme AI.",
        humanStep: "Managerul/DPO confirmă acoperirea persoanelor relevante.",
        closureEvidence: "Registru AI Literacy și acknowledgements atașate.",
        revalidation: "Reverifică la onboarding angajați noi sau la introducerea unui sistem AI nou.",
      },
    }
  }

  if (signal.type === "role_risk_review") {
    return {
      category: "EU_AI_ACT",
      severity: "high",
      title: `Confirmă rolul și riscul AI Act pentru ${orgName}`,
      detail: `Importul indică high_risk_suspected=yes sau necesită clarificare de rol. ${context}. Trebuie stabilit per sistem dacă organizația este deployer, provider, builder/downstream provider sau poate deveni provider prin rebranding, modificare substanțială ori schimbarea scopului.`,
      legalReference: "EU AI Act Art. 3, Art. 6, Art. 25, Art. 26, Annex III",
      impactSummary: "Dacă rolul sau high-risk statusul este greșit, întregul dosar poate avea obligații lipsă sau acțiuni alocate persoanei greșite.",
      remediationHint: "Rulează Evaluare rol + clasificare risc pentru sistemele AI cunoscute și documentează raționamentul.",
      ownerSuggestion: meta.assignedTo ?? "Legal / DPO / product owner",
      evidenceRequired: "Role assessment per sistem, intended purpose, Annex III screening, justificare excepții și owner legal.",
      closeCondition: "Rolul și riscul sunt confirmate per sistem AI și raționamentul este salvat în dosar.",
      evidenceTypes: ["document_bundle", "other"],
      requiredEvidenceKinds: ["role_assessment", "risk_classification", "intended_purpose"],
      resolution: {
        problem: "Există suspiciune de high-risk sau rol AI Act neclar.",
        impact: "Obligațiile pot fi subestimate, mai ales pentru builderi, integratori sau deployeri care modifică sistemul.",
        action: "Completează evaluarea de rol și risc pe fiecare sistem AI.",
        humanStep: "Consultantul validează rezultatul înainte de audit pack.",
        closureEvidence: "Role/risk decision record atașat.",
        revalidation: "Reverifică la modificare de scop, vendor, model sau proces operațional.",
      },
    }
  }

  return null
}

export function buildClientImportFindings(input: {
  orgId: string
  meta: ClientMeta
  nowISO?: string
}): ScanFinding[] {
  const nowISO = input.nowISO ?? new Date().toISOString()
  const signals = input.meta.importSignals?.filter((signal) => signal.status === "open") ?? []
  return signals.reduce<ScanFinding[]>((findings, signal) => {
    const template = templateForImportSignal(signal, input.meta)
    if (!template) return findings
      const id = `client-import-${findingIdPart(input.meta.externalId ?? input.meta.cui ?? input.meta.orgName)}-${signal.type}`
      findings.push({
        id,
        title: template.title,
        detail: template.detail,
        category: template.category,
        severity: template.severity,
        verdictConfidence: "high",
        verdictConfidenceReason:
          "Finding generat determinist din semnalele declarate la importul clientului.",
        risk: severityToLegacyRisk(template.severity),
        principles: inferPrinciplesFromCategory(template.category),
        createdAtISO: nowISO,
        sourceDocument: "client_import",
        legalReference: template.legalReference,
        impactSummary: template.impactSummary,
        remediationHint: template.remediationHint,
        ownerSuggestion: template.ownerSuggestion,
        evidenceRequired: template.evidenceRequired,
        evidenceTypes: template.evidenceTypes,
        findingStatus: "open",
        findingStatusUpdatedAtISO: nowISO,
        reviewState: "unreviewed",
        sourceParagraph: signal.label,
        closeCondition: template.closeCondition,
        requiredEvidenceKinds: template.requiredEvidenceKinds,
        resolution: template.resolution,
        resolutionLocus: signal.type === "send_intake" ? "hybrid" : "in_app",
        resolutionMode: signal.type === "send_intake" ? "external_action" : "in_app_guided",
        provenance: {
          ruleId: `client_import.${signal.type}`,
          matchedKeyword: signal.type,
          excerpt: signal.label,
          signalSource: "manifest",
          verdictBasis: "direct_signal",
          signalConfidence: "high",
        },
      })
      return findings
    }, [])
}

export function parseClientImportText(text: string): ClientImportParseResult {
  const normalizedText = text.replace(/^\uFEFF/, "").trim()
  if (!normalizedText) {
    return {
      headers: [],
      delimiter: ",",
      mappedColumns: {},
      unmappedHeaders: [],
      rows: [],
      totalRows: 0,
      validRows: 0,
      errorRows: 0,
      warningRows: 0,
    }
  }

  const lines = normalizedText.split(/\r?\n/g).filter((line) => line.trim())
  const delimiter = detectDelimiter(lines[0] ?? "")
  const headers = parseLine(lines[0] ?? "", delimiter)
  const mapping = detectMapping(headers)
  const usedHeaders = new Set(Object.values(mapping).filter((v): v is number => typeof v === "number"))
  const mappedColumns = Object.fromEntries(
    Object.entries(mapping).map(([key, value]) => [key, typeof value === "number" ? headers[value] : ""])
  ) as Partial<Record<ClientImportCanonicalColumn, string>>
  const unmappedHeaders = headers.filter((_, index) => !usedHeaders.has(index))

  const seen = new Map<string, number>()
  const rows = lines.slice(1).map((line, index) => {
    const values = parseLine(line, delimiter)
    const raw = Object.fromEntries(headers.map((header, i) => [header, values[i] ?? ""]))
    const companyName = cell(values, mapping, "companyName") ?? ""
    const cuiRaw = cell(values, mapping, "cui")
    const cui = normalizeCui(cuiRaw)
    const contactEmail = cell(values, mapping, "contactEmail")
    const intakeEmail = cell(values, mapping, "intakeEmail") ?? contactEmail
    const serviceScope = normalizeServiceScope(cell(values, mapping, "serviceScope"))
    const usesAi = normalizeYesNo(cell(values, mapping, "usesAi"))
    const personalDataAi = normalizeYesNo(cell(values, mapping, "personalDataAi"))
    const highRiskSuspected = normalizeYesNo(cell(values, mapping, "highRiskSuspected"))
    const sendIntake = normalizeBoolean(cell(values, mapping, "sendIntake"))
    const tags = splitList(cell(values, mapping, "tags"))
    const knownAiTools = splitList(cell(values, mapping, "knownAiTools"))
    const errors: string[] = []
    const warnings: string[] = []

    if (!companyName || companyName.length < 2) errors.push("Nume firmă lipsă sau prea scurt.")
    if (cuiRaw && !cui) errors.push("CUI invalid.")
    if (contactEmail && !isValidEmail(contactEmail)) errors.push("Email contact invalid.")
    if (intakeEmail && !isValidEmail(intakeEmail)) errors.push("Email intake invalid.")
    if (sendIntake && !intakeEmail) errors.push("send_intake=yes cere intake_email sau contact_email.")
    if (usesAi === "unknown") warnings.push("uses_ai necunoscut — clientul va avea nevoie de discovery.")
    if (serviceScope.length === 0) warnings.push("service_scope gol — presupunem ai_act.")

    const duplicateKey = cui ? `cui:${cui}` : `name:${normalizeText(companyName)}`
    const previousRow = seen.get(duplicateKey)
    if (previousRow) {
      errors.push(`Duplicat în fișier cu rândul ${previousRow}.`)
    } else if (companyName) {
      seen.set(duplicateKey, index + 2)
    }

    const finalServiceScope = serviceScope.length > 0 ? serviceScope : (["ai_act"] as ClientServiceScope[])
    const expectedAiRole = normalizeRole(cell(values, mapping, "expectedAiRole"))
    const clientStatus = normalizeStatus(cell(values, mapping, "clientStatus"))
    const dataCertainty = buildClientImportDataCertainty({
      fields: {
        companyName,
        cui,
        contactName: cell(values, mapping, "contactName"),
        contactEmail,
        phone: cell(values, mapping, "phone"),
        sector: cell(values, mapping, "sector"),
        employees: cell(values, mapping, "employees"),
        city: cell(values, mapping, "city"),
        country: cell(values, mapping, "country"),
        serviceScope: finalServiceScope,
        expectedAiRole,
        usesAi,
        knownAiTools,
        personalDataAi,
        highRiskSuspected,
        assignedTo: cell(values, mapping, "assignedTo"),
        clientStatus,
        intakeEmail,
        sendIntake,
        notes: cell(values, mapping, "notes"),
        tags,
        externalId: cell(values, mapping, "externalId"),
      },
    })

    return {
      rowNumber: index + 2,
      raw,
      companyName,
      cui,
      contactName: cell(values, mapping, "contactName"),
      contactEmail,
      phone: cell(values, mapping, "phone"),
      sector: cell(values, mapping, "sector"),
      employees: cell(values, mapping, "employees"),
      city: cell(values, mapping, "city"),
      country: cell(values, mapping, "country"),
      serviceScope: finalServiceScope,
      expectedAiRole,
      usesAi,
      knownAiTools,
      personalDataAi,
      highRiskSuspected,
      assignedTo: cell(values, mapping, "assignedTo"),
      clientStatus,
      intakeEmail,
      sendIntake,
      notes: cell(values, mapping, "notes"),
      tags,
      externalId: cell(values, mapping, "externalId"),
      errors,
      warnings,
      duplicateKey,
      signals: buildClientImportSignals({
        usesAi,
        personalDataAi,
        highRiskSuspected,
        serviceScope: finalServiceScope,
        sendIntake,
      }),
      dataCertainty,
    } satisfies ClientImportDraft
  })

  return {
    headers,
    delimiter,
    mappedColumns,
    unmappedHeaders,
    rows,
    totalRows: rows.length,
    validRows: rows.filter((row) => row.errors.length === 0).length,
    errorRows: rows.filter((row) => row.errors.length > 0).length,
    warningRows: rows.filter((row) => row.warnings.length > 0).length,
  }
}

export function parseAISystemImportText(text: string): AISystemImportParseResult {
  const normalizedText = text.replace(/^\uFEFF/, "").trim()
  if (!normalizedText) {
    return {
      headers: [],
      delimiter: ",",
      mappedColumns: {},
      unmappedHeaders: [],
      rows: [],
      totalRows: 0,
      validRows: 0,
      errorRows: 0,
      warningRows: 0,
    }
  }

  const lines = normalizedText.split(/\r?\n/g).filter((line) => line.trim())
  const delimiter = detectDelimiter(lines[0] ?? "")
  const headers = parseLine(lines[0] ?? "", delimiter)
  const mapping = detectAISystemMapping(headers)
  const usedHeaders = new Set(Object.values(mapping).filter((value): value is number => typeof value === "number"))
  const mappedColumns = Object.fromEntries(
    Object.entries(mapping).map(([key, value]) => [key, typeof value === "number" ? headers[value] : ""])
  ) as Partial<Record<AISystemImportCanonicalColumn, string>>
  const unmappedHeaders = headers.filter((_, index) => !usedHeaders.has(index))

  const seen = new Map<string, number>()
  const rows = lines.slice(1).map((line, index) => {
    const values = parseLine(line, delimiter)
    const raw = Object.fromEntries(headers.map((header, i) => [header, values[i] ?? ""]))
    const clientOrgId = aiCell(values, mapping, "clientOrgId")
    const clientExternalId = aiCell(values, mapping, "clientExternalId")
    const clientCuiRaw = aiCell(values, mapping, "clientCui")
    const clientCui = normalizeCui(clientCuiRaw)
    const clientName = aiCell(values, mapping, "clientName")
    const systemName = aiCell(values, mapping, "systemName") ?? ""
    const useCaseName = aiCell(values, mapping, "useCaseName")
    const department = aiCell(values, mapping, "department")
    const businessProcess = aiCell(values, mapping, "businessProcess")
    const purposeRaw = aiCell(values, mapping, "purpose")
    const purpose = resolveAISystemPurpose(purposeRaw, useCaseName, businessProcess, department)
    const vendor = aiCell(values, mapping, "vendor")
    const modelType = aiCell(values, mapping, "modelType")
    const usesPersonalDataAnswer = normalizeYesNo(aiCell(values, mapping, "usesPersonalData"))
    const confidentialDataAnswer = normalizeYesNo(aiCell(values, mapping, "confidentialData"))
    const automatedDecisionsAnswer = normalizeYesNo(aiCell(values, mapping, "makesAutomatedDecisions"))
    const impactsRightsAnswer = normalizeYesNo(aiCell(values, mapping, "impactsRights"))
    const humanReviewAnswer = normalizeReviewPresence(aiCell(values, mapping, "hasHumanReview"))
    const publicOutputAnswer = normalizeYesNo(aiCell(values, mapping, "publicOutput"))
    const affectedPersons = splitList(aiCell(values, mapping, "affectedPersons"))
    const externalId = aiCell(values, mapping, "externalId")
    const matcher = resolveAISystemClientMatcher({
      clientOrgId,
      clientExternalId,
      clientCui,
      clientName,
    })
    const errors: string[] = []
    const warnings: string[] = []

    if (clientCuiRaw && !clientCui) errors.push("CUI client invalid.")
    if (!matcher) {
      errors.push(
        "Identificator client lipsă: folosește client_org_id, client_external_id, client_cui sau client_name."
      )
    }
    if (!systemName || systemName.length < 2) errors.push("Nume sistem AI lipsă sau prea scurt.")
    if (!purposeRaw && !useCaseName) errors.push("Scop sistem AI lipsă.")
    if (!vendor) warnings.push("Furnizor/model lipsă — cere vendor sau model din intake.")
    if ((purposeRaw || useCaseName) && purpose === "other") {
      warnings.push("Scop AI necunoscut — clasificarea rămâne de confirmat manual.")
    }
    if (usesPersonalDataAnswer === "unknown") {
      warnings.push("Date personale necunoscute — cere data-flow și GDPR trigger decision.")
    }
    if (humanReviewAnswer === "unknown") {
      warnings.push("Human review necunoscut — cere owner și mecanism de supraveghere.")
    }
    if (humanReviewAnswer === "no") {
      warnings.push("Human review lipsește — verifică Art. 14 / oversight înainte de audit pack.")
    }

    const clientKey = matcher ? `${matcher.type}:${normalizeText(matcher.value)}` : "client:missing"
    const systemKey = externalId
      ? `external:${normalizeText(externalId)}`
      : `name:${normalizeText(systemName)}:${normalizeText(vendor ?? "")}`
    const useCaseKey = `usecase:${normalizeText(useCaseName ?? purposeRaw ?? "")}:${normalizeText(department ?? "")}`
    const duplicateKey = `${clientKey}:${systemKey}:${useCaseKey}`
    const previousRow = seen.get(duplicateKey)
    if (previousRow) {
      errors.push(`Duplicat în fișier cu rândul ${previousRow}.`)
    } else if (systemName) {
      seen.set(duplicateKey, index + 2)
    }

    return {
      rowNumber: index + 2,
      raw,
      clientOrgId,
      clientExternalId,
      clientCui,
      clientName,
      clientMatcher: matcher,
      systemName,
      useCaseName,
      department,
      businessProcess,
      purpose,
      purposeRaw,
      vendor,
      modelType,
      usesPersonalDataAnswer,
      confidentialDataAnswer,
      automatedDecisionsAnswer,
      impactsRightsAnswer,
      humanReviewAnswer,
      publicOutputAnswer,
      affectedPersons,
      usesPersonalData: usesPersonalDataAnswer === "yes",
      makesAutomatedDecisions: automatedDecisionsAnswer === "yes",
      impactsRights: impactsRightsAnswer === "yes",
      hasHumanReview: humanReviewAnswer === "yes",
      owner: aiCell(values, mapping, "owner"),
      stage: aiCell(values, mapping, "stage"),
      notes: aiCell(values, mapping, "notes"),
      tags: splitList(aiCell(values, mapping, "tags")),
      externalId,
      errors,
      warnings,
      duplicateKey,
    } satisfies AISystemImportDraft
  })

  return {
    headers,
    delimiter,
    mappedColumns,
    unmappedHeaders,
    rows,
    totalRows: rows.length,
    validRows: rows.filter((row) => row.errors.length === 0).length,
    errorRows: rows.filter((row) => row.errors.length > 0).length,
    warningRows: rows.filter((row) => row.warnings.length > 0).length,
  }
}

export function parseVendorModelImportText(text: string): VendorModelImportParseResult {
  const normalizedText = text.replace(/^\uFEFF/, "").trim()
  if (!normalizedText) return emptyParseResult<VendorModelImportCanonicalColumn, VendorModelImportDraft>()

  const lines = normalizedText.split(/\r?\n/g).filter((line) => line.trim())
  const delimiter = detectDelimiter(lines[0] ?? "")
  const headers = parseLine(lines[0] ?? "", delimiter)
  const mapping = detectImportMapping(headers, VENDOR_MODEL_COLUMN_ALIASES)
  const seen = new Map<string, number>()

  const rows = lines.slice(1).map((line, index) => {
    const values = parseLine(line, delimiter)
    const raw = Object.fromEntries(headers.map((header, i) => [header, values[i] ?? ""]))
    const client = readSharedClientMatcher(values, mapping)
    const vendorName = importCell(values, mapping, "vendorName") ?? ""
    const productUsed = importCell(values, mapping, "productUsed") ?? ""
    const contactEmail = importCell(values, mapping, "contactEmail")
    const dpaStatus = normalizeDpaStatus(importCell(values, mapping, "dpaStatus"))
    const vendorRegion = normalizeVendorRegion(importCell(values, mapping, "region"))
    const transferMechanism = normalizeTransferMechanism(importCell(values, mapping, "transferMechanism"))
    const personalData = normalizeYesNo(importCell(values, mapping, "personalData"))
    const trainingSettingRaw = importCell(values, mapping, "trainingOnCustomerData")
    const trainingSettingHeader =
      typeof mapping.trainingOnCustomerData === "number" ? headers[mapping.trainingOnCustomerData] ?? "" : ""
    const errors: string[] = []
    const warnings: string[] = []

    if (client.clientCuiRaw && !client.clientCui) errors.push("CUI client invalid.")
    if (!client.clientMatcher) {
      errors.push(
        "Identificator client lipsă: folosește client_org_id, client_external_id, client_cui sau client_name."
      )
    }
    if (!vendorName || vendorName.length < 2) errors.push("Nume furnizor lipsă sau prea scurt.")
    if (!productUsed || productUsed.length < 2) warnings.push("Produs/model lipsă — importul intră în review.")
    if (contactEmail && !isValidEmail(contactEmail)) errors.push("Email furnizor invalid.")
    if (dpaStatus === "missing" && personalData !== "no") warnings.push("DPA lipsă sau neclar pentru furnizor AI.")
    if (vendorRegion !== "EU" && transferMechanism === "unknown") {
      warnings.push("Transfer non-UE cu mecanism necunoscut — cere SCC/adequacy sau justificare.")
    }

    const clientKey = client.clientMatcher
      ? `${client.clientMatcher.type}:${normalizeText(client.clientMatcher.value)}`
      : "client:missing"
    const duplicateKey = `${clientKey}:${normalizeText(vendorName)}:${normalizeText(productUsed)}`
    const previousRow = seen.get(duplicateKey)
    if (previousRow) {
      errors.push(`Duplicat în fișier cu rândul ${previousRow}.`)
    } else if (vendorName) {
      seen.set(duplicateKey, index + 2)
    }

    return {
      rowNumber: index + 2,
      raw,
      clientOrgId: client.clientOrgId,
      clientExternalId: client.clientExternalId,
      clientCui: client.clientCui,
      clientName: client.clientName,
      clientMatcher: client.clientMatcher,
      vendorName,
      legalEntity: importCell(values, mapping, "legalEntity"),
      productUsed,
      vendorRegion,
      role: normalizeVendorRole(importCell(values, mapping, "role")),
      serviceCategory: importCell(values, mapping, "serviceCategory"),
      dpaStatus,
      transferMechanism,
      subprocessors: splitList(importCell(values, mapping, "subprocessors")),
      iso27001: normalizeBoolean(importCell(values, mapping, "iso27001")),
      soc2: normalizeBoolean(importCell(values, mapping, "soc2")),
      trainingDataOptOut: normalizeText(trainingSettingHeader).includes("opt out")
        ? normalizeTrainingOptOut(trainingSettingRaw)
        : normalizeTrainingOptOutFromCustomerTraining(trainingSettingRaw),
      inputDataRetention: normalizeInputRetention(importCell(values, mapping, "inputRetention")),
      modelTransparency: normalizeModelTransparency(importCell(values, mapping, "modelTransparency")),
      contactEmail,
      personalData,
      notes: importCell(values, mapping, "notes"),
      externalId: importCell(values, mapping, "externalId"),
      errors,
      warnings,
      duplicateKey,
    } satisfies VendorModelImportDraft
  })

  return summarizeParseResult({ headers, delimiter, mapping, rows })
}

export function parseRopaImportText(text: string): RopaImportParseResult {
  const normalizedText = text.replace(/^\uFEFF/, "").trim()
  if (!normalizedText) return emptyParseResult<RopaImportCanonicalColumn, RopaImportDraft>()

  const lines = normalizedText.split(/\r?\n/g).filter((line) => line.trim())
  const delimiter = detectDelimiter(lines[0] ?? "")
  const headers = parseLine(lines[0] ?? "", delimiter)
  const mapping = detectImportMapping(headers, ROPA_COLUMN_ALIASES)
  const seen = new Map<string, number>()

  const rows = lines.slice(1).map((line, index) => {
    const values = parseLine(line, delimiter)
    const raw = Object.fromEntries(headers.map((header, i) => [header, values[i] ?? ""]))
    const client = readSharedClientMatcher(values, mapping)
    const activityName = importCell(values, mapping, "activityName") ?? ""
    const purpose = importCell(values, mapping, "purpose") ?? ""
    const legalBasis = importCell(values, mapping, "legalBasis")
    const retention = importCell(values, mapping, "retention")
    const errors: string[] = []
    const warnings: string[] = []

    if (client.clientCuiRaw && !client.clientCui) errors.push("CUI client invalid.")
    if (!client.clientMatcher) {
      errors.push(
        "Identificator client lipsă: folosește client_org_id, client_external_id, client_cui sau client_name."
      )
    }
    if (!activityName || activityName.length < 2) errors.push("Nume activitate RoPA lipsă sau prea scurt.")
    if (!purpose) warnings.push("Scop prelucrare lipsă — cere clarificare înainte de validare.")
    if (!legalBasis) warnings.push("Temei juridic lipsă — activitatea rămâne în review.")
    if (!retention) warnings.push("Retenție lipsă — cere regula de păstrare.")

    const clientKey = client.clientMatcher
      ? `${client.clientMatcher.type}:${normalizeText(client.clientMatcher.value)}`
      : "client:missing"
    const duplicateKey = `${clientKey}:${normalizeText(activityName)}:${normalizeText(purpose)}`
    const previousRow = seen.get(duplicateKey)
    if (previousRow) {
      errors.push(`Duplicat în fișier cu rândul ${previousRow}.`)
    } else if (activityName) {
      seen.set(duplicateKey, index + 2)
    }

    return {
      rowNumber: index + 2,
      raw,
      clientOrgId: client.clientOrgId,
      clientExternalId: client.clientExternalId,
      clientCui: client.clientCui,
      clientName: client.clientName,
      clientMatcher: client.clientMatcher,
      department: importCell(values, mapping, "department"),
      activityName,
      owner: importCell(values, mapping, "owner"),
      purpose,
      dataSubjects: splitList(importCell(values, mapping, "dataSubjects")),
      dataCategories: splitList(importCell(values, mapping, "dataCategories")),
      specialCategories: splitList(importCell(values, mapping, "specialCategories")),
      legalBasis,
      article9Condition: importCell(values, mapping, "article9Condition"),
      recipients: splitList(importCell(values, mapping, "recipients")),
      processors: splitList(importCell(values, mapping, "processors")),
      systems: splitList(importCell(values, mapping, "systems")),
      retention,
      securityMeasures: splitList(importCell(values, mapping, "securityMeasures")),
      thirdCountryTransfers: parseThirdCountryTransfers(importCell(values, mapping, "thirdCountryTransfers")),
      notes: importCell(values, mapping, "notes"),
      externalId: importCell(values, mapping, "externalId"),
      errors,
      warnings,
      duplicateKey,
    } satisfies RopaImportDraft
  })

  return summarizeParseResult({ headers, delimiter, mapping, rows })
}

export function parseLiteracyImportText(text: string): LiteracyImportParseResult {
  const normalizedText = text.replace(/^\uFEFF/, "").trim()
  if (!normalizedText) return emptyParseResult<LiteracyImportCanonicalColumn, LiteracyImportDraft>()

  const lines = normalizedText.split(/\r?\n/g).filter((line) => line.trim())
  const delimiter = detectDelimiter(lines[0] ?? "")
  const headers = parseLine(lines[0] ?? "", delimiter)
  const mapping = detectImportMapping(headers, LITERACY_COLUMN_ALIASES)
  const seen = new Map<string, number>()

  const rows = lines.slice(1).map((line, index) => {
    const values = parseLine(line, delimiter)
    const raw = Object.fromEntries(headers.map((header, i) => [header, values[i] ?? ""]))
    const client = readSharedClientMatcher(values, mapping)
    const employeeName = importCell(values, mapping, "employeeName") ?? ""
    const trainingDateRaw = importCell(values, mapping, "trainingDate")
    const trainingDate = normalizeDateValue(trainingDateRaw) ?? ""
    const role = importCell(values, mapping, "role") ?? ""
    const errors: string[] = []
    const warnings: string[] = []

    if (client.clientCuiRaw && !client.clientCui) errors.push("CUI client invalid.")
    if (!client.clientMatcher) {
      errors.push(
        "Identificator client lipsă: folosește client_org_id, client_external_id, client_cui sau client_name."
      )
    }
    if (!employeeName || employeeName.length < 2) errors.push("Nume persoană lipsă.")
    if (trainingDateRaw && !trainingDate) errors.push("Dată training invalidă. Folosește YYYY-MM-DD.")
    if (!trainingDateRaw) warnings.push("Dată training lipsă — înregistrarea rămâne de confirmat.")
    if (!role) warnings.push("Rol persoană lipsă — AI Literacy trebuie legat de rol/context.")

    const clientKey = client.clientMatcher
      ? `${client.clientMatcher.type}:${normalizeText(client.clientMatcher.value)}`
      : "client:missing"
    const duplicateKey = `${clientKey}:${normalizeText(employeeName)}:${trainingDate || "no-date"}`
    const previousRow = seen.get(duplicateKey)
    if (previousRow) {
      errors.push(`Duplicat în fișier cu rândul ${previousRow}.`)
    } else if (employeeName) {
      seen.set(duplicateKey, index + 2)
    }

    return {
      rowNumber: index + 2,
      raw,
      clientOrgId: client.clientOrgId,
      clientExternalId: client.clientExternalId,
      clientCui: client.clientCui,
      clientName: client.clientName,
      clientMatcher: client.clientMatcher,
      employeeName,
      role,
      trainingDate,
      trainingType: normalizeTrainingType(importCell(values, mapping, "trainingType")),
      topics: splitList(importCell(values, mapping, "topics")),
      trainer: importCell(values, mapping, "trainer"),
      durationHours: parseNumberValue(importCell(values, mapping, "durationHours"), 0),
      attestationSigned: normalizeBoolean(importCell(values, mapping, "attestationSigned")),
      notes: importCell(values, mapping, "notes"),
      externalId: importCell(values, mapping, "externalId"),
      errors,
      warnings,
      duplicateKey,
    } satisfies LiteracyImportDraft
  })

  return summarizeParseResult({ headers, delimiter, mapping, rows })
}

export function aiSystemImportDraftToRecord(
  draft: AISystemImportDraft,
  nowISO = new Date().toISOString()
): AISystemRecord {
  const classification = classifyAISystem(draft.purpose)
  return {
    id: randomImportId(`ai-${findingIdPart(draft.externalId ?? draft.systemName)}`),
    name: draft.systemName,
    purpose: draft.purpose,
    vendor: draft.vendor ?? "",
    modelType: draft.modelType ?? "",
    usesPersonalData: draft.usesPersonalData,
    makesAutomatedDecisions: draft.makesAutomatedDecisions,
    impactsRights: draft.impactsRights,
    hasHumanReview: draft.hasHumanReview,
    riskLevel: mapAIActRiskToSystemRisk(classification.riskLevel),
    annexIIIHint: classification.article.startsWith("Annex") ? classification.article : undefined,
    recommendedActions: classification.requiredActions,
    createdAtISO: nowISO,
    approvalStatus: "pending",
    policyAttestationStatus: "not-attested",
  }
}

function scoreVendorRisk(input: VendorModelImportDraft): {
  riskLevel: VendorRiskLevel
  reviewStatus: VendorReviewStatus
  riskReasons: string[]
} {
  const riskReasons: string[] = []
  let riskLevel: VendorRiskLevel = "medium"
  let reviewStatus: VendorReviewStatus = "in_review"

  if (input.dpaStatus === "missing" || input.dpaStatus === "expired") {
    riskReasons.push("DPA lipsă sau expirat.")
    riskLevel = "high"
    reviewStatus = "needs_dpa"
  }
  if (input.vendorRegion !== "EU" && input.transferMechanism === "unknown") {
    riskReasons.push("Transfer non-UE fără mecanism documentat.")
    riskLevel = "high"
    if (reviewStatus === "in_review") reviewStatus = "needs_transfer_review"
  }
  if (!input.iso27001 && !input.soc2) {
    riskReasons.push("Nu există încă dovadă ISO 27001 / SOC 2 importată.")
    if (riskLevel === "medium") riskLevel = "medium"
    if (reviewStatus === "in_review") reviewStatus = "needs_security_review"
  }
  if (input.dpaStatus === "signed" && input.vendorRegion === "EU" && (input.iso27001 || input.soc2)) {
    riskLevel = "low"
  }
  if (riskReasons.length === 0) riskReasons.push("Import valid, dar review consultant necesar înainte de aprobare.")

  return { riskLevel, reviewStatus, riskReasons }
}

export function vendorModelImportDraftToRecord(
  draft: VendorModelImportDraft,
  orgId: string,
  nowISO = new Date().toISOString()
): VendorRecord {
  const scored = scoreVendorRisk(draft)
  const outputRightsOwnership: VendorAIOutputOwnership = "client"
  return {
    id: randomImportId(`vendor-${findingIdPart(draft.externalId ?? draft.vendorName)}`),
    orgId,
    name: draft.vendorName,
    legalEntity: draft.legalEntity,
    contactEmail: draft.contactEmail,
    productUsed: draft.productUsed,
    vendorRegion: draft.vendorRegion,
    role: draft.role,
    serviceCategory: draft.serviceCategory ?? "AI / software",
    linkedAISystemIds: [],
    linkedAIDataMapIds: [],
    dpaStatus: draft.dpaStatus,
    transferRequired: draft.vendorRegion !== "EU" && draft.transferMechanism !== "none",
    transferMechanism: draft.transferMechanism,
    transferAssessmentNote:
      draft.vendorRegion !== "EU" ? "Import: verifică mecanismul de transfer și documentează TIA/SCC unde se aplică." : undefined,
    subprocessorsList: draft.subprocessors,
    securityEvidence: {
      iso27001: draft.iso27001,
      soc2: draft.soc2,
      penTestRecent: false,
      encryptionInTransit: false,
      encryptionAtRest: false,
      mfaEnforced: false,
      auditLogsAvailable: false,
    },
    aiTerms: {
      trainingDataOptOut: draft.trainingDataOptOut,
      inputDataRetention: draft.inputDataRetention,
      outputRightsOwnership,
      modelTransparency: draft.modelTransparency,
      reproducibilityGuarantees: false,
    },
    riskLevel: scored.riskLevel,
    riskReasons: scored.riskReasons,
    reviewStatus: scored.reviewStatus,
    humanReviewRequired: true,
    nextRevalidationISO: nowISO,
    linkedFindingIds: [],
    notes: draft.notes,
    createdAtISO: nowISO,
    updatedAtISO: nowISO,
  }
}

function scoreRopaRisk(input: RopaImportDraft): {
  riskLevel: RopaRiskLevel
  riskScore: number
  riskReasons: string[]
  status: RopaActivityStatus
} {
  const riskReasons: string[] = []
  let riskScore = 30
  if (input.specialCategories.length > 0) {
    riskScore += 30
    riskReasons.push("Categorii speciale de date.")
  }
  if (input.thirdCountryTransfers.length > 0) {
    riskScore += 20
    riskReasons.push("Transferuri către țări terțe.")
  }
  if (!input.legalBasis) {
    riskScore += 20
    riskReasons.push("Temei juridic lipsă.")
  }
  if (!input.retention) {
    riskScore += 10
    riskReasons.push("Retenție lipsă.")
  }
  const riskLevel: RopaRiskLevel = riskScore >= 70 ? "high" : riskScore >= 40 ? "medium" : "low"
  if (riskReasons.length === 0) riskReasons.push("Activitate importată, necesită confirmare DPO.")
  return {
    riskLevel,
    riskScore: Math.min(100, riskScore),
    riskReasons,
    status: "needs_review",
  }
}

export function ropaImportDraftToRecord(
  draft: RopaImportDraft,
  orgId: string,
  nowISO = new Date().toISOString()
): RopaActivityRecord {
  const scored = scoreRopaRisk(draft)
  return {
    id: randomImportId(`ropa-${findingIdPart(draft.externalId ?? draft.activityName)}`),
    orgId,
    department: draft.department,
    activityName: draft.activityName,
    ownerName: draft.owner,
    purpose: draft.purpose,
    dataSubjects: draft.dataSubjects,
    dataCategories: draft.dataCategories,
    specialCategories: draft.specialCategories,
    legalBasis: draft.legalBasis,
    article9Condition: draft.article9Condition,
    recipients: draft.recipients,
    processors: draft.processors,
    systems: draft.systems,
    thirdCountryTransfers: draft.thirdCountryTransfers,
    retentionRule: draft.retention,
    securityMeasures: draft.securityMeasures,
    source: "import",
    confidence: "client_claim",
    status: scored.status,
    linkedFindings: [],
    linkedEvidence: [],
    linkedAISystemIds: [],
    createdAtISO: nowISO,
    updatedAtISO: nowISO,
    riskLevel: scored.riskLevel,
    riskScore: scored.riskScore,
    riskReasons: scored.riskReasons,
  }
}

export function literacyImportDraftToRecord(
  draft: LiteracyImportDraft,
  nowISO = new Date().toISOString()
): LiteracyRecord {
  return {
    id: randomImportId(`lit-${findingIdPart(draft.externalId ?? draft.employeeName)}`),
    employeeName: draft.employeeName,
    role: draft.role,
    trainingDate: draft.trainingDate,
    trainingType: draft.trainingType,
    topicsCovered: draft.topics,
    trainerName: draft.trainer ?? "Nespecificat",
    durationHours: draft.durationHours,
    attestationSigned: draft.attestationSigned,
    notes: draft.notes,
    createdAtISO: nowISO,
  }
}

export function draftToClientMeta(
  draft: ClientImportDraft,
  input?: { createdByCabinet?: string; nowISO?: string; source?: ClientMeta["importSource"] }
): ClientMeta {
  const nowISO = input?.nowISO ?? new Date().toISOString()
  return {
    orgName: draft.companyName,
    cui: draft.cui,
    contactName: draft.contactName,
    contactEmail: draft.contactEmail,
    phone: draft.phone,
    sector: draft.sector,
    employees: draft.employees,
    city: draft.city,
    country: draft.country,
    serviceScope: draft.serviceScope,
    expectedAiRole: draft.expectedAiRole,
    usesAi: draft.usesAi,
    knownAiTools: draft.knownAiTools,
    personalDataAi: draft.personalDataAi,
    highRiskSuspected: draft.highRiskSuspected,
    assignedTo: draft.assignedTo,
    clientStatus: draft.clientStatus,
    intakeEmail: draft.intakeEmail,
    sendIntake: draft.sendIntake,
    notes: draft.notes,
    tags: draft.tags,
    externalId: draft.externalId,
    createdByCabinet: input?.createdByCabinet,
    createdAtISO: nowISO,
    importedAtISO: nowISO,
    importSource: input?.source ?? "csv",
    importSignals: draft.signals,
    importDataCertainty: draft.dataCertainty,
  }
}

export function buildClientImportTemplateCsv(): string {
  const headers = [
    "company_name",
    "cui",
    "contact_name",
    "contact_email",
    "phone",
    "sector",
    "employees",
    "city",
    "country",
    "service_scope",
    "expected_ai_role",
    "uses_ai",
    "known_ai_tools",
    "personal_data_ai",
    "high_risk_suspected",
    "assigned_to",
    "client_status",
    "intake_email",
    "send_intake",
    "tags",
    "external_id",
    "notes",
  ]
  const example = [
    "Apex Logistic SRL",
    "RO12345678",
    "Maria Ionescu",
    "maria@example.com",
    "+40722111222",
    "transport",
    "12",
    "Bucuresti",
    "RO",
    "ai_act;gdpr;ai_literacy",
    "deployer",
    "yes",
    "ChatGPT;Copilot;chatbot site",
    "yes",
    "unknown",
    "Daniel",
    "active",
    "maria@example.com",
    "yes",
    "priority;B2B",
    "apex-001",
    "Client importat pentru audit pack initial",
  ]
  return `${headers.join(",")}\n${example.map((value) => `"${value.replace(/"/g, '""')}"`).join(",")}\n`
}

export function buildAISystemImportTemplateCsv(): string {
  const headers = [
    "client_external_id",
    "client_cui",
    "client_name",
    "system_name",
    "purpose",
    "vendor",
    "model_type",
    "uses_personal_data",
    "automated_decisions",
    "impacts_rights",
    "human_review",
    "owner",
    "stage",
    "external_id",
    "tags",
    "notes",
  ]
  const example = [
    "apex-001",
    "RO12345678",
    "Apex Logistic SRL",
    "ChatGPT Team",
    "support-chatbot",
    "OpenAI",
    "GPT-4o",
    "yes",
    "no",
    "no",
    "yes",
    "Maria Ionescu",
    "live",
    "ai-apex-chatgpt-team",
    "customer-support;copilot",
    "Asistent folosit pentru răspunsuri draft către clienți.",
  ]
  return `${headers.join(",")}\n${example.map((value) => `"${value.replace(/"/g, '""')}"`).join(",")}\n`
}

export function buildVendorModelImportTemplateCsv(): string {
  const headers = [
    "client_external_id",
    "client_cui",
    "client_name",
    "vendor_name",
    "legal_entity",
    "product_used",
    "region",
    "role",
    "service_category",
    "dpa_status",
    "transfer_mechanism",
    "subprocessors",
    "iso27001",
    "soc2",
    "training_on_customer_data",
    "input_retention",
    "model_transparency",
    "contact_email",
    "personal_data",
    "external_id",
    "notes",
  ]
  const example = [
    "apex-001",
    "RO12345678",
    "Apex Logistic SRL",
    "OpenAI",
    "OpenAI Ireland Ltd.",
    "ChatGPT Team",
    "US",
    "processor",
    "LLM / chatbot",
    "signed",
    "scc_controller_processor",
    "Stripe;AWS",
    "yes",
    "yes",
    "no",
    "no_retention",
    "partial",
    "dpa@openai.com",
    "yes",
    "vendor-openai-chatgpt",
    "DPA primit; verifică setările de training data.",
  ]
  return `${headers.join(",")}\n${example.map((value) => `"${value.replace(/"/g, '""')}"`).join(",")}\n`
}

export function buildRopaImportTemplateCsv(): string {
  const headers = [
    "client_external_id",
    "client_cui",
    "client_name",
    "department",
    "activity_name",
    "owner",
    "purpose",
    "data_subjects",
    "data_categories",
    "special_categories",
    "legal_basis",
    "article9_condition",
    "recipients",
    "processors",
    "systems",
    "retention",
    "security_measures",
    "third_country_transfers",
    "external_id",
    "notes",
  ]
  const example = [
    "apex-001",
    "RO12345678",
    "Apex Logistic SRL",
    "Support",
    "Chatbot suport clienți",
    "Maria Ionescu",
    "Răspuns solicitări clienți",
    "clienți;prospecti",
    "email;mesaje chat;istoric comenzi",
    "",
    "contract",
    "",
    "echipa suport",
    "OpenAI",
    "ChatGPT Team",
    "12 luni",
    "MFA;access logs",
    "US:SCC",
    "ropa-chatbot-support",
    "Import inițial din data map client.",
  ]
  return `${headers.join(",")}\n${example.map((value) => `"${value.replace(/"/g, '""')}"`).join(",")}\n`
}

export function buildLiteracyImportTemplateCsv(): string {
  const headers = [
    "client_external_id",
    "client_cui",
    "client_name",
    "employee_name",
    "role",
    "training_date",
    "training_type",
    "topics",
    "trainer",
    "duration_hours",
    "attestation_signed",
    "external_id",
    "notes",
  ]
  const example = [
    "apex-001",
    "RO12345678",
    "Apex Logistic SRL",
    "Maria Ionescu",
    "Customer support",
    "2026-05-20",
    "workshop",
    "Art. 4;ChatGPT policy;date personale în AI",
    "Daniel",
    "2.5",
    "yes",
    "emp-maria-ionescu",
    "A semnat politica internă AI.",
  ]
  return `${headers.join(",")}\n${example.map((value) => `"${value.replace(/"/g, '""')}"`).join(",")}\n`
}
