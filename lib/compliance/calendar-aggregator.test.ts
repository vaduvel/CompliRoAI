/**
 * Sprint 013 — Tests pentru calendar-aggregator.
 *
 * Pure function — testat fără mock-uri de filesystem/contex.
 */

import { describe, expect, it } from "vitest"
import {
  AI_ACT_FIXED_DATES,
  aggregateCalendarEvents,
  buildICal,
} from "@/lib/compliance/calendar-aggregator"
import type {
  ApprovalRequest,
  BreachRecord,
  DpiaRecord,
  DsarRequest,
  RopaActivityRecord,
  TrustCenterToken,
  VendorRecord,
} from "@/lib/compliance/types"

const FIXED_NOW = "2026-05-17T12:00:00.000Z"

function makeDsar(overrides: Partial<DsarRequest> = {}): DsarRequest {
  return {
    id: overrides.id ?? "dsar-1",
    orgId: "org",
    receivedAtISO: "2026-05-01T00:00:00.000Z",
    deadlineISO: "2026-05-31T00:00:00.000Z",
    requesterName: "Ion Popescu",
    requesterEmail: "ion@example.com",
    requestType: "access",
    status: "in_progress",
    identityVerified: true,
    draftResponseGenerated: false,
    responseReviewedByHuman: false,
    evidenceVaultIds: [],
    createdAtISO: "2026-05-01T00:00:00.000Z",
    updatedAtISO: "2026-05-01T00:00:00.000Z",
    ...overrides,
  }
}

function makeDpia(overrides: Partial<DpiaRecord> = {}): DpiaRecord {
  return {
    id: overrides.id ?? "dpia-1",
    title: "HR screening",
    processingPurpose: "Selecție CV",
    processingDescription: "",
    dataCategories: [],
    dataSubjects: [],
    legalBasis: "Art. 6(1)(b)",
    specialCategories: false,
    automatedDecisionMaking: true,
    largeScaleProcessing: false,
    necessityAssessment: "ok",
    proportionalityAssessment: "ok",
    risks: [],
    mitigationMeasures: [],
    residualRisk: "low",
    status: "in_review",
    owner: "dpo",
    createdAtISO: "2026-05-01T00:00:00.000Z",
    updatedAtISO: "2026-05-01T00:00:00.000Z",
    ...overrides,
  }
}

function makeRopa(overrides: Partial<RopaActivityRecord> = {}): RopaActivityRecord {
  return {
    id: overrides.id ?? "ropa-1",
    activityName: "CRM customers",
    purpose: "Gestionare clienți B2B",
    dataSubjects: ["clienți"],
    dataCategories: ["contact"],
    specialCategories: [],
    legalBasis: "contract",
    recipients: [],
    processors: [],
    systems: [],
    thirdCountryTransfers: [],
    securityMeasures: [],
    source: "manual",
    confidence: "dpo_confirmed",
    status: "validated",
    linkedFindings: [],
    linkedEvidence: [],
    createdAtISO: "2026-05-01T00:00:00.000Z",
    updatedAtISO: "2026-05-01T00:00:00.000Z",
    lastReviewedAtISO: "2026-05-01T00:00:00.000Z",
    ...overrides,
  }
}

function makeBreach(overrides: Partial<BreachRecord> = {}): BreachRecord {
  return {
    id: overrides.id ?? "br-1",
    orgId: "org",
    title: "Pierdere laptop",
    description: "",
    cause: "lost_device",
    discoveredAtISO: "2026-05-15T00:00:00.000Z",
    deadlineISO: "2026-05-18T00:00:00.000Z",
    severity: "high",
    dataCategories: ["identification"],
    affectedSubjectsCategories: ["angajați"],
    affectedSystems: ["laptop"],
    likelyConsequences: "risc identitate",
    highRiskToRights: true,
    containmentMeasures: [],
    preventionMeasures: [],
    anspdcpNotificationRequired: true,
    subjectNotificationRequired: true,
    status: "anspdcp_required",
    evidenceVaultIds: [],
    createdAtISO: "2026-05-15T00:00:00.000Z",
    updatedAtISO: "2026-05-15T00:00:00.000Z",
    ...overrides,
  }
}

