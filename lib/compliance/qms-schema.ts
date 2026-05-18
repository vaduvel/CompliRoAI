// QMS Schema V1 — Sprint 021 (Art. 17 EU AI Act umbrella module).
//
// 13 secțiuni mapate 1:1 pe Art. 17(1)(a)-(m), fiecare cu:
//   - displayLabel RO + helpText complet (description)
//   - articleRef (referință legală exactă)
//   - requiredFields listă (ce trebuie să conțină secțiunea pentru audit-clean)
//   - suggestedDocuments listă (tipuri de documente de atașat la secțiune)
//   - essentialOrAdvanced classification pentru Art. 17(3) SME simplified mode
//   - crossModuleLinks (modulele CompliRoAI care auto-populate counts)
//
// Schema NU emite findings — asta face `qms-evaluator.ts`. Aici doar definim
// structura + copy + classification.
//
// IMPORTANT: ordinea secțiunilor = ordinea Art. 17(1)(a)-(m) — NU rearanja.

import type { QmsSectionKey } from "@/lib/compliance/types"

export type QmsSectionTier = "essential" | "advanced"

/**
 * Sub-module CompliRoAI care auto-populate cross-module reference counts pentru
 * o secțiune QMS. Folosit de evaluator + de UI "Cross-module health" tab.
 */
export type QmsCrossModule =
  | "ropa"
  | "ai_data_map"
  | "dpia"
  | "fria"
  | "findings"
  | "pmm"
  | "ai_incidents"
  | "logging_evidence"

export type QmsSchemaSection = {
  /** Cheia stabilă (Art. 17(1)(a)-(m)). */
  key: QmsSectionKey
  /** Litera (a)-(m) pentru afișare. */
  letter: "a" | "b" | "c" | "d" | "e" | "f" | "g" | "h" | "i" | "j" | "k" | "l" | "m"
  /** Titlu scurt RO. */
  displayLabel: string
  /** Help text complet (1-3 paragrafe, narativ). */
  description: string
  /** Referință legală exactă (ex: "EU AI Act Art. 17(1)(a)"). */
  articleRef: string
  /** Câmpuri obligatorii pentru audit-clean (description + procedure + role + ≥1 doc). */
  requiredFields: Array<"description" | "procedureSummary" | "responsibleRole" | "documentReferences">
  /** Tipuri sugerate de documente de atașat. */
  suggestedDocuments: string[]
  /**
   * Tier per Art. 17(2)/(3):
   *   - essential = obligatoriu pentru SME (simplified mode)
   *   - advanced  = opțional pentru SME, obligatoriu pentru midsize/large
   */
  tier: QmsSectionTier
  /** Module CompliRoAI care contribuie cu auto-populated reference counts. */
  crossModuleLinks: QmsCrossModule[]
}

export type QmsSchema = {
  id: string
  version: "2026.05.ro.v1"
  jurisdiction: "RO/EU"
  legalBasis: string[]
  sections: QmsSchemaSection[]
}

// ────────────────────────────────────────────────────────────────────────────
//   Labels & catalogues
// ────────────────────────────────────────────────────────────────────────────

export const QMS_SECTION_LABELS: Record<QmsSectionKey, string> = {
  a_regulatory_compliance_strategy:
    "(a) Strategie regulatory compliance + conformity assessment + management modificări",
  b_design_control_verification:
    "(b) Tehnici + proceduri proiectare + control + verificare proiectare",
  c_development_quality_assurance:
    "(c) Tehnici + proceduri dezvoltare + quality control + quality assurance",
  d_examination_test_validation:
    "(d) Proceduri examinare, test, validare (pre + post dezvoltare) + frecvență",
  e_technical_specifications_standards:
    "(e) Specificații tehnice + standarde armonizate aplicate",
  f_data_management_systems:
    "(f) Sisteme + proceduri management date (colectare, etichetare, stocare, retenție)",
  g_risk_management_system:
    "(g) Sistem management riscuri (Art. 9 AI Act)",
  h_post_market_monitoring:
    "(h) Setup + implementare + maintenance Post-Market Monitoring (Art. 72)",
  i_serious_incident_reporting:
    "(i) Proceduri raportare incidente serioase (Art. 73)",
  j_communication_with_authorities:
    "(j) Comunicare cu autorități, notified bodies, clienți, public",
  k_record_keeping:
    "(k) Sisteme + proceduri record-keeping a tuturor documentelor",
  l_resource_management_security:
    "(l) Resource management + security-of-supply",
  m_accountability_framework:
    "(m) Accountability framework (responsabilități management + staff)",
}

