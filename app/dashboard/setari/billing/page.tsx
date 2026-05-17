// Sprint 014 — /dashboard/setari/billing
//
// Server component: arată tier curent + status + usage metrics +
// link spre Customer Portal pentru manage subscription.

import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { getCurrentSubscription, refreshUsageMetrics } from "@/lib/server/billing-store"
import { getTierConfig, isStripeConfigured } from "@/lib/server/stripe-tier-config"
import { BillingClient } from "./billing-client"

export const dynamic = "force-dynamic"

export default async function BillingPage() {
  const h = await headers()
  const orgId = h.get("x-aiact-org-id")
  const orgName = h.get("x-aiact-org-name") ?? ""

  if (!orgId) {
    redirect("/login")
  }

  // Refresh metrics on view (idempotent, fast)
  await refreshUsageMetrics(orgId).catch(() => null)

  const subscription = await getCurrentSubscription()
  const stripeReady = isStripeConfigured()
  const currentConfig = subscription ? getTierConfig(subscription.tier) : null

  return (
    <BillingClient
      orgName={orgName}
      subscription={subscription}
      tierConfig={currentConfig}
      stripeReady={stripeReady}
    />
  )
}
