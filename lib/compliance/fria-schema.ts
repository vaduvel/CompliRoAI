// FRIA Schema V1 — Sprint 016 (BUILD NEW per EU AI Act Art. 27).
//
// 6 secțiuni × ~20 întrebări care operaționalizează obligația deployer-ului
// unui sistem AI high-risk de a evalua impactul asupra drepturilor
// fundamentale ÎNAINTE de prima utilizare.
//
// Secțiuni:
//   A) Profilul deployer-ului — Art. 27(1) categoria
//   B) Procesul + utilizarea — Art. 27(1)(a)(b) descriere
//   C) Persoanele afectate — Art. 27(1)(c) volumetrie + vulnerabilitate
//   D) Drepturile fundamentale la risc — Art. 27(1)(d) + Carta UE 24 drepturi
//   E) Supraveghere umană — Art. 27(1)(e) + Art. 14 măsuri
//   F) Plângere + guvernanță — Art. 27(1)(f) mecanism + măsuri suplimentare
//
// Schema nu emite findings direct (asta face `fria-evaluator.ts`). Aici
// definim doar structura întrebărilor + helpText + referință legală per Q.

import type {
  FriaDeployerType,
  FriaFrequencyOfUse,
  FundamentalRight,
} from "@/lib/compliance/types"

export type FriaQuestionType =
  | "select"
  | "multiselect"
  | "boolean"
  | "text"
  | "textarea"
  | "number"
  | "date"
  | "groups"          // editor pentru affectedGroups[]
  | "rights_matrix"   // editor pentru rightsAtRisk[] + riskAssessments[]
  | "oversight"       // editor pentru humanOversightMeasures[]

export type FriaSchemaSectionId = "A" | "B" | "C" | "D" | "E" | "F"

export type FriaQuestion = {
  id: string
  section: FriaSchemaSectionId
  label: string
  helpText: string
  /** Referință EU AI Act sau Carta UE care fundamentează întrebarea. */
  legalReference: string
  type: FriaQuestionType
  options?: string[]
  required: boolean
  /** Pentru `multiselect` din 24 drepturi. */
  fundamentalRightOptions?: FundamentalRight[]
}

export type FriaSchemaSection = {
  id: FriaSchemaSectionId
  title: string
  description: string
  questions: FriaQuestion[]
}

export type FriaSchema = {
  id: string
  version: "2026.05.ro.v1"
  jurisdiction: "RO/EU"
  legalBasis: string[]
  sections: FriaSchemaSection[]
}

// ────────────────────────────────────────────────────────────────────────────
//   Liste de referință (folosite și în UI pentru render)
// ────────────────────────────────────────────────────────────────────────────

export const DEPLOYER_TYPE_OPTIONS: FriaDeployerType[] = [
  "public_body",
  "private_public_service",
  "credit_assessment",
  "life_health_insurance",
  "other_high_risk_deployer",
  "not_applicable",
]

export const DEPLOYER_TYPE_LABELS: Record<FriaDeployerType, string> = {
  public_body: "Organism public",
  private_public_service: "Entitate privată — servicii publice",
  credit_assessment: "Evaluare bonitate (credit scoring)",
  life_health_insurance: "Asigurări viață / sănătate (preț + risc)",
  other_high_risk_deployer: "Alt deployer high-risk",
  not_applicable: "Neaplicabil",
}

export const FREQUENCY_OPTIONS: FriaFrequencyOfUse[] = [
  "real_time_continuous",
  "daily",
  "weekly",
  "monthly",
  "ad_hoc",
  "one_time",
]

export const FREQUENCY_LABELS: Record<FriaFrequencyOfUse, string> = {
  real_time_continuous: "Real-time / continuu",
  daily: "Zilnic",
  weekly: "Săptămânal",
  monthly: "Lunar",
  ad_hoc: "Ad-hoc (la cerere)",
  one_time: "O singură dată",
}

/**
 * Cele 24 drepturi fundamentale (Carta UE) evaluate în FRIA. Listă ordonată
 * pe titluri Cartă (I-VI) pentru consistență UI.
 */
export const FUNDAMENTAL_RIGHTS_ORDERED: FundamentalRight[] = [
  // Titlul I — Demnitate
  "human_dignity",
  "right_to_life",
  "integrity_of_person",
  // Titlul II — Libertăți
  "privacy_family_life",
  "data_protection",
  "freedom_thought_religion",
  "freedom_expression",
  "freedom_assembly",
  "right_to_education",
  "right_to_work",
  "freedom_to_conduct_business",
  "right_to_property",
  "right_to_asylum",
  // Titlul III — Egalitate
  "equality_before_law",
  "non_discrimination",
  "cultural_religious_linguistic_diversity",
  "gender_equality",
  "rights_of_child",
  "rights_of_elderly",
  "rights_of_disabled",
  // Titlul IV — Solidaritate
  "fair_working_conditions",
  "social_security",
  "consumer_protection",
  // Titlul V — Cetățenie / Justiție
  "good_administration",
  "effective_remedy",
]

