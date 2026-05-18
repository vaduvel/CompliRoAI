# CompliRoAI — Biblioteca de automatizari AI si mapare compliance

**Versiune:** 1.0 — 17 mai 2026  
**Status:** Document de lucru pentru rafinare produs, onboarding si sales  
**Relatie cu spec-ul principal:** completeaza `compliroai-functional-spec-v2.md`  
**Decizie locked:** CompliRoAI ramane AI Compliance OS generalist. Verticalele nu sunt produse separate; sunt contexte de risc si workflow-uri pentru roluri diferite.

---

## 0. TL;DR

CompliRoAI nu trebuie sa ghiceasca piata dupa verticale. Legea dicteaza ce trebuie dovedit. Piata dicteaza doar **cum intra AI-ul in munca reala**.

Aceasta biblioteca raspunde la intrebarea:

> "Ce tipuri de automatizari AI folosesc sau construiesc firmele, si ce trebuie sa intre automat in CompliRoAI pentru fiecare?"

Produsul trebuie sa recunoasca rapid un caz de AI, apoi sa genereze:

- rolul legal al clientului: deployer, provider, importer, distributor sau combinatie;
- nivelul de risc: prohibited, high-risk, transparency/limited, minimal;
- impact GDPR: date personale, date sensibile, profilare, Art. 22, DPIA;
- obligatii AI Act: literacy, transparency, inventory, Annex IV, EU DB, FRIA, human oversight, logging, PMM, incident;
- findings actionabile;
- documente si dovezi pentru Audit Pack.

---

## 1. Cum folosim biblioteca in produs

### 1.1 In onboarding

Onboarding-ul nu intreaba generic "folositi AI?". Intreaba pe limbaj de business:

- "Aveti chatbot pe site, WhatsApp, Messenger sau helpdesk?"
- "Folositi ChatGPT, Gemini, Copilot sau un agent intern cu documentele firmei?"
- "Folositi AI pentru CV-uri, interviuri, scoring clienti, recomandari, preturi, fraude, suport, medicina, educatie sau securitate?"
- "Construiti AI pentru clienti?"
- "AI-ul ia decizii automat sau doar sugereaza unui om?"
- "Ce date intra in AI: clienti, angajati, copii, pacienti, financiar, comportament, locatie, biometrie?"

### 1.2 In AI Inventory

Fiecare automatizare devine un `AI System Record`:

- nume sistem;
- categorie din biblioteca;
- rol client: deployer/provider/dual;
- departament;
- scop;
- vendor/model;
- date procesate;
- persoane afectate;
- output generat;
- human review;
- training/fine-tuning on/off;
- transfer extern;
- retention;
- risc AI Act;
- impact GDPR;
- documente cerute;
- status dovezi.

### 1.3 In Findings/Dosar/Resolve

Biblioteca trebuie sa genereze automat findings:

- "AI inventory incomplet";
- "AI literacy lipsa";
- "Transparency notice lipsa";
- "DPIA recomandata/obligatorie";
- "Art. 22 profiling check necesar";
- "Vendor DPA lipsa";
- "High-risk candidate";
- "Human oversight nedocumentat";
- "Logging evidence lipsa";
- "Post-market monitoring lipsa";
- "EU Database entry necesara";
- "Annex IV incomplet";
- "Incident reporting playbook lipsa".

### 1.4 In Audit Pack

Audit Pack trebuie sa exporte pentru fiecare AI system:

- classifier result;
- role assessment;
- risk rationale;
- data map;
- GDPR impact;
- vendor evidence;
- transparency notice;
- literacy evidence;
- DPIA/FRIA daca exista;
- human oversight protocol;
- logs/evidence;
- approval trail;
- change log;
- remediation status.

---

## 2. Reguli de clasificare rapida

### 2.1 Prohibited risk candidates

Aceste cazuri trebuie marcate instant ca risc critic si trimise la review uman:

- social scoring al persoanelor;
- manipulare subliminala sau exploatarea vulnerabilitatilor;
- biometric categorisation pentru categorii sensibile;
- emotion recognition in workplace sau education, cu exceptii foarte limitate;
- predictive policing individualizat;
- untargeted scraping facial images pentru baze biometrice;
- real-time remote biometric identification in spatii publice, cu exceptii de law enforcement;
- AI nudifier / generare non-consensuala de continut intim.

### 2.2 High-risk candidates

Aceste cazuri necesita tratament high-risk candidate pana la review:

- recrutare, selectie CV, ranking candidati, interviuri AI;
- decizii de angajare, promovare, concediere, evaluare performanta;
- acces la educatie, evaluare elevi/studenti, proctoring;
- credit scoring, creditworthiness, underwriting;
- acces la servicii esentiale private sau publice;
- medicina, triage, diagnostic, recomandari clinice;
- biometrie pentru identificare;
- law enforcement, migration, asylum, border control;
- administratie publica si beneficii sociale;
- sisteme AI in infrastructura critica;
- siguranta produselor reglementate.

