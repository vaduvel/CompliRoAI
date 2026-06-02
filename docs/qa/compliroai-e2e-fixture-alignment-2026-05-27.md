# CompliRoAI E2E Fixture Alignment — 2026-05-27

## Source Files

The E2E fixture pack from GPT Web Pro has been imported into the repo:

- `tests/fixtures/compliroai_e2e_fixture_pack/`
- `docs/qa/compliroai-e2e-test-use-cases-2026-05-27.md`

Original downloads:

- `/Users/vaduvageorge/Downloads/compliroai_e2e_fixture_pack.zip`
- `/Users/vaduvageorge/Downloads/CompliRoAI_E2E_Test_Use_Cases.md`

## Fixture Coverage

The pack contains:

- 42 E2E test cases
- 12 demo cabinet clients
- 13 AI use case/system rows
- 9 vendor/model rows
- 6 RoPA/data rows
- 6 AI literacy rows
- 131 expected findings
- 42 expected exports
- JSON intake/questionnaire/change-event payloads
- YAML `ai-compliance.yaml` builder payloads
- Evidence placeholder files

## Alignment With Current App

### Already Aligned

- Cabinet client import exists and supports sparse client rows.
- Import Center tabs match the fixture model:
  - clients
  - AI systems/use cases
  - vendors/models
  - RoPA/data
  - AI literacy
- AIUseCase exists in runtime and can generate deterministic findings.
- Trigger engine creates findings for HR high-risk candidates, GDPR review, vendor review, human oversight, logging, and literacy.
- Resolve receives generated findings.
- Dashboard guidance can prioritize real findings instead of only generic fallback actions.
- Audit Pack can be generated.
- Audit Log records created AIUseCase/finding events.

### Partially Aligned

`imports/cabinet_clients.csv`

- Mostly compatible.
- Extra QA columns are expected and can remain ignored:
  - `client_code`
  - `expected_client_status`
  - `expected_open_findings`

`imports/ai_use_cases_systems.csv`

- Partially compatible.
- Existing parser supports client, system, use case, department, purpose, vendor, personal data, confidential data, human review, public output, affected persons, status.
- Required mapping additions:
  - `automated_decision` -> automated decisions
  - `model_name` -> model/model type
  - `owner_email` -> owner
  - `expected_risk_draft`, `expected_findings` should stay QA-only

`expected/expected_findings.csv`

- Conceptually aligned with deterministic findings.
- Current finding model needs stronger fields for fixture validation:
  - stable `finding_code`
  - normalized `legal_basis`
  - normalized `required_evidence`
  - recommended owner role
  - explicit `final_legal_verdict=false`

### Not Yet Aligned

`imports/vendors_models.csv`

- Current app can import vendor review records, but fixture columns need adapter mappings:
  - `product_name` -> product used
  - `model_name` -> model metadata or product/model split
  - `data_region` -> vendor region
  - `training_opt_out` -> training/customer data setting
  - `subprocessors_url`, `security_doc_url`, `terms_url` -> evidence/document URLs
  - `owner_email` -> contact/owner

`imports/ropa_data.csv`

- Fixture expects AI-use-case-linked GDPR bridging.
- Current importer needs adapter mappings:
  - `process_name` -> activity name
  - `linked_use_case` -> AIUseCase lookup/link
  - `processor_vendor` -> processors
  - `transfer_outside_eea` -> third-country transfer status
  - `dpi_needs_review` -> generated DPIA finding

`imports/ai_literacy.csv`

- Fixture is people/training-roster oriented.
- Current importer expects training-date/type/topics style records.
- Needed schema/import extension:
  - `person_email`
  - `training_assigned`
  - `training_completed`
  - `completion_date`
  - `evidence_url`
  - partial literacy status

`imports/evidence_items.csv`

- No complete import flow yet for evidence items from CSV.
- Needed: evidence import that links by client/use case/finding and sets certainty/review status.

`imports/enterprise_questionnaire_items.csv`

- No dedicated questionnaire case model yet.
- Needed: EnterpriseQuestionnaireCase, QuestionnaireItem, answer/evidence mapping, approval flow, export pack.

`imports/change_events.csv` and `json/change_*.json`

- No dedicated AI Builder change-impact state machine yet.
- Needed: ChangeEvent, ModelConfigVersion, Change Impact Report, material-change approval flow.

`yaml/*.yaml`

- No complete `ai-compliance.yaml` import yet.
- Needed: AI Builder importer that creates AIProject, AISystem, AIUseCase, VendorModel, evidence requests, logging/eval/PMM findings, and handover pack context.

## Runtime Blockers Found During Testing

- `SUPABASE_SERVICE_ROLE_KEY` is missing/invalid in `.env.local`, so live portfolio import commit fails with `SUPABASE_NOT_CONFIGURED`.
- Audit log currently records events but reports a broken hash chain.
- Mistral/RAG is not yet configured as an orchestration planner. Current deterministic engine works; AI composer is not the final orchestrator.

## Recommended Implementation Order

1. Fix Supabase service role for the new CompliRoAI project.
2. Fix audit hash-chain verification before relying on Audit Pack as final evidence.
3. Add fixture-adapter aliases for `ai_use_cases_systems.csv`.
4. Add fixture-adapter aliases and evidence URL handling for vendors/RoPA/literacy.
5. Add fixture-driven tests for:
   - client import
   - AI use case import
   - high-risk HR finding generation
   - chatbot Art. 50 finding generation
   - duplicate import idempotency
   - client isolation
6. Add Evidence import and export readiness checks.
7. Add Enterprise Questionnaire case flow.
8. Add AI Builder `ai-compliance.yaml` and change-event flows.
9. Add Mistral/RAG planner as an orchestration layer over deterministic state, not as legal source of truth.

## Product Interpretation

This fixture pack validates the chosen direction:

CompliRoAI should not be a legal chatbot and should not be a static module library.

It should be an AI compliance workflow orchestrator:

`import/intake -> AIUseCase/AISystem/Vendor/RoPA/Literacy records -> deterministic legal triggers -> findings -> evidence requests -> human review -> export readiness -> audit pack -> monitoring/change impact`

The fixture pack is now the QA benchmark for that direction.
