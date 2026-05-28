import { readFileSync } from "node:fs"
import { join } from "node:path"

const ROOT = process.cwd()
const BASE_URL = process.env.COMPLIROAI_BASE_URL || "http://localhost:3001"
const COOKIE_FILE = process.env.COMPLIROAI_COOKIE_FILE || join(ROOT, ".data", "codex-supabase-test-cookies.txt")
const TEST_CASE_ID = process.env.COMPLIROAI_TEST_CASE_ID || "E2E-CHAT-001"
const MISTRAL_MODEL = process.env.COMPLIROAI_MISTRAL_MODEL || process.env.MISTRAL_MODEL || ""
const MISTRAL_TIMEOUT_MS = readNumberEnv("COMPLIROAI_MISTRAL_TIMEOUT_MS")
const MISTRAL_MAX_TOKENS = readNumberEnv("COMPLIROAI_MISTRAL_MAX_TOKENS")

async function main() {
  const cabinetCookie = readSessionCookie(COOKIE_FILE)
  const useCaseRow = readCsvRow(
    join(ROOT, "tests/fixtures/compliroai_e2e_fixture_pack/imports/ai_use_cases_systems.csv"),
    (row) => row.test_case_id === TEST_CASE_ID,
  )
  const clientRow = readCsvRow(
    join(ROOT, "tests/fixtures/compliroai_e2e_fixture_pack/imports/cabinet_clients.csv"),
    (row) => row.cui === useCaseRow.client_cui,
  )

  const portfolio = await apiFetch("/api/portfolio/clients", { cookie: cabinetCookie })
  const matchingClients = [...(portfolio.clients ?? [])]
    .filter((item) => item.cui === clientRow.cui || item.orgName === clientRow.company_name)
    .sort((left, right) => String(right.createdAtISO || "").localeCompare(String(left.createdAtISO || "")))

  const existingClient = matchingClients.length > 0
    ? await selectBestClientWorkspace(cabinetCookie, matchingClients)
    : null

  const clientCreate = existingClient
    ? null
    : await apiFetch("/api/portfolio/clients", {
        method: "POST",
        cookie: cabinetCookie,
        json: {
          orgName: clientRow.company_name,
          cui: clientRow.cui,
          contactEmail: clientRow.contact_email,
          contactName: clientRow.contact_name,
          sector: clientRow.industry,
          employees: clientRow.employees_count,
          serviceScope: String(clientRow.service_scope || "")
            .split(";")
            .map((item) => item.trim())
            .filter(Boolean),
          usesAi: clientRow.uses_ai === "yes" || clientRow.uses_ai === "no" ? clientRow.uses_ai : "unknown",
          personalDataAi:
            clientRow.personal_data_ai === "yes" || clientRow.personal_data_ai === "no"
              ? clientRow.personal_data_ai
              : "unknown",
          sendIntake: clientRow.send_intake === "yes",
          notes: clientRow.notes,
        },
      })

  const clientOrgId = existingClient?.orgId ?? clientCreate?.client?.orgId
  if (!clientOrgId) {
    throw new Error(`Client creation did not return orgId: ${JSON.stringify(clientCreate)}`)
  }

  const importRow = {
    rowNumber: 2,
    raw: useCaseRow,
    clientCui: useCaseRow.client_cui,
    clientMatcher: {
      type: "cui",
      value: useCaseRow.client_cui,
    },
    systemName: useCaseRow.system_name,
    useCaseName: useCaseRow.use_case,
    department: useCaseRow.department,
    purpose: useCaseRow.purpose,
    purposeRaw: useCaseRow.purpose,
    vendor: useCaseRow.vendor_name,
    modelType: useCaseRow.model_name,
    usesPersonalDataAnswer: useCaseRow.personal_data,
    confidentialDataAnswer: useCaseRow.confidential_data,
    automatedDecisionsAnswer: useCaseRow.automated_decision,
    impactsRightsAnswer: "unknown",
    humanReviewAnswer: useCaseRow.human_review,
    publicOutputAnswer: useCaseRow.public_output,
    affectedPersons: String(useCaseRow.affected_persons || "")
      .split(";")
      .map((item) => item.trim())
      .filter(Boolean),
    usesPersonalData: useCaseRow.personal_data === "yes",
    makesAutomatedDecisions: useCaseRow.automated_decision === "yes",
    impactsRights: false,
    hasHumanReview: useCaseRow.human_review === "required_before_action" || useCaseRow.human_review === "sample_review",
    owner: useCaseRow.owner_email,
    stage: useCaseRow.status,
    tags: [],
    errors: [],
    warnings: [],
    duplicateKey: `cui:${useCaseRow.client_cui.toLowerCase()}:name:${slug(useCaseRow.system_name)}:${slug(useCaseRow.vendor_name)}:usecase:${slug(useCaseRow.use_case)}:${slug(useCaseRow.department)}`,
  }

  const importResult = await apiFetch("/api/portfolio/ai-systems/import", {
    method: "PUT",
    cookie: cabinetCookie,
    json: {
      importId: `live-${TEST_CASE_ID.toLowerCase()}-${Date.now()}`,
      rows: [importRow],
    },
  })

  const switchedCookie = await switchWorkspace(cabinetCookie, clientOrgId)
  const useCases = await apiFetch("/api/ai-use-cases", { cookie: switchedCookie })
  const findings = await apiFetch("/api/findings", { cookie: switchedCookie })
  const preview = await apiFetch("/api/ai-guidance?maxActions=6", { cookie: switchedCookie })
  const regenerate = await apiFetch("/api/ai-guidance", {
    method: "POST",
    cookie: switchedCookie,
    json: {
      action: "regenerate",
      reason: `script_${TEST_CASE_ID.toLowerCase()}`,
      maxActions: 6,
      ...(MISTRAL_MODEL ? { mistralModel: MISTRAL_MODEL } : {}),
      ...(MISTRAL_TIMEOUT_MS ? { mistralTimeoutMs: MISTRAL_TIMEOUT_MS } : {}),
      ...(MISTRAL_MAX_TOKENS ? { mistralMaxTokens: MISTRAL_MAX_TOKENS } : {}),
    },
  })

  const latestPlan = regenerate.record?.plan

  console.log(JSON.stringify({
    baseUrl: BASE_URL,
    testCaseId: TEST_CASE_ID,
    mistralOverride: {
      model: MISTRAL_MODEL || null,
      timeoutMs: MISTRAL_TIMEOUT_MS ?? null,
      maxTokens: MISTRAL_MAX_TOKENS ?? null,
    },
    client: {
      companyName: clientRow.company_name,
      orgId: clientOrgId,
      reusedExistingClient: Boolean(existingClient),
    },
    importResult: {
      imported: importResult.imported,
      generatedFindings: importResult.generatedFindings?.map((item) => item.title) ?? [],
      aiUseCaseTablePersisted: importResult.aiUseCaseTablePersisted,
      aiUseCasePersistenceWarning: importResult.aiUseCasePersistenceWarning,
    },
    useCases: (useCases.useCases ?? []).map((item) => ({
      id: item.id,
      useCaseName: item.useCaseName,
      draftRiskLevel: item.draftRiskLevel,
      certaintyStatus: item.certaintyStatus,
      reviewStatus: item.reviewStatus,
      art50TransparencyTrigger: item.art50TransparencyTrigger,
      gdprReviewNeeded: item.gdprReviewNeeded,
      vendorReviewNeeded: item.vendorReviewNeeded,
      humanOversightNeeded: item.humanOversightNeeded,
    })),
    findings: (findings.findings ?? []).map((item) => ({
      id: item.id,
      title: item.title,
      severity: item.severity,
      category: item.category,
      legalReference: item.legalReference,
      sourceDocument: item.sourceDocument,
    })),
    preview: {
      latestModelLabel: preview.latest?.plan?.modelLabel ?? null,
      previewModelLabel: preview.preview?.modelLabel ?? null,
      previewActionTitles: (preview.preview?.actions ?? []).map((item) => item.title),
    },
    regenerate: latestPlan ? {
      modelLabel: latestPlan.modelLabel,
      summary: latestPlan.summary,
      guardrails: latestPlan.guardrails,
      actionTitles: (latestPlan.actions ?? []).map((item) => item.title),
    } : regenerate,
  }, null, 2))
}

