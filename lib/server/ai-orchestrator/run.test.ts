import { describe, expect, it, vi } from "vitest"

import { mergeWithDefault } from "@/lib/server/store"
import { runComplianceOrchestrator } from "./run"

describe("runComplianceOrchestrator", () => {
  it("validates the Mistral proposal before returning an accepted draft", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: "chatcmpl-ok",
        model: "mistral-medium-latest",
        choices: [
          {
            message: {
              content: JSON.stringify({
                schemaVersion: "orchestrator.v1",
                finalLegalVerdict: false,
                legalContext: [
                  {
                    sourceId: "eurlex-ai-act-art-50",
                    instrument: "EU_AI_ACT",
                    reference: "Art. 50(1)",
                    whyRelevant: "Chatbot interaction.",
                  },
                ],
                proposedFindings: [],
                evidenceRequests: [],
                reviewTasks: [],
                nextActions: [],
                exportBlockers: [],
                clientQuestions: [],
                obsoleteCandidates: [],
              }),
            },
          },
        ],
      }),
    })

    const result = await runComplianceOrchestrator({
      orgId: "org-1",
      workspaceMode: "cabinet",
      clientId: "client-a",
      user: { id: "user-1", role: "cabinet_consultant" },
      state: mergeWithDefault(null),
      ragSourceIds: ["eurlex-ai-act-art-50"],
      mistral: { apiKey: "test-key", fetchImpl: fetchMock },
    })

    expect(result.status).toBe("validated")
    expect(result.source).toBe("mistral_rag")
    expect(result.auditEvent.type).toBe("orchestrator.plan_generated")
    expect(result.validation.ok).toBe(true)
    expect(result.inputSnapshotHash).toMatch(/^[a-f0-9]{64}$/)

    const requestBody = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body ?? "{}")) as {
      max_tokens?: number
      messages?: Array<{ role: string; content: string }>
    }
    expect(requestBody.max_tokens).toBe(1_800)

    const promptPayload = JSON.parse(requestBody.messages?.[1]?.content ?? "{}") as Record<string, unknown>
    expect(promptPayload.snapshotSummary).toBeTruthy()
    expect(promptPayload.deterministicPack).toBeTruthy()
    expect(promptPayload.responseBudget).toMatchObject({
      proposedFindingsMax: 2,
      evidenceRequestsMax: 4,
      reviewTasksMax: 2,
      nextActionsMax: 2,
    })
    expect(promptPayload.scopedOpenFindings).toBeUndefined()
    expect(promptPayload.snapshot).toBeUndefined()
    expect(promptPayload.deterministicFallbackShape).toBeUndefined()
  })

  it("falls back to deterministic draft when Mistral overclaims", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                schemaVersion: "orchestrator.v1",
                finalLegalVerdict: true,
                proposedFindings: [],
                evidenceRequests: [],
                reviewTasks: [],
                nextActions: [],
                exportBlockers: [],
                clientQuestions: [],
                obsoleteCandidates: [],
              }),
            },
          },
        ],
      }),
    })

    const result = await runComplianceOrchestrator({
      orgId: "org-1",
      workspaceMode: "cabinet",
      clientId: "client-a",
      user: { id: "user-1", role: "cabinet_consultant" },
      state: mergeWithDefault(null),
      ragSourceIds: [],
      mistral: { apiKey: "test-key", fetchImpl: fetchMock },
    })

    expect(result.status).toBe("fallback_deterministic")
    expect(result.source).toBe("deterministic")
    expect(result.proposal.finalLegalVerdict).toBe(false)
    expect(result.auditEvent.type).toBe("orchestrator.plan_rejected")
    expect(result.validation.ok).toBe(false)
  })

  it("falls back deterministically when Mistral returns partial JSON", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                schemaVersion: "orchestrator.v1",
                finalLegalVerdict: false,
                legalContext: [
                  {
                    sourceId: "eurlex-ai-act-art-50",
                    instrument: "EU_AI_ACT",
                    reference: "Art. 50(1)",
                    whyRelevant: "Chatbot interaction.",
                  },
                ],
              }),
            },
          },
        ],
      }),
    })

    const result = await runComplianceOrchestrator({
      orgId: "org-1",
      workspaceMode: "cabinet",
      clientId: "client-a",
      user: { id: "user-1", role: "cabinet_consultant" },
      state: mergeWithDefault(null),
      ragSourceIds: ["eurlex-ai-act-art-50"],
      mistral: { apiKey: "test-key", fetchImpl: fetchMock },
    })

    expect(result.status).toBe("fallback_deterministic")
    expect(result.source).toBe("deterministic")
    expect(result.proposal.finalLegalVerdict).toBe(false)
  })

  it("retries once when the first Mistral response misses required root arrays", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  schemaVersion: "orchestrator.v1",
                  finalLegalVerdict: false,
                  legalContext: [
                    {
                      sourceId: "eurlex-ai-act-art-50",
                      instrument: "EU_AI_ACT",
                      reference: "Art. 50(1)",
                      whyRelevant: "Chatbot interaction.",
                    },
                  ],
                }),
              },
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  schemaVersion: "orchestrator.v1",
                  finalLegalVerdict: false,
                  legalContext: [
                    {
                      sourceId: "eurlex-ai-act-art-50",
                      instrument: "EU_AI_ACT",
                      reference: "Art. 50(1)",
                      whyRelevant: "Chatbot interaction.",
                    },
                  ],
                  proposedFindings: [],
                  evidenceRequests: [],
                  reviewTasks: [],
                  nextActions: [],
                  exportBlockers: [],
                  clientQuestions: [],
                  obsoleteCandidates: [],
                }),
              },
            },
          ],
        }),
      })

    const result = await runComplianceOrchestrator({
      orgId: "org-1",
      workspaceMode: "cabinet",
      clientId: "client-a",
      user: { id: "user-1", role: "cabinet_consultant" },
      state: mergeWithDefault(null),
      ragSourceIds: ["eurlex-ai-act-art-50"],
      mistral: { apiKey: "test-key", fetchImpl: fetchMock },
    })

    expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(1)
    expect(result.proposal.finalLegalVerdict).toBe(false)
    expect(["validated", "fallback_deterministic"]).toContain(result.status)
  })

  it("retries once when the first Mistral response omits evidence coverage for a finding", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  schemaVersion: "orchestrator.v1",
                  finalLegalVerdict: false,
                  legalContext: [
                    {
                      sourceId: "eurlex-ai-act-art-50",
                      instrument: "EU_AI_ACT",
                      reference: "Art. 50(1)",
                      whyRelevant: "Chatbot interaction.",
                    },
                  ],
                  proposedFindings: [
                    {
                      code: "art50_chatbot_notice",
                      title: "Adaugă notice",
                      reason: "Chatbot public.",
                      severity: "high",
                      ownerRole: "customer_support",
                      linkedEntityType: "ai_use_case",
                      linkedEntityId: "uc-1",
                      legalBasis: [{ instrument: "EU_AI_ACT", article: "Art. 50(1)" }],
                      requiredEvidence: ["transparency_notice_text", "transparency_screenshot"],
                      finalLegalVerdict: false,
                    },
                  ],
                  evidenceRequests: [
                    {
                      code: "collect_notice_text",
                      linkedFindingCode: "art50_chatbot_notice",
                      evidenceType: "transparency_notice_text",
                      title: "Atașează textul notice-ului",
                      ownerRole: "customer_support",
                    },
                  ],
                  reviewTasks: [],
                  nextActions: [],
                  exportBlockers: [],
                  clientQuestions: [],
                  obsoleteCandidates: [],
                }),
              },
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  schemaVersion: "orchestrator.v1",
                  finalLegalVerdict: false,
                  legalContext: [
                    {
                      sourceId: "eurlex-ai-act-art-50",
                      instrument: "EU_AI_ACT",
                      reference: "Art. 50(1)",
                      whyRelevant: "Chatbot interaction.",
                    },
                  ],
                  proposedFindings: [
                    {
                      code: "art50_chatbot_notice",
                      title: "Adaugă notice",
                      reason: "Chatbot public.",
                      severity: "high",
                      ownerRole: "customer_support",
                      linkedEntityType: "ai_use_case",
                      linkedEntityId: "uc-1",
                      legalBasis: [{ instrument: "EU_AI_ACT", article: "Art. 50(1)" }],
                      requiredEvidence: ["transparency_notice_text", "transparency_screenshot"],
                      finalLegalVerdict: false,
                    },
                  ],
                  evidenceRequests: [
                    {
                      code: "collect_notice_text",
                      linkedFindingCode: "art50_chatbot_notice",
                      evidenceType: "transparency_notice_text",
                      title: "Atașează textul notice-ului",
                      ownerRole: "customer_support",
                    },
                    {
                      code: "collect_notice_screenshot",
                      linkedFindingCode: "art50_chatbot_notice",
                      evidenceType: "transparency_screenshot",
                      title: "Atașează screenshot-ul notice-ului",
                      ownerRole: "marketing",
                    },
                  ],
                  reviewTasks: [],
                  nextActions: [],
                  exportBlockers: [],
                  clientQuestions: [],
                  obsoleteCandidates: [],
                }),
              },
            },
          ],
        }),
      })

    const result = await runComplianceOrchestrator({
      orgId: "org-1",
      workspaceMode: "cabinet",
      clientId: "client-a",
      user: { id: "user-1", role: "cabinet_consultant" },
      state: mergeWithDefault(null),
      ragSourceIds: ["eurlex-ai-act-art-50"],
      mistral: { apiKey: "test-key", fetchImpl: fetchMock },
    })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(result.status).toBe("validated")
    expect(result.source).toBe("mistral_rag")
    expect(result.validation.ok).toBe(true)
  })

  it("retries once when the first Mistral request times out", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new DOMException("Timed out", "AbortError"))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  schemaVersion: "orchestrator.v1",
                  finalLegalVerdict: false,
                  legalContext: [
                    {
                      sourceId: "eurlex-ai-act-art-50",
                      instrument: "EU_AI_ACT",
                      reference: "Art. 50(1)",
                      whyRelevant: "Chatbot interaction.",
                    },
                  ],
                  proposedFindings: [],
                  evidenceRequests: [],
                  reviewTasks: [],
                  nextActions: [],
                  exportBlockers: [],
                  clientQuestions: [],
                  obsoleteCandidates: [],
                }),
              },
            },
          ],
        }),
      })

    const result = await runComplianceOrchestrator({
      orgId: "org-1",
      workspaceMode: "cabinet",
      clientId: "client-a",
      user: { id: "user-1", role: "cabinet_consultant" },
      state: mergeWithDefault(null),
      ragSourceIds: ["eurlex-ai-act-art-50"],
      mistral: { apiKey: "test-key", fetchImpl: fetchMock, timeoutMs: 5_000 },
    })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(result.status).toBe("validated")
    expect(result.source).toBe("mistral_rag")
    expect(result.validation.ok).toBe(true)
  })

  it("repairs canonical evidence coverage from deterministic fallback for matching finding codes", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                schemaVersion: "orchestrator.v1",
                finalLegalVerdict: false,
                legalContext: [
                  {
                    sourceId: "eurlex-ai-act-art-50",
                    instrument: "EU_AI_ACT",
                    reference: "Art. 50(1)",
                    whyRelevant: "Chatbot interaction.",
                  },
                ],
                proposedFindings: [
                  {
                    code: "finding-art50",
                    title: "Adaugă notice Art. 50",
                    reason: "Chatbot public.",
                    severity: "high",
                    ownerRole: "customer_support",
                    linkedEntityType: "finding",
                    linkedEntityId: "finding-art50",
                    legalBasis: [{ instrument: "EU_AI_ACT", article: "Art. 50(1)" }],
                    requiredEvidence: ["text_notice", "screenshot_cu_dovada_afisarii"],
                    finalLegalVerdict: false,
                  },
                ],
                evidenceRequests: [],
                reviewTasks: [],
                nextActions: [],
                exportBlockers: [],
                clientQuestions: [],
                obsoleteCandidates: [],
              }),
            },
          },
        ],
      }),
    })

    const result = await runComplianceOrchestrator({
      orgId: "org-1",
      workspaceMode: "cabinet",
      clientId: "client-a",
      user: { id: "user-1", role: "cabinet_consultant" },
      state: mergeWithDefault({
        findings: [
          {
            id: "finding-art50",
            title: "Adaugă notice Art. 50",
            detail: "Chatbot public fără notice vizibil.",
            category: "EU_AI_ACT",
            severity: "high",
            risk: "high",
            principles: [],
            legalReference: "EU AI Act Art. 50(1)",
            evidenceRequired: "transparency_notice_text; transparency_screenshot",
            findingStatus: "open",
            reviewState: "unreviewed",
            ownerSuggestion: "customer_support",
            createdAtISO: "2026-05-27T10:00:00.000Z",
            sourceDocument: "ai_use_case_register",
          },
        ],
      }),
      ragSourceIds: ["eurlex-ai-act-art-50"],
      mistral: { apiKey: "test-key", fetchImpl: fetchMock },
    })

    expect(result.status).toBe("validated")
    expect(result.validation.ok).toBe(true)
    if (!result.validation.ok) throw new Error("Expected validated result")
    expect(result.validation.proposal.proposedFindings[0]?.requiredEvidence).toEqual([
      "transparency_notice_text",
      "transparency_screenshot",
    ])
    expect(result.validation.proposal.evidenceRequests.map((request) => request.evidenceType)).toEqual([
      "transparency_notice_text",
      "transparency_screenshot",
    ])
  })
})
