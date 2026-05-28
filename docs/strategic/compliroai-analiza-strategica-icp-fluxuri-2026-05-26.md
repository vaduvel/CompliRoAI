# Analiza strategica pentru CompliRoAI - perspective pentru ICP-uri si fluxuri de utilizatori

## Context

CompliRoAI este o platforma de conformitate centrata pe Actul AI al UE (Regulamentul (UE) 2024/1689) si GDPR. Structura aplicatiei include trei tipuri de workspaces dedicate principalelor segmente de piata (ICP-uri): Cabinet (DPO extern/consultant), IMM Classic (deployer pasiv) si AI Builder (startup/agentie care construieste AI). Documentatia produsului clarifica functionalitatile existente, directiile de dezvoltare si intrebarile de cercetare. Aceasta analiza sintetizeaza informatii din surse oficiale si literatura de specialitate, identifica fluxuri de lucru reale pentru fiecare segment si evidentiaza gap-uri de produs si proces.

## Cronologie si obligatii legislative relevante

Actul AI se aplica etapizat intre 2025 si 2027. Teleport subliniaza ca termenul pentru majoritatea obligatiilor este august 2026 si ca conformitatea presupune auditarea sistemelor AI, elaborarea documentatiei tehnice (Annex IV), implementarea unui lant de dovezi si monitorizarea post-piata. Obligatiile pentru furnizorii de sisteme AI includ implementarea unui sistem de management al riscurilor (Art. 9), asigurarea calitatii datelor (Art. 10), documentatie tehnica (Art. 11), inregistrarea logurilor, transparenta si informarea utilizatorilor, supraveghere umana, robustete si securitate, sistem de management al calitatii, actiuni corective, cooperare cu autoritatile si marcaj CE. Furnizorii trebuie sa realizeze si declaratia de conformitate (Art. 47) si sa isi inregistreze sistemele in baza de date UE.

Pentru deployeri (organizatiile care utilizeaza sisteme AI), actul impune masuri tehnice si organizatorice adecvate, supraveghere umana, gestionarea datelor, monitorizare continua, logare si documentare, evaluarea impactului asupra drepturilor fundamentale si informarea lucratorilor. Toate entitatile au obligatii generale de transparenta si alfabetizare in AI.

## ICP 1 - Cabinet (DPO extern/consultant)

### Cumparator real si job-to-be-done

**Cine cumpara:** DPO externi, avocati specializati in IT/AI, consultanti GDPR/NIS2/DORA, auditori AI sau agentii de automatizare care ofera pachete de conformitate pentru clienti. Piata romaneasca include numeroase firme care externalizeaza serviciul de DPO; Interlegal remarca faptul ca multe companii din Romania depind de DPO externi si au o conformitate partiala.

**Job-to-be-done:** consultantii trebuie sa gestioneze portofolii cu zeci de clienti, sa colecteze date incomplete, sa inventarieze sistemele AI, sa evalueze rolul legal si riscurile, sa intocmeasca DPIA/RoPA, sa genereze documente si registre, sa creeze task-uri de remediere, sa ataseze dovezi si sa livreze un audit pack verificabil clientului. Teleport accentueaza ca furnizorii trebuie sa construiasca lanturi de dovezi si sa mentina trasabilitatea, ceea ce consultantii trebuie sa demonstreze pentru fiecare client.

### Flux de utilizare ideal (user story empirica)

1. **Prospectare / identificarea clientului:** consultantul discuta cu potentialul client pentru a intelege domeniul si daca acesta foloseste sau dezvolta sisteme AI. Unele organizatii nu stiu ce sisteme AI utilizeaza; sursele subliniaza necesitatea inventarierii AI la inceput.

2. **Configurarea contului si importul clientilor:** in aplicatie, consultantul isi creeaza cont pe workspace-ul `Cabinet`, configureaza brand-ul si importa lista de clienti (CSV/TSV cu date de contact, CUI, industrie, rol). Trebuie sa existe un flux `nu am fisier` care sa genereze formulare de intake manual; contextul indica faptul ca aceasta optiune este planificata.

3. **Crearea workspace-ului clientului:** pentru fiecare client importat se genereaza un workspace izolat cu actiuni initiale (intake, inventar AI, DPIA/GDPR review, AI Literacy, role/risk review). Consultantul poate comuta intre portofoliu si workspace-ul clientului.

4. **Colectarea datelor de la client:** se trimit magic links pentru intake; clientul completeaza informatii despre organizatie, sistemele AI utilizate, furnizori, categorii de date, procese. Pentru clientii fara date, consultantul poate furniza un checklist cu campuri minime. `AI Literacy` trebuie explicat non-tehnic pentru a asigura intelegerea.

5. **Inventarierea sistemelor AI:** consultantul foloseste modulul `Inventar AI` pentru a adauga sisteme, descriind scopul, tehnologia, tipul de model (proprietar vs. cumparat) si categorie de risc (minimal/limited/high). Platforma ar trebui sa permita importul din fisiere sau integrarea cu tabele existente (Excel/Sheets) pentru a reduce munca manuala.

6. **Clasificarea rolului si riscului:** cu ajutorul `Role Assessment`, consultantul determina daca clientul este provider, deployer, importator sau distribuitor. Pentru fiecare sistem, se analizeaza riscul (Art. 6) si se verifica daca este interzis. Sistemele de recrutare, credit si educatie sunt considerate high-risk; daca apare un sistem interzis (ex. social scoring), consultantul propune eliminarea.

7. **Activitati GDPR si AI Act:** pe baza rolului, consultantul genereaza actiuni: DPIA (pentru prelucrarea datelor personale), RoPA, DSAR, AI Discovery/PII scan, FRIA (Art. 27), supraveghere umana (Art. 14), logging (Art. 12), PMM (Art. 72), QMS (Art. 17), AI Ads & Claims, transparenta (Art. 50) etc. Fiecare actiune creeaza un `finding` in modulul Resolve; consultantul ataseaza dovezi (documente, capturi de ecran, loguri), marcheaza rezolvat sau cere informatii suplimentare.

8. **Monitorizare si preventie:** se seteaza memento-uri si scannere preventive pentru expirarea contractelor, schimbari legislative si revizuiri periodice. Teleport subliniaza importanta monitorizarii post-piata si a lantului de dovezi, astfel incat consultantul trebuie sa planifice revizuiri continue.

9. **Generarea Audit Pack-ului:** dupa parcurgerea tuturor obligatiilor, consultantul exporta Audit Pack-ul (ZIP cu hash-chain) pentru client. Pachetul include inventarul AI, DPIA, registre, documentatie Annex IV, loguri, rapoarte de supraveghere, incident reports. Clientul primeste audit pack-ul si un link de verificare publica.

10. **Raportare si upsell:** consultantul foloseste rapoarte cross-client pentru a prioritiza clientii cu riscuri mari si pentru a demonstra valoarea serviciilor. Ofertele pot include abonament lunar sau pachete one-off de audit.

### Gap-uri identificate

- **Import de date incomplet:** desi exista import de clienti, nu exista inca import de sisteme AI, furnizori si RoPA; roadmap-ul indica aceasta functionalitate. Lipsa integrarii cu Excel/Sheets sau platforme CRM inseamna munca manuala semnificativa.
- **Flux `nu am fisier` limitat:** trebuie clarificat fluxul pentru situatiile in care consultantul nu are fisier; modulul ar trebui sa genereze automat un questionnaire.
- **Integrare cu spatii externe:** consultantii folosesc frecvent Google Workspace, Microsoft 365, Notion, Jira. Lipsa integrarilor limiteaza adoptarea; prima integrare recomandata este Excel/Sheets, urmata de Google Workspace, deoarece majoritatea consultantilor gestioneaza registrele in tabele.
- **UI confuz intre HQ si workspace client:** comutarea trebuie clarificata pentru a evita situatiile in care consultantul incarca documente gresite. Un indicator vizibil al workspace-ului activ ar reduce confuzia.
- **Lipsa automatizarii AI Guidance:** orchestratorul produce actiuni deterministe, dar nu foloseste generarea asistata de LLM pentru formulari; Mistral-assisted composer este mentionat ca gap imediat. Totusi, legalitatea trebuie mentinuta (nu se pot emite verdicte fara interventie umana).
- **Onboarding clienti cu date incomplete:** pentru clienti fara notiuni de AI, consultantul trebuie sa ofere training si ghidaj. Aplicatia ar putea include tutoriale in limbaj simplu si mini-cursuri de AI literacy.

### Pachet minim client-ready pentru Cabinet

- Import Center complet (clienti, sisteme AI, furnizori, RoPA, AI Literacy).
- Flux `No data? Fill checklist` pentru fiecare tab; generati formulare automate pentru intake.
- Mod clar de comutare HQ/workspace client si indicator vizual de context.
- Audit Pack complet pentru fiecare client, inclusiv registrul de sisteme, DPIA, FRIA, loguri, plan PMM si QMS simplificat.
- Raport de progres cross-client cu scor de maturitate si recomandari de prioritizare.
- Integrare cu Excel/Sheets pentru import/export; fisiere template standardizate (CSV: clienti, sisteme, furnizori, RoPA, proiecte AI builder).
- Preturi: abonament lunar 399 EUR / 799 EUR plus pachete de audit one-off (ex. 1 000 EUR) pentru clienti ocazionali.

### Roadmap recomandat (Cabinet)

| Perioada | Actiune prioritara |
| --- | --- |
| 30 zile | Finalizati Import Center (sisteme AI, furnizori, RoPA); creati template-uri CSV; clarificati comutarea workspace-urilor; lansati modul `nu am fisier` cu checklisturi. Integrati primii consultanti piloti si colectati feedback. |
| 60 zile | Implementati integrarea cu Excel/Sheets si Google Workspace; lansati modul de training AI Literacy orientat catre clienti; introduceti rapoarte cross-client cu scor de maturitate. |
| 90 zile | Dezvoltati orchestrator asistat de LLM pentru generarea de recomandari si mesaje personalizate; rafinati modulul de audit trail; extindeti pachetele white-label si trust center; pregatiti campania comerciala catre piata CEE. |

## ICP 2 - IMM Classic (deployer pasiv)

### Cumparator real si job-to-be-done

**Cine cumpara:** firme intre 10 si 250 de angajati care folosesc AI preexistent: servicii de chat (ChatGPT, Copilot), instrumente de marketing automatizat, recrutare, analiza sau automatizare. Segmente relevante pentru Romania includ e-commerce, agentii de marketing, SaaS, clinici private, firme de recrutare si servicii financiare. Revista SQ Magazine noteaza ca costurile de conformitate pentru un singur sistem high-risk pot ajunge la aproximativ 52 000 EUR anual, iar obligatiile pot reprezenta pana la 40% din efortul de conformitate al unei companii.

**Job-to-be-done:** IMM-urile trebuie sa identifice ce sisteme AI folosesc, sa clasifice riscurile, sa implementeze masuri de transparenta, sa asigure supraveghere umana, sa gestioneze datele si sa pregateasca documentatia. Nu dispun de echipe specializate; au nevoie de un ghid clar si de un instrument care transforma cerintele legale in pasi simpli.

### Flux de utilizare ideal

1. **Onboarding rapid:** utilizatorul (manager de conformitate sau CEO) selecteaza rolul `IMM Classic` si introduce datele firmei. Aplicatia trebuie sa explice pe scurt Actul AI, evitand jargonul juridic, si sa evidentieze beneficiile (scaderea riscului de amenzi, castigarea contractelor, incredere). AI Policy Bulletin mentioneaza ca IMM-urile se confrunta cu povara disproportionata si ca trebuie oferit suport practic.

2. **Inventar AI intuitiv:** modulul `Sisteme` trebuie sa permita adaugarea rapida a produselor AI utilizate (ChatGPT, Copilot, CRM cu AI, software HR etc.) prin selectarea din liste predefinite; se pot oferi exemple de utilizari high-risk (recrutare, scor de credit) pentru a ajuta utilizatorul sa identifice riscurile. O integrare cu Microsoft 365/Google Workspace ar putea extrage aplicatiile folosite.

3. **Clasificare risc si practici interzise:** pentru fiecare sistem, utilizatorul completeaza un formular simplificat; aplicatia clasifica automat riscul (minimal/limited/high) si indica daca sistemul este interzis (ex. recunoastere faciala pentru scorare sociala). Documentatia dataguard arata ca high-risk systems apar in recrutare, creditare si educatie.

4. **Ghidare pas-cu-pas:** dashboard-ul `Plan de lucru AI` listeaza pasii necesari: notificarea personalului si clientilor (transparenta), completarea DPIA, FRIA (impact asupra drepturilor fundamentale), revizuirea furnizorilor, pregatirea notificarilor Art. 50, adoptarea politicii AI si training AI literacy. Obligativitatea dezvoltarii alfabetizarii AI este confirmata in surse.

