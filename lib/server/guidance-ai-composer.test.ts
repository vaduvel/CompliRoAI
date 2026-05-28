import { describe, expect, it, vi } from "vitest"

import type { GuidancePlan } from "@/lib/compliance/guidance-orchestrator"
import { initialComplianceState } from "@/lib/compliance/engine"
import type { ComplianceState } from "@/lib/compliance/types"
import {
  buildGuidanceComposerContext,
  composeGuidancePlanWithAI,
} from "./guidance-ai-composer"

const NOW = "2026-05-26T19:00:00.000Z"

function makePlan(): GuidancePlan {
  return {
    id: "guidance-fingerprint",
    headline: "Plan de lucru AI · Apex Logistic SRL",
    generatedAtISO: NOW,
    orgName: "Apex Logistic SRL",
    workspaceMode: "cabinet",
    modelLabel: "deterministic",
    promptVersion: "v1.2",
    confidence: "high",
    summary: "2 acțiuni prioritizate (1 critice), 1 în planul complet.",
    guardrails: [
      "AI-ul nu execută acțiuni și nu închide findings automat.",
      "Planul citează doar surse existente în state, coverage matrix sau engines deterministe.",
    ],
    actions: [
      {
        id: "guidance-finding-dpia-001",
        rank: 1,
        source: "finding",
        sourceIds: ["dpia-001"],
        title: "Semnează DPIA pentru chatbot comenzi",
        why: "Sistemul AI procesează date personale în proces comercial.",
        suggestedAction: "Deschide DPIA și atașează dovada semnată.",
        suggestedOwner: "DPO",
        targetHref: "/dashboard/resolve?finding=dpia-001",
        severity: "critical",
        priority: "P0",
        legalReferences: ["GDPR Art. 35", "AI Act Art. 27"],
        evidenceRequired: ["DPIA semnată", "risc rezidual aprobat"],
        estimatedMinutes: 7,
      },
      {
        id: "guidance-finding-vendor-001",
        rank: 2,
        source: "finding",
        sourceIds: ["vendor-001"],
        title: "Verifică DPA pentru furnizorul AI",
        why: "Vendorul AI nu are DPA atașat în dosar.",
        suggestedAction: "Deschide Vendor Review și atașează DPA.",
        suggestedOwner: "Legal",
        targetHref: "/dashboard/vendor-review",
        severity: "high",
        priority: "P1",
        legalReferences: ["GDPR Art. 28"],
        evidenceRequired: ["DPA", "sub-procesatori"],
        estimatedMinutes: 12,
      },
    ],
    omittedActions: [
      {
        id: "guidance-role-deployer-1",
        rank: 3,
        source: "role",
        sourceIds: ["deployer"],
        title: "Pornește programul AI Literacy",
        why: "Pas recomandat pentru rolul deployer.",
        suggestedAction: "Pornește programul AI Literacy.",
        suggestedOwner: "DPO",
        targetHref: "/dashboard/literacy",
        severity: "medium",
        priority: "P2",
        legalReferences: ["AI Act Art. 4"],
        evidenceRequired: ["listă participanți", "confirmare training"],
        estimatedMinutes: 15,
        omittedReason: "Primele 2 acțiuni au prioritate mai mare.",
      },
    ],
    coverage: {
      shown: 2,
      omitted: 1,
      totalCandidates: 3,
    },
    stats: {
      openFindingsCount: 2,
      criticalFindingsCount: 1,
      preventiveActionsCount: 0,
      aiSystemsCount: 1,
      projectsWithEvidenceGaps: 0,
    },
    fingerprint: "f87df119",
  }
}

function makeState(): ComplianceState {
  return {
    ...structuredClone(initialComplianceState),
    aiSystems: [
      {
        id: "chatbot-comenzi",
        name: "Chatbot comenzi",
        purpose: "support-chatbot",
        vendor: "OpenAI",
        modelType: "LLM",
        usesPersonalData: true,
        makesAutomatedDecisions: false,
        impactsRights: false,
        hasHumanReview: true,
        riskLevel: "limited",
        recommendedActions: [],
        createdAtISO: NOW,
      },
    ],
    vendorRecords: [
      {
        id: "vendor-001",
        orgId: "org-client",
        name: "OpenAI",
        productUsed: "ChatGPT Team",
        vendorRegion: "other",
        role: "processor",
        serviceCategory: "AI/LLM",
        linkedAISystemIds: ["chatbot-comenzi"],
        linkedAIDataMapIds: [],
        dpaStatus: "missing",
        transferRequired: true,
        transferMechanism: "unknown",
        subprocessorsList: [],
        securityEvidence: {
          iso27001: false,
          soc2: false,
          penTestRecent: false,
          encryptionInTransit: true,
          encryptionAtRest: true,
          mfaEnforced: false,
          auditLogsAvailable: false,
        },
        aiTerms: {
          trainingDataOptOut: "unknown",
          inputDataRetention: "unknown",
          outputRightsOwnership: "unknown",
          modelTransparency: "unknown",
          reproducibilityGuarantees: false,
        },
        riskLevel: "high",
        riskReasons: ["DPA lipsă"],
        reviewStatus: "needs_dpa",
        humanReviewRequired: true,
        nextRevalidationISO: "2026-06-26T00:00:00.000Z",
        linkedFindingIds: ["vendor-001"],
        createdAtISO: NOW,
        updatedAtISO: NOW,
      },
    ],
    ropaActivities: [
      {
        id: "ropa-001",
        activityName: "Comenzi online asistate de chatbot",
        purpose: "preluare și suport comenzi",
        dataSubjects: ["clienți"],
        dataCategories: ["date contact", "istoric comenzi"],
        specialCategories: [],
        recipients: ["OpenAI"],
        processors: ["OpenAI"],
        systems: ["Chatbot comenzi"],
        thirdCountryTransfers: [],
        securityMeasures: ["access control"],
        source: "import",
        confidence: "client_claim",
        status: "needs_review",
        linkedFindings: [],
        linkedEvidence: [],
        linkedAISystemIds: ["chatbot-comenzi"],
        createdAtISO: NOW,
        updatedAtISO: NOW,
      },
    ],
    literacyRecords: [
      {
        id: "lit-001",
        employeeName: "Ana Popescu",
        role: "Customer Support",
        trainingDate: "2026-05-20",
        trainingType: "intern",
        topicsCovered: ["AI Act Art. 4"],
        trainerName: "DPO",
        durationHours: 2,
        attestationSigned: true,
        createdAtISO: NOW,
      },
    ],
  }
}

