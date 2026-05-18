/**
 * Sprint 023 — Audit Pack Builder includes api-sdk/ section.
 *
 * Asserts:
 *   - api-sdk/api-keys-registry.md present + lists active keys (prefix only)
 *   - api-sdk/recent-calls.md present + lists API call log entries
 *   - api-sdk/compliance-gate-results.md present + aggregates verdict counts
 *   - hmacHash NEVER appears in any file (security invariant)
 */

import { beforeEach, describe, expect, it, vi } from "vitest"
import JSZip from "jszip"

import { initialComplianceState } from "@/lib/compliance/engine"
import type {
  ApiCallLog,
  ApiKey,
} from "@/lib/compliance/types"
import type { AIActState } from "@/lib/server/store"

vi.mock("@/lib/server/org-context", () => ({
  getOrgContext: vi.fn(async () => ({
    orgId: "org-test-23",
    userId: "u1",
    email: "u1@example.com",
    orgName: "AI Builder SRL",
    workspaceMode: "ai-builder",
  })),
}))

vi.mock("@/lib/server/fs-safe", () => ({
  writeFileSafe: vi.fn(async () => {}),
}))

vi.mock("node:fs", async () => {
  const actual = await vi.importActual<typeof import("node:fs")>("node:fs")
  return {
    ...actual,
    promises: {
      ...actual.promises,
      readFile: vi.fn(async () => {
        throw new Error("ENOENT")
      }),
      readdir: vi.fn(async () => []),
    },
  }
})

vi.mock("@/lib/server/evidence-pack", () => ({
  buildAIActEvidencePack: vi.fn(async () => ({
    overallCompliance: 80,
    systems: [],
  })),
}))

vi.mock("@/lib/server/share-token-store", () => ({
  listOrgShareTokens: vi.fn(async () => []),
}))

vi.mock("@/lib/server/white-label", () => ({
  getEffectiveBranding: vi.fn(async () => ({
    logoUrl: null,
    primaryColor: "#3b5bdb",
    secondaryColor: "#0ea5e9",
    brandName: "CompliRoAI",
    signerName: null,
    signerTitle: null,
    contactEmail: null,
    address: null,
    website: null,
    updatedAtISO: null,
    isCustom: false,
  })),
}))

const mockState = { value: {} as AIActState }
vi.mock("@/lib/server/store", async () => {
  const actual = await vi.importActual<typeof import("@/lib/server/store")>(
    "@/lib/server/store",
  )
  return {
    ...actual,
    readState: vi.fn(async () => mockState.value),
    writeState: vi.fn(async () => {}),
  }
})

function buildSampleState(): AIActState {
  const apiKey: ApiKey = {
    id: "apikey-test-1",
    orgId: "org-test-23",
    label: "Production CI/CD",
    prefix: "cra_1234",
    hmacHash: "SECRET_HASH_MUST_NOT_LEAK",
    createdByEmail: "u1@example.com",
    createdAtISO: "2026-05-10T10:00:00.000Z",
    status: "active",
    scopes: ["classify", "gate", "deployment"],
  }

  const callLogs: ApiCallLog[] = [
    {
      id: "apicall-1",
      orgId: "org-test-23",
      apiKeyId: "apikey-test-1",
      endpoint: "/api/v1/gate",
      method: "POST",
      statusCode: 200,
      durationMs: 12,
      requestSummary: "purpose=hr-screening",
      responseSummary: "verdict=blocked risk=prohibited",
      createdAtISO: "2026-05-15T10:00:00.000Z",
    },
    {
      id: "apicall-2",
      orgId: "org-test-23",
      apiKeyId: "apikey-test-1",
      endpoint: "/api/v1/gate",
      method: "POST",
      statusCode: 200,
      durationMs: 11,
      requestSummary: "purpose=document-assistant",
      responseSummary: "verdict=pass risk=minimal",
      createdAtISO: "2026-05-15T11:00:00.000Z",
    },
    {
      id: "apicall-3",
      orgId: "org-test-23",
      apiKeyId: "apikey-test-1",
      endpoint: "/api/v1/classify",
      method: "POST",
      statusCode: 200,
      durationMs: 8,
      requestSummary: "purpose=support-chatbot",
      responseSummary: "risk=limited role=provider",
      createdAtISO: "2026-05-15T11:30:00.000Z",
    },
  ]

  return {
    ...initialComplianceState,
    apiKeys: [apiKey],
    apiCallLogs: callLogs,
  } as AIActState
}

beforeEach(() => {
  mockState.value = buildSampleState()
})

describe("Sprint 023 — Audit Pack api-sdk/ section", () => {
  it("includes the three api-sdk markdown files", async () => {
    const { buildAuditPack } = await import("@/lib/server/audit-pack-builder")
    const result = await buildAuditPack("org-test-23", {
      issuedByUserId: "u1",
      issuedByUserEmail: "u1@example.com",
      workspaceMode: "ai-builder",
      currentOrgId: "org-test-23",
    })
    const zip = await JSZip.loadAsync(result.zipBuffer)
    const paths = Object.keys(zip.files)
    expect(paths).toContain("api-sdk/api-keys-registry.md")
    expect(paths).toContain("api-sdk/recent-calls.md")
    expect(paths).toContain("api-sdk/compliance-gate-results.md")
  })

  it("api-keys-registry.md surfaces the key prefix but NEVER the hmacHash", async () => {
    const { buildAuditPack } = await import("@/lib/server/audit-pack-builder")
    const result = await buildAuditPack("org-test-23", {
      issuedByUserId: "u1",
      issuedByUserEmail: "u1@example.com",
      workspaceMode: "ai-builder",
      currentOrgId: "org-test-23",
    })
    const zip = await JSZip.loadAsync(result.zipBuffer)
    const text = await zip.file("api-sdk/api-keys-registry.md")!.async("string")
    expect(text).toContain("Production CI/CD")
    expect(text).toContain("cra_1234")
    // Critical security invariant — hash MUST NOT leak into Audit Pack.
    expect(text).not.toContain("SECRET_HASH_MUST_NOT_LEAK")
  })

  it("recent-calls.md lists API call entries", async () => {
    const { buildAuditPack } = await import("@/lib/server/audit-pack-builder")
    const result = await buildAuditPack("org-test-23", {
      issuedByUserId: "u1",
      issuedByUserEmail: "u1@example.com",
      workspaceMode: "ai-builder",
      currentOrgId: "org-test-23",
    })
    const zip = await JSZip.loadAsync(result.zipBuffer)
    const text = await zip.file("api-sdk/recent-calls.md")!.async("string")
    expect(text).toContain("/api/v1/gate")
    expect(text).toContain("/api/v1/classify")
    expect(text).toContain("verdict=blocked")
  })

  it("compliance-gate-results.md aggregates verdict counts", async () => {
    const { buildAuditPack } = await import("@/lib/server/audit-pack-builder")
    const result = await buildAuditPack("org-test-23", {
      issuedByUserId: "u1",
      issuedByUserEmail: "u1@example.com",
      workspaceMode: "ai-builder",
      currentOrgId: "org-test-23",
    })
    const zip = await JSZip.loadAsync(result.zipBuffer)
    const text = await zip.file("api-sdk/compliance-gate-results.md")!.async("string")
    expect(text).toContain("| pass | 1 |")
    expect(text).toContain("| blocked | 1 |")
    // Only the gate-emitting endpoints are counted (classify is excluded).
    expect(text).toContain("Total evaluări gate:** 2")
  })
})
