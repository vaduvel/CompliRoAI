# Regulamentul (UE) 2024/1689 — EU AI Act
## Document juridic consolidat articol-cu-articol (versiunea post-Omnibus, mai 2026)

> **Versiune document:** 1.0 — 16 mai 2026
> **Status normativ:** Text de bază publicat în OJ L 1689/2024, 12 iulie 2024 + acord politic Digital Omnibus pe AI Act, 7 mai 2026 (în așteptarea publicării formale în OJEU iulie 2026)
> **Autor:** Analiză juridică pentru SaaS de compliance (CompliAI)
> **Limba:** română (textul legal este parafrazat strâns/citat scurt din EN — versiunea oficială română EUR-Lex prevalează în caz de conflict)
> **Surse primare:**
> - EUR-Lex CELEX:32024R1689 — https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1689
> - artificialintelligenceact.eu — versiune anotată per-articol
> - Consilium press release 7 mai 2026 — https://www.consilium.europa.eu/en/press/press-releases/2026/05/07/artificial-intelligence-council-and-parliament-agree-to-simplify-and-streamline-rules/
> - Parlamentul European A10-0073/2026 (Digital Omnibus on AI) — https://www.europarl.europa.eu/doceo/document/A-10-2026-0073_EN.html
> - EC AI Act Service Desk — https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai

---

## SUMAR EXECUTIV — ce s-a schimbat în Omnibus (7 mai 2026)

| Element | Versiunea originală 2024/1689 | Versiunea Omnibus mai 2026 | Status |
|---|---|---|---|
| Art. 5 — practici interzise | 8 categorii (a–h) aplicabile din 2 feb 2025 | + adăugare explicită: aplicații **nudifier / generare CSAM** | [CONFIRMAT] aplicabil 2 dec 2026 |
| Art. 6 + Anexa III — HRAIS stand-alone | 2 aug 2026 | **2 decembrie 2027** (amânare 16 luni) | [CONFIRMAT] |
| Art. 6 + Anexa I — HRAIS embedded în produse reglementate | 2 aug 2027 | **2 august 2028** | [CONFIRMAT] |
| Art. 6 — definiția "safety component" | Largă | Îngustată — AI care doar asistă/optimizează ≠ HRAIS automat | [CONFIRMAT] |
| Art. 50 — etichetare conținut sintetic | 2 aug 2026 | **2 decembrie 2026** (extensie 4 luni) | [CONFIRMAT] |
| Art. 27 — FRIA | Obligație extinsă | Simplificare pentru SME/mid-cap | [PROBABIL] |
| Art. 71 — EU Database | Înregistrare publică pre-deployment | Grace period suplimentar pentru SME/mid-cap | [PROBABIL] |
| Definiția "mid-cap" | Inexistentă | **750 angajați + €150M cifră afaceri** beneficiază de simplificări SME | [CONFIRMAT] |
| Art. 64 — AI Office | Coordonare | Putere de enforcement întărită asupra GPAI și platforme | [CONFIRMAT] |
| Art. 99-101 — sancțiuni | 35M/15M/7.5M EUR + 7%/3%/1.5% | **Neschimbate** | [CONFIRMAT] |
| Art. 4 — AI Literacy | Aplicabil 2 feb 2025 | **Neschimbat — în vigoare ACUM** | [CONFIRMAT] |
| AI în mașini industriale (Machinery Regulation) | HRAIS dual | Exceptat de la HRAIS dedicat — doar cadrul sectorial | [CONFIRMAT] |

**Calendar formal post-Omnibus:**
- Vot Parlament + Consiliu: iunie–iulie 2026
- Publicare OJEU: sfârșit iulie 2026
- Intrare în vigoare: 3 zile post-publicare

**Ce este executoriu ACUM (16 mai 2026):**
- ✅ Art. 1–4 (subiect, scope, definiții, AI literacy) — din 2 feb 2025
- ✅ Art. 5 — practici interzise (lista originală a-h)
- ✅ Art. 51–56 — GPAI providers (modelele noi din 2 aug 2025; legacy până 2 aug 2027)
- ✅ Art. 99–101 — cadru sancționator activ pentru art. 5
- ✅ Art. 64–70 — AI Office + autorități naționale
- ⏳ Art. 5 — adăugare nudifier/CSAM: 2 dec 2026
- ⏳ Art. 50 — watermarking: 2 dec 2026
- ⏳ Art. 6–49 (HRAIS Anexa III): 2 dec 2027
- ⏳ Art. 6 (HRAIS Anexa I embedded): 2 aug 2028

---

# CAPITOLUL I — DISPOZIȚII GENERALE

## Art. 1 — Subject matter (Obiect)

**Text legal:**
> 1. Scopul prezentului regulament este de a îmbunătăți funcționarea pieței interne și de a promova adoptarea inteligenței artificiale (AI) centrate pe om și de încredere, asigurând în același timp un nivel ridicat de protecție a sănătății, siguranței, drepturilor fundamentale consacrate în Cartă, inclusiv democrația, statul de drept și protecția mediului, împotriva efectelor nocive ale sistemelor AI în Uniune, susținând inovarea.
>
> 2. Prezentul regulament stabilește:
> (a) reguli armonizate pentru introducerea pe piață, punerea în funcțiune și utilizarea sistemelor AI în Uniune;
> (b) interdicții privind anumite practici AI;
> (c) cerințe specifice pentru sistemele AI cu risc ridicat și obligații pentru operatorii acestora;
> (d) reguli armonizate de transparență pentru anumite sisteme AI;
> (e) reguli armonizate pentru introducerea pe piață a modelelor AI de uz general (GPAI);
> (f) reguli privind monitorizarea pieței, supravegherea, guvernanța și executarea;
> (g) măsuri de susținere a inovării, cu accent special pe IMM-uri și startup-uri.

**Cui se aplică:** Tuturor — articol introductiv. Definește scopul regulamentar.

**Ce trebuie făcut concret:**
- Niciun act executoriu direct; furnizează contextul interpretativ pentru toate celelalte articole.
- Folosit ca temei pentru argumente proporționalitate/finalitate în orice litigiu.

**Deadline:** 2 februarie 2025 (în vigoare).
**Status executoriu acum:** DA.

**Sancțiune:** Nu există sancțiuni directe pentru art. 1.

**Cross-reference:** GDPR Art. 1; Carta UE Art. 8 (date), Art. 21 (nediscriminare), Art. 1 (demnitate).

**Featurization SaaS:** Caracteristică "Scope Wizard" — primul pas în onboarding întreabă utilizatorul ce categorie de operator este (provider, deployer, importer, etc.) pentru a personaliza dashboard-ul.

**URL:** https://artificialintelligenceact.eu/article/1/

---

## Art. 2 — Scope (Domeniu de aplicare)

**Text legal:**
> 1. Prezentul regulament se aplică:
> (a) furnizorilor care introduc pe piață sau pun în funcțiune sisteme AI sau introduc pe piață modele GPAI în Uniune, indiferent dacă acești furnizori sunt stabiliți sau localizați în Uniune sau într-o țară terță;
> (b) deployer-ilor de sisteme AI care au locul de stabilire sau sunt localizați în Uniune;
> (c) furnizorilor și deployer-ilor de sisteme AI care au locul de stabilire sau sunt localizați într-o țară terță, **când output-ul produs de sistemul AI este utilizat în Uniune**;
> (d) importatorilor și distribuitorilor de sisteme AI;
> (e) producătorilor de produse care introduc pe piață sau pun în funcțiune un sistem AI împreună cu produsul lor și sub numele sau marca lor;
> (f) reprezentanților autorizați ai furnizorilor care nu sunt stabiliți în Uniune;
> (g) persoanelor afectate care sunt localizate în Uniune.
>
> 2. Pentru sistemele AI cu risc ridicat legate de produse din Anexa I Secțiunea B, se aplică doar art. 6(1), art. 102–109 și art. 112.
> 3. Exclus: AI utilizat exclusiv pentru scopuri militare, de apărare sau securitate națională.
> 4. Exclus: autorități publice din țări terțe sau organizații internaționale ce folosesc AI pentru cooperare law enforcement, cu garanții.
> 5. Nu afectează liability-ul intermediarilor (Regulamentul 2022/2065 — DSA).
> 6. Exclus: sistemele AI dezvoltate exclusiv pentru **cercetare și dezvoltare științifică**.
> 7. GDPR, legi naționale de date, ePrivacy — nemodificate.
> 8. Exclus: activitățile pre-market de cercetare/testare, **cu excepția** testării în condiții reale.
> 9. Drepturile consumatorilor și siguranța produselor — nemodificate.
> 10. Exclus: persoane fizice ce folosesc AI **pentru activități pur personale, non-profesionale**.
> 11. Statele membre pot menține protecții mai stricte pentru lucrători.
> 12. Exclus: AI cu licență **open-source și gratuită**, **cu excepția** cazului când sunt HRAIS sau intră sub art. 5/50.

**Cui se aplică:**
- **Provider:** DA — toate paragrafele
- **Deployer:** DA — par. 1(b), (c)
- **Importer / Distributor:** DA — par. 1(d)
- **GPAI provider:** DA — par. 1(a)
- **Excepții:** militare, R&D pur, personal, open-source non-HRAIS

**Ce trebuie făcut concret:**
1. Determinați rolul: provider, deployer, importer, distribuitor, reprezentant autorizat.
2. Verificați dacă output-ul ajunge în UE — dacă da, regulamentul se aplică indiferent de sediu.
3. Documentați excluderea dacă invocați R&D, militar, open-source.
4. Dacă sunteți deployer non-UE cu output în UE — trebuie totuși să respectați obligațiile deployer.

**Deadline:** 2 februarie 2025.
**Status executoriu acum:** DA.

**Sancțiune:** Indirect — orice acțiune fără a determina corect scope-ul atrage sancțiunile articolului încălcat.

**Cross-reference:** DSA (Reg. 2022/2065), GDPR, Directiva ePrivacy 2002/58, OUG 24/2024 (legea română de transpunere AI Act — în lucru).

**Featurization SaaS:**
- Detector "extraterritorial reach" — analizează dacă produsul SaaS al clientului produce output ce ajunge în UE.
- Quiz "Sunt în scope?" cu 7 întrebări binare.
- Generator de attestation R&D / open-source.

**URL:** https://artificialintelligenceact.eu/article/2/

---

## Art. 3 — Definitions (Definiții)

**Definiții cheie (cele 68 din regulament, esențialele):**

| Termen | Definiție |
|---|---|
| **AI system** | Sistem bazat pe mașină, conceput să opereze cu niveluri variabile de autonomie, care poate prezenta adaptivitate post-deployment și care, pentru obiective explicite sau implicite, deduce din input-ul primit cum să genereze output-uri (predicții, conținut, recomandări, decizii) care pot influența medii fizice sau virtuale. |
| **Provider** | Persoană fizică sau juridică ce dezvoltă un sistem AI sau un model GPAI sau care îl pune să fie dezvoltat și îl introduce pe piață / pune în funcțiune sub propriul nume sau marcă, contra cost sau gratuit. |
| **Deployer** | Persoană fizică/juridică ce utilizează un sistem AI sub autoritatea sa, cu excepția utilizării pentru activități personale non-profesionale. |
| **Distributor** | Persoană fizică/juridică din lanțul de aprovizionare, alta decât provider/importer, care face disponibil un sistem AI pe piața UE. |
| **Importer** | Persoană fizică/juridică localizată/stabilită în UE care introduce pe piață un sistem AI ce poartă numele/marca unei persoane stabilite într-o țară terță. |
| **Authorised representative** | Persoană fizică/juridică din UE ce are mandat scris de la un provider non-UE pentru a îndeplini obligațiile regulamentare. |
| **General-purpose AI model (GPAI)** | Model AI, inclusiv cele antrenate cu cantități mari de date prin self-supervision la scară, ce afișează generalitate semnificativă și este capabil să execute competent o gamă largă de sarcini distincte, indiferent de modul în care este pus pe piață, și care poate fi integrat într-o varietate de sisteme/aplicații downstream. |
| **General-purpose AI system** | Sistem AI bazat pe un model GPAI, capabil să servească diverse scopuri, atât pentru utilizare directă, cât și pentru integrare în alte sisteme AI. |
| **Systemic risk** | Risc specific capabilităților cu impact ridicat ale modelelor GPAI, ce are impact semnificativ asupra pieței UE datorită reach-ului sau efectelor negative previzibile asupra sănătății publice, siguranței, securității publice, drepturilor fundamentale sau societății în ansamblu, ce se pot propaga la scară de-a lungul lanțului valoric. |
| **High-risk AI system (HRAIS)** | Sistem AI ce intră sub categoria din art. 6(1) sau 6(2). |
| **Safety component** | Componentă a unui produs sau sistem AI care îndeplinește o funcție de siguranță pentru acel produs/sistem ori a cărei defecțiune/disfuncționalitate pune în pericol sănătatea/siguranța persoanelor sau proprietatea. **[POST-OMNIBUS]** Definiție îngustată: AI care doar asistă utilizatorii sau optimizează performanța **NU** se califică automat ca safety component dacă eșecul său nu generează risc de sănătate/siguranță. |
| **Placing on the market** | Prima punere la dispoziție a unui sistem AI pe piața UE. |
| **Putting into service** | Furnizarea unui sistem AI pentru prima utilizare direct deployer-ului sau pentru utilizare proprie în UE pentru scopul propus. |
| **Substantial modification** | Modificare a sistemului AI post-introducere pe piață care: (a) nu a fost prevăzută în assessmentul inițial de conformitate ȘI (b) afectează conformitatea cu cerințele Capitolului III ori modifică scopul propus. |
| **Biometric data** | Date personale rezultate din procesare tehnică specifică privind caracteristicile fizice, fiziologice sau comportamentale ale unei persoane fizice (ex: imagini faciale, date dactiloscopice). |
| **Biometric identification** | Recunoaștere automată a caracteristicilor biometrice pentru a stabili identitatea unei persoane prin comparare cu date stocate. |
| **Emotion recognition system** | Sistem AI conceput să identifice/dedueze emoții sau intenții ale unor persoane fizice pe baza datelor biometrice. |
| **Deep fake** | Conținut imagine/audio/video generat sau manipulat de AI care seamănă cu persoane, obiecte, locuri reale și care ar părea în mod fals autentic. |
| **Real-time remote biometric identification** | Sistem de identificare biometrică la distanță unde captarea datelor, compararea și identificarea au loc fără întârziere semnificativă. |
| **Critical infrastructure** | Conform Directivei (UE) 2022/2557 (CER). |
| **Conformity assessment** | Proces ce demonstrează că cerințele Cap. III, Secțiunea 2 au fost îndeplinite. |
| **Notified body** | Organism de evaluare a conformității desemnat conform regulamentului. |
| **Floating-point operation (FLOP)** | Operațiune matematică pe numere flotante (relevant pentru threshold-ul GPAI systemic risk de 10^25). |

