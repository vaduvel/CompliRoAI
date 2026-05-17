// PMM (Post-Market Monitoring) Schema V1 — Sprint 019
// (BUILD NEW per EU AI Act Art. 72 + Annex IV punct 10).
//
// 5 secțiuni × 3-6 întrebări care operaționalizează obligația provider-ului
// (și a deployer-ului care substanțial modifică, prin Art. 25(1)) de a stabili
// + documenta un sistem de monitorizare post-piață pentru un sistem AI
// high-risk, proporțional cu natura + riscul (Art. 72(1)).
//
// Secțiuni:
//   A) Sistem AI + ciclul de revizie — Art. 72(1) + Art. 72(4)
//   B) Data collection — Art. 72(3)(a)
//   C) Evaluarea continuei conformități — Art. 72(3)(b)
//   D) Acțiune corectivă + preventivă — Art. 72(3)(c)
//   E) Confirmare baseline + acoperire lifetime — Art. 72(2)
//
// Schema NU emite findings (asta face `pmm-evaluator.ts`). Aici definim
// doar structura întrebărilor + helpText + referință legală per Q.

import type {
  PmmDataCollectionFrequency,
  PmmDataCollectionMethod,
  PmmReviewCycle,
} from "@/lib/compliance/types"

export type PmmQuestionType =
  | "select"
  | "multiselect"
  | "boolean"
  | "text"
  | "textarea"
  | "string_list"

export type PmmSchemaSectionId = "A" | "B" | "C" | "D" | "E"

export type PmmQuestion = {
  id: string
  section: PmmSchemaSectionId
  label: string
  helpText: string
  /** Referință EU AI Act care fundamentează întrebarea. */
  legalReference: string
  type: PmmQuestionType
  options?: string[]
  required: boolean
}

export type PmmSchemaSection = {
  id: PmmSchemaSectionId
  title: string
  description: string
  questions: PmmQuestion[]
}

export type PmmSchema = {
  id: string
  version: "2026.05.ro.v1"
  jurisdiction: "RO/EU"
  legalBasis: string[]
  sections: PmmSchemaSection[]
}

// ────────────────────────────────────────────────────────────────────────────
//   Liste de referință (folosite în UI pentru render)
// ────────────────────────────────────────────────────────────────────────────

export const PMM_REVIEW_CYCLE_OPTIONS: PmmReviewCycle[] = [
  "monthly",
  "quarterly",
  "biannual",
  "annual",
]

export const PMM_REVIEW_CYCLE_LABELS: Record<PmmReviewCycle, string> = {
  monthly: "Lunar (sisteme biometrice, decizii cu impact critic)",
  quarterly: "Trimestrial (minim cerut pentru high-risk Annex III)",
  biannual: "Semestrial (high-risk stabil, după 12 luni fără incidente)",
  annual: "Anual (limited / minimal risk; nu îndeplinește Art. 72 pentru high-risk)",
}

/**
 * Map review cycle -> luni. Folosit pentru calcul nextReviewISO.
 */
export const PMM_REVIEW_CYCLE_MONTHS: Record<PmmReviewCycle, number> = {
  monthly: 1,
  quarterly: 3,
  biannual: 6,
  annual: 12,
}

export const PMM_DATA_COLLECTION_METHOD_OPTIONS: PmmDataCollectionMethod[] = [
  "system_logs",
  "user_feedback",
  "performance_metrics",
  "bias_metrics",
  "drift_detection",
  "incident_reports",
  "external_audit",
  "human_oversight_logs",
  "other",
]

export const PMM_DATA_COLLECTION_METHOD_LABELS: Record<
  PmmDataCollectionMethod,
  string
> = {
  system_logs: "Loguri sistem (consumate din config Art. 12 — Sprint 018)",
  user_feedback: "Feedback utilizatori (rating, sesizări, reclamații)",
  performance_metrics: "Metrici de performanță (acuratețe, latency, throughput)",
  bias_metrics: "Metrici de echitate (paritate demografică, gap accuracy pe grupuri)",
  drift_detection: "Detecție drift (distribuție input/output vs baseline)",
  incident_reports: "Rapoarte incidente (ANSPDCP, intern, Art. 73)",
  external_audit: "Audit extern (terț independent)",
  human_oversight_logs: "Loguri oversight uman (override, escaladări — Sprint 017)",
  other: "Altă metodă (descrisă în notes)",
}

export const PMM_DATA_COLLECTION_METHOD_HELP: Record<
  PmmDataCollectionMethod,
  string
