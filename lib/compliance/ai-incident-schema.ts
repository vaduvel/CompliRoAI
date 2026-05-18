// AI Incident Reporting Schema V1 — Sprint 020
// (BUILD NEW per EU AI Act Art. 73 — distinct de GDPR Art. 33 / Sprint 008D).
//
// 5 secțiuni × 3-6 întrebări care operaționalizează obligația provider-ului
// (și deployer-ului, prin Art. 26(5)) de a raporta incidentele serioase
// asupra unui sistem AI high-risk către autoritatea de supraveghere a pieței
// (Art. 73(1)). Schema definește întrebările + helpText + referință legală
// per Q; evaluator-ul calculează deadline-ul + emite findings; narrative-ul
// generează raportul Art. 73(5).
//
// Secțiuni:
//   A) Identificare incident — sistem AI + titlu + descriere + status
//   B) Severitate + categorie Art. 73(2) — alege categoria → setează deadline
//   C) Cronologie — occurredAt + detectedAt (clock start Art. 73(3))
//   D) Evaluare inițială — părți afectate + măsuri provizorii + notificare?
//   E) Dovezi + asignare — linkage Breach (008D) + PMM (019) + responsabil

import type {
  AIIncidentCategory,
  AIIncidentSeverity,
  AIIncidentStatus,
} from "@/lib/compliance/types"

export type AIIncidentQuestionType =
  | "select"
  | "multiselect"
  | "boolean"
  | "text"
  | "textarea"
  | "string_list"
  | "number"
  | "datetime"

export type AIIncidentSchemaSectionId = "A" | "B" | "C" | "D" | "E"

export type AIIncidentQuestion = {
  id: string
  section: AIIncidentSchemaSectionId
  label: string
  helpText: string
  /** Referință EU AI Act care fundamentează întrebarea. */
  legalReference: string
  type: AIIncidentQuestionType
  options?: string[]
  required: boolean
}

export type AIIncidentSchemaSection = {
  id: AIIncidentSchemaSectionId
  title: string
  description: string
  questions: AIIncidentQuestion[]
}

export type AIIncidentSchema = {
  id: string
  version: "2026.05.ro.v1"
  jurisdiction: "RO/EU"
  legalBasis: string[]
  sections: AIIncidentSchemaSection[]
}

// ────────────────────────────────────────────────────────────────────────────
//   Liste de referință (folosite în UI pentru render)
// ────────────────────────────────────────────────────────────────────────────

export const AI_INCIDENT_CATEGORY_OPTIONS: AIIncidentCategory[] = [
  "death_or_serious_harm_health",
  "critical_infrastructure_disruption",
  "fundamental_rights_infringement",
  "widespread_infringement",
  "property_or_environment_harm",
  "other_serious",
]

export const AI_INCIDENT_CATEGORY_LABELS: Record<AIIncidentCategory, string> = {
  death_or_serious_harm_health:
    "Deces sau lezare gravă a sănătății — Art. 73(2)(a)",
  critical_infrastructure_disruption:
    "Perturbare gravă + ireversibilă infrastructură critică — Art. 73(2)(b)",
  fundamental_rights_infringement:
    "Încălcare drepturi fundamentale (dreptul UE) — Art. 73(2)(c)",
  widespread_infringement:
    "Încălcare pe scară largă (widespread infringement) — Art. 73(2)(c) widespread",
  property_or_environment_harm:
    "Prejudiciu grav proprietății sau mediului — Art. 73(2)(d)",
  other_serious: "Alt incident serios (motivat narativ)",
}

