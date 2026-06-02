import { readFileSync } from "node:fs"

import { describe, expect, it } from "vitest"

import {
  parseLiteracyImportText,
  parseAISystemImportText,
  parseRopaImportText,
  parseVendorModelImportText,
} from "@/lib/client-import"
import { verifyEventChain, type ComplianceEventActorInput } from "@/lib/compliance/events"
import type { ClientMeta } from "@/lib/compliance/types"
import { mergeWithDefault, type AIActState } from "@/lib/server/store"
import {
  commitLiteracyImportRows,
  commitAISystemImportRows,
  commitNoFileImportChecklist,
  commitRopaImportRows,
  commitVendorModelImportRows,
  type PortfolioImportTarget,
} from "@/lib/server/portfolio-import"

const NOW = "2026-05-26T20:00:00.000Z"

const actor: ComplianceEventActorInput = {
  id: "user-radu",
  label: "radu@cabinet.test",
  role: "partner_manager",
  source: "session",
}

function makeTarget(overrides: Partial<ClientMeta> = {}): PortfolioImportTarget {
  const state = mergeWithDefault({
    clientMeta: {
      orgName: "Apex Logistic SRL",
      cui: "RO12345678",
      externalId: "apex-001",
      ...overrides,
    },
    vendorRecords: [],
    ropaActivities: [],
    literacyRecords: [],
    findings: [],
    events: [],
  } satisfies Partial<AIActState>)

  return {
    orgId: "org-apex",
    orgName: "Apex Logistic SRL",
    state,
    changed: false,
  }
}

