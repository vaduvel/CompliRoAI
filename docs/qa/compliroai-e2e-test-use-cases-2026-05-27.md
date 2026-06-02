# CompliRoAI — E2E Test Use Cases cu date demo reale operațional

Aceste cazuri sunt pentru testare E2E, import, findings, evidence, export și review states. Toate datele sunt fictive, dar scenariile sunt construite pe situații realiste din AI Act + GDPR.

## Reguli generale

- Nu se setează verdict legal final automat.
- `unknown` nu este tratat ca `no`.
- `high_risk_candidate` cere review uman.
- `prohibited_candidate` blochează exportul final până la legal review.
- Exporturile includ Data Certainty, Review Status și audit log.


## 1. Cabinet client nou fără date AI

### E2E-CAB-001 — Import client cu AI unknown și intake automat

**Trigger real:** Consultantul are doar listă de clienți și vrea să pornească misiunea AI Act.

**Actor/persona:** Cabinet / DPO extern — Radu, DPO extern cu 40 clienți

**Precondiții:** Cabinet workspace activ; clientul nu există; niciun AIUseCase.

**Fișiere input:** `imports/cabinet_clients.csv`

**Pași E2E:** Import CSV -> Preview -> Commit valid rows -> Deschide Portofoliu -> Intră în execuție client.

**Obiecte așteptate:** Client, ClientWorkspace, ClientMeta, IntakeRequest(draft), 3-4 Findings, AuditEvent

**Findings așteptate:** `send_ai_intake; create_ai_inventory; confirm_ai_usage; confirm_personal_data_ai`

**Export așteptat:** Draft AI Discovery Snapshot; export final blocat până la intake/review.

**Edge cases:** Email invalid; CUI lipsă; client duplicat.

**Acceptance criteria:** Client creat cu status awaiting_intake; niciun AISystem fake; audit event creat.

### E2E-CAB-002 — No-file path creează intake, nu sisteme false

**Trigger real:** Consultantul nu are fișier, dar vrea să trimită link de discovery.

**Actor/persona:** Cabinet / consultant — Consultant GDPR care lucrează din email și Word

**Precondiții:** Client creat manual cu companyName/contactEmail; AI status unknown.

**Fișiere input:** `No-file path`

**Pași E2E:** Click Nu am fișier -> alege departamente -> generează magic link -> trimite către client.

**Obiecte așteptate:** IntakeRequest, DepartmentSurvey, Findings, AuditEvent

**Findings așteptate:** `launch_department_survey; create_ai_inventory; assign_client_owner`

**Export așteptat:** Nu există export final, doar checklist și intake link.

**Edge cases:** Clientul are doar administrator, fără HR/IT; se creează survey simplificat.

**Acceptance criteria:** No-file path nu creează AIUseCase; creează status awaiting_client_input.

### E2E-CAB-003 — Duplicate client după CUI

**Trigger real:** Cabinet importă același client de două ori din două surse.

**Actor/persona:** Cabinet admin — Asistent cabinet care face importuri bulk

**Precondiții:** Client Apex există deja.

**Fișiere input:** `imports/cabinet_clients_duplicate.csv`

**Pași E2E:** Import duplicate -> Preview indică duplicate -> alege update_existing -> Commit.

**Obiecte așteptate:** Client updated, ImportSession, AuditEvent

**Findings așteptate:** `No duplicate workspace; update notes/deadline; no duplicate findings unresolved.`

**Export așteptat:** Portfolio updated; audit log arată merge/update.

**Edge cases:** CUI diferit dar nume similar; user trebuie să aleagă manual.

**Acceptance criteria:** No duplicate client workspace created.

### E2E-CAB-004 — Client declară «nu folosim AI», dar există vendor AI în import

**Trigger real:** Client spune no AI, dar lista de abonamente conține ChatGPT Team.

**Actor/persona:** DPO extern — Radu DPO

**Precondiții:** Client creat; vendors import disponibili.

**Fișiere input:** `imports/vendors_models.csv`

**Pași E2E:** Import vendor ChatGPT -> detect mismatch -> creează suspected_ai finding.

**Obiecte așteptate:** VendorModel, Finding, AuditEvent

**Findings așteptate:** `suspected_ai_due_vendor; confirm_ai_usage; vendor_review`

**Export așteptat:** Draft report include contradicție și caveat.

**Edge cases:** Vendor este pentru test intern vechi; se poate dismiss cu justificare.

**Acceptance criteria:** Client status devine suspected_ai, nu no_declared_ai.

### E2E-CAB-005 — Client parțial: doar management răspunde la intake

