# CompliRoAI — AI Act Official Sources & Product Mandate

**Versiune:** 2026-05-21  
**Status:** living document / research intake  
**Scop:** colecteaza sursele oficiale, resursele educationale si concluziile de produs care trebuie transformate in CompliRoAI: surse pentru orchestrator, coverage matrix, UX guidance, Audit Pack si roadmap.

---

## 0. TL;DR

AI Act este suficient de clar ca sa cerem deja organizatiilor:

- inventar AI;
- clasificare de rol si risc;
- verificare practici interzise;
- AI literacy evidence;
- guvernanta interna;
- DPIA/FRIA unde AI atinge drepturi/date personale;
- vendor/value-chain review;
- documentatie tehnica;
- transparenta Art. 50;
- audit trail si dovezi exportabile.

Dar AI Act nu este inca suficient de plug-and-play ca sa fie transformat intr-un simplu checklist static. Exista zone in miscare: standardele armonizate, ghidajul high-risk, template-ul oficial FRIA, unele clarificari Omnibus si implementarea nationala.

**Implicație pentru produs:** CompliRoAI trebuie sa fie un workspace de executie care citeaza surse oficiale, marcheaza ce este stabil vs provisional si transforma legea in actiuni, dovezi si dosare auditabile.

---

## 1. Directie Comerciala Blocata

Nu schimbam arhitectura pe roluri. Pastram cele 3 workspace-uri:

| Workspace | Cine cumpara / foloseste | Ce trebuie sa simta in produs |
|---|---|---|
| `imm-classic` | firma care foloseste AI / deployer | "Stiu ce AI folosesc, ce risc am, ce trebuie sa fac si ce pot arata la client/regulator." |
| `ai-builder` | firma care construieste / livreaza AI | "Pot livra AI cu documentatie, logging, oversight, Annex IV, EU DB, QMS si audit readiness." |
| `cabinet` | DPO extern, avocat tech, consultant AI compliance, agentie AI | "Pot gestiona multi-client, white-label, intake, evidence, audit pack si planuri de lucru repetabile." |

Nu mergem pe verticale ca produs separat. Verticalele raman exemple comerciale si filtre contextuale:

- HR / recrutare;
- credit scoring / fintech;
- medtech / health;
- chatbot / customer support;
- AI ads / LLM commerce;
- agenti / automatizari;
- sector public.

**Regula:** legea dicteaza functionalitatile. Rolul dicteaza workspace-ul. Verticala doar coloreaza riscul, template-urile si exemplele.

---

## 2. Statut AI Act La 2026-05-21

### Cronologie oficiala

| Data | Eveniment |
|---|---|
| 2021-04-21 | Comisia propune AI Act |
| 2023-12 | acord politic Parlament - Consiliu |
| 2024-03-13 | Parlamentul adopta textul |
| 2024-05-21 | Consiliul da unda verde finala |
| 2024-07-12 | publicare in Jurnalul Oficial |
| 2024-08-01 | intrare in vigoare |
| 2025-02-02 | practici interzise + definitii + AI literacy |
| 2025-08-02 | guvernanta + GPAI |
| 2026-08-02 | majoritatea obligatiilor, inclusiv multe high-risk si transparenta |
| 2027-08-02 | high-risk din Anexa I / produse reglementate |

### Nota de produs

Produsul trebuie sa diferentieze clar:

- `In vigoare / aplicabil deja`;
- `Aplicabil la data X`;
- `Provisional / Omnibus / neconfirmat OJEU`;
- `Guidance disponibil`;
- `Guidance in asteptare`;
- `Necesita verificare umana`.

Aceasta distinctie trebuie folosita de:

- Preventive Engine;
- AI Guidance Orchestrator;
- Audit Pack;
- Legal Coverage Matrix;
- UI badges.

---

## 3. Surse Oficiale De Baza

| Sursa | Tip | Ce folosim in produs |
|---|---|---|
| EUR-Lex Regulation (EU) 2024/1689 | text legal primar | coverage matrix, citari, RAG/orchestrator, audit references |
| Comisia Europeana — AI Act regulatory framework | overview oficial | timeline, scope, narativ oficial |
| Navigating the AI Act FAQ | Q&A oficial | explicatii UI, tooltips, guidance drawer |
| AI Office | guvernanta UE | authority/cooperation, GPAI, updates |
| AI Act Service Desk | hub operational | Compliance Checker, Explorer, FAQ, timeline, guideline explorer |
| Guidelines on prohibited practices | ghid oficial | Art. 5 checks si blocked findings |
| Guidelines on AI system definition | ghid oficial | scoping si Role Assessment |
| AI Literacy Q&A + living repository | ghid oficial Art. 4 | AI Literacy Evidence Pack |
| GPAI Code of Practice + FAQ + training data summary template | guidance GPAI | future GPAI pack, builder guidance |
| National resources via Service Desk | implementari nationale | Romania/UE localization si authority mapping |

### Regula de precedenta

1. Textul OJEU/EUR-Lex prevaleaza.
2. Ghidurile Comisiei / AI Office sunt authoritative guidance, dar nu modifica textul legal.
3. Service Desk este sursa operationala prioritara pentru timeline/FAQ/checker.
4. Sursele nationale se folosesc pentru localizare, nu pentru a contrazice textul UE.
5. Law firms / cursuri / think-tank-uri sunt interpretari, nu surse deterministe.

---

## 4. Surse Educationale Gratuite Relevante

| Furnizor | Format | Limba | Relevanta pentru CompliRoAI |
|---|---|---|---|
| European Commission / AI Office webinars | webinar + slides | EN | baza oficiala pentru explicatii si update-uri |
| KI-Campus / appliedAI / TUM — EU AI Act Essentials | curs online | DE | curs gratuit solid, util ca benchmark educational |
| AI4Gov / OpenLearn Create | MOOC | EN | governance, public sector, trustworthy AI |
| AI Pact webinars | webinar oficial | EN | AI literacy, GPAI, prohibited practices |
| CNIL AI + GDPR checklist/recommendations | regulator guidance | EN/FR | privacy engineering, data protection, developer guidance |
| EDPS DPIA / AI risk guidance | regulator guidance | EN | metodologie risk/DPIA pentru institutii si organizatii |
| Netherlands FRAIA / IAMA | template impact assessment | EN | proxy bun pana apare template FRIA oficial |
| NNDKP / CMS / Bondoc / Universul Juridic | webinar/articol/eveniment RO | RO/EN | piata locala, educatie si awareness |

### Gap de piata observat

Nu exista inca un curs gratuit, complet, stabil, in limba romana, care sa acopere cap-coada:

- clasificare AI Act;
- contracte pe lantul valoric;
- FRIA/DPIA;
- GPAI;
- Art. 50 transparency;
- incident response;
- audit pack.

**Implicație comerciala:** cursurile educa piata, dar nu livreaza execution workspace. CompliRoAI trebuie pozitionat ca pasul practic dupa educatie:

> "Cursurile iti explica AI Act. CompliRoAI il transforma in inventar, actiuni, dovezi si dosar auditabil."

---

## 5. Ce Trebuie Sa Intre In Produs Din Cercetare

### 5.1 Official Sources Layer

Un registry intern de surse oficiale:

- `sourceId`;
- titlu;
- tip: `legal_text`, `faq`, `guideline`, `template`, `webinar`, `national_resource`;
- institutie;
- URL;
- data publicarii / data accesarii;
- status: `official`, `guidance`, `provisional`, `secondary`, `national`;
- articole acoperite;
- module care folosesc sursa.

Folosire:

- orchestrator;
- RAG legal;
- coverage matrix;
- Audit Pack;
- UI drawer "Surse consultate".

### 5.2 AI Act Timeline Engine

Trebuie sa existe un engine unitar pentru deadline-uri:

- Art. 4 AI literacy;
- Art. 5 practici interzise;
- GPAI;
- high-risk;
- Art. 50 transparency;
- Anexa I / produse reglementate;
- Omnibus / provisional deadlines.

Output:

- badge in UI;
- reminder;
- plan item in orchestrator;
- Audit Pack timeline;
- explanation text in Romanian.

### 5.3 AI Literacy Evidence Pack

Art. 4 nu este doar un modul de training. Trebuie sa produca dovezi:

- rol angajat / echipa;
- expunere la AI;
- risc context;
- training asignat;
- completare;
- test / confirmare;
- sursa materialului;
- data;
- semnatura / audit event;
- export in Audit Pack.

### 5.4 Guidance Status / Confidence Discipline

Orice recomandare generata de AI Guidance Orchestrator trebuie sa arate:

- ce articol o sustine;
- ce sursa a fost consultata;
- daca este lege, guideline, FAQ, interpretare sau provisional;
- ce a fost omis si de ce;
- cand trebuie verificat uman.

Interzis:

- inventarea articolelor;
- inventarea termenelor;
- inventarea obligatiilor;
- auto-executie fara user.

### 5.5 Romania Market Gap Layer

Pentru landing/deck/demo:

- piata locala este educata prin cursuri si consultanti, dar nu are inca tool operational dominant;
- DPO / avocat tech / consultant privacy este wedge principal;
- AI automation agencies sunt wedge secundar;
- IMM direct este util, dar greu de vandut fara trigger extern.

---

## 6. Implicatii Pentru AI Guidance Orchestrator

Orchestratorul trebuie sa ramana strat de compozitie, nu sursa juridica.

### Sursa de adevar

| Subiect | Sursa determinista |
|---|---|
| articole si obligatii | coverage matrix + AI Act text + official sources registry |
| risc si rol | role/risk classifier |
| deadline | timeline engine |
| gap-uri | findings + preventive engine + module states |
| status dovezi | evidence store + audit log |
| plan de lucru | guidance orchestrator |
| formulare text | Mistral/AI composer, optional si validat |

### Ce face orchestratorul

- citeste state-ul aplicatiei;
- gaseste actiunile relevante;
- ordoneaza dupa risc, deadline si impact;
- explica "de ce asta acum";
- citeaza articolele si sursele;
- arata omisiunile;
- compara planul de ieri cu planul de azi;
- regenereaza dupa actiuni rezolvate;
- salveaza audit trail.

### Ce nu face orchestratorul

- nu inchide findings singur;
- nu trimite emailuri singur;
- nu accepta dovezi singur;
- nu schimba verdict juridic;
- nu creeaza obligatii noi.

---

## 7. Impact Pe Backlog / Mandat

### P0 — trebuie pentru credibilitate juridica

- Official Sources Layer.
- AI Act Timeline Engine.
- Guidance Status badges.
- AI Literacy Evidence Pack.
- AI Guidance Orchestrator legat de surse oficiale.
- Audit Pack cu sectiune "Surse consultate".

### P1 — diferentiere serioasa fata de cursuri/consultanta manuala

- RAG legal controlat pe surse oficiale.
- Drawer "De ce recomanda AI asta?".
- Drawer "De ce a omis X?".
- Plan comparison: ieri vs azi.
- Re-scan dupa rezolvare actiune.
- Export plan de lucru.

### P2 — roadmap pentru provider-grade si enterprise

- Data/model evidence layer pentru Art. 10.
- Accuracy/robustness/cybersecurity metrics pentru Art. 15.
- Provider instruction pack pentru Art. 13.
- EU Declaration / CE pack extensii.
- GPAI pack Art. 53-55 cand apare semnal real.

---

## 8. Cum Ingestionam Resursele Urmatoare

Pentru fiecare resursa noua adaugata de echipa, completam:

```text
Sursa:
URL:
Tip: legal_text / faq / guideline / course / webinar / law_firm / academic / market_signal
Institutie / autor:
Data publicare:
Data accesare:
Status: official / guidance / secondary / market_signal / provisional
Articole AI Act atinse:
Framework-uri adiacente: GDPR / ePrivacy / NIS2 AI / DORA AI / ISO 42001 / none
Ce spune pe scurt:
Impact in produs:
Backlog:
Risc daca ignoram:
```

---

## 9. Research Drop — 2026-05-21

### 9.1 Concluzii principale

- AI Act este deja operational pe Art. 4 si Art. 5.
- Organizatiile trebuie sa inceapa cu inventar, clasificare, literacy si governance, nu cu PDF final.
- Sursele oficiale au devenit mai bune in 2025-2026: Service Desk, Explorer, Checker, FAQ, guidelines.
- Standardele si unele template-uri operationale raman in miscare.
- Romania are semnal de piata, dar nu are infrastructura educationala gratuita completa si stabila.
- Cursurile si webinariile creeaza awareness, dar nu rezolva executia.
- CompliRoAI trebuie sa fie "execution layer" si nu doar "education layer".

### 9.2 Resurse URL initiale

```text
https://oeil.secure.europarl.europa.eu/oeil/en/procedure-file?reference=2021%2F0106%28COD%29
https://eur-lex.europa.eu/procedure/EN/2021_106
https://digital-strategy.ec.europa.eu/en/library/proposal-regulation-laying-down-harmonised-rules-artificial-intelligence
https://digital-strategy.ec.europa.eu/en/library/impact-assessment-regulation-artificial-intelligence
https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai
https://digital-strategy.ec.europa.eu/ro/policies/regulatory-framework-ai
https://digital-strategy.ec.europa.eu/en/faqs/navigating-ai-act
https://consilium.europa.eu/en/policies/artificial-intelligence-act/
https://www.consilium.europa.eu/en/press/press-releases/2024/05/21/artificial-intelligence-ai-act-council-gives-final-green-light-to-the-first-worldwide-rules-on-ai/
https://www.europarl.europa.eu/news/en/press-room/20240308IPR19015/artificial-intelligence-act-meps-adopt-landmark-law
https://www.europarl.europa.eu/news/en/press-room/20231206IPR15699/artificial-intelligence-act-deal-on-comprehensive-rules-for-trustworthy-ai
https://digital-strategy.ec.europa.eu/en/policies/ai-office
https://digital-strategy.ec.europa.eu/en/policies/ai-act-governance-and-enforcement
https://digital-strategy.ec.europa.eu/en/policies/ai-pact-events
https://digital-strategy.ec.europa.eu/en/faqs/ai-literacy-questions-answers
https://digital-strategy.ec.europa.eu/ro/faqs/ai-literacy-questions-answers
https://digital-strategy.ec.europa.eu/en/library/living-repository-foster-learning-and-exchange-ai-literacy
https://digital-strategy.ec.europa.eu/en/policies/repository-ai-literacy-practices
https://digital-strategy.ec.europa.eu/en/policies/ai-code-practice
https://digital-strategy.ec.europa.eu/en/faqs/general-purpose-ai-models-ai-act-questions-answers
https://digital-strategy.ec.europa.eu/en/faqs/questions-and-answers-code-practice-general-purpose-ai
https://ai-act-service-desk.ec.europa.eu/en
https://ai-act-service-desk.ec.europa.eu/en/eu-ai-act-compliance-checker
https://ai-act-service-desk.ec.europa.eu/en/ai-act-explorer
https://ai-act-service-desk.ec.europa.eu/en/faq
https://ai-act-service-desk.ec.europa.eu/en/guideline-explorer
https://ai-act-service-desk.ec.europa.eu/en/resources
https://ai-act-service-desk.ec.europa.eu/en/national-resources
https://ki-campus.org/en/learning-opportunities/courses/eu-ai-act-essentials
https://www.open.edu/openlearncreate/course/view.php?id=11669
https://www.open.edu/openlearncreate/course/view.php?id=12579
https://ai4gov-project.eu/home/resources/training-learning/
https://www.cnil.fr/en/ai-system-development-cnils-recommendations-to-comply-gdpr
https://www.cnil.fr/sites/default/files/2026-01/ai_checklist.pdf
https://www.edps.europa.eu/data-protection-impact-assessment-dpia_en
https://www.edps.europa.eu/system/files/2025-11/2025-11-11_ai_risks_management_guidance_en.pdf
https://www.government.nl/documents/2021/07/31/impact-assessment-fundamental-rights-and-algorithms
https://www.autoriteitpersoonsgegevens.nl/en/themes/algorithms-ai/eu-ai-act
https://www.autoriteitpersoonsgegevens.nl/en/themes/algorithms-ai/algorithms-ai-and-the-gdpr/rules-for-using-ai-algorithms
https://jolas.ro/wp-content/uploads/2024/08/jolas21a8.pdf
https://adjuris.ro/books/rara/9.pdf
https://www.nndkp.ro/events/nndkp-organized-a-webinar-on-the-eu-ai-act/
https://bondoc-asociatii.ro/cracking-the-code-exploring-ai-act-for-high-risk-ai-systems/
https://cms.law/en/rou/legal-updates/enforcement-of-the-eu-ai-act-the-eu-ai-office
https://cms.law/en/rou/legal-updates/the-eu-ai-act-s-ten-key-points-of-ai-literacy
https://www.universuljuridic.ro/conferinta-nationala-de-dreptul-inteligentei-artificiale-editia-i-ai-act-cadru-juridic-european-si-model-mondial-de-reglementare-a-inteligentei-artificiale/
```