5. **Colectarea dovezilor:** pentru fiecare actiune, utilizatorul poate atasa capturi de ecran, politici sau contracte. Aplicatia trebuie sa ofere template-uri pentru notificari si politici, precum si exemple de DPIA simplificate. Conform actului, mici intreprinderi beneficiaza de documentatie simplificata, deci modulul trebuie sa reflecte aceasta simplificare.

6. **Monitorizare continua:** modulul preventiv trimite notificari cand apar modificari legislative, cand expira revizuirea DPIA sau cand apar incidente. Aplicatia ar trebui sa reaminteasca utilizatorilor sa verifice daca sistemele noi intra in categoria high-risk.

7. **Export readiness pack:** la final, IMM-ul poate descarca un readiness pack (registru de sisteme, DPIA, FRIA, notificari) pentru audituri. Pentru nivelul IMM Mid, se poate genera Audit Pack complet (inclusiv loguri, post-market monitoring) in cazul in care compania este furnizor/deployer de high-risk.

8. **Suport si upsell:** clientul primeste digest lunar cu noutati; poate fi oferita consultanta suplimentara (Cabinet) pentru evaluarea detaliata. In timp, IMM-ul poate trece de la IMM Solo la IMM Mid pentru a accesa Audit Pack si AI Ads.

### Gap-uri identificate

- **Explicatii accesibile:** trebuie dezvoltate module de AI literacy in limbaj non-tehnic. Articolul dataguard evidentiaza obligatia de a dezvolta alfabetizarea AI. Fara explicatii clare, IMM-urile vor abandona onboarding-ul.
- **Import automat al aplicatiilor folosite:** integrarea cu Microsoft 365/Google Workspace pentru a extrage aplicatii si plugin-uri AI ar reduce munca manuala. Lista de sisteme predefinite poate fi extinsa la CRM, HR software, analytics etc.
- **DPIA/RoPA simplificate:** IMM-urile au resurse limitate; trebuie oferite template-uri scurte si ghidate. Modulul DPIA ar trebui sa sugereze campuri precompletate si exemple.
- **Formulare pentru FRIA:** putine IMM-uri cunosc conceptul de `Fundamental Rights Impact Assessment`. Aplicatia ar trebui sa explice ce implica Art. 27 si sa ofere un formular simplificat.
- **Lipsa integrarii cu e-commerce/marketing:** multe IMM-uri folosesc platforme e-commerce cu AI (personalizare, recomandari). Integrarea cu aceste platforme (Shopify, WooCommerce) ar ajuta la inventariere.

### Pachet minim client-ready pentru IMM Classic

- Onboarding cu explicatii clare si exemple; modul AI literacy de baza.
- Inventar AI cu liste predefinite si integrare M365/Google; flux `nu stiu ce AI folosesc` cu sondaj.
- Clasificare risc automata si alerta pentru sisteme interzise; evidentierea obligatiilor pentru high-risk.
- DPIA/RoPA/FRIA simplificate si template-uri de notificare (transparenta si worker info). Anumite obligatii pot fi optionale pentru IMM Solo.
- Ready Pack exportabil in 30 minute: inventar, DPIA scurt, notificari, vendor review.
- Preturi: IMM Solo 99 EUR pe luna (include inventar, transparenta, DPIA scurt); IMM Mid 249 EUR pe luna (include Audit Pack, AI Ads & Claims). Trial de 14 zile.

### Roadmap recomandat (IMM)

| Perioada | Actiune |
| --- | --- |
| 30 zile | Simplificarea onboarding-ului cu explicatii non-juridice; finalizarea modulului AI Literacy; introducerea template-urilor DPIA si notificari. |
| 60 zile | Integrare cu Microsoft 365/Google Workspace pentru detectarea automata a aplicatiilor AI; lansarea modului `Nu stiu ce AI folosesc`. |
| 90 zile | Extindere spre e-commerce si marketing (conectori Shopify, WooCommerce); modul de FRIA simplificat; pregatirea campaniei de marketing orientate pe segmente (e-commerce, agentii marketing, clinici). |

## ICP 3 - AI Builder (startup / agentie AI)

### Cumparator real si job-to-be-done

**Cine cumpara:** startup-uri care dezvolta produse cu componente AI, agentii de automatizare, furnizori de chatboturi, SaaS cu AI integrat si consultanti tehnici care livreaza sisteme AI pentru clienti. Conform dataguard, furnizorii de sisteme AI poarta cele mai multe obligatii.

**Job-to-be-done:** AI Builder trebuie sa documenteze intregul ciclu de viata al unui sistem: definirea scopului, gestionarea datelor, asigurarea conformitatii cu Articolele 9-15 (sistem de management al riscului, calitatea datelor, documentatie tehnica, logare, transparenta, supraveghere umana, robustete), implementarea unui QMS, pregatirea Annex IV, realizarea EU DoC/CE Marking, inregistrarea in baza de date UE si monitorizarea post-piata (Art. 72). Teleport subliniaza ca lipsa controlului versiunilor si a monitorizarii post-piata reprezinta gap-uri comune.

### Flux de utilizare ideal

1. **Onboarding rol AI Builder:** echipa selecteaza profilul AI Builder si configureaza primul proiect (nume sistem, descriere, domeniu). Se adauga membri si se stabileste rolul (product owner, compliance lead, inginer ML).

2. **Inventar AI si role assessment:** se inregistreaza fiecare sistem AI dezvoltat sau integrat; se clasifica rolul (provider, deployer, importator, distribuitor) si riscul sistemului. Pentru GPAI integrate, se evalueaza daca modificarile depasesc pragurile de compute impuse de Act (1/3 din antrenament).

3. **Annex IV / documentatie tehnica:** modulul `Conformitate` ghideaza echipa sa completeze detaliile cerute de Annex IV: descriere generala, algoritmi si metode, obiectivele sistemului, surse de date, proceduri de control al calitatii datelor, evaluari de performanta si limitari. Documentatia trebuie sa permita autoritatilor sa evalueze conformitatea fara a re-ingineriza modelul.

4. **Sistem de management al riscului si QMS:** se configureaza planul RMS (identificarea si evaluarea riscurilor, masuri de mitigare); modulul QMS din CompliRoAI ofera un cadru pentru sectiunile Art. 17. Echipa poate importa proceduri existente (ISO 27001) si poate conecta QMS cu repo-urile de cod.

5. **Calitatea datelor si guvernanta:** se incarca registre de date cu descrierea seturilor de antrenament, validare si test; se documenteaza masurile de detectare si mitigare a biasului. Aplicatia ar trebui sa permita atasarea link-urilor catre sursele de date si a versiunilor datasetului.

6. **Logging si trasabilitate:** modulul `Logging Evidence` trebuie sa colecteze evenimente (inputuri, outputuri, decizii), identificand actorii si parametrii relevanti. Ar fi utila integrarea directa cu pipeline-urile CI/CD, registrul de modele si platformele de evaluare.

7. **Supraveghere umana si evaluare FRIA:** se defineste procesul de review uman (Art. 14) si se realizeaza FRIA (Art. 27). Pentru agentic workflows, se documenteaza interpretabilitatea, tehnicile de explicabilitate si procedurile fallback.

8. **PMM si incident reporting:** modulul `Post-Market Monitoring` configureaza verificari periodice; echipa stabileste indicatori de performanta si alerte pentru deriva modelului. In cazul incidentelor grave, modulul `AI Incidents` ajuta la raportarea rapida (2/10/15 zile) catre autoritati.

9. **EU Database Wizard:** sistemul completeaza formularul pentru inregistrarea in baza de date UE si genereaza EU Declaration of Conformity; se emite marcajul CE si codul QR. Documentatia finala se include in Audit Pack.

10. **API/SDK & livrare catre client:** modulul API/SDK permite integrarea verificarii in runtime (ex. `/classify`, `/gate`). Pentru fiecare proiect livrat, AI Builder genereaza un `Project Handover Pack` care contine Annex IV, EU DoC, QMS, loguri, fisier `ai-compliance.yaml` si plan de monitorizare. Companiile cliente pot importa aceste pachete in workspace-ul lor CompliRoAI.

### Gap-uri identificate

- **Integrare cu devops:** lipsesc conectorii nativi cu GitHub/GitLab, Vercel, registry de modele si instrumente de evaluare. Fara aceste integratii, loggingul si PMM raman manuale.
- **Model registry & metadata:** trebuie implementata o structura `model_registry` pentru a urmari versiuni, dataseturi, parametri, compute si semnatura modelului (hash). Teleport evidentiaza ca lipsa controlului versiunilor si documentatia incompleta sunt gap-uri frecvente.
- **Evidence layer standard:** un fisier `ai-compliance.yaml` ar trebui generat automat, continand datele despre antrenament, evaluari, loguri, QMS. Aceasta sursa de adevar ar putea fi exportata catre clienti.
- **Simplificarea pentru agentii mici:** multe agentii realizeaza proiecte simple (chatbot pentru suport, agent marketing) care nu cad sub high-risk; platforma trebuie sa permita un flux `light` fara QMS complet, altfel utilizatorii se vor simti coplesiti.
- **Integrare cu billing AI (OpenAI/Mistral):** conectarea la facturile modelului ar putea asigura trasabilitatea costurilor si a compute-ului, utila pentru determinarea daca modificarile depasesc pragurile de compute.

### Pachet minim client-ready pentru AI Builder

- Onboarding cu ghid pas-cu-pas pentru a completa Annex IV; template-uri pentru fiecare sectiune.
- QMS si RMS simplificate, adaptate pentru startup-uri; posibilitatea de a importa proceduri ISO/IEC existente.
- Logging Evidence integrat cu repo-urile de cod; generarea automata a fisierului `ai-compliance.yaml` si a registrului de modele.
- Modul API/SDK complet documentat cu exemple; rate limiting si audit logging activat.
- Handover Pack exportabil: Annex IV, EU DoC, CE Marking, QMS, PMM plan, loguri, FRIA. Clientii pot utiliza pachetul pentru procurement enterprise.
- Preturi: 399 EUR pe luna, cu posibilitatea de pachet one-off pentru proiecte (ex. 1 500 EUR pentru `AI project handover pack`).

### Roadmap recomandat (AI Builder)

| Perioada | Actiune |
| --- | --- |
| 30 zile | Implementati modul `model_registry` si fisier `ai-compliance.yaml`; finalizati EU Database Wizard; pregatiti template-uri Annex IV si Handover Pack. |
| 60 zile | Lansati integrarea cu GitHub/GitLab si CI/CD pentru colectarea logurilor; creati plugin pentru Vercel/Netlify; oferiti API-uri pentru incarcarea metadatelor datasetului. |
| 90 zile | Dezvoltati integrari cu platforme de evaluare (OpenAI Evals, proprietare), cu facturarea modelelor (OpenAI/Mistral) si implementati planuri adaptate agentiilor mici (mod `light`). Pregatiti campania de marketing `procurement-ready AI compliance pack`. |

## Relevanta comerciala si recomandari generale

### Segmente de piata si declansatori de cumparare

**Cabinet:** segmentul cu cel mai rapid potential de venit; DPO-ii si consultantii au deja clienti care solicita pachete de conformitate pentru a evita amenzi si a satisface cerinte de achizitie enterprise. Investitia initiala (399-799 EUR lunar) este justificata de posibilitatea de a servi mai multi clienti simultan.

**IMM Classic:** segment numeros, dar sensibil la pret; cumpara daca exista presiunea unor clienti enterprise sau a controalelor de la autoritati, daca reputatia e importanta sau daca primesc subventii. Promisiunea trebuie orientata spre reducerea riscului si castigarea contractelor. Pachetul minim trebuie livrat in 30 minute.

**AI Builder:** segment emergent; obligatiile legale sunt mari, iar clientii enterprise cer dovezi de conformitate. Startup-urile pot fi dispuse sa plateasca 399 EUR/luna pentru a evita penalizari de milioane. Declansatorii includ cerinte de procurement, investitii VC si audituri interne.

### Riscuri de supra-promisiune (overclaim)

- **Nu promiteti consultanta juridica automata:** platforma trebuie sa fie prezentata ca un `OS de executie si evidenta`, nu ca un substitut al avizului juridic.
- **Nu creati verticala fiscala:** evitati sa extindeti produsul catre e-factura, SAF-T sau pay transparency, conform guardrail-urilor. Concentrati-va pe AI compliance.
- **Evitati sa vizati GPAI providers cu risc sistemic:** legislatia pentru GPAI de risc sistemic este in evolutie; pentru piata romaneasca din 2026 nu este prioritara.
- **Nu cereti documentatie completa upfront:** onboarding-ul trebuie sa permita date incomplete si sa ofere guidance progresiv; altfel utilizatorii vor abandona.

## Concluzii

CompliRoAI are o arhitectura solida si acopera majoritatea obligatiilor Actului AI si GDPR. Pentru a atinge maturitatea comerciala, trebuie completate fluxurile de import, integrate platformele folosite de utilizatori, simplificate formularele pentru IMM-uri si create pachete de livrare pentru AI Builders. Focusul pe un lant de dovezi verificabil si pe explicarea clara a obligatiilor va diferentia produsul intr-o piata in crestere, unde costurile de conformitate pot depasi 50 000 EUR per sistem. Prin prioritizarea segmentului de Cabinet si lansarea programelor pilot cu 5 consultanti si 20 de IMM-uri, CompliRoAI poate valida fluxurile, ajusta preturile si pregati extinderea catre CEE.