> = {
  system_logs:
    "Telemetrie tehnică din SIEM/storage logging Art. 12: input data, output decision, errors, drift signals. Consumat din configurarea Sprint 018.",
  user_feedback:
    "Canale pentru utilizatori finali (DSAR-like): rating-uri în-produs, formular reclamație, escaladare suport. Necesar pentru detectarea problemelor pe care logging-ul tehnic nu le surprinde.",
  performance_metrics:
    "Acuratețe, precizie, recall, F1, latency p50/p95/p99, throughput, error rate. Tracked vs baseline + threshold-uri configurate.",
  bias_metrics:
    "Demographic parity, equalized odds, accuracy gap pe grupuri protejate. Cerut pentru sisteme cu impact pe drepturi (Art. 9 GDPR overlay).",
  drift_detection:
    "Population Stability Index (PSI), Kolmogorov-Smirnov, KL divergence între distribuția training și inference. Trigger pentru re-antrenare model.",
  incident_reports:
    "Incidente operaționale interne + incidente serioase Art. 73 (Sprint 020). Sursă esențială pentru identificarea pattern-urilor de risc.",
  external_audit:
    "Audit terță parte (consultant, certified body, ANSPDCP). Frecvență minimă recomandată: anual pentru high-risk.",
  human_oversight_logs:
    "Loguri override/stop/escaladare din Sprint 017 (protocol Art. 14). Sursă privilegiată pentru cazurile unde AI a greșit + oamenii au corectat.",
  other:
    "Altă metodă proprie (ex: shadow deployment, A/B test, red team exercises). Descrie în notes config.",
}

export const PMM_DATA_COLLECTION_FREQUENCY_OPTIONS: PmmDataCollectionFrequency[] = [
  "real_time",
  "daily",
  "weekly",
  "monthly",
  "quarterly",
]

export const PMM_DATA_COLLECTION_FREQUENCY_LABELS: Record<
  PmmDataCollectionFrequency,
  string
> = {
  real_time: "Real-time (streaming către SIEM / monitoring)",
  daily: "Zilnic (batch aggregation)",
  weekly: "Săptămânal",
  monthly: "Lunar",
  quarterly: "Trimestrial (minimum pentru evaluare continuă)",
}

// ────────────────────────────────────────────────────────────────────────────
//   Schema V1 — 5 secțiuni × 3-6 întrebări
// ────────────────────────────────────────────────────────────────────────────

