# CompliRoAI Import Center — role-aware, proactive onboarding

Status: Cabinet import implementat pentru bulk onboarding + acțiuni inițiale.
Data: 2026-05-25. Actualizat QA: 2026-05-26.

## Decizie

Importul nu este doar un CSV de firme. Pentru CompliRoAI, importul este bulk onboarding de execuție:

- Cabinet importă portofoliu de clienți și context inițial pentru fiecare client.
- IMM importă datele propriei organizații: inventar AI, furnizori, RoPA, angajați AI Literacy.
- AI Builder importă proiecte/sisteme livrate, clienți beneficiari, modele/vendors, intended purpose și responsabilități de handover.

Cabinetul este nivelul de sus: trebuie să poată importa și datele pe care le folosesc IMM și AI Builder, dar scoped pe fiecare client.

## Principiu critic — nu presupunem că userul are toate datele

Import Center trebuie proiectat pe realitatea empirică a firmelor și cabinetelor:

- Unele date există deja în sisteme operaționale reale: CRM, facturare, contabilitate, HR/payroll, Microsoft 365, Google Workspace, contracte, vendor files, RoPA existent.
- Unele date există, dar sunt împrăștiate: inventar de tool-uri, furnizori, angajați, departamente, DPA-uri, privacy notices, liste de aplicații.
- Unele date nu există ca "adevăr" înainte de compliance review: rol AI Act, risc AI Act, high-risk suspicion, personal data AI, automated decisions, human oversight, DPIA/FRIA trigger.
- Unele date există doar la organizații mature tehnic: runtime logs, model metrics, drift/bias evidence, prompt injection/security monitoring, model cards, dataset lineage.

De aceea, importul nu trebuie să ceară câmpuri de compliance ca obligatorii. Trebuie să accepte `unknown`, să păstreze sursa datelor și să creeze intake/task-uri pentru confirmare.

### Clasificare sursă date

Fiecare rând importat și fiecare câmp sensibil trebuie tratat cu un nivel de certitudine:

| Clasă | Ce înseamnă | Exemple | Comportament în produs |
| --- | --- | --- | --- |
| `hard_import` | Date administrative existente în exporturi reale | `company_name`, `cui`, `contact_email`, `phone`, `city`, `country`, `client_status`, `assigned_to`, `external_id` | Se importă direct, cu validări de format și deduplicare. |
| `soft_import` | Date utile, dar posibil incomplete sau împrăștiate | `sector`, `employees`, `known_ai_tools`, `vendors`, `service_scope`, `tags`, `notes` | Se importă ca metadata, cu badge "neconfirmat" dacă sursa nu e clară. |
| `triage_claim` | Declarație inițială, nu concluzie juridică | `uses_ai`, `personal_data_ai`, `high_risk_suspected`, `expected_ai_role` | Creează acțiuni proactive și cere review/confirmare. Nu devine verdict final. |
| `needs_discovery` | Date care trebuie colectate prin intake, scan sau audit | AI inventory complet, RoPA complet, vendor/model details, AI Literacy completion, monitoring/logging evidence | Creează intake links, checklist-uri și findings inițiale. |
| `technical_evidence` | Date disponibile doar dacă infrastructura permite | logs, drift metrics, model evals, security alerts, model cards, dataset lineage | Se tratează ca nivel de maturitate monitoring, nu ca cerință obligatorie la import. |

### Sursă și încredere pe câmp

Import Center v2 trebuie să poată salva, explicit sau implicit:

- `field_source`: `crm_export`, `accounting_export`, `hr_export`, `m365_export`, `google_workspace_export`, `ropa_existing`, `vendor_contract`, `vendor_portal`, `client_claim`, `consultant_inferred`, `unknown`.
- `field_confidence`: `imported_verified`, `imported_unverified`, `client_claim`, `consultant_inferred`, `needs_intake`.
- `review_required`: `true` pentru orice câmp care influențează rolul, riscul, DPIA/FRIA sau obligațiile AI Act.

UI-ul de import trebuie să arate explicit:

- "Date verificate din fișier".
- "Date declarate de client".
- "Date inferate, necesită review".
- "Date lipsă, trimite intake".

### De unde face userul rost de date

