// Discovery Trigger Orchestrator — tests Sprint 008A baseline + 008C ROPA wiring.

import { describe, expect, it } from "vitest"

import {
  collectDiscoveryTriggers,
  mergeDiscoveryFindings,
  mergeDiscoveryTriggers,
  normalizeDiscoveryTriggers,
  orchestrateDiscoveryTriggers,
  type DiscoveryTriggerRecord,
} from "./discovery-trigger-orchestrator"
import type { ScanFinding } from "@/lib/compliance/types"
import { normalizeRopaActivityRecord } from "@/lib/compliance/ropa-risk-engine"

function makeTrigger(overrides: Partial<DiscoveryTriggerRecord> = {}): DiscoveryTriggerRecord {
  return {
    id: "trigger-test-1",
    source: "vendor",
    sourceId: "src-1",
    sourceLabel: "Vendor review",
    conditionLabel: "DPA missing",
    actionType: "dpa-review",
    targetModule: "vendor-review",
    severity: "high",
    ownerRole: "dpo",
    slaDays: 14,
    evidenceRequired: "DPA semnat",
    reportImpact: "audit_pack",
    findingIds: [],
    status: "candidate",
    reviewStatus: "needs_dpo_review",
    confidence: "dpo_confirmed",
    createdAtISO: "2026-05-17T08:00:00.000Z",
    updatedAtISO: "2026-05-17T08:00:00.000Z",
    ...overrides,
  }
}

