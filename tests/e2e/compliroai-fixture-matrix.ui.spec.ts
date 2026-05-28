import { spawnSync } from "node:child_process"
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import path from "node:path"

import { expect, test, type Page } from "@playwright/test"

type FixtureCase = {
  test_id: string
  flow: string
  title: string
}

type MatrixResult = {
  testId: string
  title: string
  flow: string
  status: "pass" | "warning" | "fail" | "blocked"
  setupKind: string
  client: null | {
    cui: string
    companyName: string
    orgId: string
  }
  expectedFindings: string[]
  matchedFindings: string[]
  missingFindings: string[]
  actual?: {
    findings?: Array<{
      id?: string
      title: string
      severity: string
      category: string
      legalReference?: string
      findingStatus?: string
      reviewState?: string
      operationalEvidenceNote?: string
      nextMonitoringDateISO?: string
    }>
    guidance?: {
      modelLabel?: string
      summary?: string
      guardrails?: string[]
      actions?: Array<{ title: string }>
    }
  }
  failures: string[]
  warnings: string[]
}

type MatrixReport = {
  baseUrl: string
  startedAtISO: string
  finishedAtISO: string
  mistral: {
    skipped: boolean
    modelOverride?: string
  }
  summary: {
    total: number
    pass: number
    warning: number
    fail: number
    blocked: number
  }
  results: MatrixResult[]
}

const rootDir = process.cwd()
const defaultPort = process.env.COMPLIROAI_PORT || "3101"
const baseURL = normalizeLocalBaseURL(
  process.env.COMPLIROAI_BASE_URL || `http://127.0.0.1:${defaultPort}`,
)
const fixtureCases = readJson<FixtureCase[]>(
  path.join(rootDir, "tests/fixtures/compliroai_e2e_fixture_pack/json/e2e_test_cases.json"),
)
const reportPath = path.join(rootDir, "docs/qa/compliroai-live-e2e-fixture-matrix.latest.json")
const uiReportPath = path.join(rootDir, "docs/qa/compliroai-live-e2e-fixture-ui.latest.json")
const uiMarkdownPath = path.join(rootDir, "docs/qa/compliroai-live-e2e-fixture-ui.latest.md")
const screenshotDir = path.join(rootDir, "output/playwright/fixtures-ui")
const uiChecks: Array<{
  testId: string
  status: "pass" | "fail"
  client?: string
  setupKind?: string
  note?: string
  lifecycle?: {
    findingId: string
    finalStatus: string
    reviewState: string
    eventTypes: string[]
  }
}> = []

test.describe.configure({ mode: "serial" })

test("runs all 42 fixture cases through live APIs and Mistral", async ({}, testInfo) => {
  test.setTimeout(45 * 60 * 1000)

  if (process.env.COMPLIROAI_UI_REUSE_MATRIX === "1") {
    const existingReport = readReport()
    assertMatrixReport(existingReport)
    await testInfo.attach("fixture-matrix-reused", {
      body: JSON.stringify(existingReport.summary, null, 2),
      contentType: "application/json",
    })
    return
  }

  const run = spawnSync(process.execPath, ["scripts/run-live-e2e-fixture-matrix.mjs"], {
    cwd: rootDir,
    env: {
      ...process.env,
      COMPLIROAI_BASE_URL: baseURL,
      COMPLIROAI_EXPECT_MISTRAL: "1",
      COMPLIROAI_MATRIX_DELAY_MS: process.env.COMPLIROAI_MATRIX_DELAY_MS || "1500",
      COMPLIROAI_MISTRAL_MODEL:
        process.env.COMPLIROAI_MISTRAL_MODEL ||
        process.env.MISTRAL_MODEL ||
        "mistral-large-latest",
      COMPLIROAI_MISTRAL_TIMEOUT_MS:
        process.env.COMPLIROAI_MISTRAL_TIMEOUT_MS || "120000",
      COMPLIROAI_MISTRAL_MAX_TOKENS:
        process.env.COMPLIROAI_MISTRAL_MAX_TOKENS || "4000",
    },
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  })

  await testInfo.attach("fixture-matrix-stdout", {
    body: run.stdout || "",
    contentType: "text/plain",
  })
  await testInfo.attach("fixture-matrix-stderr", {
    body: run.stderr || "",
    contentType: "text/plain",
  })

  expect(run.status, run.stderr || run.stdout).toBe(0)
  const report = readReport()
  assertMatrixReport(report)
})

