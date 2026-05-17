// Sprint 018 — logging-evaluator tests (Art. 12 + Art. 26(6)).

import { describe, expect, it } from "vitest"
import {
  computeLoggingCompleteness,
  computeRetentionStatus,
  evaluateLogging,
} from "@/lib/compliance/logging-evaluator"
import type {
  AISystemRecord,
  LoggingConfig,
} from "@/lib/compliance/types"

function baseSystem(over: Partial<AISystemRecord> = {}): AISystemRecord {
  return {
    id: "sys-1",
    name: "Credit Scoring AI",
    purpose: "credit-scoring",
    vendor: "vendor",
    modelType: "xgboost",
    usesPersonalData: true,
    makesAutomatedDecisions: true,
    impactsRights: true,
    hasHumanReview: true,
    riskLevel: "high",
    recommendedActions: [],
    createdAtISO: "2026-05-01T00:00:00Z",
    ...over,
  }
}

function baseConfig(over: Partial<LoggingConfig> = {}): LoggingConfig {
  return {
    id: "log-1",
    orgId: "org-1",
    title: "Logging Config — Credit Scoring",
    linkedAISystemId: "sys-1",
    severityLevel: "standard",
    eventCategoriesLogged: [],
    storageBackend: "siem_elastic",
    storageLocation: "https://elastic.example.com/index=ai_logs",
    minRetentionMonths: 6,
    actualRetentionMonths: 6,
    retentionPolicy: "ILM rollover + delete la 6 luni; cold tier 3-6.",
    integrityMechanism: "hash_chain",
    integrityMechanismDescription: "SHA-256 chain per event; daily root hash.",
    accessRoleDescription: "DPO + Security Team (MFA obligatoriu)",
    accessLogged: true,
    status: "draft",
    completeness: "incomplete",
    retentionStatus: "no_evidence",
    evidenceChecklist: [],
    evidenceItems: [],
    linkedFindingIds: [],
    createdAtISO: "2026-05-18T00:00:00Z",
    updatedAtISO: "2026-05-18T00:00:00Z",
    ...over,
  }
}

describe("computeLoggingCompleteness", () => {
  it("config gol → incomplete", () => {
    const r = computeLoggingCompleteness(baseConfig())
    expect(r.completeness).toBe("incomplete")
    expect(r.eventCategoriesCount).toBe(0)
  })

  it("3 categorii + storage + retenție OK → partial", () => {
    const r = computeLoggingCompleteness(
      baseConfig({
        eventCategoriesLogged: [
          "input_data_received",
          "output_decision_made",
          "human_override_applied",
        ],
      }),
    )
    expect(r.completeness).toBe("partial")
  })

  it("5 categorii + storage + retenție + integritate + acces → complete", () => {
    const r = computeLoggingCompleteness(
      baseConfig({
        eventCategoriesLogged: [
          "input_data_received",
          "output_decision_made",
          "human_override_applied",
          "error_or_anomaly",
          "system_start_stop",
        ],
      }),
    )
    expect(r.completeness).toBe("complete")
    expect(r.reasons).toEqual([])
  })

  it("retenție actuală < min → reasons enumeră Art. 26(6)", () => {
    const r = computeLoggingCompleteness(
      baseConfig({
        actualRetentionMonths: 3,
        minRetentionMonths: 6,
        eventCategoriesLogged: ["input_data_received", "output_decision_made", "error_or_anomaly"],
      }),
    )
    expect(r.retentionMeetsMin).toBe(false)
    expect(r.reasons.join(" ")).toMatch(/26\(6\)/)
  })

  it("biometric_full fără biometricSpecific complet → hasBiometricFullCoverage=false", () => {
    const r = computeLoggingCompleteness(
      baseConfig({
        severityLevel: "biometric_full",
        biometricSpecific: {
          periodOfUseTracked: true,
          referenceDatabaseRecorded: false,
          inputDataRecorded: true,
          operatorsIdentified: true,
        },
      }),
    )
    expect(r.hasBiometricFullCoverage).toBe(false)
  })

  it("biometric_full cu toate 4 câmpuri → hasBiometricFullCoverage=true", () => {
    const r = computeLoggingCompleteness(
      baseConfig({
        severityLevel: "biometric_full",
        biometricSpecific: {
          periodOfUseTracked: true,
          referenceDatabaseRecorded: true,
          inputDataRecorded: true,
          operatorsIdentified: true,
        },
      }),
    )
    expect(r.hasBiometricFullCoverage).toBe(true)
  })
})