**Cui se aplică:** Tuturor — definițiile sunt utilizate universal.

**Ce trebuie făcut concret:**
1. Mapați fiecare componentă a stack-ului tehnologic la definițiile relevante.
2. Documentați rolul firmei (provider / deployer / importer) — afectează direct obligațiile.
3. Dacă produceți un model fundamental, verificați FLOP-urile de antrenare (threshold 10^25).
4. Dacă faceți "substantial modification" la un sistem terț, **deveniți provider** (art. 25).

**Deadline:** 2 februarie 2025.
**Status executoriu acum:** DA.

**Cross-reference:** GDPR Art. 4 (definiții personal data), DSA Art. 3, Directiva CER (UE) 2022/2557.

**Featurization SaaS:**
- "Role classifier" — questionnaire ce determină rolul firmei și emite atestat.
- "AI System Identifier" — heuristic ce determină dacă o tehnologie este "AI system" per definiție (excluzând rule-based simple).
- Watcher de "substantial modification" — alertă la fine-tuning sau scope change.

**URL:** https://artificialintelligenceact.eu/article/3/

---

## Art. 4 — AI Literacy

**Text legal:**
> Furnizorii și deployer-ii sistemelor AI trebuie să ia măsuri pentru a asigura, în cea mai mare măsură posibilă, un nivel suficient de **AI literacy** (alfabetizare AI) al personalului lor și al altor persoane care se ocupă de operarea și utilizarea sistemelor AI în numele lor, ținând cont de cunoștințele lor tehnice, experiență, educație, formare și contextul în care sunt utilizate sistemele AI, și luând în considerare persoanele sau grupurile asupra cărora sunt utilizate sistemele AI.

**Cui se aplică:**
- **Provider:** DA (obligație)
- **Deployer:** DA (obligație)
- **Importer / Distributor:** NU explicit, dar recomandat
- **GPAI:** DA — providerii GPAI au aceeași obligație
- **Excepții:** activități pur personale

**Ce trebuie făcut concret:**
1. **Program documentat de training AI** — pentru fiecare rol care interacționează cu AI.
2. **Audit anual** al cunoștințelor: tipologii AI, riscuri, drepturi fundamentale, GDPR overlap, FRIA basics.
3. **Materiale diferențiate**: nivel manager, nivel operațional, nivel utilizator final.
4. **Registru de participare**: cine, când, ce modul, scor evaluare.
5. Documentare a **adecvării** programului la context (sector, vulnerabilități grup-țintă).

**Deadline:**
- Original: **2 februarie 2025**.
- Updated Omnibus mai 2026: nemodificat.
- Status executoriu acum (mai 2026): **DA**.

**Sancțiune:** Indirectă prin art. 99(4) — încălcare obligație provider/deployer → până la **€15M sau 3% turnover global**.

**Cross-reference:**
- GDPR Art. 39(1)(b) — DPO formează personalul.
- NIS2 Art. 20 — formare management în cybersecurity (overlap pentru AI utilizat în critical infra).
- DORA Art. 13(6) — formare ICT pentru entitățile financiare.

**Featurization SaaS:**
- **Modul training AI Literacy integrat** — curs e-learning cu evaluare automată.
- **Generator de policy "AI Acceptable Use"** personalizat per organizație.
- **Tracker de competențe** — matricea persoane × module finalizate.
- Export atestate semnate digital.
- Reamintire automată la 12 luni pentru reformare.

**URL:** https://artificialintelligenceact.eu/article/4/

---

# CAPITOLUL II — PRACTICI INTERZISE (PROHIBITED PRACTICES)

## Art. 5 — Prohibited AI Practices

**Text legal — paragraful 1 (cele 8 categorii originale + adăugiri Omnibus):**

> Următoarele practici AI sunt interzise:
>
> **(a) Tehnici subliminale sau manipulative:** introducerea pe piață, punerea în funcțiune sau utilizarea unui sistem AI ce deployează tehnici subliminale dincolo de conștiința unei persoane sau tehnici intenționat manipulative ori înșelătoare, având scopul/efectul de a distorsiona material comportamentul prin afectarea apreciabilă a capacității de a lua decizii informate, cauzând prejudicii semnificative.
>
> **(b) Exploatarea vulnerabilităților:** sisteme AI ce exploatează vulnerabilitățile unei persoane sau grup datorate **vârstei, dizabilității ori situației sociale/economice specifice**, distorsionând material comportamentul în mod ce cauzează/este probabil să cauzeze prejudicii semnificative.
>
> **(c) Social scoring:** sisteme AI pentru evaluarea/clasificarea persoanelor fizice sau grupurilor pe perioade de timp pe baza comportamentului social ori a caracteristicilor personale, cu scoring social ce duce la:
> (i) tratament defavorabil în contexte sociale fără legătură cu cele în care datele au fost generate;
> (ii) tratament nejustificat sau disproporționat în raport cu comportamentul.
>
> **(d) Predicția riscului de criminalitate individuală:** sisteme AI ce evaluează/predicționează riscul ca o persoană să comită o infracțiune **pe baza exclusivă a profiling-ului ori a evaluării trăsăturilor de personalitate** (excepție: sisteme ce sprijină evaluarea umană bazată pe fapte obiective și verificabile).
>
> **(e) Scrapingul facial:** sisteme AI ce creează/extind baze de date de recunoaștere facială prin **scraping netargetat** al imaginilor faciale de pe internet sau din CCTV.
>
> **(f) Recunoașterea emoțiilor în muncă/educație:** sisteme AI ce inferează emoțiile unei persoane în **mediul de muncă și instituțiile de învățământ** (excepție: scopuri medicale sau de siguranță).
>
> **(g) Categorizare biometrică pentru atribute sensibile:** sisteme AI ce categorizează individual persoane pe bază de date biometrice pentru a infera/deduce **rasa, opiniile politice, apartenența sindicală, convingerile religioase/filosofice, viața sexuală sau orientarea sexuală**. Excepție: etichetare/filtrare legală a dataset-urilor biometrice.
>
> **(h) Identificare biometrică la distanță în timp real în spații publice pentru law enforcement** — interzisă, cu excepții stricte (căutare victime infracțiuni grave, prevenire amenințare iminentă teroristă/la viață, identificare suspecți pentru infracțiuni din Anexa II cu pedeapsă min. 4 ani). Necesită autorizare judiciară prealabilă (sau 24h post-facto în urgență).

**Adăugiri Omnibus mai 2026 [CONFIRMAT, aplicabil 2 dec 2026]:**

> **(i) Aplicații "nudifier" și generare CSAM:** sisteme AI ce generează imagini intime non-consensuale (deepfakes pornografice) sau material de abuz sexual asupra minorilor (CSAM).

**Paragrafele 2–8:** stabilesc garanțiile procedurale pentru utilizarea biometriei la distanță de către law enforcement: autorizare judiciară prealabilă, evaluare de impact asupra drepturilor fundamentale, înregistrare în EU database, raportare anuală la Comisia Europeană.

**Cui se aplică:**
- **Provider:** DA — interdicție absolută de a introduce pe piață.
- **Deployer:** DA — interdicție de utilizare.
- **Importer / Distributor:** DA.
- **GPAI:** DA (în măsura în care modelul facilitează practica interzisă).
- **Excepții:** R&D pur, militar/securitate națională, excepțiile specifice (h) pentru law enforcement.

**Ce trebuie făcut concret:**
1. **Banned-practices scan:** inventariați TOATE sistemele AI utilizate și verificați împotriva celor 9 categorii (a-i).
2. **Politici interne:** redactați "Prohibited AI Use Policy" cu interzicere explicită.
3. **Vendor due diligence:** chestionar furnizor cu declarație "sistemul nostru NU îndeplinește art. 5".
4. **Monitoring continuu:** review trimestrial al noilor sisteme AI achiziționate.
5. **Pentru recruitment/HR:** asigurați-vă că instrumentele de screening NU detectează emoții ale candidaților.
6. **Pentru sectorul public:** verificați că niciun pilot nu cade în social scoring (chiar dacă pare benign).
7. **Pentru servicii foto/AI generative:** filtru anti-nudifier obligatoriu din 2 dec 2026.

**Deadline:**
- Original (a–h): **2 februarie 2025**.
- Updated Omnibus mai 2026 (i — nudifier/CSAM): **2 decembrie 2026**.
- Status executoriu acum (mai 2026): **DA pentru a–h**, în pregătire pentru (i).

**Sancțiune:** **Tier maximum** — până la **€35 milioane SAU 7% din cifra de afaceri anuală globală**, care e mai mare (art. 99(3)).

**Cross-reference:**
- GDPR Art. 9 (date biometrice sensibile), Art. 22 (decizii automate).
- Carta UE Art. 1 (demnitate), Art. 21 (nediscriminare), Art. 47 (cale judiciară efectivă).
- Directiva 2011/93 (CSAM).
- Legea privind protecția minorilor (RO).

**Featurization SaaS:**
- **Prohibited Practice Detector** — chestionar 30 întrebări cu output: status conformitate per categorie.
- **Vendor Risk Module** — bibliotecă de chestionare DD pentru furnizori AI.
- **Heat-map de risc** vizual: ce sisteme din portofoliul firmei sunt aproape de limita art. 5.
- **Alert system** — schimbare semnificativă a sistemului → re-evaluare automată.
- Template de "AI Acceptable Use Policy".

**URL:** https://artificialintelligenceact.eu/article/5/

---

# CAPITOLUL III — SISTEME AI CU RISC RIDICAT (HIGH-RISK AI SYSTEMS — HRAIS)

## Art. 6 — Classification Rules for High-Risk AI Systems

**Text legal (sinteză strânsă):**

> 1. Un sistem AI este considerat **cu risc ridicat** dacă sunt îndeplinite ambele:
> (a) sistemul AI este destinat să fie utilizat ca o **componentă de siguranță a unui produs**, sau este el însuși un produs, acoperit de legislația de armonizare din Anexa I;
> (b) produsul în care este integrat sistemul, sau sistemul AI însuși ca produs, trebuie să fie supus unei **evaluări de conformitate de către un terț** (notified body) conform legislației din Anexa I.
>
> 2. Pe lângă cele din par. 1, sistemele AI menționate în **Anexa III** sunt considerate cu risc ridicat.
>
> 3. **Excepție:** Un sistem AI din Anexa III NU este considerat cu risc ridicat dacă nu prezintă risc semnificativ de prejudiciu sănătății, siguranței sau drepturilor fundamentale, prin îndeplinirea uneia dintre condițiile:
> (a) sistemul AI execută o **sarcină procedurală îngustă**;
> (b) sistemul AI **îmbunătățește rezultatul** unei activități umane completate anterior;
> (c) sistemul AI detectează **modele de luare a deciziilor** sau abateri de la modele anterioare, fără a înlocui evaluarea umană;
> (d) sistemul AI execută o **sarcină pregătitoare** pentru un assessment relevant.
> **CRUCIAL:** Excepția **NU se aplică** dacă sistemul AI face **profiling de persoane fizice** — rămâne HRAIS.
>
> 4. Provider-ul ce invocă excepția par. 3 trebuie să **documenteze assessment-ul** înainte de a-l introduce pe piață și să-l înregistreze în EU Database conform art. 49.
>
> 5. Comisia publică **ghiduri de implementare** până la **2 februarie 2026** cu exemple practice.

**[POST-OMNIBUS]** Definiția "safety component" este îngustată: sisteme AI ce doar asistă utilizatorul sau optimizează performanța nu se califică automat ca HRAIS dacă defecțiunea/disfuncționalitatea lor nu creează riscuri pentru sănătate/siguranță.

**Cui se aplică:**
- **Provider:** DA — responsabil de clasificare și documentare.
- **Deployer:** Indirect — primește un sistem deja clasificat.
- **Importer / Distributor:** DA — verifică clasificarea.
- **GPAI:** NU direct (GPAI are propriul regim Cap. V), dar **GPAI integrat într-un HRAIS** atrage obligații art. 25.

**Ce trebuie făcut concret:**
1. **Anexa I check:** sistemul este safety component într-un produs reglementat (mașini, medical devices, jucării, ascensoare, ATEX, etc.)? + necesită evaluare terț → **HRAIS**.
2. **Anexa III check:** sistemul corespunde uneia dintre cele 8 categorii? → presupus HRAIS.
3. **Excepție par. 3:** documentați RIGUROS dacă invocați excepția (4 condiții). Atenție: profiling = HRAIS oricum.
4. **Registry obligation:** chiar dacă invocați excepția, înregistrați în EU Database (art. 49 + 71).
5. **Re-assessment** la fiecare modificare substanțială.

**Deadline:**
- Original: **2 august 2026** (Anexa III) și **2 august 2027** (Anexa I).
- **Updated Omnibus mai 2026:**
  - HRAIS stand-alone (Anexa III): **2 decembrie 2027**.
  - HRAIS embedded în produse Anexa I: **2 august 2028**.
- Status executoriu acum (mai 2026): **NU**.

**Sancțiune:** Tier 2 — până la **€15 milioane SAU 3% turnover** (art. 99(4)).

**Cross-reference:**
- Anexa I (24 acte legislative sectoriale).
- Anexa III (8 categorii high-risk).
- Art. 25 (substantial modification → deveniți provider).
- GDPR Art. 35 (DPIA) — overlap cu FRIA (art. 27).
- DSA, NIS2, DORA.

**Featurization SaaS:**
- **HRAIS Classifier** — wizard binar 12 întrebări → output: HRAIS DA/NU + categoria Anexa.
- **Excepție Builder** — chestionar pentru invocarea art. 6(3) cu generator de attestation PDF.
- **Auto-registration EU Database** — completare pre-fill formulare Anexa VIII.
- **Profiling Detector** — analizează dacă sistemul face profiling (atunci excepția nu se aplică).
- **Calendar tracker** cu reminder pentru 2 dec 2027.

**URL:** https://artificialintelligenceact.eu/article/6/

---

## Art. 7 — Amendments to Annex III

**Text legal:** Comisia poate, prin **acte delegate** (art. 97), să modifice Anexa III prin adăugarea/eliminarea cazurilor de utilizare cu risc ridicat, după criterii:
- Sistemul AI vizează domenii deja listate în Anexa III.
- Sistemele prezintă risc echivalent sau superior celor existente, evaluat după: scopul propus, gradul de utilizare, sensibilitatea datelor, autonomie, prejudicii documentate, vulnerabilități, reversibilitate, garanții legale existente.

**Cui se aplică:** Toți actorii — modificările sunt aplicabile general.

**Ce trebuie făcut concret:**
1. Monitorizare oficială OJEU pentru noi acte delegate.
2. Re-clasificare a sistemelor existente după actualizări Anexa III.

**Deadline:** Aplicabil de la **2 august 2026** (mecanism), modificările individuale au propriile deadline-uri.

**Sancțiune:** Indirect — încălcare ulterioară a obligațiilor pentru sisteme nou clasificate HRAIS.

