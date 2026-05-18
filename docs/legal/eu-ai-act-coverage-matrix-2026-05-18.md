# EU AI Act — Coverage Matrix CompliRoAI

**Versiune:** 2026-05-18 (Sprint 026 — final legal hardening).
**Maintainer:** echipa CompliRoAI.

---

## Surse legale (în ordinea precedenței)

1. **Regulamentul (EU) 2024/1689** — text consolidat OJEU.
   `https://eur-lex.europa.eu/eli/reg/2024/1689/oj`
2. Comisia Europeană — AI Act regulatory framework: `https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai`
3. AI Act Service Desk — timeline: `https://ai-act-service-desk.ec.europa.eu/en/ai-act/timeline/timeline-implementation-eu-ai-act`
4. Document intern: `/docs/legal/eu-ai-act-full-text-romanian-2026-05.md` (versiune RO consolidată, folosită pentru referință internă).

**Regulă de precedență:** dacă există divergență între versiunea RO internă și textul OJEU, **textul OJEU prevalează**. Pentru elemente marcate **PROVISIONAL** (Digital Omnibus mai 2026), se notează explicit că nu au intrat în vigoare în OJEU la data 2026-05-18.

---

## Cum se citește matricea

| Coloană | Sens |
|---|---|
| **Articol / Anexă** | Referința legală în textul Regulamentului. |
| **Obligație** | Sumar în RO al obligației (1-2 propoziții). |
| **Target role** | Cui îi este destinată funcționalitatea: `imm-classic` / `ai-builder` / `cabinet` / `not-target` (= obligația cade pe alt actor: organism notificat, stat membru, AI Office). |
| **Modul produs** | Numele modulului din CompliRoAI. |
| **UI path** | Calea în `/dashboard/...` unde utilizatorul interacționează. |
| **API/store path** | Calea fișierului din `lib/server/` + `app/api/` care expune funcționalitatea. |
| **Audit Pack** | Locul în ZIP-ul de audit unde evidence-ul este disponibil pentru auditor. |
| **Status** | `COVERED` (acoperit complet) / `PARTIAL` (acoperit operațional, dar nu strict 1:1) / `NOT_TARGET` (obligația cade pe alt actor) / `PROVISIONAL` (depinde de Omnibus). |

Sprint 026 a închis toate `GAP_BLOCKER` raportate în Sprint 025. Restul `PARTIAL` au fost auditate și sunt acoperite operațional; justificările sunt în secțiunea finală.

---

## TITLUL I — Dispoziții generale

| Articol | Obligație | Target role | Modul | UI path | API/store | Audit Pack | Status |
|---|---|---|---|---|---|---|---|
| Art. 1 Obiect | — | not-target | — | — | — | — | NOT_TARGET (declarativ) |
| Art. 2 Scop teritorial + material | Identificarea ariei de aplicare. | imm-classic, ai-builder, cabinet | Onboarding + Role Assessment | `/onboarding`, `/dashboard/role-assessment` | `lib/compliance/role-classifier.ts` | `manifest.json` (orgProfile) | COVERED |
| Art. 3 Definiții (51) | Mapare termeni la model-ul intern. | toți | Toate modulele | n/a | `lib/compliance/types.ts` | n/a | COVERED |

## TITLUL II — Practici interzise (Art. 5)

Art. 5 conține 8 sub-categorii (a)-(h) — fiecare este detectată de clasificatorul produsului în momentul creării sistemului AI și emite o categorisare `prohibited_candidate` în AI Inventory + emit blocking findings.

| Sub-art. | Practică | Modul | UI path | API/store | Audit Pack | Status |
|---|---|---|---|---|---|---|
| Art. 5(1)(a) | Manipulare subliminală | Prohibited Practices Check | `/dashboard/sisteme` (banner) | `lib/compliance/ai-act-classifier.ts` | `inventory/ai-systems.json` | COVERED |
| Art. 5(1)(b) | Exploatarea vulnerabilităților | idem | idem | idem | idem | COVERED |
| Art. 5(1)(c) | Scoring social de stat | idem | idem | idem | idem | COVERED |
| Art. 5(1)(d) | Predictive policing | idem | idem | idem | idem | COVERED |
| Art. 5(1)(e) | Untargeted facial recognition DB | idem | idem | idem | idem | COVERED |
| Art. 5(1)(f) | Emotion recognition workplace/education | idem | idem | idem | idem | COVERED |
| Art. 5(1)(g) | Biometric categorisation | idem | idem | idem | idem | COVERED |
| Art. 5(1)(h) | Real-time RBI public spaces | idem | idem | idem | idem | COVERED |