**Trigger real:** Clientul completează doar management form, HR/IT/Marketing nu răspund.

**Actor/persona:** DPO extern — Consultant care urmărește răspunsuri incomplete

**Precondiții:** DepartmentSurvey trimis la 4 departamente.

**Fișiere input:** `json/intake_partial_response.json`

**Pași E2E:** Import responses -> creează use cases doar pentru răspunsuri; restul missing.

**Obiecte așteptate:** AIUseCase partial, Findings, Evidence gaps

**Findings așteptate:** `department_non_response; inventory_partial; export_draft_only`

**Export așteptat:** Management Summary draft cu coverage 25%.

**Edge cases:** Un departament refuză; status blocked_by_client.

**Acceptance criteria:** Export final e blocked/draft_only; coverage matrix afișează non-response.

### E2E-CAB-006 — Client nou cu serviciu AI Literacy în scope

**Trigger real:** Cabinet vinde pachet AI Act + AI Literacy unui client nou.

**Actor/persona:** DPO extern / HR consultant — Consultant care vinde training evidence

**Precondiții:** Client import service_scope include ai_literacy.

**Fișiere input:** `imports/cabinet_clients.csv`

**Pași E2E:** Import -> Commit -> verifică De rezolvat și AI Literacy tab.

**Obiecte așteptate:** Client, AILiteracyPlan draft, Finding

**Findings așteptate:** `start_ai_literacy; collect_training_roster`

**Export așteptat:** AI Literacy Evidence Pack draft.

**Edge cases:** Client nu are listă angajați; creează roster checklist.

**Acceptance criteria:** AI Literacy finding creat automat dacă service_scope conține ai_literacy.


## 2. Cabinet chatbot pe site

### E2E-CHAT-001 — Chatbot public fără notice Art.50

**Trigger real:** Client are chatbot pe site, dar nu informează vizitatorii că interacționează cu AI.

**Actor/persona:** DPO extern — Consultant AI Act + GDPR

**Precondiții:** Client Magazine Online există; websiteUrl disponibil.

**Fișiere input:** `imports/ai_use_cases_systems.csv; evidence/EV-CHATBOT-SCREENSHOT-NO-NOTICE.txt`

**Pași E2E:** Adaugă use case chatbot -> save -> trigger engine -> atașează screenshot fără notice.

**Obiecte așteptate:** AIUseCase, AISystem, VendorModel draft, TransparencyNotice draft, Findings

**Findings așteptate:** `art50_chatbot_notice; chatbot_screenshot_evidence; gdpr_chatbot_review`

**Export așteptat:** Transparency section draft; export final blocked până la notice evidence.

**Edge cases:** Chatbot doar rule-based; consultant poate marca non_ai_candidate.

**Acceptance criteria:** directInteraction=yes creează Art.50 finding; screenshot fără notice nu rezolvă finding.

### E2E-CHAT-002 — Chatbot colectează email și număr comandă

**Trigger real:** E-commerce chatbot colectează date client pentru status comandă.

**Actor/persona:** DPO extern + IT — Consultant + manager support

**Precondiții:** Client MagOnline, vendor SaaS chatbot.

**Fișiere input:** `imports/ai_use_cases_systems.csv; imports/ropa_data.csv`

**Pași E2E:** Import use case + RoPA -> link DataProcess -> generate GDPR findings.

**Obiecte așteptate:** AIUseCase, AISystem, DataProcess, VendorReview

**Findings așteptate:** `gdpr_chatbot_review; vendor_dpa_chatbot; data_region_chatbot; retention_review`

**Export așteptat:** AI Register + RoPA/GDPR bridge + evidence appendix.

**Edge cases:** Vendor nu oferă DPA -> export draft only.

**Acceptance criteria:** usesPersonalData=yes creează DataProcess și DPA finding.

### E2E-CHAT-003 — Chatbot cu escaladare umană necunoscută

**Trigger real:** Support manager nu știe dacă chatbotul escaladează către om.

**Actor/persona:** DPO extern / support manager — Consultant verifică oversight practic

**Precondiții:** AIUseCase chatbot creat, humanEscalation unknown.

**Fișiere input:** `imports/ai_use_cases_systems.csv`

**Pași E2E:** Set humanReview=unknown -> trigger engine.

**Obiecte așteptate:** Finding

**Findings așteptate:** `human_escalation_sop; confirm_human_review`

**Export așteptat:** Open finding în Audit Pack.

**Edge cases:** Vendor spune 'AI assistant', dar în practică închide tichete automat.

**Acceptance criteria:** unknown nu este tratat ca no; creează finding de confirmare.