**Featurization SaaS:** **Regulatory Watch** — feed automat OJEU pentru acte delegate AI Act, alertă utilizator când un domeniu nou este adăugat.

**URL:** https://artificialintelligenceact.eu/article/7/

---

## Art. 8 — Compliance with the Requirements

**Text legal:** HRAIS trebuie să respecte cerințele Secțiunii 2 a Cap. III (art. 9-15), ținând cont de scopul propus și de stadiul actual al tehnologiei AI. Sistemul de management al riscului (art. 9) este central. Pentru produse multi-reglementate, providerul integrează cerințele AI Act în procedurile existente.

**Cui se aplică:** Provider HRAIS — obligație principală.

**Ce trebuie făcut concret:**
1. **Gap analysis** vs art. 9-15.
2. **Plan de conformitate** integrat cu cerințele sectoriale (MDR, MR, etc.).
3. **Single technical file** dacă produsul cade sub multiple reglementări.

**Deadline:** **2 decembrie 2027** (post-Omnibus).
**Status:** NU executoriu acum.

**Sancțiune:** Art. 99(4) — €15M/3%.

**Featurization SaaS:** **Compliance Gap Dashboard** — checklist art. 9-15 cu status per cerință.

**URL:** https://artificialintelligenceact.eu/article/8/

---

## Art. 9 — Risk Management System

**Text legal:**
> 1. Trebuie stabilit, implementat, documentat și menținut un sistem de management al riscului pentru HRAIS.
> 2. **Sistem continuu, iterativ**, planificat și rulat pe întreaga durată de viață a HRAIS, ce necesită revizuire și actualizare sistematică regulată. Cuprinde:
> (a) identificarea și analiza riscurilor cunoscute și previzibile pe care HRAIS le poate prezenta pentru sănătate, siguranță, drepturi fundamentale;
> (b) evaluarea riscurilor ce pot apărea când HRAIS este utilizat în conformitate cu scopul propus și în condiții de **misuse rezonabil previzibil**;
> (c) evaluarea altor riscuri ce ar putea apărea pe baza datelor din monitorizarea post-market;
> (d) adoptarea unor măsuri adecvate și țintite de management al riscului.
>
> 3. Riscurile considerate sunt cele ce pot fi atenuate sau eliminate prin **design și dezvoltare** sau prin **furnizarea de informații tehnice adecvate**.
>
> 5. HRAIS trebuie **testate** pentru identificarea celor mai potrivite măsuri de management. Testarea asigură că HRAIS funcționează consistent pentru scopul propus și respectă cerințele Secțiunii 2.
>
> 7. Testarea HRAIS se efectuează **pe parcursul procesului de dezvoltare și înainte de introducerea pe piață**. Se efectuează în baza unor **metrici prestabilite și praguri probabilistice** adecvate scopului.
>
> 9. La implementarea sistemului de management al riscului, providerul trebuie să acorde atenție specifică dacă HRAIS este probabil să fie accesat de **minori sau alte grupuri vulnerabile**.

**Cui se aplică:**
- **Provider HRAIS:** DA — obligație principală.
- **Deployer:** Indirect — folosește instrucțiunile providerului.

**Ce trebuie făcut concret:**
1. **Risk Register HRAIS** — listă continuu actualizată: amenințare, probabilitate, impact, măsură.
2. **Threat modeling** (STRIDE, LINDDUN-AI, NIST AI RMF).
3. **Misuse testing** — red-teaming, adversarial testing.
4. **Mitigare prin design**: data quality, oversight uman, robustețe.
5. **Documentare procese** — proces formal de aprobare a riscurilor reziduale.
6. **Atenție specială** la minori / grupuri vulnerabile (KPI separat).
7. **Integration cu ISO 42001** (AI Management System).

**Deadline:** **2 decembrie 2027**.
**Status:** NU executoriu acum.

**Sancțiune:** Art. 99(4) — €15M/3%.

**Cross-reference:**
- ISO/IEC 42001:2023 — AI Management System.
- NIST AI Risk Management Framework.
- ISO 31000 — Risk management.
- GDPR Art. 35 (DPIA).
- NIS2 Art. 21 (risk management).

**Featurization SaaS:**
- **Risk Register module** specializat pentru AI (cu taxonomie AI specifică).
- **Threat library AI** — bibliotecă pre-completată: bias, drift, poisoning, jailbreak, prompt injection.
- **Test plan generator** — output: protocol de testare conform stadiului tehnologiei.
- **Vulnerable groups assessor** — wizard pentru a determina dacă HRAIS are impact pe minori/dizabilitate/etc.
- **Integration NIST AI RMF + ISO 42001** — mapare cross-framework.

**URL:** https://artificialintelligenceact.eu/article/9/

---

## Art. 10 — Data and Data Governance

**Text legal:**
> 1. HRAIS ce folosesc tehnici de antrenare ML trebuie dezvoltate pe baza **dataset-urilor de antrenare, validare și testare** ce îndeplinesc criteriile par. 2-5.
>
> 2. Dataset-urile sunt supuse **practicilor de data governance** adecvate scopului HRAIS. Practicile vizează:
> (a) alegeri relevante de design;
> (b) procese de colectare și origini ale datelor (inclusiv pentru date personale, scopul original al colectării);
> (c) operațiuni relevante de preparare (annotation, etichetare, curățare, actualizare, îmbogățire, agregare);
> (d) formularea **assumption-urilor**, în special privind informația pe care datele ar trebui să o reprezinte;
> (e) **evaluarea disponibilității, cantității și adecvării** dataset-urilor;
> (f) examinarea **bias-urilor** ce ar putea afecta sănătatea/siguranța/drepturile fundamentale sau ar duce la discriminare;
> (g) măsuri pentru detectarea, prevenirea și atenuarea bias-urilor;
> (h) identificarea **lacunelor de date relevante** ce împiedică conformitatea și modalități de adresare.
>
> 3. Dataset-urile trebuie să fie **relevante, suficient de reprezentative, în cea mai bună măsură fără erori și complete** pentru scopul propus.
>
> 4. Dataset-urile țin cont, în măsura cerută de scop, de caracteristicile sau elementele particulare contextului **geografic, comportamental, contextual sau funcțional** în care HRAIS este utilizat.
>
> 5. **Excepție GDPR pentru bias detection:** providerii pot procesa **categorii speciale de date personale** (GDPR Art. 9) **doar în măsura strict necesară** pentru detectarea și corecția bias-urilor, sub garanții: re-use tehnic limitat, securitate state-of-the-art, controale acces stricte, no-transfer, ștergere după corecție, log-uri de procesare.
>
> 6. Pentru HRAIS ne-ML (rule-based, expert systems), par. 2-5 se aplică DOAR dataset-urilor de **testare**.

**Cui se aplică:** Provider HRAIS.

**Ce trebuie făcut concret:**
1. **Data lineage** complet — origine, transformări, version control.
2. **Data sheets** per dataset (urmând Datasheets for Datasets — Gebru et al.).
3. **Bias audit** documentat — pe atribute protejate (gen, vârstă, etnie, dizabilitate).
4. **Representativity report** — în context geografic, demografic, contextual.
5. **Data quality metrics**: completeness, accuracy, consistency, freshness.
6. **GDPR Art. 9 invocation log** — orice procesare date sensibile pentru debias.
7. **Drift monitoring** — alertă când distribuția datelor se schimbă.

**Deadline:** **2 decembrie 2027**.
**Status:** NU executoriu acum.

**Sancțiune:** Art. 99(4) — €15M/3% (data governance este menționat explicit ca fiind sancționabil sever).

**Cross-reference:**
- GDPR Art. 5 (data minimisation, accuracy), Art. 9 (sensitive data), Art. 25 (DPbD).
- ISO/IEC 5259 (data quality for analytics and ML).
- Standardul european EN AI Quality (în lucru — CEN-CENELEC JTC 21).

**Featurization SaaS:**
- **Data Governance Hub** — registru centralizat dataset-uri AI.
- **Bias Scanner** — integrare cu Fairlearn / Aequitas / IBM AIF360.
- **Datasheet Generator** — template completat pre-fill.
- **GDPR Art. 9 Justification Workflow** — cu approval flow DPO.
- **Drift Dashboard** — KPI live: data drift, concept drift, performance drift.

**URL:** https://artificialintelligenceact.eu/article/10/

---

## Art. 11 — Technical Documentation

**Text legal:**
> 1. Documentația tehnică a HRAIS este pregătită **înainte de introducerea pe piață** și este actualizată continuu. Demonstrează că HRAIS respectă cerințele Secțiunii 2 și furnizează autorităților competente și organismelor notificate informațiile necesare în formă clară și comprehensivă. **Conține minim elementele din Anexa IV**.
>
> **IMM-uri și startup-uri** pot furniza documentație **simplificată**, conform unui formular stabilit de Comisie, pe care notified bodies trebuie să-l accepte.
>
> 2. Pentru HRAIS legate de produse din Anexa I Secțiunea A, se redactează **un singur set integrat** de documentație tehnică ce conține toate informațiile cerute de AI Act + legislația sectorială.

**Cui se aplică:** Provider HRAIS.

**Ce trebuie făcut concret:**
1. **Single Technical File** structurat după Anexa IV.
2. **Version control** — fiecare modificare, traceabilă.
3. **Documentația MENȚINUTĂ ACTIVĂ** până la 10 ani post-introducere pe piață.
4. **IMM:** folosiți template-ul simplificat (când Comisia îl publică).
5. **Multi-regulation merge:** combinați AI Act + MDR/MR/etc.

**Deadline:** **2 decembrie 2027**. Template SME — Comisia publică până 2 mai 2026.
**Status:** NU executoriu acum.

**Sancțiune:** Art. 99(4) — €15M/3%.

**Cross-reference:** MDR Art. 32 + Anexa II; MR Anexa VII.

**Featurization SaaS:**
- **Anexa IV Generator** — wizard ce construiește documentația tehnică completă.
- **Version Control built-in** pentru tech file.
- **SME Template** auto-detect.
- **PDF/A export** pentru retention 10 ani.

**URL:** https://artificialintelligenceact.eu/article/11/

---

## Art. 12 — Record-keeping (Logging)

**Text legal:**
> 1. HRAIS trebuie să permită automat **înregistrarea de log-uri** pe durata operării. Capabilitățile de logging trebuie să asigure un nivel de **trasabilitate** adecvat scopului propus.
>
> 2. Log-urile permit:
> (a) **identificarea situațiilor** ce pot rezulta în HRAIS prezentând un risc (art. 79(1)) sau în modificare substanțială;
> (b) **facilitarea monitorizării post-market** (art. 72);
> (c) **monitorizarea operațională** de către deployer (art. 26(5)).
>
> 3. Pentru HRAIS din Anexa III pct. 1(a) — biometric identification — log-urile minim includ:
> (a) perioada fiecărei utilizări (timestamp start/end);
> (b) baza de date de referință accesată;
> (c) input-ul care a produs match-ul;
> (d) identitatea persoanelor verificatoare conform art. 14(5).

**Cui se aplică:** Provider HRAIS (proiectează capabilitatea); Deployer (păstrează log-urile — art. 26(6)).

**Ce trebuie făcut concret:**
1. **Logging by design** — structured logs (JSON, timestamp, model version, input hash, output, confidence, user ID).
2. **Retention minim 6 luni** (deployer) — art. 26(6).
3. **Pentru biometric:** log conformitate Anexa III pct. 1(a).
4. **Log integrity** — append-only, criptat, semnat.
5. **GDPR balance** — log-urile nu trebuie să creeze risc DP în sine.
6. **Acces controlat** — audit trail al accesării log-urilor.

**Deadline:** **2 decembrie 2027**.
**Status:** NU executoriu acum.

**Sancțiune:** Art. 99(4) — €15M/3%.

**Cross-reference:** NIS2 Art. 21(2)(g) — logging cybersecurity; DORA Art. 28 — log management.

**Featurization SaaS:**
- **AI Audit Log** — colector log-uri standardizate per HRAIS.
- **Anomaly Detection** pe log-uri (drift, spikes, jailbreak attempts).
- **GDPR-safe logging** — automat aplicare pseudonymization la input-uri.
- **Tamper-evident storage** — hash chain, integrare cu blockchain notarization opțional.

**URL:** https://artificialintelligenceact.eu/article/12/

---

## Art. 13 — Transparency and Provision of Information to Deployers

**Text legal:**
> 1. HRAIS trebuie proiectate și dezvoltate astfel încât operarea lor să fie **suficient de transparentă** pentru a permite deployer-ilor să interpreteze output-ul sistemului și să-l utilizeze adecvat. Trebuie asigurat un nivel adecvat de transparență prin tipul potrivit de informații (par. 3).
>
> 2. HRAIS sunt însoțite de **instrucțiuni de utilizare** într-un format digital sau alt format adecvat, conținând informații **concise, complete, corecte și clare**, relevante, accesibile, comprehensibile pentru deployer.
>
> 3. Instrucțiunile conțin minim:
> (a) identitatea și datele de contact ale provider-ului;
> (b) caracteristicile, capabilitățile și limitările performanței HRAIS, incluzând:
> (i) scopul propus;
> (ii) nivelul de acuratețe (incl. metrici), robustețe, cybersecurity din art. 15;
> (iii) circumstanțe cunoscute/previzibile ce ar putea duce la riscuri;
> (iv) capabilități tehnice și caracteristici relevante pentru explainability;
> (v) performanță pentru grupuri specifice de persoane;
> (vi) specificații input + dataset-uri de antrenare/validare/testare;
> (vii) interpretare output;
> (c) modificări predeterminate ale performanței;
> (d) măsuri de oversight uman (art. 14);
> (e) resurse computaționale și hardware;
> (f) mecanismul de log-uri integrat.

**Cui se aplică:** Provider HRAIS (livrează); Deployer (consumă și aplică).

**Ce trebuie făcut concret:**
1. **Instrucțiuni standardizate** — formular Anexa IV-aligned.
2. **Limite explicite** — "sistemul NU detectează X în condiții Y".
3. **Update la fiecare release** — versioning instrucțiuni.
4. **Limba**: UE-officială (română pentru piața RO).
5. **Accesibilitate** — Directiva 2019/882 (European Accessibility Act).

**Deadline:** **2 decembrie 2027**.
**Status:** NU executoriu acum.

**Sancțiune:** Art. 99(4) — €15M/3%.

**Cross-reference:** Directiva 2019/882 (accessibility), MDR Art. 23 (instructions for use).

**Featurization SaaS:**
- **Instructions-for-Use Builder** — output PDF cu toate câmpurile art. 13.
- **Auto-translation** în limbile UE.
- **Accessibility checker** — verificare WCAG 2.2 AA.
- **Version diff** — utilizator vede ce s-a schimbat între versiuni.

**URL:** https://artificialintelligenceact.eu/article/13/

---

## Art. 14 — Human Oversight

