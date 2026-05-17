// Logging Evidence Schema V1 — Sprint 018 (BUILD NEW per EU AI Act Art. 12 + Art. 26(6)).
//
// 4 secțiuni × ~10 întrebări care operaționalizează obligația deployer-ului
// unui sistem AI high-risk de a configura logging automat de evenimente, cu
// retenție minimă, mecanism de integritate și control acces.
//
// Secțiuni:
//   A) Sistem AI + nivel severitate logging — Art. 12(1) + Art. 6
//   B) Categorii evenimente loguite — Art. 12(2) + Art. 12(3) biometric
//   C) Storage + retenție — Art. 26(6) minim 6 luni + opțional extins
//   D) Integritate + control acces — tamper-evidence + meta-logging
//
// Schema NU emite findings (asta face `logging-evaluator.ts`). Aici definim
// doar structura întrebărilor + helpText + referință legală per Q.

import type {
  LoggingEventCategory,
  LoggingSeverityLevel,
  LoggingStorageBackend,
} from "@/lib/compliance/types"

export type LoggingQuestionType =
  | "select"
  | "multiselect"
  | "boolean"
  | "text"
  | "textarea"
  | "number"
  | "biometric_specifics"
  | "checklist"

export type LoggingSchemaSectionId = "A" | "B" | "C" | "D"

export type LoggingQuestion = {
  id: string
  section: LoggingSchemaSectionId
  label: string
  helpText: string
  /** Referință EU AI Act care fundamentează întrebarea. */
  legalReference: string
  type: LoggingQuestionType
  options?: string[]
  required: boolean
  /** Pentru multiselect pe categorii evenimente Art. 12. */
  eventCategoryOptions?: LoggingEventCategory[]
}

export type LoggingSchemaSection = {
  id: LoggingSchemaSectionId
  title: string
  description: string
  questions: LoggingQuestion[]
}

export type LoggingSchema = {
  id: string
  version: "2026.05.ro.v1"
  jurisdiction: "RO/EU"
  legalBasis: string[]
  sections: LoggingSchemaSection[]
}

// ────────────────────────────────────────────────────────────────────────────
//   Liste de referință (folosite în UI pentru render)
// ────────────────────────────────────────────────────────────────────────────

export const LOGGING_SEVERITY_LEVEL_OPTIONS: LoggingSeverityLevel[] = [
  "minimal",
  "standard",
  "enhanced",
  "biometric_full",
]

export const LOGGING_SEVERITY_LEVEL_LABELS: Record<LoggingSeverityLevel, string> = {
  minimal: "Minimal — log-uri de bază (start/stop, erori). Recomandat pentru limited/minimal risk",
  standard: "Standard — input + output + override. Cerut pentru high-risk (Art. 12(1))",
  enhanced: "Enhanced — standard + drift + monitorizare model. Cerut pentru decizii cu impact (Art. 12(2))",
  biometric_full: "Biometric Full — Art. 12(3) integral: perioadă + bază date + input + operatori",
}

export const LOGGING_SEVERITY_LEVEL_DESCRIPTIONS: Record<LoggingSeverityLevel, string> = {
  minimal:
    "Suficient pentru sisteme cu risc redus: pornire/oprire sistem, erori critice, autentificare utilizatori. NU îndeplinește cerințele Art. 12 pentru high-risk.",
  standard:
    "Pentru sisteme high-risk standard: input data primite, output/decizii emise, override-uri umane aplicate. Acoperă Art. 12(1) + (2).",
  enhanced:
    "Standard + monitorizare model (drift, anomalii, actualizări versiune). Necesar pentru deciziile care impactează drepturi/sănătate/finanțe.",
  biometric_full:
    "Art. 12(3) integral pentru Annex III pt. 1(a): perioadă utilizare (start/end), baza de date verificată, input data folosit, identificarea operatorilor naturali implicați.",
}

