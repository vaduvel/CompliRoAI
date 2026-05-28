import { describe, expect, it } from "vitest"

import {
  aiSystemImportDraftToRecord,
  buildClientImportFindings,
  buildAISystemImportTemplateCsv,
  draftToClientMeta,
  buildLiteracyImportTemplateCsv,
  buildRopaImportTemplateCsv,
  buildVendorModelImportTemplateCsv,
  IMPORT_CENTER_TABS,
  parseAISystemImportText,
  parseClientImportText,
  parseLiteracyImportText,
  parseRopaImportText,
  parseVendorModelImportText,
  literacyImportDraftToRecord,
  ropaImportDraftToRecord,
  vendorModelImportDraftToRecord,
} from "./client-import"

describe("client import parser", () => {
  it("maps Romanian headers and creates proactive signals", () => {
    const csv = [
      "nume firmă;cui;email contact;servicii;folosește ai;date personale ai;risc ridicat;trimite intake",
      "Apex Logistic SRL;RO12345678;maria@example.com;ai_act|gdpr|ai_literacy;da;da;nu;da",
    ].join("\n")

    const result = parseClientImportText(csv)
    expect(result.totalRows).toBe(1)
    expect(result.validRows).toBe(1)
    expect(result.rows[0].companyName).toBe("Apex Logistic SRL")
    expect(result.rows[0].cui).toBe("RO12345678")
    expect(result.rows[0].serviceScope).toContain("ai_act")
    expect(result.rows[0].serviceScope).toContain("gdpr")
    expect(result.rows[0].serviceScope).toContain("ai_literacy")
    expect(result.rows[0].signals.map((signal) => signal.type)).toEqual([
      "send_intake",
      "complete_ai_inventory",
      "gdpr_dpia_review",
      "ai_literacy_task",
    ])
  })

  it("rejects invalid CUI, invalid email, and file duplicates", () => {
    const csv = [
      "company_name,cui,contact_email",
      "Apex Logistic SRL,abc,not-an-email",
      "Apex Logistic SRL,,maria@example.com",
    ].join("\n")

    const result = parseClientImportText(csv)
    expect(result.errorRows).toBe(2)
    expect(result.rows[0].errors).toContain("CUI invalid.")
    expect(result.rows[0].errors).toContain("Email contact invalid.")
    expect(result.rows[1].errors[0]).toContain("Duplicat")
  })

  it("turns import signals into actionable cockpit findings", () => {
    const csv = [
      "company_name,cui,contact_email,service_scope,expected_ai_role,uses_ai,known_ai_tools,personal_data_ai,high_risk_suspected,assigned_to,send_intake",
      "Radu Audit Clinic SRL,RO99112233,radu@example.com,ai_act;gdpr;ai_literacy,deployer,yes,ChatGPT;Copilot,yes,yes,Radu,yes",
    ].join("\n")

    const row = parseClientImportText(csv).rows[0]
    const findings = buildClientImportFindings({
      orgId: "org-client-test",
      meta: {
        orgName: row.companyName,
        cui: row.cui,
        contactEmail: row.contactEmail,
        serviceScope: row.serviceScope,
        expectedAiRole: row.expectedAiRole,
        usesAi: row.usesAi,
        knownAiTools: row.knownAiTools,
        personalDataAi: row.personalDataAi,
        highRiskSuspected: row.highRiskSuspected,
        assignedTo: row.assignedTo,
        importSignals: row.signals,
      },
      nowISO: "2026-05-25T10:00:00.000Z",
    })

    expect(findings.map((finding) => finding.provenance?.ruleId)).toEqual([
      "client_import.send_intake",
      "client_import.complete_ai_inventory",
      "client_import.gdpr_dpia_review",
      "client_import.ai_literacy_task",
      "client_import.role_risk_review",
    ])
    expect(findings.find((finding) => finding.category === "GDPR")?.severity).toBe("high")
    expect(findings[0].findingStatus).toBe("open")
    expect(findings[0].closeCondition).toContain("Intake")
    expect(findings[1].evidenceRequired).toContain("Registru AI")
  })

  it("classifies imported client data by certainty instead of treating claims as verified facts", () => {
    const csv = [
      "company_name,cui,contact_email,service_scope,expected_ai_role,uses_ai,known_ai_tools,personal_data_ai,high_risk_suspected,send_intake",
      "Apex Logistic SRL,RO12345678,maria@example.com,ai_act;gdpr;ai_literacy,deployer,yes,ChatGPT;Copilot,yes,unknown,yes",
    ].join("\n")

    const row = parseClientImportText(csv).rows[0]

    expect(row.dataCertainty.counts.hardImport).toBeGreaterThanOrEqual(3)
    expect(row.dataCertainty.counts.triageClaims).toBeGreaterThanOrEqual(4)
    expect(row.dataCertainty.counts.needsDiscovery).toBeGreaterThanOrEqual(1)
    expect(row.dataCertainty.fieldAssessments.find((field) => field.field === "cui")).toMatchObject({
      certainty: "hard_import",
      reviewRequired: false,
    })
    expect(row.dataCertainty.fieldAssessments.find((field) => field.field === "usesAi")).toMatchObject({
      certainty: "triage_claim",
      reviewRequired: true,
    })
    expect(row.dataCertainty.discoveryNeeds.map((need) => need.type)).toContain("role_risk_confirmation")
  })

  it("keeps a sparse client import valid and opens discovery needs instead of inventing missing AI data", () => {
    const csv = [
      "nume firmă;cui;email contact",
      "Clinica Test SRL;RO44556677;contact@clinica.test",
    ].join("\n")

    const result = parseClientImportText(csv)
    const row = result.rows[0]

    expect(result.validRows).toBe(1)
    expect(row.usesAi).toBe("unknown")
    expect(row.dataCertainty.discoveryNeeds.map((need) => need.type)).toEqual(
      expect.arrayContaining(["ai_inventory_intake", "role_risk_confirmation"])
    )
    expect(row.dataCertainty.counts.needsDiscovery).toBeGreaterThanOrEqual(2)
    expect(row.errors).toEqual([])
  })

  it("persists the import certainty summary on client metadata", () => {
    const csv = [
      "company_name,cui,contact_email,uses_ai,personal_data_ai,send_intake",
      "Radu Cabinet Client SRL,RO77889900,radu@example.com,yes,unknown,yes",
    ].join("\n")

    const row = parseClientImportText(csv).rows[0]
    const meta = draftToClientMeta(row, {
      createdByCabinet: "cabinet-test",
      nowISO: "2026-05-25T10:00:00.000Z",
    })

    expect(meta.importDataCertainty?.counts.hardImport).toBeGreaterThanOrEqual(3)
    expect(meta.importDataCertainty?.counts.triageClaims).toBeGreaterThanOrEqual(2)
    expect(meta.importDataCertainty?.discoveryNeeds.map((need) => need.type)).toContain(
      "gdpr_data_confirmation"
    )
  })

  it("defines the mature Import Center tabs in the same order the cabinet needs them", () => {
    expect(IMPORT_CENTER_TABS.map((tab) => tab.id)).toEqual([
      "clients",
      "ai_systems",
      "vendors_models",
      "ropa",
      "ai_literacy",
    ])
    expect(IMPORT_CENTER_TABS[0]).toMatchObject({
      id: "clients",
      status: "active",
    })
    expect(IMPORT_CENTER_TABS[1]).toMatchObject({
      id: "ai_systems",
      status: "active",
    })
    expect(IMPORT_CENTER_TABS.every((tab) => tab.status === "active")).toBe(true)
  })
})

