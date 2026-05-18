import { describe, expect, it } from "vitest"

import {
  generateAuthorityFollowUp,
  generateAuthorityNotification,
} from "./ai-incident-narrative"
import type { AIIncident } from "@/lib/compliance/types"

const DAY_MS = 86_400_000

function sampleIncident(overrides: Partial<AIIncident> = {}): AIIncident {
  const detectedAt = "2026-05-01T10:00:00.000Z"
  return {
    id: "ai-inc-narr-1",
    orgId: "org-test",
    title: "Diagnostic AI eronat — caz Pacient X",
    description:
      "Sistemul de diagnostic asistat AI a returnat un diagnostic eronat pentru cazul pacient X, ducând la întârzierea tratamentului corect. Detectat la review medical secundar.",
    category: "death_or_serious_harm_health",
    severity: "catastrophic",
    linkedAISystemId: "sys-diag-1",
    affectedSubjectsCategories: ["pacienți spital municipal"],
    affectedSubjectsCount: 1,
    detectedAtISO: detectedAt,
    reportingDeadlineISO: new Date(
      new Date(detectedAt).getTime() + 2 * DAY_MS,
    ).toISOString(),
    reportingDeadlineDays: 2,
    notifications: [],
    notificationRequired: true,
    linkedFindingIds: [],
    status: "notification_required",
    assignedToEmail: "dpo@acme.ro",
    createdAtISO: detectedAt,
    updatedAtISO: detectedAt,
    ...overrides,
  }
}

