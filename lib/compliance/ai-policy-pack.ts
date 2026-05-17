/**
 * Sprint 009 — AI Policy Pack (5 templates RO).
 *
 * Templates client-facing in markdown, parametrizate cu orgName + dates.
 * Distributie individuala sau bundle ZIP.
 *
 * Acoperite (per mandate § 10):
 *  - AI Acceptable Use Policy (politica interna AI)
 *  - AI Vendor Onboarding Checklist
 *  - AI Incident Response Runbook
 *  - AI Audit Logging Policy
 *  - AI Human Oversight Charter
 *
 * Toate aliniate la EU AI Act + GDPR + AI Automation Library best practice.
 */

export type AIPolicyPackTemplateId =
  | "acceptable_use"
  | "vendor_onboarding"
  | "incident_response"
  | "audit_logging"
  | "human_oversight"

export type AIPolicyPackTemplate = {
  id: AIPolicyPackTemplateId
  title: string                          // RO label pentru UI
  fileName: string                       // pentru export .md
  markdown: string
}

export type AIPolicyPackInput = {
  orgName: string
  generatedAtISO?: string
  dpoEmail?: string                      // optional — daca lipseste, placeholder
}

export type AIPolicyPack = {
  orgName: string
  generatedAtISO: string
  templates: AIPolicyPackTemplate[]
}

// ────────────────────────────────────────────────────────────────────────────
//   Builder principal
// ────────────────────────────────────────────────────────────────────────────

export function buildAIPolicyPack(input: AIPolicyPackInput): AIPolicyPack {
  const orgName = input.orgName?.trim() || "Organizația"
  const generatedAtISO = input.generatedAtISO ?? new Date().toISOString()
  const dpoEmail = input.dpoEmail?.trim() || "[email DPO]"

  return {
    orgName,
    generatedAtISO,
    templates: [
      buildAcceptableUse({ orgName, generatedAtISO, dpoEmail }),
      buildVendorOnboarding({ orgName, generatedAtISO, dpoEmail }),
      buildIncidentResponse({ orgName, generatedAtISO, dpoEmail }),
      buildAuditLogging({ orgName, generatedAtISO, dpoEmail }),
      buildHumanOversight({ orgName, generatedAtISO, dpoEmail }),
    ],
  }
}

// ────────────────────────────────────────────────────────────────────────────
//   1. AI Acceptable Use Policy
// ────────────────────────────────────────────────────────────────────────────