Sprint 016 (FRIA) trimite drepturile fundamentale aferente în `fundamentalRightsCatalog` (24 itemuri) când aceeași clasificare se aplică. Sprint 023.7 (Art. 50) adaugă un nudifier / deepfake-specific check.

## TITLUL III, Capitolul 1 — Sisteme de risc ridicat (HRAIS)

| Articol | Obligație | Target role | Modul | UI path | API/store | Audit Pack | Status |
|---|---|---|---|---|---|---|---|
| Art. 6 + Annex III | Clasificare risc ridicat (8 zone) | toți | AI Inventory + Risk Classification | `/dashboard/sisteme` | `lib/compliance/ai-act-classifier.ts` | `inventory/ai-systems.json` | COVERED |
| Art. 7 | Mecanism amendare Anexa III | not-target | — | — | — | — | NOT_TARGET (Comisia) |
| Art. 8 | Cerințe generale conformitate Cap. 2 | ai-builder | Conformity Assessment | `/dashboard/conformitate` | `lib/compliance/ai-conformity-assessment.ts` | `documents/annex-iv/` | COVERED |
| Art. 9 | Sistem de management al riscului | ai-builder | QMS Workspace | `/dashboard/qms` (sec. d) | `lib/compliance/qms-schema.ts`, `lib/server/qms-store.ts` | `qms/sections/...` | COVERED |
| Art. 10 | Guvernanța datelor | ai-builder + imm-classic (când HRAIS) | RoPA + AI Data Discovery + QMS sec. f + Conformity q6 | `/dashboard/ropa`, `/dashboard/ai-discovery`, `/dashboard/qms` | `lib/compliance/ropa-risk-engine.ts`, `lib/compliance/ai-data-discovery.ts` | `ropa/`, `ai-data-discovery/`, `qms/sections/f-data-governance.md` | COVERED |
| Art. 11 + Annex IV | Documentație tehnică | ai-builder | Annex IV Generator | `/dashboard/conformitate` (button "Generează Anexa IV") | `/api/ai-act/annex-iv`, `lib/compliance/ai-conformity-assessment.ts` | `documents/annex-iv/*.md` | COVERED |
| Art. 12 | Record-keeping (logs) | ai-builder + deployer | Logging Evidence | `/dashboard/logging-evidence` | `lib/compliance/logging-schema.ts`, `lib/server/logging-evidence-store.ts` | `logging/configs/...` | COVERED |
| Art. 13 | Transparență + Instructions for Use | ai-builder | Annex IV (sec. 3, 4) + Transparency Notice | `/dashboard/conformitate`, `/dashboard/transparency` | `lib/compliance/ai-conformity-assessment.ts` (q7), `lib/compliance/transparency-engine.ts` | `documents/annex-iv/...`, `transparency/notices/` | COVERED |
| Art. 14 | Human oversight | ai-builder + deployer | Human Oversight Protocols | `/dashboard/human-oversight` | `lib/compliance/oversight-schema.ts`, `lib/server/oversight-store.ts` | `human-oversight/protocols/` | COVERED |
| Art. 15 | Acuratețe + robustețe + cybersecurity | ai-builder | PMM + Annex IV sec. 6 | `/dashboard/post-market-monitoring`, `/dashboard/conformitate` | `lib/compliance/pmm-schema.ts`, secțiunea 6 din `buildAnnexIVDocument` | `pmm/plans/...`, `documents/annex-iv/` | PARTIAL (metric-collection rămâne provider-specific; CompliRoAI track-uiește planul + reviewul) |

## TITLUL III, Capitolul 3 — Obligații provider/deployer/value chain