describe("portfolio import commit engine", () => {
  it("imports AI system rows and creates role/risk, GDPR, vendor and oversight findings", () => {
    const target = makeTarget()
    const parsed = parseAISystemImportText(
      [
        "client_cui,system_name,purpose,vendor,model_type,uses_personal_data,automated_decisions,impacts_rights,human_review",
        "RO12345678,ATS AI,hr-recruitment,VendorX,LLM,yes,yes,yes,no",
      ].join("\n")
    )

    const result = commitAISystemImportRows({
      targets: [target],
      rows: parsed.rows,
      actor,
      nowISO: NOW,
      importId: "imp-ai-systems-1",
    })

    expect(result.imported).toBe(1)
    expect(target.state.aiSystems).toHaveLength(1)
    expect(target.state.aiSystems[0]).toMatchObject({
      name: "ATS AI",
      sourceImportId: "imp-ai-systems-1",
      certaintyStatus: "imported",
      reviewStatus: "needs_review",
    })
    expect(target.state.findings.map((finding) => finding.title)).toEqual(
      expect.arrayContaining([
        "Validează rolul și riscul AI Act pentru ATS AI",
        "Verifică DPIA/RoPA pentru sistemul AI ATS AI",
        "Review vendor/model pentru ATS AI",
        "Definește human oversight pentru ATS AI",
        "Review high-risk candidate pentru ATS AI",
      ])
    )
    expect(target.state.events?.some((event) => event.type === "ai_system.imported")).toBe(true)
  })

  it("imports AI system rows as separate use cases linked to one system without final verdicts", () => {
    const target = makeTarget()
    const parsed = parseAISystemImportText(
      [
        "client_cui,department,business_process,use_case,purpose,system_name,vendor,model_type,uses_personal_data,confidential_data,automated_decisions,human_review,public_output,affected_persons,owner",
        "RO12345678,Marketing,content_creation,Generare reclame,Creare texte pentru campanii,ChatGPT Team,OpenAI,gpt-4.1,unknown,yes,no,yes,yes,clienti,marketing@example.com",
        "RO12345678,Legal,contract_review,Sumarizare contracte,Rezumate pentru contracte comerciale,ChatGPT Team,OpenAI,gpt-4.1,yes,yes,no,yes,no,clienti;furnizori,legal@example.com",
      ].join("\n")
    )

    const result = commitAISystemImportRows({
      targets: [target],
      rows: parsed.rows,
      actor,
      nowISO: NOW,
      importId: "imp-ai-use-cases-1",
    })

    expect(result.imported).toBe(2)
    expect(target.state.aiSystems).toHaveLength(1)
    expect(target.state.aiUseCases).toHaveLength(2)
    expect(target.state.aiUseCases?.map((record) => record.useCaseName)).toEqual([
      "Generare reclame",
      "Sumarizare contracte",
    ])
    expect(target.state.aiUseCases?.every((record) => record.sourceImportId === "imp-ai-use-cases-1")).toBe(true)
    expect(target.state.aiUseCases?.every((record) => record.certaintyStatus === "imported")).toBe(true)
    expect(target.state.aiUseCases?.every((record) => record.reviewStatus !== "approved")).toBe(true)
    expect(target.state.findings.map((finding) => finding.title)).toEqual(
      expect.arrayContaining([
        "Confirmă dacă utilizarea AI procesează date personale: Generare reclame",
        "Verifică politica pentru date confidențiale în AI: Generare reclame",
        "Verifică GDPR/RoPA/DPIA pentru utilizarea AI: Sumarizare contracte",
        "Confirmă review juridic uman pentru Sumarizare contracte",
      ])
    )
    expect(
      target.state.findings.every((finding) =>
        finding.verdictConfidenceReason?.includes("Nu este verdict legal final")
      )
    ).toBe(true)
    expect(target.state.events?.some((event) => event.type === "ai_use_case.imported")).toBe(true)
  })

  it("imports the real E2E-HR-003 fixture as HR content creation without high-risk candidate drift", () => {
    const target = makeTarget({
      orgName: "NordHire Recrutare SRL",
      cui: "RO33214567",
      externalId: "nordhire-001",
    })
    const csv = readFileSync(
      "tests/fixtures/compliroai_e2e_fixture_pack/imports/ai_use_cases_systems.csv",
      "utf8"
    )
    const parsed = parseAISystemImportText(csv)
    const row = parsed.rows.find((candidate) => candidate.useCaseName === "Redactare descrieri de job")

    expect(row).toBeDefined()

    const result = commitAISystemImportRows({
      targets: [target],
      rows: row ? [row] : [],
      actor,
      nowISO: NOW,
      importId: "imp-e2e-hr-003",
    })

    expect(result.imported).toBe(1)
    expect(target.state.aiUseCases).toHaveLength(1)
    expect(target.state.aiUseCases?.[0]).toMatchObject({
      useCaseName: "Redactare descrieri de job",
      department: "hr_recruitment",
      businessProcess: "content_creation",
      usesPersonalData: "no",
      usesConfidentialData: "yes",
      humanReview: "required_before_action",
      scoringOrRanking: "no",
      annexIIIDomain: "none",
      draftRiskLevel: "minimal",
      highRiskCandidate: false,
      prohibitedCandidate: false,
    })
    expect(target.state.findings.map((finding) => finding.title)).toEqual(
      expect.arrayContaining([
        "Review vendor/model pentru Redactare descrieri de job",
        "Pornește / confirmă AI Literacy pentru utilizarea AI: Redactare descrieri de job",
        "Verifică politica pentru date confidențiale în AI: Redactare descrieri de job",
      ])
    )
    const findingTitles = target.state.findings.map((finding) => finding.title)
    expect(findingTitles.some((title) => title.includes("high-risk candidate"))).toBe(false)
    expect(
      findingTitles.some((title) => title.includes("GDPR/RoPA/DPIA pentru utilizarea AI: Redactare descrieri de job"))
    ).toBe(false)
    expect(
      findingTitles.some((title) => title.includes("Definește human oversight pentru Redactare descrieri de job"))
    ).toBe(false)
  })

  it("imports the real E2E-HR-004 fixture as prohibited candidate for workplace emotion recognition", () => {
    const target = makeTarget({
      orgName: "NordHire Recrutare SRL",
      cui: "RO33214567",
      externalId: "nordhire-001",
    })
    const csv = readFileSync(
      "tests/fixtures/compliroai_e2e_fixture_pack/imports/ai_use_cases_systems.csv",
      "utf8"
    )
    const parsed = parseAISystemImportText(csv)
    const row = parsed.rows.find((candidate) => candidate.useCaseName === "Video interview emotion scoring")

    expect(row).toBeDefined()

    const result = commitAISystemImportRows({
      targets: [target],
      rows: row ? [row] : [],
      actor,
      nowISO: NOW,
      importId: "imp-e2e-hr-004",
    })

    expect(result.imported).toBe(1)
    expect(target.state.aiUseCases?.[0]).toMatchObject({
      prohibitedCandidate: true,
      draftRiskLevel: "prohibited_candidate",
      reviewStatus: "needs_lawyer_review",
    })
    expect(target.state.findings.map((finding) => finding.title)).toEqual(
      expect.arrayContaining([
        "Blochează și trimite la legal review practica AI suspect interzisă: Video interview emotion scoring",
      ])
    )
  })

  it("imports vendor/model rows into the matched client and creates evidence findings + events", () => {
    const target = makeTarget()
    const parsed = parseVendorModelImportText(
      [
        "client_cui,vendor_name,product_used,region,dpa_status,transfer_mechanism,training_on_customer_data,data_personale",
        "RO12345678,OpenAI,ChatGPT Team,US,unknown,unknown,unknown,yes",
      ].join("\n")
    )

    const result = commitVendorModelImportRows({
      targets: [target],
      rows: parsed.rows,
      actor,
      nowISO: NOW,
      importId: "imp-vendors-1",
    })

    expect(result.imported).toBe(1)
    expect(result.failed).toBe(0)
    expect(target.changed).toBe(true)
    expect(target.state.vendorRecords).toHaveLength(1)
    expect(target.state.vendorRecords?.[0]).toMatchObject({
      orgId: "org-apex",
      name: "OpenAI",
      productUsed: "ChatGPT Team",
      dpaStatus: "missing",
      sourceImportId: "imp-vendors-1",
      certaintyStatus: "imported",
      importReviewStatus: "needs_review",
    })
    expect(target.state.findings.map((finding) => finding.title)).toEqual(
      expect.arrayContaining([
        "Atașează DPA / termenii furnizorului AI pentru OpenAI",
        "Confirmă regiunea și mecanismul de transfer pentru OpenAI",
        "Confirmă dacă OpenAI folosește datele clientului la training",
      ])
    )
    expect(target.state.events?.some((event) => event.type === "vendor_model.imported")).toBe(true)
    expect(target.state.events?.some((event) => event.type === "finding.created")).toBe(true)
    expect(verifyEventChain(target.state.events ?? []).ok).toBe(true)
    expect(result.results[0].generatedFindings.length).toBeGreaterThanOrEqual(3)
  })

  it("rejects vendor rows that cannot be matched to a client", () => {
    const target = makeTarget()
    const parsed = parseVendorModelImportText(
      [
        "client_cui,vendor_name,product_used,region,dpa_status",
        "RO99999999,OpenAI,ChatGPT Team,US,signed",
      ].join("\n")
    )

    const result = commitVendorModelImportRows({
      targets: [target],
      rows: parsed.rows,
      actor,
      nowISO: NOW,
      importId: "imp-vendors-missing-client",
    })

    expect(result.imported).toBe(0)
    expect(result.failed).toBe(1)
    expect(target.changed).toBe(false)
    expect(target.state.vendorRecords).toHaveLength(0)
    expect(result.results[0]).toMatchObject({
      ok: false,
      message:
        "Client negăsit în portofoliu. Importă întâi clientul sau folosește client_name / client_cui corect.",
    })
  })

  it("imports RoPA rows and creates GDPR transfer/DPIA review findings", () => {
    const target = makeTarget()
    const parsed = parseRopaImportText(
      [
        "client_cui,activity_name,purpose,data_subjects,data_categories,processors,third_country_transfers,retention",
        "RO12345678,Suport clienți chatbot,Răspuns solicitări,clienți,email;mesaje,OpenAI,US:SCC,12 luni",
      ].join("\n")
    )

    const result = commitRopaImportRows({
      targets: [target],
      rows: parsed.rows,
      actor,
      nowISO: NOW,
      importId: "imp-ropa-1",
    })

    expect(result.imported).toBe(1)
    expect(target.state.ropaActivities).toHaveLength(1)
    expect(target.state.ropaActivities?.[0]).toMatchObject({
      orgId: "org-apex",
      activityName: "Suport clienți chatbot",
      sourceImportId: "imp-ropa-1",
      certaintyStatus: "imported",
      reviewStatus: "needs_review",
    })
    expect(target.state.findings.map((finding) => finding.title)).toEqual(
      expect.arrayContaining([
        "Verifică transferul internațional pentru RoPA: Suport clienți chatbot",
        "Verifică necesitatea DPIA pentru procesul AI: Suport clienți chatbot",
      ])
    )
    expect(target.state.events?.some((event) => event.type === "ropa.activity.imported")).toBe(true)
  })

  it("imports incomplete AI Literacy rows and creates evidence collection findings", () => {
    const target = makeTarget()
    const parsed = parseLiteracyImportText(
      [
        "client_cui,employee_name,role,training_date,training_type,topics,trainer,duration_hours,attestation_signed",
        "RO12345678,Ana Ionescu,Marketing Manager,2026-05-20,workshop,Art. 4;AI policy,Daniel,2,no",
      ].join("\n")
    )

    const result = commitLiteracyImportRows({
      targets: [target],
      rows: parsed.rows,
      actor,
      nowISO: NOW,
      importId: "imp-lit-1",
    })

    expect(result.imported).toBe(1)
    expect(target.state.literacyRecords).toHaveLength(1)
    expect(target.state.literacyRecords[0]).toMatchObject({
      employeeName: "Ana Ionescu",
      sourceImportId: "imp-lit-1",
      certaintyStatus: "imported",
      reviewStatus: "needs_review",
    })
    expect(target.state.findings.map((finding) => finding.title)).toContain(
      "Colectează dovada de finalizare AI Literacy pentru Ana Ionescu"
    )
    expect(target.state.events?.some((event) => event.type === "ai_literacy.imported")).toBe(true)
  })

  it("creates a real no-file checklist finding in the selected client workspace", () => {
    const target = makeTarget()

    const result = commitNoFileImportChecklist({
      target,
      importType: "ai_literacy",
      actor,
      nowISO: NOW,
      importId: "imp-no-file-lit",
    })

    expect(result.ok).toBe(true)
    expect(target.changed).toBe(true)
    expect(target.state.findings[0]).toMatchObject({
      title: "Creează rosterul pentru AI Literacy",
      sourceDocument: "import_center_no_file",
      findingStatus: "open",
      reviewState: "unreviewed",
    })
    expect(target.state.events?.some((event) => event.type === "import.no_file_checklist_created")).toBe(true)
  })
})