---

# Addendum strategic: CompliRoAI flow-first, nu module-first

Primul gap major este ca produsul trebuie sa porneasca din situatii concrete, nu din meniu: client nou, tool AI necunoscut, proiect aproape livrat sau audit urgent. Ai nevoie de misiuni ghidate care transforma haosul in dosar utilizabil.

## Verdict brutal

Aplicatia are coverage bun pe module, dar inca risca sa fie perceputa ca `un dashboard cu 20 de pagini de compliance`. Pentru utilizatorul real, asta este prea mult. El nu gandeste in `FRIA / QMS / Art. 50 / PMM / RoPA`. El gandeste asa:

> Am un client / un tool / un proiect AI. Ce trebuie sa fac concret ca sa nu ma fac de ras, sa pot demonstra ce am facut si sa trimit un dosar?

Deci gapul principal nu este ca lipsesc inca 5 module. Gapul principal este orchestration-ul de lucru real:

`import -> intrebari -> inventar -> clasificare -> dovezi -> review -> export -> monitorizare`

CompliRoAI este deja descris ca `AI Act + GDPR Compliance OS` pentru 3 workspace-uri: Cabinet, IMM Classic si AI Builder. Are deja module serioase: inventar AI, role/risk assessment, evidence vault, findings, audit pack, GDPR bridge, vendor review, FRIA, oversight, logging, PMM, incidents, QMS, conformity, EU DB wizard si preventive engine.

Problema: in viata reala, oamenii nu intra in aplicatie ca sa completeze module. Intra pentru ca au un trigger, un stres si un deadline.

## 1. Realitatea pietei: ce valideaza produsul

In UE, AI-ul nu mai este doar hype: in 2025, 19,95% dintre intreprinderile UE cu 10+ angajati foloseau tehnologii AI, iar diferenta pe marime este clara: 17% firme mici, 30,36% firme medii, 55,03% firme mari. Cele mai active sectoare sunt Information & Communication si Professional, Scientific and Technical Services. Asta valideaza targetul pentru AI Builder, agentii, SaaS, consultanti, firme tech si firme de servicii profesionale.

Pe partea legala, presiunea este reala. AI Act a intrat in vigoare la 1 august 2024; interdictiile si AI literacy se aplica din 2 februarie 2025; obligatiile pentru GPAI se aplica din 2 august 2025; iar dupa acordul politic din 7 mai 2026, unele obligatii high-risk au calendar modificat: anumite sisteme stand-alone high-risk ar urma sa intre la 2 decembrie 2027, iar cele integrate in produse la 2 august 2028.

Comisia a publicat in mai 2026 draft guidelines pentru clasificarea sistemelor high-risk, cu exemple practice, iar ghidurile urmaresc exact structura Art. 6: high-risk ca safety component/produs reglementat sau high-risk prin domeniile din Annex III. Pentru Art. 50, Comisia a publicat draft guidelines pe 8 mai 2026, tocmai pentru transparenta si etichetare AI.

In Romania, presiunea este si mai haotica. Multe companii romanesti folosesc deja sisteme AI fara sa fi evaluat categoria de risc sau obligatiile, iar AI Act si GDPR au logici diferite: GDPR porneste de la persoana/date personale, AI Act porneste de la sistemul AI si riscul creat. CEE Legal Matters noteaza ca Romania isi consolideaza cadrul institutional, cu ANCOM propus ca autoritate centrala de supraveghere de piata si punct unic de contact, iar autoritatile vor cere documentatie structurata: descriere sistem, clasificare risc, Annex IV pentru high-risk, surse de date, validare, cybersecurity, human oversight, training records, incident response si governance.

Concurenta confirma directia: GDPR Register vinde exact `AI Register + risk classification + provider/deployer roles + DPIA/RoPA/vendor review + audit-ready records`. EQS vinde AI compliance cu risk classification, workflow management, responsabilitati si deadline-uri. DPO Europe vinde chiar un `AI Act Compliance Gap Assessment` de 45 de minute pentru un sistem AI, cu raport, clasificare si plan de gap closing.

Asta inseamna ca piata exista. Dar CompliRoAI trebuie sa loveasca mai pragmatic decat ei. Nu `uite module`. Ci `uite fluxul care iti produce dosarul`.

## 2. Gapul mare: aplicatia trebuie sa devina flow-first, nu module-first

Din contextul produsului, CompliRoAI are deja flow client-ready verificat pentru Cabinet: creare cont, import client CSV, client in portofoliu, intrare in executia clientului, deschidere finding, atasare dovada, rezolvare, iesire in cabinet si export Audit Pack.

Asta este bine. Dar este inca scheletul tehnic, nu flow-ul complet din viata consultantului.

Flow-ul real nu incepe cu `import CSV`. Incepe cu:

> Clientul m-a sunat. Zice ca foloseste ChatGPT si un chatbot pe site. Nu stie cine mai foloseste AI. Are DPO extern, un IT-ist part-time, HR-ul foloseste un tool de recrutare si marketingul baga AI in reclame. Eu trebuie sa scot ceva facturabil in 7 zile.

Sau pentru AI Builder:

> Enterprise clientul ne cere compliance pack inainte sa semneze. Noi avem GitHub, Vercel, OpenAI API, prompturi, loguri, dar nimeni nu stie cum arata un Annex IV sau cine e provider/deployer.

Sau pentru IMM:

> Am primit de la un client mare un chestionar: folositi AI? aveti policy? aveti training? aveti vendor review? Panica. Cineva a dat copy-paste din ChatGPT cu date de client. Seful vrea raspuns pana vineri.

Aici trebuie sa intre aplicatia.

## 3. Flow real ICP 1: Cabinet / DPO extern / consultant

### Persona realista

Radu, 42 ani, consultant GDPR / DPO extern. Are 25-60 clienti. Lucreaza cu Excel, Word, Google Drive / SharePoint, emailuri si template-uri vechi de GDPR. Nu are acces direct la sistemele clientului. De multe ori clientul nici nu stie ce AI foloseste. Radu trebuie sa transforme haosul in livrabile facturabile.

Clientul lui tipic este IMM cu 20-200 angajati, clinica, agentie, SaaS mic, firma de recrutare, call center, e-commerce sau firma de servicii. Clientul nu vrea `AI Act`. Vrea sa stie daca are risc si ce trebuie facut.

### Trigger de cumparare

Cele mai reale triggere sunt:

- Clientul primeste intrebare de la enterprise procurement.
- Managementul cere `politica AI`.
- Firma implementeaza Copilot / ChatGPT Team / chatbot.
- HR foloseste tool cu scoring / screening.
- Clientul are deja GDPR DPO si vrea sa adauge AI Act.
- Apare o cerere interna: `avem voie sa folosim AI cu date de client?`
- Consultantul vrea pachet nou de vandut in 2026.

Interlegal observa exact aceasta tensiune in Romania: external DPO contracts au fost gandite pentru GDPR, nu pentru AI Act, iar responsabilitatea pentru AI governance, technical documentation, FRIA support, vendor assessment si explainability este adesea neclara.

### Ce are Radu in ziua 1

Nu are `dosar complet`. Are mizeria clasica:

- lista de clienti in Excel;
- contracte DPO / GDPR;
- emailuri cu `avem ChatGPT?`;
- RoPA vechi, uneori incomplet;
- DPIA-uri facute pentru GDPR, nu pentru AI;
- politici GDPR;
- unele DPA-uri cu vendori;
- zero inventar AI;
- cateva informatii din discutii;
- multe necunoscute.

Asta inseamna ca aplicatia trebuie sa porneasca din date incomplete. Guardrail-ul corect este sa nu ceri utilizatorului dosar complet inainte de import si sa pornesti din date incomplete.

### Flow corect Cabinet: de la import la export

#### Pasul 0: Consultantul alege tipul de misiune

Inainte de import, el trebuie sa aleaga ce vinde:

- AI Act Quick Scan;
- AI + GDPR Readiness Pack;
- Client AI Inventory Sprint;
- Vendor AI Review;
- High-Risk Triage;
- Ongoing AI Compliance Monitoring.

Gap actual: aplicatia are module si pricing, dar nu pare sa aiba `misiuni comerciale` ca entry point. Consultantul nu cumpara module. Cumpara un mod de a livra servicii repetabile.

#### Pasul 1: Import client

Radu importa CSV cu:

- nume client;
- CUI;
- contact principal;
- email;
- industrie;
- numar angajati;
- DPO intern/extern;
- AI cunoscut: da/nu/nu stiu;
- deadline;
- pachet vandut.

Aplicatia are deja import CSV/TSV cu coloane RO/EN, preview, validari, duplicate, CUI/email, creare workspace client si actiuni initiale.

Gap: dupa import, fiecare client trebuie sa primeasca automat un status de certitudine:

- AI unknown;
- AI suspected;
- AI declared;
- AI inventory started;
- ready for review;
- export ready.

Fara asta, Radu vede clienti, dar nu vede unde curg banii.

#### Pasul 2: Workspace izolat pe client

Radu intra in client. Aici trebuie sa fie clar ca nu mai este in Cabinet HQ.

Ecranul trebuie sa spuna vizibil:

- Execuți pentru: Client X;
- Date client: incomplete;
- Urmatorul pas: trimite intake.

Exista deja workspace switch si exit execution.

Gap UX critic: sa nu existe confuzie intre firma consultantului si firma clientului. In flow real, asta poate produce greseli grave: export pentru client gresit, evidence atasat la client gresit, brand gresit.

#### Pasul 3: Intake catre client prin magic link

Radu nu completeaza singur tot. Trimite link catre client.

Magic link trebuie sa trimita sarcini pe roluri:

- CEO / administrator: scop business, riscuri, aprobari;
- IT: tooluri, vendori, security, logs;
- HR: recrutare, scoring, monitorizare angajati;
- Marketing: AI content, ads, generative tools;
- Sales / support: chatbot, CRM, call transcripts;
- DPO / legal: GDPR, RoPA, DPIA, DPA.

Exista deja magic links, public share, client intake si approvals.

Gap: magic link-ul trebuie sa fie task-based, nu doar formular. Clientul trebuie sa vada:

> Ai 7 intrebari. Dureaza 12 minute. Ataseaza documentele pe care le ai. Daca nu stii, marcheaza `nu stiu`.

Formularele lungi de 80 de intrebari trebuie evitate.

#### Pasul 4: Clientul declara AI-ul

Clientul nu stie `sisteme AI`. El stie `tooluri`.

Intrebarile trebuie sa fie pe limbaj real:

- Folositi ChatGPT, Copilot, Gemini, Claude?
- Aveti chatbot pe site?
- HR foloseste tool pentru CV-uri?
- Marketing genereaza imagini/texte/reclame cu AI?
- Suportul transcrie apeluri?
- Aveti scoring de clienti?
- Analizati comportamentul utilizatorilor?
- Folositi AI in decizii despre oameni?

Din raspunsuri, aplicatia creeaza automat:

- AI use case;
- AI system;
- vendor;
- owner;
- risc preliminar;
- finding daca lipseste informatie.

Gap major: separa AI Use Case de AI System.

Exemplu: ChatGPT este vendor/tool. Dar use case-urile pot fi:

- marketing copy;
- analiza CV-urilor;
- raspuns la tichete client;
- generare contracte;
- analiza date medicale.

Acelasi tool poate avea risc minim intr-un departament si risc mare in altul. Daca aplicatia trateaza totul ca `un sistem AI`, o sa dea clasificari false.

#### Pasul 5: Clasificare rol + risc

Aplicatia ruleaza clasificarea:

- deployer;
- provider;
- posibil provider prin modificare;
- importer/distributor;
- risk category;
- Art. 50 trigger;
- GDPR overlap;
- DPIA/FRIA need;
- high-risk candidate.

Exista deja Role Assessment si Risk Classification.

Gap: flow-ul trebuie sa aiba o intrebare explicita de role flip / Article 25:

- Ai pus toolul sub brandul tau?
- Ai schimbat scopul fata de vendor?
- Ai modificat substantial sistemul?
- Il vinzi mai departe clientului?

Art. 25 poate face ca un deployer/importer/distribuitor sa devina provider daca pune sistemul pe piata sub numele lui, modifica scopul sau face modificari substantiale.

Asta este un flow critic pentru IMM-uri si AI Builders. Fara el, produsul poate subestima obligatiile.

#### Pasul 6: Evidence chase

Dupa clasificare, aplicatia genereaza `De rezolvat`:

- lipseste DPA vendor;
- lipseste policy AI;
- lipseste training evidence;
- lipseste transparency notice;
- lipseste human oversight owner;
- lipseste log retention;
- lipseste DPIA/RoPA;
- lipseste approval management.