| Articol | Obligație | Target role | Modul | UI path | API/store | Audit Pack | Status |
|---|---|---|---|---|---|---|---|
| Art. 16 | Obligațiile providerilor (lista 12 puncte) | ai-builder | Toate modulele de mai sus + QMS (umbrella) | `/dashboard/qms` | `lib/compliance/qms-schema.ts` | `qms/sections/` | COVERED |
| Art. 17 | Quality Management System | ai-builder | QMS Workspace (singleton + 13 secțiuni Art. 17(1)(a)-(m)) | `/dashboard/qms` | `lib/compliance/qms-schema.ts`, `lib/server/qms-store.ts` | `qms/workspace.md`, `qms/sections/{key}.md` | COVERED |
| Art. 18 | Retenție documentație ≥10 ani | ai-builder | QMS sec. 8 (Record-keeping Policy) + EU DoC retention note | `/dashboard/qms` (sec. h) | `lib/compliance/qms-schema.ts` | `qms/sections/h-record-keeping.md` | COVERED |
| Art. 19 | Log-uri generate automat ≥6 luni | ai-builder | Logging Evidence (retenție configurabilă) | `/dashboard/logging-evidence` | `lib/compliance/logging-schema.ts` (`retentionMonths ≥ 6`) | `logging/configs/...` | COVERED |
| Art. 20 | Corrective actions + duty of information | ai-builder | PMM corrective actions + AI Incidents (Art. 73) | `/dashboard/post-market-monitoring`, `/dashboard/ai-incidents` | `lib/compliance/pmm-schema.ts`, `lib/compliance/ai-incident-schema.ts` | `pmm/`, `ai-incidents/` | COVERED |
| Art. 21 | Cooperare cu autoritățile naționale | ai-builder + deployer | **(Sprint 026)** Authority Cooperation Log | `/dashboard/ai-incidents` (panel) | `/api/authority-cooperation`, `lib/server/authority-cooperation-store.ts` | `cooperation/cooperation-log.md` | COVERED |
| Art. 22 | Reprezentant autorizat (provider non-UE) | ai-builder (non-EU) | Câmp în EU DoC (Art. 47) | `/dashboard/conformitate` (EU DoC form) | `/api/ai-act/eu-declaration` | `documents/eu-declaration-art-47/...` | COVERED |
| Art. 23 | Obligații importator | not-target | — | — | — | — | NOT_TARGET (CompliRoAI client este provider sau deployer; pentru importator separat se folosește Vendor Review) |
| Art. 24 | Obligații distribuitor | not-target | — | — | — | — | NOT_TARGET (idem) |
| Art. 25 | Value chain + substantial modification | ai-builder | PMM `versionChange` + Annex IV update + EU DoC update | `/dashboard/post-market-monitoring`, `/dashboard/conformitate` | `lib/compliance/pmm-schema.ts` (rule Art. 43(4)) | `pmm/version-changes.md` | COVERED |
| Art. 26 | Obligații deployer (11 puncte) | imm-classic + ai-builder (când deployer) | Toate modulele + FRIA + Logging + Authority Cooperation + Annex IV review | `/dashboard/fria`, `/dashboard/logging-evidence`, `/dashboard/ai-incidents` | `lib/compliance/fria-schema.ts`, `lib/compliance/logging-schema.ts` | `fria/`, `logging/`, `cooperation/` | COVERED |
| Art. 27 | FRIA (Fundamental Rights Impact Assessment) | imm-classic + ai-builder (când deployer public + alte deployer publici Art. 27(1)) | FRIA Generator (24 rights catalog + risk matrix) | `/dashboard/fria` | `lib/compliance/fria-schema.ts`, `lib/server/fria-store.ts` | `fria/{id}.md` | COVERED |

## TITLUL III, Capitolul 4 — Organisme de notificare

Toate articolele 28-39 (autorități notificatoare + criterii NB + monitoring NB) = **NOT_TARGET** — obligația cade pe statul membru și pe organismele notificate, nu pe utilizatorul CompliRoAI.

## TITLUL III, Capitolul 5 — Standarde + Conformity Assessment + CE Marking