describe("AI system import parser", () => {
  it("maps AI systems to an existing client identifier and builds a risk-classified record", () => {
    const csv = [
      "client_name,system_name,purpose,vendor,model_type,uses_personal_data,automated_decisions,impacts_rights,human_review,owner,stage,notes,external_id",
      "Apex Logistic SRL,ChatGPT Team,support-chatbot,OpenAI,GPT-4o,yes,no,no,yes,Maria,live,folosit pentru suport,sys-001",
    ].join("\n")

    const result = parseAISystemImportText(csv)
    expect(result.totalRows).toBe(1)
    expect(result.validRows).toBe(1)
    expect(result.rows[0]).toMatchObject({
      clientName: "Apex Logistic SRL",
      systemName: "ChatGPT Team",
      purpose: "support-chatbot",
      vendor: "OpenAI",
      usesPersonalData: true,
      hasHumanReview: true,
    })

    const record = aiSystemImportDraftToRecord(result.rows[0], "2026-05-25T10:00:00.000Z")
    expect(record).toMatchObject({
      name: "ChatGPT Team",
      purpose: "support-chatbot",
      vendor: "OpenAI",
      modelType: "GPT-4o",
      usesPersonalData: true,
      riskLevel: "limited",
    })
    expect(record.recommendedActions).toContain("Informare utilizator că interacționează cu AI")
  })

  it("accepts Romanian headers and classifies HR screening as high-risk while warning on missing human review", () => {
    const csv = [
      "cui client;nume sistem;scop;furnizor;tip model;date personale;decizii automate;impact drepturi;review uman",
      "RO12345678;CV Screening Bot;screening CV candidati;Workable;ML ranking;da;da;da;nu",
    ].join("\n")

    const row = parseAISystemImportText(csv).rows[0]
    const record = aiSystemImportDraftToRecord(row, "2026-05-25T10:00:00.000Z")

    expect(row.clientCui).toBe("RO12345678")
    expect(row.purpose).toBe("hr-screening")
    expect(row.errors).toEqual([])
    expect(row.warnings.join(" ")).toContain("Human review")
    expect(record.riskLevel).toBe("high")
    expect(record.annexIIIHint).toContain("Annex III")
  })

  it("rejects rows without a client identifier or system purpose", () => {
    const csv = [
      "system_name,purpose,vendor",
      "Agent intern,,OpenAI",
    ].join("\n")

    const result = parseAISystemImportText(csv)
    expect(result.errorRows).toBe(1)
    expect(result.rows[0].errors).toEqual(
      expect.arrayContaining([
        "Identificator client lipsă: folosește client_org_id, client_external_id, client_cui sau client_name.",
        "Scop sistem AI lipsă.",
      ])
    )
  })

  it("accepts fixture-pack system columns and recognizes review workflows as human review", () => {
    const csv = [
      "test_case_id,client_cui,department,use_case,purpose,system_name,vendor_name,model_name,personal_data,confidential_data,automated_decision,human_review,public_output,affected_persons,owner_email,status,expected_risk_draft,expected_findings",
      "E2E-CHAT-001,RO24567890,customer_support,Chatbot suport clienți pe website,Răspunde la întrebări frecvente și colectează cereri de suport,MagOnline Website Chatbot,Intercom AI,vendor_managed,yes,unknown,no,escalation_only,no,customers;website_visitors,support@magazine-online.example,active,limited_transparency,art50_chatbot_notice",
      "E2E-HR-001,RO33214567,hr_recruitment,Screening CV și ranking candidați,Analizează CV-urile și propune shortlist pentru interviu,HireRank AI ATS,VendorX HR AI,vendor_model_v3,yes,yes,unknown,required_before_action,no,candidates,hr@nordhire.example,pilot,high_risk_candidate,hr_high_risk_candidate",
    ].join("\n")

    const result = parseAISystemImportText(csv)
    expect(result.validRows).toBe(2)
    expect(result.rows[0]).toMatchObject({
      vendor: "Intercom AI",
      modelType: "vendor_managed",
      purpose: "support-chatbot",
      hasHumanReview: true,
    })
    expect(result.rows[0].warnings.join(" ")).not.toContain("Furnizor/model lipsă")
    expect(result.rows[0].warnings.join(" ")).not.toContain("Human review necunoscut")
    expect(result.rows[1]).toMatchObject({
      purpose: "hr-screening",
      hasHumanReview: true,
    })
  })

  it("classifies the remaining fixture-pack edge cases without leaving purpose unknown", () => {
    const csv = [
      "test_case_id,client_cui,department,use_case,purpose,system_name,vendor_name,model_name,personal_data,confidential_data,automated_decision,human_review,public_output,affected_persons,owner_email,status,expected_risk_draft,expected_findings",
      "E2E-HR-005,RO40127890,credit_finance,Scorare credit clienți persoane fizice,Estimează riscul de neplată și propune scor intern,CreditRisk ML,Internal Model,xgboost_v12,yes,yes,yes,required_before_action,no,customers,risk@fincred.example,active,high_risk_candidate,creditworthiness_high_risk",
      "E2E-BLD-006,RO81112233,medical_healthcare,Pre-triere simptome înainte de programare,Colectează simptome și sugerează tipul de consultație pentru confirmare umană,MedIntake Assistant,DeviDevs Automation SRL,gpt-4.1,yes,yes,no,required_before_action,no,patients,it@urban-medica.example,pilot,critical_review_needed,medical_triage_review",
      "E2E-BLD-004,RO12004567,sales,AI agent actualizează CRM și propune follow-up,Scrie câmpuri în CRM și pregătește emailuri de follow-up,CRM Agent v2,Mistral AI,mistral-large-latest,yes,yes,no,required_before_action,no,customers;prospects,product@bluedesk.example,pilot,limited_or_gdpr_review,semi_automated_action_review",
      "E2E-IMM-003,RO10333444,operations_logistics,Predicție irigații din imagini drone,Analizează imagini drone pentru recomandări de irigare,AgroVision AI,AgroVision SaaS,vendor_model,no,yes,no,required_before_action,no,no_natural_persons,ops@agrodata.example,active,minimal,monitoring_plan",
    ].join("\n")

    const result = parseAISystemImportText(csv)

    expect(result.validRows).toBe(4)
    expect(result.rows.map((row) => row.purpose)).toEqual([
      "credit-scoring",
      "decision-support",
      "decision-support",
      "decision-support",
    ])
    expect(result.rows.flatMap((row) => row.warnings).join(" ")).not.toContain("Scop AI necunoscut")
  })

  it("exports a usable AI systems import template", () => {
    const template = buildAISystemImportTemplateCsv()
    expect(template).toContain("client_external_id")
    expect(template).toContain("system_name")
    expect(template).toContain("uses_personal_data")
  })
})

