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
      title: string
      severity: string
      category: string
      legalReference?: string
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

    const criticalErrors = errors()
    uiChecks.push({
      testId: fixtureCase.test_id,
      status: "pass",
      client: result!.client!.companyName,
      setupKind: result!.setupKind,
      note: `${result!.matchedFindings.length}/${result!.expectedFindings.length} expected findings matched`,
    })
    expect(criticalErrors).toEqual([])

    await testInfo.attach(`${fixtureCase.test_id}-ui-check`, {
      body: JSON.stringify({
        client: result!.client,
        setupKind: result!.setupKind,
        guidance: result!.actual?.guidance,
        matchedFindings: result!.matchedFindings,
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