| Articol | Obligație | Target role | Modul | UI path | API/store | Audit Pack | Status |
|---|---|---|---|---|---|---|---|
| Art. 40 | Standarde armonizate (CEN/CENELEC) | ai-builder | EU DoC sec. 5 + QMS supplier controls | `/dashboard/conformitate` (EU DoC) | `/api/ai-act/eu-declaration` | `documents/eu-declaration-art-47/` | COVERED (referință) |
| Art. 41 | Common specifications (Comisia) | not-target | EU DoC sec. 5 (câmp) | `/dashboard/conformitate` | idem | idem | NOT_TARGET (Comisia emite) — câmpul există |
| Art. 42 | Presumption of conformity | ai-builder | EU DoC sec. 4 + 5 | idem | idem | idem | COVERED (referință) |
| Art. 43 | Conformity assessment | ai-builder | Conformity 10Q + EU DoC + CE | `/dashboard/conformitate` | `lib/compliance/ai-conformity-assessment.ts` | `documents/annex-iv/` + `documents/eu-declaration-art-47/` | COVERED |
| Art. 44 | Certificate (notified body) | not-target | Câmp în EU DoC (referință certificat NB) | `/dashboard/conformitate` | `/api/ai-act/eu-declaration` | `documents/eu-declaration-art-47/` | NOT_TARGET (NB emite) — câmpul există |
| Art. 45 | Information obligations of NB | not-target | — | — | — | — | NOT_TARGET (NB) |
| Art. 46 | Derogare introducere pe piață | not-target | — | — | — | — | NOT_TARGET (autoritate națională) |
| Art. 47 + Annex V | EU Declaration of Conformity | ai-builder | **(Sprint 026)** EU DoC Generator (7 câmpuri Annex V) | `/dashboard/conformitate` (form EU DoC) | `/api/ai-act/eu-declaration`, `lib/compliance/ai-conformity-assessment.ts` (`buildEUDeclarationOfConformity`) | `documents/eu-declaration-art-47/{id}.md` + `_index.json` | COVERED |
| Art. 48 | CE marking | ai-builder | **(Sprint 026)** CE Marking Checklist (7 itemuri context-aware) | `/dashboard/conformitate` (form CE) | `/api/ai-act/ce-marking`, `lib/compliance/ai-conformity-assessment.ts` (`evaluateCEMarkingChecklist`) | `documents/ce-marking-art-48/{id}.md` + `_index.json` | COVERED |
| Art. 49 + Annex VIII | Înregistrare EU Database | ai-builder + deployer public | EU Database Wizard | `/dashboard/sisteme/eu-db-wizard` | `lib/compliance/ai-conformity-assessment.ts` (q10) | `documents/annex-iv/` | COVERED |

## TITLUL IV — Transparență (Art. 50)

Sprint 006 + Sprint 023.7 — Art. 50 are 2 niveluri: provider (par. 1, 2) + deployer (par. 3, 4). Tracking per sistem (notices) + per asset (content register).

| Sub-art. | Obligație | Target role | Modul | UI path | API/store | Audit Pack | Status |
|---|---|---|---|---|---|---|---|
| Art. 50(1) | Chatbot disclosure | provider (ai-builder) + deployer | Transparency Notices + Content Register `chatbot_interaction` | `/dashboard/transparency` | `lib/compliance/transparency-engine.ts`, `lib/server/transparency-content-store.ts` | `transparency/notices/`, `transparency/content-register.md` | COVERED |
| Art. 50(2) | Synthetic content machine-readable marking | provider (ai-builder) | Content Register (image/video/audio/text_synthetic) | idem | idem | idem | COVERED |
| Art. 50(3) | Emotion / biometric categorisation disclosure | deployer | Transparency Notice | idem | idem | idem | COVERED |
| Art. 50(4)(a) | Deepfake disclosure | deployer | Content Register (deepfake) + scanner rule CRITICAL | idem | idem | idem | COVERED |
| Art. 50(4)(b) | Public-interest text editorial responsibility | deployer | Content Register (public_interest_text + editorial claim) | idem | idem | idem | COVERED |
| Art. 50(5) | Clear/distinct/first-interaction | toți | idem | idem | idem | idem | COVERED |

**PROVISIONAL note:** Digital Omnibus mai 2026 extinde deadline-ul Art. 50(2) machine-readable marking de la 2 aug 2026 la 2 dec 2026. Aceasta este sursa internă RO; OJEU nu a confirmat încă publicarea finală a Omnibus la data 2026-05-18. Modulele rămân funcționale; deadline-ul afișat este 2 dec 2026 cu marker explicit `[POST-OMNIBUS]`.

