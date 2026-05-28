import { readFileSync, mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { requestMistralOrchestratorProposal } from "./mistral-client"
import { validateOrchestratorProposal } from "./validator"
import { canonicalizeOrchestratorProposal } from "./canonicalize"

const LIVE_ENABLED = process.env.MISTRAL_LIVE_TESTS === "1"

describe.runIf(LIVE_ENABLED)("Mistral live E2E fixture orchestration", () => {
  it("turns E2E-CHAT-001 fixture into a validated orchestrator proposal", async () => {
    const apiKey = getMistralApiKey()
    expect(apiKey).toBeTruthy()

    const fixture = readFixtureRow("E2E-CHAT-001")
    const ragSourceIds = [
      "eurlex-ai-act-art-50-1",
      "eurlex-gdpr-art-28",
      "eurlex-gdpr-art-30-35",
      "compliroai-monography-chatbot-art50",
    ]

    const result = await requestValidatedLiveProposal(fixture, ragSourceIds, apiKey)

    if (!result.ok) {
      persistLiveResult("E2E-CHAT-001-error", result)
    }
    expect(result.ok).toBe(true)
    if (!result.ok) return

    const canonicalProposal = canonicalizeOrchestratorProposal(result.proposal)
    const validation = validateOrchestratorProposal(canonicalProposal, {
      allowedRagSourceIds: ragSourceIds,
    })

    persistLiveResult("E2E-CHAT-001", {
      model: result.model,
      responseId: result.responseId,
      rawProposal: result.proposal,
      proposal: canonicalProposal,
      validation,
    })

    expect(validation.ok).toBe(true)
    if (!validation.ok) return

    expect(canonicalProposal.finalLegalVerdict).toBe(false)
    expect(canonicalProposal.proposedFindings.length).toBeGreaterThanOrEqual(2)
    expect(canonicalProposal.evidenceRequests.length).toBeGreaterThanOrEqual(1)
    expect(canonicalProposal.reviewTasks.length).toBeGreaterThanOrEqual(1)
    expect(canonicalProposal.evidenceRequests.map((request) => request.evidenceType)).toContain("ropa_record")
    expect(canonicalProposal.evidenceRequests.map((request) => request.evidenceType)).toContain("vendor_dpa")
    expect(JSON.stringify(canonicalProposal).toLowerCase()).not.toContain("fully compliant")

    const proposedCodes = canonicalProposal.proposedFindings.map((finding) => finding.code)
    expect(proposedCodes).toContain("art50_chatbot_notice")
  }, 75_000)
})

async function requestValidatedLiveProposal(
  fixture: Record<string, string>,
  ragSourceIds: string[],
  apiKey: string,
) {
  const baseArgs = {
    apiKey,
    model: process.env.MISTRAL_LIVE_MODEL ?? "mistral-small-latest",
    timeoutMs: 60_000,
    maxTokens: 2_800,
  } as const

  const first = await requestMistralOrchestratorProposal({
    ...baseArgs,
    prompt: buildLiveFixturePrompt(fixture, ragSourceIds),
  })

  if (!first.ok) return first

  const firstCanonical = canonicalizeOrchestratorProposal(first.proposal)
  const firstValidation = validateOrchestratorProposal(firstCanonical, {
    allowedRagSourceIds: ragSourceIds,
  })
  if (firstValidation.ok || !shouldRetryLiveProposal(firstValidation.errors)) {
    return first
  }

  return requestMistralOrchestratorProposal({
    ...baseArgs,
    prompt: buildLiveFixturePrompt(fixture, ragSourceIds, firstValidation.errors),
  })
}

function getMistralApiKey() {
  if (process.env.MISTRAL_API_KEY) return process.env.MISTRAL_API_KEY
  const envPath = join(process.cwd(), ".env.local")
  const raw = readFileSync(envPath, "utf8")
  const match = raw.match(/^MISTRAL_API_KEY=(?:"([^"]+)"|'([^']+)'|(.+))$/m)
  return match?.[1] ?? match?.[2] ?? match?.[3]?.trim() ?? ""
}

function readFixtureRow(testCaseId: string): Record<string, string> {
  const path = join(process.cwd(), "tests/fixtures/compliroai_e2e_fixture_pack/imports/ai_use_cases_systems.csv")
  const [headerLine, ...lines] = readFileSync(path, "utf8").replace(/^\uFEFF/, "").trim().split(/\r?\n/)
  const headers = parseCsvLine(headerLine)
  for (const line of lines) {
    const values = parseCsvLine(line)
    const row = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]))
    if (row.test_case_id === testCaseId) return row
  }
  throw new Error(`Fixture row not found: ${testCaseId}`)
}