export const LOGGING_STORAGE_BACKEND_OPTIONS: LoggingStorageBackend[] = [
  "local_files",
  "siem_splunk",
  "siem_elastic",
  "siem_datadog",
  "cloud_aws_cloudwatch",
  "cloud_azure_monitor",
  "cloud_gcp_logging",
  "supabase",
  "other",
]

export const LOGGING_STORAGE_BACKEND_LABELS: Record<LoggingStorageBackend, string> = {
  local_files: "Fișiere locale (server propriu)",
  siem_splunk: "SIEM — Splunk",
  siem_elastic: "SIEM — Elastic (ELK)",
  siem_datadog: "SIEM — Datadog",
  cloud_aws_cloudwatch: "Cloud — AWS CloudWatch",
  cloud_azure_monitor: "Cloud — Azure Monitor",
  cloud_gcp_logging: "Cloud — GCP Cloud Logging",
  supabase: "Supabase (logs + storage)",
  other: "Alt backend (descris)",
}

/**
 * Cele 13 categorii Art. 12(2)/(3) ordonate pentru render UI.
 */
export const LOGGING_EVENT_CATEGORIES_ORDERED: LoggingEventCategory[] = [
  "input_data_received",
  "output_decision_made",
  "human_override_applied",
  "human_review_completed",
  "stop_button_pressed",
  "model_updated",
  "data_drift_detected",
  "error_or_anomaly",
  "user_authentication",
  "biometric_match_attempt",
  "biometric_match_result",
  "system_start_stop",
  "other",
]

export const LOGGING_EVENT_CATEGORY_LABELS: Record<LoggingEventCategory, string> = {
  input_data_received: "Input data primit de sistem (Art. 12(2))",
  output_decision_made: "Output / decizie emisă de sistem (Art. 12(2))",
  human_override_applied: "Override uman aplicat (Art. 12(2) + Art. 14)",
  human_review_completed: "Review uman finalizat (Art. 12(2) + Art. 14)",
  stop_button_pressed: "Buton stop activat (Art. 14(3)(e))",
  model_updated: "Model actualizat / re-antrenat (Art. 12(2) modificare substanțială)",
  data_drift_detected: "Drift de date detectat (Art. 12(2) + Art. 72)",
  error_or_anomaly: "Eroare / anomalie operațională (Art. 12(2) + Art. 79(1))",
  user_authentication: "Autentificare utilizatori (acces sistem)",
  biometric_match_attempt: "Încercare match biometric — Art. 12(3) Annex III 1(a)",
  biometric_match_result: "Rezultat match biometric — Art. 12(3) Annex III 1(a)",
  system_start_stop: "Pornire / oprire sistem",
  other: "Alt eveniment (descris în notes)",
}

export const LOGGING_EVENT_CATEGORY_HELP: Record<LoggingEventCategory, string> = {
  input_data_received:
    "Fiecare cerere recepționată: timestamp, sursă, payload (hash sau redacted pentru PII), context. Cerut Art. 12(2) pentru reconstrucția situațiilor de risc.",
  output_decision_made:
    "Fiecare decizie/output: timestamp, scor/probabilitate, label, confidence interval. Necesar pentru audit + revizuire ulterioară.",
  human_override_applied:
    "Când operator anulează/inversează output AI: cine, când, motivul, decizia alternativă. Cerut Art. 12(2) + Art. 14(3)(d).",
  human_review_completed:
    "Când decizia AI a fost validată de un uman: cine, când, ce a verificat, concluzia. Pentru HITL.",
  stop_button_pressed:
    "Când butonul stop a fost activat: cine, când, contextul, fallback-ul declanșat. Art. 14(3)(e).",
  model_updated:
    "Modificare substanțială Art. 12(2): versiune nouă, dataset retrain, hyperparameters schimbate. Trebuie loguită cu diff.",
  data_drift_detected:
    "Când distribuția input/output deviază de la training baseline: timestamp, metric, prag depășit. Art. 72 post-market monitoring.",
  error_or_anomaly:
    "Erori sistem (timeouts, exceptions) + anomalii (output neașteptat, edge cases). Cerut pentru Art. 79(1) reporting.",
  user_authentication:
    "Login / logout operatori sistem AI + acces date senzitive. Pentru audit access.",
  biometric_match_attempt:
    "Art. 12(3)(c): input data verificate (template biometric, query) + Art. 12(3)(a) periodul (start). OBLIGATORIU Annex III 1(a).",
  biometric_match_result:
    "Art. 12(3)(b): baza de date de referință consultată + Art. 12(3)(d) operatori implicați. OBLIGATORIU Annex III 1(a).",
  system_start_stop:
    "Sistemul pornit/oprit: timestamp, cine. Important pentru calcul perioadă utilizare Art. 12(3)(a).",
  other:
    "Alt eveniment specific contextului (descris în notes config).",
}