### E2E-CHAT-004 — Chatbot medical intake pe site clinică

**Trigger real:** Clinica are formular AI care interpretează simptome și recomandă programări.

**Actor/persona:** DPO + avocat — Consultant legal AI law

**Precondiții:** Client Urban Medica există; website intake activ.

**Fișiere input:** `imports/ai_use_cases_systems.csv; imports/ropa_data.csv`

**Pași E2E:** Adaugă use case medical triage -> run risk -> legal review required.

**Obiecte așteptate:** AIUseCase, DataProcess, Findings, ApprovalRequest

**Findings așteptate:** `special_category_health_data; medical_triage_review; gdpr_dpia_review; legal_review`

**Export așteptat:** Health AI risk memo draft; export final blocked.

**Edge cases:** Dacă formularul doar colectează simptome fără AI, findings devin obsolete_candidate.

**Acceptance criteria:** patient_health_data + triage creează critical legal/DPO review.

### E2E-CHAT-005 — Notice adăugat și verificat

**Trigger real:** Client remediază lipsa de transparență, adaugă text pe widget.

**Actor/persona:** DPO extern — Consultant colectează dovada

**Precondiții:** Finding art50_chatbot_notice open.

**Fișiere input:** `evidence/EV-CHATBOT-NOTICE-MAGAZINE.md`

**Pași E2E:** Atașează notice text + screenshot -> consultant review -> management approval.

**Obiecte așteptate:** EvidenceItem, ApprovalRequest, Finding updated

**Findings așteptate:** `art50_chatbot_notice becomes reviewed not automatically closed until approval`

**Export așteptat:** Transparency export ready.

**Edge cases:** Screenshot vechi/expirat -> status expired.

**Acceptance criteria:** Evidence attached -> certainty evidence_attached; requires review before approved.


## 3. Cabinet HR AI screening

### E2E-HR-001 — ATS AI ranking candidați

**Trigger real:** Firmă de recrutare folosește ATS AI care rankează candidați.

**Actor/persona:** DPO extern + avocat — Consultant AI Act pentru client HR

**Precondiții:** Client NordHire exists.

**Fișiere input:** `imports/ai_use_cases_systems.csv`

**Pași E2E:** Import HR screening row -> commit -> run trigger -> verify findings.

**Obiecte așteptate:** AIUseCase, AISystem, VendorModel draft, DataProcess, Findings

**Findings așteptate:** `hr_high_risk_candidate; dpia_hr_ai; human_oversight_hr; vendor_ifu_hr; logging_hr`

**Export așteptat:** HR AI Risk Memo draft; export blocked until legal/DPO review.

**Edge cases:** Vendor claims only support; scoring/ranking still high-risk candidate.

**Acceptance criteria:** HR + scoring/ranking=yes creează high_risk_candidate, nu final verdict.

### E2E-HR-002 — ChatGPT manual pentru sumarizare CV

**Trigger real:** HR încarcă CV-uri în ChatGPT pentru sumarizare înainte de interviu.

**Actor/persona:** DPO + HR — Consultant descoperă shadow AI

**Precondiții:** Client Contabil Plus sau NordHire; use case self-reported.

**Fișiere input:** `json/intake_shadow_ai_hr.json`

**Pași E2E:** Magic link response -> create AIUseCase -> vendor review + DPIA findings.

**Obiecte așteptate:** AIUseCase, VendorModel, DataProcess, Findings

**Findings așteptate:** `shadow_ai_personal_account; dpia_hr_ai; vendor_training_opt_out; high_risk_review_if_screening`

**Export așteptat:** Open risk report; no final high-risk until legal review.

**Edge cases:** HR spune 'doar rezumat', dar îl folosește pentru filtrare -> upgrade risk.

**Acceptance criteria:** Personal account + CV data creates critical vendor/privacy finding.

### E2E-HR-003 — AI doar pentru descrieri de job

**Trigger real:** HR folosește AI pentru redactare job descriptions, fără CV-uri/candidați.

**Actor/persona:** DPO extern — Consultant confirmă că nu e screening

**Precondiții:** Client has AIUseCase HR content creation.

**Fișiere input:** `imports/ai_use_cases_systems.csv`

**Pași E2E:** Add job description use case -> engine -> confirm no high-risk candidate.

**Obiecte așteptate:** AIUseCase, Findings

**Findings așteptate:** `ai_literacy_hr; confidential_data_policy; vendor_review`

**Export așteptat:** Simple HR AI safe-use note.

**Edge cases:** Dacă HR introduce date candidați, se re-trigrează DPIA/high-risk review.