**Text legal:**
> 1. HRAIS trebuie proiectate și dezvoltate astfel încât **persoane fizice să le poată supraveghea efectiv** pe durata utilizării.
>
> 2. Oversight-ul uman vizează **prevenirea sau minimizarea** riscurilor pentru sănătate, siguranță, drepturi fundamentale.
>
> 3. Măsurile de oversight sunt **proporționale cu riscurile, gradul de autonomie și contextul utilizării** și implementate fie:
> (a) prin măsuri **built-in** de către provider; fie
> (b) prin măsuri **identificate de provider pentru a fi implementate de deployer**.
>
> 4. Persoanele cu rol de oversight trebuie să poată, după caz:
> (a) **înțelege capacitățile și limitările** HRAIS;
> (b) **remain aware de automation bias**, mai ales pentru sisteme decision-support;
> (c) **interpreta corect output-ul** (instrumente, metode disponibile);
> (d) **decide să nu utilizeze** HRAIS sau să **ignore/override/anuleze** output-ul;
> (e) **interveni** pentru oprirea sistemului prin "stop button" sau procedură similară.
>
> 5. **Pentru HRAIS biometric identification (Anexa III pct. 1(a)):** decizia nu se ia decât după **verificare separată confirmată de min. 2 persoane fizice** cu competență și autoritate, **EXCEPȚIE**: law enforcement, migrație, frontieră, azil — unde dual verification e considerată disproporționată.

**Cui se aplică:** Provider HRAIS (proiectează capabilitatea); Deployer (asigură resursele umane).

**Ce trebuie făcut concret:**
1. **Procedură "Human-in-the-loop"** documentată per HRAIS.
2. **Designare ofițer responsabil** cu autoritate de override.
3. **Training specific oversight** — automation bias awareness.
4. **UI cu "stop button"** vizibil.
5. **Pentru biometric:** dual-control workflow obligatoriu.
6. **Log-uri override-uri** — câte ori a fost suprascris sistemul, de cine, motiv.

**Deadline:** **2 decembrie 2027**.
**Status:** NU executoriu acum.

**Sancțiune:** Art. 99(4) — €15M/3%.

**Cross-reference:** GDPR Art. 22 (decizii automate); ECHR Art. 6 (fair trial).

**Featurization SaaS:**
- **Human Oversight Workflow Designer** — drag-drop pentru a defini punctele de decizie umană.
- **Override Tracker** — KPI: rată override, motive, root cause.
- **Dual-control UI** preconfigurat pentru biometric.
- **Automation Bias Training** modul integrat.

**URL:** https://artificialintelligenceact.eu/article/14/

---

## Art. 15 — Accuracy, Robustness and Cybersecurity

**Text legal:**
> 1. HRAIS trebuie proiectate și dezvoltate astfel încât să atingă un **nivel adecvat de acuratețe, robustețe și cybersecurity** și să performeze consistent pe durata vieții.
>
> 2. Pentru adresarea aspectelor tehnice de măsurare, Comisia, în cooperare cu părți interesate, **dezvoltă benchmark-uri și metodologii**.
>
> 3. Nivelurile de acuratețe și metricile relevante sunt **declarate în instrucțiunile de utilizare**.
>
> 4. HRAIS trebuie să fie **rezistente la erori, defecte, inconsistențe** ce pot apărea în sistem sau în mediul în care operează, în particular datorită interacțiunii cu persoane sau alte sisteme. Soluții de **redundanță tehnică** (back-up sau fail-safe plans) sunt aplicate.
>
> Pentru HRAIS ce **continuă să învețe** post-introducere pe piață, se iau măsuri pentru eliminarea/reducerea riscului de **feedback loops biased** ce afectează input-uri viitoare.
>
> 5. HRAIS trebuie să fie **rezistente la încercări neautorizate de modificare** prin exploatarea vulnerabilităților sistemului. Soluțiile tehnice abordează **data poisoning, model poisoning, model evasion, confidentiality attacks, model flaws**.

**Cui se aplică:** Provider HRAIS.

**Ce trebuie făcut concret:**
1. **Performance metrics** declarate + monitorizate continuu.
2. **Adversarial testing** — periodic.
3. **Fallback mechanism** — graceful degradation.
4. **Cybersecurity AI-specific**: model card, defense against poisoning, prompt injection mitigation.
5. **OWASP Top 10 for ML** — checklist.
6. **NIST AI 100-2** — adversarial ML taxonomy.
7. **Continuous learning safeguards** — drift gates, canary deployment.

**Deadline:** **2 decembrie 2027**.
**Status:** NU executoriu acum.

**Sancțiune:** Art. 99(4) — €15M/3%.

**Cross-reference:**
- NIS2 Art. 21.
- CRA (Cyber Resilience Act 2024/2847) — overlap pentru produse cu AI.
- DORA Art. 9 (ICT risk).
- ISO/IEC 27001, ISO/IEC 23894 (AI risk).

**Featurization SaaS:**
- **Model Card Generator** — Google standard.
- **Adversarial Testing Suite** — integrare cu TextAttack, Adversarial Robustness Toolbox.
- **Cyber-AI Risk Dashboard** — KPI: ASR (attack success rate), drift score, performance retention.
- **Cross-CRA integration** — share SBOM între AI Act și CRA.

**URL:** https://artificialintelligenceact.eu/article/15/

---

## Art. 16 — Obligations of Providers of HRAIS

**Text legal (sinteză):** Providerii HRAIS sunt obligați să:
- (a) asigure conformitatea cu Secțiunea 2;
- (b) indice numele/marca + datele de contact pe HRAIS sau pe ambalaj/documentație;
- (c) instituie un **sistem de quality management** (art. 17);
- (d) păstreze documentația art. 18;
- (e) păstreze log-urile art. 19;
- (f) asigure că HRAIS trece prin **conformity assessment** (art. 43);
- (g) redacteze **EU Declaration of Conformity** (art. 47);
- (h) aplice **CE marking** (art. 48);
- (i) respecte obligația de **registration** (art. 49);
- (j) ia **corrective actions** + informeze (art. 20);
- (k) demonstrare conformitate la cererea autorității (art. 21);
- (l) asigure că HRAIS respectă cerințele de **accesibilitate** (Directive 2016/2102 + 2019/882).

**Cui se aplică:** Provider HRAIS exclusiv.

**Ce trebuie făcut concret:** Implementați TOATE obligațiile (a)-(l) — checklist integrat.

**Deadline:** **2 decembrie 2027**.
**Sancțiune:** Art. 99(4) — €15M/3%.

**Featurization SaaS:** **Provider Compliance Hub** — checklist art. 16 cu link la modulele specifice.

**URL:** https://artificialintelligenceact.eu/article/16/

---

## Art. 17 — Quality Management System (QMS)

**Text legal (sinteză):** QMS documentat ce include 12 componente:
- (a) strategia de regulatory compliance;
- (b) tehnici/proceduri de design control;
- (c) proceduri de dezvoltare, quality control, quality assurance;
- (d) testare, validare, verificare;
- (e) specificații tehnice (standarde aplicate);
- (f) management date (colectare, analiză, etichetare, stocare, filtrare, mining, agregare, retention);
- (g) sistem management risc (art. 9);
- (h) sistem monitorizare post-market (art. 72);
- (i) proceduri raportare incidente (art. 73);
- (j) comunicare cu autorități, deployer-i, distribuitori;
- (k) record-keeping;
- (l) resource management + accountability framework.

**Implementare proporțională** cu dimensiunea organizației. Pentru entități deja sub QMS sectorial (medical, finance), **integrare** este permisă.

**Cui se aplică:** Provider HRAIS.

**Ce trebuie făcut concret:**
1. **QMS documentat** — ideal aliniat cu ISO 9001 + ISO/IEC 42001.
2. **Numire QMS responsable** (executive owner).
3. **Audit intern anual**.
4. **Integrare cu sisteme existente** (ISO 13485 medical, etc.).

**Deadline:** **2 decembrie 2027**.
**Sancțiune:** Art. 99(4) — €15M/3%.

**Cross-reference:** ISO 9001, ISO/IEC 42001, ISO 13485 (medical), ISO/IEC 27001.

**Featurization SaaS:** **QMS Builder** — template 12 componente cu ownership, evidence repository, audit calendar.

**URL:** https://artificialintelligenceact.eu/article/17/

---

## Art. 18 — Documentation Keeping

**Text legal:** Provider păstrează **10 ani** post-introducere pe piață: (a) tech doc (art. 11), (b) doc QMS (art. 17), (c) doc privind modificări aprobate prin notified body, (d) decizii notified body, (e) EU Declaration of Conformity (art. 47).

**Cui se aplică:** Provider HRAIS + în caz de insolvență/cesiune, **succesorul legal** sau autoritatea desemnată.

**Ce trebuie făcut concret:** Arhivă **10 ani** structurată, format **digital lizibil + accesibil**.

**Deadline:** **2 decembrie 2027**.
**Sancțiune:** Art. 99(4) — €15M/3%.

**Featurization SaaS:** **Doc Vault 10Y** — PDF/A archive, immutable, with succession plan template.

---

## Art. 19 — Automatically Generated Logs

**Text legal:** Provider păstrează log-urile generate automat conform art. 12 pentru **minimum 6 luni** sau perioada cerută de drept european/național, **mai ales** GDPR.

**Cui se aplică:** Provider HRAIS (în măsura în care controlează log-urile).

**Ce trebuie făcut concret:** Retention policy: **6 luni minim, 24 luni recomandat**.

**Deadline:** **2 decembrie 2027**.
**Sancțiune:** Art. 99(4).

**Featurization SaaS:** Log retention policy engine cu auto-purge GDPR-aligned.

---

## Art. 20 — Corrective Actions and Duty of Information

**Text legal:** Dacă provider consideră că un HRAIS introdus pe piață **nu este conform**, ia imediat **acțiuni corective** (retragere, dezactivare, recall) și informează: distribuitorii, deployer-ii, reprezentantul autorizat, importatorii. Dacă HRAIS prezintă risc (art. 79(1)) și provider devine conștient, **investighează imediat** și informează autoritățile de supraveghere a pieței + notified body.

**Cui se aplică:** Provider HRAIS.

**Ce trebuie făcut concret:**
1. **Incident response playbook** AI-specific.
2. **Communication tree** — distribuitor → deployer.
3. **Notification template** către autorități.

**Deadline:** **2 decembrie 2027**.
**Sancțiune:** Art. 99(4) — €15M/3%.

**Featurization SaaS:** **Incident Manager** — workflow cu auto-notification stakeholders.

---

## Art. 21 — Cooperation with Competent Authorities

**Text legal:** La cererea motivată a autorității, provider furnizează **toate informațiile + documentația** necesare demonstrării conformității, **într-o limbă oficială UE** aleasă de Stat. Acces la log-uri (art. 12(1)) **gratuit**.

**Featurization SaaS:** **Authority Request Portal** — receipt + response tracker.

---

## Art. 22 — Authorised Representatives of Providers of HRAIS

**Text legal:** Providerii non-UE de HRAIS trebuie să desemneze în scris un **reprezentant autorizat** stabilit în UE **înainte** de a introduce pe piață. Reprezentantul:
- (a) verifică EU Declaration of Conformity + tech doc;
- (b) păstrează la dispoziție autorităților, pentru **10 ani**, datele provider-ului + copie tech doc + certificate notified body + EU DoC;
- (c) furnizează informații/documentație la cerere;
- (d) cooperează pentru atenuare riscuri;
- (e) îndeplinește obligația de **registration** (art. 49);
- (f) reziliază mandatul dacă provider acționează contra obligațiilor — notifică autoritatea.

**Cui se aplică:** Provider non-UE de HRAIS (obligatoriu).

**Ce trebuie făcut concret:**
1. Contract scris cu mandatar EU.
2. Verificare credențiale + capacitate tehnică.
3. Update contractual la noi versiuni HRAIS.

**Deadline:** **2 decembrie 2027**.
**Sancțiune:** Art. 99(4) — €15M/3%.

**Featurization SaaS:**
- **Auth Rep Marketplace** — directory de reprezentanți autorizați UE.
- **Mandate Template Generator** + e-signature.
- **10Y Document Vault** pentru reprezentant.

**URL:** https://artificialintelligenceact.eu/article/22/

---

## Art. 23 — Obligations of Importers

**Text legal:** Înainte de a introduce HRAIS pe piață, importer verifică:
- conformity assessment efectuat (provider);
- tech doc redactată;
- CE marking aplicat;
- EU DoC + instrucțiuni atașate;
- provider a desemnat reprezentant autorizat (dacă e non-UE).

Dacă suspectează non-conformitate sau documentație falsificată → **NU introduce pe piață** până la conformare. Dacă HRAIS prezintă risc — informează provider + reprezentant + autorități.

Indică **numele + adresa + datele de contact** pe HRAIS/ambalaj/doc.

Storage și transport — păstrate astfel încât să nu compromită conformitatea.

Păstrează 10 ani: certificate, instrucțiuni, EU DoC.

Cooperează cu autoritățile.

**Cui se aplică:** Importer HRAIS.

**Ce trebuie făcut concret:**
1. **Import checklist** pre-shipment.
2. **Document verification protocol**.
3. **Warehouse SOP** pentru menținerea conformității.
4. **Authority response procedure**.

**Deadline:** **2 decembrie 2027**.
**Sancțiune:** Art. 99(4) — €15M/3%.

**Featurization SaaS:** **Importer Compliance Toolkit** — pre-shipment checklist + auto-document validation.

**URL:** https://artificialintelligenceact.eu/article/23/

---

## Art. 24 — Obligations of Distributors

**Text legal:** Înainte de a face HRAIS disponibil pe piață, distribuitor verifică: CE marking, EU DoC, instrucțiuni, conformarea cu obligațiile provider/importer. Storage adecvat. Acțiune corectivă dacă identifică non-conformitate. Cooperare cu autoritățile.

**Cui se aplică:** Distribuitor HRAIS.

**Ce trebuie făcut concret:**
1. **Inspection protocol** la primire.
2. **Cooperation framework** cu provider/importer.
3. **Recall procedure**.

**Deadline:** **2 decembrie 2027**.
**Sancțiune:** Art. 99(4).

**Featurization SaaS:** **Distributor Workflow** integrat cu **Importer Compliance Toolkit**.

**URL:** https://artificialintelligenceact.eu/article/24/

---

## Art. 25 — Responsibilities Along the AI Value Chain (Substantial Modification)

**Text legal:** Orice distribuitor, importer, deployer sau terț devine **considerat provider** al unui HRAIS și i se aplică obligațiile provider (art. 16) dacă:
- (a) introduce numele/marca pe HRAIS deja pe piață, fără acord contractual care alocă diferit responsabilitățile;
- (b) face o **modificare substanțială** unui HRAIS deja pe piață, astfel încât rămâne HRAIS;
- (c) modifică **scopul propus** al unui sistem AI ne-HRAIS, astfel încât sistemul devine HRAIS.

