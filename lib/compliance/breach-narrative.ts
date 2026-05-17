/**
 * Sprint 008D — Breach narrative generators
 *
 * Produc markdown copy-paste ready pentru:
 *  1. Notificare catre ANSPDCP (GDPR Art. 33(3)) — formular de baza ce poate fi
 *     trimis prin platforma ANSPDCP / email institutional.
 *  2. Notificare catre persoanele vizate (GDPR Art. 34(2)) — limbaj clar,
 *     non-tehnic, pregatit pentru email/scrisoare/comunicare publica.
 *
 * NU contin asistenta juridica — sunt template-uri operationale care
 * popleaza automat datele record-ului. DPO trebuie sa valideze inainte de
 * trimitere oficiala.
 *
 * Texts sunt in romana (mandat § 20 — Romanian copy required for UI).
 */

import type {
  BreachCause,
  BreachDataCategory,
  BreachRecord,
} from "@/lib/compliance/types"

// ── Labels ───────────────────────────────────────────────────────────────────

const CAUSE_LABELS: Record<BreachCause, string> = {
  cyberattack: "Atac cibernetic (ex. ransomware, phishing, intruziune)",
  insider_malicious: "Acțiune rău-intenționată din interiorul organizației",
  insider_accidental: "Eroare umană (angajat / colaborator)",
  lost_device: "Pierdere / furt dispozitiv (laptop, telefon, suport stocare)",
  misconfiguration: "Configurație incorectă a unui sistem (ex. acces public neintenționat)",
  third_party: "Incident produs la un furnizor / subprocesator",
  physical: "Intruziune fizică / acces neautorizat la documente sau echipamente",
  ai_system: "Sistem AI a expus date personale (ex. prompt leak, output sensibil)",
  other: "Altă cauză",
}

const DATA_CATEGORY_LABELS: Record<BreachDataCategory, string> = {
  identification: "Date de identificare (nume, CNP, serie CI)",
  contact: "Date de contact (email, telefon, adresă)",
  financial: "Date financiare (cont bancar, card, salariu)",
  special_health: "Date privind sănătatea (Art. 9)",
  special_biometric: "Date biometrice (Art. 9)",
  special_genetic: "Date genetice (Art. 9)",
  special_political: "Opinii politice (Art. 9)",
  special_religious: "Convingeri religioase sau filozofice (Art. 9)",
  special_sexual: "Date privind viața / orientarea sexuală (Art. 9)",
  special_criminal: "Date privind condamnări penale / infracțiuni (Art. 10)",
  children: "Date personale ale minorilor",
  employee: "Date angajați (HR)",
  credentials: "Date de autentificare (parole, token-uri, chei)",
  behavioral: "Date comportamentale (tracking, cookie-uri, profilare)",
  other: "Alte categorii de date personale",
}

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

function labelDataCategories(items: BreachDataCategory[]): string[] {
  return items.map((c) => DATA_CATEGORY_LABELS[c] ?? c)
}

function deadlineHoursLabel(breach: BreachRecord, nowISO: string): string {
  const diffMs = new Date(breach.deadlineISO).getTime() - new Date(nowISO).getTime()
  const hours = Math.round(Math.abs(diffMs) / 3_600_000)
  return diffMs >= 0
    ? `${hours}h ramase din 72h`
    : `termenul a fost depasit cu ${hours}h`
}

// ── ANSPDCP notification (Art. 33(3)) ────────────────────────────────────────