for (const fixtureCase of fixtureCases) {
  test(`${fixtureCase.test_id}: live UI shows tested workspace, findings and Mistral plan`, async ({ page }, testInfo) => {
    test.setTimeout(150_000)

    const report = readReport()
    const result = report.results.find((item) => item.testId === fixtureCase.test_id)
    expect(result, `Missing matrix result for ${fixtureCase.test_id}`).toBeTruthy()
    expect(result!.status, JSON.stringify(result!.failures, null, 2)).toBe("pass")
    expect(result!.client, `${fixtureCase.test_id} did not resolve a client workspace`).toBeTruthy()

    const errors = collectCriticalErrors(page)
    await installCabinetCookie(page)
    await switchToClientWorkspace(page, result!.client!.orgId)
    await warmResolveSurface(page)

    await page.goto(`${baseURL}/dashboard`, { waitUntil: "domcontentloaded" })
    await expect(page.getByRole("main")).toContainText(result!.client!.companyName, { timeout: 45_000 })

    const guidancePanel = page.locator("#ai-guidance")
    await expect(guidancePanel).toContainText("AI · MISTRAL", { timeout: 45_000 })
    await expect(guidancePanel).toContainText("candidate evaluate")
    await expect(guidancePanel).toContainText("AI nu execută")

    await openAndVerifyPlanDrawer(page)

    if (fixtureCase.test_id === "E2E-CAB-001") {
      mkdirSync(screenshotDir, { recursive: true })
      await page.screenshot({
        path: path.join(screenshotDir, "dashboard-mistral-plan.png"),
        fullPage: true,
      })
    }

    await openResolveAndWaitForContent(page)
    const visibleResolveText = await page.getByRole("main").innerText()
    const firstFindingTitle = result!.actual?.findings?.[0]?.title
    if (firstFindingTitle) {
      expect(visibleResolveText).toContain(firstFindingTitle)
    } else {
      expect(visibleResolveText).toContain("Active")
    }

    const lifecycle = await exerciseRemediationLifecycle(page, fixtureCase, result!)

    const criticalErrors = errors()
    uiChecks.push({
      testId: fixtureCase.test_id,
      status: "pass",
      client: result!.client!.companyName,
      setupKind: result!.setupKind,
      note: `${result!.matchedFindings.length}/${result!.expectedFindings.length} expected findings matched; remediation lifecycle reached ${lifecycle.finalStatus}`,
      lifecycle,
    })
    expect(criticalErrors).toEqual([])

    await testInfo.attach(`${fixtureCase.test_id}-ui-check`, {
      body: JSON.stringify({
        client: result!.client,
        setupKind: result!.setupKind,
        guidance: result!.actual?.guidance,
        matchedFindings: result!.matchedFindings,
        lifecycle,
      }, null, 2),
      contentType: "application/json",
    })
  })
}

test.afterAll(async () => {
  const report = {
    generatedAtISO: new Date().toISOString(),
    baseUrl: baseURL,
    total: fixtureCases.length,
    passed: uiChecks.filter((item) => item.status === "pass").length,
    failed: uiChecks.filter((item) => item.status === "fail").length,
    checks: uiChecks,
    sourceMatrixReport: reportPath,
  }
  mkdirSync(path.dirname(uiReportPath), { recursive: true })
  writeFileSync(uiReportPath, JSON.stringify(report, null, 2))
  writeFileSync(uiMarkdownPath, renderUiMarkdown(report))
})

async function installCabinetCookie(page: Page) {
  const value = readNetscapeCookieValue(
    process.env.COMPLIROAI_COOKIE_FILE ||
      path.join(rootDir, ".data/codex-supabase-test-cookies.txt"),
    "aiact_session",
  )
  await page.context().clearCookies()
  await page.context().addCookies([
    {
      name: "aiact_session",
      value,
      url: baseURL,
      httpOnly: true,
      sameSite: "Lax",
    },
  ])
}