Pentru GPAI integrate în HRAIS — provider HRAIS și provider GPAI **cooperează** prin acord scris (art. 25(4)).

**Cui se aplică:** Toți operatorii din lanțul valoric.

**Ce trebuie făcut concret:**
1. **Modification log** — orice schimbare semnificativă (fine-tuning, retraining, scope change).
2. **Contract clauze** explicite cu provider GPAI.
3. **Re-clasificare automată** dacă modificare = substantial.

**Featurization SaaS:** **Substantial Modification Detector** — alertă la schimbare model version, scope, training data.

---

## Art. 26 — Obligations of Deployers of HRAIS

**Text legal (sinteză detaliată):**
> 1. Deployer ia măsuri tehnice și organizaționale pentru a asigura că HRAIS este utilizat **conform instrucțiunilor** providerului.
> 2. Deployer atribuie **human oversight** unor persoane fizice ce au competența, training-ul, autoritatea + suportul necesar.
> 3. Deployer asigură că **input data** este relevantă și suficient de reprezentativă pentru scop (în măsura controlului asupra datelor).
> 4. Deployer **monitorizează operarea** HRAIS conform instrucțiunilor și informează providerii conform art. 72. Dacă suspectează că HRAIS prezintă risc → informează provider/distribuitor + autoritatea de supraveghere în max. **15 zile** + suspendă utilizarea.
> 5. Deployer **păstrează log-urile** generate automat, **min. 6 luni** (sau perioada cerută de dreptul UE/național).
> 6. Înainte de **deployment la locul de muncă**, deployer informează **reprezentanții lucrătorilor + lucrătorii afectați** că vor fi supuși HRAIS.
> 7. Deployer **autoritate publică** sau care prestează **serviciu public** se înregistrează în EU Database (art. 49) și **NU folosește HRAIS neînregistrat**.
> 8. Pentru HRAIS din **Anexa III** ce ia/asistă decizii referitoare la persoane fizice — deployer informează persoanele fizice că sunt supuse HRAIS.
> 9. Deployer cooperează cu autoritățile pentru implementare.
> 10. **Pentru HRAIS biometric identification post-eveniment în law enforcement:** autorizație judiciară prealabilă, evaluare necesitate, sub strict supervisor + 5% audit.
> 11. **Deployer GDPR Art. 35 + AI Act Art. 27 FRIA:** unde GDPR DPIA este obligatoriu, conține și elementele FRIA.

**Cui se aplică:** Deployer HRAIS.

**Ce trebuie făcut concret:**
1. **Read-and-follow instrucțiuni** provider.
2. **Designare ofițer human oversight** + training.
3. **Data quality check** la input.
4. **Monitoring continuu** + escalation procedure.
5. **Log retention 6 luni** minim.
6. **Notification workforce + reprezentanți sindicali** înainte de deployment.
7. **EU Database registration** dacă sector public.
8. **Notification persoane afectate** (transparența personală).
9. **FRIA** (art. 27) pentru deployer din sector public sau privat ce prestează servicii publice.

**Deadline:** **2 decembrie 2027**.
**Status:** NU executoriu acum.

**Sancțiune:** Art. 99(4) — €15M/3%.

**Cross-reference:**
- GDPR Art. 13/14 (transparență), Art. 22 (decizii automate), Art. 35 (DPIA), Art. 88 (workplace).
- Directiva 2002/14 (informare consultare lucrători).
- Codul muncii RO art. 17 (informare angajat).
- DORA Art. 28 (third-party ICT).

**Featurization SaaS:**
- **Deployer Onboarding Wizard** — checklist complet art. 26.
- **Workforce Notification Template Engine** (HR-ready în română).
- **Data Subject Notification Generator** — pentru persoanele afectate.
- **FRIA Module** (vezi art. 27).
- **Sector Public Auto-Detect** → auto-EU Database registration.
- **15-day Authority Alert** workflow integrat cu incident detection.

**URL:** https://artificialintelligenceact.eu/article/26/

---

## Art. 27 — Fundamental Rights Impact Assessment (FRIA)

**Text legal:**
> 1. **Înainte de prima utilizare** a unui HRAIS din Anexa III (cu excepția pct. 2 — critical infrastructure), **deployer-ii** ce sunt:
> (a) organisme guvernate de **drept public**, sau
> (b) entități private ce **prestează servicii publice**, sau
> (c) deployer-i ai HRAIS din Anexa III pct. 5(b) — **creditworthiness** — sau pct. 5(c) — **insurance risk**
>
> **trebuie să efectueze un FRIA** ce conține:
>
> (a) descrierea proceselor în care HRAIS va fi utilizat;
> (b) perioada și frecvența utilizării;
> (c) **categoriile de persoane fizice și grupuri probabil afectate**;
> (d) riscurile specifice de prejudiciu;
> (e) descrierea măsurilor de **human oversight** conform instrucțiunilor;
> (f) măsuri în caz de materializare a riscurilor — proceduri de **governance internal + complaint mechanisms**.
>
> 2. Pentru utilizări similare ulterioare — FRIA poate fi **reutilizat/actualizat**.
> 3. La execuție FRIA, deployer **notifică autoritatea de supraveghere** prin **template-ul AI Office** (cu excepția art. 46(1) — circumstanțe excepționale).
> 4. **Coordonare cu GDPR DPIA**: dacă DPIA este deja efectuat conform GDPR Art. 35, **FRIA completează** acel DPIA — nu îl duplică.

**[POST-OMNIBUS]** Simplificări pentru IMM-uri și mid-cap (≤750 angajați, ≤€150M cifră afaceri) — proces FRIA redus.

**Cui se aplică:**
- **Deployer:** public + privat ce prestează servicii publice + creditworthiness + insurance.
- **Provider:** NU direct (FRIA e responsabilitate deployer).

**Ce trebuie făcut concret:**
1. **Mapping inițial** — toate HRAIS folosite + categorii Anexa III.
2. **FRIA template** structurat după art. 27(1).
3. **Stakeholder consultation** — reprezentanți grupuri afectate.
4. **Notification authority** — folosind template AI Office.
5. **Review anual** + la modificări semnificative.
6. **Coordonare DPO** pentru integrarea cu DPIA.
7. **Complaint mechanism** disponibil persoanelor afectate.

**Deadline:** **2 decembrie 2027**.
**Status:** NU executoriu acum.

**Sancțiune:** Art. 99(4) — €15M/3%.

**Cross-reference:** GDPR Art. 35 (DPIA), GDPR Art. 22, Carta UE.

**Featurization SaaS:**
- **FRIA Wizard** — guided 7-step.
- **Stakeholder Mapper** — cine consultați per scenariu.
- **DPIA-FRIA Merger** — single workflow pentru ambele.
- **Authority Notification Engine** — auto-fill template AI Office.
- **Annual Review Reminder**.
- **Public Complaint Portal** white-label pentru deployer.

**URL:** https://artificialintelligenceact.eu/article/27/

---

## Art. 28-39 — Notifying Authorities and Notified Bodies (sinteză)

**Cadrul:**

- **Art. 28-29:** Statele membre desemnează **notifying authorities** ce evaluează, desemnează, notifică și monitorizează notified bodies.
- **Art. 30-33:** Procedura de **notificare a organismelor de evaluare** la Comisie + cerințe operaționale (independență, competență, imparțialitate, resurse).
- **Art. 34-36:** **Cerințe operaționale** ale notified bodies: proceduri documentate, personal calificat, confidențialitate.
- **Art. 37:** **Subsidiaries + subcontracting** — permis sub strictă supervizare.
- **Art. 38:** **Coordonare** între notified bodies prin grup sectorial.
- **Art. 39:** **Conformity assessment bodies din țări terțe** — acceptate sub acorduri bilaterale.

**Cui se aplică:** Notified bodies + Statele Membre.

**Ce trebuie făcut concret (pentru provider HRAIS):**
1. **Selectare notified body** acreditat — lista publică Comisie.
2. **Contract NDA** pentru tech doc.
3. **Coordonare timeline** evaluare.

**Deadline:** **2 decembrie 2027** (relevanță practică).

**Sancțiune:** Notified body încalcă obligațiile → **Tier 2** (€15M/3%).

**Featurization SaaS:** **Notified Body Directory** — search + filter pe sector + status acreditare + estimare cost/timp evaluare.

**URL:** https://artificialintelligenceact.eu/article/28-39/ (intervale per articol)

---

## Art. 40-44 — Standards and Conformity Assessment

### Art. 40 — Harmonised Standards
- HRAIS conform standardelor armonizate (CEN-CENELEC JTC 21) sunt **presupuse conforme**.
- Comisia emite mandate de standardizare; standardele acoperă Sec. 2 Cap. III + Cap. V.

### Art. 41 — Common Specifications
- În absența standardelor, Comisia poate adopta **common specifications** prin acte de implementare.

### Art. 42 — Presumption of Conformity (specifice)
- Conform standardelor → presumed conform.
- Conform cybersecurity scheme (CRA) → presumed conform art. 15(5).

### Art. 43 — Conformity Assessment
**Text legal (sinteză):**
- **HRAIS din Anexa III pct. 1 (biometric):**
  - Dacă provider a aplicat **standarde armonizate** complet → poate alege:
    (a) **Conformity assessment based on internal control** (Anexa VI), sau
    (b) **Quality management system assessment + notified body** (Anexa VII).
  - Dacă **nu există standarde** sau le-a aplicat **parțial** → **obligatoriu Anexa VII** (notified body).
- **HRAIS din Anexa III pct. 2-8 (alte categorii):** **internal control** (Anexa VI) — **fără notified body**.
- **Substantial modification** → **re-conformity assessment**, **excepție**: schimbări predeterminate documentate în tech doc inițial.

### Art. 44 — Certificates
- Notified bodies emit certificate (limba UE).
- Validitate **max. 5 ani** (4 ani pentru Anexa I sectoare).
- Re-certificare la expirare.

**Cui se aplică:** Provider HRAIS.

**Ce trebuie făcut concret:**
1. **Alegere procedură** — internal vs notified body.
2. **Standards adoption check** — verificare ce standarde CEN-CENELEC sunt disponibile.
3. **Notified body engagement** la timp.
4. **Certificate management** — calendar re-certificare.

**Deadline:** **2 decembrie 2027**.
**Sancțiune:** Art. 99(4).

**Featurization SaaS:** **Conformity Assessment Wizard** — automatizează decizia internal vs Annex VII + generează plan timeline.

---

## Art. 45-49 — CE Marking, EU Declaration of Conformity, Registration

### Art. 47 — EU Declaration of Conformity
- Provider redactează EU DoC scrisă, **mașină- + uman-lizibilă**.
- Conține minim info din Anexa V.
- Limba: ofițală UE cerută de Stat.
- Update continuu.

### Art. 48 — CE Marking
- **CE** marking aplicat **vizibil, lizibil, indelebil** pe HRAIS (sau pe ambalaj/doc dacă fizic imposibil).
- **Digital CE marking** acceptat pentru HRAIS pur digitale.
- Identificare numerică **notified body** alăturat.

### Art. 49 — Registration
- **Înainte de placing on market sau putting into service** unui HRAIS din Anexa III (excepție pct. 2 critical infra), provider/reprezentant autorizat se înregistrează + înregistrează HRAIS în **EU Database** (art. 71).
- HRAIS **considerat NE-HRAIS** după excepția art. 6(3) — provider tot înregistrează în secțiune dedicată.
- Pentru **law enforcement / migration / border**: înregistrare în secțiune **securizată non-publică**.
- **Deployer public** se înregistrează + înregistrează utilizarea HRAIS **înainte** de deployment.

**Cui se aplică:** Provider HRAIS + Deployer public.

**Ce trebuie făcut concret:**
1. Cont EU Database (când Comisia îl operaționalizează).
2. Completare formular Anexa VIII (provider) / Sec. C (deployer public).
3. Update la fiecare modificare.

**Deadline:** **2 decembrie 2027**.

**Sancțiune:** Tier 3 — info incorectă/incompletă → **€7.5M sau 1% turnover** (art. 99(5)).

**Featurization SaaS:**
- **EU Database Auto-Filler** — pre-populare din tech doc.
- **Update Triggers** — auto-detect schimbare → solicit actualizare DB.
- **Sector Public Workflow** dedicat pentru deployer-i guvernamentali.

**URL:** https://artificialintelligenceact.eu/article/49/

---

# CAPITOLUL IV — TRANSPARENȚĂ (Art. 50)

## Art. 50 — Transparency Obligations

**Text legal:**
> 1. **Providerii** sistemelor AI ce **interacționează direct cu persoane fizice** asigură că **persoanele sunt informate** că interacționează cu un sistem AI, **cu excepția** cazului când este evident pentru o persoană rezonabil informată/atentă.
>
> 2. **Providerii** de sisteme AI (incl. GPAI) ce **generează conținut sintetic audio, imagine, video sau text** asigură că output-urile sunt **marcate într-un format machine-readable** și detectabile ca artificial generate sau manipulate. Soluțiile tehnice trebuie să fie efective, interoperabile, robuste și fiabile **în măsura în care e tehnic fezabil**.
>
> 3. **Deployer-ii** sistemelor de **recunoaștere a emoțiilor** sau **categorizare biometrică** informează persoanele expuse și procesează datele conform GDPR.
>
> 4. **Deployer-ii** ce **generează sau manipulează deepfakes** trebuie să dezvăluie că este conținut **artificial generat sau manipulat**. **Excepție:** opere de **artă vizibil satirică/critică/parodică**.
>
> Pentru text **publicat** ce informează publicul în chestiuni de interes public, deployer dezvăluie că textul a fost generat artificial. **Excepție:** human-reviewed editorial content.
>
> 5. Informarea în pct. 1-4 — **clară, distinctă, la prima interacțiune/expunere**, accesibilă.

**[POST-OMNIBUS]:** **Watermarking deadline extins de la 2 aug 2026 la 2 decembrie 2026**.

**Cui se aplică:**
- **Provider:** par. 1, 2 (incl. GPAI generative).
- **Deployer:** par. 3 (emotion/biometric), 4 (deepfake).
- **Importer/Distributor:** indirect.

**Ce trebuie făcut concret:**
1. **Chatbot disclaimer** — "Sunteți în conversație cu AI".
2. **Watermarking tehnică** — C2PA, SynthID, AVS, sau echivalent. Format machine-readable obligatoriu.
3. **Emotion/biometric notification** — UI prompt cu link la informații complete.
4. **Deepfake label** vizibil + metadata.
5. **Editorial text disclosure** — disclaimer "Conținut generat AI" în text de interes public.

**Deadline:**
- Original: 2 august 2026.
- **Updated Omnibus mai 2026: 2 decembrie 2026**.
- Status executoriu acum (mai 2026): NU (intra în vigoare 2 dec 2026).

**Sancțiune:** Art. 99(4) — €15M/3%.

