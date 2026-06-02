import { beforeEach, describe, expect, it, vi } from "vitest"

const listUserMemberships = vi.fn()
const loadOrgStatesFromSupabase = vi.fn()
const loadAIUseCasesForOrgIds = vi.fn()

vi.mock("@/lib/server/tenancy", () => ({
  listUserMemberships,
}))

vi.mock("@/lib/server/supabase-org-state", () => ({
  loadOrgStatesFromSupabase,
  persistOrgStateToSupabase: vi.fn(),
}))

vi.mock("@/lib/server/ai-use-case-store", () => ({
  loadAIUseCasesForOrgIds,
}))

describe("loadCabinetPortfolioImportTargets", () => {
  beforeEach(() => {
    vi.resetModules()
    listUserMemberships.mockReset()
    loadOrgStatesFromSupabase.mockReset()
    loadAIUseCasesForOrgIds.mockReset()
  })

  it("hydrates persisted AI use cases from the dedicated Supabase table for import dedupe", async () => {
    const orgId = "org-client-1"
    listUserMemberships.mockResolvedValue([
      {
        orgId,
        orgName: "NordHire Recrutare SRL",
        role: "partner_manager",
        status: "active",
      },
    ])
    loadOrgStatesFromSupabase.mockResolvedValue(
      new Map([
        [orgId, {
          aiUseCases: [],
          aiSystems: [],
          findings: [],
          events: [],
          generatedDocuments: [],
          alerts: [],
          literacyRecords: [],
          aiGuidancePlans: [],
          onboarding: { completed: false, step: 1 },
        }],
      ])
    )
    loadAIUseCasesForOrgIds.mockResolvedValue(
      new Map([
        [
          orgId,
          [
            {
              id: "uc-1",
              orgId,
              useCaseName: "Screening CV și ranking candidați",
            } as any,
          ],
        ],
      ])
    )

    const { loadCabinetPortfolioImportTargets } = await import("./portfolio-import")
    const targets = await loadCabinetPortfolioImportTargets({ userId: "user-1" } as any)

    expect(loadOrgStatesFromSupabase).toHaveBeenCalledWith([orgId])
    expect(loadAIUseCasesForOrgIds).toHaveBeenCalledWith([orgId])
    expect(targets).toHaveLength(1)
    expect(targets[0].state.aiUseCases).toHaveLength(1)
    expect(targets[0].state.aiUseCases?.[0]?.id).toBe("uc-1")
  })
})
