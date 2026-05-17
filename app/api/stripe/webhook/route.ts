// Sprint 014 — POST /api/stripe/webhook
//
// Recipe Stripe events și actualizează ComplianceState.orgSubscription.
// Webhook signature verification REQUIRED (security-critical).
//
// Events handled:
//   - checkout.session.completed     → createSubscription
//   - customer.subscription.updated  → updateSubscriptionFromWebhook
//   - customer.subscription.deleted  → cancelSubscription
//   - invoice.payment_succeeded      → trigger payment-succeeded email
//   - invoice.payment_failed         → status='past_due' + trigger payment-failed email
//
// Caller (Stripe Dashboard) configurează webhook secret în
// STRIPE_WEBHOOK_SECRET (mandatory pentru production).

import { NextResponse } from "next/server"
import Stripe from "stripe"

import {
  createSubscription,
  updateSubscriptionFromWebhook,
  cancelSubscription,
} from "@/lib/server/billing-store"
import { findTierByStripePriceId, getTierConfig } from "@/lib/server/stripe-tier-config"
import { sendEmail } from "@/lib/server/email-templates"
import type { BillingTier, SubscriptionStatus } from "@/lib/compliance/types"

// IMPORTANT: Stripe webhook payload requires raw body for signature verification.
// Next.js parses JSON by default — we override via `request.text()`.
export const runtime = "nodejs"

function mapStripeStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  switch (status) {
    case "trialing":
      return "trialing"
    case "active":
      return "active"
    case "past_due":
      return "past_due"
    case "canceled":
      return "canceled"
    case "incomplete":
      return "incomplete"
    case "incomplete_expired":
      return "incomplete_expired"
    case "unpaid":
      return "unpaid"
    case "paused":
      return "active"   // tratează paused ca active (rare in retail)
    default:
      return "none"
  }
}

function periodISOFromUnix(unix: number | null | undefined): string | undefined {
  if (!unix || typeof unix !== "number") return undefined
  return new Date(unix * 1000).toISOString()
}

function resolveTierFromSubscription(sub: Stripe.Subscription): BillingTier | null {
  // Prefer metadata (set at checkout)
  const meta = sub.metadata?.tier
  if (meta && typeof meta === "string") {
    const candidate = meta as BillingTier
    try {
      getTierConfig(candidate)
      return candidate
    } catch {
      // fall through to price lookup
    }
  }
  // Fallback: lookup tier by price ID
  const priceId = sub.items.data[0]?.price?.id
  if (priceId) {
    const found = findTierByStripePriceId(priceId)
    if (found) return found
  }
  return null
}