export const AI_INCIDENT_CATEGORY_HELP: Record<AIIncidentCategory, string> = {
  death_or_serious_harm_health:
    "Deces direct atribuibil sistemului AI SAU lezare gravă a sănătății unei persoane (ex: diagnostic medical AI eronat care a condus la tratament incorect cu sechele). Termen Art. 73(3): 2 zile de la luarea la cunoștință.",
  critical_infrastructure_disruption:
    "Perturbare gravă + ireversibilă a managementului sau funcționării infrastructurii critice (energie, transport, sănătate publică, apă, telecomunicații, financiar). Termen Art. 73(3): 2 zile.",
  fundamental_rights_infringement:
    "Încălcare a obligațiilor din dreptul Uniunii destinate protecției drepturilor fundamentale (discriminare AI, refuz acces servicii esențiale, profilare ilegală etc.) — pentru un caz NEgeneralizat. Termen Art. 73(3): 15 zile.",
  widespread_infringement:
    "Încălcare drepturi fundamentale pe scară largă (widespread infringement) afectând un număr mare de persoane sau sistemic. Termen Art. 73(3): 10 zile + impact obligatoriu raportat.",
  property_or_environment_harm:
    "Prejudiciu grav adus proprietății (distrugere bunuri) sau mediului (poluare, accident industrial cu AI implicat). Termen Art. 73(3): 15 zile.",
  other_serious:
    "Alt incident considerat serios per evaluare DPO + responsabil AI, dar care nu se încadrează strict în categoriile (a)-(d). Termen Art. 73(3): 15 zile.",
}

export const AI_INCIDENT_SEVERITY_OPTIONS: AIIncidentSeverity[] = [
  "minor",
  "moderate",
  "serious",
  "catastrophic",
]

export const AI_INCIDENT_SEVERITY_LABELS: Record<AIIncidentSeverity, string> = {
  minor: "Minor (impact contained, fără persoane afectate sever)",
  moderate: "Moderat (persoane afectate parțial, fără sechele permanente)",
  serious: "Serios (impact semnificativ, posibile sechele / pierderi)",
  catastrophic:
    "Catastrofic (deces / lezare gravă / impact ireversibil pe scară largă)",
}

export const AI_INCIDENT_STATUS_OPTIONS: AIIncidentStatus[] = [
  "draft",
  "assessing",
  "notification_required",
  "authority_notified",
  "root_cause_investigation",
  "remediated",
  "closed",
  "not_reportable",
]

export const AI_INCIDENT_STATUS_LABELS: Record<AIIncidentStatus, string> = {
  draft: "Schiță (in pregătire)",
  assessing: "Evaluare DPO / responsabil AI",
  notification_required: "Necesită notificare autoritate",
  authority_notified: "Notificare autoritate transmisă",
  root_cause_investigation: "Investigație cauză rădăcină (Art. 73(4))",
  remediated: "Remediat (acțiuni corective aplicate)",
  closed: "Închis cu lecții documentate",
  not_reportable: "NU este raportabil Art. 73 (evaluat negativ)",
}

/**
 * Termenele Art. 73(3) în zile.
 * IMPORTANT: clock-ul pornește la `detectedAtISO` (when becoming aware).
 */
export const AI_INCIDENT_CATEGORY_DEADLINE_DAYS: Record<
  AIIncidentCategory,
  2 | 10 | 15
> = {
  death_or_serious_harm_health: 2,
  critical_infrastructure_disruption: 2,
  widespread_infringement: 10,
  fundamental_rights_infringement: 15,
  property_or_environment_harm: 15,
  other_serious: 15,
}

// ────────────────────────────────────────────────────────────────────────────
//   Schema V1 — 5 secțiuni
// ────────────────────────────────────────────────────────────────────────────