---

### 9.3 Research Drop #2 — raport general AI Act pentru antreprenori / IMM / startup-uri

**Tip:** interpretare secundara + market signal.  
**Status:** util pentru produs si messaging, dar nu devine sursa determinista fara verificare oficiala.  
**Articole / zone atinse:** Art. 3, Art. 4, Art. 5, Art. 6, Art. 9-15, Art. 17, Art. 27, Art. 49, Art. 50, GPAI, sandboxes, sanctiuni, IMM-uri.

#### Ce spune raportul pe scurt

- AI Act este primul cadru orizontal si cuprinzator pentru AI in UE.
- Legea completeaza GDPR, Data Governance Act, Data Act si Digital Services Act.
- Se aplica pe intreg lantul de viata AI: provider, deployer, importer, distributor, product manufacturer.
- Are efect extraterritorial: daca produsul/serviciul AI ajunge pe piata UE, actorii non-UE pot intra sub incidenta.
- Clasificarea pe risc ramane nucleul: prohibited, high-risk, limited-risk, minimal-risk, GPAI.
- Pentru high-risk, raportul accentueaza obligatii concrete: QMS, risk management, data governance, technical documentation, EU database, transparency, human oversight, robustness, cybersecurity, post-market monitoring, incident reporting, FRIA.
- Pentru IMM/startup, raportul subliniaza sandboxes, taxe proportionale, documentatie simplificata, training si comunicare dedicata.
- Din unghi comercial, conformarea timpurie devine avantaj competitiv: incredere, procurement mai usor, investitori, export UE, reputatie.

#### Ce este foarte valoros pentru CompliRoAI

1. **IMM-urile au nevoie de o traducere practica.** Raportul confirma ca limbajul "AI Act pentru antreprenori" trebuie sa fie orientat pe pasi: inventar, clasificare, guvernanta, documentatie, dovezi.
2. **Sandbox-urile sunt un feature/context GTM.** Chiar daca nu construim sandbox, putem avea un `Sandbox readiness pack`: ce pregatesti inainte sa aplici, ce documente exporti, ce intrebari vei primi.
3. **Costul conformarii este argument comercial.** Daca QMS/data governance high-risk poate costa mult manual, CompliRoAI trebuie sa arate economie de timp si standardizare, mai ales pentru consultant/cabinet.
4. **High-risk provider necesita dovezi tehnice, nu doar PDF-uri.** Raportul intareste P2: data/model evidence, metrics, robustness, cybersecurity, post-market monitoring.
5. **Extraterritorialitatea ajuta pitch-ul pentru AI builders.** Firmele care livreaza automatizari/chatbots/agentic AI pentru clienti UE pot folosi CompliRoAI ca pachet de audit readiness.
6. **AI Act devine branding de incredere.** Pentru builderi si agentii: "livram automatizari AI cu compliance pack inclus".

#### Impact in produs

| Insight | Modul / zona afectata | Decizie produs |
|---|---|---|
| Antreprenorii trebuie sa inceapa cu inventar si clasificare | `AI Inventory`, `Role Assessment` | onboarding si dashboard trebuie sa impinga primul pas catre inventar + risc, nu catre rapoarte |
| AI literacy se aplica deja | `AI Literacy` | trebuie evidence pack per rol/context/risc, nu doar lista de cursuri |
| High-risk cere QMS + data governance + risk lifecycle | `QMS`, `RoPA`, `AI Discovery`, `PMM` | ghidarea trebuie sa lege Art. 9, 10, 15, 17 intr-un plan unic |
| FRIA este un punct de blocaj | `FRIA` | modulul trebuie sa marcheze cand e cerut, cand e recomandat si cand e incert |
| IMM-urile au sandboxes si sprijin proportional | roadmap / GTM | adaugam "Sandbox readiness" ca template/export, nu ca modul separat |
| Costurile pot fi mari pentru provider high-risk | pricing / deck | folosim mesajul: reduce costul de structurare si repetitie, nu inlocuieste consultanta juridica |
| Investitorii si enterprise procurement cer dovezi | `Audit Pack`, `Trust Center`, `Reports` | audit pack trebuie sa fie primul asset comercial, nu un export secundar |

#### Backlog derivat

**P0 / P1, daca vrem sa folosim raportul in produs:**

- adauga `Sandbox readiness checklist` in Audit Pack / templates;
- adauga `SME proportionality note` in guidance drawer pentru IMM;
- adauga `Cost of non-compliance / manual effort` ca explicatie comerciala, nu ca verdict legal;
- intareste `AI Literacy Evidence Pack`;
- intareste `High-risk workplan`: QMS + data governance + technical documentation + oversight + PMM + incident;
- adauga `Extraterritoriality check` in Role Assessment pentru sisteme non-UE folosite/livrate in UE;
- adauga `Investor/procurement readiness` ca output optional in Audit Pack.

#### Elemente care trebuie verificate / corectate inainte de a fi folosite deterministic

| Afirmatie din raport | Risc | Actiune |
|---|---|---|
| "Regulamentul (UE) 2024/..." | incomplet | folosim doar `Regulation (EU) 2024/1689` |
| "recunoastere biometrica in timp real fara exceptii prevazute" | potential inexact; AI Act are exceptii strict limitate pentru law enforcement | verificare fata de Art. 5 si guideline prohibited practices |
| calendar "36 luni decembrie 2027 - august 2028" | potential confuz | timeline engine foloseste doar Service Desk / OJEU |
| costuri 193k-330k + mentenanta 71k | util comercial, dar trebuie sursa CEPS exacta | nu intra in UI ca cifra pana nu avem URL/sursa |
| "10% din sisteme vor fi high-risk" | util pentru deck, nu pentru engine | doar nota de market research dupa verificare |
| sandboxes Luxembourg/Spania/Lituania | util, dar trebuie verificare national resources | adaugam numai ca exemplu in research, nu ca promisiune |

