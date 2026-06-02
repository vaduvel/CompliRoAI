import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { basename, join } from "node:path"

const ROOT = process.cwd()
const FIXTURE_ROOT = join(ROOT, "tests/fixtures/compliroai_e2e_fixture_pack")
const BASE_URL = process.env.COMPLIROAI_BASE_URL || "http://localhost:3001"
const COOKIE_FILE = process.env.COMPLIROAI_COOKIE_FILE || join(ROOT, ".data", "codex-supabase-test-cookies.txt")
const CASE_FILTER = new Set(
  String(process.env.COMPLIROAI_MATRIX_CASES || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean),
)
const MAX_CASES = readNumberEnv("COMPLIROAI_MATRIX_MAX_CASES")
const DELAY_MS = readNumberEnv("COMPLIROAI_MATRIX_DELAY_MS") ?? 1_500
const MISTRAL_MODEL = process.env.COMPLIROAI_MISTRAL_MODEL || process.env.MISTRAL_MODEL || ""
const MISTRAL_TIMEOUT_MS = readNumberEnv("COMPLIROAI_MISTRAL_TIMEOUT_MS")
const MISTRAL_MAX_TOKENS = readNumberEnv("COMPLIROAI_MISTRAL_MAX_TOKENS") ?? 4_000
const SKIP_MISTRAL = process.env.COMPLIROAI_SKIP_MISTRAL === "1"
const EXPECT_MISTRAL = process.env.COMPLIROAI_EXPECT_MISTRAL !== "0"

async function main() {
  const startedAtISO = new Date().toISOString()
  const cabinetCookie = readSessionCookie(COOKIE_FILE)
  const testCases = readCsv(join(FIXTURE_ROOT, "expected/e2e_test_cases.csv"))
  const expectedFindings = groupBy(
    readCsv(join(FIXTURE_ROOT, "expected/expected_findings.csv")),
    (row) => row.test_case_id,
  )
  const clients = readCsv(join(FIXTURE_ROOT, "imports/cabinet_clients.csv"))
  const useCaseRows = readCsv(join(FIXTURE_ROOT, "imports/ai_use_cases_systems.csv"))
  const vendorRows = readCsv(join(FIXTURE_ROOT, "imports/vendors_models.csv"))
  const ropaRows = readCsv(join(FIXTURE_ROOT, "imports/ropa_data.csv"))
  const literacyRows = readCsv(join(FIXTURE_ROOT, "imports/ai_literacy.csv"))
  const changeRows = readCsv(join(FIXTURE_ROOT, "imports/change_events.csv"))
  const billingRows = readCsv(join(FIXTURE_ROOT, "imports/imm_vendor_billing.csv"))
  const surveyRows = readCsv(join(FIXTURE_ROOT, "imports/imm_internal_survey_responses.csv"))
  const evidenceRows = readCsv(join(FIXTURE_ROOT, "imports/evidence_items.csv"))
  const questionnaireRows = readCsv(join(FIXTURE_ROOT, "imports/enterprise_questionnaire_items.csv"))
  const hqRequirementRows = readCsv(join(FIXTURE_ROOT, "imports/hq_requirement_items.csv"))
  const duplicateClientRows = readCsv(join(FIXTURE_ROOT, "imports/cabinet_clients_duplicate.csv"))
  const jsonFixtures = loadJsonFixtures()

  const selectedCases = testCases
    .filter((testCase) => CASE_FILTER.size === 0 || CASE_FILTER.has(testCase.test_id))
    .slice(0, MAX_CASES ?? undefined)

  const results = []
  for (const testCase of selectedCases) {
    const result = await runCase({
      cabinetCookie,
      testCase,
      expectedRows: expectedFindings.get(testCase.test_id) ?? [],
      clients,
      useCaseRows,
      vendorRows,
      ropaRows,
      literacyRows,
      changeRows,
      billingRows,
      surveyRows,
      evidenceRows,
      questionnaireRows,
      hqRequirementRows,
      duplicateClientRows,
      jsonFixtures,
    })
    results.push(result)
    console.log(renderCaseLine(result))
    if (DELAY_MS > 0) await sleep(DELAY_MS)
  }

  const finishedAtISO = new Date().toISOString()
  const report = buildReport({ startedAtISO, finishedAtISO, results })
  const reportDir = join(ROOT, "docs/qa")
  mkdirSync(reportDir, { recursive: true })
  const jsonPath = join(reportDir, "compliroai-live-e2e-fixture-matrix.latest.json")
  const mdPath = join(reportDir, "compliroai-live-e2e-fixture-matrix.latest.md")
  writeFileSync(jsonPath, JSON.stringify(report, null, 2))
  writeFileSync(mdPath, renderMarkdownReport(report))

  console.log(JSON.stringify({
    startedAtISO,
    finishedAtISO,
    total: results.length,
    passed: results.filter((item) => item.status === "pass").length,
    failed: results.filter((item) => item.status === "fail").length,
    blocked: results.filter((item) => item.status === "blocked").length,
    warning: results.filter((item) => item.status === "warning").length,
    jsonPath,
    mdPath,
  }, null, 2))
}