export const LOGGING_INTEGRITY_MECHANISM_OPTIONS = [
  "hash_chain",
  "writeonce",
  "signed_writes",
  "external_audit",
  "none",
] as const

export const LOGGING_INTEGRITY_MECHANISM_LABELS: Record<
  typeof LOGGING_INTEGRITY_MECHANISM_OPTIONS[number],
  string
> = {
  hash_chain: "Hash chain (SHA-256 chained per event)",
  writeonce: "Write-once storage (WORM, S3 Object Lock, etc.)",
  signed_writes: "Signed writes (HMAC/asymmetric per event)",
  external_audit: "Audit extern periodic (3rd party hash verification)",
  none: "Niciun mecanism (NU îndeplinește Art. 12)",
}

/**
 * Default minRetentionMonths per severityLevel. Folosit la create config.
 * Art. 26(6) minim 6; ridicat la 12 pentru biometric + decizii cu impact
 * (overlay GDPR + Convenția 108 pentru date sensibile).
 */
export const DEFAULT_MIN_RETENTION_MONTHS_BY_SEVERITY: Record<LoggingSeverityLevel, number> = {
  minimal: 3,
  standard: 6,
  enhanced: 12,
  biometric_full: 12,
}

// ────────────────────────────────────────────────────────────────────────────
//   Schema V1 — 4 secțiuni × ~10 întrebări
// ────────────────────────────────────────────────────────────────────────────