export async function POST(request: Request) {
  const secret = process.env.STRIPE_SECRET_KEY?.trim()
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim()

  if (!secret || !webhookSecret) {
    console.warn(
      "[stripe/webhook] STRIPE_SECRET_KEY sau STRIPE_WEBHOOK_SECRET lipsește — webhook ignorat."
    )
    return NextResponse.json(
      { error: "Stripe webhook not configured." },
      { status: 503 }
    )
  }

  const signature = request.headers.get("stripe-signature")
  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header." },
      { status: 400 }
    )
  }

  const rawBody = await request.text()
  const stripe = new Stripe(secret, {
    apiVersion: "2024-12-18.acacia" as Stripe.LatestApiVersion,
    typescript: true,
  })

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Signature verification failed."
    console.error("[stripe/webhook] verification failed:", message)
    return NextResponse.json({ error: message }, { status: 400 })
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        const orgId = session.metadata?.orgId ?? session.client_reference_id
        const tier = session.metadata?.tier as BillingTier | undefined
        if (!orgId || !tier) {
          console.warn("[stripe/webhook] checkout.completed lipsește metadata orgId/tier")
          break
        }
        const customerId =
          typeof session.customer === "string" ? session.customer : session.customer?.id
        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id
        await createSubscription({
          orgId,
          tier,
          status: "active",
          stripeCustomerId: customerId ?? undefined,
          stripeSubscriptionId: subscriptionId ?? undefined,
        })
        break
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription
        const orgId = sub.metadata?.orgId
        if (!orgId) {
          console.warn(`[stripe/webhook] ${event.type} lipsește metadata.orgId`)
          break
        }
        const tier = resolveTierFromSubscription(sub) ?? undefined
        const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id

        // existing or create
        const updated = await updateSubscriptionFromWebhook(orgId, {
          tier,
          status: mapStripeStatus(sub.status),
          stripeCustomerId: customerId,
          stripeSubscriptionId: sub.id,
          stripePriceId: sub.items.data[0]?.price?.id,
          currentPeriodStartISO: periodISOFromUnix(sub.current_period_start),
          currentPeriodEndISO: periodISOFromUnix(sub.current_period_end),
          trialEndsAtISO: periodISOFromUnix(sub.trial_end),
          cancelAtPeriodEnd: sub.cancel_at_period_end,
        })
        if (!updated && tier) {
          // Org didn't have a subscription yet — bootstrap it.
          await createSubscription({
            orgId,
            tier,
            status: mapStripeStatus(sub.status),
            stripeCustomerId: customerId,
            stripeSubscriptionId: sub.id,
            stripePriceId: sub.items.data[0]?.price?.id,
            currentPeriodStartISO: periodISOFromUnix(sub.current_period_start),
            currentPeriodEndISO: periodISOFromUnix(sub.current_period_end),
            trialEndsAtISO: periodISOFromUnix(sub.trial_end),
            cancelAtPeriodEnd: sub.cancel_at_period_end,
          })
        }
        break
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription
        const orgId = sub.metadata?.orgId
        if (orgId) {
          await cancelSubscription(orgId)
        }
        break
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice
        const email = invoice.customer_email ?? null
        const subscriptionId =
          typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id
        if (email && subscriptionId) {
          // fetch subscription to recover tier
          try {
            const sub = await stripe.subscriptions.retrieve(subscriptionId)
            const tier = resolveTierFromSubscription(sub)
            const tierConfig = tier ? getTierConfig(tier) : null
            await sendEmail("payment-succeeded", email, {
              tierName: tierConfig?.displayName ?? "Abonament",
              amountEUR: String(Math.round((invoice.amount_paid ?? 0) / 100)),
              invoiceUrl: invoice.hosted_invoice_url ?? "",
              periodEndDate: new Date(
                (invoice.period_end ?? 0) * 1000
              ).toLocaleDateString("ro-RO", { day: "numeric", month: "long", year: "numeric" }),
            })
          } catch (err) {
            console.warn("[stripe/webhook] payment_succeeded email failed:", err)
          }
        }
        break
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice
        const email = invoice.customer_email ?? null
        const subscriptionId =
          typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id
        if (email && subscriptionId) {
          try {
            const sub = await stripe.subscriptions.retrieve(subscriptionId)
            const orgId = sub.metadata?.orgId
            if (orgId) {
              await updateSubscriptionFromWebhook(orgId, { status: "past_due" })
            }
            const tier = resolveTierFromSubscription(sub)
            const tierConfig = tier ? getTierConfig(tier) : null
            await sendEmail("payment-failed", email, {
              tierName: tierConfig?.displayName ?? "Abonament",
              amountEUR: String(Math.round((invoice.amount_due ?? 0) / 100)),
              billingPortalUrl: `${process.env.NEXT_PUBLIC_BASE_URL ?? "https://app.compliroai.ro"}/dashboard/setari/billing`,
              retryDate: invoice.next_payment_attempt
                ? new Date(invoice.next_payment_attempt * 1000).toLocaleDateString("ro-RO")
                : "în curând",
            })
          } catch (err) {
            console.warn("[stripe/webhook] payment_failed email failed:", err)
          }
        }
        break
      }

      default:
        // ignore other events silently
        break
    }

    return NextResponse.json({ received: true, type: event.type })
  } catch (err) {
    const message = err instanceof Error ? err.message : "webhook handler error"
    console.error("[stripe/webhook] handler error:", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