function buildLiveFixturePrompt(
  fixture: Record<string, string>,
  ragSourceIds: string[],
  retryErrors?: string[],
) {
  const compactFixture = {
    testCaseId: fixture.test_case_id,
    entityId: `ai_use_case:${fixture.test_case_id}`,
    clientCui: fixture.client_cui,
    department: fixture.department,
    useCase: fixture.use_case,
    purpose: fixture.purpose,
    systemName: fixture.system_name,
    vendorName: fixture.vendor_name,
    usesPersonalData: fixture.personal_data,
    confidentialData: fixture.confidential_data,
    automatedDecision: fixture.automated_decision,
    humanReview: fixture.human_review,
    affectedPersons: fixture.affected_persons,
    expectedFindingCodes: String(fixture.expected_findings ?? "").split(";").filter(Boolean),
  }

  return JSON.stringify({
    task: "Create an orchestrator.v1 JSON plan for this fixture. Return JSON only. Keep it short.",
    coverageRule: "For every proposed finding, create evidenceRequests covering every item listed in requiredEvidence. Missing evidence coverage is invalid.",
    requiredNonEmptyArrays: {
      evidenceRequests: "at least one evidence request for each proposed finding, using evidenceType from requiredEvidence",
      reviewTasks: "at least dpo review and legal/procurement/customer_support review where relevant",
      exportBlockers: "at least one audit_pack blocker for missing Art. 50/GDPR/vendor evidence",
      nextActions: "at least three concrete workflow actions",
      clientQuestions: "at least one question for any unknown data",
    },
    outputSkeleton: {
      schemaVersion: "orchestrator.v1",
      finalLegalVerdict: false,
      legalContext: [
        {
          sourceId: ragSourceIds[0],
          instrument: "EU_AI_ACT",
          reference: "Art. 50(1)",
          whyRelevant: "Primary source for AI chatbot transparency work.",
        },
      ],
      proposedFindings: [
        {
          code: "art50_chatbot_notice",
          title: "string",
          reason: "string",
          severity: "high",
          ownerRole: "customer_support",
          linkedEntityType: "ai_use_case",
          linkedEntityId: compactFixture.entityId,
          legalBasis: [{ instrument: "EU_AI_ACT", article: "Art. 50(1)" }],
          requiredEvidence: ["transparency_notice_text", "transparency_screenshot"],
          finalLegalVerdict: false,
        },
      ],
      evidenceRequests: [
        {
          code: "collect_art50_notice_text",
          linkedFindingCode: "art50_chatbot_notice",
          linkedEntityType: "ai_use_case",
          linkedEntityId: compactFixture.entityId,
          evidenceType: "transparency_notice_text",
          title: "Atașează textul notice-ului AI pentru chatbot",
          ownerRole: "customer_support",
          requiredMetadata: ["url", "capturedAt"],
        },
        {
          code: "collect_art50_screenshot",
          linkedFindingCode: "art50_chatbot_notice",
          linkedEntityType: "ai_use_case",
          linkedEntityId: compactFixture.entityId,
          evidenceType: "transparency_screenshot",
          title: "Atașează screenshot-ul notice-ului AI pentru chatbot",
          ownerRole: "marketing",
          requiredMetadata: ["url", "capturedAt"],
        },
        {
          code: "collect_vendor_dpa",
          linkedFindingCode: "vendor_dpa_chatbot",
          linkedEntityType: "ai_use_case",
          linkedEntityId: compactFixture.entityId,
          evidenceType: "vendor_dpa",
          title: "Atașează DPA-ul vendorului chatbot",
          ownerRole: "procurement",
          requiredMetadata: ["vendorName", "effectiveDate"],
        },
        {
          code: "collect_ropa_record",
          linkedFindingCode: "gdpr_chatbot_review",
          linkedEntityType: "ai_use_case",
          linkedEntityId: compactFixture.entityId,
          evidenceType: "ropa_record",
          title: "Atașează înregistrarea RoPA pentru chatbot",
          ownerRole: "dpo",
          requiredMetadata: ["dataProcessId"],
        },
      ],
      reviewTasks: [
        {
          code: "dpo_review_chatbot_gdpr",
          title: "DPO verifică procesarea datelor personale în chatbot",
          ownerRole: "dpo",
          reviewStatus: "needs_dpo_review",
          linkedFindingCode: "gdpr_chatbot_review",
          linkedEntityType: "ai_use_case",
          linkedEntityId: compactFixture.entityId,
        },
      ],
      nextActions: [
        {
          code: "open_art50_finding",
          title: "Deschide finding-ul Art. 50 și cere dovada",
          priority: "P1",
          targetHref: "/dashboard/resolve?finding=art50_chatbot_notice",
          ownerRole: "customer_support",
        },
      ],
      exportBlockers: [
        {
          code: "missing_chatbot_transparency_evidence",
          exportType: "audit_pack",
          reason: "Audit Pack final este blocat până există notice și screenshot pentru chatbot.",
          severity: "high",
          blockedUntil: "evidence_attached",
        },
      ],
      clientQuestions: [
        {
          code: "confirm_chatbot_data_categories",
          question: "Ce date personale colectează chatbotul?",
          ownerRole: "customer_support",
          linkedEntityType: "ai_use_case",
          linkedEntityId: compactFixture.entityId,
        },
      ],
      obsoleteCandidates: [],
    },
    allowed: {
      ragSourceIds,
      ownerRoles: ["dpo", "legal", "customer_support", "it_security", "procurement", "management", "client_admin"],
      linkedEntityTypes: ["ai_use_case", "vendor_model", "data_process", "finding"],
      severities: ["info", "low", "medium", "high", "critical", "blocker"],
      reviewStatuses: ["needs_review", "needs_dpo_review", "needs_lawyer_review", "needs_it_security_review", "needs_management_approval", "needs_client_approval"],
      exportTypes: ["audit_pack", "management_summary", "enterprise_questionnaire"],
    },
    mustIncludeEvidenceTypes: [
      "transparency_notice_text",
      "transparency_screenshot",
      "vendor_dpa",
      "ropa_record",
    ],
    mustIncludeFindingCodes: compactFixture.expectedFindingCodes,
    mustNotSay: ["fully compliant", "final high-risk", "approved automatically", "verdict final"],
    retryFeedback: retryErrors?.length
      ? {
          previousAttemptInvalid: true,
          fixTheseErrors: retryErrors.slice(0, 8),
          instruction: "Return the same JSON schema again and ensure each proposed finding has evidenceRequests covering every requiredEvidence item.",
        }
      : undefined,
    ragContext: [
      {
        sourceId: "eurlex-ai-act-art-50-1",
        instrument: "EU_AI_ACT",
        reference: "Art. 50(1)",
        text: "When natural persons directly interact with an AI system, transparency information must be provided unless obvious from context. Use this as primary source for chatbot disclosure work.",
      },
      {
        sourceId: "eurlex-gdpr-art-28",
        instrument: "GDPR",
        reference: "Art. 28",
        text: "Where a processor processes personal data on behalf of a controller, processor terms/DPA must be in place. Use this for vendor DPA evidence requests.",
      },
      {
        sourceId: "eurlex-gdpr-art-30-35",
        instrument: "GDPR",
        reference: "Art. 30 / Art. 35",
        text: "Personal-data processing must be reflected in records of processing, and high-risk processing needs DPIA screening or DPIA where applicable.",
      },
      {
        sourceId: "compliroai-monography-chatbot-art50",
        instrument: "INTERNAL_POLICY",
        reference: "CompliRoAI chatbot Art. 50 scenario",
        text: "For website chatbots, create findings for Art. 50 notice, screenshot evidence, GDPR/RoPA review, vendor DPA/region, and human escalation review. This is internal scenario guidance, not legal truth.",
      },
    ],
    fixture: compactFixture,
  })
}

function shouldRetryLiveProposal(errors: string[]) {
  if (errors.length === 0) return false
  return errors.every((error) =>
    error.includes("must be an array") ||
    error.includes("missing evidenceRequests for requiredEvidence")
  )
}

function persistLiveResult(testCaseId: string, payload: unknown) {
  const dir = join(process.cwd(), ".data/mistral-live-e2e")
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, `${testCaseId}.json`), JSON.stringify(payload, null, 2))
}

function parseCsvLine(line: string): string[] {
  const values: string[] = []
  let current = ""
  let quoted = false
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    const next = line[index + 1]
    if (char === "\"" && quoted && next === "\"") {
      current += "\""
      index += 1
      continue
    }
    if (char === "\"") {
      quoted = !quoted
      continue
    }
    if (char === "," && !quoted) {
      values.push(current)
      current = ""
      continue
    }
    current += char
  }
  values.push(current)
  return values
}