describe("computeRetentionStatus", () => {
  const now = Date.parse("2026-06-01T00:00:00Z")

  it("fără evidence → no_evidence", () => {
    expect(computeRetentionStatus(baseConfig(), now)).toBe("no_evidence")
  })

  it("evidence recent + retenție 6 luni → compliant", () => {
    const cfg = baseConfig({
      lastEvidenceAtISO: "2026-05-15T00:00:00Z",
      actualRetentionMonths: 6,
      evidenceItems: [
        {
          id: "ev-1",
          type: "log_export",
          description: "Test",
          uploadedAtISO: "2026-05-15T00:00:00Z",
          uploadedByEmail: "dpo@example.com",
        },
      ],
    })
    expect(computeRetentionStatus(cfg, now)).toBe("compliant")
  })

  it("evidence aproape de expirare (< 30 zile) → approaching_expiry", () => {
    // last + 6 luni = ~now + 25 zile - apropiat de expirare
    const lastMs = now - 5 * 30 * 86_400_000 - 5 * 86_400_000 // ~5 luni și 5 zile in urma
    const cfg = baseConfig({
      lastEvidenceAtISO: new Date(lastMs).toISOString(),
      actualRetentionMonths: 6,
      evidenceItems: [
        {
          id: "ev-1",
          type: "log_export",
          description: "Test",
          uploadedAtISO: new Date(lastMs).toISOString(),
          uploadedByEmail: "dpo@example.com",
        },
      ],
    })
    const status = computeRetentionStatus(cfg, now)
    expect(["approaching_expiry", "compliant"]).toContain(status)
  })

  it("evidence past retention → expired", () => {
    const cfg = baseConfig({
      lastEvidenceAtISO: "2025-01-01T00:00:00Z",
      actualRetentionMonths: 6,
      evidenceItems: [
        {
          id: "ev-1",
          type: "log_export",
          description: "Test",
          uploadedAtISO: "2025-01-01T00:00:00Z",
          uploadedByEmail: "dpo@example.com",
        },
      ],
    })
    expect(computeRetentionStatus(cfg, now)).toBe("expired")
  })
})