export const FUNDAMENTAL_RIGHT_LABELS: Record<FundamentalRight, string> = {
  human_dignity: "Demnitate umană (Cartă Art. 1)",
  right_to_life: "Dreptul la viață (Cartă Art. 2)",
  integrity_of_person: "Integritatea persoanei (Cartă Art. 3)",
  privacy_family_life: "Viață privată și de familie (Cartă Art. 7)",
  data_protection: "Protecția datelor cu caracter personal (Cartă Art. 8)",
  freedom_thought_religion: "Libertatea de gândire, conștiință și religie (Cartă Art. 10)",
  freedom_expression: "Libertatea de exprimare și informare (Cartă Art. 11)",
  freedom_assembly: "Libertatea de întrunire și asociere (Cartă Art. 12)",
  right_to_education: "Dreptul la educație (Cartă Art. 14)",
  right_to_work: "Libertatea de a alege o ocupație și dreptul la muncă (Cartă Art. 15)",
  freedom_to_conduct_business: "Libertatea de a desfășura o activitate comercială (Cartă Art. 16)",
  right_to_property: "Dreptul de proprietate (Cartă Art. 17)",
  right_to_asylum: "Dreptul de azil (Cartă Art. 18)",
  equality_before_law: "Egalitatea în fața legii (Cartă Art. 20)",
  non_discrimination: "Nediscriminare (Cartă Art. 21)",
  cultural_religious_linguistic_diversity: "Diversitate culturală, religioasă și lingvistică (Cartă Art. 22)",
  gender_equality: "Egalitatea între femei și bărbați (Cartă Art. 23)",
  rights_of_child: "Drepturile copilului (Cartă Art. 24)",
  rights_of_elderly: "Drepturile persoanelor vârstnice (Cartă Art. 25)",
  rights_of_disabled: "Integrarea persoanelor cu dizabilități (Cartă Art. 26)",
  fair_working_conditions: "Condiții de muncă echitabile și juste (Cartă Art. 31)",
  social_security: "Securitate socială și asistență socială (Cartă Art. 34)",
  consumer_protection: "Protecția consumatorilor (Cartă Art. 38)",
  good_administration: "Dreptul la o bună administrare (Cartă Art. 41)",
  effective_remedy: "Dreptul la o cale de atac eficientă (Cartă Art. 47)",
}

// ────────────────────────────────────────────────────────────────────────────
//   Schema V1 — 6 secțiuni + ~20 întrebări
// ────────────────────────────────────────────────────────────────────────────

