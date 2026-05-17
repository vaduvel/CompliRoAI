// Human Oversight Protocol Schema V1 — Sprint 017 (BUILD NEW per EU AI Act Art. 14).
//
// 5 secțiuni × ~18 întrebări care operaționalizează obligația deployer-ului
// unui sistem AI high-risk de a documenta un protocol concret de supraveghere
// umană ÎNAINTE de punerea în funcțiune.
//
// Secțiuni:
//   A) Model oversight + sistem AI legat — Art. 14(2) + Art. 14(5)
//   B) Capacități Art. 14(3) — 5 cerințe obligatorii (a)–(e)
//   C) Persoane responsabile — Art. 26(2) competență + autoritate + suport
//   D) Escaladare + contestație — workflow + SLA
//   E) Stop + fallback — Art. 14(3)(e) + Art. 14(4)(d)
//
// Schema NU emite findings (asta face `oversight-evaluator.ts`). Aici definim
// doar structura întrebărilor + helpText + referință legală per Q.

import type {
  OversightCapability,
  OversightModel,
} from "@/lib/compliance/types"

export type OversightQuestionType =
  | "select"
  | "multiselect"
  | "boolean"
  | "text"
  | "textarea"
  | "number"
  | "responsibles"   // editor pentru responsibleHumans[]
  | "escalation"     // editor pentru escalationSteps[]
  | "contestation"   // editor pentru contestationProcedure
  | "stop"           // editor pentru stopProcedure
  | "checklist"      // editor pentru evidenceChecklist[]

export type OversightSchemaSectionId = "A" | "B" | "C" | "D" | "E"

export type OversightQuestion = {
  id: string
  section: OversightSchemaSectionId
  label: string
  helpText: string
  /** Referință EU AI Act care fundamentează întrebarea. */
  legalReference: string
  type: OversightQuestionType
  options?: string[]
  required: boolean
  /** Pentru multiselect pe cele 5 capacități Art. 14(3). */
  capabilityOptions?: OversightCapability[]
}

export type OversightSchemaSection = {
  id: OversightSchemaSectionId
  title: string
  description: string
  questions: OversightQuestion[]
}

export type OversightSchema = {
  id: string
  version: "2026.05.ro.v1"
  jurisdiction: "RO/EU"
  legalBasis: string[]
  sections: OversightSchemaSection[]
}

// ────────────────────────────────────────────────────────────────────────────
//   Liste de referință (folosite în UI pentru render)
// ────────────────────────────────────────────────────────────────────────────

export const OVERSIGHT_MODEL_OPTIONS: OversightModel[] = [
  "human_in_the_loop",
  "human_on_the_loop",
  "human_in_command",
  "two_person_rule",
  "hybrid",
]

export const OVERSIGHT_MODEL_LABELS: Record<OversightModel, string> = {
  human_in_the_loop: "Human-in-the-loop (HITL) — uman aprobă fiecare decizie",
  human_on_the_loop: "Human-on-the-loop (HOTL) — uman monitorizează, intervine la nevoie",
  human_in_command: "Human-in-command (HIC) — uman setează parametri + override",
  two_person_rule: "Two-person rule (4-eyes) — obligatoriu Art. 14(4) pentru biometric ID",
  hybrid: "Hibrid — combinație (ex: HOTL + HITL pe risc înalt)",
}

export const OVERSIGHT_MODEL_DESCRIPTIONS: Record<OversightModel, string> = {
  human_in_the_loop:
    "Fiecare output al sistemului AI este validat de un operator uman înainte de execuție. Potrivit pentru decizii cu impact mare (creditare, angajare) și volume mici/medii.",
  human_on_the_loop:
    "Sistemul AI execută automat, dar un operator uman monitorizează în timp real și poate interveni. Potrivit pentru sisteme de mare volum unde HITL ar fi imposibil.",
  human_in_command:
    "Uman definește politici, praguri, parametri. Sistemul AI rulează în limitele setate. Uman are autoritate de override în orice moment.",
  two_person_rule:
    "Obligatoriu pentru identificare biometrică la distanță (Art. 14(4)): două persoane trebuie să confirme rezultatul înainte de orice acțiune.",
  hybrid:
    "Combinație: ex. HOTL pe trafic normal + escalare automată la HITL când scorul de risc depășește un prag.",
}