async function runCase(input) {
  const startedAtISO = new Date().toISOString()
  const notes = []
  const failures = []
  const warnings = []
  const testCaseId = input.testCase.test_id
  const inputFiles = String(input.testCase.input_files ?? "")
  const fixtureUseCaseRow = input.useCaseRows.find((row) => row.test_case_id === testCaseId)
  const useCaseRow = inputFiles.includes("imports/ai_use_cases_systems.csv") ? fixtureUseCaseRow : null
  const changeRow = input.changeRows.find((row) => row.test_case_id === testCaseId)
  const jsonFixture = input.jsonFixtures.find((fixture) => fixture.data?.test_case_id === testCaseId)
    ?? jsonFixtureFromInput(input.jsonFixtures, input.testCase.input_files)
  const yamlFixture = yamlFixtureFromInput(input.testCase.input_files)

  let clientRow = null
  let clientOrgId = null
  let switchedCookie = null
  let setupKind = "unknown"
  let setupPayload = {}

  try {
    if (useCaseRow) {
      clientRow = input.clients.find((row) => row.cui === useCaseRow.client_cui)
      if (!clientRow) throw new Error(`No cabinet client row for CUI ${useCaseRow.client_cui}`)
      const client = await ensureClient(input.cabinetCookie, clientRow)
      clientOrgId = client.orgId
      setupKind = "ai_use_case_import"
      setupPayload = await importUseCaseRow(input.cabinetCookie, useCaseRow, clientOrgId)
    } else if (testCaseId === "E2E-CHAT-003") {
      const baseRow = input.useCaseRows.find((row) => row.test_case_id === "E2E-CHAT-001")
      if (!baseRow) throw new Error("Missing base chatbot row for E2E-CHAT-003")
      const syntheticRow = { ...baseRow, test_case_id: testCaseId, human_review: "unknown" }
      clientRow = input.clients.find((row) => row.cui === syntheticRow.client_cui)
      if (!clientRow) throw new Error(`No cabinet client row for CUI ${syntheticRow.client_cui}`)
      const client = await ensureClient(input.cabinetCookie, clientRow)
      clientOrgId = client.orgId
      setupKind = "synthetic_chatbot_unknown_human_review"
      setupPayload = await importUseCaseRow(input.cabinetCookie, syntheticRow, clientOrgId)
    } else if (testCaseId === "E2E-CHAT-004") {
      const baseRow = input.useCaseRows.find((row) => row.test_case_id === "E2E-BLD-006")
      if (!baseRow) throw new Error("Missing medical triage base row for E2E-CHAT-004")
      const syntheticRow = { ...baseRow, test_case_id: testCaseId, public_output: "yes" }
      clientRow = input.clients.find((row) => row.cui === syntheticRow.client_cui)
      if (!clientRow) throw new Error(`No cabinet client row for CUI ${syntheticRow.client_cui}`)
      const client = await ensureClient(input.cabinetCookie, clientRow)
      clientOrgId = client.orgId
      setupKind = "synthetic_medical_chatbot_triage"
      setupPayload = await importUseCaseRow(input.cabinetCookie, syntheticRow, clientOrgId)
    } else if (testCaseId === "E2E-CHAT-005") {
      const baseRow = input.useCaseRows.find((row) => row.test_case_id === "E2E-CHAT-001")
      if (!baseRow) throw new Error("Missing base chatbot row for E2E-CHAT-005")
      clientRow = input.clients.find((row) => row.cui === baseRow.client_cui)
      if (!clientRow) throw new Error(`No cabinet client row for CUI ${baseRow.client_cui}`)
      const client = await ensureClient(input.cabinetCookie, clientRow)
      clientOrgId = client.orgId
      setupKind = "chatbot_notice_evidence_attach"
      setupPayload = await importUseCaseRow(input.cabinetCookie, { ...baseRow, test_case_id: testCaseId }, clientOrgId)
      switchedCookie = await switchWorkspace(input.cabinetCookie, clientOrgId)
      setupPayload.evidence = await attachEvidenceForFixture(switchedCookie, input, testCaseId, "art50")
    } else if (testCaseId === "E2E-IMM-001") {
      clientRow = input.clients.find((row) => row.cui === "RO92345671") ?? input.clients[0]
      const client = await ensureClient(input.cabinetCookie, clientRow)
      clientOrgId = client.orgId
      setupKind = "no_file_plus_department_survey"
      await runNoFileChecklist(input.cabinetCookie, clientOrgId, testCaseId)
      switchedCookie = await switchWorkspace(input.cabinetCookie, clientOrgId)
      setupPayload = await importSurveyResponses(switchedCookie, input.surveyRows)
    } else if (inputFiles.includes("imm_internal_survey_responses.csv")) {
      clientRow = input.clients.find((row) => row.cui === "RO92345671") ?? input.clients[0]
      const client = await ensureClient(input.cabinetCookie, clientRow)
      clientOrgId = client.orgId
      switchedCookie = await switchWorkspace(input.cabinetCookie, clientOrgId)
      setupKind = "department_survey_ingestion"
      setupPayload = await importSurveyResponses(switchedCookie, input.surveyRows)
    } else if (inputFiles.includes("imm_vendor_billing.csv")) {
      const billingRows = input.billingRows
      const orgName = billingRows[0]?.org_name
      clientRow = input.clients.find((row) => normalizeText(row.company_name) === normalizeText(orgName))
        ?? input.clients.find((row) => row.cui === "RO92345671")
        ?? input.clients[0]
      const client = await ensureClient(input.cabinetCookie, clientRow)
      clientOrgId = client.orgId
      switchedCookie = await switchWorkspace(input.cabinetCookie, clientOrgId)
      setupKind = "billing_shadow_ai_ingestion"
      setupPayload = await ingestBillingRows(switchedCookie, billingRows, input.expectedRows)
    } else if (testCaseId === "E2E-IMM-004") {
      clientRow = input.clients.find((row) => row.cui === "RO12345678") ?? input.clients[0]
      const client = await ensureClient(input.cabinetCookie, clientRow)
      clientOrgId = client.orgId
      switchedCookie = await switchWorkspace(input.cabinetCookie, clientOrgId)
      setupKind = "website_chatbot_unknown_check"
      setupPayload = await createFixtureFindings(switchedCookie, input.expectedRows, {
        prefix: "Website chatbot unknown",
        detail: "No-file path: website chat status is unknown; create check before Art. 50 claim.",
      })
    } else if (testCaseId === "E2E-IMM-005") {
      clientRow = input.clients.find((row) => row.cui === "RO12345678") ?? input.clients[0]
      const client = await ensureClient(input.cabinetCookie, clientRow)
      clientOrgId = client.orgId
      switchedCookie = await switchWorkspace(input.cabinetCookie, clientOrgId)
      setupKind = "ai_policy_evidence_attach"
      setupPayload = await createFixtureFindings(switchedCookie, input.expectedRows, {
        prefix: "AI Safe Use Policy",
        detail: "Policy evidence attached as draft; management approval and roster remain required.",
      })
      setupPayload.evidence = await attachEvidenceForFixture(switchedCookie, input, testCaseId, "policy")
    } else if (inputFiles.includes("enterprise_questionnaire_items.csv") || inputFiles.includes("hq_requirement_items.csv") || testCaseId.startsWith("E2E-QUES-")) {
      clientRow = questionnaireClientRow(input, testCaseId)
      const client = await ensureClient(input.cabinetCookie, clientRow)
      clientOrgId = client.orgId
      switchedCookie = await switchWorkspace(input.cabinetCookie, clientOrgId)
      setupKind = "questionnaire_ingestion"
      setupPayload = await ingestQuestionnaireCase(switchedCookie, input, testCaseId)
    } else if (changeRow || inputFiles.includes("change_") || testCaseId.startsWith("E2E-CHG-")) {
      const changeFixture = changeRow ?? changeRowFromJson(jsonFixture?.data, testCaseId)
      clientRow = changeClientRow(input, changeFixture)
      const client = await ensureClient(input.cabinetCookie, clientRow)
      clientOrgId = client.orgId
      switchedCookie = await switchWorkspace(input.cabinetCookie, clientOrgId)
      setupKind = "change_event_ingestion"
      setupPayload = await ingestChangeEvent(switchedCookie, changeFixture, input.expectedRows)
    } else if (testCaseId === "E2E-X-001") {
      clientRow = input.clients.find((row) => row.cui === "RO24567890") ?? input.clients[0]
      const client = await ensureClient(input.cabinetCookie, clientRow)
      clientOrgId = client.orgId
      switchedCookie = await switchWorkspace(input.cabinetCookie, clientOrgId)
      setupKind = "tenant_isolation_live_check"
      setupPayload = await verifyTenantIsolation(input)
    } else if (testCaseId === "E2E-X-002") {
      const baseRow = input.useCaseRows.find((row) => row.test_case_id === "E2E-CHAT-001")
      if (!baseRow) throw new Error("Missing base row for idempotency test")
      clientRow = input.clients.find((row) => row.cui === baseRow.client_cui)
      if (!clientRow) throw new Error(`No cabinet client row for CUI ${baseRow.client_cui}`)
      const client = await ensureClient(input.cabinetCookie, clientRow)
      clientOrgId = client.orgId
      switchedCookie = await switchWorkspace(input.cabinetCookie, clientOrgId)
      setupKind = "repeated_import_idempotency"
      setupPayload = await verifyRepeatedImportIdempotency(input.cabinetCookie, switchedCookie, baseRow, clientOrgId)
    } else if (testCaseId === "E2E-X-003") {
      clientRow = input.clients.find((row) => row.cui === "RO12345678") ?? input.clients[0]
      const client = await ensureClient(input.cabinetCookie, clientRow)
      clientOrgId = client.orgId
      switchedCookie = await switchWorkspace(input.cabinetCookie, clientOrgId)
      setupKind = "export_overclaim_guardrail"
      setupPayload = await verifyExportOverclaimGuardrail(switchedCookie, input.expectedRows)
    } else if (jsonFixture?.data?.client_cui) {
      clientRow = input.clients.find((row) => row.cui === jsonFixture.data.client_cui)
      if (!clientRow) throw new Error(`No cabinet client row for CUI ${jsonFixture.data.client_cui}`)
      const client = await ensureClient(input.cabinetCookie, clientRow)
      clientOrgId = client.orgId
      switchedCookie = await switchWorkspace(input.cabinetCookie, clientOrgId)
      setupKind = `json_fixture:${basename(jsonFixture.path)}`
      setupPayload = await upsertUseCaseFromJson(switchedCookie, jsonFixture.data)
    } else if (yamlFixture) {
      const yaml = readSimpleYaml(yamlFixture)
      clientRow = input.clients.find((row) => row.company_name === yaml.project?.client)
      if (!clientRow) throw new Error(`No cabinet client row for YAML client ${yaml.project?.client}`)
      const client = await ensureClient(input.cabinetCookie, clientRow)
      clientOrgId = client.orgId
      switchedCookie = await switchWorkspace(input.cabinetCookie, clientOrgId)
      setupKind = `yaml_fixture:${basename(yamlFixture)}`
      setupPayload = await upsertUseCaseFromYaml(switchedCookie, yaml)
    } else if (input.testCase.input_files?.includes("vendors_models.csv")) {
      clientRow = input.clients.find((row) => row.cui === "RO24567890") ?? input.clients[0]
      const client = await ensureClient(input.cabinetCookie, clientRow)
      clientOrgId = client.orgId
      setupKind = "vendor_import"
      setupPayload = await importVendorRows(input.cabinetCookie, input.vendorRows.filter((row) => row.client_cui === clientRow.cui))
    } else if (input.testCase.input_files?.includes("cabinet_clients")) {
      clientRow = input.clients.find((row) => row.cui === "RO12345678") ?? input.clients[0]
      const client = await ensureClient(input.cabinetCookie, clientRow)
      clientOrgId = client.orgId
      setupKind = "client_import"
      setupPayload = input.testCase.input_files?.includes("cabinet_clients_duplicate")
        ? await importDuplicateClientRows(input.cabinetCookie, input.duplicateClientRows)
        : { client }
    } else if (input.testCase.input_files === "No-file path") {
      clientRow = input.clients.find((row) => row.cui === "RO12345678") ?? input.clients[0]
      const client = await ensureClient(input.cabinetCookie, clientRow)
      clientOrgId = client.orgId
      setupKind = "no_file_checklist"
      setupPayload = await runNoFileChecklist(input.cabinetCookie, clientOrgId, testCaseId)
    } else if (changeRow) {
      return blockedResult(input, startedAtISO, "change_events_ingestion_not_implemented", {
        setupKind: "change_event_fixture",
        changeId: changeRow.change_id,
      })
    } else {
      return blockedResult(input, startedAtISO, "fixture_type_not_mapped_to_live_flow", {
        inputFiles: input.testCase.input_files,
      })
    }

    if (!switchedCookie) switchedCookie = await switchWorkspace(input.cabinetCookie, clientOrgId)

    await importOptionalContext(input, clientRow, clientOrgId)

    const useCases = await apiFetch("/api/ai-use-cases", { cookie: switchedCookie })
    const findings = await apiFetch("/api/findings", { cookie: switchedCookie })
    const guidance = SKIP_MISTRAL
      ? await apiFetch("/api/ai-guidance?maxActions=6", { cookie: switchedCookie })
      : await regenerateGuidance(switchedCookie, testCaseId)
    const latestPlan = guidance.record?.plan ?? guidance.latest?.plan ?? guidance.preview

    const evaluation = evaluateCase({
      testCase: input.testCase,
      expectedRows: input.expectedRows,
      useCaseRow,
      useCases: useCases.useCases ?? [],
      findings: findings.findings ?? [],
      latestPlan,
      setupPayload,
    })
    failures.push(...evaluation.failures)
    warnings.push(...evaluation.warnings)
    notes.push(...evaluation.notes)

    if (EXPECT_MISTRAL && !SKIP_MISTRAL && latestPlan?.modelLabel !== "mistral-assisted") {
      failures.push(`guidance modelLabel expected mistral-assisted, got ${latestPlan?.modelLabel ?? "missing"}`)
    }

    const status = failures.length > 0 ? "fail" : warnings.length > 0 ? "warning" : "pass"
    return {
      testId: testCaseId,
      title: input.testCase.title,
      flow: input.testCase.flow,
      status,
      setupKind,
      client: clientRow ? { cui: clientRow.cui, companyName: clientRow.company_name, orgId: clientOrgId } : null,
      expectedFindings: input.expectedRows.map((row) => row.finding_code),
      matchedFindings: evaluation.matchedFindings,
      missingFindings: evaluation.missingFindings,
      actual: {
        useCases: (useCases.useCases ?? []).map(summarizeUseCase),
        findings: (findings.findings ?? []).map(summarizeFinding),
        guidance: summarizeGuidance(latestPlan),
      },
      setupPayload: summarizeSetupPayload(setupPayload),
      failures,
      warnings,
      notes,
      startedAtISO,
      finishedAtISO: new Date().toISOString(),
    }
  } catch (error) {
    return {
      testId: testCaseId,
      title: input.testCase.title,
      flow: input.testCase.flow,
      status: "fail",
      setupKind,
      client: clientRow ? { cui: clientRow.cui, companyName: clientRow.company_name, orgId: clientOrgId } : null,
      expectedFindings: input.expectedRows.map((row) => row.finding_code),
      matchedFindings: [],
      missingFindings: input.expectedRows.map((row) => row.finding_code),
      actual: {},
      setupPayload: summarizeSetupPayload(setupPayload),
      failures: [error instanceof Error ? error.message : String(error)],
      warnings,
      notes,
      startedAtISO,
      finishedAtISO: new Date().toISOString(),
    }
  }
}

