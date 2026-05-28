# CompliRoAI E2E Fixture Pack

Data: 2026-05-27

Acest pachet conține date demo 100% fictive pentru testarea E2E a CompliRoAI:
- Cabinet / DPO / consultant
- IMM Classic / deployer
- AI Builder / proiecte și handover pack

Datele sunt realiste operațional, dar complet inventate:
- companii demo
- CUI-uri demo
- emailuri pe domenii `.example`
- dovezi placeholder
- YAML/JSON/CSV pentru import și test automation

Regula de test:
Importul sau engine-ul creează draft classification, findings, evidence requests și review states.
Nu creează verdict legal final automat.

## Structură

- `imports/` — CSV-uri de import pentru Import Center
- `expected/` — test cases, expected findings, expected exports
- `json/` — fixture payloads pentru intake, questionnaire, change events
- `yaml/` — ai-compliance.yaml pentru AI Builder
- `evidence/` — fișiere demo care simulează dovezi atașabile

## CSV-uri principale

1. `imports/cabinet_clients.csv`
2. `imports/ai_use_cases_systems.csv`
3. `imports/vendors_models.csv`
4. `imports/ropa_data.csv`
5. `imports/ai_literacy.csv`
6. `imports/evidence_items.csv`
7. `expected/e2e_test_cases.csv`
8. `expected/expected_findings.csv`
9. `expected/expected_exports.csv`

## Flow-uri acoperite

1. Cabinet client nou fără date AI
2. Cabinet chatbot pe site
3. Cabinet HR AI screening
4. IMM nu știe ce AI folosește
5. IMM răspuns la chestionar enterprise
6. AI Builder project handover pack
7. AI Builder model/config change după go-live