describe("discovery-trigger-orchestrator (Sprint 008A subset)", () => {
  it("collectDiscoveryTriggers fără ropaActivities returnează listă goală (workshop stub)", () => {
    const triggers = collectDiscoveryTriggers({ orgId: "org-test", nowISO: "2026-05-17T08:00:00.000Z" })
    expect(triggers).toEqual([])
  })

  it("collectDiscoveryTriggers cu ropaActivities materializează trigger-uri din RoPA risc engine", () => {
    const activity = normalizeRopaActivityRecord(
      {
        id: "test-ropa",
        activityName: "Suport SUA",
        purpose: "Suport clienți",
        dataCategories: ["Email"],
        dataSubjects: ["Clienți"],
        processors: ["Zendesk"],
        thirdCountryTransfers: [{ country: "SUA" }],
        legalBasis: undefined,
        retentionRule: undefined,
      },
      "2026-05-17T08:00:00.000Z",
    )
    const triggers = collectDiscoveryTriggers({
      orgId: "org-test",
      nowISO: "2026-05-17T08:00:00.000Z",
      ropaActivities: [activity],
    })
    expect(triggers.length).toBeGreaterThan(0)
    expect(triggers.every((t) => t.source === "ropa")).toBe(true)
    // Trigger-ul de vendor review trebuie sa aiba ownerRole=dpo + slaDays
    const vendorTrigger = triggers.find((t) => t.actionType === "vendor_review")
    expect(vendorTrigger).toBeTruthy()
    expect(vendorTrigger?.ownerRole).toBe("dpo")
    expect(vendorTrigger?.slaDays).toBeGreaterThan(0)
    expect(vendorTrigger?.dueAtISO).toBeTruthy()
    // Transfer trigger trebuie sa fie present
    expect(triggers.find((t) => t.actionType === "transfer_review")).toBeTruthy()
  })

  it("collectDiscoveryTriggers cu accepted=true promotează status la accepted", () => {
    const activity = normalizeRopaActivityRecord(
      {
        id: "auto-accept",
        activityName: "Newsletter",
        dataCategories: ["Email"],
        dataSubjects: ["Abonați"],
        legalBasis: undefined,
        retentionRule: undefined,
      },
      "2026-05-17T08:00:00.000Z",
    )
    const triggers = collectDiscoveryTriggers({
      orgId: "org-test",
      nowISO: "2026-05-17T08:00:00.000Z",
      ropaActivities: [activity],
      accepted: true,
    })
    if (triggers.length > 0) {
      expect(triggers[0].status).toBe("accepted")
      expect(triggers[0].reviewStatus).toBe("accepted")
    }
  })

  it("mergeDiscoveryTriggers păstrează status completed peste re-emiteri", () => {
    const previous = makeTrigger({ id: "trigger-1", status: "completed", reviewStatus: "accepted" })
    const incoming = makeTrigger({ id: "trigger-1", status: "candidate", reviewStatus: "needs_dpo_review" })
    const result = mergeDiscoveryTriggers([previous], [incoming], "2026-05-18T08:00:00.000Z")
    expect(result).toHaveLength(1)
    expect(result[0].status).toBe("completed")
    expect(result[0].reviewStatus).toBe("accepted")
  })

  it("mergeDiscoveryTriggers promovează status candidate → accepted dacă incoming spune accepted", () => {
    const previous = makeTrigger({ id: "trigger-2", status: "candidate", reviewStatus: "needs_dpo_review" })
    const incoming = makeTrigger({ id: "trigger-2", status: "accepted", reviewStatus: "accepted" })
    const result = mergeDiscoveryTriggers([previous], [incoming])
    expect(result[0].status).toBe("accepted")
    expect(result[0].reviewStatus).toBe("accepted")
  })

  it("mergeDiscoveryTriggers promovează confidence client_claim → document_verified", () => {
    const previous = makeTrigger({ id: "trigger-3", confidence: "client_claim" })
    const incoming = makeTrigger({ id: "trigger-3", confidence: "document_verified" })
    const result = mergeDiscoveryTriggers([previous], [incoming])
    expect(result[0].confidence).toBe("document_verified")
  })

  it("normalizeDiscoveryTriggers filtrează valori invalide din JSON state vechi", () => {
    const raw = [
      { id: "valid", source: "vendor", sourceId: "s", conditionLabel: "c", targetModule: "t", evidenceRequired: "e", createdAtISO: "2026-01-01T00:00:00Z" },
      { id: "", source: "vendor" }, // missing required
      "not-an-object",
      null,
    ]
    const result = normalizeDiscoveryTriggers(raw)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe("valid")
    expect(result[0].severity).toBe("medium") // default
  })

  it("orchestrateDiscoveryTriggers raportează stats corect", () => {
    const existing = [makeTrigger({ id: "t-old", reviewStatus: "accepted", severity: "low" })]
    const incoming = [
      makeTrigger({ id: "t-new-1", severity: "critical", reviewStatus: "needs_dpo_review" }),
      makeTrigger({ id: "t-new-2", severity: "high", reviewStatus: "needs_dpo_review" }),
      makeTrigger({ id: "t-old", severity: "low", reviewStatus: "accepted" }), // duplicate
    ]
    const run = orchestrateDiscoveryTriggers({
      existingTriggers: existing,
      incomingTriggers: incoming,
      nowISO: "2026-05-17T08:00:00.000Z",
    })
    expect(run.stats.total).toBe(3)
    expect(run.stats.new).toBe(2)
    expect(run.stats.accepted).toBe(1)
    expect(run.stats.needsReview).toBe(2)
    expect(run.stats.highOrCritical).toBe(2)
    expect(run.duplicateTriggerIds).toContain("t-old")
  })

  it("mergeDiscoveryFindings păstrează status anterior la re-emiterea aceluiași finding", () => {
    const finding: ScanFinding = {
      id: "f-1",
      title: "Test",
      detail: "x",
      category: "GDPR",
      severity: "high",
      risk: "high",
      principles: ["accountability"],
      createdAtISO: "2026-05-01T08:00:00.000Z",
      sourceDocument: "test",
    }
    const previous: ScanFinding = {
      ...finding,
      findingStatus: "under_monitoring",
      reviewState: "monitoring",
    }
    const merged = mergeDiscoveryFindings([previous], [finding])
    expect(merged).toHaveLength(1)
    expect(merged[0].findingStatus).toBe("under_monitoring")
    expect(merged[0].reviewState).toBe("monitoring")
  })

  it("mergeDiscoveryFindings marchează finding-uri noi ca confirmed default", () => {
    const finding: ScanFinding = {
      id: "f-2",
      title: "Test",
      detail: "x",
      category: "GDPR",
      severity: "high",
      risk: "high",
      principles: ["accountability"],
      createdAtISO: "2026-05-01T08:00:00.000Z",
      sourceDocument: "test",
    }
    const merged = mergeDiscoveryFindings([], [finding])
    expect(merged[0].findingStatus).toBe("confirmed")
    expect(merged[0].reviewState).toBe("confirmed")
    expect(merged[0].findingStatusUpdatedAtISO).toBe(finding.createdAtISO)
  })
})
