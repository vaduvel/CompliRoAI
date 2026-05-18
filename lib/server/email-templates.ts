// Sprint 014 — Email templates (RO HTML + plaintext fallback) + sendEmail
// helper via Resend.
//
// Template engine: simple `{{var}}` interpolation (no Handlebars). Toate
// template-urile sunt RO. Footer-ul include unsubscribe link conform
// recomandărilor CAN-SPAM/RO (lege 506/2004 telecom + GDPR Art. 21).
//
// Graceful degradation: dacă RESEND_API_KEY lipsește, log warn + return
// success (channel: "console"). Restul aplicației continuă să funcționeze.
//
// All RO subjects + body. Brand: CompliRoAI (sau white-label cabinet).

import { DEFAULT_BRANDING, type EffectiveBranding } from "./white-label"

const RESEND_API_KEY = process.env.RESEND_API_KEY?.trim() || ""
const FROM_ADDRESS =
  process.env.COMPLIROAI_EMAIL_FROM?.trim() || "CompliRoAI <noreply@compliroai.ro>"

// ────────────────────────────────────────────────────────────────────────────
//   Template registry
// ────────────────────────────────────────────────────────────────────────────

export type TemplateName =
  | "welcome"
  | "breach-72h-alert"
  | "dsar-deadline-alert"
  | "vendor-dpa-expiring"
  | "finding-critical-created"
  | "monthly-digest"
  | "payment-succeeded"
  | "payment-failed"
  | "subscription-changed"
  | "trial-ending"
  | "renewal-reminder"

export type EmailTemplateDef = {
  /** Subject line (cu {{var}} placeholders). */
  subject: string
  /** HTML body (cu {{var}} placeholders). */
  html: string
  /** Plaintext fallback (cu {{var}} placeholders). */
  text: string
  /** Required variable names — sendEmail throws dacă lipsesc. */
  requiredVars: readonly string[]
}

// Toate template-urile primesc accesul la `{{brandName}}`, `{{brandColor}}`,
// `{{footer}}`, `{{unsubscribeUrl}}` (injectate automat de buildBody).

const FOOTER_RO = `Acest email este informativ. Pentru întrebări legale specifice, contactați un specialist autorizat. Notificarea este trimisă automat de {{brandName}}.

Dezabonare: {{unsubscribeUrl}}`

function html(strings: TemplateStringsArray, ...vals: string[]): string {
  // helper just returns concatenated string (no escaping — template authors are us)
  let out = ""
  strings.forEach((s, i) => {
    out += s
    if (i < vals.length) out += vals[i]
  })
  return out
}