export function generateAnspdcpNotification(
  breach: BreachRecord,
  orgName: string,
  nowISO: string = new Date().toISOString(),
): string {
  const submittedAt = breach.anspdcpNotification?.submittedAtISO
  const refNumber = breach.anspdcpNotification?.referenceNumber
  const delayJust = breach.anspdcpNotification?.delayJustification
  const dataLabels = labelDataCategories(breach.dataCategories)

  const lines: (string | null)[] = [
    "# Notificare incident de securitate a datelor cu caracter personal",
    "# GDPR Art. 33 — Notificare către ANSPDCP",
    "",
    `**Operator:** ${orgName || "necompletat"}`,
    `**Data notificării:** ${formatDateRO(submittedAt ?? nowISO)}`,
    refNumber ? `**Număr de înregistrare ANSPDCP:** ${refNumber}` : null,
    "",
    "---",
    "",
    "## 1. Natura încălcării securității datelor",
    "",
    `**Titlu incident:** ${breach.title}`,
    `**Cauză:** ${CAUSE_LABELS[breach.cause] ?? breach.cause}`,
    `**Descriere:**`,
    "",
    breach.description || "_de completat_",
    "",
    `**Sisteme / aplicații afectate:** ${breach.affectedSystems.length ? breach.affectedSystems.join(", ") : "necompletat"}`,
    "",
    "## 2. Cronologie",
    "",
    breach.occurredAtISO
      ? `- Producere estimată: ${formatDateRO(breach.occurredAtISO)}`
      : "- Producere estimată: necunoscută",
    `- Descoperire: ${formatDateRO(breach.discoveredAtISO)}`,
    `- Termen legal de 72h: ${formatDateRO(breach.deadlineISO)} (${deadlineHoursLabel(breach, nowISO)})`,
    submittedAt ? `- Notificare către ANSPDCP: ${formatDateRO(submittedAt)}` : null,
    "",
    delayJust ? "## 2.1 Justificare depășire termen 72h" : null,
    delayJust ? "" : null,
    delayJust ? delayJust : null,
    delayJust ? "" : null,
    "## 3. Categorii și număr aproximativ de persoane vizate",
    "",
    `**Număr aproximativ de persoane afectate:** ${
      typeof breach.affectedSubjectsCount === "number" ? breach.affectedSubjectsCount : "necunoscut"
    }`,
    "",
    "**Categorii de persoane vizate:**",
    bullet(breach.affectedSubjectsCategories, "necompletat"),
    "",
    "## 4. Categorii și număr aproximativ de înregistrări de date",
    "",
    "**Categorii de date personale afectate:**",
    bullet(dataLabels, "necompletat"),
    "",
    "## 5. Consecințe probabile ale încălcării",
    "",
    breach.likelyConsequences || "_de completat_",
    "",
    "## 6. Măsuri luate sau propuse",
    "",
    "**Măsuri imediate de limitare (containment):**",
    bullet(breach.containmentMeasures, "necompletat"),
    "",
    "**Măsuri propuse pentru prevenția repetării:**",
    bullet(breach.preventionMeasures, "de completat"),
    "",
    "## 7. Date de contact responsabil conformitate",
    "",
    `- DPO / responsabil GDPR: ${breach.assignedToEmail ?? "_de completat_"}`,
    "",
    "## 8. Notificare către persoanele vizate (Art. 34)",
    "",
    breach.subjectNotificationRequired
      ? `Da — notificarea persoanelor vizate este necesară conform Art. 34 (risc ridicat pentru drepturi și libertăți).`
      : `Nu — risc redus pentru drepturile și libertățile persoanelor vizate; justificare documentată intern.`,
    breach.subjectNotification?.sentAtISO
      ? `Notificare trimisă la: ${formatDateRO(breach.subjectNotification.sentAtISO)} (metodă: ${breach.subjectNotification.method}).`
      : null,
    "",
    "---",
    "",
    "> Document operațional generat de CompliRoAI. Nu reprezintă opinie juridică finală — necesită validare DPO înainte de transmiterea oficială.",
  ]

  return lines.filter((line): line is string => typeof line === "string").join("\n")
}

// ── Data subject notification (Art. 34(2)) ──────────────────────────────────

export function generateSubjectNotification(
  breach: BreachRecord,
  orgName: string,
  nowISO: string = new Date().toISOString(),
): string {
  const dataLabels = labelDataCategories(breach.dataCategories)
  const contact = breach.assignedToEmail ?? "_de completat: email DPO / responsabil GDPR_"

  const lines: (string | null)[] = [
    "# Comunicare către dumneavoastră privind un incident de securitate a datelor",
    "",
    `**De la:** ${orgName || "_numele organizației_"}`,
    `**Data:** ${formatDateRO(nowISO)}`,
    "",
    "Stimată doamnă / Stimate domn,",
    "",
    "Vă scriem pentru a vă informa, conform Regulamentului General privind Protecția Datelor (GDPR, Art. 34), despre un incident care a afectat date personale ce vă privesc.",
    "",
    "## Ce s-a întâmplat",
    "",
    breach.description || "_descriere clară și non-tehnică a incidentului_",
    "",
    `Incidentul a fost descoperit la data de **${formatDateRO(breach.discoveredAtISO)}**.`,
    "",
    "## Ce date au fost afectate",
    "",
    bullet(dataLabels, "_categoriile de date personale afectate_"),
    "",
    "## Care sunt posibilele consecințe pentru dumneavoastră",
    "",
    breach.likelyConsequences || "_descriere clară a riscurilor concrete pentru persoana vizată_",
    "",
    "## Ce am făcut și ce facem",
    "",
    "**Măsuri imediate luate:**",
    bullet(breach.containmentMeasures, "_măsuri imediate luate pentru limitarea impactului_"),
    "",
    "**Măsuri pentru a preveni repetarea:**",
    bullet(breach.preventionMeasures, "_măsuri pentru a evita o repetare a incidentului_"),
    "",
    "## Ce puteți face dumneavoastră",
    "",
    "- Schimbați parolele asociate conturilor afectate, dacă există.",
    "- Verificați activitatea conturilor / serviciilor unde am procesat aceste date.",
    "- Fiți atent(ă) la mesaje suspecte (phishing) ce pot folosi datele expuse.",
    "- Ne puteți contacta pentru orice întrebare sau pentru a exercita drepturile dumneavoastră GDPR (acces, ștergere, rectificare etc.).",
    "",
    "## Cum ne puteți contacta",
    "",
    `- Responsabil cu protecția datelor (DPO): ${contact}`,
    `- Organizația: ${orgName || "_numele organizației_"}`,
    "",
    "Am notificat, de asemenea, Autoritatea Națională de Supraveghere a Prelucrării Datelor cu Caracter Personal (ANSPDCP) conform Art. 33 GDPR.",
    "",
    "Vă mulțumim pentru înțelegere și ne cerem scuze pentru orice neplăcere produsă.",
    "",
    `Cu respect,`,
    `${orgName || "_numele organizației_"}`,
    "",
    "---",
    "",
    "> Template operațional generat de CompliRoAI conform Art. 34(2) GDPR. Personalizați conținutul înainte de trimitere și păstrați copia notificării ca dovadă în Audit Pack.",
  ]

  return lines.filter((line): line is string => typeof line === "string").join("\n")
}