export const QMS_SECTION_STATUS_LABELS = {
  not_started: "Neînceput",
  in_progress: "În lucru",
  documented: "Documentat",
  approved: "Aprobat",
  needs_update: "Necesită update",
} as const

export const QMS_DOCUMENT_TYPE_LABELS = {
  policy: "Politică",
  procedure: "Procedură",
  standard: "Standard",
  specification: "Specificație tehnică",
  template: "Șablon",
  report: "Raport",
  audit_record: "Înregistrare audit",
  other: "Altul",
} as const

export const QMS_WORKSPACE_STATUS_LABELS = {
  draft: "Schiță",
  in_review: "În revizuire",
  approved: "Aprobat",
  obsolete: "Obsolet (înlocuit)",
} as const

export const QMS_ORGANIZATION_SIZE_LABELS = {
  sme: "IMM (Art. 17(3) eligibil simplified mode)",
  midsize: "Mid-size (10-49 angajați)",
  large: "Large (50+ angajați)",
} as const

export const QMS_COMPLETENESS_LABELS = {
  incomplete: "Incomplet",
  partial: "Parțial",
  complete: "Complet",
} as const

export const QMS_LESSON_SOURCE_LABELS = {
  ai_incident: "Incident AI (Art. 73)",
  pmm_anomaly: "Anomalie PMM (Art. 72)",
  finding: "Finding compliance",
  manual: "Lecție manuală",
} as const

// ────────────────────────────────────────────────────────────────────────────
//   Schema V1 — 13 secțiuni Art. 17(1)(a)-(m)
// ────────────────────────────────────────────────────────────────────────────

