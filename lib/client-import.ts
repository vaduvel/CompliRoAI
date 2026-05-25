import type {
  ClientExpectedAIRole,
  ClientImportSignal,
  ClientImportYesNoUnknown,
  ClientMeta,
  ClientServiceScope,
  ClientStatus,
} from "@/lib/compliance/types"

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

function cell(
  values: string[],
  mapping: Partial<Record<ClientImportCanonicalColumn, number>>,
  column: ClientImportCanonicalColumn
): string | undefined {
  const index = mapping[column]
  if (typeof index !== "number") return undefined
  return clean(values[index])
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
      expectedAiRole: normalizeRole(cell(values, mapping, "expectedAiRole")),
      usesAi,
      knownAiTools,
      personalDataAi,
      highRiskSuspected,
      assignedTo: cell(values, mapping, "assignedTo"),
      clientStatus: normalizeStatus(cell(values, mapping, "clientStatus")),
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