**Acceptance criteria:** No high-risk finding if no candidate data/scoring/ranking.

### E2E-HR-004 — Emotion recognition la interviu

**Trigger real:** Client testează tool de video-interview care detectează emoții.

**Actor/persona:** Avocat AI law + DPO — Legal reviewer

**Precondiții:** Client HR use case planned.

**Fișiere input:** `json/hr_emotion_interview_candidate.json`

**Pași E2E:** Create use case with outputType emotion_recognition, department HR -> trigger prohibited_candidate.

**Obiecte așteptate:** AIUseCase, Findings blocker, ApprovalRequest legal

**Findings așteptate:** `workplace_education_emotion_recognition_prohibited_candidate; stop_legal_review`

**Export așteptat:** Export final blocked; legal memo required.

**Edge cases:** Vendor ascunde funcția ca 'engagement score'. Need legal review.

**Acceptance criteria:** emotion_recognition + HR/workplace -> prohibited_candidate blocker.

### E2E-HR-005 — Employee productivity monitoring

**Trigger real:** Companie monitorizează productivitatea angajaților cu AI.

**Actor/persona:** DPO + Legal + HR — Consultant AI/GDPR

**Precondiții:** Client has employee monitoring tool.

**Fișiere input:** `json/employee_monitoring_ai.json`

**Pași E2E:** Create use case -> risk triage -> require DPO/legal/worker notice.

**Obiecte așteptate:** AIUseCase, DataProcess, Findings, ApprovalRequest

**Findings așteptate:** `employment_worker_management_review; worker_notice; dpia; human_oversight; management_approval`

**Export așteptat:** Employee AI monitoring risk memo.

**Edge cases:** Se folosește doar agregat anonim? downgrade after review.

**Acceptance criteria:** Impacts employees -> high-risk candidate review + GDPR DPIA.


## 4. IMM nu știe ce AI folosește

### E2E-IMM-001 — IMM pornește fără inventar

**Trigger real:** Operations manager apasă 'Nu știu ce AI folosim'.

**Actor/persona:** IMM Classic / Operations — Ana, operations manager

**Precondiții:** No AIUseCase, no AISystem.

**Fișiere input:** `No-file path; imports/imm_internal_survey_responses.csv`

**Pași E2E:** Start unknown AI flow -> send survey -> import responses -> create use cases.

**Obiecte așteptate:** DepartmentSurvey, AIUseCases, Findings, AIPolicyDraft, AILiteracyRoster

**Findings așteptate:** `launch_department_survey; collect_tool_list; create_ai_policy_minimum`

**Export așteptat:** AI Discovery Snapshot + AI Safe Use Pack draft.

**Edge cases:** Departments fail to respond -> coverage partial.

**Acceptance criteria:** No fake AI systems before survey; after responses creates use cases.

### E2E-IMM-002 — Survey descoperă ChatGPT personal accounts

**Trigger real:** Marketing și HR folosesc conturi personale ChatGPT cu date client/candidat.

**Actor/persona:** IMM / DPO extern — Operations manager + DPO extern

**Precondiții:** Survey responses imported.

**Fișiere input:** `imports/imm_internal_survey_responses.csv`

**Pași E2E:** Import responses -> create use cases -> trigger critical findings.

**Obiecte așteptate:** AIUseCase, VendorModel draft, Findings

**Findings așteptate:** `personal_account_ai; vendor_dpa_missing; training_opt_out_unknown; gdpr_review`

**Export așteptat:** Risk Snapshot with critical shadow AI warning.

**Edge cases:** Angajații nu știu exact ce date au introdus -> unknown findings.

**Acceptance criteria:** personal_account + personal/confidential data -> critical.

### E2E-IMM-003 — Declară no AI, dar facturi arată Canva AI/Copilot

**Trigger real:** Management spune 'nu folosim AI', dar billing import include AI tools.

**Actor/persona:** IMM / Admin — CEO / ops

**Precondiții:** Client status no_declared_ai.

**Fișiere input:** `imports/imm_vendor_billing.csv`

**Pași E2E:** Import billing -> detect AI vendors -> set suspected_ai.

**Obiecte așteptate:** VendorModel, Finding, AuditEvent

**Findings așteptate:** `suspected_ai_due_billing; confirm_ai_usage; create_ai_inventory`

**Export așteptat:** Draft report says declared no AI conflicts with billing evidence.

**Edge cases:** Canva fără AI plan? allow dismiss with evidence.

**Acceptance criteria:** Mismatch creates finding; no auto accusation.

### E2E-IMM-004 — Website chatbot unknown

**Trigger real:** IMM nu știe dacă widgetul de chat folosește AI.