export const PMM_SCHEMA_V1: PmmSchema = {
  id: "compliroai-pmm-art-72",
  version: "2026.05.ro.v1",
  jurisdiction: "RO/EU",
  legalBasis: [
    "Regulament (UE) 2024/1689 Art. 72(1) — providers stabilesc + documentează sistem PMM proporțional cu natura + riscul",
    "Regulament (UE) 2024/1689 Art. 72(2) — colectează + documentează date relevante pentru performanța pe durata vieții",
    "Regulament (UE) 2024/1689 Art. 72(3) — bazat pe plan: (a) metode colectare, (b) evaluare conformitate continuă, (c) acțiune corectivă/preventivă",
    "Regulament (UE) 2024/1689 Art. 72(4) — provider analizează datele + folosește rezultatele pentru update-uri",
    "Regulament (UE) 2024/1689 Art. 26(4) — deployer informează provider despre malfunctioning",
    "Regulament (UE) 2024/1689 Art. 43(4) — schimbare substanțială declanșează re-evaluare conformity assessment",
    "Regulament (UE) 2024/1689 Annex IV pct. 10 — descrierea sistemului PMM ca parte din technical documentation",
  ],
  sections: [
    // ── A) Sistem AI + ciclul de revizie ─────────────────────────────────────
    {
      id: "A",
      title: "A. Sistem AI + ciclul de revizie",
      description:
        "Selectează sistemul AI vizat + frecvența reviziei periodice. Pentru high-risk Annex III, minim trimestrial; pentru biometric / decizii critice, minim lunar (Art. 72(1) proporționalitate).",
      questions: [
        {
          id: "title",
          section: "A",
          label: "Titlul planului PMM",
          helpText:
            "Ex: „PMM Plan — HR Screening AI v1\", „Monitoring post-piață — chatbot suport clienți\".",
          legalReference: "EU AI Act Art. 72(1)",
          type: "text",
          required: true,
        },
        {
          id: "linkedAISystemId",
          section: "A",
          label: "Sistemul AI vizat",
          helpText:
            "Selectează sistemul AI din Inventar. PMM Plan este OBLIGATORIU pentru high-risk; recomandat pentru limited risk.",
          legalReference: "EU AI Act Art. 72(1) + Art. 6",
          type: "select",
          required: true,
        },
        {
          id: "reviewCycle",
          section: "A",
          label: "Ciclu de revizie periodic",
          helpText:
            "Frecvența cu care planul + datele colectate sunt revizuite. Trimestrial = minim pentru high-risk; lunar pentru biometric / decizii cu impact critic.",
          legalReference: "EU AI Act Art. 72(1) + Art. 72(4)",
          type: "select",
          options: PMM_REVIEW_CYCLE_OPTIONS,
          required: true,
        },
      ],
    },
    // ── B) Data collection (Art. 72(3)(a)) ───────────────────────────────────
    {
      id: "B",
      title: "B. Metode de colectare a datelor (Art. 72(3)(a))",
      description:
        "Bifează metodele prin care colectezi date despre performanța sistemului pe durata vieții. Minim 3 metode pentru completeness. system_logs + human_oversight_logs presupun activarea Sprint 017 + 018.",
      questions: [
        {
          id: "dataCollectionMethods",
          section: "B",
          label: "Metode de colectare",
          helpText:
            "Selectează metodele active (cu dovadă în SIEM/dashboards). Minim 3 pentru completeness; minim 5 recomandat pentru biometric / decizii cu impact.",
          legalReference: "EU AI Act Art. 72(3)(a)",
          type: "multiselect",
          options: PMM_DATA_COLLECTION_METHOD_OPTIONS,
          required: true,
        },
        {
          id: "dataCollectionFrequency",
          section: "B",
          label: "Frecvența colectării",
          helpText:
            "Real-time pentru streaming; minim daily pentru high-risk; quarterly = minim absolut. Determină cât de rapid pot fi detectate problemele.",
          legalReference: "EU AI Act Art. 72(2)",
          type: "select",
          options: PMM_DATA_COLLECTION_FREQUENCY_OPTIONS,
          required: true,
        },
        {
          id: "dataCollectionDescription",
          section: "B",
          label: "Descriere narativă a colectării",
          helpText:
            "Descrie concret pipeline-ul: surse, transformări, agregări, storage, owner. Ex: „SIEM Splunk recepționează evenimente Art. 12 real-time; dashboard zilnic agregă accuracy/bias/latency; review săptămânal de echipa ML\".",
          legalReference: "EU AI Act Art. 72(3)(a) + Annex IV pct. 10",
          type: "textarea",
          required: true,
        },
      ],
    },
    // ── C) Continuous compliance evaluation (Art. 72(3)(b)) ──────────────────
    {
      id: "C",
      title: "C. Evaluarea continuei conformități (Art. 72(3)(b))",
      description:
        "Cum verifici că sistemul rămâne conform cerințelor Capitolul III Sec. 2 (transparență, oversight, robustețe, accuracy, cybersecurity) pe durata vieții. NU este suficient să faci conformity assessment la pre-market.",
      questions: [
        {
          id: "complianceEvaluationMethods",
          section: "C",
          label: "Metodologii de evaluare conformitate",
          helpText:
            "Listă de metode (1 per linie): „comparare rezultate AI vs ground truth lunar\", „recheck DPIA dacă context schimbat\", „bias audit trimestrial pe grupuri protejate\", „test cybersecurity penetration anual\".",
          legalReference: "EU AI Act Art. 72(3)(b) + Cap III Sec 2",
          type: "string_list",
          required: true,
        },
        {
          id: "complianceMetricsTracked",
          section: "C",
          label: "Metrici de conformitate urmărite",
          helpText:
            "Listă concretă (1 per linie): „Annex III risk indicators\", „GDPR DPIA recheck score\", „bias gap demografic\", „accuracy vs SLA threshold\", „incident count Art. 73\".",
          legalReference: "EU AI Act Art. 72(3)(b) + Cap III Sec 2",
          type: "string_list",
          required: true,
        },
      ],
    },
    // ── D) Corrective + preventive action (Art. 72(3)(c)) ────────────────────
    {
      id: "D",
      title: "D. Acțiune corectivă + preventivă (Art. 72(3)(c))",
      description:
        "Cum identifici problemele + cum acționezi (corectiv = răspunde la incident, preventiv = anticipează). Necesare pentru închiderea ciclului PMM și pentru a putea raporta autorităților că ai mecanism reactiv + proactiv.",
      questions: [
        {
          id: "correctiveActionProcess",
          section: "D",
          label: "Proces de acțiune corectivă",
          helpText:
            "Descrie SOP-ul: cum se ridică alarmă, cine triază, ce praguri declanșează roll-back, cine aprobă fix-ul, cum se notifică utilizatorii afectați. Ex: „SLA accuracy < 0.85 declanșează review; ML lead aprobă roll-back la versiunea N-1 în 4h\".",
          legalReference: "EU AI Act Art. 72(3)(c)",
          type: "textarea",
          required: true,
        },
        {
          id: "preventiveActionProcess",
          section: "D",
          label: "Proces de acțiune preventivă",
          helpText:
            "Descrie monitorizarea proactivă: drift detection thresholds, retraining triggers, periodic bias audits, threat modeling. Ex: „PSI > 0.2 declanșează retrain candidat; bias audit trimestrial pe 5 grupuri demografice\".",
          legalReference: "EU AI Act Art. 72(3)(c) + Art. 72(4)",
          type: "textarea",
          required: true,
        },
      ],
    },
    // ── E) Baseline + acoperire lifetime (Art. 72(2)) ────────────────────────
    {
      id: "E",
      title: "E. Confirmare baseline + acoperire lifetime",
      description:
        "Art. 72(2) cere ca planul să acopere DURATA VIEȚII sistemului — nu doar primele luni. Confirmă explicit că planul rămâne în vigoare cât timp sistemul este în producție.",
      questions: [
        {
          id: "notes",
          section: "E",
          label: "Note suplimentare (opțional)",
          helpText:
            "Orice context suplimentar relevant pentru auditor: dependențe upstream, vendor model provider, perioade fără monitoring acceptate (ex: weekend), exception handling.",
          legalReference: "EU AI Act Annex IV pct. 10",
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
export function getPmmSchemaSectionOrder(): PmmSchemaSectionId[] {
  return PMM_SCHEMA_V1.sections.map((s) => s.id)
}
