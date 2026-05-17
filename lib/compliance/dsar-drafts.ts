/**
 * GOLD 4 — Response draft generator per DSAR request type.
 * Generates a structured Romanian-language draft response template.
 * NOT legal advice — user must review and confirm before sending.
 */

import type { DsarRequestType } from "@/lib/compliance/types"

export type DsarDraft = {
  subject: string
  body: string
  legalBasis: string
  requiredActions: string[]
}

export type DsarProcessAsset = {
  id: string
  title: string
  summary: string
  content: string
}

export type DsarProcessPack = {
  title: string
  summary: string
  assets: DsarProcessAsset[]
  completionChecklist: string[]
}

const ARTICLE_MAP: Record<DsarRequestType, string> = {
  access: "Art. 15 GDPR",
  rectification: "Art. 16 GDPR",
  erasure: "Art. 17 GDPR",
  portability: "Art. 20 GDPR",
  objection: "Art. 21 GDPR",
  restriction: "Art. 18 GDPR",
}

export function generateDsarProcessPack(params: { orgName: string }): DsarProcessPack {
  const orgName = params.orgName.trim() || "Organizația"

  return {
    title: "Pachet minim DSAR",
    summary:
      "CompliRoAI pregătește procedura, registrul și playbook-ul minim. Clientul trebuie să desemneze responsabilul, să confirme circuitul real și să păstreze urma la dosar.",
    assets: [
      {
        id: "dsar-procedure",
        title: "Procedură DSAR",
        summary: "Flux minim pentru primire, verificare identitate, execuție și răspuns în termen.",
        content: `# Procedură DSAR — ${orgName}

## 1. Primirea cererii

- Cererea intră prin email, formular, poștă sau alt canal oficial.
- Toate cererile se înregistrează în registrul DSAR în ziua primirii.
- Se notează: data, persoana vizată, tipul cererii, canalul, ownerul intern.

## 2. Verificarea identității

- ${orgName} verifică identitatea solicitantului înainte de orice divulgare sau ștergere.
- Dacă identitatea nu este clară, se cere dovadă suplimentară și termenul se suspendă până la clarificare.

## 3. Clasificarea cererii

- Cererea se clasifică drept acces, rectificare, ștergere, portabilitate, opoziție sau restricționare.
- Se stabilește imediat dacă există sisteme, furnizori sau colegi care trebuie implicați.

## 4. Execuția internă

- Ownerul DSAR coordonează colectarea informațiilor din toate sistemele relevante.
- Pentru ștergere sau restricționare, ownerul notează explicit ce sisteme au fost afectate și ce excepții legale există.
- Pentru portabilitate, exportul trebuie pregătit într-un format structurat.

## 5. Răspunsul

- Răspunsul final se trimite în termenul legal aplicabil.
- Orice extindere de termen se documentează și se comunică persoanei vizate.

## 6. Dovada la dosar

- ${orgName} păstrează la dosar: registrul cazului, dovada verificării identității, răspunsul final și urmele de execuție relevante.

⚠️ Document de lucru pregătit de CompliRoAI. Necesită revizie și validare profesională înainte de folosire oficială.`,
      },
      {
        id: "dsar-register",
        title: "Registru DSAR",
        summary: "Model minim de registru pentru urmărirea termenelor și a stadiului fiecărei cereri.",
        content: `# Registru DSAR — ${orgName}

| ID caz | Data primirii | Persoană vizată | Tip cerere | Owner intern | Termen | Status | Sisteme afectate | Data răspunsului | Notă finală |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DSAR-001 | [completează] | [completează] | Acces / Ștergere / etc. | [completează] | [completează] | Primită / În lucru / Răspuns trimis | [completează] | [completează] | [completează] |

## Reguli de folosire

- Fiecare cerere primește un ID unic.
- Ownerul se setează în aceeași zi.
- Orice extindere de termen se notează cu motiv.
- La închidere se păstrează linkul sau referința către dovada finală.`,
      },
      {
        id: "dsar-playbook",
        title: "Playbook responsabil DSAR",
        summary: "Ce trebuie să verifice responsabilul înainte de a închide cazul.",
        content: `# Playbook responsabil DSAR — ${orgName}

## Checklist de control

1. Cererea este înregistrată cu dată și tip corect.
2. Identitatea persoanei vizate este verificată.
3. Sunt identificate toate sistemele și furnizorii relevanți.
4. Draftul de răspuns a fost revizuit de om.
5. Excepțiile legale, dacă există, sunt explicate clar.
6. Răspunsul final și urmele de execuție sunt salvate la dosar.

## Owner recomandat

- Un responsabil intern pentru privacy / compliance
- Sau o persoană desemnată explicit de management

## Urma minimă cerută

- registru actualizat
- dovada verificării identității
- răspuns trimis sau refuz documentat
- log sau notă despre execuția reală unde e cazul`,
      },
    ],
    completionChecklist: [
      "Ai desemnat responsabilul intern pentru DSAR.",
      "Ai confirmat că registrul DSAR va fi folosit pentru toate cererile noi.",
      "Ai revizuit procedura și template-urile înainte de utilizare oficială.",
    ],
  }
}