#### Mesaj comercial extras

> "AI Act nu este doar risc si amenda. Pentru firmele care se pregatesc devreme, devine dovada de maturitate pentru clienti enterprise, investitori si parteneri."

> "CompliRoAI reduce haosul: inventar, clasificare, plan de lucru, dovezi si audit pack intr-un singur workspace."

---

### 9.4 Research Drop #3 — librarie monografii AI Act JSON 001-050

**Tip:** candidate scenario library / engine test corpus.  
**Status:** util pentru orchestrator, QA, demo data si seed de guidance, dar NU este sursa oficiala de lege.  
**Regula:** fiecare monografie trebuie validata fata de sursele oficiale inainte sa intre in flux determinist sau in output pentru client.

#### Fisiere primite

| Fisier | Rol | Observatii |
|---|---|---|
| `/Users/vaduvageorge/Downloads/ai_act_compliance_monographies_001_050_combined.json` | biblioteca combinata | 50 monografii, batch 001 + batch 002, range `ai-act-001..ai-act-050` |
| `/Users/vaduvageorge/Downloads/ai_act_compliance_monographies_batch_001.json` | batch initial | 25 monografii, subset din combined |

#### Metadata relevante

- proiect: `CompliRoAI / FiscaBuddyOS-style compliance engine`;
- tara/context: Romania / European Union;
- an: 2026;
- total: 50 monografii in fisierul combinat;
- status engine: toate sunt `candidate_engine_ready`;
- risc: 42 `high`, 8 `medium`;
- guardrails declarate in fisiere: `no_fake_law`, `official_sources_required`, `human_approval_required`, `production_candidate_only`, `law_vs_internal_procedure_separated`, `uncertain_2026_items_marked`.

#### Surse globale declarate in JSON

- EUR-Lex Regulation (EU) 2024/1689;
- European Commission AI Act overview;
- AI Act Service Desk;
- draft transparency guidelines Art. 50;
- draft high-risk classification guidelines;
- GPAI Code of Practice;
- GPAI provider guidelines;
- GDPR;
- EDPB DPIA guidelines;
- EDPB automated decision-making / profiling guidelines.

Acestea sunt utile ca pointers, dar trebuie deduplicate si imperecheate cu registry-ul nostru de surse oficiale.

#### Schema monografiilor

Fiecare obiect de monografie contine campuri foarte utile pentru engine:

- `id`, `title`, `category`, `subcategory`, `risk_level`, `engine_status`;
- `humanApprovalRequired`;
- `role_context`, `ai_risk_class`;
- `source_problem`, `scenario`, `critical_missing_data`, `assumptions`;
- `decision_tree`;
- `legal_basis`;
- `compliance_obligations`;
- `documents_to_request_from_client`;
- `evidence_to_collect`;
- `controls_to_implement`;
- `technical_controls`;
- `deadlines_and_timeline`;
- `gdpr_overlap`;
- `red_flags`, `edge_cases`, `manual_checks`;
- `audit_pack_outputs`;
- `orchestrator_usage`;
- `disclaimer`;
- `self_check`.

#### Acoperire tematica

| Zona | Observatii |
|---|---|
| AI Governance / Inventory | scenariu pentru lipsa inventarului AI |
| Role Assessment | provider vs deployer, value-chain, schimbare de rol |
| Prohibited Practices | manipulare, social scoring, biometric/public identification, workplace |
| AI Literacy | evidence si obligatii Art. 4 |
| Transparency Art. 50 | chatbot, deepfake, content labeling, AI ads/claims |
| High-risk Classification | Annex III, Art. 6, clasificare si exceptii |
| Provider Requirements | Art. 9-17, Annex IV, QMS, data governance, documentation |
| Deployer Obligations | Art. 26, oversight, logs, instructions, monitoring |
| FRIA | Art. 27, public sector / high-impact contexts |
| GPAI | Art. 53, Art. 55, systemic risk |
| Post-market / Incidents | Art. 72-73, CAPA, authority-facing flows |
| GDPR-AI Bridge | DPIA, Art. 22, lawful basis, data protection overlaps |
| Financial Services AI | sector example; nu devine verticala separata |

#### Exemple reprezentative

| ID | Titlu | Risc | De ce conteaza |
|---|---|---|---|
| `ai-act-inventory-missing-001` | Firma foloseste ChatGPT/Copilot/Gemini intern, dar nu are inventar AI | medium | primul pas pentru IMM/deployer |
| `ai-act-role-assessment-provider-deployer-002` | Agentia construieste chatbot AI pentru client si nu stie daca este provider sau deployer | high | foarte relevant pentru agentii de automatizari AI |
| `ai-act-prohibited-manipulation-screening-003` | Campanie AI foloseste nudging agresiv pentru a influenta decizii vulnerabile | high | Art. 5 gate / stop-go |
| `ai-act-social-scoring-004` | Platforma interna combina date de comportament pentru scor reputational | high | risc de practica interzisa / workplace |
| `ai-act-biometric-public-identification-005` | Clientul cere identificare biometrica in spatiu accesibil public | high | necesita verificare stricta Art. 5 si exceptii |

#### Articole si anexe detectate

Monografiile ating explicit: Annex I, Annex III, Annex IV, Art. 3, 4, 5, 6, 8-17, 19-28, 32-33, 35, 43, 47-50, 53, 55, 71-73, 79, 86, 95 si GDPR Art. 22.

Acoperirea este buna pentru un corpus de scenarii, dar nu inseamna acoperire juridica automata. Matricea oficiala ramane documentul de referinta pentru coverage.

#### Decizie produs

Tratam aceste fisiere ca:

1. **biblioteca de scenarii candidate** pentru AI Guidance Orchestrator;
2. **fixture set** pentru teste E2E si QA de logica;
3. **seed pentru RAG / Official Sources Layer**, doar dupa validarea citatelor;
4. **demo data realist**, dupa curatare de date si verificare a copy-ului;
5. **template library** pentru guidance, evidence requests, audit pack outputs.

Nu tratam aceste fisiere ca:

- sursa oficiala de lege;
- raspuns juridic final;
- output automat catre client fara human approval;
- baza de citare fara validare impotriva EUR-Lex / Service Desk / AI Office.

#### Backlog derivat

**P0 - inainte de folosire in productie**

- copiere controlata in repo sub `data/research/` sau `docs/research-data/`, cu nota `candidate-only`;
- script de validare JSON schema;
- script de validare citatii: fiecare articol/anexa citata trebuie sa existe in registry oficial;
- fail daca `humanApprovalRequired !== true`;
- fail daca lipseste `disclaimer` sau `self_check`;
- marcare automata `needs_human_review` pentru orice citatie incerta, guideline draft sau data 2026 in miscare.

**P1 - pentru orchestrator**

- mapare monografie -> `orchestrator candidate action`;
- transformare `documents_to_request_from_client` si `evidence_to_collect` in checklist-uri;
- transformare `controls_to_implement` in recommended actions;
- conectare `audit_pack_outputs` la export;
- jurnalizare surse consultate + prompt version + model version.

**P2 - pentru produs/comercial**