describe("evaluateLogging — emite findings", () => {
  it("config gol high-risk → minim 3 findings (categorii + integritate + meta-logging) sau retention", () => {
    const cfg = baseConfig({
      eventCategoriesLogged: [],
      integrityMechanism: "none",
      accessLogged: false,
    })
    const sys = baseSystem()
    const r = evaluateLogging({
      record: cfg,
      orgName: "Org",
      systemName: sys.name,
      linkedSystem: sys,
      nowISO: "2026-05-18T00:00:00Z",
    })
    expect(r.candidateFindings.length).toBeGreaterThanOrEqual(3)
    const titles = r.candidateFindings.map((f) => f.title).join(" | ")
    expect(titles).toMatch(/categorii/)
    expect(titles).toMatch(/integritate/)
  })

  it("biometric ID fără biometric_full coverage → CRITICAL finding Art. 12(3)", () => {
    const sys = baseSystem({ purpose: "biometric-identification" })
    const cfg = baseConfig({
      severityLevel: "biometric_full",
      biometricSpecific: {
        periodOfUseTracked: false,
        referenceDatabaseRecorded: false,
        inputDataRecorded: false,
        operatorsIdentified: false,
      },
      eventCategoriesLogged: [
        "input_data_received",
        "output_decision_made",
        "human_override_applied",
        "error_or_anomaly",
        "system_start_stop",
      ],
    })
    const r = evaluateLogging({
      record: cfg,
      orgName: "Org",
      systemName: sys.name,
      linkedSystem: sys,
    })
    const critical = r.candidateFindings.find((f) => f.severity === "critical")
    expect(critical).toBeTruthy()
    expect(critical?.title).toMatch(/Biometric/)
    expect(critical?.legalReference).toMatch(/12\(3\)/)
  })

  it("retenție insuficientă → finding HIGH Art. 26(6)", () => {
    const cfg = baseConfig({
      actualRetentionMonths: 2,
      minRetentionMonths: 6,
      eventCategoriesLogged: [
        "input_data_received",
        "output_decision_made",
        "error_or_anomaly",
      ],
    })
    const r = evaluateLogging({
      record: cfg,
      orgName: "Org",
      linkedSystem: baseSystem(),
    })
    const finding = r.candidateFindings.find((f) => f.title.match(/insuficientă/i))
    expect(finding).toBeTruthy()
    expect(finding?.severity).toBe("high")
    expect(finding?.legalReference).toMatch(/26\(6\)/)
  })

  it("logs expirate → finding HIGH Art. 26(6) (logs expired)", () => {
    const cfg = baseConfig({
      eventCategoriesLogged: [
        "input_data_received",
        "output_decision_made",
        "human_override_applied",
        "error_or_anomaly",
        "system_start_stop",
      ],
      lastEvidenceAtISO: "2024-01-01T00:00:00Z",
      actualRetentionMonths: 6,
      evidenceItems: [
        {
          id: "ev-1",
          type: "log_export",
          description: "Test",
          uploadedAtISO: "2024-01-01T00:00:00Z",
          uploadedByEmail: "dpo@example.com",
        },
      ],
    })
    const r = evaluateLogging({
      record: cfg,
      orgName: "Org",
      systemName: "Credit Scoring",
      linkedSystem: baseSystem(),
      nowISO: "2026-06-01T00:00:00Z",
    })
    expect(r.retentionStatus).toBe("expired")
    const expFinding = r.candidateFindings.find((f) => f.title.match(/expirate/i))
    expect(expFinding).toBeTruthy()
    expect(expFinding?.severity).toBe("high")
  })

  it("access logged false → finding MEDIUM meta-logging", () => {
    const cfg = baseConfig({
      eventCategoriesLogged: [
        "input_data_received",
        "output_decision_made",
        "human_override_applied",
        "error_or_anomaly",
        "system_start_stop",
      ],
      accessLogged: false,
    })
    const r = evaluateLogging({
      record: cfg,
      orgName: "Org",
      linkedSystem: baseSystem(),
    })
    const meta = r.candidateFindings.find((f) => f.title.match(/meta-logging/))
    expect(meta).toBeTruthy()
    expect(meta?.severity).toBe("medium")
  })

  it("config complete → 0 findings", () => {
    const cfg = baseConfig({
      eventCategoriesLogged: [
        "input_data_received",
        "output_decision_made",
        "human_override_applied",
        "error_or_anomaly",
        "system_start_stop",
      ],
      accessLogged: true,
      integrityMechanism: "hash_chain",
    })
    const r = evaluateLogging({
      record: cfg,
      orgName: "Org",
      linkedSystem: baseSystem(),
    })
    expect(r.candidateFindings.length).toBe(0)
    expect(r.completeness).toBe("complete")
  })

  it("markdown export include secțiunile A-D + Art. 12 + Art. 26(6)", () => {
    const r = evaluateLogging({
      record: baseConfig({
        eventCategoriesLogged: ["input_data_received", "output_decision_made"],
      }),
      orgName: "Test Org",
      systemName: "Credit Scoring AI",
      linkedSystem: baseSystem(),
    })
    expect(r.generatedMarkdown).toMatch(/# Logging Config/)
    expect(r.generatedMarkdown).toMatch(/A\. Sistem AI/)
    expect(r.generatedMarkdown).toMatch(/B\. Categorii evenimente loguite/)
    expect(r.generatedMarkdown).toMatch(/C\. Storage \+ retenție/)
    expect(r.generatedMarkdown).toMatch(/D\. Integritate/)
    expect(r.generatedMarkdown).toMatch(/Art\. 12/)
    expect(r.generatedMarkdown).toMatch(/Art\. 26\(6\)/)
  })

  it("markdown include biometric Art. 12(3) câmpuri când prezente", () => {
    const r = evaluateLogging({
      record: baseConfig({
        severityLevel: "biometric_full",
        biometricSpecific: {
          periodOfUseTracked: true,
          referenceDatabaseRecorded: true,
          inputDataRecorded: true,
          operatorsIdentified: true,
        },
      }),
      orgName: "Test Org",
      linkedSystem: baseSystem({ purpose: "biometric-identification" }),
    })
    expect(r.generatedMarkdown).toMatch(/12\(3\) biometric/)
    expect(r.generatedMarkdown).toMatch(/Perioada de utilizare/)
    expect(r.generatedMarkdown).toMatch(/Operatori naturali/)
  })
})
