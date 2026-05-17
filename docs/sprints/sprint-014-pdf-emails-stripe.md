# Sprint 014 — PDF Generator + Onboarding Emails + Stripe Billing

**Status:** DONE
**Faza:** 5 (Commercial)
**Start:** 2026-05-17 19:00
**End:** 2026-05-17 19:55
**Owner:** manual: Claude (Opus 4.7 1M)

---

## Goal

Make CompliRoAI commercially usable: PDF export pe toate output-urile, transactional emails RO, Stripe checkout + portal + webhook cu 7 tiers locked per mandate § 15.

---

## Task list

- [x] Step 1: Billing types (BillingTier, SubscriptionStatus, OrgSubscription) + ComplianceState extension
- [x] Step 2: PDF generator (markdown → PDF via pdfkit, Vercel serverless safe)
- [x] Step 3: Wire PDF în audit-pack/readiness-pack/DPIA/RoPA/Breach/Vendor/AI Exposure
- [x] Step 4: 10 email templates RO (HTML + plaintext) + Resend sendEmail
- [x] Step 5: onboarding-emails + email-alerts + renewal-email + wire în auth/breach/findings stores
- [x] Step 6: Stripe tier config (7 tiers locked) + billing-store adapter
- [x] Step 7: Stripe API routes (checkout + portal + webhook signature verify)
- [x] Step 8: /dashboard/setari/billing UI (current tier + portal) + checkout page (pricing) + sidebar
- [x] Step 9: Sprint log + INDEX update
- [x] Build clean
- [x] Commit + push (9 commits)

---

## Files created

### Sprint 014 step 1 — Types
- `lib/compliance/types.ts` (extended) — `BillingTier`, `SubscriptionStatus`, `OrgSubscription` types + ComplianceState.orgSubscription field

### Sprint 014 step 2 — PDF
- `lib/server/pdf-generator.ts` — markdown → PDF via pdfkit with white-label branding, audit-ready badge, signer line, RO footer
- `lib/server/pdf-generator.test.ts` — 13 tests (magic bytes, size scaling, branding, audit-ready variant, sanitize filenames)
- `next.config.ts` (modified) — outputFileTracingIncludes for pdfkit AFM files + serverExternalPackages

### Sprint 014 step 3 — PDF routes
- `app/api/exports/audit-pack/pdf/route.ts` — combined audit pack PDF
- `app/api/exports/readiness-pack/pdf/route.ts` — readiness pack PDF
- `lib/server/readiness-pack-builder.ts` (extended) — "pdf" format support
- `app/api/dpia/[id]/export/route.ts` (extended) — ?format=pdf
- `app/api/breach/[id]/export/route.ts` (extended) — ?format=pdf
- `app/api/ropa/export/route.ts` (extended) — ?format=pdf
- `app/api/vendor-review/[id]/brief/route.ts` (extended) — ?format=pdf
- `app/api/ai-data-discovery/report/route.ts` (extended) — ?format=pdf
- `app/api/readiness-pack/generate/route.ts` (extended) — accepts "pdf" in parseFormat

### Sprint 014 step 4 — Email templates
- `lib/server/email-templates.ts` — 10 RO templates + sendEmail + Resend wrapper + interpolate helper
- `lib/server/email-templates.test.ts` — 15 tests (interpolation, all 10 templates render, required vars validated, branding injection, dev-mode console fallback)

### Sprint 014 step 5 — Email triggers
- `lib/server/onboarding-emails.ts` — sendWelcomeEmail + async fire-and-forget
- `lib/server/email-alerts.ts` — sendBreachAlertEmail + sendFindingCriticalEmail + sendDsarDeadlineEmail + sendVendorDpaExpiringEmail
- `lib/server/renewal-email.ts` — sendMonthlyDigestEmail + computeDigestStats from state
- `app/api/emails/test/route.ts` — admin endpoint to send any template (testing)
- `app/api/emails/monthly-digest/route.ts` — admin endpoint to trigger monthly digest
- `lib/server/breach-store.ts` (modified) — sends breach alert email când severity in [high, critical]
- `lib/server/findings-store.ts` (modified) — sends critical email când finding emitted as critical
- `app/api/auth/register/route.ts` (modified) — sends welcome email post-registration

