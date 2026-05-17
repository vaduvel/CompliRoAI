// Sprint 014 — POST /api/stripe/portal
//
// → Generează un URL pentru Stripe Customer Portal (manage subscription +
//   download invoices + update payment method).
// → Necesită org să aibă deja un stripeCustomerId în subscription.
// → Returnează { url } pentru redirect direct.

import { NextResponse } from "next/server"
import Stripe from "stripe"

import { getOrgContext } from "@/lib/server/org-context"
import { getCurrentSubscription } from "@/lib/server/billing-store"
import { isStripeConfigured } from "@/lib/server/stripe-tier-config"

const PUBLIC_BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL?.trim() ||
  process.env.NEXTAUTH_URL?.trim() ||
  "https://app.compliroai.ro"

export async function POST() {
  let ctx
  try {
    ctx = await getOrgContext()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!isStripeConfigured()) {
    return NextResponse.json(
      {
        error:
          "Stripe nu este configurat pe acest mediu. Contactează support@compliroai.ro.",
      },
      { status: 503 }
    )
  }

  const sub = await getCurrentSubscription()
  if (!sub?.stripeCustomerId) {
    return NextResponse.json(
      {
        error:
          "Nu ai încă un abonament activ Stripe. Cumpără mai întâi un plan din /dashboard/setari/billing/checkout.",
      },
      { status: 400 }
    )
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!.trim(), {
    apiVersion: "2024-12-18.acacia" as Stripe.LatestApiVersion,
    typescript: true,
  })

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: `${PUBLIC_BASE_URL}/dashboard/setari/billing`,
    })
    return NextResponse.json({ url: session.url })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Eroare portal."
    console.error("[stripe/portal]", message)
    return NextResponse.json({ error: `Eroare Stripe: ${message}` }, { status: 500 })
  }
}