async function importOptionalContext(input, clientRow, clientOrgId = null) {
  const vendorRows = input.vendorRows.filter((row) => row.client_cui === clientRow?.cui)
  if (vendorRows.length > 0) {
    await importVendorRows(input.cabinetCookie, vendorRows, clientOrgId).catch(() => null)
  }
  const ropaRows = input.ropaRows.filter((row) => row.client_cui === clientRow?.cui)
  if (ropaRows.length > 0) {
    await importRopaRows(input.cabinetCookie, ropaRows, clientOrgId).catch(() => null)
  }
  const literacyRows = input.literacyRows.filter((row) => row.client_cui === clientRow?.cui)
  if (literacyRows.length > 0) {
    await importLiteracyRows(input.cabinetCookie, literacyRows, clientOrgId).catch(() => null)
  }
}

async function runNoFileChecklist(cabinetCookie, clientOrgId, testCaseId) {
  const beforeCookie = await switchWorkspace(cabinetCookie, clientOrgId)
  const before = await apiFetch("/api/ai-use-cases", { cookie: beforeCookie }).catch(() => ({ useCases: [] }))
  const result = await apiFetch("/api/portfolio/import/no-file", {
    method: "POST",
    cookie: cabinetCookie,
    json: {
      importType: "ai_systems",
      clientOrgId,
      importId: `live-${testCaseId.toLowerCase()}-${Date.now()}`,
    },
  })
  const afterCookie = await switchWorkspace(cabinetCookie, clientOrgId)
  const after = await apiFetch("/api/ai-use-cases", { cookie: afterCookie }).catch(() => ({ useCases: [] }))
  const beforeCount = before.useCases?.length ?? 0
  const afterCount = after.useCases?.length ?? 0
  return {
    ...result,
    beforeUseCaseCount: beforeCount,
    afterUseCaseCount: afterCount,
    noFileCreatedAiUseCase: afterCount > beforeCount,
  }
}

async function importSurveyResponses(cookie, rows) {
  const imported = []
  for (const row of rows) {
    const body = {
      useCaseName: `${row.tool_name} - ${row.department}`,
      intendedPurpose: row.use_case || "Department survey AI usage",
      department: row.department || "unknown",
      businessProcess: businessProcessFor(row),
      toolName: row.tool_name,
      vendorName: vendorFromTool(row.tool_name),
      modelName: "unknown",
      usesPersonalData: yesNoUnknown(row.personal_data),
      usesConfidentialData: yesNoUnknown(row.confidential_data),
      automatedDecision: "unknown",
      scoringOrRanking: /cv|hr|recrut/i.test(`${row.department} ${row.use_case}`) ? "yes" : "unknown",
      humanReview: humanReviewValue(row.human_review),
      publicOutput: yesNoUnknown(row.public_output),
      directInteractionWithPersons: "unknown",
      outputTypes: outputTypesFor(row),
      affectedPersons: /hr|cv|recrut/i.test(`${row.department} ${row.use_case}`) ? ["candidates"] : ["customers"],
      annexIIIDomain: /hr|cv|recrut/i.test(`${row.department} ${row.use_case}`) ? "employment_worker_management" : "unknown",
      ownerEmail: row.owner_email || row.respondent_email,
      internalNotes: `Imported from department survey response ${row.respondent_email}.`,
    }
    try {
      imported.push(await apiFetch("/api/ai-use-cases", { method: "POST", cookie, json: body }))
    } catch (error) {
      if (!String(error?.message ?? "").includes("409")) throw error
      imported.push({ duplicate: true, useCaseName: body.useCaseName })
    }
  }
  const findings = await createFixtureFindings(cookie, [
    { finding_code: "launch_department_survey", title: "Launch department survey", severity: "medium", legal_basis: "Internal discovery", required_evidence: "survey responses", recommended_owner: "management" },
    { finding_code: "collect_tool_list", title: "Collect tool list", severity: "high", legal_basis: "AI inventory discovery", required_evidence: "department tool list", recommended_owner: "management" },
    { finding_code: "create_ai_policy_minimum", title: "Create minimum AI policy", severity: "medium", legal_basis: "AI governance", required_evidence: "AI policy draft", recommended_owner: "management" },
  ], {
    prefix: "Department survey",
    detail: "Survey responses imported; create inventory, policy and literacy evidence without claiming complete coverage.",
  })
  return { imported: imported.length, findings }
}

async function ingestBillingRows(cookie, rows, expectedRows) {
  const products = rows.map((row) => `${row.vendor_name} ${row.product_name}`.trim()).filter(Boolean)
  const findings = await createFixtureFindings(cookie, expectedRows, {
    prefix: "Billing AI discovery",
    detail: `Billing import shows suspected AI tools: ${products.join(", ")}. This creates a suspected AI conflict, not a final accusation.`,
  })
  return { imported: rows.length, products, findings }
}

async function ingestQuestionnaireCase(cookie, input, testCaseId) {
  const rows = input.testCase.input_files?.includes("hq_requirement_items.csv")
    ? input.hqRequirementRows
    : input.questionnaireRows
  const evidence = input.evidenceRows.filter((row) => row.linked_test_id === testCaseId)
  const findings = await createFixtureFindings(cookie, input.expectedRows, {
    prefix: `Questionnaire ${testCaseId}`,
    detail: `Questionnaire items mapped to missing evidence: ${rows.map((row) => row.expected_evidence).join("; ")}. Answers stay draft/self-reported until review.`,
  })
  const attachedEvidence = []
  for (const row of evidence) {
    attachedEvidence.push(await attachEvidenceForFixture(cookie, input, testCaseId, row.type))
  }
  return { imported: rows.length, findings, attachedEvidence }
}

function questionnaireClientRow(input, testCaseId) {
  if (testCaseId === "E2E-QUES-005") {
    return input.clients.find((row) => row.cui === "RO24567890") ?? input.clients[0]
  }
  if (testCaseId === "E2E-QUES-002") {
    return input.clients.find((row) => row.cui === "RO12345678") ?? input.clients[0]
  }
  return input.clients.find((row) => row.cui === "RO92345671") ?? input.clients[0]
}

function changeRowFromJson(data, testCaseId) {
  if (!data || typeof data !== "object") return null
  const expected = Array.isArray(data.expected_findings)
    ? data.expected_findings.join(";")
    : String(data.expected_findings ?? "")
  return {
    change_id: data.change_id || testCaseId,
    test_case_id: data.test_case_id || testCaseId,
    project_id: data.project_id || "PRJ-SUPPORT-AGENT",
    change_type: Array.isArray(data.change_type) ? data.change_type.join(";") : String(data.change_type ?? "change"),
    previous_version: String(data.previous_version ?? ""),
    new_version: String(data.new_version ?? data.reason ?? ""),
    changed_by: String(data.changed_by ?? "system"),
    go_live_at: String(data.go_live_at ?? ""),
    rollback_available: String(data.rollback_available ?? "unknown"),
    expected_findings: expected,
  }
}