const TEMPLATES: Record<TemplateName, EmailTemplateDef> = {
  welcome: {
    subject: "Bun venit la {{brandName}}!",
    requiredVars: ["userName", "dashboardUrl"],
    html: html`<!DOCTYPE html><html lang="ro"><body style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#0f172a">
<div style="background:{{brandColor}};padding:18px 24px;border-radius:8px 8px 0 0;color:#fff">
<h1 style="margin:0;font-size:18px">Bun venit, {{userName}}!</h1>
</div>
<div style="border:1px solid #e2e8f0;border-top:none;padding:24px;border-radius:0 0 8px 8px">
<p>Mulțumim că te-ai înscris la {{brandName}} — sistemul operaţional de conformitate AI Act, GDPR, DORA și NIS2 pentru IMM-urile și cabinetele din România.</p>
<p>În următoarele 14 zile ai acces gratuit complet la:</p>
<ul>
<li>Inventar AI Systems + clasificare risc</li>
<li>DPIA, RoPA, DSAR, Breach 72h</li>
<li>Audit Pack + Trust Center publicabil</li>
<li>Vendor review cu DPA tracker</li>
</ul>
<p style="margin:24px 0"><a href="{{dashboardUrl}}" style="display:inline-block;padding:11px 20px;background:{{brandColor}};color:#fff;text-decoration:none;border-radius:6px;font-weight:600">Deschide dashboard-ul</a></p>
<p>Următorii pași recomandați:</p>
<ol>
<li>Completează profilul org în 4 pași (5 min)</li>
<li>Adaugă primul sistem AI sau lasă scanner-ul automat</li>
<li>Generează un Audit Pack pilot pentru a vedea livrabilul final</li>
</ol>
<p style="margin-top:24px;color:#64748b;font-size:13px">Răspunde direct la acest email pentru sprijin. Echipa {{brandName}}.</p>
<hr style="margin:22px 0;border:none;border-top:1px solid #e2e8f0">
<p style="color:#94a3b8;font-size:11px">{{footer}}</p>
</div></body></html>`,
    text: `Bun venit, {{userName}}!

Mulțumim că te-ai înscris la {{brandName}} — sistemul operațional de conformitate AI Act, GDPR, DORA și NIS2 pentru IMM-urile și cabinetele din România.

În următoarele 14 zile ai acces gratuit complet la:
- Inventar AI Systems + clasificare risc
- DPIA, RoPA, DSAR, Breach 72h
- Audit Pack + Trust Center publicabil
- Vendor review cu DPA tracker

Deschide dashboard-ul: {{dashboardUrl}}

Următorii pași:
1. Completează profilul org în 4 pași (5 min)
2. Adaugă primul sistem AI sau lasă scanner-ul automat
3. Generează un Audit Pack pilot pentru a vedea livrabilul final

Răspunde direct la acest email pentru sprijin.
Echipa {{brandName}}.

{{footer}}`,
  },

  "breach-72h-alert": {
    subject: "[URGENT] ANSPDCP 72h — {{breachTitle}}",
    requiredVars: ["breachTitle", "breachUrl", "deadlineDate", "severityLabel"],
    html: html`<!DOCTYPE html><html lang="ro"><body style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:24px">
<div style="background:#dc2626;padding:18px 24px;border-radius:8px 8px 0 0;color:#fff">
<h1 style="margin:0;font-size:18px">Alertă breach — notificare ANSPDCP în 72h</h1>
</div>
<div style="border:1px solid #fecaca;border-top:none;padding:24px;border-radius:0 0 8px 8px">
<p><strong>{{breachTitle}}</strong></p>
<p>Severitate: <strong>{{severityLabel}}</strong></p>
<p>Conform GDPR Art. 33, ai obligația de notificare la ANSPDCP în maximum 72h de la conștientizarea breach-ului.</p>
<p>Deadline notificare: <strong>{{deadlineDate}}</strong></p>
<p style="margin:24px 0"><a href="{{breachUrl}}" style="display:inline-block;padding:11px 20px;background:#dc2626;color:#fff;text-decoration:none;border-radius:6px;font-weight:600">Deschide dosarul breach</a></p>
<p style="margin-top:24px;color:#64748b;font-size:13px">{{brandName}} a pre-generat narrativul de notificare. Verifică, completează și transmite spre ANSPDCP.</p>
<hr style="margin:22px 0;border:none;border-top:1px solid #e2e8f0">
<p style="color:#94a3b8;font-size:11px">{{footer}}</p>
</div></body></html>`,
    text: `[URGENT] ANSPDCP 72h — {{breachTitle}}

Severitate: {{severityLabel}}

Conform GDPR Art. 33, ai obligația de notificare la ANSPDCP în maximum 72h de la conștientizarea breach-ului.

Deadline notificare: {{deadlineDate}}

Deschide dosarul: {{breachUrl}}

{{brandName}} a pre-generat narrativul de notificare. Verifică, completează și transmite spre ANSPDCP.

{{footer}}`,
  },

  "dsar-deadline-alert": {
    subject: "DSAR scadență {{deadlineDate}} — {{dsarType}}",
    requiredVars: ["dsarType", "dsarUrl", "deadlineDate", "daysLeft", "subjectIdentifier"],
    html: html`<!DOCTYPE html><html lang="ro"><body style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:24px">
<div style="background:#f59e0b;padding:18px 24px;border-radius:8px 8px 0 0;color:#fff">
<h1 style="margin:0;font-size:18px">DSAR — {{daysLeft}} zile până la scadență</h1>
</div>
<div style="border:1px solid #fde68a;border-top:none;padding:24px;border-radius:0 0 8px 8px">
<p>Cerere {{dsarType}} de la <strong>{{subjectIdentifier}}</strong> trebuie rezolvată în {{daysLeft}} zile.</p>
<p>Termen legal GDPR Art. 12(3): <strong>{{deadlineDate}}</strong></p>
<p style="margin:24px 0"><a href="{{dsarUrl}}" style="display:inline-block;padding:11px 20px;background:#f59e0b;color:#fff;text-decoration:none;border-radius:6px;font-weight:600">Deschide cererea</a></p>
<hr style="margin:22px 0;border:none;border-top:1px solid #e2e8f0">
<p style="color:#94a3b8;font-size:11px">{{footer}}</p>
</div></body></html>`,
    text: `DSAR scadență {{deadlineDate}} — {{dsarType}}

Cerere {{dsarType}} de la {{subjectIdentifier}} trebuie rezolvată în {{daysLeft}} zile.

Termen legal GDPR Art. 12(3): {{deadlineDate}}

Deschide cererea: {{dsarUrl}}

{{footer}}`,
  },

  "vendor-dpa-expiring": {
    subject: "DPA expiră în {{daysLeft}} zile — {{vendorName}}",
    requiredVars: ["vendorName", "vendorUrl", "expiryDate", "daysLeft"],
    html: html`<!DOCTYPE html><html lang="ro"><body style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:24px">
<div style="background:#f59e0b;padding:18px 24px;border-radius:8px 8px 0 0;color:#fff">
<h1 style="margin:0;font-size:18px">DPA expiră în {{daysLeft}} zile — {{vendorName}}</h1>
</div>
<div style="border:1px solid #fde68a;border-top:none;padding:24px;border-radius:0 0 8px 8px">
<p>Acordul de prelucrare a datelor (DPA) cu vendorul <strong>{{vendorName}}</strong> expiră la <strong>{{expiryDate}}</strong>.</p>
<p>Conform GDPR Art. 28, trebuie să ai un DPA valid în vigoare pentru orice procesor.</p>
<p style="margin:24px 0"><a href="{{vendorUrl}}" style="display:inline-block;padding:11px 20px;background:#f59e0b;color:#fff;text-decoration:none;border-radius:6px;font-weight:600">Reînnoiește DPA</a></p>
<hr style="margin:22px 0;border:none;border-top:1px solid #e2e8f0">
<p style="color:#94a3b8;font-size:11px">{{footer}}</p>
</div></body></html>`,
    text: `DPA expiră în {{daysLeft}} zile — {{vendorName}}

Acordul de prelucrare a datelor (DPA) cu vendorul {{vendorName}} expiră la {{expiryDate}}.

Conform GDPR Art. 28, trebuie să ai un DPA valid pentru orice procesor.

Deschide: {{vendorUrl}}

{{footer}}`,
  },

  "finding-critical-created": {
    subject: "Risc critic detectat — {{findingTitle}}",
    requiredVars: ["findingTitle", "findingUrl", "category", "createdAtDate"],
    html: html`<!DOCTYPE html><html lang="ro"><body style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:24px">
<div style="background:#dc2626;padding:18px 24px;border-radius:8px 8px 0 0;color:#fff">
<h1 style="margin:0;font-size:18px">Risc critic detectat</h1>
</div>
<div style="border:1px solid #fecaca;border-top:none;padding:24px;border-radius:0 0 8px 8px">
<p><strong>{{findingTitle}}</strong></p>
<p>Categorie: <strong>{{category}}</strong> · Detectat: {{createdAtDate}}</p>
<p>{{brandName}} a identificat un risc critic care necesită atenție imediată din partea responsabilului de conformitate.</p>
<p style="margin:24px 0"><a href="{{findingUrl}}" style="display:inline-block;padding:11px 20px;background:#dc2626;color:#fff;text-decoration:none;border-radius:6px;font-weight:600">Vezi detalii</a></p>
<hr style="margin:22px 0;border:none;border-top:1px solid #e2e8f0">
<p style="color:#94a3b8;font-size:11px">{{footer}}</p>
</div></body></html>`,
    text: `Risc critic detectat — {{findingTitle}}

Categorie: {{category}}
Detectat: {{createdAtDate}}

{{brandName}} a identificat un risc critic care necesită atenție imediată din partea responsabilului de conformitate.

Vezi detalii: {{findingUrl}}

{{footer}}`,
  },

  "monthly-digest": {
    subject: "Raport lunar {{brandName}} — {{monthLabel}}",
    requiredVars: ["monthLabel", "compliancePct", "openFindingsCount", "actionsCompletedCount", "upcomingDeadlinesCount", "dashboardUrl"],
    html: html`<!DOCTYPE html><html lang="ro"><body style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:24px">
<div style="background:{{brandColor}};padding:18px 24px;border-radius:8px 8px 0 0;color:#fff">
<h1 style="margin:0;font-size:18px">Raport lunar — {{monthLabel}}</h1>
</div>
<div style="border:1px solid #e2e8f0;border-top:none;padding:24px;border-radius:0 0 8px 8px">
<p>Sumar postura conformitate {{brandName}}:</p>
<table style="width:100%;border-collapse:collapse;margin:14px 0">
<tr><td style="padding:8px;border-bottom:1px solid #e2e8f0">Conformitate generală</td><td style="text-align:right;padding:8px;border-bottom:1px solid #e2e8f0"><strong>{{compliancePct}}%</strong></td></tr>
<tr><td style="padding:8px;border-bottom:1px solid #e2e8f0">Findings active</td><td style="text-align:right;padding:8px;border-bottom:1px solid #e2e8f0"><strong>{{openFindingsCount}}</strong></td></tr>
<tr><td style="padding:8px;border-bottom:1px solid #e2e8f0">Acțiuni completate luna trecută</td><td style="text-align:right;padding:8px;border-bottom:1px solid #e2e8f0"><strong>{{actionsCompletedCount}}</strong></td></tr>
<tr><td style="padding:8px">Deadline-uri în 30 zile</td><td style="text-align:right;padding:8px"><strong>{{upcomingDeadlinesCount}}</strong></td></tr>
</table>
<p style="margin:24px 0"><a href="{{dashboardUrl}}" style="display:inline-block;padding:11px 20px;background:{{brandColor}};color:#fff;text-decoration:none;border-radius:6px;font-weight:600">Deschide cockpit</a></p>
<hr style="margin:22px 0;border:none;border-top:1px solid #e2e8f0">
<p style="color:#94a3b8;font-size:11px">{{footer}}</p>
</div></body></html>`,
    text: `Raport lunar {{brandName}} — {{monthLabel}}

Sumar postura conformitate:
- Conformitate generală: {{compliancePct}}%
- Findings active: {{openFindingsCount}}
- Acțiuni completate luna trecută: {{actionsCompletedCount}}
- Deadline-uri în 30 zile: {{upcomingDeadlinesCount}}

Deschide cockpit: {{dashboardUrl}}

{{footer}}`,
  },

  "payment-succeeded": {
    subject: "Plată confirmată — {{tierName}} ({{amountEUR}}€)",
    requiredVars: ["tierName", "amountEUR", "invoiceUrl", "periodEndDate"],
    html: html`<!DOCTYPE html><html lang="ro"><body style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:24px">
<div style="background:#10b981;padding:18px 24px;border-radius:8px 8px 0 0;color:#fff">
<h1 style="margin:0;font-size:18px">Plată confirmată</h1>
</div>
<div style="border:1px solid #d1fae5;border-top:none;padding:24px;border-radius:0 0 8px 8px">
<p>Mulțumim! Plata pentru abonamentul {{brandName}} a fost confirmată.</p>
<p>Plan: <strong>{{tierName}}</strong></p>
<p>Sumă: <strong>{{amountEUR}}€</strong></p>
<p>Următoarea facturare: {{periodEndDate}}</p>
<p style="margin:24px 0"><a href="{{invoiceUrl}}" style="display:inline-block;padding:11px 20px;background:#10b981;color:#fff;text-decoration:none;border-radius:6px;font-weight:600">Descarcă factura</a></p>
<hr style="margin:22px 0;border:none;border-top:1px solid #e2e8f0">
<p style="color:#94a3b8;font-size:11px">{{footer}}</p>
</div></body></html>`,
    text: `Plată confirmată — {{tierName}} ({{amountEUR}}€)

Plan: {{tierName}}
Sumă: {{amountEUR}}€
Următoarea facturare: {{periodEndDate}}

Descarcă factura: {{invoiceUrl}}

{{footer}}`,
  },

  "payment-failed": {
    subject: "Plată eșuată — {{tierName}}",
    requiredVars: ["tierName", "amountEUR", "billingPortalUrl", "retryDate"],
    html: html`<!DOCTYPE html><html lang="ro"><body style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:24px">
<div style="background:#dc2626;padding:18px 24px;border-radius:8px 8px 0 0;color:#fff">
<h1 style="margin:0;font-size:18px">Plată eșuată — acțiune necesară</h1>
</div>
<div style="border:1px solid #fecaca;border-top:none;padding:24px;border-radius:0 0 8px 8px">
<p>Nu am putut procesa plata pentru abonamentul {{tierName}} ({{amountEUR}}€).</p>
<p>Stripe va reîncerca automat la {{retryDate}}. Pentru a evita suspendarea accesului, actualizează metoda de plată acum:</p>
<p style="margin:24px 0"><a href="{{billingPortalUrl}}" style="display:inline-block;padding:11px 20px;background:#dc2626;color:#fff;text-decoration:none;border-radius:6px;font-weight:600">Actualizează plată</a></p>
<hr style="margin:22px 0;border:none;border-top:1px solid #e2e8f0">
<p style="color:#94a3b8;font-size:11px">{{footer}}</p>
</div></body></html>`,
    text: `Plată eșuată — {{tierName}}

Nu am putut procesa plata ({{amountEUR}}€) pentru abonamentul {{tierName}}.

Stripe va reîncerca automat la {{retryDate}}. Pentru a evita suspendarea, actualizează metoda de plată:

{{billingPortalUrl}}

{{footer}}`,
  },

  "subscription-changed": {
    subject: "Abonament actualizat — {{newTierName}}",
    requiredVars: ["newTierName", "newPriceEUR", "effectiveDate", "billingPortalUrl"],
    html: html`<!DOCTYPE html><html lang="ro"><body style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:24px">
<div style="background:{{brandColor}};padding:18px 24px;border-radius:8px 8px 0 0;color:#fff">
<h1 style="margin:0;font-size:18px">Abonament actualizat</h1>
</div>
<div style="border:1px solid #e2e8f0;border-top:none;padding:24px;border-radius:0 0 8px 8px">
<p>Abonamentul tău {{brandName}} a fost actualizat la <strong>{{newTierName}}</strong>.</p>
<p>Preț nou: <strong>{{newPriceEUR}}€/lună</strong></p>
<p>Începe: {{effectiveDate}}</p>
<p style="margin:24px 0"><a href="{{billingPortalUrl}}" style="display:inline-block;padding:11px 20px;background:{{brandColor}};color:#fff;text-decoration:none;border-radius:6px;font-weight:600">Gestionează abonament</a></p>
<hr style="margin:22px 0;border:none;border-top:1px solid #e2e8f0">
<p style="color:#94a3b8;font-size:11px">{{footer}}</p>
</div></body></html>`,
    text: `Abonament actualizat — {{newTierName}}

Abonamentul tău {{brandName}} a fost actualizat la {{newTierName}}.
Preț nou: {{newPriceEUR}}€/lună
Începe: {{effectiveDate}}

Gestionează abonament: {{billingPortalUrl}}

{{footer}}`,
  },

  "renewal-reminder": {
    subject: "Reminder: {{entityLabel}} — {{daysLeft}} zile până la deadline",
    requiredVars: ["entityLabel", "entityUrl", "deadlineDate", "daysLeft", "recommendedAction", "triggerType"],
    html: html`<!DOCTYPE html><html lang="ro"><body style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:24px">
<div style="background:#3b5bdb;padding:18px 24px;border-radius:8px 8px 0 0;color:#fff">
<h1 style="margin:0;font-size:18px">Reminder conformitate — {{entityLabel}}</h1>
</div>
<div style="border:1px solid #e2e8f0;border-top:none;padding:24px;border-radius:0 0 8px 8px">
<p>Engine-ul preventiv {{brandName}} a detectat o acțiune cu deadline apropiat.</p>
<p>Trigger: <strong>{{triggerType}}</strong></p>
<p>Termen: <strong>{{deadlineDate}}</strong> ({{daysLeft}} zile rămase)</p>
<p>Acțiune recomandată: {{recommendedAction}}</p>
<p style="margin:24px 0"><a href="{{entityUrl}}" style="display:inline-block;padding:11px 20px;background:#3b5bdb;color:#fff;text-decoration:none;border-radius:6px;font-weight:600">Deschide modulul</a></p>
<hr style="margin:22px 0;border:none;border-top:1px solid #e2e8f0">
<p style="color:#94a3b8;font-size:11px">{{footer}}</p>
</div></body></html>`,
    text: `Reminder conformitate — {{entityLabel}}

Trigger: {{triggerType}}
Termen: {{deadlineDate}} ({{daysLeft}} zile rămase)
Acțiune recomandată: {{recommendedAction}}

Deschide: {{entityUrl}}

{{footer}}`,
  },

  "trial-ending": {
    subject: "Trial-ul tău expiră în {{daysLeft}} zile",
    requiredVars: ["daysLeft", "trialEndDate", "checkoutUrl"],
    html: html`<!DOCTYPE html><html lang="ro"><body style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:24px">
<div style="background:#f59e0b;padding:18px 24px;border-radius:8px 8px 0 0;color:#fff">
<h1 style="margin:0;font-size:18px">Trial-ul tău se încheie în {{daysLeft}} zile</h1>
</div>
<div style="border:1px solid #fde68a;border-top:none;padding:24px;border-radius:0 0 8px 8px">
<p>Trial-ul {{brandName}} expiră la <strong>{{trialEndDate}}</strong>.</p>
<p>Alege un plan pentru a păstra acces la audit pack, breach 72h, DPIA, RoPA, Trust Center și restul modulelor:</p>
<p style="margin:24px 0"><a href="{{checkoutUrl}}" style="display:inline-block;padding:11px 20px;background:{{brandColor}};color:#fff;text-decoration:none;border-radius:6px;font-weight:600">Vezi planurile</a></p>
<hr style="margin:22px 0;border:none;border-top:1px solid #e2e8f0">
<p style="color:#94a3b8;font-size:11px">{{footer}}</p>
</div></body></html>`,
    text: `Trial-ul tău se încheie în {{daysLeft}} zile

Trial-ul {{brandName}} expiră la {{trialEndDate}}.

Alege un plan: {{checkoutUrl}}

{{footer}}`,
  },
}

