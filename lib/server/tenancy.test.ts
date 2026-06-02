import { beforeEach, describe, expect, it, vi } from "vitest"

const hasSupabaseConfig = vi.fn()
const supabaseSelect = vi.fn()
const supabaseUpsert = vi.fn()
const supabaseDelete = vi.fn()

vi.mock("@/lib/server/supabase-rest", () => ({
  hasSupabaseConfig,
  supabaseSelect,
  supabaseUpsert,
  supabaseDelete,
}))

describe("listUserMemberships", () => {
  beforeEach(() => {
    vi.resetModules()
    hasSupabaseConfig.mockReset()
    supabaseSelect.mockReset()
    supabaseUpsert.mockReset()
    supabaseDelete.mockReset()
    hasSupabaseConfig.mockReturnValue(true)
  })

  it("batches organization lookups when a cabinet user has many memberships", async () => {
    const memberships = Array.from({ length: 55 }, (_, index) => ({
      id: `membership-${index + 1}`,
      user_id: "user-1",
      org_id: `org-${index + 1}`,
      role: "partner_manager",
      status: "active",
      created_at: `2026-06-${String((index % 28) + 1).padStart(2, "0")}T00:00:00.000Z`,
    }))
    const organizations = memberships.map((membership) => ({
      id: membership.org_id,
      name: `Client ${membership.org_id}`,
    }))

    supabaseSelect
      .mockResolvedValueOnce(memberships)
      .mockResolvedValueOnce(organizations.slice(0, 50))
      .mockResolvedValueOnce(organizations.slice(50))

    const { listUserMemberships } = await import("./tenancy")
    const result = await listUserMemberships("user-1")

    expect(supabaseSelect).toHaveBeenCalledTimes(3)
    expect(supabaseSelect).toHaveBeenNthCalledWith(
      2,
      "organizations",
      expect.stringContaining('id=in.("org-1","org-2"'),
      "public"
    )
    expect(supabaseSelect).toHaveBeenNthCalledWith(
      3,
      "organizations",
      'select=id,name,slug,created_at&id=in.("org-51","org-52","org-53","org-54","org-55")',
      "public"
    )
    expect(result).toHaveLength(55)
    expect(result[0]?.orgId).toBe("org-1")
  })
})