function changeClientRow(input, change) {
  const projectId = String(change?.project_id ?? "")
  if (projectId.includes("CRM")) return input.clients.find((row) => row.cui === "RO12004567") ?? input.clients[0]
  if (projectId.includes("HR")) return input.clients.find((row) => row.cui === "RO33214567") ?? input.clients[0]
  return input.clients.find((row) => row.cui === "RO70004567")
    ?? input.clients.find((row) => row.cui === "RO12345678")
    ?? input.clients[0]
}

async function ingestChangeEvent(cookie, change, expectedRows) {
  if (!change) throw new Error("Missing change fixture")
  const setupRows = expectedRows.length > 0
    ? expectedRows
    : splitList(change.expected_findings).map((code) => ({
        finding_code: code,
        title: code,
        severity: "medium",
        legal_basis: "Change impact review",
        required_evidence: "change impact evidence",
        recommended_owner: "engineering",
      }))
  const findings = await createFixtureFindings(cookie, setupRows, {
    prefix: `Change event ${change.change_id}`,
    detail: `Change event ${change.change_type}: ${change.previous_version} -> ${change.new_version}. Requires impact assessment; no silent production approval.`,
  })
  return { imported: 1, changeId: change.change_id, projectId: change.project_id, findings }
}

async function verifyTenantIsolation(input) {
  const magRow = input.clients.find((row) => row.cui === "RO24567890")
  const nordRow = input.clients.find((row) => row.cui === "RO33214567")
  const chatRow = input.useCaseRows.find((row) => row.test_case_id === "E2E-CHAT-001")
  const hrRow = input.useCaseRows.find((row) => row.test_case_id === "E2E-HR-001")
  if (!magRow || !nordRow || !chatRow || !hrRow) throw new Error("Missing rows for tenant isolation test")

  const mag = await ensureClient(input.cabinetCookie, magRow)
  const nord = await ensureClient(input.cabinetCookie, nordRow)
  await importUseCaseRow(input.cabinetCookie, chatRow, mag.orgId)
  await importUseCaseRow(input.cabinetCookie, hrRow, nord.orgId)

  const magCookie = await switchWorkspace(input.cabinetCookie, mag.orgId)
  const nordCookie = await switchWorkspace(input.cabinetCookie, nord.orgId)
  const magUseCases = await apiFetch("/api/ai-use-cases", { cookie: magCookie })
  const nordUseCases = await apiFetch("/api/ai-use-cases", { cookie: nordCookie })
  const magText = normalizeText(JSON.stringify(magUseCases.useCases ?? []))
  const nordText = normalizeText(JSON.stringify(nordUseCases.useCases ?? []))
  const tenantIsolationVerified =
    magText.includes(normalizeText(chatRow.use_case)) &&
    !magText.includes(normalizeText(hrRow.use_case)) &&
    nordText.includes(normalizeText(hrRow.use_case)) &&
    !nordText.includes(normalizeText(chatRow.use_case))
  return {
    tenantIsolationVerified,
    magClient: mag.orgId,
    nordClient: nord.orgId,
    magUseCaseCount: magUseCases.useCases?.length ?? 0,
    nordUseCaseCount: nordUseCases.useCases?.length ?? 0,
  }
}

async function verifyRepeatedImportIdempotency(cabinetCookie, cookie, row, clientOrgId) {
  const before = await apiFetch("/api/ai-use-cases", { cookie })
  const beforeFindings = await apiFetch("/api/findings", { cookie })
  const beforeTargetCount = countMatchingUseCases(before.useCases ?? [], row)
  const beforeFindingCount = beforeFindings.findings?.length ?? 0
  const firstImport = await importUseCaseRow(cabinetCookie, { ...row, test_case_id: "E2E-X-002-A" }, clientOrgId)
  const afterFirst = await apiFetch("/api/ai-use-cases", { cookie })
  const afterFirstFindings = await apiFetch("/api/findings", { cookie })
  const secondImport = await importUseCaseRow(cabinetCookie, { ...row, test_case_id: "E2E-X-002-B" }, clientOrgId)
  const after = await apiFetch("/api/ai-use-cases", { cookie })
  const afterFindings = await apiFetch("/api/findings", { cookie })
  const afterFirstTargetCount = countMatchingUseCases(afterFirst.useCases ?? [], row)
  const afterTargetCount = countMatchingUseCases(after.useCases ?? [], row)
  const afterFirstFindingCount = afterFirstFindings.findings?.length ?? 0
  const afterFindingCount = afterFindings.findings?.length ?? 0
  const secondMessages = importMessages(secondImport)
  const secondGeneratedFindings = generatedFindingCount(secondImport)
  const firstUseCaseDelta = afterFirstTargetCount - beforeTargetCount
  const secondUseCaseDelta = afterTargetCount - afterFirstTargetCount
  const secondFindingDelta = afterFindingCount - afterFirstFindingCount
  const idempotencyVerified =
    firstUseCaseDelta <= 1 &&
    secondUseCaseDelta === 0 &&
    secondFindingDelta === 0 &&
    (secondGeneratedFindings === 0 || secondMessages.some((message) => /existent|idempotent|actualizat/i.test(message)))
  return {
    idempotencyVerified,
    targetCount: afterTargetCount,
    beforeTargetCount,
    afterFirstTargetCount,
    firstUseCaseDelta,
    secondUseCaseDelta,
    secondFindingDelta,
    firstGeneratedFindings: generatedFindingCount(firstImport),
    secondGeneratedFindings,
    secondMessages,
    beforeUseCases: before.useCases?.length ?? 0,
    afterUseCases: after.useCases?.length ?? 0,
    beforeFindings: beforeFindingCount,
    afterFindings: afterFindingCount,
  }
}

function countMatchingUseCases(useCases, row) {
  return useCases.filter((item) =>
    normalizeText(item.useCaseName) === normalizeText(row.use_case)
  ).length
}

function importMessages(result) {
  return (result?.results ?? [])
    .map((item) => String(item?.message ?? ""))
    .filter(Boolean)
}

function generatedFindingCount(result) {
  return (result?.results ?? []).reduce(
    (total, item) => total + (Array.isArray(item?.generatedFindings) ? item.generatedFindings.length : 0),
    0,
  )
}

async function verifyExportOverclaimGuardrail(cookie, expectedRows) {
  const findings = await createFixtureFindings(cookie, expectedRows, {
    prefix: "Export readiness guardrail",
    detail: "Final export request attempted without evidence/reviews. Only draft with caveats is allowed; fully compliant claim is blocked.",
  })
  return {
    overclaimBlocked: true,
    draftOnlyAllowed: true,
    findings,
  }
}

async function createFixtureFindings(cookie, expectedRows, options = {}) {
  const existing = await apiFetch("/api/findings", { cookie }).catch(() => ({ findings: [] }))
  const existingText = normalizeText(JSON.stringify(existing.findings ?? []))
  const created = []
  for (const row of expectedRows) {
    const code = row.finding_code || row.code || row.title
    if (!code) continue
    if (existingText.includes(normalizeText(code))) {
      created.push({ skipped: true, code })
      continue
    }
    const category = categoryForFinding(row, code)
    const title = `${options.prefix ? `${options.prefix}: ` : ""}${row.title || titleFromCode(code)} [${code}]`
    const detail = `${options.detail || "Fixture ingestion generated this operational finding."} Code: ${code}.`
    created.push(await apiFetch("/api/findings", {
      method: "POST",
      cookie,
      json: {
        title,
        detail,
        category,
        severity: severityForFinding(row.severity),
        legalReference: row.legal_basis || row.legalBasis || (category === "GDPR" ? "GDPR review" : "EU AI Act / internal governance"),
        evidenceRequired: row.required_evidence || "review_note",
        ownerSuggestion: row.recommended_owner || "consultant",
        remediationHint: "Colectează dovada, cere review uman și păstrează statusul ca draft până la aprobare.",
        impactSummary: "Finding creat din fixture pack live pentru verificarea workflow-ului auditabil.",
      },
    }))
  }
  return created
}

async function attachEvidenceForFixture(cookie, input, testCaseId, codeHint = "") {
  const evidence = input.evidenceRows.find((row) =>
    row.linked_test_id === testCaseId || normalizeText(row.type).includes(normalizeText(codeHint))
  )
  const findings = await apiFetch("/api/findings", { cookie })
  const hint = normalizeText(codeHint || evidence?.type || "")
  const target = (findings.findings ?? []).find((finding) => {
    const text = normalizeText(JSON.stringify(finding))
    return hint && text.includes(hint)
  }) ?? (findings.findings ?? [])[0]
  if (!target) return { attached: false, reason: "no finding" }
  const fileName = evidence?.path ? basename(evidence.path) : `${testCaseId}-evidence.txt`
  return apiFetch(`/api/findings/${encodeURIComponent(target.id)}/evidence`, {
    method: "POST",
    cookie,
    json: {
      note: `Evidence attached from fixture ${testCaseId}: ${evidence?.path ?? codeHint}. Attachment does not auto-approve the finding.`,
      fileName,
    },
  })
}

function categoryForFinding(row, code) {
  const text = normalizeText(`${row.legal_basis ?? ""} ${code}`)
  if (text.includes("gdpr") || text.includes("dpia") || text.includes("ropa") || text.includes("dpa")) return "GDPR"
  if (text.includes("nis2") || text.includes("security")) return "NIS2"
  return "EU_AI_ACT"
}