// ────────────────────────────────────────────────────────────────────────────
//   Template rendering
// ────────────────────────────────────────────────────────────────────────────

/**
 * Interpolează {{var}} placeholders dintr-un template string.
 * Strict mode: aruncă error dacă o variabilă required lipsește; placeholders
 * neutilizate sunt OK.
 */
export function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    const value = vars[key]
    return value !== undefined ? String(value) : `{{${key}}}`
  })
}

export function listTemplates(): TemplateName[] {
  return Object.keys(TEMPLATES) as TemplateName[]
}

export function getTemplate(name: TemplateName): EmailTemplateDef {
  const t = TEMPLATES[name]
  if (!t) throw new Error(`Template necunoscut: ${name}`)
  return t
}

/**
 * Render full email content (subject + html + text) cu branding context injected.
 */
export function renderTemplate(
  name: TemplateName,
  vars: Record<string, string>,
  branding?: EffectiveBranding | null
): { subject: string; html: string; text: string } {
  const template = getTemplate(name)
  const brand = branding ?? { ...DEFAULT_BRANDING, isCustom: false }
  const brandName = brand.brandName || "CompliRoAI"
  const brandColor = brand.primaryColor || "#3b5bdb"
  const unsubscribeUrl = vars.unsubscribeUrl || "https://compliroai.ro/dashboard/setari/emailuri"
  const footer = interpolate(FOOTER_RO, {
    brandName,
    unsubscribeUrl,
  })
  const enrichedVars: Record<string, string> = {
    ...vars,
    brandName,
    brandColor,
    unsubscribeUrl,
    footer,
  }

  // Validate required vars
  for (const required of template.requiredVars) {
    if (!(required in vars) || vars[required] === undefined || vars[required] === null) {
      throw new Error(
        `Template ${name} requires variable "${required}" but it was not provided.`
      )
    }
  }

  return {
    subject: interpolate(template.subject, enrichedVars),
    html: interpolate(template.html, enrichedVars),
    text: interpolate(template.text, enrichedVars),
  }
}

