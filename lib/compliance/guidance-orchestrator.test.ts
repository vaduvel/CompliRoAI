import { describe, expect, it } from "vitest"

import { initialComplianceState } from "./engine"
import { buildGuidancePlan, diffGuidancePlans, explainOmittedAction } from "./guidance-orchestrator"
import { buildAIProjectProfiles, getObligationTemplatesForProject } from "./ai-project-foundation"
import type { ComplianceState, DpiaRecord, ScanFinding } from "./types"

const NOW = "2026-05-19T09:00:00.000Z"

function makeState(overrides: Partial<ComplianceState>): ComplianceState {
  return {
    ...structuredClone(initialComplianceState),
    ...overrides,
  }
}

function makeFinding(overrides: Partial<ScanFinding>): ScanFinding {
  return {
    id: "finding-1",
    title: "Finalizează DPIA pentru ChatGPT Team",
    detail: "Sistemul AI procesează date personale în proces high-risk.",
    category: "GDPR",
    severity: "critical",
    risk: "high",
    principles: ["privacy_data_governance", "accountability"],
    createdAtISO: NOW,
    sourceDocument: "DPIA",
    findingStatus: "open",
    legalReference: "GDPR Art. 35",
    evidenceRequired: "DPIA semnată și risc rezidual aprobat",
    ownerSuggestion: "DPO",
    remediationHint: "Deschide DPIA și completează secțiunea Măsuri.",
    ...overrides,
  }
}

function makeDpia(overrides: Partial<DpiaRecord>): DpiaRecord {
  return {
    id: "dpia-1",
    title: "DPIA AI",
    processingPurpose: "Analiză cu sistem AI",
    processingDescription: "Prelucrare asistată de AI pentru operațiuni interne.",
    dataCategories: ["date contact"],
    dataSubjects: ["clienți"],
    legalBasis: "GDPR Art. 6(1)(f)",
    specialCategories: false,
    automatedDecisionMaking: true,
    largeScaleProcessing: false,
    necessityAssessment: "Necesitatea este documentată.",
    proportionalityAssessment: "Proporționalitatea este documentată.",
    risks: ["Risc de decizie automatizată"],
    mitigationMeasures: ["human review"],
    residualRisk: "medium",
    status: "approved",
    owner: "DPO",
    createdAtISO: "2025-01-01T00:00:00.000Z",
    updatedAtISO: "2025-01-01T00:00:00.000Z",
    ...overrides,
  }
}