function buildAcceptableUse(ctx: { orgName: string; generatedAtISO: string; dpoEmail: string }): AIPolicyPackTemplate {
  return {
    id: "acceptable_use",
    title: "Politică de utilizare acceptabilă AI",
    fileName: "ai-acceptable-use-policy.md",
    markdown: `# Politică de utilizare acceptabilă AI — ${ctx.orgName}

**Versiune:** 1.0
**Data aprobării:** ${formatDate(ctx.generatedAtISO)}
**Aplicabilitate:** toți angajații, colaboratorii, partenerii care folosesc instrumente AI în contextul activității ${ctx.orgName}

---

## 1. Scop

Această politică stabilește regulile de utilizare a instrumentelor de inteligență artificială (AI) — chatbot, copiloti, agenți autonomi, generatoare de conținut, asistenți redactare — în cadrul ${ctx.orgName}. Respectă obligațiile Regulamentului (UE) 2024/1689 (EU AI Act), GDPR și legislația națională aplicabilă.

## 2. Definiții

- **Instrument AI:** orice software care folosește modele de învățare automată pentru a genera output (text, imagine, cod, decizie, recomandare).
- **Date personale:** orice informație despre o persoană identificabilă conform GDPR Art. 4(1).
- **Date confidențiale:** secrete comerciale, informații client neîncredintate public, cod proprietar, strategii interne.

## 3. Utilizări permise

- Asistență redactare emailuri, documente publice, traduceri (fără date personale neredactate).
- Brainstorming, sumarizare conținut public, refactorizare cod open-source.
- Cercetare / sinteză informații publice.
- Generare cod pentru proiecte interne (cu review uman obligatoriu înainte de producție).

## 4. Utilizări INTERZISE

Este interzisă utilizarea instrumentelor AI pentru:

1. **Date personale neredactate** (CNP, IBAN, sănătate, copii) — fără DPA semnat și opt-out training activat.
2. **Decizii automate** care afectează drepturi/obligații persoane (recrutare, credit, evaluare angajat) fără human-in-the-loop documentat.
3. **Conținut sintetic** (deepfake voce/imagine) fără disclosure clar.
4. **Recunoaștere biometrică** (facială, vocală) în spațiu public sau în locul de muncă fără temei legal explicit.
5. **Profilare angajați** (emotion recognition, behavior tracking) — interzis prin Art. 5 EU AI Act.
6. **Cod proprietar** sau secrete comerciale în prompt-uri publice.
7. **Date clienți** fără acceptul scris al clientului + DPA vendor + temei legal.
8. **Manipulare cognitivă** a clienților / persoanelor vulnerabile.

## 5. Instrumente AI aprobate

Doar instrumentele înregistrate în AI Data Map (vezi /dashboard/ai-discovery) pot fi folosite cu date personale. Lista actualizată este disponibilă la DPO.

Pentru solicitarea unui instrument nou, completează formularul de Vendor Onboarding (vezi \`ai-vendor-onboarding-checklist.md\`).

## 6. Obligații utilizator

- Folosește doar instrumentele aprobate pentru tipul de date prelucrat.
- Nu introduce date personale neredactate în chat AI publice (ChatGPT free, Claude free, Gemini free).
- Verifică opt-out training pentru toate instrumentele plătite folosite cu date client.
- Raportează imediat la ${ctx.dpoEmail} orice incident (date scurse, output toxic, decizie greșită).
- Aplică etichetare „generat AI" pe conținut public (postări, articole, materiale marketing).

## 7. Obligații DPO

- Aprobă instrumentele AI noi în max. 5 zile lucrătoare.
- Mentine AI Data Map actualizat (vezi /dashboard/ai-discovery).
- Verifică trimestrial conformitatea (DPA, transfer mecanism, opt-out training, subprocesori).
- Coordonează training AI literacy (minim anual, conform Art. 4 EU AI Act).

## 8. Sancțiuni

Încălcarea acestei politici poate atrage:
- avertisment scris;
- suspendare acces instrumente AI;
- proceduri disciplinare conform regulamentului intern;
- raportare la autorități (ANSPDCP) dacă incidentul implică date personale.

## 9. Revizuire

Politica se revizuiește anual sau la apariția unei modificări legislative semnificative. Responsabil: DPO ${ctx.orgName}.

---

**Aprobat de:** _________________________

**Semnătură:** _________________________

**Data:** ${formatDate(ctx.generatedAtISO)}

---

_Document generat de CompliRoAI pentru ${ctx.orgName}. Personalizați secțiunile specifice procesului intern înainte de aprobare._
`,
  }
}

// ────────────────────────────────────────────────────────────────────────────
//   2. AI Vendor Onboarding Checklist
// ────────────────────────────────────────────────────────────────────────────