describe("generateAuthorityNotification — Art. 73(5)", () => {
  it("includes header + organization + Art. 73 framing", () => {
    const md = generateAuthorityNotification(
      sampleIncident(),
      "ACME Spital SRL",
      "Diagnostic AI Spital",
    )
    expect(md).toContain("# Notificare incident serios — sistem AI high-risk")
    expect(md).toContain("EU AI Act Art. 73")
    expect(md).toContain("ACME Spital SRL")
    expect(md).toContain("Diagnostic AI Spital")
  })

  it("references the 9 required sections per Art. 73(5)", () => {
    const md = generateAuthorityNotification(sampleIncident(), "ACME")
    expect(md).toContain("## 1. Natura incidentului")
    expect(md).toContain("## 2. Sistemul AI implicat")
    expect(md).toContain("## 3. Cronologie")
    expect(md).toContain("## 4. Părți afectate")
    expect(md).toContain("## 5. Împrejurări detaliate")
    expect(md).toContain("## 6. Măsuri provizorii aplicate")
    expect(md).toContain("## 7. Plan investigare cauză rădăcină")
    expect(md).toContain("## 8. Date de contact responsabil")
    expect(md).toContain("## 9. Anexe + dovezi disponibile la cerere")
  })

  it("includes the deadline label with days remaining or expired", () => {
    const incidentWithExpiredDeadline = sampleIncident({
      detectedAtISO: new Date(Date.now() - 5 * DAY_MS).toISOString(),
      reportingDeadlineISO: new Date(Date.now() - 3 * DAY_MS).toISOString(),
    })
    const md = generateAuthorityNotification(
      incidentWithExpiredDeadline,
      "ACME",
    )
    expect(md).toContain("termenul a fost depășit")
  })

  it("includes affected subjects bullet list", () => {
    const md = generateAuthorityNotification(
      sampleIncident({
        affectedSubjectsCategories: ["clienți A", "clienți B", "angajați"],
      }),
      "ACME",
    )
    expect(md).toContain("- clienți A")
    expect(md).toContain("- clienți B")
    expect(md).toContain("- angajați")
  })

  it("includes 'necompletat' fallback for missing fields", () => {
    const md = generateAuthorityNotification(
      sampleIncident({
        affectedSubjectsCategories: [],
        description: "",
      }),
      "",
    )
    expect(md).toContain("_de completat_")
    expect(md).toContain("necompletat")
  })

  it("displays linkedPmmAnomalyId in section 5 when set", () => {
    const md = generateAuthorityNotification(
      sampleIncident({
        linkedPmmAnomalyId: "pmm-ano-xyz-123",
      }),
      "ACME",
    )
    expect(md).toContain("anomalii PMM")
    expect(md).toContain("pmm-ano-xyz-123")
  })

  it("displays linkedBreachId in section 5 when set (GDPR parallel)", () => {
    const md = generateAuthorityNotification(
      sampleIncident({
        linkedBreachId: "breach-personal-data-99",
      }),
      "ACME",
    )
    expect(md).toContain("date personale")
    expect(md).toContain("Art. 33 GDPR")
    expect(md).toContain("breach-personal-data-99")
  })

  it("emits placeholder when rootCause is missing (will be sent as follow-up)", () => {
    const md = generateAuthorityNotification(sampleIncident(), "ACME")
    expect(md).toContain("Investigația root cause va fi finalizată")
    expect(md).toContain("Art. 73(7)")
  })

  it("includes rootCause when provided", () => {
    const md = generateAuthorityNotification(
      sampleIncident({
        rootCause: {
          identifiedAtISO: "2026-05-05T00:00:00.000Z",
          identifiedByEmail: "ml-lead@acme.ro",
          rootCauseDescription:
            "Model retrained on synthetic data missing edge cases.",
          contributingFactors: [
            "dataset training insuficient",
            "lipsă bias audit lunar",
          ],
          evidenceCollected: ["bias audit report Q1", "log model versioning"],
          remediationActions: [
            "rollback model la v1.0",
            "retrain cu dataset extins",
          ],
          preventionActions: ["bias audit lunar", "human-in-the-loop critical cases"],
        },
      }),
      "ACME",
    )
    expect(md).toContain("Model retrained on synthetic data")
    expect(md).toContain("- dataset training insuficient")
    expect(md).toContain("- rollback model la v1.0")
    expect(md).toContain("- bias audit lunar")
  })

  it("references the contact person from assignedToEmail", () => {
    const md = generateAuthorityNotification(sampleIncident(), "ACME")
    expect(md).toContain("dpo@acme.ro")
  })

  it("references the last authority notification ref when present", () => {
    const md = generateAuthorityNotification(
      sampleIncident({
        notifications: [
          {
            id: "n1",
            authorityName: "Market Surveillance Authority RO",
            status: "submitted",
            submittedAtISO: "2026-05-02T08:00:00.000Z",
            referenceNumber: "MSA-RO-2026-0014",
          },
        ],
      }),
      "ACME",
    )
    expect(md).toContain("Market Surveillance Authority RO")
    expect(md).toContain("MSA-RO-2026-0014")
  })

  it("disclaimer present (operațional, not legal opinion)", () => {
    const md = generateAuthorityNotification(sampleIncident(), "ACME")
    expect(md).toContain(
      "Document operațional generat de CompliRoAI conform Art. 73(5)",
    )
  })
})

describe("generateAuthorityFollowUp — Art. 73(7)", () => {
  it("includes Art. 73(7) reference + reference to initial notification", () => {
    const md = generateAuthorityFollowUp(
      sampleIncident({
        notifications: [
          {
            id: "n1",
            authorityName: "MSA-RO",
            status: "submitted",
            submittedAtISO: "2026-05-02T00:00:00.000Z",
            referenceNumber: "MSA-001",
          },
        ],
      }),
      "ACME",
      "Investigația a relevat o cauză suplimentară: bias în datele de inferență.",
    )
    expect(md).toContain("Art. 73(7)")
    expect(md).toContain("MSA-001")
    expect(md).toContain("MSA-RO")
  })

  it("includes the supplied updateDescription verbatim", () => {
    const md = generateAuthorityFollowUp(
      sampleIncident(),
      "ACME",
      "Actualizare: am identificat un al doilea caz pacient afectat.",
    )
    expect(md).toContain("Actualizare: am identificat un al doilea caz pacient afectat.")
  })

  it("emits 'în curs' placeholder when rootCause is still missing", () => {
    const md = generateAuthorityFollowUp(
      sampleIncident(),
      "ACME",
      "Update X",
    )
    expect(md).toContain("Investigația este în curs")
  })
})