- folosire ca scenarii in demo: IMM, AI Builder, Cabinet;
- folosire ca test de "coverage practical", nu ca coverage legal;
- creare "before/after" pentru consultant: problema clientului -> plan -> evidence -> audit pack.

#### Regula pentru AI Orchestrator

Orchestratorul poate folosi aceste monografii ca inspiratie structurala si ca exemple de scenarii. Nu are voie sa citeze continutul lor ca lege. Pentru orice recomandare finala trebuie sa citeze sursa oficiala din registry si sa pastreze regula: **AI nu executa, doar recomanda; omul aproba.**

---

### 9.5 Research Drop #4 — market signals Romania: NIS2 ads, AI automation builders, AI + fiscal assistant

**Tip:** market signal / GTM input / positioning evidence.  
**Status:** util pentru messaging, ICP prioritization si roadmap discipline.  
**Regula:** nu devine sursa juridica si nu schimba produsul in afara directiei deja blocate.

#### Semnale observate

| Semnal | Ce am vazut | Ce valideaza |
|---|---|---|
| `NIS2 Romania` / ProDefence / ESET | ad + PDF ghid, limbaj puternic de `conformare`, `securitate cibernetica`, `rezilienta operationala` | exista deja awareness si buget mental pe cyber-compliance in piata RO |
| `AI & Automation Meetup Cluj` | comunitate activa, event orientat pe AI builders / automatizari / use cases reale | exista cerere reala si networking activ in zona builder / agency / automation |
| `Universul Fiscal` AI assistant ad | hook-ul "ai intrebari fiscale, primesti raspuns AI cu expertiza in spate" are engagement foarte bun | piata romaneasca accepta modelul "AI + lege/compliance + expertiza", daca pare util si aplicat |

#### Ce inseamna pentru CompliRoAI

1. **NIS2 valideaza contextul, nu pivotul.**  
   Buyerii se obisnuiesc deja cu limbajul de:
   - conformare;
   - securitate;
   - rezilienta;
   - pregatire operationala.

   Pentru noi asta inseamna ca trebuie sa pastram in CompliRoAI:
   - logging;
   - incident reporting;
   - robustness / cybersecurity framing acolo unde AI Act o cere;
   - AI-related cyber controls.

   Dar **nu** inseamna sa transformam produsul in `NIS2 full suite`.

2. **Builderii si agentiile sunt buyer real, nu doar ipoteza.**  
   Meetup-urile si comunitatile de automation confirma ca exista un strat de piata care:
   - construieste chatbots, agents, copilots, workflows;
   - are nevoie de claritate pe provider vs deployer;
   - poate folosi CompliRoAI ca layer de livrare "audit-ready".

3. **Modelul "AI + conformare asistata" este deja vandabil comportamental.**  
   Universul Fiscal valideaza o dinamica foarte importanta:
   - utilizatorul vrea raspuns rapid;
   - dar vrea sa simta ca raspunsul sta pe expertiza si lege;
   - hook-ul nu este "curs", ci "rezolva-mi problema concreta".

   Diferenta noastra trebuie sa fie maturitatea:
   - legal RAG;
   - scenario RAG;
   - audit trail;
   - evidence pack;
   - human approval.

#### Decizii GTM extrase

| Insight | Decizie |
|---|---|
| NIS2 este deja in urechea pietei | folosim limbaj de `AI governance`, `rezilienta`, `controale`, dar ramanem AI Act + GDPR product |
| Builderii sunt activi si organizati | pastram `ai-builder` ca workspace cheie si il sustinem cu messaging pentru agentii / automation shops |
| Piata accepta "AI asistat de expertiza" | orchestratorul trebuie vandut ca execution assistant cu citari si dovezi, nu ca simplu chatbot |
| Awareness-ul vine din ads, evenimente si ghiduri | landing-ul si pitch-ul trebuie sa raspunda la intrebarea: `bun, si cum fac asta concret in firma mea?` |

#### Ce NU schimbam

- nu schimbam cele 3 workspace-uri;
- nu pivotam spre `NIS2 full`;
- nu mergem pe verticale ca produse separate;
- nu vindem in prima faza "AI OS pentru absolut toti operatorii";
- nu lasam orchestratorul sa para avocat autonom.

#### Ce intarim in mesaj

Mesajul principal poate fi formulat astfel:

> "CompliRoAI este workspace-ul practic prin care firmele, consultantii si builderii transforma AI Act + GDPR in inventar, planuri de lucru, dovezi si audit packs."

Mesaj secundar pentru builderi:

> "Construiesti automatizari, agenti sau chatbots? Livreaza-le cu layer de AI Act + GDPR + evidence pack, nu doar cu prompturi si demo-uri."

Mesaj secundar pentru DPO / cabinet:

> "Nu inlocuieste judgment-ul juridic. Iti standardizeaza munca repetitiva, iti structureaza dovezile si iti accelereaza livrabilele catre client."

#### Backlog / actiuni rezultate

**P1 GTM / product messaging**

- adauga in deck/landing contrastul `education layer -> execution layer`;
- adauga messaging explicit pentru `AI automation agencies`;
- adauga formulare de intake / demo copy pentru "provider vs deployer", "ce dovezi ceri de la vendor", "ce arati la procurement".

**P1 produs**

- pastreaza AI-related cyber controls in guidance si coverage (`logging`, `incident`, `oversight`, `robustness`);
- evita orice copy care sugereaza ca vindem `NIS2 complet`;
- intareste orchestratorul ca `plan de lucru + surse + audit trail`, nu chat simplu.

**P2 comercial**

- monitorizam ads si community signals similare din RO pentru:
  - NIS2 / cyber;
  - AI builders / automation;
  - DPO / GDPR / AI governance;
- adaugam periodic noi `market signals` in acest document, distinct de sursele oficiale.

---

### 9.6 Research Drop #5 — service-first launch path fara schimbare de produs

**Tip:** GTM discipline / monetization path / execution model.  
**Status:** validat ca miscare comerciala pragmatica pentru Romania 2026.  
**Regula:** nu schimba arhitectura produsului, nu schimba cele 3 workspace-uri si nu muta CompliRoAI din zona de software in zona de consultanta pura. Este un canal de lansare si de invatare comerciala.

#### Observatie-cheie

Piata locala poate fi prea devreme pentru un `self-serve AI Act SaaS` vandut direct masiv catre IMM-uri, dar este suficient de matura pentru:

- consultanti AI Act / GDPR;
- DPO externi;
- cabinete tech-law / privacy;
- agentii de automatizare AI;
- builderi care vor sa livreze proiecte cu handover pack.

**Concluzie:** CompliRoAI poate fi folosit imediat ca `workspace-ul intern al consultantului`, fara sa schimbam directia de produs.

#### Ce inseamna concret

Nu mutam produsul din:

- `imm-classic`
- `ai-builder`
- `cabinet`

si nu adaugam un al patrulea workspace de tip `consultant app`.

In schimb, recunoastem explicit ca in faza initiala exista doua moduri legitime de monetizare:

1. **software-led**  
   clientul intra direct in CompliRoAI si foloseste workspace-ul potrivit;

2. **service-led / consultant-led**  
   consultantul foloseste CompliRoAI in spate, iar clientul cumpara:
   - audit AI use cases;
   - AI inventory;
   - role mapping;
   - AI literacy evidence;
   - DPIA / FRIA / vendor review;
   - transparency / logging / oversight packs;
   - client handover / Audit Pack.

#### De ce este bun acest model