function makeVendor(overrides: Partial<VendorRecord> = {}): VendorRecord {
  return {
    id: overrides.id ?? "v-1",
    orgId: "org",
    name: "OpenAI",
    productUsed: "ChatGPT",
    vendorRegion: "US",
    role: "processor",
    serviceCategory: "AI/LLM",
    linkedAISystemIds: [],
    linkedAIDataMapIds: [],
    dpaStatus: "signed",
    transferRequired: true,
    transferMechanism: "scc_controller_processor",
    subprocessorsList: [],
    securityEvidence: {
      iso27001: true,
      soc2: true,
      penTestRecent: true,
      encryptionInTransit: true,
      encryptionAtRest: true,
      mfaEnforced: true,
      auditLogsAvailable: true,
    },
    aiTerms: {
      trainingDataOptOut: "yes",
      inputDataRetention: "no_retention",
      outputRightsOwnership: "client",
      modelTransparency: "documented",
      reproducibilityGuarantees: false,
    },
    riskLevel: "medium",
    riskReasons: [],
    reviewStatus: "approved",
    humanReviewRequired: false,
    linkedFindingIds: [],
    createdAtISO: "2026-05-01T00:00:00.000Z",
    updatedAtISO: "2026-05-01T00:00:00.000Z",
    nextRevalidationISO: "2026-08-01T00:00:00.000Z",
    ...overrides,
  }
}

function makeApproval(overrides: Partial<ApprovalRequest> = {}): ApprovalRequest {
  return {
    id: overrides.id ?? "apr-1",
    orgId: "org",
    entityType: "finding_status_change",
    entityId: "f-1",
    title: "Aprobă închidere finding",
    description: "",
    proposedChange: {},
    requestedByEmail: "client@example.com",
    requestedByRole: "client",
    requestedAtISO: "2026-05-10T00:00:00.000Z",
    status: "pending",
    expiresAtISO: "2026-05-24T00:00:00.000Z",
    createdAtISO: "2026-05-10T00:00:00.000Z",
    updatedAtISO: "2026-05-10T00:00:00.000Z",
    ...overrides,
  }
}

function makeTrustToken(overrides: Partial<TrustCenterToken> = {}): TrustCenterToken {
  return {
    id: overrides.id ?? "tt-1",
    orgId: "org",
    token: "abc.def",
    label: "Pentru client X",
    createdByEmail: "consultant@example.com",
    createdAtISO: "2026-05-01T00:00:00.000Z",
    expiresAtISO: "2026-06-01T00:00:00.000Z",
    viewCount: 0,
    ...overrides,
  }
}