// ────────────────────────────────────────────────────────────────────────────
//   sendEmail (Resend)
// ────────────────────────────────────────────────────────────────────────────

export type SendEmailResult =
  | { ok: true; channel: "resend" | "console"; id?: string }
  | { ok: false; channel: "resend" | "console"; error: string }

export type SendEmailOptions = {
  from?: string
  replyTo?: string
  branding?: EffectiveBranding | null
}

/**
 * Sends a transactional email using the given template name.
 *
 * Graceful degradation: when RESEND_API_KEY is missing (dev), prints to
 * console and returns success. App never crashes on missing env.
 */
export async function sendEmail(
  template: TemplateName,
  to: string,
  vars: Record<string, string>,
  options: SendEmailOptions = {}
): Promise<SendEmailResult> {
  let rendered: { subject: string; html: string; text: string }
  try {
    rendered = renderTemplate(template, vars, options.branding)
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Template render failed"
    return { ok: false, channel: "console", error: msg }
  }

  if (!RESEND_API_KEY) {
    console.log(
      `[email-templates] (no RESEND_API_KEY) → ${to} | ${template} | "${rendered.subject}"`
    )
    return { ok: true, channel: "console" }
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: options.from || FROM_ADDRESS,
        to: [to],
        reply_to: options.replyTo,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
      }),
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText)
      console.error(`[email-templates] Resend error ${res.status}: ${errText}`)
      return {
        ok: false,
        channel: "resend",
        error: `HTTP ${res.status}: ${errText.slice(0, 200)}`,
      }
    }
    const data = (await res.json().catch(() => ({}))) as { id?: string }
    return { ok: true, channel: "resend", id: data.id }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "fetch failed"
    console.error(`[email-templates] Resend exception: ${msg}`)
    return { ok: false, channel: "resend", error: msg }
  }
}