async function switchToClientWorkspace(page: Page, orgId: string) {
  const response = await page.request.post(`${baseURL}/api/workspaces/switch`, {
    data: { orgId },
  })
  const payload = await response.json().catch(() => ({}))
  expect(response.ok(), JSON.stringify(payload)).toBe(true)

  const setCookie = response.headers()["set-cookie"] || ""
  const nextSessionValue = /(?:^|,\s*)aiact_session=([^;]+)/.exec(setCookie)?.[1]
  if (nextSessionValue) {
    await page.context().addCookies([
      {
        name: "aiact_session",
        value: nextSessionValue,
        url: baseURL,
        httpOnly: true,
        sameSite: "Lax",
      },
    ])
  }
}

async function warmResolveSurface(page: Page) {
  const paths = [
    "/api/findings",
    "/dashboard/resolve",
  ]

  for (const pathName of paths) {
    const response = await page.request.get(`${baseURL}${pathName}`)
    expect(response.ok(), `Warmup failed for ${pathName}`).toBe(true)
  }
}

async function openAndVerifyPlanDrawer(page: Page) {
  const guidancePanel = page.locator("#ai-guidance")
  const planButton = guidancePanel.getByRole("button", { name: /Plan complet/ })
  const dialog = page.getByRole("dialog", { name: "Plan de lucru AI explicat" })
  await expect(planButton).toBeVisible({ timeout: 15_000 })
  await expect(planButton).toBeEnabled()
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await planButton.click()
    const opened = await dialog.waitFor({ state: "visible", timeout: 2_500 }).then(() => true).catch(() => false)
    if (opened) break
    await page.waitForTimeout(750)
  }
  await expect(dialog).toBeVisible({ timeout: 15_000 })
  await expect(dialog).toContainText("mistral-assisted")
  await expect(dialog).toContainText("Surse și guardrails")
  await expect(dialog).toContainText("AI-ul nu execută")
  await dialog.getByRole("button", { name: "Închide planul" }).click()
  await expect(dialog).toHaveCount(0)
}

async function openResolveAndWaitForContent(page: Page) {
  const loadingText = page.getByText("Se încarcă riscurile...")

  for (let attempt = 0; attempt < 2; attempt += 1) {
    await page.goto(`${baseURL}/dashboard/resolve`, { waitUntil: "domcontentloaded" })
    await expect(page.getByRole("heading", { name: "De rezolvat" })).toBeVisible({ timeout: 45_000 })

    const settled = await loadingText
      .waitFor({ state: "hidden", timeout: 20_000 })
      .then(() => true)
      .catch(() => false)

    if (settled) return
  }

  await expect(loadingText).toHaveCount(0, { timeout: 5_000 })
}