| Rol workspace | Date pe care le are de obicei | Unde le are | Ce nu trebuie să presupunem |
| --- | --- | --- | --- |
| Cabinet / DPO extern / consultant | Lista clienților, contacte, CUI, scope contractat, status, assigned consultant | CRM, Excel, facturare, contracte, email, Notion/Sheets | Nu are automat inventarul AI, RoPA, vendorii și angajații fiecărui client. Le are doar dacă a lucrat deja pe mandatul respectiv. |
| IMM / deployer | Angajați, departamente, furnizori plătiți, aplicații folosite, procese de business | HR/payroll, Microsoft 365, Google Workspace, contabilitate, facturi, procurement, password manager, browser/app admin | Nu știe mereu ce tool are AI, dacă procesează date personale sau dacă intră în high-risk. |
| AI Builder / agenție | Clienți/proiecte, sisteme livrate, repo-uri, modele/vendors folosite, intended purpose declarat în proiect | CRM, contracte, Jira/Linear/Notion, GitHub/GitLab, Vercel/env vars, OpenAI/Mistral/Anthropic billing, arhitectură tehnică | Nu știe întotdeauna rolul legal final, dacă devine provider, dacă clientul e deployer sau ce obligații rămân la beneficiar. |

### Regula de produs

Importul trebuie să funcționeze chiar și când userul are doar date administrative minime. Dacă lipsesc datele de compliance, produsul nu blochează importul; creează următorul pas:

- Intake către client.
- Task "completează inventar AI".
- Task "confirmă rol AI Act".
- Task "rulează GDPR/DPIA screening".
- Task "atașează vendor/DPA evidence".
- Task "încarcă lista angajaților pentru AI Literacy".

Aceasta este diferența dintre un import matur și un import fals: nu cere dosarul complet înainte să poți începe; construiește dosarul din date reale, confirmări și dovezi.

## Cabinet CSV — coloane mature

Obligatoriu:

- `company_name`

Recomandat:

- `cui`
- `contact_name`
- `contact_email`
- `phone`
- `sector`
- `employees`
- `city`
- `country`
- `service_scope`: `ai_act`, `gdpr`, `ai_literacy`, `audit_pack`
- `expected_ai_role`: `deployer`, `provider`, `builder`, `unknown`
- `uses_ai`: `yes`, `no`, `unknown`
- `known_ai_tools`
- `personal_data_ai`: `yes`, `no`, `unknown`
- `high_risk_suspected`: `yes`, `no`, `unknown`
- `assigned_to`
- `client_status`: `lead`, `active`, `paused`, `archived`
- `intake_email`
- `send_intake`: `yes`, `no`
- `notes`
- `tags`
- `external_id`

## Ce trebuie să facă importul

- Detectează coloane automat în RO/EN.
- Acceptă CSV/TSV din Excel.
- Arată preview cu rânduri valide, duplicate, email invalid, CUI invalid.
- Creează organizații client în cabinet.
- Salvează metadata clientului în `clientMeta`.
- Dacă `send_intake=yes`, generează magic link/intake pentru client.
- Dacă `send_intake=yes`, creează acțiune reală în `De rezolvat`: trimite/completează intake.
- Dacă `uses_ai=yes`, creează acțiune reală în `De rezolvat`: `complete_ai_inventory`.
- Dacă `personal_data_ai=yes`, creează acțiune reală în `De rezolvat`: `gdpr_dpia_review`.
- Dacă `service_scope` include `ai_literacy`, creează acțiune reală în `De rezolvat`: `ai_literacy_task`.
- Dacă `high_risk_suspected=yes`, creează acțiune reală în `De rezolvat`: `role_risk_review`.
- Fiecare acțiune inițială trebuie să fie `ScanFinding` cu problemă, impact, acțiune, sursă, articol legal și evidence required.
- După import, clientul apare în Portofoliu, nu într-un ecran mort.

## IA / UX

- `Clienți` = registru + import + onboarding client.
- `Portofoliu` = triaj cross-client și execuție.
- Nu dublăm conceptele în sidebar.
- Importul trebuie să explice ce va crea înainte să execute.
- Importul trebuie să fie recoverable: rândurile cu erori sunt respinse, cele valide pot continua.

## Roadmap după Cabinet import

1. Import nested pentru sisteme AI pe client.
   - Acceptă `name`, `purpose`, `department`, `owner`, `vendor`, `model_type`, `known_ai_tools`, `uses_personal_data`, `automated_decisions`, `human_review`, `notes`.
   - `uses_personal_data`, `automated_decisions`, `human_review`, `risk_level` sunt `triage_claim`, nu verdict.
   - Dacă lipsesc, creează intake / questionnaire pentru owner-ul procesului.
2. Import furnizori/models pe client.
   - Acceptă `vendor_name`, `product_used`, `contact_email`, `region`, `dpa_status`, `dpa_url`, `subprocessors_url`, `security_evidence_url`, `ai_terms_url`, `linked_ai_systems`.
   - Dacă lipsesc `dpa_status`, `subprocessors`, `input_retention` sau `training_opt_out`, creează vendor review task.