describe("vendor/model import parser", () => {
  it("maps vendor rows to existing client identifiers and builds review records", () => {
    const csv = [
      "client_name,vendor_name,product_used,region,role,dpa_status,transfer_mechanism,subprocessors,iso27001,soc2,training_on_customer_data,contact_email,notes",
      "Apex Logistic SRL,OpenAI,ChatGPT Team,US,processor,signed,scc_controller_processor,Stripe;AWS,yes,yes,no,dpa@openai.com,DPA primit",
    ].join("\n")

    const result = parseVendorModelImportText(csv)
    expect(result.validRows).toBe(1)
    expect(result.rows[0]).toMatchObject({
      clientName: "Apex Logistic SRL",
      vendorName: "OpenAI",
      productUsed: "ChatGPT Team",
      vendorRegion: "US",
      dpaStatus: "signed",
      transferMechanism: "scc_controller_processor",
    })

    const record = vendorModelImportDraftToRecord(result.rows[0], "org-client", "2026-05-25T10:00:00.000Z")
    expect(record).toMatchObject({
      orgId: "org-client",
      name: "OpenAI",
      productUsed: "ChatGPT Team",
      role: "processor",
      vendorRegion: "US",
      dpaStatus: "signed",
      transferRequired: true,
      transferMechanism: "scc_controller_processor",
      riskLevel: "medium",
      reviewStatus: "in_review",
    })
    expect(record.securityEvidence.iso27001).toBe(true)
    expect(record.aiTerms.trainingDataOptOut).toBe("yes")
    expect(record.aiTerms.reproducibilityGuarantees).toBe(false)
  })

  it("flags missing DPA and unknown transfers as high-risk vendor review", () => {
    const csv = [
      "client_cui;furnizor;produs;regiune;status dpa;mecanism transfer;date personale",
      "RO12345678;Tool AI US;Agent Sales;US;lipsă;necunoscut;da",
    ].join("\n")

    const row = parseVendorModelImportText(csv).rows[0]
    const record = vendorModelImportDraftToRecord(row, "org-client", "2026-05-25T10:00:00.000Z")

    expect(row.clientCui).toBe("RO12345678")
    expect(row.errors).toEqual([])
    expect(record.riskLevel).toBe("high")
    expect(record.reviewStatus).toBe("needs_dpa")
    expect(record.riskReasons.join(" ")).toContain("DPA")
  })

  it("accepts fixture-pack vendor columns", () => {
    const csv = [
      "client_cui,vendor_name,product_name,model_name,contract_type,dpa_status,data_region,training_opt_out,subprocessors_url,security_doc_url,owner_email",
      "RO24567890,OpenAI,ChatGPT Team,gpt-4.1,saas,signed,eu_us,yes,https://example.com/subprocessors,https://example.com/security,dpo@magazine-online.example",
    ].join("\n")

    const row = parseVendorModelImportText(csv).rows[0]
    expect(row.errors).toEqual([])
    expect(row.vendorName).toBe("OpenAI")
    expect(row.productUsed).toBe("ChatGPT Team")
    expect(row.contactEmail).toBe("dpo@magazine-online.example")
    expect(row.trainingDataOptOut).toBe("yes")
  })

  it("exports a usable vendor/model import template", () => {
    const template = buildVendorModelImportTemplateCsv()
    expect(template).toContain("client_external_id")
    expect(template).toContain("vendor_name")
    expect(template).toContain("dpa_status")
  })
})