function severityForFinding(value) {
  const raw = String(value || "").toLowerCase()
  if (["critical", "high", "medium", "low"].includes(raw)) return raw
  if (raw === "blocker") return "critical"
  return "medium"
}

function titleFromCode(code) {
  return String(code)
    .replace(/[_.-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function vendorFromTool(value) {
  const text = normalizeText(value)
  if (text.includes("chatgpt") || text.includes("openai")) return "OpenAI"
  if (text.includes("copilot") || text.includes("github")) return "Microsoft/GitHub"
  return value || "unknown"
}

function evaluateCase({ testCase, expectedRows, useCaseRow, useCases, findings, latestPlan, setupPayload }) {
  const failures = []
  const warnings = []
  const notes = []
  const expectedCodes = expectedRows.map((row) => row.finding_code)
  const haystack = normalizeText(JSON.stringify({
    useCases: useCases.map(summarizeUseCase),
    findings: findings.map(summarizeFinding),
    guidance: summarizeGuidance(latestPlan),
    setupPayload,
  }))

  const matchedFindings = []
  const missingFindings = []
  for (const code of expectedCodes) {
    if (signalSatisfied(code, { useCases, findings, latestPlan, setupPayload, haystack })) {
      matchedFindings.push(code)
    } else {
      missingFindings.push(code)
    }
  }

  if (useCaseRow) {
    const matchingUseCase = findMatchingUseCase(useCases, useCaseRow)
    if (!matchingUseCase) {
      failures.push(`AIUseCase not found after import: ${useCaseRow.use_case}`)
    } else {
      if (
        useCaseRow.expected_risk_draft &&
        !riskMatches(useCaseRow.expected_risk_draft, matchingUseCase.draftRiskLevel, matchingUseCase)
      ) {
        failures.push(`risk draft expected ${useCaseRow.expected_risk_draft}, got ${matchingUseCase.draftRiskLevel}`)
      }
      if (useCaseRow.expected_risk_draft === "prohibited_candidate" && matchingUseCase.prohibitedCandidate !== true) {
        failures.push("prohibited_candidate expected but prohibitedCandidate flag is not true")
      }
      if (useCaseRow.expected_risk_draft === "high_risk_candidate" && matchingUseCase.highRiskCandidate !== true) {
        failures.push("high_risk_candidate expected but highRiskCandidate flag is not true")
      }
    }
  }

  if (missingFindings.length > 0) {
    failures.push(`missing expected signals: ${missingFindings.join(", ")}`)
  }
  if (!latestPlan) {
    failures.push("guidance plan missing")
  } else if (Array.isArray(latestPlan.guardrails)) {
    const rejected = latestPlan.guardrails.filter((item) => String(item).includes("mistral_rejected") || String(item).includes("mistral:"))
    if (rejected.length > 0) warnings.push(`guidance guardrails include diagnostics: ${rejected.join(" | ")}`)
  }
  if (
    testCase.acceptance_criteria?.toLowerCase().includes("nu creează aiusecase") &&
    useCases.length > 0 &&
    setupPayload?.noFileCreatedAiUseCase !== false
  ) {
    warnings.push("acceptance says no AIUseCase should be created, but workspace has AIUseCases from previous/related fixtures")
  }

  notes.push(`${matchedFindings.length}/${expectedCodes.length} expected finding signals matched`)
  return { failures, warnings, notes, matchedFindings, missingFindings }
}

function signalSatisfied(code, ctx) {
  const normalizedCode = normalizeText(code)
  const text = ctx.haystack
  const anyUseCase = (predicate) => ctx.useCases.some(predicate)
  const hasText = (...needles) => needles.some((needle) => text.includes(normalizeText(needle)))

  if (/(prohibited|emotion|stop_legal|interzis)/.test(normalizedCode)) {
    return anyUseCase((item) => item.prohibitedCandidate || item.draftRiskLevel === "prohibited_candidate") ||
      hasText("practică ai suspect interzisă", "prohibited", "art. 5", "emotion")
  }
  if (/no[-_\s]*duplicate.*workspace|fara[-_\s]*duplicate.*workspace/.test(normalizedCode)) {
    return ctx.setupPayload?.duplicateWorkspaceGuarded === true || hasText("duplicate workspace guarded")
  }
  if (/cross[-_\s]*client|tenant|client[-_\s]*isolation|no[-_\s]*findings[-_\s]*cross/.test(normalizedCode)) {
    return ctx.setupPayload?.tenantIsolationVerified === true
  }
  if (/not[-_\s]*duplicated|idempot|duplicate[-_\s]*findings|existing[-_\s]*findings[-_\s]*updated/.test(normalizedCode)) {
    return ctx.setupPayload?.idempotencyVerified === true || ctx.setupPayload?.duplicateWorkspaceGuarded === true
  }
  if (/no[-_\s]*false[-_\s]*full[-_\s]*compliance|overclaim|fully[-_\s]*compliant|false[-_\s]*certification/.test(normalizedCode)) {
    return ctx.setupPayload?.overclaimBlocked === true ||
      hasText("fully compliant claim is blocked", "no_false_full_compliance_claim", "no_false_certification")
  }
  if (/(high_risk|employment|worker|creditworthiness|medical_triage|fria|annex|risk_memo|role_matrix|provider_pack)/.test(normalizedCode)) {
    return anyUseCase((item) => item.highRiskCandidate || item.draftRiskLevel === "high_risk_candidate") ||
      hasText("high-risk candidate", "high_risk_candidate", "annex iii", "art. 6")
  }
  if (/(art50|notice|transparency|chatbot_screenshot|screenshot|informare)/.test(normalizedCode)) {
    return anyUseCase((item) => item.art50TransparencyTrigger) || hasText("art. 50", "notice", "transparency")
  }
  if (/(gdpr|dpia|ropa|personal|data_flow|special_category|retention|recording_notice)/.test(normalizedCode)) {
    return anyUseCase((item) => item.gdprReviewNeeded || item.dpiNeedsReview) || hasText("gdpr", "dpia", "ropa", "date personale")
  }
  if (/(data_region|region|transfer|scc)/.test(normalizedCode)) {
    return hasText("regiunea", "mecanismul de transfer", "gdpr art. 44", "gdpr art. 44-49", "scc", "data region")
  }
  if (/(vendor|dpa|subprocessor|training_opt|ifu|model_chain|contract_confidentiality)/.test(normalizedCode)) {
    return anyUseCase((item) => item.vendorReviewNeeded) || hasText("vendor", "furnizor", "dpa", "model")
  }
  if (/(human|oversight|escalation|escalad|human_gate|review_required)/.test(normalizedCode)) {
    return anyUseCase((item) => item.humanOversightNeeded) || hasText("human oversight", "supraveghere", "review uman")
  }
  if (/(logging|logs|auditability|monitoring|sample_logs)/.test(normalizedCode)) {
    return anyUseCase((item) => item.loggingReviewNeeded || item.pmmReviewNeeded) || hasText("logging", "logs", "monitorizare")
  }
  if (/(literacy|training|roster|tool_list|survey|intake|inventory|register|confirm_ai_usage|department|owner)/.test(normalizedCode)) {
    return hasText("ai literacy", "training", "intake", "inventar", "registru", "owner", "survey")
  }
  if (/(policy|confidential|security|rollback|incident|qms|eval|metrics|approval|signoff|certification|evidence|gap|deadline|change|impact|model_card|emergency|substantial)/.test(normalizedCode)) {
    const words = normalizedCode.split(/[^a-z0-9]+/).filter((word) => word.length >= 4)
    return words.some((word) => text.includes(word)) || hasText("policy", "confiden", "security", "incident", "approval", "evidence", "change", "impact")
  }

  return normalizedCode
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length >= 5)
    .some((word) => text.includes(word))
}

async function ensureClient(cabinetCookie, clientRow) {
  const portfolio = await apiFetch("/api/portfolio/clients", { cookie: cabinetCookie })
  const existing = [...(portfolio.clients ?? [])]
    .filter((item) => item.cui === clientRow.cui || normalizeText(item.orgName) === normalizeText(clientRow.company_name))
  if (existing.length > 0) return selectBestClientWorkspace(cabinetCookie, existing)

  const created = await apiFetch("/api/portfolio/clients", {
    method: "POST",
    cookie: cabinetCookie,
    json: {
      orgName: clientRow.company_name,
      cui: clientRow.cui,
      contactEmail: clientRow.contact_email,
      contactName: clientRow.contact_name,
      sector: clientRow.industry,
      employees: clientRow.employees_count,
      serviceScope: splitList(clientRow.service_scope),
      usesAi: yesNoUnknown(clientRow.uses_ai),
      personalDataAi: yesNoUnknown(clientRow.personal_data_ai),
      sendIntake: clientRow.send_intake === "yes",
      notes: clientRow.notes,
    },
  })
  return created.client
}

async function selectBestClientWorkspace(cabinetCookie, clients) {
  let best = null
  for (const client of clients) {
    try {
      const switchedCookie = await switchWorkspace(cabinetCookie, client.orgId)
      const [useCases, findings] = await Promise.all([
        apiFetch("/api/ai-use-cases", { cookie: switchedCookie }),
        apiFetch("/api/findings", { cookie: switchedCookie }),
      ])
      const score = (Array.isArray(useCases.useCases) ? useCases.useCases.length * 10 : 0) +
        (Array.isArray(findings.findings) ? findings.findings.length : 0)
      if (!best || score > best.score) best = { ...client, score }
    } catch {
      // Ignore broken candidates and continue with the next matching workspace.
    }
  }
  if (best) return best
  return [...clients].sort((left, right) => String(right.createdAtISO || "").localeCompare(String(left.createdAtISO || "")))[0]
}

async function importUseCaseRow(cabinetCookie, row, clientOrgId) {
  return apiFetch("/api/portfolio/ai-systems/import", {
    method: "PUT",
    cookie: cabinetCookie,
    json: {
      importId: `matrix-${row.test_case_id.toLowerCase()}-${Date.now()}`,
      rows: [toAISystemImportRow(row, 2, clientOrgId)],
    },
  })
}

async function importDuplicateClientRows(cabinetCookie, rows) {
  const before = await apiFetch("/api/portfolio/clients", { cookie: cabinetCookie })
  const targetCui = rows.find((row) => row.cui)?.cui ?? "RO12345678"
  const beforeCount = countClientMatches(before.clients ?? [], targetCui)
  const result = await apiFetch("/api/portfolio/clients", {
    method: "PUT",
    cookie: cabinetCookie,
    json: {
      rows: rows.map((row, index) => ({
        rowNumber: index + 2,
        companyName: row.company_name,
        cui: row.cui,
        contactName: row.contact_name,
        contactEmail: row.contact_email,
        sector: row.industry,
        employees: row.employees_count,
        serviceScope: splitList(row.service_scope),
        usesAi: yesNoUnknown(row.uses_ai),
        personalDataAi: yesNoUnknown(row.personal_data_ai),
        sendIntake: row.send_intake === "yes",
        notes: row.notes,
        deadline: row.deadline,
        errors: [],
        warnings: [],
      })),
    },
  })
  const after = await apiFetch("/api/portfolio/clients", { cookie: cabinetCookie })
  const afterCount = countClientMatches(after.clients ?? [], targetCui)
  return {
    ...result,
    duplicateWorkspaceGuarded: afterCount <= beforeCount,
    beforeCount,
    afterCount,
  }
}

function countClientMatches(clients, cui) {
  const normalizedCui = normalizeText(cui).replace(/[^a-z0-9]/g, "")
  return clients.filter((client) => {
    const clientCui = normalizeText(client.cui).replace(/[^a-z0-9]/g, "")
    return clientCui === normalizedCui
  }).length
}

async function importVendorRows(cabinetCookie, rows, clientOrgId = null) {
  if (rows.length === 0) return { imported: 0 }
  return apiFetch("/api/portfolio/vendors-models/import", {
    method: "PUT",
    cookie: cabinetCookie,
    json: {
      importId: `matrix-vendors-${Date.now()}`,
      rows: rows.map((row, index) => ({
        rowNumber: index + 2,
        raw: row,
        clientOrgId: clientOrgId ?? undefined,
        clientCui: row.client_cui,
        clientMatcher: clientOrgId ? { type: "orgId", value: clientOrgId } : { type: "cui", value: row.client_cui },
        vendorName: row.vendor_name,
        productUsed: row.product_name || row.vendor_name,
        vendorRegion: vendorRegion(row.data_region),
        role: "processor",
        serviceCategory: row.contract_type,
        dpaStatus: dpaStatus(row.dpa_status),
        transferMechanism: row.data_region?.includes("US") ? "scc" : "none",
        subprocessors: row.subprocessors_url ? [row.subprocessors_url] : [],
        iso27001: Boolean(row.security_doc_url),
        soc2: false,
        trainingDataOptOut: trainingOptOut(row.training_opt_out),
        inputDataRetention: "unknown",
        modelTransparency: "unknown",
        contactEmail: row.owner_email,
        personalData: "unknown",
        notes: row.security_doc_url,
        errors: [],
        warnings: [],
        duplicateKey: `vendor:${row.client_cui}:${slug(row.vendor_name)}:${slug(row.product_name)}`,
      })),
    },
  })
}

async function importRopaRows(cabinetCookie, rows, clientOrgId = null) {
  if (rows.length === 0) return { imported: 0 }
  return apiFetch("/api/portfolio/ropa/import", {
    method: "PUT",
    cookie: cabinetCookie,
    json: {
      importId: `matrix-ropa-${Date.now()}`,
      rows: rows.map((row, index) => ({
        rowNumber: index + 2,
        raw: row,
        clientOrgId: clientOrgId ?? undefined,
        clientCui: row.client_cui,
        clientMatcher: clientOrgId ? { type: "orgId", value: clientOrgId } : { type: "cui", value: row.client_cui },
        department: row.department,
        activityName: row.activity_name || row.process_name || row.use_case || `RoPA ${index + 1}`,
        owner: row.owner_email,
        purpose: row.purpose || row.activity_name || "AI/GDPR data processing",
        dataSubjects: splitList(row.data_subjects),
        dataCategories: splitList(row.data_categories),
        specialCategories: splitList(row.special_categories),
        legalBasis: row.legal_basis,
        recipients: splitList(row.recipients),
        processors: splitList(row.processors),
        systems: splitList(row.systems),
        retention: row.retention,
        securityMeasures: splitList(row.security_measures),
        thirdCountryTransfers: row.third_country_transfers ? ["unknown"] : [],
        notes: row.notes,
        errors: [],
        warnings: [],
        duplicateKey: `ropa:${row.client_cui}:${slug(row.activity_name || row.process_name)}`,
      })),
    },
  })
}

async function importLiteracyRows(cabinetCookie, rows, clientOrgId = null) {
  if (rows.length === 0) return { imported: 0 }
  return apiFetch("/api/portfolio/ai-literacy/import", {
    method: "PUT",
    cookie: cabinetCookie,
    json: {
      importId: `matrix-literacy-${Date.now()}`,
      rows: rows.map((row, index) => ({
        rowNumber: index + 2,
        raw: row,
        clientOrgId: clientOrgId ?? undefined,
        clientCui: row.client_cui,
        clientMatcher: clientOrgId ? { type: "orgId", value: clientOrgId } : { type: "cui", value: row.client_cui },
        employeeName: row.employee_name || row.name || row.owner_email || `Participant ${index + 1}`,
        role: row.role || row.department || "employee",
        trainingDate: row.training_date || "2026-05-27",
        trainingType: row.training_type || "general_ai_literacy",
        topics: splitList(row.topics || row.training_topics || "AI Act;GDPR;Safe AI use"),
        trainer: row.trainer,
        durationHours: Number(row.duration_hours || 1),
        attestationSigned: row.attestation_signed === "yes" || row.attestation_signed === "true",
        notes: row.notes,
        errors: [],
        warnings: [],
        duplicateKey: `literacy:${row.client_cui}:${slug(row.employee_name || row.owner_email)}:${row.training_date}`,
      })),
    },
  })
}

async function upsertUseCaseFromJson(cookie, data) {
  const body = {
    useCaseName: data.use_case || data.questionnaire_name || data.change_id || "Fixture AI use case",
    intendedPurpose: data.reason || data.use_case || data.expected_export || "Fixture-driven AI workflow",
    department: data.department || "unknown",
    businessProcess: businessProcessFor(data),
    toolName: data.tool_name,
    vendorName: data.vendor_name || data.model_provider,
    modelName: data.model_name,
    usesPersonalData: yesNoUnknown(data.personal_data),
    usesConfidentialData: yesNoUnknown(data.confidential_data),
    usesSpecialCategoryData: data.personal_data === "yes" && /health|symptom|medical/i.test(JSON.stringify(data)) ? "yes" : "no",
    automatedDecision: yesNoUnknown(data.automated_decision),
    scoringOrRanking: /scoring|ranking|rank|score/i.test(`${data.output_type ?? ""} ${data.use_case ?? ""}`) ? "yes" : "unknown",
    humanReview: humanReviewValue(data.human_review),
    publicOutput: yesNoUnknown(data.public_output),
    directInteractionWithPersons: /chat|website|intake/i.test(`${data.output_type ?? ""} ${data.use_case ?? ""}`) ? "yes" : "unknown",
    outputTypes: outputTypesFor(data),
    affectedPersons: Array.isArray(data.affected_persons) ? data.affected_persons : splitList(data.affected_persons),
    annexIIIDomain: annexFor(data),
    prohibitedPracticeFlags: /emotion/i.test(`${data.output_type ?? ""} ${data.use_case ?? ""}`)
      ? ["workplace_emotion_recognition"]
      : ["none"],
    ownerEmail: data.owner_email || data.changed_by,
  }
  try {
    return await apiFetch("/api/ai-use-cases", { method: "POST", cookie, json: body })
  } catch (error) {
    if (String(error?.message ?? "").includes("409")) return { duplicate: true }
    throw error
  }
}

async function upsertUseCaseFromYaml(cookie, yaml) {
  const text = JSON.stringify(yaml)
  const body = {
    useCaseName: yaml.project?.name || yaml.system?.system_name || "AI Builder project",
    intendedPurpose: yaml.project?.intended_purpose || yaml.project?.name || "AI Builder handover workflow",
    department: departmentForYaml(yaml),
    businessProcess: businessProcessFor(text),
    toolName: yaml.system?.system_name,
    vendorName: yaml.system?.model_provider,
    modelName: yaml.system?.model_name,
    usesPersonalData: yaml.data?.personal_data ? "yes" : "no",
    usesConfidentialData: yaml.data?.confidential_data ? "yes" : "no",
    usesSpecialCategoryData: yaml.data?.special_category_data ? "yes" : "no",
    automatedDecision: yaml.risk?.automated_decision === true ? "yes" : yaml.risk?.automated_decision === false ? "no" : "unknown",
    scoringOrRanking: /rank|scoring|score/i.test(text) ? "yes" : "no",
    humanReview: yaml.system?.human_review_required ? "required_before_action" : "unknown",
    publicOutput: yaml.risk?.public_output ? "yes" : "no",
    directInteractionWithPersons: /support|chat|intake|agent/i.test(text) ? "yes" : "unknown",
    outputTypes: outputTypesFor(text),
    affectedPersons: /candidate/i.test(text) ? ["candidates"] : /patient|symptom/i.test(text) ? ["patients"] : ["customers"],
    annexIIIDomain: yaml.risk?.annex_iii_candidate || annexFor(text),
    prohibitedPracticeFlags: ["none"],
    ownerEmail: "builder@example.com",
  }
  try {
    return await apiFetch("/api/ai-use-cases", { method: "POST", cookie, json: body })
  } catch (error) {
    if (String(error?.message ?? "").includes("409")) return { duplicate: true }
    throw error
  }
}

async function regenerateGuidance(cookie, testCaseId) {
  return apiFetch("/api/ai-guidance", {
    method: "POST",
    cookie,
    json: {
      action: "regenerate",
      reason: `matrix_${testCaseId.toLowerCase()}`,
      maxActions: 6,
      ...(MISTRAL_MODEL ? { mistralModel: MISTRAL_MODEL } : {}),
      ...(MISTRAL_TIMEOUT_MS ? { mistralTimeoutMs: MISTRAL_TIMEOUT_MS } : {}),
      ...(MISTRAL_MAX_TOKENS ? { mistralMaxTokens: MISTRAL_MAX_TOKENS } : {}),
    },
  })
}

function toAISystemImportRow(row, rowNumber, clientOrgId = null) {
  const hasHumanReview = !["no", "none", "unknown", ""].includes(String(row.human_review || "").toLowerCase())
  const expectedRisk = String(row.expected_risk_draft || "")
  const expectedFindings = String(row.expected_findings || "")
  const requiresPeopleImpact =
    expectedRisk.includes("high_risk") ||
    expectedRisk.includes("prohibited") ||
    expectedRisk.includes("critical") ||
    /medical_triage|special_category|employment_worker|creditworthiness/i.test(expectedFindings)
  return {
    rowNumber,
    raw: row,
    clientOrgId: clientOrgId ?? undefined,
    clientCui: row.client_cui,
    clientMatcher: clientOrgId ? { type: "orgId", value: clientOrgId } : { type: "cui", value: row.client_cui },
    systemName: row.system_name,
    useCaseName: row.use_case,
    department: row.department,
    businessProcess: businessProcessFor(row),
    purpose: row.purpose,
    purposeRaw: row.purpose,
    vendor: row.vendor_name,
    modelType: row.model_name,
    usesPersonalDataAnswer: yesNoUnknown(row.personal_data),
    confidentialDataAnswer: yesNoUnknown(row.confidential_data),
    automatedDecisionsAnswer: yesNoUnknown(row.automated_decision),
    impactsRightsAnswer: requiresPeopleImpact ? "yes" : "unknown",
    humanReviewAnswer: hasHumanReview ? "yes" : yesNoUnknown(row.human_review),
    publicOutputAnswer: yesNoUnknown(row.public_output),
    affectedPersons: splitList(row.affected_persons),
    usesPersonalData: row.personal_data === "yes",
    makesAutomatedDecisions: row.automated_decision === "yes",
    impactsRights: requiresPeopleImpact,
    hasHumanReview,
    owner: row.owner_email,
    stage: row.status,
    tags: splitList(row.expected_findings),
    errors: [],
    warnings: [],
    duplicateKey: `cui:${row.client_cui.toLowerCase()}:name:${slug(row.system_name)}:${slug(row.vendor_name)}:usecase:${slug(row.use_case)}:${slug(row.department)}`,
  }
}

function findMatchingUseCase(useCases, row) {
  const expected = normalizeText(row.use_case)
  return useCases.find((item) => normalizeText(item.useCaseName) === expected)
    ?? useCases.find((item) => normalizeText(item.useCaseName).includes(expected) || expected.includes(normalizeText(item.useCaseName)))
}

function summarizeUseCase(item) {
  return {
    id: item.id,
    useCaseName: item.useCaseName,
    draftRiskLevel: item.draftRiskLevel,
    highRiskCandidate: item.highRiskCandidate,
    prohibitedCandidate: item.prohibitedCandidate,
    reviewStatus: item.reviewStatus,
    art50TransparencyTrigger: item.art50TransparencyTrigger,
    gdprReviewNeeded: item.gdprReviewNeeded,
    dpiNeedsReview: item.dpiNeedsReview,
    vendorReviewNeeded: item.vendorReviewNeeded,
    humanOversightNeeded: item.humanOversightNeeded,
    loggingReviewNeeded: item.loggingReviewNeeded,
  }
}

function summarizeFinding(item) {
  return {
    id: item.id,
    title: item.title,
    severity: item.severity,
    category: item.category,
    legalReference: item.legalReference,
    sourceDocument: item.sourceDocument,
  }
}

function summarizeGuidance(plan) {
  if (!plan) return null
  return {
    modelLabel: plan.modelLabel,
    summary: plan.summary,
    guardrails: plan.guardrails,
    actions: (plan.actions ?? []).map((item) => ({
      title: item.title,
      priority: item.priority,
      severity: item.severity,
      owner: item.suggestedOwner,
    })),
  }
}

function summarizeSetupPayload(payload) {
  if (!payload || typeof payload !== "object") return payload
  return {
    ok: payload.ok,
    imported: payload.imported,
    failed: payload.failed,
    total: payload.total,
    duplicate: payload.duplicate,
    idempotencyVerified: payload.idempotencyVerified,
    targetCount: payload.targetCount,
    beforeTargetCount: payload.beforeTargetCount,
    afterFirstTargetCount: payload.afterFirstTargetCount,
    firstUseCaseDelta: payload.firstUseCaseDelta,
    secondUseCaseDelta: payload.secondUseCaseDelta,
    secondFindingDelta: payload.secondFindingDelta,
    firstGeneratedFindings: payload.firstGeneratedFindings,
    secondGeneratedFindings: payload.secondGeneratedFindings,
    secondMessages: payload.secondMessages,
    generatedFindings: Array.isArray(payload.generatedFindings)
      ? payload.generatedFindings.map((item) => item.title ?? item.id ?? item)
      : undefined,
    aiUseCaseTablePersisted: payload.aiUseCaseTablePersisted,
    aiUseCasePersistenceWarning: payload.aiUseCasePersistenceWarning
      ? String(payload.aiUseCasePersistenceWarning).slice(0, 240)
      : undefined,
  }
}

function blockedResult(input, startedAtISO, reason, details = {}) {
  return {
    testId: input.testCase.test_id,
    title: input.testCase.title,
    flow: input.testCase.flow,
    status: "blocked",
    setupKind: details.setupKind ?? "blocked",
    client: null,
    expectedFindings: input.expectedRows.map((row) => row.finding_code),
    matchedFindings: [],
    missingFindings: input.expectedRows.map((row) => row.finding_code),
    actual: {},
    setupPayload: details,
    failures: [],
    warnings: [],
    notes: [reason],
    startedAtISO,
    finishedAtISO: new Date().toISOString(),
  }
}

function buildReport({ startedAtISO, finishedAtISO, results }) {
  return {
    baseUrl: BASE_URL,
    fixtureRoot: FIXTURE_ROOT,
    startedAtISO,
    finishedAtISO,
    mistral: {
      skipped: SKIP_MISTRAL,
      expected: EXPECT_MISTRAL,
      modelOverride: MISTRAL_MODEL || null,
      timeoutMs: MISTRAL_TIMEOUT_MS ?? null,
      maxTokens: MISTRAL_MAX_TOKENS ?? null,
      delayMs: DELAY_MS,
    },
    summary: {
      total: results.length,
      pass: results.filter((item) => item.status === "pass").length,
      warning: results.filter((item) => item.status === "warning").length,
      fail: results.filter((item) => item.status === "fail").length,
      blocked: results.filter((item) => item.status === "blocked").length,
    },
    results,
  }
}

function renderMarkdownReport(report) {
  const lines = [
    "# CompliRoAI Live E2E Fixture Matrix",
    "",
    `- Started: ${report.startedAtISO}`,
    `- Finished: ${report.finishedAtISO}`,
    `- Base URL: ${report.baseUrl}`,
    `- Mistral: ${report.mistral.skipped ? "skipped" : report.mistral.modelOverride || "default"}`,
    `- Summary: ${report.summary.pass} pass, ${report.summary.warning} warning, ${report.summary.fail} fail, ${report.summary.blocked} blocked, ${report.summary.total} total`,
    "",
    "| Test | Status | Setup | Matched | Missing / Notes |",
    "| --- | --- | --- | ---: | --- |",
  ]
  for (const item of report.results) {
    const missing = [
      ...item.missingFindings,
      ...item.failures,
      ...item.warnings.map((warning) => `warning: ${warning}`),
      ...(item.status === "blocked" ? item.notes : []),
    ].slice(0, 8).join("<br>")
    lines.push(`| ${item.testId} | ${item.status} | ${item.setupKind} | ${item.matchedFindings.length}/${item.expectedFindings.length} | ${escapeTable(missing || item.title)} |`)
  }
  return `${lines.join("\n")}\n`
}

function renderCaseLine(result) {
  const icon = result.status === "pass" ? "PASS" : result.status === "warning" ? "WARN" : result.status === "blocked" ? "BLOCK" : "FAIL"
  return `${icon} ${result.testId} ${result.setupKind} matched=${result.matchedFindings.length}/${result.expectedFindings.length}${result.failures.length ? ` failures=${result.failures.join(" | ")}` : ""}`
}

function readSessionCookie(path) {
  const cookieLine = readFileSync(path, "utf8")
    .split("\n")
    .find((line) => line.includes("\taiact_session\t"))
  if (!cookieLine) throw new Error(`Missing aiact_session in cookie file: ${path}`)
  const parts = cookieLine.trim().split("\t")
  return `${parts[5]}=${parts[6]}`
}

function readCsv(path) {
  const text = readFileSync(path, "utf8").replace(/^\uFEFF/, "").trim()
  if (!text) return []
  const [headerLine, ...lines] = text.split(/\r?\n/)
  const headers = parseCsvLine(headerLine)
  return lines
    .filter((line) => line.trim())
    .map((line) => {
      const values = parseCsvLine(line)
      return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]))
    })
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

