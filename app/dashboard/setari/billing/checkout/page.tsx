// Sprint 014 — /dashboard/setari/billing/checkout
//
// Pricing table cu 7 tiers locked. Click "Subscribe" → POST /api/stripe/checkout
// → redirect la Stripe Checkout. Free trial omis (acordat automat la signup).

import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { getCurrentSubscription } from "@/lib/server/billing-store"
import { isStripeConfigured, listPaidTiers } from "@/lib/server/stripe-tier-config"
import { CheckoutClient } from "./checkout-client"

export const dynamic = "force-dynamic"

export default async function CheckoutPage() {
  const h = await headers()
  const orgId = h.get("x-aiact-org-id")
  if (!orgId) {
    redirect("/login")
  }

  const subscription = await getCurrentSubscription()
  const tiers = listPaidTiers()
  const stripeReady = isStripeConfigured()

  return (
    <CheckoutClient
      tiers={tiers}
      currentTier={subscription?.tier ?? null}
      stripeReady={stripeReady}
    />
  )
}