Exista deja findings, evidence vault, audit log, hash-chain si export.

Gap critic: fiecare finding trebuie sa aiba:

- owner;
- due date;
- severity;
- required evidence;
- acceptable evidence examples;
- data certainty;
- review status;
- export inclusion.

Nu doar `task rezolvat`. Ci `dovada validabila`.

#### Pasul 7: Consultant review

Radu nu vrea ca aplicatia sa decida legal singura. Vrea sa vada:

- ce a completat clientul;
- ce a dedus sistemul;
- ce nu este sigur;
- ce trebuie verificat manual;
- ce poate exporta.

Principiul corect este: law-first, determinist, LLM explica dar nu schimba verdictul legal fara validare.

Gap: adauga statusul:

- Consultant review required.

Si statusuri:

- system suggested;
- consultant reviewed;
- client confirmed;
- approved for export.

Asta diferentiaza produsul de un `AI legal chatbot` dubios.

#### Pasul 8: Export Audit Pack

Audit Pack pentru Cabinet trebuie sa fie white-label si client-scoped:

- executive summary;
- AI inventory;
- role/risk classification;
- obligations map;
- findings;
- resolved evidence;
- open risks;
- vendor review;
- policy pack;
- literacy proof;
- DPIA/FRIA status;
- transparency notices;
- audit log;
- hash/verify link.

Exista deja Audit Pack per client, Trust Center, white-label, verify pack, PDF generator si audit log.

Gap: exportul trebuie sa aiba 3 variante:

- Management Summary: 5 pagini, pentru CEO.
- Consultant Working Pack: detaliat, cu findings.
- Audit / Authority Pack: doar dovezi, hash, trasabilitate.

Daca dai acelasi PDF tuturor, nimeni nu este fericit. CEO-ul adoarme. Consultantul zice ca este prea superficial. Autoritatea vrea dovezi, nu marketing.

#### Pasul 9: Monitorizare recurenta

Dupa export, flow-ul real continua:

- reminder peste 30/60/90 zile;
- vendor DPA expirat;
- sistem nou introdus;
- training reinnoit;
- Art. 50 update;
- schimbare legislativa;
- client necompletat;
- review periodic.

Exista preventive engine, renewal tracker, cron routes, email reminders si monthly digest.

Gap: pentru Cabinet, trebuie dashboard cross-client:

- 12 clienti fara AI inventory;
- 7 clienti fara AI policy;
- 4 clienti cu chatbot fara notice;
- 2 clienti cu HR AI high-risk candidate;
- 5 audit packs export-ready.

Asta este vanzare. Radu vede unde factureaza.

## 4. Flow real ICP 2: IMM Classic / deployer pasiv

### Persona realista

Ana, 36 ani, operations manager intr-un IMM de 80 angajati. Nu este jurista. Nu este DPO. Se ocupa de furnizori, proceduri, uneori HR, uneori IT. Firma foloseste ChatGPT, Copilot, Canva AI, HubSpot AI, un chatbot pe site, un ATS cu AI si tooluri de marketing. Nimeni nu are o lista oficiala.

Ea nu vrea AI Act. Vrea sa stie:

> Ce avem voie? Ce trebuie sa interzicem? Ce document trebuie sa arat daca ma intreaba clientul?

### Trigger de cumparare

Cele mai bune triggere pentru IMM:

- Client enterprise cere chestionar AI / vendor security.
- DPO extern spune ca trebuie inventar AI.
- Angajatii folosesc ChatGPT cu date interne.
- Firma introduce Copilot / ChatGPT Team.
- Firma pune chatbot pe site.
- Firma genereaza continut public / reclame cu AI.
- HR foloseste screening/scoring.
- Board-ul cere politica interna AI.

Pentru IMM, frica de amenda este slaba daca o pui singura. Triggerul puternic este:

> Un client, auditor, DPO sau partener ne cere dovada.

### Ce are Ana in ziua 1

Nu are inventar AI. Are:

- lista de abonamente in contabilitate;
- facturi de la OpenAI, Microsoft, Google, Canva, HubSpot, Zendesk etc.;
- tooluri folosite de departamente;
- website cu chatbot;
- politica GDPR veche;
- poate RoPA incomplet;
- poate DPA-uri in contracte;
- zero AI literacy evidence;
- zero transparency register.

### Flow corect IMM: de la zero la dosar in 30 minute

#### Pasul 0: Limbaj simplu

Primul ecran nu trebuie sa spuna `conformitate Regulamentul UE 2024/1689`. Spune:

> Folositi AI in firma? Hai sa aflam ce tooluri exista, ce riscuri au si ce trebuie documentat.

Exista deja onboarding IMM + companie + primul sistem AI.

Gap UX: IMM-ul nu stie ce este `sistem AI`. Intreaba-l de tooluri si activitati, nu de sisteme.

#### Pasul 1: Discovery pe departamente

Aplicatia intreaba:

- Marketing foloseste AI?
- HR foloseste AI?
- Sales/support foloseste AI?
- IT/dev foloseste AI?
- Financiar foloseste AI?
- Management foloseste AI?

Pentru fiecare departament:

- tool;
- scop;
- date personale;
- date confidentiale;
- decizie despre oameni;
- output public;
- human review;
- vendor.

Gap: ai nevoie de `department-based intake`. IMM-ul isi aminteste pe departamente, nu pe articole de lege.

#### Pasul 2: Approved / Restricted / Banned AI tools

Dupa discovery, aplicatia creeaza o lista:

- Approved: ChatGPT Team pentru texte fara date personale.
- Restricted: Copilot cu date client.
- Needs review: HR screening tool.
- Not allowed: upload documente medicale/client intr-un cont personal.

Asta este livrabil imediat. IMM-ul simte valoare in 10 minute.

#### Pasul 3: Risk triage

Aplicatia clasifica simplu:

- Verde: uz intern, low risk.
- Galben: personal data / vendor risk / transparency.
- Rosu: HR, credit, health, education, biometric, automated decision.
- Stop: practici interzise / nudification / social scoring / emotion recognition la munca.

Comisia listeaza zona high-risk prin produse reglementate sau Annex III, iar domenii precum education, employment, biometrics, critical infrastructure, migration sunt sensibile.

Gap: pentru IMM, nu afisa toate modulele avansate. Arata un `next best step`:

- Ai chatbot pe site -> creeaza transparency notice.
- Folosesti AI in HR -> cere review consultant.
- Folosesti ChatGPT cu date personale -> verifica vendor/DPA + policy.

#### Pasul 4: AI policy + literacy

Din toolurile detectate, generezi:

- AI Acceptable Use Policy;
- lista tooluri aprobate;
- reguli de date;
- reguli pentru output public;
- reguli de human review;
- training evidence.

AI literacy se aplica deja din 2 februarie 2025, deci este un wedge perfect pentru IMM: mic, clar, obligatoriu, usor de vandut.

Gap: AI Literacy nu trebuie sa fie doar modul. Trebuie sa fie flow:

- alegi roluri angajati;
- trimiti mini-training;
- salvezi confirmari;
- exportezi dovada.

#### Pasul 5: Vendor review

Pentru fiecare vendor AI:

- cine este vendorul;
- ce date intra;
- regiune;
- DPA;
- subprocesatori;
- training opt-out;
- retention;
- enterprise plan sau cont personal;
- cine aproba.

GDPR Register si alte platforme valideaza ca legarea AI Act de DPIA, RoPA si vendor review este un workflow de piata, nu o inventie.

Gap: pentru IMM, vendor review trebuie sa fie precompletat pe vendorii mari. Nu-l pune pe Ana sa caute subprocesatori la Microsoft la 23:00.

#### Pasul 6: Transparency Art. 50

Daca firma are chatbot sau continut public AI:

- notice text;
- unde apare;
- screenshot dovada;
- owner;
- data ultimei verificari.

Comisia a publicat draft guidelines pentru transparenta Art. 50, iar code of practice pentru marking/labelling este parte din implementare.

Gap: ai nevoie de `screenshot proof`. Pentru IMM, dovada reala este o captura de pe site cu `Acest chat foloseste AI`.

#### Pasul 7: Readiness Pack

Pentru IMM, exportul nu trebuie sa fie `Audit Pack` greu. Trebuie sa fie:

- AI Use Register;
- AI Safe Use Policy;
- Training evidence;
- Vendor review summary;
- Open issues;
- Client-ready response pack.

Exista deja Readiness Pack si Audit Pack pe tieruri.

Gap: creeaza pachetul `raspuns la client enterprise`. Acolo sunt banii.

#### Pasul 8: Monthly digest

Ana vrea email lunar:

- Ce s-a schimbat?
- Ce trebuie facut?
- Ce expira?
- Ce tool nou a fost adaugat?
- Ce risc nou avem?

Exista deja preventive scanner si monthly digest ca directie finala.

## 5. Flow real ICP 3: AI Builder / agentie AI / startup AI-native

### Persona realista

Mihai, 31 ani, fondator agentie AI automation. Construieste chatboturi, agenti, copilots si automatizari pentru clienti. Stack: GitHub, Vercel, OpenAI/Anthropic/Mistral, Supabase, n8n, Make, LangChain, logs in cloud, prompturi in repo sau Notion. Clientul enterprise intreaba:

> Ai documentatie AI Act? Cine e provider? Ce date foloseste? Unde sunt logurile? Cum facem human oversight? Ce se intampla la incident?

Mihai nu vrea sa devina jurist. Vrea sa livreze proiectul si sa inchida contractul.

### Trigger de cumparare

- Client enterprise cere due diligence.
- RFP cere AI governance.
- Proiectul intra in HR, medical, educatie, credit, asigurari.
- Clientul cere DPA, security, audit, model documentation.
- Agentia vrea sa includa `AI compliance pack` in oferta.
- Startup-ul vrea procurement-ready pack pentru investitori / clienti.

### Ce are Mihai in ziua 1

Are:

- GitHub repo;
- README vag;
- arhitectura in Miro/Figma/Notion;
- deployment in Vercel/AWS;
- OpenAI/Mistral/Anthropic API;
- model names;
- prompts;
- logs partiale;
- test cases;
- client contract;
- descriere business;
- zero Annex IV;
- zero role matrix;
- zero PMM.

### Flow corect AI Builder: de la proiect la handover pack

#### Pasul 0: Creeaza AI Project, nu doar AI System

Primul obiect nu trebuie sa fie doar `sistem AI`. Pentru builder este `proiect livrabil`.

Campuri:

- client;
- nume proiect;
- produs / custom delivery;
- intended purpose;
- user groups;
- deployment environment;
- model providers;
- data sources;
- output actions;
- human review;
- go-live date;
- buyer / approver.

Exista AI Builder cu inventar, role assessment, Annex IV, EU DoC, CE, EU DB, API/SDK.

Gap: introdu obiectul AI Project ca orchestrator peste AI System.

#### Pasul 1: Intended purpose builder

AI Act se joaca pe `intended purpose`. Builderul trebuie fortat sa scrie clar:

- ce face sistemul;
- pentru cine;
- ce nu face;
- ce decizii nu are voie sa ia;
- ce date nu are voie sa primeasca;
- ce output este doar recomandare;
- unde trebuie human review.

Asta devine parte din client handover pack.

Gap critic: fara intended purpose strict, clasificarea role/risk devine moale. Iar in compliance, moale inseamna scump mai tarziu.

#### Pasul 2: Role split

Aplicatia trebuie sa intrebe:

- Cine a definit scopul?
- Cine controleaza datele?
- Cine implementeaza sistemul?
- Cine il vinde sub brand propriu?
- Cine face modificari dupa go-live?
- Cine monitorizeaza outputul?
- Cine raspunde la incident?

Apoi creeaza matrice:

- Builder = provider / subcontractor / technical supplier.
- Client = deployer / provider / controller.
- Model vendor = GPAI provider / processor / subprocessor.
- Cloud vendor = infrastructure supplier.

Gap: trebuie `Responsibility Matrix` exportabila. Fara asta, builderul ramane in aer contractual.

#### Pasul 3: Model/vendor chain

Pentru fiecare proiect:

- model provider;
- model name/version;
- hosted API/local;
- data sent to model;
- retention;
- training opt-out;
- region;
- fallback model;
- monitoring;
- prompt injection safeguards;
- third-party components.

GPAI obligations au reguli separate si Comisia are Q&A pentru modele general-purpose.

Gap: CompliRoAI trebuie sa faca diferenta clara intre:

- builder care foloseste OpenAI API;
- builder care fine-tuneaza;
- builder care dezvolta model propriu;
- builder GPAI systemic, care nu este target Romania 2026.

#### Pasul 4: Risk/high-risk classifier

Daca proiectul este in HR, credit, insurance, education, medical, biometrics etc., trebuie flow high-risk. Daca nu, flow simplificat.

Pentru high-risk:

- Annex IV technical file;
- QMS;
- logging;
- human oversight;
- accuracy/robustness/cybersecurity;
- post-market monitoring;
- incident reporting;
- conformity assessment;
- EU DoC;
- CE marking;
- EU database.

