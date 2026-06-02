import { describe, expect, it } from "vitest"

import { initialComplianceState } from "@/lib/compliance/engine"

import { ORCHESTRATOR_SCHEMA_VERSION } from "./types"
import { buildGuidancePlanFromOrchestrator, orchestratorResultToGuidancePlan } from "./to-guidance-plan"

describe("buildGuidancePlanFromOrchestrator", () => {
  it("maps open findings from deterministic fallback into dashboard actions", async () => {
    const plan = await buildGuidancePlanFromOrchestrator({
      orgId: "org-test",
      orgName: "Apex Logistic SRL",
      workspaceMode: "cabinet",
      user: { id: "user-1" },
      preferMistral: false,
      state: {
        ...initialComplianceState,
        findings: [
          {
            id: "dpia-001",
            title: "Semnează DPIA-001 ChatGPT Team",
            detail: "Sistem AI cu date personale și risc ridicat.",
            category: "GDPR",
            severity: "critical",
            risk: "high",
            principles: ["privacy_data_governance"],
            createdAtISO: "2026-05-27T10:00:00.000Z",
            sourceDocument: "DPIA",
            legalReference: "GDPR Art. 35",
            findingStatus: "open",
            reviewState: "unreviewed",
            ownerSuggestion: "DPO",
            evidenceRequired: "DPIA semnată",
          },
        ],
      },
    })

    expect(plan.modelLabel).toBe("deterministic")
    expect(plan.actions[0]?.id).toBe("guidance-finding-dpia-001")
    expect(plan.actions[0]?.title).toContain("Semnează DPIA-001")
  })

  it("keeps discovery questions visible when no AI inventory exists", async () => {
    const plan = await buildGuidancePlanFromOrchestrator({
      orgId: "org-empty",
      orgName: "Apex Logistic SRL",
      workspaceMode: "cabinet",
      user: { id: "user-1" },
      preferMistral: false,
      state: {
        ...initialComplianceState,
        findings: [],
        aiUseCases: [],
        aiSystems: [],
      },
    })

    expect(plan.actions.some((action) => action.title.includes("Ce tooluri AI folosește compania pe departamente?"))).toBe(true)
    expect(plan.actions.some((action) => action.title.includes("Pornește discovery"))).toBe(true)
  })

  it("keeps guidance action ids unique when Mistral returns duplicate evidence request codes", () => {
    const plan = orchestratorResultToGuidancePlan({
      orgName: "Apex Logistic SRL",
      workspaceMode: "cabinet",
      state: initialComplianceState,
      result: {
        status: "validated",
        source: "mistral_rag",
        inputSnapshotHash: "hash-1",
        validation: {
          ok: true,
          warnings: [],
          proposal: {
            schemaVersion: ORCHESTRATOR_SCHEMA_VERSION,
            finalLegalVerdict: false,
            legalContext: [],
            proposedFindings: [],
            evidenceRequests: [
              {
                code: "same-evidence-code",
                title: "Atașează screenshot notice",
                ownerRole: "dpo",
                evidenceType: "transparency_screenshot",
                linkedFindingCode: "art50_chatbot_notice",
                linkedEntityType: "finding",
                linkedEntityId: "finding-1",
              },
              {
                code: "same-evidence-code",
                title: "Atașează text notice",
                ownerRole: "dpo",
                evidenceType: "transparency_notice_text",
                linkedFindingCode: "art50_chatbot_notice",
                linkedEntityType: "finding",
                linkedEntityId: "finding-1",
              },
            ],
            reviewTasks: [],
            nextActions: [],
            exportBlockers: [],
            clientQuestions: [],
            obsoleteCandidates: [],
          },
        },
        proposal: {
          schemaVersion: ORCHESTRATOR_SCHEMA_VERSION,
          finalLegalVerdict: false,
          legalContext: [],
          proposedFindings: [],
          evidenceRequests: [
            {
              code: "same-evidence-code",
              title: "Atașează screenshot notice",
              ownerRole: "dpo",
              evidenceType: "transparency_screenshot",
              linkedFindingCode: "art50_chatbot_notice",
              linkedEntityType: "finding",
              linkedEntityId: "finding-1",
            },
            {
              code: "same-evidence-code",
              title: "Atașează text notice",
              ownerRole: "dpo",
              evidenceType: "transparency_notice_text",
              linkedFindingCode: "art50_chatbot_notice",
              linkedEntityType: "finding",
              linkedEntityId: "finding-1",
            },
          ],
          reviewTasks: [],
          nextActions: [],
          exportBlockers: [],
          clientQuestions: [],
          obsoleteCandidates: [],
        },
        auditEvent: {
          type: "orchestrator.plan_generated",
          orgId: "org-test",
          inputSnapshotHash: "hash-1",
          source: "mistral_rag",
          createdAtISO: "2026-05-27T10:00:00.000Z",
          actorId: "user-1",
        },
      },
      maxActions: 10,
    })

    const ids = [...plan.actions, ...plan.omittedActions].map((action) => action.id)
    expect(ids).toHaveLength(new Set(ids).size)
  })

  it("sanitizes Mistral next actions that try to expose final Audit Pack export in UI", () => {
    const plan = orchestratorResultToGuidancePlan({
      orgName: "Apex Logistic SRL",
      workspaceMode: "cabinet",
      state: initialComplianceState,
      result: {
        status: "validated",
        source: "mistral_rag",
        inputSnapshotHash: "hash-final-export",
        validation: {
          ok: true,
          warnings: [],
          proposal: {
            schemaVersion: ORCHESTRATOR_SCHEMA_VERSION,
            finalLegalVerdict: false,
            legalContext: [],
            proposedFindings: [],
            evidenceRequests: [],
            reviewTasks: [],
            nextActions: [
              {
                code: "generate_final_audit_pack",
                title: "Generează Audit Pack final aprobat",
                priority: "P0",
                targetHref: "/dashboard/audit-pack?final=true",
                ownerRole: "dpo",
              },
            ],
            exportBlockers: [],
            clientQuestions: [],
            obsoleteCandidates: [],
          },
        },
        proposal: {
          schemaVersion: ORCHESTRATOR_SCHEMA_VERSION,
          finalLegalVerdict: false,
          legalContext: [],
          proposedFindings: [],
          evidenceRequests: [],
          reviewTasks: [],
          nextActions: [
            {
              code: "generate_final_audit_pack",
              title: "Generează Audit Pack final aprobat",
              priority: "P0",
              targetHref: "/dashboard/audit-pack?final=true",
              ownerRole: "dpo",
            },
          ],
          exportBlockers: [],
          clientQuestions: [],
          obsoleteCandidates: [],
        },
        auditEvent: {
          type: "orchestrator.plan_generated",
          orgId: "org-test",
          inputSnapshotHash: "hash-final-export",
          source: "mistral_rag",
          createdAtISO: "2026-06-02T10:00:00.000Z",
          actorId: "user-1",
        },
      },
      maxActions: 3,
    })

    const action = plan.actions[0]

    expect(action?.title).toBe("Verifică readiness-ul Audit Pack")
    expect(action?.suggestedAction).toBe("Deschide Audit Pack și urmărește blocker-ele calculate din dosarul curent.")
    expect(action?.targetHref).toBe("/dashboard/audit-pack")
    expect(action?.ctaLabel).toBe("Vezi readiness-ul")
    expect(JSON.stringify(action).toLowerCase()).not.toContain("?final=true")
    expect(JSON.stringify(action).toLowerCase()).not.toContain("aprobat")
    expect(JSON.stringify(action).toLowerCase()).not.toContain("final")
  })
})