**Actor/persona:** IMM marketing manager — Marketing owner

**Precondiții:** hasWebsiteChat=unknown.

**Fișiere input:** `No-file path`

**Pași E2E:** Start flow -> check website chatbot finding -> attach screenshot/config later.

**Obiecte așteptate:** Finding, EvidenceRequest

**Findings așteptate:** `check_website_chatbot; art50_if_ai_confirmed`

**Export așteptat:** Open Action Plan.

**Edge cases:** Widget rule-based; finding obsolete after review.

**Acceptance criteria:** Unknown website chat creates check, not final Art50.

### E2E-IMM-005 — AI Safe Use Policy minimă înainte de inventar complet

**Trigger real:** IMM vrea reguli rapide până termină discovery.

**Actor/persona:** IMM owner — Administrator

**Precondiții:** Survey incomplete; some AI unknown.

**Fișiere input:** `evidence/EV-AI-POLICY-APEX-v1.md`

**Pași E2E:** Generate policy -> management approval -> export draft policy pack.

**Obiecte așteptate:** AIPolicyDraft, EvidenceItem, ApprovalRequest

**Findings așteptate:** `management_approval; training_roster_missing`

**Export așteptat:** AI Safe Use Pack partial.

**Edge cases:** Policy nu trebuie să pretindă inventar complet.

**Acceptance criteria:** Export includes partial status and unknowns.


## 5. IMM răspuns la chestionar enterprise

### E2E-QUES-001 — Client enterprise cere AI policy, register, training

**Trigger real:** IMM primește chestionar procurement cu deadline în 7 zile.

**Actor/persona:** IMM / Sales + DPO — Sales manager

**Precondiții:** Questionnaire case created.

**Fișiere input:** `imports/enterprise_questionnaire_items.csv`

**Pași E2E:** Upload questions -> map to evidence -> generate missing findings -> export response pack.

**Obiecte așteptate:** EnterpriseQuestionnaireCase, QuestionnaireItems, Findings, ExportPack draft

**Findings așteptate:** `missing_ai_inventory; missing_ai_policy; missing_literacy_evidence; management_signoff`

**Export așteptat:** Enterprise AI Response Pack with evidence appendix.

**Edge cases:** Question asks certification not available -> must not fabricate.

**Acceptance criteria:** Answers without evidence marked self_reported; final requires management approval.

### E2E-QUES-002 — HQ cere raport local pentru subsidiară

**Trigger real:** Multinațională cere operațiunii locale AI register și gap status.

**Actor/persona:** Local compliance officer — Compliance manager local

**Precondiții:** Client local exists; HQ questionnaire upload.

**Fișiere input:** `imports/hq_requirement_items.csv`

**Pași E2E:** Create HQ requirement engagement -> map local use cases -> generate gaps.

**Obiecte așteptate:** AIComplianceEngagement, GapAnalysisRecords, Findings, ExportPack

**Findings așteptate:** `hq_local_register_missing; gap_analysis_required; evidence_pack_required`

**Export așteptat:** HQ Local AI Pack.

**Edge cases:** HQ template cere câmpuri inexistente local; map as not_available/needs_review.

**Acceptance criteria:** Export must show local coverage and gaps.

### E2E-QUES-003 — Chestionar cere ISO 42001/SOC2 inexistente

**Trigger real:** Enterprise ask: Are you ISO 42001 certified? Provide SOC2.

**Actor/persona:** IMM / legal — Ops + external consultant

**Precondiții:** No ISO/SOC2 evidence.

**Fișiere input:** `imports/enterprise_questionnaire_items.csv`

**Pași E2E:** Map questions -> no evidence -> create guarded answer.

**Obiecte așteptate:** QuestionnaireItem, Finding

**Findings așteptate:** `no_false_certification; legal_review_required`

**Export așteptat:** Response says not certified, shares AI governance evidence.

**Edge cases:** User tries to answer 'yes' manually; system flags evidence missing.

**Acceptance criteria:** No fabricated compliance claim; blocker until reviewed.

### E2E-QUES-004 — Deadline azi, minim response pack

**Trigger real:** Client cere răspuns în aceeași zi.

**Actor/persona:** IMM sales — Sales manager panic mode

**Precondiții:** Sparse evidence.

**Fișiere input:** `json/questionnaire_deadline_today.json`

**Pași E2E:** Create case -> auto classify questions -> generate draft answers + caveats.

**Obiecte așteptate:** QuestionnaireCase, Findings, DraftExport

**Findings așteptate:** `deadline_owner; missing_evidence; management_signoff`

**Export așteptat:** Draft-only response pack with caveats.