Exista deja modulele acestea.

Gap: trebuie flow de progres:

`8% complete -> 35% complete -> blocked by missing evals -> ready for legal review -> ready for client handover`

Altfel, builderul se pierde in module.

#### Pasul 5: Evidence from engineering

Aici este diferentiatorul mare.

Builderul nu vrea sa upload-eze PDF-uri manual. Vrea sa legi:

- GitHub/GitLab;
- Vercel;
- CI/CD;
- OpenAI/Mistral/Anthropic settings;
- logs;
- eval results;
- model cards;
- test reports;
- prompt versions;
- dataset lineage.

In roadmap exista `Monitoring Evidence Foundation: ai-compliance.yaml, repo/config drift, runtime logging, model/eval evidence, drift -> finding -> guidance`.

Gap prioritar AI Builder: `ai-compliance.yaml` trebuie sa devina centrul flow-ului.

Exemplu:

```yaml
system_name: CV Screening Assistant
intended_purpose: assists recruiters, does not reject candidates automatically
model_provider: OpenAI
model_name: gpt-4.1
human_review_required: true
logs_retention_days: 180
personal_data: true
high_risk_candidate: true
owner: product@client.com
```

Din acest YAML, CompliRoAI poate crea:

- finding daca lipseste human oversight;
- finding daca logs retention este sub minim;
- evidence daca exista eval report;
- warning daca intended purpose a fost schimbat.

#### Pasul 6: Client handover pack

La final, builderul exporta:

- AI System Card;
- Intended Purpose Statement;
- Role Responsibility Matrix;
- Vendor/model chain;
- Data flow summary;
- Human oversight design;
- Logging plan;
- Evaluation report;
- Incident process;
- Client obligations;
- Transparency notices;
- Open risks;
- Annex IV draft daca este cazul.

Gap: Audit Pack generic nu este suficient. AI Builder are nevoie de Project Handover Pack.

Mesajul comercial:

> Predai proiecte AI cu compliance pack inclus.

Asta vinde.

#### Pasul 7: Post-go-live monitoring

Dupa lansare:

- versiune noua;
- prompt modificat;
- model schimbat;
- date noi;
- client schimba scopul;
- incident;
- drift;
- overreliance;
- output contestat.

Aici CompliRoAI trebuie sa intrebe:

> Aceasta modificare schimba intended purpose sau afecteaza conformitatea?

Daca da, re-trigger:

- role assessment;
- risk assessment;
- evidence update;
- client approval.

Gap critic: ai nevoie de `change impact assessment` pentru fiecare deploy.

## 6. Obiectele de date care lipsesc sau trebuie separate mai clar

Acum produsul are multe module, dar ca flow real are nevoie de obiecte foarte clare.

### 1. Client

Pentru Cabinet.

Campuri minime:

- nume;
- CUI;
- industrie;
- angajati;
- contact;
- workspace owner;
- service package;
- deadline;
- status readiness;
- confidence level;
- last review.

### 2. AI Use Case

Asta lipseste conceptual cel mai mult.

Exemple:

- `Marketing genereaza reclame cu AI.`
- `HR filtreaza CV-uri.`
- `Support chatbot raspunde clientilor.`
- `Developer foloseste Copilot.`
- `Managerul sumarizeaza contracte.`

Campuri:

- departament;
- scop;
- persoane afectate;
- date folosite;
- output public/privat;
- decizie despre oameni;
- human review;
- owner.

### 3. AI System

Tool sau sistem concret:

- ChatGPT Team;
- Microsoft Copilot;
- chatbot custom;
- HR ATS;
- fraud detection;
- AI agent intern;
- recommendation engine.

Campuri:

- vendor;
- model;
- hosted/local;
- owner;
- lifecycle;
- status;
- deployment;
- logs;
- model version.

### 4. Vendor / Model

Campuri:

- vendor;
- DPA;
- subprocessors;
- region;
- retention;
- training opt-out;
- security docs;
- model card;
- terms;
- contract owner.

### 5. Evidence Item

Campuri:

- tip dovada;
- sursa;
- owner;
- data;
- expira la;
- legat de obligatie;
- verificat de;
- certainty status.

### 6. Obligation

Campuri:

- articol;
- rol;
- conditii;
- trigger;
- required evidence;
- module;
- owner;
- status.

### 7. Finding

Campuri:

- ce lipseste;
- de ce conteaza;
- ce dovada este acceptabila;
- cine trebuie sa rezolve;
- termen;
- severitate;
- status.

### 8. Export Pack

Campuri:

- scop;
- audienta;
- client;
- included evidence;
- excluded evidence;
- hash;
- version;
- public verify link.

## 7. Cel mai important UI concept: Data Certainty

Asta este diferentiator mare. Compliance nu inseamna doar `am completat un camp`. Inseamna `stim cat de sigura este informatia`.

Fiecare camp important trebuie sa aiba status:

- Unknown: nu stim.
- Self-reported: clientul a spus.
- Imported: vine din CSV/API.
- Evidence attached: exista dovada.
- Reviewed: consultantul a verificat.
- Approved: clientul/managementul a aprobat.
- Expired: dovada nu mai este actuala.

Asta trebuie afisat peste tot:

- in AI Inventory;
- in Risk Classification;
- in Vendor Review;
- in DPIA/RoPA;
- in Audit Pack;
- in Client Portal.

Fara asta, exportul poate parea mai sigur decat este. In compliance, overconfidence este un risc major.

## 8. Gapuri mari pe produs

### Gap 1: Prea multe module vizibile prea devreme

Exista foarte multe module: FRIA, Oversight, Logging, PMM, Incidents, QMS, Conformity, EU DB, DPIA, RoPA, DSAR, Breach, AI Ads, Preventive etc.

Pentru utilizator nou, asta sperie.

Solutie:

- Cabinet vede Portofoliu -> Client -> Work Queue -> Export.
- IMM vede Start -> Tooluri AI -> Politica -> Training -> Dosar.
- AI Builder vede Project -> Role/Risk -> Engineering Evidence -> Handover Pack.

Modulele avansate apar doar cand sunt declansate.

### Gap 2: Nu exista `misiune` ca entry point

Utilizatorul real nu incepe cu `vreau QMS`. Incepe cu:

- am un client nou;
- am primit chestionar;
- lansez un chatbot;
- folosesc AI in HR;
- trebuie sa export un raport.

Entry points necesare:

- `Am un client nou`;
- `Trebuie sa raspund la un chestionar`;
- `Vreau sa inventariez AI-ul`;
- `Lansez un proiect AI`;
- `Am primit intrebare de la client enterprise`;
- `Trebuie policy + training`.

### Gap 3: No-file path trebuie sa fie primar, nu alternativ

`Nu am fisier path` trebuie sa existe pentru fiecare tab.

Mai dur: default-ul trebuie sa fie `nu am fisier`.

In Romania/CEE, foarte multi vor intra fara fisier. Importul este bonus. Flow-ul principal trebuie sa creeze date prin intake.

### Gap 4: Lipsa flow pentru shadow AI

Majoritatea AI-ului in IMM nu este aprobat oficial. Angajatii folosesc AI pe conturi personale.

Ai nevoie de:

- employee survey magic link;
- department poll;
- anonymous reporting option;
- `unknown AI usage` risk flag;
- approved tools list;
- blocked tools list.

AI inventory este fundamentul: fara inventar nu poti guverna ce nu vezi.

### Gap 5: Missing client-facing task portal

Magic link exista. Dar trebuie task portal real:

- Ana din HR are 3 taskuri.
- Vlad din IT are 5 taskuri.
- CEO are 2 aprobari.

Nu doar `completeaza intake`.

### Gap 6: Gap scoring trebuie sa fie granular

Trebuie implementat peste tot:

- complete;
- partial;
- missing;
- blocked by client;
- blocked by vendor;
- needs legal review;
- not applicable;
- future review.

### Gap 7: Art. 15 nu poate ramane doar partial pentru AI Builder

In contextul actual, Art. 15 metric collection ramane provider-specific si CompliRoAI doar track-uieste planul + reviewul + evidence.

Pentru IMM este ok. Pentru Cabinet este acceptabil. Pentru AI Builder, nu este suficient.

AI Builder are nevoie de Metric Evidence Registry:

- accuracy metric;
- robustness test;
- cybersecurity test;
- bias/fairness check unde relevant;
- eval dataset;
- test date;
- result;
- owner;
- model version;
- threshold;
- remediation.

Nu trebuie sa calculezi tu toate metricile, dar trebuie sa le colectezi structurat.

### Gap 8: Lipsa `role-change monitor`

Un IMM poate incepe ca deployer si poate deveni provider daca modifica sau rebranduieste sistemul. Un AI Builder poate fi provider intr-un proiect, subcontractor in altul, deployer in altul.

Adauga permanent:

- Has intended purpose changed?
- Has the system been rebranded?
- Has the model or workflow changed?
- Is the client using it for a new sensitive use case?

### Gap 9: Exporturi prea generale

Exista Readiness Pack, Audit Pack, verify pack.

Ai nevoie de exporturi pe situatii reale:

- Client Enterprise Questionnaire Pack;
- Board Summary;
- DPO Working Report;
- AI Builder Handover Pack;
- Authority Evidence Pack;
- Trust Center Public Pack;
- Internal Action Plan.

### Gap 10: Comercial: landing-ul trebuie sa vanda outcome, nu module

Pentru fiecare ICP, landing-ul trebuie sa spuna:

- Cabinet: `Transforma AI Act in serviciu facturabil pentru clienti.`
- IMM: `Afla ce AI folosesti si scoate dosar de readiness.`
- AI Builder: `Livreaza AI cu compliance pack inclus.`

## 9. Importuri corecte pentru fiecare ICP

### Cabinet: importuri reale

Primul import:

```csv
client_name,cui,industry,employees,contact_name,contact_email,dpo_status,known_ai,deadline,service_package
```

Al doilea import, daca exista:

```csv
client_name,system_name,department,purpose,vendor,personal_data,automated_decision,human_review,owner_email
```

Dar flow-ul trebuie sa suporte si:

> Nu am fisier. Creeaza intake pentru client.

### IMM: importuri reale

IMM-ul nu importa frumos. Ii dai 3 variante:

- Adauga manual tooluri.
- Incarca lista de abonamente.
- Trimite survey angajatilor.

Template:

```csv
tool_name,department,purpose,vendor,personal_data,client_data,public_output,human_review,owner
```

### AI Builder: importuri reale

Pentru builder, cel mai important nu este CSV. Este:

- `ai-compliance.yaml`;
- GitHub repo;
- Vercel deployment;
- model provider settings;
- eval reports;
- API logs.

Template YAML:

```yaml
project:
  name:
  client:
  intended_purpose:
  lifecycle_stage:
system:
  model_provider:
  model_name:
  data_inputs:
  outputs:
  human_review:
  logs_retention:
risk:
  sensitive_domain:
  personal_data:
  automated_decision:
evidence:
  eval_report:
  architecture_doc:
  incident_plan:
```

## 10. Ce module trebuie ascunse/gated

### Pentru IMM Classic

Ascunde by default:

- Annex IV;
- CE Marking;
- EU Database;
- QMS;
- PMM;
- AI Incidents;
- FRIA avansat;
- Authority Cooperation Log.

Afiseaza doar cand apare trigger:

- HR scoring;
- credit/insurance;
- health;
- education;
- biometric;
- automated decision;
- high-risk candidate.

### Pentru Cabinet

Nu ascunde modulele, dar nu le pune ca prima navigatie. Primul layer trebuie sa fie:

- Portofoliu;
- Client Work Queue;
- Awaiting Client;
- Needs Review;
- Export Ready;
- Deadlines.

Consultantul poate intra in module dupa ce are context.

### Pentru AI Builder

Afiseaza:

- Project;
- Role & Risk;
- Model Chain;
- Engineering Evidence;
- Handover Pack;
- API/SDK.

Ascunde DSAR/Breach/RoPA daca proiectul nu proceseaza date personale.

## 11. User stories reale

### Cabinet / DPO

#### Story 1: Client nou fara inventar AI

Ca DPO extern, vreau sa import un client nou chiar daca nu am date AI, astfel incat sa pot trimite rapid un intake si sa incep misiunea fara sa astept Exceluri perfecte.

Acceptance criteria:

- import client cu date minime;
- client status = AI unknown;
- aplicatia genereaza intake magic link;
- apar taskuri initiale;
- consultant vede deadline;
- client completeaza;
- sistemele AI se creeaza automat din raspunsuri;
- consultant revizuieste;
- exporta Quick Scan.

#### Story 2: Client cu chatbot pe site

Ca consultant, vreau sa verific rapid un chatbot de suport, astfel incat sa stiu daca am obligatii de transparenta, GDPR si vendor review.

Flow:

- Creez use case `customer support chatbot`.
- Aleg vendor.
- Marchez ca interactioneaza cu persoane.
- Sistemul declanseaza Art. 50.
- Generez notice.
- Cer screenshot.
- Atasez DPA.
- Export `Chatbot compliance note`.