/**
 * Cele 5 capacități Art. 14(3) listate în ordinea din regulament.
 */
export const OVERSIGHT_CAPABILITIES_ORDERED: OversightCapability[] = [
  "understand_capabilities",
  "aware_of_automation_bias",
  "interpret_output_correctly",
  "decide_not_to_use",
  "intervene_or_stop",
]

export const OVERSIGHT_CAPABILITY_LABELS: Record<OversightCapability, string> = {
  understand_capabilities:
    "(a) Înțelege capacitățile și limitele relevante ale sistemului",
  aware_of_automation_bias:
    "(b) Rămâne conștient de automation bias",
  interpret_output_correctly:
    "(c) Interpretează corect output-ul sistemului",
  decide_not_to_use:
    "(d) Poate decide să NU folosească sistemul sau să anuleze / inverseze output-ul",
  intervene_or_stop:
    "(e) Poate interveni în operare sau opri sistemul prin buton „stop\"",
}

export const OVERSIGHT_CAPABILITY_HELP: Record<OversightCapability, string> = {
  understand_capabilities:
    "Persoana desemnată cunoaște: cazurile de utilizare prevăzute, limitele de performanță (accuracy, FPR, FNR), datele pe care a fost antrenat sistemul, scenariile de eroare cunoscute. Dovedit prin: training documentat + manual operator.",
  aware_of_automation_bias:
    "Operatorul nu acceptă orbește output-ul AI ca fiind „corect\". Training specific pe: încrederea excesivă în AI, confirmation bias, anchoring. Dovedit prin: sesiuni periodice de calibrare.",
  interpret_output_correctly:
    "Operatorul înțelege scoruri, probabilități, explicații (XAI). Știe să distingă între „high confidence\" și „low confidence\" și acționează diferit. Dovedit prin: documentație de interpretare + exemple.",
  decide_not_to_use:
    "Operatorul are AUTORITATEA formală să respingă output-ul AI și să decidă manual. Nu este penalizat pentru override. Dovedit prin: politică internă + log-uri override.",
  intervene_or_stop:
    "Există buton stop accesibil + procedură clară de fallback. Operatorul poate opri sistemul în <60s. Testat periodic. Dovedit prin: log testare stop + screenshot UI buton stop.",
}

export const FALLBACK_MODE_OPTIONS = [
  "manual_processing",
  "previous_model",
  "deny_all",
  "queue_for_review",
  "other",
] as const

export const FALLBACK_MODE_LABELS: Record<typeof FALLBACK_MODE_OPTIONS[number], string> = {
  manual_processing: "Procesare manuală (oameni preiau munca)",
  previous_model: "Model anterior / versiune stabilă",
  deny_all: "Refuză toate cererile până la restaurare",
  queue_for_review: "Coadă de revizie umană",
  other: "Alt mod (descris)",
}

export const TEST_FREQUENCY_OPTIONS = [
  "weekly",
  "monthly",
  "quarterly",
  "annually",
] as const

export const TEST_FREQUENCY_LABELS: Record<typeof TEST_FREQUENCY_OPTIONS[number], string> = {
  weekly: "Săptămânal",
  monthly: "Lunar",
  quarterly: "Trimestrial",
  annually: "Anual",
}

export const COMPETENCE_LEVEL_OPTIONS = ["basic", "trained", "expert"] as const
export const COMPETENCE_LEVEL_LABELS: Record<typeof COMPETENCE_LEVEL_OPTIONS[number], string> = {
  basic: "De bază — instrucțiuni de utilizare",
  trained: "Formare — curs documentat + certificare internă",
  expert: "Expert — formare profundă + experiență dovedită",
}