**Edge cases:** Cannot wait for DPO; mark as draft_only.

**Acceptance criteria:** Final export blocked; draft export allowed with warnings.

### E2E-QUES-005 — Attach previous Audit Pack as evidence

**Trigger real:** Client already has Audit Pack; enterprise asks for evidence.

**Actor/persona:** IMM / DPO — DPO external

**Precondiții:** Previous Audit Pack exists.

**Fișiere input:** `evidence/EV-PREVIOUS-AUDIT-PACK-MAGO.txt`

**Pași E2E:** Attach Audit Pack -> map to multiple questionnaire items -> review.

**Obiecte așteptate:** EvidenceItem, QuestionnaireItemEvidenceLinks

**Findings așteptate:** `review_existing_pack; expired_evidence_if_old`

**Export așteptat:** Enterprise response pack uses prior evidence.

**Edge cases:** Audit Pack older than 12 months -> expired.

**Acceptance criteria:** Evidence can satisfy multiple questions but retains date/certainty.


## 6. AI Builder project handover pack

### E2E-BLD-001 — Support agent handover cu OpenAI API

**Trigger real:** AI Builder livrează agent de suport către client enterprise.

**Actor/persona:** AI Builder CTO — Mihai, fondator agenție AI

**Precondiții:** AI Builder workspace; project not created.

**Fișiere input:** `yaml/builder_support_agent_ai_compliance.yaml; evidence/EV-EVAL-REPORT-SUPPORT-AGENT.json`

**Pași E2E:** Import YAML -> create AIProject/AISystem/use case -> attach evidence -> generate handover pack.

**Obiecte așteptate:** AIProject, AISystem, AIUseCase, VendorModel, EvidenceItems, Findings, HandoverPack

**Findings așteptate:** `role_matrix; vendor_model_chain; logging_evidence; eval_metrics; incident_process`

**Export așteptat:** Project Handover Pack v1.

**Edge cases:** No eval report -> draft only.

**Acceptance criteria:** intendedPurpose required; final needs product/legal/security review.

### E2E-BLD-002 — HR ranker custom pentru client

**Trigger real:** Builder dezvoltă scoring CV pentru client HR.

**Actor/persona:** AI Builder + client legal — Builder product owner

**Precondiții:** YAML with HR use case.

**Fișiere input:** `yaml/builder_hr_ranker_ai_compliance.yaml`

**Pași E2E:** Import YAML -> high-risk candidate -> Annex IV/QMS/oversight/logging findings.

**Obiecte așteptate:** AIProject, AIUseCase, AnnexIVDraft, QMSDraft, Findings

**Findings așteptate:** `high_risk_provider_pack; human_oversight_design; eval_metrics; logging; dpia`

**Export așteptat:** Handover Pack blocked until legal review.

**Edge cases:** Client insists system only recommends; remains candidate until legal review.

**Acceptance criteria:** HR scoring/ranking creates high-risk candidate, not final verdict.

### E2E-BLD-003 — Legal contract summarizer for enterprise

**Trigger real:** Builder livrează sumarizator de contracte intern.

**Actor/persona:** AI Builder / legal ops — CTO + client legal

**Precondiții:** Project created.

**Fișiere input:** `yaml/builder_contract_summarizer.yaml`

**Pași E2E:** Import YAML -> confidentiality/vendor/DPIA findings -> handover pack.

**Obiecte așteptate:** AIProject, AIUseCase, VendorModel, Findings

**Findings așteptate:** `contract_confidentiality; vendor_dpa; human_review_required; gdpr_review`

**Export așteptat:** Legal AI Project Handover Pack.

**Edge cases:** Contracts include personal data; DPIA review.

**Acceptance criteria:** No high-risk unless impacts people/decisioning.

### E2E-BLD-004 — Agent scrie automat în CRM

**Trigger real:** AI agent actualizează câmpuri CRM și poate declanșa follow-up automat.

**Actor/persona:** AI Builder / product owner — Automation agency

**Precondiții:** Project active pilot.

**Fișiere input:** `yaml/builder_crm_agent.yaml`

**Pași E2E:** Import -> semi-automated action -> require human gate/rollback/logging.

**Obiecte așteptate:** AIProject, AIUseCase, MonitoringPlan, Findings

**Findings așteptate:** `semi_automated_action_review; human_gate; logging; rollback_plan`

**Export așteptat:** Handover Pack includes operational controls.

**Edge cases:** If agent sends emails autonomously -> increase severity.

**Acceptance criteria:** Semi-auto actions require oversight and logging findings.

### E2E-BLD-005 — No logs available before go-live

