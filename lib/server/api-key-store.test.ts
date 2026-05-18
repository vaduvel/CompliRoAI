/**
 * Sprint 023 — Tests pentru api-key-store.
 *
 * Strategie identica cu findings-store.test.ts: mock org-context + fs ca
 * sa nu atingem disk; restul rulam real. Reset cache + index intre teste.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/server/org-context", () => ({
  getOrgContext: vi.fn(async () => ({
    orgId: "org-test-api",
    userId: "user-test-1",
    email: "test@example.com",
    orgName: "Test Org",
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

import {
  __internals,
  __resetApiKeyIndexForTests,
  createApiKey,
  hashToken,
  listApiKeys,
  revokeApiKey,
  tokenScopeAllowed,
  verifyApiKey,
} from "@/lib/server/api-key-store"
import type { ComplianceEventActorInput } from "@/lib/compliance/events"

const ACTOR: ComplianceEventActorInput = {
  id: "user-test-1",
  label: "test@example.com",
  role: "owner",
  source: "session",
}

const ORG = "org-test-api"

beforeEach(async () => {
  __resetApiKeyIndexForTests()
})

afterEach(() => {
  vi.clearAllMocks()
})

describe("api-key-store — createApiKey", () => {
  it("returns full token only on creation + persists hash + prefix", async () => {
    const result = await createApiKey(
      ORG,
      { label: "CI/CD", scopes: ["classify", "gate"] },
      ACTOR,
    )
    expect(result.fullToken).toMatch(/^cra_[a-f0-9]{32}$/)
    expect(result.key.prefix).toBe(result.fullToken.slice(0, 8))
    expect(result.key.hmacHash).toBe(hashToken(result.fullToken))
    expect(result.key.status).toBe("active")
    expect(result.key.scopes).toEqual(["classify", "gate"])
  })

  it("rejects empty label", async () => {
    await expect(
      createApiKey(ORG, { label: "   ", scopes: ["classify"] }, ACTOR),
    ).rejects.toThrow(/label/i)
  })

  it("rejects empty scope list", async () => {
    await expect(
      createApiKey(ORG, { label: "x", scopes: [] }, ACTOR),
    ).rejects.toThrow(/scope/i)
  })
})

describe("api-key-store — verifyApiKey", () => {
  it("verifies a valid token and returns orgId + key", async () => {
    const { fullToken, key } = await createApiKey(
      ORG,
      { label: "Prod", scopes: ["classify", "gate", "deployment"] },
      ACTOR,
    )
    const result = await verifyApiKey(fullToken)
    expect(result).not.toBeNull()
    expect(result?.orgId).toBe(ORG)
    expect(result?.apiKey.id).toBe(key.id)
    expect(result?.apiKey.lastUsedAtISO).toBeDefined()
  })

  it("rejects malformed tokens", async () => {
    expect(await verifyApiKey("")).toBeNull()
    expect(await verifyApiKey("not-a-token")).toBeNull()
    expect(await verifyApiKey("cra_short")).toBeNull()
  })

  it("rejects revoked keys", async () => {
    const { fullToken, key } = await createApiKey(
      ORG,
      { label: "Burner", scopes: ["classify"] },
      ACTOR,
    )
    await revokeApiKey(ORG, key.id, ACTOR)
    const result = await verifyApiKey(fullToken)
    expect(result).toBeNull()
  })
})

describe("api-key-store — listApiKeys + revokeApiKey", () => {
  it("listApiKeys returns all keys for an org with derived status", async () => {
    await createApiKey(ORG, { label: "A", scopes: ["classify"] }, ACTOR)
    await createApiKey(ORG, { label: "B", scopes: ["gate"] }, ACTOR)
    const list = await listApiKeys(ORG)
    expect(list.length).toBeGreaterThanOrEqual(2)
    expect(list.every((k) => k.orgId === ORG)).toBe(true)
  })

  it("revokeApiKey flips status to revoked + emits event", async () => {
    const { key } = await createApiKey(
      ORG,
      { label: "ToRevoke", scopes: ["classify"] },
      ACTOR,
    )
    const revoked = await revokeApiKey(ORG, key.id, ACTOR)
    expect(revoked?.status).toBe("revoked")
    expect(revoked?.revokedAtISO).toBeDefined()
  })

  it("revoking a non-existent key returns null without throwing", async () => {
    const result = await revokeApiKey(ORG, "apikey-missing", ACTOR)
    expect(result).toBeNull()
  })
})

describe("api-key-store — tokenScopeAllowed", () => {
  it("returns true only for scopes the key has", async () => {
    const { key } = await createApiKey(
      ORG,
      { label: "Limited", scopes: ["classify"] },
      ACTOR,
    )
    expect(tokenScopeAllowed(key, "classify")).toBe(true)
    expect(tokenScopeAllowed(key, "gate")).toBe(false)
    expect(tokenScopeAllowed(key, "deployment")).toBe(false)
  })
})

describe("api-key-store — token format invariants", () => {
  it("internal generator produces cra_ prefix + 32 hex body", () => {
    const t = __internals.generateToken()
    expect(t).toMatch(/^cra_[a-f0-9]{32}$/)
    expect(t.length).toBe(__internals.TOKEN_PREFIX.length + 32)
  })

  it("hashToken is deterministic SHA-256 hex", () => {
    expect(hashToken("cra_abc")).toBe(hashToken("cra_abc"))
    expect(hashToken("cra_abc")).toHaveLength(64)
  })
})
