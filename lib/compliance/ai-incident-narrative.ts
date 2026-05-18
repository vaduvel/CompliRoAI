/**
 * Sprint 020 — AI Incident Narrative generators (Art. 73(5) EU AI Act).
 *
 * Produc markdown copy-paste ready pentru:
 *  1. Notificare către autoritatea de supraveghere a pieței (Art. 73(5)) —
 *     formular de bază ce poate fi trimis prin platforma oficială / email.
 *  2. Update follow-up cu informații suplimentare la cererea autorității
 *     (Art. 73(7)).
 *
 * NU conține asistență juridică — sunt template-uri operaționale care
 * populează automat datele record-ului. DPO + responsabil AI trebuie să
 * valideze înainte de transmiterea oficială.
 *
 * Texts sunt în română (mandate § 20).
 *
 * Distinct from breach-narrative.ts (Sprint 008D) — acela este pentru GDPR
 * Art. 33 ANSPDCP (date personale). Acest narrative este pentru Art. 73 AI
 * Act (incidente serioase sisteme AI high-risk).
 */

import {
  AI_INCIDENT_CATEGORY_LABELS,
  AI_INCIDENT_SEVERITY_LABELS,
  AI_INCIDENT_STATUS_LABELS,
} from "@/lib/compliance/ai-incident-schema"
import type { AIIncident } from "@/lib/compliance/types"

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDateRO(iso: string | undefined): string {
  if (!iso) return "necompletat"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString("ro-RO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function bullet(items: string[], empty: string): string {
  if (items.length === 0) return `- ${empty}`
  return items.map((item) => `- ${item}`).join("\n")
}

function deadlineLabel(incident: AIIncident, nowISO: string): string {
  const diffMs =
    new Date(incident.reportingDeadlineISO).getTime() - new Date(nowISO).getTime()
  const hours = Math.round(Math.abs(diffMs) / 3_600_000)
  const days = Math.round(Math.abs(diffMs) / 86_400_000)
  return diffMs >= 0
    ? `${days} zile (${hours}h) rămase din ${incident.reportingDeadlineDays} zile`
    : `termenul a fost depășit cu ${days} zile (${hours}h)`
}

// ── Authority notification (Art. 73(5)) ──────────────────────────────────────

/**
 * Generează notificarea către autoritatea de supraveghere a pieței conform
 * Art. 73(5). Include:
 *  - Header organizație + sistem AI implicat
 *  - Natura + împrejurări (Art. 73(5))
 *  - Părți afectate (Art. 73(5))
 *  - Cronologie + termen Art. 73(3)
 *  - Măsuri provizorii (Art. 73(5))
 *  - Plan investigare cauză rădăcină (Art. 73(4))
 *  - Anexe + date contact
 */
export function generateAuthorityNotification(
  incident: AIIncident,
  orgName: string,
  systemName?: string,
  nowISO: string = new Date().toISOString(),
): string {
  const sysName = systemName ?? incident.linkedAISystemId
  const lastNotification =
    incident.notifications && incident.notifications.length > 0
      ? incident.notifications[incident.notifications.length - 1]
      : undefined
  const authorityName =
    lastNotification?.authorityName ?? "_de completat: numele autorității competente_"
  const referenceNumber = lastNotification?.referenceNumber

  const lines: (string | null)[] = [
    "# Notificare incident serios — sistem AI high-risk",
    "# EU AI Act Art. 73 — Notificare către autoritatea de supraveghere a pieței",
    "",
    `**Operator (provider / deployer):** ${orgName || "necompletat"}`,
    `**Data notificării:** ${formatDateRO(lastNotification?.submittedAtISO ?? nowISO)}`,
    `**Autoritatea destinatară:** ${authorityName}`,
    referenceNumber ? `**Număr de înregistrare:** ${referenceNumber}` : null,
    "",
    "---",
    "",
    "## 1. Natura incidentului (Art. 73(5))",
    "",
    `**Titlu incident:** ${incident.title}`,
    `**Categorie Art. 73(2):** ${AI_INCIDENT_CATEGORY_LABELS[incident.category]}`,
    `**Severitate intern:** ${AI_INCIDENT_SEVERITY_LABELS[incident.severity]}`,
    "",
    "**Descriere:**",
    "",
    incident.description || "_de completat_",
    "",
    "## 2. Sistemul AI implicat",
    "",
    `**Sistem AI:** ${sysName}`,
    `**ID sistem (intern):** ${incident.linkedAISystemId}`,
    "",
    "## 3. Cronologie (Art. 73(3))",
    "",
    incident.occurredAtISO
      ? `- Producere estimată: ${formatDateRO(incident.occurredAtISO)}`
      : "- Producere estimată: necunoscută",
    `- Detectare (clock start Art. 73(3)): ${formatDateRO(incident.detectedAtISO)}`,
    `- Termen Art. 73(3) (${incident.reportingDeadlineDays} zile): ${formatDateRO(incident.reportingDeadlineISO)} (${deadlineLabel(incident, nowISO)})`,
    lastNotification?.submittedAtISO
      ? `- Notificare transmisă: ${formatDateRO(lastNotification.submittedAtISO)}`
      : null,
    "",
    "## 4. Părți afectate (Art. 73(5))",
    "",
    `**Număr aproximativ de persoane afectate:** ${
      typeof incident.affectedSubjectsCount === "number"
        ? incident.affectedSubjectsCount
        : "necunoscut"
    }`,
    "",
    "**Categorii de persoane vizate:**",
    bullet(incident.affectedSubjectsCategories, "necompletat"),
    "",
    "## 5. Împrejurări detaliate",
    "",
    "Incidentul a fost identificat în urma:",
    "",
    incident.linkedPmmAnomalyId
      ? `- escaladării unei anomalii PMM (Sprint 019 — Art. 72(4)). ID anomalie: ${incident.linkedPmmAnomalyId}.`
      : "- intake manual / detectare directă în operare.",
    incident.linkedBreachId
      ? `- evenimentul atinge și date personale; un BreachRecord paralel (Art. 33 GDPR) este în curs de notificare către ANSPDCP. ID: ${incident.linkedBreachId}.`
      : null,
    "",
    "## 6. Măsuri provizorii aplicate (Art. 73(5))",
    "",
    incident.rootCause?.remediationActions &&
    incident.rootCause.remediationActions.length > 0
      ? bullet(incident.rootCause.remediationActions, "necompletat")
      : "- _Acțiuni corective imediate de completat: ex: dezactivarea temporară a sistemului, override manual, escaladare către echipa de risc_",
    "",
    "## 7. Plan investigare cauză rădăcină (Art. 73(4))",
    "",
    incident.rootCause
      ? generateRootCauseSection(incident.rootCause)
      : "_Investigația root cause va fi finalizată în maxim 30 zile de la notificarea inițială; orice constatare semnificativă va fi transmisă autorității ca update conform Art. 73(7)._",
    "",
    "## 8. Date de contact responsabil",
    "",
    `- Responsabil incident: ${incident.assignedToEmail ?? "_de completat_"}`,
    `- Organizația: ${orgName || "_de completat_"}`,
    "",
    "## 9. Anexe + dovezi disponibile la cerere",
    "",
    "- Loguri sistem AI (Art. 12 — Sprint 018)",
    "- Plan PMM activ (Art. 72 — Sprint 019)",
    "- FRIA actualizată (dacă cazul, Art. 27 — Sprint 016)",
    "- Protocol Human Oversight (Art. 14 — Sprint 017)",
    "- Audit Pack complet (toate dovezile semnate criptografic)",
    "",
    "---",
    "",
    "> Document operațional generat de CompliRoAI conform Art. 73(5) EU AI Act. Reprezintă măsurile de bună-credință ale organizației. Necesită validare DPO + responsabil AI înainte de transmiterea oficială către autoritatea competentă.",
  ]

  return lines.filter((line): line is string => typeof line === "string").join("\n")
}

function generateRootCauseSection(
  rootCause: NonNullable<AIIncident["rootCause"]>,
): string {
  const lines: string[] = [
    `**Identificat la:** ${formatDateRO(rootCause.identifiedAtISO)} de ${rootCause.identifiedByEmail}`,
    "",
    "**Descriere cauză rădăcină:**",
    "",
    rootCause.rootCauseDescription || "_de completat_",
    "",
    "**Factori contribuitori:**",
    bullet(rootCause.contributingFactors, "necompletat"),
    "",
    "**Dovezi colectate:**",
    bullet(rootCause.evidenceCollected, "necompletat"),
    "",
    "**Acțiuni corective aplicate:**",
    bullet(rootCause.remediationActions, "necompletat"),
    "",
    "**Acțiuni preventive (prevenire repetare):**",
    bullet(rootCause.preventionActions, "necompletat"),
  ]
  if (rootCause.preventiveMeasuresImplementedAtISO) {
    lines.push("")
    lines.push(
      `**Măsuri implementate efectiv la:** ${formatDateRO(rootCause.preventiveMeasuresImplementedAtISO)}`,
    )
  }
  return lines.join("\n")
}

// ── Authority follow-up update (Art. 73(7)) ─────────────────────────────────

/**
 * Generează un update follow-up pentru autoritate când aceasta cere
 * informații suplimentare (Art. 73(7)) sau când investigația root cause
 * aduce informații materiale noi.
 */
export function generateAuthorityFollowUp(
  incident: AIIncident,
  orgName: string,
  updateDescription: string,
  nowISO: string = new Date().toISOString(),
): string {
  const lastNotification =
    incident.notifications && incident.notifications.length > 0
      ? incident.notifications[incident.notifications.length - 1]
      : undefined
  const ref = lastNotification?.referenceNumber ?? "_număr inițial_"
  const authority = lastNotification?.authorityName ?? "_autoritatea competentă_"

  const lines: string[] = [
    "# Update incident serios AI — informații suplimentare",
    "# EU AI Act Art. 73(7) — actualizare notificare",
    "",
    `**Operator:** ${orgName || "necompletat"}`,
    `**Data actualizării:** ${formatDateRO(nowISO)}`,
    `**Autoritatea destinatară:** ${authority}`,
    `**Referință notificare inițială:** ${ref}`,
    `**ID intern incident:** ${incident.id}`,
    "",
    "---",
    "",
    "## 1. Sumar incident inițial",
    "",
    `**Titlu:** ${incident.title}`,
    `**Categorie Art. 73(2):** ${AI_INCIDENT_CATEGORY_LABELS[incident.category]}`,
    `**Status curent:** ${AI_INCIDENT_STATUS_LABELS[incident.status]}`,
    "",
    "## 2. Informații suplimentare",
    "",
    updateDescription || "_de completat_",
    "",
    "## 3. Stadiul investigării cauzei rădăcină",
    "",
    incident.rootCause
      ? generateRootCauseSection(incident.rootCause)
      : "_Investigația este în curs; estimare finalizare: 30 zile de la notificarea inițială._",
    "",
    "## 4. Măsuri suplimentare aplicate de la notificarea inițială",
    "",
    incident.rootCause?.preventionActions &&
    incident.rootCause.preventionActions.length > 0
      ? bullet(incident.rootCause.preventionActions, "_de completat_")
      : "- _de completat_",
    "",
    "## 5. Date de contact",
    "",
    `- Responsabil incident: ${incident.assignedToEmail ?? "_de completat_"}`,
    `- Organizația: ${orgName || "_de completat_"}`,
    "",
    "---",
    "",
    "> Document operațional generat de CompliRoAI conform Art. 73(7) EU AI Act. Necesită validare DPO + responsabil AI înainte de transmiterea oficială.",
  ]

  return lines.join("\n")
}