**Trigger real:** Builder nu are logging evidence configurat.

**Actor/persona:** AI Builder CTO — Technical founder

**Precondiții:** Project handover ready except logs.

**Fișiere input:** `yaml/builder_support_agent_ai_compliance.yaml`

**Pași E2E:** Set logsAvailable=no -> trigger -> export blocked/draft only.

**Obiecte așteptate:** Finding

**Findings așteptate:** `logging_evidence_missing; monitoring_plan_missing`

**Export așteptat:** Draft Handover Pack only.

**Edge cases:** Client allows manual logs; set capability sample_logs_uploaded.

**Acceptance criteria:** Final handover blocked until logs/monitoring evidence attached or accepted.

### E2E-BLD-006 — Medical symptom triage assistant

**Trigger real:** Builder livrează intake simptome pentru clinică.

**Actor/persona:** AI Builder + DPO + legal — Health AI product owner

**Precondiții:** Project with patient_health_data.

**Fișiere input:** `yaml/builder_medical_intake.yaml`

**Pași E2E:** Import -> health data + triage -> critical legal/DPO reviews.

**Obiecte așteptate:** AIProject, AIUseCase, DataProcess, Findings

**Findings așteptate:** `special_category_data; medical_triage_review; dpia; human_oversight; incident_process`

**Export așteptat:** Health AI risk memo; no final until review.

**Edge cases:** If it only collects form without AI -> downgrade after review.

**Acceptance criteria:** Patient health data always triggers DPO/legal review.


## 7. AI Builder model/config change după go-live

### E2E-CHG-001 — Model provider changed after go-live

**Trigger real:** Builder schimbă providerul modelului din OpenAI în Mistral după go-live.

**Actor/persona:** AI Builder CTO — Engineering lead

**Precondiții:** Project Support Agent v1 active; Handover Pack v1 approved.

**Fișiere input:** `json/change_model_provider.json`

**Pași E2E:** Create ChangeEvent -> run impact assessment -> require eval/model card/client approval.

**Obiecte așteptate:** ChangeEvent, ModelConfigVersion, Findings, ChangeImpactReport

**Findings așteptate:** `change_impact_assessment; rerun_role_risk; model_card_update; eval_after_change; client_approval`

**Export așteptat:** Change Impact Report v2; Handover Pack v1 unchanged.

**Edge cases:** Provider equivalent but region/training terms differ.

**Acceptance criteria:** v1 remains locked; v2 only current after approval.

### E2E-CHG-002 — Prompt typo minor

**Trigger real:** Prompt change doar corectează o greșeală de redactare.

**Actor/persona:** AI Builder engineer — Developer

**Precondiții:** Project active, versioned prompt registry.

**Fișiere input:** `json/change_prompt_minor.json`

**Pași E2E:** Create ChangeEvent -> low severity -> sample eval required.

**Obiecte așteptate:** ChangeEvent, Finding

**Findings așteptate:** `change_impact_assessment; eval_after_change_low`

**Export așteptat:** Change log entry; no full pack reissue unless user chooses.

**Edge cases:** Prompt affects policy/safety instructions? Escalate.

**Acceptance criteria:** Minor prompt change still creates audit event.

### E2E-CHG-003 — Logging disabled

**Trigger real:** Developer dezactivează logging pentru costuri.

**Actor/persona:** AI Builder CTO / security — Security reviewer

**Precondiții:** Project has loggingRequired=true.

**Fișiere input:** `json/change_logging_disabled.json`

**Pași E2E:** Detect config diff -> blocker finding -> export readiness blocked.

**Obiecte așteptate:** ChangeEvent, Finding blocker, ApprovalRequest security

**Findings așteptate:** `logging_after_change; auditability_broken; security_review`

**Export așteptat:** No approved change until logging restored or exception approved.

**Edge cases:** Emergency exception requires due date.

**Acceptance criteria:** High-risk/live system logging disabled -> blocker.

### E2E-CHG-004 — Data source added CRM personal data

**Trigger real:** Agent începe să citească date din CRM după go-live.

**Actor/persona:** AI Builder product owner / DPO — Product owner

**Precondiții:** Original project no personal data; new data source CRM.

**Fișiere input:** `json/change_data_source_crm.json`

**Pași E2E:** Create ChangeEvent -> GDPR review -> update data flow/RoPA/DPIA.

**Obiecte așteptate:** ChangeEvent, DataProcess update, Findings

**Findings așteptate:** `gdpr_after_data_change; data_flow_update; rerun_role_risk`

**Export așteptat:** Change Impact Report with GDPR appendix.