**Cross-reference:**
- DSA Art. 35.
- GDPR Art. 13/14.
- Codul audio-vizual (RO) — Legea 504/2002.
- C2PA standard (industry).

**Featurization SaaS:**
- **AI Disclosure Snippet Generator** — multi-language pentru chatbot-uri.
- **Watermark Integration Guide** — comparare C2PA / SynthID / open-source.
- **Deepfake Detector + Auto-Label** — pentru content moderation.
- **Editorial Workflow** — pentru media outlets.
- **Compliance Snapshot** — verificare automată dacă website respectă art. 50.

**URL:** https://artificialintelligenceact.eu/article/50/

---

# CAPITOLUL V — GENERAL-PURPOSE AI MODELS

## Art. 51 — Classification of GPAI Models as Having Systemic Risk

**Text legal:**
> 1. Un model GPAI este clasificat ca având **risc sistemic** dacă:
> (a) are **high impact capabilities** evaluate prin instrumente tehnice (benchmark-uri, indicatori); sau
> (b) Comisia, ex officio sau prin alertă calificată a panelului științific, decide că modelul are capabilități/impact echivalent.
>
> 2. **Prezumție**: model GPAI are high impact capabilities când cantitatea cumulativă de calcul utilizată pentru antrenare, măsurată în **floating point operations (FLOPs)**, **depășește 10^25**.
>
> 3. Comisia adoptă acte delegate pentru a actualiza thresholds + benchmark-uri.

**Cui se aplică:** Provider GPAI.

**Ce trebuie făcut concret:**
1. **Monitor FLOP** — instrumentare antrenare.
2. **Notificare Comisiei în 2 săptămâni** dacă atingeți threshold (art. 52).
3. **Pregătire pentru obligații art. 55** (cele sistemice).

**Deadline:** **2 august 2025**.
**Status:** **DA — executoriu acum** pentru modele introduse pe piață după 2 aug 2025.

**Sancțiune:** Art. 101 — **€15M sau 3% turnover global**.

**Featurization SaaS:** **GPAI FLOP Calculator** + **Systemic Risk Alert**.

**URL:** https://artificialintelligenceact.eu/article/51/

---

## Art. 52 — Procedure for Classification

**Text legal:** Provider GPAI ce îndeplinește criteriul art. 51(2) — **notifică Comisia fără întârziere și în orice caz în 2 săptămâni** de la îndeplinirea cerinței. Provider poate prezenta argumente pentru nereclasificare (proba contrară). Comisia decide în 6 luni.

**Cui se aplică:** Provider GPAI cu modele >10^25 FLOP.

**Ce trebuie făcut concret:**
1. **Tracking FLOP** continuu în antrenare.
2. **2-week notification procedure** redactată.
3. **Justificare scrisă** pentru cazul invocării non-systemic.

**Deadline:** **2 august 2025**.
**Status:** **DA**.

**Sancțiune:** Art. 101.

---

## Art. 53 — Obligations for Providers of GPAI Models

**Text legal (sinteză):** Providerii GPAI trebuie:
- (a) **redactare și menținere tech doc** (incl. proces antrenare, evaluare) — disponibilă la cererea AI Office;
- (b) **transparency information** către downstream AI providers — info detaliată pentru a permite înțelegerea capabilităților + limitărilor modelului + integrare în propriile sisteme. Conține elemente Anexa XII.
- (c) **politică de copyright compliance** — respectarea rezervărilor de drepturi (Directive (UE) 2019/790 Art. 4(3));
- (d) **publicarea unui rezumat al conținutului utilizat pentru antrenare** — folosind template AI Office.

**Excepție**: modele lansate sub **licență liberă și open-source** cu parametri publici **NU intră sub (a) și (b)**, **EXCEPȚIE**: modele cu risc sistemic.

Compliance prin **codes of practice** (interim) sau **harmonised standards** (long-term).

**Cui se aplică:** Provider GPAI.

**Ce trebuie făcut concret:**
1. **Tech doc GPAI** (model card extins).
2. **Transparency package** pentru downstream (input cap, modalități, limitări).
3. **Copyright policy + opt-out crawler honoring**.
4. **Training data summary** — public.
5. **Code of Practice signing** (semnați acum pentru safe harbour).

**Deadline:**
- Modele introduse după 2 aug 2025: **DA — executoriu acum**.
- Modele legacy (pre-2 aug 2025): **2 august 2027**.

**Sancțiune:** Art. 101 — €15M/3%.

**Cross-reference:** Directive 2019/790 (Copyright DSM).

**Featurization SaaS:**
- **Model Card Generator GPAI** (Hugging Face + AI Act-aligned).
- **Downstream Transparency Sheet** export.
- **Copyright Opt-out Honoring Checker** (robots.txt, TDM Reservation Protocol).
- **Training Data Summary Wizard** cu template AI Office.

**URL:** https://artificialintelligenceact.eu/article/53/

---

## Art. 54 — Authorised Representatives of GPAI Providers

Providerii GPAI non-UE desemnează **reprezentant autorizat în UE** în scris, **înainte** de placing on market. Reprezentantul: cooperează cu AI Office, păstrează doc 10 ani, verifică obligațiile.

**Deadline:** **2 august 2025**.
**Sancțiune:** Art. 101.

**Featurization SaaS:** **GPAI Auth Rep Directory**.

---

## Art. 55 — Obligations for Providers of GPAI Models with Systemic Risk

**Text legal:** Pe lângă art. 53, providerii GPAI cu risc sistemic:
- (a) **model evaluation** conform standarde state-of-the-art, **incl. red-teaming/adversarial testing** pentru identificare/mitigare risc sistemic;
- (b) **evaluează și atenuează posibile riscuri sistemice la nivel UE**, incl. surse din dezvoltare/placing on market/utilizare;
- (c) **track, document, raport** **serious incidents** + **corrective measures** la AI Office + autorități naționale (timeline analog art. 73);
- (d) **adecvată cybersecurity** pentru model + infrastructură fizică.

Compliance prin **Codes of Practice** (până la standarde armonizate) sau echivalent aprobat de Comisie.

**Cui se aplică:** Provider GPAI cu risc sistemic (≥10^25 FLOP sau desemnat de Comisie).

**Ce trebuie făcut concret:**
1. **State-of-the-art evaluation framework** (MMLU, MMLU-Pro, AILuminate, BBH, etc.).
2. **Red-team intern + extern**.
3. **Systemic risk register**: misuse (CBRN, cyber offense), loss of control, manipulation at scale.
4. **Mitigation by design**: safety training (RLHF, Constitutional AI), refusal mechanisms.
5. **Incident reporting**: same timelines as art. 73 (15 zile / 2 zile / 10 zile).
6. **Cybersecurity**: SOC, model weights protection (cold storage, HSM).

**Deadline:**
- Modele după 2 aug 2025: **DA**.
- Legacy: **2 august 2027**.

**Sancțiune:** Art. 101 — €15M/3%.

**Cross-reference:** Code of Practice on GPAI (semnat de Anthropic, Google, OpenAI, Mistral, etc. în iulie 2025).

**Featurization SaaS:**
- **Systemic Risk Register** templates.
- **Eval Harness Integration** — link-uri către lm-eval-harness, big-bench.
- **Red-Team Coordinator** — workflow extern auditori.
- **Cyber Maturity Score** specific GPAI.
- **Code of Practice Tracker** — auto-mapping art. 55 obligations.

**URL:** https://artificialintelligenceact.eu/article/55/

---

## Art. 56 — Codes of Practice

AI Office facilitează **Codes of Practice** la nivel UE pentru implementarea art. 53, 55. **Multi-stakeholder** (providers, downstream, civil society, academia). Compliance cu Code → **presumed compliance** până la standarde.

**Status:** **Code of Practice for GPAI semnat în iulie 2025**. Disponibil pe site-ul Comisiei.

**Featurization SaaS:** **Code of Practice Mapper** — bifează obligațiile + uploadează evidence.

---

# CAPITOLUL VI — MĂSURI ÎN SPRIJINUL INOVĂRII

## Art. 57 — AI Regulatory Sandboxes

**Text legal:**
> 1. Statele membre asigură că autoritățile competente stabilesc **cel puțin un AI regulatory sandbox la nivel național** până la **2 august 2026**.
>
> 2. Sandbox = mediu controlat ce **foster inovarea + facilitează dezvoltarea/testarea AI** înainte de placing on market, sub supervizare regulatorie.
>
> 3. Providerii ce respectă **planul sandbox-ului + ghiduri autoritate** beneficiază: **NU se impun amenzi administrative** pentru încălcări AI Act detectate în sandbox. Liability față de terți rămâne.
>
> 4. La final, autoritatea emite **exit report** + dovadă scrisă — utilizabilă pentru a accelera **conformity assessment**.
>
> 5. **IMM + startup**: acces prioritar, **gratuit**.

**[POST-OMNIBUS]:** **Sandbox la nivel UE** + acces extins pentru mid-cap.

**Cui se aplică:** Provider AI (în special IMM/startup).

**Ce trebuie făcut concret:**
1. **Aplicare la sandbox-ul național** (ANCOM/ADR în RO — TBD).
2. **Plan de testare** documentat.
3. **Cooperare cu autoritatea**.
4. **Documentare exit report** ca evidence pentru CE marking.

**Deadline:** **2 august 2026** (operațional).
**Status:** Pregătire — în RO, **Autoritatea pentru Digitalizarea României (ADR)** lansează sandbox H2 2026.

**Sancțiune:** N/A (e mecanism de protecție).

**Featurization SaaS:**
- **Sandbox Application Helper** — completare formular ADR.
- **Test Plan Generator**.
- **Exit Report Builder**.

**URL:** https://artificialintelligenceact.eu/article/57/

---

## Art. 58-63 — Real-World Testing, SME Support

- **Art. 58:** **Real-world testing outside sandbox** — permis cu plan aprobat de autoritate + consimțământ informat al participanților + garanții (insurance, suspendare la risc).
- **Art. 59:** **Processing personal data** în sandbox pentru AI de interes public — permis sub garanții.
- **Art. 60:** **Real-world testing HRAIS** — restricționat: scop legitim, perioadă maxim 6 luni (extensibilă), consimțământ informat, drept de retragere.
- **Art. 61:** **Informed consent** pentru participanți la testare.
- **Art. 62:** **Măsuri pentru providerii IMM și startups** — acces sandbox gratuit, training, suport.
- **Art. 63:** **Derogări proceduri specifice** pentru micro-entreprise.

**Featurization SaaS:** **SME Innovation Toolkit** — pachet integrat sandbox + real-world testing + consent management.

---

# CAPITOLUL VII — GUVERNANȚĂ

## Art. 64 — AI Office

**Text legal:** Comisia dezvoltă expertiză și capabilități UE în AI prin **AI Office**. Statele Membre facilitează tasks-urile AI Office.

**Rol practic (post-Omnibus, întărit):**
- Supervisor de facto pentru **GPAI**.
- **Investigații + sancțiuni** pentru providers GPAI (art. 88-94).
- **Code of Practice facilitator**.
- **Guidance + ghiduri**.
- **Coordonare** cu autorități naționale.

**Deadline:** **2 august 2025** — operațional.
**Status:** **DA — operațional**. Director: Lucilla Sioli. Sediu: Bruxelles.

**Featurization SaaS:** **AI Office Communication Hub** — primire scrisori AI Office + răspuns asistat.

---

## Art. 65-69 — European AI Board, Advisory Forum, Scientific Panel

- **Art. 65:** **European Artificial Intelligence Board** — reprezentanți Statelor Membre.
- **Art. 66:** Sarcini Board: armonizare implementare, opinii, ghiduri.
- **Art. 67:** **Advisory Forum** — multi-stakeholder (industrie, academia, civil society).
- **Art. 68:** **Scientific Panel of Independent Experts** — alertare GPAI systemic risk.
- **Art. 69:** Acces la pool de experți pentru Statele Membre.

**Featurization SaaS:** **Stakeholder Monitor** — opinii Board, recomandări Forum, alerte Scientific Panel.

---

## Art. 70 — National Competent Authorities

**Text legal:** Fiecare Stat Membru desemnează **min. o notifying authority + min. o market surveillance authority** ca **autorități naționale competente**. Operare **independentă, imparțială, fără bias**. Resurse adecvate (staff cu expertiză AI, GDPR, cybersecurity, drepturi fundamentale).

**Public disclosure** date contact până la **2 august 2025**. Single point of contact desemnat.

**În România:**
- **Single point of contact:** Autoritatea pentru Digitalizarea României (ADR) [PROBABIL — în lucru].
- **Market surveillance:** ANCOM pentru telecom, ANSPDCP overlap pentru GDPR-AI, ANRE pentru energy, ASF pentru insurance/credit. [STATUS: OUG transpunere în Parlament].

**Deadline:** **2 august 2025**.
**Status:** **Partial DA** — autoritățile sunt desemnate, formalizare în lucru.

**Featurization SaaS:** **National Authority Directory** — quick reference UE-27, contact, jurisdicție per sector.

**URL:** https://artificialintelligenceact.eu/article/70/

---

## Art. 71 — EU Database for HRAIS

**Text legal:**
> 1. Comisia, în colaborare cu Statele Membre, **stabilește și menține o bază de date UE** ce conține info din par. 2-4 privind HRAIS din art. 6(2) — Anexa III — și HRAIS art. 6(3) considerate non-HRAIS.
>
> 2. Providers/reprezentanți autorizați înregistrează info din **Anexa VIII Sec. A + B**.
>
> 3. Deployer-i ce sunt **autorități publice / agenții UE** înregistrează info din **Sec. C**.
>
> 4. **Public access** la info — user-friendly + machine-readable.
> EXCEPȚIE: real-world testing info — doar autorităților.
>
> 5. Doar **date personale strict necesare** — nume + contact reprezentanți.
>
> 6. **Comisia = controller** sub GDPR.
>
> 7. Suport tehnic-administrativ pentru providers/deployers.

**Cui se aplică:** Provider HRAIS + Deployer public.

**Ce trebuie făcut concret:**
1. Cont EU Database.
2. Formular Anexa VIII complet.
3. Update la modificare.

**Deadline:** **2 decembrie 2027**.
**Sancțiune:** Art. 99(5) — €7.5M/1% pentru info incorectă.

**Featurization SaaS:** **EU Database Sync Module** — single source of truth în SaaS, push automat în EU DB.

**URL:** https://artificialintelligenceact.eu/article/71/

---

## Art. 72 — Post-Market Monitoring

**Text legal:**
> 1. Providers HRAIS stabilesc **sistem documentat de monitorizare post-market** proporțional cu natura tehnologiei + riscuri.
>
> 2. Sistemul **colectează activ și sistematic** date relevante despre **performanța HRAIS** pe durata de viață și permite providerului să **evalueze conformitatea continuă** cu Sec. 2.
>
> 3. Sistemul bazat pe **post-market monitoring plan**, parte din tech doc (Anexa IV).
>
> 4. Comisia emite **template plan** până la **2 februarie 2026**.