export const NOTIFICATION_METHOD_OPTIONS = [
  "email",
  "sms",
  "phone",
  "slack",
  "in_app",
] as const

export const NOTIFICATION_METHOD_LABELS: Record<typeof NOTIFICATION_METHOD_OPTIONS[number], string> = {
  email: "Email",
  sms: "SMS",
  phone: "Telefon",
  slack: "Slack / Teams",
  in_app: "Notificare în aplicație",
}

// ────────────────────────────────────────────────────────────────────────────
//   Schema V1 — 5 secțiuni × ~18 întrebări
// ────────────────────────────────────────────────────────────────────────────

export const OVERSIGHT_SCHEMA_V1: OversightSchema = {
  id: "compliroai-oversight-art-14",
  version: "2026.05.ro.v1",
  jurisdiction: "RO/EU",
  legalBasis: [
    "Regulament (UE) 2024/1689 Art. 14 — supraveghere umană (high-risk AI)",
    "Regulament (UE) 2024/1689 Art. 14(3) — 5 capacități cerute (a)-(e)",
    "Regulament (UE) 2024/1689 Art. 14(4) — 4-eyes pentru biometric ID",
    "Regulament (UE) 2024/1689 Art. 26(2) — competență + training + autoritate + suport",
  ],
  sections: [
    // ── A) Model oversight + sistem AI legat ─────────────────────────────────
    {
      id: "A",
      title: "A. Model oversight + sistem AI",
      description:
        "Selectează modelul de oversight implementat + sistemul AI vizat. Modelul trebuie proporțional cu riscul, autonomia și contextul de utilizare (Art. 14(5)).",
      questions: [
        {
          id: "title",
          section: "A",
          label: "Titlul protocolului",
          helpText:
            "Ex: „Oversight Protocol — HR Screening AI\", „Protocol supraveghere — chatbot suport clienți\".",
          legalReference: "EU AI Act Art. 14(1)",
          type: "text",
          required: true,
        },
        {
          id: "linkedAISystemId",
          section: "A",
          label: "Sistemul AI high-risk vizat",
          helpText:
            "Selectează sistemul AI din Inventarul AI. Protocolul Art. 14 este OBLIGATORIU pentru sisteme high-risk; recomandat pentru limited risk.",
          legalReference: "EU AI Act Art. 14(1) + Art. 6",
          type: "select",
          required: true,
        },
        {
          id: "oversightModel",
          section: "A",
          label: "Model de supraveghere",
          helpText:
            "HITL = uman aprobă fiecare decizie. HOTL = uman monitorizează. HIC = uman setează parametri. Two-person rule = OBLIGATORIU Art. 14(4) pentru biometric ID. Hibrid = combinație.",
          legalReference: "EU AI Act Art. 14(2) + Art. 14(4) + Art. 14(5)",
          type: "select",
          options: OVERSIGHT_MODEL_OPTIONS,
          required: true,
        },
      ],
    },
    // ── B) Capacități Art. 14(3) ─────────────────────────────────────────────
    {
      id: "B",
      title: "B. Capacități Art. 14(3) acoperite",
      description:
        "Cele 5 capacități obligatorii cerute de Art. 14(3): măsurile de oversight trebuie să permită persoanei desemnate să facă toate cele 5 lucruri. Bifează doar ce este efectiv implementat + documentat.",
      questions: [
        {
          id: "capabilitiesCovered",
          section: "B",
          label: "Capacități acoperite (Art. 14(3)(a)-(e))",
          helpText:
            "Toate cele 5 capacități trebuie să fie ACOPERITE pentru ca protocolul să fie complet conform Art. 14(3). Selectează doar pe cele pentru care există dovadă (training, manual, UI buton stop, etc.).",
          legalReference: "EU AI Act Art. 14(3)",
          type: "multiselect",
          capabilityOptions: OVERSIGHT_CAPABILITIES_ORDERED,
          required: true,
        },
      ],
    },
    // ── C) Persoane responsabile (Art. 26(2)) ────────────────────────────────
    {
      id: "C",
      title: "C. Persoane responsabile (Art. 26(2))",
      description:
        "Art. 26(2): deployer atribuie supravegherea unor persoane fizice cu competența, training-ul, autoritatea și suportul necesare. Minim 1 persoană cu authority to override pentru protocol complet.",
      questions: [
        {
          id: "responsibleHumans",
          section: "C",
          label: "Persoane responsabile cu oversight",
          helpText:
            "Adaugă fiecare persoană: email, nume, rol, nivel competență, dată training documentat, dacă are AUTORITATE de override + dacă are echipă de suport. Two-person rule cere minim 2 persoane.",
          legalReference: "EU AI Act Art. 26(2)",
          type: "responsibles",
          required: true,
        },
      ],
    },
    // ── D) Escaladare + contestație ──────────────────────────────────────────
    {
      id: "D",
      title: "D. Escaladare + contestație",
      description:
        "Definește pașii de escaladare când o decizie/situație depășește competența operatorului direct + procedura prin care persoana afectată poate contesta o decizie automată.",
      questions: [
        {
          id: "escalationSteps",
          section: "D",
          label: "Pași de escaladare",
          helpText:
            "Pentru fiecare nivel: condiție de declanșare (ex: „risc >0.8\", „decizie respinsă de aplicant\"), email + rol destinatar, SLA (ore), metodă notificare. Minim 1 pas pentru protocol complet.",
          legalReference: "EU AI Act Art. 14(2) + Art. 26(2)",
          type: "escalation",
          required: true,
        },
        {
          id: "contestationProcedure",
          section: "D",
          label: "Procedură contestație decizie automată",
          helpText:
            "Cum poate persoana afectată să conteste: canal (email/portal/telefon), SLA acknowledgement (ore), SLA rezoluție (zile), rol reviewer, cum se păstrează dovezile. Aliniat GDPR Art. 22 + AI Act Art. 86.",
          legalReference: "EU AI Act Art. 86 + GDPR Art. 22",
          type: "contestation",
          required: true,
        },
      ],
    },
    // ── E) Stop + fallback ───────────────────────────────────────────────────
    {
      id: "E",
      title: "E. Stop + fallback",
      description:
        "Art. 14(3)(e) + Art. 14(4)(d): operatorul trebuie să poată opri sistemul prin buton „stop\" + să existe o procedură de fallback documentată și testată periodic.",
      questions: [
        {
          id: "stopProcedure",
          section: "E",
          label: "Procedură stop + fallback",
          helpText:
            "Buton stop disponibil DA/NU + locație UI + modul fallback (manual / model anterior / deny_all / queue / altul) + descriere + ultima testare + frecvență test. Testare obligatorie pentru protocol complet.",
          legalReference: "EU AI Act Art. 14(3)(e) + Art. 14(4)(d)",
          type: "stop",
          required: true,
        },
        {
          id: "evidenceChecklist",
          section: "E",
          label: "Checklist evidență pentru audit",
          helpText:
            "Listă liberă de items pe care le vei colecta ca dovadă: log-uri override, screenshot buton stop, raport test fallback, certificat training operatori, etc. Un item pe linie.",
          legalReference: "EU AI Act Art. 26 + Art. 14",
          type: "checklist",
          required: false,
        },
      ],
    },
  ],
}

/**
 * Helpers pentru evaluator + store: returnează lista plată a tuturor întrebărilor.
 */
export function getAllOversightQuestions(): OversightQuestion[] {
  return OVERSIGHT_SCHEMA_V1.sections.flatMap((section) => section.questions)
}

export function getOversightQuestionById(id: string): OversightQuestion | undefined {
  return getAllOversightQuestions().find((q) => q.id === id)
}

export function getOversightSectionById(
  id: OversightSchemaSectionId,
): OversightSchemaSection | undefined {
  return OVERSIGHT_SCHEMA_V1.sections.find((s) => s.id === id)
}
