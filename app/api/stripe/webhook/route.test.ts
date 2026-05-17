// Sprint 014 — Stripe webhook smoke tests.
//
// Validate că:
//   1. Missing env (STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET) → 503
//   2. Missing stripe-signature header → 400
//   3. Invalid signature → 400 (signature verification works)

import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { POST } from "./route"

function makeRequest(body: string, headers: Record<string, string> = {}): Request {
  return new Request("http://localhost/api/stripe/webhook", {
    method: "POST",
    headers,
    body,
  })
}

describe("stripe webhook handler", () => {
  beforeEach(() => {
    delete process.env.STRIPE_SECRET_KEY
    delete process.env.STRIPE_WEBHOOK_SECRET
  })
  afterEach(() => {
    delete process.env.STRIPE_SECRET_KEY
    delete process.env.STRIPE_WEBHOOK_SECRET
  })

  it("returns 503 when STRIPE_SECRET_KEY missing", async () => {
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test"
    const req = makeRequest("{}", { "stripe-signature": "x" })
    const res = await POST(req)
    expect(res.status).toBe(503)
  })

  it("returns 503 when STRIPE_WEBHOOK_SECRET missing", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test"
    const req = makeRequest("{}", { "stripe-signature": "x" })
    const res = await POST(req)
    expect(res.status).toBe(503)
  })

  it("returns 400 when stripe-signature header missing", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_dummy"
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_dummy"
    const req = makeRequest("{}")
    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain("stripe-signature")
  })

  it("returns 400 with invalid signature", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_dummy"
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_dummy"
    const req = makeRequest('{"id":"evt_1","type":"checkout.session.completed"}', {
      "stripe-signature": "t=123,v1=invalid_signature_hash",
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    // Stripe library returns a "No signatures found matching" message for invalid sig.
    expect(body.error).toBeTruthy()
  })
})