describe("buildGuidancePlan", () => {
  it("prioritizează primul finding critic și păstrează sursa juridică existentă", () => {
    const plan = buildGuidancePlan({
      state: makeState({
        findings: [
          makeFinding({
            id: "dpia-001",
            title: "Semnează DPIA-001 ChatGPT Team",
            legalReference: "GDPR Art. 35",
          }),
          makeFinding({
            id: "art50-001",
            title: "Generează notificarea Art. 50",
            category: "EU_AI_ACT",
            severity: "medium",
            risk: "low",
            legalReference: "AI Act Art. 50",
          }),
        ],
      }),
      workspaceMode: "cabinet",
      orgName: "Apex Logistic SRL",
      nowISO: NOW,
    })

    expect(plan.headline).toContain("Plan de lucru AI")
    expect(plan.actions[0]).toMatchObject({
      id: "guidance-finding-dpia-001",
      rank: 1,
      source: "finding",
      title: "Semnează DPIA-001 ChatGPT Team",
      severity: "critical",
      targetHref: "/dashboard/resolve?finding=dpia-001",
      suggestedOwner: "DPO",
    })
    expect(plan.actions[0].legalReferences).toEqual(["GDPR Art. 35"])
    expect(plan.actions[0].evidenceRequired).toContain("DPIA semnată")
    expect(plan.guardrails).toContain("AI-ul nu execută acțiuni și nu închide findings automat.")
  })

  it("include acțiuni preventive cu deadline și link spre modulul corect", () => {
    const plan = buildGuidancePlan({
      state: makeState({
        dpiaRecords: [
          {
            id: "dpia-older",
            title: "DPIA HR Screening",
            processingPurpose: "Selecție CV cu AI",
            processingDescription: "Screening candidați cu model AI.",
            dataCategories: ["CV", "istoric profesional"],
            dataSubjects: ["candidați"],
            legalBasis: "GDPR Art. 6(1)(b)",
            specialCategories: false,
            automatedDecisionMaking: true,
            largeScaleProcessing: true,
            necessityAssessment: "Necesitate documentată.",
            proportionalityAssessment: "Proporționalitate documentată.",
            risks: ["Bias", "decizie automatizată"],
            mitigationMeasures: ["human review"],
            residualRisk: "high",
            status: "approved",
            owner: "DPO",
            approvedAtISO: "2025-01-01T00:00:00.000Z",
            createdAtISO: "2025-01-01T00:00:00.000Z",
            updatedAtISO: "2025-01-01T00:00:00.000Z",
          },
        ],
      }),
      workspaceMode: "imm-classic",
      orgName: "Test Demo SRL",
      nowISO: NOW,
    })

    const preventive = plan.actions.find((action) => action.source === "preventive")

    expect(preventive).toMatchObject({
      targetHref: "/dashboard/dpia",
      suggestedOwner: "DPO",
    })
    expect(preventive?.why).toContain("Engine preventiv")
    expect(preventive?.legalReferences.join(" ")).toContain("Art.")
  })

  it("completează planul cu pași de rol pentru AI Builder când nu există blocaje", () => {
    const plan = buildGuidancePlan({
      state: makeState({
        roleAssessment: {
          id: "role-1",
          primaryRole: "provider",
          secondaryRoles: [],
          reasoning: "Construiește și pune pe piață un sistem AI.",
          applicableArticles: [
            "Art. 11 + Annex IV",
            "Art. 49",
            "Art. 72",
          ],
          scopeExceptions: [],
          answeredAtISO: NOW,
          answeredByEmail: "builder@example.com",
          answers: {
            developsAI: "yes",
            sellsToThirdParties: "yes",
            usesAIInternally: "yes",
            importsFromNonEU: "no",
            distributesThirdPartyAI: "no",
            embedsAIInPhysicalProducts: "no",
            personalNonCommercialUseOnly: "no",
            militaryOrResearchOnly: "no",
          },
        },
      }),
      workspaceMode: "ai-builder",
      orgName: "Zybots SRL",
      nowISO: NOW,
    })

    expect(plan.actions.some((action) => action.title.includes("Annex IV"))).toBe(true)
    expect(plan.actions.some((action) => action.targetHref === "/dashboard/sisteme/eu-db-wizard")).toBe(true)
    expect(plan.actions.some((action) => action.targetHref === "/dashboard/annex-iv")).toBe(false)
    expect(plan.stats.aiSystemsCount).toBe(0)
    expect(plan.confidence).toBe("high")
  })

  it("ordonează acțiunile preventive cu aceeași severitate după deadline, nu alfabetic", () => {
    const plan = buildGuidancePlan({
      state: makeState({
        dpiaRecords: [
          makeDpia({
            id: "dpia-later",
            title: "A DPIA cu termen mai târziu",
            dueAtISO: "2026-06-18T09:00:00.000Z",
          }),
          makeDpia({
            id: "dpia-soon",
            title: "Z DPIA cu termen mai apropiat",
            dueAtISO: "2026-05-29T09:00:00.000Z",
          }),
        ],
      }),
      workspaceMode: "imm-classic",
      orgName: "Test Demo SRL",
      nowISO: NOW,
      maxActions: 2,
    })

    const preventiveTitles = plan.actions
      .filter((action) => action.source === "preventive")
      .map((action) => action.title)

    expect(preventiveTitles[0]).toBe("Z DPIA cu termen mai apropiat")
    expect(preventiveTitles[1]).toBe("A DPIA cu termen mai târziu")
  })

  it("normalizează proiecte AI cu stage, rol și template-uri de obligații", () => {
    const state = makeState({
      roleAssessment: {
        id: "role-1",
        primaryRole: "provider",
        secondaryRoles: ["deployer"],
        reasoning: "Provider + deployer pentru AI builder.",
        applicableArticles: ["Art. 11 + Annex IV", "Art. 12", "Art. 14", "Art. 17"],
        scopeExceptions: [],
        answeredAtISO: NOW,
        answeredByEmail: "builder@example.com",
        answers: {
          developsAI: "yes",
          sellsToThirdParties: "yes",
          usesAIInternally: "yes",
          importsFromNonEU: "no",
          distributesThirdPartyAI: "no",
          embedsAIInPhysicalProducts: "no",
          personalNonCommercialUseOnly: "no",
          militaryOrResearchOnly: "no",
        },
      },
      aiSystems: [
        {
          id: "ai-voice",
          name: "Zybots Voice",
          purpose: "support-chatbot",
          vendor: "Zybots",
          modelType: "LLM voice agent",
          usesPersonalData: true,
          makesAutomatedDecisions: true,
          impactsRights: true,
          hasHumanReview: false,
          riskLevel: "high",
          recommendedActions: [],
          createdAtISO: NOW,
          approvalStatus: "approved",
        },
      ],
    })

    const [project] = buildAIProjectProfiles(state)
    const templates = getObligationTemplatesForProject(project)

    expect(project).toMatchObject({
      id: "ai-voice",
      stage: "live",
      aiActRole: "provider",
      riskClass: "high",
    })
    expect(templates.some((template) => template.article === "Art. 11 AI Act")).toBe(true)
    expect(templates.every((template) => template.ownerRole)).toBe(true)
    expect(templates.every((template) => template.evidenceRequired.length > 0)).toBe(true)
  })

  it("include gap-urile provider-grade din cercetare doar când rolul și modelul le cer", () => {
    const state = makeState({
      roleAssessment: {
        id: "role-gpai",
        primaryRole: "provider",
        secondaryRoles: [],
        reasoning: "Provider pentru model AI general-purpose.",
        applicableArticles: ["Art. 10", "Art. 13", "Art. 15", "Art. 47", "Art. 53-55"],
        scopeExceptions: [],
        answeredAtISO: NOW,
        answeredByEmail: "builder@example.com",
        answers: {
          developsAI: "yes",
          sellsToThirdParties: "yes",
          usesAIInternally: "yes",
          importsFromNonEU: "no",
          distributesThirdPartyAI: "no",
          embedsAIInPhysicalProducts: "no",
          personalNonCommercialUseOnly: "no",
          militaryOrResearchOnly: "no",
        },
      },
      aiSystems: [
        {
          id: "foundation-assistant",
          name: "Foundation Assistant",
          purpose: "document-assistant",
          vendor: "Internal AI Lab",
          modelType: "general purpose foundation LLM",
          usesPersonalData: true,
          makesAutomatedDecisions: true,
          impactsRights: true,
          hasHumanReview: false,
          riskLevel: "high",
          recommendedActions: [],
          createdAtISO: NOW,
          approvalStatus: "pending",
        },
      ],
    })

    const [project] = buildAIProjectProfiles(state)
    const templates = getObligationTemplatesForProject(project)
    const articles = templates.map((template) => template.article)

    expect(project.modelType).toBe("general purpose foundation LLM")
    expect(project.evidenceGaps).toEqual(expect.arrayContaining([
      "dataset provenance / representativeness / bias evidence",
      "accuracy / robustness / cybersecurity evidence",
      "deployer instruction pack",
    ]))
    expect(articles).toEqual(expect.arrayContaining([
      "Art. 10 AI Act",
      "Art. 13 AI Act",
      "Art. 15 AI Act",
      "Art. 47 AI Act",
      "Art. 53-55 AI Act",
    ]))
  })

  it("ridică provider-grade gaps la severitate high ca să nu fie îngropate în plan", () => {
    const plan = buildGuidancePlan({
      state: makeState({
        roleAssessment: {
          id: "role-provider",
          primaryRole: "provider",
          secondaryRoles: [],
          reasoning: "Provider high-risk pentru sistem AI livrat clienților.",
          applicableArticles: ["Art. 10", "Art. 13", "Art. 15", "Art. 47"],
          scopeExceptions: [],
          answeredAtISO: NOW,
          answeredByEmail: "builder@example.com",
          answers: {
            developsAI: "yes",
            sellsToThirdParties: "yes",
            usesAIInternally: "yes",
            importsFromNonEU: "no",
            distributesThirdPartyAI: "no",
            embedsAIInPhysicalProducts: "no",
            personalNonCommercialUseOnly: "no",
            militaryOrResearchOnly: "no",
          },
        },
        aiSystems: [
          {
            id: "provider-high-risk",
            name: "Provider High Risk",
            purpose: "hr-screening",
            vendor: "Internal AI Lab",
            modelType: "LLM classifier",
            usesPersonalData: true,
            makesAutomatedDecisions: true,
            impactsRights: true,
            hasHumanReview: true,
            riskLevel: "high",
            recommendedActions: [],
            createdAtISO: NOW,
            approvalStatus: "pending",
          },
        ],
      }),
      workspaceMode: "ai-builder",
      orgName: "Builder SRL",
      nowISO: NOW,
      maxActions: 12,
    })

    const byArticle = new Map(plan.actions.map((action) => [action.legalReferences[0], action]))

    for (const article of ["Art. 10 AI Act", "Art. 13 AI Act", "Art. 15 AI Act", "Art. 47 AI Act"]) {
      expect(byArticle.get(article)).toMatchObject({
        severity: "high",
        priority: "P1",
      })
    }
  })

  it("explică omisiunile din planul scurt fără să ascundă candidate pool-ul", () => {
    const state = makeState({
      findings: Array.from({ length: 7 }, (_, index) =>
        makeFinding({
          id: `critical-${index + 1}`,
          title: `Finding critic ${index + 1}`,
          severity: "critical",
        })
      ),
    })

    const plan = buildGuidancePlan({
      state,
      workspaceMode: "cabinet",
      orgName: "Apex Logistic SRL",
      nowISO: NOW,
      maxActions: 4,
    })

    expect(plan.actions).toHaveLength(4)
    expect(plan.omittedActions.length).toBeGreaterThanOrEqual(3)
    expect(plan.coverage.shown).toBe(4)
    expect(plan.coverage.totalCandidates).toBe(7)
    expect(explainOmittedAction(plan, plan.omittedActions[0].id)).toContain("planul complet")
  })

  it("consolidează finding-uri duplicate semantic într-o singură acțiune cu toate sursele", () => {
    const plan = buildGuidancePlan({
      state: makeState({
        findings: [
          makeFinding({
            id: "incident-root-cause-1",
            title: "Lipsește root cause investigation Art.73(4)",
            category: "EU_AI_ACT",
            severity: "critical",
            legalReference: "AI Act Art. 73(4)",
            remediationHint: "Completează root cause investigation în Incident AI.",
            evidenceRequired: "analiză root cause; măsuri corective",
          }),
          makeFinding({
            id: "incident-root-cause-2",
            title: "Lipsește root cause investigation Art.73(4)",
            category: "EU_AI_ACT",
            severity: "critical",
            legalReference: "AI Act Art. 73(4)",
            remediationHint: "Completează root cause investigation în Incident AI.",
            evidenceRequired: "măsuri corective; owner incident",
          }),
        ],
      }),
      workspaceMode: "ai-builder",
      orgName: "CompliScan AI SRL",
      nowISO: NOW,
      maxActions: 8,
    })

    const duplicatedTitleActions = plan.actions.filter((action) =>
      action.title === "Lipsește root cause investigation Art.73(4)"
    )

    expect(duplicatedTitleActions).toHaveLength(1)
    expect(duplicatedTitleActions[0].sourceIds).toEqual([
      "incident-root-cause-1",
      "incident-root-cause-2",
    ])
    expect(duplicatedTitleActions[0].evidenceRequired).toEqual(expect.arrayContaining([
      "analiză root cause",
      "măsuri corective",
      "owner incident",
    ]))
    expect(plan.coverage.totalCandidates).toBeGreaterThanOrEqual(1)
  })

  it("reflectă after-action regeneration și compară planul vechi cu cel nou", () => {
    const before = buildGuidancePlan({
      state: makeState({
        findings: [
          makeFinding({ id: "dpia-001", title: "Semnează DPIA-001 ChatGPT Team" }),
          makeFinding({
            id: "art50-001",
            title: "Generează notificarea Art. 50",
            category: "EU_AI_ACT",
            severity: "high",
            legalReference: "AI Act Art. 50",
          }),
        ],
      }),
      workspaceMode: "cabinet",
      orgName: "Apex Logistic SRL",
      nowISO: NOW,
    })

    const after = buildGuidancePlan({
      state: makeState({
        findings: [
          makeFinding({
            id: "dpia-001",
            title: "Semnează DPIA-001 ChatGPT Team",
            findingStatus: "resolved",
          }),
          makeFinding({
            id: "art50-001",
            title: "Generează notificarea Art. 50",
            category: "EU_AI_ACT",
            severity: "high",
            legalReference: "AI Act Art. 50",
          }),
        ],
      }),
      workspaceMode: "cabinet",
      orgName: "Apex Logistic SRL",
      nowISO: "2026-05-19T10:00:00.000Z",
    })

    const diff = diffGuidancePlans(before, after)

    expect(after.actions[0].id).not.toBe("guidance-finding-dpia-001")
    expect(diff.removed.some((item) => item.id === "guidance-finding-dpia-001")).toBe(true)
    expect(diff.summary).toContain("1 scos")
  })
})