describe("RoPA import parser", () => {
  it("maps processing activities to existing clients and builds risk-ready RoPA records", () => {
    const csv = [
      "client_name,activity_name,purpose,data_subjects,data_categories,special_categories,legal_basis,processors,systems,retention,security_measures,third_country_transfers,owner",
      "Apex Logistic SRL,Chatbot suport clienți,Răspuns solicitări clienți,clienți,email;mesaje chat,,contract,OpenAI,ChatGPT Team,12 luni,MFA;access logs,US:SCC,Maria",
    ].join("\n")

    const result = parseRopaImportText(csv)
    expect(result.validRows).toBe(1)
    expect(result.rows[0]).toMatchObject({
      clientName: "Apex Logistic SRL",
      activityName: "Chatbot suport clienți",
      legalBasis: "contract",
    })

    const record = ropaImportDraftToRecord(result.rows[0], "org-client", "2026-05-25T10:00:00.000Z")
    expect(record).toMatchObject({
      orgId: "org-client",
      activityName: "Chatbot suport clienți",
      source: "import",
      confidence: "client_claim",
      status: "needs_review",
      riskLevel: "medium",
    })
    expect(record.processors).toContain("OpenAI")
    expect(record.thirdCountryTransfers[0]).toMatchObject({ country: "US", mechanism: "SCC" })
  })

  it("warns when RoPA rows miss legal basis or retention", () => {
    const csv = [
      "client_cui,activity_name,purpose,data_subjects,data_categories",
      "RO12345678,AI scoring leaduri,Prioritizare prospecti,prospecti,email;telefon",
    ].join("\n")

    const row = parseRopaImportText(csv).rows[0]
    expect(row.errors).toEqual([])
    expect(row.warnings.join(" ")).toContain("Temei juridic")
    expect(row.warnings.join(" ")).toContain("Retenție")
  })

  it("accepts the fixture-pack RoPA column names", () => {
    const csv = [
      "client_cui,process_name,linked_use_case,personal_data_categories,data_subjects,legal_basis,retention,processor_vendor,transfer_outside_eea,dpi_needs_review",
      "RO24567890,Suport clienți chatbot,Chatbot suport clienți pe website,nume;email;numar comanda;mesaje suport,customers;website_visitors,contract;interes_legitim,12 luni,Intercom AI,unknown,yes",
    ].join("\n")

    const row = parseRopaImportText(csv).rows[0]
    expect(row.errors).toEqual([])
    expect(row.activityName).toBe("Suport clienți chatbot")
    expect(row.dataCategories).toContain("nume")
    expect(row.processors).toContain("Intercom AI")
  })

  it("exports a usable RoPA import template", () => {
    const template = buildRopaImportTemplateCsv()
    expect(template).toContain("client_external_id")
    expect(template).toContain("activity_name")
    expect(template).toContain("legal_basis")
  })
})