export const LOGGING_SCHEMA_V1: LoggingSchema = {
  id: "compliroai-logging-art-12",
  version: "2026.05.ro.v1",
  jurisdiction: "RO/EU",
  legalBasis: [
    "Regulament (UE) 2024/1689 Art. 12(1) — automatic recording of events (logs)",
    "Regulament (UE) 2024/1689 Art. 12(2) — logs enable Art. 79(1) risk identification + Art. 72 monitoring + Art. 14 oversight",
    "Regulament (UE) 2024/1689 Art. 12(3) — biometric ID min: period of use, reference DB, input data, operators",
    "Regulament (UE) 2024/1689 Art. 26(6) — deployer keeps logs ≥ 6 luni (sau mai mult per drepturi/GDPR)",
  ],
  sections: [
    // ── A) Sistem AI + nivel severitate logging ──────────────────────────────
    {
      id: "A",
      title: "A. Sistem AI + nivel severitate logging",
      description:
        "Selectează sistemul AI vizat + nivelul de severitate al logging-ului. Severitatea trebuie proporțională cu riscul Annex III + impactul asupra drepturilor (Art. 12(1)).",
      questions: [
        {
          id: "title",
          section: "A",
          label: "Titlul configurării de logging",
          helpText:
            "Ex: „Logging Config — HR Screening AI\", „Config logging — chatbot suport clienți\".",
          legalReference: "EU AI Act Art. 12(1)",
          type: "text",
          required: true,
        },
        {
          id: "linkedAISystemId",
          section: "A",
          label: "Sistemul AI vizat",
          helpText:
            "Selectează sistemul AI din Inventar. Config Art. 12 este OBLIGATORIU pentru high-risk; recomandat pentru limited risk.",
          legalReference: "EU AI Act Art. 12(1) + Art. 6",
          type: "select",
          required: true,
        },
        {
          id: "severityLevel",
          section: "A",
          label: "Nivel severitate logging",
          helpText:
            "minimal = log-uri de bază; standard = Art. 12(1) high-risk; enhanced = standard + drift + model updates; biometric_full = Art. 12(3) integral Annex III 1(a).",
          legalReference: "EU AI Act Art. 12(1) + Art. 12(3)",
          type: "select",
          options: LOGGING_SEVERITY_LEVEL_OPTIONS,
          required: true,
        },
      ],
    },
    // ── B) Categorii evenimente loguite ──────────────────────────────────────
    {
      id: "B",
      title: "B. Categorii evenimente loguite (Art. 12(2)/(3))",
      description:
        "Bifează categoriile de evenimente loguite efectiv de sistem. Minim 5 categorii pentru config complet standard; pentru biometric_full obligatoriu și biometric_match_attempt + biometric_match_result.",
      questions: [
        {
          id: "eventCategoriesLogged",
          section: "B",
          label: "Categorii loguite",
          helpText:
            "Selectează doar pe cele LOGUITE efectiv (cu dovadă în SIEM/storage). Art. 12(2) cere identificarea situațiilor de risc Art. 79(1) + modificări substanțiale + Art. 72 + Art. 14.",
          legalReference: "EU AI Act Art. 12(2) + Art. 12(3)",
          type: "multiselect",
          eventCategoryOptions: LOGGING_EVENT_CATEGORIES_ORDERED,
          required: true,
        },
        {
          id: "biometricSpecific",
          section: "B",
          label: "Câmpuri Art. 12(3) biometric ID (Annex III 1(a))",
          helpText:
            "Pentru biometric_full obligatoriu toate 4: (a) perioadă utilizare; (b) bază date referință; (c) input data; (d) operatori naturali identificați. Apare condiționat când severityLevel = biometric_full.",
          legalReference: "EU AI Act Art. 12(3)",
          type: "biometric_specifics",
          required: false,
        },
      ],
    },
    // ── C) Storage + retenție (Art. 26(6)) ───────────────────────────────────
    {
      id: "C",
      title: "C. Storage + retenție (Art. 26(6))",
      description:
        "Unde sunt stocate logs + cât timp. Art. 26(6) impune minim 6 luni; mai mult dacă drepturile fundamentale / GDPR / dreptul EU/național o cer.",
      questions: [
        {
          id: "storageBackend",
          section: "C",
          label: "Backend storage",
          helpText:
            "Selectează din SIEM (Splunk/Elastic/Datadog), cloud-native (CloudWatch/Azure Monitor/GCP Logging), local files sau Supabase. „Other\" — descrie în storageLocation.",
          legalReference: "EU AI Act Art. 12(1)",
          type: "select",
          options: LOGGING_STORAGE_BACKEND_OPTIONS,
          required: true,
        },
        {
          id: "storageLocation",
          section: "C",
          label: "Locație storage (URL / bucket / path)",
          helpText:
            "Ex: „https://splunk.example.com/index=ai_logs\", „s3://logs-prod/ai-act/\", „/var/log/ai-system/\". Folosit pentru audit + verificare.",
          legalReference: "EU AI Act Art. 12(1)",
          type: "text",
          required: true,
        },
        {
          id: "minRetentionMonths",
          section: "C",
          label: "Retenție minimă cerută (luni)",
          helpText:
            "Art. 26(6) minim 6 luni. Sistem biometric / decizii cu impact: minim 12 luni (GDPR + Convenția 108). Reglementare sectorială poate cere mai mult.",
          legalReference: "EU AI Act Art. 26(6)",
          type: "number",
          required: true,
        },
        {
          id: "actualRetentionMonths",
          section: "C",
          label: "Retenția actuală configurată (luni)",
          helpText:
            "Cât timp sunt păstrate efectiv logs în backend (TTL, lifecycle rules, retention policy). Trebuie >= minRetentionMonths.",
          legalReference: "EU AI Act Art. 26(6)",
          type: "number",
          required: true,
        },
        {
          id: "retentionPolicy",
          section: "C",
          label: "Politica de retenție (narativ)",
          helpText:
            "Descrie cum este implementată retenția: TTL automatic, S3 lifecycle rules, manual purge, archive la cold storage etc. Inclusiv cum se gestionează cererile DSAR ștergere.",
          legalReference: "EU AI Act Art. 26(6) + GDPR Art. 17",
          type: "textarea",
          required: true,
        },
      ],
    },
    // ── D) Integritate + control acces ───────────────────────────────────────
    {
      id: "D",
      title: "D. Integritate + control acces",
      description:
        "Cum se asigură că logs nu pot fi modificate retroactiv (tamper-evidence) și cine are acces. Acces la logs trebuie să fie el însuși logat (meta-logging).",
      questions: [
        {
          id: "integrityMechanism",
          section: "D",
          label: "Mecanism integritate logs",
          helpText:
            "hash_chain (SHA-256 chained per event), writeonce (WORM, S3 Object Lock), signed_writes (HMAC/asymmetric), external_audit (3rd party periodic), none (NU îndeplinește Art. 12).",
          legalReference: "EU AI Act Art. 12(1)",
          type: "select",
          options: [...LOGGING_INTEGRITY_MECHANISM_OPTIONS],
          required: true,
        },
        {
          id: "integrityMechanismDescription",
          section: "D",
          label: "Descriere mecanism integritate",
          helpText:
            "Ex: „SHA-256 chain per event line; root hash semnat zilnic + arhivat în S3 Object Lock 7 ani\". Important pentru auditor să înțeleagă cum se demonstrează lipsa de tampering.",
          legalReference: "EU AI Act Art. 12(1)",
          type: "textarea",
          required: false,
        },
        {
          id: "accessRoleDescription",
          section: "D",
          label: "Roluri cu acces la logs",
          helpText:
            "Cine poate citi logs: ex „DPO + Security Team + Admin Cloud (read-only, MFA obligatoriu)\". Principle of least privilege.",
          legalReference: "EU AI Act Art. 12(1) + ISO 27001 A.9",
          type: "textarea",
          required: true,
        },
        {
          id: "accessLogged",
          section: "D",
          label: "Accesul la logs este el însuși logat (meta-logging)",
          helpText:
            "Pentru audit complet, fiecare citire/export de logs trebuie loguită: cine, când, ce query. Recomandat pentru protejare împotriva insider threat.",
          legalReference: "EU AI Act Art. 12(1) bonne pratique",
          type: "boolean",
          required: true,
        },
        {
          id: "evidenceChecklist",
          section: "D",
          label: "Checklist evidență pentru audit",
          helpText:
            "Listă liberă de items pe care le vei colecta ca dovadă: export SIEM, screenshot retention policy, raport audit integritate, log de acces la logs etc. Un item pe linie.",
          legalReference: "EU AI Act Art. 12 + Art. 26",
          type: "checklist",
          required: false,
        },
      ],
    },
  ],
}

/**
 * Helpers pentru evaluator + store.
 */
export function getAllLoggingQuestions(): LoggingQuestion[] {
  return LOGGING_SCHEMA_V1.sections.flatMap((section) => section.questions)
}

export function getLoggingQuestionById(id: string): LoggingQuestion | undefined {
  return getAllLoggingQuestions().find((q) => q.id === id)
}

export function getLoggingSectionById(
  id: LoggingSchemaSectionId,
): LoggingSchemaSection | undefined {
  return LOGGING_SCHEMA_V1.sections.find((s) => s.id === id)
}
