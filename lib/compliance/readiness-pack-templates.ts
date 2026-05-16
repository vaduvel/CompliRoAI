// AI Act Readiness Pack — Markdown templates
//
// Toate template-urile produc Markdown valid în limba română, gata să fie
// livrate clientului ca document de conformitate (cabinet → client).
//
// Convenții:
//   - Heading nivel 1 (#) e rezervat documentului per fișier.
//   - Toate datele sunt formatate ro-RO (e.g. "16 mai 2026").
//   - Textul juridic e citat fidel din Regulamentul (UE) 2024/1689
//     (post-Omnibus, mai 2026) — vezi docs/legal/eu-ai-act-full-text-romanian-2026-05.md.

import { classifyAISystem, RISK_LEVEL_LABELS } from "@/lib/compliance/ai-act-classifier"
import {
  getImmediateNextSteps,
  ROLE_LABELS,
  ROLE_LABELS_SHORT,
} from "@/lib/compliance/role-classifier"
import type {
  AISystemRecord,
  LiteracyRecord,
  RoleAssessment,
} from "@/lib/compliance/types"

// ────────────────────────────────────────────────────────────────────────────
//   Tipuri partajate
// ────────────────────────────────────────────────────────────────────────────

export type ReadinessBranding = {
  brandName: string
  signerName: string | null
  signerTitle: string | null
  contactEmail: string | null
  website: string | null
  isCustom: boolean
}

export type ReadinessSummary = {
  orgName: string
  orgCui?: string | null
  generatedAtISO: string
  overallCompliancePct: number
  systemsCount: number
  prohibitedCount: number
  highRiskCount: number
  limitedRiskCount: number
  minimalRiskCount: number
  literacyRecordsCount: number
  /** Top 3 acțiuni urgente (titluri). */
  topActions: string[]
  /** Deadline-uri ordonate cronologic. */
  deadlines: { label: string; dateISO: string; status: "trecut" | "iminent" | "viitor" }[]
}

// ────────────────────────────────────────────────────────────────────────────
//   Helpers
// ────────────────────────────────────────────────────────────────────────────