export const QMS_SCHEMA_V1: QmsSchema = {
  id: "compliroai-qms-art-17",
  version: "2026.05.ro.v1",
  jurisdiction: "RO/EU",
  legalBasis: [
    "Regulament (UE) 2024/1689 Art. 17(1) — providerii stabilesc QMS în formă scrisă (elementele (a)-(m))",
    "Regulament (UE) 2024/1689 Art. 17(2) — implementare proporțională cu dimensiunea providerului",
    "Regulament (UE) 2024/1689 Art. 17(3) — SME-urile pot folosi documentație QMS simplificată",
    "Regulament (UE) 2024/1689 Art. 16(c) — providerii păstrează documentație QMS conform Art. 18",
    "Regulament (UE) 2024/1689 Annex IV — QMS este inspectabil pentru conformity assessment",
    "Regulament (UE) 2024/1689 Art. 9 — Risk Management System (referenced by 17(1)(g))",
    "Regulament (UE) 2024/1689 Art. 72 — Post-Market Monitoring (referenced by 17(1)(h))",
    "Regulament (UE) 2024/1689 Art. 73 — Serious Incident Reporting (referenced by 17(1)(i))",
    "Regulament (UE) 2024/1689 Art. 99 — sancțiuni (până la 35M EUR / 7% turnover) pentru nerespectarea Art. 16-17",
  ],
  sections: [
    // ── (a) Regulatory compliance strategy ──────────────────────────────────
    {
      key: "a_regulatory_compliance_strategy",
      letter: "a",
      displayLabel: "Strategie regulatory compliance",
      description:
        "Strategie scrisă pentru conformitatea reglementară a sistemelor AI high-risk introduse pe piață sau utilizate. Include proceduri pentru conformity assessment (Art. 43 + Annex VI/VII) și management al modificărilor (Art. 43(4) — substantial modification triggers re-evaluare). Strategia trebuie să fie aprobată la nivel de management și să specifice rolul DPO + responsabil AI + Quality Manager. Această secțiune este fundația întregului QMS și este OBLIGATORIE pentru toate dimensiunile organizaționale (inclusiv SME).",
      articleRef: "EU AI Act Art. 17(1)(a)",
      requiredFields: ["description", "procedureSummary", "responsibleRole", "documentReferences"],
      suggestedDocuments: [
        "Politică conformitate AI Act (semnată de management)",
        "Procedură conformity assessment per Art. 43",
        "Procedură management modificări substantial (Art. 43(4))",
        "Matrice roluri AI compliance (DPO, responsabil AI, Quality Manager)",
      ],
      tier: "essential",
      crossModuleLinks: [],
    },
    // ── (b) Design control + verification ──────────────────────────────────
    {
      key: "b_design_control_verification",
      letter: "b",
      displayLabel: "Design + control proiectare + verificare",
      description:
        "Tehnici, proceduri și specificații pentru proiectarea sistemelor AI: design control (review-uri pre-implementation), design verification (testare contra specificații), design history file. Acest pas operaționalizează cerința Art. 17(1)(b) care cere documentație formală a procesului de proiectare — de la cerințe la specificații tehnice + arhitectură + decizii model. SME poate folosi versiune simplificată (1 design review per release).",
      articleRef: "EU AI Act Art. 17(1)(b)",
      requiredFields: ["description", "procedureSummary", "responsibleRole", "documentReferences"],
      suggestedDocuments: [
        "Procedură design control (templates review)",
        "Design history file template",
        "Procedură design verification (acceptance criteria)",
        "Architecture decision records (ADRs) policy",
      ],
      tier: "essential",
      crossModuleLinks: [],
    },
    // ── (c) Development + QA ────────────────────────────────────────────────
    {
      key: "c_development_quality_assurance",
      letter: "c",
      displayLabel: "Dezvoltare + quality control + quality assurance",
      description:
        "Tehnici, proceduri și specificații pentru dezvoltarea sistemelor AI: code review, unit testing, integration testing, model evaluation, QA gates pre-release. Specifică responsabili, instrumente CI/CD, criterii de acceptare per stadiu (dev, staging, production). Pentru SME: 1 QA reviewer + 1 release sign-off OK. Pentru midsize/large: separate QA team + automated test coverage requirements (typically >80%).",
      articleRef: "EU AI Act Art. 17(1)(c)",
      requiredFields: ["description", "procedureSummary", "responsibleRole", "documentReferences"],
      suggestedDocuments: [
        "Procedură code review",
        "Procedură QA gates (dev → staging → production)",
        "Procedură model evaluation pre-release",
        "Release sign-off template",
      ],
      tier: "advanced",
      crossModuleLinks: [],
    },
    // ── (d) Examination, test, validation ───────────────────────────────────
    {
      key: "d_examination_test_validation",
      letter: "d",
      displayLabel: "Examinare, test, validare (pre + post) + frecvență",
      description:
        "Proceduri pentru examinare, testare și validare a sistemului AI înainte de plasarea pe piață (Art. 17(1)(d) + Art. 8-15) ȘI după (continuous validation per Art. 72). Specifică tipurile de teste (functional, bias, robustness, adversarial), seturile de date de test, criteriile de pass/fail și frecvența reluării testelor (ex: la fiecare release, lunar pentru bias drift, anual pentru complete revalidation).",
      articleRef: "EU AI Act Art. 17(1)(d) + Art. 8-15 + Art. 72",
      requiredFields: ["description", "procedureSummary", "responsibleRole", "documentReferences"],
      suggestedDocuments: [
        "Plan validare pre-release (functional + bias + robustness)",
        "Plan validare continuă (frecvență per metric)",
        "Test sets policy (data partitioning + freshness)",
        "Acceptance criteria template (pass/fail thresholds)",
      ],
      tier: "essential",
      crossModuleLinks: [],
    },
    // ── (e) Technical specifications + standards ────────────────────────────
    {
      key: "e_technical_specifications_standards",
      letter: "e",
      displayLabel: "Specificații tehnice + standarde aplicate",
      description:
        "Listă completă a standardelor armonizate și specificațiilor comune aplicate sistemelor AI (când există). Standardele armonizate emise sub Art. 40 oferă prezumție de conformitate cu cerințele AI Act. Includ: ISO/IEC 42001 (AI Management System), ISO/IEC 23894 (AI Risk Management), CEN-CENELEC JTC 21 outputs. Pentru moment (2026), majoritatea standardelor sunt în lucru — documentați specificațiile interne folosite în absența standardelor oficiale.",
      articleRef: "EU AI Act Art. 17(1)(e) + Art. 40 + Art. 41",
      requiredFields: ["description", "procedureSummary", "responsibleRole", "documentReferences"],
      suggestedDocuments: [
        "Listă standarde aplicate (ISO 42001, ISO 23894 etc.)",
        "Specificații tehnice interne (model performance, data quality)",
        "Justificare standarde NEaplicate (gap analysis)",
      ],
      tier: "advanced",
      crossModuleLinks: [],
    },
    // ── (f) Data management ─────────────────────────────────────────────────
    {
      key: "f_data_management_systems",
      letter: "f",
      displayLabel: "Sisteme + proceduri management date",
      description:
        "Proceduri operaționale pentru data management — colectare, analiză, etichetare, stocare, filtrare, mining, agregare, retenție — atât ÎNAINTE de plasarea pe piață (training data) cât și DURANTE (operational data, user inputs, feedback). Această secțiune este auto-populated cu numărul de înregistrări RoPA (Sprint 008C) și AI Data Map (Sprint 009) care documentează detaliat fiecare flux de date. Integrare cu GDPR Art. 30 (RoPA) este obligatorie.",
      articleRef: "EU AI Act Art. 17(1)(f) + Art. 10 + GDPR Art. 30",
      requiredFields: ["description", "procedureSummary", "responsibleRole", "documentReferences"],
      suggestedDocuments: [
        "Politică data governance",
        "Procedură data labeling + quality control",
        "Procedură data retention + deletion",
        "RoPA + AI Data Map (auto-linked în CompliRoAI)",
      ],
      tier: "essential",
      crossModuleLinks: ["ropa", "ai_data_map"],
    },
    // ── (g) Risk management ─────────────────────────────────────────────────
    {
      key: "g_risk_management_system",
      letter: "g",
      displayLabel: "Sistem management riscuri (Art. 9)",
      description:
        "Sistemul de management al riscurilor cerut de Art. 9 AI Act — proces continuu, iterativ, pe întreaga viață a sistemului AI. Include identificare + estimare + evaluare riscuri + măsuri mitigation + risk acceptance. Auto-populated cu numărul de DPIA (Sprint 008C — GDPR Art. 35 risc privacy), FRIA (Sprint 016 — Art. 27 risc fundamental rights) și findings deschise (Sprint 008B). O secțiune (g) audit-clean cere ≥1 DPIA + (pentru deployers high-risk eligibili) ≥1 FRIA.",
      articleRef: "EU AI Act Art. 17(1)(g) + Art. 9 + Art. 27 + GDPR Art. 35",
      requiredFields: ["description", "procedureSummary", "responsibleRole", "documentReferences"],
      suggestedDocuments: [
        "Politică risk management AI",
        "Procedură risk assessment iterativ",
        "Risk register (cu mitigation tracking)",
        "DPIA + FRIA + findings open (auto-linked)",
      ],
      tier: "essential",
      crossModuleLinks: ["dpia", "fria", "findings"],
    },
    // ── (h) PMM ─────────────────────────────────────────────────────────────
    {
      key: "h_post_market_monitoring",
      letter: "h",
      displayLabel: "Post-Market Monitoring (Art. 72)",
      description:
        "Setup, implementare și maintenance ale sistemului de Post-Market Monitoring per Art. 72. Această secțiune este auto-populated cu numărul de planuri PMM (Sprint 019) per sistem AI high-risk. PMM colectează date despre performanță pe durata vieții sistemului, evaluează continua conformitate cu Cap III Sec 2 (Art. 72(3)(b)) și definește acțiunea corectivă/preventivă (Art. 72(3)(c)). Pentru orice sistem AI high-risk plasat pe piață, un plan PMM este OBLIGATORIU.",
      articleRef: "EU AI Act Art. 17(1)(h) + Art. 72",
      requiredFields: ["description", "procedureSummary", "responsibleRole", "documentReferences"],
      suggestedDocuments: [
        "Politică PMM (cycle, escalation, responsabili)",
        "Template plan PMM per sistem",
        "PMM plans existente (auto-linked)",
      ],
      tier: "essential",
      crossModuleLinks: ["pmm"],
    },
    // ── (i) Incident reporting ──────────────────────────────────────────────
    {
      key: "i_serious_incident_reporting",
      letter: "i",
      displayLabel: "Raportare incidente serioase (Art. 73)",
      description:
        "Procedurile pentru raportarea incidentelor serioase per Art. 73 AI Act (distinct de GDPR Art. 33). Include criterii de evaluare (Art. 3(49) definiția serious incident), termene 2/10/15 zile (Art. 73(3)), template notificare autoritate de supraveghere a pieței, investigație root cause (Art. 73(4)). Auto-populated cu numărul de incidente AI înregistrate (Sprint 020). Procedurile trebuie testate prin tabletop exercise anual.",
      articleRef: "EU AI Act Art. 17(1)(i) + Art. 73 + Art. 3(49)",
      requiredFields: ["description", "procedureSummary", "responsibleRole", "documentReferences"],
      suggestedDocuments: [
        "Procedură escalation serious incident",
        "Template notificare autoritate Art. 73",
        "Procedură root cause investigation",
        "AI Incidents existente (auto-linked)",
      ],
      tier: "essential",
      crossModuleLinks: ["ai_incidents"],
    },
    // ── (j) Communication ───────────────────────────────────────────────────
    {
      key: "j_communication_with_authorities",
      letter: "j",
      displayLabel: "Comunicare cu autorități, NB, clienți, public",
      description:
        "Proceduri pentru gestionarea comunicării cu: (1) autorități naționale competente (în RO: ADR coordonează AI; ANCOM/ASF/ANSPDCP sectorial), (2) notified bodies (când conformity assessment necesită terț), (3) deployer customers (Art. 13 — informații + instrucțiuni de utilizare), (4) alți operatori (importer, distributor, downstream provider), (5) public (Art. 4 AI literacy, transparență Art. 50). Specifică responsabilii, canalele oficiale și SLA-uri răspuns.",
      articleRef: "EU AI Act Art. 17(1)(j) + Art. 13 + Art. 16(g) + Art. 50",
      requiredFields: ["description", "procedureSummary", "responsibleRole", "documentReferences"],
      suggestedDocuments: [
        "Procedură comunicare cu autorități",
        "Procedură comunicare cu notified bodies",
        "Customer support policy (deployer interactions)",
        "Public communications policy (transparency notices)",
      ],
      tier: "advanced",
      crossModuleLinks: [],
    },
    // ── (k) Record-keeping ──────────────────────────────────────────────────
    {
      key: "k_record_keeping",
      letter: "k",
      displayLabel: "Record-keeping a tuturor documentelor",
      description:
        "Sisteme și proceduri pentru record-keeping a tuturor documentelor relevante: technical documentation Art. 11 + Annex IV, declaration of conformity, certificate emis de NB, log-uri (Art. 12), comunicări cu autorități. Retenție minimă 10 ani de la plasarea pe piață (Art. 18). Auto-populated cu numărul de configurări Logging Evidence (Sprint 018 — Art. 12 logs) și disponibilitatea Audit Pack (Sprint 011 — bundle integrat cu hash chain). Mediu de stocare: write-once, tamper-evident, controlat acces.",
      articleRef: "EU AI Act Art. 17(1)(k) + Art. 12 + Art. 18 + Annex IV",
      requiredFields: ["description", "procedureSummary", "responsibleRole", "documentReferences"],
      suggestedDocuments: [
        "Politică record-keeping (10 ani retenție)",
        "Procedură backup + restore",
        "Procedură access control (write-once enforcement)",
        "Logging Evidence configs (auto-linked)",
      ],
      tier: "essential",
      crossModuleLinks: ["logging_evidence"],
    },
    // ── (l) Resource management ─────────────────────────────────────────────
    {
      key: "l_resource_management_security",
      letter: "l",
      displayLabel: "Resource management + security-of-supply",
      description:
        "Resource management — alocare oameni + buget + infrastructură pentru menținerea AI Act compliance. Security-of-supply — supplier-i critici pentru sistemul AI (compute, model providers, data providers) cu plan continuitate, exit strategy, monitoring SLA. Această secțiune intersectează cu Vendor AI Assessment (Sprint 010). Pentru SME: identifică top 3 suplier critici + plan B. Pentru midsize/large: matrice completă + tabletop exercises supply disruption.",
      articleRef: "EU AI Act Art. 17(1)(l)",
      requiredFields: ["description", "procedureSummary", "responsibleRole", "documentReferences"],
      suggestedDocuments: [
        "Resource allocation plan (AI compliance budget)",
        "Critical suppliers list + SLA monitoring",
        "Business continuity plan (supplier disruption)",
        "Vendor reviews (auto-cross-referenced)",
      ],
      tier: "advanced",
      crossModuleLinks: [],
    },
    // ── (m) Accountability ──────────────────────────────────────────────────
    {
      key: "m_accountability_framework",
      letter: "m",
      displayLabel: "Accountability framework (management + staff)",
      description:
        "Framework de responsabilitate care definește clar rolurile + responsabilitățile + autoritatea managementului și staff-ului în privința QMS. RACI matrix per fiecare secțiune Art. 17. Top management approval. Comunicare către toți angajații. Training (link Art. 4 — AI literacy). Pentru SME: 1 pagină RACI + semnătură CEO/Director. Pentru midsize/large: full org chart cu chain of command + escalation paths + delegation of authority documents.",
      articleRef: "EU AI Act Art. 17(1)(m) + Art. 4",
      requiredFields: ["description", "procedureSummary", "responsibleRole", "documentReferences"],
      suggestedDocuments: [
        "RACI matrix AI Act compliance",
        "Top management approval letter QMS",
        "Job descriptions roluri cheie (DPO, Quality Manager, responsabil AI)",
        "Procedură delegation of authority",
      ],
      tier: "essential",
      crossModuleLinks: [],
    },
  ],
}