async function exerciseRemediationLifecycle(
  page: Page,
  fixtureCase: FixtureCase,
  result: MatrixResult,
) {
  const runStamp = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  const title = `[E2E remediation ${fixtureCase.test_id} ${runStamp}] ${fixtureCase.title}`.slice(0, 170)
  const evidenceNote = `E2E remediation evidence for ${fixtureCase.test_id} ${runStamp}: evidence attached, but not auto-approved.`
  const evidenceUrl = `https://example.com/compliroai/evidence/${fixtureCase.test_id.toLowerCase()}`

  const createResponse = await page.request.post(`${baseURL}/api/findings`, {
    data: {
      title,
      detail: `Lifecycle probe for ${fixtureCase.test_id} on ${result.client?.companyName}. It validates resolve UI actions on a real finding in the tested workspace.`,
      category: result.actual?.findings?.[0]?.category || "EU_AI_ACT",
      severity: result.actual?.findings?.[0]?.severity || "medium",
      legalReference:
        result.actual?.findings?.[0]?.legalReference ||
        "EU AI Act / GDPR operational remediation review",
      ownerSuggestion: "DPO",
      evidenceRequired: "evidence note, document URL, human review, monitoring follow-up",
      remediationHint:
        "Confirmă problema, atașează dovada, marchează rezolvat doar după review și pune în monitorizare când rămâne urmărită periodic.",
    },
  })
  const createPayload = await createResponse.json().catch(() => ({}))
  expect(createResponse.ok(), JSON.stringify(createPayload)).toBe(true)
  const findingId = createPayload.finding?.id as string | undefined
  expect(findingId, "Created remediation finding id").toBeTruthy()

  await openResolveAndWaitForContent(page)
  await selectStatusTab(page, "Toate")

  let card = await openRemediationCard(page, title, fixtureCase.test_id)

  await clickAction(card, "Confirma")
  await expect(card).toContainText("Confirmat", { timeout: 25_000 })

  await card.getByPlaceholder(/Ce ai făcut/).fill(evidenceNote)
  await card.getByPlaceholder("https://...").fill(evidenceUrl)
  await clickAction(card, "Ataseaza dovada")
  await expect(card.getByRole("button", { name: /Ataseaza dovada/ })).toBeVisible({ timeout: 25_000 })
  await expect(card.locator("pre.cr-pre-box")).toContainText(evidenceNote, { timeout: 25_000 })

  await expectFindingState(page, findingId!, {
    findingStatus: "confirmed",
    reviewState: "evidence_attached",
    evidenceNote,
    nextMonitoringDateISO: false,
  })

  await clickAction(card, "Marcheaza rezolvat")
  await expect(card).toContainText("Rezolvat", { timeout: 25_000 })
  await expectFindingState(page, findingId!, {
    findingStatus: "resolved",
    reviewState: "closed",
    evidenceNote,
    nextMonitoringDateISO: false,
  })

  card = await openRemediationCard(page, title, fixtureCase.test_id)
  await clickAction(card, "Redeschide")
  await expect(card).toContainText("Deschis", { timeout: 25_000 })
  await expectFindingState(page, findingId!, {
    findingStatus: "open",
    reviewState: "unreviewed",
    evidenceNote,
    nextMonitoringDateISO: false,
  })

  card = await openRemediationCard(page, title, fixtureCase.test_id)
  await clickAction(card, "Pune in monitorizare")
  await expect(card).toContainText("Monitorizare", { timeout: 25_000 })
  await expect(card).toContainText("Următoarea monitorizare", { timeout: 25_000 })

  const finalFinding = await expectFindingState(page, findingId!, {
    findingStatus: "under_monitoring",
    reviewState: "monitoring",
    evidenceNote,
    nextMonitoringDateISO: true,
  })
  const eventTypes = await expectAuditTrailForLifecycle(page, findingId!)

  return {
    findingId: findingId!,
    finalStatus: finalFinding.findingStatus ?? "missing",
    reviewState: finalFinding.reviewState ?? "missing",
    eventTypes,
  }
}

async function openRemediationCard(page: Page, title: string, testId: string) {
  await openResolveAndWaitForContent(page)
  await selectStatusTab(page, "Toate")
  const card = page.locator(".cr-finding-card").filter({ hasText: title })
  await expect(card, `Remediation card missing for ${testId}`).toHaveCount(1)
  const expanded = await card.getByText("AI Guidance", { exact: false }).isVisible().catch(() => false)
  if (!expanded) {
    await card.locator("button.cr-finding-row").click()
  }
  await expect(card).toContainText("AI Guidance")
  return card
}

async function selectStatusTab(page: Page, label: string) {
  const statusTabs = page.locator(".cr-segment-bar")
  const tab = statusTabs.getByRole("button", { name: new RegExp(`^${escapeRegExp(label)}`) })
  await expect(tab).toBeVisible({ timeout: 15_000 })
  await tab.click()
}

async function clickAction(card: ReturnType<Page["locator"]>, label: string) {
  const action = card.getByRole("button", { name: new RegExp(escapeRegExp(label)) })
  await expect(action).toBeVisible({ timeout: 15_000 })
  await expect(action).toBeEnabled({ timeout: 15_000 })
  await action.click()
}

async function expectFindingState(
  page: Page,
  findingId: string,
  expected: {
    findingStatus: string
    reviewState: string
    evidenceNote?: string
    nextMonitoringDateISO: boolean
  },
) {
  const response = await page.request.get(`${baseURL}/api/findings`)
  const payload = await response.json().catch(() => ({}))
  expect(response.ok(), JSON.stringify(payload)).toBe(true)
  const finding = (payload.findings ?? []).find((item: { id?: string }) => item.id === findingId)
  expect(finding, `Finding ${findingId} missing after lifecycle action`).toBeTruthy()
  expect(finding.findingStatus).toBe(expected.findingStatus)
  expect(finding.reviewState).toBe(expected.reviewState)
  if (expected.evidenceNote) {
    expect(finding.operationalEvidenceNote).toContain(expected.evidenceNote)
  }
  if (expected.nextMonitoringDateISO) {
    expect(finding.nextMonitoringDateISO).toBeTruthy()
  } else {
    expect(finding.nextMonitoringDateISO).toBeFalsy()
  }
  return finding as {
    findingStatus?: string
    reviewState?: string
    operationalEvidenceNote?: string
    nextMonitoringDateISO?: string
  }
}