### Sprint 014 step 6 — Stripe billing
- `lib/server/stripe-tier-config.ts` — 7 locked tiers (Free Trial + 6 paid + One-off) + feature mapping + isStripeConfigured + getStripePriceId + findTierByStripePriceId
- `lib/server/stripe-tier-config.test.ts` — 18 tests (locked pricing, NO fiscal SKUs, AI Builder API, Cabinet Pro white-label, Enterprise SSO/DPA/SLA, env graceful)
- `lib/server/billing-store.ts` — getCurrentSubscription + createSubscription + updateSubscriptionFromWebhook + cancelSubscription + calculateUsageMetrics + refreshUsageMetrics
- `lib/server/billing-store.test.ts` — 10 tests (usage metrics from state, empty state, audit packs by month)

### Sprint 014 step 7 — Stripe API
- `app/api/stripe/checkout/route.ts` — POST creates Checkout Session (subscription or payment mode for one-off)
- `app/api/stripe/portal/route.ts` — POST returns Customer Portal URL
- `app/api/stripe/webhook/route.ts` — POST handles 5 events with mandatory signature verification
- `app/api/stripe/webhook/route.test.ts` — 4 tests (env missing, signature missing, signature invalid)

### Sprint 014 step 8 — UI
- `app/dashboard/setari/billing/page.tsx` — server component, fetches subscription + tier config + Stripe ready state
- `app/dashboard/setari/billing/billing-client.tsx` — current tier card + usage metrics + portal button
- `app/dashboard/setari/billing/checkout/page.tsx` — server entry
- `app/dashboard/setari/billing/checkout/checkout-client.tsx` — pricing grid grouped (IMM | Builder | Cabinet | One-off), "Recomandat" highlights
- `components/shell/dashboard-shell.tsx` (modified) — NavItem "Setări facturare" with CreditCard icon

---

## Schema changes

- State extension: `ComplianceState.orgSubscription?: OrgSubscription` (optional, defaults absent)
- ReadinessPackRecord.format extended cu "pdf"
- NO Supabase schema changes; orgSubscription persistat via existing readState/writeState

---

## Tests

- `npx tsc --noEmit`: 0 errors
- `npm run build`: clean, exits 0
- `npx vitest run`: **507/507 pass** (447 existing + 60 new)
  - 13 PDF generator tests
  - 15 email templates tests
  - 18 Stripe tier config tests
  - 10 billing store tests
  - 4 webhook handler tests
- Live test:
  - `GET /api/exports/audit-pack/pdf` → PDF (cu auth)
  - `GET /api/dpia/{id}/export?format=pdf` → PDF
  - `POST /api/stripe/checkout` → 401 fără auth, 503 fără STRIPE_SECRET_KEY (expected)
  - `POST /api/stripe/webhook` → 503 fără STRIPE_WEBHOOK_SECRET (expected)
  - `POST /api/emails/test` → 401 fără auth (expected)

---

## Decisions made

- **PDF library = pdfkit** (NOT Puppeteer): pure JS, ~40ms generation, Vercel serverless safe cu fs.readFileSync patch pentru data dir + bundled TTF din @vercel/og. Puppeteer adds binary >100MB + cold-start 2-3s. @react-pdf/renderer over-kill pentru linear markdown.
- **No flushPages() in PDF generator:** pdfkit marca paginile ca finalize iar header/footer drawing era no-op. Lăsăm buffer-ul pendulează și editem inline înainte de doc.end().
- **Email scheduling deferred to Sprint 022 (cron):** DSAR deadline reminders + vendor DPA expiry + monthly digest sunt expuse ca funcții callable. Cron jobs vor fi adăugate în Sprint 022 cu serverless cron (`scheduledFunction` Vercel).
- **Stripe tier mapping via env vars (STRIPE_PRICE_*):** flexibilitate pentru a switch test/prod fără rebuild. Graceful degradation prin isStripeConfigured() → UI arată "billing pending" notice fără crash.
- **Webhook signature verification = mandatory:** dacă webhook secret lipsește, returnăm 503 (NU acceptăm event nesemnat — security-critical conform Stripe best practices).
- **Inline import al ./email-alerts în store-uri:** evită circular dependency risc + permite tree-shaking când email features dezactivate.
- **NU am implementat enforcement la tier limits (maxClients, maxAISystems):** soft tracking în usageMetrics, hard enforcement vine în Sprint 015 (role-aware UI) cu feature gates.
- **NO fiscal SKUs** verificat printr-un test dedicat (`NO fiscal SKUs in tier catalog`).