export function generateDsarDraft(params: {
  requestType: DsarRequestType
  requesterName: string
  orgName: string
}): DsarDraft {
  const { requestType, requesterName, orgName } = params
  const article = ARTICLE_MAP[requestType]

  switch (requestType) {
    case "access":
      return {
        subject: `Răspuns la cererea de acces la date — ${requesterName}`,
        body: `Stimate/Stimată ${requesterName},

Confirmăm primirea cererii dumneavoastră de acces la datele cu caracter personal, în conformitate cu ${article}.

Am identificat următoarele categorii de date prelucrate în legătură cu persoana dumneavoastră:

1. **Date de identificare:** [completează — nume, email, telefon, etc.]
2. **Date de cont/utilizare:** [completează — dată creare cont, ultimul login, etc.]
3. **Date financiare:** [completează dacă e cazul — facturi, plăți, etc.]
4. **Date de comunicare:** [completează — emailuri, mesaje, etc.]

**Scopul prelucrării:** [completează — furnizarea serviciului, facturare, marketing, etc.]
**Destinatari:** [completează — procesatorii și terții care au acces]
**Perioada de stocare:** [completează — conform politicii de retenție]
**Drepturile dumneavoastră:** Aveți dreptul la rectificare, ștergere, restricționare, portabilitate și opoziție.

Datele detaliate sunt atașate acestui răspuns în format [PDF/CSV].

Cu respect,
${orgName}`,
        legalBasis: article,
        requiredActions: [
          "Completează categoriile de date identificate",
          "Atașează extrasul complet de date (export)",
          "Verifică lista de destinatari/procesatori",
          "Revizuiește și confirmă înainte de trimitere",
        ],
      }

    case "rectification":
      return {
        subject: `Răspuns la cererea de rectificare — ${requesterName}`,
        body: `Stimate/Stimată ${requesterName},

Confirmăm primirea cererii dumneavoastră de rectificare a datelor cu caracter personal, în conformitate cu ${article}.

Am procesat solicitarea și am efectuat următoarele modificări:

1. **Câmpul rectificat:** [completează — ex: adresă de email, nume, telefon]
2. **Valoarea anterioară:** [completează]
3. **Valoarea corectă:** [completează]

Rectificarea a fost efectuată în toate sistemele noastre la data de [completează data].

Am notificat următorii destinatari cărora le-au fost comunicate datele: [completează lista destinatarilor notificați].

Cu respect,
${orgName}`,
        legalBasis: article,
        requiredActions: [
          "Identifică exact ce date trebuie rectificate",
          "Efectuează modificarea în toate sistemele",
          "Notifică procesatorii/destinatarii",
          "Completează câmpurile din draft",
        ],
      }

    case "erasure":
      return {
        subject: `Răspuns la cererea de ștergere — ${requesterName}`,
        body: `Stimate/Stimată ${requesterName},

Confirmăm primirea cererii dumneavoastră de ștergere a datelor cu caracter personal, în conformitate cu ${article}.

**Datele șterse:**
- [completează lista datelor șterse]

**Date păstrate pe bază legală (Art. 17(3)):**
- [completează dacă există — ex: facturi păstrate conform obligațiilor legale de arhivare, date necesare pentru obligații legale]

**Motivul păstrării:** [completează — obligație legală, apărare în instanță, etc.]

Ștergerea a fost efectuată la data de [completează data] din următoarele sisteme: [completează lista sistemelor].

Am notificat următorii destinatari: [completează].

Cu respect,
${orgName}`,
        legalBasis: article,
        requiredActions: [
          "Identifică toate sistemele unde există datele",
          "Verifică dacă există temei legal pentru păstrarea parțială (facturi, obligații fiscale)",
          "Efectuează ștergerea din toate sistemele",
          "Notifică procesatorii și destinatarii",
          "Documentează excepțiile Art. 17(3) dacă e cazul",
        ],
      }

    case "portability":
      return {
        subject: `Răspuns la cererea de portabilitate — ${requesterName}`,
        body: `Stimate/Stimată ${requesterName},

Confirmăm primirea cererii dumneavoastră de portabilitate a datelor, în conformitate cu ${article}.

Am pregătit un export al datelor dumneavoastră într-un format structurat, utilizat în mod curent și care poate fi citit automat (JSON/CSV).

**Datele incluse în export:**
- [completează — date de profil, date de utilizare, conținut generat, etc.]

**Format:** [JSON / CSV / XML]

Exportul este atașat acestui răspuns. Dacă doriți transferul direct către un alt operator, vă rugăm să ne comunicați datele de contact ale acestuia.

Cu respect,
${orgName}`,
        legalBasis: article,
        requiredActions: [
          "Generează export în format structurat (JSON/CSV)",
          "Include doar datele furnizate de persoana vizată sau generate prin utilizare",
          "NU include date derivate sau inferențe",
          "Atașează fișierul la răspuns",
        ],
      }

    case "objection":
      return {
        subject: `Răspuns la cererea de opoziție — ${requesterName}`,
        body: `Stimate/Stimată ${requesterName},

Confirmăm primirea cererii dumneavoastră de opoziție la prelucrarea datelor cu caracter personal, în conformitate cu ${article}.

**Prelucrarea vizată:** [completează — ex: marketing direct, profilare, interes legitim]

**Decizia noastră:**

[Varianta A — Opoziție acceptată]
Am încetat prelucrarea datelor dumneavoastră în scopul specificat, începând cu data de [completează].

[Varianta B — Opoziție respinsă, motive legitime imperative]
Din păcate, nu putem da curs cererii deoarece am demonstrat motive legitime și imperioase care prevalează asupra intereselor, drepturilor și libertăților dumneavoastră, respectiv: [completează motivele].

Aveți dreptul de a depune plângere la ANSPDCP.

Cu respect,
${orgName}`,
        legalBasis: article,
        requiredActions: [
          "Identifică temeiul juridic al prelucrării vizate",
          "Dacă e marketing direct → obligatoriu de acceptat",
          "Dacă e interes legitim → evaluează balanța de interese",
          "Documentează decizia și motivele",
        ],
      }

    case "restriction":
      return {
        subject: `Răspuns la cererea de restricționare — ${requesterName}`,
        body: `Stimate/Stimată ${requesterName},

Confirmăm primirea cererii dumneavoastră de restricționare a prelucrării datelor cu caracter personal, în conformitate cu ${article}.

**Motivul restricționării:** [completează — contestarea exactității, prelucrare ilegală, necesitate în instanță, verificare interes legitim]

Am aplicat restricționarea prelucrării începând cu data de [completează]. Pe durata restricționării, datele vor fi doar stocate, fără nicio altă operațiune de prelucrare, cu excepția consimțământului dumneavoastră explicit sau a obligațiilor legale.

Vă vom notifica înainte de ridicarea restricționării.

Cu respect,
${orgName}`,
        legalBasis: article,
        requiredActions: [
          "Verifică motivul restricționării (Art. 18(1) a-d)",
          "Marchează datele ca restricționate în sistem",
          "Notifică procesatorii despre restricționare",
          "Planifică notificarea înainte de ridicarea restricționării",
        ],
      }
  }
}