describe("guidance-ai-composer", () => {
  it("construiește context orchestrat din plan și state-ul importat", () => {
    const context = buildGuidanceComposerContext({
      plan: makePlan(),
      state: makeState(),
      nowISO: NOW,
    })

    expect(context.stateFacts.aiSystems).toEqual(["Chatbot comenzi · OpenAI · limited"])
    expect(context.stateFacts.vendors).toEqual(["OpenAI · ChatGPT Team · DPA missing · high"])
    expect(context.stateFacts.ropaActivities).toEqual([
      "Comenzi online asistate de chatbot · needs_review · client_claim",
    ])
    expect(context.stateFacts.literacyRecords).toEqual(["Ana Popescu · Customer Support · 2026-05-20"])
    expect(context.availableSourceIds).toEqual(expect.arrayContaining([
      "action:guidance-finding-dpia-001",
      "source:dpia-001",
      "legal:GDPR Art. 35",
      "ai-system:chatbot-comenzi",
      "vendor:vendor-001",
      "ropa:ropa-001",
      "literacy:lit-001",
    ]))
  })

  it("revine determinist când Mistral nu este disponibil", async () => {
    const plan = makePlan()
    const result = await composeGuidancePlanWithAI({
      plan,
      context: buildGuidanceComposerContext({ plan, state: makeState(), nowISO: NOW }),
      apiKey: "",
      fetchImpl: vi.fn(),
    })

    expect(result.plan).toBe(plan)
    expect(result.usedAI).toBe(false)
    expect(result.modelLabel).toBe("deterministic")
    expect(result.warnings).toContain("Mistral indisponibil; folosim plan deterministic.")
  })

  it("permite doar summary, why și omittedReason, păstrând contractul determinist", async () => {
    const plan = makePlan()
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                summary: "Planul pornește cu DPIA și DPA pentru că datele importate indică chatbot cu date personale.",
                actions: [
                  {
                    id: "guidance-finding-dpia-001",
                    rank: 99,
                    sourceIds: ["evil-source"],
                    legalReferences: ["AI Act Art. 999"],
                    priority: "P3",
                    targetHref: "/dashboard/delete-everything",
                    why: "DPIA este primul pas deoarece RoPA importat și vendorul arată prelucrare de date personale.",
                  },
                ],
                omittedActions: [
                  {
                    id: "guidance-role-deployer-1",
                    omittedReason: "AI Literacy rămâne în planul complet până când sunt închise DPIA și DPA.",
                  },
                ],
                citedSourceIds: [
                  "action:guidance-finding-dpia-001",
                  "vendor:vendor-001",
                  "source:evil-source",
                ],
              }),
            },
          },
        ],
        usage: {
          prompt_tokens: 120,
          completion_tokens: 80,
          total_tokens: 200,
        },
      }),
    } as Response))

    const result = await composeGuidancePlanWithAI({
      plan,
      context: buildGuidanceComposerContext({ plan, state: makeState(), nowISO: NOW }),
      apiKey: "test-key",
      model: "mistral-medium-latest",
      fetchImpl,
    })

    expect(result.usedAI).toBe(true)
    expect(result.plan.modelLabel).toBe("mistral-assisted")
    expect(result.plan.summary).toContain("datele importate")
    expect(result.plan.actions[0]).toMatchObject({
      id: plan.actions[0].id,
      rank: plan.actions[0].rank,
      sourceIds: plan.actions[0].sourceIds,
      legalReferences: plan.actions[0].legalReferences,
      priority: plan.actions[0].priority,
      targetHref: plan.actions[0].targetHref,
    })
    expect(result.plan.actions[0].why).toContain("RoPA importat")
    expect(result.plan.omittedActions[0].omittedReason).toContain("AI Literacy")
    expect(result.modelMeta).toMatchObject({
      provider: "mistral",
      modelName: "mistral-medium-latest",
      usedAI: true,
      citedSourceIds: [
        "action:guidance-finding-dpia-001",
        "vendor:vendor-001",
      ],
      tokenUsage: {
        promptTokens: 120,
        completionTokens: 80,
        totalTokens: 200,
      },
    })
  })
})