### 2.3 Transparency / limited risk candidates

Aceste cazuri necesita in principal transparenta, notificare si control:

- chatbot care interactioneaza cu persoane;
- generare continut text, imagine, audio, video;
- deepfake sau continut sintetic;
- AI assistant pentru suport clienti;
- AI care personalizeaza marketing;
- AI care recomanda produse;
- AI care sumarizeaza conversatii;
- AI care analizeaza sentimentul clientilor, fara workplace/education emotion recognition.

### 2.4 Minimal risk candidates

Aceste cazuri sunt de regula low/minimal, dar pot declansa GDPR/vendor obligations:

- grammar correction;
- traduceri interne fara date personale sensibile;
- sumarizare documente publice;
- generare idei de marketing fara profilare;
- code assistant fara date clienti;
- image generation pentru creativ, fara persoane reale/biometrie;
- cautare interna pe documente non-sensibile.

---

## 3. Biblioteca principala de automatizari AI

### 3.1 Customer Support AI

| Automatizare | Exemple reale | Risc initial | Obligatii CompliRoAI |
|---|---|---|---|
| Chatbot site / WhatsApp / Messenger | raspunde la intrebari clienti, programari, retururi | Transparency + GDPR | AI inventory, transparency notice, vendor DPA, data retention, human escalation |
| Order status bot | status comanda, AWB, retur, facturi | Transparency + GDPR | DPA, data minimization, access control, logs, DSAR linkage |
| Helpdesk triage | clasifica tickete si urgenta | Minimal/Transparency | human review, fairness check daca afecteaza acces la servicii |
| Call center summarizer | transcrie si sumarizeaza apeluri | GDPR medium | notice pentru inregistrare/transcriere, retention, security, DPA |
| Sentiment analysis clienti | detecteaza clienti frustrati | Transparency/GDPR | profiling check, notice, DPIA daca impactul e semnificativ |

**Intrebari intake:**

- AI-ul discuta direct cu clientul?
- Clientul stie ca vorbeste cu AI?
- Conversatiile sunt folosite pentru training?
- Sunt colectate nume, telefon, email, adresa, comenzi, date medicale sau financiare?
- Exista transfer catre vendor extern?

**Findings generate:**

- "Transparency notice lipsa pentru chatbot";
- "DPA vendor chatbot lipsa";
- "Retention conversatii nedefinita";
- "Human escalation nedocumentat";
- "Training on customer conversations neclar".

---

### 3.2 Internal Copilot / RAG / Knowledge Assistant

| Automatizare | Exemple reale | Risc initial | Obligatii CompliRoAI |
|---|---|---|---|
| ChatGPT/Copilot pentru documente interne | angajatii pun contracte, emailuri, rapoarte | GDPR medium | AI policy, data categories, DPA, training on/off, access control |
| RAG pe Google Drive/SharePoint/Notion | cautare interna cu AI | GDPR medium/high | data map, permissions review, PII discovery, retention |
| Email drafting assistant | redacteaza raspunsuri clienti | Minimal/GDPR | human review, no automated decision, vendor DPA |
| Meeting summarizer | rezuma sedinte | GDPR medium | employee notice, retention, access rights |
| Internal HR assistant | raspunde angajatilor despre beneficii | GDPR medium/high | HR data review, access control, DPIA if sensitive |

**Intrebari intake:**

- Ce surse citeste AI-ul?
- Respecta permisiunile existente?
- Poate vedea date HR, salarii, medicale, contracte, date clienti?
- Outputul este verificat de om?
- Datele sunt folosite pentru training model?

**Findings generate:**

- "Shadow AI: tool intern nedocumentat";
- "PII discovery necesar pe knowledge base";
- "Access control review necesar";
- "AI literacy training obligatoriu";
- "DPIA recomandata pentru RAG cu date sensibile".

---

### 3.3 Sales, CRM si Marketing AI

| Automatizare | Exemple reale | Risc initial | Obligatii CompliRoAI |
|---|---|---|---|
| Lead scoring | prioritizeaza leaduri | Profiling/GDPR | Art. 22 check, transparency, lawful basis, DPIA daca impact mare |
| Marketing personalization | recomanda oferte | Profiling/GDPR | notice, consent/legitimate interest review, retention |
| Churn prediction | prezice clienti care pleaca | Profiling/GDPR | data map, fairness check, human review |
| Dynamic pricing | ajusteaza preturi | GDPR/consumer risk | profiling check, transparency, fairness review |
| Ad targeting AI | segmenteaza audiente | GDPR high | consent/LI balancing, vendor DPA, transfer review |
| ChatGPT Ads / AI Ads Manager / LLM ad placement | reclame generate, licitate sau recomandate in interfete AI | GDPR/consumer/ad compliance | claim evidence pack, creative audit log, consent/conversion tracking review, vendor/platform terms review |
| GEO / LLM visibility optimization | brandul este optimizat pentru raspunsuri in LLM-uri | Minimal/consumer trust | source-of-truth registry, claim substantiation, audit trail pentru afirmatii, no misleading claims review |
| Social listening AI | analizeaza comentarii | GDPR medium | public data basis, minimization, retention |