export const AI_INCIDENT_SCHEMA_V1: AIIncidentSchema = {
  id: "compliroai-ai-incident-art-73",
  version: "2026.05.ro.v1",
  jurisdiction: "RO/EU",
  legalBasis: [
    "Regulament (UE) 2024/1689 Art. 73(1) — providers report serious incidents to market surveillance authorities",
    "Regulament (UE) 2024/1689 Art. 73(2) — definește categoriile (a)-(d) de incident serios",
    "Regulament (UE) 2024/1689 Art. 73(3) — termenele 2/10/15 zile după luarea la cunoștință",
    "Regulament (UE) 2024/1689 Art. 73(4) — investigație root cause obligatorie",
    "Regulament (UE) 2024/1689 Art. 73(5) — conținutul raportului (natura, circumstanțe, părți, măsuri)",
    "Regulament (UE) 2024/1689 Art. 26(5) — deployer informează provider despre incident",
    "Regulament (UE) 2024/1689 Art. 3(49) — definiția 'serious incident'",
    "Regulament (UE) 2024/1689 Art. 99 — sancțiuni (până la 35M EUR sau 7% turnover) pentru nerespectarea Art. 73",
  ],
  sections: [
    // ── A) Identificare incident ─────────────────────────────────────────────
    {
      id: "A",
      title: "A. Identificare incident",
      description:
        "Selectează sistemul AI implicat + descrie pe scurt incidentul. Toate câmpurile sunt obligatorii pentru a putea calcula deadline-ul Art. 73(3) și a emite findings.",
      questions: [
        {
          id: "title",
          section: "A",
          label: "Titlul incidentului",
          helpText:
            "Ex: „Diagnostic AI eronat — pacient X spital Y\", „Refuz credit AI scor de risc — grup demografic Z\", „Recunoaștere facială — identificare greșită oprire la frontieră\".",
          legalReference: "EU AI Act Art. 73(1)",
          type: "text",
          required: true,
        },
        {
          id: "linkedAISystemId",
          section: "A",
          label: "Sistemul AI implicat",
          helpText:
            "Selectează sistemul AI din Inventar. Art. 73 se aplică sistemelor AI high-risk introduse pe piață / utilizate în UE.",
          legalReference: "EU AI Act Art. 73(1) + Art. 6",
          type: "select",
          required: true,
        },
        {
          id: "description",
          section: "A",
          label: "Descriere narativă",
          helpText:
            "Cronologie scurtă: ce s-a întâmplat, când, cum a fost detectat, ce sistem AI a fost implicat și prin ce mecanism (decision making, automated output, hallucination etc.). 2-5 paragrafe.",
          legalReference: "EU AI Act Art. 73(5) — natura + circumstanțe",
          type: "textarea",
          required: true,
        },
      ],
    },
    // ── B) Severitate + categorie Art. 73(2) ─────────────────────────────────
    {
      id: "B",
      title: "B. Severitate + categorie Art. 73(2)",
      description:
        "Categoria determină deadline-ul Art. 73(3): 2 zile pentru deces/critical infrastructure, 10 zile pentru widespread, 15 zile pentru orice alt incident serios. Severitatea este orientativă pentru triaj intern.",
      questions: [
        {
          id: "category",
          section: "B",
          label: "Categoria incidentului (Art. 73(2))",
          helpText:
            "Categoria stabilește termenul de raportare. (a) deces / lezare gravă sănătate → 2 zile; (b) critical infrastructure → 2 zile; (c) widespread → 10 zile; (c) fundamental rights non-widespread → 15 zile; (d) proprietate/mediu → 15 zile.",
          legalReference: "EU AI Act Art. 73(2) + Art. 3(49)",
          type: "select",
          options: AI_INCIDENT_CATEGORY_OPTIONS,
          required: true,
        },
        {
          id: "severity",
          section: "B",
          label: "Severitate intern (triaj)",
          helpText:
            "Notare internă pentru priorizare echipă: minor / moderate / serious / catastrophic. NU înlocuiește categoria Art. 73(2) — doar ajută triajul.",
          legalReference: "EU AI Act Art. 73(2) (internă)",
          type: "select",
          options: AI_INCIDENT_SEVERITY_OPTIONS,
          required: true,
        },
      ],
    },
    // ── C) Cronologie ────────────────────────────────────────────────────────
    {
      id: "C",
      title: "C. Cronologie",
      description:
        "occurredAt = când s-a produs efectiv incidentul (poate fi anterior detectării). detectedAt = când organizația a devenit conștientă — clock-ul Art. 73(3) începe AICI. Termenul de raportare este calculat automat = detectedAt + (2/10/15 zile per categorie).",
      questions: [
        {
          id: "occurredAtISO",
          section: "C",
          label: "Data + ora producerii (estimat)",
          helpText:
            "Când s-a produs efectiv incidentul, dacă este diferit de momentul detectării. Lasă gol dacă nu este cunoscut.",
          legalReference: "EU AI Act Art. 73(5) — circumstanțe temporale",
          type: "datetime",
          required: false,
        },
        {
          id: "detectedAtISO",
          section: "C",
          label: "Data + ora detectării (clock start Art. 73(3))",
          helpText:
            "Când organizația a devenit conștientă de incident. ATENȚIE: termenul Art. 73(3) (2/10/15 zile) se calculează DE LA ACEST MOMENT, nu de la producere. Default = acum.",
          legalReference: "EU AI Act Art. 73(3) — 'after becoming aware'",
          type: "datetime",
          required: true,
        },
      ],
    },
    // ── D) Evaluare inițială ─────────────────────────────────────────────────
    {
      id: "D",
      title: "D. Evaluare inițială — părți afectate + raportabilitate",
      description:
        "Identifică categoriile + numărul aproximativ de persoane afectate + concluzia evaluării: este incidentul raportabil Art. 73? Default = TRUE; poate fi marcat FALSE doar după evaluare DPO documentată.",
      questions: [
        {
          id: "affectedSubjectsCategories",
          section: "D",
          label: "Categorii persoane afectate",
          helpText:
            "Listă (1 per linie): „pacienți spital X\", „candidați la angajare\", „beneficiari servicii sociale\", „cetățeni la control vamal\". Empty list e acceptabil pentru (b) infrastructură fără persoane direct afectate.",
          legalReference: "EU AI Act Art. 73(5) — affected parties",
          type: "string_list",
          required: false,
        },
        {
          id: "affectedSubjectsCount",
          section: "D",
          label: "Număr aproximativ de persoane afectate",
          helpText:
            "Best estimate, în cifre. Pentru widespread infringement, numărul + scala este critică pentru raport.",
          legalReference: "EU AI Act Art. 73(5) — affected parties scope",
          type: "number",
          required: false,
        },
        {
          id: "notificationRequired",
          section: "D",
          label: "Notificare autoritate obligatorie?",
          helpText:
            "Default TRUE. Marcați FALSE doar după evaluare DPO documentată care concluzionează că incidentul NU îndeplinește pragul Art. 3(49) 'serious'. Justificarea trebuie salvată în câmpul 'notes'.",
          legalReference: "EU AI Act Art. 73(1) + Art. 3(49)",
          type: "boolean",
          required: true,
        },
      ],
    },
    // ── E) Dovezi + asignare ─────────────────────────────────────────────────
    {
      id: "E",
      title: "E. Dovezi + asignare",
      description:
        "Linkage bidirectional: dacă incidentul atinge și date personale, leagă BreachRecord-ul Art. 33 (Sprint 008D). Dacă a fost escaladat dintr-o anomalie PMM, leagă PmmAnomalyRecord (Sprint 019). Asignează responsabilul care va conduce notificarea + investigația root cause.",
      questions: [
        {
          id: "assignedToEmail",
          section: "E",
          label: "Responsabil incident (email)",
          helpText:
            "Persoana care conduce notificarea autorității + investigația Art. 73(4). De obicei DPO sau responsabil AI. Va primi notificări automate pe deadline.",
          legalReference: "EU AI Act Art. 73(4) — investigation owner",
          type: "text",
          required: false,
        },
        {
          id: "linkedBreachId",
          section: "E",
          label: "Breach GDPR legat (Art. 33, Sprint 008D)",
          helpText:
            "Dacă incidentul atinge date personale, există un BreachRecord paralel ce trebuie notificat la ANSPDCP separat (72h Art. 33). Lasă gol dacă nu este cazul.",
          legalReference: "GDPR Art. 33 + EU AI Act Art. 73 (paralele)",
          type: "text",
          required: false,
        },
        {
          id: "linkedPmmAnomalyId",
          section: "E",
          label: "Anomalie PMM legată (Art. 72, Sprint 019)",
          helpText:
            "Dacă incidentul a fost escaladat dintr-o anomalie PMM critică, ID-ul anomaliei este referențiat aici (set automat de helper-ul escalateAnomalyToIncident). Lasă gol pentru intake direct.",
          legalReference: "EU AI Act Art. 72(4) → Art. 73",
          type: "text",
          required: false,
        },
        {
          id: "notes",
          section: "E",
          label: "Note suplimentare",
          helpText:
            "Orice context relevant pentru auditor: dependențe upstream, vendor model provider, justificarea declarării ca NU raportabil (dacă notificationRequired=false), pași intermediari de remediere.",
          legalReference: "EU AI Act Art. 73(5) — context",
          type: "textarea",
          required: false,
        },
      ],
    },
  ],
}

/**
 * Helper pentru UI: returnează ordinea sectiunilor pentru wizard.
 */
export function getAIIncidentSchemaSectionOrder(): AIIncidentSchemaSectionId[] {
  return AI_INCIDENT_SCHEMA_V1.sections.map((s) => s.id)
}