**Cui se aplică:** Provider HRAIS.

**Ce trebuie făcut concret:**
1. **Plan PMS** redactat înainte de placing on market.
2. **Metrici colectate**: performance metrics, drift, user feedback, incidents.
3. **Review periodic** (lunar/trimestrial).
4. **Acțiune corectivă** automată la trigger.

**Deadline:** **2 decembrie 2027**.

**Sancțiune:** Art. 99(4).

**Cross-reference:** MDR Art. 83-86 (PMS medical).

**Featurization SaaS:**
- **PMS Dashboard live** — KPI HRAIS post-deployment.
- **Drift + Performance Monitoring**.
- **Auto-trigger corrective action workflow**.

**URL:** https://artificialintelligenceact.eu/article/72/

---

## Art. 73 — Reporting of Serious Incidents

**Text legal:**
> 1. Providers HRAIS introduși pe piața UE raportează **serious incidents** la market surveillance authority unde a apărut incidentul.
>
> 2. Raport **fără întârziere nejustificată** după ce provider stabilește **legătură cauzală** sau probabilitate rezonabilă.
>
> Timeline:
> - **Standard: max 15 zile** după conștientizare.
> - **Incident widespread sau severe: max 2 zile**.
> - **Deces: max 10 zile**.
>
> 3. **Initial report** permis (incomplete) urmat de **complete report** când întârzierea ar fi prejudiciabilă.
>
> 4. Post-raportare: investigație + risk assessment + acțiuni corective + cooperare autoritate. **NU modifica HRAIS** într-un mod ce ar afecta evaluarea cauzelor înainte de informare autoritate.
>
> 5. Pentru HRAIS care sunt deja sub regimuri de incident reporting sectorial (medical, finance) — doar incidentele art. 3(49) lit. (c) (afectare drepturi fundamentale) trebuie raportate suplimentar.
>
> 7. Market surveillance authority ia măsuri în **max 7 zile** post-notificare.

**Definiție "serious incident" (art. 3(49)):**
- (a) **decesul** unei persoane sau **prejudiciu serios sănătății**;
- (b) **disrupție serioasă și ireversibilă** a managementului critical infrastructure;
- (c) **încălcarea obligațiilor UE protejând drepturi fundamentale**;
- (d) **prejudiciu serios proprietății sau mediului**.

**Cui se aplică:** Provider HRAIS + Deployer (notificare provider obligatorie).

**Ce trebuie făcut concret:**
1. **Incident response playbook**: definiții, threshold-uri, escalation tree.
2. **24/7 hotline** sau echivalent.
3. **Template raportare** market surveillance (per Stat Membru).
4. **Post-incident analysis** + corrective.
5. **NO MODIFY** rule — log "frozen" până la notificare.

**Deadline:** **2 decembrie 2027**.

**Sancțiune:** Art. 99(4) — €15M/3%.

**Cross-reference:**
- GDPR Art. 33-34 (data breach).
- NIS2 Art. 23 (cybersecurity incidents).
- DORA Art. 19 (ICT incidents).
- MDR Art. 87-92 (medical device vigilance).

**Featurization SaaS:**
- **Incident Manager unificat** AI + GDPR + NIS2 + DORA.
- **Timer integrat** — calculator timeline raportare (2/10/15 zile).
- **Auto-template** per autoritate națională.
- **Freeze State** — buton "freeze for forensics" cu confirm.
- **Multi-jurisdiction reporting** — un click → 27 autorități.

**URL:** https://artificialintelligenceact.eu/article/73/

---

## Art. 74-94 — Market Surveillance, EU/Member State Cooperation

### Art. 74 — Market surveillance
- HRAIS = supuse Regulamentului (UE) 2019/1020 (market surveillance).
- Market surveillance authorities pot **accesa tech doc, code source, training data** (proportional).
- **Powers**: cere info, inspecții, sample, recall, retragere, sanctioning.

### Art. 75 — Mutual assistance
- Cooperare între autorități + AI Office.

### Art. 76 — Supervision testing real-world.

### Art. 77 — Powers of authorities protecting fundamental rights.

### Art. 78 — Confidentiality
- Trade secrets, source code, IP — protejate.

### Art. 79 — Procedure for AI systems presenting risk
- Authority constată risc → cere provider să ia măsuri în **15 zile** + informare alte Statele Membre.

### Art. 80 — AI systems non-conforming HRAIS clasification (art. 6(3) abused)
- Authority cere reclasificare + măsuri.

### Art. 81 — Union safeguard procedure
- Conflict între Statele Membre → Comisia decide.

### Art. 82 — Conformity but presenting risk
- Authority poate restricționa AI conform dar care prezintă risc.

### Art. 83 — Formal non-compliance
- E.g., CE marking lipsă, EU DoC lipsă → corectare.

### Art. 84 — Union AI Testing Support Structures
- Comisia desemnează independent expert facilities.

### Art. 85 — Right to lodge a complaint
- Orice persoană naturală sau juridică poate **depune plângere** la market surveillance.

### Art. 86 — Right to explanation
- Persoanele afectate de decizii HRAIS au **drept la explicație clară + semnificativă** privind rolul HRAIS în decizie + elementele principale ale deciziei.
- Aplicabil **deplașat**: decizii cu efecte legale sau similar semnificative.

### Art. 87 — Reporting of breaches by whistleblowers
- Aplicabil Directive (UE) 2019/1937 (whistleblower) la încălcări AI Act.

### Art. 88-94 — Supervision of GPAI providers de către AI Office
- AI Office investighează, cere doc, audituri, evaluări, impună amenzi (art. 101).

**Featurization SaaS:**
- **Authority Inspection Readiness Kit**.
- **Right-to-Explanation Engine** — auto-generare explicații per decizie.
- **Whistleblower Channel** integrat (overlap cu obligația GEW Directive 2019/1937).
- **GPAI Audit Tracker**.

---

# CAPITOLUL XII — SANCȚIUNI

## Art. 99 — Penalties (Sancțiuni)

**Text legal:**
> 1. Statele Membre stabilesc reguli privind sancțiuni + alte măsuri (incl. avertismente non-monetare). Sancțiuni **efective, proporționale, disuasive**.
>
> 2. **Comisia + AI Office** au competențe asupra GPAI (art. 101).
>
> 3. **TIER 1 — Practici interzise (art. 5)**:
> Până la **€35.000.000** SAU, dacă este întreprindere, **până la 7% din cifra de afaceri anuală totală mondială** pentru exercițiul financiar precedent, **whichever is higher**.
>
> 4. **TIER 2 — Alte încălcări obligații**:
> - Provider obligații (art. 16);
> - Reprezentant autorizat (art. 22);
> - Importer (art. 23);
> - Distribuitor (art. 24);
> - Deployer (art. 26);
> - Notified body (art. 31, 33(1), (3), (4), 34);
> - Provider obligații transparency (art. 50).
>
> Până la **€15.000.000** SAU **3% turnover global**, whichever higher.
>
> 5. **TIER 3 — Furnizare info incorectă/incompletă/înșelătoare** la notified body sau autorități:
> Până la **€7.500.000** SAU **1% turnover**, whichever higher.
>
> 6. **IMM + startup**: amenda = **cel mai mic** dintre procentaj și suma fixă.
>
> 7. La calculul amenzii, autoritatea consideră: severitate, durată, persoane afectate, prior, mărime, beneficiu financiar, cooperare, intenție.

**Cui se aplică:** Toți operatorii.

**Deadline:** **2 august 2025** — în vigoare pentru art. 5 și GPAI.
**Status executoriu acum:** **DA**.

**Cross-reference:** GDPR Art. 83 (4% turnover sau €20M); NIS2 Art. 34 (€10M/2%); DORA Art. 50.

**Featurization SaaS:**
- **Penalty Calculator** — input: turnover + tipul încălcării → output: range amendă.
- **Risk Exposure Heatmap** — financial impact per non-compliance.
- **SME Modifier** — automat aplică art. 99(6).

**URL:** https://artificialintelligenceact.eu/article/99/

---

## Art. 100 — Administrative Fines on Union Institutions, Bodies, Offices, Agencies

**EDPS** impune sancțiuni instituțiilor UE:
- **Practici interzise: până la €1.500.000**.
- **Alte obligații: până la €750.000**.

**Featurization SaaS:** **Public Sector Calculator** — special pentru autorități publice.

---

## Art. 101 — Fines for Providers of GPAI Models

**Text legal:**
> Comisia poate impune amenzi providers GPAI până la **3% turnover anual global SAU €15.000.000**, whichever higher, dacă cu intenție sau neglijență:
> (a) **încalcă prevederile aplicabile** ale acestui regulament;
> (b) **nu se conformează** unei cereri de info/doc art. 91 sau furnizează info incorectă/incompletă;
> (c) **nu se conformează** unei măsuri cerute art. 93;
> (d) **nu acordă acces** Comisiei la modelul GPAI pentru **model evaluation** (art. 92).

**Procedura**: Comisia comunică **preliminary findings** + drept la audiere. CJUE poate revedea/reduce/crește.

**Cui se aplică:** Provider GPAI.

**Deadline:** **2 august 2026** (mecanism de enforcement formal).
**Status:** **Cadrul există acum**, AI Office gata să sancționeze.

**Featurization SaaS:** **GPAI Enforcement Tracker** — monitorizare decizii AI Office, precedente.

**URL:** https://artificialintelligenceact.eu/article/101/

---

# CAPITOLUL IX — DISPOZIȚII FINALE

## Art. 113 — Entry into Force and Application

**Text legal (versiunea consolidată post-Omnibus mai 2026):**

> Prezentul regulament intră în vigoare a **20-a zi** după publicarea în OJEU (= **1 august 2024**).
>
> Se aplică **de la 2 august 2026**, cu următoarele excepții:
> (a) **Capitolul I (General Provisions)** și **Capitolul II (Prohibited Practices)** se aplică de la **2 februarie 2025**;
> (b) **Capitolul III Secțiunea 4** (Notifying Authorities), **Capitolul V** (GPAI), **Capitolul VII** (Governance), **Capitolul XII** (Penalties — fără art. 101), **Articolul 78** (Confidentiality) — se aplică de la **2 august 2025**;
> (c) **Articolul 6(1)** și obligațiile corespunzătoare — se aplică de la **2 august 2027** (versiunea ORIGINALĂ).

**MODIFICĂRI OMNIBUS MAI 2026 [CONFIRMAT]:**

> - **Art. 6(2) + Anexa III** (HRAIS stand-alone): aplicabilitate amânată de la **2 august 2026** la **2 decembrie 2027**.
> - **Art. 6(1) + Anexa I** (HRAIS embedded în produse reglementate): aplicabilitate amânată de la **2 august 2027** la **2 august 2028**.
> - **Art. 50** (transparency / watermarking): aplicabilitate amânată de la **2 august 2026** la **2 decembrie 2026**.
> - **Art. 5 (i)** (nudifier/CSAM): introdus, aplicabilitate **2 decembrie 2026**.
> - **Grandfathering**: sisteme introduse pe piață înainte de noile date sunt exceptate, **cu excepția** modificărilor substanțiale ulterioare.

**Tabel consolidat aplicabilitate post-Omnibus:**

| Articol/Capitol | Original | Post-Omnibus | Executoriu 16 mai 2026 |
|---|---|---|---|
| Cap. I (art. 1-4) | 2 feb 2025 | Idem | ✅ DA |
| Cap. II (art. 5 a-h) | 2 feb 2025 | Idem | ✅ DA |
| Art. 5(i) nudifier/CSAM | N/A | 2 dec 2026 | ⏳ NU |
| Cap. V GPAI noi (art. 51-56) | 2 aug 2025 | Idem | ✅ DA |
| Cap. V GPAI legacy | 2 aug 2027 | Idem | ⏳ NU |
| Cap. VII Governance | 2 aug 2025 | Idem | ✅ DA |
| Cap. XII Penalties (art. 99 pentru art. 5) | 2 aug 2025 | Idem | ✅ DA |
| Art. 50 Transparency | 2 aug 2026 | **2 dec 2026** | ⏳ NU |
| HRAIS Anexa III (art. 6(2) + 8-15, 16-22, 26-27, 49) | 2 aug 2026 | **2 dec 2027** | ⏳ NU |
| HRAIS Anexa I (art. 6(1)) | 2 aug 2027 | **2 aug 2028** | ⏳ NU |
| Art. 57 sandbox | 2 aug 2026 | Idem | ⏳ NU |
| Art. 101 GPAI fines mechanism | 2 aug 2026 | Idem | ⏳ NU (în vigoare anul viitor) |

**Featurization SaaS:**
- **Deadline Tracker Live** — countdown per articol, alert pe email.
- **Grandfathering Detector** — sistem introdus pre-deadline + verificare modificare substanțială.
- **Roadmap Generator** — output: plan personalizat 18-24 luni pentru fiecare client.

**URL:** https://artificialintelligenceact.eu/article/113/

---

# ANEXELE

## Anexa I — Lista produselor sectoriale reglementate (Section A: New Legislative Framework; Section B: Other Union Harmonisation Legislation)

**Section A** (24 acte):
- Reg. (CE) 300/2008 — aviation security
- Directiva 2006/42/CE — Machinery (înlocuit cu Reg. (UE) 2023/1230)
- Directiva 2014/33/UE — Lifts
- Directiva 2014/34/UE — ATEX
- Directiva 2014/53/UE — Radio Equipment
- Directiva 2014/68/UE — Pressure Equipment
- Reg. (UE) 2016/424 — Cableway installations
- Reg. (UE) 2016/425 — PPE
- Reg. (UE) 2016/426 — Gas appliances
- Reg. (UE) 2017/745 — Medical Devices (MDR)
- Reg. (UE) 2017/746 — In Vitro Diagnostic (IVDR)
- Directiva 2009/48/CE — Toys
- Etc.

**Section B** (transport, alte sectoare):
- Reg. (CE) 78/2009 — pedestrian safety motor vehicles
- Reg. (UE) 167/2013 — agricultural vehicles
- Reg. (UE) 168/2013 — motorcycles
- Reg. (UE) 2018/858 — motor vehicles type-approval
- Reg. (UE) 2019/2144 — vehicle safety
- Reg. (UE) 2018/1139 — civil aviation
- Reg. (UE) 2016/797 — railway interoperability

**Practical impact:** AI ca safety component într-un produs Anexa I = **HRAIS automat** (Art. 6(1)).

**[POST-OMNIBUS]:** AI în mașini industriale (Machinery Reg.) **exceptat** de la HRAIS dedicat — doar cadrul sectorial.

**Featurization SaaS:** **Sectoral Matcher** — input: tipul produsului → output: directive aplicabile + obligații overlap.

---

## Anexa II — Criminal offences criteria (art. 5(1)(h) — biometric in law enforcement)