**Intrebari intake:**

- AI-ul influenteaza pret, oferta, acces sau tratamentul clientului?
- Se folosesc date comportamentale?
- Exista decizii automate fara om?
- Exista categorii sensibile inferate?
- Datele vin din Meta/Google/CRM/website?
- AI-ul face sau influenteaza reclame in ChatGPT/LLM-uri?
- Puteti dovedi sursa fiecarei afirmatii despre produs/brand?
- Exista tracking de conversie, cookie-uri, pixel sau audience matching?

**Findings generate:**

- "Profiling transparency lipsa";
- "Art. 22 check necesar";
- "DPIA recomandata pentru scoring/personalization";
- "Vendor ad-tech transfer review necesar";
- "Consent mechanism neconectat la AI use".
- "AI Ads claim evidence lipsa";
- "Audit log creativ/campanie AI lipsa";
- "Platform terms review lipsa pentru ChatGPT Ads/LLM commerce".

---

### 3.4 HR, Recrutare si Workplace AI

| Automatizare | Exemple reale | Risc initial | Obligatii CompliRoAI |
|---|---|---|---|
| CV screening / ranking | sorteaza candidati | High-risk candidate | high-risk workflow, DPIA, human oversight, bias evidence |
| Interview scoring | noteaza raspunsuri video/text | High-risk candidate | transparency, oversight, logging, discrimination review |
| Employee performance scoring | productivitate, KPI, risc plecare | High-risk candidate | DPIA, works council/employee notice, human review |
| Workforce scheduling | ture automate | High-risk candidate daca afecteaza drepturi | oversight, contestation, fairness |
| Employee monitoring | activity tracking, screen analytics | GDPR high/prohibited edge | DPIA, proportionality, labor law review |
| Emotion recognition la munca | emotii in call center/interviuri | Prohibited candidate | critical legal review, likely stop |

**Intrebari intake:**

- AI-ul decide cine e angajat, promovat, concediat sau evaluat?
- Candidatii/angajatii sunt informati?
- Exista om care poate schimba decizia?
- Se folosesc video, voce, expresii faciale, biometrie?
- Exista audit de bias?

**Findings generate:**

- "High-risk HR AI candidate";
- "DPIA obligatorie/recomandata";
- "Human oversight protocol lipsa";
- "Bias/fairness evidence lipsa";
- "Emotion recognition workplace poate fi interzis".

---

### 3.5 Finance, Credit, Fraud si Insurance AI

| Automatizare | Exemple reale | Risc initial | Obligatii CompliRoAI |
|---|---|---|---|
| Credit scoring | acceptare/refuz credit | High-risk candidate | high-risk, Art. 22, DPIA, FRIA, logging |
| Fraud detection | tranzactii suspecte | High-risk/contextual | oversight, false positive handling, vendor review |
| AML transaction monitoring | monitorizare risc | High-risk/contextual | audit trail, human review, DORA/NIS2 slice |
| Insurance underwriting | pret/risc asigurare | High-risk/contextual | transparency, fairness, Art. 22 |
| Collections prioritization | cine este sunat primul | Profiling/GDPR | fairness, transparency, human review |
| Invoice anomaly detection | facturi suspecte | Minimal/GDPR | vendor DPA, no fiscal module in CompliRoAI |

**Intrebari intake:**

- AI-ul influenteaza acces la credit, asigurare sau servicii financiare?
- Exista decizie automata individuala?
- Se poate contesta rezultatul?
- Sunt logate inputurile si outputurile?
- Vendorul este critic pentru serviciu?

**Findings generate:**

- "High-risk finance AI candidate";
- "FRIA necesara pentru deployer relevant";
- "Art. 22 automated decision check";
- "Logging evidence lipsa";
- "DORA AI vendor slice recomandat".

---

### 3.6 Medical, Health si Wellness AI

| Automatizare | Exemple reale | Risc initial | Obligatii CompliRoAI |
|---|---|---|---|
| Symptom checker | pacient raspunde simptome | High-risk candidate | medical review, DPIA, transparency, safety evidence |
| Diagnostic assistant | sugereaza diagnostic | High-risk/product safety | conformity, clinical evidence, oversight |
| Appointment triage | prioritizeaza pacienti | High-risk/contextual | human oversight, fairness, DPIA |
| Medical chatbot | consiliere pacienti | Transparency/high depending scope | disclaimers, escalation, DPA |
| AI pe imagistica | radiologie/dermatologie | High-risk/product | Annex IV, QMS, PMM, incident |
| Patient risk scoring | risc complicatii | High-risk | DPIA, logging, oversight |

**Intrebari intake:**