async function expectAuditTrailForLifecycle(page: Page, findingId: string) {
  const response = await page.request.get(`${baseURL}/api/findings/audit-trail`)
  const payload = await response.json().catch(() => ({}))
  expect(response.ok(), JSON.stringify(payload)).toBe(true)
  expect(payload.chainVerified).toBe(true)
  const eventTypes = (payload.events ?? [])
    .filter((event: { entityId?: string }) => event.entityId === findingId)
    .map((event: { type?: string }) => event.type)
  for (const expectedType of [
    "finding.created",
    "finding.confirm",
    "finding.evidence_attached",
    "finding.resolve",
    "finding.reopen",
    "finding.monitor",
  ]) {
    expect(eventTypes).toContain(expectedType)
  }
  return eventTypes
}

function readReport(): MatrixReport {
  return readJson<MatrixReport>(reportPath)
}

function normalizeLocalBaseURL(value: string): string {
  const url = new URL(value)
  if (url.hostname === "localhost") url.hostname = "127.0.0.1"
  return url.toString().replace(/\/$/, "")
}

function assertMatrixReport(report: MatrixReport) {
  expect(report.summary.total).toBe(42)
  expect(report.summary.pass).toBe(42)
  expect(report.summary.warning).toBe(0)
  expect(report.summary.fail).toBe(0)
  expect(report.summary.blocked).toBe(0)
  expect(report.mistral.skipped).toBe(false)
  expect(report.results).toHaveLength(42)
  for (const result of report.results) {
    expect(result.status, `${result.testId}: ${result.failures.join("; ")}`).toBe("pass")
    expect(result.missingFindings, `${result.testId} missing findings`).toEqual([])
    expect(result.actual?.guidance?.modelLabel, `${result.testId} guidance model`).toBe("mistral-assisted")
  }
}

function readJson<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, "utf8")) as T
}

function readNetscapeCookieValue(filePath: string, cookieName: string): string {
  const raw = readFileSync(filePath, "utf8")
  for (const line of raw.split(/\r?\n/)) {
    if (!line || line.startsWith("#") && !line.startsWith("#HttpOnly_")) continue
    const parts = line.split("\t")
    if (parts.length >= 7 && parts[5] === cookieName) return parts[6]
  }
  throw new Error(`Cookie ${cookieName} not found in ${filePath}`)
}

function collectCriticalErrors(page: Page) {
  const entries: string[] = []
  page.on("console", (message) => {
    if (message.type() === "error") entries.push(message.text())
  })
  page.on("pageerror", (error) => entries.push(error.message))

  return () =>
    entries.filter((entry) =>
      !entry.includes("favicon") &&
      !entry.includes("Download the React DevTools") &&
      !entry.includes("Failed to load resource: the server responded with a status of 404") &&
      !entry.includes("Failed to load resource: the server responded with a status of 500") &&
      !entry.includes("Resend error 403")
    )
}

function renderUiMarkdown(report: {
  generatedAtISO: string
  baseUrl: string
  total: number
  passed: number
  failed: number
  checks: typeof uiChecks
  sourceMatrixReport: string
}) {
  return [
    "# CompliRoAI Live E2E Fixture UI Regression",
    "",
    `- Generated: ${report.generatedAtISO}`,
    `- Base URL: ${report.baseUrl}`,
    `- Summary: ${report.passed} pass, ${report.failed} fail, ${report.total} total`,
    `- Source matrix report: ${report.sourceMatrixReport}`,
    "",
    "| Test | Status | Client | Setup | Note |",
    "| --- | --- | --- | --- | --- |",
    ...report.checks.map((item) =>
      `| ${item.testId} | ${item.status} | ${item.client ?? ""} | ${item.setupKind ?? ""} | ${item.note ?? ""} |`
    ),
    "",
  ].join("\n")
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}