function buildVendorOnboarding(ctx: { orgName: string; generatedAtISO: string; dpoEmail: string }): AIPolicyPackTemplate {
  return {
    id: "vendor_onboarding",
    title: "Checklist onboarding vendor AI",
    fileName: "ai-vendor-onboarding-checklist.md",
    markdown: `# Checklist onboarding vendor AI — ${ctx.orgName}

**Versiune:** 1.0
**Data:** ${formatDate(ctx.generatedAtISO)}
**Aplicabilitate:** orice instrument AI nou solicitat pentru utilizare în ${ctx.orgName}

---

## Identificare vendor

- [ ] **Nume vendor:** _________________________
- [ ] **Tool / produs:** _________________________
- [ ] **Categorie utilizare** (chatbot / copilot / scoring / generative / agent): _________________________
- [ ] **Departament solicitant:** _________________________
- [ ] **Owner intern:** _________________________

## Documentație legală obligatorie

- [ ] **DPA semnat** (Data Processing Agreement)
  - Link / file: _________________________
- [ ] **Privacy Policy vendor** — URL: _________________________
- [ ] **Terms of Service** — URL: _________________________
- [ ] **Trust Center / Security page** — URL: _________________________
- [ ] **Lista subprocesori publică** — URL: _________________________
- [ ] **Mecanism notificare modificări subprocesori** — confirmat scris

## Locație și transfer date

- [ ] **Regiune procesare:** UE / SUA / UK / altă țară terță: _________________________
- [ ] **Dacă SUA:** verificat dacă vendor este pe lista EU-US Data Privacy Framework
  - URL DPF: _________________________
- [ ] **Dacă altă țară terță:** SCC versiune 2021 inclus în DPA + Transfer Impact Assessment (TIA) rulat

## Training și model improvement

- [ ] **Folosește datele client pentru antrenare model?** Da / Nu
- [ ] **Există opt-out?** Da / Nu / N/A
- [ ] **Opt-out activat în cont?** confirmat data: _________________________ (screenshot atașat)

## Tip date prelucrate

- [ ] Date publice / non-personale
- [ ] Date personale identificare (nume, email, telefon)
- [ ] Date personale sensibile / Art. 9 (sănătate, biometric, etnic, etc.)
- [ ] Date copii (sub 16 ani)
- [ ] Date angajați (HR)
- [ ] Date financiare (IBAN, card, salariu)
- [ ] Date client confidențiale

## Risc EU AI Act

- [ ] **Categorie risc candidate:** prohibited / high-risk / transparency-limited / minimal
- [ ] **Dacă high-risk:** rulat Role Assessment (provider/deployer)? Da / Nu
- [ ] **Dacă deployer high-risk:** FRIA + Human Oversight protocol pregătite? Da / Nu

## Securitate

- [ ] **Certificări vendor:** ISO 27001 / SOC 2 / alta: _________________________
- [ ] **Criptare la rest:** confirmat
- [ ] **Criptare în tranzit:** confirmat (TLS 1.2+)
- [ ] **Control acces (RBAC / SSO):** confirmat
- [ ] **Backup și recuperare:** documentat
- [ ] **Notificare breach:** SLA în DPA: _________________________ ore

## DPIA

- [ ] **DPIA necesar?** (Art. 35 GDPR + ANSPDCP Dec. 174/2018)
- [ ] **Dacă da:** DPIA inițiat în /dashboard/dpia — ID: _________________________

## Aprobări

- [ ] **DPO aprobat:** ${ctx.dpoEmail} — data: _________________________
- [ ] **IT aprobat (security review):** _________________________ — data: _________________________
- [ ] **Manager direct aprobat:** _________________________ — data: _________________________

## Înregistrare

- [ ] **Adăugat în AI Data Map** (/dashboard/ai-discovery): _________________________
- [ ] **Adăugat în RoPA** (/dashboard/ropa) dacă procesează date personale
- [ ] **Adăugat în registru vendor** (/dashboard/vendor)

---

**Completat de:** _________________________

**Semnătură:** _________________________

**Data:** _________________________

---

_Document generat de CompliRoAI pentru ${ctx.orgName}._
`,
  }
}

// ────────────────────────────────────────────────────────────────────────────
//   3. AI Incident Response Runbook
// ────────────────────────────────────────────────────────────────────────────