- AI-ul ofera recomandari medicale sau doar programari?
- Outputul este verificat de medic?
- Sistemul este dispozitiv medical sau integrat intr-un dispozitiv?
- Sunt date medicale procesate?
- Exista incident/safety monitoring?

**Findings generate:**

- "Health high-risk candidate";
- "DPIA obligatorie/recomandata pentru date medicale";
- "Human clinical oversight lipsa";
- "Annex IV/QMS poate fi necesar";
- "Incident reporting playbook lipsa".

---

### 3.7 Education si Training AI

| Automatizare | Exemple reale | Risc initial | Obligatii CompliRoAI |
|---|---|---|---|
| Student assessment | noteaza lucrari/teste | High-risk candidate | high-risk, oversight, contestation |
| Admissions ranking | selecteaza candidati | High-risk candidate | fairness, transparency, logging |
| Proctoring AI | detecteaza frauda la examen | High-risk/GDPR high | DPIA, biometric review, proportionality |
| Learning personalization | recomanda lectii | Medium/high contextual | transparency, child data review |
| AI tutor | chatbot educational | Transparency/GDPR | notice, child protection, safety |

**Intrebari intake:**

- AI-ul influenteaza note, admitere sau evaluare?
- Sunt implicati minori?
- Exista biometrie sau camera?
- Exista contestatie umana?
- Sunt parintii/studentii informati?

**Findings generate:**

- "Education high-risk candidate";
- "Child data protection review necesar";
- "DPIA recomandata/obligatorie";
- "Human appeal process lipsa";
- "Transparency notice pentru elevi/studenti lipsa".

---

### 3.8 E-commerce, Retail si Recommendation AI

| Automatizare | Exemple reale | Risc initial | Obligatii CompliRoAI |
|---|---|---|---|
| Product recommender | recomanda produse | Profiling/GDPR | notice, profiling check, retention |
| Search ranking AI | ordoneaza produse | Minimal/Profiling | transparency if personalization |
| Dynamic bundles | oferte personalizate | Profiling/GDPR | LI/consent review |
| Return fraud scoring | marcheaza clienti risc | Profiling/high impact | Art. 22 check, human review |
| Chatbot status comanda | raspunde automat | Transparency/GDPR | notice, vendor DPA |
| Visual search | cauta produse din poza | GDPR/biometric edge | image data review, retention |

**Intrebari intake:**

- Recomandarile sunt personalizate pe istoricul clientului?
- AI-ul poate refuza retur sau serviciu?
- Clientul are opt-out?
- Datele sunt partajate cu platforme externe?
- Se proceseaza imagini cu persoane?

**Findings generate:**

- "Profiling notice lipsa";
- "Automated return decision needs human review";
- "DPA vendor e-commerce AI lipsa";
- "Retention pentru chat/order data lipsa".

---

### 3.8.1 AI Ads, LLM Commerce si Claim Evidence

Acest use-case intra sub `sales_marketing` sau `ecommerce_retail`, nu devine produs separat. Semnal de piata: solutii precum CatyAI/Ahauros pozitioneaza protocoale de trust, GEO si claim verification pentru ChatGPT Ads / LLM visibility. CompliRoAI nu copiaza protocolul lor si nu promite ca un protocol devine "obligatoriu" legal. CompliRoAI trateaza zona ca pachet auditabil de compliance pentru reclame si afirmatii generate sau distribuite prin AI.

| Automatizare | Exemple reale | Risc initial | Obligatii CompliRoAI |
|---|---|---|---|
| ChatGPT Ads / AI Ads Manager | campanii in interfete AI, recomandari sponsorizate | GDPR/consumer/ad compliance | registru campanii AI, vendor/platform review, creative approval, conversion tracking review |
| LLM commerce recommendation | AI recomanda produsul in conversatie | Transparency/consumer trust | claim evidence, source registry, audit log al afirmatiilor |
| GEO / LLM visibility | brand optimizat sa fie gasit de AI engines | Minimal/consumer trust | no misleading claims review, source-of-truth evidence, update log |
| Claim verification / brand truth | fiecare afirmatie despre produs are sursa | Consumer/ad compliance | claim substantiation pack, reviewer approval, export pentru audit |
| AI-generated landing/creative | texte si imagini de reclama generate cu AI | Transparency/IP/consumer risk | creative log, human approval, substantiation, prohibited content check |

**Intrebari intake:**

- Folositi sau planuiti campanii in ChatGPT Ads / AI Ads / LLM commerce?
- AI-ul recomanda produse sau servicii utilizatorilor finali?
- Ce afirmatii face AI-ul despre produs: pret, garantie, performanta, certificari, conformitate?
- Exista sursa verificabila pentru fiecare afirmatie?
- Cine aproba creative-ul generat de AI?
- Aveti tracking de conversie, pixel, cookie-uri, audience matching sau CRM upload?
- Datele de conversie ajung la un vendor extern?
- Reclama poate targeta categorii vulnerabile, minori sau profiluri sensibile?

