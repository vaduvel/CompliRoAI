import { beforeEach, describe, expect, it, vi } from "vitest"

const getOrgContext = vi.fn()
const loadOrgStateFromSupabase = vi.fn()
const persistOrgStateToSupabase = vi.fn()
const shouldUseSupabaseOrgState = vi.fn()
const loadAIUseCasesForOrgIds = vi.fn()

vi.mock("@/lib/server/org-context", () => ({
  getOrgContext,
}))

vi.mock("@/lib/server/supabase-org-state", () => ({
  loadOrgStateFromSupabase,
  persistOrgStateToSupabase,
  shouldUseSupabaseOrgState,
}))

vi.mock("@/lib/server/ai-use-case-store", () => ({
  loadAIUseCasesForOrgIds,
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
    },
  }
})

describe("store Supabase hydration", () => {
  beforeEach(() => {
    vi.resetModules()
    getOrgContext.mockReset()
    loadOrgStateFromSupabase.mockReset()
    persistOrgStateToSupabase.mockReset()
    shouldUseSupabaseOrgState.mockReset()
    loadAIUseCasesForOrgIds.mockReset()

    getOrgContext.mockResolvedValue({
      orgId: "org-store-test",
      userId: "user-store-test",
      email: "store@example.com",
      orgName: "Magazine Online SRL",
      workspaceMode: "cabinet",
    })
    shouldUseSupabaseOrgState.mockReturnValue(true)
  })

  it("hydrates persisted AI use cases from the dedicated Supabase table when org_state is empty", async () => {
    loadOrgStateFromSupabase.mockResolvedValue({
      aiUseCases: [],
      findings: [],
      events: [],
      generatedDocuments: [],
      alerts: [],
      literacyRecords: [],
      aiGuidancePlans: [],
      onboarding: { completed: false, step: 1 },
    })
    loadAIUseCasesForOrgIds.mockResolvedValue(
      new Map([
        [
          "org-store-test",
          [
            {
              id: "uc-chatbot-1",
              orgId: "org-store-test",
              useCaseName: "Chatbot suport clienți pe website",
              draftRiskLevel: "limited_transparency",
            },
          ],
        ],
      ])
    )

    const { readState } = await import("@/lib/server/store")
    const state = await readState()

    expect(loadOrgStateFromSupabase).toHaveBeenCalledWith("org-store-test")
    expect(loadAIUseCasesForOrgIds).toHaveBeenCalledWith(["org-store-test"])
    expect(state.aiUseCases).toHaveLength(1)
    expect(state.aiUseCases?.[0]?.id).toBe("uc-chatbot-1")
  })

  it("caches the hydrated state after the first Supabase read", async () => {
    loadOrgStateFromSupabase.mockResolvedValue({
      aiUseCases: [],
      findings: [],
      events: [],
      generatedDocuments: [],
      alerts: [],
      literacyRecords: [],
      aiGuidancePlans: [],
      onboarding: { completed: false, step: 1 },
    })
    loadAIUseCasesForOrgIds.mockResolvedValue(
      new Map([
        [
          "org-store-test",
          [
            {
              id: "uc-1",
              orgId: "org-store-test",
              useCaseName: "ATS AI screening CV",
              draftRiskLevel: "high_risk_candidate",
            },
          ],
        ],
      ])
    )

    const { readState } = await import("@/lib/server/store")

    const first = await readState()
    const second = await readState()

    expect(first.aiUseCases?.[0]?.id).toBe("uc-1")
    expect(second.aiUseCases?.[0]?.id).toBe("uc-1")
    expect(loadOrgStateFromSupabase).toHaveBeenCalledTimes(1)
    expect(loadAIUseCasesForOrgIds).toHaveBeenCalledTimes(1)
  })
})