#### Story 3: Client HR cu tool de recrutare

Ca DPO, vreau sa triez un tool HR AI, astfel incat sa stiu daca este high-risk candidate si ce dovezi lipsesc.

Flow:

- Adaug use case HR.
- Marchez CV screening/scoring.
- Sistemul marcheaza high-risk candidate.
- Cere human oversight.
- Cere DPIA/FRIA review.
- Cere vendor documentation.
- Creeaza finding critic.
- Consultant aproba sau marcheaza `needs legal review`.
- Exporta risk memo.

### IMM Classic

#### Story 4: Firma foloseste ChatGPT haotic

Ca operations manager, vreau sa aflu ce tooluri AI folosesc angajatii, astfel incat sa pot crea o politica interna si o lista de tooluri aprobate.

Flow:

- Aleg `Nu stiu ce AI folosim`.
- Aplicatia creeaza employee survey.
- Trimit link intern.
- Angajatii declara tooluri.
- Aplicatia grupeaza toolurile.
- Creeaza approved/restricted list.
- Genereaza AI policy.
- Trimite training.
- Exporta readiness pack.

#### Story 5: Client enterprise cere dovada

Ca IMM, vreau sa generez un pachet de raspuns pentru client enterprise, astfel incat sa pot demonstra ca am inventar AI, policy, training si vendor review.

Flow:

- Selectez `Raspuns pentru client`.
- Aleg clientul care cere.
- Aplicatia verifica lipsurile.
- Completez minimul.
- Atasez policy/training/vendor proof.
- Export PDF + ZIP.
- Generez public verify link.

#### Story 6: Marketing publica reclame cu AI

Ca marketing manager, vreau sa documentez campaniile AI, astfel incat sa nu public claims sau continut AI fara review.

Flow:

- Creez campaign.
- Atasez creative.
- Marchez daca este AI-generated.
- Adaug claim.
- Sistemul cere approval.
- Export evidence pentru campanie.

### AI Builder

#### Story 7: Proiect AI pentru client enterprise

Ca fondator AI agency, vreau sa creez compliance pack pentru un chatbot custom, astfel incat clientul enterprise sa aprobe procurement-ul.

Flow:

- Creez AI Project.
- Definim intended purpose.
- Aleg model vendor.
- Import `ai-compliance.yaml`.
- Sistemul clasifica roluri.
- Sistemul verifica high-risk triggers.
- Completez model/vendor chain.
- Atasez architecture doc.
- Atasez eval report.
- Generez handover pack.
- Client aproba prin portal.

#### Story 8: Sistem AI in HR

Ca builder, vreau sa stiu daca proiectul meu HR intra high-risk, astfel incat sa nu livrez ceva fara Annex IV / oversight / logging.

Flow:

- Creez proiect HR.
- Marchez screening/ranking.
- Sistemul marcheaza high-risk candidate.
- Deschide Annex IV checklist.
- Cere human oversight design.
- Cere logging evidence.
- Cere PMM plan.
- Cere incident process.
- Exporta high-risk readiness pack.

#### Story 9: Schimbare de model dupa go-live

Ca CTO, vreau ca schimbarea modelului din GPT-4.1 in alt model sa declanseze review, astfel incat compliance pack-ul sa nu ramana fals.

Flow:

- CI/CD detecteaza schimbare in config.
- CompliRoAI creeaza finding.
- Cere re-review metric evidence.
- Cere update model/vendor card.
- Daca intended purpose se schimba, re-ruleaza role/risk.
- Client aproba modificarea.
- Export pack version 2.

## 12. Cele mai importante flow-uri E2E de testat

### Cabinet pilot E2E

- Creeaza Cabinet.
- Importa 3 clienti.
- Pentru Client A nu ai date AI.
- Genereaza intake link.
- Client completeaza chatbot + ChatGPT + HR tool.
- Aplicatia creeaza 3 use cases.
- Clasifica riscuri.
- Creeaza findings.
- Consultant ataseaza dovezi.
- Client aproba.
- Exporta Management Summary + Audit Pack.
- Revine in portofoliu.
- Dashboard arata progres cross-client.

### IMM pilot E2E

- IMM intra in trial.
- Alege `nu stiu ce AI folosim`.
- Completeaza 5 tooluri.
- Aplicatia genereaza approved/restricted list.
- Creeaza AI policy.
- Creeaza literacy task.
- Genereaza vendor review pentru ChatGPT/Copilot.
- Creeaza chatbot transparency notice.
- Exporta client-ready pack.
- Primeste monthly digest.

### AI Builder E2E

- Builder creeaza proiect.
- Importa `ai-compliance.yaml`.
- Adauga model vendor.
- Defineste intended purpose.
- Sistemul clasifica role/risk.
- Ataseaza eval report.
- Ataseaza logging proof.
- Completeaza human oversight.
- Exporta handover pack.
- Simuleaza model change.
- Sistemul creeaza re-review finding.

## 13. Prioritatea ICP-urilor

### 1. Cabinet / DPO extern: primul

Aici este cel mai rapid path la bani.

De ce?

- un consultant aduce 10-50 clienti;
- are deja relatie de incredere;
- poate vinde one-off audit;
- are nevoie de white-label;
- poate valida flow-urile cu clienti reali;
- suporta pret mai mare.

Pachet one-off vandabil:

`AI Act + GDPR Quick Scan pentru un client`

Pret tinta: 799-1.500 EUR one-off.

Livrabile:

- AI use intake;
- AI inventory;
- risk triage;
- vendor review basic;
- policy draft;
- literacy checklist;
- gap report;
- audit-ready pack.

### 2. AI Builder: al doilea

Aici este valoare mare, dar produsul trebuie sa fie mai tehnic.

Pachet one-off:

`Procurement-ready AI Project Pack`

Pret tinta: 499-2.000 EUR/proiect.

Livrabile:

- system card;
- intended purpose;
- role matrix;
- model/vendor chain;
- evidence checklist;
- handover pack;
- client responsibilities.

### 3. IMM self-serve: al treilea

IMM-urile sunt multe, dar greu de convertit. Trebuie sa intre prin DPO, consultant, vendor sau chestionar enterprise.

Pachet one-off:

`AI Safe Use Pack`

Pret tinta: 299-799 EUR.

Livrabile:

- tool inventory;
- AI policy;
- training evidence;
- vendor summary;
- chatbot notice;
- management report.

## 14. Roadmap 30 / 60 / 90 zile

### 30 zile: Flow layer peste module

De facut:

- adauga AI Use Case ca obiect separat;
- adauga Data Certainty;
- creeaza flow-uri: Cabinet Quick Scan, IMM AI Safe Use, AI Builder Handover;
- ascunde modulele avansate pana la trigger;
- client-facing task portal;
- no-file path ca default;
- exporturi diferite: management / working / audit.

### 60 zile: Pilot-ready pentru 5 cabinete

De facut:

- import templates stabile;
- magic link cu taskuri pe roluri;
- cross-client dashboard;
- white-label pack;
- consultant review states;
- package-based onboarding;
- one-off audit billing;
- AI literacy flow complet;
- vendor library precompletata.

### 90 zile: AI Builder si integrari

De facut:

- `ai-compliance.yaml`;
- GitHub/GitLab import basic;
- Vercel/deployment evidence;
- model/vendor chain;
- metric evidence registry pentru Art. 15;
- change impact assessment;
- project handover pack;
- API/SDK gate in CI/CD.

## 15. Ce as schimba imediat in aplicatie

### Sidebar actual

Probabil arata prea mult ca:

- Sisteme;
- Conformitate;
- Vendor;
- DPIA;
- RoPA;
- FRIA;
- QMS;
- Incidents;
- PMM;
- Logging;
- Audit Pack.

### Sidebar flow-first

Pentru Cabinet:

- Portofoliu;
- Import Center;
- Client Work Queue;
- Awaiting Client;
- Needs Review;
- Export Ready;
- Calendar;
- Trust Center.

Pentru IMM:

- Start aici;
- Tooluri AI;
- Politica & training;
- Vendor review;
- Website/chatbot;
- De rezolvat;
- Dosar readiness.

Pentru AI Builder:

- Projects;
- Role & Risk;
- Model Chain;
- Engineering Evidence;
- Handover Pack;
- API/SDK;
- Changes & Incidents.

Modulele legale raman in spate, declansate contextual.

## 16. Concluzie flow-first

CompliRoAI nu pare slab. Din contra, pare deja foarte dens. Problema este ca densitatea poate deveni dusmanul vanzarii.

Produsul trebuie sa fie:

> Workflow OS, nu legal module library.

Formula de produs corecta:

`Client / proiect / tool AI -> intake -> inventar -> role/risk -> obligatii -> findings -> dovezi -> review uman -> export -> monitorizare`

Daca implementezi asta, ai produs real. Daca ramane doar sidebar cu 20 de module, vei avea o aplicatie corecta legal, dar greu de cumparat si greu de folosit.

Prioritatea clara:

1. Cabinet/DPO flow complet: cel mai bun pilot platit.
2. IMM simplified pack: livrabil pe care consultantul il vinde.
3. AI Builder handover pack + YAML evidence: diferentiator puternic fata de legal AI generic.

Cel mai important: nu mai gandi aplicatia ca lista de functionalitati. Gandeste-o ca fabrica de dosare.

---

# Addendum operational: Import Center ca motor de dosare

Perfect. Atunci nu mai tratez textele din ecran ca flow final. Daca acestea sunt demo-uri de orchestrare, nu conteaza copy-ul. Conteaza importul real. Acolo este nervul produsului.

Verdictul este simplu:

> Import Center nu trebuie sa fie un CSV uploader. Trebuie sa fie motorul care transforma date incomplete in workspace-uri, taskuri, findings, dovezi cerute si exporturi.

Daca faci importul prost, tot produsul devine o biblioteca de module. Daca il faci bine, CompliRoAI devine fabrica de dosare.

Contextul produsului spune deja ca exista Import Center pentru cabinete, import CSV/TSV, workspace client, magic links, client intake, approval queue, evidence vault si Audit Pack per client. Versiunea finala trebuie sa aiba Import Center complet pentru clienti, sisteme AI per client, vendors/models, RoPA, AI Literacy, plus path `nu am fisier` pentru fiecare tab.

## Regula de aur pentru importul real

Importul real trebuie sa produca 5 lucruri:

1. **Records:** clienti, sisteme AI, use cases, furnizori, RoPA, training.
2. **Certainty status:** ce este importat, ce este declarat, ce este necunoscut, ce are dovada.
3. **Draft classification:** niciodata verdict final legal.
4. **Findings / actions:** ce trebuie completat, verificat, aprobat.
5. **Next workflow:** intake, review, evidence, export.

Nu importa doar date. Importa munca.

## Structura corecta a Import Center

Taburile bune raman:

- Clienti;
- Sisteme AI;
- Furnizori / modele;
- RoPA / date;
- AI Literacy.

Fiecare tab trebuie sa aiba acelasi flow robust:

1. Alegi sursa:
   - paste CSV;
   - upload CSV/XLSX;
   - template download;
   - `nu am fisier` -> genereaza intake/checklist.
2. Mapping coloane:
   - auto-map RO/EN;
   - user poate corecta mapping.
3. Preview:
   - valid rows;
   - warnings;
   - errors;
   - duplicates;
   - records that will be created;
   - records that will be updated;
   - actions that will be generated.
4. Commit:
   - creeaza records;
   - creeaza findings;
   - creeaza audit events;
   - seteaza certainty status;
   - actualizeaza dashboard state.
5. Post-import:
   - intra in executie;
   - trimite intake;
   - vezi De rezolvat;
   - exporta draft report.

Daca lipseste preview-ul cu warnings/errors, importul va fi periculos. Daca lipseste `nu am fisier`, pierzi fix piata reala. Multi consultanti vor avea doar lista de clienti, nu inventar AI.

## Obiectele de date obligatorii

### 1. Client

Clientul este organizatia pentru care lucreaza cabinetul.

Campuri minime:

```text
client_id
cabinet_org_id
company_name
cui
registration_number
industry
employees_count
contact_name
contact_email
service_scope
uses_ai_status
personal_data_ai_status
send_intake
deadline
notes
client_status
data_certainty
created_from_import_id
```

`uses_ai_status` nu trebuie sa fie doar true/false. Trebuie sa fie:

- `unknown`;
- `no_declared_ai`;
- `declared_ai`;
- `suspected_ai`;
- `inventory_started`.

In viata reala clientul nu stie ce foloseste. `Unknown` este stare reala, nu lipsa de date.

### 2. AI Use Case

Asta este obiectul care lipseste cel mai dur daca nu a fost separat deja.

Un tool nu este acelasi lucru cu un use case.

Exemplu: ChatGPT poate fi folosit pentru marketing copy, HR screening, analiza contracte, suport clienti. Fiecare scop are risc diferit.

Campuri:

```text
use_case_id
client_id
department
purpose
business_process
affected_persons
data_types
uses_personal_data
uses_client_confidential_data
impacts_people
automated_decision
public_output
human_review
owner_email
linked_ai_system_id
risk_draft
role_draft
certainty_status
review_status
```

Fara AIUseCase, clasificarea o sa fie grosiera. Grosier in compliance inseamna: pare bun pana vine cineva serios si il rupe.

### 3. AI System

Sistemul concret: ChatGPT Team, Copilot, chatbot custom, ATS, agent intern.

Campuri:

```text
system_id
client_id
system_name
vendor_id
model_id
deployment_type
lifecycle_stage
intended_purpose
user_groups
input_data
output_type
human_review
logging_available
owner_email
risk_classification_status
role_classification_status
certainty_status
review_status
```

### 4. Vendor / Model

Pentru OpenAI, Microsoft, Google, Anthropic, Mistral, SaaS local etc.

Campuri:

```text
vendor_id
client_id
vendor_name
product_name
model_name
contract_type
dpa_status
data_region
training_opt_out
subprocessors_url
security_doc_url
terms_url
owner_email
vendor_risk_status
certainty_status
```

### 5. RoPA / Data Process

Trebuie legat de GDPR, dar fara sa ingroape utilizatorul in jargon.

Campuri:

```text
process_id
client_id
process_name
linked_use_case_id
data_categories
data_subjects
legal_basis
retention_period
processor_vendor
transfer_outside_eea
dpi_needs_review
ropa_certainty
```

### 6. AI Literacy Record

Nu doar `traininguri = 0`. Dovada trebuie sa fie per rol / departament.

Campuri:

```text
literacy_id
client_id
person_email
person_name
department
role
ai_user_level
training_assigned
training_completed
completion_date
evidence_url
evidence_status
```

### 7. Finding / Action

Asta este outputul cel mai important al importului.

Campuri:

```text
finding_id
client_id
linked_entity_type
linked_entity_id
title
reason
severity
owner_role
owner_email
required_evidence
status
due_date
created_by_engine
source_import_id
```

Importul trebuie sa genereze findings automat. Nu userul sa stea sa le scrie.

## Template-uri CSV reale

### Tab 1: Clienti

Acesta este importul pentru cabinet. Trebuie sa mearga chiar daca are doar `company_name` si `contact_email`.

```csv
company_name,cui,contact_name,contact_email,industry,employees_count,service_scope,uses_ai,personal_data_ai,send_intake,deadline,notes
Apex Logistic SRL,RO12345678,Maria Popescu,maria@example.com,logistica,85,ai_act;gdpr,unknown,unknown,yes,2026-06-15,client nou
```

Valori acceptate:

`uses_ai`:

- `yes`;
- `no`;
- `unknown`;
- `suspected`.

`personal_data_ai`:

- `yes`;
- `no`;
- `unknown`.

`send_intake`:

- `yes`;
- `no`.

Ce trebuie sa genereze importul de clienti:

- daca `uses_ai = unknown`: finding `Trimite intake AI catre client`;
- daca `uses_ai = unknown`: finding `Creeaza inventar AI initial`;
- daca `uses_ai = unknown`: finding `Confirma daca exista date personale in utilizarile AI`;
- daca `personal_data_ai = yes`: finding `Verifica DPIA/RoPA pentru utilizarile AI`;
- daca `service_scope` contine `ai_literacy`: finding `Porneste program AI Literacy`;
- daca `send_intake = yes`: magic link draft generated;
- daca `send_intake = yes`: client status = `awaiting_intake`.

### Tab 2: Sisteme AI / Use Cases

Aici trebuie sa importi atat use cases, cat si sisteme concrete.

```csv
client_cui,department,use_case,purpose,system_name,vendor_name,model_name,personal_data,confidential_data,automated_decision,human_review,public_output,affected_persons,owner_email,status
RO12345678,Marketing,Generare reclame,Creare texte pentru campanii,ChatGPT Team,OpenAI,gpt-4.1,no,yes,no,yes,yes,clienti,marketing@example.com,active
RO12345678,HR,Screening CV,Filtrare candidati,ATS AI Vendor,VendorX,,yes,yes,yes,partial,no,candidati,hr@example.com,planned
```

Reguli importante:

- daca `system_name` exista, creezi AI System;
- daca `use_case` exista, creezi AI Use Case;
- daca exista ambele, le legi;
- daca `vendor_name` nu exista in vendor registry, creezi vendor draft;
- daca `automated_decision = yes` si departamentul este HR / credit / asigurari / educatie / sanatate, marchezi `high_risk_candidate = true` si `review_required = true`;
- nu zici `high-risk final`; zici `Draft: high-risk candidate` si `Needs consultant review`.

Asta protejeaza legal produsul si il face serios.

### Tab 3: Furnizori / modele

```csv
client_cui,vendor_name,product_name,model_name,contract_type,dpa_status,data_region,training_opt_out,subprocessors_url,security_doc_url,owner_email
RO12345678,OpenAI,ChatGPT Team,gpt-4.1,subscription,available,EU/US,yes,https://example.com/subprocessors,https://example.com/security,it@example.com
RO12345678,Microsoft,Copilot,,enterprise,unknown,EU,unknown,,,it@example.com
```

Findings generate:

- daca `dpa_status = unknown`: finding `Ataseaza DPA / termenii furnizorului AI`;
- daca `data_region = unknown`: finding `Confirma regiunea de procesare pentru vendor`;
- daca `training_opt_out = unknown`: finding `Confirma daca datele clientului pot fi folosite la training`;
- daca exista `model_name` si sistemele il folosesc: link vendor/model to AI systems.

### Tab 4: RoPA / date

```csv
client_cui,process_name,linked_use_case,personal_data_categories,data_subjects,legal_basis,retention,processor_vendor,transfer_outside_eea,dpi_needs_review
RO12345678,Suport clienti chatbot,Customer support chatbot,nume;email;mesaje,clienti,contract,12 luni,OpenAI,yes,yes
RO12345678,Recrutare asistata AI,Screening CV,cv;email;experienta;candidati,candidati,interes_legitim,24 luni,VendorX,unknown,yes
```

Findings generate:

- daca `transfer_outside_eea = yes`: finding `Verifica transfer international si documente vendor`;
- daca `dpi_needs_review = yes`: finding `Verifica necesitatea DPIA pentru procesul AI`;
- daca `linked_use_case` nu exista: warning `use case lipsa; creez process nelegat`.

### Tab 5: AI Literacy

```csv
client_cui,person_name,person_email,department,role,ai_user_level,training_assigned,training_completed,completion_date,evidence_url
RO12345678,Ana Ionescu,ana@example.com,Marketing,Marketing Manager,regular,yes,no,,
RO12345678,Vlad Popescu,vlad@example.com,IT,IT Admin,power_user,yes,yes,2026-05-20,https://example.com/evidence.pdf
```

Findings generate:

- daca `training_assigned = no`: finding `Atribuie training AI Literacy`;
- daca `training_completed = no`: finding `Colecteaza dovada de finalizare AI Literacy`;
- daca `ai_user_level = power_user`: priority = higher training depth.

## Severity pentru import

Trebuie separate clar `error`, `warning`, `info`.

### Error: nu permite commit pentru rand

Exemple:

- `client_cui` lipseste la import sisteme AI;
- `client_cui` nu exista si userul nu a ales `create_missing_client`;
- email invalid;
- coloana obligatorie lipsa.

### Warning: permite commit, dar creeaza finding

Exemple:

- vendor necunoscut;
- DPA necunoscut;
- date personale = unknown;
- human review = unknown;
- use case fara owner.

### Info: doar noteaza

Exemple:

- training completat;
- vendor recunoscut;
- client deja existent, va fi actualizat.

## Dedupe rules

Fara dedupe bun, portofoliul se umple de duplicari inutile.

### Client dedupe

Cheie principala:

```text
normalized_cui
```

Fallback:

```text
normalized_company_name + contact_email_domain
```

Optiuni la preview:

- Create new;
- Update existing;
- Skip duplicate;
- Merge fields.

### AI System dedupe

Cheie:

```text
client_id + normalized_system_name + vendor_name
```

Daca exista acelasi sistem in alt departament, nu duplica sistemul. Creeaza alt AIUseCase legat la acelasi sistem.

### Vendor dedupe

Cheie:

```text
client_id + normalized_vendor_name + product_name
```

Pentru vendor library globala:

```text
global_vendor_slug
```

Exemple: `openai`, `microsoft`, `google`, `anthropic`, `mistral`.

### AI Literacy dedupe

Cheie:

```text
client_id + person_email + training_assigned
```

## Data certainty: obligatoriu

Fiecare record importat trebuie sa aiba un status de certitudine:

- `unknown`;
- `self_reported`;
- `imported`;
- `evidence_attached`;
- `consultant_reviewed`;
- `client_approved`;
- `expired`.

La import CSV, default:

```text
certainty_status = imported
review_status = needs_review
```

Daca vine din magic link completat de client:

```text
certainty_status = self_reported
review_status = needs_consultant_review
```

Daca are document atasat:

```text
certainty_status = evidence_attached
```

Daca consultantul confirma:

```text
certainty_status = consultant_reviewed
```

Asta trebuie sa apara vizual in UI. Nu mare, nu urat, dar clar.

Exemplu:

```text
ChatGPT Team
Certitudine: importat
Review: necesita consultant
Dovezi: lipsesc DPA si training opt-out
```

## Ce trebuie sa faca fiecare import dupa commit

### Import clienti

Dupa commit:

- create client workspace;
- create clientMeta;
- create initial findings;
- create intake draft if `send_intake = yes`;
- create audit event;
- show client in Portofoliu;
- status = `awaiting_intake` / `inventory_missing`.

Ideea cu creare workspace client, clientMeta si actiuni initiale generate din import trebuie facuta stricta si predictibila.

### Import sisteme AI

Dupa commit:

- create AIUseCase;
- create AISystem;
- create Vendor draft if needed;
- run draft role classifier;
- run draft risk classifier;
- create findings;
- update dashboard counters;
- create audit event.

Findings posibile:

- `role_classification_missing`;
- `risk_classification_missing`;
- `vendor_review_missing`;
- `human_review_missing`;
- `personal_data_review_missing`;
- `art50_notice_needed`;
- `high_risk_review_needed`.

### Import vendors

Dupa commit:

- create / update vendor records;
- link vendor to systems;
- create missing evidence findings;
- create audit event.

### Import RoPA

Dupa commit:

- create data processes;
- link to use cases;
- create GDPR overlap findings;
- create DPIA review tasks;
- create audit event.

### Import AI Literacy

Dupa commit:

- create people/training records;
- create missing training tasks;
- create evidence tasks;
- update AI Literacy status;
- create audit event.

## UI real pentru Import Center

### Header

In screenshot exista `Clienti & import`. Este bine. Mai precis:

```text
Import Center
Incarca date incomplete, mapeaza-le pe clienti si genereaza automat actiuni initiale.
```

Subcopy:

```text
Importul nu stabileste verdict legal final. Datele importate intra in review.
```

Asta este foarte important.

### Pe fiecare tab

Cardul fiecarui tab trebuie sa aiba:

1. Template;
2. Upload CSV/XLSX;
3. Paste rows;
4. `Nu am fisier` -> genereaza intake/checklist.

Nu ascunde `Nu am fisier`. Pune-l vizibil. In realitate, acolo va apasa jumatate din piata.

### Preview table

Coloane preview:

- Row;
- Status;
- Entity;
- Action;
- Warnings;
- Created/Updated;
- Generated findings.

Exemplu:

```text
1 | valid   | Apex Logistic SRL | create client + use case | uses_ai unknown | 3 findings
2 | warning | ChatGPT Team      | create system + use case | DPA missing     | 4 findings
3 | error   | VendorX           | cannot import            | client_cui not found | 0 findings
```

### Commit summary

Dupa import:

```text
3 clienti creati
5 sisteme AI create
7 use cases create
4 vendors creati
18 findings generate
2 intake links pregatite
0 verdicturi finale aplicate
```

Ultima linie este importanta: `0 verdicturi finale aplicate`. Transmite siguranta.

## Ce NU trebuie sa faca importul

Nu face:

- nu clasifica definitiv high-risk doar din CSV;
- nu genera FRIA finala fara review;
- nu marca DPIA ca finalizata doar pentru ca a venit o coloana;
- nu presupune ca vendorul este compliant;
- nu amesteca clientii intre workspace-uri;
- nu crea duplicate de sisteme pentru fiecare departament;
- nu bloca userul daca lipsesc date necritice;
- nu cere dosar complet inainte de onboarding.

Guardrail-ul corect: nu cere utilizatorului dosar complet inainte de import si porneste din date incomplete.

## Logica corecta pentru taburi

### Tab Clienti

Scop:

- creeaza portofoliul cabinetului.

Output:

- client workspace;
- client status;
- initial action queue;
- intake draft;
- portfolio visibility.

