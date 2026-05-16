import { readState } from "./store"
import { getOrgContext } from "./org-context"

export async function isOnboardingCompleted(): Promise<boolean> {
  try {
    const state = await readState()
    if (state.onboarding?.completed === true) return true

    // Cabinet workspaceMode: skip the onboarding gate when the user is browsing
    // a CLIENT org they manage as partner_manager. Cabinet completed onboarding
    // in their OWN workspace; client onboarding is the client's responsibility,
    // not a precondition for the cabinet to access compliance pages.
    const ctx = await getOrgContext()
    if (ctx.workspaceMode === "cabinet") {
      // Mark client workspaces as ready-to-use for cabinet — they will see the
      // dashboard empty state and can populate AI systems / training records.
      return true
    }

    return false
  } catch {
    return false
  }
}