**Findings generate:**

- "Claim evidence lipsa pentru afirmatii AI Ads";
- "Creative approval trail lipsa";
- "Conversion tracking GDPR review lipsa";
- "Vendor/platform terms review lipsa";
- "Ad transparency evidence lipsa";
- "GEO/LLM source registry lipsa";
- "Potential misleading AI claim needs review".

**Audit Pack trebuie sa includa:**

- lista campaniilor AI/LLM;
- claims registry;
- sursa pentru fiecare afirmatie;
- creative approval log;
- platform/vendor review;
- GDPR tracking review;
- export cu schimbari de claims si creative.

**Pozitionare comerciala:**

> "Folosesti AI Ads sau vrei ca brandul tau sa fie recomandat corect de AI? CompliRoAI iti construieste dosarul de dovezi: ce ai afirmat, pe ce sursa, cine a aprobat, ce date ai folosit si ce risc legal exista."

---

### 3.9 Legal, Accounting si Professional Services AI

| Automatizare | Exemple reale | Risc initial | Obligatii CompliRoAI |
|---|---|---|---|
| Legal drafting AI | contracte, opinii | GDPR/confidentiality | human review, client confidentiality, vendor DPA |
| Due diligence summarizer | extrage clauze | GDPR medium | access control, retention, DPA |
| Accounting assistant | explica erori, clasifica documente | GDPR/fiscal adjacent | no fiscal workflow, but DPA/data map |
| Tax/legal chatbot | raspunde clientilor | Transparency/professional liability | disclaimer, human validation |
| Document OCR + extraction | facturi, contracte | GDPR medium | retention, storage, access |

**Intrebari intake:**

- Sunt documente client confidentiale incarcate in AI?
- Outputul este validat de profesionist?
- Vendorul poate folosi datele pentru training?
- Se pastreaza prompturile?
- Clientul a aprobat folosirea AI?

**Findings generate:**

- "Professional secrecy AI policy lipsa";
- "Human validation obligatorie";
- "Vendor training setting neconfirmat";
- "Client notice/approval lipsa".

---

### 3.10 AI Builders, Agentii de automatizare si SaaS AI

| Automatizare | Exemple reale | Risc initial | Obligatii CompliRoAI |
|---|---|---|---|
| Custom chatbot pentru clienti | agentie livreaza bot | Provider/deployer dual | role assessment, vendor/client split, docs |
| Workflow automation agent | trimite emailuri, update CRM, creeaza tickete | Medium/high contextual | action logs, human approval, fail-safe |
| Autonomous sales agent | contacteaza leaduri | GDPR/profiling | lawful basis, transparency, opt-out |
| AI agent cu API access | modifica date in sisteme | Security/high contextual | access control, logging, incident |
| Decision governance engine | AI recomanda/blocheaza/aproba actiuni pe praguri interne | Medium/high contextual | decision log, approval gates, rationale, override history, outcome monitoring |
| Model fine-tuned pentru client | model custom | Provider obligations | data governance, model docs, training data |
| AI SaaS produs propriu | vandut pe piata | Provider | Annex IV, QMS, PMM, incident, EU DB if high-risk |
| AI compliance pack embedded | vand automatizare + dovezi | Commercial differentiator | API/SDK CompliRoAI, audit pack per deployment |

**Intrebari intake:**

- Construiti sistemul sau doar il folositi?
- Clientul final il foloseste pe datele lui?
- Sistemul ia actiuni automat?
- Aveti logs, changelog, rollback, human approval?
- Aveti documentatie tehnica pentru client?
- Sistemul foloseste praguri interne pentru blocare, human review sau executie automata?
- Puteti arata de ce a fost luata o decizie si cine a suprascris-o?

**Findings generate:**

- "Provider/deployer split neclar";
- "Technical documentation missing";
- "Human approval gate missing for agent actions";
- "Decision log lipsa pentru agent/engine";
- "Override history lipsa";
- "Outcome monitoring lipsa pentru decizii AI";
- "Post-market monitoring missing";
- "Incident reporting process missing";
- "Client-facing AI compliance pack missing".

**Mesaj comercial pentru acest rol:**

> "Vinzi automatizari AI? Cu CompliRoAI le vinzi cu compliance pack inclus: clasificare AI Act, notice, vendor evidence, logs, human oversight si audit pack pentru client."

---

### 3.10.1 AI Decision Governance Pack

Acest use-case este inspirat de piata de runtime/decision engines precum Ahauros/AEOS, dar CompliRoAI nu copiaza formule private de scoring si nu pretinde ca un scor intern este cerinta legala. Scopul nostru este sa dovedeasca auditabil cum un AI ia, recomanda, blocheaza sau escaladeaza decizii.