// ────────────────────────────────────────────────────────────────────────────
//   Helpers
// ────────────────────────────────────────────────────────────────────────────

/**
 * Returnează lista de chei secțiuni în ordinea Art. 17(1)(a)-(m).
 */
export function getQmsSectionKeysInOrder(): QmsSectionKey[] {
  return QMS_SCHEMA_V1.sections.map((s) => s.key)
}

/**
 * Lookup secțiune după cheie.
 */
export function getQmsSchemaSection(
  key: QmsSectionKey,
): QmsSchemaSection | undefined {
  return QMS_SCHEMA_V1.sections.find((s) => s.key === key)
}

/**
 * Returnează secțiunile esențiale (obligatorii pentru SME simplified mode).
 */
export function getEssentialQmsSections(): QmsSchemaSection[] {
  return QMS_SCHEMA_V1.sections.filter((s) => s.tier === "essential")
}

/**
 * Returnează secțiunile advanced (opționale pentru SME, obligatorii pentru
 * midsize/large per Art. 17(2) proporționalitate).
 */
export function getAdvancedQmsSections(): QmsSchemaSection[] {
  return QMS_SCHEMA_V1.sections.filter((s) => s.tier === "advanced")
}

/**
 * Returnează secțiunile care au cross-module references către un modul anume.
 * Folosit de evaluator pentru auto-populate counts și de UI pentru
 * cross-module health tab.
 */
export function getQmsSectionsForCrossModule(
  module: QmsCrossModule,
): QmsSchemaSection[] {
  return QMS_SCHEMA_V1.sections.filter((s) =>
    s.crossModuleLinks.includes(module),
  )
}
