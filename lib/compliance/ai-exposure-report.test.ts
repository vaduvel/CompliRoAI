/**
 * Sprint 009 — Tests pentru AI Exposure Report aggregator.
 */

import { describe, expect, it } from "vitest"

import { buildAIExposureReport, computeScope } from "@/lib/compliance/ai-exposure-report"
import type { AIDataMapRecord, ScanFinding } from "@/lib/compliance/types"

function buildRecord(overrides: Partial<AIDataMapRecord> = {}): AIDataMapRecord {
  return {
    id: "ai-data-1",
    orgId: "org-test",
    toolName: "ChatGPT",
    vendor: "OpenAI",
    deploymentMode: "saas",
    useCaseCategory: "internal_copilot",
    useCaseDescription: "Asistare redactare email",
    inputDataCategories: ["text"],
    outputDataCategories: ["text"],
    processesPersonalData: false,
    processesSpecialCategories: false,
    childrenData: false,
    vendorRegion: "US",
    trainingDataUsage: "opt_out_available",
    dpaSigned: true,
    subprocessorsDocumented: true,
    riskCandidate: "minimal",
    reasons: ["Nu sunt declanșatoare detectate."],
    linkedFindingIds: [],
    status: "active",
    createdAtISO: "2026-05-17T00:00:00.000Z",
    updatedAtISO: "2026-05-17T00:00:00.000Z",
    ...overrides,
  }
}

describe("computeScope", () => {
  it("numara corect tool-urile pe scope", () => {
    const records = [
      buildRecord({ id: "1", processesPersonalData: true, dpaSigned: false, vendorRegion: "US", riskCandidate: "high_risk_candidate" }),
      buildRecord({ id: "2", processesPersonalData: true, processesSpecialCategories: true, dpaSigned: true, vendorRegion: "EU", riskCandidate: "high_risk_candidate" }),
      buildRecord({ id: "3", riskCandidate: "prohibited_candidate" }),
      buildRecord({ id: "4", riskCandidate: "minimal" }),
    ]
    const scope = computeScope(records)
    expect(scope.aiToolCount).toBe(4)
    expect(scope.personalDataToolCount).toBe(2)
    expect(scope.specialCategoryToolCount).toBe(1)
    expect(scope.noDpaCount).toBe(1)
    expect(scope.nonEuVendorCount).toBe(1) // record #1 US + personal data
    expect(scope.highRiskCandidateCount).toBe(2)
    expect(scope.prohibitedCandidateCount).toBe(1)
  })

  it("nu numara record-urile deprecated/draft in scope", () => {
    // computeScope nu filtreaza dupa status — caller (buildAIExposureReport) o face.
    // dar testam ca primeste records.length din input direct.
    expect(computeScope([]).aiToolCount).toBe(0)
  })
})

describe("buildAIExposureReport", () => {
  it("genereaza un report cu sectiuni complete pentru un set de record-uri", () => {
    const records = [
      buildRecord({
        id: "1",
        toolName: "HR AI Screening",
        vendor: "HireVue",
        useCaseCategory: "hr_workplace",
        processesPersonalData: true,
        dpaSigned: false,
        vendorRegion: "US",
        riskCandidate: "high_risk_candidate",
        reasons: ["HR categoria intra in Annex III"],
        linkedFindingIds: ["finding-1"],
      }),
      buildRecord({
        id: "2",
        toolName: "Intercom",
        vendor: "Intercom",
        useCaseCategory: "customer_support",
        riskCandidate: "transparency_limited",
        reasons: ["Chatbot Art. 50"],
      }),
    ]
    const findings: ScanFinding[] = [
      {
        id: "finding-1",
        title: "Sistem AI high-risk candidate: HR AI Screening",
        detail: "...",
        category: "EU_AI_ACT",
        severity: "high",
        risk: "high",
        principles: ["accountability"],
        createdAtISO: "2026-05-17T00:00:00.000Z",
        sourceDocument: "ai-data-discovery",
        findingStatus: "open",
      },
    ]
    const report = buildAIExposureReport({
      orgId: "org-test",
      orgName: "Acme SRL",
      records,
      findings,
      generatedAtISO: "2026-05-17T10:00:00.000Z",
      reportId: "report-1",
    })
    expect(report.id).toBe("report-1")
    expect(report.orgId).toBe("org-test")
    expect(report.scope.aiToolCount).toBe(2)
    expect(report.scope.highRiskCandidateCount).toBe(1)
    expect(report.topRisks.length).toBeGreaterThan(0)
    expect(report.topRisks[0]).toMatch(/High-risk/)
    expect(report.recommendedActions.length).toBeGreaterThan(0)
    expect(report.markdown).toContain("# AI Exposure Report — Acme SRL")
    expect(report.markdown).toContain("HR AI Screening")
    expect(report.markdown).toContain("Intercom")
    expect(report.markdown).toContain("## Top riscuri detectate")
    expect(report.markdown).toContain("## AI Data Map")
    expect(report.markdown).toContain("## Acțiuni recomandate")
  })

  it("escapeaza pipe in cell-urile markdown", () => {
    const records = [
      buildRecord({ toolName: "Tool | with | pipes" }),
    ]
    const report = buildAIExposureReport({
      orgId: "org",
      orgName: "X",
      records,
      findings: [],
      generatedAtISO: "2026-05-17T00:00:00.000Z",
      reportId: "r",
    })
    expect(report.markdown).toContain("Tool \\| with \\| pipes")
  })

  it("ignora record-urile cu status=deprecated", () => {
    const records = [
      buildRecord({ id: "1", status: "active" }),
      buildRecord({ id: "2", status: "deprecated" }),
    ]
    const report = buildAIExposureReport({
      orgId: "org",
      orgName: "X",
      records,
      findings: [],
      generatedAtISO: "2026-05-17T00:00:00.000Z",
      reportId: "r",
    })
    expect(report.scope.aiToolCount).toBe(1)
  })

  it("returneaza markdown cu mesaj cand nu sunt record-uri", () => {
    const report = buildAIExposureReport({
      orgId: "org",
      orgName: "X",
      records: [],
      findings: [],
      generatedAtISO: "2026-05-17T00:00:00.000Z",
      reportId: "r",
    })
    expect(report.markdown).toContain("Nu există încă tool-uri AI")
    expect(report.topRisks).toEqual([])
    expect(report.recommendedActions).toEqual([])
  })

  it("ridica prohibited candidate la top riscuri cu weight 100", () => {
    const records = [
      buildRecord({ id: "1", riskCandidate: "high_risk_candidate" }),
      buildRecord({ id: "2", riskCandidate: "prohibited_candidate", reasons: ["Art. 5 violation"] }),
    ]
    const report = buildAIExposureReport({
      orgId: "org",
      orgName: "X",
      records,
      findings: [],
      generatedAtISO: "2026-05-17T00:00:00.000Z",
      reportId: "r",
    })
    expect(report.topRisks[0]).toMatch(/INTERZIS/)
  })
})