| Control | Ce dovedeste | Modul CompliRoAI |
|---|---|---|
| Decision log | ce input/output a dus la recomandare sau actiune | Logging Evidence |
| Human approval gates | cand intervine omul si ce poate opri | Human Oversight |
| Rationale / reason codes | de ce s-a produs decizia | Technical docs + Audit Pack |
| Override history | cine a schimbat decizia AI si de ce | Events + Audit log |
| Threshold register | praguri interne pentru block/review/auto-execute | Risk management + QMS |
| Outcome monitoring | efecte, erori, false positives, drift | Post-Market Monitoring |
| Version/change log | model/prompt/workflow folosit la momentul deciziei | Logging + PMM |

**Intrebari intake:**

- AI-ul doar recomanda sau poate executa actiuni?
- Exista praguri de tip block / human review / auto-execute?
- Cine poate modifica pragurile?
- Pragurile sunt documentate si aprobate?
- Se pastreaza motivul deciziei?
- Exista istoric de override uman?
- Monitorizati rezultatele si erorile deciziilor?

**Findings generate:**

- "Decision governance nedocumentat";
- "Human approval gate lipsa";
- "Threshold register lipsa";
- "Decision rationale lipsa";
- "Override history lipsa";
- "Outcome monitoring lipsa";
- "Version/change log lipsa pentru decizii AI".

**Audit Pack trebuie sa includa:**

- policy de decizie;
- registru praguri;
- exemple de decizii si reason codes;
- loguri;
- aprobari;
- override history;
- monitoring plan;
- lista versiunilor model/prompt/workflow.

---

### 3.11 Cybersecurity, SOC si AI Security

| Automatizare | Exemple reale | Risc initial | Obligatii CompliRoAI |
|---|---|---|---|
| Threat detection AI | detecteaza atacuri | NIS2/DORA contextual | incident logs, vendor risk, criticality |
| LLM security scanner | prompt injection, data leak | Minimal/security | evidence, security testing |
| SOC alert triage | prioritizeaza alerte | Medium | human analyst review |
| AI firewall / guardrails | blocheaza prompturi | Security control | policy, logs, false positives |
| Employee phishing simulator AI | training security | GDPR medium | employee notice, retention |

**Intrebari intake:**

- AI-ul este folosit in securitatea unei entitati NIS2/DORA?
- Poate declansa blocari automate?
- Cine valideaza alertarea?
- Sunt logurile pastrate?
- Exista incident reporting flow?

**Findings generate:**

- "NIS2/DORA AI slice review recomandat";
- "AI security control evidence lipsa";
- "Human analyst review lipsa";
- "Incident escalation undefined".

---

### 3.12 Public Sector, Smart City si Critical Infrastructure

| Automatizare | Exemple reale | Risc initial | Obligatii CompliRoAI |
|---|---|---|---|
| Eligibility scoring beneficii | decide acces ajutor social | High-risk | FRIA, transparency, appeal |
| Traffic/smart city analytics | camere, senzori | GDPR/high contextual | DPIA, biometric review |
| Predictive maintenance critical infra | energie, apa, transport | High-risk/contextual | NIS2 slice, incident, PMM |
| Public service chatbot | informatii cetateni | Transparency/GDPR | notice, escalation |
| Document processing public | cereri, dosare | GDPR medium/high | data map, retention, access |

**Intrebari intake:**

- AI-ul afecteaza acces la servicii publice?
- Proceseaza date biometrice, locatie sau minori?
- Exista contestatie umana?
- Este infrastructura critica?
- Exista audit public/transparenta?

**Findings generate:**

- "Public service high-risk candidate";
- "FRIA likely required";
- "Appeal/human review missing";
- "Transparency public notice missing";
- "NIS2 AI critical slice recommended".

---

## 4. Prioritizare pentru produs

### Wave 1 — Must-have pentru v1 vandabil

Aceste categorii trebuie sa fie in wizard si classifier din prima:

1. Chatbot/support AI;
2. Internal Copilot/RAG;
3. Sales/CRM/marketing AI;
4. HR/recruiting AI;
5. Finance/credit/fraud AI;
6. Medical/health AI;
7. AI Builder/automation agency.

De ce: acopera majoritatea leadurilor reale si toate riscurile comerciale majore.

### Wave 2 — Diferentiatori premium

1. Education/proctoring;
2. E-commerce recommender/dynamic pricing;
3. AI Ads / LLM Commerce / Claim Evidence;
4. Legal/professional services AI;
5. Cybersecurity/SOC AI;
6. Public sector/critical infrastructure.

De ce: sunt importante, dar pot intra dupa foundation + classifier + AI Data Discovery.

### Wave 3 — Enterprise depth

1. Post-market monitoring per AI system;
2. QMS workspace;
3. Model/version change impact;
4. AI incident reporting;
5. API/SDK pentru AI builders;
6. Trust Center public per client.

---

## 5. Taxonomie pentru cod

### 5.1 `aiUseCaseCategory`

Valori recomandate:

```ts
type AIUseCaseCategory =
  | "customer_support"
  | "internal_copilot"
  | "sales_marketing"
  | "hr_workplace"
  | "finance_credit_fraud"
  | "medical_health"
  | "education"
  | "ecommerce_retail"
  | "ai_ads_llm_commerce"
  | "legal_professional"
  | "ai_builder_agent"
  | "cybersecurity"
  | "public_sector_critical"
  | "other";
```

### 5.2 `aiRiskCandidate`

```ts
type AIRiskCandidate =
  | "prohibited_candidate"
  | "high_risk_candidate"
  | "transparency_limited"
  | "minimal"
  | "needs_human_review";
```

### 5.3 `automationActionLevel`

```ts
type AutomationActionLevel =
  | "advisory_only"       // recomanda, omul decide
  | "drafts_content"      // genereaza continut
  | "ranks_or_scores"     // scor/ranking/profiling
  | "takes_action"        // trimite email, update CRM, inchide ticket
  | "decides_access"      // aproba/refuza acces, serviciu, job, credit
  | "monitors_people";    // monitorizare angajati/candidati/elevi
```

### 5.4 `dataSensitivity`

```ts
type DataSensitivity =
  | "no_personal_data"
  | "basic_personal_data"
  | "behavioral_data"
  | "financial_data"
  | "employee_data"
  | "children_data"
  | "health_data"
  | "biometric_data"
  | "special_category_data"
  | "criminal_offence_data";
```

### 5.5 `requiredEvidence`

```ts
type RequiredEvidence =
  | "ai_inventory_record"
  | "role_assessment"
  | "risk_classification"
  | "transparency_notice"
  | "ai_literacy_evidence"
  | "vendor_dpa"
  | "data_map"
  | "dpia"
  | "fria"
  | "human_oversight_protocol"
  | "logging_evidence"
  | "annex_iv"
  | "eu_database_entry"
  | "qms_record"
  | "post_market_monitoring_plan"
  | "incident_reporting_playbook"
  | "approval_record";
```

---

## 6. Intake Wizard — intrebari canonice

### 6.1 Prima intrebare

> "Ce face AI-ul?"

Optiuni:

- Raspunde clientilor;
- Ajuta angajatii intern;
- Vinde / personalizeaza marketing;
- Evalueaza candidati sau angajati;
- Scoring financiar / fraud / risc;
- Medical / sanatate;
- Educatie / training / examene;
- Recomanda produse;
- Analizeaza documente profesionale;
- Automatizeaza workflow-uri / agenti;
- Cybersecurity;
- Servicii publice / infrastructura critica;
- Altceva.

### 6.2 Intrebari de risc

- AI-ul interactioneaza direct cu persoane?
- Persoanele sunt informate ca e AI?
- AI-ul ia decizii sau doar recomanda?
- Un om valideaza outputul?
- AI-ul poate afecta job, credit, sanatate, educatie, servicii esentiale sau drepturi?
- AI-ul proceseaza date personale?
- Proceseaza date sensibile?
- Proceseaza date despre copii?
- Proceseaza biometrie, voce, video sau emotii?
- Vendorul foloseste datele pentru training?
- Exista logs si istoric decizional?
- Exista mod de contestatie sau escalare umana?

### 6.3 Intrebari pentru AI builders

- Construiti sistemul pentru voi sau pentru clienti?
- Clientul final isi introduce datele in sistem?
- Aveti model propriu, fine-tune, RAG sau wrapper peste vendor?
- Sistemul poate lua actiuni automat prin API?
- Aveti changelog de model/prompt/workflow?
- Puteti exporta documentatia tehnica pentru client?
- Aveti incident reporting si post-market monitoring?

---

## 7. Matrice de output automat

| Daca utilizatorul spune... | CompliRoAI trebuie sa creeze automat... |
|---|---|
| "Am chatbot pe site" | AI inventory + transparency notice + vendor DPA finding + retention finding |
| "Folosim ChatGPT cu documente interne" | AI Data Discovery + AI policy + DPIA recommendation + access review |
| "Sortam CV-uri cu AI" | High-risk candidate + DPIA + human oversight + bias evidence + transparency |
| "Facem scoring pentru credit" | High-risk candidate + Art. 22 check + FRIA + logging + appeal process |
| "Avem AI pentru pacienti" | Health high-risk candidate + DPIA + clinical oversight + incident plan |
| "Construim agenti pentru clienti" | Provider/deployer split + Annex IV candidate + API logs + compliance pack |
| "Agentul trimite emailuri automat" | Action-level risk + human approval gate + audit logs + rollback |
| "AI-ul recomanda produse" | Profiling check + notice + consent/LI review + retention |
| "AI-ul monitorizeaza angajati" | DPIA critical + labor/legal review + possible prohibited edge |
| "AI-ul detecteaza emotii la munca" | Prohibited candidate + stop/review finding |

---

## 8. Ce inseamna "mai autonom" in produs

CompliRoAI nu trebuie sa fie doar formular. Trebuie sa fie un sistem care observa schimbari si porneste taskuri.