Nu trebuie sa creeze direct compliance complex.

### Tab Sisteme AI

Scop:

- creeaza inventarul tehnic si operational.

Output:

- AIUseCase;
- AISystem;
- draft role/risk;
- vendor link;
- findings.

Aici incepe adevaratul produs.

### Tab Furnizori / modele

Scop:

- leaga sistemele AI de vendori, modele, DPA, regiuni, security docs.

Output:

- vendor records;
- model records;
- missing DPA findings;
- training opt-out findings;
- data region findings.

### Tab RoPA / date

Scop:

- conecteaza AI Act cu GDPR fara sa transformi aplicatia in GDPR Register clona.

Output:

- data process;
- personal data flag;
- DPIA review;
- transfer review;
- retention finding.

### Tab AI Literacy

Scop:

- creeaza dovada minima de instruire si responsabilitate.

Output:

- people/training records;
- training missing tasks;
- evidence missing tasks;
- literacy pack.

## Pentru Cabinet: importul ideal in viata reala

Consultantul real va veni cu una dintre aceste 3 situatii.

### Situatia 1: are doar lista de clienti

Importa:

```text
company_name
cui
contact_email
service_scope
```

CompliRoAI trebuie sa creeze:

- workspace client;
- status: AI unknown;
- finding: trimite intake;
- finding: creeaza inventar AI;
- finding: porneste AI Literacy daca scope-ul include.

Asta este pachetul de pornire.

### Situatia 2: are lista de clienti + cateva tooluri AI

Importa clienti, apoi importa sisteme AI:

```text
client_cui
department
tool
use_case
```

CompliRoAI trebuie sa creeze:

- AI systems;
- use cases;
- draft risk;
- vendor draft;
- findings.

### Situatia 3: are client mai matur cu RoPA / DPIA

Importa RoPA/date:

```text
process_name
data_categories
vendor
retention
transfer
```

CompliRoAI trebuie sa lege GDPR de AI use cases.

Aici devine produs premium.

## Pentru IMM: acelasi import, dar ascuns

IMM-ul nu trebuie sa vada `Import Center pentru cabinete`. Pentru IMM flow-ul trebuie sa fie:

> Adauga toolurile AI folosite in firma.

Sub capota faci acelasi import.

IMM are 3 cai:

1. Adaug manual tool.
2. Incarc lista tooluri.
3. Trimit survey intern.

Import template IMM:

```csv
tool_name,department,purpose,vendor_name,personal_data,client_data,public_output,human_review,owner_email
ChatGPT Team,Marketing,texte reclame,OpenAI,no,yes,yes,yes,marketing@example.com
Copilot,IT,cod si documentatie,Microsoft,no,yes,no,yes,it@example.com
```

IMM nu trebuie sa vada `client_cui`, pentru ca lucreaza pentru propria firma.

## Pentru AI Builder: importul trebuie sa fie alt animal

Pentru AI Builder CSV-ul este doar backup. Importul real trebuie sa fie:

- `ai-compliance.yaml`;
- GitHub repo;
- model config;
- deployment metadata;
- eval report;
- logging evidence.

Template minim:

```yaml
project:
  name: "Customer Support AI Agent"
  client: "Apex Logistic SRL"
  intended_purpose: "Assist support agents with draft replies. Does not make final decisions."
  lifecycle_stage: "pre-go-live"

system:
  system_name: "Support Agent v1"
  model_provider: "OpenAI"
  model_name: "gpt-4.1"
  deployment: "Vercel"
  human_review_required: true
  logs_retention_days: 180

data:
  personal_data: true
  confidential_data: true
  data_categories:
    - name
    - email
    - support messages

risk:
  affects_people: true
  automated_decision: false
  public_output: false

evidence:
  architecture_doc: "./docs/architecture.md"
  eval_report: "./evals/report.json"
  incident_plan: "./docs/incident-plan.md"
```

Pentru AI Builder exista deja API/SDK, role assessment, conformity, Annex IV, EU DoC, CE, EU DB wizard, logging, PMM, QMS si audit pack. Urmatorul salt este ca importul sa traga aceste dovezi direct din proiect, nu din Excel.

## State machine pentru import

Implementare simpla:

```text
draft
mapped
validated
ready_to_commit
committed
partially_committed
failed
rolled_back
```

Fiecare import are:

```text
import_id
workspace_id
client_id optional
import_type
source_type
created_by
created_at
status
row_count
valid_count
warning_count
error_count
created_records
updated_records
generated_findings
audit_event_id
```

## API design recomandat

Nu complica.

```http
POST /api/import/preview
POST /api/import/commit
GET  /api/import/:id
GET  /api/import/:id/errors
GET  /api/import/templates/:type
```

Payload preview:

```json
{
  "importType": "clients",
  "sourceType": "pasted_csv",
  "rawText": "...",
  "workspaceMode": "cabinet"
}
```

Response preview:

```json
{
  "importId": "imp_123",
  "status": "ready_to_commit",
  "summary": {
    "rows": 10,
    "valid": 8,
    "warnings": 2,
    "errors": 0
  },
  "records": [
    {
      "row": 1,
      "entity": "client",
      "action": "create",
      "displayName": "Apex Logistic SRL",
      "warnings": ["uses_ai_unknown"],
      "generatedFindings": [
        "send_ai_intake",
        "create_ai_inventory"
      ]
    }
  ]
}
```

Commit:

```json
{
  "importId": "imp_123",
  "mode": "commit_valid_rows",
  "duplicateStrategy": "update_existing",
  "generateInitialActions": true
}
```

## Scorul de import readiness

Pe fiecare client importat, arata:

```text
Import completeness: 22%
AI inventory: missing
Vendor evidence: missing
GDPR overlap: unknown
AI Literacy: not started
Export readiness: blocked
```

Nu doar `in asteptare`. `In asteptare` este prea generic.

## Ce trebuie sa vezi in Portofoliu dupa import

Dupa import, fiecare client trebuie sa aiba status clar:

```text
Apex Logistic SRL
AI status: unknown
Intake: not sent
Open actions: 3
Export readiness: 0%
Last import: 26 mai 2026
```

Pentru client cu date AI:

```text
Client Import Test 2525 SRL
AI systems: 2
Use cases: 4
High-risk candidates: 1
Vendor evidence missing: 2
Open actions: 7
Export readiness: 35%
```

Asta este portofoliul care vinde produsul. Consultantul vede imediat unde are munca facturabila.

## Acceptance tests obligatorii

### Test 1: Import client simplu

Input:

```csv
company_name,cui,contact_email,uses_ai,send_intake
Apex Logistic SRL,RO12345678,maria@example.com,unknown,yes
```

Expected:

- client created;
- workspace created;
- status = `awaiting_intake`;
- 3 initial findings created;
- magic link draft created;
- audit event created.

### Test 2: Duplicate client

Import acelasi CUI de doua ori.

Expected:

- preview marks duplicate;
- user can choose update/skip/merge;
- no duplicate workspace created;
- audit event logs update.

### Test 3: Import sistem AI fara client existent

Input:

```csv
client_cui,system_name
RO99999999,ChatGPT Team
```

Expected:

- error: client not found;
- no commit for that row;
- suggestion: create missing client or import clients first.

### Test 4: Import sistem AI cu HR automated decision

Input:

```csv
client_cui,department,use_case,system_name,vendor_name,personal_data,automated_decision,human_review
RO12345678,HR,Screening CV,ATS AI,VendorX,yes,yes,partial
```

Expected:

- AIUseCase created;
- AISystem created;
- Vendor draft created;
- `risk_draft = high_risk_candidate`;
- `review_status = needs_consultant_review`;
- findings: FRIA triage, human oversight, vendor review, DPIA review;
- no final legal verdict.

### Test 5: Import vendor fara DPA

Expected:

- vendor created;
- finding: attach DPA/vendor terms;
- finding: confirm data region.

### Test 6: Import AI Literacy incomplet

Expected:

- training record created;
- finding: collect training completion evidence;
- client literacy status = partial.

### Test 7: No-file path

User apasa `Nu am fisier`.

Expected:

- intake checklist created;
- magic link generated;
- client status = `awaiting_client_input`;
- no fake AI system created.

## Specificatie directa pentru implementare Codex

Build production-grade Import Center for CompliRoAI.

Context:

- CompliRoAI has 3 workspace modes: `cabinet`, `imm-classic`, `ai-builder`.
- Current Import Center has tabs: Clients, AI Systems, Vendors/Models, RoPA/Data, AI Literacy.
- Do not treat import as simple CSV upload.
- Import must create records, certainty states, findings, audit events, and next actions.

Required entities:

- Client;
- AIUseCase;
- AISystem;
- VendorModel;
- DataProcess;
- AILiteracyRecord;
- Finding;
- ImportSession;
- ImportRowPreview.

Core requirement:

Every imported record must have:

- `sourceImportId`;
- `certaintyStatus: unknown | self_reported | imported | evidence_attached | consultant_reviewed | client_approved | expired`;
- `reviewStatus: draft | needs_review | reviewed | approved | rejected`.

Import flow:

1. User selects import type:
   - `clients`;
   - `ai_systems`;
   - `vendors_models`;
   - `ropa_data`;
   - `ai_literacy`.
2. User can:
   - paste CSV;
   - upload CSV/XLSX;
   - download template;
   - choose no-file path.
3. Preview must:
   - parse rows;
   - auto-map RO/EN column names;
   - validate required fields;
   - detect duplicates;
   - show warnings/errors;
   - show records to create/update;
   - show generated findings before commit.
4. Commit must:
   - create/update valid records;
   - skip or fail invalid rows based on severity;
   - generate findings/actions;
   - create audit events;
   - update client status and dashboard counters.

Duplicate rules:

- Client: normalized CUI first, fallback company_name + contact_email_domain.
- AISystem: clientId + normalized systemName + vendorName.
- AIUseCase: clientId + department + purpose + linked system.
- VendorModel: clientId + vendorName + productName + modelName.
- AILiteracyRecord: clientId + personEmail + trainingAssigned.

Generated actions:

Clients:

- if uses_ai unknown -> `send_ai_intake`, `create_ai_inventory`;
- if personal_data_ai yes -> `gdpr_dpia_review`;
- if send_intake yes -> create magic link draft.

AI systems/use cases:

- always -> `role_risk_review`;
- if personal_data yes -> `gdpr_overlap_review`;
- if vendor missing evidence -> `vendor_review`;
- if public_output/chatbot -> `art50_transparency_notice`;
- if HR/credit/insurance/education/health/biometric + automated_decision yes -> `high_risk_candidate_review`;
- never set final legal verdict on import.

Vendors:

- if DPA unknown -> `attach_dpa`;
- if data_region unknown -> `confirm_data_region`;
- if training_opt_out unknown -> `confirm_training_use`.

RoPA/Data:

- if transfer_outside_eea yes/unknown -> `transfer_review`;
- if dpi_needs_review yes -> `dpi_review`.

AI Literacy:

- if training_assigned no -> `assign_training`;
- if training_completed no -> `collect_training_evidence`.

No-file path:

- clients -> create intake checklist and magic link draft;
- systems -> create department survey;
- vendors -> create vendor evidence request checklist;
- ropa -> create GDPR data mapping questionnaire;
- literacy -> create training roster checklist.

UI requirements:

- Each tab has Template, Upload, Paste rows, No file path.
- Preview table shows row status, entity, action, warnings, errors, generated findings.
- Commit summary shows created, updated, skipped, findings generated, intake links prepared.
- Show warning: Imported data is draft and requires review. No final legal verdict is applied by import.

Tests:

- Import simple client.
- Duplicate client update/skip.
- Import AI system linked to existing client.
- Import AI system with missing client gives row error.
- HR automated decision creates high-risk candidate review finding.
- Vendor missing DPA creates vendor evidence finding.
- No-file path creates intake/checklist.
- Audit event created for every commit.

## Ce conteaza in urmatorul sprint

Ordinea corecta:

1. ImportSession + preview + commit.
2. AIUseCase separat de AISystem.
3. Data certainty + review status.
4. Generated findings pe fiecare import.
5. No-file path.
6. Portofoliu actualizat dupa import.
7. Audit event pentru fiecare import.
8. E2E tests.

Nu incepe cu integrari M365/Google. Nu inca. Prima data fa CSV/XLSX/paste impecabil. Integrarile vin dupa ce schema de import este beton.

## Verdict

Da, daca acestea sunt doar demo-uri, atunci nu le mai judec ca produs final. Dar importul real trebuie facut foarte serios.

Import Center este onboarding-ul, discovery-ul si generatorul de munca facturabila. Pentru Cabinet, este locul unde consultantii transforma Exceluri haotice in clienti executabili. Pentru IMM, este locul unde descoperi AI-ul ascuns. Pentru AI Builder, este locul unde transformi proiectul tehnic in compliance handover pack.

Nu construi `upload CSV`. Construieste:

`Data ingestion -> certainty -> draft classification -> findings -> evidence -> export`

Asta este inima CompliRoAI.