---

## Concerns / Blockers

- ⚠️ Pricing IDs din Stripe Dashboard trebuie create manual și mapate la env vars STRIPE_PRICE_{IMM_SOLO, IMM_MID, AI_BUILDER, CABINET_SOLO, CABINET_PRO, CABINET_ENTERPRISE, ONE_OFF_AUDIT}. Documentation pending pentru ops team.
- ⚠️ STRIPE_WEBHOOK_SECRET trebuie configurat în Vercel + webhook endpoint înregistrat în Stripe Dashboard la `https://app.compliroai.ro/api/stripe/webhook`.
- ⚠️ Resend domain verification: noreply@compliroai.ro trebuie validat în Resend (DNS records). Dev funcționează fără API key (channel = "console").
- ⚠️ PDF generation va eșua în Vercel serverless dacă Noto Sans TTF nu este traced — `outputFileTracingIncludes` în next.config.ts mitigates dar trebuie testat cu deploy real.

---

## Commits

- `0012202` — feat(sprint-14-1): billing types + OrgSubscription state
- `576538b` — feat(sprint-14-2): PDF generator (markdown → PDF with white-label branding)
- `3f6f047` — feat(sprint-14-3): PDF wire-up for audit pack + readiness + all module exports
- `41ff1dd` — feat(sprint-14-4): email templates RO (welcome + breach + dsar + vendor + finding + digest + 4 Stripe)
- `252aa04` — feat(sprint-14-5): email triggers wired into auth + breach + findings + DSAR + vendor stores
- `e375215` — feat(sprint-14-6): Stripe tier config (7 tiers locked) + billing-store adapter
- `e256f93` — feat(sprint-14-7): Stripe API routes (checkout + portal + webhook with signature verify)
- `52437ed` — feat(sprint-14-8): /dashboard/setari/billing UI (current tier + portal + invoices) + checkout pricing page

## Live URL

- Production: `https://eu-ai-act-beige.vercel.app/dashboard/setari/billing` (după push + Stripe env setup)
- Preview Vercel: dat de Vercel CI după push origin/main

---

## Dependencies

**Requires from previous sprints:**
- Sprint 003 — white-label (cabinet branding pentru PDF + email)
- Sprint 004/005 — Audit Pack + Readiness Pack builders (PDF wraps existing markdown)
- Sprint 008C/D — DPIA + Breach + RoPA stores (PDF + email triggers)
- Sprint 010 — Vendor Review (PDF brief + DPA email)
- Sprint 011 — Findings store (critical email trigger)
- Sprint 013 — Trust Center builder (digest stats source)

**Unlocks for next sprints:**
- Sprint 015 — Role-aware UI: tier-based feature gating va folosi `tierHasFeature(tier, feature)` din stripe-tier-config
- Sprint 022 — Auto-generation engine + Renewal Tracker: scheduled emails (DSAR + vendor DPA + monthly digest) vor fi triggered de cron
- Sprint 023 — API/SDK pentru AI Builders: API tier (ai_builder) deja are includesAPI=true flag

---

## Notes pentru următorul agent

- **DO NOT** add fiscal SKUs în stripe-tier-config (mandate rule 3, test enforces).
- Email-templates pattern: simple `{{var}}` interpolation; pentru template nou, adaugă în `TEMPLATES` const + crește vector test în "renders all 10 templates without crash".
- PDF generator: white-label branding (brandName, primaryColor, signerName) e auto-aplicat când `branding` e furnizat. Pentru un endpoint nou care return PDF, folosește pattern-ul deja stabilit: `await getEffectiveBranding(orgId)` + pasează la `generatePdfFromMarkdown`.
- Webhook: dacă vrei să adaugi event nou, extinde switch-ul în route.ts. Stripe library narrows `event.data.object` automat după `event.type`.
- Billing-store usage metrics: e calculat ad-hoc la fiecare GET billing — pentru Sprint 022 ar trebui agregat în cron + persistat.
- Tier-checking pentru UI feature gates (Sprint 015): folosește `getCurrentTier()` + `tierHasFeature(tier, "annex-iv")` pattern.
- Nu am setat enforcement (e.g. blocking actions când limit depășit) — soft tracking only. Decizie deliberată per mandate "informational, not enforced în v1".