### Autonomie Wave 1

- daca apare un AI system nou in intake, genereaza inventory + findings;
- daca tool-ul e chatbot, genereaza transparency notice draft;
- daca tool-ul are date personale, cere vendor DPA;
- daca tool-ul e HR/credit/medical/education, marcheaza high-risk candidate;
- daca exista date sensibile, recomanda DPIA;
- daca vendor training este "unknown", creeaza finding;
- daca human review este "none", creeaza finding;
- daca lipsesc literacy records, creeaza training task.

### Autonomie Wave 2

- re-scan lunar pe client pentru AI tools noi;
- compara change log-ul sistemului AI cu clasificarea existenta;
- daca scopul/datele/modelul se schimba, cere re-review;
- trimite email consultantului si clientului cu "AI exposure changed";
- actualizeaza Audit Pack cu delta;
- recomanda FRIA/PMM/Incident plan cand sistemul devine high-risk.

### Autonomie Wave 3

- API/SDK pentru AI builders: fiecare deployment poate trimite metadata spre CompliRoAI;
- CI/CD compliance gate: nu publici agentul fara role assessment + risk classification;
- model/prompt versioning;
- automated evidence collection;
- trust center live pentru clientii cabinetelor.

---

## 9. Pozitionare comerciala per rol

### 9.1 IMM care foloseste AI

Mesaj:

> "Folosesti ChatGPT, Copilot sau chatbot? CompliRoAI iti arata ce AI ai, ce date intra, ce riscuri ai si ce dovezi trebuie pastrate."

Ce vede in produs:

- AI inventory simplu;
- risk classification;
- transparency notice;
- vendor DPA checklist;
- AI literacy tracker;
- Readiness Pack;
- Audit Pack.

### 9.2 Firma de automatizari / AI builder

Mesaj:

> "Vinzi automatizari AI? Livreaza-le cu compliance pack inclus si diferentiaza-te de agentiile care vand doar botul."

Ce vede in produs:

- provider/deployer assessment;
- agent action risk;
- Annex IV;
- EU Database wizard;
- human oversight;
- logging evidence;
- PMM;
- incident reporting;
- API/SDK.

### 9.3 Consultant / DPO / Cabinet AI

Mesaj:

> "Transforma GDPR-ul existent intr-un serviciu AI Compliance. Un singur OS pentru AI Act + GDPR + dovezi pentru tot portofoliul."

Ce vede in produs:

- portofoliu multi-client;
- AI intake magic links;
- AI Data Discovery;
- findings/dosar/resolve;
- white-label reports;
- Audit Pack per client;
- Trust Center.

---

## 10. Ce NU facem

- Nu construim 12 produse pe verticale.
- Nu facem fiscal in CompliRoAI.
- Nu promitem ca sistemul decide legal fara consultant.
- Nu ascundem GDPR; il folosim ca infrastructura naturala pentru AI compliance.
- Nu vindem doar checklist AI Act.
- Nu facem "AI Act classifier" izolat fara evidence OS.

---

## 11. Surse oficiale si repere

Reperele de timeline folosite in document:

- AI Act a intrat in vigoare la 1 august 2024.
- Prohibited practices si AI literacy se aplica din 2 februarie 2025.
- Obligatiile GPAI au inceput din 2 august 2025.
- Majoritatea regulilor AI Act se aplica din 2 august 2026.
- Unele obligatii pentru high-risk AI integrate in produse reglementate au termen 2 august 2027.

Surse de verificat in sprinturile juridice:

- European Commission — AI Act regulatory framework: https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai
- European Commission AI Act Service Desk — implementation timeline: https://ai-act-service-desk.ec.europa.eu/en/ai-act/timeline/timeline-implementation-eu-ai-act
- European Commission — AI Literacy Q&A: https://digital-strategy.ec.europa.eu/en/faqs/ai-literacy-questions-answers
- EUR-Lex — Regulation (EU) 2024/1689: https://eur-lex.europa.eu/eli/reg/2024/1689/oj

---

## 12. Definition of Done pentru implementarea bibliotecii

Un use-case din biblioteca este implementat complet doar daca:

1. apare in onboarding/intake;
2. genereaza `AISystemRecord`;
3. seteaza categoria si risk candidate;
4. determina rolul legal probabil;
5. detecteaza datele personale/sensibile relevante;
6. genereaza findings actionabile;
7. propune documente necesare;
8. intra in Audit Pack;
9. apare in raportul client-facing;
10. are teste pentru cel putin un caz low-risk, unul transparency si unul high-risk/prohibited candidate.

---

## 13. Decizie finala

Biblioteca devine stratul de inteligenta practica dintre lege si produs:

- legea spune obligatiile;
- biblioteca traduce munca reala cu AI in riscuri si dovezi;
- CompliRoAI executa workflow-ul.

Directia corecta:

> Full DPO-OS foundation + AI Act layer + biblioteca de automatizari AI = AI Compliance OS vandabil.