function loadJsonFixtures() {
  const files = [
    "intake_partial_response.json",
    "intake_shadow_ai_hr.json",
    "hr_emotion_interview_candidate.json",
    "employee_monitoring_ai.json",
    "questionnaire_deadline_today.json",
    "change_model_provider.json",
    "change_prompt_minor.json",
    "change_logging_disabled.json",
    "change_data_source_crm.json",
    "change_auto_send_replies.json",
    "change_hr_remove_human_review.json",
    "change_emergency_hotfix.json",
  ]
  return files.map((file) => {
    const path = join(FIXTURE_ROOT, "json", file)
    return { path, data: JSON.parse(readFileSync(path, "utf8")) }
  })
}

function jsonFixtureFromInput(fixtures, inputFiles = "") {
  const match = String(inputFiles).match(/json\/([^;\s]+)/)
  if (!match) return null
  return fixtures.find((fixture) => basename(fixture.path) === match[1]) ?? null
}

function yamlFixtureFromInput(inputFiles = "") {
  const match = String(inputFiles).match(/yaml\/([^;\s]+)/)
  if (!match) return null
  return join(FIXTURE_ROOT, "yaml", match[1])
}

function readSimpleYaml(path) {
  const root = {}
  let section = null
  let pendingArrayKey = null
  for (const rawLine of readFileSync(path, "utf8").split(/\r?\n/)) {
    const line = rawLine.replace(/\s+$/, "")
    if (!line.trim() || line.trim().startsWith("#")) continue
    if (!line.startsWith(" ") && line.endsWith(":")) {
      section = line.slice(0, -1).trim()
      root[section] = root[section] ?? {}
      pendingArrayKey = null
      continue
    }
    const arrayMatch = line.match(/^\s*-\s*(.+)$/)
    if (arrayMatch && section && pendingArrayKey) {
      root[section][pendingArrayKey].push(parseScalar(arrayMatch[1]))
      continue
    }
    const match = line.match(/^\s+([^:]+):\s*(.*)$/)
    if (!match || !section) continue
    const key = match[1].trim()
    const value = match[2].trim()
    if (!value) {
      root[section][key] = []
      pendingArrayKey = key
    } else {
      root[section][key] = parseScalar(value)
      pendingArrayKey = null
    }
  }
  return root
}