## TITLUL V — GPAI (Art. 51-56)

Aceste articole se aplică providerilor de modele GPAI cu calcul ≥10^25 FLOPs. **NOT_TARGET** pentru utilizatorii tipici CompliRoAI care sunt deployer-i (folosesc API-uri externe) sau provideri-aplicație (fine-tune-uri specifice).

| Articol | Obligație | Status pentru CompliRoAI |
|---|---|---|
| Art. 51 | Clasificare GPAI cu risc sistemic | NOT_TARGET / FUTURE_TIER |
| Art. 52 | Procedură de notificare a Comisiei | NOT_TARGET / FUTURE_TIER |
| Art. 53 | Obligații GPAI (tech doc, transparency, copyright, training summary) | NOT_TARGET / FUTURE_TIER |
| Art. 54 | Reprezentant autorizat GPAI non-UE | NOT_TARGET |
| Art. 55 | Obligații GPAI cu risc sistemic | NOT_TARGET / FUTURE_TIER |
| Art. 56 | Codes of practice | NOT_TARGET (voluntar) |

**Decizie:** dacă un client devine provider GPAI cu risc sistemic (>10^25 FLOPs), CompliRoAI poate fi extins într-un sprint dedicat. Pentru piața România 2026, niciun client nu este în această clasă.

## TITLUL VI — Inovare (Sandbox)

| Articol | Status |
|---|---|
| Art. 57-61 Regulatory sandboxes | NOT_TARGET / VOLUNTARY (statele membre operează sandbox-uri; CompliRoAI track-uiește participarea în orgKnowledge dacă clientul este înscris) |
| Art. 62 Real-world testing | NOT_TARGET / VOLUNTARY |
| Art. 63 Measures for SMEs | COVERED — `simplifiedMode` QMS (Art. 17(3)) + structuri pricing diferențiate |

## TITLUL VII — Guvernanță (Art. 64-70)

**NOT_TARGET** — AI Office, EU AI Board, scientific panel, autorități naționale = cadrul instituțional al UE. CompliRoAI nu rebuild-uiește guvernanța; o referențiază.

## TITLUL VIII — EU Database (Art. 71)

| Articol | Modul | UI path | API/store | Audit Pack | Status |
|---|---|---|---|---|---|
| Art. 71 + Annex VIII | EU Database Wizard | `/dashboard/sisteme/eu-db-wizard` | `lib/compliance/ai-conformity-assessment.ts` (q10) | `documents/annex-iv/` | COVERED |

## TITLUL IX — Post-market + Reporting

| Articol | Modul | UI path | API/store | Audit Pack | Status |
|---|---|---|---|---|---|
| Art. 72 + Annex IV pct. 10 | Post-Market Monitoring | `/dashboard/post-market-monitoring` | `lib/compliance/pmm-schema.ts`, `lib/server/pmm-store.ts` | `pmm/plans/`, `pmm/reviews/` | COVERED |
| Art. 73 | AI Incident Reporting (6 categorii + deadline 2/10/15 zile) | `/dashboard/ai-incidents` | `lib/compliance/ai-incident-schema.ts`, `lib/server/ai-incident-store.ts` | `ai-incidents/registry.md`, `ai-incidents/records/` | COVERED |

## TITLUL X — Codes of Conduct (Art. 95)

**NOT_TARGET / VOLUNTARY** — codes of conduct sunt opționale; CompliRoAI le menționează în onboarding ca recomandare.

## TITLUL XII — Sancțiuni

| Articol | Status |
|---|---|
| Art. 99 — Sancțiuni org-facing (€35M / €15M / €7.5M) | COVERED — toate findings emise de scanner-ul preventiv (Sprint 022) au mapare la Art. 99 tier + severitate corespunzătoare |
| Art. 100 — Amenzi instituții UE | NOT_TARGET |
| Art. 101 — Amenzi GPAI | NOT_TARGET / FUTURE_TIER |

---

## Anexele

