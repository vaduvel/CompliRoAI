# CompliRoAI Live E2E Fixture Matrix

- Started: 2026-06-01T04:38:02.499Z
- Finished: 2026-06-01T05:23:19.563Z
- Base URL: http://localhost:3001
- Mistral: default
- Summary: 42 pass, 0 warning, 0 fail, 0 blocked, 42 total

| Test | Status | Setup | Matched | Missing / Notes |
| --- | --- | --- | ---: | --- |
| E2E-CAB-001 | pass | client_import | 4/4 | Import client cu AI unknown și intake automat |
| E2E-CAB-002 | pass | no_file_checklist | 3/3 | No-file path creează intake, nu sisteme false |
| E2E-CAB-003 | pass | client_import | 3/3 | Duplicate client după CUI |
| E2E-CAB-004 | pass | vendor_import | 3/3 | Client declară «nu folosim AI», dar există vendor AI în import |
| E2E-CAB-005 | pass | json_fixture:intake_partial_response.json | 3/3 | Client parțial: doar management răspunde la intake |
| E2E-CAB-006 | pass | client_import | 2/2 | Client nou cu serviciu AI Literacy în scope |
| E2E-CHAT-001 | pass | ai_use_case_import | 3/3 | Chatbot public fără notice Art.50 |
| E2E-CHAT-002 | pass | ai_use_case_import | 4/4 | Chatbot colectează email și număr comandă |
| E2E-CHAT-003 | pass | synthetic_chatbot_unknown_human_review | 2/2 | Chatbot cu escaladare umană necunoscută |
| E2E-CHAT-004 | pass | synthetic_medical_chatbot_triage | 4/4 | Chatbot medical intake pe site clinică |
| E2E-CHAT-005 | pass | chatbot_notice_evidence_attach | 1/1 | Notice adăugat și verificat |
| E2E-HR-001 | pass | ai_use_case_import | 5/5 | ATS AI ranking candidați |
| E2E-HR-002 | pass | json_fixture:intake_shadow_ai_hr.json | 4/4 | ChatGPT manual pentru sumarizare CV |
| E2E-HR-003 | pass | ai_use_case_import | 3/3 | AI doar pentru descrieri de job |
| E2E-HR-004 | pass | json_fixture:hr_emotion_interview_candidate.json | 2/2 | Emotion recognition la interviu |
| E2E-HR-005 | pass | json_fixture:employee_monitoring_ai.json | 5/5 | Employee productivity monitoring |
| E2E-IMM-001 | pass | no_file_plus_department_survey | 3/3 | IMM pornește fără inventar |
| E2E-IMM-002 | pass | department_survey_ingestion | 4/4 | Survey descoperă ChatGPT personal accounts |
| E2E-IMM-003 | pass | billing_shadow_ai_ingestion | 3/3 | Declară no AI, dar facturi arată Canva AI/Copilot |
| E2E-IMM-004 | pass | website_chatbot_unknown_check | 2/2 | Website chatbot unknown |
| E2E-IMM-005 | pass | ai_policy_evidence_attach | 2/2 | AI Safe Use Policy minimă înainte de inventar complet |
| E2E-QUES-001 | pass | questionnaire_ingestion | 4/4 | Client enterprise cere AI policy, register, training |
| E2E-QUES-002 | pass | questionnaire_ingestion | 3/3 | HQ cere raport local pentru subsidiară |
| E2E-QUES-003 | pass | questionnaire_ingestion | 2/2 | Chestionar cere ISO 42001/SOC2 inexistente |
| E2E-QUES-004 | pass | questionnaire_ingestion | 3/3 | Deadline azi, minim response pack |
| E2E-QUES-005 | pass | questionnaire_ingestion | 2/2 | Attach previous Audit Pack as evidence |
| E2E-BLD-001 | pass | yaml_fixture:builder_support_agent_ai_compliance.yaml | 5/5 | Support agent handover cu OpenAI API |
| E2E-BLD-002 | pass | yaml_fixture:builder_hr_ranker_ai_compliance.yaml | 5/5 | HR ranker custom pentru client |
| E2E-BLD-003 | pass | yaml_fixture:builder_contract_summarizer.yaml | 4/4 | Legal contract summarizer for enterprise |
| E2E-BLD-004 | pass | yaml_fixture:builder_crm_agent.yaml | 4/4 | Agent scrie automat în CRM |
| E2E-BLD-005 | pass | yaml_fixture:builder_support_agent_ai_compliance.yaml | 2/2 | No logs available before go-live |
| E2E-BLD-006 | pass | yaml_fixture:builder_medical_intake.yaml | 5/5 | Medical symptom triage assistant |
| E2E-CHG-001 | pass | change_event_ingestion | 5/5 | Model provider changed after go-live |
| E2E-CHG-002 | pass | change_event_ingestion | 2/2 | Prompt typo minor |
| E2E-CHG-003 | pass | change_event_ingestion | 3/3 | Logging disabled |
| E2E-CHG-004 | pass | change_event_ingestion | 3/3 | Data source added CRM personal data |
| E2E-CHG-005 | pass | change_event_ingestion | 4/4 | Intended purpose expands to auto-send replies |
| E2E-CHG-006 | pass | change_event_ingestion | 3/3 | Human review removed from HR ranker |
| E2E-CHG-007 | pass | change_event_ingestion | 3/3 | Emergency hotfix |
| E2E-X-001 | pass | tenant_isolation_live_check | 1/1 | Client isolation între workspace-uri |
| E2E-X-002 | pass | repeated_import_idempotency | 2/2 | Finding idempotency on repeated import |
| E2E-X-003 | pass | export_overclaim_guardrail | 1/1 | Export readiness nu permite overclaim |