3. Import RoPA / data map pe client.
   - Acceptă import din RoPA existent, Excel/Sheets sau privacy tools.
   - Dacă firma nu are RoPA, importul nu inventează; creează Data Map intake.
   - Leagă activitățile RoPA de AI systems când apar aceleași departamente/procese/vendors.
4. Import angajați pentru AI Literacy.
   - Acceptă `employee_name`, `email`, `role`, `department`, `manager`, `uses_ai`, `ai_tools`, `training_completed`, `training_date`, `certificate_url`.
   - Lista de persoane poate veni din HR/Microsoft/Google, dar training completion există doar dacă trainingul a avut loc.
   - Dacă `training_completed` lipsește sau este `no`, creează assignment AI Literacy.
5. AI Builder project import.
   - Acceptă `project_name`, `client_name`, `client_contact`, `intended_purpose`, `ai_system_name`, `models_used`, `vendors`, `personal_data`, `handover_owner`, `production_status`, `repo_url`, `logging_available`.
   - Scop: client handover pack, nu verdict legal final fără review.
6. IMM import center.
   - Aceleași date, dar scoped pe organizația proprie.
   - Include "Nu am fișier" pentru fiecare categorie, cu intake intern ghidat.

## Import Center v2 — IA propusă

Import Center trebuie să aibă 5 taburi operaționale:

1. `Clienți`
2. `Sisteme AI`
3. `Furnizori / Modele`
4. `RoPA / Fluxuri date`
5. `Persoane AI Literacy`

Fiecare tab are două căi:

- "Am fișier" — upload/paste CSV/TSV/Excel export.
- "Nu am fișier" — generează intake/checklist către client, owner intern sau builder.

După import, userul nu rămâne într-un ecran mort. Este dus în:

- `Portofoliu` pentru Cabinet.
- `Inventar AI` pentru IMM.
- `Client handover / Project workspace` pentru AI Builder.

## Surse reale de export / colectare folosite ca ipoteză de produs

- CRM / sales tools: export clienți, companii și contacte.
- Accounting / billing: firme, CUI, email facturare, status client.
- Microsoft 365 / Google Workspace: utilizatori, grupuri, rapoarte admin, aplicații conectate.
- HR/payroll/LMS: angajați, roluri, departamente, training completion.
- Privacy tools / RoPA spreadsheets: activități Art. 30, procese, categorii date, procesatori.
- Vendor portals / DPA pages: DPA, subprocessors, security docs, data residency, AI terms.
- Project tools: Jira, Linear, Notion, GitHub/GitLab, repo/env/config pentru AI Builder.

Aceste surse justifică importul ca workflow real, dar nu justifică să presupunem că fiecare client le are complet sau curat.

## Claim public sigur

CompliRoAI transformă importul de clienți în pregătire de execuție AI Act + GDPR: client, rol AI estimat, semnale de inventar AI, DPIA/GDPR, AI Literacy și intake auditabil.

## Stadiu implementat — 2026-05-26

Cabinet import este implementat ca flow utilizabil:

- CSV/TSV paste/upload cu detectare coloane RO/EN.
- Preview cu rânduri valide, erori și avertismente.
- Creare client workspace în portofoliul cabinetului.
- Salvare metadata în `clientMeta`.
- Generare acțiuni inițiale în `De rezolvat` pentru:
  - intake;
  - inventar AI;
  - DPIA/GDPR review;
  - AI Literacy;
  - role/risk review.
- Redirect după import în `Portofoliu`.
- Intrare în execuția clientului din `Portofoliu`.
- Atașare dovadă pe finding importat.
- Marcare finding rezolvat.
- Ieșire din execuția clientului înapoi în Cabinet.
- Audit Pack export pentru client importat.

Verificare automată:

- Radu consultant E2E critic: 1/1 pass.
- Import Center v2 smoke UI: pass.
- Unit import: 7/7 pass.
- `npm run build`: pass.

## Ce rămâne separat, nu amestecat în Cabinet import v1

Acestea rămân roadmap imediat, nu promisiune livrată deja:

- Import nested pentru sisteme AI per client.
- Import furnizori / modele / vendors per client.
- Import RoPA / data map per client.
- Import angajați pentru AI Literacy.
- AI Builder project import cu beneficiar, modele, intended purpose și handover.
- IMM import center pentru aceleași date, scoped pe organizația proprie.