| Anexă | Modul | Status |
|---|---|---|
| Anexa I — Union harmonisation legislation | EU DoC sec. 4 (referință) | COVERED (referință) |
| Anexa II — Criterii prohibited | ai-act-classifier (Art. 5 sub-categorii) | COVERED |
| Anexa III — 8 zone HRAIS | AI Inventory + Risk Classification | COVERED |
| Anexa IV — Tech doc (9 puncte) | Annex IV Generator | COVERED |
| Anexa V — EU DoC content (7 câmpuri) | **(Sprint 026)** EU DoC Generator | COVERED |
| Anexa VI — Internal control | EU DoC + CE Marking checklist context | COVERED (referință) |
| Anexa VII — QMS + Tech Doc Assessment | EU DoC NB section + CE checklist NB items | COVERED (referință) |
| Anexa VIII — Info EU Database | EU Database Wizard | COVERED |
| Anexa IX — Derogare excepțională | NOT_TARGET (autoritate națională) | — |
| Anexa X — Baze biometrice UE | NOT_TARGET (informativ) | — |
| Anexa XI — Tech doc GPAI | NOT_TARGET / FUTURE_TIER | — |
| Anexa XII — Transparency downstream GPAI | NOT_TARGET / FUTURE_TIER | — |
| Anexa XIII — Criterii GPAI systemic | NOT_TARGET / FUTURE_TIER | — |

---

## Sumar agregat

| Status | Câte intrări |
|---|---|
| **COVERED** | 56 |
| **PARTIAL** | 1 (Art. 15 — metric collection rămâne provider-specific; planul + reviewul sunt covered) |
| **GAP_BLOCKER** | 0 (toate închise în Sprint 026) |
| **NOT_TARGET** | ~25 (notified bodies, autorități naționale, AI Office, EU institutions, GPAI providers > 10^25 FLOPs) |
| **PROVISIONAL** | 1 (Art. 50(2) deadline Digital Omnibus — UI marker `[POST-OMNIBUS]`) |
| **FUTURE_TIER** | 6 (GPAI provider tier — Art. 51-55, Anexa XI/XII/XIII) |

---

## Sprint 026 — Gaps închise

| Articol | Status înainte | Acțiune Sprint 026 | Status după |
|---|---|---|---|
| Art. 47 (+ Anexa V) | GAP_BLOCKER | Built `buildEUDeclarationOfConformity` + `/api/ai-act/eu-declaration` + secțiune UI + Audit Pack `documents/eu-declaration-art-47/` + tests | COVERED |
| Art. 48 | GAP_BLOCKER | Built `evaluateCEMarkingChecklist` + `buildCEMarkingChecklistDocument` + `/api/ai-act/ce-marking` + secțiune UI + Audit Pack `documents/ce-marking-art-48/` + tests | COVERED |
| Art. 21 | GAP_BLOCKER (în Sprint 025 era netracking-uit) | Built `AuthorityCooperationRequest` schema + store + `/api/authority-cooperation` (GET/POST/PATCH/DELETE) + UI panel în AI Incidents + Audit Pack `cooperation/cooperation-log.md` + tests | COVERED |
| Art. 10 | PARTIAL (acoperit prin RoPA + AI Data Discovery dar nu explicit) | Niciun cod nou — verificat că RoPA + AI Data Discovery + QMS sec. f + Conformity q6 acoperă punctele (a)-(g) Art. 10(1) | COVERED |
| Art. 13 | PARTIAL (IFU implicit în Annex IV) | Niciun cod nou — verificat că Annex IV sec. 3, 4 + Transparency Notices conțin IFU per Art. 13(3) | COVERED |
| Art. 18 | PARTIAL (10 ani implicit) | Niciun cod nou — verificat că QMS sec. 8 + EU DoC retention note (Sprint 026) menționează explicit 10 ani | COVERED |
| Art. 19 | PARTIAL (6 luni implicit în Logging) | Niciun cod nou — verificat că `LoggingConfig.retentionMonths` permite ≥ 6 și schema notează Art. 19 | COVERED |

---

## Justificări PARTIAL rămase

### Art. 15 (acuratețe / robustețe / cybersecurity)

PMM Plan (Sprint 019) include `complianceEvaluationMetrics` și `dataCollectionMethods`; planul + reviewul + anomaliile sunt **track-uite** integral. **Colectarea efectivă a metricilor** (de exemplu, măsurarea precision/recall/false-positive-rate la runtime) rămâne **responsabilitatea operațională a providerului** — nu poate fi automatizată de CompliRoAI fără integrare cu infrastructura clientului. Pentru audit: planul + reviewurile sunt în `pmm/`, evidence-ul metricilor concrete intră ca attachments în `evidence/`.