function buildIncidentResponse(ctx: { orgName: string; generatedAtISO: string; dpoEmail: string }): AIPolicyPackTemplate {
  return {
    id: "incident_response",
    title: "Runbook incident AI",
    fileName: "ai-incident-response-runbook.md",
    markdown: `# Runbook incident AI — ${ctx.orgName}

**Versiune:** 1.0
**Data:** ${formatDate(ctx.generatedAtISO)}
**Aplicabilitate:** orice incident care implică un instrument AI utilizat de ${ctx.orgName}

---

## 1. Tipuri de incidente AI acoperite

- **Date scurse** prin AI: prompt-uri publice, output ce conține PII, log-uri vendor expuse.
- **Output toxic / discriminatoriu:** decizii părtinitoare, conținut ofensator, recomandări periculoase.
- **Decizie automată greșită:** scoring / clasificare cu impact major (refuz credit, respingere candidat, diagnostic medical).
- **Halucinare cu impact:** AI a generat informație falsă care a fost folosită (publicat, transmis client).
- **Acces neautorizat:** angajat folosește AI fără aprobare pentru date confidențiale.
- **Breach vendor:** vendor AI notifică breach în propriul sistem.
- **Comportament neașteptat agent autonom:** agent AI execută acțiuni neautorizate.

## 2. Roluri și responsabilități

| Rol | Responsabilitate |
|---|---|
| Detector | Persoana care observă incidentul — raportează în 1h |
| DPO (${ctx.dpoEmail}) | Coordonare răspuns + evaluare ANSPDCP + comunicare |
| IT / Security | Containment tehnic (revocă acces, dezactivează agent, șterge date) |
| Legal | Evaluare obligații legale (ANSPDCP, AI Office UE, client) |
| Management | Comunicare client / public dacă necesar |

## 3. Pași imediați (primele 4 ore)

### Pasul 1 — Detectare și raportare (0-1h)
- [ ] Detector trimite email la ${ctx.dpoEmail} + manager direct
- [ ] Include: ce s-a întâmplat, când, ce date implicate, screenshot dovadă
- [ ] **NU șterge** dovezile (log-uri, conversații, output-uri)

### Pasul 2 — Containment (1-2h)
- [ ] IT revocă accesul la tool-ul AI implicat
- [ ] Dacă agent autonom: oprește execuția
- [ ] Dacă output public: retrage / corectează (publicare, email trimis)
- [ ] Documentează cronologia (timestamps)

### Pasul 3 — Evaluare (2-4h)
- [ ] DPO clasifică: este breach GDPR? Necesită notificare ANSPDCP 72h?
- [ ] DPO creează breach record în /dashboard/breach
- [ ] Legal evaluează: necesită notificare AI Office UE (Art. 73 incident grav)?
- [ ] Estimare număr persoane afectate + categorii date

## 4. Notificări (24-72h)

### ANSPDCP (Art. 33 GDPR) — 72h de la descoperire
- [ ] Generează notificare în /dashboard/breach
- [ ] Submit în portalul ANSPDCP
- [ ] Salvează nr. înregistrare

### Persoane vizate (Art. 34 GDPR) — fără întârziere dacă risc înalt
- [ ] Generează template notificare
- [ ] Trimite (email, scrisoare sau comunicare publică dacă număr mare)
- [ ] Documentează metoda

### AI Office UE (Art. 73 EU AI Act) — pentru sisteme high-risk în producție
- [ ] Aplicabil doar pentru providers de sisteme AI high-risk
- [ ] Termen: 15 zile pentru incident grav (afectare sănătate, drepturi)
- [ ] Format: formular pe portalul AI Office

### Client (contractual)
- [ ] Verifică SLA notificare în contracte
- [ ] Trimite notificare formală

## 5. Investigație și root cause (zilele 1-30)

- [ ] Colectare evidence (log-uri vendor, conversații, output-uri)
- [ ] Identificare cauză tehnică / umană / vendor
- [ ] Lessons learned document
- [ ] Update AI Data Map cu noi riscuri identificate
- [ ] Update politică acceptable use dacă necesar

## 6. Closure

- [ ] Toate notificările trimise + confirmate
- [ ] Containment validat (nu mai există expunere)
- [ ] Update procese / training pentru prevenire
- [ ] Breach record marcat ca „closed" în /dashboard/breach
- [ ] Audit Pack actualizat

## 7. Contacte cheie

- **DPO:** ${ctx.dpoEmail}
- **ANSPDCP:** anspdcp@dataprotection.ro / +40 318 059 211
- **Manager IT:** _________________________
- **Legal extern:** _________________________

---

**Aprobat de:** _________________________

**Semnătură:** _________________________

**Data:** ${formatDate(ctx.generatedAtISO)}

---

_Document generat de CompliRoAI pentru ${ctx.orgName}._
`,
  }
}