function formatDateRO(iso: string | null | undefined): string {
  if (!iso) return "—"
  try {
    return new Date(iso).toLocaleDateString("ro-RO", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  } catch {
    return iso
  }
}

function formatDateShort(iso: string | null | undefined): string {
  if (!iso) return "—"
  try {
    return new Date(iso).toLocaleDateString("ro-RO")
  } catch {
    return iso
  }
}

function brandingFooter(branding: ReadinessBranding): string {
  const lines = [`*Document generat de ${branding.brandName}*`]
  if (branding.signerName) {
    const title = branding.signerTitle ? ` — ${branding.signerTitle}` : ""
    lines.push(`*Semnatar:* ${branding.signerName}${title}`)
  }
  if (branding.contactEmail) lines.push(`*Contact:* ${branding.contactEmail}`)
  if (branding.website) lines.push(`*Web:* ${branding.website}`)
  return lines.join("  \n")
}

function packHeader(title: string, branding: ReadinessBranding, summary: ReadinessSummary): string {
  return [
    `# ${title}`,
    ``,
    `**Organizație:** ${summary.orgName}${summary.orgCui ? ` (CUI ${summary.orgCui})` : ""}  `,
    `**Data generării:** ${formatDateRO(summary.generatedAtISO)}  `,
    `**Emitent:** ${branding.brandName}${branding.signerName ? ` (semnat de ${branding.signerName})` : ""}`,
    ``,
    `---`,
    ``,
  ].join("\n")
}

function legalDisclaimer(branding: ReadinessBranding): string {
  return [
    `---`,
    ``,
    `### Notă juridică`,
    ``,
    `Acest document a fost generat automat de către **${branding.brandName}** pe baza datelor`,
    `puse la dispoziție de organizație și a Regulamentului (UE) 2024/1689 (EU AI Act,`,
    `versiunea consolidată post-Omnibus din mai 2026). Documentul reprezintă o evaluare`,
    `de tip *snapshot* la data generării și **nu înlocuiește avizul juridic individualizat**.`,
    `Pentru deciziile finale de conformitate, consultați juristul/consultantul vostru.`,
    ``,
    brandingFooter(branding),
    ``,
  ].join("\n")
}

// ────────────────────────────────────────────────────────────────────────────
//   1. Executive Summary
// ────────────────────────────────────────────────────────────────────────────

export function executiveSummaryTemplate(input: {
  branding: ReadinessBranding
  summary: ReadinessSummary
}): string {
  const { branding, summary } = input
  const deadlines = summary.deadlines
    .slice(0, 5)
    .map((d) => {
      const badge = d.status === "trecut" ? "ACTIV" : d.status === "iminent" ? "URGENT" : "VIITOR"
      return `- **[${badge}] ${formatDateRO(d.dateISO)}** — ${d.label}`
    })
    .join("\n") || "_Niciun deadline AI Act relevant pentru sistemele înregistrate._"

  const topActions = summary.topActions.length
    ? summary.topActions.map((a, i) => `${i + 1}. ${a}`).join("\n")
    : "_Niciun gap critic identificat. Mențineți cadența de monitorizare._"

  const breakdown = [
    `| Categorie risc | Număr sisteme |`,
    `|----|----:|`,
    `| Interzise (Art. 5) | ${summary.prohibitedCount} |`,
    `| High-risk (Annex III) | ${summary.highRiskCount} |`,
    `| Limited risk (Art. 50) | ${summary.limitedRiskCount} |`,
    `| Minimal risk | ${summary.minimalRiskCount} |`,
  ].join("\n")

  return [
    packHeader("Rezumat executiv — Conformitate AI Act", branding, summary),
    `## Statut global`,
    ``,
    `**Scor conformitate AI Act:** \`${summary.overallCompliancePct}%\``,
    ``,
    `**Total sisteme AI înregistrate:** ${summary.systemsCount}  `,
    `**Sesiuni AI Literacy (Art. 4) consemnate:** ${summary.literacyRecordsCount}`,
    ``,
    breakdown,
    ``,
    summary.prohibitedCount > 0
      ? `> **ALERTĂ:** ${summary.prohibitedCount} sistem(e) intră potențial sub Art. 5 (practici interzise). Vezi secțiunea dedicată din audit-ul prohibited.`
      : `> Nu există sisteme clasificate ca *prohibited* în registrul curent.`,
    ``,
    `## Top 3 acțiuni urgente`,
    ``,
    topActions,
    ``,
    `## Deadline-uri AI Act relevante`,
    ``,
    deadlines,
    ``,
    `> Datele cheie de aplicabilitate: Art. 4 (AI Literacy) — activ din 2 februarie 2025;`,
    `> Art. 50 (transparență conținut sintetic / watermark) — 2 decembrie 2026;`,
    `> Art. 6 + Annex III (HRAIS stand-alone) — 2 decembrie 2027.`,
    ``,
    legalDisclaimer(branding),
  ].join("\n")
}

// ────────────────────────────────────────────────────────────────────────────
//   2. AI Systems Inventory Report
// ────────────────────────────────────────────────────────────────────────────

export function inventoryReportTemplate(input: {
  branding: ReadinessBranding
  summary: ReadinessSummary
  systems: AISystemRecord[]
}): string {
  const { branding, summary, systems } = input

  const tableHeader = [
    `| # | Sistem | Scop | Furnizor | Risc | Status aprobare |`,
    `|---:|------|------|----------|------|-----------------|`,
  ].join("\n")

  const tableRows = systems
    .map((sys, idx) => {
      const cls = classifyAISystem(sys.purpose)
      const approval =
        sys.approvalStatus === "approved"
          ? "Aprobat"
          : sys.approvalStatus === "rejected"
            ? "Respins"
            : "În așteptare"
      return `| ${idx + 1} | ${sys.name} | ${sys.purpose} | ${sys.vendor || "—"} | ${RISK_LEVEL_LABELS[cls.riskLevel]} | ${approval} |`
    })
    .join("\n")

  const details = systems
    .map((sys, idx) => {
      const cls = classifyAISystem(sys.purpose)
      const actions = cls.requiredActions.length
        ? cls.requiredActions.map((a) => `  - ${a}`).join("\n")
        : "  - _Nicio acțiune obligatorie suplimentară._"
      const flags: string[] = []
      if (sys.usesPersonalData) flags.push("folosește date cu caracter personal")
      if (sys.makesAutomatedDecisions) flags.push("ia decizii automate")
      if (sys.impactsRights) flags.push("impactează drepturi fundamentale")
      if (sys.hasHumanReview) flags.push("are review uman")
      const flagsLine = flags.length ? flags.join(", ") : "—"

      return [
        `### ${idx + 1}. ${sys.name}`,
        ``,
        `- **Furnizor:** ${sys.vendor || "—"}`,
        `- **Tip model:** ${sys.modelType || "—"}`,
        `- **Scop declarat:** ${sys.purpose}`,
        `- **Clasificare AI Act:** ${RISK_LEVEL_LABELS[cls.riskLevel]} — ${cls.article}`,
        `- **Motiv clasificare:** ${cls.reason}`,
        cls.deadline ? `- **Deadline aplicabilitate:** ${formatDateRO(cls.deadline)}` : null,
        `- **Caracteristici:** ${flagsLine}`,
        `- **Înregistrat:** ${formatDateRO(sys.createdAtISO)}`,
        ``,
        `**Obligații aplicabile:**`,
        actions,
        ``,
        sys.recommendedActions.length
          ? `**Recomandări suplimentare:**\n${sys.recommendedActions.map((r) => `  - ${r}`).join("\n")}`
          : null,
        ``,
        `---`,
        ``,
      ]
        .filter(Boolean)
        .join("\n")
    })
    .join("\n")

  return [
    packHeader("Registru sisteme AI — Raport detaliat", branding, summary),
    `## Vedere de ansamblu`,
    ``,
    systems.length
      ? `Au fost identificate **${systems.length}** sistem(e) AI în uz la organizația ${summary.orgName}.`
      : `**Nu a fost înregistrat niciun sistem AI** în registrul organizației.`,
    ``,
    systems.length ? tableHeader : "",
    systems.length ? tableRows : "",
    ``,
    systems.length ? `## Detalii per sistem` : "",
    ``,
    details,
    legalDisclaimer(branding),
  ].join("\n")
}

// ────────────────────────────────────────────────────────────────────────────
//   3. Art. 4 — AI Literacy Evidence Pack
// ────────────────────────────────────────────────────────────────────────────

export function literacyEvidenceTemplate(input: {
  branding: ReadinessBranding
  summary: ReadinessSummary
  records: LiteracyRecord[]
}): string {
  const { branding, summary, records } = input

  const completedAttestations = records.filter((r) => r.attestationSigned).length
  const totalHours = records.reduce((acc, r) => acc + (r.durationHours || 0), 0)

  const tableHeader = [
    `| Angajat | Rol | Dată | Tip | Durată | Atestare semnată |`,
    `|---------|-----|-----:|-----|------:|:----------------:|`,
  ].join("\n")

  const tableRows = records
    .map((r) => {
      const att = r.attestationSigned ? "DA" : "NU"
      return `| ${r.employeeName} | ${r.role} | ${formatDateShort(r.trainingDate)} | ${r.trainingType} | ${r.durationHours}h | ${att} |`
    })
    .join("\n")

  const details = records
    .map((r) => {
      const topics = r.topicsCovered.length ? r.topicsCovered.map((t) => `  - ${t}`).join("\n") : "  - _nedocumentat_"
      return [
        `### ${r.employeeName} — ${formatDateShort(r.trainingDate)}`,
        ``,
        `- **Rol:** ${r.role}`,
        `- **Tip training:** ${r.trainingType}`,
        `- **Durată:** ${r.durationHours} ore`,
        `- **Trainer:** ${r.trainerName || "—"}`,
        `- **Atestare semnată:** ${r.attestationSigned ? "DA" : "NU"}`,
        ``,
        `**Teme acoperite:**`,
        topics,
        r.notes ? `\n**Note:** ${r.notes}` : null,
        ``,
        `---`,
        ``,
      ]
        .filter(Boolean)
        .join("\n")
    })
    .join("\n")

  const certificateTemplate = [
    `### Model atestat training AI Literacy (Art. 4)`,
    ``,
    `> **CERTIFICAT AI LITERACY**`,
    `>`,
    `> Subsemnatul/a __________________________________, în calitate de __________________________`,
    `> al organizației **${summary.orgName}**, certific prin prezenta că am participat la sesiunea`,
    `> de training AI Literacy desfășurată în data de __________, cu o durată de _____ ore,`,
    `> condusă de __________________________.`,
    `>`,
    `> Temele acoperite: __________________________________________________________________`,
    `>`,
    `> Declar că am înțeles obligațiile organizației conform Art. 4 din Regulamentul (UE) 2024/1689`,
    `> (EU AI Act) și că voi aplica principiile de utilizare responsabilă a sistemelor AI.`,
    `>`,
    `> Semnătură: ______________________  Data: ____________`,
    ``,
  ].join("\n")

  return [
    packHeader("Art. 4 — Evidență AI Literacy", branding, summary),
    `## Text legal de referință`,
    ``,
    `> Furnizorii și deployer-ii sistemelor AI trebuie să ia măsuri pentru a asigura,`,
    `> în cea mai mare măsură posibilă, un nivel suficient de **AI literacy** al personalului lor`,
    `> și al persoanelor care operează sistemele AI în numele lor. — *Art. 4, Regulamentul (UE) 2024/1689*`,
    ``,
    `**Aplicabilitate:** 2 februarie 2025 (în vigoare).`,
    `**Sancțiune indirectă (Art. 99(4)):** până la €15M sau 3% din cifra de afaceri globală.`,
    ``,
    `## Statut organizație`,
    ``,
    `- **Sesiuni înregistrate:** ${records.length}`,
    `- **Total ore training:** ${totalHours}`,
    `- **Atestări semnate:** ${completedAttestations} / ${records.length}`,
    ``,
    records.length === 0
      ? `> **GAP DETECTAT:** Nu există nicio sesiune AI Literacy înregistrată. Art. 4 este executoriu din 2 februarie 2025 — recomandăm inițierea unui program intern în maximum 30 de zile.`
      : completedAttestations < records.length
        ? `> **GAP PARȚIAL:** ${records.length - completedAttestations} atestare(i) nesemnată(e). Finalizați semnăturile pentru dovadă completă.`
        : `> **STATUS OK:** Toate sesiunile au atestări semnate.`,
    ``,
    records.length ? `## Registru complet sesiuni` : "",
    records.length ? `\n${tableHeader}\n${tableRows}\n` : "",
    records.length ? `## Detalii per sesiune\n\n${details}` : "",
    ``,
    certificateTemplate,
    legalDisclaimer(branding),
  ].join("\n")
}

// ────────────────────────────────────────────────────────────────────────────
//   4. Art. 50 — Transparency Notices
// ────────────────────────────────────────────────────────────────────────────

export function transparencyNoticesTemplate(input: {
  branding: ReadinessBranding
  summary: ReadinessSummary
  systems: AISystemRecord[]
}): string {
  const { branding, summary, systems } = input

  // Sistemele relevante pentru Art. 50: limited risk + chatbot/marketing/document
  const relevant = systems.filter((sys) => {
    const cls = classifyAISystem(sys.purpose)
    if (cls.riskLevel === "limited_risk") return true
    if (sys.purpose === "support-chatbot") return true
    if (sys.purpose === "marketing-personalization") return true
    return false
  })

  const blocks = relevant.length
    ? relevant
        .map((sys) => {
          const purposeBlocks: string[] = []
          if (sys.purpose === "support-chatbot") {
            purposeBlocks.push(
              [
                `**Notificare chatbot — afișare la deschiderea conversației:**`,
                ``,
                `> Acest serviciu este oferit de un sistem AI ("${sys.name}"${sys.vendor ? ` — ${sys.vendor}` : ""}).`,
                `> Răspunsurile pot fi generate automat. Pentru asistență umană, scrieți "operator" sau`,
                `> contactați-ne la ${branding.contactEmail ?? "[email contact]"}.`,
              ].join("\n")
            )
          }
          if (sys.purpose === "marketing-personalization") {
            purposeBlocks.push(
              [
                `**Disclosure marketing personalizat — vizibil în footer / pagina /trust:**`,
                ``,
                `> Anumite mesaje pe care le primiți sunt personalizate folosind sisteme AI ("${sys.name}").`,
                `> Logica deciziilor automate este descrisă în Politica de confidențialitate. Puteți cere`,
                `> opt-out scriind la ${branding.contactEmail ?? "[email contact]"}.`,
              ].join("\n")
            )
          }
          if (sys.purpose !== "support-chatbot" && sys.purpose !== "marketing-personalization") {
            purposeBlocks.push(
              [
                `**Notificare generală Art. 50 — afișare la primul contact:**`,
                ``,
                `> Acest serviciu utilizează un sistem AI ("${sys.name}") pentru ${sys.purpose}.`,
                `> Sunteți informat conform Art. 50 din Regulamentul (UE) 2024/1689. Pentru detalii,`,
                `> contactați ${branding.contactEmail ?? "[email contact]"}.`,
              ].join("\n")
            )
          }
          // Watermarking (deadline 2 dec 2026)
          purposeBlocks.push(
            [
              `**Etichetă conținut generat AI (Art. 50(2)) — pentru watermarking:**`,
              ``,
              `> [Conținut generat sau modificat artificial de ${sys.name}]`,
              ``,
              `*Aplicabil obligatoriu de la 2 decembrie 2026 (extensie Omnibus). Recomandăm implementare în avans.*`,
            ].join("\n")
          )
          return [`### ${sys.name}`, ``, ...purposeBlocks, ``, `---`, ``].join("\n")
        })
        .join("\n")
    : `_Niciun sistem din inventar nu intră sub Art. 50 (transparență). Acest document rămâne ca model pentru integrări viitoare._`

  return [
    packHeader("Art. 50 — Notificări de transparență", branding, summary),
    `## Cadru legal`,
    ``,
    `> Furnizorii și utilizatorii sistemelor AI care interacționează direct cu persoane fizice`,
    `> trebuie să se asigure că aceste persoane sunt informate că interacționează cu un sistem AI,`,
    `> cu excepția cazurilor în care acest fapt este evident pentru un utilizator informat rezonabil.`,
    `> — *Art. 50, Regulamentul (UE) 2024/1689*`,
    ``,
    `**Aplicabilitate generală:** 2 august 2026.  `,
    `**Aplicabilitate etichetare conținut sintetic (watermark):** 2 decembrie 2026 (post-Omnibus).`,
    ``,
    `## Notificări recomandate per sistem`,
    ``,
    blocks,
    legalDisclaimer(branding),
  ].join("\n")
}

// ────────────────────────────────────────────────────────────────────────────
//   5. GDPR ↔ AI Act Cross-Compliance Memo
// ────────────────────────────────────────────────────────────────────────────

export function gdprCrossComplianceTemplate(input: {
  branding: ReadinessBranding
  summary: ReadinessSummary
  systems: AISystemRecord[]
}): string {
  const { branding, summary, systems } = input

  const personalDataSystems = systems.filter((s) => s.usesPersonalData)

  const rows = personalDataSystems
    .map((sys) => {
      const cls = classifyAISystem(sys.purpose)
      const dpia = sys.impactsRights || sys.makesAutomatedDecisions || cls.riskLevel === "high_risk"
      const fria = cls.riskLevel === "high_risk"
      const art22 = sys.makesAutomatedDecisions && !sys.hasHumanReview
      return [
        `### ${sys.name}`,
        ``,
        `- **DPIA (GDPR Art. 35):** ${dpia ? "**OBLIGATORIU**" : "Opțional / recomandat"}`,
        `- **FRIA (AI Act Art. 27):** ${fria ? "**OBLIGATORIU** (clasificat high-risk)" : "Neaplicabil"}`,
        `- **GDPR Art. 22 (decizii automate):** ${art22 ? "**EXPUNERE — necesită review uman documentat**" : "OK (review uman activ sau decizii non-automate)"}`,
        `- **Recomandare integrare:** ${
          dpia && fria
            ? "DPIA existent trebuie extins cu secțiunea FRIA (Art. 27(4)). Nu duplica — adăugați secțiunile lipsă."
            : dpia
              ? "DPIA standard suficient pentru moment; revizuire FRIA la trecere în high-risk."
              : "Documentare minimă, dar mențineți registrul de prelucrări actualizat."
        }`,
        ``,
      ].join("\n")
    })
    .join("\n")

  return [
    packHeader("Memo cross-compliance GDPR ↔ AI Act", branding, summary),
    `## Context`,
    ``,
    `Pentru sistemele AI care prelucrează date cu caracter personal apar simultan obligații`,
    `din GDPR (Regulamentul (UE) 2016/679) și AI Act (Regulamentul (UE) 2024/1689).`,
    `Recomandarea oficială (Art. 27(4) AI Act) este **integrarea FRIA în DPIA existent**,`,
    `nu duplicarea documentelor.`,
    ``,
    `## Sisteme cu impact GDPR`,
    ``,
    personalDataSystems.length
      ? rows
      : `_Niciun sistem AI înregistrat nu prelucrează date personale. Cross-compliance neaplicabilă._`,
    ``,
    `## Reguli practice de aplicare`,
    ``,
    `1. **DPIA + FRIA fuzionat:** un singur document pentru fiecare sistem high-risk care prelucrează date personale.`,
    `2. **Art. 22 GDPR:** orice decizie cu efect juridic semnificativ trebuie să poată fi contestată în fața unui om.`,
    `3. **Informare combinată:** mențiunile GDPR Art. 13/14 trebuie să includă și disclosure-ul AI Act Art. 50.`,
    `4. **DPO + AI Compliance Officer:** rolurile pot fi cumulate, dar responsabilitățile trebuie separate scriptic.`,
    ``,
    legalDisclaimer(branding),
  ].join("\n")
}

// ────────────────────────────────────────────────────────────────────────────
//   6. High-Risk Action Plan
// ────────────────────────────────────────────────────────────────────────────

export function highRiskPlanTemplate(input: {
  branding: ReadinessBranding
  summary: ReadinessSummary
  systems: AISystemRecord[]
}): string {
  const { branding, summary, systems } = input
  const highRisk = systems.filter((s) => classifyAISystem(s.purpose).riskLevel === "high_risk")

  if (highRisk.length === 0) {
    return [
      packHeader("Plan de acțiune sisteme high-risk (HRAIS)", branding, summary),
      `## Statut`,
      ``,
      `_Nu există sisteme AI clasificate ca **high-risk (Annex III)** în registrul actual._`,
      ``,
      `Acest document rămâne valabil ca cadru de aplicare în cazul în care un sistem nou`,
      `va fi adăugat în categoria high-risk. Roadmap-ul de mai jos este orientativ și poate`,
      `fi declanșat în orice moment.`,
      ``,
      `## Roadmap aplicabil în cazul intrării în high-risk`,
      ``,
      genericRoadmap(),
      legalDisclaimer(branding),
    ].join("\n")
  }

  const perSystem = highRisk
    .map((sys, idx) => {
      const cls = classifyAISystem(sys.purpose)
      return [
        `### ${idx + 1}. ${sys.name}`,
        ``,
        `- **Articol AI Act:** ${cls.article}`,
        `- **Deadline aplicabilitate HRAIS:** ${cls.deadline ? formatDateRO(cls.deadline) : "2 decembrie 2027"}`,
        ``,
        `**Annex IV — documentație tehnică:** _${sys.approvalStatus === "approved" ? "draft aprobat" : "lipsă / în lucru"}_`,
        ``,
        `**Conformity assessment plan (Art. 43):**`,
        `1. Identificare procedură aplicabilă (intern / notified body).`,
        `2. Asamblare dovezi (Annex IV + test logs + risk management).`,
        `3. Declarație de conformitate UE + marcaj CE.`,
        ``,
        `**Înregistrare EU Database (Art. 49):** pregătire JSON cu metadata sistemului + serializare în registrul intern.`,
        ``,
        `**Human oversight (Art. 14):** ${sys.hasHumanReview ? "implementat — necesită documentare procedurală" : "**NEIMPLEMENTAT — risc critic**"}`,
        ``,
        `---`,
        ``,
      ].join("\n")
    })
    .join("\n")

  return [
    packHeader("Plan de acțiune sisteme high-risk (HRAIS)", branding, summary),
    `## Sisteme afectate`,
    ``,
    `Au fost identificate **${highRisk.length}** sistem(e) high-risk în registrul organizației.`,
    `Deadline-ul general de conformitate pentru HRAIS stand-alone (Annex III) este`,
    `**2 decembrie 2027** (Omnibus mai 2026).`,
    ``,
    perSystem,
    `## Roadmap recomandat`,
    ``,
    genericRoadmap(),
    legalDisclaimer(branding),
  ].join("\n")
}

function genericRoadmap(): string {
  return [
    `| Fază | Acțiune | Termen orientativ |`,
    `|----|---------|-------------------|`,
    `| 1 | Annex IV draft v1 | T+30 zile |`,
    `| 2 | Risk management file + test logs | T+60 zile |`,
    `| 3 | Conformity assessment (intern sau notified body) | T+120 zile |`,
    `| 4 | Declarație de conformitate UE + marcaj CE | T+150 zile |`,
    `| 5 | Înregistrare EU AI Database | T+165 zile |`,
    `| 6 | Audit pack semnat criptografic | T+180 zile |`,
    ``,
  ].join("\n")
}

// ────────────────────────────────────────────────────────────────────────────
//   7. Prohibited Practices Audit (Art. 5)
// ────────────────────────────────────────────────────────────────────────────

export function prohibitedAuditTemplate(input: {
  branding: ReadinessBranding
  summary: ReadinessSummary
  systems: AISystemRecord[]
}): string {
  const { branding, summary, systems } = input
  const prohibited = systems.filter((s) => classifyAISystem(s.purpose).riskLevel === "prohibited")

  const categories = [
    `1. **Manipulare subliminală** care provoacă vătămare semnificativă (Art. 5(1)(a))`,
    `2. **Exploatarea vulnerabilităților** (vârstă, dizabilitate, situație socio-economică) (Art. 5(1)(b))`,
    `3. **Social scoring** generalizat de către autorități (Art. 5(1)(c))`,
    `4. **Predictive policing** bazat exclusiv pe profiling (Art. 5(1)(d))`,
    `5. **Identificare biometrică în spații publice** (cu excepții stricte) (Art. 5(1)(e))`,
    `6. **Recunoaștere emoții la locul de muncă / școală** (Art. 5(1)(f))`,
    `7. **Categorizare biometrică** sensibilă (rasă, religie, opinii politice…) (Art. 5(1)(g))`,
    `8. **Scraping nediscriminativ de imagini faciale** din internet sau CCTV (Art. 5(1)(h))`,
    `9. **Generare conținut intim neconsimțit** (nudifier / CSAM) — *adăugat Omnibus mai 2026, aplicabil 2 decembrie 2026*`,
  ].join("\n")

  const checklist = systems
    .map((sys) => {
      const cls = classifyAISystem(sys.purpose)
      const flag = cls.riskLevel === "prohibited"
      return `| ${sys.name} | ${sys.purpose} | ${flag ? "**INTERZIS — opriți utilizarea**" : "OK"} | ${cls.article} |`
    })
    .join("\n")

  const remedy = prohibited
    .map((sys) => {
      return [
        `### ${sys.name}`,
        ``,
        `- **Acțiune imediată:** oprire operațională în maximum 24h.`,
        `- **Evaluare excepție Art. 5(2)** (dacă există) — documentat în scris cu temei legal.`,
        `- **Notificare ANCOM:** dacă sistemul a fost utilizat operațional, raportare obligatorie.`,
        `- **Remediere și raport intern:** memorandum de incident + plan de înlocuire.`,
        ``,
      ].join("\n")
    })
    .join("\n")

  return [
    packHeader("Audit Art. 5 — Practici interzise", branding, summary),
    `## Cele 9 categorii interzise`,
    ``,
    categories,
    ``,
    `**Aplicabilitate generală:** 2 februarie 2025 (în vigoare).  `,
    `**Aplicabilitate categorie 9 (nudifier / CSAM):** 2 decembrie 2026.`,
    `**Sancțiune (Art. 99(3)):** până la €35M sau 7% din cifra de afaceri globală.`,
    ``,
    `## Verificare sistem cu sistem`,
    ``,
    systems.length
      ? `| Sistem | Scop | Status | Articol |\n|--------|------|--------|---------|\n${checklist}`
      : `_Niciun sistem AI înregistrat — audit-ul Art. 5 nu identifică expuneri._`,
    ``,
    prohibited.length
      ? `## Alertă — sisteme interzise detectate\n\nAu fost identificate **${prohibited.length}** sistem(e) cu clasificare *prohibited*.\nAceste sisteme trebuie oprite imediat sau adaptate.\n\n${remedy}`
      : `## Status\n\n_Nu există sisteme clasificate ca *prohibited* în registrul curent._`,
    ``,
    legalDisclaimer(branding),
  ].join("\n")
}

// ────────────────────────────────────────────────────────────────────────────
//   8. HTML Audit Pack (client-facing, printable to PDF)
// ────────────────────────────────────────────────────────────────────────────

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

export function clientFacingHtmlTemplate(input: {
  branding: ReadinessBranding
  summary: ReadinessSummary
  systems: AISystemRecord[]
  packId: string
  primaryColor: string
  secondaryColor: string
  logoUrl: string | null
}): string {
  const { branding, summary, systems, packId, primaryColor, secondaryColor, logoUrl } = input
  const date = formatDateRO(summary.generatedAtISO)
  const issuerLine = branding.isCustom
    ? `${escapeHtml(branding.brandName)} — pregătit de ${escapeHtml(branding.signerName ?? "consultant")}`
    : "Generat de CompliRoAI"

  const systemRows = systems
    .map((sys) => {
      const cls = classifyAISystem(sys.purpose)
      return `
        <tr>
          <td>${escapeHtml(sys.name)}</td>
          <td>${escapeHtml(sys.purpose)}</td>
          <td>${escapeHtml(RISK_LEVEL_LABELS[cls.riskLevel])}</td>
          <td>${escapeHtml(cls.article)}</td>
        </tr>
      `
    })
    .join("")

  const verifyUrl = `https://eu-ai-act-beige.vercel.app/verify-pack?packId=${encodeURIComponent(packId)}`

  return `<!doctype html>
<html lang="ro">
<head>
<meta charset="utf-8" />
<title>AI Act Readiness Pack — ${escapeHtml(summary.orgName)}</title>
<style>
  @page { size: A4; margin: 18mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 32px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: #0f172a; background: #fff; line-height: 1.55;
  }
  .cover { page-break-after: always; padding-top: 80px; text-align: center; }
  .cover-logo { max-height: 56px; margin-bottom: 24px; }
  .cover-title { font-size: 32px; font-weight: 700; color: ${primaryColor}; margin-bottom: 8px; }
  .cover-subtitle { font-size: 18px; color: #475569; margin-bottom: 48px; }
  .cover-meta { font-size: 14px; color: #475569; }
  .header {
    border-bottom: 3px solid ${primaryColor};
    padding-bottom: 16px; margin-bottom: 24px;
    display: flex; align-items: center; justify-content: space-between;
  }
  .brand { display: flex; align-items: center; gap: 12px; }
  .brand img { max-height: 40px; }
  .brand-name { font-size: 18px; font-weight: 600; color: ${primaryColor}; }
  .doc-title { font-size: 24px; font-weight: 600; margin: 8px 0 4px; }
  .meta { color: #64748b; font-size: 13px; }
  h2 { font-size: 18px; margin-top: 32px; color: ${primaryColor}; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; }
  th, td { text-align: left; padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
  th { background: #f1f5f9; font-weight: 600; }
  .score-card {
    display: inline-block; padding: 16px 24px; background: #fff;
    border: 1px solid #e2e8f0; border-radius: 8px; margin-right: 12px; margin-bottom: 12px;
  }
  .score-value { font-size: 32px; font-weight: 700; color: ${primaryColor}; }
  .score-label { font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
  .footer {
    margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0;
    font-size: 12px; color: #64748b;
  }
  .badge {
    display: inline-block; padding: 2px 8px; border-radius: 4px;
    background: ${secondaryColor}; color: #fff; font-size: 11px;
  }
  .signature-block {
    margin-top: 48px; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;
    background: #f8fafc;
  }
  .qr-line { margin-top: 16px; font-family: ui-monospace, monospace; font-size: 11px; word-break: break-all; }
</style>
</head>
<body>
  <section class="cover">
    ${logoUrl ? `<img class="cover-logo" src="${escapeHtml(logoUrl)}" alt="${escapeHtml(branding.brandName)}" />` : ""}
    <div class="cover-title">AI Act Readiness Pack</div>
    <div class="cover-subtitle">${escapeHtml(summary.orgName)}${summary.orgCui ? ` · CUI ${escapeHtml(summary.orgCui)}` : ""}</div>
    <div class="cover-meta">
      Pregătit de: <strong>${escapeHtml(branding.brandName)}</strong><br />
      ${branding.signerName ? `Semnatar: ${escapeHtml(branding.signerName)}${branding.signerTitle ? ` — ${escapeHtml(branding.signerTitle)}` : ""}<br />` : ""}
      Data emiterii: <strong>${escapeHtml(date)}</strong><br />
      Pack ID: <code>${escapeHtml(packId)}</code>
    </div>
  </section>

  <div class="header">
    <div class="brand">
      ${logoUrl ? `<img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(branding.brandName)}" />` : ""}
      <span class="brand-name">${escapeHtml(branding.brandName)}</span>
    </div>
    <span class="badge">Readiness Pack</span>
  </div>

  <div class="doc-title">Raport de conformitate AI Act</div>
  <div class="meta">
    Organizație: <strong>${escapeHtml(summary.orgName)}</strong>${
      summary.orgCui ? ` · CUI: ${escapeHtml(summary.orgCui)}` : ""
    }<br />
    Data generării: ${escapeHtml(date)}<br />
    ${issuerLine}
  </div>

  <h2>Rezumat executiv</h2>
  <div>
    <div class="score-card">
      <div class="score-value">${summary.overallCompliancePct}%</div>
      <div class="score-label">Scor conformitate</div>
    </div>
    <div class="score-card">
      <div class="score-value">${summary.systemsCount}</div>
      <div class="score-label">Sisteme AI</div>
    </div>
    <div class="score-card">
      <div class="score-value">${summary.highRiskCount}</div>
      <div class="score-label">High-risk</div>
    </div>
    <div class="score-card">
      <div class="score-value">${summary.prohibitedCount}</div>
      <div class="score-label">Interzise</div>
    </div>
    <div class="score-card">
      <div class="score-value">${summary.literacyRecordsCount}</div>
      <div class="score-label">Sesiuni Art. 4</div>
    </div>
  </div>

  <h2>Registru sisteme AI</h2>
  ${
    systems.length === 0
      ? `<p class="meta">Niciun sistem AI înregistrat la momentul generării.</p>`
      : `<table>
    <thead><tr><th>Sistem</th><th>Scop</th><th>Risc</th><th>Articol AI Act</th></tr></thead>
    <tbody>${systemRows}</tbody>
  </table>`
  }

  <h2>Acțiuni urgente</h2>
  ${
    summary.topActions.length === 0
      ? `<p class="meta">Niciun gap critic identificat la momentul evaluării.</p>`
      : `<ol>${summary.topActions.map((a) => `<li>${escapeHtml(a)}</li>`).join("")}</ol>`
  }

  <div class="signature-block">
    <div style="font-weight: 600; margin-bottom: 8px;">Atestat de cabinet</div>
    <div class="meta">
      Subsemnatul/a ${escapeHtml(branding.signerName ?? "_______________________")}${
        branding.signerTitle ? ` (${escapeHtml(branding.signerTitle)})` : ""
      }, în calitate de reprezentant al
      <strong>${escapeHtml(branding.brandName)}</strong>, atestăm că prezentul Readiness Pack a fost
      generat pe baza datelor furnizate de organizația ${escapeHtml(summary.orgName)} la data de
      ${escapeHtml(date)} și reflectă starea de conformitate la acel moment.
    </div>
    <div class="qr-line">
      Verificare integritate: <a href="${escapeHtml(verifyUrl)}">${escapeHtml(verifyUrl)}</a>
    </div>
  </div>

  <div class="footer">
    ${escapeHtml(branding.brandName)}${
      branding.signerName ? ` · ${escapeHtml(branding.signerName)}${branding.signerTitle ? ` (${escapeHtml(branding.signerTitle)})` : ""}` : ""
    }${branding.contactEmail ? ` · ${escapeHtml(branding.contactEmail)}` : ""}${
      branding.website ? ` · <a href="${escapeHtml(branding.website)}">${escapeHtml(branding.website)}</a>` : ""
    }
    <br />Document generat automat — nu înlocuiește avizul juridic individualizat.
    Pentru tipărirea pe hârtie, folosiți funcția "Print → Salvează ca PDF" din browser.
  </div>
</body>
</html>
`
}

// ────────────────────────────────────────────────────────────────────────────
//   9. AI Act Role Memo (Sprint 5.5) — prerequisite pentru toate obligațiile
// ────────────────────────────────────────────────────────────────────────────

/**
 * Generează memo-ul "Cine sunt eu în AI Act?" — răspuns la întrebarea juridică #1.
 * Plasat ca PRIMA secțiune din Readiness Pack (înaintea Executive Summary).
 */
export function roleAssessmentTemplate(input: {
  branding: ReadinessBranding
  summary: ReadinessSummary
  assessment: RoleAssessment
}): string {
  const { branding, summary, assessment } = input

  const secondaryLabel = assessment.secondaryRoles.length
    ? assessment.secondaryRoles.map((r) => ROLE_LABELS_SHORT[r]).join(", ")
    : "—"

  const articlesList = assessment.applicableArticles.length
    ? assessment.applicableArticles.map((a) => `- ${a}`).join("\n")
    : "_Niciun articol specific — verifică Art. 2 pentru excepții._"

  const exceptionsBlock = assessment.scopeExceptions.length
    ? assessment.scopeExceptions.map((e) => `- ${e}`).join("\n")
    : "- _Nu sunt invocate excepții din Art. 2._"

  // Top 3 acțiuni imediate bazate pe rolul primar.
  const nextStepRole = assessment.primaryRole
  const nextSteps = getImmediateNextSteps(nextStepRole)
    .map((s, i) => `${i + 1}. ${s}`)
    .join("\n")

  return [
    packHeader("AI Act Role Memo — Cine ești în AI Act?", branding, summary),
    `> **Răspuns la întrebarea juridică #1: ce rol am eu în EU AI Act?**`,
    `> Acest document determină ce obligații se aplică organizației conform Regulamentului (UE) 2024/1689.`,
    `> Fără un rol clar definit, restul obligațiilor (Art. 4, Art. 5, Art. 26-27 etc.) sunt în ceață.`,
    ``,
    `**Rol principal:** **${ROLE_LABELS[assessment.primaryRole]}**  `,
    `**Roluri secundare:** ${secondaryLabel}  `,
    `**Evaluat la:** ${formatDateRO(assessment.answeredAtISO)}  `,
    `**Evaluat de:** ${assessment.answeredByEmail || "—"}`,
    ``,
    `---`,
    ``,
    `## Justificare`,
    ``,
    assessment.reasoning,
    ``,
    `---`,
    ``,
    `## Obligații aplicabile`,
    ``,
    articlesList,
    ``,
    `---`,
    ``,
    `## Excepții invocate (Art. 2)`,
    ``,
    exceptionsBlock,
    ``,
    `---`,
    ``,
    `## Pași imediați`,
    ``,
    nextSteps,
    ``,
    `---`,
    ``,
    `## Cross-references juridice`,
    ``,
    `- **Art. 2** — domeniu de aplicare și excepții (uz personal, militar, cercetare, open-source).`,
    `- **Art. 3** — definiții formale: provider, deployer, importer, distributor, manufacturer.`,
    `- **Art. 22 GDPR** ↔ **Art. 14 AI Act** — decizii automatizate vs. supraveghere umană.`,
    `- **Art. 25 AI Act** — reprezentant autorizat pentru providerii non-EU.`,
    ``,
    `---`,
    ``,
    `## Atenționare`,
    ``,
    `Rolul tău poate evolua dacă schimbi modelul de business — de exemplu:`,
    ``,
    `- Începi să vinzi terților un AI dezvoltat intern → devii **și provider**, nu doar deployer.`,
    `- Externalizezi dezvoltarea, dar continui să-l pui pe piață sub propriul nume → rămâi **provider** (Art. 3(3)).`,
    `- Importi un model de la un furnizor non-EU → devii **importer** (Art. 23).`,
    ``,
    `Re-evaluează acest memo **trimestrial** sau la orice schimbare de scope.`,
    ``,
    `---`,
    ``,
    `_Acest memo a fost generat automat de ${branding.brandName} pe baza răspunsurilor furnizate._`,
    `_Pentru validare juridică în cazul auditurilor ANCOM sau B2B enterprise, consultă un avocat specializat AI/Tech._`,
    ``,
    legalDisclaimer(branding),
  ].join("\n")
}