### Art. 50(2) Watermarking deadline (Digital Omnibus)

Sursele interne (text RO + spec funcțional) menționează un Omnibus mai 2026 care extinde deadline-ul de la 2 aug 2026 la 2 dec 2026. La data 2026-05-18, **OJEU nu a confirmat încă publicarea Omnibus**. Marker UI explicit `[POST-OMNIBUS]` apare în legislative change log + transparency dashboards. Dacă OJEU publică alt deadline, schimbarea este una linie în `legislative-change-log.ts`.

---

## FUTURE_TIER (decizii deferate)

| Articol / Anexă | Decizie |
|---|---|
| Art. 51-55 + Anexa XI/XII/XIII (GPAI provider) | Nu există în piața RO 2026 client la acest tier; build-out se face când apare cerere. Mandate Sprint 026 interzice FUTURE_TIER work fără mandate dedicat. |
| Art. 57-63 (sandbox + real-world testing) | Voluntar; CompliRoAI track-uiește înscrierea în `orgKnowledge`. Build-out dedicat doar la cerere. |
| Art. 23, 24 (importator/distribuitor) | Lanțul de valoare AI tipic în RO are provider direct + deployer; importator/distribuitor separat este rar. Vendor Review acoperă cazurile uzuale. |

---

## Appendix — Citate articole-cheie

### Art. 5 (Practici interzise — text scurtat)
> Sunt interzise următoarele practici: (a) AI ce utilizează tehnici subliminale pentru a denatura material comportamentul unei persoane; (b) AI ce exploatează vulnerabilitățile unei persoane sau ale unui grup (vârstă, dizabilitate, situație socio-economică); (c) sisteme de scoring social emise de autorități publice; (d) predictive policing pe bază exclusivă de profilare; (e) untargeted scraping de imagini faciale; (f) emotion recognition la locul de muncă / educație (excepție: motive medicale/siguranță); (g) biometric categorisation pentru a deduce rasa, opinia politică, orientarea sexuală etc.; (h) real-time RBI în spații publice (excepție: căutare victime răpire/trafic, prevenire amenințare specifică).

### Art. 13 (Transparență provider → deployer)
> 1. HRAIS sunt proiectate și dezvoltate astfel încât să asigure operarea suficient de transparentă pentru a permite deployer-ilor să interpreteze output-ul. 2. HRAIS sunt însoțite de instrucțiuni de utilizare (IFU) în format digital sau de altă natură. 3. Instrucțiunile conțin minim: (a) identitate + contact provider; (b) caracteristici + capabilități + limitări; (c) modificări predeterminate; (d) măsuri de human oversight; (e) cerințe hardware/computational; (f) durata de viață și operațiuni de mentenanță.

### Art. 14 (Human oversight)
> HRAIS sunt proiectate să fie supravegheate efectiv de persoane fizice în timpul utilizării. Supravegherea trebuie să permită deployer-ului: (a) să înțeleagă capabilitățile + limitările; (b) să fie conștient de tendința spre automation bias; (c) să interpreteze output-ul corect; (d) să decidă să nu folosească output-ul sau să-l ignore; (e) să intervină / oprească sistemul. Pentru HRAIS biometric ID: cel puțin 2 persoane fizice cu competența necesară verifică / confirmă identificarea (two-person rule).

### Art. 15 (Acuratețe, robustețe, cybersecurity)
> HRAIS sunt proiectate să atingă niveluri adecvate de acuratețe, robustețe, cybersecurity și să performeze consistent. Acuratețea + metrici relevante declarate în instrucțiunile de utilizare. Robustețea include reziliența la erori, failures, inconsistențe. Cybersecurity: măsuri proporționale împotriva atacurilor (data poisoning, model evasion, model poisoning, confidentiality attacks, model flaws).

### Art. 21 (Cooperare cu autoritățile competente)
> La cererea motivată a unei autorități naționale competente, providerii furnizează autorității toate informațiile și documentația necesară pentru a demonstra conformitatea HRAIS cu cerințele Capitolului 2. Informațiile se furnizează într-o limbă oficială UE indicată de Statul Membru. Cooperarea include și transmiterea log-urilor (Art. 12 + Art. 26(6)) la cerere justificată.