**Edge cases:** CRM has special category fields -> critical.

**Acceptance criteria:** data_source_change + personal data triggers DPO review.

### E2E-CHG-005 — Intended purpose expands to auto-send replies

**Trigger real:** System changes from drafting replies to sending replies automatically.

**Actor/persona:** AI Builder + client legal — Product owner

**Precondiții:** Support agent active as decision support only.

**Fișiere input:** `json/change_auto_send_replies.json`

**Pași E2E:** Create ChangeEvent -> substantial modification review -> client approval.

**Obiecte așteptate:** ChangeEvent, Findings critical, ApprovalRequest client/legal

**Findings așteptate:** `substantial_modification_review; human_oversight_after_change; incident_process; client_approval`

**Export așteptat:** Material Change Report; Handover Pack v2 blocked.

**Edge cases:** Auto-send only for low-risk FAQ? Still review.

**Acceptance criteria:** Intended purpose/autonomy change critical; no silent update.

### E2E-CHG-006 — Human review removed from HR ranker

**Trigger real:** Client cere să elimine review-ul uman pentru procesare rapidă.

**Actor/persona:** AI Builder + client HR/legal — Builder CTO + client HR

**Precondiții:** HR ranker high-risk candidate active pilot.

**Fișiere input:** `json/change_hr_remove_human_review.json`

**Pași E2E:** Change humanReview to none -> blocker -> legal/DPO/management approval required.

**Obiecte așteptate:** ChangeEvent, Findings blocker

**Findings așteptate:** `human_review_removed; high_risk_controls_broken; legal_review`

**Export așteptat:** No export final; go-live blocked.

**Edge cases:** Client insists human review exists outside system; needs SOP evidence.

**Acceptance criteria:** Human review none + HR/ranking = blocker.

### E2E-CHG-007 — Emergency hotfix

**Trigger real:** Bug în producție cere hotfix fără review complet.

**Actor/persona:** AI Builder CTO — On-call engineer

**Precondiții:** Active system; incident/open bug.

**Fișiere input:** `json/change_emergency_hotfix.json`

**Pași E2E:** Mark emergency -> temporary approval -> 48h review finding.

**Obiecte așteptate:** ChangeEvent, TemporaryApproval, Finding

**Findings așteptate:** `emergency_review_due; incident_review_if_failure; rollback_plan_missing`

**Export așteptat:** Emergency Change Report.

**Edge cases:** Hotfix changes intended purpose -> cannot temporary approve without legal escalation.

**Acceptance criteria:** Temporary status expires; review due date required.


## Cross-flow

### E2E-X-001 — Client isolation între workspace-uri

**Trigger real:** Cabinet lucrează pentru Apex, apoi intră în Magazine Online.

**Actor/persona:** Cabinet user — Consultant multi-client

**Precondiții:** Two clients with use cases.

**Fișiere input:** `imports/ai_use_cases_systems.csv`

**Pași E2E:** Switch execution client -> verify records scoped -> exit -> switch other client.

**Obiecte așteptate:** No new objects; query filters

**Findings așteptate:** `No findings cross-client`

**Export așteptat:** No export contamination.

**Edge cases:** Browser state stale after switch.

**Acceptance criteria:** Use cases and evidence from Client A never appear in Client B export.

### E2E-X-002 — Finding idempotency on repeated import

**Trigger real:** Același CSV este importat de două ori.

**Actor/persona:** Cabinet admin — Asistent cabinet

**Precondiții:** First import committed.

**Fișiere input:** `imports/ai_use_cases_systems.csv`

**Pași E2E:** Import same file -> preview shows update/skip -> commit update.

**Obiecte așteptate:** ImportSession, no duplicate findings

**Findings așteptate:** `Existing findings updated, not duplicated`

**Export așteptat:** Audit log records second import.

**Edge cases:** User changes owner_email -> update record and keep finding status.

**Acceptance criteria:** Same triggerCode+useCaseId not duplicated.

### E2E-X-003 — Export readiness nu permite overclaim

**Trigger real:** User încearcă să exporte 'fully compliant' fără dovezi.

**Actor/persona:** Any workspace — Consultant / owner

**Precondiții:** Findings open and evidence missing.

**Fișiere input:** `expected/expected_findings.csv`

**Pași E2E:** Click final export -> system checks readiness.

**Obiecte așteptate:** ExportPack draft only

**Findings așteptate:** `no_false_full_compliance_claim`

**Export așteptat:** Draft export with caveats allowed; final blocked.

**Edge cases:** User has management approval but no DPO review.

**Acceptance criteria:** Export final blocked until required reviews complete.

