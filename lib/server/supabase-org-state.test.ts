import { afterEach, describe, expect, it, vi } from "vitest"

import { getConfiguredDataBackend } from "@/lib/server/supabase-org-state"

describe("supabase org_state backend config", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("treats legacy env values with literal newline escapes as supabase", () => {
    vi.stubEnv("AIACT_DATA_BACKEND", "")
    vi.stubEnv("COMPLISCAN_DATA_BACKEND", "supabase\\n")

    expect(getConfiguredDataBackend()).toBe("supabase")
  })

  it("treats legacy env values with actual trailing newlines as supabase", () => {
    vi.stubEnv("AIACT_DATA_BACKEND", "")
    vi.stubEnv("COMPLISCAN_DATA_BACKEND", "supabase\n")

    expect(getConfiguredDataBackend()).toBe("supabase")
  })

  it("defaults to local for unknown values", () => {
    vi.stubEnv("AIACT_DATA_BACKEND", "")
    vi.stubEnv("COMPLISCAN_DATA_BACKEND", "something-else")

    expect(getConfiguredDataBackend()).toBe("local")
  })
})