/**
 * Folosit când lipsește Role Assessment — secțiune de avertisment înserată în Readiness Pack.
 */
export function roleAssessmentMissingNotice(input: {
  branding: ReadinessBranding
  summary: ReadinessSummary
}): string {
  const { branding, summary } = input
  return [
    packHeader("AI Act Role Memo — LIPSĂ", branding, summary),
    `> **ATENȚIE: Evaluare de rol incompletă.**`,
    ``,
    `Organizația **${summary.orgName}** nu a completat încă **Role Assessment** —`,
    `prerequisite-ul juridic #1 din EU AI Act.`,
    ``,
    `Fără a ști dacă ești **provider**, **deployer**, **importer**, **distributor** sau **manufacturer**,`,
    `restul Readiness Pack-ului ratează contextul fundamental:`,
    ``,
    `- Nu putem determina dacă Art. 16-22 (provider) sau Art. 26-27 (deployer) se aplică prioritar.`,
    `- Nu putem stabili dacă FRIA (Art. 27) este obligatorie sau opțională.`,
    `- Nu putem ști dacă te încadrezi într-o excepție din Art. 2 (uz personal, militar, cercetare).`,
    ``,
    `## Acțiune necesară`,
    ``,
    `Înainte de a folosi acest pack pentru audit final, completează evaluarea de rol:`,
    ``,
    `**→ Accesează \`/dashboard/role-assessment\` (5 minute, 8 întrebări)**`,
    ``,
    `După completare, regenerează Readiness Pack-ul — secțiunea aceasta va fi înlocuită cu memo-ul`,
    `complet care detaliază rolul tău și obligațiile specifice.`,
    ``,
    legalDisclaimer(branding),
  ].join("\n")
}