describe("calendar-aggregator", () => {
  it("emits DSAR deadline event cu severity warning pentru deadline > 14 zile", () => {
    const events = aggregateCalendarEvents(
      { dsarRequests: [makeDsar()] },
      { nowISO: FIXED_NOW },
    )
    expect(events.length).toBeGreaterThanOrEqual(1)
    const dsar = events.find((e) => e.module === "dsar")
    expect(dsar).toBeTruthy()
    expect(dsar?.dateISO).toBe("2026-05-31T00:00:00.000Z")
    expect(dsar?.severity).toBe("warning")
    expect(dsar?.status).toBe("upcoming")
    expect(dsar?.allDay).toBe(true)
  })

  it("escalează la urgent dacă DSAR deadline e <5 zile", () => {
    const events = aggregateCalendarEvents(
      { dsarRequests: [makeDsar({ deadlineISO: "2026-05-19T00:00:00.000Z" })] },
      { nowISO: FIXED_NOW },
    )
    const dsar = events.find((e) => e.module === "dsar")
    expect(dsar?.severity).toBe("urgent")
  })

  it("DSAR completat (responded) → severity info + status completed", () => {
    const events = aggregateCalendarEvents(
      { dsarRequests: [makeDsar({ status: "responded" })] },
      { nowISO: FIXED_NOW },
    )
    const dsar = events.find((e) => e.module === "dsar")
    expect(dsar?.severity).toBe("info")
    expect(dsar?.status).toBe("completed")
  })

  it("DPIA cu dueAtISO → emit dpia event; aprobat → emit revalidate +90z", () => {
    const events = aggregateCalendarEvents(
      {
        dpiaRecords: [
          makeDpia({ id: "d-1", dueAtISO: "2026-06-01T00:00:00.000Z" }),
          makeDpia({
            id: "d-2",
            status: "completed",
            approvedAtISO: "2026-05-01T00:00:00.000Z",
          }),
        ],
      },
      { nowISO: FIXED_NOW },
    )
    const due = events.find((e) => e.id === "dpia-d-1-due")
    const rev = events.find((e) => e.id === "dpia-d-2-revalidate")
    expect(due).toBeTruthy()
    expect(rev).toBeTruthy()
    expect(rev?.recurring?.interval).toBe("quarterly")
  })

  it("RoPA emit revalidare anuală cu recurring yearly", () => {
    const events = aggregateCalendarEvents(
      { ropaActivities: [makeRopa()] },
      { nowISO: FIXED_NOW },
    )
    const rev = events.find((e) => e.module === "ropa")
    expect(rev?.dateISO).toBe("2027-05-01T00:00:00.000Z")
    expect(rev?.recurring?.interval).toBe("yearly")
  })

  it("Breach 72h cu deadline foarte aproape → severity critical + allDay false", () => {
    const events = aggregateCalendarEvents(
      { breachRecords: [makeBreach()] },
      { nowISO: FIXED_NOW },
    )
    const ev = events.find((e) => e.module === "breach")
    expect(ev?.allDay).toBe(false)
    // deadline ~ 16 mai → +1 zi în viitor de la now (17 mai) → critical
    expect(["critical", "urgent"]).toContain(ev?.severity)
  })

  it("Breach închis → severity info", () => {
    const events = aggregateCalendarEvents(
      { breachRecords: [makeBreach({ status: "closed" })] },
      { nowISO: FIXED_NOW },
    )
    const ev = events.find((e) => e.module === "breach")
    expect(ev?.severity).toBe("info")
    expect(ev?.status).toBe("completed")
  })

  it("Vendor revalidate + DPA expire → 2 evenimente", () => {
    const events = aggregateCalendarEvents(
      {
        vendorRecords: [
          makeVendor({ dpaExpiresAtISO: "2026-07-01T00:00:00.000Z" }),
        ],
      },
      { nowISO: FIXED_NOW },
    )
    const revalidate = events.find((e) => e.id === "vendor-v-1-revalidate")
    const expire = events.find((e) => e.id === "vendor-v-1-dpa-expire")
    expect(revalidate).toBeTruthy()
    expect(expire).toBeTruthy()
  })

  it("AI Act fixed dates apar mereu (chiar pe state gol)", () => {
    const events = aggregateCalendarEvents({}, { nowISO: FIXED_NOW })
    // Art. 50 transparency = 2 dec 2026 — non-archived
    const art50 = events.find((e) => e.id === "ai-act-ai-act-art-50-transparency")
    expect(art50).toBeTruthy()
    expect(art50?.severity).toBe("urgent")
    // Anexa III = 2 aug 2027
    const annex3 = events.find((e) => e.id === "ai-act-ai-act-high-risk-annex-iii")
    expect(annex3?.severity).toBe("critical")
    // Art. 5 prohibited deja trecut → status completed + severity info
    const art5 = events.find((e) => e.id === "ai-act-ai-act-art-5-prohibited")
    expect(art5?.status).toBe("completed")
    expect(art5?.severity).toBe("info")
  })

  it("Approval expiry doar pentru status pending", () => {
    const events = aggregateCalendarEvents(
      {
        approvalRequests: [
          makeApproval(),
          makeApproval({ id: "apr-2", status: "approved" }),
        ],
      },
      { nowISO: FIXED_NOW },
    )
    const approvalEvents = events.filter((e) => e.module === "approval")
    expect(approvalEvents.length).toBe(1)
    expect(approvalEvents[0].entityId).toBe("apr-1")
  })

  it("Trust Center token expiry intră în calendar; revoked se omite", () => {
    const events = aggregateCalendarEvents(
      {
        trustCenterTokens: [
          makeTrustToken(),
          makeTrustToken({ id: "tt-2", revokedAtISO: "2026-05-10T00:00:00.000Z" }),
        ],
      },
      { nowISO: FIXED_NOW },
    )
    const tEvents = events.filter((e) => e.module === "trust_center")
    expect(tEvents.length).toBe(1)
    expect(tEvents[0].entityId).toBe("tt-1")
  })

  it("filter modules + from/to corectly limitează rezultatele", () => {
    const events = aggregateCalendarEvents(
      {
        dsarRequests: [makeDsar()],
        breachRecords: [makeBreach()],
      },
      { nowISO: FIXED_NOW, modules: ["dsar"] },
    )
    expect(events.every((e) => e.module === "dsar")).toBe(true)
    expect(events.length).toBeGreaterThan(0)

    const windowed = aggregateCalendarEvents(
      { dsarRequests: [makeDsar()] },
      {
        nowISO: FIXED_NOW,
        fromISO: "2026-06-01T00:00:00.000Z",
        toISO: "2027-01-01T00:00:00.000Z",
      },
    )
    // DSAR deadline e 31 mai → în afara ferestrei → omis
    expect(windowed.find((e) => e.module === "dsar")).toBeUndefined()
  })

  it("AI_ACT_FIXED_DATES respectă datele oficiale 2 dec 2026 + 2 aug 2027", () => {
    const art50 = AI_ACT_FIXED_DATES.find((d) => d.id === "ai-act-art-50-transparency")
    const annex3 = AI_ACT_FIXED_DATES.find((d) => d.id === "ai-act-high-risk-annex-iii")
    expect(art50?.dateISO).toBe("2026-12-02T00:00:00.000Z")
    expect(annex3?.dateISO).toBe("2027-08-02T00:00:00.000Z")
  })

  it("buildICal generează un VCALENDAR cu DTSTART, DTEND, SUMMARY și RRULE recurring", () => {
    const events = aggregateCalendarEvents(
      {
        dsarRequests: [makeDsar()],
        ropaActivities: [makeRopa()],
      },
      { nowISO: FIXED_NOW },
    )
    const ical = buildICal(events, { calendarName: "Test", orgName: "Org X", nowISO: FIXED_NOW })
    expect(ical.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true)
    expect(ical.includes("END:VCALENDAR")).toBe(true)
    expect(ical.includes("VERSION:2.0")).toBe(true)
    expect(ical.includes("PRODID:-//CompliRoAI//Calendar//RO")).toBe(true)
    expect(ical.includes("X-WR-CALNAME:Test")).toBe(true)
    expect(ical.includes("SUMMARY:DSAR acces (Art. 15) — răspuns obligatoriu")).toBe(true)
    expect(ical.includes("RRULE:FREQ=YEARLY")).toBe(true)
    expect(ical.includes("CATEGORIES:CompliRoAI/dsar")).toBe(true)
    // Lines end in CRLF
    expect(ical.endsWith("\r\n")).toBe(true)
  })

  it("buildICal escape-uri corecte pentru virgule + punct și virgulă în SUMMARY", () => {
    const events = aggregateCalendarEvents(
      {
        approvalRequests: [
          makeApproval({
            title: "Aprobă X, Y; și Z",
          }),
        ],
      },
      { nowISO: FIXED_NOW },
    )
    const ical = buildICal(events, { nowISO: FIXED_NOW })
    // Approval module title format = "Aprobare expiră: {title}" — comma and semicolon escapate.
    expect(ical.includes("SUMMARY:Aprobare expiră: Aprobă X\\, Y\\; și Z")).toBe(true)
    // Descrierea conține entityType; nu testez newline aici, ci punct = ok netecat.
    expect(ical.includes("DESCRIPTION:Cerere finding_status_change de la client@example.com.")).toBe(true)
  })
})