// ────────────────────────────────────────────────────────────────────────────
//   4. AI Audit Logging Policy
// ────────────────────────────────────────────────────────────────────────────

function buildAuditLogging(ctx: { orgName: string; generatedAtISO: string; dpoEmail: string }): AIPolicyPackTemplate {
  return {
    id: "audit_logging",
    title: "Politică logging audit AI",
    fileName: "ai-audit-logging-policy.md",
    markdown: `# Politică logging audit AI — ${ctx.orgName}

**Versiune:** 1.0
**Data:** ${formatDate(ctx.generatedAtISO)}
**Bază legală:** EU AI Act Art. 12 (logging) + GDPR Art. 30 (RoPA) + Art. 32 (security)

---

## 1. Scop

Această politică definește cerințele minime de logging pentru sistemele AI utilizate de ${ctx.orgName}, conform Art. 12 EU AI Act (cu accent pe sisteme high-risk) și obligațiilor GDPR de demonstrare a conformității (Art. 5(2), 24).

## 2. Cerințe minime per nivel risc

### Sisteme minimal-risk (chatbot internal, copilot redactare)
- Log: data, utilizator, tool folosit (la nivel agregat săptămânal).
- Retenție: 30 zile.

### Sisteme transparency-limited (chatbot public, generative content)
- Log: data, sesiune, output tip „chatbot disclosure shown" (1/sesiune).
- Log: număr conversații, durată medie, escaladări la operator uman.
- Retenție: 90 zile.

### Sisteme high-risk (HR, credit, medical, education)
- **OBLIGATORIU per Art. 12 EU AI Act.**
- Log: data + ora exactă (UTC), utilizator, input (categorii date — nu raw PII), output (decizie / scor / recomandare), versiune model, motivare (dacă disponibil).
- Log: human-in-the-loop — cine a revizuit, când, decizia finală.
- Log: contestații primite + răspuns.
- Retenție: minim 6 luni după dezafectare sistem (Art. 19 EU AI Act).
- Hash chain pentru tamper-evidence (vezi CompliRoAI events ledger).

### Sisteme prohibited (Art. 5)
- **N/A — sistemele interzise nu trebuie folosite.**

## 3. Format log standard

\`\`\`json
{
  "timestampISO": "2026-05-17T10:00:00.000Z",
  "tool": "HR-AI-Screening v2.1",
  "user": "user-id-or-hash",
  "action": "decision | review | export | configure",
  "inputCategories": ["cv", "experience-summary"],
  "outputType": "ranking",
  "outputDecision": "...",
  "modelVersion": "vendor-model-v1.2",
  "humanReviewer": "reviewer-id-or-null",
  "humanReviewDecision": "approved | overridden | escalated"
}
\`\`\`

## 4. Cine are acces la log-uri

- **DPO (${ctx.dpoEmail}):** full access pentru investigații.
- **IT Security:** access la log-uri tehnice (errori, vulnerabilități).
- **Manager direct:** access la metrici agregate (volum, performanță).
- **Auditor extern:** access cu NDA + scope limitat.

Accesul individual la log-uri este logat (meta-logging).

## 5. Protecție log-uri

- Criptare la rest (AES-256).
- Acces RBAC + MFA.
- Backup zilnic în locație separată.
- Imutabilitate: log-urile nu pot fi șterse de useri normali — doar prin proces aprobat (retention expiry).

## 6. Export și transmitere

- Format export standard: JSON sau CSV.
- Transmitere către autorități: doar prin DPO + canal securizat.
- Pseudonimizare automată dacă export pentru analize statistice.

## 7. Monitorizare și alerting

- Alert automat la: peste 100 decizii high-impact/zi, override uman peste 30%, escalari peste 20%, lipsă human review pentru sistem care impune.
- Review săptămânal de către DPO al log-urilor sistemelor high-risk.

## 8. Sancțiuni

- Modificare neautorizată log-uri = încălcare gravă (procedură disciplinară + posibilă raportare penală).
- Acces neautorizat = avertisment scris + training suplimentar.

---

**Aprobat de:** _________________________

**Semnătură:** _________________________

**Data:** ${formatDate(ctx.generatedAtISO)}

---

_Document generat de CompliRoAI pentru ${ctx.orgName}._
`,
  }
}