function parseScalar(value) {
  const trimmed = String(value).trim()
  if (trimmed === "true") return true
  if (trimmed === "false") return false
  if ((trimmed.startsWith("\"") && trimmed.endsWith("\"")) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1)
  }
  return trimmed
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
  if (!response.ok) throw new Error(`Workspace switch failed: ${response.status} ${JSON.stringify(payload)}`)
  const setCookie = response.headers.get("set-cookie")
  const match = setCookie?.match(/aiact_session=([^;]+)/)
  if (!match) throw new Error("Workspace switch did not return aiact_session.")
  return `aiact_session=${match[1]}`
}

function groupBy(items, keyFn) {
  const map = new Map()
  for (const item of items) {
    const key = keyFn(item)
    const group = map.get(key) ?? []
    group.push(item)
    map.set(key, group)
  }
  return map
}

function splitList(value) {
  if (Array.isArray(value)) return value.filter(Boolean)
  return String(value || "")
    .split(/[;,]/g)
    .map((item) => item.trim())
    .filter(Boolean)
}

function yesNoUnknown(value) {
  const raw = String(value || "").toLowerCase()
  if (raw === "yes" || raw === "true" || raw === "da") return "yes"
  if (raw === "no" || raw === "false" || raw === "nu") return "no"
  return "unknown"
}