export const FRIA_SCHEMA_V1: FriaSchema = {
  id: "compliroai-fria-art-27",
  version: "2026.05.ro.v1",
  jurisdiction: "RO/EU",
  legalBasis: [
    "Regulament (UE) 2024/1689 Art. 27 — Fundamental Rights Impact Assessment",
    "Regulament (UE) 2024/1689 Art. 26 — obligații deployer high-risk",
    "Regulament (UE) 2024/1689 Art. 14 — supraveghere umană",
    "Carta drepturilor fundamentale a UE (2012/C 326/02)",
    "Regulament (UE) 2024/1689 Annex III — cazuri high-risk",
  ],
  sections: [
    // ── A) Profilul deployer-ului ─────────────────────────────────────────────
    {
      id: "A",
      title: "A. Profilul deployer-ului",
      description:
        "Confirmă categoria deployer-ului conform Art. 27(1). Doar deployerii din categoriile (a) și (b) sunt obligați la FRIA înainte de prima utilizare.",
      questions: [
        {
          id: "deployerType",
          section: "A",
          label: "Care este tipul deployer-ului?",
          helpText:
            "Art. 27(1)(a): organism public sau entitate privată care prestează servicii publice. Art. 27(1)(b): credit scoring (Annex III pt. 5(b)) sau asigurări viață/sănătate (Annex III pt. 5(c)).",
          legalReference: "EU AI Act Art. 27(1)",
          type: "select",
          options: DEPLOYER_TYPE_OPTIONS,
          required: true,
        },
        {
          id: "linkedAISystemId",
          section: "A",
          label: "Care sistem AI high-risk este evaluat?",
          helpText: "Selectează sistemul AI din Inventarul AI. Doar sistemele clasificate ca high-risk sunt eligibile pentru FRIA.",
          legalReference: "EU AI Act Art. 6 + Annex III",
          type: "select",
          required: true,
        },
        {
          id: "linkedDpiaRecordId",
          section: "A",
          label: "Există DPIA care acoperă aceleași riscuri? (Art. 27(4) — reuse)",
          helpText:
            "Art. 27(4): dacă o DPIA conform GDPR Art. 35 acoperă aceleași riscuri, FRIA poate fi un addendum la DPIA. Selectează DPIA-ul existent dacă da.",
          legalReference: "EU AI Act Art. 27(4)",
          type: "select",
          required: false,
        },
      ],
    },
    // ── B) Procesul + utilizarea ──────────────────────────────────────────────
    {
      id: "B",
      title: "B. Procesul și utilizarea sistemului AI",
      description:
        "Documentează ce face sistemul AI, cine îl folosește, când și cu ce frecvență. Art. 27(1)(a)(b) cere o descriere clară a contextului de utilizare.",
      questions: [
        {
          id: "processDescription",
          section: "B",
          label: "Descrierea procesului în care e folosit sistemul AI",
          helpText:
            "Ex: Trierea automată a CV-urilor pentru posturile vacante; Calcularea scorului de bonitate pentru aplicanții la credit; Evaluarea riscului medical pentru polițe de asigurare de viață.",
          legalReference: "EU AI Act Art. 27(1)(a)",
          type: "textarea",
          required: true,
        },
        {
          id: "operatorRole",
          section: "B",
          label: "Cine operează sistemul AI în mod direct? (rol)",
          helpText: "Ex: Recrutor HR, Ofițer de credite, Specialist underwriting.",
          legalReference: "EU AI Act Art. 26(2) — instructions for use",
          type: "text",
          required: true,
        },
        {
          id: "periodOfUseStartISO",
          section: "B",
          label: "Data de începere a utilizării",
          helpText: "FRIA trebuie completat ÎNAINTE de prima utilizare (Art. 27(1)).",
          legalReference: "EU AI Act Art. 27(1) — before first putting into use",
          type: "date",
          required: true,
        },
        {
          id: "frequencyOfUse",
          section: "B",
          label: "Cât de des este folosit sistemul AI?",
          helpText: "Frecvența influențează severitatea cumulativă a impactului asupra drepturilor.",
          legalReference: "EU AI Act Art. 27(1)(b)",
          type: "select",
          options: FREQUENCY_OPTIONS,
          required: true,
        },
        {
          id: "expectedVolume",
          section: "B",
          label: "Volum estimat de decizii / utilizări per perioadă",
          helpText: "Ex: 500 candidați/lună, 1000 aplicații credit/zi. Folosit pentru aprecierea scării.",
          legalReference: "EU AI Act Art. 27(1)(b)",
          type: "number",
          required: false,
        },
      ],
    },
    // ── C) Persoanele afectate ────────────────────────────────────────────────
    {
      id: "C",
      title: "C. Categoriile de persoane afectate",
      description:
        "Identifică grupurile afectate de output-ul sistemului AI + estimează volumul + marchează vulnerabilitățile (copii, persoane cu dizabilități, vârstnici etc.). Art. 27(1)(c).",
      questions: [
        {
          id: "affectedGroups",
          section: "C",
          label: "Categorii de persoane afectate",
          helpText:
            "Adaugă fiecare grup distinct: nume, volum estimat, vulnerabilități declarate. Ex: Candidați angajare, 500/lună, vulnerabilități: vârstnici 50+, persoane cu dizabilități.",
          legalReference: "EU AI Act Art. 27(1)(c)",
          type: "groups",
          required: true,
        },
      ],
    },
    // ── D) Drepturile fundamentale la risc ────────────────────────────────────
    {
      id: "D",
      title: "D. Drepturile fundamentale la risc",
      description:
        "Identifică drepturile fundamentale care pot fi afectate de sistemul AI + evaluează likelihood × severity per drept + documentează măsurile de mitigare. Art. 27(1)(d) + Carta UE.",
      questions: [
        {
          id: "rightsAtRisk",
          section: "D",
          label: "Selectează drepturile fundamentale la risc (multi-select din 24)",
          helpText:
            "Drepturi candidate frecvente pentru sisteme AI: nediscriminare (Art. 21), protecție date (Art. 8), demnitate umană (Art. 1), bună administrare (Art. 41), cale de atac (Art. 47). Pentru fiecare drept selectat, evaluează likelihood + severity + mitigare în matricea de mai jos.",
          legalReference: "EU AI Act Art. 27(1)(d) + Carta UE 2012/C 326/02",
          type: "multiselect",
          fundamentalRightOptions: FUNDAMENTAL_RIGHTS_ORDERED,
          required: true,
        },
        {
          id: "riskAssessments",
          section: "D",
          label: "Matrice de risc per drept fundamental",
          helpText:
            "Pentru fiecare drept selectat: descrie riscul concret, evaluează likelihood (rar → aproape sigur), severity (neglijabil → catastrofic), riskLevel calculat automat, măsuri de mitigare, risc rezidual.",
          legalReference: "EU AI Act Art. 27(1)(d)",
          type: "rights_matrix",
          required: true,
        },
      ],
    },
    // ── E) Supraveghere umană ─────────────────────────────────────────────────
    {
      id: "E",
      title: "E. Supraveghere umană (Art. 14)",
      description:
        "Art. 27(1)(e) cere descrierea măsurilor de supraveghere umană implementate. Acestea sunt măsurile Art. 14: human-in-loop, override, audit log, explainability, fallback, complaint mechanism.",
      questions: [
        {
          id: "humanOversightMeasures",
          section: "E",
          label: "Măsuri de supraveghere umană implementate",
          helpText:
            "Adaugă fiecare măsură: tip (human-in-loop / on-loop / in-command / override / audit log / explainability / fallback), descriere, rol responsabil, condiții de declanșare.",
          legalReference: "EU AI Act Art. 27(1)(e) + Art. 14",
          type: "oversight",
          required: true,
        },
        {
          id: "explainabilityProvided",
          section: "E",
          label: "Se oferă explicații persoanelor afectate? (Art. 86)",
          helpText:
            "Art. 86: dreptul de explicație al persoanelor afectate de decizii ale sistemelor AI high-risk. Răspuns DA presupune mecanism documentat de furnizare a explicațiilor.",
          legalReference: "EU AI Act Art. 86",
          type: "boolean",
          required: true,
        },
        {
          id: "appealMechanism",
          section: "E",
          label: "Există mecanism de contestare a deciziei automate? (Art. 22 GDPR)",
          helpText:
            "GDPR Art. 22 + EU AI Act: persoanele afectate trebuie să poată contesta decizia + să obțină intervenție umană. Răspuns DA presupune procedură documentată.",
          legalReference: "GDPR Art. 22 + EU AI Act Art. 27(1)(e)",
          type: "boolean",
          required: true,
        },
        {
          id: "fallbackProcedure",
          section: "E",
          label: "Există procedură de fallback / oprire de urgență?",
          helpText: "Art. 14(4)(d): operatorul trebuie să poată opri sistemul în caz de risc.",
          legalReference: "EU AI Act Art. 14(4)(d)",
          type: "boolean",
          required: true,
        },
      ],
    },
    // ── F) Plângere + guvernanță ──────────────────────────────────────────────
    {
      id: "F",
      title: "F. Plângere și guvernanță",
      description:
        "Art. 27(1)(f) cere descrierea mecanismului prin care persoanele afectate pot face plângeri + măsuri organizatorice suplimentare.",
      questions: [
        {
          id: "complaintMechanism",
          section: "F",
          label: "Mecanism de plângere accesibil persoanelor afectate",
          helpText:
            "Descrie cum poate o persoană să facă plângere: canal (email/portal/telefon), termen de răspuns, autoritate competentă (ADR / ANSPDCP / ASF). Art. 27(1)(f) cere ca mecanismul să fie public și accesibil.",
          legalReference: "EU AI Act Art. 27(1)(f) + Art. 85",
          type: "textarea",
          required: true,
        },
        {
          id: "governanceMeasures",
          section: "F",
          label: "Măsuri organizatorice + tehnice suplimentare",
          helpText:
            "Listă liberă: training operatori, audituri periodice, revizuiri ale modelului, monitorizare bias, log review. Un item pe linie.",
          legalReference: "EU AI Act Art. 26 + Art. 27(1)(g)",
          type: "textarea",
          required: false,
        },
        {
          id: "notifyAuthorityRequired",
          section: "F",
          label: "Necesită notificare la autoritate de supraveghere? (Art. 27(3))",
          helpText:
            "Art. 27(3): rezultatul FRIA trebuie comunicat autorității naționale (ADR în RO pentru AI Act, ANSPDCP pentru date personale, ASF pentru asigurări). Răspuns DA → marchează cu autoritatea și referința.",
          legalReference: "EU AI Act Art. 27(3)",
          type: "boolean",
          required: true,
        },
      ],
    },
  ],
}

/**
 * Helpers pentru evaluator/store: returnează lista plată a tuturor întrebărilor,
 * indexate pe sectionId pentru iterare ordonată.
 */
export function getAllFriaQuestions(): FriaQuestion[] {
  return FRIA_SCHEMA_V1.sections.flatMap((section) => section.questions)
}

export function getFriaQuestionById(id: string): FriaQuestion | undefined {
  return getAllFriaQuestions().find((q) => q.id === id)
}

export function getFriaSectionById(id: FriaSchemaSectionId): FriaSchemaSection | undefined {
  return FRIA_SCHEMA_V1.sections.find((s) => s.id === id)
}
