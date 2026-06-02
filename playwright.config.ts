import { defineConfig } from "@playwright/test"

const port = process.env.COMPLIROAI_PORT || "3101"
const baseURL = normalizeLocalBaseURL(process.env.COMPLIROAI_BASE_URL || `http://127.0.0.1:${port}`)
const resolvedPort = new URL(baseURL).port || port
const serverMode = process.env.COMPLIROAI_SERVER_MODE || "prod"
const serverCommand =
  serverMode === "dev"
    ? `npm run dev -- -p ${resolvedPort}`
    : `npm run build && AIACT_FORCE_INSECURE_COOKIES=1 npm run start -- -p ${resolvedPort}`

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: /.*\.ui\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 180_000,
  expect: {
    timeout: 15_000,
  },
  outputDir: "output/playwright/test-results",
  reporter: [
    ["list"],
    ["html", { outputFolder: "output/playwright/html-report", open: "never" }],
    ["json", { outputFile: "output/playwright/results.json" }],
  ],
  use: {
    baseURL,
    headless: true,
    viewport: { width: 1440, height: 1000 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: {
    command: serverCommand,
    url: baseURL,
    reuseExistingServer: true,
    timeout: 300_000,
    env: {
      ...process.env,
      AIACT_FORCE_INSECURE_COOKIES:
        process.env.AIACT_FORCE_INSECURE_COOKIES || "1",
      PORT: resolvedPort,
    },
  },
})

function normalizeLocalBaseURL(value: string): string {
  const url = new URL(value)
  if (url.hostname === "localhost") url.hostname = "127.0.0.1"
  return url.toString().replace(/\/$/, "")
}