// ────────────────────────────────────────────────────────────────────────────
//   5. AI Human Oversight Charter
// ────────────────────────────────────────────────────────────────────────────

function buildHumanOversight(ctx: { orgName: string; generatedAtISO: string; dpoEmail: string }): AIPolicyPackTemplate {
  return {
    id: "human_oversight",
    title: "Cartă human oversight AI",
    fileName: "ai-human-oversight-charter.md",
    markdown: `# Cartă human oversight AI — ${ctx.orgName}

**Versiune:** 1.0
**Data:** ${formatDate(ctx.generatedAtISO)}
**Bază legală:** EU AI Act Art. 14 (human oversight) + GDPR Art. 22 (automated individual decisions)

---

## 1. Principii fundamentale

${ctx.orgName} se angajează că:

1. **Niciun sistem AI nu ia decizii finale** care afectează drepturi / obligații persoane fără posibilitatea de intervenție umană.
2. **Persoanele afectate de decizii AI** au dreptul la explicație, contestație și revizuire umană (Art. 22 GDPR).
3. **Personalul desemnat human oversight** primește formare specifică (Art. 4 EU AI Act) + autoritate reală de a opri / suprascrie AI.
4. **Procesul de oversight** este documentat, măsurabil și auditabil.

## 2. Roluri oversight

| Rol | Responsabilitate |
|---|---|
| Operator AI (operator-ai) | Folosește sistemul AI în activitatea curentă. Identifică output-uri suspecte. |
| Human Reviewer (reviewer-ai) | Revizuiește deciziile cu impact major înainte de aplicare. Poate override. |
| Escalation Officer (escalation-ai) | Decide dacă sistemul trebuie oprit. Gestionează incidente. |
| DPO (${ctx.dpoEmail}) | Audit oversight + raportare ANSPDCP / AI Office dacă necesar. |

Per sistem AI high-risk: minim 2 reviewer-i + 1 escalation officer desemnați.

## 3. Cazuri obligatorii de oversight uman

Per Art. 14 EU AI Act, oversight uman este obligatoriu înainte de aplicare în cazurile:

- **Recrutare:** orice respingere candidat bazată pe AI scoring.
- **Credit:** orice refuz credit bazat exclusiv pe scoring AI.
- **HR evaluare:** orice decizie de avansare, retrogradare, concediere care folosește AI input.
- **Medical:** orice diagnostic / triaj AI înainte de comunicare către pacient.
- **Education:** orice notare / clasificare student.
- **Aplicare legii:** orice decizie de aplicare (predictive policing, biometric ID).
- **Asigurări:** orice refuz daune.
- **Servicii esențiale:** orice deconectare utilități / suspendare cont.

## 4. Procedură oversight

### Pasul 1 — Output AI primit
- Sistemul AI generează decizia + nivelul de încredere (score).
- Output este înregistrat în log (vezi \`ai-audit-logging-policy.md\`).

### Pasul 2 — Triaj automat
- Dacă score încredere > 95% și impact minor: poate fi aplicat automat (cu monitoring).
- Dacă score încredere < 95% sau impact major: trimis la reviewer uman OBLIGATORIU.

### Pasul 3 — Review uman
- Reviewer primește notificare în max. 24h.
- Reviewer primește: output AI, motivare AI (dacă explicabilă), context complet caz.
- Reviewer are 3 opțiuni:
  1. **Confirmă** decizia AI → se aplică, se loghează ca „human-confirmed".
  2. **Override** decizia AI → reviewer decide diferit, motivare obligatorie, AI input doar consultativ.
  3. **Escalează** la escalation officer dacă reviewer nu poate decide.

### Pasul 4 — Aplicare decizie
- Decizia finală este comunicată persoanei afectate.
- Informare: „decizia a fost asistată de AI; ai dreptul la explicație și contestație".

### Pasul 5 — Contestație
- Persoana afectată poate solicita revizuire în 30 zile.
- Contestația este analizată de un al doilea reviewer + escalation officer.
- Răspuns scris în max. 30 zile (extensibil 60 zile cu notificare).

## 5. Indicatori monitorizare

Lunar, DPO calculează și raportează:

- **Rata override:** % cazuri în care reviewer a respins AI. Normal: 5-15%. > 30% = revizuire sistem AI.
- **Rata escaladare:** % cazuri trimise la escalation officer. > 10% = sistem AI subperformant.
- **Rata contestație:** % decizii contestate de persoane afectate. > 5% = revizuire criterii.
- **Timp mediu review:** target < 24h.
- **Timp mediu contestație răspuns:** target < 21 zile.

## 6. Training oversight

- **Inițial:** minim 8h training înainte de desemnare reviewer.
- **Anual:** refresh 4h + actualizări legislative.
- **Topic-uri:** bias AI, explainability, drepturi persoane vizate, procedură contestație.

## 7. Oprire sistem AI (kill switch)

Escalation officer + DPO au autoritate să oprească imediat un sistem AI dacă:

- Rata override > 50% pe o săptămână.
- Apare un incident grav (raportat în /dashboard/breach).
- Persoană afectată raportează discriminare confirmată.
- Vendor anunță vulnerabilitate critică.

Oprirea = sistem dezactivat tehnic + fallback proces uman documentat.

## 8. Audit anual

- DPO + auditor extern revizuiesc anual:
  - eficacitatea oversight (rate, timpi);
  - calitatea formării reviewer-ilor;
  - acuratețea log-urilor;
  - conformitatea cu Art. 14 EU AI Act.
- Raport audit prezentat conducerii + arhivat în Audit Pack.

---

**Aprobat de:** _________________________

**Semnătură:** _________________________

**Data:** ${formatDate(ctx.generatedAtISO)}

---

_Document generat de CompliRoAI pentru ${ctx.orgName}._
`,
  }
}

// ────────────────────────────────────────────────────────────────────────────
//   Helper: format date
// ────────────────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso
    return new Intl.DateTimeFormat("ro-RO", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(d)
  } catch {
    return iso
  }
}

// ────────────────────────────────────────────────────────────────────────────
//   Helper: get single template by id
// ────────────────────────────────────────────────────────────────────────────

export function getAIPolicyTemplate(
  id: AIPolicyPackTemplateId,
  input: AIPolicyPackInput,
): AIPolicyPackTemplate | null {
  const pack = buildAIPolicyPack(input)
  return pack.templates.find((t) => t.id === id) ?? null
}

export function listAIPolicyTemplateIds(): AIPolicyPackTemplateId[] {
  return [
    "acceptable_use",
    "vendor_onboarding",
    "incident_response",
    "audit_logging",
    "human_oversight",
  ]
}
