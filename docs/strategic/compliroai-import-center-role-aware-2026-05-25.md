# CompliRoAI Import Center — role-aware, proactive onboarding

Status: mandat de execuție pentru maturizarea importurilor.
Data: 2026-05-25.

## Decizie

Importul nu este doar un CSV de firme. Pentru CompliRoAI, importul este bulk onboarding de execuție:

- Cabinet importă portofoliu de clienți și context inițial pentru fiecare client.
- IMM importă datele propriei organizații: inventar AI, furnizori, RoPA, angajați AI Literacy.
- AI Builder importă proiecte/sisteme livrate, clienți beneficiari, modele/vendors, intended purpose și responsabilități de handover.

Cabinetul este nivelul de sus: trebuie să poată importa și datele pe care le folosesc IMM și AI Builder, dar scoped pe fiecare client.

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
- Dacă `uses_ai=yes`, creează semnal inițial: `complete_ai_inventory`.
- Dacă `personal_data_ai=yes`, creează semnal inițial: `gdpr_dpia_review`.
- Dacă `service_scope` include `ai_literacy`, creează semnal inițial: `ai_literacy_task`.
- Dacă `high_risk_suspected=yes`, creează semnal inițial: `role_risk_review`.
- După import, clientul apare în Portofoliu, nu într-un ecran mort.

## IA / UX

- `Clienți` = registru + import + onboarding client.
- `Portofoliu` = triaj cross-client și execuție.
- Nu dublăm conceptele în sidebar.
- Importul trebuie să explice ce va crea înainte să execute.
- Importul trebuie să fie recoverable: rândurile cu erori sunt respinse, cele valide pot continua.

## Roadmap după Cabinet import

1. Import nested pentru sisteme AI pe client.
2. Import furnizori/models pe client.
3. Import RoPA / data map pe client.
4. Import angajați pentru AI Literacy.
5. AI Builder project import: proiect, beneficiar, modele, intended purpose, handover responsibilities.
6. IMM import center: aceleași date, dar direct pe organizația proprie.

## Claim public sigur

CompliRoAI transformă importul de clienți în pregătire de execuție AI Act + GDPR: client, rol AI estimat, semnale de inventar AI, DPIA/GDPR, AI Literacy și intake auditabil.