Lista infracțiunilor pentru care biometric identification în public, în timp real, de law enforcement, este permisă (cu autorizație judiciară):
- Terorism
- Trafic de persoane
- Exploatare sexuală copii
- Trafic ilicit droguri / arme / muniție
- Omor calificat, vătămare corporală gravă
- Trafic organe
- Răpire / sechestrare / luare ostatici
- Etc. (+15 infracțiuni)

**Min. pedeapsă custodială: 4 ani.**

---

## Anexa III — Cele 8 categorii High-Risk

**1. Biometrie:**
- (a) Remote biometric identification (excl. verification pur);
- (b) Categorizare biometrică pe atribute sensibile (NU practici interzise art. 5);
- (c) Emotion recognition.

**2. Critical infrastructure:**
- Safety components ale managementului/operării: digital infrastructure, traffic road, water/gas/heating/electricity supply.

**3. Education and vocational training:**
- (a) Acces / admission / assignment la instituții educație;
- (b) Evaluare learning outcomes (incl. la teste);
- (c) Evaluare level educație adecvat;
- (d) Monitoring student behavior la teste (cheating detection).

**4. Employment, workers management:**
- (a) Recruitment / selection: targeted job advertising, screening CV, evaluare candidați;
- (b) Decizii afectând relația muncă: promovare, terminare, alocare task, monitorizare performanță, comportament.

**5. Acces la servicii esențiale, beneficii publice și private:**
- (a) Eligibilitate beneficii publice asistență (sănătate, sociale);
- (b) **Creditworthiness** evaluation + credit scoring (EXCEPȚIE: detectare fraudă financiară);
- (c) **Insurance** risk assessment + pricing pentru viață și sănătate;
- (d) Dispecerizare prioritate emergency (calls clasificare).

**6. Law enforcement:**
- (a) Risk assessment victimizare / re-victimizare;
- (b) Polygraph / detecție stare emoțională;
- (c) Evaluare fiabilitate evidence;
- (d) Profiling în prevenire / investigare / detecție / prosecuție / executare sentințe;
- (e) Crime analytics / profiling pentru investigare.

**7. Migration, asylum, border control:**
- (a) Polygraph;
- (b) Risk assessment securitate / health / migrație ilegală pentru persoane intrând;
- (c) Examinare asylum / vize / permise reședință;
- (d) Detecție / recunoaștere / identificare persoane (cu excepția travel documents verification).

**8. Administration of justice and democratic processes:**
- (a) AI assist autorități judiciare în research/interpretare fapte și lege;
- (b) AI pentru a **influența rezultate alegeri / referendum sau voting behavior** (EXCEPȚIE: administrative tools campaign).

**Featurization SaaS:** **Annex III Classifier** — guided 8-category questionnaire cu auto-tagging HRAIS.

---

## Anexa IV — Technical Documentation (referit în Art. 11(1))

**9 secțiuni obligatorii:**

1. **General description**: scop propus, nume, versiuni, interactions hw/sw, distribuție, ui.
2. **Detailed description elementelor sistem + dezvoltare**:
   - Metode + pași de dezvoltare;
   - Design specs, **general logic + algorithmi**;
   - Arhitectură sistem;
   - **Data requirements**: dataset descriptions (training/validation/testing), provenance, labelling, cleaning;
   - **Human oversight assessment**;
   - Predetermined changes;
   - **Validation + testing**: metrici, accuracy, robustness, fairness, cybersecurity.
3. **Monitoring, functioning, control**: capabilități + limitări, accuracy per grup, output unintended, discrimination risk, oversight tehnic.
4. **Performance metrics + adecvare**.
5. **Risk management system** (art. 9).
6. **Lifecycle changes**.
7. **Standards aplicate** (sau soluții alternative).
8. **EU Declaration of Conformity** (copy, art. 47).
9. **Post-market monitoring system** (art. 72).

**SME — formular simplificat** (Comisia publică 2026).

**Featurization SaaS:** **Anexa IV Builder** — wizard 9-section cu auto-aggregation din alte module (data, risk, post-market).

---

## Anexa V — EU Declaration of Conformity (DoC) — Conținut

EU DoC trebuie să conțină:
1. Nume + tip HRAIS + cod identificare unic.
2. Nume + adresă provider (+ reprezentant autorizat, dacă cazul).
3. Declarare că EU DoC este emisă pe **responsabilitate exclusivă provider**.
4. Declarare că **HRAIS respectă** regulamentul AI Act + alte legi UE aplicabile.
5. Referințe la standarde armonizate / common specifications utilizate.
6. Dacă cazul: numele + ID notified body + descriere procedura conformity assessment + referință certificate.
7. Loc + dată emitere + nume + funcție + semnătură.

**Featurization SaaS:** **EU DoC Generator** — PDF cu toate câmpurile + e-signature.

---

## Anexele VI și VII — Conformity Assessment Procedures

### Anexa VI — Internal Control
- Provider verifică intern QMS + tech doc + monitorizare.
- **Fără notified body**.
- Aplicabil HRAIS Anexa III pct. 2-8.

### Anexa VII — Conformity Assessment Based on Assessment of QMS + Tech Doc
- Notified body **examinează QMS** + tech doc.
- Emite **EU Technical Documentation Assessment Certificate** (valabil **max. 4-5 ani**).
- Aplicabil HRAIS Anexa III pct. 1 (biometric) când standarde lipsesc/parțiale.

**Featurization SaaS:** **CA Workflow** — alegere automată Anexa + plan timeline + cost estimator.

---

## Anexa VIII — Information for Registration in EU Database

**Section A (provider HRAIS):**
- Nume, adresă, datele de contact.
- Reprezentant autorizat (dacă).
- Detalii HRAIS: nume comercial, descriere scop propus, componente AI, location servere, status sistem (introducere piață, etc.).

**Section B (provider invocând excepția art. 6(3)):**
- Justificare scrisă a excepției + categoria Anexa III.

**Section C (deployer public):**
- Nume autoritate + contact.
- Provider HRAIS utilizat.
- Sumar utilizare + ce decizie informează.
- FRIA sumar (dacă cazul).

**Featurization SaaS:** **EU Database Sync** — same as Art. 71.

---

## Anexa IX — Excepție introducere pe piață pentru motive excepționale (art. 46)

Autoritatea poate autoriza temporar (max 12 luni) un HRAIS fără conformity assessment complet pentru **motive excepționale**: ordine publică, sănătate publică, protecție mediu, infrastructure critică, viață umană.

---

## Anexa X — Acte legislative UE pe scale informatic large (privind biometric)

Lista bazelor de date UE: SIS II, VIS, EURODAC, EES, ETIAS, ECRIS-TCN.

---

## Anexa XI — Technical Documentation for GPAI Providers (referit Art. 53)

Informații despre GPAI model în tech doc:
1. **General description**: tasks, integrare în alte sisteme, policies utilizare, licență, arhitectură.
2. **Detalii proces antrenare**: arhitectură tehnică, parametri, design choices.
3. **Date training**: tip + provenance, curation, dimensiune, bias detection, copyright opt-out.
4. **Compute consumption**.
5. **Energy consumption** (cunoscut).
6. **Modalități + format intrări/ieșiri**.

---

## Anexa XII — Transparency Information for Downstream Providers (referit Art. 53(1)(b))

Provider GPAI furnizează downstream:
1. Descriere generală: capabilități, limitări, scopuri tipice, format/modalități, licență.
2. Documentație tehnică suficientă: descrierea procesului antrenare, evaluation, performance, limitations.

---

## Anexa XIII — Criterii pentru desemnarea GPAI cu Systemic Risk (referit Art. 51(2))

Criterii (alături de threshold-ul 10^25 FLOPs):
- Numărul de parametri ai modelului.
- Calitate și dimensiune dataset.
- Cantitate compute training.
- Modalități input/output.
- Benchmark-uri + capabilități.
- Reach (utilizatori, downstream integration).
- Înregistrare downstream providers.

---

# CROSS-REFERENCE MASTER TABLE — AI Act vs alte cadre

| Obligație AI Act | GDPR | NIS2 | DORA | CRA | Direct conflict / Overlap |
|---|---|---|---|---|---|
| **Art. 4 AI Literacy** | Art. 39(b) DPO training | Art. 20 cybersec training | Art. 13(6) ICT training | — | Programe integrate |
| **Art. 5 prohibited practices** | Art. 9 sensitive data; Art. 22 automated decisions | — | — | — | Coexistență |
| **Art. 9 Risk Management** | Art. 35 DPIA | Art. 21 risk mgmt | Art. 9 ICT risk | Art. 13 risk assessment | Unified register recomandat |
| **Art. 10 Data Governance** | Art. 5, 9, 25, 32 | — | Art. 14 data | — | GDPR primary; AI Act overlay |
| **Art. 12 Logging** | Art. 30 records | Art. 21(2)(g) logging | Art. 28 logs | — | Single log infra |
| **Art. 13 Transparency** | Art. 13/14 | — | — | — | Notify-once principle |
| **Art. 14 Human Oversight** | Art. 22 right not to be subject | — | — | — | DPIA + FRIA integrate |
| **Art. 15 Cybersecurity** | Art. 32 | Art. 21 | Art. 9 | All | OWASP for ML |
| **Art. 26-27 Deployer + FRIA** | Art. 35 DPIA | — | Art. 28 third-party | — | DPIA+FRIA merger |
| **Art. 50 Transparency synthetic** | Art. 13/14 | — | — | — | DSA Art. 35 deepfake |
| **Art. 73 Incident reporting** | Art. 33-34 breach | Art. 23 incidents | Art. 19 ICT incidents | Art. 14 vuln disclosure | One-stop incident hub |

**Featurization SaaS:** **Unified Compliance Engine** — orchestrator multi-framework cu deduplicare evidence.

---

# RECOMANDĂRI STRATEGICE PENTRU SaaS COMPLIAI

## 1. Module imediat activabile (urgență MAXIMĂ)

| Modul | Articol | Justificare urgență |
|---|---|---|
| **AI Literacy Training Hub** | Art. 4 | Executoriu acum, sancțiune €15M/3% |
| **Prohibited Practices Scanner** | Art. 5 (a-h) | Executoriu acum, sancțiune €35M/7% |
| **AI Inventory + Role Classifier** | Art. 2, 3 | Foundation pentru orice altceva |
| **GPAI Compliance (pentru clienții cu modele proprii)** | Art. 51-55 | Executoriu pentru modele >10^25 FLOP din 2 aug 2025 |
| **Penalty Calculator** | Art. 99-101 | Vendor value-add imediat |

## 2. Module H2 2026 (pregătire pentru art. 50 + Art. 5(i))

| Modul | Articol | Deadline |
|---|---|---|
| **Synthetic Content Watermarking Helper** | Art. 50 | 2 dec 2026 |
| **Nudifier/CSAM Filter Compliance** | Art. 5(i) | 2 dec 2026 |
| **Chatbot Disclosure Templates** | Art. 50(1) | 2 dec 2026 |

## 3. Module 2027 (HRAIS readiness)

- **HRAIS Classifier** (art. 6, Anexa III)
- **Risk Management AI Module** (art. 9)
- **Data Governance Hub** (art. 10)
- **Anexa IV Technical Doc Builder** (art. 11)
- **AI Audit Log** (art. 12)
- **Instructions-for-Use Generator** (art. 13)
- **Human Oversight Designer** (art. 14)
- **Model Card + Adversarial Test Suite** (art. 15)
- **QMS Builder** (art. 17)
- **FRIA Wizard** (art. 27)
- **Conformity Assessment Wizard** (art. 43)
- **EU Database Sync** (art. 49, 71)
- **Post-Market Monitoring Dashboard** (art. 72)
- **Incident Manager** (art. 73)

## 4. Cross-framework features (concurential)

- **Unified Compliance Engine**: AI Act + GDPR + NIS2 + DORA + CRA în single source of truth.
- **Single Incident Hub** cu auto-routing pe framework + autoritate.
- **Authority Inspection Readiness Kit** — kit complet pentru inspecție surpriză.
- **Sectoral overlays**: medical, financial, public sector cu pre-config.

## 5. Diferențiatori vs concurență (SmartBill ManagerConta NU acoperă AI Act)

- Romanian-first content (UI + templates în română corect juridic).
- ADR sandbox auto-application.
- Local notified bodies directory.
- Pre-fill formulare cu CUI românesc.
- Generic Polish/German/Spanish copy = parity, dar Romanian-native = moat.

---

# SURSE & LINK-URI FINALE

| Sursa | URL |
|---|---|
| **EUR-Lex AI Act (EN, consolidat)** | https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1689 |
| **EUR-Lex AI Act (RO)** | https://eur-lex.europa.eu/legal-content/RO/TXT/?uri=CELEX:32024R1689 |
| **artificialintelligenceact.eu Explorer** | https://artificialintelligenceact.eu/ai-act-explorer/ |
| **Consilium press 7 mai 2026 (Omnibus)** | https://www.consilium.europa.eu/en/press/press-releases/2026/05/07/artificial-intelligence-council-and-parliament-agree-to-simplify-and-streamline-rules/ |
| **EP A10-0073/2026 (Digital Omnibus on AI)** | https://www.europarl.europa.eu/doceo/document/A-10-2026-0073_EN.html |
| **EC AI Act Page** | https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai |
| **AI Office** | https://digital-strategy.ec.europa.eu/en/policies/ai-office |
| **Code of Practice for GPAI (semnat iulie 2025)** | https://digital-strategy.ec.europa.eu/en/policies/contents-code-gpai |
| **CEN-CENELEC JTC 21 Standards** | https://www.cencenelec.eu/areas-of-work/cen-cenelec-topics/artificial-intelligence/ |
| **NIST AI RMF** | https://www.nist.gov/itl/ai-risk-management-framework |
| **ISO/IEC 42001 AI Management** | https://www.iso.org/standard/81230.html |

---

# DISCLAIMER JURIDIC

Acest document este o **analiză tehnică pentru implementare SaaS** și **NU constituie aviz juridic** în sensul art. 3 din Legea 51/1995 privind organizarea și exercitarea profesiei de avocat. Textul oficial obligatoriu este cel publicat în **Jurnalul Oficial al Uniunii Europene**, în limba română (https://eur-lex.europa.eu/legal-content/RO/TXT/?uri=CELEX:32024R1689). În caz de conflict între acest document și textul OJEU, prevalează OJEU.

**Modificările Digital Omnibus pe AI Act (acord politic 7 mai 2026)** sunt în așteptarea **publicării formale în OJEU** (estimat iulie 2026). Detaliile pot suferi modificări minore la votul final Parlament/Consiliu.

Verificați întotdeauna versiunea curentă la **EUR-Lex** și la **AI Act Service Desk** (https://digital-strategy.ec.europa.eu/en/policies/ai-act-service-desk) înainte de orice decizie operațională.

---

**Sfârșit document.**
**Versiune:** 1.0 — 16 mai 2026.
**Autor:** Analiză juridică CompliAI.
**Format:** Markdown.