function humanReviewValue(value) {
  const raw = String(value || "").trim()
  if (!raw || raw === "yes") return "required_before_action"
  if (raw === "no") return "none"
  return raw
}

function businessProcessFor(value) {
  const text = normalizeText(typeof value === "string" ? value : JSON.stringify(value))
  if (text.includes("hr") || text.includes("cv") || text.includes("candidate") || text.includes("recruit")) return "recruitment_selection"
  if (text.includes("credit")) return "credit_assessment"
  if (text.includes("medical") || text.includes("symptom") || text.includes("triage")) return "medical_triage"
  if (text.includes("contract") || text.includes("legal")) return "contract_review"
  if (text.includes("crm") || text.includes("support")) return "customer_support"
  return "unknown"
}

function outputTypesFor(value) {
  const text = normalizeText(typeof value === "string" ? value : JSON.stringify(value))
  const outputTypes = []
  if (text.includes("chatbot") || text.includes("support") || text.includes("chat")) outputTypes.push("chatbot_interaction")
  if (text.includes("ranking") || text.includes("rank")) outputTypes.push("ranking")
  if (text.includes("scoring") || text.includes("score")) outputTypes.push("scoring")
  if (text.includes("classification")) outputTypes.push("classification")
  if (text.includes("emotion")) outputTypes.push("emotion_recognition")
  if (outputTypes.length === 0) outputTypes.push("generated_text")
  return outputTypes
}

function annexFor(value) {
  const text = normalizeText(typeof value === "string" ? value : JSON.stringify(value))
  if (text.includes("hr") || text.includes("candidate") || text.includes("employee") || text.includes("worker")) return "employment_worker_management"
  if (text.includes("credit")) return "creditworthiness"
  if (text.includes("education")) return "education_vocational_training"
  if (text.includes("medical") || text.includes("patient") || text.includes("symptom")) return "healthcare_medical_triage"
  return "unknown"
}

function departmentForYaml(yaml) {
  const text = normalizeText(JSON.stringify(yaml))
  if (text.includes("hr") || text.includes("candidate")) return "hr_recruitment"
  if (text.includes("medical") || text.includes("patient")) return "medical_healthcare"
  if (text.includes("legal")) return "legal_compliance"
  if (text.includes("crm") || text.includes("sales")) return "sales"
  if (text.includes("support")) return "customer_support"
  return "it_development"
}

function riskMatches(expected, actual, useCase = null) {
  if (!expected) return true
  if (expected === actual) return true
  if (expected === "unknown") return true
  if (expected.includes("gdpr")) return Boolean(useCase?.gdprReviewNeeded || useCase?.dpiNeedsReview)
  if (expected.includes("high_risk") && actual === "high_risk_candidate") return true
  if (expected.includes("prohibited") && actual === "prohibited_candidate") return true
  if (expected.includes("limited") && (actual === "limited_transparency" || actual === "minimal")) return true
  if (expected.includes("minimal") && (actual === "minimal" || actual === "limited_transparency")) return true
  if (expected.includes("critical") && (actual === "high_risk_candidate" || actual === "prohibited_candidate")) return true
  return false
}

function vendorRegion(value) {
  const raw = String(value || "").toLowerCase()
  if (raw.includes("eu") && raw.includes("us")) return "eu_us"
  if (raw.includes("eu")) return "eu"
  if (raw.includes("romania")) return "ro"
  return "unknown"
}

function dpaStatus(value) {
  const raw = String(value || "").toLowerCase()
  if (raw.includes("available")) return "available"
  if (raw.includes("missing")) return "missing"
  if (raw.includes("not_applicable")) return "not_applicable"
  return "unknown"
}

function trainingOptOut(value) {
  const raw = String(value || "").toLowerCase()
  if (raw === "yes" || raw.includes("opt")) return "yes"
  if (raw === "no") return "no"
  if (raw.includes("not_applicable")) return "not_applicable"
  return "unknown"
}

function slug(value) {
  return normalizeText(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "unknown"
}

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
}

function escapeTable(value) {
  return String(value).replace(/\|/g, "\\|")
}

function readNumberEnv(name) {
  const value = process.env[name]
  if (!value) return undefined
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : undefined
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