| Motiv | Ce ne ofera |
|---|---|
| piata SaaS locala este inca devreme | nu asteptam maturizarea pietei pentru a genera venit |
| consultantul / cabinetul are deja incredere si acces la clienti | intram in deal-uri reale mai repede |
| produsul este folosit in cazuri reale, nu doar in demo | invatam ce doare cu adevarat |
| ce se repeta poate fi produsizat | roadmap-ul devine mai inteligent si mai aproape de realitate |
| dovezile si dosarele raman in platforma | software-ul continua sa fie activul strategic |

#### Ce NU inseamna

- nu devenim agency de servicii generice;
- nu ascundem produsul;
- nu renuntam la ideea de SaaS;
- nu rescriem produsul in jurul unei singure persoane;
- nu rupem directia `role-aware execution workspace`.

Pe scurt:

> service-first este modul in care intram mai repede in piata; produsul ramane acelasi, iar serviciul foloseste produsul ca motor intern de executie.

#### Model operational recomandat

**Faza 1 — consultant foloseste produsul intern**

- Cabinet / consultant / DPO extern ruleaza CompliRoAI pentru client;
- livreaza pachetul de conformare din produs;
- valideaza cu clienti reali checklist-urile, exporturile, AI Guidance si Audit Pack.

**Faza 2 — productized service**

- se vand pachete clare:
  - AI inventory + role mapping;
  - AI literacy evidence pack;
  - chatbot / copilot compliance handover;
  - AI Act + GDPR readiness review;
  - vendor / model due diligence pack.

**Faza 3 — software expansion**

- clientii care vor autonomie primesc acces direct;
- cabinetele / consultantii folosesc white-label / multi-client;
- builderii folosesc `ai-builder` pentru livrari repetitive;
- IMM-urile intra mai usor dupa ce categoria este explicata de piata.

#### Decizie GTM derivata

| Insight | Decizie |
|---|---|
| software direct catre toate IMM-urile este inca greu | nu bazam primele vanzari pe self-serve broad SMB |
| consultantii si cabinetele pot monetiza imediat nevoia | tratam `cabinet` ca wedge comercial principal |
| builderii vor sa inchida deal-uri, nu sa studieze legea | tratam `ai-builder` ca wedge secundar cu handover pack |
| produsul poate fi folosit chiar de noi pentru livrare | acceptam explicit modelul `consultant-first, software-backed` |

#### Fraza de disciplina

> Nu schimbam directia produsului. CompliRoAI ramane AI Act + GDPR execution workspace pe roluri. Doar recunoastem ca, in faza initiala, acelasi produs poate fi folosit si ca infrastructura interna pentru servicii de consultanta AI Act.

---

### 9.7 Research Drop #6 — competitor scan validated positioning

**Tip:** competitor landscape / category discipline / positioning lock.  
**Status:** foarte important pentru GTM si pentru a evita comparatii gresite.  
**Regula:** folosim acest research pentru claritate de categorie, nu pentru a umfla artificial produsul.

#### Rezumat executiv

Research-ul confirma ca setul nostru real de competitie nu este:

- cursul de AI literacy;
- avocatul care publica articole;
- chatbot-ul juridic generic;
- un tool generic de training;
- un NIS2 toolkit;
- un GRC vag "pentru toate".

Setul nostru real de competitie este intersectia dintre:

- AI Act execution;
- GDPR overlap;
- evidence production;
- export / audit pack;
- multi-client delivery;
- builder / deployer / cabinet workflows.

#### Categoriile de competitie

| Categorie | Exemple | Ce fac bine | Cum ii tratam |
|---|---|---|---|
| Big4 / advisory-led | Deloitte, PwC, KPMG, EY, Capgemini | incredere enterprise, board comfort, proiecte mari, framework-uri | nu ii atacam frontal; raspundem cu viteza, repetabilitate si execution workspace |
| Privacy / GRC + AI | OneTrust, EQS, GDPR Register, TrustArc, Securiti, BigID | registry, privacy workflows, assessments, audit trails | sunt competitie directa mai serioasa decat cursurile sau consultantii locali |
| AI governance native | Credo AI, Holistic AI, Saidot, FairNow/Optro, ModelOp, Modulos | inventory, policy, risk, governance, evidenta AI | evitam comparatia de "enterprise AI governance suite" prea devreme |
| Training / literacy-led | IAPP, TÜV, NobleProg, Simmons & Simmons | awareness, training, certificari | nu sunt competitie directa de produs; sunt competitie de atentie si lead capture |
| Consultanti / avocati locali | NNDKP, bpv, PNSA, Tudor Galoș, Law of Tech, DPO Europe | incredere locala, interpretare, relatii, lead ownership | mai degraba parteneri / canale / gatekeepers decat competitori software directi |

#### Cine sunt amenintarile reale

Research-ul spune clar ca amenintarile reale pentru CompliRoAI sunt:

- `GDPR Register`
- `EQS Privacy Cockpit`
- `OneTrust`
- `Credo AI`
- `Saidot`
- `Modulos`
- alte platforme privacy / GRC / AI governance care deja vorbesc despre:
  - registru AI;
  - risk classification;
  - evidence;
  - assessments;
  - policy / documentation.

Acestea sunt mai relevante decat:

- cursurile;
- postararile juridice;
- consultanta locala clasica;
- instrumentele educationale simple.

#### Ce valideaza despre CompliRoAI

Research-ul valideaza foarte bine ideea ca moat-ul nostru NU este:

- "stim AI Act";
- "avem continut despre AI Act";
- "putem explica legea";
- "avem un scor";
- "avem un chatbot juridic".

Moat-ul nostru trebuie sa fie:

> transformarea obligatiilor AI Act + GDPR in munca repetabila, role-aware si audit-ready pentru deployers, builders si cabinet teams.

#### Unde putem castiga

| Zona | De ce putem castiga |
|---|---|
| AI literacy evidence | nu vindem doar training; vindem dovada pe rol, context, sistem AI, data si acknowledgement |
| Cabinet mode | multi-client, white-label, reusable templates, reviewer workflows, exporturi; putini competitori par sa puna cabinet delivery in centru |
| Deployer usefulness | produsul poate fi mai simplu si mai practic decat platformele enterprise mari |
| Builder usefulness | client handover pack pentru chatbots / agents / copilots este o nevoie comerciala reala |
| AI Act + GDPR bridge | multe produse sunt ori prea privacy-first, ori prea AI-governance-first; noi putem lega cele doua intr-un flux executabil |
| Guidance cu surse oficiale | daca orchestratorul e disciplinat, putem oferi claritate fara sa parem chatbot vag |

#### Unde suntem expusi

| Risc | Ce inseamna |
|---|---|
| trust gap | brandurile mari au incredere institutionala, certificari, sandbox signals, ISO, AI Pact etc. |
| enterprise breadth gap | nu trebuie sa pretindem ca batem discovery, SSO, integrations, MLOps governance, policy engines sau data-estate scanning |
| legal liability confusion | orchestratorul nu trebuie sa para "avocat autonom" |
| category confusion | daca aratam ca un curs, chatbot juridic, GDPR register clone sau tool NIS2, pierdem imediat |
| shallow exports | daca exporturile nu sunt puternice, pierdem exact wedge-ul promis |

#### Categoria pe care trebuie sa o evitam

Nu ne pozitionam prea devreme ca:

- `enterprise AI governance platform`
- `full GRC suite`
- `NIS2 platform`
- `AI Act training product`
- `legal knowledge base`
- `AI legal chatbot`
- `model governance / MLOps assurance platform`

Toate aceste categorii fie:

