import { beforeEach, describe, expect, it, vi } from "vitest"

const hasSupabaseConfig = vi.fn()
const supabaseSelect = vi.fn()
const supabaseUpsert = vi.fn()

vi.mock("@/lib/server/supabase-rest", () => ({
  hasSupabaseConfig,
  supabaseSelect,
  supabaseUpsert,
}))

describe("loadOrgStatesFromSupabase", () => {
  beforeEach(() => {
    vi.resetModules()
    hasSupabaseConfig.mockReset()
    supabaseSelect.mockReset()
    supabaseUpsert.mockReset()
    hasSupabaseConfig.mockReturnValue(true)
    process.env.AIACT_DATA_BACKEND = "supabase"
  })

  it("loads multiple org states in one batched query and dedupes org ids", async () => {
    supabaseSelect.mockResolvedValue([
      { org_id: "org-a", state: { clientMeta: { orgName: "A" } } },
      { org_id: "org-b", state: { clientMeta: { orgName: "B" } } },
    ])

    const { loadOrgStatesFromSupabase } = await import("./supabase-org-state")
    const states = await loadOrgStatesFromSupabase(["org-a", "org-b", "org-a"])

    expect(supabaseSelect).toHaveBeenCalledTimes(1)
    expect(supabaseSelect).toHaveBeenCalledWith(
      "org_state",
      'select=org_id,state,updated_at&org_id=in.("org-a","org-b")',
      "public"
    )
    expect(states.get("org-a")).toEqual({ clientMeta: { orgName: "A" } })
    expect(states.get("org-b")).toEqual({ clientMeta: { orgName: "B" } })
  })
})
