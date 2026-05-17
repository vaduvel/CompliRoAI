// Sprint 014 — Billing store adapter.
//
// CRUD pe ComplianceState.orgSubscription. Folosit de:
//   - Webhook handler (Stripe events → update tier/status/period)
//   - UI /dashboard/setari/billing (read current subscription)
//   - Feature gates (read tier → check feature)
//
// Persistență: standard readState/writeState pattern (per-org cache + disk
// fallback + Supabase optional). NU adăugăm tabel nou.

import { mutateFreshStateForOrg, readState } from "@/lib/server/store"
import type {
  AISystemRecord,
  BillingTier,
  ComplianceState,
  OrgSubscription,
  SubscriptionStatus,
} from "@/lib/compliance/types"
import { getTierConfig } from "./stripe-tier-config"

function nowISO(): string {
  return new Date().toISOString()
}

// ────────────────────────────────────────────────────────────────────────────
//   Read
// ────────────────────────────────────────────────────────────────────────────

export async function getCurrentSubscription(): Promise<OrgSubscription | null> {
  const state = await readState()
  return state.orgSubscription ?? null
}

/**
 * Returnează tier-ul activ pentru org. Default = "free_trial" pentru org-uri
 * fără subscription explicit (so toate features sunt disponibile temporar).
 */
export async function getCurrentTier(): Promise<BillingTier> {
  const sub = await getCurrentSubscription()
  return sub?.tier ?? "free_trial"
}

// ────────────────────────────────────────────────────────────────────────────
//   Mutators
// ────────────────────────────────────────────────────────────────────────────

export type CreateSubscriptionInput = {
  orgId: string
  tier: BillingTier
  status?: SubscriptionStatus
  stripeCustomerId?: string
  stripeSubscriptionId?: string
  stripePriceId?: string
  currentPeriodStartISO?: string
  currentPeriodEndISO?: string
  trialEndsAtISO?: string
  cancelAtPeriodEnd?: boolean
}

/**
 * Creează (sau înlocuiește) orgSubscription. Folosit la primul checkout
 * sau când webhook livrează un subscription nou.
 */
export async function createSubscription(input: CreateSubscriptionInput): Promise<OrgSubscription> {
  const config = getTierConfig(input.tier)
  const now = nowISO()

  const sub: OrgSubscription = {
    orgId: input.orgId,
    stripeCustomerId: input.stripeCustomerId,
    stripeSubscriptionId: input.stripeSubscriptionId,
    stripePriceId: input.stripePriceId,
    tier: input.tier,
    status: input.status ?? (input.tier === "free_trial" ? "trialing" : "active"),
    currentPeriodStartISO: input.currentPeriodStartISO,
    currentPeriodEndISO: input.currentPeriodEndISO,
    trialEndsAtISO: input.trialEndsAtISO,
    cancelAtPeriodEnd: input.cancelAtPeriodEnd ?? false,
    monthlyPriceEUR: config.priceEUR,
    usageMetrics: {},
    lastWebhookEventAtISO: now,
    createdAtISO: now,
    updatedAtISO: now,
  }

  await mutateFreshStateForOrg(input.orgId, (state) => ({
    ...state,
    orgSubscription: sub,
  }))

  return sub
}

export type UpdateSubscriptionInput = {
  tier?: BillingTier
  status?: SubscriptionStatus
  stripeCustomerId?: string
  stripeSubscriptionId?: string
  stripePriceId?: string
  currentPeriodStartISO?: string
  currentPeriodEndISO?: string
  trialEndsAtISO?: string
  cancelAtPeriodEnd?: boolean
  monthlyPriceEUR?: number
}

/**
 * Update existing subscription. Folosit de webhook handler la fiecare event
 * (subscription.updated, invoice.payment_succeeded, etc.).
 *
 * Dacă orgSubscription lipsește, returnează null (caller decide să creeze).
 */
export async function updateSubscriptionFromWebhook(
  orgId: string,
  patch: UpdateSubscriptionInput
): Promise<OrgSubscription | null> {
  let updated: OrgSubscription | null = null

  await mutateFreshStateForOrg(orgId, (state) => {
    const current = state.orgSubscription
    if (!current) return state

    const newTier = patch.tier ?? current.tier
    const config = getTierConfig(newTier)

    const next: OrgSubscription = {
      ...current,
      tier: newTier,
      status: patch.status ?? current.status,
      stripeCustomerId: patch.stripeCustomerId ?? current.stripeCustomerId,
      stripeSubscriptionId: patch.stripeSubscriptionId ?? current.stripeSubscriptionId,
      stripePriceId: patch.stripePriceId ?? current.stripePriceId,
      currentPeriodStartISO: patch.currentPeriodStartISO ?? current.currentPeriodStartISO,
      currentPeriodEndISO: patch.currentPeriodEndISO ?? current.currentPeriodEndISO,
      trialEndsAtISO: patch.trialEndsAtISO ?? current.trialEndsAtISO,
      cancelAtPeriodEnd:
        patch.cancelAtPeriodEnd !== undefined
          ? patch.cancelAtPeriodEnd
          : current.cancelAtPeriodEnd,
      monthlyPriceEUR: patch.monthlyPriceEUR ?? config.priceEUR,
      lastWebhookEventAtISO: nowISO(),
      updatedAtISO: nowISO(),
    }
    updated = next
    return { ...state, orgSubscription: next }
  })

  return updated
}

/**
 * Cancel subscription locally (status="canceled"). Webhook deletion event.
 */
export async function cancelSubscription(orgId: string): Promise<OrgSubscription | null> {
  return updateSubscriptionFromWebhook(orgId, {
    status: "canceled",
    cancelAtPeriodEnd: true,
  })
}

// ────────────────────────────────────────────────────────────────────────────
//   Usage metrics
// ────────────────────────────────────────────────────────────────────────────

/**
 * Recompute usage metrics from current state. Idempotent — apelat
 * periodic sau la fiecare update major.
 */
export function calculateUsageMetrics(
  state: ComplianceState
): OrgSubscription["usageMetrics"] {
  const aiSystems = (state.aiSystems ?? []) as AISystemRecord[]
  const findings = state.findings ?? []
  const findingsActiveCount = findings.filter(
    (f) => f.findingStatus !== "resolved" && f.findingStatus !== "dismissed"
  ).length

  // Cabinet metrics
  const clientWorkspace = state.partnerWorkspace ? 1 : 0

  // Audit packs generated this month (events)
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)
  const events = state.events ?? []
  const auditPacksGeneratedThisMonth = events.filter(
    (e) =>
      (e.type === "audit_pack.exported" || e.type === "audit_pack.generated") &&
      new Date(e.createdAtISO).getTime() >= startOfMonth.getTime()
  ).length

  return {
    aiSystemsCount: aiSystems.length,
    findingsActiveCount,
    auditPacksGeneratedThisMonth,
    activeClients: clientWorkspace,
  }
}

/**
 * Refresh usage metrics on the persisted orgSubscription. Idempotent.
 */
export async function refreshUsageMetrics(orgId: string): Promise<OrgSubscription | null> {
  let updated: OrgSubscription | null = null
  await mutateFreshStateForOrg(orgId, (state) => {
    if (!state.orgSubscription) return state
    const metrics = calculateUsageMetrics(state)
    const next: OrgSubscription = {
      ...state.orgSubscription,
      usageMetrics: metrics,
      updatedAtISO: nowISO(),
    }
    updated = next
    return { ...state, orgSubscription: next }
  })
  return updated
}
