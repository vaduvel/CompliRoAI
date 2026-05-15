import { readState } from "./store"

export async function isOnboardingCompleted(): Promise<boolean> {
  try {
    const state = await readState()
    return state.onboarding?.completed === true
  } catch {
    return false
  }
}