- ne fac sa parem prea mici;
- ne muta in lupta cu jucatori mult mai mari;
- ne rup de buyerul nostru real;
- sau ne transforma intr-un produs prea vag.

#### Categoria pe care o blocam

Categoria corecta este:

> **CompliRoAI = AI Act + GDPR execution workspace pentru deployers, AI builders si DPO / cabinet teams.**

Formula mai concreta:

> "De la AI use case la evidence pack audit-ready: clasificare, AI literacy, DPIA / FRIA, vendor review, transparenta, logging, monitoring, incidents si exporturi intr-un workspace ghidat."

#### Mesaje validate de competitor scan

**Pentru deployers**

> "Stii ce AI folosesti, ce rol ai, ce trebuie sa faci si ce dovezi poti exporta."

**Pentru builders / agencies**

> "Livreaza fiecare chatbot, copilot, agent sau automatizare cu rol clar, handover pack, transparency notes si readiness evidence."

**Pentru DPO / cabinet**

> "Rulezi AI Act + GDPR pe mai multi clienti cu template-uri reutilizabile, white-label exports si reviewer workflows."

**Anti-Big4**

> "Big advisory firms iti spun ce inseamna AI Act. CompliRoAI te ajuta sa dovedesti ce ai facut."

**Anti-enterprise-platform**

> "Platformele mari guverneaza intregul AI estate. CompliRoAI face urmatorul workflow AI clasificat, documentat, revizuit si audit-ready."

#### Ce nu promitem

- nu promitem `compliance guaranteed`;
- nu promitem ca inlocuim avocatul sau DPO-ul;
- nu promitem breadth enterprise pe care nu il avem;
- nu promitem ca facem tot NIS2 / tot GRC / tot model governance;
- nu promitem ca simpla completare a unui formular inseamna conformitate.

#### Regula de disciplina comerciala

> Nu vindem cunoastere AI Act. Vindem executie repetabila, structurata, citabila si exportabila.

#### Decizie rezultata

Pastram:

- cele 3 workspace-uri;
- directia `AI Act + GDPR execution workspace`;
- service-first ca posibil canal de lansare;
- builder + cabinet ca wedge principal;
- deployer ca buyer operational, nu neaparat ca primul buyer direct self-serve.

Intarim:

- evidence quality;
- cabinet mode;
- exporturile;
- source traceability;
- orchestratorul cu official-source discipline;
- messaging-ul clar anti-category-confusion.

---

### 9.8 Research Drop #7 — workspace architecture validation and scope discipline

**Tip:** architecture validation / legal role model / public claims discipline.  
**Status:** directie confirmata.  
**Regula:** cele 3 workspace-uri raman, dar toate trebuie sa intre in acelasi legal/evidence engine.

#### Verdict executiv

Arhitectura cu 3 workspace-uri este coerenta comercial si juridic:

- `imm-classic` = workspace pentru deployer / SME care foloseste AI;
- `ai-builder` = workspace pentru builder, automation agency, integrator sau downstream provider;
- `cabinet` = workspace multi-client pentru DPO, consultant, avocat, privacy firm sau AI compliance advisor.

Conditia esentiala:

> Cele 3 workspace-uri sunt moduri de intrare in acelasi motor juridic si de evidenta, nu 3 produse separate.

AI Act nu este organizat pe verticale de produs, ci pe:

- rol legal;
- risc;
- intended purpose;
- deployment context;
- value-chain responsibility;
- obligatii aplicabile pe actor.

De aceea, arhitectura corecta este `role-based first, vertical second`.

#### Regula juridica importanta

Nu clasificam rolul legal doar la nivel de cont.

Aceeasi companie poate fi:

- deployer pentru un AI tool;
- provider pentru alt sistem AI;
- processor GDPR intr-un proiect client;
- controller GDPR in alt flux;
- downstream provider cand integreaza un GPAI model;
- nou provider daca rebranduieste, modifica substantial sau schimba intended purpose-ul unui high-risk AI system.

Decizie de produs:

> Rolul AI Act + GDPR trebuie clasificat per `AI system / use case`, nu doar per workspace.

Workspace-ul spune cum lucreaza buyerul. Use case-ul spune care este rolul legal si ce obligatii apar.

#### Verticalele raman scenario packs, nu produse separate

Verticalele utile:

- HR / recruitment AI;
- customer support chatbot;
- credit / scoring workflow;
- education / assessment workflow;
- public-sector decision support;
- medical-adjacent workflow;
- internal productivity AI;
- AI agents / automation fleets;
- marketing / AI ads / LLM commerce.

Acestea trebuie sa fie:

- tags;
- guided templates;
- scenario packs;
- risk hints;
- evidence templates;
- suggested owners.

Nu devin:

- workspace-uri noi;
- pricing tiers separate;
- produse separate;
- arhitecturi separate.

#### Fit pe fiecare workspace

| Workspace | Fit | Ce promitem in siguranta | Ce evitam |
|---|---|---|---|
| `imm-classic` / deployer | cel mai solid legal si operational | ajuta deployerii sa structureze si sa evidentieze readiness AI Act + GDPR | nu spunem "te face conform" |
| `ai-builder` / agency | foarte bun comercial, dar juridic delicat | handover pack, role split, intended purpose, vendor/model records, limitations, instructions, transparency, logging expectations | nu promitem provider compliance complet pentru high-risk |
| `cabinet` / DPO-consultant | probabil cel mai bun wedge comercial | multi-client delivery, templates, review trails, white-label packs, client evidence | nu spunem ca inlocuieste DPO-ul, avocatul, auditorul sau notified body |

#### Shared engine

Motorul comun ramane:

```text
AI use case -> AI system determination -> role classification -> risk classification -> obligations -> tasks -> evidence -> review -> audit pack
```

Output-urile se schimba pe workspace, dar motorul este acelasi:

- deployer primeste readiness file;
- builder primeste client handover pack;
- cabinet primeste white-label client pack si reviewer trail.

#### Adjacent scope obligatoriu

CompliRoAI trebuie sa acopere strict ariile adiacente care sunt declansate de AI Act + GDPR.

| Zona | Status | Minimum product scope |
|---|---|---|
| GDPR overlap | necesar legal cand exista date personale | personal data screen, special category screen, controller/processor map, lawful basis prompt, RoPA link, DPIA trigger, Art. 22 screen, DPA/subprocessor review |
| ePrivacy | trigger-based, nu platforma separata | cookies/tracking, chatbot storage/access, conversation analytics, marketing automation, terminal equipment access |
| AI cyber/resilience | necesar pentru high-risk si sensitive deployments | prompt injection, data leakage, unauthorized access, logs, model/vendor dependency risk, incident path, fallback/override |
| vendor / contract / value-chain | foarte important legal si comercial | vendor identity, model/system used, intended purpose, role split, instructions, limitations, logging, incident contact, DPA/subprocessors, handover pack |

#### Out of scope acum

Nu facem core product din:

- full generic compliance OS;
- full NIS2 compliance;
- full DORA compliance;
- full ISO 27001 / SOC 2 platform;
- full ISO 42001 certification platform;
- full ePrivacy / cookie CMP;
- full GDPR privacy suite;
- full DSAR automation;
- full breach management platform;
- full contract lifecycle management;
- full vendor risk management;
- MDR / medical device compliance;
- financial services regulatory compliance;
- employment law compliance;
- consumer law compliance;
- DSA / platform governance;
- Data Act compliance;
- foundation model / GPAI provider compliance for model labs;
- CE marking or notified-body conformity assessment;
- technical model validation, bias audits, adversarial testing, red-teaming, unless done through qualified partners;
- continuous model monitoring / MLOps observability without real integrations;
- legal advice chatbot positioning.