### Art. 27 (FRIA — Fundamental Rights Impact Assessment)
> Înainte de deploy-ul unui HRAIS de către un deployer public (sau Annex III pct. 5(b)(c)), deployer-ul efectuează FRIA care include: (a) procesele / decizie informate; (b) perioadă + frecvență de utilizare; (c) categoriile de persoane fizice afectate; (d) riscuri specifice de impact asupra drepturilor fundamentale; (e) măsuri de oversight uman; (f) măsuri de remediere dacă riscurile se materializează. Rezultatul este notificat autorității naționale competente. FRIA poate reutiliza secțiuni dintr-o DPIA GDPR existentă (Art. 27(4)).

### Art. 47 (EU Declaration of Conformity)
> Provider redactează EU DoC scrisă, machine- + human-readable, pentru fiecare HRAIS. Conține minim info din Anexa V. Limba: oficială UE cerută de Statul Membru. EU DoC se actualizează continuu și se păstrează disponibilă pentru autorități 10 ani de la plasarea pe piață (cross-ref Art. 18).

### Art. 48 (CE marking)
> Marcajul CE aplicat vizibil, lizibil, indelebil pe HRAIS (sau pe ambalaj / documentația care însoțește dacă fizic imposibil). Pentru HRAIS pur digitale, marcajul CE poate fi afișat digital. Numărul de identificare al notified body (dacă există) se aplică alături. Niciun alt marcaj nu trebuie să inducă în eroare cu privire la semnificația CE.

### Art. 50 (Transparency obligations)
> 1. Providerii AI ce interacționează direct cu persoane fizice asigură că persoanele sunt informate (excepție: evident). 2. Providerii GPAI generative asigură că output-ul sintetic este marcat machine-readable. 3. Deployer-ii emotion / biometric categorisation informează persoanele. 4. Deployer-ii deepfake disclose; pentru text public-interest, disclose dacă nu a fost human-reviewed editorial. 5. Informarea este clară, distinctă, la prima interacțiune.

### Art. 72 (Post-market monitoring)
> Providerii HRAIS implementează un sistem de post-market monitoring proporțional cu natura sistemului. Sistemul colectează, documentează și analizează date relevante despre performanța HRAIS pe toată durata de viață. Planul este parte din tech doc (Annex IV pct. 10). Revizii periodice + identificare anomalii + corrective/preventive actions.

### Art. 73 (Serious incident reporting)
> Providerii HRAIS raportează autorității de supraveghere a pieței din Statul Membru orice incident serios care a survenit. Termene: 2 zile pentru widespread infringement sau infrastructure critical; 10 zile pentru deces; 15 zile pentru alte cazuri. Notificarea include: descriere, sistem AI implicat, durată, persoane afectate, cauze probabile, măsuri imediate. Investigația root cause: provider + autoritate cooperează. Provider notifică și pe deployer-i, importatori, distribuitori, AI Office (când e cazul).

---

## Pașii pentru auditor

Când un auditor / regulator întreabă "unde tratează CompliRoAI Art. X?":

1. Identifică rândul Art. X în matricea de mai sus.
2. Deschide UI path-ul indicat (toate sub `/dashboard/`).
3. Cere export Audit Pack ZIP din `/dashboard/audit-pack`.
4. Verifică fișierele din coloana "Audit Pack" — ZIP-ul conține manifest cripto (SHA-256 hash chain) + toate fișierele citate.
5. Verifică hash chain pe `/verify-pack` (public, no-auth).

Pentru articolele NOT_TARGET: matricea explicit notează cui îi cade obligația. Dacă auditorul cere totuși evidence (ex. Art. 23 importator), echipa poate genera din Vendor Review un brief dedicat în `vendor-review/{vendor-id}.md`.

---

## Maintenance

- Acest document este sursa de adevăr pentru toate audit-urile externe ale CompliRoAI după Sprint 026.
- Update la fiecare sprint care atinge un articol nou sau modifică implementarea unuia existing.
- Update obligatoriu când Digital Omnibus este publicat oficial în OJEU (toate intrările PROVISIONAL devin COVERED sau primesc noul deadline).