function readSessionCookie(path) {
  const cookieLine = readFileSync(path, "utf8")
    .split("\n")
    .find((line) => line.includes("\taiact_session\t"))
  if (!cookieLine) {
    throw new Error(`Missing aiact_session in cookie file: ${path}`)
  }
  const parts = cookieLine.trim().split("\t")
  return `${parts[5]}=${parts[6]}`
}

function readCsvRow(path, predicate) {
  const [headerLine, ...lines] = readFileSync(path, "utf8")
    .replace(/^\uFEFF/, "")
    .trim()
    .split(/\r?\n/)
  const headers = parseCsvLine(headerLine)
  for (const line of lines) {
    const values = parseCsvLine(line)
    const row = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]))
    if (predicate(row)) return row
  }
  throw new Error(`CSV row not found in ${path}`)
}

function parseCsvLine(line) {
  const values = []
  let current = ""
  let inQuotes = false

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    const next = line[index + 1]

    if (char === "\"") {
      if (inQuotes && next === "\"") {
        current += "\""
        index += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === "," && !inQuotes) {
      values.push(current)
      current = ""
      continue
    }

    current += char
  }

  values.push(current)
  return values
}

function slug(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function readNumberEnv(name) {
  const value = process.env[name]
  if (!value) return undefined
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : undefined
}

async function switchWorkspace(cookie, orgId) {
  const response = await fetch(`${BASE_URL}/api/workspaces/switch`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
    },
    body: JSON.stringify({ orgId }),
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(`Workspace switch failed: ${response.status} ${JSON.stringify(payload)}`)
  }

  const setCookie = response.headers.get("set-cookie")
  if (!setCookie) {
    throw new Error("Workspace switch did not return a session cookie.")
  }
  const match = setCookie.match(/aiact_session=([^;]+)/)
  if (!match) {
    throw new Error("Workspace switch returned an unexpected cookie payload.")
  }
  return `aiact_session=${match[1]}`
}

async function selectBestClientWorkspace(cabinetCookie, clients) {
  let best = null

  for (const client of clients) {
    try {
      const switchedCookie = await switchWorkspace(cabinetCookie, client.orgId)
      const useCases = await apiFetch("/api/ai-use-cases", { cookie: switchedCookie })
      const score = Array.isArray(useCases.useCases) ? useCases.useCases.length : 0
      if (!best || score > best.score) {
        best = { ...client, score }
      }
    } catch {
      // Ignore broken candidates and continue with the next matching client.
    }
  }

  return best ?? clients[0]
}

async function apiFetch(pathname, input) {
  const response = await fetch(`${BASE_URL}${pathname}`, {
    method: input.method || "GET",
    headers: {
      "Content-Type": "application/json",
      Cookie: input.cookie,
    },
    body: input.json ? JSON.stringify(input.json) : undefined,
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(`${pathname} failed: ${response.status} ${JSON.stringify(payload)}`)
  }
  return payload
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