describe("AI literacy import parser", () => {
  it("maps training rows to existing clients and builds AI literacy records", () => {
    const csv = [
      "client_name,employee_name,role,training_date,training_type,topics,trainer,duration_hours,attestation_signed,notes",
      "Apex Logistic SRL,Maria Ionescu,Customer support,2026-05-20,workshop,Art. 4;ChatGPT policy,Daniel,2.5,yes,semnat policy",
    ].join("\n")

    const result = parseLiteracyImportText(csv)
    expect(result.validRows).toBe(1)
    expect(result.rows[0]).toMatchObject({
      clientName: "Apex Logistic SRL",
      employeeName: "Maria Ionescu",
      trainingType: "workshop",
      attestationSigned: true,
    })

    const record = literacyImportDraftToRecord(result.rows[0], "2026-05-25T10:00:00.000Z")
    expect(record).toMatchObject({
      employeeName: "Maria Ionescu",
      role: "Customer support",
      trainingDate: "2026-05-20",
      trainingType: "workshop",
      trainerName: "Daniel",
      durationHours: 2.5,
      attestationSigned: true,
    })
    expect(record.topicsCovered).toContain("Art. 4")
  })

  it("rejects literacy rows without a client identifier, person, or valid training date", () => {
    const csv = [
      "employee_name,training_date,training_type",
      ",25.05.2026,online",
    ].join("\n")

    const result = parseLiteracyImportText(csv)
    expect(result.errorRows).toBe(1)
    expect(result.rows[0].errors).toEqual(
      expect.arrayContaining([
        "Identificator client lipsă: folosește client_org_id, client_external_id, client_cui sau client_name.",
        "Nume persoană lipsă.",
      ])
    )
  })

  it("accepts the fixture-pack AI literacy column names", () => {
    const csv = [
      "client_cui,person_name,person_email,department,role,ai_user_level,training_assigned,training_completed,completion_date,evidence_url",
      "RO12345678,Maria Popescu,maria.popescu@apex-logistic.example,management,Administrator,approver,yes,no,,",
      "RO24567890,Elena Radu,marketing@magazine-online.example,marketing,Marketing Manager,regular,yes,yes,2026-05-20,https://example.com/proof",
    ].join("\n")

    const result = parseLiteracyImportText(csv)
    expect(result.validRows).toBe(2)
    expect(result.rows[0]).toMatchObject({
      employeeName: "Maria Popescu",
      attestationSigned: false,
      trainingType: "platforma-online",
    })
    expect(result.rows[1]).toMatchObject({
      employeeName: "Elena Radu",
      attestationSigned: true,
      trainingDate: "2026-05-20",
    })
  })

  it("exports a usable AI literacy import template", () => {
    const template = buildLiteracyImportTemplateCsv()
    expect(template).toContain("client_external_id")
    expect(template).toContain("employee_name")
    expect(template).toContain("training_date")
  })
})