Aceste zone pot aparea doar ca triggers, references, evidence requirements sau partner handoff.

#### Categoria corecta vs categoria riscanta

Categoria corecta:

> AI Act + GDPR execution workspace pentru real AI use cases.

Categoria riscanta:

> AI Compliance OS.

Motiv:

`AI Compliance OS` sugereaza automat all AI laws, all jurisdictions, all model governance, all cyber, all privacy, all GRC, all technical controls si enterprise integrations. Asta ne arunca prea devreme in comparatie directa cu OneTrust, Credo AI, IBM, Modulos, GRC suites si privacy suites.

#### Claims sigure

Putem spune:

- "AI Act + GDPR execution workspace";
- "helps classify AI use cases by role, risk and context";
- "supports deployers, AI builders and consultants through role-aware workflows";
- "creates evidence packs for AI Act readiness";
- "supports AI literacy records and role-based guidance";
- "maps GDPR overlap where personal data is involved";
- "supports DPIA and FRIA readiness workflows where applicable";
- "supports AI-specific vendor review and handover documentation";
- "built around official legal sources and scenario-based workflows";
- "designed for multi-client cabinet delivery".

#### Claims de evitat

Nu spunem:

- "makes you AI Act compliant";
- "guarantees compliance";
- "complete AI governance platform";
- "full GDPR compliance";
- "full NIS2 / cyber compliance";
- "AI Act certification";
- "certified AI literacy";
- "replaces lawyers / DPOs / auditors";
- "handles conformity assessment";
- "covers all AI laws globally";
- "Romania's first / only AI Act platform" fara verificare independenta;
- "officially approved AI Act tool" fara aprobare reala.

#### Positioning statements aprobate

**Website hero**

> AI Act + GDPR execution workspace for real AI use cases. Classify your role and risk, run the right workflows, document GDPR overlap, and export evidence packs for AI Act readiness.

**Consultant / cabinet**

> Deliver AI Act + GDPR readiness across multiple clients from one cabinet workspace.

**AI builder / agency**

> Ship AI automations with compliance handover built in.

**Deployer / SME**

> Turn every AI workflow into a documented readiness file.

#### Decizie rezultata

Arhitectura ramane corecta.

Testul real este disciplina de scope:

- nu mergem pe breadth fals;
- nu vindem OS universal;
- nu promitem legal certainty;
- nu intram frontal in enterprise model governance;
- castigam prin evidence execution.

Formula de inchidere:

> De la use case -> role/risk classification -> AI literacy evidence -> DPIA/FRIA/vendor/transparency/logging workflows -> exportable readiness pack.

---

### 9.9 Research Drop #8 — Outside-in AI Discovery / Shadow AI Radar

**Tip:** product opportunity / lead-gen / onboarding accelerator.  
**Status:** util, dar nu verdict legal automat.  
**Regula:** scannerul descopera semnale publice si porneste discovery-ul; omul confirma, iar motorul juridic decide workflow-ul.

#### Ideea

CompliRoAI poate scana exterior o firma, pornind de la domeniul public, ca sa detecteze semnale ca exista AI, automatizari, tracking, chatbots, AI claims sau riscuri GDPR/ePrivacy.

Acest feature nu trebuie vandut ca:

- detector legal final;
- AI Act compliance verdict;
- scanner tehnic complet de securitate;
- garantie ca firma foloseste sau nu foloseste AI.

Trebuie vandut ca:

> radar public de semnale AI / automation / tracking care creeaza drafturi de AI use cases si intrebari de confirmare.

#### Ce poate scana

Surse publice utile:

- homepage si pagini cheie;
- `meta` tags;
- HTTP headers;
- `robots.txt`;
- `sitemap.xml`;
- eventual `llms.txt` daca exista;
- structured data / schema;
- privacy policy;
- cookie policy;
- terms;
- scripturi publice;
- widgeturi publice;
- texte de marketing si claims;
- pagini de produs;
- careers / HR pages;
- support / chatbot pages.

Semnale cautate:

- "AI assistant";
- "chatbot";
- "agent";
- "automation";
- "copilot";
- "machine learning";
- "profiling";
- "automated decision";
- "personalized recommendations";
- "AI generated";
- "model";
- "OpenAI";
- "ChatGPT";
- "Claude";
- "Gemini";
- vendor scripts: Intercom, Drift, Tidio, Crisp, Botpress, Chatbase, HubSpot, Manychat etc.;
- tracking / pixels / analytics / CRM scripts;
- AI Ads / AI claims;
- AEO / agentic search optimization signals.

#### Ce produce

Output-ul trebuie sa fie formulat ca semnale, nu certitudine:

```text
Am detectat chatbot public + tracking scripts + privacy policy fara mentiune clara despre AI.
Confirma daca chatbotul colecteaza date personale si daca exista vendor / model / retention policy.
```

Drafturi create automat:

- possible AI use case;
- possible vendor / model;
- possible GDPR trigger;
- possible ePrivacy trigger;
- possible transparency notice requirement;
- possible AI Ads & Claims issue;
- possible vendor review;
- intrebari de confirmare pentru client;
- recommended next workflow in CompliRoAI.

#### De ce conteaza comercial

Outside-in discovery ajuta la:

- onboarding rapid pentru cabinet;
- lead-gen pentru consultanti;
- audit initial pentru clienti noi;
- gasirea shadow AI / public AI usage;
- demonstratie de valoare in primele 5 minute;
- transformarea unui site scan intr-un draft de readiness file.

Pentru cabinet, devine:

> "Baga domeniul clientului si primesti lista initiala de semnale AI/GDPR/ePrivacy de validat."

Pentru AI builder, devine:

> "Scaneaza ce ai livrat public si genereaza handover checklist pentru client."

Pentru deployer, devine:

> "Vezi ce semnale publice ai deja si ce trebuie confirmat intern."

#### AEO / agentic relevance

AEO si agentic search nu sunt obligatii AI Act directe.

Sunt relevante ca:

- semnal comercial ca firma optimizeaza pentru AI/search agents;
- semnal de claims / marketing;
- posibil trigger pentru AI Ads & Claims;
- context pentru automatizari si continut generat;
- input pentru discovery.

Nu sunt suficiente singure pentru un finding legal.

#### Unde intra in produs

Loc recomandat:

- `Descoperire AI`;
- optional CTA in Cabinet: "Scaneaza domeniu client";
- optional CTA in AI Builder: "Verifica proiect public";
- optional CTA in Deployer: "Scaneaza website firma".

Nume posibile:

- `Outside-in AI Discovery`;
- `Shadow AI Radar`;
- `Public AI Signal Scan`;
- `AI Footprint Scan`.

Decizie temporara:

> Il pastram ca functionalitate candidata dupa stabilizarea flow-urilor actuale. Nu il implementam inainte sa stim maturitatea reala a functionalitatilor deja existente.

---

## 10. Decizie Curenta

Pastram directia:

> CompliRoAI = AI Act + GDPR execution workspace, role-aware, audit-pack-first.

Nu spargem produsul in verticale. Nu schimbam workspace-urile. Adaugam un strat mai solid de surse oficiale, status juridic, AI literacy evidence si guidance defensibil.

Urmatorul pas dupa ce vin resursele noi:

1. completam acest document;
2. deduplicam sursele;
3. transformam in backlog pentru Official Sources Layer + Timeline Engine + Orchestrator Legal Source Discipline;
4. abia apoi implementam in sprint.
