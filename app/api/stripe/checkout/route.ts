// Sprint 014 — POST /api/stripe/checkout
//
// Body: { tier: BillingTier }
// → Creează Stripe Checkout Session pentru tier-ul ales.
// → Returnează { url } pentru redirect direct.
// → Dacă STRIPE_SECRET_KEY lipsește: 503 cu mesaj prietenos.

import { NextResponse } from "next/server"
import Stripe from "stripe"

import { getOrgContext } from "@/lib/server/org-context"
import { isStripeConfigured, getStripePriceId, getTierConfig } from "@/lib/server/stripe-tier-config"
import type { BillingTier } from "@/lib/compliance/types"

const PUBLIC_BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL?.trim() ||
  process.env.NEXTAUTH_URL?.trim() ||
  "https://app.compliroai.ro"

const VALID_TIERS: BillingTier[] = [
  "imm_solo",
  "imm_mid",
  "ai_builder",
  "cabinet_solo",
  "cabinet_pro",
  "cabinet_enterprise",
  "one_off_audit",
]

export async function POST(request: Request) {
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
          "Plățile online nu sunt încă configurate pe contul tău. Te rugăm să contactezi support@compliroai.ro pentru activare.",
      },
      { status: 503 }
    )
  }

  const stripeSecret = process.env.STRIPE_SECRET_KEY!.trim()
  let body: { tier?: string } = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Body JSON invalid." }, { status: 400 })
  }

  const tier = body.tier as BillingTier | undefined
  if (!tier || !VALID_TIERS.includes(tier)) {
    return NextResponse.json(
      { error: `Tier invalid. Valori acceptate: ${VALID_TIERS.join(", ")}` },
      { status: 400 }
    )
  }

  const priceId = getStripePriceId(tier)
  if (!priceId) {
    return NextResponse.json(
      { error: `Tier "${tier}" nu are Price ID Stripe configurat.` },
      { status: 503 }
    )
  }

  const config = getTierConfig(tier)
  const stripe = new Stripe(stripeSecret, {
    // pin API version pentru predictabilitate
    apiVersion: "2024-12-18.acacia" as Stripe.LatestApiVersion,
    typescript: true,
  })

  try {
    const session = await stripe.checkout.sessions.create({
      mode: config.oneOff ? "payment" : "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: ctx.email,
      client_reference_id: ctx.orgId,
      metadata: {
        orgId: ctx.orgId,
        tier,
        userEmail: ctx.email,
      },
      subscription_data: config.oneOff
        ? undefined
        : {
            metadata: {
              orgId: ctx.orgId,
              tier,
            },
          },
      success_url: `${PUBLIC_BASE_URL}/dashboard/setari/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${PUBLIC_BASE_URL}/dashboard/setari/billing/checkout?canceled=1`,
    })

    if (!session.url) {
      return NextResponse.json(
        { error: "Stripe nu a generat URL de checkout." },
        { status: 500 }
      )
    }

    return NextResponse.json({ url: session.url, sessionId: session.id })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Eroare necunoscută Stripe."
    console.error("[stripe/checkout]", message)
    return NextResponse.json({ error: `Eroare Stripe: ${message}` }, { status: 500 })
  }
}
